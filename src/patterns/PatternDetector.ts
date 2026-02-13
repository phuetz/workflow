/**
 * Pattern Detector with AI Capabilities
 * Detects patterns in workflows using heuristics and AI-like scoring
 */

import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
import type {
  PatternDefinition,
  PatternDetectionResult,
  PatternMatch,
} from '../types/patterns';
import { GraphAnalyzer } from './GraphAnalyzer';
import { PatternMatcher } from './PatternMatcher';
import { PATTERN_CATALOG } from './PatternCatalog';

/**
 * Configuration for pattern detection
 */
export interface PatternDetectorConfig {
  /** Minimum confidence threshold (0-1) */
  confidenceThreshold: number;
  /** Maximum number of patterns to return */
  maxResults: number;
  /** Enable topology-based matching */
  useTopologyMatching: boolean;
  /** Enable semantic analysis */
  useSemanticAnalysis: boolean;
  /** Enable learning from past detections */
  useLearning: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: PatternDetectorConfig = {
  confidenceThreshold: 0.6,
  maxResults: 10,
  useTopologyMatching: true,
  useSemanticAnalysis: true,
  useLearning: false,
};

/**
 * Pattern Detector using AI-like heuristics
 */
export class PatternDetector {
  private config: PatternDetectorConfig;
  private detectionHistory: Map<string, number> = new Map();

  constructor(config: Partial<PatternDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Detect patterns in workflow
   */
  detect(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    patterns: PatternDefinition[] = PATTERN_CATALOG
  ): PatternDetectionResult[] {
    const results: PatternDetectionResult[] = [];

    // Analyze graph structure
    const analysis = GraphAnalyzer.analyze(nodes, edges);

    // Filter patterns by topology if enabled
    let candidatePatterns = patterns;
    if (this.config.useTopologyMatching) {
      candidatePatterns = this.filterByTopology(patterns, analysis.topology);
    }

    // Match each candidate pattern
    for (const pattern of candidatePatterns) {
      const match = PatternMatcher.match(nodes, edges, pattern);

      // Calculate confidence score
      const confidence = this.calculateConfidence(
        nodes,
        edges,
        pattern,
        match,
        analysis
      );

      if (confidence >= this.config.confidenceThreshold) {
        // Generate suggestions
        const suggestions = this.generateSuggestions(pattern, match);

        results.push({
          pattern,
          confidence,
          matches: [match],
          suggestions,
          timestamp: new Date(),
        });

        // Update learning history
        if (this.config.useLearning) {
          this.updateLearning(pattern.id, confidence);
        }
      }
    }

    // Sort by confidence and limit results
    results.sort((a, b) => b.confidence - a.confidence);

    return results.slice(0, this.config.maxResults);
  }

  /**
   * Detect specific pattern category
   */
  detectByCategory(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    category: string
  ): PatternDetectionResult[] {
    const patterns = PATTERN_CATALOG.filter((p) => p.category === category);
    return this.detect(nodes, edges, patterns);
  }

  /**
   * Detect patterns with specific complexity
   */
  detectByComplexity(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    complexity: string
  ): PatternDetectionResult[] {
    const patterns = PATTERN_CATALOG.filter((p) => p.complexity === complexity);
    return this.detect(nodes, edges, patterns);
  }

  /**
   * Filter patterns by topology
   */
  private filterByTopology(
    patterns: PatternDefinition[],
    topology: string
  ): PatternDefinition[] {
    // Return patterns that match or are compatible with the topology
    return patterns.filter((pattern) => {
      // Exact match
      if (pattern.structure.topology === topology) return true;

      // Compatible topologies
      const compatible: Record<string, string[]> = {
        linear: ['linear'],
        branching: ['linear', 'branching', 'dag'],
        loop: ['loop'],
        dag: ['linear', 'branching', 'dag', 'tree'],
        tree: ['linear', 'tree', 'dag'],
        star: ['star', 'dag'],
        mesh: ['mesh', 'dag'],
      };

      return compatible[topology]?.includes(pattern.structure.topology) || false;
    });
  }

  /**
   * Calculate confidence score using multiple factors
   */
  private calculateConfidence(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    pattern: PatternDefinition,
    match: PatternMatch,
    analysis: ReturnType<typeof GraphAnalyzer.analyze>
  ): number {
    let confidence = match.score;

    // Factor 1: Topology match (20% weight)
    if (this.config.useTopologyMatching) {
      const topologyMatch = analysis.topology === pattern.structure.topology ? 1 : 0.5;
      confidence = confidence * 0.8 + topologyMatch * 0.2;
    }

    // Factor 2: Semantic analysis (10% weight)
    if (this.config.useSemanticAnalysis) {
      const semanticScore = this.analyzeSemantics(nodes, edges, pattern);
      confidence = confidence * 0.9 + semanticScore * 0.1;
    }

    // Factor 3: Historical learning (5% weight)
    if (this.config.useLearning) {
      const learningScore = this.getLearningScore(pattern.id);
      confidence = confidence * 0.95 + learningScore * 0.05;
    }

    // Factor 4: Coverage bonus
    if (match.coverage > 0.8) {
      confidence = Math.min(1, confidence * 1.1);
    }

    // Factor 5: Complexity appropriateness
    const complexityScore = this.assessComplexity(analysis.complexity, pattern);
    confidence = confidence * 0.95 + complexityScore * 0.05;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Analyze semantic meaning of workflow
   */
  private analyzeSemantics(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    pattern: PatternDefinition
  ): number {
    let score = 0.5; // Base score

    // Check for semantic indicators in node labels and types
    const nodeLabels = nodes.map((n) => n.data.label.toLowerCase()).join(' ');
    const nodeTypes = nodes.map((n) => n.type.toLowerCase()).join(' ');

    // Check pattern tags against workflow content
    for (const tag of pattern.tags) {
      if (nodeLabels.includes(tag) || nodeTypes.includes(tag)) {
        score += 0.1;
      }
    }

    // Check pattern name keywords
    const patternKeywords = pattern.name.toLowerCase().split(/[\s-]/);
    for (const keyword of patternKeywords) {
      if (nodeLabels.includes(keyword) || nodeTypes.includes(keyword)) {
        score += 0.1;
      }
    }

    return Math.min(1, score);
  }

  /**
   * Assess if complexity is appropriate
   */
  private assessComplexity(
    workflowComplexity: number,
    pattern: PatternDefinition
  ): number {
    // Map complexity to expected range
    const complexityRanges: Record<string, [number, number]> = {
      beginner: [1, 5],
      intermediate: [4, 10],
      advanced: [8, 20],
      expert: [15, Infinity],
    };

    const [min, max] = complexityRanges[pattern.complexity] || [1, Infinity];

    if (workflowComplexity >= min && workflowComplexity <= max) {
      return 1.0;
    } else if (workflowComplexity < min) {
      return 0.7; // Too simple
    } else {
      return 0.8; // More complex than typical
    }
  }

  /**
   * Generate suggestions for improving pattern match
   */
  private generateSuggestions(
    pattern: PatternDefinition,
    match: PatternMatch
  ): string[] {
    const suggestions: string[] = [];

    // Suggestions based on deviations
    const highSeverityDeviations = match.deviations.filter(
      (d) => d.severity === 'high'
    );

    if (highSeverityDeviations.length > 0) {
      suggestions.push('Address critical issues to improve pattern match:');
      for (const deviation of highSeverityDeviations) {
        if (deviation.suggestion) {
          suggestions.push(`- ${deviation.suggestion}`);
        }
      }
    }

    // Coverage suggestions
    if (match.coverage < 0.6) {
      suggestions.push(
        'Low coverage detected. Consider restructuring workflow to better align with pattern.'
      );
    }

    // Pattern-specific suggestions
    if (match.score >= 0.7) {
      suggestions.push(`This workflow follows the ${pattern.name} pattern well.`);
      suggestions.push(...pattern.benefits.map((b) => `Benefit: ${b}`));
    } else if (match.score >= 0.5) {
      suggestions.push(
        `This workflow partially follows the ${pattern.name} pattern.`
      );
      suggestions.push('Consider:');
      suggestions.push(...pattern.solution.split('.').filter((s) => s.trim()));
    }

    return suggestions;
  }

  /**
   * Update learning history
   */
  private updateLearning(patternId: string, confidence: number): void {
    const currentScore = this.detectionHistory.get(patternId) || 0;
    // Exponential moving average
    const newScore = currentScore * 0.9 + confidence * 0.1;
    this.detectionHistory.set(patternId, newScore);
  }

  /**
   * Get learning score for pattern
   */
  private getLearningScore(patternId: string): number {
    return this.detectionHistory.get(patternId) || 0.5;
  }

  /**
   * Detect anti-patterns
   */
  detectAntiPatterns(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    const antiPatterns: string[] = [];

    // Check for common anti-patterns
    const analysis = GraphAnalyzer.analyze(nodes, edges);

    // God workflow (too many nodes)
    if (nodes.length > 30) {
      antiPatterns.push('god-workflow');
    }

    // No error handling
    const hasErrorHandling = edges.some(
      (e) => e.data?.condition?.includes('error')
    );
    if (!hasErrorHandling && nodes.length > 3) {
      antiPatterns.push('no-error-handling');
    }

    // Infinite loop risk
    if (analysis.hasCycles) {
      const maxDepth = analysis.depth;
      if (maxDepth < 10) {
        // Suspicious short cycles
        antiPatterns.push('potential-infinite-loop');
      }
    }

    // Spaghetti code (high complexity)
    if (analysis.complexity > 20) {
      antiPatterns.push('spaghetti-code');
    }

    // No validation
    const hasValidation = nodes.some(
      (n) => n.type === 'filter' || n.type === 'validation'
    );
    if (!hasValidation && nodes.length > 2) {
      antiPatterns.push('no-validation');
    }

    // Hardcoded values (check config)
    const hasHardcodedValues = nodes.some((n) => {
      const config = n.data.config;
      if (!config) return false;
      const configStr = JSON.stringify(config);
      return (
        configStr.includes('password') ||
        configStr.includes('api_key') ||
        configStr.includes('secret')
      );
    });
    if (hasHardcodedValues) {
      antiPatterns.push('hardcoded-secrets');
    }

    return antiPatterns;
  }

  /**
   * Get pattern recommendations based on workflow context
   */
  recommend(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    context?: { goal?: string; industry?: string }
  ): PatternDefinition[] {
    const analysis = GraphAnalyzer.analyze(nodes, edges);
    const recommendations: Array<{ pattern: PatternDefinition; score: number }> = [];

    for (const pattern of PATTERN_CATALOG) {
      let score = 0;

      // Score based on current topology
      if (pattern.structure.topology === analysis.topology) {
        score += 0.3;
      }

      // Score based on complexity
      const complexityMatch = this.assessComplexity(analysis.complexity, pattern);
      score += complexityMatch * 0.2;

      // Score based on context
      if (context?.goal) {
        const goalLower = context.goal.toLowerCase();
        if (
          pattern.description.toLowerCase().includes(goalLower) ||
          pattern.useCases.some((uc) => uc.toLowerCase().includes(goalLower))
        ) {
          score += 0.3;
        }
      }

      // Score based on node types present
      const nodeTypes = new Set(nodes.map((n) => n.type));
      const requiredTypes = new Set(pattern.structure.requiredNodeTypes);
      const overlap = [...requiredTypes].filter((t) => nodeTypes.has(t)).length;
      if (requiredTypes.size > 0) {
        score += (overlap / requiredTypes.size) * 0.2;
      }

      if (score > 0.3) {
        recommendations.push({ pattern, score });
      }
    }

    // Sort by score and return top recommendations
    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, 5).map((r) => r.pattern);
  }

  /**
   * Reset learning history
   */
  resetLearning(): void {
    this.detectionHistory.clear();
  }

  /**
   * Export learning data
   */
  exportLearning(): Record<string, number> {
    return Object.fromEntries(this.detectionHistory);
  }

  /**
   * Import learning data
   */
  importLearning(data: Record<string, number>): void {
    this.detectionHistory = new Map(Object.entries(data));
  }
}

/**
 * Singleton instance for convenience
 */
export const patternDetector = new PatternDetector();

/**
 * Quick detection function
 */
export function detectPatterns(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options?: Partial<PatternDetectorConfig>
): PatternDetectionResult[] {
  const detector = new PatternDetector(options);
  return detector.detect(nodes, edges);
}

/**
 * Quick recommendation function
 */
export function recommendPatterns(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  context?: { goal?: string; industry?: string }
): PatternDefinition[] {
  const detector = new PatternDetector();
  return detector.recommend(nodes, edges, context);
}

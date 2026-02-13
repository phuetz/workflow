/**
 * Pattern Suggester
 * Provides context-aware pattern suggestions
 */

import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
import type {
  PatternDefinition,
  PatternSuggestion,
  SuggestionContext,
  PatternImplementation,
  ImplementationStep,
} from '../types/patterns';
import { PATTERN_CATALOG } from './PatternCatalog';
import { GraphAnalyzer } from './GraphAnalyzer';
import { PatternDetector } from './PatternDetector';
import { PatternMatcher } from './PatternMatcher';

/**
 * Pattern Suggester
 */
export class PatternSuggester {
  /**
   * Get pattern suggestions for current workflow
   */
  static suggest(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    context?: {
      userIntent?: string;
      workflowGoal?: string;
      industry?: string;
    }
  ): PatternSuggestion[] {
    const suggestions: PatternSuggestion[] = [];
    const analysis = GraphAnalyzer.analyze(nodes, edges);

    // Detect current issues
    const detector = new PatternDetector();
    const antiPatterns = detector.detectAntiPatterns(nodes, edges);

    const suggestionContext: SuggestionContext = {
      currentNodes: nodes.map((n) => n.type),
      currentEdges: edges.map((e) => `${e.source}->${e.target}`),
      userIntent: context?.userIntent,
      workflowGoal: context?.workflowGoal,
      detectedIssues: antiPatterns,
    };

    // Get candidate patterns
    for (const pattern of PATTERN_CATALOG) {
      const relevance = this.calculateRelevance(
        nodes,
        edges,
        pattern,
        analysis,
        context
      );

      if (relevance >= 0.3) {
        const reason = this.generateReason(
          nodes,
          edges,
          pattern,
          analysis,
          context
        );

        const implementation = this.generateImplementation(
          nodes,
          edges,
          pattern
        );

        suggestions.push({
          pattern,
          relevance,
          reason,
          context: suggestionContext,
          implementation,
        });
      }
    }

    // Sort by relevance
    suggestions.sort((a, b) => b.relevance - a.relevance);

    return suggestions.slice(0, 10); // Return top 10
  }

  /**
   * Calculate pattern relevance
   */
  private static calculateRelevance(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    pattern: PatternDefinition,
    analysis: ReturnType<typeof GraphAnalyzer.analyze>,
    context?: {
      userIntent?: string;
      workflowGoal?: string;
      industry?: string;
    }
  ): number {
    let relevance = 0;

    // Factor 1: Workflow complexity (30%)
    const complexityMatch = this.matchesComplexity(
      analysis.complexity,
      pattern.complexity
    );
    relevance += complexityMatch * 0.3;

    // Factor 2: Node types present (25%)
    const nodeTypeMatch = this.matchesNodeTypes(nodes, pattern);
    relevance += nodeTypeMatch * 0.25;

    // Factor 3: Topology (20%)
    const topologyMatch = this.matchesTopology(analysis.topology, pattern);
    relevance += topologyMatch * 0.2;

    // Factor 4: Context (15%)
    if (context) {
      const contextMatch = this.matchesContext(pattern, context);
      relevance += contextMatch * 0.15;
    }

    // Factor 5: Problem it solves (10%)
    const problemMatch = this.matchesProblem(nodes, edges, pattern);
    relevance += problemMatch * 0.1;

    return Math.min(1, relevance);
  }

  /**
   * Check if pattern matches workflow complexity
   */
  private static matchesComplexity(
    workflowComplexity: number,
    patternComplexity: string
  ): number {
    const ranges: Record<string, [number, number]> = {
      beginner: [1, 5],
      intermediate: [4, 12],
      advanced: [10, 25],
      expert: [20, Infinity],
    };

    const [min, max] = ranges[patternComplexity] || [1, Infinity];

    if (workflowComplexity >= min && workflowComplexity <= max) {
      return 1.0;
    } else if (workflowComplexity < min) {
      return 0.6; // Pattern might be overkill
    } else {
      return 0.8; // Pattern might help reduce complexity
    }
  }

  /**
   * Check if pattern matches node types
   */
  private static matchesNodeTypes(
    nodes: WorkflowNode[],
    pattern: PatternDefinition
  ): number {
    const nodeTypes = new Set(nodes.map((n) => n.type));
    const requiredTypes = new Set(pattern.structure.requiredNodeTypes);
    const optionalTypes = new Set(pattern.structure.optionalNodeTypes);

    const hasRequired = [...requiredTypes].filter((t) => nodeTypes.has(t)).length;
    const hasOptional = [...optionalTypes].filter((t) => nodeTypes.has(t)).length;

    if (requiredTypes.size === 0) return 0.5;

    const requiredScore = hasRequired / requiredTypes.size;
    const optionalScore =
      optionalTypes.size > 0 ? hasOptional / optionalTypes.size : 0;

    return requiredScore * 0.7 + optionalScore * 0.3;
  }

  /**
   * Check if pattern matches topology
   */
  private static matchesTopology(
    workflowTopology: string,
    pattern: PatternDefinition
  ): number {
    if (workflowTopology === pattern.structure.topology) {
      return 1.0;
    }

    // Compatible topologies
    const compatible: Record<string, string[]> = {
      linear: ['linear', 'sequential-workflow'],
      branching: ['conditional-workflow', 'content-based-router'],
      dag: ['orchestration', 'saga', 'fan-out-fan-in'],
      loop: ['loop-workflow', 'retry'],
    };

    const compatiblePatterns = compatible[workflowTopology] || [];
    return compatiblePatterns.includes(pattern.id) ? 0.7 : 0.3;
  }

  /**
   * Check if pattern matches context
   */
  private static matchesContext(
    pattern: PatternDefinition,
    context: {
      userIntent?: string;
      workflowGoal?: string;
      industry?: string;
    }
  ): number {
    let score = 0;

    if (context.userIntent) {
      const intentLower = context.userIntent.toLowerCase();
      if (
        pattern.description.toLowerCase().includes(intentLower) ||
        pattern.tags.some((tag) => intentLower.includes(tag))
      ) {
        score += 0.5;
      }
    }

    if (context.workflowGoal) {
      const goalLower = context.workflowGoal.toLowerCase();
      if (pattern.useCases.some((uc) => uc.toLowerCase().includes(goalLower))) {
        score += 0.5;
      }
    }

    return Math.min(1, score);
  }

  /**
   * Check if pattern solves current problems
   */
  private static matchesProblem(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    pattern: PatternDefinition
  ): number {
    // Check if workflow has issues that pattern could solve
    const analysis = GraphAnalyzer.analyze(nodes, edges);

    let score = 0;

    // Complexity issues -> suggest orchestration/saga
    if (analysis.complexity > 15) {
      if (
        pattern.id === 'orchestration' ||
        pattern.id === 'saga' ||
        pattern.id === 'choreography'
      ) {
        score += 0.3;
      }
    }

    // No error handling -> suggest reliability patterns
    const hasErrorHandling = edges.some((e) => e.data?.condition?.includes('error'));
    if (!hasErrorHandling) {
      if (pattern.category === 'reliability') {
        score += 0.3;
      }
    }

    // Sequential when could be parallel -> suggest parallel patterns
    if (analysis.topology === 'linear' && nodes.length > 5) {
      if (pattern.id === 'parallel-workflow' || pattern.id === 'fan-out-fan-in') {
        score += 0.4;
      }
    }

    return Math.min(1, score);
  }

  /**
   * Generate reason for suggestion
   */
  private static generateReason(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    pattern: PatternDefinition,
    analysis: ReturnType<typeof GraphAnalyzer.analyze>,
    context?: {
      userIntent?: string;
      workflowGoal?: string;
    }
  ): string {
    const reasons: string[] = [];

    // Context-based reason
    if (context?.userIntent) {
      reasons.push(`Matches your intent: "${context.userIntent}"`);
    }

    // Problem-based reason
    if (analysis.complexity > 15 && pattern.category === 'workflow') {
      reasons.push('Can help reduce workflow complexity');
    }

    // Node type reason
    const match = PatternMatcher.match(nodes, edges, pattern);
    if (match.score > 0.5) {
      reasons.push('Workflow partially follows this pattern already');
    }

    // Benefit reason
    if (pattern.benefits.length > 0) {
      reasons.push(`Benefits: ${pattern.benefits[0]}`);
    }

    // Use case reason
    if (pattern.useCases.length > 0) {
      reasons.push(`Common for: ${pattern.useCases[0]}`);
    }

    return reasons.join('. ');
  }

  /**
   * Generate implementation guide
   */
  private static generateImplementation(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    pattern: PatternDefinition
  ): PatternImplementation {
    const steps: ImplementationStep[] = [];

    // Analyze current state
    const match = PatternMatcher.match(nodes, edges, pattern);

    // Generate steps based on deviations
    let order = 1;

    // Add missing nodes
    for (const deviation of match.deviations) {
      if (deviation.type === 'missing-node' && deviation.suggestion) {
        steps.push({
          order: order++,
          description: deviation.suggestion,
          action: 'add-node',
          details: {
            suggestion: deviation.suggestion,
            severity: deviation.severity,
          },
        });
      }
    }

    // Add missing edges
    for (const deviation of match.deviations) {
      if (deviation.type === 'missing-edge' && deviation.suggestion) {
        steps.push({
          order: order++,
          description: deviation.suggestion,
          action: 'add-edge',
          details: {
            suggestion: deviation.suggestion,
          },
        });
      }
    }

    // Fix topology if needed
    for (const deviation of match.deviations) {
      if (deviation.type === 'wrong-topology' && deviation.suggestion) {
        steps.push({
          order: order++,
          description: deviation.suggestion,
          action: 'modify',
          details: {
            currentTopology: GraphAnalyzer.analyze(nodes, edges).topology,
            expectedTopology: pattern.structure.topology,
          },
        });
      }
    }

    // Configure nodes
    steps.push({
      order: order++,
      description: 'Configure nodes according to pattern requirements',
      action: 'configure',
      details: {
        pattern: pattern.name,
      },
    });

    // Assess effort
    let estimatedEffort: 'low' | 'medium' | 'high' = 'medium';
    if (match.score > 0.7) {
      estimatedEffort = 'low';
    } else if (match.score < 0.3) {
      estimatedEffort = 'high';
    }

    return {
      steps,
      estimatedEffort,
      prerequisites: [
        'Understand the pattern',
        'Review current workflow',
        'Backup workflow before changes',
      ],
    };
  }

  /**
   * Suggest improvements for existing workflow
   */
  static suggestImprovements(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): Array<{
    type: 'add' | 'remove' | 'modify';
    description: string;
    priority: 'high' | 'medium' | 'low';
    impact: string;
  }> {
    const improvements: Array<{
      type: 'add' | 'remove' | 'modify';
      description: string;
      priority: 'high' | 'medium' | 'low';
      impact: string;
    }> = [];

    const analysis = GraphAnalyzer.analyze(nodes, edges);

    // Check for error handling
    const hasErrorHandling = edges.some((e) => e.data?.condition?.includes('error'));
    if (!hasErrorHandling && nodes.length > 3) {
      improvements.push({
        type: 'add',
        description: 'Add error handling branches',
        priority: 'high',
        impact: 'Improves reliability and user experience',
      });
    }

    // Check for logging
    const hasLogging = nodes.some((n) => n.type === 'log' || n.type === 'logger');
    if (!hasLogging && nodes.length > 5) {
      improvements.push({
        type: 'add',
        description: 'Add logging for debugging and monitoring',
        priority: 'medium',
        impact: 'Easier troubleshooting and observability',
      });
    }

    // Check complexity
    if (analysis.complexity > 20) {
      improvements.push({
        type: 'modify',
        description: 'Break down into smaller workflows',
        priority: 'high',
        impact: 'Reduced complexity and improved maintainability',
      });
    }

    // Check for validation
    const hasWebhook = nodes.some((n) => n.type === 'webhook');
    const hasValidation = nodes.some((n) => n.type === 'filter' || n.type === 'validation');
    if (hasWebhook && !hasValidation) {
      improvements.push({
        type: 'add',
        description: 'Add input validation after webhook',
        priority: 'high',
        impact: 'Prevents invalid data from causing errors',
      });
    }

    // Check for sequential when could be parallel
    if (analysis.topology === 'linear' && nodes.length > 5) {
      const httpNodes = nodes.filter((n) => n.type === 'http-request');
      if (httpNodes.length > 2) {
        improvements.push({
          type: 'modify',
          description: 'Consider parallelizing independent HTTP requests',
          priority: 'medium',
          impact: 'Faster execution time',
        });
      }
    }

    return improvements;
  }

  /**
   * Get quick wins (easy improvements with high impact)
   */
  static suggestQuickWins(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): Array<{
    description: string;
    impact: string;
    effort: 'low';
  }> {
    const quickWins: Array<{
      description: string;
      impact: string;
      effort: 'low';
    }> = [];

    // Check for missing timeouts
    const httpNodes = nodes.filter((n) => n.type === 'http-request');
    const noTimeout = httpNodes.filter((n) => {
      const config = n.data.config as Record<string, unknown>;
      return !config?.timeout;
    });

    if (noTimeout.length > 0) {
      quickWins.push({
        description: `Add timeouts to ${noTimeout.length} HTTP request(s)`,
        impact: 'Prevents hanging requests',
        effort: 'low',
      });
    }

    // Check for missing retry
    const noRetry = httpNodes.filter((n) => {
      const config = n.data.config as Record<string, unknown>;
      return !config?.retry && !config?.maxRetries;
    });

    if (noRetry.length > 0) {
      quickWins.push({
        description: `Add retry logic to ${noRetry.length} HTTP request(s)`,
        impact: 'Improves reliability',
        effort: 'low',
      });
    }

    return quickWins;
  }
}

/**
 * Quick suggest function
 */
export function suggestPatterns(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  context?: {
    userIntent?: string;
    workflowGoal?: string;
  }
): PatternSuggestion[] {
  return PatternSuggester.suggest(nodes, edges, context);
}

/**
 * Workflow Quality Analyzer
 *
 * Analyzes workflow quality across multiple dimensions:
 * - Error handling coverage
 * - Logging/monitoring
 * - Performance optimization
 * - Security best practices
 * - Code complexity
 * - Documentation
 * - Maintainability
 */

import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { patternMatcher, PatternMatch } from './PatternMatcher';
import { autoNamingService } from './AutoNaming';

export interface QualityScore {
  overall: number;
  dimensions: {
    errorHandling: number;
    logging: number;
    performance: number;
    security: number;
    complexity: number;
    documentation: number;
    maintainability: number;
  };
  breakdown: {
    dimension: string;
    score: number;
    maxScore: number;
    issues: string[];
    improvements: string[];
  }[];
}

export interface QualityReport {
  score: QualityScore;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  issues: QualityIssue[];
  recommendations: QualityRecommendation[];
  predictions: QualityPrediction;
}

export interface QualityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  affectedNodes: string[];
  impact: string;
}

export interface QualityRecommendation {
  priority: 1 | 2 | 3;
  title: string;
  description: string;
  benefit: string;
  estimatedImprovement: number; // points added to quality score
  action: string;
}

export interface QualityPrediction {
  estimatedExecutionTime: string;
  estimatedCost: string;
  resourceUsage: {
    cpu: 'low' | 'medium' | 'high';
    memory: 'low' | 'medium' | 'high';
  };
  scalabilityScore: number;
  reliabilityScore: number;
}

export class QualityAnalyzer {
  /**
   * Analyze workflow quality
   */
  analyzeWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): QualityReport {
    const score = this.calculateQualityScore(nodes, edges);
    const grade = this.calculateGrade(score.overall);
    const issues = this.identifyIssues(nodes, edges);
    const recommendations = this.generateRecommendations(score, issues);
    const predictions = this.generatePredictions(nodes, edges);

    return {
      score,
      grade,
      summary: this.generateSummary(score, grade, nodes.length),
      issues,
      recommendations,
      predictions
    };
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(nodes: WorkflowNode[], edges: WorkflowEdge[]): QualityScore {
    const errorHandling = this.scoreErrorHandling(nodes, edges);
    const logging = this.scoreLogging(nodes);
    const performance = this.scorePerformance(nodes, edges);
    const security = this.scoreSecurity(nodes, edges);
    const complexity = this.scoreComplexity(nodes, edges);
    const documentation = this.scoreDocumentation(nodes);
    const maintainability = this.scoreMaintainability(nodes, edges);

    const dimensions = {
      errorHandling,
      logging,
      performance,
      security,
      complexity,
      documentation,
      maintainability
    };

    // Weighted average
    const weights = {
      errorHandling: 0.20,
      logging: 0.15,
      performance: 0.15,
      security: 0.20,
      complexity: 0.10,
      documentation: 0.10,
      maintainability: 0.10
    };

    const overall = Object.entries(dimensions).reduce((sum, [key, value]) => {
      return sum + value * weights[key as keyof typeof weights];
    }, 0);

    return {
      overall: Math.round(overall),
      dimensions,
      breakdown: this.generateBreakdown(dimensions, nodes, edges)
    };
  }

  /**
   * Score error handling coverage (0-100)
   */
  private scoreErrorHandling(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
    let score = 100;

    const errorProneNodes = nodes.filter(n =>
      ['httpRequest', 'database', 'webhook', 'email', 'stripe'].includes(n.type)
    );

    if (errorProneNodes.length === 0) return score;

    // Check each error-prone node has error handling
    let handledCount = 0;

    for (const node of errorProneNodes) {
      const hasErrorEdge = edges.some(e =>
        e.source === node.id && e.sourceHandle === 'error'
      );

      const hasTryCatch = this.isInTryCatch(node, nodes, edges);

      if (hasErrorEdge || hasTryCatch) {
        handledCount++;
      }
    }

    const coverage = (handledCount / errorProneNodes.length) * 100;

    return Math.round(coverage);
  }

  /**
   * Score logging coverage (0-100)
   */
  private scoreLogging(nodes: WorkflowNode[]): number {
    const hasLogging = nodes.some(n => n.type === 'log');
    const criticalNodes = nodes.filter(n =>
      ['database', 'payment', 'stripe', 'paypal'].includes(n.type)
    );

    if (criticalNodes.length === 0) {
      return hasLogging ? 100 : 80;
    }

    return hasLogging ? 100 : 50;
  }

  /**
   * Score performance optimization (0-100)
   */
  private scorePerformance(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
    let score = 100;

    const patterns = patternMatcher.detectPatterns(nodes, edges);

    // Deduct points for performance anti-patterns
    const performanceIssues = patterns.filter(p => p.category === 'performance');

    for (const issue of performanceIssues) {
      if (issue.pattern === 'api-in-loop') {
        score -= 30;
      } else if (issue.pattern === 'parallelizable-sequence') {
        score -= 15;
      } else if (issue.pattern === 'large-transform') {
        score -= 10;
      }
    }

    // Bonus for caching
    const hasCaching = nodes.some(n => n.data.config?.cache === true);
    if (hasCaching) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score security best practices (0-100)
   */
  private scoreSecurity(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
    let score = 100;

    const patterns = patternMatcher.detectPatterns(nodes, edges);
    const securityIssues = patterns.filter(p => p.category === 'security');

    for (const issue of securityIssues) {
      if (issue.pattern === 'webhook-no-validation') {
        score -= 20;
      } else if (issue.pattern === 'credentials-in-config') {
        score -= 25;
      } else if (issue.pattern === 'http-not-https') {
        score -= 15;
      }
    }

    // Check for environment variables usage (good practice)
    const usesEnvVars = nodes.some(n => {
      const configStr = JSON.stringify(n.data.config || {});
      return configStr.includes('$env');
    });

    if (usesEnvVars) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score code complexity (0-100, higher is better = less complex)
   */
  private scoreComplexity(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
    const nodeCount = nodes.length;
    const depth = this.calculateMaxDepth(nodes, edges);
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(nodes, edges);

    // Ideal: <10 nodes, depth <5, complexity <10
    let score = 100;

    // Deduct for high node count
    if (nodeCount > 50) {
      score -= 30;
    } else if (nodeCount > 30) {
      score -= 20;
    } else if (nodeCount > 10) {
      score -= 10;
    }

    // Deduct for deep nesting
    if (depth > 8) {
      score -= 20;
    } else if (depth > 5) {
      score -= 10;
    }

    // Deduct for high complexity
    if (cyclomaticComplexity > 20) {
      score -= 20;
    } else if (cyclomaticComplexity > 10) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * Score documentation (0-100)
   */
  private scoreDocumentation(nodes: WorkflowNode[]): number {
    let score = 0;

    // Check for sticky notes (documentation)
    const hasStickyNotes = nodes.some(n => n.type === 'stickyNote');
    if (hasStickyNotes) {
      score += 30;
    }

    // Check for descriptive node names
    const namingAnalysis = autoNamingService.analyzeWorkflowNaming(nodes);
    score += namingAnalysis.score * 0.7; // Up to 70 points

    return Math.min(100, score);
  }

  /**
   * Score maintainability (0-100)
   */
  private scoreMaintainability(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
    let score = 100;

    // Check naming quality
    const namingAnalysis = autoNamingService.analyzeWorkflowNaming(nodes);
    score = namingAnalysis.score;

    // Check for sub-workflows (modularization)
    const hasSubWorkflows = nodes.some(n => n.type === 'subworkflow');
    if (hasSubWorkflows && nodes.length > 20) {
      score += 10;
    }

    // Deduct for duplicate code
    const duplicates = this.detectDuplicatePatterns(nodes);
    score -= duplicates * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate grade from score
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Identify specific quality issues
   */
  private identifyIssues(nodes: WorkflowNode[], edges: WorkflowEdge[]): QualityIssue[] {
    const issues: QualityIssue[] = [];

    const patterns = patternMatcher.detectPatterns(nodes, edges);

    for (const pattern of patterns) {
      const severity = this.determineSeverity(pattern);

      issues.push({
        severity,
        category: pattern.category,
        title: this.getPatternTitle(pattern.pattern),
        description: pattern.suggestion,
        affectedNodes: pattern.nodes,
        impact: this.determineImpact(pattern)
      });
    }

    return issues.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Generate improvement recommendations
   */
  private generateRecommendations(
    score: QualityScore,
    issues: QualityIssue[]
  ): QualityRecommendation[] {
    const recommendations: QualityRecommendation[] = [];

    // Prioritize based on lowest scores
    const sortedDimensions = Object.entries(score.dimensions)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 3); // Top 3 areas for improvement

    for (const [dimension, dimensionScore] of sortedDimensions) {
      if (dimensionScore < 80) {
        const rec = this.getDimensionRecommendation(dimension, dimensionScore);
        if (rec) {
          recommendations.push(rec);
        }
      }
    }

    // Add issue-based recommendations
    for (const issue of issues.slice(0, 3)) {
      const rec = this.getIssueRecommendation(issue);
      if (rec) {
        recommendations.push(rec);
      }
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Generate performance predictions
   */
  private generatePredictions(nodes: WorkflowNode[], edges: WorkflowEdge[]): QualityPrediction {
    // Estimate execution time based on node types
    let estimatedMs = 0;

    for (const node of nodes) {
      switch (node.type) {
        case 'httpRequest':
          estimatedMs += 1000; // 1 second per API call
          break;
        case 'database':
          estimatedMs += 500; // 500ms per query
          break;
        case 'llm':
        case 'openai':
        case 'anthropic':
          estimatedMs += 3000; // 3 seconds per LLM call
          break;
        default:
          estimatedMs += 100; // 100ms for other nodes
      }
    }

    // Estimate cost
    const llmNodes = nodes.filter(n => ['llm', 'openai', 'anthropic'].includes(n.type));
    const estimatedCost = llmNodes.length * 0.01; // $0.01 per LLM call (rough estimate)

    // Resource usage
    const hasLoops = nodes.some(n => ['forEach', 'whileLoop'].includes(n.type));
    const hasLargeTransforms = nodes.some(n =>
      n.type === 'set' && Array.isArray(n.data.config?.values) && n.data.config.values.length > 20
    );

    return {
      estimatedExecutionTime: this.formatDuration(estimatedMs),
      estimatedCost: estimatedCost > 0 ? `$${estimatedCost.toFixed(2)}` : 'Free',
      resourceUsage: {
        cpu: hasLargeTransforms ? 'high' : hasLoops ? 'medium' : 'low',
        memory: hasLoops ? 'high' : hasLargeTransforms ? 'medium' : 'low'
      },
      scalabilityScore: this.calculateScalability(nodes, edges),
      reliabilityScore: this.calculateReliability(nodes, edges)
    };
  }

  /**
   * Helper methods
   */

  private isInTryCatch(node: WorkflowNode, nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
    // Check if node is inside a try-catch block
    const ancestors = this.getAncestors(node, nodes, edges);
    return ancestors.some(n => n.type === 'tryCatch');
  }

  private getAncestors(node: WorkflowNode, nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
    const ancestors = new Set<string>();
    const queue = [node.id];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const incoming = edges.filter(e => e.target === current);

      for (const edge of incoming) {
        if (!ancestors.has(edge.source)) {
          ancestors.add(edge.source);
          queue.push(edge.source);
        }
      }
    }

    return nodes.filter(n => ancestors.has(n.id));
  }

  private calculateMaxDepth(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
    let maxDepth = 0;

    for (const node of nodes) {
      const depth = this.getNodeDepth(node, edges, nodes);
      maxDepth = Math.max(maxDepth, depth);
    }

    return maxDepth;
  }

  private getNodeDepth(node: WorkflowNode, edges: WorkflowEdge[], nodes: WorkflowNode[]): number {
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: node.id, depth: 0 }];
    let maxDepth = 0;

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.id)) continue;
      visited.add(current.id);

      maxDepth = Math.max(maxDepth, current.depth);

      const incoming = edges.filter(e => e.target === current.id);
      for (const edge of incoming) {
        queue.push({ id: edge.source, depth: current.depth + 1 });
      }
    }

    return maxDepth;
  }

  private calculateCyclomaticComplexity(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
    // Simplified cyclomatic complexity: edges - nodes + 2 * connected components
    const edgeCount = edges.length;
    const nodeCount = nodes.length;

    // Add complexity for decision nodes
    const decisionNodes = nodes.filter(n => ['if', 'switch'].includes(n.type));

    return edgeCount - nodeCount + 2 + decisionNodes.length;
  }

  private detectDuplicatePatterns(nodes: WorkflowNode[]): number {
    // Simple duplicate detection based on node type sequences
    const sequences = new Map<string, number>();
    let duplicates = 0;

    for (let i = 0; i < nodes.length - 2; i++) {
      const sequence = [nodes[i].type, nodes[i + 1].type, nodes[i + 2].type].join('-');

      if (sequences.has(sequence)) {
        duplicates++;
      } else {
        sequences.set(sequence, 1);
      }
    }

    return duplicates;
  }

  private calculateScalability(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
    let score = 100;

    // Deduct for anti-patterns
    const hasApiInLoop = nodes.some(n => n.type === 'forEach') &&
      edges.some(e => nodes.find(n => n.id === e.target)?.type === 'httpRequest');

    if (hasApiInLoop) score -= 30;

    const hasSubWorkflows = nodes.some(n => n.type === 'subworkflow');
    if (hasSubWorkflows) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  private calculateReliability(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
    const errorHandlingScore = this.scoreErrorHandling(nodes, edges);
    const loggingScore = this.scoreLogging(nodes);

    return Math.round((errorHandlingScore + loggingScore) / 2);
  }

  private generateBreakdown(
    dimensions: QualityScore['dimensions'],
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): QualityScore['breakdown'] {
    return Object.entries(dimensions).map(([dimension, score]) => ({
      dimension,
      score,
      maxScore: 100,
      issues: this.getDimensionIssues(dimension, score, nodes, edges),
      improvements: this.getDimensionImprovements(dimension, score)
    }));
  }

  private getDimensionIssues(dimension: string, score: number, nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    // Implementation depends on dimension
    return [];
  }

  private getDimensionImprovements(dimension: string, score: number): string[] {
    // Implementation depends on dimension
    return [];
  }

  private generateSummary(score: QualityScore, grade: 'A' | 'B' | 'C' | 'D' | 'F', nodeCount: number): string {
    return `Workflow quality: ${grade} (${score.overall}/100) with ${nodeCount} nodes. ` +
      (score.overall >= 90 ? 'Excellent quality!' :
       score.overall >= 80 ? 'Good quality with minor improvements needed.' :
       score.overall >= 70 ? 'Acceptable quality, several improvements recommended.' :
       score.overall >= 60 ? 'Below average quality, significant improvements needed.' :
       'Poor quality, major improvements required.');
  }

  private determineSeverity(pattern: PatternMatch): 'critical' | 'high' | 'medium' | 'low' {
    if (pattern.category === 'security' && pattern.confidence > 85) return 'critical';
    if (pattern.confidence > 85) return 'high';
    if (pattern.confidence > 70) return 'medium';
    return 'low';
  }

  private determineImpact(pattern: PatternMatch): string {
    const impacts: Record<string, string> = {
      'api-in-loop': 'Severe performance degradation (10-100x slower)',
      'webhook-no-validation': 'Security vulnerability to malicious inputs',
      'credentials-in-config': 'Credentials exposed in workflow configuration',
      'no-error-handling': 'Workflow may fail without recovery',
      'no-caching': 'Higher costs and slower execution'
    };

    return impacts[pattern.pattern] || 'Moderate impact on workflow quality';
  }

  private getPatternTitle(pattern: string): string {
    const titles: Record<string, string> = {
      'api-in-loop': 'API Calls Inside Loop',
      'webhook-no-validation': 'Webhook Without Validation',
      'credentials-in-config': 'Hardcoded Credentials',
      'no-error-handling': 'Missing Error Handling',
      'no-caching': 'No Caching for Expensive Operations'
    };

    return titles[pattern] || pattern;
  }

  private getDimensionRecommendation(dimension: string, score: number): QualityRecommendation | null {
    const gap = 100 - score;

    const recommendations: Record<string, QualityRecommendation> = {
      errorHandling: {
        priority: 1,
        title: 'Add Error Handling',
        description: 'Add error handlers to HTTP requests and database operations',
        benefit: 'Prevent workflow failures and improve reliability',
        estimatedImprovement: Math.min(gap, 20),
        action: 'Add try-catch or error output connections'
      },
      logging: {
        priority: 2,
        title: 'Add Logging',
        description: 'Add logging nodes for critical operations',
        benefit: 'Better debugging and monitoring capabilities',
        estimatedImprovement: Math.min(gap, 15),
        action: 'Insert log nodes after critical operations'
      },
      performance: {
        priority: 1,
        title: 'Optimize Performance',
        description: 'Address performance anti-patterns in workflow',
        benefit: 'Faster execution and lower resource usage',
        estimatedImprovement: Math.min(gap, 15),
        action: 'Review and optimize loops and API calls'
      },
      security: {
        priority: 1,
        title: 'Improve Security',
        description: 'Add input validation and use secure credential storage',
        benefit: 'Protect against security vulnerabilities',
        estimatedImprovement: Math.min(gap, 20),
        action: 'Add validation nodes and move credentials to secure storage'
      },
      complexity: {
        priority: 3,
        title: 'Reduce Complexity',
        description: 'Break down complex workflow into sub-workflows',
        benefit: 'Better maintainability and understanding',
        estimatedImprovement: Math.min(gap, 10),
        action: 'Extract repeated patterns into sub-workflows'
      },
      documentation: {
        priority: 3,
        title: 'Improve Documentation',
        description: 'Add descriptive names and sticky notes',
        benefit: 'Better workflow understanding and collaboration',
        estimatedImprovement: Math.min(gap, 10),
        action: 'Use auto-naming and add documentation notes'
      },
      maintainability: {
        priority: 2,
        title: 'Improve Maintainability',
        description: 'Use consistent naming and reduce duplication',
        benefit: 'Easier to modify and extend workflow',
        estimatedImprovement: Math.min(gap, 10),
        action: 'Apply consistent patterns and refactor duplicates'
      }
    };

    return recommendations[dimension] || null;
  }

  private getIssueRecommendation(issue: QualityIssue): QualityRecommendation | null {
    const priorityMap = {
      critical: 1 as const,
      high: 1 as const,
      medium: 2 as const,
      low: 3 as const
    };

    return {
      priority: priorityMap[issue.severity],
      title: `Fix: ${issue.title}`,
      description: issue.description,
      benefit: `Resolve ${issue.severity} severity issue`,
      estimatedImprovement: issue.severity === 'critical' ? 20 :
                           issue.severity === 'high' ? 15 :
                           issue.severity === 'medium' ? 10 : 5,
      action: `Address ${issue.affectedNodes.length} affected node(s)`
    };
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  }
}

export const qualityAnalyzer = new QualityAnalyzer();

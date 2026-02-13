/**
 * Workflow Optimizer Service
 * AI-powered workflow optimization and performance suggestions
 */

import { LLMService } from './LLMService';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { logger } from './LoggingService';

export interface OptimizationSuggestion {
  id: string;
  type: 'performance' | 'reliability' | 'cost' | 'security' | 'maintainability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: {
    performance?: number; // percentage improvement
    cost?: number; // cost reduction percentage
    reliability?: number; // reliability improvement percentage
  };
  affectedNodes: string[];
  recommendation: string;
  codeExample?: string;
  autoFixAvailable: boolean;
}

export interface WorkflowAnalysis {
  overallScore: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  suggestions: OptimizationSuggestion[];
  metrics: {
    complexity: number;
    estimatedExecutionTime: number;
    estimatedCost: number;
    nodeCount: number;
    criticalPathLength: number;
    parallelizationOpportunities: number;
  };
  antiPatterns: Array<{
    pattern: string;
    nodes: string[];
    severity: 'low' | 'medium' | 'high';
    fix: string;
  }>;
}

export class WorkflowOptimizerService {
  private llmService: LLMService;

  constructor(llmService: LLMService) {
    this.llmService = llmService;
  }

  /**
   * Analyze workflow and provide optimization suggestions
   */
  async analyzeWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): Promise<WorkflowAnalysis> {
    logger.info('Analyzing workflow for optimization opportunities');

    const suggestions: OptimizationSuggestion[] = [];

    // 1. Detect parallelization opportunities
    const parallelSuggestions = this.detectParallelizationOpportunities(nodes, edges);
    suggestions.push(...parallelSuggestions);

    // 2. Identify caching opportunities
    const cachingSuggestions = this.identifyCachingOpportunities(nodes, edges);
    suggestions.push(...cachingSuggestions);

    // 3. Find redundant nodes
    const redundancySuggestions = this.findRedundantNodes(nodes, edges);
    suggestions.push(...redundancySuggestions);

    // 4. Check for error handling
    const errorHandlingSuggestions = this.checkErrorHandling(nodes, edges);
    suggestions.push(...errorHandlingSuggestions);

    // 5. Analyze security issues
    const securitySuggestions = this.analyzeSecurityIssues(nodes);
    suggestions.push(...securitySuggestions);

    // 6. Detect anti-patterns
    const antiPatterns = this.detectAntiPatterns(nodes, edges);

    // 7. Calculate metrics
    const metrics = this.calculateMetrics(nodes, edges);

    // 8. Use AI for advanced analysis
    const aiSuggestions = await this.getAIOptimizations(nodes, edges);
    suggestions.push(...aiSuggestions);

    // 9. Calculate overall score
    const overallScore = this.calculateOverallScore(suggestions, antiPatterns, metrics);

    // 10. Identify strengths and weaknesses
    const { strengths, weaknesses } = this.identifyStrengthsAndWeaknesses(
      nodes,
      edges,
      suggestions,
      metrics
    );

    return {
      overallScore,
      strengths,
      weaknesses,
      suggestions: suggestions.sort((a, b) =>
        this.prioritizeSuggestion(b) - this.prioritizeSuggestion(a)
      ),
      metrics,
      antiPatterns
    };
  }

  /**
   * Detect opportunities for parallel execution
   */
  private detectParallelizationOpportunities(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const dependencies = this.buildDependencyMap(nodes, edges);

    // Find nodes with the same dependencies
    const nodesByDependencies = new Map<string, WorkflowNode[]>();

    nodes.forEach(node => {
      const deps = dependencies.get(node.id) || [];
      const depKey = deps.sort().join(',');
      if (!nodesByDependencies.has(depKey)) {
        nodesByDependencies.set(depKey, []);
      }
      nodesByDependencies.get(depKey)!.push(node);
    });

    nodesByDependencies.forEach((parallelNodes, depKey) => {
      if (parallelNodes.length > 1 && depKey !== '') {
        suggestions.push({
          id: `parallel-${Date.now()}-${Math.random()}`,
          type: 'performance',
          severity: 'high',
          title: `Parallelize ${parallelNodes.length} independent nodes`,
          description: `These nodes have the same dependencies and can run in parallel, reducing execution time.`,
          impact: {
            performance: 40 * (parallelNodes.length - 1),
            cost: -10
          },
          affectedNodes: parallelNodes.map(n => n.id),
          recommendation: 'Use a Split node to execute these nodes in parallel, then use a Merge node to combine results.',
          autoFixAvailable: true
        });
      }
    });

    return suggestions;
  }

  /**
   * Identify caching opportunities
   */
  private identifyCachingOpportunities(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    const cacheableTypes = ['httpRequest', 'database', 'api'];

    nodes.forEach(node => {
      if (cacheableTypes.includes(node.data.type)) {
        // Check if node is called multiple times or has expensive operations
        const outputs = edges.filter(e => e.source === node.id);

        if (outputs.length > 1 || this.isExpensiveOperation(node)) {
          suggestions.push({
            id: `cache-${node.id}`,
            type: 'performance',
            severity: 'medium',
            title: `Cache results for ${node.data.label}`,
            description: `This ${node.data.type} node performs expensive operations that could benefit from caching.`,
            impact: {
              performance: 30,
              cost: -20
            },
            affectedNodes: [node.id],
            recommendation: 'Enable caching for this node to avoid redundant API calls or database queries.',
            codeExample: `{
  "cache": {
    "enabled": true,
    "ttl": 3600,
    "key": "{{$json.id}}"
  }
}`,
            autoFixAvailable: true
          });
        }
      }
    });

    return suggestions;
  }

  /**
   * Find redundant nodes
   */
  private findRedundantNodes(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Find consecutive transform nodes that could be merged
    nodes.forEach((node, i) => {
      if (node.data.type === 'transform' || node.data.type === 'javascript') {
        const nextEdge = edges.find(e => e.source === node.id);
        if (nextEdge) {
          const nextNode = nodes.find(n => n.id === nextEdge.target);
          if (nextNode && (nextNode.data.type === 'transform' || nextNode.data.type === 'javascript')) {
            suggestions.push({
              id: `merge-${node.id}-${nextNode.id}`,
              type: 'performance',
              severity: 'low',
              title: `Merge consecutive transformation nodes`,
              description: `Nodes "${node.data.label}" and "${nextNode.data.label}" are consecutive transformations that could be combined.`,
              impact: {
                performance: 15,
                cost: -5
              },
              affectedNodes: [node.id, nextNode.id],
              recommendation: 'Combine these transformations into a single node to reduce overhead.',
              autoFixAvailable: true
            });
          }
        }
      }
    });

    // Find nodes with no outgoing edges (dead ends)
    nodes.forEach(node => {
      const hasOutputs = edges.some(e => e.source === node.id);
      const isEndNode = ['email', 'slack', 'webhook', 'database'].includes(node.data.type);

      if (!hasOutputs && !isEndNode) {
        suggestions.push({
          id: `dead-end-${node.id}`,
          type: 'maintainability',
          severity: 'medium',
          title: `Node has no outputs`,
          description: `Node "${node.data.label}" doesn't connect to any other nodes and may be unused.`,
          impact: {
            performance: 10
          },
          affectedNodes: [node.id],
          recommendation: 'Remove this node if it\'s not needed, or connect it to the workflow.',
          autoFixAvailable: false
        });
      }
    });

    return suggestions;
  }

  /**
   * Check for proper error handling
   */
  private checkErrorHandling(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Check if there's at least one error handler
    const hasErrorHandler = nodes.some(n => n.data.type === 'errorHandler' || n.data.type === 'tryCatch');

    if (!hasErrorHandler && nodes.length > 3) {
      suggestions.push({
        id: `missing-error-handler`,
        type: 'reliability',
        severity: 'high',
        title: 'Add error handling',
        description: 'This workflow lacks error handling, which could lead to silent failures.',
        impact: {
          reliability: 40
        },
        affectedNodes: [],
        recommendation: 'Add a Try-Catch node or Error Handler to gracefully handle failures.',
        codeExample: `Add an Error Handler node and connect it to critical operations.`,
        autoFixAvailable: true
      });
    }

    // Check critical nodes for individual error handling
    const criticalTypes = ['httpRequest', 'database', 'email', 'api'];
    nodes.forEach(node => {
      if (criticalTypes.includes(node.data.type)) {
        const hasErrorBranch = edges.some(e =>
          e.source === node.id && e.sourceHandle === 'error'
        );

        if (!hasErrorBranch && !hasErrorHandler) {
          suggestions.push({
            id: `error-${node.id}`,
            type: 'reliability',
            severity: 'medium',
            title: `Add error handling for ${node.data.label}`,
            description: `This ${node.data.type} node can fail but doesn't have error handling.`,
            impact: {
              reliability: 20
            },
            affectedNodes: [node.id],
            recommendation: 'Add an error output branch to handle failures gracefully.',
            autoFixAvailable: true
          });
        }
      }
    });

    return suggestions;
  }

  /**
   * Analyze security issues
   */
  private analyzeSecurityIssues(nodes: WorkflowNode[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    nodes.forEach(node => {
      // Check for hardcoded credentials
      const propsStr = JSON.stringify(node.data.properties || {});
      if (propsStr.includes('password') || propsStr.includes('apiKey') || propsStr.includes('secret')) {
        if (!propsStr.includes('{{') && !propsStr.includes('$credentials')) {
          suggestions.push({
            id: `security-${node.id}`,
            type: 'security',
            severity: 'critical',
            title: `Potential hardcoded credentials in ${node.data.label}`,
            description: 'This node may contain hardcoded credentials, which is a security risk.',
            impact: {},
            affectedNodes: [node.id],
            recommendation: 'Use the credentials system or environment variables instead of hardcoding sensitive data.',
            codeExample: `Use: { "apiKey": "{{$credentials.apiKey}}" }`,
            autoFixAvailable: false
          });
        }
      }

      // Check for SQL injection risks
      if (node.data.type === 'database' || node.data.type === 'mysql' || node.data.type === 'postgresql') {
        const query = node.data.properties?.query as string;
        if (query && query.includes('${') && !query.includes('?')) {
          suggestions.push({
            id: `sql-injection-${node.id}`,
            type: 'security',
            severity: 'critical',
            title: `Potential SQL injection in ${node.data.label}`,
            description: 'This database query uses string interpolation, which can lead to SQL injection.',
            impact: {},
            affectedNodes: [node.id],
            recommendation: 'Use parameterized queries instead of string concatenation.',
            codeExample: `Use: "SELECT * FROM users WHERE id = ?" with parameters`,
            autoFixAvailable: false
          });
        }
      }
    });

    return suggestions;
  }

  /**
   * Detect anti-patterns
   */
  private detectAntiPatterns(nodes: WorkflowNode[], edges: WorkflowEdge[]): any[] {
    const antiPatterns: any[] = [];

    // 1. God Node (node with too many connections)
    nodes.forEach(node => {
      const connections = edges.filter(e => e.source === node.id || e.target === node.id);
      if (connections.length > 10) {
        antiPatterns.push({
          pattern: 'God Node',
          nodes: [node.id],
          severity: 'high',
          fix: 'Break down this node into smaller, more focused nodes.'
        });
      }
    });

    // 2. Spaghetti Code (too many edges crossing)
    if (edges.length > nodes.length * 2) {
      antiPatterns.push({
        pattern: 'Spaghetti Workflow',
        nodes: [],
        severity: 'medium',
        fix: 'Simplify workflow structure by grouping related operations into subworkflows.'
      });
    }

    // 3. Long Chain (too many sequential nodes)
    const chains = this.findLongChains(nodes, edges);
    chains.forEach(chain => {
      if (chain.length > 15) {
        antiPatterns.push({
          pattern: 'Long Sequential Chain',
          nodes: chain,
          severity: 'medium',
          fix: 'Consider breaking this chain into subworkflows or parallelizing independent operations.'
        });
      }
    });

    return antiPatterns;
  }

  /**
   * Get AI-powered optimization suggestions
   */
  private async getAIOptimizations(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): Promise<OptimizationSuggestion[]> {
    try {
      const workflowDescription = this.describeWorkflow(nodes, edges);

      const prompt = `Analyze this workflow and suggest optimizations:

${workflowDescription}

Provide 2-3 specific optimization suggestions in JSON format:
[
  {
    "title": "suggestion title",
    "description": "detailed description",
    "type": "performance|reliability|cost|security",
    "severity": "low|medium|high",
    "impact": { "performance": 0-100, "cost": -100 to 100 },
    "recommendation": "specific action to take"
  }
]`;

      const response = await this.llmService.generateText(
        'gpt-4',
        [{ role: 'user', content: prompt }],
        { temperature: 0.3, maxTokens: 800 }
      );

      const aiSuggestions = JSON.parse(response.content);

      return aiSuggestions.map((s: any) => ({
        id: `ai-${Date.now()}-${Math.random()}`,
        type: s.type,
        severity: s.severity,
        title: s.title,
        description: s.description,
        impact: s.impact,
        affectedNodes: [],
        recommendation: s.recommendation,
        autoFixAvailable: false
      }));
    } catch (error) {
      logger.error('Error getting AI optimizations:', error);
      return [];
    }
  }

  /**
   * Helper methods
   */
  private buildDependencyMap(nodes: WorkflowNode[], edges: WorkflowEdge[]): Map<string, string[]> {
    const deps = new Map<string, string[]>();

    nodes.forEach(node => {
      const nodeDeps = edges
        .filter(e => e.target === node.id)
        .map(e => e.source);
      deps.set(node.id, nodeDeps);
    });

    return deps;
  }

  private isExpensiveOperation(node: WorkflowNode): boolean {
    const expensiveTypes = ['httpRequest', 'database', 'email', 'ai', 'transform'];
    return expensiveTypes.includes(node.data.type);
  }

  private findLongChains(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[][] {
    const chains: string[][] = [];
    const visited = new Set<string>();

    const dfs = (nodeId: string, currentChain: string[]) => {
      currentChain.push(nodeId);
      visited.add(nodeId);

      const nextEdges = edges.filter(e => e.source === nodeId);
      if (nextEdges.length === 1) {
        const next = nextEdges[0].target;
        if (!visited.has(next)) {
          dfs(next, currentChain);
        } else {
          chains.push([...currentChain]);
        }
      } else {
        chains.push([...currentChain]);
      }
    };

    // Find start nodes
    const startNodes = nodes.filter(n =>
      !edges.some(e => e.target === n.id)
    );

    startNodes.forEach(node => {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    });

    return chains;
  }

  private calculateMetrics(nodes: WorkflowNode[], edges: WorkflowEdge[]): any {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const complexity = Math.floor(nodeCount * 0.5 + edgeCount * 0.3);

    const criticalPath = this.findCriticalPath(nodes, edges);
    const parallelOps = this.countParallelOpportunities(nodes, edges);

    return {
      complexity,
      estimatedExecutionTime: this.estimateExecutionTime(nodes),
      estimatedCost: this.estimateCost(nodes),
      nodeCount,
      criticalPathLength: criticalPath.length,
      parallelizationOpportunities: parallelOps
    };
  }

  private findCriticalPath(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    // Simplified critical path calculation
    const chains = this.findLongChains(nodes, edges);
    return chains.reduce((longest, current) =>
      current.length > longest.length ? current : longest,
      []
    );
  }

  private countParallelOpportunities(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
    const suggestions = this.detectParallelizationOpportunities(nodes, edges);
    return suggestions.reduce((sum, s) => sum + s.affectedNodes.length, 0);
  }

  private estimateExecutionTime(nodes: WorkflowNode[]): number {
    const times: Record<string, number> = {
      httpRequest: 500,
      database: 300,
      email: 1000,
      default: 100
    };

    return nodes.reduce((total, node) =>
      total + (times[node.data.type] || times.default),
      0
    );
  }

  private estimateCost(nodes: WorkflowNode[]): number {
    const costs: Record<string, number> = {
      httpRequest: 0.001,
      database: 0.002,
      email: 0.005,
      default: 0.0001
    };

    return nodes.reduce((total, node) =>
      total + (costs[node.data.type] || costs.default),
      0
    );
  }

  private calculateOverallScore(
    suggestions: OptimizationSuggestion[],
    antiPatterns: any[],
    metrics: any
  ): number {
    let score = 100;

    // Deduct for suggestions
    suggestions.forEach(s => {
      const deduction = {
        critical: 15,
        high: 10,
        medium: 5,
        low: 2
      }[s.severity] || 0;
      score -= deduction;
    });

    // Deduct for anti-patterns
    antiPatterns.forEach(ap => {
      const deduction = {
        high: 10,
        medium: 5,
        low: 2
      }[ap.severity] || 0;
      score -= deduction;
    });

    // Deduct for complexity
    if (metrics.complexity > 50) {
      score -= 10;
    } else if (metrics.complexity > 30) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private identifyStrengthsAndWeaknesses(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    suggestions: OptimizationSuggestion[],
    metrics: any
  ): { strengths: string[]; weaknesses: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Strengths
    if (metrics.parallelizationOpportunities > 0) {
      strengths.push(`Good parallelization opportunities (${metrics.parallelizationOpportunities} nodes)`);
    }
    if (metrics.complexity < 20) {
      strengths.push('Clean, simple workflow structure');
    }
    if (nodes.some(n => n.data.type === 'errorHandler')) {
      strengths.push('Includes error handling');
    }

    // Weaknesses
    const criticalIssues = suggestions.filter(s => s.severity === 'critical');
    if (criticalIssues.length > 0) {
      weaknesses.push(`${criticalIssues.length} critical security/reliability issues`);
    }
    if (metrics.complexity > 50) {
      weaknesses.push('High complexity - consider simplification');
    }
    if (metrics.estimatedCost > 0.1) {
      weaknesses.push('High estimated cost per execution');
    }

    return { strengths, weaknesses };
  }

  private describeWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): string {
    const nodeTypes = nodes.map(n => n.data.type).join(', ');
    return `Workflow with ${nodes.length} nodes (${nodeTypes}) and ${edges.length} connections.`;
  }

  private prioritizeSuggestion(suggestion: OptimizationSuggestion): number {
    const severityScores = { critical: 40, high: 30, medium: 20, low: 10 };
    const typeScores = { security: 10, reliability: 8, performance: 6, cost: 4, maintainability: 2 };

    return (severityScores[suggestion.severity] || 0) + (typeScores[suggestion.type] || 0);
  }
}

// Export singleton getter
let optimizerService: WorkflowOptimizerService | null = null;

export const getWorkflowOptimizer = (llmService: LLMService): WorkflowOptimizerService => {
  if (!optimizerService) {
    optimizerService = new WorkflowOptimizerService(llmService);
  }
  return optimizerService;
};

/**
 * AI-Powered Recommendations Engine
 *
 * Provides intelligent recommendations for:
 * - Workflow optimization (remove redundant nodes, parallelize, caching)
 * - Node replacement suggestions
 * - Alternative workflow designs
 * - Cost optimization
 * - Performance improvements
 * - Security best practices
 *
 * @module AIRecommendations
 */

import { WorkflowExecutionData } from './MLModels';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings?: WorkflowSettings;
}

export interface WorkflowNode {
  id: string;
  type: string;
  data: Record<string, any>;
  position?: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowSettings {
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    backoff: 'linear' | 'exponential';
  };
  errorHandling?: 'continue' | 'stop';
  parallelism?: number;
}

export interface Recommendation {
  id: string;
  type:
    | 'optimization'
    | 'replacement'
    | 'alternative'
    | 'cost'
    | 'performance'
    | 'security'
    | 'best_practice';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: {
    performance?: number; // Percentage improvement
    cost?: number; // Percentage savings
    reliability?: number; // Percentage improvement
    security?: number; // 0-10 security score improvement
  };
  effort: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  suggestedChanges: SuggestedChange[];
  reasoning: string;
  references?: string[];
}

export interface SuggestedChange {
  action: 'add' | 'remove' | 'modify' | 'replace';
  target: {
    type: 'node' | 'edge' | 'setting' | 'workflow';
    id?: string;
  };
  details: string;
  before?: any;
  after?: any;
}

export interface OptimizationAnalysis {
  workflow: Workflow;
  executionData?: WorkflowExecutionData[];
  recommendations: Recommendation[];
  score: {
    current: number; // 0-100
    potential: number; // 0-100
    improvement: number; // Percentage
  };
  summary: string;
}

// ============================================================================
// AI Recommendations Engine
// ============================================================================

export class AIRecommendationsEngine {
  /**
   * Analyze workflow and generate comprehensive recommendations
   */
  async analyzeWorkflow(
    workflow: Workflow,
    executionData?: WorkflowExecutionData[]
  ): Promise<OptimizationAnalysis> {
    const recommendations: Recommendation[] = [];

    // Detect redundant nodes
    recommendations.push(...this.detectRedundantNodes(workflow));

    // Suggest parallelization opportunities
    recommendations.push(...this.suggestParallelization(workflow));

    // Suggest caching opportunities
    recommendations.push(...this.suggestCaching(workflow, executionData));

    // Detect error handling issues
    recommendations.push(...this.detectErrorHandlingIssues(workflow));

    // Suggest node replacements
    recommendations.push(...this.suggestNodeReplacements(workflow));

    // Cost optimization suggestions
    recommendations.push(...this.suggestCostOptimizations(workflow, executionData));

    // Performance improvements
    recommendations.push(...this.suggestPerformanceImprovements(workflow, executionData));

    // Security best practices
    recommendations.push(...this.suggestSecurityImprovements(workflow));

    // Alternative workflow designs
    recommendations.push(...this.suggestAlternativeDesigns(workflow));

    // Calculate scores
    const currentScore = this.calculateWorkflowScore(workflow, executionData);
    const potentialScore = this.calculatePotentialScore(currentScore, recommendations);

    // Sort by priority and impact
    recommendations.sort((a, b) => {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];

      if (priorityDiff !== 0) return priorityDiff;

      // Sort by total impact
      const aImpact = (a.impact.performance || 0) + (a.impact.cost || 0) + (a.impact.reliability || 0);
      const bImpact = (b.impact.performance || 0) + (b.impact.cost || 0) + (b.impact.reliability || 0);

      return bImpact - aImpact;
    });

    return {
      workflow,
      executionData,
      recommendations,
      score: {
        current: currentScore,
        potential: potentialScore,
        improvement: ((potentialScore - currentScore) / currentScore) * 100,
      },
      summary: this.generateSummary(recommendations, currentScore, potentialScore),
    };
  }

  /**
   * Detect redundant nodes that can be removed
   */
  private detectRedundantNodes(workflow: Workflow): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Detect nodes with no outgoing edges (except end nodes)
    const nodesWithOutputs = new Set(workflow.edges.map((e) => e.source));
    const deadEndNodes = workflow.nodes.filter(
      (node) => !nodesWithOutputs.has(node.id) && !this.isTerminalNode(node)
    );

    if (deadEndNodes.length > 0) {
      recommendations.push({
        id: `rec-redundant-${Date.now()}`,
        type: 'optimization',
        priority: 'medium',
        title: 'Remove Unused Nodes',
        description: `Found ${deadEndNodes.length} node(s) that have no effect on workflow output`,
        impact: {
          performance: 5,
          cost: 10,
        },
        effort: 'low',
        confidence: 0.95,
        suggestedChanges: deadEndNodes.map((node) => ({
          action: 'remove',
          target: { type: 'node', id: node.id },
          details: `Remove unused ${node.type} node`,
          before: node,
          after: null,
        })),
        reasoning: 'These nodes do not contribute to any output and consume resources unnecessarily',
        references: ['https://docs.workflow.com/best-practices#remove-unused-nodes'],
      });
    }

    // Detect duplicate sequential nodes (same type, same config)
    const duplicates = this.findDuplicateSequentialNodes(workflow);

    if (duplicates.length > 0) {
      recommendations.push({
        id: `rec-duplicate-${Date.now()}`,
        type: 'optimization',
        priority: 'high',
        title: 'Merge Duplicate Nodes',
        description: `Found ${duplicates.length} duplicate sequential node(s) that can be merged`,
        impact: {
          performance: 15,
          cost: 20,
        },
        effort: 'medium',
        confidence: 0.85,
        suggestedChanges: duplicates.map((dup) => ({
          action: 'remove',
          target: { type: 'node', id: dup.id },
          details: `Merge with node ${dup.mergeWith}`,
          before: dup.node,
          after: null,
        })),
        reasoning: 'Merging duplicate nodes reduces redundant operations and improves efficiency',
      });
    }

    return recommendations;
  }

  /**
   * Suggest parallelization opportunities
   */
  private suggestParallelization(workflow: Workflow): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Find independent sequential nodes that can be parallelized
    const parallelizable = this.findParallelizableNodes(workflow);

    if (parallelizable.length > 0) {
      recommendations.push({
        id: `rec-parallel-${Date.now()}`,
        type: 'performance',
        priority: 'high',
        title: 'Enable Parallel Execution',
        description: `${parallelizable.length} group(s) of independent nodes can run in parallel`,
        impact: {
          performance: 40,
          reliability: 5,
        },
        effort: 'medium',
        confidence: 0.9,
        suggestedChanges: parallelizable.map((group) => ({
          action: 'modify',
          target: { type: 'workflow' },
          details: `Run nodes ${group.join(', ')} in parallel`,
          before: { execution: 'sequential' },
          after: { execution: 'parallel' },
        })),
        reasoning: 'Independent nodes can execute concurrently, significantly reducing total execution time',
        references: ['https://docs.workflow.com/performance#parallel-execution'],
      });
    }

    return recommendations;
  }

  /**
   * Suggest caching opportunities
   */
  private suggestCaching(
    workflow: Workflow,
    executionData?: WorkflowExecutionData[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Detect nodes that make repeated identical API calls
    const repeatableNodes = workflow.nodes.filter(
      (node) =>
        node.type === 'httpRequest' ||
        node.type === 'database' ||
        node.type === 'api'
    );

    if (repeatableNodes.length > 0) {
      const cacheableNodes = repeatableNodes.filter((node) =>
        this.isCacheable(node, executionData)
      );

      if (cacheableNodes.length > 0) {
        recommendations.push({
          id: `rec-cache-${Date.now()}`,
          type: 'cost',
          priority: 'high',
          title: 'Implement Response Caching',
          description: `${cacheableNodes.length} node(s) make repeated calls that can be cached`,
          impact: {
            performance: 60,
            cost: 50,
          },
          effort: 'low',
          confidence: 0.8,
          suggestedChanges: cacheableNodes.map((node) => ({
            action: 'modify',
            target: { type: 'node', id: node.id },
            details: `Add caching with TTL`,
            before: { caching: false },
            after: { caching: true, ttl: 3600 },
          })),
          reasoning: 'Caching reduces redundant API calls, improving performance and reducing costs',
          references: ['https://docs.workflow.com/caching'],
        });
      }
    }

    return recommendations;
  }

  /**
   * Detect error handling issues
   */
  private detectErrorHandlingIssues(workflow: Workflow): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Find nodes without error handling
    const nodesWithoutErrorHandling = workflow.nodes.filter(
      (node) => !this.hasErrorHandling(node, workflow)
    );

    if (nodesWithoutErrorHandling.length > 0) {
      recommendations.push({
        id: `rec-error-${Date.now()}`,
        type: 'best_practice',
        priority: 'medium',
        title: 'Add Error Handling',
        description: `${nodesWithoutErrorHandling.length} node(s) lack proper error handling`,
        impact: {
          reliability: 40,
        },
        effort: 'medium',
        confidence: 0.9,
        suggestedChanges: nodesWithoutErrorHandling.map((node) => ({
          action: 'add',
          target: { type: 'node', id: `${node.id}-error` },
          details: `Add error handling for ${node.type} node`,
          after: { type: 'errorHandler', handles: node.id },
        })),
        reasoning: 'Proper error handling prevents workflow failures and improves reliability',
        references: ['https://docs.workflow.com/error-handling'],
      });
    }

    // Check retry policies
    if (!workflow.settings?.retryPolicy) {
      recommendations.push({
        id: `rec-retry-${Date.now()}`,
        type: 'best_practice',
        priority: 'medium',
        title: 'Configure Retry Policy',
        description: 'Workflow lacks retry configuration for transient failures',
        impact: {
          reliability: 30,
        },
        effort: 'low',
        confidence: 0.95,
        suggestedChanges: [
          {
            action: 'add',
            target: { type: 'setting' },
            details: 'Add exponential backoff retry policy',
            after: {
              retryPolicy: {
                maxRetries: 3,
                backoff: 'exponential',
              },
            },
          },
        ],
        reasoning: 'Retry policies help recover from transient failures automatically',
      });
    }

    return recommendations;
  }

  /**
   * Suggest node replacements for better alternatives
   */
  private suggestNodeReplacements(workflow: Workflow): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Map of node replacements (old -> new)
    const replacementMap: Record<string, { type: string; reason: string; impact: any }> = {
      oldHttpRequest: {
        type: 'httpRequestV2',
        reason: 'V2 has better error handling and retry logic',
        impact: { reliability: 25, performance: 10 },
      },
      basicAuth: {
        type: 'oauth2',
        reason: 'OAuth2 is more secure and modern',
        impact: { security: 8 },
      },
      legacyDatabase: {
        type: 'modernDatabase',
        reason: 'Modern database connector supports connection pooling',
        impact: { performance: 30, cost: 15 },
      },
    };

    for (const node of workflow.nodes) {
      const replacement = replacementMap[node.type];

      if (replacement) {
        recommendations.push({
          id: `rec-replace-${node.id}`,
          type: 'replacement',
          priority: 'medium',
          title: `Upgrade ${node.type} Node`,
          description: `Replace ${node.type} with ${replacement.type}`,
          impact: replacement.impact,
          effort: 'low',
          confidence: 0.85,
          suggestedChanges: [
            {
              action: 'replace',
              target: { type: 'node', id: node.id },
              details: replacement.reason,
              before: node,
              after: { ...node, type: replacement.type },
            },
          ],
          reasoning: replacement.reason,
        });
      }
    }

    return recommendations;
  }

  /**
   * Suggest cost optimizations
   */
  private suggestCostOptimizations(
    workflow: Workflow,
    executionData?: WorkflowExecutionData[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Detect expensive API nodes
    const expensiveNodes = workflow.nodes.filter(
      (node) =>
        node.type.includes('premium') ||
        node.type.includes('ai') ||
        node.type.includes('ml')
    );

    if (expensiveNodes.length > 0 && executionData && executionData.length > 0) {
      const avgCost = executionData.reduce((sum, d) => sum + d.cost, 0) / executionData.length;

      if (avgCost > 0.1) {
        // More than $0.10 per execution
        recommendations.push({
          id: `rec-cost-${Date.now()}`,
          type: 'cost',
          priority: 'high',
          title: 'Optimize Expensive Operations',
          description: `Workflow averages $${avgCost.toFixed(4)} per execution`,
          impact: {
            cost: 40,
          },
          effort: 'medium',
          confidence: 0.7,
          suggestedChanges: [
            {
              action: 'modify',
              target: { type: 'workflow' },
              details: 'Review API usage tiers and batch operations',
              before: { optimized: false },
              after: { optimized: true },
            },
          ],
          reasoning: 'Consider batching API calls or using lower-cost alternatives',
          references: ['https://docs.workflow.com/cost-optimization'],
        });
      }
    }

    // Suggest using free alternatives where possible
    const commercialNodes = workflow.nodes.filter(
      (node) => node.type === 'sendgrid' || node.type === 'twilio'
    );

    if (commercialNodes.length > 0) {
      recommendations.push({
        id: `rec-free-alt-${Date.now()}`,
        type: 'cost',
        priority: 'low',
        title: 'Consider Free Alternatives',
        description: 'Some commercial services have free alternatives for basic usage',
        impact: {
          cost: 100, // Could save 100% on those services
        },
        effort: 'medium',
        confidence: 0.5,
        suggestedChanges: commercialNodes.map((node) => ({
          action: 'replace',
          target: { type: 'node', id: node.id },
          details: `Consider free alternative for ${node.type}`,
          before: node,
          after: { note: 'Review free tier options' },
        })),
        reasoning: 'Free tiers may be sufficient for current usage levels',
      });
    }

    return recommendations;
  }

  /**
   * Suggest performance improvements
   */
  private suggestPerformanceImprovements(
    workflow: Workflow,
    executionData?: WorkflowExecutionData[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Check for long execution times
    if (executionData && executionData.length > 0) {
      const avgDuration = executionData.reduce((sum, d) => sum + d.duration, 0) / executionData.length;

      if (avgDuration > 60000) {
        // More than 1 minute
        recommendations.push({
          id: `rec-perf-${Date.now()}`,
          type: 'performance',
          priority: 'high',
          title: 'Reduce Execution Time',
          description: `Average execution time is ${(avgDuration / 1000).toFixed(1)}s`,
          impact: {
            performance: 50,
          },
          effort: 'high',
          confidence: 0.6,
          suggestedChanges: [
            {
              action: 'modify',
              target: { type: 'workflow' },
              details: 'Optimize slow nodes and enable parallelization',
              before: { optimized: false },
              after: { optimized: true },
            },
          ],
          reasoning: 'Long execution times impact user experience and resource utilization',
        });
      }
    }

    // Suggest streaming for large data processing
    const dataProcessingNodes = workflow.nodes.filter(
      (node) =>
        node.type === 'transform' ||
        node.type === 'filter' ||
        node.type === 'map'
    );

    if (dataProcessingNodes.length > 3) {
      recommendations.push({
        id: `rec-stream-${Date.now()}`,
        type: 'performance',
        priority: 'medium',
        title: 'Use Data Streaming',
        description: 'Multiple data transformations can benefit from streaming',
        impact: {
          performance: 35,
        },
        effort: 'high',
        confidence: 0.7,
        suggestedChanges: [
          {
            action: 'modify',
            target: { type: 'workflow' },
            details: 'Enable streaming mode for data processing',
            after: { streaming: true },
          },
        ],
        reasoning: 'Streaming reduces memory usage and improves throughput for large datasets',
      });
    }

    return recommendations;
  }

  /**
   * Suggest security improvements
   */
  private suggestSecurityImprovements(workflow: Workflow): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Check for hardcoded credentials
    const nodesWithPotentialSecrets = workflow.nodes.filter((node) =>
      this.mayContainSecrets(node)
    );

    if (nodesWithPotentialSecrets.length > 0) {
      recommendations.push({
        id: `rec-sec-secrets-${Date.now()}`,
        type: 'security',
        priority: 'critical',
        title: 'Secure Sensitive Data',
        description: 'Potential hardcoded credentials or API keys detected',
        impact: {
          security: 10,
        },
        effort: 'low',
        confidence: 0.6,
        suggestedChanges: nodesWithPotentialSecrets.map((node) => ({
          action: 'modify',
          target: { type: 'node', id: node.id },
          details: 'Move credentials to secure credential store',
          before: { credentials: 'inline' },
          after: { credentials: 'vault' },
        })),
        reasoning: 'Hardcoded secrets pose a security risk if workflows are shared or exported',
        references: ['https://docs.workflow.com/security#credentials'],
      });
    }

    // Check for unencrypted data transmission
    const httpNodes = workflow.nodes.filter((node) => node.type === 'httpRequest');
    const insecureNodes = httpNodes.filter(
      (node) => node.data.url && node.data.url.startsWith('http://')
    );

    if (insecureNodes.length > 0) {
      recommendations.push({
        id: `rec-sec-https-${Date.now()}`,
        type: 'security',
        priority: 'high',
        title: 'Use HTTPS for API Calls',
        description: `${insecureNodes.length} node(s) use unencrypted HTTP`,
        impact: {
          security: 7,
        },
        effort: 'low',
        confidence: 0.95,
        suggestedChanges: insecureNodes.map((node) => ({
          action: 'modify',
          target: { type: 'node', id: node.id },
          details: 'Change HTTP to HTTPS',
          before: { protocol: 'http' },
          after: { protocol: 'https' },
        })),
        reasoning: 'HTTPS encrypts data in transit, protecting against man-in-the-middle attacks',
      });
    }

    return recommendations;
  }

  /**
   * Suggest alternative workflow designs
   */
  private suggestAlternativeDesigns(workflow: Workflow): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Suggest sub-workflows for complex workflows
    if (workflow.nodes.length > 20) {
      recommendations.push({
        id: `rec-alt-subworkflow-${Date.now()}`,
        type: 'alternative',
        priority: 'low',
        title: 'Break Into Sub-Workflows',
        description: 'Large workflow can be split into reusable sub-workflows',
        impact: {
          performance: 10,
          reliability: 15,
        },
        effort: 'high',
        confidence: 0.6,
        suggestedChanges: [
          {
            action: 'modify',
            target: { type: 'workflow' },
            details: 'Identify logical groupings and create sub-workflows',
            after: { architecture: 'modular' },
          },
        ],
        reasoning: 'Modular design improves maintainability, reusability, and testing',
        references: ['https://docs.workflow.com/sub-workflows'],
      });
    }

    // Suggest event-driven architecture for polling workflows
    const pollingNodes = workflow.nodes.filter(
      (node) => node.type === 'schedule' || node.type === 'poll'
    );

    if (pollingNodes.length > 0) {
      recommendations.push({
        id: `rec-alt-webhook-${Date.now()}`,
        type: 'alternative',
        priority: 'medium',
        title: 'Use Webhooks Instead of Polling',
        description: 'Webhook-based triggers are more efficient than polling',
        impact: {
          performance: 70,
          cost: 60,
        },
        effort: 'medium',
        confidence: 0.7,
        suggestedChanges: pollingNodes.map((node) => ({
          action: 'replace',
          target: { type: 'node', id: node.id },
          details: 'Replace polling with webhook trigger',
          before: node,
          after: { type: 'webhook' },
        })),
        reasoning: 'Webhooks eliminate unnecessary polling, reducing latency and cost',
      });
    }

    return recommendations;
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private isTerminalNode(node: WorkflowNode): boolean {
    return node.type === 'end' || node.type === 'response' || node.type === 'webhook';
  }

  private findDuplicateSequentialNodes(workflow: Workflow): Array<{
    id: string;
    node: WorkflowNode;
    mergeWith: string;
  }> {
    const duplicates: Array<{ id: string; node: WorkflowNode; mergeWith: string }> = [];

    for (let i = 0; i < workflow.nodes.length; i++) {
      const node1 = workflow.nodes[i];

      // Find edges where node1 is source
      const outgoingEdges = workflow.edges.filter((e) => e.source === node1.id);

      for (const edge of outgoingEdges) {
        const node2 = workflow.nodes.find((n) => n.id === edge.target);

        if (node2 && this.areNodesSimilar(node1, node2)) {
          duplicates.push({ id: node2.id, node: node2, mergeWith: node1.id });
        }
      }
    }

    return duplicates;
  }

  private areNodesSimilar(node1: WorkflowNode, node2: WorkflowNode): boolean {
    if (node1.type !== node2.type) return false;

    // Simple similarity check (can be enhanced)
    return JSON.stringify(node1.data) === JSON.stringify(node2.data);
  }

  private findParallelizableNodes(workflow: Workflow): string[][] {
    const groups: string[][] = [];

    // Find nodes at the same depth level without dependencies
    const depths = this.calculateNodeDepths(workflow);
    const depthGroups: Record<number, string[]> = {};

    for (const [nodeId, depth] of Object.entries(depths)) {
      if (!depthGroups[depth]) depthGroups[depth] = [];
      depthGroups[depth].push(nodeId);
    }

    for (const group of Object.values(depthGroups)) {
      if (group.length > 1) {
        // Check if nodes are truly independent
        const independent = this.areNodesIndependent(group, workflow);
        if (independent) {
          groups.push(group);
        }
      }
    }

    return groups;
  }

  private calculateNodeDepths(workflow: Workflow): Record<string, number> {
    const depths: Record<string, number> = {};
    const visited = new Set<string>();

    const calculateDepth = (nodeId: string, currentDepth: number): void => {
      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      depths[nodeId] = currentDepth;

      const outgoingEdges = workflow.edges.filter((e) => e.source === nodeId);
      for (const edge of outgoingEdges) {
        calculateDepth(edge.target, currentDepth + 1);
      }
    };

    // Find start nodes (nodes with no incoming edges)
    const nodesWithInputs = new Set(workflow.edges.map((e) => e.target));
    const startNodes = workflow.nodes.filter((n) => !nodesWithInputs.has(n.id));

    for (const node of startNodes) {
      calculateDepth(node.id, 0);
    }

    return depths;
  }

  private areNodesIndependent(nodeIds: string[], workflow: Workflow): boolean {
    // Check if any node depends on another in the group
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = 0; j < nodeIds.length; j++) {
        if (i === j) continue;

        const hasDependency = workflow.edges.some(
          (e) => e.source === nodeIds[i] && e.target === nodeIds[j]
        );

        if (hasDependency) return false;
      }
    }

    return true;
  }

  private isCacheable(node: WorkflowNode, executionData?: WorkflowExecutionData[]): boolean {
    // Simple heuristic: GET requests are cacheable
    if (node.type === 'httpRequest' && node.data.method === 'GET') {
      return true;
    }

    // Database SELECT queries are cacheable
    if (node.type === 'database' && node.data.operation === 'SELECT') {
      return true;
    }

    return false;
  }

  private hasErrorHandling(node: WorkflowNode, workflow: Workflow): boolean {
    // Check if there's an error edge from this node
    const errorEdge = workflow.edges.find(
      (e) => e.source === node.id && e.sourceHandle === 'error'
    );

    return !!errorEdge;
  }

  private mayContainSecrets(node: WorkflowNode): boolean {
    const dataStr = JSON.stringify(node.data).toLowerCase();

    const secretPatterns = [
      'password',
      'apikey',
      'api_key',
      'secret',
      'token',
      'bearer',
      'credential',
    ];

    return secretPatterns.some((pattern) => dataStr.includes(pattern));
  }

  private calculateWorkflowScore(
    workflow: Workflow,
    executionData?: WorkflowExecutionData[]
  ): number {
    let score = 100;

    // Deduct for complexity
    score -= Math.min(20, workflow.nodes.length * 0.5);

    // Deduct for missing error handling
    const nodesWithoutErrors = workflow.nodes.filter(
      (n) => !this.hasErrorHandling(n, workflow)
    ).length;
    score -= nodesWithoutErrors * 2;

    // Deduct for performance issues
    if (executionData && executionData.length > 0) {
      const avgDuration = executionData.reduce((sum, d) => sum + d.duration, 0) / executionData.length;
      if (avgDuration > 30000) score -= 10;
      if (avgDuration > 60000) score -= 10;
    }

    return Math.max(0, score);
  }

  private calculatePotentialScore(
    currentScore: number,
    recommendations: Recommendation[]
  ): number {
    let improvement = 0;

    for (const rec of recommendations) {
      const impact =
        (rec.impact.performance || 0) +
        (rec.impact.reliability || 0) +
        (rec.impact.cost || 0) * 0.5;

      improvement += impact * rec.confidence * 0.1;
    }

    return Math.min(100, currentScore + improvement);
  }

  private generateSummary(
    recommendations: Recommendation[],
    currentScore: number,
    potentialScore: number
  ): string {
    const highPriority = recommendations.filter((r) => r.priority === 'high' || r.priority === 'critical').length;
    const improvement = potentialScore - currentScore;

    return `Workflow score: ${currentScore.toFixed(1)}/100. Found ${recommendations.length} optimization opportunities (${highPriority} high priority). Potential improvement: +${improvement.toFixed(1)} points.`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let engineInstance: AIRecommendationsEngine | null = null;

export function getAIRecommendationsEngine(): AIRecommendationsEngine {
  if (!engineInstance) {
    engineInstance = new AIRecommendationsEngine();
  }
  return engineInstance;
}

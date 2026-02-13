/**
 * Recommendation Engine for AI Recommendations
 *
 * Generates specific recommendations based on workflow analysis.
 *
 * @module recommendations/RecommendationEngine
 */

import {
  Recommendation,
  Workflow,
  WorkflowNode,
  WorkflowExecutionData,
  NodeReplacementMap,
  DuplicateNodeInfo,
} from './types';
import { DataAnalyzer } from './DataAnalyzer';
import { PriorityRanker } from './PriorityRanker';

/**
 * Node replacement configuration map
 */
const NODE_REPLACEMENT_MAP: NodeReplacementMap = {
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

/**
 * Generates recommendations based on workflow analysis
 */
export class RecommendationEngine {
  private dataAnalyzer: DataAnalyzer;
  private priorityRanker: PriorityRanker;

  constructor(dataAnalyzer: DataAnalyzer, priorityRanker: PriorityRanker) {
    this.dataAnalyzer = dataAnalyzer;
    this.priorityRanker = priorityRanker;
  }

  /**
   * Detect redundant nodes and generate recommendations
   */
  detectRedundantNodes(workflow: Workflow): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Detect dead-end nodes
    const deadEndNodes = this.dataAnalyzer.findDeadEndNodes(workflow);

    if (deadEndNodes.length > 0) {
      recommendations.push(this.createDeadEndNodesRecommendation(deadEndNodes));
    }

    // Detect duplicate sequential nodes
    const duplicates = this.dataAnalyzer.findDuplicateSequentialNodes(workflow);

    if (duplicates.length > 0) {
      recommendations.push(this.createDuplicateNodesRecommendation(duplicates));
    }

    return recommendations;
  }

  /**
   * Suggest parallelization opportunities
   */
  suggestParallelization(workflow: Workflow): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const parallelizable = this.dataAnalyzer.findParallelizableNodes(workflow);

    if (parallelizable.length > 0) {
      recommendations.push({
        id: `rec-parallel-${Date.now()}`,
        type: 'performance',
        priority: 'high',
        title: 'Enable Parallel Execution',
        description: `${parallelizable.length} group(s) of independent nodes can run in parallel`,
        impact: { performance: 40, reliability: 5 },
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
  suggestCaching(workflow: Workflow, executionData?: WorkflowExecutionData[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const repeatableNodes = this.dataAnalyzer.findRepeatableApiNodes(workflow);

    if (repeatableNodes.length > 0) {
      const cacheableNodes = repeatableNodes.filter((node) =>
        this.dataAnalyzer.isCacheable(node, executionData)
      );

      if (cacheableNodes.length > 0) {
        recommendations.push({
          id: `rec-cache-${Date.now()}`,
          type: 'cost',
          priority: 'high',
          title: 'Implement Response Caching',
          description: `${cacheableNodes.length} node(s) make repeated calls that can be cached`,
          impact: { performance: 60, cost: 50 },
          effort: 'low',
          confidence: 0.8,
          suggestedChanges: cacheableNodes.map((node) => ({
            action: 'modify',
            target: { type: 'node', id: node.id },
            details: 'Add caching with TTL',
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
  detectErrorHandlingIssues(workflow: Workflow): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Nodes without error handling
    const nodesWithoutErrorHandling = this.dataAnalyzer.findNodesWithoutErrorHandling(workflow);

    if (nodesWithoutErrorHandling.length > 0) {
      recommendations.push({
        id: `rec-error-${Date.now()}`,
        type: 'best_practice',
        priority: 'medium',
        title: 'Add Error Handling',
        description: `${nodesWithoutErrorHandling.length} node(s) lack proper error handling`,
        impact: { reliability: 40 },
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
        impact: { reliability: 30 },
        effort: 'low',
        confidence: 0.95,
        suggestedChanges: [
          {
            action: 'add',
            target: { type: 'setting' },
            details: 'Add exponential backoff retry policy',
            after: { retryPolicy: { maxRetries: 3, backoff: 'exponential' } },
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
  suggestNodeReplacements(workflow: Workflow): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const node of workflow.nodes) {
      const replacement = NODE_REPLACEMENT_MAP[node.type];

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
  suggestCostOptimizations(
    workflow: Workflow,
    executionData?: WorkflowExecutionData[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Detect expensive API nodes
    const expensiveNodes = this.dataAnalyzer.findExpensiveNodes(workflow);

    if (expensiveNodes.length > 0 && executionData && executionData.length > 0) {
      const avgCost = this.priorityRanker.calculateAverageCost(executionData);

      if (avgCost > 0.1) {
        recommendations.push({
          id: `rec-cost-${Date.now()}`,
          type: 'cost',
          priority: 'high',
          title: 'Optimize Expensive Operations',
          description: `Workflow averages $${avgCost.toFixed(4)} per execution`,
          impact: { cost: 40 },
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

    // Suggest free alternatives
    const commercialNodes = this.dataAnalyzer.findCommercialNodes(workflow);

    if (commercialNodes.length > 0) {
      recommendations.push({
        id: `rec-free-alt-${Date.now()}`,
        type: 'cost',
        priority: 'low',
        title: 'Consider Free Alternatives',
        description: 'Some commercial services have free alternatives for basic usage',
        impact: { cost: 100 },
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
  suggestPerformanceImprovements(
    workflow: Workflow,
    executionData?: WorkflowExecutionData[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Check for long execution times
    if (executionData && executionData.length > 0) {
      const avgDuration = this.priorityRanker.calculateAverageDuration(executionData);

      if (avgDuration > 60000) {
        recommendations.push({
          id: `rec-perf-${Date.now()}`,
          type: 'performance',
          priority: 'high',
          title: 'Reduce Execution Time',
          description: `Average execution time is ${(avgDuration / 1000).toFixed(1)}s`,
          impact: { performance: 50 },
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
    const dataProcessingNodes = this.dataAnalyzer.findDataProcessingNodes(workflow);

    if (dataProcessingNodes.length > 3) {
      recommendations.push({
        id: `rec-stream-${Date.now()}`,
        type: 'performance',
        priority: 'medium',
        title: 'Use Data Streaming',
        description: 'Multiple data transformations can benefit from streaming',
        impact: { performance: 35 },
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
  suggestSecurityImprovements(workflow: Workflow): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Check for hardcoded credentials
    const nodesWithPotentialSecrets = workflow.nodes.filter((node) =>
      this.dataAnalyzer.mayContainSecrets(node)
    );

    if (nodesWithPotentialSecrets.length > 0) {
      recommendations.push({
        id: `rec-sec-secrets-${Date.now()}`,
        type: 'security',
        priority: 'critical',
        title: 'Secure Sensitive Data',
        description: 'Potential hardcoded credentials or API keys detected',
        impact: { security: 10 },
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
    const insecureNodes = this.dataAnalyzer.findInsecureHttpNodes(workflow);

    if (insecureNodes.length > 0) {
      recommendations.push({
        id: `rec-sec-https-${Date.now()}`,
        type: 'security',
        priority: 'high',
        title: 'Use HTTPS for API Calls',
        description: `${insecureNodes.length} node(s) use unencrypted HTTP`,
        impact: { security: 7 },
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
  suggestAlternativeDesigns(workflow: Workflow): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Suggest sub-workflows for complex workflows
    if (workflow.nodes.length > 20) {
      recommendations.push({
        id: `rec-alt-subworkflow-${Date.now()}`,
        type: 'alternative',
        priority: 'low',
        title: 'Break Into Sub-Workflows',
        description: 'Large workflow can be split into reusable sub-workflows',
        impact: { performance: 10, reliability: 15 },
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
    const pollingNodes = this.dataAnalyzer.findPollingNodes(workflow);

    if (pollingNodes.length > 0) {
      recommendations.push({
        id: `rec-alt-webhook-${Date.now()}`,
        type: 'alternative',
        priority: 'medium',
        title: 'Use Webhooks Instead of Polling',
        description: 'Webhook-based triggers are more efficient than polling',
        impact: { performance: 70, cost: 60 },
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
  // Private Helper Methods
  // ========================================================================

  private createDeadEndNodesRecommendation(deadEndNodes: WorkflowNode[]): Recommendation {
    return {
      id: `rec-redundant-${Date.now()}`,
      type: 'optimization',
      priority: 'medium',
      title: 'Remove Unused Nodes',
      description: `Found ${deadEndNodes.length} node(s) that have no effect on workflow output`,
      impact: { performance: 5, cost: 10 },
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
    };
  }

  private createDuplicateNodesRecommendation(duplicates: DuplicateNodeInfo[]): Recommendation {
    return {
      id: `rec-duplicate-${Date.now()}`,
      type: 'optimization',
      priority: 'high',
      title: 'Merge Duplicate Nodes',
      description: `Found ${duplicates.length} duplicate sequential node(s) that can be merged`,
      impact: { performance: 15, cost: 20 },
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
    };
  }
}

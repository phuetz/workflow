/**
 * Workflow Optimizer for AI Copilot Studio
 *
 * AI-powered optimization providing:
 * 1. Performance improvements
 * 2. Cost reduction strategies
 * 3. Security enhancements
 * 4. Reliability improvements
 * 5. Maintainability suggestions
 */

import { OptimizationRecommendation } from './types/copilot';
import { Workflow, WorkflowNode } from '../types/workflowTypes';
import { logger } from '../services/SimpleLogger';

/**
 * Optimization rule
 */
interface OptimizationRule {
  id: string;
  name: string;
  type: OptimizationRecommendation['type'];
  check: (workflow: Workflow) => boolean;
  analyze: (workflow: Workflow) => OptimizationRecommendation | null;
  priority: number;
}

/**
 * Workflow optimizer with AI-powered suggestions
 */
export class WorkflowOptimizer {
  private rules: OptimizationRule[];
  private optimizationHistory: Map<string, OptimizationRecommendation[]> = new Map();

  constructor() {
    this.rules = this.initializeRules();
  }

  /**
   * Analyze workflow and provide optimization recommendations
   */
  async optimize(workflow: Workflow): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    logger.info(`Optimizing workflow: ${workflow.id}`);

    // Apply all optimization rules
    for (const rule of this.rules) {
      try {
        if (rule.check(workflow)) {
          const recommendation = rule.analyze(workflow);
          if (recommendation) {
            recommendations.push(recommendation);
          }
        }
      } catch (error) {
        logger.error(`Optimization rule ${rule.id} failed:`, error);
      }
    }

    // Sort by priority
    recommendations.sort((a, b) => b.priority - a.priority);

    // Store in history
    this.optimizationHistory.set(workflow.id, recommendations);

    logger.info(`Generated ${recommendations.length} optimization recommendations`);

    return recommendations;
  }

  /**
   * Get specific optimization type
   */
  async getOptimizations(
    workflow: Workflow,
    type: OptimizationRecommendation['type']
  ): Promise<OptimizationRecommendation[]> {
    const all = await this.optimize(workflow);
    return all.filter(r => r.type === type);
  }

  /**
   * Get high priority optimizations
   */
  async getHighPriorityOptimizations(workflow: Workflow): Promise<OptimizationRecommendation[]> {
    const all = await this.optimize(workflow);
    return all.filter(r => r.priority >= 7);
  }

  /**
   * Get auto-applicable optimizations
   */
  async getAutoApplicable(workflow: Workflow): Promise<OptimizationRecommendation[]> {
    const all = await this.optimize(workflow);
    return all.filter(r => r.autoApplicable);
  }

  /**
   * Apply optimization recommendation
   */
  async applyOptimization(
    workflow: Workflow,
    recommendation: OptimizationRecommendation
  ): Promise<Workflow> {
    logger.info(`Applying optimization: ${recommendation.title}`);

    // This would apply the actual optimization
    // For now, return the preview workflow if available
    if (recommendation.previewWorkflow) {
      return { ...workflow, ...recommendation.previewWorkflow };
    }

    return workflow;
  }

  /**
   * Calculate optimization impact
   */
  calculateImpact(recommendations: OptimizationRecommendation[]): {
    totalPerformanceGain: number;
    totalCostSavings: number;
    totalReliabilityGain: number;
  } {
    let totalPerformanceGain = 0;
    let totalCostSavings = 0;
    let totalReliabilityGain = 0;

    for (const rec of recommendations) {
      if (rec.impact.performance) {
        totalPerformanceGain += rec.impact.performance;
      }
      if (rec.impact.cost) {
        totalCostSavings += rec.impact.cost;
      }
      if (rec.impact.reliability) {
        totalReliabilityGain += rec.impact.reliability;
      }
    }

    return {
      totalPerformanceGain,
      totalCostSavings,
      totalReliabilityGain
    };
  }

  /**
   * Initialize optimization rules
   */
  private initializeRules(): OptimizationRule[] {
    return [
      // Performance optimizations
      {
        id: 'parallel-execution',
        name: 'Parallelize Independent Nodes',
        type: 'performance',
        check: (workflow) => workflow.nodes.length > 2,
        analyze: (workflow) => {
          const independentNodes = this.findIndependentNodes(workflow);

          if (independentNodes.length >= 2) {
            return {
              id: this.generateId(),
              type: 'performance',
              title: 'Parallelize Independent Nodes',
              description: `${independentNodes.length} nodes can be executed in parallel to improve performance`,
              currentState: 'Sequential execution',
              proposedChange: 'Parallel execution where possible',
              impact: {
                performance: 30 + independentNodes.length * 10
              },
              effort: 'low',
              priority: 8,
              autoApplicable: true
            };
          }

          return null;
        },
        priority: 8
      },

      // Cost optimizations
      {
        id: 'reduce-api-calls',
        name: 'Reduce API Calls',
        type: 'cost',
        check: (workflow) => this.countNodeType(workflow, 'http-request') > 3,
        analyze: (workflow) => {
          const apiCalls = this.countNodeType(workflow, 'http-request');

          return {
            id: this.generateId(),
            type: 'cost',
            title: 'Reduce API Calls',
            description: `Workflow makes ${apiCalls} API calls. Consider batching or caching`,
            currentState: `${apiCalls} separate API calls`,
            proposedChange: 'Batch API calls or implement caching',
            impact: {
              cost: apiCalls * 0.01,
              performance: 15
            },
            effort: 'medium',
            priority: 7,
            autoApplicable: false
          };
        },
        priority: 7
      },

      // Reliability optimizations
      {
        id: 'add-error-handling',
        name: 'Add Error Handling',
        type: 'reliability',
        check: (workflow) => !this.hasErrorHandling(workflow),
        analyze: (workflow) => {
          return {
            id: this.generateId(),
            type: 'reliability',
            title: 'Add Error Handling',
            description: 'Workflow lacks error handling. Add try-catch blocks',
            currentState: 'No error handling',
            proposedChange: 'Add try-catch nodes around critical operations',
            impact: {
              reliability: 0.4
            },
            effort: 'low',
            priority: 9,
            autoApplicable: true
          };
        },
        priority: 9
      },

      {
        id: 'add-retry-logic',
        name: 'Add Retry Logic',
        type: 'reliability',
        check: (workflow) => this.hasExternalCalls(workflow) && !this.hasRetryLogic(workflow),
        analyze: (workflow) => {
          return {
            id: this.generateId(),
            type: 'reliability',
            title: 'Add Retry Logic',
            description: 'External API calls should have retry logic for transient failures',
            currentState: 'No retry mechanism',
            proposedChange: 'Add exponential backoff retry for external calls',
            impact: {
              reliability: 0.3,
              performance: 0 // reliability improvement, no direct performance change
            },
            effort: 'low',
            priority: 8,
            autoApplicable: true
          };
        },
        priority: 8
      },

      // Security optimizations
      {
        id: 'secure-credentials',
        name: 'Secure Credentials',
        type: 'security',
        check: (workflow) => this.hasHardcodedCredentials(workflow),
        analyze: (workflow) => {
          return {
            id: this.generateId(),
            type: 'security',
            title: 'Secure Credentials',
            description: 'Credentials should not be hardcoded. Use credential manager',
            currentState: 'Hardcoded credentials detected',
            proposedChange: 'Use credential manager for sensitive data',
            impact: {
              reliability: 0.2
            },
            effort: 'low',
            priority: 10,
            autoApplicable: false
          };
        },
        priority: 10
      },

      {
        id: 'validate-inputs',
        name: 'Validate Inputs',
        type: 'security',
        check: (workflow) => !this.hasInputValidation(workflow),
        analyze: (workflow) => {
          return {
            id: this.generateId(),
            type: 'security',
            title: 'Validate Inputs',
            description: 'Add input validation to prevent injection attacks',
            currentState: 'No input validation',
            proposedChange: 'Add validation nodes for user inputs',
            impact: {
              reliability: 0.25
            },
            effort: 'medium',
            priority: 8,
            autoApplicable: false
          };
        },
        priority: 8
      },

      // Maintainability optimizations
      {
        id: 'add-logging',
        name: 'Add Logging',
        type: 'maintainability',
        check: (workflow) => workflow.nodes.length > 5 && this.countNodeType(workflow, 'log') === 0,
        analyze: (workflow) => {
          return {
            id: this.generateId(),
            type: 'maintainability',
            title: 'Add Logging',
            description: 'Add logging nodes for better debugging and monitoring',
            currentState: 'No logging',
            proposedChange: 'Add log nodes at key points in workflow',
            impact: {
              reliability: 0.15
            },
            effort: 'low',
            priority: 6,
            autoApplicable: true
          };
        },
        priority: 6
      },

      {
        id: 'simplify-workflow',
        name: 'Simplify Workflow',
        type: 'maintainability',
        check: (workflow) => workflow.nodes.length > 15,
        analyze: (workflow) => {
          return {
            id: this.generateId(),
            type: 'maintainability',
            title: 'Simplify Workflow',
            description: `Workflow has ${workflow.nodes.length} nodes. Consider breaking into sub-workflows`,
            currentState: `Single workflow with ${workflow.nodes.length} nodes`,
            proposedChange: 'Break into smaller, reusable sub-workflows',
            impact: {
              performance: 5
            },
            effort: 'high',
            priority: 5,
            autoApplicable: false
          };
        },
        priority: 5
      },

      // Performance - caching
      {
        id: 'add-caching',
        name: 'Add Caching',
        type: 'performance',
        check: (workflow) => this.hasRepeatedOperations(workflow),
        analyze: (workflow) => {
          return {
            id: this.generateId(),
            type: 'performance',
            title: 'Add Caching',
            description: 'Repeated operations detected. Add caching to improve performance',
            currentState: 'No caching',
            proposedChange: 'Cache results of expensive operations',
            impact: {
              performance: 40,
              cost: 0.05
            },
            effort: 'medium',
            priority: 7,
            autoApplicable: false
          };
        },
        priority: 7
      },

      // Cost - reduce data transfer
      {
        id: 'reduce-data-transfer',
        name: 'Reduce Data Transfer',
        type: 'cost',
        check: (workflow) => this.hasLargeDataTransfers(workflow),
        analyze: (workflow) => {
          return {
            id: this.generateId(),
            type: 'cost',
            title: 'Reduce Data Transfer',
            description: 'Large data transfers detected. Consider filtering or pagination',
            currentState: 'Transferring full datasets',
            proposedChange: 'Add filtering/pagination to reduce data transfer',
            impact: {
              cost: 0.10,
              performance: 20
            },
            effort: 'medium',
            priority: 6,
            autoApplicable: false
          };
        },
        priority: 6
      }
    ];
  }

  /**
   * Helper methods for rule checks
   */

  private findIndependentNodes(workflow: Workflow): WorkflowNode[] {
    // Simplified: nodes without incoming edges
    const nodesWithInputs = new Set(workflow.edges.map(e => e.target));
    return workflow.nodes.filter(n => !nodesWithInputs.has(n.id));
  }

  private countNodeType(workflow: Workflow, type: string): number {
    return workflow.nodes.filter(n => n.type === type || n.type.includes(type)).length;
  }

  private hasErrorHandling(workflow: Workflow): boolean {
    return workflow.nodes.some(n => n.type === 'try-catch' || n.type.includes('error'));
  }

  private hasRetryLogic(workflow: Workflow): boolean {
    return workflow.nodes.some(n => n.type === 'retry' || n.data?.config?.retry);
  }

  private hasExternalCalls(workflow: Workflow): boolean {
    return workflow.nodes.some(n =>
      n.type.includes('http') || n.type.includes('api') || n.type.includes('webhook')
    );
  }

  private hasHardcodedCredentials(workflow: Workflow): boolean {
    // Check for hardcoded credentials in node configs
    return workflow.nodes.some(n => {
      const config = n.data?.config;
      if (!config) return false;

      const configStr = JSON.stringify(config).toLowerCase();
      return (
        configStr.includes('password') ||
        configStr.includes('api_key') ||
        configStr.includes('secret')
      );
    });
  }

  private hasInputValidation(workflow: Workflow): boolean {
    return workflow.nodes.some(n => n.type === 'validate' || n.type.includes('validation'));
  }

  private hasRepeatedOperations(workflow: Workflow): boolean {
    const nodeTypes = workflow.nodes.map(n => n.type);
    const uniqueTypes = new Set(nodeTypes);
    return nodeTypes.length > uniqueTypes.size * 1.5;
  }

  private hasLargeDataTransfers(workflow: Workflow): boolean {
    // Heuristic: multiple database or API nodes
    const dataNodes = workflow.nodes.filter(n =>
      n.type.includes('database') || n.type.includes('http') || n.type.includes('api')
    );
    return dataNodes.length > 3;
  }

  private generateId(): string {
    return `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Singleton instance
 */
export const workflowOptimizer = new WorkflowOptimizer();

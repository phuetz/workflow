/**
 * Cost Optimizer
 * Suggests optimizations to reduce costs
 */

import type {
  CostOptimization,
  OptimizationAction,
  DateRange,
  ExecutionMetrics,
} from '../../types/advanced-analytics';
import { costCalculator } from './CostCalculator';
import { costBreakdown } from './CostBreakdown';

export class CostOptimizer {
  /**
   * Get optimization recommendations for a workflow
   */
  getWorkflowOptimizations(
    workflowId: string,
    dateRange: DateRange
  ): CostOptimization {
    const breakdown = costBreakdown.getWorkflowCostBreakdown(workflowId, dateRange);
    const optimizations: OptimizationAction[] = [];

    let optimizedCost = breakdown.totalCost;

    // Check for LLM optimization opportunities
    const llmSavings = this.analyzeLLMCosts(breakdown);
    if (llmSavings) {
      optimizations.push(llmSavings);
      optimizedCost -= llmSavings.impact;
    }

    // Check for caching opportunities
    const cacheSavings = this.analyzeCachingOpportunities(breakdown);
    if (cacheSavings) {
      optimizations.push(cacheSavings);
      optimizedCost -= cacheSavings.impact;
    }

    // Check for batching opportunities
    const batchSavings = this.analyzeBatchingOpportunities(breakdown);
    if (batchSavings) {
      optimizations.push(batchSavings);
      optimizedCost -= batchSavings.impact;
    }

    // Check for parallel execution opportunities
    const parallelSavings = this.analyzeParallelizationOpportunities(breakdown);
    if (parallelSavings) {
      optimizations.push(parallelSavings);
      optimizedCost -= parallelSavings.impact;
    }

    const savings = breakdown.totalCost - optimizedCost;
    const savingsPercentage =
      breakdown.totalCost > 0 ? (savings / breakdown.totalCost) * 100 : 0;

    return {
      id: this.generateId(),
      workflowId,
      currentCost: breakdown.totalCost,
      optimizedCost,
      savings,
      savingsPercentage,
      optimizations,
    };
  }

  /**
   * Analyze LLM costs for optimization
   */
  private analyzeLLMCosts(
    breakdown: import('./CostBreakdown').WorkflowCostBreakdown
  ): OptimizationAction | null {
    const llmCost = breakdown.byCategory['llmTokens'] || 0;
    if (llmCost < breakdown.totalCost * 0.1) return null; // Not significant

    // Estimate savings by switching to cheaper model
    const estimatedSavings = llmCost * 0.5; // 50% savings with GPT-3.5

    return {
      type: 'provider-switch',
      description:
        'Switch from GPT-4 to GPT-3.5-Turbo for simple tasks to save ~50% on LLM costs',
      impact: estimatedSavings,
      complexity: 'low',
      autoApplicable: false,
    };
  }

  /**
   * Analyze caching opportunities
   */
  private analyzeCachingOpportunities(
    breakdown: import('./CostBreakdown').WorkflowCostBreakdown
  ): OptimizationAction | null {
    const apiCost = breakdown.byCategory['apiCalls'] || 0;
    if (apiCost < breakdown.totalCost * 0.1) return null; // Not significant

    // If many API calls, caching could help
    if (breakdown.executionCount > 100) {
      const estimatedSavings = apiCost * 0.3; // 30% savings with caching

      return {
        type: 'cache',
        description:
          'Implement caching for frequently called APIs to reduce redundant requests',
        impact: estimatedSavings,
        complexity: 'medium',
        autoApplicable: true,
      };
    }

    return null;
  }

  /**
   * Analyze batching opportunities
   */
  private analyzeBatchingOpportunities(
    breakdown: import('./CostBreakdown').WorkflowCostBreakdown
  ): OptimizationAction | null {
    // If many small executions, batching could help
    if (
      breakdown.executionCount > 1000 &&
      breakdown.avgCostPerExecution < 0.01
    ) {
      const estimatedSavings = breakdown.totalCost * 0.2; // 20% savings with batching

      return {
        type: 'batch',
        description: 'Batch multiple workflow executions to reduce overhead',
        impact: estimatedSavings,
        complexity: 'high',
        autoApplicable: false,
      };
    }

    return null;
  }

  /**
   * Analyze parallelization opportunities
   */
  private analyzeParallelizationOpportunities(
    breakdown: import('./CostBreakdown').WorkflowCostBreakdown
  ): OptimizationAction | null {
    // This would require analyzing workflow structure
    // For now, return a generic recommendation
    const computeCost = breakdown.byCategory['compute'] || 0;
    if (computeCost > breakdown.totalCost * 0.2) {
      const estimatedSavings = computeCost * 0.3; // 30% time savings

      return {
        type: 'parallel',
        description:
          'Parallelize independent nodes to reduce execution time and compute costs',
        impact: estimatedSavings,
        complexity: 'medium',
        autoApplicable: false,
      };
    }

    return null;
  }

  /**
   * Get optimization recommendations for all workflows
   */
  getAllOptimizations(dateRange: DateRange): CostOptimization[] {
    const mostExpensive = costBreakdown.getMostExpensiveWorkflows(dateRange, 20);

    return mostExpensive
      .map(workflow => this.getWorkflowOptimizations(workflow.workflowId, dateRange))
      .filter(opt => opt.savings > 0)
      .sort((a, b) => b.savings - a.savings);
  }

  /**
   * Get quick wins (easy, high-impact optimizations)
   */
  getQuickWins(dateRange: DateRange): OptimizationAction[] {
    const allOptimizations = this.getAllOptimizations(dateRange);
    const quickWins: OptimizationAction[] = [];

    allOptimizations.forEach(optimization => {
      optimization.optimizations.forEach(action => {
        if (action.complexity === 'low' && action.impact > 10) {
          quickWins.push(action);
        }
      });
    });

    return quickWins.sort((a, b) => b.impact - a.impact).slice(0, 10);
  }

  /**
   * Get auto-applicable optimizations
   */
  getAutoApplicableOptimizations(
    dateRange: DateRange
  ): OptimizationAction[] {
    const allOptimizations = this.getAllOptimizations(dateRange);
    const autoApplicable: OptimizationAction[] = [];

    allOptimizations.forEach(optimization => {
      optimization.optimizations.forEach(action => {
        if (action.autoApplicable) {
          autoApplicable.push(action);
        }
      });
    });

    return autoApplicable.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Calculate total potential savings
   */
  getTotalPotentialSavings(dateRange: DateRange): {
    current: number;
    optimized: number;
    savings: number;
    savingsPercentage: number;
  } {
    const allOptimizations = this.getAllOptimizations(dateRange);

    const current = allOptimizations.reduce(
      (sum, opt) => sum + opt.currentCost,
      0
    );
    const savings = allOptimizations.reduce((sum, opt) => sum + opt.savings, 0);
    const optimized = current - savings;
    const savingsPercentage = current > 0 ? (savings / current) * 100 : 0;

    return {
      current,
      optimized,
      savings,
      savingsPercentage,
    };
  }

  /**
   * Analyze node type costs
   */
  analyzeNodeTypeCosts(
    dateRange: DateRange
  ): Array<{
    nodeType: string;
    currentCost: number;
    optimizationPotential: number;
    recommendations: string[];
  }> {
    const nodeTypes = costBreakdown.getMostExpensiveNodeTypes(dateRange, 20);

    return nodeTypes.map(node => {
      const recommendations: string[] = [];
      let optimizationPotential = 0;

      // LLM nodes
      if (node.nodeType.includes('llm') || node.nodeType.includes('openai')) {
        recommendations.push('Consider using cheaper LLM models for simple tasks');
        optimizationPotential = node.totalCost * 0.5;
      }

      // HTTP nodes
      if (node.nodeType.includes('http')) {
        recommendations.push('Implement response caching');
        recommendations.push('Add rate limiting to prevent excessive calls');
        optimizationPotential = node.totalCost * 0.3;
      }

      // Database nodes
      if (node.nodeType.includes('database') || node.nodeType.includes('sql')) {
        recommendations.push('Optimize queries');
        recommendations.push('Use connection pooling');
        optimizationPotential = node.totalCost * 0.2;
      }

      return {
        nodeType: node.nodeType,
        currentCost: node.totalCost,
        optimizationPotential,
        recommendations,
      };
    });
  }

  /**
   * Get cost trends and predictions
   */
  getCostTrends(
    workflowId: string,
    dateRange: DateRange
  ): {
    current: number;
    trend: number;
    predictedNextMonth: number;
    recommendation: string;
  } {
    const breakdown = costBreakdown.getWorkflowCostBreakdown(workflowId, dateRange);

    const trend = breakdown.trend;
    const predictedNextMonth = breakdown.totalCost * (1 + trend / 100);

    let recommendation = 'Cost is stable';
    if (trend > 20) {
      recommendation = 'Cost is increasing rapidly - review optimizations';
    } else if (trend < -20) {
      recommendation = 'Cost is decreasing - good optimization efforts';
    }

    return {
      current: breakdown.totalCost,
      trend,
      predictedNextMonth,
      recommendation,
    };
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const costOptimizer = new CostOptimizer();

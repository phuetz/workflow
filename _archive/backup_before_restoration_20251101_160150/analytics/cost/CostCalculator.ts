/**
 * Cost Calculator
 * Calculates execution costs for workflows and nodes
 */

import type {
  ExecutionCost,
  CostBreakdownItem,
  ExecutionMetrics,
  NodeExecutionMetric,
} from '../../types/advanced-analytics';

export interface CostConfig {
  apiCall: number; // Cost per API call
  llmTokenInput: number; // Cost per 1K input tokens
  llmTokenOutput: number; // Cost per 1K output tokens
  compute: number; // Cost per second of compute
  storage: number; // Cost per MB stored
  networkIn: number; // Cost per MB network in
  networkOut: number; // Cost per MB network out
}

export interface NodeCostData {
  apiCalls?: number;
  llmTokensInput?: number;
  llmTokensOutput?: number;
  computeTime?: number; // seconds
  storageSize?: number; // MB
  networkIn?: number; // MB
  networkOut?: number; // MB
}

export class CostCalculator {
  private config: CostConfig;

  constructor(config?: Partial<CostConfig>) {
    this.config = {
      apiCall: 0.001, // $0.001 per call
      llmTokenInput: 0.0015, // $0.0015 per 1K tokens (GPT-4)
      llmTokenOutput: 0.002, // $0.002 per 1K tokens (GPT-4)
      compute: 0.0001, // $0.0001 per second
      storage: 0.00001, // $0.00001 per MB
      networkIn: 0.00001, // $0.00001 per MB
      networkOut: 0.00002, // $0.00002 per MB
      ...config,
    };
  }

  /**
   * Calculate cost for a workflow execution
   */
  calculateExecutionCost(metrics: ExecutionMetrics): ExecutionCost {
    const breakdown: CostBreakdownItem[] = [];
    let totalCost = 0;

    // Calculate costs from node executions
    metrics.nodeExecutions.forEach(node => {
      const nodeCost = this.calculateNodeCost(node);
      totalCost += nodeCost.total;
      breakdown.push(...nodeCost.breakdown);
    });

    // Calculate compute cost
    const computeCost = this.calculateComputeCost(metrics.duration / 1000);
    totalCost += computeCost.totalCost;
    breakdown.push(computeCost);

    // Calculate storage cost
    if (metrics.resourceUsage.storageUsed > 0) {
      const storageCost = this.calculateStorageCost(
        metrics.resourceUsage.storageUsed / (1024 * 1024)
      );
      totalCost += storageCost.totalCost;
      breakdown.push(storageCost);
    }

    // Calculate network cost
    const networkCost = this.calculateNetworkCost(
      metrics.resourceUsage.networkIn / (1024 * 1024),
      metrics.resourceUsage.networkOut / (1024 * 1024)
    );
    totalCost += networkCost.in.totalCost + networkCost.out.totalCost;
    breakdown.push(networkCost.in, networkCost.out);

    // Aggregate by category
    const aggregated = this.aggregateBreakdown(breakdown);

    return {
      apiCalls: aggregated.apiCalls || 0,
      llmTokens: aggregated.llmTokens || 0,
      compute: aggregated.compute || 0,
      storage: aggregated.storage || 0,
      total: totalCost,
      breakdown: aggregated.breakdown,
    };
  }

  /**
   * Calculate cost for a node execution
   */
  calculateNodeCost(node: NodeExecutionMetric): ExecutionCost {
    const breakdown: CostBreakdownItem[] = [];
    let totalCost = 0;

    // API calls cost
    if (node.apiCalls) {
      const apiCost = this.calculateApiCallCost(node.apiCalls);
      totalCost += apiCost.totalCost;
      breakdown.push(apiCost);
    }

    // Compute cost
    const computeCost = this.calculateComputeCost(node.duration / 1000);
    totalCost += computeCost.totalCost;
    breakdown.push(computeCost);

    const aggregated = this.aggregateBreakdown(breakdown);

    return {
      apiCalls: aggregated.apiCalls || 0,
      llmTokens: aggregated.llmTokens || 0,
      compute: aggregated.compute || 0,
      storage: aggregated.storage || 0,
      total: totalCost,
      breakdown: aggregated.breakdown,
    };
  }

  /**
   * Calculate cost for specific node type with detailed data
   */
  calculateNodeTypeCost(nodeType: string, data: NodeCostData): ExecutionCost {
    const breakdown: CostBreakdownItem[] = [];
    let totalCost = 0;

    // API calls
    if (data.apiCalls) {
      const cost = this.calculateApiCallCost(data.apiCalls);
      totalCost += cost.totalCost;
      breakdown.push(cost);
    }

    // LLM tokens
    if (data.llmTokensInput || data.llmTokensOutput) {
      const cost = this.calculateLLMCost(
        data.llmTokensInput || 0,
        data.llmTokensOutput || 0
      );
      totalCost += cost.totalCost;
      breakdown.push(cost);
    }

    // Compute
    if (data.computeTime) {
      const cost = this.calculateComputeCost(data.computeTime);
      totalCost += cost.totalCost;
      breakdown.push(cost);
    }

    // Storage
    if (data.storageSize) {
      const cost = this.calculateStorageCost(data.storageSize);
      totalCost += cost.totalCost;
      breakdown.push(cost);
    }

    // Network
    if (data.networkIn || data.networkOut) {
      const cost = this.calculateNetworkCost(
        data.networkIn || 0,
        data.networkOut || 0
      );
      totalCost += cost.in.totalCost + cost.out.totalCost;
      breakdown.push(cost.in, cost.out);
    }

    const aggregated = this.aggregateBreakdown(breakdown);

    return {
      apiCalls: aggregated.apiCalls || 0,
      llmTokens: aggregated.llmTokens || 0,
      compute: aggregated.compute || 0,
      storage: aggregated.storage || 0,
      total: totalCost,
      breakdown: aggregated.breakdown,
    };
  }

  /**
   * Calculate API call cost
   */
  private calculateApiCallCost(calls: number): CostBreakdownItem {
    return {
      category: 'apiCalls',
      amount: calls,
      unit: 'calls',
      unitCost: this.config.apiCall,
      totalCost: calls * this.config.apiCall,
    };
  }

  /**
   * Calculate LLM cost
   */
  private calculateLLMCost(inputTokens: number, outputTokens: number): CostBreakdownItem {
    const inputCost = (inputTokens / 1000) * this.config.llmTokenInput;
    const outputCost = (outputTokens / 1000) * this.config.llmTokenOutput;

    return {
      category: 'llmTokens',
      amount: inputTokens + outputTokens,
      unit: 'tokens',
      unitCost: (inputCost + outputCost) / (inputTokens + outputTokens),
      totalCost: inputCost + outputCost,
    };
  }

  /**
   * Calculate compute cost
   */
  private calculateComputeCost(seconds: number): CostBreakdownItem {
    return {
      category: 'compute',
      amount: seconds,
      unit: 'seconds',
      unitCost: this.config.compute,
      totalCost: seconds * this.config.compute,
    };
  }

  /**
   * Calculate storage cost
   */
  private calculateStorageCost(megabytes: number): CostBreakdownItem {
    return {
      category: 'storage',
      amount: megabytes,
      unit: 'MB',
      unitCost: this.config.storage,
      totalCost: megabytes * this.config.storage,
    };
  }

  /**
   * Calculate network cost
   */
  private calculateNetworkCost(
    inMB: number,
    outMB: number
  ): {
    in: CostBreakdownItem;
    out: CostBreakdownItem;
  } {
    return {
      in: {
        category: 'network',
        subcategory: 'inbound',
        amount: inMB,
        unit: 'MB',
        unitCost: this.config.networkIn,
        totalCost: inMB * this.config.networkIn,
      },
      out: {
        category: 'network',
        subcategory: 'outbound',
        amount: outMB,
        unit: 'MB',
        unitCost: this.config.networkOut,
        totalCost: outMB * this.config.networkOut,
      },
    };
  }

  /**
   * Aggregate breakdown by category
   */
  private aggregateBreakdown(breakdown: CostBreakdownItem[]): {
    apiCalls: number;
    llmTokens: number;
    compute: number;
    storage: number;
    breakdown: CostBreakdownItem[];
  } {
    const aggregated: Record<string, number> = {};

    breakdown.forEach(item => {
      const key = item.subcategory
        ? `${item.category}.${item.subcategory}`
        : item.category;
      aggregated[key] = (aggregated[key] || 0) + item.totalCost;
    });

    return {
      apiCalls: aggregated.apiCalls || 0,
      llmTokens: aggregated.llmTokens || 0,
      compute: aggregated.compute || 0,
      storage: aggregated.storage || 0,
      breakdown,
    };
  }

  /**
   * Get cost for specific LLM model
   */
  getLLMModelCost(model: string): {
    inputTokenCost: number;
    outputTokenCost: number;
  } {
    const costs: Record<
      string,
      { inputTokenCost: number; outputTokenCost: number }
    > = {
      'gpt-4': { inputTokenCost: 0.03, outputTokenCost: 0.06 },
      'gpt-4-turbo': { inputTokenCost: 0.01, outputTokenCost: 0.03 },
      'gpt-3.5-turbo': { inputTokenCost: 0.0005, outputTokenCost: 0.0015 },
      'claude-3-opus': { inputTokenCost: 0.015, outputTokenCost: 0.075 },
      'claude-3-sonnet': { inputTokenCost: 0.003, outputTokenCost: 0.015 },
      'claude-3-haiku': { inputTokenCost: 0.00025, outputTokenCost: 0.00125 },
    };

    return (
      costs[model] || { inputTokenCost: 0.001, outputTokenCost: 0.002 }
    );
  }

  /**
   * Calculate potential savings by switching models
   */
  calculateModelSavings(
    currentModel: string,
    proposedModel: string,
    inputTokens: number,
    outputTokens: number
  ): {
    currentCost: number;
    proposedCost: number;
    savings: number;
    savingsPercentage: number;
  } {
    const currentCosts = this.getLLMModelCost(currentModel);
    const proposedCosts = this.getLLMModelCost(proposedModel);

    const currentCost =
      (inputTokens / 1000) * currentCosts.inputTokenCost +
      (outputTokens / 1000) * currentCosts.outputTokenCost;

    const proposedCost =
      (inputTokens / 1000) * proposedCosts.inputTokenCost +
      (outputTokens / 1000) * proposedCosts.outputTokenCost;

    const savings = currentCost - proposedCost;
    const savingsPercentage = currentCost > 0 ? (savings / currentCost) * 100 : 0;

    return {
      currentCost,
      proposedCost,
      savings,
      savingsPercentage,
    };
  }

  /**
   * Update cost configuration
   */
  updateConfig(config: Partial<CostConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): CostConfig {
    return { ...this.config };
  }
}

// Singleton instance with default config
export const costCalculator = new CostCalculator();

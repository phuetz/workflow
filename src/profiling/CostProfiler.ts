import { logger } from '../services/SimpleLogger';
/**
 * Cost Profiler
 *
 * Track and analyze costs for workflow executions:
 * - Per-execution cost breakdown
 * - API call costs
 * - LLM/AI costs
 * - Compute costs
 * - Storage costs
 * - Cost trends and forecasting
 * - Cost optimization recommendations
 *
 * Usage:
 * const profiler = CostProfiler.getInstance();
 * const cost = await profiler.calculateExecutionCost(executionId);
 */

export interface CostBreakdown {
  executionId: string;
  workflowId: string;
  timestamp: number;
  totalCost: number;
  breakdown: {
    api: CostItem[];
    llm: CostItem[];
    compute: CostItem[];
    storage: CostItem[];
    network: CostItem[];
    other: CostItem[];
  };
  duration: number;
  nodeCount: number;
  costPerNode: number;
  costPerSecond: number;
}

export interface CostItem {
  service: string;
  operation: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  metadata?: Record<string, any>;
}

export interface CostConfig {
  apiCosts: Record<string, number>; // Cost per API call
  llmCosts: Record<string, number>; // Cost per 1K tokens
  computeCosts: {
    perSecond: number;
    perGB: number;
  };
  storageCosts: {
    perGB: number;
  };
  networkCosts: {
    perGB: number;
  };
}

export interface CostReport {
  period: {
    start: number;
    end: number;
  };
  summary: {
    totalCost: number;
    executionCount: number;
    averageCostPerExecution: number;
    costByCategory: Record<string, number>;
    topCostDrivers: CostDriver[];
  };
  trends: {
    daily: CostTrend[];
    byWorkflow: WorkflowCost[];
  };
  forecast: {
    nextWeek: number;
    nextMonth: number;
    confidence: number;
  };
}

export interface CostDriver {
  service: string;
  totalCost: number;
  percentage: number;
  callCount: number;
  averageCost: number;
}

export interface CostTrend {
  date: string;
  cost: number;
  executionCount: number;
}

export interface WorkflowCost {
  workflowId: string;
  workflowName: string;
  executionCount: number;
  totalCost: number;
  averageCost: number;
}

export interface CostOptimization {
  type: 'api' | 'llm' | 'compute' | 'storage' | 'network';
  title: string;
  description: string;
  currentCost: number;
  potentialSavings: number;
  savingsPercentage: number;
  difficulty: 'easy' | 'medium' | 'hard';
  actions: string[];
}

export class CostProfiler {
  private static instance: CostProfiler;
  private costHistory: CostBreakdown[] = [];
  private config: CostConfig;
  private readonly MAX_HISTORY = 10000;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.loadHistory();
  }

  public static getInstance(): CostProfiler {
    if (!CostProfiler.instance) {
      CostProfiler.instance = new CostProfiler();
    }
    return CostProfiler.instance;
  }

  /**
   * Get default cost configuration
   */
  private getDefaultConfig(): CostConfig {
    return {
      apiCosts: {
        'http': 0.0001, // $0.0001 per call
        'slack': 0.0002,
        'email': 0.0001,
        'stripe': 0.0005,
        'salesforce': 0.001,
        'hubspot': 0.0008,
        'google-sheets': 0.0003,
        'airtable': 0.0004,
      },
      llmCosts: {
        'gpt-4': 0.03, // $0.03 per 1K tokens
        'gpt-3.5-turbo': 0.002,
        'claude-3-opus': 0.015,
        'claude-3-sonnet': 0.003,
        'gemini-pro': 0.00025,
      },
      computeCosts: {
        perSecond: 0.000001, // $0.000001 per second
        perGB: 0.0000001, // $0.0000001 per GB-second
      },
      storageCosts: {
        perGB: 0.00001, // $0.00001 per GB
      },
      networkCosts: {
        perGB: 0.00005, // $0.00005 per GB
      },
    };
  }

  /**
   * Update cost configuration
   */
  public updateConfig(config: Partial<CostConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      apiCosts: { ...this.config.apiCosts, ...config.apiCosts },
      llmCosts: { ...this.config.llmCosts, ...config.llmCosts },
    };
    this.saveConfig();
  }

  /**
   * Calculate cost for workflow execution
   */
  public calculateExecutionCost(
    executionId: string,
    workflowId: string,
    operations: ExecutionOperation[]
  ): CostBreakdown {
    const breakdown: CostBreakdown = {
      executionId,
      workflowId,
      timestamp: Date.now(),
      totalCost: 0,
      breakdown: {
        api: [],
        llm: [],
        compute: [],
        storage: [],
        network: [],
        other: [],
      },
      duration: 0,
      nodeCount: operations.length,
      costPerNode: 0,
      costPerSecond: 0,
    };

    let totalDuration = 0;

    // Calculate costs for each operation
    operations.forEach(op => {
      totalDuration += op.duration || 0;

      switch (op.type) {
        case 'api':
          this.addAPICost(breakdown, op);
          break;
        case 'llm':
          this.addLLMCost(breakdown, op);
          break;
        case 'compute':
          this.addComputeCost(breakdown, op);
          break;
        case 'storage':
          this.addStorageCost(breakdown, op);
          break;
        case 'network':
          this.addNetworkCost(breakdown, op);
          break;
        default:
          this.addOtherCost(breakdown, op);
      }
    });

    // Calculate total cost
    breakdown.totalCost = Object.values(breakdown.breakdown)
      .flatMap(items => items)
      .reduce((sum, item) => sum + item.totalCost, 0);

    breakdown.duration = totalDuration;
    breakdown.costPerNode = breakdown.nodeCount > 0 ? breakdown.totalCost / breakdown.nodeCount : 0;
    breakdown.costPerSecond = totalDuration > 0 ? breakdown.totalCost / (totalDuration / 1000) : 0;

    // Save to history
    this.costHistory.push(breakdown);
    if (this.costHistory.length > this.MAX_HISTORY) {
      this.costHistory = this.costHistory.slice(-this.MAX_HISTORY);
    }
    this.saveHistory();

    return breakdown;
  }

  /**
   * Add API call cost
   */
  private addAPICost(breakdown: CostBreakdown, op: ExecutionOperation): void {
    const service = op.service || 'http';
    const unitCost = this.config.apiCosts[service] || this.config.apiCosts['http'];
    const quantity = op.callCount || 1;

    breakdown.breakdown.api.push({
      service,
      operation: op.operation || 'request',
      quantity,
      unitCost,
      totalCost: quantity * unitCost,
      metadata: op.metadata,
    });
  }

  /**
   * Add LLM call cost
   */
  private addLLMCost(breakdown: CostBreakdown, op: ExecutionOperation): void {
    const model = op.model || 'gpt-3.5-turbo';
    const unitCost = this.config.llmCosts[model] || this.config.llmCosts['gpt-3.5-turbo'];
    const tokens = op.tokens || 0;
    const quantity = tokens / 1000; // Cost is per 1K tokens

    breakdown.breakdown.llm.push({
      service: model,
      operation: 'generate',
      quantity,
      unitCost,
      totalCost: quantity * unitCost,
      metadata: { tokens, ...op.metadata },
    });
  }

  /**
   * Add compute cost
   */
  private addComputeCost(breakdown: CostBreakdown, op: ExecutionOperation): void {
    const duration = (op.duration || 0) / 1000; // Convert to seconds
    const memory = op.memory || 0; // GB
    const computeCost = duration * this.config.computeCosts.perSecond;
    const memoryCost = duration * memory * this.config.computeCosts.perGB;

    breakdown.breakdown.compute.push({
      service: 'compute',
      operation: 'execution',
      quantity: duration,
      unitCost: this.config.computeCosts.perSecond,
      totalCost: computeCost + memoryCost,
      metadata: { duration, memory, ...op.metadata },
    });
  }

  /**
   * Add storage cost
   */
  private addStorageCost(breakdown: CostBreakdown, op: ExecutionOperation): void {
    const sizeGB = (op.size || 0) / (1024 * 1024 * 1024); // Convert bytes to GB

    breakdown.breakdown.storage.push({
      service: 'storage',
      operation: op.operation || 'store',
      quantity: sizeGB,
      unitCost: this.config.storageCosts.perGB,
      totalCost: sizeGB * this.config.storageCosts.perGB,
      metadata: op.metadata,
    });
  }

  /**
   * Add network cost
   */
  private addNetworkCost(breakdown: CostBreakdown, op: ExecutionOperation): void {
    const sizeGB = (op.size || 0) / (1024 * 1024 * 1024); // Convert bytes to GB

    breakdown.breakdown.network.push({
      service: 'network',
      operation: op.operation || 'transfer',
      quantity: sizeGB,
      unitCost: this.config.networkCosts.perGB,
      totalCost: sizeGB * this.config.networkCosts.perGB,
      metadata: op.metadata,
    });
  }

  /**
   * Add other costs
   */
  private addOtherCost(breakdown: CostBreakdown, op: ExecutionOperation): void {
    breakdown.breakdown.other.push({
      service: op.service || 'unknown',
      operation: op.operation || 'unknown',
      quantity: 1,
      unitCost: op.cost || 0,
      totalCost: op.cost || 0,
      metadata: op.metadata,
    });
  }

  /**
   * Generate cost report
   */
  public generateReport(days: number = 7): CostReport {
    const endTime = Date.now();
    const startTime = endTime - (days * 24 * 60 * 60 * 1000);

    const relevantCosts = this.costHistory.filter(
      c => c.timestamp >= startTime && c.timestamp <= endTime
    );

    // Calculate summary
    const totalCost = relevantCosts.reduce((sum, c) => sum + c.totalCost, 0);
    const executionCount = relevantCosts.length;
    const averageCostPerExecution = executionCount > 0 ? totalCost / executionCount : 0;

    // Cost by category
    const costByCategory: Record<string, number> = {};
    relevantCosts.forEach(cost => {
      Object.entries(cost.breakdown).forEach(([category, items]) => {
        const categoryCost = items.reduce((sum, item) => sum + item.totalCost, 0);
        costByCategory[category] = (costByCategory[category] || 0) + categoryCost;
      });
    });

    // Top cost drivers
    const driverMap = new Map<string, { cost: number; count: number }>();
    relevantCosts.forEach(cost => {
      Object.values(cost.breakdown).forEach(items => {
        items.forEach(item => {
          const existing = driverMap.get(item.service) || { cost: 0, count: 0 };
          existing.cost += item.totalCost;
          existing.count += item.quantity;
          driverMap.set(item.service, existing);
        });
      });
    });

    const topCostDrivers = Array.from(driverMap.entries())
      .map(([service, data]) => ({
        service,
        totalCost: data.cost,
        percentage: (data.cost / totalCost) * 100,
        callCount: data.count,
        averageCost: data.cost / data.count,
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);

    // Daily trends
    const dailyMap = new Map<string, { cost: number; count: number }>();
    relevantCosts.forEach(cost => {
      const date = new Date(cost.timestamp).toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { cost: 0, count: 0 };
      existing.cost += cost.totalCost;
      existing.count++;
      dailyMap.set(date, existing);
    });

    const daily = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        cost: data.cost,
        executionCount: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // By workflow
    const workflowMap = new Map<string, { cost: number; count: number }>();
    relevantCosts.forEach(cost => {
      const existing = workflowMap.get(cost.workflowId) || { cost: 0, count: 0 };
      existing.cost += cost.totalCost;
      existing.count++;
      workflowMap.set(cost.workflowId, existing);
    });

    const byWorkflow = Array.from(workflowMap.entries())
      .map(([workflowId, data]) => ({
        workflowId,
        workflowName: `Workflow ${workflowId}`,
        executionCount: data.count,
        totalCost: data.cost,
        averageCost: data.cost / data.count,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    // Forecast
    const forecast = this.forecastCosts(daily);

    return {
      period: { start: startTime, end: endTime },
      summary: {
        totalCost,
        executionCount,
        averageCostPerExecution,
        costByCategory,
        topCostDrivers,
      },
      trends: {
        daily,
        byWorkflow,
      },
      forecast,
    };
  }

  /**
   * Forecast future costs
   */
  private forecastCosts(daily: CostTrend[]): {
    nextWeek: number;
    nextMonth: number;
    confidence: number;
  } {
    if (daily.length < 7) {
      return { nextWeek: 0, nextMonth: 0, confidence: 0 };
    }

    // Simple linear regression
    const values = daily.map(d => d.cost);
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;

    // Weekly average
    const weeklyAverage = mean * 7;
    const monthlyAverage = mean * 30;

    // Confidence based on variance
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / mean;
    const confidence = Math.max(0, Math.min(1, 1 - coefficientOfVariation));

    return {
      nextWeek: weeklyAverage,
      nextMonth: monthlyAverage,
      confidence,
    };
  }

  /**
   * Get cost optimization suggestions
   */
  public getOptimizations(days: number = 7): CostOptimization[] {
    const report = this.generateReport(days);
    const optimizations: CostOptimization[] = [];

    // API cost optimizations
    const apiCost = report.summary.costByCategory['api'] || 0;
    if (apiCost > report.summary.totalCost * 0.3) {
      optimizations.push({
        type: 'api',
        title: 'Reduce API Call Frequency',
        description: 'API calls account for a significant portion of costs',
        currentCost: apiCost,
        potentialSavings: apiCost * 0.7,
        savingsPercentage: 70,
        difficulty: 'easy',
        actions: [
          'Enable result caching',
          'Batch API requests',
          'Use webhooks instead of polling',
          'Implement request debouncing',
        ],
      });
    }

    // LLM cost optimizations
    const llmCost = report.summary.costByCategory['llm'] || 0;
    if (llmCost > report.summary.totalCost * 0.2) {
      optimizations.push({
        type: 'llm',
        title: 'Optimize LLM Usage',
        description: 'LLM costs are high, consider optimization strategies',
        currentCost: llmCost,
        potentialSavings: llmCost * 0.5,
        savingsPercentage: 50,
        difficulty: 'medium',
        actions: [
          'Use smaller models for simple tasks',
          'Cache LLM responses',
          'Reduce prompt sizes',
          'Implement prompt templates',
        ],
      });
    }

    // Compute cost optimizations
    const computeCost = report.summary.costByCategory['compute'] || 0;
    if (computeCost > report.summary.totalCost * 0.2) {
      optimizations.push({
        type: 'compute',
        title: 'Optimize Compute Usage',
        description: 'Reduce execution time and memory usage',
        currentCost: computeCost,
        potentialSavings: computeCost * 0.4,
        savingsPercentage: 40,
        difficulty: 'medium',
        actions: [
          'Optimize workflow algorithms',
          'Enable parallel execution',
          'Reduce memory allocations',
          'Use more efficient data structures',
        ],
      });
    }

    return optimizations.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  /**
   * Get cost history
   */
  public getHistory(limit: number = 100): CostBreakdown[] {
    return this.costHistory.slice(-limit).reverse();
  }

  /**
   * Save configuration
   */
  private saveConfig(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('costProfiler.config', JSON.stringify(this.config));
      } catch (error) {
        logger.warn('Failed to save cost config:', error);
      }
    }
  }

  /**
   * Save cost history
   */
  private saveHistory(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          'costProfiler.history',
          JSON.stringify(this.costHistory.slice(-1000))
        );
      } catch (error) {
        logger.warn('Failed to save cost history:', error);
      }
    }
  }

  /**
   * Load cost history
   */
  private loadHistory(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('costProfiler.history');
        if (saved) {
          this.costHistory = JSON.parse(saved);
        }

        const savedConfig = localStorage.getItem('costProfiler.config');
        if (savedConfig) {
          this.config = { ...this.config, ...JSON.parse(savedConfig) };
        }
      } catch (error) {
        logger.warn('Failed to load cost history:', error);
      }
    }
  }

  /**
   * Clear history
   */
  public clearHistory(): void {
    this.costHistory = [];
    this.saveHistory();
  }
}

// Export singleton instance
export const costProfiler = CostProfiler.getInstance();

// Types for execution operations
export interface ExecutionOperation {
  type: 'api' | 'llm' | 'compute' | 'storage' | 'network' | 'other';
  service?: string;
  operation?: string;
  duration?: number;
  callCount?: number;
  tokens?: number;
  model?: string;
  memory?: number;
  size?: number;
  cost?: number;
  metadata?: Record<string, any>;
}

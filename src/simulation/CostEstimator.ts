/**
 * Cost Estimator - Accurate Cost Prediction
 * Estimates costs for workflow execution before running
 */

import { WorkflowNode } from '../types/workflow';
import { NodeCostModel, NodeCostDetails, CostBreakdown } from '../types/simulation';
import { logger } from '../services/SimpleLogger';

/**
 * Cost estimator for workflow simulation
 */
export class CostEstimator {
  private costModels: Map<string, NodeCostModel> = new Map();
  private historicalCosts: Map<string, number[]> = new Map();

  constructor() {
    this.initializeCostModels();
  }

  /**
   * Initialize cost models for different node types
   */
  private initializeCostModels(): void {
    // API Services
    this.addCostModel({
      nodeType: 'httpRequest',
      fixedCost: 0.0001,
      variableCosts: {
        perRequest: 0.0001,
      },
    });

    // LLM Services
    this.addCostModel({
      nodeType: 'openai',
      fixedCost: 0,
      variableCosts: {
        perToken: 0.00003, // $0.03 per 1K tokens
      },
      minimumCost: 0.001,
    });

    this.addCostModel({
      nodeType: 'anthropic',
      fixedCost: 0,
      variableCosts: {
        perToken: 0.000015, // $0.015 per 1K tokens
      },
      minimumCost: 0.001,
    });

    this.addCostModel({
      nodeType: 'llm',
      fixedCost: 0,
      variableCosts: {
        perToken: 0.00002, // Generic LLM cost
      },
    });

    // Communication
    this.addCostModel({
      nodeType: 'email',
      fixedCost: 0.0001,
      variableCosts: {},
    });

    this.addCostModel({
      nodeType: 'gmail',
      fixedCost: 0.0001,
      variableCosts: {},
    });

    this.addCostModel({
      nodeType: 'slack',
      fixedCost: 0.0002,
      variableCosts: {
        perRequest: 0.0001,
      },
    });

    this.addCostModel({
      nodeType: 'discord',
      fixedCost: 0.0001,
      variableCosts: {},
    });

    this.addCostModel({
      nodeType: 'teams',
      fixedCost: 0.0002,
      variableCosts: {},
    });

    this.addCostModel({
      nodeType: 'twilio',
      fixedCost: 0.0075,
      variableCosts: {
        perRequest: 0.0075, // SMS cost
      },
    });

    this.addCostModel({
      nodeType: 'whatsapp',
      fixedCost: 0.005,
      variableCosts: {},
    });

    // Databases
    this.addCostModel({
      nodeType: 'mysql',
      fixedCost: 0.0001,
      variableCosts: {
        perSecond: 0.00001,
        perRecord: 0.000001,
      },
    });

    this.addCostModel({
      nodeType: 'postgres',
      fixedCost: 0.0001,
      variableCosts: {
        perSecond: 0.00001,
        perRecord: 0.000001,
      },
    });

    this.addCostModel({
      nodeType: 'mongodb',
      fixedCost: 0.0001,
      variableCosts: {
        perRequest: 0.0001,
        perRecord: 0.000001,
      },
    });

    this.addCostModel({
      nodeType: 'redis',
      fixedCost: 0.00005,
      variableCosts: {
        perRequest: 0.00001,
      },
    });

    this.addCostModel({
      nodeType: 'elasticsearch',
      fixedCost: 0.0002,
      variableCosts: {
        perRequest: 0.0001,
        perRecord: 0.000002,
      },
    });

    // Cloud Storage
    this.addCostModel({
      nodeType: 'aws_s3',
      fixedCost: 0,
      variableCosts: {
        perRequest: 0.0004,
        perGB: 0.023,
      },
    });

    this.addCostModel({
      nodeType: 'azure_blob',
      fixedCost: 0,
      variableCosts: {
        perRequest: 0.0004,
        perGB: 0.02,
      },
    });

    this.addCostModel({
      nodeType: 'gcp_storage',
      fixedCost: 0,
      variableCosts: {
        perRequest: 0.0004,
        perGB: 0.02,
      },
    });

    this.addCostModel({
      nodeType: 'google_drive',
      fixedCost: 0.0001,
      variableCosts: {
        perGB: 0.01,
      },
    });

    this.addCostModel({
      nodeType: 'dropbox',
      fixedCost: 0.0001,
      variableCosts: {
        perGB: 0.01,
      },
    });

    // Cloud Functions
    this.addCostModel({
      nodeType: 'aws_lambda',
      fixedCost: 0,
      variableCosts: {
        perRequest: 0.0000002,
        perSecond: 0.0000166667,
      },
    });

    this.addCostModel({
      nodeType: 'azure_functions',
      fixedCost: 0,
      variableCosts: {
        perRequest: 0.0000002,
        perSecond: 0.000016,
      },
    });

    this.addCostModel({
      nodeType: 'gcp_functions',
      fixedCost: 0,
      variableCosts: {
        perRequest: 0.0000004,
        perSecond: 0.0000024,
      },
    });

    // Business Apps
    this.addCostModel({
      nodeType: 'salesforce',
      fixedCost: 0.001,
      variableCosts: {
        perRequest: 0.0005,
      },
    });

    this.addCostModel({
      nodeType: 'hubspot',
      fixedCost: 0.0008,
      variableCosts: {
        perRequest: 0.0004,
      },
    });

    this.addCostModel({
      nodeType: 'stripe',
      fixedCost: 0.0005,
      variableCosts: {
        perRequest: 0.0003,
      },
    });

    this.addCostModel({
      nodeType: 'paypal',
      fixedCost: 0.0005,
      variableCosts: {},
    });

    this.addCostModel({
      nodeType: 'shopify',
      fixedCost: 0.0003,
      variableCosts: {
        perRequest: 0.0002,
      },
    });

    // Productivity
    this.addCostModel({
      nodeType: 'google_sheets',
      fixedCost: 0.0003,
      variableCosts: {
        perRequest: 0.0001,
        perRecord: 0.000001,
      },
    });

    this.addCostModel({
      nodeType: 'airtable',
      fixedCost: 0.0004,
      variableCosts: {
        perRequest: 0.0002,
        perRecord: 0.000002,
      },
    });

    this.addCostModel({
      nodeType: 'notion',
      fixedCost: 0.0003,
      variableCosts: {
        perRequest: 0.0001,
      },
    });

    // Project Management
    this.addCostModel({
      nodeType: 'jira',
      fixedCost: 0.0005,
      variableCosts: {
        perRequest: 0.0002,
      },
    });

    this.addCostModel({
      nodeType: 'asana',
      fixedCost: 0.0004,
      variableCosts: {},
    });

    this.addCostModel({
      nodeType: 'trello',
      fixedCost: 0.0003,
      variableCosts: {},
    });

    // Data Processing (minimal cost)
    const processingNodes = [
      'transform',
      'filter',
      'aggregate',
      'sort',
      'merge',
      'split',
      'code',
    ];
    processingNodes.forEach(type => {
      this.addCostModel({
        nodeType: type,
        fixedCost: 0.00001,
        variableCosts: {
          perSecond: 0.000001,
        },
      });
    });

    // Control Flow (negligible cost)
    const controlNodes = ['if', 'switch', 'loop', 'delay'];
    controlNodes.forEach(type => {
      this.addCostModel({
        nodeType: type,
        fixedCost: 0.000001,
        variableCosts: {},
      });
    });
  }

  /**
   * Add or update a cost model
   */
  addCostModel(model: NodeCostModel): void {
    this.costModels.set(model.nodeType, model);
  }

  /**
   * Estimate cost for a single node
   */
  estimateNodeCost(nodeType: string, config: Record<string, unknown>): number {
    const model = this.costModels.get(nodeType);

    if (!model) {
      logger.debug(`No cost model for node type: ${nodeType}, using default`);
      return 0.0001; // Default minimal cost
    }

    let totalCost = model.fixedCost;

    // Add variable costs based on configuration
    if (model.variableCosts.perRequest) {
      const requests = this.estimateRequests(nodeType, config);
      totalCost += model.variableCosts.perRequest * requests;
    }

    if (model.variableCosts.perToken) {
      const tokens = this.estimateTokens(nodeType, config);
      totalCost += model.variableCosts.perToken * tokens;
    }

    if (model.variableCosts.perSecond) {
      const seconds = this.estimateSeconds(nodeType, config);
      totalCost += model.variableCosts.perSecond * seconds;
    }

    if (model.variableCosts.perGB) {
      const gb = this.estimateDataGB(nodeType, config);
      totalCost += model.variableCosts.perGB * gb;
    }

    if (model.variableCosts.perKB) {
      const kb = this.estimateDataKB(nodeType, config);
      totalCost += model.variableCosts.perKB * kb;
    }

    if (model.variableCosts.perRecord) {
      const records = this.estimateRecords(nodeType, config);
      totalCost += model.variableCosts.perRecord * records;
    }

    // Apply minimum cost if specified
    if (model.minimumCost && totalCost < model.minimumCost) {
      totalCost = model.minimumCost;
    }

    // Apply maximum cost if specified
    if (model.maximumCost && totalCost > model.maximumCost) {
      totalCost = model.maximumCost;
    }

    // Track historical cost
    this.trackHistoricalCost(nodeType, totalCost);

    return totalCost;
  }

  /**
   * Estimate number of requests
   */
  private estimateRequests(nodeType: string, config: Record<string, unknown>): number {
    // Most nodes make 1 request
    return 1;
  }

  /**
   * Estimate number of tokens for LLM nodes
   */
  private estimateTokens(nodeType: string, config: Record<string, unknown>): number {
    if (['openai', 'anthropic', 'llm'].includes(nodeType)) {
      const prompt = config.prompt as string || '';
      const maxTokens = (config.maxTokens as number) || 1000;

      // Rough estimate: 4 characters per token
      const promptTokens = Math.ceil(prompt.length / 4);
      const completionTokens = maxTokens;

      return promptTokens + completionTokens;
    }
    return 0;
  }

  /**
   * Estimate execution time in seconds
   */
  private estimateSeconds(nodeType: string, config: Record<string, unknown>): number {
    const estimates: Record<string, number> = {
      code: 1,
      python: 2,
      javascript: 1,
      transform: 0.5,
      aggregate: 1,
      aws_lambda: 1,
      azure_functions: 1,
      gcp_functions: 1,
    };

    return estimates[nodeType] || 0.5;
  }

  /**
   * Estimate data size in GB
   */
  private estimateDataGB(nodeType: string, config: Record<string, unknown>): number {
    // Estimate based on expected data size
    if (['aws_s3', 'azure_blob', 'gcp_storage'].includes(nodeType)) {
      const fileSize = (config.fileSize as number) || 0;
      return fileSize / (1024 * 1024 * 1024); // Convert bytes to GB
    }
    return 0.001; // 1MB default
  }

  /**
   * Estimate data size in KB
   */
  private estimateDataKB(nodeType: string, config: Record<string, unknown>): number {
    return this.estimateDataGB(nodeType, config) * 1024 * 1024;
  }

  /**
   * Estimate number of records processed
   */
  private estimateRecords(nodeType: string, config: Record<string, unknown>): number {
    const recordCount = (config.recordCount as number) || (config.limit as number) || 100;
    return recordCount;
  }

  /**
   * Get detailed cost breakdown for a node
   */
  getNodeCostDetails(
    nodeId: string,
    nodeType: string,
    config: Record<string, unknown>
  ): NodeCostDetails {
    const model = this.costModels.get(nodeType);
    const totalCost = this.estimateNodeCost(nodeType, config);

    const breakdown: CostBreakdown = {
      apiCalls: 0,
      computeTime: 0,
      storage: 0,
      network: 0,
      llmTokens: 0,
      total: totalCost,
      currency: 'USD',
    };

    // Categorize costs
    if (['openai', 'anthropic', 'llm'].includes(nodeType)) {
      breakdown.llmTokens = totalCost;
    } else if (['aws_s3', 'azure_blob', 'gcp_storage'].includes(nodeType)) {
      breakdown.storage = totalCost;
    } else if (['code', 'python', 'javascript', 'transform'].includes(nodeType)) {
      breakdown.computeTime = totalCost;
    } else {
      breakdown.apiCalls = totalCost;
    }

    return {
      nodeId,
      nodeType,
      breakdown,
      unitCosts: model?.variableCosts || {},
    };
  }

  /**
   * Estimate total workflow cost
   */
  estimateWorkflowCost(nodes: WorkflowNode[]): CostBreakdown {
    const breakdown: CostBreakdown = {
      apiCalls: 0,
      computeTime: 0,
      storage: 0,
      network: 0,
      llmTokens: 0,
      total: 0,
      currency: 'USD',
    };

    nodes.forEach(node => {
      const details = this.getNodeCostDetails(
        node.id,
        node.type,
        node.data.config || {}
      );

      breakdown.apiCalls += details.breakdown.apiCalls;
      breakdown.computeTime += details.breakdown.computeTime;
      breakdown.storage += details.breakdown.storage;
      breakdown.network += details.breakdown.network;
      breakdown.llmTokens += details.breakdown.llmTokens;
    });

    breakdown.total =
      breakdown.apiCalls +
      breakdown.computeTime +
      breakdown.storage +
      breakdown.network +
      breakdown.llmTokens;

    return breakdown;
  }

  /**
   * Estimate monthly cost based on execution frequency
   */
  estimateMonthlyCost(
    perExecutionCost: number,
    executionsPerDay: number
  ): {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  } {
    const daily = perExecutionCost * executionsPerDay;
    const weekly = daily * 7;
    const monthly = daily * 30;
    const yearly = daily * 365;

    return { daily, weekly, monthly, yearly };
  }

  /**
   * Compare cost with budget
   */
  compareToBudget(
    actualCost: number,
    budgetLimit: number
  ): {
    withinBudget: boolean;
    percentage: number;
    remaining: number;
    exceeded: number;
  } {
    const percentage = (actualCost / budgetLimit) * 100;
    const remaining = Math.max(0, budgetLimit - actualCost);
    const exceeded = Math.max(0, actualCost - budgetLimit);

    return {
      withinBudget: actualCost <= budgetLimit,
      percentage,
      remaining,
      exceeded,
    };
  }

  /**
   * Track historical cost for accuracy improvement
   */
  private trackHistoricalCost(nodeType: string, cost: number): void {
    const history = this.historicalCosts.get(nodeType) || [];
    history.push(cost);

    // Keep last 100 costs
    if (history.length > 100) {
      history.shift();
    }

    this.historicalCosts.set(nodeType, history);
  }

  /**
   * Get average historical cost
   */
  getAverageHistoricalCost(nodeType: string): number | null {
    const history = this.historicalCosts.get(nodeType);
    if (!history || history.length === 0) return null;

    const sum = history.reduce((a, b) => a + b, 0);
    return sum / history.length;
  }

  /**
   * Get cost optimization suggestions
   */
  getCostOptimizationSuggestions(nodes: WorkflowNode[]): {
    nodeId: string;
    nodeType: string;
    currentCost: number;
    suggestion: string;
    potentialSavings: number;
  }[] {
    const suggestions: {
      nodeId: string;
      nodeType: string;
      currentCost: number;
      suggestion: string;
      potentialSavings: number;
    }[] = [];

    nodes.forEach(node => {
      const cost = this.estimateNodeCost(node.type, node.data.config || {});

      // High-cost LLM nodes
      if (['openai', 'anthropic'].includes(node.type) && cost > 0.01) {
        suggestions.push({
          nodeId: node.id,
          nodeType: node.type,
          currentCost: cost,
          suggestion: 'Consider using a smaller model or caching responses',
          potentialSavings: cost * 0.5,
        });
      }

      // Frequent API calls
      if (node.type === 'httpRequest' && (node.data.config as any)?.loop) {
        suggestions.push({
          nodeId: node.id,
          nodeType: node.type,
          currentCost: cost,
          suggestion: 'Batch API requests to reduce call frequency',
          potentialSavings: cost * 0.3,
        });
      }

      // Storage operations
      if (['aws_s3', 'azure_blob'].includes(node.type)) {
        suggestions.push({
          nodeId: node.id,
          nodeType: node.type,
          currentCost: cost,
          suggestion: 'Use compression to reduce storage costs',
          potentialSavings: cost * 0.2,
        });
      }
    });

    return suggestions.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  /**
   * Forecast cost trends
   */
  forecastCostTrend(
    historicalCosts: number[],
    periodsAhead: number = 7
  ): {
    period: number;
    estimated: number;
    lower: number;
    upper: number;
  }[] {
    if (historicalCosts.length < 7) {
      return [];
    }

    // Simple moving average forecast
    const windowSize = Math.min(7, historicalCosts.length);
    const recentCosts = historicalCosts.slice(-windowSize);
    const average = recentCosts.reduce((a, b) => a + b, 0) / recentCosts.length;

    // Calculate variance for confidence interval
    const variance =
      recentCosts.reduce((sum, cost) => sum + Math.pow(cost - average, 2), 0) /
      recentCosts.length;
    const stdDev = Math.sqrt(variance);

    const forecast: {
      period: number;
      estimated: number;
      lower: number;
      upper: number;
    }[] = [];

    for (let i = 1; i <= periodsAhead; i++) {
      forecast.push({
        period: i,
        estimated: average,
        lower: Math.max(0, average - stdDev * 1.96), // 95% CI
        upper: average + stdDev * 1.96,
      });
    }

    return forecast;
  }

  /**
   * Get all cost models
   */
  getAllCostModels(): Map<string, NodeCostModel> {
    return this.costModels;
  }

  /**
   * Export cost models as JSON
   */
  exportCostModels(): Record<string, NodeCostModel> {
    const models: Record<string, NodeCostModel> = {};
    this.costModels.forEach((model, type) => {
      models[type] = model;
    });
    return models;
  }

  /**
   * Import cost models from JSON
   */
  importCostModels(models: Record<string, NodeCostModel>): void {
    Object.entries(models).forEach(([type, model]) => {
      this.costModels.set(type, model);
    });
  }
}

/**
 * Predictive Analytics Engine
 *
 * Provides comprehensive predictive analytics for workflows:
 * - Execution time prediction with confidence intervals
 * - Failure probability prediction
 * - Resource usage prediction (CPU, memory)
 * - Cost forecasting
 * - Trend analysis and forecasting
 * - Historical data analysis
 * - Performance insights
 *
 * @module PredictiveAnalytics
 */

import {
  MLModelManager,
  WorkflowExecutionData,
  PredictionResult,
  FeatureExtractor,
} from './MLModels';
import { mean, standardDeviation, median, quantile } from 'simple-statistics';
import { logger } from '../services/LoggingService';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface TimeSeriesDataPoint {
  timestamp: number;
  value: number;
  workflowId?: string;
}

export interface TrendForecast {
  predictions: Array<{
    timestamp: number;
    value: number;
    lower: number;
    upper: number;
  }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendStrength: number; // 0-1
  seasonality?: {
    detected: boolean;
    period?: number;
    strength?: number;
  };
}

export interface ResourcePrediction {
  cpu: {
    average: number;
    peak: number;
    confidence: number;
  };
  memory: {
    average: number;
    peak: number;
    confidence: number;
  };
  network: {
    bandwidth: number;
    requests: number;
  };
  storage: {
    reads: number;
    writes: number;
  };
}

export interface PerformanceInsight {
  type: 'bottleneck' | 'optimization' | 'warning' | 'trend';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  expectedValue?: number;
  impact: string;
  recommendation: string;
  confidence: number;
}

export interface HistoricalAnalysis {
  totalExecutions: number;
  successRate: number;
  averageDuration: number;
  medianDuration: number;
  p95Duration: number;
  p99Duration: number;
  failureRate: number;
  averageCost: number;
  totalCost: number;
  trends: {
    duration: 'improving' | 'degrading' | 'stable';
    successRate: 'improving' | 'degrading' | 'stable';
    cost: 'improving' | 'degrading' | 'stable';
  };
  timeDistribution: {
    hour: Record<number, number>;
    dayOfWeek: Record<number, number>;
  };
  insights: PerformanceInsight[];
}

export interface PredictionBundle {
  executionTime: PredictionResult;
  failureProbability: PredictionResult;
  cost: PredictionResult;
  resources: ResourcePrediction;
  insights: PerformanceInsight[];
  confidence: number;
  timestamp: number;
}

// ============================================================================
// Predictive Analytics Engine
// ============================================================================

export class PredictiveAnalyticsEngine {
  private modelManager: MLModelManager;
  private historicalData: WorkflowExecutionData[] = [];
  private isInitialized = false;

  constructor() {
    this.modelManager = new MLModelManager();
  }

  /**
   * Initialize the engine with historical data
   */
  async initialize(data: WorkflowExecutionData[]): Promise<void> {
    logger.debug(`Initializing Predictive Analytics Engine with ${data.length} samples...`);

    if (data.length < 10) {
      throw new Error('Insufficient data for training. Need at least 10 samples.');
    }

    this.historicalData = data;

    // Train all models
    await this.modelManager.trainAll(data);

    this.isInitialized = true;
    logger.debug('Predictive Analytics Engine initialized successfully');
  }

  /**
   * Get comprehensive predictions for a workflow
   */
  async predict(workflowData: Partial<WorkflowExecutionData>): Promise<PredictionBundle> {
    if (!this.isInitialized) {
      throw new Error('Engine not initialized. Call initialize() first.');
    }

    // Get ML predictions
    const predictions = await this.modelManager.predictAll(workflowData);

    // Predict resource usage
    const resources = this.predictResourceUsage(workflowData);

    // Generate insights
    const insights = this.generateInsights(workflowData, predictions, resources);

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence([
      predictions.executionTime.confidence,
      predictions.failureProbability.confidence,
      predictions.cost.confidence,
    ]);

    return {
      executionTime: predictions.executionTime,
      failureProbability: predictions.failureProbability,
      cost: predictions.cost,
      resources,
      insights,
      confidence,
      timestamp: Date.now(),
    };
  }

  /**
   * Predict resource usage based on workflow characteristics
   */
  private predictResourceUsage(data: Partial<WorkflowExecutionData>): ResourcePrediction {
    const nodeCount = data.nodeCount || 1;
    const complexity = data.complexity || FeatureExtractor.calculateComplexity(data);
    const networkCalls = data.networkCalls || 0;
    const dbQueries = data.dbQueries || 0;

    // Simple heuristic-based prediction (can be replaced with ML model)
    const baseCpu = 5; // 5% base CPU
    const cpuPerNode = 2; // 2% per node
    const cpuPerComplexity = 0.5; // 0.5% per complexity point

    const avgCpu = Math.min(100, baseCpu + nodeCount * cpuPerNode + complexity * cpuPerComplexity);
    const peakCpu = Math.min(100, avgCpu * 1.5);

    const baseMemory = 50; // 50MB base
    const memoryPerNode = 10; // 10MB per node
    const memoryPerComplexity = 2; // 2MB per complexity point

    const avgMemory = baseMemory + nodeCount * memoryPerNode + complexity * memoryPerComplexity;
    const peakMemory = avgMemory * 1.3;

    const bandwidth = networkCalls * 0.5; // 0.5 MB per network call
    const storageReads = dbQueries * 0.2; // 0.2 MB per query
    const storageWrites = dbQueries * 0.1; // 0.1 MB per query

    return {
      cpu: {
        average: avgCpu,
        peak: peakCpu,
        confidence: 0.7,
      },
      memory: {
        average: avgMemory,
        peak: peakMemory,
        confidence: 0.7,
      },
      network: {
        bandwidth,
        requests: networkCalls,
      },
      storage: {
        reads: storageReads,
        writes: storageWrites,
      },
    };
  }

  /**
   * Generate performance insights
   */
  private generateInsights(
    workflowData: Partial<WorkflowExecutionData>,
    predictions: {
      executionTime: PredictionResult;
      failureProbability: PredictionResult;
      cost: PredictionResult;
    },
    resources: ResourcePrediction
  ): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    // Check for high failure probability
    if (predictions.failureProbability.value > 0.3) {
      insights.push({
        type: 'warning',
        severity: predictions.failureProbability.value > 0.5 ? 'high' : 'medium',
        title: 'High Failure Risk Detected',
        description: `This workflow has a ${(predictions.failureProbability.value * 100).toFixed(1)}% probability of failure based on its characteristics.`,
        metric: 'failure_probability',
        currentValue: predictions.failureProbability.value,
        impact: 'Workflow execution may fail, causing delays and additional costs',
        recommendation: 'Review error handling, add retries, or simplify workflow complexity',
        confidence: predictions.failureProbability.confidence,
      });
    }

    // Check for long execution time
    const avgExecutionTime =
      this.historicalData.length > 0
        ? mean(this.historicalData.map((d) => d.duration))
        : 60000;

    if (predictions.executionTime.value > avgExecutionTime * 1.5) {
      insights.push({
        type: 'bottleneck',
        severity: 'medium',
        title: 'Extended Execution Time Expected',
        description: `Predicted execution time (${(predictions.executionTime.value / 1000).toFixed(1)}s) is 50% longer than average.`,
        metric: 'execution_time',
        currentValue: predictions.executionTime.value,
        expectedValue: avgExecutionTime,
        impact: 'Slower workflow execution may impact user experience',
        recommendation: 'Consider optimizing node logic or enabling parallel execution',
        confidence: predictions.executionTime.confidence,
      });
    }

    // Check for high resource usage
    if (resources.cpu.peak > 80) {
      insights.push({
        type: 'warning',
        severity: 'high',
        title: 'High CPU Usage Expected',
        description: `Peak CPU usage is predicted to reach ${resources.cpu.peak.toFixed(1)}%`,
        metric: 'cpu_usage',
        currentValue: resources.cpu.peak,
        impact: 'High CPU usage may slow down other workflows',
        recommendation: 'Consider spreading workload across multiple executions',
        confidence: resources.cpu.confidence,
      });
    }

    if (resources.memory.peak > 500) {
      insights.push({
        type: 'warning',
        severity: 'medium',
        title: 'High Memory Usage Expected',
        description: `Peak memory usage is predicted to reach ${resources.memory.peak.toFixed(0)}MB`,
        metric: 'memory_usage',
        currentValue: resources.memory.peak,
        impact: 'High memory usage may cause out-of-memory errors',
        recommendation: 'Optimize data processing or use streaming',
        confidence: resources.memory.confidence,
      });
    }

    // Check for high cost
    const avgCost =
      this.historicalData.length > 0 ? mean(this.historicalData.map((d) => d.cost)) : 0.1;

    if (predictions.cost.value > avgCost * 2) {
      insights.push({
        type: 'warning',
        severity: 'medium',
        title: 'High Execution Cost',
        description: `Predicted cost ($${predictions.cost.value.toFixed(4)}) is significantly higher than average ($${avgCost.toFixed(4)})`,
        metric: 'cost',
        currentValue: predictions.cost.value,
        expectedValue: avgCost,
        impact: 'Higher costs may impact budget',
        recommendation: 'Review resource-intensive nodes and optimize API calls',
        confidence: predictions.cost.confidence,
      });
    }

    // Complexity insights
    const complexity = workflowData.complexity || FeatureExtractor.calculateComplexity(workflowData);
    if (complexity > 50) {
      insights.push({
        type: 'optimization',
        severity: 'low',
        title: 'High Workflow Complexity',
        description: `Workflow complexity score is ${complexity.toFixed(1)}, which may impact maintainability`,
        metric: 'complexity',
        currentValue: complexity,
        impact: 'Complex workflows are harder to debug and maintain',
        recommendation: 'Consider breaking down into sub-workflows',
        confidence: 0.9,
      });
    }

    return insights;
  }

  /**
   * Analyze historical data for a workflow
   */
  async analyzeHistory(
    workflowId: string,
    timeRange?: { start: number; end: number }
  ): Promise<HistoricalAnalysis> {
    let data = this.historicalData.filter((d) => d.workflowId === workflowId);

    if (timeRange) {
      data = data.filter((d) => d.timestamp >= timeRange.start && d.timestamp <= timeRange.end);
    }

    if (data.length === 0) {
      throw new Error(`No historical data found for workflow ${workflowId}`);
    }

    const durations = data.map((d) => d.duration);
    const costs = data.map((d) => d.cost);
    const successes = data.filter((d) => d.success).length;

    const analysis: HistoricalAnalysis = {
      totalExecutions: data.length,
      successRate: successes / data.length,
      averageDuration: mean(durations),
      medianDuration: median(durations),
      p95Duration: quantile(durations.sort((a, b) => a - b), 0.95),
      p99Duration: quantile(durations.sort((a, b) => a - b), 0.99),
      failureRate: 1 - successes / data.length,
      averageCost: mean(costs),
      totalCost: costs.reduce((sum, c) => sum + c, 0),
      trends: this.analyzeTrends(data),
      timeDistribution: this.analyzeTimeDistribution(data),
      insights: [],
    };

    // Generate insights from historical analysis
    analysis.insights = this.generateHistoricalInsights(analysis);

    return analysis;
  }

  /**
   * Analyze trends in historical data
   */
  private analyzeTrends(data: WorkflowExecutionData[]): {
    duration: 'improving' | 'degrading' | 'stable';
    successRate: 'improving' | 'degrading' | 'stable';
    cost: 'improving' | 'degrading' | 'stable';
  } {
    const half = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, half);
    const secondHalf = data.slice(half);

    // Duration trend
    const firstHalfDuration = mean(firstHalf.map((d) => d.duration));
    const secondHalfDuration = mean(secondHalf.map((d) => d.duration));
    const durationChange = (secondHalfDuration - firstHalfDuration) / firstHalfDuration;

    // Success rate trend
    const firstHalfSuccess = firstHalf.filter((d) => d.success).length / firstHalf.length;
    const secondHalfSuccess = secondHalf.filter((d) => d.success).length / secondHalf.length;
    const successChange = secondHalfSuccess - firstHalfSuccess;

    // Cost trend
    const firstHalfCost = mean(firstHalf.map((d) => d.cost));
    const secondHalfCost = mean(secondHalf.map((d) => d.cost));
    const costChange = (secondHalfCost - firstHalfCost) / firstHalfCost;

    return {
      duration:
        Math.abs(durationChange) < 0.1
          ? 'stable'
          : durationChange < 0
            ? 'improving'
            : 'degrading',
      successRate:
        Math.abs(successChange) < 0.05
          ? 'stable'
          : successChange > 0
            ? 'improving'
            : 'degrading',
      cost: Math.abs(costChange) < 0.1 ? 'stable' : costChange < 0 ? 'improving' : 'degrading',
    };
  }

  /**
   * Analyze time distribution
   */
  private analyzeTimeDistribution(data: WorkflowExecutionData[]): {
    hour: Record<number, number>;
    dayOfWeek: Record<number, number>;
  } {
    const hourDist: Record<number, number> = {};
    const dayDist: Record<number, number> = {};

    for (const execution of data) {
      const date = new Date(execution.timestamp);
      const hour = date.getHours();
      const day = date.getDay();

      hourDist[hour] = (hourDist[hour] || 0) + 1;
      dayDist[day] = (dayDist[day] || 0) + 1;
    }

    return { hour: hourDist, dayOfWeek: dayDist };
  }

  /**
   * Generate insights from historical analysis
   */
  private generateHistoricalInsights(analysis: HistoricalAnalysis): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    // Success rate insights
    if (analysis.successRate < 0.9) {
      insights.push({
        type: 'warning',
        severity: analysis.successRate < 0.7 ? 'critical' : 'high',
        title: 'Low Success Rate',
        description: `Workflow success rate is ${(analysis.successRate * 100).toFixed(1)}%`,
        metric: 'success_rate',
        currentValue: analysis.successRate,
        expectedValue: 0.95,
        impact: 'Frequent failures impact reliability and user trust',
        recommendation: 'Investigate common failure patterns and improve error handling',
        confidence: 0.95,
      });
    }

    // Duration variance insights
    const durationVariance = analysis.p95Duration - analysis.medianDuration;
    const varianceRatio = durationVariance / analysis.medianDuration;

    if (varianceRatio > 1.0) {
      insights.push({
        type: 'warning',
        severity: 'medium',
        title: 'High Execution Time Variance',
        description: 'Execution time varies significantly (P95 is much higher than median)',
        metric: 'duration_variance',
        currentValue: varianceRatio,
        impact: 'Unpredictable execution times make planning difficult',
        recommendation: 'Identify and optimize slow execution paths',
        confidence: 0.85,
      });
    }

    // Trend insights
    if (analysis.trends.duration === 'degrading') {
      insights.push({
        type: 'trend',
        severity: 'medium',
        title: 'Performance Degradation Detected',
        description: 'Execution time is trending upward over time',
        metric: 'duration_trend',
        currentValue: analysis.averageDuration,
        impact: 'Workflow performance is getting worse',
        recommendation: 'Review recent changes and optimize resource usage',
        confidence: 0.8,
      });
    }

    if (analysis.trends.cost === 'degrading') {
      insights.push({
        type: 'trend',
        severity: 'high',
        title: 'Cost Increasing Over Time',
        description: 'Workflow costs are trending upward',
        metric: 'cost_trend',
        currentValue: analysis.averageCost,
        impact: 'Increasing costs may exceed budget',
        recommendation: 'Audit API usage and optimize expensive operations',
        confidence: 0.8,
      });
    }

    return insights;
  }

  /**
   * Forecast future trends using time series analysis
   */
  async forecastTrend(
    data: TimeSeriesDataPoint[],
    horizonDays: number
  ): Promise<TrendForecast> {
    if (data.length < 10) {
      throw new Error('Insufficient data for forecasting. Need at least 10 points.');
    }

    // Sort by timestamp
    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);

    // Simple linear regression for trend
    const x = sorted.map((_, i) => i);
    const y = sorted.map((d) => d.value);

    const n = x.length;
    const sumX = x.reduce((sum, xi) => sum + xi, 0);
    const sumY = y.reduce((sum, yi) => sum + yi, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate residuals for confidence interval
    const predicted = x.map((xi) => slope * xi + intercept);
    const residuals = y.map((yi, i) => yi - predicted[i]);
    const stdError = standardDeviation(residuals);

    // Generate forecasts
    const msPerDay = 24 * 60 * 60 * 1000;
    const lastTimestamp = sorted[sorted.length - 1].timestamp;
    const predictions: TrendForecast['predictions'] = [];

    for (let day = 1; day <= horizonDays; day++) {
      const xi = n + day - 1;
      const value = slope * xi + intercept;
      const timestamp = lastTimestamp + day * msPerDay;

      predictions.push({
        timestamp,
        value: Math.max(0, value),
        lower: Math.max(0, value - 1.96 * stdError),
        upper: value + 1.96 * stdError,
      });
    }

    // Determine trend
    const trendStrength = Math.abs(slope) / (mean(y) || 1);
    let trend: TrendForecast['trend'];

    if (trendStrength < 0.05) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    // Check for seasonality (simple autocorrelation)
    const seasonality = this.detectSeasonality(y);

    return {
      predictions,
      trend,
      trendStrength: Math.min(1, trendStrength),
      seasonality,
    };
  }

  /**
   * Detect seasonality in time series
   */
  private detectSeasonality(values: number[]): {
    detected: boolean;
    period?: number;
    strength?: number;
  } {
    if (values.length < 30) {
      return { detected: false };
    }

    // Check for weekly seasonality (7-day period)
    const period = 7;
    let autocorrelation = 0;
    const valueMean = mean(values);

    for (let i = 0; i < values.length - period; i++) {
      autocorrelation += (values[i] - valueMean) * (values[i + period] - valueMean);
    }

    autocorrelation /= values.length - period;

    const variance = values.reduce((sum, v) => sum + Math.pow(v - valueMean, 2), 0) / values.length;
    const strength = Math.abs(autocorrelation / variance);

    return {
      detected: strength > 0.3,
      period,
      strength,
    };
  }

  /**
   * Update models with new data (online learning)
   */
  async updateWithNewData(newData: WorkflowExecutionData[]): Promise<void> {
    this.historicalData.push(...newData);

    // Update execution time model
    await this.modelManager.getExecutionTimeModel().updateOnline(newData);

    logger.debug(`Updated models with ${newData.length} new samples`);
  }

  /**
   * Calculate overall confidence from multiple predictions
   */
  private calculateOverallConfidence(confidences: number[]): number {
    // Use geometric mean for conservative estimate
    const product = confidences.reduce((p, c) => p * c, 1);
    return Math.pow(product, 1 / confidences.length);
  }

  /**
   * Get model performance metrics
   */
  getModelMetrics() {
    return {
      executionTime: this.modelManager.getExecutionTimeModel().getMetrics(),
      failure: this.modelManager.getFailureModel().getMetrics(),
      cost: this.modelManager.getCostModel().getMetrics(),
    };
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  getHistoricalDataSize(): number {
    return this.historicalData.length;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let engineInstance: PredictiveAnalyticsEngine | null = null;

export function getPredictiveAnalyticsEngine(): PredictiveAnalyticsEngine {
  if (!engineInstance) {
    engineInstance = new PredictiveAnalyticsEngine();
  }
  return engineInstance;
}

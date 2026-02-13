/**
 * Aggregation Service
 * Main orchestrator for metrics aggregation with real database integration
 */

import type {
  AggregatedMetrics,
  DateRange,
  TimeInterval,
  WorkflowAnalytics,
  TopWorkflow,
  SlowestNode,
  ExecutionMetrics,
} from '../types/advanced-analytics';

// Import from modular components
import { metricsAggregator } from './aggregation/MetricsAggregator';
import { reportBuilder } from './aggregation/ReportBuilder';
import { statisticsCalculator } from './aggregation/StatisticsCalculator';
import type {
  AnomalyResult,
  TrendDirection,
  TopWorkflowMetric,
} from './aggregation/types';

export class AggregationService {
  /**
   * Get aggregated metrics for a period (async version with real database queries)
   */
  async getAggregatedMetricsAsync(
    dateRange: DateRange,
    interval: TimeInterval = '1h'
  ): Promise<AggregatedMetrics> {
    const [executionMetrics, performanceMetrics, costMetrics, topWorkflows, slowestNodes] =
      await Promise.all([
        metricsAggregator.getExecutionMetricsAsync(dateRange),
        metricsAggregator.getPerformanceMetricsAsync(dateRange),
        metricsAggregator.getCostMetricsAsync(dateRange),
        metricsAggregator.getTopWorkflowsAsync(dateRange, 10),
        metricsAggregator.getSlowestNodesAsync(dateRange, 10),
      ]);

    return {
      period: dateRange,
      interval,
      metrics: {
        executions: executionMetrics,
        performance: performanceMetrics,
        cost: costMetrics,
        topWorkflows,
        slowestNodes,
      },
    };
  }

  /**
   * Get aggregated metrics for a period (sync version uses DataWarehouse cache)
   */
  getAggregatedMetrics(
    dateRange: DateRange,
    interval: TimeInterval = '1h'
  ): AggregatedMetrics {
    const executionMetrics = metricsAggregator.getExecutionMetrics(dateRange);
    const performanceMetrics = metricsAggregator.getPerformanceMetrics(dateRange);
    const costMetrics = metricsAggregator.getCostMetrics(dateRange);

    return {
      period: dateRange,
      interval,
      metrics: {
        executions: executionMetrics,
        performance: performanceMetrics,
        cost: costMetrics,
        topWorkflows: metricsAggregator.getTopWorkflows(dateRange, 10),
        slowestNodes: metricsAggregator.getSlowestNodes(dateRange, 10),
      },
    };
  }

  /**
   * Get top workflows by metric from database
   */
  async getTopWorkflowsAsync(
    dateRange: DateRange,
    limit: number = 10,
    metric: TopWorkflowMetric = 'executions'
  ): Promise<TopWorkflow[]> {
    return metricsAggregator.getTopWorkflowsAsync(dateRange, limit, metric);
  }

  /**
   * Get top workflows by metric (sync wrapper for backward compatibility)
   */
  getTopWorkflows(
    dateRange: DateRange,
    limit: number = 10,
    metric: TopWorkflowMetric = 'executions'
  ): TopWorkflow[] {
    return metricsAggregator.getTopWorkflows(dateRange, limit, metric);
  }

  /**
   * Get slowest nodes from database
   */
  async getSlowestNodesAsync(dateRange: DateRange, limit: number = 10): Promise<SlowestNode[]> {
    return metricsAggregator.getSlowestNodesAsync(dateRange, limit);
  }

  /**
   * Get slowest nodes (sync wrapper for backward compatibility)
   */
  getSlowestNodes(dateRange: DateRange, limit: number = 10): SlowestNode[] {
    return metricsAggregator.getSlowestNodes(dateRange, limit);
  }

  /**
   * Get workflow analytics from database
   */
  async getWorkflowAnalyticsAsync(
    workflowId: string,
    dateRange: DateRange
  ): Promise<WorkflowAnalytics | null> {
    return reportBuilder.buildWorkflowAnalyticsAsync(workflowId, dateRange);
  }

  /**
   * Get workflow analytics (sync wrapper for backward compatibility)
   */
  getWorkflowAnalytics(
    workflowId: string,
    dateRange: DateRange
  ): WorkflowAnalytics | null {
    return reportBuilder.buildWorkflowAnalytics(workflowId, dateRange);
  }

  // Statistical utility methods - delegated to StatisticsCalculator

  /**
   * Calculate moving average
   */
  calculateMovingAverage(values: number[], windowSize: number): number[] {
    return statisticsCalculator.calculateMovingAverage(values, windowSize);
  }

  /**
   * Detect trends
   */
  detectTrend(values: number[]): TrendDirection {
    return statisticsCalculator.detectTrend(values);
  }

  /**
   * Calculate percentage change
   */
  calculatePercentageChange(oldValue: number, newValue: number): number {
    return statisticsCalculator.calculatePercentageChange(oldValue, newValue);
  }

  /**
   * Group by time interval
   */
  groupByInterval(
    metrics: ExecutionMetrics[],
    interval: TimeInterval
  ): Map<number, ExecutionMetrics[]> {
    return statisticsCalculator.groupByInterval(metrics, interval);
  }

  /**
   * Calculate percentile
   */
  calculatePercentile(values: number[], percentile: number): number {
    return statisticsCalculator.calculatePercentile(values, percentile);
  }

  /**
   * Calculate standard deviation
   */
  calculateStandardDeviation(values: number[]): number {
    return statisticsCalculator.calculateStandardDeviation(values);
  }

  /**
   * Detect anomalies using standard deviation
   */
  detectAnomalies(values: number[], threshold: number = 3): AnomalyResult[] {
    return statisticsCalculator.detectAnomalies(values, threshold);
  }

  /**
   * Calculate correlation between two metrics
   */
  calculateCorrelation(values1: number[], values2: number[]): number {
    return statisticsCalculator.calculateCorrelation(values1, values2);
  }
}

// Singleton instance
export const aggregationService = new AggregationService();

// Re-export types and utilities for convenience
export type { AnomalyResult, TrendDirection, TopWorkflowMetric } from './aggregation/types';
export { statisticsCalculator } from './aggregation/StatisticsCalculator';
export { metricsAggregator } from './aggregation/MetricsAggregator';
export { reportBuilder } from './aggregation/ReportBuilder';
export { timeSeriesAggregator } from './aggregation/TimeSeriesAggregator';

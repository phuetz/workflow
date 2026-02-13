/**
 * Aggregation Service
 * Aggregates metrics for fast queries
 */

import type {
  AggregatedMetrics,
  DateRange,
  TimeInterval,
  WorkflowAnalytics,
  TopWorkflow,
  SlowestNode,
  ExecutionMetrics,
  NodeExecutionMetric,
} from '../types/advanced-analytics';
import { dataWarehouse } from './DataWarehouse';

export class AggregationService {
  /**
   * Get aggregated metrics for a period
   */
  getAggregatedMetrics(
    dateRange: DateRange,
    interval: TimeInterval = '1h'
  ): AggregatedMetrics {
    const executionMetrics = this.getExecutionMetrics(dateRange);
    const performanceMetrics = this.getPerformanceMetrics(dateRange);
    const costMetrics = this.getCostMetrics(dateRange);

    return {
      period: dateRange,
      interval,
      metrics: {
        executions: executionMetrics,
        performance: performanceMetrics,
        cost: costMetrics,
        topWorkflows: this.getTopWorkflows(dateRange, 10),
        slowestNodes: this.getSlowestNodes(dateRange, 10),
      },
    };
  }

  /**
   * Get execution metrics
   */
  private getExecutionMetrics(dateRange: DateRange): {
    total: number;
    successful: number;
    failed: number;
    running: number;
    successRate: number;
  } {
    const startedSeries = dataWarehouse.getTimeSeries(
      'workflow.started.count',
      dateRange,
      '1h',
      'sum'
    );

    const completedSeries = dataWarehouse.getTimeSeries(
      'workflow.completed.count',
      dateRange,
      '1h',
      'sum'
    );

    const failedSeries = dataWarehouse.getTimeSeries(
      'workflow.failed.count',
      dateRange,
      '1h',
      'sum'
    );

    const total = startedSeries?.dataPoints.reduce((sum, dp) => sum + dp.value, 0) || 0;
    const successful = completedSeries?.dataPoints.reduce((sum, dp) => sum + dp.value, 0) || 0;
    const failed = failedSeries?.dataPoints.reduce((sum, dp) => sum + dp.value, 0) || 0;
    const running = Math.max(0, total - successful - failed);
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    return {
      total,
      successful,
      failed,
      running,
      successRate,
    };
  }

  /**
   * Get performance metrics
   */
  private getPerformanceMetrics(dateRange: DateRange): {
    avgLatency: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    throughput: number;
  } {
    const avgSeries = dataWarehouse.getTimeSeries(
      'workflow.duration',
      dateRange,
      '1h',
      'avg'
    );

    const p50Series = dataWarehouse.getTimeSeries(
      'workflow.duration',
      dateRange,
      '1h',
      'p50'
    );

    const p95Series = dataWarehouse.getTimeSeries(
      'workflow.duration',
      dateRange,
      '1h',
      'p95'
    );

    const p99Series = dataWarehouse.getTimeSeries(
      'workflow.duration',
      dateRange,
      '1h',
      'p99'
    );

    const executionsSeries = dataWarehouse.getTimeSeries(
      'workflow.completed.count',
      dateRange,
      '1h',
      'sum'
    );

    const avgLatency = this.calculateAverage(avgSeries?.dataPoints.map(dp => dp.value) || []);
    const p50Latency = this.calculateAverage(p50Series?.dataPoints.map(dp => dp.value) || []);
    const p95Latency = this.calculateAverage(p95Series?.dataPoints.map(dp => dp.value) || []);
    const p99Latency = this.calculateAverage(p99Series?.dataPoints.map(dp => dp.value) || []);

    const totalExecutions = executionsSeries?.dataPoints.reduce((sum, dp) => sum + dp.value, 0) || 0;
    const hoursDiff = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60);
    const throughput = hoursDiff > 0 ? totalExecutions / hoursDiff : 0;

    return {
      avgLatency,
      p50Latency,
      p95Latency,
      p99Latency,
      throughput,
    };
  }

  /**
   * Get cost metrics
   */
  private getCostMetrics(dateRange: DateRange): {
    total: number;
    byCategory: Record<string, number>;
    trend: number;
  } {
    // Mock implementation - in production would query actual cost data
    return {
      total: 0,
      byCategory: {
        apiCalls: 0,
        llmTokens: 0,
        compute: 0,
        storage: 0,
      },
      trend: 0,
    };
  }

  /**
   * Get top workflows by metric
   */
  getTopWorkflows(
    dateRange: DateRange,
    limit: number = 10,
    metric: 'executions' | 'cost' | 'latency' = 'executions'
  ): TopWorkflow[] {
    // Mock implementation - in production would query actual workflow data
    return [];
  }

  /**
   * Get slowest nodes
   */
  getSlowestNodes(dateRange: DateRange, limit: number = 10): SlowestNode[] {
    // Mock implementation - in production would query actual node data
    return [];
  }

  /**
   * Get workflow analytics
   */
  getWorkflowAnalytics(
    workflowId: string,
    dateRange: DateRange
  ): WorkflowAnalytics | null {
    // Mock implementation - in production would query actual workflow data
    const executions = {
      total: 0,
      successful: 0,
      failed: 0,
      canceled: 0,
      successRate: 0,
    };

    const performance = {
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      p50Duration: 0,
      p95Duration: 0,
      p99Duration: 0,
    };

    const cost = {
      total: 0,
      average: 0,
      trend: 0,
    };

    return {
      workflowId,
      workflowName: 'Unknown Workflow',
      period: dateRange,
      executions,
      performance,
      cost,
      trends: [],
    };
  }

  /**
   * Calculate moving average
   */
  calculateMovingAverage(values: number[], windowSize: number): number[] {
    const result: number[] = [];

    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = values.slice(start, i + 1);
      const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
      result.push(avg);
    }

    return result;
  }

  /**
   * Detect trends
   */
  detectTrend(values: number[]): 'improving' | 'stable' | 'degrading' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = this.calculateAverage(firstHalf);
    const secondAvg = this.calculateAverage(secondHalf);

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (Math.abs(change) < 5) return 'stable';
    return change < 0 ? 'improving' : 'degrading';
  }

  /**
   * Calculate percentage change
   */
  calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Group by time interval
   */
  groupByInterval(
    metrics: ExecutionMetrics[],
    interval: TimeInterval
  ): Map<number, ExecutionMetrics[]> {
    const groups = new Map<number, ExecutionMetrics[]>();
    const intervalMs = this.getIntervalMs(interval);

    metrics.forEach(metric => {
      const bucketTime = Math.floor(metric.startTime.getTime() / intervalMs) * intervalMs;
      if (!groups.has(bucketTime)) {
        groups.set(bucketTime, []);
      }
      groups.get(bucketTime)?.push(metric);
    });

    return groups;
  }

  /**
   * Calculate percentile
   */
  calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate standard deviation
   */
  calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const avg = this.calculateAverage(values);
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = this.calculateAverage(squareDiffs);

    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Detect anomalies using standard deviation
   */
  detectAnomalies(
    values: number[],
    threshold: number = 3
  ): Array<{ index: number; value: number; deviation: number }> {
    const avg = this.calculateAverage(values);
    const stdDev = this.calculateStandardDeviation(values);

    const anomalies: Array<{ index: number; value: number; deviation: number }> = [];

    values.forEach((value, index) => {
      const deviation = Math.abs(value - avg) / stdDev;
      if (deviation > threshold) {
        anomalies.push({ index, value, deviation });
      }
    });

    return anomalies;
  }

  /**
   * Calculate correlation between two metrics
   */
  calculateCorrelation(values1: number[], values2: number[]): number {
    if (values1.length !== values2.length || values1.length === 0) return 0;

    const avg1 = this.calculateAverage(values1);
    const avg2 = this.calculateAverage(values2);

    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;

    for (let i = 0; i < values1.length; i++) {
      const diff1 = values1[i] - avg1;
      const diff2 = values2[i] - avg2;
      numerator += diff1 * diff2;
      sum1Sq += diff1 * diff1;
      sum2Sq += diff2 * diff2;
    }

    const denominator = Math.sqrt(sum1Sq * sum2Sq);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Private methods

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private getIntervalMs(interval: TimeInterval): number {
    const intervals: Record<TimeInterval, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000,
    };
    return intervals[interval];
  }
}

// Singleton instance
export const aggregationService = new AggregationService();

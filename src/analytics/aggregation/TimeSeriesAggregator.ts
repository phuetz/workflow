/**
 * Time Series Aggregator
 * Handles time-based aggregation and trend generation
 */

import type { DateRange, TimeInterval, TimeSeriesData } from '../../types/advanced-analytics';
import type { ExecutionTrendData } from './types';
import { statisticsCalculator } from './StatisticsCalculator';

export class TimeSeriesAggregator {
  /**
   * Generate workflow trends from execution data
   */
  generateWorkflowTrends(
    executions: ExecutionTrendData[],
    dateRange: DateRange
  ): TimeSeriesData[] {
    const trends: TimeSeriesData[] = [];

    // Determine appropriate interval based on date range
    const interval = statisticsCalculator.determineInterval(dateRange.start, dateRange.end);
    const intervalMs = statisticsCalculator.getIntervalMs(interval);

    // Group executions by interval
    const executionBuckets = new Map<number, ExecutionTrendData[]>();
    const durationBuckets = new Map<number, number[]>();

    executions.forEach(exec => {
      const bucketTime = Math.floor(exec.startedAt.getTime() / intervalMs) * intervalMs;

      if (!executionBuckets.has(bucketTime)) {
        executionBuckets.set(bucketTime, []);
      }
      executionBuckets.get(bucketTime)?.push(exec);

      if (exec.duration !== null) {
        if (!durationBuckets.has(bucketTime)) {
          durationBuckets.set(bucketTime, []);
        }
        durationBuckets.get(bucketTime)?.push(exec.duration);
      }
    });

    // Create execution count trend
    const executionCountPoints = Array.from(executionBuckets.entries())
      .map(([timestamp, execs]) => ({
        timestamp: new Date(timestamp),
        value: execs.length,
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (executionCountPoints.length > 0) {
      trends.push({
        metric: 'execution.count',
        dataPoints: executionCountPoints,
        aggregation: 'count',
        interval,
      });
    }

    // Create average duration trend
    const avgDurationPoints = Array.from(durationBuckets.entries())
      .map(([timestamp, durations]) => ({
        timestamp: new Date(timestamp),
        value: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (avgDurationPoints.length > 0) {
      trends.push({
        metric: 'execution.avgDuration',
        dataPoints: avgDurationPoints,
        aggregation: 'avg',
        interval,
      });
    }

    // Create success rate trend
    const successRatePoints = Array.from(executionBuckets.entries())
      .map(([timestamp, execs]) => {
        const successful = execs.filter(e => e.status === 'SUCCESS').length;
        return {
          timestamp: new Date(timestamp),
          value: execs.length > 0 ? (successful / execs.length) * 100 : 0,
        };
      })
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (successRatePoints.length > 0) {
      trends.push({
        metric: 'execution.successRate',
        dataPoints: successRatePoints,
        aggregation: 'avg',
        interval,
      });
    }

    return trends;
  }

  /**
   * Aggregate time series data by interval
   */
  aggregateByInterval<T extends { timestamp: Date; value: number }>(
    dataPoints: T[],
    interval: TimeInterval,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count'
  ): T[] {
    const intervalMs = statisticsCalculator.getIntervalMs(interval);
    const buckets = new Map<number, number[]>();

    dataPoints.forEach(point => {
      const bucketTime = Math.floor(point.timestamp.getTime() / intervalMs) * intervalMs;
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, []);
      }
      buckets.get(bucketTime)?.push(point.value);
    });

    return Array.from(buckets.entries())
      .map(([timestamp, values]) => ({
        timestamp: new Date(timestamp),
        value: this.aggregateValues(values, aggregation),
      } as T))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Aggregate array of values based on aggregation type
   */
  private aggregateValues(
    values: number[],
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count'
  ): number {
    if (values.length === 0) return 0;

    switch (aggregation) {
      case 'sum':
        return values.reduce((sum, v) => sum + v, 0);
      case 'avg':
        return values.reduce((sum, v) => sum + v, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      default:
        return values.reduce((sum, v) => sum + v, 0);
    }
  }

  /**
   * Fill gaps in time series with interpolated values
   */
  fillGaps<T extends { timestamp: Date; value: number }>(
    dataPoints: T[],
    interval: TimeInterval,
    startDate: Date,
    endDate: Date,
    fillValue: number = 0
  ): T[] {
    const intervalMs = statisticsCalculator.getIntervalMs(interval);
    const existingPoints = new Map(
      dataPoints.map(p => [Math.floor(p.timestamp.getTime() / intervalMs) * intervalMs, p])
    );

    const result: T[] = [];
    let current = Math.floor(startDate.getTime() / intervalMs) * intervalMs;
    const end = endDate.getTime();

    while (current <= end) {
      const existing = existingPoints.get(current);
      if (existing) {
        result.push(existing);
      } else {
        result.push({ timestamp: new Date(current), value: fillValue } as T);
      }
      current += intervalMs;
    }

    return result;
  }
}

// Singleton instance
export const timeSeriesAggregator = new TimeSeriesAggregator();

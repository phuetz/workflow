/**
 * Statistics Calculator
 * Utility class for statistical calculations used in aggregation
 */

import type { TimeInterval } from '../../types/advanced-analytics';
import type { ExecutionMetrics } from '../../types/execution';
import type { AnomalyResult, TrendDirection } from './types';

export class StatisticsCalculator {
  /**
   * Calculate percentile from sorted or unsorted values
   */
  calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate average of values
   */
  calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
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
   * Calculate moving average with given window size
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
   * Detect trend direction from values
   */
  detectTrend(values: number[]): TrendDirection {
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
   * Calculate percentage change between two values
   */
  calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Detect anomalies using standard deviation threshold
   */
  detectAnomalies(values: number[], threshold: number = 3): AnomalyResult[] {
    const avg = this.calculateAverage(values);
    const stdDev = this.calculateStandardDeviation(values);

    const anomalies: AnomalyResult[] = [];

    values.forEach((value, index) => {
      const deviation = Math.abs(value - avg) / stdDev;
      if (deviation > threshold) {
        anomalies.push({ index, value, deviation });
      }
    });

    return anomalies;
  }

  /**
   * Calculate correlation coefficient between two value series
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

  /**
   * Group execution metrics by time interval
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
   * Convert time interval to milliseconds
   */
  getIntervalMs(interval: TimeInterval): number {
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

  /**
   * Determine appropriate interval based on date range
   */
  determineInterval(startDate: Date, endDate: Date): TimeInterval {
    const rangeMs = endDate.getTime() - startDate.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    if (rangeMs <= dayMs) {
      return '1h';
    } else if (rangeMs <= 7 * dayMs) {
      return '6h';
    } else if (rangeMs <= 30 * dayMs) {
      return '1d';
    } else {
      return '1w';
    }
  }
}

// Singleton instance
export const statisticsCalculator = new StatisticsCalculator();

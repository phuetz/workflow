/**
 * Data Warehouse
 * Time-series data storage with aggregation
 */

import type {
import { logger } from '../services/LoggingService';
  TimeSeriesData,
  MetricDataPoint,
  AggregationType,
  TimeInterval,
  DateRange,
  DataWarehouseConfig,
  AnalyticsEvent,
} from '../types/advanced-analytics';

export class DataWarehouse {
  private timeSeriesData: Map<string, TimeSeriesData> = new Map();
  private rawData: Map<string, MetricDataPoint[]> = new Map();
  private config: DataWarehouseConfig;

  constructor(config?: Partial<DataWarehouseConfig>) {
    this.config = {
      retention: {
        detailedData: 90, // 90 days
        aggregatedData: 365, // 1 year
        rawEvents: 30, // 30 days
      },
      aggregationIntervals: ['1h', '1d', '1w', '1M'],
      partitionBy: 'day',
      compressionEnabled: true,
      ...config,
    };
  }

  /**
   * Store metric data point
   */
  storeMetric(metric: string, value: number, metadata?: Record<string, unknown>): void {
    const dataPoint: MetricDataPoint = {
      timestamp: new Date(),
      value,
      metadata,
    };

    if (!this.rawData.has(metric)) {
      this.rawData.set(metric, []);
    }

    this.rawData.get(metric)?.push(dataPoint);
  }

  /**
   * Store batch of metrics
   */
  storeBatch(metrics: Array<{ metric: string; value: number; metadata?: Record<string, unknown> }>): void {
    metrics.forEach(({ metric, value, metadata }) => {
      this.storeMetric(metric, value, metadata);
    });
  }

  /**
   * Get time series data
   */
  getTimeSeries(
    metric: string,
    dateRange: DateRange,
    interval: TimeInterval,
    aggregation: AggregationType = 'avg'
  ): TimeSeriesData | null {
    const key = this.getTimeSeriesKey(metric, interval, aggregation);
    const cached = this.timeSeriesData.get(key);

    if (cached) {
      return this.filterTimeSeriesByRange(cached, dateRange);
    }

    // Generate from raw data
    const rawDataPoints = this.rawData.get(metric);
    if (!rawDataPoints) return null;

    const aggregated = this.aggregateData(rawDataPoints, dateRange, interval, aggregation);

    const timeSeries: TimeSeriesData = {
      metric,
      dataPoints: aggregated,
      aggregation,
      interval,
    };

    this.timeSeriesData.set(key, timeSeries);
    return timeSeries;
  }

  /**
   * Aggregate raw data
   */
  private aggregateData(
    dataPoints: MetricDataPoint[],
    dateRange: DateRange,
    interval: TimeInterval,
    aggregation: AggregationType
  ): MetricDataPoint[] {
    // Filter by date range
    const filtered = dataPoints.filter(
      dp => dp.timestamp >= dateRange.start && dp.timestamp <= dateRange.end
    );

    // Group by interval
    const buckets = this.groupByInterval(filtered, interval);

    // Aggregate each bucket
    return Array.from(buckets.entries()).map(([timestamp, points]) => ({
      timestamp: new Date(timestamp),
      value: this.aggregate(points.map(p => p.value), aggregation),
    }));
  }

  /**
   * Group data points by time interval
   */
  private groupByInterval(
    dataPoints: MetricDataPoint[],
    interval: TimeInterval
  ): Map<number, MetricDataPoint[]> {
    const buckets = new Map<number, MetricDataPoint[]>();
    const intervalMs = this.getIntervalMs(interval);

    dataPoints.forEach(point => {
      const bucketTime = Math.floor(point.timestamp.getTime() / intervalMs) * intervalMs;
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, []);
      }
      buckets.get(bucketTime)?.push(point);
    });

    return buckets;
  }

  /**
   * Aggregate values
   */
  private aggregate(values: number[], type: AggregationType): number {
    if (values.length === 0) return 0;

    switch (type) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      case 'p50':
        return this.percentile(values, 50);
      case 'p95':
        return this.percentile(values, 95);
      case 'p99':
        return this.percentile(values, 99);
      default:
        return 0;
    }
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get interval in milliseconds
   */
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

  /**
   * Filter time series by date range
   */
  private filterTimeSeriesByRange(
    timeSeries: TimeSeriesData,
    dateRange: DateRange
  ): TimeSeriesData {
    return {
      ...timeSeries,
      dataPoints: timeSeries.dataPoints.filter(
        dp => dp.timestamp >= dateRange.start && dp.timestamp <= dateRange.end
      ),
    };
  }

  /**
   * Get time series key
   */
  private getTimeSeriesKey(
    metric: string,
    interval: TimeInterval,
    aggregation: AggregationType
  ): string {
    return `${metric}:${interval}:${aggregation}`;
  }

  /**
   * Process analytics events into metrics
   */
  processEvents(events: AnalyticsEvent[]): void {
    events.forEach(event => {
      switch (event.type) {
        case 'workflow.started':
          this.storeMetric('workflow.started.count', 1, {
            workflowId: event.workflowId,
          });
          break;

        case 'workflow.completed':
          this.storeMetric('workflow.completed.count', 1, {
            workflowId: event.workflowId,
          });
          if (typeof event.data.duration === 'number') {
            this.storeMetric('workflow.duration', event.data.duration, {
              workflowId: event.workflowId,
            });
          }
          break;

        case 'workflow.failed':
          this.storeMetric('workflow.failed.count', 1, {
            workflowId: event.workflowId,
          });
          break;

        case 'node.completed':
          if (typeof event.data.duration === 'number') {
            this.storeMetric('node.duration', event.data.duration, {
              nodeId: event.nodeId,
              nodeType: event.data.nodeType,
            });
          }
          break;

        case 'api.call':
          this.storeMetric('api.call.count', 1, {
            endpoint: event.data.endpoint,
          });
          if (typeof event.data.duration === 'number') {
            this.storeMetric('api.call.duration', event.data.duration, {
              endpoint: event.data.endpoint,
            });
          }
          break;

        case 'cost.threshold':
          this.storeMetric('cost.alert.count', 1, {
            workflowId: event.workflowId,
          });
          break;
      }
    });
  }

  /**
   * Pre-aggregate data for common queries
   */
  preAggregate(): void {
    const now = new Date();
    const ranges: Array<{ start: Date; end: Date }> = [
      // Last 24 hours
      {
        start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        end: now,
      },
      // Last 7 days
      {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        end: now,
      },
      // Last 30 days
      {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: now,
      },
    ];

    const metrics = Array.from(this.rawData.keys());
    const intervals: TimeInterval[] = ['1h', '1d', '1w'];
    const aggregations: AggregationType[] = ['sum', 'avg', 'p95'];

    metrics.forEach(metric => {
      ranges.forEach(range => {
        intervals.forEach(interval => {
          aggregations.forEach(aggregation => {
            this.getTimeSeries(metric, range, interval, aggregation);
          });
        });
      });
    });
  }

  /**
   * Clean up old data based on retention policy
   */
  cleanup(): number {
    let deletedCount = 0;
    const now = new Date();

    // Clean raw data
    const rawRetentionDate = new Date(
      now.getTime() - this.config.retention.rawEvents * 24 * 60 * 60 * 1000
    );

    this.rawData.forEach((dataPoints, metric) => {
      const filtered = dataPoints.filter(dp => dp.timestamp >= rawRetentionDate);
      deletedCount += dataPoints.length - filtered.length;
      this.rawData.set(metric, filtered);
    });

    // Clean aggregated data
    const aggregatedRetentionDate = new Date(
      now.getTime() - this.config.retention.aggregatedData * 24 * 60 * 60 * 1000
    );

    this.timeSeriesData.forEach((timeSeries, key) => {
      const filtered = timeSeries.dataPoints.filter(
        dp => dp.timestamp >= aggregatedRetentionDate
      );
      deletedCount += timeSeries.dataPoints.length - filtered.length;
      timeSeries.dataPoints = filtered;
    });

    logger.debug(`Cleaned up ${deletedCount} old data points`);
    return deletedCount;
  }

  /**
   * Get storage statistics
   */
  getStatistics(): {
    rawMetrics: number;
    rawDataPoints: number;
    timeSeriesCount: number;
    totalDataPoints: number;
    estimatedSizeBytes: number;
  } {
    let rawDataPoints = 0;
    this.rawData.forEach(points => {
      rawDataPoints += points.length;
    });

    let totalDataPoints = 0;
    this.timeSeriesData.forEach(series => {
      totalDataPoints += series.dataPoints.length;
    });

    // Rough estimation: each data point is ~100 bytes
    const estimatedSizeBytes = (rawDataPoints + totalDataPoints) * 100;

    return {
      rawMetrics: this.rawData.size,
      rawDataPoints,
      timeSeriesCount: this.timeSeriesData.size,
      totalDataPoints,
      estimatedSizeBytes,
    };
  }

  /**
   * Export data for backup
   */
  export(): {
    rawData: Array<{ metric: string; dataPoints: MetricDataPoint[] }>;
    timeSeries: Array<{ key: string; data: TimeSeriesData }>;
  } {
    return {
      rawData: Array.from(this.rawData.entries()).map(([metric, dataPoints]) => ({
        metric,
        dataPoints,
      })),
      timeSeries: Array.from(this.timeSeriesData.entries()).map(([key, data]) => ({
        key,
        data,
      })),
    };
  }

  /**
   * Import data from backup
   */
  import(data: {
    rawData: Array<{ metric: string; dataPoints: MetricDataPoint[] }>;
    timeSeries: Array<{ key: string; data: TimeSeriesData }>;
  }): void {
    data.rawData.forEach(({ metric, dataPoints }) => {
      this.rawData.set(metric, dataPoints);
    });

    data.timeSeries.forEach(({ key, data }) => {
      this.timeSeriesData.set(key, data);
    });
  }
}

// Singleton instance
export const dataWarehouse = new DataWarehouse();

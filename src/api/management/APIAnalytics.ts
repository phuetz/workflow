/**
 * API Analytics
 * Comprehensive analytics for API usage, performance, and behavior
 */

import { EventEmitter } from 'events';

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  timestamp: Date;
  requestId: string;
  userId?: string;
  apiKey?: string;
  operation?: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  error?: string;
  userAgent?: string;
  ip?: string;
  metadata?: Record<string, any>;
}

/**
 * Analytics query
 */
export interface AnalyticsQuery {
  startTime?: Date;
  endTime?: Date;
  userId?: string;
  apiKey?: string;
  operation?: string;
  statusCode?: number;
  minDuration?: number;
  maxDuration?: number;
}

/**
 * Usage metrics
 */
export interface UsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  requestsPerSecond: number;
}

/**
 * Top consumer
 */
export interface TopConsumer {
  identifier: string;
  type: 'user' | 'apiKey' | 'ip';
  requestCount: number;
  averageLatency: number;
  errorCount: number;
}

/**
 * Operation metrics
 */
export interface OperationMetrics {
  operation: string;
  count: number;
  averageLatency: number;
  errorCount: number;
  complexity: number;
}

/**
 * Error analysis
 */
export interface ErrorAnalysis {
  statusCode: number;
  count: number;
  percentage: number;
  examples: Array<{
    timestamp: Date;
    message: string;
    operation?: string;
  }>;
}

/**
 * Time series data point
 */
export interface TimeSeriesDataPoint {
  timestamp: Date;
  requestCount: number;
  averageLatency: number;
  errorCount: number;
}

/**
 * APIAnalytics tracks and analyzes API usage
 */
export class APIAnalytics extends EventEmitter {
  private events: AnalyticsEvent[] = [];
  private maxEvents: number = 100000;

  constructor(maxEvents?: number) {
    super();
    if (maxEvents) {
      this.maxEvents = maxEvents;
    }
  }

  /**
   * Record an analytics event
   */
  recordEvent(event: AnalyticsEvent): void {
    this.events.push(event);

    // Keep only last N events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    this.emit('event:recorded', event);
  }

  /**
   * Query events
   */
  queryEvents(query: AnalyticsQuery): AnalyticsEvent[] {
    let events = [...this.events];

    if (query.startTime) {
      events = events.filter(e => e.timestamp >= query.startTime!);
    }

    if (query.endTime) {
      events = events.filter(e => e.timestamp <= query.endTime!);
    }

    if (query.userId) {
      events = events.filter(e => e.userId === query.userId);
    }

    if (query.apiKey) {
      events = events.filter(e => e.apiKey === query.apiKey);
    }

    if (query.operation) {
      events = events.filter(e => e.operation === query.operation);
    }

    if (query.statusCode) {
      events = events.filter(e => e.statusCode === query.statusCode);
    }

    if (query.minDuration !== undefined) {
      events = events.filter(e => e.duration >= query.minDuration!);
    }

    if (query.maxDuration !== undefined) {
      events = events.filter(e => e.duration <= query.maxDuration!);
    }

    return events;
  }

  /**
   * Get usage metrics
   */
  getUsageMetrics(query?: AnalyticsQuery): UsageMetrics {
    const events = query ? this.queryEvents(query) : this.events;

    if (events.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        errorRate: 0,
        requestsPerSecond: 0
      };
    }

    const totalRequests = events.length;
    const successfulRequests = events.filter(e => e.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;

    // Calculate latency metrics
    const latencies = events.map(e => e.duration).sort((a, b) => a - b);
    const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    const p50Index = Math.floor(latencies.length * 0.5);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);

    const p50Latency = latencies[p50Index] || 0;
    const p95Latency = latencies[p95Index] || 0;
    const p99Latency = latencies[p99Index] || 0;

    const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;

    // Calculate RPS
    const timeSpan = this.getTimeSpan(events);
    const requestsPerSecond = timeSpan > 0 ? totalRequests / timeSpan : 0;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageLatency,
      p50Latency,
      p95Latency,
      p99Latency,
      errorRate,
      requestsPerSecond
    };
  }

  /**
   * Get top consumers
   */
  getTopConsumers(limit: number = 10, query?: AnalyticsQuery): TopConsumer[] {
    const events = query ? this.queryEvents(query) : this.events;
    const consumers = new Map<string, {
      type: 'user' | 'apiKey' | 'ip';
      requestCount: number;
      totalLatency: number;
      errorCount: number;
    }>();

    for (const event of events) {
      let identifier: string;
      let type: 'user' | 'apiKey' | 'ip';

      if (event.userId) {
        identifier = `user:${event.userId}`;
        type = 'user';
      } else if (event.apiKey) {
        identifier = `apiKey:${event.apiKey}`;
        type = 'apiKey';
      } else if (event.ip) {
        identifier = `ip:${event.ip}`;
        type = 'ip';
      } else {
        continue;
      }

      const existing = consumers.get(identifier) || {
        type,
        requestCount: 0,
        totalLatency: 0,
        errorCount: 0
      };

      existing.requestCount++;
      existing.totalLatency += event.duration;
      if (event.statusCode >= 400) {
        existing.errorCount++;
      }

      consumers.set(identifier, existing);
    }

    const topConsumers: TopConsumer[] = Array.from(consumers.entries())
      .map(([identifier, data]) => ({
        identifier: identifier.split(':')[1],
        type: data.type,
        requestCount: data.requestCount,
        averageLatency: data.totalLatency / data.requestCount,
        errorCount: data.errorCount
      }))
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, limit);

    return topConsumers;
  }

  /**
   * Get operation metrics
   */
  getOperationMetrics(query?: AnalyticsQuery): OperationMetrics[] {
    const events = query ? this.queryEvents(query) : this.events;
    const operations = new Map<string, {
      count: number;
      totalLatency: number;
      errorCount: number;
      complexity: number;
    }>();

    for (const event of events) {
      if (!event.operation) continue;

      const existing = operations.get(event.operation) || {
        count: 0,
        totalLatency: 0,
        errorCount: 0,
        complexity: 0
      };

      existing.count++;
      existing.totalLatency += event.duration;
      if (event.statusCode >= 400) {
        existing.errorCount++;
      }

      // Estimate complexity (placeholder)
      existing.complexity = Math.max(existing.complexity, event.duration / 10);

      operations.set(event.operation, existing);
    }

    return Array.from(operations.entries())
      .map(([operation, data]) => ({
        operation,
        count: data.count,
        averageLatency: data.totalLatency / data.count,
        errorCount: data.errorCount,
        complexity: data.complexity
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get error analysis
   */
  getErrorAnalysis(query?: AnalyticsQuery): ErrorAnalysis[] {
    const events = query ? this.queryEvents(query) : this.events;
    const errors = new Map<number, {
      count: number;
      examples: Array<{
        timestamp: Date;
        message: string;
        operation?: string;
      }>;
    }>();

    const errorEvents = events.filter(e => e.statusCode >= 400);
    const totalErrors = errorEvents.length;

    for (const event of errorEvents) {
      const existing = errors.get(event.statusCode) || {
        count: 0,
        examples: []
      };

      existing.count++;

      if (existing.examples.length < 3) {
        existing.examples.push({
          timestamp: event.timestamp,
          message: event.error || `HTTP ${event.statusCode}`,
          operation: event.operation
        });
      }

      errors.set(event.statusCode, existing);
    }

    return Array.from(errors.entries())
      .map(([statusCode, data]) => ({
        statusCode,
        count: data.count,
        percentage: totalErrors > 0 ? (data.count / totalErrors) * 100 : 0,
        examples: data.examples
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get time series data
   */
  getTimeSeries(
    interval: 'minute' | 'hour' | 'day',
    query?: AnalyticsQuery
  ): TimeSeriesDataPoint[] {
    const events = query ? this.queryEvents(query) : this.events;

    if (events.length === 0) {
      return [];
    }

    const intervalMs = this.getIntervalMs(interval);
    const buckets = new Map<number, {
      requestCount: number;
      totalLatency: number;
      errorCount: number;
    }>();

    for (const event of events) {
      const bucketKey = Math.floor(event.timestamp.getTime() / intervalMs) * intervalMs;

      const existing = buckets.get(bucketKey) || {
        requestCount: 0,
        totalLatency: 0,
        errorCount: 0
      };

      existing.requestCount++;
      existing.totalLatency += event.duration;
      if (event.statusCode >= 400) {
        existing.errorCount++;
      }

      buckets.set(bucketKey, existing);
    }

    return Array.from(buckets.entries())
      .map(([timestamp, data]) => ({
        timestamp: new Date(timestamp),
        requestCount: data.requestCount,
        averageLatency: data.totalLatency / data.requestCount,
        errorCount: data.errorCount
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get slowest operations
   */
  getSlowestOperations(limit: number = 10, query?: AnalyticsQuery): Array<{
    operation: string;
    averageLatency: number;
    maxLatency: number;
    count: number;
  }> {
    const events = query ? this.queryEvents(query) : this.events;
    const operations = new Map<string, {
      totalLatency: number;
      maxLatency: number;
      count: number;
    }>();

    for (const event of events) {
      if (!event.operation) continue;

      const existing = operations.get(event.operation) || {
        totalLatency: 0,
        maxLatency: 0,
        count: 0
      };

      existing.totalLatency += event.duration;
      existing.maxLatency = Math.max(existing.maxLatency, event.duration);
      existing.count++;

      operations.set(event.operation, existing);
    }

    return Array.from(operations.entries())
      .map(([operation, data]) => ({
        operation,
        averageLatency: data.totalLatency / data.count,
        maxLatency: data.maxLatency,
        count: data.count
      }))
      .sort((a, b) => b.averageLatency - a.averageLatency)
      .slice(0, limit);
  }

  /**
   * Get time span in seconds
   */
  private getTimeSpan(events: AnalyticsEvent[]): number {
    if (events.length === 0) return 0;

    const timestamps = events.map(e => e.timestamp.getTime());
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);

    return (max - min) / 1000; // Convert to seconds
  }

  /**
   * Get interval in milliseconds
   */
  private getIntervalMs(interval: 'minute' | 'hour' | 'day'): number {
    switch (interval) {
      case 'minute':
        return 60 * 1000;
      case 'hour':
        return 60 * 60 * 1000;
      case 'day':
        return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Export analytics data
   */
  exportData(query?: AnalyticsQuery): AnalyticsEvent[] {
    return query ? this.queryEvents(query) : [...this.events];
  }

  /**
   * Clear analytics data
   */
  clear(): void {
    this.events = [];
    this.emit('analytics:cleared');
  }

  /**
   * Get summary report
   */
  getSummaryReport(query?: AnalyticsQuery): {
    metrics: UsageMetrics;
    topConsumers: TopConsumer[];
    topOperations: OperationMetrics[];
    errors: ErrorAnalysis[];
  } {
    return {
      metrics: this.getUsageMetrics(query),
      topConsumers: this.getTopConsumers(5, query),
      topOperations: this.getOperationMetrics(query).slice(0, 5),
      errors: this.getErrorAnalysis(query)
    };
  }
}

export default APIAnalytics;

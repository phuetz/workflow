/**
 * Metrics Services - Unified Export
 *
 * This module provides a single entry point for all metrics-related services.
 * Use this instead of importing individual metrics services directly.
 *
 * Available exports:
 * - metricsService: General application metrics
 * - metricsCollector: Metrics collection and aggregation
 * - realMetricsCollector: Real-time metrics with WebSocket support
 *
 * Usage:
 *   import { metricsService, metricsCollector } from '@services/metrics';
 */

// Re-export from individual services
export { metricsService, MetricsService } from '../MetricsService';
export { metricsCollector, MetricsCollector } from '../MetricsCollector';
export { realMetricsCollector, RealMetricsCollector } from '../RealMetricsCollector';

// Common metrics types
export interface MetricData {
  name: string;
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface MetricsSummary {
  totalMetrics: number;
  lastUpdated: Date;
  metrics: MetricData[];
}

export interface PerformanceMetrics {
  cpu: number;
  memory: number;
  heapUsed: number;
  heapTotal: number;
  uptime: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
}

/**
 * Get unified metrics from all collectors
 */
export async function getUnifiedMetrics(): Promise<MetricsSummary> {
  const { metricsService } = await import('../MetricsService');

  // Collect metrics from all sources
  const allMetrics = metricsService.getAllMetrics();

  return {
    totalMetrics: allMetrics.length,
    lastUpdated: new Date(),
    metrics: allMetrics.map(m => ({
      name: m.name,
      value: m.value,
      timestamp: m.timestamp || new Date(),
      labels: m.labels,
      type: m.type || 'gauge',
    })),
  };
}

/**
 * Record a metric value
 */
export function recordMetric(
  name: string,
  value: number,
  labels?: Record<string, string>
): void {
  // Use lazy import to avoid circular dependencies
  import('../MetricsService').then(({ metricsService }) => {
    metricsService.record(name, value, labels);
  });
}

/**
 * Increment a counter metric
 */
export function incrementCounter(
  name: string,
  labels?: Record<string, string>
): void {
  import('../MetricsService').then(({ metricsService }) => {
    metricsService.increment(name, labels);
  });
}

/**
 * Record timing for operations
 */
export function recordTiming(
  name: string,
  durationMs: number,
  labels?: Record<string, string>
): void {
  import('../MetricsService').then(({ metricsService }) => {
    metricsService.timing(name, durationMs, labels);
  });
}

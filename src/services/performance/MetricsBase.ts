/**
 * Performance Module - MetricsBase
 *
 * Abstract base class providing common functionality for all performance services:
 * - Metric storage with retention policies
 * - Statistical calculations (avg, min, max, percentiles)
 * - Alert/threshold checking
 * - Prometheus format export
 * - Event emission for notifications
 *
 * This consolidates duplicate logic from:
 * - PerformanceMonitoringService
 * - PerformanceOptimizationService
 * - PerformanceMonitoringHub
 * - MetricsCollector
 */

import { EventEmitter } from 'events';
import { logger } from '../SimpleLogger';
import {
  DEFAULT_COLLECTOR_CONFIG,
  parseRelativeTime,
} from './types';
import type {
  TypedMetric,
  MetricDefinition,
  AggregatedMetric,
  AlertConfig,
  AlertInstance,
  AlertOperator,
  MetricsCollectorConfig,
  TimeRange,
} from './types';

/**
 * Abstract base class for metrics collection and management
 */
export abstract class MetricsBase extends EventEmitter {
  // Metric storage
  protected metrics: Map<string, TypedMetric[]> = new Map();
  protected metricDefinitions: Map<string, MetricDefinition> = new Map();
  protected aggregatedMetrics: Map<string, AggregatedMetric> = new Map();

  // Counter and gauge storage for simple metrics
  protected counters: Map<string, number> = new Map();
  protected gauges: Map<string, number> = new Map();
  protected histograms: Map<string, number[]> = new Map();

  // Alert management
  protected alertConfigs: Map<string, AlertConfig> = new Map();
  protected activeAlerts: Map<string, AlertInstance> = new Map();

  // Configuration
  protected config: MetricsCollectorConfig;

  // Collection interval
  protected collectionInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<MetricsCollectorConfig>) {
    super();
    this.config = { ...DEFAULT_COLLECTOR_CONFIG, ...config };
  }

  // ============================================================================
  // Abstract Methods - Must be implemented by subclasses
  // ============================================================================

  /**
   * Collect metrics specific to the service implementation
   */
  protected abstract collectMetrics(): Promise<void> | void;

  /**
   * Service-specific initialization
   */
  protected abstract initializeService(): void;

  // ============================================================================
  // Metric Recording Methods
  // ============================================================================

  /**
   * Record a typed metric
   */
  recordMetric(metric: Omit<TypedMetric, 'timestamp'>): void {
    const fullMetric: TypedMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    // Store in appropriate collection
    const existing = this.metrics.get(metric.name) || [];
    existing.push(fullMetric);

    // Apply retention limit
    if (existing.length > this.config.maxDataPoints) {
      this.metrics.set(metric.name, existing.slice(-this.config.maxDataPoints));
    } else {
      this.metrics.set(metric.name, existing);
    }

    // Update aggregations
    this.updateAggregation(fullMetric);

    // Check alerts
    this.checkAlerts(fullMetric);

    // Emit event
    this.emit('metric:recorded', fullMetric);
  }

  /**
   * Increment a counter metric
   */
  increment(name: string, value = 1, tags?: Record<string, string>): void {
    const key = this.formatMetricKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);

    this.recordMetric({
      name,
      value: current + value,
      type: 'counter',
      tags,
    });
  }

  /**
   * Set a gauge value
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.formatMetricKey(name, tags);
    this.gauges.set(key, value);

    this.recordMetric({
      name,
      value,
      type: 'gauge',
      tags,
    });
  }

  /**
   * Record a histogram value
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.formatMetricKey(name, tags);
    const existing = this.histograms.get(key) || [];
    existing.push(value);

    // Keep only last 1000 values for histograms
    if (existing.length > 1000) {
      this.histograms.set(key, existing.slice(-1000));
    } else {
      this.histograms.set(key, existing);
    }

    this.recordMetric({
      name,
      value,
      type: 'histogram',
      tags,
    });
  }

  /**
   * Format metric key with labels
   */
  protected formatMetricKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }
    const labelStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  // ============================================================================
  // Statistical Calculations
  // ============================================================================

  /**
   * Update aggregation for a metric
   */
  protected updateAggregation(metric: TypedMetric): void {
    const existing = this.aggregatedMetrics.get(metric.name) || this.createEmptyAggregation();

    existing.count++;
    existing.sum += metric.value;
    existing.avg = existing.sum / existing.count;
    existing.min = Math.min(existing.min, metric.value);
    existing.max = Math.max(existing.max, metric.value);
    existing.lastValue = metric.value;
    existing.lastTimestamp = metric.timestamp;

    // Recalculate percentiles periodically (every 100 values)
    if (existing.count % 100 === 0) {
      const values = this.metrics.get(metric.name)?.map((m) => m.value) || [];
      if (values.length > 0) {
        existing.p50 = this.percentile(values, 0.5);
        existing.p95 = this.percentile(values, 0.95);
        existing.p99 = this.percentile(values, 0.99);
      }
    }

    this.aggregatedMetrics.set(metric.name, existing);
  }

  /**
   * Create empty aggregation object
   */
  protected createEmptyAggregation(): AggregatedMetric {
    return {
      count: 0,
      sum: 0,
      avg: 0,
      min: Infinity,
      max: -Infinity,
      p50: 0,
      p95: 0,
      p99: 0,
      lastValue: 0,
      lastTimestamp: 0,
    };
  }

  /**
   * Calculate percentile from array of values
   */
  percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  /**
   * Calculate average from array of values
   */
  average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = this.average(values);
    const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  }

  // ============================================================================
  // Alert Management
  // ============================================================================

  /**
   * Add an alert configuration
   */
  addAlert(config: AlertConfig): void {
    this.alertConfigs.set(config.id, config);
    logger.info(`Alert configured: ${config.id}`, { metric: config.metricName });
  }

  /**
   * Remove an alert configuration
   */
  removeAlert(alertId: string): void {
    this.alertConfigs.delete(alertId);
    this.activeAlerts.delete(alertId);
    logger.info(`Alert removed: ${alertId}`);
  }

  /**
   * Check alerts against a metric value
   */
  protected checkAlerts(metric: TypedMetric): void {
    for (const config of Array.from(this.alertConfigs.values())) {
      if (!config.enabled || config.metricName !== metric.name) continue;

      const triggered = this.evaluateAlertCondition(
        metric.value,
        config.operator,
        config.threshold
      );

      const existingAlert = this.activeAlerts.get(config.id);
      const now = Date.now();

      if (triggered) {
        // Check cooldown
        if (existingAlert && now - existingAlert.triggeredAt < config.cooldownMs) {
          continue;
        }

        const alertInstance: AlertInstance = {
          config,
          triggeredAt: now,
          currentValue: metric.value,
          acknowledged: false,
        };

        this.activeAlerts.set(config.id, alertInstance);
        this.emit('alert:triggered', alertInstance);

        logger.warn(`Alert triggered: ${config.name}`, {
          metric: config.metricName,
          value: metric.value,
          threshold: config.threshold,
        });
      } else if (existingAlert && !existingAlert.resolvedAt) {
        // Resolve alert
        existingAlert.resolvedAt = now;
        this.emit('alert:resolved', existingAlert);
        this.activeAlerts.delete(config.id);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  protected evaluateAlertCondition(
    value: number,
    operator: AlertOperator,
    threshold: number
  ): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'eq':
        return value === threshold;
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      case 'ne':
        return value !== threshold;
      default:
        return false;
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertInstance[] {
    return Array.from(this.activeAlerts.values());
  }

  // ============================================================================
  // Prometheus Export
  // ============================================================================

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    // Export metric definitions
    for (const [name, metrics] of Array.from(this.metrics.entries())) {
      const definition = this.metricDefinitions.get(name);

      if (definition?.description) {
        lines.push(`# HELP ${name} ${definition.description}`);
      }
      if (definition) {
        lines.push(`# TYPE ${name} ${definition.type}`);
      }

      // Get last 10 values
      for (const metric of metrics.slice(-10)) {
        const labels = metric.tags
          ? `{${Object.entries(metric.tags)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',')}}`
          : '';
        lines.push(`${name}${labels} ${metric.value} ${metric.timestamp}`);
      }
    }

    // Export counters
    for (const [key, value] of Array.from(this.counters.entries())) {
      const safeName = key.replace(/[^a-zA-Z0-9_]/g, '_');
      lines.push(`# TYPE ${safeName} counter`);
      lines.push(`${safeName} ${value}`);
    }

    // Export gauges
    for (const [key, value] of Array.from(this.gauges.entries())) {
      const safeName = key.replace(/[^a-zA-Z0-9_]/g, '_');
      lines.push(`# TYPE ${safeName} gauge`);
      lines.push(`${safeName} ${value}`);
    }

    return lines.join('\n');
  }

  // ============================================================================
  // Metric Retrieval
  // ============================================================================

  /**
   * Get metrics for a time range
   */
  getMetrics(names: string[], timeRange: TimeRange): TypedMetric[] {
    const from = parseRelativeTime(timeRange.from).getTime();
    const to = parseRelativeTime(timeRange.to).getTime();

    const results: TypedMetric[] = [];

    for (const name of names) {
      const metrics = this.metrics.get(name) || [];
      for (const metric of metrics) {
        if (metric.timestamp >= from && metric.timestamp <= to) {
          results.push(metric);
        }
      }
    }

    return results.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get aggregated metric
   */
  getAggregation(name: string): AggregatedMetric | undefined {
    return this.aggregatedMetrics.get(name);
  }

  /**
   * Get latest value for a metric
   */
  getLatestValue(name: string): number | undefined {
    const metrics = this.metrics.get(name);
    return metrics?.[metrics.length - 1]?.value;
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  /**
   * Start metric collection
   */
  start(): void {
    if (this.collectionInterval) return;

    this.initializeService();

    // Collect immediately
    this.collectMetrics();

    // Start collection interval
    this.collectionInterval = setInterval(() => {
      this.collectMetrics();
      this.cleanup();
    }, this.config.collectionIntervalMs);

    logger.info(`${this.constructor.name} started`, {
      interval: this.config.collectionIntervalMs,
    });

    this.emit('started');
  }

  /**
   * Stop metric collection
   */
  stop(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    logger.info(`${this.constructor.name} stopped`);
    this.emit('stopped');
  }

  /**
   * Cleanup old metrics based on retention policy
   */
  protected cleanup(): void {
    const cutoff = Date.now() - this.config.retentionPeriodMs;

    for (const [name, metrics] of Array.from(this.metrics.entries())) {
      const filtered = metrics.filter((m) => m.timestamp > cutoff);

      if (filtered.length > this.config.maxDataPoints) {
        this.metrics.set(name, filtered.slice(-this.config.maxDataPoints));
      } else {
        this.metrics.set(name, filtered);
      }
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.aggregatedMetrics.clear();
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.activeAlerts.clear();

    logger.info(`${this.constructor.name} reset`);
    this.emit('reset');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MetricsCollectorConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart if running
    if (this.collectionInterval) {
      this.stop();
      this.start();
    }
  }
}

// Re-export types for convenience
export * from './types';

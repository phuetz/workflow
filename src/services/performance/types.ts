/**
 * Performance Module - Shared Types
 *
 * Common type definitions for all performance-related services.
 * Consolidates duplicate interfaces from:
 * - PerformanceMonitoringService
 * - PerformanceOptimizationService
 * - PerformanceMonitoringHub
 * - MetricsCollector
 */

// ============================================================================
// Core Metric Types
// ============================================================================

/**
 * Base metric interface
 */
export interface Metric {
  name: string;
  value: number;
  unit?: string;
  timestamp: number;
  tags?: Record<string, string>;
}

/**
 * Metric with type information for Prometheus-style metrics
 */
export interface TypedMetric extends Metric {
  type: MetricType;
  description?: string;
}

/**
 * Metric types supported by the system
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Metric threshold configuration
 */
export interface MetricThreshold {
  warning: number;
  critical: number;
}

/**
 * Metric definition for registration
 */
export interface MetricDefinition {
  name: string;
  type: MetricType;
  unit?: string;
  description?: string;
  aggregation?: AggregationType;
  retention?: number; // milliseconds
  thresholds?: MetricThreshold;
}

// ============================================================================
// System Metrics Types
// ============================================================================

/**
 * CPU metrics
 */
export interface CPUMetrics {
  usage: number; // percentage 0-100
  cores: number;
  loadAverage: [number, number, number]; // 1m, 5m, 15m
  user?: number;
  system?: number;
  idle?: number;
}

/**
 * Memory metrics
 */
export interface MemoryMetrics {
  used: number; // bytes
  total: number; // bytes
  free: number; // bytes
  percentage: number; // 0-100
  heapUsed?: number;
  heapTotal?: number;
  external?: number;
  rss?: number;
}

/**
 * Disk metrics
 */
export interface DiskMetrics {
  used: number; // bytes
  total: number; // bytes
  free: number; // bytes
  percentage: number; // 0-100
  readBytes?: number;
  writeBytes?: number;
  readOps?: number;
  writeOps?: number;
}

/**
 * Network metrics
 */
export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  packetsIn?: number;
  packetsOut?: number;
  errors?: number;
  dropped?: number;
}

/**
 * Combined system metrics snapshot
 */
export interface SystemMetrics {
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  disk?: DiskMetrics;
  network?: NetworkMetrics;
  uptime?: number;
  timestamp: number;
}

// ============================================================================
// Aggregation Types
// ============================================================================

/**
 * Aggregation types for metrics
 */
export type AggregationType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'p50' | 'p95' | 'p99';

/**
 * Aggregated metric values
 */
export interface AggregatedMetric {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  lastValue: number;
  lastTimestamp: number;
}

// ============================================================================
// Alert Types
// ============================================================================

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Alert comparison operators
 */
export type AlertOperator = 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';

/**
 * Alert configuration
 */
export interface AlertConfig {
  id: string;
  name: string;
  metricName: string;
  operator: AlertOperator;
  threshold: number;
  severity: AlertSeverity;
  message?: string;
  cooldownMs: number;
  enabled: boolean;
  duration?: number; // Duration threshold must be exceeded (ms)
  actions?: AlertAction[];
}

/**
 * Alert action types
 */
export interface AlertAction {
  type: 'notification' | 'webhook' | 'scale' | 'restart' | 'custom';
  config: Record<string, unknown>;
}

/**
 * Triggered alert instance
 */
export interface AlertInstance {
  config: AlertConfig;
  triggeredAt: number;
  currentValue: number;
  acknowledged: boolean;
  resolvedAt?: number;
}

// ============================================================================
// Collector Configuration
// ============================================================================

/**
 * Configuration for metrics collection
 */
export interface MetricsCollectorConfig {
  collectionIntervalMs: number;
  retentionPeriodMs: number;
  maxDataPoints: number;
  enableSystemMetrics: boolean;
  enableApplicationMetrics: boolean;
  alertCooldownMs: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_COLLECTOR_CONFIG: MetricsCollectorConfig = {
  collectionIntervalMs: 5000, // 5 seconds
  retentionPeriodMs: 3600000, // 1 hour
  maxDataPoints: 720, // 1 hour at 5-second intervals
  enableSystemMetrics: true,
  enableApplicationMetrics: true,
  alertCooldownMs: 60000, // 1 minute
};

// ============================================================================
// Event Types
// ============================================================================

/**
 * Events emitted by performance services
 */
export interface PerformanceEvents {
  'metric:recorded': TypedMetric;
  'metrics:collected': SystemMetrics;
  'alert:triggered': AlertInstance;
  'alert:resolved': AlertInstance;
  'threshold:exceeded': { metric: string; value: number; threshold: number };
}

// ============================================================================
// Prometheus Types
// ============================================================================

/**
 * Prometheus metric format
 */
export interface PrometheusMetric {
  name: string;
  help: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp?: number;
}

// ============================================================================
// Time Range Types
// ============================================================================

/**
 * Time range for querying metrics
 */
export interface TimeRange {
  from: Date | string; // Can be relative like 'now-1h'
  to: Date | string;
}

/**
 * Parse relative time strings
 */
export function parseRelativeTime(time: Date | string): Date {
  if (time instanceof Date) return time;

  if (typeof time === 'string' && time.startsWith('now')) {
    const match = time.match(/now-(\d+)([smhd])/);
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2];
      const ms: Record<string, number> = {
        's': 1000,
        'm': 60000,
        'h': 3600000,
        'd': 86400000,
      };
      return new Date(Date.now() - value * (ms[unit] || 1000));
    }
    return new Date();
  }

  return new Date(time);
}

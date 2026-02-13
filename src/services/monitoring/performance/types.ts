/**
 * Performance Monitoring Types
 *
 * All interfaces and types used by the performance monitoring subsystem.
 * @module monitoring/performance/types
 */

import type { PerformanceAlert } from '../../../types/performance';

// Re-export for convenience
export type { PerformanceAlert };

/**
 * System-level metrics including CPU, memory, disk, and network
 */
export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: [number, number, number];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  uptime: number;
}

/**
 * API performance metrics
 */
export interface APIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  responseTimeHistory: Array<{ timestamp: Date; avgTime: number }>;
  endpointMetrics: Map<string, { count: number; totalTime: number; errors: number }>;
}

/**
 * Database performance metrics
 */
export interface DatabaseMetrics {
  totalQueries: number;
  avgQueryTime: number;
  slowQueries: Array<{ query: string; duration: number; timestamp: Date }>;
  connectionPoolSize: number;
  activeConnections: number;
  cacheHitRate: number;
  queryErrors: number;
}

/**
 * Workflow execution metrics
 */
export interface WorkflowMetrics {
  totalExecutions: number;
  activeExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTime: number;
  executionQueue: number;
  nodeExecutions: Map<string, number>;
  successRate?: number;
}

/**
 * Cache performance metrics
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  size: number;
  memoryUsage: number;
}

/**
 * Error metric entry
 */
export interface ErrorMetric {
  code: string;
  message: string;
  source: string;
  timestamp: Date;
  stack?: string;
  count: number;
  lastOccurred: Date;
}

/**
 * Complete internal performance metrics structure
 */
export interface InternalPerformanceMetrics {
  timestamp: Date;
  system: SystemMetrics;
  api: APIMetrics;
  database: DatabaseMetrics;
  workflows: WorkflowMetrics;
  cache: CacheMetrics;
  errors: ErrorMetric[];
  alerts: PerformanceAlert[];
}

/**
 * Metric snapshot for history tracking
 */
export interface MetricSnapshot {
  timestamp: Date;
  cpu: number;
  memory: number;
  disk: number;
  responseTime: number;
  errorRate: number;
  activeWorkflows: number;
}

/**
 * Alert rule definition
 */
export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: InternalPerformanceMetrics) => boolean;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  cooldown: number;
}

/**
 * API request data for recording
 */
export interface APIRequestData {
  endpoint: string;
  method: string;
  timestamp: Date;
}

/**
 * API response data for recording
 */
export interface APIResponseData {
  endpoint: string;
  method: string;
  status: number;
  duration: number;
  timestamp: Date;
}

/**
 * Database query data for recording
 */
export interface DatabaseQueryData {
  query: string;
  duration: number;
  success: boolean;
  timestamp: Date;
}

/**
 * Workflow execution data for recording
 */
export interface WorkflowExecutionData {
  workflowId: string;
  status: 'started' | 'completed' | 'failed';
  duration?: number;
  nodeCount?: number;
  timestamp: Date;
}

/**
 * Cache access data for recording
 */
export interface CacheAccessData {
  hit: boolean;
  key: string;
  size?: number;
  timestamp: Date;
}

/**
 * Error data for recording
 */
export interface ErrorData {
  code: string;
  message: string;
  source: string;
  timestamp: Date;
  stack?: string;
}

/**
 * History bucket type
 */
export type HistoryBucket = '1m' | '5m' | '1h';

/**
 * Export format type
 */
export type ExportFormat = 'json' | 'csv';

/**
 * Aggregation Types
 * Type definitions for the aggregation module
 */

import type {
  DateRange,
  TimeInterval,
  TopWorkflow,
  SlowestNode,
  TimeSeriesData,
} from '../../types/advanced-analytics';

/**
 * Execution metrics summary
 */
export interface ExecutionMetricsSummary {
  total: number;
  successful: number;
  failed: number;
  running: number;
  successRate: number;
}

/**
 * Performance metrics summary
 */
export interface PerformanceMetricsSummary {
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
}

/**
 * Cost metrics summary
 */
export interface CostMetricsSummary {
  total: number;
  byCategory: Record<string, number>;
  trend: number;
}

/**
 * Aggregated metrics response
 */
export interface AggregatedMetricsResponse {
  period: DateRange;
  interval: TimeInterval;
  metrics: {
    executions: ExecutionMetricsSummary;
    performance: PerformanceMetricsSummary;
    cost: CostMetricsSummary;
    topWorkflows: TopWorkflow[];
    slowestNodes: SlowestNode[];
  };
}

/**
 * Workflow analytics detailed response
 */
export interface WorkflowAnalyticsResponse {
  workflowId: string;
  workflowName: string;
  period: DateRange;
  executions: {
    total: number;
    successful: number;
    failed: number;
    canceled: number;
    successRate: number;
  };
  performance: {
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
  };
  cost: {
    total: number;
    average: number;
    trend: number;
  };
  trends: TimeSeriesData[];
}

/**
 * Execution data for trend generation
 */
export interface ExecutionTrendData {
  id: string;
  status: string;
  duration: number | null;
  startedAt: Date;
}

/**
 * Anomaly detection result
 */
export interface AnomalyResult {
  index: number;
  value: number;
  deviation: number;
}

/**
 * Trend direction
 */
export type TrendDirection = 'improving' | 'stable' | 'degrading';

/**
 * Metric type for top workflows query
 */
export type TopWorkflowMetric = 'executions' | 'cost' | 'latency';

/**
 * Cost configuration from environment
 */
export interface CostConfig {
  costPerMinute: number;
  costPerApiCall: number;
  costPerToken: number;
  costPerExecutionStorage: number;
}

/**
 * Get cost configuration from environment variables
 */
export function getCostConfig(): CostConfig {
  return {
    costPerMinute: parseFloat(process.env.COST_PER_MINUTE || '0.001'),
    costPerApiCall: parseFloat(process.env.COST_PER_API_CALL || '0.0001'),
    costPerToken: parseFloat(process.env.COST_PER_TOKEN || '0.00001'),
    costPerExecutionStorage: parseFloat(process.env.COST_PER_EXECUTION_STORAGE || '0.00001'),
  };
}

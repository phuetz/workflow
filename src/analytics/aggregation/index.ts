/**
 * Aggregation Module
 * Barrel export for all aggregation components
 */

// Types
export type {
  ExecutionMetricsSummary,
  PerformanceMetricsSummary,
  CostMetricsSummary,
  AggregatedMetricsResponse,
  WorkflowAnalyticsResponse,
  ExecutionTrendData,
  AnomalyResult,
  TrendDirection,
  TopWorkflowMetric,
  CostConfig,
} from './types';

export { getCostConfig } from './types';

// Statistics Calculator
export { StatisticsCalculator, statisticsCalculator } from './StatisticsCalculator';

// Time Series Aggregator
export { TimeSeriesAggregator, timeSeriesAggregator } from './TimeSeriesAggregator';

// Metrics Aggregator
export { MetricsAggregator, metricsAggregator } from './MetricsAggregator';

// Report Builder
export { ReportBuilder, reportBuilder } from './ReportBuilder';

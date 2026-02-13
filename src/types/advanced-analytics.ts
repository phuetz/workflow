/**
 * Advanced Analytics Types
 * Comprehensive type definitions for the advanced analytics system
 */

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface TimeSeriesData {
  metric: string;
  dataPoints: MetricDataPoint[];
  aggregation: AggregationType;
  interval: TimeInterval;
}

export type AggregationType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'p50' | 'p95' | 'p99';
export type TimeInterval = '1m' | '5m' | '15m' | '1h' | '6h' | '1d' | '1w' | '1M';

export interface ExecutionMetrics {
  workflowId: string;
  executionId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'success' | 'failed' | 'running' | 'canceled';
  nodeExecutions: NodeExecutionMetric[];
  resourceUsage: ResourceUsage;
  cost: ExecutionCost;
}

export interface NodeExecutionMetric {
  nodeId: string;
  nodeType: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'success' | 'failed' | 'skipped';
  apiCalls?: number;
  dataSize?: number;
  errorMessage?: string;
}

export interface ResourceUsage {
  cpuTime: number; // milliseconds
  memoryPeak: number; // bytes
  networkIn: number; // bytes
  networkOut: number; // bytes
  storageUsed: number; // bytes
}

export interface ExecutionCost {
  apiCalls: number;
  llmTokens: number;
  compute: number;
  storage: number;
  total: number;
  breakdown: CostBreakdownItem[];
}

export interface CostBreakdownItem {
  category: string;
  subcategory?: string;
  amount: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

export interface WorkflowAnalytics {
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
    trend: number; // percentage change
  };
  trends: TimeSeriesData[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface AggregatedMetrics {
  period: DateRange;
  interval: TimeInterval;
  metrics: {
    executions: {
      total: number;
      successful: number;
      failed: number;
      running: number;
      successRate: number;
    };
    performance: {
      avgLatency: number;
      p50Latency: number;
      p95Latency: number;
      p99Latency: number;
      throughput: number; // executions per hour
    };
    cost: {
      total: number;
      byCategory: Record<string, number>;
      trend: number;
    };
    topWorkflows: TopWorkflow[];
    slowestNodes: SlowestNode[];
  };
}

export interface TopWorkflow {
  workflowId: string;
  workflowName: string;
  metric: string;
  value: number;
  rank: number;
}

export interface SlowestNode {
  nodeType: string;
  avgDuration: number;
  executionCount: number;
  totalDuration: number;
}

export interface AnalyticsQuery {
  metric: string;
  dateRange: DateRange;
  interval?: TimeInterval;
  aggregation?: AggregationType;
  filters?: AnalyticsFilter[];
  groupBy?: string[];
  limit?: number;
}

export interface AnalyticsFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin';
  value: unknown;
}

export interface AnalyticsInsight {
  id: string;
  type: InsightType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  impact: InsightImpact;
  recommendations: Recommendation[];
  createdAt: Date;
  affectedWorkflows?: string[];
}

export type InsightType =
  | 'performance'
  | 'cost'
  | 'reliability'
  | 'optimization'
  | 'anomaly';

export interface InsightImpact {
  metric: string;
  current: number;
  potential: number;
  improvement: number; // percentage
  estimatedSavings?: number; // in cost
}

export interface Recommendation {
  action: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  implementation?: string;
}

export interface CostBudget {
  id: string;
  name: string;
  limit: number;
  period: 'daily' | 'weekly' | 'monthly';
  current: number;
  percentage: number;
  alerts: BudgetAlert[];
  workflowIds?: string[];
}

export interface BudgetAlert {
  threshold: number; // percentage
  notified: boolean;
  notifiedAt?: Date;
  channels: ('email' | 'slack' | 'webhook')[];
}

export interface CustomMetric {
  id: string;
  name: string;
  description: string;
  query: AnalyticsQuery;
  displayType: 'line' | 'bar' | 'pie' | 'number' | 'gauge';
  refreshInterval?: number; // seconds
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'insight';
  title: string;
  metric?: CustomMetric;
  chartConfig?: ChartConfig;
  position: { x: number; y: number; w: number; h: number };
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'area' | 'pie' | 'scatter';
  series: ChartSeries[];
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  legend?: LegendConfig;
}

export interface ChartSeries {
  name: string;
  data: Array<{ x: number | string; y: number }>;
  color?: string;
}

export interface AxisConfig {
  label: string;
  type: 'linear' | 'time' | 'category';
  format?: string;
}

export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export interface DashboardLayout {
  columns: number;
  rowHeight: number;
  isDraggable: boolean;
  isResizable: boolean;
}

export interface AnalyticsEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  data: Record<string, unknown>;
}

export type EventType =
  | 'workflow.started'
  | 'workflow.completed'
  | 'workflow.failed'
  | 'node.started'
  | 'node.completed'
  | 'node.failed'
  | 'api.call'
  | 'cost.threshold'
  | 'performance.degradation';

export interface RetentionPolicy {
  detailedData: number; // days
  aggregatedData: number; // days
  rawEvents: number; // days
}

export interface DataWarehouseConfig {
  retention: RetentionPolicy;
  aggregationIntervals: TimeInterval[];
  partitionBy: 'day' | 'week' | 'month';
  compressionEnabled: boolean;
}

export interface AnalyticsExport {
  format: 'csv' | 'json' | 'pdf' | 'excel';
  data: unknown;
  query: AnalyticsQuery;
  generatedAt: Date;
}

export interface PerformanceAnomaly {
  id: string;
  detectedAt: Date;
  metric: string;
  expected: number;
  actual: number;
  deviation: number; // percentage
  severity: 'low' | 'medium' | 'high';
  possibleCauses: string[];
}

export interface CostOptimization {
  id: string;
  workflowId: string;
  currentCost: number;
  optimizedCost: number;
  savings: number;
  savingsPercentage: number;
  optimizations: OptimizationAction[];
}

export interface OptimizationAction {
  type: 'cache' | 'parallel' | 'batch' | 'provider-switch' | 'retry-logic';
  description: string;
  impact: number; // cost savings
  complexity: 'low' | 'medium' | 'high';
  autoApplicable: boolean;
}

export interface NodePerformanceProfile {
  nodeType: string;
  avgDuration: number;
  p95Duration: number;
  executionCount: number;
  failureRate: number;
  costPerExecution: number;
  trends: {
    duration: 'improving' | 'stable' | 'degrading';
    reliability: 'improving' | 'stable' | 'degrading';
  };
}

export interface WorkflowHealthScore {
  workflowId: string;
  score: number; // 0-100
  factors: {
    reliability: number;
    performance: number;
    cost: number;
    efficiency: number;
  };
  issues: HealthIssue[];
}

export interface HealthIssue {
  severity: 'low' | 'medium' | 'high';
  category: string;
  description: string;
  impact: number; // on overall score
}

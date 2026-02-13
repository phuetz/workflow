/**
 * Workflow Analytics Type Definitions
 * Types for workflow analytics and insights dashboard
 */

export interface WorkflowAnalytics {
  workflowId: string;
  workflowName: string;
  timeRange: AnalyticsTimeRange;
  metrics: WorkflowMetrics;
  performance: PerformanceMetrics;
  usage: UsageMetrics;
  reliability: ReliabilityMetrics;
  trends: TrendData[];
  insights: AnalyticsInsight[];
  lastUpdated: Date;
}

export interface AnalyticsTimeRange {
  start: Date;
  end: Date;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

export interface WorkflowMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  successRate: number;
  throughput: number; // executions per hour
  peakConcurrency: number;
  uniqueUsers: number;
}

export interface PerformanceMetrics {
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  slowestExecution: {
    executionId: string;
    duration: number;
    timestamp: Date;
  };
  fastestExecution: {
    executionId: string;
    duration: number;
    timestamp: Date;
  };
  bottleneckNodes: Array<{
    nodeId: string;
    nodeName: string;
    averageDuration: number;
    executionCount: number;
  }>;
  memoryUsage: {
    average: number;
    peak: number;
    timestamp: Date;
  };
  cpuUsage: {
    average: number;
    peak: number;
    timestamp: Date;
  };
}

export interface UsageMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  topUsers: Array<{
    userId: string;
    username?: string;
    executionCount: number;
    lastActivity: Date;
  }>;
  executionsByTime: Array<{
    timestamp: Date;
    count: number;
  }>;
  executionsByDay: Array<{
    day: string;
    count: number;
  }>;
  popularNodes: Array<{
    nodeType: string;
    usageCount: number;
    successRate: number;
  }>;
}

export interface ReliabilityMetrics {
  uptime: number; // percentage
  errorRate: number; // percentage
  mtbf: number; // mean time between failures (hours)
  mttr: number; // mean time to recovery (minutes)
  errorDistribution: Array<{
    errorType: string;
    count: number;
    percentage: number;
  }>;
  recentIncidents: Array<{
    id: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    resolved: boolean;
    resolutionTime?: number;
  }>;
}

export interface TrendData {
  timestamp: Date;
  metrics: {
    executions: number;
    successRate: number;
    averageLatency: number;
    errorCount: number;
    activeUsers: number;
  };
}

export interface AnalyticsInsight {
  id: string;
  type: InsightType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendation?: string;
  value: number;
  change: number; // percentage change
  timestamp: Date;
  affectedWorkflows?: string[];
  affectedNodes?: string[];
}

export type InsightType = 
  | 'performance_degradation'
  | 'error_spike'
  | 'usage_trend'
  | 'efficiency_opportunity'
  | 'resource_optimization'
  | 'reliability_concern'
  | 'user_behavior'
  | 'cost_optimization';

export interface AnalyticsDashboardConfig {
  refreshInterval: number; // milliseconds
  defaultTimeRange: AnalyticsTimeRange;
  enableRealTimeUpdates: boolean;
  alertThresholds: {
    errorRate: number;
    latencyThreshold: number;
    throughputDrop: number;
  };
  widgets: DashboardWidget[];
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, unknown>;
  visible: boolean;
}

export type WidgetType = 
  | 'execution_trend'
  | 'success_rate'
  | 'latency_distribution'
  | 'error_breakdown'
  | 'top_users'
  | 'node_performance'
  | 'resource_usage'
  | 'recent_activity'
  | 'insights_feed'
  | 'uptime_status';

export interface AnalyticsFilter {
  workflowIds?: string[];
  userIds?: string[];
  timeRange?: AnalyticsTimeRange;
  status?: ('success' | 'failed' | 'running')[];
  nodeTypes?: string[];
  executionTags?: string[];
  minimumDuration?: number;
  maximumDuration?: number;
}

export interface AnalyticsQuery {
  filters: AnalyticsFilter;
  groupBy?: ('workflow' | 'user' | 'node' | 'time')[];
  metrics: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AnalyticsReport {
  id: string;
  name: string;
  description: string;
  query: AnalyticsQuery;
  schedule?: ReportSchedule;
  format: 'json' | 'csv' | 'pdf' | 'html';
  recipients: string[];
  createdBy: string;
  createdAt: Date;
  lastGenerated?: Date;
  enabled: boolean;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  timezone: string;
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
}

export interface ComparisonAnalysis {
  baseline: WorkflowAnalytics;
  comparison: WorkflowAnalytics;
  differences: {
    metrics: Record<keyof WorkflowMetrics, {
      baseline: number;
      comparison: number;
      change: number;
      changePercent: number;
    }>;
    insights: AnalyticsInsight[];
  };
}

export interface PredictiveAnalytics {
  workflowId: string;
  predictions: {
    nextHourExecutions: number;
    nextDayExecutions: number;
    nextWeekExecutions: number;
    expectedFailures: number;
    resourceRequirements: {
      cpu: number;
      memory: number;
      storage: number;
    };
  };
  confidence: number; // 0-1
  modelInfo: {
    algorithm: string;
    trainedOn: Date;
    accuracy: number;
    features: string[];
  };
}

export interface AnalyticsAlert {
  id: string;
  type: 'threshold' | 'anomaly' | 'trend';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  workflowId?: string;
  metric: string;
  threshold?: number;
  currentValue: number;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  actions: AlertAction[];
}

export interface AlertAction {
  id: string;
  type: 'email' | 'webhook' | 'slack' | 'pagerduty';
  config: Record<string, unknown>;
  enabled: boolean;
}

// Utility types for dashboard components

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    fill?: boolean;
  }>;
}

export interface MetricCard {
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  format?: 'number' | 'percentage' | 'duration' | 'currency';
  icon?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

// Helper functions

export function calculateSuccessRate(successful: number, total: number): number {
  return total > 0 ? (successful / total) * 100 : 0;
}

export function calculateThroughput(executions: number, timeRangeHours: number): number {
  return timeRangeHours > 0 ? executions / timeRangeHours : 0;
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) return `${Math.round(milliseconds)}ms`;
  if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
  if (milliseconds < 3600000) return `${(milliseconds / 60000).toFixed(1)}m`;
  return `${(milliseconds / 3600000).toFixed(1)}h`;
}

export function formatMetricValue(
  value: number,
  format: MetricCard['format'] = 'number'
): string {
  switch (format) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'duration':
      return formatDuration(value);
    case 'currency':
      return `$${value.toFixed(2)}`;
    default:
      return value.toLocaleString();
  }
}

export function getInsightSeverityColor(severity: AnalyticsInsight['severity']): string {
  switch (severity) {
    case 'critical':
      return 'red';
    case 'warning':
      return 'yellow';
    case 'info':
      return 'blue';
    default:
      return 'gray';
  }
}

export function calculatePercentileLatency(latencies: number[], percentile: number): number {
  if (latencies.length === 0) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] || 0;
}

export function groupDataByTime(
  data: Array<{ timestamp: Date; value: number }>,
  granularity: AnalyticsTimeRange['granularity']
): Array<{ timestamp: Date; value: number }> {
  const grouped = new Map<string, { sum: number; count: number; timestamp: Date }>();

  for (const item of data) {
    const date = new Date(item.timestamp);
    let key: string;

    switch (granularity) {
      case 'hour':
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
        break;
      case 'day':
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        break;
      case 'week': {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
        break;
      }
      case 'month':
        key = `${date.getFullYear()}-${date.getMonth()}`;
        break;
    }

    if (!grouped.has(key)) {
      grouped.set(key, { sum: 0, count: 0, timestamp: date });
    }

    const group = grouped.get(key)!;
    group.sum += item.value;
    group.count += 1;
  }

  return Array.from(grouped.values()).map(group => ({
    timestamp: group.timestamp,
    value: group.sum / group.count
  }));
}
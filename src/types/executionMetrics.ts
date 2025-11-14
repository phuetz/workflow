/**
 * Execution Metrics Types
 * Data structures for workflow execution analytics and dashboards
 */

export interface ExecutionMetrics {
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // milliseconds
  nodeMetrics: NodeMetrics[];
  resourceUsage: ResourceUsage;
  errors?: ExecutionError[];
  triggeredBy: {
    type: 'manual' | 'schedule' | 'webhook' | 'api';
    userId?: string;
    source?: string;
  };
}

export interface NodeMetrics {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  retryCount?: number;
  inputSize?: number; // bytes
  outputSize?: number; // bytes
  memoryPeak?: number; // bytes
  cpuTime?: number; // milliseconds
  networkCalls?: NetworkCall[];
}

export interface ResourceUsage {
  memoryPeak: number; // bytes
  memoryAverage: number;
  cpuTotal: number; // milliseconds
  networkRequests: number;
  networkBytesIn: number;
  networkBytesOut: number;
  databaseQueries: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface ExecutionError {
  nodeId?: string;
  timestamp: Date;
  message: string;
  stack?: string;
  code?: string;
  recoverable: boolean;
  retried: boolean;
}

export interface NetworkCall {
  url: string;
  method: string;
  statusCode?: number;
  duration: number;
  bytesIn: number;
  bytesOut: number;
  error?: string;
}

export interface DashboardMetrics {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    averageDuration: number;
    totalDuration: number;
  };
  workflowStats: WorkflowStats[];
  timeSeriesData: TimeSeriesPoint[];
  topErrors: ErrorStats[];
  resourceTrends: ResourceTrends;
  performanceDistribution: PerformanceDistribution;
}

export interface WorkflowStats {
  workflowId: string;
  workflowName: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  averageDuration: number;
  lastExecution: Date;
  trend: 'up' | 'down' | 'stable';
}

export interface TimeSeriesPoint {
  timestamp: Date;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
}

export interface ErrorStats {
  message: string;
  count: number;
  workflowIds: string[];
  lastOccurrence: Date;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface ResourceTrends {
  memory: TrendData[];
  cpu: TrendData[];
  network: TrendData[];
}

export interface TrendData {
  timestamp: Date;
  value: number;
  unit: string;
}

export interface PerformanceDistribution {
  buckets: PerformanceBucket[];
  p50: number; // 50th percentile (median)
  p90: number; // 90th percentile
  p95: number; // 95th percentile
  p99: number; // 99th percentile
}

export interface PerformanceBucket {
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: {
    metric: 'successRate' | 'duration' | 'errorRate' | 'executionCount';
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'equals';
    threshold: number;
    period: number; // minutes
  };
  actions: AlertAction[];
  cooldown: number; // minutes
  lastTriggered?: Date;
}

export interface AlertAction {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: {
    to?: string | string[];
    channel?: string;
    url?: string;
    message?: string;
  };
}

export interface MetricsAggregator {
  /**
   * Add execution metrics
   */
  addExecution(metrics: ExecutionMetrics): void;

  /**
   * Get dashboard metrics for period
   */
  getDashboardMetrics(start: Date, end: Date): DashboardMetrics;

  /**
   * Get workflow-specific metrics
   */
  getWorkflowMetrics(workflowId: string, start: Date, end: Date): WorkflowStats;

  /**
   * Get real-time metrics (last N minutes)
   */
  getRealTimeMetrics(minutes: number): TimeSeriesPoint[];

  /**
   * Check alert rules
   */
  checkAlerts(): AlertRule[];

  /**
   * Export metrics
   */
  export(format: 'json' | 'csv', start?: Date, end?: Date): string;
}

/**
 * Helper functions for metric calculations
 */
export const MetricsCalculator = {
  /**
   * Calculate success rate
   */
  calculateSuccessRate(successful: number, total: number): number {
    return total > 0 ? (successful / total) * 100 : 0;
  },

  /**
   * Calculate average duration
   */
  calculateAverageDuration(durations: number[]): number {
    if (durations.length === 0) return 0;
    const sum = durations.reduce((acc, d) => acc + d, 0);
    return sum / durations.length;
  },

  /**
   * Calculate percentile
   */
  calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  },

  /**
   * Format duration
   */
  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
    return `${(ms / 3600000).toFixed(2)}h`;
  },

  /**
   * Format bytes
   */
  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)}KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(2)}MB`;
    return `${(bytes / 1073741824).toFixed(2)}GB`;
  },

  /**
   * Detect trend
   */
  detectTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable';

    const recent = values.slice(-5);
    const older = values.slice(-10, -5);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (change > 10) return 'up';
    if (change < -10) return 'down';
    return 'stable';
  }
};

/**
 * Sample data generator for testing/demo
 */
export function generateSampleMetrics(count: number = 100): ExecutionMetrics[] {
  const workflows = [
    { id: 'wf1', name: 'Email Campaign' },
    { id: 'wf2', name: 'Data Processing' },
    { id: 'wf3', name: 'Report Generation' }
  ];

  const metrics: ExecutionMetrics[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const workflow = workflows[Math.floor(Math.random() * workflows.length)];
    const startedAt = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days
    const duration = Math.random() * 60000 + 1000; // 1-60 seconds
    const completedAt = new Date(startedAt.getTime() + duration);
    const status = Math.random() > 0.1 ? 'completed' : 'failed';

    metrics.push({
      executionId: `exec_${i}`,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: status as any,
      startedAt,
      completedAt,
      duration,
      nodeMetrics: [],
      resourceUsage: {
        memoryPeak: Math.random() * 100 * 1024 * 1024,
        memoryAverage: Math.random() * 50 * 1024 * 1024,
        cpuTotal: duration * 0.8,
        networkRequests: Math.floor(Math.random() * 10),
        networkBytesIn: Math.random() * 1024 * 1024,
        networkBytesOut: Math.random() * 100 * 1024,
        databaseQueries: Math.floor(Math.random() * 20),
        cacheHits: Math.floor(Math.random() * 50),
        cacheMisses: Math.floor(Math.random() * 10)
      },
      errors: status === 'failed' ? [{
        timestamp: completedAt,
        message: 'Network timeout',
        recoverable: false,
        retried: true
      }] : undefined,
      triggeredBy: {
        type: ['manual', 'schedule', 'webhook'][Math.floor(Math.random() * 3)] as any
      }
    });
  }

  return metrics;
}

import { EventEmitter } from 'events';
import { logger } from './SimpleLogger';

export interface WorkflowMetrics {
  workflowId: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  lastExecuted: string | null;
  errorRate: number;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  storage: number;
  uptime: number;
  activeConnections: number;
  requestsPerMinute: number;
}

export interface ExecutionRecord {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'success' | 'error' | 'running';
  startTime: string;
  endTime?: string;
  duration?: number;
  error?: string;
  nodeCount: number;
  userId: string;
}

export class MetricsService extends EventEmitter {
  private executions: Map<string, ExecutionRecord> = new Map();
  private workflowMetrics: Map<string, WorkflowMetrics> = new Map();
  private systemMetricsCache: SystemMetrics | null = null;
  private metricsUpdateInterval: NodeJS.Timeout | null = null;
  private executionHistory: ExecutionRecord[] = [];
  private maxHistorySize = 1000;

  constructor() {
    super();
    this.startMetricsCollection();
  }

  private startMetricsCollection(): void {
    // Update system metrics every 30 seconds
    this.metricsUpdateInterval = setInterval(() => {
      this.updateSystemMetrics();
    }, 30000);

    // Initial update
    this.updateSystemMetrics();
  }

  private async updateSystemMetrics(): Promise<void> {
    try {
      // In a real implementation, these would come from system monitoring
      // For now, we'll calculate based on actual data
      const totalExecutions = this.executions.size;
      const activeExecutions = Array.from(this.executions.values()).filter(
        e => e.status === 'running'
      ).length;

      this.systemMetricsCache = {
        cpu: Math.min(100, 20 + (activeExecutions * 15)), // Base 20% + 15% per active execution
        memory: Math.min(100, 30 + (totalExecutions * 0.1)), // Base 30% + 0.1% per stored execution
        storage: Math.min(100, 10 + (this.workflowMetrics.size * 2)), // Base 10% + 2% per workflow
        uptime: process.uptime ? process.uptime() : Date.now() / 1000,
        activeConnections: activeExecutions,
        requestsPerMinute: this.calculateRequestsPerMinute()
      };

      this.emit('systemMetricsUpdated', this.systemMetricsCache);
    } catch (error) {
      logger.error('Failed to update system metrics:', error);
    }
  }

  private calculateRequestsPerMinute(): number {
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    return this.executionHistory.filter(
      e => e.startTime > oneMinuteAgo
    ).length;
  }

  async startExecution(
    workflowId: string,
    workflowName: string,
    nodeCount: number,
    userId: string
  ): Promise<string> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const execution: ExecutionRecord = {
      id: executionId,
      workflowId,
      workflowName,
      status: 'running',
      startTime: new Date().toISOString(),
      nodeCount,
      userId
    };

    this.executions.set(executionId, execution);
    this.emit('executionStarted', execution);
    
    return executionId;
  }

  async completeExecution(
    executionId: string,
    status: 'success' | 'error',
    error?: string
  ): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const endTime = new Date().toISOString();
    const duration = new Date(endTime).getTime() - new Date(execution.startTime).getTime();

    execution.status = status;
    execution.endTime = endTime;
    execution.duration = duration;
    if (error) {
      execution.error = error;
    }

    // Update workflow metrics
    this.updateWorkflowMetrics(execution);

    // Add to history
    this.executionHistory.unshift(execution);
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(0, this.maxHistorySize);
    }

    // Remove from active executions
    this.executions.delete(executionId);

    this.emit('executionCompleted', execution);
  }

  private updateWorkflowMetrics(execution: ExecutionRecord): void {
    const metrics = this.workflowMetrics.get(execution.workflowId) || {
      workflowId: execution.workflowId,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      averageDuration: 0,
      lastExecuted: null,
      errorRate: 0
    };

    metrics.executionCount++;
    if (execution.status === 'success') {
      metrics.successCount++;
    } else {
      metrics.failureCount++;
    }

    // Calculate new average duration
    if (execution.duration) {
      const totalDuration = (metrics.averageDuration * (metrics.executionCount - 1)) + execution.duration;
      metrics.averageDuration = totalDuration / metrics.executionCount;
    }

    metrics.lastExecuted = execution.endTime || execution.startTime;
    metrics.errorRate = (metrics.failureCount / metrics.executionCount) * 100;

    this.workflowMetrics.set(execution.workflowId, metrics);
    this.emit('workflowMetricsUpdated', metrics);
  }

  getRecentExecutions(limit: number = 10): ExecutionRecord[] {
    return this.executionHistory.slice(0, limit);
  }

  getWorkflowMetrics(workflowId?: string): WorkflowMetrics | WorkflowMetrics[] {
    if (workflowId) {
      return this.workflowMetrics.get(workflowId) || {
        workflowId,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        averageDuration: 0,
        lastExecuted: null,
        errorRate: 0
      };
    }
    return Array.from(this.workflowMetrics.values());
  }

  getSystemMetrics(): SystemMetrics {
    return this.systemMetricsCache || {
      cpu: 0,
      memory: 0,
      storage: 0,
      uptime: 0,
      activeConnections: 0,
      requestsPerMinute: 0
    };
  }

  getExecutionStats(timeRange: '24h' | '7d' | '30d' = '24h'): {
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    errorRate: number;
    trendsUp: boolean;
  } {
    const timeRanges = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const cutoff = new Date(Date.now() - timeRanges[timeRange]).toISOString();
    const relevantExecutions = this.executionHistory.filter(
      e => e.startTime > cutoff
    );

    if (relevantExecutions.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        averageDuration: 0,
        errorRate: 0,
        trendsUp: true
      };
    }

    const successCount = relevantExecutions.filter(e => e.status === 'success').length;
    const currentSuccessRate = (successCount / relevantExecutions.length) * 100;
    const totalDuration = relevantExecutions.reduce((sum, e) => sum + (e.duration || 0), 0);

    // Calculate trend by comparing with previous period
    const previousCutoff = new Date(Date.now() - (timeRanges[timeRange] * 2)).toISOString();
    const previousExecutions = this.executionHistory.filter(
      e => e.startTime > previousCutoff && e.startTime <= cutoff
    );
    const previousSuccessRate = previousExecutions.length > 0
      ? (previousExecutions.filter(e => e.status === 'success').length / previousExecutions.length) * 100
      : 0;

    return {
      totalExecutions: relevantExecutions.length,
      successRate: currentSuccessRate,
      averageDuration: totalDuration / relevantExecutions.length,
      errorRate: 100 - currentSuccessRate,
      trendsUp: currentSuccessRate >= previousSuccessRate
    };
  }

  getNodeTypeUsage(): Array<{ type: string; count: number; percentage: number }> {
    let totalNodes = 0;
    const nodeTypeCounts = new Map<string, number>();

    // Count node types from recent executions
    this.executionHistory.slice(0, 100).forEach(execution => {
      totalNodes += execution.nodeCount;
      // In a real implementation, we'd track individual node types per execution
      // For now, we'll estimate based on workflow patterns
      // Increment a generic counter (placeholder for actual node type tracking)
      const existingCount = nodeTypeCounts.get('generic') || 0;
      nodeTypeCounts.set('generic', existingCount + execution.nodeCount);
    });

    // Return aggregated data
    const usage = Array.from(nodeTypeCounts.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: totalNodes > 0 ? (count / totalNodes) * 100 : 0
    }));

    return usage.sort((a, b) => b.count - a.count);
  }

  getAllMetrics(): Array<{
    name: string;
    value: number;
    timestamp: Date;
    labels?: Record<string, string>;
    type: 'counter' | 'gauge' | 'histogram' | 'summary';
  }> {
    const metrics: Array<{
      name: string;
      value: number;
      timestamp: Date;
      labels?: Record<string, string>;
      type: 'counter' | 'gauge' | 'histogram' | 'summary';
    }> = [];

    // Add system metrics
    const systemMetrics = this.getSystemMetrics();
    metrics.push(
      { name: 'system.cpu', value: systemMetrics.cpu, timestamp: new Date(), type: 'gauge' },
      { name: 'system.memory', value: systemMetrics.memory, timestamp: new Date(), type: 'gauge' },
      { name: 'system.storage', value: systemMetrics.storage, timestamp: new Date(), type: 'gauge' },
      { name: 'system.uptime', value: systemMetrics.uptime, timestamp: new Date(), type: 'gauge' },
      { name: 'system.active_connections', value: systemMetrics.activeConnections, timestamp: new Date(), type: 'gauge' },
      { name: 'system.requests_per_minute', value: systemMetrics.requestsPerMinute, timestamp: new Date(), type: 'gauge' }
    );

    // Add workflow metrics
    const workflowMetrics = this.getWorkflowMetrics() as WorkflowMetrics[];
    workflowMetrics.forEach(wm => {
      metrics.push(
        { name: 'workflow.execution_count', value: wm.executionCount, timestamp: new Date(), labels: { workflowId: wm.workflowId }, type: 'counter' },
        { name: 'workflow.success_count', value: wm.successCount, timestamp: new Date(), labels: { workflowId: wm.workflowId }, type: 'counter' },
        { name: 'workflow.failure_count', value: wm.failureCount, timestamp: new Date(), labels: { workflowId: wm.workflowId }, type: 'counter' },
        { name: 'workflow.average_duration', value: wm.averageDuration, timestamp: new Date(), labels: { workflowId: wm.workflowId }, type: 'gauge' },
        { name: 'workflow.error_rate', value: wm.errorRate, timestamp: new Date(), labels: { workflowId: wm.workflowId }, type: 'gauge' }
      );
    });

    return metrics;
  }

  record(name: string, value: number, labels?: Record<string, string>): void {
    logger.debug(`Recording metric: ${name} = ${value}`, { labels });
    this.emit('metricRecorded', { name, value, labels, timestamp: new Date() });
  }

  increment(name: string, labels?: Record<string, string>): void {
    this.record(name, 1, labels);
  }

  timing(name: string, durationMs: number, labels?: Record<string, string>): void {
    this.record(name, durationMs, { ...labels, type: 'timing' });
  }

  clearMetrics(): void {
    this.executions.clear();
    this.workflowMetrics.clear();
    this.executionHistory = [];
    this.systemMetricsCache = null;
    this.emit('metricsCleared');
  }

  destroy(): void {
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
    }
    this.removeAllListeners();
  }
}

export const metricsService = new MetricsService();
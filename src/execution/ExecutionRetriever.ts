/**
 * Execution Retriever
 * Provides advanced querying and analytics for executions
 * PROJET SAUVÉ - Phase 5.3: Execution History & Logs
 */

import { logger } from '../services/SimpleLogger';
import { getExecutionStorage, ExecutionStorage } from './ExecutionStorage';
import type {
  WorkflowExecution,
  NodeExecution,
  ExecutionLog,
  ExecutionFilter,
  ExecutionStatistics,
  NodeExecutionStatistics,
  ExecutionTimelineEvent,
  ExecutionMetrics,
  ExecutionSummary,
  ExecutionStatus
} from '../types/execution';

export class ExecutionRetriever {
  private storage: ExecutionStorage;

  constructor() {
    this.storage = getExecutionStorage();
  }

  /**
   * Get execution by ID with full details
   */
  async getExecutionDetails(executionId: string): Promise<WorkflowExecution | null> {
    const execution = await this.storage.getExecution(executionId);
    if (!execution) {
      return null;
    }

    // Load node executions
    const nodeExecutions = await this.storage.getNodeExecutions({ executionId });
    execution.nodeExecutions = nodeExecutions;

    return execution;
  }

  /**
   * Get execution timeline
   */
  async getExecutionTimeline(executionId: string): Promise<ExecutionTimelineEvent[]> {
    const execution = await this.storage.getExecution(executionId);
    if (!execution) {
      return [];
    }

    const timeline: ExecutionTimelineEvent[] = [];

    // Add execution start
    timeline.push({
      id: `${executionId}_start`,
      executionId,
      type: 'start',
      timestamp: execution.startedAt,
      message: `Workflow execution started: ${execution.workflowName}`,
      status: 'running'
    });

    // Add node executions
    const nodeExecutions = await this.storage.getNodeExecutions({ executionId });
    for (const nodeExec of nodeExecutions) {
      // Node start
      timeline.push({
        id: `${nodeExec.id}_start`,
        executionId,
        type: 'node_start',
        timestamp: nodeExec.startedAt,
        nodeId: nodeExec.nodeId,
        nodeName: nodeExec.nodeName,
        message: `Started: ${nodeExec.nodeName}`,
        status: 'running'
      });

      // Node logs
      const logs = await this.storage.getLogs({ nodeExecutionId: nodeExec.id });
      for (const log of logs) {
        if (log.level === 'error') {
          timeline.push({
            id: log.id,
            executionId,
            type: 'error',
            timestamp: log.timestamp,
            nodeId: nodeExec.nodeId,
            nodeName: nodeExec.nodeName,
            message: log.message,
            data: log.data
          });
        }
      }

      // Node end
      if (nodeExec.finishedAt) {
        timeline.push({
          id: `${nodeExec.id}_end`,
          executionId,
          type: 'node_end',
          timestamp: nodeExec.finishedAt,
          nodeId: nodeExec.nodeId,
          nodeName: nodeExec.nodeName,
          message: `Completed: ${nodeExec.nodeName} (${nodeExec.status})`,
          status: nodeExec.status,
          duration: nodeExec.duration
        });
      }
    }

    // Add execution end
    if (execution.finishedAt) {
      timeline.push({
        id: `${executionId}_end`,
        executionId,
        type: 'end',
        timestamp: execution.finishedAt,
        message: `Workflow execution ${execution.status}: ${execution.workflowName}`,
        status: execution.status,
        duration: execution.duration
      });
    }

    // Sort by timestamp
    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return timeline;
  }

  /**
   * Get execution statistics
   */
  async getExecutionStatistics(filter?: ExecutionFilter): Promise<ExecutionStatistics> {
    const executions = await this.storage.listExecutions(filter);

    const stats: ExecutionStatistics = {
      total: executions.length,
      byStatus: {
        running: 0,
        success: 0,
        error: 0,
        cancelled: 0,
        timeout: 0,
        waiting: 0
      },
      byMode: {},
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      successRate: 0,
      errorRate: 0,
      totalDuration: 0
    };

    if (executions.length === 0) {
      return stats;
    }

    let totalDuration = 0;
    let completedCount = 0;

    for (const execution of executions) {
      // Count by status
      stats.byStatus[execution.status]++;

      // Count by mode
      stats.byMode[execution.mode] = (stats.byMode[execution.mode] || 0) + 1;

      // Duration stats
      if (execution.duration !== undefined) {
        totalDuration += execution.duration;
        completedCount++;
        stats.minDuration = Math.min(stats.minDuration, execution.duration);
        stats.maxDuration = Math.max(stats.maxDuration, execution.duration);
      }
    }

    stats.totalDuration = totalDuration;
    stats.avgDuration = completedCount > 0 ? totalDuration / completedCount : 0;
    stats.successRate = (stats.byStatus.success / stats.total) * 100;
    stats.errorRate = (stats.byStatus.error / stats.total) * 100;

    if (stats.minDuration === Infinity) {
      stats.minDuration = 0;
    }

    return stats;
  }

  /**
   * Get node execution statistics
   */
  async getNodeStatistics(workflowId?: string): Promise<NodeExecutionStatistics[]> {
    const filter = workflowId ? { workflowId } : undefined;
    const executions = await this.storage.listExecutions(filter);

    const nodeStats = new Map<string, {
      nodeId: string;
      nodeName: string;
      nodeType: string;
      executions: NodeExecution[];
    }>();

    // Collect all node executions
    for (const execution of executions) {
      const nodeExecutions = await this.storage.getNodeExecutions({ executionId: execution.id });
      for (const nodeExec of nodeExecutions) {
        if (!nodeStats.has(nodeExec.nodeId)) {
          nodeStats.set(nodeExec.nodeId, {
            nodeId: nodeExec.nodeId,
            nodeName: nodeExec.nodeName,
            nodeType: nodeExec.nodeType,
            executions: []
          });
        }
        nodeStats.get(nodeExec.nodeId)!.executions.push(nodeExec);
      }
    }

    // Calculate statistics for each node
    const statistics: NodeExecutionStatistics[] = [];

    for (const [nodeId, data] of nodeStats) {
      const execs = data.executions;
      const successful = execs.filter(e => e.status === 'success').length;
      const failed = execs.filter(e => e.status === 'error').length;
      const durations = execs.filter(e => e.duration !== undefined).map(e => e.duration!);

      const lastExecution = execs.length > 0
        ? new Date(Math.max(...execs.map(e => e.startedAt.getTime())))
        : undefined;

      statistics.push({
        nodeId: data.nodeId,
        nodeName: data.nodeName,
        nodeType: data.nodeType,
        totalExecutions: execs.length,
        successfulExecutions: successful,
        failedExecutions: failed,
        avgDuration: durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0,
        minDuration: durations.length > 0 ? Math.min(...durations) : 0,
        maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
        successRate: execs.length > 0 ? (successful / execs.length) * 100 : 0,
        lastExecution
      });
    }

    // Sort by total executions descending
    statistics.sort((a, b) => b.totalExecutions - a.totalExecutions);

    return statistics;
  }

  /**
   * Get execution metrics for a time period
   */
  async getExecutionMetrics(
    startDate: Date,
    endDate: Date,
    period: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<ExecutionMetrics> {
    const executions = await this.storage.listExecutions({
      startDate,
      endDate,
      sortBy: 'startedAt',
      sortOrder: 'asc'
    });

    const metrics: ExecutionMetrics = {
      period,
      startDate,
      endDate,
      totalExecutions: executions.length,
      successfulExecutions: executions.filter(e => e.status === 'success').length,
      failedExecutions: executions.filter(e => e.status === 'error').length,
      avgDuration: 0,
      executionsByHour: [],
      executionsByStatus: {
        running: 0,
        success: 0,
        error: 0,
        cancelled: 0,
        timeout: 0,
        waiting: 0
      },
      executionsByMode: {},
      topFailingNodes: [],
      slowestNodes: []
    };

    // Calculate average duration
    const durations = executions.filter(e => e.duration !== undefined).map(e => e.duration!);
    metrics.avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // Executions by hour
    const hourlyCount = new Map<number, number>();
    for (const exec of executions) {
      const hour = exec.startedAt.getHours();
      hourlyCount.set(hour, (hourlyCount.get(hour) || 0) + 1);
    }
    for (let hour = 0; hour < 24; hour++) {
      metrics.executionsByHour.push({ hour, count: hourlyCount.get(hour) || 0 });
    }

    // Executions by status
    for (const exec of executions) {
      metrics.executionsByStatus[exec.status]++;
    }

    // Executions by mode
    for (const exec of executions) {
      metrics.executionsByMode[exec.mode] = (metrics.executionsByMode[exec.mode] || 0) + 1;
    }

    // Top failing nodes
    const nodeFailures = new Map<string, { nodeName: string; count: number }>();
    for (const exec of executions) {
      const nodeExecs = await this.storage.getNodeExecutions({ executionId: exec.id });
      for (const nodeExec of nodeExecs) {
        if (nodeExec.status === 'error') {
          const key = nodeExec.nodeId;
          if (!nodeFailures.has(key)) {
            nodeFailures.set(key, { nodeName: nodeExec.nodeName, count: 0 });
          }
          nodeFailures.get(key)!.count++;
        }
      }
    }

    metrics.topFailingNodes = Array.from(nodeFailures.entries())
      .map(([nodeId, data]) => ({
        nodeId,
        nodeName: data.nodeName,
        failureCount: data.count
      }))
      .sort((a, b) => b.failureCount - a.failureCount)
      .slice(0, 10);

    // Slowest nodes
    const nodeDurations = new Map<string, { nodeName: string; durations: number[] }>();
    for (const exec of executions) {
      const nodeExecs = await this.storage.getNodeExecutions({ executionId: exec.id });
      for (const nodeExec of nodeExecs) {
        if (nodeExec.duration !== undefined) {
          const key = nodeExec.nodeId;
          if (!nodeDurations.has(key)) {
            nodeDurations.set(key, { nodeName: nodeExec.nodeName, durations: [] });
          }
          nodeDurations.get(key)!.durations.push(nodeExec.duration);
        }
      }
    }

    metrics.slowestNodes = Array.from(nodeDurations.entries())
      .map(([nodeId, data]) => ({
        nodeId,
        nodeName: data.nodeName,
        avgDuration: data.durations.reduce((a, b) => a + b, 0) / data.durations.length
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    return metrics;
  }

  /**
   * Get recent executions
   */
  async getRecentExecutions(limit: number = 10): Promise<ExecutionSummary[]> {
    const executions = await this.storage.listExecutions({
      sortBy: 'startedAt',
      sortOrder: 'desc',
      limit
    });

    return executions.map(exec => this.createExecutionSummary(exec));
  }

  /**
   * Get failed executions
   */
  async getFailedExecutions(limit: number = 10): Promise<WorkflowExecution[]> {
    return this.storage.listExecutions({
      status: 'error',
      sortBy: 'startedAt',
      sortOrder: 'desc',
      limit
    });
  }

  /**
   * Get running executions
   */
  async getRunningExecutions(): Promise<WorkflowExecution[]> {
    return this.storage.listExecutions({
      status: 'running'
    });
  }

  /**
   * Search executions
   */
  async searchExecutions(query: string, limit: number = 50): Promise<ExecutionSummary[]> {
    const executions = await this.storage.listExecutions({
      search: query,
      limit
    });

    return executions.map(exec => this.createExecutionSummary(exec));
  }

  /**
   * Get execution logs with filtering
   */
  async getExecutionLogs(
    executionId: string,
    level?: 'debug' | 'info' | 'warn' | 'error' | 'fatal',
    limit: number = 100
  ): Promise<ExecutionLog[]> {
    return this.storage.getLogs({
      executionId,
      level,
      limit
    });
  }

  /**
   * Get node execution logs
   */
  async getNodeExecutionLogs(nodeExecutionId: string): Promise<ExecutionLog[]> {
    return this.storage.getLogs({
      nodeExecutionId
    });
  }

  /**
   * Get executions for workflow
   */
  async getWorkflowExecutions(
    workflowId: string,
    limit: number = 50
  ): Promise<ExecutionSummary[]> {
    const executions = await this.storage.listExecutions({
      workflowId,
      sortBy: 'startedAt',
      sortOrder: 'desc',
      limit
    });

    return executions.map(exec => this.createExecutionSummary(exec));
  }

  /**
   * Get execution success rate
   */
  async getSuccessRate(workflowId?: string): Promise<number> {
    const filter = workflowId ? { workflowId } : undefined;
    const stats = await this.getExecutionStatistics(filter);
    return stats.successRate;
  }

  /**
   * Get average execution duration
   */
  async getAverageDuration(workflowId?: string): Promise<number> {
    const filter = workflowId ? { workflowId } : undefined;
    const stats = await this.getExecutionStatistics(filter);
    return stats.avgDuration;
  }

  /**
   * Find slow executions (above threshold)
   */
  async findSlowExecutions(
    thresholdMs: number,
    limit: number = 10
  ): Promise<ExecutionSummary[]> {
    const executions = await this.storage.listExecutions({
      sortBy: 'duration',
      sortOrder: 'desc',
      limit: 100
    });

    const slow = executions
      .filter(e => e.duration !== undefined && e.duration > thresholdMs)
      .slice(0, limit);

    return slow.map(exec => this.createExecutionSummary(exec));
  }

  /**
   * Create execution summary
   */
  private createExecutionSummary(execution: WorkflowExecution): ExecutionSummary {
    const successful = execution.nodeExecutions.filter(ne => ne.status === 'success').length;
    const failed = execution.nodeExecutions.filter(ne => ne.status === 'error').length;

    return {
      id: execution.id,
      workflowName: execution.workflowName,
      status: execution.status,
      duration: execution.duration || 0,
      startedAt: execution.startedAt,
      finishedAt: execution.finishedAt,
      mode: execution.mode,
      successfulNodes: successful,
      failedNodes: failed,
      totalNodes: execution.nodeExecutions.length
    };
  }

  /**
   * Export executions to JSON
   */
  async exportExecutions(filter?: ExecutionFilter): Promise<string> {
    const executions = await this.storage.listExecutions(filter);
    return JSON.stringify(executions, null, 2);
  }

  /**
   * Get execution count
   */
  async getExecutionCount(filter?: ExecutionFilter): Promise<number> {
    const executions = await this.storage.listExecutions(filter);
    return executions.length;
  }
}

// Export singleton instance
let retrieverInstance: ExecutionRetriever | null = null;

export function getExecutionRetriever(): ExecutionRetriever {
  if (!retrieverInstance) {
    retrieverInstance = new ExecutionRetriever();
  }
  return retrieverInstance;
}

export function resetExecutionRetriever(): void {
  retrieverInstance = null;
}

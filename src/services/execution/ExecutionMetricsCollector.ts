/**
 * Execution Metrics Collector
 * Collects and calculates metrics for execution engine
 */

import type {
  WorkflowExecution,
  EngineMetrics,
  TimelineEvent,
  ExecutionProgress,
  ExecutionPerformance,
  NodeExecutionResult
} from './types';

export class ExecutionMetricsCollector {
  /**
   * Calculate engine metrics from executions
   */
  calculateEngineMetrics(
    activeExecutions: Map<string, WorkflowExecution>,
    executionHistory: Map<string, WorkflowExecution[]>,
    poolUtilization: Record<string, number>
  ): EngineMetrics {
    const running = Array.from(activeExecutions.values())
      .filter(e => e.status === 'running').length;
    const queued = Array.from(activeExecutions.values())
      .filter(e => e.status === 'queued').length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedToday = Array.from(executionHistory.values())
      .flat()
      .filter(exec => exec.context.metadata.startTime >= today).length;

    const recentExecutions = Array.from(executionHistory.values()).flat().slice(-100);
    const errorRate = recentExecutions.length > 0
      ? recentExecutions.filter(exec => exec.status === 'error').length / recentExecutions.length
      : 0;

    const avgExecutionTime = recentExecutions.length > 0
      ? recentExecutions.reduce((sum, exec) => sum + exec.performance.executionTime, 0) / recentExecutions.length
      : 0;

    return {
      activeExecutions: running,
      queuedExecutions: queued,
      completedToday,
      errorRate,
      averageExecutionTime: avgExecutionTime,
      poolUtilization
    };
  }

  /**
   * Build execution timeline for debugging
   */
  buildExecutionTimeline(execution: WorkflowExecution): TimelineEvent[] {
    const timeline: TimelineEvent[] = [
      {
        timestamp: execution.context.metadata.startTime.getTime(),
        event: 'execution_started',
        data: {
          workflowId: execution.workflowId,
          priority: execution.context.priority,
          environment: execution.context.environment
        }
      }
    ];

    // Add node execution events
    execution.context.nodeResults.forEach((result, nodeId) => {
      timeline.push(
        {
          timestamp: result.startTime.getTime(),
          event: 'node_started',
          nodeId,
          data: { inputData: result.inputData }
        },
        {
          timestamp: result.endTime?.getTime() || Date.now(),
          event: result.status === 'success' ? 'node_completed' : 'node_failed',
          nodeId,
          duration: result.duration,
          data: result.status === 'success'
            ? { outputData: result.outputData }
            : { error: result.error }
        }
      );
    });

    // Add execution end event
    if (['success', 'error', 'cancelled'].includes(execution.status)) {
      timeline.push({
        timestamp: execution.context.metadata.startTime.getTime() + execution.performance.totalDuration,
        event: 'execution_completed',
        data: {
          status: execution.status,
          result: execution.result,
          performance: execution.performance
        }
      });
    }

    return timeline.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Calculate progress metrics
   */
  calculateProgress(nodeResults: Map<string, NodeExecutionResult>, totalNodes: number): ExecutionProgress {
    let completedNodes = 0;
    let failedNodes = 0;
    let skippedNodes = 0;
    let currentNode: string | undefined;

    for (const [nodeId, result] of nodeResults) {
      switch (result.status) {
        case 'success':
          completedNodes++;
          break;
        case 'error':
          failedNodes++;
          break;
        case 'skipped':
          skippedNodes++;
          break;
        case 'running':
          currentNode = nodeId;
          break;
      }
    }

    return {
      totalNodes,
      completedNodes,
      failedNodes,
      skippedNodes,
      currentNode
    };
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformance(
    queueTime: number,
    executionTime: number,
    nodeResults: Map<string, NodeExecutionResult>
  ): ExecutionPerformance {
    let memoryPeak = 0;
    let cpuTime = 0;

    for (const result of nodeResults.values()) {
      memoryPeak = Math.max(memoryPeak, result.metadata.memoryUsage);
      cpuTime += result.metadata.cpuTime;
    }

    return {
      totalDuration: queueTime + executionTime,
      queueTime,
      executionTime,
      memoryPeak,
      cpuTime
    };
  }

  /**
   * Generate summary statistics for a workflow
   */
  generateWorkflowSummary(
    workflowId: string,
    executions: WorkflowExecution[]
  ): {
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    p95Duration: number;
    errorCount: number;
    lastExecution?: Date;
  } {
    if (executions.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        averageDuration: 0,
        p95Duration: 0,
        errorCount: 0
      };
    }

    const successCount = executions.filter(e => e.status === 'success').length;
    const errorCount = executions.filter(e => e.status === 'error').length;
    const durations = executions
      .map(e => e.performance.totalDuration)
      .sort((a, b) => a - b);

    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const p95Index = Math.floor(durations.length * 0.95);
    const p95Duration = durations[p95Index] || durations[durations.length - 1];

    const lastExecution = executions
      .map(e => e.context.metadata.startTime)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      totalExecutions: executions.length,
      successRate: successCount / executions.length,
      averageDuration,
      p95Duration,
      errorCount,
      lastExecution
    };
  }
}

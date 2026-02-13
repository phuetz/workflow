/**
 * Execution History Manager
 * Manages execution history storage and cleanup
 */

import type { WorkflowExecution } from './types';

export class ExecutionHistoryManager {
  private executionHistory: Map<string, WorkflowExecution[]> = new Map();
  private maxHistoryPerWorkflow: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxHistoryPerWorkflow: number = 100) {
    this.maxHistoryPerWorkflow = maxHistoryPerWorkflow;
  }

  /**
   * Add execution to history
   */
  addToHistory(execution: WorkflowExecution): void {
    const workflowHistory = this.executionHistory.get(execution.workflowId) || [];
    workflowHistory.push(execution);

    // Keep only last N executions per workflow
    if (workflowHistory.length > this.maxHistoryPerWorkflow) {
      workflowHistory.splice(0, workflowHistory.length - this.maxHistoryPerWorkflow);
    }

    this.executionHistory.set(execution.workflowId, workflowHistory);
  }

  /**
   * Get execution history for a workflow
   */
  getHistory(workflowId: string): WorkflowExecution[] {
    return this.executionHistory.get(workflowId) || [];
  }

  /**
   * Get all history
   */
  getAllHistory(): Map<string, WorkflowExecution[]> {
    return this.executionHistory;
  }

  /**
   * Find execution by ID across all workflows
   */
  findExecution(executionId: string): WorkflowExecution | undefined {
    for (const executions of this.executionHistory.values()) {
      const found = executions.find(e => e.id === executionId);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * Cleanup old completed executions from active map
   */
  cleanupCompletedExecutions(
    activeExecutions: Map<string, WorkflowExecution>,
    maxAgeMs: number = 3600000 // 1 hour
  ): number {
    const cutoffTime = Date.now() - maxAgeMs;
    let cleanedCount = 0;

    for (const [executionId, execution] of Array.from(activeExecutions.entries())) {
      if (execution.context.metadata.startTime.getTime() < cutoffTime &&
          ['success', 'error', 'cancelled'].includes(execution.status)) {
        // Move to history
        this.addToHistory(execution);
        activeExecutions.delete(executionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Start periodic cleanup
   */
  startCleanup(
    activeExecutions: Map<string, WorkflowExecution>,
    intervalMs: number = 300000 // 5 minutes
  ): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupCompletedExecutions(activeExecutions);
    }, intervalMs);
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.executionHistory.clear();
  }

  /**
   * Get history statistics
   */
  getStatistics(): {
    totalWorkflows: number;
    totalExecutions: number;
    oldestExecution?: Date;
    newestExecution?: Date;
  } {
    let totalExecutions = 0;
    let oldestExecution: Date | undefined;
    let newestExecution: Date | undefined;

    for (const executions of this.executionHistory.values()) {
      totalExecutions += executions.length;

      for (const exec of executions) {
        const startTime = exec.context.metadata.startTime;
        if (!oldestExecution || startTime < oldestExecution) {
          oldestExecution = startTime;
        }
        if (!newestExecution || startTime > newestExecution) {
          newestExecution = startTime;
        }
      }
    }

    return {
      totalWorkflows: this.executionHistory.size,
      totalExecutions,
      oldestExecution,
      newestExecution
    };
  }
}

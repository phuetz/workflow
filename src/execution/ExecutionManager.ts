/**
 * Execution Manager
 * Central coordinator for workflow executions
 * PROJET SAUVÉ - Phase 5.3: Execution History & Logs
 */

import { logger } from '../services/SimpleLogger';
import { getExecutionStorage, ExecutionStorage } from './ExecutionStorage';
import { createExecutionLogger, ExecutionLogger } from './ExecutionLogger';
import { getExecutionRetriever, ExecutionRetriever } from './ExecutionRetriever';
import type {
  WorkflowExecution,
  NodeExecution,
  ExecutionStatus,
  NodeExecutionStatus,
  ExecutionContext,
  ExecutionError,
  NodeExecutionError
} from '../types/execution';

export interface ExecutionManagerConfig {
  maxConcurrentExecutions?: number;
  defaultTimeout?: number;
  enableAutoCleanup?: boolean;
  retentionDays?: number;
}

export class ExecutionManager {
  private storage: ExecutionStorage;
  private retriever: ExecutionRetriever;
  private config: Required<ExecutionManagerConfig>;
  private activeExecutions: Map<string, ExecutionContext>;
  private executionLoggers: Map<string, ExecutionLogger>;

  constructor(config: ExecutionManagerConfig = {}) {
    this.storage = getExecutionStorage();
    this.retriever = getExecutionRetriever();
    this.config = {
      maxConcurrentExecutions: config.maxConcurrentExecutions ?? 10,
      defaultTimeout: config.defaultTimeout ?? 300000, // 5 minutes
      enableAutoCleanup: config.enableAutoCleanup ?? true,
      retentionDays: config.retentionDays ?? 30
    };
    this.activeExecutions = new Map();
    this.executionLoggers = new Map();

    logger.info('ExecutionManager initialized', this.config);

    if (this.config.enableAutoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Start workflow execution
   */
  async startExecution(params: {
    workflowId: string;
    workflowName: string;
    mode: 'manual' | 'trigger' | 'webhook' | 'schedule' | 'test';
    triggeredBy?: string;
    input?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<WorkflowExecution> {
    // Check concurrent execution limit
    if (this.activeExecutions.size >= this.config.maxConcurrentExecutions) {
      throw new Error('Maximum concurrent executions reached');
    }

    // Create execution record
    const execution = await this.storage.createExecution({
      workflowId: params.workflowId,
      workflowName: params.workflowName,
      status: 'running',
      mode: params.mode,
      startedAt: new Date(),
      triggeredBy: params.triggeredBy,
      input: params.input,
      metadata: params.metadata,
      nodeExecutions: []
    });

    // Create execution context
    const context: ExecutionContext = {
      executionId: execution.id,
      workflowId: params.workflowId,
      userId: params.triggeredBy,
      variables: new Map(),
      credentials: new Map(),
      nodeOutputs: new Map(),
      startTime: execution.startedAt,
      mode: params.mode,
      metadata: params.metadata || {}
    };

    this.activeExecutions.set(execution.id, context);

    // Create execution logger
    const executionLogger = createExecutionLogger({
      executionId: execution.id,
      source: params.workflowName
    });
    this.executionLoggers.set(execution.id, executionLogger);

    // Log execution start
    executionLogger.logExecutionStart(execution);

    logger.info(`Execution started: ${execution.id} for workflow ${params.workflowName}`);

    return execution;
  }

  /**
   * Complete workflow execution
   */
  async completeExecution(
    executionId: string,
    status: ExecutionStatus,
    output?: Record<string, any>,
    error?: ExecutionError
  ): Promise<WorkflowExecution> {
    const execution = await this.storage.getExecution(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const finishedAt = new Date();
    const duration = finishedAt.getTime() - execution.startedAt.getTime();

    const updated = await this.storage.updateExecution(executionId, {
      status,
      finishedAt,
      duration,
      output,
      error
    });

    // Get execution logger
    const executionLogger = this.executionLoggers.get(executionId);
    if (executionLogger) {
      if (status === 'success') {
        executionLogger.logExecutionComplete(updated);
      } else if (error) {
        executionLogger.logExecutionError(updated, new Error(error.message));
      }

      // Flush and cleanup logger
      await executionLogger.flush();
      executionLogger.stopAutoFlush();
      this.executionLoggers.delete(executionId);
    }

    // Remove from active executions
    this.activeExecutions.delete(executionId);

    logger.info(`Execution completed: ${executionId} with status ${status} (${duration}ms)`);

    return updated;
  }

  /**
   * Start node execution
   */
  async startNodeExecution(params: {
    executionId: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
    input?: Record<string, any>;
    maxRetries?: number;
  }): Promise<NodeExecution> {
    const nodeExecution = await this.storage.createNodeExecution({
      executionId: params.executionId,
      nodeId: params.nodeId,
      nodeName: params.nodeName,
      nodeType: params.nodeType,
      status: 'running',
      startedAt: new Date(),
      retryCount: 0,
      maxRetries: params.maxRetries || 0,
      input: params.input,
      logs: []
    });

    // Get execution logger and log node start
    const executionLogger = this.executionLoggers.get(params.executionId);
    if (executionLogger) {
      executionLogger.logNodeStart(nodeExecution);
    }

    logger.debug(`Node execution started: ${nodeExecution.id} for node ${params.nodeName}`);

    return nodeExecution;
  }

  /**
   * Complete node execution
   */
  async completeNodeExecution(
    nodeExecutionId: string,
    status: NodeExecutionStatus,
    output?: Record<string, any>,
    error?: NodeExecutionError
  ): Promise<NodeExecution> {
    const nodeExecution = await this.storage.getNodeExecutions({ executionId: '' })
      .then(execs => execs.find(e => e.id === nodeExecutionId));

    if (!nodeExecution) {
      throw new Error(`Node execution not found: ${nodeExecutionId}`);
    }

    const finishedAt = new Date();
    const duration = finishedAt.getTime() - nodeExecution.startedAt.getTime();

    const updated = await this.storage.updateNodeExecution(nodeExecutionId, {
      status,
      finishedAt,
      duration,
      output,
      error
    });

    // Get execution logger and log node completion
    const executionLogger = this.executionLoggers.get(nodeExecution.executionId);
    if (executionLogger) {
      if (status === 'success') {
        executionLogger.logNodeComplete(updated);
      } else if (error) {
        executionLogger.logNodeError(updated, new Error(error.message));
      }
    }

    // Store output in context
    const context = this.activeExecutions.get(nodeExecution.executionId);
    if (context && output) {
      context.nodeOutputs.set(nodeExecution.nodeId, output);
    }

    logger.debug(`Node execution completed: ${nodeExecutionId} with status ${status} (${duration}ms)`);

    return updated;
  }

  /**
   * Get execution context
   */
  getExecutionContext(executionId: string): ExecutionContext | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Get execution logger
   */
  getExecutionLogger(executionId: string): ExecutionLogger | undefined {
    return this.executionLoggers.get(executionId);
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId: string, reason?: string): Promise<WorkflowExecution> {
    const execution = await this.storage.getExecution(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (execution.status !== 'running') {
      throw new Error(`Execution is not running: ${execution.status}`);
    }

    const error: ExecutionError = {
      message: reason || 'Execution cancelled by user',
      code: 'EXECUTION_CANCELLED',
      timestamp: new Date(),
      recoverable: false
    };

    return this.completeExecution(executionId, 'cancelled', undefined, error);
  }

  /**
   * Retry node execution
   */
  async retryNodeExecution(nodeExecutionId: string): Promise<NodeExecution> {
    const nodeExecs = await this.storage.getNodeExecutions({ executionId: '' });
    const nodeExecution = nodeExecs.find(e => e.id === nodeExecutionId);

    if (!nodeExecution) {
      throw new Error(`Node execution not found: ${nodeExecutionId}`);
    }

    if (nodeExecution.retryCount >= nodeExecution.maxRetries) {
      throw new Error('Maximum retry attempts reached');
    }

    // Reset node execution for retry
    const updated = await this.storage.updateNodeExecution(nodeExecutionId, {
      status: 'running',
      retryCount: nodeExecution.retryCount + 1,
      error: undefined,
      startedAt: new Date(),
      finishedAt: undefined,
      duration: undefined
    });

    // Log retry
    const executionLogger = this.executionLoggers.get(nodeExecution.executionId);
    if (executionLogger) {
      executionLogger.logRetry(
        updated.retryCount,
        updated.maxRetries,
        nodeExecution.error?.message
      );
    }

    logger.info(`Node execution retry: ${nodeExecutionId} (attempt ${updated.retryCount})`);

    return updated;
  }

  /**
   * Get execution statistics
   */
  async getStatistics() {
    return this.retriever.getExecutionStatistics();
  }

  /**
   * Get recent executions
   */
  async getRecentExecutions(limit: number = 10) {
    return this.retriever.getRecentExecutions(limit);
  }

  /**
   * Get failed executions
   */
  async getFailedExecutions(limit: number = 10) {
    return this.retriever.getFailedExecutions(limit);
  }

  /**
   * Get execution timeline
   */
  async getExecutionTimeline(executionId: string) {
    return this.retriever.getExecutionTimeline(executionId);
  }

  /**
   * Get execution metrics
   */
  async getExecutionMetrics(startDate: Date, endDate: Date) {
    return this.retriever.getExecutionMetrics(startDate, endDate);
  }

  /**
   * Cleanup old executions
   */
  async cleanupOldExecutions(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const executions = await this.storage.listExecutions({
      endDate: cutoffDate
    });

    let count = 0;
    for (const execution of executions) {
      await this.storage.deleteExecution(execution.id);
      count++;
    }

    logger.info(`Cleaned up ${count} old executions`);
    return count;
  }

  /**
   * Start auto-cleanup timer
   */
  private startAutoCleanup(): void {
    // Run cleanup daily
    setInterval(() => {
      this.cleanupOldExecutions().catch(error => {
        logger.error('Auto-cleanup failed:', error);
      });
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Get active execution count
   */
  getActiveExecutionCount(): number {
    return this.activeExecutions.size;
  }

  /**
   * Is execution active
   */
  isExecutionActive(executionId: string): boolean {
    return this.activeExecutions.has(executionId);
  }

  /**
   * Get all active execution IDs
   */
  getActiveExecutionIds(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Stop all active executions (for shutdown)
   */
  async stopAllExecutions(): Promise<void> {
    const executionIds = this.getActiveExecutionIds();

    for (const executionId of executionIds) {
      try {
        await this.cancelExecution(executionId, 'System shutdown');
      } catch (error) {
        logger.error(`Failed to cancel execution ${executionId}:`, error);
      }
    }

    // Flush all loggers
    for (const [id, logger] of this.executionLoggers) {
      try {
        await logger.destroy();
      } catch (error) {
        logger.error(`Failed to destroy logger for execution ${id}:`, error);
      }
    }

    this.activeExecutions.clear();
    this.executionLoggers.clear();
  }
}

// Export singleton instance
let managerInstance: ExecutionManager | null = null;

export function getExecutionManager(config?: ExecutionManagerConfig): ExecutionManager {
  if (!managerInstance) {
    managerInstance = new ExecutionManager(config);
  }
  return managerInstance;
}

export function resetExecutionManager(): void {
  if (managerInstance) {
    managerInstance.stopAllExecutions().catch(error => {
      logger.error('Failed to stop executions during reset:', error);
    });
  }
  managerInstance = null;
}

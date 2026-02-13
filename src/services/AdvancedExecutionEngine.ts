/**
 * Advanced Workflow Execution Engine
 * @deprecated Use WorkflowExecutionOrchestrator instead (S2.1)
 */

import { logger } from './SimpleLogger';
import { BaseService } from './BaseService';
import { workflowAnalytics } from './WorkflowAnalyticsService';
import { ExecutionPoolManager } from './execution/ExecutionPoolManager';
import { ExecutionHistoryManager } from './execution/ExecutionHistoryManager';
import { ExecutionMetricsCollector } from './execution/ExecutionMetricsCollector';

// Re-export types for backward compatibility
export type {
  ExecutionContext,
  ExecutionMetadata,
  NodeExecutionResult,
  ExecutionError,
  RetryPolicy,
  ErrorHandlingPolicy,
  ExecutionQueue,
  ExecutionPool,
  WorkflowExecution,
  ExecuteWorkflowOptions,
  EngineMetrics,
  TimelineEvent
} from './execution/types';

import type {
  ExecutionContext,
  NodeExecutionResult,
  WorkflowExecution,
  ExecuteWorkflowOptions,
  EngineMetrics,
  TimelineEvent
} from './execution/types';

export class AdvancedExecutionEngine extends BaseService {
  private activeExecutions: Map<string, WorkflowExecution> = new Map();
  private poolManager: ExecutionPoolManager;
  private historyManager: ExecutionHistoryManager;
  private metricsCollector: ExecutionMetricsCollector;

  constructor() {
    super('AdvancedExecutionEngine', { enableRetry: true, maxRetries: 3, enableCaching: true });
    this.poolManager = new ExecutionPoolManager();
    this.historyManager = new ExecutionHistoryManager();
    this.metricsCollector = new ExecutionMetricsCollector();
    this.poolManager.startHealthMonitoring(this.activeExecutions, 30000);
    this.historyManager.startCleanup(this.activeExecutions, 300000);
  }

  public async executeWorkflow(workflowId: string, triggerData?: unknown, options?: ExecuteWorkflowOptions): Promise<WorkflowExecution> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context: ExecutionContext = {
      workflowId, executionId, userId: 'system', triggerData,
      variables: new Map(Object.entries(options?.variables || {})),
      nodeResults: new Map(),
      metadata: { startTime: new Date(), parentExecutionId: options?.parentExecutionId, triggerType: 'manual', triggerSource: 'api', executionMode: 'async', tags: options?.tags || [], customProperties: {} },
      environment: options?.environment || 'production',
      priority: options?.priority || 'normal',
      timeout: options?.timeout || 300000,
      retryPolicy: { enabled: true, maxAttempts: 3, baseDelay: 1000, maxDelay: 30000, backoffStrategy: 'exponential', retryConditions: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT'] },
      errorHandling: { continueOnError: false, errorNotifications: true, rollbackOnError: false, savePartialResults: true }
    };
    const execution: WorkflowExecution = {
      id: executionId, workflowId, status: 'queued', context,
      progress: { totalNodes: 0, completedNodes: 0, failedNodes: 0, skippedNodes: 0 },
      performance: { totalDuration: 0, queueTime: 0, executionTime: 0, memoryPeak: 0, cpuTime: 0 }
    };
    this.activeExecutions.set(executionId, execution);
    await this.queueExecution(execution);
    logger.info('Workflow execution queued', { executionId, workflowId, priority: context.priority, environment: context.environment });
    return execution;
  }

  private async queueExecution(execution: WorkflowExecution): Promise<void> {
    const queue = this.poolManager.findQueue('default', execution.context.priority);
    if (!queue) throw new Error(`No suitable queue found for priority ${execution.context.priority}`);
    if (queue.rateLimiting.enabled && !this.poolManager.getRateLimiter(queue.id).tryAcquire()) {
      execution.status = 'error';
      execution.result = { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded for queue', nodeId: 'system', timestamp: new Date(), recoverable: true, retryAfter: 1000 } };
      return;
    }
    setImmediate(() => this.processExecution(execution));
  }

  private async processExecution(execution: WorkflowExecution): Promise<void> {
    try {
      execution.status = 'running';
      const startTime = Date.now();
      await this.simulateWorkflowExecution(execution);
      execution.performance.executionTime = Date.now() - startTime;
      execution.performance.totalDuration = execution.performance.queueTime + execution.performance.executionTime;
      await this.recordAnalytics(execution);
      logger.info('Workflow execution completed', { executionId: execution.id, status: execution.status, duration: execution.performance.totalDuration });
    } catch (error) {
      execution.status = 'error';
      execution.result = { success: false, error: { code: 'EXECUTION_ERROR', message: error instanceof Error ? error.message : String(error), nodeId: 'system', timestamp: new Date(), recoverable: false } };
      logger.error('Workflow execution failed', { executionId: execution.id, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async simulateWorkflowExecution(execution: WorkflowExecution): Promise<void> {
    execution.progress.totalNodes = 5;
    for (let i = 1; i <= 5; i++) {
      const nodeId = `node_${i}`, nodeStart = Date.now();
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      const nodeEnd = Date.now();
      const nodeResult: NodeExecutionResult = {
        nodeId, status: Math.random() > 0.9 ? 'error' : 'success', startTime: new Date(nodeStart), endTime: new Date(nodeEnd), duration: nodeEnd - nodeStart,
        inputData: [{ step: i }], outputData: [{ result: `Step ${i} completed` }],
        metadata: { memoryUsage: Math.floor(Math.random() * 100) + 50, cpuTime: Math.floor(Math.random() * 50) + 10, apiCalls: Math.floor(Math.random() * 5), retryCount: 0, cached: Math.random() > 0.7 }
      };
      if (nodeResult.status === 'error') {
        nodeResult.error = { code: 'NODE_ERROR', message: `Simulated error in node ${i}`, nodeId, timestamp: new Date(), recoverable: true };
        execution.progress.failedNodes++;
        if (!execution.context.errorHandling.continueOnError) { execution.status = 'error'; break; }
      } else { execution.progress.completedNodes++; }
      execution.context.nodeResults.set(nodeId, nodeResult);
      execution.progress.currentNode = nodeId;
      execution.performance.memoryPeak = Math.max(execution.performance.memoryPeak, nodeResult.metadata.memoryUsage);
    }
    if (execution.status !== 'error') { execution.status = 'success'; execution.result = { success: true, data: { message: 'Workflow completed successfully' } }; }
  }

  private async recordAnalytics(execution: WorkflowExecution): Promise<void> {
    const nodeExecutions = Array.from(execution.context.nodeResults.values()).map(r => ({
      nodeId: r.nodeId, status: r.status as any, startTime: r.startTime, endTime: r.endTime, duration: r.duration,
      input: r.inputData, output: r.outputData, error: r.error ? { message: r.error.message, code: r.error.code } as any : undefined, retryCount: r.metadata.retryCount
    }));
    await workflowAnalytics.recordExecution({
      id: execution.id, workflowId: execution.workflowId, userId: execution.context.userId, status: execution.status as any,
      startTime: execution.context.metadata.startTime, endTime: new Date(), duration: execution.performance.totalDuration,
      input: execution.context.triggerData as Record<string, unknown> | undefined, output: execution.result?.data, nodeExecutions,
      error: execution.result?.error ? { message: execution.result.error.message, code: execution.result.error.code } as any : undefined
    });
  }

  public getExecutionStatus(executionId: string): WorkflowExecution | undefined { return this.activeExecutions.get(executionId); }

  public async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution || execution.status === 'success' || execution.status === 'error') return false;
    execution.status = 'cancelled';
    execution.result = { success: false, error: { code: 'EXECUTION_CANCELLED', message: 'Execution was cancelled by user', nodeId: 'system', timestamp: new Date(), recoverable: false } };
    logger.info('Execution cancelled', { executionId });
    return true;
  }

  public getExecutionHistory(workflowId: string, limit = 50): WorkflowExecution[] {
    const active = Array.from(this.activeExecutions.values()).filter(e => e.workflowId === workflowId);
    return [...active, ...this.historyManager.getHistory(workflowId)]
      .sort((a, b) => b.context.metadata.startTime.getTime() - a.context.metadata.startTime.getTime()).slice(0, limit);
  }

  public getEngineMetrics(): EngineMetrics {
    return this.metricsCollector.calculateEngineMetrics(this.activeExecutions, this.historyManager.getAllHistory(), this.poolManager.calculatePoolUtilization(this.activeExecutions));
  }

  public async pauseExecutionPool(poolId: string): Promise<boolean> {
    if (!this.poolManager.getPool(poolId)) return false;
    const execs = Array.from(this.activeExecutions.values()).filter(e => e.context.environment === (poolId === 'default' ? 'production' : 'development'));
    execs.forEach(e => { if (e.status === 'queued') e.status = 'cancelled'; });
    logger.info('Execution pool paused', { poolId, affectedExecutions: execs.length });
    return true;
  }

  public async resumeExecutionPool(poolId: string): Promise<boolean> {
    if (!this.poolManager.getPool(poolId)) return false;
    const paused = Array.from(this.activeExecutions.values()).filter(e => e.context.environment === (poolId === 'default' ? 'production' : 'development') && e.status === 'cancelled');
    for (const e of paused) { e.status = 'queued'; await this.queueExecution(e); }
    logger.info('Execution pool resumed', { poolId, resumedExecutions: paused.length });
    return true;
  }

  public async drainExecutionPool(poolId: string, timeoutMs = 300000): Promise<boolean> {
    if (!this.poolManager.getPool(poolId)) return false;
    const startTime = Date.now();
    await this.pauseExecutionPool(poolId);
    while (Date.now() - startTime < timeoutMs) {
      const running = Array.from(this.activeExecutions.values()).filter(e => e.context.environment === (poolId === 'default' ? 'production' : 'development') && e.status === 'running');
      if (running.length === 0) break;
      await new Promise(r => setTimeout(r, 1000));
    }
    logger.info('Execution pool drained', { poolId, drainTime: Date.now() - startTime });
    return true;
  }

  public updatePoolConfiguration(poolId: string, config: any): boolean { return this.poolManager.updatePoolConfiguration(poolId, config); }

  public getExecutionTimeline(executionId: string): TimelineEvent[] {
    const exec = this.activeExecutions.get(executionId) || this.historyManager.findExecution(executionId);
    return exec ? this.metricsCollector.buildExecutionTimeline(exec) : [];
  }

  public async cloneExecution(executionId: string, overrides?: Partial<ExecuteWorkflowOptions>): Promise<WorkflowExecution | null> {
    const orig = this.activeExecutions.get(executionId) || this.historyManager.findExecution(executionId);
    if (!orig) return null;
    return this.executeWorkflow(orig.workflowId, orig.context.triggerData, {
      priority: overrides?.priority || orig.context.priority, environment: overrides?.environment || orig.context.environment,
      variables: overrides?.variables || Object.fromEntries(orig.context.variables), parentExecutionId: orig.id, tags: [...orig.context.metadata.tags, 'cloned']
    });
  }
}

// Export singleton instance
export const advancedExecutionEngine = new AdvancedExecutionEngine();

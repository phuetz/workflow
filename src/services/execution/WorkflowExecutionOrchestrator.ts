/**
 * Workflow Execution Orchestrator
 * Unified interface for workflow execution (S2.1)
 *
 * This orchestrator provides a single entry point for executing workflows,
 * delegating to specialized modules in src/execution/ for actual execution.
 *
 * Architecture:
 * - Orchestrator (this) → High-level coordination
 * - ExecutionManager → Execution state tracking
 * - RetryManager → Retry strategies
 * - CircuitBreaker → Failure protection
 * - ParallelExecutor → Parallel node execution
 *
 * Usage:
 * ```typescript
 * const orchestrator = WorkflowExecutionOrchestrator.getInstance();
 * const result = await orchestrator.execute(workflow, options);
 * ```
 */

import { EventEmitter } from 'events';
import { logger } from '../SimpleLogger';
import { ExecutionManager } from '../../execution/ExecutionManager';
import { RetryManager, type RetryConfig } from '../../execution/RetryManager';
import { CircuitBreaker } from '../../execution/CircuitBreaker';
import type { WorkflowExecution, ExecutionStatus } from '../../types/execution';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkflowDefinition {
  id: string;
  name: string;
  version?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings?: WorkflowSettings;
}

export interface WorkflowNode {
  id: string;
  type: string;
  data: {
    label?: string;
    config?: Record<string, unknown>;
    [key: string]: unknown;
  };
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowSettings {
  timeout?: number;
  retryEnabled?: boolean;
  maxRetries?: number;
  parallelExecution?: boolean;
  errorHandling?: 'stop' | 'continue' | 'rollback';
}

export interface ExecutionOptions {
  mode?: 'manual' | 'trigger' | 'webhook' | 'schedule' | 'test';
  triggeredBy?: string;
  input?: Record<string, unknown>;
  timeout?: number;
  retryConfig?: Partial<RetryConfig>;
  dryRun?: boolean;
  debug?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ExecutionResult {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  output?: Record<string, unknown>;
  nodeResults: NodeResult[];
  error?: ExecutionError;
  metrics: ExecutionMetrics;
}

export interface NodeResult {
  nodeId: string;
  nodeName?: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  input?: unknown;
  output?: unknown;
  error?: string;
}

export interface ExecutionError {
  code: string;
  message: string;
  nodeId?: string;
  stack?: string;
  recoverable: boolean;
}

export interface ExecutionMetrics {
  totalNodes: number;
  executedNodes: number;
  skippedNodes: number;
  failedNodes: number;
  totalDuration: number;
  averageNodeDuration: number;
}

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export class WorkflowExecutionOrchestrator extends EventEmitter {
  private static instance: WorkflowExecutionOrchestrator | null = null;

  private executionManager: ExecutionManager;
  private retryManager: RetryManager;
  private circuitBreaker: CircuitBreaker;
  private activeExecutions: Map<string, WorkflowExecution> = new Map();
  private maxConcurrentExecutions: number = 10;

  private constructor() {
    super();
    this.executionManager = new ExecutionManager({
      maxConcurrentExecutions: this.maxConcurrentExecutions,
      defaultTimeout: 300000, // 5 minutes
      enableAutoCleanup: true,
      retentionDays: 30
    });
    this.retryManager = new RetryManager();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000
    });

    logger.info('WorkflowExecutionOrchestrator initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): WorkflowExecutionOrchestrator {
    if (!WorkflowExecutionOrchestrator.instance) {
      WorkflowExecutionOrchestrator.instance = new WorkflowExecutionOrchestrator();
    }
    return WorkflowExecutionOrchestrator.instance;
  }

  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    WorkflowExecutionOrchestrator.instance = null;
  }

  /**
   * Execute a workflow
   */
  async execute(
    workflow: WorkflowDefinition,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = new Date();
    const executionId = this.generateExecutionId();

    logger.info('Starting workflow execution', {
      executionId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      mode: options.mode || 'manual'
    });

    // Check circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      const error: ExecutionError = {
        code: 'CIRCUIT_BREAKER_OPEN',
        message: 'Circuit breaker is open due to recent failures',
        recoverable: true
      };
      return this.createFailedResult(executionId, workflow.id, startTime, error);
    }

    // Check concurrent execution limit
    if (this.activeExecutions.size >= this.maxConcurrentExecutions) {
      const error: ExecutionError = {
        code: 'MAX_CONCURRENT_EXCEEDED',
        message: `Maximum concurrent executions (${this.maxConcurrentExecutions}) reached`,
        recoverable: true
      };
      return this.createFailedResult(executionId, workflow.id, startTime, error);
    }

    try {
      // Start execution tracking
      const execution = await this.executionManager.startExecution({
        workflowId: workflow.id,
        workflowName: workflow.name,
        mode: options.mode || 'manual',
        triggeredBy: options.triggeredBy,
        input: options.input,
        metadata: options.metadata
      });

      this.activeExecutions.set(executionId, execution);
      this.emit('execution:started', { executionId, workflowId: workflow.id });

      // Execute with retry if enabled
      const result = await this.executeWithRetry(
        () => this.executeWorkflow(workflow, execution, options),
        options.retryConfig
      );

      // Complete execution
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await this.executionManager.completeExecution(execution.id, {
        status: result.error ? 'failed' : 'success',
        output: result.output,
        error: result.error
      });

      this.activeExecutions.delete(executionId);
      this.circuitBreaker.recordSuccess();
      this.emit('execution:completed', { executionId, status: result.error ? 'failed' : 'success' });

      return {
        executionId: execution.id,
        workflowId: workflow.id,
        status: result.error ? 'failed' : 'success',
        startTime,
        endTime,
        duration,
        output: result.output,
        nodeResults: result.nodeResults,
        error: result.error,
        metrics: result.metrics
      };

    } catch (error) {
      this.activeExecutions.delete(executionId);
      this.circuitBreaker.recordFailure();

      const execError: ExecutionError = {
        code: 'EXECUTION_FAILED',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        recoverable: false
      };

      logger.error('Workflow execution failed', { executionId, error: execError });
      this.emit('execution:failed', { executionId, error: execError });

      return this.createFailedResult(executionId, workflow.id, startTime, execError);
    }
  }

  /**
   * Execute workflow with retry support
   */
  private async executeWithRetry(
    fn: () => Promise<Partial<ExecutionResult>>,
    retryConfig?: Partial<RetryConfig>
  ): Promise<Partial<ExecutionResult>> {
    if (!retryConfig?.enabled) {
      return fn();
    }

    const config: RetryConfig = {
      enabled: true,
      maxAttempts: retryConfig.maxAttempts || 3,
      strategy: retryConfig.strategy || 'exponential',
      initialDelay: retryConfig.initialDelay || 1000,
      maxDelay: retryConfig.maxDelay || 30000,
      jitter: retryConfig.jitter ?? true
    };

    const result = await this.retryManager.executeWithRetry(fn, config);

    if (result.success && result.result) {
      return result.result;
    }

    return {
      error: {
        code: 'RETRY_EXHAUSTED',
        message: result.error?.message || 'All retry attempts exhausted',
        recoverable: false
      },
      nodeResults: [],
      metrics: this.createEmptyMetrics()
    };
  }

  /**
   * Execute the workflow (core execution logic)
   */
  private async executeWorkflow(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    options: ExecutionOptions
  ): Promise<Partial<ExecutionResult>> {
    const nodeResults: NodeResult[] = [];
    const startNodes = this.findStartNodes(workflow);

    if (startNodes.length === 0) {
      return {
        error: {
          code: 'NO_START_NODE',
          message: 'Workflow has no start nodes (nodes with no incoming edges)',
          recoverable: false
        },
        nodeResults: [],
        metrics: this.createEmptyMetrics()
      };
    }

    // Execute nodes in topological order
    const executionOrder = this.getExecutionOrder(workflow);
    let output: Record<string, unknown> = options.input || {};

    for (const nodeId of executionOrder) {
      const node = workflow.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      if (options.dryRun) {
        nodeResults.push({
          nodeId: node.id,
          nodeName: node.data.label,
          status: 'skipped',
          output: { dryRun: true }
        });
        continue;
      }

      const nodeStartTime = new Date();

      try {
        // Record node execution start
        await this.executionManager.recordNodeExecution(execution.id, {
          nodeId: node.id,
          status: 'running',
          startedAt: nodeStartTime,
          input: output
        });

        // Execute node (simplified - actual implementation would use node executors)
        const nodeOutput = await this.executeNode(node, output, options);

        const nodeEndTime = new Date();
        nodeResults.push({
          nodeId: node.id,
          nodeName: node.data.label,
          status: 'success',
          startTime: nodeStartTime,
          endTime: nodeEndTime,
          duration: nodeEndTime.getTime() - nodeStartTime.getTime(),
          input: output,
          output: nodeOutput
        });

        // Update output for next node
        output = { ...output, ...nodeOutput };

        // Record node completion
        await this.executionManager.recordNodeExecution(execution.id, {
          nodeId: node.id,
          status: 'success',
          completedAt: nodeEndTime,
          output: nodeOutput
        });

        this.emit('node:completed', { nodeId: node.id, status: 'success' });

      } catch (error) {
        const nodeEndTime = new Date();
        const errorMessage = error instanceof Error ? error.message : String(error);

        nodeResults.push({
          nodeId: node.id,
          nodeName: node.data.label,
          status: 'error',
          startTime: nodeStartTime,
          endTime: nodeEndTime,
          duration: nodeEndTime.getTime() - nodeStartTime.getTime(),
          error: errorMessage
        });

        await this.executionManager.recordNodeExecution(execution.id, {
          nodeId: node.id,
          status: 'error',
          completedAt: nodeEndTime,
          error: { message: errorMessage, code: 'NODE_EXECUTION_ERROR' }
        });

        this.emit('node:failed', { nodeId: node.id, error: errorMessage });

        // Check error handling strategy
        if (workflow.settings?.errorHandling !== 'continue') {
          return {
            error: {
              code: 'NODE_EXECUTION_ERROR',
              message: errorMessage,
              nodeId: node.id,
              recoverable: true
            },
            nodeResults,
            metrics: this.calculateMetrics(nodeResults, workflow.nodes.length)
          };
        }
      }
    }

    return {
      output,
      nodeResults,
      metrics: this.calculateMetrics(nodeResults, workflow.nodes.length)
    };
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    node: WorkflowNode,
    input: Record<string, unknown>,
    _options: ExecutionOptions
  ): Promise<Record<string, unknown>> {
    // This is a simplified implementation
    // In production, this would delegate to specific node executors
    // based on node.type (e.g., HttpNodeExecutor, TransformNodeExecutor, etc.)

    logger.debug('Executing node', { nodeId: node.id, type: node.type });

    // Simulate node execution delay
    await new Promise(resolve => setTimeout(resolve, 10));

    return {
      [`${node.id}_output`]: true,
      processedAt: new Date().toISOString(),
      input
    };
  }

  /**
   * Find nodes with no incoming edges (start nodes)
   */
  private findStartNodes(workflow: WorkflowDefinition): string[] {
    const targetsSet = new Set(workflow.edges.map(e => e.target));
    return workflow.nodes
      .filter(n => !targetsSet.has(n.id))
      .map(n => n.id);
  }

  /**
   * Get topological execution order
   */
  private getExecutionOrder(workflow: WorkflowDefinition): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize
    for (const node of workflow.nodes) {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    // Build graph
    for (const edge of workflow.edges) {
      graph.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    // Kahn's algorithm
    const queue: string[] = [];
    const result: string[] = [];

    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) queue.push(nodeId);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      for (const neighbor of graph.get(current) || []) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    return result;
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a failed result
   */
  private createFailedResult(
    executionId: string,
    workflowId: string,
    startTime: Date,
    error: ExecutionError
  ): ExecutionResult {
    const endTime = new Date();
    return {
      executionId,
      workflowId,
      status: 'failed',
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      nodeResults: [],
      error,
      metrics: this.createEmptyMetrics()
    };
  }

  /**
   * Calculate execution metrics
   */
  private calculateMetrics(nodeResults: NodeResult[], totalNodes: number): ExecutionMetrics {
    const executedNodes = nodeResults.filter(r => r.status === 'success').length;
    const skippedNodes = nodeResults.filter(r => r.status === 'skipped').length;
    const failedNodes = nodeResults.filter(r => r.status === 'error').length;
    const durations = nodeResults.filter(r => r.duration).map(r => r.duration!);
    const totalDuration = durations.reduce((a, b) => a + b, 0);
    const averageNodeDuration = durations.length > 0 ? totalDuration / durations.length : 0;

    return {
      totalNodes,
      executedNodes,
      skippedNodes,
      failedNodes,
      totalDuration,
      averageNodeDuration
    };
  }

  /**
   * Create empty metrics
   */
  private createEmptyMetrics(): ExecutionMetrics {
    return {
      totalNodes: 0,
      executedNodes: 0,
      skippedNodes: 0,
      failedNodes: 0,
      totalDuration: 0,
      averageNodeDuration: 0
    };
  }

  /**
   * Cancel an execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      logger.warn('Cannot cancel - execution not found', { executionId });
      return false;
    }

    await this.executionManager.cancelExecution(execution.id);
    this.activeExecutions.delete(executionId);
    this.emit('execution:cancelled', { executionId });
    logger.info('Execution cancelled', { executionId });
    return true;
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string): Promise<ExecutionStatus | null> {
    const execution = this.activeExecutions.get(executionId);
    return execution?.status || null;
  }

  /**
   * Get active executions count
   */
  getActiveExecutionsCount(): number {
    return this.activeExecutions.size;
  }

  /**
   * Set max concurrent executions
   */
  setMaxConcurrentExecutions(max: number): void {
    this.maxConcurrentExecutions = max;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const workflowOrchestrator = WorkflowExecutionOrchestrator.getInstance();

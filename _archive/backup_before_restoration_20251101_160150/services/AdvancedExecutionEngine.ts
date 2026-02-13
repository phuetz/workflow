/**
 * Advanced Workflow Execution Engine
 * High-performance, scalable workflow execution with advanced features
 */

import { logger } from './LoggingService';
import { BaseService } from './BaseService';
import { encryptionService } from './EncryptionService';
import { workflowAnalytics } from './WorkflowAnalyticsService';

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  userId: string;
  triggerData?: unknown;
  variables: Map<string, unknown>;
  nodeResults: Map<string, NodeExecutionResult>;
  metadata: ExecutionMetadata;
  environment: 'development' | 'staging' | 'production';
  priority: 'low' | 'normal' | 'high' | 'critical';
  timeout: number; // milliseconds
  retryPolicy: RetryPolicy;
  errorHandling: ErrorHandlingPolicy;
}

export interface ExecutionMetadata {
  startTime: Date;
  parentExecutionId?: string;
  triggerType: string;
  triggerSource: string;
  executionMode: 'sync' | 'async' | 'streaming';
  tags: string[];
  customProperties: Record<string, unknown>;
}

export interface NodeExecutionResult {
  nodeId: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  inputData: unknown[];
  outputData?: unknown[];
  error?: ExecutionError;
  metadata: {
    memoryUsage: number;
    cpuTime: number;
    apiCalls: number;
    retryCount: number;
    cached: boolean;
  };
}

export interface ExecutionError {
  code: string;
  message: string;
  stack?: string;
  nodeId: string;
  timestamp: Date;
  recoverable: boolean;
  retryAfter?: number;
  context?: Record<string, unknown>;
}

export interface RetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  retryConditions: string[]; // Error codes that trigger retries
  circuitBreaker?: {
    failureThreshold: number;
    timeout: number; // milliseconds
    halfOpenMaxCalls: number;
  };
}

export interface ErrorHandlingPolicy {
  continueOnError: boolean;
  defaultErrorPath?: string;
  errorNotifications: boolean;
  rollbackOnError: boolean;
  savePartialResults: boolean;
}

export interface ExecutionQueue {
  id: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  maxConcurrency: number;
  rateLimiting: {
    enabled: boolean;
    requestsPerSecond: number;
    burstSize: number;
  };
  deadLetterQueue: boolean;
}

export interface ExecutionPool {
  id: string;
  maxWorkers: number;
  queues: ExecutionQueue[];
  healthCheck: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
  scaling: {
    enabled: boolean;
    minWorkers: number;
    maxWorkers: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
  };
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'queued' | 'running' | 'success' | 'error' | 'cancelled' | 'timeout';
  context: ExecutionContext;
  progress: {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    skippedNodes: number;
    currentNode?: string;
  };
  performance: {
    totalDuration: number;
    queueTime: number;
    executionTime: number;
    memoryPeak: number;
    cpuTime: number;
  };
  result?: {
    success: boolean;
    data?: unknown;
    error?: ExecutionError;
    partialResults?: Map<string, unknown>;
  };
}

export class AdvancedExecutionEngine extends BaseService {
  private executionPools: Map<string, ExecutionPool> = new Map();
  private activeExecutions: Map<string, WorkflowExecution> = new Map();
  private executionHistory: Map<string, WorkflowExecution[]> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();

  constructor() {
    super('AdvancedExecutionEngine', {
      enableRetry: true,
      maxRetries: 3,
      enableCaching: true
    });

    this.initializeExecutionPools();
    this.startHealthMonitoring();
  }

  private initializeExecutionPools(): void {
    // Default execution pool
    const defaultPool: ExecutionPool = {
      id: 'default',
      maxWorkers: 10,
      queues: [
        {
          id: 'critical',
          priority: 'critical',
          maxConcurrency: 5,
          rateLimiting: { enabled: false, requestsPerSecond: 0, burstSize: 0 },
          deadLetterQueue: true
        },
        {
          id: 'high',
          priority: 'high',
          maxConcurrency: 8,
          rateLimiting: { enabled: true, requestsPerSecond: 100, burstSize: 10 },
          deadLetterQueue: true
        },
        {
          id: 'normal',
          priority: 'normal',
          maxConcurrency: 15,
          rateLimiting: { enabled: true, requestsPerSecond: 50, burstSize: 5 },
          deadLetterQueue: true
        },
        {
          id: 'low',
          priority: 'low',
          maxConcurrency: 20,
          rateLimiting: { enabled: true, requestsPerSecond: 20, burstSize: 3 },
          deadLetterQueue: false
        }
      ],
      healthCheck: {
        enabled: true,
        interval: 30000, // 30 seconds
        timeout: 5000
      },
      scaling: {
        enabled: true,
        minWorkers: 2,
        maxWorkers: 50,
        scaleUpThreshold: 0.8,
        scaleDownThreshold: 0.3
      }
    };

    this.executionPools.set('default', defaultPool);

    // Background processing pool
    const backgroundPool: ExecutionPool = {
      id: 'background',
      maxWorkers: 5,
      queues: [
        {
          id: 'scheduled',
          priority: 'normal',
          maxConcurrency: 10,
          rateLimiting: { enabled: true, requestsPerSecond: 10, burstSize: 2 },
          deadLetterQueue: true
        },
        {
          id: 'cleanup',
          priority: 'low',
          maxConcurrency: 3,
          rateLimiting: { enabled: true, requestsPerSecond: 5, burstSize: 1 },
          deadLetterQueue: false
        }
      ],
      healthCheck: {
        enabled: true,
        interval: 60000,
        timeout: 10000
      },
      scaling: {
        enabled: false,
        minWorkers: 2,
        maxWorkers: 10,
        scaleUpThreshold: 0.9,
        scaleDownThreshold: 0.2
      }
    };

    this.executionPools.set('background', backgroundPool);

    logger.info('Execution pools initialized', {
      pools: Array.from(this.executionPools.keys()),
      totalQueues: Array.from(this.executionPools.values())
        .reduce((sum, pool) => sum + pool.queues.length, 0)
    });
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.monitorExecutionHealth();
    }, 30000); // Check every 30 seconds

    setInterval(() => {
      this.cleanupCompletedExecutions();
    }, 300000); // Cleanup every 5 minutes
  }

  private async monitorExecutionHealth(): Promise<void> {
    for (const [poolId, pool] of this.executionPools.entries()) {
      if (!pool.healthCheck.enabled) continue;

        .filter(exec => exec.context.priority !== 'low').length;


      // Auto-scaling logic
      if (pool.scaling.enabled) {
        if (utilizationRate > pool.scaling.scaleUpThreshold && 
            pool.maxWorkers < pool.scaling.maxWorkers) {
          await this.scalePool(poolId, 'up');
        } else if (utilizationRate < pool.scaling.scaleDownThreshold && 
                   pool.maxWorkers > pool.scaling.minWorkers) {
          await this.scalePool(poolId, 'down');
        }
      }

      logger.debug('Pool health check', {
        poolId,
        activeExecutions: activeCount,
        maxWorkers: pool.maxWorkers,
        utilization: utilizationRate
      });
    }
  }

  private async scalePool(poolId: string, direction: 'up' | 'down'): Promise<void> {
    if (!pool) return;

    
    if (direction === 'up') {
      pool.maxWorkers = Math.min(pool.maxWorkers + 2, pool.scaling.maxWorkers);
    } else {
      pool.maxWorkers = Math.max(pool.maxWorkers - 1, pool.scaling.minWorkers);
    }

    if (pool.maxWorkers !== oldWorkerCount) {
      logger.info('Pool scaled', {
        poolId,
        direction,
        oldWorkerCount,
        newWorkerCount: pool.maxWorkers
      });
    }
  }

  private cleanupCompletedExecutions(): void {

    for (const [executionId, execution] of this.activeExecutions.entries()) {
      if (execution.context.metadata.startTime.getTime() < cutoffTime &&
          ['success', 'error', 'cancelled'].includes(execution.status)) {
        
        // Move to history
        workflowHistory.push(execution);
        
        // Keep only last 100 executions per workflow
        if (workflowHistory.length > 100) {
          workflowHistory.splice(0, workflowHistory.length - 100);
        }
        
        this.executionHistory.set(execution.workflowId, workflowHistory);
        this.activeExecutions.delete(executionId);
      }
    }
  }

  /**
   * Execute workflow with advanced features
   */
  public async executeWorkflow(
    workflowId: string,
    triggerData?: unknown,
    options?: {
      priority?: 'low' | 'normal' | 'high' | 'critical';
      timeout?: number;
      environment?: 'development' | 'staging' | 'production';
      variables?: Record<string, unknown>;
      parentExecutionId?: string;
      tags?: string[];
    }
  ): Promise<WorkflowExecution> {
    return this.executeOperation('executeWorkflow', async () => {
      
      // Create execution context
      const context: ExecutionContext = {
        workflowId,
        executionId,
        userId: 'system', // Would come from auth context
        triggerData,
        variables: new Map(Object.entries(options?.variables || {})),
        nodeResults: new Map(),
        metadata: {
          startTime: new Date(),
          parentExecutionId: options?.parentExecutionId,
          triggerType: 'manual',
          triggerSource: 'api',
          executionMode: 'async',
          tags: options?.tags || [],
          customProperties: {}
        },
        environment: options?.environment || 'production',
        priority: options?.priority || 'normal',
        timeout: options?.timeout || 300000, // 5 minutes default
        retryPolicy: {
          enabled: true,
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 30000,
          backoffStrategy: 'exponential',
          retryConditions: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT']
        },
        errorHandling: {
          continueOnError: false,
          errorNotifications: true,
          rollbackOnError: false,
          savePartialResults: true
        }
      };

      // Create execution
      const execution: WorkflowExecution = {
        id: executionId,
        workflowId,
        status: 'queued',
        context,
        progress: {
          totalNodes: 0,
          completedNodes: 0,
          failedNodes: 0,
          skippedNodes: 0
        },
        performance: {
          totalDuration: 0,
          queueTime: 0,
          executionTime: 0,
          memoryPeak: 0,
          cpuTime: 0
        }
      };

      // Queue execution
      this.activeExecutions.set(executionId, execution);
      await this.queueExecution(execution);

      logger.info('Workflow execution queued', {
        executionId,
        workflowId,
        priority: context.priority,
        environment: context.environment
      });

      return execution;
    });
  }

  private async queueExecution(execution: WorkflowExecution): Promise<void> {
    
    if (!pool) {
      throw new Error(`Execution pool ${poolId} not found`);
    }

    // Find appropriate queue based on priority
                  pool.queues.find(q => q.priority === 'normal');

    if (!queue) {
      throw new Error(`No suitable queue found for priority ${execution.context.priority}`);
    }

    // Check rate limiting
    if (queue.rateLimiting.enabled) {
      if (!rateLimiter.tryAcquire()) {
        execution.status = 'error';
        execution.result = {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded for queue',
            nodeId: 'system',
            timestamp: new Date(),
            recoverable: true,
            retryAfter: 1000
          }
        };
        return;
      }
    }

    // Start execution asynchronously
    setImmediate(() => this.processExecution(execution));
  }

  private async processExecution(execution: WorkflowExecution): Promise<void> {
    try {
      execution.status = 'running';

      // Simulate workflow processing
      await this.simulateWorkflowExecution(execution);

      execution.performance.executionTime = Date.now() - startTime;
      execution.performance.totalDuration = execution.performance.queueTime + execution.performance.executionTime;

      // Record analytics
      await workflowAnalytics.recordExecution({
        id: execution.id,
        workflowId: execution.workflowId,
        userId: execution.context.userId,
        status: execution.status === 'success' ? 'success' : 'error',
        startTime: execution.context.metadata.startTime,
        endTime: new Date(),
        duration: execution.performance.totalDuration,
        input: execution.context.triggerData,
        output: execution.result?.data,
        nodeExecutions: [],
        context: {
          variables: Object.fromEntries(execution.context.variables),
          results: {},
          metadata: execution.context.metadata
        }
      });

      logger.info('Workflow execution completed', {
        executionId: execution.id,
        status: execution.status,
        duration: execution.performance.totalDuration,
        nodesCompleted: execution.progress.completedNodes,
        nodesFailed: execution.progress.failedNodes
      });

    } catch (error) {
      execution.status = 'error';
      execution.result = {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : String(error),
          nodeId: 'system',
          timestamp: new Date(),
          recoverable: false
        }
      };

      logger.error('Workflow execution failed', {
        executionId: execution.id,
        workflowId: execution.workflowId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async simulateWorkflowExecution(execution: WorkflowExecution): Promise<void> {
    // Mock workflow with 5 nodes
    execution.progress.totalNodes = 5;
    
    for (let __i = 1; i <= 5; i++) {
      
      // Simulate node execution
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

      const nodeResult: NodeExecutionResult = {
        nodeId,
        status: Math.random() > 0.9 ? 'error' : 'success',
        startTime: new Date(nodeStart),
        endTime: new Date(nodeEnd),
        duration: nodeEnd - nodeStart,
        inputData: [{ step: i }],
        outputData: [{ result: `Step ${i} completed` }],
        metadata: {
          memoryUsage: Math.floor(Math.random() * 100) + 50,
          cpuTime: Math.floor(Math.random() * 50) + 10,
          apiCalls: Math.floor(Math.random() * 5),
          retryCount: 0,
          cached: Math.random() > 0.7
        }
      };

      if (nodeResult.status === 'error') {
        nodeResult.error = {
          code: 'NODE_ERROR',
          message: `Simulated error in node ${i}`,
          nodeId,
          timestamp: new Date(),
          recoverable: true
        };
        execution.progress.failedNodes++;
        
        if (!execution.context.errorHandling.continueOnError) {
          execution.status = 'error';
          break;
        }
      } else {
        execution.progress.completedNodes++;
      }

      execution.context.nodeResults.set(nodeId, nodeResult);
      execution.progress.currentNode = nodeId;

      // Update memory usage
      execution.performance.memoryPeak = Math.max(
        execution.performance.memoryPeak,
        nodeResult.metadata.memoryUsage
      );
    }

    if (execution.status !== 'error') {
      execution.status = 'success';
      execution.result = {
        success: true,
        data: { message: 'Workflow completed successfully' }
      };
    }
  }

  private getRateLimiter(queueId: string): RateLimiter {
    if (!this.rateLimiters.has(queueId)) {
      this.rateLimiters.set(queueId, new RateLimiter(50, 1000)); // 50 requests per second
    }
    return this.rateLimiters.get(queueId)!;
  }

  /**
   * Get execution status
   */
  public getExecutionStatus(executionId: string): WorkflowExecution | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Cancel execution
   */
  public async cancelExecution(executionId: string): Promise<boolean> {
    if (!execution || execution.status === 'success' || execution.status === 'error') {
      return false;
    }

    execution.status = 'cancelled';
    execution.result = {
      success: false,
      error: {
        code: 'EXECUTION_CANCELLED',
        message: 'Execution was cancelled by user',
        nodeId: 'system',
        timestamp: new Date(),
        recoverable: false
      }
    };

    logger.info('Execution cancelled', { executionId });
    return true;
  }

  /**
   * Get execution history for workflow
   */
  public getExecutionHistory(workflowId: string, limit: number = 50): WorkflowExecution[] {
      .filter(exec => exec.workflowId === workflowId);
    
    
    return [...active, ...historical]
      .sort((a, b) => b.context.metadata.startTime.getTime() - a.context.metadata.startTime.getTime())
      .slice(0, limit);
  }

  /**
   * Get execution engine metrics
   */
  public getEngineMetrics(): {
    activeExecutions: number;
    queuedExecutions: number;
    completedToday: number;
    errorRate: number;
    averageExecutionTime: number;
    poolUtilization: Record<string, number>;
  } {

    today.setHours(0, 0, 0, 0);
    
      .flat()
      .filter(exec => exec.context.metadata.startTime >= today).length;

      ? recentExecutions.filter(exec => exec.status === 'error').length / recentExecutions.length 
      : 0;

      ? recentExecutions.reduce((sum, exec) => sum + exec.performance.executionTime, 0) / recentExecutions.length
      : 0;

    const poolUtilization: Record<string, number> = {};
    for (const [poolId, pool] of this.executionPools.entries()) {
        exec.context.environment === (poolId === 'default' ? 'production' : 'development')
      ).length;
      poolUtilization[poolId] = poolExecutions / pool.maxWorkers;
    }

    return {
      activeExecutions: running,
      queuedExecutions: queued,
      completedToday,
      errorRate,
      averageExecutionTime: avgExecutionTime,
      poolUtilization
    };
  }
}

class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillIntervalMs: number
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  tryAcquire(): boolean {
    this.refillTokens();
    
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    
    return false;
  }

  private refillTokens(): void {
    
    if (timeSinceRefill >= this.refillIntervalMs) {
      this.tokens = this.maxTokens;
      this.lastRefill = now;
    }
  }
}

class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold: number,
    private timeout: number
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  /**
   * Pause all executions in a pool
   */
  public async pauseExecutionPool(poolId: string): Promise<boolean> {
    if (!pool) return false;
    
    // Mark all queued executions in this pool as paused
      .filter(exec => exec.context.environment === (poolId === 'default' ? 'production' : 'development'));
    
    poolExecutions.forEach(exec => {
      if (exec.status === 'queued') {
        exec.status = 'cancelled'; // Temporary pause state
      }
    });
    
    logger.info('Execution pool paused', { poolId, affectedExecutions: poolExecutions.length });
    return true;
  }
  
  /**
   * Resume executions in a pool
   */
  public async resumeExecutionPool(poolId: string): Promise<boolean> {
    if (!pool) return false;
    
    // Resume paused executions
      .filter(exec => 
        exec.context.environment === (poolId === 'default' ? 'production' : 'development') &&
        exec.status === 'cancelled'
      );
    
    for (const execution of pausedExecutions) {
      execution.status = 'queued';
      await this.queueExecution(execution);
    }
    
    logger.info('Execution pool resumed', { poolId, resumedExecutions: pausedExecutions.length });
    return true;
  }
  
  /**
   * Drain and shutdown execution pool gracefully
   */
  public async drainExecutionPool(poolId: string, timeoutMs: number = 300000): Promise<boolean> {
    if (!pool) return false;
    
    
    // Stop accepting new executions
    await this.pauseExecutionPool(poolId);
    
    // Wait for running executions to complete
    while (Date.now() - startTime < timeoutMs) {
        .filter(exec => 
          exec.context.environment === (poolId === 'default' ? 'production' : 'development') &&
          exec.status === 'running'
        );
      
      if (runningExecutions.length === 0) break;
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    logger.info('Execution pool drained', { poolId, drainTime: Date.now() - startTime });
    return true;
  }
  
  /**
   * Update execution pool configuration
   */
  public updatePoolConfiguration(poolId: string, config: Partial<ExecutionPool>): boolean {
    if (!pool) return false;
    
    // Apply configuration updates
    Object.assign(pool, config);
    
    logger.info('Execution pool configuration updated', { poolId, config });
    return true;
  }
  
  /**
   * Get execution timeline for debugging
   */
  public getExecutionTimeline(executionId: string): Array<{
    timestamp: number;
    event: string;
    nodeId?: string;
    duration?: number;
    data?: unknown;
  }> {
      Array.from(this.executionHistory.values()).flat().find(exec => exec.id === executionId);
    
    if (!execution) return [];
    
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
          data: result.status === 'success' ? { outputData: result.outputData } : { error: result.error }
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
   * Clone execution with new parameters
   */
  public async cloneExecution(
    executionId: string,
    overrides?: {
      priority?: 'low' | 'normal' | 'high' | 'critical';
      environment?: 'development' | 'staging' | 'production';
      variables?: Record<string, unknown>;
    }
  ): Promise<WorkflowExecution | null> {
      Array.from(this.executionHistory.values()).flat().find(exec => exec.id === executionId);
    
    if (!originalExecution) return null;
    
    return this.executeWorkflow(
      originalExecution.workflowId,
      originalExecution.context.triggerData,
      {
        priority: overrides?.priority || originalExecution.context.priority,
        environment: overrides?.environment || originalExecution.context.environment,
        variables: overrides?.variables || Object.fromEntries(originalExecution.context.variables),
        parentExecutionId: originalExecution.id,
        tags: [...originalExecution.context.metadata.tags, 'cloned']
      }
    );
  }
}

// Export singleton instance
export const advancedExecutionEngine = new AdvancedExecutionEngine();
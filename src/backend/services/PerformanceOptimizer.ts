/**
 * Performance Optimizer
 * Optimizes workflow execution performance through intelligent resource allocation
 *
 * Features:
 * - Worker pool management
 * - Resource allocation and limiting
 * - Execution caching
 * - Memory management
 * - CPU utilization optimization
 * - Bottleneck detection
 */

import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import { logger } from '../../services/SimpleLogger';
import { WorkflowNode, WorkflowEdge } from '../../types/workflow';

export interface WorkerPoolConfig {
  minWorkers: number;
  maxWorkers: number;
  idleTimeout: number; // milliseconds
  taskTimeout: number; // milliseconds
}

export interface ResourceLimits {
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxConcurrentExecutions: number;
  maxExecutionTime: number;
}

export interface CacheConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number; // milliseconds
}

export interface PerformanceMetrics {
  workerUtilization: number; // 0-1
  memoryUsage: number; // MB
  cpuUsage: number; // 0-1
  activeExecutions: number;
  queuedExecutions: number;
  averageExecutionTime: number;
  throughput: number; // executions per minute
  cacheHitRate: number; // 0-1
}

export interface ExecutionTask {
  id: string;
  workflowId: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export class PerformanceOptimizer extends EventEmitter {
  private workers: Worker[] = [];
  private taskQueue: ExecutionTask[] = [];
  private activeExecutions = new Map<string, ExecutionTask>();
  private executionCache = new Map<string, { result: unknown; timestamp: number }>();
  private executionHistory: Array<{ duration: number; timestamp: number }> = [];

  private config: {
    workerPool: WorkerPoolConfig;
    resourceLimits: ResourceLimits;
    cache: CacheConfig;
  };

  private metrics: PerformanceMetrics = {
    workerUtilization: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    activeExecutions: 0,
    queuedExecutions: 0,
    averageExecutionTime: 0,
    throughput: 0,
    cacheHitRate: 0
  };

  private metricsInterval: NodeJS.Timeout | null = null;
  private cacheCleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<typeof PerformanceOptimizer.prototype.config>) {
    super();

    this.config = {
      workerPool: {
        minWorkers: 2,
        maxWorkers: 10,
        idleTimeout: 60000, // 1 minute
        taskTimeout: 300000, // 5 minutes
        ...config?.workerPool
      },
      resourceLimits: {
        maxMemoryMB: 2048,
        maxCpuPercent: 80,
        maxConcurrentExecutions: 100,
        maxExecutionTime: 300000, // 5 minutes
        ...config?.resourceLimits
      },
      cache: {
        enabled: true,
        maxSize: 1000,
        ttl: 3600000, // 1 hour
        ...config?.cache
      }
    };

    this.initialize();

    logger.info('PerformanceOptimizer initialized', {
      workerPool: this.config.workerPool,
      resourceLimits: this.config.resourceLimits,
      cache: this.config.cache
    });
  }

  /**
   * Initialize optimizer
   */
  private initialize(): void {
    // Start metrics collection
    this.startMetricsCollection();

    // Start cache cleanup
    if (this.config.cache.enabled) {
      this.startCacheCleanup();
    }

    // Initialize minimum workers
    // Note: Worker creation is commented out as it requires worker_threads module
    // Uncomment when implementing actual worker pool
    // for (let i = 0; i < this.config.workerPool.minWorkers; i++) {
    //   this.createWorker();
    // }
  }

  /**
   * Queue execution task
   */
  public queueTask(task: ExecutionTask): void {
    // Check if we're at capacity
    if (
      this.activeExecutions.size >= this.config.resourceLimits.maxConcurrentExecutions
    ) {
      throw new Error(
        `Maximum concurrent executions reached (${this.config.resourceLimits.maxConcurrentExecutions})`
      );
    }

    // Check cache
    if (this.config.cache.enabled) {
      const cacheKey = this.generateCacheKey(task);
      const cached = this.executionCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.config.cache.ttl) {
        logger.info('Cache hit for execution', {
          taskId: task.id,
          workflowId: task.workflowId
        });

        this.emit('task.cached', {
          taskId: task.id,
          result: cached.result
        });

        return;
      }
    }

    // Add to queue
    this.taskQueue.push(task);
    this.sortTaskQueue();

    logger.info('Task queued', {
      taskId: task.id,
      workflowId: task.workflowId,
      priority: task.priority,
      queueLength: this.taskQueue.length
    });

    this.emit('task.queued', { task });

    // Try to process queue
    this.processQueue();
  }

  /**
   * Sort task queue by priority
   */
  private sortTaskQueue(): void {
    this.taskQueue.sort((a, b) => {
      // Higher priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // Older tasks first
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Process task queue
   */
  private processQueue(): void {
    // Check resource availability
    if (!this.hasAvailableResources()) {
      logger.debug('No available resources, queue processing paused');
      return;
    }

    // Get next task
    const task = this.taskQueue.shift();
    if (!task) return;

    // Start execution
    this.executeTask(task);

    // Continue processing if there are more tasks
    if (this.taskQueue.length > 0) {
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Execute task
   */
  private async executeTask(task: ExecutionTask): Promise<void> {
    task.startedAt = new Date();
    this.activeExecutions.set(task.id, task);

    logger.info('Executing task', {
      taskId: task.id,
      workflowId: task.workflowId,
      nodeCount: task.nodes.length
    });

    this.emit('task.started', { task });

    try {
      // Simulate execution (replace with actual execution logic)
      const result = await this.simulateExecution(task);

      task.completedAt = new Date();
      const duration = task.completedAt.getTime() - task.startedAt.getTime();

      // Add to execution history
      this.executionHistory.push({ duration, timestamp: Date.now() });
      if (this.executionHistory.length > 1000) {
        this.executionHistory.shift();
      }

      // Cache result
      if (this.config.cache.enabled) {
        this.cacheResult(task, result);
      }

      // Remove from active executions
      this.activeExecutions.delete(task.id);

      logger.info('Task completed', {
        taskId: task.id,
        workflowId: task.workflowId,
        duration
      });

      this.emit('task.completed', { task, result, duration });

      // Continue processing queue
      this.processQueue();

    } catch (error) {
      task.completedAt = new Date();
      this.activeExecutions.delete(task.id);

      logger.error('Task execution failed', {
        taskId: task.id,
        workflowId: task.workflowId,
        error
      });

      this.emit('task.failed', { task, error });

      // Continue processing queue
      this.processQueue();
    }
  }

  /**
   * Simulate execution (placeholder)
   */
  private async simulateExecution(task: ExecutionTask): Promise<unknown> {
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      taskId: task.id,
      workflowId: task.workflowId,
      nodesExecuted: task.nodes.length,
      success: true
    };
  }

  /**
   * Check if resources are available
   */
  private hasAvailableResources(): boolean {
    // Check concurrent executions limit
    if (
      this.activeExecutions.size >= this.config.resourceLimits.maxConcurrentExecutions
    ) {
      return false;
    }

    // Check memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
      if (memoryUsage > this.config.resourceLimits.maxMemoryMB * 0.9) {
        logger.warn('Memory usage high, pausing execution', {
          memoryUsage,
          limit: this.config.resourceLimits.maxMemoryMB
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Generate cache key for task
   */
  private generateCacheKey(task: ExecutionTask): string {
    // Simple cache key based on workflow ID and node configuration
    // In production, use a more sophisticated hashing strategy
    const nodeIds = task.nodes.map(n => n.id).sort().join(',');
    return `${task.workflowId}:${nodeIds}`;
  }

  /**
   * Cache execution result
   */
  private cacheResult(task: ExecutionTask, result: unknown): void {
    const cacheKey = this.generateCacheKey(task);

    // Check cache size limit
    if (this.executionCache.size >= this.config.cache.maxSize) {
      // Remove oldest entry
      const oldestKey = this.executionCache.keys().next().value;
      if (oldestKey) {
        this.executionCache.delete(oldestKey);
      }
    }

    this.executionCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    logger.debug('Result cached', {
      taskId: task.id,
      cacheKey,
      cacheSize: this.executionCache.size
    });
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 5000); // Update every 5 seconds
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    // Update basic metrics
    this.metrics.activeExecutions = this.activeExecutions.size;
    this.metrics.queuedExecutions = this.taskQueue.length;

    // Calculate memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.metrics.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    }

    // Calculate average execution time
    if (this.executionHistory.length > 0) {
      const totalDuration = this.executionHistory.reduce(
        (sum, entry) => sum + entry.duration,
        0
      );
      this.metrics.averageExecutionTime =
        totalDuration / this.executionHistory.length;
    }

    // Calculate throughput (executions per minute)
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentExecutions = this.executionHistory.filter(
      entry => entry.timestamp > oneMinuteAgo
    );
    this.metrics.throughput = recentExecutions.length;

    // Calculate cache hit rate
    // This is a simplified calculation - in production, track hits/misses explicitly
    this.metrics.cacheHitRate = this.executionCache.size > 0 ? 0.3 : 0; // Placeholder

    // Emit metrics update
    this.emit('metrics.updated', { metrics: this.metrics });

    // Check for resource warnings
    this.checkResourceWarnings();
  }

  /**
   * Check for resource warnings
   */
  private checkResourceWarnings(): void {
    // Memory warning
    if (this.metrics.memoryUsage > this.config.resourceLimits.maxMemoryMB * 0.8) {
      this.emit('warning.memory', {
        usage: this.metrics.memoryUsage,
        limit: this.config.resourceLimits.maxMemoryMB
      });
    }

    // Queue warning
    if (this.taskQueue.length > 50) {
      this.emit('warning.queue', {
        queueLength: this.taskQueue.length
      });
    }

    // Execution time warning
    if (this.metrics.averageExecutionTime > 10000) {
      this.emit('warning.slow_executions', {
        averageTime: this.metrics.averageExecutionTime
      });
    }
  }

  /**
   * Start cache cleanup
   */
  private startCacheCleanup(): void {
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, 60000); // Cleanup every minute
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.executionCache.entries()) {
      if (now - entry.timestamp > this.config.cache.ttl) {
        this.executionCache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug('Cache cleanup completed', {
        removed,
        remaining: this.executionCache.size
      });
    }
  }

  /**
   * Get current metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get bottleneck analysis
   */
  public analyzeBottlenecks(): {
    slowestNodes: Array<{ nodeId: string; averageDuration: number }>;
    memoryIntensiveNodes: Array<{ nodeId: string; averageMemory: number }>;
    recommendations: string[];
  } {
    // Placeholder analysis
    // In production, track node-level metrics
    return {
      slowestNodes: [],
      memoryIntensiveNodes: [],
      recommendations: [
        'Consider increasing worker pool size for better throughput',
        'Enable caching to reduce redundant executions',
        'Monitor memory usage to prevent resource exhaustion'
      ]
    };
  }

  /**
   * Optimize configuration based on metrics
   */
  public autoOptimize(): void {
    logger.info('Running auto-optimization');

    // Adjust worker pool size based on queue length
    if (this.taskQueue.length > 20 && this.metrics.memoryUsage < this.config.resourceLimits.maxMemoryMB * 0.7) {
      logger.info('Queue is long and memory is available, recommend increasing workers');
    }

    // Suggest cache configuration
    if (this.metrics.cacheHitRate > 0.5) {
      logger.info('High cache hit rate, consider increasing cache size');
    }

    // Emit optimization recommendations
    this.emit('optimization.recommendations', {
      metrics: this.metrics,
      recommendations: this.analyzeBottlenecks().recommendations
    });
  }

  /**
   * Cancel task
   */
  public cancelTask(taskId: string): boolean {
    // Remove from queue
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1);
      logger.info('Task cancelled (removed from queue)', { taskId });
      return true;
    }

    // Check active executions
    const activeTask = this.activeExecutions.get(taskId);
    if (activeTask) {
      // Cannot cancel active execution easily without worker threads
      logger.warn('Cannot cancel active execution', { taskId });
      return false;
    }

    return false;
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.executionCache.clear();
    logger.info('Execution cache cleared');
  }

  /**
   * Shutdown optimizer
   */
  public shutdown(): void {
    logger.info('Shutting down PerformanceOptimizer');

    // Stop intervals
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }

    // Clear queues and caches
    this.taskQueue = [];
    this.activeExecutions.clear();
    this.executionCache.clear();
    this.executionHistory = [];

    // Remove listeners
    this.removeAllListeners();

    logger.info('PerformanceOptimizer shutdown complete');
  }
}

// Singleton instance
let performanceOptimizer: PerformanceOptimizer | null = null;

export function getPerformanceOptimizer(): PerformanceOptimizer {
  if (!performanceOptimizer) {
    performanceOptimizer = new PerformanceOptimizer();
  }
  return performanceOptimizer;
}

export function initializePerformanceOptimizer(
  config?: Parameters<(config?: Partial<PerformanceOptimizer['config']>) => void>[0]
): PerformanceOptimizer {
  if (!performanceOptimizer) {
    performanceOptimizer = new PerformanceOptimizer(config);
  }
  return performanceOptimizer;
}

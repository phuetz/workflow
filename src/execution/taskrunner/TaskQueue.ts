/**
 * Task Queue - Priority-based task queue with deduplication
 * Part of the Task Runner Architecture for 6x faster execution
 */

import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';
import {
  Task,
  TaskPriority,
  TaskQueueConfig,
  TaskQueueMetrics,
  TaskStatus
} from '../../types/taskrunner';

export class TaskQueue extends EventEmitter {
  private queues: Map<TaskPriority, Task[]> = new Map();
  private taskMap: Map<string, Task> = new Map(); // Fast lookup
  private deduplicationCache: Map<string, number> = new Map(); // Task hash -> timestamp
  private runningTasks: Set<string> = new Set();
  private completedTasks: Set<string> = new Set();
  private failedTasks: Set<string> = new Set();

  private readonly config: Required<TaskQueueConfig>;
  private readonly priorityOrder: TaskPriority[] = ['critical', 'high', 'normal', 'low'];

  // Metrics tracking
  private metrics = {
    totalQueued: 0,
    totalCompleted: 0,
    totalFailed: 0,
    waitTimes: [] as number[],
    executionTimes: [] as number[]
  };

  constructor(config: Partial<TaskQueueConfig> = {}) {
    super();

    this.config = {
      maxQueueSize: config.maxQueueSize || 10000,
      priorityLevels: config.priorityLevels || {
        critical: 1000,
        high: 100,
        normal: 10,
        low: 1
      },
      taskTimeout: config.taskTimeout || 300000, // 5 minutes
      enableDeduplication: config.enableDeduplication !== false,
      deduplicationWindow: config.deduplicationWindow || 60000 // 1 minute
    };

    // Initialize priority queues
    this.priorityOrder.forEach(priority => {
      this.queues.set(priority, []);
    });

    // Start cleanup interval for deduplication cache
    this.startCacheCleanup();

    logger.info('TaskQueue initialized', {
      maxQueueSize: this.config.maxQueueSize,
      deduplication: this.config.enableDeduplication
    });
  }

  /**
   * Enqueue a task with priority handling
   */
  enqueue(task: Task): boolean {
    // Check queue size limit
    if (this.getTotalQueueSize() >= this.config.maxQueueSize) {
      logger.warn('Queue is full, rejecting task', { taskId: task.id });
      this.emit('queue_full', task);
      return false;
    }

    // Check for duplicates if enabled
    if (this.config.enableDeduplication) {
      const taskHash = this.getTaskHash(task);
      const existingTimestamp = this.deduplicationCache.get(taskHash);

      if (existingTimestamp) {
        const age = Date.now() - existingTimestamp;
        if (age < this.config.deduplicationWindow) {
          logger.debug('Duplicate task detected, skipping', { taskId: task.id, hash: taskHash });
          this.emit('duplicate_task', task);
          return false;
        }
      }

      // Update deduplication cache
      this.deduplicationCache.set(taskHash, Date.now());
    }

    // Add to appropriate priority queue
    const queue = this.queues.get(task.priority);
    if (!queue) {
      logger.error('Invalid priority level', { priority: task.priority });
      return false;
    }

    // Insert task in sorted order based on created time (FIFO within priority)
    const insertIndex = this.findInsertPosition(queue, task);
    queue.splice(insertIndex, 0, task);

    // Add to task map for fast lookup
    this.taskMap.set(task.id, task);

    // Update task status
    task.status = 'queued';

    // Update metrics
    this.metrics.totalQueued++;

    logger.debug('Task enqueued', {
      taskId: task.id,
      priority: task.priority,
      queuePosition: insertIndex
    });

    this.emit('task_queued', task);
    return true;
  }

  /**
   * Dequeue the highest priority task
   */
  dequeue(): Task | null {
    // Check queues in priority order
    for (const priority of this.priorityOrder) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        const task = queue.shift()!;

        // Update task status
        task.status = 'running';
        task.startedAt = Date.now();

        // Track running task
        this.runningTasks.add(task.id);

        // Calculate wait time
        const waitTime = task.startedAt - task.createdAt;
        this.metrics.waitTimes.push(waitTime);

        logger.debug('Task dequeued', {
          taskId: task.id,
          priority: task.priority,
          waitTime
        });

        this.emit('task_dequeued', task);
        return task;
      }
    }

    return null;
  }

  /**
   * Mark a task as completed
   */
  complete(taskId: string): void {
    const task = this.taskMap.get(taskId);
    if (!task) {
      logger.warn('Cannot complete unknown task', { taskId });
      return;
    }

    task.status = 'completed';
    task.completedAt = Date.now();

    // Remove from running tasks
    this.runningTasks.delete(taskId);

    // Add to completed tasks
    this.completedTasks.add(taskId);

    // Calculate execution time
    if (task.startedAt && task.completedAt) {
      const executionTime = task.completedAt - task.startedAt;
      this.metrics.executionTimes.push(executionTime);
    }

    // Update metrics
    this.metrics.totalCompleted++;

    logger.debug('Task completed', {
      taskId,
      executionTime: task.completedAt - (task.startedAt || task.createdAt)
    });

    this.emit('task_completed', task);
  }

  /**
   * Mark a task as failed
   */
  fail(taskId: string, error: string): void {
    const task = this.taskMap.get(taskId);
    if (!task) {
      logger.warn('Cannot fail unknown task', { taskId });
      return;
    }

    task.status = 'failed';
    task.completedAt = Date.now();

    // Remove from running tasks
    this.runningTasks.delete(taskId);

    // Add to failed tasks
    this.failedTasks.add(taskId);

    // Update metrics
    this.metrics.totalFailed++;

    logger.debug('Task failed', { taskId, error });

    this.emit('task_failed', task, error);
  }

  /**
   * Retry a failed task
   */
  retry(taskId: string): boolean {
    const task = this.taskMap.get(taskId);
    if (!task) {
      logger.warn('Cannot retry unknown task', { taskId });
      return false;
    }

    if (task.retryCount >= task.maxRetries) {
      logger.warn('Task exceeded max retries', {
        taskId,
        retryCount: task.retryCount,
        maxRetries: task.maxRetries
      });
      return false;
    }

    // Increment retry count
    task.retryCount++;
    task.status = 'pending';
    task.startedAt = undefined;
    task.completedAt = undefined;

    // Remove from failed tasks
    this.failedTasks.delete(taskId);

    // Re-enqueue the task
    return this.enqueue(task);
  }

  /**
   * Cancel a task
   */
  cancel(taskId: string): boolean {
    const task = this.taskMap.get(taskId);
    if (!task) {
      logger.warn('Cannot cancel unknown task', { taskId });
      return false;
    }

    // Remove from queues
    const queue = this.queues.get(task.priority);
    if (queue) {
      const index = queue.findIndex(t => t.id === taskId);
      if (index !== -1) {
        queue.splice(index, 1);
      }
    }

    // Remove from running tasks
    this.runningTasks.delete(taskId);

    // Update task status
    task.status = 'cancelled';
    task.completedAt = Date.now();

    logger.debug('Task cancelled', { taskId });

    this.emit('task_cancelled', task);
    return true;
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.taskMap.get(taskId);
  }

  /**
   * Get all pending tasks
   */
  getPendingTasks(): Task[] {
    const tasks: Task[] = [];
    this.priorityOrder.forEach(priority => {
      const queue = this.queues.get(priority);
      if (queue) {
        tasks.push(...queue);
      }
    });
    return tasks;
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return Array.from(this.taskMap.values()).filter(task => task.status === status);
  }

  /**
   * Get queue metrics
   */
  getMetrics(): TaskQueueMetrics {
    const pendingTasks = this.getTotalQueueSize();
    const runningTasks = this.runningTasks.size;

    // Calculate average times
    const avgWaitTime = this.calculateAverage(this.metrics.waitTimes);
    const avgExecutionTime = this.calculateAverage(this.metrics.executionTimes);

    // Calculate priority distribution
    const priorityDistribution: Record<TaskPriority, number> = {
      critical: this.queues.get('critical')?.length || 0,
      high: this.queues.get('high')?.length || 0,
      normal: this.queues.get('normal')?.length || 0,
      low: this.queues.get('low')?.length || 0
    };

    return {
      totalQueued: this.metrics.totalQueued,
      pendingTasks,
      runningTasks,
      completedTasks: this.metrics.totalCompleted,
      failedTasks: this.metrics.totalFailed,
      averageWaitTime: avgWaitTime,
      averageExecutionTime: avgExecutionTime,
      queueSize: pendingTasks,
      priorityDistribution
    };
  }

  /**
   * Clear all tasks
   */
  clear(): void {
    this.priorityOrder.forEach(priority => {
      this.queues.get(priority)?.splice(0);
    });

    this.taskMap.clear();
    this.runningTasks.clear();
    this.completedTasks.clear();
    this.failedTasks.clear();
    this.deduplicationCache.clear();

    logger.info('Task queue cleared');
    this.emit('queue_cleared');
  }

  /**
   * Shutdown the queue
   */
  shutdown(): void {
    this.clear();
    this.removeAllListeners();
    logger.info('Task queue shutdown');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private getTotalQueueSize(): number {
    let total = 0;
    this.queues.forEach(queue => {
      total += queue.length;
    });
    return total;
  }

  private findInsertPosition(queue: Task[], task: Task): number {
    // Insert at end for FIFO within same priority
    return queue.length;
  }

  private getTaskHash(task: Task): string {
    // Create a hash based on workflow, node, and input data
    return `${task.workflowId}:${task.nodeId}:${JSON.stringify(task.inputData)}`;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  private startCacheCleanup(): void {
    // Clean up old deduplication cache entries every minute
    setInterval(() => {
      const now = Date.now();
      const toDelete: string[] = [];

      this.deduplicationCache.forEach((timestamp, hash) => {
        if (now - timestamp > this.config.deduplicationWindow) {
          toDelete.push(hash);
        }
      });

      toDelete.forEach(hash => this.deduplicationCache.delete(hash));

      if (toDelete.length > 0) {
        logger.debug('Cleaned up deduplication cache', { removed: toDelete.length });
      }
    }, 60000); // Every minute
  }
}

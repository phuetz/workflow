/**
 * PLAN C PHASE 4 - Worker Pool Distribué
 * Système de workers pour exécution parallèle massive
 * Supporte jusqu'à 1000 workers simultanés
 */

import { EventEmitter } from 'events';
import { 
  withErrorHandling, 
  withRetry,
  withCache,
  generateId,
  processBatch
} from '../../utils/SharedPatterns';
import { 
  UnknownObject, 
  JsonValue,
  AsyncFunction,
  isNumber,
  isObject
} from '../../types/StrictTypes';

// ============================================
// Types
// ============================================

export interface WorkerConfig {
  maxWorkers: number;
  minWorkers: number;
  taskTimeout: number;
  maxRetries: number;
  autoScale: boolean;
  healthCheckInterval: number;
  maxQueueSize: number;
  priorityLevels: number;
}

export interface WorkerTask {
  id: string;
  type: string;
  payload: JsonValue;
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  timeout: number;
  callback?: (result: JsonValue) => void;
}

export interface WorkerInstance {
  id: string;
  status: 'idle' | 'busy' | 'error' | 'terminated';
  currentTask?: WorkerTask;
  processedTasks: number;
  errorCount: number;
  lastHealthCheck: Date;
  performance: WorkerPerformance;
  worker?: Worker;
}

export interface WorkerPerformance {
  avgExecutionTime: number;
  successRate: number;
  throughput: number;
  cpuUsage: number;
  memoryUsage: number;
}

export interface PoolMetrics {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  queuedTasks: number;
  processedTasks: number;
  failedTasks: number;
  avgWaitTime: number;
  avgExecutionTime: number;
  throughput: number;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  result?: JsonValue;
  error?: Error;
  executionTime: number;
  workerId: string;
}

// ============================================
// Worker Pool Implementation
// ============================================

export class DistributedWorkerPool extends EventEmitter {
  private workers: Map<string, WorkerInstance> = new Map();
  private taskQueue: PriorityQueue<WorkerTask>;
  private results: Map<string, TaskResult> = new Map();
  private metrics: PoolMetrics;
  
  private config: WorkerConfig = {
    maxWorkers: navigator.hardwareConcurrency * 2 || 8,
    minWorkers: 2,
    taskTimeout: 30000,
    maxRetries: 3,
    autoScale: true,
    healthCheckInterval: 5000,
    maxQueueSize: 10000,
    priorityLevels: 5
  };
  
  private isRunning = false;
  private processInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private scaleInterval?: NodeJS.Timeout;

  constructor(config?: Partial<WorkerConfig>) {
    super();
    this.config = { ...this.config, ...config };
    this.taskQueue = new PriorityQueue(this.config.priorityLevels);
    this.metrics = this.initializeMetrics();
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Start the worker pool
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    await withErrorHandling(
      async () => {
        this.isRunning = true;
        
        // Create initial workers
        await this.createWorkers(this.config.minWorkers);
        
        // Start task processor
        this.processInterval = setInterval(() => {
          this.processTasks();
        }, 100);
        
        // Start health checker
        this.healthCheckInterval = setInterval(() => {
          this.performHealthCheck();
        }, this.config.healthCheckInterval);
        
        // Start auto-scaler
        if (this.config.autoScale) {
          this.scaleInterval = setInterval(() => {
            this.autoScale();
          }, 1000);
        }
        
        this.emit('pool:started', { workers: this.workers.size });
      },
      {
        operation: 'start',
        module: 'DistributedWorkerPool'
      }
    );
  }

  /**
   * Stop the worker pool
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // Clear intervals
    if (this.processInterval) clearInterval(this.processInterval);
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.scaleInterval) clearInterval(this.scaleInterval);
    
    // Terminate all workers
    await this.terminateAllWorkers();
    
    this.emit('pool:stopped');
  }

  /**
   * Submit a task to the pool
   */
  async submitTask(
    type: string,
    payload: JsonValue,
    options?: {
      priority?: number;
      timeout?: number;
      callback?: (result: JsonValue) => void;
    }
  ): Promise<string> {
    const task: WorkerTask = {
      id: generateId('task'),
      type,
      payload,
      priority: options?.priority || 5,
      createdAt: new Date(),
      retryCount: 0,
      timeout: options?.timeout || this.config.taskTimeout,
      callback: options?.callback
    };
    
    // Check queue size
    if (this.taskQueue.size() >= this.config.maxQueueSize) {
      throw new Error('Task queue is full');
    }
    
    // Add to queue
    this.taskQueue.enqueue(task, task.priority);
    this.metrics.queuedTasks++;
    
    this.emit('task:submitted', { taskId: task.id });
    
    return task.id;
  }

  /**
   * Submit multiple tasks as a batch
   */
  async submitBatch(
    tasks: Array<{ type: string; payload: JsonValue; priority?: number }>
  ): Promise<string[]> {
    const taskIds: string[] = [];
    
    await processBatch(
      tasks,
      async (task) => {
        const id = await this.submitTask(task.type, task.payload, {
          priority: task.priority
        });
        taskIds.push(id);
        return id;
      },
      Math.min(100, tasks.length),
      (processed, total) => {
        this.emit('batch:progress', { processed, total });
      }
    );
    
    return taskIds;
  }

  /**
   * Get task result
   */
  async getResult(taskId: string, timeout?: number): Promise<TaskResult | null> {
    const maxWait = timeout || 60000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const result = this.results.get(taskId);
      if (result) {
        return result;
      }
      
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return null;
  }

  /**
   * Get pool metrics
   */
  getMetrics(): PoolMetrics {
    return { ...this.metrics };
  }

  /**
   * Get worker status
   */
  getWorkerStatus(): Array<{
    id: string;
    status: string;
    tasks: number;
    errors: number;
    performance: WorkerPerformance;
  }> {
    return Array.from(this.workers.values()).map(worker => ({
      id: worker.id,
      status: worker.status,
      tasks: worker.processedTasks,
      errors: worker.errorCount,
      performance: worker.performance
    }));
  }

  // ============================================
  // Private Methods
  // ============================================

  private initializeMetrics(): PoolMetrics {
    return {
      totalWorkers: 0,
      activeWorkers: 0,
      idleWorkers: 0,
      queuedTasks: 0,
      processedTasks: 0,
      failedTasks: 0,
      avgWaitTime: 0,
      avgExecutionTime: 0,
      throughput: 0
    };
  }

  private async createWorkers(count: number): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < count; i++) {
      promises.push(this.createWorker());
    }
    
    await Promise.all(promises);
  }

  private async createWorker(): Promise<void> {
    const workerId = generateId('worker');
    
    // Create Web Worker
    const workerCode = `
      self.onmessage = async function(e) {
        const { task } = e.data;
        
        try {
          // Execute task based on type
          let result;
          
          switch(task.type) {
            case 'compute':
              result = await performComputation(task.payload);
              break;
            case 'transform':
              result = await transformData(task.payload);
              break;
            case 'validate':
              result = await validateData(task.payload);
              break;
            default:
              result = await processGenericTask(task.payload);
          }
          
          self.postMessage({
            success: true,
            taskId: task.id,
            result
          });
        } catch (error) {
          self.postMessage({
            success: false,
            taskId: task.id,
            error: error.message
          });
        }
      };
      
      async function performComputation(data) {
        // Simulate heavy computation
        let result = 0;
        for (let i = 0; i < 1000000; i++) {
          result += Math.sqrt(i);
        }
        return { computed: result, input: data };
      }
      
      async function transformData(data) {
        // Transform data
        return JSON.parse(JSON.stringify(data));
      }
      
      async function validateData(data) {
        // Validate data
        return { valid: true, data };
      }
      
      async function processGenericTask(data) {
        // Generic processing
        return { processed: true, data };
      }
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    
    const instance: WorkerInstance = {
      id: workerId,
      status: 'idle',
      processedTasks: 0,
      errorCount: 0,
      lastHealthCheck: new Date(),
      performance: {
        avgExecutionTime: 0,
        successRate: 100,
        throughput: 0,
        cpuUsage: 0,
        memoryUsage: 0
      },
      worker
    };
    
    // Setup worker message handler
    worker.onmessage = (event) => {
      this.handleWorkerMessage(workerId, event.data);
    };
    
    worker.onerror = (error) => {
      this.handleWorkerError(workerId, error);
    };
    
    this.workers.set(workerId, instance);
    this.metrics.totalWorkers++;
    this.metrics.idleWorkers++;
    
    this.emit('worker:created', { workerId });
  }

  private async terminateWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    
    if (worker) {
      if (worker.worker) {
        worker.worker.terminate();
      }
      
      this.workers.delete(workerId);
      this.metrics.totalWorkers--;
      
      if (worker.status === 'idle') {
        this.metrics.idleWorkers--;
      } else if (worker.status === 'busy') {
        this.metrics.activeWorkers--;
      }
      
      this.emit('worker:terminated', { workerId });
    }
  }

  private async terminateAllWorkers(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const workerId of this.workers.keys()) {
      promises.push(this.terminateWorker(workerId));
    }
    
    await Promise.all(promises);
  }

  private processTasks(): void {
    if (!this.isRunning) return;
    
    // Get idle workers
    const idleWorkers = Array.from(this.workers.values()).filter(
      w => w.status === 'idle'
    );
    
    // Process tasks
    while (idleWorkers.length > 0 && !this.taskQueue.isEmpty()) {
      const worker = idleWorkers.shift()!;
      const task = this.taskQueue.dequeue();
      
      if (task) {
        this.assignTaskToWorker(worker, task);
      }
    }
  }

  private assignTaskToWorker(worker: WorkerInstance, task: WorkerTask): void {
    worker.status = 'busy';
    worker.currentTask = task;
    task.startedAt = new Date();
    
    this.metrics.idleWorkers--;
    this.metrics.activeWorkers++;
    this.metrics.queuedTasks--;
    
    // Send task to worker
    if (worker.worker) {
      worker.worker.postMessage({ task });
    }
    
    // Setup timeout
    setTimeout(() => {
      if (worker.currentTask?.id === task.id) {
        this.handleTaskTimeout(worker.id, task.id);
      }
    }, task.timeout);
    
    this.emit('task:assigned', { workerId: worker.id, taskId: task.id });
  }

  private handleWorkerMessage(workerId: string, message: any): void {
    const worker = this.workers.get(workerId);
    
    if (!worker || !worker.currentTask) return;
    
    const task = worker.currentTask;
    task.completedAt = new Date();
    
    const executionTime = task.completedAt.getTime() - task.startedAt!.getTime();
    
    // Create result
    const result: TaskResult = {
      taskId: task.id,
      success: message.success,
      result: message.result,
      error: message.error ? new Error(message.error) : undefined,
      executionTime,
      workerId
    };
    
    // Store result
    this.results.set(task.id, result);
    
    // Update worker stats
    worker.processedTasks++;
    worker.status = 'idle';
    worker.currentTask = undefined;
    
    // Update performance metrics
    this.updateWorkerPerformance(worker, executionTime, message.success);
    
    // Update pool metrics
    this.metrics.activeWorkers--;
    this.metrics.idleWorkers++;
    this.metrics.processedTasks++;
    
    if (!message.success) {
      this.metrics.failedTasks++;
      worker.errorCount++;
      
      // Retry if needed
      if (task.retryCount < this.config.maxRetries) {
        task.retryCount++;
        task.startedAt = undefined;
        task.completedAt = undefined;
        this.taskQueue.enqueue(task, task.priority);
        this.metrics.queuedTasks++;
      }
    }
    
    // Execute callback if provided
    if (task.callback && message.success) {
      task.callback(message.result);
    }
    
    this.emit('task:completed', result);
  }

  private handleWorkerError(workerId: string, error: any): void {
    const worker = this.workers.get(workerId);
    
    if (!worker) return;
    
    worker.status = 'error';
    worker.errorCount++;
    
    // Requeue current task
    if (worker.currentTask) {
      const task = worker.currentTask;
      task.retryCount++;
      
      if (task.retryCount < this.config.maxRetries) {
        this.taskQueue.enqueue(task, task.priority);
        this.metrics.queuedTasks++;
      }
      
      worker.currentTask = undefined;
    }
    
    // Replace worker
    this.terminateWorker(workerId);
    this.createWorker();
    
    this.emit('worker:error', { workerId, error });
  }

  private handleTaskTimeout(workerId: string, taskId: string): void {
    const worker = this.workers.get(workerId);
    
    if (!worker || worker.currentTask?.id !== taskId) return;
    
    const task = worker.currentTask;
    
    // Create timeout result
    const result: TaskResult = {
      taskId,
      success: false,
      error: new Error('Task timeout'),
      executionTime: this.config.taskTimeout,
      workerId
    };
    
    this.results.set(taskId, result);
    
    // Reset worker
    worker.status = 'idle';
    worker.currentTask = undefined;
    worker.errorCount++;
    
    // Requeue if retries available
    if (task.retryCount < this.config.maxRetries) {
      task.retryCount++;
      task.startedAt = undefined;
      this.taskQueue.enqueue(task, task.priority);
      this.metrics.queuedTasks++;
    }
    
    this.metrics.failedTasks++;
    this.emit('task:timeout', { taskId, workerId });
  }

  private updateWorkerPerformance(
    worker: WorkerInstance,
    executionTime: number,
    success: boolean
  ): void {
    const perf = worker.performance;
    
    // Update average execution time
    perf.avgExecutionTime = perf.avgExecutionTime === 0
      ? executionTime
      : (perf.avgExecutionTime * 0.9) + (executionTime * 0.1);
    
    // Update success rate
    const totalTasks = worker.processedTasks + worker.errorCount;
    perf.successRate = (worker.processedTasks / totalTasks) * 100;
    
    // Update throughput
    perf.throughput = 1000 / perf.avgExecutionTime; // tasks per second
  }

  private performHealthCheck(): void {
    const now = new Date();
    
    for (const worker of this.workers.values()) {
      const timeSinceLastCheck = now.getTime() - worker.lastHealthCheck.getTime();
      
      // Check if worker is stuck
      if (worker.status === 'busy' && timeSinceLastCheck > this.config.taskTimeout * 2) {
        this.handleWorkerError(worker.id, new Error('Worker unresponsive'));
      }
      
      worker.lastHealthCheck = now;
    }
    
    // Update pool metrics
    this.updatePoolMetrics();
  }

  private updatePoolMetrics(): void {
    let totalExecutionTime = 0;
    let totalThroughput = 0;
    
    for (const worker of this.workers.values()) {
      totalExecutionTime += worker.performance.avgExecutionTime;
      totalThroughput += worker.performance.throughput;
    }
    
    this.metrics.avgExecutionTime = this.workers.size > 0
      ? totalExecutionTime / this.workers.size
      : 0;
    
    this.metrics.throughput = totalThroughput;
  }

  private autoScale(): void {
    if (!this.config.autoScale) return;
    
    const queueSize = this.taskQueue.size();
    const idleRatio = this.metrics.idleWorkers / Math.max(1, this.metrics.totalWorkers);
    
    // Scale up if queue is growing and few idle workers
    if (queueSize > 10 && idleRatio < 0.2 && this.metrics.totalWorkers < this.config.maxWorkers) {
      const newWorkers = Math.min(
        Math.ceil(queueSize / 10),
        this.config.maxWorkers - this.metrics.totalWorkers
      );
      
      this.createWorkers(newWorkers);
      this.emit('pool:scaled-up', { added: newWorkers });
    }
    
    // Scale down if many idle workers
    if (idleRatio > 0.7 && this.metrics.totalWorkers > this.config.minWorkers) {
      const toRemove = Math.min(
        Math.floor(this.metrics.idleWorkers / 2),
        this.metrics.totalWorkers - this.config.minWorkers
      );
      
      const idleWorkers = Array.from(this.workers.values())
        .filter(w => w.status === 'idle')
        .slice(0, toRemove);
      
      for (const worker of idleWorkers) {
        this.terminateWorker(worker.id);
      }
      
      if (toRemove > 0) {
        this.emit('pool:scaled-down', { removed: toRemove });
      }
    }
  }
}

// ============================================
// Priority Queue Implementation
// ============================================

class PriorityQueue<T> {
  private queues: T[][];
  private levels: number;
  private count = 0;

  constructor(levels: number = 5) {
    this.levels = levels;
    this.queues = Array(levels).fill(null).map(() => []);
  }

  enqueue(item: T, priority: number): void {
    const level = Math.max(0, Math.min(this.levels - 1, priority - 1));
    this.queues[level].push(item);
    this.count++;
  }

  dequeue(): T | null {
    for (let i = this.levels - 1; i >= 0; i--) {
      if (this.queues[i].length > 0) {
        this.count--;
        return this.queues[i].shift()!;
      }
    }
    return null;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }

  size(): number {
    return this.count;
  }
}

// Export singleton instance
export const workerPool = new DistributedWorkerPool({
  maxWorkers: 16,
  minWorkers: 4,
  autoScale: true
});
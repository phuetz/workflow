/**
 * Task Runner Pool - Worker pool management with auto-scaling
 * Manages a pool of workers for distributed task execution
 */

import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import path from 'path';
import { logger } from '../../services/SimpleLogger';
import {
  Task,
  TaskResult,
  WorkerConfig,
  WorkerMetrics,
  WorkerHealth,
  WorkerPoolConfig,
  WorkerPoolMetrics,
  WorkerStatus,
  LoadBalancingStrategy,
  WorkerMessage,
  ExecuteTaskMessage,
  TaskResultMessage,
  HeartbeatMessage,
  HealthCheckMessage
} from '../../types/taskrunner';

interface PoolWorker {
  id: string;
  worker: Worker;
  status: WorkerStatus;
  metrics: WorkerMetrics;
  health: WorkerHealth;
  currentTasks: Set<string>;
  startTime: number;
}

export class TaskRunnerPool extends EventEmitter {
  private config: Required<WorkerPoolConfig>;
  private workers: Map<string, PoolWorker> = new Map();
  private nextWorkerId = 0;
  private roundRobinIndex = 0;
  private isScaling = false;

  // Metrics
  private poolMetrics: WorkerPoolMetrics = {
    totalWorkers: 0,
    activeWorkers: 0,
    idleWorkers: 0,
    unhealthyWorkers: 0,
    totalTasksProcessed: 0,
    totalTasksSucceeded: 0,
    totalTasksFailed: 0,
    averageTaskTime: 0,
    throughput: 0,
    queueDepth: 0
  };

  private taskTimes: number[] = [];
  private startTime: number = Date.now();

  // Auto-scaling
  private scaleUpTimer?: NodeJS.Timeout;
  private scaleDownTimer?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: Partial<WorkerPoolConfig> = {}) {
    super();

    this.config = {
      minWorkers: config.minWorkers || 2,
      maxWorkers: config.maxWorkers || 16,
      workerStartupTimeout: config.workerStartupTimeout || 5000,
      workerShutdownTimeout: config.workerShutdownTimeout || 10000,
      scaleUpThreshold: config.scaleUpThreshold || 10,
      scaleDownThreshold: config.scaleDownThreshold || 60000, // 1 minute
      healthCheckInterval: config.healthCheckInterval || 5000,
      autoRestart: config.autoRestart !== false,
      loadBalancing: config.loadBalancing || 'least-busy'
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    logger.info('Initializing worker pool', {
      minWorkers: this.config.minWorkers,
      maxWorkers: this.config.maxWorkers,
      loadBalancing: this.config.loadBalancing
    });

    // Start minimum number of workers
    for (let i = 0; i < this.config.minWorkers; i++) {
      await this.addWorker();
    }

    // Start health monitoring
    this.startHealthMonitoring();

    logger.info('Worker pool initialized', {
      workers: this.workers.size
    });
  }

  /**
   * Execute a task on an available worker
   */
  async executeTask(task: Task): Promise<void> {
    const worker = this.selectWorker();

    if (!worker) {
      // Try to scale up if needed
      if (this.workers.size < this.config.maxWorkers) {
        logger.info('No available workers, scaling up');
        await this.scaleUp(1);
        const newWorker = this.selectWorker();
        if (newWorker) {
          this.assignTaskToWorker(newWorker, task);
          return;
        }
      }

      throw new Error('No workers available to execute task');
    }

    this.assignTaskToWorker(worker, task);
  }

  /**
   * Select a worker based on load balancing strategy
   */
  private selectWorker(): PoolWorker | null {
    const availableWorkers = Array.from(this.workers.values()).filter(
      w => w.status !== 'crashed' && w.status !== 'stopping' && w.health.isHealthy
    );

    if (availableWorkers.length === 0) {
      return null;
    }

    switch (this.config.loadBalancing) {
      case 'round-robin':
        return this.selectRoundRobin(availableWorkers);

      case 'least-busy':
        return this.selectLeastBusy(availableWorkers);

      case 'random':
        return this.selectRandom(availableWorkers);

      case 'weighted':
        return this.selectWeighted(availableWorkers);

      default:
        return this.selectLeastBusy(availableWorkers);
    }
  }

  private selectRoundRobin(workers: PoolWorker[]): PoolWorker {
    const worker = workers[this.roundRobinIndex % workers.length];
    this.roundRobinIndex++;
    return worker;
  }

  private selectLeastBusy(workers: PoolWorker[]): PoolWorker {
    return workers.reduce((least, current) => {
      const leastLoad = least.metrics.currentLoad;
      const currentLoad = current.metrics.currentLoad;
      return currentLoad < leastLoad ? current : least;
    });
  }

  private selectRandom(workers: PoolWorker[]): PoolWorker {
    return workers[Math.floor(Math.random() * workers.length)];
  }

  private selectWeighted(workers: PoolWorker[]): PoolWorker {
    // Prefer idle workers, then least busy
    const idleWorkers = workers.filter(w => w.status === 'idle');
    if (idleWorkers.length > 0) {
      return this.selectLeastBusy(idleWorkers);
    }
    return this.selectLeastBusy(workers);
  }

  private assignTaskToWorker(worker: PoolWorker, task: Task): void {
    // Add to worker's current tasks
    worker.currentTasks.add(task.id);

    // Update worker status
    if (worker.status === 'idle') {
      worker.status = 'busy';
      worker.metrics.status = 'busy';
    }

    // Send task to worker
    const message: ExecuteTaskMessage = {
      type: 'execute_task',
      workerId: worker.id,
      timestamp: Date.now(),
      data: { task }
    };

    worker.worker.postMessage(message);

    logger.debug('Task assigned to worker', {
      taskId: task.id,
      workerId: worker.id,
      currentLoad: worker.metrics.currentLoad
    });

    this.emit('task_assigned', task, worker.id);
  }

  /**
   * Add a new worker to the pool
   */
  private async addWorker(): Promise<string> {
    const workerId = `worker_${this.nextWorkerId++}`;

    const workerConfig: WorkerConfig = {
      id: workerId,
      maxConcurrentTasks: 5,
      heartbeatInterval: 2000,
      healthCheckInterval: 5000,
      shutdownTimeout: this.config.workerShutdownTimeout
    };

    // Create worker thread
    const worker = new Worker(
      path.join(__dirname, 'TaskRunnerWorker.js'),
      {
        workerData: {
          config: workerConfig,
          startTime: Date.now()
        }
      }
    );

    // Initialize pool worker
    const poolWorker: PoolWorker = {
      id: workerId,
      worker,
      status: 'starting',
      metrics: {
        workerId,
        status: 'starting',
        tasksProcessed: 0,
        tasksSucceeded: 0,
        tasksFailed: 0,
        currentLoad: 0,
        cpuUsage: 0,
        memoryUsageMB: 0,
        uptime: 0,
        lastHeartbeat: Date.now()
      },
      health: {
        workerId,
        isHealthy: true,
        status: 'starting',
        consecutiveFailures: 0,
        cpuThreshold: 80,
        memoryThreshold: 500
      },
      currentTasks: new Set(),
      startTime: Date.now()
    };

    // Set up message handling
    worker.on('message', (message: WorkerMessage) => {
      this.handleWorkerMessage(workerId, message);
    });

    worker.on('error', (error) => {
      this.handleWorkerError(workerId, error);
    });

    worker.on('exit', (code) => {
      this.handleWorkerExit(workerId, code);
    });

    // Add to pool
    this.workers.set(workerId, poolWorker);
    this.poolMetrics.totalWorkers++;

    // Wait for worker to be ready (with timeout)
    await this.waitForWorkerReady(workerId);

    logger.info('Worker added to pool', { workerId, totalWorkers: this.workers.size });

    this.emit('worker_started', workerId);

    return workerId;
  }

  private async waitForWorkerReady(workerId: string, timeout = 5000): Promise<void> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const worker = this.workers.get(workerId);

        if (!worker) {
          clearInterval(checkInterval);
          reject(new Error('Worker not found'));
          return;
        }

        if (worker.status !== 'starting') {
          clearInterval(checkInterval);
          resolve();
          return;
        }

        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error('Worker startup timeout'));
        }
      }, 100);
    });
  }

  /**
   * Remove a worker from the pool
   */
  private async removeWorker(workerId: string): Promise<void> {
    const poolWorker = this.workers.get(workerId);

    if (!poolWorker) {
      logger.warn('Cannot remove unknown worker', { workerId });
      return;
    }

    logger.info('Removing worker from pool', { workerId });

    // Update status
    poolWorker.status = 'stopping';

    // Send shutdown message
    poolWorker.worker.postMessage({
      type: 'shutdown',
      workerId,
      timestamp: Date.now()
    });

    // Wait for worker to exit (with timeout)
    const shutdownTimeout = setTimeout(() => {
      logger.warn('Worker shutdown timeout, forcing termination', { workerId });
      poolWorker.worker.terminate();
    }, this.config.workerShutdownTimeout);

    // Wait for exit
    await new Promise<void>((resolve) => {
      poolWorker.worker.once('exit', () => {
        clearTimeout(shutdownTimeout);
        resolve();
      });
    });

    // Remove from pool
    this.workers.delete(workerId);
    this.poolMetrics.totalWorkers--;

    logger.info('Worker removed from pool', { workerId });

    this.emit('worker_stopped', workerId);
  }

  private handleWorkerMessage(workerId: string, message: WorkerMessage): void {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    switch (message.type) {
      case 'heartbeat':
        this.handleHeartbeat(workerId, message as HeartbeatMessage);
        break;

      case 'task_result':
        this.handleTaskResult(workerId, message as TaskResultMessage);
        break;

      case 'health_check':
        this.handleHealthCheckResponse(workerId, message as HealthCheckMessage);
        break;

      default:
        logger.debug('Unknown message type from worker', {
          workerId,
          type: message.type
        });
    }
  }

  private handleHeartbeat(workerId: string, message: HeartbeatMessage): void {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    // Update worker metrics
    worker.metrics = message.data.metrics;
    worker.metrics.lastHeartbeat = Date.now();

    // Update status if worker was starting
    if (worker.status === 'starting') {
      worker.status = 'idle';
      worker.health.status = 'idle';
    }
  }

  private handleTaskResult(workerId: string, message: TaskResultMessage): void {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    const result: TaskResult = message.data.result;

    // Remove from current tasks
    worker.currentTasks.delete(result.taskId);

    // Update worker status
    if (worker.currentTasks.size === 0) {
      worker.status = 'idle';
      worker.metrics.status = 'idle';
    }

    // Update pool metrics
    this.poolMetrics.totalTasksProcessed++;
    if (result.success) {
      this.poolMetrics.totalTasksSucceeded++;
    } else {
      this.poolMetrics.totalTasksFailed++;
    }

    // Track task time
    this.taskTimes.push(result.executionTime);
    if (this.taskTimes.length > 1000) {
      this.taskTimes.shift(); // Keep last 1000
    }

    logger.debug('Task result received from worker', {
      workerId,
      taskId: result.taskId,
      success: result.success,
      executionTime: result.executionTime
    });

    this.emit('task_completed', result);
  }

  private handleHealthCheckResponse(workerId: string, message: HealthCheckMessage): void {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    worker.health = message.data.health;
  }

  private handleWorkerError(workerId: string, error: Error): void {
    logger.error('Worker error', {
      workerId,
      error: error.message
    });

    const worker = this.workers.get(workerId);
    if (!worker) return;

    worker.status = 'crashed';
    worker.health.isHealthy = false;
    worker.health.status = 'crashed';
    worker.health.lastError = error.message;
    worker.health.lastErrorTimestamp = Date.now();

    this.emit('worker_crashed', workerId, error);

    // Auto-restart if enabled
    if (this.config.autoRestart) {
      logger.info('Auto-restarting crashed worker', { workerId });
      this.removeWorker(workerId).then(() => {
        return this.addWorker();
      }).catch(err => {
        logger.error('Failed to restart worker', { error: err });
      });
    }
  }

  private handleWorkerExit(workerId: string, code: number): void {
    logger.info('Worker exited', { workerId, code });

    const worker = this.workers.get(workerId);
    if (!worker) return;

    // Only restart if it was unexpected
    if (code !== 0 && this.config.autoRestart && worker.status !== 'stopping') {
      logger.info('Unexpected worker exit, restarting', { workerId, code });
      this.removeWorker(workerId).then(() => {
        return this.addWorker();
      }).catch(err => {
        logger.error('Failed to restart worker', { error: err });
      });
    }
  }

  /**
   * Auto-scaling logic
   */
  async scaleUp(count = 1): Promise<void> {
    if (this.isScaling) return;

    const newWorkerCount = this.workers.size + count;
    if (newWorkerCount > this.config.maxWorkers) {
      logger.warn('Cannot scale up beyond max workers', {
        current: this.workers.size,
        max: this.config.maxWorkers
      });
      return;
    }

    this.isScaling = true;

    logger.info('Scaling up worker pool', {
      current: this.workers.size,
      adding: count
    });

    try {
      const promises = [];
      for (let i = 0; i < count; i++) {
        promises.push(this.addWorker());
      }
      await Promise.all(promises);

      this.emit('scale_up', count);
    } finally {
      this.isScaling = false;
    }
  }

  async scaleDown(count = 1): Promise<void> {
    if (this.isScaling) return;

    const newWorkerCount = this.workers.size - count;
    if (newWorkerCount < this.config.minWorkers) {
      logger.warn('Cannot scale down below min workers', {
        current: this.workers.size,
        min: this.config.minWorkers
      });
      return;
    }

    this.isScaling = true;

    logger.info('Scaling down worker pool', {
      current: this.workers.size,
      removing: count
    });

    try {
      // Remove idle workers first
      const idleWorkers = Array.from(this.workers.values())
        .filter(w => w.status === 'idle')
        .slice(0, count);

      const promises = idleWorkers.map(w => this.removeWorker(w.id));
      await Promise.all(promises);

      this.emit('scale_down', count);
    } finally {
      this.isScaling = false;
    }
  }

  /**
   * Health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkWorkerHealth();
      this.updatePoolMetrics();
      this.checkAutoScaling();
    }, this.config.healthCheckInterval);
  }

  private checkWorkerHealth(): void {
    const now = Date.now();

    for (const [workerId, worker] of this.workers.entries()) {
      // Check heartbeat timeout (30 seconds)
      if (now - worker.metrics.lastHeartbeat > 30000) {
        logger.warn('Worker heartbeat timeout', { workerId });
        worker.health.isHealthy = false;
        worker.health.status = 'unhealthy';
      }

      // Request health check
      worker.worker.postMessage({
        type: 'health_check',
        workerId,
        timestamp: now
      });
    }
  }

  private updatePoolMetrics(): void {
    let activeWorkers = 0;
    let idleWorkers = 0;
    let unhealthyWorkers = 0;

    for (const worker of this.workers.values()) {
      if (worker.status === 'busy') activeWorkers++;
      if (worker.status === 'idle') idleWorkers++;
      if (!worker.health.isHealthy) unhealthyWorkers++;
    }

    this.poolMetrics.activeWorkers = activeWorkers;
    this.poolMetrics.idleWorkers = idleWorkers;
    this.poolMetrics.unhealthyWorkers = unhealthyWorkers;

    // Calculate average task time
    if (this.taskTimes.length > 0) {
      const sum = this.taskTimes.reduce((a, b) => a + b, 0);
      this.poolMetrics.averageTaskTime = sum / this.taskTimes.length;
    }

    // Calculate throughput (tasks per second)
    const uptime = (Date.now() - this.startTime) / 1000;
    this.poolMetrics.throughput = this.poolMetrics.totalTasksProcessed / uptime;
  }

  private checkAutoScaling(): void {
    // Auto scale up if queue depth exceeds threshold
    if (this.poolMetrics.queueDepth >= this.config.scaleUpThreshold) {
      if (this.workers.size < this.config.maxWorkers) {
        logger.info('Auto-scaling up due to queue depth', {
          queueDepth: this.poolMetrics.queueDepth,
          threshold: this.config.scaleUpThreshold
        });
        this.scaleUp(1);
      }
    }

    // Auto scale down if workers idle for too long
    const idleWorkers = Array.from(this.workers.values()).filter(
      w => w.status === 'idle'
    );

    const now = Date.now();
    const idleTooLong = idleWorkers.filter(
      w => now - w.metrics.lastHeartbeat > this.config.scaleDownThreshold
    );

    if (idleTooLong.length > 0 && this.workers.size > this.config.minWorkers) {
      logger.info('Auto-scaling down due to idle workers', {
        idleWorkers: idleTooLong.length
      });
      this.scaleDown(1);
    }
  }

  /**
   * Get pool metrics
   */
  getMetrics(): WorkerPoolMetrics {
    return { ...this.poolMetrics };
  }

  /**
   * Get worker metrics
   */
  getWorkerMetrics(): WorkerMetrics[] {
    return Array.from(this.workers.values()).map(w => w.metrics);
  }

  /**
   * Get worker health
   */
  getWorkerHealth(): WorkerHealth[] {
    return Array.from(this.workers.values()).map(w => w.health);
  }

  /**
   * Update queue depth (called from TaskRunnerService)
   */
  updateQueueDepth(depth: number): void {
    this.poolMetrics.queueDepth = depth;
  }

  /**
   * Shutdown the pool
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down worker pool');

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Stop all workers
    const promises = Array.from(this.workers.keys()).map(workerId =>
      this.removeWorker(workerId)
    );

    await Promise.all(promises);

    this.removeAllListeners();

    logger.info('Worker pool shutdown complete');
  }
}

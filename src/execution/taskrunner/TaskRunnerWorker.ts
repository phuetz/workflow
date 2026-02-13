/**
 * Task Runner Worker - Worker process running in separate thread
 * Executes tasks assigned by the worker pool
 */

import { parentPort, workerData } from 'worker_threads';
import { logger } from '../../services/SimpleLogger';
import { WorkflowExecutor } from '../../components/ExecutionEngine';
import {
  Task,
  TaskResult,
  WorkerConfig,
  WorkerMetrics,
  WorkerStatus,
  WorkerHealth,
  WorkerMessage,
  ExecuteTaskMessage,
  TaskResultMessage,
  HeartbeatMessage,
  HealthCheckMessage,
  ErrorMessage
} from '../../types/taskrunner';
import { SafeExecutionResult } from '../../utils/TypeSafetyUtils';

export class TaskRunnerWorker {
  private config: WorkerConfig;
  private status: WorkerStatus = 'starting';
  private currentTasks: Map<string, Task> = new Map();
  private workflowExecutor: WorkflowExecutor | null = null;

  // Metrics
  private metrics: WorkerMetrics;
  private health: WorkerHealth;

  // Intervals
  private heartbeatInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: WorkerConfig) {
    this.config = config;
    // WorkflowExecutor is created per task execution

    // Initialize metrics
    this.metrics = {
      workerId: config.id,
      status: 'starting',
      tasksProcessed: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
      currentLoad: 0,
      cpuUsage: 0,
      memoryUsageMB: 0,
      uptime: 0,
      lastHeartbeat: Date.now()
    };

    // Initialize health
    this.health = {
      workerId: config.id,
      isHealthy: true,
      status: 'starting',
      consecutiveFailures: 0,
      cpuThreshold: 80,
      memoryThreshold: 500 // MB
    };

    this.initialize();
  }

  private initialize(): void {
    if (!parentPort) {
      throw new Error('TaskRunnerWorker must be run in a worker thread');
    }

    // Set up message handling
    parentPort.on('message', (message: WorkerMessage) => {
      this.handleMessage(message);
    });

    // Start heartbeat
    this.startHeartbeat();

    // Start health checks
    this.startHealthChecks();

    // Mark as ready
    this.status = 'idle';
    this.metrics.status = 'idle';
    this.health.status = 'idle';

    logger.info('Worker initialized', { workerId: this.config.id });

    this.sendMessage({
      type: 'heartbeat',
      workerId: this.config.id,
      timestamp: Date.now(),
      data: { metrics: this.metrics }
    });
  }

  private handleMessage(message: WorkerMessage): void {
    switch (message.type) {
      case 'execute_task':
        this.handleExecuteTask(message as ExecuteTaskMessage);
        break;

      case 'health_check':
        this.handleHealthCheck();
        break;

      case 'shutdown':
        this.handleShutdown();
        break;

      default:
        logger.warn('Unknown message type', { type: message.type });
    }
  }

  private async handleExecuteTask(message: ExecuteTaskMessage): Promise<void> {
    const { task } = message.data;

    try {
      // Check if we can accept more tasks
      if (this.currentTasks.size >= this.config.maxConcurrentTasks) {
        this.sendError('Worker at capacity', task.id);
        return;
      }

      // Update status
      this.status = 'busy';
      this.metrics.status = 'busy';
      this.currentTasks.set(task.id, task);

      // Update load
      this.updateLoad();

      logger.info('Executing task', {
        workerId: this.config.id,
        taskId: task.id,
        nodeId: task.nodeId
      });

      // Execute the task with timeout
      const result = await this.executeTaskWithTimeout(task);

      // Send result back to main thread
      this.sendTaskResult(result);

      // Update metrics
      this.metrics.tasksProcessed++;
      if (result.success) {
        this.metrics.tasksSucceeded++;
        this.health.consecutiveFailures = 0;
      } else {
        this.metrics.tasksFailed++;
        this.health.consecutiveFailures++;
      }

      // Remove from current tasks
      this.currentTasks.delete(task.id);

      // Update status
      if (this.currentTasks.size === 0) {
        this.status = 'idle';
        this.metrics.status = 'idle';
      }

      // Update load
      this.updateLoad();

    } catch (error) {
      logger.error('Task execution failed', {
        workerId: this.config.id,
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error)
      });

      // Send error
      this.sendError(
        error instanceof Error ? error.message : 'Task execution failed',
        task.id
      );

      // Update metrics
      this.metrics.tasksFailed++;
      this.health.consecutiveFailures++;

      // Remove from current tasks
      this.currentTasks.delete(task.id);

      // Update load
      this.updateLoad();

      // Check health
      if (this.health.consecutiveFailures >= 5) {
        this.health.isHealthy = false;
        this.health.status = 'unhealthy';
        this.status = 'unhealthy';
      }
    }
  }

  private async executeTaskWithTimeout(task: Task): Promise<TaskResult> {
    const startTime = Date.now();

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Task timeout after ${task.timeout}ms`));
      }, task.timeout);
    });

    // Execute the task
    const executionPromise = this.executeTask(task);

    try {
      // Race between execution and timeout
      const result = await Promise.race([executionPromise, timeoutPromise]);

      return {
        taskId: task.id,
        nodeId: task.nodeId,
        success: result.success,
        result: result,
        executionTime: Date.now() - startTime,
        workerId: this.config.id,
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        taskId: task.id,
        nodeId: task.nodeId,
        success: false,
        result: {
          success: false,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          nodeId: task.nodeId,
          timestamp: Date.now(),
          duration: Date.now() - startTime
        },
        executionTime: Date.now() - startTime,
        workerId: this.config.id,
        timestamp: Date.now()
      };
    }
  }

  private async executeTask(task: Task): Promise<SafeExecutionResult> {
    try {
      // Create a WorkflowExecutor instance for this task
      // In a real implementation, we'd load the workflow context
      const executor = new WorkflowExecutor([task.node], []);

      // Execute the node using WorkflowExecutor
      const result = await executor.executeNode(task.node, task.inputData);

      return {
        success: result.success,
        status: result.status,
        data: result.data,
        error: result.error?.message,
        nodeId: result.nodeId,
        timestamp: Date.now(),
        duration: result.duration
      };

    } catch (error) {
      logger.error('Node execution failed', {
        nodeId: task.nodeId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        nodeId: task.nodeId,
        timestamp: Date.now(),
        duration: 0
      };
    }
  }

  private handleHealthCheck(): void {
    // Update health metrics
    this.updateHealthMetrics();

    // Send health check response
    const healthMessage: HealthCheckMessage = {
      type: 'health_check',
      workerId: this.config.id,
      timestamp: Date.now(),
      data: {
        health: this.health
      }
    };

    this.sendMessage(healthMessage);
  }

  private handleShutdown(): void {
    logger.info('Worker shutting down', { workerId: this.config.id });

    // Stop intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Update status
    this.status = 'stopping';
    this.metrics.status = 'stopping';

    // Wait for current tasks to complete or timeout
    const shutdownTimeout = setTimeout(() => {
      logger.warn('Worker shutdown timeout, forcing exit', {
        workerId: this.config.id,
        pendingTasks: this.currentTasks.size
      });
      process.exit(0);
    }, this.config.shutdownTimeout);

    // Wait for tasks to complete
    const waitForTasks = setInterval(() => {
      if (this.currentTasks.size === 0) {
        clearInterval(waitForTasks);
        clearTimeout(shutdownTimeout);
        process.exit(0);
      }
    }, 100);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.updateMetrics();

      const heartbeatMessage: HeartbeatMessage = {
        type: 'heartbeat',
        workerId: this.config.id,
        timestamp: Date.now(),
        data: {
          metrics: this.metrics
        }
      };

      this.sendMessage(heartbeatMessage);
    }, this.config.heartbeatInterval);
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.updateHealthMetrics();

      // Check health thresholds
      if (this.metrics.cpuUsage > this.health.cpuThreshold) {
        this.health.isHealthy = false;
        this.health.status = 'unhealthy';
        logger.warn('Worker CPU usage exceeds threshold', {
          workerId: this.config.id,
          cpuUsage: this.metrics.cpuUsage,
          threshold: this.health.cpuThreshold
        });
      }

      if (this.metrics.memoryUsageMB > this.health.memoryThreshold) {
        this.health.isHealthy = false;
        this.health.status = 'unhealthy';
        logger.warn('Worker memory usage exceeds threshold', {
          workerId: this.config.id,
          memoryUsage: this.metrics.memoryUsageMB,
          threshold: this.health.memoryThreshold
        });
      }

    }, this.config.healthCheckInterval);
  }

  private updateMetrics(): void {
    this.metrics.lastHeartbeat = Date.now();
    this.metrics.uptime = Date.now() - (workerData?.startTime || Date.now());
    this.updateLoad();
    this.updateResourceMetrics();
  }

  private updateLoad(): void {
    this.metrics.currentLoad = this.currentTasks.size / this.config.maxConcurrentTasks;
  }

  private updateResourceMetrics(): void {
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    this.metrics.memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

    // Estimate CPU usage (simplified)
    this.metrics.cpuUsage = Math.min(100, this.metrics.currentLoad * 100);
  }

  private updateHealthMetrics(): void {
    this.updateResourceMetrics();

    // Reset health if metrics are good
    if (
      this.metrics.cpuUsage < this.health.cpuThreshold &&
      this.metrics.memoryUsageMB < this.health.memoryThreshold &&
      this.health.consecutiveFailures < 3
    ) {
      this.health.isHealthy = true;
      this.health.status = this.currentTasks.size > 0 ? 'busy' : 'idle';
    }
  }

  private sendMessage(message: WorkerMessage): void {
    if (parentPort) {
      parentPort.postMessage(message);
    }
  }

  private sendTaskResult(result: TaskResult): void {
    const message: TaskResultMessage = {
      type: 'task_result',
      workerId: this.config.id,
      timestamp: Date.now(),
      data: { result }
    };

    this.sendMessage(message);
  }

  private sendError(error: string, taskId?: string): void {
    const message: ErrorMessage = {
      type: 'error',
      workerId: this.config.id,
      timestamp: Date.now(),
      data: { error, taskId }
    };

    this.sendMessage(message);

    // Update health
    this.health.lastError = error;
    this.health.lastErrorTimestamp = Date.now();
  }
}

// Initialize worker when module is loaded in worker thread
if (parentPort && workerData) {
  const worker = new TaskRunnerWorker(workerData.config);
  logger.info('Worker thread started', { workerId: workerData.config.id });
}

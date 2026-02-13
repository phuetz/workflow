/**
 * Workflow Queue Service
 * Uses BullMQ for distributed job processing
 * Supports Redis-based queue with multiple workers
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../services/LogService';

export interface WorkflowJobData {
  workflowId: string;
  executionId: string;
  userId: string;
  inputData: Record<string, unknown>;
  triggerNode?: string;
  mode: 'manual' | 'trigger' | 'webhook';
}

export interface JobResult {
  success: boolean;
  executionId: string;
  output?: Record<string, unknown>;
  error?: string;
  duration: number;
}

export class WorkflowQueueService {
  private queue: Queue;
  private worker?: Worker;
  private events: QueueEvents;
  private connection: IORedis;

  constructor(
    private redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379'
  ) {
    // Create Redis connection
    this.connection = new IORedis(this.redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    // Create queue
    this.queue = new Queue('workflow-executions', {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs
          age: 24 * 3600, // Keep for 24 hours
        },
        removeOnFail: {
          count: 200, // Keep last 200 failed jobs
          age: 7 * 24 * 3600, // Keep for 7 days
        },
      },
    });

    // Create queue events listener
    this.events = new QueueEvents('workflow-executions', {
      connection: this.connection,
    });

    this.setupEventListeners();

    logger.info('WorkflowQueueService initialized');
  }

  /**
   * Add workflow execution to queue
   */
  async addJob(
    data: WorkflowJobData,
    priority: number = 0
  ): Promise<Job<WorkflowJobData, JobResult>> {
    const job = await this.queue.add(
      'execute-workflow',
      data,
      {
        priority,
        jobId: data.executionId, // Use execution ID as job ID for idempotency
      }
    );

    logger.info(`Job added to queue: ${job.id}`, {
      workflowId: data.workflowId,
      executionId: data.executionId,
    });

    return job;
  }

  /**
   * Add high-priority job (executes first)
   */
  async addPriorityJob(data: WorkflowJobData): Promise<Job<WorkflowJobData, JobResult>> {
    return this.addJob(data, 1);
  }

  /**
   * Start worker to process jobs
   * Should be called in worker process
   */
  async startWorker(processor: (job: Job<WorkflowJobData>) => Promise<JobResult>) {
    if (this.worker) {
      logger.warn('Worker already running');
      return;
    }

    this.worker = new Worker<WorkflowJobData, JobResult>(
      'workflow-executions',
      async (job) => {
        logger.info(`Processing job: ${job.id}`, {
          workflowId: job.data.workflowId,
          attempt: job.attemptsMade + 1,
        });

        const startTime = Date.now();

        try {
          const result = await processor(job);

          const duration = Date.now() - startTime;
          logger.info(`Job completed: ${job.id} in ${duration}ms`, {
            executionId: result.executionId,
          });

          return { ...result, duration };
        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error(`Job failed: ${job.id}`, {
            error: error instanceof Error ? error.message : String(error),
            duration,
          });

          throw error; // Re-throw for retry logic
        }
      },
      {
        connection: this.connection,
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || '10'),
        limiter: {
          max: 100, // Max 100 jobs
          duration: 1000, // Per second
        },
      }
    );

    // Worker event listeners
    this.worker.on('completed', (job) => {
      logger.info(`Worker completed job: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Worker failed job: ${job?.id}`, { error: err.message });
    });

    this.worker.on('error', (err) => {
      logger.error('Worker error', { error: err.message });
    });

    logger.info('Worker started', {
      concurrency: process.env.WORKER_CONCURRENCY || '10',
    });
  }

  /**
   * Stop worker gracefully
   */
  async stopWorker() {
    if (this.worker) {
      await this.worker.close();
      this.worker = undefined;
      logger.info('Worker stopped');
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job<WorkflowJobData, JobResult> | undefined> {
    return this.queue.getJob(jobId);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    state: string;
    progress?: number;
    result?: JobResult;
    error?: string;
  } | null> {
    const job = await this.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();

    return {
      state,
      progress: typeof job.progress === 'number' ? job.progress : undefined,
      result: job.returnvalue,
      error: job.failedReason,
    };
  }

  /**
   * Cancel/remove job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
    if (!job) return false;

    await job.remove();
    logger.info(`Job cancelled: ${jobId}`);
    return true;
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
    if (!job) return false;

    const state = await job.getState();
    if (state !== 'failed') {
      logger.warn(`Cannot retry job ${jobId}: not in failed state (${state})`);
      return false;
    }

    await job.retry();
    logger.info(`Job retried: ${jobId}`);
    return true;
  }

  /**
   * Get queue metrics
   */
  async getMetrics() {
    const counts = await this.queue.getJobCounts();

    const waiting = counts.waiting || 0;
    const active = counts.active || 0;
    const completed = counts.completed || 0;
    const failed = counts.failed || 0;
    const delayed = counts.delayed || 0;
    const paused = counts.paused || 0;

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
      total: waiting + active + completed + failed + delayed + paused,
    };
  }

  /**
   * Clean old jobs
   */
  async cleanOldJobs(olderThan: number = 24 * 3600 * 1000) {
    const counts = await this.queue.clean(olderThan, 100, 'completed');
    logger.info(`Cleaned ${counts.length} old completed jobs`);

    const failedCounts = await this.queue.clean(7 * 24 * 3600 * 1000, 100, 'failed');
    logger.info(`Cleaned ${failedCounts.length} old failed jobs`);

    return {
      completed: counts.length,
      failed: failedCounts.length,
    };
  }

  /**
   * Pause queue (stop processing)
   */
  async pauseQueue() {
    await this.queue.pause();
    logger.info('Queue paused');
  }

  /**
   * Resume queue
   */
  async resumeQueue() {
    await this.queue.resume();
    logger.info('Queue resumed');
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners() {
    this.events.on('completed', ({ jobId }) => {
      logger.debug(`Job completed event: ${jobId}`);
    });

    this.events.on('failed', ({ jobId, failedReason }) => {
      logger.error(`Job failed event: ${jobId}`, { reason: failedReason });
    });

    this.events.on('progress', ({ jobId, data }) => {
      logger.debug(`Job progress event: ${jobId}`, { progress: data });
    });

    this.events.on('stalled', ({ jobId }) => {
      logger.warn(`Job stalled event: ${jobId}`);
    });
  }

  /**
   * Close all connections
   */
  async close() {
    await this.stopWorker();
    await this.queue.close();
    await this.events.close();
    await this.connection.quit();
    logger.info('WorkflowQueueService closed');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    redis: boolean;
    queue: boolean;
    metrics: Awaited<ReturnType<WorkflowQueueService['getMetrics']>>;
  }> {
    try {
      // Check Redis connection
      const redisPing = await this.connection.ping();
      const redisHealthy = redisPing === 'PONG';

      // Check queue
      const queueHealthy = this.queue !== undefined;

      // Get metrics
      const metrics = await this.getMetrics();

      return {
        healthy: redisHealthy && queueHealthy,
        redis: redisHealthy,
        queue: queueHealthy,
        metrics,
      };
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        healthy: false,
        redis: false,
        queue: false,
        metrics: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: 0,
          total: 0,
        },
      };
    }
  }
}

// Singleton instance
let queueServiceInstance: WorkflowQueueService | null = null;

export function getQueueService(): WorkflowQueueService {
  if (!queueServiceInstance) {
    queueServiceInstance = new WorkflowQueueService();
  }
  return queueServiceInstance;
}

export function initializeQueueService(redisUrl?: string): WorkflowQueueService {
  if (queueServiceInstance) {
    logger.warn('Queue service already initialized');
    return queueServiceInstance;
  }

  queueServiceInstance = new WorkflowQueueService(redisUrl);
  return queueServiceInstance;
}

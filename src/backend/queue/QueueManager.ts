/**
 * Queue Management System
 * Redis/BullMQ-based job queue for workflow execution
 */

import { Queue, Worker, Job, QueueEvents, JobsOptions } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../../services/SimpleLogger';
import { prisma } from '../database/prisma';
import { ExecutionStatus } from '@prisma/client';

// Job data types
interface WorkflowExecutionData {
  workflowId: string;
  executionId: string;
  input?: Record<string, unknown>;
  inputData?: Record<string, unknown>;
  userId?: string;
  triggeredBy?: string;
  workflow?: {
    nodes: Array<{ id: string; type: string; data: Record<string, unknown> }>;
    edges: Array<{ id: string; source: string; target: string }>;
    settings?: Record<string, unknown>;
  };
}

interface WebhookTriggerData {
  webhookId: string;
  workflowId: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
}

interface ScheduleTriggerData {
  scheduleId: string;
  workflowId: string;
  scheduledTime: string;
}

interface EmailSendData {
  to: string | string[];
  subject: string;
  body: string;
  from?: string;
  attachments?: Array<{ filename: string; content: string }>;
}

type JobData = WorkflowExecutionData | WebhookTriggerData | ScheduleTriggerData | EmailSendData;
type JobResult = Record<string, unknown>;

// Types
interface QueueJob {
  id: string;
  type: 'workflow_execution' | 'webhook_trigger' | 'schedule_trigger' | 'email_send';
  priority: number;
  data: JobData;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  repeat?: {
    cron?: string;
    every?: number;
    limit?: number;
  };
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
}

interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

interface QueueConfig {
  concurrency: number;
  priority: 'high' | 'medium' | 'low';
  retryAttempts: number;
  retryDelay: number;
}

interface QueueJobOptions {
  priority?: 'high' | 'medium' | 'low';
  delay?: number;
  maxAttempts?: number;
  retryDelay?: number;
  repeat?: {
    cron?: string;
    every?: number;
    limit?: number;
  };
}

interface InMemoryJob {
  id: string;
  name: string;
  data: JobData;
  options: JobsOptions;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  result?: JobResult;
  error?: Error;
  attempts: number;
  createdAt: Date;
}

// In-memory queue fallback for development when Redis is not available
class InMemoryQueue {
  private jobs: Map<string, InMemoryJob> = new Map();
  private isPaused: boolean = false;
  private jobCounter: number = 0;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(public name: string) {}

  async add(name: string, data: JobData, opts?: JobsOptions): Promise<{ id: string; name: string; data: JobData }> {
    const id = `${this.name}-${++this.jobCounter}`;
    const job: InMemoryJob = {
      id,
      name,
      data,
      options: opts || {},
      status: opts?.delay ? 'delayed' : 'waiting',
      attempts: 0,
      createdAt: new Date()
    };
    this.jobs.set(id, job);
    this.emit('waiting', { jobId: id });
    return { id, name, data };
  }

  async pause(): Promise<void> {
    this.isPaused = true;
    this.emit('paused');
  }

  async resume(): Promise<void> {
    this.isPaused = false;
    this.emit('resumed');
  }

  async clean(grace: number, limit: number, type: 'completed' | 'failed'): Promise<string[]> {
    const now = Date.now();
    const cleaned: string[] = [];
    const entries = Array.from(this.jobs.entries());
    for (const [id, job] of entries) {
      if (job.status === type && (now - job.createdAt.getTime()) > grace) {
        this.jobs.delete(id);
        cleaned.push(id);
        if (cleaned.length >= limit) break;
      }
    }
    return cleaned;
  }

  async getJobCounts(): Promise<QueueMetrics> {
    const counts: QueueMetrics = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: this.isPaused ? 1 : 0
    };
    const jobs = Array.from(this.jobs.values());
    for (const job of jobs) {
      if (job.status in counts) {
        counts[job.status as keyof QueueMetrics]++;
      }
    }
    return counts;
  }

  async getJob(id: string): Promise<InMemoryJob | null> {
    return this.jobs.get(id) || null;
  }

  async obliterate(): Promise<void> {
    this.jobs.clear();
  }

  async close(): Promise<void> {
    this.jobs.clear();
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  private emit(event: string, data?: Record<string, unknown>): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  // For processing jobs in development mode
  getNextJob(): InMemoryJob | null {
    if (this.isPaused) return null;
    const jobs = Array.from(this.jobs.values());
    for (const job of jobs) {
      if (job.status === 'waiting') {
        job.status = 'active';
        return job;
      }
    }
    return null;
  }

  markCompleted(id: string, result: JobResult): void {
    const job = this.jobs.get(id);
    if (job) {
      job.status = 'completed';
      job.result = result;
      this.emit('completed', { jobId: id, returnvalue: result });
    }
  }

  markFailed(id: string, error: Error): void {
    const job = this.jobs.get(id);
    if (job) {
      job.status = 'failed';
      job.error = error;
      job.attempts++;
      this.emit('failed', { jobId: id, failedReason: error.message });
    }
  }
}

// In-memory worker fallback
// Processor job interface
interface ProcessorJob {
  id: string;
  name: string;
  data: JobData;
  attemptsMade: number;
  opts: JobsOptions;
}

class InMemoryWorker {
  private interval: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = true;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(
    public name: string,
    private processor: (job: ProcessorJob) => Promise<JobResult>,
    private queue: InMemoryQueue,
    private concurrency: number = 1
  ) {
    this.startProcessing();
  }

  private startProcessing(): void {
    this.interval = setInterval(async () => {
      if (!this.isRunning) return;

      const job = this.queue.getNextJob();
      if (job) {
        try {
          const result = await this.processor({
            id: job.id,
            name: job.name,
            data: job.data,
            attemptsMade: job.attempts,
            opts: job.options
          });
          this.queue.markCompleted(job.id, result);
          this.emit('completed', { jobId: job.id, returnvalue: result });
        } catch (error: unknown) {
          const err = error instanceof Error ? error : new Error(String(error));
          this.queue.markFailed(job.id, err);
          this.emit('failed', { jobId: job.id, failedReason: err.message });
        }
      }
    }, 100);
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  private emit(event: string, data?: Record<string, unknown>): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  async pause(): Promise<void> {
    this.isRunning = false;
  }

  async resume(): Promise<void> {
    this.isRunning = true;
  }

  async close(): Promise<void> {
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

export class QueueManager {
  private queues: Map<string, Queue | InMemoryQueue> = new Map();
  private workers: Map<string, (Worker | InMemoryWorker)[]> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private metrics: Map<string, QueueMetrics> = new Map();
  private metricsIntervalId: ReturnType<typeof setInterval> | null = null;
  private connection: Redis | null = null;
  private isRedisAvailable: boolean = false;
  private queueConfigs: Map<string, QueueConfig> = new Map();

  constructor() {
    this.initializeConnection();
  }

  /**
   * Initialize Redis connection with fallback to in-memory mode
   */
  private async initializeConnection(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.connection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        retryStrategy: (times: number) => {
          if (times > 3) {
            logger.warn('Redis connection failed after 3 retries, falling back to in-memory mode');
            return null; // Stop retrying
          }
          return Math.min(times * 200, 1000);
        }
      });

      // Test connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Redis connection timeout'));
        }, 5000);

        this.connection!.once('ready', () => {
          clearTimeout(timeout);
          this.isRedisAvailable = true;
          logger.info('Redis connection established successfully');
          resolve();
        });

        this.connection!.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Redis not available: ${errMsg}. Using in-memory queue mode.`);
      this.isRedisAvailable = false;
      this.connection = null;
    }

    // Initialize queues after connection attempt
    this.initializeQueues();
    this.startMetricsCollection();
  }

  /**
   * Initialize default queues
   */
  private initializeQueues(): void {
    // Workflow execution queue (high priority)
    this.createQueue('workflow-execution', {
      concurrency: 5,
      priority: 'high',
      retryAttempts: 3,
      retryDelay: 5000
    });

    // Webhook processing queue (medium priority)
    this.createQueue('webhook-processing', {
      concurrency: 10,
      priority: 'medium',
      retryAttempts: 2,
      retryDelay: 2000
    });

    // Email sending queue (low priority)
    this.createQueue('email-sending', {
      concurrency: 3,
      priority: 'low',
      retryAttempts: 5,
      retryDelay: 10000
    });

    // Scheduled tasks queue
    this.createQueue('scheduled-tasks', {
      concurrency: 2,
      priority: 'medium',
      retryAttempts: 3,
      retryDelay: 30000
    });

    // Data processing queue
    this.createQueue('data-processing', {
      concurrency: 8,
      priority: 'medium',
      retryAttempts: 2,
      retryDelay: 5000
    });
  }

  /**
   * Create a new queue with BullMQ or fallback to in-memory
   */
  private createQueue(name: string, config: QueueConfig): void {
    this.queueConfigs.set(name, config);

    if (this.isRedisAvailable && this.connection) {
      // Use BullMQ with Redis
      const queue = new Queue(name, {
        connection: this.connection,
        defaultJobOptions: {
          attempts: config.retryAttempts,
          backoff: {
            type: 'exponential',
            delay: config.retryDelay
          },
          removeOnComplete: {
            count: 100,
            age: 24 * 60 * 60 // 24 hours
          },
          removeOnFail: {
            count: 50,
            age: 7 * 24 * 60 * 60 // 7 days
          }
        }
      });

      this.queues.set(name, queue);

      // Create queue events for monitoring
      const queueEvents = new QueueEvents(name, {
        connection: this.connection
      });
      this.queueEvents.set(name, queueEvents);

      // Create workers
      const workers = this.createBullMQWorkers(name, config);
      this.workers.set(name, workers);

      logger.info(`BullMQ queue '${name}' initialized with ${config.concurrency} workers`, {
        queue: name,
        concurrency: config.concurrency,
        mode: 'redis'
      });
    } else {
      // Use in-memory queue
      const queue = new InMemoryQueue(name);
      this.queues.set(name, queue);

      // Create in-memory workers
      const workers = this.createInMemoryWorkers(name, config, queue);
      this.workers.set(name, workers);

      logger.info(`In-memory queue '${name}' initialized with ${config.concurrency} workers`, {
        queue: name,
        concurrency: config.concurrency,
        mode: 'in-memory'
      });
    }

    // Initialize metrics for this queue
    this.metrics.set(name, {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0
    });
  }

  /**
   * Create BullMQ workers with proper event handling
   */
  private createBullMQWorkers(queueName: string, config: QueueConfig): Worker[] {
    const workers: Worker[] = [];

    for (let i = 0; i < config.concurrency; i++) {
      const worker = new Worker(
        queueName,
        async (job: Job) => {
          return await this.processJob({
            id: job.id || `job-${Date.now()}`,
            type: job.name as QueueJob['type'],
            priority: job.opts.priority || 0,
            data: job.data,
            attempts: job.attemptsMade,
            maxAttempts: job.opts.attempts || config.retryAttempts,
            createdAt: new Date(job.timestamp)
          });
        },
        {
          connection: this.connection!,
          concurrency: 1, // Each worker handles one job at a time
          limiter: {
            max: 10,
            duration: 1000 // Rate limit: 10 jobs per second per worker
          }
        }
      );

      worker.on('completed', (job: Job, result: JobResult) => {
        logger.info(`Job ${job.id} completed in queue ${queueName}`, {
          jobId: job.id,
          queue: queueName,
          duration: Date.now() - job.timestamp
        });
        this.updateMetrics(queueName);
      });

      worker.on('failed', (job: Job | undefined, error: Error) => {
        logger.error(`Job ${job?.id} failed in queue ${queueName}`, {
          error: error.message,
          jobId: job?.id,
          queue: queueName,
          attempts: job?.attemptsMade
        });
        this.updateMetrics(queueName);
      });

      worker.on('active', (job: Job) => {
        logger.debug(`Job ${job.id} is now active in queue ${queueName}`, {
          jobId: job.id,
          queue: queueName
        });
      });

      worker.on('stalled', (jobId: string) => {
        logger.warn(`Job ${jobId} stalled in queue ${queueName}`, {
          jobId,
          queue: queueName
        });
      });

      workers.push(worker);
    }

    return workers;
  }

  /**
   * Create in-memory workers for development mode
   */
  private createInMemoryWorkers(queueName: string, config: QueueConfig, queue: InMemoryQueue): InMemoryWorker[] {
    const workers: InMemoryWorker[] = [];

    for (let i = 0; i < config.concurrency; i++) {
      const worker = new InMemoryWorker(
        queueName,
        async (job: ProcessorJob) => {
          return await this.processJob({
            id: job.id,
            type: job.name as QueueJob['type'],
            priority: job.opts?.priority || 0,
            data: job.data,
            attempts: job.attemptsMade || 0,
            maxAttempts: config.retryAttempts,
            createdAt: new Date()
          });
        },
        queue,
        1
      );

      worker.on('completed', (data: Record<string, unknown> | undefined) => {
        const jobId = data?.jobId as string | undefined;
        logger.info(`Job ${jobId} completed in queue ${queueName}`, {
          jobId,
          queue: queueName
        });
        this.updateMetrics(queueName);
      });

      worker.on('failed', (data: Record<string, unknown> | undefined) => {
        const jobId = data?.jobId as string | undefined;
        const failedReason = data?.failedReason as string | undefined;
        logger.error(`Job ${jobId} failed in queue ${queueName}: ${failedReason}`, {
          error: failedReason || 'Unknown error',
          jobId,
          queue: queueName
        });
        this.updateMetrics(queueName);
      });

      workers.push(worker);
    }

    return workers;
  }

  /**
   * Add a job to a queue
   */
  async addJob(queueName: string, jobType: string, data: JobData, options: Partial<QueueJobOptions> = {}): Promise<string> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const jobId = `${jobType}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const config = this.queueConfigs.get(queueName);

    const jobOptions: JobsOptions = {
      jobId,
      priority: this.getPriorityValue(options.priority || config?.priority || 'medium'),
      delay: options.delay,
      attempts: options.maxAttempts || config?.retryAttempts || 3,
      backoff: {
        type: 'exponential',
        delay: options.retryDelay || config?.retryDelay || 5000
      },
      removeOnComplete: {
        count: 100,
        age: 24 * 60 * 60
      },
      removeOnFail: {
        count: 50,
        age: 7 * 24 * 60 * 60
      }
    };

    // Handle repeat options
    if (options.repeat) {
      jobOptions.repeat = {
        pattern: options.repeat.cron,
        every: options.repeat.every,
        limit: options.repeat.limit
      };
    }

    await queue.add(jobType, data, jobOptions);

    logger.info(`Job ${jobId} added to queue ${queueName}`, {
      jobId,
      queue: queueName,
      type: jobType,
      mode: this.isRedisAvailable ? 'redis' : 'in-memory'
    });

    this.updateMetrics(queueName);
    return jobId;
  }

  /**
   * Process individual job
   */
  private async processJob(job: QueueJob): Promise<JobResult> {
    logger.info(`Processing job ${job.id} of type ${job.type}`, {
      jobId: job.id,
      type: job.type
    });

    job.processedAt = new Date();
    job.attempts++;

    try {
      let result: JobResult;

      switch (job.type) {
        case 'workflow_execution':
          result = await this.processWorkflowExecution(job.data as WorkflowExecutionData);
          break;

        case 'webhook_trigger':
          result = await this.processWebhookTrigger(job.data as WebhookTriggerData);
          break;

        case 'schedule_trigger':
          result = await this.processScheduleTrigger(job.data as ScheduleTriggerData);
          break;

        case 'email_send':
          result = await this.processEmailSend(job.data as EmailSendData);
          break;

        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      job.completedAt = new Date();
      logger.info(`Job ${job.id} completed successfully`, {
        jobId: job.id,
        type: job.type,
        duration: job.completedAt.getTime() - job.processedAt.getTime()
      });

      return result;

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      job.failedAt = new Date();
      job.error = err.message;

      logger.error(`Job ${job.id} failed`, {
        error: err.message,
        jobId: job.id,
        type: job.type,
        attempts: job.attempts
      });

      if (job.attempts >= job.maxAttempts) {
        logger.error(`Job ${job.id} exceeded max attempts (${job.maxAttempts})`, {
          error: err.message,
          jobId: job.id,
          maxAttempts: job.maxAttempts
        });
        await this.handleFailedJob(job, err);
      }

      throw err;
    }
  }

  /**
   * Process workflow execution job — delegates to backend executionService (50+ executors).
   */
  private async processWorkflowExecution(data: WorkflowExecutionData): Promise<JobResult> {
    const { executionId, workflowId, inputData, triggeredBy } = data;
    const startTime = Date.now();

    logger.info(`Processing workflow execution: ${executionId}`, {
      workflowId,
      triggeredBy
    });

    try {
      // Load workflow from Prisma
      const workflowRow = await prisma.workflow.findUnique({ where: { id: workflowId } });
      if (!workflowRow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      // Import executionService lazily to avoid circular deps
      const { executionService } = await import('../services/executionService');

      // Map Prisma workflow to the shape executionService expects
      const workflow = {
        id: workflowRow.id,
        name: workflowRow.name,
        nodes: workflowRow.nodes || [],
        edges: workflowRow.edges || [],
        settings: (workflowRow.settings as Record<string, any>) || {},
      };

      // Delegate to the unified execution engine (persists to Prisma, emits SSE)
      const execution = await executionService.startExecution(
        workflow as any,
        inputData || {},
        triggeredBy || 'queue'
      );

      // Poll until execution completes (500ms interval, 5min timeout)
      const maxWaitMs = 5 * 60 * 1000;
      const pollMs = 500;
      const deadline = Date.now() + maxWaitMs;

      while (Date.now() < deadline) {
        const current = await executionService.getExecution(execution.id);
        if (!current) break;
        if (current.status !== 'pending' && current.status !== 'running') {
          const duration = Date.now() - startTime;
          logger.info(`Workflow execution completed: ${execution.id}`, {
            workflowId,
            status: current.status,
            duration,
          });
          return {
            executionId: execution.id,
            workflowId,
            triggeredBy,
            status: current.status,
            duration,
            error: current.error,
          };
        }
        await this.delay(pollMs);
      }

      // Timeout
      await executionService.cancelExecution(execution.id);
      throw new Error(`Execution ${execution.id} timed out after ${maxWaitMs}ms`);

    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));

      logger.error(`Workflow execution failed: ${executionId}`, {
        error: err.message,
        workflowId,
        duration
      });

      // Update execution record with failure (best-effort)
      try {
        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: {
            status: ExecutionStatus.FAILED,
            finishedAt: new Date(),
            duration,
            error: { message: err.message, stack: err.stack }
          }
        });
      } catch {
        // executionId may have been generated by executionService — ignore update failures
      }

      throw err;
    }
  }

  /**
   * Process webhook trigger job
   */
  private async processWebhookTrigger(data: WebhookTriggerData): Promise<JobResult> {
    const { webhookId, payload, headers } = data;
    const startTime = Date.now();

    await this.delay(100 + Math.random() * 500);

    return {
      webhookId,
      processed: true,
      responseStatus: 200,
      processingTime: Date.now() - startTime,
      payloadSize: JSON.stringify(payload || {}).length
    };
  }

  /**
   * Process schedule trigger job
   */
  private async processScheduleTrigger(data: ScheduleTriggerData): Promise<JobResult> {
    const { scheduleId, scheduledTime } = data;

    await this.delay(200 + Math.random() * 800);

    return {
      scheduleId,
      executed: true,
      nextRun: scheduledTime,
      executionTime: new Date().toISOString()
    };
  }

  /**
   * Process email send job
   */
  private async processEmailSend(data: EmailSendData): Promise<JobResult> {
    const { to, subject, body } = data;

    await this.delay(300 + Math.random() * 1000);

    return {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      to,
      subject,
      status: 'sent',
      deliveredAt: new Date().toISOString()
    };
  }

  /**
   * Handle permanently failed jobs
   */
  private async handleFailedJob(job: QueueJob, error: Error): Promise<void> {
    logger.error(`Final failure for job ${job.id}`, {
      error: error.message,
      jobId: job.id,
      type: job.type
    });

    await this.sendFailureAlert(job, error);
    await this.moveToDeadLetterQueue(job);
  }

  /**
   * Pause a specific queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    await queue.pause();

    // Also pause all workers for this queue
    const workers = this.workers.get(queueName);
    if (workers) {
      for (const worker of workers) {
        await worker.pause();
      }
    }

    logger.info(`Queue '${queueName}' paused`, { queue: queueName });
  }

  /**
   * Resume a paused queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    await queue.resume();

    // Also resume all workers for this queue
    const workers = this.workers.get(queueName);
    if (workers) {
      for (const worker of workers) {
        await worker.resume();
      }
    }

    logger.info(`Queue '${queueName}' resumed`, { queue: queueName });
  }

  /**
   * Get metrics for a specific queue
   */
  async getQueueMetrics(queueName: string): Promise<QueueMetrics> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0
      };
    }

    try {
      if (queue instanceof Queue) {
        // BullMQ queue - get real counts from Redis
        const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
        return {
          waiting: counts.waiting || 0,
          active: counts.active || 0,
          completed: counts.completed || 0,
          failed: counts.failed || 0,
          delayed: counts.delayed || 0,
          paused: counts.paused || 0
        };
      } else {
        // In-memory queue
        return await queue.getJobCounts();
      }
    } catch (error) {
      logger.error(`Failed to get metrics for queue ${queueName}`, error as Error);
      return this.metrics.get(queueName) || {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0
      };
    }
  }

  /**
   * Get metrics for all queues
   */
  async getAllQueueMetrics(): Promise<Map<string, QueueMetrics>> {
    const allMetrics = new Map<string, QueueMetrics>();
    const queueNames = Array.from(this.queues.keys());

    for (const queueName of queueNames) {
      const metrics = await this.getQueueMetrics(queueName);
      allMetrics.set(queueName, metrics);
    }

    return allMetrics;
  }

  /**
   * Clean up completed/failed jobs from a queue
   */
  async cleanQueue(queueName: string, grace: number = 24 * 60 * 60 * 1000): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    if (queue instanceof Queue) {
      // BullMQ clean method
      await queue.clean(grace, 100, 'completed');
      await queue.clean(grace, 50, 'failed');
    } else {
      // In-memory clean
      await queue.clean(grace, 100, 'completed');
      await queue.clean(grace, 50, 'failed');
    }

    logger.info(`Queue '${queueName}' cleaned`, { queue: queueName, grace });
  }

  /**
   * Get a specific job by ID
   */
  async getJob(queueName: string, jobId: string): Promise<Job | InMemoryJob | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return null;
    }

    return await queue.getJob(jobId) ?? null;
  }

  /**
   * Remove all jobs from a queue
   */
  async obliterateQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    await queue.obliterate();
    logger.warn(`Queue '${queueName}' obliterated - all jobs removed`, { queue: queueName });
  }

  /**
   * Check if Redis is available
   */
  isUsingRedis(): boolean {
    return this.isRedisAvailable;
  }

  /**
   * Get list of all queue names
   */
  getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  /**
   * Destroy the queue manager and clean up resources
   */
  async destroy(): Promise<void> {
    // Clear metrics collection interval
    if (this.metricsIntervalId) {
      clearInterval(this.metricsIntervalId);
      this.metricsIntervalId = null;
    }

    // Close all workers
    const workerArrays = Array.from(this.workers.values());
    for (const workers of workerArrays) {
      for (const worker of workers) {
        await worker.close();
      }
    }
    this.workers.clear();

    // Close all queue events
    const queueEventsArray = Array.from(this.queueEvents.values());
    for (const queueEvents of queueEventsArray) {
      await queueEvents.close();
    }
    this.queueEvents.clear();

    // Close all queues
    const queuesArray = Array.from(this.queues.values());
    for (const queue of queuesArray) {
      await queue.close();
    }
    this.queues.clear();

    // Close Redis connection
    if (this.connection) {
      await this.connection.quit();
      this.connection = null;
    }

    // Clear metrics
    this.metrics.clear();

    logger.info('QueueManager destroyed');
  }

  // Helper methods
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'high': return 1;
      case 'medium': return 5;
      case 'low': return 10;
      default: return 5;
    }
  }

  private updateMetrics(queueName: string): void {
    // Metrics are updated asynchronously via the collection interval
    // This is a placeholder for immediate metric updates if needed
  }

  private startMetricsCollection(): void {
    this.metricsIntervalId = setInterval(async () => {
      const queueNames = Array.from(this.queues.keys());
      for (const queueName of queueNames) {
        try {
          const metrics = await this.getQueueMetrics(queueName);
          this.metrics.set(queueName, metrics);
        } catch (error) {
          logger.error(`Failed to collect metrics for queue ${queueName}`, error as Error);
        }
      }
    }, 5000);
  }

  private getNextCronExecution(cron: string): string {
    // In production, use a proper cron parser library
    // For now, return a simple estimate
    const now = new Date();
    const next = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
    return next.toISOString();
  }

  private async sendFailureAlert(job: QueueJob, error: Error): Promise<void> {
    // Integration point for alerting systems (Slack, PagerDuty, email, etc.)
    logger.error(`ALERT: Job ${job.id} failed permanently`, {
      error: error.message,
      jobId: job.id,
      type: job.type,
      attempts: job.attempts
    });
  }

  private async moveToDeadLetterQueue(job: QueueJob): Promise<void> {
    // Move failed job to dead letter queue for manual review
    const dlqName = 'dead-letter-queue';

    // Ensure DLQ exists
    if (!this.queues.has(dlqName)) {
      this.createQueue(dlqName, {
        concurrency: 1,
        priority: 'low',
        retryAttempts: 0,
        retryDelay: 0
      });
    }

    const dlq = this.queues.get(dlqName);
    if (dlq) {
      await dlq.add('failed_job', {
        originalJob: job,
        error: job.error,
        failedAt: job.failedAt
      } as unknown as JobData, {
        removeOnComplete: false,
        removeOnFail: false
      });
    }

    logger.warn(`Moving job ${job.id} to dead letter queue`, {
      jobId: job.id,
      type: job.type
    });
  }
}

// Export singleton instance
export const queueManager = new QueueManager();

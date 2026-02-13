import { EventEmitter } from 'events';
import Bull, { Queue, Job, JobOptions, ProcessorFunction, QueueScheduler, Worker } from 'bull';
import Redis from 'ioredis';
import { logger } from './LoggingService';

interface QueueConfig {
  redis?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };
  defaultJobOptions?: JobOptions;
  concurrency?: number;
  maxStalledCount?: number;
  stalledInterval?: number;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  enableScheduler?: boolean;
  enableMetrics?: boolean;
}

interface JobDefinition {
  name: string;
  processor: ProcessorFunction<any>;
  concurrency?: number;
  options?: JobOptions;
}

interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  throughput: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
  averageProcessingTime: number;
  successRate: number;
}

interface WorkerMetrics {
  id: string;
  status: 'idle' | 'busy' | 'stopped';
  currentJob?: {
    id: string;
    name: string;
    startedAt: Date;
    progress: number;
  };
  processed: number;
  failed: number;
  averageTime: number;
}

export class QueueWorkerService extends EventEmitter {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private schedulers: Map<string, QueueScheduler> = new Map();
  private processors: Map<string, ProcessorFunction<any>> = new Map();
  private config: QueueConfig;
  private redisClient: Redis;
  private metricsInterval?: NodeJS.Timeout;
  private jobMetrics: Map<string, { times: number[]; successes: number; failures: number }> = new Map();

  constructor(config: QueueConfig = {}) {
    super();

    this.config = {
      redis: {
        host: config.redis?.host || process.env.REDIS_HOST || 'localhost',
        port: config.redis?.port || parseInt(process.env.REDIS_PORT || '6379'),
        password: config.redis?.password || process.env.REDIS_PASSWORD,
        db: config.redis?.db || 0
      },
      defaultJobOptions: config.defaultJobOptions || {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      },
      concurrency: config.concurrency || 5,
      maxStalledCount: config.maxStalledCount || 3,
      stalledInterval: config.stalledInterval || 30000,
      removeOnComplete: config.removeOnComplete !== false,
      removeOnFail: config.removeOnFail !== false,
      enableScheduler: config.enableScheduler !== false,
      enableMetrics: config.enableMetrics !== false
    };

    // Initialize Redis client
    this.redisClient = new Redis(this.config.redis);

    // Start metrics collection if enabled
    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }

    // Setup error handling
    this.redisClient.on('error', (error) => {
      logger.error('Redis error:', error);
      this.emit('error', { type: 'redis', error });
    });
  }

  public createQueue(name: string, options: JobOptions = {}): Queue {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    // Create queue
    const queue = new Bull(name, {
      redis: this.config.redis,
      defaultJobOptions: {
        ...this.config.defaultJobOptions,
        ...options
      }
    });

    // Setup event handlers
    this.setupQueueEvents(queue, name);

    // Store queue
    this.queues.set(name, queue);

    // Create scheduler if enabled
    if (this.config.enableScheduler) {
      const scheduler = new QueueScheduler(name, {
        redis: this.config.redis,
        maxStalledCount: this.config.maxStalledCount,
        stalledInterval: this.config.stalledInterval
      });

      this.schedulers.set(name, scheduler);
    }

    // Emit event
    this.emit('queue:created', { name });

    return queue;
  }

  public registerProcessor(
    queueName: string,
    processor: ProcessorFunction<any>,
    concurrency?: number
  ): Worker {
    // Get or create queue
    const queue = this.getQueue(queueName) || this.createQueue(queueName);

    // Check if worker already exists
    if (this.workers.has(queueName)) {
      throw new Error(`Worker already exists for queue: ${queueName}`);
    }

    // Create worker
    const worker = new Worker(
      queueName,
      async (job: Job) => {
        const startTime = Date.now();

        try {
          // Emit job started event
          this.emit('job:started', {
            queue: queueName,
            jobId: job.id,
            jobName: job.name,
            data: job.data
          });

          // Process job
          const result = await processor(job);

          // Record metrics
          this.recordJobMetrics(queueName, Date.now() - startTime, true);

          // Emit job completed event
          this.emit('job:completed', {
            queue: queueName,
            jobId: job.id,
            jobName: job.name,
            result,
            duration: Date.now() - startTime
          });

          return result;
        } catch (error) {
          // Record metrics
          this.recordJobMetrics(queueName, Date.now() - startTime, false);

          // Emit job failed event
          this.emit('job:failed', {
            queue: queueName,
            jobId: job.id,
            jobName: job.name,
            error,
            duration: Date.now() - startTime
          });

          throw error;
        }
      },
      {
        redis: this.config.redis,
        concurrency: concurrency || this.config.concurrency
      }
    );

    // Setup worker events
    this.setupWorkerEvents(worker, queueName);

    // Store worker
    this.workers.set(queueName, worker);
    this.processors.set(queueName, processor);

    // Emit event
    this.emit('worker:created', { queue: queueName, concurrency });

    return worker;
  }

  public async addJob(
    queueName: string,
    jobName: string,
    data: any,
    options: JobOptions = {}
  ): Promise<Job> {
    const queue = this.getQueue(queueName);
    
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const job = await queue.add(jobName, data, {
      ...this.config.defaultJobOptions,
      ...options
    });

    // Emit event
    this.emit('job:added', {
      queue: queueName,
      jobId: job.id,
      jobName: job.name,
      data: job.data,
      options: job.opts
    });

    return job;
  }

  public async addBulkJobs(
    queueName: string,
    jobs: Array<{ name: string; data: any; options?: JobOptions }>
  ): Promise<Job[]> {
    const queue = this.getQueue(queueName);
    
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const bulkJobs = jobs.map(job => ({
      name: job.name,
      data: job.data,
      opts: {
        ...this.config.defaultJobOptions,
        ...job.options
      }
    }));

    const addedJobs = await queue.addBulk(bulkJobs);

    // Emit event
    this.emit('jobs:bulk-added', {
      queue: queueName,
      count: addedJobs.length
    });

    return addedJobs;
  }

  public async scheduleJob(
    queueName: string,
    jobName: string,
    data: any,
    cronExpression: string,
    options: JobOptions = {}
  ): Promise<Job> {
    const queue = this.getQueue(queueName);
    
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const job = await queue.add(jobName, data, {
      ...this.config.defaultJobOptions,
      ...options,
      repeat: {
        cron: cronExpression
      }
    });

    // Emit event
    this.emit('job:scheduled', {
      queue: queueName,
      jobId: job.id,
      jobName: job.name,
      cron: cronExpression
    });

    return job;
  }

  public async scheduleDelayedJob(
    queueName: string,
    jobName: string,
    data: any,
    delay: number,
    options: JobOptions = {}
  ): Promise<Job> {
    const queue = this.getQueue(queueName);
    
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const job = await queue.add(jobName, data, {
      ...this.config.defaultJobOptions,
      ...options,
      delay
    });

    // Emit event
    this.emit('job:delayed', {
      queue: queueName,
      jobId: job.id,
      jobName: job.name,
      delay,
      executeAt: new Date(Date.now() + delay)
    });

    return job;
  }

  public async getJob(queueName: string, jobId: string): Promise<Job | null> {
    const queue = this.getQueue(queueName);
    
    if (!queue) {
      return null;
    }

    return await queue.getJob(jobId);
  }

  public async getJobs(
    queueName: string,
    types: Array<'waiting' | 'active' | 'completed' | 'failed' | 'delayed'> = ['waiting'],
    start = 0,
    end = 20
  ): Promise<Job[]> {
    const queue = this.getQueue(queueName);
    
    if (!queue) {
      return [];
    }

    const jobs: Job[] = [];

    for (const type of types) {
      const typeJobs = await queue.getJobs([type], start, end);
      jobs.push(...typeJobs);
    }

    return jobs;
  }

  public async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.pause();

    // Emit event
    this.emit('queue:paused', { queue: queueName });
  }

  public async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.resume();

    // Emit event
    this.emit('queue:resumed', { queue: queueName });
  }

  public async emptyQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.empty();

    // Emit event
    this.emit('queue:emptied', { queue: queueName });
  }

  public async cleanQueue(
    queueName: string,
    grace: number = 0,
    status?: 'completed' | 'failed'
  ): Promise<Job[]> {
    const queue = this.getQueue(queueName);
    
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const cleaned = await queue.clean(grace, status);

    // Emit event
    this.emit('queue:cleaned', {
      queue: queueName,
      cleaned: cleaned.length,
      status
    });

    return cleaned;
  }

  public async getQueueMetrics(queueName: string): Promise<QueueMetrics | null> {
    const queue = this.getQueue(queueName);
    
    if (!queue) {
      return null;
    }

    const [
      waitingCount,
      activeCount,
      completedCount,
      failedCount,
      delayedCount,
      isPaused
    ] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused()
    ]);

    const metrics = this.jobMetrics.get(queueName) || { times: [], successes: 0, failures: 0 };

    // Calculate throughput
    const now = Date.now();
    const lastMinute = metrics.times.filter(t => now - t < 60000).length;
    const lastHour = metrics.times.filter(t => now - t < 3600000).length;
    const lastDay = metrics.times.filter(t => now - t < 86400000).length;

    // Calculate average processing time
    const avgTime = metrics.times.length > 0
      ? metrics.times.reduce((a, b) => a + b, 0) / metrics.times.length
      : 0;

    // Calculate success rate
    const total = metrics.successes + metrics.failures;
    const successRate = total > 0 ? (metrics.successes / total) * 100 : 0;

    return {
      waiting: waitingCount,
      active: activeCount,
      completed: completedCount,
      failed: failedCount,
      delayed: delayedCount,
      paused: isPaused,
      throughput: {
        perMinute: lastMinute,
        perHour: lastHour,
        perDay: lastDay
      },
      averageProcessingTime: avgTime,
      successRate
    };
  }

  public async getWorkerMetrics(queueName: string): Promise<WorkerMetrics | null> {
    const worker = this.workers.get(queueName);
    
    if (!worker) {
      return null;
    }

    const metrics = this.jobMetrics.get(queueName) || { times: [], successes: 0, failures: 0 };
    const avgTime = metrics.times.length > 0
      ? metrics.times.reduce((a, b) => a + b, 0) / metrics.times.length
      : 0;

    return {
      id: queueName,
      status: worker.isRunning() ? 'busy' : worker.isPaused() ? 'stopped' : 'idle',
      processed: metrics.successes,
      failed: metrics.failures,
      averageTime: avgTime
    };
  }

  public async getAllMetrics(): Promise<{ [queueName: string]: QueueMetrics }> {
    const metrics: { [queueName: string]: QueueMetrics } = {};

    for (const queueName of this.queues.keys()) {
      const queueMetrics = await this.getQueueMetrics(queueName);
      if (queueMetrics) {
        metrics[queueName] = queueMetrics;
      }
    }

    return metrics;
  }

  public async retryJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    await job.retry();

    // Emit event
    this.emit('job:retried', {
      queue: queueName,
      jobId: job.id,
      jobName: job.name
    });
  }

  public async removeJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    await job.remove();

    // Emit event
    this.emit('job:removed', {
      queue: queueName,
      jobId: job.id,
      jobName: job.name
    });
  }

  public async promoteJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    await job.promote();

    // Emit event
    this.emit('job:promoted', {
      queue: queueName,
      jobId: job.id,
      jobName: job.name
    });
  }

  private setupQueueEvents(queue: Queue, name: string): void {
    queue.on('error', (error) => {
      logger.error(`Queue ${name} error:`, error);
      this.emit('queue:error', { queue: name, error });
    });

    queue.on('waiting', (jobId) => {
      this.emit('queue:waiting', { queue: name, jobId });
    });

    queue.on('active', (job) => {
      this.emit('queue:active', { queue: name, jobId: job.id, jobName: job.name });
    });

    queue.on('stalled', (job) => {
      this.emit('queue:stalled', { queue: name, jobId: job.id, jobName: job.name });
    });

    queue.on('progress', (job, progress) => {
      this.emit('queue:progress', {
        queue: name,
        jobId: job.id,
        jobName: job.name,
        progress
      });
    });

    queue.on('completed', (job, result) => {
      this.emit('queue:completed', {
        queue: name,
        jobId: job.id,
        jobName: job.name,
        result
      });
    });

    queue.on('failed', (job, error) => {
      this.emit('queue:failed', {
        queue: name,
        jobId: job.id,
        jobName: job.name,
        error
      });
    });

    queue.on('removed', (job) => {
      this.emit('queue:removed', {
        queue: name,
        jobId: job.id,
        jobName: job.name
      });
    });
  }

  private setupWorkerEvents(worker: Worker, name: string): void {
    worker.on('error', (error) => {
      logger.error(`Worker ${name} error:`, error);
      this.emit('worker:error', { worker: name, error });
    });

    worker.on('active', (job) => {
      this.emit('worker:active', { worker: name, jobId: job.id, jobName: job.name });
    });

    worker.on('completed', (job, result) => {
      this.emit('worker:completed', {
        worker: name,
        jobId: job.id,
        jobName: job.name,
        result
      });
    });

    worker.on('failed', (job, error) => {
      this.emit('worker:failed', {
        worker: name,
        jobId: job.id,
        jobName: job.name,
        error
      });
    });

    worker.on('paused', () => {
      this.emit('worker:paused', { worker: name });
    });

    worker.on('resumed', () => {
      this.emit('worker:resumed', { worker: name });
    });

    worker.on('stalled', (jobId) => {
      this.emit('worker:stalled', { worker: name, jobId });
    });
  }

  private recordJobMetrics(queueName: string, processingTime: number, success: boolean): void {
    if (!this.jobMetrics.has(queueName)) {
      this.jobMetrics.set(queueName, { times: [], successes: 0, failures: 0 });
    }

    const metrics = this.jobMetrics.get(queueName)!;
    
    // Record processing time
    metrics.times.push(processingTime);
    
    // Keep only last 1000 times
    if (metrics.times.length > 1000) {
      metrics.times = metrics.times.slice(-1000);
    }

    // Update success/failure counts
    if (success) {
      metrics.successes++;
    } else {
      metrics.failures++;
    }
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      const metrics = await this.getAllMetrics();
      this.emit('metrics:collected', metrics);
    }, 60000); // Collect every minute
  }

  private getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  public async shutdown(): Promise<void> {
    // Stop metrics collection
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Close all workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      this.emit('worker:closed', { worker: name });
    }

    // Close all schedulers
    for (const [name, scheduler] of this.schedulers) {
      await scheduler.close();
      this.emit('scheduler:closed', { scheduler: name });
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      this.emit('queue:closed', { queue: name });
    }

    // Close Redis connection
    await this.redisClient.quit();

    // Clear collections
    this.queues.clear();
    this.workers.clear();
    this.schedulers.clear();
    this.processors.clear();
    this.jobMetrics.clear();

    this.emit('shutdown');
  }
}

// Export singleton instance
let queueService: QueueWorkerService | null = null;

export function initializeQueueService(config?: QueueConfig): QueueWorkerService {
  if (!queueService) {
    queueService = new QueueWorkerService(config);
  }
  return queueService;
}

export function getQueueService(): QueueWorkerService {
  if (!queueService) {
    queueService = new QueueWorkerService();
  }
  return queueService;
}

export default QueueWorkerService;
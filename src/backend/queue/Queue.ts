/**
 * Queue Implementation
 * In-memory queue with persistence options for job management
 */

import { logger } from '../../services/SimpleLogger';
import { EventEmitter } from 'events';

export interface QueueOptions {
  concurrency?: number;
  priority?: 'high' | 'medium' | 'low';
  retryAttempts?: number;
  retryDelay?: number;
  maxQueueSize?: number;
  enablePersistence?: boolean;
}

export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  repeat?: {
    cron?: string;
    every?: number;
    limit?: number;
  };
  removeOnComplete?: number;
  removeOnFail?: number;
  timeout?: number;
}

export interface Job<T = unknown> {
  id: string;
  data: T;
  opts: JobOptions;
  attemptsMade: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
  stacktrace?: string[];
  returnvalue?: unknown;
  progress?: number;
  timestamp: number;
  delay?: number;
}

export class Queue<T = unknown> extends EventEmitter {
  private name: string;
  private jobs: Map<string, Job<T>> = new Map();
  private waitingQueue: string[] = [];
  private activeQueue: string[] = [];
  private completedQueue: string[] = [];
  private failedQueue: string[] = [];
  private delayedQueue: Map<string, Job<T>> = new Map();
  private isPaused = false;
  private options: Required<QueueOptions>;
  private processInterval?: NodeJS.Timeout;
  private delayInterval?: NodeJS.Timeout;

  constructor(name: string, options: QueueOptions = {}) {
    super();
    this.name = name;
    this.options = {
      concurrency: 1,
      priority: 'medium',
      retryAttempts: 3,
      retryDelay: 5000,
      maxQueueSize: 10000,
      enablePersistence: false,
      ...options
    };

    // Start processing loop
    this.startProcessing();
    
    // Start delay checker
    this.startDelayChecker();

    logger.debug(`Queue "${name}" initialized`, { options: this.options });
  }

  /**
   * Add a job to the queue
   */
  async add(data: T, opts: JobOptions = {}): Promise<Job<T>> {
    if (this.jobs.size >= this.options.maxQueueSize) {
      throw new Error(`Queue "${this.name}" is full (max: ${this.options.maxQueueSize})`);
    }

    const job: Job<T> = {
      id: this.generateJobId(),
      data,
      opts: {
        priority: opts.priority || 0,
        attempts: opts.attempts || this.options.retryAttempts,
        ...opts
      },
      attemptsMade: 0,
      timestamp: Date.now()
    };

    this.jobs.set(job.id, job);

    // Handle delayed jobs
    if (opts.delay && opts.delay > 0) {
      job.delay = Date.now() + opts.delay;
      this.delayedQueue.set(job.id, job);
      this.emit('delayed', job);
    } else {
      this.addToWaitingQueue(job);
    }

    logger.debug(`Job ${job.id} added to queue "${this.name}"`, {
      hasDelay: !!opts.delay,
      priority: opts.priority
    });

    return job;
  }

  /**
   * Process jobs in the queue
   */
  async process(concurrency: number, processor: (job: Job<T>) => Promise<unknown>): Promise<void> {
    this.options.concurrency = concurrency;

    // Store processor for internal use
    this.on('process', async (job: Job<T>) => {
      try {
        const result = await processor(job);
        await this.moveToCompleted(job, result);
      } catch (error) {
        await this.moveToFailed(job, error as Error);
      }
    });
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    this.isPaused = true;
    this.emit('paused');
    logger.info(`Queue "${this.name}" paused`);
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    this.isPaused = false;
    this.emit('resumed');
    logger.info(`Queue "${this.name}" resumed`);
    
    // Trigger processing of waiting jobs
    this.processNextJobs();
  }

  /**
   * Get queue counts
   */
  async getJobCounts(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }> {
    return {
      waiting: this.waitingQueue.length,
      active: this.activeQueue.length,
      completed: this.completedQueue.length,
      failed: this.failedQueue.length,
      delayed: this.delayedQueue.size,
      paused: this.isPaused ? 1 : 0
    };
  }

  /**
   * Clean old jobs
   */
  async clean(grace: number, limit?: number, type?: 'completed' | 'failed'): Promise<string[]> {
    const cleaned: string[] = [];
    const now = Date.now();

    const queues = type === 'completed'
      ? [this.completedQueue]
      : type === 'failed'
        ? [this.failedQueue]
        : [this.completedQueue, this.failedQueue];

    for (const queue of queues) {
      const toRemove: string[] = [];

      for (const jobId of queue) {
        const job = this.jobs.get(jobId);
        if (job && job.finishedOn && (now - job.finishedOn) > grace) {
          toRemove.push(jobId);
          if (limit && cleaned.length >= limit) break;
        }
      }

      for (const jobId of toRemove) {
        this.removeJob(jobId);
        cleaned.push(jobId);
      }
    }

    logger.info(`Cleaned ${cleaned.length} jobs from queue "${this.name}"`);
    return cleaned;
  }

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<Job<T> | undefined> {
    return this.jobs.get(jobId);
  }

  /**
   * Get jobs by state
   */
  async getJobs(types: string[], start = 0, end = -1): Promise<Job<T>[]> {
    const jobs: Job<T>[] = [];

    for (const type of types) {
      let queue: string[] = [];

      switch (type) {
        case 'waiting':
          queue = this.waitingQueue;
          break;
        case 'active':
          queue = this.activeQueue;
          break;
        case 'completed':
          queue = this.completedQueue;
          break;
        case 'failed':
          queue = this.failedQueue;
          break;
        case 'delayed':
          queue = Array.from(this.delayedQueue.keys());
          break;
      }

      const slice = end === -1 ? queue.slice(start) : queue.slice(start, end);
      for (const jobId of slice) {
        const job = this.jobs.get(jobId);
        if (job) jobs.push(job);
      }
    }

    return jobs;
  }

  /**
   * Remove all jobs
   */
  async empty(): Promise<void> {
    this.waitingQueue = [];
    this.activeQueue = [];
    this.completedQueue = [];
    this.failedQueue = [];
    this.delayedQueue.clear();
    this.jobs.clear();
    
    logger.info(`Queue "${this.name}" emptied`);
  }

  /**
   * Destroy the queue
   */
  async close(): Promise<void> {
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
    if (this.delayInterval) {
      clearInterval(this.delayInterval);
    }
    
    await this.empty();
    this.removeAllListeners();
    
    logger.info(`Queue "${this.name}" closed`);
  }

  // Private methods
  private startProcessing(): void {
    this.processInterval = setInterval(() => {
      if (!this.isPaused) {
        this.processNextJobs();
      }
    }, 100); // Check every 100ms
  }

  private startDelayChecker(): void {
    this.delayInterval = setInterval(() => {
      const now = Date.now();
      const toProcess: string[] = [];

      this.delayedQueue.forEach((job, jobId) => {
        if (job.delay && job.delay <= now) {
          toProcess.push(jobId);
        }
      });

      for (const jobId of toProcess) {
        const job = this.delayedQueue.get(jobId);
        if (job) {
          this.delayedQueue.delete(jobId);
          this.addToWaitingQueue(job);
        }
      }
    }, 1000); // Check every second
  }

  private processNextJobs(): void {
    const availableSlots = this.options.concurrency - this.activeQueue.length;
    if (availableSlots <= 0 || this.waitingQueue.length === 0) {
      return;
    }

    const toProcess = Math.min(availableSlots, this.waitingQueue.length);
    for (let i = 0; i < toProcess; i++) {
      const jobId = this.waitingQueue.shift();
      if (jobId) {
        const job = this.jobs.get(jobId);
        if (job) {
          this.activeQueue.push(jobId);
          job.processedOn = Date.now();
          job.attemptsMade++;

          // Emit process event
          this.emit('active', job);
          this.emit('process', job);
        }
      }
    }
  }

  private addToWaitingQueue(job: Job<T>): void {
    // Sort by priority
    let insertIndex = this.waitingQueue.length;
    if (job.opts.priority !== undefined) {
      for (let i = 0; i < this.waitingQueue.length; i++) {
        const waitingJob = this.jobs.get(this.waitingQueue[i]);
        if (waitingJob && (waitingJob.opts.priority || 0) < job.opts.priority!) {
          insertIndex = i;
          break;
        }
      }
    }

    this.waitingQueue.splice(insertIndex, 0, job.id);
    this.emit('waiting', job);
  }

  private async moveToCompleted(job: Job<T>, result: unknown): Promise<void> {
    const index = this.activeQueue.indexOf(job.id);
    if (index > -1) {
      this.activeQueue.splice(index, 1);
    }

    job.finishedOn = Date.now();
    job.returnvalue = result;

    this.completedQueue.push(job.id);
    this.emit('completed', job, result);

    // Handle job removal
    if (job.opts.removeOnComplete) {
      setTimeout(() => {
        this.removeJob(job.id);
      }, job.opts.removeOnComplete);
    }

    // Process next jobs
    this.processNextJobs();
  }

  private async moveToFailed(job: Job<T>, error: Error): Promise<void> {
    const index = this.activeQueue.indexOf(job.id);
    if (index > -1) {
      this.activeQueue.splice(index, 1);
    }

    job.failedReason = error.message;
    job.stacktrace = error.stack?.split('\n') || [];

    // Check if should retry
    if (job.attemptsMade < (job.opts.attempts || this.options.retryAttempts)) {
      // Add back to waiting queue with delay
      job.delay = Date.now() + this.options.retryDelay;
      this.delayedQueue.set(job.id, job);
      this.emit('retrying', job, error);
    } else {
      // Move to failed
      job.finishedOn = Date.now();
      this.failedQueue.push(job.id);
      this.emit('failed', job, error);

      // Handle job removal
      if (job.opts.removeOnFail) {
        setTimeout(() => {
          this.removeJob(job.id);
        }, job.opts.removeOnFail);
      }
    }

    // Process next jobs
    this.processNextJobs();
  }

  private removeJob(jobId: string): void {
    this.jobs.delete(jobId);

    // Remove from all queues
    const queues = [
      this.waitingQueue,
      this.activeQueue,
      this.completedQueue,
      this.failedQueue
    ];
    for (const queue of queues) {
      const index = queue.indexOf(jobId);
      if (index > -1) {
        queue.splice(index, 1);
      }
    }

    this.delayedQueue.delete(jobId);
  }

  private generateJobId(): string {
    return `${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
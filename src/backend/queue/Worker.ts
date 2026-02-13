/**
 * Worker Implementation
 * Processes jobs from queues with error handling and lifecycle management
 */

import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';
import { Queue, Job } from './Queue';

export type ProcessorFunction<T = unknown, R = unknown> = (job: Job<T>) => Promise<R>;

export interface WorkerOptions {
  concurrency?: number;
  maxStalledCount?: number;
  stalledInterval?: number;
  skipStalledCheck?: boolean;
  skipLockRenewal?: boolean;
  lockDuration?: number;
  lockRenewTime?: number;
  limiter?: {
    max: number;
    duration: number;
  };
}

export class Worker<T = unknown, R = unknown> extends EventEmitter {
  private name: string;
  private processor: ProcessorFunction<T, R>;
  private options: Required<Omit<WorkerOptions, 'limiter'>> & { limiter?: WorkerOptions['limiter'] };
  private isRunning = false;
  private isPaused = false;
  private processingJobs = new Map<string, Job<T>>();
  private processedCount = 0;
  private failedCount = 0;
  private queue?: Queue<T>;
  private stalledCheckInterval?: NodeJS.Timeout;
  private rateLimitState?: {
    count: number;
    resetTime: number;
  };

  constructor(
    name: string,
    processor: ProcessorFunction<T, R>,
    options: WorkerOptions = {}
  ) {
    super();
    this.name = name;
    this.processor = processor;
    this.options = {
      concurrency: 1,
      maxStalledCount: 1,
      stalledInterval: 30000, // 30 seconds
      skipStalledCheck: false,
      skipLockRenewal: false,
      lockDuration: 30000, // 30 seconds
      lockRenewTime: 15000, // 15 seconds
      ...options
    };

    if (this.options.limiter) {
      this.rateLimitState = {
        count: 0,
        resetTime: Date.now() + this.options.limiter.duration
      };
    }

    this.startStalledChecker();
    logger.debug(`Worker "${name}" initialized`, { options: this.options });
  }

  /**
   * Start processing jobs
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      logger.warn(`Worker "${this.name}" is already running`);
      return;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.emit('started');
    
    logger.info(`Worker "${this.name}" started`);
    
    // Start processing loop
    this.processLoop();
  }

  /**
   * Pause the worker
   */
  async pause(): Promise<void> {
    this.isPaused = true;
    this.emit('paused');
    logger.info(`Worker "${this.name}" paused`);
  }

  /**
   * Resume the worker
   */
  async resume(): Promise<void> {
    if (!this.isRunning) {
      await this.run();
    } else {
      this.isPaused = false;
      this.emit('resumed');
      logger.info(`Worker "${this.name}" resumed`);
    }
  }

  /**
   * Stop the worker
   */
  async close(): Promise<void> {
    this.isRunning = false;
    this.isPaused = false;

    // Stop stalled checker
    if (this.stalledCheckInterval) {
      clearInterval(this.stalledCheckInterval);
      this.stalledCheckInterval = undefined;
    }

    // Wait for current jobs to complete
    const waitingJobs = Array.from(this.processingJobs.values());
    if (waitingJobs.length > 0) {
      logger.info(`Worker "${this.name}" waiting for ${waitingJobs.length} jobs to complete`);

      // Give jobs 30 seconds to complete
      const completion = new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.processingJobs.size === 0) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });

      const timeout = new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 30000);
      });

      await Promise.race([completion, timeout]);
    }

    this.emit('closed');
    logger.info(`Worker "${this.name}" closed`);
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job<T>): Promise<R> {
    const jobLogger = {
      debug: (msg: string) => logger.debug(msg, { jobId: job.id }),
      info: (msg: string, meta?: Record<string, unknown>) => logger.info(msg, { jobId: job.id, ...meta }),
      error: (msg: string, meta?: Record<string, unknown>) => logger.error(msg, { jobId: job.id, ...meta })
    };

    try {
      // Check rate limit
      if (!this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      // Mark job as processing
      this.processingJobs.set(job.id, job);
      job.processedOn = Date.now();

      jobLogger.debug('Processing job');
      this.emit('active', job);

      // Set up timeout if configured
      let timeoutHandle: NodeJS.Timeout | undefined;
      const processorPromise = this.processor(job);

      const timeoutPromise = new Promise<R>((_, reject) => {
        if (job.opts.timeout) {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`Job timed out after ${job.opts.timeout}ms`));
          }, job.opts.timeout);
        }
      });

      // Process the job
      const result = await (job.opts.timeout
        ? Promise.race([processorPromise, timeoutPromise])
        : processorPromise);

      // Clear timeout
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      // Update stats
      this.processedCount++;
      job.finishedOn = Date.now();
      job.returnvalue = result;

      // Remove from processing
      this.processingJobs.delete(job.id);

      jobLogger.info('Job completed successfully', {
        duration: job.finishedOn - job.processedOn!
      });

      this.emit('completed', job, result);
      return result;

    } catch (error) {
      // Update stats
      this.failedCount++;
      job.finishedOn = Date.now();
      job.failedReason = (error as Error).message;
      job.stacktrace = (error as Error).stack?.split('\n');

      // Remove from processing
      this.processingJobs.delete(job.id);

      jobLogger.error('Job failed', {
        error: (error as Error).message,
        duration: job.finishedOn - job.processedOn!
      });

      this.emit('failed', job, error);
      throw error;
    }
  }

  /**
   * Get worker statistics
   */
  getStats(): {
    name: string;
    isRunning: boolean;
    isPaused: boolean;
    processedCount: number;
    failedCount: number;
    processingCount: number;
    successRate: number;
  } {
    const total = this.processedCount + this.failedCount;
    const successRate = total > 0 ? this.processedCount / total : 1;

    return {
      name: this.name,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      processedCount: this.processedCount,
      failedCount: this.failedCount,
      processingCount: this.processingJobs.size,
      successRate: Math.round(successRate * 100) / 100
    };
  }

  /**
   * Attach to a queue (used internally by QueueManager)
   */
  attachQueue(queue: Queue<T>): void {
    this.queue = queue;
  }

  // Private methods
  private async processLoop(): Promise<void> {
    while (this.isRunning) {
      if (this.isPaused || this.processingJobs.size >= this.options.concurrency) {
        // Wait a bit before checking again
        await this.sleep(100);
        continue;
      }

      try {
        // In a real implementation, this would get the next job from the queue
        // For now, we'll just wait
        await this.sleep(100);
      } catch (error) {
        logger.error(`Error in worker "${this.name}" process loop`, { error });
        await this.sleep(1000); // Wait longer on error
      }
    }
  }

  private startStalledChecker(): void {
    if (this.options.skipStalledCheck) {
      return;
    }

    this.stalledCheckInterval = setInterval(() => {
      const now = Date.now();
      const stalledJobs: Job<T>[] = [];

      for (const [, job] of Array.from(this.processingJobs)) {
        if (job.processedOn && (now - job.processedOn) > this.options.stalledInterval) {
          stalledJobs.push(job);
        }
      }

      if (stalledJobs.length > 0) {
        logger.warn(`Worker "${this.name}" found ${stalledJobs.length} stalled jobs`);

        for (const job of stalledJobs) {
          this.emit('stalled', job);

          // Remove from processing
          this.processingJobs.delete(job.id);

          // Mark as failed
          job.failedReason = 'Job stalled';
          this.failedCount++;
        }
      }
    }, this.options.stalledInterval);
  }

  private checkRateLimit(): boolean {
    if (!this.options.limiter || !this.rateLimitState) {
      return true;
    }

    const now = Date.now();

    // Reset if duration has passed
    if (now > this.rateLimitState.resetTime) {
      this.rateLimitState.count = 0;
      this.rateLimitState.resetTime = now + this.options.limiter.duration;
    }

    // Check if under limit
    if (this.rateLimitState.count < this.options.limiter.max) {
      this.rateLimitState.count++;
      return true;
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Re-export types for convenience
export type { Job } from './Queue';
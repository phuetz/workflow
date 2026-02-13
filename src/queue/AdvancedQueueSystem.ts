/**
 * Advanced Queue and Job Management System
 * Enterprise-grade job queue with prioritization, retry, and distributed processing
 */

import { EventEmitter } from 'events';
import { logger } from '../services/SimpleLogger';
import * as crypto from 'crypto';

export interface Job {
  id: string;
  type: JobType;
  priority: JobPriority;
  status: JobStatus;
  data: any;
  metadata: JobMetadata;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  result?: any;
  progress?: number;
  workerId?: string;
  parentJobId?: string;
  childJobIds?: string[];
  dependencies?: string[];
  tags?: string[];
  ttl?: number; // Time to live in ms
  timeout?: number; // Execution timeout in ms
}

export type JobType = 
  | 'workflow_execution'
  | 'node_execution'
  | 'webhook'
  | 'scheduled_task'
  | 'batch_processing'
  | 'data_export'
  | 'data_import'
  | 'notification'
  | 'cleanup'
  | 'maintenance';

export type JobPriority = 'critical' | 'high' | 'normal' | 'low';

export type JobStatus = 
  | 'pending'
  | 'scheduled'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'retrying'
  | 'stalled';

export interface JobMetadata {
  workflowId?: string;
  executionId?: string;
  userId?: string;
  environment?: string;
  batchId?: string;
  retryStrategy?: RetryStrategy;
  callbacks?: {
    onComplete?: string;
    onFailure?: string;
    onProgress?: string;
  };
  custom?: Record<string, any>;
}

export interface RetryStrategy {
  type: 'exponential' | 'linear' | 'fixed' | 'custom';
  attempts: number;
  delay: number;
  maxDelay?: number;
  factor?: number;
  jitter?: boolean;
}

export interface QueueConfig {
  name: string;
  concurrency: number;
  rateLimit?: {
    max: number;
    duration: number;
  };
  defaultJobOptions?: Partial<Job>;
  storage?: 'memory' | 'redis' | 'database';
  enableMetrics?: boolean;
  enableDistributed?: boolean;
  stalledInterval?: number;
  maxStalledCount?: number;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

export interface Worker {
  id: string;
  name: string;
  status: 'idle' | 'busy' | 'paused' | 'stopped';
  currentJob?: string;
  processedJobs: number;
  failedJobs: number;
  startedAt: Date;
  lastActivity: Date;
  capacity: number;
  tags?: string[];
}

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  throughput: {
    lastMinute: number;
    lastHour: number;
    last24Hours: number;
  };
  averageProcessingTime: number;
  successRate: number;
  errorRate: number;
}

export interface BatchJob {
  id: string;
  jobs: Job[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results?: any[];
  errors?: any[];
  createdAt: Date;
  completedAt?: Date;
}

export class AdvancedQueueSystem extends EventEmitter {
  private queues: Map<string, Queue> = new Map();
  private jobs: Map<string, Job> = new Map();
  private workers: Map<string, Worker> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private batches: Map<string, BatchJob> = new Map();
  private metrics: Map<string, QueueMetrics> = new Map();
  private processors: Map<string, JobProcessor> = new Map();
  private isRunning = false;
  private stalledCheckInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.initialize();
  }

  /**
   * Initialize queue system
   */
  private initialize(): void {
    // Create default queues
    this.createQueue({
      name: 'default',
      concurrency: 5,
      enableMetrics: true
    });

    this.createQueue({
      name: 'critical',
      concurrency: 10,
      enableMetrics: true
    });

    this.createQueue({
      name: 'batch',
      concurrency: 2,
      enableMetrics: true
    });

    this.createQueue({
      name: 'scheduled',
      concurrency: 3,
      enableMetrics: true
    });

    // Start stalled job checker
    this.startStalledJobChecker();

    // Register default processors
    this.registerDefaultProcessors();

    this.isRunning = true;
    logger.info('Advanced Queue System initialized');
  }

  /**
   * Create a new queue
   */
  createQueue(config: QueueConfig): Queue {
    const queue: Queue = {
      name: config.name,
      config,
      jobs: [],
      running: [],
      completed: [],
      failed: [],
      delayed: [],
      paused: false,
      metrics: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: false,
        throughput: {
          lastMinute: 0,
          lastHour: 0,
          last24Hours: 0
        },
        averageProcessingTime: 0,
        successRate: 0,
        errorRate: 0
      }
    };

    this.queues.set(config.name, queue);
    this.metrics.set(config.name, queue.metrics);

    this.emit('queue:created', queue);
    return queue;
  }

  /**
   * Add job to queue
   */
  async addJob(
    queueName: string,
    jobData: any,
    options?: Partial<Job>
  ): Promise<Job> {
    const queue = this.queues.get(queueName);
    
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job: Job = {
      id: `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      type: options?.type || 'workflow_execution',
      priority: options?.priority || 'normal',
      status: 'pending',
      data: jobData,
      metadata: options?.metadata || {},
      attempts: 0,
      maxAttempts: options?.maxAttempts || 3,
      createdAt: new Date(),
      scheduledAt: options?.scheduledAt,
      tags: options?.tags,
      ttl: options?.ttl,
      timeout: options?.timeout || 30000,
      ...options
    };

    // Handle scheduled jobs
    if (job.scheduledAt && job.scheduledAt > new Date()) {
      job.status = 'scheduled';
      this.scheduleJob(job);
      queue.delayed.push(job);
    } else {
      job.status = 'queued';
      queue.jobs.push(job);
      this.sortQueueByPriority(queue);
    }

    this.jobs.set(job.id, job);
    
    // Update metrics
    this.updateQueueMetrics(queue);
    
    // Process queue if not paused
    if (!queue.paused) {
      this.processQueue(queue);
    }

    this.emit('job:added', { queue: queueName, job });
    logger.debug(`Job ${job.id} added to queue ${queueName}`);

    return job;
  }

  /**
   * Add bulk jobs
   */
  async addBulkJobs(
    queueName: string,
    jobs: Array<{ data: any; options?: Partial<Job> }>
  ): Promise<Job[]> {
    const addedJobs: Job[] = [];

    for (const jobConfig of jobs) {
      const job = await this.addJob(queueName, jobConfig.data, jobConfig.options);
      addedJobs.push(job);
    }

    this.emit('jobs:bulk-added', { queue: queueName, count: addedJobs.length });
    return addedJobs;
  }

  /**
   * Create batch job
   */
  async createBatch(
    queueName: string,
    jobsData: Array<{ data: any; options?: Partial<Job> }>
  ): Promise<BatchJob> {
    const batchId = `batch_${Date.now()}`;
    const jobs: Job[] = [];

    // Create jobs with batch reference
    for (const jobConfig of jobsData) {
      const job = await this.addJob(queueName, jobConfig.data, {
        ...jobConfig.options,
        metadata: {
          ...jobConfig.options?.metadata,
          batchId
        }
      });
      jobs.push(job);
    }

    const batch: BatchJob = {
      id: batchId,
      jobs,
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    };

    this.batches.set(batchId, batch);
    this.emit('batch:created', batch);

    return batch;
  }

  /**
   * Process queue
   */
  private async processQueue(queue: Queue): Promise<void> {
    if (!this.isRunning || queue.paused) return;

    // Check concurrency limit
    if (queue.running.length >= queue.config.concurrency) return;

    // Get next job
    const job = this.getNextJob(queue);
    if (!job) return;

    // Move job to running
    const index = queue.jobs.indexOf(job);
    if (index > -1) {
      queue.jobs.splice(index, 1);
    }
    queue.running.push(job);
    job.status = 'running';
    job.startedAt = new Date();

    // Find available worker
    const worker = this.getAvailableWorker();
    if (worker) {
      worker.status = 'busy';
      worker.currentJob = job.id;
      job.workerId = worker.id;
    }

    this.emit('job:started', job);

    try {
      // Process job with timeout
      const result = await this.processJobWithTimeout(job);
      
      // Job completed successfully
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;
      
      // Move to completed
      const runningIndex = queue.running.indexOf(job);
      if (runningIndex > -1) {
        queue.running.splice(runningIndex, 1);
      }
      queue.completed.push(job);
      
      // Update worker stats
      if (worker) {
        worker.processedJobs++;
        worker.status = 'idle';
        worker.currentJob = undefined;
      }

      // Update batch if part of one
      if (job.metadata.batchId) {
        this.updateBatchProgress(job.metadata.batchId);
      }

      this.emit('job:completed', job);
      logger.debug(`Job ${job.id} completed successfully`);

      // Cleanup if configured
      if (queue.config.removeOnComplete) {
        setTimeout(() => this.removeJob(job.id), 
          typeof queue.config.removeOnComplete === 'number' 
            ? queue.config.removeOnComplete 
            : 0
        );
      }

    } catch (error) {
      // Job failed
      job.attempts++;
      job.error = (error as Error).message;
      
      // Check if should retry
      if (job.attempts < job.maxAttempts) {
        job.status = 'retrying';
        const delay = this.calculateRetryDelay(job);
        
        setTimeout(() => {
          job.status = 'queued';
          queue.jobs.push(job);
          this.processQueue(queue);
        }, delay);
        
        this.emit('job:retrying', job);
        logger.warn(`Job ${job.id} failed, retrying (attempt ${job.attempts}/${job.maxAttempts})`);
      } else {
        // Max attempts reached
        job.status = 'failed';
        job.failedAt = new Date();
        
        // Move to failed
        const runningIndex = queue.running.indexOf(job);
        if (runningIndex > -1) {
          queue.running.splice(runningIndex, 1);
        }
        queue.failed.push(job);
        
        // Update worker stats
        if (worker) {
          worker.failedJobs++;
          worker.status = 'idle';
          worker.currentJob = undefined;
        }

        // Update batch if part of one
        if (job.metadata.batchId) {
          this.updateBatchProgress(job.metadata.batchId);
        }

        this.emit('job:failed', job);
        logger.error(`Job ${job.id} failed after ${job.maxAttempts} attempts: ${job.error}`);

        // Cleanup if configured
        if (queue.config.removeOnFail) {
          setTimeout(() => this.removeJob(job.id),
            typeof queue.config.removeOnFail === 'number'
              ? queue.config.removeOnFail
              : 0
          );
        }
      }
    }

    // Update metrics
    this.updateQueueMetrics(queue);

    // Process next job
    setImmediate(() => this.processQueue(queue));
  }

  /**
   * Process job with timeout
   */
  private async processJobWithTimeout(job: Job): Promise<any> {
    const processor = this.processors.get(job.type);
    
    if (!processor) {
      throw new Error(`No processor registered for job type: ${job.type}`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Job execution timeout after ${job.timeout}ms`));
      }, job.timeout || 30000);

      processor.process(job)
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Get next job from queue
   */
  private getNextJob(queue: Queue): Job | undefined {
    // Sort by priority and creation time
    return queue.jobs
      .filter(j => !j.dependencies || this.checkDependencies(j))
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        
        if (priorityDiff !== 0) return priorityDiff;
        
        return a.createdAt.getTime() - b.createdAt.getTime();
      })[0];
  }

  /**
   * Check job dependencies
   */
  private checkDependencies(job: Job): boolean {
    if (!job.dependencies || job.dependencies.length === 0) {
      return true;
    }

    return job.dependencies.every(depId => {
      const depJob = this.jobs.get(depId);
      return depJob && depJob.status === 'completed';
    });
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(job: Job): number {
    const strategy = job.metadata.retryStrategy || {
      type: 'exponential',
      attempts: 3,
      delay: 1000,
      factor: 2
    };

    let delay = strategy.delay;

    switch (strategy.type) {
      case 'exponential':
        delay = strategy.delay * Math.pow(strategy.factor || 2, job.attempts - 1);
        break;
      case 'linear':
        delay = strategy.delay * job.attempts;
        break;
      case 'fixed':
        delay = strategy.delay;
        break;
    }

    // Apply max delay
    if (strategy.maxDelay) {
      delay = Math.min(delay, strategy.maxDelay);
    }

    // Apply jitter
    if (strategy.jitter) {
      delay += Math.random() * delay * 0.1;
    }

    return delay;
  }

  /**
   * Schedule job
   */
  private scheduleJob(job: Job): void {
    if (!job.scheduledAt) return;

    const delay = job.scheduledAt.getTime() - Date.now();
    
    if (delay <= 0) {
      // Execute immediately
      job.status = 'queued';
      const queue = this.getJobQueue(job);
      if (queue) {
        queue.jobs.push(job);
        this.processQueue(queue);
      }
    } else {
      // Schedule for later
      const timeout = setTimeout(() => {
        job.status = 'queued';
        const queue = this.getJobQueue(job);
        
        if (queue) {
          // Remove from delayed
          const index = queue.delayed.indexOf(job);
          if (index > -1) {
            queue.delayed.splice(index, 1);
          }
          
          // Add to queue
          queue.jobs.push(job);
          this.processQueue(queue);
        }
        
        this.scheduledJobs.delete(job.id);
      }, delay);

      this.scheduledJobs.set(job.id, timeout);
    }
  }

  /**
   * Get job's queue
   */
  private getJobQueue(job: Job): Queue | undefined {
    for (const queue of Array.from(this.queues.values())) {
      if (queue.jobs.includes(job) ||
          queue.running.includes(job) ||
          queue.completed.includes(job) ||
          queue.failed.includes(job) ||
          queue.delayed.includes(job)) {
        return queue;
      }
    }
    return this.queues.get('default');
  }

  /**
   * Sort queue by priority
   */
  private sortQueueByPriority(queue: Queue): void {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    
    queue.jobs.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Update queue metrics
   */
  private updateQueueMetrics(queue: Queue): void {
    queue.metrics.waiting = queue.jobs.length;
    queue.metrics.active = queue.running.length;
    queue.metrics.completed = queue.completed.length;
    queue.metrics.failed = queue.failed.length;
    queue.metrics.delayed = queue.delayed.length;
    queue.metrics.paused = queue.paused;

    // Calculate success rate
    const total = queue.metrics.completed + queue.metrics.failed;
    queue.metrics.successRate = total > 0 
      ? (queue.metrics.completed / total) * 100 
      : 0;
    queue.metrics.errorRate = total > 0 
      ? (queue.metrics.failed / total) * 100 
      : 0;

    this.emit('metrics:updated', { queue: queue.name, metrics: queue.metrics });
  }

  /**
   * Update batch progress
   */
  private updateBatchProgress(batchId: string): void {
    const batch = this.batches.get(batchId);
    if (!batch) return;

    const completed = batch.jobs.filter(j => j.status === 'completed').length;
    const failed = batch.jobs.filter(j => j.status === 'failed').length;
    const total = batch.jobs.length;

    batch.progress = ((completed + failed) / total) * 100;

    if (completed + failed === total) {
      batch.status = failed > 0 ? 'failed' : 'completed';
      batch.completedAt = new Date();
      batch.results = batch.jobs
        .filter(j => j.status === 'completed')
        .map(j => j.result);
      batch.errors = batch.jobs
        .filter(j => j.status === 'failed')
        .map(j => ({ jobId: j.id, error: j.error }));

      this.emit('batch:completed', batch);
    }
  }

  /**
   * Start stalled job checker
   */
  private startStalledJobChecker(): void {
    this.stalledCheckInterval = setInterval(() => {
      for (const queue of Array.from(this.queues.values())) {
        for (const job of queue.running) {
          if (this.isJobStalled(job)) {
            this.handleStalledJob(job, queue);
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check if job is stalled
   */
  private isJobStalled(job: Job): boolean {
    if (!job.startedAt) return false;
    
    const runningTime = Date.now() - job.startedAt.getTime();
    const timeout = job.timeout || 30000;
    
    return runningTime > timeout * 2; // Consider stalled if running for 2x timeout
  }

  /**
   * Handle stalled job
   */
  private handleStalledJob(job: Job, queue: Queue): void {
    logger.warn(`Job ${job.id} appears to be stalled`);
    
    job.status = 'stalled';
    job.error = 'Job stalled';
    
    // Move back to queue for retry
    const index = queue.running.indexOf(job);
    if (index > -1) {
      queue.running.splice(index, 1);
    }
    
    if (job.attempts < job.maxAttempts) {
      job.status = 'queued';
      job.attempts++;
      queue.jobs.push(job);
      this.processQueue(queue);
    } else {
      job.status = 'failed';
      job.failedAt = new Date();
      queue.failed.push(job);
    }

    // Free up worker if assigned
    if (job.workerId) {
      const worker = this.workers.get(job.workerId);
      if (worker) {
        worker.status = 'idle';
        worker.currentJob = undefined;
      }
    }

    this.emit('job:stalled', job);
  }

  /**
   * Get available worker
   */
  private getAvailableWorker(): Worker | undefined {
    return Array.from(this.workers.values()).find(w => w.status === 'idle');
  }

  /**
   * Register job processor
   */
  registerProcessor(jobType: JobType, processor: JobProcessor): void {
    this.processors.set(jobType, processor);
    this.emit('processor:registered', jobType);
  }

  /**
   * Register default processors
   */
  private registerDefaultProcessors(): void {
    // Workflow execution processor
    this.registerProcessor('workflow_execution', {
      async process(job: Job) {
        // Simulate workflow execution
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true, executionId: job.metadata.executionId };
      }
    });

    // Webhook processor
    this.registerProcessor('webhook', {
      async process(job: Job) {
        // Simulate webhook processing
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, response: 'Webhook processed' };
      }
    });

    // Notification processor
    this.registerProcessor('notification', {
      async process(job: Job) {
        // Simulate notification sending
        await new Promise(resolve => setTimeout(resolve, 200));
        return { success: true, sent: true };
      }
    });
  }

  /**
   * Create worker
   */
  createWorker(name: string, capacity = 1, tags?: string[]): Worker {
    const worker: Worker = {
      id: `worker_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      name,
      status: 'idle',
      processedJobs: 0,
      failedJobs: 0,
      startedAt: new Date(),
      lastActivity: new Date(),
      capacity,
      tags
    };

    this.workers.set(worker.id, worker);
    this.emit('worker:created', worker);

    return worker;
  }

  /**
   * Pause queue
   */
  pauseQueue(queueName: string): void {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    queue.paused = true;
    this.emit('queue:paused', queueName);
    logger.info(`Queue ${queueName} paused`);
  }

  /**
   * Resume queue
   */
  resumeQueue(queueName: string): void {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    queue.paused = false;
    this.processQueue(queue);
    this.emit('queue:resumed', queueName);
    logger.info(`Queue ${queueName} resumed`);
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Cancel job
   */
  cancelJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === 'running') {
      // Can't cancel running job
      throw new Error('Cannot cancel running job');
    }

    // Remove from scheduled jobs
    if (this.scheduledJobs.has(jobId)) {
      clearTimeout(this.scheduledJobs.get(jobId)!);
      this.scheduledJobs.delete(jobId);
    }

    // Remove from queue
    const queue = this.getJobQueue(job);
    if (queue) {
      const index = queue.jobs.indexOf(job);
      if (index > -1) {
        queue.jobs.splice(index, 1);
      }
    }

    job.status = 'cancelled';
    this.emit('job:cancelled', job);
  }

  /**
   * Remove job
   */
  removeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    // Remove from queue arrays
    const queue = this.getJobQueue(job);
    if (queue) {
      ['jobs', 'running', 'completed', 'failed', 'delayed'].forEach(list => {
        const index = (queue as any)[list].indexOf(job);
        if (index > -1) {
          (queue as any)[list].splice(index, 1);
        }
      });
    }

    // Remove from maps
    this.jobs.delete(jobId);
    
    if (this.scheduledJobs.has(jobId)) {
      clearTimeout(this.scheduledJobs.get(jobId)!);
      this.scheduledJobs.delete(jobId);
    }
  }

  /**
   * Get queue metrics
   */
  getQueueMetrics(queueName?: string): QueueMetrics | Map<string, QueueMetrics> {
    if (queueName) {
      const metrics = this.metrics.get(queueName);
      if (!metrics) {
        throw new Error(`Queue ${queueName} not found`);
      }
      return metrics;
    }
    return this.metrics;
  }

  /**
   * Get all jobs in queue
   */
  getQueueJobs(queueName: string, status?: JobStatus): Job[] {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    let jobs: Job[] = [];

    switch (status) {
      case 'queued':
        jobs = queue.jobs;
        break;
      case 'running':
        jobs = queue.running;
        break;
      case 'completed':
        jobs = queue.completed;
        break;
      case 'failed':
        jobs = queue.failed;
        break;
      case 'scheduled':
        jobs = queue.delayed;
        break;
      default:
        jobs = [
          ...queue.jobs,
          ...queue.running,
          ...queue.completed,
          ...queue.failed,
          ...queue.delayed
        ];
    }

    return jobs;
  }

  /**
   * Clear queue
   */
  clearQueue(queueName: string, status?: JobStatus): void {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    if (status) {
      switch (status) {
        case 'completed':
          queue.completed = [];
          break;
        case 'failed':
          queue.failed = [];
          break;
        default:
          throw new Error(`Cannot clear jobs with status: ${status}`);
      }
    } else {
      // Clear all non-running jobs
      queue.jobs = [];
      queue.completed = [];
      queue.failed = [];
      queue.delayed = [];
    }

    this.updateQueueMetrics(queue);
    this.emit('queue:cleared', { queue: queueName, status });
  }

  /**
   * Get statistics
   */
  getStatistics(): any {
    const stats = {
      queues: this.queues.size,
      totalJobs: this.jobs.size,
      workers: this.workers.size,
      activeWorkers: Array.from(this.workers.values()).filter(w => w.status === 'busy').length,
      batches: this.batches.size,
      scheduledJobs: this.scheduledJobs.size,
      byStatus: {} as Record<JobStatus, number>,
      byType: {} as Record<JobType, number>,
      byQueue: {} as Record<string, any>
    };

    // Count by status
    for (const job of Array.from(this.jobs.values())) {
      stats.byStatus[job.status] = (stats.byStatus[job.status] || 0) + 1;
      stats.byType[job.type] = (stats.byType[job.type] || 0) + 1;
    }

    // Stats by queue
    for (const [name, queue] of Array.from(this.queues.entries())) {
      stats.byQueue[name] = {
        waiting: queue.jobs.length,
        active: queue.running.length,
        completed: queue.completed.length,
        failed: queue.failed.length,
        delayed: queue.delayed.length,
        paused: queue.paused
      };
    }

    return stats;
  }

  /**
   * Shutdown queue system
   */
  async shutdown(): Promise<void> {
    this.isRunning = false;

    // Clear intervals
    if (this.stalledCheckInterval) {
      clearInterval(this.stalledCheckInterval);
    }

    // Clear scheduled jobs
    for (const timeout of Array.from(this.scheduledJobs.values())) {
      clearTimeout(timeout);
    }

    // Pause all queues
    for (const queue of Array.from(this.queues.values())) {
      queue.paused = true;
    }

    this.emit('shutdown');
    logger.info('Queue system shut down');
  }
}

// Interfaces
interface Queue {
  name: string;
  config: QueueConfig;
  jobs: Job[];
  running: Job[];
  completed: Job[];
  failed: Job[];
  delayed: Job[];
  paused: boolean;
  metrics: QueueMetrics;
}

interface JobProcessor {
  process(job: Job): Promise<any>;
}

// Export singleton instance
export const queueSystem = new AdvancedQueueSystem();
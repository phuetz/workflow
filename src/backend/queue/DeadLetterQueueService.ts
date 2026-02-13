/**
 * Dead Letter Queue (DLQ) Service
 * Manages failed jobs that have exceeded retry attempts
 *
 * @module backend/queue/DeadLetterQueueService
 */

import { Queue, Job } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../services/LogService';
import { WorkflowJobData, JobResult } from './WorkflowQueue';

/**
 * Dead letter job structure
 */
export interface DeadLetterJob {
  id: string;
  originalJobId: string;
  queueName: string;
  jobName: string;
  data: WorkflowJobData | Record<string, unknown>;
  failedReason: string;
  stacktrace: string[];
  attemptsMade: number;
  maxAttempts: number;
  createdAt: Date;
  failedAt: Date;
  processedOn?: Date;
  workflowId?: string;
  executionId?: string;
  errorType?: string;
  metadata?: Record<string, unknown>;
}

/**
 * DLQ statistics
 */
export interface DLQStats {
  totalCount: number;
  byQueue: Record<string, number>;
  byErrorType: Record<string, number>;
  byWorkflow: Record<string, number>;
  oldestJob?: Date;
  newestJob?: Date;
}

/**
 * DLQ filter options
 */
export interface DLQFilterOptions {
  queueName?: string;
  errorType?: string;
  workflowId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

/**
 * Retry result
 */
export interface RetryResult {
  success: boolean;
  jobId: string;
  newJobId?: string;
  error?: string;
}

/**
 * Dead Letter Queue Service
 * Provides comprehensive DLQ management capabilities
 */
export class DeadLetterQueueService {
  private connection: IORedis;
  private dlqKey = 'dlq:jobs';
  private dlqIndexByQueue = 'dlq:index:queue:';
  private dlqIndexByError = 'dlq:index:error:';
  private dlqIndexByWorkflow = 'dlq:index:workflow:';
  private dlqIndexByDate = 'dlq:index:date';
  private queues: Map<string, Queue> = new Map();

  constructor(
    private redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379'
  ) {
    this.connection = new IORedis(this.redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    logger.info('DeadLetterQueueService initialized');
  }

  /**
   * Register a queue for retry operations
   */
  registerQueue(name: string, queue: Queue): void {
    this.queues.set(name, queue);
    logger.debug(`Queue '${name}' registered with DLQ service`);
  }

  /**
   * Add a failed job to the dead letter queue
   */
  async addToDeadLetterQueue(
    job: Job<WorkflowJobData | Record<string, unknown>>,
    queueName: string,
    error: Error
  ): Promise<string> {
    const dlqId = `dlq_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const now = new Date();

    const dlqJob: DeadLetterJob = {
      id: dlqId,
      originalJobId: job.id || 'unknown',
      queueName,
      jobName: job.name,
      data: job.data,
      failedReason: error.message,
      stacktrace: error.stack?.split('\n') || [],
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts || 3,
      createdAt: new Date(job.timestamp || Date.now()),
      failedAt: now,
      processedOn: job.processedOn ? new Date(job.processedOn) : undefined,
      workflowId: (job.data as WorkflowJobData)?.workflowId,
      executionId: (job.data as WorkflowJobData)?.executionId,
      errorType: this.categorizeError(error),
      metadata: {
        originalOpts: job.opts,
        progress: job.progress,
      },
    };

    // Store the job
    await this.connection.hset(this.dlqKey, dlqId, JSON.stringify(dlqJob));

    // Add to indexes for efficient querying
    await this.connection.sadd(`${this.dlqIndexByQueue}${queueName}`, dlqId);
    await this.connection.sadd(
      `${this.dlqIndexByError}${dlqJob.errorType}`,
      dlqId
    );

    if (dlqJob.workflowId) {
      await this.connection.sadd(
        `${this.dlqIndexByWorkflow}${dlqJob.workflowId}`,
        dlqId
      );
    }

    // Add to date index (sorted set by timestamp)
    await this.connection.zadd(this.dlqIndexByDate, now.getTime(), dlqId);

    logger.info(`Job added to DLQ: ${dlqId}`, {
      originalJobId: job.id,
      queueName,
      errorType: dlqJob.errorType,
    });

    return dlqId;
  }

  /**
   * Get paginated list of failed jobs
   */
  async listFailedJobs(options: DLQFilterOptions = {}): Promise<{
    jobs: DeadLetterJob[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    let jobIds: string[];

    // Apply filters to get the right set of job IDs
    if (options.queueName) {
      jobIds = await this.connection.smembers(
        `${this.dlqIndexByQueue}${options.queueName}`
      );
    } else if (options.errorType) {
      jobIds = await this.connection.smembers(
        `${this.dlqIndexByError}${options.errorType}`
      );
    } else if (options.workflowId) {
      jobIds = await this.connection.smembers(
        `${this.dlqIndexByWorkflow}${options.workflowId}`
      );
    } else if (options.dateFrom || options.dateTo) {
      const from = options.dateFrom?.getTime() || 0;
      const to = options.dateTo?.getTime() || Date.now();
      jobIds = await this.connection.zrangebyscore(
        this.dlqIndexByDate,
        from,
        to
      );
    } else {
      // Get all job IDs from the date index (most recent first)
      jobIds = await this.connection.zrevrange(this.dlqIndexByDate, 0, -1);
    }

    const total = jobIds.length;

    // Apply additional filters if multiple criteria
    let filteredIds = jobIds;

    if (options.queueName && (options.errorType || options.workflowId)) {
      const queueIds = new Set(
        await this.connection.smembers(
          `${this.dlqIndexByQueue}${options.queueName}`
        )
      );
      filteredIds = filteredIds.filter((id) => queueIds.has(id));
    }

    if (options.errorType && (options.queueName || options.workflowId)) {
      const errorIds = new Set(
        await this.connection.smembers(
          `${this.dlqIndexByError}${options.errorType}`
        )
      );
      filteredIds = filteredIds.filter((id) => errorIds.has(id));
    }

    if (options.workflowId && (options.queueName || options.errorType)) {
      const workflowIds = new Set(
        await this.connection.smembers(
          `${this.dlqIndexByWorkflow}${options.workflowId}`
        )
      );
      filteredIds = filteredIds.filter((id) => workflowIds.has(id));
    }

    // Apply date range filter if needed
    if (options.dateFrom || options.dateTo) {
      const from = options.dateFrom?.getTime() || 0;
      const to = options.dateTo?.getTime() || Date.now();
      const dateFilteredIds = await this.connection.zrangebyscore(
        this.dlqIndexByDate,
        from,
        to
      );
      const dateSet = new Set(dateFilteredIds);
      filteredIds = filteredIds.filter((id) => dateSet.has(id));
    }

    // Paginate
    const paginatedIds = filteredIds.slice(offset, offset + limit);

    // Fetch job details
    const jobs: DeadLetterJob[] = [];
    for (const id of paginatedIds) {
      const jobData = await this.connection.hget(this.dlqKey, id);
      if (jobData) {
        const job = JSON.parse(jobData) as DeadLetterJob;
        // Convert date strings back to Date objects
        job.createdAt = new Date(job.createdAt);
        job.failedAt = new Date(job.failedAt);
        if (job.processedOn) {
          job.processedOn = new Date(job.processedOn);
        }
        jobs.push(job);
      }
    }

    return {
      jobs,
      total: filteredIds.length,
      page,
      limit,
      totalPages: Math.ceil(filteredIds.length / limit),
    };
  }

  /**
   * Get a single failed job by ID
   */
  async getFailedJob(jobId: string): Promise<DeadLetterJob | null> {
    const jobData = await this.connection.hget(this.dlqKey, jobId);
    if (!jobData) {
      return null;
    }

    const job = JSON.parse(jobData) as DeadLetterJob;
    job.createdAt = new Date(job.createdAt);
    job.failedAt = new Date(job.failedAt);
    if (job.processedOn) {
      job.processedOn = new Date(job.processedOn);
    }

    return job;
  }

  /**
   * Get DLQ statistics
   */
  async getStats(): Promise<DLQStats> {
    // Get all job IDs
    const allJobIds = await this.connection.hkeys(this.dlqKey);
    const totalCount = allJobIds.length;

    // Count by queue
    const byQueue: Record<string, number> = {};
    const queueKeys = await this.connection.keys(`${this.dlqIndexByQueue}*`);
    for (const key of queueKeys) {
      const queueName = key.replace(this.dlqIndexByQueue, '');
      const count = await this.connection.scard(key);
      byQueue[queueName] = count;
    }

    // Count by error type
    const byErrorType: Record<string, number> = {};
    const errorKeys = await this.connection.keys(`${this.dlqIndexByError}*`);
    for (const key of errorKeys) {
      const errorType = key.replace(this.dlqIndexByError, '');
      const count = await this.connection.scard(key);
      byErrorType[errorType] = count;
    }

    // Count by workflow
    const byWorkflow: Record<string, number> = {};
    const workflowKeys = await this.connection.keys(
      `${this.dlqIndexByWorkflow}*`
    );
    for (const key of workflowKeys) {
      const workflowId = key.replace(this.dlqIndexByWorkflow, '');
      const count = await this.connection.scard(key);
      byWorkflow[workflowId] = count;
    }

    // Get oldest and newest jobs
    let oldestJob: Date | undefined;
    let newestJob: Date | undefined;

    const oldestJobId = await this.connection.zrange(this.dlqIndexByDate, 0, 0);
    if (oldestJobId.length > 0) {
      const score = await this.connection.zscore(
        this.dlqIndexByDate,
        oldestJobId[0]
      );
      if (score) {
        oldestJob = new Date(parseInt(score, 10));
      }
    }

    const newestJobId = await this.connection.zrange(
      this.dlqIndexByDate,
      -1,
      -1
    );
    if (newestJobId.length > 0) {
      const score = await this.connection.zscore(
        this.dlqIndexByDate,
        newestJobId[0]
      );
      if (score) {
        newestJob = new Date(parseInt(score, 10));
      }
    }

    return {
      totalCount,
      byQueue,
      byErrorType,
      byWorkflow,
      oldestJob,
      newestJob,
    };
  }

  /**
   * Retry a single failed job
   */
  async retryJob(jobId: string): Promise<RetryResult> {
    const dlqJob = await this.getFailedJob(jobId);
    if (!dlqJob) {
      return {
        success: false,
        jobId,
        error: 'Job not found in DLQ',
      };
    }

    // Get the original queue
    const queue = this.queues.get(dlqJob.queueName);
    if (!queue) {
      return {
        success: false,
        jobId,
        error: `Queue '${dlqJob.queueName}' not found or not registered`,
      };
    }

    try {
      // Add the job back to the original queue
      const newJob = await queue.add(dlqJob.jobName, dlqJob.data, {
        attempts: dlqJob.maxAttempts,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });

      // Remove from DLQ
      await this.deleteJob(jobId);

      logger.info(`DLQ job retried successfully`, {
        dlqJobId: jobId,
        newJobId: newJob.id,
        queueName: dlqJob.queueName,
      });

      return {
        success: true,
        jobId,
        newJobId: newJob.id,
      };
    } catch (error) {
      logger.error(`Failed to retry DLQ job: ${jobId}`, {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        jobId,
        error: error instanceof Error ? error.message : 'Retry failed',
      };
    }
  }

  /**
   * Retry all failed jobs with optional filters
   */
  async retryAll(
    options: DLQFilterOptions = {}
  ): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    results: RetryResult[];
  }> {
    const { jobs } = await this.listFailedJobs({
      ...options,
      page: 1,
      limit: 10000, // Get all matching jobs
    });

    const results: RetryResult[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const job of jobs) {
      const result = await this.retryJob(job.id);
      results.push(result);
      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    logger.info(`Bulk retry completed`, {
      total: jobs.length,
      succeeded,
      failed,
    });

    return {
      total: jobs.length,
      succeeded,
      failed,
      results,
    };
  }

  /**
   * Delete a failed job from DLQ
   */
  async deleteJob(jobId: string): Promise<boolean> {
    const dlqJob = await this.getFailedJob(jobId);
    if (!dlqJob) {
      return false;
    }

    // Remove from main hash
    await this.connection.hdel(this.dlqKey, jobId);

    // Remove from indexes
    await this.connection.srem(
      `${this.dlqIndexByQueue}${dlqJob.queueName}`,
      jobId
    );
    await this.connection.srem(
      `${this.dlqIndexByError}${dlqJob.errorType}`,
      jobId
    );

    if (dlqJob.workflowId) {
      await this.connection.srem(
        `${this.dlqIndexByWorkflow}${dlqJob.workflowId}`,
        jobId
      );
    }

    await this.connection.zrem(this.dlqIndexByDate, jobId);

    logger.info(`DLQ job deleted: ${jobId}`);
    return true;
  }

  /**
   * Clear all DLQ jobs with optional filters
   */
  async clearAll(
    options: DLQFilterOptions = {},
    confirmation: string = ''
  ): Promise<{
    deleted: number;
    error?: string;
  }> {
    // Require explicit confirmation for clearing all jobs
    if (!options.queueName && !options.errorType && !options.workflowId) {
      if (confirmation !== 'CONFIRM_DELETE_ALL') {
        return {
          deleted: 0,
          error:
            'Confirmation required. Set confirmation to "CONFIRM_DELETE_ALL" to clear all DLQ jobs.',
        };
      }
    }

    const { jobs } = await this.listFailedJobs({
      ...options,
      page: 1,
      limit: 100000, // Get all matching jobs
    });

    let deleted = 0;
    for (const job of jobs) {
      const success = await this.deleteJob(job.id);
      if (success) {
        deleted++;
      }
    }

    logger.info(`DLQ cleared`, { deleted, filters: options });

    return { deleted };
  }

  /**
   * Categorize error for better grouping
   */
  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();

    if (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('etimedout')
    ) {
      return 'TIMEOUT';
    }
    if (
      message.includes('connection') ||
      message.includes('econnrefused') ||
      message.includes('econnreset')
    ) {
      return 'CONNECTION_ERROR';
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return 'AUTHENTICATION_ERROR';
    }
    if (message.includes('forbidden') || message.includes('403')) {
      return 'AUTHORIZATION_ERROR';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'NOT_FOUND_ERROR';
    }
    if (
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('too many')
    ) {
      return 'RATE_LIMIT_ERROR';
    }
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('400')
    ) {
      return 'VALIDATION_ERROR';
    }
    if (
      message.includes('500') ||
      message.includes('internal server') ||
      message.includes('server error')
    ) {
      return 'SERVER_ERROR';
    }
    if (
      message.includes('memory') ||
      message.includes('heap') ||
      message.includes('oom')
    ) {
      return 'MEMORY_ERROR';
    }
    if (message.includes('parse') || message.includes('json')) {
      return 'PARSE_ERROR';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'NETWORK_ERROR';
    }
    if (message.includes('database') || message.includes('db')) {
      return 'DATABASE_ERROR';
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.connection.quit();
    logger.info('DeadLetterQueueService closed');
  }
}

// Singleton instance
let dlqServiceInstance: DeadLetterQueueService | null = null;

export function getDeadLetterQueueService(): DeadLetterQueueService {
  if (!dlqServiceInstance) {
    dlqServiceInstance = new DeadLetterQueueService();
  }
  return dlqServiceInstance;
}

export function initializeDeadLetterQueueService(
  redisUrl?: string
): DeadLetterQueueService {
  if (dlqServiceInstance) {
    logger.warn('DeadLetterQueueService already initialized');
    return dlqServiceInstance;
  }

  dlqServiceInstance = new DeadLetterQueueService(redisUrl);
  return dlqServiceInstance;
}

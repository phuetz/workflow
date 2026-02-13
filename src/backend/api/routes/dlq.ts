/**
 * Dead Letter Queue (DLQ) Management API Routes
 * Endpoints for managing failed jobs in the dead letter queue
 *
 * @module backend/api/routes/dlq
 */

import { Router, Request, Response } from 'express';
import {
  getDeadLetterQueueService,
  DLQFilterOptions,
} from '../../queue/DeadLetterQueueService';
import { logger } from '../../../services/SimpleLogger';
import { authHandler, requireRoleHandler } from '../middleware/auth';

const router: Router = Router();

/**
 * Apply authentication to all DLQ routes
 * DLQ management requires admin role
 */
router.use(authHandler);
router.use(requireRoleHandler('admin', 'ADMIN', 'operator', 'OPERATOR'));

/**
 * GET /api/dlq
 * List failed jobs with pagination and filters
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - queueName: Filter by queue name
 * - errorType: Filter by error type
 * - workflowId: Filter by workflow ID
 * - dateFrom: Filter by start date (ISO string)
 * - dateTo: Filter by end date (ISO string)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const dlqService = getDeadLetterQueueService();

    // Parse pagination
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string, 10) || 20)
    );

    // Build filter options
    const filters: DLQFilterOptions = {
      page,
      limit,
    };

    if (req.query.queueName) {
      filters.queueName = req.query.queueName as string;
    }

    if (req.query.errorType) {
      filters.errorType = req.query.errorType as string;
    }

    if (req.query.workflowId) {
      filters.workflowId = req.query.workflowId as string;
    }

    if (req.query.dateFrom) {
      const dateFrom = new Date(req.query.dateFrom as string);
      if (!isNaN(dateFrom.getTime())) {
        filters.dateFrom = dateFrom;
      }
    }

    if (req.query.dateTo) {
      const dateTo = new Date(req.query.dateTo as string);
      if (!isNaN(dateTo.getTime())) {
        filters.dateTo = dateTo;
      }
    }

    const result = await dlqService.listFailedJobs(filters);

    res.json({
      success: true,
      data: result.jobs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      filters: {
        queueName: filters.queueName,
        errorType: filters.errorType,
        workflowId: filters.workflowId,
        dateFrom: filters.dateFrom?.toISOString(),
        dateTo: filters.dateTo?.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to list DLQ jobs', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to list dead letter queue jobs',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/dlq/stats
 * Get DLQ statistics
 *
 * Returns:
 * - Total count of failed jobs
 * - Count by queue name
 * - Count by error type
 * - Count by workflow ID
 * - Oldest and newest job timestamps
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const dlqService = getDeadLetterQueueService();
    const stats = await dlqService.getStats();

    res.json({
      success: true,
      data: {
        totalCount: stats.totalCount,
        byQueue: stats.byQueue,
        byErrorType: stats.byErrorType,
        byWorkflow: stats.byWorkflow,
        oldestJob: stats.oldestJob?.toISOString() || null,
        newestJob: stats.newestJob?.toISOString() || null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get DLQ stats', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get DLQ statistics',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/dlq/:jobId
 * Get details of a specific failed job
 *
 * Response includes:
 * - Original job data
 * - Error message and stack trace
 * - Failure count and timestamps
 * - Original queue name
 * - Workflow/execution context
 */
router.get('/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const dlqService = getDeadLetterQueueService();

    const job = await dlqService.getFailedJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found in dead letter queue',
        jobId,
      });
    }

    res.json({
      success: true,
      data: {
        id: job.id,
        originalJobId: job.originalJobId,
        queueName: job.queueName,
        jobName: job.jobName,
        data: job.data,
        error: {
          message: job.failedReason,
          type: job.errorType,
          stacktrace: job.stacktrace,
        },
        attempts: {
          made: job.attemptsMade,
          max: job.maxAttempts,
        },
        timestamps: {
          created: job.createdAt.toISOString(),
          failed: job.failedAt.toISOString(),
          processed: job.processedOn?.toISOString() || null,
        },
        context: {
          workflowId: job.workflowId || null,
          executionId: job.executionId || null,
        },
        metadata: job.metadata,
      },
    });
  } catch (error) {
    logger.error('Failed to get DLQ job details', {
      jobId: req.params.jobId,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get job details',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/dlq/:jobId/retry
 * Retry a single failed job
 *
 * Re-adds the job to its original queue with fresh retry attempts
 */
router.post('/:jobId/retry', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const dlqService = getDeadLetterQueueService();

    const result = await dlqService.retryJob(jobId);

    if (!result.success) {
      return res.status(result.error?.includes('not found') ? 404 : 400).json({
        success: false,
        error: result.error,
        jobId,
      });
    }

    logger.info('DLQ job retry initiated', {
      dlqJobId: jobId,
      newJobId: result.newJobId,
    });

    res.json({
      success: true,
      message: 'Job has been re-queued for processing',
      data: {
        originalJobId: jobId,
        newJobId: result.newJobId,
      },
    });
  } catch (error) {
    logger.error('Failed to retry DLQ job', {
      jobId: req.params.jobId,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retry job',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/dlq/retry-all
 * Retry all failed jobs with optional filters
 *
 * Body Parameters (all optional):
 * - queueName: Filter by queue name
 * - errorType: Filter by error type
 * - workflowId: Filter by workflow ID
 * - dateFrom: Filter by start date (ISO string)
 * - dateTo: Filter by end date (ISO string)
 */
router.post('/retry-all', async (req: Request, res: Response) => {
  try {
    const dlqService = getDeadLetterQueueService();

    // Build filter options from request body
    const filters: DLQFilterOptions = {};

    if (req.body.queueName) {
      filters.queueName = req.body.queueName;
    }

    if (req.body.errorType) {
      filters.errorType = req.body.errorType;
    }

    if (req.body.workflowId) {
      filters.workflowId = req.body.workflowId;
    }

    if (req.body.dateFrom) {
      const dateFrom = new Date(req.body.dateFrom);
      if (!isNaN(dateFrom.getTime())) {
        filters.dateFrom = dateFrom;
      }
    }

    if (req.body.dateTo) {
      const dateTo = new Date(req.body.dateTo);
      if (!isNaN(dateTo.getTime())) {
        filters.dateTo = dateTo;
      }
    }

    const result = await dlqService.retryAll(filters);

    logger.info('Bulk DLQ retry completed', {
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
      filters,
    });

    res.json({
      success: true,
      message: `Retried ${result.succeeded} of ${result.total} jobs`,
      data: {
        total: result.total,
        succeeded: result.succeeded,
        failed: result.failed,
        results: result.results.map((r) => ({
          jobId: r.jobId,
          success: r.success,
          newJobId: r.newJobId,
          error: r.error,
        })),
      },
      filters: {
        queueName: filters.queueName,
        errorType: filters.errorType,
        workflowId: filters.workflowId,
        dateFrom: filters.dateFrom?.toISOString(),
        dateTo: filters.dateTo?.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to retry all DLQ jobs', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retry jobs',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * DELETE /api/dlq/:jobId
 * Delete a single failed job from DLQ
 *
 * Permanently removes the job without retry
 */
router.delete('/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const dlqService = getDeadLetterQueueService();

    const deleted = await dlqService.deleteJob(jobId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Job not found in dead letter queue',
        jobId,
      });
    }

    logger.info('DLQ job deleted', { jobId });

    res.json({
      success: true,
      message: 'Job deleted from dead letter queue',
      jobId,
    });
  } catch (error) {
    logger.error('Failed to delete DLQ job', {
      jobId: req.params.jobId,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to delete job',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * DELETE /api/dlq/clear
 * Clear all DLQ jobs with optional filters
 *
 * Body Parameters:
 * - confirmation: Required string "CONFIRM_DELETE_ALL" when clearing all jobs without filters
 * - queueName: Optional filter by queue name
 * - errorType: Optional filter by error type
 * - workflowId: Optional filter by workflow ID
 *
 * WARNING: This is a destructive operation
 */
router.delete('/clear', async (req: Request, res: Response) => {
  try {
    const dlqService = getDeadLetterQueueService();

    // Build filter options from request body
    const filters: DLQFilterOptions = {};

    if (req.body.queueName) {
      filters.queueName = req.body.queueName;
    }

    if (req.body.errorType) {
      filters.errorType = req.body.errorType;
    }

    if (req.body.workflowId) {
      filters.workflowId = req.body.workflowId;
    }

    const confirmation = req.body.confirmation || '';

    const result = await dlqService.clearAll(filters, confirmation);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    logger.warn('DLQ cleared', {
      deleted: result.deleted,
      filters,
    });

    res.json({
      success: true,
      message: `Cleared ${result.deleted} jobs from dead letter queue`,
      data: {
        deleted: result.deleted,
      },
      filters: {
        queueName: filters.queueName,
        errorType: filters.errorType,
        workflowId: filters.workflowId,
      },
    });
  } catch (error) {
    logger.error('Failed to clear DLQ', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to clear dead letter queue',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/dlq/error-types
 * Get list of available error types for filtering
 */
router.get('/error-types', async (req: Request, res: Response) => {
  try {
    const dlqService = getDeadLetterQueueService();
    const stats = await dlqService.getStats();

    res.json({
      success: true,
      data: {
        errorTypes: Object.keys(stats.byErrorType),
        counts: stats.byErrorType,
      },
    });
  } catch (error) {
    logger.error('Failed to get DLQ error types', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get error types',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/dlq/queues
 * Get list of queues with failed jobs
 */
router.get('/queues', async (req: Request, res: Response) => {
  try {
    const dlqService = getDeadLetterQueueService();
    const stats = await dlqService.getStats();

    res.json({
      success: true,
      data: {
        queues: Object.keys(stats.byQueue),
        counts: stats.byQueue,
      },
    });
  } catch (error) {
    logger.error('Failed to get DLQ queues', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get queue list',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

/**
 * Queue Management API Routes
 * Endpoints for workflow queue operations
 */

import express from 'express';
import { getQueueService } from '../../queue/WorkflowQueue';
import { logger } from '../../services/LogService';

const router = express.Router();

/**
 * Submit workflow for execution via queue
 * POST /api/queue/execute
 */
router.post('/execute', async (req, res) => {
  try {
    const { workflowId, userId, inputData, triggerNode, mode, priority } = req.body;

    if (!workflowId || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: workflowId, userId',
      });
    }

    const queueService = getQueueService();
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const jobData = {
      workflowId,
      executionId,
      userId,
      inputData: inputData || {},
      triggerNode,
      mode: mode || 'manual',
    };

    const job = priority
      ? await queueService.addPriorityJob(jobData)
      : await queueService.addJob(jobData);

    logger.info(`Workflow queued for execution`, {
      workflowId,
      executionId,
      jobId: job.id,
    });

    res.status(202).json({
      success: true,
      executionId,
      jobId: job.id,
      message: 'Workflow queued for execution',
    });
  } catch (error) {
    logger.error('Failed to queue workflow', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to queue workflow',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Get job status
 * GET /api/queue/status/:jobId
 */
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const queueService = getQueueService();

    const status = await queueService.getJobStatus(jobId);

    if (!status) {
      return res.status(404).json({
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      jobId,
      ...status,
    });
  } catch (error) {
    logger.error('Failed to get job status', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to get job status',
    });
  }
});

/**
 * Cancel job
 * DELETE /api/queue/jobs/:jobId
 */
router.delete('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const queueService = getQueueService();

    const cancelled = await queueService.cancelJob(jobId);

    if (!cancelled) {
      return res.status(404).json({
        error: 'Job not found or already completed',
      });
    }

    res.json({
      success: true,
      message: 'Job cancelled',
    });
  } catch (error) {
    logger.error('Failed to cancel job', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to cancel job',
    });
  }
});

/**
 * Retry failed job
 * POST /api/queue/jobs/:jobId/retry
 */
router.post('/jobs/:jobId/retry', async (req, res) => {
  try {
    const { jobId } = req.params;
    const queueService = getQueueService();

    const retried = await queueService.retryJob(jobId);

    if (!retried) {
      return res.status(400).json({
        error: 'Job not found or not in failed state',
      });
    }

    res.json({
      success: true,
      message: 'Job retried',
    });
  } catch (error) {
    logger.error('Failed to retry job', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to retry job',
    });
  }
});

/**
 * Get queue metrics
 * GET /api/queue/metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const queueService = getQueueService();
    const metrics = await queueService.getMetrics();

    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get queue metrics', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to get queue metrics',
    });
  }
});

/**
 * Pause queue
 * POST /api/queue/pause
 */
router.post('/pause', async (req, res) => {
  try {
    const queueService = getQueueService();
    await queueService.pauseQueue();

    res.json({
      success: true,
      message: 'Queue paused',
    });
  } catch (error) {
    logger.error('Failed to pause queue', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to pause queue',
    });
  }
});

/**
 * Resume queue
 * POST /api/queue/resume
 */
router.post('/resume', async (req, res) => {
  try {
    const queueService = getQueueService();
    await queueService.resumeQueue();

    res.json({
      success: true,
      message: 'Queue resumed',
    });
  } catch (error) {
    logger.error('Failed to resume queue', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to resume queue',
    });
  }
});

/**
 * Clean old jobs
 * POST /api/queue/clean
 */
router.post('/clean', async (req, res) => {
  try {
    const { olderThan } = req.body;
    const queueService = getQueueService();

    const cleaned = await queueService.cleanOldJobs(olderThan);

    res.json({
      success: true,
      cleaned,
    });
  } catch (error) {
    logger.error('Failed to clean jobs', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to clean jobs',
    });
  }
});

/**
 * Health check
 * GET /api/queue/health
 */
router.get('/health', async (req, res) => {
  try {
    const queueService = getQueueService();
    const health = await queueService.healthCheck();

    const statusCode = health.healthy ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Queue health check failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(503).json({
      healthy: false,
      error: 'Health check failed',
    });
  }
});

export default router;

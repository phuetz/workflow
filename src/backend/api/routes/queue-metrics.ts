/**
 * Queue Metrics API Routes
 * Provides metrics for all queue types in the system
 */

import { Router, Response } from 'express';
import { queueManager } from '../../queue/QueueManager';
import { logger } from '../../services/LogService';
import { authHandler, AuthRequest } from '../middleware/auth';

export const queuemetricsRouter = Router();

/**
 * GET /api/queue-metrics
 * Returns metrics for all queues in the system
 *
 * Response format:
 * {
 *   "workflow-execution": { waiting, active, completed, failed, delayed, paused },
 *   "webhook-processing": { ... },
 *   "email-sending": { ... },
 *   ...
 * }
 */
queuemetricsRouter.get('/', authHandler, async (req, res) => {
  const authReq = req as unknown as AuthRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const allMetrics = await queueManager.getAllQueueMetrics();

    // Convert Map to plain object for JSON response
    const metricsObject: Record<string, {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      paused: number;
    }> = {};

    Array.from(allMetrics.entries()).forEach(([queueName, metrics]) => {
      metricsObject[queueName] = metrics;
    });

    res.json(metricsObject);
  } catch (error) {
    logger.error('Failed to get queue metrics', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to get queue metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/queue-metrics/:queueName
 * Returns metrics for a specific queue
 */
queuemetricsRouter.get('/:queueName', authHandler, async (req, res) => {
  const authReq = req as unknown as AuthRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const { queueName } = req.params;
    const metrics = await queueManager.getQueueMetrics(queueName);

    res.json({
      queue: queueName,
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get queue metrics', {
      error: error instanceof Error ? error.message : String(error),
      queueName: req.params.queueName,
    });

    res.status(500).json({
      error: 'Failed to get queue metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/queue-metrics/status/overview
 * Returns overall queue system status
 */
queuemetricsRouter.get('/status/overview', authHandler, async (req, res) => {
  const authReq = req as unknown as AuthRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const allMetrics = await queueManager.getAllQueueMetrics();

    // Calculate totals across all queues
    let totalWaiting = 0;
    let totalActive = 0;
    let totalCompleted = 0;
    let totalFailed = 0;
    let totalDelayed = 0;
    let totalPaused = 0;

    Array.from(allMetrics.values()).forEach((metrics) => {
      totalWaiting += metrics.waiting;
      totalActive += metrics.active;
      totalCompleted += metrics.completed;
      totalFailed += metrics.failed;
      totalDelayed += metrics.delayed;
      totalPaused += metrics.paused;
    });

    res.json({
      status: totalFailed > 100 ? 'degraded' : 'healthy',
      queues: allMetrics.size,
      totals: {
        waiting: totalWaiting,
        active: totalActive,
        completed: totalCompleted,
        failed: totalFailed,
        delayed: totalDelayed,
        paused: totalPaused,
        total: totalWaiting + totalActive + totalCompleted + totalFailed + totalDelayed + totalPaused,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get queue status overview', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to get queue status overview',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default queuemetricsRouter;

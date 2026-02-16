/**
 * Real-Time Monitoring API Routes
 * Provides live system metrics, execution timelines, and failure analysis.
 */

import { Router, Request, Response } from 'express';
import { monitoringService } from '../../services/MonitoringService';
import { getWebSocketStats } from '../services/events';
import { logger } from '../../../services/SimpleLogger';

const router = Router();

// GET /api/monitoring/metrics - Live system metrics
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = await monitoringService.getMetrics();
    const wsStats = getWebSocketStats();

    res.json({
      ...metrics,
      websocket: wsStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// GET /api/monitoring/timeline - Execution timeline (last N hours)
router.get('/timeline', async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const timeline = await monitoringService.getExecutionTimeline(Math.min(hours, 168));
    res.json({ timeline, hours });
  } catch (error) {
    logger.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// GET /api/monitoring/failures - Top failing workflows
router.get('/failures', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const failures = await monitoringService.getTopFailingWorkflows(limit);
    res.json({ failures });
  } catch (error) {
    logger.error('Error fetching failures:', error);
    res.status(500).json({ error: 'Failed to fetch failures' });
  }
});

export default router;

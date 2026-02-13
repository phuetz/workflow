/**
 * Analytics API Routes
 * Endpoints for analytics and metrics
 */

import { Router } from 'express';
import { analyticsService } from '../../../services/AnalyticsService';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Web Vitals endpoint (no auth required for performance monitoring)
router.post('/vitals', asyncHandler(async (req, res) => {
  const { name, value, rating, delta, id, navigationType, entries, timestamp, url, userAgent } = req.body;

  // Store Web Vitals metric
  try {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] ${name}: ${value} (${rating})`);
    }

    // TODO: Store in database or send to monitoring service (Datadog, New Relic, etc.)
    // For now, just acknowledge receipt
    res.status(204).send();
  } catch (error) {
    console.error('Failed to store Web Vitals metric:', error);
    res.status(500).json({ error: 'Failed to store metric' });
  }
}));

// Analytics API info endpoint
router.get('/', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Analytics API',
    endpoints: [
      'POST /api/analytics/vitals - Submit Web Vitals metrics',
      'GET /api/analytics/workflows/:id/metrics - Get workflow metrics',
      'GET /api/analytics/nodes/:id/metrics - Get node metrics',
      'GET /api/analytics/executions/history - Get execution history',
      'GET /api/analytics/performance - Get performance analytics',
      'GET /api/analytics/errors - Get error analytics'
    ]
  });
}));

// Get workflow metrics
router.get('/workflows/:id/metrics', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const metrics = await analyticsService.getWorkflowMetrics(id);

  if (!metrics || metrics.length === 0) {
    throw new ApiError(404, 'No metrics found for this workflow');
  }

  res.json(metrics[0]);
}));

// Get node metrics
router.get('/nodes/:id/metrics', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const metrics = await analyticsService.getNodeMetrics(id);

  if (!metrics || metrics.length === 0) {
    throw new ApiError(404, 'No metrics found for this node');
  }

  res.json(metrics[0]);
}));

// Get execution history
router.get('/executions/history', asyncHandler(async (req: AuthRequest, res) => {
  const { workflowId, status, startDate, endDate, limit = 100 } = req.query;

  const history = await analyticsService.getExecutionHistory({
    workflowId: workflowId as string,
    status: status as string,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    limit: Number(limit)
  });

  res.json(history);
}));

// Get real-time metrics
router.get('/realtime', asyncHandler(async (req: AuthRequest, res) => {
  const metrics = await analyticsService.getRealTimeMetrics();
  res.json(metrics);
}));

// Get business metrics
router.get('/business', asyncHandler(async (req: AuthRequest, res) => {
  const { period = 'day' } = req.query;
  const validPeriod = period as 'hour' | 'day' | 'week' | 'month';
  const metrics = await analyticsService.getBusinessMetrics(validPeriod);
  res.json(metrics);
}));

// Generate performance report
router.post('/reports/performance', asyncHandler(async (req: AuthRequest, res) => {
  const { type, startDate, endDate, filters } = req.body;

  if (!type || !startDate || !endDate) {
    throw new ApiError(400, 'Report type and date range are required');
  }

  const report = await analyticsService.generatePerformanceReport(
    type,
    {
      start: new Date(startDate),
      end: new Date(endDate)
    },
    filters
  );

  res.json(report);
}));

// Export data
router.post('/export', asyncHandler(async (req: AuthRequest, res) => {
  const { type, format, filters } = req.body;

  if (!type || !format) {
    throw new ApiError(400, 'Export type and format are required');
  }

  const result = await analyticsService.exportData(type, format, filters);

  res.setHeader('Content-Type',
    format === 'csv' ? 'text/csv' :
    format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
    'application/json'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.data);
}));

// Alert rules
router.get('/alerts/rules', asyncHandler(async (req: AuthRequest, res) => {
  const rules = await analyticsService.getAlertRules();
  res.json(rules);
}));

router.post('/alerts/rules', asyncHandler(async (req: AuthRequest, res) => {
  const rule = await analyticsService.createAlertRule(req.body);
  res.status(201).json(rule);
}));

// Get alerts
router.get('/alerts', asyncHandler(async (req: AuthRequest, res) => {
  const { resolved, severity, ruleId } = req.query;

  const alerts = await analyticsService.getAlerts({
    resolved: resolved === 'true',
    severity: severity as string,
    ruleId: ruleId as string
  });

  res.json(alerts);
}));

// Resolve alert
router.post('/alerts/:id/resolve', asyncHandler(async (req: AuthRequest, res) => {
  await analyticsService.resolveAlert(req.params.id, req.user!.id);
  res.json({ success: true });
}));

export const analyticsRouter = router;
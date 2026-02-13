/**
 * Analytics API Routes
 * Endpoints for analytics and metrics
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { analyticsService } from '../../../services/AnalyticsService';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../../services/LogService';

const router = Router();
const prisma = new PrismaClient();

// Web Vitals metric types
type WebVitalName = 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';
type WebVitalRating = 'good' | 'needs-improvement' | 'poor';

interface WebVitalsPayload {
  name: WebVitalName;
  value: number;
  rating: WebVitalRating;
  delta: number;
  id: string;
  navigationType: string;
  entries?: unknown[];
  timestamp?: number;
  url?: string;
  userAgent?: string;
}

// Thresholds for Web Vitals (based on Core Web Vitals standards)
const WEB_VITALS_THRESHOLDS: Record<WebVitalName, { good: number; poor: number }> = {
  CLS: { good: 0.1, poor: 0.25 },      // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 },     // First Contentful Paint (ms)
  FID: { good: 100, poor: 300 },       // First Input Delay (ms)
  INP: { good: 200, poor: 500 },       // Interaction to Next Paint (ms)
  LCP: { good: 2500, poor: 4000 },     // Largest Contentful Paint (ms)
  TTFB: { good: 800, poor: 1800 },     // Time to First Byte (ms)
};

// Web Vitals endpoint (no auth required for performance monitoring)
router.post('/vitals', asyncHandler(async (req, res) => {
  const payload = req.body as WebVitalsPayload;

  // If body is empty (parsing failed), just return silently
  if (!payload || Object.keys(payload).length === 0) {
    res.status(204).send();
    return;
  }

  const { name, value, rating, delta, id, navigationType, entries, timestamp, url, userAgent } = payload;

  // Validate required fields - return 204 instead of error to not spam logs
  if (!name || value === undefined || !rating) {
    res.status(204).send();
    return;
  }

  // Validate metric name - return silently for unknown metrics
  const validNames: WebVitalName[] = ['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB'];
  if (!validNames.includes(name)) {
    res.status(204).send();
    return;
  }

  try {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`[Web Vitals] ${name}: ${value} (${rating})`);
    }

    // Store in database using SystemMetrics table
    await prisma.systemMetrics.create({
      data: {
        metricType: `webvitals.${name.toLowerCase()}`,
        value: typeof value === 'number' ? value : parseFloat(String(value)),
        labels: {
          name,
          rating,
          navigationType: navigationType || 'unknown',
        },
        metadata: {
          id,
          delta,
          timestamp: timestamp || Date.now(),
          url: url || req.headers.referer || 'unknown',
          userAgent: userAgent || req.headers['user-agent'] || 'unknown',
          entriesCount: entries?.length || 0,
          thresholds: WEB_VITALS_THRESHOLDS[name],
        },
      },
    });

    // Also send to monitoring services if configured
    await sendToMonitoringServices({
      name,
      value,
      rating,
      delta,
      navigationType,
      url: url || req.headers.referer as string,
      userAgent: userAgent || req.headers['user-agent'] as string,
      timestamp: timestamp || Date.now(),
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Failed to store Web Vitals metric:', error);
    // Don't fail the request - monitoring should be non-blocking
    res.status(204).send();
  }
}));

/**
 * Send Web Vitals to external monitoring services
 */
async function sendToMonitoringServices(data: {
  name: string;
  value: number;
  rating: string;
  delta: number;
  navigationType?: string;
  url?: string;
  userAgent?: string;
  timestamp: number;
}): Promise<void> {
  const promises: Promise<void>[] = [];

  // Datadog integration
  if (process.env.DATADOG_API_KEY) {
    promises.push(sendToDatadog(data));
  }

  // New Relic integration
  if (process.env.NEW_RELIC_LICENSE_KEY) {
    promises.push(sendToNewRelic(data));
  }

  // Custom webhook integration
  if (process.env.METRICS_WEBHOOK_URL) {
    promises.push(sendToWebhook(data));
  }

  // Wait for all, but don't fail if any error
  await Promise.allSettled(promises);
}

async function sendToDatadog(data: { name: string; value: number; rating: string; timestamp: number }): Promise<void> {
  try {
    const response = await fetch('https://api.datadoghq.com/api/v1/series', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': process.env.DATADOG_API_KEY!,
      },
      body: JSON.stringify({
        series: [{
          metric: `web.vitals.${data.name.toLowerCase()}`,
          points: [[Math.floor(data.timestamp / 1000), data.value]],
          type: 'gauge',
          tags: [`rating:${data.rating}`, `env:${process.env.NODE_ENV || 'development'}`],
        }],
      }),
    });

    if (!response.ok) {
      logger.warn('Datadog metrics submission failed:', await response.text());
    }
  } catch (error) {
    logger.warn('Failed to send metrics to Datadog:', error);
  }
}

async function sendToNewRelic(data: { name: string; value: number; rating: string; timestamp: number }): Promise<void> {
  try {
    const response = await fetch('https://metric-api.newrelic.com/metric/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': process.env.NEW_RELIC_LICENSE_KEY!,
      },
      body: JSON.stringify([{
        metrics: [{
          name: `WebVitals.${data.name}`,
          type: 'gauge',
          value: data.value,
          timestamp: data.timestamp,
          attributes: {
            rating: data.rating,
            environment: process.env.NODE_ENV || 'development',
          },
        }],
      }]),
    });

    if (!response.ok) {
      logger.warn('New Relic metrics submission failed:', await response.text());
    }
  } catch (error) {
    logger.warn('Failed to send metrics to New Relic:', error);
  }
}

async function sendToWebhook(data: { name: string; value: number; rating: string; timestamp: number; url?: string }): Promise<void> {
  try {
    const response = await fetch(process.env.METRICS_WEBHOOK_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.METRICS_WEBHOOK_SECRET && {
          'X-Webhook-Secret': process.env.METRICS_WEBHOOK_SECRET,
        }),
      },
      body: JSON.stringify({
        type: 'web_vitals',
        metric: data.name,
        value: data.value,
        rating: data.rating,
        timestamp: new Date(data.timestamp).toISOString(),
        url: data.url,
        environment: process.env.NODE_ENV || 'development',
      }),
    });

    if (!response.ok) {
      logger.warn('Webhook metrics submission failed:', await response.text());
    }
  } catch (error) {
    logger.warn('Failed to send metrics to webhook:', error);
  }
}

// Get Web Vitals statistics
router.get('/vitals/stats', asyncHandler(async (req: Request, res: Response) => {
  const { period = '24h' } = req.query;

  // Calculate time range
  const now = new Date();
  let startTime: Date;

  switch (period) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  // Fetch Web Vitals metrics from database
  const metrics = await prisma.systemMetrics.findMany({
    where: {
      metricType: {
        startsWith: 'webvitals.',
      },
      timestamp: {
        gte: startTime,
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
  });

  // Aggregate by metric type
  const aggregated: Record<string, {
    count: number;
    sum: number;
    min: number;
    max: number;
    ratings: Record<string, number>;
  }> = {};

  for (const metric of metrics) {
    const name = metric.metricType.replace('webvitals.', '').toUpperCase();
    const labels = metric.labels as { rating?: string };

    if (!aggregated[name]) {
      aggregated[name] = {
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        ratings: { good: 0, 'needs-improvement': 0, poor: 0 },
      };
    }

    aggregated[name].count++;
    aggregated[name].sum += metric.value;
    aggregated[name].min = Math.min(aggregated[name].min, metric.value);
    aggregated[name].max = Math.max(aggregated[name].max, metric.value);

    if (labels?.rating) {
      aggregated[name].ratings[labels.rating] = (aggregated[name].ratings[labels.rating] || 0) + 1;
    }
  }

  // Calculate final statistics
  const stats = Object.entries(aggregated).map(([name, data]) => ({
    name,
    count: data.count,
    average: data.count > 0 ? data.sum / data.count : 0,
    min: data.min === Infinity ? 0 : data.min,
    max: data.max === -Infinity ? 0 : data.max,
    p75: 0, // Would need more data points for percentiles
    ratings: data.ratings,
    goodPercentage: data.count > 0 ? (data.ratings.good / data.count) * 100 : 0,
    thresholds: WEB_VITALS_THRESHOLDS[name as WebVitalName] || null,
  }));

  res.json({
    period,
    startTime: startTime.toISOString(),
    endTime: now.toISOString(),
    totalMetrics: metrics.length,
    stats,
  });
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
router.get('/workflows/:id/metrics', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const metrics = await analyticsService.getWorkflowMetrics(id);

  if (!metrics || metrics.length === 0) {
    throw new ApiError(404, 'No metrics found for this workflow');
  }

  res.json(metrics[0]);
}));

// Get node metrics
router.get('/nodes/:id/metrics', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const metrics = await analyticsService.getNodeMetrics(id);

  if (!metrics || metrics.length === 0) {
    throw new ApiError(404, 'No metrics found for this node');
  }

  res.json(metrics[0]);
}));

// Get execution history
router.get('/executions/history', asyncHandler(async (req: Request, res: Response) => {
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
router.get('/realtime', asyncHandler(async (req: Request, res: Response) => {
  const metrics = await analyticsService.getRealTimeMetrics();
  res.json(metrics);
}));

// Get business metrics
router.get('/business', asyncHandler(async (req: Request, res: Response) => {
  const { period = 'day' } = req.query;
  const validPeriod = period as 'hour' | 'day' | 'week' | 'month';
  const metrics = await analyticsService.getBusinessMetrics(validPeriod);
  res.json(metrics);
}));

// Generate performance report
router.post('/reports/performance', asyncHandler(async (req: Request, res: Response) => {
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
router.post('/export', asyncHandler(async (req: Request, res: Response) => {
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
router.get('/alerts/rules', asyncHandler(async (req: Request, res: Response) => {
  const rules = await analyticsService.getAlertRules();
  res.json(rules);
}));

router.post('/alerts/rules', asyncHandler(async (req: Request, res: Response) => {
  const rule = await analyticsService.createAlertRule(req.body);
  res.status(201).json(rule);
}));

// Get alerts
router.get('/alerts', asyncHandler(async (req: Request, res: Response) => {
  const { resolved, severity, ruleId } = req.query;

  const alerts = await analyticsService.getAlerts({
    resolved: resolved === 'true',
    severity: severity as string,
    ruleId: ruleId as string
  });

  res.json(alerts);
}));

// Resolve alert
router.post('/alerts/:id/resolve', asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  await analyticsService.resolveAlert(req.params.id, authReq.user!.id);
  res.json({ success: true });
}));

export const analyticsRouter = router;
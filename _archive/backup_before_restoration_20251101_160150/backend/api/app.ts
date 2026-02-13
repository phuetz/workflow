/**
 * Express Application Setup
 * PLAN C - Server avec gestion d'erreurs globale
 */

import express, { Application, Request, Response } from 'express';
import crypto from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {
  globalErrorHandler,
  notFoundHandler,
  setupErrorHandlers,
  asyncHandler
} from '../../middleware/globalErrorHandler';
import { logger } from '../../services/LoggingService';
import {
  compressionMiddleware,
  trackResponseSize
} from './middleware/compression';
import {
  staticAssetsMiddleware,
  preloadHeadersMiddleware,
  contentTypeMiddleware,
  staticSecurityHeaders,
  imageOptimizationHeaders
} from './middleware/staticAssets';

// Import routes
import workflowRoutes from './routes/workflows';
import webhookRoutes from './routes/webhooks';
import credentialsRoutes from './routes/credentials';
import { analyticsRouter as analyticsRoutes } from './routes/analytics';
import { authRouter as authRoutes } from './routes/auth';
import { executionRouter as executionsRoutes } from './routes/executions';
import { marketplaceRouter as marketplaceRoutes } from './routes/marketplace';
import { nodeRouter as nodesRoutes } from './routes/nodes';
import { templateRouter as templateRoutes } from './routes/templates';

// New routes from 30-hour session:
import queueRoutes from './routes/queue';
import auditRoutes from './routes/audit';
import ssoRoutes from './routes/sso';
import environmentRoutes from './routes/environment';
import gitRoutes from './routes/git';
import errorWorkflowRoutes from './routes/error-workflows';
import subworkflowRoutes from './routes/subworkflows';
import { startScheduler } from './services/scheduler';
import { startWorker } from './services/queue';
import { setupSockets } from './services/events';

export function createApp(): Application {
  const app = express();

  // Setup global error handlers for process
  setupErrorHandlers();

  // Trust proxy (needed for correct IP and rate-limit behind proxies)
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    }
  }));

  // CORS configuration (restrictive by default for credentials)
  const allowedOrigins = (process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000']).map(o => o.trim());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // non-browser / same-origin
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
  }));

  // Advanced compression middleware (Level 9, all responses)
  app.use(compressionMiddleware);

  // Track response sizes for monitoring
  app.use(trackResponseSize);

  // Static assets optimization
  app.use(staticAssetsMiddleware);
  app.use(preloadHeadersMiddleware);
  app.use(contentTypeMiddleware);
  app.use(staticSecurityHeaders);
  app.use(imageOptimizationHeaders);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request ID middleware
  app.use((req, res, next) => {
    const existing = req.headers['x-request-id'];
    const requestId = typeof existing === 'string' && existing.length > 0
      ? existing
      : (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    // Attach without mutating headers object used for signing, etc.
    (req as Request & { requestId?: string }).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });

  // Logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration,
        requestId: req.headers['x-request-id'],
        ip: req.ip
      });
    });
    
    next();
  });

  // Rate limiting
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiting to all routes
  app.use('/api/', limiter);

  // Strict rate limiting for auth routes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    skipSuccessfulRequests: true
  });

  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  // Health endpoints (no rate limiting)
  const healthHandler = (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    });
  };
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);
  app.get('/api/v1/health', healthHandler);

  // Readiness endpoints
  const readyHandler = async (_req: Request, res: Response) => {
    // TODO: add real dependency checks (DB/Redis) when wired
    res.json({ ready: true, timestamp: new Date().toISOString() });
  };
  app.get('/ready', readyHandler);
  app.get('/api/ready', readyHandler);

  // Metrics endpoint
  app.get('/metrics', asyncHandler(async (_req: Request, res: Response) => {
    const { getPrometheusMetrics } = await import('./services/metrics');
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(getPrometheusMetrics());
  }));

  // API Routes
  app.use('/api/workflows', workflowRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/credentials', credentialsRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/executions', executionsRoutes);
  app.use('/api/marketplace', marketplaceRoutes);
  app.use('/api/nodes', nodesRoutes);
  app.use('/api/templates', templateRoutes);

  // New routes from 30-hour session:
  app.use('/api/queue', queueRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/sso', ssoRoutes);
  app.use('/api/environments', environmentRoutes);
  app.use('/api/git', gitRoutes);
  app.use('/api/error-workflows', errorWorkflowRoutes);
  app.use('/api/subworkflows', subworkflowRoutes);

  // Static files (if needed)
  if (process.env.SERVE_STATIC === 'true') {
    app.use(express.static('public', {
      maxAge: '1d',
      etag: true,
      lastModified: true,
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));
  }

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(globalErrorHandler);

  // Start background scheduler (cron-like trigger)
  startScheduler();
  // Start queue worker (Redis or in-memory fallback)
  startWorker();

  return app;
}

/**
 * Start the server
 */
export function startServer(app: Application, port: number | string = 3000): void {
  const server = app.listen(port, () => {
    logger.info(`🚀 Server started on port ${port}`);
    logger.info(`📊 Health check: http://localhost:${port}/health`);
    logger.info(`📈 Metrics: http://localhost:${port}/metrics`);
    logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
  const gracefulShutdown = () => {
    logger.info('Received shutdown signal, closing server gracefully...');
    
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  // Setup WebSocket (Socket.IO) for runtime events
  setupSockets(server);
}

// Export for testing
export default createApp;

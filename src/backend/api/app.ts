/**
 * Express Application Setup
 * PLAN C - Server avec gestion d'erreurs globale
 */

import express, { Application, Request, Response } from 'express';
import crypto from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import {
  csrfTokenMiddleware,
  csrfValidationMiddleware,
  csrfTokenHandler
} from './middleware/csrf';
import { apiVersionMiddleware, API_VERSIONS } from './middleware/apiVersion';

// Prisma client for health checks
const prisma = new PrismaClient();

// Redis client for health checks (lazy initialization)
let redisClient: Redis | null = null;
function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
    });
  }
  return redisClient;
}
import {
  globalErrorHandler,
  notFoundHandler,
  setupErrorHandlers,
  asyncHandler
} from '../../middleware/globalErrorHandler';
import { errorTrackingMiddleware } from './middleware/errorTracking';
import { logger } from '../../services/SimpleLogger';
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
import { requestLogger } from './middleware/requestLogger';
import { requestTimeout } from './middleware/timeout';
import { deduplication } from './middleware/deduplication';
import { auditLogger } from './middleware/auditLogger';

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
import { usersRouter as usersRoutes } from './routes/users';
import oauthRoutes from './routes/oauth';

// New routes from 30-hour session:
import queueRoutes from './routes/queue';
import queueMetricsRoutes from './routes/queue-metrics';
import dlqRoutes from './routes/dlq';
import auditRoutes from './routes/audit';
import ssoRoutes from './routes/sso';
import environmentRoutes from './routes/environment';
import gitRoutes from './routes/git';
import errorWorkflowRoutes from './routes/error-workflows';
import subworkflowRoutes from './routes/subworkflows';
import apiKeysRoutes from './routes/api-keys';
import teamRoutes from './routes/teams';
import formsRoutes from './routes/forms';
import chatRoutes from './routes/chat';
import reviewsRoutes from './routes/reviews';
import secretScanningRoutes from './routes/secret-scanning';
import secretRemediationRoutes from './routes/secret-remediation';
import monitoringRoutes from './routes/monitoring';
import versionsRoutes from './routes/versions';
import approvalsRoutes from './routes/approvals';
import schedulesRoutes from './routes/schedules';
import { startScheduler } from './services/scheduler';
import { startWorker } from './services/queue';
import { setupSockets } from './services/events';
import { openApiSpec } from './docs/openapi';

export function createApp(): Application {
  const app = express();

  // Setup global error handlers for process
  setupErrorHandlers();

  // Trust proxy (needed for correct IP and rate-limit behind proxies)
  app.set('trust proxy', 1);

  // Security middleware - Comprehensive security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"]
      }
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true
  }));

  // Additional custom security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // CORS configuration (restrictive by default for credentials)
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002'
  ];
  const allowedOrigins = (process.env.CORS_ORIGIN?.split(',') || defaultOrigins).map(o => o.trim());

  // In development, allow all localhost ports
  const isDev = process.env.NODE_ENV !== 'production';

  app.use(cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g., curl, Postman)
      if (!origin) return callback(null, true);

      // In development, allow all localhost/127.0.0.1 origins
      if (isDev && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }

      // Check against allowed origins
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Log CORS rejection for debugging
      logger.warn('CORS request rejected', { origin, allowedOrigins: allowedOrigins.slice(0, 5) });
      return callback(new Error(`CORS not allowed for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Correlation-Id', 'X-API-Key', 'X-XSRF-TOKEN']
  }));

  // Cookie parser (required for CSRF token validation)
  app.use(cookieParser());

  // Advanced compression middleware (Level 6, 1KB threshold, optimized filter)
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

  // Structured request/response logging middleware (handles request ID and logging)
  app.use(requestLogger);

  // Request timeout middleware (prevents long-running requests from blocking the server)
  app.use(requestTimeout());

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

  // CSRF protection middleware
  // Set CSRF token cookie on every request
  app.use(csrfTokenMiddleware);

  // Validate CSRF token on state-changing requests (POST, PUT, DELETE, PATCH)
  // Skips GET, HEAD, OPTIONS and webhook/API-key authenticated requests
  app.use('/api/', csrfValidationMiddleware);

  // CSRF token refresh endpoint
  app.get('/api/csrf-token', csrfTokenHandler);

  // Request deduplication middleware (prevents duplicate submissions)
  app.use('/api/', deduplication);

  // API versioning middleware - extracts version from URL and sets response header
  app.use(apiVersionMiddleware);

  // Audit logging middleware - tracks sensitive operations for compliance
  // Must be after body parsing to capture request data
  app.use('/api/', auditLogger);

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
  app.get('/api/v2/health', healthHandler);

  // Readiness endpoints with real dependency checks
  const readyHandler = async (_req: Request, res: Response) => {
    const checks: {
      database: { status: 'up' | 'down'; latency?: number; error?: string };
      redis: { status: 'up' | 'down'; latency?: number; error?: string };
    } = {
      database: { status: 'down' },
      redis: { status: 'down' },
    };

    let allHealthy = true;

    // Check database connection
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'up',
        latency: Date.now() - dbStart,
      };
    } catch (error) {
      allHealthy = false;
      checks.database = {
        status: 'down',
        error: error instanceof Error ? error.message : 'Database connection failed',
      };
    }

    // Check Redis connection
    try {
      const redis = getRedisClient();
      const redisStart = Date.now();
      await redis.ping();
      checks.redis = {
        status: 'up',
        latency: Date.now() - redisStart,
      };
    } catch (error) {
      // Redis is optional, so we don't fail readiness
      checks.redis = {
        status: 'down',
        error: error instanceof Error ? error.message : 'Redis connection failed',
      };
      // Only fail if Redis is required
      if (process.env.REDIS_REQUIRED === 'true') {
        allHealthy = false;
      }
    }

    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json({
      ready: allHealthy,
      timestamp: new Date().toISOString(),
      checks,
    });
  };
  app.get('/ready', readyHandler);
  app.get('/api/ready', readyHandler);

  // Metrics endpoint
  app.get('/metrics', asyncHandler(async (_req: Request, res: Response) => {
    const { getPrometheusMetrics } = await import('./services/metrics');
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(getPrometheusMetrics());
  }));

  // OpenAPI/Swagger documentation endpoints
  // JSON spec endpoint
  app.get('/api/openapi.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(openApiSpec);
  });

  // Alternative paths for the spec
  app.get('/api/docs/openapi.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(openApiSpec);
  });

  app.get('/openapi.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(openApiSpec);
  });

  // Documentation info endpoint
  app.get('/api/docs', (_req: Request, res: Response) => {
    res.json({
      title: openApiSpec.info.title,
      version: openApiSpec.info.version,
      description: openApiSpec.info.description,
      endpoints: {
        spec: '/api/openapi.json',
        alternativeSpec: '/api/docs/openapi.json',
        swaggerUi: 'Use a Swagger UI client with the spec URL above',
        redoc: 'Use ReDoc with the spec URL above'
      },
      tags: openApiSpec.tags,
      pathCount: Object.keys(openApiSpec.paths).length,
      schemaCount: Object.keys(openApiSpec.components.schemas).length
    });
  });

  // Swagger UI HTML page (embedded)
  app.get('/api/docs/swagger', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${openApiSpec.info.title} - API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/api/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`);
  });

  // ReDoc HTML page (embedded)
  app.get('/api/docs/redoc', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${openApiSpec.info.title} - API Documentation</title>
  <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <redoc spec-url='/api/openapi.json'></redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>`);
  });

  // API Routes - Non-versioned paths (backward compatibility, defaults to v1)
  app.use('/api/workflows', workflowRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/credentials', credentialsRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/executions', executionsRoutes);
  app.use('/api/marketplace', marketplaceRoutes);
  app.use('/api/nodes', nodesRoutes);
  app.use('/api/templates', templateRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/oauth', oauthRoutes);

  // New routes from 30-hour session:
  app.use('/api/queue', queueRoutes);
  app.use('/api/queue-metrics', queueMetricsRoutes);
  app.use('/api/dlq', dlqRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/sso', ssoRoutes);
  app.use('/api/environments', environmentRoutes);
  app.use('/api/git', gitRoutes);
  app.use('/api/error-workflows', errorWorkflowRoutes);
  app.use('/api/subworkflows', subworkflowRoutes);
  app.use('/api/api-keys', apiKeysRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/forms', formsRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/reviews', reviewsRoutes);
  app.use('/api/security/secret-scanning', secretScanningRoutes);
  app.use('/api/security/remediation', secretRemediationRoutes);
  app.use('/api/monitoring', monitoringRoutes);
  app.use('/api/versions', versionsRoutes);
  app.use('/api/approvals', approvalsRoutes);
  app.use('/api/schedules', schedulesRoutes);

  // API Routes - v1 versioned paths (explicit v1 prefix)
  app.use('/api/v1/workflows', workflowRoutes);
  app.use('/api/v1/webhooks', webhookRoutes);
  app.use('/api/v1/credentials', credentialsRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/executions', executionsRoutes);
  app.use('/api/v1/marketplace', marketplaceRoutes);
  app.use('/api/v1/nodes', nodesRoutes);
  app.use('/api/v1/templates', templateRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/oauth', oauthRoutes);
  app.use('/api/v1/queue', queueRoutes);
  app.use('/api/v1/queue-metrics', queueMetricsRoutes);
  app.use('/api/v1/dlq', dlqRoutes);
  app.use('/api/v1/audit', auditRoutes);
  app.use('/api/v1/sso', ssoRoutes);
  app.use('/api/v1/environments', environmentRoutes);
  app.use('/api/v1/git', gitRoutes);
  app.use('/api/v1/error-workflows', errorWorkflowRoutes);
  app.use('/api/v1/subworkflows', subworkflowRoutes);
  app.use('/api/v1/api-keys', apiKeysRoutes);
  app.use('/api/v1/teams', teamRoutes);
  app.use('/api/v1/forms', formsRoutes);
  app.use('/api/v1/chat', chatRoutes);
  app.use('/api/v1/reviews', reviewsRoutes);
  app.use('/api/v1/security/secret-scanning', secretScanningRoutes);
  app.use('/api/v1/security/remediation', secretRemediationRoutes);

  // API Routes - v2 versioned paths (for future API versions)
  // Currently v2 routes mirror v1 - specific v2 implementations can be added here
  app.use('/api/v2/workflows', workflowRoutes);
  app.use('/api/v2/webhooks', webhookRoutes);
  app.use('/api/v2/credentials', credentialsRoutes);
  app.use('/api/v2/analytics', analyticsRoutes);
  app.use('/api/v2/auth', authRoutes);
  app.use('/api/v2/executions', executionsRoutes);
  app.use('/api/v2/marketplace', marketplaceRoutes);
  app.use('/api/v2/nodes', nodesRoutes);
  app.use('/api/v2/templates', templateRoutes);
  app.use('/api/v2/users', usersRoutes);
  app.use('/api/v2/oauth', oauthRoutes);
  app.use('/api/v2/queue', queueRoutes);
  app.use('/api/v2/queue-metrics', queueMetricsRoutes);
  app.use('/api/v2/dlq', dlqRoutes);
  app.use('/api/v2/audit', auditRoutes);
  app.use('/api/v2/sso', ssoRoutes);
  app.use('/api/v2/environments', environmentRoutes);
  app.use('/api/v2/git', gitRoutes);
  app.use('/api/v2/error-workflows', errorWorkflowRoutes);
  app.use('/api/v2/subworkflows', subworkflowRoutes);
  app.use('/api/v2/api-keys', apiKeysRoutes);
  app.use('/api/v2/teams', teamRoutes);
  app.use('/api/v2/forms', formsRoutes);
  app.use('/api/v2/chat', chatRoutes);
  app.use('/api/v2/reviews', reviewsRoutes);
  app.use('/api/v2/security/secret-scanning', secretScanningRoutes);
  app.use('/api/v2/security/remediation', secretRemediationRoutes);

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

  // Global error handler
  app.use(globalErrorHandler);

  // Error tracking middleware (must be last for better error observability)
  app.use(errorTrackingMiddleware);

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
  const startTime = Date.now();

  const server = app.listen(port, () => {
    const startupDuration = Date.now() - startTime;

    logger.info('🚀 Server started', {
      port,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      startupDuration: `${startupDuration}ms`,
      pid: process.pid,
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    });

    logger.info(`📊 Health check: http://localhost:${port}/health`);
    logger.info(`📈 Metrics: http://localhost:${port}/metrics`);
    logger.info(`📖 API Docs: http://localhost:${port}/api/docs`);
    logger.info(`📋 OpenAPI Spec: http://localhost:${port}/api/openapi.json`);
    logger.info(`🔷 Swagger UI: http://localhost:${port}/api/docs/swagger`);
    logger.info(`📕 ReDoc: http://localhost:${port}/api/docs/redoc`);

    // Start scheduler for cron/interval workflow triggers
    import('../../backend/services/SchedulerService').then(({ schedulerService }) => {
      schedulerService.start().catch(err => logger.warn('Scheduler start deferred', { error: String(err) }));
    }).catch(() => {});

    // Log configuration warnings
    if (!process.env.JWT_SECRET) {
      logger.warn('⚠️ JWT_SECRET not configured - using random secret (not suitable for production)');
    }
    if (!process.env.DATABASE_URL) {
      logger.warn('⚠️ DATABASE_URL not configured - using in-memory storage');
    }
    if (!process.env.REDIS_URL) {
      logger.warn('⚠️ REDIS_URL not configured - using in-memory queue');
    }
  });

  // Graceful shutdown
  const gracefulShutdown = () => {
    logger.info('Received shutdown signal, closing server gracefully...');

    // Shutdown scheduler
    import('../../backend/services/SchedulerService').then(({ schedulerService }) => {
      schedulerService.shutdown().catch(() => {});
    }).catch(() => {});

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

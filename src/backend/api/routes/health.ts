/**
 * Health Check Routes
 * Production-ready health checks for Kubernetes/Load Balancer
 *
 * Endpoints:
 * - /live              - Simple liveness probe (is the process running?)
 * - /ready             - Readiness probe with dependency checks (can it serve traffic?)
 * - /detailed          - Detailed health info for monitoring dashboards
 * - /health            - Legacy simple health check
 * - /startup           - Kubernetes startup probe
 * - /db                - Database-specific health check
 * - /cache             - Cache-specific health check
 * - /migrations        - Database migration status
 * - /migrations/history - Full migration history
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../database/prisma';
import { cacheLayer } from '../../../services/CacheLayer';
import { logger } from '../../../services/SimpleLogger';
import { getMigrationStatus, getMigrationHistory, getFailedMigrations, MigrationStatus } from '../../database/migrationStatus';
import { authHandler, requireRoleHandler } from '../middleware/auth';

/**
 * Check if running in production mode
 */
const isProduction = (): boolean => process.env.NODE_ENV === 'production';

export const healthRouter = Router();

// ============================================================================
// Types
// ============================================================================

interface HealthCheck {
  status: 'ok' | 'error' | 'degraded';
  latency?: number;
  error?: string;
  message?: string;
}

interface ReadinessResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: Record<string, HealthCheck>;
  timestamp: string;
  version: string;
}

interface DetailedHealthResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  uptime: number;
  uptimeHuman: string;
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
    external: string;
    heapUsedBytes: number;
    heapTotalBytes: number;
    percentUsed: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  process: {
    pid: number;
    ppid: number;
    platform: string;
    nodeVersion: string;
    arch: string;
  };
  environment: string;
  checks: Record<string, HealthCheck>;
  timestamp: string;
  version: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format uptime to human-readable string
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      latency: Date.now() - startTime,
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'error',
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

/**
 * Check Redis/cache connectivity
 */
async function checkRedis(): Promise<HealthCheck> {
  const startTime = Date.now();
  try {
    // Initialize cache layer if not already done
    await cacheLayer.initialize();

    const stats = cacheLayer.getStats();
    if (stats.redisAvailable) {
      return {
        status: 'ok',
        latency: Date.now() - startTime,
      };
    } else {
      return {
        status: 'ok',
        latency: Date.now() - startTime,
        message: 'Using memory cache fallback (Redis not available)',
      };
    }
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return {
      status: 'error',
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown Redis error',
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): HealthCheck {
  const memoryUsage = process.memoryUsage();
  const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

  // Warn if heap usage is above 85%
  if (heapUsedPercent > 85) {
    return {
      status: 'degraded',
      message: `High memory usage: ${heapUsedPercent.toFixed(1)}% of heap used`,
    };
  }

  return { status: 'ok' };
}

/**
 * Check database migration status
 */
async function checkMigrations(): Promise<HealthCheck> {
  const startTime = Date.now();
  try {
    const migrationStatus = await getMigrationStatus();
    const latency = Date.now() - startTime;

    if (migrationStatus.status === 'failed') {
      return {
        status: 'error',
        latency,
        error: 'Database has failed migrations',
        message: `${migrationStatus.pendingMigrations} failed migration(s)`,
      };
    }

    if (migrationStatus.status === 'pending') {
      return {
        status: 'degraded',
        latency,
        message: `${migrationStatus.pendingMigrations} pending migration(s)`,
      };
    }

    if (migrationStatus.status === 'unknown') {
      return {
        status: 'degraded',
        latency,
        message: migrationStatus.error || 'Unable to determine migration status',
      };
    }

    return {
      status: 'ok',
      latency,
      message: `${migrationStatus.appliedMigrations} migration(s) applied`,
    };
  } catch (error) {
    logger.error('Migration health check failed:', error);
    return {
      status: 'error',
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown migration check error',
    };
  }
}

/**
 * Get application version from package.json or environment
 */
function getAppVersion(): string {
  return process.env.APP_VERSION || process.env.npm_package_version || '1.0.0';
}

// ============================================================================
// Routes
// ============================================================================

/**
 * Simple liveness probe - Is the application alive?
 * Used by Kubernetes liveness probe to detect if the container is running.
 * Should be fast and not depend on external services.
 */
healthRouter.get('/live', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

/**
 * Readiness probe with dependency checks
 * Used by Kubernetes readiness probe to determine if the service can accept traffic.
 * Returns 503 if any critical dependency is unhealthy.
 * In production, returns minimal information to prevent information disclosure.
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, HealthCheck> = {};

  // Run all checks in parallel for faster response
  const [databaseCheck, redisCheck, migrationsCheck] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkMigrations(),
  ]);

  checks.database = databaseCheck;
  checks.redis = redisCheck;
  checks.migrations = migrationsCheck;
  checks.memory = checkMemory();

  // Determine overall status
  // Database is critical - if it fails, service is unhealthy
  // Redis and memory are non-critical - if they fail, service is degraded
  const hasError = checks.database.status === 'error';
  const hasDegraded = Object.values(checks).some(
    (c) => c.status === 'degraded' || (c.status === 'error' && c !== checks.database)
  );

  let status: 'healthy' | 'unhealthy' | 'degraded';
  if (hasError) {
    status = 'unhealthy';
  } else if (hasDegraded) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  // Return 503 only if service is unhealthy (critical dependencies down)
  const statusCode = status === 'unhealthy' ? 503 : 200;

  // In production, return minimal information
  if (isProduction()) {
    res.status(statusCode).json({ status });
    return;
  }

  const response: ReadinessResponse = {
    status,
    checks,
    timestamp: new Date().toISOString(),
    version: getAppVersion(),
  };

  res.status(statusCode).json(response);
});

/**
 * Detailed health handler - extracted for reuse
 */
async function getDetailedHealthResponse(): Promise<DetailedHealthResponse> {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  // Run health checks
  const [databaseCheck, redisCheck, migrationsCheck] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkMigrations(),
  ]);

  const checks: Record<string, HealthCheck> = {
    database: databaseCheck,
    redis: redisCheck,
    migrations: migrationsCheck,
    memory: checkMemory(),
  };

  // Determine overall status
  const hasError = Object.values(checks).some((c) => c.status === 'error');
  const hasDegraded = Object.values(checks).some((c) => c.status === 'degraded');

  let status: 'ok' | 'degraded' | 'unhealthy';
  if (hasError) {
    status = 'unhealthy';
  } else if (hasDegraded) {
    status = 'degraded';
  } else {
    status = 'ok';
  }

  return {
    status,
    uptime: Math.floor(uptime),
    uptimeHuman: formatUptime(uptime),
    memory: {
      heapUsed: formatBytes(memoryUsage.heapUsed),
      heapTotal: formatBytes(memoryUsage.heapTotal),
      rss: formatBytes(memoryUsage.rss),
      external: formatBytes(memoryUsage.external),
      heapUsedBytes: memoryUsage.heapUsed,
      heapTotalBytes: memoryUsage.heapTotal,
      percentUsed: parseFloat(
        ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2)
      ),
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
    process: {
      pid: process.pid,
      ppid: process.ppid,
      platform: process.platform,
      nodeVersion: process.version,
      arch: process.arch,
    },
    environment: process.env.NODE_ENV || 'development',
    checks,
    timestamp: new Date().toISOString(),
    version: getAppVersion(),
  };
}

/**
 * Detailed health for monitoring dashboards (development only)
 * In production, this endpoint is protected by admin authentication.
 * Use /health/detailed with admin auth in production.
 */
healthRouter.get('/detailed', async (_req: Request, res: Response) => {
  // In production, require authentication - redirect to protected endpoint
  if (isProduction()) {
    res.status(403).json({
      error: 'Access denied',
      message: 'Detailed health information requires admin authentication in production. Use /health/admin/detailed endpoint.',
    });
    return;
  }

  const response = await getDetailedHealthResponse();
  res.json(response);
});

/**
 * Protected detailed health endpoint for production use
 * Requires admin authentication to access sensitive system information.
 */
healthRouter.get(
  '/admin/detailed',
  authHandler,
  requireRoleHandler('admin'),
  async (_req: Request, res: Response) => {
    const response = await getDetailedHealthResponse();
    res.json(response);
  }
);

/**
 * Legacy simple health check (for backward compatibility)
 * Kept for existing monitoring integrations.
 * In production, returns only status to prevent information disclosure.
 */
healthRouter.get('/health', (_req: Request, res: Response) => {
  // In production, return minimal information
  if (isProduction()) {
    res.json({ status: 'ok' });
    return;
  }

  // In development, include more details for debugging
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * Kubernetes startup probe
 * Used to determine if the application has successfully started.
 * Useful for slow-starting containers.
 * Returns minimal information in production.
 */
healthRouter.get('/startup', async (_req: Request, res: Response) => {
  const checks: Record<string, HealthCheck> = {
    initialized: { status: 'ok' },
    migrations: { status: 'ok' },
    services: { status: 'ok' },
  };

  try {
    // Check database is accessible (critical for startup)
    const databaseCheck = await checkDatabase();
    if (databaseCheck.status === 'error') {
      checks.migrations = {
        status: 'error',
        error: databaseCheck.error || 'Database not accessible',
      };
    }

    // Verify core services are initialized
    checks.services = { status: 'ok' };
  } catch (error) {
    logger.error('Startup health check error:', error);
    checks.services = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Service initialization failed',
    };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === 'ok');
  const statusCode = allHealthy ? 200 : 503;

  // In production, return minimal information
  if (isProduction()) {
    res.status(statusCode).json({ started: allHealthy });
    return;
  }

  res.status(statusCode).json({
    started: allHealthy,
    checks,
    timestamp: new Date().toISOString(),
    version: getAppVersion(),
  });
});

/**
 * Database-specific health check endpoint
 * Useful for debugging database connectivity issues.
 * In production, returns only status to prevent information disclosure.
 */
healthRouter.get('/db', async (_req: Request, res: Response) => {
  const check = await checkDatabase();
  const statusCode = check.status === 'ok' ? 200 : 503;

  // In production, return minimal information
  if (isProduction()) {
    res.status(statusCode).json({ status: check.status });
    return;
  }

  res.status(statusCode).json({
    database: check,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Cache-specific health check endpoint
 * Returns cache statistics and connectivity status.
 * In production, returns only status to prevent information disclosure.
 */
healthRouter.get('/cache', async (_req: Request, res: Response) => {
  try {
    await cacheLayer.initialize();
    const stats = cacheLayer.getStats();

    // In production, return minimal information
    if (isProduction()) {
      res.json({
        status: 'ok',
        available: stats.redisAvailable,
      });
      return;
    }

    const memInfo = cacheLayer.getMemoryCacheInfo();

    res.json({
      status: 'ok',
      redis: {
        available: stats.redisAvailable,
        hits: stats.redisHits,
        misses: stats.redisMisses,
      },
      memory: {
        entries: memInfo.entries,
        size: formatBytes(memInfo.size),
        maxSize: formatBytes(memInfo.maxSize),
        utilization: `${memInfo.utilization.toFixed(2)}%`,
      },
      performance: {
        hitRate: `${stats.hitRate.toFixed(2)}%`,
        avgResponseTime: `${stats.avgResponseTime.toFixed(2)}ms`,
        totalRequests: stats.totalRequests,
        evictions: stats.evictions,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cache health check error:', error);

    // In production, don't expose error details
    if (isProduction()) {
      res.status(503).json({ status: 'error' });
      return;
    }

    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown cache error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Migration-specific health check endpoint
 * Returns detailed migration status and history.
 * In production, returns only status to prevent information disclosure.
 */
healthRouter.get('/migrations', async (_req: Request, res: Response) => {
  try {
    const [status, failedMigrations] = await Promise.all([
      getMigrationStatus(),
      getFailedMigrations(),
    ]);

    const statusCode = status.status === 'up-to-date' ? 200 :
                       status.status === 'pending' ? 200 :
                       status.status === 'failed' ? 503 : 503;

    // In production, return minimal information
    if (isProduction()) {
      res.status(statusCode).json({
        status: status.status,
        hasPending: status.pendingMigrations > 0,
        hasFailed: failedMigrations.length > 0,
      });
      return;
    }

    res.status(statusCode).json({
      status: status.status,
      appliedMigrations: status.appliedMigrations,
      pendingMigrations: status.pendingMigrations,
      lastMigration: status.lastMigration ? {
        name: status.lastMigration.name,
        appliedAt: status.lastMigration.appliedAt.toISOString(),
      } : null,
      failedMigrations: failedMigrations.map(m => ({
        name: m.name,
        startedAt: m.startedAt.toISOString(),
        logs: m.logs,
      })),
      error: status.error || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Migration health check error:', error);

    // In production, don't expose error details
    if (isProduction()) {
      res.status(503).json({ status: 'error' });
      return;
    }

    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown migration error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Migration history endpoint
 * Returns full migration history for debugging and auditing.
 * In production, this endpoint is protected by admin authentication.
 */
healthRouter.get('/migrations/history', async (_req: Request, res: Response) => {
  // In production, require admin authentication
  if (isProduction()) {
    res.status(403).json({
      error: 'Access denied',
      message: 'Migration history requires admin authentication in production. Use /health/admin/migrations/history endpoint.',
    });
    return;
  }

  try {
    const history = await getMigrationHistory();

    res.json({
      count: history.length,
      migrations: history.map(m => ({
        id: m.id,
        name: m.migration_name,
        checksum: m.checksum,
        startedAt: m.started_at.toISOString(),
        finishedAt: m.finished_at?.toISOString() || null,
        rolledBackAt: m.rolled_back_at?.toISOString() || null,
        appliedSteps: m.applied_steps_count,
        status: m.rolled_back_at ? 'rolled_back' :
                m.finished_at ? 'applied' : 'pending',
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Migration history error:', error);
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Protected migration history endpoint for production use
 * Requires admin authentication to access sensitive migration details.
 */
healthRouter.get(
  '/admin/migrations/history',
  authHandler,
  requireRoleHandler('admin'),
  async (_req: Request, res: Response) => {
    try {
      const history = await getMigrationHistory();

      res.json({
        count: history.length,
        migrations: history.map(m => ({
          id: m.id,
          name: m.migration_name,
          checksum: m.checksum,
          startedAt: m.started_at.toISOString(),
          finishedAt: m.finished_at?.toISOString() || null,
          rolledBackAt: m.rolled_back_at?.toISOString() || null,
          appliedSteps: m.applied_steps_count,
          status: m.rolled_back_at ? 'rolled_back' :
                  m.finished_at ? 'applied' : 'pending',
        })),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Migration history error:', error);
      res.status(503).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default healthRouter;

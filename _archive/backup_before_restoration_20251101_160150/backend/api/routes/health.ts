/**
 * Health Check Routes
 * Production-ready health checks for Kubernetes/Load Balancer
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../../services/LoggingService';

export const healthRouter = Router();

// Simple health check (for basic uptime monitoring)
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Liveness probe - Is the application alive?
healthRouter.get('/health/live', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Readiness probe - Is the application ready to serve traffic?
healthRouter.get('/health/ready', async (_req: Request, res: Response) => {
  const checks = {
    database: { status: 'unknown' as 'ok' | 'error' | 'unknown', message: '', latency: 0 },
    redis: { status: 'unknown' as 'ok' | 'error' | 'unknown', message: '', latency: 0 },
    overall: false
  };

  // Check Database
  try {
    const startDb = Date.now();
    const { PrismaClient } = await import('@prisma/client').catch(() => ({ PrismaClient: null }));

    if (PrismaClient) {
      const prisma = new PrismaClient();
      try {
        await prisma.$queryRaw`SELECT 1`;
        checks.database.status = 'ok';
        checks.database.latency = Date.now() - startDb;
        await prisma.$disconnect();
      } catch (dbError: any) {
        checks.database.status = 'error';
        checks.database.message = dbError.message || 'Database connection failed';
        logger.error('Database health check failed:', dbError);
        try {
          await prisma.$disconnect();
        } catch (e) {
          // Ignore
        }
      }
    } else {
      checks.database.status = 'ok';
      checks.database.message = 'Prisma not configured (development mode)';
    }
  } catch (error: any) {
    checks.database.status = 'error';
    checks.database.message = error.message || 'Database check failed';
    logger.error('Database health check error:', error);
  }

  // Check Redis
  try {
    const startRedis = Date.now();
    const cacheService = await import('../../../services/CacheService')
      .then(m => m.default)
      .catch(() => null);

    if (cacheService) {
      const stats = await cacheService.getStats().catch(() => null);
      if (stats && stats.redisAvailable) {
        checks.redis.status = 'ok';
        checks.redis.latency = Date.now() - startRedis;
      } else {
        checks.redis.status = 'ok';
        checks.redis.message = 'Using memory cache fallback';
      }
    } else {
      checks.redis.status = 'ok';
      checks.redis.message = 'Cache not configured (development mode)';
    }
  } catch (error: any) {
    checks.redis.status = 'error';
    checks.redis.message = error.message || 'Redis check failed';
    logger.error('Redis health check error:', error);
  }

  // Overall readiness
  checks.overall = checks.database.status === 'ok' && checks.redis.status === 'ok';

  const statusCode = checks.overall ? 200 : 503;
  res.status(statusCode).json({
    ready: checks.overall,
    checks,
    timestamp: new Date().toISOString()
  });
});

// Startup probe
healthRouter.get('/health/startup', async (_req: Request, res: Response) => {
  const checks = {
    initialized: true,
    migrations: 'unknown' as 'ok' | 'pending' | 'error' | 'unknown',
    services: 'unknown' as 'ok' | 'error' | 'unknown'
  };

  try {
    checks.services = 'ok';

    try {
      const { PrismaClient } = await import('@prisma/client').catch(() => ({ PrismaClient: null }));
      if (PrismaClient) {
        const prisma = new PrismaClient();
        try {
          await prisma.$queryRaw`SELECT 1`;
          checks.migrations = 'ok';
          await prisma.$disconnect();
        } catch (e) {
          checks.migrations = 'error';
          try {
            await prisma.$disconnect();
          } catch (disconnectError) {
            // Ignore
          }
        }
      } else {
        checks.migrations = 'ok';
      }
    } catch (error) {
      checks.migrations = 'unknown';
    }
  } catch (error) {
    checks.services = 'error';
    logger.error('Startup health check error:', error);
  }

  const ready = checks.initialized && checks.services === 'ok';
  const statusCode = ready ? 200 : 503;

  res.status(statusCode).json({
    started: ready,
    checks,
    timestamp: new Date().toISOString()
  });
});

export default healthRouter;

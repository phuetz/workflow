/**
 * Advanced Rate Limiting Middleware
 * Redis-backed rate limiting with tier-based limits and sliding windows
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
// import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { logger } from '../../../services/SimpleLogger';

// Redis client for rate limiting
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  lazyConnect: true
});

// Handle Redis connection
let _redisAvailable = false;

redisClient.on('connect', () => {
  _redisAvailable = true;
  logger.info('Rate limiter Redis connected');
});

redisClient.on('error', (err) => {
  _redisAvailable = false;
  logger.warn('Rate limiter Redis error, falling back to memory store:', err.message);
});

// Try to connect
redisClient.connect().catch(err => {
  logger.warn('Rate limiter Redis connection failed:', err.message);
});

/**
 * Tier-based rate limits
 */
export enum UserTier {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
  ADMIN = 'admin'
}

interface TierLimits {
  requests: number;
  windowMs: number;
  burstLimit?: number;
}

const TIER_LIMITS: Record<UserTier, TierLimits> = {
  [UserTier.FREE]: {
    requests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    burstLimit: 20 // Max 20 requests per minute
  },
  [UserTier.PRO]: {
    requests: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
    burstLimit: 100 // Max 100 requests per minute
  },
  [UserTier.ENTERPRISE]: {
    requests: 10000,
    windowMs: 60 * 60 * 1000, // 1 hour
    burstLimit: 500 // Max 500 requests per minute
  },
  [UserTier.ADMIN]: {
    requests: 100000,
    windowMs: 60 * 60 * 1000, // 1 hour
    burstLimit: 1000 // Max 1000 requests per minute
  }
};

/**
 * Create a Redis store or fallback to memory store
 */
function createStore(_prefix: string) {
  // Redis store disabled until rate-limit-redis package is installed
  // if (redisAvailable) {
  //   return new RedisStore({
  //     client: redisClient,
  //     prefix: `rl:${prefix}:`,
  //     sendCommand: (...args: string[]) => redisClient.call(...args)
  //   });
  // }
  return undefined; // Use default memory store
}

/**
 * Get user tier from request
 */
function getUserTier(req: Request): UserTier {
  const user = (req as Request & { user?: { id?: string; role?: string; tier?: UserTier } }).user;

  if (!user) return UserTier.FREE;

  // Check if admin
  if (user.role === 'admin' || user.role === 'ADMIN') {
    return UserTier.ADMIN;
  }

  // Check tier from user object
  return (user.tier as UserTier) || UserTier.FREE;
}

/**
 * Generate rate limit key
 */
function generateKey(req: Request, prefix: string): string {
  const user = (req as Request & { user?: { id?: string; role?: string; tier?: UserTier } }).user;
  const userId = user?.id || 'anonymous';
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // Combine user ID and IP for better security
  return `${prefix}:${userId}:${ip}`;
}

/**
 * Standard handler for rate limit exceeded
 */
const rateLimitHandler = (req: Request, res: Response) => {
  const user = (req as Request & { user?: { id?: string; role?: string; tier?: UserTier } }).user;
  const tier = getUserTier(req);

  logger.warn('Rate limit exceeded', {
    userId: user?.id,
    ip: req.ip,
    path: req.path,
    tier
  });

  res.status(429).json({
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
    tier,
    retryAfter: res.getHeader('Retry-After')
  });
};

/**
 * Skip rate limiting for certain conditions
 */
const skipRateLimit = (req: Request): boolean => {
  // Skip for health checks
  if (req.path.startsWith('/health') || req.path.startsWith('/metrics')) {
    return true;
  }

  // Skip for admin users (optional)
  const user = (req as Request & { user?: { id?: string; role?: string; tier?: UserTier } }).user;
  if (user?.role === 'ADMIN' && process.env.SKIP_RATE_LIMIT_FOR_ADMIN === 'true') {
    return true;
  }

  return false;
};

/**
 * API Rate Limiter - General API endpoints
 */
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  store: createStore('api'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: async (req) => {
    const tier = getUserTier(req);
    return TIER_LIMITS[tier].requests / 4; // Quarter of hourly limit per 15 min
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  keyGenerator: (req) => generateKey(req, 'api'),
  handler: rateLimitHandler,
  message: 'Too many API requests, please try again later.'
});

/**
 * Auth Rate Limiter - Login/Register endpoints
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  store: createStore('auth'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use email from body for more accurate tracking
    const email = req.body?.email || 'unknown';
    const ip = req.ip || 'unknown';
    return `auth:${email}:${ip}`;
  },
  handler: rateLimitHandler,
  message: 'Too many authentication attempts, please try again later.'
});

/**
 * Webhook Rate Limiter - Higher limits for webhooks
 */
export const webhookLimiter: RateLimitRequestHandler = rateLimit({
  store: createStore('webhook'),
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 webhooks per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  keyGenerator: (req) => {
    const webhookId = req.params.webhookId || req.body?.webhookId || 'unknown';
    return `webhook:${webhookId}`;
  },
  handler: rateLimitHandler,
  message: 'Webhook rate limit exceeded.'
});

/**
 * Execution Rate Limiter - Workflow executions
 */
export const executionLimiter: RateLimitRequestHandler = rateLimit({
  store: createStore('execution'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: async (req) => {
    const tier = getUserTier(req);
    // Different execution limits per tier
    const limits = {
      [UserTier.FREE]: 50,
      [UserTier.PRO]: 500,
      [UserTier.ENTERPRISE]: 5000,
      [UserTier.ADMIN]: 50000
    };
    return limits[tier];
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  keyGenerator: (req) => generateKey(req, 'execution'),
  handler: (req, res) => {
    const tier = getUserTier(req);
    res.status(429).json({
      error: 'Execution Limit Exceeded',
      message: `You have reached your ${tier} tier execution limit.`,
      tier,
      upgradeUrl: '/pricing'
    });
  }
});

/**
 * Burst Protection - Prevents rapid fire requests
 */
export const burstLimiter: RateLimitRequestHandler = rateLimit({
  store: createStore('burst'),
  windowMs: 60 * 1000, // 1 minute
  max: async (req) => {
    const tier = getUserTier(req);
    return TIER_LIMITS[tier].burstLimit || 20;
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  keyGenerator: (req) => generateKey(req, 'burst'),
  handler: rateLimitHandler,
  message: 'Too many requests in short time. Please slow down.'
});

/**
 * Upload Rate Limiter - File uploads
 */
export const uploadLimiter: RateLimitRequestHandler = rateLimit({
  store: createStore('upload'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: async (req) => {
    const tier = getUserTier(req);
    const limits = {
      [UserTier.FREE]: 10,
      [UserTier.PRO]: 100,
      [UserTier.ENTERPRISE]: 1000,
      [UserTier.ADMIN]: 10000
    };
    return limits[tier];
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  keyGenerator: (req) => generateKey(req, 'upload'),
  handler: rateLimitHandler,
  message: 'Upload limit exceeded for your tier.'
});

/**
 * Composite Rate Limiter - Applies multiple limits
 */
export function compositeRateLimiter(...limiters: RateLimitRequestHandler[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    let index = 0;

    const runNext = (err?: Error | string) => {
      if (err) return next(err as Error);
      if (index >= limiters.length) return next();

      const limiter = limiters[index++];
      limiter(req, res, runNext as NextFunction);
    };

    runNext();
  };
}

/**
 * Adaptive Rate Limiter - Adjusts based on system load
 */
export function adaptiveRateLimiter(baseMax: number) {
  return rateLimit({
    store: createStore('adaptive'),
    windowMs: 60 * 1000, // 1 minute
    max: async () => {
      // Reduce limit if system is under heavy load
      const usage = process.memoryUsage();
      const heapUsedPercent = usage.heapUsed / usage.heapTotal;

      if (heapUsedPercent > 0.9) {
        return Math.floor(baseMax * 0.5); // 50% reduction
      } else if (heapUsedPercent > 0.7) {
        return Math.floor(baseMax * 0.75); // 25% reduction
      }

      return baseMax;
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler
  });
}

/**
 * Tier-based middleware - Apply different limits based on user tier
 */
export function tierBasedLimiter(limits: Partial<Record<UserTier, number>>) {
  return rateLimit({
    store: createStore('tier'),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: async (req) => {
      const tier = getUserTier(req);
      return limits[tier] || limits[UserTier.FREE] || 100;
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipRateLimit,
    keyGenerator: (req) => generateKey(req, 'tier'),
    handler: rateLimitHandler
  });
}

/**
 * Cleanup function for graceful shutdown
 */
export async function cleanupRateLimiter(): Promise<void> {
  try {
    await redisClient.quit();
    logger.info('Rate limiter Redis connection closed');
  } catch (error) {
    logger.error('Error closing rate limiter Redis connection:', error);
  }
}

// Export Redis client for direct access if needed
export { redisClient as rateLimiterRedis };

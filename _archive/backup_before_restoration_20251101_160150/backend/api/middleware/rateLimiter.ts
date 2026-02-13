/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse with configurable rate limits
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../services/LoggingService';
// import { RateLimiter } from '../../../utils/security';

export interface RateLimitOptions {
  windowMs?: number;        // Time window in milliseconds
  max?: number;             // Max requests per window
  message?: string;         // Error message when rate limit exceeded
  skipSuccessfulRequests?: boolean;  // Don't count successful requests
  skipFailedRequests?: boolean;      // Don't count failed requests
  keyGenerator?: (req: Request) => string;  // Custom key generator
  handler?: (req: Request, res: Response) => void;  // Custom handler
  skip?: (req: Request) => boolean;  // Skip certain requests
  onLimitReached?: (req: Request, res: Response) => void;  // Callback when limit reached
  _message?: string;  // Internal message property
}

interface RateLimitStore {
  hits: number;
  resetTime: number;
}

/**
 * Create a rate limiting middleware
 */
export function createRateLimiter(options: RateLimitOptions = {}) {
  const {
    windowMs = 60 * 1000,  // 1 minute default
    max = 100,             // 100 requests per window default
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = defaultKeyGenerator,
    handler = defaultHandler,
    skip,
    onLimitReached
  } = options;

  // In-memory store (use Redis in production)
  const store = new Map<string, RateLimitStore>();

  // Cleanup old entries periodically
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of store.entries()) {
      if (now > data.resetTime) {
        store.delete(key);
      }
    }
  }, windowMs);

  // Middleware function
  const middleware = (req: Request, res: Response, next: NextFunction) => {
    // Check if should skip
    if (skip && skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    let data = store.get(key);

    // Get or create store entry
    if (!data || now > data.resetTime) {
      data = {
        hits: 0,
        resetTime: now + windowMs
      };
      store.set(key, data);
    }

    // Increment hit count
    data.hits++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - data.hits).toString());
    res.setHeader('X-RateLimit-Reset', new Date(data.resetTime).toISOString());

    // Check if limit exceeded
    if (data.hits > max) {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        key,
        hits: data.hits,
        limit: max
      });

      // Set retry after header
      const retryAfter = Math.ceil((data.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());

      // Call callback if provided
      if (onLimitReached) {
        onLimitReached(req, res);
      }

      // Use custom handler
      return handler(req, res);
    }

    // Track response to potentially not count it
    if (skipSuccessfulRequests || skipFailedRequests) {
      const originalSend = res.send;
      res.send = function(chunk: unknown) {
        const statusCode = res.statusCode;
        // Decrement count based on response status
        if ((skipSuccessfulRequests && statusCode < 400) ||
            (skipFailedRequests && statusCode >= 400)) {
          data!.hits--;
        }

        return originalSend.call(this, chunk);
      };
    }

    next();
  };

  // Attach cleanup function
  (middleware as unknown as { cleanup: () => void }).cleanup = () => {
    clearInterval(cleanupInterval);
    store.clear();
  };

  return middleware;
}

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(req: Request): string {
  // Use x-forwarded-for if behind proxy, otherwise use IP
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Default rate limit exceeded handler
 */
function defaultHandler(req: Request, res: Response): void {
  res.status(429).json({
    error: 'Too Many Requests',
    message: 'Too many requests, please try again later.',
    retryAfter: res.getHeader('Retry-After')
  });
}

/**
 * Pre-configured rate limiters for common use cases
 */

// Strict rate limiter for authentication endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 attempts per window
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,  // Only count failed attempts
  onLimitReached: (req, _res) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    logger.error('Authentication rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
  }
});

// Standard API rate limiter
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,             // 100 requests per minute
  message: 'API rate limit exceeded.',
  keyGenerator: (req) => {
    // Use API key if available, otherwise IP
    const apiKey = req.headers['x-api-key'] as string | undefined;
    return apiKey || defaultKeyGenerator(req);
  }
});

// Workflow execution rate limiter
export const workflowRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,              // 10 workflow executions per minute
  message: 'Workflow execution rate limit exceeded.',
  keyGenerator: (req) => {
    // Rate limit per user
    const userId = (req as Request & { user?: { id?: string } }).user?.id;
    return userId ? `user:${userId}` : defaultKeyGenerator(req);
  }
});

// File upload rate limiter
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 50,                   // 50 uploads per hour
  message: 'Upload rate limit exceeded.',
  skip: (req) => {
    // Skip if no file upload
    return !req.headers['content-type']?.includes('multipart/form-data');
  }
});

// Create custom rate limiter with user-based limits
export function createUserBasedRateLimiter(
  limits: { default: number; premium: number; admin: number },
  windowMs = 60 * 1000
) {
  return createRateLimiter({
    windowMs,
    max: limits.default,
    keyGenerator: (req) => {
      const user = (req as Request & { user?: { id?: string; role?: string } }).user;
      if (!user) return defaultKeyGenerator(req);

      // Different limits based on user role
      const limit = user.role === 'admin' ? limits.admin :
                   user.role === 'premium' ? limits.premium :
                   limits.default;

      // Store limit in request for the handler
      (req as unknown as { rateLimit: number }).rateLimit = limit;

      return `user:${user.id}`;
    },
    handler: (req, res) => {
      const limit = (req as unknown as { rateLimit?: number }).rateLimit || limits.default;
      res.setHeader('X-RateLimit-Limit', limit.toString());

      defaultHandler(req, res);
    }
  });
}

// Rate limiter with sliding window (more accurate)
export function createSlidingWindowRateLimiter(options: RateLimitOptions = {}) {
  const {
    windowMs = 60 * 1000,
    max = 100,
    ...rest
  } = options;

  // Store request timestamps
  const requestLog = new Map<string, number[]>();

  return createRateLimiter({
    ...rest,
    windowMs,
    max,
    keyGenerator: options.keyGenerator || defaultKeyGenerator,
    skip: (req) => {
      const key = (options.keyGenerator || defaultKeyGenerator)(req);
      const now = Date.now();
      const windowStart = now - windowMs;

      // Get or create request log
      let timestamps = requestLog.get(key) || [];

      // Remove old timestamps
      timestamps = timestamps.filter(t => t > windowStart);

      // Add current request
      timestamps.push(now);
      requestLog.set(key, timestamps);

      // Check if over limit
      if (timestamps.length > max) {
        // Set accurate rate limit headers
        req.res!.setHeader('X-RateLimit-Limit', max.toString());
        req.res!.setHeader('X-RateLimit-Remaining', '0');
        req.res!.setHeader('X-RateLimit-Reset', new Date(timestamps[0] + windowMs).toISOString());

        return false; // Don't skip - will be handled by main middleware
      }

      // Set headers for successful requests
      req.res!.setHeader('X-RateLimit-Limit', max.toString());
      req.res!.setHeader('X-RateLimit-Remaining', (max - timestamps.length).toString());
      req.res!.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

      return options.skip ? options.skip(req) : false;
    }
  });
}

// Distributed rate limiter interface (for Redis/shared storage)
export interface DistributedRateLimiter {
  increment(key: string): Promise<{ count: number; ttl: number }>;
  reset(key: string): Promise<void>;
  get(key: string): Promise<{ count: number; ttl: number } | null>;
}
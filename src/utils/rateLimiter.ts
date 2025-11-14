/**
 * Rate Limiting Middleware
 * Protect APIs from abuse with flexible rate limiting
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (context: any) => string; // Generate unique key for tracking
  skipSuccessfulRequests?: boolean; // Only count failed requests
  skipFailedRequests?: boolean; // Only count successful requests
  handler?: (context: any) => void | Promise<void>; // Custom handler when limit exceeded
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number; // Seconds until next request allowed
}

interface RequestRecord {
  count: number;
  resetTime: number;
  firstRequest: number;
}

class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.startCleanup();
  }

  /**
   * Check if request should be rate limited
   */
  async check(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const now = Date.now();
    const record = this.requests.get(key);

    // No existing record, allow request
    if (!record) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now
      });

      return {
        allowed: true,
        info: {
          limit: config.maxRequests,
          remaining: config.maxRequests - 1,
          reset: new Date(now + config.windowMs)
        }
      };
    }

    // Window expired, reset counter
    if (now >= record.resetTime) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now
      });

      return {
        allowed: true,
        info: {
          limit: config.maxRequests,
          remaining: config.maxRequests - 1,
          reset: new Date(now + config.windowMs)
        }
      };
    }

    // Within window, check limit
    if (record.count >= config.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);

      return {
        allowed: false,
        info: {
          limit: config.maxRequests,
          remaining: 0,
          reset: new Date(record.resetTime),
          retryAfter
        }
      };
    }

    // Increment counter
    record.count++;

    return {
      allowed: true,
      info: {
        limit: config.maxRequests,
        remaining: config.maxRequests - record.count,
        reset: new Date(record.resetTime)
      }
    };
  }

  /**
   * Record successful request
   */
  recordSuccess(key: string, config: RateLimitConfig): void {
    if (config.skipSuccessfulRequests) {
      this.decrementCount(key);
    }
  }

  /**
   * Record failed request
   */
  recordFailure(key: string, config: RateLimitConfig): void {
    if (config.skipFailedRequests) {
      this.decrementCount(key);
    }
  }

  /**
   * Decrement request count
   */
  private decrementCount(key: string): void {
    const record = this.requests.get(key);
    if (record && record.count > 0) {
      record.count--;
    }
  }

  /**
   * Reset rate limit for key
   */
  reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Get current rate limit info
   */
  getInfo(key: string, config: RateLimitConfig): RateLimitInfo | null {
    const record = this.requests.get(key);
    const now = Date.now();

    if (!record || now >= record.resetTime) {
      return {
        limit: config.maxRequests,
        remaining: config.maxRequests,
        reset: new Date(now + config.windowMs)
      };
    }

    const retryAfter = record.count >= config.maxRequests
      ? Math.ceil((record.resetTime - now) / 1000)
      : undefined;

    return {
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - record.count),
      reset: new Date(record.resetTime),
      retryAfter
    };
  }

  /**
   * Start cleanup of expired records
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.requests.entries()) {
        if (now >= record.resetTime) {
          this.requests.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Stop cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const now = Date.now();
    const active = Array.from(this.requests.values()).filter(r => now < r.resetTime);

    return {
      totalKeys: this.requests.size,
      activeKeys: active.length,
      totalRequests: active.reduce((sum, r) => sum + r.count, 0)
    };
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  // Very strict - 10 requests per minute
  STRICT: {
    windowMs: 60 * 1000,
    maxRequests: 10
  },

  // Standard - 100 requests per minute
  STANDARD: {
    windowMs: 60 * 1000,
    maxRequests: 100
  },

  // Generous - 1000 requests per minute
  GENEROUS: {
    windowMs: 60 * 1000,
    maxRequests: 1000
  },

  // Per hour - 10000 requests per hour
  HOURLY: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10000
  },

  // Per day - 100000 requests per day
  DAILY: {
    windowMs: 24 * 60 * 60 * 1000,
    maxRequests: 100000
  },

  // Auth endpoints - 5 attempts per 15 minutes
  AUTH: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5
  },

  // Expensive operations - 10 per hour
  EXPENSIVE: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10
  }
};

/**
 * Create rate limit middleware for Express/similar frameworks
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (req: any, res: any, next: any) => {
    const key = config.keyGenerator
      ? config.keyGenerator(req)
      : req.ip || req.connection.remoteAddress || 'unknown';

    const result = await rateLimiter.check(key, config);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', result.info.limit);
    res.setHeader('X-RateLimit-Remaining', result.info.remaining);
    res.setHeader('X-RateLimit-Reset', result.info.reset.toISOString());

    if (!result.allowed) {
      if (result.info.retryAfter) {
        res.setHeader('Retry-After', result.info.retryAfter);
      }

      if (config.handler) {
        return config.handler(req);
      }

      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.info.retryAfter,
        limit: result.info.limit,
        reset: result.info.reset
      });
    }

    // Track success/failure
    const originalJson = res.json;
    res.json = function (data: any) {
      const statusCode = res.statusCode;
      if (statusCode >= 200 && statusCode < 400) {
        rateLimiter.recordSuccess(key, config);
      } else {
        rateLimiter.recordFailure(key, config);
      }
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Distributed rate limiter using Redis (placeholder)
 */
export class DistributedRateLimiter {
  private redis: any; // Redis client

  constructor(redisClient: any) {
    this.redis = redisClient;
  }

  async check(key: string, config: RateLimitConfig): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const redisKey = `ratelimit:${key}`;
    const now = Date.now();

    // Use Redis INCR with EXPIRE
    const count = await this.redis.incr(redisKey);

    if (count === 1) {
      await this.redis.expire(redisKey, Math.ceil(config.windowMs / 1000));
    }

    const ttl = await this.redis.ttl(redisKey);
    const resetTime = now + (ttl * 1000);

    const allowed = count <= config.maxRequests;

    return {
      allowed,
      info: {
        limit: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - count),
        reset: new Date(resetTime),
        retryAfter: allowed ? undefined : ttl
      }
    };
  }
}

/**
 * Rate limit by user ID
 */
export async function rateLimitByUser(
  userId: string,
  config: RateLimitConfig = RateLimitPresets.STANDARD
): Promise<RateLimitInfo> {
  const result = await rateLimiter.check(`user:${userId}`, config);

  if (!result.allowed) {
    throw new Error(`Rate limit exceeded for user ${userId}`);
  }

  return result.info;
}

/**
 * Rate limit by IP address
 */
export async function rateLimitByIP(
  ip: string,
  config: RateLimitConfig = RateLimitPresets.GENEROUS
): Promise<RateLimitInfo> {
  const result = await rateLimiter.check(`ip:${ip}`, config);

  if (!result.allowed) {
    throw new Error(`Rate limit exceeded for IP ${ip}`);
  }

  return result.info;
}

/**
 * Rate limit by API key
 */
export async function rateLimitByAPIKey(
  apiKey: string,
  config: RateLimitConfig = RateLimitPresets.HOURLY
): Promise<RateLimitInfo> {
  const result = await rateLimiter.check(`apikey:${apiKey}`, config);

  if (!result.allowed) {
    throw new Error(`Rate limit exceeded for API key`);
  }

  return result.info;
}

/**
 * Decorator for rate limiting methods
 */
export function RateLimit(config: RateLimitConfig) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = this;
      const key = config.keyGenerator
        ? config.keyGenerator(context)
        : `${target.constructor.name}.${propertyKey}`;

      const result = await rateLimiter.check(key, config);

      if (!result.allowed) {
        throw new Error(`Rate limit exceeded. Retry after ${result.info.retryAfter} seconds`);
      }

      try {
        const response = await originalMethod.apply(this, args);
        rateLimiter.recordSuccess(key, config);
        return response;
      } catch (error) {
        rateLimiter.recordFailure(key, config);
        throw error;
      }
    };

    return descriptor;
  };
}

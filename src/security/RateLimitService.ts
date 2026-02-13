/**
 * Advanced Rate Limiting Service
 *
 * Provides comprehensive rate limiting capabilities with:
 * - Per-user and per-IP rate limiting
 * - Per-endpoint custom limits
 * - Distributed rate limiting (Redis-based)
 * - Sliding window algorithm
 * - Configurable burst allowance
 * - Rate limit headers (X-RateLimit-*)
 * - Automatic cleanup and monitoring
 *
 * Algorithms:
 * - Sliding Window: Most accurate, prevents burst abuse
 * - Token Bucket: Allows controlled bursts
 * - Fixed Window: Simple, less accurate
 *
 * @module RateLimitService
 */

import Redis from 'ioredis';
import { Request, Response, NextFunction } from 'express';

/**
 * Rate limit configuration for an endpoint or user
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Algorithm to use */
  algorithm?: 'sliding-window' | 'token-bucket' | 'fixed-window';
  /** Burst allowance (for token-bucket) */
  burstSize?: number;
  /** Key prefix for Redis */
  keyPrefix?: string;
  /** Skip rate limiting for certain conditions */
  skip?: (req: Request) => boolean;
  /** Custom error message */
  message?: string;
  /** Status code to return (default: 429) */
  statusCode?: number;
  /** Whether to include rate limit headers */
  includeHeaders?: boolean;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current request count */
  current: number;
  /** Maximum requests allowed */
  limit: number;
  /** Remaining requests */
  remaining: number;
  /** Milliseconds until reset */
  resetMs: number;
  /** Reset timestamp */
  resetAt: Date;
  /** Retry after seconds (if blocked) */
  retryAfter?: number;
}

/**
 * Rate limit violation record
 */
export interface RateLimitViolation {
  id: string;
  timestamp: Date;
  ip: string;
  userId?: string;
  endpoint: string;
  requestCount: number;
  limit: number;
  userAgent?: string;
}

/**
 * Rate limit statistics
 */
export interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  uniqueIPs: number;
  uniqueUsers: number;
  topConsumers: Array<{
    identifier: string;
    requests: number;
    blocked: number;
  }>;
  violations: RateLimitViolation[];
}

/**
 * Default rate limit configurations
 */
export const DEFAULT_RATE_LIMITS = {
  // Global API limits
  global: {
    maxRequests: 1000,
    windowMs: 60 * 1000, // 1 minute
  },

  // Per-user limits (authenticated)
  perUser: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },

  // Per-IP limits (anonymous)
  perIP: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minute
  },

  // Authentication endpoints (stricter)
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },

  // Password reset (prevent abuse)
  passwordReset: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },

  // Webhook endpoints
  webhook: {
    maxRequests: 200,
    windowMs: 60 * 1000, // 1 minute
  },

  // Workflow execution
  execution: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minute
  },
};

/**
 * Advanced Rate Limiting Service
 */
export class RateLimitService {
  private redis: Redis;
  private violations: Map<string, RateLimitViolation[]> = new Map();
  private stats: Map<string, number> = new Map();

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.redis.on('error', (err) => {
      console.error('Rate Limit Redis Error:', err);
    });

    // Cleanup old violations every hour
    setInterval(() => this.cleanupViolations(), 60 * 60 * 1000);
  }

  /**
   * Check if request is within rate limit
   */
  public async checkRateLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const algorithm = config.algorithm || 'sliding-window';

    switch (algorithm) {
      case 'sliding-window':
        return this.slidingWindowCheck(identifier, config);
      case 'token-bucket':
        return this.tokenBucketCheck(identifier, config);
      case 'fixed-window':
        return this.fixedWindowCheck(identifier, config);
      default:
        return this.slidingWindowCheck(identifier, config);
    }
  }

  /**
   * Sliding window algorithm (most accurate)
   */
  private async slidingWindowCheck(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `${config.keyPrefix || 'ratelimit'}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Use Redis sorted set with scores as timestamps
    const multi = this.redis.multi();

    // Remove old entries
    multi.zremrangebyscore(key, 0, windowStart);

    // Add current request
    multi.zadd(key, now, `${now}-${Math.random()}`);

    // Count requests in window
    multi.zcard(key);

    // Set expiry
    multi.expire(key, Math.ceil(config.windowMs / 1000) + 10);

    const results = await multi.exec();

    if (!results) {
      throw new Error('Redis transaction failed');
    }

    const current = results[2][1] as number;
    const limit = config.maxRequests;
    const remaining = Math.max(0, limit - current);
    const resetMs = config.windowMs;
    const resetAt = new Date(now + resetMs);
    const allowed = current <= limit;

    // Record violation if blocked
    if (!allowed) {
      await this.recordViolation(identifier, key, current, limit);
    }

    return {
      allowed,
      current,
      limit,
      remaining,
      resetMs,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil(resetMs / 1000),
    };
  }

  /**
   * Token bucket algorithm (allows bursts)
   */
  private async tokenBucketCheck(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `${config.keyPrefix || 'ratelimit'}:bucket:${identifier}`;
    const now = Date.now();
    const burstSize = config.burstSize || config.maxRequests;
    const refillRate = config.maxRequests / (config.windowMs / 1000); // tokens per second

    // Get current bucket state
    const bucketData = await this.redis.get(key);
    let tokens: number;
    let lastRefill: number;

    if (bucketData) {
      const [tokensStr, lastRefillStr] = bucketData.split(':');
      tokens = parseFloat(tokensStr);
      lastRefill = parseInt(lastRefillStr);

      // Refill tokens based on elapsed time
      const elapsedMs = now - lastRefill;
      const tokensToAdd = (elapsedMs / 1000) * refillRate;
      tokens = Math.min(burstSize, tokens + tokensToAdd);
    } else {
      tokens = burstSize;
      lastRefill = now;
    }

    const allowed = tokens >= 1;

    if (allowed) {
      tokens -= 1;
    }

    // Save bucket state
    await this.redis.setex(
      key,
      Math.ceil(config.windowMs / 1000) + 60,
      `${tokens}:${now}`
    );

    const limit = config.maxRequests;
    const current = Math.floor(burstSize - tokens);
    const remaining = Math.floor(tokens);
    const resetMs = Math.ceil((1 - (tokens % 1)) / refillRate * 1000);
    const resetAt = new Date(now + resetMs);

    if (!allowed) {
      await this.recordViolation(identifier, key, current, limit);
    }

    return {
      allowed,
      current,
      limit,
      remaining,
      resetMs,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil(resetMs / 1000),
    };
  }

  /**
   * Fixed window algorithm (simplest)
   */
  private async fixedWindowCheck(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `${config.keyPrefix || 'ratelimit'}:fixed:${identifier}`;
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const windowEnd = windowStart + config.windowMs;

    // Increment counter
    const current = await this.redis.incr(key);

    if (current === 1) {
      // First request in window, set expiry
      await this.redis.pexpire(key, config.windowMs + 1000);
    }

    const limit = config.maxRequests;
    const remaining = Math.max(0, limit - current);
    const resetMs = windowEnd - now;
    const resetAt = new Date(windowEnd);
    const allowed = current <= limit;

    if (!allowed) {
      await this.recordViolation(identifier, key, current, limit);
    }

    return {
      allowed,
      current,
      limit,
      remaining,
      resetMs,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil(resetMs / 1000),
    };
  }

  /**
   * Express middleware factory
   */
  public middleware(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Check skip condition
      if (config.skip && config.skip(req)) {
        return next();
      }

      // Determine identifier (user ID or IP)
      const identifier = this.getIdentifier(req, config);

      try {
        const result = await this.checkRateLimit(identifier, config);

        // Add rate limit headers
        if (config.includeHeaders !== false) {
          res.setHeader('X-RateLimit-Limit', result.limit);
          res.setHeader('X-RateLimit-Remaining', result.remaining);
          res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt.getTime() / 1000));
        }

        if (!result.allowed) {
          res.setHeader('Retry-After', result.retryAfter || Math.ceil(result.resetMs / 1000));

          return res.status(config.statusCode || 429).json({
            error: 'Too Many Requests',
            message: config.message || 'Rate limit exceeded. Please try again later.',
            limit: result.limit,
            current: result.current,
            remaining: result.remaining,
            resetAt: result.resetAt.toISOString(),
            retryAfter: result.retryAfter,
          });
        }

        next();
      } catch (error) {
        console.error('Rate limit check failed:', error);
        // Fail open - allow request if rate limiting fails
        next();
      }
    };
  }

  /**
   * Get identifier from request
   */
  private getIdentifier(req: Request, config: RateLimitConfig): string {
    // Try to get user ID from authenticated request
    const userId = (req as any).user?.id;
    if (userId) {
      return `user:${userId}`;
    }

    // Fall back to IP address
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  /**
   * Record a rate limit violation
   */
  private async recordViolation(
    identifier: string,
    endpoint: string,
    requestCount: number,
    limit: number
  ): Promise<void> {
    const violation: RateLimitViolation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ip: identifier.startsWith('ip:') ? identifier.substring(3) : 'authenticated',
      userId: identifier.startsWith('user:') ? identifier.substring(5) : undefined,
      endpoint,
      requestCount,
      limit,
    };

    const violations = this.violations.get(identifier) || [];
    violations.push(violation);
    this.violations.set(identifier, violations);

    // Store in Redis for distributed tracking
    await this.redis.lpush(
      `violations:${identifier}`,
      JSON.stringify(violation)
    );
    await this.redis.ltrim(`violations:${identifier}`, 0, 99); // Keep last 100
    await this.redis.expire(`violations:${identifier}`, 86400); // 24 hours
  }

  /**
   * Get rate limit violations
   */
  public async getViolations(
    identifier?: string,
    limit: number = 100
  ): Promise<RateLimitViolation[]> {
    if (identifier) {
      const violations = await this.redis.lrange(`violations:${identifier}`, 0, limit - 1);
      return violations.map(v => JSON.parse(v));
    }

    // Get all violations
    const allViolations: RateLimitViolation[] = [];
    for (const violations of this.violations.values()) {
      allViolations.push(...violations);
    }

    return allViolations
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get rate limit statistics
   */
  public async getStats(): Promise<RateLimitStats> {
    const totalRequests = parseInt(await this.redis.get('stats:total_requests') || '0');
    const blockedRequests = parseInt(await this.redis.get('stats:blocked_requests') || '0');

    // Get unique IPs and users
    const uniqueIPs = await this.redis.scard('stats:unique_ips');
    const uniqueUsers = await this.redis.scard('stats:unique_users');

    // Get top consumers
    const topIPsData = await this.redis.zrevrange('stats:top_ips', 0, 9, 'WITHSCORES');
    const topUsersData = await this.redis.zrevrange('stats:top_users', 0, 9, 'WITHSCORES');

    const topConsumers: Array<{ identifier: string; requests: number; blocked: number }> = [];

    for (let i = 0; i < topIPsData.length; i += 2) {
      const ip = topIPsData[i];
      const requests = parseInt(topIPsData[i + 1]);
      const blocked = parseInt(await this.redis.get(`stats:blocked:ip:${ip}`) || '0');
      topConsumers.push({ identifier: ip, requests, blocked });
    }

    for (let i = 0; i < topUsersData.length; i += 2) {
      const user = topUsersData[i];
      const requests = parseInt(topUsersData[i + 1]);
      const blocked = parseInt(await this.redis.get(`stats:blocked:user:${user}`) || '0');
      topConsumers.push({ identifier: user, requests, blocked });
    }

    // Get recent violations
    const violations = await this.getViolations(undefined, 50);

    return {
      totalRequests,
      blockedRequests,
      uniqueIPs,
      uniqueUsers,
      topConsumers: topConsumers
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10),
      violations,
    };
  }

  /**
   * Reset rate limit for identifier
   */
  public async resetRateLimit(identifier: string, keyPrefix?: string): Promise<void> {
    const patterns = [
      `${keyPrefix || 'ratelimit'}:${identifier}`,
      `${keyPrefix || 'ratelimit'}:bucket:${identifier}`,
      `${keyPrefix || 'ratelimit'}:fixed:${identifier}`,
    ];

    for (const pattern of patterns) {
      await this.redis.del(pattern);
    }

    this.violations.delete(identifier);
    await this.redis.del(`violations:${identifier}`);
  }

  /**
   * Cleanup old violations
   */
  private cleanupViolations(): void {
    const oneDayAgo = Date.now() - 86400000; // 24 hours

    for (const [identifier, violations] of this.violations.entries()) {
      const recent = violations.filter(v => v.timestamp.getTime() > oneDayAgo);

      if (recent.length === 0) {
        this.violations.delete(identifier);
      } else {
        this.violations.set(identifier, recent);
      }
    }
  }

  /**
   * Blacklist an IP or user
   */
  public async blacklist(identifier: string, durationMs?: number): Promise<void> {
    const key = `blacklist:${identifier}`;

    if (durationMs) {
      await this.redis.setex(key, Math.ceil(durationMs / 1000), '1');
    } else {
      await this.redis.set(key, '1');
    }
  }

  /**
   * Check if identifier is blacklisted
   */
  public async isBlacklisted(identifier: string): Promise<boolean> {
    const result = await this.redis.get(`blacklist:${identifier}`);
    return result === '1';
  }

  /**
   * Remove from blacklist
   */
  public async unblacklist(identifier: string): Promise<void> {
    await this.redis.del(`blacklist:${identifier}`);
  }

  /**
   * Get all blacklisted identifiers
   */
  public async getBlacklist(): Promise<string[]> {
    const keys = await this.redis.keys('blacklist:*');
    return keys.map(k => k.replace('blacklist:', ''));
  }

  /**
   * Close Redis connection
   */
  public async close(): Promise<void> {
    await this.redis.quit();
  }
}

/**
 * Singleton instance
 */
let rateLimitServiceInstance: RateLimitService | null = null;

/**
 * Get singleton instance of RateLimitService
 */
export function getRateLimitService(redisUrl?: string): RateLimitService {
  if (!rateLimitServiceInstance) {
    rateLimitServiceInstance = new RateLimitService(redisUrl);
  }
  return rateLimitServiceInstance;
}

/**
 * Helper function to create rate limit middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  const service = getRateLimitService();
  return service.middleware(config);
}

/**
 * Rate Limiter
 * Advanced rate limiting with multiple strategies and quota management
 */

import { EventEmitter } from 'events';
import { Request, Response, NextFunction } from 'express';

/**
 * Rate limit strategy
 */
export type RateLimitStrategy = 'fixed-window' | 'sliding-window' | 'token-bucket' | 'leaky-bucket';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  strategy: RateLimitStrategy;
  defaultLimit: number;
  window: number; // seconds
  perUser?: Record<string, number>;
  perAPIKey?: Record<string, number>;
  perOperation?: Record<string, number>;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
  tokens?: number; // For token bucket
  lastRefill?: number; // For token bucket
  requests?: Array<{ timestamp: number }>; // For sliding window
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * RateLimiter provides flexible rate limiting
 */
export class RateLimiter extends EventEmitter {
  private config: RateLimitConfig;
  private limits: Map<string, RateLimitEntry> = new Map();
  private quotas: Map<string, { used: number; limit: number; resetAt: number }> = new Map();

  constructor(config: RateLimitConfig) {
    super();
    this.config = config;
    this.startCleanupTask();
  }

  /**
   * Create Express middleware
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req);
      const limit = this.getLimit(req);
      const window = this.config.window * 1000;

      try {
        const result = await this.check(key, limit, window);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', result.limit);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', result.resetAt);

        if (!result.allowed) {
          res.setHeader('Retry-After', result.retryAfter || this.config.window);

          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
            limit: result.limit,
            retryAfter: result.retryAfter
          });
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Check rate limit
   */
  async check(key: string, limit: number, window: number): Promise<RateLimitResult> {
    switch (this.config.strategy) {
      case 'fixed-window':
        return this.checkFixedWindow(key, limit, window);
      case 'sliding-window':
        return this.checkSlidingWindow(key, limit, window);
      case 'token-bucket':
        return this.checkTokenBucket(key, limit, window);
      case 'leaky-bucket':
        return this.checkLeakyBucket(key, limit, window);
      default:
        return this.checkFixedWindow(key, limit, window);
    }
  }

  /**
   * Fixed window algorithm
   */
  private async checkFixedWindow(
    key: string,
    limit: number,
    window: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    let entry = this.limits.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = {
        count: 0,
        resetAt: now + window
      };
      this.limits.set(key, entry);
    }

    const allowed = entry.count < limit;

    if (allowed) {
      entry.count++;
    }

    const remaining = Math.max(0, limit - entry.count);
    const retryAfter = entry.resetAt - now;

    return {
      allowed,
      limit,
      remaining,
      resetAt: entry.resetAt,
      retryAfter: allowed ? undefined : Math.ceil(retryAfter / 1000)
    };
  }

  /**
   * Sliding window algorithm
   */
  private async checkSlidingWindow(
    key: string,
    limit: number,
    window: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    let entry = this.limits.get(key);

    if (!entry) {
      entry = {
        count: 0,
        resetAt: now + window,
        requests: []
      };
      this.limits.set(key, entry);
    }

    // Remove old requests outside the window
    entry.requests = entry.requests!.filter(
      req => now - req.timestamp < window
    );

    const allowed = entry.requests!.length < limit;

    if (allowed) {
      entry.requests!.push({ timestamp: now });
    }

    const remaining = Math.max(0, limit - entry.requests!.length);
    const oldestRequest = entry.requests![0];
    const retryAfter = oldestRequest
      ? Math.ceil((oldestRequest.timestamp + window - now) / 1000)
      : 0;

    return {
      allowed,
      limit,
      remaining,
      resetAt: now + window,
      retryAfter: allowed ? undefined : retryAfter
    };
  }

  /**
   * Token bucket algorithm
   */
  private async checkTokenBucket(
    key: string,
    limit: number,
    window: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    let entry = this.limits.get(key);

    if (!entry) {
      entry = {
        count: 0,
        resetAt: now + window,
        tokens: limit,
        lastRefill: now
      };
      this.limits.set(key, entry);
    }

    // Refill tokens based on time elapsed
    const elapsed = now - entry.lastRefill!;
    const tokensToAdd = Math.floor((elapsed / window) * limit);

    if (tokensToAdd > 0) {
      entry.tokens = Math.min(limit, entry.tokens! + tokensToAdd);
      entry.lastRefill = now;
    }

    const allowed = entry.tokens! > 0;

    if (allowed) {
      entry.tokens!--;
    }

    const remaining = entry.tokens!;
    const timeToNextToken = window / limit;
    const retryAfter = Math.ceil(timeToNextToken / 1000);

    return {
      allowed,
      limit,
      remaining,
      resetAt: now + window,
      retryAfter: allowed ? undefined : retryAfter
    };
  }

  /**
   * Leaky bucket algorithm
   */
  private async checkLeakyBucket(
    key: string,
    limit: number,
    window: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const leakRate = limit / window; // requests per millisecond
    let entry = this.limits.get(key);

    if (!entry) {
      entry = {
        count: 0,
        resetAt: now + window,
        lastRefill: now
      };
      this.limits.set(key, entry);
    }

    // Leak requests based on time elapsed
    const elapsed = now - entry.lastRefill!;
    const leaked = Math.floor(elapsed * leakRate);

    entry.count = Math.max(0, entry.count - leaked);
    entry.lastRefill = now;

    const allowed = entry.count < limit;

    if (allowed) {
      entry.count++;
    }

    const remaining = Math.max(0, limit - entry.count);
    const timeToLeak = (entry.count - limit) / leakRate;
    const retryAfter = Math.ceil(timeToLeak / 1000);

    return {
      allowed,
      limit,
      remaining,
      resetAt: now + window,
      retryAfter: allowed ? undefined : retryAfter
    };
  }

  /**
   * Set quota for a key
   */
  setQuota(key: string, limit: number, period: number): void {
    this.quotas.set(key, {
      used: 0,
      limit,
      resetAt: Date.now() + period
    });
  }

  /**
   * Check quota
   */
  checkQuota(key: string): { allowed: boolean; used: number; limit: number } {
    const quota = this.quotas.get(key);

    if (!quota) {
      return { allowed: true, used: 0, limit: Infinity };
    }

    const now = Date.now();

    if (now >= quota.resetAt) {
      quota.used = 0;
      quota.resetAt = now + this.config.window * 1000;
    }

    const allowed = quota.used < quota.limit;

    if (allowed) {
      quota.used++;
    }

    return {
      allowed,
      used: quota.used,
      limit: quota.limit
    };
  }

  /**
   * Get key for rate limiting
   */
  private getKey(req: Request): string {
    const context = (req as any).apiContext;

    // Prefer user ID, then API key, then IP
    if (context?.userId) {
      return `user:${context.userId}`;
    }

    if (context?.apiKey) {
      return `apikey:${context.apiKey}`;
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  /**
   * Get limit for request
   */
  private getLimit(req: Request): number {
    const context = (req as any).apiContext;

    // Check operation-specific limit
    const operation = (req.body as any)?.operationName;
    if (operation && this.config.perOperation?.[operation]) {
      return this.config.perOperation[operation];
    }

    // Check user-specific limit
    if (context?.userId && this.config.perUser?.[context.userId]) {
      return this.config.perUser[context.userId];
    }

    // Check API key-specific limit
    if (context?.apiKey && this.config.perAPIKey?.[context.apiKey]) {
      return this.config.perAPIKey[context.apiKey];
    }

    return this.config.defaultLimit;
  }

  /**
   * Reset rate limit for key
   */
  reset(key: string): void {
    this.limits.delete(key);
    this.emit('ratelimit:reset', { key });
  }

  /**
   * Get current usage for key
   */
  getUsage(key: string): { count: number; limit: number; resetAt: number } | null {
    const entry = this.limits.get(key);

    if (!entry) {
      return null;
    }

    return {
      count: entry.count,
      limit: this.config.defaultLimit,
      resetAt: entry.resetAt
    };
  }

  /**
   * Get all usage statistics
   */
  getAllUsage(): Array<{ key: string; count: number; limit: number }> {
    const usage: Array<{ key: string; count: number; limit: number }> = [];

    for (const [key, entry] of this.limits.entries()) {
      usage.push({
        key,
        count: entry.count,
        limit: this.config.defaultLimit
      });
    }

    return usage;
  }

  /**
   * Start cleanup task
   */
  private startCleanupTask(): void {
    setInterval(() => {
      const now = Date.now();

      // Clean expired entries
      for (const [key, entry] of this.limits.entries()) {
        if (now >= entry.resetAt) {
          this.limits.delete(key);
        }
      }

      // Clean expired quotas
      for (const [key, quota] of this.quotas.entries()) {
        if (now >= quota.resetAt) {
          this.quotas.delete(key);
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Clear all limits
   */
  clear(): void {
    this.limits.clear();
    this.quotas.clear();
  }
}

export default RateLimiter;

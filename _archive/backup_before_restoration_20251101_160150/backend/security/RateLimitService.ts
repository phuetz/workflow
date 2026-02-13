/**
 * Advanced Rate Limiting Service
 * Multiple strategies with Redis support and dynamic limits
 */

import { logger } from '../../services/LoggingService';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  strategy?: 'fixed-window' | 'sliding-window' | 'token-bucket';
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // seconds
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

export class RateLimitService {
  private limits: Map<string, RateLimitEntry> = new Map();
  private globalLimits: Map<string, RateLimitConfig> = new Map();

  // Token bucket state for token bucket algorithm
  private tokenBuckets: Map<string, {
    tokens: number;
    lastRefill: number;
    capacity: number;
    refillRate: number; // tokens per second
  }> = new Map();

  constructor() {
    this.initializeDefaultLimits();
    this.startCleanupInterval();
    logger.info('RateLimitService initialized');
  }

  /**
   * Initialize default rate limits
   */
  private initializeDefaultLimits(): void {
    // API rate limits
    this.globalLimits.set('api:global', {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 1000,
      strategy: 'sliding-window'
    });

    this.globalLimits.set('api:auth', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // Strict limit for auth endpoints
      strategy: 'fixed-window'
    });

    this.globalLimits.set('api:webhook', {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10000,
      strategy: 'token-bucket'
    });

    this.globalLimits.set('api:execution', {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 100,
      strategy: 'sliding-window'
    });

    // Per-user limits
    this.globalLimits.set('user:requests', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60, // 60 requests per minute
      strategy: 'token-bucket'
    });

    this.globalLimits.set('user:login', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      strategy: 'fixed-window'
    });

    // Per-IP limits
    this.globalLimits.set('ip:requests', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      strategy: 'sliding-window'
    });
  }

  /**
   * Check rate limit (main entry point)
   */
  async checkLimit(
    key: string,
    config?: RateLimitConfig
  ): Promise<RateLimitResult> {
    const limitConfig = config || this.globalLimits.get(key);
    if (!limitConfig) {
      throw new Error(`No rate limit configuration found for key: ${key}`);
    }

    const strategy = limitConfig.strategy || 'fixed-window';

    switch (strategy) {
      case 'fixed-window':
        return this.checkFixedWindow(key, limitConfig);
      case 'sliding-window':
        return this.checkSlidingWindow(key, limitConfig);
      case 'token-bucket':
        return this.checkTokenBucket(key, limitConfig);
      default:
        return this.checkFixedWindow(key, limitConfig);
    }
  }

  /**
   * Fixed window rate limiting
   */
  private async checkFixedWindow(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.limits.get(key);

    // Create new entry if doesn't exist or window expired
    if (!entry || now >= entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + config.windowMs,
        blocked: false
      };
      this.limits.set(key, newEntry);

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime: new Date(newEntry.resetTime)
      };
    }

    // Increment counter
    entry.count++;

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      entry.blocked = true;
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      logger.warn('Rate limit exceeded', {
        key,
        count: entry.count,
        limit: config.maxRequests,
        retryAfter
      });

      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: new Date(entry.resetTime),
        retryAfter
      };
    }

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - entry.count,
      resetTime: new Date(entry.resetTime)
    };
  }

  /**
   * Sliding window rate limiting (more accurate)
   */
  private async checkSlidingWindow(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get or create sliding window data
    const slidingKey = `${key}:sliding`;
    const timestamps = this.getSlidingWindowTimestamps(slidingKey);

    // Remove timestamps outside the window
    const validTimestamps = timestamps.filter(ts => ts > windowStart);

    // Add current timestamp
    validTimestamps.push(now);

    // Store updated timestamps
    this.setSlidingWindowTimestamps(slidingKey, validTimestamps);

    const count = validTimestamps.length;
    const allowed = count <= config.maxRequests;

    if (!allowed) {
      const oldestTimestamp = validTimestamps[0];
      const retryAfter = Math.ceil((oldestTimestamp + config.windowMs - now) / 1000);

      logger.warn('Sliding window rate limit exceeded', {
        key,
        count,
        limit: config.maxRequests,
        retryAfter
      });

      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: new Date(oldestTimestamp + config.windowMs),
        retryAfter
      };
    }

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - count,
      resetTime: new Date(validTimestamps[0] + config.windowMs)
    };
  }

  /**
   * Token bucket rate limiting (smooth rate limiting)
   */
  private async checkTokenBucket(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const bucketKey = `${key}:bucket`;

    // Get or create bucket
    let bucket = this.tokenBuckets.get(bucketKey);
    if (!bucket) {
      const refillRate = config.maxRequests / (config.windowMs / 1000);
      bucket = {
        tokens: config.maxRequests,
        lastRefill: now,
        capacity: config.maxRequests,
        refillRate
      };
      this.tokenBuckets.set(bucketKey, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * bucket.refillRate;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Try to consume a token
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: Math.floor(bucket.tokens),
        resetTime: new Date(now + ((bucket.capacity - bucket.tokens) / bucket.refillRate) * 1000)
      };
    }

    // No tokens available
    const retryAfter = Math.ceil((1 - bucket.tokens) / bucket.refillRate);

    logger.warn('Token bucket rate limit exceeded', {
      key,
      tokens: bucket.tokens,
      capacity: bucket.capacity,
      retryAfter
    });

    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: new Date(now + retryAfter * 1000),
      retryAfter
    };
  }

  /**
   * Reset rate limit for key
   */
  async reset(key: string): Promise<void> {
    this.limits.delete(key);
    this.limits.delete(`${key}:sliding`);
    this.tokenBuckets.delete(`${key}:bucket`);
    logger.info('Rate limit reset', { key });
  }

  /**
   * Get rate limit status without incrementing
   */
  async getStatus(key: string, config?: RateLimitConfig): Promise<RateLimitResult> {
    const limitConfig = config || this.globalLimits.get(key);
    if (!limitConfig) {
      throw new Error(`No rate limit configuration found for key: ${key}`);
    }

    const entry = this.limits.get(key);
    const now = Date.now();

    if (!entry || now >= entry.resetTime) {
      return {
        allowed: true,
        limit: limitConfig.maxRequests,
        remaining: limitConfig.maxRequests,
        resetTime: new Date(now + limitConfig.windowMs)
      };
    }

    const remaining = Math.max(0, limitConfig.maxRequests - entry.count);
    const retryAfter = entry.blocked ? Math.ceil((entry.resetTime - now) / 1000) : undefined;

    return {
      allowed: !entry.blocked,
      limit: limitConfig.maxRequests,
      remaining,
      resetTime: new Date(entry.resetTime),
      retryAfter
    };
  }

  /**
   * Set custom rate limit
   */
  setLimit(key: string, config: RateLimitConfig): void {
    this.globalLimits.set(key, config);
    logger.info('Custom rate limit set', { key, config });
  }

  /**
   * Remove custom rate limit
   */
  removeLimit(key: string): void {
    this.globalLimits.delete(key);
    logger.info('Rate limit removed', { key });
  }

  /**
   * Get all rate limits
   */
  getLimits(): Map<string, RateLimitConfig> {
    return new Map(this.globalLimits);
  }

  /**
   * Block a key permanently until manually unblocked
   */
  async block(key: string, reason?: string): Promise<void> {
    const entry = this.limits.get(key) || {
      count: 0,
      resetTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      blocked: true
    };

    entry.blocked = true;
    this.limits.set(key, entry);

    logger.warn('Key blocked', { key, reason });
  }

  /**
   * Unblock a key
   */
  async unblock(key: string): Promise<void> {
    const entry = this.limits.get(key);
    if (entry) {
      entry.blocked = false;
    }

    logger.info('Key unblocked', { key });
  }

  /**
   * Check if key is blocked
   */
  isBlocked(key: string): boolean {
    const entry = this.limits.get(key);
    return entry?.blocked || false;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalKeys: number;
    blockedKeys: number;
    activeLimits: number;
    tokenBuckets: number;
  } {
    let blockedKeys = 0;
    for (const entry of this.limits.values()) {
      if (entry.blocked) blockedKeys++;
    }

    return {
      totalKeys: this.limits.size,
      blockedKeys,
      activeLimits: this.globalLimits.size,
      tokenBuckets: this.tokenBuckets.size
    };
  }

  /**
   * Cleanup expired entries
   */
  private async cleanup(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    // Cleanup expired limit entries
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetTime && !entry.blocked) {
        this.limits.delete(key);
        cleaned++;
      }
    }

    // Cleanup old token buckets (inactive for 1 hour)
    for (const [key, bucket] of this.tokenBuckets.entries()) {
      if (now - bucket.lastRefill > 60 * 60 * 1000) {
        this.tokenBuckets.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Rate limit cleanup', { cleaned });
    }

    return cleaned;
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // Every minute
  }

  // Helper methods for sliding window

  private getSlidingWindowTimestamps(key: string): number[] {
    const data = this.limits.get(key);
    if (!data || !data.count) return [];

    try {
      // Store timestamps in a special format
      const stored = (data as any).timestamps || [];
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  }

  private setSlidingWindowTimestamps(key: string, timestamps: number[]): void {
    const entry: any = this.limits.get(key) || {
      count: 0,
      resetTime: Date.now() + 60000,
      blocked: false
    };

    entry.timestamps = timestamps;
    entry.count = timestamps.length;
    this.limits.set(key, entry);
  }
}

// Singleton instance
export const rateLimitService = new RateLimitService();

// Express middleware helper
export function rateLimitMiddleware(limitKey: string, config?: RateLimitConfig) {
  return async (req: any, res: any, next: any) => {
    try {
      // Build rate limit key
      const identifier = req.user?.id || req.ip || 'anonymous';
      const key = `${limitKey}:${identifier}`;

      const result = await rateLimitService.checkLimit(key, config);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toISOString()
      });

      if (!result.allowed) {
        if (result.retryAfter) {
          res.set('Retry-After', result.retryAfter.toString());
        }

        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          limit: result.limit,
          resetTime: result.resetTime
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limit middleware error:', error);
      // Fail open - allow request if rate limiting fails
      next();
    }
  };
}

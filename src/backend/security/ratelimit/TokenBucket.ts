/**
 * Token Bucket Rate Limiting Algorithm
 * Provides smooth rate limiting with burst capability
 */

import { logger } from '../../../services/SimpleLogger';
import type { RateLimitConfig, RateLimitResult, TokenBucketState } from './types';

export class TokenBucket {
  private buckets: Map<string, TokenBucketState> = new Map();

  /**
   * Check rate limit using token bucket algorithm
   */
  check(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const bucketKey = `${key}:bucket`;

    // Get or create bucket
    let bucket = this.buckets.get(bucketKey);
    if (!bucket) {
      const refillRate = config.maxRequests / (config.windowMs / 1000);
      bucket = {
        tokens: config.maxRequests,
        lastRefill: now,
        capacity: config.maxRequests,
        refillRate
      };
      this.buckets.set(bucketKey, bucket);
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
   * Reset a token bucket
   */
  reset(key: string): void {
    this.buckets.delete(`${key}:bucket`);
  }

  /**
   * Get bucket count for stats
   */
  getBucketCount(): number {
    return this.buckets.size;
  }

  /**
   * Cleanup inactive buckets (older than 1 hour)
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > 60 * 60 * 1000) {
        this.buckets.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

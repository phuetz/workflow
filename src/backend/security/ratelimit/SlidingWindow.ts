/**
 * Sliding Window Rate Limiting Algorithm
 * More accurate rate limiting than fixed window
 */

import { logger } from '../../../services/SimpleLogger';
import type { RateLimitConfig, RateLimitResult, RateLimitEntry } from './types';

export class SlidingWindow {
  private windows: Map<string, RateLimitEntry> = new Map();

  /**
   * Check rate limit using sliding window algorithm
   */
  check(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const slidingKey = `${key}:sliding`;

    // Get or create sliding window data
    const timestamps = this.getTimestamps(slidingKey);

    // Remove timestamps outside the window
    const validTimestamps = timestamps.filter(ts => ts > windowStart);

    // Add current timestamp
    validTimestamps.push(now);

    // Store updated timestamps
    this.setTimestamps(slidingKey, validTimestamps);

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
   * Get timestamps for a sliding window
   */
  private getTimestamps(key: string): number[] {
    const data = this.windows.get(key);
    if (!data || !data.timestamps) return [];
    return Array.isArray(data.timestamps) ? data.timestamps : [];
  }

  /**
   * Set timestamps for a sliding window
   */
  private setTimestamps(key: string, timestamps: number[]): void {
    const entry: RateLimitEntry = this.windows.get(key) || {
      count: 0,
      resetTime: Date.now() + 60000,
      blocked: false
    };

    entry.timestamps = timestamps;
    entry.count = timestamps.length;
    this.windows.set(key, entry);
  }

  /**
   * Reset a sliding window
   */
  reset(key: string): void {
    this.windows.delete(`${key}:sliding`);
  }

  /**
   * Get window count for stats
   */
  getWindowCount(): number {
    return this.windows.size;
  }

  /**
   * Cleanup expired windows
   */
  cleanup(windowMs: number = 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.windows.entries()) {
      if (entry.timestamps && entry.timestamps.length > 0) {
        const newest = Math.max(...entry.timestamps);
        if (now - newest > windowMs) {
          this.windows.delete(key);
          cleaned++;
        }
      }
    }

    return cleaned;
  }
}

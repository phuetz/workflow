/**
 * Rate Limit Store
 * In-memory storage for rate limit entries and fixed window algorithm
 */

import { logger } from '../../../services/SimpleLogger';
import type { RateLimitConfig, RateLimitResult, RateLimitEntry } from './types';

export class RateLimitStore {
  private limits: Map<string, RateLimitEntry> = new Map();

  /**
   * Fixed window rate limiting check
   */
  checkFixedWindow(key: string, config: RateLimitConfig): RateLimitResult {
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
   * Get rate limit status without incrementing
   */
  getStatus(key: string, config: RateLimitConfig): RateLimitResult {
    const entry = this.limits.get(key);
    const now = Date.now();

    if (!entry || now >= entry.resetTime) {
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: new Date(now + config.windowMs)
      };
    }

    const remaining = Math.max(0, config.maxRequests - entry.count);
    const retryAfter = entry.blocked ? Math.ceil((entry.resetTime - now) / 1000) : undefined;

    return {
      allowed: !entry.blocked,
      limit: config.maxRequests,
      remaining,
      resetTime: new Date(entry.resetTime),
      retryAfter
    };
  }

  /**
   * Block a key permanently until manually unblocked
   */
  block(key: string, reason?: string): void {
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
  unblock(key: string): void {
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
   * Reset rate limit for key
   */
  reset(key: string): void {
    this.limits.delete(key);
    logger.info('Rate limit reset', { key });
  }

  /**
   * Get total key count for stats
   */
  getTotalKeys(): number {
    return this.limits.size;
  }

  /**
   * Get blocked key count for stats
   */
  getBlockedKeys(): number {
    let count = 0;
    for (const entry of this.limits.values()) {
      if (entry.blocked) count++;
    }
    return count;
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetTime && !entry.blocked) {
        this.limits.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

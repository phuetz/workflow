/**
 * Webhook Rate Limiter
 * Advanced rate limiting with multiple strategies
 */

import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';

export type RateLimitWindow = 'second' | 'minute' | 'hour' | 'day';

export interface RateLimitConfig {
  // Per-webhook limits
  webhookLimits?: {
    requests: number;
    window: RateLimitWindow;
    burst?: number;
  };

  // Per-IP limits
  ipLimits?: {
    requests: number;
    window: RateLimitWindow;
    burst?: number;
  };

  // Global limits
  globalLimits?: {
    requests: number;
    window: RateLimitWindow;
  };

  // Custom error response
  errorResponse?: {
    statusCode?: number;
    message?: string;
    headers?: Record<string, string>;
  };

  // Whitelist/Blacklist
  whitelistedIPs?: string[];
  blacklistedIPs?: string[];
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds
  reason?: string;
}

export interface RateLimitEntry {
  count: number;
  resetAt: number;
  burst?: number;
}

export class WebhookRateLimiter extends EventEmitter {
  private webhookLimits: Map<string, RateLimitEntry> = new Map();
  private ipLimits: Map<string, RateLimitEntry> = new Map();
  private globalLimits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minute

  constructor() {
    super();
    this.startCleanupTask();
  }

  /**
   * Check if request is allowed
   */
  checkRateLimit(
    webhookId: string,
    ip: string,
    config: RateLimitConfig
  ): RateLimitResult {
    // Check blacklist
    if (config.blacklistedIPs && config.blacklistedIPs.includes(ip)) {
      this.emit('rate-limit:blocked', { webhookId, ip, reason: 'blacklisted' });
      return {
        allowed: false,
        limit: 0,
        remaining: 0,
        resetAt: new Date(),
        reason: 'IP is blacklisted'
      };
    }

    // Check whitelist (bypass rate limiting)
    if (config.whitelistedIPs && config.whitelistedIPs.includes(ip)) {
      return {
        allowed: true,
        limit: Infinity,
        remaining: Infinity,
        resetAt: new Date(Date.now() + 86400000) // 1 day
      };
    }

    // Check global limits first
    if (config.globalLimits) {
      const globalResult = this.checkLimit(
        'global',
        this.globalLimits,
        config.globalLimits.requests,
        config.globalLimits.window
      );

      if (!globalResult.allowed) {
        this.emit('rate-limit:exceeded', {
          webhookId,
          ip,
          type: 'global',
          limit: globalResult.limit
        });
        return globalResult;
      }
    }

    // Check per-webhook limits
    if (config.webhookLimits) {
      const webhookKey = `webhook:${webhookId}`;
      const webhookResult = this.checkLimit(
        webhookKey,
        this.webhookLimits,
        config.webhookLimits.requests,
        config.webhookLimits.window,
        config.webhookLimits.burst
      );

      if (!webhookResult.allowed) {
        this.emit('rate-limit:exceeded', {
          webhookId,
          ip,
          type: 'webhook',
          limit: webhookResult.limit
        });
        return webhookResult;
      }
    }

    // Check per-IP limits
    if (config.ipLimits) {
      const ipKey = `ip:${ip}:${webhookId}`;
      const ipResult = this.checkLimit(
        ipKey,
        this.ipLimits,
        config.ipLimits.requests,
        config.ipLimits.window,
        config.ipLimits.burst
      );

      if (!ipResult.allowed) {
        this.emit('rate-limit:exceeded', {
          webhookId,
          ip,
          type: 'ip',
          limit: ipResult.limit
        });
        return ipResult;
      }
    }

    // All checks passed
    return {
      allowed: true,
      limit: config.webhookLimits?.requests || Infinity,
      remaining: this.getRemaining(
        `webhook:${webhookId}`,
        this.webhookLimits,
        config.webhookLimits?.requests || Infinity
      ),
      resetAt: this.getResetTime(
        `webhook:${webhookId}`,
        this.webhookLimits,
        config.webhookLimits?.window || 'hour'
      )
    };
  }

  /**
   * Record a request (consume rate limit token)
   */
  recordRequest(
    webhookId: string,
    ip: string,
    config: RateLimitConfig
  ): void {
    const now = Date.now();

    // Record global request
    if (config.globalLimits) {
      this.incrementCounter('global', this.globalLimits, config.globalLimits.window, now);
    }

    // Record webhook request
    if (config.webhookLimits) {
      const webhookKey = `webhook:${webhookId}`;
      this.incrementCounter(webhookKey, this.webhookLimits, config.webhookLimits.window, now);
    }

    // Record IP request
    if (config.ipLimits) {
      const ipKey = `ip:${ip}:${webhookId}`;
      this.incrementCounter(ipKey, this.ipLimits, config.ipLimits.window, now);
    }

    this.emit('request:recorded', { webhookId, ip });
  }

  /**
   * Check rate limit for a specific key
   */
  private checkLimit(
    key: string,
    store: Map<string, RateLimitEntry>,
    limit: number,
    window: RateLimitWindow,
    burst?: number
  ): RateLimitResult {
    const now = Date.now();
    const windowMs = this.getWindowMs(window);
    let entry = store.get(key);

    // Create or reset entry if expired
    if (!entry || entry.resetAt <= now) {
      entry = {
        count: 0,
        resetAt: now + windowMs,
        burst: burst || 0
      };
      store.set(key, entry);
    }

    const effectiveLimit = limit + (entry.burst || 0);
    const remaining = Math.max(0, effectiveLimit - entry.count);

    if (entry.count >= effectiveLimit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

      return {
        allowed: false,
        limit: effectiveLimit,
        remaining: 0,
        resetAt: new Date(entry.resetAt),
        retryAfter,
        reason: `Rate limit exceeded: ${entry.count}/${effectiveLimit} requests in ${window}`
      };
    }

    return {
      allowed: true,
      limit: effectiveLimit,
      remaining: remaining - 1, // Account for current request
      resetAt: new Date(entry.resetAt)
    };
  }

  /**
   * Increment request counter
   */
  private incrementCounter(
    key: string,
    store: Map<string, RateLimitEntry>,
    window: RateLimitWindow,
    now: number
  ): void {
    const windowMs = this.getWindowMs(window);
    let entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = {
        count: 1,
        resetAt: now + windowMs
      };
    } else {
      entry.count++;
    }

    store.set(key, entry);
  }

  /**
   * Get remaining requests for a key
   */
  private getRemaining(
    key: string,
    store: Map<string, RateLimitEntry>,
    limit: number
  ): number {
    const entry = store.get(key);
    if (!entry || entry.resetAt <= Date.now()) {
      return limit;
    }
    return Math.max(0, limit - entry.count);
  }

  /**
   * Get reset time for a key
   */
  private getResetTime(
    key: string,
    store: Map<string, RateLimitEntry>,
    window: RateLimitWindow
  ): Date {
    const entry = store.get(key);
    if (entry && entry.resetAt > Date.now()) {
      return new Date(entry.resetAt);
    }
    return new Date(Date.now() + this.getWindowMs(window));
  }

  /**
   * Convert window to milliseconds
   */
  private getWindowMs(window: RateLimitWindow): number {
    switch (window) {
      case 'second':
        return 1000;
      case 'minute':
        return 60 * 1000;
      case 'hour':
        return 60 * 60 * 1000;
      case 'day':
        return 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000; // Default to 1 hour
    }
  }

  /**
   * Get rate limit statistics
   */
  getStatistics(webhookId?: string): {
    totalWebhooks: number;
    totalIPs: number;
    activeWebhooks: number;
    activeIPs: number;
    blockedRequests: number;
  } {
    const now = Date.now();

    let totalWebhooks = 0;
    let activeWebhooks = 0;

    for (const [key, entry] of this.webhookLimits.entries()) {
      if (key.startsWith('webhook:')) {
        totalWebhooks++;
        if (entry.resetAt > now && entry.count > 0) {
          activeWebhooks++;
        }
      }
    }

    let totalIPs = 0;
    let activeIPs = 0;

    for (const [key, entry] of this.ipLimits.entries()) {
      if (!webhookId || key.includes(webhookId)) {
        totalIPs++;
        if (entry.resetAt > now && entry.count > 0) {
          activeIPs++;
        }
      }
    }

    return {
      totalWebhooks,
      totalIPs,
      activeWebhooks,
      activeIPs,
      blockedRequests: 0 // This would need to be tracked separately
    };
  }

  /**
   * Reset rate limits for a webhook
   */
  resetWebhookLimits(webhookId: string): void {
    // Reset webhook limits
    const webhookKey = `webhook:${webhookId}`;
    this.webhookLimits.delete(webhookKey);

    // Reset IP limits for this webhook
    for (const key of this.ipLimits.keys()) {
      if (key.includes(webhookId)) {
        this.ipLimits.delete(key);
      }
    }

    this.emit('limits:reset', { webhookId });
    logger.info(`Rate limits reset for webhook: ${webhookId}`);
  }

  /**
   * Reset rate limits for an IP
   */
  resetIPLimits(ip: string): void {
    for (const key of this.ipLimits.keys()) {
      if (key.includes(ip)) {
        this.ipLimits.delete(key);
      }
    }

    this.emit('limits:reset', { ip });
    logger.info(`Rate limits reset for IP: ${ip}`);
  }

  /**
   * Get current rate limit status for a webhook
   */
  getWebhookStatus(webhookId: string, config: RateLimitConfig): {
    webhookLimit?: {
      limit: number;
      used: number;
      remaining: number;
      resetAt: Date;
    };
    topIPs: Array<{
      ip: string;
      requests: number;
      resetAt: Date;
    }>;
  } {
    const result: any = {};

    // Get webhook limit status
    if (config.webhookLimits) {
      const webhookKey = `webhook:${webhookId}`;
      const entry = this.webhookLimits.get(webhookKey);
      const limit = config.webhookLimits.requests;

      result.webhookLimit = {
        limit,
        used: entry?.count || 0,
        remaining: entry ? Math.max(0, limit - entry.count) : limit,
        resetAt: entry ? new Date(entry.resetAt) : new Date(Date.now() + this.getWindowMs(config.webhookLimits.window))
      };
    }

    // Get top IPs by request count
    const ipEntries: Array<{ ip: string; requests: number; resetAt: Date }> = [];

    for (const [key, entry] of this.ipLimits.entries()) {
      if (key.includes(webhookId)) {
        const ip = key.split(':')[1]; // Extract IP from "ip:xxx:webhookId"
        ipEntries.push({
          ip,
          requests: entry.count,
          resetAt: new Date(entry.resetAt)
        });
      }
    }

    result.topIPs = ipEntries
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    return result;
  }

  /**
   * Start cleanup task to remove expired entries
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);

    logger.info('Rate limiter cleanup task started');
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    // Cleanup webhook limits
    for (const [key, entry] of this.webhookLimits.entries()) {
      if (entry.resetAt <= now) {
        this.webhookLimits.delete(key);
        cleaned++;
      }
    }

    // Cleanup IP limits
    for (const [key, entry] of this.ipLimits.entries()) {
      if (entry.resetAt <= now) {
        this.ipLimits.delete(key);
        cleaned++;
      }
    }

    // Cleanup global limits
    for (const [key, entry] of this.globalLimits.entries()) {
      if (entry.resetAt <= now) {
        this.globalLimits.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Rate limiter cleaned up ${cleaned} expired entries`);
    }
  }

  /**
   * Shutdown and cleanup
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.webhookLimits.clear();
    this.ipLimits.clear();
    this.globalLimits.clear();
    this.removeAllListeners();

    logger.info('WebhookRateLimiter shut down');
  }
}

// Export singleton instance
export const webhookRateLimiter = new WebhookRateLimiter();

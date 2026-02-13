/**
 * Rate Limiting Module
 * Barrel export for rate limiting functionality
 */

// Types
export * from './types';

// Core components
export { TokenBucket } from './TokenBucket';
export { SlidingWindow } from './SlidingWindow';
export { RateLimitStore } from './RateLimitStore';

// Main service (imported after class definition below)
import { logger } from '../../../services/SimpleLogger';
import type { RateLimitConfig, RateLimitResult, RateLimitStats } from './types';
import { TokenBucket } from './TokenBucket';
import { SlidingWindow } from './SlidingWindow';
import { RateLimitStore } from './RateLimitStore';

/**
 * Main Rate Limit Service
 * Orchestrates different rate limiting strategies
 */
export class RateLimitService {
  private store: RateLimitStore;
  private tokenBucket: TokenBucket;
  private slidingWindow: SlidingWindow;
  private globalLimits: Map<string, RateLimitConfig> = new Map();

  constructor() {
    this.store = new RateLimitStore();
    this.tokenBucket = new TokenBucket();
    this.slidingWindow = new SlidingWindow();
    this.initializeDefaultLimits();
    this.startCleanupInterval();
    logger.info('RateLimitService initialized');
  }

  private initializeDefaultLimits(): void {
    // API rate limits
    this.globalLimits.set('api:global', {
      windowMs: 60 * 60 * 1000, maxRequests: 1000, strategy: 'sliding-window'
    });
    this.globalLimits.set('api:auth', {
      windowMs: 15 * 60 * 1000, maxRequests: 5, strategy: 'fixed-window'
    });
    this.globalLimits.set('api:webhook', {
      windowMs: 60 * 60 * 1000, maxRequests: 10000, strategy: 'token-bucket'
    });
    this.globalLimits.set('api:execution', {
      windowMs: 60 * 60 * 1000, maxRequests: 100, strategy: 'sliding-window'
    });

    // Per-user limits
    this.globalLimits.set('user:requests', {
      windowMs: 60 * 1000, maxRequests: 60, strategy: 'token-bucket'
    });
    this.globalLimits.set('user:login', {
      windowMs: 15 * 60 * 1000, maxRequests: 5, strategy: 'fixed-window'
    });

    // Per-IP limits
    this.globalLimits.set('ip:requests', {
      windowMs: 60 * 1000, maxRequests: 100, strategy: 'sliding-window'
    });
  }

  /**
   * Check rate limit (main entry point)
   */
  async checkLimit(key: string, config?: RateLimitConfig): Promise<RateLimitResult> {
    const limitConfig = config || this.globalLimits.get(key);
    if (!limitConfig) {
      throw new Error(`No rate limit configuration found for key: ${key}`);
    }

    const strategy = limitConfig.strategy || 'fixed-window';

    switch (strategy) {
      case 'fixed-window':
        return this.store.checkFixedWindow(key, limitConfig);
      case 'sliding-window':
        return this.slidingWindow.check(key, limitConfig);
      case 'token-bucket':
        return this.tokenBucket.check(key, limitConfig);
      default:
        return this.store.checkFixedWindow(key, limitConfig);
    }
  }

  /**
   * Reset rate limit for key
   */
  async reset(key: string): Promise<void> {
    this.store.reset(key);
    this.slidingWindow.reset(key);
    this.tokenBucket.reset(key);
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
    return this.store.getStatus(key, limitConfig);
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
    this.store.block(key, reason);
  }

  /**
   * Unblock a key
   */
  async unblock(key: string): Promise<void> {
    this.store.unblock(key);
  }

  /**
   * Check if key is blocked
   */
  isBlocked(key: string): boolean {
    return this.store.isBlocked(key);
  }

  /**
   * Get statistics
   */
  getStats(): RateLimitStats {
    return {
      totalKeys: this.store.getTotalKeys(),
      blockedKeys: this.store.getBlockedKeys(),
      activeLimits: this.globalLimits.size,
      tokenBuckets: this.tokenBucket.getBucketCount()
    };
  }

  private async cleanup(): Promise<number> {
    const storeClean = this.store.cleanup();
    const bucketClean = this.tokenBucket.cleanup();
    const windowClean = this.slidingWindow.cleanup();
    const total = storeClean + bucketClean + windowClean;

    if (total > 0) {
      logger.debug('Rate limit cleanup', { cleaned: total });
    }
    return total;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }
}

// Singleton instances
export const rateLimitService = new RateLimitService();

// Re-export integration limits and middleware
export { IntegrationRateLimiter, INTEGRATION_RATE_LIMITS } from './IntegrationLimits';
export { rateLimitMiddleware } from './RateLimitMiddleware';

// Create integration rate limiter singleton
import { IntegrationRateLimiter } from './IntegrationLimits';
export const integrationRateLimiter = new IntegrationRateLimiter();

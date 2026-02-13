/**
 * Redis-based API Caching Service
 *
 * Provides high-performance caching for API responses, database queries,
 * and frequently accessed data.
 *
 * Features:
 * - Redis-backed caching with automatic fallback
 * - Cache invalidation by tags
 * - TTL (Time To Live) support
 * - Cache warming
 * - Cache statistics
 * - Distributed caching support
 *
 * Usage:
 * import { cacheService } from '@/backend/services/CacheService';
 *
 * // Cache API response
 * const cachedData = await cacheService.getOrSet(
 *   'workflows:list:user:123',
 *   () => fetchWorkflows(userId),
 *   { ttl: 300, tags: ['workflows', 'user:123'] }
 * );
 */

import Redis from 'ioredis';
import { logger } from '../../services/SimpleLogger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for cache invalidation
  compress?: boolean; // Compress large values
  namespace?: string; // Cache namespace
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
  avgGetTime: number;
  avgSetTime: number;
}

const DEFAULT_TTL = 300; // 5 minutes
const DEFAULT_NAMESPACE = 'workflow';
const STATS_KEY = 'cache:stats';
const TAGS_PREFIX = 'cache:tags:';

export class CacheService {
  private redis: Redis | null = null;
  private fallbackCache: Map<string, { value: any; expiresAt: number }> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0,
    avgGetTime: 0,
    avgSetTime: 0,
  };
  private getTimes: number[] = [];
  private setTimes: number[] = [];
  private isConnected: boolean = false;

  constructor() {
    this.initializeRedis();
    this.startCleanup();
  }

  /**
   * Initialize Redis connection
   */
  private initializeRedis(): void {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        enableOfflineQueue: true,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        },
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis cache connected');
      });

      this.redis.on('error', (err) => {
        this.isConnected = false;
        logger.error('Redis cache error:', err);
        this.stats.errors++;
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis cache connection closed');
      });

    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      this.redis = null;
    }
  }

  /**
   * Generate cache key
   */
  private generateKey(key: string, namespace: string = DEFAULT_NAMESPACE): string {
    return `${namespace}:${key}`;
  }

  /**
   * Get value from cache
   */
  public async get<T>(
    key: string,
    options: CacheOptions = {}
  ): Promise<T | null> {
    const startTime = performance.now();
    const { namespace = DEFAULT_NAMESPACE } = options;
    const cacheKey = this.generateKey(key, namespace);

    try {
      let value: string | null = null;

      // Try Redis first
      if (this.redis && this.isConnected) {
        value = await this.redis.get(cacheKey);
      }

      // Fallback to in-memory cache
      if (!value && this.fallbackCache.has(cacheKey)) {
        const cached = this.fallbackCache.get(cacheKey)!;
        if (cached.expiresAt > Date.now()) {
          value = JSON.stringify(cached.value);
        } else {
          this.fallbackCache.delete(cacheKey);
        }
      }

      const duration = performance.now() - startTime;
      this.getTimes.push(duration);
      if (this.getTimes.length > 100) this.getTimes.shift();

      if (value) {
        this.stats.hits++;
        this.updateStats();
        return JSON.parse(value) as T;
      }

      this.stats.misses++;
      this.updateStats();
      return null;

    } catch (error) {
      logger.error('Cache get error:', error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set value in cache
   */
  public async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const startTime = performance.now();
    const {
      ttl = DEFAULT_TTL,
      tags = [],
      namespace = DEFAULT_NAMESPACE,
    } = options;
    const cacheKey = this.generateKey(key, namespace);

    try {
      const serialized = JSON.stringify(value);

      // Set in Redis
      if (this.redis && this.isConnected) {
        await this.redis.setex(cacheKey, ttl, serialized);

        // Store tags for invalidation
        if (tags.length > 0) {
          const pipeline = this.redis.pipeline();
          for (const tag of tags) {
            const tagKey = `${TAGS_PREFIX}${tag}`;
            pipeline.sadd(tagKey, cacheKey);
            pipeline.expire(tagKey, ttl);
          }
          await pipeline.exec();
        }
      }

      // Set in fallback cache
      this.fallbackCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + ttl * 1000,
      });

      const duration = performance.now() - startTime;
      this.setTimes.push(duration);
      if (this.setTimes.length > 100) this.setTimes.shift();

      this.stats.sets++;
      this.updateStats();

    } catch (error) {
      logger.error('Cache set error:', error);
      this.stats.errors++;
    }
  }

  /**
   * Get or set value (cache-aside pattern)
   */
  public async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    const value = await fetcher();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Delete value from cache
   */
  public async delete(
    key: string,
    namespace: string = DEFAULT_NAMESPACE
  ): Promise<void> {
    const cacheKey = this.generateKey(key, namespace);

    try {
      if (this.redis && this.isConnected) {
        await this.redis.del(cacheKey);
      }

      this.fallbackCache.delete(cacheKey);
      this.stats.deletes++;

    } catch (error) {
      logger.error('Cache delete error:', error);
      this.stats.errors++;
    }
  }

  /**
   * Invalidate cache by tags
   */
  public async invalidateByTags(tags: string[]): Promise<void> {
    if (!this.redis || !this.isConnected) {
      return;
    }

    try {
      for (const tag of tags) {
        const tagKey = `${TAGS_PREFIX}${tag}`;
        const keys = await this.redis.smembers(tagKey);

        if (keys.length > 0) {
          const pipeline = this.redis.pipeline();
          for (const key of keys) {
            pipeline.del(key);
          }
          pipeline.del(tagKey);
          await pipeline.exec();

          this.stats.deletes += keys.length;
        }
      }
    } catch (error) {
      logger.error('Cache invalidate error:', error);
      this.stats.errors++;
    }
  }

  /**
   * Invalidate by pattern
   */
  public async invalidateByPattern(
    pattern: string,
    namespace: string = DEFAULT_NAMESPACE
  ): Promise<void> {
    if (!this.redis || !this.isConnected) {
      return;
    }

    try {
      const searchPattern = this.generateKey(pattern, namespace);
      const keys = await this.redis.keys(searchPattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.stats.deletes += keys.length;
      }
    } catch (error) {
      logger.error('Cache invalidate pattern error:', error);
      this.stats.errors++;
    }
  }

  /**
   * Clear all cache
   */
  public async clear(namespace?: string): Promise<void> {
    try {
      if (this.redis && this.isConnected) {
        if (namespace) {
          await this.invalidateByPattern('*', namespace);
        } else {
          await this.redis.flushdb();
        }
      }

      this.fallbackCache.clear();
      this.stats.deletes++;

    } catch (error) {
      logger.error('Cache clear error:', error);
      this.stats.errors++;
    }
  }

  /**
   * Cache warming - preload frequently accessed data
   */
  public async warm(
    items: Array<{ key: string; fetcher: () => Promise<any>; options?: CacheOptions }>
  ): Promise<void> {
    logger.info(`Warming cache with ${items.length} items`);

    const promises = items.map(async ({ key, fetcher, options }) => {
      try {
        const value = await fetcher();
        await this.set(key, value, options);
      } catch (error) {
        logger.error(`Failed to warm cache for key ${key}:`, error);
      }
    });

    await Promise.all(promises);
    logger.info('Cache warming complete');
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    this.stats.avgGetTime =
      this.getTimes.length > 0
        ? this.getTimes.reduce((a, b) => a + b, 0) / this.getTimes.length
        : 0;

    this.stats.avgSetTime =
      this.setTimes.length > 0
        ? this.setTimes.reduce((a, b) => a + b, 0) / this.setTimes.length
        : 0;

    // Persist stats to Redis periodically
    if (this.redis && this.isConnected && this.stats.sets % 100 === 0) {
      this.redis.set(STATS_KEY, JSON.stringify(this.stats), 'EX', 86400).catch((error) => {
        logger.warn('Failed to persist cache stats to Redis', { error: error.message });
      });
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
      avgGetTime: 0,
      avgSetTime: 0,
    };
    this.getTimes = [];
    this.setTimes = [];
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      this.fallbackCache.forEach((value, key) => {
        if (value.expiresAt < now) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach(key => this.fallbackCache.delete(key));
    }, 60000); // Every minute
  }

  /**
   * Check cache health
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    redis: boolean;
    fallback: boolean;
    stats: CacheStats;
  }> {
    let redisHealthy = false;

    try {
      if (this.redis && this.isConnected) {
        await this.redis.ping();
        redisHealthy = true;
      }
    } catch {
      redisHealthy = false;
    }

    const status = redisHealthy
      ? 'healthy'
      : this.fallbackCache.size > 0
      ? 'degraded'
      : 'unhealthy';

    return {
      status,
      redis: redisHealthy,
      fallback: true,
      stats: this.getStats(),
    };
  }

  /**
   * Close connections
   */
  public async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
    this.fallbackCache.clear();
  }

  /**
   * Check if connected
   */
  public isReady(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    await cacheService.close();
  });

  process.on('SIGINT', async () => {
    await cacheService.close();
  });
}

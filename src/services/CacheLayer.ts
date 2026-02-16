/**
 * Unified Cache Layer Service
 *
 * Combines the best of CacheService.ts and CachingService.ts:
 * - Browser-compatible with dynamic Redis import (from CacheService)
 * - Advanced features: tags, namespace, priority, LRU eviction (from CachingService)
 * - EventEmitter for cache events
 * - Detailed statistics
 * - Memory-first with Redis fallback pattern
 *
 * @module CacheLayer
 */

import { EventEmitter } from 'events';
import { logger } from './SimpleLogger';

// Dynamic Redis import for browser compatibility
let Redis: any = null;
let redisImportPromise: Promise<any> | null = null;

 
if (typeof (globalThis as any).window === 'undefined') {
  redisImportPromise = import('ioredis').then(module => {
    Redis = module.default || module;
    return Redis;
  }).catch(err => {
    logger.warn('CacheLayer: Failed to import Redis:', err.message);
    return null;
  });
}

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CacheOptions {
  /** Time to live in seconds (default: 3600) */
  ttl?: number;
  /** Tags for cache invalidation */
  tags?: string[];
  /** Cache namespace for key prefixing */
  namespace?: string;
  /** Cache priority for LRU eviction */
  priority?: 'low' | 'normal' | 'high';
  /** Whether to compress large values */
  compress?: boolean;
}

interface CacheEntry {
  value: unknown;
  expires: number;
  tags: string[];
  priority: 'low' | 'normal' | 'high';
  size: number;
  hits: number;
  created: number;
  lastAccessed: number;
}

export interface CacheStats {
  memoryHits: number;
  memoryMisses: number;
  redisHits: number;
  redisMisses: number;
  totalRequests: number;
  hitRate: number;
  memoryUsage: number;
  memoryEntries: number;
  maxMemorySize: number;
  redisAvailable: boolean;
  avgResponseTime: number;
  evictions: number;
}

// ============================================================================
// CacheLayer Class
// ============================================================================

export class CacheLayer extends EventEmitter {
  private static instance: CacheLayer | null = null;

  private redis: any = null;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private memorySize: number = 0;
  private maxMemorySize: number;
  private isRedisAvailable: boolean = false;
  private isInitialized: boolean = false;

  private stats: CacheStats = {
    memoryHits: 0,
    memoryMisses: 0,
    redisHits: 0,
    redisMisses: 0,
    totalRequests: 0,
    hitRate: 0,
    memoryUsage: 0,
    memoryEntries: 0,
    maxMemorySize: 0,
    redisAvailable: false,
    avgResponseTime: 0,
    evictions: 0,
  };

  private responseTimes: number[] = [];
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  // ---------------------------------------------------------------------------
  // Constructor & Singleton
  // ---------------------------------------------------------------------------

  private constructor() {
    super();
    // Default 100MB memory limit, configurable via env
    this.maxMemorySize = parseInt(process.env.CACHE_MEMORY_LIMIT || '104857600', 10);
    this.stats.maxMemorySize = this.maxMemorySize;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CacheLayer {
    if (!CacheLayer.instance) {
      CacheLayer.instance = new CacheLayer();
    }
    return CacheLayer.instance;
  }

  /**
   * Reset singleton (useful for testing)
   */
  public static resetInstance(): void {
    if (CacheLayer.instance) {
      CacheLayer.instance.shutdown().catch(() => {});
      CacheLayer.instance = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Initialize the cache layer
   * Must be called before using Redis features
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Skip Redis in browser environment
     
    if (typeof (globalThis as any).window !== 'undefined') {
      logger.debug('CacheLayer: Browser environment detected, using memory cache only');
      this.isRedisAvailable = false;
      this.startCleanup();
      this.isInitialized = true;
      return;
    }

    try {
      // Wait for Redis import
      if (redisImportPromise) {
        await redisImportPromise;
      }

      if (!Redis) {
        logger.warn('CacheLayer: Redis not available, using memory cache only');
        this.isRedisAvailable = false;
        this.startCleanup();
        this.isInitialized = true;
        return;
      }

      // Initialize Redis connection
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          if (times > 10) {
            logger.warn('CacheLayer: Redis unavailable after 10 retries, using memory cache');
            this.isRedisAvailable = false;
            return null;
          }
          return delay;
        },
        lazyConnect: true,
        keepAlive: 30000,
        connectionName: 'workflow-cache-layer',
      };

      // Support REDIS_URL as alternative
      const redisUrl = process.env.REDIS_URL;
      this.redis = redisUrl
        ? new Redis(redisUrl, redisConfig)
        : new Redis(redisConfig);

      // Connection event handlers
      this.redis.on('connect', () => {
        logger.info('CacheLayer: Redis connected');
        this.isRedisAvailable = true;
        this.stats.redisAvailable = true;
        this.emit('connected');
      });

      this.redis.on('error', (err: Error) => {
        logger.error('CacheLayer: Redis error:', err.message);
        this.isRedisAvailable = false;
        this.stats.redisAvailable = false;
        this.emit('error', err);
      });

      this.redis.on('close', () => {
        logger.warn('CacheLayer: Redis connection closed');
        this.isRedisAvailable = false;
        this.stats.redisAvailable = false;
        this.emit('disconnected');
      });

      // Test connection
      await this.redis.ping();
      this.isRedisAvailable = true;
      this.stats.redisAvailable = true;
      logger.info('CacheLayer: Initialized with Redis support');

    } catch (error) {
      logger.warn('CacheLayer: Redis initialization failed, using memory cache:', error);
      this.isRedisAvailable = false;
    }

    this.startCleanup();
    this.isInitialized = true;
  }

  // ---------------------------------------------------------------------------
  // Core Cache Operations
  // ---------------------------------------------------------------------------

  /**
   * Get value from cache
   */
  public async get<T = unknown>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    const fullKey = this.buildKey(key, options.namespace);

    try {
      // Check memory cache first
      const memoryEntry = this.memoryCache.get(fullKey);
      if (memoryEntry && memoryEntry.expires > Date.now()) {
        memoryEntry.hits++;
        memoryEntry.lastAccessed = Date.now();
        this.stats.memoryHits++;
        this.recordResponseTime(Date.now() - startTime);
        this.updateHitRate();
        return this.deserialize(memoryEntry.value) as T;
      }

      // Remove expired memory entry
      if (memoryEntry) {
        this.removeFromMemory(fullKey);
      }

      // Try Redis if available
      if (this.isRedisAvailable && this.redis) {
        try {
          const redisValue = await this.redis.get(fullKey);
          if (redisValue) {
            const parsed: CacheEntry = JSON.parse(redisValue);
            this.stats.redisHits++;

            // Promote to memory cache
            if (this.shouldCacheInMemory(parsed.size, parsed.priority)) {
              this.setInMemory(fullKey, parsed);
            }

            this.recordResponseTime(Date.now() - startTime);
            this.updateHitRate();
            return this.deserialize(parsed.value) as T;
          }
          this.stats.redisMisses++;
        } catch (redisError) {
          logger.error('CacheLayer: Redis get error:', redisError);
        }
      } else {
        this.stats.memoryMisses++;
      }

      this.recordResponseTime(Date.now() - startTime);
      this.updateHitRate();
      return null;

    } catch (error) {
      logger.error(`CacheLayer: Get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  public async set<T = unknown>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const fullKey = this.buildKey(key, options.namespace);
    const ttl = options.ttl ?? 3600;
    const expires = Date.now() + ttl * 1000;
    const serialized = this.serialize(value);
    const size = this.calculateSize(serialized);

    const entry: CacheEntry = {
      value: serialized,
      expires,
      tags: options.tags ?? [],
      priority: options.priority ?? 'normal',
      size,
      hits: 0,
      created: Date.now(),
      lastAccessed: Date.now(),
    };

    try {
      // Set in memory cache
      if (this.shouldCacheInMemory(size, entry.priority)) {
        this.setInMemory(fullKey, entry);
      }

      // Set in Redis if available
      if (this.isRedisAvailable && this.redis) {
        try {
          const redisValue = JSON.stringify(entry);
          await this.redis.setex(fullKey, ttl, redisValue);

          // Store tags for invalidation
          if (entry.tags.length > 0) {
            const pipeline = this.redis.pipeline();
            for (const tag of entry.tags) {
              pipeline.sadd(`tag:${tag}`, fullKey);
              pipeline.expire(`tag:${tag}`, ttl);
            }
            await pipeline.exec();
          }
        } catch (redisError) {
          logger.error('CacheLayer: Redis set error:', redisError);
        }
      }

      this.emit('set', { key: fullKey, size, ttl });

    } catch (error) {
      logger.error(`CacheLayer: Set error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete value from cache
   */
  public async delete(key: string, namespace?: string): Promise<boolean> {
    const fullKey = this.buildKey(key, namespace);
    let deleted = false;

    try {
      // Remove from memory
      if (this.memoryCache.has(fullKey)) {
        this.removeFromMemory(fullKey);
        deleted = true;
      }

      // Remove from Redis
      if (this.isRedisAvailable && this.redis) {
        try {
          const result = await this.redis.del(fullKey);
          deleted = deleted || result > 0;
        } catch (redisError) {
          logger.error('CacheLayer: Redis delete error:', redisError);
        }
      }

      if (deleted) {
        this.emit('delete', { key: fullKey });
      }

      return deleted;

    } catch (error) {
      logger.error(`CacheLayer: Delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  public async exists(key: string, namespace?: string): Promise<boolean> {
    const fullKey = this.buildKey(key, namespace);

    // Check memory
    const memoryEntry = this.memoryCache.get(fullKey);
    if (memoryEntry && memoryEntry.expires > Date.now()) {
      return true;
    }

    // Check Redis
    if (this.isRedisAvailable && this.redis) {
      try {
        const result = await this.redis.exists(fullKey);
        return result === 1;
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Get or set pattern (cache-aside)
   */
  public async getOrSet<T = unknown>(
    key: string,
    factory: () => Promise<T> | T,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  // ---------------------------------------------------------------------------
  // Invalidation Methods
  // ---------------------------------------------------------------------------

  /**
   * Invalidate cache entries by tags
   */
  public async invalidateByTags(tags: string[]): Promise<number> {
    let invalidated = 0;

    try {
      for (const tag of tags) {
        // Redis invalidation
        if (this.isRedisAvailable && this.redis) {
          try {
            const keys = await this.redis.smembers(`tag:${tag}`);
            if (keys.length > 0) {
              await this.redis.del(...keys);
              await this.redis.del(`tag:${tag}`);

              // Also remove from memory
              for (const key of keys) {
                if (this.memoryCache.has(key)) {
                  this.removeFromMemory(key);
                }
              }

              invalidated += keys.length;
            }
          } catch (redisError) {
            logger.error('CacheLayer: Redis invalidateByTags error:', redisError);
          }
        }

        // Memory-only invalidation
        for (const [key, entry] of this.memoryCache.entries()) {
          if (entry.tags.includes(tag)) {
            this.removeFromMemory(key);
            invalidated++;
          }
        }
      }

      if (invalidated > 0) {
        this.emit('invalidate', { tags, count: invalidated });
        logger.debug(`CacheLayer: Invalidated ${invalidated} entries by tags: ${tags.join(', ')}`);
      }

      return invalidated;

    } catch (error) {
      logger.error('CacheLayer: invalidateByTags error:', error);
      return 0;
    }
  }

  /**
   * Delete entries matching a pattern
   */
  public async deletePattern(pattern: string, namespace?: string): Promise<number> {
    let deleted = 0;
    const fullPattern = namespace ? `${namespace}:${pattern}` : pattern;
    const regex = new RegExp(fullPattern.replace(/\*/g, '.*'));

    try {
      // Delete from memory
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.removeFromMemory(key);
          deleted++;
        }
      }

      // Delete from Redis
      if (this.isRedisAvailable && this.redis) {
        try {
          const keys = await this.redis.keys(fullPattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
            deleted += keys.length;
          }
        } catch (redisError) {
          logger.error('CacheLayer: Redis deletePattern error:', redisError);
        }
      }

      return deleted;

    } catch (error) {
      logger.error('CacheLayer: deletePattern error:', error);
      return 0;
    }
  }

  /**
   * Clear all cache entries
   */
  public async clear(namespace?: string): Promise<void> {
    try {
      if (namespace) {
        await this.deletePattern(`${namespace}:*`);
      } else {
        // Clear memory
        this.memoryCache.clear();
        this.memorySize = 0;

        // Clear Redis
        if (this.isRedisAvailable && this.redis) {
          try {
            await this.redis.flushdb();
          } catch (redisError) {
            logger.error('CacheLayer: Redis clear error:', redisError);
          }
        }
      }

      this.emit('clear', { namespace });
      logger.info(`CacheLayer: Cache cleared${namespace ? ` (namespace: ${namespace})` : ''}`);

    } catch (error) {
      logger.error('CacheLayer: clear error:', error);
      throw error;
    }
  }

  /**
   * Alias for clear() to maintain compatibility
   */
  public async flush(): Promise<void> {
    return this.clear();
  }

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    return {
      ...this.stats,
      memoryUsage: this.memorySize,
      memoryEntries: this.memoryCache.size,
      redisAvailable: this.isRedisAvailable,
    };
  }

  /**
   * Get memory cache info
   */
  public getMemoryCacheInfo(): {
    entries: number;
    size: number;
    maxSize: number;
    utilization: number;
  } {
    return {
      entries: this.memoryCache.size,
      size: this.memorySize,
      maxSize: this.maxMemorySize,
      utilization: (this.memorySize / this.maxMemorySize) * 100,
    };
  }

  /**
   * Check if Redis is available
   */
  public isRedisConnected(): boolean {
    return this.isRedisAvailable;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Shutdown the cache layer
   */
  public async shutdown(): Promise<void> {
    logger.info('CacheLayer: Shutting down...');

    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close Redis connection
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        // Ignore quit errors
      }
      this.redis = null;
    }

    // Clear memory cache
    this.memoryCache.clear();
    this.memorySize = 0;
    this.isRedisAvailable = false;
    this.isInitialized = false;

    logger.info('CacheLayer: Shutdown complete');
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private buildKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  private serialize(value: unknown): unknown {
    try {
      return JSON.stringify(value);
    } catch {
      return value;
    }
  }

  private deserialize(value: unknown): unknown {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  private calculateSize(value: unknown): number {
    try {
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      return new TextEncoder().encode(str).length;
    } catch {
      return 1024; // Default estimate
    }
  }

  private shouldCacheInMemory(size: number, priority: string): boolean {
    // Don't cache items > 1MB in memory
    if (size > 1024 * 1024) return false;

    // Always cache high priority
    if (priority === 'high') return true;

    // Don't cache low priority if near memory limit
    if (this.memorySize + size > this.maxMemorySize * 0.9 && priority === 'low') {
      return false;
    }

    return true;
  }

  private setInMemory(key: string, entry: CacheEntry): void {
    // Evict entries if needed
    while (this.memorySize + entry.size > this.maxMemorySize) {
      if (!this.evictLRU()) {
        break;
      }
    }

    // Remove existing entry first
    const existing = this.memoryCache.get(key);
    if (existing) {
      this.memorySize -= existing.size;
    }

    this.memoryCache.set(key, entry);
    this.memorySize += entry.size;
  }

  private removeFromMemory(key: string): void {
    const entry = this.memoryCache.get(key);
    if (entry) {
      this.memoryCache.delete(key);
      this.memorySize = Math.max(0, this.memorySize - entry.size);
    }
  }

  private evictLRU(): boolean {
    let targetKey: string | null = null;
    let targetTime = Infinity;

    // First try to evict low priority items
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.priority === 'low' && entry.lastAccessed < targetTime) {
        targetKey = key;
        targetTime = entry.lastAccessed;
      }
    }

    // If no low priority, evict any non-high priority
    if (!targetKey) {
      targetTime = Infinity;
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.priority !== 'high' && entry.lastAccessed < targetTime) {
          targetKey = key;
          targetTime = entry.lastAccessed;
        }
      }
    }

    if (targetKey) {
      this.removeFromMemory(targetKey);
      this.stats.evictions++;
      return true;
    }

    return false;
  }

  private updateHitRate(): void {
    const total = this.stats.memoryHits + this.stats.memoryMisses +
                  this.stats.redisHits + this.stats.redisMisses;
    const hits = this.stats.memoryHits + this.stats.redisHits;
    this.stats.hitRate = total > 0 ? (hits / total) * 100 : 0;
  }

  private recordResponseTime(time: number): void {
    this.responseTimes.push(time);
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
    this.stats.avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;
  }

  private startCleanup(): void {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.expires <= now) {
          this.removeFromMemory(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.debug(`CacheLayer: Cleaned ${cleaned} expired entries`);
      }
    }, 60000);
  }
}

// ============================================================================
// Exports
// ============================================================================

/** Singleton cache layer instance */
export const cacheLayer = CacheLayer.getInstance();

/**
 * Legacy alias for backward compatibility with cacheService imports
 * @deprecated Use cacheLayer instead
 */
export const cacheService = cacheLayer;

/**
 * Legacy alias for backward compatibility with cachingService imports
 * @deprecated Use cacheLayer instead
 */
export const cachingService = cacheLayer;

// Default export
export default cacheLayer;

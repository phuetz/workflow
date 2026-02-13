/**
 * Advanced Caching Service
 * Multi-layer caching with Redis, memory, and smart invalidation
 */

import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { logger } from './LoggingService';
import { monitoringService } from './MonitoringService';
// import { config } from '../config/environment'; // eslint-disable-line @typescript-eslint/no-unused-vars

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for cache invalidation
  compress?: boolean; // Compress large values
  namespace?: string; // Cache namespace
  priority?: 'low' | 'normal' | 'high'; // Cache priority
  serialize?: boolean; // Serialize objects
}

interface CacheEntry {
  value: unknown;
  expires: number;
  tags: string[];
  priority: string;
  size: number;
  hits: number;
  created: number;
  lastAccessed: number;
}

interface CacheStats {
  memoryHits: number;
  memoryMisses: number;
  redisHits: number;
  redisMisses: number;
  totalRequests: number;
  hitRate: number;
  memoryUsage: number;
  redisConnections: number;
  avgResponseTime: number;
  evictions: number;
}

export class CachingService extends EventEmitter {
  private static instance: CachingService;
  private redis: Redis | null = null;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private memorySize = 0;
  private maxMemorySize = 100 * 1024 * 1024; // 100MB default
  private stats: CacheStats = {
    memoryHits: 0,
    memoryMisses: 0,
    redisHits: 0,
    redisMisses: 0,
    totalRequests: 0,
    hitRate: 0,
    memoryUsage: 0,
    redisConnections: 0,
    avgResponseTime: 0,
    evictions: 0
  };
  private cleanupInterval: NodeJS.Timeout | null = null;
  private statsInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.maxMemorySize = parseInt(process.env.CACHE_MEMORY_LIMIT || '104857600', 10);
  }

  public static getInstance(): CachingService {
    if (!CachingService.instance) {
      CachingService.instance = new CachingService();
    }
    return CachingService.instance;
  }

  /**
   * Initialize caching service
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize Redis if configured
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keepAlive: 30000,
          connectionName: 'workflow-cache'
        });

        this.redis.on('connect', () => {
          logger.info('📦 Redis cache connected');
          this.stats.redisConnections++;
        });

        this.redis.on('error', (error) => {
          logger.error('❌ Redis cache error:', error);
        });

        this.redis.on('close', () => {
          logger.warn('📦 Redis cache connection closed');
        });

        await this.redis.connect();
      }

      // Start cleanup and stats intervals
      this.startCleanup();
      this.startStatsCollection();

      logger.info('🗄️ Caching service initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize caching service:', error);
      throw error;
    }
  }

  /**
   * Get value from cache
   */
  public async get<T = unknown>(key: string, options: CacheOptions = {}): Promise<T | null> {
    this.stats.totalRequests++;

    try {

      // Check memory cache first
      if (memoryEntry && memoryEntry.expires > Date.now()) {
        memoryEntry.hits++;
        memoryEntry.lastAccessed = Date.now();
        this.stats.memoryHits++;
        this.updateHitRate();
        this.recordResponseTime(Date.now() - startTime);
        
        return this.deserializeValue(memoryEntry.value, options.serialize);
      }

      if (memoryEntry && memoryEntry.expires <= Date.now()) {
        // Expired entry, remove it
        this.removeFromMemory(fullKey);
      }

      // Check Redis cache
      if (this.redis) {
        if (redisValue !== null) {
          this.stats.redisHits++;
          
          // Store in memory cache for faster access
          if (this.shouldCacheInMemory(parsedValue, options)) {
            this.setInMemory(fullKey, parsedValue.value, parsedValue, options);
          }
          
          this.updateHitRate();
          this.recordResponseTime(Date.now() - startTime);
          
          return this.deserializeValue(parsedValue.value, options.serialize);
        } else {
          this.stats.redisMisses++;
        }
      } else {
        this.stats.memoryMisses++;
      }

      this.updateHitRate();
      this.recordResponseTime(Date.now() - startTime);
      return null;

    } catch (error) {
      logger.error(`❌ Cache get error for key ${key}:`, error);
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
    try {

        value: serializedValue,
        expires,
        tags: options.tags || [],
        priority: options.priority || 'normal',
        size,
        hits: 0,
        created: Date.now(),
        lastAccessed: Date.now()
      };

      // Set in memory cache
      if (this.shouldCacheInMemory(cacheEntry, options)) {
        this.setInMemory(fullKey, serializedValue, cacheEntry, options);
      }

      // Set in Redis cache
      if (this.redis) {
        if (options.compress && redisValue.length > 1024) {
          // Compress large values
          await this.redis.setex(`${fullKey}:compressed`, ttl, compressed);
        } else {
          await this.redis.setex(fullKey, ttl, redisValue);
        }

        // Store tags for invalidation
        if (options.tags && options.tags.length > 0) {
          for (const tag of options.tags) {
            await this.redis.sadd(`tag:${tag}`, fullKey);
            await this.redis.expire(`tag:${tag}`, ttl);
          }
        }
      }

      this.emit('set', { key: fullKey, size, ttl });

    } catch (error) {
      logger.error(`❌ Cache set error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete value from cache
   */
  public async delete(key: string, namespace?: string): Promise<boolean> {
    try {

      // Remove from memory cache
      if (this.memoryCache.has(fullKey)) {
        this.removeFromMemory(fullKey);
        deleted = true;
      }

      // Remove from Redis cache
      if (this.redis) {
        deleted = deleted || result > 0;
      }

      if (deleted) {
        this.emit('delete', { key: fullKey });
      }

      return deleted;

    } catch (error) {
      logger.error(`❌ Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  public async exists(key: string, namespace?: string): Promise<boolean> {
    try {

      // Check memory cache
      if (memoryEntry && memoryEntry.expires > Date.now()) {
        return true;
      }

      // Check Redis cache
      if (this.redis) {
        return exists === 1;
      }

      return false;

    } catch (error) {
      logger.error(`❌ Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get or set pattern - get value, if not found, compute and set
   */
  public async getOrSet<T = unknown>(
    key: string,
    factory: () => Promise<T> | T,
    options: CacheOptions = {}
  ): Promise<T> {
    try {
      // Try to get from cache first
      if (cached !== null) {
        return cached;
      }

      // Not in cache, compute value
      
      // Set in cache
      await this.set(key, value, options);
      
      return value;

    } catch (error) {
      logger.error(`❌ Cache getOrSet error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache by tags
   */
  public async invalidateByTags(tags: string[]): Promise<number> {

    try {
      for (const tag of tags) {
        // Get all keys with this tag from Redis
        if (this.redis) {
          
          if (keys.length > 0) {
            // Delete all keys
            await this.redis.del(...keys);
            
            // Remove from memory cache
            for (const key of keys) {
              if (this.memoryCache.has(key)) {
                this.removeFromMemory(key);
              }
            }
            
            // Clean up tag set
            await this.redis.del(`tag:${tag}`);
            
            invalidated += keys.length;
          }
        } else {
          // Invalidate from memory cache only
          for (const [key, entry] of this.memoryCache.entries()) {
            if (entry.tags.includes(tag)) {
              this.removeFromMemory(key);
              invalidated++;
            }
          }
        }
      }

      if (invalidated > 0) {
        this.emit('invalidate', { tags, count: invalidated });
        logger.info(`🗑️ Invalidated ${invalidated} cache entries by tags: ${tags.join(', ')}`);
      }

      return invalidated;

    } catch (error) {
      logger.error(`❌ Cache invalidation error for tags ${tags.join(', ')}:`, error);
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  public async clear(namespace?: string): Promise<void> {
    try {
      if (namespace) {
        // Clear specific namespace
        
        // Clear from memory
        for (const key of this.memoryCache.keys()) {
          if (key.startsWith(`${namespace}:`)) {
            this.removeFromMemory(key);
          }
        }
        
        // Clear from Redis
        if (this.redis) {
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        }
      } else {
        // Clear all
        this.memoryCache.clear();
        this.memorySize = 0;
        
        if (this.redis) {
          await this.redis.flushdb();
        }
      }

      this.emit('clear', { namespace });
      logger.info(`🧹 Cache cleared${namespace ? ` for namespace: ${namespace}` : ''}`);

    } catch (error) {
      logger.error('❌ Cache clear error:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    this.stats.memoryUsage = this.memorySize;
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? ((this.stats.memoryHits + this.stats.redisHits) / this.stats.totalRequests) * 100 
      : 0;

    return { ...this.stats };
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
      utilization: (this.memorySize / this.maxMemorySize) * 100
    };
  }

  private buildKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  private serializeValue(value: unknown, serialize = true): unknown {
    if (!serialize) return value;
    
    try {
      return JSON.stringify(value);
    } catch {
      logger.warn('Failed to serialize cache value, storing as-is');
      return value;
    }
  }

  private deserializeValue(value: unknown, serialize = true): unknown {
    if (!serialize) return value;
    
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      logger.warn('Failed to deserialize cache value, returning as-is');
      return value;
    }
  }

  private calculateSize(value: unknown): number {
    try {
      return Buffer.byteLength(str, 'utf8');
    } catch {
      return 1024; // Default size estimate
    }
  }

  private shouldCacheInMemory(entry: CacheEntry | unknown, _options: CacheOptions): boolean { // eslint-disable-line @typescript-eslint/no-unused-vars
    
    // Don't cache large values in memory
    if (size > 1024 * 1024) return false; // > 1MB
    
    // Always cache high priority items
    if (priority === 'high') return true;
    
    // Don't cache if memory is full and this is low priority
    if (this.memorySize + size > this.maxMemorySize && priority === 'low') {
      return false;
    }
    
    return true;
  }

  private setInMemory(key: string, _value: unknown, entry: CacheEntry, _options: CacheOptions): void { // eslint-disable-line @typescript-eslint/no-unused-vars
    
    // Ensure we have space
    while (this.memorySize + size > this.maxMemorySize) {
      if (!this.evictLRU()) {
        break; // No more items to evict
      }
    }

    this.memoryCache.set(key, entry);
    this.memorySize += size;
  }

  private removeFromMemory(key: string): void {
    if (entry) {
      this.memoryCache.delete(key);
      this.memorySize = Math.max(0, this.memorySize - entry.size);
    }
  }

  private evictLRU(): boolean {
    let oldestKey: string | null = null;

    // Find least recently used item with lowest priority
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.priority === 'low' && entry.lastAccessed < oldestTime) {
        oldestKey = key;
        oldestTime = entry.lastAccessed;
      }
    }

    // If no low priority items, find any LRU item
    if (!oldestKey) {
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.priority !== 'high' && entry.lastAccessed < oldestTime) {
          oldestKey = key;
          oldestTime = entry.lastAccessed;
        }
      }
    }

    if (oldestKey) {
      this.removeFromMemory(oldestKey);
      this.stats.evictions++;
      return true;
    }

    return false;
  }

  private async compressValue(value: string): Promise<string> {
    // Simple compression - in production you'd use a proper compression library
    return Buffer.from(value).toString('base64');
  }

  private async decompressValue(value: string): Promise<string> {
    return Buffer.from(value, 'base64').toString();
  }

  private updateHitRate(): void {
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? ((this.stats.memoryHits + this.stats.redisHits) / this.stats.totalRequests) * 100 
      : 0;
  }

  private recordResponseTime(time: number): void {
    this.stats.avgResponseTime = (this.stats.avgResponseTime + time) / 2;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Clean every minute
  }

  private cleanupExpired(): void {

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expires <= now) {
        this.removeFromMemory(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  private startStatsCollection(): void {
    this.statsInterval = setInterval(() => {
      // Record metrics
      monitoringService.recordMetric('cache.hit_rate', stats.hitRate, {}, '%');
      monitoringService.recordMetric('cache.memory_usage', stats.memoryUsage, {}, 'bytes');
      monitoringService.recordMetric('cache.total_requests', stats.totalRequests);
      monitoringService.recordMetric('cache.memory_hits', stats.memoryHits);
      monitoringService.recordMetric('cache.redis_hits', stats.redisHits);
      monitoringService.recordMetric('cache.avg_response_time', stats.avgResponseTime, {}, 'ms');
    }, 30000); // Collect every 30 seconds
  }

  /**
   * Shutdown caching service
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down caching service...');

    // Clear intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    // Close Redis connection
    if (this.redis) {
      await this.redis.disconnect();
    }

    // Clear memory cache
    this.memoryCache.clear();
    this.memorySize = 0;

    logger.info('✅ Caching service shutdown complete');
  }
}

export const cachingService = CachingService.getInstance();
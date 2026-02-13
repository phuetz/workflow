import { logger } from './LoggingService';
// BROWSER FIX: Import Redis uniquement côté serveur
let Redis: any = null;
let redisImportPromise: Promise<any> | null = null;

if (typeof window === 'undefined') {
  // Côté serveur (Node.js) - Import dynamique pour ES modules
  redisImportPromise = import('ioredis').then(module => {
    Redis = module.default || module;
    return Redis;
  }).catch(err => {
    logger.warn('Failed to import Redis:', err.message);
    return null;
  });
}

/**
 * Service de cache utilisant Redis pour améliorer les performances
 * Fallback vers cache mémoire dans le navigateur
 */
class CacheService {
  private redis: any = null;
  private memoryCache: Map<string, { value: any; expiry: number }> = new Map();
  private isRedisAvailable: boolean = false;

  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialise la connexion Redis avec retry strategy
   * Skip dans le navigateur
   */
  private async initializeRedis() {
    // BROWSER FIX: Ne pas initialiser Redis côté client
    if (typeof window !== 'undefined') {
      logger.debug('CacheService: Using memory cache only (browser environment)');
      this.isRedisAvailable = false;
      return;
    }

    try {
      // Attendre que Redis soit importé
      if (redisImportPromise) {
        await redisImportPromise;
      }

      if (!Redis) {
        logger.warn('Redis not available, using memory cache only');
        this.isRedisAvailable = false;
        return;
      }

      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          if (times > 10) {
            logger.warn('Redis unavailable, falling back to memory cache');
            this.isRedisAvailable = false;
            return null;
          }
          return delay;
        },
        lazyConnect: true
      });

      // Test connection
      await this.redis.ping();
      this.isRedisAvailable = true;
      logger.debug('Redis cache connected successfully');

      // Handle connection events
      this.redis.on('error', (err) => {
        logger.error('Redis error:', err);
        this.isRedisAvailable = false;
      });

      this.redis.on('connect', () => {
        logger.debug('Redis reconnected');
        this.isRedisAvailable = true;
      });

    } catch (error) {
      logger.warn('Redis not available, using memory cache only:', error);
      this.isRedisAvailable = false;
    }
  }

  /**
   * Récupère une valeur du cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    // Try memory cache first
    const memoryValue = this.getFromMemory(key);
    if (memoryValue !== null) {
      return memoryValue;
    }

    // Try Redis if available
    if (this.isRedisAvailable && this.redis) {
      try {
        const value = await this.redis.get(key);
        if (value) {
          const parsed = JSON.parse(value);
          // Store in memory cache for faster access
          this.setInMemory(key, parsed, 60); // 1 minute memory cache
          return parsed;
        }
      } catch (error) {
        logger.error('Redis get error:', error);
      }
    }

    return null;
  }

  /**
   * Stocke une valeur dans le cache
   */
  async set<T = any>(key: string, value: T, ttl: number = 3600): Promise<void> {
    // Always set in memory cache
    this.setInMemory(key, value, ttl);

    // Try to set in Redis if available
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.setex(key, ttl, JSON.stringify(value));
      } catch (error) {
        logger.error('Redis set error:', error);
      }
    }
  }

  /**
   * Supprime une clé du cache
   */
  async delete(key: string): Promise<void> {
    // Delete from memory cache
    this.memoryCache.delete(key);

    // Try to delete from Redis
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        logger.error('Redis delete error:', error);
      }
    }
  }

  /**
   * Supprime toutes les clés correspondant à un pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    // Clear matching keys from memory cache
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }

    // Try to delete from Redis
    if (this.isRedisAvailable && this.redis) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        logger.error('Redis deletePattern error:', error);
      }
    }
  }

  /**
   * Vide tout le cache
   */
  async flush(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Try to flush Redis
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.flushdb();
      } catch (error) {
        logger.error('Redis flush error:', error);
      }
    }
  }

  /**
   * Cache avec stratégie de récupération
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate value
    const value = await factory();
    
    // Store in cache
    await this.set(key, value, ttl);
    
    return value;
  }

  /**
   * Invalidation de cache par tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.deletePattern(`*:${tag}:*`);
    }
  }

  /**
   * Memory cache helpers
   */
  private getFromMemory(key: string): any | null {
    const item = this.memoryCache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.value;
  }

  private setInMemory(key: string, value: any, ttl: number): void {
    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + (ttl * 1000)
    });

    // Limit memory cache size
    if (this.memoryCache.size > 1000) {
      // Remove oldest entries
      const keysToDelete = Array.from(this.memoryCache.keys()).slice(0, 100);
      keysToDelete.forEach(k => this.memoryCache.delete(k));
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memoryCacheSize: this.memoryCache.size,
      redisAvailable: this.isRedisAvailable,
      memoryUsage: process.memoryUsage().heapUsed
    };
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    this.memoryCache.clear();
  }
}

// Export singleton instance
const cacheService = new CacheService();
export default cacheService;
export { CacheService };
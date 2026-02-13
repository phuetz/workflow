/**
 * Cache Manager
 * Intelligent caching with field-level control and invalidation strategies
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';

/**
 * Cache strategy
 */
export type CacheStrategy = 'field-level' | 'response' | 'query' | 'hybrid';

/**
 * Cache configuration
 */
export interface CacheConfig {
  strategy: CacheStrategy;
  defaultTTL: number; // seconds
  maxSize: number; // MB
  perFieldTTL?: Record<string, number>;
  perTypeTTL?: Record<string, number>;
  invalidationRules?: InvalidationRule[];
  redis?: RedisConfig;
}

/**
 * Redis configuration
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

/**
 * Invalidation rule
 */
export interface InvalidationRule {
  event: string;
  pattern?: string;
  fields?: string[];
  types?: string[];
}

/**
 * Cache entry
 */
interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  createdAt: number;
  expiresAt: number;
  hits: number;
  size: number;
  tags: string[];
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  totalSize: number; // bytes
  hitRate: number;
  hits: number;
  misses: number;
  evictions: number;
  averageTTL: number;
}

/**
 * CacheManager provides intelligent caching
 */
export class CacheManager extends EventEmitter {
  private config: CacheConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
  } = { hits: 0, misses: 0, evictions: 0 };

  constructor(config: CacheConfig) {
    super();
    this.config = config;
    this.startCleanupTask();
    this.setupInvalidationListeners();
  }

  /**
   * Get from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.emit('cache:miss', { key });
      return null;
    }

    const now = Date.now();

    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.emit('cache:expired', { key });
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    this.emit('cache:hit', { key, hits: entry.hits });

    return entry.value as T;
  }

  /**
   * Set in cache
   */
  async set(
    key: string,
    value: any,
    options?: {
      ttl?: number;
      tags?: string[];
    }
  ): Promise<void> {
    const ttl = (options?.ttl || this.config.defaultTTL) * 1000;
    const now = Date.now();
    const size = this.calculateSize(value);

    // Check size limit
    const maxSize = this.config.maxSize * 1024 * 1024;
    const currentSize = this.getTotalSize();

    if (currentSize + size > maxSize) {
      await this.evictLRU(size);
    }

    const entry: CacheEntry = {
      key,
      value,
      ttl,
      createdAt: now,
      expiresAt: now + ttl,
      hits: 0,
      size,
      tags: options?.tags || []
    };

    this.cache.set(key, entry);
    this.emit('cache:set', { key, size, ttl });
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);

    if (deleted) {
      this.emit('cache:delete', { key });
    }

    return deleted;
  }

  /**
   * Invalidate by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern);
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      this.emit('cache:invalidate-pattern', { pattern, count });
    }

    return count;
  }

  /**
   * Invalidate by tags
   */
  async invalidateTags(tags: string[]): Promise<number> {
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (tags.some(tag => entry.tags.includes(tag))) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      this.emit('cache:invalidate-tags', { tags, count });
    }

    return count;
  }

  /**
   * Cache GraphQL query result
   */
  async cacheQuery(
    query: string,
    variables: Record<string, any>,
    result: any,
    options?: {
      ttl?: number;
      tags?: string[];
    }
  ): Promise<void> {
    const key = this.generateQueryKey(query, variables);
    await this.set(key, result, options);
  }

  /**
   * Get cached query result
   */
  async getCachedQuery(
    query: string,
    variables: Record<string, any>
  ): Promise<any | null> {
    const key = this.generateQueryKey(query, variables);
    return this.get(key);
  }

  /**
   * Cache field result
   */
  async cacheField(
    typename: string,
    field: string,
    id: string,
    value: any,
    options?: { ttl?: number }
  ): Promise<void> {
    const key = this.generateFieldKey(typename, field, id);
    const ttl = options?.ttl || this.getFieldTTL(typename, field);

    await this.set(key, value, { ttl, tags: [typename, field] });
  }

  /**
   * Get cached field result
   */
  async getCachedField(
    typename: string,
    field: string,
    id: string
  ): Promise<any | null> {
    const key = this.generateFieldKey(typename, field, id);
    return this.get(key);
  }

  /**
   * Invalidate all cache entries for a type
   */
  async invalidateType(typename: string): Promise<number> {
    return this.invalidateTags([typename]);
  }

  /**
   * Generate query cache key
   */
  private generateQueryKey(query: string, variables: Record<string, any>): string {
    const hash = createHash('sha256');
    hash.update(query);
    hash.update(JSON.stringify(variables));
    return `query:${hash.digest('hex')}`;
  }

  /**
   * Generate field cache key
   */
  private generateFieldKey(typename: string, field: string, id: string): string {
    return `field:${typename}:${id}:${field}`;
  }

  /**
   * Get TTL for field
   */
  private getFieldTTL(typename: string, field: string): number {
    const fieldKey = `${typename}.${field}`;

    if (this.config.perFieldTTL?.[fieldKey]) {
      return this.config.perFieldTTL[fieldKey];
    }

    if (this.config.perTypeTTL?.[typename]) {
      return this.config.perTypeTTL[typename];
    }

    return this.config.defaultTTL;
  }

  /**
   * Calculate size of value in bytes
   */
  private calculateSize(value: any): number {
    return JSON.stringify(value).length;
  }

  /**
   * Get total cache size
   */
  private getTotalSize(): number {
    let total = 0;

    for (const entry of this.cache.values()) {
      total += entry.size;
    }

    return total;
  }

  /**
   * Evict least recently used entries
   */
  private async evictLRU(neededSpace: number): Promise<void> {
    const entries = Array.from(this.cache.entries());

    // Sort by hits (least used first)
    entries.sort((a, b) => a[1].hits - b[1].hits);

    let freedSpace = 0;

    for (const [key, entry] of entries) {
      this.cache.delete(key);
      freedSpace += entry.size;
      this.stats.evictions++;
      this.emit('cache:evict', { key, reason: 'lru' });

      if (freedSpace >= neededSpace) {
        break;
      }
    }
  }

  /**
   * Setup invalidation listeners
   */
  private setupInvalidationListeners(): void {
    if (!this.config.invalidationRules) {
      return;
    }

    for (const rule of this.config.invalidationRules) {
      this.on(rule.event, async () => {
        if (rule.pattern) {
          await this.invalidatePattern(rule.pattern);
        }

        if (rule.types) {
          for (const type of rule.types) {
            await this.invalidateType(type);
          }
        }

        if (rule.fields) {
          await this.invalidateTags(rule.fields);
        }
      });
    }
  }

  /**
   * Start cleanup task
   */
  private startCleanupTask(): void {
    setInterval(() => {
      const now = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
          this.emit('cache:expire', { key });
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalEntries = entries.length;
    const totalSize = this.getTotalSize();
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    const averageTTL =
      totalEntries > 0
        ? entries.reduce((sum, e) => sum + e.ttl, 0) / totalEntries / 1000
        : 0;

    return {
      totalEntries,
      totalSize,
      hitRate,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      averageTTL
    };
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.emit('cache:clear');
  }

  /**
   * Export cache state
   */
  exportState(): Record<string, CacheEntry> {
    return Object.fromEntries(this.cache);
  }

  /**
   * Import cache state
   */
  importState(state: Record<string, CacheEntry>): void {
    this.cache = new Map(Object.entries(state));
    this.emit('cache:import', { count: this.cache.size });
  }
}

export default CacheManager;

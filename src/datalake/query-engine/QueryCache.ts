/**
 * QueryCache - Query result caching with LRU eviction
 */

import type { QueryResult, CacheEntry, CacheStats } from './types';

export class QueryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize = 1000, defaultTTL = 300000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  get(queryHash: string): QueryResult | null {
    const entry = this.cache.get(queryHash);

    if (!entry) return null;

    if (new Date() > entry.expiresAt) {
      this.cache.delete(queryHash);
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = new Date();

    return { ...entry.result, fromCache: true };
  }

  set(queryHash: string, result: QueryResult, ttl?: number): void {
    // Evict if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(queryHash, {
      result,
      expiresAt: new Date(Date.now() + (ttl || this.defaultTTL)),
      accessCount: 1,
      lastAccessed: new Date()
    });
  }

  invalidate(queryHash: string): void {
    this.cache.delete(queryHash);
  }

  invalidateByTable(_tableName: string): void {
    // In a real implementation, track which queries use which tables
    // For now, clear all cache entries
    this.cache.clear();
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): CacheStats {
    let totalAccess = 0;
    this.cache.forEach(entry => {
      totalAccess += entry.accessCount;
    });

    return {
      size: this.cache.size,
      hitRate: this.cache.size > 0 ? totalAccess / this.cache.size : 0,
      avgAccessCount: this.cache.size > 0 ? totalAccess / this.cache.size : 0
    };
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = new Date();

    this.cache.forEach((entry, key) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

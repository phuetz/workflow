/**
 * Result Cache - Intelligent result caching with compression
 * Caches workflow execution results to avoid redundant processing
 */

import { EventEmitter } from 'events';
import { gzipSync, gunzipSync } from 'zlib';
import { logger } from '../../services/SimpleLogger';
import { SafeExecutionResult } from '../../utils/TypeSafetyUtils';
import {
  CacheConfig,
  CacheEntry,
  CacheMetrics
} from '../../types/taskrunner';

export class ResultCache extends EventEmitter {
  private config: Required<CacheConfig>;
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = []; // For LRU
  private accessFrequency: Map<string, number> = new Map(); // For LFU
  private totalSize = 0; // bytes

  // Metrics
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalBytesStored: 0,
    totalBytesCompressed: 0
  };

  // Cleanup interval
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    super();

    this.config = {
      maxSize: config.maxSize || 500, // 500 MB
      maxEntries: config.maxEntries || 10000,
      ttl: config.ttl || 3600000, // 1 hour
      evictionPolicy: config.evictionPolicy || 'lru',
      compressionEnabled: config.compressionEnabled !== false,
      compressionThreshold: config.compressionThreshold || 1024 // 1KB
    };

    this.initialize();
  }

  private initialize(): void {
    logger.info('Result cache initialized', {
      maxSize: `${this.config.maxSize} MB`,
      maxEntries: this.config.maxEntries,
      ttl: `${this.config.ttl}ms`,
      evictionPolicy: this.config.evictionPolicy,
      compressionEnabled: this.config.compressionEnabled
    });

    // Start TTL cleanup
    this.startCleanup();
  }

  /**
   * Get cached result
   */
  get(key: string): SafeExecutionResult | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      logger.debug('Cache miss', { key });
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.metrics.misses++;
      logger.debug('Cache expired', { key });
      return null;
    }

    // Update access tracking
    entry.hits++;
    entry.lastAccessedAt = Date.now();
    this.updateAccessTracking(key);

    // Decompress if needed
    let value = entry.value;
    if (entry.compressed && typeof value === 'string') {
      try {
        const decompressed = gunzipSync(Buffer.from(value, 'base64')).toString('utf-8');
        value = JSON.parse(decompressed);
      } catch (error) {
        logger.error('Failed to decompress cache entry', { key, error });
        this.delete(key);
        this.metrics.misses++;
        return null;
      }
    }

    this.metrics.hits++;
    logger.debug('Cache hit', {
      key,
      hits: entry.hits,
      compressed: entry.compressed
    });

    return value;
  }

  /**
   * Set cache entry
   */
  set(key: string, value: SafeExecutionResult, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.config.ttl);

    // Serialize value
    let serialized = JSON.stringify(value);
    let size = Buffer.byteLength(serialized, 'utf-8');
    let compressed = false;

    // Compress if enabled and size exceeds threshold
    if (this.config.compressionEnabled && size > this.config.compressionThreshold) {
      try {
        const compressedData = gzipSync(serialized);
        const compressedSize = compressedData.length;

        // Only use compression if it reduces size
        if (compressedSize < size) {
          serialized = compressedData.toString('base64') as never;
          this.metrics.totalBytesCompressed += (size - compressedSize);
          size = compressedSize;
          compressed = true;

          logger.debug('Compressed cache entry', {
            key,
            originalSize: size,
            compressedSize,
            ratio: ((1 - compressedSize / size) * 100).toFixed(2) + '%'
          });
        }
      } catch (error) {
        logger.error('Failed to compress cache entry', { key, error });
      }
    }

    // Check if we need to evict entries
    const existingEntry = this.cache.get(key);
    const sizeIncrease = existingEntry ? size - existingEntry.size : size;

    if (this.shouldEvict(sizeIncrease)) {
      this.evict(sizeIncrease);
    }

    // Remove existing entry size if updating
    if (existingEntry) {
      this.totalSize -= existingEntry.size;
    }

    // Create cache entry
    const entry: CacheEntry = {
      key,
      value: serialized as never,
      size,
      hits: 0,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt,
      compressed
    };

    // Add to cache
    this.cache.set(key, entry);
    this.totalSize += size;
    this.metrics.totalBytesStored += size;

    // Update access tracking
    this.updateAccessTracking(key);

    logger.debug('Cache entry set', {
      key,
      size: `${(size / 1024).toFixed(2)} KB`,
      compressed,
      totalSize: `${(this.totalSize / 1024 / 1024).toFixed(2)} MB`,
      entries: this.cache.size
    });

    this.emit('entry_added', key, entry);
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    this.cache.delete(key);
    this.totalSize -= entry.size;

    // Remove from access tracking
    const lruIndex = this.accessOrder.indexOf(key);
    if (lruIndex > -1) {
      this.accessOrder.splice(lruIndex, 1);
    }
    this.accessFrequency.delete(key);

    logger.debug('Cache entry deleted', { key });
    this.emit('entry_removed', key);

    return true;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder = [];
    this.accessFrequency.clear();
    this.totalSize = 0;

    logger.info('Cache cleared', { entriesRemoved: size });
    this.emit('cache_cleared');
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? this.metrics.hits / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.metrics.misses / totalRequests : 0;

    const compressionRatio = this.metrics.totalBytesStored > 0
      ? this.metrics.totalBytesCompressed / this.metrics.totalBytesStored
      : 0;

    return {
      totalEntries: this.cache.size,
      totalSizeMB: this.totalSize / 1024 / 1024,
      hitRate,
      missRate,
      evictions: this.metrics.evictions,
      compressionRatio
    };
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.values());

    const stats = {
      entries: this.cache.size,
      totalSize: this.totalSize,
      totalSizeMB: this.totalSize / 1024 / 1024,
      averageEntrySize: entries.length > 0 ? this.totalSize / entries.length : 0,
      compressedEntries: entries.filter(e => e.compressed).length,
      metrics: this.getMetrics(),
      topEntries: this.getTopEntries(10),
      oldestEntry: entries.reduce((oldest, entry) =>
        entry.createdAt < oldest.createdAt ? entry : oldest,
        entries[0]
      ),
      newestEntry: entries.reduce((newest, entry) =>
        entry.createdAt > newest.createdAt ? entry : newest,
        entries[0]
      )
    };

    return stats;
  }

  /**
   * Get top N most accessed entries
   */
  private getTopEntries(n: number): CacheEntry[] {
    return Array.from(this.cache.values())
      .sort((a, b) => b.hits - a.hits)
      .slice(0, n);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private shouldEvict(sizeIncrease: number): boolean {
    // Check entry count limit
    if (this.cache.size >= this.config.maxEntries) {
      return true;
    }

    // Check size limit (in bytes)
    const maxSizeBytes = this.config.maxSize * 1024 * 1024;
    if (this.totalSize + sizeIncrease > maxSizeBytes) {
      return true;
    }

    return false;
  }

  private evict(targetSize: number): void {
    logger.debug('Evicting cache entries', {
      policy: this.config.evictionPolicy,
      targetSize: `${(targetSize / 1024).toFixed(2)} KB`
    });

    let freedSize = 0;
    const toEvict: string[] = [];

    switch (this.config.evictionPolicy) {
      case 'lru':
        toEvict.push(...this.evictLRU(targetSize));
        break;

      case 'lfu':
        toEvict.push(...this.evictLFU(targetSize));
        break;

      case 'fifo':
        toEvict.push(...this.evictFIFO(targetSize));
        break;

      default:
        toEvict.push(...this.evictLRU(targetSize));
    }

    // Delete evicted entries
    for (const key of toEvict) {
      const entry = this.cache.get(key);
      if (entry) {
        freedSize += entry.size;
        this.delete(key);
        this.metrics.evictions++;
      }

      // Stop if we've freed enough space
      if (freedSize >= targetSize) {
        break;
      }
    }

    logger.info('Evicted cache entries', {
      count: toEvict.length,
      freedSize: `${(freedSize / 1024).toFixed(2)} KB`
    });

    this.emit('entries_evicted', toEvict.length, freedSize);
  }

  private evictLRU(targetSize: number): string[] {
    // Evict least recently used entries
    const entries: Array<{ key: string; lastAccessed: number }> = [];

    for (const [key, entry] of this.cache.entries()) {
      entries.push({ key, lastAccessed: entry.lastAccessedAt });
    }

    entries.sort((a, b) => a.lastAccessed - b.lastAccessed);

    let freedSize = 0;
    const toEvict: string[] = [];

    for (const entry of entries) {
      const cacheEntry = this.cache.get(entry.key);
      if (cacheEntry) {
        toEvict.push(entry.key);
        freedSize += cacheEntry.size;

        if (freedSize >= targetSize) {
          break;
        }
      }
    }

    return toEvict;
  }

  private evictLFU(targetSize: number): string[] {
    // Evict least frequently used entries
    const entries: Array<{ key: string; hits: number }> = [];

    for (const [key, entry] of this.cache.entries()) {
      entries.push({ key, hits: entry.hits });
    }

    entries.sort((a, b) => a.hits - b.hits);

    let freedSize = 0;
    const toEvict: string[] = [];

    for (const entry of entries) {
      const cacheEntry = this.cache.get(entry.key);
      if (cacheEntry) {
        toEvict.push(entry.key);
        freedSize += cacheEntry.size;

        if (freedSize >= targetSize) {
          break;
        }
      }
    }

    return toEvict;
  }

  private evictFIFO(targetSize: number): string[] {
    // Evict oldest entries first
    const entries: Array<{ key: string; created: number }> = [];

    for (const [key, entry] of this.cache.entries()) {
      entries.push({ key, created: entry.createdAt });
    }

    entries.sort((a, b) => a.created - b.created);

    let freedSize = 0;
    const toEvict: string[] = [];

    for (const entry of entries) {
      const cacheEntry = this.cache.get(entry.key);
      if (cacheEntry) {
        toEvict.push(entry.key);
        freedSize += cacheEntry.size;

        if (freedSize >= targetSize) {
          break;
        }
      }
    }

    return toEvict;
  }

  private updateAccessTracking(key: string): void {
    // Update LRU order
    const lruIndex = this.accessOrder.indexOf(key);
    if (lruIndex > -1) {
      this.accessOrder.splice(lruIndex, 1);
    }
    this.accessOrder.push(key);

    // Update LFU frequency
    const currentFreq = this.accessFrequency.get(key) || 0;
    this.accessFrequency.set(key, currentFreq + 1);
  }

  private startCleanup(): void {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000);
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        toDelete.push(key);
      }
    }

    if (toDelete.length > 0) {
      logger.info('Cleaning up expired cache entries', { count: toDelete.length });

      for (const key of toDelete) {
        this.delete(key);
      }

      this.emit('expired_entries_cleaned', toDelete.length);
    }
  }

  /**
   * Shutdown the cache
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.clear();
    this.removeAllListeners();

    logger.info('Result cache shutdown');
  }
}

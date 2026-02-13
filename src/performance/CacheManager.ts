import { logger } from '../services/SimpleLogger';
/**
 * Cache Management System
 *
 * Provides centralized caching with multiple strategies:
 * - Memory cache (LRU)
 * - LocalStorage cache (persistent)
 * - IndexedDB cache (large data)
 * - Session cache (temporary)
 *
 * Features:
 * - TTL (Time To Live) support
 * - Cache size limits
 * - Cache invalidation
 * - Cache statistics
 * - Automatic cleanup
 *
 * Usage:
 * import { CacheManager } from '@/performance/CacheManager';
 *
 * const cache = CacheManager.getInstance();
 * await cache.set('key', data, { ttl: 3600000 }); // 1 hour
 * const data = await cache.get('key');
 */

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  storage?: 'memory' | 'local' | 'session' | 'indexeddb';
  tags?: string[]; // For cache invalidation
  priority?: 'low' | 'normal' | 'high';
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  expiresAt: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Approximate size in bytes
  tags: string[];
  priority: 'low' | 'normal' | 'high';
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  itemCount: number;
  hitRate: number;
}

const DEFAULT_TTL = 3600000; // 1 hour
const MAX_MEMORY_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_ITEMS = 1000;
const CLEANUP_INTERVAL = 60000; // 1 minute

export class CacheManager {
  private static instance: CacheManager;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
    itemCount: 0,
    hitRate: 0,
  };
  private cleanupInterval: number | null = null;
  private db: IDBDatabase | null = null;
  private dbReady: Promise<void>;

  private constructor() {
    this.startCleanup();
    this.dbReady = this.initIndexedDB();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Initialize IndexedDB for large data caching
   */
  private async initIndexedDB(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WorkflowCache', 1);

      request.onerror = () => {
        logger.warn('IndexedDB not available');
        resolve();
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Set a value in the cache
   */
  public async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const {
      ttl = DEFAULT_TTL,
      storage = 'memory',
      tags = [],
      priority = 'normal',
    } = options;

    const entry: CacheEntry<T> = {
      key,
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      size: this.estimateSize(value),
      tags,
      priority,
    };

    switch (storage) {
      case 'memory':
        await this.setMemoryCache(entry);
        break;
      case 'local':
        await this.setLocalStorage(entry);
        break;
      case 'session':
        await this.setSessionStorage(entry);
        break;
      case 'indexeddb':
        await this.setIndexedDB(entry);
        break;
    }
  }

  /**
   * Get a value from the cache
   */
  public async get<T>(
    key: string,
    storage: CacheOptions['storage'] = 'memory'
  ): Promise<T | null> {
    let entry: CacheEntry<T> | null = null;

    switch (storage) {
      case 'memory':
        entry = this.getMemoryCache(key);
        break;
      case 'local':
        entry = this.getLocalStorage(key);
        break;
      case 'session':
        entry = this.getSessionStorage(key);
        break;
      case 'indexeddb':
        entry = await this.getIndexedDB(key);
        break;
    }

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      await this.delete(key, storage);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    this.stats.hits++;
    this.updateHitRate();

    return entry.value;
  }

  /**
   * Memory cache operations
   */
  private async setMemoryCache<T>(entry: CacheEntry<T>): Promise<void> {
    // Check size limit
    if (this.stats.totalSize + entry.size > MAX_MEMORY_SIZE) {
      await this.evictLRU();
    }

    // Check item limit
    if (this.memoryCache.size >= MAX_ITEMS) {
      await this.evictLRU();
    }

    this.memoryCache.set(entry.key, entry as CacheEntry);
    this.stats.totalSize += entry.size;
    this.stats.itemCount = this.memoryCache.size;
  }

  private getMemoryCache<T>(key: string): CacheEntry<T> | null {
    const entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;
    return entry || null;
  }

  /**
   * LocalStorage operations
   */
  private async setLocalStorage<T>(entry: CacheEntry<T>): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const serialized = JSON.stringify(entry);
      localStorage.setItem(`cache:${entry.key}`, serialized);
    } catch (error) {
      logger.warn('LocalStorage full, clearing old entries');
      this.clearExpiredLocalStorage();
      // Retry
      try {
        const serialized = JSON.stringify(entry);
        localStorage.setItem(`cache:${entry.key}`, serialized);
      } catch {
        logger.error('Failed to set LocalStorage cache');
      }
    }
  }

  private getLocalStorage<T>(key: string): CacheEntry<T> | null {
    if (typeof window === 'undefined') return null;

    try {
      const serialized = localStorage.getItem(`cache:${key}`);
      if (!serialized) return null;
      return JSON.parse(serialized) as CacheEntry<T>;
    } catch {
      return null;
    }
  }

  /**
   * SessionStorage operations
   */
  private async setSessionStorage<T>(entry: CacheEntry<T>): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const serialized = JSON.stringify(entry);
      sessionStorage.setItem(`cache:${entry.key}`, serialized);
    } catch (error) {
      logger.warn('SessionStorage full');
    }
  }

  private getSessionStorage<T>(key: string): CacheEntry<T> | null {
    if (typeof window === 'undefined') return null;

    try {
      const serialized = sessionStorage.getItem(`cache:${key}`);
      if (!serialized) return null;
      return JSON.parse(serialized) as CacheEntry<T>;
    } catch {
      return null;
    }
  }

  /**
   * IndexedDB operations
   */
  private async setIndexedDB<T>(entry: CacheEntry<T>): Promise<void> {
    await this.dbReady;
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getIndexedDB<T>(key: string): Promise<CacheEntry<T> | null> {
    await this.dbReady;
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => resolve(null);
    });
  }

  /**
   * Delete a cache entry
   */
  public async delete(
    key: string,
    storage: CacheOptions['storage'] = 'memory'
  ): Promise<void> {
    switch (storage) {
      case 'memory':
        const entry = this.memoryCache.get(key);
        if (entry) {
          this.stats.totalSize -= entry.size;
          this.memoryCache.delete(key);
          this.stats.itemCount = this.memoryCache.size;
        }
        break;
      case 'local':
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`cache:${key}`);
        }
        break;
      case 'session':
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(`cache:${key}`);
        }
        break;
      case 'indexeddb':
        await this.deleteIndexedDB(key);
        break;
    }
  }

  private async deleteIndexedDB(key: string): Promise<void> {
    await this.dbReady;
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }

  /**
   * Invalidate cache by tags
   */
  public async invalidateByTags(tags: string[]): Promise<void> {
    const keysToDelete: string[] = [];

    // Memory cache
    this.memoryCache.forEach((entry, key) => {
      if (entry.tags.some(tag => tags.includes(tag))) {
        keysToDelete.push(key);
      }
    });

    // Delete all matching keys
    for (const key of keysToDelete) {
      await this.delete(key, 'memory');
    }

    // LocalStorage
    if (typeof window !== 'undefined') {
      const lsKeys = Object.keys(localStorage).filter(k => k.startsWith('cache:'));
      for (const lsKey of lsKeys) {
        const key = lsKey.replace('cache:', '');
        const entry = this.getLocalStorage(key);
        if (entry && entry.tags.some(tag => tags.includes(tag))) {
          localStorage.removeItem(lsKey);
        }
      }
    }
  }

  /**
   * Clear all cache
   */
  public async clear(storage?: CacheOptions['storage']): Promise<void> {
    if (!storage || storage === 'memory') {
      this.memoryCache.clear();
      this.stats.totalSize = 0;
      this.stats.itemCount = 0;
    }

    if (!storage || storage === 'local') {
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('cache:'));
        keys.forEach(k => localStorage.removeItem(k));
      }
    }

    if (!storage || storage === 'session') {
      if (typeof window !== 'undefined') {
        const keys = Object.keys(sessionStorage).filter(k => k.startsWith('cache:'));
        keys.forEach(k => sessionStorage.removeItem(k));
      }
    }

    if (!storage || storage === 'indexeddb') {
      await this.clearIndexedDB();
    }
  }

  private async clearIndexedDB(): Promise<void> {
    await this.dbReady;
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }

  /**
   * Evict least recently used entry
   */
  private async evictLRU(): Promise<void> {
    let lruKey: string | null = null;
    let lruTime = Infinity;
    let lruPriority: 'low' | 'normal' | 'high' = 'high';

    // Find LRU entry with lowest priority
    this.memoryCache.forEach((entry, key) => {
      // Prioritize evicting low priority items
      if (entry.priority === 'low' && lruPriority !== 'low') {
        lruKey = key;
        lruTime = entry.lastAccessed;
        lruPriority = 'low';
      } else if (
        entry.priority === lruPriority &&
        entry.lastAccessed < lruTime
      ) {
        lruKey = key;
        lruTime = entry.lastAccessed;
      }
    });

    if (lruKey) {
      await this.delete(lruKey, 'memory');
      this.stats.evictions++;
    }
  }

  /**
   * Cleanup expired entries
   */
  private async cleanup(): Promise<void> {
    const now = Date.now();
    const keysToDelete: string[] = [];

    // Memory cache
    this.memoryCache.forEach((entry, key) => {
      if (entry.expiresAt < now) {
        keysToDelete.push(key);
      }
    });

    for (const key of keysToDelete) {
      await this.delete(key, 'memory');
    }

    // LocalStorage
    this.clearExpiredLocalStorage();
  }

  private clearExpiredLocalStorage(): void {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    const keys = Object.keys(localStorage).filter(k => k.startsWith('cache:'));

    for (const lsKey of keys) {
      try {
        const serialized = localStorage.getItem(lsKey);
        if (!serialized) continue;

        const entry = JSON.parse(serialized) as CacheEntry;
        if (entry.expiresAt < now) {
          localStorage.removeItem(lsKey);
        }
      } catch {
        // Invalid entry, remove it
        localStorage.removeItem(lsKey);
      }
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    if (typeof window === 'undefined') return;

    this.cleanupInterval = window.setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL);
  }

  /**
   * Stop cleanup interval
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Estimate size of value
   */
  private estimateSize(value: any): number {
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch {
      return 0;
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
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
      evictions: 0,
      totalSize: this.stats.totalSize,
      itemCount: this.stats.itemCount,
      hitRate: 0,
    };
  }

  /**
   * Get all cache keys
   */
  public getKeys(): string[] {
    return Array.from(this.memoryCache.keys());
  }

  /**
   * Check if key exists
   */
  public async has(
    key: string,
    storage: CacheOptions['storage'] = 'memory'
  ): Promise<boolean> {
    const value = await this.get(key, storage);
    return value !== null;
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();

/**
 * Cache Manager
 * Multi-tier caching system with Redis, memory, and distributed caching
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface CacheConfig {
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    cluster?: boolean;
    nodes?: Array<{ host: string; port: number }>;
  };
  memory?: {
    maxSize: number; // MB
    maxItems: number;
    ttl: number; // seconds
  };
  distributed?: {
    enabled: boolean;
    nodes: string[];
    replicationFactor: number;
  };
  compression?: {
    enabled: boolean;
    threshold: number; // bytes
    algorithm: 'gzip' | 'lz4' | 'snappy';
  };
  serialization?: {
    format: 'json' | 'msgpack' | 'protobuf';
    binary: boolean;
  };
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
  size: number;
  compressed: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  totalSize: number;
  avgAccessTime: number;
  evictions: number;
  compressionRatio: number;
  memoryUsage: {
    used: number;
    available: number;
    percentage: number;
  };
  redis?: {
    connected: boolean;
    memory: number;
    keyspace: number;
    replication: boolean;
  };
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compression?: boolean;
  priority?: 'low' | 'normal' | 'high';
  namespace?: string;
  serialize?: boolean;
}

export enum CacheEvictionPolicy {
  LRU = 'lru',
  LFU = 'lfu',
  FIFO = 'fifo',
  TTL = 'ttl',
  RANDOM = 'random'
}

export enum CacheLevel {
  L1_MEMORY = 'l1_memory',
  L2_REDIS = 'l2_redis',
  L3_DISTRIBUTED = 'l3_distributed'
}

export class CacheManager extends EventEmitter {
  private config: CacheConfig;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private redisClient: unknown;
  private distributedNodes: Map<string, unknown> = new Map();
  private stats: CacheStats;
  private compressionEnabled: boolean;
  private evictionPolicy: CacheEvictionPolicy = CacheEvictionPolicy.LRU;
  private cleanupTimer: NodeJS.Timeout;
  
  constructor(config: CacheConfig) {
    super();
    this.config = config;
    this.compressionEnabled = config.compression?.enabled || false;
    
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalKeys: 0,
      totalSize: 0,
      avgAccessTime: 0,
      evictions: 0,
      compressionRatio: 1,
      memoryUsage: {
        used: 0,
        available: config.memory?.maxSize || 100,
        percentage: 0
      }
    };
    
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    // Initialize Redis if configured
    if (this.config.redis) {
      await this.initializeRedis();
    }
    
    // Initialize distributed cache if configured
    if (this.config.distributed?.enabled) {
      await this.initializeDistributedCache();
    }
    
    // Start cleanup timer
    this.startCleanupTimer();
    
    this.emit('initialized', {
      redis: !!this.redisClient,
      distributed: this.distributedNodes.size > 0,
      memory: true
    });
  }
  
  private async initializeRedis(): Promise<void> {
    try {
      // In a real implementation, would use actual Redis client
      this.redisClient = {
        connected: true,
        async get(_key: string) { // eslint-disable-line @typescript-eslint/no-unused-vars
          // Simulate Redis get
          return null;
        },
        async set(_key: string, _value: unknown, _ttl?: number) { // eslint-disable-line @typescript-eslint/no-unused-vars
          // Simulate Redis set
          return 'OK';
        },
        async del(_key: string) { // eslint-disable-line @typescript-eslint/no-unused-vars
          // Simulate Redis delete
          return 1;
        },
        async exists(_key: string) { // eslint-disable-line @typescript-eslint/no-unused-vars
          // Simulate Redis exists
          return 0;
        },
        async ttl(_key: string) { // eslint-disable-line @typescript-eslint/no-unused-vars
          // Simulate Redis TTL
          return -1;
        },
        async keys(_pattern: string) { // eslint-disable-line @typescript-eslint/no-unused-vars
          // Simulate Redis keys
          return [];
        },
        async flushdb() {
          // Simulate Redis flush
          return 'OK';
        }
      };
      
      this.emit('redisConnected', { 
        host: this.config.redis!.host,
        port: this.config.redis!.port
      });
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.emit('redisError', error);
    }
  }
  
  private async initializeDistributedCache(): Promise<void> {
    // Initialize distributed cache nodes
    for (const node of this.config.distributed!.nodes) {
      try {
        // In a real implementation, would connect to actual distributed cache nodes
        this.distributedNodes.set(node, {
          connected: true,
          async get(_key: string) { return null; }, // eslint-disable-line @typescript-eslint/no-unused-vars
          async set(_key: string, _value: unknown, _ttl?: number) { return true; }, // eslint-disable-line @typescript-eslint/no-unused-vars
          async del(_key: string) { return true; } // eslint-disable-line @typescript-eslint/no-unused-vars
        });
        
        this.emit('distributedNodeConnected', { node });
      } catch (error) {
        console.error(`Failed to connect to distributed node ${node}:`, error);
      }
    }
  }
  
  private startCleanupTimer(): void {
    // Clean up expired entries every 60 seconds
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000);
  }
  
  // Core Cache Operations
  
  public async get<T = unknown>(
    key: string,
    options?: { namespace?: string; level?: CacheLevel }
  ): Promise<T | null> {
    const startTime = Date.now();
    const fullKey = this.buildKey(key, options?.namespace);
    
    try {
      let entry: CacheEntry<T> | null = null;
      let level: CacheLevel = CacheLevel.L1_MEMORY;
      
      // Try L1 (Memory) cache first
      entry = this.getFromMemory<T>(fullKey);
      
      // Try L2 (Redis) cache if not found in memory
      if (!entry && this.redisClient && (!options?.level || options.level !== CacheLevel.L1_MEMORY)) {
        entry = await this.getFromRedis<T>(fullKey);
        level = CacheLevel.L2_REDIS;
        
        // Promote to L1 cache if found
        if (entry) {
          this.setInMemory(fullKey, entry.value, { ttl: entry.ttl, tags: entry.tags });
        }
      }
      
      // Try L3 (Distributed) cache if not found
      if (!entry && this.distributedNodes.size > 0 && (!options?.level || options.level === CacheLevel.L3_DISTRIBUTED)) {
        entry = await this.getFromDistributed<T>(fullKey);
        level = CacheLevel.L3_DISTRIBUTED;
        
        // Promote to upper levels if found
        if (entry) {
          if (this.redisClient) {
            await this.setInRedis(fullKey, entry.value, { ttl: entry.ttl, tags: entry.tags });
          }
          this.setInMemory(fullKey, entry.value, { ttl: entry.ttl, tags: entry.tags });
        }
      }
      
      const accessTime = Date.now() - startTime;
      
      if (entry && !this.isExpired(entry)) {
        // Update access statistics
        entry.accessCount++;
        entry.lastAccessed = new Date();
        
        this.stats.hits++;
        this.updateAccessTime(accessTime);
        
        this.emit('cacheHit', {
          key: fullKey,
          level,
          accessTime,
          size: entry.size,
          accessCount: entry.accessCount
        });
        
        return entry.value;
      } else {
        this.stats.misses++;
        this.updateHitRate();
        
        this.emit('cacheMiss', {
          key: fullKey,
          accessTime,
          searchedLevels: this.getSearchedLevels(options?.level)
        });
        
        return null;
      }
    } catch (error) {
      this.emit('cacheError', { operation: 'get', key: fullKey, error });
      return null;
    }
  }
  
  public async set<T = unknown>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<boolean> {
    const fullKey = this.buildKey(key, options?.namespace);
    
    try {
      const entry = this.createCacheEntry(fullKey, value, options);
      
      // Set in all configured cache levels
      const promises: Promise<boolean>[] = [];
      
      // L1 (Memory) cache
      promises.push(Promise.resolve(this.setInMemory(fullKey, value, options)));
      
      // L2 (Redis) cache
      if (this.redisClient) {
        promises.push(this.setInRedis(fullKey, value, options));
      }
      
      // L3 (Distributed) cache
      if (this.distributedNodes.size > 0) {
        promises.push(this.setInDistributed(fullKey, value, options));
      }
      
      const results = await Promise.allSettled(promises);
      const success = results.some(r => r.status === 'fulfilled' && r.value);
      
      if (success) {
        this.stats.totalKeys++;
        this.stats.totalSize += entry.size;
        this.updateMemoryUsage();
        
        this.emit('cacheSet', {
          key: fullKey,
          size: entry.size,
          ttl: entry.ttl,
          compressed: entry.compressed,
          levels: this.getActiveLevels()
        });
      }
      
      return success;
    } catch (error) {
      this.emit('cacheError', { operation: 'set', key: fullKey, error });
      return false;
    }
  }
  
  public async del(key: string, options?: { namespace?: string }): Promise<boolean> {
    const fullKey = this.buildKey(key, options?.namespace);
    
    try {
      const promises: Promise<boolean>[] = [];
      
      // Delete from all cache levels
      promises.push(Promise.resolve(this.deleteFromMemory(fullKey)));
      
      if (this.redisClient) {
        promises.push(this.deleteFromRedis(fullKey));
      }
      
      if (this.distributedNodes.size > 0) {
        promises.push(this.deleteFromDistributed(fullKey));
      }
      
      const results = await Promise.allSettled(promises);
      const success = results.some(r => r.status === 'fulfilled' && r.value);
      
      if (success) {
        this.stats.totalKeys = Math.max(0, this.stats.totalKeys - 1);
        this.updateMemoryUsage();
        
        this.emit('cacheDelete', { key: fullKey });
      }
      
      return success;
    } catch (error) {
      this.emit('cacheError', { operation: 'delete', key: fullKey, error });
      return false;
    }
  }
  
  public async exists(key: string, options?: { namespace?: string }): Promise<boolean> {
    const fullKey = this.buildKey(key, options?.namespace);
    
    // Check memory cache first
    if (this.memoryCache.has(fullKey)) {
      const entry = this.memoryCache.get(fullKey)!;
      return !this.isExpired(entry);
    }
    
    // Check Redis cache
    if (this.redisClient) {
      const exists = await this.redisClient.exists(fullKey);
      if (exists) return true;
    }
    
    // Check distributed cache
    if (this.distributedNodes.size > 0) {
      for (const node of this.distributedNodes.values()) {
        const value = await node.get(fullKey);
        if (value !== null) return true;
      }
    }
    
    return false;
  }
  
  public async clear(options?: { namespace?: string; tags?: string[] }): Promise<number> {
    let clearedCount = 0;
    
    try {
      if (options?.namespace || options?.tags) {
        // Clear specific namespace or tagged entries
        clearedCount = await this.clearFiltered(options);
      } else {
        // Clear all caches
        clearedCount = await this.clearAll();
      }
      
      this.emit('cacheCleared', { 
        clearedCount,
        namespace: options?.namespace,
        tags: options?.tags
      });
      
      return clearedCount;
    } catch (error) {
      this.emit('cacheError', { operation: 'clear', error });
      return 0;
    }
  }
  
  // Cache Level Implementations
  
  private getFromMemory<T>(key: string): CacheEntry<T> | null {
    const entry = this.memoryCache.get(key) as CacheEntry<T>;
    
    if (!entry || this.isExpired(entry)) {
      if (entry) {
        this.memoryCache.delete(key);
      }
      return null;
    }
    
    return entry;
  }
  
  private setInMemory<T>(key: string, value: T, options?: CacheOptions): boolean {
    const entry = this.createCacheEntry(key, value, options);
    
    // Check memory limits
    if (this.shouldEvict()) {
      this.evictEntries();
    }
    
    this.memoryCache.set(key, entry);
    return true;
  }
  
  private deleteFromMemory(key: string): boolean {
    return this.memoryCache.delete(key);
  }
  
  private async getFromRedis<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.redisClient) return null;
    
    try {
      const data = await this.redisClient.get(key);
      if (!data) return null;
      
      const entry = this.deserialize<CacheEntry<T>>(data);
      return entry;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }
  
  private async setInRedis<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    if (!this.redisClient) return false;
    
    try {
      const entry = this.createCacheEntry(key, value, options);
      const serialized = this.serialize(entry);
      
      if (options?.ttl) {
        await this.redisClient.set(key, serialized, options.ttl);
      } else {
        await this.redisClient.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }
  
  private async deleteFromRedis(key: string): Promise<boolean> {
    if (!this.redisClient) return false;
    
    try {
      const result = await this.redisClient.del(key);
      return result > 0;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }
  
  private async getFromDistributed<T>(key: string): Promise<CacheEntry<T> | null> {
    if (this.distributedNodes.size === 0) return null;
    
    const nodeId = this.getNodeForKey(key);
    const node = this.distributedNodes.get(nodeId);
    
    if (!node) return null;
    
    try {
      const data = await node.get(key);
      if (!data) return null;
      
      return this.deserialize<CacheEntry<T>>(data);
    } catch (error) {
      console.error('Distributed cache get error:', error);
      return null;
    }
  }
  
  private async setInDistributed<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    if (this.distributedNodes.size === 0) return false;
    
    const entry = this.createCacheEntry(key, value, options);
    const serialized = this.serialize(entry);
    
    // Write to multiple nodes based on replication factor
    const replicationFactor = this.config.distributed?.replicationFactor || 1;
    const nodes = this.getNodesForKey(key, replicationFactor);
    
    const promises = nodes.map(async (nodeId) => {
      const node = this.distributedNodes.get(nodeId);
      if (!node) return false;
      
      try {
        return await node.set(key, serialized, options?.ttl);
      } catch (error) {
        console.error(`Distributed cache set error for node ${nodeId}:`, error);
        return false;
      }
    });
    
    const results = await Promise.allSettled(promises);
    return results.some(r => r.status === 'fulfilled' && r.value);
  }
  
  private async deleteFromDistributed(key: string): Promise<boolean> {
    if (this.distributedNodes.size === 0) return false;
    
    const promises = Array.from(this.distributedNodes.values()).map(async (node) => {
      try {
        return await node.del(key);
      } catch (error) {
        console.error('Distributed cache delete error:', error);
        return false;
      }
    });
    
    const results = await Promise.allSettled(promises);
    return results.some(r => r.status === 'fulfilled' && r.value);
  }
  
  // Utility Methods
  
  private createCacheEntry<T>(key: string, value: T, options?: CacheOptions): CacheEntry<T> {
    const now = new Date();
    const ttl = options?.ttl || this.config.memory?.ttl || 3600;
    const serialized = this.serialize(value);
    
    let compressed = false;
    let size = serialized.length;
    
    if (this.compressionEnabled && 
        size > (this.config.compression?.threshold || 1024)) {
      // Simulate compression
      size = Math.floor(size * 0.7); // Assume 30% compression
      compressed = true;
    }
    
    return {
      key,
      value,
      ttl,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttl * 1000),
      accessCount: 1,
      lastAccessed: now,
      size,
      compressed,
      tags: options?.tags || [],
      metadata: {
        priority: options?.priority || 'normal',
        namespace: options?.namespace
      }
    };
  }
  
  private isExpired(entry: CacheEntry): boolean {
    return entry.expiresAt < new Date();
  }
  
  private buildKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }
  
  private serialize<T>(value: T): string {
    const format = this.config.serialization?.format || 'json';
    
    switch (format) {
      case 'json':
        return JSON.stringify(value);
      case 'msgpack':
        // Would use actual msgpack library
        return JSON.stringify(value);
      case 'protobuf':
        // Would use actual protobuf library
        return JSON.stringify(value);
      default:
        return JSON.stringify(value);
    }
  }
  
  private deserialize<T>(data: string): T {
    const format = this.config.serialization?.format || 'json';
    
    switch (format) {
      case 'json':
        return JSON.parse(data);
      case 'msgpack':
        // Would use actual msgpack library
        return JSON.parse(data);
      case 'protobuf':
        // Would use actual protobuf library
        return JSON.parse(data);
      default:
        return JSON.parse(data);
    }
  }
  
  private getNodeForKey(key: string): string {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const nodeIndex = parseInt(hash.substring(0, 8), 16) % this.distributedNodes.size;
    return Array.from(this.distributedNodes.keys())[nodeIndex];
  }
  
  private getNodesForKey(key: string, count: number): string[] {
    const nodes = Array.from(this.distributedNodes.keys());
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const startIndex = parseInt(hash.substring(0, 8), 16) % nodes.length;
    
    const selectedNodes: string[] = [];
    for (let i = 0; i < Math.min(count, nodes.length); i++) {
      const index = (startIndex + i) % nodes.length;
      selectedNodes.push(nodes[index]);
    }
    
    return selectedNodes;
  }
  
  private shouldEvict(): boolean {
    const memoryConfig = this.config.memory;
    if (!memoryConfig) return false;
    
    const currentSize = this.stats.memoryUsage.used;
    const maxSize = memoryConfig.maxSize;
    const maxItems = memoryConfig.maxItems;
    
    return currentSize > maxSize || this.memoryCache.size > maxItems;
  }
  
  private evictEntries(): void {
    const entriesToEvict = Math.max(1, Math.floor(this.memoryCache.size * 0.1)); // Evict 10%
    
    const entries = Array.from(this.memoryCache.entries());
    
    switch (this.evictionPolicy) {
      case CacheEvictionPolicy.LRU:
        entries.sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime());
        break;
      case CacheEvictionPolicy.LFU:
        entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
        break;
      case CacheEvictionPolicy.FIFO:
        entries.sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime());
        break;
      case CacheEvictionPolicy.TTL:
        entries.sort((a, b) => a[1].expiresAt.getTime() - b[1].expiresAt.getTime());
        break;
      case CacheEvictionPolicy.RANDOM:
        // Shuffle array
        for (let i = entries.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [entries[i], entries[j]] = [entries[j], entries[i]];
        }
        break;
    }
    
    for (let i = 0; i < entriesToEvict && i < entries.length; i++) {
      const [key] = entries[i];
      this.memoryCache.delete(key);
      this.stats.evictions++;
      
      this.emit('cacheEviction', { 
        key, 
        policy: this.evictionPolicy,
        reason: 'memory_pressure'
      });
    }
    
    this.updateMemoryUsage();
  }
  
  private cleanup(): void {
    const now = new Date();
    let expiredCount = 0;
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      this.stats.totalKeys -= expiredCount;
      this.updateMemoryUsage();
      
      this.emit('cacheCleanup', { 
        expiredEntries: expiredCount,
        timestamp: now
      });
    }
  }
  
  private async clearAll(): Promise<number> {
    let totalCleared = 0;
    
    // Clear memory cache
    totalCleared += this.memoryCache.size;
    this.memoryCache.clear();
    
    // Clear Redis cache
    if (this.redisClient) {
      await this.redisClient.flushdb();
    }
    
    // Clear distributed cache
    for (const node of this.distributedNodes.values()) {
      try {
        // Would implement actual clear method
        await node.clear?.();
      } catch (error) {
        console.error('Error clearing distributed node:', error);
      }
    }
    
    this.resetStats();
    return totalCleared;
  }
  
  private async clearFiltered(options: { namespace?: string; tags?: string[] }): Promise<number> {
    let clearedCount = 0;
    
    // Clear from memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      let shouldClear = false;
      
      if (options.namespace && key.startsWith(`${options.namespace}:`)) {
        shouldClear = true;
      }
      
      if (options.tags && options.tags.some(tag => entry.tags.includes(tag))) {
        shouldClear = true;
      }
      
      if (shouldClear) {
        this.memoryCache.delete(key);
        clearedCount++;
      }
    }
    
    // Clear from Redis and distributed caches (simplified)
    // In practice, would need to scan keys and filter
    
    this.updateMemoryUsage();
    return clearedCount;
  }
  
  private updateAccessTime(accessTime: number): void {
    const totalAccesses = this.stats.hits + this.stats.misses;
    this.stats.avgAccessTime = (this.stats.avgAccessTime * (totalAccesses - 1) + accessTime) / totalAccesses;
  }
  
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
  
  private updateMemoryUsage(): void {
    const used = Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + entry.size, 0) / (1024 * 1024); // Convert to MB
    
    this.stats.memoryUsage.used = used;
    this.stats.memoryUsage.percentage = (used / this.stats.memoryUsage.available) * 100;
    this.stats.totalSize = used;
  }
  
  private resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.hitRate = 0;
    this.stats.totalKeys = 0;
    this.stats.totalSize = 0;
    this.stats.evictions = 0;
    this.updateMemoryUsage();
  }
  
  private getSearchedLevels(requestedLevel?: CacheLevel): CacheLevel[] {
    if (requestedLevel) return [requestedLevel];
    
    const levels: CacheLevel[] = [CacheLevel.L1_MEMORY];
    if (this.redisClient) levels.push(CacheLevel.L2_REDIS);
    if (this.distributedNodes.size > 0) levels.push(CacheLevel.L3_DISTRIBUTED);
    
    return levels;
  }
  
  private getActiveLevels(): CacheLevel[] {
    const levels: CacheLevel[] = [CacheLevel.L1_MEMORY];
    if (this.redisClient) levels.push(CacheLevel.L2_REDIS);
    if (this.distributedNodes.size > 0) levels.push(CacheLevel.L3_DISTRIBUTED);
    
    return levels;
  }
  
  // Public API
  
  public getStats(): CacheStats {
    this.updateMemoryUsage();
    
    if (this.redisClient) {
      this.stats.redis = {
        connected: true,
        memory: 0, // Would get from Redis INFO
        keyspace: 0, // Would get from Redis DBSIZE
        replication: false
      };
    }
    
    return { ...this.stats };
  }
  
  public setEvictionPolicy(policy: CacheEvictionPolicy): void {
    this.evictionPolicy = policy;
    this.emit('evictionPolicyChanged', { policy });
  }
  
  public getEvictionPolicy(): CacheEvictionPolicy {
    return this.evictionPolicy;
  }
  
  public async warmup(keys: Array<{ key: string; fetcher: () => Promise<unknown>; options?: CacheOptions }>): Promise<number> {
    let warmedCount = 0;
    
    const warmupPromises = keys.map(async ({ key, fetcher, options }) => {
      try {
        const value = await fetcher();
        const success = await this.set(key, value, options);
        if (success) warmedCount++;
      } catch (error) {
        console.error(`Warmup failed for key ${key}:`, error);
      }
    });
    
    await Promise.all(warmupPromises);
    
    this.emit('cacheWarmedUp', { warmedCount, totalKeys: keys.length });
    
    return warmedCount;
  }
  
  public async mget<T = unknown>(keys: string[], options?: { namespace?: string }): Promise<Array<T | null>> {
    const results: Array<T | null> = [];
    
    for (const key of keys) {
      const value = await this.get<T>(key, options);
      results.push(value);
    }
    
    return results;
  }
  
  public async mset<T = unknown>(entries: Array<{ key: string; value: T; options?: CacheOptions }>): Promise<boolean[]> {
    const results: boolean[] = [];
    
    for (const { key, value, options } of entries) {
      const success = await this.set(key, value, options);
      results.push(success);
    }
    
    return results;
  }
  
  public async getByTag<T = unknown>(tag: string): Promise<Array<{ key: string; value: T }>> {
    const results: Array<{ key: string; value: T }> = [];
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.tags.includes(tag) && !this.isExpired(entry)) {
        results.push({ key, value: entry.value });
      }
    }
    
    return results;
  }
  
  public async invalidateByTag(tag: string): Promise<number> {
    let invalidatedCount = 0;
    
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.tags.includes(tag)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      const success = await this.del(key);
      if (success) invalidatedCount++;
    }
    
    this.emit('tagInvalidated', { tag, invalidatedCount });
    
    return invalidatedCount;
  }
  
  public async touch(key: string, ttl?: number, options?: { namespace?: string }): Promise<boolean> {
    const fullKey = this.buildKey(key, options?.namespace);
    const entry = this.memoryCache.get(fullKey);
    
    if (!entry || this.isExpired(entry)) {
      return false;
    }
    
    const newTtl = ttl || entry.ttl;
    entry.ttl = newTtl;
    entry.expiresAt = new Date(Date.now() + newTtl * 1000);
    
    // Update in Redis if available
    if (this.redisClient) {
      try {
        await this.redisClient.expire(fullKey, newTtl);
      } catch (error) {
        console.error('Error updating TTL in Redis:', error);
      }
    }
    
    this.emit('cacheTouched', { key: fullKey, ttl: newTtl });
    
    return true;
  }
  
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.memoryCache.clear();
    
    if (this.redisClient) {
      // Would close Redis connection
      this.redisClient = null;
    }
    
    this.distributedNodes.clear();
    
    this.emit('destroyed');
  }
}
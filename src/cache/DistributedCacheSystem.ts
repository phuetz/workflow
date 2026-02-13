/**
 * Distributed Cache System
 * High-performance caching with Redis support and multi-tier architecture
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { logger } from '../services/SimpleLogger';

export interface CacheConfig {
  strategy: CacheStrategy;
  tiers: CacheTier[];
  defaultTTL: number;
  maxSize: number;
  evictionPolicy: EvictionPolicy;
  compression: boolean;
  encryption: boolean;
  clustering: ClusterConfig;
  persistence: PersistenceConfig;
  monitoring: boolean;
}

export type CacheStrategy = 
  | 'single-tier'
  | 'multi-tier'
  | 'distributed'
  | 'hybrid'
  | 'edge';

export interface CacheTier {
  name: string;
  type: 'memory' | 'redis' | 'memcached' | 'disk' | 'cdn';
  priority: number;
  maxSize: number;
  ttl?: number;
  config?: any;
}

export type EvictionPolicy = 
  | 'LRU' // Least Recently Used
  | 'LFU' // Least Frequently Used
  | 'FIFO' // First In First Out
  | 'TTL' // Time To Live based
  | 'ARC' // Adaptive Replacement Cache
  | 'RANDOM';

export interface ClusterConfig {
  enabled: boolean;
  nodes: string[];
  replication: number;
  sharding: ShardingStrategy;
  consistency: 'strong' | 'eventual' | 'weak';
}

export type ShardingStrategy = 
  | 'hash'
  | 'range'
  | 'consistent-hash'
  | 'geo'
  | 'custom';

export interface PersistenceConfig {
  enabled: boolean;
  interval: number;
  location: string;
  format: 'json' | 'binary' | 'compressed';
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  metadata: CacheMetadata;
  compressed?: boolean;
  encrypted?: boolean;
}

export interface CacheMetadata {
  created: Date;
  accessed: Date;
  modified: Date;
  hits: number;
  size: number;
  ttl?: number;
  expires?: Date;
  tags?: string[];
  dependencies?: string[];
  version?: number;
}

export interface CacheStatistics {
  hits: number;
  misses: number;
  evictions: number;
  writes: number;
  deletes: number;
  size: number;
  itemCount: number;
  hitRate: number;
  avgLatency: number;
  memoryUsage: number;
}

export interface CachePattern {
  name: string;
  pattern: RegExp | string;
  ttl?: number;
  tags?: string[];
  preload?: boolean;
  refresh?: RefreshStrategy;
}

export interface RefreshStrategy {
  type: 'interval' | 'on-expire' | 'on-demand' | 'predictive';
  interval?: number;
  predictor?: (entry: CacheEntry) => boolean;
}

export interface CacheTransaction {
  id: string;
  operations: CacheOperation[];
  status: 'pending' | 'committed' | 'rolled-back';
  timestamp: Date;
}

export interface CacheOperation {
  type: 'get' | 'set' | 'delete' | 'invalidate';
  key: string;
  value?: any;
  options?: any;
}

export class DistributedCacheSystem extends EventEmitter {
  private config: CacheConfig;
  private tiers: Map<string, CacheTierInstance> = new Map();
  private patterns: Map<string, CachePattern> = new Map();
  private statistics: CacheStatistics;
  private transactions: Map<string, CacheTransaction> = new Map();
  private locks: Map<string, CacheLock> = new Map();
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map();
  private compressionEnabled: boolean;
  private encryptionKey?: Buffer;

  constructor(config?: Partial<CacheConfig>) {
    super();
    this.config = {
      strategy: 'multi-tier',
      tiers: this.getDefaultTiers(),
      defaultTTL: 3600000, // 1 hour
      maxSize: 100 * 1024 * 1024, // 100MB
      evictionPolicy: 'LRU',
      compression: true,
      encryption: false,
      clustering: {
        enabled: false,
        nodes: [],
        replication: 1,
        sharding: 'consistent-hash',
        consistency: 'eventual'
      },
      persistence: {
        enabled: false,
        interval: 300000, // 5 minutes
        location: './cache',
        format: 'compressed'
      },
      monitoring: true,
      ...config
    };

    this.statistics = this.createEmptyStatistics();
    this.compressionEnabled = this.config.compression;
    
    if (this.config.encryption) {
      this.encryptionKey = crypto.randomBytes(32);
    }

    this.initialize();
  }

  /**
   * Initialize cache system
   */
  private initialize(): void {
    // Initialize cache tiers
    this.initializeTiers();

    // Load patterns
    this.loadDefaultPatterns();

    // Start persistence if enabled
    if (this.config.persistence.enabled) {
      this.startPersistence();
    }

    // Start monitoring
    if (this.config.monitoring) {
      this.startMonitoring();
    }

    logger.info('Distributed cache system initialized');
  }

  /**
   * Initialize cache tiers
   */
  private initializeTiers(): void {
    for (const tierConfig of this.config.tiers) {
      const tier = this.createTier(tierConfig);
      this.tiers.set(tierConfig.name, tier);
    }
  }

  /**
   * Create cache tier instance
   */
  private createTier(config: CacheTier): CacheTierInstance {
    switch (config.type) {
      case 'memory':
        return new MemoryCacheTier(config);
      case 'redis':
        return new RedisCacheTier(config);
      case 'disk':
        return new DiskCacheTier(config);
      default:
        return new MemoryCacheTier(config);
    }
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string, options?: {
    tier?: string;
    refresh?: boolean;
    touch?: boolean;
  }): Promise<T | undefined> {
    const startTime = Date.now();

    try {
      // Check specific tier if specified
      if (options?.tier) {
        const tier = this.tiers.get(options.tier);
        if (tier) {
          const result = await this.getFromTier<T>(tier, key, options);
          if (result !== undefined) {
            this.updateStatistics('hit', Date.now() - startTime);
            return result;
          }
        }
      } else {
        // Check all tiers in priority order
        const sortedTiers = Array.from(this.tiers.values())
          .sort((a, b) => a.config.priority - b.config.priority);

        for (const tier of sortedTiers) {
          const result = await this.getFromTier<T>(tier, key, options);
          if (result !== undefined) {
            // Promote to higher tiers if found in lower tier
            await this.promoteToHigherTiers(key, result, tier);
            this.updateStatistics('hit', Date.now() - startTime);
            return result;
          }
        }
      }

      // Cache miss
      this.updateStatistics('miss', Date.now() - startTime);
      
      // Check if should refresh
      if (options?.refresh) {
        await this.refreshEntry(key);
      }

      return undefined;

    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      this.emit('error', { operation: 'get', key, error });
      return undefined;
    }
  }

  /**
   * Get from specific tier
   */
  private async getFromTier<T>(
    tier: CacheTierInstance,
    key: string,
    options?: any
  ): Promise<T | undefined> {
    const entry = await tier.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (entry.metadata.expires && entry.metadata.expires < new Date()) {
      await tier.delete(key);
      return undefined;
    }

    // Update access time if touch enabled
    if (options?.touch) {
      entry.metadata.accessed = new Date();
      entry.metadata.hits++;
      await tier.set(key, entry);
    }

    // Decompress if needed
    let value = entry.value;
    if (entry.compressed && this.compressionEnabled) {
      value = await this.decompress(value);
    }

    // Decrypt if needed
    if (entry.encrypted && this.encryptionKey) {
      value = await this.decrypt(value);
    }

    return value;
  }

  /**
   * Set value in cache
   */
  async set<T = any>(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      tier?: string;
      tags?: string[];
      dependencies?: string[];
      overwrite?: boolean;
    }
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Check if key exists and overwrite is false
      if (options?.overwrite === false) {
        const existing = await this.get(key);
        if (existing !== undefined) {
          return;
        }
      }

      // Prepare value
      let processedValue: any = value;
      let compressed = false;
      let encrypted = false;

      // Compress if enabled
      if (this.compressionEnabled) {
        processedValue = await this.compress(processedValue);
        compressed = true;
      }

      // Encrypt if enabled
      if (this.encryptionKey) {
        processedValue = await this.encrypt(processedValue);
        encrypted = true;
      }

      // Create cache entry
      const entry: CacheEntry<T> = {
        key,
        value: processedValue as T,
        metadata: {
          created: new Date(),
          accessed: new Date(),
          modified: new Date(),
          hits: 0,
          size: this.getSize(processedValue),
          ttl: options?.ttl || this.config.defaultTTL,
          expires: options?.ttl 
            ? new Date(Date.now() + options.ttl)
            : new Date(Date.now() + this.config.defaultTTL),
          tags: options?.tags,
          dependencies: options?.dependencies,
          version: 1
        },
        compressed,
        encrypted
      };

      // Set in specified tier or all tiers based on strategy
      if (options?.tier) {
        const tier = this.tiers.get(options.tier);
        if (tier) {
          await tier.set(key, entry);
        }
      } else {
        await this.setInTiers(key, entry);
      }

      // Handle dependencies
      if (options?.dependencies) {
        await this.handleDependencies(key, options.dependencies);
      }

      // Setup refresh if pattern matches
      await this.setupRefresh(key, entry);

      this.updateStatistics('write', Date.now() - startTime);
      this.emit('set', { key, size: entry.metadata.size });

    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      this.emit('error', { operation: 'set', key, error });
      throw error;
    }
  }

  /**
   * Set in multiple tiers based on strategy
   */
  private async setInTiers(key: string, entry: CacheEntry): Promise<void> {
    switch (this.config.strategy) {
      case 'single-tier':
        const primaryTier = Array.from(this.tiers.values())[0];
        if (primaryTier) {
          await primaryTier.set(key, entry);
        }
        break;

      case 'multi-tier':
        // Set in all tiers
        for (const tier of this.tiers.values()) {
          await tier.set(key, entry);
        }
        break;

      case 'distributed':
        // Set in specific node based on sharding
        const targetTier = this.getShardedTier(key);
        if (targetTier) {
          await targetTier.set(key, entry);
          
          // Replicate if configured
          if (this.config.clustering.replication > 1) {
            await this.replicate(key, entry);
          }
        }
        break;

      case 'hybrid':
        // Set in memory tier and one persistent tier
        const memoryTier = Array.from(this.tiers.values())
          .find(t => t.config.type === 'memory');
        const persistentTier = Array.from(this.tiers.values())
          .find(t => t.config.type !== 'memory');
        
        if (memoryTier) await memoryTier.set(key, entry);
        if (persistentTier) await persistentTier.set(key, entry);
        break;
    }
  }

  /**
   * Delete from cache
   */
  async delete(key: string | string[]): Promise<void> {
    const keys = Array.isArray(key) ? key : [key];

    for (const k of keys) {
      // Delete from all tiers
      for (const tier of this.tiers.values()) {
        await tier.delete(k);
      }

      // Clear refresh timer
      if (this.refreshTimers.has(k)) {
        clearTimeout(this.refreshTimers.get(k)!);
        this.refreshTimers.delete(k);
      }

      // Clear lock
      this.locks.delete(k);

      this.statistics.deletes++;
    }

    this.emit('delete', { keys });
  }

  /**
   * Invalidate cache entries
   */
  async invalidate(options: {
    keys?: string[];
    tags?: string[];
    pattern?: string | RegExp;
    all?: boolean;
  }): Promise<number> {
    let invalidated = 0;

    if (options.all) {
      // Clear all cache
      for (const tier of this.tiers.values()) {
        invalidated += await tier.clear();
      }
    } else if (options.keys) {
      // Invalidate specific keys
      await this.delete(options.keys);
      invalidated = options.keys.length;
    } else if (options.tags) {
      // Invalidate by tags
      for (const tier of this.tiers.values()) {
        const keys = await tier.getKeysByTags(options.tags);
        for (const key of keys) {
          await tier.delete(key);
          invalidated++;
        }
      }
    } else if (options.pattern) {
      // Invalidate by pattern
      const regex = typeof options.pattern === 'string' 
        ? new RegExp(options.pattern)
        : options.pattern;
      
      for (const tier of this.tiers.values()) {
        const keys = await tier.getAllKeys();
        for (const key of keys) {
          if (regex.test(key)) {
            await tier.delete(key);
            invalidated++;
          }
        }
      }
    }

    this.emit('invalidate', { invalidated, options });
    return invalidated;
  }

  /**
   * Begin transaction
   */
  beginTransaction(): string {
    const transactionId = `tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    const transaction: CacheTransaction = {
      id: transactionId,
      operations: [],
      status: 'pending',
      timestamp: new Date()
    };

    this.transactions.set(transactionId, transaction);
    return transactionId;
  }

  /**
   * Add operation to transaction
   */
  addToTransaction(
    transactionId: string,
    operation: CacheOperation
  ): void {
    const transaction = this.transactions.get(transactionId);
    
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (transaction.status !== 'pending') {
      throw new Error(`Transaction ${transactionId} is not pending`);
    }

    transaction.operations.push(operation);
  }

  /**
   * Commit transaction
   */
  async commitTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (transaction.status !== 'pending') {
      throw new Error(`Transaction ${transactionId} is not pending`);
    }

    try {
      // Execute all operations
      for (const op of transaction.operations) {
        switch (op.type) {
          case 'set':
            await this.set(op.key, op.value, op.options);
            break;
          case 'delete':
            await this.delete(op.key);
            break;
          case 'invalidate':
            await this.invalidate(op.options);
            break;
        }
      }

      transaction.status = 'committed';
      this.emit('transaction:committed', transaction);

    } catch (error) {
      // Rollback on error
      await this.rollbackTransaction(transactionId);
      throw error;
    }
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Mark as rolled back
    transaction.status = 'rolled-back';
    
    // In a real implementation, would restore previous values
    this.emit('transaction:rolled-back', transaction);
  }

  /**
   * Lock key for exclusive access
   */
  async lock(key: string, ttl = 5000): Promise<string> {
    const lockId = crypto.randomBytes(16).toString('hex');
    const existingLock = this.locks.get(key);

    if (existingLock && existingLock.expires > new Date()) {
      throw new Error(`Key ${key} is already locked`);
    }

    const lock: CacheLock = {
      id: lockId,
      key,
      acquired: new Date(),
      expires: new Date(Date.now() + ttl)
    };

    this.locks.set(key, lock);

    // Auto-unlock after TTL
    setTimeout(() => {
      const currentLock = this.locks.get(key);
      if (currentLock?.id === lockId) {
        this.locks.delete(key);
      }
    }, ttl);

    return lockId;
  }

  /**
   * Unlock key
   */
  unlock(key: string, lockId: string): void {
    const lock = this.locks.get(key);
    
    if (!lock) {
      return;
    }

    if (lock.id !== lockId) {
      throw new Error('Invalid lock ID');
    }

    this.locks.delete(key);
  }

  /**
   * Warm up cache
   */
  async warmUp(patterns?: string[]): Promise<void> {
    const patternsToWarm = patterns || Array.from(this.patterns.keys());

    for (const patternName of patternsToWarm) {
      const pattern = this.patterns.get(patternName);
      
      if (pattern?.preload) {
        // In production, would load data based on pattern
        this.emit('warmup', { pattern: patternName });
      }
    }
  }

  /**
   * Add cache pattern
   */
  addPattern(pattern: CachePattern): void {
    this.patterns.set(pattern.name, pattern);
    
    if (pattern.refresh) {
      this.setupPatternRefresh(pattern);
    }
  }

  /**
   * Setup pattern refresh
   */
  private setupPatternRefresh(pattern: CachePattern): void {
    if (pattern.refresh?.type === 'interval' && pattern.refresh.interval) {
      setInterval(async () => {
        // Find matching keys and refresh
        for (const tier of this.tiers.values()) {
          const keys = await tier.getAllKeys();
          const regex = typeof pattern.pattern === 'string'
            ? new RegExp(pattern.pattern)
            : pattern.pattern;

          for (const key of keys) {
            if (regex.test(key)) {
              await this.refreshEntry(key);
            }
          }
        }
      }, pattern.refresh.interval);
    }
  }

  /**
   * Refresh cache entry
   */
  private async refreshEntry(key: string): Promise<void> {
    // In production, would fetch fresh data
    this.emit('refresh', { key });
  }

  /**
   * Promote to higher tiers
   */
  private async promoteToHigherTiers(
    key: string,
    value: any,
    foundTier: CacheTierInstance
  ): Promise<void> {
    const sortedTiers = Array.from(this.tiers.values())
      .sort((a, b) => a.config.priority - b.config.priority);

    for (const tier of sortedTiers) {
      if (tier.config.priority < foundTier.config.priority) {
        const entry = await foundTier.get(key);
        if (entry) {
          await tier.set(key, entry);
        }
      }
    }
  }

  /**
   * Get sharded tier for key
   */
  private getShardedTier(key: string): CacheTierInstance | undefined {
    const tiers = Array.from(this.tiers.values());
    
    if (tiers.length === 0) {
      return undefined;
    }

    switch (this.config.clustering.sharding) {
      case 'hash':
        const hash = crypto.createHash('md5').update(key).digest('hex');
        const index = parseInt(hash.substr(0, 8), 16) % tiers.length;
        return tiers[index];
        
      case 'consistent-hash':
        // Simplified consistent hashing
        return tiers[0];
        
      default:
        return tiers[0];
    }
  }

  /**
   * Replicate to other nodes
   */
  private async replicate(key: string, entry: CacheEntry): Promise<void> {
    // In production, would replicate to other nodes
    this.emit('replicate', { key, replication: this.config.clustering.replication });
  }

  /**
   * Handle dependencies
   */
  private async handleDependencies(key: string, dependencies: string[]): Promise<void> {
    // When any dependency is invalidated, invalidate this key too
    for (const dep of dependencies) {
      this.on(`invalidate:${dep}`, () => {
        this.delete(key);
      });
    }
  }

  /**
   * Setup refresh for entry
   */
  private async setupRefresh(key: string, entry: CacheEntry): Promise<void> {
    for (const [name, pattern] of this.patterns.entries()) {
      const regex = typeof pattern.pattern === 'string'
        ? new RegExp(pattern.pattern)
        : pattern.pattern;

      if (regex.test(key) && pattern.refresh) {
        if (pattern.refresh.type === 'on-expire') {
          const ttl = entry.metadata.ttl || this.config.defaultTTL;
          
          setTimeout(() => {
            this.refreshEntry(key);
          }, ttl - 60000); // Refresh 1 minute before expiry
        }
      }
    }
  }

  /**
   * Compress data
   */
  private async compress(data: any): Promise<Buffer> {
    const json = JSON.stringify(data);
    // In production, would use proper compression library
    return Buffer.from(json);
  }

  /**
   * Decompress data
   */
  private async decompress(data: Buffer): Promise<any> {
    // In production, would use proper compression library
    return JSON.parse(data.toString());
  }

  /**
   * Encrypt data
   */
  private async encrypt(data: any): Promise<Buffer> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    const json = JSON.stringify(data);
    const encrypted = Buffer.concat([
      iv,
      cipher.update(json, 'utf8'),
      cipher.final(),
      cipher.getAuthTag()
    ]);

    return encrypted;
  }

  /**
   * Decrypt data
   */
  private async decrypt(data: Buffer): Promise<any> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }

    const iv = data.slice(0, 16);
    const authTag = data.slice(-16);
    const encrypted = data.slice(16, -16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return JSON.parse(decrypted.toString());
  }

  /**
   * Get size of data
   */
  private getSize(data: any): number {
    if (Buffer.isBuffer(data)) {
      return data.length;
    }
    return Buffer.from(JSON.stringify(data)).length;
  }

  /**
   * Update statistics
   */
  private updateStatistics(type: 'hit' | 'miss' | 'write', latency: number): void {
    switch (type) {
      case 'hit':
        this.statistics.hits++;
        break;
      case 'miss':
        this.statistics.misses++;
        break;
      case 'write':
        this.statistics.writes++;
        break;
    }

    // Update average latency
    const totalRequests = this.statistics.hits + this.statistics.misses;
    this.statistics.avgLatency = 
      (this.statistics.avgLatency * (totalRequests - 1) + latency) / totalRequests;

    // Calculate hit rate
    if (totalRequests > 0) {
      this.statistics.hitRate = (this.statistics.hits / totalRequests) * 100;
    }
  }

  /**
   * Create empty statistics
   */
  private createEmptyStatistics(): CacheStatistics {
    return {
      hits: 0,
      misses: 0,
      evictions: 0,
      writes: 0,
      deletes: 0,
      size: 0,
      itemCount: 0,
      hitRate: 0,
      avgLatency: 0,
      memoryUsage: 0
    };
  }

  /**
   * Get default cache tiers
   */
  private getDefaultTiers(): CacheTier[] {
    return [
      {
        name: 'l1-memory',
        type: 'memory',
        priority: 1,
        maxSize: 10 * 1024 * 1024, // 10MB
        ttl: 60000 // 1 minute
      },
      {
        name: 'l2-redis',
        type: 'redis',
        priority: 2,
        maxSize: 100 * 1024 * 1024, // 100MB
        ttl: 3600000 // 1 hour
      },
      {
        name: 'l3-disk',
        type: 'disk',
        priority: 3,
        maxSize: 1024 * 1024 * 1024, // 1GB
        ttl: 86400000 // 24 hours
      }
    ];
  }

  /**
   * Load default patterns
   */
  private loadDefaultPatterns(): void {
    this.patterns.set('api-responses', {
      name: 'api-responses',
      pattern: /^api:response:/,
      ttl: 300000, // 5 minutes
      tags: ['api'],
      preload: false,
      refresh: {
        type: 'on-expire'
      }
    });

    this.patterns.set('user-sessions', {
      name: 'user-sessions',
      pattern: /^session:/,
      ttl: 1800000, // 30 minutes
      tags: ['session', 'user'],
      refresh: {
        type: 'interval',
        interval: 600000 // 10 minutes
      }
    });

    this.patterns.set('static-content', {
      name: 'static-content',
      pattern: /^static:/,
      ttl: 86400000, // 24 hours
      tags: ['static'],
      preload: true
    });
  }

  /**
   * Start persistence
   */
  private startPersistence(): void {
    setInterval(async () => {
      await this.persistCache();
    }, this.config.persistence.interval);
  }

  /**
   * Persist cache to disk
   */
  private async persistCache(): Promise<void> {
    // In production, would save cache to disk
    this.emit('persist', { 
      size: this.statistics.size,
      items: this.statistics.itemCount 
    });
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    setInterval(() => {
      this.collectMetrics();
    }, 60000); // Every minute
  }

  /**
   * Collect metrics
   */
  private async collectMetrics(): Promise<void> {
    let totalSize = 0;
    let totalItems = 0;
    let memoryUsage = 0;

    for (const tier of this.tiers.values()) {
      const stats = await tier.getStats();
      totalSize += stats.size;
      totalItems += stats.count;
      
      if (tier.config.type === 'memory') {
        memoryUsage += stats.size;
      }
    }

    this.statistics.size = totalSize;
    this.statistics.itemCount = totalItems;
    this.statistics.memoryUsage = memoryUsage;

    this.emit('metrics', this.statistics);
  }

  /**
   * Get statistics
   */
  getStatistics(): CacheStatistics {
    return { ...this.statistics };
  }

  /**
   * Get cache info
   */
  async getInfo(): Promise<any> {
    const tierInfo = [];
    
    for (const [name, tier] of this.tiers.entries()) {
      const stats = await tier.getStats();
      tierInfo.push({
        name,
        type: tier.config.type,
        priority: tier.config.priority,
        ...stats
      });
    }

    return {
      strategy: this.config.strategy,
      tiers: tierInfo,
      patterns: Array.from(this.patterns.keys()),
      statistics: this.statistics,
      transactions: this.transactions.size,
      locks: this.locks.size
    };
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    for (const tier of this.tiers.values()) {
      await tier.clear();
    }

    this.statistics = this.createEmptyStatistics();
    this.emit('clear');
  }

  /**
   * Shutdown cache system
   */
  async shutdown(): Promise<void> {
    // Clear all timers
    for (const timer of this.refreshTimers.values()) {
      clearTimeout(timer);
    }

    // Persist if enabled
    if (this.config.persistence.enabled) {
      await this.persistCache();
    }

    // Clear all tiers
    for (const tier of this.tiers.values()) {
      await tier.shutdown();
    }

    this.removeAllListeners();
    logger.info('Cache system shut down');
  }
}

// Cache tier implementations
abstract class CacheTierInstance {
  constructor(public config: CacheTier) {}
  
  abstract get(key: string): Promise<CacheEntry | undefined>;
  abstract set(key: string, entry: CacheEntry): Promise<void>;
  abstract delete(key: string): Promise<void>;
  abstract clear(): Promise<number>;
  abstract getAllKeys(): Promise<string[]>;
  abstract getKeysByTags(tags: string[]): Promise<string[]>;
  abstract getStats(): Promise<{ size: number; count: number }>;
  abstract shutdown(): Promise<void>;
}

class MemoryCacheTier extends CacheTierInstance {
  private cache: Map<string, CacheEntry> = new Map();
  private lru: string[] = [];

  async get(key: string): Promise<CacheEntry | undefined> {
    const entry = this.cache.get(key);
    
    if (entry) {
      // Update LRU
      const index = this.lru.indexOf(key);
      if (index > -1) {
        this.lru.splice(index, 1);
      }
      this.lru.push(key);
    }
    
    return entry;
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    // Check size limit and evict if necessary
    if (this.cache.size >= this.config.maxSize / 1000) {
      // Simple size check (assuming 1KB per entry average)
      this.evict();
    }

    this.cache.set(key, entry);
    this.lru.push(key);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    const index = this.lru.indexOf(key);
    if (index > -1) {
      this.lru.splice(index, 1);
    }
  }

  async clear(): Promise<number> {
    const count = this.cache.size;
    this.cache.clear();
    this.lru = [];
    return count;
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  async getKeysByTags(tags: string[]): Promise<string[]> {
    const keys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata.tags?.some(tag => tags.includes(tag))) {
        keys.push(key);
      }
    }
    
    return keys;
  }

  async getStats(): Promise<{ size: number; count: number }> {
    let size = 0;
    
    for (const entry of this.cache.values()) {
      size += entry.metadata.size;
    }
    
    return { size, count: this.cache.size };
  }

  private evict(): void {
    // LRU eviction
    if (this.lru.length > 0) {
      const keyToEvict = this.lru.shift()!;
      this.cache.delete(keyToEvict);
    }
  }

  async shutdown(): Promise<void> {
    this.cache.clear();
    this.lru = [];
  }
}

class RedisCacheTier extends CacheTierInstance {
  // Simplified Redis implementation
  private cache: Map<string, CacheEntry> = new Map();

  async get(key: string): Promise<CacheEntry | undefined> {
    // In production, would connect to Redis
    return this.cache.get(key);
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    // In production, would connect to Redis
    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<number> {
    const count = this.cache.size;
    this.cache.clear();
    return count;
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  async getKeysByTags(tags: string[]): Promise<string[]> {
    const keys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata.tags?.some(tag => tags.includes(tag))) {
        keys.push(key);
      }
    }
    
    return keys;
  }

  async getStats(): Promise<{ size: number; count: number }> {
    let size = 0;
    
    for (const entry of this.cache.values()) {
      size += entry.metadata.size;
    }
    
    return { size, count: this.cache.size };
  }

  async shutdown(): Promise<void> {
    this.cache.clear();
  }
}

class DiskCacheTier extends CacheTierInstance {
  // Simplified disk cache implementation
  private index: Map<string, CacheMetadata> = new Map();

  async get(key: string): Promise<CacheEntry | undefined> {
    // In production, would read from disk
    const metadata = this.index.get(key);
    
    if (!metadata) {
      return undefined;
    }

    return {
      key,
      value: {},
      metadata
    };
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    // In production, would write to disk
    this.index.set(key, entry.metadata);
  }

  async delete(key: string): Promise<void> {
    this.index.delete(key);
  }

  async clear(): Promise<number> {
    const count = this.index.size;
    this.index.clear();
    return count;
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.index.keys());
  }

  async getKeysByTags(tags: string[]): Promise<string[]> {
    const keys: string[] = [];
    
    for (const [key, metadata] of this.index.entries()) {
      if (metadata.tags?.some(tag => tags.includes(tag))) {
        keys.push(key);
      }
    }
    
    return keys;
  }

  async getStats(): Promise<{ size: number; count: number }> {
    let size = 0;
    
    for (const metadata of this.index.values()) {
      size += metadata.size;
    }
    
    return { size, count: this.index.size };
  }

  async shutdown(): Promise<void> {
    this.index.clear();
  }
}

// Helper interfaces
interface CacheLock {
  id: string;
  key: string;
  acquired: Date;
  expires: Date;
}

// Export singleton instance
export const cacheSystem = new DistributedCacheSystem();
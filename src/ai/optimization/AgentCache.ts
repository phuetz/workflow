import { AgentInput, AgentOutput } from '../../types/agents';
import { logger } from '../../services/SimpleLogger';

/**
 * AgentCache - Caches agent execution results to reduce LLM calls and improve performance
 * Implements TTL-based caching with intelligent cache key generation
 */
export class AgentCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private hitCount = 0;
  private missCount = 0;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      defaultTTL: config.defaultTTL || 3600000, // 1 hour
      enableCompression: config.enableCompression ?? false,
      cleanupInterval: config.cleanupInterval || 300000, // 5 minutes
      similarityThreshold: config.similarityThreshold || 0.95,
    };

    this.startCleanup();
    logger.info('AgentCache initialized', this.config);
  }

  /**
   * Get cached result if available
   */
  async get(agentId: string, input: AgentInput): Promise<AgentOutput | null> {
    const key = this.generateKey(agentId, input);
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    this.hitCount++;

    logger.debug('Cache hit', {
      agentId,
      key: key.substring(0, 20),
      accessCount: entry.accessCount,
    });

    return entry.output;
  }

  /**
   * Set cache entry
   */
  async set(
    agentId: string,
    input: AgentInput,
    output: AgentOutput,
    ttl?: number
  ): Promise<void> {
    const key = this.generateKey(agentId, input);
    const expiresAt = Date.now() + (ttl || this.config.defaultTTL);

    // Check cache size
    if (this.cache.size >= this.config.maxSize) {
      this.evict();
    }

    const entry: CacheEntry = {
      key,
      agentId,
      input,
      output,
      createdAt: Date.now(),
      expiresAt,
      accessCount: 0,
      lastAccessed: Date.now(),
      size: this.estimateSize(input, output),
    };

    this.cache.set(key, entry);

    logger.debug('Cache set', {
      agentId,
      key: key.substring(0, 20),
      ttl: ttl || this.config.defaultTTL,
    });
  }

  /**
   * Check if result is cached
   */
  has(agentId: string, input: AgentInput): boolean {
    const key = this.generateKey(agentId, input);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate cache entry
   */
  invalidate(agentId: string, input?: AgentInput): number {
    if (input) {
      const key = this.generateKey(agentId, input);
      const deleted = this.cache.delete(key);
      return deleted ? 1 : 0;
    }

    // Invalidate all entries for this agent
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.agentId === agentId) {
        this.cache.delete(key);
        count++;
      }
    }

    logger.info(`Invalidated ${count} cache entries for agent ${agentId}`);
    return count;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;

    const totalSize = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.size,
      0
    );

    const byAgent: Record<string, number> = {};
    this.cache.forEach(entry => {
      byAgent[entry.agentId] = (byAgent[entry.agentId] || 0) + 1;
    });

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      utilizationPercent: (this.cache.size / this.config.maxSize) * 100,
      totalSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate,
      entriesByAgent: byAgent,
      averageAccessCount: this.calculateAverageAccessCount(),
    };
  }

  /**
   * Get cache entries
   */
  getEntries(): CacheEntry[] {
    return Array.from(this.cache.values());
  }

  /**
   * Shutdown cache
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
    logger.info('AgentCache shut down');
  }

  // Private methods

  private generateKey(agentId: string, input: AgentInput): string {
    // Create a deterministic key from agent ID and input
    const inputKey = this.serializeInput(input);
    return `${agentId}:${this.hashString(inputKey)}`;
  }

  private serializeInput(input: AgentInput): string {
    // Serialize input to a consistent string
    return JSON.stringify({
      messages: input.messages?.map(m => ({ role: m.role, content: m.content })),
      data: input.data,
      context: {
        conversationId: input.context?.conversationId,
        workflowId: input.context?.workflowId,
      },
      constraints: input.constraints,
    });
  }

  private hashString(str: string): string {
    // Simple hash function (could use crypto.createHash for production)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private estimateSize(input: AgentInput, output: AgentOutput): number {
    // Rough size estimation in bytes
    const inputSize = JSON.stringify(input).length;
    const outputSize = JSON.stringify(output).length;
    return inputSize + outputSize;
  }

  private evict(): void {
    // LRU eviction: remove least recently used entry
    let lruKey: string | null = null;
    let lruTime = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    });

    if (lruKey) {
      this.cache.delete(lruKey);
      logger.debug('Cache entry evicted (LRU)', { key: lruKey.substring(0, 20) });
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.debug(`Cache cleanup: removed ${expiredCount} expired entries`);
    }
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private calculateAverageAccessCount(): number {
    if (this.cache.size === 0) {
      return 0;
    }

    const total = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.accessCount,
      0
    );

    return total / this.cache.size;
  }
}

/**
 * Global cache instance
 */
export class GlobalAgentCache {
  private static instance: AgentCache;

  static getInstance(config?: Partial<CacheConfig>): AgentCache {
    if (!GlobalAgentCache.instance) {
      GlobalAgentCache.instance = new AgentCache(config);
    }
    return GlobalAgentCache.instance;
  }

  static reset(): void {
    if (GlobalAgentCache.instance) {
      GlobalAgentCache.instance.shutdown();
    }
    // @ts-ignore: Intentionally setting to undefined for reset
    GlobalAgentCache.instance = undefined;
  }
}

// Types

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  enableCompression: boolean;
  cleanupInterval: number;
  similarityThreshold: number;
}

export interface CacheEntry {
  key: string;
  agentId: string;
  input: AgentInput;
  output: AgentOutput;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  utilizationPercent: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  entriesByAgent: Record<string, number>;
  averageAccessCount: number;
}

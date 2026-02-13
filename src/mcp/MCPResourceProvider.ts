/**
 * MCP Resource Provider
 * Manages MCP resources with caching and subscriptions
 */

import type {
  MCPResource,
  MCPResourceDefinition,
  MCPResourceProviderConfig,
  MCPResourceContents,
} from '../types/mcp';
import { logger } from '../services/SimpleLogger';

interface CachedResource {
  contents: MCPResourceContents;
  timestamp: number;
  ttl: number;
}

interface ResourceSubscriber {
  uri: string;
  callback: (uri: string, contents: MCPResourceContents) => void;
}

export class MCPResourceProvider {
  private config: MCPResourceProviderConfig;
  private resources = new Map<string, MCPResourceDefinition>();
  private cache = new Map<string, CachedResource>();
  private subscribers = new Map<string, Set<ResourceSubscriber>>();
  private accessStats = new Map<string, { reads: number; errors: number }>();

  constructor(config: MCPResourceProviderConfig) {
    this.config = {
      caching: true,
      defaultTTL: 60000, // 1 minute
      maxCacheSize: 100,
      monitoring: true,
      ...config,
    };

    // Start cache cleanup interval
    this.startCacheCleanup();
  }

  /**
   * Register a resource
   */
  registerResource(definition: MCPResourceDefinition): void {
    const uri = definition.resource.uri;

    // Validate resource definition
    this.validateResourceDefinition(definition);

    // Check for duplicates
    if (this.resources.has(uri)) {
      throw new Error(`Resource already registered: ${uri}`);
    }

    this.resources.set(uri, definition);

    // Initialize stats
    if (this.config.monitoring) {
      this.accessStats.set(uri, { reads: 0, errors: 0 });
    }
  }

  /**
   * Unregister a resource
   */
  unregisterResource(uri: string): void {
    if (!this.resources.has(uri)) {
      throw new Error(`Resource not found: ${uri}`);
    }

    this.resources.delete(uri);
    this.cache.delete(uri);
    this.subscribers.delete(uri);
    this.accessStats.delete(uri);
  }

  /**
   * Get a resource definition
   */
  getResource(uri: string): MCPResourceDefinition | undefined {
    return this.resources.get(uri);
  }

  /**
   * List all resources
   */
  listResources(): MCPResource[] {
    return Array.from(this.resources.values()).map((def) => def.resource);
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<MCPResourceContents> {
    const definition = this.resources.get(uri);

    if (!definition) {
      throw new Error(`Resource not found: ${uri}`);
    }

    // Check cache first
    if (this.config.caching && definition.cacheable !== false) {
      const cached = this.cache.get(uri);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.contents;
      }
    }

    // Fetch resource
    try {
      const contents = await definition.provider(uri);

      // Update stats
      if (this.config.monitoring) {
        const stats = this.accessStats.get(uri);
        if (stats) {
          stats.reads++;
        }
      }

      // Cache result
      if (this.config.caching && definition.cacheable !== false) {
        this.cacheResource(uri, contents, definition.ttl);
      }

      return contents;
    } catch (error) {
      // Update error stats
      if (this.config.monitoring) {
        const stats = this.accessStats.get(uri);
        if (stats) {
          stats.errors++;
        }
      }

      throw error;
    }
  }

  /**
   * Subscribe to resource updates
   */
  async subscribe(uri: string): Promise<void> {
    const definition = this.resources.get(uri);

    if (!definition) {
      throw new Error(`Resource not found: ${uri}`);
    }

    // Create subscribers set if not exists
    if (!this.subscribers.has(uri)) {
      this.subscribers.set(uri, new Set());
    }
  }

  /**
   * Unsubscribe from resource updates
   */
  async unsubscribe(uri: string): Promise<void> {
    this.subscribers.delete(uri);
  }

  /**
   * Notify subscribers of resource update
   */
  async notifyResourceUpdate(uri: string): Promise<void> {
    const subscribers = this.subscribers.get(uri);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    try {
      const contents = await this.readResource(uri);

      for (const subscriber of subscribers) {
        try {
          subscriber.callback(uri, contents);
        } catch (error) {
          logger.error('Subscriber callback error:', error);
        }
      }
    } catch (error) {
      logger.error('Failed to read resource for update:', error);
    }
  }

  /**
   * Invalidate cached resource
   */
  invalidateCache(uri: string): void {
    this.cache.delete(uri);
  }

  /**
   * Clear all cached resources
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Cache a resource
   */
  private cacheResource(uri: string, contents: MCPResourceContents, ttl?: number): void {
    // Check cache size limit
    if (this.cache.size >= (this.config.maxCacheSize || 100)) {
      // Remove oldest entry
      const oldestUri = this.findOldestCacheEntry();
      if (oldestUri) {
        this.cache.delete(oldestUri);
      }
    }

    this.cache.set(uri, {
      contents,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL || 60000,
    });
  }

  /**
   * Find oldest cache entry
   */
  private findOldestCacheEntry(): string | undefined {
    let oldestUri: string | undefined;
    let oldestTimestamp = Infinity;

    for (const [uri, cached] of this.cache.entries()) {
      if (cached.timestamp < oldestTimestamp) {
        oldestTimestamp = cached.timestamp;
        oldestUri = uri;
      }
    }

    return oldestUri;
  }

  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const toDelete: string[] = [];

      for (const [uri, cached] of this.cache.entries()) {
        if (now - cached.timestamp >= cached.ttl) {
          toDelete.push(uri);
        }
      }

      for (const uri of toDelete) {
        this.cache.delete(uri);
      }
    }, 60000); // Every minute
  }

  /**
   * Validate resource definition
   */
  private validateResourceDefinition(definition: MCPResourceDefinition): void {
    if (!definition.resource.uri) {
      throw new Error('Resource URI is required');
    }

    if (!definition.resource.name) {
      throw new Error('Resource name is required');
    }

    if (!definition.provider) {
      throw new Error('Resource provider is required');
    }

    if (typeof definition.provider !== 'function') {
      throw new Error('Resource provider must be a function');
    }
  }

  /**
   * Get access statistics
   */
  getStats(uri?: string): Record<string, { reads: number; errors: number; cached: boolean }> {
    const stats: Record<string, { reads: number; errors: number; cached: boolean }> = {};

    for (const [resourceUri, resourceStats] of this.accessStats.entries()) {
      if (uri && resourceUri !== uri) continue;

      stats[resourceUri] = {
        reads: resourceStats.reads,
        errors: resourceStats.errors,
        cached: this.cache.has(resourceUri),
      };
    }

    return stats;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    let totalReads = 0;
    let cachedReads = 0;

    for (const [uri, stats] of this.accessStats.entries()) {
      totalReads += stats.reads;
      if (this.cache.has(uri)) {
        cachedReads += stats.reads;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize || 100,
      hitRate: totalReads > 0 ? cachedReads / totalReads : 0,
    };
  }

  /**
   * Search resources by name pattern
   */
  searchByName(pattern: string): MCPResource[] {
    const regex = new RegExp(pattern, 'i');
    return Array.from(this.resources.values())
      .filter((def) => regex.test(def.resource.name))
      .map((def) => def.resource);
  }

  /**
   * Search resources by MIME type
   */
  searchByMimeType(mimeType: string): MCPResource[] {
    return Array.from(this.resources.values())
      .filter((def) => def.resource.mimeType === mimeType)
      .map((def) => def.resource);
  }

  /**
   * Get resource metadata
   */
  getMetadata(uri: string): Record<string, unknown> | undefined {
    const definition = this.resources.get(uri);
    return definition?.metadata;
  }

  /**
   * Update resource metadata
   */
  updateMetadata(uri: string, metadata: Record<string, unknown>): void {
    const definition = this.resources.get(uri);

    if (!definition) {
      throw new Error(`Resource not found: ${uri}`);
    }

    definition.metadata = { ...definition.metadata, ...metadata };
  }

  /**
   * Clear all resources
   */
  clear(): void {
    this.resources.clear();
    this.cache.clear();
    this.subscribers.clear();
    this.accessStats.clear();
  }

  /**
   * Get resource count
   */
  count(): number {
    return this.resources.size;
  }

  /**
   * Check if resource exists
   */
  has(uri: string): boolean {
    return this.resources.has(uri);
  }

  /**
   * Get configuration
   */
  getConfig(): MCPResourceProviderConfig {
    return { ...this.config };
  }
}

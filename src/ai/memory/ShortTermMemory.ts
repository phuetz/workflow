import { MemoryItem, MemoryQuery, MemoryType } from '../../types/agents';
import { logger } from '../../services/SimpleLogger';

/**
 * Short-Term Memory - Fast in-memory storage for recent conversations and context
 * Optimized for quick access with LRU eviction policy
 */
export class ShortTermMemory {
  private items: Map<string, MemoryItem> = new Map();
  private accessOrder: string[] = [];
  private maxItems: number;
  private defaultTTL: number;

  constructor(config: { maxItems?: number; defaultTTL?: number } = {}) {
    this.maxItems = config.maxItems || 100;
    this.defaultTTL = config.defaultTTL || 3600000; // 1 hour default
    logger.info('ShortTermMemory initialized', { maxItems: this.maxItems });
  }

  /**
   * Store an item in short-term memory
   */
  async store(item: Omit<MemoryItem, 'id' | 'type' | 'accessCount' | 'lastAccessed' | 'createdAt'>): Promise<MemoryItem> {
    const memoryItem: MemoryItem = {
      id: this.generateId(),
      type: 'short-term' as MemoryType,
      content: item.content,
      metadata: item.metadata || {},
      importance: item.importance || 0.5,
      accessCount: 0,
      lastAccessed: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      expiresAt: item.expiresAt || new Date(Date.now() + this.defaultTTL).toISOString(),
      tags: item.tags || [],
      source: item.source,
    };

    // Check if we need to evict
    if (this.items.size >= this.maxItems) {
      this.evictLRU();
    }

    this.items.set(memoryItem.id, memoryItem);
    this.updateAccessOrder(memoryItem.id);

    logger.debug(`Stored item in short-term memory: ${memoryItem.id}`);
    return memoryItem;
  }

  /**
   * Retrieve an item by ID
   */
  async retrieve(id: string): Promise<MemoryItem | null> {
    const item = this.items.get(id);
    if (!item) {
      return null;
    }

    // Check if expired
    if (this.isExpired(item)) {
      this.items.delete(id);
      return null;
    }

    // Update access metadata
    item.accessCount++;
    item.lastAccessed = new Date().toISOString();
    this.updateAccessOrder(id);

    return item;
  }

  /**
   * Query items with filtering
   */
  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    let results = Array.from(this.items.values());

    // Remove expired items
    results = results.filter(item => !this.isExpired(item));

    // Filter by text content
    if (query.text) {
      const searchText = query.text.toLowerCase();
      results = results.filter(item =>
        item.content.toLowerCase().includes(searchText)
      );
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter(item =>
        query.tags!.some(tag => item.tags?.includes(tag))
      );
    }

    // Filter by importance
    if (query.minImportance !== undefined) {
      results = results.filter(item => item.importance >= query.minImportance!);
    }

    // Filter by time range
    if (query.timeRange) {
      const start = new Date(query.timeRange.start).getTime();
      const end = new Date(query.timeRange.end).getTime();
      results = results.filter(item => {
        const timestamp = new Date(item.createdAt).getTime();
        return timestamp >= start && timestamp <= end;
      });
    }

    // Filter by metadata
    if (query.filter) {
      results = results.filter(item => {
        return Object.entries(query.filter!).every(([key, value]) => {
          return item.metadata[key] === value;
        });
      });
    }

    // Sort by importance and recency
    results.sort((a, b) => {
      const scoreA = a.importance * 0.7 + (a.accessCount / 100) * 0.3;
      const scoreB = b.importance * 0.7 + (b.accessCount / 100) * 0.3;
      return scoreB - scoreA;
    });

    // Limit results
    return results.slice(0, query.topK);
  }

  /**
   * Update an existing item
   */
  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem | null> {
    const item = this.items.get(id);
    if (!item) {
      return null;
    }

    const updatedItem: MemoryItem = {
      ...item,
      ...updates,
      id: item.id, // Preserve ID
      type: item.type, // Preserve type
      createdAt: item.createdAt, // Preserve creation time
      lastAccessed: new Date().toISOString(),
    };

    this.items.set(id, updatedItem);
    this.updateAccessOrder(id);

    return updatedItem;
  }

  /**
   * Delete an item
   */
  async delete(id: string): Promise<boolean> {
    const deleted = this.items.delete(id);
    if (deleted) {
      const index = this.accessOrder.indexOf(id);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }
    return deleted;
  }

  /**
   * Clear all items
   */
  async clear(): Promise<void> {
    this.items.clear();
    this.accessOrder = [];
    logger.info('Short-term memory cleared');
  }

  /**
   * Get recent items (last N accessed)
   */
  async getRecent(limit = 10): Promise<MemoryItem[]> {
    const recentIds = this.accessOrder.slice(-limit).reverse();
    return recentIds
      .map(id => this.items.get(id))
      .filter((item): item is MemoryItem => item !== undefined && !this.isExpired(item));
  }

  /**
   * Get most important items
   */
  async getImportant(limit = 10): Promise<MemoryItem[]> {
    const items = Array.from(this.items.values())
      .filter(item => !this.isExpired(item))
      .sort((a, b) => b.importance - a.importance);

    return items.slice(0, limit);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalItems: number;
    averageImportance: number;
    averageAccessCount: number;
    oldestItem?: string;
    newestItem?: string;
    utilizationPercent: number;
  } {
    const items = Array.from(this.items.values()).filter(item => !this.isExpired(item));

    if (items.length === 0) {
      return {
        totalItems: 0,
        averageImportance: 0,
        averageAccessCount: 0,
        utilizationPercent: 0,
      };
    }

    const totalImportance = items.reduce((sum, item) => sum + item.importance, 0);
    const totalAccessCount = items.reduce((sum, item) => sum + item.accessCount, 0);

    const sorted = items.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return {
      totalItems: items.length,
      averageImportance: totalImportance / items.length,
      averageAccessCount: totalAccessCount / items.length,
      oldestItem: sorted[0]?.createdAt,
      newestItem: sorted[sorted.length - 1]?.createdAt,
      utilizationPercent: (items.length / this.maxItems) * 100,
    };
  }

  /**
   * Cleanup expired items
   */
  async cleanup(): Promise<number> {
    const before = this.items.size;
    const expiredIds: string[] = [];

    for (const [id, item] of this.items.entries()) {
      if (this.isExpired(item)) {
        expiredIds.push(id);
      }
    }

    expiredIds.forEach(id => {
      this.items.delete(id);
      const index = this.accessOrder.indexOf(id);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    });

    const removed = before - this.items.size;
    if (removed > 0) {
      logger.debug(`Cleaned up ${removed} expired items from short-term memory`);
    }

    return removed;
  }

  // Private methods

  private isExpired(item: MemoryItem): boolean {
    if (!item.expiresAt) {
      return false;
    }
    return new Date(item.expiresAt).getTime() < Date.now();
  }

  private updateAccessOrder(id: string): void {
    const index = this.accessOrder.indexOf(id);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(id);
  }

  private evictLRU(): void {
    // Remove least recently used item
    const lruId = this.accessOrder.shift();
    if (lruId) {
      this.items.delete(lruId);
      logger.debug(`Evicted LRU item: ${lruId}`);
    }
  }

  private generateId(): string {
    return `stm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  size(): number {
    return this.items.size;
  }

  getMaxItems(): number {
    return this.maxItems;
  }

  setMaxItems(max: number): void {
    this.maxItems = max;
    while (this.items.size > this.maxItems) {
      this.evictLRU();
    }
  }
}

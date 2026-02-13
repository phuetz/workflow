import { MemoryItem, MemoryQuery, MemoryType, MemoryStats } from '../../types/agents';
import { logger } from '../../services/SimpleLogger';

/**
 * Long-Term Memory - Persistent storage for important memories
 * Would typically integrate with a database in production
 */
export class LongTermMemory {
  private items: Map<string, MemoryItem> = new Map();
  private indexByTag: Map<string, Set<string>> = new Map();
  private indexBySource: Map<string, Set<string>> = new Map();
  private maxItems: number;
  private persistenceEnabled: boolean;

  constructor(config: { maxItems?: number; persistenceEnabled?: boolean } = {}) {
    this.maxItems = config.maxItems || 10000;
    this.persistenceEnabled = config.persistenceEnabled ?? true;
    logger.info('LongTermMemory initialized', {
      maxItems: this.maxItems,
      persistenceEnabled: this.persistenceEnabled,
    });
  }

  /**
   * Store an item in long-term memory
   */
  async store(item: Omit<MemoryItem, 'id' | 'type' | 'accessCount' | 'lastAccessed' | 'createdAt'>): Promise<MemoryItem> {
    const memoryItem: MemoryItem = {
      id: this.generateId(),
      type: 'long-term' as MemoryType,
      content: item.content,
      embedding: item.embedding,
      metadata: item.metadata || {},
      importance: item.importance || 0.5,
      accessCount: 0,
      lastAccessed: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      tags: item.tags || [],
      source: item.source,
    };

    // Check capacity and evict if necessary
    if (this.items.size >= this.maxItems) {
      await this.evictLeastImportant();
    }

    this.items.set(memoryItem.id, memoryItem);
    this.indexItem(memoryItem);

    if (this.persistenceEnabled) {
      await this.persist(memoryItem);
    }

    logger.debug(`Stored item in long-term memory: ${memoryItem.id}`);
    return memoryItem;
  }

  /**
   * Retrieve an item by ID
   */
  async retrieve(id: string): Promise<MemoryItem | null> {
    const item = this.items.get(id);
    if (!item) {
      // Try loading from persistence
      if (this.persistenceEnabled) {
        const loaded = await this.loadFromPersistence(id);
        if (loaded) {
          this.items.set(id, loaded);
          this.indexItem(loaded);
          return loaded;
        }
      }
      return null;
    }

    // Update access metadata
    item.accessCount++;
    item.lastAccessed = new Date().toISOString();

    // Boost importance slightly on access
    item.importance = Math.min(1, item.importance + 0.01);

    return item;
  }

  /**
   * Query items with filtering
   */
  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    let results = Array.from(this.items.values());

    // Filter by text content
    if (query.text) {
      const searchText = query.text.toLowerCase();
      results = results.filter(item =>
        item.content.toLowerCase().includes(searchText) ||
        item.metadata.title?.toString().toLowerCase().includes(searchText)
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

    // Score and sort results
    results = this.scoreResults(results, query);

    // Update access counts for retrieved items
    results.forEach(item => {
      item.accessCount++;
      item.lastAccessed = new Date().toISOString();
    });

    // Limit results
    return results.slice(0, query.topK);
  }

  /**
   * Search by semantic similarity (requires embeddings)
   */
  async searchSemantic(embedding: number[], topK: number, minSimilarity = 0.7): Promise<MemoryItem[]> {
    const itemsWithEmbeddings = Array.from(this.items.values())
      .filter(item => item.embedding);

    const scored = itemsWithEmbeddings.map(item => ({
      item,
      similarity: this.cosineSimilarity(embedding, item.embedding!),
    }));

    return scored
      .filter(s => s.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map(s => {
        s.item.accessCount++;
        s.item.lastAccessed = new Date().toISOString();
        return s.item;
      });
  }

  /**
   * Update an existing item
   */
  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem | null> {
    const item = this.items.get(id);
    if (!item) {
      return null;
    }

    // Remove old indexes
    this.unindexItem(item);

    const updatedItem: MemoryItem = {
      ...item,
      ...updates,
      id: item.id,
      type: item.type,
      createdAt: item.createdAt,
      lastAccessed: new Date().toISOString(),
    };

    this.items.set(id, updatedItem);
    this.indexItem(updatedItem);

    if (this.persistenceEnabled) {
      await this.persist(updatedItem);
    }

    return updatedItem;
  }

  /**
   * Delete an item
   */
  async delete(id: string): Promise<boolean> {
    const item = this.items.get(id);
    if (!item) {
      return false;
    }

    this.unindexItem(item);
    this.items.delete(id);

    if (this.persistenceEnabled) {
      await this.deleteFromPersistence(id);
    }

    return true;
  }

  /**
   * Clear all items
   */
  async clear(): Promise<void> {
    this.items.clear();
    this.indexByTag.clear();
    this.indexBySource.clear();

    if (this.persistenceEnabled) {
      await this.clearPersistence();
    }

    logger.info('Long-term memory cleared');
  }

  /**
   * Get items by tag
   */
  async getByTag(tag: string): Promise<MemoryItem[]> {
    const ids = this.indexByTag.get(tag) || new Set();
    return Array.from(ids)
      .map(id => this.items.get(id))
      .filter((item): item is MemoryItem => item !== undefined);
  }

  /**
   * Get items by source
   */
  async getBySource(source: string): Promise<MemoryItem[]> {
    const ids = this.indexBySource.get(source) || new Set();
    return Array.from(ids)
      .map(id => this.items.get(id))
      .filter((item): item is MemoryItem => item !== undefined);
  }

  /**
   * Get most important items
   */
  async getImportant(limit = 100): Promise<MemoryItem[]> {
    return Array.from(this.items.values())
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }

  /**
   * Get most accessed items
   */
  async getMostAccessed(limit = 100): Promise<MemoryItem[]> {
    return Array.from(this.items.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Consolidate memories by merging similar items
   */
  async consolidate(similarityThreshold = 0.9): Promise<number> {
    const itemsWithEmbeddings = Array.from(this.items.values())
      .filter(item => item.embedding);

    let consolidated = 0;

    for (let i = 0; i < itemsWithEmbeddings.length; i++) {
      for (let j = i + 1; j < itemsWithEmbeddings.length; j++) {
        const similarity = this.cosineSimilarity(
          itemsWithEmbeddings[i].embedding!,
          itemsWithEmbeddings[j].embedding!
        );

        if (similarity >= similarityThreshold) {
          // Merge j into i
          const merged = this.mergeItems(itemsWithEmbeddings[i], itemsWithEmbeddings[j]);
          await this.update(itemsWithEmbeddings[i].id, merged);
          await this.delete(itemsWithEmbeddings[j].id);
          consolidated++;
        }
      }
    }

    if (consolidated > 0) {
      logger.info(`Consolidated ${consolidated} similar memories`);
    }

    return consolidated;
  }

  /**
   * Get statistics
   */
  getStats(): MemoryStats {
    const items = Array.from(this.items.values());

    if (items.length === 0) {
      return {
        totalItems: 0,
        byType: { 'long-term': 0 } as Record<MemoryType, number>,
        totalSize: 0,
        averageImportance: 0,
      };
    }

    const totalImportance = items.reduce((sum, item) => sum + item.importance, 0);
    const totalSize = items.reduce((sum, item) => sum + item.content.length, 0);

    const sorted = items.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return {
      totalItems: items.length,
      byType: { 'long-term': items.length } as Record<MemoryType, number>,
      totalSize,
      averageImportance: totalImportance / items.length,
      oldestItem: sorted[0]?.createdAt,
      newestItem: sorted[sorted.length - 1]?.createdAt,
    };
  }

  // Private methods

  private indexItem(item: MemoryItem): void {
    // Index by tags
    item.tags?.forEach(tag => {
      const ids = this.indexByTag.get(tag) || new Set();
      ids.add(item.id);
      this.indexByTag.set(tag, ids);
    });

    // Index by source
    if (item.source) {
      const ids = this.indexBySource.get(item.source) || new Set();
      ids.add(item.id);
      this.indexBySource.set(item.source, ids);
    }
  }

  private unindexItem(item: MemoryItem): void {
    // Remove from tag index
    item.tags?.forEach(tag => {
      const ids = this.indexByTag.get(tag);
      if (ids) {
        ids.delete(item.id);
        if (ids.size === 0) {
          this.indexByTag.delete(tag);
        }
      }
    });

    // Remove from source index
    if (item.source) {
      const ids = this.indexBySource.get(item.source);
      if (ids) {
        ids.delete(item.id);
        if (ids.size === 0) {
          this.indexBySource.delete(item.source);
        }
      }
    }
  }

  private scoreResults(items: MemoryItem[], query: MemoryQuery): MemoryItem[] {
    return items
      .map(item => ({
        item,
        score: this.calculateScore(item, query),
      }))
      .sort((a, b) => b.score - a.score)
      .map(s => s.item);
  }

  private calculateScore(item: MemoryItem, query: MemoryQuery): number {
    let score = item.importance * 0.4;

    // Recency bonus
    const ageMs = Date.now() - new Date(item.createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - (ageDays / 365)); // Decay over a year
    score += recencyScore * 0.3;

    // Access frequency bonus
    const accessScore = Math.min(1, item.accessCount / 100);
    score += accessScore * 0.2;

    // Tag match bonus
    if (query.tags && item.tags) {
      const matchingTags = query.tags.filter(tag => item.tags!.includes(tag)).length;
      score += (matchingTags / query.tags.length) * 0.1;
    }

    return score;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private mergeItems(item1: MemoryItem, item2: MemoryItem): Partial<MemoryItem> {
    return {
      content: `${item1.content}\n\n${item2.content}`,
      importance: Math.max(item1.importance, item2.importance),
      accessCount: item1.accessCount + item2.accessCount,
      tags: [...new Set([...(item1.tags || []), ...(item2.tags || [])])],
      metadata: {
        ...item1.metadata,
        ...item2.metadata,
        merged: true,
        mergedFrom: [item1.id, item2.id],
      },
    };
  }

  private async evictLeastImportant(): Promise<void> {
    const items = Array.from(this.items.values());
    items.sort((a, b) => {
      // Score based on importance and access frequency
      const scoreA = a.importance * 0.7 + (a.accessCount / 100) * 0.3;
      const scoreB = b.importance * 0.7 + (b.accessCount / 100) * 0.3;
      return scoreA - scoreB;
    });

    // Evict bottom 10%
    const toEvict = Math.ceil(items.length * 0.1);
    for (let i = 0; i < toEvict; i++) {
      await this.delete(items[i].id);
    }

    logger.debug(`Evicted ${toEvict} least important items`);
  }

  private async persist(_item: MemoryItem): Promise<void> {
    // In production, this would save to database
    // For now, just a placeholder
  }

  private async loadFromPersistence(_id: string): Promise<MemoryItem | null> {
    // In production, this would load from database
    return null;
  }

  private async deleteFromPersistence(_id: string): Promise<void> {
    // In production, this would delete from database
  }

  private async clearPersistence(): Promise<void> {
    // In production, this would clear database
  }

  private generateId(): string {
    return `ltm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  size(): number {
    return this.items.size;
  }

  getMaxItems(): number {
    return this.maxItems;
  }
}

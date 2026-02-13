import { MemoryItem, MemoryQuery, MemoryStats, MemoryType, AgentContext } from '../../types/agents';
import { ShortTermMemory } from './ShortTermMemory';
import { LongTermMemory } from './LongTermMemory';
import { VectorMemory } from './VectorMemory';
import { VectorStoreService } from '../../services/VectorStoreService';
import { logger } from '../../services/SimpleLogger';

/**
 * Memory Manager - Unified interface for all memory types
 * Coordinates short-term, long-term, and vector memory systems
 */
export class MemoryManager {
  private shortTerm: ShortTermMemory;
  private longTerm: LongTermMemory;
  private vector?: VectorMemory;
  private config: MemoryManagerConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<MemoryManagerConfig> = {}) {
    this.config = {
      enableShortTerm: config.enableShortTerm ?? true,
      enableLongTerm: config.enableLongTerm ?? true,
      enableVector: config.enableVector ?? false,
      maxShortTermItems: config.maxShortTermItems || 100,
      maxLongTermItems: config.maxLongTermItems || 10000,
      shortTermTTL: config.shortTermTTL || 3600000, // 1 hour
      promotionThreshold: config.promotionThreshold || 0.7,
      compressionEnabled: config.compressionEnabled ?? true,
      cleanupInterval: config.cleanupInterval || 300000, // 5 minutes
      vectorStoreConfig: config.vectorStoreConfig,
    };

    // Initialize memory systems
    this.shortTerm = new ShortTermMemory({
      maxItems: this.config.maxShortTermItems,
      defaultTTL: this.config.shortTermTTL,
    });

    this.longTerm = new LongTermMemory({
      maxItems: this.config.maxLongTermItems,
      persistenceEnabled: true,
    });

    // Initialize vector memory if configured
    if (this.config.enableVector && this.config.vectorStoreConfig) {
      // Create a mock SecretsService for VectorStoreService
      const secretsService = {} as never;
      const vectorStore = new VectorStoreService(secretsService);
      this.vector = new VectorMemory(vectorStore, this.config.vectorStoreConfig);
    }

    // Start cleanup routine
    this.startCleanup();

    logger.info('MemoryManager initialized', this.config);
  }

  /**
   * Store a memory item
   */
  async store(
    item: Omit<MemoryItem, 'id' | 'type' | 'accessCount' | 'lastAccessed' | 'createdAt'>,
    options: { memoryType?: MemoryType; autoPromote?: boolean } = {}
  ): Promise<MemoryItem> {
    const { memoryType = 'short-term', autoPromote = true } = options;

    let storedItem: MemoryItem;

    // Store in requested memory type
    switch (memoryType) {
      case 'short-term':
        storedItem = await this.shortTerm.store(item);
        // Auto-promote to long-term if importance is high
        if (autoPromote && item.importance >= this.config.promotionThreshold) {
          await this.promote(storedItem.id);
        }
        break;

      case 'long-term':
        storedItem = await this.longTerm.store(item);
        // Also store in vector memory if enabled
        if (this.vector && item.embedding) {
          await this.vector.store(item);
        }
        break;

      case 'vector':
        if (!this.vector) {
          throw new Error('Vector memory not enabled');
        }
        storedItem = await this.vector.store(item);
        break;

      default:
        throw new Error(`Unsupported memory type: ${memoryType}`);
    }

    logger.debug(`Stored memory item: ${storedItem.id} (${memoryType})`);
    return storedItem;
  }

  /**
   * Retrieve a memory item by ID
   */
  async retrieve(id: string, memoryType?: MemoryType): Promise<MemoryItem | null> {
    if (memoryType) {
      return this.retrieveFromType(id, memoryType);
    }

    // Try all memory types
    let item = await this.shortTerm.retrieve(id);
    if (item) return item;

    item = await this.longTerm.retrieve(id);
    if (item) return item;

    if (this.vector) {
      item = await this.vector.retrieve(id);
      if (item) return item;
    }

    return null;
  }

  /**
   * Query memories across all types
   */
  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    const results: MemoryItem[] = [];

    // Query short-term memory
    if (this.config.enableShortTerm) {
      const stResults = await this.shortTerm.query(query);
      results.push(...stResults);
    }

    // Query long-term memory
    if (this.config.enableLongTerm) {
      const ltResults = await this.longTerm.query(query);
      results.push(...ltResults);
    }

    // Query vector memory with semantic search
    if (this.vector && (query.text || query.embedding)) {
      const vecResults = await this.vector.query(query);
      results.push(...vecResults);
    }

    // Deduplicate by ID
    const uniqueResults = this.deduplicateResults(results);

    // Sort by relevance score
    const scored = this.scoreResults(uniqueResults, query);

    return scored.slice(0, query.topK);
  }

  /**
   * Semantic search using vector similarity
   */
  async semanticSearch(queryText: string, topK = 10, minSimilarity = 0.7): Promise<MemoryItem[]> {
    if (!this.vector) {
      throw new Error('Vector memory not enabled');
    }

    return this.vector.search(queryText, topK, minSimilarity);
  }

  /**
   * Get conversation context for an agent
   */
  async getContext(conversationId: string, limit = 10): Promise<AgentContext> {
    const memories = await this.query({
      filter: { conversationId },
      topK: limit,
    });

    const shortTermMemories = memories.filter(m => m.type === 'short-term');
    const longTermMemories = memories.filter(m => m.type === 'long-term');

    return {
      conversationId,
      shortTermMemory: shortTermMemories,
      longTermMemory: longTermMemories,
      variables: {},
      state: {},
    };
  }

  /**
   * Promote a memory from short-term to long-term
   */
  async promote(itemId: string): Promise<MemoryItem | null> {
    const item = await this.shortTerm.retrieve(itemId);
    if (!item) {
      return null;
    }

    // Store in long-term memory
    const promoted = await this.longTerm.store({
      content: item.content,
      embedding: item.embedding,
      metadata: { ...item.metadata, promotedFrom: item.id },
      importance: item.importance,
      tags: item.tags,
      source: item.source,
    });

    // Store in vector memory if enabled
    if (this.vector && item.embedding) {
      await this.vector.store({
        content: promoted.content,
        embedding: promoted.embedding,
        metadata: promoted.metadata,
        importance: promoted.importance,
        tags: promoted.tags,
        source: promoted.source,
      });
    }

    logger.info(`Promoted memory ${itemId} to long-term`);
    return promoted;
  }

  /**
   * Forget (delete) a memory
   */
  async forget(itemId: string): Promise<boolean> {
    let deleted = false;

    deleted = await this.shortTerm.delete(itemId) || deleted;
    deleted = await this.longTerm.delete(itemId) || deleted;

    if (this.vector) {
      deleted = await this.vector.delete(itemId) || deleted;
    }

    if (deleted) {
      logger.info(`Forgot memory: ${itemId}`);
    }

    return deleted;
  }

  /**
   * Consolidate memories by merging similar items
   */
  async consolidate(similarityThreshold = 0.9): Promise<number> {
    let consolidated = 0;

    if (this.config.enableLongTerm && this.config.compressionEnabled) {
      consolidated += await this.longTerm.consolidate(similarityThreshold);
    }

    return consolidated;
  }

  /**
   * Clear all memories
   */
  async clearAll(): Promise<void> {
    await this.shortTerm.clear();
    await this.longTerm.clear();
    if (this.vector) {
      // Vector memory doesn't have a clear method yet
      logger.warn('Vector memory clear not implemented');
    }
    logger.info('All memories cleared');
  }

  /**
   * Get comprehensive memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    const stStats = this.shortTerm.getStats();
    const ltStats = this.longTerm.getStats();

    const byType: Record<MemoryType, number> = {
      'short-term': stStats.totalItems,
      'long-term': ltStats.totalItems,
      'vector': 0,
      'episodic': 0,
      'semantic': 0,
    };

    if (this.vector) {
      const vecStats = await this.vector.getStats();
      byType.vector = vecStats.totalVectors;
    }

    return {
      totalItems: stStats.totalItems + ltStats.totalItems,
      byType,
      totalSize: ltStats.totalSize,
      averageImportance: (stStats.averageImportance + ltStats.averageImportance) / 2,
      oldestItem: ltStats.oldestItem || stStats.oldestItem,
      newestItem: ltStats.newestItem || stStats.newestItem,
      compressionRatio: this.config.compressionEnabled ? 1.0 : undefined,
    };
  }

  /**
   * Cleanup expired and low-value memories
   */
  async cleanup(): Promise<{
    shortTermRemoved: number;
    longTermRemoved: number;
    consolidated: number;
  }> {
    const shortTermRemoved = await this.shortTerm.cleanup();
    const longTermRemoved = 0; // Long-term uses importance-based eviction

    let consolidated = 0;
    if (this.config.compressionEnabled) {
      consolidated = await this.consolidate(0.95);
    }

    if (shortTermRemoved + consolidated > 0) {
      logger.info('Memory cleanup complete', { shortTermRemoved, longTermRemoved, consolidated });
    }

    return { shortTermRemoved, longTermRemoved, consolidated };
  }

  /**
   * Shutdown the memory manager
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    await this.cleanup();
    logger.info('MemoryManager shutdown complete');
  }

  // Private methods

  private async retrieveFromType(id: string, memoryType: MemoryType): Promise<MemoryItem | null> {
    switch (memoryType) {
      case 'short-term':
        return this.shortTerm.retrieve(id);
      case 'long-term':
        return this.longTerm.retrieve(id);
      case 'vector':
        return this.vector ? this.vector.retrieve(id) : null;
      default:
        return null;
    }
  }

  private deduplicateResults(results: MemoryItem[]): MemoryItem[] {
    const seen = new Set<string>();
    const unique: MemoryItem[] = [];

    for (const item of results) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }

    return unique;
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
    let score = item.importance * 0.5;

    // Recency bonus
    const ageMs = Date.now() - new Date(item.createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - (ageDays / 30)); // Decay over 30 days
    score += recencyScore * 0.3;

    // Access frequency bonus
    const accessScore = Math.min(1, item.accessCount / 50);
    score += accessScore * 0.2;

    return score;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        logger.error('Memory cleanup failed:', error);
      }
    }, this.config.cleanupInterval);
  }
}

// Configuration types
interface MemoryManagerConfig {
  enableShortTerm: boolean;
  enableLongTerm: boolean;
  enableVector: boolean;
  maxShortTermItems: number;
  maxLongTermItems: number;
  shortTermTTL: number;
  promotionThreshold: number;
  compressionEnabled: boolean;
  cleanupInterval: number;
  vectorStoreConfig?: {
    provider: 'pinecone' | 'weaviate' | 'chroma' | 'milvus' | 'qdrant';
    apiKey?: string;
    url?: string;
    dimensions?: number;
  };
}

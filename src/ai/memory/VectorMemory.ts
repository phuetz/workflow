import { MemoryItem, MemoryQuery } from '../../types/agents';
import { VectorStoreService, VectorDocument, VectorQuery, VectorStoreConfig } from '../../services/VectorStoreService';
import { logger } from '../../services/SimpleLogger';

/**
 * Vector Memory - Semantic search using vector embeddings
 * Integrates with vector stores for similarity-based retrieval
 */
export class VectorMemory {
  private vectorStore: VectorStoreService;
  private config: VectorStoreConfig;
  private embeddingModel: string;
  private dimensions: number;

  constructor(
    vectorStore: VectorStoreService,
    config: {
      provider: VectorStoreConfig['provider'];
      apiKey?: string;
      url?: string;
      index?: string;
      dimensions?: number;
      embeddingModel?: string;
    }
  ) {
    this.vectorStore = vectorStore;
    this.config = {
      provider: config.provider,
      apiKey: config.apiKey,
      url: config.url,
      index: config.index || 'agent-memory',
      dimensions: config.dimensions || 1536, // OpenAI ada-002 default
      metric: 'cosine',
    };
    this.embeddingModel = config.embeddingModel || 'text-embedding-ada-002';
    this.dimensions = config.dimensions || 1536;

    logger.info('VectorMemory initialized', {
      provider: this.config.provider,
      dimensions: this.dimensions,
    });
  }

  /**
   * Store a memory item with vector embedding
   */
  async store(item: Omit<MemoryItem, 'id' | 'type' | 'accessCount' | 'lastAccessed' | 'createdAt'>): Promise<MemoryItem> {
    const memoryItem: MemoryItem = {
      id: this.generateId(),
      type: 'vector',
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

    // Generate embedding if not provided
    if (!memoryItem.embedding) {
      memoryItem.embedding = await this.generateEmbedding(memoryItem.content);
    }

    // Store in vector database
    const vectorDoc: VectorDocument = {
      id: memoryItem.id,
      content: memoryItem.content,
      embedding: memoryItem.embedding,
      metadata: {
        ...memoryItem.metadata,
        importance: memoryItem.importance,
        tags: memoryItem.tags,
        source: memoryItem.source,
        createdAt: memoryItem.createdAt,
      },
    };

    await this.vectorStore.insertVectors(this.config, [vectorDoc]);

    logger.debug(`Stored item in vector memory: ${memoryItem.id}`);
    return memoryItem;
  }

  /**
   * Retrieve item by ID
   */
  async retrieve(id: string): Promise<MemoryItem | null> {
    try {
      // Search by ID using metadata filter
      const results = await this.vectorStore.searchVectors(this.config, {
        text: '',
        topK: 1,
        filter: { id },
      });

      if (results.documents.length === 0) {
        return null;
      }

      return this.documentToMemoryItem(results.documents[0]);
    } catch (error) {
      logger.error(`Failed to retrieve item ${id}:`, error);
      return null;
    }
  }

  /**
   * Semantic search using query text
   */
  async search(queryText: string, topK = 10, minSimilarity = 0.7): Promise<MemoryItem[]> {
    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(queryText);

    return this.searchByEmbedding(queryEmbedding, topK, minSimilarity);
  }

  /**
   * Semantic search using embedding vector
   */
  async searchByEmbedding(embedding: number[], topK = 10, minSimilarity = 0.7): Promise<MemoryItem[]> {
    try {
      const query: VectorQuery = {
        vector: embedding,
        topK: topK * 2, // Request more to filter by similarity
        includeMetadata: true,
        includeValues: true,
      };

      const results = await this.vectorStore.searchVectors(this.config, query);

      // Filter by minimum similarity and convert to MemoryItems
      return results.documents
        .filter(doc => (doc.score || 0) >= minSimilarity)
        .slice(0, topK)
        .map(doc => this.documentToMemoryItem(doc));
    } catch (error) {
      logger.error('Vector search failed:', error);
      return [];
    }
  }

  /**
   * Query with advanced filtering
   */
  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    let embedding: number[] | undefined;

    // Generate embedding from text query
    if (query.text) {
      embedding = await this.generateEmbedding(query.text);
    } else if (query.embedding) {
      embedding = query.embedding;
    }

    if (!embedding) {
      throw new Error('Query must include text or embedding');
    }

    // Build vector query with filters
    const vectorQuery: VectorQuery = {
      vector: embedding,
      topK: query.topK * 2,
      filter: this.buildFilter(query),
      includeMetadata: true,
      includeValues: true,
    };

    const results = await this.vectorStore.searchVectors(this.config, vectorQuery);

    return results.documents
      .slice(0, query.topK)
      .map(doc => this.documentToMemoryItem(doc));
  }

  /**
   * Update existing memory item
   */
  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem | null> {
    const existing = await this.retrieve(id);
    if (!existing) {
      return null;
    }

    const updated: MemoryItem = {
      ...existing,
      ...updates,
      id: existing.id,
      type: existing.type,
      createdAt: existing.createdAt,
      lastAccessed: new Date().toISOString(),
      accessCount: existing.accessCount + 1,
    };

    // Regenerate embedding if content changed
    if (updates.content && updates.content !== existing.content) {
      updated.embedding = await this.generateEmbedding(updates.content);
    }

    const vectorDoc: VectorDocument = {
      id: updated.id,
      content: updated.content,
      embedding: updated.embedding,
      metadata: {
        ...updated.metadata,
        importance: updated.importance,
        tags: updated.tags,
        source: updated.source,
        accessCount: updated.accessCount,
        lastAccessed: updated.lastAccessed,
      },
    };

    await this.vectorStore.updateVectors(this.config, [vectorDoc]);

    return updated;
  }

  /**
   * Delete memory item
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.vectorStore.deleteVectors(this.config, [id]);
      return result.success;
    } catch (error) {
      logger.error(`Failed to delete item ${id}:`, error);
      return false;
    }
  }

  /**
   * Find similar memories to a given memory
   */
  async findSimilar(memoryId: string, topK = 5): Promise<MemoryItem[]> {
    const memory = await this.retrieve(memoryId);
    if (!memory || !memory.embedding) {
      return [];
    }

    const results = await this.searchByEmbedding(memory.embedding, topK + 1, 0.7);

    // Filter out the original memory
    return results.filter(m => m.id !== memoryId).slice(0, topK);
  }

  /**
   * Cluster memories by similarity
   */
  async cluster(numClusters = 5): Promise<MemoryCluster[]> {
    // This would require implementing k-means or similar clustering
    // For now, return empty array as placeholder
    logger.warn('Clustering not yet implemented');
    return [];
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<VectorMemoryStats> {
    try {
      const indexStats = await this.vectorStore.getIndexStats(
        this.config,
        this.config.index || 'agent-memory'
      );

      return {
        totalVectors: indexStats.totalVectors,
        dimensions: indexStats.dimensions,
        indexSize: indexStats.indexSize,
        lastUpdated: indexStats.lastUpdated,
      };
    } catch (error) {
      logger.error('Failed to get vector memory stats:', error);
      return {
        totalVectors: 0,
        dimensions: this.dimensions,
        indexSize: 0,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  // Private methods

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const embeddings = await this.vectorStore.generateEmbeddings([text], this.embeddingModel);
      return embeddings[0];
    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  private documentToMemoryItem(doc: VectorDocument): MemoryItem {
    return {
      id: doc.id,
      type: 'vector',
      content: doc.content,
      embedding: doc.embedding,
      metadata: doc.metadata,
      importance: (doc.metadata.importance as number) || 0.5,
      accessCount: (doc.metadata.accessCount as number) || 0,
      lastAccessed: (doc.metadata.lastAccessed as string) || new Date().toISOString(),
      createdAt: (doc.metadata.createdAt as string) || new Date().toISOString(),
      tags: (doc.metadata.tags as string[]) || [],
      source: doc.metadata.source as string,
    };
  }

  private buildFilter(query: MemoryQuery): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (query.filter) {
      Object.assign(filter, query.filter);
    }

    if (query.tags && query.tags.length > 0) {
      filter.tags = { $in: query.tags };
    }

    if (query.minImportance !== undefined) {
      filter.importance = { $gte: query.minImportance };
    }

    if (query.timeRange) {
      filter.createdAt = {
        $gte: query.timeRange.start,
        $lte: query.timeRange.end,
      };
    }

    return filter;
  }

  private generateId(): string {
    return `vec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Types
interface MemoryCluster {
  id: string;
  centroid: number[];
  members: string[];
  label?: string;
}

interface VectorMemoryStats {
  totalVectors: number;
  dimensions: number;
  indexSize: number;
  lastUpdated: string;
}

import {
  Memory,
  MemoryQuery,
  MemorySearchResult,
  MemoryWithScore,
  PruneCriteria,
  PruneResult,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  MemoryStoreConfig,
  MemoryEvent,
  MemoryEventType,
  MemoryHealth,
  MemoryIssue,
  PerformanceMetrics,
  LatencyMetrics,
  BulkMemoryOperation,
  BulkMemoryResult,
} from '../types/memory';
import { EventEmitter } from 'events';
import crypto from 'crypto';

/**
 * MemoryStore - Core memory storage and retrieval system with vector-based search
 *
 * Features:
 * - Vector-based similarity search with multiple metrics
 * - Automatic memory pruning and compression
 * - Event-driven architecture
 * - Performance monitoring
 * - CRUD operations with validation
 */
export class MemoryStore extends EventEmitter {
  private memories: Map<string, Memory> = new Map();
  private userIndex: Map<string, Set<string>> = new Map();
  private agentIndex: Map<string, Set<string>> = new Map();
  private typeIndex: Map<string, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private config: MemoryStoreConfig;
  private performanceData: {
    storeLatencies: number[];
    retrieveLatencies: number[];
    searchAccuracy: number[];
  } = {
    storeLatencies: [],
    retrieveLatencies: [],
    searchAccuracy: [],
  };

  constructor(config: Partial<MemoryStoreConfig> = {}) {
    super();
    this.config = {
      provider: 'in-memory',
      compression: {
        enabled: true,
        minSize: 1024,
        algorithm: 'gzip',
        level: 6,
      },
      embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small',
        dimensions: 1536,
        batchSize: 100,
        cache: true,
      },
      pruning: {
        enabled: true,
        schedule: '0 2 * * *', // 2 AM daily
        criteria: {
          maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
          minImportance: 0.1,
          strategy: 'combined',
        },
        notifications: true,
      },
      caching: {
        enabled: true,
        ttl: 3600,
        maxSize: 100,
        strategy: 'lru',
      },
      ...config,
    };
  }

  /**
   * Store a new memory
   */
  async store(request: CreateMemoryRequest): Promise<Memory> {
    const startTime = Date.now();

    try {
      // Validate request
      this.validateCreateRequest(request);

      // Generate embedding if not provided
      const embedding = await this.generateEmbedding(request.content);

      // Create memory object
      const memory: Memory = {
        id: this.generateId(),
        agentId: request.agentId,
        userId: request.userId,
        timestamp: new Date(),
        content: request.content,
        embedding,
        importance: request.importance ?? this.calculateImportance(request),
        type: request.type,
        metadata: request.metadata ?? {},
        version: 1,
        compressed: false,
        accessCount: 0,
        lastAccessed: new Date(),
        expiresAt: request.expiresAt,
      };

      // Add tags to metadata
      if (request.tags) {
        memory.metadata.tags = request.tags;
      }

      // Store in memory
      this.memories.set(memory.id, memory);

      // Update indices
      this.updateIndices(memory, 'add');

      // Record performance
      const latency = Date.now() - startTime;
      this.recordStoreLatency(latency);

      // Emit event
      this.emitEvent({
        id: this.generateId(),
        type: 'created',
        timestamp: new Date(),
        userId: memory.userId,
        agentId: memory.agentId,
        memoryId: memory.id,
        metadata: { latency },
      });

      return memory;
    } catch (error) {
      this.emitEvent({
        id: this.generateId(),
        type: 'error',
        timestamp: new Date(),
        userId: request.userId,
        agentId: request.agentId,
        metadata: { error: String(error) },
      });
      throw error;
    }
  }

  /**
   * Retrieve memories by IDs
   */
  async retrieve(ids: string[]): Promise<Memory[]> {
    const startTime = Date.now();
    const memories: Memory[] = [];

    for (const id of ids) {
      const memory = this.memories.get(id);
      if (memory && !this.isExpired(memory)) {
        // Update access metadata
        memory.accessCount++;
        memory.lastAccessed = new Date();
        memories.push(memory);

        this.emitEvent({
          id: this.generateId(),
          type: 'accessed',
          timestamp: new Date(),
          userId: memory.userId,
          agentId: memory.agentId,
          memoryId: memory.id,
          metadata: {},
        });
      }
    }

    this.recordRetrieveLatency(Date.now() - startTime);
    return memories;
  }

  /**
   * Update an existing memory
   */
  async update(request: UpdateMemoryRequest): Promise<Memory> {
    const memory = this.memories.get(request.id);
    if (!memory) {
      throw new Error(`Memory not found: ${request.id}`);
    }

    // Update fields
    if (request.content !== undefined) {
      memory.content = request.content;
      memory.embedding = await this.generateEmbedding(request.content);
    }

    if (request.importance !== undefined) {
      memory.importance = request.importance;
    }

    if (request.metadata !== undefined) {
      memory.metadata = { ...memory.metadata, ...request.metadata };
    }

    if (request.tags !== undefined) {
      memory.metadata.tags = request.tags;
      this.updateTagIndex(memory);
    }

    if (request.expiresAt !== undefined) {
      memory.expiresAt = request.expiresAt;
    }

    memory.version++;

    this.emitEvent({
      id: this.generateId(),
      type: 'updated',
      timestamp: new Date(),
      userId: memory.userId,
      agentId: memory.agentId,
      memoryId: memory.id,
      metadata: {},
    });

    return memory;
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<boolean> {
    const memory = this.memories.get(id);
    if (!memory) {
      return false;
    }

    this.memories.delete(id);
    this.updateIndices(memory, 'remove');

    this.emitEvent({
      id: this.generateId(),
      type: 'deleted',
      timestamp: new Date(),
      userId: memory.userId,
      agentId: memory.agentId,
      memoryId: id,
      metadata: {},
    });

    return true;
  }

  /**
   * Search memories using vector similarity
   */
  async search(query: MemoryQuery): Promise<MemorySearchResult> {
    const startTime = Date.now();

    try {
      // Get candidate memories based on filters
      const candidates = this.filterMemories(query);

      // Generate query embedding if text provided
      let queryEmbedding = query.embedding;
      if (query.query && !queryEmbedding) {
        queryEmbedding = await this.generateEmbedding(query.query);
      }

      // Calculate similarities if embedding provided
      let results: MemoryWithScore[];
      if (queryEmbedding) {
        results = candidates.map((memory) => {
          const similarity = this.cosineSimilarity(
            queryEmbedding!,
            memory.embedding
          );
          return {
            ...memory,
            score: similarity,
            relevance: similarity * memory.importance,
          };
        });

        // Sort by relevance
        results.sort((a, b) => b.relevance - a.relevance);
      } else {
        // No embedding, sort by importance and recency
        results = candidates.map((memory) => ({
          ...memory,
          score: memory.importance,
          relevance: memory.importance,
        }));

        results.sort((a, b) => {
          const scoreDiff = b.score - a.score;
          if (Math.abs(scoreDiff) < 0.01) {
            return b.timestamp.getTime() - a.timestamp.getTime();
          }
          return scoreDiff;
        });
      }

      // Apply pagination
      const limit = query.limit ?? 10;
      const offset = query.offset ?? 0;
      const paginatedResults = results.slice(offset, offset + limit);

      const executionTime = Date.now() - startTime;

      return {
        memories: paginatedResults,
        total: results.length,
        executionTime,
        query,
      };
    } catch (error) {
      throw new Error(`Search failed: ${error}`);
    }
  }

  /**
   * Prune memories based on criteria
   */
  async prune(criteria: PruneCriteria): Promise<PruneResult> {
    const startTime = Date.now();
    const deletedIds: string[] = [];
    let freedSpace = 0;

    const strategy = criteria.strategy ?? 'combined';
    const candidates = Array.from(this.memories.values());

    // Calculate scores for each memory
    const scored = candidates.map((memory) => ({
      memory,
      score: this.calculatePruneScore(memory, strategy),
    }));

    // Sort by score (lower = more likely to prune)
    scored.sort((a, b) => a.score - b.score);

    // Determine memories to delete
    const toDelete: Memory[] = [];

    for (const { memory } of scored) {
      // Check if should preserve
      if (criteria.preserveTypes?.includes(memory.type)) continue;
      if (
        criteria.preserveTags?.some((tag) =>
          memory.metadata.tags?.includes(tag)
        )
      )
        continue;

      // Check age
      if (criteria.maxAge) {
        const age = Date.now() - memory.timestamp.getTime();
        if (age > criteria.maxAge) {
          toDelete.push(memory);
          continue;
        }
      }

      // Check importance
      if (criteria.minImportance && memory.importance < criteria.minImportance) {
        toDelete.push(memory);
        continue;
      }

      // Check max memories
      if (
        criteria.maxMemories &&
        this.memories.size - toDelete.length > criteria.maxMemories
      ) {
        toDelete.push(memory);
      }
    }

    // Delete memories unless dry run
    if (!criteria.dryRun) {
      for (const memory of toDelete) {
        freedSpace += this.estimateMemorySize(memory);
        await this.delete(memory.id);
        deletedIds.push(memory.id);
      }

      this.emitEvent({
        id: this.generateId(),
        type: 'pruned',
        timestamp: new Date(),
        userId: '',
        agentId: '',
        metadata: {
          deleted: deletedIds.length,
          strategy,
          freedSpace,
        },
      });
    }

    return {
      deleted: deletedIds.length,
      preserved: this.memories.size,
      freedSpace,
      duration: Date.now() - startTime,
      strategy,
      deletedIds,
    };
  }

  /**
   * Bulk operations
   */
  async bulk(operation: BulkMemoryOperation): Promise<BulkMemoryResult> {
    const startTime = Date.now();
    let successful = 0;
    let failed = 0;
    const errors: Array<{ id?: string; error: string }> = [];

    for (const item of operation.memories) {
      try {
        switch (operation.operation) {
          case 'create':
            await this.store(item as CreateMemoryRequest);
            successful++;
            break;
          case 'update':
            await this.update(item as UpdateMemoryRequest);
            successful++;
            break;
          case 'delete':
            await this.delete(item as string);
            successful++;
            break;
        }
      } catch (error) {
        failed++;
        errors.push({
          id: typeof item === 'string' ? item : (item as any).id,
          error: String(error),
        });
      }
    }

    return {
      successful,
      failed,
      errors,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Get memory health status
   */
  async getHealth(): Promise<MemoryHealth> {
    const totalMemories = this.memories.size;
    const totalSize = this.getTotalSize();
    const storageLimit = 10 * 1024 * 1024; // 10MB default
    const utilizationPercent = (totalSize / storageLimit) * 100;

    const avgSearchLatency = this.calculateAvgLatency(
      this.performanceData.retrieveLatencies
    );
    const recallAccuracy = this.calculateAvgAccuracy();

    const issues: MemoryIssue[] = [];
    const recommendations: string[] = [];

    // Check for issues
    if (utilizationPercent > 90) {
      issues.push({
        severity: 'critical',
        type: 'storage',
        message: 'Storage utilization above 90%',
        timestamp: new Date(),
      });
      recommendations.push('Run memory pruning to free up space');
    } else if (utilizationPercent > 75) {
      issues.push({
        severity: 'medium',
        type: 'storage',
        message: 'Storage utilization above 75%',
        timestamp: new Date(),
      });
    }

    if (avgSearchLatency > 100) {
      issues.push({
        severity: 'medium',
        type: 'performance',
        message: `Average search latency ${avgSearchLatency}ms exceeds threshold`,
        timestamp: new Date(),
      });
      recommendations.push('Consider enabling caching or optimizing indices');
    }

    if (recallAccuracy < 0.9) {
      issues.push({
        severity: 'low',
        type: 'accuracy',
        message: `Recall accuracy ${recallAccuracy} below optimal`,
        timestamp: new Date(),
      });
      recommendations.push('Review embedding model or increase importance thresholds');
    }

    const status =
      issues.some((i) => i.severity === 'critical')
        ? 'critical'
        : issues.some((i) => i.severity === 'high' || i.severity === 'medium')
        ? 'degraded'
        : 'healthy';

    return {
      status,
      totalMemories,
      storageUsed: totalSize,
      storageLimit,
      utilizationPercent,
      avgSearchLatency,
      recallAccuracy,
      issues,
      recommendations,
    };
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return {
      recallLatency: this.calculateLatencyMetrics(
        this.performanceData.retrieveLatencies
      ),
      storeLatency: this.calculateLatencyMetrics(
        this.performanceData.storeLatencies
      ),
      searchAccuracy: {
        precision: this.calculateAvgAccuracy(),
        recall: this.calculateAvgAccuracy(),
        f1Score: this.calculateAvgAccuracy(),
        relevanceScore: this.calculateAvgAccuracy(),
      },
      storageEfficiency: {
        totalSize: this.getTotalSize(),
        compressedSize: this.getCompressedSize(),
        compressionRatio: this.getCompressionRatio(),
        memoryCount: this.memories.size,
        avgMemorySize: this.getTotalSize() / (this.memories.size || 1),
        storagePerUser: this.getStoragePerUser(),
      },
      timestamp: new Date(),
    };
  }

  /**
   * Clear all memories (use with caution!)
   */
  async clear(): Promise<void> {
    this.memories.clear();
    this.userIndex.clear();
    this.agentIndex.clear();
    this.typeIndex.clear();
    this.tagIndex.clear();
    this.performanceData = {
      storeLatencies: [],
      retrieveLatencies: [],
      searchAccuracy: [],
    };
  }

  // Private helper methods

  private validateCreateRequest(request: CreateMemoryRequest): void {
    if (!request.userId) throw new Error('userId is required');
    if (!request.agentId) throw new Error('agentId is required');
    if (!request.content) throw new Error('content is required');
    if (!request.type) throw new Error('type is required');
    if (request.importance !== undefined) {
      if (request.importance < 0 || request.importance > 1) {
        throw new Error('importance must be between 0 and 1');
      }
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Simplified embedding generation - in production, use OpenAI/Anthropic API
    // For now, generate a simple hash-based embedding
    const hash = crypto.createHash('sha256').update(text).digest();
    const embedding: number[] = [];
    for (let i = 0; i < this.config.embedding.dimensions; i++) {
      embedding.push(hash[i % hash.length] / 255);
    }
    return embedding;
  }

  private calculateImportance(request: CreateMemoryRequest): number {
    // Simple importance calculation based on type and content length
    let importance = 0.5;

    // Boost importance for certain types
    if (request.type === 'preference') importance += 0.2;
    if (request.type === 'pattern') importance += 0.15;
    if (request.type === 'workflow') importance += 0.1;

    // Boost for longer, more detailed content
    const contentLength = request.content.length;
    if (contentLength > 500) importance += 0.1;
    if (contentLength > 1000) importance += 0.1;

    return Math.min(importance, 1.0);
  }

  private updateIndices(memory: Memory, action: 'add' | 'remove'): void {
    const updateIndex = (index: Map<string, Set<string>>, key: string) => {
      if (action === 'add') {
        if (!index.has(key)) index.set(key, new Set());
        index.get(key)!.add(memory.id);
      } else {
        index.get(key)?.delete(memory.id);
        if (index.get(key)?.size === 0) index.delete(key);
      }
    };

    updateIndex(this.userIndex, memory.userId);
    updateIndex(this.agentIndex, memory.agentId);
    updateIndex(this.typeIndex, memory.type);

    if (memory.metadata.tags) {
      for (const tag of memory.metadata.tags as string[]) {
        updateIndex(this.tagIndex, tag);
      }
    }
  }

  private updateTagIndex(memory: Memory): void {
    // Remove old tag entries
    for (const [tag, memoryIds] of this.tagIndex.entries()) {
      memoryIds.delete(memory.id);
      if (memoryIds.size === 0) this.tagIndex.delete(tag);
    }

    // Add new tags
    if (memory.metadata.tags) {
      for (const tag of memory.metadata.tags as string[]) {
        if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
        this.tagIndex.get(tag)!.add(memory.id);
      }
    }
  }

  private filterMemories(query: MemoryQuery): Memory[] {
    let candidates = Array.from(this.memories.values());

    // Filter by user
    if (query.userId) {
      const userMemoryIds = this.userIndex.get(query.userId);
      if (userMemoryIds) {
        candidates = candidates.filter((m) => userMemoryIds.has(m.id));
      } else {
        return [];
      }
    }

    // Filter by agent
    if (query.agentId) {
      const agentMemoryIds = this.agentIndex.get(query.agentId);
      if (agentMemoryIds) {
        candidates = candidates.filter((m) => agentMemoryIds.has(m.id));
      } else {
        return [];
      }
    }

    // Filter by type
    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      candidates = candidates.filter((m) => types.includes(m.type));
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      candidates = candidates.filter((m) =>
        query.tags!.every((tag) => m.metadata.tags?.includes(tag))
      );
    }

    // Filter by time range
    if (query.timeRange) {
      candidates = candidates.filter(
        (m) =>
          m.timestamp >= query.timeRange!.start &&
          m.timestamp <= query.timeRange!.end
      );
    }

    // Filter by importance
    if (query.minImportance !== undefined) {
      candidates = candidates.filter((m) => m.importance >= query.minImportance!);
    }
    if (query.maxImportance !== undefined) {
      candidates = candidates.filter((m) => m.importance <= query.maxImportance!);
    }

    // Filter expired unless requested
    if (!query.includeExpired) {
      candidates = candidates.filter((m) => !this.isExpired(m));
    }

    return candidates;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  private calculatePruneScore(
    memory: Memory,
    strategy: string
  ): number {
    const age = Date.now() - memory.timestamp.getTime();
    const ageScore = age / (90 * 24 * 60 * 60 * 1000); // Normalized to 90 days

    switch (strategy) {
      case 'lru':
        return Date.now() - memory.lastAccessed.getTime();
      case 'lfu':
        return -memory.accessCount;
      case 'importance':
        return -memory.importance;
      case 'age':
        return -age;
      case 'combined':
      default:
        // Weighted combination
        return (
          ageScore * 0.3 +
          (1 - memory.importance) * 0.4 +
          (1 / (memory.accessCount + 1)) * 0.3
        );
    }
  }

  private isExpired(memory: Memory): boolean {
    return memory.expiresAt ? memory.expiresAt <= new Date() : false;
  }

  private estimateMemorySize(memory: Memory): number {
    const jsonSize = JSON.stringify(memory).length;
    const embeddingSize = memory.embedding.length * 8; // 8 bytes per number
    return jsonSize + embeddingSize;
  }

  private getTotalSize(): number {
    let total = 0;
    for (const memory of this.memories.values()) {
      total += this.estimateMemorySize(memory);
    }
    return total;
  }

  private getCompressedSize(): number {
    let total = 0;
    for (const memory of this.memories.values()) {
      if (memory.compressed) {
        total += this.estimateMemorySize(memory) * 0.3; // Assume 70% compression
      } else {
        total += this.estimateMemorySize(memory);
      }
    }
    return total;
  }

  private getCompressionRatio(): number {
    const total = this.getTotalSize();
    const compressed = this.getCompressedSize();
    return total === 0 ? 1 : compressed / total;
  }

  private getStoragePerUser(): number {
    const userCounts = new Map<string, number>();
    for (const memory of this.memories.values()) {
      userCounts.set(
        memory.userId,
        (userCounts.get(memory.userId) || 0) + this.estimateMemorySize(memory)
      );
    }
    const total = Array.from(userCounts.values()).reduce((a, b) => a + b, 0);
    return total / (userCounts.size || 1);
  }

  private recordStoreLatency(latency: number): void {
    this.performanceData.storeLatencies.push(latency);
    // Keep only last 1000 measurements
    if (this.performanceData.storeLatencies.length > 1000) {
      this.performanceData.storeLatencies.shift();
    }
  }

  private recordRetrieveLatency(latency: number): void {
    this.performanceData.retrieveLatencies.push(latency);
    if (this.performanceData.retrieveLatencies.length > 1000) {
      this.performanceData.retrieveLatencies.shift();
    }
  }

  private calculateAvgLatency(latencies: number[]): number {
    if (latencies.length === 0) return 0;
    return latencies.reduce((a, b) => a + b, 0) / latencies.length;
  }

  private calculateLatencyMetrics(latencies: number[]): LatencyMetrics {
    if (latencies.length === 0) {
      return { p50: 0, p90: 0, p95: 0, p99: 0, avg: 0, max: 0, min: 0 };
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    const percentile = (p: number) =>
      sorted[Math.floor(sorted.length * p)];

    return {
      p50: percentile(0.5),
      p90: percentile(0.9),
      p95: percentile(0.95),
      p99: percentile(0.99),
      avg: this.calculateAvgLatency(latencies),
      max: Math.max(...latencies),
      min: Math.min(...latencies),
    };
  }

  private calculateAvgAccuracy(): number {
    const { searchAccuracy } = this.performanceData;
    if (searchAccuracy.length === 0) return 0.95; // Default
    return searchAccuracy.reduce((a, b) => a + b, 0) / searchAccuracy.length;
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emitEvent(event: MemoryEvent): void {
    this.emit(event.type, event);
    this.emit('event', event);
  }
}

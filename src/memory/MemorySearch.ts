import {
  Memory,
  MemoryQuery,
  MemorySearchResult,
  MemoryWithScore,
  SimilaritySearchConfig,
  MemoryFilter,
  FilterOperator,
} from '../types/memory';
import { MemoryStore } from './MemoryStore';
import { EventEmitter } from 'events';

/**
 * MemorySearch - Advanced semantic search across memories
 *
 * Features:
 * - Semantic similarity search using embeddings
 * - Temporal filtering (recent vs old)
 * - Relevance ranking with multiple factors
 * - Efficient retrieval with caching
 * - Multi-criteria filtering
 * - Search analytics and optimization
 */
export class MemorySearch extends EventEmitter {
  private memoryStore: MemoryStore;
  private config: SearchConfig;
  private searchCache: Map<string, CachedSearchResult> = new Map();
  private searchHistory: SearchHistoryEntry[] = [];

  constructor(
    memoryStore: MemoryStore,
    config: Partial<SearchConfig> = {}
  ) {
    super();
    this.memoryStore = memoryStore;
    this.config = {
      cacheEnabled: true,
      cacheTTL: 300000, // 5 minutes
      maxCacheSize: 100,
      defaultSimilarityMetric: 'cosine',
      defaultThreshold: 0.7,
      maxResults: 50,
      enableAnalytics: true,
      boostRecent: true,
      recencyWeight: 0.2,
      importanceWeight: 0.3,
      similarityWeight: 0.5,
      ...config,
    };
  }

  /**
   * Semantic search for memories
   */
  async search(
    query: MemoryQuery,
    options: Partial<SimilaritySearchConfig> = {}
  ): Promise<MemorySearchResult> {
    const startTime = Date.now();

    // Check cache
    if (this.config.cacheEnabled) {
      const cached = this.getCachedResult(query);
      if (cached) {
        this.emit('search:cache-hit', { query });
        return cached.result;
      }
    }

    // Build search configuration
    const searchConfig: SimilaritySearchConfig = {
      metric: options.metric || this.config.defaultSimilarityMetric,
      threshold: options.threshold || this.config.defaultThreshold,
      maxResults: options.maxResults || this.config.maxResults,
      includeScores: options.includeScores ?? true,
      filters: options.filters || [],
    };

    // Execute search via memory store
    const result = await this.memoryStore.search(query);

    // Re-rank results based on multiple factors
    const rerankedMemories = this.rerankResults(
      result.memories,
      query,
      searchConfig
    );

    // Apply threshold filtering
    const filteredMemories = rerankedMemories.filter(
      (memory) => memory.score >= searchConfig.threshold
    );

    // Limit results
    const limitedMemories = filteredMemories.slice(0, searchConfig.maxResults);

    const finalResult: MemorySearchResult = {
      memories: limitedMemories,
      total: filteredMemories.length,
      executionTime: Date.now() - startTime,
      query,
    };

    // Cache result
    if (this.config.cacheEnabled) {
      this.cacheResult(query, finalResult);
    }

    // Record search analytics
    if (this.config.enableAnalytics) {
      this.recordSearch(query, finalResult);
    }

    this.emit('search:complete', {
      query,
      resultCount: finalResult.memories.length,
      executionTime: finalResult.executionTime,
    });

    return finalResult;
  }

  /**
   * Find similar memories to a given memory
   */
  async findSimilar(
    memoryId: string,
    limit = 5,
    threshold = 0.7
  ): Promise<MemoryWithScore[]> {
    const startTime = Date.now();

    // Get the source memory
    const [sourceMemory] = await this.memoryStore.retrieve([memoryId]);

    if (!sourceMemory) {
      throw new Error(`Memory not found: ${memoryId}`);
    }

    // Search using the memory's embedding
    const result = await this.search({
      embedding: sourceMemory.embedding,
      userId: sourceMemory.userId,
      agentId: sourceMemory.agentId,
      limit: limit + 1, // +1 to exclude the source
    }, {
      threshold,
      maxResults: limit + 1,
    });

    // Filter out the source memory
    const similarMemories = result.memories.filter((m) => m.id !== memoryId);

    this.emit('similar:found', {
      memoryId,
      similarCount: similarMemories.length,
      executionTime: Date.now() - startTime,
    });

    return similarMemories.slice(0, limit);
  }

  /**
   * Temporal search - find memories from a specific time period
   */
  async searchTemporal(
    query: Omit<MemoryQuery, 'timeRange'>,
    period: 'recent' | 'today' | 'week' | 'month' | 'year' | 'custom',
    customRange?: { start: Date; end: Date }
  ): Promise<MemorySearchResult> {
    const timeRange = this.getTimeRange(period, customRange);

    return this.search({
      ...query,
      timeRange,
    });
  }

  /**
   * Search by importance level
   */
  async searchByImportance(
    query: Omit<MemoryQuery, 'minImportance' | 'maxImportance'>,
    importance: 'critical' | 'high' | 'medium' | 'low'
  ): Promise<MemorySearchResult> {
    const ranges = {
      critical: { min: 0.9, max: 1.0 },
      high: { min: 0.7, max: 0.9 },
      medium: { min: 0.4, max: 0.7 },
      low: { min: 0.0, max: 0.4 },
    };

    const range = ranges[importance];

    return this.search({
      ...query,
      minImportance: range.min,
      maxImportance: range.max,
    });
  }

  /**
   * Faceted search - search across multiple dimensions
   */
  async facetedSearch(
    baseQuery: string,
    facets: {
      types?: string[];
      tags?: string[];
      importanceRanges?: Array<{ min: number; max: number }>;
      timeRanges?: Array<{ start: Date; end: Date }>;
    }
  ): Promise<{
    byType?: Record<string, MemorySearchResult>;
    byTag?: Record<string, MemorySearchResult>;
    byImportance?: Record<string, MemorySearchResult>;
    byTime?: Record<string, MemorySearchResult>;
  }> {
    const results: {
      byType?: Record<string, MemorySearchResult>;
      byTag?: Record<string, MemorySearchResult>;
      byImportance?: Record<string, MemorySearchResult>;
      byTime?: Record<string, MemorySearchResult>;
    } = {};

    // Search by types
    if (facets.types && facets.types.length > 0) {
      results.byType = {};
      for (const type of facets.types) {
        results.byType[type] = await this.search({
          query: baseQuery,
          type: type as any,
        });
      }
    }

    // Search by tags
    if (facets.tags && facets.tags.length > 0) {
      results.byTag = {};
      for (const tag of facets.tags) {
        results.byTag[tag] = await this.search({
          query: baseQuery,
          tags: [tag],
        });
      }
    }

    // Search by importance ranges
    if (facets.importanceRanges && facets.importanceRanges.length > 0) {
      results.byImportance = {};
      for (const range of facets.importanceRanges) {
        const key = `${range.min}-${range.max}`;
        results.byImportance[key] = await this.search({
          query: baseQuery,
          minImportance: range.min,
          maxImportance: range.max,
        });
      }
    }

    // Search by time ranges
    if (facets.timeRanges && facets.timeRanges.length > 0) {
      results.byTime = {};
      for (const range of facets.timeRanges) {
        const key = `${range.start.toISOString()}-${range.end.toISOString()}`;
        results.byTime[key] = await this.search({
          query: baseQuery,
          timeRange: range,
        });
      }
    }

    return results;
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(
    partialQuery: string,
    userId: string,
    agentId: string,
    limit = 5
  ): Promise<string[]> {
    // Get recent searches from history
    const recentSearches = this.searchHistory
      .filter(
        (entry) =>
          entry.query.userId === userId &&
          entry.query.agentId === agentId &&
          entry.query.query?.toLowerCase().includes(partialQuery.toLowerCase())
      )
      .slice(0, limit)
      .map((entry) => entry.query.query!);

    return [...new Set(recentSearches)];
  }

  /**
   * Get search analytics
   */
  getAnalytics(userId?: string, agentId?: string): {
    totalSearches: number;
    avgExecutionTime: number;
    avgResultCount: number;
    topQueries: Array<{ query: string; count: number }>;
    searchesByType: Record<string, number>;
    cacheHitRate: number;
  } {
    let relevantSearches = this.searchHistory;

    if (userId || agentId) {
      relevantSearches = this.searchHistory.filter((entry) => {
        if (userId && entry.query.userId !== userId) return false;
        if (agentId && entry.query.agentId !== agentId) return false;
        return true;
      });
    }

    if (relevantSearches.length === 0) {
      return {
        totalSearches: 0,
        avgExecutionTime: 0,
        avgResultCount: 0,
        topQueries: [],
        searchesByType: {},
        cacheHitRate: 0,
      };
    }

    const totalExecutionTime = relevantSearches.reduce(
      (sum, entry) => sum + entry.executionTime,
      0
    );

    const totalResults = relevantSearches.reduce(
      (sum, entry) => sum + entry.resultCount,
      0
    );

    // Count queries
    const queryCounts = new Map<string, number>();
    for (const entry of relevantSearches) {
      if (entry.query.query) {
        const count = queryCounts.get(entry.query.query) || 0;
        queryCounts.set(entry.query.query, count + 1);
      }
    }

    const topQueries = Array.from(queryCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Count by type
    const searchesByType: Record<string, number> = {};
    for (const entry of relevantSearches) {
      if (entry.query.type) {
        const types = Array.isArray(entry.query.type)
          ? entry.query.type
          : [entry.query.type];

        for (const type of types) {
          searchesByType[type] = (searchesByType[type] || 0) + 1;
        }
      }
    }

    return {
      totalSearches: relevantSearches.length,
      avgExecutionTime: totalExecutionTime / relevantSearches.length,
      avgResultCount: totalResults / relevantSearches.length,
      topQueries,
      searchesByType,
      cacheHitRate: 0, // Would need cache hit tracking
    };
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
    this.emit('cache:cleared');
  }

  /**
   * Clear search history
   */
  clearHistory(): void {
    this.searchHistory = [];
    this.emit('history:cleared');
  }

  // Private helper methods

  private rerankResults(
    memories: MemoryWithScore[],
    query: MemoryQuery,
    config: SimilaritySearchConfig
  ): MemoryWithScore[] {
    return memories.map((memory) => {
      let finalScore = memory.score || 0;

      // Apply importance boost
      const importanceBoost = memory.importance * this.config.importanceWeight;
      finalScore = finalScore * this.config.similarityWeight + importanceBoost;

      // Apply recency boost if enabled
      if (this.config.boostRecent) {
        const age = Date.now() - memory.timestamp.getTime();
        const ageDays = age / (1000 * 60 * 60 * 24);
        const recencyScore = Math.max(0, 1 - ageDays / 30); // Decay over 30 days
        finalScore += recencyScore * this.config.recencyWeight;
      }

      // Normalize to 0-1 range
      finalScore = Math.min(1, Math.max(0, finalScore));

      return {
        ...memory,
        score: finalScore,
        relevance: finalScore,
      };
    }).sort((a, b) => b.score - a.score);
  }

  private getTimeRange(
    period: 'recent' | 'today' | 'week' | 'month' | 'year' | 'custom',
    customRange?: { start: Date; end: Date }
  ): { start: Date; end: Date } {
    const now = new Date();
    const end = now;
    let start: Date;

    switch (period) {
      case 'recent':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
        break;
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (!customRange) {
          throw new Error('Custom range requires start and end dates');
        }
        return customRange;
      default:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }

  private getCachedResult(query: MemoryQuery): CachedSearchResult | null {
    const cacheKey = this.getCacheKey(query);
    const cached = this.searchCache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if expired
    const age = Date.now() - cached.timestamp;
    if (age > this.config.cacheTTL) {
      this.searchCache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  private cacheResult(query: MemoryQuery, result: MemorySearchResult): void {
    const cacheKey = this.getCacheKey(query);

    // Evict old entries if cache is full
    if (this.searchCache.size >= this.config.maxCacheSize) {
      const oldestKey = Array.from(this.searchCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.searchCache.delete(oldestKey);
    }

    this.searchCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });
  }

  private getCacheKey(query: MemoryQuery): string {
    // Create a deterministic cache key from query
    return JSON.stringify({
      query: query.query,
      userId: query.userId,
      agentId: query.agentId,
      type: query.type,
      tags: query.tags?.sort(),
      minImportance: query.minImportance,
      maxImportance: query.maxImportance,
      limit: query.limit,
    });
  }

  private recordSearch(query: MemoryQuery, result: MemorySearchResult): void {
    this.searchHistory.push({
      query,
      resultCount: result.memories.length,
      executionTime: result.executionTime,
      timestamp: Date.now(),
    });

    // Keep only last 1000 searches
    if (this.searchHistory.length > 1000) {
      this.searchHistory = this.searchHistory.slice(-1000);
    }
  }
}

// Configuration interfaces
interface SearchConfig {
  cacheEnabled: boolean;
  cacheTTL: number;
  maxCacheSize: number;
  defaultSimilarityMetric: 'cosine' | 'euclidean' | 'dotproduct';
  defaultThreshold: number;
  maxResults: number;
  enableAnalytics: boolean;
  boostRecent: boolean;
  recencyWeight: number;
  importanceWeight: number;
  similarityWeight: number;
}

interface CachedSearchResult {
  result: MemorySearchResult;
  timestamp: number;
}

interface SearchHistoryEntry {
  query: MemoryQuery;
  resultCount: number;
  executionTime: number;
  timestamp: number;
}

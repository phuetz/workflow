/**
 * Query Optimization Service
 * Monitors database query performance and provides optimization recommendations
 */

import { logger } from '../../services/LoggingService';
import { BaseService } from '../../services/BaseService';
import { DatabaseConnection } from '../database/connection';

export interface QueryStats {
  queryHash: string;
  queryText: string;
  executionCount: number;
  totalTimeMs: number;
  avgTimeMs: number;
  maxTimeMs: number;
  minTimeMs: number;
  lastExecutedAt: Date;
  suggestions?: string[];
}

export interface QueryPlan {
  query: string;
  plan: Record<string, unknown>;
  estimatedCost: number;
  actualCost?: number;
  suggestions: string[];
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  maxSize: number; // Max cache size in MB
  strategy: 'LRU' | 'LFU' | 'TTL';
}

export class QueryOptimizationService extends BaseService {
  private queryCache: Map<string, { data: unknown; expiry: number }> = new Map();
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private slowQueryThreshold: number = 100; // milliseconds
  private analyzeInterval: NodeJS.Timeout | null = null;

  constructor(
    private db: DatabaseConnection,
    private cacheConfig: CacheConfig = {
      enabled: true,
      ttl: 300, // 5 minutes
      maxSize: 50, // 50MB
      strategy: 'LRU'
    }
  ) {
    super();
    this.startMonitoring();
  }

  /**
   * Start monitoring query performance
   */
  private startMonitoring(): void {
    // Analyze query performance every 5 minutes
    this.analyzeInterval = setInterval(() => {
      this.analyzeSlowQueries().catch(err => {
        logger.error('Failed to analyze slow queries:', err);
      });
    }, 5 * 60 * 1000);

    // Clean up cache periodically
    setInterval(() => {
      this.cleanupCache();
    }, 60 * 1000); // Every minute
  }

  /**
   * Execute query with optimization
   */
  async executeOptimized<T>(
    query: string,
    params: unknown[] = [],
    options: { cache?: boolean; timeout?: number } = {}
  ): Promise<T> {

    try {
      // Check cache first
      if (options.cache !== false && this.cacheConfig.enabled) {
        if (cached !== null) {
          this.cacheHits++;
          logger.debug(`Cache hit for query: ${queryHash}`);
          return cached;
        }
        this.cacheMisses++;
      }

      // Execute query

      // Record query statistics
      await this.recordQueryStats(queryHash, query, executionTime);

      // Cache result if enabled
      if (options.cache !== false && this.cacheConfig.enabled) {
        this.addToCache(queryHash, result);
      }

      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        logger.warn('Slow query detected', {
          query: query.substring(0, 200),
          executionTime,
          params: params.length
        });
      }

      return result;
    } catch (error) {
      await this.recordQueryStats(queryHash, query, executionTime, true);
      throw error;
    }
  }

  /**
   * Analyze query execution plan
   */
  async analyzeQuery(query: string, params: unknown[] = []): Promise<QueryPlan> {
    try {
      // Get query execution plan (PostgreSQL example)


      return {
        query,
        plan,
        estimatedCost: plan['Total Cost'] || 0,
        actualCost: plan['Actual Total Time'] || 0,
        suggestions
      };
    } catch (error) {
      logger.error('Failed to analyze query:', error);
      throw error;
    }
  }

  /**
   * Get slow query statistics
   */
  async getSlowQueries(limit: number = 20): Promise<QueryStats[]> {
      SELECT 
        query_hash,
        query_text,
        execution_count,
        total_time_ms,
        avg_time_ms,
        max_time_ms,
        min_time_ms,
        last_executed_at
      FROM query_performance_stats
      WHERE avg_time_ms > ?
      ORDER BY avg_time_ms DESC
      LIMIT ?
    `;

      query,
      [this.slowQueryThreshold, limit]
    );

    // Add optimization suggestions for each slow query
    for (const stat of results) {
      stat.suggestions = await this.getSuggestionsForQuery(stat.queryText);
    }

    return results;
  }

  /**
   * Analyze slow queries and generate recommendations
   */
  private async analyzeSlowQueries(): Promise<void> {

    for (const query of slowQueries) {
      if (query.avgTimeMs > this.slowQueryThreshold * 2) {
        logger.warn('Critical slow query detected', {
          query: query.queryText.substring(0, 200),
          avgTime: query.avgTimeMs,
          executions: query.executionCount
        });

        // Send alert for critical queries
        await this.sendSlowQueryAlert(query);
      }
    }
  }

  /**
   * Generate optimization suggestions based on query and execution plan
   */
  private generateOptimizationSuggestions(query: string, plan: Record<string, unknown>): string[] {
    const suggestions: string[] = [];

    // Check for missing indexes
    if (plan['Index Scan'] === undefined && plan['Seq Scan']) {
      suggestions.push('Consider adding an index on the WHERE clause columns');
    }

    // Check for full table scans
    if (plan['Seq Scan'] && plan['Rows'] > 1000) {
      suggestions.push('Query is performing a full table scan on a large table');
    }

    // Check for missing JOIN conditions
    if (queryLower.includes('join') && !queryLower.includes(' on ')) {
      suggestions.push('Missing JOIN condition may cause cartesian product');
    }

    // Check for SELECT *
    if (queryLower.includes('select *')) {
      suggestions.push('Avoid SELECT *, specify only required columns');
    }

    // Check for missing LIMIT in large queries
    if (!queryLower.includes('limit') && plan['Rows'] > 10000) {
      suggestions.push('Consider adding LIMIT clause for large result sets');
    }

    // Check for subqueries that could be JOINs
    if (queryLower.includes('select') && queryLower.includes('where') && 
        queryLower.includes(' in (select')) {
      suggestions.push('Consider replacing subquery with JOIN for better performance');
    }

    // Check for missing WHERE clause
    if (!queryLower.includes('where') && plan['Rows'] > 1000) {
      suggestions.push('Query has no WHERE clause, fetching all rows');
    }

    // Check for OR conditions that prevent index usage
    if (queryLower.includes(' or ')) {
      suggestions.push('OR conditions may prevent index usage, consider UNION');
    }

    // Check for function calls on indexed columns
    if (functionPattern.test(queryLower)) {
      suggestions.push('Function calls on columns prevent index usage');
    }

    return suggestions;
  }

  /**
   * Get optimization suggestions for a specific query
   */
  private async getSuggestionsForQuery(queryText: string): Promise<string[]> {
    const suggestions: string[] = [];

    // Basic pattern matching for common issues
    if (queryLower.includes('select *')) {
      suggestions.push('Replace SELECT * with specific columns');
    }

    if (queryLower.includes('like \'%') && queryLower.includes('%\'')) {
      suggestions.push('Leading wildcard in LIKE prevents index usage');
    }

    if (queryLower.includes('order by') && !queryLower.includes('limit')) {
      suggestions.push('Add LIMIT when using ORDER BY for better performance');
    }

    if (queryLower.includes('distinct') && queryLower.includes('group by')) {
      suggestions.push('DISTINCT with GROUP BY is redundant');
    }

    if (queryLower.match(/join.*join.*join/)) {
      suggestions.push('Multiple JOINs detected, ensure proper indexes exist');
    }

    return suggestions;
  }

  /**
   * Record query statistics
   */
  private async recordQueryStats(
    queryHash: string,
    queryText: string,
    executionTime: number,
    failed: boolean = false
  ): Promise<void> {
    if (failed) return; // Don't record failed queries

    try {
      await this.db.query(`
        INSERT INTO query_performance_stats 
          (query_hash, query_text, execution_count, total_time_ms, avg_time_ms, max_time_ms, min_time_ms, last_executed_at)
        VALUES (?, ?, 1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT (query_hash) DO UPDATE SET
          execution_count = query_performance_stats.execution_count + 1,
          total_time_ms = query_performance_stats.total_time_ms + ?,
          avg_time_ms = (query_performance_stats.total_time_ms + ?) / (query_performance_stats.execution_count + 1),
          max_time_ms = GREATEST(query_performance_stats.max_time_ms, ?),
          min_time_ms = LEAST(query_performance_stats.min_time_ms, ?),
          last_executed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `, [
        queryHash,
        queryText.substring(0, 1000), // Limit query text length
        executionTime,
        executionTime,
        executionTime,
        executionTime,
        executionTime,
        executionTime,
        executionTime,
        executionTime
      ]);
    } catch (error) {
      logger.error('Failed to record query stats:', error);
    }
  }

  /**
   * Hash query for caching and statistics
   */
  private hashQuery(query: string, params: unknown[]): string {
    return crypto
      .createHash('sha256')
      .update(normalized + paramStr)
      .digest('hex');
  }

  /**
   * Cache management methods
   */
  private getFromCache(key: string): unknown | null {
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.queryCache.delete(key);
      return null;
    }

    // Update access time for LRU
    if (this.cacheConfig.strategy === 'LRU') {
      this.queryCache.delete(key);
      this.queryCache.set(key, cached);
    }

    return cached.data;
  }

  private addToCache(key: string, data: unknown): void {
    
    // Check cache size limit
    if (this.getCacheSize() > this.cacheConfig.maxSize * 1024 * 1024) {
      this.evictFromCache();
    }

    this.queryCache.set(key, { data, expiry });
  }

  private getCacheSize(): number {
    for (const [, value] of this.queryCache) {
      size += JSON.stringify(value).length;
    }
    return size;
  }

  private evictFromCache(): void {
    if (this.cacheConfig.strategy === 'LRU') {
      // Remove oldest entry (first in map)
      if (firstKey) {
        this.queryCache.delete(firstKey);
      }
    } else if (this.cacheConfig.strategy === 'TTL') {
      // Remove expired entries
      for (const [key, value] of this.queryCache) {
        if (now > value.expiry) {
          this.queryCache.delete(key);
        }
      }
    }
  }

  private cleanupCache(): void {
    for (const [key, value] of this.queryCache) {
      if (now > value.expiry) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    entries: number;
  } {
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0,
      size: this.getCacheSize(),
      entries: this.queryCache.size
    };
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    logger.info('Query cache cleared');
  }

  /**
   * Send alert for slow queries
   */
  private async sendSlowQueryAlert(query: QueryStats): Promise<void> {
    // In production, this would send to monitoring service
    logger.error('SLOW QUERY ALERT', {
      query: query.queryText.substring(0, 500),
      avgTime: query.avgTimeMs,
      maxTime: query.maxTimeMs,
      executions: query.executionCount,
      suggestions: query.suggestions
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.analyzeInterval) {
      clearInterval(this.analyzeInterval);
    }
    this.queryCache.clear();
  }

  /**
   * Database-specific optimization methods
   */
  async optimizeForPostgreSQL(): Promise<void> {
    // Run VACUUM ANALYZE on tables
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    );

    for (const { tablename } of tables) {
      try {
        await this.db.query(`VACUUM ANALYZE ${tablename}`);
        logger.info(`Optimized table: ${tablename}`);
      } catch (error) {
        logger.error(`Failed to optimize table ${tablename}:`, error);
      }
    }
  }

  async optimizeForMySQL(): Promise<void> {
    // Run OPTIMIZE TABLE on all tables
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()"
    );

    for (const { TABLE_NAME } of tables) {
      try {
        await this.db.query(`OPTIMIZE TABLE ${TABLE_NAME}`);
        logger.info(`Optimized table: ${TABLE_NAME}`);
      } catch (error) {
        logger.error(`Failed to optimize table ${TABLE_NAME}:`, error);
      }
    }
  }
}

// Export singleton instance
export const queryOptimizer = new QueryOptimizationService(
  DatabaseConnection.getInstance(),
  {
    enabled: true,
    ttl: 300,
    maxSize: 50,
    strategy: 'LRU'
  }
);
/**
 * Query Optimization Service
 * Monitors database query performance and provides optimization recommendations
 */

import { logger } from '../../services/SimpleLogger';
import { BaseService } from '../../services/BaseService';
import { DatabaseConnection } from '../database/connection';
import * as crypto from 'crypto';

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

/**
 * SQL Identifier validation - prevents SQL injection via table/column names
 * Valid PostgreSQL/MySQL identifiers: alphanumeric, underscores, starting with letter or underscore
 */
const SAFE_IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Dangerous SQL patterns that should not be allowed in EXPLAIN queries
 */
const DANGEROUS_SQL_PATTERNS = [
  /;\s*(DROP|DELETE|TRUNCATE|UPDATE|INSERT|ALTER|CREATE|GRANT|REVOKE)/i,  // Multiple statements with DDL/DML
  /--/,  // SQL comments (can hide malicious code)
  /\/\*/,  // Block comments
  /\bINTO\s+OUTFILE\b/i,  // File operations
  /\bINTO\s+DUMPFILE\b/i,  // File operations
  /\bLOAD_FILE\b/i,  // File operations
  /\bpg_read_file\b/i,  // PostgreSQL file operations
  /\bpg_write_file\b/i,  // PostgreSQL file operations
];

/**
 * Validates a SQL identifier (table name, column name) to prevent SQL injection
 */
function isValidSqlIdentifier(identifier: string): boolean {
  if (!identifier || typeof identifier !== 'string') {
    return false;
  }
  // Max identifier length for PostgreSQL/MySQL is 63/64 characters
  if (identifier.length > 63) {
    return false;
  }
  return SAFE_IDENTIFIER_PATTERN.test(identifier);
}

/**
 * Validates a query for safe EXPLAIN execution
 */
function isQuerySafeForExplain(query: string): boolean {
  if (!query || typeof query !== 'string') {
    return false;
  }
  // Check for dangerous patterns
  for (const pattern of DANGEROUS_SQL_PATTERNS) {
    if (pattern.test(query)) {
      return false;
    }
  }
  // Only allow SELECT queries for EXPLAIN to prevent side effects
  const trimmed = query.trim().toUpperCase();
  if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH')) {
    return false;
  }
  return true;
}

/**
 * Escapes a SQL identifier for safe use in queries
 * Uses double-quote escaping (ANSI SQL standard, works in PostgreSQL)
 */
function escapeIdentifier(identifier: string): string {
  if (!isValidSqlIdentifier(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }
  // Double any existing double quotes and wrap in double quotes
  return `"${identifier.replace(/"/g, '""')}"`;
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
    super('QueryOptimizationService');
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
      this.cleanupQueryCache();
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
    const queryHash = this.hashQuery(query, params);
    const startTime = Date.now();

    try {
      // Check cache first
      if (options.cache !== false && this.cacheConfig.enabled) {
        const cached = this.getQueryFromCache(queryHash);
        if (cached !== null) {
          this.cacheHits++;
          logger.debug(`Cache hit for query: ${queryHash}`);
          return cached as T;
        }
        this.cacheMisses++;
      }

      // Execute query
      const result = await this.db.query<T>(query, params);
      const executionTime = Date.now() - startTime;

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
      const executionTime = Date.now() - startTime;
      await this.recordQueryStats(queryHash, query, executionTime, true);
      throw error;
    }
  }

  /**
   * Analyze query execution plan
   * SECURITY: Validates query before EXPLAIN to prevent SQL injection
   */
  async analyzeQuery(query: string, params: unknown[] = []): Promise<QueryPlan> {
    try {
      // SECURITY FIX: Validate query before using in EXPLAIN
      if (!isQuerySafeForExplain(query)) {
        throw new Error('Query validation failed: only SELECT/WITH queries without dangerous patterns are allowed for EXPLAIN');
      }

      // Get query execution plan (PostgreSQL example)
      // The query is validated above, and params are passed separately for parameterization
      const planResult = await this.db.query(`EXPLAIN (FORMAT JSON, ANALYZE) ${query}`, params);
      const plan = planResult[0]?.['QUERY PLAN']?.[0]?.['Plan'] || {};

      const suggestions = this.generateOptimizationSuggestions(query, plan);

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
    const query = `
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

    const queryResult = await this.db.query<QueryStats[]>(
      query,
      [this.slowQueryThreshold, limit]
    );

    // Ensure we have an array
    const results = Array.isArray(queryResult) ? queryResult : [];

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
    const slowQueries = await this.getSlowQueries(50);

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
    const queryLower = query.toLowerCase();

    // Check for missing indexes
    if (plan['Index Scan'] === undefined && plan['Seq Scan']) {
      suggestions.push('Consider adding an index on the WHERE clause columns');
    }

    // Check for full table scans
    const planRows = plan['Rows'];
    if (plan['Seq Scan'] && typeof planRows === 'number' && planRows > 1000) {
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
    if (!queryLower.includes('limit') && typeof planRows === 'number' && planRows > 10000) {
      suggestions.push('Consider adding LIMIT clause for large result sets');
    }

    // Check for subqueries that could be JOINs
    if (queryLower.includes('select') && queryLower.includes('where') &&
        queryLower.includes(' in (select')) {
      suggestions.push('Consider replacing subquery with JOIN for better performance');
    }

    // Check for missing WHERE clause
    if (!queryLower.includes('where') && typeof planRows === 'number' && planRows > 1000) {
      suggestions.push('Query has no WHERE clause, fetching all rows');
    }

    // Check for OR conditions that prevent index usage
    if (queryLower.includes(' or ')) {
      suggestions.push('OR conditions may prevent index usage, consider UNION');
    }

    // Check for function calls on indexed columns
    const functionPattern = /\w+\([^)]*\)\s*(=|>|<|>=|<=|!=)/;
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
    const queryLower = queryText.toLowerCase();

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
    const normalized = query.replace(/\s+/g, ' ').trim();
    const paramStr = JSON.stringify(params);
    return crypto
      .createHash('sha256')
      .update(normalized + paramStr)
      .digest('hex');
  }

  /**
   * Cache management methods
   */
  private getQueryFromCache(key: string): unknown | null {
    const cached = this.queryCache.get(key);
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
    const expiry = Date.now() + (this.cacheConfig.ttl * 1000);

    // Check cache size limit
    if (this.getCacheSize() > this.cacheConfig.maxSize * 1024 * 1024) {
      this.evictFromCache();
    }

    this.queryCache.set(key, { data, expiry });
  }

  private getCacheSize(): number {
    let size = 0;
    for (const [, value] of Array.from(this.queryCache.entries())) {
      size += JSON.stringify(value).length;
    }
    return size;
  }

  private evictFromCache(): void {
    if (this.cacheConfig.strategy === 'LRU') {
      // Remove oldest entry (first in map)
      const firstKey = this.queryCache.keys().next().value;
      if (firstKey) {
        this.queryCache.delete(firstKey);
      }
    } else if (this.cacheConfig.strategy === 'TTL') {
      // Remove expired entries
      const now = Date.now();
      for (const [key, value] of Array.from(this.queryCache.entries())) {
        if (now > value.expiry) {
          this.queryCache.delete(key);
        }
      }
    }
  }

  private cleanupQueryCache(): void {
    const now = Date.now();
    for (const [key, value] of Array.from(this.queryCache.entries())) {
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
    const total = this.cacheHits + this.cacheMisses;
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
   * SECURITY: Table names are validated and escaped to prevent SQL injection
   */
  async optimizeForPostgreSQL(): Promise<void> {
    // Run VACUUM ANALYZE on tables
    const queryResult = await this.db.query<{ tablename: string }[]>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    );

    const tables = Array.isArray(queryResult) ? queryResult : [];

    for (const { tablename } of tables) {
      try {
        // SECURITY FIX: Validate and escape table name to prevent SQL injection
        if (!isValidSqlIdentifier(tablename)) {
          logger.warn(`Skipping invalid table name: ${tablename}`);
          continue;
        }
        const safeTableName = escapeIdentifier(tablename);
        await this.db.query(`VACUUM ANALYZE ${safeTableName}`);
        logger.info(`Optimized table: ${tablename}`);
      } catch (error) {
        logger.error(`Failed to optimize table ${tablename}:`, error);
      }
    }
  }

  async optimizeForMySQL(): Promise<void> {
    // Run OPTIMIZE TABLE on all tables
    const queryResult = await this.db.query<{ TABLE_NAME: string }[]>(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()"
    );

    const tables = Array.isArray(queryResult) ? queryResult : [];

    for (const { TABLE_NAME } of tables) {
      try {
        // SECURITY FIX: Validate and escape table name to prevent SQL injection
        if (!isValidSqlIdentifier(TABLE_NAME)) {
          logger.warn(`Skipping invalid table name: ${TABLE_NAME}`);
          continue;
        }
        // MySQL uses backticks for identifier quoting
        const safeTableName = `\`${TABLE_NAME.replace(/`/g, '``')}\``;
        await this.db.query(`OPTIMIZE TABLE ${safeTableName}`);
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
/**
 * Data Query - Handles query execution, caching, and federated queries
 */

import type {
  QueryRequest,
  QueryResult,
  CacheEntry,
  DataLakeAdapter,
} from './types';

// =============================================================================
// Query Cache
// =============================================================================

export class QueryCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 100;
  private defaultTtl = 300000; // 5 minutes

  /**
   * Get cached result
   */
  get(key: string): QueryResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * Cache a result
   */
  set(key: string, result: QueryResult, ttl?: number): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
    });
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Generate cache key for a query request
   */
  generateKey(request: QueryRequest): string {
    return JSON.stringify({
      sql: request.sql,
      table: request.table,
      columns: request.columns,
      filters: request.filters,
      orderBy: request.orderBy,
      limit: request.limit,
      offset: request.offset,
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Set maximum cache size
   */
  setMaxSize(size: number): void {
    this.maxSize = size;
  }

  /**
   * Set default TTL
   */
  setDefaultTtl(ttl: number): void {
    this.defaultTtl = ttl;
  }
}

// =============================================================================
// Query Executor
// =============================================================================

export class QueryExecutor {
  private adapters: Map<string, DataLakeAdapter>;
  private cache: QueryCache;
  private onCacheHit?: (dataLakeName: string) => void;
  private onQueryExecuted?: (
    dataLakeName: string,
    result: QueryResult
  ) => void;

  constructor(
    adapters: Map<string, DataLakeAdapter>,
    cache: QueryCache,
    callbacks?: {
      onCacheHit?: (dataLakeName: string) => void;
      onQueryExecuted?: (dataLakeName: string, result: QueryResult) => void;
    }
  ) {
    this.adapters = adapters;
    this.cache = cache;
    this.onCacheHit = callbacks?.onCacheHit;
    this.onQueryExecuted = callbacks?.onQueryExecuted;
  }

  /**
   * Execute query with optional caching
   */
  async execute(
    dataLakeName: string,
    request: QueryRequest
  ): Promise<QueryResult> {
    // Handle federated queries
    if (request.federatedSources && request.federatedSources.length > 0) {
      return this.executeFederated(dataLakeName, request);
    }

    // Check cache
    if (request.cacheResults !== false) {
      const cacheKey = this.cache.generateKey(request);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.onCacheHit?.(dataLakeName);
        return { ...cached, cached: true };
      }
    }

    const adapter = this.getAdapter(dataLakeName);
    const result = await adapter.query(request);

    // Cache results
    if (request.cacheResults !== false) {
      const cacheKey = this.cache.generateKey(request);
      this.cache.set(cacheKey, result);
    }

    this.onQueryExecuted?.(dataLakeName, result);
    return result;
  }

  /**
   * Execute federated query across multiple data lakes
   */
  async executeFederated(
    primaryDataLake: string,
    request: QueryRequest
  ): Promise<QueryResult> {
    const startTime = Date.now();
    const results: QueryResult[] = [];
    const errors: { source: string; error: unknown }[] = [];

    // Query primary source
    results.push(
      await this.getAdapter(primaryDataLake).query({
        ...request,
        federatedSources: undefined,
      })
    );

    // Query federated sources
    for (const sourceName of request.federatedSources || []) {
      try {
        const adapter = this.adapters.get(sourceName);
        if (adapter) {
          results.push(
            await adapter.query({
              ...request,
              federatedSources: undefined,
            })
          );
        }
      } catch (error) {
        errors.push({ source: sourceName, error });
      }
    }

    // Merge results
    const rows = results.flatMap(r => r.rows);
    const finalRows = request.limit ? rows.slice(0, request.limit) : rows;

    return {
      columns: results[0]?.columns || [],
      rows: finalRows,
      rowCount: finalRows.length,
      executionTime: Date.now() - startTime,
      bytesScanned: results.reduce((sum, r) => sum + r.bytesScanned, 0),
      cost: results.reduce((sum, r) => sum + (r.cost || 0), 0),
      warnings:
        errors.length > 0
          ? [`Some federated sources failed: ${errors.map(e => e.source).join(', ')}`]
          : undefined,
    };
  }

  /**
   * Invalidate cache for table
   */
  invalidateCache(tableName: string): void {
    this.cache.invalidate(tableName);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.invalidate();
  }

  private getAdapter(name: string): DataLakeAdapter {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Data lake '${name}' not initialized`);
    }
    return adapter;
  }
}

// =============================================================================
// Query Builder Helper
// =============================================================================

export class QueryBuilder {
  private table?: string;
  private columns: string[] = [];
  private filters: Array<{
    column: string;
    operator: string;
    value: unknown;
    value2?: unknown;
  }> = [];
  private orderByClause: Array<{
    column: string;
    direction: 'asc' | 'desc';
    nullsFirst?: boolean;
  }> = [];
  private groupByColumns: string[] = [];
  private havingClause?: string;
  private limitValue?: number;
  private offsetValue?: number;
  private federatedSrc: string[] = [];
  private shouldCache = true;

  /**
   * Set the table to query
   */
  from(table: string): this {
    this.table = table;
    return this;
  }

  /**
   * Set columns to select
   */
  select(...columns: string[]): this {
    this.columns = columns;
    return this;
  }

  /**
   * Add a filter condition
   */
  where(
    column: string,
    operator:
      | 'eq'
      | 'ne'
      | 'gt'
      | 'gte'
      | 'lt'
      | 'lte'
      | 'in'
      | 'like'
      | 'between'
      | 'is_null'
      | 'is_not_null',
    value: unknown,
    value2?: unknown
  ): this {
    this.filters.push({ column, operator, value, value2 });
    return this;
  }

  /**
   * Add order by clause
   */
  orderBy(
    column: string,
    direction: 'asc' | 'desc' = 'asc',
    nullsFirst?: boolean
  ): this {
    this.orderByClause.push({ column, direction, nullsFirst });
    return this;
  }

  /**
   * Add group by columns
   */
  groupBy(...columns: string[]): this {
    this.groupByColumns = columns;
    return this;
  }

  /**
   * Set having clause
   */
  having(clause: string): this {
    this.havingClause = clause;
    return this;
  }

  /**
   * Set limit
   */
  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  /**
   * Set offset
   */
  offset(value: number): this {
    this.offsetValue = value;
    return this;
  }

  /**
   * Add federated sources
   */
  federated(...sources: string[]): this {
    this.federatedSrc = sources;
    return this;
  }

  /**
   * Disable caching
   */
  noCache(): this {
    this.shouldCache = false;
    return this;
  }

  /**
   * Build the query request
   */
  build(): QueryRequest {
    return {
      table: this.table,
      columns: this.columns.length > 0 ? this.columns : undefined,
      filters:
        this.filters.length > 0
          ? this.filters.map(f => ({
              column: f.column,
              operator: f.operator as QueryRequest['filters'][0]['operator'],
              value: f.value,
              value2: f.value2,
            }))
          : undefined,
      orderBy: this.orderByClause.length > 0 ? this.orderByClause : undefined,
      groupBy: this.groupByColumns.length > 0 ? this.groupByColumns : undefined,
      having: this.havingClause,
      limit: this.limitValue,
      offset: this.offsetValue,
      federatedSources:
        this.federatedSrc.length > 0 ? this.federatedSrc : undefined,
      cacheResults: this.shouldCache,
    };
  }
}

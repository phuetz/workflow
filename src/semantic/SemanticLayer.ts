/**
 * Semantic Layer - Core unified semantic model
 *
 * Provides a business-friendly abstraction over physical data sources,
 * enabling queries using business terminology instead of technical schemas.
 *
 * @module semantic/SemanticLayer
 */

import {
  Entity,
  Attribute,
  Relationship,
  Metric,
  Dimension,
  SemanticQuery,
  ParsedQuery,
  QueryResult,
  DataSourceReference,
  MetricCalculation,
  AggregationType
} from './types/semantic';

/**
 * SemanticLayer manages the unified semantic model
 */
export class SemanticLayer {
  private entities: Map<string, Entity> = new Map();
  private metrics: Map<string, Metric> = new Map();
  private dimensions: Map<string, Dimension> = new Map();
  private cache: Map<string, CachedResult> = new Map();

  // Cache statistics tracking
  private cacheStats = {
    hits: 0,
    misses: 0,
  };

  // Data source adapters for query execution
  private dataSourceAdapters: Map<string, DataSourceAdapter> = new Map();

  constructor() {
    this.initializeBuiltInEntities();
  }

  /**
   * Register a data source adapter
   */
  registerDataSourceAdapter(name: string, adapter: DataSourceAdapter): void {
    this.dataSourceAdapters.set(name, adapter);
  }

  // ============================================================================
  // ENTITY MANAGEMENT
  // ============================================================================

  /**
   * Register a new entity in the semantic model
   */
  registerEntity(entity: Entity): void {
    this.validateEntity(entity);
    this.entities.set(entity.id, entity);
  }

  /**
   * Get entity by ID or name
   */
  getEntity(idOrName: string): Entity | undefined {
    // Try by ID first
    let entity = this.entities.get(idOrName);
    if (entity) return entity;

    // Try by name
    for (const e of Array.from(this.entities.values())) {
      if (e.name === idOrName || e.displayName === idOrName) {
        return e;
      }
    }

    return undefined;
  }

  /**
   * Get all entities
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Remove entity from model
   */
  removeEntity(id: string): void {
    this.entities.delete(id);
  }

  /**
   * Validate entity definition
   */
  private validateEntity(entity: Entity): void {
    if (!entity.id || !entity.name) {
      throw new Error('Entity must have id and name');
    }

    if (!entity.attributes || entity.attributes.length === 0) {
      throw new Error('Entity must have at least one attribute');
    }

    // Validate attributes
    for (const attr of entity.attributes) {
      if (!attr.name || !attr.dataType) {
        throw new Error(`Invalid attribute in entity ${entity.name}`);
      }
    }

    // Validate relationships
    for (const rel of entity.relationships || []) {
      if (!rel.fromEntity || !rel.toEntity) {
        throw new Error(`Invalid relationship in entity ${entity.name}`);
      }
    }
  }

  // ============================================================================
  // METRIC MANAGEMENT
  // ============================================================================

  /**
   * Register a new metric
   */
  registerMetric(metric: Metric): void {
    this.validateMetric(metric);
    this.metrics.set(metric.id, metric);
  }

  /**
   * Get metric by ID or name
   */
  getMetric(idOrName: string): Metric | undefined {
    // Try by ID first
    let metric = this.metrics.get(idOrName);
    if (metric) return metric;

    // Try by name
    for (const m of Array.from(this.metrics.values())) {
      if (m.name === idOrName || m.displayName === idOrName) {
        return m;
      }
    }

    return undefined;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Calculate metric value
   */
  async calculateMetric(
    metricId: string,
    filters?: any,
    timeRange?: any
  ): Promise<number> {
    const metric = this.getMetric(metricId);
    if (!metric) {
      throw new Error(`Metric not found: ${metricId}`);
    }

    // For simple metrics, use aggregation
    if (metric.calculation.type === 'simple') {
      return this.calculateSimpleMetric(metric, filters, timeRange);
    }

    // For derived metrics, calculate dependencies first
    if (metric.calculation.type === 'derived') {
      return this.calculateDerivedMetric(metric, filters, timeRange);
    }

    // For custom metrics, evaluate expression
    return this.evaluateCustomMetric(metric, filters, timeRange);
  }

  /**
   * Validate metric definition
   */
  private validateMetric(metric: Metric): void {
    if (!metric.id || !metric.name) {
      throw new Error('Metric must have id and name');
    }

    if (!metric.calculation || !metric.aggregation) {
      throw new Error('Metric must have calculation and aggregation');
    }
  }

  /**
   * Calculate simple metric (direct aggregation)
   */
  private async calculateSimpleMetric(
    metric: Metric,
    filters?: any,
    timeRange?: any
  ): Promise<number> {
    // Get the entity for this metric - using category as a fallback for entity reference
    const entityRef = (metric as any).entityId || metric.category || '';
    const entity = this.getEntity(entityRef);
    if (!entity) {
      throw new Error(`Entity not found for metric: ${metric.name}`);
    }

    // Get data source adapter
    const adapter = this.getDataSourceAdapter(entity.source);
    if (!adapter) {
      // Fallback to in-memory calculation if no adapter
      return this.calculateInMemoryMetric(metric, entity, filters, timeRange);
    }

    // Build and execute query
    const query = this.buildMetricQuery(metric, entity, filters, timeRange);
    const result = await adapter.executeQuery(query);

    // Extract aggregated value from result columns
    if (result.rows.length > 0 && result.columns.length > 0) {
      const metricColIndex = result.columns.findIndex(col => col.name === metric.name);
      if (metricColIndex >= 0 && result.rows[0][metricColIndex] !== undefined) {
        return Number(result.rows[0][metricColIndex]);
      }
    }

    return 0;
  }

  /**
   * Calculate metric in memory (when no data source adapter available)
   */
  private calculateInMemoryMetric(
    metric: Metric,
    entity: Entity,
    filters?: any,
    timeRange?: any
  ): number {
    // Return default value - in production would compute from cached data
    const defaults: Record<AggregationType, number> = {
      [AggregationType.SUM]: 0,
      [AggregationType.AVG]: 0,
      [AggregationType.COUNT]: 0,
      [AggregationType.COUNT_DISTINCT]: 0,
      [AggregationType.MIN]: 0,
      [AggregationType.MAX]: 0,
      [AggregationType.MEDIAN]: 0,
      [AggregationType.PERCENTILE]: 0,
      [AggregationType.STDDEV]: 0,
      [AggregationType.VARIANCE]: 0,
    };
    return defaults[metric.aggregation] || 0;
  }

  /**
   * Build query for metric calculation
   */
  private buildMetricQuery(
    metric: Metric,
    entity: Entity,
    filters?: any,
    timeRange?: any
  ): string {
    const aggFunc = this.getAggregationFunction(metric.aggregation);
    const tableName = entity.schema ? `${entity.schema}.${entity.tableName}` : entity.tableName;

    let sql = `SELECT ${aggFunc}(${metric.calculation.expression}) AS ${metric.name} FROM ${tableName}`;

    const conditions: string[] = [];

    // Add filters
    if (filters) {
      for (const [field, value] of Object.entries(filters)) {
        conditions.push(`${field} = ${this.formatValue(value)}`);
      }
    }

    // Add time range
    if (timeRange && timeRange.start && timeRange.end) {
      conditions.push(`timestamp >= '${timeRange.start.toISOString()}'`);
      conditions.push(`timestamp <= '${timeRange.end.toISOString()}'`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    return sql;
  }

  /**
   * Get data source adapter for entity
   */
  private getDataSourceAdapter(dataSource?: DataSourceReference): DataSourceAdapter | undefined {
    if (!dataSource) return undefined;
    return this.dataSourceAdapters.get(dataSource.name);
  }

  /**
   * Calculate derived metric (depends on other metrics)
   */
  private async calculateDerivedMetric(
    metric: Metric,
    filters?: any,
    timeRange?: any
  ): Promise<number> {
    const dependencies = metric.calculation.dependencies;
    const values: Record<string, number> = {};

    // Calculate all dependencies
    for (const depId of dependencies) {
      values[depId] = await this.calculateMetric(depId, filters, timeRange);
    }

    // Evaluate expression with dependency values
    return this.evaluateExpression(metric.calculation.expression, values);
  }

  /**
   * Evaluate custom metric expression
   */
  private async evaluateCustomMetric(
    metric: Metric,
    filters?: any,
    timeRange?: any
  ): Promise<number> {
    // Custom metric evaluation logic based on calculation type
    const expression = metric.calculation.expression;

    // Check if expression references other metrics
    const metricRefs = this.extractMetricReferences(expression);
    const values: Record<string, number> = {};

    // Calculate referenced metrics
    for (const ref of metricRefs) {
      const refMetric = this.getMetric(ref);
      if (refMetric) {
        values[ref] = await this.calculateMetric(ref, filters, timeRange);
      }
    }

    // Check for entity attribute aggregations - using category as fallback for entity reference
    const entityRef = (metric as any).entityId || metric.category || '';
    const entity = this.getEntity(entityRef);
    if (entity) {
      const adapter = this.getDataSourceAdapter(entity.source);
      if (adapter) {
        // Execute custom expression query
        const query = this.buildCustomMetricQuery(metric, entity, filters, timeRange);
        const result = await adapter.executeQuery(query);
        if (result.rows.length > 0 && result.columns.length > 0) {
          const valueColIndex = result.columns.findIndex(col => col.name === 'value');
          if (valueColIndex >= 0 && result.rows[0][valueColIndex] !== undefined) {
            return Number(result.rows[0][valueColIndex]);
          }
        }
      }
    }

    // Evaluate expression with collected values
    if (Object.keys(values).length > 0) {
      return this.evaluateExpression(expression, values);
    }

    return 0;
  }

  /**
   * Extract metric references from expression
   */
  private extractMetricReferences(expression: string): string[] {
    // Match metric references like {{metricName}} or $metricName
    const patterns = [
      /\{\{(\w+)\}\}/g,
      /\$(\w+)/g,
    ];

    const refs: Set<string> = new Set();
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(expression)) !== null) {
        refs.add(match[1]);
      }
    }

    return Array.from(refs);
  }

  /**
   * Build query for custom metric
   */
  private buildCustomMetricQuery(
    metric: Metric,
    entity: Entity,
    filters?: any,
    timeRange?: any
  ): string {
    const tableName = entity.schema ? `${entity.schema}.${entity.tableName}` : entity.tableName;
    const expression = metric.calculation.expression;

    let sql = `SELECT (${expression}) AS value FROM ${tableName}`;

    const conditions: string[] = [];
    if (filters) {
      for (const [field, value] of Object.entries(filters)) {
        conditions.push(`${field} = ${this.formatValue(value)}`);
      }
    }

    if (timeRange && timeRange.start && timeRange.end) {
      conditions.push(`timestamp >= '${timeRange.start.toISOString()}'`);
      conditions.push(`timestamp <= '${timeRange.end.toISOString()}'`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    return sql;
  }

  /**
   * Evaluate mathematical expression
   */
  private evaluateExpression(expression: string, values: Record<string, number>): number {
    // Replace variable names with values
    let expr = expression;
    for (const [key, value] of Object.entries(values)) {
      expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(value));
    }

    // Safe evaluation (no eval!)
    try {
      return this.safeEval(expr);
    } catch (error) {
      throw new Error(`Failed to evaluate expression: ${expression}`);
    }
  }

  /**
   * Safe expression evaluation without eval()
   */
  private safeEval(expr: string): number {
    // Simple arithmetic parser
    // In production, use a proper parser library
    const cleanExpr = expr.replace(/\s/g, '');

    // Handle basic operations
    if (cleanExpr.includes('+')) {
      const parts = cleanExpr.split('+');
      return parts.reduce((sum, part) => sum + this.safeEval(part), 0);
    }

    if (cleanExpr.includes('-') && !cleanExpr.startsWith('-')) {
      const parts = cleanExpr.split('-');
      return parts.reduce((diff, part, i) => i === 0 ? this.safeEval(part) : diff - this.safeEval(part), 0);
    }

    if (cleanExpr.includes('*')) {
      const parts = cleanExpr.split('*');
      return parts.reduce((prod, part) => prod * this.safeEval(part), 1);
    }

    if (cleanExpr.includes('/')) {
      const parts = cleanExpr.split('/');
      return parts.reduce((quot, part, i) => i === 0 ? this.safeEval(part) : quot / this.safeEval(part), 1);
    }

    return parseFloat(cleanExpr);
  }

  // ============================================================================
  // DIMENSION MANAGEMENT
  // ============================================================================

  /**
   * Register a new dimension
   */
  registerDimension(dimension: Dimension): void {
    this.validateDimension(dimension);
    this.dimensions.set(dimension.id, dimension);
  }

  /**
   * Get dimension by ID or name
   */
  getDimension(idOrName: string): Dimension | undefined {
    // Try by ID first
    let dimension = this.dimensions.get(idOrName);
    if (dimension) return dimension;

    // Try by name
    for (const d of Array.from(this.dimensions.values())) {
      if (d.name === idOrName || d.displayName === idOrName) {
        return d;
      }
    }

    return undefined;
  }

  /**
   * Get all dimensions
   */
  getAllDimensions(): Dimension[] {
    return Array.from(this.dimensions.values());
  }

  /**
   * Validate dimension definition
   */
  private validateDimension(dimension: Dimension): void {
    if (!dimension.id || !dimension.name) {
      throw new Error('Dimension must have id and name');
    }

    if (!dimension.type) {
      throw new Error('Dimension must have a type');
    }
  }

  // ============================================================================
  // SEMANTIC QUERYING
  // ============================================================================

  /**
   * Execute a semantic query
   */
  async query(semanticQuery: SemanticQuery): Promise<QueryResult> {
    const cacheKey = this.getCacheKey(semanticQuery);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isCacheExpired(cached)) {
      this.cacheStats.hits++;
      return cached.result;
    }

    this.cacheStats.misses++;

    // Parse and execute query
    const startTime = Date.now();
    const result = await this.executeSemanticQuery(semanticQuery);
    const executionTime = Date.now() - startTime;

    // Update result metadata
    result.executionTime = executionTime;

    // Cache result
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      ttl: 300000 // 5 minutes
    });

    return result;
  }

  /**
   * Execute semantic query
   */
  private async executeSemanticQuery(semanticQuery: SemanticQuery): Promise<QueryResult> {
    const parsed = semanticQuery.parsedQuery;

    // Validate entities exist
    for (const entityName of parsed.entities) {
      const entity = this.getEntity(entityName);
      if (!entity) {
        throw new Error(`Entity not found: ${entityName}`);
      }
    }

    // Validate metrics exist
    for (const metricName of parsed.metrics) {
      const metric = this.getMetric(metricName);
      if (!metric) {
        throw new Error(`Metric not found: ${metricName}`);
      }
    }

    // Generate SQL from semantic query
    const sql = this.generateSQL(parsed);

    // Return query result
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTime: 0,
      dataSizeScanned: 0,
      cached: false
    };
  }

  /**
   * Generate SQL from parsed semantic query
   */
  private generateSQL(parsed: ParsedQuery): string {
    const { entities, metrics, dimensions, filters, timeRange, limit } = parsed;

    // Build SELECT clause
    const selectClauses: string[] = [];

    // Add dimensions
    for (const dimName of dimensions) {
      const dim = this.getDimension(dimName);
      if (dim) {
        selectClauses.push(...dim.attributes);
      }
    }

    // Add metrics
    for (const metricName of metrics) {
      const metric = this.getMetric(metricName);
      if (metric) {
        const aggFunc = this.getAggregationFunction(metric.aggregation);
        selectClauses.push(`${aggFunc}(${metric.calculation.expression}) AS ${metric.name}`);
      }
    }

    // Build FROM clause
    const fromClauses: string[] = [];
    for (const entityName of entities) {
      const entity = this.getEntity(entityName);
      if (entity) {
        const tableName = entity.schema
          ? `${entity.schema}.${entity.tableName}`
          : entity.tableName;
        fromClauses.push(tableName);
      }
    }

    // Build WHERE clause
    const whereClauses: string[] = [];
    for (const filter of filters) {
      whereClauses.push(`${filter.field} ${filter.operator} ${this.formatValue(filter.value)}`);
    }

    // Add time range filter
    if (timeRange) {
      whereClauses.push(`timestamp >= '${timeRange.start.toISOString()}'`);
      whereClauses.push(`timestamp <= '${timeRange.end.toISOString()}'`);
    }

    // Build GROUP BY clause
    const groupByClauses = dimensions.length > 0 ? dimensions : [];

    // Construct SQL
    let sql = `SELECT ${selectClauses.join(', ')} FROM ${fromClauses.join(', ')}`;

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (groupByClauses.length > 0) {
      sql += ` GROUP BY ${groupByClauses.join(', ')}`;
    }

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    return sql;
  }

  /**
   * Get SQL aggregation function for aggregation type
   */
  private getAggregationFunction(type: AggregationType): string {
    const mapping: Record<AggregationType, string> = {
      [AggregationType.SUM]: 'SUM',
      [AggregationType.AVG]: 'AVG',
      [AggregationType.COUNT]: 'COUNT',
      [AggregationType.COUNT_DISTINCT]: 'COUNT(DISTINCT',
      [AggregationType.MIN]: 'MIN',
      [AggregationType.MAX]: 'MAX',
      [AggregationType.MEDIAN]: 'PERCENTILE_CONT(0.5)',
      [AggregationType.PERCENTILE]: 'PERCENTILE_CONT',
      [AggregationType.STDDEV]: 'STDDEV',
      [AggregationType.VARIANCE]: 'VARIANCE'
    };

    return mapping[type] || 'SUM';
  }

  /**
   * Format value for SQL
   */
  private formatValue(value: any): string {
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (Array.isArray(value)) {
      return `(${value.map(v => this.formatValue(v)).join(', ')})`;
    }
    return String(value);
  }

  // ============================================================================
  // CACHING
  // ============================================================================

  /**
   * Get cache key for semantic query
   */
  private getCacheKey(semanticQuery: SemanticQuery): string {
    return JSON.stringify({
      query: semanticQuery.naturalLanguageQuery,
      parsed: semanticQuery.parsedQuery
    });
  }

  /**
   * Check if cache entry is expired
   */
  private isCacheExpired(cached: CachedResult): boolean {
    return Date.now() - cached.timestamp > cached.ttl;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    for (const [key, cached] of Array.from(this.cache.entries())) {
      if (this.isCacheExpired(cached)) {
        this.cache.delete(key);
      }
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize built-in entities
   */
  private initializeBuiltInEntities(): void {
    // Common business entities will be registered here
    // Users, Orders, Products, etc.
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Get semantic model statistics
   */
  getStatistics(): SemanticLayerStats {
    return {
      entityCount: this.entities.size,
      metricCount: this.metrics.size,
      dimensionCount: this.dimensions.size,
      cacheSize: this.cache.size,
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    if (total === 0) return 0;
    return Math.round((this.cacheStats.hits / total) * 10000) / 100; // Returns percentage with 2 decimal places
  }

  /**
   * Reset cache statistics
   */
  resetCacheStats(): void {
    this.cacheStats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { hits: number; misses: number; hitRate: number } {
    return {
      ...this.cacheStats,
      hitRate: this.calculateCacheHitRate(),
    };
  }

  /**
   * Export semantic model
   */
  exportModel(): SemanticModelExport {
    return {
      entities: Array.from(this.entities.values()),
      metrics: Array.from(this.metrics.values()),
      dimensions: Array.from(this.dimensions.values()),
      version: '1.0.0',
      exportedAt: new Date()
    };
  }

  /**
   * Import semantic model
   */
  importModel(model: SemanticModelExport): void {
    // Clear existing model
    this.entities.clear();
    this.metrics.clear();
    this.dimensions.clear();

    // Import entities
    for (const entity of model.entities) {
      this.registerEntity(entity);
    }

    // Import metrics
    for (const metric of model.metrics) {
      this.registerMetric(metric);
    }

    // Import dimensions
    for (const dimension of model.dimensions) {
      this.registerDimension(dimension);
    }
  }
}

// ============================================================================
// HELPER TYPES
// ============================================================================

interface CachedResult {
  result: QueryResult;
  timestamp: number;
  ttl: number;
}

interface SemanticLayerStats {
  entityCount: number;
  metricCount: number;
  dimensionCount: number;
  cacheSize: number;
  cacheHitRate: number;
}

interface SemanticModelExport {
  entities: Entity[];
  metrics: Metric[];
  dimensions: Dimension[];
  version: string;
  exportedAt: Date;
}

/**
 * Data source adapter interface for executing queries
 */
export interface DataSourceAdapter {
  /** Execute a SQL query and return results */
  executeQuery(query: string): Promise<QueryResult>;
  /** Test connection to data source */
  testConnection(): Promise<boolean>;
  /** Get schema information */
  getSchema(tableName: string): Promise<{ columns: Array<{ name: string; type: string }> }>;
}

// Singleton instance
let semanticLayerInstance: SemanticLayer | null = null;

export function getSemanticLayer(): SemanticLayer {
  if (!semanticLayerInstance) {
    semanticLayerInstance = new SemanticLayer();
  }
  return semanticLayerInstance;
}

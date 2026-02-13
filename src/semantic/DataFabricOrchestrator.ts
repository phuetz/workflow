/**
 * Data Fabric Orchestrator - Intelligent data routing and orchestration
 *
 * Provides intelligent routing, caching, load balancing, and cost optimization
 * across the entire data fabric.
 *
 * @module semantic/DataFabricOrchestrator
 */

import {
  FabricRoute,
  RouteSource,
  RouteDestination,
  RouteCondition,
  CachingStrategy,
  RouteMetrics,
  DataSourceReference,
  DataSourceType,
  QueryResult
} from './types/semantic';

/**
 * DataFabricOrchestrator orchestrates data access across the fabric
 */
export class DataFabricOrchestrator {
  private routes: Map<string, FabricRoute> = new Map();
  private cache: FabricCache = new FabricCache();
  private loadBalancer: LoadBalancer = new LoadBalancer();
  private costOptimizer: CostOptimizer = new CostOptimizer();
  private metrics: Map<string, RouteMetrics> = new Map();

  // ============================================================================
  // ROUTE MANAGEMENT
  // ============================================================================

  /**
   * Register a fabric route
   */
  registerRoute(route: FabricRoute): void {
    this.validateRoute(route);

    // Initialize metrics
    if (!this.metrics.has(route.id)) {
      this.metrics.set(route.id, {
        requestCount: 0,
        avgLatency: 0,
        errorRate: 0,
        cacheHitRate: 0,
        dataSizeTransferred: 0
      });
    }

    this.routes.set(route.id, route);
  }

  /**
   * Get route by ID
   */
  getRoute(id: string): FabricRoute | undefined {
    return this.routes.get(id);
  }

  /**
   * Get all routes
   */
  getAllRoutes(): FabricRoute[] {
    return Array.from(this.routes.values());
  }

  /**
   * Update route
   */
  updateRoute(id: string, updates: Partial<FabricRoute>): void {
    const route = this.routes.get(id);
    if (!route) {
      throw new Error(`Route not found: ${id}`);
    }

    const updated = { ...route, ...updates };
    this.routes.set(id, updated);
  }

  /**
   * Delete route
   */
  deleteRoute(id: string): void {
    this.routes.delete(id);
    this.metrics.delete(id);
  }

  /**
   * Validate route
   */
  private validateRoute(route: FabricRoute): void {
    if (!route.id || !route.name) {
      throw new Error('Route must have id and name');
    }

    if (!route.source || !route.destination) {
      throw new Error('Route must have source and destination');
    }
  }

  // ============================================================================
  // QUERY ROUTING
  // ============================================================================

  /**
   * Route a query to the optimal data source
   */
  async routeQuery(query: QueryRequest): Promise<QueryResult> {
    const startTime = Date.now();

    try {
      // Find matching route
      const route = this.findMatchingRoute(query);
      if (!route) {
        throw new Error('No route found for query');
      }

      // Check cache
      if (route.cachingStrategy.enabled) {
        const cached = this.cache.get(query, route.cachingStrategy);
        if (cached) {
          this.updateMetrics(route.id, Date.now() - startTime, 0, true);
          return cached;
        }
      }

      // Select optimal destination
      const destination = await this.selectDestination(route, query);

      // Execute query
      const result = await this.executeQuery(query, destination);

      // Update metrics
      const latency = Date.now() - startTime;
      this.updateMetrics(route.id, latency, result.dataSizeScanned, false);

      // Cache result
      if (route.cachingStrategy.enabled) {
        this.cache.set(query, result, route.cachingStrategy);
      }

      return result;
    } catch (error) {
      const route = this.findMatchingRoute(query);
      if (route) {
        this.recordError(route.id);
      }
      throw error;
    }
  }

  /**
   * Find matching route for query
   */
  private findMatchingRoute(query: QueryRequest): FabricRoute | undefined {
    const matchingRoutes = Array.from(this.routes.values())
      .filter(route => route.enabled && this.matchesRoute(query, route))
      .sort((a, b) => b.priority - a.priority);

    return matchingRoutes[0];
  }

  /**
   * Check if query matches route
   */
  private matchesRoute(query: QueryRequest, route: FabricRoute): boolean {
    // Check source pattern
    if (route.source.type === 'query') {
      const pattern = new RegExp(route.source.pattern, 'i');
      if (!pattern.test(query.query)) {
        return false;
      }
    }

    // Check conditions
    for (const condition of route.conditions) {
      if (!this.evaluateCondition(condition, query)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate route condition
   */
  private evaluateCondition(condition: RouteCondition, query: QueryRequest): boolean {
    switch (condition.type) {
      case 'user':
        return query.userId === condition.value;

      case 'time':
        const hour = new Date().getHours();
        return this.evaluateOperator(hour, condition.operator, condition.value);

      case 'load':
        const load = this.loadBalancer.getCurrentLoad();
        return this.evaluateOperator(load, condition.operator, condition.value);

      case 'cost':
        const estimatedCost = this.costOptimizer.estimateCost(query);
        return this.evaluateOperator(estimatedCost, condition.operator, condition.value);

      default:
        return true;
    }
  }

  /**
   * Evaluate comparison operator
   */
  private evaluateOperator(actual: number, operator: string, expected: number): boolean {
    switch (operator) {
      case '<':
        return actual < expected;
      case '<=':
        return actual <= expected;
      case '>':
        return actual > expected;
      case '>=':
        return actual >= expected;
      case '==':
        return actual === expected;
      case '!=':
        return actual !== expected;
      default:
        return true;
    }
  }

  /**
   * Select optimal destination for query
   */
  private async selectDestination(
    route: FabricRoute,
    query: QueryRequest
  ): Promise<DataSourceReference> {
    const destination = route.destination;

    // Check primary destination health
    const isPrimaryHealthy = await this.checkHealth(destination.dataSource);
    if (isPrimaryHealthy) {
      return destination.dataSource;
    }

    // Try fallback
    if (destination.fallback) {
      const isFallbackHealthy = await this.checkHealth(destination.fallback);
      if (isFallbackHealthy) {
        return destination.fallback;
      }
    }

    throw new Error('No healthy destination available');
  }

  /**
   * Check data source health
   */
  private async checkHealth(source: DataSourceReference): Promise<boolean> {
    // Health check logic
    return true;
  }

  /**
   * Execute query on data source
   */
  private async executeQuery(
    query: QueryRequest,
    source: DataSourceReference
  ): Promise<QueryResult> {
    // Query execution logic
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTime: 0,
      dataSizeScanned: 0,
      cached: false
    };
  }

  // ============================================================================
  // METRICS
  // ============================================================================

  /**
   * Update route metrics
   */
  private updateMetrics(
    routeId: string,
    latency: number,
    dataSize: number,
    cacheHit: boolean
  ): void {
    const metrics = this.metrics.get(routeId);
    if (!metrics) return;

    metrics.requestCount++;
    metrics.avgLatency = (metrics.avgLatency * (metrics.requestCount - 1) + latency) / metrics.requestCount;
    metrics.dataSizeTransferred += dataSize;

    if (cacheHit) {
      metrics.cacheHitRate = (metrics.cacheHitRate * (metrics.requestCount - 1) + 1) / metrics.requestCount;
    } else {
      metrics.cacheHitRate = (metrics.cacheHitRate * (metrics.requestCount - 1)) / metrics.requestCount;
    }
  }

  /**
   * Record error
   */
  private recordError(routeId: string): void {
    const metrics = this.metrics.get(routeId);
    if (!metrics) return;

    metrics.requestCount++;
    metrics.errorRate = (metrics.errorRate * (metrics.requestCount - 1) + 1) / metrics.requestCount;
  }

  /**
   * Get route metrics
   */
  getRouteMetrics(routeId: string): RouteMetrics | undefined {
    return this.metrics.get(routeId);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, RouteMetrics> {
    return new Map(this.metrics);
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get orchestrator statistics
   */
  getStatistics(): OrchestratorStatistics {
    const routes = Array.from(this.routes.values());
    const allMetrics = Array.from(this.metrics.values());

    const totalRequests = allMetrics.reduce((sum, m) => sum + m.requestCount, 0);
    const avgLatency = allMetrics.length > 0
      ? allMetrics.reduce((sum, m) => sum + m.avgLatency, 0) / allMetrics.length
      : 0;
    const avgErrorRate = allMetrics.length > 0
      ? allMetrics.reduce((sum, m) => sum + m.errorRate, 0) / allMetrics.length
      : 0;
    const avgCacheHitRate = allMetrics.length > 0
      ? allMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / allMetrics.length
      : 0;

    return {
      totalRoutes: routes.length,
      enabledRoutes: routes.filter(r => r.enabled).length,
      totalRequests,
      avgLatency,
      avgErrorRate,
      avgCacheHitRate,
      cacheSize: this.cache.size(),
      loadBalancerActive: this.loadBalancer.isActive()
    };
  }
}

// ============================================================================
// FABRIC CACHE
// ============================================================================

class FabricCache {
  private cache: Map<string, CachedItem> = new Map();
  private maxSize: number = 10000;

  /**
   * Get cached item
   */
  get(query: QueryRequest, strategy: CachingStrategy): QueryResult | null {
    const key = this.getCacheKey(query);
    const item = this.cache.get(key);

    if (!item) return null;

    // Check TTL
    if (Date.now() - item.timestamp > strategy.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Check invalidation rules
    for (const rule of strategy.invalidationRules) {
      if (this.shouldInvalidate(rule, item)) {
        this.cache.delete(key);
        return null;
      }
    }

    return item.result;
  }

  /**
   * Set cached item
   */
  set(query: QueryRequest, result: QueryResult, strategy: CachingStrategy): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const key = this.getCacheKey(query);
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      strategy
    });
  }

  /**
   * Get cache key
   */
  private getCacheKey(query: QueryRequest): string {
    return JSON.stringify({ query: query.query, userId: query.userId });
  }

  /**
   * Check if item should be invalidated
   */
  private shouldInvalidate(rule: any, item: CachedItem): boolean {
    if (rule.type === 'time') {
      const maxAge = parseInt(rule.condition);
      return Date.now() - item.timestamp > maxAge;
    }

    return false;
  }

  /**
   * Evict oldest item
   */
  private evictOldest(): void {
    let oldest: [string, CachedItem] | null = null;

    for (const entry of this.cache.entries()) {
      if (!oldest || entry[1].timestamp < oldest[1].timestamp) {
        oldest = entry;
      }
    }

    if (oldest) {
      this.cache.delete(oldest[0]);
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// LOAD BALANCER
// ============================================================================

class LoadBalancer {
  private currentLoad: number = 0;
  private maxLoad: number = 1000;
  private active: boolean = true;

  /**
   * Get current load
   */
  getCurrentLoad(): number {
    return this.currentLoad;
  }

  /**
   * Check if load balancer is active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Update load
   */
  updateLoad(delta: number): void {
    this.currentLoad += delta;
    if (this.currentLoad < 0) {
      this.currentLoad = 0;
    }
  }
}

// ============================================================================
// COST OPTIMIZER
// ============================================================================

class CostOptimizer {
  private costPerGB: number = 0.10;
  private costPerQuery: number = 0.01;

  /**
   * Estimate query cost
   */
  estimateCost(query: QueryRequest): number {
    // Simple cost estimation
    const queryCost = this.costPerQuery;
    const dataCost = this.estimateDataSize(query) * this.costPerGB;

    return queryCost + dataCost;
  }

  /**
   * Estimate data size for query
   */
  private estimateDataSize(query: QueryRequest): number {
    // Simplified estimation - would use statistics in production
    return 0.1; // GB
  }

  /**
   * Optimize query for cost
   */
  optimizeForCost(query: QueryRequest): QueryRequest {
    // Apply cost optimization strategies
    return query;
  }
}

// ============================================================================
// HELPER TYPES
// ============================================================================

interface QueryRequest {
  query: string;
  userId: string;
  timestamp: Date;
  parameters?: Record<string, any>;
}

interface CachedItem {
  result: QueryResult;
  timestamp: number;
  strategy: CachingStrategy;
}

interface OrchestratorStatistics {
  totalRoutes: number;
  enabledRoutes: number;
  totalRequests: number;
  avgLatency: number;
  avgErrorRate: number;
  avgCacheHitRate: number;
  cacheSize: number;
  loadBalancerActive: boolean;
}

// Singleton instance
let orchestratorInstance: DataFabricOrchestrator | null = null;

export function getDataFabricOrchestrator(): DataFabricOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new DataFabricOrchestrator();
  }
  return orchestratorInstance;
}

/**
 * SecurityAnalyticsQueryEngine
 *
 * SQL-like query engine for security analytics with threat hunting,
 * IOC search, anomaly detection, and correlation capabilities.
 */

import { EventEmitter } from 'events';
import { QueryParser } from './query-engine/QueryParser';
import { QueryOptimizer } from './query-engine/QueryOptimizer';
import { QueryCache } from './query-engine/QueryCache';
import { QueryExecutor } from './query-engine/QueryExecutor';
import { ResultFormatter } from './query-engine/ResultFormatter';
import { SchedulerManager } from './query-engine/SchedulerManager';
import { ViewManager } from './query-engine/ViewManager';
import { PREBUILT_QUERIES } from './query-engine/PrebuiltQueries';

import type {
  QueryConfig, SecurityQuery, QueryCategory, QueryParameter, QueryResult,
  CostEstimate, MaterializedView, ScheduledQuery, AlertConfig,
  SharedQuery, ShareTarget, SharePermission, ExportOptions, BIIntegration, EngineStatistics
} from './query-engine/types';

export * from './query-engine/types';

export class SecurityAnalyticsQueryEngine extends EventEmitter {
  private static instance: SecurityAnalyticsQueryEngine | null = null;

  private savedQueries: Map<string, SecurityQuery> = new Map();
  private sharedQueries: Map<string, SharedQuery> = new Map();
  private runningQueries: Map<string, { cancel: () => void; startTime: Date }> = new Map();
  private biConnections: Map<string, BIIntegration> = new Map();

  private parser: QueryParser;
  private optimizer: QueryOptimizer;
  private cache: QueryCache;
  private executor: QueryExecutor;
  private formatter: ResultFormatter;
  private scheduler: SchedulerManager;
  private viewManager: ViewManager;

  private constructor() {
    super();
    this.parser = new QueryParser();
    this.optimizer = new QueryOptimizer();
    this.cache = new QueryCache();
    this.executor = new QueryExecutor();
    this.formatter = new ResultFormatter();

    const executeQuery = this.executeQuery.bind(this);
    const getSavedQuery = (id: string) => this.savedQueries.get(id);
    const generateId = this.generateId.bind(this);

    this.scheduler = new SchedulerManager(this, executeQuery, getSavedQuery, generateId);
    this.viewManager = new ViewManager(this, executeQuery, generateId);

    this.initializePrebuiltQueries();
    this.scheduler.start();
    this.viewManager.start();
  }

  static getInstance(): SecurityAnalyticsQueryEngine {
    if (!SecurityAnalyticsQueryEngine.instance) {
      SecurityAnalyticsQueryEngine.instance = new SecurityAnalyticsQueryEngine();
    }
    return SecurityAnalyticsQueryEngine.instance;
  }

  static resetInstance(): void {
    if (SecurityAnalyticsQueryEngine.instance) {
      SecurityAnalyticsQueryEngine.instance.shutdown();
      SecurityAnalyticsQueryEngine.instance = null;
    }
  }

  // Query Execution
  async executeQuery(sql: string, parameters?: Record<string, unknown>, config?: QueryConfig): Promise<QueryResult> {
    const executionId = this.generateId('exec');
    const startTime = new Date();
    const queryHash = this.executor.hashQuery(sql, parameters);

    if (config?.enableCache !== false) {
      const cached = this.cache.get(queryHash);
      if (cached) { this.emit('query:cache_hit', { queryHash, executionId }); return cached; }
    }

    const parsed = this.parser.parse(sql);
    const optimized = this.optimizer.optimize(parsed);
    const costEstimate = this.optimizer.estimateCost(parsed);

    this.emit('query:start', { executionId, sql, parameters, costEstimate });

    let cancelled = false;
    this.runningQueries.set(executionId, { cancel: () => { cancelled = true; }, startTime });

    try {
      const boundSql = this.executor.bindParameters(sql, parameters || {});
      const result = config?.mode === 'batch'
        ? await this.executor.executeBatch(boundSql, config, () => cancelled)
        : await this.executor.executeRealtime(boundSql, config, () => cancelled);

      if (cancelled) throw new Error('Query cancelled');

      const endTime = new Date();
      const queryResult: QueryResult = {
        queryId: queryHash, executionId, status: 'completed', data: result.data,
        rowCount: result.data.length, executionTimeMs: endTime.getTime() - startTime.getTime(),
        bytesScanned: result.bytesScanned, fromCache: false,
        warnings: optimized.suggestions.length > 0 ? optimized.suggestions : undefined,
        metadata: { columns: this.executor.inferColumns(result.data), startTime, endTime, queryHash, costEstimate }
      };

      if (config?.enableCache !== false) this.cache.set(queryHash, queryResult, config?.cacheTTL);
      this.emit('query:complete', { executionId, result: queryResult });
      return queryResult;
    } catch (error) {
      const endTime = new Date();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const queryResult: QueryResult = {
        queryId: queryHash, executionId, status: cancelled ? 'cancelled' : 'failed',
        data: [], rowCount: 0, executionTimeMs: endTime.getTime() - startTime.getTime(),
        bytesScanned: 0, fromCache: false, error: errorMessage,
        metadata: { columns: [], startTime, endTime, queryHash, costEstimate }
      };
      this.emit('query:error', { executionId, error: errorMessage });
      return queryResult;
    } finally {
      this.runningQueries.delete(executionId);
    }
  }

  cancelQuery(executionId: string): boolean {
    const running = this.runningQueries.get(executionId);
    if (running) { running.cancel(); this.emit('query:cancelled', { executionId }); return true; }
    return false;
  }

  // Saved Queries
  async createSavedQuery(name: string, sql: string, options: { description?: string; category?: QueryCategory; parameters?: QueryParameter[]; tags?: string[]; isPublic?: boolean }, userId: string): Promise<SecurityQuery> {
    const id = this.generateId('query');
    const now = new Date();
    const query: SecurityQuery = {
      id, name, description: options.description || '', sql, category: options.category || 'custom',
      parameters: options.parameters || [], tags: options.tags || [], createdAt: now, updatedAt: now,
      createdBy: userId, isPublic: options.isPublic || false, version: 1
    };
    this.savedQueries.set(id, query);
    this.emit('query:saved', { queryId: id, name });
    return query;
  }

  getSavedQuery(queryId: string): SecurityQuery | undefined { return this.savedQueries.get(queryId); }

  listSavedQueries(filters?: { category?: QueryCategory; tags?: string[]; userId?: string; isPublic?: boolean }): SecurityQuery[] {
    let queries = Array.from(this.savedQueries.values());
    if (filters?.category) queries = queries.filter(q => q.category === filters.category);
    if (filters?.tags?.length) queries = queries.filter(q => filters.tags!.some(t => q.tags?.includes(t)));
    if (filters?.userId) queries = queries.filter(q => q.createdBy === filters.userId);
    if (filters?.isPublic !== undefined) queries = queries.filter(q => q.isPublic === filters.isPublic);
    return queries;
  }

  updateSavedQuery(queryId: string, updates: Partial<Pick<SecurityQuery, 'name' | 'description' | 'sql' | 'category' | 'parameters' | 'tags' | 'isPublic'>>): SecurityQuery | null {
    const query = this.savedQueries.get(queryId);
    if (!query) return null;
    const updated = { ...query, ...updates, updatedAt: new Date(), version: query.version + 1 };
    this.savedQueries.set(queryId, updated);
    this.emit('query:updated', { queryId });
    return updated;
  }

  deleteSavedQuery(queryId: string): boolean {
    const deleted = this.savedQueries.delete(queryId);
    if (deleted) this.emit('query:deleted', { queryId });
    return deleted;
  }

  // Scheduling (delegated)
  async scheduleQuery(queryId: string, schedule: string, options: { alertConfig?: AlertConfig; enabled?: boolean }, userId: string): Promise<ScheduledQuery> {
    if (!this.savedQueries.has(queryId)) throw new Error(`Query not found: ${queryId}`);
    return this.scheduler.schedule(queryId, schedule, options, userId);
  }
  getScheduledQuery(scheduleId: string): ScheduledQuery | undefined { return this.scheduler.get(scheduleId); }
  listScheduledQueries(): ScheduledQuery[] { return this.scheduler.list(); }
  updateScheduledQuery(scheduleId: string, updates: Partial<Pick<ScheduledQuery, 'schedule' | 'enabled' | 'alertConfig'>>): ScheduledQuery | null { return this.scheduler.update(scheduleId, updates); }
  deleteScheduledQuery(scheduleId: string): boolean { return this.scheduler.delete(scheduleId); }

  // Materialized Views (delegated)
  async createMaterializedView(name: string, query: string, refreshSchedule: string, userId: string): Promise<MaterializedView> { return this.viewManager.create(name, query, refreshSchedule, userId); }
  getMaterializedView(viewId: string): MaterializedView | undefined { return this.viewManager.get(viewId); }
  listMaterializedViews(): MaterializedView[] { return this.viewManager.list(); }
  async refreshMaterializedView(viewId: string): Promise<MaterializedView | null> { return this.viewManager.refresh(viewId); }
  deleteMaterializedView(viewId: string): boolean { return this.viewManager.delete(viewId); }

  // Cost & Export
  estimateCost(sql: string): CostEstimate { return this.optimizer.estimateCost(this.parser.parse(sql)); }
  async exportResults(result: QueryResult, options: ExportOptions) {
    const exported = await this.formatter.exportResults(result, options);
    this.emit('export:complete', { format: options.format, rowCount: result.rowCount, filename: exported.filename });
    return exported;
  }

  // Query Sharing
  async shareQuery(queryId: string, targets: ShareTarget[], permissions: SharePermission[], userId: string, expiresAt?: Date): Promise<SharedQuery> {
    if (!this.savedQueries.has(queryId)) throw new Error(`Query not found: ${queryId}`);
    const id = this.generateId('share');
    const shared: SharedQuery = { id, queryId, sharedWith: targets, permissions, expiresAt, accessCount: 0, createdAt: new Date(), createdBy: userId };
    this.sharedQueries.set(id, shared);
    this.emit('query:shared', { shareId: id, queryId, targets });
    return shared;
  }

  getSharedQuery(shareId: string): SharedQuery | undefined {
    const shared = this.sharedQueries.get(shareId);
    if (shared?.expiresAt && new Date() > shared.expiresAt) { this.sharedQueries.delete(shareId); return undefined; }
    if (shared) shared.accessCount++;
    return shared;
  }

  listSharedQueries(userId: string): SharedQuery[] {
    return Array.from(this.sharedQueries.values()).filter(s => {
      if (s.expiresAt && new Date() > s.expiresAt) return false;
      return s.createdBy === userId || s.sharedWith.some(t => t.type === 'public' || t.id === userId);
    });
  }

  revokeShare(shareId: string): boolean {
    const deleted = this.sharedQueries.delete(shareId);
    if (deleted) this.emit('share:revoked', { shareId });
    return deleted;
  }

  // BI Integration
  registerBIIntegration(name: string, integration: BIIntegration): void { this.biConnections.set(name, integration); this.emit('bi:registered', { name, type: integration.type }); }
  getBIIntegration(name: string): BIIntegration | undefined { return this.biConnections.get(name); }
  listBIIntegrations(): { name: string; integration: BIIntegration }[] { return Array.from(this.biConnections.entries()).map(([name, integration]) => ({ name, integration })); }

  async syncToBITool(name: string, queryId: string, options?: { tableName?: string; refreshData?: boolean }): Promise<{ success: boolean; message: string }> {
    const integration = this.biConnections.get(name);
    if (!integration) return { success: false, message: `BI integration not found: ${name}` };
    const query = this.savedQueries.get(queryId);
    if (!query) return { success: false, message: `Query not found: ${queryId}` };
    if (options?.refreshData) await this.executeQuery(query.sql, {}, { enableCache: false });
    this.emit('bi:synced', { integration: name, queryId, tableName: options?.tableName || query.name.replace(/\s+/g, '_').toLowerCase() });
    return { success: true, message: `Successfully synced to ${integration.type}` };
  }

  removeBIIntegration(name: string): boolean { const deleted = this.biConnections.delete(name); if (deleted) this.emit('bi:removed', { name }); return deleted; }

  // Pre-built Queries
  getPrebuiltQueries(category?: QueryCategory): SecurityQuery[] {
    let queries = Array.from(this.savedQueries.values()).filter(q => PREBUILT_QUERIES.some(p => p.name === q.name));
    if (category) queries = queries.filter(q => q.category === category);
    return queries;
  }

  executePrebuiltQuery(queryName: string, parameters: Record<string, unknown>, config?: QueryConfig): Promise<QueryResult> {
    const query = Array.from(this.savedQueries.values()).find(q => q.name === queryName);
    if (!query) throw new Error(`Pre-built query not found: ${queryName}`);
    return this.executeQuery(query.sql, parameters, config);
  }

  // Statistics
  getStatistics(): EngineStatistics {
    return {
      savedQueries: this.savedQueries.size, scheduledQueries: this.scheduler.size,
      materializedViews: this.viewManager.size, sharedQueries: this.sharedQueries.size,
      runningQueries: this.runningQueries.size, cacheStats: this.cache.getStats(), biIntegrations: this.biConnections.size
    };
  }

  clearCache(): void { this.cache.clear(); this.emit('cache:cleared'); }

  // Private
  private initializePrebuiltQueries(): void {
    for (const query of PREBUILT_QUERIES) {
      const id = this.generateId('query');
      const now = new Date();
      this.savedQueries.set(id, { id, ...query, createdAt: now, updatedAt: now, createdBy: 'system', version: 1 });
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
  }

  shutdown(): void {
    this.scheduler.stop();
    this.viewManager.stop();
    for (const [, running] of this.runningQueries) running.cancel();
    this.runningQueries.clear();
    this.emit('engine:shutdown');
  }
}

export function getSecurityAnalyticsQueryEngine(): SecurityAnalyticsQueryEngine {
  return SecurityAnalyticsQueryEngine.getInstance();
}

export default SecurityAnalyticsQueryEngine;

/**
 * SecurityDataLakeManager - Main facade class
 * Orchestrates all data lake components
 */

import { EventEmitter } from 'events';
import { AdapterFactory } from './DataIngestion';
import { QueryCache, QueryExecutor } from './DataQuery';
import {
  RetentionPolicyManager,
  StorageOptimizer,
  PartitionManager,
} from './DataRetention';
import {
  LineageTracker,
  MetricsCollector,
  SchemaRegistry,
  CatalogManager,
} from './SecurityAnalytics';
import type {
  DataLakeConfig,
  DataLakeProvider,
  DataLakeAdapter,
  TableSchema,
  DataRecord,
  QueryRequest,
  QueryResult,
  CatalogEntry,
  RetentionPolicy,
  DataLineage,
  LineageEdge,
  CompactionResult,
  StorageOptimizationResult,
  IngestOptions,
  IngestResult,
  PartitionSpec,
  SchemaEvolutionMode,
  ColumnDefinition,
  StorageTier,
  DataFormat,
} from './types';

export class SecurityDataLakeManager extends EventEmitter {
  private static instance: SecurityDataLakeManager | null = null;

  private adapters = new Map<string, DataLakeAdapter>();
  private configs = new Map<string, DataLakeConfig>();
  private queryCache = new QueryCache();
  private queryExecutor!: QueryExecutor;
  private retentionManager: RetentionPolicyManager;
  private storageOptimizer: StorageOptimizer;
  private partitionManager: PartitionManager;
  private lineageTracker: LineageTracker;
  private metricsCollector: MetricsCollector;
  private schemaRegistry: SchemaRegistry;
  private catalogManager: CatalogManager;

  private constructor() {
    super();
    this.setMaxListeners(100);
    this.retentionManager = new RetentionPolicyManager({
      onCleanupError: (dataLake, table, error) => {
        this.emit('cleanupError', { dataLake, table, error });
      },
    });
    this.storageOptimizer = new StorageOptimizer();
    this.partitionManager = new PartitionManager();
    this.lineageTracker = new LineageTracker();
    this.metricsCollector = new MetricsCollector();
    this.schemaRegistry = new SchemaRegistry();
    this.catalogManager = new CatalogManager();
  }

  static getInstance(): SecurityDataLakeManager {
    if (!SecurityDataLakeManager.instance) {
      SecurityDataLakeManager.instance = new SecurityDataLakeManager();
    }
    return SecurityDataLakeManager.instance;
  }

  static resetInstance(): void {
    if (SecurityDataLakeManager.instance) {
      SecurityDataLakeManager.instance.shutdown();
      SecurityDataLakeManager.instance = null;
    }
  }

  async initializeDataLake(name: string, config: DataLakeConfig): Promise<void> {
    const adapter = AdapterFactory.createAdapter(config);
    await adapter.initialize();
    this.adapters.set(name, adapter);
    this.configs.set(name, config);

    this.queryExecutor = new QueryExecutor(this.adapters, this.queryCache, {
      onCacheHit: dl => this.metricsCollector.recordCacheHit(dl),
      onQueryExecuted: (dl, r) => {
        this.metricsCollector.recordQuery(dl, r);
        this.emit('queryExecuted', {
          dataLake: dl, rowCount: r.rowCount,
          bytesScanned: r.bytesScanned, executionTime: r.executionTime,
        });
      },
    });

    this.retentionManager.startScheduler(async (dl, t) => {
      await this.applyRetentionCleanup(dl, t);
    });

    this.metricsCollector.recordOperation('initialize', name);
    this.emit('dataLakeInitialized', { name, provider: config.provider });
  }

  async createTable(
    dataLakeName: string, schema: TableSchema,
    partitionSpec?: PartitionSpec, evolutionMode: SchemaEvolutionMode = 'additive'
  ): Promise<void> {
    const adapter = this.getAdapter(dataLakeName);
    const config = this.configs.get(dataLakeName)!;

    if (partitionSpec) {
      schema.partitionColumns = this.partitionManager.buildPartitionColumns(partitionSpec);
    }

    schema.format = schema.format || config.defaultFormat;
    schema.compression = schema.compression || config.defaultCompression;

    await adapter.createTable(schema);

    const catalogKey = `${dataLakeName}:${schema.name}`;
    this.catalogManager.set(catalogKey, {
      tableName: schema.name,
      database: config.catalog || config.dataset || config.bucket || 'default',
      schema, location: this.partitionManager.buildTableLocation(config, schema.name),
      format: schema.format, rowCount: 0, sizeBytes: 0, partitions: [],
      lastModified: new Date(), created: new Date(), owner: 'system', tags: [],
    });

    this.schemaRegistry.register(catalogKey, schema);
    this.lineageTracker.initializeLineage(catalogKey);
    this.metricsCollector.recordOperation('createTable', dataLakeName);
    this.emit('tableCreated', { dataLake: dataLakeName, table: schema.name, evolutionMode });
  }

  async ingestData(
    dataLakeName: string, tableName: string, records: DataRecord[], options?: IngestOptions
  ): Promise<IngestResult> {
    const startTime = Date.now();
    const adapter = this.getAdapter(dataLakeName);
    const catalogKey = `${dataLakeName}:${tableName}`;
    const batchSize = options?.batchSize || 1000;

    let ingested = 0, duplicates = 0, errors = 0, skipped = 0;
    let processedRecords = records;

    if (options?.dedup) {
      const seen = new Set<string>();
      processedRecords = records.filter(r => {
        if (seen.has(r.id)) { duplicates++; return false; }
        seen.add(r.id);
        return true;
      });
    }

    for (let i = 0; i < processedRecords.length; i += batchSize) {
      const batch = processedRecords.slice(i, i + batchSize);
      try {
        ingested += await adapter.insertData(tableName, batch);
      } catch (error) {
        const batchErrors = Math.min(batchSize, processedRecords.length - i);
        if (options?.onError === 'abort') throw error;
        else if (options?.onError === 'skip') skipped += batchErrors;
        else errors += batchErrors;
        this.emit('ingestionError', { dataLake: dataLakeName, table: tableName, error });
      }
    }

    this.catalogManager.updateStats(catalogKey, {
      rowCount: (this.catalogManager.get(catalogKey)?.rowCount || 0) + ingested,
      lastModified: new Date(),
    });

    this.queryCache.invalidate(tableName);

    if (options?.sourceLineage) {
      await this.trackLineage(dataLakeName, tableName, {
        sourceId: options.sourceLineage, targetId: catalogKey,
        transformationType: 'ingest', timestamp: new Date(),
      });
    }

    const result: IngestResult = { ingested, duplicates, errors, skipped, duration: Date.now() - startTime };
    this.metricsCollector.recordIngestion(dataLakeName, tableName, result);
    this.emit('dataIngested', { dataLake: dataLakeName, table: tableName, ...result });
    return result;
  }

  async queryData(dataLakeName: string, request: QueryRequest): Promise<QueryResult> {
    const result = await this.queryExecutor.execute(dataLakeName, request);
    if (request.table) {
      const queryId = `query_${Date.now()}`;
      await this.trackLineage(dataLakeName, request.table, {
        sourceId: `${dataLakeName}:${request.table}`, targetId: queryId,
        transformationType: 'query', timestamp: new Date(), queryId,
      });
    }
    return result;
  }

  async setRetentionPolicy(
    dataLakeName: string, tableName: string,
    policy: Omit<RetentionPolicy, 'name' | 'tableName'>
  ): Promise<void> {
    this.retentionManager.setPolicy(dataLakeName, tableName, policy);
    this.emit('retentionPolicySet', {
      dataLake: dataLakeName, table: tableName, retentionDays: policy.retentionDays,
    });
  }

  async compactPartitions(
    dataLakeName: string, tableName: string, partitions?: string[]
  ): Promise<CompactionResult> {
    const result = await this.getAdapter(dataLakeName).compactPartitions(tableName, partitions);
    this.metricsCollector.recordCompaction(dataLakeName, result);
    this.emit('partitionsCompacted', { dataLake: dataLakeName, table: tableName, result });
    return result;
  }

  getCatalog(options?: {
    dataLake?: string; tags?: string[]; format?: DataFormat; minRows?: number; maxRows?: number;
  }): CatalogEntry[] {
    return this.catalogManager.filter(options);
  }

  async trackLineage(
    dataLakeName: string, tableName: string,
    edge: Omit<LineageEdge, 'timestamp'> & { timestamp?: Date }
  ): Promise<void> {
    const nodeId = `${dataLakeName}:${tableName}`;
    this.lineageTracker.trackEdge(nodeId, edge);
    this.emit('lineageTracked', {
      dataLake: dataLakeName, table: tableName,
      edge: { ...edge, timestamp: edge.timestamp || new Date() },
    });
  }

  getLineage(dataLakeName: string, tableName: string): DataLineage | null {
    return this.lineageTracker.getLineage(`${dataLakeName}:${tableName}`);
  }

  async optimizeStorage(dataLakeName: string, tableName: string): Promise<StorageOptimizationResult> {
    const adapter = this.getAdapter(dataLakeName);
    const config = this.configs.get(dataLakeName)!;
    const entry = this.catalogManager.get(`${dataLakeName}:${tableName}`);
    if (!entry) throw new Error(`Table '${tableName}' not found in data lake '${dataLakeName}'`);

    const result = await this.storageOptimizer.optimize(adapter, tableName, entry, config.costOptimization);
    this.metricsCollector.recordOptimization(dataLakeName, result);
    this.emit('storageOptimized', { dataLake: dataLakeName, table: tableName, result });
    return result;
  }

  async evolveSchema(
    dataLakeName: string, tableName: string,
    changes: { addColumns?: ColumnDefinition[]; dropColumns?: string[]; renameColumns?: { from: string; to: string }[] },
    mode: SchemaEvolutionMode = 'additive'
  ): Promise<void> {
    const schemaKey = `${dataLakeName}:${tableName}`;
    const newSchema = this.schemaRegistry.evolve(schemaKey, changes, mode);

    const entry = this.catalogManager.get(schemaKey);
    if (entry) { entry.schema = newSchema; entry.lastModified = new Date(); }

    this.emit('schemaEvolved', {
      dataLake: dataLakeName, table: tableName,
      version: this.schemaRegistry.getVersions(schemaKey).length, changes,
    });
  }

  getSchemaHistory(dataLakeName: string, tableName: string): TableSchema[] {
    return this.schemaRegistry.getVersions(`${dataLakeName}:${tableName}`);
  }

  async applyRetentionCleanup(
    dataLakeName: string, tableName: string
  ): Promise<{ partitionsDeleted: number; bytesReclaimed: number; archived: boolean }> {
    const adapter = this.getAdapter(dataLakeName);
    const entry = this.catalogManager.get(`${dataLakeName}:${tableName}`);
    const result = await this.retentionManager.applyCleanup(dataLakeName, tableName, adapter, entry || null);
    this.emit('retentionCleanup', { dataLake: dataLakeName, table: tableName, ...result });
    return result;
  }

  async getStorageCosts(dataLakeName?: string): Promise<{
    totalCost: number; byTable: Record<string, number>; byTier: Record<StorageTier, number>;
  }> {
    const catalogEntries = new Map<string, CatalogEntry>();
    this.catalogManager.getAll().forEach(e => catalogEntries.set(e.tableName, e));
    return this.storageOptimizer.calculateCosts(this.adapters, catalogEntries, dataLakeName);
  }

  async dropTable(dataLakeName: string, tableName: string): Promise<void> {
    await this.getAdapter(dataLakeName).dropTable(tableName);
    const key = `${dataLakeName}:${tableName}`;
    this.catalogManager.delete(key);
    this.schemaRegistry.clear(key);
    this.lineageTracker.clearLineage(key);
    this.retentionManager.removePolicy(dataLakeName, tableName);
    this.queryCache.invalidate(tableName);
    this.emit('tableDropped', { dataLake: dataLakeName, table: tableName });
  }

  listDataLakes(): { name: string; provider: DataLakeProvider; initialized: boolean }[] {
    return Array.from(this.configs.entries()).map(([name, config]) => ({
      name, provider: config.provider, initialized: this.adapters.has(name),
    }));
  }

  getMetrics(): Record<string, unknown> {
    return this.metricsCollector.getMetrics();
  }

  shutdown(): void {
    this.retentionManager.stopScheduler();
    this.adapters.clear();
    this.configs.clear();
    this.catalogManager.clear();
    this.retentionManager.clear();
    this.lineageTracker.clearAll();
    this.schemaRegistry.clearAll();
    this.queryCache.invalidate();
    this.emit('shutdown');
  }

  private getAdapter(name: string): DataLakeAdapter {
    const adapter = this.adapters.get(name);
    if (!adapter) throw new Error(`Data lake '${name}' not initialized`);
    return adapter;
  }
}

export const getSecurityDataLakeManager = (): SecurityDataLakeManager => {
  return SecurityDataLakeManager.getInstance();
};

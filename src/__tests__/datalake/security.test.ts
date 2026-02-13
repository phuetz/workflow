/**
 * Tests for datalake/security modules
 * Tests DataIngestion, DataQuery, DataRetention, SecurityAnalytics, and SecurityDataLakeManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BaseDataLakeAdapter,
  AWSDataLakeAdapter,
  AzureDataLakeAdapter,
  GCPDataLakeAdapter,
  SnowflakeDataLakeAdapter,
  DatabricksDataLakeAdapter,
  AdapterFactory,
} from '../../datalake/security/DataIngestion';
import {
  QueryCache,
  QueryExecutor,
  QueryBuilder,
} from '../../datalake/security/DataQuery';
import {
  RetentionPolicyManager,
  StorageOptimizer,
  CostCalculator,
  PartitionManager,
} from '../../datalake/security/DataRetention';
import {
  LineageTracker,
  MetricsCollector,
  SchemaRegistry,
  CatalogManager,
} from '../../datalake/security/SecurityAnalytics';
import {
  SecurityDataLakeManager,
  getSecurityDataLakeManager,
} from '../../datalake/security/SecurityDataLakeManager';
import type {
  DataLakeConfig,
  TableSchema,
  DataRecord,
  QueryRequest,
  QueryResult,
  CatalogEntry,
  PartitionInfo,
} from '../../datalake/security/types';

// =============================================================================
// DataIngestion Tests
// =============================================================================

describe('DataIngestion', () => {
  describe('BaseDataLakeAdapter', () => {
    let adapter: BaseDataLakeAdapter;
    const mockConfig: DataLakeConfig = {
      provider: 'aws',
      region: 'us-east-1',
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      bucket: 'test-bucket',
      defaultFormat: 'parquet',
      defaultCompression: 'snappy',
      encryption: { type: 'aes-256' },
      costOptimization: {
        enableTiering: true,
        hotToWarmDays: 30,
        warmToColdDays: 90,
        coldToArchiveDays: 365,
        enableCompression: true,
        enableDeduplication: true,
      },
    };

    beforeEach(() => {
      adapter = new BaseDataLakeAdapter(mockConfig);
    });

    it('should throw error if not initialized', async () => {
      await expect(adapter.listTables()).rejects.toThrow('Adapter not initialized');
    });

    it('should initialize successfully', async () => {
      await adapter.initialize();
      const tables = await adapter.listTables();
      expect(tables).toEqual([]);
    });

    it('should create table after initialization', async () => {
      await adapter.initialize();
      const schema: TableSchema = {
        name: 'test_table',
        columns: [{ name: 'id', type: 'string', nullable: false }],
        partitionColumns: [],
        format: 'parquet',
        compression: 'snappy',
        properties: {},
      };
      await expect(adapter.createTable(schema)).resolves.not.toThrow();
    });

    it('should insert data and return count', async () => {
      await adapter.initialize();
      const records: DataRecord[] = [
        { id: '1', timestamp: new Date(), source: 'test', severity: 'info', category: 'test', data: {} },
        { id: '2', timestamp: new Date(), source: 'test', severity: 'low', category: 'test', data: {} },
      ];
      const count = await adapter.insertData('test_table', records);
      expect(count).toBe(2);
    });

    it('should execute query and return result', async () => {
      await adapter.initialize();
      const request: QueryRequest = {
        table: 'test_table',
        columns: ['id', 'name'],
        limit: 10,
      };
      const result = await adapter.query(request);
      expect(result).toHaveProperty('columns');
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('rowCount');
    });

    it('should get table info', async () => {
      await adapter.initialize();
      const info = await adapter.getTableInfo('test_table');
      expect(info).not.toBeNull();
      expect(info?.tableName).toBe('test_table');
    });

    it('should compact partitions', async () => {
      await adapter.initialize();
      const result = await adapter.compactPartitions('test_table');
      expect(result).toHaveProperty('tableName', 'test_table');
      expect(result).toHaveProperty('compressionRatio', 1.0);
    });

    it('should delete partitions', async () => {
      await adapter.initialize();
      const count = await adapter.deletePartitions('test_table', ['p1', 'p2']);
      expect(count).toBe(2);
    });

    it('should calculate storage cost', async () => {
      await adapter.initialize();
      const cost = await adapter.getStorageCost('test_table');
      expect(typeof cost).toBe('number');
    });
  });

  describe('AdapterFactory', () => {
    const baseConfig: DataLakeConfig = {
      provider: 'aws',
      region: 'us-east-1',
      credentials: {},
      defaultFormat: 'parquet',
      defaultCompression: 'snappy',
      encryption: { type: 'none' },
      costOptimization: {
        enableTiering: false,
        hotToWarmDays: 30,
        warmToColdDays: 90,
        coldToArchiveDays: 365,
        enableCompression: false,
        enableDeduplication: false,
      },
    };

    it('should create AWS adapter', () => {
      const adapter = AdapterFactory.createAdapter({ ...baseConfig, provider: 'aws' });
      expect(adapter).toBeInstanceOf(AWSDataLakeAdapter);
    });

    it('should create Azure adapter', () => {
      const adapter = AdapterFactory.createAdapter({ ...baseConfig, provider: 'azure' });
      expect(adapter).toBeInstanceOf(AzureDataLakeAdapter);
    });

    it('should create GCP adapter', () => {
      const adapter = AdapterFactory.createAdapter({ ...baseConfig, provider: 'gcp' });
      expect(adapter).toBeInstanceOf(GCPDataLakeAdapter);
    });

    it('should create Snowflake adapter', () => {
      const adapter = AdapterFactory.createAdapter({ ...baseConfig, provider: 'snowflake' });
      expect(adapter).toBeInstanceOf(SnowflakeDataLakeAdapter);
    });

    it('should create Databricks adapter', () => {
      const adapter = AdapterFactory.createAdapter({ ...baseConfig, provider: 'databricks' });
      expect(adapter).toBeInstanceOf(DatabricksDataLakeAdapter);
    });

    it('should throw for unsupported provider', () => {
      expect(() =>
        AdapterFactory.createAdapter({ ...baseConfig, provider: 'unknown' as any })
      ).toThrow('Unsupported data lake provider');
    });
  });
});

// =============================================================================
// DataQuery Tests
// =============================================================================

describe('DataQuery', () => {
  describe('QueryCache', () => {
    let cache: QueryCache;

    beforeEach(() => {
      cache = new QueryCache();
    });

    it('should return null for missing cache key', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should cache and retrieve results', () => {
      const result: QueryResult = {
        columns: ['id'],
        rows: [{ id: '1' }],
        rowCount: 1,
        executionTime: 100,
        bytesScanned: 1000,
      };
      cache.set('key1', result);
      const cached = cache.get('key1');
      expect(cached).toEqual(result);
    });

    it('should expire cache entries', () => {
      vi.useFakeTimers();
      const result: QueryResult = {
        columns: ['id'],
        rows: [],
        rowCount: 0,
        executionTime: 100,
        bytesScanned: 0,
      };
      cache.set('key1', result, 1000); // 1 second TTL
      vi.advanceTimersByTime(2000);
      const cached = cache.get('key1');
      expect(cached).toBeNull();
      vi.useRealTimers();
    });

    it('should invalidate cache by pattern', () => {
      const result: QueryResult = {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: 0,
        bytesScanned: 0,
      };
      cache.set('table1:query1', result);
      cache.set('table1:query2', result);
      cache.set('table2:query1', result);
      cache.invalidate('table1');
      expect(cache.get('table1:query1')).toBeNull();
      expect(cache.get('table1:query2')).toBeNull();
      expect(cache.get('table2:query1')).not.toBeNull();
    });

    it('should generate cache key from request', () => {
      const request: QueryRequest = {
        table: 'test',
        columns: ['id', 'name'],
        limit: 10,
      };
      const key = cache.generateKey(request);
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('should report cache stats', () => {
      const stats = cache.getStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
    });
  });

  describe('QueryBuilder', () => {
    it('should build simple query', () => {
      const builder = new QueryBuilder();
      const request = builder.from('users').select('id', 'name').build();
      expect(request.table).toBe('users');
      expect(request.columns).toEqual(['id', 'name']);
    });

    it('should build query with filters', () => {
      const builder = new QueryBuilder();
      const request = builder
        .from('users')
        .where('status', 'eq', 'active')
        .where('age', 'gte', 18)
        .build();
      expect(request.filters).toHaveLength(2);
    });

    it('should build query with order by', () => {
      const builder = new QueryBuilder();
      const request = builder
        .from('users')
        .orderBy('created_at', 'desc')
        .build();
      expect(request.orderBy).toHaveLength(1);
      expect(request.orderBy![0].direction).toBe('desc');
    });

    it('should build query with pagination', () => {
      const builder = new QueryBuilder();
      const request = builder.from('users').limit(10).offset(20).build();
      expect(request.limit).toBe(10);
      expect(request.offset).toBe(20);
    });

    it('should build query with group by and having', () => {
      const builder = new QueryBuilder();
      const request = builder
        .from('orders')
        .groupBy('customer_id')
        .having('COUNT(*) > 5')
        .build();
      expect(request.groupBy).toEqual(['customer_id']);
      expect(request.having).toBe('COUNT(*) > 5');
    });

    it('should build federated query', () => {
      const builder = new QueryBuilder();
      const request = builder
        .from('events')
        .federated('source1', 'source2')
        .build();
      expect(request.federatedSources).toEqual(['source1', 'source2']);
    });

    it('should disable caching', () => {
      const builder = new QueryBuilder();
      const request = builder.from('users').noCache().build();
      expect(request.cacheResults).toBe(false);
    });
  });
});

// =============================================================================
// DataRetention Tests
// =============================================================================

describe('DataRetention', () => {
  describe('RetentionPolicyManager', () => {
    let manager: RetentionPolicyManager;

    beforeEach(() => {
      manager = new RetentionPolicyManager();
    });

    afterEach(() => {
      manager.stopScheduler();
      manager.clear();
    });

    it('should set and get retention policy', () => {
      manager.setPolicy('lake1', 'table1', {
        retentionDays: 30,
        gracePeriodDays: 7,
        archiveBeforeDelete: true,
        enabled: true,
      });
      const policy = manager.getPolicy('lake1', 'table1');
      expect(policy).toBeDefined();
      expect(policy?.retentionDays).toBe(30);
    });

    it('should remove retention policy', () => {
      manager.setPolicy('lake1', 'table1', {
        retentionDays: 30,
        gracePeriodDays: 7,
        archiveBeforeDelete: false,
        enabled: true,
      });
      const removed = manager.removePolicy('lake1', 'table1');
      expect(removed).toBe(true);
      expect(manager.getPolicy('lake1', 'table1')).toBeUndefined();
    });

    it('should get all policies', () => {
      manager.setPolicy('lake1', 'table1', {
        retentionDays: 30,
        gracePeriodDays: 7,
        archiveBeforeDelete: false,
        enabled: true,
      });
      manager.setPolicy('lake1', 'table2', {
        retentionDays: 60,
        gracePeriodDays: 14,
        archiveBeforeDelete: true,
        enabled: true,
      });
      const policies = manager.getAllPolicies();
      expect(policies).toHaveLength(2);
    });

    it('should not cleanup when policy is disabled', async () => {
      manager.setPolicy('lake1', 'table1', {
        retentionDays: 30,
        gracePeriodDays: 7,
        archiveBeforeDelete: false,
        enabled: false,
      });
      const mockAdapter = {
        deletePartitions: vi.fn(),
        setStorageTier: vi.fn(),
      } as any;
      const result = await manager.applyCleanup('lake1', 'table1', mockAdapter, null);
      expect(result.partitionsDeleted).toBe(0);
    });
  });

  describe('CostCalculator', () => {
    let calculator: CostCalculator;

    beforeEach(() => {
      calculator = new CostCalculator();
    });

    it('should calculate partition cost', () => {
      const sizeBytes = 1024 ** 3; // 1 GB
      const cost = calculator.calculatePartitionCost(sizeBytes, 'hot');
      expect(cost).toBeCloseTo(0.023);
    });

    it('should calculate tiering savings', () => {
      const sizeBytes = 1024 ** 3; // 1 GB
      const savings = calculator.calculateTieringSavings(sizeBytes, 'hot', 'cold');
      expect(savings).toBeGreaterThan(0);
    });

    it('should return tier rates', () => {
      expect(calculator.getTierRate('hot')).toBe(0.023);
      expect(calculator.getTierRate('warm')).toBe(0.0125);
      expect(calculator.getTierRate('cold')).toBe(0.004);
      expect(calculator.getTierRate('archive')).toBe(0.00099);
    });
  });

  describe('PartitionManager', () => {
    let manager: PartitionManager;

    beforeEach(() => {
      manager = new PartitionManager();
    });

    it('should build time-based partition columns', () => {
      const cols = manager.buildPartitionColumns({
        strategy: 'time',
        timeGranularity: 'hour',
      });
      expect(cols).toContain('year');
      expect(cols).toContain('month');
      expect(cols).toContain('day');
      expect(cols).toContain('hour');
    });

    it('should build composite partition columns', () => {
      const cols = manager.buildPartitionColumns({
        strategy: 'composite',
        sourceField: 'source_app',
        severityField: 'level',
      });
      expect(cols).toContain('source_app');
      expect(cols).toContain('level');
    });

    it('should build table location for AWS', () => {
      const config: DataLakeConfig = {
        provider: 'aws',
        region: 'us-east-1',
        credentials: {},
        bucket: 'my-bucket',
        defaultFormat: 'parquet',
        defaultCompression: 'snappy',
        encryption: { type: 'none' },
        costOptimization: {
          enableTiering: false,
          hotToWarmDays: 30,
          warmToColdDays: 90,
          coldToArchiveDays: 365,
          enableCompression: false,
          enableDeduplication: false,
        },
      };
      const location = manager.buildTableLocation(config, 'events');
      expect(location).toBe('s3://my-bucket/events/');
    });
  });
});

// =============================================================================
// SecurityAnalytics Tests
// =============================================================================

describe('SecurityAnalytics', () => {
  describe('LineageTracker', () => {
    let tracker: LineageTracker;

    beforeEach(() => {
      tracker = new LineageTracker();
    });

    it('should initialize lineage for a node', () => {
      tracker.initializeLineage('node1');
      const lineage = tracker.getLineage('node1');
      expect(lineage).not.toBeNull();
      expect(lineage?.nodeId).toBe('node1');
    });

    it('should track lineage edges', () => {
      tracker.initializeLineage('node1');
      tracker.trackEdge('node1', {
        sourceId: 'source1',
        targetId: 'node1',
        transformationType: 'ingest',
      });
      const edges = tracker.getEdges('node1');
      expect(edges).toHaveLength(1);
    });

    it('should get upstream nodes', () => {
      tracker.initializeLineage('node1');
      tracker.trackEdge('node1', {
        sourceId: 'upstream1',
        targetId: 'node1',
        transformationType: 'transform',
      });
      const upstream = tracker.getUpstream('node1');
      expect(upstream).toHaveLength(1);
      expect(upstream[0].id).toBe('upstream1');
    });

    it('should calculate impact', () => {
      tracker.initializeLineage('source');
      tracker.initializeLineage('target1');
      tracker.trackEdge('source', {
        sourceId: 'source',
        targetId: 'target1',
        transformationType: 'transform',
      });
      const impacted = tracker.calculateImpact('source');
      expect(impacted).toContain('target1');
    });

    it('should clear lineage', () => {
      tracker.initializeLineage('node1');
      tracker.clearLineage('node1');
      expect(tracker.getLineage('node1')).toBeNull();
    });
  });

  describe('MetricsCollector', () => {
    let collector: MetricsCollector;

    beforeEach(() => {
      collector = new MetricsCollector();
    });

    it('should record operations', () => {
      collector.recordOperation('query', 'lake1');
      collector.recordOperation('query', 'lake1');
      const metrics = collector.getMetrics();
      expect(metrics.operations['query:lake1']).toBe(2);
    });

    it('should record ingestion metrics', () => {
      collector.recordIngestion('lake1', 'table1', {
        ingested: 100,
        duplicates: 5,
        errors: 2,
        skipped: 0,
        duration: 1000,
      });
      const metrics = collector.getMetrics();
      expect(metrics.ingestions.total).toBe(100);
      expect(metrics.ingestions.duplicates).toBe(5);
    });

    it('should record query metrics', () => {
      collector.recordQuery('lake1', {
        columns: [],
        rows: [],
        rowCount: 10,
        executionTime: 50,
        bytesScanned: 1000,
      });
      const metrics = collector.getMetrics();
      expect(metrics.queries.total).toBe(1);
      expect(metrics.queries.bytesScanned).toBe(1000);
    });

    it('should reset metrics', () => {
      collector.recordOperation('test', 'lake1');
      collector.reset();
      const metrics = collector.getMetrics();
      expect(Object.keys(metrics.operations)).toHaveLength(0);
    });
  });

  describe('SchemaRegistry', () => {
    let registry: SchemaRegistry;

    beforeEach(() => {
      registry = new SchemaRegistry();
    });

    it('should register schema', () => {
      const schema: TableSchema = {
        name: 'users',
        columns: [{ name: 'id', type: 'string', nullable: false }],
        partitionColumns: [],
        format: 'parquet',
        compression: 'snappy',
        properties: {},
      };
      registry.register('lake1:users', schema);
      const latest = registry.getLatest('lake1:users');
      expect(latest?.name).toBe('users');
    });

    it('should evolve schema with additive changes', () => {
      const schema: TableSchema = {
        name: 'users',
        columns: [{ name: 'id', type: 'string', nullable: false }],
        partitionColumns: [],
        format: 'parquet',
        compression: 'snappy',
        properties: {},
      };
      registry.register('lake1:users', schema);
      const evolved = registry.evolve('lake1:users', {
        addColumns: [{ name: 'email', type: 'string', nullable: true }],
      });
      expect(evolved.columns).toHaveLength(2);
    });

    it('should reject changes in strict mode', () => {
      const schema: TableSchema = {
        name: 'users',
        columns: [{ name: 'id', type: 'string', nullable: false }],
        partitionColumns: [],
        format: 'parquet',
        compression: 'snappy',
        properties: {},
      };
      registry.register('lake1:users', schema);
      expect(() =>
        registry.evolve('lake1:users', { addColumns: [] }, 'strict')
      ).toThrow('Schema evolution not allowed in strict mode');
    });

    it('should reject destructive changes in additive mode', () => {
      const schema: TableSchema = {
        name: 'users',
        columns: [{ name: 'id', type: 'string', nullable: false }],
        partitionColumns: [],
        format: 'parquet',
        compression: 'snappy',
        properties: {},
      };
      registry.register('lake1:users', schema);
      expect(() =>
        registry.evolve('lake1:users', { dropColumns: ['id'] }, 'additive')
      ).toThrow('Only additive changes allowed in additive mode');
    });

    it('should get all schema versions', () => {
      const schema: TableSchema = {
        name: 'users',
        columns: [{ name: 'id', type: 'string', nullable: false }],
        partitionColumns: [],
        format: 'parquet',
        compression: 'snappy',
        properties: {},
      };
      registry.register('lake1:users', schema);
      registry.evolve('lake1:users', {
        addColumns: [{ name: 'name', type: 'string', nullable: true }],
      });
      const versions = registry.getVersions('lake1:users');
      expect(versions).toHaveLength(2);
    });
  });

  describe('CatalogManager', () => {
    let catalog: CatalogManager;

    beforeEach(() => {
      catalog = new CatalogManager();
    });

    it('should set and get catalog entries', () => {
      const entry: CatalogEntry = {
        tableName: 'users',
        database: 'default',
        schema: {
          name: 'users',
          columns: [],
          partitionColumns: [],
          format: 'parquet',
          compression: 'snappy',
          properties: {},
        },
        location: 's3://bucket/users/',
        format: 'parquet',
        rowCount: 1000,
        sizeBytes: 1024 * 1024,
        partitions: [],
        lastModified: new Date(),
        created: new Date(),
        owner: 'admin',
        tags: ['production'],
      };
      catalog.set('lake1:users', entry);
      const retrieved = catalog.get('lake1:users');
      expect(retrieved?.tableName).toBe('users');
    });

    it('should filter entries by tags', () => {
      const entry1: CatalogEntry = {
        tableName: 'users',
        database: 'default',
        schema: { name: 'users', columns: [], partitionColumns: [], format: 'parquet', compression: 'snappy', properties: {} },
        location: '',
        format: 'parquet',
        rowCount: 0,
        sizeBytes: 0,
        partitions: [],
        lastModified: new Date(),
        created: new Date(),
        owner: 'admin',
        tags: ['production'],
      };
      const entry2: CatalogEntry = {
        tableName: 'logs',
        database: 'default',
        schema: { name: 'logs', columns: [], partitionColumns: [], format: 'parquet', compression: 'snappy', properties: {} },
        location: '',
        format: 'parquet',
        rowCount: 0,
        sizeBytes: 0,
        partitions: [],
        lastModified: new Date(),
        created: new Date(),
        owner: 'admin',
        tags: ['staging'],
      };
      catalog.set('lake1:users', entry1);
      catalog.set('lake1:logs', entry2);
      const filtered = catalog.filter({ tags: ['production'] });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].tableName).toBe('users');
    });

    it('should update statistics', () => {
      const entry: CatalogEntry = {
        tableName: 'users',
        database: 'default',
        schema: { name: 'users', columns: [], partitionColumns: [], format: 'parquet', compression: 'snappy', properties: {} },
        location: '',
        format: 'parquet',
        rowCount: 100,
        sizeBytes: 1000,
        partitions: [],
        lastModified: new Date(),
        created: new Date(),
        owner: 'admin',
        tags: [],
      };
      catalog.set('lake1:users', entry);
      catalog.updateStats('lake1:users', { rowCount: 200 });
      expect(catalog.get('lake1:users')?.rowCount).toBe(200);
    });
  });
});

// =============================================================================
// SecurityDataLakeManager Tests
// =============================================================================

describe('SecurityDataLakeManager', () => {
  beforeEach(() => {
    SecurityDataLakeManager.resetInstance();
  });

  afterEach(() => {
    SecurityDataLakeManager.resetInstance();
  });

  it('should return singleton instance', () => {
    const instance1 = SecurityDataLakeManager.getInstance();
    const instance2 = SecurityDataLakeManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should get instance via helper function', () => {
    const instance = getSecurityDataLakeManager();
    expect(instance).toBeInstanceOf(SecurityDataLakeManager);
  });

  it('should initialize data lake', async () => {
    const manager = SecurityDataLakeManager.getInstance();
    const config: DataLakeConfig = {
      provider: 'aws',
      region: 'us-east-1',
      credentials: {},
      bucket: 'test-bucket',
      defaultFormat: 'parquet',
      defaultCompression: 'snappy',
      encryption: { type: 'none' },
      costOptimization: {
        enableTiering: false,
        hotToWarmDays: 30,
        warmToColdDays: 90,
        coldToArchiveDays: 365,
        enableCompression: false,
        enableDeduplication: false,
      },
    };
    await manager.initializeDataLake('test-lake', config);
    const lakes = manager.listDataLakes();
    expect(lakes).toHaveLength(1);
    expect(lakes[0].name).toBe('test-lake');
  });

  it('should create table in data lake', async () => {
    const manager = SecurityDataLakeManager.getInstance();
    const config: DataLakeConfig = {
      provider: 'aws',
      region: 'us-east-1',
      credentials: {},
      bucket: 'test-bucket',
      defaultFormat: 'parquet',
      defaultCompression: 'snappy',
      encryption: { type: 'none' },
      costOptimization: {
        enableTiering: false,
        hotToWarmDays: 30,
        warmToColdDays: 90,
        coldToArchiveDays: 365,
        enableCompression: false,
        enableDeduplication: false,
      },
    };
    await manager.initializeDataLake('test-lake', config);
    const schema: TableSchema = {
      name: 'events',
      columns: [{ name: 'id', type: 'string', nullable: false }],
      partitionColumns: [],
      format: 'parquet',
      compression: 'snappy',
      properties: {},
    };
    await manager.createTable('test-lake', schema);
    const catalog = manager.getCatalog();
    expect(catalog).toHaveLength(1);
  });

  it('should query data from data lake', async () => {
    const manager = SecurityDataLakeManager.getInstance();
    const config: DataLakeConfig = {
      provider: 'aws',
      region: 'us-east-1',
      credentials: {},
      bucket: 'test-bucket',
      defaultFormat: 'parquet',
      defaultCompression: 'snappy',
      encryption: { type: 'none' },
      costOptimization: {
        enableTiering: false,
        hotToWarmDays: 30,
        warmToColdDays: 90,
        coldToArchiveDays: 365,
        enableCompression: false,
        enableDeduplication: false,
      },
    };
    await manager.initializeDataLake('test-lake', config);
    const result = await manager.queryData('test-lake', {
      table: 'events',
      columns: ['id'],
      limit: 10,
    });
    expect(result).toHaveProperty('rows');
  });

  it('should get metrics', async () => {
    const manager = SecurityDataLakeManager.getInstance();
    const metrics = manager.getMetrics();
    expect(metrics).toHaveProperty('operations');
    expect(metrics).toHaveProperty('ingestions');
    expect(metrics).toHaveProperty('queries');
  });

  it('should shutdown cleanly', async () => {
    const manager = SecurityDataLakeManager.getInstance();
    const config: DataLakeConfig = {
      provider: 'aws',
      region: 'us-east-1',
      credentials: {},
      bucket: 'test-bucket',
      defaultFormat: 'parquet',
      defaultCompression: 'snappy',
      encryption: { type: 'none' },
      costOptimization: {
        enableTiering: false,
        hotToWarmDays: 30,
        warmToColdDays: 90,
        coldToArchiveDays: 365,
        enableCompression: false,
        enableDeduplication: false,
      },
    };
    await manager.initializeDataLake('test-lake', config);
    manager.shutdown();
    const lakes = manager.listDataLakes();
    expect(lakes).toHaveLength(0);
  });
});

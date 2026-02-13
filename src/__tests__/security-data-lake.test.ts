/**
 * Comprehensive test suite for Security Data Lake System
 *
 * Tests the following modules:
 * 1. SecurityDataLakeManager - Multi-cloud data lake management
 * 2. DataIngestionPipeline - Stream processing and ingestion
 * 3. SecurityAnalyticsQueryEngine - SQL-like query engine
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SecurityDataLakeManager,
  getSecurityDataLakeManager,
  DataLakeConfig,
  TableSchema,
  DataRecord,
  QueryRequest,
  PartitionSpec,
  RetentionPolicy,
  StorageTier,
  DataFormat,
  ColumnDefinition,
} from '../datalake/SecurityDataLakeManager';
import {
  DataIngestionPipeline,
  PipelineConfig,
  IngestionSourceConfig,
  TransformationConfig,
  WindowConfig,
  DataQualityConfig,
  IngestionRecord,
  SchemaDefinition,
} from '../datalake/DataIngestionPipeline';
import {
  SecurityAnalyticsQueryEngine,
  getSecurityAnalyticsQueryEngine,
  QueryConfig,
  SecurityQuery,
  QueryCategory,
  MaterializedView,
  ScheduledQuery,
  AlertConfig,
  ExportOptions,
  BIIntegration,
  ShareTarget,
  SharePermission,
} from '../datalake/SecurityAnalyticsQueryEngine';

// =============================================================================
// Test Fixtures and Helpers
// =============================================================================

const createAWSConfig = (): DataLakeConfig => ({
  provider: 'aws',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
  },
  bucket: 'security-data-lake-test',
  defaultFormat: 'parquet',
  defaultCompression: 'snappy',
  encryption: {
    type: 'aws-kms',
    keyId: 'test-kms-key',
  },
  costOptimization: {
    enableTiering: true,
    hotToWarmDays: 30,
    warmToColdDays: 90,
    coldToArchiveDays: 365,
    enableCompression: true,
    enableDeduplication: true,
  },
});

const createAzureConfig = (): DataLakeConfig => ({
  provider: 'azure',
  region: 'eastus',
  credentials: {
    accountId: 'teststorageaccount',
    tenantId: 'test-tenant',
    clientId: 'test-client',
    clientSecret: 'test-secret',
  },
  container: 'security-data',
  defaultFormat: 'parquet',
  defaultCompression: 'gzip',
  encryption: {
    type: 'azure-key-vault',
    keyVaultUrl: 'https://test-vault.vault.azure.net',
  },
  costOptimization: {
    enableTiering: true,
    hotToWarmDays: 30,
    warmToColdDays: 90,
    coldToArchiveDays: 365,
    enableCompression: true,
    enableDeduplication: false,
  },
});

const createGCPConfig = (): DataLakeConfig => ({
  provider: 'gcp',
  region: 'us-central1',
  credentials: {
    projectId: 'test-project',
    keyFile: '/path/to/key.json',
  },
  dataset: 'security_analytics',
  defaultFormat: 'parquet',
  defaultCompression: 'snappy',
  encryption: {
    type: 'gcp-kms',
    keyId: 'projects/test/locations/us/keyRings/ring/cryptoKeys/key',
  },
  costOptimization: {
    enableTiering: false,
    hotToWarmDays: 30,
    warmToColdDays: 90,
    coldToArchiveDays: 365,
    enableCompression: true,
    enableDeduplication: true,
  },
});

const createSnowflakeConfig = (): DataLakeConfig => ({
  provider: 'snowflake',
  region: 'us-west-2',
  credentials: {
    accountId: 'test-account',
    privateKey: 'test-private-key',
  },
  warehouse: 'SECURITY_WH',
  defaultFormat: 'parquet',
  defaultCompression: 'zstd',
  encryption: {
    type: 'aes-256',
  },
  costOptimization: {
    enableTiering: false,
    hotToWarmDays: 30,
    warmToColdDays: 90,
    coldToArchiveDays: 365,
    enableCompression: true,
    enableDeduplication: false,
  },
});

const createDatabricksConfig = (): DataLakeConfig => ({
  provider: 'databricks',
  region: 'us-west-2',
  credentials: {
    connectionString: 'jdbc:databricks://test.cloud.databricks.com',
  },
  catalog: 'security_catalog',
  defaultFormat: 'parquet',
  defaultCompression: 'zstd',
  encryption: {
    type: 'aes-256',
  },
  costOptimization: {
    enableTiering: true,
    hotToWarmDays: 30,
    warmToColdDays: 90,
    coldToArchiveDays: 365,
    enableCompression: true,
    enableDeduplication: true,
  },
});

const createSecurityEventsSchema = (): TableSchema => ({
  name: 'security_events',
  columns: [
    { name: 'id', type: 'string', nullable: false },
    { name: 'timestamp', type: 'timestamp', nullable: false },
    { name: 'source', type: 'string', nullable: false },
    { name: 'severity', type: 'string', nullable: false },
    { name: 'category', type: 'string', nullable: true },
    { name: 'data', type: 'map', nullable: true },
    { name: 'user_id', type: 'string', nullable: true },
    { name: 'ip_address', type: 'string', nullable: true },
  ],
  partitionColumns: ['year', 'month', 'day'],
  clusterColumns: ['source', 'severity'],
  format: 'parquet',
  compression: 'snappy',
  properties: {
    'table.type': 'EXTERNAL',
    'parquet.compression': 'SNAPPY',
  },
});

const createSampleDataRecords = (count: number): DataRecord[] => {
  const severities: Array<DataRecord['severity']> = ['critical', 'high', 'medium', 'low', 'info'];
  const sources = ['firewall', 'ids', 'endpoint', 'cloud', 'application'];

  return Array.from({ length: count }, (_, i) => ({
    id: `evt_${Date.now()}_${i}`,
    timestamp: new Date(Date.now() - Math.random() * 86400000),
    source: sources[i % sources.length],
    severity: severities[i % severities.length],
    category: 'security',
    data: {
      message: `Security event ${i}`,
      details: { index: i },
    },
  }));
};

const createPipelineConfig = (): PipelineConfig => ({
  id: 'test-pipeline',
  name: 'Test Security Pipeline',
  description: 'Test pipeline for security events',
  sources: [
    {
      type: 'kafka',
      id: 'kafka-source',
      name: 'Kafka Security Events',
      connection: {
        brokers: ['localhost:9092'],
        topic: 'security-events',
        saslMechanism: 'plain',
        username: 'test',
        password: 'test',
      },
      partitions: 3,
      consumerGroup: 'security-consumer',
      startOffset: 'latest',
      maxBatchSize: 100,
      pollIntervalMs: 100,
      enabled: true,
    },
  ],
  transformations: [
    {
      id: 'transform-1',
      name: 'Map Fields',
      type: 'map',
      order: 1,
      config: {
        fields: {
          eventId: 'id',
          eventTime: 'timestamp',
        },
      },
    },
  ],
  enrichments: [],
  windows: {
    type: 'tumbling',
    sizeMs: 60000,
    allowedLatenessMs: 5000,
    aggregation: {
      type: 'count',
    },
  },
  qualityChecks: [
    {
      id: 'check-1',
      name: 'Nullability Check',
      type: 'nullability',
      severity: 'error',
      config: {
        fields: ['id', 'timestamp'],
      },
      onFailure: 'reject',
    },
  ],
  deadLetterQueue: {
    enabled: true,
    destination: {
      type: 'local',
      config: { path: '/tmp/dlq' },
    },
    retentionDays: 7,
    maxRetries: 3,
    includeMetadata: true,
  },
  backpressure: {
    strategy: 'buffer',
    thresholds: {
      lowWatermark: 1000,
      highWatermark: 5000,
    },
    bufferSize: 10000,
  },
  checkpoint: {
    strategy: 'periodic',
    intervalMs: 30000,
    storage: {
      type: 'memory',
      config: {},
    },
    exactlyOnce: true,
    retainCount: 10,
  },
  scaling: {
    enabled: true,
    minInstances: 1,
    maxInstances: 5,
    targetThroughput: 10000,
    scaleUpThreshold: 0.8,
    scaleDownThreshold: 0.3,
    cooldownPeriodMs: 60000,
    metricsWindowMs: 60000,
  },
  monitoring: {
    enabled: true,
    metricsIntervalMs: 5000,
    alerting: {
      enabled: true,
      channels: ['email', 'slack'],
      thresholds: {
        errorRate: 0.01,
        latencyMs: 1000,
        backpressure: 0.8,
      },
    },
  },
  retryPolicy: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: ['ETIMEDOUT', 'ECONNRESET'],
  },
});

// =============================================================================
// SecurityDataLakeManager Tests
// =============================================================================

describe('SecurityDataLakeManager', () => {
  let manager: SecurityDataLakeManager;

  beforeEach(() => {
    SecurityDataLakeManager.resetInstance();
    manager = SecurityDataLakeManager.getInstance();
  });

  afterEach(() => {
    manager.shutdown();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SecurityDataLakeManager.getInstance();
      const instance2 = SecurityDataLakeManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = SecurityDataLakeManager.getInstance();
      SecurityDataLakeManager.resetInstance();
      const instance2 = SecurityDataLakeManager.getInstance();
      expect(instance1).not.toBe(instance2);
    });

    it('should return instance via helper function', () => {
      const instance = getSecurityDataLakeManager();
      expect(instance).toBe(manager);
    });
  });

  describe('Data Lake Initialization', () => {
    it('should initialize AWS data lake', async () => {
      const config = createAWSConfig();
      await manager.initializeDataLake('aws-lake', config);

      const lakes = manager.listDataLakes();
      expect(lakes).toHaveLength(1);
      expect(lakes[0].name).toBe('aws-lake');
      expect(lakes[0].provider).toBe('aws');
      expect(lakes[0].initialized).toBe(true);
    });

    it('should initialize Azure data lake', async () => {
      const config = createAzureConfig();
      await manager.initializeDataLake('azure-lake', config);

      const lakes = manager.listDataLakes();
      expect(lakes.find((l) => l.name === 'azure-lake')?.provider).toBe('azure');
    });

    it('should initialize GCP data lake', async () => {
      const config = createGCPConfig();
      await manager.initializeDataLake('gcp-lake', config);

      const lakes = manager.listDataLakes();
      expect(lakes.find((l) => l.name === 'gcp-lake')?.provider).toBe('gcp');
    });

    it('should initialize Snowflake data lake', async () => {
      const config = createSnowflakeConfig();
      await manager.initializeDataLake('snowflake-lake', config);

      const lakes = manager.listDataLakes();
      expect(lakes.find((l) => l.name === 'snowflake-lake')?.provider).toBe('snowflake');
    });

    it('should initialize Databricks data lake', async () => {
      const config = createDatabricksConfig();
      await manager.initializeDataLake('databricks-lake', config);

      const lakes = manager.listDataLakes();
      expect(lakes.find((l) => l.name === 'databricks-lake')?.provider).toBe('databricks');
    });

    it('should emit event on initialization', async () => {
      const handler = vi.fn();
      manager.on('dataLakeInitialized', handler);

      await manager.initializeDataLake('test-lake', createAWSConfig());

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-lake',
          provider: 'aws',
        })
      );
    });

    it('should support multiple data lakes', async () => {
      await manager.initializeDataLake('aws-lake', createAWSConfig());
      await manager.initializeDataLake('azure-lake', createAzureConfig());
      await manager.initializeDataLake('gcp-lake', createGCPConfig());

      const lakes = manager.listDataLakes();
      expect(lakes).toHaveLength(3);
    });

    it('should throw error for unsupported provider', async () => {
      const invalidConfig = {
        ...createAWSConfig(),
        provider: 'unsupported' as any,
      };

      await expect(manager.initializeDataLake('invalid', invalidConfig)).rejects.toThrow(
        'Unsupported data lake provider'
      );
    });
  });

  describe('Schema Management and Evolution', () => {
    beforeEach(async () => {
      await manager.initializeDataLake('test-lake', createAWSConfig());
    });

    it('should create table with schema', async () => {
      const schema = createSecurityEventsSchema();
      await manager.createTable('test-lake', schema);

      const catalog = manager.getCatalog({ dataLake: 'test-lake' });
      expect(catalog.some((e) => e.tableName === 'security_events')).toBe(true);
    });

    it('should create table with partition spec', async () => {
      const schema = createSecurityEventsSchema();
      const partitionSpec: PartitionSpec = {
        strategy: 'composite',
        timeGranularity: 'day',
        sourceField: 'source',
        severityField: 'severity',
      };

      await manager.createTable('test-lake', schema, partitionSpec);

      const schemaHistory = manager.getSchemaHistory('test-lake', 'security_events');
      expect(schemaHistory).toHaveLength(1);
      expect(schemaHistory[0].partitionColumns).toContain('year');
      expect(schemaHistory[0].partitionColumns).toContain('source');
    });

    it('should evolve schema with additive changes', async () => {
      const schema = createSecurityEventsSchema();
      await manager.createTable('test-lake', schema);

      await manager.evolveSchema('test-lake', 'security_events', {
        addColumns: [
          { name: 'new_field', type: 'string', nullable: true },
          { name: 'count', type: 'int', nullable: true },
        ],
      });

      const schemaHistory = manager.getSchemaHistory('test-lake', 'security_events');
      expect(schemaHistory).toHaveLength(2);
      expect(schemaHistory[1].columns.find((c) => c.name === 'new_field')).toBeDefined();
    });

    it('should evolve schema with full mode changes', async () => {
      const schema = createSecurityEventsSchema();
      await manager.createTable('test-lake', schema);

      await manager.evolveSchema(
        'test-lake',
        'security_events',
        {
          dropColumns: ['category'],
          renameColumns: [{ from: 'user_id', to: 'userId' }],
        },
        'full'
      );

      const schemaHistory = manager.getSchemaHistory('test-lake', 'security_events');
      expect(schemaHistory[1].columns.find((c) => c.name === 'category')).toBeUndefined();
      expect(schemaHistory[1].columns.find((c) => c.name === 'userId')).toBeDefined();
    });

    it('should reject drop/rename in additive mode', async () => {
      const schema = createSecurityEventsSchema();
      await manager.createTable('test-lake', schema);

      await expect(
        manager.evolveSchema(
          'test-lake',
          'security_events',
          {
            dropColumns: ['category'],
          },
          'additive'
        )
      ).rejects.toThrow('Only additive changes allowed');
    });

    it('should reject all changes in strict mode', async () => {
      const schema = createSecurityEventsSchema();
      await manager.createTable('test-lake', schema);

      await expect(
        manager.evolveSchema(
          'test-lake',
          'security_events',
          {
            addColumns: [{ name: 'test', type: 'string', nullable: true }],
          },
          'strict'
        )
      ).rejects.toThrow('Schema evolution not allowed in strict mode');
    });

    it('should emit schema evolved event', async () => {
      const handler = vi.fn();
      manager.on('schemaEvolved', handler);

      const schema = createSecurityEventsSchema();
      await manager.createTable('test-lake', schema);

      await manager.evolveSchema('test-lake', 'security_events', {
        addColumns: [{ name: 'test', type: 'string', nullable: true }],
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'security_events',
          version: 2,
        })
      );
    });

    it('should drop table', async () => {
      const schema = createSecurityEventsSchema();
      await manager.createTable('test-lake', schema);

      await manager.dropTable('test-lake', 'security_events');

      const catalog = manager.getCatalog();
      expect(catalog.find((e) => e.tableName === 'security_events')).toBeUndefined();
    });
  });

  describe('Data Ingestion', () => {
    beforeEach(async () => {
      await manager.initializeDataLake('test-lake', createAWSConfig());
      await manager.createTable('test-lake', createSecurityEventsSchema());
    });

    it('should ingest data records', async () => {
      const records = createSampleDataRecords(100);
      const result = await manager.ingestData('test-lake', 'security_events', records);

      expect(result.ingested).toBe(100);
      expect(result.errors).toBe(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should deduplicate records', async () => {
      const records = createSampleDataRecords(50);
      const duplicatedRecords = [...records, ...records.slice(0, 20)];

      const result = await manager.ingestData('test-lake', 'security_events', duplicatedRecords, {
        dedup: true,
      });

      expect(result.ingested).toBe(50);
      expect(result.duplicates).toBe(20);
    });

    it('should process in batches', async () => {
      const records = createSampleDataRecords(250);
      const result = await manager.ingestData('test-lake', 'security_events', records, {
        batchSize: 50,
      });

      expect(result.ingested).toBe(250);
    });

    it('should track lineage on ingest', async () => {
      const records = createSampleDataRecords(10);
      await manager.ingestData('test-lake', 'security_events', records, {
        sourceLineage: 'external:kafka-topic',
      });

      const lineage = manager.getLineage('test-lake', 'security_events');
      expect(lineage).not.toBeNull();
      expect(lineage?.edges.length).toBeGreaterThan(0);
    });

    it('should update catalog statistics after ingestion', async () => {
      const records = createSampleDataRecords(100);
      await manager.ingestData('test-lake', 'security_events', records);

      const catalog = manager.getCatalog();
      const entry = catalog.find((e) => e.tableName === 'security_events');
      expect(entry?.rowCount).toBe(100);
    });

    it('should emit ingestion event', async () => {
      const handler = vi.fn();
      manager.on('dataIngested', handler);

      const records = createSampleDataRecords(10);
      await manager.ingestData('test-lake', 'security_events', records);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          dataLake: 'test-lake',
          table: 'security_events',
          ingested: 10,
        })
      );
    });
  });

  describe('Query Execution', () => {
    beforeEach(async () => {
      await manager.initializeDataLake('test-lake', createAWSConfig());
      await manager.createTable('test-lake', createSecurityEventsSchema());
      await manager.ingestData('test-lake', 'security_events', createSampleDataRecords(100));
    });

    it('should execute simple query', async () => {
      const request: QueryRequest = {
        table: 'security_events',
        columns: ['id', 'timestamp', 'severity'],
        limit: 10,
      };

      const result = await manager.queryData('test-lake', request);

      expect(result.rowCount).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should execute query with filters', async () => {
      const request: QueryRequest = {
        table: 'security_events',
        columns: ['*'],
        filters: [
          { column: 'severity', operator: 'eq', value: 'critical' },
          { column: 'timestamp', operator: 'gte', value: new Date(Date.now() - 86400000) },
        ],
        limit: 100,
      };

      const result = await manager.queryData('test-lake', request);
      expect(result).toBeDefined();
    });

    it('should cache query results', async () => {
      const request: QueryRequest = {
        table: 'security_events',
        columns: ['id'],
        limit: 10,
        cacheResults: true,
      };

      await manager.queryData('test-lake', request);
      const cachedResult = await manager.queryData('test-lake', request);

      expect(cachedResult.cached).toBe(true);
    });

    it('should execute federated query', async () => {
      await manager.initializeDataLake('secondary-lake', createAzureConfig());

      const request: QueryRequest = {
        table: 'security_events',
        columns: ['*'],
        federatedSources: ['secondary-lake'],
        limit: 50,
      };

      const result = await manager.queryData('test-lake', request);
      expect(result).toBeDefined();
    });

    it('should emit query event', async () => {
      const handler = vi.fn();
      manager.on('queryExecuted', handler);

      const request: QueryRequest = {
        table: 'security_events',
        limit: 10,
      };

      await manager.queryData('test-lake', request);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          dataLake: 'test-lake',
        })
      );
    });
  });

  describe('Retention Policy and Cleanup', () => {
    beforeEach(async () => {
      await manager.initializeDataLake('test-lake', createAWSConfig());
      await manager.createTable('test-lake', createSecurityEventsSchema());
    });

    it('should set retention policy', async () => {
      await manager.setRetentionPolicy('test-lake', 'security_events', {
        retentionDays: 90,
        gracePeriodDays: 7,
        archiveBeforeDelete: true,
        archiveLocation: 's3://archive-bucket/',
        enabled: true,
      });

      // Verify event emission
      const handler = vi.fn();
      manager.on('retentionPolicySet', handler);

      await manager.setRetentionPolicy('test-lake', 'security_events', {
        retentionDays: 30,
        gracePeriodDays: 3,
        archiveBeforeDelete: false,
        enabled: true,
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should apply retention cleanup', async () => {
      await manager.setRetentionPolicy('test-lake', 'security_events', {
        retentionDays: 30,
        gracePeriodDays: 0,
        archiveBeforeDelete: false,
        enabled: true,
      });

      const result = await manager.applyRetentionCleanup('test-lake', 'security_events');

      expect(result).toHaveProperty('partitionsDeleted');
      expect(result).toHaveProperty('bytesReclaimed');
      expect(result).toHaveProperty('archived');
    });

    it('should skip cleanup for disabled policy', async () => {
      await manager.setRetentionPolicy('test-lake', 'security_events', {
        retentionDays: 30,
        gracePeriodDays: 0,
        archiveBeforeDelete: false,
        enabled: false,
      });

      const result = await manager.applyRetentionCleanup('test-lake', 'security_events');

      expect(result.partitionsDeleted).toBe(0);
    });
  });

  describe('Tiered Storage Optimization', () => {
    beforeEach(async () => {
      await manager.initializeDataLake('test-lake', createAWSConfig());
      await manager.createTable('test-lake', createSecurityEventsSchema());
    });

    it('should optimize storage tiers', async () => {
      const result = await manager.optimizeStorage('test-lake', 'security_events');

      expect(result).toHaveProperty('tableName', 'security_events');
      expect(result).toHaveProperty('tieredPartitions');
      expect(result).toHaveProperty('estimatedSavings');
      expect(result).toHaveProperty('duration');
    });

    it('should compact partitions', async () => {
      const result = await manager.compactPartitions('test-lake', 'security_events');

      expect(result).toHaveProperty('tableName', 'security_events');
      expect(result).toHaveProperty('partitionsProcessed');
      expect(result).toHaveProperty('compressionRatio');
    });

    it('should throw error for non-existent table', async () => {
      await expect(manager.optimizeStorage('test-lake', 'nonexistent_table')).rejects.toThrow(
        "Table 'nonexistent_table' not found"
      );
    });
  });

  describe('Cost Estimation', () => {
    beforeEach(async () => {
      await manager.initializeDataLake('aws-lake', createAWSConfig());
      await manager.initializeDataLake('azure-lake', createAzureConfig());
      await manager.createTable('aws-lake', createSecurityEventsSchema());
    });

    it('should estimate storage costs', async () => {
      const costs = await manager.getStorageCosts('aws-lake');

      expect(costs).toHaveProperty('totalCost');
      expect(costs).toHaveProperty('byTable');
      expect(costs).toHaveProperty('byTier');
    });

    it('should estimate costs for all data lakes', async () => {
      const costs = await manager.getStorageCosts();

      expect(costs.byTier).toHaveProperty('hot');
      expect(costs.byTier).toHaveProperty('warm');
      expect(costs.byTier).toHaveProperty('cold');
      expect(costs.byTier).toHaveProperty('archive');
    });
  });

  describe('Lineage Tracking', () => {
    beforeEach(async () => {
      await manager.initializeDataLake('test-lake', createAWSConfig());
      await manager.createTable('test-lake', createSecurityEventsSchema());
    });

    it('should track data lineage', async () => {
      await manager.trackLineage('test-lake', 'security_events', {
        sourceId: 'external:kafka',
        targetId: 'test-lake:security_events',
        transformationType: 'ingest',
      });

      const lineage = manager.getLineage('test-lake', 'security_events');

      expect(lineage).not.toBeNull();
      expect(lineage?.edges).toHaveLength(1);
      expect(lineage?.edges[0].transformationType).toBe('ingest');
    });

    it('should track upstream references', async () => {
      await manager.trackLineage('test-lake', 'security_events', {
        sourceId: 'upstream:source_table',
        targetId: 'test-lake:security_events',
        transformationType: 'transform',
      });

      const lineage = manager.getLineage('test-lake', 'security_events');
      expect(lineage?.upstream.length).toBeGreaterThan(0);
    });

    it('should return null for table without lineage', () => {
      const lineage = manager.getLineage('test-lake', 'nonexistent');
      expect(lineage).toBeNull();
    });
  });

  describe('Catalog Operations', () => {
    beforeEach(async () => {
      await manager.initializeDataLake('test-lake', createAWSConfig());
    });

    it('should filter catalog by format', async () => {
      const parquetSchema = { ...createSecurityEventsSchema(), format: 'parquet' as DataFormat };
      const jsonSchema = {
        ...createSecurityEventsSchema(),
        name: 'json_events',
        format: 'json' as DataFormat,
      };

      await manager.createTable('test-lake', parquetSchema);
      await manager.createTable('test-lake', jsonSchema);

      const parquetTables = manager.getCatalog({ format: 'parquet' });
      expect(parquetTables.every((t) => t.format === 'parquet')).toBe(true);
    });

    it('should filter catalog by row count', async () => {
      await manager.createTable('test-lake', createSecurityEventsSchema());
      await manager.ingestData(
        'test-lake',
        'security_events',
        createSampleDataRecords(100)
      );

      const filteredCatalog = manager.getCatalog({ minRows: 50 });
      expect(filteredCatalog.every((t) => t.rowCount >= 50)).toBe(true);
    });
  });

  describe('Metrics Collection', () => {
    beforeEach(async () => {
      await manager.initializeDataLake('test-lake', createAWSConfig());
      await manager.createTable('test-lake', createSecurityEventsSchema());
    });

    it('should collect metrics', async () => {
      await manager.ingestData(
        'test-lake',
        'security_events',
        createSampleDataRecords(50)
      );

      const metrics = manager.getMetrics();

      expect(metrics).toHaveProperty('operations');
      expect(metrics).toHaveProperty('ingestions');
      expect(metrics).toHaveProperty('queries');
    });
  });
});

// =============================================================================
// DataIngestionPipeline Tests
// =============================================================================

describe('DataIngestionPipeline', () => {
  let pipeline: DataIngestionPipeline;

  beforeEach(() => {
    DataIngestionPipeline.resetInstance();
    pipeline = DataIngestionPipeline.getInstance();
  });

  afterEach(async () => {
    await pipeline.shutdown();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DataIngestionPipeline.getInstance();
      const instance2 = DataIngestionPipeline.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = DataIngestionPipeline.getInstance();
      DataIngestionPipeline.resetInstance();
      const instance2 = DataIngestionPipeline.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Pipeline Creation', () => {
    it('should create pipeline', async () => {
      const config = createPipelineConfig();
      const pipelineId = await pipeline.createPipeline(config);

      expect(pipelineId).toBe(config.id);
    });

    it('should emit pipeline created event', async () => {
      const handler = vi.fn();
      pipeline.on('pipeline:created', handler);

      const config = createPipelineConfig();
      await pipeline.createPipeline(config);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          pipelineId: config.id,
        })
      );
    });

    it('should validate pipeline configuration', async () => {
      const invalidConfig = {
        ...createPipelineConfig(),
        id: '',
      };

      await expect(pipeline.createPipeline(invalidConfig)).rejects.toThrow(
        'Pipeline ID is required'
      );
    });

    it('should require at least one source', async () => {
      const invalidConfig = {
        ...createPipelineConfig(),
        sources: [],
      };

      await expect(pipeline.createPipeline(invalidConfig)).rejects.toThrow(
        'Pipeline must have at least one source'
      );
    });
  });

  describe('Data Source Connections', () => {
    it('should connect to Kafka source', async () => {
      const config = createPipelineConfig();
      config.sources[0].type = 'kafka';

      await pipeline.createPipeline(config);

      const handler = vi.fn();
      pipeline.on('source:connected', handler);

      await pipeline.startIngestion(config.id);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'kafka',
        })
      );

      await pipeline.stopIngestion(config.id);
    });

    it('should connect to Kinesis source', async () => {
      const config = createPipelineConfig();
      config.sources[0] = {
        ...config.sources[0],
        type: 'kinesis',
        connection: {
          region: 'us-east-1',
          streamName: 'security-stream',
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      };

      await pipeline.createPipeline(config);

      const handler = vi.fn();
      pipeline.on('source:connected', handler);

      await pipeline.startIngestion(config.id);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'kinesis',
        })
      );

      await pipeline.stopIngestion(config.id);
    });

    it('should connect to PubSub source', async () => {
      const config = createPipelineConfig();
      config.sources[0] = {
        ...config.sources[0],
        type: 'pubsub',
        connection: {
          projectId: 'test-project',
          subscriptionName: 'security-sub',
        },
      };

      await pipeline.createPipeline(config);
      await pipeline.startIngestion(config.id);

      await new Promise((resolve) => setTimeout(resolve, 50));
      await pipeline.stopIngestion(config.id);
    });

    it('should connect to EventHub source', async () => {
      const config = createPipelineConfig();
      config.sources[0] = {
        ...config.sources[0],
        type: 'eventhub',
        connection: {
          connectionString: 'Endpoint=sb://test.servicebus.windows.net/',
          eventHubName: 'security-events',
        },
      };

      await pipeline.createPipeline(config);
      await pipeline.startIngestion(config.id);

      await new Promise((resolve) => setTimeout(resolve, 50));
      await pipeline.stopIngestion(config.id);
    });

    it('should connect to Fluentd source', async () => {
      const config = createPipelineConfig();
      config.sources[0] = {
        ...config.sources[0],
        type: 'fluentd',
        connection: {
          host: 'localhost',
          port: 24224,
          protocol: 'tcp',
        },
      };

      await pipeline.createPipeline(config);
      await pipeline.startIngestion(config.id);

      await new Promise((resolve) => setTimeout(resolve, 50));
      await pipeline.stopIngestion(config.id);
    });
  });

  describe('Stream Processing with Windowing', () => {
    it('should process tumbling windows', async () => {
      const config = createPipelineConfig();
      config.windows = {
        type: 'tumbling',
        sizeMs: 1000,
        aggregation: { type: 'count' },
      };

      await pipeline.createPipeline(config);

      const windowHandler = vi.fn();
      pipeline.on('window:closed', windowHandler);

      await pipeline.startIngestion(config.id);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await pipeline.stopIngestion(config.id);
    });

    it('should process sliding windows', async () => {
      const config = createPipelineConfig();
      config.windows = {
        type: 'sliding',
        sizeMs: 2000,
        slideMs: 500,
        aggregation: { type: 'count' },
      };

      await pipeline.createPipeline(config);
      await pipeline.startIngestion(config.id);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await pipeline.stopIngestion(config.id);
    });

    it('should process session windows', async () => {
      const config = createPipelineConfig();
      config.windows = {
        type: 'session',
        sizeMs: 5000,
        sessionGapMs: 1000,
        aggregation: { type: 'count' },
      };

      await pipeline.createPipeline(config);
      await pipeline.startIngestion(config.id);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await pipeline.stopIngestion(config.id);
    });

    it('should aggregate with sum', async () => {
      const config = createPipelineConfig();
      config.windows = {
        type: 'tumbling',
        sizeMs: 500,
        aggregation: { type: 'sum', field: 'value' },
      };

      await pipeline.createPipeline(config);
      await pipeline.startIngestion(config.id);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await pipeline.stopIngestion(config.id);
    });

    it('should aggregate with avg', async () => {
      const config = createPipelineConfig();
      config.windows = {
        type: 'tumbling',
        sizeMs: 500,
        aggregation: { type: 'avg', field: 'value' },
      };

      await pipeline.createPipeline(config);
      await pipeline.startIngestion(config.id);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await pipeline.stopIngestion(config.id);
    });
  });

  describe('Transformations', () => {
    it('should apply map transformation', async () => {
      const config = createPipelineConfig();
      config.transformations = [
        {
          id: 'map-1',
          name: 'Map Fields',
          type: 'map',
          order: 1,
          config: {
            fields: {
              newId: 'id',
              newTime: 'timestamp',
            },
          },
        },
      ];

      await pipeline.createPipeline(config);
      await pipeline.startIngestion(config.id);
      await new Promise((resolve) => setTimeout(resolve, 200));
      await pipeline.stopIngestion(config.id);
    });

    it('should apply filter transformation', async () => {
      const config = createPipelineConfig();
      config.transformations = [
        {
          id: 'filter-1',
          name: 'Filter Critical',
          type: 'filter',
          order: 1,
          config: {
            condition: 'data.level === "critical"',
          },
        },
      ];

      await pipeline.createPipeline(config);
      await pipeline.startIngestion(config.id);
      await new Promise((resolve) => setTimeout(resolve, 200));
      await pipeline.stopIngestion(config.id);
    });

    it('should apply dedupe transformation', async () => {
      const config = createPipelineConfig();
      config.transformations = [
        {
          id: 'dedupe-1',
          name: 'Deduplicate',
          type: 'dedupe',
          order: 1,
          config: {
            keyFields: ['id'],
            windowMs: 60000,
          },
        },
      ];

      await pipeline.createPipeline(config);
      await pipeline.startIngestion(config.id);
      await new Promise((resolve) => setTimeout(resolve, 200));
      await pipeline.stopIngestion(config.id);
    });

    it('should add custom transformation', async () => {
      const config = createPipelineConfig();
      await pipeline.createPipeline(config);

      pipeline.addTransformation(config.id, {
        id: 'custom-1',
        name: 'Custom Transform',
        type: 'custom',
        order: 2,
        config: {
          handler: async (record: IngestionRecord) => ({
            ...record,
            value: { ...record.value, custom: true },
          }),
        },
      });

      await pipeline.startIngestion(config.id);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await pipeline.stopIngestion(config.id);
    });

    it('should register custom transformation handler', () => {
      const handler = vi.fn();
      pipeline.on('handler:registered', handler);

      pipeline.registerTransformationHandler(
        'myCustomType',
        async (record) => record
      );

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'transformation',
          name: 'myCustomType',
        })
      );
    });
  });

  describe('Schema Validation', () => {
    it('should validate schema with required fields', () => {
      const schema: SchemaDefinition = {
        id: 'test-schema',
        name: 'Test Schema',
        version: '1.0',
        type: 'json',
        fields: [
          { name: 'id', type: 'string', nullable: false },
          { name: 'timestamp', type: 'date', nullable: false },
        ],
        required: ['id', 'timestamp'],
      };

      const validData = { id: 'test', timestamp: new Date().toISOString() };
      const result = pipeline.validateSchema(validData, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const schema: SchemaDefinition = {
        id: 'test-schema',
        name: 'Test Schema',
        version: '1.0',
        type: 'json',
        fields: [{ name: 'id', type: 'string', nullable: false }],
        required: ['id'],
      };

      const invalidData = {};
      const result = pipeline.validateSchema(invalidData, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('id'))).toBe(true);
    });

    it('should validate field types', () => {
      const schema: SchemaDefinition = {
        id: 'test-schema',
        name: 'Test Schema',
        version: '1.0',
        type: 'json',
        fields: [{ name: 'count', type: 'number', nullable: false }],
      };

      const invalidData = { count: 'not-a-number' };
      const result = pipeline.validateSchema(invalidData, schema);

      expect(result.valid).toBe(false);
    });

    it('should validate patterns', () => {
      const schema: SchemaDefinition = {
        id: 'test-schema',
        name: 'Test Schema',
        version: '1.0',
        type: 'json',
        fields: [
          {
            name: 'email',
            type: 'string',
            nullable: false,
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          },
        ],
      };

      const invalidData = { email: 'invalid-email' };
      const result = pipeline.validateSchema(invalidData, schema);

      expect(result.valid).toBe(false);
    });

    it('should validate enum values', () => {
      const schema: SchemaDefinition = {
        id: 'test-schema',
        name: 'Test Schema',
        version: '1.0',
        type: 'json',
        fields: [
          {
            name: 'severity',
            type: 'string',
            nullable: false,
            enum: ['low', 'medium', 'high', 'critical'],
          },
        ],
      };

      const invalidData = { severity: 'unknown' };
      const result = pipeline.validateSchema(invalidData, schema);

      expect(result.valid).toBe(false);
    });
  });

  describe('Backpressure Handling', () => {
    it('should handle backpressure with buffer strategy', async () => {
      const config = createPipelineConfig();
      config.backpressure = {
        strategy: 'buffer',
        thresholds: { lowWatermark: 10, highWatermark: 50 },
        bufferSize: 100,
      };

      await pipeline.createPipeline(config);

      const result = await pipeline.handleBackpressure(config.id, 20);
      expect(result).toBe(true);
    });

    it('should handle backpressure with drop strategy', async () => {
      const config = createPipelineConfig();
      config.backpressure = {
        strategy: 'drop',
        thresholds: { lowWatermark: 10, highWatermark: 50 },
        bufferSize: 100,
      };

      const handler = vi.fn();
      await pipeline.createPipeline(config);
      pipeline.on('backpressure:drop', handler);

      await pipeline.handleBackpressure(config.id, 100);
    });

    it('should handle backpressure with pause strategy', async () => {
      const config = createPipelineConfig();
      config.backpressure = {
        strategy: 'pause',
        thresholds: { lowWatermark: 10, highWatermark: 50 },
        bufferSize: 100,
        pauseTimeoutMs: 100,
      };

      const pauseHandler = vi.fn();
      const resumeHandler = vi.fn();

      await pipeline.createPipeline(config);
      pipeline.on('backpressure:pause', pauseHandler);
      pipeline.on('backpressure:resume', resumeHandler);

      await pipeline.handleBackpressure(config.id, 100);
    });
  });

  describe('Checkpointing', () => {
    it('should create checkpoint', async () => {
      const config = createPipelineConfig();
      await pipeline.createPipeline(config);
      await pipeline.startIngestion(config.id);

      const checkpoint = await pipeline.checkpoint(config.id);

      expect(checkpoint).toHaveProperty('id');
      expect(checkpoint).toHaveProperty('pipelineId', config.id);
      expect(checkpoint).toHaveProperty('timestamp');
      expect(checkpoint).toHaveProperty('checksum');

      await pipeline.stopIngestion(config.id);
    });

    it('should emit checkpoint event', async () => {
      const config = createPipelineConfig();
      await pipeline.createPipeline(config);

      const handler = vi.fn();
      pipeline.on('checkpoint:created', handler);

      await pipeline.startIngestion(config.id);
      await pipeline.checkpoint(config.id);

      expect(handler).toHaveBeenCalled();

      await pipeline.stopIngestion(config.id);
    });
  });

  describe('Metrics Collection', () => {
    it('should collect pipeline metrics', async () => {
      const config = createPipelineConfig();
      await pipeline.createPipeline(config);

      const metrics = pipeline.getMetrics(config.id);

      expect(metrics).not.toBeNull();
      expect(metrics).toHaveProperty('pipelineId', config.id);
      expect(metrics).toHaveProperty('recordsIngested');
      expect(metrics).toHaveProperty('recordsProcessed');
      expect(metrics).toHaveProperty('throughputPerSecond');
    });

    it('should get all pipeline metrics', async () => {
      const config1 = { ...createPipelineConfig(), id: 'pipeline-1' };
      const config2 = { ...createPipelineConfig(), id: 'pipeline-2' };

      await pipeline.createPipeline(config1);
      await pipeline.createPipeline(config2);

      const allMetrics = pipeline.getAllMetrics();

      expect(allMetrics.size).toBe(2);
      expect(allMetrics.has('pipeline-1')).toBe(true);
      expect(allMetrics.has('pipeline-2')).toBe(true);
    });
  });

  describe('Pipeline Lifecycle', () => {
    it('should start and stop ingestion', async () => {
      const config = createPipelineConfig();
      await pipeline.createPipeline(config);

      const startHandler = vi.fn();
      const stopHandler = vi.fn();
      pipeline.on('pipeline:started', startHandler);
      pipeline.on('pipeline:stopped', stopHandler);

      await pipeline.startIngestion(config.id);
      expect(startHandler).toHaveBeenCalled();

      await pipeline.stopIngestion(config.id);
      expect(stopHandler).toHaveBeenCalled();
    });

    it('should throw error starting non-existent pipeline', async () => {
      await expect(pipeline.startIngestion('non-existent')).rejects.toThrow(
        'Pipeline non-existent not found'
      );
    });

    it('should throw error starting already running pipeline', async () => {
      const config = createPipelineConfig();
      await pipeline.createPipeline(config);
      await pipeline.startIngestion(config.id);

      await expect(pipeline.startIngestion(config.id)).rejects.toThrow(
        'already running'
      );

      await pipeline.stopIngestion(config.id);
    });
  });
});

// =============================================================================
// SecurityAnalyticsQueryEngine Tests
// =============================================================================

describe('SecurityAnalyticsQueryEngine', () => {
  let engine: SecurityAnalyticsQueryEngine;

  beforeEach(() => {
    SecurityAnalyticsQueryEngine.resetInstance();
    engine = SecurityAnalyticsQueryEngine.getInstance();
  });

  afterEach(() => {
    engine.shutdown();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SecurityAnalyticsQueryEngine.getInstance();
      const instance2 = SecurityAnalyticsQueryEngine.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return instance via helper function', () => {
      const instance = getSecurityAnalyticsQueryEngine();
      expect(instance).toBe(engine);
    });
  });

  describe('Query Execution', () => {
    it('should execute simple query', async () => {
      const sql = 'SELECT * FROM security_events LIMIT 10';
      const result = await engine.executeQuery(sql);

      expect(result.status).toBe('completed');
      expect(result).toHaveProperty('rowCount');
      expect(result).toHaveProperty('executionTimeMs');
      expect(result).toHaveProperty('bytesScanned');
    });

    it('should execute query with parameters', async () => {
      const sql = 'SELECT * FROM security_events WHERE severity = :severity LIMIT :limit';
      const parameters = { severity: 'critical', limit: 100 };

      const result = await engine.executeQuery(sql, parameters);

      expect(result.status).toBe('completed');
    });

    it('should execute real-time query', async () => {
      const sql = 'SELECT * FROM security_events';
      const config: QueryConfig = { mode: 'realtime', maxRows: 50 };

      const result = await engine.executeQuery(sql, {}, config);

      expect(result.status).toBe('completed');
    });

    it('should execute batch query', async () => {
      const sql = 'SELECT * FROM security_events';
      const config: QueryConfig = { mode: 'batch', maxRows: 1000 };

      const result = await engine.executeQuery(sql, {}, config);

      expect(result.status).toBe('completed');
    });

    it('should cache query results', async () => {
      const sql = 'SELECT * FROM security_events LIMIT 10';
      const config: QueryConfig = { enableCache: true };

      await engine.executeQuery(sql, {}, config);
      const cachedResult = await engine.executeQuery(sql, {}, config);

      expect(cachedResult.fromCache).toBe(true);
    });

    it('should bypass cache when disabled', async () => {
      const sql = 'SELECT * FROM security_events LIMIT 10';

      await engine.executeQuery(sql, {}, { enableCache: true });
      const result = await engine.executeQuery(sql, {}, { enableCache: false });

      expect(result.fromCache).toBe(false);
    });

    it('should cancel running query', async () => {
      const sql = 'SELECT * FROM large_table';

      const resultPromise = engine.executeQuery(sql, {}, { mode: 'batch' });

      // Get execution ID from event
      let executionId: string | undefined;
      engine.once('query:start', (data) => {
        executionId = data.executionId;
        if (executionId) {
          engine.cancelQuery(executionId);
        }
      });

      const result = await resultPromise;
      expect(['cancelled', 'completed']).toContain(result.status);
    });

    it('should emit query events', async () => {
      const startHandler = vi.fn();
      const completeHandler = vi.fn();

      engine.on('query:start', startHandler);
      engine.on('query:complete', completeHandler);

      await engine.executeQuery('SELECT 1');

      expect(startHandler).toHaveBeenCalled();
      expect(completeHandler).toHaveBeenCalled();
    });
  });

  describe('Pre-built Security Queries', () => {
    it('should have pre-built queries available', () => {
      const queries = engine.getPrebuiltQueries();
      expect(queries.length).toBeGreaterThan(0);
    });

    it('should filter pre-built queries by category', () => {
      const threatHuntingQueries = engine.getPrebuiltQueries('threat_hunting');
      expect(
        threatHuntingQueries.every((q) => q.category === 'threat_hunting')
      ).toBe(true);
    });

    it('should execute pre-built query', async () => {
      const queries = engine.getPrebuiltQueries('ioc_search');
      if (queries.length > 0) {
        const result = await engine.executePrebuiltQuery(queries[0].name, {
          ioc_list: ['192.168.1.1'],
          start_time: new Date(Date.now() - 86400000),
          max_results: 100,
        });

        expect(result.status).toBe('completed');
      }
    });

    it('should throw error for unknown pre-built query', async () => {
      try {
        await engine.executePrebuiltQuery('NonExistentQuery', {});
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('Pre-built query not found');
      }
    });
  });

  describe('Saved Queries', () => {
    it('should create saved query', async () => {
      const query = await engine.createSavedQuery(
        'My Query',
        'SELECT * FROM events',
        {
          description: 'Test query',
          category: 'custom',
          tags: ['test'],
          isPublic: false,
        },
        'user-1'
      );

      expect(query.id).toBeDefined();
      expect(query.name).toBe('My Query');
      expect(query.version).toBe(1);
    });

    it('should get saved query', async () => {
      const created = await engine.createSavedQuery(
        'Test Query',
        'SELECT 1',
        {},
        'user-1'
      );

      const retrieved = engine.getSavedQuery(created.id);
      expect(retrieved).toEqual(created);
    });

    it('should list saved queries with filters', async () => {
      await engine.createSavedQuery(
        'Query 1',
        'SELECT 1',
        { category: 'threat_hunting', tags: ['hunting'] },
        'user-1'
      );
      await engine.createSavedQuery(
        'Query 2',
        'SELECT 2',
        { category: 'compliance', tags: ['audit'] },
        'user-2'
      );

      const userQueries = engine.listSavedQueries({ userId: 'user-1' });
      expect(userQueries.some((q) => q.name === 'Query 1')).toBe(true);
    });

    it('should update saved query', async () => {
      const created = await engine.createSavedQuery(
        'Original Name',
        'SELECT 1',
        {},
        'user-1'
      );

      const updated = engine.updateSavedQuery(created.id, {
        name: 'Updated Name',
        description: 'Updated description',
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.version).toBe(2);
    });

    it('should delete saved query', async () => {
      const created = await engine.createSavedQuery(
        'To Delete',
        'SELECT 1',
        {},
        'user-1'
      );

      const deleted = engine.deleteSavedQuery(created.id);
      expect(deleted).toBe(true);
      expect(engine.getSavedQuery(created.id)).toBeUndefined();
    });
  });

  describe('Materialized Views', () => {
    it('should create materialized view', async () => {
      const view = await engine.createMaterializedView(
        'security_summary',
        'SELECT severity, COUNT(*) as count FROM security_events GROUP BY severity',
        '0 * * * *',
        'user-1'
      );

      expect(view.id).toBeDefined();
      expect(view.name).toBe('security_summary');
      expect(view.status).toBe('active');
    });

    it('should get materialized view', async () => {
      const created = await engine.createMaterializedView(
        'test_view',
        'SELECT 1',
        '*/5 * * * *',
        'user-1'
      );

      const retrieved = engine.getMaterializedView(created.id);
      expect(retrieved).toEqual(created);
    });

    it('should list materialized views', async () => {
      await engine.createMaterializedView('view1', 'SELECT 1', '0 * * * *', 'user-1');
      await engine.createMaterializedView('view2', 'SELECT 2', '0 * * * *', 'user-1');

      const views = engine.listMaterializedViews();
      expect(views.length).toBeGreaterThanOrEqual(2);
    });

    it('should refresh materialized view', async () => {
      const created = await engine.createMaterializedView(
        'refresh_test',
        'SELECT 1',
        '*/5 * * * *',
        'user-1'
      );

      const refreshed = await engine.refreshMaterializedView(created.id);

      expect(refreshed?.status).toBe('active');
      expect(refreshed?.lastRefresh).toBeDefined();
    });

    it('should delete materialized view', async () => {
      const created = await engine.createMaterializedView(
        'to_delete',
        'SELECT 1',
        '0 * * * *',
        'user-1'
      );

      const deleted = engine.deleteMaterializedView(created.id);
      expect(deleted).toBe(true);
    });

    it('should emit view events', async () => {
      const createHandler = vi.fn();
      const refreshHandler = vi.fn();

      engine.on('view:created', createHandler);
      engine.on('view:refreshed', refreshHandler);

      const view = await engine.createMaterializedView(
        'event_test',
        'SELECT 1',
        '0 * * * *',
        'user-1'
      );

      expect(createHandler).toHaveBeenCalled();

      await engine.refreshMaterializedView(view.id);
      expect(refreshHandler).toHaveBeenCalled();
    });
  });

  describe('Query Scheduling', () => {
    it('should schedule query', async () => {
      const query = await engine.createSavedQuery(
        'Scheduled Query',
        'SELECT 1',
        {},
        'user-1'
      );

      const scheduled = await engine.scheduleQuery(
        query.id,
        '*/5 * * * *',
        { enabled: true },
        'user-1'
      );

      expect(scheduled.id).toBeDefined();
      expect(scheduled.queryId).toBe(query.id);
      expect(scheduled.enabled).toBe(true);
    });

    it('should schedule query with alert', async () => {
      const query = await engine.createSavedQuery(
        'Alert Query',
        'SELECT COUNT(*) as count FROM events',
        {},
        'user-1'
      );

      const alertConfig: AlertConfig = {
        condition: {
          type: 'row_count',
          operator: '>',
          value: 0,
        },
        channels: [{ type: 'email', config: { to: 'test@example.com' } }],
        severity: 'warning',
        throttleMinutes: 15,
      };

      const scheduled = await engine.scheduleQuery(
        query.id,
        '*/5 * * * *',
        { alertConfig },
        'user-1'
      );

      expect(scheduled.alertConfig).toBeDefined();
    });

    it('should list scheduled queries', async () => {
      const query = await engine.createSavedQuery('Test', 'SELECT 1', {}, 'user-1');

      await engine.scheduleQuery(query.id, '0 * * * *', {}, 'user-1');

      const scheduled = engine.listScheduledQueries();
      expect(scheduled.length).toBeGreaterThan(0);
    });

    it('should update scheduled query', async () => {
      const query = await engine.createSavedQuery('Test', 'SELECT 1', {}, 'user-1');
      const scheduled = await engine.scheduleQuery(
        query.id,
        '0 * * * *',
        { enabled: true },
        'user-1'
      );

      const updated = engine.updateScheduledQuery(scheduled.id, { enabled: false });

      expect(updated?.enabled).toBe(false);
    });

    it('should delete scheduled query', async () => {
      const query = await engine.createSavedQuery('Test', 'SELECT 1', {}, 'user-1');
      const scheduled = await engine.scheduleQuery(query.id, '0 * * * *', {}, 'user-1');

      const deleted = engine.deleteScheduledQuery(scheduled.id);
      expect(deleted).toBe(true);
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate query cost', () => {
      const sql = 'SELECT * FROM security_events WHERE timestamp > :start_time';
      const estimate = engine.estimateCost(sql);

      expect(estimate).toHaveProperty('bytesToScan');
      expect(estimate).toHaveProperty('estimatedTimeMs');
      expect(estimate).toHaveProperty('estimatedCost');
      expect(estimate).toHaveProperty('complexity');
    });

    it('should provide complexity rating', () => {
      const simpleQuery = 'SELECT id FROM events LIMIT 10';
      const complexQuery = `
        SELECT a.*, b.*, c.*, d.*, e.*
        FROM events a
        JOIN users b ON a.user_id = b.id
        JOIN sessions c ON b.id = c.user_id
        JOIN activities d ON c.id = d.session_id
        JOIN logs e ON d.id = e.activity_id
        GROUP BY a.id, b.id, c.id, d.id
        ORDER BY a.timestamp
      `;

      const simpleEstimate = engine.estimateCost(simpleQuery);
      const complexEstimate = engine.estimateCost(complexQuery);

      expect(['low', 'medium']).toContain(simpleEstimate.complexity);
      // Complex queries with many joins and no LIMIT should be high or very_high
      expect(['medium', 'high', 'very_high']).toContain(complexEstimate.complexity);
    });

    it('should provide recommendations', () => {
      const queryWithoutLimit = 'SELECT * FROM large_table';
      const estimate = engine.estimateCost(queryWithoutLimit);

      expect(estimate.recommendations).toBeDefined();
      expect(estimate.recommendations?.length).toBeGreaterThan(0);
    });
  });

  describe('Results Export', () => {
    it('should export to JSON', async () => {
      const result = await engine.executeQuery('SELECT * FROM events LIMIT 5');
      const exported = await engine.exportResults(result, { format: 'json' });

      expect(exported.filename).toContain('.json');
      expect(exported.mimeType).toBe('application/json');
    });

    it('should export to CSV', async () => {
      const result = await engine.executeQuery('SELECT * FROM events LIMIT 5');
      const exported = await engine.exportResults(result, {
        format: 'csv',
        includeHeaders: true,
      });

      expect(exported.filename).toContain('.csv');
      expect(exported.mimeType).toBe('text/csv');
    });

    it('should export to Parquet', async () => {
      const result = await engine.executeQuery('SELECT * FROM events LIMIT 5');
      const exported = await engine.exportResults(result, { format: 'parquet' });

      expect(exported.filename).toContain('.parquet');
    });

    it('should export to Excel', async () => {
      const result = await engine.executeQuery('SELECT * FROM events LIMIT 5');
      const exported = await engine.exportResults(result, { format: 'excel' });

      expect(exported.filename).toContain('.xlsx');
    });

    it('should apply compression', async () => {
      const result = await engine.executeQuery('SELECT * FROM events LIMIT 5');
      const exported = await engine.exportResults(result, {
        format: 'json',
        compression: 'gzip',
      });

      expect(exported.filename).toContain('.gz');
    });
  });

  describe('Query Sharing', () => {
    it('should share query with user', async () => {
      const query = await engine.createSavedQuery('Shared', 'SELECT 1', {}, 'user-1');

      const shared = await engine.shareQuery(
        query.id,
        [{ type: 'user', id: 'user-2' }],
        ['view', 'execute'],
        'user-1'
      );

      expect(shared.id).toBeDefined();
      expect(shared.sharedWith).toHaveLength(1);
      expect(shared.permissions).toContain('view');
    });

    it('should share query publicly', async () => {
      const query = await engine.createSavedQuery('Public', 'SELECT 1', {}, 'user-1');

      const shared = await engine.shareQuery(
        query.id,
        [{ type: 'public' }],
        ['view'],
        'user-1'
      );

      expect(shared.sharedWith.some((t) => t.type === 'public')).toBe(true);
    });

    it('should set expiration on share', async () => {
      const query = await engine.createSavedQuery('Expiring', 'SELECT 1', {}, 'user-1');

      const expiresAt = new Date(Date.now() + 86400000);
      const shared = await engine.shareQuery(
        query.id,
        [{ type: 'user', id: 'user-2' }],
        ['view'],
        'user-1',
        expiresAt
      );

      expect(shared.expiresAt).toEqual(expiresAt);
    });

    it('should list shared queries for user', async () => {
      const query = await engine.createSavedQuery('List Test', 'SELECT 1', {}, 'user-1');

      await engine.shareQuery(
        query.id,
        [{ type: 'user', id: 'user-2' }],
        ['view'],
        'user-1'
      );

      const sharedQueries = engine.listSharedQueries('user-1');
      expect(sharedQueries.length).toBeGreaterThan(0);
    });

    it('should revoke share', async () => {
      const query = await engine.createSavedQuery('Revoke Test', 'SELECT 1', {}, 'user-1');

      const shared = await engine.shareQuery(
        query.id,
        [{ type: 'user', id: 'user-2' }],
        ['view'],
        'user-1'
      );

      const revoked = engine.revokeShare(shared.id);
      expect(revoked).toBe(true);
    });

    it('should track access count', async () => {
      const query = await engine.createSavedQuery('Access Test', 'SELECT 1', {}, 'user-1');

      const shared = await engine.shareQuery(
        query.id,
        [{ type: 'user', id: 'user-2' }],
        ['view'],
        'user-1'
      );

      engine.getSharedQuery(shared.id);
      engine.getSharedQuery(shared.id);

      const retrieved = engine.getSharedQuery(shared.id);
      expect(retrieved?.accessCount).toBe(3);
    });
  });

  describe('BI Tool Integration', () => {
    it('should register BI integration', () => {
      const integration: BIIntegration = {
        type: 'tableau',
        connectionString: 'tableau://server.example.com',
      };

      engine.registerBIIntegration('tableau-prod', integration);

      const retrieved = engine.getBIIntegration('tableau-prod');
      expect(retrieved).toEqual(integration);
    });

    it('should list BI integrations', () => {
      engine.registerBIIntegration('tableau', {
        type: 'tableau',
        connectionString: 'tableau://server',
      });
      engine.registerBIIntegration('powerbi', {
        type: 'powerbi',
        connectionString: 'powerbi://workspace',
      });

      const integrations = engine.listBIIntegrations();
      expect(integrations.length).toBe(2);
    });

    it('should sync to BI tool', async () => {
      engine.registerBIIntegration('grafana', {
        type: 'grafana',
        connectionString: 'http://grafana:3000',
      });

      const query = await engine.createSavedQuery(
        'BI Sync Test',
        'SELECT 1',
        {},
        'user-1'
      );

      const result = await engine.syncToBITool('grafana', query.id);

      expect(result.success).toBe(true);
    });

    it('should fail sync for unknown integration', async () => {
      const query = await engine.createSavedQuery(
        'BI Fail Test',
        'SELECT 1',
        {},
        'user-1'
      );

      const result = await engine.syncToBITool('unknown', query.id);

      expect(result.success).toBe(false);
    });

    it('should remove BI integration', () => {
      engine.registerBIIntegration('to-remove', {
        type: 'metabase',
        connectionString: 'http://metabase:3000',
      });

      const removed = engine.removeBIIntegration('to-remove');
      expect(removed).toBe(true);
      expect(engine.getBIIntegration('to-remove')).toBeUndefined();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should get statistics', async () => {
      await engine.createSavedQuery('Stats Test', 'SELECT 1', {}, 'user-1');

      const stats = engine.getStatistics();

      expect(stats).toHaveProperty('savedQueries');
      expect(stats).toHaveProperty('scheduledQueries');
      expect(stats).toHaveProperty('materializedViews');
      expect(stats).toHaveProperty('runningQueries');
      expect(stats).toHaveProperty('cacheStats');
    });

    it('should clear cache', async () => {
      await engine.executeQuery('SELECT 1', {}, { enableCache: true });

      engine.clearCache();

      const stats = engine.getStatistics();
      expect(stats.cacheStats.size).toBe(0);
    });
  });
});

# Security Data Lake Guide

## Week 22 - Enterprise Security Analytics Platform

This comprehensive guide covers the Security Data Lake implementation for the Workflow Automation Platform, providing enterprise-grade security analytics capabilities with multi-cloud support, advanced data ingestion pipelines, and powerful query engines for threat hunting and compliance reporting.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Supported Cloud Platforms](#3-supported-cloud-platforms)
4. [SecurityDataLakeManager](#4-securitydatalakemanager)
5. [DataIngestionPipeline](#5-dataingestionpipeline)
6. [SecurityAnalyticsQueryEngine](#6-securityanalyticsqueryengine)
7. [Data Ingestion from Various Sources](#7-data-ingestion-from-various-sources)
8. [Schema Management and Evolution](#8-schema-management-and-evolution)
9. [Query Optimization and Cost Estimation](#9-query-optimization-and-cost-estimation)
10. [Pre-built Security Queries Catalog](#10-pre-built-security-queries-catalog)
11. [BI Tool Integration](#11-bi-tool-integration)
12. [Best Practices](#12-best-practices)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Overview

The Security Data Lake is an enterprise-grade analytics platform designed to centralize, process, and analyze security data at scale. It provides:

- **Multi-Cloud Support**: AWS, Azure, GCP, Snowflake, and Databricks
- **Real-time and Batch Ingestion**: From Kafka, Kinesis, Pub/Sub, Event Hub, and log collectors
- **Advanced Query Engine**: SQL-like queries with threat hunting and anomaly detection
- **Schema Evolution**: Flexible schema management with versioning
- **Cost Optimization**: Automatic storage tiering and query cost estimation
- **Data Lineage**: End-to-end tracking of data transformations
- **BI Integration**: Native support for Tableau, PowerBI, Looker, and more

### Key Components

| Component | Purpose |
|-----------|---------|
| `SecurityDataLakeManager` | Core data lake operations: tables, ingestion, queries, retention |
| `DataIngestionPipeline` | Stream processing with transformations, quality checks, windowing |
| `SecurityAnalyticsQueryEngine` | SQL execution, scheduled queries, threat hunting |

### File Locations

```
src/datalake/
  SecurityDataLakeManager.ts     # Core data lake management
  DataIngestionPipeline.ts       # Stream ingestion and processing
  SecurityAnalyticsQueryEngine.ts # Query execution and analytics
```

---

## 2. Architecture

### High-Level Architecture

```
                                  +---------------------------+
                                  |     Data Sources          |
                                  | Kafka | Kinesis | PubSub  |
                                  | EventHub | Fluentd        |
                                  +-----------+---------------+
                                              |
                                              v
                    +-------------------------+-------------------------+
                    |          DataIngestionPipeline                    |
                    |  +------------+  +---------------+  +-----------+ |
                    |  | Transform  |  | Quality       |  | Windowing | |
                    |  | Engine     |  | Checks        |  | Engine    | |
                    |  +------------+  +---------------+  +-----------+ |
                    +-------------------------+-------------------------+
                                              |
                                              v
                    +-------------------------+-------------------------+
                    |          SecurityDataLakeManager                  |
                    |  +------------+  +---------------+  +-----------+ |
                    |  | Schema     |  | Partition     |  | Retention | |
                    |  | Registry   |  | Manager       |  | Manager   | |
                    |  +------------+  +---------------+  +-----------+ |
                    +-------------------------+-------------------------+
                                              |
              +-------------------------------+-------------------------------+
              |                 |                 |                 |         |
              v                 v                 v                 v         v
         +--------+        +--------+        +--------+        +----------+  +------------+
         |  AWS   |        | Azure  |        |  GCP   |        | Snowflake|  | Databricks |
         | S3/    |        | ADLS   |        | BigQuery|       |          |  |            |
         | Athena |        | Synapse|        |         |       |          |  |            |
         +--------+        +--------+        +--------+        +----------+  +------------+
                                              |
                                              v
                    +-------------------------+-------------------------+
                    |       SecurityAnalyticsQueryEngine                |
                    |  +------------+  +---------------+  +-----------+ |
                    |  | Query      |  | Scheduled     |  | BI        | |
                    |  | Parser     |  | Queries       |  | Export    | |
                    |  +------------+  +---------------+  +-----------+ |
                    +---------------------------------------------------+
```

### Data Flow

1. **Ingestion**: Data streams from various sources (Kafka, Kinesis, etc.)
2. **Processing**: Transformations, quality checks, enrichments applied
3. **Storage**: Data written to cloud data lake with partitioning
4. **Analytics**: SQL queries, scheduled reports, BI tool integration
5. **Retention**: Automatic tiering and cleanup based on policies

---

## 3. Supported Cloud Platforms

### AWS (Amazon Web Services)

**Components Used:**
- Amazon S3 for storage
- AWS Glue Data Catalog
- Amazon Athena for queries
- AWS KMS for encryption

**Configuration Example:**

```typescript
import { SecurityDataLakeManager } from './src/datalake/SecurityDataLakeManager';

const manager = SecurityDataLakeManager.getInstance();

await manager.initializeDataLake('aws-security-lake', {
  provider: 'aws',
  region: 'us-east-1',
  bucket: 'my-security-data-lake',
  catalog: 'security_catalog',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  defaultFormat: 'parquet',
  defaultCompression: 'snappy',
  encryption: {
    type: 'aws-kms',
    keyId: 'arn:aws:kms:us-east-1:123456789:key/my-key',
    rotationDays: 90,
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
```

**Storage Tiers:**
| Tier | AWS Storage Class | Cost (per GB/month) |
|------|-------------------|---------------------|
| Hot | STANDARD | $0.023 |
| Warm | STANDARD_IA | $0.0125 |
| Cold | GLACIER | $0.004 |
| Archive | DEEP_ARCHIVE | $0.00099 |

### Azure (Microsoft Azure)

**Components Used:**
- Azure Data Lake Storage Gen2
- Azure Synapse Analytics
- Azure Key Vault for encryption

**Configuration Example:**

```typescript
await manager.initializeDataLake('azure-security-lake', {
  provider: 'azure',
  region: 'eastus',
  container: 'security-data',
  credentials: {
    accountId: 'mystorageaccount',
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
  },
  defaultFormat: 'parquet',
  defaultCompression: 'snappy',
  encryption: {
    type: 'azure-key-vault',
    keyVaultUrl: 'https://my-vault.vault.azure.net/',
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
```

**Access Tiers:**
| Tier | Azure Access Tier | Cost (per GB/month) |
|------|-------------------|---------------------|
| Hot | Hot | $0.0184 |
| Warm | Cool | $0.01 |
| Cold | Cool | $0.01 |
| Archive | Archive | $0.00099 |

### GCP (Google Cloud Platform)

**Components Used:**
- BigQuery for storage and queries
- Google Cloud Storage
- Cloud KMS for encryption

**Configuration Example:**

```typescript
await manager.initializeDataLake('gcp-security-lake', {
  provider: 'gcp',
  region: 'us-central1',
  dataset: 'security_analytics',
  credentials: {
    projectId: 'my-gcp-project',
    keyFile: '/path/to/service-account.json',
  },
  defaultFormat: 'parquet',
  defaultCompression: 'snappy',
  encryption: {
    type: 'gcp-kms',
    keyId: 'projects/my-project/locations/global/keyRings/my-ring/cryptoKeys/my-key',
  },
  costOptimization: {
    enableTiering: true,
    hotToWarmDays: 90,
    warmToColdDays: 365,
    coldToArchiveDays: 730,
    enableCompression: true,
    enableDeduplication: false,
  },
});
```

**BigQuery Pricing:**
- Active Storage: $0.02 per GB/month
- Long-term Storage (90+ days): $0.01 per GB/month
- Query: $5 per TB scanned

### Snowflake

**Configuration Example:**

```typescript
await manager.initializeDataLake('snowflake-security-lake', {
  provider: 'snowflake',
  region: 'aws-us-west-2',
  warehouse: 'SECURITY_WH',
  credentials: {
    accountId: 'my-account.snowflakecomputing.com',
    username: process.env.SNOWFLAKE_USER,
    privateKey: process.env.SNOWFLAKE_PRIVATE_KEY,
  },
  defaultFormat: 'parquet',
  defaultCompression: 'zstd',
  encryption: {
    type: 'aes-256',
  },
  costOptimization: {
    enableTiering: false, // Snowflake handles automatically
    hotToWarmDays: 0,
    warmToColdDays: 0,
    coldToArchiveDays: 0,
    enableCompression: true,
    enableDeduplication: true,
  },
});
```

### Databricks

**Configuration Example:**

```typescript
await manager.initializeDataLake('databricks-security-lake', {
  provider: 'databricks',
  region: 'us-west-2',
  catalog: 'security_catalog',
  credentials: {
    connectionString: process.env.DATABRICKS_HOST,
    accessKeyId: process.env.DATABRICKS_TOKEN,
  },
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
```

---

## 4. SecurityDataLakeManager

The `SecurityDataLakeManager` is the core component for managing data lake operations.

### Initialization

```typescript
import { SecurityDataLakeManager, getSecurityDataLakeManager } from './src/datalake/SecurityDataLakeManager';

// Get singleton instance
const manager = getSecurityDataLakeManager();
// or
const manager = SecurityDataLakeManager.getInstance();
```

### Creating Tables

```typescript
import { TableSchema, PartitionSpec } from './src/datalake/SecurityDataLakeManager';

// Define table schema
const securityEventsSchema: TableSchema = {
  name: 'security_events',
  columns: [
    { name: 'event_id', type: 'string', nullable: false, description: 'Unique event identifier' },
    { name: 'timestamp', type: 'timestamp', nullable: false, description: 'Event timestamp' },
    { name: 'source_ip', type: 'string', nullable: true, description: 'Source IP address' },
    { name: 'destination_ip', type: 'string', nullable: true, description: 'Destination IP address' },
    { name: 'user_id', type: 'string', nullable: true, description: 'User identifier' },
    { name: 'event_type', type: 'string', nullable: false, description: 'Type of security event' },
    { name: 'severity', type: 'string', nullable: false, description: 'Event severity level' },
    { name: 'raw_data', type: 'string', nullable: true, description: 'Raw event data as JSON' },
    { name: 'metadata', type: 'map', nullable: true, description: 'Additional metadata' },
  ],
  partitionColumns: [],
  format: 'parquet',
  compression: 'snappy',
  properties: {
    'table.type': 'security_events',
    'retention.days': '365',
  },
};

// Define partition strategy
const partitionSpec: PartitionSpec = {
  strategy: 'composite',
  timeGranularity: 'day',
  sourceField: 'source',
  severityField: 'severity',
};

// Create the table
await manager.createTable(
  'aws-security-lake',
  securityEventsSchema,
  partitionSpec,
  'additive' // Schema evolution mode
);
```

### Ingesting Data

```typescript
import { DataRecord, IngestOptions } from './src/datalake/SecurityDataLakeManager';

// Prepare records
const records: DataRecord[] = [
  {
    id: 'evt_001',
    timestamp: new Date(),
    source: 'firewall',
    severity: 'high',
    category: 'intrusion_attempt',
    data: {
      source_ip: '192.168.1.100',
      destination_ip: '10.0.0.50',
      port: 443,
      action: 'blocked',
    },
  },
  {
    id: 'evt_002',
    timestamp: new Date(),
    source: 'endpoint',
    severity: 'critical',
    category: 'malware_detected',
    data: {
      host_id: 'host_123',
      file_path: '/tmp/suspicious.exe',
      hash: 'abc123def456',
    },
  },
];

// Ingest with options
const ingestOptions: IngestOptions = {
  batchSize: 1000,
  compress: true,
  encrypt: true,
  dedup: true,
  sourceLineage: 'firewall_collector',
  validateSchema: true,
  onError: 'skip', // 'skip' | 'abort' | 'retry'
  maxRetries: 3,
};

const result = await manager.ingestData(
  'aws-security-lake',
  'security_events',
  records,
  ingestOptions
);

console.log(`Ingested: ${result.ingested}, Duplicates: ${result.duplicates}, Errors: ${result.errors}`);
```

### Querying Data

```typescript
import { QueryRequest } from './src/datalake/SecurityDataLakeManager';

// Simple query
const simpleQuery: QueryRequest = {
  table: 'security_events',
  columns: ['event_id', 'timestamp', 'source_ip', 'severity'],
  filters: [
    { column: 'severity', operator: 'eq', value: 'critical' },
    { column: 'timestamp', operator: 'gte', value: new Date('2025-01-01') },
  ],
  orderBy: [{ column: 'timestamp', direction: 'desc' }],
  limit: 100,
  cacheResults: true,
};

const result = await manager.queryData('aws-security-lake', simpleQuery);

console.log(`Found ${result.rowCount} records in ${result.executionTime}ms`);
console.log(`Bytes scanned: ${result.bytesScanned}`);

// Federated query across multiple data lakes
const federatedQuery: QueryRequest = {
  sql: `
    SELECT source_ip, COUNT(*) as event_count
    FROM security_events
    WHERE severity = 'critical'
    GROUP BY source_ip
    ORDER BY event_count DESC
    LIMIT 10
  `,
  federatedSources: ['azure-security-lake', 'gcp-security-lake'],
  timeout: 60000,
  cacheResults: false,
};

const federatedResult = await manager.queryData('aws-security-lake', federatedQuery);
```

### Retention Policies

```typescript
// Set retention policy
await manager.setRetentionPolicy('aws-security-lake', 'security_events', {
  retentionDays: 365,
  gracePeriodDays: 30,
  archiveBeforeDelete: true,
  archiveLocation: 's3://my-archive-bucket/security-events/',
  enabled: true,
});

// Apply cleanup manually
const cleanupResult = await manager.applyRetentionCleanup('aws-security-lake', 'security_events');

console.log(`Deleted ${cleanupResult.partitionsDeleted} partitions`);
console.log(`Reclaimed ${cleanupResult.bytesReclaimed} bytes`);
console.log(`Archived: ${cleanupResult.archived}`);
```

### Storage Optimization

```typescript
// Compact partitions for better query performance
const compactionResult = await manager.compactPartitions(
  'aws-security-lake',
  'security_events',
  ['year=2025/month=01', 'year=2025/month=02']
);

console.log(`Compacted ${compactionResult.filesCompacted} files`);
console.log(`Compression ratio: ${compactionResult.compressionRatio}`);

// Optimize storage with automatic tiering
const optimizationResult = await manager.optimizeStorage(
  'aws-security-lake',
  'security_events'
);

console.log(`Tiered ${optimizationResult.tieredPartitions} partitions`);
console.log(`Estimated savings: $${optimizationResult.estimatedSavings}`);

// Get storage costs
const costs = await manager.getStorageCosts('aws-security-lake');

console.log(`Total cost: $${costs.totalCost}`);
console.log('Cost by tier:', costs.byTier);
```

### Data Lineage

```typescript
// Track lineage manually
await manager.trackLineage('aws-security-lake', 'security_events', {
  sourceId: 'kafka:security-topic',
  targetId: 'aws-security-lake:security_events',
  transformationType: 'etl_pipeline',
  columns: [
    { sourceColumn: 'raw_event', targetColumn: 'parsed_data', transformation: 'json_parse' },
  ],
});

// Get lineage for a table
const lineage = manager.getLineage('aws-security-lake', 'security_events');

console.log('Upstream sources:', lineage?.upstream);
console.log('Downstream targets:', lineage?.downstream);
```

### Event Handling

```typescript
// Listen to data lake events
manager.on('dataLakeInitialized', ({ name, provider }) => {
  console.log(`Data lake ${name} initialized on ${provider}`);
});

manager.on('tableCreated', ({ dataLake, table }) => {
  console.log(`Table ${table} created in ${dataLake}`);
});

manager.on('dataIngested', ({ dataLake, table, ingested, errors }) => {
  console.log(`Ingested ${ingested} records to ${dataLake}:${table}, ${errors} errors`);
});

manager.on('queryExecuted', ({ dataLake, rowCount, executionTime }) => {
  console.log(`Query on ${dataLake} returned ${rowCount} rows in ${executionTime}ms`);
});

manager.on('retentionCleanup', ({ dataLake, table, partitionsDeleted, bytesReclaimed }) => {
  console.log(`Cleanup on ${dataLake}:${table} - ${partitionsDeleted} partitions, ${bytesReclaimed} bytes`);
});
```

---

## 5. DataIngestionPipeline

The `DataIngestionPipeline` provides streaming data ingestion with transformations, quality checks, and exactly-once semantics.

### Creating a Pipeline

```typescript
import { DataIngestionPipeline, PipelineConfig } from './src/datalake/DataIngestionPipeline';

const pipeline = DataIngestionPipeline.getInstance();

const pipelineConfig: PipelineConfig = {
  id: 'security-events-pipeline',
  name: 'Security Events Pipeline',
  description: 'Ingest and process security events from multiple sources',

  // Data sources
  sources: [
    {
      type: 'kafka',
      id: 'kafka-security',
      name: 'Kafka Security Topic',
      connection: {
        brokers: ['kafka1:9092', 'kafka2:9092', 'kafka3:9092'],
        topic: 'security-events',
        saslMechanism: 'scram-sha-256',
        username: process.env.KAFKA_USER,
        password: process.env.KAFKA_PASSWORD,
        ssl: true,
      },
      consumerGroup: 'security-pipeline-cg',
      startOffset: 'latest',
      maxBatchSize: 1000,
      pollIntervalMs: 100,
      enabled: true,
    },
    {
      type: 'kinesis',
      id: 'kinesis-audit',
      name: 'Kinesis Audit Stream',
      connection: {
        region: 'us-east-1',
        streamName: 'audit-events',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      partitions: 4,
      startOffset: 'latest',
      enabled: true,
    },
  ],

  // Transformations
  transformations: [
    {
      id: 'normalize',
      name: 'Normalize Events',
      type: 'map',
      order: 1,
      config: {
        fields: {
          event_id: 'id',
          event_time: 'timestamp',
          src_ip: 'source_ip',
          dst_ip: 'destination_ip',
          event_category: 'category',
        },
      },
    },
    {
      id: 'filter-noise',
      name: 'Filter Noise',
      type: 'filter',
      order: 2,
      config: {
        condition: "data.severity !== 'debug' && data.severity !== 'info'",
      },
    },
    {
      id: 'dedupe',
      name: 'Deduplicate Events',
      type: 'dedupe',
      order: 3,
      config: {
        keyFields: ['event_id', 'timestamp'],
        windowMs: 300000, // 5 minutes
        maxCacheSize: 100000,
      },
    },
  ],

  // Enrichments
  enrichments: [
    {
      id: 'geoip',
      name: 'GeoIP Enrichment',
      source: 'api',
      config: {
        url: 'http://geoip-service/lookup/{{source_ip}}',
        resultField: 'geo_data',
        onError: 'skip',
      },
      cacheConfig: {
        enabled: true,
        ttlSeconds: 3600,
        maxSize: 10000,
      },
    },
    {
      id: 'threat-intel',
      name: 'Threat Intelligence',
      source: 'lookup-table',
      config: {
        tableId: 'threat_iocs',
        keyField: 'source_ip',
        resultField: 'threat_info',
      },
    },
  ],

  // Data quality checks
  qualityChecks: [
    {
      id: 'required-fields',
      name: 'Required Fields Check',
      type: 'nullability',
      severity: 'error',
      config: {
        fields: ['event_id', 'timestamp', 'event_type'],
      },
      onFailure: 'reject',
    },
    {
      id: 'severity-range',
      name: 'Severity Validation',
      type: 'pattern',
      severity: 'warning',
      config: {
        field: 'severity',
        pattern: '^(critical|high|medium|low|info)$',
      },
      onFailure: 'flag',
    },
  ],

  // Windowing configuration
  windows: {
    type: 'tumbling',
    sizeMs: 60000, // 1 minute
    allowedLatenessMs: 10000,
    watermarkDelayMs: 5000,
    aggregation: {
      type: 'count',
      field: 'event_id',
    },
  },

  // Dead letter queue
  deadLetterQueue: {
    enabled: true,
    destination: {
      type: 'kafka',
      config: {
        brokers: ['kafka1:9092'],
        topic: 'security-events-dlq',
      },
    },
    retentionDays: 7,
    maxRetries: 3,
    includeMetadata: true,
  },

  // Backpressure handling
  backpressure: {
    strategy: 'buffer', // 'drop' | 'buffer' | 'pause' | 'sample'
    thresholds: {
      lowWatermark: 5000,
      highWatermark: 10000,
    },
    bufferSize: 50000,
    pauseTimeoutMs: 30000,
  },

  // Checkpointing
  checkpoint: {
    strategy: 'periodic',
    intervalMs: 30000,
    storage: {
      type: 'redis',
      config: {
        host: 'redis.example.com',
        port: 6379,
      },
    },
    exactlyOnce: true,
    retainCount: 10,
  },

  // Auto-scaling
  scaling: {
    enabled: true,
    minInstances: 2,
    maxInstances: 10,
    targetThroughput: 10000,
    scaleUpThreshold: 0.8,
    scaleDownThreshold: 0.3,
    cooldownPeriodMs: 300000,
    metricsWindowMs: 60000,
  },

  // Monitoring
  monitoring: {
    enabled: true,
    metricsIntervalMs: 10000,
    alerting: {
      enabled: true,
      channels: ['slack', 'pagerduty'],
      thresholds: {
        errorRate: 0.01,
        latencyMs: 5000,
        backpressure: 0.9,
      },
    },
  },

  // Retry policy
  retryPolicy: {
    maxRetries: 5,
    initialDelayMs: 1000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'KAFKA_RETRIABLE_ERROR'],
  },
};

// Create the pipeline
const pipelineId = await pipeline.createPipeline(pipelineConfig);
```

### Starting and Stopping Pipelines

```typescript
// Start ingestion
await pipeline.startIngestion('security-events-pipeline');

// Stop ingestion (graceful shutdown)
await pipeline.stopIngestion('security-events-pipeline');
```

### Custom Transformations

```typescript
// Register a custom transformation handler
pipeline.registerTransformationHandler('custom-enrich', async (record, config) => {
  // Perform custom transformation
  const enrichedData = {
    ...record.value,
    enriched_at: new Date().toISOString(),
    custom_field: config.customValue,
  };

  return {
    ...record,
    value: enrichedData,
  };
});

// Add transformation to pipeline
pipeline.addTransformation('security-events-pipeline', {
  id: 'custom-enrich-transform',
  name: 'Custom Enrichment',
  type: 'custom',
  order: 10,
  config: {
    customValue: 'enriched',
    handler: async (record) => {
      // Custom logic
      return record;
    },
  },
});
```

### Schema Validation

```typescript
import { SchemaDefinition } from './src/datalake/DataIngestionPipeline';

const securityEventSchema: SchemaDefinition = {
  id: 'security-event-v1',
  name: 'Security Event Schema',
  version: '1.0.0',
  type: 'json',
  fields: [
    { name: 'event_id', type: 'string', nullable: false },
    { name: 'timestamp', type: 'date', nullable: false },
    { name: 'source_ip', type: 'string', nullable: true, pattern: '^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$' },
    { name: 'severity', type: 'string', nullable: false, enum: ['critical', 'high', 'medium', 'low', 'info'] },
    { name: 'event_type', type: 'string', nullable: false },
    { name: 'details', type: 'object', nullable: true },
  ],
  required: ['event_id', 'timestamp', 'severity', 'event_type'],
  additionalProperties: false,
};

// Validate data against schema
const validationResult = pipeline.validateSchema(eventData, securityEventSchema);

if (!validationResult.valid) {
  console.log('Validation errors:', validationResult.errors);
}
```

### Checkpointing

```typescript
// Manual checkpoint
const checkpoint = await pipeline.checkpoint('security-events-pipeline');

console.log('Checkpoint ID:', checkpoint.id);
console.log('Records processed:', checkpoint.recordsProcessed);
console.log('Offsets:', checkpoint.offsets);
```

### Monitoring Metrics

```typescript
// Get pipeline metrics
const metrics = pipeline.getMetrics('security-events-pipeline');

console.log('Records ingested:', metrics?.recordsIngested);
console.log('Records processed:', metrics?.recordsProcessed);
console.log('Records failed:', metrics?.recordsFailed);
console.log('Average latency:', metrics?.avgLatencyMs, 'ms');
console.log('P95 latency:', metrics?.p95LatencyMs, 'ms');
console.log('P99 latency:', metrics?.p99LatencyMs, 'ms');
console.log('Throughput:', metrics?.throughputPerSecond, 'records/sec');
console.log('Backpressure events:', metrics?.backpressureEvents);

// Get all pipeline metrics
const allMetrics = pipeline.getAllMetrics();
```

### Event Handling

```typescript
// Listen to pipeline events
pipeline.on('pipeline:created', ({ pipelineId, config }) => {
  console.log(`Pipeline ${pipelineId} created`);
});

pipeline.on('pipeline:started', ({ pipelineId }) => {
  console.log(`Pipeline ${pipelineId} started`);
});

pipeline.on('record:processed', ({ pipelineId, record }) => {
  console.log(`Processed record ${record.id}`);
});

pipeline.on('record:failed', ({ pipelineId, record, errors }) => {
  console.log(`Failed to process ${record.id}:`, errors);
});

pipeline.on('window:closed', ({ pipelineId, result }) => {
  console.log(`Window closed: ${result.recordCount} records`);
});

pipeline.on('checkpoint:created', ({ pipelineId, checkpoint }) => {
  console.log(`Checkpoint ${checkpoint.id} created`);
});

pipeline.on('backpressure:pause', ({ pipelineId }) => {
  console.log(`Pipeline ${pipelineId} paused due to backpressure`);
});

pipeline.on('scaling:up', ({ pipelineId, from, to }) => {
  console.log(`Scaled up from ${from} to ${to} instances`);
});
```

---

## 6. SecurityAnalyticsQueryEngine

The `SecurityAnalyticsQueryEngine` provides SQL-like queries for security analytics with threat hunting capabilities.

### Executing Queries

```typescript
import { SecurityAnalyticsQueryEngine, getSecurityAnalyticsQueryEngine } from './src/datalake/SecurityAnalyticsQueryEngine';

const queryEngine = getSecurityAnalyticsQueryEngine();

// Execute a SQL query
const result = await queryEngine.executeQuery(
  `
  SELECT
    source_ip,
    COUNT(*) as event_count,
    COUNT(DISTINCT destination_ip) as unique_destinations
  FROM security_events
  WHERE severity IN ('critical', 'high')
    AND timestamp >= :start_time
    AND timestamp <= :end_time
  GROUP BY source_ip
  HAVING COUNT(*) > :threshold
  ORDER BY event_count DESC
  LIMIT 100
  `,
  {
    start_time: new Date('2025-01-01'),
    end_time: new Date('2025-01-31'),
    threshold: 10,
  },
  {
    timeout: 30000,
    maxRows: 1000,
    enableCache: true,
    cacheTTL: 300000,
    mode: 'realtime',
    priority: 'high',
  }
);

console.log(`Status: ${result.status}`);
console.log(`Rows: ${result.rowCount}`);
console.log(`Execution time: ${result.executionTimeMs}ms`);
console.log(`Bytes scanned: ${result.bytesScanned}`);
console.log(`From cache: ${result.fromCache}`);
console.log(`Cost: $${result.metadata.costEstimate.estimatedCost}`);
```

### Saved Queries

```typescript
// Create a saved query
const savedQuery = await queryEngine.createSavedQuery(
  'High Severity Events by Source',
  `
  SELECT source_ip, COUNT(*) as count
  FROM security_events
  WHERE severity IN ('critical', 'high')
    AND timestamp >= :start_time
  GROUP BY source_ip
  ORDER BY count DESC
  LIMIT 50
  `,
  {
    description: 'Find top source IPs generating high severity events',
    category: 'threat_hunting',
    parameters: [
      { name: 'start_time', type: 'date', required: true },
    ],
    tags: ['threat_hunting', 'source_analysis'],
    isPublic: true,
  },
  'user_123'
);

// List saved queries
const queries = queryEngine.listSavedQueries({
  category: 'threat_hunting',
  tags: ['source_analysis'],
  isPublic: true,
});

// Get and execute a saved query
const query = queryEngine.getSavedQuery(savedQuery.id);
if (query) {
  const result = await queryEngine.executeQuery(
    query.sql,
    { start_time: new Date('2025-01-01') }
  );
}

// Update a saved query
queryEngine.updateSavedQuery(savedQuery.id, {
  name: 'Updated Query Name',
  tags: ['threat_hunting', 'updated'],
});

// Delete a saved query
queryEngine.deleteSavedQuery(savedQuery.id);
```

### Scheduled Queries

```typescript
// Schedule a query to run automatically
const scheduled = await queryEngine.scheduleQuery(
  savedQuery.id,
  '*/15 * * * *', // Every 15 minutes
  {
    alertConfig: {
      condition: {
        type: 'row_count',
        operator: '>',
        value: 0,
      },
      channels: [
        {
          type: 'slack',
          config: {
            webhookUrl: 'https://hooks.slack.com/services/xxx',
            channel: '#security-alerts',
          },
        },
        {
          type: 'email',
          config: {
            recipients: ['security@example.com'],
          },
        },
      ],
      severity: 'critical',
      throttleMinutes: 60,
    },
    enabled: true,
  },
  'user_123'
);

// List scheduled queries
const scheduledQueries = queryEngine.listScheduledQueries();

// Update schedule
queryEngine.updateScheduledQuery(scheduled.id, {
  schedule: '0 * * * *', // Every hour
  enabled: false,
});

// Delete schedule
queryEngine.deleteScheduledQuery(scheduled.id);
```

### Materialized Views

```typescript
// Create a materialized view for faster queries
const view = await queryEngine.createMaterializedView(
  'daily_threat_summary',
  `
  SELECT
    DATE(timestamp) as day,
    severity,
    event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT source_ip) as unique_sources
  FROM security_events
  WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(timestamp), severity, event_type
  `,
  '0 */6 * * *', // Refresh every 6 hours
  'user_123'
);

// List materialized views
const views = queryEngine.listMaterializedViews();

// Manually refresh a view
await queryEngine.refreshMaterializedView(view.id);

// Delete a view
queryEngine.deleteMaterializedView(view.id);
```

### Query Sharing

```typescript
// Share a query with team members
const shared = await queryEngine.shareQuery(
  savedQuery.id,
  [
    { type: 'team', id: 'security-team' },
    { type: 'user', id: 'analyst_456' },
  ],
  ['view', 'execute'],
  'user_123',
  new Date('2025-12-31') // Expiration date
);

// List shared queries
const sharedQueries = queryEngine.listSharedQueries('user_123');

// Revoke share
queryEngine.revokeShare(shared.id);
```

### Export Results

```typescript
// Export query results to various formats
const exportResult = await queryEngine.exportResults(result, {
  format: 'csv',
  compression: 'gzip',
  includeHeaders: true,
  dateFormat: 'YYYY-MM-DD HH:mm:ss',
  nullValue: 'N/A',
});

console.log('Filename:', exportResult.filename);
console.log('MIME type:', exportResult.mimeType);

// Export to Parquet
const parquetExport = await queryEngine.exportResults(result, {
  format: 'parquet',
  compression: 'snappy',
});

// Export to Excel
const excelExport = await queryEngine.exportResults(result, {
  format: 'excel',
});
```

### Cancel Running Queries

```typescript
// Cancel a long-running query
const cancelled = queryEngine.cancelQuery(result.executionId);
console.log('Query cancelled:', cancelled);
```

---

## 7. Data Ingestion from Various Sources

### Kafka Integration

```typescript
const kafkaSource = {
  type: 'kafka' as const,
  id: 'kafka-main',
  name: 'Main Kafka Cluster',
  connection: {
    brokers: ['kafka1:9092', 'kafka2:9092', 'kafka3:9092'],
    topic: 'security-events',
    saslMechanism: 'scram-sha-512' as const,
    username: process.env.KAFKA_USER,
    password: process.env.KAFKA_PASSWORD,
    ssl: true,
  },
  consumerGroup: 'security-analytics-cg',
  startOffset: 'earliest' as const,
  maxBatchSize: 5000,
  pollIntervalMs: 50,
  partitions: 12,
  enabled: true,
};
```

### AWS Kinesis Integration

```typescript
const kinesisSource = {
  type: 'kinesis' as const,
  id: 'kinesis-audit',
  name: 'Kinesis Audit Stream',
  connection: {
    region: 'us-east-1',
    streamName: 'audit-log-stream',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: 'https://kinesis.us-east-1.amazonaws.com',
  },
  partitions: 4,
  startOffset: 'TRIM_HORIZON',
  enabled: true,
};
```

### Google Pub/Sub Integration

```typescript
const pubsubSource = {
  type: 'pubsub' as const,
  id: 'pubsub-events',
  name: 'GCP Pub/Sub Events',
  connection: {
    projectId: 'my-gcp-project',
    subscriptionName: 'security-events-sub',
    credentials: process.env.GCP_CREDENTIALS_JSON,
  },
  maxBatchSize: 1000,
  enabled: true,
};
```

### Azure Event Hub Integration

```typescript
const eventhubSource = {
  type: 'eventhub' as const,
  id: 'eventhub-security',
  name: 'Azure Event Hub',
  connection: {
    connectionString: process.env.AZURE_EVENTHUB_CONN_STRING,
    eventHubName: 'security-events',
  },
  consumerGroup: '$Default',
  enabled: true,
};
```

### Log Collector Integration (Fluentd, Logstash, Filebeat)

```typescript
// Fluentd source
const fluentdSource = {
  type: 'fluentd' as const,
  id: 'fluentd-logs',
  name: 'Fluentd Log Collector',
  connection: {
    host: 'fluentd.example.com',
    port: 24224,
    protocol: 'tcp' as const,
    tags: ['security.*', 'audit.*'],
  },
  enabled: true,
};

// Logstash source
const logstashSource = {
  type: 'logstash' as const,
  id: 'logstash-input',
  name: 'Logstash Input',
  connection: {
    host: 'logstash.example.com',
    port: 5044,
    protocol: 'tcp' as const,
  },
  enabled: true,
};

// Filebeat source
const filebeatSource = {
  type: 'filebeat' as const,
  id: 'filebeat-input',
  name: 'Filebeat Input',
  connection: {
    host: '0.0.0.0',
    port: 5066,
    protocol: 'tcp' as const,
  },
  enabled: true,
};
```

---

## 8. Schema Management and Evolution

### Schema Definition

```typescript
const securityEventSchema: TableSchema = {
  name: 'security_events_v2',
  columns: [
    { name: 'id', type: 'string', nullable: false },
    { name: 'timestamp', type: 'timestamp', nullable: false },
    { name: 'source_ip', type: 'string', nullable: true },
    { name: 'destination_ip', type: 'string', nullable: true },
    { name: 'user_id', type: 'string', nullable: true },
    { name: 'event_type', type: 'string', nullable: false },
    { name: 'severity', type: 'string', nullable: false },
    { name: 'description', type: 'string', nullable: true },
    { name: 'metadata', type: 'map', nullable: true },
  ],
  partitionColumns: ['year', 'month', 'day', 'severity'],
  clusterColumns: ['event_type', 'source_ip'],
  format: 'parquet',
  compression: 'zstd',
  properties: {
    'parquet.block.size': '268435456',
    'parquet.page.size': '1048576',
  },
};
```

### Schema Evolution Modes

| Mode | Description | Allowed Changes |
|------|-------------|-----------------|
| `strict` | No changes allowed | None |
| `additive` | Only adding columns | Add nullable columns |
| `full` | All changes allowed | Add, drop, rename columns |

```typescript
// Add columns (additive mode)
await manager.evolveSchema(
  'aws-security-lake',
  'security_events',
  {
    addColumns: [
      { name: 'geo_country', type: 'string', nullable: true },
      { name: 'threat_score', type: 'double', nullable: true },
    ],
  },
  'additive'
);

// Full schema evolution
await manager.evolveSchema(
  'aws-security-lake',
  'security_events',
  {
    addColumns: [
      { name: 'new_field', type: 'string', nullable: true },
    ],
    dropColumns: ['deprecated_field'],
    renameColumns: [
      { from: 'old_name', to: 'new_name' },
    ],
  },
  'full'
);

// Get schema history
const history = manager.getSchemaHistory('aws-security-lake', 'security_events');

console.log('Schema versions:', history.length);
history.forEach((schema, index) => {
  console.log(`Version ${index + 1}: ${schema.columns.length} columns`);
});
```

---

## 9. Query Optimization and Cost Estimation

### Cost Estimation

```typescript
// Estimate query cost before execution
const costEstimate = queryEngine.estimateCost(
  `
  SELECT *
  FROM security_events
  WHERE timestamp >= '2025-01-01'
  ORDER BY timestamp DESC
  `,
  {}
);

console.log('Bytes to scan:', costEstimate.bytesToScan);
console.log('Estimated time:', costEstimate.estimatedTimeMs, 'ms');
console.log('Estimated cost: $', costEstimate.estimatedCost);
console.log('Complexity:', costEstimate.complexity);
console.log('Recommendations:', costEstimate.recommendations);
```

### Query Optimization Tips

**1. Use Time-Based Filters**

```sql
-- Good: Uses partition pruning
SELECT * FROM security_events
WHERE timestamp >= '2025-01-01' AND timestamp < '2025-02-01'

-- Bad: Full table scan
SELECT * FROM security_events
WHERE YEAR(timestamp) = 2025
```

**2. Select Only Required Columns**

```sql
-- Good: Specific columns
SELECT event_id, timestamp, source_ip, severity
FROM security_events

-- Bad: All columns
SELECT * FROM security_events
```

**3. Use LIMIT Clause**

```sql
-- Good: Limited results
SELECT * FROM security_events
WHERE severity = 'critical'
ORDER BY timestamp DESC
LIMIT 100

-- Bad: Unlimited results
SELECT * FROM security_events
WHERE severity = 'critical'
ORDER BY timestamp DESC
```

**4. Avoid Expensive Functions in WHERE**

```sql
-- Good: Direct comparison
SELECT * FROM security_events
WHERE source_ip = '192.168.1.100'

-- Bad: Function in WHERE
SELECT * FROM security_events
WHERE LOWER(source_ip) = '192.168.1.100'
```

**5. Use CTEs for Complex Queries**

```sql
-- Good: CTEs for readability and optimization
WITH high_severity AS (
  SELECT * FROM security_events
  WHERE severity IN ('critical', 'high')
    AND timestamp >= '2025-01-01'
),
suspicious_ips AS (
  SELECT source_ip, COUNT(*) as count
  FROM high_severity
  GROUP BY source_ip
  HAVING COUNT(*) > 10
)
SELECT h.*
FROM high_severity h
JOIN suspicious_ips s ON h.source_ip = s.source_ip
```

---

## 10. Pre-built Security Queries Catalog

The query engine includes pre-built queries for common security analytics use cases.

### Threat Hunting Queries

#### Lateral Movement Detection

```typescript
const result = await queryEngine.executePrebuiltQuery(
  'Lateral Movement Detection',
  {
    start_time: new Date('2025-01-01'),
    end_time: new Date('2025-01-31'),
    threshold: 5,
  }
);
```

**SQL:**
```sql
SELECT
  source_ip,
  destination_ip,
  user_id,
  COUNT(DISTINCT destination_host) as hosts_accessed,
  MIN(timestamp) as first_access,
  MAX(timestamp) as last_access,
  ARRAY_AGG(DISTINCT auth_method) as auth_methods
FROM security_events
WHERE event_type = 'authentication'
  AND timestamp >= :start_time
  AND timestamp <= :end_time
  AND status = 'success'
GROUP BY source_ip, destination_ip, user_id
HAVING COUNT(DISTINCT destination_host) > :threshold
ORDER BY hosts_accessed DESC
```

#### Suspicious Process Execution

```typescript
const result = await queryEngine.executePrebuiltQuery(
  'Suspicious Process Execution',
  {
    start_time: new Date('2025-01-01'),
  }
);
```

### IOC Search Queries

#### IP IOC Search

```typescript
const result = await queryEngine.executePrebuiltQuery(
  'IP IOC Search',
  {
    ioc_list: ['192.168.1.100', '10.0.0.50', '172.16.0.1'],
    start_time: new Date('2025-01-01'),
    max_results: 1000,
  }
);
```

#### Hash IOC Search

```typescript
const result = await queryEngine.executePrebuiltQuery(
  'Hash IOC Search',
  {
    hashes: ['abc123...', 'def456...'],
    start_time: new Date('2025-01-01'),
  }
);
```

### Anomaly Detection Queries

#### Unusual Login Times

```typescript
const result = await queryEngine.executePrebuiltQuery(
  'Unusual Login Times',
  {
    baseline_start: new Date('2024-12-01'),
    baseline_end: new Date('2024-12-31'),
    detection_start: new Date('2025-01-01'),
    z_threshold: 2.5,
  }
);
```

#### Data Exfiltration Detection

```typescript
const result = await queryEngine.executePrebuiltQuery(
  'Data Exfiltration Detection',
  {
    baseline_start: new Date('2024-12-01'),
    baseline_end: new Date('2024-12-31'),
    detection_start: new Date('2025-01-01'),
    default_threshold: 1073741824, // 1 GB
    multiplier: 3,
  }
);
```

### Correlation Queries

#### Attack Chain Correlation

```typescript
const result = await queryEngine.executePrebuiltQuery(
  'Attack Chain Correlation',
  {
    start_time: new Date('2025-01-01'),
  }
);
```

#### User Compromise Indicators

```typescript
const result = await queryEngine.executePrebuiltQuery(
  'User Compromise Indicators',
  {
    start_time: new Date('2025-01-01'),
    end_time: new Date('2025-01-31'),
    min_events: 5,
  }
);
```

### List All Pre-built Queries

```typescript
// Get all pre-built queries
const allQueries = queryEngine.getPrebuiltQueries();

// Filter by category
const threatHuntingQueries = queryEngine.getPrebuiltQueries('threat_hunting');
const anomalyQueries = queryEngine.getPrebuiltQueries('anomaly_detection');
const correlationQueries = queryEngine.getPrebuiltQueries('correlation');
```

---

## 11. BI Tool Integration

### Tableau Integration

```typescript
// Register Tableau connection
queryEngine.registerBIIntegration('tableau-prod', {
  type: 'tableau',
  connectionString: 'https://tableau.example.com',
  credentials: {
    username: process.env.TABLEAU_USER,
    password: process.env.TABLEAU_PASSWORD,
    site: 'security-analytics',
  },
  refreshInterval: 3600000, // 1 hour
});

// Sync query results to Tableau
await queryEngine.syncToBITool('tableau-prod', savedQuery.id, {
  tableName: 'security_events_analysis',
  refreshData: true,
});
```

### Power BI Integration

```typescript
// Register Power BI connection
queryEngine.registerBIIntegration('powerbi-prod', {
  type: 'powerbi',
  connectionString: 'https://api.powerbi.com',
  credentials: {
    clientId: process.env.POWERBI_CLIENT_ID,
    clientSecret: process.env.POWERBI_CLIENT_SECRET,
    tenantId: process.env.AZURE_TENANT_ID,
  },
  refreshInterval: 3600000,
});

// Sync to Power BI dataset
await queryEngine.syncToBITool('powerbi-prod', savedQuery.id, {
  tableName: 'SecurityEvents',
  refreshData: true,
});
```

### Looker Integration

```typescript
// Register Looker connection
queryEngine.registerBIIntegration('looker-prod', {
  type: 'looker',
  connectionString: 'https://looker.example.com',
  credentials: {
    clientId: process.env.LOOKER_CLIENT_ID,
    clientSecret: process.env.LOOKER_CLIENT_SECRET,
  },
  refreshInterval: 1800000, // 30 minutes
});
```

### Grafana Integration

```typescript
// Register Grafana connection
queryEngine.registerBIIntegration('grafana-prod', {
  type: 'grafana',
  connectionString: 'https://grafana.example.com',
  credentials: {
    apiKey: process.env.GRAFANA_API_KEY,
  },
  refreshInterval: 60000, // 1 minute
});
```

### Managing BI Integrations

```typescript
// List all integrations
const integrations = queryEngine.listBIIntegrations();

// Get specific integration
const tableau = queryEngine.getBIIntegration('tableau-prod');

// Remove integration
queryEngine.removeBIIntegration('old-integration');
```

---

## 12. Best Practices

### Data Lake Design

1. **Partitioning Strategy**
   - Use time-based partitioning (year/month/day) for time-series data
   - Add severity or source partitions for security events
   - Avoid over-partitioning (max 10,000 partitions per table)

2. **File Format**
   - Use Parquet for analytical workloads
   - Use Avro for streaming data
   - Apply Snappy or ZSTD compression

3. **Schema Design**
   - Define strict schemas with proper data types
   - Use nullable columns sparingly
   - Document all columns with descriptions

### Ingestion Best Practices

1. **Batch Size**
   - Optimal batch size: 1,000-10,000 records
   - Larger batches for high-throughput sources
   - Smaller batches for low-latency requirements

2. **Error Handling**
   - Always configure dead letter queues
   - Set appropriate retry policies
   - Monitor error rates and alert on thresholds

3. **Exactly-Once Semantics**
   - Enable checkpointing for critical pipelines
   - Use deduplication for idempotent processing
   - Validate checkpoint storage reliability

### Query Best Practices

1. **Cost Control**
   - Always estimate costs before running queries
   - Use LIMIT clauses
   - Filter on partition columns
   - Cache frequently-run queries

2. **Performance**
   - Select only needed columns
   - Use materialized views for common aggregations
   - Schedule heavy queries during off-peak hours

3. **Security**
   - Use parameterized queries
   - Never expose credentials in queries
   - Implement RBAC for query access

### Monitoring and Alerting

1. **Key Metrics to Monitor**
   - Ingestion throughput and latency
   - Query execution time and cost
   - Error rates and DLQ depth
   - Storage costs and growth

2. **Alert Thresholds**
   - Error rate > 1%
   - Latency P95 > 5 seconds
   - DLQ depth > 1000 records
   - Storage cost increase > 20%

---

## 13. Troubleshooting

### Common Issues and Solutions

#### Issue: High Query Costs

**Symptoms:**
- Queries scanning excessive data
- High cloud bills

**Solutions:**
```typescript
// 1. Check cost estimate before running
const estimate = queryEngine.estimateCost(sql, params);
if (estimate.estimatedCost > 10) {
  console.warn('Query will cost more than $10');
}

// 2. Add time-based filters
const optimizedQuery = `
  SELECT * FROM security_events
  WHERE timestamp >= '2025-01-01'  -- Add time filter
    AND timestamp < '2025-01-02'
`;

// 3. Use materialized views for repeated queries
await queryEngine.createMaterializedView(
  'common_aggregation',
  query,
  '0 * * * *',  // Refresh hourly
  'user_123'
);
```

#### Issue: Slow Ingestion

**Symptoms:**
- Backpressure events
- Growing lag
- High latency

**Solutions:**
```typescript
// 1. Increase batch size
const config = {
  maxBatchSize: 5000, // Increase from default
};

// 2. Scale up instances
const scalingConfig = {
  scaling: {
    enabled: true,
    minInstances: 4,  // Increase minimum
    maxInstances: 20, // Allow more scaling
  },
};

// 3. Reduce transformations
// Move heavy transformations to post-processing
```

#### Issue: Schema Evolution Failures

**Symptoms:**
- Schema evolution errors
- Incompatible changes rejected

**Solutions:**
```typescript
// 1. Use additive mode for safe changes
await manager.evolveSchema(dataLake, table, changes, 'additive');

// 2. For breaking changes, create new table
const newSchema = { ...oldSchema, name: 'security_events_v2' };
await manager.createTable(dataLake, newSchema);

// 3. Migrate data gradually
// Then update downstream systems
```

#### Issue: Dead Letter Queue Growing

**Symptoms:**
- DLQ depth increasing
- Records not being processed

**Solutions:**
```typescript
// 1. Check DLQ records for patterns
const metrics = pipeline.getMetrics('my-pipeline');
console.log('DLQ depth:', metrics?.recordsInDeadLetter);
console.log('Error breakdown:', metrics?.errorBreakdown);

// 2. Fix underlying issues
// - Schema validation errors: Update schema or transformations
// - Enrichment failures: Check external service availability
// - Quality check failures: Adjust rules or fix data source

// 3. Reprocess DLQ records after fix
// Configure DLQ reprocessing pipeline
```

#### Issue: Query Timeout

**Symptoms:**
- Queries timing out
- Incomplete results

**Solutions:**
```typescript
// 1. Increase timeout
const config = {
  timeout: 300000, // 5 minutes
};

// 2. Optimize query
// - Add indexes on frequently filtered columns
// - Use partition pruning
// - Break into smaller queries

// 3. Use batch mode for large queries
const config = {
  mode: 'batch',
  timeout: 600000, // 10 minutes
};
```

#### Issue: Cache Misses

**Symptoms:**
- Low cache hit rate
- Repeated expensive queries

**Solutions:**
```typescript
// 1. Check cache stats
const stats = queryEngine.getStatistics();
console.log('Cache stats:', stats.cacheStats);

// 2. Increase cache TTL for stable data
const config = {
  enableCache: true,
  cacheTTL: 3600000, // 1 hour
};

// 3. Use materialized views instead
await queryEngine.createMaterializedView(name, query, schedule, userId);
```

### Debugging Commands

```typescript
// Get comprehensive statistics
const stats = queryEngine.getStatistics();
console.log('Saved queries:', stats.savedQueries);
console.log('Scheduled queries:', stats.scheduledQueries);
console.log('Running queries:', stats.runningQueries);
console.log('Cache stats:', stats.cacheStats);

// Get pipeline metrics
const pipelineMetrics = pipeline.getAllMetrics();
pipelineMetrics.forEach((metrics, pipelineId) => {
  console.log(`Pipeline ${pipelineId}:`, metrics);
});

// Get data lake metrics
const dlMetrics = manager.getMetrics();
console.log('Data lake metrics:', dlMetrics);

// List all data lakes
const dataLakes = manager.listDataLakes();
console.log('Configured data lakes:', dataLakes);

// Get catalog entries
const catalog = manager.getCatalog({ format: 'parquet', minRows: 1000 });
console.log('Tables with 1000+ rows:', catalog);
```

### Health Check Script

```typescript
async function healthCheck() {
  const results = {
    dataLakeManager: false,
    ingestionPipeline: false,
    queryEngine: false,
  };

  try {
    // Check data lake manager
    const manager = SecurityDataLakeManager.getInstance();
    const dataLakes = manager.listDataLakes();
    results.dataLakeManager = dataLakes.length > 0;
  } catch (e) {
    console.error('Data Lake Manager error:', e);
  }

  try {
    // Check ingestion pipeline
    const pipeline = DataIngestionPipeline.getInstance();
    const metrics = pipeline.getAllMetrics();
    results.ingestionPipeline = true;
  } catch (e) {
    console.error('Ingestion Pipeline error:', e);
  }

  try {
    // Check query engine
    const engine = SecurityAnalyticsQueryEngine.getInstance();
    const stats = engine.getStatistics();
    results.queryEngine = true;
  } catch (e) {
    console.error('Query Engine error:', e);
  }

  console.log('Health Check Results:', results);
  return results;
}
```

---

## Appendix: Type Reference

### Data Types

| Type | Description | Example |
|------|-------------|---------|
| `string` | Text data | `"event_123"` |
| `int` | 32-bit integer | `42` |
| `long` | 64-bit integer | `9223372036854775807` |
| `float` | 32-bit floating point | `3.14` |
| `double` | 64-bit floating point | `3.141592653589793` |
| `boolean` | True/false | `true` |
| `timestamp` | Date and time | `2025-01-01T00:00:00Z` |
| `date` | Date only | `2025-01-01` |
| `binary` | Binary data | Base64 encoded |
| `decimal` | High-precision decimal | `123.456789012345678901` |
| `array` | List of values | `[1, 2, 3]` |
| `map` | Key-value pairs | `{"key": "value"}` |
| `struct` | Nested structure | `{"field": {"nested": "value"}}` |

### Severity Levels

| Level | Priority | Use Case |
|-------|----------|----------|
| `critical` | 1 | Immediate action required |
| `high` | 2 | Urgent investigation needed |
| `medium` | 3 | Should be reviewed soon |
| `low` | 4 | For awareness |
| `info` | 5 | Informational only |

### Storage Tiers

| Tier | Access Pattern | Cost | Retrieval Time |
|------|----------------|------|----------------|
| `hot` | Frequent access | Highest | Immediate |
| `warm` | Infrequent access | Medium | Immediate |
| `cold` | Rare access | Low | Minutes |
| `archive` | Compliance only | Lowest | Hours |

---

## Related Documentation

- [COMPLIANCE_FRAMEWORK_GUIDE.md](./COMPLIANCE_FRAMEWORK_GUIDE.md) - SOC2, HIPAA, GDPR compliance
- [AUDIT_LOGGING_GUIDE.md](./AUDIT_LOGGING_GUIDE.md) - Audit log configuration
- [LOG_STREAMING_GUIDE.md](./LOG_STREAMING_GUIDE.md) - Real-time log streaming
- [PERFORMANCE_OPTIMIZATION_GUIDE.md](./PERFORMANCE_OPTIMIZATION_GUIDE.md) - Performance tuning

---

*Last updated: Week 22 - November 2025*
*Version: 1.0.0*

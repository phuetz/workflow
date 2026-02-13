/**
 * Types for Security Data Lake Manager
 * Multi-cloud support with schema evolution, partitioning, retention, and lineage tracking
 */

// =============================================================================
// Core Type Definitions
// =============================================================================

export type DataLakeProvider = 'aws' | 'azure' | 'gcp' | 'snowflake' | 'databricks';
export type StorageTier = 'hot' | 'warm' | 'cold' | 'archive';
export type CompressionType = 'none' | 'gzip' | 'snappy' | 'zstd' | 'lz4';
export type EncryptionType = 'none' | 'aes-256' | 'aws-kms' | 'azure-key-vault' | 'gcp-kms';
export type PartitionStrategy = 'time' | 'source' | 'severity' | 'composite';
export type DataFormat = 'parquet' | 'orc' | 'avro' | 'json' | 'csv';
export type SchemaEvolutionMode = 'strict' | 'additive' | 'full';
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

// =============================================================================
// Configuration Interfaces
// =============================================================================

export interface DataLakeConfig {
  provider: DataLakeProvider;
  region: string;
  credentials: ProviderCredentials;
  bucket?: string;
  container?: string;
  dataset?: string;
  warehouse?: string;
  catalog?: string;
  defaultFormat: DataFormat;
  defaultCompression: CompressionType;
  encryption: EncryptionConfig;
  costOptimization: CostOptimizationConfig;
}

export interface ProviderCredentials {
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  accountId?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  projectId?: string;
  keyFile?: string;
  privateKey?: string;
  connectionString?: string;
}

export interface EncryptionConfig {
  type: EncryptionType;
  keyId?: string;
  keyVaultUrl?: string;
  rotationDays?: number;
}

export interface CostOptimizationConfig {
  enableTiering: boolean;
  hotToWarmDays: number;
  warmToColdDays: number;
  coldToArchiveDays: number;
  enableCompression: boolean;
  enableDeduplication: boolean;
}

// =============================================================================
// Schema Interfaces
// =============================================================================

export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  partitionColumns: string[];
  clusterColumns?: string[];
  format: DataFormat;
  compression: CompressionType;
  properties: Record<string, string>;
}

export interface ColumnDefinition {
  name: string;
  type: DataType;
  nullable: boolean;
  description?: string;
  defaultValue?: unknown;
  metadata?: Record<string, unknown>;
}

export type DataType =
  | 'string'
  | 'int'
  | 'long'
  | 'float'
  | 'double'
  | 'boolean'
  | 'timestamp'
  | 'date'
  | 'binary'
  | 'decimal'
  | 'array'
  | 'map'
  | 'struct';

// =============================================================================
// Partition and Retention Interfaces
// =============================================================================

export interface PartitionSpec {
  strategy: PartitionStrategy;
  timeGranularity?: 'hour' | 'day' | 'week' | 'month' | 'year';
  sourceField?: string;
  severityField?: string;
  customPartitions?: string[];
}

export interface RetentionPolicy {
  name: string;
  tableName: string;
  retentionDays: number;
  gracePeriodDays: number;
  archiveBeforeDelete: boolean;
  archiveLocation?: string;
  enabled: boolean;
  lastCleanup?: Date;
  nextCleanup?: Date;
}

// =============================================================================
// Data Record and Query Interfaces
// =============================================================================

export interface DataRecord {
  id: string;
  timestamp: Date;
  source: string;
  severity: SeverityLevel;
  category: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface QueryRequest {
  sql?: string;
  table?: string;
  columns?: string[];
  filters?: QueryFilter[];
  orderBy?: OrderByClause[];
  groupBy?: string[];
  having?: string;
  limit?: number;
  offset?: number;
  federatedSources?: string[];
  timeout?: number;
  cacheResults?: boolean;
}

export interface QueryFilter {
  column: string;
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
    | 'is_not_null';
  value: unknown;
  value2?: unknown;
}

export interface OrderByClause {
  column: string;
  direction: 'asc' | 'desc';
  nullsFirst?: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
  bytesScanned: number;
  cost?: number;
  warnings?: string[];
  cached?: boolean;
}

// =============================================================================
// Catalog Interfaces
// =============================================================================

export interface CatalogEntry {
  tableName: string;
  database: string;
  schema: TableSchema;
  location: string;
  format: DataFormat;
  rowCount: number;
  sizeBytes: number;
  partitions: PartitionInfo[];
  lastModified: Date;
  created: Date;
  owner: string;
  tags: string[];
  description?: string;
  statistics?: TableStatistics;
}

export interface PartitionInfo {
  values: Record<string, string>;
  location: string;
  sizeBytes: number;
  rowCount: number;
  lastModified: Date;
  tier: StorageTier;
}

export interface TableStatistics {
  totalRows: number;
  totalSizeBytes: number;
  averageRowSize: number;
  partitionCount: number;
  lastAnalyzed: Date;
  columnStats: Record<string, ColumnStatistics>;
}

export interface ColumnStatistics {
  distinctCount: number;
  nullCount: number;
  minValue?: unknown;
  maxValue?: unknown;
  avgLength?: number;
}

// =============================================================================
// Lineage Interfaces
// =============================================================================

export interface LineageNode {
  id: string;
  type: 'table' | 'view' | 'query' | 'process' | 'external';
  name: string;
  provider?: DataLakeProvider;
  metadata?: Record<string, unknown>;
}

export interface LineageEdge {
  sourceId: string;
  targetId: string;
  transformationType: string;
  columns?: ColumnMapping[];
  timestamp: Date;
  queryId?: string;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
  transformation?: string;
}

export interface DataLineage {
  nodeId: string;
  upstream: LineageNode[];
  downstream: LineageNode[];
  edges: LineageEdge[];
  impactedTables?: string[];
}

// =============================================================================
// Operation Result Interfaces
// =============================================================================

export interface CompactionResult {
  tableName: string;
  partitionsProcessed: number;
  filesCompacted: number;
  originalSizeBytes: number;
  compactedSizeBytes: number;
  compressionRatio: number;
  duration: number;
}

export interface StorageOptimizationResult {
  tableName: string;
  tieredPartitions: number;
  bytesMovedToWarm: number;
  bytesMovedToCold: number;
  bytesMovedToArchive: number;
  estimatedSavings: number;
  duration: number;
}

export interface IngestOptions {
  batchSize?: number;
  compress?: boolean;
  encrypt?: boolean;
  dedup?: boolean;
  sourceLineage?: string;
  validateSchema?: boolean;
  onError?: 'skip' | 'abort' | 'retry';
  maxRetries?: number;
}

export interface IngestResult {
  ingested: number;
  duplicates: number;
  errors: number;
  skipped: number;
  duration: number;
}

// =============================================================================
// Adapter Interface
// =============================================================================

export interface DataLakeAdapter {
  initialize(): Promise<void>;
  createTable(schema: TableSchema): Promise<void>;
  dropTable(tableName: string): Promise<void>;
  insertData(tableName: string, records: DataRecord[]): Promise<number>;
  query(request: QueryRequest): Promise<QueryResult>;
  getTableInfo(tableName: string): Promise<CatalogEntry | null>;
  listTables(): Promise<string[]>;
  compactPartitions(tableName: string, partitions?: string[]): Promise<CompactionResult>;
  setStorageTier(tableName: string, partition: string, tier: StorageTier): Promise<void>;
  deletePartitions(tableName: string, partitions: string[]): Promise<number>;
  getStorageCost(tableName: string): Promise<number>;
  analyzeTable(tableName: string): Promise<TableStatistics>;
}

// =============================================================================
// Cache Interface
// =============================================================================

export interface CacheEntry {
  result: QueryResult;
  timestamp: number;
  ttl: number;
}

// =============================================================================
// Metrics Interface
// =============================================================================

export interface DataLakeMetrics {
  operations: Record<string, number>;
  ingestions: { total: number; errors: number; duplicates: number };
  queries: { total: number; cacheHits: number; bytesScanned: number };
  compactions: { total: number; bytesCompacted: number };
  optimizations: { total: number; bytesMoved: number; savings: number };
}

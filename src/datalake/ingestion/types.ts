/**
 * Type definitions for Data Ingestion Pipeline
 */

export type IngestionSourceType =
  | 'kafka'
  | 'kinesis'
  | 'pubsub'
  | 'eventhub'
  | 'fluentd'
  | 'logstash'
  | 'filebeat';

export type WindowType = 'tumbling' | 'sliding' | 'session';

export type CheckpointStrategy = 'periodic' | 'per-record' | 'per-batch' | 'manual';

export interface IngestionSourceConfig {
  type: IngestionSourceType;
  id: string;
  name: string;
  connection: ConnectionConfig;
  schema?: SchemaDefinition;
  partitions?: number;
  consumerGroup?: string;
  startOffset?: 'earliest' | 'latest' | string;
  maxBatchSize?: number;
  pollIntervalMs?: number;
  enabled: boolean;
}

export interface ConnectionConfig {
  // Kafka
  brokers?: string[];
  topic?: string;
  saslMechanism?: 'plain' | 'scram-sha-256' | 'scram-sha-512';
  username?: string;
  password?: string;
  ssl?: boolean;

  // Kinesis
  region?: string;
  streamName?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;

  // Pub/Sub
  projectId?: string;
  subscriptionName?: string;
  credentials?: string;

  // Event Hub
  connectionString?: string;
  eventHubName?: string;

  // Fluentd/Logstash/Filebeat
  host?: string;
  port?: number;
  protocol?: 'tcp' | 'udp' | 'http';
  path?: string;
  tags?: string[];
}

export interface SchemaDefinition {
  id: string;
  name: string;
  version: string;
  type: 'json' | 'avro' | 'protobuf' | 'csv';
  fields: SchemaField[];
  required?: string[];
  additionalProperties?: boolean;
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'binary';
  nullable?: boolean;
  format?: string;
  pattern?: string;
  enum?: any[];
  default?: any;
  description?: string;
}

export interface PipelineConfig {
  id: string;
  name: string;
  description?: string;
  sources: IngestionSourceConfig[];
  transformations: TransformationConfig[];
  enrichments: EnrichmentConfig[];
  windows?: WindowConfig;
  qualityChecks: DataQualityConfig[];
  deadLetterQueue: DeadLetterQueueConfig;
  backpressure: BackpressureConfig;
  checkpoint: CheckpointConfig;
  scaling: AutoScalingConfig;
  monitoring: MonitoringConfig;
  retryPolicy: RetryPolicyConfig;
}

export interface TransformationConfig {
  id: string;
  name: string;
  type: 'map' | 'filter' | 'flatMap' | 'aggregate' | 'join' | 'dedupe' | 'enrich' | 'custom';
  order: number;
  config: Record<string, any>;
  condition?: string;
}

export interface EnrichmentConfig {
  id: string;
  name: string;
  source: 'api' | 'database' | 'cache' | 'lookup-table';
  config: Record<string, any>;
  cacheConfig?: {
    enabled: boolean;
    ttlSeconds: number;
    maxSize: number;
  };
}

export interface WindowConfig {
  type: WindowType;
  sizeMs: number;
  slideMs?: number;          // For sliding windows
  sessionGapMs?: number;     // For session windows
  allowedLatenessMs?: number;
  watermarkDelayMs?: number;
  aggregation?: {
    type: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'first' | 'last' | 'custom';
    field?: string;
    customFn?: string;
  };
}

export interface DataQualityConfig {
  id: string;
  name: string;
  type: 'schema' | 'nullability' | 'uniqueness' | 'range' | 'pattern' | 'referential' | 'custom';
  severity: 'error' | 'warning' | 'info';
  config: Record<string, any>;
  onFailure: 'reject' | 'flag' | 'fix' | 'skip';
}

export interface DeadLetterQueueConfig {
  enabled: boolean;
  destination: {
    type: IngestionSourceType | 'local' | 's3' | 'gcs';
    config: Record<string, any>;
  };
  retentionDays: number;
  maxRetries: number;
  includeMetadata: boolean;
}

export interface BackpressureConfig {
  strategy: 'drop' | 'buffer' | 'pause' | 'sample';
  thresholds: {
    lowWatermark: number;
    highWatermark: number;
  };
  bufferSize: number;
  sampleRate?: number;
  pauseTimeoutMs?: number;
}

export interface CheckpointConfig {
  strategy: CheckpointStrategy;
  intervalMs?: number;
  storage: {
    type: 'memory' | 'file' | 'redis' | 's3' | 'database';
    config: Record<string, any>;
  };
  exactlyOnce: boolean;
  retainCount: number;
}

export interface AutoScalingConfig {
  enabled: boolean;
  minInstances: number;
  maxInstances: number;
  targetThroughput: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriodMs: number;
  metricsWindowMs: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsIntervalMs: number;
  alerting: {
    enabled: boolean;
    channels: string[];
    thresholds: {
      errorRate: number;
      latencyMs: number;
      backpressure: number;
    };
  };
}

export interface RetryPolicyConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface IngestionRecord {
  id: string;
  sourceId: string;
  timestamp: Date;
  key?: string;
  value: any;
  headers?: Record<string, string>;
  partition?: number;
  offset?: string;
  metadata?: Record<string, any>;
}

export interface ProcessedRecord extends IngestionRecord {
  transformations: string[];
  enrichments: string[];
  qualityFlags: QualityFlag[];
  processingTimeMs: number;
  windowId?: string;
}

export interface QualityFlag {
  checkId: string;
  passed: boolean;
  message?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface DeadLetterRecord {
  id: string;
  originalRecord: IngestionRecord;
  error: string;
  errorType: string;
  failedAt: Date;
  retryCount: number;
  pipelineId: string;
  stageId: string;
}

export interface Checkpoint {
  id: string;
  pipelineId: string;
  timestamp: Date;
  offsets: Record<string, string>;
  state: Record<string, any>;
  recordsProcessed: number;
  checksum: string;
}

export interface PipelineMetrics {
  pipelineId: string;
  startTime: Date;
  recordsIngested: number;
  recordsProcessed: number;
  recordsFailed: number;
  recordsInDeadLetter: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  throughputPerSecond: number;
  backpressureEvents: number;
  checkpointCount: number;
  lastCheckpoint?: Date;
  windowStats?: {
    activeWindows: number;
    closedWindows: number;
    lateRecords: number;
  };
  scalingStats?: {
    currentInstances: number;
    scaleUpEvents: number;
    scaleDownEvents: number;
  };
  errorBreakdown: Record<string, number>;
}

export interface WindowState {
  id: string;
  type: WindowType;
  startTime: Date;
  endTime?: Date;
  records: IngestionRecord[];
  aggregatedValue?: any;
  isOpen: boolean;
  watermark: Date;
}

// Handler types
export type TransformationHandler = (
  record: IngestionRecord,
  config: any
) => Promise<IngestionRecord | IngestionRecord[] | null>;

export type EnrichmentHandler = (
  record: IngestionRecord,
  config: any
) => Promise<IngestionRecord>;

// Source connection interface
export interface SourceConnection {
  type: string;
  connected: boolean;
  poll: () => Promise<IngestionRecord[]>;
  close: () => Promise<void>;
  commit?: (offsets: Record<number, string>) => Promise<void>;
  checkpoint?: (offset: string) => Promise<void>;
  ack?: (messageIds: string[]) => Promise<void>;
}

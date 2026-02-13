/**
 * Event Streaming Engine Types
 *
 * Comprehensive type definitions for event streaming, windowing, aggregations,
 * and complex event processing.
 */

// ============================================================================
// Stream Platform Types
// ============================================================================

export type StreamPlatform =
  | 'kafka'
  | 'pulsar'
  | 'kinesis'
  | 'pubsub'
  | 'eventhubs'
  | 'redis'
  | 'nats';

export interface StreamConfig {
  platform: StreamPlatform;
  connectionConfig: KafkaConfig | PulsarConfig | KinesisConfig | PubSubConfig | EventHubsConfig | RedisConfig | NatsConfig;
  consumerConfig?: ConsumerConfig;
  producerConfig?: ProducerConfig;
}

// Platform-specific configurations
export interface KafkaConfig {
  brokers: string[];
  clientId: string;
  ssl?: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
  connectionTimeout?: number;
  requestTimeout?: number;
}

export interface PulsarConfig {
  serviceUrl: string;
  authToken?: string;
  tlsTrustCertsFilePath?: string;
  operationTimeout?: number;
}

export interface KinesisConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
}

export interface PubSubConfig {
  projectId: string;
  keyFilename?: string;
  credentials?: Record<string, unknown>;
}

export interface EventHubsConfig {
  connectionString: string;
  eventHubName: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: boolean;
}

export interface NatsConfig {
  servers: string[];
  token?: string;
  user?: string;
  pass?: string;
}

export interface ConsumerConfig {
  groupId?: string;
  topics: string[];
  fromBeginning?: boolean;
  autoCommit?: boolean;
  autoCommitInterval?: number;
  sessionTimeout?: number;
  heartbeatInterval?: number;
  maxBytesPerPartition?: number;
  partitionsConsumedConcurrently?: number;
}

export interface ProducerConfig {
  topic: string;
  acks?: number;
  timeout?: number;
  compression?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';
  maxInFlightRequests?: number;
  idempotent?: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

export interface StreamEvent<T = any> {
  key: string;
  value: T;
  timestamp: number;
  partition?: number;
  offset?: string | number;
  headers?: Record<string, string>;
  metadata?: EventMetadata;
}

export interface EventMetadata {
  source?: string;
  correlationId?: string;
  causationId?: string;
  userId?: string;
  version?: string;
  [key: string]: any;
}

// ============================================================================
// Window Types
// ============================================================================

export type WindowType = 'tumbling' | 'sliding' | 'session' | 'custom';

export interface WindowConfig {
  type: WindowType;
  size: number; // milliseconds
  slide?: number; // for sliding windows
  gap?: number; // for session windows
  allowedLateness?: number;
  customWindow?: CustomWindowFunction;
}

export type CustomWindowFunction = (events: StreamEvent[]) => StreamEvent[][];

export interface Window {
  id: string;
  start: number;
  end: number;
  events: StreamEvent[];
  isClosed: boolean;
}

// ============================================================================
// Aggregation Types
// ============================================================================

export type AggregationType =
  | 'count'
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'first'
  | 'last'
  | 'percentile'
  | 'stddev'
  | 'variance'
  | 'custom';

export interface AggregationConfig {
  type: AggregationType;
  field?: string;
  percentile?: number; // for percentile aggregation (e.g., 0.95 for p95)
  customAggregator?: CustomAggregator;
  groupBy?: string[];
  having?: FilterCondition;
}

export type CustomAggregator = (events: StreamEvent[]) => any;

export interface AggregationResult {
  windowId: string;
  start: number;
  end: number;
  groups: Map<string, any>;
  metadata: {
    eventCount: number;
    processedAt: number;
  };
}

// ============================================================================
// Complex Event Processing (CEP)
// ============================================================================

export type PatternType =
  | 'sequence'
  | 'conjunction'
  | 'disjunction'
  | 'negation'
  | 'iteration'
  | 'temporal';

export interface CEPPattern {
  id: string;
  type: PatternType;
  conditions: PatternCondition[];
  timeConstraint?: TimeConstraint;
  quantifier?: Quantifier;
  select?: string[];
}

export interface PatternCondition {
  eventType?: string;
  filter?: FilterCondition;
  alias?: string;
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'regex';
  value: any;
  logicalOp?: 'and' | 'or';
  next?: FilterCondition;
}

export interface TimeConstraint {
  within?: number; // milliseconds
  after?: number;
  before?: number;
}

export interface Quantifier {
  min?: number;
  max?: number;
  exactly?: number;
}

export interface PatternMatch {
  patternId: string;
  events: StreamEvent[];
  matchedAt: number;
  duration: number;
}

// ============================================================================
// Stream Join Types
// ============================================================================

export type JoinType = 'inner' | 'left' | 'right' | 'full';

export interface StreamJoinConfig {
  type: JoinType;
  leftStream: string;
  rightStream: string;
  leftKey: string;
  rightKey: string;
  window: WindowConfig;
  select?: string[];
}

export interface JoinedEvent {
  left?: StreamEvent;
  right?: StreamEvent;
  joinKey: string;
  timestamp: number;
}

// ============================================================================
// Transformation Types
// ============================================================================

export type TransformationType = 'map' | 'flatMap' | 'filter' | 'reduce' | 'fold';

export interface TransformationConfig {
  type: TransformationType;
  function: string | TransformFunction;
  initialValue?: any; // for reduce/fold
}

export type TransformFunction = (event: StreamEvent, index?: number) => StreamEvent | StreamEvent[] | boolean;

// ============================================================================
// Backpressure & Flow Control
// ============================================================================

export interface BackpressureConfig {
  strategy: 'drop' | 'buffer' | 'block' | 'sample';
  bufferSize?: number;
  maxLag?: number; // milliseconds
  samplingRate?: number; // 0-1
  autoScaling?: AutoScalingConfig;
}

export interface AutoScalingConfig {
  enabled: boolean;
  minInstances: number;
  maxInstances: number;
  targetLag: number; // milliseconds
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number; // milliseconds
}

export interface BackpressureMetrics {
  currentLag: number;
  bufferUtilization: number;
  droppedEvents: number;
  throughput: number;
  consumerInstances: number;
}

// ============================================================================
// Stream Processing Pipeline
// ============================================================================

export interface StreamPipeline {
  id: string;
  name: string;
  source: StreamSource;
  processors: StreamProcessor[];
  sink?: StreamSink;
  errorHandler?: ErrorHandler;
  checkpointing?: CheckpointConfig;
  parallelism?: number;
  state?: PipelineState;
}

export interface StreamSource {
  type: 'stream' | 'table' | 'file';
  config: StreamConfig | TableConfig | FileConfig;
}

export interface TableConfig {
  connector: 'postgres' | 'mysql' | 'mongodb' | 'redis';
  connectionString: string;
  table: string;
  keyField: string;
}

export interface FileConfig {
  path: string;
  format: 'json' | 'csv' | 'avro' | 'parquet';
  watchMode?: boolean;
}

export interface StreamProcessor {
  id: string;
  type: 'window' | 'aggregate' | 'transform' | 'join' | 'cep' | 'filter';
  config: WindowConfig | AggregationConfig | TransformationConfig | StreamJoinConfig | CEPPattern | FilterCondition;
}

export interface StreamSink {
  type: 'stream' | 'database' | 'file' | 'http';
  config: StreamConfig | TableConfig | FileConfig | HttpConfig;
}

export interface HttpConfig {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  batchSize?: number;
}

export interface ErrorHandler {
  strategy: 'retry' | 'dlq' | 'skip' | 'fail';
  retryConfig?: RetryConfig;
  dlqConfig?: DLQConfig;
}

export interface RetryConfig {
  maxAttempts: number;
  backoff: 'fixed' | 'exponential' | 'linear';
  initialDelay: number;
  maxDelay?: number;
  multiplier?: number;
}

export interface DLQConfig {
  topic: string;
  maxSize?: number;
}

export interface CheckpointConfig {
  interval: number; // milliseconds
  storage: 'memory' | 'file' | 'database';
  path?: string;
  compressionEnabled?: boolean;
}

export type PipelineState = 'created' | 'starting' | 'running' | 'paused' | 'stopping' | 'stopped' | 'failed';

// ============================================================================
// Metrics & Monitoring
// ============================================================================

export interface StreamMetrics {
  pipelineId: string;
  timestamp: number;
  throughput: ThroughputMetrics;
  latency: LatencyMetrics;
  errors: ErrorMetrics;
  resources: ResourceMetrics;
}

export interface ThroughputMetrics {
  eventsPerSecond: number;
  bytesPerSecond: number;
  recordsIn: number;
  recordsOut: number;
}

export interface LatencyMetrics {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  avg: number;
  max: number;
}

export interface ErrorMetrics {
  total: number;
  rate: number;
  byType: Map<string, number>;
}

export interface ResourceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkIn: number;
  networkOut: number;
}

// ============================================================================
// Stateful Processing
// ============================================================================

export interface StateStore<K = string, V = any> {
  get(key: K): Promise<V | undefined>;
  put(key: K, value: V): Promise<void>;
  delete(key: K): Promise<void>;
  range(from: K, to: K): Promise<Map<K, V>>;
  clear(): Promise<void>;
  size(): Promise<number>;
}

export interface StateStoreConfig {
  name: string;
  type: 'memory' | 'rocksdb' | 'redis';
  ttl?: number; // milliseconds
  persistenceEnabled?: boolean;
  checkpointEnabled?: boolean;
}

// ============================================================================
// Exactly-Once Semantics
// ============================================================================

export interface ExactlyOnceConfig {
  enabled: boolean;
  transactionalId?: string;
  idempotenceEnabled?: boolean;
  deduplicationWindow?: number; // milliseconds
  deduplicationKeyExtractor?: (event: StreamEvent) => string;
}

export interface ProcessingGuarantee {
  type: 'at-most-once' | 'at-least-once' | 'exactly-once';
  config?: ExactlyOnceConfig;
}

// ============================================================================
// Anomaly Detection
// ============================================================================

export type AnomalyDetectionMethod = 'zscore' | 'iqr' | 'isolation-forest' | 'custom';

export interface AnomalyDetectionConfig {
  method: AnomalyDetectionMethod;
  field: string;
  sensitivity: number; // 1-10, higher = more sensitive
  windowSize: number; // number of events to consider
  threshold?: number;
  customDetector?: (events: StreamEvent[]) => boolean[];
}

export interface Anomaly {
  event: StreamEvent;
  score: number;
  method: AnomalyDetectionMethod;
  detectedAt: number;
  context: StreamEvent[];
}

// ============================================================================
// Watermarking
// ============================================================================

export interface WatermarkConfig {
  strategy: 'periodic' | 'event-time' | 'custom';
  maxOutOfOrderness?: number; // milliseconds
  idleTimeout?: number; // milliseconds
  customExtractor?: (event: StreamEvent) => number;
}

export interface Watermark {
  timestamp: number;
  generatedAt: number;
  lag: number;
}

// ============================================================================
// Stream Topology
// ============================================================================

export interface StreamTopology {
  id: string;
  name: string;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  metadata?: Record<string, any>;
}

export interface TopologyNode {
  id: string;
  type: 'source' | 'processor' | 'sink';
  label: string;
  config: any;
  parallelism?: number;
  position?: { x: number; y: number };
}

export interface TopologyEdge {
  id: string;
  from: string;
  to: string;
  partitioning?: 'round-robin' | 'hash' | 'broadcast' | 'custom';
  partitionKey?: string;
}

// ============================================================================
// Time Characteristics
// ============================================================================

export type TimeCharacteristic = 'event-time' | 'processing-time' | 'ingestion-time';

export interface TimeConfig {
  characteristic: TimeCharacteristic;
  watermark?: WatermarkConfig;
  timestampExtractor?: (event: StreamEvent) => number;
}

// ============================================================================
// Partitioning Strategy
// ============================================================================

export type PartitionStrategy = 'round-robin' | 'hash' | 'range' | 'random' | 'custom';

export interface PartitionConfig {
  strategy: PartitionStrategy;
  partitionCount?: number;
  keyExtractor?: (event: StreamEvent) => string;
  customPartitioner?: (event: StreamEvent, partitionCount: number) => number;
}

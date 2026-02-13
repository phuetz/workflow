/**
 * Kafka Integration Types
 * Shared types and interfaces for Kafka integration modules
 */

// ============================================================================
// Basic Types
// ============================================================================

export type KafkaKey = string | number | Buffer | Record<string, unknown> | null
export type KafkaValue = string | number | Buffer | Record<string, unknown> | null
export type KafkaAggregate = Record<string, unknown> | number | string | null
export type CompressionTypes = 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd'
export type PartitionerType = 'default' | 'random' | 'consistent' | 'murmur2' | 'custom'
export type LogLevel = 'NOTHING' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'
export type CompatibilityLevel =
  | 'NONE'
  | 'BACKWARD'
  | 'BACKWARD_TRANSITIVE'
  | 'FORWARD'
  | 'FORWARD_TRANSITIVE'
  | 'FULL'
  | 'FULL_TRANSITIVE'

// ============================================================================
// Configuration Interfaces
// ============================================================================

export interface KafkaConfig {
  clientId: string
  brokers: string[]
  ssl?: {
    rejectUnauthorized?: boolean
    ca?: string
    cert?: string
    key?: string
    passphrase?: string
  }
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512' | 'aws'
    username?: string
    password?: string
    authorizationIdentity?: string
    accessKeyId?: string
    secretAccessKey?: string
    sessionToken?: string
  }
  connectionTimeout?: number
  authenticationTimeout?: number
  reauthenticationThreshold?: number
  requestTimeout?: number
  enforceRequestTimeout?: boolean
  retry?: RetryOptions
  logLevel?: LogLevel
}

export interface RetryOptions {
  maxRetryTime?: number
  initialRetryTime?: number
  factor?: number
  multiplier?: number
  retries?: number
}

export interface ProducerConfig {
  id: string
  name: string
  kafka: KafkaConfig
  allowAutoTopicCreation?: boolean
  transactionalId?: string
  maxInFlightRequests?: number
  idempotent?: boolean
  compression?: CompressionTypes
  acks?: number | 'all'
  timeout?: number
  retry?: RetryOptions
  batch?: BatchConfig
  partitioner?: PartitionerType
  customPartitioner?: (topic: string, key: KafkaKey, value: KafkaValue) => number
}

export interface ConsumerConfig {
  id: string
  name: string
  groupId: string
  kafka: KafkaConfig
  topics: string[] | TopicPattern
  fromBeginning?: boolean
  sessionTimeout?: number
  heartbeatInterval?: number
  rebalanceTimeout?: number
  maxBytesPerPartition?: number
  minBytes?: number
  maxBytes?: number
  maxWaitTimeInMs?: number
  maxInFlightRequests?: number
  rackId?: string
  retry?: RetryOptions
  readUncommitted?: boolean
  maxPollRecords?: number
  autoCommit?: boolean
  autoCommitInterval?: number
  eachBatchAutoResolve?: boolean
  partitionsConsumedConcurrently?: number
}

export interface StreamConfig {
  id: string
  name: string
  kafka: KafkaConfig
  applicationId: string
  stateDir?: string
  replicationFactor?: number
  topology: TopologyBuilder
  processing: {
    guarantee: 'at_least_once' | 'exactly_once'
    cache?: {
      maxBytes?: number
      commitInterval?: number
    }
    metrics?: {
      enabled: boolean
      recordLevel?: 'INFO' | 'DEBUG'
    }
  }
}

export interface TopicConfig {
  topic: string
  numPartitions?: number
  replicationFactor?: number
  replicaAssignment?: ReplicaAssignment[]
  configEntries?: ConfigEntry[]
}

export interface BatchConfig {
  size?: number
  lingerMs?: number
}

export interface TopicPattern {
  type: 'regex' | 'prefix' | 'suffix'
  pattern: string
}

export interface ReplicaAssignment {
  partition: number
  replicas: number[]
}

export interface ConfigEntry {
  name: string
  value: string
}

// ============================================================================
// Message Interfaces
// ============================================================================

export interface ProducerRecord {
  topic: string
  messages: Message[]
  acks?: number
  timeout?: number
  compression?: CompressionTypes
}

export interface Message {
  key?: Buffer | string | null
  value: Buffer | string | null
  partition?: number
  timestamp?: string
  headers?: MessageHeaders
}

export interface ConsumerMessage {
  topic: string
  partition: number
  message: {
    offset: string
    size: number
    timestamp: string
    key: Buffer | null
    value: Buffer | null
    headers?: MessageHeaders
    attributes?: number
  }
}

export interface MessageHeaders {
  [key: string]: Buffer | string | undefined
}

export interface RecordMetadata {
  topicName: string
  partition: number
  errorCode: number
  offset: string
  timestamp: string
  baseOffset?: string
  logAppendTime?: string
  logStartOffset?: string
}

// ============================================================================
// Consumer Interfaces
// ============================================================================

export interface ConsumerRunHandler {
  eachMessage?: (payload: ConsumerMessage) => Promise<void>
  eachBatch?: (payload: { batch: Batch }) => Promise<void>
}

export interface TopicPartition {
  topic: string
  partition: number
}

export interface TopicPartitions {
  topic: string
  partitions?: number[]
}

export interface SeekParams {
  topic: string
  partition: number
  offset: string
}

export interface EachMessagePayload {
  topic: string
  partition: number
  message: ConsumerMessage['message']
  heartbeat(): Promise<void>
  pause(): () => void
}

export interface EachBatchPayload {
  batch: Batch
  resolveOffset(offset: string): void
  heartbeat(): Promise<void>
  pause(): () => void
  commitOffsetsIfNecessary(offsets?: OffsetsByTopic): Promise<void>
  uncommittedOffsets(): OffsetsByTopic
  isRunning(): boolean
  isStale(): boolean
}

export interface Batch {
  topic: string
  partition: number
  messages: ConsumerMessage[]
  offsetLag: string
  offsetLagLow: string
  offsetLagHigh: string
  highWatermark: string
  isEmpty(): boolean
  firstOffset(): string
  lastOffset(): string
  uncommittedOffsets(): OffsetsByPartition
}

export interface OffsetsByPartition {
  [partition: number]: string
}

export interface OffsetsByTopic {
  [topic: string]: OffsetsByPartition
}

// ============================================================================
// Transaction Interfaces
// ============================================================================

export interface Transaction {
  send(record: ProducerRecord): Promise<void>
  sendOffsets(offsets: OffsetsByTopic, consumerGroupId: string): Promise<void>
  commit(): Promise<void>
  abort(): Promise<void>
  isActive(): boolean
}

// ============================================================================
// Schema Registry Interfaces
// ============================================================================

export interface SchemaRegistry {
  url: string
  auth?: {
    username: string
    password: string
  }
  cache?: {
    ttl: number
    size: number
  }
}

export interface Schema {
  id?: number
  version?: number
  subject: string
  schema: string
  schemaType?: 'AVRO' | 'JSON' | 'PROTOBUF'
  compatibility?: CompatibilityLevel
  references?: SchemaReference[]
}

export interface SchemaReference {
  name: string
  subject: string
  version: number
}

// ============================================================================
// Stream Processing Interfaces
// ============================================================================

export interface TopologyBuilder {
  source(topics: string[], name?: string): StreamNode
  processor(name: string, processor: StreamProcessor, parents: string[]): StreamNode
  sink(topic: string, parents: string[], name?: string): StreamNode
  branch(predicate: (key: KafkaKey, value: KafkaValue) => boolean, names: string[]): StreamNode[]
  merge(streams: StreamNode[]): StreamNode
  table(topic: string, materialized?: MaterializedOptions): KTable
  globalTable(topic: string, materialized?: MaterializedOptions): GlobalKTable
}

export interface StreamNode {
  name: string
  type: 'source' | 'processor' | 'sink'
  process(record: StreamRecord): Promise<void>
  forward(record: StreamRecord, childName?: string): void
}

export interface StreamProcessor {
  init(context: ProcessorContext): void
  process(key: KafkaKey, value: KafkaValue): Promise<void>
  close(): void
}

export interface ProcessorContext {
  applicationId: string
  taskId: string
  forward(key: KafkaKey, value: KafkaValue, childName?: string): void
  commit(): Promise<void>
  schedule(interval: number, callback: () => void): void
  getStateStore(name: string): StateStore
  metrics(): StreamMetrics
}

export interface StreamRecord {
  key: KafkaKey
  value: KafkaValue
  timestamp: number
  topic?: string
  partition?: number
  offset?: string
  headers?: MessageHeaders
}

export interface KTable {
  name: string
  filter(predicate: (key: KafkaKey, value: KafkaValue) => boolean): KTable
  mapValues(mapper: (value: KafkaValue) => KafkaValue): KTable
  join(other: KTable, joiner: (v1: KafkaValue, v2: KafkaValue) => KafkaValue): KTable
  leftJoin(other: KTable, joiner: (v1: KafkaValue, v2: KafkaValue) => KafkaValue): KTable
  aggregate(
    initializer: () => KafkaAggregate,
    aggregator: (key: KafkaKey, value: KafkaValue, aggregate: KafkaAggregate) => KafkaAggregate
  ): KTable
  toStream(): KStream
}

export interface GlobalKTable extends KTable {
  queryableStoreName: string
}

export interface KStream {
  name: string
  filter(predicate: (key: KafkaKey, value: KafkaValue) => boolean): KStream
  map(mapper: (key: KafkaKey, value: KafkaValue) => [KafkaKey, KafkaValue]): KStream
  flatMap(mapper: (key: KafkaKey, value: KafkaValue) => Array<[KafkaKey, KafkaValue]>): KStream
  branch(predicates: Array<(key: KafkaKey, value: KafkaValue) => boolean>): KStream[]
  merge(stream: KStream): KStream
  peek(action: (key: KafkaKey, value: KafkaValue) => void): KStream
  foreach(action: (key: KafkaKey, value: KafkaValue) => void): void
  to(topic: string, produced?: ProducedOptions): void
  groupByKey(): KGroupedStream
  groupBy(selector: (key: KafkaKey, value: KafkaValue) => KafkaKey): KGroupedStream
}

export interface KGroupedStream {
  count(materialized?: MaterializedOptions): KTable
  reduce(
    reducer: (v1: KafkaValue, v2: KafkaValue) => KafkaValue,
    materialized?: MaterializedOptions
  ): KTable
  aggregate(
    initializer: () => KafkaAggregate,
    aggregator: (key: KafkaKey, value: KafkaValue, aggregate: KafkaAggregate) => KafkaAggregate,
    materialized?: MaterializedOptions
  ): KTable
  windowedBy(windows: WindowOptions): TimeWindowedKStream
}

export interface TimeWindowedKStream {
  count(materialized?: MaterializedOptions): KTable
  reduce(
    reducer: (v1: KafkaValue, v2: KafkaValue) => KafkaValue,
    materialized?: MaterializedOptions
  ): KTable
  aggregate(
    initializer: () => KafkaAggregate,
    aggregator: (key: KafkaKey, value: KafkaValue, aggregate: KafkaAggregate) => KafkaAggregate,
    materialized?: MaterializedOptions
  ): KTable
}

export interface WindowOptions {
  size: number
  grace?: number
  retentionPeriod?: number
}

export interface MaterializedOptions {
  storeName: string
  keySerde?: Serde
  valueSerde?: Serde
  loggingEnabled?: boolean
  cachingEnabled?: boolean
  retentionPeriod?: number
}

export interface ProducedOptions {
  keySerde?: Serde
  valueSerde?: Serde
  partitioner?: (topic: string, key: KafkaKey, value: KafkaValue) => number
  streamPartitioner?: (topic: string, key: KafkaKey, value: KafkaValue) => number
}

export interface StateStore {
  name: string
  persistent: boolean
  get(key: KafkaKey): KafkaValue
  put(key: KafkaKey, value: KafkaValue): void
  delete(key: KafkaKey): void
  all(): Array<[KafkaKey, KafkaValue]>
  range(from: KafkaKey, to: KafkaKey): Array<[KafkaKey, KafkaValue]>
  flush(): void
  close(): void
}

export interface Serde {
  serializer: Serializer
  deserializer: Deserializer
}

export interface Serializer {
  serialize(topic: string, data: KafkaValue): Buffer
}

export interface Deserializer {
  deserialize(topic: string, data: Buffer): KafkaValue
}

export interface StreamMetrics {
  recordsProcessed: number
  recordsSkipped: number
  commitTime: number
  pollTime: number
  processTime: number
  punctuateTime: number
  taskCreatedTime: number
  taskClosedTime: number
}

// ============================================================================
// Admin Interfaces
// ============================================================================

export interface AdminClient {
  createTopics(topics: TopicConfig[]): Promise<void>
  deleteTopics(topics: string[]): Promise<void>
  listTopics(): Promise<string[]>
  describeTopics(topics: string[]): Promise<TopicDescription[]>
  createPartitions(topicPartitions: TopicPartitionSpec[]): Promise<void>
  describeCluster(): Promise<ClusterDescription>
  describeConfigs(resources: ConfigResource[]): Promise<ConfigDescription[]>
  alterConfigs(configs: ConfigResourceUpdate[]): Promise<void>
  listConsumerGroups(): Promise<ConsumerGroupListing[]>
  describeConsumerGroups(groupIds: string[]): Promise<ConsumerGroupDescription[]>
  deleteConsumerGroups(groupIds: string[]): Promise<void>
  listOffsets(topicPartitions: TopicPartitionOffset[]): Promise<OffsetInfo[]>
  alterConsumerGroupOffsets(groupId: string, offsets: OffsetsByTopic): Promise<void>
}

export interface TopicDescription {
  name: string
  internal: boolean
  partitions: PartitionInfo[]
}

export interface PartitionInfo {
  partition: number
  leader: number
  replicas: number[]
  isr: number[]
  offlineReplicas?: number[]
}

export interface TopicPartitionSpec {
  topic: string
  count: number
  assignments?: ReplicaAssignment[]
}

export interface ClusterDescription {
  clusterId: string
  controller: number
  brokers: BrokerInfo[]
}

export interface BrokerInfo {
  nodeId: number
  host: string
  port: number
  rack?: string
}

export interface ConfigResource {
  type: 'broker' | 'topic'
  name: string
  configNames?: string[]
}

export interface ConfigDescription {
  resources: Array<{
    type: string
    name: string
    configEntries: ConfigEntry[]
  }>
}

export interface ConfigResourceUpdate {
  type: 'broker' | 'topic'
  name: string
  configEntries: ConfigEntry[]
}

export interface ConsumerGroupListing {
  groupId: string
  isSimpleConsumerGroup: boolean
  state?: string
}

export interface ConsumerGroupDescription {
  groupId: string
  isSimpleConsumerGroup: boolean
  members: MemberDescription[]
  state: string
  coordinator: BrokerInfo
  partitionAssignor?: string
}

export interface MemberDescription {
  memberId: string
  clientId: string
  host: string
  assignment: MemberAssignment[]
}

export interface MemberAssignment {
  topic: string
  partitions: number[]
}

export interface TopicPartitionOffset {
  topic: string
  partition: number
  timestamp?: number
}

export interface OffsetInfo {
  topic: string
  partition: number
  offset: string
  timestamp?: number
}

// ============================================================================
// Metrics Interfaces
// ============================================================================

export interface KafkaMetrics {
  producers: Map<string, ProducerMetrics>
  consumers: Map<string, ConsumerMetrics>
  streams: Map<string, StreamProcessorMetrics>
  connections: ConnectionMetrics
  errors: ErrorMetrics
}

export interface ProducerMetrics {
  messagesSent: number
  bytesSent: number
  sendErrors: number
  sendLatency: LatencyMetrics
  batchSize: number
  compressionRatio: number
  recordQueueTime: LatencyMetrics
}

export interface ConsumerMetrics {
  messagesConsumed: number
  bytesConsumed: number
  consumeErrors: number
  lag: number
  commitLatency: LatencyMetrics
  fetchLatency: LatencyMetrics
  rebalances: number
  lastCommitTime?: Date
}

export interface StreamProcessorMetrics {
  recordsProcessed: number
  recordsSkipped: number
  processingLatency: LatencyMetrics
  stateStoreSize: number
  punctuations: number
  taskExceptions: number
}

export interface ConnectionMetrics {
  activeConnections: number
  connectionErrors: number
  reconnects: number
  avgConnectionTime: number
}

export interface ErrorMetrics {
  totalErrors: number
  timeouts: number
  authErrors: number
  serializationErrors: number
  networkErrors: number
  lastError?: {
    timestamp: Date
    message: string
    type: string
  }
}

export interface LatencyMetrics {
  min: number
  max: number
  avg: number
  p50: number
  p95: number
  p99: number
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  producers: number
  consumers: number
  streams: number
  timestamp?: number
}

/**
 * Kafka Integration System - Facade
 * Enterprise-grade streaming platform integration for workflow automation
 * Supports producers, consumers, streams, transactions, and schema registry
 *
 * This file serves as a facade that re-exports from modular components.
 * For direct access to modules, import from './kafka'
 */

import { EventEmitter } from 'events'
import * as crypto from 'crypto'
import {
  KafkaProducer,
  KafkaTransaction,
  KafkaStreamProcessor,
  KafkaTopologyBuilder
} from './kafka/KafkaProducer'
import {
  KafkaConsumer,
  SchemaRegistryClient,
  MonitoringService,
  HealthChecker
} from './kafka/KafkaConsumer'
import { KafkaAdminClient } from './kafka/KafkaAdmin'
import {
  KafkaConfig,
  ProducerConfig,
  ConsumerConfig,
  StreamConfig,
  TopicConfig,
  ProducerRecord,
  RecordMetadata,
  Transaction,
  TopicPattern,
  TopicPartitions,
  SchemaRegistry,
  Schema,
  CompatibilityLevel,
  TopologyBuilder,
  AdminClient,
  TopicDescription,
  ClusterDescription,
  ConsumerGroupListing,
  ConsumerGroupDescription,
  OffsetsByTopic,
  KafkaMetrics,
  LatencyMetrics,
  Message,
  EachMessagePayload,
  EachBatchPayload,
  HealthCheckResult
} from './kafka/types'

// Re-export all types for backward compatibility
export * from './kafka/types'

// Re-export modules for direct access
export * from './kafka/KafkaProducer'
export * from './kafka/KafkaConsumer'
export * from './kafka/KafkaAdmin'

/**
 * Main Kafka Integration System Facade Class
 * Maintains backward compatibility with existing API
 */
export class KafkaIntegrationSystem extends EventEmitter {
  private static instance: KafkaIntegrationSystem

  private producers: Map<string, KafkaProducer>
  private consumers: Map<string, KafkaConsumer>
  private streams: Map<string, KafkaStreamProcessor>
  private adminClient: AdminClient
  private schemaRegistry: SchemaRegistryClient
  private transactions: Map<string, Transaction>
  private metrics: KafkaMetrics
  private monitoring: MonitoringService
  private healthChecker: HealthChecker

  private constructor() {
    super()
    this.producers = new Map()
    this.consumers = new Map()
    this.streams = new Map()
    this.transactions = new Map()
    this.metrics = this.initializeMetrics()
    this.adminClient = new KafkaAdminClient()
    this.schemaRegistry = new SchemaRegistryClient()
    this.monitoring = new MonitoringService(this.metrics)
    this.healthChecker = new HealthChecker()

    this.setupEventHandlers()
    this.startMonitoring()
  }

  public static getInstance(): KafkaIntegrationSystem {
    if (!KafkaIntegrationSystem.instance) {
      KafkaIntegrationSystem.instance = new KafkaIntegrationSystem()
    }
    return KafkaIntegrationSystem.instance
  }

  // ============================================================================
  // Producer Operations
  // ============================================================================

  public async createProducer(config: ProducerConfig): Promise<KafkaProducer> {
    const producer = new KafkaProducer(config)
    await producer.connect()
    this.producers.set(config.id, producer)
    this.emit('producerCreated', { id: config.id, name: config.name })
    return producer
  }

  public async send(producerId: string, record: ProducerRecord): Promise<RecordMetadata[]> {
    const producer = this.producers.get(producerId)
    if (!producer) throw new Error(`Producer ${producerId} not found`)

    try {
      const metadata = await producer.send(record)
      this.updateProducerMetrics(producerId, record, true)
      this.emit('messageSent', { producerId, topic: record.topic, metadata })
      return metadata
    } catch (error) {
      this.updateProducerMetrics(producerId, record, false)
      this.emit('sendError', { producerId, error })
      throw error
    }
  }

  public async sendBatch(producerId: string, records: ProducerRecord[]): Promise<RecordMetadata[][]> {
    const producer = this.producers.get(producerId)
    if (!producer) throw new Error(`Producer ${producerId} not found`)
    return producer.sendBatch(records)
  }

  public async transaction(producerId: string): Promise<Transaction> {
    const producer = this.producers.get(producerId)
    if (!producer) throw new Error(`Producer ${producerId} not found`)

    const transaction = await producer.transaction()
    const transactionId = crypto.randomBytes(16).toString('hex')
    this.transactions.set(transactionId, transaction)
    return transaction
  }

  // ============================================================================
  // Consumer Operations
  // ============================================================================

  public async createConsumer(config: ConsumerConfig): Promise<KafkaConsumer> {
    const consumer = new KafkaConsumer(config)
    await consumer.connect()
    this.consumers.set(config.id, consumer)
    this.emit('consumerCreated', { id: config.id, groupId: config.groupId })
    return consumer
  }

  public async subscribe(consumerId: string, topics: string[] | TopicPattern): Promise<void> {
    const consumer = this.consumers.get(consumerId)
    if (!consumer) throw new Error(`Consumer ${consumerId} not found`)
    await consumer.subscribe(topics)
    this.emit('subscribed', { consumerId, topics })
  }

  public async run(
    consumerId: string,
    handler: {
      eachMessage?: (payload: EachMessagePayload) => Promise<void>
      eachBatch?: (payload: EachBatchPayload) => Promise<void>
    }
  ): Promise<void> {
    const consumer = this.consumers.get(consumerId)
    if (!consumer) throw new Error(`Consumer ${consumerId} not found`)
    await consumer.run(handler as any)
    this.emit('consumerRunning', { consumerId })
  }

  public async pause(consumerId: string, topics: TopicPartitions[]): Promise<void> {
    const consumer = this.consumers.get(consumerId)
    if (!consumer) throw new Error(`Consumer ${consumerId} not found`)
    await consumer.pause(topics)
    this.emit('consumerPaused', { consumerId, topics })
  }

  public async resume(consumerId: string, topics: TopicPartitions[]): Promise<void> {
    const consumer = this.consumers.get(consumerId)
    if (!consumer) throw new Error(`Consumer ${consumerId} not found`)
    await consumer.resume(topics)
    this.emit('consumerResumed', { consumerId, topics })
  }

  public async seek(consumerId: string, topic: string, partition: number, offset: string): Promise<void> {
    const consumer = this.consumers.get(consumerId)
    if (!consumer) throw new Error(`Consumer ${consumerId} not found`)
    await consumer.seek({ topic, partition, offset })
    this.emit('seeked', { consumerId, topic, partition, offset })
  }

  // ============================================================================
  // Stream Processing
  // ============================================================================

  public async createStream(config: StreamConfig): Promise<KafkaStreamProcessor> {
    const stream = new KafkaStreamProcessor(config)
    await stream.start()
    this.streams.set(config.id, stream)
    this.emit('streamCreated', { id: config.id, applicationId: config.applicationId })
    return stream
  }

  public getTopologyBuilder(): TopologyBuilder {
    return new KafkaTopologyBuilder()
  }

  public async stopStream(streamId: string): Promise<void> {
    const stream = this.streams.get(streamId)
    if (!stream) throw new Error(`Stream ${streamId} not found`)
    await stream.stop()
    this.streams.delete(streamId)
    this.emit('streamStopped', { streamId })
  }

  // ============================================================================
  // Schema Registry
  // ============================================================================

  public configureSchemaRegistry(config: SchemaRegistry): void {
    this.schemaRegistry.configure(config)
    this.emit('schemaRegistryConfigured', config)
  }

  public async registerSchema(schema: Schema): Promise<number> {
    const id = await this.schemaRegistry.register(schema)
    this.emit('schemaRegistered', { subject: schema.subject, id })
    return id
  }

  public async getSchema(id: number): Promise<Schema> {
    return this.schemaRegistry.getById(id)
  }

  public async getLatestSchema(subject: string): Promise<Schema> {
    return this.schemaRegistry.getLatest(subject)
  }

  public async checkCompatibility(subject: string, schema: string): Promise<boolean> {
    return this.schemaRegistry.checkCompatibility(subject, schema)
  }

  public async evolveSchema(subject: string, schema: string, compatibility?: CompatibilityLevel): Promise<number> {
    const id = await this.schemaRegistry.evolve(subject, schema, compatibility)
    this.emit('schemaEvolved', { subject, id })
    return id
  }

  // ============================================================================
  // Admin Operations
  // ============================================================================

  public async createTopics(topics: TopicConfig[]): Promise<void> {
    await this.adminClient.createTopics(topics)
    this.emit('topicsCreated', { topics: topics.map((t) => t.topic) })
  }

  public async deleteTopics(topics: string[]): Promise<void> {
    await this.adminClient.deleteTopics(topics)
    this.emit('topicsDeleted', { topics })
  }

  public async listTopics(): Promise<string[]> {
    return this.adminClient.listTopics()
  }

  public async describeTopics(topics: string[]): Promise<TopicDescription[]> {
    return this.adminClient.describeTopics(topics)
  }

  public async describeCluster(): Promise<ClusterDescription> {
    return this.adminClient.describeCluster()
  }

  public async listConsumerGroups(): Promise<ConsumerGroupListing[]> {
    return this.adminClient.listConsumerGroups()
  }

  public async describeConsumerGroups(groupIds: string[]): Promise<ConsumerGroupDescription[]> {
    return this.adminClient.describeConsumerGroups(groupIds)
  }

  public async alterConsumerGroupOffsets(groupId: string, offsets: OffsetsByTopic): Promise<void> {
    await this.adminClient.alterConsumerGroupOffsets(groupId, offsets)
    this.emit('offsetsAltered', { groupId, offsets })
  }

  // ============================================================================
  // Monitoring & Health
  // ============================================================================

  private setupEventHandlers(): void {
    this.on('messageSent', (data) => this.monitoring.recordProducerEvent(data))
    this.on('messageConsumed', (data) => this.monitoring.recordConsumerEvent(data))
    this.on('recordProcessed', (data) => this.monitoring.recordStreamEvent(data))
    this.on('error', (error) => this.monitoring.recordError(error))
  }

  private startMonitoring(): void {
    setInterval(() => {
      this.monitoring.collectMetrics()
      this.emit('metricsCollected', this.metrics)
    }, 10000)

    setInterval(() => {
      this.healthChecker.checkHealth(this).then((health) => {
        this.emit('healthChecked', health)
      })
    }, 30000)
  }

  private initializeMetrics(): KafkaMetrics {
    return {
      producers: new Map(),
      consumers: new Map(),
      streams: new Map(),
      connections: { activeConnections: 0, connectionErrors: 0, reconnects: 0, avgConnectionTime: 0 },
      errors: { totalErrors: 0, timeouts: 0, authErrors: 0, serializationErrors: 0, networkErrors: 0 }
    }
  }

  private updateProducerMetrics(producerId: string, record: ProducerRecord, success: boolean): void {
    let metrics = this.metrics.producers.get(producerId)
    if (!metrics) {
      metrics = {
        messagesSent: 0,
        bytesSent: 0,
        sendErrors: 0,
        sendLatency: this.createLatencyMetrics(),
        batchSize: 0,
        compressionRatio: 0,
        recordQueueTime: this.createLatencyMetrics()
      }
      this.metrics.producers.set(producerId, metrics)
    }

    if (success) {
      metrics.messagesSent += record.messages.length
      metrics.bytesSent += this.calculateBytes(record.messages)
    } else {
      metrics.sendErrors++
    }
  }

  private createLatencyMetrics(): LatencyMetrics {
    return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 }
  }

  private calculateBytes(messages: Message[]): number {
    return messages.reduce((total, msg) => {
      const keySize = msg.key ? Buffer.from(msg.key).length : 0
      const valueSize = msg.value ? Buffer.from(msg.value).length : 0
      return total + keySize + valueSize
    }, 0)
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  public async disconnect(): Promise<void> {
    for (const [id, producer] of Array.from(this.producers.entries())) {
      await producer.disconnect()
      this.producers.delete(id)
    }

    for (const [id, consumer] of Array.from(this.consumers.entries())) {
      await consumer.disconnect()
      this.consumers.delete(id)
    }

    for (const [id, stream] of Array.from(this.streams.entries())) {
      await stream.stop()
      this.streams.delete(id)
    }

    this.emit('disconnected')
  }

  public getMetrics(): KafkaMetrics {
    return { ...this.metrics }
  }

  public getProducers(): Map<string, KafkaProducer> {
    return new Map(this.producers)
  }

  public getConsumers(): Map<string, KafkaConsumer> {
    return new Map(this.consumers)
  }

  public getStreams(): Map<string, KafkaStreamProcessor> {
    return new Map(this.streams)
  }
}

// Export singleton instance
export const kafkaIntegration = KafkaIntegrationSystem.getInstance()

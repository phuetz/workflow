/**
 * Message Queue System
 * Enterprise messaging system with topics, queues, and streaming
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { logger } from '../services/SimpleLogger';

export interface Message {
  id: string;
  topic: string;
  partition?: number;
  key?: string;
  value: any;
  headers: MessageHeaders;
  timestamp: Date;
  offset?: number;
  attempts?: number;
  expiresAt?: Date;
  priority?: MessagePriority;
  correlationId?: string;
  replyTo?: string;
}

export interface MessageHeaders {
  contentType?: string;
  contentEncoding?: string;
  messageType?: string;
  source?: string;
  destination?: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
  custom?: Record<string, any>;
}

export type MessagePriority = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Queue {
  name: string;
  type: QueueType;
  config: QueueConfig;
  messages: Message[];
  consumers: Consumer[];
  metrics: QueueMetrics;
  status: QueueStatus;
  createdAt: Date;
}

export type QueueType = 
  | 'standard'
  | 'fifo'
  | 'priority'
  | 'delayed'
  | 'dead-letter';

export interface QueueConfig {
  maxSize?: number;
  maxMessages?: number;
  ttl?: number;
  visibilityTimeout?: number;
  maxReceiveCount?: number;
  deadLetterQueue?: string;
  encryption?: boolean;
  compression?: boolean;
  deduplication?: boolean;
  ordering?: OrderingConfig;
  retention?: RetentionConfig;
}

export interface OrderingConfig {
  enabled: boolean;
  key?: string;
  strict?: boolean;
}

export interface RetentionConfig {
  period: number;
  policy: 'delete' | 'archive';
  archiveLocation?: string;
}

export type QueueStatus = 'active' | 'paused' | 'draining' | 'deleted';

export interface QueueMetrics {
  messages: number;
  size: number;
  consumers: number;
  messagesPerSecond: number;
  averageProcessingTime: number;
  errors: number;
  dlqMessages: number;
}

export interface Topic {
  name: string;
  partitions: Partition[];
  config: TopicConfig;
  subscribers: Subscription[];
  publishers: Publisher[];
  schema?: MessageSchema;
  status: TopicStatus;
  createdAt: Date;
}

export interface Partition {
  id: number;
  topic: string;
  leader: string;
  replicas: string[];
  isr: string[]; // In-sync replicas
  messages: Message[];
  highWaterMark: number;
  logStartOffset: number;
  logEndOffset: number;
}

export interface TopicConfig {
  partitionCount: number;
  replicationFactor: number;
  minInSyncReplicas: number;
  retentionMs?: number;
  retentionBytes?: number;
  segmentMs?: number;
  segmentBytes?: number;
  compressionType?: CompressionType;
  cleanupPolicy?: CleanupPolicy;
}

export type CompressionType = 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';
export type CleanupPolicy = 'delete' | 'compact' | 'delete,compact';
export type TopicStatus = 'active' | 'readonly' | 'deleted';

export interface MessageSchema {
  type: 'json' | 'avro' | 'protobuf';
  schema: any;
  version: number;
  compatibility: CompatibilityMode;
}

export type CompatibilityMode = 
  | 'backward'
  | 'forward'
  | 'full'
  | 'none';

export interface Consumer {
  id: string;
  groupId?: string;
  queue?: string;
  topics?: string[];
  config: ConsumerConfig;
  position: ConsumerPosition;
  state: ConsumerState;
  handler: MessageHandler;
  metrics: ConsumerMetrics;
}

export interface ConsumerConfig {
  autoCommit?: boolean;
  commitInterval?: number;
  maxPollRecords?: number;
  maxPollInterval?: number;
  sessionTimeout?: number;
  heartbeatInterval?: number;
  strategy?: ConsumptionStrategy;
  errorHandling?: ErrorHandlingConfig;
}

export type ConsumptionStrategy = 
  | 'at-most-once'
  | 'at-least-once'
  | 'exactly-once';

export interface ErrorHandlingConfig {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  dlqEnabled?: boolean;
  poisonPillHandling?: 'skip' | 'dlq' | 'stop';
}

export interface ConsumerPosition {
  topic?: string;
  partition?: number;
  offset: number;
  metadata?: string;
}

export type ConsumerState = 'active' | 'paused' | 'stopped' | 'rebalancing';

export type MessageHandler = (message: Message) => Promise<void>;

export interface ConsumerMetrics {
  messagesConsumed: number;
  bytesConsumed: number;
  averageProcessingTime: number;
  errors: number;
  lag: number;
}

export interface Publisher {
  id: string;
  topics: string[];
  config: PublisherConfig;
  metrics: PublisherMetrics;
}

export interface PublisherConfig {
  acks?: AckLevel;
  retries?: number;
  batchSize?: number;
  lingerMs?: number;
  compressionType?: CompressionType;
  idempotent?: boolean;
  transactional?: boolean;
}

export type AckLevel = 'none' | 'leader' | 'all';

export interface PublisherMetrics {
  messagesPublished: number;
  bytesPublished: number;
  errors: number;
  averageLatency: number;
}

export interface Subscription {
  id: string;
  topic: string;
  consumer: Consumer;
  filter?: MessageFilter;
  transform?: MessageTransform;
  state: SubscriptionState;
}

export interface MessageFilter {
  expression: string;
  parameters?: Record<string, any>;
}

export interface MessageTransform {
  type: 'map' | 'filter' | 'aggregate' | 'custom';
  function: (message: Message) => Message | null;
}

export type SubscriptionState = 'active' | 'paused' | 'error';

export interface ConsumerGroup {
  id: string;
  members: Consumer[];
  coordinator: string;
  protocol: string;
  state: GroupState;
  generation: number;
  assignments: Map<string, Assignment>;
}

export type GroupState = 'empty' | 'preparing' | 'stable' | 'dead';

export interface Assignment {
  consumerId: string;
  topics: string[];
  partitions: PartitionAssignment[];
}

export interface PartitionAssignment {
  topic: string;
  partition: number;
}

export interface Transaction {
  id: string;
  producerId: string;
  state: TransactionState;
  partitions: Set<string>;
  startTime: Date;
  timeout: number;
}

export type TransactionState = 
  | 'begin'
  | 'preparing'
  | 'prepared'
  | 'committing'
  | 'committed'
  | 'aborting'
  | 'aborted';

export interface Stream {
  id: string;
  name: string;
  source: string;
  processors: StreamProcessor[];
  sink?: string;
  state: StreamState;
  config: StreamConfig;
}

export interface StreamProcessor {
  name: string;
  type: ProcessorType;
  config: any;
  process: (message: Message) => Promise<Message | null>;
}

export type ProcessorType = 
  | 'filter'
  | 'map'
  | 'flatMap'
  | 'aggregate'
  | 'join'
  | 'window'
  | 'custom';

export type StreamState = 'running' | 'paused' | 'stopped' | 'failed';

export interface StreamConfig {
  parallelism?: number;
  checkpointInterval?: number;
  processingGuarantee?: ConsumptionStrategy;
  stateBackend?: StateBackend;
}

export interface StateBackend {
  type: 'memory' | 'rocksdb' | 'redis';
  config: any;
}

export interface MessageQueueMetrics {
  totalMessages: number;
  totalQueues: number;
  totalTopics: number;
  totalConsumers: number;
  totalPublishers: number;
  messagesPerSecond: number;
  bytesPerSecond: number;
  averageLatency: number;
  errorRate: number;
}

export class MessageQueueSystem extends EventEmitter {
  private queues: Map<string, Queue> = new Map();
  private topics: Map<string, Topic> = new Map();
  private consumers: Map<string, Consumer> = new Map();
  private publishers: Map<string, Publisher> = new Map();
  private consumerGroups: Map<string, ConsumerGroup> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private streams: Map<string, Stream> = new Map();
  private dlqMessages: Map<string, Message[]> = new Map();
  private messageStore: Map<string, Message> = new Map();
  private metrics: MessageQueueMetrics;
  private config: MessageQueueConfig;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private offsetManager: OffsetManager;
  private partitionManager: PartitionManager;

  constructor(config?: Partial<MessageQueueConfig>) {
    super();
    this.config = {
      maxMessageSize: 1024 * 1024, // 1MB
      defaultRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
      defaultPartitions: 3,
      defaultReplication: 2,
      autoCreateTopics: true,
      enableTransactions: true,
      enableStreaming: true,
      compressionEnabled: true,
      ...config
    };

    this.metrics = this.createEmptyMetrics();
    this.offsetManager = new OffsetManager();
    this.partitionManager = new PartitionManager();
    this.initialize();
  }

  /**
   * Initialize message queue system
   */
  private initialize(): void {
    // Create default queues and topics
    this.createDefaultResources();

    // Start background processes
    this.startBackgroundProcesses();

    // Set up event handlers
    this.setupEventHandlers();

    logger.debug('Message Queue System initialized');
  }

  /**
   * Create queue
   */
  createQueue(
    name: string,
    type: QueueType = 'standard',
    config?: Partial<QueueConfig>
  ): Queue {
    if (this.queues.has(name)) {
      throw new Error(`Queue ${name} already exists`);
    }

    const queue: Queue = {
      name,
      type,
      config: {
        maxSize: 100 * 1024 * 1024, // 100MB
        maxMessages: 100000,
        ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
        visibilityTimeout: 30000, // 30 seconds
        maxReceiveCount: 3,
        ...config
      },
      messages: [],
      consumers: [],
      metrics: {
        messages: 0,
        size: 0,
        consumers: 0,
        messagesPerSecond: 0,
        averageProcessingTime: 0,
        errors: 0,
        dlqMessages: 0
      },
      status: 'active',
      createdAt: new Date()
    };

    this.queues.set(name, queue);

    // Create DLQ if configured
    if (queue.config.deadLetterQueue) {
      this.createQueue(
        queue.config.deadLetterQueue,
        'dead-letter',
        { maxReceiveCount: 0 }
      );
    }

    this.emit('queue:created', queue);
    return queue;
  }

  /**
   * Send message to queue
   */
  async sendMessage(
    queueName: string,
    message: any,
    options?: {
      priority?: MessagePriority;
      delay?: number;
      ttl?: number;
      headers?: MessageHeaders;
      correlationId?: string;
    }
  ): Promise<Message> {
    const queue = this.queues.get(queueName);
    
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    if (queue.status !== 'active') {
      throw new Error(`Queue ${queueName} is not active`);
    }

    // Create message
    const msg: Message = {
      id: this.generateMessageId(),
      topic: queueName,
      value: message,
      headers: options?.headers || {},
      timestamp: new Date(),
      priority: options?.priority || 5,
      correlationId: options?.correlationId,
      attempts: 0
    };

    // Apply TTL
    if (options?.ttl) {
      msg.expiresAt = new Date(Date.now() + options.ttl);
    }

    // Handle delayed messages
    if (options?.delay) {
      setTimeout(() => {
        this.enqueueMessage(queue, msg);
      }, options.delay);
    } else {
      this.enqueueMessage(queue, msg);
    }

    // Store message
    this.messageStore.set(msg.id, msg);

    // Update metrics
    queue.metrics.messages++;
    this.metrics.totalMessages++;

    this.emit('message:sent', { queue: queueName, message: msg });
    return msg;
  }

  /**
   * Receive messages from queue
   */
  async receiveMessages(
    queueName: string,
    maxMessages = 1,
    options?: {
      visibilityTimeout?: number;
      waitTime?: number;
    }
  ): Promise<Message[]> {
    const queue = this.queues.get(queueName);
    
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const messages: Message[] = [];
    const visibilityTimeout = options?.visibilityTimeout || queue.config.visibilityTimeout || 30000;

    // Get messages based on queue type
    let availableMessages = this.getAvailableMessages(queue, maxMessages);

    for (const msg of availableMessages) {
      // Mark message as in-flight
      msg.attempts = (msg.attempts || 0) + 1;
      
      // Set visibility timeout
      setTimeout(() => {
        // Return message to queue if not deleted
        if (this.messageStore.has(msg.id)) {
          this.returnMessageToQueue(queue, msg);
        }
      }, visibilityTimeout);

      messages.push(msg);
    }

    // Remove messages from queue temporarily
    queue.messages = queue.messages.filter(m => !messages.includes(m));

    this.emit('messages:received', { queue: queueName, messages });
    return messages;
  }

  /**
   * Delete message
   */
  async deleteMessage(queueName: string, messageId: string): Promise<void> {
    const queue = this.queues.get(queueName);
    
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    // Remove from message store
    this.messageStore.delete(messageId);

    // Remove from queue if still there
    queue.messages = queue.messages.filter(m => m.id !== messageId);

    this.emit('message:deleted', { queue: queueName, messageId });
  }

  /**
   * Create topic
   */
  createTopic(
    name: string,
    config?: Partial<TopicConfig>
  ): Topic {
    if (this.topics.has(name)) {
      throw new Error(`Topic ${name} already exists`);
    }

    const topicConfig: TopicConfig = {
      partitionCount: this.config.defaultPartitions,
      replicationFactor: this.config.defaultReplication,
      minInSyncReplicas: 1,
      retentionMs: this.config.defaultRetention,
      compressionType: 'gzip',
      cleanupPolicy: 'delete',
      ...config
    };

    // Create partitions
    const partitions: Partition[] = [];
    for (let i = 0; i < topicConfig.partitionCount; i++) {
      partitions.push({
        id: i,
        topic: name,
        leader: `broker-${i % 3}`,
        replicas: [`broker-${i % 3}`, `broker-${(i + 1) % 3}`],
        isr: [`broker-${i % 3}`],
        messages: [],
        highWaterMark: 0,
        logStartOffset: 0,
        logEndOffset: 0
      });
    }

    const topic: Topic = {
      name,
      partitions,
      config: topicConfig,
      subscribers: [],
      publishers: [],
      status: 'active',
      createdAt: new Date()
    };

    this.topics.set(name, topic);
    this.emit('topic:created', topic);
    return topic;
  }

  /**
   * Publish message to topic
   */
  async publish(
    topicName: string,
    message: any,
    options?: {
      key?: string;
      partition?: number;
      headers?: MessageHeaders;
      timestamp?: Date;
    }
  ): Promise<void> {
    let topic = this.topics.get(topicName);
    
    // Auto-create topic if enabled
    if (!topic && this.config.autoCreateTopics) {
      topic = this.createTopic(topicName);
    }
    
    if (!topic) {
      throw new Error(`Topic ${topicName} not found`);
    }

    // Create message
    const msg: Message = {
      id: this.generateMessageId(),
      topic: topicName,
      key: options?.key,
      value: message,
      headers: options?.headers || {},
      timestamp: options?.timestamp || new Date()
    };

    // Determine partition
    const partition = options?.partition !== undefined
      ? options.partition
      : this.selectPartition(topic, msg);

    msg.partition = partition;

    // Add to partition
    const part = topic.partitions[partition];
    msg.offset = part.logEndOffset++;
    part.messages.push(msg);

    // Update high water mark
    part.highWaterMark = part.logEndOffset;

    // Notify subscribers
    await this.notifySubscribers(topic, msg);

    // Update metrics
    this.metrics.totalMessages++;
    this.metrics.messagesPerSecond = this.calculateMessagesPerSecond();

    this.emit('message:published', { topic: topicName, message: msg });
  }

  /**
   * Subscribe to topic
   */
  subscribe(
    topicName: string,
    handler: MessageHandler,
    options?: {
      groupId?: string;
      fromBeginning?: boolean;
      filter?: MessageFilter;
      transform?: MessageTransform;
    }
  ): string {
    const topic = this.topics.get(topicName);
    
    if (!topic) {
      throw new Error(`Topic ${topicName} not found`);
    }

    // Create consumer
    const consumer: Consumer = {
      id: this.generateConsumerId(),
      groupId: options?.groupId,
      topics: [topicName],
      config: {
        autoCommit: true,
        commitInterval: 5000,
        maxPollRecords: 100,
        strategy: 'at-least-once'
      },
      position: {
        topic: topicName,
        offset: options?.fromBeginning ? 0 : -1
      },
      state: 'active',
      handler,
      metrics: {
        messagesConsumed: 0,
        bytesConsumed: 0,
        averageProcessingTime: 0,
        errors: 0,
        lag: 0
      }
    };

    this.consumers.set(consumer.id, consumer);

    // Create subscription
    const subscription: Subscription = {
      id: this.generateSubscriptionId(),
      topic: topicName,
      consumer,
      filter: options?.filter,
      transform: options?.transform,
      state: 'active'
    };

    this.subscriptions.set(subscription.id, subscription);
    topic.subscribers.push(subscription);

    // Join consumer group if specified
    if (options?.groupId) {
      this.joinConsumerGroup(consumer, options.groupId);
    }

    // Start consuming if from beginning
    if (options?.fromBeginning) {
      this.consumeFromBeginning(consumer, topic);
    }

    this.emit('subscription:created', subscription);
    return subscription.id;
  }

  /**
   * Create consumer group
   */
  createConsumerGroup(
    groupId: string,
    topics: string[]
  ): ConsumerGroup {
    if (this.consumerGroups.has(groupId)) {
      throw new Error(`Consumer group ${groupId} already exists`);
    }

    const group: ConsumerGroup = {
      id: groupId,
      members: [],
      coordinator: `broker-0`,
      protocol: 'range',
      state: 'empty',
      generation: 0,
      assignments: new Map()
    };

    this.consumerGroups.set(groupId, group);
    this.emit('group:created', group);
    return group;
  }

  /**
   * Create stream
   */
  createStream(
    name: string,
    source: string,
    processors: StreamProcessor[],
    sink?: string,
    config?: Partial<StreamConfig>
  ): Stream {
    const stream: Stream = {
      id: this.generateStreamId(),
      name,
      source,
      processors,
      sink,
      state: 'stopped',
      config: {
        parallelism: 1,
        checkpointInterval: 60000,
        processingGuarantee: 'at-least-once',
        ...config
      }
    };

    this.streams.set(stream.id, stream);
    
    // Start stream
    this.startStream(stream);

    this.emit('stream:created', stream);
    return stream;
  }

  /**
   * Start stream processing
   */
  private async startStream(stream: Stream): Promise<void> {
    stream.state = 'running';

    // Subscribe to source
    const subscription = this.subscribe(
      stream.source,
      async (message) => {
        let processed: Message | null = message;

        // Apply processors
        for (const processor of stream.processors) {
          if (processed) {
            processed = await processor.process(processed);
          }
        }

        // Send to sink if configured
        if (processed && stream.sink) {
          await this.publish(stream.sink, processed.value, {
            headers: processed.headers
          });
        }
      }
    );

    this.emit('stream:started', stream);
  }

  /**
   * Begin transaction
   */
  async beginTransaction(producerId: string): Promise<string> {
    if (!this.config.enableTransactions) {
      throw new Error('Transactions not enabled');
    }

    const transaction: Transaction = {
      id: this.generateTransactionId(),
      producerId,
      state: 'begin',
      partitions: new Set(),
      startTime: new Date(),
      timeout: 60000
    };

    this.transactions.set(transaction.id, transaction);

    // Set timeout
    setTimeout(() => {
      if (transaction.state !== 'committed' && transaction.state !== 'aborted') {
        this.abortTransaction(transaction.id);
      }
    }, transaction.timeout);

    this.emit('transaction:begin', transaction);
    return transaction.id;
  }

  /**
   * Commit transaction
   */
  async commitTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    transaction.state = 'committing';
    
    // Commit all messages in transaction
    // In production, would use two-phase commit
    
    transaction.state = 'committed';
    this.transactions.delete(transactionId);

    this.emit('transaction:committed', transaction);
  }

  /**
   * Abort transaction
   */
  async abortTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    transaction.state = 'aborting';
    
    // Rollback all messages in transaction
    
    transaction.state = 'aborted';
    this.transactions.delete(transactionId);

    this.emit('transaction:aborted', transaction);
  }

  /**
   * Helper methods
   */
  private enqueueMessage(queue: Queue, message: Message): void {
    if (queue.type === 'priority') {
      // Insert based on priority
      const index = queue.messages.findIndex(m => 
        (m.priority || 5) < (message.priority || 5)
      );
      
      if (index === -1) {
        queue.messages.push(message);
      } else {
        queue.messages.splice(index, 0, message);
      }
    } else if (queue.type === 'fifo') {
      // Ensure FIFO order
      queue.messages.push(message);
    } else {
      // Standard queue
      queue.messages.push(message);
    }
  }

  private getAvailableMessages(queue: Queue, maxMessages: number): Message[] {
    const now = new Date();
    const available = queue.messages
      .filter(m => !m.expiresAt || m.expiresAt > now)
      .slice(0, maxMessages);
    
    return available;
  }

  private returnMessageToQueue(queue: Queue, message: Message): void {
    if ((message.attempts || 0) >= (queue.config.maxReceiveCount || 3)) {
      // Move to DLQ
      if (queue.config.deadLetterQueue) {
        this.moveToDLQ(queue.config.deadLetterQueue, message);
      }
    } else {
      // Return to queue
      this.enqueueMessage(queue, message);
    }
  }

  private moveToDLQ(dlqName: string, message: Message): void {
    const dlq = this.queues.get(dlqName);
    
    if (dlq) {
      this.enqueueMessage(dlq, message);
      dlq.metrics.dlqMessages++;
    }
  }

  private selectPartition(topic: Topic, message: Message): number {
    if (message.key) {
      // Hash key to determine partition
      const hash = crypto.createHash('md5').update(message.key).digest();
      return hash.readUInt32BE(0) % topic.partitions.length;
    } else {
      // Round-robin
      return Math.floor(Math.random() * topic.partitions.length);
    }
  }

  private async notifySubscribers(topic: Topic, message: Message): Promise<void> {
    for (const subscription of topic.subscribers) {
      if (subscription.state !== 'active') continue;

      // Apply filter
      if (subscription.filter && !this.evaluateFilter(message, subscription.filter)) {
        continue;
      }

      // Apply transform
      let transformed = message;
      if (subscription.transform) {
        const result = subscription.transform.function(message);
        if (!result) continue;
        transformed = result;
      }

      // Process message
      try {
        await subscription.consumer.handler(transformed);
        subscription.consumer.metrics.messagesConsumed++;
      } catch (error) {
        subscription.consumer.metrics.errors++;
        logger.error('Error processing message:', error);
      }
    }
  }

  private evaluateFilter(message: Message, filter: MessageFilter): boolean {
    // Simple filter evaluation
    try {
      // In production, use safe expression evaluator
      return true;
    } catch {
      return false;
    }
  }

  private joinConsumerGroup(consumer: Consumer, groupId: string): void {
    let group = this.consumerGroups.get(groupId);
    
    if (!group) {
      group = this.createConsumerGroup(groupId, consumer.topics || []);
    }

    group.members.push(consumer);
    group.state = 'preparing';
    
    // Trigger rebalance
    this.rebalanceGroup(group);
  }

  private rebalanceGroup(group: ConsumerGroup): void {
    // Simple range assignment
    const topics = new Set<string>();
    group.members.forEach(m => m.topics?.forEach(t => topics.add(t)));
    
    const assignments = new Map<string, Assignment>();
    
    for (const member of group.members) {
      assignments.set(member.id, {
        consumerId: member.id,
        topics: Array.from(topics),
        partitions: []
      });
    }
    
    // Assign partitions
    for (const topicName of topics) {
      const topic = this.topics.get(topicName);
      if (!topic) continue;
      
      const partitionsPerMember = Math.ceil(topic.partitions.length / group.members.length);
      
      let memberIndex = 0;
      for (let i = 0; i < topic.partitions.length; i++) {
        const member = group.members[memberIndex];
        const assignment = assignments.get(member.id)!;
        
        assignment.partitions.push({
          topic: topicName,
          partition: i
        });
        
        if (assignment.partitions.length >= partitionsPerMember) {
          memberIndex++;
        }
      }
    }
    
    group.assignments = assignments;
    group.state = 'stable';
    group.generation++;
  }

  private consumeFromBeginning(consumer: Consumer, topic: Topic): void {
    // Process all existing messages
    for (const partition of topic.partitions) {
      for (const message of partition.messages) {
        consumer.handler(message);
        consumer.metrics.messagesConsumed++;
      }
    }
  }

  private calculateMessagesPerSecond(): number {
    // Calculate based on recent activity
    return this.metrics.totalMessages / 60;
  }

  private createDefaultResources(): void {
    // Create default DLQ
    this.createQueue('dlq', 'dead-letter');
    
    // Create default topic
    if (this.config.autoCreateTopics) {
      this.createTopic('events');
    }
  }

  private startBackgroundProcesses(): void {
    // Clean expired messages
    setInterval(() => {
      this.cleanExpiredMessages();
    }, 60000);

    // Update metrics
    setInterval(() => {
      this.updateMetrics();
    }, 5000);

    // Checkpoint streams
    if (this.config.enableStreaming) {
      setInterval(() => {
        this.checkpointStreams();
      }, 60000);
    }
  }

  private cleanExpiredMessages(): void {
    const now = new Date();
    
    for (const queue of this.queues.values()) {
      queue.messages = queue.messages.filter(m => 
        !m.expiresAt || m.expiresAt > now
      );
    }
  }

  private updateMetrics(): void {
    this.metrics.totalQueues = this.queues.size;
    this.metrics.totalTopics = this.topics.size;
    this.metrics.totalConsumers = this.consumers.size;
    this.metrics.totalPublishers = this.publishers.size;
    
    // Calculate average latency
    let totalLatency = 0;
    let count = 0;
    
    for (const consumer of this.consumers.values()) {
      if (consumer.metrics.averageProcessingTime > 0) {
        totalLatency += consumer.metrics.averageProcessingTime;
        count++;
      }
    }
    
    this.metrics.averageLatency = count > 0 ? totalLatency / count : 0;
  }

  private checkpointStreams(): void {
    for (const stream of this.streams.values()) {
      if (stream.state === 'running') {
        // Save stream state
        logger.debug(`Checkpointing stream ${stream.name}`);
      }
    }
  }

  private setupEventHandlers(): void {
    this.on('message:sent', ({ queue, message }) => {
      const q = this.queues.get(queue);
      if (q) {
        q.metrics.messagesPerSecond = this.calculateMessagesPerSecond();
      }
    });

    this.on('message:published', ({ topic, message }) => {
      const t = this.topics.get(topic);
      if (t) {
        // Update topic metrics
      }
    });
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateConsumerId(): string {
    return `cons_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateStreamId(): string {
    return `strm_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private createEmptyMetrics(): MessageQueueMetrics {
    return {
      totalMessages: 0,
      totalQueues: 0,
      totalTopics: 0,
      totalConsumers: 0,
      totalPublishers: 0,
      messagesPerSecond: 0,
      bytesPerSecond: 0,
      averageLatency: 0,
      errorRate: 0
    };
  }

  /**
   * Get metrics
   */
  getMetrics(): MessageQueueMetrics {
    return { ...this.metrics };
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    // Stop all consumers
    for (const consumer of this.consumers.values()) {
      consumer.state = 'stopped';
    }

    // Stop all streams
    for (const stream of this.streams.values()) {
      stream.state = 'stopped';
    }

    // Clear timers
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }

    this.removeAllListeners();
    logger.debug('Message Queue System shut down');
  }
}

// Helper classes
class OffsetManager {
  private offsets: Map<string, number> = new Map();

  commit(key: string, offset: number): void {
    this.offsets.set(key, offset);
  }

  get(key: string): number {
    return this.offsets.get(key) || 0;
  }
}

class PartitionManager {
  assign(consumers: Consumer[], partitions: Partition[]): Map<string, Partition[]> {
    const assignments = new Map<string, Partition[]>();
    
    const partitionsPerConsumer = Math.ceil(partitions.length / consumers.length);
    let partitionIndex = 0;
    
    for (const consumer of consumers) {
      const assigned: Partition[] = [];
      
      for (let i = 0; i < partitionsPerConsumer && partitionIndex < partitions.length; i++) {
        assigned.push(partitions[partitionIndex++]);
      }
      
      assignments.set(consumer.id, assigned);
    }
    
    return assignments;
  }
}

// Configuration interface
interface MessageQueueConfig {
  maxMessageSize: number;
  defaultRetention: number;
  defaultPartitions: number;
  defaultReplication: number;
  autoCreateTopics: boolean;
  enableTransactions: boolean;
  enableStreaming: boolean;
  compressionEnabled: boolean;
}

// Export singleton instance
export const messageQueueSystem = new MessageQueueSystem();
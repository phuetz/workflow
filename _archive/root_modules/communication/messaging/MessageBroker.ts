import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export interface Message {
  id: string;
  topic: string;
  type: string;
  payload: unknown;
  metadata: {
    timestamp: number;
    version: string;
    source: string;
    traceId?: string;
    correlationId?: string;
    causationId?: string;
    tenantId?: string;
    userId?: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    retryCount: number;
    maxRetries: number;
    ttl?: number;
    contentType: 'application/json' | 'application/xml' | 'text/plain' | 'application/octet-stream';
    compression?: 'gzip' | 'deflate' | 'br';
    encryption?: {
      algorithm: string;
      keyId: string;
    };
  };
  headers: { [key: string]: string };
  routing: {
    exchange?: string;
    routingKey: string;
    replyTo?: string;
    expiration?: number;
  };
  persistence: {
    durable: boolean;
    persistent: boolean;
    deliveryMode: 1 | 2; // 1 = non-persistent, 2 = persistent
  };
}

export interface MessageSubscription {
  id: string;
  topic: string;
  filter?: MessageFilter;
  handler: MessageHandler;
  options: SubscriptionOptions;
  metadata: {
    createdAt: number;
    lastProcessed?: number;
    messageCount: number;
    errorCount: number;
    status: 'active' | 'paused' | 'disabled';
  };
}

export interface MessageFilter {
  type?: string[];
  source?: string[];
  priority?: ('low' | 'normal' | 'high' | 'critical')[];
  headers?: { [key: string]: string | string[] };
  payload?: {
    path: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'nin' | 'contains' | 'regex';
    value: unknown;
  }[];
  custom?: (message: Message) => boolean;
}

export interface MessageHandler {
  (message: Message, context: MessageContext): Promise<MessageResult>;
}

export interface MessageContext {
  subscription: MessageSubscription;
  broker: MessageBroker;
  retry: (delay?: number) => Promise<void>;
  deadletter: (reason: string) => Promise<void>;
  acknowledge: () => Promise<void>;
  reject: (requeue?: boolean) => Promise<void>;
  metadata: {
    deliveryTag: string;
    redelivered: boolean;
    timestamp: number;
    processingStarted: number;
  };
}

export interface MessageResult {
  status: 'success' | 'error' | 'retry' | 'skip';
  error?: Error;
  retryDelay?: number;
  data?: unknown;
}

export interface SubscriptionOptions {
  concurrency: number;
  prefetch: number;
  ackTimeout: number;
  retryPolicy: RetryPolicy;
  deadLetterQueue?: string;
  durableSubscription: boolean;
  autoAck: boolean;
  exclusive: boolean;
  priority?: number;
  arguments?: { [key: string]: unknown };
}

export interface RetryPolicy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  jitter: boolean;
  retryableErrors?: string[];
  nonRetryableErrors?: string[];
}

export interface Topic {
  name: string;
  config: TopicConfig;
  metadata: {
    createdAt: number;
    messageCount: number;
    subscriberCount: number;
    lastMessageAt?: number;
  };
}

export interface TopicConfig {
  partitions: number;
  replicationFactor: number;
  retention: {
    timeMs: number;
    bytes: number;
    segments: number;
  };
  compression: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';
  cleanup: 'delete' | 'compact';
  minInSyncReplicas: number;
  maxMessageBytes: number;
  routing: {
    strategy: 'round_robin' | 'hash' | 'sticky' | 'custom';
    partitioner?: (message: Message) => number;
  };
  schema?: {
    type: 'avro' | 'json' | 'protobuf';
    definition: string;
    validation: boolean;
  };
}

export interface MessageBatch {
  id: string;
  messages: Message[];
  metadata: {
    size: number;
    createdAt: number;
    timeout: number;
  };
}

export interface MessageQueue {
  name: string;
  type: 'direct' | 'fanout' | 'topic' | 'headers' | 'priority' | 'delayed';
  config: QueueConfig;
  stats: QueueStats;
}

export interface QueueConfig {
  durable: boolean;
  exclusive: boolean;
  autoDelete: boolean;
  maxLength?: number;
  maxLengthBytes?: number;
  messageTtl?: number;
  expires?: number;
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
  maxPriority?: number;
  arguments?: { [key: string]: unknown };
}

export interface QueueStats {
  messageCount: number;
  consumerCount: number;
  publishRate: number;
  deliveryRate: number;
  ackRate: number;
  unackedCount: number;
  readyCount: number;
  lastActivity: number;
}

export interface Exchange {
  name: string;
  type: 'direct' | 'fanout' | 'topic' | 'headers';
  config: ExchangeConfig;
  bindings: ExchangeBinding[];
}

export interface ExchangeConfig {
  durable: boolean;
  autoDelete: boolean;
  internal: boolean;
  arguments?: { [key: string]: unknown };
}

export interface ExchangeBinding {
  destination: string;
  destinationType: 'queue' | 'exchange';
  routingKey: string;
  arguments?: { [key: string]: unknown };
}

export interface BrokerConfig {
  transport: {
    type: 'amqp' | 'kafka' | 'redis' | 'nats' | 'inmemory';
    connection: {
      hosts: string[];
      port?: number;
      username?: string;
      password?: string;
      vhost?: string;
      ssl?: {
        enabled: boolean;
        cert?: string;
        key?: string;
        ca?: string;
        rejectUnauthorized?: boolean;
      };
      options?: { [key: string]: unknown };
    };
    pool: {
      min: number;
      max: number;
      acquireTimeoutMillis: number;
      createTimeoutMillis: number;
      destroyTimeoutMillis: number;
      idleTimeoutMillis: number;
      reapIntervalMillis: number;
    };
  };
  serialization: {
    defaultFormat: 'json' | 'msgpack' | 'avro' | 'protobuf';
    compression: boolean;
    encryption: {
      enabled: boolean;
      algorithm: string;
      keyRotation: number;
    };
  };
  routing: {
    defaultExchange: string;
    defaultTopic: string;
    partitioning: {
      strategy: 'round_robin' | 'hash' | 'consistent_hash';
      partitions: number;
    };
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    healthCheck: {
      enabled: boolean;
      interval: number;
      timeout: number;
    };
  };
  limits: {
    maxMessageSize: number;
    maxBatchSize: number;
    maxConcurrentMessages: number;
    maxQueueLength: number;
    rateLimiting: {
      enabled: boolean;
      requestsPerSecond: number;
      burst: number;
    };
  };
}

export class MessageBroker extends EventEmitter {
  private config: BrokerConfig;
  private subscriptions: Map<string, MessageSubscription> = new Map();
  private topics: Map<string, Topic> = new Map();
  private queues: Map<string, MessageQueue> = new Map();
  private exchanges: Map<string, Exchange> = new Map();
  private messageHistory: Map<string, Message> = new Map();
  private batchBuffer: Map<string, MessageBatch> = new Map();
  private processingMessages: Map<string, Message> = new Map();
  private connection: unknown = null;
  private channels: Map<string, unknown> = new Map();
  private isConnected = false;
  private isShuttingDown = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 5000;

  constructor(config: BrokerConfig) {
    super();
    this.config = config;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await this.establishConnection();
      await this.setupTopology();
      await this.startHealthChecks();
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      this.emit('connected');
      
    } catch (error) {
      this.emit('connection:error', error);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), this.reconnectInterval);
      } else {
        throw new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts`);
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    this.isShuttingDown = true;

    // Wait for processing messages to complete
    await this.waitForProcessingCompletion();

    // Close all channels
    for (const [name, channel] of this.channels.entries()) {
      try {
        await channel.close();
      } catch (error) {
        this.emit('channel:close:error', { name, error });
      }
    }

    // Close connection
    if (this.connection) {
      try {
        await this.connection.close();
      } catch (error) {
        this.emit('connection:close:error', error);
      }
    }

    this.isConnected = false;
    this.connection = null;
    this.channels.clear();

    this.emit('disconnected');
  }

  // Topic Management
  public async createTopic(name: string, config: TopicConfig): Promise<Topic> {
    if (this.topics.has(name)) {
      throw new Error(`Topic already exists: ${name}`);
    }

    const topic: Topic = {
      name,
      config,
      metadata: {
        createdAt: Date.now(),
        messageCount: 0,
        subscriberCount: 0
      }
    };

    // Create topic in transport layer
    await this.createTopicInTransport(topic);

    this.topics.set(name, topic);
    this.emit('topic:created', topic);
    
    return topic;
  }

  public async deleteTopic(name: string): Promise<void> {
    const topic = this.topics.get(name);
    if (!topic) {
      throw new Error(`Topic not found: ${name}`);
    }

    // Remove all subscriptions for this topic
    for (const [subId, subscription] of this.subscriptions.entries()) {
      if (subscription.topic === name) {
        await this.unsubscribe(subId);
      }
    }

    // Delete topic from transport layer
    await this.deleteTopicFromTransport(name);

    this.topics.delete(name);
    this.emit('topic:deleted', { name });
  }

  // Message Publishing
  public async publish(topic: string, type: string, payload: unknown, options: {
    headers?: { [key: string]: string };
    priority?: 'low' | 'normal' | 'high' | 'critical';
    ttl?: number;
    correlationId?: string;
    replyTo?: string;
    persistent?: boolean;
  } = {}): Promise<Message> {
    if (!this.isConnected) {
      throw new Error('Not connected to message broker');
    }

    const message: Message = {
      id: crypto.randomUUID(),
      topic,
      type,
      payload,
      metadata: {
        timestamp: Date.now(),
        version: '1.0',
        source: this.config.transport.connection.hosts[0] || 'unknown',
        correlationId: options.correlationId,
        priority: options.priority || 'normal',
        retryCount: 0,
        maxRetries: 3,
        ttl: options.ttl,
        contentType: 'application/json'
      },
      headers: options.headers || {},
      routing: {
        routingKey: topic,
        replyTo: options.replyTo
      },
      persistence: {
        durable: true,
        persistent: options.persistent !== false,
        deliveryMode: options.persistent !== false ? 2 : 1
      }
    };

    // Validate message
    await this.validateMessage(message);

    // Serialize and compress if needed
    const serializedMessage = await this.serializeMessage(message);

    // Publish to transport layer
    await this.publishToTransport(serializedMessage);

    // Update topic statistics
    const topicObj = this.topics.get(topic);
    if (topicObj) {
      topicObj.metadata.messageCount++;
      topicObj.metadata.lastMessageAt = Date.now();
    }

    // Store in history for debugging
    this.messageHistory.set(message.id, message);

    this.emit('message:published', message);
    return message;
  }

  public async publishBatch(messages: Array<{
    topic: string;
    type: string;
    payload: unknown;
    options?: unknown;
  }>): Promise<Message[]> {
    const publishedMessages: Message[] = [];

    for (const msg of messages) {
      try {
        const published = await this.publish(msg.topic, msg.type, msg.payload, msg.options);
        publishedMessages.push(published);
      } catch (error) {
        this.emit('batch:publish:error', { message: msg, error });
      }
    }

    this.emit('batch:published', { count: publishedMessages.length });
    return publishedMessages;
  }

  // Message Subscription
  public async subscribe(
    topic: string,
    handler: MessageHandler,
    options: Partial<SubscriptionOptions> = {}
  ): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Not connected to message broker');
    }

    const subscriptionId = crypto.randomUUID();
    const subscription: MessageSubscription = {
      id: subscriptionId,
      topic,
      handler,
      options: {
        concurrency: options.concurrency || 1,
        prefetch: options.prefetch || 10,
        ackTimeout: options.ackTimeout || 30000,
        retryPolicy: options.retryPolicy || {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 30000,
          backoffStrategy: 'exponential',
          jitter: true
        },
        deadLetterQueue: options.deadLetterQueue,
        durableSubscription: options.durableSubscription !== false,
        autoAck: options.autoAck !== false,
        exclusive: options.exclusive || false,
        priority: options.priority,
        arguments: options.arguments
      },
      metadata: {
        createdAt: Date.now(),
        messageCount: 0,
        errorCount: 0,
        status: 'active'
      }
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Create subscription in transport layer
    await this.createSubscriptionInTransport(subscription);

    // Update topic subscriber count
    const topicObj = this.topics.get(topic);
    if (topicObj) {
      topicObj.metadata.subscriberCount++;
    }

    this.emit('subscription:created', subscription);
    return subscriptionId;
  }

  public async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    // Cancel subscription in transport layer
    await this.cancelSubscriptionInTransport(subscription);

    this.subscriptions.delete(subscriptionId);

    // Update topic subscriber count
    const topicObj = this.topics.get(subscription.topic);
    if (topicObj) {
      topicObj.metadata.subscriberCount--;
    }

    this.emit('subscription:cancelled', subscription);
  }

  // Queue Management
  public async createQueue(name: string, config: QueueConfig): Promise<MessageQueue> {
    const queue: MessageQueue = {
      name,
      type: 'direct',
      config,
      stats: {
        messageCount: 0,
        consumerCount: 0,
        publishRate: 0,
        deliveryRate: 0,
        ackRate: 0,
        unackedCount: 0,
        readyCount: 0,
        lastActivity: Date.now()
      }
    };

    // Create queue in transport layer
    await this.createQueueInTransport(queue);

    this.queues.set(name, queue);
    this.emit('queue:created', queue);
    
    return queue;
  }

  public async deleteQueue(name: string, options: { ifEmpty?: boolean; ifUnused?: boolean } = {}): Promise<void> {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue not found: ${name}`);
    }

    await this.deleteQueueFromTransport(name, options);
    this.queues.delete(name);
    
    this.emit('queue:deleted', { name });
  }

  // Exchange Management
  public async createExchange(name: string, type: Exchange['type'], config: ExchangeConfig): Promise<Exchange> {
    const exchange: Exchange = {
      name,
      type,
      config,
      bindings: []
    };

    await this.createExchangeInTransport(exchange);
    this.exchanges.set(name, exchange);
    
    this.emit('exchange:created', exchange);
    return exchange;
  }

  public async bindQueue(exchange: string, queue: string, routingKey: string, args?: unknown): Promise<void> {
    await this.bindQueueInTransport(exchange, queue, routingKey, args);
    
    const exchangeObj = this.exchanges.get(exchange);
    if (exchangeObj) {
      exchangeObj.bindings.push({
        destination: queue,
        destinationType: 'queue',
        routingKey,
        arguments: args
      });
    }

    this.emit('binding:created', { exchange, queue, routingKey });
  }

  // Message Processing
  private async processMessage(message: Message, subscription: MessageSubscription): Promise<void> {
    const processingStarted = Date.now();
    const deliveryTag = crypto.randomUUID();
    
    this.processingMessages.set(message.id, message);

    const context: MessageContext = {
      subscription,
      broker: this,
      retry: async (delay?: number) => {
        message.metadata.retryCount++;
        if (delay) {
          setTimeout(() => this.processMessage(message, subscription), delay);
        } else {
          await this.processMessage(message, subscription);
        }
      },
      deadletter: async (reason: string) => {
        await this.sendToDeadLetter(message, subscription, reason);
      },
      acknowledge: async () => {
        await this.acknowledgeMessage(message, subscription);
      },
      reject: async (requeue: boolean = false) => {
        await this.rejectMessage(message, subscription, requeue);
      },
      metadata: {
        deliveryTag,
        redelivered: message.metadata.retryCount > 0,
        timestamp: message.metadata.timestamp,
        processingStarted
      }
    };

    try {
      // Check if message passes filters
      if (subscription.filter && !this.messagePassesFilter(message, subscription.filter)) {
        await context.acknowledge();
        return;
      }

      // Apply timeout
      const timeoutPromise = new Promise<MessageResult>((_, reject) => {
        setTimeout(() => reject(new Error('Message processing timeout')), subscription.options.ackTimeout);
      });

      const processingPromise = subscription.handler(message, context);
      const result = await Promise.race([processingPromise, timeoutPromise]);

      await this.handleMessageResult(result, message, subscription, context);

    } catch (error) {
      await this.handleMessageError(error, message, subscription, context);
    } finally {
      this.processingMessages.delete(message.id);
    }
  }

  private async handleMessageResult(
    result: MessageResult,
    message: Message,
    subscription: MessageSubscription,
    context: MessageContext
  ): Promise<void> {
    switch (result.status) {
      case 'success':
        await context.acknowledge();
        subscription.metadata.messageCount++;
        break;

      case 'error':
        if (message.metadata.retryCount < message.metadata.maxRetries) {
          const delay = this.calculateRetryDelay(message.metadata.retryCount, subscription.options.retryPolicy);
          await context.retry(delay);
        } else {
          await context.deadletter(result.error?.message || 'Max retries exceeded');
        }
        subscription.metadata.errorCount++;
        break;

      case 'retry':
        if (message.metadata.retryCount < message.metadata.maxRetries) {
          await context.retry(result.retryDelay);
        } else {
          await context.deadletter('Max retries exceeded');
        }
        break;

      case 'skip':
        await context.acknowledge();
        break;
    }
  }

  private async handleMessageError(
    error: Error,
    message: Message,
    subscription: MessageSubscription,
    context: MessageContext
  ): Promise<void> {
    subscription.metadata.errorCount++;

    const retryPolicy = subscription.options.retryPolicy;
    
    // Check if error is retryable
    const isRetryable = this.isErrorRetryable(error, retryPolicy);
    
    if (isRetryable && message.metadata.retryCount < message.metadata.maxRetries) {
      const delay = this.calculateRetryDelay(message.metadata.retryCount, retryPolicy);
      await context.retry(delay);
    } else {
      await context.deadletter(error.message);
    }

    this.emit('message:error', { message, subscription, error });
  }

  // Helper Methods
  private async establishConnection(): Promise<void> {
    switch (this.config.transport.type) {
      case 'amqp':
        await this.connectAMQP();
        break;
      case 'kafka':
        await this.connectKafka();
        break;
      case 'redis':
        await this.connectRedis();
        break;
      case 'nats':
        await this.connectNATS();
        break;
      case 'inmemory':
        await this.connectInMemory();
        break;
      default:
        throw new Error(`Unsupported transport type: ${this.config.transport.type}`);
    }
  }

  private async connectAMQP(): Promise<void> {
    // Mock AMQP connection
    console.log('Connecting to AMQP...');
    this.connection = { type: 'amqp', connected: true };
  }

  private async connectKafka(): Promise<void> {
    // Mock Kafka connection
    console.log('Connecting to Kafka...');
    this.connection = { type: 'kafka', connected: true };
  }

  private async connectRedis(): Promise<void> {
    // Mock Redis connection
    console.log('Connecting to Redis...');
    this.connection = { type: 'redis', connected: true };
  }

  private async connectNATS(): Promise<void> {
    // Mock NATS connection
    console.log('Connecting to NATS...');
    this.connection = { type: 'nats', connected: true };
  }

  private async connectInMemory(): Promise<void> {
    // Mock in-memory connection
    console.log('Using in-memory transport...');
    this.connection = { type: 'inmemory', connected: true };
  }

  private async setupTopology(): Promise<void> {
    // Create default exchanges and queues
    if (this.config.routing.defaultExchange) {
      await this.createExchange(this.config.routing.defaultExchange, 'topic', {
        durable: true,
        autoDelete: false,
        internal: false
      });
    }
  }

  private async startHealthChecks(): Promise<void> {
    if (!this.config.monitoring.healthCheck.enabled) return;

    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.emit('health:check:failed', error);
      }
    }, this.config.monitoring.healthCheck.interval);
  }

  private async performHealthCheck(): Promise<void> {
    // Check connection status
    if (!this.isConnected || !this.connection) {
      throw new Error('Connection not established');
    }

    // Check channel status
    for (const [name, channel] of this.channels.entries()) {
      if (!channel || channel.closed) {
        throw new Error(`Channel ${name} is closed`);
      }
    }

    this.emit('health:check:passed');
  }

  private async validateMessage(message: Message): Promise<void> {
    if (!message.topic) {
      throw new Error('Message topic is required');
    }

    if (!message.type) {
      throw new Error('Message type is required');
    }

    if (message.payload === undefined) {
      throw new Error('Message payload is required');
    }

    // Check message size
    const messageSize = JSON.stringify(message).length;
    if (messageSize > this.config.limits.maxMessageSize) {
      throw new Error(`Message size ${messageSize} exceeds limit ${this.config.limits.maxMessageSize}`);
    }

    // Validate schema if configured
    const topic = this.topics.get(message.topic);
    if (topic?.config.schema?.validation) {
      await this.validateMessageSchema(message, topic.config.schema);
    }
  }

  private async validateMessageSchema(message: Message, schema: NonNullable<TopicConfig['schema']>): Promise<void> {
    // Mock schema validation
    console.log(`Validating message against ${schema.type} schema`);
  }

  private async serializeMessage(message: Message): Promise<Buffer> {
    let serialized: Buffer;

    switch (this.config.serialization.defaultFormat) {
      case 'json':
        serialized = Buffer.from(JSON.stringify(message));
        break;
      case 'msgpack':
        // Mock msgpack serialization
        serialized = Buffer.from(JSON.stringify(message));
        break;
      default:
        serialized = Buffer.from(JSON.stringify(message));
    }

    // Apply compression if enabled
    if (this.config.serialization.compression) {
      // Mock compression
      console.log('Compressing message...');
    }

    // Apply encryption if enabled
    if (this.config.serialization.encryption.enabled) {
      // Mock encryption
      console.log('Encrypting message...');
    }

    return serialized;
  }

  private messagePassesFilter(message: Message, filter: MessageFilter): boolean {
    // Check type filter
    if (filter.type && !filter.type.includes(message.type)) {
      return false;
    }

    // Check source filter
    if (filter.source && !filter.source.includes(message.metadata.source)) {
      return false;
    }

    // Check priority filter
    if (filter.priority && !filter.priority.includes(message.metadata.priority)) {
      return false;
    }

    // Check header filters
    if (filter.headers) {
      for (const [key, expectedValue] of Object.entries(filter.headers)) {
        const actualValue = message.headers[key];
        if (Array.isArray(expectedValue)) {
          if (!expectedValue.includes(actualValue)) {
            return false;
          }
        } else if (actualValue !== expectedValue) {
          return false;
        }
      }
    }

    // Check payload filters
    if (filter.payload) {
      for (const payloadFilter of filter.payload) {
        const value = this.getNestedValue(message.payload, payloadFilter.path);
        if (!this.evaluateFilterCondition(value, payloadFilter.operator, payloadFilter.value)) {
          return false;
        }
      }
    }

    // Check custom filter
    if (filter.custom && !filter.custom(message)) {
      return false;
    }

    return true;
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private evaluateFilterCondition(value: unknown, operator: string, expected: unknown): boolean {
    switch (operator) {
      case 'eq':
        return value === expected;
      case 'ne':
        return value !== expected;
      case 'gt':
        return value > expected;
      case 'lt':
        return value < expected;
      case 'in':
        return Array.isArray(expected) && expected.includes(value);
      case 'nin':
        return Array.isArray(expected) && !expected.includes(value);
      case 'contains':
        return typeof value === 'string' && value.includes(expected);
      case 'regex':
        return typeof value === 'string' && new RegExp(expected).test(value);
      default:
        return false;
    }
  }

  private calculateRetryDelay(attemptNumber: number, policy: RetryPolicy): number {
    let delay: number;

    switch (policy.backoffStrategy) {
      case 'linear':
        delay = policy.baseDelay * (attemptNumber + 1);
        break;
      case 'exponential':
        delay = policy.baseDelay * Math.pow(2, attemptNumber);
        break;
      case 'fixed':
        delay = policy.baseDelay;
        break;
      default:
        delay = policy.baseDelay;
    }

    // Apply max delay limit
    delay = Math.min(delay, policy.maxDelay);

    // Apply jitter if enabled
    if (policy.jitter) {
      delay += Math.random() * (delay * 0.1);
    }

    return delay;
  }

  private isErrorRetryable(error: Error, policy: RetryPolicy): boolean {
    if (policy.nonRetryableErrors?.includes(error.name)) {
      return false;
    }

    if (policy.retryableErrors?.length) {
      return policy.retryableErrors.includes(error.name);
    }

    return true;
  }

  private async waitForProcessingCompletion(): Promise<void> {
    while (this.processingMessages.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Transport Layer Methods (Mock implementations)
  private async createTopicInTransport(topic: Topic): Promise<void> {
    console.log(`Creating topic: ${topic.name}`);
  }

  private async deleteTopicFromTransport(name: string): Promise<void> {
    console.log(`Deleting topic: ${name}`);
  }

  private async publishToTransport(message: Buffer): Promise<void> {
    console.log(`Publishing message: ${message.length} bytes`);
  }

  private async createSubscriptionInTransport(subscription: MessageSubscription): Promise<void> {
    console.log(`Creating subscription: ${subscription.id} for topic: ${subscription.topic}`);
  }

  private async cancelSubscriptionInTransport(subscription: MessageSubscription): Promise<void> {
    console.log(`Cancelling subscription: ${subscription.id}`);
  }

  private async createQueueInTransport(queue: MessageQueue): Promise<void> {
    console.log(`Creating queue: ${queue.name}`);
  }

  private async deleteQueueFromTransport(name: string, options: unknown): Promise<void> {
    console.log(`Deleting queue: ${name}`, options);
  }

  private async createExchangeInTransport(exchange: Exchange): Promise<void> {
    console.log(`Creating exchange: ${exchange.name} (${exchange.type})`);
  }

  private async bindQueueInTransport(exchange: string, queue: string, routingKey: string, _args?: unknown): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    console.log(`Binding queue ${queue} to exchange ${exchange} with routing key ${routingKey}`);
  }

  private async acknowledgeMessage(message: Message, _subscription: MessageSubscription): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    console.log(`Acknowledging message: ${message.id}`);
  }

  private async rejectMessage(message: Message, subscription: MessageSubscription, requeue: boolean): Promise<void> {
    console.log(`Rejecting message: ${message.id}, requeue: ${requeue}`);
  }

  private async sendToDeadLetter(message: Message, subscription: MessageSubscription, reason: string): Promise<void> {
    console.log(`Sending message ${message.id} to dead letter queue: ${reason}`);
  }

  // Public API
  public getTopic(name: string): Topic | undefined {
    return this.topics.get(name);
  }

  public getAllTopics(): Topic[] {
    return Array.from(this.topics.values());
  }

  public getSubscription(id: string): MessageSubscription | undefined {
    return this.subscriptions.get(id);
  }

  public getAllSubscriptions(): MessageSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  public getQueue(name: string): MessageQueue | undefined {
    return this.queues.get(name);
  }

  public getAllQueues(): MessageQueue[] {
    return Array.from(this.queues.values());
  }

  public getExchange(name: string): Exchange | undefined {
    return this.exchanges.get(name);
  }

  public getAllExchanges(): Exchange[] {
    return Array.from(this.exchanges.values());
  }

  public getStats(): {
    topics: { count: number; totalMessages: number };
    subscriptions: { count: number; active: number };
    queues: { count: number; totalMessages: number };
    exchanges: { count: number };
    processing: { current: number; completed: number };
    connection: { status: string; type: string };
  } {
    const topics = Array.from(this.topics.values());
    const subscriptions = Array.from(this.subscriptions.values());
    const queues = Array.from(this.queues.values());

    return {
      topics: {
        count: topics.length,
        totalMessages: topics.reduce((sum, t) => sum + t.metadata.messageCount, 0)
      },
      subscriptions: {
        count: subscriptions.length,
        active: subscriptions.filter(s => s.metadata.status === 'active').length
      },
      queues: {
        count: queues.length,
        totalMessages: queues.reduce((sum, q) => sum + q.stats.messageCount, 0)
      },
      exchanges: {
        count: this.exchanges.size
      },
      processing: {
        current: this.processingMessages.size,
        completed: this.messageHistory.size
      },
      connection: {
        status: this.isConnected ? 'connected' : 'disconnected',
        type: this.config.transport.type
      }
    };
  }
}

export default MessageBroker;
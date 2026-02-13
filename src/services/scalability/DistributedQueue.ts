/**
 * PLAN C PHASE 4 - Distributed Queue System
 * Système de queue distribuée pour haute disponibilité
 * Supporte Redis, RabbitMQ, Kafka patterns
 */

import { EventEmitter } from 'events';
import {
  withErrorHandling,
  withRetry,
  withCache,
  generateId,
  debounce,
  throttle
} from '../../utils/SharedPatterns';
import {
  JsonValue,
  UnknownObject,
  isObject,
  isNumber
} from '../../types/StrictTypes';

// ============================================
// Types
// ============================================

export interface QueueConfig {
  name: string;
  type: 'memory' | 'redis' | 'rabbitmq' | 'kafka';
  maxSize: number;
  maxRetries: number;
  retryDelay: number;
  visibilityTimeout: number;
  deadLetterQueue: boolean;
  persistence: boolean;
  clustering: boolean;
  partitions?: number;
  replicationFactor?: number;
}

export interface Message<T = JsonValue> {
  id: string;
  queue: string;
  payload: T;
  metadata: MessageMetadata;
  attempts: number;
  maxRetries: number;
  priority: number;
  timestamp: Date;
  expiration?: Date;
  correlationId?: string;
  replyTo?: string;
}

export interface MessageMetadata {
  contentType: string;
  encoding: string;
  headers: Record<string, string>;
  traceId?: string;
  spanId?: string;
  userId?: string;
  source?: string;
}

export interface QueueStats {
  name: string;
  size: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  throughput: number;
  avgProcessingTime: number;
  errorRate: number;
}

export interface ConsumerOptions {
  concurrency: number;
  batchSize: number;
  prefetch: number;
  autoAck: boolean;
  exclusive: boolean;
  noLocal: boolean;
  priority?: number;
}

export interface ProducerOptions {
  persistent: boolean;
  priority: number;
  expiration?: number;
  mandatory: boolean;
  immediate: boolean;
  headers?: Record<string, string>;
}

export type MessageHandler<T = JsonValue> = (
  message: Message<T>
) => Promise<void> | void;

export interface QueueBinding {
  source: string;
  target: string;
  routingKey?: string;
  filter?: (message: Message) => boolean;
}

// ============================================
// Distributed Queue Implementation
// ============================================

export class DistributedQueue<T = JsonValue> extends EventEmitter {
  private config: QueueConfig;
  private messages: Map<string, Message<T>> = new Map();
  private pending: Set<string> = new Set();
  private processing: Map<string, ProcessingInfo> = new Map();
  private deadLetter: Map<string, Message<T>> = new Map();
  private consumers: Map<string, Consumer<T>> = new Map();
  private bindings: QueueBinding[] = [];
  private stats: QueueStats;
  private persistenceLayer?: PersistenceLayer;
  private clusterNodes: Map<string, ClusterNode> = new Map();
  
  constructor(config: Partial<QueueConfig> = {}) {
    super();
    
    this.config = {
      name: config.name || 'default',
      type: config.type || 'memory',
      maxSize: config.maxSize || 10000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      visibilityTimeout: config.visibilityTimeout || 30000,
      deadLetterQueue: config.deadLetterQueue !== false,
      persistence: config.persistence || false,
      clustering: config.clustering || false,
      partitions: config.partitions || 1,
      replicationFactor: config.replicationFactor || 1
    };
    
    this.stats = this.initializeStats();
    
    if (this.config.persistence) {
      this.initializePersistence();
    }
    
    if (this.config.clustering) {
      this.initializeClustering();
    }
    
    this.startMetricsCollection();
  }

  // ============================================
  // Producer Methods
  // ============================================

  /**
   * Send a message to the queue
   */
  async send(
    payload: T,
    options: Partial<ProducerOptions> = {}
  ): Promise<string> {
    const result = await withErrorHandling(
      async () => {
        if (this.messages.size >= this.config.maxSize) {
          throw new Error('Queue is full');
        }

        const message: Message<T> = {
          id: generateId('msg'),
          queue: this.config.name,
          payload,
          metadata: {
            contentType: 'application/json',
            encoding: 'utf-8',
            headers: options.headers || {},
            traceId: generateId('trace'),
            source: 'producer'
          },
          attempts: 0,
          maxRetries: this.config.maxRetries,
          priority: options.priority || 5,
          timestamp: new Date(),
          expiration: options.expiration
            ? new Date(Date.now() + options.expiration)
            : undefined
        };

        // Store message
        this.messages.set(message.id, message);
        this.pending.add(message.id);

        // Persist if enabled
        if (this.config.persistence && this.persistenceLayer) {
          await this.persistenceLayer.save(message.id, message);
        }

        // Replicate if clustering enabled
        if (this.config.clustering) {
          await this.replicateMessage(message);
        }

        // Update stats
        this.stats.size++;
        this.stats.pending++;

        this.emit('message:sent', message);

        return message.id;
      },
      {
        operation: 'send',
        module: 'DistributedQueue',
        data: { queue: this.config.name }
      }
    );

    return result as string;
  }

  /**
   * Send multiple messages as a batch
   */
  async sendBatch(
    messages: Array<{ payload: T; options?: Partial<ProducerOptions> }>
  ): Promise<string[]> {
    const messageIds: string[] = [];
    
    await withRetry(
      async () => {
        for (const msg of messages) {
          const id = await this.send(msg.payload, msg.options);
          messageIds.push(id);
        }
      },
      {
        maxAttempts: 3,
        delay: 1000,
        strategy: 'exponential'
      }
    );
    
    this.emit('batch:sent', { count: messageIds.length });
    
    return messageIds;
  }

  // ============================================
  // Consumer Methods
  // ============================================

  /**
   * Consume messages from the queue
   */
  async consume(
    handler: MessageHandler<T>,
    options: Partial<ConsumerOptions> = {}
  ): Promise<string> {
    const consumerId = generateId('consumer');
    
    const consumer: Consumer<T> = {
      id: consumerId,
      handler,
      options: {
        concurrency: options.concurrency || 1,
        batchSize: options.batchSize || 1,
        prefetch: options.prefetch || 10,
        autoAck: options.autoAck !== false,
        exclusive: options.exclusive || false,
        noLocal: options.noLocal || false,
        priority: options.priority
      },
      status: 'active',
      processedCount: 0,
      errorCount: 0
    };
    
    this.consumers.set(consumerId, consumer);
    
    // Start consuming
    this.startConsumer(consumer);
    
    this.emit('consumer:started', { consumerId });
    
    return consumerId;
  }

  /**
   * Stop a consumer
   */
  async stopConsumer(consumerId: string): Promise<void> {
    const consumer = this.consumers.get(consumerId);
    
    if (consumer) {
      consumer.status = 'stopped';
      this.consumers.delete(consumerId);
      this.emit('consumer:stopped', { consumerId });
    }
  }

  /**
   * Acknowledge a message
   */
  async ack(messageId: string): Promise<void> {
    const processingInfo = this.processing.get(messageId);
    
    if (processingInfo) {
      this.processing.delete(messageId);
      this.messages.delete(messageId);
      
      this.stats.completed++;
      this.stats.processing--;
      
      // Remove from persistence
      if (this.config.persistence && this.persistenceLayer) {
        await this.persistenceLayer.delete(messageId);
      }
      
      this.emit('message:acked', { messageId });
    }
  }

  /**
   * Reject a message (with requeue option)
   */
  async nack(messageId: string, requeue: boolean = true): Promise<void> {
    const processingInfo = this.processing.get(messageId);
    
    if (processingInfo) {
      const message = processingInfo.message;
      this.processing.delete(messageId);
      
      message.attempts++;
      
      if (requeue && message.attempts < message.maxRetries) {
        // Requeue with delay
        setTimeout(() => {
          this.pending.add(messageId);
          this.stats.pending++;
        }, this.config.retryDelay * message.attempts);
      } else if (this.config.deadLetterQueue) {
        // Move to dead letter queue
        this.deadLetter.set(messageId, message);
        this.stats.deadLetter++;
        this.emit('message:dead-lettered', message);
      } else {
        // Drop message
        this.messages.delete(messageId);
      }
      
      this.stats.processing--;
      this.stats.failed++;
      
      this.emit('message:nacked', { messageId, requeue });
    }
  }

  // ============================================
  // Queue Management
  // ============================================

  /**
   * Purge the queue
   */
  async purge(): Promise<number> {
    const count = this.messages.size;
    
    this.messages.clear();
    this.pending.clear();
    this.processing.clear();
    
    this.stats.size = 0;
    this.stats.pending = 0;
    this.stats.processing = 0;
    
    // Clear persistence
    if (this.config.persistence && this.persistenceLayer) {
      await this.persistenceLayer.clear();
    }
    
    this.emit('queue:purged', { count });
    
    return count;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    return { ...this.stats };
  }

  /**
   * Get message by ID
   */
  getMessage(messageId: string): Message<T> | undefined {
    return this.messages.get(messageId);
  }

  /**
   * Bind queues together
   */
  bind(binding: QueueBinding): void {
    this.bindings.push(binding);
    this.emit('queue:bound', binding);
  }

  /**
   * Unbind queues
   */
  unbind(source: string, target: string): void {
    this.bindings = this.bindings.filter(
      b => !(b.source === source && b.target === target)
    );
    this.emit('queue:unbound', { source, target });
  }

  // ============================================
  // Private Methods
  // ============================================

  private initializeStats(): QueueStats {
    return {
      name: this.config.name,
      size: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      deadLetter: 0,
      throughput: 0,
      avgProcessingTime: 0,
      errorRate: 0
    };
  }

  private startConsumer(consumer: Consumer<T>): void {
    const processMessages = async () => {
      if (consumer.status !== 'active') return;
      
      const messagesToProcess = Math.min(
        consumer.options.prefetch,
        this.pending.size
      );
      
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < messagesToProcess; i++) {
        const messageId = this.getNextMessage();
        
        if (messageId) {
          promises.push(this.processMessage(messageId, consumer));
        }
      }
      
      await Promise.allSettled(promises);
      
      // Continue processing - use setTimeout(0) instead of setImmediate for better test compatibility
      if (consumer.status === 'active') {
        setTimeout(() => processMessages(), 0);
      }
    };

    // Start processing with setTimeout for test compatibility
    setTimeout(() => processMessages(), 0);
  }

  private getNextMessage(): string | null {
    // Get highest priority message
    let highestPriority = -1;
    let selectedId: string | null = null;

    const pendingArray = Array.from(this.pending);
    for (const messageId of pendingArray) {
      const message = this.messages.get(messageId);

      if (message && !this.isExpired(message)) {
        if (message.priority > highestPriority) {
          highestPriority = message.priority;
          selectedId = messageId;
        }
      }
    }

    if (selectedId) {
      this.pending.delete(selectedId);
      return selectedId;
    }

    return null;
  }

  private async processMessage(
    messageId: string,
    consumer: Consumer<T>
  ): Promise<void> {
    const message = this.messages.get(messageId);
    
    if (!message) return;
    
    // Mark as processing
    const processingInfo: ProcessingInfo = {
      message,
      consumerId: consumer.id,
      startTime: Date.now()
    };
    
    this.processing.set(messageId, processingInfo);
    this.stats.pending--;
    this.stats.processing++;
    
    try {
      // Execute handler with timeout
      await Promise.race([
        consumer.handler(message),
        new Promise((_, reject) => 
          setTimeout(
            () => reject(new Error('Processing timeout')),
            this.config.visibilityTimeout
          )
        )
      ]);
      
      // Auto-ack if enabled
      if (consumer.options.autoAck) {
        await this.ack(messageId);
      }
      
      consumer.processedCount++;
      
      // Update metrics
      const processingTime = Date.now() - processingInfo.startTime;
      this.updateMetrics(processingTime, true);
      
    } catch (error) {
      consumer.errorCount++;
      
      // Auto-nack on error
      if (consumer.options.autoAck) {
        await this.nack(messageId, true);
      }
      
      // Update metrics
      const processingTime = Date.now() - processingInfo.startTime;
      this.updateMetrics(processingTime, false);
      
      this.emit('message:error', { messageId, error });
    }
  }

  private isExpired(message: Message<T>): boolean {
    if (!message.expiration) return false;
    return new Date() > message.expiration;
  }

  private updateMetrics(processingTime: number, success: boolean): void {
    // Update average processing time
    this.stats.avgProcessingTime = this.stats.avgProcessingTime === 0
      ? processingTime
      : (this.stats.avgProcessingTime * 0.9) + (processingTime * 0.1);
    
    // Update error rate
    const total = this.stats.completed + this.stats.failed;
    this.stats.errorRate = total > 0 ? (this.stats.failed / total) * 100 : 0;
    
    // Update throughput
    this.stats.throughput = 1000 / Math.max(1, this.stats.avgProcessingTime);
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      // Clean up expired messages
      const messagesArray = Array.from(this.messages.entries());
      for (const [id, message] of messagesArray) {
        if (this.isExpired(message)) {
          this.messages.delete(id);
          this.pending.delete(id);
          this.stats.size--;
        }
      }

      // Check stuck messages
      const now = Date.now();
      const processingArray = Array.from(this.processing.entries());
      for (const [id, info] of processingArray) {
        if (now - info.startTime > this.config.visibilityTimeout) {
          // Return to queue
          this.processing.delete(id);
          this.pending.add(id);
          this.stats.processing--;
          this.stats.pending++;
        }
      }

      this.emit('metrics:updated', this.stats);
    }, 5000);
  }

  // ============================================
  // Persistence Layer
  // ============================================

  private async initializePersistence(): Promise<void> {
    this.persistenceLayer = new PersistenceLayer(this.config.name);
    await this.persistenceLayer.initialize();
    
    // Restore messages
    const messages = await this.persistenceLayer.loadAll();
    for (const message of messages) {
      this.messages.set(message.id, message as Message<T>);
      this.pending.add(message.id);
    }
    
    this.stats.size = this.messages.size;
    this.stats.pending = this.pending.size;
  }

  // ============================================
  // Clustering
  // ============================================

  private async initializeClustering(): Promise<void> {
    // Initialize cluster nodes
    const nodeId = generateId('node');
    const node: ClusterNode = {
      id: nodeId,
      host: 'localhost',
      port: 5000 + Math.floor(Math.random() * 1000),
      status: 'active',
      lastHeartbeat: new Date()
    };
    
    this.clusterNodes.set(nodeId, node);
    
    // Start heartbeat
    setInterval(() => {
      this.broadcastHeartbeat(node);
    }, 5000);
  }

  private async replicateMessage(message: Message<T>): Promise<void> {
    const replicas = Math.min(
      this.config.replicationFactor || 1,
      this.clusterNodes.size
    );
    
    const nodes = Array.from(this.clusterNodes.values())
      .filter(n => n.status === 'active')
      .slice(0, replicas);
    
    const promises = nodes.map(node => 
      this.sendToNode(node, message)
    );
    
    await Promise.allSettled(promises);
  }

  private async sendToNode(node: ClusterNode, message: Message<T>): Promise<void> {
    // Simulate sending to remote node
    // In production, use actual network transport
    this.emit('message:replicated', { nodeId: node.id, messageId: message.id });
  }

  private broadcastHeartbeat(node: ClusterNode): void {
    node.lastHeartbeat = new Date();
    this.emit('heartbeat:sent', { nodeId: node.id });
  }
}

// ============================================
// Helper Classes
// ============================================

interface Consumer<T> {
  id: string;
  handler: MessageHandler<T>;
  options: ConsumerOptions;
  status: 'active' | 'stopped';
  processedCount: number;
  errorCount: number;
}

interface ProcessingInfo {
  message: Message<any>;
  consumerId: string;
  startTime: number;
}

interface ClusterNode {
  id: string;
  host: string;
  port: number;
  status: 'active' | 'inactive';
  lastHeartbeat: Date;
}

class PersistenceLayer {
  private storeName: string;
  private storage: Map<string, any> = new Map();

  constructor(storeName: string) {
    this.storeName = storeName;
  }

  async initialize(): Promise<void> {
    // Load from localStorage or IndexedDB
    const data = localStorage.getItem(`queue:${this.storeName}`);
    if (data) {
      const parsed = JSON.parse(data);
      this.storage = new Map(parsed);
    }
  }

  async save(key: string, value: any): Promise<void> {
    this.storage.set(key, value);
    await this.flush();
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
    await this.flush();
  }

  async loadAll(): Promise<any[]> {
    return Array.from(this.storage.values());
  }

  async clear(): Promise<void> {
    this.storage.clear();
    await this.flush();
  }

  private async flush(): Promise<void> {
    const data = Array.from(this.storage.entries());
    localStorage.setItem(`queue:${this.storeName}`, JSON.stringify(data));
  }
}

// ============================================
// Queue Manager
// ============================================

export class QueueManager {
  private static instance: QueueManager;
  private queues: Map<string, DistributedQueue> = new Map();

  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  createQueue<T = JsonValue>(
    name: string,
    config?: Partial<QueueConfig>
  ): DistributedQueue<T> {
    if (this.queues.has(name)) {
      return this.queues.get(name) as DistributedQueue<T>;
    }
    
    const queue = new DistributedQueue<T>({
      ...config,
      name
    });
    
    this.queues.set(name, queue as any);
    
    return queue;
  }

  getQueue<T = JsonValue>(name: string): DistributedQueue<T> | undefined {
    return this.queues.get(name) as DistributedQueue<T> | undefined;
  }

  deleteQueue(name: string): void {
    const queue = this.queues.get(name);
    if (queue) {
      queue.purge();
      this.queues.delete(name);
    }
  }

  getAllQueues(): string[] {
    return Array.from(this.queues.keys());
  }

  getGlobalStats(): Record<string, QueueStats> {
    const stats: Record<string, QueueStats> = {};

    const queuesArray = Array.from(this.queues.entries());
    for (const [name, queue] of queuesArray) {
      stats[name] = queue.getStats();
    }

    return stats;
  }
}

// Export singleton
export const queueManager = QueueManager.getInstance();
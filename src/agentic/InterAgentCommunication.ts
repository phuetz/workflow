/**
 * Inter-Agent Communication System
 *
 * Implements A2A (Agent-to-Agent) messaging protocol, shared memory bus,
 * event pub-sub, message routing, priority management, and dead letter handling
 */

import { AgentMessage, MessageType, MessageCallback, TaskPriority } from '../types/agents';
import { logger } from '../services/SimpleLogger';
import EventEmitter from 'events';

/**
 * Message priority levels with numeric values for comparison
 */
const PRIORITY_VALUES: Record<TaskPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Shared memory entry
 */
export interface SharedMemoryEntry {
  key: string;
  value: unknown;
  ttl?: number;
  createdAt: number;
  updatedAt: number;
  accessCount: number;
  metadata?: Record<string, unknown>;
}

/**
 * Message queue configuration
 */
export interface MessageQueueConfig {
  maxSize: number;
  messageTimeout: number;
  retryAttempts: number;
  deadLetterThreshold: number;
  enablePriority: boolean;
}

/**
 * Communication statistics
 */
export interface CommunicationStats {
  totalMessages: number;
  messagesSent: number;
  messagesReceived: number;
  messagesInQueue: number;
  deadLetterCount: number;
  averageLatency: number;
  throughput: number;
  errorRate: number;
}

/**
 * Inter-Agent Communication Bus
 */
export class InterAgentCommunication {
  private subscribers: Map<string, MessageCallback[]>;
  private messageQueue: PriorityQueue<AgentMessage>;
  private sharedMemory: Map<string, SharedMemoryEntry>;
  private eventBus: EventEmitter;
  private config: MessageQueueConfig;
  private deadLetterQueue: AgentMessage[];
  private pendingRequests: Map<string, {
    resolve: (message: AgentMessage) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>;
  private stats: CommunicationStats;
  private isInitialized = false;
  private processingInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private messageCount = 0;

  constructor(config?: Partial<MessageQueueConfig>) {
    this.subscribers = new Map();
    this.messageQueue = new PriorityQueue();
    this.sharedMemory = new Map();
    this.eventBus = new EventEmitter();
    this.eventBus.setMaxListeners(100); // Support many agents
    this.deadLetterQueue = [];
    this.pendingRequests = new Map();

    this.config = {
      maxSize: config?.maxSize || 10000,
      messageTimeout: config?.messageTimeout || 30000,
      retryAttempts: config?.retryAttempts || 3,
      deadLetterThreshold: config?.deadLetterThreshold || 1000,
      enablePriority: config?.enablePriority ?? true,
    };

    this.stats = {
      totalMessages: 0,
      messagesSent: 0,
      messagesReceived: 0,
      messagesInQueue: 0,
      deadLetterCount: 0,
      averageLatency: 0,
      throughput: 0,
      errorRate: 0,
    };

    logger.info('InterAgentCommunication initialized');
  }

  /**
   * Initialize the communication bus
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('InterAgentCommunication already initialized');
      return;
    }

    // Start message processing
    this.startMessageProcessing();

    // Start periodic cleanup of shared memory
    this.startMemoryCleanup();

    this.isInitialized = true;
    logger.info('InterAgentCommunication started');
  }

  /**
   * Subscribe an agent to receive messages
   */
  subscribe(agentId: string, callback: MessageCallback): void {
    const callbacks = this.subscribers.get(agentId) || [];
    callbacks.push(callback);
    this.subscribers.set(agentId, callbacks);

    logger.debug(`Agent ${agentId} subscribed to message bus`);
  }

  /**
   * Unsubscribe an agent from receiving messages
   */
  unsubscribe(agentId: string): void {
    this.subscribers.delete(agentId);
    logger.debug(`Agent ${agentId} unsubscribed from message bus`);
  }

  /**
   * Publish a message to specific agent(s)
   */
  async publish(message: AgentMessage): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Communication bus not initialized');
    }

    if (this.messageQueue.size() >= this.config.maxSize) {
      logger.warn('Message queue full, message rejected');
      this.moveToDeadLetter(message, 'Queue full');
      return;
    }

    // Add to queue with priority
    this.messageQueue.enqueue(message, PRIORITY_VALUES[message.priority]);
    this.stats.messagesSent++;
    this.messageCount++;

    logger.debug(`Message queued: ${message.type} from ${message.fromAgentId} to ${message.toAgentId}`);
  }

  /**
   * Send a request and wait for response
   */
  async request(message: AgentMessage): Promise<AgentMessage> {
    if (!this.isInitialized) {
      throw new Error('Communication bus not initialized');
    }

    return new Promise((resolve, reject) => {
      const requestId = this.generateId();
      message.metadata = { ...message.metadata, requestId };

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, message.responseTimeout || this.config.messageTimeout);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      this.publish(message).catch(error => {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(error);
      });
    });
  }

  /**
   * Broadcast a message to all subscribed agents
   */
  async broadcast(message: Omit<AgentMessage, 'toAgentId'>): Promise<void> {
    const subscriberIds = Array.from(this.subscribers.keys());

    for (const agentId of subscriberIds) {
      await this.publish({
        ...message,
        toAgentId: agentId,
      } as AgentMessage);
    }

    logger.debug(`Broadcast message sent to ${subscriberIds.length} agents`);
  }

  /**
   * Emit an event on the event bus
   */
  emit(event: string, data: unknown): void {
    this.eventBus.emit(event, data);
  }

  /**
   * Listen to events on the event bus
   */
  on(event: string, listener: (...args: unknown[]) => void): void {
    this.eventBus.on(event, listener);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: (...args: unknown[]) => void): void {
    this.eventBus.off(event, listener);
  }

  /**
   * Write to shared memory
   */
  setSharedMemory(key: string, value: unknown, ttl?: number): void {
    const entry: SharedMemoryEntry = {
      key,
      value,
      ttl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      accessCount: 0,
    };

    this.sharedMemory.set(key, entry);
    this.emit('memory:set', { key, value });

    logger.debug(`Shared memory set: ${key}`);
  }

  /**
   * Read from shared memory
   */
  getSharedMemory(key: string): unknown | undefined {
    const entry = this.sharedMemory.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (entry.ttl && Date.now() - entry.createdAt > entry.ttl) {
      this.sharedMemory.delete(key);
      return undefined;
    }

    entry.accessCount++;
    entry.updatedAt = Date.now();

    this.emit('memory:get', { key });
    return entry.value;
  }

  /**
   * Delete from shared memory
   */
  deleteSharedMemory(key: string): void {
    this.sharedMemory.delete(key);
    this.emit('memory:delete', { key });
  }

  /**
   * Clear all shared memory
   */
  clearSharedMemory(): void {
    this.sharedMemory.clear();
    this.emit('memory:clear', {});
  }

  /**
   * Get all shared memory keys
   */
  getSharedMemoryKeys(): string[] {
    return Array.from(this.sharedMemory.keys());
  }

  /**
   * Get dead letter queue
   */
  getDeadLetterQueue(): AgentMessage[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
    this.stats.deadLetterCount = 0;
  }

  /**
   * Retry a message from dead letter queue
   */
  async retryDeadLetter(messageId: string): Promise<void> {
    const index = this.deadLetterQueue.findIndex(m => m.id === messageId);
    if (index === -1) {
      throw new Error('Message not found in dead letter queue');
    }

    const message = this.deadLetterQueue.splice(index, 1)[0];
    await this.publish(message);
    this.stats.deadLetterCount--;
  }

  /**
   * Get communication statistics
   */
  getStats(): CommunicationStats {
    this.stats.messagesInQueue = this.messageQueue.size();
    return { ...this.stats };
  }

  /**
   * Get message count
   */
  getMessageCount(): number {
    return this.messageCount;
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalMessages: 0,
      messagesSent: 0,
      messagesReceived: 0,
      messagesInQueue: 0,
      deadLetterCount: this.deadLetterQueue.length,
      averageLatency: 0,
      throughput: 0,
      errorRate: 0,
    };
  }

  /**
   * Shutdown the communication bus
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down InterAgentCommunication');

    this.isInitialized = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clear pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Communication bus shutdown'));
    }
    this.pendingRequests.clear();

    this.messageQueue.clear();
    this.subscribers.clear();
    this.eventBus.removeAllListeners();

    logger.info('InterAgentCommunication shut down');
  }

  // Private methods

  private startMessageProcessing(): void {
    this.processingInterval = setInterval(async () => {
      await this.processMessages();
    }, 10); // Process every 10ms for <50ms latency
  }

  private async processMessages(): Promise<void> {
    const batchSize = 10; // Process up to 10 messages per batch
    const startTime = Date.now();

    for (let i = 0; i < batchSize && this.messageQueue.size() > 0; i++) {
      const message = this.messageQueue.dequeue();
      if (!message) break;

      try {
        await this.deliverMessage(message);

        const latency = Date.now() - startTime;
        this.updateLatencyStats(latency);

        this.stats.messagesReceived++;
        this.stats.totalMessages++;
      } catch (error) {
        logger.error(`Failed to deliver message ${message.id}:`, error);
        this.moveToDeadLetter(message, error instanceof Error ? error.message : 'Unknown error');
        this.stats.errorRate = this.deadLetterQueue.length / this.stats.totalMessages;
      }
    }
  }

  private async deliverMessage(message: AgentMessage): Promise<void> {
    // Handle response to pending request
    if (message.type === 'response' && message.metadata?.requestId) {
      const pending = this.pendingRequests.get(message.metadata.requestId as string);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.resolve(message);
        this.pendingRequests.delete(message.metadata.requestId as string);
        return;
      }
    }

    // Deliver to subscriber(s)
    const targetIds = Array.isArray(message.toAgentId)
      ? message.toAgentId
      : [message.toAgentId];

    for (const targetId of targetIds) {
      const callbacks = this.subscribers.get(targetId);
      if (callbacks) {
        for (const callback of callbacks) {
          try {
            await callback(message);
          } catch (error) {
            logger.error(`Callback error for agent ${targetId}:`, error);
          }
        }
      }
    }

    // Emit event
    this.emit(`message:${message.type}`, message);
  }

  private moveToDeadLetter(message: AgentMessage, reason: string): void {
    if (this.deadLetterQueue.length >= this.config.deadLetterThreshold) {
      // Remove oldest message
      this.deadLetterQueue.shift();
    }

    this.deadLetterQueue.push({
      ...message,
      metadata: {
        ...message.metadata,
        deadLetterReason: reason,
        deadLetterTime: new Date().toISOString(),
      },
    });

    this.stats.deadLetterCount++;
    logger.warn(`Message moved to dead letter queue: ${message.id} - ${reason}`);
  }

  private startMemoryCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredMemory();
    }, 60000); // Clean every minute
  }

  private cleanupExpiredMemory(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.sharedMemory) {
      if (entry.ttl && now - entry.createdAt > entry.ttl) {
        this.sharedMemory.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned ${cleaned} expired memory entries`);
    }
  }

  private updateLatencyStats(latency: number): void {
    const n = this.stats.messagesReceived + 1;
    this.stats.averageLatency = (this.stats.averageLatency * (n - 1) + latency) / n;

    // Calculate throughput (messages per second)
    this.stats.throughput = 1000 / this.stats.averageLatency;
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Priority Queue implementation for message routing
 */
class PriorityQueue<T> {
  private items: Array<{ item: T; priority: number }> = [];

  enqueue(item: T, priority: number): void {
    const element = { item, priority };

    // Find insertion point to maintain priority order
    let added = false;
    for (let i = 0; i < this.items.length; i++) {
      if (element.priority > this.items[i].priority) {
        this.items.splice(i, 0, element);
        added = true;
        break;
      }
    }

    if (!added) {
      this.items.push(element);
    }
  }

  dequeue(): T | undefined {
    return this.items.shift()?.item;
  }

  peek(): T | undefined {
    return this.items[0]?.item;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

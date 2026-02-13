/**
 * Universal Messenger
 *
 * Protocol-agnostic messaging system with auto-detection,
 * fallback mechanisms, and delivery guarantees.
 */

import { EventEmitter } from 'events';
import { ProtocolHub, ProtocolType, UniversalMessage } from './ProtocolHub';
import { AgentRegistry, AgentInfo, AgentStatus } from './AgentRegistry';

// Delivery Guarantee
export enum DeliveryGuarantee {
  AT_MOST_ONCE = 'at-most-once',
  AT_LEAST_ONCE = 'at-least-once',
  EXACTLY_ONCE = 'exactly-once'
}

// Message Priority
export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3
}

// Queued Message
interface QueuedMessage {
  id: string;
  message: UniversalMessage;
  priority: MessagePriority;
  guarantee: DeliveryGuarantee;
  attempts: number;
  maxAttempts: number;
  nextRetry: number;
  createdAt: number;
  expiresAt?: number;
}

// Message Options
export interface MessageOptions {
  priority?: MessagePriority;
  guarantee?: DeliveryGuarantee;
  timeout?: number;
  maxAttempts?: number;
  preferredProtocol?: ProtocolType;
  ttl?: number;
  requireAck?: boolean;
}

// Send Result
export interface SendResult {
  success: boolean;
  messageId: string;
  protocol: ProtocolType;
  attempts: number;
  deliveryTime: number;
  error?: string;
}

/**
 * Universal Messenger
 */
export class UniversalMessenger extends EventEmitter {
  private protocolHub: ProtocolHub;
  private registry: AgentRegistry;
  private messageQueue: Map<string, QueuedMessage> = new Map();
  private priorityQueues: Map<MessagePriority, Set<string>> = new Map();
  private deliveredMessages: Set<string> = new Set(); // For exactly-once delivery
  private pendingAcks: Map<string, {
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private queueProcessor?: NodeJS.Timeout;
  private config: {
    queueProcessInterval: number;
    defaultTimeout: number;
    defaultMaxAttempts: number;
    deliveryHistorySize: number;
  };

  constructor(
    protocolHub: ProtocolHub,
    registry: AgentRegistry,
    config?: Partial<UniversalMessenger['config']>
  ) {
    super();
    this.protocolHub = protocolHub;
    this.registry = registry;

    this.config = {
      queueProcessInterval: config?.queueProcessInterval || 100,
      defaultTimeout: config?.defaultTimeout || 30000,
      defaultMaxAttempts: config?.defaultMaxAttempts || 3,
      deliveryHistorySize: config?.deliveryHistorySize || 10000
    };

    // Initialize priority queues
    for (const priority of Object.values(MessagePriority)) {
      if (typeof priority === 'number') {
        this.priorityQueues.set(priority, new Set());
      }
    }

    this.startQueueProcessor();
  }

  /**
   * Send message to target agent
   */
  async send(
    targetAgent: string,
    type: string,
    payload: unknown,
    options?: MessageOptions
  ): Promise<SendResult> {
    const startTime = Date.now();
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const message: Omit<UniversalMessage, 'protocol'> = {
      id: messageId,
      from: 'system', // Would be actual sender ID
      to: targetAgent,
      timestamp: Date.now(),
      type,
      payload
    };

    const priority = options?.priority || MessagePriority.NORMAL;
    const guarantee = options?.guarantee || DeliveryGuarantee.AT_MOST_ONCE;
    const maxAttempts = options?.maxAttempts || this.config.defaultMaxAttempts;
    const ttl = options?.ttl;

    // Check if already delivered (for exactly-once)
    if (guarantee === DeliveryGuarantee.EXACTLY_ONCE && this.deliveredMessages.has(messageId)) {
      return {
        success: true,
        messageId,
        protocol: ProtocolType.AUTO,
        attempts: 0,
        deliveryTime: 0
      };
    }

    // Queue message if not at-most-once
    if (guarantee !== DeliveryGuarantee.AT_MOST_ONCE) {
      const queued: QueuedMessage = {
        id: messageId,
        message: message as UniversalMessage,
        priority,
        guarantee,
        attempts: 0,
        maxAttempts,
        nextRetry: Date.now(),
        createdAt: Date.now(),
        expiresAt: ttl ? Date.now() + ttl : undefined
      };

      this.messageQueue.set(messageId, queued);
      this.priorityQueues.get(priority)!.add(messageId);
    }

    try {
      // Detect best protocol
      const protocol = await this.detectBestProtocol(targetAgent, options?.preferredProtocol);

      // Send message
      if (options?.requireAck) {
        await this.sendWithAck(targetAgent, message, protocol, options.timeout);
      } else {
        await this.protocolHub.sendMessage(targetAgent, message, {
          preferredProtocol: protocol
        });
      }

      // Mark as delivered
      if (guarantee === DeliveryGuarantee.EXACTLY_ONCE) {
        this.addToDeliveryHistory(messageId);
      }

      // Remove from queue if successful
      if (guarantee !== DeliveryGuarantee.AT_MOST_ONCE) {
        this.messageQueue.delete(messageId);
        this.priorityQueues.get(priority)!.delete(messageId);
      }

      const deliveryTime = Date.now() - startTime;

      this.emit('message-sent', {
        messageId,
        targetAgent,
        protocol,
        deliveryTime
      });

      return {
        success: true,
        messageId,
        protocol,
        attempts: 1,
        deliveryTime
      };

    } catch (error) {
      const deliveryTime = Date.now() - startTime;

      // If at-most-once, fail immediately
      if (guarantee === DeliveryGuarantee.AT_MOST_ONCE) {
        this.emit('message-failed', { messageId, error });

        return {
          success: false,
          messageId,
          protocol: ProtocolType.AUTO,
          attempts: 1,
          deliveryTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      // Otherwise, will retry via queue processor
      this.emit('message-queued', { messageId, priority, guarantee });

      return {
        success: false,
        messageId,
        protocol: ProtocolType.AUTO,
        attempts: 1,
        deliveryTime,
        error: 'Queued for retry'
      };
    }
  }

  /**
   * Send message with acknowledgement
   */
  private async sendWithAck(
    targetAgent: string,
    message: Omit<UniversalMessage, 'protocol'>,
    protocol: ProtocolType,
    timeout?: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutMs = timeout || this.config.defaultTimeout;

      const timer = setTimeout(() => {
        this.pendingAcks.delete(message.id);
        reject(new Error('Acknowledgement timeout'));
      }, timeoutMs);

      this.pendingAcks.set(message.id, { resolve, reject, timeout: timer });

      // Send message
      this.protocolHub.sendMessage(targetAgent, message, {
        preferredProtocol: protocol
      }).catch(reject);
    });
  }

  /**
   * Receive acknowledgement
   */
  receiveAck(messageId: string): void {
    const pending = this.pendingAcks.get(messageId);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.resolve();
      this.pendingAcks.delete(messageId);
    }
  }

  /**
   * Detect best protocol for target agent
   */
  private async detectBestProtocol(
    targetAgent: string,
    preferredProtocol?: ProtocolType
  ): Promise<ProtocolType> {
    // If preferred protocol specified, try to use it
    if (preferredProtocol && preferredProtocol !== ProtocolType.AUTO) {
      const connected = this.protocolHub.getConnectedProtocols();
      if (connected.includes(preferredProtocol)) {
        return preferredProtocol;
      }
    }

    // Get agent info from registry
    const agentInfo = this.registry.getAgent(targetAgent);

    if (agentInfo && agentInfo.status === AgentStatus.ONLINE) {
      // Find common protocol between available and agent's protocols
      const connected = this.protocolHub.getConnectedProtocols();
      const agentProtocols = agentInfo.protocols;

      for (const protocol of connected) {
        if (agentProtocols.includes(protocol)) {
          return protocol as ProtocolType;
        }
      }
    }

    // Fallback to first available protocol
    const connected = this.protocolHub.getConnectedProtocols();
    if (connected.length > 0) {
      return connected[0];
    }

    throw new Error('No available protocol');
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    this.queueProcessor = setInterval(() => {
      this.processQueue();
    }, this.config.queueProcessInterval);
  }

  /**
   * Process message queue
   */
  private async processQueue(): Promise<void> {
    const now = Date.now();

    // Process by priority (highest first)
    const priorities = [
      MessagePriority.URGENT,
      MessagePriority.HIGH,
      MessagePriority.NORMAL,
      MessagePriority.LOW
    ];

    for (const priority of priorities) {
      const queue = this.priorityQueues.get(priority)!;

      for (const messageId of queue) {
        const queued = this.messageQueue.get(messageId);
        if (!queued) {
          queue.delete(messageId);
          continue;
        }

        // Check if expired
        if (queued.expiresAt && now >= queued.expiresAt) {
          this.messageQueue.delete(messageId);
          queue.delete(messageId);
          this.emit('message-expired', queued);
          continue;
        }

        // Check if ready to retry
        if (now < queued.nextRetry) {
          continue;
        }

        // Check max attempts
        if (queued.attempts >= queued.maxAttempts) {
          this.messageQueue.delete(messageId);
          queue.delete(messageId);
          this.emit('message-failed', queued);
          continue;
        }

        // Try to send
        try {
          const protocol = await this.detectBestProtocol(queued.message.to);

          await this.protocolHub.sendMessage(queued.message.to, queued.message, {
            preferredProtocol: protocol
          });

          // Success - mark as delivered
          if (queued.guarantee === DeliveryGuarantee.EXACTLY_ONCE) {
            this.addToDeliveryHistory(messageId);
          }

          this.messageQueue.delete(messageId);
          queue.delete(messageId);
          this.emit('message-delivered', queued);

        } catch (error) {
          // Retry with exponential backoff
          queued.attempts++;
          queued.nextRetry = now + Math.pow(2, queued.attempts) * 1000;
          this.emit('message-retry', { messageId, attempts: queued.attempts });
        }
      }
    }
  }

  /**
   * Add to delivery history
   */
  private addToDeliveryHistory(messageId: string): void {
    this.deliveredMessages.add(messageId);

    // Limit history size
    if (this.deliveredMessages.size > this.config.deliveryHistorySize) {
      const toDelete = this.deliveredMessages.size - this.config.deliveryHistorySize;
      const iterator = this.deliveredMessages.values();

      for (let i = 0; i < toDelete; i++) {
        const value = iterator.next().value;
        this.deliveredMessages.delete(value);
      }
    }
  }

  /**
   * Broadcast message to multiple agents
   */
  async broadcast(
    targetAgents: string[],
    type: string,
    payload: unknown,
    options?: MessageOptions
  ): Promise<Map<string, SendResult>> {
    const results = new Map<string, SendResult>();

    const promises = targetAgents.map(async (agent) => {
      const result = await this.send(agent, type, payload, options);
      results.set(agent, result);
    });

    await Promise.all(promises);

    return results;
  }

  /**
   * Request-response pattern
   */
  async request(
    targetAgent: string,
    type: string,
    payload: unknown,
    options?: MessageOptions
  ): Promise<unknown> {
    const messageId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const message: Omit<UniversalMessage, 'protocol'> = {
      id: messageId,
      from: 'system',
      to: targetAgent,
      timestamp: Date.now(),
      type,
      payload
    };

    const protocol = await this.detectBestProtocol(targetAgent, options?.preferredProtocol);
    const timeout = options?.timeout || this.config.defaultTimeout;

    return await this.protocolHub.request(targetAgent, message, {
      preferredProtocol: protocol,
      timeout
    });
  }

  /**
   * Subscribe to messages
   */
  subscribe(
    topic: string,
    handler: (message: UniversalMessage) => void,
    protocols?: ProtocolType[]
  ): void {
    this.protocolHub.subscribe(topic, handler, protocols);
  }

  /**
   * Unsubscribe from messages
   */
  unsubscribe(topic: string, protocols?: ProtocolType[]): void {
    this.protocolHub.unsubscribe(topic, protocols);
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    const stats = {
      total: this.messageQueue.size,
      byPriority: {
        urgent: this.priorityQueues.get(MessagePriority.URGENT)!.size,
        high: this.priorityQueues.get(MessagePriority.HIGH)!.size,
        normal: this.priorityQueues.get(MessagePriority.NORMAL)!.size,
        low: this.priorityQueues.get(MessagePriority.LOW)!.size
      },
      byGuarantee: {
        atMostOnce: 0,
        atLeastOnce: 0,
        exactlyOnce: 0
      },
      pendingAcks: this.pendingAcks.size,
      deliveryHistory: this.deliveredMessages.size
    };

    for (const queued of this.messageQueue.values()) {
      switch (queued.guarantee) {
        case DeliveryGuarantee.AT_MOST_ONCE:
          stats.byGuarantee.atMostOnce++;
          break;
        case DeliveryGuarantee.AT_LEAST_ONCE:
          stats.byGuarantee.atLeastOnce++;
          break;
        case DeliveryGuarantee.EXACTLY_ONCE:
          stats.byGuarantee.exactlyOnce++;
          break;
      }
    }

    return stats;
  }

  /**
   * Get oldest queued message
   */
  getOldestMessage(): QueuedMessage | undefined {
    let oldest: QueuedMessage | undefined;

    for (const queued of this.messageQueue.values()) {
      if (!oldest || queued.createdAt < oldest.createdAt) {
        oldest = queued;
      }
    }

    return oldest;
  }

  /**
   * Clear expired messages
   */
  clearExpired(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [messageId, queued] of this.messageQueue.entries()) {
      if (queued.expiresAt && now >= queued.expiresAt) {
        this.messageQueue.delete(messageId);
        this.priorityQueues.get(queued.priority)!.delete(messageId);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Pause queue processing
   */
  pause(): void {
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
      this.queueProcessor = undefined;
      this.emit('queue-paused');
    }
  }

  /**
   * Resume queue processing
   */
  resume(): void {
    if (!this.queueProcessor) {
      this.startQueueProcessor();
      this.emit('queue-resumed');
    }
  }

  /**
   * Clear all queues
   */
  clear(): void {
    this.messageQueue.clear();
    for (const queue of this.priorityQueues.values()) {
      queue.clear();
    }
    this.deliveredMessages.clear();

    for (const pending of this.pendingAcks.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Queue cleared'));
    }
    this.pendingAcks.clear();

    this.emit('queue-cleared');
  }

  /**
   * Shutdown messenger
   */
  async shutdown(): Promise<void> {
    this.pause();
    this.clear();
    this.emit('shutdown');
  }
}

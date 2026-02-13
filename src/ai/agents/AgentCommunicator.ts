import {
  AgentMessage,
  MessageBus,
  MessageCallback,
  MessageType,
  TaskPriority,
} from '../../types/agents';
import { logger } from '../../services/SimpleLogger';
import { EventEmitter } from 'events';

/**
 * Agent Communicator - Message bus for agent-to-agent communication
 * Provides pub/sub messaging, request/response patterns, and broadcasting
 */
export class AgentCommunicator implements MessageBus {
  private subscribers: Map<string, MessageCallback[]> = new Map();
  private messageQueue: PriorityQueue<AgentMessage> = new PriorityQueue();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private messageHistory: Map<string, AgentMessage[]> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();
  private isProcessing = false;
  private maxQueueSize: number;
  private messageTimeout: number;

  constructor(config: { maxQueueSize?: number; messageTimeout?: number } = {}) {
    this.maxQueueSize = config.maxQueueSize || 10000;
    this.messageTimeout = config.messageTimeout || 30000; // 30 seconds
    logger.info('AgentCommunicator initialized');
    this.startProcessing();
  }

  /**
   * Subscribe an agent to messages
   */
  subscribe(agentId: string, callback: MessageCallback): void {
    const callbacks = this.subscribers.get(agentId) || [];
    callbacks.push(callback);
    this.subscribers.set(agentId, callbacks);

    logger.info(`Agent ${agentId} subscribed to messages`);
  }

  /**
   * Unsubscribe an agent from messages
   */
  unsubscribe(agentId: string): void {
    this.subscribers.delete(agentId);
    this.messageHistory.delete(agentId);
    logger.info(`Agent ${agentId} unsubscribed from messages`);
  }

  /**
   * Publish a message to one or more agents
   */
  async publish(message: AgentMessage): Promise<void> {
    if (this.messageQueue.size() >= this.maxQueueSize) {
      throw new Error('Message queue is full');
    }

    // Validate message
    this.validateMessage(message);

    // Add to queue with priority
    const priority = this.getPriorityValue(message.priority);
    this.messageQueue.enqueue(message, priority);

    // Store in history
    this.addToHistory(message);

    // Emit event
    this.eventEmitter.emit('message-published', message);

    logger.debug(`Message ${message.id} published from ${message.fromAgentId} to ${message.toAgentId}`);
  }

  /**
   * Send a request and wait for response
   */
  async request(message: AgentMessage): Promise<AgentMessage> {
    if (!message.requiresResponse) {
      throw new Error('Message must require response for request pattern');
    }

    // Publish the request
    await this.publish(message);

    // Wait for response
    return new Promise((resolve, reject) => {
      const timeout = message.responseTimeout || this.messageTimeout;
      const timer = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error(`Request timeout: ${message.id}`));
      }, timeout);

      this.pendingRequests.set(message.id, {
        resolve: (response: AgentMessage) => {
          clearTimeout(timer);
          resolve(response);
        },
        reject: (error: Error) => {
          clearTimeout(timer);
          reject(error);
        },
        timeout: timer,
      });
    });
  }

  /**
   * Broadcast a message to all subscribed agents
   */
  async broadcast(message: Omit<AgentMessage, 'toAgentId'>): Promise<void> {
    const broadcastMessage: AgentMessage = {
      ...message,
      toAgentId: 'broadcast',
    } as AgentMessage;

    await this.publish(broadcastMessage);
  }

  /**
   * Send a response to a request
   */
  async respond(requestId: string, response: Partial<AgentMessage>): Promise<void> {
    const responseMessage: AgentMessage = {
      id: this.generateMessageId(),
      fromAgentId: response.fromAgentId || 'unknown',
      toAgentId: response.toAgentId || 'unknown',
      type: 'response' as MessageType,
      content: response.content,
      priority: response.priority || 'medium',
      timestamp: new Date().toISOString(),
      requiresResponse: false,
      metadata: {
        ...response.metadata,
        requestId,
      },
    };

    // Resolve pending request
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      pending.resolve(responseMessage);
      this.pendingRequests.delete(requestId);
    }

    await this.publish(responseMessage);
  }

  /**
   * Get message history for an agent
   */
  getHistory(agentId: string, limit = 100): AgentMessage[] {
    const history = this.messageHistory.get(agentId) || [];
    return history.slice(-limit);
  }

  /**
   * Clear message history for an agent
   */
  clearHistory(agentId: string): void {
    this.messageHistory.delete(agentId);
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queueSize: number;
    subscriberCount: number;
    pendingRequests: number;
    messagesProcessed: number;
  } {
    return {
      queueSize: this.messageQueue.size(),
      subscriberCount: this.subscribers.size,
      pendingRequests: this.pendingRequests.size,
      messagesProcessed: 0, // Would need to track this
    };
  }

  /**
   * Start processing messages from the queue
   */
  private startProcessing(): void {
    this.isProcessing = true;
    this.processNextMessage();
  }

  /**
   * Stop processing messages
   */
  stopProcessing(): void {
    this.isProcessing = false;
  }

  /**
   * Process messages from the queue
   */
  private async processNextMessage(): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    try {
      const message = this.messageQueue.dequeue();

      if (message) {
        await this.deliverMessage(message);
      }
    } catch (error) {
      logger.error('Error processing message:', error);
    }

    // Continue processing
    setImmediate(() => this.processNextMessage());
  }

  /**
   * Deliver a message to its recipients
   */
  private async deliverMessage(message: AgentMessage): Promise<void> {
    try {
      if (message.toAgentId === 'broadcast') {
        // Broadcast to all subscribers
        for (const [agentId, callbacks] of this.subscribers.entries()) {
          await this.executeCallbacks(agentId, callbacks, message);
        }
      } else if (Array.isArray(message.toAgentId)) {
        // Send to multiple specific agents
        for (const agentId of message.toAgentId) {
          const callbacks = this.subscribers.get(agentId) || [];
          await this.executeCallbacks(agentId, callbacks, message);
        }
      } else {
        // Send to single agent
        const callbacks = this.subscribers.get(message.toAgentId) || [];
        await this.executeCallbacks(message.toAgentId, callbacks, message);
      }

      this.eventEmitter.emit('message-delivered', message);
    } catch (error) {
      logger.error(`Failed to deliver message ${message.id}:`, error);
      this.eventEmitter.emit('message-failed', { message, error });
    }
  }

  /**
   * Execute callbacks for message delivery
   */
  private async executeCallbacks(
    agentId: string,
    callbacks: MessageCallback[],
    message: AgentMessage
  ): Promise<void> {
    for (const callback of callbacks) {
      try {
        const result = callback(message);
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        logger.error(`Callback error for agent ${agentId}:`, error);
      }
    }
  }

  /**
   * Add message to history
   */
  private addToHistory(message: AgentMessage): void {
    // Add to sender's history
    const senderHistory = this.messageHistory.get(message.fromAgentId) || [];
    senderHistory.push(message);
    if (senderHistory.length > 1000) {
      senderHistory.shift();
    }
    this.messageHistory.set(message.fromAgentId, senderHistory);

    // Add to recipient's history
    const recipients = Array.isArray(message.toAgentId)
      ? message.toAgentId
      : [message.toAgentId];

    recipients.forEach(agentId => {
      if (agentId !== 'broadcast') {
        const recipientHistory = this.messageHistory.get(agentId) || [];
        recipientHistory.push(message);
        if (recipientHistory.length > 1000) {
          recipientHistory.shift();
        }
        this.messageHistory.set(agentId, recipientHistory);
      }
    });
  }

  /**
   * Validate message structure
   */
  private validateMessage(message: AgentMessage): void {
    if (!message.id || !message.fromAgentId || !message.toAgentId) {
      throw new Error('Invalid message: missing required fields');
    }

    if (!message.type || !message.timestamp) {
      throw new Error('Invalid message: missing type or timestamp');
    }
  }

  /**
   * Convert priority to numeric value for queue
   */
  private getPriorityValue(priority: TaskPriority): number {
    const priorityMap: Record<TaskPriority, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    return priorityMap[priority] || 2;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Listen for events
   */
  on(event: string, callback: (...args: unknown[]) => void): void {
    this.eventEmitter.on(event, callback);
  }

  /**
   * Shutdown the communicator
   */
  async shutdown(): Promise<void> {
    this.stopProcessing();

    // Reject all pending requests
    for (const [requestId, pending] of this.pendingRequests.entries()) {
      pending.reject(new Error('Communicator shutting down'));
      clearTimeout(pending.timeout);
    }

    this.pendingRequests.clear();
    this.subscribers.clear();
    this.messageHistory.clear();
    this.messageQueue.clear();
    this.eventEmitter.removeAllListeners();

    logger.info('AgentCommunicator shut down');
  }
}

/**
 * Priority Queue implementation for message ordering
 */
class PriorityQueue<T> {
  private items: Array<{ value: T; priority: number }> = [];

  enqueue(value: T, priority: number): void {
    const item = { value, priority };

    // Find correct position based on priority
    let added = false;
    for (let i = 0; i < this.items.length; i++) {
      if (priority > this.items[i].priority) {
        this.items.splice(i, 0, item);
        added = true;
        break;
      }
    }

    if (!added) {
      this.items.push(item);
    }
  }

  dequeue(): T | undefined {
    const item = this.items.shift();
    return item?.value;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }

  peek(): T | undefined {
    return this.items[0]?.value;
  }
}

/**
 * Pending request tracking
 */
interface PendingRequest {
  resolve: (response: AgentMessage) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

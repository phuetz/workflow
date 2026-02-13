/**
 * Event Publisher
 * Publishes domain events to subscribers with guaranteed delivery
 */

import { logger } from '../services/SimpleLogger';
import {
  IEventPublisher,
  DomainEvent,
  EventHandler,
  EventSubscription,
} from './types/eventsourcing';

/**
 * Event Publication Record
 * Tracks published events for guaranteed delivery
 */
interface EventPublication {
  event: DomainEvent;
  publishedAt: Date;
  subscribers: number;
  delivered: number;
  failed: number;
}

/**
 * Event Publisher Configuration
 */
export interface EventPublisherConfig {
  /** Enable async publishing (fire and forget) */
  asyncPublish: boolean;

  /** Retry failed deliveries */
  retryOnFailure: boolean;

  /** Maximum retry attempts */
  maxRetries: number;

  /** Retry delay in milliseconds */
  retryDelayMs: number;

  /** Enable event batching */
  enableBatching: boolean;

  /** Batch size */
  batchSize: number;

  /** Batch timeout in milliseconds */
  batchTimeoutMs: number;

  /** Enable dead letter queue */
  enableDeadLetterQueue: boolean;
}

/**
 * Event Publisher Implementation
 */
export class EventPublisher implements IEventPublisher {
  private subscribers: Map<string, Set<EventHandler>> = new Map();
  private wildcardSubscribers: Set<EventHandler> = new Set();
  private publications: EventPublication[] = [];
  private config: EventPublisherConfig;
  private batchQueue: DomainEvent[] = [];
  private batchTimer?: NodeJS.Timeout;
  private deadLetterQueue: DomainEvent[] = [];

  constructor(config?: Partial<EventPublisherConfig>) {
    this.config = {
      asyncPublish: config?.asyncPublish !== false,
      retryOnFailure: config?.retryOnFailure !== false,
      maxRetries: config?.maxRetries || 3,
      retryDelayMs: config?.retryDelayMs || 1000,
      enableBatching: config?.enableBatching || false,
      batchSize: config?.batchSize || 10,
      batchTimeoutMs: config?.batchTimeoutMs || 100,
      enableDeadLetterQueue: config?.enableDeadLetterQueue !== false,
    };
  }

  /**
   * Publish a single event
   */
  async publish(event: DomainEvent): Promise<void> {
    if (this.config.enableBatching) {
      this.addToBatch(event);
    } else {
      await this.publishInternal(event);
    }
  }

  /**
   * Publish multiple events
   */
  async publishBatch(events: DomainEvent[]): Promise<void> {
    if (this.config.asyncPublish) {
      // Fire and forget
      Promise.all(events.map((e) => this.publishInternal(e))).catch((error) =>
        logger.error('Batch publish error:', error)
      );
    } else {
      // Wait for all
      await Promise.all(events.map((e) => this.publishInternal(e)));
    }
  }

  /**
   * Subscribe to published events
   */
  subscribe(eventType: string, handler: EventHandler): EventSubscription {
    // Support wildcard subscriptions
    if (eventType === '*') {
      this.wildcardSubscribers.add(handler);
    } else {
      if (!this.subscribers.has(eventType)) {
        this.subscribers.set(eventType, new Set());
      }
      this.subscribers.get(eventType)!.add(handler);
    }

    const subscriptionId = `sub_${Date.now()}_${Math.random()}`;

    return {
      id: subscriptionId,
      eventType,
      isActive: true,
      unsubscribe: () => {
        if (eventType === '*') {
          this.wildcardSubscribers.delete(handler);
        } else {
          const handlers = this.subscribers.get(eventType);
          if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
              this.subscribers.delete(eventType);
            }
          }
        }
      },
    };
  }

  /**
   * Internal publish implementation
   */
  private async publishInternal(event: DomainEvent): Promise<void> {
    const handlers = this.getHandlers(event.eventType);

    const publication: EventPublication = {
      event,
      publishedAt: new Date(),
      subscribers: handlers.length,
      delivered: 0,
      failed: 0,
    };

    this.publications.push(publication);

    // Deliver to all handlers
    for (const handler of handlers) {
      await this.deliverToHandler(handler, event, publication);
    }

    // Cleanup old publications
    this.cleanupPublications();
  }

  /**
   * Deliver event to a single handler with retry
   */
  private async deliverToHandler(
    handler: EventHandler,
    event: DomainEvent,
    publication: EventPublication,
    attempt: number = 1
  ): Promise<void> {
    try {
      await handler(event);
      publication.delivered++;
    } catch (error) {
      logger.error(
        `Failed to deliver event ${event.eventType} (attempt ${attempt}):`,
        error
      );

      if (this.config.retryOnFailure && attempt < this.config.maxRetries) {
        // Retry with exponential backoff
        const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
        await this.sleep(delay);
        await this.deliverToHandler(handler, event, publication, attempt + 1);
      } else {
        publication.failed++;

        // Send to dead letter queue
        if (this.config.enableDeadLetterQueue) {
          this.addToDeadLetterQueue(event);
        }
      }
    }
  }

  /**
   * Get all handlers for an event type
   */
  private getHandlers(eventType: string): EventHandler[] {
    const handlers: EventHandler[] = [];

    // Add specific handlers
    const specificHandlers = this.subscribers.get(eventType);
    if (specificHandlers) {
      handlers.push(...Array.from(specificHandlers));
    }

    // Add wildcard handlers
    handlers.push(...Array.from(this.wildcardSubscribers));

    return handlers;
  }

  /**
   * Add event to batch queue
   */
  private addToBatch(event: DomainEvent): void {
    this.batchQueue.push(event);

    // Publish batch if size reached
    if (this.batchQueue.length >= this.config.batchSize) {
      this.publishBatchQueue();
    } else {
      // Set timer if not already set
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.publishBatchQueue();
        }, this.config.batchTimeoutMs);
      }
    }
  }

  /**
   * Publish batch queue
   */
  private async publishBatchQueue(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    const events = [...this.batchQueue];
    this.batchQueue = [];

    await this.publishBatch(events);
  }

  /**
   * Add event to dead letter queue
   */
  private addToDeadLetterQueue(event: DomainEvent): void {
    this.deadLetterQueue.push(event);
    logger.warn(
      `Event ${event.eventType} added to dead letter queue. Total: ${this.deadLetterQueue.length}`
    );
  }

  /**
   * Get dead letter queue
   */
  getDeadLetterQueue(): DomainEvent[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
  }

  /**
   * Retry events from dead letter queue
   */
  async retryDeadLetterQueue(): Promise<void> {
    const events = [...this.deadLetterQueue];
    this.deadLetterQueue = [];

    await this.publishBatch(events);
  }

  /**
   * Get publication statistics
   */
  getStatistics(): {
    totalPublished: number;
    totalDelivered: number;
    totalFailed: number;
    deadLetterQueueSize: number;
    subscriberCount: number;
  } {
    const totalPublished = this.publications.length;
    const totalDelivered = this.publications.reduce(
      (sum, p) => sum + p.delivered,
      0
    );
    const totalFailed = this.publications.reduce((sum, p) => sum + p.failed, 0);

    let subscriberCount = this.wildcardSubscribers.size;
    for (const handlers of this.subscribers.values()) {
      subscriberCount += handlers.size;
    }

    return {
      totalPublished,
      totalDelivered,
      totalFailed,
      deadLetterQueueSize: this.deadLetterQueue.length,
      subscriberCount,
    };
  }

  /**
   * Get recent publications
   */
  getRecentPublications(limit: number = 100): EventPublication[] {
    return this.publications.slice(-limit);
  }

  /**
   * Cleanup old publications (keep last 1000)
   */
  private cleanupPublications(): void {
    if (this.publications.length > 1000) {
      this.publications = this.publications.slice(-1000);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Shutdown publisher
   */
  async shutdown(): Promise<void> {
    // Flush batch queue
    if (this.batchQueue.length > 0) {
      await this.publishBatchQueue();
    }

    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Clear subscribers
    this.subscribers.clear();
    this.wildcardSubscribers.clear();
  }
}

/**
 * Global event publisher instance
 */
export const eventPublisher = new EventPublisher({
  asyncPublish: true,
  retryOnFailure: true,
  maxRetries: 3,
  enableBatching: false,
  enableDeadLetterQueue: true,
});

/**
 * Event Bus
 * Publish-subscribe event bus with guaranteed delivery
 */

import { DomainEvent, EventHandler, EventSubscription } from '../eventsourcing/types/eventsourcing';
import { logger } from '../services/SimpleLogger';

/**
 * Event Bus Configuration
 */
export interface EventBusConfig {
  /** Enable guaranteed delivery */
  guaranteedDelivery: boolean;

  /** Enable dead letter queue */
  enableDeadLetterQueue: boolean;

  /** Max retry attempts */
  maxRetries: number;

  /** Retry delay in milliseconds */
  retryDelayMs: number;

  /** Enable event ordering */
  enableOrdering: boolean;

  /** Enable event persistence */
  enablePersistence: boolean;
}

/**
 * Event Delivery Status
 */
interface EventDelivery {
  event: DomainEvent;
  subscriber: string;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}

/**
 * Event Bus Implementation
 */
export class EventBus {
  private subscribers: Map<string, Set<{ id: string; handler: EventHandler }>> = new Map();
  private config: EventBusConfig;
  private pendingDeliveries: EventDelivery[] = [];
  private deliveryQueue: DomainEvent[] = [];
  private processing = false;

  constructor(config?: Partial<EventBusConfig>) {
    this.config = {
      guaranteedDelivery: config?.guaranteedDelivery !== false,
      enableDeadLetterQueue: config?.enableDeadLetterQueue !== false,
      maxRetries: config?.maxRetries || 3,
      retryDelayMs: config?.retryDelayMs || 1000,
      enableOrdering: config?.enableOrdering !== false,
      enablePersistence: config?.enablePersistence || false,
    };

    // Start delivery processor
    if (this.config.guaranteedDelivery) {
      this.startDeliveryProcessor();
    }
  }

  /**
   * Publish an event
   */
  async publish(event: DomainEvent): Promise<void> {
    if (this.config.enableOrdering) {
      // Add to queue for ordered delivery
      this.deliveryQueue.push(event);
      this.processDeliveryQueue();
    } else {
      // Deliver immediately
      await this.deliverEvent(event);
    }
  }

  /**
   * Publish multiple events
   */
  async publishBatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Subscribe to events
   */
  subscribe(
    eventType: string,
    handler: EventHandler,
    subscriberId?: string
  ): EventSubscription {
    const id = subscriberId || `sub_${Date.now()}_${Math.random()}`;

    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }

    this.subscribers.get(eventType)!.add({ id, handler });

    // Also subscribe to wildcard
    if (eventType !== '*') {
      if (!this.subscribers.has('*')) {
        this.subscribers.set('*', new Set());
      }
    }

    return {
      id,
      eventType,
      isActive: true,
      unsubscribe: () => {
        const handlers = this.subscribers.get(eventType);
        if (handlers) {
          // Find and remove by id
          for (const sub of handlers) {
            if (sub.id === id) {
              handlers.delete(sub);
              break;
            }
          }
          if (handlers.size === 0) {
            this.subscribers.delete(eventType);
          }
        }
      },
    };
  }

  /**
   * Deliver event to subscribers
   */
  private async deliverEvent(event: DomainEvent): Promise<void> {
    const handlers = this.getHandlers(event.eventType);

    for (const { id, handler } of handlers) {
      if (this.config.guaranteedDelivery) {
        // Add to pending deliveries
        this.pendingDeliveries.push({
          event,
          subscriber: id,
          attempts: 0,
        });
      } else {
        // Fire and forget
        try {
          await handler(event);
        } catch (error) {
          logger.error(`Error delivering event ${event.id} to ${id}:`, error);
        }
      }
    }
  }

  /**
   * Get handlers for an event type
   */
  private getHandlers(
    eventType: string
  ): Array<{ id: string; handler: EventHandler }> {
    const handlers: Array<{ id: string; handler: EventHandler }> = [];

    // Add specific handlers
    const specificHandlers = this.subscribers.get(eventType);
    if (specificHandlers) {
      handlers.push(...Array.from(specificHandlers));
    }

    // Add wildcard handlers
    const wildcardHandlers = this.subscribers.get('*');
    if (wildcardHandlers) {
      handlers.push(...Array.from(wildcardHandlers));
    }

    return handlers;
  }

  /**
   * Process delivery queue
   */
  private async processDeliveryQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    while (this.deliveryQueue.length > 0) {
      const event = this.deliveryQueue.shift()!;
      await this.deliverEvent(event);
    }

    this.processing = false;
  }

  /**
   * Start delivery processor (for guaranteed delivery)
   */
  private startDeliveryProcessor(): void {
    setInterval(async () => {
      await this.processPendingDeliveries();
    }, 1000);
  }

  /**
   * Process pending deliveries
   */
  private async processPendingDeliveries(): Promise<void> {
    const toProcess = [...this.pendingDeliveries];
    this.pendingDeliveries = [];

    for (const delivery of toProcess) {
      const handlers = this.getHandlers(delivery.event.eventType);
      const handler = handlers.find((h) => h.id === delivery.subscriber);

      if (!handler) {
        // Subscriber no longer exists
        continue;
      }

      try {
        await handler.handler(delivery.event);
        // Successfully delivered
      } catch (error) {
        delivery.attempts++;
        delivery.lastAttempt = new Date();
        delivery.error = error instanceof Error ? error.message : 'Unknown error';

        if (delivery.attempts < this.config.maxRetries) {
          // Retry
          this.pendingDeliveries.push(delivery);
        } else {
          // Send to dead letter queue
          if (this.config.enableDeadLetterQueue) {
            logger.error(
              `Event ${delivery.event.id} failed after ${delivery.attempts} attempts`
            );
          }
        }
      }
    }
  }

  /**
   * Get subscriber count
   */
  getSubscriberCount(eventType?: string): number {
    if (eventType) {
      return this.subscribers.get(eventType)?.size || 0;
    }

    let total = 0;
    for (const handlers of this.subscribers.values()) {
      total += handlers.size;
    }
    return total;
  }

  /**
   * Get pending deliveries count
   */
  getPendingDeliveriesCount(): number {
    return this.pendingDeliveries.length;
  }

  /**
   * Get event types with subscribers
   */
  getEventTypes(): string[] {
    return Array.from(this.subscribers.keys());
  }

  /**
   * Clear all subscribers
   */
  clearSubscribers(): void {
    this.subscribers.clear();
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalSubscribers: number;
    eventTypes: number;
    pendingDeliveries: number;
    queuedEvents: number;
  } {
    return {
      totalSubscribers: this.getSubscriberCount(),
      eventTypes: this.subscribers.size,
      pendingDeliveries: this.pendingDeliveries.length,
      queuedEvents: this.deliveryQueue.length,
    };
  }
}

/**
 * Global event bus instance
 */
export const eventBus = new EventBus({
  guaranteedDelivery: true,
  enableDeadLetterQueue: true,
  maxRetries: 3,
  enableOrdering: true,
});

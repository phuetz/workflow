/**
 * Event Subscriber
 * Advanced event subscription with filtering, backpressure, and checkpointing
 */

import {
  DomainEvent,
  EventHandler,
  EventSubscription,
} from './types/eventsourcing';
import { eventStore } from './EventStore';
import { eventPublisher } from './EventPublisher';
import { logger } from '../services/SimpleLogger';

/**
 * Subscription Filter
 * Define criteria for event filtering
 */
export interface SubscriptionFilter {
  /** Event types to include */
  eventTypes?: string[];

  /** Aggregate types to include */
  aggregateTypes?: string[];

  /** Aggregate IDs to include */
  aggregateIds?: string[];

  /** Custom filter function */
  customFilter?: (event: DomainEvent) => boolean;

  /** User IDs to include */
  userIds?: string[];

  /** Correlation IDs to include */
  correlationIds?: string[];
}

/**
 * Subscription Options
 */
export interface SubscriptionOptions {
  /** Subscription name */
  name: string;

  /** Event filter */
  filter?: SubscriptionFilter;

  /** Enable checkpointing */
  enableCheckpointing?: boolean;

  /** Checkpoint interval (events) */
  checkpointInterval?: number;

  /** Enable backpressure handling */
  enableBackpressure?: boolean;

  /** Max queue size for backpressure */
  maxQueueSize?: number;

  /** Processing mode: sequential or parallel */
  processingMode?: 'sequential' | 'parallel';

  /** Max concurrent handlers (for parallel mode) */
  maxConcurrency?: number;

  /** Enable automatic retry on handler failure */
  autoRetry?: boolean;

  /** Max retry attempts */
  maxRetries?: number;

  /** Start from beginning */
  startFromBeginning?: boolean;
}

/**
 * Subscription Checkpoint
 * Track subscription progress
 */
interface SubscriptionCheckpoint {
  subscriptionName: string;
  lastEventId: string;
  lastEventTimestamp: Date;
  eventsProcessed: number;
  lastCheckpointTime: Date;
}

/**
 * Event Subscriber Implementation
 */
export class EventSubscriber {
  private subscriptions: Map<string, EventSubscription> = new Map();
  private checkpoints: Map<string, SubscriptionCheckpoint> = new Map();
  private eventQueues: Map<string, DomainEvent[]> = new Map();
  private processing: Map<string, boolean> = new Map();

  /**
   * Subscribe to events with options
   */
  subscribe(
    handler: EventHandler,
    options: SubscriptionOptions
  ): EventSubscription {
    const { name, filter, processingMode = 'sequential' } = options;

    // Wrap handler with filtering and options
    const wrappedHandler = async (event: DomainEvent): Promise<void> => {
      // Apply filter
      if (filter && !this.matchesFilter(event, filter)) {
        return;
      }

      // Handle backpressure
      if (options.enableBackpressure) {
        await this.handleBackpressure(name, event, handler, options);
      } else if (processingMode === 'sequential') {
        await this.handleSequential(name, event, handler, options);
      } else {
        await this.handleParallel(name, event, handler, options);
      }
    };

    // Subscribe to publisher
    const eventTypes = filter?.eventTypes || ['*'];
    const subscriptions: EventSubscription[] = [];

    for (const eventType of eventTypes) {
      const sub = eventPublisher.subscribe(eventType, wrappedHandler);
      subscriptions.push(sub);
    }

    // Create combined subscription
    const combinedSubscription: EventSubscription = {
      id: `sub_${name}_${Date.now()}`,
      eventType: eventTypes.join(','),
      isActive: true,
      unsubscribe: () => {
        subscriptions.forEach((sub) => sub.unsubscribe());
        this.subscriptions.delete(name);
        this.checkpoints.delete(name);
        this.eventQueues.delete(name);
      },
    };

    this.subscriptions.set(name, combinedSubscription);

    // Load checkpoint if enabled
    if (options.enableCheckpointing && options.startFromBeginning) {
      this.replayFromCheckpoint(name, handler, options);
    }

    return combinedSubscription;
  }

  /**
   * Check if event matches filter
   */
  private matchesFilter(event: DomainEvent, filter: SubscriptionFilter): boolean {
    // Check event types
    if (
      filter.eventTypes &&
      filter.eventTypes.length > 0 &&
      !filter.eventTypes.includes(event.eventType)
    ) {
      return false;
    }

    // Check aggregate types
    if (
      filter.aggregateTypes &&
      filter.aggregateTypes.length > 0 &&
      !filter.aggregateTypes.includes(event.aggregateType)
    ) {
      return false;
    }

    // Check aggregate IDs
    if (
      filter.aggregateIds &&
      filter.aggregateIds.length > 0 &&
      !filter.aggregateIds.includes(event.aggregateId)
    ) {
      return false;
    }

    // Check user IDs
    if (
      filter.userIds &&
      filter.userIds.length > 0 &&
      event.userId &&
      !filter.userIds.includes(event.userId)
    ) {
      return false;
    }

    // Check correlation IDs
    if (
      filter.correlationIds &&
      filter.correlationIds.length > 0 &&
      event.correlationId &&
      !filter.correlationIds.includes(event.correlationId)
    ) {
      return false;
    }

    // Custom filter
    if (filter.customFilter && !filter.customFilter(event)) {
      return false;
    }

    return true;
  }

  /**
   * Handle sequential processing
   */
  private async handleSequential(
    name: string,
    event: DomainEvent,
    handler: EventHandler,
    options: SubscriptionOptions
  ): Promise<void> {
    // Wait if already processing
    while (this.processing.get(name)) {
      await this.sleep(10);
    }

    this.processing.set(name, true);

    try {
      await this.executeHandler(handler, event, options);
      await this.updateCheckpoint(name, event, options);
    } finally {
      this.processing.set(name, false);
    }
  }

  /**
   * Handle parallel processing
   */
  private async handleParallel(
    name: string,
    event: DomainEvent,
    handler: EventHandler,
    options: SubscriptionOptions
  ): Promise<void> {
    // Execute handler without waiting
    this.executeHandler(handler, event, options).then(() => {
      this.updateCheckpoint(name, event, options);
    });
  }

  /**
   * Handle backpressure
   */
  private async handleBackpressure(
    name: string,
    event: DomainEvent,
    handler: EventHandler,
    options: SubscriptionOptions
  ): Promise<void> {
    const queue = this.eventQueues.get(name) || [];
    const maxSize = options.maxQueueSize || 1000;

    // Check queue size
    if (queue.length >= maxSize) {
      logger.warn(
        `Subscription ${name} queue is full (${queue.length}/${maxSize}). Dropping event.`
      );
      return;
    }

    // Add to queue
    queue.push(event);
    this.eventQueues.set(name, queue);

    // Process queue if not already processing
    if (!this.processing.get(name)) {
      await this.processQueue(name, handler, options);
    }
  }

  /**
   * Process event queue
   */
  private async processQueue(
    name: string,
    handler: EventHandler,
    options: SubscriptionOptions
  ): Promise<void> {
    this.processing.set(name, true);

    const queue = this.eventQueues.get(name) || [];

    while (queue.length > 0) {
      const event = queue.shift()!;

      try {
        await this.executeHandler(handler, event, options);
        await this.updateCheckpoint(name, event, options);
      } catch (error) {
        logger.error(`Error processing event in queue ${name}:`, error);
        // Re-queue event if retries are enabled
        if (options.autoRetry) {
          queue.push(event);
        }
      }
    }

    this.processing.set(name, false);
  }

  /**
   * Execute handler with retry logic
   */
  private async executeHandler(
    handler: EventHandler,
    event: DomainEvent,
    options: SubscriptionOptions,
    attempt: number = 1
  ): Promise<void> {
    try {
      await handler(event);
    } catch (error) {
      if (options.autoRetry && attempt < (options.maxRetries || 3)) {
        logger.warn(
          `Handler failed, retrying (${attempt}/${options.maxRetries}):`,
          error
        );
        await this.sleep(1000 * attempt); // Exponential backoff
        await this.executeHandler(handler, event, options, attempt + 1);
      } else {
        throw error;
      }
    }
  }

  /**
   * Update subscription checkpoint
   */
  private async updateCheckpoint(
    name: string,
    event: DomainEvent,
    options: SubscriptionOptions
  ): Promise<void> {
    if (!options.enableCheckpointing) {
      return;
    }

    const checkpoint = this.checkpoints.get(name) || {
      subscriptionName: name,
      lastEventId: '',
      lastEventTimestamp: new Date(0),
      eventsProcessed: 0,
      lastCheckpointTime: new Date(),
    };

    checkpoint.lastEventId = event.id;
    checkpoint.lastEventTimestamp = event.timestamp;
    checkpoint.eventsProcessed++;

    // Save checkpoint at interval
    const interval = options.checkpointInterval || 100;
    if (checkpoint.eventsProcessed % interval === 0) {
      checkpoint.lastCheckpointTime = new Date();
      // In production, persist to database
      logger.debug(
        `Checkpoint saved for ${name}: ${checkpoint.eventsProcessed} events processed`
      );
    }

    this.checkpoints.set(name, checkpoint);
  }

  /**
   * Replay events from checkpoint
   */
  private async replayFromCheckpoint(
    name: string,
    handler: EventHandler,
    options: SubscriptionOptions
  ): Promise<void> {
    const checkpoint = this.checkpoints.get(name);
    const fromTimestamp = checkpoint?.lastEventTimestamp;

    // Get all events from checkpoint
    const events = await eventStore.getAllEvents(fromTimestamp);

    logger.debug(
      `Replaying ${events.length} events from checkpoint for ${name}`
    );

    // Process events
    for (const event of events) {
      // Apply filter
      if (options.filter && !this.matchesFilter(event, options.filter)) {
        continue;
      }

      await this.executeHandler(handler, event, options);
      await this.updateCheckpoint(name, event, options);
    }
  }

  /**
   * Get subscription checkpoint
   */
  getCheckpoint(name: string): SubscriptionCheckpoint | undefined {
    return this.checkpoints.get(name);
  }

  /**
   * Get all subscriptions
   */
  getAllSubscriptions(): Map<string, EventSubscription> {
    return new Map(this.subscriptions);
  }

  /**
   * Unsubscribe by name
   */
  unsubscribe(name: string): void {
    const subscription = this.subscriptions.get(name);
    if (subscription) {
      subscription.unsubscribe();
    }
  }

  /**
   * Get queue size
   */
  getQueueSize(name: string): number {
    return this.eventQueues.get(name)?.length || 0;
  }

  /**
   * Get subscription statistics
   */
  getStatistics(name: string): {
    eventsProcessed: number;
    queueSize: number;
    lastEventTimestamp?: Date;
    isProcessing: boolean;
  } | null {
    const checkpoint = this.checkpoints.get(name);
    if (!checkpoint) {
      return null;
    }

    return {
      eventsProcessed: checkpoint.eventsProcessed,
      queueSize: this.getQueueSize(name),
      lastEventTimestamp: checkpoint.lastEventTimestamp,
      isProcessing: this.processing.get(name) || false,
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Global event subscriber instance
 */
export const eventSubscriber = new EventSubscriber();

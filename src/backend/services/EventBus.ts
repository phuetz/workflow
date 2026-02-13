/**
 * Event Bus System
 * Centralized event management for workflow lifecycle events
 *
 * Features:
 * - Workflow lifecycle events
 * - Execution lifecycle events
 * - System events
 * - Event filtering and subscriptions
 * - Event history and replay
 * - High-performance event dispatching
 */

import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';

export type WorkflowEvent =
  | 'workflow.created'
  | 'workflow.updated'
  | 'workflow.deleted'
  | 'workflow.activated'
  | 'workflow.deactivated'
  | 'workflow.cloned'
  | 'workflow.exported'
  | 'workflow.imported';

export type ExecutionEvent =
  | 'execution.started'
  | 'execution.node_started'
  | 'execution.node_completed'
  | 'execution.node_failed'
  | 'execution.data_flow'
  | 'execution.progress'
  | 'execution.completed'
  | 'execution.failed'
  | 'execution.cancelled'
  | 'execution.timeout';

export type SystemEvent =
  | 'system.startup'
  | 'system.shutdown'
  | 'system.health_check'
  | 'system.resource_warning'
  | 'system.queue_status'
  | 'system.error';

export type EventType = WorkflowEvent | ExecutionEvent | SystemEvent;

export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  source: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface EventFilter {
  types?: EventType[];
  sources?: string[];
  since?: Date;
  until?: Date;
  customFilter?: (event: BaseEvent) => boolean;
}

export interface EventSubscription {
  id: string;
  filter: EventFilter;
  callback: (event: BaseEvent) => void;
  once?: boolean;
}

export interface EventHistory {
  enabled: boolean;
  maxSize: number;
  events: BaseEvent[];
}

export class EventBus extends EventEmitter {
  private subscriptions = new Map<string, EventSubscription>();
  private history: EventHistory;
  private eventCounts = new Map<EventType, number>();
  private isShuttingDown = false;

  constructor(options?: {
    historyEnabled?: boolean;
    historyMaxSize?: number;
  }) {
    super();
    this.setMaxListeners(1000); // Support many concurrent subscriptions

    this.history = {
      enabled: options?.historyEnabled !== false,
      maxSize: options?.historyMaxSize || 10000,
      events: []
    };

    logger.info('EventBus initialized', {
      historyEnabled: this.history.enabled,
      historyMaxSize: this.history.maxSize
    });
  }

  /**
   * Publish event
   */
  public publish(type: EventType, data: Record<string, unknown>, source = 'system'): void {
    if (this.isShuttingDown) {
      logger.warn('Cannot publish event: EventBus is shutting down', { type });
      return;
    }

    const event: BaseEvent = {
      id: this.generateEventId(),
      type,
      timestamp: new Date(),
      source,
      data,
      metadata: {
        sequence: this.getEventSequence(type)
      }
    };

    // Add to history
    if (this.history.enabled) {
      this.addToHistory(event);
    }

    // Increment event count
    this.eventCounts.set(type, (this.eventCounts.get(type) || 0) + 1);

    // Emit to EventEmitter listeners
    this.emit(type, event);
    this.emit('*', event); // Wildcard listener

    // Dispatch to filtered subscriptions
    this.dispatchToSubscriptions(event);

    logger.debug('Event published', {
      type,
      source,
      eventId: event.id
    });
  }

  /**
   * Subscribe to events
   */
  public subscribe(
    filter: EventFilter,
    callback: (event: BaseEvent) => void,
    once = false
  ): string {
    const subscriptionId = this.generateSubscriptionId();

    const subscription: EventSubscription = {
      id: subscriptionId,
      filter,
      callback,
      once
    };

    this.subscriptions.set(subscriptionId, subscription);

    logger.debug('Event subscription created', {
      subscriptionId,
      filterTypes: filter.types
    });

    return subscriptionId;
  }

  /**
   * Subscribe to single event type
   * Note: Use different name to avoid conflict with EventEmitter.on()
   */
  public onEvent(type: EventType, callback: (event: BaseEvent) => void): string {
    return this.subscribe({ types: [type] }, callback, false);
  }

  /**
   * Subscribe to single event (one-time)
   * Note: Use different name to avoid conflict with EventEmitter.once()
   */
  public onceEvent(type: EventType, callback: (event: BaseEvent) => void): string {
    return this.subscribe({ types: [type] }, callback, true);
  }

  /**
   * Unsubscribe from events
   */
  public unsubscribe(subscriptionId: string): boolean {
    const deleted = this.subscriptions.delete(subscriptionId);

    if (deleted) {
      logger.debug('Event subscription removed', { subscriptionId });
    }

    return deleted;
  }

  /**
   * Dispatch event to filtered subscriptions
   */
  private dispatchToSubscriptions(event: BaseEvent): void {
    const subscriptionsToRemove: string[] = [];

    for (const [id, subscription] of this.subscriptions.entries()) {
      if (this.matchesFilter(event, subscription.filter)) {
        try {
          subscription.callback(event);

          // Remove one-time subscriptions
          if (subscription.once) {
            subscriptionsToRemove.push(id);
          }
        } catch (error) {
          logger.error('Error in event subscription callback', {
            subscriptionId: id,
            error
          });
        }
      }
    }

    // Remove one-time subscriptions
    for (const id of subscriptionsToRemove) {
      this.subscriptions.delete(id);
    }
  }

  /**
   * Check if event matches filter
   */
  private matchesFilter(event: BaseEvent, filter: EventFilter): boolean {
    // Check event type
    if (filter.types && !filter.types.includes(event.type)) {
      return false;
    }

    // Check source
    if (filter.sources && !filter.sources.includes(event.source)) {
      return false;
    }

    // Check time range
    if (filter.since && event.timestamp < filter.since) {
      return false;
    }

    if (filter.until && event.timestamp > filter.until) {
      return false;
    }

    // Check custom filter
    if (filter.customFilter && !filter.customFilter(event)) {
      return false;
    }

    return true;
  }

  /**
   * Add event to history
   */
  private addToHistory(event: BaseEvent): void {
    this.history.events.push(event);

    // Trim history if it exceeds max size
    if (this.history.events.length > this.history.maxSize) {
      const excess = this.history.events.length - this.history.maxSize;
      this.history.events.splice(0, excess);
    }
  }

  /**
   * Get event history
   */
  public getHistory(filter?: EventFilter): BaseEvent[] {
    if (!this.history.enabled) {
      return [];
    }

    if (!filter) {
      return [...this.history.events];
    }

    return this.history.events.filter(event => this.matchesFilter(event, filter));
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.history.events = [];
    logger.info('Event history cleared');
  }

  /**
   * Replay events
   */
  public replay(
    filter: EventFilter,
    callback: (event: BaseEvent) => void,
    delay = 0
  ): void {
    const events = this.getHistory(filter);

    logger.info('Replaying events', {
      count: events.length,
      delay
    });

    if (delay === 0) {
      // Replay immediately
      events.forEach(callback);
    } else {
      // Replay with delay
      let index = 0;
      const interval = setInterval(() => {
        if (index >= events.length) {
          clearInterval(interval);
          return;
        }

        callback(events[index]);
        index++;
      }, delay);
    }
  }

  /**
   * Get event statistics
   */
  public getStats(): {
    subscriptions: number;
    historySize: number;
    eventCounts: Map<EventType, number>;
    totalEvents: number;
  } {
    const totalEvents = Array.from(this.eventCounts.values())
      .reduce((sum, count) => sum + count, 0);

    return {
      subscriptions: this.subscriptions.size,
      historySize: this.history.events.length,
      eventCounts: new Map(this.eventCounts),
      totalEvents
    };
  }

  /**
   * Get event count by type
   */
  public getEventCount(type: EventType): number {
    return this.eventCounts.get(type) || 0;
  }

  /**
   * Get event sequence number
   */
  private getEventSequence(type: EventType): number {
    return this.eventCounts.get(type) || 0;
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Shutdown event bus
   */
  public shutdown(): void {
    this.isShuttingDown = true;

    logger.info('Shutting down EventBus', {
      subscriptions: this.subscriptions.size,
      historySize: this.history.events.length
    });

    // Clear subscriptions
    this.subscriptions.clear();

    // Clear history if needed
    // this.clearHistory();

    // Remove all listeners
    this.removeAllListeners();

    logger.info('EventBus shutdown complete');
  }
}

// Singleton instance
let eventBus: EventBus | null = null;

/**
 * Get or create event bus instance
 */
export function getEventBus(): EventBus {
  if (!eventBus) {
    eventBus = new EventBus();
  }
  return eventBus;
}

/**
 * Initialize event bus
 */
export function initializeEventBus(options?: {
  historyEnabled?: boolean;
  historyMaxSize?: number;
}): EventBus {
  if (!eventBus) {
    eventBus = new EventBus(options);
  }
  return eventBus;
}

/**
 * Publish helper functions for common events
 */
export class EventPublisher {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  // Workflow events
  workflowCreated(workflowId: string, data: Record<string, unknown>): void {
    this.eventBus.publish('workflow.created', { workflowId, ...data }, 'workflow');
  }

  workflowUpdated(workflowId: string, changes: Record<string, unknown>): void {
    this.eventBus.publish('workflow.updated', { workflowId, changes }, 'workflow');
  }

  workflowDeleted(workflowId: string): void {
    this.eventBus.publish('workflow.deleted', { workflowId }, 'workflow');
  }

  workflowActivated(workflowId: string): void {
    this.eventBus.publish('workflow.activated', { workflowId }, 'workflow');
  }

  workflowDeactivated(workflowId: string): void {
    this.eventBus.publish('workflow.deactivated', { workflowId }, 'workflow');
  }

  // Execution events
  executionStarted(executionId: string, workflowId: string, data: Record<string, unknown>): void {
    this.eventBus.publish('execution.started', { executionId, workflowId, ...data }, 'execution');
  }

  executionCompleted(executionId: string, summary: Record<string, unknown>): void {
    this.eventBus.publish('execution.completed', { executionId, ...summary }, 'execution');
  }

  executionFailed(executionId: string, error: string, data: Record<string, unknown>): void {
    this.eventBus.publish('execution.failed', { executionId, error, ...data }, 'execution');
  }

  executionCancelled(executionId: string, reason?: string): void {
    this.eventBus.publish('execution.cancelled', { executionId, reason }, 'execution');
  }

  // Node execution events
  nodeStarted(executionId: string, nodeId: string, nodeType: string): void {
    this.eventBus.publish('execution.node_started', { executionId, nodeId, nodeType }, 'execution');
  }

  nodeCompleted(executionId: string, nodeId: string, duration: number, data: Record<string, unknown>): void {
    this.eventBus.publish('execution.node_completed', { executionId, nodeId, duration, ...data }, 'execution');
  }

  nodeFailed(executionId: string, nodeId: string, error: string): void {
    this.eventBus.publish('execution.node_failed', { executionId, nodeId, error }, 'execution');
  }

  // System events
  systemStartup(): void {
    this.eventBus.publish('system.startup', { timestamp: new Date() }, 'system');
  }

  systemShutdown(): void {
    this.eventBus.publish('system.shutdown', { timestamp: new Date() }, 'system');
  }

  systemHealthCheck(status: string, metrics: Record<string, unknown>): void {
    this.eventBus.publish('system.health_check', { status, metrics }, 'system');
  }

  systemResourceWarning(resource: string, usage: number, threshold: number): void {
    this.eventBus.publish('system.resource_warning', { resource, usage, threshold }, 'system');
  }

  systemError(error: string, details: Record<string, unknown>): void {
    this.eventBus.publish('system.error', { error, ...details }, 'system');
  }
}

/**
 * Get event publisher
 */
export function getEventPublisher(): EventPublisher {
  return new EventPublisher(getEventBus());
}

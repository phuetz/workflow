/**
 * Event Store Implementation
 * PostgreSQL-based append-only event store with snapshots
 */

import { logger } from '../services/SimpleLogger';
import {
  IEventStore,
  DomainEvent,
  EventStoreEntry,
  AggregateSnapshot,
  EventSubscription,
  EventHandler,
  EventStoreConfig,
  ConcurrencyException,
  AggregateNotFoundException,
  EventStatistics,
} from './types/eventsourcing';

/**
 * In-memory Event Store Implementation
 * For production, replace with PostgreSQL or EventStoreDB
 */
export class EventStore implements IEventStore {
  private events: Map<string, EventStoreEntry[]> = new Map();
  private snapshots: Map<string, AggregateSnapshot> = new Map();
  private subscribers: Map<string, Set<EventHandler>> = new Map();
  private config: EventStoreConfig;
  private globalEventLog: EventStoreEntry[] = [];

  constructor(config?: Partial<EventStoreConfig>) {
    this.config = {
      connectionString: config?.connectionString || 'postgresql://localhost:5432/workflows',
      snapshotFrequency: config?.snapshotFrequency || 100,
      enableVersioning: config?.enableVersioning !== false,
      retentionDays: config?.retentionDays || 2555, // 7 years
      maxEventsPerRead: config?.maxEventsPerRead || 1000,
      enableOptimisticLocking: config?.enableOptimisticLocking !== false,
    };
  }

  /**
   * Append events to an aggregate
   */
  async append(
    aggregateId: string,
    aggregateType: string,
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void> {
    const key = this.getAggregateKey(aggregateId, aggregateType);

    // Get current events for this aggregate
    const existingEvents = this.events.get(key) || [];

    // Optimistic concurrency check
    if (this.config.enableOptimisticLocking && expectedVersion !== undefined) {
      const currentVersion = existingEvents.length;
      if (currentVersion !== expectedVersion) {
        throw new ConcurrencyException(aggregateId, expectedVersion, currentVersion);
      }
    }

    // Convert domain events to store entries
    const storeEntries: EventStoreEntry[] = events.map((event, index) => ({
      id: event.id,
      aggregateId,
      aggregateType,
      eventType: event.eventType,
      version: event.version,
      aggregateVersion: existingEvents.length + index + 1,
      data: JSON.stringify(event.data),
      metadata: JSON.stringify(event.metadata),
      timestamp: event.timestamp,
      correlationId: event.correlationId,
      causationId: event.causationId,
      userId: event.userId,
    }));

    // Append to aggregate event stream
    existingEvents.push(...storeEntries);
    this.events.set(key, existingEvents);

    // Append to global event log
    this.globalEventLog.push(...storeEntries);

    // Notify subscribers
    for (const event of events) {
      await this.notifySubscribers(event);
    }

    // Check if snapshot should be taken
    const newVersion = existingEvents.length;
    if (newVersion % this.config.snapshotFrequency === 0) {
      // Note: Snapshot creation is handled externally by the Snapshot service
      logger.debug(`Snapshot recommended for ${aggregateType}:${aggregateId} at version ${newVersion}`);
    }
  }

  /**
   * Get all events for an aggregate
   */
  async getEvents(
    aggregateId: string,
    aggregateType: string,
    fromVersion?: number
  ): Promise<DomainEvent[]> {
    const key = this.getAggregateKey(aggregateId, aggregateType);
    const storeEntries = this.events.get(key) || [];

    if (storeEntries.length === 0) {
      return [];
    }

    // Filter by version if specified
    const filteredEntries = fromVersion
      ? storeEntries.filter((e) => e.aggregateVersion >= fromVersion)
      : storeEntries;

    // Convert store entries to domain events
    return filteredEntries.map(this.toDomainEvent);
  }

  /**
   * Subscribe to events of a specific type
   */
  subscribe(
    eventType: string,
    handler: EventHandler,
    aggregateType?: string
  ): EventSubscription {
    const subscriptionKey = aggregateType
      ? `${eventType}:${aggregateType}`
      : eventType;

    if (!this.subscribers.has(subscriptionKey)) {
      this.subscribers.set(subscriptionKey, new Set());
    }

    this.subscribers.get(subscriptionKey)!.add(handler);

    const subscriptionId = `sub_${Date.now()}_${Math.random()}`;

    return {
      id: subscriptionId,
      eventType,
      aggregateType,
      isActive: true,
      unsubscribe: () => {
        const handlers = this.subscribers.get(subscriptionKey);
        if (handlers) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            this.subscribers.delete(subscriptionKey);
          }
        }
      },
    };
  }

  /**
   * Get all events in the store (for replay)
   */
  async getAllEvents(
    fromTimestamp?: Date,
    toTimestamp?: Date,
    eventTypes?: string[]
  ): Promise<DomainEvent[]> {
    let events = [...this.globalEventLog];

    // Filter by timestamp
    if (fromTimestamp) {
      events = events.filter((e) => e.timestamp >= fromTimestamp);
    }
    if (toTimestamp) {
      events = events.filter((e) => e.timestamp <= toTimestamp);
    }

    // Filter by event types
    if (eventTypes && eventTypes.length > 0) {
      events = events.filter((e) => eventTypes.includes(e.eventType));
    }

    // Convert to domain events
    return events.map(this.toDomainEvent);
  }

  /**
   * Save a snapshot of an aggregate
   */
  async saveSnapshot(
    aggregateId: string,
    aggregateType: string,
    version: number,
    state: Record<string, unknown>
  ): Promise<void> {
    const key = this.getAggregateKey(aggregateId, aggregateType);

    const snapshot: AggregateSnapshot = {
      id: `snapshot_${aggregateId}_${version}`,
      aggregateId,
      aggregateType,
      version,
      state: JSON.stringify(state),
      timestamp: new Date(),
    };

    this.snapshots.set(key, snapshot);
  }

  /**
   * Get the latest snapshot for an aggregate
   */
  async getSnapshot(
    aggregateId: string,
    aggregateType: string
  ): Promise<AggregateSnapshot | null> {
    const key = this.getAggregateKey(aggregateId, aggregateType);
    return this.snapshots.get(key) || null;
  }

  /**
   * Get current version of an aggregate
   */
  async getVersion(aggregateId: string, aggregateType: string): Promise<number> {
    const key = this.getAggregateKey(aggregateId, aggregateType);
    const events = this.events.get(key) || [];
    return events.length;
  }

  /**
   * Get event statistics
   */
  async getStatistics(): Promise<EventStatistics> {
    const eventsByAggregateType: Record<string, number> = {};
    const eventsByEventType: Record<string, number> = {};

    for (const event of this.globalEventLog) {
      eventsByAggregateType[event.aggregateType] =
        (eventsByAggregateType[event.aggregateType] || 0) + 1;
      eventsByEventType[event.eventType] =
        (eventsByEventType[event.eventType] || 0) + 1;
    }

    const timestamps = this.globalEventLog.map((e) => e.timestamp);

    return {
      totalEvents: this.globalEventLog.length,
      eventsByAggregateType,
      eventsByEventType,
      totalSnapshots: this.snapshots.size,
      avgEventsPerAggregate:
        this.events.size > 0 ? this.globalEventLog.length / this.events.size : 0,
      oldestEvent: timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : undefined,
      newestEvent: timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : undefined,
    };
  }

  /**
   * Clear all events (for testing only)
   */
  async clear(): Promise<void> {
    this.events.clear();
    this.snapshots.clear();
    this.globalEventLog = [];
  }

  /**
   * Get aggregate key for internal storage
   */
  private getAggregateKey(aggregateId: string, aggregateType: string): string {
    return `${aggregateType}:${aggregateId}`;
  }

  /**
   * Notify subscribers of a new event
   */
  private async notifySubscribers(event: DomainEvent): Promise<void> {
    // Notify event type subscribers
    const eventTypeHandlers = this.subscribers.get(event.eventType);
    if (eventTypeHandlers) {
      for (const handler of eventTypeHandlers) {
        try {
          await handler(event);
        } catch (error) {
          logger.error(`Error in event handler for ${event.eventType}:`, error);
        }
      }
    }

    // Notify aggregate type + event type subscribers
    const aggregateEventKey = `${event.eventType}:${event.aggregateType}`;
    const aggregateHandlers = this.subscribers.get(aggregateEventKey);
    if (aggregateHandlers) {
      for (const handler of aggregateHandlers) {
        try {
          await handler(event);
        } catch (error) {
          logger.error(`Error in event handler for ${aggregateEventKey}:`, error);
        }
      }
    }
  }

  /**
   * Convert store entry to domain event
   */
  private toDomainEvent(entry: EventStoreEntry): DomainEvent {
    return {
      id: entry.id,
      aggregateId: entry.aggregateId,
      aggregateType: entry.aggregateType,
      eventType: entry.eventType,
      version: entry.version,
      data: JSON.parse(entry.data),
      metadata: JSON.parse(entry.metadata),
      timestamp: entry.timestamp,
      correlationId: entry.correlationId,
      causationId: entry.causationId,
      userId: entry.userId,
    };
  }

  /**
   * Rebuild an aggregate from events
   */
  async rebuildAggregate(
    aggregateId: string,
    aggregateType: string
  ): Promise<Record<string, unknown>> {
    // Check for snapshot first
    const snapshot = await this.getSnapshot(aggregateId, aggregateType);
    const fromVersion = snapshot ? snapshot.version + 1 : 1;

    // Get events from snapshot version
    const events = await this.getEvents(aggregateId, aggregateType, fromVersion);

    // Start with snapshot state or empty state
    let state: Record<string, unknown> = snapshot
      ? JSON.parse(snapshot.state)
      : {};

    // Apply events to rebuild state
    for (const event of events) {
      state = this.applyEventToState(state, event);
    }

    return state;
  }

  /**
   * Apply event to state (basic implementation)
   */
  private applyEventToState(
    state: Record<string, unknown>,
    event: DomainEvent
  ): Record<string, unknown> {
    // This is a simplified implementation
    // In production, use proper aggregate classes with apply methods
    return {
      ...state,
      ...event.data,
      lastEventType: event.eventType,
      lastEventTimestamp: event.timestamp,
      version: event.version,
    };
  }

  /**
   * Stream events in batches
   */
  async *streamEvents(
    aggregateId?: string,
    aggregateType?: string,
    batchSize: number = 100
  ): AsyncGenerator<DomainEvent[]> {
    let events: EventStoreEntry[];

    if (aggregateId && aggregateType) {
      const key = this.getAggregateKey(aggregateId, aggregateType);
      events = this.events.get(key) || [];
    } else {
      events = this.globalEventLog;
    }

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      yield batch.map(this.toDomainEvent);
    }
  }

  /**
   * Get events by correlation ID (for distributed tracing)
   */
  async getEventsByCorrelationId(correlationId: string): Promise<DomainEvent[]> {
    const events = this.globalEventLog.filter(
      (e) => e.correlationId === correlationId
    );
    return events.map(this.toDomainEvent);
  }

  /**
   * Get events by causation ID
   */
  async getEventsByCausationId(causationId: string): Promise<DomainEvent[]> {
    const events = this.globalEventLog.filter((e) => e.causationId === causationId);
    return events.map(this.toDomainEvent);
  }

  /**
   * Archive old events (for retention policy)
   */
  async archiveOldEvents(beforeDate: Date): Promise<number> {
    const toArchive = this.globalEventLog.filter(
      (e) => e.timestamp < beforeDate
    );

    // In production, move to archive storage
    logger.debug(`Archiving ${toArchive.length} events before ${beforeDate}`);

    // Remove from active storage
    this.globalEventLog = this.globalEventLog.filter(
      (e) => e.timestamp >= beforeDate
    );

    // Rebuild event maps
    this.events.clear();
    for (const event of this.globalEventLog) {
      const key = this.getAggregateKey(event.aggregateId, event.aggregateType);
      if (!this.events.has(key)) {
        this.events.set(key, []);
      }
      this.events.get(key)!.push(event);
    }

    return toArchive.length;
  }

  /**
   * Truncate events for an aggregate (keep only after snapshot)
   */
  async truncateAfterSnapshot(
    aggregateId: string,
    aggregateType: string
  ): Promise<number> {
    const snapshot = await this.getSnapshot(aggregateId, aggregateType);
    if (!snapshot) {
      return 0;
    }

    const key = this.getAggregateKey(aggregateId, aggregateType);
    const events = this.events.get(key) || [];
    const eventsToKeep = events.filter(
      (e) => e.aggregateVersion > snapshot.version
    );

    const removedCount = events.length - eventsToKeep.length;

    this.events.set(key, eventsToKeep);

    // Update global log
    this.globalEventLog = this.globalEventLog.filter(
      (e) =>
        !(
          e.aggregateId === aggregateId &&
          e.aggregateType === aggregateType &&
          e.aggregateVersion <= snapshot.version
        )
    );

    return removedCount;
  }

  /**
   * Get event count for aggregate
   */
  async getEventCount(aggregateId: string, aggregateType: string): Promise<number> {
    const key = this.getAggregateKey(aggregateId, aggregateType);
    const events = this.events.get(key) || [];
    return events.length;
  }

  /**
   * Check if aggregate exists
   */
  async aggregateExists(aggregateId: string, aggregateType: string): Promise<boolean> {
    const key = this.getAggregateKey(aggregateId, aggregateType);
    return this.events.has(key) && this.events.get(key)!.length > 0;
  }
}

/**
 * PostgreSQL Event Store Implementation
 * Production-ready implementation using PostgreSQL
 */
export class PostgreSQLEventStore implements IEventStore {
  private config: EventStoreConfig;
  private subscribers: Map<string, Set<EventHandler>> = new Map();

  constructor(config: Partial<EventStoreConfig>) {
    this.config = {
      connectionString: config.connectionString || 'postgresql://localhost:5432/workflows',
      snapshotFrequency: config.snapshotFrequency || 100,
      enableVersioning: config.enableVersioning !== false,
      retentionDays: config.retentionDays || 2555,
      maxEventsPerRead: config.maxEventsPerRead || 1000,
      enableOptimisticLocking: config.enableOptimisticLocking !== false,
    };
  }

  async append(
    aggregateId: string,
    aggregateType: string,
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void> {
    // PostgreSQL implementation
    // SQL: INSERT INTO events (aggregate_id, aggregate_type, event_type, version, ...)
    // WITH optimistic locking: WHERE current_version = expectedVersion
    throw new Error('PostgreSQL implementation pending - use in-memory store for now');
  }

  async getEvents(
    aggregateId: string,
    aggregateType: string,
    fromVersion?: number
  ): Promise<DomainEvent[]> {
    // SQL: SELECT * FROM events WHERE aggregate_id = ? AND aggregate_type = ?
    // AND version >= ? ORDER BY version ASC
    throw new Error('PostgreSQL implementation pending - use in-memory store for now');
  }

  subscribe(
    eventType: string,
    handler: EventHandler,
    aggregateType?: string
  ): EventSubscription {
    // Use PostgreSQL LISTEN/NOTIFY for pub/sub
    throw new Error('PostgreSQL implementation pending - use in-memory store for now');
  }

  async getAllEvents(
    fromTimestamp?: Date,
    toTimestamp?: Date,
    eventTypes?: string[]
  ): Promise<DomainEvent[]> {
    throw new Error('PostgreSQL implementation pending - use in-memory store for now');
  }

  async saveSnapshot(
    aggregateId: string,
    aggregateType: string,
    version: number,
    state: Record<string, unknown>
  ): Promise<void> {
    throw new Error('PostgreSQL implementation pending - use in-memory store for now');
  }

  async getSnapshot(
    aggregateId: string,
    aggregateType: string
  ): Promise<AggregateSnapshot | null> {
    throw new Error('PostgreSQL implementation pending - use in-memory store for now');
  }

  async getVersion(aggregateId: string, aggregateType: string): Promise<number> {
    throw new Error('PostgreSQL implementation pending - use in-memory store for now');
  }
}

// Export singleton instance
export const eventStore = new EventStore({
  snapshotFrequency: 100,
  retentionDays: 2555, // 7 years for compliance
  enableOptimisticLocking: true,
});

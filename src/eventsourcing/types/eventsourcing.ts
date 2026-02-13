/**
 * Event Sourcing Types
 * Complete type definitions for event sourcing implementation
 */

/**
 * Base Domain Event
 * All events must extend this interface
 */
export interface DomainEvent {
  /** Unique event identifier */
  id: string;

  /** Aggregate identifier this event belongs to */
  aggregateId: string;

  /** Aggregate type (e.g., 'workflow', 'execution', 'user') */
  aggregateType: string;

  /** Event type (e.g., 'WorkflowCreated', 'NodeAdded') */
  eventType: string;

  /** Event version for schema evolution */
  version: number;

  /** Event data payload */
  data: Record<string, unknown>;

  /** Event metadata */
  metadata: EventMetadata;

  /** Event timestamp */
  timestamp: Date;

  /** Correlation ID for distributed tracing */
  correlationId?: string;

  /** Causation ID (ID of event that caused this event) */
  causationId?: string;

  /** User who caused this event */
  userId?: string;
}

/**
 * Event Metadata
 * Additional information about the event
 */
export interface EventMetadata {
  /** IP address of the requester */
  ipAddress?: string;

  /** User agent string */
  userAgent?: string;

  /** Application version that produced the event */
  appVersion?: string;

  /** Environment (dev, staging, production) */
  environment?: string;

  /** Additional custom metadata */
  [key: string]: unknown;
}

/**
 * Event Store Entry
 * How events are persisted in the database
 */
export interface EventStoreEntry {
  /** Event ID */
  id: string;

  /** Aggregate ID */
  aggregateId: string;

  /** Aggregate type */
  aggregateType: string;

  /** Event type */
  eventType: string;

  /** Event version */
  version: number;

  /** Aggregate version (sequence number) */
  aggregateVersion: number;

  /** Event data as JSON */
  data: string;

  /** Metadata as JSON */
  metadata: string;

  /** Timestamp */
  timestamp: Date;

  /** Correlation ID */
  correlationId?: string;

  /** Causation ID */
  causationId?: string;

  /** User ID */
  userId?: string;
}

/**
 * Aggregate Snapshot
 * Optimized state reconstruction
 */
export interface AggregateSnapshot {
  /** Snapshot ID */
  id: string;

  /** Aggregate ID */
  aggregateId: string;

  /** Aggregate type */
  aggregateType: string;

  /** Version this snapshot represents */
  version: number;

  /** Aggregate state as JSON */
  state: string;

  /** Timestamp when snapshot was created */
  timestamp: Date;
}

/**
 * Event Stream Subscription
 * Handle for unsubscribing from event streams
 */
export interface EventSubscription {
  /** Subscription ID */
  id: string;

  /** Event type being subscribed to */
  eventType: string;

  /** Aggregate type filter (optional) */
  aggregateType?: string;

  /** Unsubscribe function */
  unsubscribe: () => void;

  /** Whether subscription is active */
  isActive: boolean;
}

/**
 * Event Handler Function
 * Callback for processing events
 */
export type EventHandler = (event: DomainEvent) => Promise<void>;

/**
 * Event Store Configuration
 */
export interface EventStoreConfig {
  /** Database connection string */
  connectionString: string;

  /** Snapshot frequency (every N events) */
  snapshotFrequency: number;

  /** Enable event versioning */
  enableVersioning: boolean;

  /** Event retention period in days */
  retentionDays: number;

  /** Maximum events to read at once */
  maxEventsPerRead: number;

  /** Enable optimistic concurrency control */
  enableOptimisticLocking: boolean;
}

/**
 * Optimistic Concurrency Exception
 * Thrown when concurrent updates conflict
 */
export class ConcurrencyException extends Error {
  constructor(
    public aggregateId: string,
    public expectedVersion: number,
    public actualVersion: number
  ) {
    super(
      `Concurrency conflict for aggregate ${aggregateId}. Expected version ${expectedVersion}, but was ${actualVersion}`
    );
    this.name = 'ConcurrencyException';
  }
}

/**
 * Aggregate Not Found Exception
 */
export class AggregateNotFoundException extends Error {
  constructor(public aggregateId: string, public aggregateType: string) {
    super(`Aggregate ${aggregateType}:${aggregateId} not found`);
    this.name = 'AggregateNotFoundException';
  }
}

/**
 * Event Store Interface
 * Main contract for event store implementations
 */
export interface IEventStore {
  /**
   * Append events to an aggregate
   * @param aggregateId Aggregate identifier
   * @param aggregateType Aggregate type
   * @param events Events to append
   * @param expectedVersion Expected current version (for optimistic locking)
   */
  append(
    aggregateId: string,
    aggregateType: string,
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void>;

  /**
   * Get all events for an aggregate
   * @param aggregateId Aggregate identifier
   * @param aggregateType Aggregate type
   * @param fromVersion Start from this version (optional)
   */
  getEvents(
    aggregateId: string,
    aggregateType: string,
    fromVersion?: number
  ): Promise<DomainEvent[]>;

  /**
   * Subscribe to events of a specific type
   * @param eventType Event type to subscribe to
   * @param handler Event handler function
   * @param aggregateType Filter by aggregate type (optional)
   */
  subscribe(
    eventType: string,
    handler: EventHandler,
    aggregateType?: string
  ): EventSubscription;

  /**
   * Get all events in the store (for replay)
   * @param fromTimestamp Start from this timestamp (optional)
   * @param toTimestamp End at this timestamp (optional)
   * @param eventTypes Filter by event types (optional)
   */
  getAllEvents(
    fromTimestamp?: Date,
    toTimestamp?: Date,
    eventTypes?: string[]
  ): Promise<DomainEvent[]>;

  /**
   * Save a snapshot of an aggregate
   * @param aggregateId Aggregate identifier
   * @param aggregateType Aggregate type
   * @param version Version this snapshot represents
   * @param state Aggregate state
   */
  saveSnapshot(
    aggregateId: string,
    aggregateType: string,
    version: number,
    state: Record<string, unknown>
  ): Promise<void>;

  /**
   * Get the latest snapshot for an aggregate
   * @param aggregateId Aggregate identifier
   * @param aggregateType Aggregate type
   */
  getSnapshot(
    aggregateId: string,
    aggregateType: string
  ): Promise<AggregateSnapshot | null>;

  /**
   * Get current version of an aggregate
   * @param aggregateId Aggregate identifier
   * @param aggregateType Aggregate type
   */
  getVersion(aggregateId: string, aggregateType: string): Promise<number>;
}

/**
 * Aggregate Root Base Class
 * Base class for all aggregates in the system
 */
export abstract class AggregateRoot {
  /** Aggregate ID */
  public id: string;

  /** Aggregate version */
  public version: number = 0;

  /** Uncommitted events */
  private uncommittedEvents: DomainEvent[] = [];

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Get uncommitted events
   */
  public getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  /**
   * Mark events as committed
   */
  public markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  /**
   * Apply an event to the aggregate
   * @param event Event to apply
   */
  protected applyEvent(event: DomainEvent): void {
    this.applyChange(event);
    this.uncommittedEvents.push(event);
  }

  /**
   * Replay an event (from event store)
   * @param event Event to replay
   */
  public replayEvent(event: DomainEvent): void {
    this.applyChange(event);
    this.version = event.version;
  }

  /**
   * Apply changes based on event type
   * Subclasses must implement this
   * @param event Event to apply
   */
  protected abstract applyChange(event: DomainEvent): void;

  /**
   * Get aggregate state for snapshot
   */
  public abstract getState(): Record<string, unknown>;

  /**
   * Restore aggregate state from snapshot
   * @param state State to restore
   */
  public abstract restoreState(state: Record<string, unknown>): void;
}

/**
 * Event Publisher Interface
 */
export interface IEventPublisher {
  /**
   * Publish a single event
   * @param event Event to publish
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publish multiple events
   * @param events Events to publish
   */
  publishBatch(events: DomainEvent[]): Promise<void>;

  /**
   * Subscribe to published events
   * @param eventType Event type
   * @param handler Event handler
   */
  subscribe(eventType: string, handler: EventHandler): EventSubscription;
}

/**
 * Event Replay Configuration
 */
export interface EventReplayConfig {
  /** Aggregate ID to replay (optional, replays all if not specified) */
  aggregateId?: string;

  /** Aggregate type to replay (optional) */
  aggregateType?: string;

  /** Replay events from this timestamp */
  fromTimestamp?: Date;

  /** Replay events to this timestamp */
  toTimestamp?: Date;

  /** Replay only these event types */
  eventTypes?: string[];

  /** Batch size for reading events */
  batchSize?: number;

  /** Enable parallel processing */
  parallel?: boolean;
}

/**
 * Event Replay Result
 */
export interface EventReplayResult {
  /** Total events replayed */
  eventsReplayed: number;

  /** Events processed successfully */
  eventsSuccessful: number;

  /** Events that failed */
  eventsFailed: number;

  /** Duration in milliseconds */
  durationMs: number;

  /** Start timestamp */
  startTime: Date;

  /** End timestamp */
  endTime: Date;

  /** Errors encountered */
  errors: Array<{ eventId: string; error: string }>;
}

/**
 * Snapshot Strategy Interface
 */
export interface ISnapshotStrategy {
  /**
   * Determine if a snapshot should be taken
   * @param aggregateId Aggregate ID
   * @param version Current version
   */
  shouldTakeSnapshot(aggregateId: string, version: number): boolean;

  /**
   * Get snapshot frequency
   */
  getSnapshotFrequency(): number;
}

/**
 * Default Snapshot Strategy
 * Takes snapshot every N events
 */
export class DefaultSnapshotStrategy implements ISnapshotStrategy {
  constructor(private frequency: number = 100) {}

  shouldTakeSnapshot(aggregateId: string, version: number): boolean {
    return version > 0 && version % this.frequency === 0;
  }

  getSnapshotFrequency(): number {
    return this.frequency;
  }
}

/**
 * Event Statistics
 */
export interface EventStatistics {
  /** Total events in store */
  totalEvents: number;

  /** Events by aggregate type */
  eventsByAggregateType: Record<string, number>;

  /** Events by event type */
  eventsByEventType: Record<string, number>;

  /** Total snapshots */
  totalSnapshots: number;

  /** Average events per aggregate */
  avgEventsPerAggregate: number;

  /** Oldest event timestamp */
  oldestEvent?: Date;

  /** Newest event timestamp */
  newestEvent?: Date;
}

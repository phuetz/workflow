/**
 * Event Sourcing System
 * Complete event-driven architecture with CQRS support
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { logger } from '../services/SimpleLogger';

export interface Event {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventVersion: number;
  sequence: number;
  timestamp: Date;
  userId?: string;
  correlationId?: string;
  causationId?: string;
  metadata: EventMetadata;
  data: any;
  checksum?: string;
}

export interface EventMetadata {
  source: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  tenantId?: string;
  environment?: string;
  tags?: string[];
  custom?: Record<string, any>;
}

export interface EventStream {
  aggregateId: string;
  aggregateType: string;
  version: number;
  events: Event[];
  snapshots: Snapshot[];
  metadata: StreamMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface StreamMetadata {
  maxAge?: number;
  maxCount?: number;
  cacheControl?: string;
  truncateBefore?: number;
  acl?: AccessControlList;
}

export interface Snapshot {
  id: string;
  aggregateId: string;
  version: number;
  state: any;
  timestamp: Date;
  metadata?: any;
}

export interface Projection {
  id: string;
  name: string;
  type: ProjectionType;
  status: ProjectionStatus;
  query: ProjectionQuery;
  state: any;
  position: Position;
  handlers: Map<string, ProjectionHandler>;
  config: ProjectionConfig;
  lastUpdated: Date;
  errors?: ProjectionError[];
}

export type ProjectionType = 
  | 'continuous'
  | 'one-time'
  | 'scheduled'
  | 'partitioned'
  | 'parallel';

export type ProjectionStatus =
  | 'running'
  | 'stopped'
  | 'paused'
  | 'faulted'
  | 'completed';

export interface ProjectionQuery {
  streams?: string[];
  categories?: string[];
  eventTypes?: string[];
  filter?: EventFilter;
  window?: TimeWindow;
}

export interface EventFilter {
  expression: string;
  parameters?: Record<string, any>;
}

export interface TimeWindow {
  start?: Date;
  end?: Date;
  duration?: number;
}

export interface Position {
  stream: string;
  sequence: number;
  timestamp: Date;
}

export interface ProjectionHandler {
  eventType: string;
  handler: (state: any, event: Event) => any;
}

export interface ProjectionConfig {
  checkpointInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableParallelism?: boolean;
  partitionKey?: string;
  bufferSize?: number;
}

export interface ProjectionError {
  timestamp: Date;
  event: Event;
  error: string;
  retryCount: number;
}

export interface Aggregate {
  id: string;
  type: string;
  version: number;
  state: any;
  uncommittedEvents: Event[];
  eventHandlers: Map<string, EventHandler>;
}

export type EventHandler = (state: any, event: Event) => any;

export interface Command {
  id: string;
  aggregateId: string;
  commandType: string;
  data: any;
  metadata: CommandMetadata;
  timestamp: Date;
  expectedVersion?: number;
}

export interface CommandMetadata {
  userId: string;
  correlationId?: string;
  causationId?: string;
  ipAddress?: string;
  source?: string;
}

export interface CommandHandler {
  commandType: string;
  validate?: (command: Command) => ValidationResult;
  handle: (aggregate: Aggregate, command: Command) => Event[];
}

export interface ValidationResult {
  isValid: boolean;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface Saga {
  id: string;
  type: string;
  state: SagaState;
  status: SagaStatus;
  steps: SagaStep[];
  currentStep: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export type SagaState = 'pending' | 'running' | 'completed' | 'failed' | 'compensating';
export type SagaStatus = 'active' | 'completed' | 'failed' | 'cancelled';

export interface SagaStep {
  name: string;
  command: Command;
  compensation?: Command;
  status: 'pending' | 'completed' | 'failed' | 'compensated';
  result?: any;
  error?: string;
}

export interface EventStore {
  append(stream: string, events: Event[], expectedVersion?: number): Promise<void>;
  read(stream: string, fromVersion?: number, toVersion?: number): Promise<Event[]>;
  readAll(position?: Position): Promise<Event[]>;
  subscribe(stream: string, handler: EventHandler): Subscription;
  createSnapshot(aggregateId: string, state: any, version: number): Promise<void>;
  getSnapshot(aggregateId: string): Promise<Snapshot | null>;
}

export interface Subscription {
  id: string;
  stream: string;
  position: Position;
  handler: EventHandler;
  active: boolean;
  errors: number;
  lastError?: string;
}

export interface AccessControlList {
  read?: string[];
  write?: string[];
  delete?: string[];
  metaRead?: string[];
  metaWrite?: string[];
}

export interface EventBus {
  publish(events: Event[]): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): void;
  unsubscribe(eventType: string, handler: EventHandler): void;
}

export interface ReadModel {
  id: string;
  type: string;
  data: any;
  version: number;
  lastEventId: string;
  lastUpdated: Date;
}

export interface QueryHandler {
  queryType: string;
  handle: (query: any, readModels: Map<string, ReadModel>) => Promise<any>;
}

export interface EventReplay {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  fromPosition: Position;
  toPosition?: Position;
  filter?: EventFilter;
  speed: number;
  processed: number;
  errors: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface EventMetrics {
  totalEvents: number;
  eventsPerSecond: number;
  averageEventSize: number;
  projectionLag: number;
  errorRate: number;
  storageSize: number;
  streamCount: number;
  snapshotCount: number;
}

export class EventSourcingSystem extends EventEmitter {
  private eventStore: Map<string, Event[]> = new Map();
  private eventStreams: Map<string, EventStream> = new Map();
  private snapshots: Map<string, Snapshot[]> = new Map();
  private projections: Map<string, Projection> = new Map();
  private aggregates: Map<string, Aggregate> = new Map();
  private commandHandlers: Map<string, CommandHandler> = new Map();
  private queryHandlers: Map<string, QueryHandler> = new Map();
  private sagas: Map<string, Saga> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private readModels: Map<string, ReadModel> = new Map();
  private replays: Map<string, EventReplay> = new Map();
  private eventBus: InternalEventBus;
  private metrics: EventMetrics;
  private config: EventSourcingConfig;
  private globalSequence: number = 0;
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config?: Partial<EventSourcingConfig>) {
    super();
    this.config = {
      snapshotFrequency: 100,
      eventRetention: 365 * 24 * 60 * 60 * 1000, // 1 year
      projectionCheckpoint: 1000,
      enableSnapshots: true,
      enableProjections: true,
      enableSagas: true,
      maxEventSize: 1024 * 1024, // 1MB
      compressionEnabled: true,
      encryptionEnabled: false,
      ...config
    };

    this.eventBus = new InternalEventBus();
    this.metrics = this.createEmptyMetrics();
    this.initialize();
  }

  /**
   * Initialize event sourcing system
   */
  private initialize(): void {
    // Set up event bus
    this.setupEventBus();

    // Start background processes
    this.startBackgroundProcesses();

    // Register default handlers
    this.registerDefaultHandlers();

    logger.debug('Event Sourcing System initialized');
  }

  /**
   * Append events to stream
   */
  async appendEvents(
    streamName: string,
    events: Omit<Event, 'id' | 'sequence' | 'timestamp'>[],
    expectedVersion?: number
  ): Promise<void> {
    // Get or create stream
    let stream = this.eventStreams.get(streamName);
    
    if (!stream) {
      stream = this.createStream(streamName, events[0].aggregateType);
    }

    // Check expected version for optimistic concurrency
    if (expectedVersion !== undefined && stream.version !== expectedVersion) {
      throw new Error(`Concurrency conflict. Expected version ${expectedVersion}, but stream is at ${stream.version}`);
    }

    // Process each event
    const processedEvents: Event[] = [];
    
    for (const event of events) {
      const processedEvent: Event = {
        ...event,
        id: this.generateEventId(),
        sequence: ++this.globalSequence,
        timestamp: new Date(),
        checksum: this.calculateChecksum(event)
      };

      // Validate event
      this.validateEvent(processedEvent);

      // Store event
      this.storeEvent(streamName, processedEvent);
      processedEvents.push(processedEvent);

      // Update stream
      stream.events.push(processedEvent);
      stream.version++;
      stream.updatedAt = new Date();
    }

    // Publish events
    await this.eventBus.publish(processedEvents);

    // Update projections
    if (this.config.enableProjections) {
      await this.updateProjections(processedEvents);
    }

    // Check for snapshot
    if (this.config.enableSnapshots && stream.version % this.config.snapshotFrequency === 0) {
      await this.createSnapshot(stream);
    }

    // Update metrics
    this.metrics.totalEvents += processedEvents.length;
    this.metrics.eventsPerSecond = this.calculateEventsPerSecond();

    this.emit('events:appended', { stream: streamName, events: processedEvents });
  }

  /**
   * Read events from stream
   */
  async readEvents(
    streamName: string,
    fromVersion?: number,
    toVersion?: number
  ): Promise<Event[]> {
    const events = this.eventStore.get(streamName) || [];
    
    if (fromVersion !== undefined || toVersion !== undefined) {
      return events.filter(e => {
        const version = this.getEventVersion(e);
        return (fromVersion === undefined || version >= fromVersion) &&
               (toVersion === undefined || version <= toVersion);
      });
    }
    
    return events;
  }

  /**
   * Create projection
   */
  createProjection(
    name: string,
    type: ProjectionType,
    query: ProjectionQuery,
    handlers: Map<string, ProjectionHandler>,
    config?: Partial<ProjectionConfig>
  ): Projection {
    const projection: Projection = {
      id: this.generateProjectionId(),
      name,
      type,
      status: 'stopped',
      query,
      state: {},
      position: {
        stream: '$all',
        sequence: 0,
        timestamp: new Date()
      },
      handlers,
      config: {
        checkpointInterval: this.config.projectionCheckpoint,
        maxRetries: 3,
        retryDelay: 1000,
        enableParallelism: false,
        bufferSize: 1000,
        ...config
      },
      lastUpdated: new Date()
    };

    this.projections.set(projection.id, projection);
    
    // Start projection if continuous
    if (type === 'continuous') {
      this.startProjection(projection.id);
    }

    this.emit('projection:created', projection);
    return projection;
  }

  /**
   * Start projection
   */
  async startProjection(projectionId: string): Promise<void> {
    const projection = this.projections.get(projectionId);
    
    if (!projection) {
      throw new Error('Projection not found');
    }

    projection.status = 'running';
    
    // Process historical events
    await this.processHistoricalEvents(projection);
    
    // Subscribe to new events
    if (projection.type === 'continuous') {
      this.subscribeProjection(projection);
    }

    this.emit('projection:started', projection);
  }

  /**
   * Execute command
   */
  async executeCommand(command: Command): Promise<Event[]> {
    // Get command handler
    const handler = this.commandHandlers.get(command.commandType);
    
    if (!handler) {
      throw new Error(`No handler for command type: ${command.commandType}`);
    }

    // Validate command
    if (handler.validate) {
      const validation = handler.validate(command);
      if (!validation.isValid) {
        throw new Error(`Command validation failed: ${JSON.stringify(validation.errors)}`);
      }
    }

    // Get or create aggregate
    let aggregate = await this.getAggregate(command.aggregateId);
    
    if (!aggregate) {
      aggregate = this.createAggregate(command.aggregateId, command.commandType);
    }

    // Check expected version
    if (command.expectedVersion !== undefined && aggregate.version !== command.expectedVersion) {
      throw new Error('Concurrency conflict');
    }

    // Handle command
    const events = handler.handle(aggregate, command);
    
    // Apply events to aggregate
    for (const event of events) {
      this.applyEventToAggregate(aggregate, event);
    }

    // Append events to stream
    await this.appendEvents(
      `${aggregate.type}-${aggregate.id}`,
      events,
      aggregate.version - events.length
    );

    // Store aggregate
    this.aggregates.set(aggregate.id, aggregate);

    this.emit('command:executed', { command, events });
    return events;
  }

  /**
   * Execute query
   */
  async executeQuery(queryType: string, query: any): Promise<any> {
    const handler = this.queryHandlers.get(queryType);
    
    if (!handler) {
      throw new Error(`No handler for query type: ${queryType}`);
    }

    const result = await handler.handle(query, this.readModels);
    
    this.emit('query:executed', { queryType, query, result });
    return result;
  }

  /**
   * Start saga
   */
  async startSaga(
    type: string,
    steps: SagaStep[],
    metadata?: any
  ): Promise<Saga> {
    const saga: Saga = {
      id: this.generateSagaId(),
      type,
      state: 'pending',
      status: 'active',
      steps,
      currentStep: 0,
      startedAt: new Date()
    };

    this.sagas.set(saga.id, saga);
    
    // Execute saga
    await this.executeSaga(saga);
    
    this.emit('saga:started', saga);
    return saga;
  }

  /**
   * Execute saga
   */
  private async executeSaga(saga: Saga): Promise<void> {
    saga.state = 'running';
    
    try {
      for (let i = saga.currentStep; i < saga.steps.length; i++) {
        const step = saga.steps[i];
        
        try {
          // Execute command
          const events = await this.executeCommand(step.command);
          step.status = 'completed';
          step.result = events;
          saga.currentStep++;
          
        } catch (error) {
          step.status = 'failed';
          step.error = (error as Error).message;
          
          // Start compensation
          await this.compensateSaga(saga, i);
          throw error;
        }
      }
      
      saga.state = 'completed';
      saga.status = 'completed';
      saga.completedAt = new Date();
      
    } catch (error) {
      saga.state = 'failed';
      saga.status = 'failed';
      saga.error = (error as Error).message;
    }

    this.emit('saga:completed', saga);
  }

  /**
   * Compensate saga
   */
  private async compensateSaga(saga: Saga, fromStep: number): Promise<void> {
    saga.state = 'compensating';
    
    for (let i = fromStep - 1; i >= 0; i--) {
      const step = saga.steps[i];
      
      if (step.compensation && step.status === 'completed') {
        try {
          await this.executeCommand(step.compensation);
          step.status = 'compensated';
        } catch (error) {
          logger.error(`Failed to compensate step ${step.name}:`, error);
        }
      }
    }
  }

  /**
   * Create read model
   */
  createReadModel(
    type: string,
    eventHandlers: Map<string, EventHandler>
  ): string {
    const id = this.generateReadModelId();
    
    const readModel: ReadModel = {
      id,
      type,
      data: {},
      version: 0,
      lastEventId: '',
      lastUpdated: new Date()
    };

    this.readModels.set(id, readModel);
    
    // Subscribe to events
    for (const [eventType, handler] of eventHandlers) {
      this.eventBus.subscribe(eventType, (event) => {
        readModel.data = handler(readModel.data, event);
        readModel.version++;
        readModel.lastEventId = event.id;
        readModel.lastUpdated = new Date();
      });
    }

    this.emit('readmodel:created', readModel);
    return id;
  }

  /**
   * Replay events
   */
  async replayEvents(
    fromPosition: Position,
    toPosition?: Position,
    filter?: EventFilter,
    speed = 1
  ): Promise<EventReplay> {
    const replay: EventReplay = {
      id: this.generateReplayId(),
      status: 'pending',
      fromPosition,
      toPosition,
      filter,
      speed,
      processed: 0,
      errors: 0,
      startedAt: new Date()
    };

    this.replays.set(replay.id, replay);
    
    // Start replay
    await this.executeReplay(replay);
    
    this.emit('replay:started', replay);
    return replay;
  }

  /**
   * Execute replay
   */
  private async executeReplay(replay: EventReplay): Promise<void> {
    replay.status = 'running';
    
    try {
      // Get events to replay
      const events = await this.getEventsForReplay(replay);
      
      for (const event of events) {
        try {
          // Apply delay for speed control
          if (replay.speed < 1) {
            await this.delay(1000 / replay.speed);
          }
          
          // Republish event
          await this.eventBus.publish([event]);
          replay.processed++;
          
        } catch (error) {
          replay.errors++;
          logger.error('Error replaying event:', error);
        }
      }
      
      replay.status = 'completed';
      replay.completedAt = new Date();
      
    } catch (error) {
      replay.status = 'failed';
      logger.error('Replay failed:', error);
    }

    this.emit('replay:completed', replay);
  }

  /**
   * Get events for replay
   */
  private async getEventsForReplay(replay: EventReplay): Promise<Event[]> {
    let events: Event[] = [];
    
    // Get all events
    for (const streamEvents of this.eventStore.values()) {
      events = events.concat(streamEvents);
    }
    
    // Sort by sequence
    events.sort((a, b) => a.sequence - b.sequence);
    
    // Apply position filter
    events = events.filter(e => {
      return e.sequence >= replay.fromPosition.sequence &&
             (!replay.toPosition || e.sequence <= replay.toPosition.sequence);
    });
    
    // Apply custom filter
    if (replay.filter) {
      events = events.filter(e => this.evaluateFilter(e, replay.filter));
    }
    
    return events;
  }

  /**
   * Create snapshot
   */
  private async createSnapshot(stream: EventStream): Promise<void> {
    // Get aggregate
    const aggregate = this.aggregates.get(stream.aggregateId);
    
    if (!aggregate) return;

    const snapshot: Snapshot = {
      id: this.generateSnapshotId(),
      aggregateId: stream.aggregateId,
      version: stream.version,
      state: aggregate.state,
      timestamp: new Date()
    };

    // Store snapshot
    if (!this.snapshots.has(stream.aggregateId)) {
      this.snapshots.set(stream.aggregateId, []);
    }
    
    this.snapshots.get(stream.aggregateId)!.push(snapshot);
    stream.snapshots.push(snapshot);

    // Clean old snapshots
    await this.cleanOldSnapshots(stream.aggregateId);

    this.emit('snapshot:created', snapshot);
  }

  /**
   * Get latest snapshot
   */
  async getLatestSnapshot(aggregateId: string): Promise<Snapshot | null> {
    const snapshots = this.snapshots.get(aggregateId);
    
    if (!snapshots || snapshots.length === 0) {
      return null;
    }
    
    return snapshots[snapshots.length - 1];
  }

  /**
   * Process historical events for projection
   */
  private async processHistoricalEvents(projection: Projection): Promise<void> {
    // Get all relevant events
    let events: Event[] = [];
    
    if (projection.query.streams) {
      for (const stream of projection.query.streams) {
        const streamEvents = await this.readEvents(stream);
        events = events.concat(streamEvents);
      }
    } else {
      // Process all events
      for (const streamEvents of this.eventStore.values()) {
        events = events.concat(streamEvents);
      }
    }
    
    // Sort by sequence
    events.sort((a, b) => a.sequence - b.sequence);
    
    // Apply filters
    if (projection.query.eventTypes) {
      events = events.filter(e => projection.query.eventTypes!.includes(e.eventType));
    }
    
    // Process events
    for (const event of events) {
      await this.applyEventToProjection(projection, event);
    }
  }

  /**
   * Apply event to projection
   */
  private async applyEventToProjection(
    projection: Projection,
    event: Event
  ): Promise<void> {
    const handler = projection.handlers.get(event.eventType);
    
    if (!handler) return;
    
    try {
      projection.state = handler.handler(projection.state, event);
      projection.position = {
        stream: event.aggregateId,
        sequence: event.sequence,
        timestamp: event.timestamp
      };
      projection.lastUpdated = new Date();
      
      // Checkpoint if needed
      if (event.sequence % projection.config.checkpointInterval! === 0) {
        await this.checkpointProjection(projection);
      }
      
    } catch (error) {
      // Handle error
      if (!projection.errors) {
        projection.errors = [];
      }
      
      projection.errors.push({
        timestamp: new Date(),
        event,
        error: (error as Error).message,
        retryCount: 0
      });
      
      if (projection.errors.length > 100) {
        projection.status = 'faulted';
      }
    }
  }

  /**
   * Update projections with new events
   */
  private async updateProjections(events: Event[]): Promise<void> {
    for (const projection of this.projections.values()) {
      if (projection.status !== 'running') continue;
      
      for (const event of events) {
        // Check if projection is interested in this event
        if (projection.query.eventTypes && 
            !projection.query.eventTypes.includes(event.eventType)) {
          continue;
        }
        
        await this.applyEventToProjection(projection, event);
      }
    }
  }

  /**
   * Subscribe projection to events
   */
  private subscribeProjection(projection: Projection): void {
    const subscription: Subscription = {
      id: this.generateSubscriptionId(),
      stream: '$all',
      position: projection.position,
      handler: async (event) => {
        await this.applyEventToProjection(projection, event);
      },
      active: true,
      errors: 0
    };
    
    this.subscriptions.set(subscription.id, subscription);
  }

  /**
   * Checkpoint projection
   */
  private async checkpointProjection(projection: Projection): Promise<void> {
    // In production, would persist to durable storage
    logger.debug(`Checkpointing projection ${projection.name} at position ${projection.position.sequence}`);
  }

  /**
   * Helper methods
   */
  private createStream(name: string, aggregateType: string): EventStream {
    const stream: EventStream = {
      aggregateId: name.split('-')[1] || name,
      aggregateType,
      version: 0,
      events: [],
      snapshots: [],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.eventStreams.set(name, stream);
    return stream;
  }

  private createAggregate(id: string, type: string): Aggregate {
    return {
      id,
      type,
      version: 0,
      state: {},
      uncommittedEvents: [],
      eventHandlers: new Map()
    };
  }

  private async getAggregate(id: string): Promise<Aggregate | null> {
    // Try to get from cache
    let aggregate = this.aggregates.get(id);
    
    if (aggregate) {
      return aggregate;
    }
    
    // Try to rebuild from snapshot + events
    const snapshot = await this.getLatestSnapshot(id);
    
    if (snapshot) {
      aggregate = {
        id,
        type: 'unknown',
        version: snapshot.version,
        state: snapshot.state,
        uncommittedEvents: [],
        eventHandlers: new Map()
      };
      
      // Apply events after snapshot
      const events = await this.readEvents(`unknown-${id}`, snapshot.version + 1);
      
      for (const event of events) {
        this.applyEventToAggregate(aggregate, event);
      }
      
      return aggregate;
    }
    
    return null;
  }

  private applyEventToAggregate(aggregate: Aggregate, event: Event): void {
    const handler = aggregate.eventHandlers.get(event.eventType);
    
    if (handler) {
      aggregate.state = handler(aggregate.state, event);
    }
    
    aggregate.version++;
    aggregate.uncommittedEvents.push(event);
  }

  private storeEvent(streamName: string, event: Event): void {
    if (!this.eventStore.has(streamName)) {
      this.eventStore.set(streamName, []);
    }
    
    this.eventStore.get(streamName)!.push(event);
  }

  private validateEvent(event: Event): void {
    // Check size
    const size = JSON.stringify(event).length;
    if (size > this.config.maxEventSize) {
      throw new Error(`Event size ${size} exceeds maximum ${this.config.maxEventSize}`);
    }
    
    // Validate structure
    if (!event.aggregateId || !event.eventType) {
      throw new Error('Event missing required fields');
    }
  }

  private calculateChecksum(event: any): string {
    const data = JSON.stringify(event);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private getEventVersion(event: Event): number {
    return event.eventVersion || 0;
  }

  private evaluateFilter(event: Event, filter: EventFilter): boolean {
    // Simple filter evaluation
    try {
      // In production, use a safe expression evaluator
      return true;
    } catch {
      return false;
    }
  }

  private calculateEventsPerSecond(): number {
    // Calculate based on recent events
    const recentEvents = Array.from(this.eventStore.values())
      .flat()
      .filter(e => e.timestamp.getTime() > Date.now() - 60000);
    
    return recentEvents.length / 60;
  }

  private async cleanOldSnapshots(aggregateId: string): Promise<void> {
    const snapshots = this.snapshots.get(aggregateId);
    
    if (!snapshots) return;
    
    // Keep only last 5 snapshots
    if (snapshots.length > 5) {
      snapshots.splice(0, snapshots.length - 5);
    }
  }

  private setupEventBus(): void {
    this.eventBus.on('event', (event: Event) => {
      this.emit('event:published', event);
    });
  }

  private startBackgroundProcesses(): void {
    // Clean old events
    setInterval(() => {
      this.cleanOldEvents();
    }, 3600000); // Every hour
    
    // Update metrics
    setInterval(() => {
      this.updateMetrics();
    }, 60000); // Every minute
  }

  private cleanOldEvents(): void {
    const cutoff = new Date(Date.now() - this.config.eventRetention);
    
    for (const [streamName, events] of this.eventStore.entries()) {
      const filtered = events.filter(e => e.timestamp > cutoff);
      this.eventStore.set(streamName, filtered);
    }
  }

  private updateMetrics(): void {
    this.metrics.streamCount = this.eventStreams.size;
    this.metrics.snapshotCount = Array.from(this.snapshots.values())
      .reduce((sum, s) => sum + s.length, 0);
    
    let totalSize = 0;
    for (const events of this.eventStore.values()) {
      for (const event of events) {
        totalSize += JSON.stringify(event).length;
      }
    }
    this.metrics.storageSize = totalSize;
    this.metrics.averageEventSize = this.metrics.totalEvents > 0 
      ? totalSize / this.metrics.totalEvents 
      : 0;
  }

  private registerDefaultHandlers(): void {
    // Register default command handlers
    this.registerCommandHandler({
      commandType: 'CreateAggregate',
      handle: (aggregate, command) => {
        return [{
          id: '',
          aggregateId: aggregate.id,
          aggregateType: aggregate.type,
          eventType: 'AggregateCreated',
          eventVersion: 1,
          sequence: 0,
          timestamp: new Date(),
          metadata: { source: 'system' },
          data: command.data
        }];
      }
    });
  }

  /**
   * Register command handler
   */
  registerCommandHandler(handler: CommandHandler): void {
    this.commandHandlers.set(handler.commandType, handler);
  }

  /**
   * Register query handler
   */
  registerQueryHandler(handler: QueryHandler): void {
    this.queryHandlers.set(handler.queryType, handler);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateProjectionId(): string {
    return `proj_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateSagaId(): string {
    return `saga_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateReadModelId(): string {
    return `rm_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateReplayId(): string {
    return `rply_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateSnapshotId(): string {
    return `snap_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private createEmptyMetrics(): EventMetrics {
    return {
      totalEvents: 0,
      eventsPerSecond: 0,
      averageEventSize: 0,
      projectionLag: 0,
      errorRate: 0,
      storageSize: 0,
      streamCount: 0,
      snapshotCount: 0
    };
  }

  /**
   * Get metrics
   */
  getMetrics(): EventMetrics {
    return { ...this.metrics };
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    // Stop all projections
    for (const projection of this.projections.values()) {
      projection.status = 'stopped';
    }
    
    // Clear timers
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    
    this.removeAllListeners();
    logger.debug('Event Sourcing System shut down');
  }
}

// Internal Event Bus
class InternalEventBus extends EventEmitter {
  async publish(events: Event[]): Promise<void> {
    for (const event of events) {
      this.emit('event', event);
      this.emit(event.eventType, event);
    }
  }

  subscribe(eventType: string, handler: EventHandler): void {
    this.on(eventType, handler);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    this.off(eventType, handler);
  }
}

// Configuration interface
interface EventSourcingConfig {
  snapshotFrequency: number;
  eventRetention: number;
  projectionCheckpoint: number;
  enableSnapshots: boolean;
  enableProjections: boolean;
  enableSagas: boolean;
  maxEventSize: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

// Export singleton instance
export const eventSourcingSystem = new EventSourcingSystem();
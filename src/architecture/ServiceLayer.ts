import { logger } from '../services/SimpleLogger';
// ARCHITECTURE FIX: Proper service layer abstraction to replace tight coupling
// This addresses the service coupling issues identified in the analysis

// ARCHITECTURE FIX: Repository pattern for data access
export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
  findByCondition(condition: Partial<T>): Promise<T[]>;
}

// ARCHITECTURE FIX: Unit of Work pattern for transaction management
export interface UnitOfWork {
  registerNew<T>(entity: T): void;
  registerDirty<T>(entity: T): void;
  registerDeleted<T>(entity: T): void;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

// ARCHITECTURE FIX: Service interface for dependency inversion
export interface StorageService {
  store(key: string, data: unknown): Promise<void>;
  retrieve(key: string): Promise<unknown>;
  remove(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
}

// ARCHITECTURE FIX: Authentication service abstraction
export interface AuthenticationService {
  authenticate(credentials: unknown): Promise<AuthResult>;
  authorize(token: string, requiredPermissions: string[]): Promise<boolean>;
  refreshToken(refreshToken: string): Promise<AuthResult>;
  revokeToken(token: string): Promise<void>;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: unknown;
  permissions?: string[];
  expiresAt?: Date;
}

// ARCHITECTURE FIX: Event system for loose coupling
export interface DomainEvent {
  eventId: string;
  eventType: string;
  occurredAt: Date;
  aggregateId: string;
  payload: unknown;
}

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void;
  unsubscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void;
}

// ARCHITECTURE FIX: Concrete implementations with proper error handling
export class LocalStorageService implements StorageService {
  private prefix: string;

  constructor(prefix: string = 'workflow_') {
    this.prefix = prefix;
  }

  async store(key: string, data: unknown): Promise<void> {
    try {
      const serialized = JSON.stringify({
        data,
        timestamp: Date.now(),
        version: 1
      });

      localStorage.setItem(`${this.prefix}${key}`, serialized);
    } catch (error) {
      if (error instanceof DOMException && error.code === 22) {
        // Quota exceeded
        await this.cleanup();
        throw new Error('Storage quota exceeded. Some data has been cleaned up.');
      }
      throw new Error(`Failed to store data: ${(error as Error).message}`);
    }
  }

  async retrieve(key: string): Promise<unknown> {
    try {
      const item = localStorage.getItem(`${this.prefix}${key}`);
      if (!item) return null;

      const parsed = JSON.parse(item);

      // ARCHITECTURE FIX: Data migration handling
      if (parsed.version !== 1) {
        logger.warn(`Data version mismatch for key ${key}`);
        return this.migrateData(parsed);
      }

      return parsed.data;
    } catch (error) {
      logger.error(`Failed to retrieve data for key ${key}:`, error);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(`${this.prefix}${key}`);
  }

  async exists(key: string): Promise<boolean> {
    return localStorage.getItem(`${this.prefix}${key}`) !== null;
  }

  async list(prefix?: string): Promise<string[]> {
    const keys: string[] = [];
    const searchPrefix = `${this.prefix}${prefix || ''}`;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(searchPrefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }

    return keys;
  }

  private async cleanup(): Promise<void> {
    // ARCHITECTURE FIX: Intelligent cleanup strategy
    const keys = await this.list();
    const items = await Promise.all(
      keys.map(async key => ({
        key,
        data: await this.retrieve(key),
        timestamp: JSON.parse(localStorage.getItem(`${this.prefix}${key}`) || '{}').timestamp || 0
      }))
    );

    // Remove oldest 25% of items
    items.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = items.slice(0, Math.ceil(items.length * 0.25));

    for (const item of toRemove) {
      await this.remove(item.key);
    }
  }

  private migrateData(data: { data?: unknown }): unknown {
    // ARCHITECTURE FIX: Forward-compatible data migration
    logger.info('Migrating data to current version...');
    return data.data || data;
  }
}

// ARCHITECTURE FIX: In-memory event bus for loose coupling
export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, Array<(event: DomainEvent) => Promise<void>>>();
  private eventHistory: DomainEvent[] = [];
  private maxHistorySize = 1000;

  async publish(event: DomainEvent): Promise<void> {
    // Store event in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Get handlers for this event type
    const eventHandlers = this.handlers.get(event.eventType) || [];

    // Execute all handlers concurrently
    const promises = eventHandlers.map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        logger.error(`Event handler error for ${event.eventType}:`, error);
        // ARCHITECTURE FIX: Don't let one handler failure break others
      }
    });

    await Promise.allSettled(promises);
  }

  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  unsubscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // ARCHITECTURE FIX: Event replay for debugging and recovery
  getEventHistory(eventType?: string): DomainEvent[] {
    if (eventType) {
      return this.eventHistory.filter(e => e.eventType === eventType);
    }
    return [...this.eventHistory];
  }
}

// ARCHITECTURE FIX: Service locator pattern for dependency management
export class ServiceContainer {
  private services = new Map<string, unknown>();
  private factories = new Map<string, () => unknown>();

  register<T>(key: string, instance: T): void {
    this.services.set(key, instance);
  }

  registerFactory<T>(key: string, factory: () => T): void {
    this.factories.set(key, factory);
  }

  get<T>(key: string): T {
    // First check if instance exists
    if (this.services.has(key)) {
      return this.services.get(key) as T;
    }

    // Then check if factory exists
    if (this.factories.has(key)) {
      const factory = this.factories.get(key)!;
      const instance = factory();
      this.services.set(key, instance); // Cache the instance
      return instance as T;
    }

    throw new Error(`Service not found: ${key}`);
  }

  has(key: string): boolean {
    return this.services.has(key) || this.factories.has(key);
  }

  remove(key: string): void {
    this.services.delete(key);
    this.factories.delete(key);
  }
}

// ARCHITECTURE FIX: Global service container instance
export const serviceContainer = new ServiceContainer();

// ARCHITECTURE FIX: Bootstrap services with proper abstractions
export function bootstrapServices(): void {
  // Register storage service
  serviceContainer.registerFactory('storageService', () => new LocalStorageService());

  // Register event bus
  serviceContainer.registerFactory('eventBus', () => new InMemoryEventBus());

  // ARCHITECTURE FIX: Event-driven workflow events
  const eventBus = serviceContainer.get<EventBus>('eventBus');

  // Subscribe to workflow events for logging
  eventBus.subscribe('workflow.execution.started', async (event) => {
    logger.info('Workflow execution started:', event.payload);
  });

  eventBus.subscribe('workflow.execution.completed', async (event) => {
    logger.info('Workflow execution completed:', event.payload);
  });

  eventBus.subscribe('workflow.execution.failed', async (event) => {
    logger.error('Workflow execution failed:', event.payload);
  });
}

// ARCHITECTURE FIX: Domain event creators
export function createWorkflowEvent(
  eventType: string,
  workflowId: string,
  payload: unknown
): DomainEvent {
  return {
    eventId: `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    eventType,
    occurredAt: new Date(),
    aggregateId: workflowId,
    payload
  };
}

// ARCHITECTURE FIX: Service facades for common operations
export class WorkflowService {
  private storageService: StorageService;
  private eventBus: EventBus;

  constructor() {
    this.storageService = serviceContainer.get<StorageService>('storageService');
    this.eventBus = serviceContainer.get<EventBus>('eventBus');
  }

  async saveWorkflow(workflowId: string, workflow: unknown): Promise<void> {
    await this.storageService.store(`workflow_${workflowId}`, workflow);

    await this.eventBus.publish(createWorkflowEvent(
      'workflow.saved',
      workflowId,
      { workflowId, timestamp: new Date().toISOString() }
    ));
  }

  async loadWorkflow(workflowId: string): Promise<unknown> {
    const workflow = await this.storageService.retrieve(`workflow_${workflowId}`);

    if (workflow) {
      await this.eventBus.publish(createWorkflowEvent(
        'workflow.loaded',
        workflowId,
        { workflowId, timestamp: new Date().toISOString() }
      ));
    }

    return workflow;
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.storageService.remove(`workflow_${workflowId}`);

    await this.eventBus.publish(createWorkflowEvent(
      'workflow.deleted',
      workflowId,
      { workflowId, timestamp: new Date().toISOString() }
    ));
  }
}

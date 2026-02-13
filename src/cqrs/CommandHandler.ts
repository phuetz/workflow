/**
 * Command Handler
 * Handles commands and generates domain events
 */

import {
  Command,
  CommandResult,
  ValidationResult,
  ICommandHandler,
  ICommandBus,
  CreateWorkflowCommand,
  UpdateWorkflowCommand,
  AddNodeCommand,
  UpdateNodeCommand,
  DeleteNodeCommand,
  ExecuteWorkflowCommand,
  IdempotencyRecord,
} from './types/cqrs';
import { DomainEvent } from '../eventsourcing/types/eventsourcing';
import { eventStore } from '../eventsourcing/EventStore';
import { eventPublisher } from '../eventsourcing/EventPublisher';

/**
 * Base Command Handler
 */
export abstract class BaseCommandHandler<T extends Command = Command>
  implements ICommandHandler<T>
{
  abstract handle(command: T): Promise<CommandResult>;
  abstract validate(command: T): Promise<ValidationResult>;
  abstract canHandle(commandType: string): boolean;

  /**
   * Validate required fields
   */
  protected validateRequired(
    data: Record<string, unknown>,
    fields: string[]
  ): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    for (const field of fields) {
      if (!data[field]) {
        errors.push({ field, message: `${field} is required` });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create domain event
   */
  protected createEvent(
    aggregateId: string,
    aggregateType: string,
    eventType: string,
    data: Record<string, unknown>,
    command: T
  ): DomainEvent {
    return {
      id: `event_${Date.now()}_${Math.random()}`,
      aggregateId,
      aggregateType,
      eventType,
      version: 1,
      data,
      metadata: {
        ...command.metadata,
        commandId: command.id,
        commandType: command.type,
      },
      timestamp: new Date(),
      correlationId: command.correlationId,
      userId: command.userId,
    };
  }
}

/**
 * Create Workflow Command Handler
 */
export class CreateWorkflowCommandHandler extends BaseCommandHandler<CreateWorkflowCommand> {
  async handle(command: CreateWorkflowCommand): Promise<CommandResult> {
    const validation = await this.validate(command);
    if (!validation.valid) {
      return {
        success: false,
        events: [],
        error: validation.errors.map((e) => e.message).join(', '),
      };
    }

    const workflowId = `wf_${Date.now()}_${Math.random()}`;

    // Create event
    const event = this.createEvent(
      workflowId,
      'workflow',
      'WorkflowCreated',
      {
        name: command.data.name,
        description: command.data.description,
        tags: command.data.tags || [],
        settings: command.data.settings || {},
        createdAt: new Date(),
      },
      command
    );

    // Store event
    await eventStore.append(workflowId, 'workflow', [event]);

    // Publish event
    await eventPublisher.publish(event);

    return {
      success: true,
      events: [event],
      aggregateId: workflowId,
    };
  }

  async validate(command: CreateWorkflowCommand): Promise<ValidationResult> {
    return this.validateRequired(command.data, ['name']);
  }

  canHandle(commandType: string): boolean {
    return commandType === 'CreateWorkflow';
  }
}

/**
 * Update Workflow Command Handler
 */
export class UpdateWorkflowCommandHandler extends BaseCommandHandler<UpdateWorkflowCommand> {
  async handle(command: UpdateWorkflowCommand): Promise<CommandResult> {
    const validation = await this.validate(command);
    if (!validation.valid) {
      return {
        success: false,
        events: [],
        error: validation.errors.map((e) => e.message).join(', '),
      };
    }

    const { workflowId, ...updates } = command.data;

    // Create event
    const event = this.createEvent(
      workflowId,
      'workflow',
      'WorkflowUpdated',
      {
        updates,
        updatedAt: new Date(),
      },
      command
    );

    // Get current version
    const currentVersion = await eventStore.getVersion(workflowId, 'workflow');

    // Store event with optimistic locking
    await eventStore.append(workflowId, 'workflow', [event], currentVersion);

    // Publish event
    await eventPublisher.publish(event);

    return {
      success: true,
      events: [event],
      aggregateId: workflowId,
    };
  }

  async validate(command: UpdateWorkflowCommand): Promise<ValidationResult> {
    return this.validateRequired(command.data, ['workflowId']);
  }

  canHandle(commandType: string): boolean {
    return commandType === 'UpdateWorkflow';
  }
}

/**
 * Add Node Command Handler
 */
export class AddNodeCommandHandler extends BaseCommandHandler<AddNodeCommand> {
  async handle(command: AddNodeCommand): Promise<CommandResult> {
    const validation = await this.validate(command);
    if (!validation.valid) {
      return {
        success: false,
        events: [],
        error: validation.errors.map((e) => e.message).join(', '),
      };
    }

    const { workflowId, nodeType, position, config } = command.data;
    const nodeId = `node_${Date.now()}_${Math.random()}`;

    // Create event
    const event = this.createEvent(
      workflowId,
      'workflow',
      'NodeAdded',
      {
        nodeId,
        nodeType,
        position,
        config: config || {},
        addedAt: new Date(),
      },
      command
    );

    // Get current version
    const currentVersion = await eventStore.getVersion(workflowId, 'workflow');

    // Store event
    await eventStore.append(workflowId, 'workflow', [event], currentVersion);

    // Publish event
    await eventPublisher.publish(event);

    return {
      success: true,
      events: [event],
      aggregateId: workflowId,
      metadata: { nodeId },
    };
  }

  async validate(command: AddNodeCommand): Promise<ValidationResult> {
    return this.validateRequired(command.data, [
      'workflowId',
      'nodeType',
      'position',
    ]);
  }

  canHandle(commandType: string): boolean {
    return commandType === 'AddNode';
  }
}

/**
 * Execute Workflow Command Handler
 */
export class ExecuteWorkflowCommandHandler extends BaseCommandHandler<ExecuteWorkflowCommand> {
  async handle(command: ExecuteWorkflowCommand): Promise<CommandResult> {
    const validation = await this.validate(command);
    if (!validation.valid) {
      return {
        success: false,
        events: [],
        error: validation.errors.map((e) => e.message).join(', '),
      };
    }

    const { workflowId, input, environment } = command.data;
    const executionId = `exec_${Date.now()}_${Math.random()}`;

    // Create event
    const event = this.createEvent(
      executionId,
      'execution',
      'ExecutionStarted',
      {
        workflowId,
        input: input || {},
        environment: environment || 'production',
        startedAt: new Date(),
        status: 'running',
      },
      command
    );

    // Store event
    await eventStore.append(executionId, 'execution', [event]);

    // Publish event
    await eventPublisher.publish(event);

    return {
      success: true,
      events: [event],
      aggregateId: executionId,
      metadata: { workflowId },
    };
  }

  async validate(command: ExecuteWorkflowCommand): Promise<ValidationResult> {
    return this.validateRequired(command.data, ['workflowId']);
  }

  canHandle(commandType: string): boolean {
    return commandType === 'ExecuteWorkflow';
  }
}

/**
 * Command Bus Implementation
 */
export class CommandBus implements ICommandBus {
  private handlers: Map<string, ICommandHandler> = new Map();
  private idempotencyCache: Map<string, IdempotencyRecord> = new Map();
  private idempotencyTTL = 3600000; // 1 hour

  /**
   * Dispatch a command
   */
  async dispatch<T extends Command>(command: T): Promise<CommandResult> {
    // Check idempotency
    const cached = this.checkIdempotency(command.id);
    if (cached) {
      return cached.result;
    }

    // Find handler
    const handler = this.handlers.get(command.type);
    if (!handler) {
      return {
        success: false,
        events: [],
        error: `No handler registered for command type: ${command.type}`,
      };
    }

    // Execute handler
    const result = await handler.handle(command);

    // Cache result for idempotency
    this.cacheResult(command, result);

    return result;
  }

  /**
   * Register a command handler
   */
  registerHandler<T extends Command>(
    commandType: string,
    handler: ICommandHandler<T>
  ): void {
    this.handlers.set(commandType, handler);
  }

  /**
   * Check idempotency cache
   */
  private checkIdempotency(commandId: string): IdempotencyRecord | null {
    const cached = this.idempotencyCache.get(commandId);
    if (!cached) {
      return null;
    }

    // Check expiration
    if (cached.expiresAt < new Date()) {
      this.idempotencyCache.delete(commandId);
      return null;
    }

    return cached;
  }

  /**
   * Cache command result
   */
  private cacheResult(command: Command, result: CommandResult): void {
    const expiresAt = new Date(Date.now() + this.idempotencyTTL);

    this.idempotencyCache.set(command.id, {
      commandId: command.id,
      commandType: command.type,
      result,
      timestamp: new Date(),
      expiresAt,
    });

    // Cleanup expired entries
    this.cleanupExpiredEntries();
  }

  /**
   * Cleanup expired idempotency entries
   */
  private cleanupExpiredEntries(): void {
    const now = new Date();
    for (const [key, record] of this.idempotencyCache.entries()) {
      if (record.expiresAt < now) {
        this.idempotencyCache.delete(key);
      }
    }
  }

  /**
   * Get registered handlers
   */
  getHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }
}

/**
 * Global command bus instance
 */
export const commandBus = new CommandBus();

// Register default handlers
commandBus.registerHandler('CreateWorkflow', new CreateWorkflowCommandHandler());
commandBus.registerHandler('UpdateWorkflow', new UpdateWorkflowCommandHandler());
commandBus.registerHandler('AddNode', new AddNodeCommandHandler());
commandBus.registerHandler('ExecuteWorkflow', new ExecuteWorkflowCommandHandler());

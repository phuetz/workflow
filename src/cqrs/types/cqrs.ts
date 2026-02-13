/**
 * CQRS Types
 * Command Query Responsibility Segregation pattern types
 */

import { DomainEvent } from '../../eventsourcing/types/eventsourcing';

/**
 * Command Base Interface
 * Represents an intent to change state
 */
export interface Command {
  /** Command ID */
  id: string;

  /** Command type */
  type: string;

  /** Command payload */
  data: Record<string, unknown>;

  /** User who issued the command */
  userId?: string;

  /** Timestamp */
  timestamp: Date;

  /** Correlation ID for tracing */
  correlationId?: string;

  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Query Base Interface
 * Represents a request for data
 */
export interface Query {
  /** Query ID */
  id: string;

  /** Query type */
  type: string;

  /** Query parameters */
  parameters: Record<string, unknown>;

  /** User who issued the query */
  userId?: string;

  /** Timestamp */
  timestamp: Date;

  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Command Result
 */
export interface CommandResult {
  /** Success flag */
  success: boolean;

  /** Events generated */
  events: DomainEvent[];

  /** Aggregate ID affected */
  aggregateId?: string;

  /** Error message if failed */
  error?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Query Result
 */
export interface QueryResult {
  /** Success flag */
  success: boolean;

  /** Result data */
  data: unknown;

  /** Error message if failed */
  error?: string;

  /** Total count (for paginated queries) */
  totalCount?: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  /** Valid flag */
  valid: boolean;

  /** Validation errors */
  errors: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Command Handler Interface
 */
export interface ICommandHandler<T extends Command = Command> {
  /**
   * Handle a command
   * @param command Command to handle
   * @returns Command result with events
   */
  handle(command: T): Promise<CommandResult>;

  /**
   * Validate a command
   * @param command Command to validate
   * @returns Validation result
   */
  validate(command: T): Promise<ValidationResult>;

  /**
   * Check if handler can handle this command type
   * @param commandType Command type
   */
  canHandle(commandType: string): boolean;
}

/**
 * Query Handler Interface
 */
export interface IQueryHandler<T extends Query = Query> {
  /**
   * Handle a query
   * @param query Query to handle
   * @returns Query result
   */
  handle(query: T): Promise<QueryResult>;

  /**
   * Validate a query
   * @param query Query to validate
   * @returns Validation result
   */
  validate(query: T): Promise<ValidationResult>;

  /**
   * Check if handler can handle this query type
   * @param queryType Query type
   */
  canHandle(queryType: string): boolean;
}

/**
 * Projection Interface
 * Read model updated by events
 */
export interface IProjection {
  /** Projection name */
  name: string;

  /** Rebuild projection from events */
  rebuild(events: DomainEvent[]): Promise<void>;

  /** Update projection with a new event */
  update(event: DomainEvent): Promise<void>;

  /** Query projection */
  query(criteria: Record<string, unknown>): Promise<unknown>;

  /** Clear projection */
  clear(): Promise<void>;

  /** Get projection version */
  getVersion(): Promise<number>;
}

/**
 * Projection State
 */
export interface ProjectionState {
  /** State data */
  data: Record<string, unknown>;

  /** Last event ID processed */
  lastEventId?: string;

  /** Last event timestamp */
  lastEventTimestamp?: Date;

  /** Projection version */
  version: number;

  /** Events processed count */
  eventsProcessed: number;
}

/**
 * Workflow Commands
 */
export interface CreateWorkflowCommand extends Command {
  type: 'CreateWorkflow';
  data: {
    name: string;
    description?: string;
    tags?: string[];
    settings?: Record<string, unknown>;
  };
}

export interface UpdateWorkflowCommand extends Command {
  type: 'UpdateWorkflow';
  data: {
    workflowId: string;
    name?: string;
    description?: string;
    tags?: string[];
    settings?: Record<string, unknown>;
  };
}

export interface DeleteWorkflowCommand extends Command {
  type: 'DeleteWorkflow';
  data: {
    workflowId: string;
  };
}

export interface AddNodeCommand extends Command {
  type: 'AddNode';
  data: {
    workflowId: string;
    nodeType: string;
    position: { x: number; y: number };
    config?: Record<string, unknown>;
  };
}

export interface UpdateNodeCommand extends Command {
  type: 'UpdateNode';
  data: {
    workflowId: string;
    nodeId: string;
    config?: Record<string, unknown>;
    position?: { x: number; y: number };
  };
}

export interface DeleteNodeCommand extends Command {
  type: 'DeleteNode';
  data: {
    workflowId: string;
    nodeId: string;
  };
}

export interface AddConnectionCommand extends Command {
  type: 'AddConnection';
  data: {
    workflowId: string;
    sourceId: string;
    targetId: string;
    sourceHandle?: string;
    targetHandle?: string;
  };
}

export interface ExecuteWorkflowCommand extends Command {
  type: 'ExecuteWorkflow';
  data: {
    workflowId: string;
    input?: Record<string, unknown>;
    environment?: string;
  };
}

/**
 * Workflow Queries
 */
export interface GetWorkflowQuery extends Query {
  type: 'GetWorkflow';
  parameters: {
    workflowId: string;
  };
}

export interface ListWorkflowsQuery extends Query {
  type: 'ListWorkflows';
  parameters: {
    tags?: string[];
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

export interface GetExecutionQuery extends Query {
  type: 'GetExecution';
  parameters: {
    executionId: string;
  };
}

export interface ListExecutionsQuery extends Query {
  type: 'ListExecutions';
  parameters: {
    workflowId?: string;
    status?: string[];
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  };
}

export interface SearchNodesQuery extends Query {
  type: 'SearchNodes';
  parameters: {
    workflowId?: string;
    nodeType?: string;
    search?: string;
    limit?: number;
  };
}

export interface GetMetricsQuery extends Query {
  type: 'GetMetrics';
  parameters: {
    workflowId?: string;
    metricType: string;
    fromDate?: Date;
    toDate?: Date;
    granularity?: 'hour' | 'day' | 'week' | 'month';
  };
}

/**
 * Command/Query Bus Interface
 */
export interface ICommandBus {
  /**
   * Dispatch a command
   */
  dispatch<T extends Command>(command: T): Promise<CommandResult>;

  /**
   * Register a command handler
   */
  registerHandler<T extends Command>(
    commandType: string,
    handler: ICommandHandler<T>
  ): void;
}

export interface IQueryBus {
  /**
   * Execute a query
   */
  execute<T extends Query>(query: T): Promise<QueryResult>;

  /**
   * Register a query handler
   */
  registerHandler<T extends Query>(
    queryType: string,
    handler: IQueryHandler<T>
  ): void;
}

/**
 * Idempotency Check
 */
export interface IdempotencyRecord {
  commandId: string;
  commandType: string;
  result: CommandResult;
  timestamp: Date;
  expiresAt: Date;
}

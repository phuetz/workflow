/**
 * Query Handler
 * Handles queries against read models (projections)
 */

import {
  Query,
  QueryResult,
  ValidationResult,
  IQueryHandler,
  IQueryBus,
  GetWorkflowQuery,
  ListWorkflowsQuery,
  GetExecutionQuery,
  ListExecutionsQuery,
  GetMetricsQuery,
} from './types/cqrs';

/**
 * Base Query Handler
 */
export abstract class BaseQueryHandler<T extends Query = Query>
  implements IQueryHandler<T>
{
  abstract handle(query: T): Promise<QueryResult>;
  abstract validate(query: T): Promise<ValidationResult>;
  abstract canHandle(queryType: string): boolean;

  /**
   * Validate required parameters
   */
  protected validateRequired(
    parameters: Record<string, unknown>,
    fields: string[]
  ): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    for (const field of fields) {
      if (parameters[field] === undefined || parameters[field] === null) {
        errors.push({ field, message: `${field} is required` });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Get Workflow Query Handler
 */
export class GetWorkflowQueryHandler extends BaseQueryHandler<GetWorkflowQuery> {
  private workflows: Map<string, unknown> = new Map();

  async handle(query: GetWorkflowQuery): Promise<QueryResult> {
    const validation = await this.validate(query);
    if (!validation.valid) {
      return {
        success: false,
        data: null,
        error: validation.errors.map((e) => e.message).join(', '),
      };
    }

    const { workflowId } = query.parameters;
    const workflow = this.workflows.get(workflowId);

    if (!workflow) {
      return {
        success: false,
        data: null,
        error: `Workflow ${workflowId} not found`,
      };
    }

    return {
      success: true,
      data: workflow,
    };
  }

  async validate(query: GetWorkflowQuery): Promise<ValidationResult> {
    return this.validateRequired(query.parameters, ['workflowId']);
  }

  canHandle(queryType: string): boolean {
    return queryType === 'GetWorkflow';
  }

  /**
   * Update workflow in read model (called by projection)
   */
  updateWorkflow(workflowId: string, data: unknown): void {
    this.workflows.set(workflowId, data);
  }
}

/**
 * List Workflows Query Handler
 */
export class ListWorkflowsQueryHandler extends BaseQueryHandler<ListWorkflowsQuery> {
  private workflows: Map<string, unknown> = new Map();

  async handle(query: ListWorkflowsQuery): Promise<QueryResult> {
    const {
      tags,
      search,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query.parameters;

    let results = Array.from(this.workflows.values());

    // Filter by tags
    if (tags && tags.length > 0) {
      results = results.filter((wf: any) =>
        tags.some((tag) => wf.tags?.includes(tag))
      );
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter(
        (wf: any) =>
          wf.name?.toLowerCase().includes(searchLower) ||
          wf.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    results.sort((a: any, b: any) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    const totalCount = results.length;

    // Paginate
    results = results.slice(offset, offset + limit);

    return {
      success: true,
      data: results,
      totalCount,
    };
  }

  async validate(query: ListWorkflowsQuery): Promise<ValidationResult> {
    return { valid: true, errors: [] };
  }

  canHandle(queryType: string): boolean {
    return queryType === 'ListWorkflows';
  }

  /**
   * Update workflow in read model
   */
  updateWorkflow(workflowId: string, data: unknown): void {
    this.workflows.set(workflowId, data);
  }

  /**
   * Delete workflow from read model
   */
  deleteWorkflow(workflowId: string): void {
    this.workflows.delete(workflowId);
  }
}

/**
 * Get Execution Query Handler
 */
export class GetExecutionQueryHandler extends BaseQueryHandler<GetExecutionQuery> {
  private executions: Map<string, unknown> = new Map();

  async handle(query: GetExecutionQuery): Promise<QueryResult> {
    const validation = await this.validate(query);
    if (!validation.valid) {
      return {
        success: false,
        data: null,
        error: validation.errors.map((e) => e.message).join(', '),
      };
    }

    const { executionId } = query.parameters;
    const execution = this.executions.get(executionId);

    if (!execution) {
      return {
        success: false,
        data: null,
        error: `Execution ${executionId} not found`,
      };
    }

    return {
      success: true,
      data: execution,
    };
  }

  async validate(query: GetExecutionQuery): Promise<ValidationResult> {
    return this.validateRequired(query.parameters, ['executionId']);
  }

  canHandle(queryType: string): boolean {
    return queryType === 'GetExecution';
  }

  /**
   * Update execution in read model
   */
  updateExecution(executionId: string, data: unknown): void {
    this.executions.set(executionId, data);
  }
}

/**
 * List Executions Query Handler
 */
export class ListExecutionsQueryHandler extends BaseQueryHandler<ListExecutionsQuery> {
  private executions: Map<string, unknown> = new Map();

  async handle(query: ListExecutionsQuery): Promise<QueryResult> {
    const {
      workflowId,
      status,
      fromDate,
      toDate,
      limit = 50,
      offset = 0,
    } = query.parameters;

    let results = Array.from(this.executions.values());

    // Filter by workflow
    if (workflowId) {
      results = results.filter((exec: any) => exec.workflowId === workflowId);
    }

    // Filter by status
    if (status && status.length > 0) {
      results = results.filter((exec: any) => status.includes(exec.status));
    }

    // Filter by date range
    if (fromDate) {
      results = results.filter(
        (exec: any) => new Date(exec.startedAt) >= fromDate
      );
    }
    if (toDate) {
      results = results.filter(
        (exec: any) => new Date(exec.startedAt) <= toDate
      );
    }

    const totalCount = results.length;

    // Paginate
    results = results.slice(offset, offset + limit);

    return {
      success: true,
      data: results,
      totalCount,
    };
  }

  async validate(query: ListExecutionsQuery): Promise<ValidationResult> {
    return { valid: true, errors: [] };
  }

  canHandle(queryType: string): boolean {
    return queryType === 'ListExecutions';
  }

  /**
   * Update execution in read model
   */
  updateExecution(executionId: string, data: unknown): void {
    this.executions.set(executionId, data);
  }
}

/**
 * Get Metrics Query Handler
 */
export class GetMetricsQueryHandler extends BaseQueryHandler<GetMetricsQuery> {
  private metrics: Map<string, unknown[]> = new Map();

  async handle(query: GetMetricsQuery): Promise<QueryResult> {
    const validation = await this.validate(query);
    if (!validation.valid) {
      return {
        success: false,
        data: null,
        error: validation.errors.map((e) => e.message).join(', '),
      };
    }

    const { workflowId, metricType, fromDate, toDate, granularity = 'day' } =
      query.parameters;

    const key = workflowId || 'global';
    const allMetrics = this.metrics.get(key) || [];

    let results = allMetrics.filter((m: any) => m.type === metricType);

    // Filter by date range
    if (fromDate) {
      results = results.filter((m: any) => new Date(m.timestamp) >= fromDate);
    }
    if (toDate) {
      results = results.filter((m: any) => new Date(m.timestamp) <= toDate);
    }

    // Aggregate by granularity
    const aggregated = this.aggregateMetrics(results, granularity);

    return {
      success: true,
      data: aggregated,
    };
  }

  async validate(query: GetMetricsQuery): Promise<ValidationResult> {
    return this.validateRequired(query.parameters, ['metricType']);
  }

  canHandle(queryType: string): boolean {
    return queryType === 'GetMetrics';
  }

  /**
   * Add metric
   */
  addMetric(workflowId: string | null, metric: unknown): void {
    const key = workflowId || 'global';
    const metrics = this.metrics.get(key) || [];
    metrics.push(metric);
    this.metrics.set(key, metrics);
  }

  /**
   * Aggregate metrics by granularity
   */
  private aggregateMetrics(
    metrics: unknown[],
    granularity: string
  ): unknown[] {
    // Simplified aggregation - in production, use proper time-series aggregation
    return metrics;
  }
}

/**
 * Query Bus Implementation
 */
export class QueryBus implements IQueryBus {
  private handlers: Map<string, IQueryHandler> = new Map();

  /**
   * Execute a query
   */
  async execute<T extends Query>(query: T): Promise<QueryResult> {
    // Find handler
    const handler = this.handlers.get(query.type);
    if (!handler) {
      return {
        success: false,
        data: null,
        error: `No handler registered for query type: ${query.type}`,
      };
    }

    // Execute handler
    return handler.handle(query);
  }

  /**
   * Register a query handler
   */
  registerHandler<T extends Query>(
    queryType: string,
    handler: IQueryHandler<T>
  ): void {
    this.handlers.set(queryType, handler);
  }

  /**
   * Get registered handlers
   */
  getHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }
}

/**
 * Global query bus instance
 */
export const queryBus = new QueryBus();

// Register default handlers
export const getWorkflowHandler = new GetWorkflowQueryHandler();
export const listWorkflowsHandler = new ListWorkflowsQueryHandler();
export const getExecutionHandler = new GetExecutionQueryHandler();
export const listExecutionsHandler = new ListExecutionsQueryHandler();
export const getMetricsHandler = new GetMetricsQueryHandler();

queryBus.registerHandler('GetWorkflow', getWorkflowHandler);
queryBus.registerHandler('ListWorkflows', listWorkflowsHandler);
queryBus.registerHandler('GetExecution', getExecutionHandler);
queryBus.registerHandler('ListExecutions', listExecutionsHandler);
queryBus.registerHandler('GetMetrics', getMetricsHandler);

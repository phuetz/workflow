/**
 * Execution GraphQL Resolvers
 * Handles execution queries, mutations, and real-time subscriptions
 */

import type {
  Execution,
  ExecutionInput,
  ExecutionFilter,
  GraphQLContext,
  NodeExecution,
  ExecutionLog
} from '../types/graphql';

// Fallback DataLoader implementation
class DataLoaderFallback<K, V> {
  private batchLoadFn: (keys: readonly K[]) => Promise<(V | Error)[]>;
  private cache: Map<K, Promise<V>>;

  constructor(
    batchLoadFn: (keys: readonly K[]) => Promise<(V | Error)[]>,
    _options?: any
  ) {
    this.batchLoadFn = batchLoadFn;
    this.cache = new Map();
  }

  async load(key: K): Promise<V> {
    const cached = this.cache.get(key);
    if (cached) return cached;

    const promise = this.batchLoadFn([key]).then(results => {
      const result = results[0];
      if (result instanceof Error) throw result;
      return result as V;
    });

    this.cache.set(key, promise);
    return promise;
  }

  clear(key: K): void {
    this.cache.delete(key);
  }
}

// Fallback error classes
class GraphQLErrorBase extends Error {
  extensions: Record<string, any>;
  constructor(message: string, code: string) {
    super(message);
    this.extensions = { code };
  }
}

const AuthenticationError = class extends GraphQLErrorBase {
  constructor(message: string) {
    super(message, 'UNAUTHENTICATED');
  }
};

const UserInputError = class extends GraphQLErrorBase {
  constructor(message: string) {
    super(message, 'BAD_USER_INPUT');
  }
};

const ForbiddenError = class extends GraphQLErrorBase {
  constructor(message: string) {
    super(message, 'FORBIDDEN');
  }
};

// Fallback PubSub implementation
class PubSubFallback {
  private subscribers: Map<string, Set<(payload: any) => void>>;

  constructor() {
    this.subscribers = new Map();
  }

  publish(triggerName: string, payload: any): boolean {
    const handlers = this.subscribers.get(triggerName);
    if (handlers) {
      handlers.forEach(handler => handler(payload));
      return true;
    }
    return false;
  }

  subscribe(triggerName: string, onMessage: (payload: any) => void): number {
    if (!this.subscribers.has(triggerName)) {
      this.subscribers.set(triggerName, new Set());
    }
    this.subscribers.get(triggerName)!.add(onMessage);
    return Date.now();
  }

  unsubscribe(_subId: number): void {
    // Simplified unsubscribe
  }

  asyncIterator(triggers: string | string[]): AsyncIterableIterator<any> {
    const triggerArray = Array.isArray(triggers) ? triggers : [triggers];
    const queue: any[] = [];
    let resolve: ((value: IteratorResult<any>) => void) | null = null;

    triggerArray.forEach(trigger => {
      const handler = (payload: any) => {
        if (resolve) {
          resolve({ value: payload, done: false });
          resolve = null;
        } else {
          queue.push(payload);
        }
      };
      this.subscribe(trigger, handler);
    });

    return {
      next(): Promise<IteratorResult<any>> {
        if (queue.length > 0) {
          return Promise.resolve({ value: queue.shift(), done: false });
        }
        return new Promise(r => { resolve = r; });
      },
      return(): Promise<IteratorResult<any>> {
        return Promise.resolve({ value: undefined, done: true });
      },
      throw(error: any): Promise<IteratorResult<any>> {
        return Promise.reject(error);
      },
      [Symbol.asyncIterator]() {
        return this;
      }
    };
  }
}

const pubsub = new PubSubFallback();

// Subscription topics
const EXECUTION_UPDATED = 'EXECUTION_UPDATED';
const EXECUTION_STARTED = 'EXECUTION_STARTED';
const EXECUTION_FINISHED = 'EXECUTION_FINISHED';
const NODE_EXECUTION_UPDATED = 'NODE_EXECUTION_UPDATED';
const EXECUTION_LOGS = 'EXECUTION_LOGS';

/**
 * DataLoader for batching execution queries
 */
class ExecutionDataLoader {
  private loader: DataLoaderFallback<string, Execution | null>;

  constructor(context: GraphQLContext) {
    this.loader = new DataLoaderFallback(async (ids: readonly string[]) => {
      const executions = await context.services.execution.findMany({
        where: { id: { in: [...ids] } }
      });

      const executionMap = new Map(executions.map(e => [e.id, e]));
      return ids.map(id => executionMap.get(id) || null);
    }, {
      cache: true,
      batchScheduleFn: (callback: () => void) => setTimeout(callback, 10)
    });
  }

  async load(id: string): Promise<Execution | null> {
    return this.loader.load(id);
  }

  clear(id: string): void {
    this.loader.clear(id);
  }
}

/**
 * Query resolvers
 */
export const executionQueries = {
  /**
   * Get a single execution by ID
   */
  execution: async (
    _parent: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ): Promise<Execution | null> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    const loader = getOrCreateLoader(context);
    const execution = await loader.load(id);

    if (!execution) {
      return null;
    }

    // Check permission to view the workflow
    const hasPermission = await context.services.rbac.checkPermission(
      context.user.id,
      'workflow',
      'read',
      execution.workflowId
    );

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions to view this execution');
    }

    return execution;
  },

  /**
   * Get multiple executions with filtering
   */
  executions: async (
    _parent: unknown,
    { filter, limit = 20, offset = 0 }: {
      filter?: ExecutionFilter;
      limit?: number;
      offset?: number;
    },
    context: GraphQLContext
  ): Promise<Execution[]> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (limit > 100) {
      throw new UserInputError('Limit cannot exceed 100');
    }

    const where = buildExecutionFilterWhere(filter);

    // Only return executions for workflows user has access to
    const workflows = await context.services.workflow.findMany({
      where: {
        OR: [
          { createdBy: context.user.id },
          {
            permissions: {
              some: {
                userId: context.user.id,
                action: 'read'
              }
            }
          }
        ]
      },
      select: { id: true }
    });

    const workflowIds = workflows.map(w => w.id);

    const executions = await context.services.execution.findMany({
      where: {
        ...where,
        workflowId: { in: workflowIds }
      },
      take: limit,
      skip: offset,
      orderBy: { startedAt: 'desc' }
    });

    return executions;
  },

  /**
   * Get count of executions
   */
  executionCount: async (
    _parent: unknown,
    { filter }: { filter?: ExecutionFilter },
    context: GraphQLContext
  ): Promise<number> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    const where = buildExecutionFilterWhere(filter);

    // Get accessible workflows
    const workflows = await context.services.workflow.findMany({
      where: {
        OR: [
          { createdBy: context.user.id },
          {
            permissions: {
              some: {
                userId: context.user.id,
                action: 'read'
              }
            }
          }
        ]
      },
      select: { id: true }
    });

    const workflowIds = workflows.map(w => w.id);

    const count = await context.services.execution.count({
      where: {
        ...where,
        workflowId: { in: workflowIds }
      }
    });

    return count;
  },

  /**
   * Get execution logs
   */
  executionLogs: async (
    _parent: unknown,
    { executionId, nodeId }: { executionId: string; nodeId?: string },
    context: GraphQLContext
  ): Promise<ExecutionLog[]> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    const execution = await context.services.execution.findUnique({
      where: { id: executionId }
    });

    if (!execution) {
      throw new UserInputError('Execution not found');
    }

    // Check permission
    const hasPermission = await context.services.rbac.checkPermission(
      context.user.id,
      'workflow',
      'read',
      execution.workflowId
    );

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const logs = await context.services.logging.getExecutionLogs(
      executionId,
      nodeId
    );

    return logs;
  }
};

/**
 * Mutation resolvers
 */
export const executionMutations = {
  /**
   * Execute a workflow
   */
  executeWorkflow: async (
    _parent: unknown,
    { workflowId, input }: { workflowId: string; input?: ExecutionInput },
    context: GraphQLContext
  ): Promise<Execution> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Check execute permission
    const hasPermission = await context.services.rbac.checkPermission(
      context.user.id,
      'workflow',
      'execute',
      workflowId
    );

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions to execute this workflow');
    }

    // Get workflow
    const workflow = await context.services.workflow.findUnique({
      where: { id: workflowId }
    });

    if (!workflow) {
      throw new UserInputError('Workflow not found');
    }

    if (workflow.status !== 'ACTIVE' && input?.mode !== 'TEST') {
      throw new UserInputError('Workflow must be active to execute');
    }

    // Create execution
    const execution = await context.services.execution.create({
      data: {
        workflowId,
        status: 'PENDING',
        mode: input?.mode || 'MANUAL',
        triggeredBy: context.user.id
      }
    });

    // Publish started event
    pubsub.publish(EXECUTION_STARTED, {
      executionStarted: execution,
      workflowId
    });

    // Queue for execution
    await context.services.queue.enqueue('workflow-execution', {
      executionId: execution.id,
      workflowId,
      inputData: input?.inputData,
      startNodeId: input?.startNodeId
    });

    // Record audit log
    await context.services.audit.log({
      userId: context.user.id,
      action: 'execution.start',
      resourceId: execution.id,
      metadata: { workflowId, mode: execution.mode }
    });

    return execution;
  },

  /**
   * Cancel a running execution
   */
  cancelExecution: async (
    _parent: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ): Promise<Execution> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    const execution = await context.services.execution.findUnique({
      where: { id }
    });

    if (!execution) {
      throw new UserInputError('Execution not found');
    }

    // Check permission
    const hasPermission = await context.services.rbac.checkPermission(
      context.user.id,
      'workflow',
      'execute',
      execution.workflowId
    );

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions');
    }

    if (execution.status !== 'RUNNING' && execution.status !== 'PENDING') {
      throw new UserInputError('Execution is not running');
    }

    // Cancel execution
    const updated = await context.services.execution.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        finishedAt: new Date()
      }
    });

    // Signal worker to stop
    await context.services.queue.cancelJob(id);

    // Publish update
    pubsub.publish(EXECUTION_UPDATED, {
      executionUpdated: updated,
      executionId: id
    });

    pubsub.publish(EXECUTION_FINISHED, {
      executionFinished: updated,
      workflowId: execution.workflowId
    });

    getOrCreateLoader(context).clear(id);

    return updated;
  },

  /**
   * Retry a failed execution
   */
  retryExecution: async (
    _parent: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ): Promise<Execution> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    const original = await context.services.execution.findUnique({
      where: { id }
    });

    if (!original) {
      throw new UserInputError('Execution not found');
    }

    // Check permission
    const hasPermission = await context.services.rbac.checkPermission(
      context.user.id,
      'workflow',
      'execute',
      original.workflowId
    );

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions');
    }

    // Create retry execution
    const execution = await context.services.execution.create({
      data: {
        workflowId: original.workflowId,
        status: 'PENDING',
        mode: original.mode,
        triggeredBy: context.user.id,
        retryOf: original.id
      }
    });

    // Queue for execution
    await context.services.queue.enqueue('workflow-execution', {
      executionId: execution.id,
      workflowId: original.workflowId
    });

    return execution;
  },

  /**
   * Retry only failed nodes
   */
  retryFailedNodes: async (
    _parent: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ): Promise<Execution> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    const original = await context.services.execution.findUnique({
      where: { id },
      include: { nodeExecutions: true }
    });

    if (!original) {
      throw new UserInputError('Execution not found');
    }

    // Check permission
    const hasPermission = await context.services.rbac.checkPermission(
      context.user.id,
      'workflow',
      'execute',
      original.workflowId
    );

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const failedNodeIds = original.nodeExecutions
      .filter(ne => ne.status === 'ERROR')
      .map(ne => ne.nodeId);

    if (failedNodeIds.length === 0) {
      throw new UserInputError('No failed nodes to retry');
    }

    // Create partial execution
    const execution = await context.services.execution.create({
      data: {
        workflowId: original.workflowId,
        status: 'PENDING',
        mode: 'MANUAL',
        triggeredBy: context.user.id,
        retryOf: original.id
      }
    });

    // Queue for partial execution
    await context.services.queue.enqueue('workflow-execution', {
      executionId: execution.id,
      workflowId: original.workflowId,
      nodeIds: failedNodeIds,
      previousExecutionData: original.nodeExecutions
    });

    return execution;
  },

  /**
   * Delete an execution
   */
  deleteExecution: async (
    _parent: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ): Promise<boolean> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    const execution = await context.services.execution.findUnique({
      where: { id }
    });

    if (!execution) {
      throw new UserInputError('Execution not found');
    }

    // Check permission
    const hasPermission = await context.services.rbac.checkPermission(
      context.user.id,
      'workflow',
      'delete',
      execution.workflowId
    );

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions');
    }

    await context.services.execution.delete({ where: { id } });

    getOrCreateLoader(context).clear(id);

    return true;
  }
};

/**
 * Subscription resolvers
 */
export const executionSubscriptions = {
  /**
   * Subscribe to execution updates
   */
  executionUpdated: {
    subscribe: (_parent: unknown, { executionId }: { executionId: string }) => {
      return pubsub.asyncIterator([EXECUTION_UPDATED]);
    },
    resolve: (payload: { executionUpdated: Execution; executionId: string }, { executionId }: { executionId: string }) => {
      if (payload.executionId === executionId) {
        return payload.executionUpdated;
      }
      return null;
    }
  },

  /**
   * Subscribe to execution starts for a workflow
   */
  executionStarted: {
    subscribe: (_parent: unknown, { workflowId }: { workflowId: string }) => {
      return pubsub.asyncIterator([EXECUTION_STARTED]);
    },
    resolve: (payload: { executionStarted: Execution; workflowId: string }, { workflowId }: { workflowId: string }) => {
      if (payload.workflowId === workflowId) {
        return payload.executionStarted;
      }
      return null;
    }
  },

  /**
   * Subscribe to execution completions for a workflow
   */
  executionFinished: {
    subscribe: (_parent: unknown, { workflowId }: { workflowId: string }) => {
      return pubsub.asyncIterator([EXECUTION_FINISHED]);
    },
    resolve: (payload: { executionFinished: Execution; workflowId: string }, { workflowId }: { workflowId: string }) => {
      if (payload.workflowId === workflowId) {
        return payload.executionFinished;
      }
      return null;
    }
  },

  /**
   * Subscribe to node execution updates
   */
  nodeExecutionUpdated: {
    subscribe: (_parent: unknown, { executionId }: { executionId: string }) => {
      return pubsub.asyncIterator([NODE_EXECUTION_UPDATED]);
    }
  },

  /**
   * Subscribe to execution logs
   */
  executionLogs: {
    subscribe: (_parent: unknown, { executionId }: { executionId: string }) => {
      return pubsub.asyncIterator([EXECUTION_LOGS]);
    }
  }
};

/**
 * Field resolvers
 */
export const executionFieldResolvers = {
  Execution: {
    /**
     * Resolve workflow reference
     */
    workflow: async (execution: Execution, _args: unknown, context: GraphQLContext) => {
      return context.loaders.workflow.load(execution.workflowId);
    },

    /**
     * Resolve retries
     */
    retries: async (execution: Execution, _args: unknown, context: GraphQLContext) => {
      const retries = await context.services.execution.findMany({
        where: { retryOf: execution.id },
        orderBy: { startedAt: 'asc' }
      });
      return retries;
    }
  }
};

/**
 * Helper functions
 */

function buildExecutionFilterWhere(filter?: ExecutionFilter): Record<string, unknown> {
  if (!filter) return {};

  const where: Record<string, unknown> = {};

  if (filter.workflowId) {
    where.workflowId = filter.workflowId;
  }

  if (filter.status) {
    where.status = filter.status;
  }

  if (filter.mode) {
    where.mode = filter.mode;
  }

  if (filter.startedAfter || filter.startedBefore) {
    const startedAt: Record<string, unknown> = {};
    if (filter.startedAfter) {
      startedAt.gte = filter.startedAfter;
    }
    if (filter.startedBefore) {
      startedAt.lte = filter.startedBefore;
    }
    where.startedAt = startedAt;
  }

  if (filter.finishedAfter || filter.finishedBefore) {
    const finishedAt: Record<string, unknown> = {};
    if (filter.finishedAfter) {
      finishedAt.gte = filter.finishedAfter;
    }
    if (filter.finishedBefore) {
      finishedAt.lte = filter.finishedBefore;
    }
    where.finishedAt = finishedAt;
  }

  return where;
}

const loaderMap = new WeakMap<GraphQLContext, ExecutionDataLoader>();

function getOrCreateLoader(context: GraphQLContext): ExecutionDataLoader {
  let loader = loaderMap.get(context);
  if (!loader) {
    loader = new ExecutionDataLoader(context);
    loaderMap.set(context, loader);
  }
  return loader;
}

// Export pubsub for use by execution engine
export { pubsub };

export const executionResolvers = {
  Query: executionQueries,
  Mutation: executionMutations,
  Subscription: executionSubscriptions,
  ...executionFieldResolvers
};

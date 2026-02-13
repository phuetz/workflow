/**
 * Workflow GraphQL Resolvers
 * Handles all workflow-related queries and mutations with DataLoader optimization
 */

import { GraphQLError } from 'graphql';
import type {
  Workflow,
  WorkflowInput,
  WorkflowFilter,
  GraphQLContext,
  WorkflowNode,
  WorkflowEdge,
  WorkflowStatistics
} from '../types/graphql';

// Custom error classes
class AuthenticationError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: {
        code: 'UNAUTHENTICATED',
      },
    });
  }
}

class UserInputError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: {
        code: 'BAD_USER_INPUT',
      },
    });
  }
}

class ForbiddenError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: {
        code: 'FORBIDDEN',
      },
    });
  }
}

// Simple DataLoader implementation
class DataLoader<K, V> {
  private batchLoadFn: (keys: readonly K[]) => Promise<Array<V | Error>>;
  private cache: Map<K, Promise<V | Error>>;
  private batch: Array<{ key: K; resolve: (value: V | Error) => void }>;
  private batchScheduled: boolean;

  constructor(
    batchLoadFn: (keys: readonly K[]) => Promise<Array<V | Error>>,
    options?: { cache?: boolean; batchScheduleFn?: (callback: () => void) => void }
  ) {
    this.batchLoadFn = batchLoadFn;
    this.cache = options?.cache !== false ? new Map() : new Map();
    this.batch = [];
    this.batchScheduled = false;
  }

  async load(key: K): Promise<V | null> {
    if (this.cache.has(key)) {
      const cached = await this.cache.get(key);
      return cached instanceof Error ? null : (cached as V);
    }

    return new Promise<V | null>((resolve) => {
      this.batch.push({ key, resolve: resolve as (value: V | Error) => void });
      if (!this.batchScheduled) {
        this.batchScheduled = true;
        setTimeout(() => this.dispatchBatch(), 10);
      }
    });
  }

  async loadMany(keys: K[]): Promise<Array<V | null>> {
    return Promise.all(keys.map(key => this.load(key)));
  }

  clear(key: K): void {
    this.cache.delete(key);
  }

  clearAll(): void {
    this.cache.clear();
  }

  private async dispatchBatch(): Promise<void> {
    const batch = this.batch.slice();
    this.batch = [];
    this.batchScheduled = false;

    if (batch.length === 0) return;

    const keys = batch.map(item => item.key);
    try {
      const values = await this.batchLoadFn(keys);
      batch.forEach((item, index) => {
        const value = values[index];
        if (this.cache) {
          this.cache.set(item.key, Promise.resolve(value));
        }
        item.resolve(value);
      });
    } catch (error) {
      batch.forEach(item => {
        item.resolve(error as Error);
      });
    }
  }
}

/**
 * DataLoader for batching workflow queries
 */
class WorkflowDataLoader {
  private loader: DataLoader<string, Workflow>;

  constructor(context: GraphQLContext) {
    this.loader = new DataLoader(async (ids: readonly string[]) => {
      const workflows = await context.services.workflow.findMany({
        where: { id: { in: [...ids] } }
      });

      const workflowMap = new Map(workflows.map(w => [w.id, w]));
      return ids.map(id => workflowMap.get(id) || null);
    }, {
      cache: true,
      batchScheduleFn: callback => setTimeout(callback, 10) // 10ms batching window
    });
  }

  async load(id: string): Promise<Workflow | null> {
    return this.loader.load(id);
  }

  async loadMany(ids: string[]): Promise<Array<Workflow | null>> {
    return this.loader.loadMany(ids);
  }

  clear(id: string): void {
    this.loader.clear(id);
  }

  clearAll(): void {
    this.loader.clearAll();
  }
}

/**
 * Query resolvers
 */
export const workflowQueries = {
  /**
   * Get a single workflow by ID
   */
  workflow: async (
    _parent: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ): Promise<Workflow | null> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Check read permission
    const hasPermission = await context.services.rbac.checkPermission(
      context.user.id,
      'workflow',
      'read',
      id
    );

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions to view this workflow');
    }

    const loader = getOrCreateLoader(context);
    const workflow = await loader.load(id);

    if (!workflow) {
      return null;
    }

    // Record access for analytics
    context.services.analytics.recordAccess('workflow', id, context.user.id);

    return workflow;
  },

  /**
   * Get multiple workflows with filtering
   */
  workflows: async (
    _parent: unknown,
    { filter, limit = 20, offset = 0 }: {
      filter?: WorkflowFilter;
      limit?: number;
      offset?: number;
    },
    context: GraphQLContext
  ): Promise<Workflow[]> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Validate pagination
    if (limit > 100) {
      throw new UserInputError('Limit cannot exceed 100');
    }

    // Build query with RBAC filter
    const workflows = await context.services.workflow.findMany({
      where: {
        ...buildFilterWhere(filter),
        // Only return workflows user has access to
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
      take: limit,
      skip: offset,
      orderBy: { updatedAt: 'desc' }
    });

    return workflows;
  },

  /**
   * Get count of workflows
   */
  workflowCount: async (
    _parent: unknown,
    { filter }: { filter?: WorkflowFilter },
    context: GraphQLContext
  ): Promise<number> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    const count = await context.services.workflow.count({
      where: {
        ...buildFilterWhere(filter),
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
      }
    });

    return count;
  }
};

/**
 * Mutation resolvers
 */
export const workflowMutations = {
  /**
   * Create a new workflow
   */
  createWorkflow: async (
    _parent: unknown,
    { input }: { input: WorkflowInput },
    context: GraphQLContext
  ): Promise<Workflow> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Check create permission
    const hasPermission = await context.services.rbac.checkPermission(
      context.user.id,
      'workflow',
      'create'
    );

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions to create workflows');
    }

    // Validate input
    validateWorkflowInput(input);

    // Create workflow
    const workflow = await context.services.workflow.create({
      data: {
        ...input,
        createdBy: context.user.id,
        version: 1,
        status: input.status || 'DRAFT'
      }
    });

    // Clear cache
    getOrCreateLoader(context).clear(workflow.id);

    // Record audit log
    await context.services.audit.log({
      userId: context.user.id,
      action: 'workflow.create',
      resourceId: workflow.id,
      metadata: { name: workflow.name }
    });

    return workflow;
  },

  /**
   * Update an existing workflow
   */
  updateWorkflow: async (
    _parent: unknown,
    { id, input }: { id: string; input: WorkflowInput },
    context: GraphQLContext
  ): Promise<Workflow> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Check update permission
    const hasPermission = await context.services.rbac.checkPermission(
      context.user.id,
      'workflow',
      'update',
      id
    );

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions to update this workflow');
    }

    // Validate input
    validateWorkflowInput(input);

    // Get current workflow for versioning
    const current = await context.services.workflow.findUnique({ where: { id } });
    if (!current) {
      throw new UserInputError('Workflow not found');
    }

    // Update workflow
    const workflow = await context.services.workflow.update({
      where: { id },
      data: {
        ...input,
        updatedBy: context.user.id,
        version: current.version + 1
      }
    });

    // Save version history
    await context.services.versioning.saveVersion(id, current, workflow);

    // Clear cache
    getOrCreateLoader(context).clear(id);

    // Record audit log
    await context.services.audit.log({
      userId: context.user.id,
      action: 'workflow.update',
      resourceId: id,
      metadata: { version: workflow.version }
    });

    return workflow;
  },

  /**
   * Delete a workflow
   */
  deleteWorkflow: async (
    _parent: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ): Promise<boolean> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Check delete permission
    const hasPermission = await context.services.rbac.checkPermission(
      context.user.id,
      'workflow',
      'delete',
      id
    );

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions to delete this workflow');
    }

    // Delete workflow
    await context.services.workflow.delete({ where: { id } });

    // Clear cache
    getOrCreateLoader(context).clear(id);

    // Record audit log
    await context.services.audit.log({
      userId: context.user.id,
      action: 'workflow.delete',
      resourceId: id
    });

    return true;
  },

  /**
   * Duplicate a workflow
   */
  duplicateWorkflow: async (
    _parent: unknown,
    { id, name }: { id: string; name?: string },
    context: GraphQLContext
  ): Promise<Workflow> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Check read permission on source
    const hasPermission = await context.services.rbac.checkPermission(
      context.user.id,
      'workflow',
      'read',
      id
    );

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions to duplicate this workflow');
    }

    // Get source workflow
    const source = await context.services.workflow.findUnique({ where: { id } });
    if (!source) {
      throw new UserInputError('Workflow not found');
    }

    // Create duplicate
    const workflow = await context.services.workflow.create({
      data: {
        ...source,
        id: undefined, // Generate new ID
        name: name || `${source.name} (Copy)`,
        createdBy: context.user.id,
        version: 1,
        status: 'DRAFT'
      }
    });

    return workflow;
  },

  /**
   * Archive a workflow
   */
  archiveWorkflow: async (
    _parent: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ): Promise<Workflow> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    const workflow = await context.services.workflow.update({
      where: { id },
      data: { status: 'ARCHIVED' }
    });

    getOrCreateLoader(context).clear(id);
    return workflow;
  },

  /**
   * Activate a workflow
   */
  activateWorkflow: async (
    _parent: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ): Promise<Workflow> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    const workflow = await context.services.workflow.update({
      where: { id },
      data: { status: 'ACTIVE' }
    });

    getOrCreateLoader(context).clear(id);
    return workflow;
  },

  /**
   * Deactivate a workflow
   */
  deactivateWorkflow: async (
    _parent: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ): Promise<Workflow> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    const workflow = await context.services.workflow.update({
      where: { id },
      data: { status: 'INACTIVE' }
    });

    getOrCreateLoader(context).clear(id);
    return workflow;
  }
};

/**
 * Field resolvers
 */
export const workflowFieldResolvers = {
  Workflow: {
    /**
     * Resolve createdBy user
     */
    createdBy: async (workflow: Workflow, _args: unknown, context: GraphQLContext) => {
      return context.loaders.user.load(workflow.createdBy);
    },

    /**
     * Resolve updatedBy user
     */
    updatedBy: async (workflow: Workflow, _args: unknown, context: GraphQLContext) => {
      if (!workflow.updatedBy) return null;
      return context.loaders.user.load(workflow.updatedBy);
    },

    /**
     * Resolve executions with pagination
     */
    executions: async (
      workflow: Workflow,
      { limit = 10, offset = 0 }: { limit?: number; offset?: number },
      context: GraphQLContext
    ) => {
      const executions = await context.services.execution.findMany({
        where: { workflowId: workflow.id },
        take: limit,
        skip: offset,
        orderBy: { startedAt: 'desc' }
      });

      const total = await context.services.execution.count({
        where: { workflowId: workflow.id }
      });

      return {
        edges: executions.map((exec, index) => ({
          node: exec,
          cursor: Buffer.from(`${offset + index}`).toString('base64')
        })),
        pageInfo: {
          hasNextPage: offset + limit < total,
          hasPreviousPage: offset > 0,
          startCursor: executions.length > 0 ? Buffer.from(`${offset}`).toString('base64') : null,
          endCursor: executions.length > 0 ? Buffer.from(`${offset + executions.length - 1}`).toString('base64') : null
        },
        totalCount: total
      };
    },

    /**
     * Resolve workflow statistics
     */
    statistics: async (workflow: Workflow, _args: unknown, context: GraphQLContext): Promise<WorkflowStatistics> => {
      const stats = await context.services.analytics.getWorkflowStatistics(workflow.id);
      return stats;
    },

    /**
     * Resolve user permissions for this workflow
     */
    permissions: async (workflow: Workflow, _args: unknown, context: GraphQLContext) => {
      if (!context.user) {
        return {
          canView: false,
          canEdit: false,
          canExecute: false,
          canDelete: false,
          canShare: false
        };
      }

      const permissions = await context.services.rbac.getResourcePermissions(
        context.user.id,
        'workflow',
        workflow.id
      );

      return permissions;
    }
  }
};

/**
 * Helper functions
 */

function buildFilterWhere(filter?: WorkflowFilter): Record<string, unknown> {
  if (!filter) return {};

  const where: Record<string, unknown> = {};

  if (filter.status) {
    where.status = filter.status;
  }

  if (filter.tags && filter.tags.length > 0) {
    where.tags = { hasSome: filter.tags };
  }

  if (filter.search) {
    where.OR = [
      { name: { contains: filter.search, mode: 'insensitive' } },
      { description: { contains: filter.search, mode: 'insensitive' } }
    ];
  }

  if (filter.createdAfter || filter.createdBefore) {
    const createdAt: Record<string, unknown> = {};
    if (filter.createdAfter) {
      createdAt.gte = filter.createdAfter;
    }
    if (filter.createdBefore) {
      createdAt.lte = filter.createdBefore;
    }
    where.createdAt = createdAt;
  }

  return where;
}

function validateWorkflowInput(input: WorkflowInput): void {
  if (!input.name || input.name.trim().length === 0) {
    throw new UserInputError('Workflow name is required');
  }

  if (input.name.length > 255) {
    throw new UserInputError('Workflow name must be less than 255 characters');
  }

  if (!input.nodes || input.nodes.length === 0) {
    throw new UserInputError('Workflow must contain at least one node');
  }

  // Validate node IDs are unique
  const nodeIds = new Set<string>();
  for (const node of input.nodes) {
    if (nodeIds.has(node.id)) {
      throw new UserInputError(`Duplicate node ID: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  // Validate edges reference valid nodes
  for (const edge of input.edges) {
    if (!nodeIds.has(edge.source)) {
      throw new UserInputError(`Edge references invalid source node: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      throw new UserInputError(`Edge references invalid target node: ${edge.target}`);
    }
  }
}

// Context-bound loader storage
const loaderMap = new WeakMap<GraphQLContext, WorkflowDataLoader>();

function getOrCreateLoader(context: GraphQLContext): WorkflowDataLoader {
  let loader = loaderMap.get(context);
  if (!loader) {
    loader = new WorkflowDataLoader(context);
    loaderMap.set(context, loader);
  }
  return loader;
}

export const workflowResolvers = {
  Query: workflowQueries,
  Mutation: workflowMutations,
  ...workflowFieldResolvers
};

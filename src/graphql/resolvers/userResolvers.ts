/**
 * User GraphQL Resolvers
 * Handles user queries and mutations with RBAC integration
 */

import DataLoader from 'dataloader';
import { AuthenticationError, UserInputError, ForbiddenError } from 'apollo-server-express';
import type {
  User,
  UserInput,
  UserPreferencesInput,
  UserFilter,
  GraphQLContext,
  UserStatistics,
  Permission
} from '../types/graphql';

/**
 * DataLoader for batching user queries
 */
class UserDataLoader {
  private loader: DataLoader<string, User>;

  constructor(context: GraphQLContext) {
    this.loader = new DataLoader(async (ids: readonly string[]) => {
      const users = await context.services.user.findMany({
        where: { id: { in: [...ids] } }
      });

      const userMap = new Map(users.map(u => [u.id, u]));
      return ids.map(id => userMap.get(id) || null);
    }, {
      cache: true,
      batchScheduleFn: callback => setTimeout(callback, 10)
    });
  }

  async load(id: string): Promise<User | null> {
    return this.loader.load(id);
  }

  clear(id: string): void {
    this.loader.clear(id);
  }
}

/**
 * Query resolvers
 */
export const userQueries = {
  /**
   * Get a single user by ID
   */
  user: async (
    _parent: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ): Promise<User | null> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Users can view their own profile or admins can view any
    if (context.user.id !== id && context.user.role !== 'ADMIN') {
      throw new ForbiddenError('Insufficient permissions to view this user');
    }

    const loader = getOrCreateLoader(context);
    return loader.load(id);
  },

  /**
   * Get current authenticated user
   */
  currentUser: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<User> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    const loader = getOrCreateLoader(context);
    const user = await loader.load(context.user.id);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  },

  /**
   * Get multiple users with filtering
   */
  users: async (
    _parent: unknown,
    { filter, limit = 20, offset = 0 }: {
      filter?: UserFilter;
      limit?: number;
      offset?: number;
    },
    context: GraphQLContext
  ): Promise<User[]> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Only admins can list users
    if (context.user.role !== 'ADMIN') {
      throw new ForbiddenError('Insufficient permissions to list users');
    }

    if (limit > 100) {
      throw new UserInputError('Limit cannot exceed 100');
    }

    const where = buildUserFilterWhere(filter);

    const users = await context.services.user.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });

    return users;
  },

  /**
   * Get count of users
   */
  userCount: async (
    _parent: unknown,
    { filter }: { filter?: UserFilter },
    context: GraphQLContext
  ): Promise<number> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (context.user.role !== 'ADMIN') {
      throw new ForbiddenError('Insufficient permissions');
    }

    const where = buildUserFilterWhere(filter);

    const count = await context.services.user.count({ where });

    return count;
  }
};

/**
 * Mutation resolvers
 */
export const userMutations = {
  /**
   * Update user profile
   */
  updateUser: async (
    _parent: unknown,
    { id, input }: { id: string; input: UserInput },
    context: GraphQLContext
  ): Promise<User> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Users can update their own profile or admins can update any
    if (context.user.id !== id && context.user.role !== 'ADMIN') {
      throw new ForbiddenError('Insufficient permissions to update this user');
    }

    // Validate role change - only admins can change roles
    if (input.role && context.user.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can change user roles');
    }

    // Validate email uniqueness if changing
    if (input.email) {
      const existing = await context.services.user.findFirst({
        where: {
          email: input.email,
          id: { not: id }
        }
      });

      if (existing) {
        throw new UserInputError('Email already in use');
      }
    }

    // Validate username uniqueness if changing
    if (input.username) {
      const existing = await context.services.user.findFirst({
        where: {
          username: input.username,
          id: { not: id }
        }
      });

      if (existing) {
        throw new UserInputError('Username already in use');
      }
    }

    const user = await context.services.user.update({
      where: { id },
      data: input
    });

    getOrCreateLoader(context).clear(id);

    // Record audit log
    await context.services.audit.log({
      userId: context.user.id,
      action: 'user.update',
      resourceId: id,
      metadata: input
    });

    return user;
  },

  /**
   * Update user preferences
   */
  updateUserPreferences: async (
    _parent: unknown,
    { input }: { input: UserPreferencesInput },
    context: GraphQLContext
  ): Promise<User> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    const user = await context.services.user.update({
      where: { id: context.user.id },
      data: {
        preferences: input
      }
    });

    getOrCreateLoader(context).clear(context.user.id);

    return user;
  },

  /**
   * Delete a user
   */
  deleteUser: async (
    _parent: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ): Promise<boolean> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Only admins can delete users
    if (context.user.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can delete users');
    }

    // Prevent self-deletion
    if (context.user.id === id) {
      throw new UserInputError('Cannot delete your own account');
    }

    await context.services.user.delete({ where: { id } });

    getOrCreateLoader(context).clear(id);

    // Record audit log
    await context.services.audit.log({
      userId: context.user.id,
      action: 'user.delete',
      resourceId: id
    });

    return true;
  },

  /**
   * Suspend a user
   */
  suspendUser: async (
    _parent: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ): Promise<User> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (context.user.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can suspend users');
    }

    if (context.user.id === id) {
      throw new UserInputError('Cannot suspend your own account');
    }

    const user = await context.services.user.update({
      where: { id },
      data: { status: 'SUSPENDED' }
    });

    getOrCreateLoader(context).clear(id);

    // Invalidate all sessions for this user
    await context.services.session.invalidateUserSessions(id);

    await context.services.audit.log({
      userId: context.user.id,
      action: 'user.suspend',
      resourceId: id
    });

    return user;
  },

  /**
   * Activate a user
   */
  activateUser: async (
    _parent: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ): Promise<User> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (context.user.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can activate users');
    }

    const user = await context.services.user.update({
      where: { id },
      data: { status: 'ACTIVE' }
    });

    getOrCreateLoader(context).clear(id);

    await context.services.audit.log({
      userId: context.user.id,
      action: 'user.activate',
      resourceId: id
    });

    return user;
  }
};

/**
 * Field resolvers
 */
export const userFieldResolvers = {
  User: {
    /**
     * Compute full name
     */
    fullName: (user: User) => {
      if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
      }
      return user.firstName || user.lastName || user.username;
    },

    /**
     * Resolve workflows for user
     */
    workflows: async (
      user: User,
      { limit = 10 }: { limit?: number },
      context: GraphQLContext
    ) => {
      const workflows = await context.services.workflow.findMany({
        where: { createdBy: user.id },
        take: limit,
        orderBy: { updatedAt: 'desc' }
      });

      return workflows;
    },

    /**
     * Resolve user statistics
     */
    statistics: async (
      user: User,
      _args: unknown,
      context: GraphQLContext
    ): Promise<UserStatistics> => {
      const [
        totalWorkflows,
        activeWorkflows,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        lastExecution
      ] = await Promise.all([
        context.services.workflow.count({
          where: { createdBy: user.id }
        }),
        context.services.workflow.count({
          where: { createdBy: user.id, status: 'ACTIVE' }
        }),
        context.services.execution.count({
          where: {
            workflow: { createdBy: user.id }
          }
        }),
        context.services.execution.count({
          where: {
            workflow: { createdBy: user.id },
            status: 'SUCCESS'
          }
        }),
        context.services.execution.count({
          where: {
            workflow: { createdBy: user.id },
            status: 'ERROR'
          }
        }),
        context.services.execution.findFirst({
          where: {
            workflow: { createdBy: user.id }
          },
          orderBy: { startedAt: 'desc' }
        })
      ]);

      return {
        totalWorkflows,
        activeWorkflows,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        lastExecutionTime: lastExecution?.startedAt
      };
    },

    /**
     * Resolve user permissions
     */
    permissions: async (
      user: User,
      _args: unknown,
      context: GraphQLContext
    ): Promise<Permission[]> => {
      const permissions = await context.services.rbac.getUserPermissions(user.id);

      return permissions.map(p => ({
        resource: p.resource,
        action: p.action,
        granted: true
      }));
    }
  }
};

/**
 * Helper functions
 */

function buildUserFilterWhere(filter?: UserFilter): Record<string, unknown> {
  if (!filter) return {};

  const where: Record<string, unknown> = {};

  if (filter.role) {
    where.role = filter.role;
  }

  if (filter.status) {
    where.status = filter.status;
  }

  if (filter.search) {
    where.OR = [
      { email: { contains: filter.search, mode: 'insensitive' } },
      { username: { contains: filter.search, mode: 'insensitive' } },
      { firstName: { contains: filter.search, mode: 'insensitive' } },
      { lastName: { contains: filter.search, mode: 'insensitive' } }
    ];
  }

  return where;
}

const loaderMap = new WeakMap<GraphQLContext, UserDataLoader>();

function getOrCreateLoader(context: GraphQLContext): UserDataLoader {
  let loader = loaderMap.get(context);
  if (!loader) {
    loader = new UserDataLoader(context);
    loaderMap.set(context, loader);
  }
  return loader;
}

export const userResolvers = {
  Query: userQueries,
  Mutation: userMutations,
  ...userFieldResolvers
};

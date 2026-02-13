/**
 * Workflow Repository - Prisma Implementation
 * Handles all workflow-related database operations
 */

import {
  Workflow,
  WorkflowStatus,
  WorkflowVisibility,
  WorkflowVersion,
  Prisma
} from '@prisma/client';
import { prisma, executeInTransaction } from '../prisma';
import { logger } from '../../../services/LoggingService';

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  nodes: Prisma.InputJsonValue;
  edges: Prisma.InputJsonValue;
  userId: string;
  teamId?: string;
  tags?: string[];
  category?: string;
  visibility?: WorkflowVisibility;
  variables?: Prisma.InputJsonValue;
  settings?: Prisma.InputJsonValue;
  schedule?: Prisma.InputJsonValue;
  webhookUrl?: string;
  isTemplate?: boolean;
  templateData?: Prisma.InputJsonValue;
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  status?: WorkflowStatus;
  nodes?: Prisma.InputJsonValue;
  edges?: Prisma.InputJsonValue;
  tags?: string[];
  category?: string;
  visibility?: WorkflowVisibility;
  variables?: Prisma.InputJsonValue;
  settings?: Prisma.InputJsonValue;
  schedule?: Prisma.InputJsonValue;
  webhookUrl?: string | null;
  isTemplate?: boolean;
  templateData?: Prisma.InputJsonValue;
  statistics?: Prisma.InputJsonValue;
}

export interface WorkflowFilter {
  status?: WorkflowStatus;
  visibility?: WorkflowVisibility;
  tags?: string[];
  category?: string;
  isTemplate?: boolean;
  search?: string;
}

export class WorkflowRepository {
  /**
   * Find workflow by ID
   */
  async findById(id: string, userId?: string): Promise<Workflow | null> {
    try {
      const where: Prisma.WorkflowWhereInput = { id };

      // Filter by user access if userId provided
      if (userId) {
        where.OR = [
          { userId },
          { teamId: { not: null }, team: { members: { some: { userId } } } },
          { visibility: WorkflowVisibility.PUBLIC },
          { shares: { some: { userId } } },
        ];
      }

      return await prisma.workflow.findFirst({ where });
    } catch (error) {
      logger.error('Error finding workflow by ID:', error);
      throw error;
    }
  }

  /**
   * Find all workflows for a user
   */
  async findByUser(
    userId: string,
    options?: {
      skip?: number;
      limit?: number;
      filter?: WorkflowFilter;
      orderBy?: Prisma.WorkflowOrderByWithRelationInput;
    }
  ): Promise<{ workflows: Workflow[]; total: number }> {
    try {
      const where: Prisma.WorkflowWhereInput = {
        OR: [
          { userId },
          { teamId: { not: null }, team: { members: { some: { userId } } } },
          { shares: { some: { userId } } },
        ],
      };

      // Apply filters
      if (options?.filter) {
        if (options.filter.status) {
          where.status = options.filter.status;
        }
        if (options.filter.visibility) {
          where.visibility = options.filter.visibility;
        }
        if (options.filter.category) {
          where.category = options.filter.category;
        }
        if (options.filter.isTemplate !== undefined) {
          where.isTemplate = options.filter.isTemplate;
        }
        if (options.filter.tags && options.filter.tags.length > 0) {
          where.tags = { hasSome: options.filter.tags };
        }
        if (options.filter.search) {
          where.AND = [
            {
              OR: [
                { name: { contains: options.filter.search, mode: 'insensitive' } },
                { description: { contains: options.filter.search, mode: 'insensitive' } },
                { tags: { hasSome: [options.filter.search] } },
              ],
            },
          ];
        }
      }

      const [workflows, total] = await Promise.all([
        prisma.workflow.findMany({
          where,
          skip: options?.skip || 0,
          take: options?.limit || 100,
          orderBy: options?.orderBy || { updatedAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.workflow.count({ where }),
      ]);

      return { workflows, total };
    } catch (error) {
      logger.error('Error finding workflows by user:', error);
      throw error;
    }
  }

  /**
   * Create new workflow with versioning
   */
  async create(data: CreateWorkflowInput): Promise<Workflow> {
    try {
      return await executeInTransaction(async (tx) => {
        // Create workflow
        const workflow = await tx.workflow.create({
          data: {
            name: data.name,
            description: data.description,
            userId: data.userId,
            teamId: data.teamId,
            nodes: data.nodes,
            edges: data.edges,
            tags: data.tags || [],
            category: data.category,
            visibility: data.visibility || WorkflowVisibility.PRIVATE,
            variables: data.variables || {},
            settings: data.settings || {},
            schedule: data.schedule,
            webhookUrl: data.webhookUrl,
            isTemplate: data.isTemplate || false,
            templateData: data.templateData,
            statistics: {
              totalExecutions: 0,
              successfulExecutions: 0,
              failedExecutions: 0,
              averageExecutionTime: 0,
            },
          },
        });

        // Create initial version
        await tx.workflowVersion.create({
          data: {
            workflowId: workflow.id,
            version: 1,
            name: workflow.name,
            description: workflow.description,
            nodes: workflow.nodes,
            edges: workflow.edges,
            variables: workflow.variables,
            settings: workflow.settings,
            createdBy: data.userId,
          },
        });

        return workflow;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Webhook URL already exists');
        }
      }
      logger.error('Error creating workflow:', error);
      throw error;
    }
  }

  /**
   * Update workflow with automatic versioning
   */
  async update(
    id: string,
    data: UpdateWorkflowInput,
    userId: string,
    createVersion: boolean = false
  ): Promise<Workflow> {
    try {
      return await executeInTransaction(async (tx) => {
        const workflow = await tx.workflow.update({
          where: { id },
          data: {
            ...data,
            updatedAt: new Date(),
          },
        });

        // Create new version if requested
        if (createVersion) {
          const latestVersion = await tx.workflowVersion.findFirst({
            where: { workflowId: id },
            orderBy: { version: 'desc' },
          });

          await tx.workflowVersion.create({
            data: {
              workflowId: id,
              version: (latestVersion?.version || 0) + 1,
              name: workflow.name,
              description: workflow.description,
              nodes: workflow.nodes,
              edges: workflow.edges,
              variables: workflow.variables,
              settings: workflow.settings,
              createdBy: userId,
            },
          });
        }

        return workflow;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Webhook URL already exists');
        }
        if (error.code === 'P2025') {
          throw new Error('Workflow not found');
        }
      }
      logger.error('Error updating workflow:', error);
      throw error;
    }
  }

  /**
   * Delete workflow
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.workflow.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return false;
        }
      }
      logger.error('Error deleting workflow:', error);
      throw error;
    }
  }

  /**
   * Duplicate workflow
   */
  async duplicate(
    id: string,
    userId: string,
    newName?: string
  ): Promise<Workflow | null> {
    try {
      const original = await this.findById(id, userId);
      if (!original) return null;

      return await this.create({
        name: newName || `${original.name} (Copy)`,
        description: original.description,
        nodes: original.nodes,
        edges: original.edges,
        userId,
        tags: original.tags,
        category: original.category,
        variables: original.variables,
        settings: original.settings,
      });
    } catch (error) {
      logger.error('Error duplicating workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow versions
   */
  async getVersions(workflowId: string): Promise<WorkflowVersion[]> {
    try {
      return await prisma.workflowVersion.findMany({
        where: { workflowId },
        orderBy: { version: 'desc' },
      });
    } catch (error) {
      logger.error('Error getting workflow versions:', error);
      throw error;
    }
  }

  /**
   * Restore workflow to specific version
   */
  async restoreVersion(
    workflowId: string,
    version: number,
    userId: string
  ): Promise<Workflow> {
    try {
      return await executeInTransaction(async (tx) => {
        const versionData = await tx.workflowVersion.findUnique({
          where: {
            workflowId_version: {
              workflowId,
              version,
            },
          },
        });

        if (!versionData) {
          throw new Error('Version not found');
        }

        const workflow = await tx.workflow.update({
          where: { id: workflowId },
          data: {
            name: versionData.name,
            description: versionData.description,
            nodes: versionData.nodes,
            edges: versionData.edges,
            variables: versionData.variables,
            settings: versionData.settings,
          },
        });

        // Create new version after restore
        const latestVersion = await tx.workflowVersion.findFirst({
          where: { workflowId },
          orderBy: { version: 'desc' },
        });

        await tx.workflowVersion.create({
          data: {
            workflowId,
            version: (latestVersion?.version || 0) + 1,
            name: workflow.name,
            description: workflow.description,
            nodes: workflow.nodes,
            edges: workflow.edges,
            variables: workflow.variables,
            settings: workflow.settings,
            createdBy: userId,
          },
        });

        return workflow;
      });
    } catch (error) {
      logger.error('Error restoring workflow version:', error);
      throw error;
    }
  }

  /**
   * Update workflow statistics
   */
  async updateStatistics(
    id: string,
    execution: {
      success: boolean;
      duration: number;
    }
  ): Promise<void> {
    try {
      const workflow = await prisma.workflow.findUnique({
        where: { id },
        select: { statistics: true },
      });

      if (!workflow) return;

      const stats = workflow.statistics as any || {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
      };

      const totalExecutions = stats.totalExecutions + 1;
      const successfulExecutions = execution.success
        ? stats.successfulExecutions + 1
        : stats.successfulExecutions;
      const failedExecutions = !execution.success
        ? stats.failedExecutions + 1
        : stats.failedExecutions;

      const totalTime = stats.averageExecutionTime * stats.totalExecutions + execution.duration;
      const averageExecutionTime = totalTime / totalExecutions;

      await prisma.workflow.update({
        where: { id },
        data: {
          statistics: {
            totalExecutions,
            successfulExecutions,
            failedExecutions,
            averageExecutionTime,
            lastExecutedAt: new Date(),
          },
        },
      });
    } catch (error) {
      logger.error('Error updating workflow statistics:', error);
      throw error;
    }
  }

  /**
   * Search workflows
   */
  async search(
    query: string,
    userId?: string,
    limit: number = 50
  ): Promise<Workflow[]> {
    try {
      const where: Prisma.WorkflowWhereInput = {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: [query] } },
        ],
      };

      if (userId) {
        where.AND = [
          {
            OR: [
              { userId },
              { visibility: WorkflowVisibility.PUBLIC },
              { shares: { some: { userId } } },
            ],
          },
        ];
      }

      return await prisma.workflow.findMany({
        where,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error searching workflows:', error);
      throw error;
    }
  }

  /**
   * Get workflow statistics
   */
  async getStatistics(userId?: string) {
    try {
      const where: Prisma.WorkflowWhereInput = userId
        ? {
            OR: [
              { userId },
              { shares: { some: { userId } } },
            ],
          }
        : {};

      const [total, active, draft, inactive, archived] = await Promise.all([
        prisma.workflow.count({ where }),
        prisma.workflow.count({ where: { ...where, status: WorkflowStatus.ACTIVE } }),
        prisma.workflow.count({ where: { ...where, status: WorkflowStatus.DRAFT } }),
        prisma.workflow.count({ where: { ...where, status: WorkflowStatus.INACTIVE } }),
        prisma.workflow.count({ where: { ...where, status: WorkflowStatus.ARCHIVED } }),
      ]);

      // Get execution statistics
      const workflows = await prisma.workflow.findMany({
        where,
        select: { statistics: true },
      });

      let totalExecutions = 0;
      let totalTime = 0;

      workflows.forEach((w) => {
        const stats = w.statistics as any;
        if (stats?.totalExecutions) {
          totalExecutions += stats.totalExecutions;
          totalTime += stats.averageExecutionTime * stats.totalExecutions;
        }
      });

      return {
        total,
        active,
        draft,
        inactive,
        archived,
        totalExecutions,
        avgExecutionTime: totalExecutions > 0 ? totalTime / totalExecutions : 0,
      };
    } catch (error) {
      logger.error('Error getting workflow statistics:', error);
      throw error;
    }
  }

  /**
   * Export workflow
   */
  async export(id: string, userId: string) {
    try {
      const workflow = await this.findById(id, userId);
      if (!workflow) return null;

      return {
        version: '1.0.0',
        name: workflow.name,
        description: workflow.description,
        nodes: workflow.nodes,
        edges: workflow.edges,
        variables: workflow.variables,
        settings: workflow.settings,
        tags: workflow.tags,
        category: workflow.category,
        exportedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error exporting workflow:', error);
      throw error;
    }
  }

  /**
   * Import workflow
   */
  async import(data: any, userId: string): Promise<Workflow> {
    try {
      return await this.create({
        name: data.name,
        description: data.description,
        nodes: data.nodes,
        edges: data.edges,
        variables: data.variables || {},
        settings: data.settings || {},
        tags: data.tags || [],
        category: data.category,
        userId,
      });
    } catch (error) {
      logger.error('Error importing workflow:', error);
      throw error;
    }
  }

  /**
   * Get templates
   */
  async getTemplates(options?: {
    skip?: number;
    limit?: number;
    category?: string;
  }): Promise<{ workflows: Workflow[]; total: number }> {
    try {
      const where: Prisma.WorkflowWhereInput = {
        isTemplate: true,
        visibility: WorkflowVisibility.PUBLIC,
      };

      if (options?.category) {
        where.category = options.category;
      }

      const [workflows, total] = await Promise.all([
        prisma.workflow.findMany({
          where,
          skip: options?.skip || 0,
          take: options?.limit || 50,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        prisma.workflow.count({ where }),
      ]);

      return { workflows, total };
    } catch (error) {
      logger.error('Error getting templates:', error);
      throw error;
    }
  }
}

// Singleton instance
export const workflowRepository = new WorkflowRepository();
export default workflowRepository;

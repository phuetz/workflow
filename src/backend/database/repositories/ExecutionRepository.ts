/**
 * Execution Repository - Prisma Implementation
 * Handles workflow execution and node execution database operations
 */

import {
  WorkflowExecution,
  NodeExecution,
  ExecutionStatus,
  Prisma
} from '@prisma/client';
import { prisma, executeInTransaction } from '../prisma';
import { logger } from '../../../services/SimpleLogger';

export interface CreateExecutionInput {
  workflowId: string;
  userId: string;
  version?: number;
  trigger: Prisma.InputJsonValue;
  input?: Prisma.InputJsonValue;
  priority?: number;
  maxRetries?: number;
  metadata?: Prisma.InputJsonValue;
  parentExecutionId?: string;
}

export interface UpdateExecutionInput {
  status?: ExecutionStatus;
  finishedAt?: Date;
  duration?: number;
  output?: Prisma.InputJsonValue;
  error?: Prisma.InputJsonValue;
  executionData?: Prisma.InputJsonValue;
  retryCount?: number;
  metadata?: Prisma.InputJsonValue;
}

export interface CreateNodeExecutionInput {
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  input?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}

export interface UpdateNodeExecutionInput {
  status?: ExecutionStatus;
  finishedAt?: Date;
  duration?: number;
  output?: Prisma.InputJsonValue;
  error?: Prisma.InputJsonValue;
  retryCount?: number;
  metadata?: Prisma.InputJsonValue;
}

export type ExecutionWithNodes = WorkflowExecution & {
  nodeExecutions: NodeExecution[];
  workflow: {
    id: string;
    name: string;
  };
};

export class ExecutionRepository {
  /**
   * Create new workflow execution
   */
  async createExecution(data: CreateExecutionInput): Promise<WorkflowExecution> {
    try {
      return await prisma.workflowExecution.create({
        data: {
          workflowId: data.workflowId,
          userId: data.userId,
          version: data.version || 1,
          status: ExecutionStatus.PENDING,
          trigger: data.trigger,
          input: data.input,
          priority: data.priority || 0,
          maxRetries: data.maxRetries || 3,
          metadata: data.metadata || {},
          parentExecutionId: data.parentExecutionId,
        },
      });
    } catch (error) {
      logger.error('Error creating execution:', error);
      throw error;
    }
  }

  /**
   * Update workflow execution
   */
  async updateExecution(
    id: string,
    data: UpdateExecutionInput
  ): Promise<WorkflowExecution> {
    try {
      // Calculate duration if finishedAt is provided
      if (data.finishedAt && !data.duration) {
        const execution = await prisma.workflowExecution.findUnique({
          where: { id },
          select: { startedAt: true },
        });

        if (execution) {
          data.duration = data.finishedAt.getTime() - execution.startedAt.getTime();
        }
      }

      return await prisma.workflowExecution.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Execution not found');
        }
      }
      logger.error('Error updating execution:', error);
      throw error;
    }
  }

  /**
   * Find execution by ID
   */
  async findById(id: string): Promise<WorkflowExecution | null> {
    try {
      return await prisma.workflowExecution.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error('Error finding execution:', error);
      throw error;
    }
  }

  /**
   * Find execution with nodes
   */
  async findByIdWithNodes(id: string): Promise<ExecutionWithNodes | null> {
    try {
      return await prisma.workflowExecution.findUnique({
        where: { id },
        include: {
          nodeExecutions: {
            orderBy: { startedAt: 'asc' },
          },
          workflow: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }) as ExecutionWithNodes | null;
    } catch (error) {
      logger.error('Error finding execution with nodes:', error);
      throw error;
    }
  }

  /**
   * Find executions by workflow
   */
  async findByWorkflow(
    workflowId: string,
    options?: {
      skip?: number;
      limit?: number;
      status?: ExecutionStatus;
      orderBy?: Prisma.WorkflowExecutionOrderByWithRelationInput;
    }
  ): Promise<{ executions: WorkflowExecution[]; total: number }> {
    try {
      const where: Prisma.WorkflowExecutionWhereInput = { workflowId };

      if (options?.status) {
        where.status = options.status;
      }

      const [executions, total] = await Promise.all([
        prisma.workflowExecution.findMany({
          where,
          skip: options?.skip || 0,
          take: options?.limit || 100,
          orderBy: options?.orderBy || { startedAt: 'desc' },
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.workflowExecution.count({ where }),
      ]);

      return { executions, total };
    } catch (error) {
      logger.error('Error finding executions by workflow:', error);
      throw error;
    }
  }

  /**
   * Find executions by user
   */
  async findByUser(
    userId: string,
    options?: {
      skip?: number;
      limit?: number;
      status?: ExecutionStatus;
      workflowId?: string;
      orderBy?: Prisma.WorkflowExecutionOrderByWithRelationInput;
    }
  ): Promise<{ executions: WorkflowExecution[]; total: number }> {
    try {
      const where: Prisma.WorkflowExecutionWhereInput = { userId };

      if (options?.status) {
        where.status = options.status;
      }
      if (options?.workflowId) {
        where.workflowId = options.workflowId;
      }

      const [executions, total] = await Promise.all([
        prisma.workflowExecution.findMany({
          where,
          skip: options?.skip || 0,
          take: options?.limit || 100,
          orderBy: options?.orderBy || { startedAt: 'desc' },
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.workflowExecution.count({ where }),
      ]);

      return { executions, total };
    } catch (error) {
      logger.error('Error finding executions by user:', error);
      throw error;
    }
  }

  /**
   * Create node execution
   */
  async createNodeExecution(data: CreateNodeExecutionInput): Promise<NodeExecution> {
    try {
      return await prisma.nodeExecution.create({
        data: {
          executionId: data.executionId,
          nodeId: data.nodeId,
          nodeName: data.nodeName,
          nodeType: data.nodeType,
          status: ExecutionStatus.RUNNING,
          input: data.input,
          metadata: data.metadata || {},
        },
      });
    } catch (error) {
      logger.error('Error creating node execution:', error);
      throw error;
    }
  }

  /**
   * Update node execution
   */
  async updateNodeExecution(
    id: string,
    data: UpdateNodeExecutionInput
  ): Promise<NodeExecution> {
    try {
      // Calculate duration if finishedAt is provided
      if (data.finishedAt && !data.duration) {
        const nodeExecution = await prisma.nodeExecution.findUnique({
          where: { id },
          select: { startedAt: true },
        });

        if (nodeExecution) {
          data.duration = data.finishedAt.getTime() - nodeExecution.startedAt.getTime();
        }
      }

      return await prisma.nodeExecution.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Node execution not found');
        }
      }
      logger.error('Error updating node execution:', error);
      throw error;
    }
  }

  /**
   * Get active executions
   */
  async getActiveExecutions(): Promise<WorkflowExecution[]> {
    try {
      return await prisma.workflowExecution.findMany({
        where: {
          status: {
            in: [ExecutionStatus.PENDING, ExecutionStatus.RUNNING],
          },
        },
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { priority: 'desc' },
      });
    } catch (error) {
      logger.error('Error getting active executions:', error);
      throw error;
    }
  }

  /**
   * Get execution statistics
   */
  async getStatistics(workflowId?: string, userId?: string) {
    try {
      const where: Prisma.WorkflowExecutionWhereInput = {};

      if (workflowId) where.workflowId = workflowId;
      if (userId) where.userId = userId;

      const [total, pending, running, success, failed, cancelled, timeout] = await Promise.all([
        prisma.workflowExecution.count({ where }),
        prisma.workflowExecution.count({ where: { ...where, status: ExecutionStatus.PENDING } }),
        prisma.workflowExecution.count({ where: { ...where, status: ExecutionStatus.RUNNING } }),
        prisma.workflowExecution.count({ where: { ...where, status: ExecutionStatus.SUCCESS } }),
        prisma.workflowExecution.count({ where: { ...where, status: ExecutionStatus.FAILED } }),
        prisma.workflowExecution.count({ where: { ...where, status: ExecutionStatus.CANCELLED } }),
        prisma.workflowExecution.count({ where: { ...where, status: ExecutionStatus.TIMEOUT } }),
      ]);

      // Get average duration
      const executions = await prisma.workflowExecution.findMany({
        where: {
          ...where,
          duration: { not: null },
        },
        select: { duration: true },
      });

      const totalDuration = executions.reduce((sum, e) => sum + (e.duration || 0), 0);
      const avgDuration = executions.length > 0 ? totalDuration / executions.length : 0;

      return {
        total,
        pending,
        running,
        success,
        failed,
        cancelled,
        timeout,
        avgDuration,
        successRate: total > 0 ? ((success / total) * 100).toFixed(2) : '0',
      };
    } catch (error) {
      logger.error('Error getting execution statistics:', error);
      throw error;
    }
  }

  /**
   * Delete old executions
   */
  async deleteOldExecutions(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const result = await prisma.workflowExecution.deleteMany({
        where: {
          startedAt: {
            lt: cutoffDate,
          },
          status: {
            in: [ExecutionStatus.SUCCESS, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED],
          },
        },
      });

      logger.info(`Deleted ${result.count} old executions`);
      return result.count;
    } catch (error) {
      logger.error('Error deleting old executions:', error);
      throw error;
    }
  }

  /**
   * Retry failed execution
   */
  async retryExecution(id: string, userId: string): Promise<WorkflowExecution> {
    try {
      return await executeInTransaction(async (tx) => {
        const originalExecution = await tx.workflowExecution.findUnique({
          where: { id },
        });

        if (!originalExecution) {
          throw new Error('Execution not found');
        }

        if (originalExecution.retryCount >= originalExecution.maxRetries) {
          throw new Error('Maximum retry attempts exceeded');
        }

        // Create new execution with incremented retry count
        const newExecution = await tx.workflowExecution.create({
          data: {
            workflowId: originalExecution.workflowId,
            userId,
            version: originalExecution.version,
            status: ExecutionStatus.PENDING,
            trigger: originalExecution.trigger as Prisma.InputJsonValue,
            input: originalExecution.input as Prisma.InputJsonValue | undefined,
            priority: originalExecution.priority,
            maxRetries: originalExecution.maxRetries,
            retryCount: originalExecution.retryCount + 1,
            parentExecutionId: originalExecution.parentExecutionId,
            metadata: {
              ...(originalExecution.metadata as object),
              retryOf: id,
            } as Prisma.InputJsonValue,
          },
        });

        return newExecution;
      });
    } catch (error) {
      logger.error('Error retrying execution:', error);
      throw error;
    }
  }

  /**
   * Cancel execution
   */
  async cancelExecution(id: string): Promise<WorkflowExecution> {
    try {
      return await this.updateExecution(id, {
        status: ExecutionStatus.CANCELLED,
        finishedAt: new Date(),
      });
    } catch (error) {
      logger.error('Error cancelling execution:', error);
      throw error;
    }
  }

  /**
   * Get execution timeline
   */
  async getExecutionTimeline(executionId: string) {
    try {
      const execution = await this.findByIdWithNodes(executionId);
      if (!execution) return null;

      const timeline = execution.nodeExecutions.map((node) => ({
        nodeId: node.nodeId,
        nodeName: node.nodeName,
        nodeType: node.nodeType,
        status: node.status,
        startedAt: node.startedAt,
        finishedAt: node.finishedAt,
        duration: node.duration,
        error: node.error,
      }));

      return {
        executionId: execution.id,
        workflowId: execution.workflowId,
        workflowName: execution.workflow.name,
        status: execution.status,
        startedAt: execution.startedAt,
        finishedAt: execution.finishedAt,
        duration: execution.duration,
        timeline,
      };
    } catch (error) {
      logger.error('Error getting execution timeline:', error);
      throw error;
    }
  }

  /**
   * Get recent executions
   */
  async getRecentExecutions(
    limit: number = 10,
    userId?: string
  ): Promise<WorkflowExecution[]> {
    try {
      const where: Prisma.WorkflowExecutionWhereInput = userId ? { userId } : {};

      return await prisma.workflowExecution.findMany({
        where,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error getting recent executions:', error);
      throw error;
    }
  }

  /**
   * Get execution logs (node executions)
   */
  async getExecutionLogs(executionId: string): Promise<NodeExecution[]> {
    try {
      return await prisma.nodeExecution.findMany({
        where: { executionId },
        orderBy: { startedAt: 'asc' },
      });
    } catch (error) {
      logger.error('Error getting execution logs:', error);
      throw error;
    }
  }

  /**
   * Get failed executions for retry
   */
  async getFailedExecutionsForRetry(): Promise<WorkflowExecution[]> {
    try {
      return await prisma.workflowExecution.findMany({
        where: {
          status: ExecutionStatus.FAILED,
          retryCount: {
            lt: prisma.workflowExecution.fields.maxRetries,
          },
        },
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
              settings: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error getting failed executions for retry:', error);
      throw error;
    }
  }
}

// Singleton instance
export const executionRepository = new ExecutionRepository();
export default executionRepository;

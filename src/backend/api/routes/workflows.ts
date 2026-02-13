/**
 * Workflows API Routes
 * RESTful endpoints for workflow management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Workflow, WorkflowNode, WorkflowEdge } from '../../../types/workflowTypes';
import { logger } from '../../../services/SimpleLogger';
import { prisma } from '../../database/prisma';
import { WorkflowStatus, ExecutionStatus, Prisma } from '@prisma/client';
import {
  validateBody,
  validateParams,
  validateQuery,
  createWorkflowSchema,
  updateWorkflowSchema,
  workflowIdSchema,
  workflowListQuerySchema,
  executeWorkflowSchema,
  batchWorkflowIdsSchema,
  batchTagSchema
} from '../middleware/validation';
import { parsePaginationParams, createPaginatedResponse, toPrismaArgs } from '../utils/pagination';
import { queueManager } from '../../queue/QueueManager';

const router = Router();

// Type for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

interface CreateWorkflowRequest {
  name: string;
  description?: string;
  tags?: string[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings?: {
    errorWorkflow?: string;
    timezone?: string;
    saveDataErrorExecution?: 'all' | 'none';
    saveDataSuccessExecution?: 'all' | 'none';
    saveExecutionProgress?: boolean;
    timeout?: number;
  };
}

interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  tags?: string[];
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  settings?: {
    errorWorkflow?: string;
    timezone?: string;
    saveDataErrorExecution?: 'all' | 'none';
    saveDataSuccessExecution?: 'all' | 'none';
    saveExecutionProgress?: boolean;
    timeout?: number;
  };
}

// Type for Prisma workflow record
interface PrismaWorkflowRecord {
  id: string;
  name: string;
  description: string | null;
  version: number;
  status: WorkflowStatus;
  tags: string[];
  nodes: Prisma.JsonValue;
  edges: Prisma.JsonValue;
  settings: Prisma.JsonValue;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Helper to convert Prisma workflow to API response
const mapWorkflowToResponse = (workflow: PrismaWorkflowRecord): Partial<Workflow> => ({
  id: workflow.id,
  name: workflow.name,
  description: workflow.description || undefined,
  version: String(workflow.version),
  status: workflow.status.toLowerCase() as Workflow['status'],
  tags: workflow.tags,
  nodes: workflow.nodes as unknown as WorkflowNode[],
  edges: workflow.edges as unknown as WorkflowEdge[],
  settings: workflow.settings as Workflow['settings'],
  userId: workflow.userId || undefined,
  createdAt: workflow.createdAt,
  updatedAt: workflow.updatedAt,
});

// GET /api/workflows - List all workflows
router.get('/', validateQuery(workflowListQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { search, tags, status } = req.query;
    const userId = authReq.user?.id;

    // Use standardized pagination helper
    const paginationParams = parsePaginationParams(req, { page: 1, limit: 10 });

    logger.info(`Fetching workflows for user ${userId}`, {
      context: { page: paginationParams.page, limit: paginationParams.limit, search, tags, status }
    });

    // Build Prisma where clause
    const where: Prisma.WorkflowWhereInput = {};

    // Filter by user if authenticated
    if (userId) {
      where.userId = userId;
    }

    // Filter by status
    if (status && typeof status === 'string') {
      where.status = status.toUpperCase() as WorkflowStatus;
    }

    // Search by name
    if (search && typeof search === 'string') {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Filter by tags
    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : [tags];
      where.tags = {
        hasSome: tagsArray as string[],
      };
    }

    // Count total for pagination
    const total = await prisma.workflow.count({ where });

    // Fetch paginated workflows using Prisma-compatible pagination args
    const workflows = await prisma.workflow.findMany({
      where,
      ...toPrismaArgs(paginationParams),
      orderBy: { updatedAt: 'desc' },
    });

    // Return standardized paginated response
    const response = createPaginatedResponse(
      workflows.map(mapWorkflowToResponse),
      total,
      paginationParams,
      '/api/workflows'
    );

    res.status(200).json(response);
  } catch (error: unknown) {
    logger.error('Error fetching workflows:', error);
    res.status(500).json({
      error: 'Failed to fetch workflows',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/workflows/:id - Get a specific workflow
router.get('/:id', validateParams(workflowIdSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user?.id;

    logger.info(`Fetching workflow ${id} for user ${userId}`);

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true }
        },
        team: {
          select: { id: true, name: true }
        }
      }
    });

    if (!workflow) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: `Workflow with id ${id} does not exist`
      });
    }

    // Check access if user is authenticated
    if (userId && workflow.visibility === 'PRIVATE' && workflow.userId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to view this workflow'
      });
    }

    res.status(200).json(mapWorkflowToResponse(workflow));
  } catch (error: unknown) {
    logger.error('Error fetching workflow:', error);
    res.status(500).json({
      error: 'Failed to fetch workflow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/workflows - Create a new workflow
router.post('/', validateBody(createWorkflowSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    const workflowData: CreateWorkflowRequest = req.body;

    // Require authentication
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required to create workflows'
      });
    }

    logger.info(`Creating workflow for user ${userId}`, {
      context: { name: workflowData.name }
    });

    // Validate required fields
    if (!workflowData.name) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Workflow name is required'
      });
    }

    // Create new workflow in database
    const newWorkflow = await prisma.workflow.create({
      data: {
        name: workflowData.name,
        description: workflowData.description,
        tags: workflowData.tags || [],
        nodes: (workflowData.nodes || []) as unknown as Prisma.InputJsonValue,
        edges: (workflowData.edges || []) as unknown as Prisma.InputJsonValue,
        settings: (workflowData.settings || {}) as Prisma.InputJsonValue,
        status: WorkflowStatus.DRAFT,
        userId,
        variables: {},
        statistics: {},
      },
    });

    logger.info(`Workflow ${newWorkflow.id} created successfully`);

    res.status(201).json(mapWorkflowToResponse(newWorkflow));
  } catch (error: unknown) {
    logger.error('Error creating workflow:', error);
    res.status(500).json({
      error: 'Failed to create workflow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/workflows/:id - Update a workflow
router.put('/:id', validateParams(workflowIdSchema), validateBody(updateWorkflowSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user?.id;
    const updates: UpdateWorkflowRequest = req.body;

    logger.info(`Updating workflow ${id} for user ${userId}`);

    // Check if workflow exists
    const existingWorkflow = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!existingWorkflow) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: `Workflow with id ${id} does not exist`
      });
    }

    // Check ownership
    if (userId && existingWorkflow.userId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to update this workflow'
      });
    }

    // Build update data
    const updateData: Prisma.WorkflowUpdateInput = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.nodes !== undefined) updateData.nodes = updates.nodes as unknown as Prisma.InputJsonValue;
    if (updates.edges !== undefined) updateData.edges = updates.edges as unknown as Prisma.InputJsonValue;
    if (updates.settings !== undefined) updateData.settings = updates.settings as Prisma.InputJsonValue;

    // Update workflow in database
    const updatedWorkflow = await prisma.workflow.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Workflow ${id} updated successfully`);

    res.status(200).json(mapWorkflowToResponse(updatedWorkflow));
  } catch (error: unknown) {
    logger.error('Error updating workflow:', error);
    res.status(500).json({
      error: 'Failed to update workflow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/workflows/:id - Delete a workflow
router.delete('/:id', validateParams(workflowIdSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user?.id;

    logger.info(`Deleting workflow ${id} for user ${userId}`);

    // Check if workflow exists
    const existingWorkflow = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!existingWorkflow) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: `Workflow with id ${id} does not exist`
      });
    }

    // Check ownership
    if (userId && existingWorkflow.userId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to delete this workflow'
      });
    }

    // Delete workflow (cascade will handle related records)
    await prisma.workflow.delete({
      where: { id },
    });

    logger.info(`Workflow ${id} deleted successfully`);

    res.status(200).json({
      success: true,
      message: `Workflow ${id} deleted successfully`
    });
  } catch (error: unknown) {
    logger.error('Error deleting workflow:', error);
    res.status(500).json({
      error: 'Failed to delete workflow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/workflows/:id/execute - Execute a workflow
router.post('/:id/execute', validateParams(workflowIdSchema), validateBody(executeWorkflowSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user?.id;
    const input = req.body.input;

    // Require authentication
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required to execute workflows'
      });
    }

    logger.info(`Executing workflow ${id} for user ${userId}`, {
      context: { input }
    });

    // Check if workflow exists
    const workflow = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: `Workflow with id ${id} does not exist`
      });
    }

    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: id,
        userId,
        version: workflow.version,
        status: ExecutionStatus.PENDING,
        trigger: { type: 'manual', source: 'api' },
        input: input || null,
        executionData: {},
        metadata: {},
      },
    });

    logger.info(`Workflow ${id} execution started with id ${execution.id}`);

    // Queue the execution for processing
    try {
      const jobId = await queueManager.addJob('workflow-execution', 'workflow_execution', {
        executionId: execution.id,
        workflowId: id,
        inputData: input || {},
        userId,
        triggeredBy: 'manual',
        workflow: {
          nodes: workflow.nodes,
          edges: workflow.edges,
          settings: workflow.settings
        } as any
      }, {
        priority: 'high',
        maxAttempts: 3,
        retryDelay: 5000
      });

      logger.info(`Workflow ${id} execution queued with job id ${jobId}`, {
        context: { executionId: execution.id, jobId }
      });

      // Update execution status to running
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: ExecutionStatus.RUNNING }
      });

    } catch (queueError: unknown) {
      // If queueing fails, update execution status to failed
      logger.error('Failed to queue workflow execution:', queueError);
      const errorMessage = queueError instanceof Error ? queueError.message : 'Unknown error';
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.FAILED,
          error: { message: errorMessage, type: 'QUEUE_ERROR' },
          finishedAt: new Date()
        }
      });

      return res.status(500).json({
        error: 'Failed to queue workflow execution',
        message: errorMessage,
        executionId: execution.id
      });
    }

    res.status(200).json({
      executionId: execution.id,
      status: 'running',
      workflowId: id,
      userId,
      startTime: execution.startedAt.toISOString(),
      message: 'Workflow execution has been queued for processing'
    });
  } catch (error: unknown) {
    logger.error('Error executing workflow:', error);
    res.status(500).json({
      error: 'Failed to execute workflow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/workflows/:id/executions - Get workflow execution history
router.get('/:id/executions', validateParams(workflowIdSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { status } = req.query;
    const userId = authReq.user?.id;

    // Use standardized pagination helper
    const paginationParams = parsePaginationParams(req, { page: 1, limit: 10 });

    logger.info(`Fetching executions for workflow ${id}`, {
      context: { page: paginationParams.page, limit: paginationParams.limit, status }
    });

    // Check if workflow exists
    const workflow = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: `Workflow with id ${id} does not exist`
      });
    }

    // Build where clause
    const where: Prisma.WorkflowExecutionWhereInput = {
      workflowId: id,
    };

    // Filter by status if provided
    if (status && typeof status === 'string') {
      where.status = status.toUpperCase() as ExecutionStatus;
    }

    // Count total
    const total = await prisma.workflowExecution.count({ where });

    // Fetch executions with pagination using Prisma-compatible args
    const executions = await prisma.workflowExecution.findMany({
      where,
      ...toPrismaArgs(paginationParams),
      orderBy: { startedAt: 'desc' },
      include: {
        nodeExecutions: {
          select: {
            id: true,
            nodeId: true,
            nodeName: true,
            status: true,
            duration: true,
          }
        }
      }
    });

    // Map executions to response format
    const mappedExecutions = executions.map(exec => ({
      id: exec.id,
      workflowId: exec.workflowId,
      status: exec.status.toLowerCase(),
      startedAt: exec.startedAt,
      finishedAt: exec.finishedAt,
      duration: exec.duration,
      trigger: exec.trigger,
      nodeExecutions: exec.nodeExecutions,
    }));

    // Return standardized paginated response
    const response = createPaginatedResponse(
      mappedExecutions,
      total,
      paginationParams,
      `/api/workflows/${id}/executions`
    );

    res.status(200).json(response);
  } catch (error: unknown) {
    logger.error('Error fetching executions:', error);
    res.status(500).json({
      error: 'Failed to fetch executions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/workflows/:id/duplicate - Duplicate a workflow
router.post('/:id/duplicate', validateParams(workflowIdSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user?.id;

    // Require authentication
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required to duplicate workflows'
      });
    }

    logger.info(`Duplicating workflow ${id} for user ${userId}`);

    // Find source workflow
    const sourceWorkflow = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!sourceWorkflow) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: `Workflow with id ${id} does not exist`
      });
    }

    // Create duplicate workflow
    const duplicateWorkflow = await prisma.workflow.create({
      data: {
        name: `${sourceWorkflow.name} (Copy)`,
        description: sourceWorkflow.description,
        tags: sourceWorkflow.tags,
        nodes: sourceWorkflow.nodes as Prisma.InputJsonValue,
        edges: sourceWorkflow.edges as Prisma.InputJsonValue,
        variables: sourceWorkflow.variables as Prisma.InputJsonValue,
        settings: sourceWorkflow.settings as Prisma.InputJsonValue,
        status: WorkflowStatus.DRAFT,
        visibility: sourceWorkflow.visibility,
        userId,
        statistics: {},
      },
    });

    logger.info(`Workflow duplicated successfully with id ${duplicateWorkflow.id}`);

    res.status(201).json(mapWorkflowToResponse(duplicateWorkflow));
  } catch (error: unknown) {
    logger.error('Error duplicating workflow:', error);
    res.status(500).json({
      error: 'Failed to duplicate workflow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/workflows/:id/activate - Activate a workflow
router.post('/:id/activate', validateParams(workflowIdSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user?.id;

    logger.info(`Activating workflow ${id} for user ${userId}`);

    // Check if workflow exists
    const existingWorkflow = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!existingWorkflow) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: `Workflow with id ${id} does not exist`
      });
    }

    // Check ownership
    if (userId && existingWorkflow.userId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to activate this workflow'
      });
    }

    // Update workflow status
    const updatedWorkflow = await prisma.workflow.update({
      where: { id },
      data: { status: WorkflowStatus.ACTIVE },
    });

    logger.info(`Workflow ${id} activated successfully`);

    res.status(200).json({
      success: true,
      message: `Workflow ${id} activated successfully`,
      workflow: mapWorkflowToResponse(updatedWorkflow)
    });
  } catch (error: unknown) {
    logger.error('Error activating workflow:', error);
    res.status(500).json({
      error: 'Failed to activate workflow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/workflows/:id/deactivate - Deactivate a workflow
router.post('/:id/deactivate', validateParams(workflowIdSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user?.id;

    logger.info(`Deactivating workflow ${id} for user ${userId}`);

    // Check if workflow exists
    const existingWorkflow = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!existingWorkflow) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: `Workflow with id ${id} does not exist`
      });
    }

    // Check ownership
    if (userId && existingWorkflow.userId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to deactivate this workflow'
      });
    }

    // Update workflow status
    const updatedWorkflow = await prisma.workflow.update({
      where: { id },
      data: { status: WorkflowStatus.INACTIVE },
    });

    logger.info(`Workflow ${id} deactivated successfully`);

    res.status(200).json({
      success: true,
      message: `Workflow ${id} deactivated successfully`,
      workflow: mapWorkflowToResponse(updatedWorkflow)
    });
  } catch (error: unknown) {
    logger.error('Error deactivating workflow:', error);
    res.status(500).json({
      error: 'Failed to deactivate workflow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

interface BatchOperationResult {
  id: string;
  success: boolean;
  error: string | null;
}

interface BatchDeleteRequest {
  workflowIds: string[];
}

interface BatchActivateRequest {
  workflowIds: string[];
}

interface BatchDeactivateRequest {
  workflowIds: string[];
}

interface BatchExportRequest {
  workflowIds: string[];
}

interface BatchTagRequest {
  workflowIds: string[];
  tags: string[];
  operation?: 'add' | 'remove' | 'replace';
}

// Helper function to check workflow ownership
const checkWorkflowOwnership = async (
  workflowId: string,
  userId: string | undefined
): Promise<{ workflow: PrismaWorkflowRecord | null; error: string | null }> => {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) {
    return { workflow: null, error: `Workflow with id ${workflowId} does not exist` };
  }

  if (userId && workflow.userId !== userId) {
    return { workflow: null, error: 'You do not have permission to modify this workflow' };
  }

  return { workflow: workflow as unknown as PrismaWorkflowRecord, error: null };
};

// POST /api/workflows/batch/delete - Delete multiple workflows
router.post('/batch/delete', validateBody(batchWorkflowIdsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    const { workflowIds }: BatchDeleteRequest = req.body;

    // Require authentication
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required for batch operations'
      });
    }

    // Validate input
    if (!workflowIds || !Array.isArray(workflowIds) || workflowIds.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'workflowIds must be a non-empty array'
      });
    }

    logger.info(`Batch deleting ${workflowIds.length} workflows for user ${userId}`);

    const results = await Promise.allSettled(
      workflowIds.map(async (id): Promise<BatchOperationResult> => {
        const { workflow, error } = await checkWorkflowOwnership(id, userId);

        if (error) {
          throw new Error(error);
        }

        await prisma.workflow.delete({
          where: { id },
        });

        return { id, success: true, error: null };
      })
    );

    const response: BatchOperationResult[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          id: workflowIds[index],
          success: false,
          error: result.reason?.message || 'Unknown error'
        };
      }
    });

    const successCount = response.filter(r => r.success).length;
    const failureCount = response.filter(r => !r.success).length;

    logger.info(`Batch delete completed: ${successCount} succeeded, ${failureCount} failed`);

    res.status(200).json({
      results: response,
      summary: {
        total: workflowIds.length,
        succeeded: successCount,
        failed: failureCount
      }
    });
  } catch (error: unknown) {
    logger.error('Error in batch delete:', error);
    res.status(500).json({
      error: 'Failed to execute batch delete',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/workflows/batch/activate - Activate multiple workflows
router.post('/batch/activate', validateBody(batchWorkflowIdsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    const { workflowIds }: BatchActivateRequest = req.body;

    // Require authentication
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required for batch operations'
      });
    }

    // Validate input
    if (!workflowIds || !Array.isArray(workflowIds) || workflowIds.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'workflowIds must be a non-empty array'
      });
    }

    logger.info(`Batch activating ${workflowIds.length} workflows for user ${userId}`);

    const results = await Promise.allSettled(
      workflowIds.map(async (id): Promise<BatchOperationResult> => {
        const { workflow, error } = await checkWorkflowOwnership(id, userId);

        if (error) {
          throw new Error(error);
        }

        await prisma.workflow.update({
          where: { id },
          data: { status: WorkflowStatus.ACTIVE },
        });

        return { id, success: true, error: null };
      })
    );

    const response: BatchOperationResult[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          id: workflowIds[index],
          success: false,
          error: result.reason?.message || 'Unknown error'
        };
      }
    });

    const successCount = response.filter(r => r.success).length;
    const failureCount = response.filter(r => !r.success).length;

    logger.info(`Batch activate completed: ${successCount} succeeded, ${failureCount} failed`);

    res.status(200).json({
      results: response,
      summary: {
        total: workflowIds.length,
        succeeded: successCount,
        failed: failureCount
      }
    });
  } catch (error: unknown) {
    logger.error('Error in batch activate:', error);
    res.status(500).json({
      error: 'Failed to execute batch activate',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/workflows/batch/deactivate - Deactivate multiple workflows
router.post('/batch/deactivate', validateBody(batchWorkflowIdsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    const { workflowIds }: BatchDeactivateRequest = req.body;

    // Require authentication
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required for batch operations'
      });
    }

    // Validate input
    if (!workflowIds || !Array.isArray(workflowIds) || workflowIds.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'workflowIds must be a non-empty array'
      });
    }

    logger.info(`Batch deactivating ${workflowIds.length} workflows for user ${userId}`);

    const results = await Promise.allSettled(
      workflowIds.map(async (id): Promise<BatchOperationResult> => {
        const { workflow, error } = await checkWorkflowOwnership(id, userId);

        if (error) {
          throw new Error(error);
        }

        await prisma.workflow.update({
          where: { id },
          data: { status: WorkflowStatus.INACTIVE },
        });

        return { id, success: true, error: null };
      })
    );

    const response: BatchOperationResult[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          id: workflowIds[index],
          success: false,
          error: result.reason?.message || 'Unknown error'
        };
      }
    });

    const successCount = response.filter(r => r.success).length;
    const failureCount = response.filter(r => !r.success).length;

    logger.info(`Batch deactivate completed: ${successCount} succeeded, ${failureCount} failed`);

    res.status(200).json({
      results: response,
      summary: {
        total: workflowIds.length,
        succeeded: successCount,
        failed: failureCount
      }
    });
  } catch (error: unknown) {
    logger.error('Error in batch deactivate:', error);
    res.status(500).json({
      error: 'Failed to execute batch deactivate',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/workflows/batch/export - Export multiple workflows
router.post('/batch/export', validateBody(batchWorkflowIdsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    const { workflowIds }: BatchExportRequest = req.body;

    // Require authentication
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required for batch operations'
      });
    }

    // Validate input
    if (!workflowIds || !Array.isArray(workflowIds) || workflowIds.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'workflowIds must be a non-empty array'
      });
    }

    logger.info(`Batch exporting ${workflowIds.length} workflows for user ${userId}`);

    const results = await Promise.allSettled(
      workflowIds.map(async (id) => {
        const { workflow, error } = await checkWorkflowOwnership(id, userId);

        if (error) {
          throw new Error(error);
        }

        // Return workflow data for export (excluding sensitive fields)
        return {
          id: workflow!.id,
          name: workflow!.name,
          description: workflow!.description,
          tags: workflow!.tags,
          nodes: workflow!.nodes,
          edges: workflow!.edges,
          settings: workflow!.settings,
          variables: (workflow as any).variables,
          version: workflow!.version,
          exportedAt: new Date().toISOString(),
        };
      })
    );

    interface ExportedWorkflow {
      id: string;
      name: string;
      description: string | null;
      tags: string[];
      nodes: Prisma.JsonValue;
      edges: Prisma.JsonValue;
      settings: Prisma.JsonValue;
      variables: Prisma.JsonValue;
      version: number;
      exportedAt: string;
    }

    const exportedWorkflows: ExportedWorkflow[] = [];
    const errors: BatchOperationResult[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        exportedWorkflows.push(result.value);
      } else {
        errors.push({
          id: workflowIds[index],
          success: false,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    logger.info(`Batch export completed: ${exportedWorkflows.length} exported, ${errors.length} failed`);

    res.status(200).json({
      workflows: exportedWorkflows,
      errors: errors,
      summary: {
        total: workflowIds.length,
        exported: exportedWorkflows.length,
        failed: errors.length
      },
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: userId,
        version: '1.0'
      }
    });
  } catch (error: unknown) {
    logger.error('Error in batch export:', error);
    res.status(500).json({
      error: 'Failed to execute batch export',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/workflows/batch/tag - Add/remove/replace tags on multiple workflows
router.post('/batch/tag', validateBody(batchTagSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    const { workflowIds, tags, operation = 'add' }: BatchTagRequest = req.body;

    // Require authentication
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required for batch operations'
      });
    }

    // Validate input
    if (!workflowIds || !Array.isArray(workflowIds) || workflowIds.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'workflowIds must be a non-empty array'
      });
    }

    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'tags must be an array'
      });
    }

    if (!['add', 'remove', 'replace'].includes(operation)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'operation must be one of: add, remove, replace'
      });
    }

    logger.info(`Batch tagging ${workflowIds.length} workflows (${operation}) for user ${userId}`);

    const results = await Promise.allSettled(
      workflowIds.map(async (id): Promise<BatchOperationResult & { tags?: string[] }> => {
        const { workflow, error } = await checkWorkflowOwnership(id, userId);

        if (error || !workflow) {
          throw new Error(error || 'Workflow not found');
        }

        let newTags: string[];
        const currentTags = workflow.tags || [];

        switch (operation) {
          case 'add':
            // Add new tags while avoiding duplicates
            newTags = [...new Set([...currentTags, ...tags])];
            break;
          case 'remove':
            // Remove specified tags
            newTags = currentTags.filter(tag => !tags.includes(tag));
            break;
          case 'replace':
            // Replace all tags with the new ones
            newTags = [...tags];
            break;
          default:
            newTags = currentTags;
        }

        await prisma.workflow.update({
          where: { id },
          data: { tags: newTags },
        });

        return { id, success: true, error: null, tags: newTags };
      })
    );

    const response = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          id: workflowIds[index],
          success: false,
          error: result.reason?.message || 'Unknown error',
          tags: undefined
        };
      }
    });

    const successCount = response.filter(r => r.success).length;
    const failureCount = response.filter(r => !r.success).length;

    logger.info(`Batch tag completed: ${successCount} succeeded, ${failureCount} failed`);

    res.status(200).json({
      results: response,
      summary: {
        total: workflowIds.length,
        succeeded: successCount,
        failed: failureCount
      }
    });
  } catch (error: unknown) {
    logger.error('Error in batch tag:', error);
    res.status(500).json({
      error: 'Failed to execute batch tag',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

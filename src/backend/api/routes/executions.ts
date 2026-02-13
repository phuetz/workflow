import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { authHandler, AuthRequest } from '../middleware/auth';
import { getExecution, listNodeExecutions, getWorkflow, createExecution, updateExecution } from '../repositories/adapters';
import { onBroadcast } from '../services/events';
import {
  createExportJob,
  getExportJob,
  deleteExportJob,
  getExportFilePath,
  listExportJobs,
  type ExportOptions,
  type ExportFormat,
} from '../services/executionExport';
import { getQueueService } from '../../queue/WorkflowQueue';
import { logger } from '../../services/LogService';
import { PartialExecutor, createPartialExecutor } from '../../../execution/PartialExecutor';
import type { WorkflowNode, WorkflowEdge } from '../../../types/workflow';
import {
  validateBody,
  validateParams,
  validateQuery,
  executionIdSchema,
  executionListQuerySchema,
  queueExecutionSchema,
  exportExecutionSchema,
  exportIdSchema,
  retryFromNodeSchema,
  retryFromNodeParamsSchema,
  replayExecutionSchema,
  replayExecutionParamsSchema,
  paginationSchema
} from '../middleware/validation';
import { prisma } from '../../database/prisma';
import { queueManager } from '../../queue/QueueManager';
import { parsePaginationParams, createPaginatedResponse } from '../utils/pagination';

export const executionRouter = Router();

// List all executions
executionRouter.get('/', validateQuery(executionListQuerySchema), asyncHandler(async (req, res) => {
  // In a real implementation, this would query a database
  // For now, return empty array with standardized pagination
  const paginationParams = parsePaginationParams(req, { page: 1, limit: 50 });
  const workflowId = req.query.workflowId as string | undefined;

  // Return standardized paginated response
  const response = createPaginatedResponse(
    [],
    0,
    paginationParams,
    '/api/executions'
  );

  res.json({
    success: true,
    ...response
  });
}));

// Get execution detail
executionRouter.get('/:id', validateParams(executionIdSchema), asyncHandler(async (req, res) => {
  const exec = getExecution(req.params.id);
  if (!exec) throw new ApiError(404, 'Execution not found');
  res.json(exec);
}));

// Get execution logs
executionRouter.get('/:id/logs', validateParams(executionIdSchema), asyncHandler(async (req, res) => {
  const exec = await getExecution(req.params.id);
  if (!exec) throw new ApiError(404, 'Execution not found');
  res.json({ logs: exec.logs });
}));

// ================================
// QUEUE ENDPOINTS
// ================================

/**
 * POST /api/executions/queue
 * Add a workflow execution to the queue
 * SECURITY FIX: Requires JWT authentication, uses authenticated user ID only
 *
 * Request body:
 * {
 *   "workflowId": "required - workflow ID to execute",
 *   "inputData": { ... },
 *   "triggerNode": "optional - node ID to start from",
 *   "mode": "manual" | "trigger" | "webhook",
 *   "priority": true/false
 * }
 */
executionRouter.post('/queue', authHandler, validateBody(queueExecutionSchema), asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const { workflowId, inputData, triggerNode, mode, priority } = req.body;

  if (!workflowId) {
    throw new ApiError(400, 'workflowId is required');
  }

  try {
    const queueService = getQueueService();
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const jobData = {
      workflowId,
      executionId,
      userId,
      inputData: inputData || {},
      triggerNode,
      mode: mode || 'manual',
    };

    const job = priority
      ? await queueService.addPriorityJob(jobData)
      : await queueService.addJob(jobData);

    logger.info('Workflow queued for execution via /api/executions/queue', {
      workflowId,
      executionId,
      jobId: job.id,
    });

    res.status(202).json({
      success: true,
      executionId,
      jobId: job.id,
      message: 'Workflow queued for execution',
      links: {
        status: `/api/queue/status/${job.id}`,
        execution: `/api/executions/${executionId}`,
      },
    });
  } catch (error) {
    logger.error('Failed to queue workflow execution', {
      error: error instanceof Error ? error.message : String(error),
      workflowId,
    });

    throw new ApiError(500, `Failed to queue workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}));

/**
 * GET /api/executions/queue/status
 * Get overall queue status for execution queue
 */
executionRouter.get('/queue/status', asyncHandler(async (req, res) => {
  try {
    const queueService = getQueueService();
    const metrics = await queueService.getMetrics();
    const health = await queueService.healthCheck();

    res.json({
      success: true,
      status: health.healthy ? 'healthy' : 'degraded',
      metrics: {
        pending: metrics.waiting,
        processing: metrics.active,
        completed: metrics.completed,
        failed: metrics.failed,
        delayed: metrics.delayed,
        paused: metrics.paused,
        total: metrics.total,
      },
      redis: health.redis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get queue status', {
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(500, 'Failed to get queue status');
  }
}));

// ================================
// EXPORT ENDPOINTS
// ================================

/**
 * POST /api/executions/export
 * Start a new async export job
 * SECURITY FIX: Requires JWT authentication
 *
 * Request body:
 * {
 *   "format": "json" | "csv" | "xlsx",
 *   "workflowId": "optional workflow filter",
 *   "status": "success" | "error" | "all",
 *   "dateFrom": "2024-01-01T00:00:00Z",
 *   "dateTo": "2024-12-31T23:59:59Z",
 *   "includeData": true/false,
 *   "includeNodeExecutions": true/false,
 *   "includeLogs": true/false,
 *   "limit": 10000
 * }
 */
executionRouter.post('/export', authHandler, validateBody(exportExecutionSchema), asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const {
    format = 'json',
    workflowId,
    status = 'all',
    dateFrom,
    dateTo,
    includeData = false,
    includeNodeExecutions = false,
    includeLogs = false,
    limit = 10000,
  } = req.body;

  // Validate format
  const validFormats: ExportFormat[] = ['json', 'csv', 'xlsx'];
  if (!validFormats.includes(format)) {
    throw new ApiError(400, `Invalid format. Must be one of: ${validFormats.join(', ')}`);
  }

  // Validate status filter
  const validStatuses = ['success', 'error', 'all'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate date formats if provided
  if (dateFrom && isNaN(Date.parse(dateFrom))) {
    throw new ApiError(400, 'Invalid dateFrom format. Use ISO 8601 format.');
  }
  if (dateTo && isNaN(Date.parse(dateTo))) {
    throw new ApiError(400, 'Invalid dateTo format. Use ISO 8601 format.');
  }

  // Validate limit
  const limitNum = Math.min(Math.max(1, Number(limit) || 10000), 100000);

  const options: ExportOptions = {
    format,
    workflowId,
    status,
    dateFrom,
    dateTo,
    includeData: Boolean(includeData),
    includeNodeExecutions: Boolean(includeNodeExecutions),
    includeLogs: Boolean(includeLogs),
    limit: limitNum,
  };

  try {
    const job = await createExportJob(options, userId);

    res.status(202).json({
      success: true,
      message: 'Export job started',
      export: {
        id: job.id,
        status: job.status,
        options: job.options,
        progress: job.progress,
        createdAt: job.createdAt.toISOString(),
        expiresAt: job.expiresAt?.toISOString(),
      },
      links: {
        status: `/api/executions/export/${job.id}`,
        download: `/api/executions/export/${job.id}/download`,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Maximum concurrent exports')) {
      throw new ApiError(429, err.message);
    }
    throw err;
  }
}));

/**
 * GET /api/executions/export
 * List all export jobs for the current user
 * SECURITY FIX: Requires JWT authentication
 */
executionRouter.get('/export', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const jobs = listExportJobs(userId);

  res.json({
    success: true,
    exports: jobs.map(job => ({
      id: job.id,
      status: job.status,
      format: job.options.format,
      progress: job.progress,
      totalRecords: job.totalRecords,
      processedRecords: job.processedRecords,
      fileSize: job.fileSize,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      expiresAt: job.expiresAt?.toISOString(),
      error: job.error,
    })),
    count: jobs.length,
  });
}));

/**
 * GET /api/executions/export/:exportId
 * Check export job status
 */
executionRouter.get('/export/:exportId', validateParams(exportIdSchema), asyncHandler(async (req, res) => {
  const { exportId } = req.params;
  const job = getExportJob(exportId);

  if (!job) {
    throw new ApiError(404, 'Export job not found');
  }

  interface ExportJobResponse {
    success: boolean;
    export: {
      id: string;
      status: string;
      options: ExportOptions;
      progress: number;
      totalRecords: number;
      processedRecords: number;
      createdAt: string;
      startedAt?: string;
      completedAt?: string;
      expiresAt?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      error?: string;
    };
    links?: {
      download: string;
    };
  }

  const response: ExportJobResponse = {
    success: true,
    export: {
      id: job.id,
      status: job.status,
      options: job.options,
      progress: job.progress,
      totalRecords: job.totalRecords,
      processedRecords: job.processedRecords,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      expiresAt: job.expiresAt?.toISOString(),
    },
  };

  if (job.status === 'completed') {
    response.export.fileName = job.fileName;
    response.export.fileSize = job.fileSize;
    response.export.mimeType = job.mimeType;
    response.links = {
      download: `/api/executions/export/${job.id}/download`,
    };
  }

  if (job.status === 'failed') {
    response.export.error = job.error;
  }

  res.json(response);
}));

/**
 * GET /api/executions/export/:exportId/download
 * Download completed export file
 */
executionRouter.get('/export/:exportId/download', validateParams(exportIdSchema), asyncHandler(async (req, res) => {
  const { exportId } = req.params;
  const job = getExportJob(exportId);

  if (!job) {
    throw new ApiError(404, 'Export job not found');
  }

  if (job.status === 'pending' || job.status === 'processing') {
    // Return 202 Accepted with progress info instead of throwing error
    res.status(202).json({
      success: false,
      message: 'Export is still processing',
      progress: job.progress,
      status: job.status,
    });
    return;
  }

  if (job.status === 'failed') {
    throw new ApiError(500, `Export failed: ${job.error}`);
  }

  if (job.status === 'expired') {
    throw new ApiError(410, 'Export file has expired and been deleted');
  }

  const filePath = getExportFilePath(exportId);
  if (!filePath) {
    throw new ApiError(404, 'Export file not found or has expired');
  }

  // Set appropriate headers for download
  res.setHeader('Content-Type', job.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${job.fileName}"`);
  res.setHeader('Content-Length', job.fileSize || 0);
  res.setHeader('X-Export-Id', job.id);
  res.setHeader('X-Export-Records', job.totalRecords);

  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on('error', (err) => {
    console.error('Error streaming export file:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to stream export file',
      });
    }
  });
}));

/**
 * DELETE /api/executions/export/:exportId
 * Delete an export job and its file
 * SECURITY FIX: Requires JWT authentication
 */
executionRouter.delete('/export/:exportId', authHandler, validateParams(exportIdSchema), asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const { exportId } = req.params;
  const job = getExportJob(exportId);

  if (!job) {
    throw new ApiError(404, 'Export job not found');
  }

  // Check ownership - user must own the export job
  if (job.userId && job.userId !== userId) {
    throw new ApiError(403, 'Not authorized to delete this export');
  }

  const deleted = await deleteExportJob(exportId);

  if (!deleted) {
    throw new ApiError(500, 'Failed to delete export job');
  }

  res.json({
    success: true,
    message: 'Export job deleted successfully',
    id: exportId,
  });
}));

// ================================
// RETRY FROM NODE ENDPOINT
// ================================

/**
 * POST /api/executions/:executionId/retry-from/:nodeId
 * Retry a workflow execution starting from a specific node
 *
 * This endpoint allows retrying a failed or completed execution from a specific node,
 * using the outputs from previous nodes as input data.
 *
 * Response:
 * {
 *   "success": true,
 *   "newExecutionId": "exec_...",
 *   "startNodeId": "nodeId",
 *   "message": "Execution started from node nodeId",
 *   "links": {
 *     "execution": "/api/executions/{newExecutionId}",
 *     "stream": "/api/executions/{newExecutionId}/stream"
 *   }
 * }
 */
executionRouter.post('/:executionId/retry-from/:nodeId', authHandler, validateParams(retryFromNodeParamsSchema), validateBody(retryFromNodeSchema), asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { executionId, nodeId } = req.params;
  const { testData, stopAtNodeId, maxExecutionTime } = req.body;

  // 1. Load the existing execution
  const existingExecution = await getExecution(executionId);
  if (!existingExecution) {
    throw new ApiError(404, `Execution not found: ${executionId}`);
  }

  // 2. Load the workflow to get nodes and edges
  const workflow = await getWorkflow(existingExecution.workflowId);
  if (!workflow) {
    throw new ApiError(404, `Workflow not found: ${existingExecution.workflowId}`);
  }

  // 3. Get nodes and edges from workflow
  const nodes = (workflow.nodes || []) as WorkflowNode[];
  const edges = (workflow.edges || []) as WorkflowEdge[];

  // 4. Find the target node in the workflow
  const targetNode = nodes.find(n => n.id === nodeId);
  if (!targetNode) {
    throw new ApiError(404, `Node not found in workflow: ${nodeId}`);
  }

  // 5. Get the node's input data from the previous execution
  // First, get all node executions from the original execution
  const nodeExecutions = await listNodeExecutions(executionId, 1, 1000);

  // Find the input data for the target node
  // Look for output from nodes that connect to this node
  let inputDataForNode: Record<string, unknown> = {};

  // If testData is provided, use it; otherwise try to get from previous execution
  if (testData) {
    inputDataForNode = testData;
  } else {
    // Find predecessor nodes
    const predecessorEdges = edges.filter(e => e.target === nodeId);

    for (const edge of predecessorEdges) {
      const sourceNodeId = edge.source;
      // Find the execution result for this predecessor node
      const predecessorExecution = nodeExecutions.nodes?.find(
        (ne: { nodeId: string }) => ne.nodeId === sourceNodeId
      );

      if (predecessorExecution) {
        // If we have output from predecessor, use it as input
        const predOutput = (predecessorExecution as { output?: unknown }).output;
        if (predOutput && typeof predOutput === 'object') {
          inputDataForNode = { ...inputDataForNode, ...(predOutput as Record<string, unknown>) };
        }
      }
    }

    // Also include the original execution input if available
    if (existingExecution.input && typeof existingExecution.input === 'object') {
      inputDataForNode = { ...inputDataForNode, ...(existingExecution.input as Record<string, unknown>) };
    }
  }

  // 6. Create a new execution record
  const newExecution = await createExecution(
    workflow.id,
    {
      retryFrom: {
        originalExecutionId: executionId,
        startNodeId: nodeId,
      },
      inputData: inputDataForNode,
    }
  );

  if (!newExecution) {
    throw new ApiError(500, 'Failed to create new execution');
  }

  // 7. Create partial executor and start execution
  const partialExecutor = createPartialExecutor(nodes, edges);

  // Update execution status to running
  await updateExecution(newExecution.id, {
    status: 'running',
    startedAt: new Date().toISOString(),
  });

  logger.info('Starting partial execution retry', {
    originalExecutionId: executionId,
    newExecutionId: newExecution.id,
    startNodeId: nodeId,
    workflowId: workflow.id,
    userId: authReq.user?.id,
  });

  // 8. Execute asynchronously (don't await - let it run in background)
  partialExecutor.executeFromNode(
    {
      startNodeId: nodeId,
      testData: inputDataForNode,
      stopAtNodeId,
      maxExecutionTime: maxExecutionTime || 300000, // Default 5 minutes
      validateBeforeExecution: true,
    },
    // onNodeStart callback
    (startedNodeId: string) => {
      logger.debug(`Node started: ${startedNodeId}`, { executionId: newExecution.id });
    },
    // onNodeComplete callback
    (completedNodeId: string, result: unknown) => {
      logger.debug(`Node completed: ${completedNodeId}`, { executionId: newExecution.id, result });
    },
    // onNodeError callback
    (errorNodeId: string, error: Error) => {
      logger.error(`Node failed: ${errorNodeId}`, { executionId: newExecution.id, error: error.message });
    }
  ).then(async (result) => {
    // Update execution with final result
    await updateExecution(newExecution.id, {
      status: result.success ? 'success' : 'failure',
      finishedAt: new Date().toISOString(),
      durationMs: result.executionTimeMs,
      output: {
        results: Object.fromEntries(result.results),
        executionPath: result.executionPath,
        nodesExecuted: result.nodesExecuted,
      },
      error: result.errors.length > 0
        ? result.errors.map(e => `${e.nodeId}: ${e.error}`).join('; ')
        : undefined,
    });

    logger.info('Partial execution completed', {
      executionId: newExecution.id,
      success: result.success,
      nodesExecuted: result.nodesExecuted,
      duration: result.executionTimeMs,
    });
  }).catch(async (error) => {
    await updateExecution(newExecution.id, {
      status: 'failure',
      finishedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });

    logger.error('Partial execution failed', {
      executionId: newExecution.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  // 9. Return immediately with the new execution ID
  res.status(202).json({
    success: true,
    newExecutionId: newExecution.id,
    originalExecutionId: executionId,
    startNodeId: nodeId,
    workflowId: workflow.id,
    message: `Execution started from node ${nodeId}`,
    links: {
      execution: `/api/executions/${newExecution.id}`,
      stream: `/api/executions/${newExecution.id}/stream`,
      nodes: `/api/executions/${newExecution.id}/nodes`,
    },
  });
}));

// ================================
// REPLAY EXECUTION ENDPOINT
// ================================

/**
 * POST /api/executions/:id/replay
 * Replay an execution from a specific node or from the beginning
 *
 * Request body:
 * {
 *   "fromNodeId": "optional - node ID to start replay from",
 *   "modifiedInputData": { ... } - optional modified input data
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "executionId": "new execution ID",
 *   "message": "Replaying from node X" | "Replaying entire workflow"
 * }
 */
executionRouter.post('/:id/replay', authHandler, validateParams(replayExecutionParamsSchema), validateBody(replayExecutionSchema), asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;
  const { fromNodeId, modifiedInputData } = req.body;

  try {
    // Get the original execution
    const originalExecution = await prisma.workflowExecution.findUnique({
      where: { id },
      include: { workflow: true }
    });

    if (!originalExecution) {
      throw new ApiError(404, 'Execution not found');
    }

    // Verify user has access (must be the owner or have appropriate permissions)
    if (originalExecution.userId && authReq.user?.id && originalExecution.userId !== authReq.user.id) {
      // In a full implementation, we'd check RBAC permissions here
      // For now, we'll allow if user is authenticated
      logger.warn('User replaying execution they do not own', {
        userId: authReq.user.id,
        executionOwnerId: originalExecution.userId,
        executionId: id
      });
    }

    // If fromNodeId is provided, validate it exists in the workflow
    if (fromNodeId) {
      const workflowNodes = originalExecution.workflow.nodes as unknown as WorkflowNode[];
      const targetNode = workflowNodes?.find((n: WorkflowNode) => n.id === fromNodeId);
      if (!targetNode) {
        throw new ApiError(400, `Node ${fromNodeId} not found in workflow`);
      }
    }

    // Prepare input data - use modified data if provided, otherwise use original
    const inputData = modifiedInputData || (originalExecution.input as Record<string, unknown>) || {};

    // Create a new execution for the replay
    const replayExecution = await prisma.workflowExecution.create({
      data: {
        workflowId: originalExecution.workflowId,
        userId: authReq.user?.id || originalExecution.userId,
        status: 'PENDING',
        trigger: { type: 'replay', originalExecutionId: id },
        input: inputData,
        metadata: {
          replayOf: id,
          fromNodeId: fromNodeId || null,
          originalExecutionId: id,
          replayedAt: new Date().toISOString(),
          replayedBy: authReq.user?.id
        }
      }
    });

    // Queue the replay execution
    await queueManager.addJob('workflow-execution', 'replay', {
      executionId: replayExecution.id,
      workflowId: originalExecution.workflowId,
      inputData: inputData,
      metadata: {
        isReplay: true,
        originalExecutionId: id,
        replayFromNode: fromNodeId || null,
        originalNodeResults: fromNodeId ? (originalExecution.output as Record<string, unknown>) : null,
      }
    } as any);

    logger.info('Execution replay queued', {
      originalExecutionId: id,
      newExecutionId: replayExecution.id,
      fromNodeId: fromNodeId || 'beginning',
      userId: authReq.user?.id
    });

    res.status(202).json({
      success: true,
      executionId: replayExecution.id,
      originalExecutionId: id,
      workflowId: originalExecution.workflowId,
      message: fromNodeId
        ? `Replaying from node ${fromNodeId}`
        : 'Replaying entire workflow',
      links: {
        execution: `/api/executions/${replayExecution.id}`,
        status: `/api/queue/status/${replayExecution.id}`,
        stream: `/api/executions/${replayExecution.id}/stream`
      }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Replay failed', {
      executionId: id,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new ApiError(500, 'Failed to replay execution');
  }
}));

export default executionRouter;

// Server-Sent Events stream of execution events/logs
executionRouter.get('/:id/stream', validateParams(executionIdSchema), asyncHandler(async (req, res) => {
  const exec = await getExecution(req.params.id);
  if (!exec) throw new ApiError(404, 'Execution not found');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial state
  send('execution', exec);

  const unsub = onBroadcast((evt) => {
    const { type, payload } = evt;
    // Filter only this execution id
    if (typeof payload !== 'object' || !payload) return;
    const payloadObj = payload as { id?: string; execId?: string };
    const eid = payloadObj.id || payloadObj.execId;
    if (eid !== req.params.id) return;
    send(type, payload);
  });

  req.on('close', () => {
    unsub();
    res.end();
  });
}));

// List node executions for an execution
executionRouter.get('/:id/nodes', validateParams(executionIdSchema), validateQuery(paginationSchema), asyncHandler(async (req, res) => {
  const exec = await getExecution(req.params.id);
  if (!exec) throw new ApiError(404, 'Execution not found');
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 50);
  const result = await listNodeExecutions(exec.id, page, limit);
  res.json(result);
}));

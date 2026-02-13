/**
 * Error Workflow API Routes
 * Endpoints for error handling and retry management
 */

import express from 'express';
import { getErrorWorkflowService } from '../../error/ErrorWorkflowService';
import {
  CreateErrorWorkflowRequest,
  UpdateErrorWorkflowRequest,
  ErrorQueryFilter,
  RetryExecutionRequest,
} from '../../error/ErrorWorkflowTypes';
import { logger } from '../../services/LogService';

const router = express.Router();

/**
 * Query errors
 * GET /api/error-workflows/errors
 */
router.get('/errors', async (req, res) => {
  try {
    const service = getErrorWorkflowService();

    const filter: ErrorQueryFilter = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      errorTypes: req.query.errorTypes ? (req.query.errorTypes as string).split(',') : undefined,
      severities: req.query.severities ? (req.query.severities as string).split(',') : undefined,
      workflowIds: req.query.workflowIds ? (req.query.workflowIds as string).split(',') : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await service.queryErrors(filter);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Failed to query errors', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to query errors',
    });
  }
});

/**
 * Get error by ID
 * GET /api/error-workflows/errors/:id
 */
router.get('/errors/:id', async (req, res) => {
  try {
    const service = getErrorWorkflowService();
    const { id } = req.params;

    const error = await service.getError(id);

    if (!error) {
      return res.status(404).json({
        success: false,
        error: 'Error not found',
      });
    }

    res.json({
      success: true,
      error,
    });
  } catch (error) {
    logger.error('Failed to get error', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get error',
    });
  }
});

/**
 * Get error statistics
 * GET /api/error-workflows/statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const service = getErrorWorkflowService();

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const statistics = await service.getStatistics(startDate, endDate);

    res.json({
      success: true,
      statistics,
    });
  } catch (error) {
    logger.error('Failed to get error statistics', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
    });
  }
});

/**
 * Get dashboard metrics
 * GET /api/error-workflows/dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    const service = getErrorWorkflowService();
    const metrics = await service.getDashboardMetrics();

    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    logger.error('Failed to get dashboard metrics', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard metrics',
    });
  }
});

/**
 * List error workflows
 * GET /api/error-workflows
 */
router.get('/', async (req, res) => {
  try {
    const service = getErrorWorkflowService();
    const workflows = await service.listErrorWorkflows();

    res.json({
      success: true,
      workflows,
      total: workflows.length,
    });
  } catch (error) {
    logger.error('Failed to list error workflows', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to list error workflows',
    });
  }
});

/**
 * Create error workflow
 * POST /api/error-workflows
 */
router.post('/', async (req, res) => {
  try {
    const service = getErrorWorkflowService();
    const userId = req.headers['x-user-id'] as string || 'system';

    const request: CreateErrorWorkflowRequest = {
      name: req.body.name,
      description: req.body.description,
      triggerConditions: req.body.triggerConditions,
      workflowId: req.body.workflowId,
      priority: req.body.priority,
    };

    if (!request.name || !request.workflowId || !request.triggerConditions) {
      return res.status(400).json({
        success: false,
        error: 'name, workflowId, and triggerConditions are required',
      });
    }

    const workflow = await service.createErrorWorkflow(request, userId);

    res.status(201).json({
      success: true,
      workflow,
    });
  } catch (error) {
    logger.error('Failed to create error workflow', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create error workflow',
    });
  }
});

/**
 * Update error workflow
 * PUT /api/error-workflows/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const service = getErrorWorkflowService();
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string || 'system';

    const request: UpdateErrorWorkflowRequest = {
      name: req.body.name,
      description: req.body.description,
      triggerConditions: req.body.triggerConditions,
      workflowId: req.body.workflowId,
      enabled: req.body.enabled,
      priority: req.body.priority,
    };

    const workflow = await service.updateErrorWorkflow(id, request, userId);

    res.json({
      success: true,
      workflow,
    });
  } catch (error) {
    logger.error('Failed to update error workflow', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update error workflow',
    });
  }
});

/**
 * Delete error workflow
 * DELETE /api/error-workflows/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const service = getErrorWorkflowService();
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string || 'system';

    await service.deleteErrorWorkflow(id, userId);

    res.json({
      success: true,
      message: 'Error workflow deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete error workflow', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete error workflow',
    });
  }
});

/**
 * Retry execution
 * POST /api/error-workflows/errors/:id/retry
 */
router.post('/errors/:id/retry', async (req, res) => {
  try {
    const service = getErrorWorkflowService();
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string || 'system';

    const request: RetryExecutionRequest = {
      errorId: id,
      strategy: req.body.strategy,
      forceRetry: req.body.forceRetry,
      customInput: req.body.customInput,
    };

    const recovery = await service.retryExecution(request, userId);

    res.status(202).json({
      success: true,
      recovery,
      message: 'Retry initiated',
    });
  } catch (error) {
    logger.error('Failed to retry execution', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retry execution',
    });
  }
});

export default router;

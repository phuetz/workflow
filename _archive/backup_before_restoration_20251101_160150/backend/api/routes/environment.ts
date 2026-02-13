/**
 * Environment Management API Routes
 * Endpoints for managing dev/staging/prod environments
 */

import express from 'express';
import { getEnvironmentService } from '../../environment/EnvironmentService';
import {
  EnvironmentType,
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
  PromoteWorkflowRequest,
  EnvironmentSyncRequest,
} from '../../environment/EnvironmentTypes';
import { logger } from '../../services/LogService';

const router = express.Router();

/**
 * List all environments
 * GET /api/environments
 */
router.get('/', async (req, res) => {
  try {
    const envService = getEnvironmentService();

    const filter: {
      type?: EnvironmentType;
      isActive?: boolean;
    } = {};

    if (req.query.type) {
      filter.type = req.query.type as EnvironmentType;
    }

    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const environments = await envService.listEnvironments(filter);

    res.json({
      success: true,
      environments,
      total: environments.length,
    });
  } catch (error) {
    logger.error('Failed to list environments', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to list environments',
    });
  }
});

/**
 * Get environment by ID
 * GET /api/environments/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const envService = getEnvironmentService();
    const { id } = req.params;

    const environment = await envService.getEnvironment(id);

    if (!environment) {
      return res.status(404).json({
        success: false,
        error: 'Environment not found',
      });
    }

    res.json({
      success: true,
      environment,
    });
  } catch (error) {
    logger.error('Failed to get environment', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get environment',
    });
  }
});

/**
 * Create new environment
 * POST /api/environments
 */
router.post('/', async (req, res) => {
  try {
    const envService = getEnvironmentService();
    const userId = req.headers['x-user-id'] as string || 'system';

    const request: CreateEnvironmentRequest = {
      name: req.body.name,
      type: req.body.type as EnvironmentType,
      description: req.body.description,
      config: req.body.config,
    };

    if (!request.name || !request.type) {
      return res.status(400).json({
        success: false,
        error: 'Name and type are required',
      });
    }

    const environment = await envService.createEnvironment(request, userId);

    res.status(201).json({
      success: true,
      environment,
    });
  } catch (error) {
    logger.error('Failed to create environment', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create environment',
    });
  }
});

/**
 * Update environment
 * PUT /api/environments/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const envService = getEnvironmentService();
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string || 'system';

    const request: UpdateEnvironmentRequest = {
      name: req.body.name,
      description: req.body.description,
      isActive: req.body.isActive,
      config: req.body.config,
    };

    const environment = await envService.updateEnvironment(id, request, userId);

    res.json({
      success: true,
      environment,
    });
  } catch (error) {
    logger.error('Failed to update environment', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update environment',
    });
  }
});

/**
 * Delete environment
 * DELETE /api/environments/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const envService = getEnvironmentService();
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string || 'system';

    await envService.deleteEnvironment(id, userId);

    res.json({
      success: true,
      message: 'Environment deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete environment', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete environment',
    });
  }
});

/**
 * Get environment variables
 * GET /api/environments/:id/variables
 */
router.get('/:id/variables', async (req, res) => {
  try {
    const envService = getEnvironmentService();
    const { id } = req.params;

    const variables = await envService.getEnvironmentVariables(id);

    // Hide secret values in response
    const sanitizedVariables = variables.map((v) => ({
      ...v,
      value: v.isSecret ? '***' : v.value,
    }));

    res.json({
      success: true,
      variables: sanitizedVariables,
      total: sanitizedVariables.length,
    });
  } catch (error) {
    logger.error('Failed to get environment variables', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get environment variables',
    });
  }
});

/**
 * Set environment variable
 * POST /api/environments/:id/variables
 */
router.post('/:id/variables', async (req, res) => {
  try {
    const envService = getEnvironmentService();
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string || 'system';

    const { key, value, description, isSecret } = req.body;

    if (!key || !value) {
      return res.status(400).json({
        success: false,
        error: 'Key and value are required',
      });
    }

    const variable = await envService.setEnvironmentVariable(
      id,
      key,
      value,
      { description, isSecret },
      userId
    );

    res.status(201).json({
      success: true,
      variable: {
        ...variable,
        value: variable.isSecret ? '***' : variable.value,
      },
    });
  } catch (error) {
    logger.error('Failed to set environment variable', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set environment variable',
    });
  }
});

/**
 * Get workflows in environment
 * GET /api/environments/:id/workflows
 */
router.get('/:id/workflows', async (req, res) => {
  try {
    const envService = getEnvironmentService();
    const { id } = req.params;

    const workflows = await envService.getEnvironmentWorkflows(id);

    res.json({
      success: true,
      workflows,
      total: workflows.length,
    });
  } catch (error) {
    logger.error('Failed to get environment workflows', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get environment workflows',
    });
  }
});

/**
 * Promote workflow between environments
 * POST /api/environments/promote
 */
router.post('/promote', async (req, res) => {
  try {
    const envService = getEnvironmentService();
    const userId = req.headers['x-user-id'] as string || 'system';

    const request: PromoteWorkflowRequest = {
      workflowId: req.body.workflowId,
      sourceEnvId: req.body.sourceEnvId,
      targetEnvId: req.body.targetEnvId,
      credentialMappings: req.body.credentialMappings,
      variableMappings: req.body.variableMappings,
      validateOnly: req.body.validateOnly,
    };

    if (!request.workflowId || !request.sourceEnvId || !request.targetEnvId) {
      return res.status(400).json({
        success: false,
        error: 'workflowId, sourceEnvId, and targetEnvId are required',
      });
    }

    const result = await envService.promoteWorkflow(request, userId);

    res.status(request.validateOnly ? 200 : 201).json(result);
  } catch (error) {
    logger.error('Failed to promote workflow', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to promote workflow',
    });
  }
});

/**
 * Get promotion history
 * GET /api/environments/promotions
 */
router.get('/promotions/history', async (req, res) => {
  try {
    const envService = getEnvironmentService();
    const workflowId = req.query.workflowId as string | undefined;

    const promotions = await envService.getPromotionHistory(workflowId);

    res.json({
      success: true,
      promotions,
      total: promotions.length,
    });
  } catch (error) {
    logger.error('Failed to get promotion history', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get promotion history',
    });
  }
});

/**
 * Rollback workflow promotion
 * POST /api/environments/promotions/:id/rollback
 */
router.post('/promotions/:id/rollback', async (req, res) => {
  try {
    const envService = getEnvironmentService();
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string || 'system';

    await envService.rollbackPromotion(id, userId);

    res.json({
      success: true,
      message: 'Promotion rolled back successfully',
    });
  } catch (error) {
    logger.error('Failed to rollback promotion', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rollback promotion',
    });
  }
});

/**
 * Compare environments
 * POST /api/environments/compare
 */
router.post('/compare', async (req, res) => {
  try {
    const envService = getEnvironmentService();
    const { sourceEnvId, targetEnvId } = req.body;

    if (!sourceEnvId || !targetEnvId) {
      return res.status(400).json({
        success: false,
        error: 'sourceEnvId and targetEnvId are required',
      });
    }

    const comparison = await envService.compareEnvironments(sourceEnvId, targetEnvId);

    res.json({
      success: true,
      comparison,
    });
  } catch (error) {
    logger.error('Failed to compare environments', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compare environments',
    });
  }
});

/**
 * Sync environments
 * POST /api/environments/sync
 */
router.post('/sync', async (req, res) => {
  try {
    const envService = getEnvironmentService();
    const userId = req.headers['x-user-id'] as string || 'system';

    const request: EnvironmentSyncRequest = {
      sourceEnvId: req.body.sourceEnvId,
      targetEnvId: req.body.targetEnvId,
      syncWorkflows: req.body.syncWorkflows,
      syncCredentials: req.body.syncCredentials,
      syncVariables: req.body.syncVariables,
      dryRun: req.body.dryRun,
    };

    if (!request.sourceEnvId || !request.targetEnvId) {
      return res.status(400).json({
        success: false,
        error: 'sourceEnvId and targetEnvId are required',
      });
    }

    const result = await envService.syncEnvironments(request, userId);

    res.json(result);
  } catch (error) {
    logger.error('Failed to sync environments', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync environments',
    });
  }
});

/**
 * Get active environment
 * GET /api/environments/active
 */
router.get('/active/current', async (req, res) => {
  try {
    const envService = getEnvironmentService();
    const environment = await envService.getActiveEnvironment();

    res.json({
      success: true,
      environment,
    });
  } catch (error) {
    logger.error('Failed to get active environment', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get active environment',
    });
  }
});

export default router;

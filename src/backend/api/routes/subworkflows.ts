/**
 * Sub-workflows API Routes
 * Handles CRUD operations, execution, and management of sub-workflows
 */

import express, { Response, RequestHandler } from 'express';
import { SubWorkflowService } from '../../../services/SubWorkflowService';
import type {
  SubWorkflow,
  SubWorkflowFilters,
  ExecutionContext,
  SubWorkflowTest
} from '../../../types/subworkflows';
import { authHandler, AuthRequest } from '../middleware/auth';
import {
  validateBody,
  validateParams,
  createSubworkflowBodySchema,
  subworkflowIdParamsSchema,
} from '../middleware/validation';

const router = express.Router();
const subWorkflowService = SubWorkflowService.getInstance();

// Type-safe wrapper for authenticated route handlers
const asyncHandler = (fn: (req: AuthRequest, res: Response) => Promise<unknown>): RequestHandler => {
  return (req, res, next) => {
    fn(req as AuthRequest, res).catch(next);
  };
};

// Apply authentication to all routes
router.use(authHandler);

/**
 * GET /api/subworkflows
 * List all sub-workflows with optional filtering
 */
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const filters: SubWorkflowFilters = {
      search: req.query.search as string,
      category: req.query.category as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      isPublished: req.query.isPublished === 'true' ? true : req.query.isPublished === 'false' ? false : undefined,
      isTemplate: req.query.isTemplate === 'true' ? true : req.query.isTemplate === 'false' ? false : undefined,
      createdBy: req.query.createdBy as string,
      parentWorkflowId: req.query.parentWorkflowId as string
    };

    const subWorkflows = await subWorkflowService.listSubWorkflows(filters);

    res.json({
      success: true,
      data: subWorkflows,
      count: subWorkflows.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list sub-workflows'
    });
  }
}));

/**
 * GET /api/subworkflows/:id
 * Get a specific sub-workflow by ID
 */
router.get('/:id', validateParams(subworkflowIdParamsSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const version = req.query.version as string | undefined;

    const subWorkflow = await subWorkflowService.getSubWorkflow(id, version);

    if (!subWorkflow) {
      return res.status(404).json({
        success: false,
        error: 'Sub-workflow not found'
      });
    }

    res.json({
      success: true,
      data: subWorkflow
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sub-workflow'
    });
  }
}));

/**
 * POST /api/subworkflows
 * Create a new sub-workflow
 */
router.post('/', validateBody(createSubworkflowBodySchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const data: Omit<SubWorkflow, 'id' | 'createdAt' | 'updatedAt'> = req.body;

    // Validate required fields
    if (!data.name || !data.version) {
      return res.status(400).json({
        success: false,
        error: 'Name and version are required'
      });
    }

    const subWorkflow = await subWorkflowService.createSubWorkflow(data);

    res.status(201).json({
      success: true,
      data: subWorkflow
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create sub-workflow'
    });
  }
}));

/**
 * PUT /api/subworkflows/:id
 * Update an existing sub-workflow
 */
router.put('/:id', validateParams(subworkflowIdParamsSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates: Partial<SubWorkflow> = req.body;

    await subWorkflowService.updateSubWorkflow(id, updates);

    const updated = await subWorkflowService.getSubWorkflow(id);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update sub-workflow'
    });
  }
}));

/**
 * DELETE /api/subworkflows/:id
 * Delete a sub-workflow
 */
router.delete('/:id', validateParams(subworkflowIdParamsSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await subWorkflowService.deleteSubWorkflow(id);

    res.json({
      success: true,
      message: 'Sub-workflow deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete sub-workflow'
    });
  }
}));

/**
 * POST /api/subworkflows/:id/execute
 * Execute a sub-workflow with given inputs
 */
router.post('/:id/execute', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { inputs, context } = req.body as {
      inputs: Record<string, unknown>;
      context?: Partial<ExecutionContext>;
    };

    const executionContext: ExecutionContext = {
      variables: context?.variables || [],
      environment: context?.environment || 'default',
      user: context?.user || 'anonymous',
      parentExecutionId: context?.parentExecutionId,
      priority: context?.priority,
      timeout: context?.timeout
    };

    const execution = await subWorkflowService.executeSubWorkflow(
      id,
      inputs || {},
      executionContext
    );

    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute sub-workflow'
    });
  }
}));

/**
 * GET /api/subworkflows/:id/executions/:executionId
 * Get execution details
 */
router.get('/:id/executions/:executionId', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { executionId } = req.params;

    const execution = await subWorkflowService.getExecution(executionId);

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found'
      });
    }

    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get execution'
    });
  }
}));

/**
 * POST /api/subworkflows/:id/executions/:executionId/cancel
 * Cancel a running execution
 */
router.post('/:id/executions/:executionId/cancel', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { executionId } = req.params;

    await subWorkflowService.cancelExecution(executionId);

    res.json({
      success: true,
      message: 'Execution cancelled successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel execution'
    });
  }
}));

/**
 * GET /api/subworkflows/:id/versions
 * List all versions of a sub-workflow
 */
router.get('/:id/versions', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const versions = await subWorkflowService.listVersions(id);

    res.json({
      success: true,
      data: versions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list versions'
    });
  }
}));

/**
 * POST /api/subworkflows/:id/versions
 * Create a new version of a sub-workflow
 */
router.post('/:id/versions', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { changelog } = req.body;

    if (!changelog) {
      return res.status(400).json({
        success: false,
        error: 'Changelog is required'
      });
    }

    const version = await subWorkflowService.createVersion(id, changelog);

    res.status(201).json({
      success: true,
      data: version
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create version'
    });
  }
}));

/**
 * POST /api/subworkflows/:id/versions/:version/promote
 * Promote a specific version to be the active version
 */
router.post('/:id/versions/:version/promote', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { id, version } = req.params;

    await subWorkflowService.promoteVersion(id, version);

    res.json({
      success: true,
      message: 'Version promoted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to promote version'
    });
  }
}));

/**
 * POST /api/subworkflows/:id/publish
 * Publish a sub-workflow to the library
 */
router.post('/:id/publish', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { libraryId = 'default' } = req.body;

    await subWorkflowService.publishToLibrary(id, libraryId);

    res.json({
      success: true,
      message: 'Sub-workflow published successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to publish sub-workflow'
    });
  }
}));

/**
 * POST /api/subworkflows/:id/validate
 * Validate a sub-workflow structure
 */
router.post('/:id/validate', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const subWorkflow = await subWorkflowService.getSubWorkflow(id);
    if (!subWorkflow) {
      return res.status(404).json({
        success: false,
        error: 'Sub-workflow not found'
      });
    }

    const validation = await subWorkflowService.validateSubWorkflow(subWorkflow);

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate sub-workflow'
    });
  }
}));

/**
 * POST /api/subworkflows/:id/validate-inputs
 * Validate inputs for a sub-workflow
 */
router.post('/:id/validate-inputs', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { inputs } = req.body;

    const validation = await subWorkflowService.validateInputs(id, inputs || {});

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate inputs'
    });
  }
}));

/**
 * GET /api/subworkflows/:id/performance
 * Get performance metrics for a sub-workflow
 */
router.get('/:id/performance', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const performance = await subWorkflowService.getPerformanceMetrics(id);

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get performance metrics'
    });
  }
}));

/**
 * GET /api/subworkflows/:id/references
 * Find all workflows that use this sub-workflow
 */
router.get('/:id/references', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const references = await subWorkflowService.findReferences(id);

    res.json({
      success: true,
      data: references
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to find references'
    });
  }
}));

/**
 * GET /api/subworkflows/:id/dependencies
 * Check dependencies and detect circular dependencies
 */
router.get('/:id/dependencies', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const dependencyCheck = await subWorkflowService.checkDependencies(id);

    res.json({
      success: true,
      data: dependencyCheck
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check dependencies'
    });
  }
}));

/**
 * POST /api/subworkflows/:id/tests
 * Create a test for a sub-workflow
 */
router.post('/:id/tests', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const testData: Omit<SubWorkflowTest, 'id'> = {
      ...req.body,
      subWorkflowId: id
    };

    const test = await subWorkflowService.createTest(testData);

    res.status(201).json({
      success: true,
      data: test
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create test'
    });
  }
}));

/**
 * POST /api/subworkflows/:id/tests/:testId/run
 * Run a test
 */
router.post('/:id/tests/:testId/run', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;

    const result = await subWorkflowService.runTest(testId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run test'
    });
  }
}));

/**
 * GET /api/subworkflows/:id/tests/:testId/results
 * Get test results
 */
router.get('/:id/tests/:testId/results', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;

    const results = await subWorkflowService.getTestResults(testId);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get test results'
    });
  }
}));

/**
 * GET /api/subworkflows/library/search
 * Search the sub-workflow library
 */
router.get('/library/search', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q as string || '';
    const filters = {
      organization: req.query.organization as string,
      isPublic: req.query.isPublic === 'true' ? true : req.query.isPublic === 'false' ? false : undefined,
      minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
      category: req.query.category as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined
    };

    const results = await subWorkflowService.searchLibrary(query, filters);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search library'
    });
  }
}));

/**
 * POST /api/subworkflows/library/:id/import
 * Import a sub-workflow from the library
 */
router.post('/library/:id/import', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const imported = await subWorkflowService.importFromLibrary(id);

    res.json({
      success: true,
      data: imported
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import sub-workflow'
    });
  }
}));

export default router;

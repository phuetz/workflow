/**
 * Git Integration API Routes
 * Version control endpoints for workflows
 */

import express from 'express';
import { getGitService } from '../../git/GitService';
import {
  CloneRequest,
  CommitRequest,
  PushRequest,
  PullRequest,
  BranchRequest,
  CheckoutRequest,
  WorkflowExportRequest,
  WorkflowImportRequest,
} from '../../git/GitTypes';
import { logger } from '../../services/LogService';
import { authHandler, AuthRequest } from '../middleware/auth';
import {
  validateBody,
  validateParams,
  validateQuery,
  gitCommitBodySchema,
  gitBranchBodySchema,
  gitMergeBodySchema,
  simpleIdParamsSchema,
} from '../middleware/validation';

const router = express.Router();

// Apply authentication to all routes
router.use(authHandler);

/**
 * List all repositories
 * GET /api/git/repositories
 */
router.get('/repositories', async (req, res) => {
  try {
    const gitService = getGitService();
    const repositories = await gitService.getRepositories();

    res.json({
      success: true,
      repositories,
      total: repositories.length,
    });
  } catch (error) {
    logger.error('Failed to list repositories', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to list repositories',
    });
  }
});

/**
 * Get repository by ID
 * GET /api/git/repositories/:id
 */
router.get('/repositories/:id', async (req, res) => {
  try {
    const gitService = getGitService();
    const { id } = req.params;

    const repository = await gitService.getRepository(id);

    if (!repository) {
      return res.status(404).json({
        success: false,
        error: 'Repository not found',
      });
    }

    res.json({
      success: true,
      repository,
    });
  } catch (error) {
    logger.error('Failed to get repository', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get repository',
    });
  }
});

/**
 * Clone a repository
 * POST /api/git/repositories/clone
 */
router.post('/repositories/clone', async (req, res) => {
  try {
    const gitService = getGitService();
    const authReq = req as AuthRequest;
    if (!authReq.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    const userId = authReq.user.id;

    const request: CloneRequest = {
      remoteUrl: req.body.remoteUrl,
      name: req.body.name,
      description: req.body.description,
      branch: req.body.branch,
      credentials: req.body.credentials,
    };

    if (!request.remoteUrl || !request.name) {
      return res.status(400).json({
        success: false,
        error: 'remoteUrl and name are required',
      });
    }

    const repository = await gitService.cloneRepository(request, userId);

    res.status(201).json({
      success: true,
      repository,
    });
  } catch (error) {
    logger.error('Failed to clone repository', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clone repository',
    });
  }
});

/**
 * Get repository status
 * GET /api/git/repositories/:id/status
 */
router.get('/repositories/:id/status', async (req, res) => {
  try {
    const gitService = getGitService();
    const { id } = req.params;

    const status = await gitService.getStatus(id);

    res.json({
      success: true,
      status,
    });
  } catch (error) {
    logger.error('Failed to get repository status', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get repository status',
    });
  }
});

/**
 * Commit changes
 * POST /api/git/repositories/:id/commit
 */
router.post('/repositories/:id/commit', validateParams(simpleIdParamsSchema), validateBody(gitCommitBodySchema), async (req, res) => {
  try {
    const gitService = getGitService();
    const { id } = req.params;
    const authReq = req as AuthRequest;
    if (!authReq.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    const userId = authReq.user.id;

    const request: CommitRequest = {
      repositoryId: id,
      message: req.body.message,
      author: req.body.author,
      files: req.body.files,
      branch: req.body.branch,
    };

    if (!request.message) {
      return res.status(400).json({
        success: false,
        error: 'Commit message is required',
      });
    }

    const commit = await gitService.commit(request, userId);

    res.status(201).json({
      success: true,
      commit,
    });
  } catch (error) {
    logger.error('Failed to commit changes', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to commit changes',
    });
  }
});

/**
 * Push changes
 * POST /api/git/repositories/:id/push
 */
router.post('/repositories/:id/push', validateParams(simpleIdParamsSchema), async (req, res) => {
  try {
    const gitService = getGitService();
    const { id } = req.params;
    const authReq = req as AuthRequest;
    if (!authReq.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    const userId = authReq.user.id;

    const request: PushRequest = {
      repositoryId: id,
      branch: req.body.branch,
      remote: req.body.remote,
      force: req.body.force,
    };

    await gitService.push(request, userId);

    res.json({
      success: true,
      message: 'Changes pushed successfully',
    });
  } catch (error) {
    logger.error('Failed to push changes', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to push changes',
    });
  }
});

/**
 * Pull changes
 * POST /api/git/repositories/:id/pull
 */
router.post('/repositories/:id/pull', validateParams(simpleIdParamsSchema), async (req, res) => {
  try {
    const gitService = getGitService();
    const { id } = req.params;
    const authReq = req as AuthRequest;
    if (!authReq.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    const userId = authReq.user.id;

    const request: PullRequest = {
      repositoryId: id,
      branch: req.body.branch,
      remote: req.body.remote,
      rebase: req.body.rebase,
    };

    await gitService.pull(request, userId);

    res.json({
      success: true,
      message: 'Changes pulled successfully',
    });
  } catch (error) {
    logger.error('Failed to pull changes', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to pull changes',
    });
  }
});

/**
 * List branches
 * GET /api/git/repositories/:id/branches
 */
router.get('/repositories/:id/branches', async (req, res) => {
  try {
    const gitService = getGitService();
    const { id } = req.params;

    const branches = await gitService.listBranches(id);

    res.json({
      success: true,
      branches,
      total: branches.length,
    });
  } catch (error) {
    logger.error('Failed to list branches', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to list branches',
    });
  }
});

/**
 * Create branch
 * POST /api/git/repositories/:id/branches
 */
router.post('/repositories/:id/branches', validateParams(simpleIdParamsSchema), validateBody(gitBranchBodySchema), async (req, res) => {
  try {
    const gitService = getGitService();
    const { id } = req.params;
    const authReq = req as AuthRequest;
    if (!authReq.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    const userId = authReq.user.id;

    const request: BranchRequest = {
      repositoryId: id,
      branchName: req.body.branchName,
      from: req.body.from,
      checkout: req.body.checkout,
    };

    if (!request.branchName) {
      return res.status(400).json({
        success: false,
        error: 'branchName is required',
      });
    }

    const branch = await gitService.createBranch(request, userId);

    res.status(201).json({
      success: true,
      branch,
    });
  } catch (error) {
    logger.error('Failed to create branch', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create branch',
    });
  }
});

/**
 * Checkout branch
 * POST /api/git/repositories/:id/checkout
 */
router.post('/repositories/:id/checkout', async (req, res) => {
  try {
    const gitService = getGitService();
    const { id } = req.params;
    const authReq = req as AuthRequest;
    if (!authReq.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    const userId = authReq.user.id;

    const request: CheckoutRequest = {
      repositoryId: id,
      branch: req.body.branch,
      createIfNotExists: req.body.createIfNotExists,
    };

    if (!request.branch) {
      return res.status(400).json({
        success: false,
        error: 'branch is required',
      });
    }

    await gitService.checkout(request, userId);

    res.json({
      success: true,
      message: `Checked out branch ${request.branch}`,
    });
  } catch (error) {
    logger.error('Failed to checkout branch', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to checkout branch',
    });
  }
});

/**
 * Get commit history
 * GET /api/git/repositories/:id/history
 */
router.get('/repositories/:id/history', async (req, res) => {
  try {
    const gitService = getGitService();
    const { id } = req.params;

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const branch = req.query.branch as string | undefined;

    const history = await gitService.getHistory(id, limit, branch);

    res.json({
      success: true,
      ...history,
    });
  } catch (error) {
    logger.error('Failed to get commit history', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get commit history',
    });
  }
});

/**
 * Export workflow to Git
 * POST /api/git/workflows/export
 */
router.post('/workflows/export', async (req, res) => {
  try {
    const gitService = getGitService();
    const authReq = req as AuthRequest;
    if (!authReq.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    const userId = authReq.user.id;

    const request: WorkflowExportRequest = {
      workflowId: req.body.workflowId,
      repositoryId: req.body.repositoryId,
      branch: req.body.branch,
      filePath: req.body.filePath,
      commit: req.body.commit,
      commitMessage: req.body.commitMessage,
    };

    if (!request.workflowId || !request.repositoryId || !request.branch) {
      return res.status(400).json({
        success: false,
        error: 'workflowId, repositoryId, and branch are required',
      });
    }

    const result = await gitService.exportWorkflow(request, userId);

    res.status(201).json(result);
  } catch (error) {
    logger.error('Failed to export workflow', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export workflow',
    });
  }
});

/**
 * Get workflow Git mapping
 * GET /api/git/workflows/:id/mapping
 */
router.get('/workflows/:id/mapping', async (req, res) => {
  try {
    const gitService = getGitService();
    const { id } = req.params;

    const mapping = await gitService.getWorkflowMapping(id);

    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: 'Workflow Git mapping not found',
      });
    }

    res.json({
      success: true,
      mapping,
    });
  } catch (error) {
    logger.error('Failed to get workflow mapping', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get workflow mapping',
    });
  }
});

export default router;

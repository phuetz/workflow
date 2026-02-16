/**
 * Workflow Versioning API Routes
 * Git-like version control backed by Prisma.
 */

import { Router, Request, Response } from 'express';
import { workflowVersionService } from '../../services/WorkflowVersionService';
import { logger } from '../../../services/SimpleLogger';

const router = Router();

interface AuthRequest extends Request {
  user?: { id: string };
}

// POST /api/versions/:workflowId/commit - Create a new version
router.post('/:workflowId/commit', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { message, branch } = req.body;
    const userId = (req as AuthRequest).user?.id || 'system';

    const result = await workflowVersionService.commit(
      workflowId,
      branch || 'main',
      message || 'Update workflow',
      userId
    );

    res.status(201).json(result);
  } catch (error) {
    logger.error('Error creating version:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create version' });
  }
});

// GET /api/versions/:workflowId - List versions
router.get('/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const branch = req.query.branch as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    const versions = await workflowVersionService.listVersions(workflowId, branch, limit);
    res.json({ versions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list versions' });
  }
});

// GET /api/versions/:workflowId/branches - List branches
router.get('/:workflowId/branches', async (req: Request, res: Response) => {
  try {
    const branches = await workflowVersionService.listBranches(req.params.workflowId);
    res.json({ branches });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list branches' });
  }
});

// POST /api/versions/:workflowId/branches - Create branch
router.post('/:workflowId/branches', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { name, from } = req.body;
    const userId = (req as AuthRequest).user?.id || 'system';

    const result = await workflowVersionService.createBranch(workflowId, name, from || 'main', userId);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create branch' });
  }
});

// GET /api/versions/:workflowId/diff - Get diff between versions
router.get('/:workflowId/diff', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const from = parseInt(req.query.from as string);
    const to = parseInt(req.query.to as string);
    const branch = (req.query.branch as string) || 'main';

    if (!from || !to) {
      return res.status(400).json({ error: 'from and to version numbers are required' });
    }

    const diff = await workflowVersionService.getDiff(workflowId, from, to, branch);
    res.json({ diff });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get diff' });
  }
});

// POST /api/versions/:workflowId/rollback - Rollback to version
router.post('/:workflowId/rollback', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { version, branch } = req.body;
    const userId = (req as AuthRequest).user?.id || 'system';

    const result = await workflowVersionService.rollback(workflowId, version, branch || 'main', userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to rollback' });
  }
});

// POST /api/versions/:workflowId/tag - Tag a version
router.post('/:workflowId/tag', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { version, branch, tag } = req.body;

    const result = await workflowVersionService.tag(workflowId, version, branch || 'main', tag);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to tag version' });
  }
});

// POST /api/versions/:workflowId/merge - Merge branches
router.post('/:workflowId/merge', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { source, target } = req.body;
    const userId = (req as AuthRequest).user?.id || 'system';

    const result = await workflowVersionService.merge(workflowId, source, target || 'main', userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to merge' });
  }
});

export default router;

/**
 * Approval Gates API Routes
 * Human-in-the-Loop (HITL) approval system for workflow executions.
 */

import { Router, Request, Response } from 'express';
import { durableExecutionService } from '../../services/DurableExecutionService';
import { logger } from '../../../services/SimpleLogger';

const router = Router();

interface AuthRequest extends Request {
  user?: { id: string };
}

// GET /api/approvals - List pending approvals
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const gates = durableExecutionService.getPendingApprovals(userId);

    res.json({
      approvals: gates.map(g => ({
        id: g.id,
        executionId: g.executionId,
        workflowId: g.workflowId,
        nodeId: g.nodeId,
        status: g.status,
        approvers: g.approvers,
        createdAt: g.createdAt,
        expiresAt: g.expiresAt,
        approvalUrl: `/api/approvals/${g.token}`,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list approvals' });
  }
});

// GET /api/approvals/:token - Get approval gate details
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const gate = durableExecutionService.getApprovalGate(req.params.token);
    if (!gate) {
      return res.status(404).json({ error: 'Approval gate not found' });
    }

    res.json({
      id: gate.id,
      executionId: gate.executionId,
      workflowId: gate.workflowId,
      nodeId: gate.nodeId,
      status: gate.status,
      approvers: gate.approvers,
      approvedBy: gate.approvedBy,
      reason: gate.reason,
      createdAt: gate.createdAt,
      expiresAt: gate.expiresAt,
      resolvedAt: gate.resolvedAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get approval' });
  }
});

// POST /api/approvals/:token/approve - Approve an execution
router.post('/:token/approve', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id || req.body.userId || 'anonymous';
    const reason = req.body.reason;

    const result = await durableExecutionService.resolveApprovalGate(
      req.params.token, 'approved', userId, reason
    );

    res.json({ message: 'Execution approved and resumed', ...result });
  } catch (error) {
    logger.error('Error approving execution:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to approve' });
  }
});

// POST /api/approvals/:token/reject - Reject an execution
router.post('/:token/reject', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id || req.body.userId || 'anonymous';
    const reason = req.body.reason;

    const result = await durableExecutionService.resolveApprovalGate(
      req.params.token, 'rejected', userId, reason
    );

    res.json({ message: 'Execution rejected and cancelled', ...result });
  } catch (error) {
    logger.error('Error rejecting execution:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to reject' });
  }
});

export default router;

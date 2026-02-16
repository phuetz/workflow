/**
 * Durable Execution Service
 * Provides execution checkpointing to survive crashes, plus HITL approval gates.
 * Execution state is persisted to DB after each node completes.
 */

import { prisma } from '../database/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '../../services/SimpleLogger';
import * as crypto from 'crypto';

interface ApprovalGate {
  id: string;
  executionId: string;
  workflowId: string;
  nodeId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approvers: string[];
  approvedBy?: string;
  reason?: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  resolvedAt?: Date;
}

// In-memory approval gates (would use DB table in full implementation)
const approvalGates = new Map<string, ApprovalGate>();

export class DurableExecutionService {
  /**
   * Save execution checkpoint after a node completes.
   * This allows resuming from the last completed node on crash recovery.
   */
  async saveCheckpoint(
    executionId: string,
    completedNodeId: string,
    nodeResults: Record<string, unknown>,
    nextNodeIds: string[]
  ): Promise<void> {
    try {
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          output: {
            checkpoint: {
              lastCompletedNode: completedNodeId,
              nodeResults,
              nextNodes: nextNodeIds,
              checkpointedAt: new Date().toISOString(),
            },
          } as Prisma.InputJsonValue,
        },
      });

      logger.debug('Execution checkpoint saved', { executionId, completedNodeId });
    } catch (error) {
      logger.warn('Failed to save checkpoint', { executionId, error: String(error) });
    }
  }

  /**
   * Recover and resume an execution from its last checkpoint.
   */
  async recoverExecution(executionId: string): Promise<{
    canResume: boolean;
    lastCompletedNode?: string;
    nodeResults?: Record<string, unknown>;
    nextNodes?: string[];
  }> {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) return { canResume: false };

    const output = execution.output as any;
    const checkpoint = output?.checkpoint;

    if (!checkpoint) return { canResume: false };

    return {
      canResume: true,
      lastCompletedNode: checkpoint.lastCompletedNode,
      nodeResults: checkpoint.nodeResults,
      nextNodes: checkpoint.nextNodes,
    };
  }

  /**
   * Find executions that were running when the server crashed.
   */
  async findStaleExecutions(olderThanMs = 5 * 60 * 1000): Promise<string[]> {
    const cutoff = new Date(Date.now() - olderThanMs);

    const stale = await prisma.workflowExecution.findMany({
      where: {
        status: 'RUNNING',
        startedAt: { lt: cutoff },
      },
      select: { id: true },
    });

    return stale.map(e => e.id);
  }

  /**
   * Create an approval gate that pauses execution until approved.
   */
  async createApprovalGate(
    executionId: string,
    workflowId: string,
    nodeId: string,
    approvers: string[],
    timeoutMs = 86_400_000 // 24 hours
  ): Promise<{ token: string; gateId: string; approvalUrl: string }> {
    const token = crypto.randomBytes(32).toString('hex');
    const gateId = crypto.randomUUID();

    const gate: ApprovalGate = {
      id: gateId,
      executionId,
      workflowId,
      nodeId,
      status: 'pending',
      approvers,
      token,
      expiresAt: new Date(Date.now() + timeoutMs),
      createdAt: new Date(),
    };

    approvalGates.set(token, gate);

    // Pause the execution
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'PENDING',
        output: {
          approvalGate: {
            gateId,
            nodeId,
            token,
            status: 'pending',
            approvers,
            createdAt: gate.createdAt.toISOString(),
            expiresAt: gate.expiresAt.toISOString(),
          },
        } as Prisma.InputJsonValue,
      },
    });

    logger.info('Approval gate created', { executionId, gateId, nodeId, approvers });

    return {
      token,
      gateId,
      approvalUrl: `/api/approvals/${token}`,
    };
  }

  /**
   * Resolve an approval gate (approve or reject).
   */
  async resolveApprovalGate(
    token: string,
    decision: 'approved' | 'rejected',
    userId: string,
    reason?: string
  ): Promise<{ executionId: string; status: string }> {
    const gate = approvalGates.get(token);

    if (!gate) throw new Error('Approval gate not found');
    if (gate.status !== 'pending') throw new Error(`Gate already ${gate.status}`);
    if (new Date() > gate.expiresAt) {
      gate.status = 'expired';
      throw new Error('Approval gate has expired');
    }

    // Check if user is an approved approver
    if (gate.approvers.length > 0 && !gate.approvers.includes(userId) && !gate.approvers.includes('*')) {
      throw new Error('User is not authorized to approve this gate');
    }

    gate.status = decision;
    gate.approvedBy = userId;
    gate.reason = reason;
    gate.resolvedAt = new Date();

    if (decision === 'approved') {
      // Resume execution
      await prisma.workflowExecution.update({
        where: { id: gate.executionId },
        data: { status: 'RUNNING' },
      });

      logger.info('Approval gate approved, execution resuming', {
        executionId: gate.executionId,
        approvedBy: userId,
      });
    } else {
      // Cancel execution
      await prisma.workflowExecution.update({
        where: { id: gate.executionId },
        data: {
          status: 'CANCELLED',
          error: `Rejected by ${userId}: ${reason || 'No reason given'}`,
        },
      });

      logger.info('Approval gate rejected, execution cancelled', {
        executionId: gate.executionId,
        rejectedBy: userId,
      });
    }

    return { executionId: gate.executionId, status: decision };
  }

  /**
   * Get pending approval gates.
   */
  getPendingApprovals(userId?: string): ApprovalGate[] {
    const gates: ApprovalGate[] = [];
    for (const gate of approvalGates.values()) {
      if (gate.status !== 'pending') continue;
      if (new Date() > gate.expiresAt) {
        gate.status = 'expired';
        continue;
      }
      if (userId && gate.approvers.length > 0 && !gate.approvers.includes(userId) && !gate.approvers.includes('*')) {
        continue;
      }
      gates.push(gate);
    }
    return gates;
  }

  /**
   * Get approval gate by token.
   */
  getApprovalGate(token: string): ApprovalGate | undefined {
    return approvalGates.get(token);
  }
}

export const durableExecutionService = new DurableExecutionService();

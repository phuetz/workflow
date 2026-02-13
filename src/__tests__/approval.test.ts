/**
 * Comprehensive Tests for Approval Workflow System
 * Tests ApprovalEngine, ApprovalManager, ApprovalNode, and notifications
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApprovalEngine } from '../workflow/approval/ApprovalEngine';
import { approvalManager } from '../workflow/approval/ApprovalManager';
import { executeApprovalNode, validateApprovalConfig } from '../workflow/approval/ApprovalNode';
import { ApprovalNodeConfig, Approver } from '../types/approval';

describe('Approval System', () => {
  let engine: ApprovalEngine;

  beforeEach(() => {
    engine = new ApprovalEngine({
      enableAutoApproval: true,
      enableDelegation: true,
      enableAuditTrail: true,
    });
  });

  afterEach(() => {
    engine.shutdown();
  });

  describe('ApprovalEngine', () => {
    it('should create an approval request', async () => {
      const approvers: Approver[] = [
        {
          id: 'user1',
          name: 'John Doe',
          email: 'john@example.com',
          notificationChannels: ['email'],
        },
      ];

      const config: ApprovalNodeConfig = {
        approvers,
        approvalMode: 'any',
        timeoutMs: 3600000,
        timeoutAction: 'reject',
        notificationChannels: ['email'],
        sendReminders: false,
        enableAuditTrail: true,
      };

      const request = await engine.createApprovalRequest(config, {
        workflowId: 'wf1',
        workflowName: 'Test Workflow',
        executionId: 'exec1',
        nodeId: 'node1',
        nodeName: 'Approval Node',
        data: { amount: 1000, reason: 'Budget request' },
      });

      expect(request).toBeDefined();
      expect(request.status).toBe('pending');
      expect(request.approvers).toHaveLength(1);
      expect(request.responses).toHaveLength(0);
    });

    it('should handle approval submission - any mode', async () => {
      const approvers: Approver[] = [
        { id: 'user1', name: 'User 1', email: 'user1@example.com', notificationChannels: ['email'] },
        { id: 'user2', name: 'User 2', email: 'user2@example.com', notificationChannels: ['email'] },
      ];

      const config: ApprovalNodeConfig = {
        approvers,
        approvalMode: 'any',
        timeoutMs: 3600000,
        timeoutAction: 'reject',
        notificationChannels: ['email'],
        sendReminders: false,
        enableAuditTrail: true,
      };

      const request = await engine.createApprovalRequest(config, {
        workflowId: 'wf1',
        workflowName: 'Test Workflow',
        executionId: 'exec1',
        nodeId: 'node1',
        nodeName: 'Approval Node',
        data: {},
      });

      const result = await engine.submitResponse(
        request.id,
        'user1',
        'approve',
        'Looks good'
      );

      expect(result.completed).toBe(true);
      expect(result.finalDecision).toBe('approved');
      expect(result.request.responses).toHaveLength(1);
      expect(result.request.status).toBe('approved');
    });

    it('should handle approval submission - all mode', async () => {
      const approvers: Approver[] = [
        { id: 'user1', name: 'User 1', email: 'user1@example.com', notificationChannels: ['email'] },
        { id: 'user2', name: 'User 2', email: 'user2@example.com', notificationChannels: ['email'] },
      ];

      const config: ApprovalNodeConfig = {
        approvers,
        approvalMode: 'all',
        timeoutMs: 3600000,
        timeoutAction: 'reject',
        notificationChannels: ['email'],
        sendReminders: false,
        enableAuditTrail: true,
      };

      const request = await engine.createApprovalRequest(config, {
        workflowId: 'wf1',
        workflowName: 'Test Workflow',
        executionId: 'exec1',
        nodeId: 'node1',
        nodeName: 'Approval Node',
        data: {},
      });

      // First approval
      const result1 = await engine.submitResponse(request.id, 'user1', 'approve');
      expect(result1.completed).toBe(false);

      // Second approval
      const result2 = await engine.submitResponse(request.id, 'user2', 'approve');
      expect(result2.completed).toBe(true);
      expect(result2.finalDecision).toBe('approved');
    });

    it('should handle rejection - all mode', async () => {
      const approvers: Approver[] = [
        { id: 'user1', name: 'User 1', email: 'user1@example.com', notificationChannels: ['email'] },
        { id: 'user2', name: 'User 2', email: 'user2@example.com', notificationChannels: ['email'] },
      ];

      const config: ApprovalNodeConfig = {
        approvers,
        approvalMode: 'all',
        timeoutMs: 3600000,
        timeoutAction: 'reject',
        notificationChannels: ['email'],
        sendReminders: false,
        enableAuditTrail: true,
      };

      const request = await engine.createApprovalRequest(config, {
        workflowId: 'wf1',
        workflowName: 'Test Workflow',
        executionId: 'exec1',
        nodeId: 'node1',
        nodeName: 'Approval Node',
        data: {},
      });

      // One rejection is enough to reject in all mode
      const result = await engine.submitResponse(request.id, 'user1', 'reject', 'Not approved');
      expect(result.completed).toBe(true);
      expect(result.finalDecision).toBe('rejected');
    });

    it('should handle approval submission - majority mode', async () => {
      const approvers: Approver[] = [
        { id: 'user1', name: 'User 1', email: 'user1@example.com', notificationChannels: ['email'] },
        { id: 'user2', name: 'User 2', email: 'user2@example.com', notificationChannels: ['email'] },
        { id: 'user3', name: 'User 3', email: 'user3@example.com', notificationChannels: ['email'] },
      ];

      const config: ApprovalNodeConfig = {
        approvers,
        approvalMode: 'majority',
        timeoutMs: 3600000,
        timeoutAction: 'reject',
        notificationChannels: ['email'],
        sendReminders: false,
        enableAuditTrail: true,
      };

      const request = await engine.createApprovalRequest(config, {
        workflowId: 'wf1',
        workflowName: 'Test Workflow',
        executionId: 'exec1',
        nodeId: 'node1',
        nodeName: 'Approval Node',
        data: {},
      });

      // First approval
      await engine.submitResponse(request.id, 'user1', 'approve');

      // Second approval (majority reached)
      const result = await engine.submitResponse(request.id, 'user2', 'approve');
      expect(result.completed).toBe(true);
      expect(result.finalDecision).toBe('approved');
    });

    it('should prevent duplicate responses', async () => {
      const approvers: Approver[] = [
        { id: 'user1', name: 'User 1', email: 'user1@example.com', notificationChannels: ['email'] },
      ];

      const config: ApprovalNodeConfig = {
        approvers,
        approvalMode: 'any',
        timeoutMs: 3600000,
        timeoutAction: 'reject',
        notificationChannels: ['email'],
        sendReminders: false,
        enableAuditTrail: true,
      };

      const request = await engine.createApprovalRequest(config, {
        workflowId: 'wf1',
        workflowName: 'Test Workflow',
        executionId: 'exec1',
        nodeId: 'node1',
        nodeName: 'Approval Node',
        data: {},
      });

      await engine.submitResponse(request.id, 'user1', 'approve');

      // Try to submit again
      await expect(
        engine.submitResponse(request.id, 'user1', 'approve')
      ).rejects.toThrow();
    });

    it('should handle delegation', async () => {
      const approvers: Approver[] = [
        { id: 'user1', name: 'User 1', email: 'user1@example.com', notificationChannels: ['email'] },
      ];

      const config: ApprovalNodeConfig = {
        approvers,
        approvalMode: 'any',
        timeoutMs: 3600000,
        timeoutAction: 'reject',
        notificationChannels: ['email'],
        sendReminders: false,
        enableAuditTrail: true,
      };

      const request = await engine.createApprovalRequest(config, {
        workflowId: 'wf1',
        workflowName: 'Test Workflow',
        executionId: 'exec1',
        nodeId: 'node1',
        nodeName: 'Approval Node',
        data: {},
      });

      const newApprover: Approver = {
        id: 'user2',
        name: 'User 2',
        email: 'user2@example.com',
        notificationChannels: ['email'],
      };

      const delegation = await engine.delegateApproval(
        request.id,
        'user1',
        newApprover,
        'Out of office'
      );

      expect(delegation).toBeDefined();
      expect(delegation.toApproverId).toBe('user2');

      // Check that new approver is added
      const updatedRequest = engine.getApprovalRequest(request.id);
      expect(updatedRequest?.approvers.some(a => a.id === 'user2')).toBe(true);
    });

    it('should handle auto-approval rules', async () => {
      const approvers: Approver[] = [
        { id: 'user1', name: 'User 1', email: 'user1@example.com', notificationChannels: ['email'] },
      ];

      const config: ApprovalNodeConfig = {
        approvers,
        approvalMode: 'any',
        autoApprovalRules: [
          {
            id: 'rule1',
            name: 'Auto-approve small amounts',
            condition: '${amount} < 100',
            action: 'approve',
          },
        ],
        timeoutMs: 3600000,
        timeoutAction: 'reject',
        notificationChannels: ['email'],
        sendReminders: false,
        enableAuditTrail: true,
      };

      const request = await engine.createApprovalRequest(config, {
        workflowId: 'wf1',
        workflowName: 'Test Workflow',
        executionId: 'exec1',
        nodeId: 'node1',
        nodeName: 'Approval Node',
        data: { amount: 50 },
      });

      // Should be auto-approved
      expect(request.status).toBe('approved');
      expect(request.responses).toHaveLength(1);
      expect(request.responses[0].approverId).toBe('system');
    });

    it('should track audit trail', async () => {
      const approvers: Approver[] = [
        { id: 'user1', name: 'User 1', email: 'user1@example.com', notificationChannels: ['email'] },
      ];

      const config: ApprovalNodeConfig = {
        approvers,
        approvalMode: 'any',
        timeoutMs: 3600000,
        timeoutAction: 'reject',
        notificationChannels: ['email'],
        sendReminders: false,
        enableAuditTrail: true,
      };

      const request = await engine.createApprovalRequest(config, {
        workflowId: 'wf1',
        workflowName: 'Test Workflow',
        executionId: 'exec1',
        nodeId: 'node1',
        nodeName: 'Approval Node',
        data: {},
      });

      await engine.submitResponse(request.id, 'user1', 'approve');

      const history = engine.getApprovalHistory(request.id);
      expect(history.length).toBeGreaterThan(0);
      expect(history.some(h => h.action === 'created')).toBe(true);
      expect(history.some(h => h.action === 'approved')).toBe(true);
    });

    it('should cleanup old approvals', () => {
      const count = engine.cleanup(0); // Cleanup everything
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ApprovalManager', () => {
    it('should get pending approvals for user', async () => {
      const approvals = approvalManager.getPendingApprovalsForUser('user1');
      expect(Array.isArray(approvals)).toBe(true);
    });

    it('should get statistics', () => {
      const stats = approvalManager.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.pending).toBeGreaterThanOrEqual(0);
    });

    it('should get metrics', () => {
      const metrics = approvalManager.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.pendingRequests).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ApprovalNode', () => {
    it('should validate approval config', () => {
      const config: Partial<ApprovalNodeConfig> = {
        approvers: [
          {
            id: 'user1',
            name: 'User 1',
            email: 'user1@example.com',
            notificationChannels: ['email'],
          },
        ],
        approvalMode: 'any',
      };

      const validation = validateApprovalConfig(config);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing approvers', () => {
      const config: Partial<ApprovalNodeConfig> = {
        approvers: [],
        approvalMode: 'any',
      };

      const validation = validateApprovalConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('approver'))).toBe(true);
    });

    it('should detect missing approval mode', () => {
      const config: Partial<ApprovalNodeConfig> = {
        approvers: [
          {
            id: 'user1',
            name: 'User 1',
            email: 'user1@example.com',
            notificationChannels: ['email'],
          },
        ],
      };

      const validation = validateApprovalConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('mode'))).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle 100 concurrent approvals', async () => {
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 100; i++) {
        const config: ApprovalNodeConfig = {
          approvers: [
            {
              id: `user${i}`,
              name: `User ${i}`,
              email: `user${i}@example.com`,
              notificationChannels: ['email'],
            },
          ],
          approvalMode: 'any',
          timeoutMs: 3600000,
          timeoutAction: 'reject',
          notificationChannels: ['email'],
          sendReminders: false,
          enableAuditTrail: false, // Disable for performance
        };

        promises.push(
          engine.createApprovalRequest(config, {
            workflowId: `wf${i}`,
            workflowName: `Workflow ${i}`,
            executionId: `exec${i}`,
            nodeId: `node${i}`,
            nodeName: `Node ${i}`,
            data: {},
          })
        );
      }

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    });
  });
});

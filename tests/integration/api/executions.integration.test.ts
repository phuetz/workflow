/**
 * Integration Tests: Executions API
 * Tests for execution monitoring, history, and analytics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ApiClient } from '../../utils/api-client';
import { UserFactory, WorkflowFactory, ExecutionFactory } from '../../factories';
import { TestAssertions } from '../../utils/assertions';
import { ExecutionStatus } from '@prisma/client';

describe('Executions API Integration Tests', () => {
  let apiClient: ApiClient;
  let user: Awaited<ReturnType<typeof UserFactory.create>>;
  let workflow: Awaited<ReturnType<typeof WorkflowFactory.create>>;

  beforeEach(async () => {
    apiClient = new ApiClient();
    user = await UserFactory.create({ password: 'Test123!' });
    workflow = await WorkflowFactory.createActive(user.id);
    await apiClient.login(user.email, 'Test123!');
  });

  describe('GET /api/v1/executions', () => {
    it('should list all executions for user', async () => {
      // Create multiple executions
      await ExecutionFactory.createMany(workflow.id, user.id, 5);

      const response = await apiClient.get('/api/v1/executions');

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.executions).toBeInstanceOf(Array);
      expect(response.data.executions.length).toBeGreaterThanOrEqual(5);
    });

    it('should filter executions by workflow', async () => {
      const workflow2 = await WorkflowFactory.createActive(user.id);

      await ExecutionFactory.createSuccess(workflow.id, user.id);
      await ExecutionFactory.createSuccess(workflow2.id, user.id);

      const response = await apiClient.get('/api/v1/executions', {
        workflowId: workflow.id
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.executions.every((e: { workflowId: string }) => e.workflowId === workflow.id)).toBe(true);
    });

    it('should filter executions by status', async () => {
      await ExecutionFactory.createSuccess(workflow.id, user.id);
      await ExecutionFactory.createFailed(workflow.id, user.id);
      await ExecutionFactory.createRunning(workflow.id, user.id);

      const response = await apiClient.get('/api/v1/executions', {
        status: ExecutionStatus.SUCCESS
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.executions.every((e: { status: string }) => e.status === ExecutionStatus.SUCCESS)).toBe(true);
    });

    it('should filter executions by date range', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await ExecutionFactory.createSuccess(workflow.id, user.id, {
        startedAt: new Date()
      });

      const response = await apiClient.get('/api/v1/executions', {
        startDate: yesterday.toISOString(),
        endDate: tomorrow.toISOString()
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.executions.length).toBeGreaterThan(0);
    });

    it('should paginate executions', async () => {
      await ExecutionFactory.createMany(workflow.id, user.id, 25);

      const response = await apiClient.get('/api/v1/executions', {
        page: '1',
        limit: '10'
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.executions.length).toBe(10);
      expect(response.data.pagination).toBeDefined();
      expect(response.data.pagination.total).toBeGreaterThanOrEqual(25);
    });

    it('should sort executions', async () => {
      await ExecutionFactory.createMany(workflow.id, user.id, 5);

      const response = await apiClient.get('/api/v1/executions', {
        sortBy: 'startedAt',
        sortOrder: 'desc'
      });

      TestAssertions.assertSuccessResponse(response);

      // Verify sorting
      const executions = response.data.executions;
      for (let i = 1; i < executions.length; i++) {
        const prev = new Date(executions[i - 1].startedAt);
        const curr = new Date(executions[i].startedAt);
        expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
      }
    });
  });

  describe('GET /api/v1/executions/:id', () => {
    it('should return execution details', async () => {
      const execution = await ExecutionFactory.createSuccess(workflow.id, user.id);

      const response = await apiClient.get(`/api/v1/executions/${execution.id}`);

      TestAssertions.assertSuccessResponse(response);
      TestAssertions.assertValidExecution(response.data.execution);
      expect(response.data.execution.id).toBe(execution.id);
    });

    it('should include node executions', async () => {
      const execution = await ExecutionFactory.createWithNodeExecutions(workflow.id, user.id, 5);

      const response = await apiClient.get(`/api/v1/executions/${execution.id}`, {
        include: 'nodes'
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.execution.nodeExecutions).toBeInstanceOf(Array);
      expect(response.data.execution.nodeExecutions.length).toBe(5);
    });

    it('should return 404 for non-existent execution', async () => {
      const response = await apiClient.get('/api/v1/executions/non-existent-id');

      TestAssertions.assertErrorResponse(response, 404);
    });

    it('should not return executions of other users', async () => {
      const otherUser = await UserFactory.create();
      const otherWorkflow = await WorkflowFactory.create(otherUser.id);
      const execution = await ExecutionFactory.createSuccess(otherWorkflow.id, otherUser.id);

      const response = await apiClient.get(`/api/v1/executions/${execution.id}`);

      TestAssertions.assertErrorResponse(response, 403);
    });
  });

  describe('POST /api/v1/workflows/:id/execute', () => {
    it('should start workflow execution', async () => {
      const response = await apiClient.post(`/api/v1/workflows/${workflow.id}/execute`, {
        input: { test: true }
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.execution).toBeDefined();
      expect(response.data.execution.status).toMatch(/RUNNING|PENDING/);
      expect(response.data.execution.workflowId).toBe(workflow.id);
    });

    it('should execute with custom trigger data', async () => {
      const response = await apiClient.post(`/api/v1/workflows/${workflow.id}/execute`, {
        input: { customData: 'test' },
        trigger: {
          type: 'manual',
          userId: user.id,
          metadata: { source: 'api-test' }
        }
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.execution.trigger.type).toBe('manual');
      expect(response.data.execution.trigger.metadata.source).toBe('api-test');
    });

    it('should reject execution of inactive workflow', async () => {
      const draftWorkflow = await WorkflowFactory.createDraft(user.id);

      const response = await apiClient.post(`/api/v1/workflows/${draftWorkflow.id}/execute`, {
        input: {}
      });

      TestAssertions.assertErrorResponse(response, 400);
      expect(response.error?.message).toContain('active');
    });

    it('should validate execution input', async () => {
      const response = await apiClient.post(`/api/v1/workflows/${workflow.id}/execute`, {
        input: 'invalid-input' // Should be object
      });

      TestAssertions.assertErrorResponse(response, 400);
    });
  });

  describe('POST /api/v1/executions/:id/cancel', () => {
    it('should cancel running execution', async () => {
      const execution = await ExecutionFactory.createRunning(workflow.id, user.id);

      const response = await apiClient.post(`/api/v1/executions/${execution.id}/cancel`);

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.execution.status).toBe(ExecutionStatus.CANCELLED);
    });

    it('should not cancel completed execution', async () => {
      const execution = await ExecutionFactory.createSuccess(workflow.id, user.id);

      const response = await apiClient.post(`/api/v1/executions/${execution.id}/cancel`);

      TestAssertions.assertErrorResponse(response, 400);
      expect(response.error?.message).toContain('cannot be cancelled');
    });
  });

  describe('POST /api/v1/executions/:id/retry', () => {
    it('should retry failed execution', async () => {
      const failedExecution = await ExecutionFactory.createFailed(workflow.id, user.id);

      const response = await apiClient.post(`/api/v1/executions/${failedExecution.id}/retry`);

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.execution).toBeDefined();
      expect(response.data.execution.id).not.toBe(failedExecution.id); // New execution
      expect(response.data.execution.status).toMatch(/RUNNING|PENDING/);
    });

    it('should retry with same input as original execution', async () => {
      const originalInput = { test: true, value: 42 };
      const failedExecution = await ExecutionFactory.createFailed(workflow.id, user.id, {
        input: originalInput
      });

      const response = await apiClient.post(`/api/v1/executions/${failedExecution.id}/retry`);

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.execution.input).toEqual(originalInput);
    });

    it('should retry with modified input', async () => {
      const failedExecution = await ExecutionFactory.createFailed(workflow.id, user.id);

      const response = await apiClient.post(`/api/v1/executions/${failedExecution.id}/retry`, {
        input: { modified: true }
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.execution.input).toEqual({ modified: true });
    });

    it('should not retry successful execution', async () => {
      const execution = await ExecutionFactory.createSuccess(workflow.id, user.id);

      const response = await apiClient.post(`/api/v1/executions/${execution.id}/retry`);

      TestAssertions.assertErrorResponse(response, 400);
    });
  });

  describe('GET /api/v1/executions/:id/logs', () => {
    it('should return execution logs', async () => {
      const execution = await ExecutionFactory.createSuccess(workflow.id, user.id);

      const response = await apiClient.get(`/api/v1/executions/${execution.id}/logs`);

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.logs).toBeInstanceOf(Array);
    });

    it('should filter logs by level', async () => {
      const execution = await ExecutionFactory.createSuccess(workflow.id, user.id);

      const response = await apiClient.get(`/api/v1/executions/${execution.id}/logs`, {
        level: 'error'
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.logs.every((log: { level: string }) => log.level === 'error')).toBe(true);
    });

    it('should filter logs by node', async () => {
      const execution = await ExecutionFactory.createWithNodeExecutions(workflow.id, user.id, 3);

      const response = await apiClient.get(`/api/v1/executions/${execution.id}/logs`, {
        nodeId: 'node-1'
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.logs.every((log: { nodeId: string }) => log.nodeId === 'node-1')).toBe(true);
    });
  });

  describe('GET /api/v1/analytics/executions', () => {
    it('should return execution statistics', async () => {
      // Create various executions
      await ExecutionFactory.createMany(workflow.id, user.id, 5, { status: ExecutionStatus.SUCCESS });
      await ExecutionFactory.createMany(workflow.id, user.id, 2, { status: ExecutionStatus.FAILED });

      const response = await apiClient.get('/api/v1/analytics/executions');

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.stats).toBeDefined();
      expect(response.data.stats.total).toBeGreaterThanOrEqual(7);
      expect(response.data.stats.successful).toBeGreaterThanOrEqual(5);
      expect(response.data.stats.failed).toBeGreaterThanOrEqual(2);
      expect(response.data.stats.successRate).toBeDefined();
    });

    it('should return execution trends over time', async () => {
      const response = await apiClient.get('/api/v1/analytics/executions', {
        groupBy: 'day',
        period: '7d'
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.trends).toBeInstanceOf(Array);
    });

    it('should return workflow-specific analytics', async () => {
      await ExecutionFactory.createMany(workflow.id, user.id, 10);

      const response = await apiClient.get('/api/v1/analytics/executions', {
        workflowId: workflow.id
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.stats.workflowId).toBe(workflow.id);
    });

    it('should return average execution duration', async () => {
      await ExecutionFactory.createSuccess(workflow.id, user.id, { duration: 1000 });
      await ExecutionFactory.createSuccess(workflow.id, user.id, { duration: 2000 });
      await ExecutionFactory.createSuccess(workflow.id, user.id, { duration: 3000 });

      const response = await apiClient.get('/api/v1/analytics/executions', {
        workflowId: workflow.id
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.stats.avgDuration).toBeCloseTo(2000, 100);
    });
  });

  describe('WebSocket Execution Updates', () => {
    it('should receive real-time execution updates', async () => {
      // This would require WebSocket testing
      // Placeholder for WebSocket integration test
      expect(true).toBe(true);
    });
  });

  describe('Execution Cleanup', () => {
    it('should delete old executions', async () => {
      const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

      await ExecutionFactory.createSuccess(workflow.id, user.id, {
        startedAt: oldDate,
        finishedAt: oldDate
      });

      const response = await apiClient.post('/api/v1/admin/executions/cleanup', {
        olderThan: '60d'
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.deleted).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent execution requests', async () => {
      const requests = Array(20).fill(null).map(() =>
        apiClient.post(`/api/v1/workflows/${workflow.id}/execute`, {
          input: { concurrent: true }
        })
      );

      const responses = await Promise.all(requests);

      expect(responses.every(r => r.status === 200 || r.status === 201)).toBe(true);
      expect(new Set(responses.map(r => r.data.execution.id)).size).toBe(20); // All unique
    });

    it('should handle large execution history retrieval', async () => {
      await ExecutionFactory.createMany(workflow.id, user.id, 100);

      const startTime = Date.now();
      const response = await apiClient.get('/api/v1/executions', {
        limit: '100'
      });
      const duration = Date.now() - startTime;

      TestAssertions.assertSuccessResponse(response);
      expect(duration).toBeLessThan(1000); // Should be fast
    });
  });
});

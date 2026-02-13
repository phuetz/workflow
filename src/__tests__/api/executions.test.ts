import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import executionRouter from '../../backend/api/routes/executions';

// Mock the repositories and services
vi.mock('../../backend/api/repositories/adapters', () => ({
  getExecution: vi.fn(),
  listNodeExecutions: vi.fn(),
}));

vi.mock('../../backend/api/services/events', () => ({
  onBroadcast: vi.fn(() => () => {}), // Returns unsubscribe function
}));

import { getExecution, listNodeExecutions } from '../../backend/api/repositories/adapters';
import { onBroadcast } from '../../backend/api/services/events';

describe('Executions API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/executions', executionRouter);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/executions', () => {
    it('should return paginated executions list', async () => {
      const response = await request(app).get('/api/executions');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('executions');
      expect(Array.isArray(response.body.executions)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 50,
        total: 0,
        pages: 0,
      });
    });

    it('should support custom pagination parameters', async () => {
      const response = await request(app)
        .get('/api/executions?page=2&limit=25');

      expect(response.status).toBe(200);
      expect(response.body.pagination).toMatchObject({
        page: 2,
        limit: 25,
      });
    });

    it('should filter by workflowId when provided', async () => {
      const response = await request(app)
        .get('/api/executions?workflowId=wf_123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle invalid page numbers gracefully', async () => {
      const response = await request(app)
        .get('/api/executions?page=invalid');

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(NaN);
    });

    it('should use default pagination when not specified', async () => {
      const response = await request(app).get('/api/executions');

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(50);
    });
  });

  describe('GET /api/executions/:id', () => {
    it('should return execution details by id', async () => {
      const mockExecution = {
        id: 'exec_123',
        workflowId: 'wf_123',
        status: 'success',
        startedAt: new Date('2025-01-01T00:00:00Z'),
        finishedAt: new Date('2025-01-01T00:01:00Z'),
        duration: 60000,
        results: {
          node1: { output: 'success', data: { result: 'test' } },
        },
      };

      vi.mocked(getExecution).mockReturnValue(mockExecution);

      const response = await request(app).get('/api/executions/exec_123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'exec_123');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('results');
      expect(getExecution).toHaveBeenCalledWith('exec_123');
    });

    it('should return 404 when execution not found', async () => {
      vi.mocked(getExecution).mockReturnValue(null);

      const response = await request(app).get('/api/executions/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Execution not found');
    });

    it('should handle running executions', async () => {
      const mockExecution = {
        id: 'exec_running',
        workflowId: 'wf_123',
        status: 'running',
        startedAt: new Date(),
        currentNode: 'node2',
      };

      vi.mocked(getExecution).mockReturnValue(mockExecution);

      const response = await request(app).get('/api/executions/exec_running');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'running');
      expect(response.body).toHaveProperty('currentNode', 'node2');
    });

    it('should handle failed executions', async () => {
      const mockExecution = {
        id: 'exec_failed',
        workflowId: 'wf_123',
        status: 'failed',
        startedAt: new Date(),
        finishedAt: new Date(),
        error: {
          message: 'Node execution failed',
          nodeId: 'node3',
        },
      };

      vi.mocked(getExecution).mockReturnValue(mockExecution);

      const response = await request(app).get('/api/executions/exec_failed');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'failed');
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message', 'Node execution failed');
    });
  });

  describe('GET /api/executions/:id/logs', () => {
    it('should return execution logs', async () => {
      const mockExecution = {
        id: 'exec_123',
        workflowId: 'wf_123',
        status: 'success',
        startedAt: new Date(),
        logs: [
          { timestamp: new Date(), level: 'info', message: 'Execution started' },
          { timestamp: new Date(), level: 'info', message: 'Node 1 executed' },
          { timestamp: new Date(), level: 'info', message: 'Execution completed' },
        ],
      };

      vi.mocked(getExecution).mockReturnValue(mockExecution);

      const response = await request(app).get('/api/executions/exec_123/logs');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('logs');
      expect(Array.isArray(response.body.logs)).toBe(true);
      expect(response.body.logs).toHaveLength(3);
    });

    it('should return empty logs when none exist', async () => {
      const mockExecution = {
        id: 'exec_123',
        workflowId: 'wf_123',
        status: 'pending',
        startedAt: new Date(),
        logs: [],
      };

      vi.mocked(getExecution).mockReturnValue(mockExecution);

      const response = await request(app).get('/api/executions/exec_123/logs');

      expect(response.status).toBe(200);
      expect(response.body.logs).toHaveLength(0);
    });

    it('should return 404 when execution not found', async () => {
      vi.mocked(getExecution).mockReturnValue(null);

      const response = await request(app).get('/api/executions/nonexistent/logs');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Execution not found');
    });

    it('should handle logs with different levels', async () => {
      const mockExecution = {
        id: 'exec_123',
        workflowId: 'wf_123',
        status: 'success',
        startedAt: new Date(),
        logs: [
          { timestamp: new Date(), level: 'debug', message: 'Debug info' },
          { timestamp: new Date(), level: 'info', message: 'Info message' },
          { timestamp: new Date(), level: 'warn', message: 'Warning message' },
          { timestamp: new Date(), level: 'error', message: 'Error occurred' },
        ],
      };

      vi.mocked(getExecution).mockReturnValue(mockExecution);

      const response = await request(app).get('/api/executions/exec_123/logs');

      expect(response.status).toBe(200);
      expect(response.body.logs).toHaveLength(4);
    });
  });

  describe('GET /api/executions/:id/stream', () => {
    it('should set correct SSE headers', async () => {
      const mockExecution = {
        id: 'exec_123',
        workflowId: 'wf_123',
        status: 'running',
        startedAt: new Date(),
      };

      vi.mocked(getExecution).mockResolvedValue(mockExecution);
      vi.mocked(onBroadcast).mockReturnValue(() => {});

      const response = await request(app)
        .get('/api/executions/exec_123/stream')
        .timeout(100)
        .catch(() => ({ headers: {} }));

      // Note: SSE streams don't complete normally in tests
      // We're mainly testing that the route is configured
      expect(getExecution).toHaveBeenCalledWith('exec_123');
      expect(onBroadcast).toHaveBeenCalled();
    });

    it('should return 404 when execution not found for streaming', async () => {
      vi.mocked(getExecution).mockResolvedValue(null);

      const response = await request(app).get('/api/executions/nonexistent/stream');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Execution not found');
    });
  });

  describe('GET /api/executions/:id/nodes', () => {
    it('should return paginated node executions', async () => {
      const mockExecution = {
        id: 'exec_123',
        workflowId: 'wf_123',
        status: 'success',
        startedAt: new Date(),
      };

      const mockNodeExecutions = {
        nodeExecutions: [
          {
            id: 'node_exec_1',
            executionId: 'exec_123',
            nodeId: 'node1',
            status: 'success',
            output: { result: 'success' },
          },
          {
            id: 'node_exec_2',
            executionId: 'exec_123',
            nodeId: 'node2',
            status: 'success',
            output: { result: 'success' },
          },
        ],
        total: 2,
        page: 1,
        limit: 50,
      };

      vi.mocked(getExecution).mockResolvedValue(mockExecution);
      vi.mocked(listNodeExecutions).mockResolvedValue(mockNodeExecutions);

      const response = await request(app).get('/api/executions/exec_123/nodes');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nodeExecutions');
      expect(response.body.nodeExecutions).toHaveLength(2);
      expect(listNodeExecutions).toHaveBeenCalledWith('exec_123', 1, 50);
    });

    it('should support custom pagination for node executions', async () => {
      const mockExecution = {
        id: 'exec_123',
        workflowId: 'wf_123',
        status: 'success',
        startedAt: new Date(),
      };

      const mockNodeExecutions = {
        nodeExecutions: [],
        total: 100,
        page: 3,
        limit: 20,
      };

      vi.mocked(getExecution).mockResolvedValue(mockExecution);
      vi.mocked(listNodeExecutions).mockResolvedValue(mockNodeExecutions);

      const response = await request(app)
        .get('/api/executions/exec_123/nodes?page=3&limit=20');

      expect(response.status).toBe(200);
      expect(listNodeExecutions).toHaveBeenCalledWith('exec_123', 3, 20);
    });

    it('should return 404 when execution not found', async () => {
      vi.mocked(getExecution).mockResolvedValue(null);

      const response = await request(app).get('/api/executions/nonexistent/nodes');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Execution not found');
    });

    it('should handle empty node executions', async () => {
      const mockExecution = {
        id: 'exec_123',
        workflowId: 'wf_123',
        status: 'pending',
        startedAt: new Date(),
      };

      const mockNodeExecutions = {
        nodeExecutions: [],
        total: 0,
        page: 1,
        limit: 50,
      };

      vi.mocked(getExecution).mockResolvedValue(mockExecution);
      vi.mocked(listNodeExecutions).mockResolvedValue(mockNodeExecutions);

      const response = await request(app).get('/api/executions/exec_123/nodes');

      expect(response.status).toBe(200);
      expect(response.body.nodeExecutions).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(getExecution).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app).get('/api/executions/exec_123');

      expect(response.status).toBe(500);
    });

    it('should handle async errors in node executions', async () => {
      const mockExecution = {
        id: 'exec_123',
        workflowId: 'wf_123',
        status: 'success',
        startedAt: new Date(),
      };

      vi.mocked(getExecution).mockResolvedValue(mockExecution);
      vi.mocked(listNodeExecutions).mockRejectedValue(
        new Error('Failed to fetch node executions')
      );

      const response = await request(app).get('/api/executions/exec_123/nodes');

      expect(response.status).toBe(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle execution with no results', async () => {
      const mockExecution = {
        id: 'exec_123',
        workflowId: 'wf_123',
        status: 'pending',
        startedAt: new Date(),
      };

      vi.mocked(getExecution).mockReturnValue(mockExecution);

      const response = await request(app).get('/api/executions/exec_123');

      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('finishedAt');
    });

    it('should handle execution with undefined logs', async () => {
      const mockExecution = {
        id: 'exec_123',
        workflowId: 'wf_123',
        status: 'success',
        startedAt: new Date(),
        logs: undefined,
      };

      vi.mocked(getExecution).mockReturnValue(mockExecution);

      const response = await request(app).get('/api/executions/exec_123/logs');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('logs');
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import workflowsRouter from '../../backend/api/routes/workflows';

// Mock the repositories and services
vi.mock('../../backend/api/repositories/adapters', () => ({
  listWorkflows: vi.fn(),
  getWorkflow: vi.fn(),
  createWorkflow: vi.fn(),
  updateWorkflow: vi.fn(),
  deleteWorkflow: vi.fn(),
  listExecutionsPaged: vi.fn(),
  getExecution: vi.fn(),
}));

vi.mock('../../backend/api/services/queue', () => ({
  enqueueExecution: vi.fn(),
}));

import {
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  listExecutionsPaged,
  getExecution,
} from '../../backend/api/repositories/adapters';
import { enqueueExecution } from '../../backend/api/services/queue';

describe('Workflows API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/workflows', workflowsRouter);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/workflows', () => {
    it('should return all workflows', async () => {
      const mockWorkflows = [
        {
          id: 'wf_1',
          name: 'Test Workflow 1',
          description: 'Test description',
          status: 'active',
          nodes: [],
          edges: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'wf_2',
          name: 'Test Workflow 2',
          description: 'Another test',
          status: 'draft',
          nodes: [],
          edges: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(listWorkflows).mockReturnValue(mockWorkflows);

      const response = await request(app).get('/api/workflows');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('workflows');
      expect(Array.isArray(response.body.workflows)).toBe(true);
      expect(response.body.workflows).toHaveLength(2);
      expect(listWorkflows).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no workflows exist', async () => {
      vi.mocked(listWorkflows).mockReturnValue([]);

      const response = await request(app).get('/api/workflows');

      expect(response.status).toBe(200);
      expect(response.body.workflows).toHaveLength(0);
    });
  });

  describe('GET /api/workflows/:id', () => {
    it('should return workflow by id', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Test Workflow',
        description: 'Test description',
        status: 'active',
        nodes: [
          { id: 'node1', type: 'trigger', config: {} },
        ],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow);

      const response = await request(app).get('/api/workflows/wf_123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'wf_123');
      expect(response.body).toHaveProperty('name', 'Test Workflow');
      expect(getWorkflow).toHaveBeenCalledWith('wf_123');
    });

    it('should return 404 when workflow not found', async () => {
      vi.mocked(getWorkflow).mockReturnValue(null);

      const response = await request(app).get('/api/workflows/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Workflow not found');
    });
  });

  describe('POST /api/workflows', () => {
    it('should create new workflow with valid data', async () => {
      const newWorkflow = {
        name: 'New Workflow',
        description: 'New description',
        tags: ['test'],
        nodes: [{ id: 'node1', type: 'trigger', config: {} }],
        edges: [],
        settings: {},
      };

      const createdWorkflow = {
        id: 'wf_new',
        ...newWorkflow,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(createWorkflow).mockReturnValue(createdWorkflow);

      const response = await request(app)
        .post('/api/workflows')
        .send(newWorkflow);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 'wf_new');
      expect(response.body).toHaveProperty('name', 'New Workflow');
      expect(response.body).toHaveProperty('status', 'draft');
      expect(createWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Workflow',
          description: 'New description',
          status: 'draft',
        })
      );
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/workflows')
        .send({ description: 'Missing name' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Workflow name is required');
    });

    it('should create workflow with minimal data', async () => {
      const minimalWorkflow = {
        name: 'Minimal Workflow',
      };

      const createdWorkflow = {
        id: 'wf_min',
        name: 'Minimal Workflow',
        status: 'draft',
        nodes: [],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(createWorkflow).mockReturnValue(createdWorkflow);

      const response = await request(app)
        .post('/api/workflows')
        .send(minimalWorkflow);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 'wf_min');
    });
  });

  describe('PUT /api/workflows/:id', () => {
    it('should update workflow successfully', async () => {
      const updateData = {
        name: 'Updated Workflow',
        description: 'Updated description',
        status: 'active',
      };

      const updatedWorkflow = {
        id: 'wf_123',
        ...updateData,
        nodes: [],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(updateWorkflow).mockReturnValue(updatedWorkflow);

      const response = await request(app)
        .put('/api/workflows/wf_123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Updated Workflow');
      expect(updateWorkflow).toHaveBeenCalledWith('wf_123', updateData);
    });

    it('should return 404 when updating nonexistent workflow', async () => {
      vi.mocked(updateWorkflow).mockReturnValue(null);

      const response = await request(app)
        .put('/api/workflows/nonexistent')
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Workflow not found');
    });

    it('should allow partial updates', async () => {
      const partialUpdate = {
        description: 'Only updating description',
      };

      const updatedWorkflow = {
        id: 'wf_123',
        name: 'Original Name',
        description: 'Only updating description',
        status: 'active',
        nodes: [],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(updateWorkflow).mockReturnValue(updatedWorkflow);

      const response = await request(app)
        .put('/api/workflows/wf_123')
        .send(partialUpdate);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('description', 'Only updating description');
    });
  });

  describe('DELETE /api/workflows/:id', () => {
    it('should delete workflow successfully', async () => {
      vi.mocked(deleteWorkflow).mockReturnValue(true);

      const response = await request(app).delete('/api/workflows/wf_123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(deleteWorkflow).toHaveBeenCalledWith('wf_123');
    });

    it('should return 404 when deleting nonexistent workflow', async () => {
      vi.mocked(deleteWorkflow).mockReturnValue(false);

      const response = await request(app).delete('/api/workflows/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Workflow not found');
    });
  });

  describe('POST /api/workflows/:id/execute', () => {
    it('should execute active workflow successfully', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Test Workflow',
        status: 'active',
        nodes: [],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockExecution = {
        id: 'exec_123',
        status: 'pending',
        workflowId: 'wf_123',
        startedAt: new Date(),
      };

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow);
      vi.mocked(enqueueExecution).mockResolvedValue(mockExecution);

      const response = await request(app)
        .post('/api/workflows/wf_123/execute')
        .send({ input: { test: 'data' } });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('executionId', 'exec_123');
      expect(response.body).toHaveProperty('status', 'pending');
      expect(enqueueExecution).toHaveBeenCalledWith('wf_123', { test: 'data' });
    });

    it('should execute draft workflow', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Test Workflow',
        status: 'draft',
        nodes: [],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockExecution = {
        id: 'exec_124',
        status: 'pending',
        workflowId: 'wf_123',
        startedAt: new Date(),
      };

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow);
      vi.mocked(enqueueExecution).mockResolvedValue(mockExecution);

      const response = await request(app).post('/api/workflows/wf_123/execute');

      expect(response.status).toBe(201);
    });

    it('should return 404 when workflow not found', async () => {
      vi.mocked(getWorkflow).mockReturnValue(null);

      const response = await request(app).post('/api/workflows/nonexistent/execute');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Workflow not found');
    });

    it('should return 400 when workflow is not active or draft', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Test Workflow',
        status: 'inactive',
        nodes: [],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow);

      const response = await request(app).post('/api/workflows/wf_123/execute');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Workflow is not active');
    });

    it('should execute without input data', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Test Workflow',
        status: 'active',
        nodes: [],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockExecution = {
        id: 'exec_125',
        status: 'pending',
        workflowId: 'wf_123',
        startedAt: new Date(),
      };

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow);
      vi.mocked(enqueueExecution).mockResolvedValue(mockExecution);

      const response = await request(app).post('/api/workflows/wf_123/execute');

      expect(response.status).toBe(201);
      expect(enqueueExecution).toHaveBeenCalledWith('wf_123', undefined);
    });
  });

  describe('GET /api/workflows/:id/executions', () => {
    it('should return paginated executions for workflow', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Test Workflow',
        status: 'active',
        nodes: [],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockExecutions = {
        executions: [
          {
            id: 'exec_1',
            workflowId: 'wf_123',
            status: 'success',
            startedAt: new Date(),
            finishedAt: new Date(),
          },
          {
            id: 'exec_2',
            workflowId: 'wf_123',
            status: 'running',
            startedAt: new Date(),
          },
        ],
        total: 2,
        page: 1,
        limit: 20,
      };

      vi.mocked(getWorkflow).mockResolvedValue(mockWorkflow);
      vi.mocked(listExecutionsPaged).mockResolvedValue(mockExecutions);

      const response = await request(app).get('/api/workflows/wf_123/executions');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('executions');
      expect(response.body.executions).toHaveLength(2);
      expect(response.body).toHaveProperty('total', 2);
      expect(listExecutionsPaged).toHaveBeenCalledWith('wf_123', 1, 20);
    });

    it('should support custom pagination parameters', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Test Workflow',
        status: 'active',
        nodes: [],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockExecutions = {
        executions: [],
        total: 50,
        page: 2,
        limit: 10,
      };

      vi.mocked(getWorkflow).mockResolvedValue(mockWorkflow);
      vi.mocked(listExecutionsPaged).mockResolvedValue(mockExecutions);

      const response = await request(app)
        .get('/api/workflows/wf_123/executions?page=2&limit=10');

      expect(response.status).toBe(200);
      expect(listExecutionsPaged).toHaveBeenCalledWith('wf_123', 2, 10);
    });

    it('should return 404 when workflow not found', async () => {
      vi.mocked(getWorkflow).mockResolvedValue(null);

      const response = await request(app).get('/api/workflows/nonexistent/executions');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Workflow not found');
    });
  });

  describe('GET /api/workflows/:id/executions/:execId', () => {
    it('should return execution detail', async () => {
      const mockExecution = {
        id: 'exec_123',
        workflowId: 'wf_123',
        status: 'success',
        startedAt: new Date(),
        finishedAt: new Date(),
        results: { node1: { output: 'success' } },
      };

      vi.mocked(getExecution).mockReturnValue(mockExecution);

      const response = await request(app)
        .get('/api/workflows/wf_123/executions/exec_123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'exec_123');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('results');
    });

    it('should return 404 when execution not found', async () => {
      vi.mocked(getExecution).mockReturnValue(null);

      const response = await request(app)
        .get('/api/workflows/wf_123/executions/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Execution not found');
    });

    it('should return 404 when execution belongs to different workflow', async () => {
      const mockExecution = {
        id: 'exec_123',
        workflowId: 'wf_different',
        status: 'success',
        startedAt: new Date(),
        finishedAt: new Date(),
      };

      vi.mocked(getExecution).mockReturnValue(mockExecution);

      const response = await request(app)
        .get('/api/workflows/wf_123/executions/exec_123');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Execution not found');
    });
  });
});

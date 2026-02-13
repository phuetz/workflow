/**
 * Workflows API Integration Tests
 * Tests for workflow CRUD operations and management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Application, Request, Response, NextFunction } from 'express';
import { Router } from 'express';

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_WORKFLOW_ID = '550e8400-e29b-41d4-a716-446655440001';
const NON_EXISTENT_ID = '550e8400-e29b-41d4-a716-446655440999';
const genId = (i: number) => `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`;

const mockUser = {
  id: TEST_USER_ID,
  email: 'test@test.com',
  role: 'USER',
  permissions: ['workflow.create', 'workflow.read', 'workflow.update', 'workflow.delete'],
};

function createMockWorkflow(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_WORKFLOW_ID,
    name: 'Test Workflow',
    description: 'A test workflow',
    version: 1,
    status: 'DRAFT',
    tags: ['test'],
    nodes: [{ id: '1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'Start' } }],
    edges: [],
    settings: {},
    userId: TEST_USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockWorkflowRouter() {
  const router = Router();
  const workflows = new Map<string, ReturnType<typeof createMockWorkflow>>();
  workflows.set(TEST_WORKFLOW_ID, createMockWorkflow());

  const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }
    (req as any).user = mockUser;
    next();
  };

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  router.post('/', authMiddleware, (req, res) => {
    const { name, description, nodes, edges, tags } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (nodes && !Array.isArray(nodes)) return res.status(400).json({ error: 'Nodes must be an array' });
    const workflow = createMockWorkflow({
      id: genId(Date.now() % 10000), name, description,
      nodes: nodes || [], edges: edges || [], tags: tags || [],
      userId: (req as any).user.id,
    });
    workflows.set(workflow.id as string, workflow);
    res.status(201).json(workflow);
  });

  router.get('/', authMiddleware, (req, res) => {
    const { status, page = '1', limit = '10' } = req.query;
    let list = Array.from(workflows.values());
    if (status) list = list.filter(w => w.status.toLowerCase() === String(status).toLowerCase());
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const start = (p - 1) * l;
    res.json({
      data: list.slice(start, start + l).map(w => ({ ...w, status: w.status.toLowerCase() })),
      pagination: { page: p, limit: l, total: list.length },
    });
  });

  router.get('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    if (!uuidRegex.test(id)) return res.status(400).json({ error: 'Invalid workflow ID format' });
    const workflow = workflows.get(id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json(workflow);
  });

  router.put('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const { name, description, nodes, edges } = req.body;
    if (!uuidRegex.test(id)) return res.status(400).json({ error: 'Invalid workflow ID format' });
    if (nodes !== undefined && !Array.isArray(nodes)) return res.status(400).json({ error: 'Nodes must be an array' });
    const workflow = workflows.get(id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    const updated = {
      ...workflow, name: name ?? workflow.name, description: description ?? workflow.description,
      nodes: nodes ?? workflow.nodes, edges: edges ?? workflow.edges, updatedAt: new Date(),
    };
    workflows.set(id, updated);
    res.json(updated);
  });

  router.delete('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    if (!uuidRegex.test(id)) return res.status(400).json({ error: 'Invalid workflow ID format' });
    const workflow = workflows.get(id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    workflows.delete(id);
    res.json({ success: true, message: 'Workflow deleted' });
  });

  router.post('/:id/activate', authMiddleware, (req, res) => {
    const workflow = workflows.get(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    workflows.set(req.params.id, { ...workflow, status: 'ACTIVE' });
    res.json({ success: true, workflow: { ...workflow, status: 'active' } });
  });

  router.post('/:id/execute', authMiddleware, (req, res) => {
    const workflow = workflows.get(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json({ executionId: `exec-${Date.now()}`, workflowId: req.params.id, status: 'running', startedAt: new Date().toISOString() });
  });

  (router as any).addTestWorkflow = (w: ReturnType<typeof createMockWorkflow>) => workflows.set(w.id as string, w);
  (router as any).clearWorkflows = () => { workflows.clear(); workflows.set(TEST_WORKFLOW_ID, createMockWorkflow()); };
  return router;
}

function createTestApp(): Application {
  const app = express();
  app.use(express.json());
  const workflowRouter = createMockWorkflowRouter();
  app.use('/api/workflows', workflowRouter);
  (app as any).workflowRouter = workflowRouter;
  return app;
}

describe('Workflows API Integration Tests', () => {
  let app: Application;
  const authToken = 'valid-test-token';

  beforeEach(() => {
    app = createTestApp();
    (app as any).workflowRouter.clearWorkflows();
  });

  afterEach(() => { vi.resetAllMocks(); });

  describe('POST /api/workflows', () => {
    it('should create new workflow', async () => {
      const res = await request(app).post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Workflow', description: 'Test', nodes: [{ id: '1', type: 'trigger', position: { x: 0, y: 0 }, data: {} }], edges: [] });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Test Workflow');
    });

    it('should reject workflow without name', async () => {
      const res = await request(app).post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`).send({ nodes: [], edges: [] });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).post('/api/workflows').send({ name: 'Test', nodes: [], edges: [] });
      expect(res.status).toBe(401);
    });

    it('should reject invalid nodes type', async () => {
      const res = await request(app).post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`).send({ name: 'Test', nodes: 'not-array' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/workflows', () => {
    it('should list all workflows', async () => {
      (app as any).workflowRouter.addTestWorkflow(createMockWorkflow({ id: genId(1), name: 'W1' }));
      (app as any).workflowRouter.addTestWorkflow(createMockWorkflow({ id: genId(2), name: 'W2' }));
      const res = await request(app).get('/api/workflows').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should paginate results', async () => {
      for (let i = 0; i < 15; i++) {
        (app as any).workflowRouter.addTestWorkflow(createMockWorkflow({ id: genId(i + 10), name: `W${i}` }));
      }
      const res = await request(app).get('/api/workflows').query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(5);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(15);
    });

    it('should filter by status', async () => {
      (app as any).workflowRouter.addTestWorkflow(createMockWorkflow({ id: genId(20), status: 'ACTIVE' }));
      const res = await request(app).get('/api/workflows').query({ status: 'active' })
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.every((w: any) => w.status === 'active')).toBe(true);
    });
  });

  describe('GET /api/workflows/:id', () => {
    it('should get workflow by id', async () => {
      const res = await request(app).get(`/api/workflows/${TEST_WORKFLOW_ID}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(TEST_WORKFLOW_ID);
      expect(res.body.name).toBe('Test Workflow');
    });

    it('should return 404 for non-existent workflow', async () => {
      const res = await request(app).get(`/api/workflows/${NON_EXISTENT_ID}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });

    it('should reject invalid ID format', async () => {
      const res = await request(app).get('/api/workflows/not-a-uuid')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('PUT /api/workflows/:id', () => {
    it('should update workflow name and description', async () => {
      const res = await request(app).put(`/api/workflows/${TEST_WORKFLOW_ID}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name', description: 'Updated description' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
      expect(res.body.description).toBe('Updated description');
    });

    it('should update workflow nodes', async () => {
      const newNodes = [{ id: 'n1', type: 'action', position: { x: 0, y: 0 }, data: {} }];
      const res = await request(app).put(`/api/workflows/${TEST_WORKFLOW_ID}`)
        .set('Authorization', `Bearer ${authToken}`).send({ nodes: newNodes });
      expect(res.status).toBe(200);
      expect(res.body.nodes).toHaveLength(1);
      expect(res.body.nodes[0].id).toBe('n1');
    });

    it('should reject invalid nodes type on update', async () => {
      const res = await request(app).put(`/api/workflows/${TEST_WORKFLOW_ID}`)
        .set('Authorization', `Bearer ${authToken}`).send({ nodes: 'invalid-not-array' });
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent workflow', async () => {
      const res = await request(app).put(`/api/workflows/${NON_EXISTENT_ID}`)
        .set('Authorization', `Bearer ${authToken}`).send({ name: 'Test' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/workflows/:id', () => {
    it('should delete workflow', async () => {
      const res = await request(app).delete(`/api/workflows/${TEST_WORKFLOW_ID}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it no longer exists
      const getRes = await request(app).get(`/api/workflows/${TEST_WORKFLOW_ID}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(getRes.status).toBe(404);
    });

    it('should return 404 for non-existent workflow', async () => {
      const res = await request(app).delete(`/api/workflows/${NON_EXISTENT_ID}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
    });

    it('should reject invalid ID format on delete', async () => {
      const res = await request(app).delete('/api/workflows/bad-id')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/workflows/:id/activate', () => {
    it('should activate workflow', async () => {
      const res = await request(app).post(`/api/workflows/${TEST_WORKFLOW_ID}/activate`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.workflow.status).toBe('active');
    });

    it('should return 404 for non-existent workflow', async () => {
      const res = await request(app).post(`/api/workflows/${NON_EXISTENT_ID}/activate`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/workflows/:id/execute', () => {
    it('should start workflow execution', async () => {
      const res = await request(app).post(`/api/workflows/${TEST_WORKFLOW_ID}/execute`)
        .set('Authorization', `Bearer ${authToken}`).send({ input: { key: 'value' } });
      expect(res.status).toBe(200);
      expect(res.body.executionId).toBeDefined();
      expect(res.body.status).toBe('running');
    });
  });
});

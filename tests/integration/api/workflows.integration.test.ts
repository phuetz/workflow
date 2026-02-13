/**
 * Integration Tests: Workflows API
 * Tests for workflow CRUD operations and management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ApiClient } from '../../utils/api-client';
import { UserFactory, WorkflowFactory, TeamFactory } from '../../factories';
import { TestAssertions } from '../../utils/assertions';
import { WorkflowStatus } from '@prisma/client';

describe('Workflows API Integration Tests', () => {
  let apiClient: ApiClient;
  let adminUser: Awaited<ReturnType<typeof UserFactory.create>>;
  let regularUser: Awaited<ReturnType<typeof UserFactory.create>>;

  beforeEach(async () => {
    apiClient = new ApiClient();
    adminUser = await UserFactory.createAdmin({ password: 'Admin123!' });
    regularUser = await UserFactory.create({ password: 'User123!' });
  });

  describe('GET /api/v1/workflows', () => {
    it('should return user workflows', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      // Create some workflows
      await WorkflowFactory.createMany(adminUser.id, 3);

      const response = await apiClient.get('/api/v1/workflows');

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.workflows).toBeInstanceOf(Array);
      expect(response.data.workflows.length).toBeGreaterThanOrEqual(3);
      response.data.workflows.forEach((workflow: unknown) => {
        TestAssertions.assertValidWorkflow(workflow);
      });
    });

    it('should filter workflows by status', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      await WorkflowFactory.createActive(adminUser.id);
      await WorkflowFactory.createDraft(adminUser.id);
      await WorkflowFactory.createPaused(adminUser.id);

      const response = await apiClient.get('/api/v1/workflows', {
        status: WorkflowStatus.ACTIVE
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.workflows).toBeInstanceOf(Array);
      expect(response.data.workflows.every((w: { status: string }) => w.status === WorkflowStatus.ACTIVE)).toBe(true);
    });

    it('should paginate workflows', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      await WorkflowFactory.createMany(adminUser.id, 15);

      const response = await apiClient.get('/api/v1/workflows', {
        page: '1',
        limit: '10'
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.workflows.length).toBe(10);
      expect(response.data.pagination).toBeDefined();
      expect(response.data.pagination.total).toBeGreaterThanOrEqual(15);
      expect(response.data.pagination.page).toBe(1);
      expect(response.data.pagination.limit).toBe(10);
    });

    it('should search workflows by name', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      await WorkflowFactory.create(adminUser.id, { name: 'Special Search Workflow' });
      await WorkflowFactory.create(adminUser.id, { name: 'Regular Workflow' });

      const response = await apiClient.get('/api/v1/workflows', {
        search: 'Special'
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.workflows.some((w: { name: string }) => w.name.includes('Special'))).toBe(true);
    });

    it('should require authentication', async () => {
      apiClient.clearAuthToken();

      const response = await apiClient.get('/api/v1/workflows');

      TestAssertions.assertErrorResponse(response, 401);
    });
  });

  describe('POST /api/v1/workflows', () => {
    it('should create a new workflow', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      const workflowData = {
        name: 'Test Workflow',
        description: 'A test workflow',
        nodes: [
          {
            id: 'node-1',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: { label: 'Start', nodeType: 'manual' }
          }
        ],
        edges: [],
        tags: ['test']
      };

      const response = await apiClient.post('/api/v1/workflows', workflowData);

      TestAssertions.assertSuccessResponse(response);
      TestAssertions.assertValidWorkflow(response.data.workflow);
      expect(response.data.workflow.name).toBe(workflowData.name);
      expect(response.data.workflow.userId).toBe(adminUser.id);
      expect(response.data.workflow.status).toBe(WorkflowStatus.DRAFT);
    });

    it('should reject workflow without name', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      const response = await apiClient.post('/api/v1/workflows', {
        nodes: [],
        edges: []
      });

      TestAssertions.assertErrorResponse(response, 400);
    });

    it('should validate workflow structure', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      const response = await apiClient.post('/api/v1/workflows', {
        name: 'Invalid Workflow',
        nodes: 'not-an-array', // Invalid
        edges: []
      });

      TestAssertions.assertErrorResponse(response, 400);
    });

    it('should create workflow with team', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      const team = await TeamFactory.create(adminUser.id);

      const response = await apiClient.post('/api/v1/workflows', {
        name: 'Team Workflow',
        description: 'Workflow for team',
        teamId: team.id,
        nodes: [],
        edges: []
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.workflow.teamId).toBe(team.id);
    });
  });

  describe('GET /api/v1/workflows/:id', () => {
    it('should return workflow by ID', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      const workflow = await WorkflowFactory.create(adminUser.id);

      const response = await apiClient.get(`/api/v1/workflows/${workflow.id}`);

      TestAssertions.assertSuccessResponse(response);
      TestAssertions.assertValidWorkflow(response.data.workflow);
      expect(response.data.workflow.id).toBe(workflow.id);
    });

    it('should return 404 for non-existent workflow', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      const response = await apiClient.get('/api/v1/workflows/non-existent-id');

      TestAssertions.assertErrorResponse(response, 404);
    });

    it('should not return workflows of other users', async () => {
      await apiClient.login(regularUser.email, 'User123!');

      const workflow = await WorkflowFactory.create(adminUser.id);

      const response = await apiClient.get(`/api/v1/workflows/${workflow.id}`);

      TestAssertions.assertErrorResponse(response, 403);
    });

    it('should include execution statistics', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      const workflow = await WorkflowFactory.create(adminUser.id);

      const response = await apiClient.get(`/api/v1/workflows/${workflow.id}`, {
        include: 'stats'
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.workflow.stats).toBeDefined();
      expect(response.data.workflow.stats).toHaveProperty('totalExecutions');
      expect(response.data.workflow.stats).toHaveProperty('successRate');
    });
  });

  describe('PATCH /api/v1/workflows/:id', () => {
    it('should update workflow', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      const workflow = await WorkflowFactory.create(adminUser.id, {
        name: 'Original Name'
      });

      const response = await apiClient.patch(`/api/v1/workflows/${workflow.id}`, {
        name: 'Updated Name',
        description: 'Updated description'
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.workflow.name).toBe('Updated Name');
      expect(response.data.workflow.description).toBe('Updated description');
      expect(response.data.workflow.version).toBeGreaterThan(workflow.version);
    });

    it('should update workflow nodes and edges', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      const workflow = await WorkflowFactory.create(adminUser.id);

      const newNodes = [
        {
          id: 'node-1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'New Start' }
        },
        {
          id: 'node-2',
          type: 'action',
          position: { x: 300, y: 100 },
          data: { label: 'New Action' }
        }
      ];

      const newEdges = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' }
      ];

      const response = await apiClient.patch(`/api/v1/workflows/${workflow.id}`, {
        nodes: newNodes,
        edges: newEdges
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.workflow.nodes).toHaveLength(2);
      expect(response.data.workflow.edges).toHaveLength(1);
    });

    it('should not update workflow of another user', async () => {
      await apiClient.login(regularUser.email, 'User123!');

      const workflow = await WorkflowFactory.create(adminUser.id);

      const response = await apiClient.patch(`/api/v1/workflows/${workflow.id}`, {
        name: 'Unauthorized Update'
      });

      TestAssertions.assertErrorResponse(response, 403);
    });

    it('should create version history on update', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      const workflow = await WorkflowFactory.create(adminUser.id);
      const originalVersion = workflow.version;

      await apiClient.patch(`/api/v1/workflows/${workflow.id}`, {
        name: 'Updated v2'
      });

      await apiClient.patch(`/api/v1/workflows/${workflow.id}`, {
        name: 'Updated v3'
      });

      const response = await apiClient.get(`/api/v1/workflows/${workflow.id}/versions`);

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.versions).toBeInstanceOf(Array);
      expect(response.data.versions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('DELETE /api/v1/workflows/:id', () => {
    it('should delete workflow', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      const workflow = await WorkflowFactory.create(adminUser.id);

      const response = await apiClient.delete(`/api/v1/workflows/${workflow.id}`);

      TestAssertions.assertSuccessResponse(response);

      // Verify workflow is deleted
      const getResponse = await apiClient.get(`/api/v1/workflows/${workflow.id}`);
      TestAssertions.assertErrorResponse(getResponse, 404);
    });

    it('should not delete workflow of another user', async () => {
      await apiClient.login(regularUser.email, 'User123!');

      const workflow = await WorkflowFactory.create(adminUser.id);

      const response = await apiClient.delete(`/api/v1/workflows/${workflow.id}`);

      TestAssertions.assertErrorResponse(response, 403);
    });

    it('should soft delete by default', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      const workflow = await WorkflowFactory.create(adminUser.id);

      await apiClient.delete(`/api/v1/workflows/${workflow.id}`);

      // Should be in trash/archived
      const response = await apiClient.get('/api/v1/workflows', {
        status: WorkflowStatus.ARCHIVED
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.workflows.some((w: { id: string }) => w.id === workflow.id)).toBe(true);
    });
  });

  describe('POST /api/v1/workflows/:id/activate', () => {
    it('should activate workflow', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      const workflow = await WorkflowFactory.createDraft(adminUser.id);

      const response = await apiClient.post(`/api/v1/workflows/${workflow.id}/activate`);

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.workflow.status).toBe(WorkflowStatus.ACTIVE);
    });

    it('should validate workflow before activation', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      // Create invalid workflow (no trigger)
      const workflow = await WorkflowFactory.create(adminUser.id, {
        nodes: [],
        edges: []
      });

      const response = await apiClient.post(`/api/v1/workflows/${workflow.id}/activate`);

      TestAssertions.assertErrorResponse(response, 400);
      expect(response.error?.message).toContain('validation');
    });
  });

  describe('POST /api/v1/workflows/:id/deactivate', () => {
    it('should deactivate workflow', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      const workflow = await WorkflowFactory.createActive(adminUser.id);

      const response = await apiClient.post(`/api/v1/workflows/${workflow.id}/deactivate`);

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.workflow.status).toBe(WorkflowStatus.PAUSED);
    });
  });

  describe('POST /api/v1/workflows/:id/duplicate', () => {
    it('should duplicate workflow', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      const workflow = await WorkflowFactory.create(adminUser.id, {
        name: 'Original Workflow'
      });

      const response = await apiClient.post(`/api/v1/workflows/${workflow.id}/duplicate`);

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.workflow.name).toContain('Original Workflow');
      expect(response.data.workflow.name).toContain('Copy');
      expect(response.data.workflow.id).not.toBe(workflow.id);
      expect(response.data.workflow.nodes).toEqual(workflow.nodes);
      expect(response.data.workflow.edges).toEqual(workflow.edges);
    });
  });

  describe('POST /api/v1/workflows/:id/share', () => {
    it('should share workflow with user', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      const workflow = await WorkflowFactory.create(adminUser.id);

      const response = await apiClient.post(`/api/v1/workflows/${workflow.id}/share`, {
        userId: regularUser.id,
        permission: 'READ'
      });

      TestAssertions.assertSuccessResponse(response);

      // Verify user can access shared workflow
      const userClient = new ApiClient();
      await userClient.login(regularUser.email, 'User123!');

      const getResponse = await userClient.get(`/api/v1/workflows/${workflow.id}`);
      TestAssertions.assertSuccessResponse(getResponse);
    });

    it('should support different permission levels', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      const workflow = await WorkflowFactory.create(adminUser.id);

      const readResponse = await apiClient.post(`/api/v1/workflows/${workflow.id}/share`, {
        userId: regularUser.id,
        permission: 'READ'
      });

      TestAssertions.assertSuccessResponse(readResponse);

      // Verify user cannot edit
      const userClient = new ApiClient();
      await userClient.login(regularUser.email, 'User123!');

      const updateResponse = await userClient.patch(`/api/v1/workflows/${workflow.id}`, {
        name: 'Unauthorized Update'
      });

      TestAssertions.assertErrorResponse(updateResponse, 403);
    });
  });

  describe('GET /api/v1/workflows/:id/executions', () => {
    it('should return workflow executions', async () => {
      await apiClient.login(adminUser.email, 'Admin123!');

      const workflow = await WorkflowFactory.create(adminUser.id);

      const response = await apiClient.get(`/api/v1/workflows/${workflow.id}/executions`);

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.executions).toBeInstanceOf(Array);
    });
  });
});

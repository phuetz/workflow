/**
 * Asana Integration Tests
 * Tests for Asana REST API v1.0 client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AsanaClient } from '../../integrations/asana/AsanaClient';
import type { AsanaCredentials } from '../../integrations/asana/asana.types';

describe('Asana Integration', () => {
  let client: AsanaClient;
  const mockCredentials: AsanaCredentials = {
    accessToken: 'asana-pat-1234567890',
    workspaceGid: 'workspace-123',
  };

  beforeEach(() => {
    client = new AsanaClient(mockCredentials);
    global.fetch = vi.fn();
  });

  describe('createTask', () => {
    it('should create a new task', async () => {
      const mockTask = {
        gid: 'task-123',
        resource_type: 'task' as const,
        name: 'Complete project documentation',
        notes: 'Write comprehensive docs',
        completed: false,
        created_at: '2025-01-15T10:00:00.000Z',
        modified_at: '2025-01-15T10:00:00.000Z',
        num_hearts: 0,
        permalink_url: 'https://app.asana.com/0/project/task-123',
        workspace: {
          gid: 'workspace-123',
          resource_type: 'workspace' as const,
          name: 'My Workspace',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: mockTask }),
      });

      const result = await client.createTask({
        name: 'Complete project documentation',
        notes: 'Write comprehensive docs',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.gid).toBe('task-123');
      expect(result.data?.name).toBe('Complete project documentation');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toBe('https://app.asana.com/api/1.0/tasks');
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].headers.Authorization).toBe('Bearer asana-pat-1234567890');
    });

    it('should use default workspace from credentials', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { gid: 'task-123' } }),
      });

      await client.createTask({
        name: 'Test Task',
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.data.workspace).toBe('workspace-123');
    });

    it('should support assignee', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { gid: 'task-123' } }),
      });

      await client.createTask({
        name: 'Assigned Task',
        assignee: 'user-456',
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.data.assignee).toBe('user-456');
    });

    it('should support due date', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { gid: 'task-123' } }),
      });

      await client.createTask({
        name: 'Task with deadline',
        due_on: '2025-01-31',
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.data.due_on).toBe('2025-01-31');
    });

    it('should support adding to projects', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { gid: 'task-123' } }),
      });

      await client.createTask({
        name: 'Project Task',
        projects: ['project-1', 'project-2'],
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.data.projects).toEqual(['project-1', 'project-2']);
    });
  });

  describe('updateTask', () => {
    it('should update a task', async () => {
      const mockTask = {
        gid: 'task-123',
        resource_type: 'task' as const,
        name: 'Updated task name',
        completed: true,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockTask }),
      });

      const result = await client.updateTask('task-123', {
        name: 'Updated task name',
        completed: true,
      });

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe('Updated task name');
      expect(result.data?.completed).toBe(true);

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/tasks/task-123');
      expect(callArgs[1].method).toBe('PUT');
    });

    it('should support partial updates', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { gid: 'task-123' } }),
      });

      await client.updateTask('task-123', {
        notes: 'Updated notes',
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.data.notes).toBe('Updated notes');
    });

    it('should mark task as completed', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { gid: 'task-123', completed: true } }),
      });

      const result = await client.updateTask('task-123', {
        completed: true,
      });

      expect(result.ok).toBe(true);
    });
  });

  describe('getTask', () => {
    it('should retrieve a task', async () => {
      const mockTask = {
        gid: 'task-123',
        resource_type: 'task' as const,
        name: 'My Task',
        notes: 'Task notes',
        completed: false,
        assignee: {
          gid: 'user-456',
          resource_type: 'user' as const,
          name: 'John Doe',
          email: 'john@example.com',
        },
        due_on: '2025-01-31',
        projects: [
          {
            gid: 'project-1',
            resource_type: 'project' as const,
            name: 'Q1 Project',
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockTask }),
      });

      const result = await client.getTask('task-123');

      expect(result.ok).toBe(true);
      expect(result.data?.gid).toBe('task-123');
      expect(result.data?.name).toBe('My Task');
      expect(result.data?.assignee?.name).toBe('John Doe');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/tasks/task-123');
      expect(callArgs[0]).toContain('opt_fields=');
    });

    it('should request specific fields', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { gid: 'task-123' } }),
      });

      await client.getTask('task-123');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('name');
      expect(callArgs[0]).toContain('notes');
      expect(callArgs[0]).toContain('completed');
      expect(callArgs[0]).toContain('assignee');
      expect(callArgs[0]).toContain('projects');
      expect(callArgs[0]).toContain('tags');
      expect(callArgs[0]).toContain('custom_fields');
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: {} }),
      });

      const result = await client.deleteTask('task-123');

      expect(result.ok).toBe(true);

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/tasks/task-123');
      expect(callArgs[1].method).toBe('DELETE');
    });
  });

  describe('searchTasks', () => {
    it('should search tasks by project', async () => {
      const mockTasks = [
        {
          gid: 'task-1',
          resource_type: 'task' as const,
          name: 'Task 1',
        },
        {
          gid: 'task-2',
          resource_type: 'task' as const,
          name: 'Task 2',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockTasks }),
      });

      const result = await client.searchTasks({
        project: 'project-123',
      });

      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].gid).toBe('task-1');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('project=project-123');
    });

    it('should search tasks by assignee', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await client.searchTasks({
        assignee: 'user-456',
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('assignee=user-456');
    });

    it('should search with multiple filters', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await client.searchTasks({
        project: 'project-123',
        assignee: 'user-456',
        workspace: 'workspace-789',
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('project=project-123');
      expect(callArgs[0]).toContain('assignee=user-456');
      expect(callArgs[0]).toContain('workspace=workspace-789');
    });
  });

  describe('Project Operations', () => {
    it('should create a project', async () => {
      const mockProject = {
        gid: 'project-123',
        resource_type: 'project' as const,
        name: 'Q1 Marketing Campaign',
        notes: 'Campaign notes',
        archived: false,
        public: false,
        created_at: '2025-01-15T10:00:00.000Z',
        modified_at: '2025-01-15T10:00:00.000Z',
        workspace: {
          gid: 'workspace-123',
          resource_type: 'workspace' as const,
          name: 'My Workspace',
        },
        permalink_url: 'https://app.asana.com/0/project-123',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: mockProject }),
      });

      const result = await client.createProject({
        name: 'Q1 Marketing Campaign',
        notes: 'Campaign notes',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.gid).toBe('project-123');
      expect(result.data?.name).toBe('Q1 Marketing Campaign');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toBe('https://app.asana.com/api/1.0/projects');
      expect(callArgs[1].method).toBe('POST');
    });

    it('should support project color', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { gid: 'project-123' } }),
      });

      await client.createProject({
        name: 'Colored Project',
        color: 'light-blue',
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.data.color).toBe('light-blue');
    });

    it('should get a project', async () => {
      const mockProject = {
        gid: 'project-123',
        resource_type: 'project' as const,
        name: 'My Project',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockProject }),
      });

      const result = await client.getProject('project-123');

      expect(result.ok).toBe(true);
      expect(result.data?.gid).toBe('project-123');
    });

    it('should update a project', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { gid: 'project-123', name: 'Updated Project' },
        }),
      });

      const result = await client.updateProject('project-123', {
        name: 'Updated Project',
      });

      expect(result.ok).toBe(true);

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/projects/project-123');
      expect(callArgs[1].method).toBe('PUT');
    });
  });

  describe('addComment', () => {
    it('should add a comment to a task', async () => {
      const mockComment = {
        gid: 'story-123',
        resource_type: 'story' as const,
        created_at: '2025-01-15T10:00:00.000Z',
        created_by: {
          gid: 'user-123',
          resource_type: 'user' as const,
          name: 'Alice Smith',
        },
        text: 'Great progress on this task!',
        html_text: '<body>Great progress on this task!</body>',
        type: 'comment',
        is_pinned: false,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: mockComment }),
      });

      const result = await client.addComment('task-123', 'Great progress on this task!');

      expect(result.ok).toBe(true);
      expect(result.data?.text).toBe('Great progress on this task!');
      expect(result.data?.resource_type).toBe('story');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/tasks/task-123/stories');
      expect(callArgs[1].method).toBe('POST');
    });
  });

  describe('Workspace Operations', () => {
    it('should get tags for workspace', async () => {
      const mockTags = [
        {
          gid: 'tag-1',
          resource_type: 'tag',
          name: 'urgent',
        },
        {
          gid: 'tag-2',
          resource_type: 'tag',
          name: 'bug',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTags }),
      });

      const result = await client.getTags();

      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(2);

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/workspaces/workspace-123/tags');
    });

    it('should get users for workspace', async () => {
      const mockUsers = [
        {
          gid: 'user-1',
          resource_type: 'user',
          name: 'Alice',
        },
        {
          gid: 'user-2',
          resource_type: 'user',
          name: 'Bob',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockUsers }),
      });

      const result = await client.getUsers();

      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(2);

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/workspaces/workspace-123/users');
    });

    it('should get teams for organization', async () => {
      const mockTeams = [
        {
          gid: 'team-1',
          resource_type: 'team',
          name: 'Engineering',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTeams }),
      });

      const result = await client.getTeams();

      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(1);

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/organizations/workspace-123/teams');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          errors: [
            {
              message: 'Invalid authentication credentials',
            },
          ],
        }),
      });

      const result = await client.getTask('task-123');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Invalid authentication credentials');
    });

    it('should handle not found errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          errors: [
            {
              message: 'Task not found',
            },
          ],
        }),
      });

      const result = await client.getTask('invalid-task');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Task not found');
    });

    it('should handle rate limiting', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          errors: [
            {
              message: 'Rate limit exceeded',
            },
          ],
        }),
      });

      const result = await client.searchTasks({});

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await client.getTask('task-123');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle malformed error responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await client.getTask('task-123');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('500');
    });
  });

  describe('Request Format', () => {
    it('should wrap request body in data property', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { gid: 'task-123' } }),
      });

      await client.createTask({
        name: 'Test Task',
        notes: 'Task notes',
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('name');
      expect(body.data.name).toBe('Test Task');
    });

    it('should include Content-Type header', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      await client.createTask({ name: 'Test' });

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].headers['Content-Type']).toBe('application/json');
    });
  });
});

/** ClickUp Integration Tests */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClickUpClient } from '../../integrations/clickup/ClickUpClient';
import type { ClickUpCredentials } from '../../integrations/clickup/clickup.types';

describe('ClickUp Integration', () => {
  let client: ClickUpClient;
  const mockCredentials: ClickUpCredentials = {
    apiToken: 'pk_test_token',
    teamId: 'team123',
  };

  beforeEach(() => {
    client = new ClickUpClient(mockCredentials);
    global.fetch = vi.fn();
  });

  describe('createTask', () => {
    it('should create a new task', async () => {
      const mockTask = {
        id: '9hz',
        name: 'New Task',
        status: { status: 'to do', color: '#d3d3d3', type: 'open', orderindex: 0 },
        date_created: '1567780450202',
        creator: { id: 123, username: 'John', email: 'john@company.com' },
        url: 'https://app.clickup.com/t/9hz',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTask,
      });

      const result = await client.createTask('list123', {
        list_id: 'list123',
        name: 'New Task',
        description: 'Task description',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe('New Task');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.clickup.com/api/v2/list/list123/task',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'pk_test_token',
          }),
        })
      );
    });
  });

  describe('updateTask', () => {
    it('should update an existing task', async () => {
      const mockTask = {
        id: '9hz',
        name: 'Updated Task',
        status: { status: 'in progress' },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTask,
      });

      const result = await client.updateTask('9hz', {
        name: 'Updated Task',
        status: 'in progress',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe('Updated Task');
    });
  });

  describe('getTask', () => {
    it('should retrieve a task by ID', async () => {
      const mockTask = {
        id: '9hz',
        name: 'Test Task',
        description: 'Task description',
        status: { status: 'to do' },
        priority: { id: '1', priority: 'urgent', color: '#f50000' },
        assignees: [
          { id: 123, username: 'John', email: 'john@company.com' },
        ],
        due_date: '1567780450202',
        url: 'https://app.clickup.com/t/9hz',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTask,
      });

      const result = await client.getTask('9hz');

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe('Test Task');
      expect(result.data?.assignees).toHaveLength(1);
    });

    it('should retrieve task with subtasks', async () => {
      const mockTask = {
        id: '9hz',
        name: 'Parent Task',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTask,
      });

      const result = await client.getTask('9hz', true);

      expect(result.ok).toBe(true);
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('include_subtasks=true');
    });
  });

  describe('getTasks', () => {
    it('should retrieve tasks from a list', async () => {
      const mockResponse = {
        tasks: [
          { id: '9hz', name: 'Task 1' },
          { id: '9hx', name: 'Task 2' },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.getTasks('list123');

      expect(result.ok).toBe(true);
      expect(result.data?.tasks).toHaveLength(2);
    });

    it('should support filtering tasks', async () => {
      const mockResponse = {
        tasks: [{ id: '9hz', name: 'Urgent Task' }],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.getTasks('list123', {
        statuses: ['in progress'],
        assignees: [123],
        tags: ['urgent'],
      });

      expect(result.ok).toBe(true);
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('statuses%5B%5D=in+progress');
    });
  });

  describe('createList', () => {
    it('should create a new list', async () => {
      const mockList = {
        id: 'list123',
        name: 'New List',
        orderindex: 0,
        content: 'List description',
        folder: { id: 'folder123', name: 'Folder' },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockList,
      });

      const result = await client.createList('folder123', 'New List', 'List description');

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe('New List');
    });
  });

  describe('createComment', () => {
    it('should create a comment on a task', async () => {
      const mockComment = {
        id: 'comment123',
        comment_text: 'This is a comment',
        user: { id: 123, username: 'John' },
        date: '1567780450202',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockComment,
      });

      const result = await client.createComment('9hz', 'This is a comment');

      expect(result.ok).toBe(true);
      expect(result.data?.comment_text).toBe('This is a comment');
    });

    it('should support assigning comments', async () => {
      const mockComment = {
        id: 'comment123',
        comment_text: 'Task for you',
        assignee: { id: 456 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockComment,
      });

      const result = await client.createComment('9hz', 'Task for you', 456);

      expect(result.ok).toBe(true);
      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.assignee).toBe(456);
    });
  });

  describe('getSpaces', () => {
    it('should retrieve team spaces', async () => {
      const mockResponse = {
        spaces: [
          { id: 'space123', name: 'Marketing' },
          { id: 'space456', name: 'Engineering' },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.getSpaces();

      expect(result.ok).toBe(true);
      expect(result.data?.spaces).toHaveLength(2);
    });

    it('should use team ID from credentials', async () => {
      const mockResponse = { spaces: [] };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await client.getSpaces();

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('team/team123/space');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const result = await client.getTask('9hz');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('401');
    });

    it('should handle not found errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Task not found',
      });

      const result = await client.getTask('invalid');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('404');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await client.getTask('9hz');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle rate limiting', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      const result = await client.getTask('9hz');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('429');
    });
  });
});

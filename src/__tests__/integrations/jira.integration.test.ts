/** Jira Integration Tests */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JiraClient } from '../../integrations/jira/JiraClient';
import type { JiraCredentials } from '../../integrations/jira/jira.types';

describe('Jira Integration', () => {
  let client: JiraClient;
  const mockCredentials: JiraCredentials = {
    domain: 'test.atlassian.net',
    email: 'test@example.com',
    apiToken: 'test-api-token',
  };

  beforeEach(() => {
    client = new JiraClient(mockCredentials);
    global.fetch = vi.fn();
  });

  describe('createIssue', () => {
    it('should create a new issue', async () => {
      const mockIssue = {
        id: '10001',
        key: 'PROJ-123',
        self: 'https://test.atlassian.net/rest/api/3/issue/10001',
        fields: {
          summary: 'Test issue',
          description: 'Test description',
          issuetype: { id: '1', name: 'Task' },
          project: { id: '10000', key: 'PROJ', name: 'Test Project' },
          status: { id: '1', name: 'To Do' },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockIssue,
      });

      const result = await client.createIssue({
        fields: {
          project: { key: 'PROJ' },
          issuetype: { name: 'Task' },
          summary: 'Test issue',
        },
      });

      expect(result.ok).toBe(true);
      expect(result.data?.key).toBe('PROJ-123');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.atlassian.net/rest/api/3/issue',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('updateIssue', () => {
    it('should update an existing issue', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await client.updateIssue('PROJ-123', {
        fields: {
          summary: 'Updated summary',
        },
      });

      expect(result.ok).toBe(true);
    });
  });

  describe('getIssue', () => {
    it('should retrieve an issue', async () => {
      const mockIssue = {
        id: '10001',
        key: 'PROJ-123',
        fields: {
          summary: 'Test issue',
          status: { name: 'In Progress' },
          assignee: {
            accountId: 'abc123',
            displayName: 'John Doe',
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockIssue,
      });

      const result = await client.getIssue('PROJ-123');

      expect(result.ok).toBe(true);
      expect(result.data?.key).toBe('PROJ-123');
      expect(result.data?.fields.summary).toBe('Test issue');
    });

    it('should retrieve issue with specific fields', async () => {
      const mockIssue = {
        id: '10001',
        key: 'PROJ-123',
        fields: {
          summary: 'Test issue',
          status: { name: 'Done' },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockIssue,
      });

      const result = await client.getIssue('PROJ-123', ['summary', 'status']);

      expect(result.ok).toBe(true);
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('fields=');
    });
  });

  describe('searchIssues', () => {
    it('should search issues with JQL', async () => {
      const mockSearchResponse = {
        startAt: 0,
        maxResults: 50,
        total: 2,
        issues: [
          { id: '10001', key: 'PROJ-123', fields: { summary: 'Issue 1' } },
          { id: '10002', key: 'PROJ-124', fields: { summary: 'Issue 2' } },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSearchResponse,
      });

      const result = await client.searchIssues({
        jql: 'project = PROJ AND status = "In Progress"',
        maxResults: 50,
      });

      expect(result.ok).toBe(true);
      expect(result.data?.issues).toHaveLength(2);
      expect(result.data?.total).toBe(2);
    });
  });

  describe('addComment', () => {
    it('should add a comment to an issue', async () => {
      const mockComment = {
        id: '10200',
        body: 'This is a comment',
        author: {
          accountId: 'abc123',
          displayName: 'John Doe',
        },
        created: '2024-01-15T10:00:00.000+0000',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockComment,
      });

      const result = await client.addComment('PROJ-123', 'This is a comment');

      expect(result.ok).toBe(true);
      expect(result.data?.body).toBe('This is a comment');
    });
  });

  describe('transitionIssue', () => {
    it('should transition an issue to a new status', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await client.transitionIssue(
        'PROJ-123',
        '31', // transition ID
        undefined,
        'Moving to Done'
      );

      expect(result.ok).toBe(true);
    });
  });

  describe('getTransitions', () => {
    it('should get available transitions for an issue', async () => {
      const mockTransitions = {
        transitions: [
          {
            id: '21',
            name: 'In Progress',
            to: { id: '3', name: 'In Progress' },
          },
          {
            id: '31',
            name: 'Done',
            to: { id: '4', name: 'Done' },
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTransitions,
      });

      const result = await client.getTransitions('PROJ-123');

      expect(result.ok).toBe(true);
      expect(result.data?.transitions).toHaveLength(2);
    });
  });

  describe('assignIssue', () => {
    it('should assign an issue to a user', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await client.assignIssue('PROJ-123', 'abc123');

      expect(result.ok).toBe(true);
    });

    it('should unassign an issue', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await client.assignIssue('PROJ-123', null);

      expect(result.ok).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const result = await client.getIssue('PROJ-123');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('401');
    });

    it('should handle not found errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Issue not found',
      });

      const result = await client.getIssue('INVALID-999');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('404');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network failure'));

      const result = await client.getIssue('PROJ-123');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Network failure');
    });
  });
});

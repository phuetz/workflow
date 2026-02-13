/**
 * Linear Integration Tests
 * Tests for Linear GraphQL API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinearClient } from '../../integrations/linear/LinearClient';
import type { LinearCredentials } from '../../integrations/linear/linear.types';

describe('Linear Integration', () => {
  let client: LinearClient;
  const mockCredentials: LinearCredentials = {
    apiKey: 'lin_api_test1234567890',
    teamId: 'team-abc123',
  };

  beforeEach(() => {
    client = new LinearClient(mockCredentials);
    global.fetch = vi.fn();
  });

  describe('createIssue', () => {
    it('should create a new issue', async () => {
      const mockResponse = {
        data: {
          issueCreate: {
            success: true,
            issue: {
              id: 'issue-123',
              identifier: 'ENG-123',
              title: 'Fix bug in API',
              description: 'Description here',
              priority: 1,
              state: {
                name: 'Todo',
                color: '#e2e2e2',
              },
            },
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.createIssue({
        title: 'Fix bug in API',
        description: 'Description here',
        priority: 1,
      });

      expect(result.ok).toBe(true);
      expect(result.data?.issueCreate.success).toBe(true);
      expect(result.data?.issueCreate.issue.identifier).toBe('ENG-123');
      expect(result.data?.issueCreate.issue.title).toBe('Fix bug in API');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toBe('https://api.linear.app/graphql');
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].headers.Authorization).toBe('lin_api_test1234567890');
      expect(callArgs[1].headers['Content-Type']).toBe('application/json');
    });

    it('should use default team ID from credentials', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            issueCreate: {
              success: true,
              issue: { id: 'issue-123', identifier: 'ENG-123' },
            },
          },
        }),
      });

      await client.createIssue({
        title: 'Test Issue',
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.variables.input.teamId).toBe('team-abc123');
    });

    it('should override team ID if provided', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            issueCreate: {
              success: true,
              issue: { id: 'issue-123' },
            },
          },
        }),
      });

      await client.createIssue({
        title: 'Test Issue',
        teamId: 'team-override',
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.variables.input.teamId).toBe('team-override');
    });

    it('should support assigneeId', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            issueCreate: {
              success: true,
              issue: { id: 'issue-123' },
            },
          },
        }),
      });

      await client.createIssue({
        title: 'Test Issue',
        assigneeId: 'user-123',
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.variables.input.assigneeId).toBe('user-123');
    });

    it('should support priority levels', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            issueCreate: {
              success: true,
              issue: { id: 'issue-123', priority: 0 },
            },
          },
        }),
      });

      await client.createIssue({
        title: 'Urgent Issue',
        priority: 0, // Urgent
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.variables.input.priority).toBe(0);
    });
  });

  describe('updateIssue', () => {
    it('should update an issue', async () => {
      const mockResponse = {
        data: {
          issueUpdate: {
            success: true,
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.updateIssue('issue-123', {
        title: 'Updated title',
        description: 'Updated description',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.issueUpdate.success).toBe(true);

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.query).toContain('issueUpdate');
      expect(body.variables.id).toBe('issue-123');
      expect(body.variables.input.title).toBe('Updated title');
    });

    it('should support partial updates', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            issueUpdate: { success: true },
          },
        }),
      });

      await client.updateIssue('issue-123', {
        priority: 2,
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.variables.input).toEqual({ priority: 2 });
    });
  });

  describe('getIssue', () => {
    it('should retrieve an issue by ID', async () => {
      const mockResponse = {
        data: {
          issue: {
            id: 'issue-123',
            identifier: 'ENG-123',
            title: 'Test Issue',
            description: 'Issue description',
            priority: 1,
            state: {
              name: 'In Progress',
            },
            assignee: {
              name: 'John Doe',
              email: 'john@example.com',
            },
            url: 'https://linear.app/team/issue/ENG-123',
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.getIssue('issue-123');

      expect(result.ok).toBe(true);
      expect(result.data?.issue.id).toBe('issue-123');
      expect(result.data?.issue.identifier).toBe('ENG-123');
      expect(result.data?.issue.assignee?.name).toBe('John Doe');

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.query).toContain('issue(id: $id)');
      expect(body.variables.id).toBe('issue-123');
    });

    it('should fetch all required fields', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            issue: {
              id: 'issue-123',
              identifier: 'ENG-123',
              title: 'Test',
              state: { name: 'Todo' },
            },
          },
        }),
      });

      await client.getIssue('issue-123');

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.query).toContain('identifier');
      expect(body.query).toContain('title');
      expect(body.query).toContain('description');
      expect(body.query).toContain('priority');
      expect(body.query).toContain('state');
      expect(body.query).toContain('assignee');
      expect(body.query).toContain('url');
    });
  });

  describe('searchIssues', () => {
    it('should search issues with filter', async () => {
      const mockResponse = {
        data: {
          issues: {
            nodes: [
              {
                id: 'issue-1',
                identifier: 'ENG-1',
                title: 'Issue 1',
                state: { name: 'Todo' },
                assignee: { name: 'Alice' },
              },
              {
                id: 'issue-2',
                identifier: 'ENG-2',
                title: 'Issue 2',
                state: { name: 'Todo' },
                assignee: { name: 'Bob' },
              },
            ],
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.searchIssues({
        state: { name: { eq: 'Todo' } },
      });

      expect(result.ok).toBe(true);
      expect(result.data?.issues.nodes).toHaveLength(2);
      expect(result.data?.issues.nodes[0].identifier).toBe('ENG-1');

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.query).toContain('issues(filter: $filter)');
      expect(body.variables.filter).toEqual({
        state: { name: { eq: 'Todo' } },
      });
    });

    it('should support complex filters', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            issues: { nodes: [] },
          },
        }),
      });

      await client.searchIssues({
        and: [
          { state: { name: { eq: 'In Progress' } } },
          { assignee: { id: { eq: 'user-123' } } },
        ],
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.variables.filter.and).toBeDefined();
      expect(body.variables.filter.and).toHaveLength(2);
    });

    it('should return empty results if no matches', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            issues: { nodes: [] },
          },
        }),
      });

      const result = await client.searchIssues({
        title: { contains: 'nonexistent' },
      });

      expect(result.ok).toBe(true);
      expect(result.data?.issues.nodes).toHaveLength(0);
    });
  });

  describe('GraphQL Error Handling', () => {
    it('should handle GraphQL errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          errors: [
            {
              message: 'Field "invalidField" not found',
              extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
            },
          ],
        }),
      });

      const result = await client.getIssue('issue-123');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle authentication errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await client.getIssue('issue-123');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('401');
    });

    it('should handle rate limiting', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      const result = await client.searchIssues({});

      expect(result.ok).toBe(false);
      expect(result.error).toContain('429');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await client.getIssue('issue-123');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle malformed GraphQL responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          // Missing both data and errors
        }),
      });

      const result = await client.getIssue('issue-123');

      expect(result.ok).toBe(true);
      expect(result.data).toBeUndefined();
    });
  });

  describe('GraphQL Query Structure', () => {
    it('should send properly formatted GraphQL request', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { issue: { id: 'issue-123' } },
        }),
      });

      await client.getIssue('issue-123');

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body).toHaveProperty('query');
      expect(body).toHaveProperty('variables');
      expect(typeof body.query).toBe('string');
      expect(body.query).toContain('query');
    });

    it('should send properly formatted GraphQL mutation', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { issueCreate: { success: true } },
        }),
      });

      await client.createIssue({ title: 'Test' });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.query).toContain('mutation');
      expect(body.query).toContain('issueCreate');
      expect(body.variables).toHaveProperty('input');
    });
  });
});

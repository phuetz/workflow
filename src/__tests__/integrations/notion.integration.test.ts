/**
 * Notion Integration Tests
 * Tests for Notion API v1 client operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotionClient } from '../../integrations/notion/NotionClient';
import type { NotionCredentials } from '../../integrations/notion/notion.types';

describe('Notion Integration', () => {
  let client: NotionClient;
  const mockCredentials: NotionCredentials = {
    token: 'secret_test1234567890abcdefghijklmnop',
    workspaceId: 'workspace123',
  };

  beforeEach(() => {
    client = new NotionClient(mockCredentials);
    global.fetch = vi.fn();
  });

  describe('createPage', () => {
    it('should create a new page in a database', async () => {
      const mockPage = {
        object: 'page',
        id: 'page-123',
        created_time: '2025-01-15T10:00:00.000Z',
        last_edited_time: '2025-01-15T10:00:00.000Z',
        archived: false,
        properties: {
          title: {
            id: 'title',
            type: 'title',
            title: [{ type: 'text', text: { content: 'Test Page' } }],
          },
        },
        url: 'https://notion.so/page-123',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPage,
      });

      const result = await client.createPage({
        parent: { database_id: 'database-123' },
        properties: {
          title: {
            title: [{ type: 'text', text: { content: 'Test Page' } }],
          },
        },
      });

      expect(result.ok).toBe(true);
      expect(result.data?.id).toBe('page-123');
      expect(result.data?.object).toBe('page');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toBe('https://api.notion.com/v1/pages');
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].headers.Authorization).toBe('Bearer secret_test1234567890abcdefghijklmnop');
      expect(callArgs[1].headers['Notion-Version']).toBe('2022-06-28');
    });

    it('should create a page with children blocks', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: 'page', id: 'page-123' }),
      });

      await client.createPage({
        parent: { page_id: 'parent-page-123' },
        properties: {
          title: {
            title: [{ type: 'text', text: { content: 'Child Page' } }],
          },
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: 'Content' } }],
            },
          },
        ],
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.children).toHaveLength(1);
      expect(body.children[0].type).toBe('paragraph');
    });
  });

  describe('updatePage', () => {
    it('should update page properties', async () => {
      const mockPage = {
        object: 'page',
        id: 'page-123',
        properties: {
          Status: {
            select: { name: 'Completed' },
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPage,
      });

      const result = await client.updatePage({
        page_id: 'page-123',
        properties: {
          Status: {
            select: { name: 'Completed' },
          },
        },
      });

      expect(result.ok).toBe(true);
      expect(result.data?.properties.Status.select.name).toBe('Completed');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/pages/page-123');
      expect(callArgs[1].method).toBe('PATCH');
    });

    it('should archive a page', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: 'page', id: 'page-123', archived: true }),
      });

      const result = await client.updatePage({
        page_id: 'page-123',
        archived: true,
      });

      expect(result.ok).toBe(true);
      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.archived).toBe(true);
    });
  });

  describe('getPage', () => {
    it('should retrieve a page', async () => {
      const mockPage = {
        object: 'page',
        id: 'page-123',
        properties: {
          title: {
            title: [{ text: { content: 'My Page' } }],
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPage,
      });

      const result = await client.getPage({ page_id: 'page-123' });

      expect(result.ok).toBe(true);
      expect(result.data?.id).toBe('page-123');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toBe('https://api.notion.com/v1/pages/page-123');
      expect(callArgs[1].method).toBe('GET');
    });

    it('should support property filtering', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: 'page', id: 'page-123' }),
      });

      await client.getPage({
        page_id: 'page-123',
        filter_properties: ['title', 'Status'],
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('filter_properties=title,Status');
    });
  });

  describe('archivePage', () => {
    it('should archive a page', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: 'page', id: 'page-123', archived: true }),
      });

      const result = await client.archivePage({ page_id: 'page-123' });

      expect(result.ok).toBe(true);
      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.archived).toBe(true);
    });
  });

  describe('queryDatabase', () => {
    it('should query a database', async () => {
      const mockResponse = {
        object: 'list',
        results: [
          { object: 'page', id: 'page-1' },
          { object: 'page', id: 'page-2' },
        ],
        next_cursor: null,
        has_more: false,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.queryDatabase({
        database_id: 'database-123',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.results).toHaveLength(2);
      expect(result.data?.has_more).toBe(false);

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/databases/database-123/query');
      expect(callArgs[1].method).toBe('POST');
    });

    it('should support filtering', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: 'list', results: [] }),
      });

      await client.queryDatabase({
        database_id: 'database-123',
        filter: {
          property: 'Status',
          select: {
            equals: 'Active',
          },
        },
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.filter.property).toBe('Status');
    });

    it('should support sorting', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: 'list', results: [] }),
      });

      await client.queryDatabase({
        database_id: 'database-123',
        sorts: [
          {
            property: 'Name',
            direction: 'ascending',
          },
          {
            timestamp: 'created_time',
            direction: 'descending',
          },
        ],
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.sorts).toHaveLength(2);
      expect(body.sorts[0].property).toBe('Name');
    });

    it('should support pagination', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: 'list', results: [] }),
      });

      await client.queryDatabase({
        database_id: 'database-123',
        start_cursor: 'cursor-123',
        page_size: 50,
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.start_cursor).toBe('cursor-123');
      expect(body.page_size).toBe(50);
    });
  });

  describe('Database Operations', () => {
    it('should create a database', async () => {
      const mockDatabase = {
        object: 'database',
        id: 'database-123',
        title: [{ type: 'text', text: { content: 'New Database' } }],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDatabase,
      });

      const result = await client.createDatabase({
        parent: { page_id: 'page-123' },
        title: [{ type: 'text', text: { content: 'New Database' } }],
        properties: {
          Name: { title: {} },
          Status: { select: { options: [] } },
        },
      });

      expect(result.ok).toBe(true);
      expect(result.data?.object).toBe('database');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toBe('https://api.notion.com/v1/databases');
      expect(callArgs[1].method).toBe('POST');
    });

    it('should update a database', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: 'database', id: 'database-123' }),
      });

      const result = await client.updateDatabase({
        database_id: 'database-123',
        title: [{ type: 'text', text: { content: 'Updated Title' } }],
      });

      expect(result.ok).toBe(true);

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/databases/database-123');
      expect(callArgs[1].method).toBe('PATCH');
    });

    it('should get a database', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: 'database', id: 'database-123' }),
      });

      const result = await client.getDatabase({ database_id: 'database-123' });

      expect(result.ok).toBe(true);

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/databases/database-123');
    });
  });

  describe('Block Operations', () => {
    it('should append block children', async () => {
      const mockResponse = {
        results: [
          {
            object: 'block',
            id: 'block-123',
            type: 'paragraph',
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.appendBlockChildren({
        block_id: 'block-parent',
        children: [
          {
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: 'New paragraph' } }],
            },
          },
        ],
      });

      expect(result.ok).toBe(true);
      expect(result.data?.results).toHaveLength(1);

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/blocks/block-parent/children');
      expect(callArgs[1].method).toBe('PATCH');
    });

    it('should get a block', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: 'block', id: 'block-123' }),
      });

      const result = await client.getBlock({ block_id: 'block-123' });

      expect(result.ok).toBe(true);

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/blocks/block-123');
    });

    it('should get block children', async () => {
      const mockResponse = {
        object: 'list',
        results: [
          { object: 'block', id: 'child-1' },
          { object: 'block', id: 'child-2' },
        ],
        next_cursor: null,
        has_more: false,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.getBlockChildren({
        block_id: 'block-parent',
        page_size: 10,
      });

      expect(result.ok).toBe(true);
      expect(result.data?.results).toHaveLength(2);

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('page_size=10');
    });
  });

  describe('search', () => {
    it('should search across workspace', async () => {
      const mockResponse = {
        object: 'list',
        results: [
          { object: 'page', id: 'page-1' },
          { object: 'database', id: 'database-1' },
        ],
        next_cursor: null,
        has_more: false,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.search({
        query: 'project',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.results).toHaveLength(2);

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toBe('https://api.notion.com/v1/search');
      expect(callArgs[1].method).toBe('POST');
    });

    it('should filter search by object type', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: 'list', results: [] }),
      });

      await client.search({
        filter: {
          value: 'page',
          property: 'object',
        },
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.filter.value).toBe('page');
    });
  });

  describe('User Operations', () => {
    it('should get a user', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: 'user', id: 'user-123' }),
      });

      const result = await client.getUser({ user_id: 'user-123' });

      expect(result.ok).toBe(true);

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/users/user-123');
    });

    it('should list users', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          object: 'list',
          results: [
            { object: 'user', id: 'user-1' },
            { object: 'user', id: 'user-2' },
          ],
        }),
      });

      const result = await client.listUsers({ page_size: 10 });

      expect(result.ok).toBe(true);

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('page_size=10');
    });
  });

  describe('Helper Methods', () => {
    it('should create a simple text page', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: 'page', id: 'page-123' }),
      });

      const result = await client.createTextPage({
        parent_id: 'parent-123',
        title: 'Simple Page',
        content: 'Page content',
      });

      expect(result.ok).toBe(true);

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.properties.title.title[0].text.content).toBe('Simple Page');
      expect(body.children).toHaveLength(1);
    });

    it('should query database with simple filter', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: 'list', results: [] }),
      });

      await client.queryDatabaseSimple({
        database_id: 'database-123',
        property: 'Status',
        value: 'Active',
        operator: 'equals',
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.filter.property).toBe('Status');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          message: 'Unauthorized',
          code: 'unauthorized',
        }),
      });

      const result = await client.getPage({ page_id: 'page-123' });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('should handle not found errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          message: 'Page not found',
        }),
      });

      const result = await client.getPage({ page_id: 'invalid' });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Page not found');
    });

    it('should handle rate limiting', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          message: 'Rate limit exceeded',
        }),
      });

      const result = await client.search({});

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await client.getPage({ page_id: 'page-123' });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle 204 No Content responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await client.getPage({ page_id: 'page-123' });

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
    });
  });
});

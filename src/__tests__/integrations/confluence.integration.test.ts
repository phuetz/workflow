/** Confluence Integration Tests */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfluenceClient } from '../../integrations/confluence/ConfluenceClient';
import type { ConfluenceCredentials } from '../../integrations/confluence/confluence.types';

describe('Confluence Integration', () => {
  let client: ConfluenceClient;
  const mockCredentials: ConfluenceCredentials = {
    domain: 'test.atlassian.net',
    email: 'test@example.com',
    apiToken: 'test-api-token',
  };

  beforeEach(() => {
    client = new ConfluenceClient(mockCredentials);
    global.fetch = vi.fn();
  });

  describe('createPage', () => {
    it('should create a new page', async () => {
      const mockPage = {
        id: 'page123',
        type: 'page' as const,
        status: 'current' as const,
        title: 'Test Page',
        spaceId: 'space123',
        body: {
          storage: {
            value: '<p>Page content</p>',
            representation: 'storage' as const,
          },
        },
        version: { number: 1 },
        _links: { webui: '/wiki/spaces/TEST/pages/123' },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPage,
      });

      const result = await client.createPage({
        spaceId: 'space123',
        status: 'current',
        title: 'Test Page',
        body: {
          representation: 'storage',
          value: '<p>Page content</p>',
        },
      });

      expect(result.ok).toBe(true);
      expect(result.data?.title).toBe('Test Page');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.atlassian.net/wiki/api/v2/pages',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('updatePage', () => {
    it('should update an existing page', async () => {
      const mockPage = {
        id: 'page123',
        type: 'page' as const,
        status: 'current' as const,
        title: 'Updated Page',
        version: { number: 2 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPage,
      });

      const result = await client.updatePage({
        id: 'page123',
        status: 'current',
        title: 'Updated Page',
        version: { number: 2 },
      });

      expect(result.ok).toBe(true);
      expect(result.data?.title).toBe('Updated Page');
    });
  });

  describe('getPage', () => {
    it('should retrieve a page', async () => {
      const mockPage = {
        id: 'page123',
        type: 'page' as const,
        status: 'current' as const,
        title: 'Test Page',
        spaceId: 'space123',
        body: {
          storage: { value: '<p>Content</p>' },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPage,
      });

      const result = await client.getPage('page123');

      expect(result.ok).toBe(true);
      expect(result.data?.title).toBe('Test Page');
    });
  });

  describe('deletePage', () => {
    it('should delete a page', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await client.deletePage('page123');

      expect(result.ok).toBe(true);
    });
  });

  describe('searchContent', () => {
    it('should search content with CQL', async () => {
      const mockResults = {
        results: [
          { id: 'page123', title: 'Test Page 1', type: 'page' as const, status: 'current' as const },
          { id: 'page456', title: 'Test Page 2', type: 'page' as const, status: 'current' as const },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResults,
      });

      const result = await client.searchContent('type=page and space=TEST');

      expect(result.ok).toBe(true);
      expect(result.data?.results).toHaveLength(2);
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('cql=');
    });
  });

  describe('createBlogPost', () => {
    it('should create a blog post', async () => {
      const mockBlog = {
        id: 'blog123',
        type: 'blogpost' as const,
        status: 'current' as const,
        title: 'Blog Post',
        spaceId: 'space123',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBlog,
      });

      const result = await client.createBlogPost(
        'space123',
        'Blog Post',
        { representation: 'storage', value: '<p>Blog content</p>' }
      );

      expect(result.ok).toBe(true);
      expect(result.data?.title).toBe('Blog Post');
    });
  });

  describe('addComment', () => {
    it('should add a comment to a page', async () => {
      const mockComment = {
        id: 'comment123',
        type: 'comment' as const,
        status: 'current',
        title: '',
        body: {
          storage: { value: 'Great page!', representation: 'storage' as const },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockComment,
      });

      const result = await client.addComment(
        'page123',
        { representation: 'storage', value: 'Great page!' }
      );

      expect(result.ok).toBe(true);
      expect(result.data?.body?.storage?.value).toBe('Great page!');
    });
  });

  describe('getSpaces', () => {
    it('should retrieve spaces', async () => {
      const mockSpaces = {
        results: [
          { id: 'space123', key: 'TEST', name: 'Test Space', type: 'global' as const, status: 'current' as const },
          { id: 'space456', key: 'DEV', name: 'Dev Space', type: 'global' as const, status: 'current' as const },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSpaces,
      });

      const result = await client.getSpaces();

      expect(result.ok).toBe(true);
      expect(result.data?.results).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const result = await client.getPage('page123');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('401');
    });

    it('should handle not found errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Page not found',
      });

      const result = await client.getPage('invalid');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('404');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getPage('page123');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });
});

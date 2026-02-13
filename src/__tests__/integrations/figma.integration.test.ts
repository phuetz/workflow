/** Figma Integration Tests */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FigmaClient } from '../../integrations/figma/FigmaClient';
import type { FigmaCredentials } from '../../integrations/figma/figma.types';

describe('Figma Integration', () => {
  let client: FigmaClient;
  const mockCredentials: FigmaCredentials = {
    accessToken: 'figd_test_token',
  };

  beforeEach(() => {
    client = new FigmaClient(mockCredentials);
    global.fetch = vi.fn();
  });

  describe('getFile', () => {
    it('should retrieve a Figma file', async () => {
      const mockFile = {
        name: 'Test Design',
        role: 'owner',
        lastModified: '2024-01-15T10:00:00Z',
        editorType: 'figma',
        thumbnailUrl: 'https://example.com/thumb.png',
        version: '123456789',
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [
            {
              id: '1:1',
              name: 'Page 1',
              type: 'CANVAS',
              children: [],
            },
          ],
        },
        components: {},
        componentSets: {},
        schemaVersion: 0,
        styles: {},
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFile,
      });

      const result = await client.getFile('abc123def456');

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe('Test Design');
      expect(result.data?.document.children).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/files/abc123def456',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Figma-Token': 'figd_test_token',
          }),
        })
      );
    });

    it('should retrieve file with specific node IDs', async () => {
      const mockFile = {
        name: 'Test Design',
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [],
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFile,
      });

      const result = await client.getFile('abc123', {
        ids: ['1:5', '1:6'],
        depth: 2,
      });

      expect(result.ok).toBe(true);
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('ids=');
      expect(callArgs[0]).toContain('depth=2');
    });
  });

  describe('getFileNodes', () => {
    it('should retrieve specific nodes from a file', async () => {
      const mockNodesResponse = {
        nodes: {
          '1:5': {
            document: {
              id: '1:5',
              name: 'Frame 1',
              type: 'FRAME',
              visible: true,
              children: [],
            },
          },
          '1:6': {
            document: {
              id: '1:6',
              name: 'Frame 2',
              type: 'FRAME',
              visible: true,
              children: [],
            },
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockNodesResponse,
      });

      const result = await client.getFileNodes('abc123', ['1:5', '1:6']);

      expect(result.ok).toBe(true);
      expect(result.data?.nodes['1:5'].document.name).toBe('Frame 1');
      expect(result.data?.nodes['1:6'].document.name).toBe('Frame 2');
    });
  });

  describe('getImages', () => {
    it('should export images from nodes', async () => {
      const mockImagesResponse = {
        images: {
          '1:5': 'https://example.com/image1.png',
          '1:6': 'https://example.com/image2.png',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockImagesResponse,
      });

      const result = await client.getImages('abc123', ['1:5', '1:6'], {
        format: 'png',
        scale: 2,
      });

      expect(result.ok).toBe(true);
      expect(result.data?.images['1:5']).toContain('image1.png');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('format=png'),
        expect.anything()
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('scale=2'),
        expect.anything()
      );
    });

    it('should export SVG images', async () => {
      const mockImagesResponse = {
        images: {
          '1:5': 'https://example.com/image1.svg',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockImagesResponse,
      });

      const result = await client.getImages('abc123', ['1:5'], {
        format: 'svg',
        svg_include_id: true,
        svg_simplify_stroke: true,
      });

      expect(result.ok).toBe(true);
      expect(result.data?.images['1:5']).toContain('svg');
    });
  });

  describe('getComments', () => {
    it('should retrieve comments from a file', async () => {
      const mockCommentsResponse = {
        comments: [
          {
            id: '123',
            client_meta: {
              x: 100,
              y: 200,
              node_id: '1:5',
            },
            message: 'Great design!',
            user: {
              id: 'user123',
              handle: 'johndoe',
              img_url: 'https://example.com/avatar.jpg',
            },
            created_at: '2024-01-15T10:00:00Z',
            order_id: 1,
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCommentsResponse,
      });

      const result = await client.getComments('abc123');

      expect(result.ok).toBe(true);
      expect(result.data?.comments).toHaveLength(1);
      expect(result.data?.comments[0].message).toBe('Great design!');
    });
  });

  describe('postComment', () => {
    it('should post a comment to a file', async () => {
      const mockComment = {
        id: '456',
        message: 'New comment',
        client_meta: {
          x: 150,
          y: 250,
        },
        user: {
          id: 'user123',
          handle: 'johndoe',
          img_url: 'https://example.com/avatar.jpg',
        },
        created_at: '2024-01-15T11:00:00Z',
        order_id: 2,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockComment,
      });

      const result = await client.postComment('abc123', 'New comment', {
        x: 150,
        y: 250,
      });

      expect(result.ok).toBe(true);
      expect(result.data?.message).toBe('New comment');
      expect(result.data?.client_meta.x).toBe(150);
    });

    it('should post a reply to an existing comment', async () => {
      const mockReply = {
        id: '789',
        message: 'Reply to comment',
        user: {
          id: 'user123',
          handle: 'johndoe',
          img_url: 'https://example.com/avatar.jpg',
        },
        created_at: '2024-01-15T11:30:00Z',
        order_id: 3,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockReply,
      });

      const result = await client.postComment(
        'abc123',
        'Reply to comment',
        undefined,
        '456' // parent comment ID
      );

      expect(result.ok).toBe(true);
      expect(result.data?.message).toBe('Reply to comment');
    });
  });

  describe('getVersions', () => {
    it('should retrieve file version history', async () => {
      const mockVersionsResponse = {
        versions: [
          {
            id: 'v1',
            created_at: '2024-01-15T10:00:00Z',
            label: 'Version 1.0',
            description: 'Initial release',
            user: {
              id: 'user123',
              handle: 'johndoe',
              img_url: 'https://example.com/avatar.jpg',
            },
          },
          {
            id: 'v2',
            created_at: '2024-01-15T11:00:00Z',
            label: 'Version 1.1',
            user: {
              id: 'user123',
              handle: 'johndoe',
              img_url: 'https://example.com/avatar.jpg',
            },
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockVersionsResponse,
      });

      const result = await client.getVersions('abc123');

      expect(result.ok).toBe(true);
      expect(result.data?.versions).toHaveLength(2);
      expect(result.data?.versions[0].label).toBe('Version 1.0');
    });
  });

  describe('getTeamProjects', () => {
    it('should retrieve team projects', async () => {
      const mockProjectsResponse = {
        projects: [
          { id: '123', name: 'Project A' },
          { id: '456', name: 'Project B' },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockProjectsResponse,
      });

      const result = await client.getTeamProjects('team123');

      expect(result.ok).toBe(true);
      expect(result.data?.projects).toHaveLength(2);
    });
  });

  describe('getProjectFiles', () => {
    it('should retrieve files in a project', async () => {
      const mockFilesResponse = {
        files: [
          {
            key: 'file1',
            name: 'Design 1',
            thumbnail_url: 'https://example.com/thumb1.png',
            last_modified: '2024-01-15T10:00:00Z',
          },
          {
            key: 'file2',
            name: 'Design 2',
            thumbnail_url: 'https://example.com/thumb2.png',
            last_modified: '2024-01-15T11:00:00Z',
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFilesResponse,
      });

      const result = await client.getProjectFiles('project123');

      expect(result.ok).toBe(true);
      expect(result.data?.files).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Invalid token',
      });

      const result = await client.getFile('abc123');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('403');
    });

    it('should handle file not found errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'File not found',
      });

      const result = await client.getFile('invalid');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('404');
    });

    it('should handle rate limiting', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      const result = await client.getFile('abc123');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('429');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await client.getFile('abc123');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Network timeout');
    });
  });
});

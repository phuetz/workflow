/** Monday.com Integration Tests */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MondayClient } from '../../integrations/monday/MondayClient';
import type { MondayCredentials } from '../../integrations/monday/monday.types';

describe('Monday.com Integration', () => {
  let client: MondayClient;
  const mockCredentials: MondayCredentials = {
    apiToken: 'test-api-token',
    accountId: '123456',
  };

  beforeEach(() => {
    client = new MondayClient(mockCredentials);
    global.fetch = vi.fn();
  });

  describe('createItem', () => {
    it('should create a new item', async () => {
      const mockResponse = {
        data: {
          create_item: {
            id: '1234567890',
            name: 'New Task',
            state: 'active',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
            column_values: [],
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.createItem({
        board_id: '123456789',
        item_name: 'New Task',
        column_values: { status: 'Working on it' },
      });

      expect(result.ok).toBe(true);
      expect(result.data?.create_item.name).toBe('New Task');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.monday.com/v2',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'test-api-token',
            'API-Version': '2023-10',
          }),
        })
      );
    });

    it('should handle GraphQL errors', async () => {
      const mockErrorResponse = {
        errors: [
          {
            message: 'Board not found',
            locations: [{ line: 2, column: 3 }],
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockErrorResponse,
      });

      const result = await client.createItem({
        board_id: 'invalid',
        item_name: 'Test',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Board not found');
    });
  });

  describe('updateItem', () => {
    it('should update an existing item', async () => {
      const mockResponse = {
        data: {
          change_multiple_column_values: {
            id: '1234567890',
            name: 'Updated Task',
            column_values: [
              { id: 'status', value: '"Done"', text: 'Done' },
            ],
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.updateItem({
        item_id: '1234567890',
        column_values: { status: 'Done' },
      });

      expect(result.ok).toBe(true);
      expect(result.data?.change_multiple_column_values.id).toBe('1234567890');
    });
  });

  describe('getItem', () => {
    it('should retrieve an item by ID', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              id: '1234567890',
              name: 'Task 1',
              state: 'active',
              board: { id: '123', name: 'Board 1' },
              group: { id: 'topics', title: 'Topics' },
              column_values: [],
            },
          ],
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.getItem('1234567890');

      expect(result.ok).toBe(true);
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0].name).toBe('Task 1');
    });
  });

  describe('createBoard', () => {
    it('should create a new board', async () => {
      const mockResponse = {
        data: {
          create_board: {
            id: '987654321',
            name: 'New Board',
            board_kind: 'public',
            state: 'active',
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.createBoard({
        board_name: 'New Board',
        board_kind: 'public',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.create_board.name).toBe('New Board');
    });
  });

  describe('createUpdate', () => {
    it('should create an update (comment) on an item', async () => {
      const mockResponse = {
        data: {
          create_update: {
            id: '111222333',
            body: 'This is a comment',
            text_body: 'This is a comment',
            created_at: '2024-01-15T10:00:00Z',
            creator_id: '123456',
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.createUpdate('1234567890', 'This is a comment');

      expect(result.ok).toBe(true);
      expect(result.data?.create_update.body).toBe('This is a comment');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await client.createItem({
        board_id: '123',
        item_name: 'Test',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle HTTP errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const result = await client.getItem('123');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('401');
    });
  });
});

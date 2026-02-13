/**
 * Airtable Integration Tests
 * Tests for Airtable API client and database operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AirtableClient } from '../../integrations/airtable/AirtableClient';
import type { AirtableCredentials } from '../../integrations/airtable/airtable.types';

describe('Airtable Integration', () => {
  let client: AirtableClient;
  const mockCredentials: AirtableCredentials = {
    apiKey: 'keyTestApiKey123',
    baseId: 'appTestBase123',
  };

  beforeEach(() => {
    client = new AirtableClient(mockCredentials);
    global.fetch = vi.fn();
  });

  describe('create', () => {
    it('should create a new record', async () => {
      const mockRecord = {
        id: 'rec123456',
        fields: {
          Name: 'John Doe',
          Email: 'john@example.com',
          Status: 'Active',
        },
        createdTime: '2025-01-15T10:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          records: [mockRecord],
        }),
      });

      const result = await client.create('Contacts', {
        Name: 'John Doe',
        Email: 'john@example.com',
        Status: 'Active',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.id).toBe('rec123456');
      expect(result.data?.fields.Name).toBe('John Doe');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/bases/appTestBase123/tables/Contacts/records');
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].headers.Authorization).toBe('Bearer keyTestApiKey123');
    });

    it('should support typecast parameter', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          records: [{ id: 'rec123', fields: {} }],
        }),
      });

      await client.create('Table', { Field: 'value' }, false);

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.typecast).toBe(false);
    });

    it('should handle table names with spaces', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          records: [{ id: 'rec123', fields: {} }],
        }),
      });

      await client.create('My Table Name', { Field: 'value' });

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('My%20Table%20Name');
    });
  });

  describe('update', () => {
    it('should update an existing record', async () => {
      const mockRecord = {
        id: 'rec123456',
        fields: {
          Name: 'John Smith',
          Status: 'Inactive',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          records: [mockRecord],
        }),
      });

      const result = await client.update('Contacts', 'rec123456', {
        Name: 'John Smith',
        Status: 'Inactive',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.fields.Name).toBe('John Smith');
      expect(result.data?.fields.Status).toBe('Inactive');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].method).toBe('PATCH');
    });

    it('should include record ID in update request', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          records: [{ id: 'rec123', fields: {} }],
        }),
      });

      await client.update('Table', 'rec123', { Field: 'new value' });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.records[0].id).toBe('rec123');
    });
  });

  describe('get', () => {
    it('should retrieve a single record', async () => {
      const mockRecord = {
        id: 'rec123456',
        fields: {
          Name: 'Jane Doe',
          Email: 'jane@example.com',
        },
        createdTime: '2025-01-15T10:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRecord,
      });

      const result = await client.get('Contacts', 'rec123456');

      expect(result.ok).toBe(true);
      expect(result.data?.id).toBe('rec123456');
      expect(result.data?.fields.Name).toBe('Jane Doe');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/records/rec123456');
      expect(callArgs[1].method).toBe('GET');
    });
  });

  describe('list', () => {
    it('should retrieve multiple records', async () => {
      const mockResponse = {
        records: [
          { id: 'rec1', fields: { Name: 'Alice' } },
          { id: 'rec2', fields: { Name: 'Bob' } },
          { id: 'rec3', fields: { Name: 'Charlie' } },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.list('Contacts');

      expect(result.ok).toBe(true);
      expect(result.data?.records).toHaveLength(3);
      expect(result.data?.records[0].fields.Name).toBe('Alice');
    });

    it('should support maxRecords parameter', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ records: [] }),
      });

      await client.list('Table', { maxRecords: 10 });

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('maxRecords=10');
    });

    it('should support pagination with offset', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ records: [], offset: 'nextPage123' }),
      });

      await client.list('Table', { offset: 'page123' });

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('offset=page123');
    });

    it('should support view parameter', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ records: [] }),
      });

      await client.list('Table', { view: 'Grid view' });

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('view=Grid+view');
    });

    it('should support filterByFormula', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ records: [] }),
      });

      await client.list('Table', {
        filterByFormula: '{Status} = "Active"',
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('filterByFormula=');
    });

    it('should support sorting', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ records: [] }),
      });

      await client.list('Table', {
        sort: [
          { field: 'Name', direction: 'asc' },
          { field: 'Created', direction: 'desc' },
        ],
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('sort%5B0%5D%5Bfield%5D=Name');
      expect(callArgs[0]).toContain('sort%5B0%5D%5Bdirection%5D=asc');
      expect(callArgs[0]).toContain('sort%5B1%5D%5Bfield%5D=Created');
    });

    it('should support field selection', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ records: [] }),
      });

      await client.list('Table', {
        fields: ['Name', 'Email', 'Status'],
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('fields%5B%5D=Name');
      expect(callArgs[0]).toContain('fields%5B%5D=Email');
      expect(callArgs[0]).toContain('fields%5B%5D=Status');
    });
  });

  describe('delete', () => {
    it('should delete a record', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          deleted: true,
          id: 'rec123456',
        }),
      });

      const result = await client.delete('Contacts', 'rec123456');

      expect(result.ok).toBe(true);
      expect(result.data?.deleted).toBe(true);
      expect(result.data?.id).toBe('rec123456');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/records/rec123456');
      expect(callArgs[1].method).toBe('DELETE');
    });
  });

  describe('Authentication', () => {
    it('should support API key authentication', async () => {
      const apiKeyClient = new AirtableClient({
        apiKey: 'keyTestApiKey',
        baseId: 'appBase',
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ records: [] }),
      });

      await apiKeyClient.list('Table');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].headers.Authorization).toBe('Bearer keyTestApiKey');
    });

    it('should support access token authentication', async () => {
      const tokenClient = new AirtableClient({
        accessToken: 'patTestAccessToken',
        baseId: 'appBase',
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ records: [] }),
      });

      await tokenClient.list('Table');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].headers.Authorization).toBe('Bearer patTestAccessToken');
    });

    it('should prefer access token over API key', async () => {
      const bothClient = new AirtableClient({
        apiKey: 'keyApiKey',
        accessToken: 'patAccessToken',
        baseId: 'appBase',
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ records: [] }),
      });

      await bothClient.list('Table');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].headers.Authorization).toBe('Bearer patAccessToken');
    });

    it('should return error if no credentials provided', async () => {
      const noAuthClient = new AirtableClient({
        baseId: 'appBase',
      });

      const result = await noAuthClient.list('Table');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Missing API key or access token');
    });

    it('should return error if base ID is missing', async () => {
      const noBaseClient = new AirtableClient({
        apiKey: 'keyApiKey',
        baseId: '',
      });

      const result = await noBaseClient.list('Table');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Missing base ID');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          error: {
            type: 'INVALID_REQUEST_BODY',
            message: 'Invalid field value',
          },
        }),
      });

      const result = await client.create('Table', { Field: 'value' });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Invalid field value');
    });

    it('should handle authentication errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            type: 'AUTHENTICATION_REQUIRED',
            message: 'Invalid API key',
          },
        }),
      });

      const result = await client.get('Table', 'rec123');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });

    it('should handle not found errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            type: 'MODEL_ID_NOT_FOUND',
            message: 'Record not found',
          },
        }),
      });

      const result = await client.get('Table', 'recInvalid');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Record not found');
    });

    it('should handle rate limiting', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            type: 'RATE_LIMIT_EXCEEDED',
          },
        }),
      });

      const result = await client.list('Table');

      expect(result.ok).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await client.get('Table', 'rec123');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Network timeout');
    });
  });
});

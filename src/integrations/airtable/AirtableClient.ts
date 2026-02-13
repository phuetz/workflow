/**
 * Airtable API Client
 * Implements CRUD operations for Airtable API v0
 */

import type {
  AirtableCredentials,
  AirtableResponse,
  AirtableRecord,
  AirtableListResponse,
  AirtableListParams,
  AirtableCreateRequest,
  AirtableUpdateRequest,
  AirtableDeleteResponse
} from './airtable.types';

export class AirtableClient {
  private credentials: AirtableCredentials;
  private baseUrl = 'https://api.airtable.com/v0';

  constructor(credentials: AirtableCredentials) {
    this.credentials = credentials;
  }

  async create(
    tableName: string,
    fields: Record<string, unknown>,
    typecast = true
  ): Promise<AirtableResponse<AirtableRecord>> {
    const body: AirtableCreateRequest = {
      records: [{ fields }],
      typecast
    };

    const response = await this.apiCall<{ records: AirtableRecord[] }>(
      `/bases/${this.credentials.baseId}/tables/${encodeURIComponent(tableName)}/records`,
      'POST',
      body
    );

    if (response.ok && response.data?.records[0]) {
      return { ok: true, data: response.data.records[0] };
    }

    return { ok: false, error: response.error };
  }

  async update(
    tableName: string,
    recordId: string,
    fields: Record<string, unknown>,
    typecast = true
  ): Promise<AirtableResponse<AirtableRecord>> {
    const body: AirtableUpdateRequest = {
      records: [{ id: recordId, fields }],
      typecast
    };

    const response = await this.apiCall<{ records: AirtableRecord[] }>(
      `/bases/${this.credentials.baseId}/tables/${encodeURIComponent(tableName)}/records`,
      'PATCH',
      body
    );

    if (response.ok && response.data?.records[0]) {
      return { ok: true, data: response.data.records[0] };
    }

    return { ok: false, error: response.error };
  }

  async get(
    tableName: string,
    recordId: string
  ): Promise<AirtableResponse<AirtableRecord>> {
    return this.apiCall(
      `/bases/${this.credentials.baseId}/tables/${encodeURIComponent(tableName)}/records/${recordId}`,
      'GET'
    );
  }

  async list(
    tableName: string,
    params?: AirtableListParams
  ): Promise<AirtableResponse<AirtableListResponse>> {
    const query = new URLSearchParams();

    if (params?.maxRecords) query.append('maxRecords', params.maxRecords.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params?.offset) query.append('offset', params.offset);
    if (params?.view) query.append('view', params.view);
    if (params?.filterByFormula) query.append('filterByFormula', params.filterByFormula);

    if (params?.sort) {
      params.sort.forEach((s, i) => {
        query.append(`sort[${i}][field]`, s.field);
        query.append(`sort[${i}][direction]`, s.direction);
      });
    }

    if (params?.fields) {
      params.fields.forEach(f => query.append('fields[]', f));
    }

    const queryString = query.toString();
    const endpoint = `/bases/${this.credentials.baseId}/tables/${encodeURIComponent(tableName)}/records${queryString ? `?${queryString}` : ''}`;

    return this.apiCall(endpoint, 'GET');
  }

  async delete(
    tableName: string,
    recordId: string
  ): Promise<AirtableResponse<AirtableDeleteResponse>> {
    return this.apiCall(
      `/bases/${this.credentials.baseId}/tables/${encodeURIComponent(tableName)}/records/${recordId}`,
      'DELETE'
    );
  }

  private async apiCall<T = unknown>(
    endpoint: string,
    method: string,
    body?: unknown
  ): Promise<AirtableResponse<T>> {
    const token = this.credentials.accessToken || this.credentials.apiKey;

    if (!token) {
      return { ok: false, error: 'Missing API key or access token' };
    }

    if (!this.credentials.baseId) {
      return { ok: false, error: 'Missing base ID' };
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          ok: false,
          error: error.error?.message || error.error?.type || `Airtable API error: ${response.status}`
        };
      }

      const data = method !== 'DELETE' ? await response.json() : await response.json();
      return { ok: true, data: data as T };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Request failed'
      };
    }
  }
}

export function createAirtableClient(credentials: AirtableCredentials): AirtableClient {
  return new AirtableClient(credentials);
}

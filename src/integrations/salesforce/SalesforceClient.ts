import type { SalesforceCredentials, SalesforceResponse, SalesforceQueryResult } from './salesforce.types';

export class SalesforceClient {
  private credentials: SalesforceCredentials;

  constructor(credentials: SalesforceCredentials) {
    this.credentials = credentials;
  }

  async query(soql: string): Promise<SalesforceResponse<SalesforceQueryResult>> {
    return this.apiCall(`/services/data/v58.0/query?q=${encodeURIComponent(soql)}`, 'GET');
  }

  async create(sobject: string, data: Record<string, unknown>): Promise<SalesforceResponse> {
    return this.apiCall(`/services/data/v58.0/sobjects/${sobject}`, 'POST', data);
  }

  async update(sobject: string, id: string, data: Record<string, unknown>): Promise<SalesforceResponse> {
    return this.apiCall(`/services/data/v58.0/sobjects/${sobject}/${id}`, 'PATCH', data);
  }

  async get(sobject: string, id: string): Promise<SalesforceResponse> {
    return this.apiCall(`/services/data/v58.0/sobjects/${sobject}/${id}`, 'GET');
  }

  async delete(sobject: string, id: string): Promise<SalesforceResponse> {
    return this.apiCall(`/services/data/v58.0/sobjects/${sobject}/${id}`, 'DELETE');
  }

  private async apiCall<T = unknown>(endpoint: string, method: string, body?: unknown): Promise<SalesforceResponse<T>> {
    if (!this.credentials.accessToken || !this.credentials.instanceUrl) {
      return { ok: false, error: 'Missing credentials' };
    }

    try {
      const response = await fetch(`${this.credentials.instanceUrl}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.json();
        return { ok: false, error: error.message || 'API request failed' };
      }

      const data = method !== 'DELETE' ? await response.json() : {};
      return { ok: true, data: data as T };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Request failed' };
    }
  }
}

export function createSalesforceClient(credentials: SalesforceCredentials): SalesforceClient {
  return new SalesforceClient(credentials);
}

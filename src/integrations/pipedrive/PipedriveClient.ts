/**
 * Pipedrive API Client
 * Implements sales CRM operations for Pipedrive API v1
 */

import type {
  PipedriveCredentials,
  PipedriveResponse,
  PipedriveDeal,
  PipedrivePerson,
  PipedriveOrganization,
  PipedriveListResponse
} from './pipedrive.types';

export class PipedriveClient {
  private credentials: PipedriveCredentials;
  private baseUrl: string;

  constructor(credentials: PipedriveCredentials) {
    this.credentials = credentials;

    // Handle domain format
    const domain = credentials.domain || 'api.pipedrive.com';
    if (domain.includes('.pipedrive.com')) {
      this.baseUrl = `https://${domain}/v1`;
    } else {
      this.baseUrl = `https://${domain}.pipedrive.com/v1`;
    }
  }

  // Deal Operations
  async createDeal(deal: Partial<PipedriveDeal>): Promise<PipedriveResponse<PipedriveDeal>> {
    return this.apiCall('/deals', 'POST', deal);
  }

  async updateDeal(dealId: number, deal: Partial<PipedriveDeal>): Promise<PipedriveResponse<PipedriveDeal>> {
    return this.apiCall(`/deals/${dealId}`, 'PUT', deal);
  }

  async getDeal(dealId: number): Promise<PipedriveResponse<PipedriveDeal>> {
    return this.apiCall(`/deals/${dealId}`, 'GET');
  }

  async listDeals(params?: { start?: number; limit?: number; filter_id?: number; stage_id?: number }): Promise<PipedriveResponse<PipedriveListResponse<PipedriveDeal>>> {
    const query = new URLSearchParams();
    if (params?.start) query.append('start', params.start.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.filter_id) query.append('filter_id', params.filter_id.toString());
    if (params?.stage_id) query.append('stage_id', params.stage_id.toString());

    return this.apiCall(`/deals?${query.toString()}`, 'GET');
  }

  // Person Operations
  async createPerson(person: Partial<PipedrivePerson>): Promise<PipedriveResponse<PipedrivePerson>> {
    return this.apiCall('/persons', 'POST', person);
  }

  async updatePerson(personId: number, person: Partial<PipedrivePerson>): Promise<PipedriveResponse<PipedrivePerson>> {
    return this.apiCall(`/persons/${personId}`, 'PUT', person);
  }

  async getPerson(personId: number): Promise<PipedriveResponse<PipedrivePerson>> {
    return this.apiCall(`/persons/${personId}`, 'GET');
  }

  async listPersons(params?: { start?: number; limit?: number; filter_id?: number }): Promise<PipedriveResponse<PipedriveListResponse<PipedrivePerson>>> {
    const query = new URLSearchParams();
    if (params?.start) query.append('start', params.start.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.filter_id) query.append('filter_id', params.filter_id.toString());

    return this.apiCall(`/persons?${query.toString()}`, 'GET');
  }

  // Organization Operations
  async createOrganization(org: Partial<PipedriveOrganization>): Promise<PipedriveResponse<PipedriveOrganization>> {
    return this.apiCall('/organizations', 'POST', org);
  }

  async updateOrganization(orgId: number, org: Partial<PipedriveOrganization>): Promise<PipedriveResponse<PipedriveOrganization>> {
    return this.apiCall(`/organizations/${orgId}`, 'PUT', org);
  }

  // Core API Call Method
  private async apiCall<T = unknown>(
    endpoint: string,
    method: string,
    body?: unknown
  ): Promise<PipedriveResponse<T>> {
    if (!this.credentials.apiToken) {
      return { ok: false, error: 'Missing API token' };
    }

    try {
      // Add API token to URL
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = `${this.baseUrl}${endpoint}${separator}api_token=${this.credentials.apiToken}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          ok: false,
          error: error.error || `Pipedrive API error: ${response.status}`
        };
      }

      const result = await response.json();

      // Pipedrive wraps data in { success, data }
      if (!result.success) {
        return { ok: false, error: result.error || 'Operation failed' };
      }

      return { ok: true, data: result.data as T };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Request failed'
      };
    }
  }
}

export function createPipedriveClient(credentials: PipedriveCredentials): PipedriveClient {
  return new PipedriveClient(credentials);
}

/**
 * HubSpot API Client
 * Implements CRM operations for HubSpot API v3
 */

import type {
  HubSpotCredentials,
  HubSpotResponse,
  HubSpotContact,
  HubSpotDeal,
  HubSpotCompany,
  HubSpotSearchRequest,
  HubSpotSearchResponse
} from './hubspot.types';

export class HubSpotClient {
  private credentials: HubSpotCredentials;
  private baseUrl = 'https://api.hubapi.com';

  constructor(credentials: HubSpotCredentials) {
    this.credentials = credentials;
  }

  // Contact Operations
  async createContact(properties: Record<string, unknown>): Promise<HubSpotResponse<HubSpotContact>> {
    return this.apiCall('/crm/v3/objects/contacts', 'POST', { properties });
  }

  async updateContact(contactId: string, properties: Record<string, unknown>): Promise<HubSpotResponse<HubSpotContact>> {
    return this.apiCall(`/crm/v3/objects/contacts/${contactId}`, 'PATCH', { properties });
  }

  async getContact(contactId: string, properties?: string[]): Promise<HubSpotResponse<HubSpotContact>> {
    const params = properties ? `?properties=${properties.join(',')}` : '';
    return this.apiCall(`/crm/v3/objects/contacts/${contactId}${params}`, 'GET');
  }

  async searchContacts(search: HubSpotSearchRequest): Promise<HubSpotResponse<HubSpotSearchResponse<HubSpotContact>>> {
    return this.apiCall('/crm/v3/objects/contacts/search', 'POST', search);
  }

  // Deal Operations
  async createDeal(properties: Record<string, unknown>, associations?: { contacts?: string[]; companies?: string[] }): Promise<HubSpotResponse<HubSpotDeal>> {
    const body: { properties: Record<string, unknown>; associations?: unknown[] } = { properties };

    if (associations) {
      body.associations = [];
      if (associations.contacts) {
        body.associations.push(...associations.contacts.map(id => ({
          to: { id },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
        })));
      }
      if (associations.companies) {
        body.associations.push(...associations.companies.map(id => ({
          to: { id },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 5 }]
        })));
      }
    }

    return this.apiCall('/crm/v3/objects/deals', 'POST', body);
  }

  async updateDeal(dealId: string, properties: Record<string, unknown>): Promise<HubSpotResponse<HubSpotDeal>> {
    return this.apiCall(`/crm/v3/objects/deals/${dealId}`, 'PATCH', { properties });
  }

  async getDeal(dealId: string, properties?: string[]): Promise<HubSpotResponse<HubSpotDeal>> {
    const params = properties ? `?properties=${properties.join(',')}` : '';
    return this.apiCall(`/crm/v3/objects/deals/${dealId}${params}`, 'GET');
  }

  // Company Operations
  async createCompany(properties: Record<string, unknown>): Promise<HubSpotResponse<HubSpotCompany>> {
    return this.apiCall('/crm/v3/objects/companies', 'POST', { properties });
  }

  async updateCompany(companyId: string, properties: Record<string, unknown>): Promise<HubSpotResponse<HubSpotCompany>> {
    return this.apiCall(`/crm/v3/objects/companies/${companyId}`, 'PATCH', { properties });
  }

  async getCompany(companyId: string, properties?: string[]): Promise<HubSpotResponse<HubSpotCompany>> {
    const params = properties ? `?properties=${properties.join(',')}` : '';
    return this.apiCall(`/crm/v3/objects/companies/${companyId}${params}`, 'GET');
  }

  // Core API Call Method
  private async apiCall<T = unknown>(
    endpoint: string,
    method: string,
    body?: unknown
  ): Promise<HubSpotResponse<T>> {
    const token = this.credentials.accessToken || this.credentials.apiKey;

    if (!token) {
      return { ok: false, error: 'Missing API key or access token' };
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // HubSpot supports both API key and OAuth token
      if (this.credentials.accessToken) {
        headers['Authorization'] = `Bearer ${this.credentials.accessToken}`;
      } else if (this.credentials.apiKey) {
        endpoint += endpoint.includes('?') ? '&' : '?';
        endpoint += `hapikey=${this.credentials.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          ok: false,
          error: error.message || `HubSpot API error: ${response.status}`
        };
      }

      const data = method !== 'DELETE' ? await response.json() : {};
      return { ok: true, data: data as T };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Request failed'
      };
    }
  }
}

export function createHubSpotClient(credentials: HubSpotCredentials): HubSpotClient {
  return new HubSpotClient(credentials);
}

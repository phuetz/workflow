/**
 * Mailchimp API Client
 * Implements email marketing operations for Mailchimp API v3
 */

import type {
  MailchimpCredentials,
  MailchimpResponse,
  MailchimpSubscriber,
  MailchimpList,
  MailchimpCampaign,
  MailchimpCampaignStats
} from './mailchimp.types';

export class MailchimpClient {
  private credentials: MailchimpCredentials;
  private baseUrl: string;

  constructor(credentials: MailchimpCredentials) {
    this.credentials = credentials;

    // Extract server from API key (format: xxxxx-us1)
    const server = credentials.server || credentials.apiKey.split('-')[1] || 'us1';
    this.baseUrl = `https://${server}.api.mailchimp.com/3.0`;
  }

  // Subscriber Operations
  async addSubscriber(listId: string, subscriber: Omit<MailchimpSubscriber, 'id'>): Promise<MailchimpResponse<MailchimpSubscriber>> {
    return this.apiCall(`/lists/${listId}/members`, 'POST', subscriber);
  }

  async updateSubscriber(listId: string, subscriberHash: string, subscriber: Partial<MailchimpSubscriber>): Promise<MailchimpResponse<MailchimpSubscriber>> {
    return this.apiCall(`/lists/${listId}/members/${subscriberHash}`, 'PATCH', subscriber);
  }

  async getSubscriber(listId: string, subscriberHash: string): Promise<MailchimpResponse<MailchimpSubscriber>> {
    return this.apiCall(`/lists/${listId}/members/${subscriberHash}`, 'GET');
  }

  // Campaign Operations
  async createCampaign(campaign: Omit<MailchimpCampaign, 'id' | 'status' | 'create_time' | 'send_time'>): Promise<MailchimpResponse<MailchimpCampaign>> {
    return this.apiCall('/campaigns', 'POST', campaign);
  }

  async sendCampaign(campaignId: string): Promise<MailchimpResponse> {
    return this.apiCall(`/campaigns/${campaignId}/actions/send`, 'POST');
  }

  async getCampaign(campaignId: string): Promise<MailchimpResponse<MailchimpCampaign>> {
    return this.apiCall(`/campaigns/${campaignId}`, 'GET');
  }

  async getCampaignStats(campaignId: string): Promise<MailchimpResponse<MailchimpCampaignStats>> {
    return this.apiCall(`/reports/${campaignId}`, 'GET');
  }

  // List Operations
  async createList(list: Omit<MailchimpList, 'id' | 'date_created' | 'stats'>): Promise<MailchimpResponse<MailchimpList>> {
    return this.apiCall('/lists', 'POST', list);
  }

  async getList(listId: string): Promise<MailchimpResponse<MailchimpList>> {
    return this.apiCall(`/lists/${listId}`, 'GET');
  }

  // Core API Call Method
  private async apiCall<T = unknown>(
    endpoint: string,
    method: string,
    body?: unknown
  ): Promise<MailchimpResponse<T>> {
    if (!this.credentials.apiKey) {
      return { ok: false, error: 'Missing API key' };
    }

    try {
      // Mailchimp uses Basic Auth with 'anystring:apikey'
      const auth = btoa(`anystring:${this.credentials.apiKey}`);

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          ok: false,
          error: error.detail || error.title || `Mailchimp API error: ${response.status}`
        };
      }

      const data = method !== 'DELETE' && response.status !== 204
        ? await response.json()
        : {};

      return { ok: true, data: data as T };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Request failed'
      };
    }
  }

  // Helper: Generate subscriber hash from email
  static async getSubscriberHash(email: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(email.toLowerCase());
    const hashBuffer = await crypto.subtle.digest('MD5', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export function createMailchimpClient(credentials: MailchimpCredentials): MailchimpClient {
  return new MailchimpClient(credentials);
}

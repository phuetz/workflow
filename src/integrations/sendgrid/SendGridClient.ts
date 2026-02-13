/**
 * SendGrid API Client
 * Implements email delivery for SendGrid API v3
 */

import type {
  SendGridCredentials,
  SendGridResponse,
  SendGridEmail,
  SendGridContact,
  SendGridList
} from './sendgrid.types';

export class SendGridClient {
  private credentials: SendGridCredentials;
  private baseUrl = 'https://api.sendgrid.com/v3';

  constructor(credentials: SendGridCredentials) {
    this.credentials = credentials;
  }

  // Email Operations
  async sendEmail(email: SendGridEmail): Promise<SendGridResponse> {
    return this.apiCall('/mail/send', 'POST', email);
  }

  async sendTemplate(data: {
    to: string;
    from: string;
    template_id: string;
    dynamic_template_data?: Record<string, unknown>;
    subject?: string;
  }): Promise<SendGridResponse> {
    const email: SendGridEmail = {
      personalizations: [{
        to: [{ email: data.to }],
        dynamic_template_data: data.dynamic_template_data,
        subject: data.subject
      }],
      from: { email: data.from },
      template_id: data.template_id
    };

    return this.sendEmail(email);
  }

  // Contact Operations
  async addContact(contact: Omit<SendGridContact, 'id' | 'created_at' | 'updated_at'>): Promise<SendGridResponse<SendGridContact>> {
    return this.apiCall('/marketing/contacts', 'PUT', {
      contacts: [contact]
    });
  }

  async updateContact(contactId: string, contact: Partial<SendGridContact>): Promise<SendGridResponse<SendGridContact>> {
    return this.apiCall('/marketing/contacts', 'PUT', {
      contacts: [{ ...contact, id: contactId }]
    });
  }

  // List Operations
  async createList(name: string): Promise<SendGridResponse<SendGridList>> {
    return this.apiCall('/marketing/lists', 'POST', { name });
  }

  async addContactToList(listId: string, contactIds: string[]): Promise<SendGridResponse> {
    return this.apiCall('/marketing/lists', 'PUT', {
      list_ids: [listId],
      contacts: contactIds
    });
  }

  // Core API Call Method
  private async apiCall<T = unknown>(
    endpoint: string,
    method: string,
    body?: unknown
  ): Promise<SendGridResponse<T>> {
    if (!this.credentials.apiKey) {
      return { ok: false, error: 'Missing API key' };
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${this.credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          ok: false,
          error: error.errors?.[0]?.message || error.error || `SendGrid API error: ${response.status}`
        };
      }

      // Some endpoints return 202 with no body
      const data = response.status !== 202 && response.status !== 204
        ? await response.json().catch(() => ({}))
        : {};

      return { ok: true, data: data as T };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Request failed'
      };
    }
  }
}

export function createSendGridClient(credentials: SendGridCredentials): SendGridClient {
  return new SendGridClient(credentials);
}

/**
 * Twilio API Client
 * PROJET SAUVÉ - Phase 6: Communication
 */

import type { TwilioCredentials, TwilioResponse, TwilioMessage } from './twilio.types';

export class TwilioClient {
  private credentials: TwilioCredentials;
  private baseUrl = 'https://api.twilio.com/2010-04-01';

  constructor(credentials: TwilioCredentials) {
    this.credentials = credentials;
  }

  async sendSMS(to: string, body: string, from?: string): Promise<TwilioResponse<TwilioMessage>> {
    const fromNumber = from || this.credentials.fromNumber;
    if (!fromNumber) {
      return { ok: false, error: 'From number not configured' };
    }

    return this.apiCall(`/Accounts/${this.credentials.accountSid}/Messages.json`, 'POST', {
      To: to,
      From: fromNumber,
      Body: body,
    });
  }

  async makeCall(to: string, url: string, from?: string): Promise<TwilioResponse> {
    const fromNumber = from || this.credentials.fromNumber;
    if (!fromNumber) {
      return { ok: false, error: 'From number not configured' };
    }

    return this.apiCall(`/Accounts/${this.credentials.accountSid}/Calls.json`, 'POST', {
      To: to,
      From: fromNumber,
      Url: url,
    });
  }

  async sendWhatsApp(to: string, body: string): Promise<TwilioResponse<TwilioMessage>> {
    const from = this.credentials.fromNumber;
    if (!from) {
      return { ok: false, error: 'From number not configured' };
    }

    return this.apiCall(`/Accounts/${this.credentials.accountSid}/Messages.json`, 'POST', {
      To: `whatsapp:${to}`,
      From: `whatsapp:${from}`,
      Body: body,
    });
  }

  private async apiCall<T = unknown>(endpoint: string, method: string, body?: unknown): Promise<TwilioResponse<T>> {
    const auth = btoa(`${this.credentials.accountSid}:${this.credentials.authToken}`);

    try {
      const formBody = new URLSearchParams(body as Record<string, string>);
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
      });

      const data = await response.json();
      if (!response.ok) {
        return { ok: false, error: data.message || 'API request failed' };
      }

      return { ok: true, data: data as T };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'API request failed' };
    }
  }
}

export function createTwilioClient(credentials: TwilioCredentials): TwilioClient {
  return new TwilioClient(credentials);
}

/**
 * PayPal API Client
 * Implements payment and invoicing operations for PayPal REST API
 */

import type {
  PayPalCredentials,
  PayPalResponse,
  PayPalPayment,
  PayPalOrder,
  PayPalInvoice,
  PayPalAccessTokenResponse
} from './paypal.types';

export class PayPalClient {
  private credentials: PayPalCredentials;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(credentials: PayPalCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  // Payment Operations
  async createPayment(payment: Omit<PayPalPayment, 'id' | 'state' | 'create_time' | 'update_time'>): Promise<PayPalResponse<PayPalPayment>> {
    return this.apiCall('/v1/payments/payment', 'POST', payment);
  }

  async executePayment(paymentId: string, payerId: string): Promise<PayPalResponse<PayPalPayment>> {
    return this.apiCall(`/v1/payments/payment/${paymentId}/execute`, 'POST', { payer_id: payerId });
  }

  async getPayment(paymentId: string): Promise<PayPalResponse<PayPalPayment>> {
    return this.apiCall(`/v1/payments/payment/${paymentId}`, 'GET');
  }

  // Order Operations (v2)
  async createOrder(order: Omit<PayPalOrder, 'id' | 'status' | 'create_time' | 'update_time'>): Promise<PayPalResponse<PayPalOrder>> {
    return this.apiCall('/v2/checkout/orders', 'POST', order);
  }

  async captureOrder(orderId: string): Promise<PayPalResponse<PayPalOrder>> {
    return this.apiCall(`/v2/checkout/orders/${orderId}/capture`, 'POST');
  }

  // Invoice Operations
  async createInvoice(invoice: Omit<PayPalInvoice, 'id' | 'status'>): Promise<PayPalResponse<PayPalInvoice>> {
    return this.apiCall('/v2/invoicing/invoices', 'POST', invoice);
  }

  async sendInvoice(invoiceId: string): Promise<PayPalResponse> {
    return this.apiCall(`/v2/invoicing/invoices/${invoiceId}/send`, 'POST');
  }

  async getInvoice(invoiceId: string): Promise<PayPalResponse<PayPalInvoice>> {
    return this.apiCall(`/v2/invoicing/invoices/${invoiceId}`, 'GET');
  }

  // Authentication
  private async getAccessToken(): Promise<string | null> {
    // Check if token is still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = btoa(`${this.credentials.clientId}:${this.credentials.clientSecret}`);

      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        return null;
      }

      const data: PayPalAccessTokenResponse = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 minute before expiry

      return this.accessToken;
    } catch {
      return null;
    }
  }

  // Core API Call Method
  private async apiCall<T = unknown>(
    endpoint: string,
    method: string,
    body?: unknown
  ): Promise<PayPalResponse<T>> {
    if (!this.credentials.clientId || !this.credentials.clientSecret) {
      return { ok: false, error: 'Missing client ID or client secret' };
    }

    const token = await this.getAccessToken();
    if (!token) {
      return { ok: false, error: 'Failed to obtain access token' };
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
        const error = await response.json().catch(() => ({}));
        return {
          ok: false,
          error: error.message || error.error_description || `PayPal API error: ${response.status}`
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
}

export function createPayPalClient(credentials: PayPalCredentials): PayPalClient {
  return new PayPalClient(credentials);
}

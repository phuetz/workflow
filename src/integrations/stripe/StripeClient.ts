/**
 * Stripe API Client
 * Implements payment processing for Stripe API
 */

import type {
  StripeCredentials,
  StripeResponse,
  StripePaymentIntent,
  StripeCharge,
  StripeCustomer,
  StripeSubscription,
  StripeRefund,
  StripeBalance
} from './stripe.types';

export class StripeClient {
  private credentials: StripeCredentials;
  private baseUrl = 'https://api.stripe.com/v1';

  constructor(credentials: StripeCredentials) {
    this.credentials = credentials;
  }

  // Payment Intent Operations
  async createPaymentIntent(data: {
    amount: number;
    currency: string;
    customer?: string;
    payment_method?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<StripeResponse<StripePaymentIntent>> {
    return this.apiCall('/payment_intents', 'POST', data);
  }

  async confirmPaymentIntent(paymentIntentId: string, payment_method?: string): Promise<StripeResponse<StripePaymentIntent>> {
    const data = payment_method ? { payment_method } : {};
    return this.apiCall(`/payment_intents/${paymentIntentId}/confirm`, 'POST', data);
  }

  // Charge Operations
  async createCharge(data: {
    amount: number;
    currency: string;
    source?: string;
    customer?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<StripeResponse<StripeCharge>> {
    return this.apiCall('/charges', 'POST', data);
  }

  // Customer Operations
  async createCustomer(data: {
    email?: string;
    name?: string;
    phone?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<StripeResponse<StripeCustomer>> {
    return this.apiCall('/customers', 'POST', data);
  }

  async getCustomer(customerId: string): Promise<StripeResponse<StripeCustomer>> {
    return this.apiCall(`/customers/${customerId}`, 'GET');
  }

  // Subscription Operations
  async createSubscription(data: {
    customer: string;
    items: Array<{ price: string; quantity?: number }>;
    trial_period_days?: number;
    metadata?: Record<string, string>;
  }): Promise<StripeResponse<StripeSubscription>> {
    // Convert items array to form-encoded format
    const formData: Record<string, unknown> = {
      customer: data.customer,
      ...data.metadata && { metadata: data.metadata },
      ...data.trial_period_days && { trial_period_days: data.trial_period_days }
    };

    data.items.forEach((item, index) => {
      formData[`items[${index}][price]`] = item.price;
      if (item.quantity) {
        formData[`items[${index}][quantity]`] = item.quantity;
      }
    });

    return this.apiCall('/subscriptions', 'POST', formData);
  }

  async cancelSubscription(subscriptionId: string): Promise<StripeResponse<StripeSubscription>> {
    return this.apiCall(`/subscriptions/${subscriptionId}`, 'DELETE');
  }

  // Refund Operations
  async createRefund(data: {
    charge?: string;
    payment_intent?: string;
    amount?: number;
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  }): Promise<StripeResponse<StripeRefund>> {
    return this.apiCall('/refunds', 'POST', data);
  }

  // Balance Operations
  async getBalance(): Promise<StripeResponse<StripeBalance>> {
    return this.apiCall('/balance', 'GET');
  }

  // Core API Call Method
  private async apiCall<T = unknown>(
    endpoint: string,
    method: string,
    body?: Record<string, unknown>
  ): Promise<StripeResponse<T>> {
    if (!this.credentials.secretKey) {
      return { ok: false, error: 'Missing secret key' };
    }

    try {
      const auth = btoa(`${this.credentials.secretKey}:`);
      const headers: Record<string, string> = {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      // Convert body to form-encoded format
      let formBody = '';
      if (body) {
        formBody = Object.entries(body)
          .map(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              // Handle nested objects (e.g., metadata)
              return Object.entries(value)
                .map(([k, v]) => `${encodeURIComponent(key)}[${encodeURIComponent(k)}]=${encodeURIComponent(String(v))}`)
                .join('&');
            }
            return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
          })
          .join('&');
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: formBody || undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          error: data.error?.message || `Stripe API error: ${response.status}`
        };
      }

      return { ok: true, data: data as T };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Request failed'
      };
    }
  }
}

export function createStripeClient(credentials: StripeCredentials): StripeClient {
  return new StripeClient(credentials);
}

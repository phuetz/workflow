/**
 * Stripe Integration Types
 * Payment processing for charges, customers, and subscriptions
 */

export interface StripeCredentials {
  secretKey: string;
  publishableKey?: string;
}

export type StripeOperation =
  | 'createPaymentIntent'
  | 'confirmPaymentIntent'
  | 'createCharge'
  | 'createCustomer'
  | 'getCustomer'
  | 'createSubscription'
  | 'cancelSubscription'
  | 'createRefund'
  | 'getBalance';

export interface StripeResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface StripePaymentIntent {
  id?: string;
  object?: 'payment_intent';
  amount: number; // Amount in cents
  currency: string;
  status?: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  customer?: string;
  payment_method?: string;
  description?: string;
  metadata?: Record<string, string>;
  receipt_email?: string;
  created?: number;
}

export interface StripeCharge {
  id?: string;
  object?: 'charge';
  amount: number;
  currency: string;
  status?: 'succeeded' | 'pending' | 'failed';
  customer?: string;
  description?: string;
  metadata?: Record<string, string>;
  receipt_email?: string;
  created?: number;
}

export interface StripeCustomer {
  id?: string;
  object?: 'customer';
  email?: string;
  name?: string;
  phone?: string;
  description?: string;
  metadata?: Record<string, string>;
  created?: number;
}

export interface StripeSubscription {
  id?: string;
  object?: 'subscription';
  customer: string;
  status?: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing';
  items: {
    data: Array<{
      price?: string;
      quantity?: number;
    }>;
  };
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  current_period_start?: number;
  created?: number;
}

export interface StripeRefund {
  id?: string;
  object?: 'refund';
  amount?: number;
  charge?: string;
  payment_intent?: string;
  status?: 'succeeded' | 'pending' | 'failed' | 'canceled';
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  created?: number;
}

export interface StripeBalance {
  object?: 'balance';
  available: Array<{
    amount: number;
    currency: string;
  }>;
  pending: Array<{
    amount: number;
    currency: string;
  }>;
}

export interface StripeError {
  type: string;
  message: string;
  code?: string;
  param?: string;
}

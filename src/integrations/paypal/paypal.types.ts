/**
 * PayPal Integration Types
 * Payment processing and invoicing
 */

export interface PayPalCredentials {
  clientId: string;
  clientSecret: string;
  mode?: 'sandbox' | 'live';
}

export type PayPalOperation =
  | 'createPayment'
  | 'executePayment'
  | 'getPayment'
  | 'createInvoice'
  | 'sendInvoice'
  | 'getInvoice'
  | 'createOrder'
  | 'captureOrder';

export interface PayPalResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface PayPalPayment {
  id?: string;
  intent: 'sale' | 'authorize' | 'order';
  state?: 'created' | 'approved' | 'failed' | 'canceled';
  payer: {
    payment_method: 'paypal' | 'credit_card';
    payer_info?: {
      email?: string;
      first_name?: string;
      last_name?: string;
    };
  };
  transactions: Array<{
    amount: {
      total: string;
      currency: string;
    };
    description?: string;
    item_list?: {
      items: Array<{
        name: string;
        price: string;
        currency: string;
        quantity: number;
      }>;
    };
  }>;
  redirect_urls?: {
    return_url: string;
    cancel_url: string;
  };
  create_time?: string;
  update_time?: string;
}

export interface PayPalOrder {
  id?: string;
  status?: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED';
  intent: 'CAPTURE' | 'AUTHORIZE';
  purchase_units: Array<{
    reference_id?: string;
    amount: {
      currency_code: string;
      value: string;
    };
    description?: string;
  }>;
  create_time?: string;
  update_time?: string;
}

export interface PayPalInvoice {
  id?: string;
  status?: 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED';
  detail: {
    invoice_number?: string;
    invoice_date?: string;
    currency_code: string;
    note?: string;
  };
  invoicer?: {
    name?: {
      given_name?: string;
      surname?: string;
    };
    email_address?: string;
  };
  primary_recipients?: Array<{
    billing_info: {
      email_address: string;
      name?: {
        given_name?: string;
        surname?: string;
      };
    };
  }>;
  items?: Array<{
    name: string;
    quantity: string;
    unit_amount: {
      currency_code: string;
      value: string;
    };
    description?: string;
  }>;
  amount?: {
    currency_code: string;
    value: string;
  };
}

export interface PayPalAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

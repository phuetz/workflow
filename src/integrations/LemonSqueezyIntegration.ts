/**
 * LemonSqueezy Integration
 * Complete integration with LemonSqueezy for payments, subscriptions, and digital sales
 */

import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';

// Types
export interface LemonSqueezyConfig {
  apiKey: string;
  storeId: string;
  webhookSecret?: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

// Store Types
export interface LemonSqueezyStore {
  type: 'stores';
  id: string;
  attributes: {
    name: string;
    slug: string;
    domain: string;
    url: string;
    avatar_url: string;
    plan: string;
    country: string;
    country_nicename: string;
    currency: string;
    total_sales: number;
    total_revenue: number;
    thirty_day_sales: number;
    thirty_day_revenue: number;
    created_at: string;
    updated_at: string;
  };
  relationships?: {
    products?: RelationshipData;
    orders?: RelationshipData;
    subscriptions?: RelationshipData;
    discounts?: RelationshipData;
    license_keys?: RelationshipData;
  };
}

// Product Types
export interface LemonSqueezyProduct {
  type: 'products';
  id: string;
  attributes: {
    store_id: number;
    name: string;
    slug: string;
    description: string;
    status: 'draft' | 'published';
    status_formatted: string;
    thumb_url?: string;
    large_thumb_url?: string;
    price: number;
    price_formatted: string;
    from_price?: number;
    to_price?: number;
    pay_what_you_want: boolean;
    buy_now_url: string;
    created_at: string;
    updated_at: string;
    test_mode: boolean;
  };
  relationships?: {
    store?: RelationshipData;
    variants?: RelationshipData;
    files?: RelationshipData;
  };
}

// Variant Types
export interface LemonSqueezyVariant {
  type: 'variants';
  id: string;
  attributes: {
    product_id: number;
    name: string;
    slug: string;
    description?: string;
    price: number;
    is_subscription: boolean;
    interval?: 'day' | 'week' | 'month' | 'year';
    interval_count?: number;
    has_free_trial: boolean;
    trial_interval?: 'day' | 'week' | 'month' | 'year';
    trial_interval_count?: number;
    pay_what_you_want: boolean;
    min_price?: number;
    suggested_price?: number;
    product_id_string: string;
    has_license_keys: boolean;
    license_activation_limit?: number;
    is_license_limit_unlimited: boolean;
    license_length_value?: number;
    license_length_unit?: 'days' | 'months' | 'years';
    is_license_length_unlimited: boolean;
    sort: number;
    status: 'pending' | 'draft' | 'published';
    status_formatted: string;
    created_at: string;
    updated_at: string;
  };
  relationships?: {
    product?: RelationshipData;
    files?: RelationshipData;
    price_model?: RelationshipData;
  };
}

// Order Types
export interface LemonSqueezyOrder {
  type: 'orders';
  id: string;
  attributes: {
    store_id: number;
    customer_id: number;
    identifier: string;
    order_number: number;
    user_name: string;
    user_email: string;
    currency: string;
    currency_rate: string;
    subtotal: number;
    discount_total: number;
    tax: number;
    total: number;
    subtotal_usd: number;
    discount_total_usd: number;
    tax_usd: number;
    total_usd: number;
    tax_name?: string;
    tax_rate: string;
    status: 'pending' | 'failed' | 'paid' | 'refunded';
    status_formatted: string;
    refunded: boolean;
    refunded_at?: string;
    subtotal_formatted: string;
    discount_total_formatted: string;
    tax_formatted: string;
    total_formatted: string;
    first_order_item: {
      id: number;
      order_id: number;
      product_id: number;
      variant_id: number;
      product_name: string;
      variant_name: string;
      price: number;
      created_at: string;
      updated_at: string;
      test_mode: boolean;
    };
    urls: {
      receipt: string;
    };
    created_at: string;
    updated_at: string;
  };
  relationships?: {
    store?: RelationshipData;
    customer?: RelationshipData;
    order_items?: RelationshipData;
    subscriptions?: RelationshipData;
    license_keys?: RelationshipData;
    discount_redemptions?: RelationshipData;
  };
}

// Customer Types
export interface LemonSqueezyCustomer {
  type: 'customers';
  id: string;
  attributes: {
    store_id: number;
    name: string;
    email: string;
    status: 'subscribed' | 'unsubscribed' | 'archived';
    city?: string;
    region?: string;
    country: string;
    total_revenue_currency: number;
    mrr: number;
    status_formatted: string;
    country_formatted: string;
    total_revenue_currency_formatted: string;
    mrr_formatted: string;
    created_at: string;
    updated_at: string;
    test_mode: boolean;
  };
  relationships?: {
    store?: RelationshipData;
    orders?: RelationshipData;
    subscriptions?: RelationshipData;
    license_keys?: RelationshipData;
  };
}

// Subscription Types
export interface LemonSqueezySubscription {
  type: 'subscriptions';
  id: string;
  attributes: {
    store_id: number;
    customer_id: number;
    order_id: number;
    order_item_id: number;
    product_id: number;
    variant_id: number;
    product_name: string;
    variant_name: string;
    user_name: string;
    user_email: string;
    status: 'on_trial' | 'active' | 'paused' | 'past_due' | 'unpaid' | 'cancelled' | 'expired';
    status_formatted: string;
    card_brand?: string;
    card_last_four?: string;
    pause?: {
      mode: 'void' | 'free';
      resumes_at?: string;
    };
    cancelled: boolean;
    trial_ends_at?: string;
    billing_anchor: number;
    first_subscription_item: {
      id: number;
      subscription_id: number;
      price_id: number;
      quantity: number;
      is_usage_based: boolean;
      created_at: string;
      updated_at: string;
    };
    urls: {
      update_payment_method: string;
      customer_portal: string;
    };
    renews_at?: string;
    ends_at?: string;
    created_at: string;
    updated_at: string;
    test_mode: boolean;
  };
  relationships?: {
    store?: RelationshipData;
    customer?: RelationshipData;
    order?: RelationshipData;
    order_item?: RelationshipData;
    product?: RelationshipData;
    variant?: RelationshipData;
    subscription_items?: RelationshipData;
    subscription_invoices?: RelationshipData;
  };
}

// Subscription Invoice Types
export interface LemonSqueezySubscriptionInvoice {
  type: 'subscription-invoices';
  id: string;
  attributes: {
    store_id: number;
    subscription_id: number;
    customer_id: number;
    user_name: string;
    user_email: string;
    billing_reason: 'initial' | 'renewal' | 'updated';
    card_brand?: string;
    card_last_four?: string;
    currency: string;
    currency_rate: string;
    status: 'pending' | 'paid' | 'void' | 'refunded';
    status_formatted: string;
    refunded: boolean;
    refunded_at?: string;
    subtotal: number;
    discount_total: number;
    tax: number;
    total: number;
    subtotal_usd: number;
    discount_total_usd: number;
    tax_usd: number;
    total_usd: number;
    subtotal_formatted: string;
    discount_total_formatted: string;
    tax_formatted: string;
    total_formatted: string;
    urls: {
      invoice_url: string;
    };
    created_at: string;
    updated_at: string;
    test_mode: boolean;
  };
  relationships?: {
    store?: RelationshipData;
    subscription?: RelationshipData;
    customer?: RelationshipData;
  };
}

// Discount Types
export interface LemonSqueezyDiscount {
  type: 'discounts';
  id: string;
  attributes: {
    store_id: number;
    name: string;
    code: string;
    amount: number;
    amount_type: 'percent' | 'fixed';
    is_limited_to_products: boolean;
    is_limited_redemptions: boolean;
    max_redemptions: number;
    starts_at?: string;
    expires_at?: string;
    duration?: 'once' | 'repeating' | 'forever';
    duration_in_months?: number;
    status: 'draft' | 'published';
    status_formatted: string;
    created_at: string;
    updated_at: string;
    test_mode: boolean;
  };
  relationships?: {
    store?: RelationshipData;
    discount_redemptions?: RelationshipData;
    variants?: RelationshipData;
  };
}

// License Key Types
export interface LemonSqueezyLicenseKey {
  type: 'license-keys';
  id: string;
  attributes: {
    store_id: number;
    customer_id: number;
    order_id: number;
    order_item_id: number;
    product_id: number;
    user_name: string;
    user_email: string;
    key: string;
    key_short: string;
    activation_limit: number;
    instances_count: number;
    disabled: boolean;
    status: 'inactive' | 'active' | 'disabled' | 'expired';
    status_formatted: string;
    expires_at?: string;
    created_at: string;
    updated_at: string;
    test_mode: boolean;
  };
  relationships?: {
    store?: RelationshipData;
    customer?: RelationshipData;
    order?: RelationshipData;
    order_item?: RelationshipData;
    product?: RelationshipData;
    license_key_instances?: RelationshipData;
  };
}

// License Key Instance Types
export interface LemonSqueezyLicenseKeyInstance {
  type: 'license-key-instances';
  id: string;
  attributes: {
    license_key_id: number;
    identifier: string;
    name?: string;
    created_at: string;
    updated_at: string;
  };
  relationships?: {
    license_key?: RelationshipData;
  };
}

// File Types
export interface LemonSqueezyFile {
  type: 'files';
  id: string;
  attributes: {
    variant_id: number;
    identifier: string;
    name: string;
    extension: string;
    download_url: string;
    size: number;
    size_formatted: string;
    version?: string;
    sort: number;
    status: 'draft' | 'published';
    created_at: string;
    updated_at: string;
  };
  relationships?: {
    variant?: RelationshipData;
  };
}

// Checkout Types
export interface LemonSqueezyCheckout {
  type: 'checkouts';
  id: string;
  attributes: {
    store_id: number;
    variant_id: number;
    custom_price?: number;
    product_options: {
      name: string;
      description: string;
      media: string[];
      redirect_url?: string;
      receipt_button_text?: string;
      receipt_link_url?: string;
      receipt_thank_you_note?: string;
      enabled_variants: number[];
    };
    checkout_options: {
      embed?: boolean;
      media?: boolean;
      logo?: boolean;
      desc?: boolean;
      discount?: boolean;
      dark?: boolean;
      subscription_preview?: boolean;
      button_color?: string;
    };
    checkout_data: {
      email?: string;
      name?: string;
      billing_address?: {
        country?: string;
        zip?: string;
      };
      tax_number?: string;
      discount_code?: string;
      custom?: any;
      variant_quantities?: { [key: string]: number };
    };
    preview: {
      currency: string;
      currency_rate: number;
      subtotal: number;
      discount_total: number;
      tax: number;
      total: number;
      subtotal_usd: number;
      discount_total_usd: number;
      tax_usd: number;
      total_usd: number;
      subtotal_formatted: string;
      discount_total_formatted: string;
      tax_formatted: string;
      total_formatted: string;
    };
    expires_at?: string;
    created_at: string;
    updated_at: string;
    test_mode: boolean;
    url: string;
  };
  relationships?: {
    store?: RelationshipData;
    variant?: RelationshipData;
  };
}

// Webhook Types
export interface LemonSqueezyWebhook {
  meta: {
    test_mode: boolean;
    event_name: WebhookEventName;
    custom_data?: any;
  };
  data: any;
}

export type WebhookEventName = 
  | 'order_created'
  | 'order_refunded'
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_cancelled'
  | 'subscription_resumed'
  | 'subscription_expired'
  | 'subscription_paused'
  | 'subscription_unpaused'
  | 'subscription_payment_success'
  | 'subscription_payment_failed'
  | 'subscription_payment_recovered'
  | 'license_key_created'
  | 'license_key_updated';

// Helper Types
export interface RelationshipData {
  links?: {
    related?: string;
    self?: string;
  };
  data?: {
    type: string;
    id: string;
  } | Array<{
    type: string;
    id: string;
  }>;
}

export interface ApiResponse<T> {
  data: T;
  links?: {
    first?: string;
    last?: string;
    prev?: string;
    next?: string;
  };
  meta?: {
    page?: {
      currentPage: number;
      from: number;
      lastPage: number;
      perPage: number;
      to: number;
      total: number;
    };
  };
  included?: any[];
}

export interface ListOptions {
  page?: number;
  perPage?: number;
  include?: string[];
  filter?: { [key: string]: any };
  sort?: string;
}

export interface CreateCheckoutOptions {
  variantId: number;
  customPrice?: number;
  productOptions?: {
    name?: string;
    description?: string;
    media?: string[];
    redirect_url?: string;
    receipt_button_text?: string;
    receipt_link_url?: string;
    receipt_thank_you_note?: string;
  };
  checkoutOptions?: {
    embed?: boolean;
    media?: boolean;
    logo?: boolean;
    desc?: boolean;
    discount?: boolean;
    dark?: boolean;
    subscription_preview?: boolean;
    button_color?: string;
  };
  checkoutData?: {
    email?: string;
    name?: string;
    billing_address?: {
      country?: string;
      zip?: string;
    };
    tax_number?: string;
    discount_code?: string;
    custom?: any;
  };
  expiresAt?: string;
  preview?: boolean;
  testMode?: boolean;
}

// Main Integration Class
export class LemonSqueezyIntegration extends EventEmitter {
  private static instance: LemonSqueezyIntegration;
  private client: AxiosInstance;
  private config: LemonSqueezyConfig;

  private constructor(config: LemonSqueezyConfig) {
    super();
    this.config = config;
    this.client = this.createClient();
  }

  public static getInstance(config?: LemonSqueezyConfig): LemonSqueezyIntegration {
    if (!LemonSqueezyIntegration.instance) {
      if (!config) {
        throw new Error('LemonSqueezyIntegration requires configuration on first initialization');
      }
      LemonSqueezyIntegration.instance = new LemonSqueezyIntegration(config);
    }
    return LemonSqueezyIntegration.instance;
  }

  private createClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseUrl || 'https://api.lemonsqueezy.com/v1',
      timeout: this.config.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      }
    });
  }

  // Store Methods
  public async getStore(storeId?: string): Promise<LemonSqueezyStore> {
    try {
      const id = storeId || this.config.storeId;
      const response = await this.client.get(`/stores/${id}`);
      return response.data.data;
    } catch (error) {
      this.emit('error', { operation: 'getStore', error });
      throw error;
    }
  }

  public async listStores(options: ListOptions = {}): Promise<ApiResponse<LemonSqueezyStore[]>> {
    try {
      const response = await this.client.get('/stores', { params: options });
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'listStores', error });
      throw error;
    }
  }

  // Product Methods
  public async createProduct(data: {
    name: string;
    slug?: string;
    description?: string;
    price: number;
    pay_what_you_want?: boolean;
    status?: 'draft' | 'published';
    tax_category?: string;
  }): Promise<LemonSqueezyProduct> {
    try {
      const payload = {
        data: {
          type: 'products',
          attributes: data,
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: this.config.storeId
              }
            }
          }
        }
      };

      const response = await this.client.post('/products', payload);
      
      this.emit('product:created', response.data.data);
      return response.data.data;
    } catch (error) {
      this.emit('error', { operation: 'createProduct', error });
      throw error;
    }
  }

  public async getProduct(productId: string): Promise<LemonSqueezyProduct> {
    try {
      const response = await this.client.get(`/products/${productId}`);
      return response.data.data;
    } catch (error) {
      this.emit('error', { operation: 'getProduct', error });
      throw error;
    }
  }

  public async updateProduct(
    productId: string,
    data: Partial<{
      name: string;
      slug: string;
      description: string;
      price: number;
      status: 'draft' | 'published';
    }>
  ): Promise<LemonSqueezyProduct> {
    try {
      const payload = {
        data: {
          type: 'products',
          id: productId,
          attributes: data
        }
      };

      const response = await this.client.patch(`/products/${productId}`, payload);
      
      this.emit('product:updated', response.data.data);
      return response.data.data;
    } catch (error) {
      this.emit('error', { operation: 'updateProduct', error });
      throw error;
    }
  }

  public async deleteProduct(productId: string): Promise<void> {
    try {
      await this.client.delete(`/products/${productId}`);
      this.emit('product:deleted', { productId });
    } catch (error) {
      this.emit('error', { operation: 'deleteProduct', error });
      throw error;
    }
  }

  public async listProducts(
    options: ListOptions = {}
  ): Promise<ApiResponse<LemonSqueezyProduct[]>> {
    try {
      const params = {
        ...options,
        'filter[store_id]': this.config.storeId
      };
      
      const response = await this.client.get('/products', { params });
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'listProducts', error });
      throw error;
    }
  }

  // Variant Methods
  public async createVariant(
    productId: string,
    data: {
      name: string;
      slug?: string;
      description?: string;
      price: number;
      is_subscription?: boolean;
      interval?: 'day' | 'week' | 'month' | 'year';
      interval_count?: number;
      has_free_trial?: boolean;
      trial_interval?: 'day' | 'week' | 'month' | 'year';
      trial_interval_count?: number;
      sort?: number;
    }
  ): Promise<LemonSqueezyVariant> {
    try {
      const payload = {
        data: {
          type: 'variants',
          attributes: data,
          relationships: {
            product: {
              data: {
                type: 'products',
                id: productId
              }
            }
          }
        }
      };

      const response = await this.client.post('/variants', payload);
      
      this.emit('variant:created', response.data.data);
      return response.data.data;
    } catch (error) {
      this.emit('error', { operation: 'createVariant', error });
      throw error;
    }
  }

  public async getVariant(variantId: string): Promise<LemonSqueezyVariant> {
    try {
      const response = await this.client.get(`/variants/${variantId}`);
      return response.data.data;
    } catch (error) {
      this.emit('error', { operation: 'getVariant', error });
      throw error;
    }
  }

  public async updateVariant(
    variantId: string,
    data: Partial<{
      name: string;
      slug: string;
      description: string;
      price: number;
      sort: number;
    }>
  ): Promise<LemonSqueezyVariant> {
    try {
      const payload = {
        data: {
          type: 'variants',
          id: variantId,
          attributes: data
        }
      };

      const response = await this.client.patch(`/variants/${variantId}`, payload);
      
      this.emit('variant:updated', response.data.data);
      return response.data.data;
    } catch (error) {
      this.emit('error', { operation: 'updateVariant', error });
      throw error;
    }
  }

  public async deleteVariant(variantId: string): Promise<void> {
    try {
      await this.client.delete(`/variants/${variantId}`);
      this.emit('variant:deleted', { variantId });
    } catch (error) {
      this.emit('error', { operation: 'deleteVariant', error });
      throw error;
    }
  }

  // Order Methods
  public async getOrder(orderId: string): Promise<LemonSqueezyOrder> {
    try {
      const response = await this.client.get(`/orders/${orderId}`);
      return response.data.data;
    } catch (error) {
      this.emit('error', { operation: 'getOrder', error });
      throw error;
    }
  }

  public async listOrders(
    options: ListOptions = {}
  ): Promise<ApiResponse<LemonSqueezyOrder[]>> {
    try {
      const params = {
        ...options,
        'filter[store_id]': this.config.storeId
      };
      
      const response = await this.client.get('/orders', { params });
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'listOrders', error });
      throw error;
    }
  }

  // Customer Methods
  public async getCustomer(customerId: string): Promise<LemonSqueezyCustomer> {
    try {
      const response = await this.client.get(`/customers/${customerId}`);
      return response.data.data;
    } catch (error) {
      this.emit('error', { operation: 'getCustomer', error });
      throw error;
    }
  }

  public async listCustomers(
    options: ListOptions = {}
  ): Promise<ApiResponse<LemonSqueezyCustomer[]>> {
    try {
      const params = {
        ...options,
        'filter[store_id]': this.config.storeId
      };
      
      const response = await this.client.get('/customers', { params });
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'listCustomers', error });
      throw error;
    }
  }

  public async updateCustomer(
    customerId: string,
    data: {
      name?: string;
      email?: string;
      city?: string;
      region?: string;
      country?: string;
    }
  ): Promise<LemonSqueezyCustomer> {
    try {
      const payload = {
        data: {
          type: 'customers',
          id: customerId,
          attributes: data
        }
      };

      const response = await this.client.patch(`/customers/${customerId}`, payload);
      
      this.emit('customer:updated', response.data.data);
      return response.data.data;
    } catch (error) {
      this.emit('error', { operation: 'updateCustomer', error });
      throw error;
    }
  }

  // Subscription Methods
  public async getSubscription(subscriptionId: string): Promise<LemonSqueezySubscription> {
    try {
      const response = await this.client.get(`/subscriptions/${subscriptionId}`);
      return response.data.data;
    } catch (error) {
      this.emit('error', { operation: 'getSubscription', error });
      throw error;
    }
  }

  public async listSubscriptions(
    options: ListOptions = {}
  ): Promise<ApiResponse<LemonSqueezySubscription[]>> {
    try {
      const params = {
        ...options,
        'filter[store_id]': this.config.storeId
      };
      
      const response = await this.client.get('/subscriptions', { params });
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'listSubscriptions', error });
      throw error;
    }
  }

  public async updateSubscription(
    subscriptionId: string,
    data: {
      variant_id?: number;
      pause?: { mode: 'void' | 'free'; resumes_at?: string } | null;
      cancelled?: boolean;
      billing_anchor?: number;
    }
  ): Promise<LemonSqueezySubscription> {
    try {
      const payload = {
        data: {
          type: 'subscriptions',
          id: subscriptionId,
          attributes: data
        }
      };

      const response = await this.client.patch(`/subscriptions/${subscriptionId}`, payload);
      
      this.emit('subscription:updated', response.data.data);
      return response.data.data;
    } catch (error) {
      this.emit('error', { operation: 'updateSubscription', error });
      throw error;
    }
  }

  public async cancelSubscription(subscriptionId: string): Promise<LemonSqueezySubscription> {
    return this.updateSubscription(subscriptionId, { cancelled: true });
  }

  public async pauseSubscription(
    subscriptionId: string,
    mode: 'void' | 'free',
    resumesAt?: string
  ): Promise<LemonSqueezySubscription> {
    return this.updateSubscription(subscriptionId, {
      pause: { mode, resumes_at: resumesAt }
    });
  }

  public async resumeSubscription(subscriptionId: string): Promise<LemonSqueezySubscription> {
    return this.updateSubscription(subscriptionId, { pause: null });
  }

  // Discount Methods
  public async createDiscount(data: {
    name: string;
    code: string;
    amount: number;
    amount_type: 'percent' | 'fixed';
    duration?: 'once' | 'repeating' | 'forever';
    duration_in_months?: number;
    max_redemptions?: number;
    starts_at?: string;
    expires_at?: string;
    variant_ids?: number[];
  }): Promise<LemonSqueezyDiscount> {
    try {
      const payload = {
        data: {
          type: 'discounts',
          attributes: data,
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: this.config.storeId
              }
            }
          }
        }
      };

      const response = await this.client.post('/discounts', payload);
      
      this.emit('discount:created', response.data.data);
      return response.data.data;
    } catch (error) {
      this.emit('error', { operation: 'createDiscount', error });
      throw error;
    }
  }

  public async getDiscount(discountId: string): Promise<LemonSqueezyDiscount> {
    try {
      const response = await this.client.get(`/discounts/${discountId}`);
      return response.data.data;
    } catch (error) {
      this.emit('error', { operation: 'getDiscount', error });
      throw error;
    }
  }

  public async deleteDiscount(discountId: string): Promise<void> {
    try {
      await this.client.delete(`/discounts/${discountId}`);
      this.emit('discount:deleted', { discountId });
    } catch (error) {
      this.emit('error', { operation: 'deleteDiscount', error });
      throw error;
    }
  }

  // License Key Methods
  public async getLicenseKey(licenseKeyId: string): Promise<LemonSqueezyLicenseKey> {
    try {
      const response = await this.client.get(`/license-keys/${licenseKeyId}`);
      return response.data.data;
    } catch (error) {
      this.emit('error', { operation: 'getLicenseKey', error });
      throw error;
    }
  }

  public async listLicenseKeys(
    options: ListOptions = {}
  ): Promise<ApiResponse<LemonSqueezyLicenseKey[]>> {
    try {
      const params = {
        ...options,
        'filter[store_id]': this.config.storeId
      };
      
      const response = await this.client.get('/license-keys', { params });
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'listLicenseKeys', error });
      throw error;
    }
  }

  public async updateLicenseKey(
    licenseKeyId: string,
    data: {
      activation_limit?: number;
      disabled?: boolean;
      expires_at?: string;
    }
  ): Promise<LemonSqueezyLicenseKey> {
    try {
      const payload = {
        data: {
          type: 'license-keys',
          id: licenseKeyId,
          attributes: data
        }
      };

      const response = await this.client.patch(`/license-keys/${licenseKeyId}`, payload);
      
      this.emit('licenseKey:updated', response.data.data);
      return response.data.data;
    } catch (error) {
      this.emit('error', { operation: 'updateLicenseKey', error });
      throw error;
    }
  }

  // Checkout Methods
  public async createCheckout(
    options: CreateCheckoutOptions
  ): Promise<LemonSqueezyCheckout> {
    try {
      const payload = {
        data: {
          type: 'checkouts',
          attributes: {
            custom_price: options.customPrice,
            product_options: options.productOptions || {},
            checkout_options: options.checkoutOptions || {},
            checkout_data: options.checkoutData || {},
            expires_at: options.expiresAt,
            preview: options.preview,
            test_mode: options.testMode
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: this.config.storeId
              }
            },
            variant: {
              data: {
                type: 'variants',
                id: options.variantId.toString()
              }
            }
          }
        }
      };

      const response = await this.client.post('/checkouts', payload);
      
      this.emit('checkout:created', response.data.data);
      return response.data.data;
    } catch (error) {
      this.emit('error', { operation: 'createCheckout', error });
      throw error;
    }
  }

  public async getCheckout(checkoutId: string): Promise<LemonSqueezyCheckout> {
    try {
      const response = await this.client.get(`/checkouts/${checkoutId}`);
      return response.data.data;
    } catch (error) {
      this.emit('error', { operation: 'getCheckout', error });
      throw error;
    }
  }

  // Webhook Processing
  public async processWebhook(
    payload: LemonSqueezyWebhook,
    signature?: string
  ): Promise<void> {
    try {
      // Verify signature if provided
      if (signature && this.config.webhookSecret) {
        const isValid = this.verifyWebhookSignature(
          JSON.stringify(payload),
          signature,
          this.config.webhookSecret
        );
        
        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Process based on event type
      const eventName = payload.meta.event_name;
      
      this.emit(`webhook:${eventName}`, payload.data);
      this.emit('webhook:processed', { eventName, data: payload.data });
    } catch (error) {
      this.emit('error', { operation: 'processWebhook', error });
      throw error;
    }
  }

  private verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const digest = hmac.digest('hex');
    
    return signature === digest;
  }

  // Helper Methods
  public async getCustomerByEmail(email: string): Promise<LemonSqueezyCustomer | null> {
    const result = await this.listCustomers({
      filter: { email }
    });
    
    return result.data.length > 0 ? result.data[0] : null;
  }

  public async getActiveSubscriptions(
    customerId?: string
  ): Promise<LemonSqueezySubscription[]> {
    const params: any = {
      'filter[status]': 'active'
    };
    
    if (customerId) {
      params['filter[customer_id]'] = customerId;
    }
    
    const result = await this.listSubscriptions(params);
    return result.data;
  }

  public generateCheckoutUrl(variantId: number, options: {
    discount?: string;
    name?: string;
    email?: string;
    custom?: any;
  } = {}): string {
    const params = new URLSearchParams();
    
    if (options.discount) params.append('discount', options.discount);
    if (options.name) params.append('checkout[name]', options.name);
    if (options.email) params.append('checkout[email]', options.email);
    if (options.custom) {
      for (const [key, value] of Object.entries(options.custom)) {
        params.append(`checkout[custom][${key}]`, value as string);
      }
    }
    
    const baseUrl = `https://${this.config.storeId}.lemonsqueezy.com/checkout/buy/${variantId}`;
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  }
}

// Export singleton getter
export default function getLemonSqueezyIntegration(config?: LemonSqueezyConfig): LemonSqueezyIntegration {
  return LemonSqueezyIntegration.getInstance(config);
}
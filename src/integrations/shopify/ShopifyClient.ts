/**
 * Shopify API Client
 * Implements e-commerce operations for Shopify Admin API
 */

import type {
  ShopifyCredentials,
  ShopifyResponse,
  ShopifyProduct,
  ShopifyOrder,
  ShopifyCustomer
} from './shopify.types';

export class ShopifyClient {
  private credentials: ShopifyCredentials;
  private baseUrl: string;

  constructor(credentials: ShopifyCredentials) {
    this.credentials = credentials;

    // Normalize shop name to full domain
    const shopName = credentials.shopName.replace('.myshopify.com', '');
    this.baseUrl = `https://${shopName}.myshopify.com/admin/api/2024-01`;
  }

  // Product Operations
  async createProduct(product: Partial<ShopifyProduct>): Promise<ShopifyResponse<ShopifyProduct>> {
    const response = await this.apiCall<{ product: ShopifyProduct }>(
      '/products.json',
      'POST',
      { product }
    );

    if (response.ok && response.data?.product) {
      return { ok: true, data: response.data.product };
    }

    return { ok: false, error: response.error };
  }

  async updateProduct(productId: number, product: Partial<ShopifyProduct>): Promise<ShopifyResponse<ShopifyProduct>> {
    const response = await this.apiCall<{ product: ShopifyProduct }>(
      `/products/${productId}.json`,
      'PUT',
      { product }
    );

    if (response.ok && response.data?.product) {
      return { ok: true, data: response.data.product };
    }

    return { ok: false, error: response.error };
  }

  async getProduct(productId: number): Promise<ShopifyResponse<ShopifyProduct>> {
    const response = await this.apiCall<{ product: ShopifyProduct }>(
      `/products/${productId}.json`,
      'GET'
    );

    if (response.ok && response.data?.product) {
      return { ok: true, data: response.data.product };
    }

    return { ok: false, error: response.error };
  }

  async listProducts(params?: { limit?: number; since_id?: number }): Promise<ShopifyResponse<ShopifyProduct[]>> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.since_id) query.append('since_id', params.since_id.toString());

    const response = await this.apiCall<{ products: ShopifyProduct[] }>(
      `/products.json?${query.toString()}`,
      'GET'
    );

    if (response.ok && response.data?.products) {
      return { ok: true, data: response.data.products };
    }

    return { ok: false, error: response.error };
  }

  async deleteProduct(productId: number): Promise<ShopifyResponse> {
    return this.apiCall(`/products/${productId}.json`, 'DELETE');
  }

  // Order Operations
  async createOrder(order: Partial<ShopifyOrder>): Promise<ShopifyResponse<ShopifyOrder>> {
    const response = await this.apiCall<{ order: ShopifyOrder }>(
      '/orders.json',
      'POST',
      { order }
    );

    if (response.ok && response.data?.order) {
      return { ok: true, data: response.data.order };
    }

    return { ok: false, error: response.error };
  }

  async getOrder(orderId: number): Promise<ShopifyResponse<ShopifyOrder>> {
    const response = await this.apiCall<{ order: ShopifyOrder }>(
      `/orders/${orderId}.json`,
      'GET'
    );

    if (response.ok && response.data?.order) {
      return { ok: true, data: response.data.order };
    }

    return { ok: false, error: response.error };
  }

  async listOrders(params?: { limit?: number; status?: string }): Promise<ShopifyResponse<ShopifyOrder[]>> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.status) query.append('status', params.status);

    const response = await this.apiCall<{ orders: ShopifyOrder[] }>(
      `/orders.json?${query.toString()}`,
      'GET'
    );

    if (response.ok && response.data?.orders) {
      return { ok: true, data: response.data.orders };
    }

    return { ok: false, error: response.error };
  }

  // Customer Operations
  async getCustomer(customerId: number): Promise<ShopifyResponse<ShopifyCustomer>> {
    const response = await this.apiCall<{ customer: ShopifyCustomer }>(
      `/customers/${customerId}.json`,
      'GET'
    );

    if (response.ok && response.data?.customer) {
      return { ok: true, data: response.data.customer };
    }

    return { ok: false, error: response.error };
  }

  // Core API Call Method
  private async apiCall<T = unknown>(
    endpoint: string,
    method: string,
    body?: unknown
  ): Promise<ShopifyResponse<T>> {
    const token = this.credentials.accessToken;
    const apiKey = this.credentials.apiKey;
    const apiPassword = this.credentials.apiPassword;

    if (!token && !(apiKey && apiPassword)) {
      return { ok: false, error: 'Missing credentials (access token or API key + password)' };
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Shopify supports both OAuth and Basic Auth
      if (token) {
        headers['X-Shopify-Access-Token'] = token;
      } else if (apiKey && apiPassword) {
        const auth = btoa(`${apiKey}:${apiPassword}`);
        headers['Authorization'] = `Basic ${auth}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          ok: false,
          error: error.errors || `Shopify API error: ${response.status}`
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

export function createShopifyClient(credentials: ShopifyCredentials): ShopifyClient {
  return new ShopifyClient(credentials);
}

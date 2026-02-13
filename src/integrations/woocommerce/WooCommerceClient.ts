/**
 * WooCommerce API Client
 * Implements e-commerce operations for WooCommerce REST API
 */

import type {
  WooCommerceCredentials,
  WooCommerceResponse,
  WooCommerceProduct,
  WooCommerceOrder
} from './woocommerce.types';

export class WooCommerceClient {
  private credentials: WooCommerceCredentials;
  private baseUrl: string;

  constructor(credentials: WooCommerceCredentials) {
    this.credentials = credentials;
    // Remove trailing slash if present
    const url = credentials.url.replace(/\/$/, '');
    this.baseUrl = `${url}/wp-json/wc/v3`;
  }

  // Product Operations
  async createProduct(product: Omit<WooCommerceProduct, 'id' | 'date_created' | 'date_modified'>): Promise<WooCommerceResponse<WooCommerceProduct>> {
    return this.apiCall('/products', 'POST', product);
  }

  async updateProduct(productId: number, product: Partial<WooCommerceProduct>): Promise<WooCommerceResponse<WooCommerceProduct>> {
    return this.apiCall(`/products/${productId}`, 'PUT', product);
  }

  async getProduct(productId: number): Promise<WooCommerceResponse<WooCommerceProduct>> {
    return this.apiCall(`/products/${productId}`, 'GET');
  }

  async listProducts(params?: { per_page?: number; page?: number; search?: string; status?: string }): Promise<WooCommerceResponse<WooCommerceProduct[]>> {
    const query = new URLSearchParams();
    if (params?.per_page) query.append('per_page', params.per_page.toString());
    if (params?.page) query.append('page', params.page.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);

    return this.apiCall(`/products?${query.toString()}`, 'GET');
  }

  async deleteProduct(productId: number, force = false): Promise<WooCommerceResponse> {
    const query = force ? '?force=true' : '';
    return this.apiCall(`/products/${productId}${query}`, 'DELETE');
  }

  // Order Operations
  async getOrder(orderId: number): Promise<WooCommerceResponse<WooCommerceOrder>> {
    return this.apiCall(`/orders/${orderId}`, 'GET');
  }

  async listOrders(params?: { per_page?: number; page?: number; status?: string }): Promise<WooCommerceResponse<WooCommerceOrder[]>> {
    const query = new URLSearchParams();
    if (params?.per_page) query.append('per_page', params.per_page.toString());
    if (params?.page) query.append('page', params.page.toString());
    if (params?.status) query.append('status', params.status);

    return this.apiCall(`/orders?${query.toString()}`, 'GET');
  }

  async updateOrder(orderId: number, order: Partial<WooCommerceOrder>): Promise<WooCommerceResponse<WooCommerceOrder>> {
    return this.apiCall(`/orders/${orderId}`, 'PUT', order);
  }

  // Core API Call Method
  private async apiCall<T = unknown>(
    endpoint: string,
    method: string,
    body?: unknown
  ): Promise<WooCommerceResponse<T>> {
    if (!this.credentials.consumerKey || !this.credentials.consumerSecret) {
      return { ok: false, error: 'Missing consumer key or consumer secret' };
    }

    try {
      // WooCommerce uses Basic Auth with consumer key/secret
      const auth = btoa(`${this.credentials.consumerKey}:${this.credentials.consumerSecret}`);

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
          error: error.message || `WooCommerce API error: ${response.status}`
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

export function createWooCommerceClient(credentials: WooCommerceCredentials): WooCommerceClient {
  return new WooCommerceClient(credentials);
}

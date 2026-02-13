/**
 * WooCommerce Integration Types
 * WordPress e-commerce plugin for products and orders
 */

export interface WooCommerceCredentials {
  url: string; // e.g., 'https://example.com'
  consumerKey: string;
  consumerSecret: string;
}

export type WooCommerceOperation =
  | 'createProduct'
  | 'updateProduct'
  | 'getProduct'
  | 'listProducts'
  | 'deleteProduct'
  | 'getOrder'
  | 'listOrders'
  | 'updateOrder';

export interface WooCommerceResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface WooCommerceProduct {
  id?: number;
  name: string;
  type?: 'simple' | 'grouped' | 'external' | 'variable';
  status?: 'draft' | 'pending' | 'private' | 'publish';
  featured?: boolean;
  description?: string;
  short_description?: string;
  sku?: string;
  regular_price?: string;
  sale_price?: string;
  stock_quantity?: number;
  manage_stock?: boolean;
  stock_status?: 'instock' | 'outofstock' | 'onbackorder';
  categories?: Array<{ id: number; name?: string }>;
  images?: Array<{ src: string; alt?: string }>;
  date_created?: string;
  date_modified?: string;
}

export interface WooCommerceOrder {
  id?: number;
  status?: 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed';
  currency?: string;
  date_created?: string;
  date_modified?: string;
  total?: string;
  total_tax?: string;
  customer_id?: number;
  billing?: WooCommerceAddress;
  shipping?: WooCommerceAddress;
  payment_method?: string;
  payment_method_title?: string;
  line_items?: Array<{
    id?: number;
    name?: string;
    product_id?: number;
    quantity: number;
    price?: string;
    total?: string;
  }>;
}

export interface WooCommerceAddress {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface WooCommerceListResponse<T> {
  data: T[];
  total?: number;
  total_pages?: number;
}

/**
 * Shopify Integration Types
 * E-commerce platform for products, orders, and customers
 */

export interface ShopifyCredentials {
  apiKey?: string;
  apiPassword?: string;
  accessToken?: string;
  shopName: string; // e.g., 'my-store' or 'my-store.myshopify.com'
}

export type ShopifyOperation =
  | 'createProduct'
  | 'updateProduct'
  | 'getProduct'
  | 'listProducts'
  | 'deleteProduct'
  | 'createOrder'
  | 'getOrder'
  | 'listOrders'
  | 'updateInventory'
  | 'getCustomer';

export interface ShopifyResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface ShopifyProduct {
  id?: number;
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  tags?: string;
  status?: 'active' | 'archived' | 'draft';
  variants?: ShopifyVariant[];
  images?: Array<{ src: string; alt?: string }>;
  created_at?: string;
  updated_at?: string;
}

export interface ShopifyVariant {
  id?: number;
  product_id?: number;
  title?: string;
  price: string;
  sku?: string;
  inventory_quantity?: number;
  weight?: number;
  weight_unit?: 'g' | 'kg' | 'oz' | 'lb';
  requires_shipping?: boolean;
}

export interface ShopifyOrder {
  id?: number;
  email?: string;
  financial_status?: 'pending' | 'authorized' | 'paid' | 'refunded';
  fulfillment_status?: 'fulfilled' | 'partial' | 'unfulfilled' | null;
  line_items?: Array<{
    product_id?: number;
    variant_id?: number;
    title: string;
    quantity: number;
    price: string;
  }>;
  customer?: {
    id?: number;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  shipping_address?: ShopifyAddress;
  billing_address?: ShopifyAddress;
  total_price?: string;
  subtotal_price?: string;
  total_tax?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ShopifyAddress {
  first_name?: string;
  last_name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  country?: string;
  zip?: string;
  phone?: string;
}

export interface ShopifyCustomer {
  id?: number;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  tags?: string;
  accepts_marketing?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShopifyListResponse<T> {
  data: T[];
  nextPageInfo?: string;
}

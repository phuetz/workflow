import { NodeType } from '../../types/workflow';

export const ECOMMERCE_NODES: Record<string, NodeType> = {
  stripe: {
      type: 'stripe',
      label: 'Stripe',
      icon: 'CreditCard',
      color: 'bg-purple-700',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'Stripe payments'
    },
  paypal: {
      type: 'paypal',
      label: 'PayPal',
      icon: 'DollarSign',
      color: 'bg-blue-600',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'PayPal payments'
    },
  shopify: {
      type: 'shopify',
      label: 'Shopify',
      icon: 'ShoppingBag',
      color: 'bg-green-800',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'Shopify store integration'
    },
  woocommerce: {
      type: 'woocommerce',
      label: 'WooCommerce',
      icon: 'ShoppingCart',
      color: 'bg-purple-600',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'WooCommerce WordPress integration'
    },
  magento: {
      type: 'magento',
      label: 'Magento',
      icon: 'Store',
      color: 'bg-orange-600',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'Magento e-commerce platform'
    },
  bigcommerce: {
      type: 'bigcommerce',
      label: 'BigCommerce',
      icon: 'ShoppingBag',
      color: 'bg-blue-700',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'BigCommerce e-commerce'
    },
  amazonSeller: {
      type: 'amazonSeller',
      label: 'Amazon Seller',
      icon: 'Package',
      color: 'bg-orange-600',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'Amazon Seller Central'
    },
  ebay: {
      type: 'ebay',
      label: 'eBay',
      icon: 'Gavel',
      color: 'bg-red-600',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'eBay marketplace integration'
    },
  etsy: {
      type: 'etsy',
      label: 'Etsy',
      icon: 'Heart',
      color: 'bg-orange-500',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'Etsy marketplace integration'
    },
  square: {
      type: 'square',
      label: 'Square',
      icon: 'Square',
      color: 'bg-gray-800',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'Square payment processing'
    },
  shopifyStore: {
      type: 'shopifyStore',
      label: 'Shopify Store',
      icon: 'ShoppingBag',
      color: 'bg-green-800',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'Shopify (products, orders, customers)'
    },
  wooCommerceStore: {
      type: 'wooCommerceStore',
      label: 'WooCommerce',
      icon: 'ShoppingCart',
      color: 'bg-purple-700',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'WooCommerce (variations, coupons)'
    },
  magentoStore: {
      type: 'magentoStore',
      label: 'Magento',
      icon: 'Store',
      color: 'bg-orange-700',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'Magento e-commerce platform'
    },
  bigCommerceStore: {
      type: 'bigCommerceStore',
      label: 'BigCommerce',
      icon: 'ShoppingBag',
      color: 'bg-blue-800',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'BigCommerce catalog and orders'
    },
  prestashop: {
      type: 'prestashop',
      label: 'PrestaShop',
      icon: 'Store',
      color: 'bg-pink-600',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'PrestaShop e-commerce'
    },
  opencart: {
      type: 'opencart',
      label: 'OpenCart',
      icon: 'ShoppingCart',
      color: 'bg-blue-600',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'OpenCart platform'
    },
  ecwid: {
      type: 'ecwid',
      label: 'Ecwid',
      icon: 'Store',
      color: 'bg-orange-600',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'Ecwid store management'
    },
  squareCommerce: {
      type: 'squareCommerce',
      label: 'Square Commerce',
      icon: 'Square',
      color: 'bg-gray-800',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'Square payments and catalog'
    },
  chargebee: {
      type: 'chargebee',
      label: 'Chargebee',
      icon: 'CreditCard',
      color: 'bg-orange-500',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'Chargebee subscription billing'
    },
  recurly: {
      type: 'recurly',
      label: 'Recurly',
      icon: 'RefreshCw',
      color: 'bg-blue-700',
      category: 'ecommerce',
      inputs: 1,
      outputs: 1,
      description: 'Recurly recurring billing'
    }
};

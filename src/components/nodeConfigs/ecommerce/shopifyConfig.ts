import { NodeConfigDefinition, validators } from '../../../types/nodeConfig';

export const shopifyConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Shop Domain',
      field: 'shopDomain',
      type: 'text',
      placeholder: 'mystore.myshopify.com',
      required: true,
      description: 'Your Shopify store domain',
      validation: (value) => {
        if (!value) return 'Shop domain is required';
        if (typeof value !== 'string') return 'Shop domain must be a string';
        if (!value.includes('.myshopify.com') && !value.includes('.')) {
          return 'Invalid shop domain format';
        }
        return null;
      }
    },
    {
      label: 'Access Token',
      field: 'accessToken',
      type: 'password',
      placeholder: 'shpat_...',
      required: true,
      description: 'Private app access token',
      validation: validators.required('Access Token')
    },
    {
      label: 'API Version',
      field: 'apiVersion',
      type: 'select',
      defaultValue: '2024-01',
      options: [
        { value: '2024-01', label: '2024-01 (Latest)' },
        { value: '2023-10', label: '2023-10' },
        { value: '2023-07', label: '2023-07' },
        { value: '2023-04', label: '2023-04' }
      ]
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      defaultValue: 'getProduct',
      options: [
        { value: 'getProduct', label: 'Get Product' },
        { value: 'listProducts', label: 'List Products' },
        { value: 'createProduct', label: 'Create Product' },
        { value: 'updateProduct', label: 'Update Product' },
        { value: 'deleteProduct', label: 'Delete Product' },
        { value: 'getOrder', label: 'Get Order' },
        { value: 'listOrders', label: 'List Orders' },
        { value: 'createOrder', label: 'Create Order' },
        { value: 'updateOrder', label: 'Update Order' },
        { value: 'fulfillOrder', label: 'Fulfill Order' },
        { value: 'cancelOrder', label: 'Cancel Order' },
        { value: 'getCustomer', label: 'Get Customer' },
        { value: 'listCustomers', label: 'List Customers' },
        { value: 'createCustomer', label: 'Create Customer' },
        { value: 'updateCustomer', label: 'Update Customer' },
        { value: 'createDraftOrder', label: 'Create Draft Order' },
        { value: 'updateInventory', label: 'Update Inventory' },
        { value: 'createWebhook', label: 'Create Webhook' }
      ]
    },
    {
      label: 'Product ID',
      field: 'productId',
      type: 'text',
      placeholder: '123456789',
      description: 'Shopify product ID'
    },
    {
      label: 'Order ID',
      field: 'orderId',
      type: 'text',
      placeholder: '987654321',
      description: 'Shopify order ID'
    },
    {
      label: 'Customer ID',
      field: 'customerId',
      type: 'text',
      placeholder: '555555555',
      description: 'Shopify customer ID'
    },
    {
      label: 'Product Title',
      field: 'productTitle',
      type: 'text',
      placeholder: 'Amazing Product',
      description: 'Product name'
    },
    {
      label: 'Product Description',
      field: 'productDescription',
      type: 'expression',
      placeholder: 'This product is {{$json.adjective}}!',
      description: 'Product description (HTML supported)'
    },
    {
      label: 'Product Type',
      field: 'productType',
      type: 'text',
      placeholder: 'T-Shirt',
      description: 'Product category'
    },
    {
      label: 'Vendor',
      field: 'vendor',
      type: 'text',
      placeholder: 'Your Brand',
      description: 'Product vendor/brand'
    },
    {
      label: 'Tags',
      field: 'tags',
      type: 'text',
      placeholder: 'summer, sale, featured',
      description: 'Comma-separated tags'
    },
    {
      label: 'Price',
      field: 'price',
      type: 'number',
      placeholder: '29.99',
      description: 'Product price'
    },
    {
      label: 'Compare at Price',
      field: 'compareAtPrice',
      type: 'number',
      placeholder: '39.99',
      description: 'Original price (for sales)'
    },
    {
      label: 'SKU',
      field: 'sku',
      type: 'text',
      placeholder: 'SKU-001',
      description: 'Stock keeping unit'
    },
    {
      label: 'Inventory Quantity',
      field: 'inventoryQuantity',
      type: 'number',
      placeholder: '100',
      description: 'Stock quantity'
    },
    {
      label: 'Weight',
      field: 'weight',
      type: 'number',
      placeholder: '0.5',
      description: 'Product weight'
    },
    {
      label: 'Weight Unit',
      field: 'weightUnit',
      type: 'select',
      defaultValue: 'kg',
      options: [
        { value: 'g', label: 'Grams' },
        { value: 'kg', label: 'Kilograms' },
        { value: 'oz', label: 'Ounces' },
        { value: 'lb', label: 'Pounds' }
      ]
    },
    {
      label: 'Status',
      field: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'draft', label: 'Draft' },
        { value: 'archived', label: 'Archived' }
      ]
    },
    {
      label: 'Images',
      field: 'images',
      type: 'json',
      placeholder: '[{"src": "https://example.com/image1.jpg", "alt": "Product image"}]',
      description: 'Product images array',
      validation: validators.json
    },
    {
      label: 'Variants',
      field: 'variants',
      type: 'json',
      placeholder: '[{"option1": "Small", "price": "19.99", "sku": "SKU-S"}]',
      description: 'Product variants',
      validation: validators.json
    },
    {
      label: 'Customer Email',
      field: 'customerEmail',
      type: 'email',
      placeholder: 'customer@example.com',
      description: 'Customer email address',
      validation: validators.email
    },
    {
      label: 'Customer First Name',
      field: 'customerFirstName',
      type: 'text',
      placeholder: 'John',
      description: 'Customer first name'
    },
    {
      label: 'Customer Last Name',
      field: 'customerLastName',
      type: 'text',
      placeholder: 'Doe',
      description: 'Customer last name'
    },
    {
      label: 'Line Items',
      field: 'lineItems',
      type: 'json',
      placeholder: '[{"variant_id": 123, "quantity": 2}]',
      description: 'Order line items',
      validation: validators.json
    },
    {
      label: 'Shipping Address',
      field: 'shippingAddress',
      type: 'json',
      placeholder: '{"address1": "123 Main St", "city": "New York", "province": "NY", "zip": "10001", "country": "US"}',
      description: 'Shipping address',
      validation: validators.json
    },
    {
      label: 'Fulfillment Status',
      field: 'fulfillmentStatus',
      type: 'select',
      defaultValue: 'fulfilled',
      options: [
        { value: 'fulfilled', label: 'Fulfilled' },
        { value: 'partial', label: 'Partially Fulfilled' },
        { value: 'unfulfilled', label: 'Unfulfilled' }
      ]
    },
    {
      label: 'Financial Status',
      field: 'financialStatus',
      type: 'select',
      defaultValue: 'paid',
      options: [
        { value: 'paid', label: 'Paid' },
        { value: 'partially_paid', label: 'Partially Paid' },
        { value: 'pending', label: 'Pending' },
        { value: 'refunded', label: 'Refunded' },
        { value: 'voided', label: 'Voided' }
      ]
    },
    {
      label: 'Note',
      field: 'note',
      type: 'text',
      placeholder: 'Special instructions',
      description: 'Order note'
    },
    {
      label: 'Limit',
      field: 'limit',
      type: 'number',
      placeholder: '50',
      defaultValue: 50,
      description: 'Number of items to retrieve'
    },
    {
      label: 'Fields',
      field: 'fields',
      type: 'text',
      placeholder: 'id,title,variants',
      description: 'Comma-separated fields to return'
    },
    {
      label: 'Webhook Topic',
      field: 'webhookTopic',
      type: 'select',
      options: [
        { value: 'orders/create', label: 'Order Created' },
        { value: 'orders/updated', label: 'Order Updated' },
        { value: 'orders/paid', label: 'Order Paid' },
        { value: 'orders/fulfilled', label: 'Order Fulfilled' },
        { value: 'products/create', label: 'Product Created' },
        { value: 'products/update', label: 'Product Updated' },
        { value: 'customers/create', label: 'Customer Created' }
      ]
    },
    {
      label: 'Webhook URL',
      field: 'webhookUrl',
      type: 'text',
      placeholder: 'https://example.com/shopify/webhook',
      description: 'Your webhook endpoint',
      validation: validators.url
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Auth validation
    if (!config.shopDomain) errors.shopDomain = 'Shop domain is required';
    if (!config.accessToken) errors.accessToken = 'Access token is required';

    // Operation-specific validation
    switch (config.operation) {
      case 'getProduct':
      case 'updateProduct':
      case 'deleteProduct':
        if (!config.productId) errors.productId = 'Product ID is required';
        break;
      
      case 'createProduct':
        if (!config.productTitle) errors.productTitle = 'Product title is required';
        break;
      
      case 'getOrder':
      case 'updateOrder':
      case 'fulfillOrder':
      case 'cancelOrder':
        if (!config.orderId) errors.orderId = 'Order ID is required';
        break;
      
      case 'createOrder':
        if (!config.lineItems) errors.lineItems = 'Line items are required';
        break;
      
      case 'getCustomer':
      case 'updateCustomer':
        if (!config.customerId) errors.customerId = 'Customer ID is required';
        break;
      
      case 'createCustomer':
        if (!config.customerEmail) errors.customerEmail = 'Customer email is required';
        break;
      
      case 'createWebhook':
        if (!config.webhookTopic) errors.webhookTopic = 'Webhook topic is required';
        if (!config.webhookUrl) errors.webhookUrl = 'Webhook URL is required';
        break;
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON fields
    const jsonFields = ['images', 'variants', 'lineItems', 'shippingAddress'];

    jsonFields.forEach(field => {
      if (config[field] && typeof config[field] === 'string') {
        try {
          config[field] = JSON.parse(config[field]);
        } catch (e) {
          // Keep as string
        }
      }
    });

    // Build API URL
    const protocol = 'https://';
    const shopDomain = config.shopDomain;
    const domain = typeof shopDomain === 'string' && shopDomain.includes('://')
      ? shopDomain.replace(/https?:\/\//, '')
      : shopDomain;

    config.apiUrl = `${protocol}${domain}/admin/api/${config.apiVersion}`;

    return config;
  },

  examples: [
    {
      label: 'Get Product',
      config: {
        shopDomain: 'mystore.myshopify.com',
        accessToken: 'shpat_YOUR_TOKEN',
        apiVersion: '2024-01',
        operation: 'getProduct',
        productId: '{{$json.productId}}',
        fields: 'id,title,variants,images'
      }
    },
    {
      label: 'Create Product',
      config: {
        shopDomain: 'mystore.myshopify.com',
        accessToken: 'shpat_YOUR_TOKEN',
        apiVersion: '2024-01',
        operation: 'createProduct',
        productTitle: '{{$json.name}}',
        productDescription: '{{$json.description}}',
        productType: 'T-Shirt',
        vendor: 'Your Brand',
        price: 29.99,
        sku: 'SKU-{{$json.sku}}',
        inventoryQuantity: 100,
        images: JSON.stringify([
          {
            src: '{{$json.imageUrl}}',
            alt: '{{$json.name}}'
          }
        ], null, 2)
      }
    },
    {
      label: 'Create Order',
      config: {
        shopDomain: 'mystore.myshopify.com',
        accessToken: 'shpat_YOUR_TOKEN',
        apiVersion: '2024-01',
        operation: 'createOrder',
        customerEmail: '{{$json.email}}',
        lineItems: JSON.stringify([
          {
            variant_id: '{{$json.variantId}}',
            quantity: 2,
            price: '29.99'
          }
        ], null, 2),
        shippingAddress: JSON.stringify({
          first_name: '{{$json.firstName}}',
          last_name: '{{$json.lastName}}',
          address1: '{{$json.address}}',
          city: '{{$json.city}}',
          province: '{{$json.state}}',
          zip: '{{$json.zipCode}}',
          country: 'US'
        }, null, 2),
        financialStatus: 'paid'
      }
    },
    {
      label: 'Update Inventory',
      config: {
        shopDomain: 'mystore.myshopify.com',
        accessToken: 'shpat_YOUR_TOKEN',
        apiVersion: '2024-01',
        operation: 'updateInventory',
        productId: '{{$json.productId}}',
        inventoryQuantity: '{{$json.newQuantity}}'
      }
    },
    {
      label: 'List Recent Orders',
      config: {
        shopDomain: 'mystore.myshopify.com',
        accessToken: 'shpat_YOUR_TOKEN',
        apiVersion: '2024-01',
        operation: 'listOrders',
        limit: 10,
        status: 'any',
        financialStatus: 'paid',
        fields: 'id,name,total_price,customer,created_at'
      }
    },
    {
      label: 'Setup Order Webhook',
      config: {
        shopDomain: 'mystore.myshopify.com',
        accessToken: 'shpat_YOUR_TOKEN',
        apiVersion: '2024-01',
        operation: 'createWebhook',
        webhookTopic: 'orders/create',
        webhookUrl: 'https://example.com/shopify/order-created'
      }
    }
  ]
};
import { NodeConfigDefinition, validators } from '../../../types/nodeConfig';

export const paypalConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Environment',
      field: 'environment',
      type: 'select',
      required: true,
      defaultValue: 'sandbox',
      options: [
        { value: 'sandbox', label: 'Sandbox (Testing)' },
        { value: 'production', label: 'Production (Live)' }
      ]
    },
    {
      label: 'Client ID',
      field: 'clientId',
      type: 'text',
      placeholder: 'AYSq3RDGsmBLJE-otTkBtM...',
      required: true,
      description: 'PayPal app client ID',
      validation: validators.required('Client ID')
    },
    {
      label: 'Client Secret',
      field: 'clientSecret',
      type: 'password',
      placeholder: 'EGnHDxD_qRPdaLdZz8iCr8...',
      required: true,
      description: 'PayPal app client secret',
      validation: validators.required('Client Secret')
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      defaultValue: 'createOrder',
      options: [
        { value: 'createOrder', label: 'Create Order' },
        { value: 'captureOrder', label: 'Capture Order' },
        { value: 'getOrder', label: 'Get Order Details' },
        { value: 'authorizeOrder', label: 'Authorize Order' },
        { value: 'createPayout', label: 'Create Payout' },
        { value: 'createInvoice', label: 'Create Invoice' },
        { value: 'sendInvoice', label: 'Send Invoice' },
        { value: 'createSubscription', label: 'Create Subscription' },
        { value: 'updateSubscription', label: 'Update Subscription' },
        { value: 'cancelSubscription', label: 'Cancel Subscription' },
        { value: 'refundCapture', label: 'Refund Capture' },
        { value: 'createWebhook', label: 'Create Webhook' },
        { value: 'verifyWebhook', label: 'Verify Webhook' }
      ]
    },
    {
      label: 'Amount',
      field: 'amount',
      type: 'number',
      placeholder: '100.00',
      description: 'Amount in currency units (e.g., 100.00 = $100)',
      validation: (value, config) => {
        if ((config.operation === 'createOrder' || config.operation === 'createPayout') && !value) {
          return 'Amount is required';
        }
        if (value && typeof value === 'number' && value < 0) {
          return 'Amount must be positive';
        }
        return null;
      }
    },
    {
      label: 'Currency',
      field: 'currency',
      type: 'select',
      defaultValue: 'USD',
      options: [
        { value: 'USD', label: 'USD - US Dollar' },
        { value: 'EUR', label: 'EUR - Euro' },
        { value: 'GBP', label: 'GBP - British Pound' },
        { value: 'CAD', label: 'CAD - Canadian Dollar' },
        { value: 'AUD', label: 'AUD - Australian Dollar' },
        { value: 'JPY', label: 'JPY - Japanese Yen' },
        { value: 'CNY', label: 'CNY - Chinese Yuan' },
        { value: 'INR', label: 'INR - Indian Rupee' },
        { value: 'MXN', label: 'MXN - Mexican Peso' },
        { value: 'BRL', label: 'BRL - Brazilian Real' }
      ]
    },
    {
      label: 'Order ID',
      field: 'orderId',
      type: 'text',
      placeholder: '2GG280847V5640712',
      description: 'PayPal order ID',
      validation: (value, config) => {
        if ((config.operation === 'captureOrder' || config.operation === 'getOrder' || config.operation === 'authorizeOrder') && !value) {
          return 'Order ID is required';
        }
        return null;
      }
    },
    {
      label: 'Intent',
      field: 'intent',
      type: 'select',
      defaultValue: 'CAPTURE',
      options: [
        { value: 'CAPTURE', label: 'Capture - Immediate payment' },
        { value: 'AUTHORIZE', label: 'Authorize - Authorize now, capture later' }
      ]
    },
    {
      label: 'Return URL',
      field: 'returnUrl',
      type: 'text',
      placeholder: 'https://example.com/success',
      description: 'URL to redirect after approval',
      validation: validators.url
    },
    {
      label: 'Cancel URL',
      field: 'cancelUrl',
      type: 'text',
      placeholder: 'https://example.com/cancel',
      description: 'URL to redirect if cancelled',
      validation: validators.url
    },
    {
      label: 'Description',
      field: 'description',
      type: 'text',
      placeholder: 'Payment for order #{{$json.orderId}}',
      description: 'Order description'
    },
    {
      label: 'Invoice Number',
      field: 'invoiceNumber',
      type: 'text',
      placeholder: 'INV-{{$json.invoiceId}}',
      description: 'Unique invoice number'
    },
    {
      label: 'Items',
      field: 'items',
      type: 'json',
      placeholder: '[{"name": "Product", "unit_amount": {"value": "10.00", "currency_code": "USD"}, "quantity": "1"}]',
      description: 'Order items (JSON array)',
      validation: validators.json
    },
    {
      label: 'Shipping',
      field: 'shipping',
      type: 'json',
      placeholder: '{"name": {"full_name": "John Doe"}, "address": {"address_line_1": "123 Main St", "admin_area_2": "New York", "admin_area_1": "NY", "postal_code": "10001", "country_code": "US"}}',
      description: 'Shipping information',
      validation: validators.json
    },
    {
      label: 'Payer Email',
      field: 'payerEmail',
      type: 'email',
      placeholder: 'customer@example.com',
      description: 'Customer email address',
      validation: validators.email
    },
    {
      label: 'Payer Name',
      field: 'payerName',
      type: 'text',
      placeholder: 'John Doe',
      description: 'Customer full name'
    },
    {
      label: 'Recipient Email',
      field: 'recipientEmail',
      type: 'email',
      placeholder: 'recipient@example.com',
      description: 'Payout recipient email',
      validation: validators.email
    },
    {
      label: 'Payout Batch ID',
      field: 'payoutBatchId',
      type: 'text',
      placeholder: 'batch_{{$timestamp}}',
      description: 'Unique batch identifier'
    },
    {
      label: 'Plan ID',
      field: 'planId',
      type: 'text',
      placeholder: 'P-5ML4271244454362WXNWU5NQ',
      description: 'Subscription plan ID'
    },
    {
      label: 'Start Time',
      field: 'startTime',
      type: 'text',
      placeholder: '{{$now.toISO()}}',
      description: 'Subscription start time (ISO 8601)'
    },
    {
      label: 'Webhook URL',
      field: 'webhookUrl',
      type: 'text',
      placeholder: 'https://example.com/paypal/webhook',
      description: 'Your webhook endpoint URL',
      validation: validators.url
    },
    {
      label: 'Webhook Events',
      field: 'webhookEvents',
      type: 'json',
      placeholder: '["PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.REFUNDED"]',
      description: 'Events to subscribe to',
      validation: validators.json
    },
    {
      label: 'Note to Payer',
      field: 'noteToPayer',
      type: 'text',
      placeholder: 'Thank you for your purchase!',
      description: 'Note shown to customer'
    },
    {
      label: 'Custom ID',
      field: 'customId',
      type: 'text',
      placeholder: '{{$json.internalOrderId}}',
      description: 'Your internal reference ID'
    },
    {
      label: 'Application Context',
      field: 'applicationContext',
      type: 'json',
      placeholder: '{"brand_name": "Your Company", "shipping_preference": "NO_SHIPPING"}',
      description: 'Additional context settings',
      validation: validators.json
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Auth validation
    if (!config.clientId) errors.clientId = 'Client ID is required';
    if (!config.clientSecret) errors.clientSecret = 'Client Secret is required';

    // Operation-specific validation
    switch (config.operation) {
      case 'createOrder':
        if (!config.amount) errors.amount = 'Amount is required';
        if (!config.currency) errors.currency = 'Currency is required';
        break;
      
      case 'captureOrder':
      case 'getOrder':
      case 'authorizeOrder':
        if (!config.orderId) errors.orderId = 'Order ID is required';
        break;
      
      case 'createPayout':
        if (!config.amount) errors.amount = 'Amount is required';
        if (!config.recipientEmail) errors.recipientEmail = 'Recipient email is required';
        if (!config.payoutBatchId) errors.payoutBatchId = 'Payout batch ID is required';
        break;
      
      case 'createInvoice':
        if (!config.invoiceNumber) errors.invoiceNumber = 'Invoice number is required';
        break;
      
      case 'createSubscription':
        if (!config.planId) errors.planId = 'Plan ID is required';
        break;
      
      case 'createWebhook':
        if (!config.webhookUrl) errors.webhookUrl = 'Webhook URL is required';
        if (!config.webhookEvents) errors.webhookEvents = 'Webhook events are required';
        break;
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON fields
    const jsonFields = ['items', 'shipping', 'webhookEvents', 'applicationContext'];

    jsonFields.forEach(field => {
      if (config[field as keyof typeof config] && typeof config[field as keyof typeof config] === 'string') {
        try {
          (config as any)[field] = JSON.parse(config[field as keyof typeof config] as string);
        } catch (e) {
          // Keep as string
        }
      }
    });

    // Build API base URL
    (config as any).apiBaseUrl = config.environment === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    return config;
  },

  examples: [
    {
      label: 'Simple Payment',
      config: {
        environment: 'sandbox',
        clientId: 'YOUR_CLIENT_ID',
        clientSecret: 'YOUR_CLIENT_SECRET',
        operation: 'createOrder',
        amount: 100.00,
        currency: 'USD',
        intent: 'CAPTURE',
        description: 'Payment for order #{{$json.orderId}}',
        returnUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      }
    },
    {
      label: 'Order with Items',
      config: {
        environment: 'sandbox',
        clientId: 'YOUR_CLIENT_ID',
        clientSecret: 'YOUR_CLIENT_SECRET',
        operation: 'createOrder',
        amount: 150.00,
        currency: 'USD',
        items: JSON.stringify([
          {
            name: 'T-shirt',
            unit_amount: {
              value: '50.00',
              currency_code: 'USD'
            },
            quantity: '2'
          },
          {
            name: 'Shipping',
            unit_amount: {
              value: '50.00',
              currency_code: 'USD'
            },
            quantity: '1'
          }
        ], null, 2),
        shipping: JSON.stringify({
          name: {
            full_name: '{{$json.customerName}}'
          },
          address: {
            address_line_1: '{{$json.address}}',
            admin_area_2: '{{$json.city}}',
            admin_area_1: '{{$json.state}}',
            postal_code: '{{$json.zipCode}}',
            country_code: 'US'
          }
        }, null, 2)
      }
    },
    {
      label: 'Capture Payment',
      config: {
        environment: 'sandbox',
        clientId: 'YOUR_CLIENT_ID',
        clientSecret: 'YOUR_CLIENT_SECRET',
        operation: 'captureOrder',
        orderId: '{{$json.paypalOrderId}}'
      }
    },
    {
      label: 'Create Payout',
      config: {
        environment: 'sandbox',
        clientId: 'YOUR_CLIENT_ID',
        clientSecret: 'YOUR_CLIENT_SECRET',
        operation: 'createPayout',
        amount: 50.00,
        currency: 'USD',
        recipientEmail: '{{$json.sellerEmail}}',
        payoutBatchId: 'payout_{{$timestamp}}',
        noteToPayer: 'Commission payment for sales'
      }
    },
    {
      label: 'Create Subscription',
      config: {
        environment: 'sandbox',
        clientId: 'YOUR_CLIENT_ID',
        clientSecret: 'YOUR_CLIENT_SECRET',
        operation: 'createSubscription',
        planId: 'P-MONTHLY-PREMIUM-PLAN',
        startTime: '{{$now.plus({days: 1}).toISO()}}',
        payerEmail: '{{$json.email}}',
        customId: '{{$json.userId}}',
        applicationContext: JSON.stringify({
          brand_name: 'Your Company',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW'
        }, null, 2)
      }
    }
  ]
};
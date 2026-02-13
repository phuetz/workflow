import { NodeConfigDefinition, validators } from '../../../types/nodeConfig';

export const stripeConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'API Key',
      field: 'apiKey',
      type: 'password',
      placeholder: 'sk_test_...',
      required: true,
      description: 'Stripe secret API key',
      validation: (value) => {
        if (!value) return 'API key is required';
        if (typeof value === 'string' && !value.startsWith('sk_')) {
          return 'API key must start with sk_';
        }
        return null;
      }
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      defaultValue: 'createPaymentIntent',
      options: [
        { value: 'createPaymentIntent', label: 'Create Payment Intent' },
        { value: 'confirmPaymentIntent', label: 'Confirm Payment Intent' },
        { value: 'capturePaymentIntent', label: 'Capture Payment Intent' },
        { value: 'createCharge', label: 'Create Charge (Legacy)' },
        { value: 'createCustomer', label: 'Create Customer' },
        { value: 'updateCustomer', label: 'Update Customer' },
        { value: 'getCustomer', label: 'Get Customer' },
        { value: 'listCustomers', label: 'List Customers' },
        { value: 'createSubscription', label: 'Create Subscription' },
        { value: 'updateSubscription', label: 'Update Subscription' },
        { value: 'cancelSubscription', label: 'Cancel Subscription' },
        { value: 'createRefund', label: 'Create Refund' },
        { value: 'createProduct', label: 'Create Product' },
        { value: 'createPrice', label: 'Create Price' },
        { value: 'createCheckoutSession', label: 'Create Checkout Session' },
        { value: 'createPaymentLink', label: 'Create Payment Link' },
        { value: 'verifyWebhook', label: 'Verify Webhook Signature' }
      ]
    },
    {
      label: 'Amount',
      field: 'amount',
      type: 'number',
      placeholder: '1000',
      description: 'Amount in cents (e.g., 1000 = $10.00)',
      validation: (value, _config) => {
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
      defaultValue: 'usd',
      options: [
        { value: 'usd', label: 'USD - US Dollar' },
        { value: 'eur', label: 'EUR - Euro' },
        { value: 'gbp', label: 'GBP - British Pound' },
        { value: 'cad', label: 'CAD - Canadian Dollar' },
        { value: 'aud', label: 'AUD - Australian Dollar' },
        { value: 'jpy', label: 'JPY - Japanese Yen' },
        { value: 'cny', label: 'CNY - Chinese Yuan' },
        { value: 'inr', label: 'INR - Indian Rupee' },
        { value: 'mxn', label: 'MXN - Mexican Peso' },
        { value: 'brl', label: 'BRL - Brazilian Real' }
      ]
    },
    {
      label: 'Customer ID',
      field: 'customerId',
      type: 'text',
      placeholder: 'cus_...',
      description: 'Stripe customer ID'
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
      label: 'Customer Name',
      field: 'customerName',
      type: 'text',
      placeholder: 'John Doe',
      description: 'Customer full name'
    },
    {
      label: 'Description',
      field: 'description',
      type: 'text',
      placeholder: 'Payment for order #{{$json.orderId}}',
      description: 'Payment description'
    },
    {
      label: 'Payment Method ID',
      field: 'paymentMethodId',
      type: 'text',
      placeholder: 'pm_...',
      description: 'Payment method ID'
    },
    {
      label: 'Payment Intent ID',
      field: 'paymentIntentId',
      type: 'text',
      placeholder: 'pi_...',
      description: 'Payment intent ID',
      validation: (value, _config) => {
        return null;
      }
    },
    {
      label: 'Charge ID',
      field: 'chargeId',
      type: 'text',
      placeholder: 'ch_...',
      description: 'Charge ID for refunds'
    },
    {
      label: 'Subscription Plan ID',
      field: 'priceId',
      type: 'text',
      placeholder: 'price_...',
      description: 'Price ID for subscriptions'
    },
    {
      label: 'Subscription ID',
      field: 'subscriptionId',
      type: 'text',
      placeholder: 'sub_...',
      description: 'Subscription ID for update/cancel operations'
    },
    {
      label: 'Trial Period Days',
      field: 'trialPeriodDays',
      type: 'number',
      placeholder: '14',
      description: 'Free trial period in days'
    },
    {
      label: 'Metadata',
      field: 'metadata',
      type: 'json',
      placeholder: '{"orderId": "{{$json.orderId}}", "userId": "{{$json.userId}}"}',
      description: 'Additional metadata as JSON',
      validation: validators.json
    },
    {
      label: 'Statement Descriptor',
      field: 'statementDescriptor',
      type: 'text',
      placeholder: 'COMPANY NAME',
      description: 'Text on customer bank statement (max 22 chars)'
    },
    {
      label: 'Shipping',
      field: 'shipping',
      type: 'json',
      placeholder: '{"name": "John Doe", "address": {"line1": "123 Main St", "city": "New York", "state": "NY", "postal_code": "10001", "country": "US"}}',
      description: 'Shipping information',
      validation: validators.json
    },
    {
      label: 'Success URL',
      field: 'successUrl',
      type: 'text',
      placeholder: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
      description: 'Redirect URL after successful payment',
      validation: validators.url
    },
    {
      label: 'Cancel URL',
      field: 'cancelUrl',
      type: 'text',
      placeholder: 'https://example.com/cancel',
      description: 'Redirect URL if payment is cancelled',
      validation: validators.url
    },
    {
      label: 'Webhook Endpoint Secret',
      field: 'webhookSecret',
      type: 'password',
      placeholder: 'whsec_...',
      description: 'Webhook endpoint secret for signature verification'
    },
    {
      label: 'Product Name',
      field: 'productName',
      type: 'text',
      placeholder: 'Premium Subscription',
      description: 'Name of the product'
    },
    {
      label: 'Unit Amount',
      field: 'unitAmount',
      type: 'number',
      placeholder: '2999',
      description: 'Price in cents for products/prices'
    },
    {
      label: 'Recurring Interval',
      field: 'recurringInterval',
      type: 'select',
      defaultValue: 'month',
      options: [
        { value: 'day', label: 'Daily' },
        { value: 'week', label: 'Weekly' },
        { value: 'month', label: 'Monthly' },
        { value: 'year', label: 'Yearly' }
      ]
    },
    {
      label: 'Line Items',
      field: 'lineItems',
      type: 'json',
      placeholder: '[{"price": "price_...", "quantity": 1}]',
      description: 'Line items for checkout session',
      validation: validators.json
    },
    {
      label: 'Expand',
      field: 'expand',
      type: 'json',
      placeholder: '["customer", "payment_intent"]',
      description: 'Fields to expand in response',
      validation: validators.json
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // API key is always required
    if (!config.apiKey) {
      errors.apiKey = 'API key is required';
    }

    // Operation-specific validation
    switch (config.operation) {
      case 'createPaymentIntent':
        if (!config.amount) errors.amount = 'Amount is required';
        if (!config.currency) errors.currency = 'Currency is required';
        break;
      
      case 'confirmPaymentIntent':
      case 'capturePaymentIntent':
        if (!config.paymentIntentId) errors.paymentIntentId = 'Payment intent ID is required';
        break;
      
      case 'createCharge':
        if (!config.amount) errors.amount = 'Amount is required';
        if (!config.currency) errors.currency = 'Currency is required';
        break;
      
      case 'createCustomer':
        if (!config.customerEmail && !config.customerName) {
          errors.customerEmail = 'Email or name is required';
        }
        break;
      
      case 'updateCustomer':
      case 'getCustomer':
        if (!config.customerId) errors.customerId = 'Customer ID is required';
        break;
      
      case 'createSubscription':
        if (!config.customerId) errors.customerId = 'Customer ID is required';
        if (!config.priceId) errors.priceId = 'Price ID is required';
        break;
      
      case 'updateSubscription':
      case 'cancelSubscription':
        if (!config.subscriptionId) errors.subscriptionId = 'Subscription ID is required';
        break;
      
      case 'createRefund':
        if (!config.chargeId && !config.paymentIntentId) {
          errors.chargeId = 'Charge ID or Payment Intent ID is required';
        }
        break;
      
      case 'createProduct':
        if (!config.productName) errors.productName = 'Product name is required';
        break;
      
      case 'createPrice':
        if (!config.unitAmount) errors.unitAmount = 'Unit amount is required';
        if (!config.currency) errors.currency = 'Currency is required';
        break;
      
      case 'createCheckoutSession':
        if (!config.successUrl) errors.successUrl = 'Success URL is required';
        if (!config.cancelUrl) errors.cancelUrl = 'Cancel URL is required';
        if (!config.lineItems) errors.lineItems = 'Line items are required';
        break;
      
      case 'verifyWebhook':
        if (!config.webhookSecret) errors.webhookSecret = 'Webhook secret is required';
        break;
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON fields
    const jsonFields = ['metadata', 'shipping', 'expand', 'lineItems'];

    jsonFields.forEach(field => {
      if (config[field] && typeof config[field] === 'string') {
        try {
          config[field] = JSON.parse(config[field]);
        } catch (e) {
          // Keep as string
        }
      }
    });

    // Ensure amount is integer
    if (config.amount && typeof config.amount === 'string') {
      config.amount = parseInt(config.amount, 10);
    }

    return config;
  },

  examples: [
    {
      label: 'Simple Payment',
      config: {
        apiKey: 'sk_test_YOUR_API_KEY',
        operation: 'createPaymentIntent',
        amount: 2500,
        currency: 'usd',
        description: 'Payment for order #{{$json.orderId}}',
        metadata: JSON.stringify({
          orderId: '{{$json.orderId}}',
          customerId: '{{$json.customerId}}'
        }, null, 2)
      }
    },
    {
      label: 'Create Customer',
      config: {
        apiKey: 'sk_test_YOUR_API_KEY',
        operation: 'createCustomer',
        customerEmail: '{{$json.email}}',
        customerName: '{{$json.firstName}} {{$json.lastName}}',
        metadata: JSON.stringify({
          userId: '{{$json.userId}}',
          source: 'workflow'
        }, null, 2)
      }
    },
    {
      label: 'Monthly Subscription',
      config: {
        apiKey: 'sk_test_YOUR_API_KEY',
        operation: 'createSubscription',
        customerId: '{{$json.stripeCustomerId}}',
        priceId: 'price_monthly_plan',
        trialPeriodDays: 14,
        metadata: JSON.stringify({
          plan: 'premium',
          referral: '{{$json.referralCode}}'
        }, null, 2)
      }
    },
    {
      label: 'Checkout Session',
      config: {
        apiKey: 'sk_test_YOUR_API_KEY',
        operation: 'createCheckoutSession',
        successUrl: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
        cancelUrl: 'https://example.com/cancel',
        lineItems: JSON.stringify([
          {
            price: 'price_product_1',
            quantity: 1
          },
          {
            price: 'price_product_2',
            quantity: 2
          }
        ], null, 2),
        customerEmail: '{{$json.email}}'
      }
    },
    {
      label: 'Process Refund',
      config: {
        apiKey: 'sk_test_YOUR_API_KEY',
        operation: 'createRefund',
        paymentIntentId: '{{$json.paymentIntentId}}',
        amount: 1000,
        metadata: JSON.stringify({
          reason: '{{$json.refundReason}}',
          processedBy: 'workflow'
        }, null, 2)
      }
    }
  ]
};
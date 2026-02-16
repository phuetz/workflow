/**
 * Stripe Integration Node
 * Complete payment processing integration with Stripe API
 */

import { NodeType } from '../../types/workflow';
import { NodeExecutor } from '../../types/nodeExecutor';
import { Node } from '@xyflow/react';
import { WorkflowContext } from '../../types/common';

// Stripe types - imported dynamically at runtime
type Stripe = any;

export interface StripeNodeConfig {
  action: 'create_payment' | 'create_customer' | 'create_subscription' | 'refund' | 'create_invoice' | 'list_payments' | 'webhook';
  apiKey?: string;
  testMode?: boolean;
  // Payment parameters
  amount?: number;
  currency?: string;
  description?: string;
  customerId?: string;
  paymentMethodId?: string;
  // Customer parameters
  email?: string;
  name?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  // Subscription parameters
  priceId?: string;
  trialDays?: number;
  // Webhook parameters
  webhookSecret?: string;
  eventTypes?: string[];
}

export const stripeNodeType: NodeType = {
  type: 'stripe',
  label: 'Stripe',
  icon: 'CreditCard',
  color: 'bg-purple-600',
  category: 'finance',
  inputs: 1,
  outputs: 2,
  description: 'Process payments, manage customers and subscriptions with Stripe',
  errorHandle: true
};

// Default configuration for the node
export const stripeNodeDefaultConfig: StripeNodeConfig = {
  action: 'create_payment',
  testMode: true,
  currency: 'usd'
};

export class StripeNodeExecutor implements NodeExecutor {
  [key: string]: unknown;
  private stripe: Stripe | null = null;

  private async initStripe(config: StripeNodeConfig): Promise<Stripe> {
    const apiKey = config.apiKey || process.env.STRIPE_API_KEY;
    if (!apiKey) {
      throw new Error('Stripe API key is required');
    }
    // Dynamic require to avoid compile-time dependency
    try {
       
      const StripeClass = require('stripe');
      return new StripeClass(apiKey, {
        apiVersion: '2023-10-16' as any
      });
    } catch (error) {
      throw new Error(`Failed to initialize Stripe. Please install: npm install stripe`);
    }
  }

  validate(node: Node): string[] {
    const errors: string[] = [];
    const config = node.data?.config as StripeNodeConfig;

    if (!config) {
      errors.push('Node configuration is required');
      return errors;
    }

    if (!config.apiKey && !process.env.STRIPE_API_KEY) {
      errors.push('Stripe API key is required');
    }

    if (config.action === 'create_payment' && !config.amount) {
      errors.push('Amount is required for payment creation');
    }

    if (config.action === 'create_customer' && !config.email) {
      errors.push('Email is required for customer creation');
    }

    if (config.action === 'create_subscription' && (!config.customerId || !config.priceId)) {
      errors.push('Customer ID and Price ID are required for subscription creation');
    }

    return errors;
  }

  async execute(node: Node, context: WorkflowContext): Promise<unknown> {
    const config = node.data?.config as StripeNodeConfig;
    const inputData = context.input;
    this.stripe = await this.initStripe(config);

    try {
      switch (config.action) {
        case 'create_payment':
          return await this.createPayment(config, inputData);
        
        case 'create_customer':
          return await this.createCustomer(config, inputData);
        
        case 'create_subscription':
          return await this.createSubscription(config, inputData);
        
        case 'refund':
          return await this.processRefund(config, inputData);
        
        case 'create_invoice':
          return await this.createInvoice(config, inputData);
        
        case 'list_payments':
          return await this.listPayments(config, inputData);
        
        case 'webhook':
          return await this.handleWebhook(config, inputData);
        
        default:
          throw new Error(`Unknown Stripe action: ${config.action}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as any).code || 'STRIPE_ERROR'
      };
    }
  }

  private async createPayment(config: StripeNodeConfig, inputData: any): Promise<any> {
    const paymentIntent = await this.stripe!.paymentIntents.create({
      amount: config.amount || inputData.amount || 0,
      currency: config.currency || inputData.currency || 'usd',
      description: config.description || inputData.description,
      customer: config.customerId || inputData.customerId,
      payment_method: config.paymentMethodId || inputData.paymentMethodId,
      confirm: inputData.confirm || false,
      metadata: inputData.metadata || {}
    });

    return {
      success: true,
      paymentIntent,
      paymentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      clientSecret: paymentIntent.client_secret
    };
  }

  private async createCustomer(config: StripeNodeConfig, inputData: any): Promise<any> {
    const customer = await this.stripe!.customers.create({
      email: config.email || inputData.email,
      name: config.name || inputData.name,
      phone: config.phone || inputData.phone,
      address: config.address || inputData.address,
      metadata: inputData.metadata || {}
    });

    return {
      success: true,
      customer,
      customerId: customer.id,
      email: customer.email,
      name: customer.name
    };
  }

  private async createSubscription(config: StripeNodeConfig, inputData: any): Promise<any> {
    const subscription = await this.stripe!.subscriptions.create({
      customer: config.customerId || inputData.customerId,
      items: [
        {
          price: config.priceId || inputData.priceId
        }
      ],
      trial_period_days: config.trialDays || inputData.trialDays,
      metadata: inputData.metadata || {}
    });

    return {
      success: true,
      subscription,
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end
    };
  }

  private async processRefund(config: StripeNodeConfig, inputData: any): Promise<any> {
    const refund = await this.stripe!.refunds.create({
      payment_intent: inputData.paymentIntentId,
      amount: inputData.amount, // Optional: partial refund
      reason: inputData.reason || 'requested_by_customer'
    });

    return {
      success: true,
      refund,
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount
    };
  }

  private async createInvoice(config: StripeNodeConfig, inputData: any): Promise<any> {
    const invoice = await this.stripe!.invoices.create({
      customer: config.customerId || inputData.customerId,
      auto_advance: inputData.autoAdvance !== false,
      description: inputData.description,
      metadata: inputData.metadata || {}
    });

    // Add line items if provided
    if (inputData.lineItems && Array.isArray(inputData.lineItems)) {
      for (const item of inputData.lineItems) {
        await this.stripe!.invoiceItems.create({
          customer: invoice.customer as string,
          invoice: invoice.id,
          amount: item.amount,
          currency: item.currency || 'usd',
          description: item.description
        });
      }
    }

    // Finalize invoice if requested
    if (inputData.finalize) {
      await this.stripe!.invoices.finalizeInvoice(invoice.id);
    }

    return {
      success: true,
      invoice,
      invoiceId: invoice.id,
      status: invoice.status,
      total: invoice.total,
      url: invoice.hosted_invoice_url
    };
  }

  private async listPayments(config: StripeNodeConfig, inputData: any): Promise<any> {
    const payments = await this.stripe!.paymentIntents.list({
      limit: inputData.limit || 10,
      starting_after: inputData.startingAfter,
      ending_before: inputData.endingBefore,
      customer: inputData.customerId
    });

    return {
      success: true,
      payments: payments.data,
      hasMore: payments.has_more,
      totalCount: payments.data.length
    };
  }

  private async handleWebhook(config: StripeNodeConfig, inputData: any): Promise<any> {
    const webhookSecret = config.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('Webhook secret is required for webhook handling');
    }

    try {
      const event = this.stripe!.webhooks.constructEvent(
        inputData.rawBody,
        inputData.signature,
        webhookSecret
      );

      // Process different event types
      const result: any = { success: true, event: event.type };

      switch (event.type) {
        case 'payment_intent.succeeded':
          result.payment = event.data.object;
          result.amountReceived = (event.data.object as any).amount_received;
          break;
        
        case 'payment_intent.payment_failed':
          result.payment = event.data.object;
          result.failureMessage = (event.data.object as any).last_payment_error?.message;
          break;
        
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          result.subscription = event.data.object;
          break;
        
        case 'invoice.paid':
        case 'invoice.payment_failed':
          result.invoice = event.data.object;
          break;
        
        default:
          result.data = event.data.object;
      }

      return result;
    } catch (error) {
      throw new Error(`Webhook signature verification failed: ${error}`);
    }
  }
}

// Configuration UI schema for the node
export const stripeNodeConfigSchema = {
  action: {
    type: 'select',
    label: 'Action',
    options: [
      { value: 'create_payment', label: 'Create Payment' },
      { value: 'create_customer', label: 'Create Customer' },
      { value: 'create_subscription', label: 'Create Subscription' },
      { value: 'refund', label: 'Process Refund' },
      { value: 'create_invoice', label: 'Create Invoice' },
      { value: 'list_payments', label: 'List Payments' },
      { value: 'webhook', label: 'Handle Webhook' }
    ],
    default: 'create_payment'
  },
  apiKey: {
    type: 'credential',
    label: 'API Key',
    placeholder: 'sk_live_...',
    required: true
  },
  testMode: {
    type: 'boolean',
    label: 'Test Mode',
    default: true
  },
  amount: {
    type: 'number',
    label: 'Amount (in cents)',
    showWhen: { action: ['create_payment', 'refund'] }
  },
  currency: {
    type: 'select',
    label: 'Currency',
    options: [
      { value: 'usd', label: 'USD' },
      { value: 'eur', label: 'EUR' },
      { value: 'gbp', label: 'GBP' },
      { value: 'jpy', label: 'JPY' }
    ],
    default: 'usd',
    showWhen: { action: ['create_payment', 'create_invoice'] }
  },
  customerId: {
    type: 'string',
    label: 'Customer ID',
    showWhen: { action: ['create_payment', 'create_subscription', 'create_invoice'] }
  },
  email: {
    type: 'string',
    label: 'Email',
    showWhen: { action: 'create_customer' }
  },
  priceId: {
    type: 'string',
    label: 'Price ID',
    showWhen: { action: 'create_subscription' }
  },
  webhookSecret: {
    type: 'credential',
    label: 'Webhook Secret',
    showWhen: { action: 'webhook' }
  }
};
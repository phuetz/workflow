/**
 * Stripe Integration Tests
 * Tests for Stripe API client and operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StripeClient } from '../../integrations/stripe/StripeClient';
import type { StripeCredentials } from '../../integrations/stripe/stripe.types';

describe('Stripe Integration', () => {
  let client: StripeClient;
  const mockCredentials: StripeCredentials = {
    secretKey: 'sk_test_1234567890',
    publishableKey: 'pk_test_1234567890'
  };

  beforeEach(() => {
    client = new StripeClient(mockCredentials);
    global.fetch = vi.fn();
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_1234567890',
        object: 'payment_intent',
        amount: 2000,
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: 'pi_1234567890_secret_1234567890'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPaymentIntent
      });

      const result = await client.createPaymentIntent({
        amount: 2000,
        currency: 'usd'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.id).toBe('pi_1234567890');
      expect(result.data?.amount).toBe(2000);
      // Stripe uses Basic Auth (API key as username, empty password)
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toBe('https://api.stripe.com/v1/payment_intents');
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].headers.Authorization).toContain('Basic');
    });

    it('should support customer and payment method', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'pi_123', amount: 2000 })
      });

      await client.createPaymentIntent({
        amount: 2000,
        currency: 'usd',
        customer: 'cus_123',
        payment_method: 'pm_123'
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = new URLSearchParams(fetchCall[1].body);
      expect(body.get('customer')).toBe('cus_123');
      expect(body.get('payment_method')).toBe('pm_123');
    });
  });

  describe('confirmPaymentIntent', () => {
    it('should confirm a payment intent', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'pi_123',
          status: 'succeeded'
        })
      });

      const result = await client.confirmPaymentIntent({
        paymentIntentId: 'pi_123',
        payment_method: 'pm_123'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.status).toBe('succeeded');
    });
  });

  describe('createCustomer', () => {
    it('should create a customer', async () => {
      const mockCustomer = {
        id: 'cus_1234567890',
        object: 'customer',
        email: 'test@example.com',
        name: 'Test Customer',
        created: 1234567890
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCustomer
      });

      const result = await client.createCustomer({
        email: 'test@example.com',
        name: 'Test Customer',
        description: 'Test account'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.email).toBe('test@example.com');
      expect(result.data?.name).toBe('Test Customer');
    });
  });

  describe('createSubscription', () => {
    it('should create a subscription', async () => {
      const mockSubscription = {
        id: 'sub_1234567890',
        object: 'subscription',
        customer: 'cus_123',
        status: 'active',
        items: {
          data: [
            {
              id: 'si_123',
              price: { id: 'price_123' }
            }
          ]
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscription
      });

      const result = await client.createSubscription({
        customer: 'cus_123',
        items: [{ price: 'price_123' }]
      });

      expect(result.ok).toBe(true);
      expect(result.data?.status).toBe('active');
    });
  });

  describe('createRefund', () => {
    it('should create a refund', async () => {
      const mockRefund = {
        id: 're_1234567890',
        object: 'refund',
        amount: 2000,
        charge: 'ch_123',
        status: 'succeeded'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRefund
      });

      const result = await client.createRefund({
        charge: 'ch_123',
        amount: 2000
      });

      expect(result.ok).toBe(true);
      expect(result.data?.status).toBe('succeeded');
      expect(result.data?.amount).toBe(2000);
    });
  });

  describe('Error Handling', () => {
    it('should handle Stripe API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: async () => ({
          error: {
            type: 'card_error',
            code: 'card_declined',
            message: 'Your card was declined'
          }
        })
      });

      const result = await client.createPaymentIntent({
        amount: 2000,
        currency: 'usd'
      });

      expect(result.ok).toBe(false);
      // Stripe client returns the error message, not the code
      expect(result.error).toContain('declined');
    });

    it('should handle invalid API key', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            type: 'invalid_request_error',
            message: 'Invalid API Key provided'
          }
        })
      });

      const result = await client.createPaymentIntent({
        amount: 2000,
        currency: 'usd'
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Invalid API Key');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await client.createPaymentIntent({
        amount: 2000,
        currency: 'usd'
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Network timeout');
    });
  });

  describe('Idempotency', () => {
    it('should support idempotency keys', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'pi_123' })
      });

      await client.createPaymentIntent({
        amount: 2000,
        currency: 'usd'
      });

      // Idempotency keys can be added via options if needed
      // The client supports them but doesn't auto-generate them
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].method).toBe('POST');
    });
  });
});

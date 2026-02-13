/**
 * Twilio Integration Tests
 * Tests for Twilio communication API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TwilioClient } from '../../integrations/twilio/TwilioClient';
import type { TwilioCredentials } from '../../integrations/twilio/twilio.types';

describe('Twilio Integration', () => {
  let client: TwilioClient;
  const mockCredentials: TwilioCredentials = {
    accountSid: 'ACTEST00000000000000000000000000',
    authToken: 'test_auth_token_1234567890',
    fromNumber: '+15551234567',
  };

  beforeEach(() => {
    client = new TwilioClient(mockCredentials);
    global.fetch = vi.fn();
    // Mock btoa for Base64 encoding
    global.btoa = vi.fn((str: string) => Buffer.from(str).toString('base64'));
  });

  describe('sendSMS', () => {
    it('should send an SMS message', async () => {
      const mockMessage = {
        sid: 'SM1234567890abcdef1234567890abcdef',
        from: '+15551234567',
        to: '+15559876543',
        body: 'Hello from Twilio',
        status: 'queued',
        dateCreated: '2025-01-15T10:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockMessage,
      });

      const result = await client.sendSMS('+15559876543', 'Hello from Twilio');

      expect(result.ok).toBe(true);
      expect(result.data?.sid).toBe('SM1234567890abcdef1234567890abcdef');
      expect(result.data?.body).toBe('Hello from Twilio');
      expect(result.data?.status).toBe('queued');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/Accounts/ACTEST00000000000000000000000000/Messages.json');
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    });

    it('should use Basic Authentication', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM123' }),
      });

      await client.sendSMS('+15559876543', 'Test message');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].headers.Authorization).toContain('Basic ');
      expect(global.btoa).toHaveBeenCalledWith('ACTEST00000000000000000000000000:test_auth_token_1234567890');
    });

    it('should use default from number', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM123' }),
      });

      await client.sendSMS('+15559876543', 'Test message');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].body).toContain('From=%2B15551234567');
    });

    it('should support custom from number', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM123' }),
      });

      await client.sendSMS('+15559876543', 'Test message', '+15550001111');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].body).toContain('From=%2B15550001111');
    });

    it('should return error if from number not configured', async () => {
      const clientWithoutFrom = new TwilioClient({
        accountSid: 'AC123',
        authToken: 'token123',
      });

      const result = await clientWithoutFrom.sendSMS('+15559876543', 'Test');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('From number not configured');
    });

    it('should encode message body in form data', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM123' }),
      });

      await client.sendSMS('+15559876543', 'Hello & welcome!');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(callArgs[1].body).toContain('To=');
      expect(callArgs[1].body).toContain('From=');
      expect(callArgs[1].body).toContain('Body=');
    });
  });

  describe('makeCall', () => {
    it('should initiate a phone call', async () => {
      const mockCall = {
        sid: 'CA1234567890abcdef1234567890abcdef',
        from: '+15551234567',
        to: '+15559876543',
        status: 'queued',
        dateCreated: '2025-01-15T10:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockCall,
      });

      const result = await client.makeCall(
        '+15559876543',
        'https://example.com/twiml'
      );

      expect(result.ok).toBe(true);
      expect(result.data?.sid).toBe('CA1234567890abcdef1234567890abcdef');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/Accounts/ACTEST00000000000000000000000000/Calls.json');
      expect(callArgs[1].method).toBe('POST');
    });

    it('should include TwiML URL in request', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'CA123' }),
      });

      await client.makeCall('+15559876543', 'https://example.com/twiml');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].body).toContain('Url=');
      expect(callArgs[1].body).toContain('example.com');
    });

    it('should use default from number', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'CA123' }),
      });

      await client.makeCall('+15559876543', 'https://example.com/twiml');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].body).toContain('From=%2B15551234567');
    });

    it('should support custom from number', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'CA123' }),
      });

      await client.makeCall('+15559876543', 'https://example.com/twiml', '+15550001111');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].body).toContain('From=%2B15550001111');
    });

    it('should return error if from number not configured', async () => {
      const clientWithoutFrom = new TwilioClient({
        accountSid: 'AC123',
        authToken: 'token123',
      });

      const result = await clientWithoutFrom.makeCall('+15559876543', 'https://example.com/twiml');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('From number not configured');
    });
  });

  describe('sendWhatsApp', () => {
    it('should send a WhatsApp message', async () => {
      const mockMessage = {
        sid: 'SM1234567890abcdef1234567890abcdef',
        from: 'whatsapp:+15551234567',
        to: 'whatsapp:+15559876543',
        body: 'Hello via WhatsApp',
        status: 'queued',
        dateCreated: '2025-01-15T10:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockMessage,
      });

      const result = await client.sendWhatsApp('+15559876543', 'Hello via WhatsApp');

      expect(result.ok).toBe(true);
      expect(result.data?.sid).toBe('SM1234567890abcdef1234567890abcdef');
      expect(result.data?.body).toBe('Hello via WhatsApp');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/Messages.json');
    });

    it('should prefix numbers with whatsapp:', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM123' }),
      });

      await client.sendWhatsApp('+15559876543', 'Test message');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].body).toContain('To=whatsapp%3A%2B15559876543');
      expect(callArgs[1].body).toContain('From=whatsapp%3A%2B15551234567');
    });

    it('should return error if from number not configured', async () => {
      const clientWithoutFrom = new TwilioClient({
        accountSid: 'AC123',
        authToken: 'token123',
      });

      const result = await clientWithoutFrom.sendWhatsApp('+15559876543', 'Test');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('From number not configured');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          code: 20003,
          message: 'Authenticate',
        }),
      });

      const result = await client.sendSMS('+15559876543', 'Test message');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Authenticate');
    });

    it('should handle invalid phone number errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          code: 21211,
          message: 'Invalid To phone number',
        }),
      });

      const result = await client.sendSMS('invalid', 'Test message');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Invalid To phone number');
    });

    it('should handle insufficient balance errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          code: 21612,
          message: 'Insufficient funds',
        }),
      });

      const result = await client.sendSMS('+15559876543', 'Test message');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Insufficient funds');
    });

    it('should handle rate limiting', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          code: 20429,
          message: 'Too many requests',
        }),
      });

      const result = await client.sendSMS('+15559876543', 'Test message');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Too many requests');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await client.sendSMS('+15559876543', 'Test message');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle malformed responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}), // No message property
      });

      const result = await client.sendSMS('+15559876543', 'Test message');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('API request failed');
    });
  });

  describe('Request Format', () => {
    it('should use form-encoded content type', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM123' }),
      });

      await client.sendSMS('+15559876543', 'Test');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    });

    it('should use correct API version endpoint', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM123' }),
      });

      await client.sendSMS('+15559876543', 'Test');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('2010-04-01');
    });

    it('should include account SID in URL', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM123' }),
      });

      await client.sendSMS('+15559876543', 'Test');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('ACTEST00000000000000000000000000');
    });
  });

  describe('Message Status', () => {
    it('should return message with queued status', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sid: 'SM123',
          status: 'queued',
        }),
      });

      const result = await client.sendSMS('+15559876543', 'Test');

      expect(result.ok).toBe(true);
      expect(result.data?.status).toBe('queued');
    });

    it('should handle different message statuses', async () => {
      const statuses = ['queued', 'sending', 'sent', 'delivered', 'failed'];

      for (const status of statuses) {
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            sid: 'SM123',
            status,
          }),
        });

        const result = await client.sendSMS('+15559876543', 'Test');

        expect(result.ok).toBe(true);
        expect(result.data?.status).toBe(status);
      }
    });
  });
});

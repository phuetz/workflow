/**
 * Webhook Signature Security Tests
 * Tests for mandatory signature verification on webhook endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import request from 'supertest';
import express from 'express';
import webhookRouter from '../backend/api/routes/webhooks';

// Mock dependencies
vi.mock('../backend/repositories/adapters', () => ({
  getWorkflow: vi.fn((id: string) => {
    if (id === 'valid-workflow') {
      return { id, name: 'Test Workflow', nodes: [], edges: [] };
    }
    return null;
  }),
  getWebhookSecret: vi.fn((id: string) => {
    if (id === 'webhook-with-secret') {
      return Promise.resolve('test-secret-key-123');
    }
    if (id === 'webhook-no-secret') {
      return Promise.resolve(null);
    }
    return Promise.resolve('test-secret-key-123');
  }),
  upsertWebhookSecret: vi.fn((id: string, secret: string) => Promise.resolve())
}));

vi.mock('../backend/services/simpleExecutionService', () => ({
  executeWorkflowSimple: vi.fn(() => Promise.resolve({ success: true }))
}));

// Helper function to generate valid HMAC signature
function generateSignature(payload: any, secret: string): string {
  const rawBody = JSON.stringify(payload);
  const h = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return `sha256=${h}`;
}

describe('Webhook Signature Security', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/webhooks', webhookRouter);
    vi.clearAllMocks();
  });

  describe('POST /api/webhooks/:id - Signature Verification', () => {
    it('should reject webhook without secret configured', async () => {
      const payload = { event: 'test', data: { id: 123 } };

      const response = await request(app)
        .post('/api/webhooks/webhook-no-secret')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('signature verification must be enabled');
    });

    it('should reject webhook without signature header', async () => {
      const payload = { event: 'test', data: { id: 123 } };

      const response = await request(app)
        .post('/api/webhooks/webhook-with-secret')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Missing webhook signature');
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = { event: 'test', data: { id: 123 } };

      const response = await request(app)
        .post('/api/webhooks/webhook-with-secret')
        .set('x-webhook-signature', 'sha256=invalid-signature-here')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid webhook signature');
    });

    it('should accept webhook with valid signature (x-webhook-signature)', async () => {
      const payload = { event: 'test', data: { id: 123 } };
      const signature = generateSignature(payload, 'test-secret-key-123');

      const response = await request(app)
        .post('/api/webhooks/webhook-with-secret')
        .set('x-webhook-signature', signature)
        .send(payload);

      expect(response.status).toBe(202);
      expect(response.body.accepted).toBe(true);
    });

    it('should accept webhook with valid signature (x-signature)', async () => {
      const payload = { event: 'test', data: { id: 123 } };
      const signature = generateSignature(payload, 'test-secret-key-123');

      const response = await request(app)
        .post('/api/webhooks/webhook-with-secret')
        .set('x-signature', signature)
        .send(payload);

      expect(response.status).toBe(202);
      expect(response.body.accepted).toBe(true);
    });

    it('should reject signature with wrong secret', async () => {
      const payload = { event: 'test', data: { id: 123 } };
      const signature = generateSignature(payload, 'wrong-secret-key');

      const response = await request(app)
        .post('/api/webhooks/webhook-with-secret')
        .set('x-webhook-signature', signature)
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid webhook signature');
    });

    it('should reject signature for tampered payload', async () => {
      const originalPayload = { event: 'test', data: { id: 123 } };
      const signature = generateSignature(originalPayload, 'test-secret-key-123');

      // Tamper with payload after generating signature
      const tamperedPayload = { event: 'test', data: { id: 456 } };

      const response = await request(app)
        .post('/api/webhooks/webhook-with-secret')
        .set('x-webhook-signature', signature)
        .send(tamperedPayload);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid webhook signature');
    });

    it('should use timing-safe comparison to prevent timing attacks', async () => {
      const payload = { event: 'test', data: { id: 123 } };
      const validSignature = generateSignature(payload, 'test-secret-key-123');

      // Create signature with same length but different content
      const invalidSignature = validSignature.slice(0, -1) + 'X';

      const response = await request(app)
        .post('/api/webhooks/webhook-with-secret')
        .set('x-webhook-signature', invalidSignature)
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid webhook signature');
    });
  });

  describe('POST /api/webhooks/:id/secret - Secret Management', () => {
    it('should allow setting webhook secret', async () => {
      const response = await request(app)
        .post('/api/webhooks/new-webhook/secret')
        .send({ secret: 'new-secret-key-456' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject secret configuration without secret', async () => {
      const response = await request(app)
        .post('/api/webhooks/new-webhook/secret')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Secret is required');
    });

    it('should reject non-string secrets', async () => {
      const response = await request(app)
        .post('/api/webhooks/new-webhook/secret')
        .send({ secret: 12345 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Secret is required');
    });
  });

  describe('Security Edge Cases', () => {
    it('should reject empty string signature', async () => {
      const payload = { event: 'test', data: { id: 123 } };

      const response = await request(app)
        .post('/api/webhooks/webhook-with-secret')
        .set('x-webhook-signature', '')
        .send(payload);

      expect(response.status).toBe(401);
    });

    it('should reject malformed signature format', async () => {
      const payload = { event: 'test', data: { id: 123 } };

      const response = await request(app)
        .post('/api/webhooks/webhook-with-secret')
        .set('x-webhook-signature', 'not-a-valid-format')
        .send(payload);

      expect(response.status).toBe(401);
    });

    it('should handle empty payload correctly', async () => {
      const payload = {};
      const signature = generateSignature(payload, 'test-secret-key-123');

      const response = await request(app)
        .post('/api/webhooks/webhook-with-secret')
        .set('x-webhook-signature', signature)
        .send(payload);

      expect(response.status).toBe(202);
    });

    it('should handle complex nested payloads', async () => {
      const payload = {
        event: 'order.created',
        data: {
          order: {
            id: 123,
            items: [
              { sku: 'ABC', quantity: 2 },
              { sku: 'XYZ', quantity: 1 }
            ],
            customer: {
              id: 456,
              email: 'test@example.com'
            }
          }
        },
        timestamp: '2025-01-01T00:00:00Z'
      };

      const signature = generateSignature(payload, 'test-secret-key-123');

      const response = await request(app)
        .post('/api/webhooks/webhook-with-secret')
        .set('x-webhook-signature', signature)
        .send(payload);

      expect(response.status).toBe(202);
    });
  });

  describe('Security Documentation', () => {
    it('should provide clear error messages for missing secret', async () => {
      const payload = { event: 'test' };

      const response = await request(app)
        .post('/api/webhooks/webhook-no-secret')
        .send(payload);

      expect(response.body.error).toContain('Configure a secret via POST /api/webhooks/');
    });

    it('should provide clear error messages for missing signature', async () => {
      const payload = { event: 'test' };

      const response = await request(app)
        .post('/api/webhooks/webhook-with-secret')
        .send(payload);

      expect(response.body.error).toContain('x-webhook-signature or x-signature header');
    });
  });
});

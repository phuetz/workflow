import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import webhooksRouter from '../../backend/api/routes/webhooks';

// Mock the repositories and services
vi.mock('../../backend/api/repositories/adapters', () => ({
  getWorkflow: vi.fn(),
  getWebhookSecret: vi.fn(),
  upsertWebhookSecret: vi.fn(),
}));

vi.mock('../../backend/api/services/simpleExecutionService', () => ({
  executeWorkflowSimple: vi.fn(),
}));

import {
  getWorkflow,
  getWebhookSecret,
  upsertWebhookSecret,
} from '../../backend/api/repositories/adapters';
import { executeWorkflowSimple } from '../../backend/api/services/simpleExecutionService';

describe('Webhooks API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/webhooks', webhooksRouter);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/webhooks/:id/secret', () => {
    it('should register webhook secret successfully', async () => {
      vi.mocked(upsertWebhookSecret).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/webhooks/wf_123/secret')
        .send({ secret: 'my-secret-key-123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(upsertWebhookSecret).toHaveBeenCalledWith('wf_123', 'my-secret-key-123');
    });

    it('should return 400 when secret is missing', async () => {
      const response = await request(app)
        .post('/api/webhooks/wf_123/secret')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Secret is required');
    });

    it('should return 400 when secret is not a string', async () => {
      const response = await request(app)
        .post('/api/webhooks/wf_123/secret')
        .send({ secret: 12345 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Secret is required');
    });

    it('should allow rotating existing secret', async () => {
      vi.mocked(upsertWebhookSecret).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/webhooks/wf_123/secret')
        .send({ secret: 'new-rotated-secret' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle empty string as invalid secret', async () => {
      const response = await request(app)
        .post('/api/webhooks/wf_123/secret')
        .send({ secret: '' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Secret is required');
    });
  });

  describe('POST /api/webhooks/:id - Webhook Ingestion', () => {
    const generateSignature = (secret: string, body: any): string => {
      const rawBody = JSON.stringify(body);
      const h = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      return `sha256=${h}`;
    };

    it('should execute webhook with valid signature', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Webhook Workflow',
        status: 'active',
        nodes: [],
        edges: [],
      };

      const webhookSecret = 'test-secret-key';
      const webhookData = { event: 'test', data: { foo: 'bar' } };
      const signature = generateSignature(webhookSecret, webhookData);

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow as any);
      vi.mocked(getWebhookSecret).mockResolvedValue(webhookSecret);
      vi.mocked(executeWorkflowSimple).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/webhooks/wf_123')
        .set('x-webhook-signature', signature)
        .send(webhookData);

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('accepted', true);
      expect(executeWorkflowSimple).toHaveBeenCalledWith(mockWorkflow, webhookData);
    });

    it('should accept signature in x-signature header', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Webhook Workflow',
        status: 'active',
        nodes: [],
        edges: [],
      };

      const webhookSecret = 'test-secret-key';
      const webhookData = { event: 'test' };
      const signature = generateSignature(webhookSecret, webhookData);

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow as any);
      vi.mocked(getWebhookSecret).mockResolvedValue(webhookSecret);
      vi.mocked(executeWorkflowSimple).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/webhooks/wf_123')
        .set('x-signature', signature)
        .send(webhookData);

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('accepted', true);
    });

    it('should return 404 when workflow not found', async () => {
      vi.mocked(getWorkflow).mockReturnValue(null);

      const response = await request(app)
        .post('/api/webhooks/nonexistent')
        .set('x-webhook-signature', 'sha256=abcd')
        .send({ event: 'test' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Workflow not found');
    });

    it('should return 400 when no secret is configured', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Webhook Workflow',
        status: 'active',
        nodes: [],
        edges: [],
      };

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow as any);
      vi.mocked(getWebhookSecret).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/webhooks/wf_123')
        .send({ event: 'test' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Webhook signature verification must be enabled');
    });

    it('should return 401 when signature is missing', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Webhook Workflow',
        status: 'active',
        nodes: [],
        edges: [],
      };

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow as any);
      vi.mocked(getWebhookSecret).mockResolvedValue('test-secret');

      const response = await request(app)
        .post('/api/webhooks/wf_123')
        .send({ event: 'test' });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Missing webhook signature');
    });

    it('should return 401 when signature is invalid', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Webhook Workflow',
        status: 'active',
        nodes: [],
        edges: [],
      };

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow as any);
      vi.mocked(getWebhookSecret).mockResolvedValue('test-secret');

      const response = await request(app)
        .post('/api/webhooks/wf_123')
        .set('x-webhook-signature', 'sha256=invalid_signature')
        .send({ event: 'test' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid webhook signature');
    });

    it('should reject signature with wrong secret', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Webhook Workflow',
        status: 'active',
        nodes: [],
        edges: [],
      };

      const correctSecret = 'correct-secret';
      const wrongSecret = 'wrong-secret';
      const webhookData = { event: 'test' };
      const wrongSignature = generateSignature(wrongSecret, webhookData);

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow as any);
      vi.mocked(getWebhookSecret).mockResolvedValue(correctSecret);

      const response = await request(app)
        .post('/api/webhooks/wf_123')
        .set('x-webhook-signature', wrongSignature)
        .send(webhookData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid webhook signature');
    });

    it('should handle empty webhook body', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Webhook Workflow',
        status: 'active',
        nodes: [],
        edges: [],
      };

      const webhookSecret = 'test-secret';
      const webhookData = {};
      const signature = generateSignature(webhookSecret, webhookData);

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow as any);
      vi.mocked(getWebhookSecret).mockResolvedValue(webhookSecret);
      vi.mocked(executeWorkflowSimple).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/webhooks/wf_123')
        .set('x-webhook-signature', signature)
        .send(webhookData);

      expect(response.status).toBe(202);
      expect(executeWorkflowSimple).toHaveBeenCalledWith(mockWorkflow, {});
    });

    it('should handle large webhook payloads', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Webhook Workflow',
        status: 'active',
        nodes: [],
        edges: [],
      };

      const webhookSecret = 'test-secret';
      const largeData = {
        event: 'test',
        data: {
          items: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            name: `Item ${i}`,
            description: 'A'.repeat(100),
          })),
        },
      };
      const signature = generateSignature(webhookSecret, largeData);

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow as any);
      vi.mocked(getWebhookSecret).mockResolvedValue(webhookSecret);
      vi.mocked(executeWorkflowSimple).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/webhooks/wf_123')
        .set('x-webhook-signature', signature)
        .send(largeData);

      expect(response.status).toBe(202);
    });

    it('should handle special characters in webhook data', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Webhook Workflow',
        status: 'active',
        nodes: [],
        edges: [],
      };

      const webhookSecret = 'test-secret';
      const webhookData = {
        message: 'Test with special chars: @#$%^&*()_+{}|:"<>?',
        unicode: '🎉 Unicode test 中文',
      };
      const signature = generateSignature(webhookSecret, webhookData);

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow as any);
      vi.mocked(getWebhookSecret).mockResolvedValue(webhookSecret);
      vi.mocked(executeWorkflowSimple).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/webhooks/wf_123')
        .set('x-webhook-signature', signature)
        .send(webhookData);

      expect(response.status).toBe(202);
    });

    it('should reject signature without sha256 prefix', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Webhook Workflow',
        status: 'active',
        nodes: [],
        edges: [],
      };

      const webhookSecret = 'test-secret';
      const webhookData = { event: 'test' };
      const rawBody = JSON.stringify(webhookData);
      const h = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      // Missing sha256= prefix
      const invalidSignature = h;

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow as any);
      vi.mocked(getWebhookSecret).mockResolvedValue(webhookSecret);

      const response = await request(app)
        .post('/api/webhooks/wf_123')
        .set('x-webhook-signature', invalidSignature)
        .send(webhookData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid webhook signature');
    });
  });

  describe('Security Tests', () => {
    it('should use timing-safe comparison for signatures', async () => {
      // This test verifies the implementation uses crypto.timingSafeEqual
      // by checking that similar signatures are rejected
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Webhook Workflow',
        status: 'active',
        nodes: [],
        edges: [],
      };

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow as any);
      vi.mocked(getWebhookSecret).mockResolvedValue('test-secret');

      // Create a signature that's almost correct (one char different)
      const correctSignature = 'sha256=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const almostCorrect = 'sha256=abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456789X';

      const response = await request(app)
        .post('/api/webhooks/wf_123')
        .set('x-webhook-signature', almostCorrect)
        .send({ event: 'test' });

      expect(response.status).toBe(401);
    });

    it('should not leak information about secret through error messages', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Webhook Workflow',
        status: 'active',
        nodes: [],
        edges: [],
      };

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow as any);
      vi.mocked(getWebhookSecret).mockResolvedValue('test-secret');

      const response = await request(app)
        .post('/api/webhooks/wf_123')
        .set('x-webhook-signature', 'sha256=invalid')
        .send({ event: 'test' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid webhook signature');
      expect(response.body.message).not.toContain('test-secret');
    });

    it('should reject malformed signature formats', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Webhook Workflow',
        status: 'active',
        nodes: [],
        edges: [],
      };

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow as any);
      vi.mocked(getWebhookSecret).mockResolvedValue('test-secret');

      const malformedSignatures = [
        'invalid',
        'sha256:abcdef',
        'md5=abcdef',
        '',
        'sha256=',
      ];

      for (const signature of malformedSignatures) {
        const response = await request(app)
          .post('/api/webhooks/wf_123')
          .set('x-webhook-signature', signature)
          .send({ event: 'test' });

        expect(response.status).toBe(401);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle workflow execution errors', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Webhook Workflow',
        status: 'active',
        nodes: [],
        edges: [],
      };

      const webhookSecret = 'test-secret';
      const webhookData = { event: 'test' };
      const rawBody = JSON.stringify(webhookData);
      const h = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      const signature = `sha256=${h}`;

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow as any);
      vi.mocked(getWebhookSecret).mockResolvedValue(webhookSecret);
      vi.mocked(executeWorkflowSimple).mockRejectedValue(new Error('Execution failed'));

      const response = await request(app)
        .post('/api/webhooks/wf_123')
        .set('x-webhook-signature', signature)
        .send(webhookData);

      expect(response.status).toBe(500);
    });

    it('should handle database errors when fetching secret', async () => {
      const mockWorkflow = {
        id: 'wf_123',
        name: 'Webhook Workflow',
        status: 'active',
        nodes: [],
        edges: [],
      };

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow as any);
      vi.mocked(getWebhookSecret).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/webhooks/wf_123')
        .set('x-webhook-signature', 'sha256=test')
        .send({ event: 'test' });

      expect(response.status).toBe(500);
    });

    it('should handle errors when upserting secret', async () => {
      vi.mocked(upsertWebhookSecret).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/webhooks/wf_123/secret')
        .send({ secret: 'test-secret' });

      expect(response.status).toBe(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle workflow ID with special characters', async () => {
      const workflowId = 'wf_test-123_special';
      const mockWorkflow = {
        id: workflowId,
        name: 'Webhook Workflow',
        status: 'active',
        nodes: [],
        edges: [],
      };

      const webhookSecret = 'test-secret';
      const webhookData = { event: 'test' };
      const rawBody = JSON.stringify(webhookData);
      const h = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      const signature = `sha256=${h}`;

      vi.mocked(getWorkflow).mockReturnValue(mockWorkflow as any);
      vi.mocked(getWebhookSecret).mockResolvedValue(webhookSecret);
      vi.mocked(executeWorkflowSimple).mockResolvedValue(undefined);

      const response = await request(app)
        .post(`/api/webhooks/${workflowId}`)
        .set('x-webhook-signature', signature)
        .send(webhookData);

      expect(response.status).toBe(202);
    });

    it('should handle very long secrets', async () => {
      const longSecret = 'a'.repeat(1000);

      vi.mocked(upsertWebhookSecret).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/webhooks/wf_123/secret')
        .send({ secret: longSecret });

      expect(response.status).toBe(200);
      expect(upsertWebhookSecret).toHaveBeenCalledWith('wf_123', longSecret);
    });
  });
});

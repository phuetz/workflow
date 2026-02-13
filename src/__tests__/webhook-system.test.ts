/**
 * Comprehensive Webhook System Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestWebhookManager } from '../backend/webhooks/TestWebhookManager';
import { WebhookAuth, AuthConfig } from '../backend/webhooks/WebhookAuth';
import { WebhookRateLimiter } from '../backend/webhooks/WebhookRateLimiter';
import { WebhookAnalytics } from '../backend/webhooks/WebhookAnalytics';
import { WebhookService } from '../backend/webhooks/WebhookService';

describe('TestWebhookManager', () => {
  let manager: TestWebhookManager;

  beforeEach(() => {
    manager = new TestWebhookManager('http://localhost:3000/api/webhooks');
  });

  afterEach(() => {
    manager.shutdown();
  });

  describe('Test Webhooks', () => {
    it('should create a test webhook', () => {
      const webhook = manager.createTestWebhook('workflow-1');

      expect(webhook).toBeDefined();
      expect(webhook.mode).toBe('test');
      expect(webhook.workflowId).toBe('workflow-1');
      expect(webhook.expiresAt).toBeDefined();
      expect(webhook.active).toBe(true);
    });

    it('should expire test webhooks after 24 hours', () => {
      const webhook = manager.createTestWebhook('workflow-1');
      const expiresAt = webhook.expiresAt!;
      const expectedExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      expect(Math.abs(expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });

    it('should extend test webhook expiry', () => {
      const webhook = manager.createTestWebhook('workflow-1');
      const originalExpiry = webhook.expiresAt!;

      const extended = manager.extendTestWebhook(webhook.id, 24);

      expect(extended.expiresAt!.getTime()).toBeGreaterThan(originalExpiry.getTime());
    });

    it('should get expiring webhooks', () => {
      // Create webhook that expires in 1 hour
      const webhook = manager.createTestWebhook('workflow-1');
      webhook.expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      const expiring = manager.getExpiringWebhooks(2);

      expect(expiring).toHaveLength(1);
      expect(expiring[0].id).toBe(webhook.id);
    });
  });

  describe('Production Webhooks', () => {
    it('should create a production webhook', () => {
      const webhook = manager.createProductionWebhook('workflow-1');

      expect(webhook).toBeDefined();
      expect(webhook.mode).toBe('production');
      expect(webhook.workflowId).toBe('workflow-1');
      expect(webhook.expiresAt).toBeUndefined();
      expect(webhook.active).toBe(true);
    });

    it('should promote test webhook to production', () => {
      const testWebhook = manager.createTestWebhook('workflow-1');
      const prodWebhook = manager.promoteToProduction(testWebhook.id);

      expect(prodWebhook.mode).toBe('production');
      expect(prodWebhook.workflowId).toBe(testWebhook.workflowId);
      expect(prodWebhook.expiresAt).toBeUndefined();
    });
  });

  describe('Request Tracking', () => {
    it('should record webhook request', () => {
      const webhook = manager.createTestWebhook('workflow-1');

      const request = manager.recordRequest(webhook.id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { test: true },
        ip: '127.0.0.1'
      });

      expect(request).toBeDefined();
      expect(request.webhookId).toBe(webhook.id);
      expect(request.method).toBe('POST');
    });

    it('should record webhook response', () => {
      const webhook = manager.createTestWebhook('workflow-1');
      const request = manager.recordRequest(webhook.id, {
        method: 'POST',
        headers: {},
      });

      const response = manager.recordResponse(request.id, {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { success: true },
        responseTime: 150
      });

      expect(response).toBeDefined();
      expect(response.requestId).toBe(request.id);
      expect(response.statusCode).toBe(200);
    });

    it('should get request history', () => {
      const webhook = manager.createTestWebhook('workflow-1');

      for (let i = 0; i < 5; i++) {
        manager.recordRequest(webhook.id, {
          method: 'POST',
          headers: {}
        });
      }

      const history = manager.getRequestHistory(webhook.id, { limit: 10 });

      expect(history).toHaveLength(5);
    });
  });

  describe('Statistics', () => {
    it('should calculate webhook statistics', () => {
      const webhook = manager.createTestWebhook('workflow-1');

      for (let i = 0; i < 10; i++) {
        const request = manager.recordRequest(webhook.id, {
          method: i % 2 === 0 ? 'POST' : 'GET',
          headers: {}
        });

        manager.recordResponse(request.id, {
          statusCode: i % 3 === 0 ? 500 : 200,
          headers: {},
          body: {},
          responseTime: 100 + i * 10
        });
      }

      const stats = manager.getStatistics(webhook.id);

      expect(stats.totalRequests).toBe(10);
      expect(stats.requestsByMethod['POST']).toBe(5);
      expect(stats.requestsByMethod['GET']).toBe(5);
    });
  });
});

describe('WebhookAuth', () => {
  let auth: WebhookAuth;

  beforeEach(() => {
    auth = new WebhookAuth();
  });

  describe('Basic Authentication', () => {
    it('should authenticate valid basic auth', async () => {
      const config: AuthConfig = {
        method: 'basic',
        config: {
          type: 'basic',
          username: 'user',
          password: 'pass'
        }
      };

      const credentials = Buffer.from('user:pass').toString('base64');
      const result = await auth.authenticate({
        method: 'POST',
        path: '/webhook',
        headers: {
          'Authorization': `Basic ${credentials}`
        },
        query: {},
        body: {}
      }, config);

      expect(result.authenticated).toBe(true);
    });

    it('should reject invalid basic auth', async () => {
      const config: AuthConfig = {
        method: 'basic',
        config: {
          type: 'basic',
          username: 'user',
          password: 'pass'
        }
      };

      const credentials = Buffer.from('user:wrong').toString('base64');
      const result = await auth.authenticate({
        method: 'POST',
        path: '/webhook',
        headers: {
          'Authorization': `Basic ${credentials}`
        },
        query: {},
        body: {}
      }, config);

      expect(result.authenticated).toBe(false);
    });
  });

  describe('Header Authentication', () => {
    it('should authenticate valid header', async () => {
      const config: AuthConfig = {
        method: 'header',
        config: {
          type: 'header',
          headerName: 'X-API-Key',
          headerValue: 'secret-key'
        }
      };

      const result = await auth.authenticate({
        method: 'POST',
        path: '/webhook',
        headers: {
          'X-API-Key': 'secret-key'
        },
        query: {},
        body: {}
      }, config);

      expect(result.authenticated).toBe(true);
    });
  });

  describe('Query Authentication', () => {
    it('should authenticate valid query parameter', async () => {
      const config: AuthConfig = {
        method: 'query',
        config: {
          type: 'query',
          paramName: 'api_key',
          paramValue: 'secret-key'
        }
      };

      const result = await auth.authenticate({
        method: 'POST',
        path: '/webhook',
        headers: {},
        query: {
          api_key: 'secret-key'
        },
        body: {}
      }, config);

      expect(result.authenticated).toBe(true);
    });
  });

  describe('HMAC Authentication', () => {
    it('should authenticate valid HMAC signature', async () => {
      const crypto = require('crypto');
      const secret = 'my-secret';
      const body = JSON.stringify({ test: true });
      const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

      const config: AuthConfig = {
        method: 'hmac',
        config: {
          type: 'hmac',
          secret,
          algorithm: 'sha256' as const,
          headerName: 'X-Signature'
        }
      };

      const result = await auth.authenticate({
        method: 'POST',
        path: '/webhook',
        headers: {
          'X-Signature': signature
        },
        query: {},
        body: { test: true },
        rawBody: body
      }, config);

      expect(result.authenticated).toBe(true);
    });
  });
});

describe('WebhookRateLimiter', () => {
  let rateLimiter: WebhookRateLimiter;

  beforeEach(() => {
    rateLimiter = new WebhookRateLimiter();
  });

  afterEach(() => {
    rateLimiter.shutdown();
  });

  it('should allow requests within rate limit', () => {
    const config = {
      webhookLimits: {
        requests: 10,
        window: 'minute' as const
      }
    };

    for (let i = 0; i < 10; i++) {
      const result = rateLimiter.checkRateLimit('webhook-1', '127.0.0.1', config);
      expect(result.allowed).toBe(true);

      if (result.allowed) {
        rateLimiter.recordRequest('webhook-1', '127.0.0.1', config);
      }
    }
  });

  it('should block requests exceeding rate limit', () => {
    const config = {
      webhookLimits: {
        requests: 5,
        window: 'minute' as const
      }
    };

    for (let i = 0; i < 5; i++) {
      rateLimiter.recordRequest('webhook-1', '127.0.0.1', config);
    }

    const result = rateLimiter.checkRateLimit('webhook-1', '127.0.0.1', config);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should handle IP-based rate limiting', () => {
    const config = {
      ipLimits: {
        requests: 3,
        window: 'minute' as const
      }
    };

    for (let i = 0; i < 3; i++) {
      rateLimiter.recordRequest('webhook-1', '192.168.1.1', config);
    }

    const result = rateLimiter.checkRateLimit('webhook-1', '192.168.1.1', config);
    expect(result.allowed).toBe(false);
  });

  it('should whitelist IPs', () => {
    const config = {
      webhookLimits: {
        requests: 1,
        window: 'minute' as const
      },
      whitelistedIPs: ['127.0.0.1']
    };

    for (let i = 0; i < 10; i++) {
      const result = rateLimiter.checkRateLimit('webhook-1', '127.0.0.1', config);
      expect(result.allowed).toBe(true);
    }
  });

  it('should blacklist IPs', () => {
    const config = {
      blacklistedIPs: ['192.168.1.100']
    };

    const result = rateLimiter.checkRateLimit('webhook-1', '192.168.1.100', config);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('blacklisted');
  });
});

describe('WebhookAnalytics', () => {
  let analytics: WebhookAnalytics;

  beforeEach(() => {
    analytics = new WebhookAnalytics();
  });

  afterEach(() => {
    analytics.shutdown();
  });

  it('should log webhook requests', () => {
    const log = analytics.logRequest({
      webhookId: 'webhook-1',
      method: 'POST',
      path: '/webhook',
      headers: {},
      query: {},
      body: { test: true },
      bodySize: 100,
      statusCode: 200,
      responseTime: 150,
      success: true
    });

    expect(log).toBeDefined();
    expect(log.id).toBeDefined();
  });

  it('should get analytics summary', () => {
    for (let i = 0; i < 10; i++) {
      analytics.logRequest({
        webhookId: 'webhook-1',
        method: i % 2 === 0 ? 'POST' : 'GET',
        path: '/webhook',
        headers: {},
        query: {},
        body: {},
        bodySize: 100,
        statusCode: i % 3 === 0 ? 500 : 200,
        responseTime: 100 + i * 10,
        success: i % 3 !== 0
      });
    }

    const summary = analytics.getSummary('webhook-1');

    expect(summary.totalRequests).toBe(10);
    expect(summary.successfulRequests).toBeGreaterThan(0);
    expect(summary.failedRequests).toBeGreaterThan(0);
    expect(summary.averageResponseTime).toBeGreaterThan(0);
  });

  it('should calculate percentiles', () => {
    for (let i = 0; i < 100; i++) {
      analytics.logRequest({
        webhookId: 'webhook-1',
        method: 'POST',
        path: '/webhook',
        headers: {},
        query: {},
        body: {},
        bodySize: 100,
        statusCode: 200,
        responseTime: i * 10,
        success: true
      });
    }

    const summary = analytics.getSummary('webhook-1');

    expect(summary.p95ResponseTime).toBeGreaterThan(summary.medianResponseTime);
    expect(summary.p99ResponseTime).toBeGreaterThan(summary.p95ResponseTime);
  });

  it('should export to CSV', () => {
    analytics.logRequest({
      webhookId: 'webhook-1',
      method: 'POST',
      path: '/webhook',
      headers: {},
      query: {},
      body: {},
      bodySize: 100,
      statusCode: 200,
      responseTime: 150,
      success: true
    });

    const csv = analytics.exportToCSV('webhook-1');

    expect(csv).toContain('Timestamp');
    expect(csv).toContain('POST');
    expect(csv).toContain('200');
  });
});

describe('WebhookService Integration', () => {
  let service: WebhookService;

  beforeEach(() => {
    service = new WebhookService();
  });

  afterEach(() => {
    service.shutdown();
  });

  it('should create webhook with all features', () => {
    const { webhook, config } = service.createWebhook({
      workflowId: 'workflow-1',
      mode: 'test',
      name: 'Test Webhook',
      authentication: {
        method: 'header',
        config: {
          type: 'header',
          headerName: 'X-API-Key',
          headerValue: 'secret'
        }
      },
      rateLimit: {
        webhookLimits: {
          requests: 100,
          window: 'hour'
        }
      },
      analytics: {
        enabled: true,
        trackHeaders: true,
        trackBody: true
      }
    });

    expect(webhook).toBeDefined();
    expect(config).toBeDefined();
    expect(webhook.mode).toBe('test');
    expect(config.authentication).toBeDefined();
  });

  it('should handle authenticated request', async () => {
    const { webhook } = service.createWebhook({
      workflowId: 'workflow-1',
      mode: 'test',
      authentication: {
        method: 'header',
        config: {
          type: 'header',
          headerName: 'X-API-Key',
          headerValue: 'secret'
        }
      }
    });

    const response = await service.handleRequest(webhook.id, {
      method: 'POST',
      path: '/webhook',
      headers: {
        'X-API-Key': 'secret'
      },
      query: {},
      body: { test: true }
    });

    expect(response.statusCode).toBe(200);
  });

  it('should reject unauthenticated request', async () => {
    const { webhook } = service.createWebhook({
      workflowId: 'workflow-1',
      mode: 'test',
      authentication: {
        method: 'header',
        config: {
          type: 'header',
          headerName: 'X-API-Key',
          headerValue: 'secret'
        }
      }
    });

    const response = await service.handleRequest(webhook.id, {
      method: 'POST',
      path: '/webhook',
      headers: {},
      query: {},
      body: { test: true }
    });

    expect(response.statusCode).toBe(401);
  });

  it('should enforce rate limits', async () => {
    const { webhook } = service.createWebhook({
      workflowId: 'workflow-1',
      mode: 'test',
      rateLimit: {
        webhookLimits: {
          requests: 2,
          window: 'minute'
        }
      }
    });

    // First two requests should succeed
    for (let i = 0; i < 2; i++) {
      const response = await service.handleRequest(webhook.id, {
        method: 'POST',
        path: '/webhook',
        headers: {},
        query: {},
        body: {}
      });
      expect(response.statusCode).toBe(200);
    }

    // Third request should be rate limited
    const response = await service.handleRequest(webhook.id, {
      method: 'POST',
      path: '/webhook',
      headers: {},
      query: {},
      body: {}
    });

    expect(response.statusCode).toBe(429);
  });
});

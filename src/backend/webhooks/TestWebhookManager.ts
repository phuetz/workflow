/**
 * Test Webhook Manager
 * Manages test vs production webhooks with different lifecycles
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';

export interface WebhookEndpoint {
  id: string;
  workflowId: string;
  mode: 'test' | 'production';
  url: string;
  path: string;
  method: string[];
  active: boolean;
  createdAt: Date;
  expiresAt?: Date; // Only for test webhooks
  lastTriggeredAt?: Date;
  triggerCount: number;
  metadata?: Record<string, any>;
}

export interface WebhookRequest {
  id: string;
  webhookId: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: any;
  ip?: string;
  timestamp: Date;
}

export interface WebhookResponse {
  id: string;
  requestId: string;
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  responseTime: number;
  timestamp: Date;
}

export class TestWebhookManager extends EventEmitter {
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private requests: Map<string, WebhookRequest> = new Map();
  private responses: Map<string, WebhookResponse> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  // Configuration
  private readonly TEST_WEBHOOK_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  private readonly MAX_REQUEST_HISTORY = 1000;

  constructor(
    private baseUrl: string = process.env.WEBHOOK_BASE_URL || 'http://localhost:3000/api/webhooks'
  ) {
    super();
    this.startCleanupTask();
    logger.info('TestWebhookManager initialized');
  }

  /**
   * Create a test webhook (expires after 24 hours)
   */
  createTestWebhook(
    workflowId: string,
    options?: {
      methods?: string[];
      metadata?: Record<string, any>;
      customPath?: string;
    }
  ): WebhookEndpoint {
    const id = this.generateWebhookId('test');
    const path = options?.customPath || `/test/${id}`;

    const webhook: WebhookEndpoint = {
      id,
      workflowId,
      mode: 'test',
      url: `${this.baseUrl}${path}`,
      path,
      method: options?.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      active: true,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.TEST_WEBHOOK_EXPIRY),
      triggerCount: 0,
      metadata: options?.metadata
    };

    this.endpoints.set(id, webhook);
    this.emit('webhook:created', { webhook, mode: 'test' });

    logger.info(`Test webhook created: ${id} (expires at ${webhook.expiresAt?.toISOString()})`);

    return webhook;
  }

  /**
   * Create a production webhook (permanent until deleted)
   */
  createProductionWebhook(
    workflowId: string,
    options?: {
      methods?: string[];
      metadata?: Record<string, any>;
      customPath?: string;
    }
  ): WebhookEndpoint {
    const id = this.generateWebhookId('prod');
    const path = options?.customPath || `/webhooks/${id}`;

    const webhook: WebhookEndpoint = {
      id,
      workflowId,
      mode: 'production',
      url: `${this.baseUrl}${path}`,
      path,
      method: options?.methods || ['POST'],
      active: true,
      createdAt: new Date(),
      triggerCount: 0,
      metadata: options?.metadata
    };

    this.endpoints.set(id, webhook);
    this.emit('webhook:created', { webhook, mode: 'production' });

    logger.info(`Production webhook created: ${id}`);

    return webhook;
  }

  /**
   * Convert test webhook to production
   */
  promoteToProduction(testWebhookId: string): WebhookEndpoint {
    const testWebhook = this.endpoints.get(testWebhookId);

    if (!testWebhook) {
      throw new Error(`Webhook ${testWebhookId} not found`);
    }

    if (testWebhook.mode !== 'test') {
      throw new Error(`Webhook ${testWebhookId} is not a test webhook`);
    }

    // Create new production webhook with same configuration
    const productionWebhook = this.createProductionWebhook(
      testWebhook.workflowId,
      {
        methods: testWebhook.method,
        metadata: {
          ...testWebhook.metadata,
          promotedFrom: testWebhookId,
          promotedAt: new Date().toISOString()
        }
      }
    );

    // Optionally delete the test webhook
    // this.deleteWebhook(testWebhookId);

    this.emit('webhook:promoted', {
      testWebhook,
      productionWebhook
    });

    logger.info(`Test webhook ${testWebhookId} promoted to production ${productionWebhook.id}`);

    return productionWebhook;
  }

  /**
   * Get webhook by ID
   */
  getWebhook(webhookId: string): WebhookEndpoint | undefined {
    return this.endpoints.get(webhookId);
  }

  /**
   * Get webhook by path
   */
  getWebhookByPath(path: string): WebhookEndpoint | undefined {
    return Array.from(this.endpoints.values()).find(w => w.path === path);
  }

  /**
   * List all webhooks
   */
  listWebhooks(filters?: {
    workflowId?: string;
    mode?: 'test' | 'production';
    active?: boolean;
  }): WebhookEndpoint[] {
    let webhooks = Array.from(this.endpoints.values());

    if (filters) {
      if (filters.workflowId) {
        webhooks = webhooks.filter(w => w.workflowId === filters.workflowId);
      }
      if (filters.mode) {
        webhooks = webhooks.filter(w => w.mode === filters.mode);
      }
      if (filters.active !== undefined) {
        webhooks = webhooks.filter(w => w.active === filters.active);
      }
    }

    return webhooks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Update webhook
   */
  updateWebhook(
    webhookId: string,
    updates: {
      active?: boolean;
      method?: string[];
      metadata?: Record<string, any>;
    }
  ): WebhookEndpoint {
    const webhook = this.endpoints.get(webhookId);

    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    if (updates.active !== undefined) {
      webhook.active = updates.active;
    }
    if (updates.method) {
      webhook.method = updates.method;
    }
    if (updates.metadata) {
      webhook.metadata = { ...webhook.metadata, ...updates.metadata };
    }

    this.emit('webhook:updated', { webhook, updates });

    return webhook;
  }

  /**
   * Delete webhook
   */
  deleteWebhook(webhookId: string): void {
    const webhook = this.endpoints.get(webhookId);

    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    this.endpoints.delete(webhookId);

    // Clean up associated requests and responses
    this.cleanupWebhookHistory(webhookId);

    this.emit('webhook:deleted', { webhook });

    logger.info(`Webhook deleted: ${webhookId}`);
  }

  /**
   * Record incoming webhook request
   */
  recordRequest(
    webhookId: string,
    request: {
      method: string;
      headers: Record<string, string>;
      query?: Record<string, string>;
      body?: any;
      ip?: string;
    }
  ): WebhookRequest {
    const webhook = this.endpoints.get(webhookId);

    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    // Check if webhook is expired
    if (webhook.mode === 'test' && webhook.expiresAt && webhook.expiresAt < new Date()) {
      throw new Error(`Webhook ${webhookId} has expired`);
    }

    // Check if webhook is active
    if (!webhook.active) {
      throw new Error(`Webhook ${webhookId} is not active`);
    }

    // Check if method is allowed
    if (!webhook.method.includes(request.method)) {
      throw new Error(`Method ${request.method} not allowed for webhook ${webhookId}`);
    }

    const webhookRequest: WebhookRequest = {
      id: crypto.randomBytes(16).toString('hex'),
      webhookId,
      method: request.method,
      headers: request.headers,
      query: request.query || {},
      body: request.body,
      ip: request.ip,
      timestamp: new Date()
    };

    this.requests.set(webhookRequest.id, webhookRequest);

    // Update webhook statistics
    webhook.lastTriggeredAt = new Date();
    webhook.triggerCount++;

    this.emit('webhook:request', { webhook, request: webhookRequest });

    // Cleanup old requests if limit exceeded
    this.cleanupOldRequests();

    return webhookRequest;
  }

  /**
   * Record webhook response
   */
  recordResponse(
    requestId: string,
    response: {
      statusCode: number;
      headers: Record<string, string>;
      body: any;
      responseTime: number;
    }
  ): WebhookResponse {
    const request = this.requests.get(requestId);

    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    const webhookResponse: WebhookResponse = {
      id: crypto.randomBytes(16).toString('hex'),
      requestId,
      statusCode: response.statusCode,
      headers: response.headers,
      body: response.body,
      responseTime: response.responseTime,
      timestamp: new Date()
    };

    this.responses.set(webhookResponse.id, webhookResponse);

    this.emit('webhook:response', { request, response: webhookResponse });

    return webhookResponse;
  }

  /**
   * Get request history for a webhook
   */
  getRequestHistory(
    webhookId: string,
    options?: {
      limit?: number;
      offset?: number;
      includeResponses?: boolean;
    }
  ): Array<WebhookRequest & { response?: WebhookResponse }> {
    const requests = Array.from(this.requests.values())
      .filter(r => r.webhookId === webhookId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    const paginatedRequests = requests.slice(offset, offset + limit);

    if (options?.includeResponses) {
      return paginatedRequests.map(request => {
        const response = Array.from(this.responses.values())
          .find(r => r.requestId === request.id);
        return { ...request, response };
      });
    }

    return paginatedRequests;
  }

  /**
   * Get statistics for a webhook
   */
  getStatistics(webhookId: string): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    lastTriggered?: Date;
    requestsByMethod: Record<string, number>;
    requestsByStatus: Record<number, number>;
  } {
    const webhook = this.endpoints.get(webhookId);

    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    const requests = Array.from(this.requests.values())
      .filter(r => r.webhookId === webhookId);

    const responses = requests
      .map(r => Array.from(this.responses.values()).find(res => res.requestId === r.id))
      .filter((r): r is WebhookResponse => r !== undefined);

    const successfulRequests = responses.filter(r => r.statusCode >= 200 && r.statusCode < 300).length;
    const failedRequests = responses.filter(r => r.statusCode >= 400).length;

    const averageResponseTime = responses.length > 0
      ? responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length
      : 0;

    const requestsByMethod = requests.reduce((acc, r) => {
      acc[r.method] = (acc[r.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const requestsByStatus = responses.reduce((acc, r) => {
      acc[r.statusCode] = (acc[r.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      totalRequests: requests.length,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      lastTriggered: webhook.lastTriggeredAt,
      requestsByMethod,
      requestsByStatus
    };
  }

  /**
   * Check if test webhooks are about to expire
   */
  getExpiringWebhooks(withinHours: number = 2): WebhookEndpoint[] {
    const now = new Date();
    const threshold = new Date(now.getTime() + withinHours * 60 * 60 * 1000);

    return Array.from(this.endpoints.values())
      .filter(w =>
        w.mode === 'test' &&
        w.expiresAt &&
        w.expiresAt > now &&
        w.expiresAt <= threshold
      );
  }

  /**
   * Extend test webhook expiry
   */
  extendTestWebhook(webhookId: string, additionalHours: number = 24): WebhookEndpoint {
    const webhook = this.endpoints.get(webhookId);

    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    if (webhook.mode !== 'test') {
      throw new Error(`Webhook ${webhookId} is not a test webhook`);
    }

    const currentExpiry = webhook.expiresAt || new Date();
    webhook.expiresAt = new Date(currentExpiry.getTime() + additionalHours * 60 * 60 * 1000);

    this.emit('webhook:extended', { webhook, additionalHours });

    logger.info(`Test webhook ${webhookId} extended until ${webhook.expiresAt.toISOString()}`);

    return webhook;
  }

  /**
   * Start automatic cleanup task
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredWebhooks();
      this.cleanupOldRequests();
    }, this.CLEANUP_INTERVAL);

    logger.info('Webhook cleanup task started');
  }

  /**
   * Cleanup expired test webhooks
   */
  private cleanupExpiredWebhooks(): void {
    const now = new Date();
    let cleanupCount = 0;

    for (const [id, webhook] of this.endpoints.entries()) {
      if (webhook.mode === 'test' && webhook.expiresAt && webhook.expiresAt < now) {
        this.endpoints.delete(id);
        this.cleanupWebhookHistory(id);
        cleanupCount++;

        this.emit('webhook:expired', { webhook });

        logger.info(`Expired test webhook cleaned up: ${id}`);
      }
    }

    if (cleanupCount > 0) {
      logger.info(`Cleaned up ${cleanupCount} expired test webhooks`);
    }
  }

  /**
   * Cleanup old requests to prevent memory overflow
   */
  private cleanupOldRequests(): void {
    if (this.requests.size <= this.MAX_REQUEST_HISTORY) {
      return;
    }

    const sortedRequests = Array.from(this.requests.entries())
      .sort((a, b) => b[1].timestamp.getTime() - a[1].timestamp.getTime());

    const toDelete = sortedRequests.slice(this.MAX_REQUEST_HISTORY);

    for (const [id] of toDelete) {
      this.requests.delete(id);

      // Delete associated responses
      for (const [responseId, response] of this.responses.entries()) {
        if (response.requestId === id) {
          this.responses.delete(responseId);
        }
      }
    }

    if (toDelete.length > 0) {
      logger.info(`Cleaned up ${toDelete.length} old webhook requests`);
    }
  }

  /**
   * Cleanup history for a specific webhook
   */
  private cleanupWebhookHistory(webhookId: string): void {
    // Delete all requests for this webhook
    for (const [requestId, request] of this.requests.entries()) {
      if (request.webhookId === webhookId) {
        this.requests.delete(requestId);

        // Delete associated responses
        for (const [responseId, response] of this.responses.entries()) {
          if (response.requestId === requestId) {
            this.responses.delete(responseId);
          }
        }
      }
    }
  }

  /**
   * Generate unique webhook ID
   */
  private generateWebhookId(prefix: 'test' | 'prod'): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Get summary of all webhooks
   */
  getSummary(): {
    total: number;
    test: number;
    production: number;
    active: number;
    inactive: number;
    expiringSoon: number;
    totalRequests: number;
  } {
    const webhooks = Array.from(this.endpoints.values());

    return {
      total: webhooks.length,
      test: webhooks.filter(w => w.mode === 'test').length,
      production: webhooks.filter(w => w.mode === 'production').length,
      active: webhooks.filter(w => w.active).length,
      inactive: webhooks.filter(w => !w.active).length,
      expiringSoon: this.getExpiringWebhooks(2).length,
      totalRequests: this.requests.size
    };
  }

  /**
   * Shutdown and cleanup
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.removeAllListeners();

    logger.info('TestWebhookManager shut down');
  }
}

// Export singleton instance
export const testWebhookManager = new TestWebhookManager();

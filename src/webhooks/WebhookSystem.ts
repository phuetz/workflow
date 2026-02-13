/**
 * Advanced Webhook System
 * Manage incoming and outgoing webhooks with retry, signature verification, and rate limiting
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { logger } from '../services/SimpleLogger';
import fetch from 'node-fetch';

export interface Webhook {
  id: string;
  name: string;
  description?: string;
  type: 'incoming' | 'outgoing';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  authentication?: WebhookAuth;
  events?: string[]; // Events that trigger this webhook
  payload?: WebhookPayload;
  transformation?: PayloadTransformation;
  retry?: RetryConfig;
  rateLimit?: RateLimitConfig;
  validation?: ValidationConfig;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastTriggered?: Date;
  metadata?: Record<string, any>;
}

export interface WebhookAuth {
  type: 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth2' | 'hmac' | 'custom';
  credentials?: {
    apiKey?: string;
    token?: string;
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
    secret?: string; // For HMAC
  };
  header?: string; // Custom header name
  queryParam?: string; // Query parameter name
}

export interface WebhookPayload {
  type: 'json' | 'form' | 'xml' | 'text' | 'custom';
  template?: string; // Template for custom payloads
  fields?: Record<string, any>;
  includeHeaders?: boolean;
  includeTimestamp?: boolean;
  includeSignature?: boolean;
}

export interface PayloadTransformation {
  type: 'jmespath' | 'jsonpath' | 'javascript' | 'template';
  expression?: string;
  script?: string;
  mapping?: Record<string, string>;
}

export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  delay: number;
  backoff: 'linear' | 'exponential' | 'fibonacci';
  maxDelay?: number;
  retryOn?: number[]; // HTTP status codes to retry on
}

export interface RateLimitConfig {
  requests: number;
  window: number; // Time window in ms
  burst?: number; // Allow burst requests
}

export interface ValidationConfig {
  signature?: {
    algorithm: 'sha1' | 'sha256' | 'sha512';
    secret: string;
    header: string;
  };
  ipWhitelist?: string[];
  schema?: any; // JSON schema for payload validation
}

export interface WebhookExecution {
  id: string;
  webhookId: string;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
  };
  response?: {
    status: number;
    headers: Record<string, string>;
    body: any;
    time: number; // Response time in ms
  };
  attempts: number;
  error?: string;
  executedAt: Date;
  completedAt?: Date;
}

export interface WebhookEndpoint {
  id: string;
  path: string;
  method: string[];
  webhookId: string;
  active: boolean;
  createdAt: Date;
  statistics: {
    requests: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
}

export interface WebhookSubscription {
  id: string;
  webhookId: string;
  events: string[];
  filters?: Record<string, any>;
  active: boolean;
  createdAt: Date;
}

export class WebhookSystem extends EventEmitter {
  private webhooks: Map<string, Webhook> = new Map();
  private executions: Map<string, WebhookExecution> = new Map();
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private subscriptions: Map<string, WebhookSubscription> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private retryQueue: Map<string, NodeJS.Timeout> = new Map();
  private webhookHandlers: Map<string, WebhookHandler> = new Map();

  constructor() {
    super();
    this.initialize();
  }

  /**
   * Initialize webhook system
   */
  private initialize(): void {
    // Register default webhook handlers
    this.registerDefaultHandlers();
    
    logger.info('Webhook system initialized');
  }

  /**
   * Create webhook
   */
  createWebhook(params: Omit<Webhook, 'id' | 'createdAt' | 'updatedAt'>): Webhook {
    const webhook: Webhook = {
      ...params,
      id: `webhook_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.webhooks.set(webhook.id, webhook);

    // Initialize rate limiter if configured
    if (webhook.rateLimit) {
      this.rateLimiters.set(webhook.id, new RateLimiter(webhook.rateLimit));
    }

    // Create endpoint for incoming webhooks
    if (webhook.type === 'incoming') {
      this.createEndpoint(webhook);
    }

    // Subscribe to events for outgoing webhooks
    if (webhook.type === 'outgoing' && webhook.events) {
      this.createSubscription(webhook);
    }

    this.emit('webhook:created', webhook);
    logger.info(`Webhook created: ${webhook.name} (${webhook.type})`);

    return webhook;
  }

  /**
   * Update webhook
   */
  updateWebhook(webhookId: string, updates: Partial<Webhook>): Webhook {
    const webhook = this.webhooks.get(webhookId);
    
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    Object.assign(webhook, updates, {
      updatedAt: new Date()
    });

    // Update rate limiter if changed
    if (updates.rateLimit) {
      this.rateLimiters.set(webhookId, new RateLimiter(updates.rateLimit));
    }

    this.emit('webhook:updated', webhook);
    return webhook;
  }

  /**
   * Delete webhook
   */
  deleteWebhook(webhookId: string): void {
    const webhook = this.webhooks.get(webhookId);
    
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    // Remove associated resources
    this.webhooks.delete(webhookId);
    this.rateLimiters.delete(webhookId);
    
    // Remove endpoints
    for (const [endpointId, endpoint] of this.endpoints.entries()) {
      if (endpoint.webhookId === webhookId) {
        this.endpoints.delete(endpointId);
      }
    }

    // Remove subscriptions
    for (const [subId, subscription] of this.subscriptions.entries()) {
      if (subscription.webhookId === webhookId) {
        this.subscriptions.delete(subId);
      }
    }

    // Cancel pending retries
    for (const [executionId, timeout] of this.retryQueue.entries()) {
      const execution = this.executions.get(executionId);
      if (execution?.webhookId === webhookId) {
        clearTimeout(timeout);
        this.retryQueue.delete(executionId);
      }
    }

    this.emit('webhook:deleted', webhookId);
    logger.info(`Webhook deleted: ${webhookId}`);
  }

  /**
   * Trigger webhook
   */
  async triggerWebhook(
    webhookId: string,
    data?: any,
    options?: {
      headers?: Record<string, string>;
      waitForResponse?: boolean;
      timeout?: number;
    }
  ): Promise<WebhookExecution> {
    const webhook = this.webhooks.get(webhookId);
    
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    if (!webhook.active) {
      throw new Error(`Webhook ${webhookId} is not active`);
    }

    // Check rate limit
    if (webhook.rateLimit) {
      const rateLimiter = this.rateLimiters.get(webhookId);
      if (rateLimiter && !rateLimiter.tryConsume()) {
        throw new Error('Rate limit exceeded');
      }
    }

    // Create execution record
    const execution: WebhookExecution = {
      id: `exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      webhookId,
      status: 'pending',
      request: {
        url: webhook.url,
        method: webhook.method,
        headers: this.buildHeaders(webhook, options?.headers)
      },
      attempts: 0,
      executedAt: new Date()
    };

    // Prepare payload
    const payload = await this.preparePayload(webhook, data);
    if (payload !== undefined) {
      execution.request.body = payload;
    }

    this.executions.set(execution.id, execution);
    webhook.lastTriggered = new Date();

    // Execute webhook
    try {
      const response = await this.executeWebhook(execution, webhook, options?.timeout);
      
      execution.status = 'success';
      execution.response = response;
      execution.completedAt = new Date();
      
      this.emit('webhook:success', { webhook, execution });
      logger.info(`Webhook executed successfully: ${webhookId}`);
      
    } catch (error) {
      execution.status = 'failed';
      execution.error = (error as Error).message;
      
      // Handle retry if configured
      if (webhook.retry?.enabled && execution.attempts < webhook.retry.maxAttempts) {
        execution.status = 'retrying';
        this.scheduleRetry(execution, webhook);
        this.emit('webhook:retrying', { webhook, execution });
      } else {
        execution.completedAt = new Date();
        this.emit('webhook:failed', { webhook, execution, error });
        logger.error(`Webhook failed: ${webhookId} - ${execution.error}`);
      }
    }

    return execution;
  }

  /**
   * Execute webhook request
   */
  private async executeWebhook(
    execution: WebhookExecution,
    webhook: Webhook,
    timeout = 30000
  ): Promise<WebhookExecution['response']> {
    execution.attempts++;
    const startTime = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(execution.request.url, {
        method: execution.request.method,
        headers: execution.request.headers,
        body: execution.request.body ? JSON.stringify(execution.request.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseBody = await this.parseResponse(response);
      const responseTime = Date.now() - startTime;

      const result = {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        time: responseTime
      };

      // Check if should retry based on status code
      if (webhook.retry?.retryOn && webhook.retry.retryOn.includes(response.status)) {
        throw new Error(`HTTP ${response.status}: Retry requested`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return result;

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Parse response based on content type
   */
  private async parseResponse(response: any): Promise<any> {
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      return response.json();
    } else if (contentType.includes('text/')) {
      return response.text();
    } else {
      return response.buffer();
    }
  }

  /**
   * Build request headers
   */
  private buildHeaders(webhook: Webhook, additionalHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'WorkflowPlatform/2.0',
      ...webhook.headers,
      ...additionalHeaders
    };

    // Add authentication headers
    if (webhook.authentication) {
      const auth = webhook.authentication;
      
      switch (auth.type) {
        case 'api_key':
          if (auth.header) {
            headers[auth.header] = auth.credentials?.apiKey || '';
          } else {
            headers['X-API-Key'] = auth.credentials?.apiKey || '';
          }
          break;
          
        case 'bearer':
          headers['Authorization'] = `Bearer ${auth.credentials?.token}`;
          break;
          
        case 'basic':
          const credentials = Buffer.from(
            `${auth.credentials?.username}:${auth.credentials?.password}`
          ).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
          break;
          
        case 'hmac':
          // HMAC signature will be added when preparing payload
          break;
      }
    }

    return headers;
  }

  /**
   * Prepare webhook payload
   */
  private async preparePayload(webhook: Webhook, data: any): Promise<any> {
    if (!data && !webhook.payload) {
      return undefined;
    }

    let payload = data;

    // Apply transformation if configured
    if (webhook.transformation) {
      payload = await this.transformPayload(payload, webhook.transformation);
    }

    // Build payload based on configuration
    if (webhook.payload) {
      const config = webhook.payload;
      
      if (config.template) {
        // Use template engine to build payload
        payload = this.applyTemplate(config.template, payload);
      } else if (config.fields) {
        // Merge with configured fields
        payload = { ...config.fields, ...payload };
      }

      // Add metadata if configured
      if (config.includeTimestamp) {
        payload.timestamp = new Date().toISOString();
      }

      // Add HMAC signature if configured
      if (config.includeSignature && webhook.authentication?.type === 'hmac') {
        const signature = this.generateHMACSignature(
          JSON.stringify(payload),
          webhook.authentication.credentials?.secret || ''
        );
        payload.signature = signature;
      }
    }

    return payload;
  }

  /**
   * Transform payload
   */
  private async transformPayload(data: any, transformation: PayloadTransformation): Promise<any> {
    switch (transformation.type) {
      case 'javascript':
        // Execute JavaScript transformation securely
        if (transformation.script) {
          const { SecureSandbox } = await import('../utils/SecureSandbox');
          const sandbox = SecureSandbox.getInstance();
          const result = await sandbox.evaluate(
            `(function(data) { ${transformation.script} })(data)`,
            {
              variables: { data },
              constants: { JSON, Math, Date }
            },
            { timeout: 5000, enableAsync: false }
          );
          
          if (!result.success) {
            throw new Error(`Transformation failed: ${result.error?.message}`);
          }
          return result.value;
        }
        break;
        
      case 'template':
        // Apply template transformation
        if (transformation.expression) {
          return this.applyTemplate(transformation.expression, data);
        }
        break;
        
      default:
        // Return original data if transformation type not supported
        return data;
    }
    
    return data;
  }

  /**
   * Apply template to data
   */
  private applyTemplate(template: string, data: any): any {
    // Simple template replacement
    let result = template;
    
    const matches = template.match(/\{\{([^}]+)\}\}/g);
    if (matches) {
      matches.forEach(match => {
        const key = match.replace(/\{\{|\}\}/g, '').trim();
        const value = this.getNestedValue(data, key);
        result = result.replace(match, value !== undefined ? value : '');
      });
    }

    // Try to parse as JSON
    try {
      return JSON.parse(result);
    } catch {
      return result;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Generate HMAC signature
   */
  private generateHMACSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(
    payload: string,
    signature: string,
    secret: string,
    algorithm: 'sha1' | 'sha256' | 'sha512' = 'sha256'
  ): boolean {
    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Schedule webhook retry
   */
  private scheduleRetry(execution: WebhookExecution, webhook: Webhook): void {
    if (!webhook.retry) return;

    const delay = this.calculateRetryDelay(
      execution.attempts,
      webhook.retry
    );

    const timeout = setTimeout(async () => {
      try {
        const response = await this.executeWebhook(execution, webhook);
        
        execution.status = 'success';
        execution.response = response;
        execution.completedAt = new Date();
        
        this.emit('webhook:retry-success', { webhook, execution });
        
      } catch (error) {
        if (execution.attempts < webhook.retry!.maxAttempts) {
          this.scheduleRetry(execution, webhook);
        } else {
          execution.status = 'failed';
          execution.completedAt = new Date();
          this.emit('webhook:retry-failed', { webhook, execution, error });
        }
      }
      
      this.retryQueue.delete(execution.id);
    }, delay);

    this.retryQueue.set(execution.id, timeout);
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    let delay = config.delay;

    switch (config.backoff) {
      case 'exponential':
        delay = config.delay * Math.pow(2, attempt - 1);
        break;
      case 'linear':
        delay = config.delay * attempt;
        break;
      case 'fibonacci':
        const fib = (n: number): number => n <= 1 ? n : fib(n - 1) + fib(n - 2);
        delay = config.delay * fib(attempt);
        break;
    }

    if (config.maxDelay) {
      delay = Math.min(delay, config.maxDelay);
    }

    return delay;
  }

  /**
   * Create webhook endpoint
   */
  private createEndpoint(webhook: Webhook): WebhookEndpoint {
    const endpoint: WebhookEndpoint = {
      id: `endpoint_${webhook.id}`,
      path: `/webhooks/${webhook.id}`,
      method: [webhook.method],
      webhookId: webhook.id,
      active: true,
      createdAt: new Date(),
      statistics: {
        requests: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0
      }
    };

    this.endpoints.set(endpoint.id, endpoint);
    this.emit('endpoint:created', endpoint);

    return endpoint;
  }

  /**
   * Create webhook subscription
   */
  private createSubscription(webhook: Webhook): WebhookSubscription {
    const subscription: WebhookSubscription = {
      id: `sub_${webhook.id}`,
      webhookId: webhook.id,
      events: webhook.events || [],
      active: true,
      createdAt: new Date()
    };

    this.subscriptions.set(subscription.id, subscription);
    
    // Subscribe to events
    subscription.events.forEach(event => {
      this.on(event, (data) => {
        if (webhook.active) {
          this.triggerWebhook(webhook.id, data).catch(error => {
            logger.error(`Failed to trigger webhook for event ${event}:`, error);
          });
        }
      });
    });

    this.emit('subscription:created', subscription);
    return subscription;
  }

  /**
   * Handle incoming webhook
   */
  async handleIncomingWebhook(
    webhookId: string,
    request: {
      method: string;
      headers: Record<string, string>;
      body?: any;
      query?: Record<string, string>;
      ip?: string;
    }
  ): Promise<any> {
    const webhook = this.webhooks.get(webhookId);
    
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    if (!webhook.active) {
      throw new Error(`Webhook ${webhookId} is not active`);
    }

    if (webhook.type !== 'incoming') {
      throw new Error(`Webhook ${webhookId} is not an incoming webhook`);
    }

    // Validate request
    if (webhook.validation) {
      await this.validateIncomingWebhook(request, webhook.validation);
    }

    // Update endpoint statistics
    const endpoint = Array.from(this.endpoints.values()).find(e => e.webhookId === webhookId);
    if (endpoint) {
      endpoint.statistics.requests++;
    }

    // Process webhook
    const handler = this.webhookHandlers.get(webhookId);
    if (handler) {
      try {
        const result = await handler.handle(request);
        
        if (endpoint) {
          endpoint.statistics.successful++;
        }
        
        this.emit('webhook:received', { webhook, request, result });
        return result;
        
      } catch (error) {
        if (endpoint) {
          endpoint.statistics.failed++;
        }
        
        this.emit('webhook:receive-error', { webhook, request, error });
        throw error;
      }
    }

    // Default response
    return { success: true, message: 'Webhook received' };
  }

  /**
   * Validate incoming webhook
   */
  private async validateIncomingWebhook(
    request: any,
    validation: ValidationConfig
  ): Promise<void> {
    // Validate signature
    if (validation.signature) {
      const signature = request.headers[validation.signature.header];
      
      if (!signature) {
        throw new Error('Missing webhook signature');
      }

      const payload = typeof request.body === 'string' 
        ? request.body 
        : JSON.stringify(request.body);

      const isValid = this.verifySignature(
        payload,
        signature,
        validation.signature.secret,
        validation.signature.algorithm
      );

      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
    }

    // Validate IP whitelist
    if (validation.ipWhitelist && request.ip) {
      if (!validation.ipWhitelist.includes(request.ip)) {
        throw new Error(`IP ${request.ip} not whitelisted`);
      }
    }

    // Validate schema
    if (validation.schema && request.body) {
      // In production, use a JSON schema validator
      // For now, just check if body exists
      if (!request.body) {
        throw new Error('Invalid webhook payload');
      }
    }
  }

  /**
   * Register webhook handler
   */
  registerWebhookHandler(webhookId: string, handler: WebhookHandler): void {
    this.webhookHandlers.set(webhookId, handler);
    this.emit('handler:registered', webhookId);
  }

  /**
   * Register default handlers
   */
  private registerDefaultHandlers(): void {
    // Default handler that just logs and acknowledges
    const defaultHandler: WebhookHandler = {
      async handle(request) {
        logger.info('Webhook received:', request);
        return { acknowledged: true };
      }
    };

    // Register for system webhooks
    this.webhookHandlers.set('default', defaultHandler);
  }

  /**
   * Get webhook by ID
   */
  getWebhook(webhookId: string): Webhook | undefined {
    return this.webhooks.get(webhookId);
  }

  /**
   * List webhooks
   */
  listWebhooks(filters?: {
    type?: 'incoming' | 'outgoing';
    active?: boolean;
    event?: string;
  }): Webhook[] {
    let webhooks = Array.from(this.webhooks.values());

    if (filters) {
      if (filters.type !== undefined) {
        webhooks = webhooks.filter(w => w.type === filters.type);
      }
      if (filters.active !== undefined) {
        webhooks = webhooks.filter(w => w.active === filters.active);
      }
      if (filters.event) {
        webhooks = webhooks.filter(w => w.events?.includes(filters.event));
      }
    }

    return webhooks;
  }

  /**
   * Get webhook executions
   */
  getExecutions(webhookId?: string, limit = 100): WebhookExecution[] {
    let executions = Array.from(this.executions.values());

    if (webhookId) {
      executions = executions.filter(e => e.webhookId === webhookId);
    }

    return executions
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get webhook statistics
   */
  getStatistics(webhookId?: string): any {
    if (webhookId) {
      const webhook = this.webhooks.get(webhookId);
      if (!webhook) {
        throw new Error(`Webhook ${webhookId} not found`);
      }

      const executions = this.getExecutions(webhookId);
      const successful = executions.filter(e => e.status === 'success').length;
      const failed = executions.filter(e => e.status === 'failed').length;
      
      return {
        webhookId,
        totalExecutions: executions.length,
        successful,
        failed,
        successRate: executions.length > 0 ? (successful / executions.length) * 100 : 0,
        averageResponseTime: this.calculateAverageResponseTime(executions),
        lastTriggered: webhook.lastTriggered
      };
    }

    // Global statistics
    const totalWebhooks = this.webhooks.size;
    const activeWebhooks = Array.from(this.webhooks.values()).filter(w => w.active).length;
    const totalExecutions = this.executions.size;
    const pendingRetries = this.retryQueue.size;

    return {
      totalWebhooks,
      activeWebhooks,
      incomingWebhooks: Array.from(this.webhooks.values()).filter(w => w.type === 'incoming').length,
      outgoingWebhooks: Array.from(this.webhooks.values()).filter(w => w.type === 'outgoing').length,
      totalExecutions,
      pendingRetries,
      endpoints: this.endpoints.size,
      subscriptions: this.subscriptions.size
    };
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(executions: WebhookExecution[]): number {
    const withResponse = executions.filter(e => e.response?.time);
    
    if (withResponse.length === 0) {
      return 0;
    }

    const total = withResponse.reduce((sum, e) => sum + (e.response?.time || 0), 0);
    return total / withResponse.length;
  }

  /**
   * Test webhook
   */
  async testWebhook(webhookId: string, testData?: any): Promise<WebhookExecution> {
    const webhook = this.webhooks.get(webhookId);
    
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    // Temporarily enable webhook for testing
    const wasActive = webhook.active;
    webhook.active = true;

    try {
      const execution = await this.triggerWebhook(webhookId, testData || {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Test webhook execution'
      });

      return execution;
    } finally {
      webhook.active = wasActive;
    }
  }

  /**
   * Clear executions
   */
  clearExecutions(webhookId?: string, olderThan?: Date): number {
    let cleared = 0;

    for (const [executionId, execution] of this.executions.entries()) {
      if (webhookId && execution.webhookId !== webhookId) {
        continue;
      }

      if (olderThan && execution.executedAt > olderThan) {
        continue;
      }

      this.executions.delete(executionId);
      cleared++;
    }

    logger.info(`Cleared ${cleared} webhook executions`);
    return cleared;
  }

  /**
   * Shutdown webhook system
   */
  shutdown(): void {
    // Cancel all pending retries
    for (const timeout of this.retryQueue.values()) {
      clearTimeout(timeout);
    }
    this.retryQueue.clear();

    // Deactivate all webhooks
    for (const webhook of this.webhooks.values()) {
      webhook.active = false;
    }

    this.removeAllListeners();
    logger.info('Webhook system shut down');
  }
}

// Helper classes
class RateLimiter {
  private config: RateLimitConfig;
  private tokens: number;
  private lastRefill: number;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.tokens = config.requests;
    this.lastRefill = Date.now();
  }

  tryConsume(): boolean {
    this.refill();
    
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    
    if (elapsed >= this.config.window) {
      this.tokens = this.config.requests;
      this.lastRefill = now;
    }
  }
}

interface WebhookHandler {
  handle(request: any): Promise<any>;
}

// Export singleton instance
export const webhookSystem = new WebhookSystem();
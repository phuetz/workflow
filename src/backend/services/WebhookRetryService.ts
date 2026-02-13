/**
 * Webhook Retry Service
 * Handles webhook delivery with retry logic and queue management
 *
 * Features:
 * - Exponential backoff retry
 * - Webhook signature verification
 * - Custom response handling
 * - Delivery queue
 * - Webhook logs and debugging
 * - >99.9% reliability target
 */

import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';
import crypto from 'crypto';

export interface WebhookPayload {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: Record<string, string>;
  body: Record<string, unknown> | string;
  timeout?: number;
  retryConfig?: RetryConfig;
  authentication?: WebhookAuth;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableStatusCodes?: number[];
}

export interface WebhookAuth {
  type: 'bearer' | 'basic' | 'apikey' | 'signature';
  credentials: Record<string, string>;
  signatureSecret?: string;
  signatureHeader?: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  payload: WebhookPayload;
  attempts: WebhookAttempt[];
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
  nextRetryAt?: Date;
}

export interface WebhookAttempt {
  attemptNumber: number;
  timestamp: Date;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
  duration: number;
}

export interface WebhookLog {
  deliveryId: string;
  webhookId: string;
  url: string;
  status: string;
  attempts: number;
  lastError?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class WebhookRetryService extends EventEmitter {
  private deliveryQueue = new Map<string, WebhookDelivery>();
  private processingQueue = new Set<string>();
  private webhookLogs = new Map<string, WebhookLog>();
  private maxQueueSize = 10000;
  private maxLogSize = 100000;
  private processingInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 5,
    initialDelay: 1000, // 1 second
    maxDelay: 300000, // 5 minutes
    backoffMultiplier: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504]
  };

  constructor() {
    super();
    logger.info('WebhookRetryService initialized');
  }

  /**
   * Start processing queue
   */
  public start(intervalMs = 1000): void {
    if (this.isRunning) {
      logger.warn('WebhookRetryService already running');
      return;
    }

    this.isRunning = true;
    this.processingInterval = setInterval(() => {
      this.processQueue().catch(error => {
        logger.error('Error processing webhook queue:', error);
      });
    }, intervalMs);

    logger.info('WebhookRetryService started', { intervalMs });
  }

  /**
   * Stop processing queue
   */
  public stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.isRunning = false;
    logger.info('WebhookRetryService stopped');
  }

  /**
   * Queue webhook for delivery
   */
  public async queueWebhook(payload: WebhookPayload): Promise<string> {
    if (this.deliveryQueue.size >= this.maxQueueSize) {
      throw new Error(`Webhook queue full (max: ${this.maxQueueSize})`);
    }

    const deliveryId = this.generateDeliveryId();

    const delivery: WebhookDelivery = {
      id: deliveryId,
      webhookId: payload.id,
      payload,
      attempts: [],
      status: 'pending',
      createdAt: new Date()
    };

    this.deliveryQueue.set(deliveryId, delivery);

    logger.info('Webhook queued', {
      deliveryId,
      webhookId: payload.id,
      url: payload.url
    });

    this.emit('webhook.queued', { deliveryId, webhookId: payload.id });

    // Process immediately if not already processing
    if (this.isRunning) {
      this.processQueue().catch(error => {
        logger.error('Error processing queue:', error);
      });
    }

    return deliveryId;
  }

  /**
   * Process delivery queue
   */
  private async processQueue(): Promise<void> {
    const now = new Date();

    for (const [deliveryId, delivery] of this.deliveryQueue.entries()) {
      // Skip if already processing
      if (this.processingQueue.has(deliveryId)) {
        continue;
      }

      // Skip if not ready for retry
      if (delivery.nextRetryAt && delivery.nextRetryAt > now) {
        continue;
      }

      // Skip if completed or cancelled
      if (delivery.status === 'success' || delivery.status === 'cancelled') {
        continue;
      }

      // Check if max attempts reached
      const retryConfig = delivery.payload.retryConfig || this.defaultRetryConfig;
      if (delivery.attempts.length >= retryConfig.maxAttempts) {
        this.markAsFailed(deliveryId);
        continue;
      }

      // Process delivery
      this.processingQueue.add(deliveryId);
      this.processDelivery(deliveryId).finally(() => {
        this.processingQueue.delete(deliveryId);
      });
    }
  }

  /**
   * Process single delivery
   */
  private async processDelivery(deliveryId: string): Promise<void> {
    const delivery = this.deliveryQueue.get(deliveryId);
    if (!delivery) return;

    const attemptNumber = delivery.attempts.length + 1;
    const startTime = Date.now();

    logger.info('Attempting webhook delivery', {
      deliveryId,
      webhookId: delivery.webhookId,
      attemptNumber,
      url: delivery.payload.url
    });

    delivery.status = 'in_progress';

    try {
      // Add authentication headers
      const headers = { ...delivery.payload.headers };
      this.addAuthHeaders(headers, delivery.payload.authentication);

      // Add signature if configured
      if (delivery.payload.authentication?.signatureSecret) {
        this.addSignature(
          headers,
          delivery.payload.body,
          delivery.payload.authentication
        );
      }

      // Make HTTP request
      const response = await this.makeRequest(
        delivery.payload.url,
        delivery.payload.method,
        headers,
        delivery.payload.body,
        delivery.payload.timeout
      );

      const duration = Date.now() - startTime;

      // Record attempt
      const attempt: WebhookAttempt = {
        attemptNumber,
        timestamp: new Date(),
        responseStatus: response.status,
        responseBody: response.body,
        duration
      };

      delivery.attempts.push(attempt);

      // Check if successful
      if (response.status >= 200 && response.status < 300) {
        this.markAsSuccess(deliveryId);

        logger.info('Webhook delivered successfully', {
          deliveryId,
          webhookId: delivery.webhookId,
          attemptNumber,
          duration,
          status: response.status
        });

        this.emit('webhook.success', {
          deliveryId,
          webhookId: delivery.webhookId,
          attempt,
          totalAttempts: delivery.attempts.length
        });
      } else {
        // Check if should retry
        const retryConfig = delivery.payload.retryConfig || this.defaultRetryConfig;
        const shouldRetry = this.shouldRetry(response.status, retryConfig);

        if (shouldRetry && delivery.attempts.length < retryConfig.maxAttempts) {
          this.scheduleRetry(deliveryId, attemptNumber, retryConfig);

          logger.warn('Webhook delivery failed, scheduling retry', {
            deliveryId,
            webhookId: delivery.webhookId,
            attemptNumber,
            status: response.status,
            nextAttempt: attemptNumber + 1
          });

          this.emit('webhook.retry', {
            deliveryId,
            webhookId: delivery.webhookId,
            attempt,
            nextRetryAt: delivery.nextRetryAt
          });
        } else {
          this.markAsFailed(deliveryId);

          logger.error('Webhook delivery failed permanently', {
            deliveryId,
            webhookId: delivery.webhookId,
            attempts: delivery.attempts.length,
            lastStatus: response.status
          });

          this.emit('webhook.failed', {
            deliveryId,
            webhookId: delivery.webhookId,
            attempts: delivery.attempts,
            lastError: `HTTP ${response.status}`
          });
        }
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Record attempt
      const attempt: WebhookAttempt = {
        attemptNumber,
        timestamp: new Date(),
        error: errorMessage,
        duration
      };

      delivery.attempts.push(attempt);

      // Schedule retry
      const retryConfig = delivery.payload.retryConfig || this.defaultRetryConfig;
      if (delivery.attempts.length < retryConfig.maxAttempts) {
        this.scheduleRetry(deliveryId, attemptNumber, retryConfig);

        logger.warn('Webhook delivery error, scheduling retry', {
          deliveryId,
          webhookId: delivery.webhookId,
          attemptNumber,
          error: errorMessage,
          nextAttempt: attemptNumber + 1
        });

        this.emit('webhook.retry', {
          deliveryId,
          webhookId: delivery.webhookId,
          attempt,
          nextRetryAt: delivery.nextRetryAt
        });
      } else {
        this.markAsFailed(deliveryId);

        logger.error('Webhook delivery failed permanently', {
          deliveryId,
          webhookId: delivery.webhookId,
          attempts: delivery.attempts.length,
          error: errorMessage
        });

        this.emit('webhook.failed', {
          deliveryId,
          webhookId: delivery.webhookId,
          attempts: delivery.attempts,
          lastError: errorMessage
        });
      }
    }

    // Add to logs
    this.addToLogs(delivery);
  }

  /**
   * Make HTTP request
   */
  private async makeRequest(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: Record<string, unknown> | string,
    timeout = 30000
  ): Promise<{ status: number; body: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const options: RequestInit = {
        method,
        headers,
        signal: controller.signal
      };

      if (method !== 'GET' && body) {
        options.body = typeof body === 'string' ? body : JSON.stringify(body);
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      }

      const response = await fetch(url, options);
      const responseBody = await response.text();

      return {
        status: response.status,
        body: responseBody
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Add authentication headers
   */
  private addAuthHeaders(headers: Record<string, string>, auth?: WebhookAuth): void {
    if (!auth) return;

    switch (auth.type) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${auth.credentials.token}`;
        break;

      case 'basic':
        const basicAuth = Buffer.from(
          `${auth.credentials.username}:${auth.credentials.password}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${basicAuth}`;
        break;

      case 'apikey':
        const headerName = auth.credentials.headerName || 'X-API-Key';
        headers[headerName] = auth.credentials.apiKey;
        break;
    }
  }

  /**
   * Add webhook signature
   */
  private addSignature(
    headers: Record<string, string>,
    body: Record<string, unknown> | string,
    auth: WebhookAuth
  ): void {
    if (!auth.signatureSecret) return;

    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const signature = crypto
      .createHmac('sha256', auth.signatureSecret)
      .update(payload)
      .digest('hex');

    const headerName = auth.signatureHeader || 'X-Webhook-Signature';
    headers[headerName] = `sha256=${signature}`;
  }

  /**
   * Check if should retry
   */
  private shouldRetry(statusCode: number, retryConfig: RetryConfig): boolean {
    if (!retryConfig.retryableStatusCodes) {
      return statusCode >= 500;
    }

    return retryConfig.retryableStatusCodes.includes(statusCode);
  }

  /**
   * Schedule retry with exponential backoff
   */
  private scheduleRetry(
    deliveryId: string,
    attemptNumber: number,
    retryConfig: RetryConfig
  ): void {
    const delivery = this.deliveryQueue.get(deliveryId);
    if (!delivery) return;

    // Calculate delay with exponential backoff
    const delay = Math.min(
      retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attemptNumber - 1),
      retryConfig.maxDelay
    );

    delivery.nextRetryAt = new Date(Date.now() + delay);
    delivery.status = 'pending';

    logger.debug('Retry scheduled', {
      deliveryId,
      attemptNumber,
      delay,
      nextRetryAt: delivery.nextRetryAt
    });
  }

  /**
   * Mark delivery as success
   */
  private markAsSuccess(deliveryId: string): void {
    const delivery = this.deliveryQueue.get(deliveryId);
    if (!delivery) return;

    delivery.status = 'success';
    delivery.completedAt = new Date();

    // Remove from queue after a delay
    setTimeout(() => {
      this.deliveryQueue.delete(deliveryId);
    }, 60000); // Keep for 1 minute
  }

  /**
   * Mark delivery as failed
   */
  private markAsFailed(deliveryId: string): void {
    const delivery = this.deliveryQueue.get(deliveryId);
    if (!delivery) return;

    delivery.status = 'failed';
    delivery.completedAt = new Date();

    // Remove from queue after a delay
    setTimeout(() => {
      this.deliveryQueue.delete(deliveryId);
    }, 300000); // Keep for 5 minutes
  }

  /**
   * Cancel delivery
   */
  public cancelDelivery(deliveryId: string): boolean {
    const delivery = this.deliveryQueue.get(deliveryId);
    if (!delivery) return false;

    delivery.status = 'cancelled';
    delivery.completedAt = new Date();

    this.emit('webhook.cancelled', {
      deliveryId,
      webhookId: delivery.webhookId
    });

    logger.info('Webhook delivery cancelled', {
      deliveryId,
      webhookId: delivery.webhookId
    });

    return true;
  }

  /**
   * Add to logs
   */
  private addToLogs(delivery: WebhookDelivery): void {
    const log: WebhookLog = {
      deliveryId: delivery.id,
      webhookId: delivery.webhookId,
      url: delivery.payload.url,
      status: delivery.status,
      attempts: delivery.attempts.length,
      lastError: delivery.attempts[delivery.attempts.length - 1]?.error,
      createdAt: delivery.createdAt,
      completedAt: delivery.completedAt
    };

    this.webhookLogs.set(delivery.id, log);

    // Trim logs if exceeds max size
    if (this.webhookLogs.size > this.maxLogSize) {
      const excess = this.webhookLogs.size - this.maxLogSize;
      const keysToDelete = Array.from(this.webhookLogs.keys()).slice(0, excess);
      keysToDelete.forEach(key => this.webhookLogs.delete(key));
    }
  }

  /**
   * Get delivery status
   */
  public getDeliveryStatus(deliveryId: string): WebhookDelivery | undefined {
    return this.deliveryQueue.get(deliveryId);
  }

  /**
   * Get delivery logs
   */
  public getDeliveryLog(deliveryId: string): WebhookLog | undefined {
    return this.webhookLogs.get(deliveryId);
  }

  /**
   * Get all logs
   */
  public getAllLogs(): WebhookLog[] {
    return Array.from(this.webhookLogs.values());
  }

  /**
   * Get statistics
   */
  public getStats(): {
    queueSize: number;
    processing: number;
    successRate: number;
    totalDeliveries: number;
  } {
    const logs = Array.from(this.webhookLogs.values());
    const totalDeliveries = logs.length;
    const successfulDeliveries = logs.filter(log => log.status === 'success').length;

    return {
      queueSize: this.deliveryQueue.size,
      processing: this.processingQueue.size,
      successRate: totalDeliveries > 0 ? successfulDeliveries / totalDeliveries : 0,
      totalDeliveries
    };
  }

  /**
   * Generate delivery ID
   */
  private generateDeliveryId(): string {
    return `delivery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Shutdown service
   */
  public shutdown(): void {
    this.stop();
    this.deliveryQueue.clear();
    this.processingQueue.clear();
    this.removeAllListeners();

    logger.info('WebhookRetryService shutdown complete');
  }
}

// Singleton instance
let webhookRetryService: WebhookRetryService | null = null;

export function getWebhookRetryService(): WebhookRetryService {
  if (!webhookRetryService) {
    webhookRetryService = new WebhookRetryService();
    webhookRetryService.start();
  }
  return webhookRetryService;
}

export function initializeWebhookRetryService(): WebhookRetryService {
  if (!webhookRetryService) {
    webhookRetryService = new WebhookRetryService();
    webhookRetryService.start();
  }
  return webhookRetryService;
}

/**
 * DocuSign Webhook Handler
 * Handles webhook configuration, signature verification, and event processing
 */

import * as crypto from 'crypto';
import { logger } from '../../services/SimpleLogger';
import type { DocuSignConfig, EventNotification } from './types';

/**
 * Webhook event types
 */
export type WebhookEventType =
  | 'envelope-sent'
  | 'envelope-delivered'
  | 'envelope-completed'
  | 'envelope-declined'
  | 'envelope-voided'
  | 'recipient-sent'
  | 'recipient-delivered'
  | 'recipient-completed'
  | 'recipient-declined'
  | 'recipient-authenticationfailed';

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  event: string;
  apiVersion: string;
  uri: string;
  retryCount: number;
  configurationId: string;
  generatedDateTime: string;
  data: {
    accountId: string;
    userId: string;
    envelopeId: string;
    envelopeSummary?: {
      status: string;
      emailSubject: string;
      sentDateTime?: string;
      completedDateTime?: string;
      recipients?: any;
    };
  };
}

/**
 * Webhook handler callback type
 */
export type WebhookEventHandler = (payload: WebhookPayload) => Promise<void>;

/**
 * DocuSign Webhook Manager
 */
export class WebhookHandler {
  private config: DocuSignConfig;
  private eventNotification?: EventNotification;
  private hmacKey?: string;
  private eventHandlers: Map<string, WebhookEventHandler[]> = new Map();

  constructor(config: DocuSignConfig) {
    this.config = config;
  }

  /**
   * Configure webhook settings
   */
  public async configure(notification: EventNotification): Promise<void> {
    this.eventNotification = notification;
  }

  /**
   * Set HMAC key for signature verification
   */
  public setHmacKey(key: string): void {
    this.hmacKey = key;
  }

  /**
   * Verify webhook signature
   */
  public verifySignature(payload: any, signature: string): boolean {
    if (!this.hmacKey) {
      logger.warn('HMAC key not configured, skipping signature verification');
      return true;
    }

    try {
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const computedSignature = crypto
        .createHmac('sha256', this.hmacKey)
        .update(payloadString)
        .digest('base64');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature)
      );
    } catch (error) {
      logger.error('Error verifying webhook signature', error);
      return false;
    }
  }

  /**
   * Process incoming webhook event
   */
  public async processEvent(payload: WebhookPayload): Promise<void> {
    logger.debug('Processing DocuSign webhook:', { event: payload.event });

    // Get handlers for this event type
    const handlers = this.eventHandlers.get(payload.event) || [];
    const wildcardHandlers = this.eventHandlers.get('*') || [];

    // Execute all matching handlers
    const allHandlers = [...handlers, ...wildcardHandlers];
    for (const handler of allHandlers) {
      try {
        await handler(payload);
      } catch (error) {
        logger.error(`Error in webhook handler for ${payload.event}`, error);
      }
    }
  }

  /**
   * Register event handler
   */
  public on(event: string | '*', handler: WebhookEventHandler): void {
    const existing = this.eventHandlers.get(event) || [];
    this.eventHandlers.set(event, [...existing, handler]);
  }

  /**
   * Remove event handler
   */
  public off(event: string | '*', handler: WebhookEventHandler): void {
    const existing = this.eventHandlers.get(event) || [];
    this.eventHandlers.set(event, existing.filter(h => h !== handler));
  }

  /**
   * Create event notification configuration for an envelope
   */
  public createEventNotificationConfig(
    url: string,
    events: string[],
    options?: {
      includeDocuments?: boolean;
      includeEnvelopeVoidReason?: boolean;
      includeTimeZone?: boolean;
      includeDocumentFields?: boolean;
      requireAcknowledgment?: boolean;
      loggingEnabled?: boolean;
    }
  ): EventNotification {
    const envelopeEvents = events
      .filter(e => e.startsWith('envelope'))
      .map(e => ({
        envelopeEventStatusCode: e.replace('envelope-', ''),
        includeDocuments: options?.includeDocuments
      }));

    const recipientEvents = events
      .filter(e => e.startsWith('recipient'))
      .map(e => ({
        recipientEventStatusCode: e.replace('recipient-', ''),
        includeDocuments: options?.includeDocuments
      }));

    return {
      url,
      loggingEnabled: options?.loggingEnabled ?? true,
      requireAcknowledgment: options?.requireAcknowledgment ?? true,
      includeDocuments: options?.includeDocuments ?? false,
      includeEnvelopeVoidReason: options?.includeEnvelopeVoidReason ?? true,
      includeTimeZone: options?.includeTimeZone ?? true,
      includeDocumentFields: options?.includeDocumentFields ?? false,
      envelopeEvents,
      recipientEvents
    };
  }

  /**
   * Get current event notification configuration
   */
  public getEventNotification(): EventNotification | undefined {
    return this.eventNotification;
  }

  /**
   * Check if webhooks are enabled
   */
  public isEnabled(): boolean {
    return this.config.webhooksEnabled;
  }

  /**
   * Clear all event handlers
   */
  public clearHandlers(): void {
    this.eventHandlers.clear();
  }
}

/**
 * Rate Limiter for DocuSign API
 */
export class RateLimiter {
  private requests: number[] = [];
  private config: { maxRequests: number; windowMs: number };

  constructor(config: { maxRequests: number; windowMs: number }) {
    this.config = config;
  }

  /**
   * Check rate limit and wait if necessary
   */
  public async checkLimit(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.config.windowMs);

    if (this.requests.length >= this.config.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.config.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requests.push(now);
  }

  /**
   * Get current request count
   */
  public getRequestCount(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.config.windowMs);
    return this.requests.length;
  }

  /**
   * Get remaining requests in current window
   */
  public getRemainingRequests(): number {
    return Math.max(0, this.config.maxRequests - this.getRequestCount());
  }

  /**
   * Reset rate limiter
   */
  public reset(): void {
    this.requests = [];
  }
}

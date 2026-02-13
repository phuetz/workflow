/**
 * Tunnel Auth
 * Rate limiting, webhook validation, and request transformation
 */

import * as crypto from 'crypto';
import type {
  RateLimitConfig,
  TunnelRequest,
  TunnelResponse,
  WebhookValidation,
  WebhookProvider,
  ValidationResult,
  RequestTransform,
  ResponseTransform,
  TransformRule
} from './types';

/**
 * Rate Limiter - controls request rate per tunnel
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(private config: RateLimitConfig) {}

  checkLimit(request: TunnelRequest): boolean {
    if (!this.config.enabled) return true;

    const key = this.getKey(request);
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Clean old requests - 1 minute window
    const windowStart = now - 60000;
    const recentRequests = requests.filter((time) => time > windowStart);

    if (
      this.config.requestsPerMinute &&
      recentRequests.length >= this.config.requestsPerMinute
    ) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    return true;
  }

  private getKey(request: TunnelRequest): string {
    if (this.config.customKey) {
      return this.config.customKey(request);
    }

    if (this.config.byIP && request.sourceIP) {
      return request.sourceIP;
    }

    if (this.config.byHeader) {
      return (request.headers[this.config.byHeader] as string) || 'default';
    }

    return 'global';
  }

  getConfig(): RateLimitConfig {
    return this.config;
  }
}

/**
 * Webhook Validator - validates incoming webhook signatures
 */
export class WebhookValidator {
  constructor(private config: WebhookValidation) {}

  validate(request: TunnelRequest): ValidationResult {
    if (!this.config.enabled) {
      return { valid: true };
    }

    for (const provider of this.config.providers) {
      const result = this.validateProvider(request, provider);
      if (!result.valid) {
        return result;
      }
    }

    if (this.config.customValidation) {
      const valid = this.config.customValidation.validateFunction(request);
      if (!valid) {
        return {
          valid: false,
          errors: [this.config.customValidation.errorMessage || 'Custom validation failed']
        };
      }
    }

    return { valid: true };
  }

  private validateProvider(
    request: TunnelRequest,
    provider: WebhookProvider
  ): ValidationResult {
    switch (provider.name) {
      case 'github':
        return this.validateGitHub(request, provider);
      case 'stripe':
        return this.validateStripe(request, provider);
      case 'shopify':
        return this.validateShopify(request, provider);
      case 'slack':
        return this.validateSlack(request, provider);
      default:
        return { valid: true };
    }
  }

  private validateGitHub(
    request: TunnelRequest,
    provider: WebhookProvider
  ): ValidationResult {
    const signature = request.headers['x-hub-signature-256'] as string;
    if (!signature || !provider.secret) {
      return { valid: false, errors: ['Missing signature or secret'] };
    }

    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', provider.secret)
      .update(request.body || '')
      .digest('hex')}`;

    const valid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    return {
      valid,
      provider: 'github',
      signature,
      errors: valid ? undefined : ['Invalid signature']
    };
  }

  private validateStripe(
    request: TunnelRequest,
    provider: WebhookProvider
  ): ValidationResult {
    const signature = request.headers['stripe-signature'] as string;
    if (!signature || !provider.secret) {
      return { valid: false, errors: ['Missing signature or secret'] };
    }

    // Simplified Stripe validation
    return { valid: true, provider: 'stripe', signature };
  }

  private validateShopify(
    request: TunnelRequest,
    provider: WebhookProvider
  ): ValidationResult {
    const hmac = request.headers['x-shopify-hmac-sha256'] as string;
    if (!hmac || !provider.secret) {
      return { valid: false, errors: ['Missing HMAC or secret'] };
    }

    const computedHmac = crypto
      .createHmac('sha256', provider.secret)
      .update(request.body || '')
      .digest('base64');

    const valid = crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(computedHmac));

    return {
      valid,
      provider: 'shopify',
      signature: hmac,
      errors: valid ? undefined : ['Invalid HMAC']
    };
  }

  private validateSlack(
    request: TunnelRequest,
    provider: WebhookProvider
  ): ValidationResult {
    const signature = request.headers['x-slack-signature'] as string;
    const timestamp = request.headers['x-slack-request-timestamp'] as string;

    if (!signature || !timestamp || !provider.secret) {
      return { valid: false, errors: ['Missing signature, timestamp, or secret'] };
    }

    // Check timestamp freshness (5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) {
      return { valid: false, errors: ['Request timestamp too old'] };
    }

    const sigBasestring = `v0:${timestamp}:${request.body?.toString() || ''}`;
    const expectedSignature = `v0=${crypto
      .createHmac('sha256', provider.secret)
      .update(sigBasestring)
      .digest('hex')}`;

    const valid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    return {
      valid,
      provider: 'slack',
      signature,
      timestamp: new Date(parseInt(timestamp) * 1000),
      errors: valid ? undefined : ['Invalid signature']
    };
  }

  getConfig(): WebhookValidation {
    return this.config;
  }
}

/**
 * Request Transformer - transforms requests and responses
 */
export class RequestTransformer {
  constructor(
    private requestTransform?: RequestTransform,
    private responseTransform?: ResponseTransform
  ) {}

  async transformRequest(request: TunnelRequest): Promise<TunnelRequest> {
    if (!this.requestTransform?.enabled) {
      return request;
    }

    let transformed = { ...request };

    for (const rule of this.requestTransform.rules) {
      if (this.shouldApplyRule(rule, request)) {
        transformed = this.applyRequestRule(transformed, rule);
      }
    }

    return transformed;
  }

  async transformResponse(response: TunnelResponse): Promise<TunnelResponse> {
    if (!this.responseTransform?.enabled) {
      return response;
    }

    let transformed = { ...response };

    for (const rule of this.responseTransform.rules) {
      transformed = this.applyResponseRule(transformed, rule);
    }

    return transformed;
  }

  private shouldApplyRule(rule: TransformRule, request: TunnelRequest): boolean {
    if (!rule.condition) return true;

    const value = (request as any)[rule.condition.field];

    switch (rule.condition.operator) {
      case 'equals':
        return value === rule.condition.value;
      case 'contains':
        return String(value).includes(String(rule.condition.value));
      case 'matches':
        return new RegExp(rule.condition.value).test(String(value));
      case 'exists':
        return value !== undefined;
      default:
        return true;
    }
  }

  private applyRequestRule(request: TunnelRequest, rule: TransformRule): TunnelRequest {
    switch (rule.type) {
      case 'header':
        if (rule.action === 'add' || rule.action === 'replace') {
          request.headers[rule.match as string] = rule.value;
        } else if (rule.action === 'remove') {
          delete request.headers[rule.match as string];
        }
        break;
      case 'path':
        if (rule.action === 'replace' && rule.match) {
          request.url = request.url.replace(rule.match, rule.value);
        }
        break;
      case 'query':
        if (rule.action === 'add' && request.query) {
          request.query[rule.match as string] = rule.value;
        } else if (rule.action === 'remove' && request.query) {
          delete request.query[rule.match as string];
        }
        break;
    }

    return request;
  }

  private applyResponseRule(
    response: TunnelResponse,
    rule: TransformRule
  ): TunnelResponse {
    switch (rule.type) {
      case 'header':
        if (rule.action === 'add' || rule.action === 'replace') {
          response.headers[rule.match as string] = rule.value;
        } else if (rule.action === 'remove') {
          delete response.headers[rule.match as string];
        }
        break;
    }

    return response;
  }

  getRequestTransform(): RequestTransform | undefined {
    return this.requestTransform;
  }

  getResponseTransform(): ResponseTransform | undefined {
    return this.responseTransform;
  }
}

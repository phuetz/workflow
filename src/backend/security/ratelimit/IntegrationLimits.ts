/**
 * Integration-specific Rate Limits
 * Based on real API documentation for n8n parity
 */

import { logger } from '../../../services/SimpleLogger';
import type { RateLimitConfig, RateLimitResult } from './types';
import { RateLimitService } from './index';

/**
 * Integration-specific rate limits based on real API documentation
 */
export const INTEGRATION_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Communication
  'slack': { windowMs: 1000, maxRequests: 1, strategy: 'token-bucket' },
  'slack:web_api': { windowMs: 60 * 1000, maxRequests: 50, strategy: 'sliding-window' },
  'slack:events': { windowMs: 60 * 1000, maxRequests: 30000, strategy: 'sliding-window' },
  'discord': { windowMs: 1000, maxRequests: 50, strategy: 'token-bucket' },
  'discord:messages': { windowMs: 1000, maxRequests: 5, strategy: 'token-bucket' },
  'telegram': { windowMs: 1000, maxRequests: 30, strategy: 'token-bucket' },
  'twilio:sms': { windowMs: 1000, maxRequests: 1, strategy: 'fixed-window' },
  'twilio:voice': { windowMs: 1000, maxRequests: 1, strategy: 'fixed-window' },

  // Email
  'sendgrid': { windowMs: 60 * 1000, maxRequests: 600, strategy: 'sliding-window' },
  'mailchimp': { windowMs: 1000, maxRequests: 10, strategy: 'token-bucket' },
  'mailgun': { windowMs: 60 * 1000, maxRequests: 300, strategy: 'sliding-window' },

  // Code & DevOps
  'github': { windowMs: 60 * 60 * 1000, maxRequests: 5000, strategy: 'sliding-window' },
  'github:search': { windowMs: 60 * 1000, maxRequests: 30, strategy: 'fixed-window' },
  'github:graphql': { windowMs: 60 * 60 * 1000, maxRequests: 5000, strategy: 'sliding-window' },
  'gitlab': { windowMs: 60 * 1000, maxRequests: 300, strategy: 'sliding-window' },
  'bitbucket': { windowMs: 60 * 60 * 1000, maxRequests: 1000, strategy: 'sliding-window' },
  'jira': { windowMs: 60 * 1000, maxRequests: 50, strategy: 'sliding-window' },

  // AI/ML
  'openai': { windowMs: 60 * 1000, maxRequests: 60, strategy: 'token-bucket' },
  'openai:gpt4': { windowMs: 60 * 1000, maxRequests: 10, strategy: 'token-bucket' },
  'openai:gpt35': { windowMs: 60 * 1000, maxRequests: 60, strategy: 'token-bucket' },
  'openai:embeddings': { windowMs: 60 * 1000, maxRequests: 3000, strategy: 'token-bucket' },
  'anthropic': { windowMs: 60 * 1000, maxRequests: 60, strategy: 'token-bucket' },
  'anthropic:claude3': { windowMs: 60 * 1000, maxRequests: 50, strategy: 'token-bucket' },
  'google_ai': { windowMs: 60 * 1000, maxRequests: 60, strategy: 'token-bucket' },
  'azure_openai': { windowMs: 60 * 1000, maxRequests: 120, strategy: 'token-bucket' },
  'huggingface': { windowMs: 60 * 60 * 1000, maxRequests: 30000, strategy: 'sliding-window' },

  // Databases
  'airtable': { windowMs: 1000, maxRequests: 5, strategy: 'token-bucket' },
  'notion': { windowMs: 1000, maxRequests: 3, strategy: 'token-bucket' },
  'supabase': { windowMs: 1000, maxRequests: 100, strategy: 'token-bucket' },
  'firebase': { windowMs: 60 * 1000, maxRequests: 500, strategy: 'sliding-window' },
  'mongodb_atlas': { windowMs: 60 * 1000, maxRequests: 100, strategy: 'sliding-window' },

  // Payment
  'stripe': { windowMs: 1000, maxRequests: 25, strategy: 'token-bucket' },
  'stripe:test': { windowMs: 1000, maxRequests: 100, strategy: 'token-bucket' },
  'paypal': { windowMs: 60 * 1000, maxRequests: 100, strategy: 'sliding-window' },
  'square': { windowMs: 60 * 1000, maxRequests: 100, strategy: 'sliding-window' },

  // Cloud Storage
  'aws_s3': { windowMs: 1000, maxRequests: 3500, strategy: 'token-bucket' },
  'aws_s3:get': { windowMs: 1000, maxRequests: 5500, strategy: 'token-bucket' },
  'google_drive': { windowMs: 100 * 1000, maxRequests: 20000, strategy: 'sliding-window' },
  'dropbox': { windowMs: 60 * 60 * 1000, maxRequests: 1000, strategy: 'sliding-window' },
  'onedrive': { windowMs: 60 * 1000, maxRequests: 600, strategy: 'sliding-window' },

  // CRM
  'salesforce': { windowMs: 24 * 60 * 60 * 1000, maxRequests: 15000, strategy: 'sliding-window' },
  'salesforce:bulk': { windowMs: 24 * 60 * 60 * 1000, maxRequests: 10000, strategy: 'sliding-window' },
  'hubspot': { windowMs: 10 * 1000, maxRequests: 100, strategy: 'fixed-window' },
  'hubspot:search': { windowMs: 1000, maxRequests: 4, strategy: 'token-bucket' },
  'pipedrive': { windowMs: 2 * 1000, maxRequests: 10, strategy: 'token-bucket' },
  'zoho_crm': { windowMs: 60 * 1000, maxRequests: 100, strategy: 'sliding-window' },

  // Social Media
  'twitter': { windowMs: 15 * 60 * 1000, maxRequests: 100, strategy: 'fixed-window' },
  'twitter:post': { windowMs: 15 * 60 * 1000, maxRequests: 25, strategy: 'fixed-window' },
  'linkedin': { windowMs: 24 * 60 * 60 * 1000, maxRequests: 100, strategy: 'fixed-window' },
  'facebook': { windowMs: 60 * 60 * 1000, maxRequests: 200, strategy: 'sliding-window' },
  'instagram': { windowMs: 60 * 60 * 1000, maxRequests: 200, strategy: 'sliding-window' },

  // Analytics & Monitoring
  'google_analytics': { windowMs: 100 * 1000, maxRequests: 100, strategy: 'fixed-window' },
  'datadog': { windowMs: 60 * 1000, maxRequests: 1000, strategy: 'sliding-window' },
  'sentry': { windowMs: 60 * 1000, maxRequests: 100, strategy: 'sliding-window' },
  'mixpanel': { windowMs: 60 * 1000, maxRequests: 60, strategy: 'sliding-window' },

  // Project Management
  'asana': { windowMs: 60 * 1000, maxRequests: 1500, strategy: 'sliding-window' },
  'trello': { windowMs: 10 * 1000, maxRequests: 100, strategy: 'fixed-window' },
  'monday': { windowMs: 60 * 1000, maxRequests: 5000, strategy: 'sliding-window' },
  'clickup': { windowMs: 60 * 1000, maxRequests: 100, strategy: 'sliding-window' },
  'linear': { windowMs: 60 * 60 * 1000, maxRequests: 6000, strategy: 'sliding-window' },

  // E-commerce
  'shopify': { windowMs: 1000, maxRequests: 4, strategy: 'token-bucket' },
  'shopify:graphql': { windowMs: 1000, maxRequests: 50, strategy: 'token-bucket' },
  'woocommerce': { windowMs: 60 * 1000, maxRequests: 120, strategy: 'sliding-window' },
  'magento': { windowMs: 60 * 1000, maxRequests: 100, strategy: 'sliding-window' },

  // Generic/Other
  'http_request': { windowMs: 1000, maxRequests: 100, strategy: 'token-bucket' },
  'webhook:outgoing': { windowMs: 1000, maxRequests: 50, strategy: 'token-bucket' },
  'graphql': { windowMs: 60 * 1000, maxRequests: 100, strategy: 'sliding-window' }
};

/**
 * Extended RateLimitService with integration-specific limits
 */
export class IntegrationRateLimiter extends RateLimitService {
  private integrationLimits: Map<string, RateLimitConfig> = new Map();

  constructor() {
    super();
    this.initializeIntegrationLimits();
    logger.info('IntegrationRateLimiter initialized with', {
      integrationCount: Object.keys(INTEGRATION_RATE_LIMITS).length
    });
  }

  private initializeIntegrationLimits(): void {
    for (const [integration, config] of Object.entries(INTEGRATION_RATE_LIMITS)) {
      this.integrationLimits.set(integration, config);
    }
  }

  /**
   * Check rate limit for a specific integration
   */
  async checkIntegrationLimit(
    integration: string,
    userId: string,
    endpoint?: string
  ): Promise<RateLimitResult> {
    const specificKey = endpoint ? `${integration}:${endpoint}` : integration;
    const config = this.integrationLimits.get(specificKey)
      || this.integrationLimits.get(integration)
      || INTEGRATION_RATE_LIMITS['http_request'];

    const key = `integration:${integration}:${userId}${endpoint ? `:${endpoint}` : ''}`;
    return this.checkLimit(key, config);
  }

  /**
   * Get rate limit configuration for an integration
   */
  getIntegrationConfig(integration: string): RateLimitConfig | undefined {
    return this.integrationLimits.get(integration);
  }

  /**
   * Override rate limit for an integration
   */
  setIntegrationLimit(integration: string, config: RateLimitConfig): void {
    this.integrationLimits.set(integration, config);
    logger.info('Custom integration rate limit set', { integration, config });
  }

  /**
   * Get all integration rate limits
   */
  getIntegrationLimits(): Record<string, RateLimitConfig> {
    const limits: Record<string, RateLimitConfig> = {};
    for (const [key, value] of this.integrationLimits.entries()) {
      limits[key] = value;
    }
    return limits;
  }

  /**
   * Calculate optimal request delay for an integration
   */
  calculateRequestDelay(integration: string): number {
    const config = this.integrationLimits.get(integration);
    if (!config) return 0;
    return Math.ceil(config.windowMs / config.maxRequests);
  }

  /**
   * Get recommended batch size for an integration
   */
  getRecommendedBatchSize(integration: string): number {
    const config = this.integrationLimits.get(integration);
    if (!config) return 10;

    if (config.strategy === 'token-bucket') {
      return Math.min(config.maxRequests, 50);
    }
    return Math.min(Math.floor(config.maxRequests / 10), 20);
  }
}

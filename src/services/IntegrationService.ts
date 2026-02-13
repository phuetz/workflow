/**
 * Integration Service
 * Manages 100+ integrations with external services and APIs
 */

import { EventEmitter } from 'events';
import { logger } from './SimpleLogger';
import { cacheLayer } from './CacheLayer';
import monitoringService from './MonitoringService';
import { telemetryService } from './OpenTelemetryService';

interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  status: 'active' | 'inactive' | 'deprecated' | 'maintenance';
  config: IntegrationConfig;
  methods: IntegrationMethod[];
  webhooks: WebhookConfig[];
  rateLimit: RateLimitConfig;
  authentication: AuthConfig;
  metadata: Record<string, unknown>;
}

interface IntegrationConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  cacheTtl?: number;
  requiresAuth?: boolean;
  sandbox?: boolean;
  customHeaders?: Record<string, string>;
}

interface IntegrationMethod {
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  parameters: Parameter[];
  response: ResponseSchema;
  examples: Example[];
}

interface Parameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  default?: unknown;
  validation?: string;
}

interface ResponseSchema {
  type: string;
  properties: Record<string, unknown>;
  examples: unknown[];
}

interface Example {
  name: string;
  description: string;
  request: unknown;
  response: unknown;
}

interface WebhookConfig {
  event: string;
  url: string;
  secret?: string;
  headers?: Record<string, string>;
  retries?: number;
}

interface RateLimitConfig {
  requests: number;
  window: number; // seconds
  strategy: 'fixed' | 'sliding' | 'token-bucket';
}

interface AuthConfig {
  type: 'api-key' | 'oauth2' | 'jwt' | 'basic' | 'custom';
  config: Record<string, unknown>;
}

interface Span {
  setStatus(status: { code: number; message?: string }): void;
  end(): void;
  recordException(error: Error): void;
}

interface IntegrationExecution {
  id: string;
  integrationId: string;
  method: string;
  parameters: Record<string, unknown>;
  response?: unknown;
  error?: string;
  duration: number;
  timestamp: Date;
  userId?: string;
}

export class IntegrationService extends EventEmitter {
  private static instance: IntegrationService;
  private integrations: Map<string, Integration> = new Map();
  private executionHistory: IntegrationExecution[] = [];
  private rateLimiters: Map<string, {
    requests: number[];
    tokens: number;
    lastRefill: number;
  }> = new Map();

  private constructor() {
    super();
    this.initializeIntegrations();
  }

  public static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  private initializeIntegrations(): void {
    // Cloud Platforms
    this.registerCloudIntegrations();

    // Communication
    this.registerCommunicationIntegrations();

    // Databases
    this.registerDatabaseIntegrations();

    // Development Tools
    this.registerDevelopmentIntegrations();

    // Marketing & Sales
    this.registerMarketingIntegrations();

    // Finance & Accounting
    this.registerFinanceIntegrations();

    // AI & ML
    this.registerAIMLIntegrations();

    // Productivity
    this.registerProductivityIntegrations();

    // E-commerce
    this.registerEcommerceIntegrations();

    // Social Media
    this.registerSocialMediaIntegrations();

    logger.info(`🔌 Initialized ${this.integrations.size} integrations`);
  }

  private registerCloudIntegrations(): void {
    const cloudIntegrations: Partial<Integration>[] = [
      {
        id: 'aws-s3',
        name: 'Amazon S3',
        category: 'cloud-storage',
        description: 'Amazon Simple Storage Service',
        config: { baseUrl: 'https://s3.amazonaws.com' },
        methods: [
          {
            name: 'upload_file',
            description: 'Upload file to S3 bucket',
            method: 'PUT',
            endpoint: '/{bucket}/{key}',
            parameters: [
              { name: 'bucket', type: 'string', required: true, description: 'S3 bucket name' },
              { name: 'key', type: 'string', required: true, description: 'Object key' },
              { name: 'body', type: 'object', required: true, description: 'File content' }
            ],
            response: { type: 'object', properties: {}, examples: [] },
            examples: []
          }
        ]
      },
      {
        id: 'gcp-cloud-storage',
        name: 'Google Cloud Storage',
        category: 'cloud-storage',
        description: 'Google Cloud Platform Storage Service',
        config: { baseUrl: 'https://storage.googleapis.com' }
      },
      {
        id: 'azure-blob',
        name: 'Azure Blob Storage',
        category: 'cloud-storage',
        description: 'Microsoft Azure Blob Storage',
        config: { baseUrl: 'https://[account].blob.core.windows.net' }
      }
    ];

    this.registerIntegrations(cloudIntegrations);
  }

  private registerCommunicationIntegrations(): void {
    const communicationIntegrations: Partial<Integration>[] = [
      {
        id: 'slack',
        name: 'Slack',
        category: 'communication',
        description: 'Team communication platform',
        config: { baseUrl: 'https://slack.com/api' },
        methods: [
          {
            name: 'send_message',
            description: 'Send message to Slack channel',
            method: 'POST',
            endpoint: '/chat.postMessage',
            parameters: [
              { name: 'channel', type: 'string', required: true, description: 'Channel ID' },
              { name: 'text', type: 'string', required: true, description: 'Message text' }
            ],
            response: { type: 'object', properties: {}, examples: [] },
            examples: []
          }
        ]
      },
      {
        id: 'discord',
        name: 'Discord',
        category: 'communication',
        description: 'Voice and text communication platform',
        config: { baseUrl: 'https://discord.com/api' }
      },
      {
        id: 'microsoft-teams',
        name: 'Microsoft Teams',
        category: 'communication',
        description: 'Microsoft Teams collaboration platform',
        config: { baseUrl: 'https://graph.microsoft.com' }
      },
      {
        id: 'telegram',
        name: 'Telegram Bot API',
        category: 'communication',
        description: 'Telegram messaging platform',
        config: { baseUrl: 'https://api.telegram.org' }
      },
      {
        id: 'whatsapp-business',
        name: 'WhatsApp Business API',
        category: 'communication',
        description: 'WhatsApp Business messaging',
        config: { baseUrl: 'https://graph.facebook.com' }
      }
    ];

    this.registerIntegrations(communicationIntegrations);
  }

  private registerDatabaseIntegrations(): void {
    const databaseIntegrations: Partial<Integration>[] = [
      {
        id: 'postgresql',
        name: 'PostgreSQL',
        category: 'database',
        description: 'PostgreSQL database',
        config: { baseUrl: 'postgresql://localhost:5432' }
      },
      {
        id: 'mysql',
        name: 'MySQL',
        category: 'database',
        description: 'MySQL database',
        config: { baseUrl: 'mysql://localhost:3306' }
      },
      {
        id: 'mongodb',
        name: 'MongoDB',
        category: 'database',
        description: 'MongoDB NoSQL database',
        config: { baseUrl: 'mongodb://localhost:27017' }
      },
      {
        id: 'redis',
        name: 'Redis',
        category: 'database',
        description: 'Redis in-memory database',
        config: { baseUrl: 'redis://localhost:6379' }
      },
      {
        id: 'elasticsearch',
        name: 'Elasticsearch',
        category: 'database',
        description: 'Elasticsearch search engine',
        config: { baseUrl: 'http://localhost:9200' }
      }
    ];

    this.registerIntegrations(databaseIntegrations);
  }

  private registerDevelopmentIntegrations(): void {
    const developmentIntegrations: Partial<Integration>[] = [
      {
        id: 'github',
        name: 'GitHub',
        category: 'development',
        description: 'GitHub code repository platform',
        config: { baseUrl: 'https://api.github.com' }
      },
      {
        id: 'gitlab',
        name: 'GitLab',
        category: 'development',
        description: 'GitLab DevOps platform',
        config: { baseUrl: 'https://gitlab.com/api/v4' }
      },
      {
        id: 'bitbucket',
        name: 'Bitbucket',
        category: 'development',
        description: 'Atlassian Bitbucket',
        config: { baseUrl: 'https://api.bitbucket.org/2.0' }
      },
      {
        id: 'jira',
        name: 'Jira',
        category: 'development',
        description: 'Atlassian Jira project management',
        config: { baseUrl: 'https://[domain].atlassian.net/rest/api/3' }
      },
      {
        id: 'jenkins',
        name: 'Jenkins',
        category: 'development',
        description: 'Jenkins automation server',
        config: { baseUrl: 'http://localhost:8080' }
      }
    ];

    this.registerIntegrations(developmentIntegrations);
  }

  private registerMarketingIntegrations(): void {
    const marketingIntegrations: Partial<Integration>[] = [
      {
        id: 'mailchimp',
        name: 'Mailchimp',
        category: 'marketing',
        description: 'Email marketing platform',
        config: { baseUrl: 'https://[dc].api.mailchimp.com/3.0' }
      },
      {
        id: 'hubspot',
        name: 'HubSpot',
        category: 'marketing',
        description: 'CRM and marketing automation',
        config: { baseUrl: 'https://api.hubapi.com' }
      },
      {
        id: 'salesforce',
        name: 'Salesforce',
        category: 'marketing',
        description: 'Salesforce CRM platform',
        config: { baseUrl: 'https://[instance].salesforce.com/services/data/v57.0' }
      },
      {
        id: 'google-analytics',
        name: 'Google Analytics',
        category: 'marketing',
        description: 'Google Analytics tracking',
        config: { baseUrl: 'https://www.googleapis.com/analytics/v3' }
      },
      {
        id: 'facebook-ads',
        name: 'Facebook Ads',
        category: 'marketing',
        description: 'Facebook advertising platform',
        config: { baseUrl: 'https://graph.facebook.com' }
      }
    ];

    this.registerIntegrations(marketingIntegrations);
  }

  private registerFinanceIntegrations(): void {
    const financeIntegrations: Partial<Integration>[] = [
      {
        id: 'stripe',
        name: 'Stripe',
        category: 'finance',
        description: 'Stripe payment processing',
        config: { baseUrl: 'https://api.stripe.com/v1' }
      },
      {
        id: 'paypal',
        name: 'PayPal',
        category: 'finance',
        description: 'PayPal payment platform',
        config: { baseUrl: 'https://api.paypal.com' }
      },
      {
        id: 'quickbooks',
        name: 'QuickBooks',
        category: 'finance',
        description: 'Intuit QuickBooks accounting',
        config: { baseUrl: 'https://sandbox-quickbooks.api.intuit.com' }
      },
      {
        id: 'xero',
        name: 'Xero',
        category: 'finance',
        description: 'Xero accounting software',
        config: { baseUrl: 'https://api.xero.com/api.xro/2.0' }
      },
      {
        id: 'plaid',
        name: 'Plaid',
        category: 'finance',
        description: 'Financial data API',
        config: { baseUrl: 'https://production.plaid.com' }
      }
    ];

    this.registerIntegrations(financeIntegrations);
  }

  private registerAIMLIntegrations(): void {
    const aimlIntegrations: Partial<Integration>[] = [
      {
        id: 'openai',
        name: 'OpenAI',
        category: 'ai-ml',
        description: 'OpenAI API for GPT and other models',
        config: { baseUrl: 'https://api.openai.com/v1' }
      },
      {
        id: 'anthropic',
        name: 'Anthropic Claude',
        category: 'ai-ml',
        description: 'Anthropic Claude AI assistant',
        config: { baseUrl: 'https://api.anthropic.com' }
      },
      {
        id: 'google-ai',
        name: 'Google AI Platform',
        category: 'ai-ml',
        description: 'Google Cloud AI services',
        config: { baseUrl: 'https://ml.googleapis.com' }
      },
      {
        id: 'azure-cognitive',
        name: 'Azure Cognitive Services',
        category: 'ai-ml',
        description: 'Microsoft Azure AI services',
        config: { baseUrl: 'https://[region].api.cognitive.microsoft.com' }
      },
      {
        id: 'hugging-face',
        name: 'Hugging Face',
        category: 'ai-ml',
        description: 'Hugging Face model hub',
        config: { baseUrl: 'https://api-inference.huggingface.co' }
      }
    ];

    this.registerIntegrations(aimlIntegrations);
  }

  private registerProductivityIntegrations(): void {
    const productivityIntegrations: Partial<Integration>[] = [
      {
        id: 'google-workspace',
        name: 'Google Workspace',
        category: 'productivity',
        description: 'Google Workspace suite',
        config: { baseUrl: 'https://www.googleapis.com' }
      },
      {
        id: 'microsoft-365',
        name: 'Microsoft 365',
        category: 'productivity',
        description: 'Microsoft 365 suite',
        config: { baseUrl: 'https://graph.microsoft.com' }
      },
      {
        id: 'notion',
        name: 'Notion',
        category: 'productivity',
        description: 'Notion workspace',
        config: { baseUrl: 'https://api.notion.com/v1' }
      },
      {
        id: 'airtable',
        name: 'Airtable',
        category: 'productivity',
        description: 'Airtable database platform',
        config: { baseUrl: 'https://api.airtable.com/v0' }
      },
      {
        id: 'trello',
        name: 'Trello',
        category: 'productivity',
        description: 'Trello project management',
        config: { baseUrl: 'https://api.trello.com/1' }
      }
    ];

    this.registerIntegrations(productivityIntegrations);
  }

  private registerEcommerceIntegrations(): void {
    const ecommerceIntegrations: Partial<Integration>[] = [
      {
        id: 'shopify',
        name: 'Shopify',
        category: 'ecommerce',
        description: 'Shopify e-commerce platform',
        config: { baseUrl: 'https://[shop].myshopify.com/admin/api/2023-10' }
      },
      {
        id: 'woocommerce',
        name: 'WooCommerce',
        category: 'ecommerce',
        description: 'WooCommerce WordPress plugin',
        config: { baseUrl: 'https://[site]/wp-json/wc/v3' }
      },
      {
        id: 'magento',
        name: 'Magento',
        category: 'ecommerce',
        description: 'Magento e-commerce platform',
        config: { baseUrl: 'https://[site]/rest/V1' }
      },
      {
        id: 'bigcommerce',
        name: 'BigCommerce',
        category: 'ecommerce',
        description: 'BigCommerce platform',
        config: { baseUrl: 'https://api.bigcommerce.com/stores/[hash]/v3' }
      }
    ];

    this.registerIntegrations(ecommerceIntegrations);
  }

  private registerSocialMediaIntegrations(): void {
    const socialMediaIntegrations: Partial<Integration>[] = [
      {
        id: 'twitter',
        name: 'Twitter/X',
        category: 'social-media',
        description: 'Twitter/X social media platform',
        config: { baseUrl: 'https://api.twitter.com/2' }
      },
      {
        id: 'facebook',
        name: 'Facebook',
        category: 'social-media',
        description: 'Facebook social platform',
        config: { baseUrl: 'https://graph.facebook.com' }
      },
      {
        id: 'instagram',
        name: 'Instagram',
        category: 'social-media',
        description: 'Instagram photo sharing',
        config: { baseUrl: 'https://graph.instagram.com' }
      },
      {
        id: 'linkedin',
        name: 'LinkedIn',
        category: 'social-media',
        description: 'LinkedIn professional network',
        config: { baseUrl: 'https://api.linkedin.com/v2' }
      },
      {
        id: 'youtube',
        name: 'YouTube',
        category: 'social-media',
        description: 'YouTube video platform',
        config: { baseUrl: 'https://www.googleapis.com/youtube/v3' }
      }
    ];

    this.registerIntegrations(socialMediaIntegrations);
  }

  private registerIntegrations(integrations: Partial<Integration>[]): void {
    for (const integration of integrations) {
      const fullIntegration: Integration = {
        id: integration.id || '',
        name: integration.name || '',
        category: integration.category || 'other',
        description: integration.description || '',
        version: '1.0.0',
        status: 'active',
        config: {
          timeout: 30000,
          retries: 3,
          cacheTtl: 300,
          requiresAuth: true,
          ...integration.config
        },
        methods: integration.methods || [],
        webhooks: [],
        rateLimit: {
          requests: 100,
          window: 60,
          strategy: 'sliding'
        },
        authentication: {
          type: 'api-key',
          config: {}
        },
        metadata: {}
      };

      this.integrations.set(fullIntegration.id, fullIntegration);
    }
  }

  /**
   * Execute integration method
   */
  public async execute(
    integrationId: string,
    methodName: string,
    parameters: Record<string, unknown>,
    options: {
      userId?: string;
      useCache?: boolean;
      timeout?: number;
    } = {}
  ): Promise<unknown> {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();
    const span = telemetryService.startSpan({
      operationName: `integration.${integrationId}.${methodName}`,
      tags: {
        'integration.id': integrationId,
        'integration.method': methodName,
        'user.id': options.userId
      }
    });

    try {
      // Get integration
      const integration = this.integrations.get(integrationId);
      if (!integration) {
        throw new Error(`Integration ${integrationId} not found`);
      }

      if (integration.status !== 'active') {
        throw new Error(`Integration ${integrationId} is not active`);
      }

      // Find method
      const method = integration.methods.find(m => m.name === methodName);
      if (!method) {
        throw new Error(`Method ${methodName} not found in integration ${integrationId}`);
      }

      // Check rate limits
      await this.checkRateLimit(integrationId, integration.rateLimit);

      // Check cache
      if (options.useCache !== false && method.method === 'GET') {
        const cacheKey = `integration:${integrationId}:${methodName}:${JSON.stringify(parameters)}`;
        const cached = await cacheLayer.get(cacheKey);
        if (cached) {
          this.recordExecution(executionId, integrationId, methodName, parameters, cached, null, Date.now() - startTime, options.userId);
          (span as Span | undefined)?.setStatus({ code: 1 }); // OK
          (span as Span | undefined)?.end();
          return cached;
        }
      }

      // Validate parameters
      this.validateParameters(method.parameters, parameters);

      // Execute the integration
      const result = await this.performRequest(integration, method, parameters, options);

      // Cache result if applicable
      if (options.useCache !== false && method.method === 'GET' && integration.config.cacheTtl) {
        const cacheKey = `integration:${integrationId}:${methodName}:${JSON.stringify(parameters)}`;
        await cacheLayer.set(cacheKey, result, {
          ttl: integration.config.cacheTtl,
          tags: [`integration:${integrationId}`]
        });
      }

      const duration = Date.now() - startTime;
      this.recordExecution(executionId, integrationId, methodName, parameters, result, null, duration, options.userId);

      // Record metrics
      monitoringService.recordMetric('integration.execution.success', 1, {
        integration: integrationId,
        method: methodName
      });
      monitoringService.recordMetric('integration.execution.duration', duration, {
        integration: integrationId,
        method: methodName
      });

      (span as Span | undefined)?.setStatus({ code: 1 }); // OK
      (span as Span | undefined)?.end();

      this.emit('execution_success', {
        executionId,
        integrationId,
        methodName,
        duration,
        userId: options.userId
      });

      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.recordExecution(executionId, integrationId, methodName, parameters, null, error.message, duration, options.userId);

      // Record error metrics
      monitoringService.recordMetric('integration.execution.error', 1, {
        integration: integrationId,
        method: methodName,
        error: error.message
      });

      (span as Span | undefined)?.setStatus({ code: 2, message: error.message }); // ERROR
      (span as Span | undefined)?.recordException(error);
      (span as Span | undefined)?.end();

      this.emit('execution_error', {
        executionId,
        integrationId,
        methodName,
        error: error.message,
        duration,
        userId: options.userId
      });

      throw error;
    }
  }

  private async performRequest(
    integration: Integration,
    method: IntegrationMethod,
    parameters: Record<string, unknown>,
    options: any
  ): Promise<unknown> {
    // Build URL
    let endpoint = method.endpoint;
    for (const [key, value] of Object.entries(parameters)) {
      endpoint = endpoint.replace(`{${key}}`, encodeURIComponent(String(value)));
    }

    const url = `${integration.config.baseUrl || ''}${endpoint}`;

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Workflow-Platform/1.0',
      ...integration.config.customHeaders
    };

    // Add authentication
    if (integration.config.requiresAuth) {
      // This would be implemented based on the auth type
      // For now, just a placeholder
      headers['Authorization'] = 'Bearer [TOKEN]';
    }

    // Build request options
    const requestOptions: RequestInit = {
      method: method.method,
      headers,
      signal: AbortSignal.timeout(options.timeout || integration.config.timeout || 30000)
    };

    // Add body for non-GET requests
    if (method.method !== 'GET' && method.method !== 'DELETE') {
      // Remove URL parameters from body
      const bodyParams = { ...parameters };
      for (const param of method.parameters) {
        if (method.endpoint.includes(`{${param.name}}`)) {
          delete bodyParams[param.name];
        }
      }
      requestOptions.body = JSON.stringify(bodyParams);
    }

    // Make request with retries
    let lastError: any;
    const maxRetries = integration.config.retries || 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          return await response.text();
        }

      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  private validateParameters(methodParams: Parameter[], providedParams: Record<string, unknown>): void {
    for (const param of methodParams) {
      if (param.required && !(param.name in providedParams)) {
        throw new Error(`Required parameter '${param.name}' is missing`);
      }

      if (param.name in providedParams) {
        const value = providedParams[param.name];

        // Type validation
        if (param.type === 'string' && typeof value !== 'string') {
          throw new Error(`Parameter '${param.name}' must be a string`);
        }
        if (param.type === 'number' && typeof value !== 'number') {
          throw new Error(`Parameter '${param.name}' must be a number`);
        }
        if (param.type === 'boolean' && typeof value !== 'boolean') {
          throw new Error(`Parameter '${param.name}' must be a boolean`);
        }
        if (param.type === 'object' && typeof value !== 'object') {
          throw new Error(`Parameter '${param.name}' must be an object`);
        }
        if (param.type === 'array' && !Array.isArray(value)) {
          throw new Error(`Parameter '${param.name}' must be an array`);
        }

        // Custom validation
        if (param.validation) {
          const regex = new RegExp(param.validation);
          if (!regex.test(String(value))) {
            throw new Error(`Parameter '${param.name}' does not match required format`);
          }
        }
      }
    }
  }

  private async checkRateLimit(integrationId: string, rateLimit: RateLimitConfig): Promise<void> {
    const now = Date.now();
    const key = integrationId;

    if (!this.rateLimiters.has(key)) {
      this.rateLimiters.set(key, {
        requests: [],
        tokens: rateLimit.requests,
        lastRefill: now
      });
    }

    const limiter = this.rateLimiters.get(key)!;
    const windowMs = rateLimit.window * 1000;

    switch (rateLimit.strategy) {
      case 'fixed': {
        // Fixed window rate limiting
        const windowStart = Math.floor(now / windowMs) * windowMs;
        limiter.requests = limiter.requests.filter(timestamp => timestamp >= windowStart);

        if (limiter.requests.length >= rateLimit.requests) {
          throw new Error(`Rate limit exceeded for integration ${integrationId}`);
        }

        limiter.requests.push(now);
        break;
      }

      case 'sliding': {
        // Sliding window rate limiting
        limiter.requests = limiter.requests.filter(timestamp => timestamp > now - windowMs);

        if (limiter.requests.length >= rateLimit.requests) {
          throw new Error(`Rate limit exceeded for integration ${integrationId}`);
        }

        limiter.requests.push(now);
        break;
      }

      case 'token-bucket': {
        // Token bucket rate limiting
        const elapsed = now - limiter.lastRefill;
        const tokensToAdd = (elapsed / windowMs) * rateLimit.requests;

        limiter.tokens = Math.min(rateLimit.requests, limiter.tokens + tokensToAdd);
        limiter.lastRefill = now;

        if (limiter.tokens < 1) {
          throw new Error(`Rate limit exceeded for integration ${integrationId}`);
        }

        limiter.tokens--;
        break;
      }
    }
  }

  private recordExecution(
    id: string,
    integrationId: string,
    method: string,
    parameters: Record<string, unknown>,
    response: unknown,
    error: string | null,
    duration: number,
    userId?: string
  ): void {
    const execution: IntegrationExecution = {
      id,
      integrationId,
      method,
      parameters,
      response,
      error,
      duration,
      timestamp: new Date(),
      userId
    };

    this.executionHistory.push(execution);

    // Keep only last 1000 executions
    if (this.executionHistory.length > 1000) {
      this.executionHistory.shift();
    }
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public API methods
   */

  public getIntegration(id: string): Integration | undefined {
    return this.integrations.get(id);
  }

  public getAllIntegrations(): Integration[] {
    return Array.from(this.integrations.values());
  }

  public getIntegrationsByCategory(category: string): Integration[] {
    return Array.from(this.integrations.values()).filter(i => i.category === category);
  }

  public getCategories(): string[] {
    const categories = new Set<string>();
    const integrationsArray = Array.from(this.integrations.values());
    for (const integration of integrationsArray) {
      categories.add(integration.category);
    }
    return Array.from(categories).sort();
  }

  public getExecutionHistory(integrationId?: string, limit = 100): IntegrationExecution[] {
    let history = this.executionHistory;

    if (integrationId) {
      history = history.filter(e => e.integrationId === integrationId);
    }

    return history.slice(-limit).reverse();
  }

  public getIntegrationStats(integrationId: string): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageResponseTime: number;
    lastExecution?: Date;
  } {
    const executions = this.executionHistory.filter(e => e.integrationId === integrationId);
    const successful = executions.filter(e => !e.error);
    const failed = executions.filter(e => e.error);
    const averageResponseTime = executions.length > 0
      ? executions.reduce((sum, e) => sum + e.duration, 0) / executions.length
      : 0;
    const lastExecution = executions.length > 0
      ? executions[executions.length - 1].timestamp
      : undefined;

    return {
      totalExecutions: executions.length,
      successfulExecutions: successful.length,
      failedExecutions: failed.length,
      averageResponseTime: Math.round(averageResponseTime),
      lastExecution
    };
  }

  public async testIntegration(integrationId: string): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const integration = this.integrations.get(integrationId);
      if (!integration) {
        throw new Error(`Integration ${integrationId} not found`);
      }

      // Try to make a simple health check or test call
      // This would be integration-specific
      const testMethod = integration.methods[0];

      if (testMethod) {
        await this.execute(integrationId, testMethod.name, {});
      } else {
        // Just test the base URL connectivity
        const response = await fetch(integration.config.baseUrl || '', {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      }

      return {
        success: true,
        responseTime: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Shutdown service
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down integration service...');

    this.removeAllListeners();
    this.executionHistory = [];
    this.rateLimiters.clear();

    logger.info('✅ Integration service shutdown complete');
  }
}

export const integrationService = IntegrationService.getInstance();

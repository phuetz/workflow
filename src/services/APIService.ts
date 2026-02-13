/**
 * API Service
 * Handles REST API access, authentication, rate limiting, and CLI support
 */

import { BaseService } from './BaseService';
import type {
  APIKey,
  APIService as IAPIService,
  CreateAPIKeyOptions,
  APIPermission,
  APIResource,
  APIAction,
  RateLimitResult,
  APIUsageStats,
  APIEndpoint,
  CLIConfig,
  CLIResult,
  WebhookEndpoint,
  WebhookEvent,
  APIActivity,
  HTTPMethod,
  QuotaUsage,
  EndpointUsage,
  DateRange
} from '../types/api';

export class APIService extends BaseService implements IAPIService {
  private static instance: APIService;
  private apiKeys: Map<string, APIKey> = new Map();
  private apiKeysByHash: Map<string, APIKey> = new Map();
  private rateLimitCounters: Map<string, QuotaUsage> = new Map();
  private webhooks: Map<string, WebhookEndpoint> = new Map();
  private activities: Map<string, APIActivity[]> = new Map();

  private constructor() {
    super('APIService');
    this.initializeDefaultEndpoints();
  }

  static getInstance(): APIService {
    if (!APIService.instance) {
      APIService.instance = new APIService();
    }
    return APIService.instance;
  }

  private initializeDefaultEndpoints() {
    // Initialize API documentation and endpoints
    this.logger.info('API Service initialized with default endpoints');
  }

  async createAPIKey(options: CreateAPIKeyOptions): Promise<APIKey> {
    const keyId = this.generateId();
    const keyPrefix = this.generateKeyPrefix();
    const secret = this.generateSecret();
    const rawKey = `${keyPrefix}.${secret}`;
    const hashedKey = this.hashKey(rawKey);
    
    const defaultRateLimits = {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      burstLimit: 10,
      quotaReset: 'hour' as const
    };

    const apiKey: APIKey = {
      id: keyId,
      name: options.name,
      keyPrefix,
      hashedKey,
      permissions: options.permissions,
      scopes: options.scopes,
      rateLimits: { ...defaultRateLimits, ...options.rateLimits },
      usage: {
        totalRequests: 0,
        requestsThisMonth: 0,
        requestsToday: 0,
        lastMonthRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        quotaUsage: this.initializeQuotaUsage(),
        topEndpoints: [],
        recentActivity: []
      },
      metadata: {
        createdBy: 'current-user', // Would get from user service
        description: options.description,
        environment: options.environment || 'development',
        application: options.name,
        tags: options.tags || [],
        allowedIPs: options.allowedIPs,
        allowedDomains: options.allowedDomains
      },
      createdAt: new Date(),
      isActive: true
    };

    if (options.expiresIn) {
      apiKey.expiresAt = new Date(Date.now() + options.expiresIn * 1000);
    }

    this.apiKeys.set(keyId, apiKey);
    this.apiKeysByHash.set(hashedKey, apiKey);
    this.initializeRateLimitCounters(keyId, apiKey.rateLimits);

    this.logger.info('API key created', { keyId, name: options.name, environment: options.environment });

    // Return the key with the actual key value (only time it's exposed)
    return { ...apiKey, hashedKey: rawKey };
  }

  async listAPIKeys(userId?: string): Promise<APIKey[]> {
    let keys = Array.from(this.apiKeys.values());

    if (userId) {
      keys = keys.filter(key => key.metadata.createdBy === userId);
    }

    // Remove sensitive data from response
    return keys.map(key => ({
      ...key,
      hashedKey: '***hidden***'
    }));
  }

  async getAPIKey(keyId: string): Promise<APIKey | null> {
    const key = this.apiKeys.get(keyId);
    if (!key) return null;

    return {
      ...key,
      hashedKey: '***hidden***'
    };
  }

  async updateAPIKey(keyId: string, updates: Partial<APIKey>): Promise<APIKey> {
    const key = this.apiKeys.get(keyId);
    if (!key) {
      throw new Error(`API key ${keyId} not found`);
    }

    const updatedKey: APIKey = {
      ...key,
      ...updates,
      id: keyId, // Ensure ID doesn't change
      hashedKey: key.hashedKey // Ensure hashed key doesn't change
    };

    this.apiKeys.set(keyId, updatedKey);
    this.apiKeysByHash.set(key.hashedKey, updatedKey);

    this.logger.info('API key updated', { keyId, updates: Object.keys(updates) });

    return {
      ...updatedKey,
      hashedKey: '***hidden***'
    };
  }

  async deleteAPIKey(keyId: string): Promise<void> {
    const key = this.apiKeys.get(keyId);
    if (!key) {
      throw new Error(`API key ${keyId} not found`);
    }

    this.apiKeys.delete(keyId);
    this.apiKeysByHash.delete(key.hashedKey);
    this.rateLimitCounters.delete(keyId);
    this.activities.delete(keyId);

    this.logger.info('API key deleted', { keyId });
  }

  async rotateAPIKey(keyId: string): Promise<APIKey> {
    const existingKey = this.apiKeys.get(keyId);
    if (!existingKey) {
      throw new Error(`API key ${keyId} not found`);
    }

    // Generate new key
    const keyPrefix = this.generateKeyPrefix();
    const secret = this.generateSecret();
    const rawKey = `${keyPrefix}.${secret}`;
    const hashedKey = this.hashKey(rawKey);

    // Remove old key from hash map
    this.apiKeysByHash.delete(existingKey.hashedKey);

    // Update key with new values
    const rotatedKey: APIKey = {
      ...existingKey,
      keyPrefix,
      hashedKey
    };

    this.apiKeys.set(keyId, rotatedKey);
    this.apiKeysByHash.set(hashedKey, rotatedKey);

    this.logger.info('API key rotated', { keyId });

    return { ...rotatedKey, hashedKey: rawKey };
  }

  async validateAPIKey(key: string): Promise<APIKey | null> {
    const hashedKey = this.hashKey(key);
    const apiKey = this.apiKeysByHash.get(hashedKey);

    if (!apiKey) return null;

    // Check if key is active
    if (!apiKey.isActive) return null;

    // Check if key is expired
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update last used timestamp
    apiKey.lastUsedAt = new Date();
    this.apiKeys.set(apiKey.id, apiKey);

    return apiKey;
  }

  checkPermissions(apiKey: APIKey, resource: APIResource, action: APIAction): boolean {
    // Check if the API key has permission for the resource and action
    const permission = apiKey.permissions.find(p => p.resource === resource);
    if (!permission) return false;

    return permission.actions.includes(action);
  }

  async checkRateLimit(apiKey: APIKey): Promise<RateLimitResult> {
    const quotaUsage = this.rateLimitCounters.get(apiKey.id);
    if (!quotaUsage) {
      return { allowed: true, remaining: apiKey.rateLimits.requestsPerMinute, resetAt: new Date() };
    }

    const now = new Date();

    // Check minute limit
    if (quotaUsage.minute.resetAt < now) {
      quotaUsage.minute.used = 0;
      quotaUsage.minute.resetAt = new Date(now.getTime() + 60 * 1000);
    }

    if (quotaUsage.minute.used >= quotaUsage.minute.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: quotaUsage.minute.resetAt,
        retryAfter: Math.ceil((quotaUsage.minute.resetAt.getTime() - now.getTime()) / 1000)
      };
    }

    // Check hour limit
    if (quotaUsage.hour.resetAt < now) {
      quotaUsage.hour.used = 0;
      quotaUsage.hour.resetAt = new Date(now.getTime() + 60 * 60 * 1000);
    }

    if (quotaUsage.hour.used >= quotaUsage.hour.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: quotaUsage.hour.resetAt,
        retryAfter: Math.ceil((quotaUsage.hour.resetAt.getTime() - now.getTime()) / 1000)
      };
    }

    // Check day limit
    if (quotaUsage.day.resetAt < now) {
      quotaUsage.day.used = 0;
      quotaUsage.day.resetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    if (quotaUsage.day.used >= quotaUsage.day.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: quotaUsage.day.resetAt,
        retryAfter: Math.ceil((quotaUsage.day.resetAt.getTime() - now.getTime()) / 1000)
      };
    }

    // Increment counters
    quotaUsage.minute.used++;
    quotaUsage.hour.used++;
    quotaUsage.day.used++;

    return {
      allowed: true,
      remaining: Math.min(
        quotaUsage.minute.limit - quotaUsage.minute.used,
        quotaUsage.hour.limit - quotaUsage.hour.used,
        quotaUsage.day.limit - quotaUsage.day.used
      ),
      resetAt: quotaUsage.minute.resetAt
    };
  }

  async recordAPIUsage(
    keyId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number
  ): Promise<void> {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) return;

    // Record activity
    const activity: APIActivity = {
      id: this.generateId(),
      timestamp: new Date(),
      method: method as HTTPMethod,
      endpoint,
      statusCode,
      responseTime
    };

    if (!this.activities.has(keyId)) {
      this.activities.set(keyId, []);
    }

    const activities = this.activities.get(keyId)!;
    activities.unshift(activity);

    // Keep only last 100 activities
    if (activities.length > 100) {
      activities.splice(100);
    }

    // Update usage stats
    apiKey.usage.totalRequests++;
    apiKey.usage.requestsToday++;
    apiKey.usage.requestsThisMonth++;

    // Update average response time
    const totalTime = (apiKey.usage.averageResponseTime * (apiKey.usage.totalRequests - 1)) + responseTime;
    apiKey.usage.averageResponseTime = totalTime / apiKey.usage.totalRequests;

    // Update error rate
    if (statusCode >= 400) {
      const totalErrors = activities.filter(a => a.statusCode >= 400).length - 1;
      apiKey.usage.errorRate = ((totalErrors + 1) / apiKey.usage.totalRequests) * 100;
    }

    // Update top endpoints
    let endpointUsage = apiKey.usage.topEndpoints.find(e => e.endpoint === endpoint && e.method === method);
    if (!endpointUsage) {
      endpointUsage = {
        endpoint,
        method,
        requests: 0,
        averageResponseTime: 0,
        errorRate: 0
      };
      apiKey.usage.topEndpoints.push(endpointUsage);
    }

    const endpointActivities = activities.filter(a => a.endpoint === endpoint && a.method === method);
    const endpointTotalTime = endpointActivities.reduce((sum, a) => sum + a.responseTime, 0);
    const endpointErrors = endpointActivities.filter(a => a.statusCode >= 400).length;

    endpointUsage.requests++;
    endpointUsage.averageResponseTime = endpointTotalTime / endpointUsage.requests;

    if (statusCode >= 400) {
      endpointUsage.errorRate = ((endpointErrors) / endpointUsage.requests) * 100;
    }

    // Sort and keep top 10 endpoints
    apiKey.usage.topEndpoints.sort((a, b) => b.requests - a.requests);
    if (apiKey.usage.topEndpoints.length > 10) {
      apiKey.usage.topEndpoints = apiKey.usage.topEndpoints.slice(0, 10);
    }

    // Update recent activity
    apiKey.usage.recentActivity = activities.slice(0, 10);

    this.apiKeys.set(keyId, apiKey);
  }

  async getAPIUsage(keyId: string, period?: DateRange): Promise<APIUsageStats> {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) {
      throw new Error(`API key ${keyId} not found`);
    }

    let usage = { ...apiKey.usage };

    if (period) {
      // Filter activities by date range
      const filteredActivities = apiKey.usage.recentActivity.filter(
        a => a.timestamp >= period.start && a.timestamp <= period.end
      );

      // Recalculate stats for the period
      usage = {
        ...usage,
        totalRequests: filteredActivities.length,
        recentActivity: filteredActivities.slice(0, 10)
      };
    }

    return usage;
  }

  getAPIDocumentation(): APIEndpoint[] {
    return [
      {
        path: '/api/v1/workflows',
        method: 'GET',
        description: 'List all workflows',
        parameters: [
          {
            name: 'page',
            in: 'query',
            type: 'number',
            required: false,
            description: 'Page number for pagination'
          },
          {
            name: 'limit',
            in: 'query',
            type: 'number',
            required: false,
            description: 'Number of items per page'
          }
        ],
        responses: [
          {
            statusCode: 200,
            description: 'List of workflows',
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: { 
                  type: 'array',
                  items: { type: 'object' }
                }
              }
            }
          }
        ],
        authentication: true,
        ratelimit: true,
        scopes: ['workflow:read'],
        examples: [
          {
            name: 'List workflows',
            description: 'Get all workflows with pagination',
            request: {
              method: 'GET',
              url: '/api/v1/workflows?page=1&limit=10',
              headers: {
                'Authorization': 'Bearer wfb_your_api_key',
                'Content-Type': 'application/json'
              }
            },
            response: {
              statusCode: 200,
              body: {
                success: true,
                data: [
                  {
                    id: 'wf_123',
                    name: 'My Workflow',
                    status: 'active',
                    createdAt: '2023-01-01T00:00:00Z'
                  }
                ],
                metadata: {
                  pagination: {
                    page: 1,
                    perPage: 10,
                    total: 25,
                    totalPages: 3
                  }
                }
              }
            }
          }
        ]
      },
      {
        path: '/api/v1/workflows/{id}/execute',
        method: 'POST',
        description: 'Execute a workflow',
        parameters: [
          {
            name: 'id',
            in: 'path',
            type: 'string',
            required: true,
            description: 'Workflow ID'
          }
        ],
        requestBody: {
          type: 'object',
          properties: {
            input: { type: 'object' },
            parameters: { type: 'object' },
            async: { type: 'boolean' }
          }
        },
        responses: [
          {
            statusCode: 200,
            description: 'Execution started or completed',
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    executionId: { type: 'string' },
                    status: { type: 'string' },
                    output: { type: 'object' }
                  }
                }
              }
            }
          }
        ],
        authentication: true,
        ratelimit: true,
        scopes: ['workflow:execute'],
        examples: [
          {
            name: 'Execute workflow',
            description: 'Execute a workflow with input data',
            request: {
              method: 'POST',
              url: '/api/v1/workflows/wf_123/execute',
              headers: {
                'Authorization': 'Bearer wfb_your_api_key',
                'Content-Type': 'application/json'
              },
              body: {
                input: { name: 'John Doe' },
                async: false
              }
            },
            response: {
              statusCode: 200,
              body: {
                success: true,
                data: {
                  executionId: 'exec_456',
                  status: 'completed',
                  output: { result: 'Hello John Doe' }
                }
              }
            }
          }
        ]
      }
    ];
  }

  generateOpenAPISpec(): unknown {
    const spec: any = {
      openapi: '3.0.0',
      info: {
        title: 'Workflow Builder API',
        version: '1.0.0',
        description: 'REST API for Workflow Builder Pro'
      },
      servers: [
        {
          url: '/api/v1',
          description: 'API v1'
        }
      ],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'Authorization'
          }
        }
      },
      security: [
        {
          ApiKeyAuth: []
        }
      ],
      paths: {}
    };

    // Convert endpoints to OpenAPI format
    const endpoints = this.getAPIDocumentation();
    endpoints.forEach(endpoint => {
      if (!spec.paths[endpoint.path]) {
        spec.paths[endpoint.path] = {};
      }

      spec.paths[endpoint.path][endpoint.method.toLowerCase()] = {
        summary: endpoint.description,
        parameters: endpoint.parameters?.map(param => ({
          name: param.name,
          in: param.in,
          required: param.required,
          description: param.description,
          schema: { type: param.type }
        })),
        requestBody: endpoint.requestBody ? {
          content: {
            'application/json': {
              schema: endpoint.requestBody
            }
          }
        } : undefined,
        responses: endpoint.responses.reduce((acc, response) => {
          acc[response.statusCode] = {
            description: response.description,
            content: response.schema ? {
              'application/json': {
                schema: response.schema
              }
            } : undefined
          };
          return acc;
        }, {} as any)
      };
    });

    return spec;
  }

  // Alias for compatibility
  getOpenAPISpec(): unknown {
    return this.generateOpenAPISpec();
  }

  generateCLIConfig(apiKey: string): CLIConfig {
    return {
      apiUrl: '/api/v1',
      apiKey,
      format: 'json',
      verbose: false,
      timeout: 30000,
      retries: 3
    };
  }

  async executeCLICommand(command: string, args: string[], options: CLIConfig): Promise<CLIResult> {
    // This would be implemented in the actual CLI tool
    // For now, return a mock result
    return {
      success: true,
      message: `Command '${command}' executed successfully`,
      data: { command, args, options }
    };
  }

  async createWebhook(webhook: Omit<WebhookEndpoint, 'id' | 'stats' | 'createdAt'>): Promise<WebhookEndpoint> {
    const webhookEndpoint: WebhookEndpoint = {
      ...webhook,
      id: this.generateId(),
      stats: {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        averageResponseTime: 0
      },
      createdAt: new Date()
    };

    this.webhooks.set(webhookEndpoint.id, webhookEndpoint);
    return webhookEndpoint;
  }

  async listWebhooks(): Promise<WebhookEndpoint[]> {
    return Array.from(this.webhooks.values());
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    this.webhooks.delete(webhookId);
  }

  async deliverWebhook(webhookId: string, event: WebhookEvent, payload: unknown): Promise<void> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook || !webhook.isActive) return;

    const startTime = Date.now();

    try {
      // In a real implementation, this would make an HTTP request to the webhook URL
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...webhook.headers
        },
        body: JSON.stringify({
          event,
          payload,
          timestamp: new Date().toISOString()
        })
      });

      const endTime = Date.now();
      const totalTime = (webhook.stats.averageResponseTime * webhook.stats.totalDeliveries) + (endTime - startTime);

      webhook.stats.totalDeliveries++;
      if (response.ok) {
        webhook.stats.successfulDeliveries++;
        webhook.stats.lastSuccessAt = new Date();
      } else {
        webhook.stats.failedDeliveries++;
        webhook.stats.lastFailureAt = new Date();
      }

      // Update average response time
      webhook.stats.averageResponseTime = totalTime / webhook.stats.totalDeliveries;
      webhook.stats.lastDeliveryAt = new Date();

    } catch (error) {
      webhook.stats.totalDeliveries++;
      webhook.stats.failedDeliveries++;
      webhook.stats.lastFailureAt = new Date();
      webhook.stats.lastDeliveryAt = new Date();
      
      this.logger.error('Webhook delivery failed', { webhookId, error });
    }
  }

  // Private helper methods
  private initializeQuotaUsage(): QuotaUsage {
    const now = new Date();
    return {
      minute: { used: 0, limit: 60, resetAt: new Date(now.getTime() + 60 * 1000) },
      hour: { used: 0, limit: 1000, resetAt: new Date(now.getTime() + 60 * 60 * 1000) },
      day: { used: 0, limit: 10000, resetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
      month: { used: 0, limit: 100000, resetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1) }
    };
  }

  private initializeRateLimitCounters(keyId: string, rateLimits: any) {
    const now = new Date();
    this.rateLimitCounters.set(keyId, {
      minute: { used: 0, limit: rateLimits.requestsPerMinute, resetAt: new Date(now.getTime() + 60 * 1000) },
      hour: { used: 0, limit: rateLimits.requestsPerHour, resetAt: new Date(now.getTime() + 60 * 60 * 1000) },
      day: { used: 0, limit: rateLimits.requestsPerDay, resetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
      month: { used: 0, limit: rateLimits.requestsPerDay * 30, resetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1) }
    });
  }

  private generateId(): string {
    return `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateKeyPrefix(): string {
    return `pk_${Math.random().toString(36).substr(2, 5)}`;
  }
  
  private generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  private generateSecureKey(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private hashKey(key: string): string {
    // In a real implementation, use a proper hashing library like bcrypt
    // For demo purposes, using a simple hash
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

}
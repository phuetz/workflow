/**
 * Webhook Service
 * Comprehensive webhook system integrating all features
 */

import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';
import { testWebhookManager, WebhookEndpoint } from './TestWebhookManager';
import { webhookAuth, AuthConfig, AuthRequest, AuthResult } from './WebhookAuth';
import { webhookRateLimiter, RateLimitConfig, RateLimitResult } from './WebhookRateLimiter';
import { webhookAnalytics, WebhookLog } from './WebhookAnalytics';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

/**
 * JSON Schema type definition for validation
 * Supports boolean schemas (true = any value allowed, false = no value allowed)
 */
export interface JSONSchemaObject {
  type?: string | string[];
  nullable?: boolean;
  const?: unknown;
  enum?: unknown[];
  // String
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  // Number
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  // Array
  items?: JSONSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  // Object
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
  minProperties?: number;
  maxProperties?: number;
}

export type JSONSchema = JSONSchemaObject | boolean;

export type ResponseMode = 'lastNode' | 'allNodes' | 'custom' | 'file' | 'redirect';

export interface WebhookConfig {
  id: string;
  workflowId: string;
  mode: 'test' | 'production';
  name?: string;
  description?: string;

  // Authentication
  authentication?: AuthConfig;

  // Rate Limiting
  rateLimit?: RateLimitConfig;

  // Response Configuration
  response?: {
    mode: ResponseMode;
    statusCode?: number;
    headers?: Record<string, string>;
    body?: any;
    template?: string; // Handlebars template
    transformScript?: string; // JavaScript to transform response
  };

  // Request Transformation
  requestTransform?: {
    enabled: boolean;
    script?: string; // JavaScript to transform request
    validation?: {
      schema?: any; // JSON schema
      required?: string[];
    };
  };

  // CORS Configuration
  cors?: {
    enabled: boolean;
    origins?: string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
    maxAge?: number;
  };

  // Compression
  compression?: {
    enabled: boolean;
    algorithms?: ('gzip' | 'brotli')[];
    threshold?: number; // minimum bytes to compress
  };

  // Analytics
  analytics?: {
    enabled: boolean;
    trackHeaders?: boolean;
    trackBody?: boolean;
    trackIP?: boolean;
  };

  // Metadata
  metadata?: Record<string, any>;
}

export interface WebhookRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: any;
  rawBody?: string | Buffer;
  ip?: string;
}

export interface WebhookResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
}

export class WebhookService extends EventEmitter {
  private configs: Map<string, WebhookConfig> = new Map();

  constructor() {
    super();
    this.initializeEventHandlers();
    logger.info('WebhookService initialized');
  }

  /**
   * Create a new webhook
   */
  createWebhook(config: Omit<WebhookConfig, 'id'>): {
    webhook: WebhookEndpoint;
    config: WebhookConfig;
  } {
    // Create endpoint using TestWebhookManager
    const endpoint = config.mode === 'test'
      ? testWebhookManager.createTestWebhook(config.workflowId, {
          metadata: config.metadata
        })
      : testWebhookManager.createProductionWebhook(config.workflowId, {
          metadata: config.metadata
        });

    // Store configuration
    const webhookConfig: WebhookConfig = {
      ...config,
      id: endpoint.id
    };

    this.configs.set(endpoint.id, webhookConfig);

    this.emit('webhook:created', { endpoint, config: webhookConfig });

    logger.info(`Webhook created: ${endpoint.id} (${config.mode})`);

    return { webhook: endpoint, config: webhookConfig };
  }

  /**
   * Update webhook configuration
   */
  updateWebhook(webhookId: string, updates: Partial<WebhookConfig>): WebhookConfig {
    const config = this.configs.get(webhookId);

    if (!config) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    Object.assign(config, updates);

    this.emit('webhook:updated', { webhookId, config });

    return config;
  }

  /**
   * Delete webhook
   */
  deleteWebhook(webhookId: string): void {
    testWebhookManager.deleteWebhook(webhookId);
    this.configs.delete(webhookId);

    this.emit('webhook:deleted', { webhookId });

    logger.info(`Webhook deleted: ${webhookId}`);
  }

  /**
   * Handle incoming webhook request
   */
  async handleRequest(
    webhookId: string,
    request: WebhookRequest
  ): Promise<WebhookResponse> {
    const startTime = Date.now();
    let authResult: AuthResult | undefined;
    let rateLimitResult: RateLimitResult | undefined;

    try {
      // Get webhook configuration
      const config = this.configs.get(webhookId);

      if (!config) {
        throw new Error(`Webhook ${webhookId} not found`);
      }

      // Record request with TestWebhookManager
      const webhookRequest = testWebhookManager.recordRequest(webhookId, {
        method: request.method,
        headers: request.headers,
        query: request.query,
        body: request.body,
        ip: request.ip
      });

      // 1. Authentication
      if (config.authentication) {
        authResult = await this.authenticateRequest(request, config.authentication);

        if (!authResult.authenticated) {
          const responseTime = Date.now() - startTime;
          this.logRequest(config, request, 401, responseTime, false, authResult.error);

          return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: {
              error: 'Unauthorized',
              message: authResult.error || 'Authentication failed'
            }
          };
        }
      }

      // 2. Rate Limiting
      if (config.rateLimit) {
        rateLimitResult = this.checkRateLimit(webhookId, request.ip || 'unknown', config.rateLimit);

        if (!rateLimitResult.allowed) {
          const responseTime = Date.now() - startTime;
          this.logRequest(config, request, 429, responseTime, false, rateLimitResult.reason);

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString()
          };

          if (rateLimitResult.retryAfter) {
            headers['Retry-After'] = rateLimitResult.retryAfter.toString();
          }

          return {
            statusCode: config.rateLimit.errorResponse?.statusCode || 429,
            headers: {
              ...headers,
              ...config.rateLimit.errorResponse?.headers
            },
            body: config.rateLimit.errorResponse?.message || {
              error: 'Too Many Requests',
              message: rateLimitResult.reason || 'Rate limit exceeded',
              retryAfter: rateLimitResult.retryAfter
            }
          };
        }

        // Record successful rate limit check
        webhookRateLimiter.recordRequest(webhookId, request.ip || 'unknown', config.rateLimit);
      }

      // 3. Request Transformation
      let transformedRequest = request;
      if (config.requestTransform?.enabled) {
        transformedRequest = await this.transformRequest(request, config.requestTransform);
      }

      // 4. Execute workflow (placeholder - integrate with ExecutionEngine)
      const workflowResult = await this.executeWorkflow(
        config.workflowId,
        transformedRequest
      );

      // 5. Build response
      let response = await this.buildResponse(
        config,
        workflowResult,
        transformedRequest
      );

      // 6. Apply CORS headers
      if (config.cors?.enabled) {
        response.headers = {
          ...response.headers,
          ...this.buildCORSHeaders(config.cors, request)
        };
      }

      // 7. Compress response if configured
      if (config.compression?.enabled) {
        response = await this.compressResponse(response, config.compression);
      }

      // 8. Log successful request
      const responseTime = Date.now() - startTime;
      this.logRequest(config, request, response.statusCode, responseTime, true);

      // Record response
      testWebhookManager.recordResponse(webhookRequest.id, {
        statusCode: response.statusCode,
        headers: response.headers,
        body: response.body,
        responseTime
      });

      return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = (error as Error).message;

      this.logRequest(
        this.configs.get(webhookId)!,
        request,
        500,
        responseTime,
        false,
        errorMessage
      );

      logger.error(`Webhook request failed: ${webhookId}`, error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: {
          error: 'Internal Server Error',
          message: errorMessage
        }
      };
    }
  }

  /**
   * Authenticate request
   */
  private async authenticateRequest(
    request: WebhookRequest,
    authConfig: AuthConfig
  ): Promise<AuthResult> {
    const authRequest: AuthRequest = {
      method: request.method,
      path: request.path,
      headers: request.headers,
      query: request.query,
      body: request.body,
      rawBody: request.rawBody
    };

    return webhookAuth.authenticate(authRequest, authConfig);
  }

  /**
   * Check rate limit
   */
  private checkRateLimit(
    webhookId: string,
    ip: string,
    config: RateLimitConfig
  ): RateLimitResult {
    return webhookRateLimiter.checkRateLimit(webhookId, ip, config);
  }

  /**
   * Transform request
   */
  private async transformRequest(
    request: WebhookRequest,
    transform: NonNullable<WebhookConfig['requestTransform']>
  ): Promise<WebhookRequest> {
    let transformedRequest = { ...request };

    // Validate request
    if (transform.validation) {
      this.validateRequest(request, transform.validation);
    }

    // Apply transformation script
    if (transform.script) {
      try {
        // Use SecureSandbox for safe script execution
        const { SecureSandbox } = await import('../../utils/SecureSandbox');
        const sandbox = SecureSandbox.getInstance();

        const result = await sandbox.evaluate(
          `(function(request) { ${transform.script} })(request)`,
          {
            variables: { request },
            constants: { JSON, Math, Date }
          },
          { timeout: 5000, enableAsync: false }
        );

        if (!result.success) {
          throw new Error(`Request transformation failed: ${result.error?.message}`);
        }

        transformedRequest = result.value;
      } catch (error) {
        logger.error('Request transformation error:', error);
        throw error;
      }
    }

    return transformedRequest;
  }

  /**
   * Validate request
   */
  private validateRequest(
    request: WebhookRequest,
    validation: NonNullable<NonNullable<WebhookConfig['requestTransform']>['validation']>
  ): void {
    // Check required fields
    if (validation.required) {
      for (const field of validation.required) {
        if (!request.body?.[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
    }

    // Validate against JSON schema
    if (validation.schema) {
      const schemaErrors = this.validateJSONSchema(request.body, validation.schema);
      if (schemaErrors.length > 0) {
        throw new Error(`JSON schema validation failed: ${schemaErrors.join(', ')}`);
      }
    }
  }

  /**
   * Validate data against a JSON schema
   * Lightweight implementation supporting common JSON schema features
   */
  private validateJSONSchema(data: unknown, schema: JSONSchema, path: string = ''): string[] {
    const errors: string[] = [];

    if (schema === true) return errors;
    if (schema === false) {
      errors.push(`${path || 'root'}: schema is false, no value is valid`);
      return errors;
    }

    // Type validation
    if (schema.type) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      const actualType = this.getJSONType(data);
      if (!types.includes(actualType) && !(schema.nullable && data === null)) {
        errors.push(`${path || 'root'}: expected ${types.join(' | ')}, got ${actualType}`);
        return errors;
      }
    }

    // Const validation
    if (schema.const !== undefined && data !== schema.const) {
      errors.push(`${path || 'root'}: expected constant ${JSON.stringify(schema.const)}`);
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push(`${path || 'root'}: value must be one of [${schema.enum.join(', ')}]`);
    }

    // String validations
    if (typeof data === 'string') {
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        errors.push(`${path || 'root'}: string length must be >= ${schema.minLength}`);
      }
      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        errors.push(`${path || 'root'}: string length must be <= ${schema.maxLength}`);
      }
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(data)) {
          errors.push(`${path || 'root'}: string must match pattern ${schema.pattern}`);
        }
      }
      if (schema.format) {
        const formatError = this.validateFormat(data, schema.format);
        if (formatError) {
          errors.push(`${path || 'root'}: ${formatError}`);
        }
      }
    }

    // Number validations
    if (typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push(`${path || 'root'}: number must be >= ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && data > schema.maximum) {
        errors.push(`${path || 'root'}: number must be <= ${schema.maximum}`);
      }
      if (schema.exclusiveMinimum !== undefined && data <= schema.exclusiveMinimum) {
        errors.push(`${path || 'root'}: number must be > ${schema.exclusiveMinimum}`);
      }
      if (schema.exclusiveMaximum !== undefined && data >= schema.exclusiveMaximum) {
        errors.push(`${path || 'root'}: number must be < ${schema.exclusiveMaximum}`);
      }
      if (schema.multipleOf !== undefined && data % schema.multipleOf !== 0) {
        errors.push(`${path || 'root'}: number must be a multiple of ${schema.multipleOf}`);
      }
    }

    // Array validations
    if (Array.isArray(data)) {
      if (schema.minItems !== undefined && data.length < schema.minItems) {
        errors.push(`${path || 'root'}: array must have >= ${schema.minItems} items`);
      }
      if (schema.maxItems !== undefined && data.length > schema.maxItems) {
        errors.push(`${path || 'root'}: array must have <= ${schema.maxItems} items`);
      }
      if (schema.uniqueItems && new Set(data.map((item) => JSON.stringify(item))).size !== data.length) {
        errors.push(`${path || 'root'}: array items must be unique`);
      }
      if (schema.items) {
        data.forEach((item, index) => {
          errors.push(...this.validateJSONSchema(item, schema.items!, `${path}[${index}]`));
        });
      }
    }

    // Object validations
    if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
      const objData = data as Record<string, unknown>;
      const keys = Object.keys(objData);

      // Required properties
      if (schema.required) {
        for (const requiredProp of schema.required) {
          if (!(requiredProp in objData)) {
            errors.push(`${path ? path + '.' : ''}${requiredProp}: required property missing`);
          }
        }
      }

      // Min/max properties
      if (schema.minProperties !== undefined && keys.length < schema.minProperties) {
        errors.push(`${path || 'root'}: object must have >= ${schema.minProperties} properties`);
      }
      if (schema.maxProperties !== undefined && keys.length > schema.maxProperties) {
        errors.push(`${path || 'root'}: object must have <= ${schema.maxProperties} properties`);
      }

      // Property validation
      if (schema.properties) {
        for (const [prop, propSchema] of Object.entries(schema.properties)) {
          if (prop in objData) {
            errors.push(...this.validateJSONSchema(objData[prop], propSchema, `${path ? path + '.' : ''}${prop}`));
          }
        }
      }

      // Additional properties
      if (schema.additionalProperties === false) {
        const allowedProps = Object.keys(schema.properties || {});
        const extraProps = keys.filter(k => !allowedProps.includes(k));
        if (extraProps.length > 0) {
          errors.push(`${path || 'root'}: additional properties not allowed: ${extraProps.join(', ')}`);
        }
      } else if (typeof schema.additionalProperties === 'object') {
        const definedProps = Object.keys(schema.properties || {});
        for (const key of keys) {
          if (!definedProps.includes(key)) {
            errors.push(...this.validateJSONSchema(objData[key], schema.additionalProperties, `${path ? path + '.' : ''}${key}`));
          }
        }
      }
    }

    return errors;
  }

  /**
   * Get JSON type of a value
   */
  private getJSONType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'number';
    }
    return typeof value;
  }

  /**
   * Validate string format
   */
  private validateFormat(value: string, format: string): string | null {
    const formats: Record<string, RegExp> = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      uri: /^https?:\/\/.+/,
      'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      date: /^\d{4}-\d{2}-\d{2}$/,
      time: /^\d{2}:\d{2}:\d{2}/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ipv4: /^(\d{1,3}\.){3}\d{1,3}$/,
      ipv6: /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i,
      hostname: /^[a-zA-Z0-9][a-zA-Z0-9.-]*$/,
    };

    if (formats[format] && !formats[format].test(value)) {
      return `invalid ${format} format`;
    }
    return null;
  }

  /**
   * Execute workflow (placeholder)
   */
  private async executeWorkflow(
    workflowId: string,
    request: WebhookRequest
  ): Promise<any> {
    // This would integrate with your ExecutionEngine
    // For now, return a placeholder result
    this.emit('workflow:execute', { workflowId, request });

    return {
      success: true,
      data: {
        message: 'Workflow executed successfully',
        input: request.body,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Build response based on configuration
   */
  private async buildResponse(
    config: WebhookConfig,
    workflowResult: any,
    request: WebhookRequest
  ): Promise<WebhookResponse> {
    const responseConfig = config.response || { mode: 'lastNode' as ResponseMode };
    const statusCode = responseConfig.statusCode || 200;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(responseConfig.headers || {})
    };
    let body: any;

    switch (responseConfig.mode || 'lastNode') {
      case 'custom':
        body = responseConfig.body || workflowResult;
        break;

      case 'file':
        // File download response
        headers['Content-Type'] = 'application/octet-stream';
        headers['Content-Disposition'] = 'attachment; filename="result.json"';
        body = JSON.stringify(workflowResult);
        break;

      case 'redirect':
        // Redirect response
        const redirectUrl = (responseConfig.body as any)?.url || '/';
        return {
          statusCode: 302,
          headers: {
            'Location': redirectUrl
          },
          body: ''
        };

      case 'allNodes':
        body = {
          success: true,
          allNodes: workflowResult,
          timestamp: new Date().toISOString()
        };
        break;

      case 'lastNode':
      default:
        body = workflowResult;
        break;
    }

    // Apply template if configured
    if (responseConfig.template) {
      body = this.applyTemplate(responseConfig.template, {
        result: workflowResult,
        request: request.body
      });
    }

    // Apply transformation script
    if (responseConfig.transformScript) {
      try {
        const { SecureSandbox } = await import('../../utils/SecureSandbox');
        const sandbox = SecureSandbox.getInstance();

        const result = await sandbox.evaluate(
          `(function(data) { ${responseConfig.transformScript} })(data)`,
          {
            variables: { data: body },
            constants: { JSON, Math, Date }
          },
          { timeout: 5000, enableAsync: false }
        );

        if (result.success) {
          body = result.value;
        }
      } catch (error) {
        logger.error('Response transformation error:', error);
      }
    }

    return { statusCode, headers, body };
  }

  /**
   * Apply Handlebars template
   */
  private applyTemplate(template: string, data: any): any {
    let result = template;

    // Simple template replacement
    const matches = template.match(/\{\{([^}]+)\}\}/g);
    if (matches) {
      matches.forEach(match => {
        const key = match.replace(/\{\{|\}\}/g, '').trim();
        const value = this.getNestedValue(data, key);
        result = result.replace(match, value !== undefined ? JSON.stringify(value) : '');
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
   * Build CORS headers
   */
  private buildCORSHeaders(
    cors: NonNullable<WebhookConfig['cors']>,
    request: WebhookRequest
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    // Access-Control-Allow-Origin
    if (cors.origins && cors.origins.length > 0) {
      const origin = request.headers['origin'] || request.headers['Origin'];
      if (origin && cors.origins.includes(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
      } else if (cors.origins.includes('*')) {
        headers['Access-Control-Allow-Origin'] = '*';
      }
    } else {
      headers['Access-Control-Allow-Origin'] = '*';
    }

    // Access-Control-Allow-Methods
    if (cors.methods && cors.methods.length > 0) {
      headers['Access-Control-Allow-Methods'] = cors.methods.join(', ');
    }

    // Access-Control-Allow-Headers
    if (cors.headers && cors.headers.length > 0) {
      headers['Access-Control-Allow-Headers'] = cors.headers.join(', ');
    }

    // Access-Control-Allow-Credentials
    if (cors.credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    // Access-Control-Max-Age
    if (cors.maxAge) {
      headers['Access-Control-Max-Age'] = cors.maxAge.toString();
    }

    return headers;
  }

  /**
   * Compress response
   */
  private async compressResponse(
    response: WebhookResponse,
    compression: NonNullable<WebhookConfig['compression']>
  ): Promise<WebhookResponse> {
    const bodyString = typeof response.body === 'string'
      ? response.body
      : JSON.stringify(response.body);

    const bodySize = Buffer.byteLength(bodyString);

    // Only compress if above threshold
    const threshold = compression.threshold || 1024; // 1KB default
    if (bodySize < threshold) {
      return response;
    }

    // Compress with gzip (brotli would require additional setup)
    try {
      const compressed = await gzipAsync(bodyString);

      return {
        ...response,
        headers: {
          ...response.headers,
          'Content-Encoding': 'gzip',
          'Content-Length': compressed.length.toString()
        },
        body: compressed
      };
    } catch (error) {
      logger.error('Compression error:', error);
      return response;
    }
  }

  /**
   * Log request to analytics
   */
  private logRequest(
    config: WebhookConfig,
    request: WebhookRequest,
    statusCode: number,
    responseTime: number,
    success: boolean,
    error?: string
  ): void {
    if (!config.analytics?.enabled) {
      return;
    }

    const bodyString = typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body || {});

    const log: Omit<WebhookLog, 'id' | 'timestamp'> = {
      webhookId: config.id,
      method: request.method,
      path: request.path,
      headers: config.analytics.trackHeaders ? request.headers : {},
      query: request.query,
      body: config.analytics.trackBody ? request.body : undefined,
      bodySize: Buffer.byteLength(bodyString),
      ip: config.analytics.trackIP ? request.ip : undefined,
      userAgent: request.headers['user-agent'] || request.headers['User-Agent'],
      statusCode,
      responseTime,
      success,
      error,
      metadata: config.metadata
    };

    webhookAnalytics.logRequest(log);
  }

  /**
   * Get webhook configuration
   */
  getWebhookConfig(webhookId: string): WebhookConfig | undefined {
    return this.configs.get(webhookId);
  }

  /**
   * List all webhooks
   */
  listWebhooks(filters?: {
    workflowId?: string;
    mode?: 'test' | 'production';
  }): Array<{ endpoint: WebhookEndpoint; config: WebhookConfig }> {
    const endpoints = testWebhookManager.listWebhooks(filters);

    return endpoints.map(endpoint => ({
      endpoint,
      config: this.configs.get(endpoint.id)!
    })).filter(item => item.config);
  }

  /**
   * Get analytics summary
   */
  getAnalytics(webhookId: string, options?: {
    startDate?: Date;
    endDate?: Date;
  }) {
    return webhookAnalytics.getSummary(webhookId, options);
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(webhookId: string) {
    const config = this.configs.get(webhookId);
    if (!config?.rateLimit) {
      return null;
    }

    return webhookRateLimiter.getWebhookStatus(webhookId, config.rateLimit);
  }

  /**
   * Test webhook
   */
  async testWebhook(webhookId: string, testData?: any): Promise<WebhookResponse> {
    const config = this.configs.get(webhookId);

    if (!config) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    const testRequest: WebhookRequest = {
      method: 'POST',
      path: `/test/${webhookId}`,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WebhookTester/1.0'
      },
      query: {},
      body: testData || {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Test webhook request'
      },
      ip: '127.0.0.1'
    };

    return this.handleRequest(webhookId, testRequest);
  }

  /**
   * Initialize event handlers
   */
  private initializeEventHandlers(): void {
    // Forward events from TestWebhookManager
    testWebhookManager.on('webhook:created', (data) => {
      this.emit('webhook:created', data);
    });

    testWebhookManager.on('webhook:expired', (data) => {
      this.emit('webhook:expired', data);
      // Clean up configuration
      this.configs.delete(data.webhook.id);
    });

    // Forward events from RateLimiter
    webhookRateLimiter.on('rate-limit:exceeded', (data) => {
      this.emit('rate-limit:exceeded', data);
    });
  }

  /**
   * Shutdown service
   */
  shutdown(): void {
    testWebhookManager.shutdown();
    webhookRateLimiter.shutdown();
    webhookAnalytics.shutdown();
    this.configs.clear();
    this.removeAllListeners();

    logger.info('WebhookService shut down');
  }
}

// Export singleton instance
export const webhookService = new WebhookService();

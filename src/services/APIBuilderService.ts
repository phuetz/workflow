import { logger } from './SimpleLogger';
export interface APIEndpoint {
  id: string;
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  enabled: boolean;
  authentication: {
    required: boolean;
    type: 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth2';
    config: unknown;
  };
  rateLimit: {
    enabled: boolean;
    requests: number;
    window: number; // in seconds
  };
  request: {
    headers: APIParameter[];
    queryParams: APIParameter[];
    bodySchema?: APISchema;
  };
  response: {
    successSchema: APISchema;
    errorSchemas: { [statusCode: string]: APISchema };
  };
  workflow: {
    workflowId?: string;
    transformations: APITransformation[];
  };
  validation: {
    enabled: boolean;
    rules: ValidationRule[];
  };
  caching: {
    enabled: boolean;
    ttl: number; // in seconds
    strategy: 'memory' | 'redis' | 'database';
  };
  monitoring: {
    enabled: boolean;
    logRequests: boolean;
    logResponses: boolean;
    alerts: APIAlert[];
  };
  documentation: {
    summary: string;
    description: string;
    tags: string[];
    examples: APIExample[];
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface APIParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  defaultValue?: unknown;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

export interface APISchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: { [key: string]: APISchema };
  items?: APISchema;
  required?: string[];
  description?: string;
  example?: unknown;
}

export interface APITransformation {
  id: string;
  name: string;
  type: 'map' | 'filter' | 'reduce' | 'transform' | 'validate';
  config: unknown;
  enabled: boolean;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'type' | 'min' | 'max' | 'pattern' | 'custom';
  value: unknown;
  message: string;
}

export interface APIAlert {
  type: 'error_rate' | 'response_time' | 'rate_limit' | 'auth_failure';
  threshold: number;
  enabled: boolean;
  actions: string[];
}

export interface APIExample {
  name: string;
  description: string;
  request: {
    headers?: { [key: string]: string };
    query?: { [key: string]: unknown };
    body?: unknown;
  };
  response: {
    status: number;
    headers?: { [key: string]: string };
    body: unknown;
  };
}

export interface APIMetrics {
  endpointId: string;
  totalRequests: number;
  successfulRequests: number;
  errorRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  rateLimitHits: number;
  authFailures: number;
  lastRequest?: Date;
  dailyStats: { [date: string]: APIDayStats };
}

export interface APIDayStats {
  date: string;
  requests: number;
  errors: number;
  avgResponseTime: number;
  uniqueUsers: number;
}

export interface APIGateway {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  version: string;
  endpoints: APIEndpoint[];
  globalSettings: {
    cors: {
      enabled: boolean;
      origins: string[];
      methods: string[];
      headers: string[];
    };
    rateLimit: {
      enabled: boolean;
      global: boolean;
      requests: number;
      window: number;
    };
    security: {
      https: boolean;
      hsts: boolean;
      contentTypeValidation: boolean;
    };
    monitoring: {
      enabled: boolean;
      metrics: boolean;
      logging: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface APIRequest {
  id: string;
  endpointId: string;
  method: string;
  path: string;
  headers: { [key: string]: string };
  query: { [key: string]: unknown };
  body?: unknown;
  timestamp: Date;
  responseTime: number;
  status: number;
  response?: unknown;
  error?: string;
  userId?: string;
  ip: string;
  userAgent: string;
}

export class APIBuilderService {
  private gateways: Map<string, APIGateway> = new Map();
  private endpoints: Map<string, APIEndpoint> = new Map();
  private metrics: Map<string, APIMetrics> = new Map();
  private requests: APIRequest[] = [];
  private authTokens: Map<string, unknown> = new Map();

  constructor() {
    this.initializeDefaultGateway();
  }

  // Gateway Management
  async createGateway(gateway: Omit<APIGateway, 'id' | 'createdAt' | 'updatedAt'>): Promise<APIGateway> {
    const newGateway: APIGateway = {
      ...gateway,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.gateways.set(newGateway.id, newGateway);
    return newGateway;
  }

  async getGateways(): Promise<APIGateway[]> {
    return Array.from(this.gateways.values());
  }

  async getGateway(id: string): Promise<APIGateway | undefined> {
    return this.gateways.get(id);
  }

  async updateGateway(id: string, updates: Partial<APIGateway>): Promise<APIGateway | undefined> {
    const gateway = this.gateways.get(id);
    if (gateway) {
      const updatedGateway = { ...gateway, ...updates, updatedAt: new Date() };
      this.gateways.set(id, updatedGateway);
      return updatedGateway;
    }
    return undefined;
  }

  // Endpoint Management
  async createEndpoint(endpoint: Omit<APIEndpoint, 'id' | 'createdAt' | 'updatedAt'>): Promise<APIEndpoint> {
    const newEndpoint: APIEndpoint = {
      ...endpoint,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.endpoints.set(newEndpoint.id, newEndpoint);
    this.initializeMetrics(newEndpoint.id);
    return newEndpoint;
  }

  async getEndpoints(gatewayId?: string): Promise<APIEndpoint[]> {
    const endpoints = Array.from(this.endpoints.values());
    if (gatewayId) {
      // Filter by gateway (would need to track gateway-endpoint relationships)
      return endpoints;
    }
    return endpoints;
  }

  async getEndpoint(id: string): Promise<APIEndpoint | undefined> {
    return this.endpoints.get(id);
  }

  async updateEndpoint(id: string, updates: Partial<APIEndpoint>): Promise<APIEndpoint | undefined> {
    const endpoint = this.endpoints.get(id);
    if (endpoint) {
      const updatedEndpoint = { ...endpoint, ...updates, updatedAt: new Date() };
      this.endpoints.set(id, updatedEndpoint);
      return updatedEndpoint;
    }
    return undefined;
  }

  async deleteEndpoint(id: string): Promise<boolean> {
    const deleted = this.endpoints.delete(id);
    if (deleted) {
      this.metrics.delete(id);
    }
    return deleted;
  }

  // API Execution
  async executeEndpoint(
    endpointId: string,
    request: {
      method: string;
      headers: { [key: string]: string };
      query: { [key: string]: unknown };
      body?: unknown;
      user?: unknown;
      ip: string;
      userAgent: string;
    }
  ): Promise<{
    status: number;
    headers: { [key: string]: string };
    body: unknown;
    responseTime: number;
  }> {
    const startTime = Date.now();
    const endpoint = this.endpoints.get(endpointId);

    if (!endpoint) {
      return {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Endpoint not found' },
        responseTime: Date.now() - startTime
      };
    }

    if (!endpoint.enabled) {
      return {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Endpoint disabled' },
        responseTime: Date.now() - startTime
      };
    }

    try {
      // Authentication
      const authResult = await this.authenticateRequest(endpoint, request);
      if (!authResult.success) {
        this.logRequest(endpointId, request, 401, authResult.error, Date.now() - startTime);
        return {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
          body: { error: authResult.error },
          responseTime: Date.now() - startTime
        };
      }

      // Rate Limiting
      const rateLimitResult = await this.checkRateLimit(endpoint, request);
      if (!rateLimitResult.allowed) {
        this.logRequest(endpointId, request, 429, 'Rate limit exceeded', Date.now() - startTime);
        return {
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
          },
          body: { error: 'Rate limit exceeded' },
          responseTime: Date.now() - startTime
        };
      }

      // Validation
      const validationResult = await this.validateRequest(endpoint, request);
      if (!validationResult.valid) {
        this.logRequest(endpointId, request, 400, validationResult.errors, Date.now() - startTime);
        return {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: { error: 'Validation failed', details: validationResult.errors },
          responseTime: Date.now() - startTime
        };
      }

      // Execute workflow or transformation
      const result = await this.executeWorkflow(endpoint, request);
      const responseTime = Date.now() - startTime;

      this.logRequest(endpointId, request, result.status, null, responseTime, result.body);
      this.updateMetrics(endpointId, responseTime, result.status);

      return {
        ...result,
        responseTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logRequest(endpointId, request, 500, error, responseTime);
      this.updateMetrics(endpointId, responseTime, 500);

      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Internal server error' },
        responseTime
      };
    }
  }

  // Schema Generation
  generateOpenAPISpec(gatewayId: string): unknown {
    const gateway = this.gateways.get(gatewayId);
    if (!gateway) return null;

    const spec = {
      openapi: '3.0.0',
      info: {
        title: gateway.name,
        description: gateway.description,
        version: gateway.version
      },
      servers: [
        {
          url: gateway.baseUrl,
          description: 'API Gateway'
        }
      ],
      paths: {} as Record<string, unknown>,
      components: {
        schemas: {} as Record<string, unknown>,
        securitySchemes: {} as Record<string, unknown>
      }
    };

    // Add endpoints to paths
    gateway.endpoints.forEach(endpoint => {
      if (!spec.paths[endpoint.path]) {
        spec.paths[endpoint.path] = {};
      }

      spec.paths[endpoint.path][endpoint.method.toLowerCase()] = {
        summary: endpoint.documentation.summary,
        description: endpoint.documentation.description,
        tags: endpoint.documentation.tags,
        parameters: [
          ...endpoint.request.queryParams.map(param => ({
            name: param.name,
            in: 'query',
            required: param.required,
            description: param.description,
            schema: { type: param.type }
          })),
          ...endpoint.request.headers.map(param => ({
            name: param.name,
            in: 'header',
            required: param.required,
            description: param.description,
            schema: { type: param.type }
          }))
        ],
        requestBody: endpoint.request.bodySchema ? {
          required: true,
          content: {
            'application/json': {
              schema: endpoint.request.bodySchema
            }
          }
        } : undefined,
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: endpoint.response.successSchema
              }
            }
          },
          ...Object.entries(endpoint.response.errorSchemas).reduce((acc, [code, schema]) => ({
            ...acc,
            [code]: {
              description: 'Error',
              content: {
                'application/json': { schema }
              }
            }
          }), {})
        },
        security: endpoint.authentication.required ? [
          { [endpoint.authentication.type]: [] }
        ] : []
      };
    });

    return spec;
  }

  // Code Generation
  generateClientCode(gatewayId: string, language: 'javascript' | 'python' | 'curl' | 'php'): string {
    const gateway = this.gateways.get(gatewayId);
    if (!gateway) return '';

    switch (language) {
      case 'javascript':
        return this.generateJavaScriptClient(gateway);
      case 'python':
        return this.generatePythonClient(gateway);
      case 'curl':
        return this.generateCurlExamples(gateway);
      case 'php':
        return this.generatePHPClient(gateway);
      default:
        return '';
    }
  }

  // Metrics and Monitoring
  async getEndpointMetrics(endpointId: string): Promise<APIMetrics | undefined> {
    // Note: timeRange parameter reserved for future implementation
    return this.metrics.get(endpointId);
  }

  async getGatewayMetrics(gatewayId: string): Promise<{
    totalRequests: number;
    totalEndpoints: number;
    averageResponseTime: number;
    errorRate: number;
    topEndpoints: { endpointId: string; requests: number }[];
  }> {
    const gateway = this.gateways.get(gatewayId);
    if (!gateway) {
      return {
        totalRequests: 0,
        totalEndpoints: 0,
        averageResponseTime: 0,
        errorRate: 0,
        topEndpoints: []
      };
    }

    // PERFORMANCE FIX: Optimize map().filter() pattern to avoid intermediate array
    const endpointMetrics: APIMetrics[] = [];
    let totalRequests = 0;
    let totalErrors = 0;
    for (const ep of gateway.endpoints) {
      const metric = this.metrics.get(ep.id);
      if (metric) {
        endpointMetrics.push(metric);
        totalRequests += metric.totalRequests;
        totalErrors += metric.errorRequests;
      }
    }

    const avgResponseTime = endpointMetrics.length > 0
      ? endpointMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / endpointMetrics.length
      : 0;

    return {
      totalRequests,
      totalEndpoints: gateway.endpoints.length,
      averageResponseTime: avgResponseTime,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      topEndpoints: endpointMetrics
        .sort((a, b) => b.totalRequests - a.totalRequests)
        .slice(0, 5)
        .map(m => ({ endpointId: m.endpointId, requests: m.totalRequests }))
    };
  }

  // Testing
  async testEndpoint(endpointId: string, testCase: {
    name: string;
    request: {
      headers?: { [key: string]: string };
      query?: { [key: string]: unknown };
      body?: unknown;
    };
    expectedStatus: number;
    expectedBody?: unknown;
  }): Promise<{
    success: boolean;
    actual: unknown;
    expected: unknown;
    errors: string[];
  }> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      return { success: false, actual: null, expected: null, errors: ['Endpoint not found'] };
    }

    const result = await this.executeEndpoint(endpointId, {
      method: endpoint.method,
      headers: testCase.request.headers || {},
      query: testCase.request.query || {},
      body: testCase.request.body,
      ip: '127.0.0.1',
      userAgent: 'Test Client'
    });

    const errors: string[] = [];

    if (result.status !== testCase.expectedStatus) {
      errors.push(`Expected status ${testCase.expectedStatus}, got ${result.status}`);
    }

    if (testCase.expectedBody && JSON.stringify(result.body) !== JSON.stringify(testCase.expectedBody)) {
      errors.push('Response body does not match expected');
    }

    return {
      success: errors.length === 0,
      actual: { status: result.status, body: result.body },
      expected: { status: testCase.expectedStatus, body: testCase.expectedBody },
      errors
    };
  }

  // Private Methods
  private async authenticateRequest(endpoint: APIEndpoint, request: unknown): Promise<{ success: boolean; error?: string; user?: unknown }> {
    if (!endpoint.authentication.required) {
      return { success: true };
    }

    const { type: _type } = endpoint.authentication;
    const type = _type;
    // Note: config is not used in this implementation
    const req = request as { headers?: { [key: string]: string } };

    switch (type) {
      case 'api_key': {
        const apiKey = req.headers?.['x-api-key'] || req.headers?.['authorization']?.replace('ApiKey ', '');
        if (!apiKey || !this.isValidAPIKey(apiKey)) {
          return { success: false, error: 'Invalid API key' };
        }
        return { success: true, user: { apiKey } };
      }

      case 'bearer': {
        const bearerToken = req.headers?.['authorization']?.replace('Bearer ', '');
        if (!bearerToken || !this.isValidBearerToken(bearerToken)) {
          return { success: false, error: 'Invalid bearer token' };
        }
        return { success: true, user: this.authTokens.get(bearerToken) };
      }

      case 'basic': {
        const basicAuth = req.headers?.['authorization']?.replace('Basic ', '');
        if (!basicAuth || !this.isValidBasicAuth(basicAuth)) {
          return { success: false, error: 'Invalid credentials' };
        }
        return { success: true };
      }

      default:
        return { success: false, error: 'Unsupported authentication type' };
    }
  }

   
  private async checkRateLimit(endpoint: APIEndpoint, _request: unknown): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    if (!endpoint.rateLimit.enabled) {
      return { allowed: true, remaining: 999, resetTime: Date.now() + 3600000 };
    }

    // Simple in-memory rate limiting (in production, use Redis or similar)
    // const _key = `${endpoint.id}:${request.ip}`; // Reserved for future rate limiting implementation

    // Mock implementation
    const now = Date.now();
    const window = endpoint.rateLimit.window * 1000;

    return {
      allowed: true,
      remaining: endpoint.rateLimit.requests - 1,
      resetTime: now + window
    };
  }

  private async validateRequest(endpoint: APIEndpoint, request: unknown): Promise<{ valid: boolean; errors?: string[] }> {
    if (!endpoint.validation.enabled) {
      return { valid: true };
    }

    const errors: string[] = [];
    const req = request as { query?: { [key: string]: unknown }; headers?: { [key: string]: string }; body?: unknown };

    // Validate required query parameters
    endpoint.request.queryParams.forEach(param => {
      if (param.required && !req.query?.[param.name]) {
        errors.push(`Missing required query parameter: ${param.name}`);
      }
    });

    // Validate required headers
    endpoint.request.headers.forEach(param => {
      if (param.required && !req.headers?.[param.name.toLowerCase()]) {
        errors.push(`Missing required header: ${param.name}`);
      }
    });

    // Validate body schema (simplified)
    if (endpoint.request.bodySchema && req.body) {
      const bodyValidation = this.validateSchema(req.body, endpoint.request.bodySchema);
      if (!bodyValidation.valid) {
        errors.push(...bodyValidation.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async executeWorkflow(endpoint: APIEndpoint, request: unknown): Promise<{ status: number; headers: { [key: string]: string }; body: unknown }> {
    const req = request as { body?: unknown };

    // If workflow is specified, execute it
    if (endpoint.workflow.workflowId) {
      // Mock workflow execution
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { message: 'Workflow executed successfully', data: req.body }
      };
    }

    // Apply transformations
    let responseData: unknown = req.body || {};

    for (const transformation of endpoint.workflow.transformations) {
      if (transformation.enabled) {
        responseData = this.applyTransformation(responseData, transformation);
      }
    }

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: responseData
    };
  }

  private applyTransformation(data: unknown, transformation: APITransformation): unknown {
    const config = transformation.config as { mapping?: { [key: string]: string }; filters?: unknown[]; script?: string };

    switch (transformation.type) {
      case 'map':
        // Apply field mapping
        return this.mapFields(data, config.mapping || {});
      case 'filter':
        // Filter data
        return this.filterData(data, config.filters || []);
      case 'transform':
        // Custom transformation
        return this.transformData(data, config.script || '');
      default:
        return data;
    }
  }

  private mapFields(data: unknown, mapping: { [sourceField: string]: string }): unknown {
    const result: Record<string, unknown> = {};
    const dataObj = data as Record<string, unknown>;
    Object.entries(mapping).forEach(([source, target]) => {
      if (dataObj[source] !== undefined) {
        result[target] = dataObj[source];
      }
    });
    return result;
  }

  private filterData(data: unknown, _filters: unknown[]): unknown {
    // Note: filters parameter reserved for future implementation
    // Simple filtering logic
    return data;
  }

  private transformData(data: unknown, script: string): unknown {
    // Safe transformation execution using JSON parsing instead of eval
    try {
      const dataObj = data as Record<string, unknown>;
      // Only allow simple transformations using JSON path syntax
      // In production, use a proper sandboxed expression evaluator
      if (script.includes('return') && script.includes('data')) {
        // Basic transformation: extract or rename fields
        const transformed: Record<string, unknown> = {};

        // Simple field mapping (this is a basic implementation)
        // For production, use a library like jsonpath or jexl
        if (script.includes('data.')) {
          const fieldMatch = script.match(/data\.(\w+)/g);
          if (fieldMatch) {
            fieldMatch.forEach(match => {
              const field = match.replace('data.', '');
              if (dataObj[field] !== undefined) {
                transformed[field] = dataObj[field];
              }
            });
          }
          return Object.keys(transformed).length > 0 ? transformed : data;
        }
      }

      // For complex transformations, return the original data
      logger.warn('Complex transformation skipped for security reasons');
      return data;
    } catch (error) {
      logger.error('Transformation error:', error);
      return data;
    }
  }

  private validateSchema(data: unknown, schema: APISchema): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const dataObj = data as Record<string, unknown>;

    // Basic type validation
    if (schema.type === 'object' && typeof data !== 'object') {
      errors.push(`Expected object, got ${typeof data}`);
    }

    // Required fields validation
    if (schema.required && schema.properties) {
      schema.required.forEach(field => {
        if (dataObj[field] === undefined) {
          errors.push(`Missing required field: ${field}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private logRequest(endpointId: string, request: unknown, status: number, error: unknown, responseTime: number, response?: unknown): void {
    const req = request as {
      method?: string;
      path?: string;
      headers?: { [key: string]: string };
      query?: { [key: string]: unknown };
      body?: unknown;
      user?: { id?: string };
      ip?: string;
      userAgent?: string;
    };

    const logEntry: APIRequest = {
      id: this.generateId(),
      endpointId,
      method: req.method || 'GET',
      path: req.path || '/',
      headers: req.headers || {},
      query: req.query || {},
      body: req.body,
      timestamp: new Date(),
      responseTime,
      status,
      response,
      error: error ? String(error) : undefined,
      userId: req.user?.id,
      ip: req.ip || '',
      userAgent: req.userAgent || ''
    };

    this.requests.push(logEntry);

    // Keep only last 10000 requests
    if (this.requests.length > 10000) {
      this.requests.shift();
    }
  }

  private updateMetrics(endpointId: string, responseTime: number, status: number): void {
    const metrics = this.metrics.get(endpointId);
    if (!metrics) return;

    metrics.totalRequests++;
    if (status >= 200 && status < 400) {
      metrics.successfulRequests++;
    } else {
      metrics.errorRequests++;
    }

    // Update response time statistics
    const totalTime = metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime;
    metrics.averageResponseTime = totalTime / metrics.totalRequests;

    metrics.errorRate = (metrics.errorRequests / metrics.totalRequests) * 100;
    metrics.lastRequest = new Date();

    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    if (!metrics.dailyStats[today]) {
      metrics.dailyStats[today] = {
        date: today,
        requests: 0,
        errors: 0,
        avgResponseTime: 0,
        uniqueUsers: 0
      };
    }

    const dayStats = metrics.dailyStats[today];
    dayStats.requests++;
    if (status >= 400) dayStats.errors++;
    dayStats.avgResponseTime = ((dayStats.avgResponseTime * (dayStats.requests - 1)) + responseTime) / dayStats.requests;
  }

  private initializeMetrics(endpointId: string): void {
    const metrics: APIMetrics = {
      endpointId,
      totalRequests: 0,
      successfulRequests: 0,
      errorRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorRate: 0,
      rateLimitHits: 0,
      authFailures: 0,
      dailyStats: {}
    };

    this.metrics.set(endpointId, metrics);
  }

  private initializeDefaultGateway(): void {
    const defaultGateway: APIGateway = {
      id: 'gateway-001',
      name: 'Default API Gateway',
      description: 'Default gateway for workflow APIs',
      baseUrl: 'https://api.workflowpro.com/v1',
      version: '1.0.0',
      endpoints: [],
      globalSettings: {
        cors: {
          enabled: true,
          origins: ['*'],
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          headers: ['Content-Type', 'Authorization']
        },
        rateLimit: {
          enabled: true,
          global: true,
          requests: 1000,
          window: 3600
        },
        security: {
          https: true,
          hsts: true,
          contentTypeValidation: true
        },
        monitoring: {
          enabled: true,
          metrics: true,
          logging: true
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.gateways.set(defaultGateway.id, defaultGateway);
  }

  private generateJavaScriptClient(gateway: APIGateway): string {
    return `
class ${this.toPascalCase(gateway.name)}API {
  constructor(baseUrl = '${gateway.baseUrl}', apiKey = null) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async request(method, path, data = null, headers = {}) {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (this.apiKey) {
      config.headers['Authorization'] = \`Bearer \${this.apiKey}\`;
    }

    if (data) {
      config.body = JSON.stringify(data);
    }

    return await response.json();
  }

${gateway.endpoints.map(endpoint => `
  async ${this.toCamelCase(endpoint.name)}(${this.generateJSParams(endpoint)}) {
    return await this.request('${endpoint.method}', '${endpoint.path}', data, headers);
  }`).join('\n')}
}

export default ${this.toPascalCase(gateway.name)}API;
    `.trim();
  }

  private generatePythonClient(gateway: APIGateway): string {
    return `
import requests
import json

class ${this.toPascalCase(gateway.name)}API:
    def __init__(self, base_url='${gateway.baseUrl}', api_key=None):
        self.base_url = base_url
        self.api_key = api_key

    def request(self, method, path, data=None, headers=None):
        url = f"{self.base_url}{path}"
        headers = headers or {}
        headers['Content-Type'] = 'application/json'
        
        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'
        
        response = requests.request(method, url, 
                                  json=data if data else None, 
                                  headers=headers)
        return response.json()

${gateway.endpoints.map(endpoint => `
    def ${this.toSnakeCase(endpoint.name)}(self, ${this.generatePythonParams(endpoint)}):
        return self.request('${endpoint.method}', '${endpoint.path}', data, headers)`).join('\n')}
    `.trim();
  }

  private generateCurlExamples(gateway: APIGateway): string {
    return gateway.endpoints.map(endpoint => `
# ${endpoint.name}
curl -X ${endpoint.method} \\
  ${gateway.baseUrl}${endpoint.path} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  ${endpoint.method !== 'GET' ? `-d '${JSON.stringify(endpoint.documentation.examples[0]?.request.body || {}, null, 2)}'` : ''}
    `).join('\n');
  }

  private generatePHPClient(gateway: APIGateway): string {
    return `
<?php

class ${this.toPascalCase(gateway.name)}API {
    private $baseUrl;
    private $apiKey;

    public function __construct($baseUrl = '${gateway.baseUrl}', $apiKey = null) {
        $this->baseUrl = $baseUrl;
        $this->apiKey = $apiKey;
    }

    private function request($method, $path, $data = null, $headers = []) {
        $url = $this->baseUrl . $path;
        $headers['Content-Type'] = 'application/json';
        
        if ($this->apiKey) {
            $headers['Authorization'] = 'Bearer ' . $this->apiKey;
        }

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }

${gateway.endpoints.map(endpoint => `
    public function ${this.toCamelCase(endpoint.name)}($data = null, $headers = []) {
        return $this->request('${endpoint.method}', '${endpoint.path}', $data, $headers);
    }`).join('\n')}
}
    `.trim();
  }

  private isValidAPIKey(apiKey: string): boolean {
    // Mock validation
    return apiKey.length > 10;
  }

  private isValidBearerToken(token: string): boolean {
    return this.authTokens.has(token);
  }

  private isValidBasicAuth(_auth: string): boolean {
    // Mock validation
    return _auth.length > 0;
  }

  private generateJSParams(_endpoint: APIEndpoint): string {
    const params = ['data = null', 'headers = {}'];
    return params.join(', ');
  }

  private generatePythonParams(_endpoint: APIEndpoint): string {
    const params = ['data=None', 'headers=None'];
    return params.join(', ');
  }

  private toCamelCase(str: string): string {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
  }

  private toPascalCase(str: string): string {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => {
      return word.toUpperCase();
    }).replace(/\s+/g, '');
  }

  private toSnakeCase(str: string): string {
    return str.replace(/\W+/g, ' ')
      .split(/ |\B(?=[A-Z])/)
      .map(word => word.toLowerCase())
      .join('_');
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

// Singleton instance
export const apiBuilderService = new APIBuilderService();
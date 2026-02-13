/**
 * API Builder System
 * Create custom API endpoints for workflows
 */

import type { Request, Response, NextFunction, Application, Router } from 'express';
import { WorkflowExecutor } from '../components/ExecutionEngine';
import { useWorkflowStore } from '../store/workflowStore';
import { logger } from '../services/SimpleLogger';
import { z } from 'zod';
import * as jwt from 'jsonwebtoken';

export interface APIEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  workflowId: string;
  name: string;
  description?: string;
  authentication?: {
    type: 'none' | 'api_key' | 'jwt' | 'oauth2' | 'basic';
    config?: any;
  };
  inputValidation?: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
    headers?: z.ZodSchema;
  };
  outputTransform?: {
    type: 'json' | 'xml' | 'csv' | 'custom';
    config?: any;
  };
  rateLimit?: {
    windowMs: number;
    max: number;
    message?: string;
  };
  cors?: {
    origins: string[];
    methods?: string[];
    credentials?: boolean;
  };
  webhook?: {
    enabled: boolean;
    url?: string;
    events?: string[];
  };
  cache?: {
    enabled: boolean;
    ttl: number;
    key?: string;
  };
  versioning?: {
    version: string;
    deprecated?: boolean;
    sunsetDate?: Date;
  };
  metrics?: {
    enabled: boolean;
    customMetrics?: string[];
  };
  documentation?: {
    summary?: string;
    requestExample?: any;
    responseExample?: any;
    errors?: Array<{ code: number; message: string }>;
  };
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class APIBuilder {
  private app: Application;
  private endpoints: Map<string, APIEndpoint> = new Map();
  private router: Router;
  private cache: Map<string, { data: any; expires: number }> = new Map();
  private metrics: Map<string, number> = new Map();
  private express: any;
  private helmet: any;
  private cors: any;
  private rateLimit: any;

  constructor() {
    // Dynamic imports to avoid esModuleInterop issues
    this.express = require('express');
    this.helmet = require('helmet');
    this.cors = require('cors');
    this.rateLimit = require('express-rate-limit');

    this.app = this.express();
    this.router = this.express.Router();

    this.setupMiddleware();
    this.startCacheCleanup();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security headers
    this.app.use(this.helmet());

    // CORS
    this.app.use(this.cors());

    // Body parsing
    this.app.use(this.express.json({ limit: '10mb' }));
    this.app.use(this.express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`API Request: ${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      next();
    });

    // Error handling
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('API Error:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });
  }

  /**
   * Create a new API endpoint
   */
  createEndpoint(endpoint: Omit<APIEndpoint, 'id' | 'createdAt' | 'updatedAt'>): APIEndpoint {
    const fullEndpoint: APIEndpoint = {
      ...endpoint,
      id: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate endpoint
    this.validateEndpoint(fullEndpoint);
    
    // Store endpoint
    this.endpoints.set(fullEndpoint.id, fullEndpoint);
    
    // Register route
    this.registerRoute(fullEndpoint);
    
    logger.info(`Created API endpoint: ${fullEndpoint.method} ${fullEndpoint.path}`);
    
    return fullEndpoint;
  }

  /**
   * Validate endpoint configuration
   */
  private validateEndpoint(endpoint: APIEndpoint): void {
    // Check if workflow exists
    const workflows = (useWorkflowStore.getState() as any).workflows;
    const workflow = workflows.find((w: any) => w.id === endpoint.workflowId);

    if (!workflow) {
      throw new Error(`Workflow ${endpoint.workflowId} not found`);
    }

    // Check for path conflicts
    const existingEndpoints = Array.from(this.endpoints.values());
    for (const existing of existingEndpoints) {
      if (existing.path === endpoint.path && existing.method === endpoint.method) {
        throw new Error(`Endpoint ${endpoint.method} ${endpoint.path} already exists`);
      }
    }

    // Validate path format
    if (!endpoint.path.startsWith('/')) {
      throw new Error('Endpoint path must start with /');
    }
  }

  /**
   * Register route in Express
   */
  private registerRoute(endpoint: APIEndpoint): void {
    const handlers: any[] = [];

    // Add CORS if configured
    if (endpoint.cors) {
      handlers.push(this.cors({
        origin: endpoint.cors.origins,
        methods: endpoint.cors.methods,
        credentials: endpoint.cors.credentials
      }));
    }

    // Add rate limiting
    if (endpoint.rateLimit) {
      handlers.push(this.rateLimit({
        windowMs: endpoint.rateLimit.windowMs,
        max: endpoint.rateLimit.max,
        message: endpoint.rateLimit.message || 'Too many requests'
      }));
    }

    // Add authentication
    if (endpoint.authentication && endpoint.authentication.type !== 'none') {
      handlers.push(this.createAuthMiddleware(endpoint.authentication));
    }

    // Add input validation
    if (endpoint.inputValidation) {
      handlers.push(this.createValidationMiddleware(endpoint.inputValidation));
    }

    // Add cache check
    if (endpoint.cache?.enabled) {
      handlers.push(this.createCacheMiddleware(endpoint));
    }

    // Add main handler
    handlers.push(this.createRequestHandler(endpoint));

    // Register route based on method
    const method = endpoint.method.toLowerCase() as keyof Router;
    (this.router[method] as Function)(endpoint.path, ...handlers);
  }

  /**
   * Create authentication middleware
   */
  private createAuthMiddleware(auth: APIEndpoint['authentication']): any {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        switch (auth?.type) {
          case 'api_key':
            const apiKey = req.headers['x-api-key'] || req.query.api_key;
            if (!apiKey || apiKey !== auth.config?.apiKey) {
              return res.status(401).json({ error: 'Invalid API key' });
            }
            break;
          
          case 'jwt':
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
              return res.status(401).json({ error: 'No token provided' });
            }
            
            try {
              const decoded = jwt.verify(token, auth.config?.secret || 'secret');
              (req as any).user = decoded;
            } catch (error) {
              return res.status(401).json({ error: 'Invalid token' });
            }
            break;
          
          case 'basic':
            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith('Basic ')) {
              return res.status(401).json({ error: 'Missing basic auth' });
            }
            
            const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
            const [username, password] = credentials.split(':');
            
            if (username !== auth.config?.username || password !== auth.config?.password) {
              return res.status(401).json({ error: 'Invalid credentials' });
            }
            break;
          
          case 'oauth2':
            // OAuth2 implementation would go here
            const accessToken = req.headers.authorization?.replace('Bearer ', '');
            if (!accessToken) {
              return res.status(401).json({ error: 'No access token' });
            }
            // Validate with OAuth2 provider
            break;
        }
        
        next();
      } catch (error) {
        res.status(401).json({ error: 'Authentication failed' });
      }
    };
  }

  /**
   * Create validation middleware
   */
  private createValidationMiddleware(validation: APIEndpoint['inputValidation']): any {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        if (validation?.body) {
          req.body = validation.body.parse(req.body);
        }
        
        if (validation?.query) {
          req.query = validation.query.parse(req.query);
        }
        
        if (validation?.params) {
          req.params = validation.params.parse(req.params);
        }
        
        if (validation?.headers) {
          const parsed = validation.headers.parse(req.headers);
          Object.assign(req.headers, parsed);
        }
        
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            error: 'Validation failed',
            details: error.errors
          });
        } else {
          res.status(400).json({ error: 'Invalid input' });
        }
      }
    };
  }

  /**
   * Create cache middleware
   */
  private createCacheMiddleware(endpoint: APIEndpoint): any {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!endpoint.cache?.enabled) {
        return next();
      }
      
      const cacheKey = this.getCacheKey(endpoint, req);
      const cached = this.cache.get(cacheKey);
      
      if (cached && cached.expires > Date.now()) {
        logger.debug(`Cache hit for ${cacheKey}`);
        return res.json(cached.data);
      }
      
      // Store original send function
      const originalSend = res.json.bind(res);
      
      // Override send to cache response
      res.json = (data: any) => {
        this.cache.set(cacheKey, {
          data,
          expires: Date.now() + (endpoint.cache?.ttl || 60000)
        });
        return originalSend(data);
      };
      
      next();
    };
  }

  /**
   * Create main request handler
   */
  private createRequestHandler(endpoint: APIEndpoint): any {
    return async (req: Request, res: Response) => {
      const startTime = Date.now();

      try {
        // Get workflow
        const workflow = (useWorkflowStore.getState() as any).workflows.find(
          (w: any) => w.id === endpoint.workflowId
        );

        if (!workflow) {
          throw new Error('Workflow not found');
        }

        // Create workflow executor with workflow nodes and edges
        const workflowExecutor = new WorkflowExecutor(
          workflow.nodes || [],
          workflow.edges || []
        );

        // Prepare workflow input
        const workflowInput = {
          method: req.method,
          path: req.path,
          params: req.params,
          query: req.query,
          body: req.body,
          headers: req.headers,
          user: (req as any).user
        };

        // Execute workflow - returns Map<string, NodeExecutionResult>
        const executionResults = await workflowExecutor.execute();

        // Check if execution was successful
        const hasErrors = Array.from(executionResults.values()).some(
          result => result.status === 'error'
        );
        const success = !hasErrors && executionResults.size > 0;

        // Get output from last node or aggregate all results
        const allResults = Array.from(executionResults.values());
        const output = allResults.length > 0
          ? allResults[allResults.length - 1].data
          : {};

        // Get error information if any
        const errorResult = allResults.find(r => r.status === 'error');
        const error = errorResult?.error?.message || null;
        const errorDetails = errorResult?.error || null;

        // Record metrics
        if (endpoint.metrics?.enabled) {
          this.recordMetrics(endpoint, Date.now() - startTime, success);
        }

        // Send webhook if configured
        if (endpoint.webhook?.enabled && endpoint.webhook.url) {
          this.sendWebhook(endpoint.webhook.url, {
            endpoint: endpoint.id,
            result: { success, output, error, errorDetails },
            timestamp: new Date()
          });
        }

        // Transform output
        const transformedOutput = this.transformOutput(output, endpoint.outputTransform);

        // Send response
        if (success) {
          res.status(200).json(transformedOutput);
        } else {
          res.status(500).json({
            error: error || 'Workflow execution failed',
            details: errorDetails
          });
        }
      } catch (error) {
        logger.error(`API endpoint error: ${endpoint.path}`, error);
        res.status(500).json({
          error: 'Internal server error',
          message: (error as Error).message
        });
      }
    };
  }

  /**
   * Get cache key for request
   */
  private getCacheKey(endpoint: APIEndpoint, req: Request): string {
    if (endpoint.cache?.key) {
      return endpoint.cache.key;
    }
    
    const parts = [
      endpoint.id,
      req.method,
      req.path,
      JSON.stringify(req.query),
      JSON.stringify(req.body)
    ];
    
    return parts.join(':');
  }

  /**
   * Transform output based on configuration
   */
  private transformOutput(data: any, transform?: APIEndpoint['outputTransform']): any {
    if (!transform) {
      return data;
    }
    
    switch (transform.type) {
      case 'xml':
        // XML transformation would go here
        return data;
      
      case 'csv':
        // CSV transformation would go here
        return data;
      
      case 'custom':
        if (transform.config?.transformer) {
          return transform.config.transformer(data);
        }
        return data;
      
      case 'json':
      default:
        return data;
    }
  }

  /**
   * Record metrics for endpoint
   */
  private recordMetrics(endpoint: APIEndpoint, duration: number, success: boolean): void {
    const key = `${endpoint.id}:requests`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
    
    const successKey = `${endpoint.id}:success`;
    if (success) {
      this.metrics.set(successKey, (this.metrics.get(successKey) || 0) + 1);
    }
    
    const durationKey = `${endpoint.id}:duration`;
    const current = this.metrics.get(durationKey) || 0;
    this.metrics.set(durationKey, (current + duration) / 2);
    
    logger.metric('api.request', 1, 'count', {
      endpoint: endpoint.path,
      method: endpoint.method,
      success: String(success)
    });
    
    logger.metric('api.duration', duration, 'ms', {
      endpoint: endpoint.path,
      method: endpoint.method
    });
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(url: string, data: any): Promise<void> {
    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    } catch (error) {
      logger.error('Webhook send failed:', error);
    }
  }

  /**
   * Update endpoint
   */
  updateEndpoint(id: string, updates: Partial<APIEndpoint>): APIEndpoint {
    const endpoint = this.endpoints.get(id);
    
    if (!endpoint) {
      throw new Error(`Endpoint ${id} not found`);
    }
    
    const updated = {
      ...endpoint,
      ...updates,
      id: endpoint.id,
      createdAt: endpoint.createdAt,
      updatedAt: new Date()
    };
    
    this.endpoints.set(id, updated);
    
    // Re-register route if path or method changed
    if (updates.path || updates.method) {
      this.unregisterRoute(endpoint);
      this.registerRoute(updated);
    }
    
    return updated;
  }

  /**
   * Delete endpoint
   */
  deleteEndpoint(id: string): void {
    const endpoint = this.endpoints.get(id);
    
    if (!endpoint) {
      throw new Error(`Endpoint ${id} not found`);
    }
    
    this.unregisterRoute(endpoint);
    this.endpoints.delete(id);
    
    logger.info(`Deleted API endpoint: ${endpoint.method} ${endpoint.path}`);
  }

  /**
   * Unregister route from Express
   */
  private unregisterRoute(endpoint: APIEndpoint): void {
    // Remove route from router stack
    const stack = this.router.stack;
    const index = stack.findIndex((layer: any) => 
      layer.route?.path === endpoint.path &&
      layer.route?.methods[endpoint.method.toLowerCase()]
    );
    
    if (index >= 0) {
      stack.splice(index, 1);
    }
  }

  /**
   * Get all endpoints
   */
  getAllEndpoints(): APIEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * Get endpoint by ID
   */
  getEndpoint(id: string): APIEndpoint | undefined {
    return this.endpoints.get(id);
  }

  /**
   * Get endpoints for workflow
   */
  getEndpointsByWorkflow(workflowId: string): APIEndpoint[] {
    return Array.from(this.endpoints.values()).filter(
      e => e.workflowId === workflowId
    );
  }

  /**
   * Generate OpenAPI documentation
   */
  generateOpenAPISpec(): any {
    const paths: any = {};

    const endpointsArray = Array.from(this.endpoints.values());
    for (const endpoint of endpointsArray) {
      if (!endpoint.enabled) continue;

      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }

      paths[endpoint.path][endpoint.method.toLowerCase()] = {
        summary: endpoint.documentation?.summary || endpoint.description,
        description: endpoint.description,
        operationId: endpoint.id,
        tags: [`Workflow: ${endpoint.workflowId}`],
        parameters: this.generateOpenAPIParameters(endpoint),
        requestBody: endpoint.inputValidation?.body ? {
          required: true,
          content: {
            'application/json': {
              schema: {},
              example: endpoint.documentation?.requestExample
            }
          }
        } : undefined,
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                example: endpoint.documentation?.responseExample
              }
            }
          },
          ...(endpoint.documentation?.errors?.reduce((acc, err) => ({
            ...acc,
            [err.code]: { description: err.message }
          }), {}) || {})
        },
        security: this.generateOpenAPISecurity(endpoint)
      };
    }
    
    return {
      openapi: '3.0.0',
      info: {
        title: 'Workflow API',
        version: '1.0.0',
        description: 'Auto-generated API from workflows'
      },
      servers: [
        {
          url: process.env.API_BASE_URL || 'http://localhost:3000',
          description: 'API Server'
        }
      ],
      paths,
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
          },
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          },
          basicAuth: {
            type: 'http',
            scheme: 'basic'
          }
        }
      }
    };
  }

  /**
   * Generate OpenAPI parameters
   */
  private generateOpenAPIParameters(endpoint: APIEndpoint): any[] {
    const params: any[] = [];
    
    // Extract path parameters
    const pathParams = endpoint.path.match(/:(\w+)/g);
    if (pathParams) {
      pathParams.forEach(param => {
        params.push({
          name: param.slice(1),
          in: 'path',
          required: true,
          schema: { type: 'string' }
        });
      });
    }
    
    // Add query parameters if validation exists
    if (endpoint.inputValidation?.query) {
      // Would parse Zod schema to generate params
    }
    
    return params;
  }

  /**
   * Generate OpenAPI security
   */
  private generateOpenAPISecurity(endpoint: APIEndpoint): any[] {
    if (!endpoint.authentication || endpoint.authentication.type === 'none') {
      return [];
    }
    
    switch (endpoint.authentication.type) {
      case 'api_key':
        return [{ apiKey: [] }];
      case 'jwt':
        return [{ bearerAuth: [] }];
      case 'basic':
        return [{ basicAuth: [] }];
      default:
        return [];
    }
  }

  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const cacheEntries = Array.from(this.cache.entries());
      for (const [key, value] of cacheEntries) {
        if (value.expires < now) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Get metrics for endpoint
   */
  getMetrics(endpointId?: string): any {
    if (endpointId) {
      return {
        requests: this.metrics.get(`${endpointId}:requests`) || 0,
        success: this.metrics.get(`${endpointId}:success`) || 0,
        avgDuration: this.metrics.get(`${endpointId}:duration`) || 0
      };
    }

    // Return all metrics
    const allMetrics: any = {};
    const metricsEntries = Array.from(this.metrics.entries());
    for (const [key, value] of metricsEntries) {
      allMetrics[key] = value;
    }
    return allMetrics;
  }

  /**
   * Get Express router
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Get Express app
   */
  getApp(): Application {
    this.app.use('/api/custom', this.router);
    return this.app;
  }
}

// Export singleton instance
export const apiBuilder = new APIBuilder();
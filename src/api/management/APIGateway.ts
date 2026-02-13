/**
 * API Gateway
 * Comprehensive API management with authentication, transformation, and analytics
 */

import { EventEmitter } from 'events';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Gateway configuration
 */
export interface GatewayConfig {
  authentication?: AuthenticationConfig;
  transformation?: TransformationConfig;
  analytics?: AnalyticsConfig;
  cors?: CORSConfig;
}

/**
 * Authentication configuration
 */
export interface AuthenticationConfig {
  methods: ('apiKey' | 'oauth2' | 'jwt' | 'basic')[];
  apiKeyHeader?: string;
  jwtSecret?: string;
  jwtIssuer?: string;
  oauth2?: OAuth2Config;
}

/**
 * OAuth2 configuration
 */
export interface OAuth2Config {
  authorizationURL: string;
  tokenURL: string;
  clientId: string;
  clientSecret: string;
  scope: string[];
}

/**
 * Transformation configuration
 */
export interface TransformationConfig {
  requestTransforms?: Transform[];
  responseTransforms?: Transform[];
}

/**
 * Transform definition
 */
export interface Transform {
  name: string;
  type: 'header' | 'body' | 'query';
  operation: 'add' | 'remove' | 'modify';
  path?: string;
  value?: any;
  condition?: (context: any) => boolean;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  enabled: boolean;
  sampleRate?: number;
  metrics?: string[];
}

/**
 * CORS configuration
 */
export interface CORSConfig {
  origin: string | string[];
  methods: string[];
  credentials: boolean;
  maxAge?: number;
}

/**
 * API request context
 */
export interface APIContext {
  requestId: string;
  userId?: string;
  apiKey?: string;
  scopes: string[];
  startTime: number;
  metadata: Record<string, any>;
}

/**
 * API analytics event
 */
export interface AnalyticsEvent {
  requestId: string;
  timestamp: Date;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userId?: string;
  apiKey?: string;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * APIGateway manages API access and transformations
 */
export class APIGateway extends EventEmitter {
  private config: GatewayConfig;
  private apiKeys: Map<string, { userId: string; scopes: string[]; active: boolean }> = new Map();
  private analytics: AnalyticsEvent[] = [];
  private requestCounts: Map<string, number> = new Map();

  constructor(config: GatewayConfig) {
    super();
    this.config = config;
  }

  /**
   * Create Express middleware
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const requestId = this.generateRequestId();
      const startTime = Date.now();

      // Create context
      const context: APIContext = {
        requestId,
        scopes: [],
        startTime,
        metadata: {}
      };

      // Attach context to request
      (req as any).apiContext = context;

      try {
        // Authenticate
        if (this.config.authentication) {
          await this.authenticate(req, context);
        }

        // Transform request
        if (this.config.transformation?.requestTransforms) {
          await this.transformRequest(req, context);
        }

        // Intercept response
        const originalSend = res.send;
        res.send = ((body: any) => {
          // Transform response
          if (this.config.transformation?.responseTransforms) {
            body = this.transformResponse(body, context);
          }

          // Record analytics
          if (this.config.analytics?.enabled) {
            this.recordAnalytics({
              requestId,
              timestamp: new Date(),
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              duration: Date.now() - startTime,
              userId: context.userId,
              apiKey: context.apiKey
            });
          }

          return originalSend.call(res, body);
        }) as any;

        next();
      } catch (error) {
        // Record error
        if (this.config.analytics?.enabled) {
          this.recordAnalytics({
            requestId,
            timestamp: new Date(),
            method: req.method,
            path: req.path,
            statusCode: 401,
            duration: Date.now() - startTime,
            error: (error as Error).message
          });
        }

        res.status(401).json({
          error: 'Authentication failed',
          message: (error as Error).message
        });
      }
    };
  }

  /**
   * Authenticate request
   */
  private async authenticate(req: Request, context: APIContext): Promise<void> {
    const methods = this.config.authentication!.methods;

    // Try each authentication method
    for (const method of methods) {
      try {
        switch (method) {
          case 'apiKey':
            await this.authenticateAPIKey(req, context);
            return;
          case 'jwt':
            await this.authenticateJWT(req, context);
            return;
          case 'oauth2':
            await this.authenticateOAuth2(req, context);
            return;
          case 'basic':
            await this.authenticateBasic(req, context);
            return;
        }
      } catch {
        // Try next method
        continue;
      }
    }

    throw new Error('No valid authentication method found');
  }

  /**
   * Authenticate with API key
   */
  private async authenticateAPIKey(req: Request, context: APIContext): Promise<void> {
    const header = this.config.authentication?.apiKeyHeader || 'x-api-key';
    const apiKey = req.headers[header] as string;

    if (!apiKey) {
      throw new Error('API key not provided');
    }

    const keyData = this.apiKeys.get(apiKey);

    if (!keyData || !keyData.active) {
      throw new Error('Invalid API key');
    }

    context.userId = keyData.userId;
    context.apiKey = apiKey;
    context.scopes = keyData.scopes;
  }

  /**
   * Authenticate with JWT
   */
  private async authenticateJWT(req: Request, context: APIContext): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('JWT token not provided');
    }

    const token = authHeader.substring(7);
    const secret = this.config.authentication?.jwtSecret;

    if (!secret) {
      throw new Error('JWT secret not configured');
    }

    try {
      const decoded = jwt.verify(token, secret) as any;

      context.userId = decoded.sub || decoded.userId;
      context.scopes = decoded.scopes || [];
      context.metadata = decoded;
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }

  /**
   * Authenticate with OAuth2
   */
  private async authenticateOAuth2(req: Request, context: APIContext): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('OAuth2 token not provided');
    }

    const token = authHeader.substring(7);

    // Validate token with OAuth2 provider
    // This is a placeholder - actual implementation would call provider's introspection endpoint
    const isValid = await this.validateOAuth2Token(token);

    if (!isValid) {
      throw new Error('Invalid OAuth2 token');
    }

    context.userId = 'oauth2-user';
    context.scopes = ['read', 'write'];
  }

  /**
   * Authenticate with Basic auth
   */
  private async authenticateBasic(req: Request, context: APIContext): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new Error('Basic auth credentials not provided');
    }

    const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
    const [username, password] = credentials.split(':');

    // Validate credentials (placeholder)
    const isValid = await this.validateBasicCredentials(username, password);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    context.userId = username;
    context.scopes = ['read'];
  }

  /**
   * Transform request
   */
  private async transformRequest(req: Request, context: APIContext): Promise<void> {
    const transforms = this.config.transformation!.requestTransforms!;

    for (const transform of transforms) {
      // Check condition
      if (transform.condition && !transform.condition(context)) {
        continue;
      }

      switch (transform.type) {
        case 'header':
          this.transformHeader(req.headers, transform);
          break;
        case 'body':
          this.transformBody(req.body, transform);
          break;
        case 'query':
          this.transformQuery(req.query, transform);
          break;
      }
    }
  }

  /**
   * Transform response
   */
  private transformResponse(body: any, context: APIContext): any {
    const transforms = this.config.transformation?.responseTransforms || [];

    for (const transform of transforms) {
      // Check condition
      if (transform.condition && !transform.condition(context)) {
        continue;
      }

      if (transform.type === 'body') {
        body = this.applyTransform(body, transform);
      }
    }

    return body;
  }

  /**
   * Transform header
   */
  private transformHeader(headers: any, transform: Transform): void {
    if (transform.operation === 'add') {
      headers[transform.path!] = transform.value;
    } else if (transform.operation === 'remove') {
      delete headers[transform.path!];
    } else if (transform.operation === 'modify') {
      if (headers[transform.path!]) {
        headers[transform.path!] = transform.value;
      }
    }
  }

  /**
   * Transform body
   */
  private transformBody(body: any, transform: Transform): void {
    this.applyTransform(body, transform);
  }

  /**
   * Transform query
   */
  private transformQuery(query: any, transform: Transform): void {
    this.applyTransform(query, transform);
  }

  /**
   * Apply transform to object
   */
  private applyTransform(obj: any, transform: Transform): any {
    if (transform.operation === 'add') {
      this.setNestedValue(obj, transform.path!, transform.value);
    } else if (transform.operation === 'remove') {
      this.deleteNestedValue(obj, transform.path!);
    } else if (transform.operation === 'modify') {
      this.setNestedValue(obj, transform.path!, transform.value);
    }

    return obj;
  }

  /**
   * Set nested value in object
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Delete nested value from object
   */
  private deleteNestedValue(obj: any, path: string): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        return;
      }
      current = current[keys[i]];
    }

    delete current[keys[keys.length - 1]];
  }

  /**
   * Record analytics event
   */
  private recordAnalytics(event: AnalyticsEvent): void {
    // Sample if configured
    const sampleRate = this.config.analytics?.sampleRate || 1;
    if (Math.random() > sampleRate) {
      return;
    }

    this.analytics.push(event);

    // Keep only last 10000 events
    if (this.analytics.length > 10000) {
      this.analytics.shift();
    }

    // Update request counts
    const key = `${event.method}:${event.path}`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);

    this.emit('analytics:event', event);
  }

  /**
   * Create API key
   */
  createAPIKey(userId: string, scopes: string[]): string {
    const apiKey = this.generateAPIKey();

    this.apiKeys.set(apiKey, {
      userId,
      scopes,
      active: true
    });

    return apiKey;
  }

  /**
   * Revoke API key
   */
  revokeAPIKey(apiKey: string): void {
    const keyData = this.apiKeys.get(apiKey);

    if (keyData) {
      keyData.active = false;
      this.apiKeys.set(apiKey, keyData);
    }
  }

  /**
   * Get analytics
   */
  getAnalytics(filter?: { startTime?: Date; endTime?: Date }): AnalyticsEvent[] {
    let events = [...this.analytics];

    if (filter?.startTime) {
      events = events.filter(e => e.timestamp >= filter.startTime!);
    }

    if (filter?.endTime) {
      events = events.filter(e => e.timestamp <= filter.endTime!);
    }

    return events;
  }

  /**
   * Get request counts
   */
  getRequestCounts(): Map<string, number> {
    return new Map(this.requestCounts);
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate API key
   */
  private generateAPIKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'sk_';

    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return key;
  }

  /**
   * Validate OAuth2 token (placeholder)
   */
  private async validateOAuth2Token(token: string): Promise<boolean> {
    // In production, call OAuth2 provider's introspection endpoint
    return token.length > 0;
  }

  /**
   * Validate basic credentials (placeholder)
   */
  private async validateBasicCredentials(username: string, password: string): Promise<boolean> {
    // In production, validate against user database
    return username.length > 0 && password.length > 0;
  }
}

export default APIGateway;

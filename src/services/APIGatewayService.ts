/**
 * API Gateway Service
 * Comprehensive API Gateway with rate limiting, authentication, routing, and load balancing
 */

import { EventEmitter } from 'events';
import { Request, Response, NextFunction } from 'express';
import { logger } from './SimpleLogger';
import { rateLimitService } from '../backend/security/RateLimitService';
import { authService } from './auth';
import monitoringService from './MonitoringService';
import { telemetryService } from './OpenTelemetryService';
import { config } from '../config/environment';

interface Route {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
  upstream: string[];
  loadBalancing: 'round-robin' | 'least-connections' | 'random' | 'weighted';
  weights?: number[];
  auth: {
    required: boolean;
    roles?: string[];
    permissions?: string[];
  };
  rateLimit: {
    enabled: boolean;
    requests: number;
    window: number; // seconds
    key?: string; // custom rate limit key function
  };
  cache: {
    enabled: boolean;
    ttl: number; // seconds
    key?: string; // custom cache key function
  };
  middleware: string[];
  retry: {
    enabled: boolean;
    attempts: number;
    delay: number; // milliseconds
    backoff: 'linear' | 'exponential';
  };
  timeout: number; // milliseconds
  enabled: boolean;
}

interface GatewayStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  routeStats: Map<string, RouteStats>;
  upstreamStats: Map<string, UpstreamStats>;
}

interface RouteStats {
  requests: number;
  successes: number;
  failures: number;
  averageResponseTime: number;
  lastAccessed: Date;
}

interface UpstreamStats {
  requests: number;
  successes: number;
  failures: number;
  averageResponseTime: number;
  healthy: boolean;
  lastHealthCheck: Date;
}

interface HealthCheckConfig {
  path: string;
  interval: number; // milliseconds
  timeout: number; // milliseconds
  expectedStatus: number[];
  expectedBody?: string;
}

export class APIGatewayService extends EventEmitter {
  private static instance: APIGatewayService;
  private routes: Map<string, Route> = new Map();
  private upstreamCounters: Map<string, number> = new Map();
  private connectionCounts: Map<string, number> = new Map();
  private cache: Map<string, { data: unknown; expires: Date }> = new Map();
  private stats: GatewayStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    routeStats: new Map(),
    upstreamStats: new Map()
  };
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    super();
    this.initializeDefaultRoutes();
    this.startHealthChecks();
    this.startCacheCleanup();
  }

  public static getInstance(): APIGatewayService {
    if (!APIGatewayService.instance) {
      APIGatewayService.instance = new APIGatewayService();
    }
    return APIGatewayService.instance;
  }

  private initializeDefaultRoutes(): void {
    const defaultRoutes: Route[] = [
      {
        id: 'api-workflows',
        path: '/api/workflows*',
        method: 'GET',
        upstream: ['http://localhost:3001'],
        loadBalancing: 'round-robin',
        auth: {
          required: true,
          permissions: ['workflows:read']
        },
        rateLimit: {
          enabled: true,
          requests: 100,
          window: 60
        },
        cache: {
          enabled: true,
          ttl: 300
        },
        middleware: ['cors', 'logging'],
        retry: {
          enabled: true,
          attempts: 3,
          delay: 1000,
          backoff: 'exponential'
        },
        timeout: 30000,
        enabled: true
      },
      {
        id: 'api-executions',
        path: '/api/executions*',
        method: 'POST',
        upstream: ['http://localhost:3001', 'http://localhost:3002'],
        loadBalancing: 'least-connections',
        auth: {
          required: true,
          permissions: ['executions:create']
        },
        rateLimit: {
          enabled: true,
          requests: 50,
          window: 60
        },
        cache: {
          enabled: false,
          ttl: 0
        },
        middleware: ['cors', 'logging', 'security'],
        retry: {
          enabled: false,
          attempts: 1,
          delay: 0,
          backoff: 'linear'
        },
        timeout: 60000,
        enabled: true
      },
      {
        id: 'api-auth',
        path: '/api/auth*',
        method: 'POST',
        upstream: ['http://localhost:3001'],
        loadBalancing: 'round-robin',
        auth: {
          required: false
        },
        rateLimit: {
          enabled: true,
          requests: 20,
          window: 60
        },
        cache: {
          enabled: false,
          ttl: 0
        },
        middleware: ['cors', 'logging', 'security'],
        retry: {
          enabled: true,
          attempts: 2,
          delay: 500,
          backoff: 'linear'
        },
        timeout: 10000,
        enabled: true
      },
      {
        id: 'api-health',
        path: '/api/health',
        method: 'GET',
        upstream: ['http://localhost:3001'],
        loadBalancing: 'round-robin',
        auth: {
          required: false
        },
        rateLimit: {
          enabled: false,
          requests: 0,
          window: 0
        },
        cache: {
          enabled: true,
          ttl: 30
        },
        middleware: ['cors'],
        retry: {
          enabled: false,
          attempts: 1,
          delay: 0,
          backoff: 'linear'
        },
        timeout: 5000,
        enabled: true
      }
    ];

    defaultRoutes.forEach(route => {
      this.routes.set(route.id, route);
      this.stats.routeStats.set(route.id, {
        requests: 0,
        successes: 0,
        failures: 0,
        averageResponseTime: 0,
        lastAccessed: new Date()
      });

      // Initialize upstream stats
      route.upstream.forEach(upstream => {
        if (!this.stats.upstreamStats.has(upstream)) {
          this.stats.upstreamStats.set(upstream, {
            requests: 0,
            successes: 0,
            failures: 0,
            averageResponseTime: 0,
            healthy: true,
            lastHealthCheck: new Date()
          });
        }
        this.upstreamCounters.set(upstream, 0);
        this.connectionCounts.set(upstream, 0);
      });
    });

    logger.info(`🚪 Initialized ${defaultRoutes.length} default API Gateway routes`);
  }

  /**
   * Gateway middleware
   */
  public middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const traceData: any = { recordResponse: () => {} };

      try {
        // Find matching route
        const route = this.findMatchingRoute(req.method, req.path);
        if (!route) {
          return this.sendError(res, 404, 'Route not found', traceData);
        }

        // Check if route is enabled
        if (!route.enabled) {
          return this.sendError(res, 503, 'Route temporarily unavailable', traceData);
        }

        // Apply middleware stack
        await this.applyMiddleware(req, res, route);

        // Check authentication
        if (route.auth.required) {
          const authResult = await this.checkAuthentication(req, route);
          if (!authResult.success) {
            return this.sendError(res, 401, authResult.error, traceData);
          }
        }

        // Check rate limiting
        if (route.rateLimit.enabled) {
          const rateLimitResult = await this.checkRateLimit(req, route);
          if (!rateLimitResult.allowed) {
            return this.sendError(res, 429, 'Rate limit exceeded', traceData);
          }
        }

        // Check cache
        if (route.cache.enabled && req.method === 'GET') {
          const cachedResponse = this.getCachedResponse(req, route);
          if (cachedResponse) {
            const duration = Date.now() - startTime;
            traceData.recordResponse(200, duration);
            this.updateStats(route.id, true, duration);
            return res.json(cachedResponse);
          }
        }

        // Select upstream
        const upstream = this.selectUpstream(route);
        if (!upstream) {
          return this.sendError(res, 503, 'No healthy upstream servers', traceData);
        }

        // Proxy request
        const response = await this.proxyRequest(req, route, upstream);
        const duration = Date.now() - startTime;
        traceData.recordResponse(response.status, duration, response.error);

        // Cache response if applicable
        if (route.cache.enabled && req.method === 'GET' && response.status === 200) {
          this.cacheResponse(req, route, response.data as Record<string, unknown>);
        }

        // Update stats
        this.updateStats(route.id, response.status < 400, duration, upstream);

        // Send response
        res.status(response.status).json(response.data);

      } catch (error) {
        const duration = Date.now() - startTime;
        traceData.recordResponse(500, duration, error);
        this.updateStats('unknown', false, duration);
        this.sendError(res, 500, 'Internal gateway error', traceData, error as Error);
      }
    };
  }

  private findMatchingRoute(method: string, path: string): Route | null {
    for (const route of Array.from(this.routes.values())) {
      if (route.method === method || route.method === 'OPTIONS') {
        // Simple pattern matching - could be enhanced with regex
        const pattern = route.path.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(path)) {
          return route;
        }
      }
    }
    return null;
  }

  private async applyMiddleware(req: Request, res: Response, route: Route): Promise<void> {
    for (const middlewareName of route.middleware) {
      switch (middlewareName) {
        case 'cors':
          // CORS middleware would be applied here
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
          res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          break;
        
        case 'logging':
          logger.info(`🚪 Gateway request: ${req.method} ${req.path}`, {
            routeId: route.id,
            userAgent: req.get('User-Agent'),
            ip: req.ip
          });
          break;
        
        case 'security':
          // Security headers
          res.header('X-Content-Type-Options', 'nosniff');
          res.header('X-Frame-Options', 'DENY');
          res.header('X-XSS-Protection', '1; mode=block');
          break;
      }
    }
  }

  private async checkAuthentication(req: Request, route: Route): Promise<{ success: boolean; error?: string }> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return { success: false, error: 'No authentication token provided' };
      }

      // Verify token using authService
      const user = await authService.verifyToken(token);
      if (!user) {
        return { success: false, error: 'Invalid authentication token' };
      }

      // Check roles
      if (route.auth.roles && route.auth.roles.length > 0) {
        const hasRole = route.auth.roles.some(role =>
          user.role === role
        );
        if (!hasRole) {
          return { success: false, error: 'Insufficient role permissions' };
        }
      }

      // Check permissions
      if (route.auth.permissions && route.auth.permissions.length > 0) {
        const hasPermission = route.auth.permissions.every(permission =>
          user.permissions?.includes(permission)
        );
        if (!hasPermission) {
          return { success: false, error: 'Insufficient permissions' };
        }
      }

      (req as any).user = user;
      return { success: true };

    } catch (error) {
      logger.error('❌ Authentication check failed:', error);
      return { success: false, error: 'Authentication error' };
    }
  }

  private async checkRateLimit(req: Request, route: Route): Promise<{ allowed: boolean; remaining?: number }> {
    try {
      const key = route.rateLimit.key || `${req.ip}:${route.id}`;
      const config = {
        maxRequests: route.rateLimit.requests,
        windowMs: route.rateLimit.window * 1000, // Convert seconds to milliseconds
        strategy: 'fixed-window' as const
      };
      const result = await rateLimitService.checkLimit(key, config);

      return {
        allowed: result.allowed,
        remaining: result.remaining
      };
    } catch (error) {
      logger.error('❌ Rate limit check failed:', error);
      return { allowed: true }; // Fail open
    }
  }

  private getCachedResponse(req: Request, route: Route): Record<string, unknown> | null {
    const cacheKey = route.cache.key || `${route.id}:${req.path}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > new Date()) {
      return cached.data as Record<string, unknown>;
    }

    if (cached) {
      this.cache.delete(cacheKey);
    }

    return null;
  }

  private cacheResponse(req: Request, route: Route, data: Record<string, unknown>): void {
    const cacheKey = route.cache.key || `${route.id}:${req.path}`;
    const expires = new Date(Date.now() + route.cache.ttl * 1000);
    this.cache.set(cacheKey, { data, expires });
  }

  private selectUpstream(route: Route): string | null {
    const healthyUpstreams = route.upstream.filter(upstream => {
      const stats = this.stats.upstreamStats.get(upstream);
      return stats?.healthy !== false;
    });

    if (healthyUpstreams.length === 0) {
      return null;
    }

    switch (route.loadBalancing) {
      case 'round-robin':
        return this.selectRoundRobin(healthyUpstreams);
      
      case 'least-connections':
        return this.selectLeastConnections(healthyUpstreams);
      
      case 'random':
        return healthyUpstreams[Math.floor(Math.random() * healthyUpstreams.length)];
      
      case 'weighted':
        return this.selectWeighted(healthyUpstreams, route.weights);
      
      default:
        return healthyUpstreams[0];
    }
  }

  private selectRoundRobin(upstreams: string[]): string {
    // Simple round-robin implementation
    const upstream = upstreams[0];
    const counter = this.upstreamCounters.get(upstream) || 0;
    const index = counter % upstreams.length;
    this.upstreamCounters.set(upstream, counter + 1);
    return upstreams[index];
  }

  private selectLeastConnections(upstreams: string[]): string {
    let minConnections = Infinity;
    let selectedUpstream = upstreams[0];

    for (const upstream of upstreams) {
      const connections = this.connectionCounts.get(upstream) || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedUpstream = upstream;
      }
    }

    return selectedUpstream;
  }

  private selectWeighted(upstreams: string[], weights?: number[]): string {
    if (!weights || weights.length !== upstreams.length) {
      return upstreams[0];
    }

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const random = Math.random() * totalWeight;
    let weightSum = 0;

    for (let i = 0; i < upstreams.length; i++) {
      weightSum += weights[i];
      if (random <= weightSum) {
        return upstreams[i];
      }
    }

    return upstreams[0];
  }

  private async proxyRequest(req: Request, route: Route, upstream: string): Promise<{
    status: number;
    data: unknown;
    error?: Error;
  }> {
    const options: RequestInit = {
      method: req.method,
      headers: this.buildProxyHeaders(req),
      signal: AbortSignal.timeout(route.timeout)
    };

    // Add body for non-GET requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      options.body = JSON.stringify(req.body);
    }

    // Increment connection count
    const currentConnections = this.connectionCounts.get(upstream) || 0;
    this.connectionCounts.set(upstream, currentConnections + 1);

    try {
      let response: globalThis.Response;
      let attempt = 0;
      const url = `${upstream}${req.path}`;

      while (attempt < (route.retry.enabled ? route.retry.attempts : 1)) {
        try {
          response = await fetch(url, options);
          
          if (response.ok || !route.retry.enabled) {
            break;
          }
          
          attempt++;

          if (attempt < route.retry.attempts) {
            const delay = route.retry.backoff === 'exponential'
              ? route.retry.delay * Math.pow(2, attempt - 1)
              : route.retry.delay;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          attempt++;

          if (attempt >= (route.retry.enabled ? route.retry.attempts : 1)) {
            throw error;
          }

          const delay = route.retry.backoff === 'exponential'
            ? route.retry.delay * Math.pow(2, attempt - 1)
            : route.retry.delay;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      const data = await response!.json();
      return {
        status: response!.status,
        data
      };

    } catch (error) {
      logger.error(`❌ Proxy request failed for ${upstream}:`, error);

      // Mark upstream as unhealthy if multiple failures
      const stats = this.stats.upstreamStats.get(upstream);
      if (stats) {
        stats.failures++;
        if (stats.failures > 5) {
          stats.healthy = false;
        }
      }

      return {
        status: 503,
        data: { error: 'Upstream service unavailable' },
        error: error as Error
      };
    } finally {
      // Decrement connection count
      const finalConnections = this.connectionCounts.get(upstream) || 0;
      this.connectionCounts.set(upstream, Math.max(0, finalConnections - 1));
    }
  }

  private buildProxyHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Forwarded-For': req.ip,
      'X-Forwarded-Proto': req.protocol,
      'X-Forwarded-Host': req.get('Host') || '',
      'X-Real-IP': req.ip
    };

    // Forward authorization header
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    // Forward custom headers
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.startsWith('x-') && typeof value === 'string') {
        headers[key] = value;
      }
    }

    return headers;
  }

  private updateStats(routeId: string, success: boolean, responseTime: number, upstream?: string): void {
    // Update global stats
    this.stats.totalRequests++;
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
    
    this.stats.averageResponseTime = (
      (this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime) / 
      this.stats.totalRequests
    );

    // Update route stats
    const routeStats = this.stats.routeStats.get(routeId);
    if (routeStats) {
      routeStats.requests++;
      if (success) {
        routeStats.successes++;
      } else {
        routeStats.failures++;
      }
      routeStats.averageResponseTime = (
        (routeStats.averageResponseTime * (routeStats.requests - 1) + responseTime) /
        routeStats.requests
      );
      routeStats.lastAccessed = new Date();
    }

    // Update upstream stats
    if (upstream) {
      const upstreamStats = this.stats.upstreamStats.get(upstream);
      if (upstreamStats) {
        upstreamStats.requests++;
        if (success) {
          upstreamStats.successes++;
          upstreamStats.healthy = true; // Mark as healthy on success
        } else {
          upstreamStats.failures++;
        }
        upstreamStats.averageResponseTime = (
          (upstreamStats.averageResponseTime * (upstreamStats.requests - 1) + responseTime) / 
          upstreamStats.requests
        );
      }
    }

    // Record metrics
    monitoringService.recordMetric('gateway.requests.total', 1, {
      route: routeId,
      success: success.toString(),
      upstream
    });

    monitoringService.recordMetric('gateway.response.time', responseTime, {
      route: routeId,
      upstream
    });
  }

  private sendError(res: Response, status: number, message: string, traceData: any, error?: Error): void {
    if (traceData && typeof traceData.recordResponse === 'function') {
      traceData.recordResponse(status, Date.now(), error);
    }

    logger.error(`🚪 Gateway error: ${status} - ${message}`, error);
    
    res.status(status).json({
      error: {
        status,
        message,
        timestamp: new Date().toISOString()
      }
    });
  }

  private startHealthChecks(): void {
    for (const [upstream] of Array.from(this.stats.upstreamStats.entries())) {
      this.startUpstreamHealthCheck(upstream);
    }
  }

  private startUpstreamHealthCheck(upstream: string): void {
    const healthCheck: HealthCheckConfig = {
      path: '/health',
      interval: 30000, // 30 seconds
      timeout: 5000,
      expectedStatus: [200, 204]
    };

    const interval = setInterval(async () => {
      try {
        const healthResponse: globalThis.Response = await fetch(`${upstream}${healthCheck.path}`, {
          method: 'GET',
          signal: AbortSignal.timeout(healthCheck.timeout)
        });

        const isHealthy = healthCheck.expectedStatus.includes(healthResponse.status);
        const stats = this.stats.upstreamStats.get(upstream);
        if (stats) {
          stats.healthy = isHealthy;
          stats.lastHealthCheck = new Date();
        }

        if (!isHealthy) {
          logger.warn(`🚨 Upstream health check failed: ${upstream} (${healthResponse.status})`);
        }

      } catch (error) {
        logger.error(`❌ Health check error for ${upstream}:`, error);
        const stats = this.stats.upstreamStats.get(upstream);
        if (stats) {
          stats.healthy = false;
          stats.lastHealthCheck = new Date();
        }
      }
    }, healthCheck.interval);

    this.healthCheckIntervals.set(upstream, interval);
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = new Date();
      for (const [key, cached] of Array.from(this.cache.entries())) {
        if (cached.expires <= now) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Clean every minute
  }

  /**
   * Add new route
   */
  public addRoute(route: Route): void {
    this.routes.set(route.id, route);
    this.stats.routeStats.set(route.id, {
      requests: 0,
      successes: 0,
      failures: 0,
      averageResponseTime: 0,
      lastAccessed: new Date()
    });

    // Initialize upstream stats
    route.upstream.forEach(upstream => {
      if (!this.stats.upstreamStats.has(upstream)) {
        this.stats.upstreamStats.set(upstream, {
          requests: 0,
          successes: 0,
          failures: 0,
          averageResponseTime: 0,
          healthy: true,
          lastHealthCheck: new Date()
        });
        this.startUpstreamHealthCheck(upstream);
      }
    });

    logger.info(`🚪 Added API Gateway route: ${route.id}`);
  }

  /**
   * Update route
   */
  public updateRoute(routeId: string, updates: Partial<Route>): void {
    const route = this.routes.get(routeId);
    if (route) {
      Object.assign(route, updates);
      logger.info(`🚪 Updated API Gateway route: ${routeId}`);
    }
  }

  /**
   * Remove route
   */
  public removeRoute(routeId: string): void {
    this.routes.delete(routeId);
    this.stats.routeStats.delete(routeId);
    logger.info(`🚪 Removed API Gateway route: ${routeId}`);
  }

  /**
   * Get gateway statistics
   */
  public getStats(): GatewayStats {
    return { ...this.stats };
  }

  /**
   * Get route configuration
   */
  public getRoute(routeId: string): Route | undefined {
    return this.routes.get(routeId);
  }

  /**
   * Get all routes
   */
  public getAllRoutes(): Route[] {
    return Array.from(this.routes.values());
  }

  /**
   * Clear cache
   */
  public clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of Array.from(this.cache.keys())) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }

    logger.info(`🧹 Cleared API Gateway cache${pattern ? ` (pattern: ${pattern})` : ''}`);
  }

  /**
   * Shutdown gateway
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down API Gateway...');

    // Clear health check intervals
    for (const interval of Array.from(this.healthCheckIntervals.values())) {
      clearInterval(interval);
    }

    // Clear cache
    this.cache.clear();

    logger.info('✅ API Gateway shutdown complete');
  }
}

export const apiGatewayService = APIGatewayService.getInstance();
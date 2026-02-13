/**
 * Advanced CORS Service
 * Dynamic CORS configuration with security controls
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './SimpleLogger';
import { config } from '../config/environment';

interface CORSRule {
  pattern: RegExp;
  methods: string[];
  headers: string[];
  credentials: boolean;
  maxAge: number;
  preflightContinue?: boolean;
}

export class CORSService {
  private static instance: CORSService;
  private rules: Map<string, CORSRule> = new Map();
  private defaultRule: CORSRule;
  private trustedOrigins: Set<string> = new Set();
  private blockedOrigins: Set<string> = new Set();

  private constructor() {
    this.initializeDefaultRule();
    this.loadRules();
    this.loadTrustedOrigins();
  }

  public static getInstance(): CORSService {
    if (!CORSService.instance) {
      CORSService.instance = new CORSService();
    }
    return CORSService.instance;
  }

  private initializeDefaultRule(): void {
    this.defaultRule = {
      pattern: /.*/,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'X-CSRF-Token',
        'X-Requested-With',
        'Cache-Control'
      ],
      credentials: true,
      maxAge: 86400, // 24 hours
      preflightContinue: false
    };
  }

  private loadRules(): void {
    // API endpoints with restricted CORS
    this.rules.set('api', {
      pattern: /^\/api\//,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'X-API-Key'],
      credentials: true,
      maxAge: 3600
    });

    // Webhook endpoints with no credentials
    this.rules.set('webhooks', {
      pattern: /^\/webhooks\//,
      methods: ['POST'],
      headers: ['Content-Type', 'X-Hub-Signature', 'X-Webhook-Secret'],
      credentials: false,
      maxAge: 0
    });

    // GraphQL endpoint
    this.rules.set('graphql', {
      pattern: /^\/graphql/,
      methods: ['POST', 'GET'],
      headers: ['Content-Type', 'Authorization', 'Apollo-Require-Preflight'],
      credentials: true,
      maxAge: 7200
    });

    // Health check endpoint - public
    this.rules.set('health', {
      pattern: /^\/health/,
      methods: ['GET'],
      headers: ['Content-Type'],
      credentials: false,
      maxAge: 300
    });
  }

  private loadTrustedOrigins(): void {
    const origins = ((config as any).cors?.allowedOrigins || []) as string[];
    origins.forEach(origin => {
      this.trustedOrigins.add(origin);
    });

    // Environment-specific origins
    if (config.env === 'development') {
      this.trustedOrigins.add('http://localhost:3000');
      this.trustedOrigins.add('http://localhost:3001');
      this.trustedOrigins.add('http://localhost:5173');
      this.trustedOrigins.add('http://127.0.0.1:3000');
    }

    logger.info(`🔒 CORS trusted origins loaded: ${this.trustedOrigins.size}`);
  }

  /**
   * Main CORS middleware
   */
  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin;
      const path = req.path;

      // Find applicable rule
      const rule = this.findApplicableRule(path);

      // Validate origin
      const isOriginAllowed = this.validateOrigin(origin, rule);

      if (!isOriginAllowed && origin) {
        logger.warn('🚫 CORS: Origin blocked', { 
          origin, 
          path, 
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
        
        return res.status(403).json({ 
          error: 'CORS policy violation',
          code: 'ORIGIN_NOT_ALLOWED'
        });
      }

      // Set CORS headers
      this.setCORSHeaders(res, origin, rule, req.method);

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        logger.debug('🔄 CORS preflight request', { origin, path });
        
        if (rule.preflightContinue) {
          return next();
        }
        
        return res.status(204).end();
      }

      // Log CORS request
      if (origin) {
        logger.debug('🌐 CORS request processed', { 
          origin, 
          path, 
          method: req.method,
          rule: this.getRuleName(rule)
        });
      }

      next();
    };
  }

  private findApplicableRule(path: string): CORSRule {
    for (const [_name, rule] of this.rules) {
      if (rule.pattern.test(path)) {
        return rule;
      }
    }
    return this.defaultRule;
  }

  private validateOrigin(origin: string | undefined, rule: CORSRule): boolean {
    if (!origin) {
      // Allow requests without origin (e.g., mobile apps, server-to-server)
      return true;
    }

    // Check blocked origins first
    if (this.blockedOrigins.has(origin)) {
      return false;
    }

    // Check trusted origins
    if (this.trustedOrigins.has(origin)) {
      return true;
    }

    // Check against dynamic patterns
    return this.checkDynamicOriginPatterns(origin);
  }

  private checkDynamicOriginPatterns(origin: string): boolean {
    try {
      const url = new URL(origin);

      // Allow same-origin requests
      if (url.origin === `${url.protocol}//${url.host}`) {
        return true;
      }

      // Development patterns
      if (config.env === 'development') {
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          return true;
        }
      }

      // Subdomain patterns for production
      if (config.env === 'production') {
        const allowedDomains = [
          'workflow-platform.com',
          'app.workflow-platform.com',
          'api.workflow-platform.com'
        ];

        return allowedDomains.some(domain =>
          url.hostname === domain || url.hostname.endsWith(`.${domain}`)
        );
      }

      return false;
    } catch {
      return false;
    }
  }

  private setCORSHeaders(
    res: Response, 
    origin: string | undefined, 
    rule: CORSRule,
    method: string
  ): void {
    // Origin header
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
    }

    // Credentials
    if (rule.credentials) {
      res.header('Access-Control-Allow-Credentials', 'true');
    }

    // Methods
    if (rule.methods.includes(method) || method === 'OPTIONS') {
      res.header('Access-Control-Allow-Methods', rule.methods.join(', '));
    }

    // Headers
    res.header('Access-Control-Allow-Headers', rule.headers.join(', '));

    // Max age for preflight cache
    if (method === 'OPTIONS') {
      res.header('Access-Control-Max-Age', rule.maxAge.toString());
    }

    // Expose headers
    res.header('Access-Control-Expose-Headers', [
      'X-Total-Count',
      'X-Page-Count',
      'X-Rate-Limit-Remaining',
      'X-Rate-Limit-Reset',
      'X-Request-ID'
    ].join(', '));

    // Security headers
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    
    if (config.security.httpsOnly) {
      res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
  }

  private getRuleName(rule: CORSRule): string {
    for (const [name, r] of this.rules) {
      if (r === rule) return name;
    }
    return 'default';
  }

  /**
   * Add trusted origin dynamically
   */
  public addTrustedOrigin(origin: string): void {
    this.trustedOrigins.add(origin);
    logger.info(`✅ Added trusted CORS origin: ${origin}`);
  }

  /**
   * Remove trusted origin
   */
  public removeTrustedOrigin(origin: string): void {
    this.trustedOrigins.delete(origin);
    logger.info(`❌ Removed trusted CORS origin: ${origin}`);
  }

  /**
   * Block origin
   */
  public blockOrigin(origin: string): void {
    this.blockedOrigins.add(origin);
    this.trustedOrigins.delete(origin);
    logger.warn(`🚫 Blocked CORS origin: ${origin}`);
  }

  /**
   * Add custom CORS rule
   */
  public addRule(name: string, rule: CORSRule): void {
    this.rules.set(name, rule);
    logger.info(`📋 Added CORS rule: ${name}`);
  }

  /**
   * Get CORS statistics
   */
  public getStats(): {
    trustedOrigins: number;
    blockedOrigins: number;
    rules: number;
  } {
    return {
      trustedOrigins: this.trustedOrigins.size,
      blockedOrigins: this.blockedOrigins.size,
      rules: this.rules.size
    };
  }
}

export const corsService = CORSService.getInstance();
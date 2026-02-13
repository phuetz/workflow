/**
 * Comprehensive Security Middleware
 * All-in-one security middleware combining multiple protection layers
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { logger } from '../services/SimpleLogger';
import { corsService } from '../services/CORSService';
// import { rateLimitService } from '../services/RateLimitService';
import { csrfService } from '../services/CSRFService';
import { inputSanitizationService } from '../services/InputSanitizationService';
import { config } from '../config/environment';

// Placeholder for missing RateLimitService
const rateLimitService = {
  createLimiter: (name: string) => (_req: Request, _res: Response, next: NextFunction) => next()
};

interface SecurityConfig {
  enableCSP?: boolean;
  enableHSTS?: boolean;
  enableCSRF?: boolean;
  enableSanitization?: boolean;
  enableRateLimit?: boolean;
  enableCORS?: boolean;
  enableSecurityHeaders?: boolean;
  enableRequestValidation?: boolean;
  enableThreatDetection?: boolean;
  customRules?: SecurityRule[];
}

interface SecurityRule {
  name: string;
  condition: (req: Request) => boolean;
  action: 'block' | 'log' | 'throttle';
  message?: string;
}

interface ThreatSignature {
  name: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export class SecurityMiddleware {
  private static instance: SecurityMiddleware;
  private config: Required<SecurityConfig>;
  private threatSignatures: ThreatSignature[];
  private suspiciousIPs: Map<string, { count: number; lastSeen: Date }> = new Map();
  private blockedIPs: Set<string> = new Set();

  private constructor(config: SecurityConfig = {}) {
    this.config = {
      enableCSP: config.enableCSP ?? true,
      enableHSTS: config.enableHSTS ?? true,
      enableCSRF: config.enableCSRF ?? true,
      enableSanitization: config.enableSanitization ?? true,
      enableRateLimit: config.enableRateLimit ?? true,
      enableCORS: config.enableCORS ?? true,
      enableSecurityHeaders: config.enableSecurityHeaders ?? true,
      enableRequestValidation: config.enableRequestValidation ?? true,
      enableThreatDetection: config.enableThreatDetection ?? true,
      customRules: config.customRules || []
    };

    this.initializeThreatSignatures();
    this.startSecurityMonitoring();
    logger.info('🛡️ Security Middleware initialized with comprehensive protection');
  }

  public static getInstance(config?: SecurityConfig): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware(config);
    }
    return SecurityMiddleware.instance;
  }

  private initializeThreatSignatures(): void {
    this.threatSignatures = [
      // SQL Injection signatures
      {
        name: 'SQL_INJECTION_UNION',
        pattern: /(\bunion\b.*\bselect\b|\bselect\b.*\bunion\b)/i,
        severity: 'high',
        description: 'SQL injection attempt using UNION'
      },
      {
        name: 'SQL_INJECTION_COMMENT',
        pattern: /(\/\*.*\*\/|--.*$|\#.*$)/m,
        severity: 'medium',
        description: 'SQL injection attempt using comments'
      },
      
      // XSS signatures
      {
        name: 'XSS_SCRIPT_TAG',
        pattern: /<script[^>]*>.*?<\/script>/i,
        severity: 'high',
        description: 'XSS attempt using script tags'
      },
      {
        name: 'XSS_JAVASCRIPT_PROTOCOL',
        pattern: /javascript\s*:/i,
        severity: 'medium',
        description: 'XSS attempt using javascript protocol'
      },
      
      // Command injection signatures
      {
        name: 'COMMAND_INJECTION',
        pattern: /(\||;|&|`|\$\(|\${)/,
        severity: 'high',
        description: 'Command injection attempt'
      },
      
      // Path traversal signatures
      {
        name: 'PATH_TRAVERSAL',
        pattern: /(\.\.[\/\\]|%2e%2e[\/\\])/i,
        severity: 'medium',
        description: 'Path traversal attempt'
      },
      
      // LDAP injection signatures
      {
        name: 'LDAP_INJECTION',
        pattern: /(\*|\(|\)|&|\||!)/,
        severity: 'medium',
        description: 'LDAP injection attempt'
      },
      
      // XXE signatures
      {
        name: 'XXE_ATTACK',
        pattern: /<!ENTITY.*>/i,
        severity: 'high',
        description: 'XML External Entity (XXE) attack attempt'
      },
      
      // SSRF signatures
      {
        name: 'SSRF_LOCALHOST',
        pattern: /(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)/i,
        severity: 'medium',
        description: 'SSRF attempt targeting localhost'
      },
      
      // NoSQL injection signatures
      {
        name: 'NOSQL_INJECTION',
        pattern: /(\$where|\$ne|\$gt|\$lt|\$regex)/i,
        severity: 'medium',
        description: 'NoSQL injection attempt'
      }
    ];
  }

  /**
   * Main security middleware stack
   */
  public getMiddleware(): Array<(req: Request, res: Response, next: NextFunction) => void> {
    const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

    // 1. IP blocking check
    middlewares.push(this.ipBlockingMiddleware());

    // 2. Security headers
    if (this.config.enableSecurityHeaders) {
      middlewares.push(this.securityHeadersMiddleware());
    }

    // 3. CORS protection
    if (this.config.enableCORS) {
      middlewares.push(corsService.middleware());
    }

    // 4. Rate limiting
    if (this.config.enableRateLimit) {
      middlewares.push(rateLimitService.createLimiter('global'));
    }

    // 5. Request validation
    if (this.config.enableRequestValidation) {
      middlewares.push(this.requestValidationMiddleware());
    }

    // 6. Input sanitization
    if (this.config.enableSanitization) {
      middlewares.push(inputSanitizationService.middleware());
    }

    // 7. Threat detection
    if (this.config.enableThreatDetection) {
      middlewares.push(this.threatDetectionMiddleware());
    }

    // 8. CSRF protection (only for state-changing requests)
    if (this.config.enableCSRF) {
      middlewares.push(this.csrfMiddleware());
    }

    // 9. Custom security rules
    if (this.config.customRules.length > 0) {
      middlewares.push(this.customRulesMiddleware());
    }

    // 10. Security logging
    middlewares.push(this.securityLoggingMiddleware());

    return middlewares;
  }

  private ipBlockingMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = this.getClientIP(req);

      if (this.blockedIPs.has(clientIP)) {
        logger.warn('🚫 Blocked IP attempted access', { ip: clientIP, path: req.path });
        return res.status(403).json({
          error: 'Access denied',
          code: 'IP_BLOCKED'
        });
      }

      next();
    };
  }

  private securityHeadersMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return helmet({
      contentSecurityPolicy: this.config.enableCSP ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https:", "wss:", "ws:"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          childSrc: ["'self'"],
          workerSrc: ["'self'"],
          manifestSrc: ["'self'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: config.security.httpsOnly ? [] : undefined
        },
        reportOnly: config.env === 'development'
      } : false,
      
      hsts: this.config.enableHSTS && config.security.httpsOnly ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      } : false,
      
      noSniff: true,
      frameguard: { action: 'deny' },
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      
      // Additional security headers
      hidePoweredBy: true,
      ieNoOpen: true,
      dnsPrefetchControl: { allow: false },
      permittedCrossDomainPolicies: false
    });
  }

  private requestValidationMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      // Check request size
      const contentLength = parseInt(req.headers['content-length'] || '0', 10);
      if (contentLength > 10 * 1024 * 1024) { // 10MB limit
        logger.warn('🚨 Large request detected', { 
          size: contentLength, 
          ip: this.getClientIP(req),
          path: req.path 
        });
        return res.status(413).json({
          error: 'Request too large',
          code: 'REQUEST_TOO_LARGE'
        });
      }

      // Check for suspicious headers
      const suspiciousHeaders = [
        'x-forwarded-for',
        'x-real-ip',
        'x-cluster-client-ip',
        'x-forwarded',
        'forwarded-for',
        'forwarded'
      ];

      for (const header of suspiciousHeaders) {
        const value = req.headers[header];
        if (value && typeof value === 'string') {
          // Check for header injection
          if (value.includes('\n') || value.includes('\r')) {
            logger.warn('🚨 Header injection attempt', { 
              header, 
              value, 
              ip: this.getClientIP(req) 
            });
            return res.status(400).json({
              error: 'Invalid header format',
              code: 'HEADER_INJECTION'
            });
          }
        }
      }

      // Check User-Agent
      const userAgent = req.headers['user-agent'] || '';
      if (!userAgent || userAgent.length < 10 || userAgent.length > 1000) {
        this.recordSuspiciousActivity(this.getClientIP(req), 'suspicious_user_agent');
      }

      next();
    };
  }

  private threatDetectionMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = this.getClientIP(req);
      let threatsDetected = 0;

      // Check request data against threat signatures
      const dataToCheck = [
        JSON.stringify(req.body || {}),
        JSON.stringify(req.query || {}),
        JSON.stringify(req.params || {}),
        req.url,
        req.headers['user-agent'] || '',
        req.headers['referer'] || ''
      ].join(' ');

      for (const signature of this.threatSignatures) {
        if (signature.pattern.test(dataToCheck)) {
          threatsDetected++;
          
          logger.warn(`🚨 Threat detected: ${signature.name}`, {
            signature: signature.name,
            severity: signature.severity,
            description: signature.description,
            ip: clientIP,
            path: req.path,
            method: req.method,
            userAgent: req.headers['user-agent']
          });

          if (signature.severity === 'critical' || signature.severity === 'high') {
            this.recordSuspiciousActivity(clientIP, signature.name);
            
            // Block critical threats immediately
            if (signature.severity === 'critical') {
              this.blockedIPs.add(clientIP);
              return res.status(403).json({
                error: 'Security threat detected',
                code: 'THREAT_DETECTED',
                threatId: signature.name
              });
            }
          }
        }
      }

      // If multiple threats detected, treat as suspicious
      if (threatsDetected >= 3) {
        this.recordSuspiciousActivity(clientIP, 'multiple_threats');
      }

      next();
    };
  }

  private csrfMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      // Only apply CSRF protection to state-changing methods
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return csrfService.middleware()(req, res, next);
      }
      next();
    };
  }

  private customRulesMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = this.getClientIP(req);

      for (const rule of this.config.customRules) {
        if (rule.condition(req)) {
          logger.warn(`🔍 Custom security rule triggered: ${rule.name}`, {
            rule: rule.name,
            action: rule.action,
            ip: clientIP,
            path: req.path
          });

          switch (rule.action) {
            case 'block':
              return res.status(403).json({
                error: rule.message || 'Request blocked by security rule',
                code: 'CUSTOM_RULE_BLOCKED',
                rule: rule.name
              });
            
            case 'throttle':
              // Apply additional rate limiting
              this.recordSuspiciousActivity(clientIP, rule.name);
              break;
            
            case 'log':
              // Just log, continue processing
              break;
          }
        }
      }

      next();
    };
  }

  private securityLoggingMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = this.getClientIP(req);
      const startTime = Date.now();
      const originalJson = res.json;

      // Log security-relevant requests
      const isSecurityRelevant = req.method !== 'GET' || req.path.includes('auth') || req.path.includes('admin');

      if (isSecurityRelevant) {
        logger.info('🔒 Security-relevant request', {
          ip: clientIP,
          method: req.method,
          path: req.path,
          userAgent: req.headers['user-agent'],
          referer: req.headers['referer']
        });
      }

      // Override res.json to log responses
      res.json = function(body) {
        const duration = Date.now() - startTime;

        if (res.statusCode >= 400) {
          logger.warn('🚨 Security error response', {
            ip: clientIP,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            error: body?.error || body?.message
          });
        }

        return originalJson.call(res, body);
      };

      next();
    };
  }

  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] as string ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }

  private recordSuspiciousActivity(ip: string, activity: string): void {
    const current = this.suspiciousIPs.get(ip) || { count: 0, lastSeen: new Date() };
    current.count++;
    current.lastSeen = new Date();

    this.suspiciousIPs.set(ip, current);
    
    // Auto-block after multiple suspicious activities
    if (current.count >= 10) {
      this.blockedIPs.add(ip);
      logger.error('🚫 IP auto-blocked due to suspicious activity', {
        ip,
        activity,
        count: current.count
      });
    }
  }

  private startSecurityMonitoring(): void {
    // Clean up old suspicious IPs every hour
    setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 3600000);
      let cleaned = 0;

      for (const [ip, data] of this.suspiciousIPs) {
        if (data.lastSeen < oneHourAgo) {
          this.suspiciousIPs.delete(ip);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        logger.info(`🧹 Cleaned ${cleaned} old suspicious IP records`);
      }
    }, 3600000); // 1 hour
  }

  /**
   * Add custom security rule
   */
  public addCustomRule(rule: SecurityRule): void {
    this.config.customRules.push(rule);
    logger.info(`✅ Custom security rule added: ${rule.name}`);
  }

  /**
   * Block IP address
   */
  public blockIP(ip: string): void {
    this.blockedIPs.add(ip);
    logger.warn(`🚫 IP manually blocked: ${ip}`);
  }

  /**
   * Unblock IP address
   */
  public unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    this.suspiciousIPs.delete(ip);
    logger.info(`✅ IP unblocked: ${ip}`);
  }

  /**
   * Get security statistics
   */
  public getSecurityStats(): {
    blockedIPs: number;
    suspiciousIPs: number;
    threatSignatures: number;
    customRules: number;
    configuration: Partial<SecurityConfig>;
  } {
    return {
      blockedIPs: this.blockedIPs.size,
      suspiciousIPs: this.suspiciousIPs.size,
      threatSignatures: this.threatSignatures.length,
      customRules: this.config.customRules.length,
      configuration: {
        enableCSP: this.config.enableCSP,
        enableHSTS: this.config.enableHSTS,
        enableCSRF: this.config.enableCSRF,
        enableSanitization: this.config.enableSanitization,
        enableRateLimit: this.config.enableRateLimit,
        enableCORS: this.config.enableCORS,
        enableSecurityHeaders: this.config.enableSecurityHeaders,
        enableRequestValidation: this.config.enableRequestValidation,
        enableThreatDetection: this.config.enableThreatDetection
      }
    };
  }
}

export const securityMiddleware = SecurityMiddleware.getInstance();
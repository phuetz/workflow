/**
 * Security Middleware
 * Applies security headers and protections to all API requests
 */

import { Request, Response, NextFunction } from 'express';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { CSPConfig } from '../../../security/CSPConfig';
import { logger } from '../../../services/SimpleLogger';

// Initialize CSP configuration
const cspConfig = CSPConfig.getInstance();

/**
 * Apply comprehensive security headers using helmet
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // We'll use our custom CSP
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: true,
  frameguard: { action: 'sameorigin' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

/**
 * Custom CSP middleware
 */
export const cspMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Generate nonce for this request
  const nonce = cspConfig.generateNonce();
  
  // Store nonce on response locals for use in templates
  res.locals.cspNonce = nonce;
  
  // Get and set security headers
  const headers = cspConfig.getSecurityHeaders(nonce);
  
  for (const [header, value] of Object.entries(headers)) {
    if (value) {
      res.setHeader(header, value);
    }
  }
  
  next();
};

/**
 * Rate limiting configuration
 */
export const createRateLimiter = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    ...options
  };
  
  return rateLimit(defaultOptions);
};

/**
 * API rate limiter (stricter limits)
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});

/**
 * Auth rate limiter (very strict for login/register)
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 auth attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.'
});

/**
 * Webhook rate limiter (allow more for webhooks)
 */
export const webhookRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60 // 60 webhooks per minute
});

/**
 * CSP violation report handler
 */
export const cspReportHandler = (req: Request, res: Response) => {
  // Validate the CSP report
  if (!cspConfig.validateCSPReport(req.body)) {
    return res.status(400).json({ error: 'Invalid CSP report' });
  }
  
  // Log the CSP violation (in production, send to monitoring service)
  logger.error('CSP Violation:', JSON.stringify(req.body['csp-report'], null, 2));
  
  // You might want to send this to a monitoring service like Sentry
  // sentry.captureMessage('CSP Violation', {
  //   level: 'warning',
  //   extra: req.body['csp-report']
  // });
  
  res.status(204).end();
};

/**
 * Security headers validation middleware
 */
export const validateSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Check for common security issues in request
  
  // Prevent prototype pollution
  if (req.body && typeof req.body === 'object') {
    const dangerous = ['__proto__', 'constructor', 'prototype'];
    for (const key of dangerous) {
      if (key in req.body) {
        return res.status(400).json({ error: 'Invalid request data' });
      }
    }
  }
  
  // Validate Content-Type for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({ error: 'Content-Type must be application/json' });
    }
  }
  
  next();
};

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Whitelist of allowed origins
    const allowedOrigins = [
      process.env.VITE_APP_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3000',
      'https://localhost:3001'
    ];
    
    // Add production URLs if configured
    if (process.env.PRODUCTION_URL) {
      allowedOrigins.push(process.env.PRODUCTION_URL);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

/**
 * Request sanitization middleware
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        // Remove any script tags or dangerous patterns
        req.query[key] = (req.query[key] as string)
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    }
  }
  
  // Sanitize body (for non-file uploads)
  if (req.body && typeof req.body === 'object' && !req.is('multipart/form-data')) {
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const key in obj) {
      // Skip dangerous keys
      if (['__proto__', 'constructor', 'prototype'].includes(key)) {
        continue;
      }
      sanitized[key] = sanitizeObject((obj as Record<string, unknown>)[key]);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Apply all security middleware
 */
export const applySecurityMiddleware = (app: express.Application) => {
  // Basic security headers with helmet
  app.use(helmetMiddleware);

  // Custom CSP middleware
  app.use(cspMiddleware);

  // Request sanitization
  app.use(sanitizeRequest);

  // Security headers validation
  app.use(validateSecurityHeaders);

  // Rate limiting (can be applied selectively to routes)
  app.use('/api/', apiRateLimiter);
  app.use('/api/auth/', authRateLimiter);
  app.use('/api/webhooks/', webhookRateLimiter);

  // CSP violation reporting endpoint
  app.post('/api/csp-report', express.json({ type: 'application/csp-report' }), cspReportHandler);
};

// Re-export for convenience
export { CSPConfig } from '../../../security/CSPConfig';
export default {
  helmetMiddleware,
  cspMiddleware,
  apiRateLimiter,
  authRateLimiter,
  webhookRateLimiter,
  cspReportHandler,
  validateSecurityHeaders,
  corsOptions,
  sanitizeRequest,
  applySecurityMiddleware
};
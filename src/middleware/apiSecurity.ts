/**
 * API Security Middleware
 *
 * Comprehensive security middleware stack including:
 * - CORS policy enforcement
 * - Content-Type validation
 * - Request size limits
 * - Slow POST/slowloris protection
 * - HTTP parameter pollution (HPP) prevention
 * - Request signature validation (HMAC)
 * - Security headers (Helmet)
 * - Input sanitization
 *
 * @module apiSecurity
 */

import { Request, Response, NextFunction } from 'express';
import hpp from 'hpp';
import crypto from 'crypto';

/**
 * CORS configuration
 */
export interface CORSConfig {
  /** Allowed origins */
  origins: string[] | '*';
  /** Allowed methods */
  methods?: string[];
  /** Allowed headers */
  allowedHeaders?: string[];
  /** Exposed headers */
  exposedHeaders?: string[];
  /** Allow credentials */
  credentials?: boolean;
  /** Max age in seconds */
  maxAge?: number;
}

/**
 * Request signature configuration
 */
export interface SignatureConfig {
  /** Secret key for HMAC */
  secret: string;
  /** Algorithm (default: sha256) */
  algorithm?: string;
  /** Header name containing signature */
  header?: string;
  /** Timestamp tolerance in seconds */
  tolerance?: number;
}

/**
 * CORS middleware with configurable policy
 */
export function corsMiddleware(config: CORSConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    // Check if origin is allowed
    if (config.origins === '*') {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && config.origins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (origin) {
      // Origin not allowed
      return res.status(403).json({
        error: 'Forbidden',
        message: `Origin ${origin} is not allowed by CORS policy.`,
      });
    }

    // Set other CORS headers
    if (config.methods) {
      res.setHeader('Access-Control-Allow-Methods', config.methods.join(', '));
    } else {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    }

    if (config.allowedHeaders) {
      res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
    } else {
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Request-ID');
    }

    if (config.exposedHeaders) {
      res.setHeader('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
    }

    if (config.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (config.maxAge) {
      res.setHeader('Access-Control-Max-Age', config.maxAge.toString());
    }

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  };
}

/**
 * Content-Type validation middleware
 */
export function validateContentType(allowedTypes: string[] = ['application/json']) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const contentType = req.headers['content-type'];

    if (!contentType) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content-Type header is required.',
        allowedTypes,
      });
    }

    // Check if content type is allowed
    const isAllowed = allowedTypes.some(type =>
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isAllowed) {
      return res.status(415).json({
        error: 'Unsupported Media Type',
        message: `Content-Type ${contentType} is not supported.`,
        allowedTypes,
      });
    }

    next();
  };
}

/**
 * Request size limit middleware
 */
export function requestSizeLimit(maxBytes: number = 10 * 1024 * 1024) {
  // 10MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length'];

    if (contentLength && parseInt(contentLength) > maxBytes) {
      return res.status(413).json({
        error: 'Payload Too Large',
        message: `Request body exceeds maximum size of ${maxBytes} bytes.`,
        maxBytes,
        receivedBytes: parseInt(contentLength),
      });
    }

    // Track actual received bytes
    let receivedBytes = 0;

    req.on('data', (chunk: Buffer) => {
      receivedBytes += chunk.length;

      if (receivedBytes > maxBytes) {
        req.pause();
        res.status(413).json({
          error: 'Payload Too Large',
          message: `Request body exceeds maximum size of ${maxBytes} bytes.`,
          maxBytes,
        });
        req.socket.destroy();
      }
    });

    next();
  };
}

/**
 * Slow POST/Slowloris protection middleware
 */
export function slowPostProtection(
  maxDuration: number = 30000, // 30 seconds
  minBytesPerSecond: number = 1000 // 1KB/s minimum
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    let receivedBytes = 0;

    // Set timeout
    const timeout = setTimeout(() => {
      const duration = Date.now() - startTime;
      const bytesPerSecond = receivedBytes / (duration / 1000);

      if (bytesPerSecond < minBytesPerSecond) {
        res.status(408).json({
          error: 'Request Timeout',
          message: 'Request is being sent too slowly.',
          minBytesPerSecond,
          actualBytesPerSecond: Math.round(bytesPerSecond),
        });
        req.socket.destroy();
      }
    }, maxDuration);

    req.on('data', (chunk: Buffer) => {
      receivedBytes += chunk.length;
    });

    req.on('end', () => {
      clearTimeout(timeout);
    });

    req.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  };
}

/**
 * HTTP parameter pollution (HPP) prevention
 * Uses the 'hpp' package to prevent duplicate parameters
 */
export function httpParameterPollutionProtection() {
  return hpp({
    whitelist: [], // Add whitelisted parameters that can be duplicated
    checkBody: true,
    checkQuery: true,
  });
}

/**
 * Request signature validation (HMAC)
 */
export function validateRequestSignature(config: SignatureConfig) {
  const algorithm = config.algorithm || 'sha256';
  const header = config.header || 'X-Signature';
  const timestampHeader = 'X-Timestamp';
  const tolerance = config.tolerance || 300; // 5 minutes

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers[header.toLowerCase()] as string;
      const timestamp = req.headers[timestampHeader.toLowerCase()] as string;

      if (!signature) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: `Request signature is required in ${header} header.`,
        });
      }

      if (!timestamp) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: `Timestamp is required in ${timestampHeader} header.`,
        });
      }

      // Check timestamp tolerance
      const requestTime = parseInt(timestamp);
      const now = Math.floor(Date.now() / 1000);

      if (Math.abs(now - requestTime) > tolerance) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Request timestamp is outside acceptable range.',
          tolerance,
        });
      }

      // Compute expected signature
      const payload = `${timestamp}.${JSON.stringify(req.body || {})}`;
      const expectedSignature = crypto
        .createHmac(algorithm, config.secret)
        .update(payload)
        .digest('hex');

      // Compare signatures (constant-time comparison)
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid request signature.',
        });
      }

      next();
    } catch (error) {
      console.error('Signature validation error:', error);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Signature validation failed.',
      });
    }
  };
}

/**
 * Request ID middleware (for tracing)
 */
export function requestIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();

    // Attach to request
    (req as any).requestId = requestId;

    // Add to response headers
    res.setHeader('X-Request-ID', requestId);

    next();
  };
}

/**
 * Security headers middleware (Helmet-style)
 */
export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    );

    // Permissions Policy
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()'
    );

    // HSTS (HTTP Strict Transport Security)
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    next();
  };
}

/**
 * JSON sanitization middleware
 */
export function sanitizeJSON() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    next();
  };
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Remove prototype pollution attempts
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue;
        }
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  if (typeof obj === 'string') {
    // Basic XSS prevention
    return obj
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  return obj;
}

/**
 * API versioning middleware
 */
export function apiVersioning(supportedVersions: string[] = ['v1']) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Extract version from URL path (/api/v1/...)
    const pathParts = req.path.split('/');
    const versionPart = pathParts.find(part => part.match(/^v\d+$/));

    if (!versionPart) {
      // Try from header
      const versionHeader = req.headers['api-version'] as string;

      if (versionHeader && supportedVersions.includes(versionHeader)) {
        (req as any).apiVersion = versionHeader;
        return next();
      }

      // Default to v1
      (req as any).apiVersion = 'v1';
      return next();
    }

    if (!supportedVersions.includes(versionPart)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `API version ${versionPart} is not supported.`,
        supportedVersions,
      });
    }

    (req as any).apiVersion = versionPart;
    next();
  };
}

/**
 * Method override prevention (prevent HTTP verb tampering)
 */
export function preventMethodOverride() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Remove common method override headers
    delete req.headers['x-http-method-override'];
    delete req.headers['x-method-override'];
    delete req.headers['x-http-method'];

    next();
  };
}

/**
 * Complete security middleware stack
 */
export function securityStack(config?: {
  cors?: CORSConfig;
  maxRequestSize?: number;
  enableSignatureValidation?: boolean;
  signatureConfig?: SignatureConfig;
  supportedVersions?: string[];
}) {
  const middlewares: any[] = [];

  // Request ID
  middlewares.push(requestIdMiddleware());

  // Security headers
  middlewares.push(securityHeaders());

  // CORS
  if (config?.cors) {
    middlewares.push(corsMiddleware(config.cors));
  }

  // Content type validation
  middlewares.push(validateContentType());

  // Request size limit
  middlewares.push(requestSizeLimit(config?.maxRequestSize));

  // Slow POST protection
  middlewares.push(slowPostProtection());

  // HPP protection
  middlewares.push(httpParameterPollutionProtection());

  // Method override prevention
  middlewares.push(preventMethodOverride());

  // JSON sanitization
  middlewares.push(sanitizeJSON());

  // API versioning
  if (config?.supportedVersions) {
    middlewares.push(apiVersioning(config.supportedVersions));
  }

  // Signature validation (optional)
  if (config?.enableSignatureValidation && config?.signatureConfig) {
    middlewares.push(validateRequestSignature(config.signatureConfig));
  }

  return middlewares;
}

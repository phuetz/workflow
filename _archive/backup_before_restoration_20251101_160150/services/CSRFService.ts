/**
 * CSRF Protection Service
 * Advanced Cross-Site Request Forgery protection with double-submit cookies
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from './LoggingService';
import { config } from '../config/environment';

interface CSRFOptions {
  cookieName?: string;
  headerName?: string;
  tokenLength?: number;
  maxAge?: number;
  sameSite?: 'strict' | 'lax' | 'none';
  secure?: boolean;
  httpOnly?: boolean;
  ignoreMethods?: string[];
  skipRoutes?: RegExp[];
  customValidator?: (req: Request, token: string) => boolean;
}

export class CSRFService {
  private static instance: CSRFService;
  private options: Required<CSRFOptions>;
  private tokenStore: Map<string, { token: string; expires: number }> = new Map();

  private constructor(options: CSRFOptions = {}) {
    this.options = {
      cookieName: options.cookieName || 'csrf-token',
      headerName: options.headerName || 'x-csrf-token',
      tokenLength: options.tokenLength || 32,
      maxAge: options.maxAge || 86400000, // 24 hours
      sameSite: options.sameSite || 'strict',
      secure: options.secure ?? config.security.httpsOnly,
      httpOnly: options.httpOnly ?? false,
      ignoreMethods: options.ignoreMethods || ['GET', 'HEAD', 'OPTIONS'],
      skipRoutes: options.skipRoutes || [
        /^\/health/,
        /^\/webhooks/,
        /^\/api\/v1\/auth\/callback/
      ],
      customValidator: options.customValidator || (() => false)
    };

    this.startCleanupInterval();
    logger.info('🛡️ CSRF Protection initialized');
  }

  public static getInstance(options?: CSRFOptions): CSRFService {
    if (!CSRFService.instance) {
      CSRFService.instance = new CSRFService(options);
    }
    return CSRFService.instance;
  }

  /**
   * Generate CSRF token
   */
  public generateToken(sessionId?: string): string {
    
    if (sessionId) {
      this.tokenStore.set(sessionId, {
        token,
        expires: Date.now() + this.options.maxAge
      });
    }
    
    return token;
  }

  /**
   * Validate CSRF token
   */
  public validateToken(
    token: string, 
    cookieToken?: string, 
    sessionId?: string
  ): boolean {
    if (!token) return false;

    // Double-submit cookie validation
    if (cookieToken && token === cookieToken) {
      return true;
    }

    // Session-based validation
    if (sessionId) {
      if (storedToken && storedToken.token === token && storedToken.expires > Date.now()) {
        return true;
      }
    }

    return false;
  }

  /**
   * CSRF protection middleware
   */
  public middleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip for ignored methods
      if (this.options.ignoreMethods.includes(req.method)) {
        this.setCSRFToken(req, res);
        return next();
      }

      // Skip for configured routes
      if (this.shouldSkipRoute(req.path)) {
        return next();
      }

      // Get tokens from various sources
      

      // Validate token
      
      if (submittedToken) {
        // Try different validation methods
        isValid = this.validateToken(submittedToken, cookieToken, sessionId) ||
                 this.options.customValidator(req, submittedToken);
      }

      if (!isValid) {
        logger.warn('🚨 CSRF token validation failed', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          userAgent: req.headers['user-agent'],
          hasHeaderToken: !!headerToken,
          hasBodyToken: !!bodyToken,
          hasCookieToken: !!cookieToken,
          sessionId: sessionId?.slice(0, 8) // Log only part for privacy
        });

        return this.handleCSRFError(res);
      }

      // Token is valid, continue
      logger.debug('✅ CSRF token validated', {
        path: req.path,
        method: req.method
      });

      next();
    };
  }

  /**
   * Set CSRF token in response
   */
  private setCSRFToken(req: Request, res: Response): void {

    // Set cookie
    res.cookie(this.options.cookieName, token, {
      maxAge: this.options.maxAge,
      sameSite: this.options.sameSite,
      secure: this.options.secure,
      httpOnly: this.options.httpOnly,
      path: '/'
    });

    // Set header for SPA consumption
    res.setHeader('X-CSRF-Token', token);

    // Add to locals for template rendering
    if (res.locals) {
      res.locals.csrfToken = token;
    }
  }

  private shouldSkipRoute(path: string): boolean {
    return this.options.skipRoutes.some(pattern => pattern.test(path));
  }

  private handleCSRFError(res: Response): void {
    res.status(403).json({
      error: 'CSRF token validation failed',
      code: 'CSRF_TOKEN_INVALID',
      message: 'Invalid or missing CSRF token. Please refresh the page and try again.'
    });
  }

  /**
   * Endpoint to get CSRF token
   */
  public tokenEndpoint(): (req: Request, res: Response) => void {
    return (req: Request, res: Response) => {

      // Set cookie
      res.cookie(this.options.cookieName, token, {
        maxAge: this.options.maxAge,
        sameSite: this.options.sameSite,
        secure: this.options.secure,
        httpOnly: this.options.httpOnly
      });

      res.json({
        csrfToken: token,
        cookieName: this.options.cookieName,
        headerName: this.options.headerName
      });
    };
  }

  /**
   * Cleanup expired tokens
   */
  private startCleanupInterval(): void {
    setInterval(() => {

      for (const [sessionId, tokenData] of this.tokenStore) {
        if (tokenData.expires < now) {
          this.tokenStore.delete(sessionId);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.debug(`🧹 Cleaned up ${cleaned} expired CSRF tokens`);
      }
    }, 300000); // Clean every 5 minutes
  }

  /**
   * Generate anti-CSRF form HTML
   */
  public generateFormHTML(token: string): string {
    return `<input type="hidden" name="_csrf" value="${token}" />`;
  }

  /**
   * Generate meta tag for SPA
   */
  public generateMetaTag(token: string): string {
    return `<meta name="csrf-token" content="${token}" />`;
  }

  /**
   * Verify double-submit pattern
   */
  public verifyDoubleSubmit(req: Request): boolean {
    
    return !!(headerToken && cookieToken && headerToken === cookieToken);
  }

  /**
   * Create CSRF token for API response
   */
  public createAPIToken(userId: string): string {
      userId,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex')
    };

      .createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
      .update(JSON.stringify(payload))
      .digest('hex');

    return Buffer.from(JSON.stringify({ ...payload, signature })).toString('base64');
  }

  /**
   * Validate API CSRF token
   */
  public validateAPIToken(token: string, userId: string): boolean {
    try {
      
      // Check timestamp (token expires in 1 hour)
      if (Date.now() - decoded.timestamp > 3600000) {
        return false;
      }

      // Check user ID
      if (decoded.userId !== userId) {
        return false;
      }

      // Verify signature
      const { _signature, ...payload } = decoded;
        .createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
        .update(JSON.stringify(payload))
        .digest('hex');

      return signature === expectedSignature;
    } catch {
      return false;
    }
  }

  /**
   * Get CSRF protection statistics
   */
  public getStats(): {
    activeTokens: number;
    configuration: Partial<CSRFOptions>;
  } {
    return {
      activeTokens: this.tokenStore.size,
      configuration: {
        cookieName: this.options.cookieName,
        headerName: this.options.headerName,
        tokenLength: this.options.tokenLength,
        maxAge: this.options.maxAge,
        sameSite: this.options.sameSite,
        secure: this.options.secure,
        httpOnly: this.options.httpOnly
      }
    };
  }
}

export const csrfService = CSRFService.getInstance();
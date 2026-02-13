/**
 * CSRF Protection Service
 * Cross-Site Request Forgery protection with token management
 */

import crypto from 'crypto';
import { logger } from '../../services/LoggingService';

export interface CSRFToken {
  token: string;
  secret: string;
  createdAt: Date;
  expiresAt: Date;
}

export class CSRFProtectionService {
  private tokens: Map<string, CSRFToken> = new Map(); // sessionId -> token
  private readonly TOKEN_LENGTH = 32;
  private readonly TOKEN_LIFETIME = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.startCleanupInterval();
    logger.info('CSRFProtectionService initialized');
  }

  /**
   * Generate CSRF token for session
   */
  async generateToken(sessionId: string): Promise<string> {
    // Generate random secret and token
    const secret = crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
    const token = crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');

    const now = new Date();
    const csrfToken: CSRFToken = {
      token,
      secret,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.TOKEN_LIFETIME)
    };

    this.tokens.set(sessionId, csrfToken);

    logger.debug('CSRF token generated', { sessionId });
    return token;
  }

  /**
   * Verify CSRF token
   */
  async verifyToken(sessionId: string, token: string): Promise<boolean> {
    const csrfToken = this.tokens.get(sessionId);
    if (!csrfToken) {
      logger.warn('CSRF token verification failed: token not found', { sessionId });
      return false;
    }

    // Check expiration
    if (csrfToken.expiresAt < new Date()) {
      this.tokens.delete(sessionId);
      logger.warn('CSRF token expired', { sessionId });
      return false;
    }

    // Constant-time comparison
    const isValid = this.constantTimeCompare(csrfToken.token, token);

    if (!isValid) {
      logger.warn('CSRF token verification failed: invalid token', { sessionId });
    }

    return isValid;
  }

  /**
   * Revoke CSRF token
   */
  async revokeToken(sessionId: string): Promise<void> {
    this.tokens.delete(sessionId);
    logger.debug('CSRF token revoked', { sessionId });
  }

  /**
   * Cleanup expired tokens
   */
  private async cleanup(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, token] of this.tokens.entries()) {
      if (token.expiresAt < now) {
        this.tokens.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('CSRF token cleanup', { cleaned });
    }

    return cleaned;
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Constant-time string comparison
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalTokens: number;
    expiredTokens: number;
  } {
    const now = new Date();
    let expiredTokens = 0;

    for (const token of this.tokens.values()) {
      if (token.expiresAt < now) {
        expiredTokens++;
      }
    }

    return {
      totalTokens: this.tokens.size,
      expiredTokens
    };
  }
}

// Singleton instance
export const csrfProtection = new CSRFProtectionService();

// Express middleware
export function csrfMiddleware() {
  return async (req: any, res: any, next: any) => {
    try {
      const sessionId = req.sessionId;
      if (!sessionId) {
        return res.status(403).json({
          error: 'No session found'
        });
      }

      // Skip CSRF check for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      // Get token from header or body
      const token = req.headers['x-csrf-token'] || req.body?._csrf;
      if (!token) {
        logger.warn('CSRF token missing', {
          method: req.method,
          path: req.path
        });
        return res.status(403).json({
          error: 'CSRF token missing'
        });
      }

      // Verify token
      const isValid = await csrfProtection.verifyToken(sessionId, token);
      if (!isValid) {
        logger.warn('CSRF token invalid', {
          method: req.method,
          path: req.path,
          sessionId
        });
        return res.status(403).json({
          error: 'CSRF token invalid'
        });
      }

      next();
    } catch (error) {
      logger.error('CSRF middleware error:', error);
      return res.status(500).json({
        error: 'Internal server error'
      });
    }
  };
}

/**
 * Security Headers Middleware
 * Apply security headers to all responses
 */
export function securityHeadersMiddleware() {
  return (req: any, res: any, next: any) => {
    // Strict Transport Security (HSTS)
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );

    // Content Security Policy (CSP)
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://api.workflowbuilder.com wss:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ')
    );

    // X-Frame-Options
    res.setHeader('X-Frame-Options', 'DENY');

    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-XSS-Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()'
    );

    // Remove server header
    res.removeHeader('X-Powered-By');

    next();
  };
}

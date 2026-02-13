/**
 * Advanced Security Middleware
 * CSRF, XSS, Rate Limiting, and Security Headers
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

interface SecurityConfig {
  enableCSRF: boolean;
  enableXSSProtection: boolean;
  enableRateLimiting: boolean;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
    blockDurationMs: number;
  };
  enableCORS: boolean;
  allowedOrigins: string[];
  enableSecurityHeaders: boolean;
}

export class SecurityMiddleware {
  private rateLimitMap = new Map<string, RateLimitEntry>();
  private csrfTokens = new Map<string, { token: string; expiresAt: number }>();
  private config: SecurityConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      enableCSRF: true,
      enableXSSProtection: true,
      enableRateLimiting: true,
      rateLimit: {
        maxRequests: 100,
        windowMs: 60000, // 1 minute
        blockDurationMs: 300000 // 5 minutes
      },
      enableCORS: true,
      allowedOrigins: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://workflowbuilder.app'
      ],
      enableSecurityHeaders: true,
      ...config
    };

    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * CSRF Protection
   */
  generateCSRFToken(userId: string): string {
    const token = this.generateSecureToken();
    const expiresAt = Date.now() + 3600000; // 1 hour

    this.csrfTokens.set(userId, { token, expiresAt });

    return token;
  }

  validateCSRFToken(userId: string, token: string): boolean {
    if (!this.config.enableCSRF) return true;

    const stored = this.csrfTokens.get(userId);

    if (!stored) {
      console.warn('🔒 CSRF token not found for user:', userId);
      return false;
    }

    if (Date.now() > stored.expiresAt) {
      console.warn('🔒 CSRF token expired for user:', userId);
      this.csrfTokens.delete(userId);
      return false;
    }

    if (stored.token !== token) {
      console.warn('🔒 CSRF token mismatch for user:', userId);
      return false;
    }

    return true;
  }

  /**
   * XSS Protection - Sanitize user input
   */
  sanitizeInput(input: string): string {
    if (!this.config.enableXSSProtection) return input;

    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  sanitizeObject<T extends Record<string, any>>(obj: T): T {
    if (!this.config.enableXSSProtection) return obj;

    const sanitized = {} as T;

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key as keyof T] = this.sanitizeInput(value) as T[keyof T];
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key as keyof T] = this.sanitizeObject(value);
      } else {
        sanitized[key as keyof T] = value;
      }
    }

    return sanitized;
  }

  /**
   * Rate Limiting
   */
  checkRateLimit(identifier: string): { allowed: boolean; remainingRequests?: number; resetTime?: number; retryAfter?: number } {
    if (!this.config.enableRateLimiting) {
      return { allowed: true };
    }

    const now = Date.now();
    const entry = this.rateLimitMap.get(identifier);

    // Check if currently blocked
    if (entry?.blockedUntil && now < entry.blockedUntil) {
      const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
      console.warn(`🔒 Rate limit exceeded for ${identifier}. Blocked for ${retryAfter}s`);
      return {
        allowed: false,
        retryAfter
      };
    }

    // Initialize or reset if window expired
    if (!entry || now >= entry.resetTime) {
      this.rateLimitMap.set(identifier, {
        count: 1,
        resetTime: now + this.config.rateLimit.windowMs
      });
      return {
        allowed: true,
        remainingRequests: this.config.rateLimit.maxRequests - 1,
        resetTime: now + this.config.rateLimit.windowMs
      };
    }

    // Increment counter
    entry.count++;

    // Check if limit exceeded
    if (entry.count > this.config.rateLimit.maxRequests) {
      entry.blockedUntil = now + this.config.rateLimit.blockDurationMs;
      const retryAfter = Math.ceil(this.config.rateLimit.blockDurationMs / 1000);

      console.warn(`🔒 Rate limit exceeded for ${identifier}. Blocking for ${retryAfter}s`);

      return {
        allowed: false,
        retryAfter
      };
    }

    return {
      allowed: true,
      remainingRequests: this.config.rateLimit.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  resetRateLimit(identifier: string): void {
    this.rateLimitMap.delete(identifier);
  }

  /**
   * CORS Validation
   */
  validateOrigin(origin: string): boolean {
    if (!this.config.enableCORS) return true;

    return this.config.allowedOrigins.includes(origin) ||
           this.config.allowedOrigins.includes('*');
  }

  getCORSHeaders(origin: string): Record<string, string> {
    if (!this.config.enableCORS || !this.validateOrigin(origin)) {
      return {};
    }

    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    };
  }

  /**
   * Security Headers
   */
  getSecurityHeaders(): Record<string, string> {
    if (!this.config.enableSecurityHeaders) return {};

    return {
      // Prevent clickjacking
      'X-Frame-Options': 'SAMEORIGIN',

      // Enable XSS protection
      'X-XSS-Protection': '1; mode=block',

      // Prevent MIME sniffing
      'X-Content-Type-Options': 'nosniff',

      // Referrer policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',

      // Content Security Policy
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
        "frame-ancestors 'self'"
      ].join('; '),

      // Strict Transport Security (HSTS)
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',

      // Permissions Policy
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    };
  }

  /**
   * Input Validation
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateURL(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  /**
   * SQL Injection Prevention
   */
  escapeSQLString(str: string): string {
    return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
  }

  /**
   * Path Traversal Prevention
   */
  sanitizePath(path: string): string {
    return path
      .replace(/\.\./g, '')
      .replace(/[<>:"|?*]/g, '')
      .replace(/^\/+/, '');
  }

  /**
   * Token Generation
   */
  private generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();

    // Clean rate limit entries
    for (const [key, entry] of this.rateLimitMap.entries()) {
      if (now >= entry.resetTime && (!entry.blockedUntil || now >= entry.blockedUntil)) {
        this.rateLimitMap.delete(key);
      }
    }

    // Clean CSRF tokens
    for (const [key, data] of this.csrfTokens.entries()) {
      if (now >= data.expiresAt) {
        this.csrfTokens.delete(key);
      }
    }
  }

  /**
   * Request Validation Middleware
   */
  async validateRequest(request: {
    method: string;
    headers: Record<string, string>;
    body?: any;
    userId?: string;
    ip?: string;
  }): Promise<{ valid: boolean; error?: string; headers?: Record<string, string> }> {
    const { method, headers, body, userId, ip } = request;
    const identifier = userId || ip || 'anonymous';

    // Rate limiting
    const rateCheck = this.checkRateLimit(identifier);
    if (!rateCheck.allowed) {
      return {
        valid: false,
        error: `Rate limit exceeded. Retry after ${rateCheck.retryAfter} seconds`,
        headers: {
          'Retry-After': String(rateCheck.retryAfter || 60),
          'X-RateLimit-Limit': String(this.config.rateLimit.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + (rateCheck.retryAfter || 60))
        }
      };
    }

    // CSRF validation for state-changing methods
    if (userId && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const csrfToken = headers['x-csrf-token'];
      if (!csrfToken || !this.validateCSRFToken(userId, csrfToken)) {
        return {
          valid: false,
          error: 'Invalid or missing CSRF token'
        };
      }
    }

    // CORS validation
    const origin = headers['origin'];
    if (origin && !this.validateOrigin(origin)) {
      return {
        valid: false,
        error: 'CORS policy violation'
      };
    }

    // Sanitize body if present
    if (body && this.config.enableXSSProtection) {
      request.body = this.sanitizeObject(body);
    }

    return {
      valid: true,
      headers: {
        ...this.getSecurityHeaders(),
        ...(origin ? this.getCORSHeaders(origin) : {}),
        'X-RateLimit-Limit': String(this.config.rateLimit.maxRequests),
        'X-RateLimit-Remaining': String(rateCheck.remainingRequests || 0),
        'X-RateLimit-Reset': String(Math.ceil((rateCheck.resetTime || Date.now()) / 1000))
      }
    };
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.rateLimitMap.clear();
    this.csrfTokens.clear();
  }
}

// Export singleton instance
export const securityMiddleware = new SecurityMiddleware();

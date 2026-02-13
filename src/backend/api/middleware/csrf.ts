/**
 * CSRF Protection Middleware
 * Implements Double Submit Cookie pattern for CSRF protection
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-XSRF-TOKEN';

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware to set CSRF token cookie on every request
 * The cookie is readable by JavaScript so the frontend can include it in headers
 */
export function csrfTokenMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check if token already exists in cookies
  const existingToken = req.cookies?.[CSRF_COOKIE_NAME];

  if (!existingToken) {
    const token = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be readable by JavaScript to send in header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    });
  }

  next();
}

/**
 * Middleware to validate CSRF token on state-changing requests
 * Compares the token from cookie with the token from header
 */
export function csrfValidationMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip validation for safe HTTP methods (read-only operations)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  // Skip CSRF validation for webhook endpoints (they use other auth mechanisms)
  if (req.path.startsWith('/api/webhooks/')) {
    next();
    return;
  }

  // Skip CSRF validation for analytics/vitals endpoint (uses sendBeacon which can't send headers)
  if (req.path === '/api/analytics/vitals' || req.path === '/analytics/vitals') {
    next();
    return;
  }

  // Skip CSRF validation for API key authenticated requests
  if (req.headers['x-api-key']) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME.toLowerCase()] as string | undefined;

  // Both tokens must be present
  if (!cookieToken || !headerToken) {
    res.status(403).json({
      error: 'CSRF token missing',
      message: 'A valid CSRF token is required for this request'
    });
    return;
  }

  // Tokens must match (constant-time comparison to prevent timing attacks)
  try {
    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);

    // Buffers must be same length for timingSafeEqual
    if (cookieBuffer.length !== headerBuffer.length ||
        !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
      res.status(403).json({
        error: 'Invalid CSRF token',
        message: 'The provided CSRF token does not match'
      });
      return;
    }
  } catch {
    res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'The provided CSRF token is malformed'
    });
    return;
  }

  next();
}

/**
 * Combined middleware that sets and validates CSRF tokens
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // First, ensure a token is set
  csrfTokenMiddleware(req, res, () => {
    // Then validate it for state-changing requests
    csrfValidationMiddleware(req, res, next);
  });
}

/**
 * Endpoint to get a fresh CSRF token
 * Useful for SPAs that need to refresh tokens
 */
export function csrfTokenHandler(_req: Request, res: Response): void {
  const token = generateCsrfToken();

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/'
  });

  res.json({ csrfToken: token });
}

export default {
  generateCsrfToken,
  csrfTokenMiddleware,
  csrfValidationMiddleware,
  csrfProtection,
  csrfTokenHandler,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME
};

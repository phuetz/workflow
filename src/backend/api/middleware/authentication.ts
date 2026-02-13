/**
 * Authentication Middleware
 * Handles JWT verification, API key validation, and user session management
 *
 * Features:
 * - JWT token validation
 * - API key authentication
 * - Session management
 * - Role-based access control (RBAC)
 * - Rate limiting per user
 * - Request logging and auditing
 */

import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../../auth/jwt';
import { APIKeyService } from '../../auth/APIKeyService';
import { SessionService } from '../../security/SessionService';
import { RateLimitService } from '../../security/RateLimitService';
import { RBACService } from '../../auth/RBACService';
import { logger } from '../../../services/SimpleLogger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'user' | 'viewer';
    permissions: string[];
  };
  session?: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
  apiKey?: {
    id: string;
    userId: string;
    permissions: string[];
  };
}

export class AuthenticationMiddleware {
  private apiKeyService: APIKeyService;
  private sessionService: SessionService;
  private rateLimitService: RateLimitService;
  private rbacService: RBACService;

  constructor() {
    this.apiKeyService = new APIKeyService();
    this.sessionService = new SessionService();
    this.rateLimitService = new RateLimitService();
    this.rbacService = new RBACService();
  }

  /**
   * Main authentication middleware
   * Supports both JWT and API key authentication
   */
  authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Try API key authentication first
      const apiKey = this.extractApiKey(req);
      if (apiKey) {
        const authenticated = await this.authenticateWithApiKey(req, apiKey);
        if (authenticated) {
          return next();
        }
      }

      // Try JWT authentication
      const token = this.extractJwtToken(req);
      if (token) {
        const authenticated = await this.authenticateWithJwt(req, token);
        if (authenticated) {
          return next();
        }
      }

      // No valid authentication found
      logger.warn('Authentication failed: No valid credentials provided', {
        ip: req.ip,
        path: req.path,
      });

      res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid JWT token or API key',
      });
    } catch (error) {
      logger.error('Authentication middleware error:', error);
      res.status(500).json({
        error: 'Authentication error',
        message: 'An error occurred during authentication',
      });
    }
  };

  /**
   * Optional authentication - continues even if not authenticated
   */
  optionalAuthenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const apiKey = this.extractApiKey(req);
      if (apiKey) {
        await this.authenticateWithApiKey(req, apiKey);
        return next();
      }

      const token = this.extractJwtToken(req);
      if (token) {
        await this.authenticateWithJwt(req, token);
      }

      next();
    } catch (error) {
      logger.error('Optional authentication error:', error);
      next();
    }
  };

  /**
   * Require specific role
   */
  requireRole = (roles: string | string[]) => {
    const roleArray = Array.isArray(roles) ? roles : [roles];

    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'Please authenticate first',
        });
        return;
      }

      if (!roleArray.includes(req.user.role)) {
        logger.warn('Authorization failed: Insufficient role', {
          userId: req.user.id,
          requiredRoles: roleArray,
          userRole: req.user.role,
          path: req.path,
        });

        res.status(403).json({
          error: 'Insufficient permissions',
          message: `Required role: ${roleArray.join(' or ')}`,
        });
        return;
      }

      next();
    };
  };

  /**
   * Require specific permission
   */
  requirePermission = (permissions: string | string[]) => {
    const permArray = Array.isArray(permissions) ? permissions : [permissions];

    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
        });
        return;
      }

      try {
        const hasPermission = permArray.some(perm =>
          this.rbacService.hasPermission(req.user!.id, perm as never)
        );

        if (!hasPermission) {
          logger.warn('Authorization failed: Missing permission', {
            userId: req.user.id,
            requiredPermissions: permArray,
            userPermissions: req.user.permissions,
            path: req.path,
          });

          res.status(403).json({
            error: 'Insufficient permissions',
            message: `Required permission: ${permArray.join(' or ')}`,
          });
          return;
        }

        next();
      } catch (error) {
        logger.error('Permission check error:', error);
        res.status(500).json({
          error: 'Authorization error',
        });
      }
    };
  };

  /**
   * Rate limiting per user
   */
  rateLimit = (options: {
    maxRequests: number;
    windowMs: number;
  }) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      const identifier = req.user?.id || req.ip || 'anonymous';

      try {
        const allowed = await this.rateLimitService.checkLimit(
          identifier,
          { maxRequests: options.maxRequests, windowMs: options.windowMs }
        );

        if (!allowed) {
          logger.warn('Rate limit exceeded', {
            identifier,
            path: req.path,
          });

          res.status(429).json({
            error: 'Rate limit exceeded',
            message: `Maximum ${options.maxRequests} requests per ${options.windowMs / 1000}s`,
          });
          return;
        }

        next();
      } catch (error) {
        logger.error('Rate limit check error:', error);
        next(); // Continue on error to avoid blocking legitimate requests
      }
    };
  };

  /**
   * Extract API key from request
   */
  private extractApiKey(req: Request): string | null {
    // Check header
    const headerKey = req.header('X-API-Key') || req.header('Authorization');
    if (headerKey?.startsWith('ApiKey ')) {
      return headerKey.substring(7);
    }

    // Check query parameter
    const queryKey = req.query.apiKey as string;
    if (queryKey) {
      return queryKey;
    }

    return null;
  }

  /**
   * Extract JWT token from request
   */
  private extractJwtToken(req: Request): string | null {
    const authHeader = req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookie
    const cookieToken = req.cookies?.token;
    if (cookieToken) {
      return cookieToken;
    }

    return null;
  }

  /**
   * Authenticate with API key
   */
  private async authenticateWithApiKey(
    req: AuthenticatedRequest,
    apiKey: string
  ): Promise<boolean> {
    try {
      const keyData = await this.apiKeyService.validateAPIKey(apiKey);
      if (!keyData) {
        return false;
      }

      // Load user data - use the userId from keyData
      const user = keyData.userId ? { id: keyData.userId, email: '', role: 'user', permissions: [] } : null;
      if (!user) {
        return false;
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role as 'admin' | 'user' | 'viewer',
        permissions: user.permissions || [],
      };

      req.apiKey = {
        id: keyData.id,
        userId: user.id,
        permissions: keyData.scopes || [],
      };

      logger.debug('API key authentication successful', {
        userId: user.id,
        apiKeyId: keyData.id,
      });

      return true;
    } catch (error) {
      logger.error('API key authentication error:', error);
      return false;
    }
  }

  /**
   * Authenticate with JWT token
   */
  private async authenticateWithJwt(
    req: AuthenticatedRequest,
    token: string
  ): Promise<boolean> {
    try {
      const payload = await jwtService.verifyToken(token);
      if (!payload) {
        return false;
      }

      // Check session validity - get session by user id
      const session = await this.sessionService.get(payload.sub);
      if (!session) {
        logger.warn('Invalid or expired session', {
          userId: payload.sub,
        });
        return false;
      }

      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role as 'admin' | 'user' | 'viewer',
        permissions: payload.permissions || [],
      };

      req.session = {
        id: session.id,
        userId: session.userId,
        expiresAt: new Date(session.expiresAt),
      };

      logger.debug('JWT authentication successful', {
        userId: payload.sub,
        sessionId: session.id,
      });

      return true;
    } catch (error) {
      logger.error('JWT authentication error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const authMiddleware = new AuthenticationMiddleware();

// Export individual middleware functions
export const authenticate = authMiddleware.authenticate;
export const optionalAuthenticate = authMiddleware.optionalAuthenticate;
export const requireRole = authMiddleware.requireRole;
export const requirePermission = authMiddleware.requirePermission;
export const rateLimit = authMiddleware.rateLimit;

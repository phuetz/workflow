/**
 * Authorization Middleware
 *
 * Express middleware for RBAC authorization
 * Checks user permissions before allowing access to resources
 *
 * @module backend/middleware/authorization
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { getRBACService, ResourceType } from '../services/RBACService';

const rbac = getRBACService();
const prisma = new PrismaClient();

/**
 * Extended Express Request with user info
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware to check resource permission
 *
 * @example
 * router.get('/credentials/:id',
 *   authenticate,
 *   authorize(ResourceType.CREDENTIAL, 'read', 'params.id'),
 *   getCredential
 * );
 */
export function authorize(
  resourceType: ResourceType,
  action: string,
  resourceIdPath: string = 'params.id'
) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Check authentication
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Extract resource ID from request
      const resourceId = getNestedProperty(req, resourceIdPath);

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: 'Resource ID not provided'
        });
      }

      // Check permission
      const result = await rbac.checkPermission({
        userId: req.user.id,
        resourceType,
        resourceId,
        action
      });

      if (!result.allowed) {
        return res.status(403).json({
          success: false,
          error: 'Permission denied',
          reason: result.reason
        });
      }

      // Permission granted - continue to next middleware
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }
  };
}

/**
 * Middleware to check if user owns resource
 *
 * @example
 * router.delete('/credentials/:id',
 *   authenticate,
 *   requireOwnership(ResourceType.CREDENTIAL, 'params.id'),
 *   deleteCredential
 * );
 */
export function requireOwnership(
  resourceType: ResourceType,
  resourceIdPath: string = 'params.id'
) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const resourceId = getNestedProperty(req, resourceIdPath);

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: 'Resource ID not provided'
        });
      }

      // Check ownership through RBAC service
      const result = await rbac.checkPermission({
        userId: req.user.id,
        resourceType,
        resourceId,
        action: 'admin' // Ownership implies admin permission
      });

      if (!result.allowed || result.source !== 'direct') {
        return res.status(403).json({
          success: false,
          error: 'Resource ownership required'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        error: 'Ownership check failed'
      });
    }
  };
}

/**
 * Middleware to require specific role
 *
 * @example
 * router.get('/admin/users',
 *   authenticate,
 *   requireRole(['ADMIN']),
 *   listUsers
 * );
 */
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(authReq.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role',
        required: roles,
        current: authReq.user.role
      });
    }

    next();
  };
}

/**
 * Middleware for admin-only routes
 */
export const requireAdmin = requireRole(['ADMIN']);

/**
 * Middleware to check credential share permission
 */
export function authorizeCredentialShare(permissionType: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const credentialId = req.params.id || req.body.credentialId;

      if (!credentialId) {
        return res.status(400).json({
          success: false,
          error: 'Credential ID not provided'
        });
      }

      const result = await rbac.checkPermission({
        userId: req.user.id,
        resourceType: ResourceType.CREDENTIAL,
        resourceId: credentialId,
        action: permissionType
      });

      if (!result.allowed) {
        return res.status(403).json({
          success: false,
          error: `Credential ${permissionType} permission denied`,
          reason: result.reason
        });
      }

      next();
    } catch (error) {
      console.error('Credential share authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }
  };
}

/**
 * Helper to get nested property from object
 */
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => {
    return current?.[prop];
  }, obj);
}

/**
 * Audit middleware - logs authorization attempts
 */
export function auditAuthorization() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Capture response
    const originalSend = res.send;
    res.send = function (data: any) {
      const duration = Date.now() - start;

      // Log authorization attempt
      if (req.user) {
        const auditData = {
          userId: req.user.id,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          timestamp: new Date().toISOString()
        };

        // Log to console
        console.log('Authorization audit:', auditData);

        // Store in audit log table asynchronously (don't block response)
        prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: `API_${req.method}_${res.statusCode >= 400 ? 'FAILED' : 'SUCCESS'}`,
            resource: 'API',
            resourceId: req.path,
            details: {
              method: req.method,
              path: req.path,
              query: req.query,
              statusCode: res.statusCode,
              duration
            },
            ipAddress: (req.ip || req.headers['x-forwarded-for'] || 'unknown') as string,
            userAgent: req.headers['user-agent'] || 'unknown'
          }
        }).catch((err) => {
          console.error('Failed to store audit log:', err);
        });
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Rate limiting per user per resource
 */
export function rateLimitByResource(
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
) {
  const requestCounts = new Map<string, { count: number; resetAt: number }>();

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next();
    }

    const key = `${req.user.id}:${req.path}`;
    const now = Date.now();
    const record = requestCounts.get(key);

    if (!record || now > record.resetAt) {
      // Reset window
      requestCounts.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((record.resetAt - now) / 1000)
      });
    }

    record.count++;
    next();
  };
}

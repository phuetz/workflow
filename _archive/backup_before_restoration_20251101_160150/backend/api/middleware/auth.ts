/**
 * Authentication Middleware
 * Validates JWT tokens and attaches user to request
 */

import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../../auth/jwt';
import { userRepository } from '../../database/userRepository';
import { logger } from '../../../services/LoggingService';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : undefined;

    if (!token) {
      res.status(401).json({ error: 'No authentication token provided' });
      return;
    }

    const payload = await jwtService.verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Verify user still exists and is active
    const user = await userRepository.findById(payload.sub);
    if (!user || user.status !== 'active') {
      res.status(401).json({ error: 'User account not found or inactive' });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Role-based access control middleware
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Permission-based access control middleware
 */
export function requirePermission(...permissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hasPermission = permissions.every(permission =>
      req.user!.permissions.includes(permission)
    );

    if (!hasPermission) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

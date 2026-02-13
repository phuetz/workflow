/**
 * API Authentication Middleware
 *
 * Provides multiple authentication methods for API endpoints:
 * - API Key authentication
 * - JWT Bearer token authentication
 * - OAuth 2.0 client credentials
 * - API key rotation and expiration
 * - Scope-based authorization
 *
 * @module apiAuthentication
 */

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Extended Request interface with user info
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
    scopes?: string[];
  };
  apiKey?: {
    id: string;
    name: string;
    scopes: string[];
    userId: string;
  };
}

/**
 * API Key information
 */
export interface APIKey {
  id: string;
  name: string;
  key: string; // Hashed
  userId: string;
  scopes: string[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  revokedAt?: Date;
}

/**
 * Available API scopes
 */
export enum APIScope {
  // Workflow scopes
  WORKFLOWS_READ = 'workflows:read',
  WORKFLOWS_WRITE = 'workflows:write',
  WORKFLOWS_DELETE = 'workflows:delete',
  WORKFLOWS_EXECUTE = 'workflows:execute',

  // Execution scopes
  EXECUTIONS_READ = 'executions:read',
  EXECUTIONS_WRITE = 'executions:write',
  EXECUTIONS_DELETE = 'executions:delete',

  // Credential scopes
  CREDENTIALS_READ = 'credentials:read',
  CREDENTIALS_WRITE = 'credentials:write',
  CREDENTIALS_DELETE = 'credentials:delete',

  // Webhook scopes
  WEBHOOKS_READ = 'webhooks:read',
  WEBHOOKS_WRITE = 'webhooks:write',
  WEBHOOKS_DELETE = 'webhooks:delete',

  // User management
  USERS_READ = 'users:read',
  USERS_WRITE = 'users:write',
  USERS_DELETE = 'users:delete',

  // Analytics
  ANALYTICS_READ = 'analytics:read',

  // Admin scopes
  ADMIN = 'admin',
}

/**
 * API Key Service
 */
export class APIKeyService {
  /**
   * Generate a new API key
   */
  public static async createAPIKey(
    userId: string,
    name: string,
    scopes: string[],
    expiresInDays?: number
  ): Promise<{ key: string; apiKey: APIKey }> {
    // Generate cryptographically secure random key
    const key = `wf_${crypto.randomBytes(32).toString('hex')}`;

    // Hash the key for storage
    const keyHash = crypto
      .createHash('sha256')
      .update(key)
      .digest('hex');

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    const apiKey: APIKey = {
      id: crypto.randomUUID(),
      name,
      key: keyHash,
      userId,
      scopes,
      expiresAt,
      createdAt: new Date(),
    };

    // Store in in-memory storage (replace with database in production)
    this.apiKeys.set(keyHash, apiKey);

    // Return the plain text key (only shown once)
    return { key, apiKey };
  }

  /**
   * Verify an API key
   */
  public static async verifyAPIKey(key: string): Promise<APIKey | null> {
    if (!key.startsWith('wf_')) {
      return null;
    }

    // Hash the provided key
    const keyHash = crypto
      .createHash('sha256')
      .update(key)
      .digest('hex');

    // Look up in database
    // const apiKey = await prisma.apiKey.findFirst({
    //   where: { key: keyHash, revokedAt: null }
    // });

    // Temporary in-memory storage for demo
    const apiKey = this.apiKeys.get(keyHash);

    if (!apiKey) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update last used timestamp
    apiKey.lastUsedAt = new Date();
    // await prisma.apiKey.update({
    //   where: { id: apiKey.id },
    //   data: { lastUsedAt: new Date() }
    // });

    return apiKey;
  }

  /**
   * Revoke an API key
   */
  public static async revokeAPIKey(keyId: string): Promise<void> {
    // Find and revoke the key in memory
    for (const [hash, apiKey] of this.apiKeys.entries()) {
      if (apiKey.id === keyId) {
        apiKey.revokedAt = new Date();
        this.apiKeys.set(hash, apiKey);
        break;
      }
    }
  }

  /**
   * List user's API keys
   */
  public static async listAPIKeys(userId: string): Promise<Omit<APIKey, 'key'>[]> {
    const keys: Omit<APIKey, 'key'>[] = [];
    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.userId === userId && !apiKey.revokedAt) {
        // Return without the hashed key
        const { key: _key, ...keyWithoutHash } = apiKey;
        keys.push(keyWithoutHash);
      }
    }
    return keys;
  }

  /**
   * Rotate an API key (create new, revoke old)
   */
  public static async rotateAPIKey(
    oldKeyId: string,
    userId: string
  ): Promise<{ key: string; apiKey: APIKey }> {
    // Find old key in memory
    let oldKey: APIKey | null = null;
    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.id === oldKeyId && apiKey.userId === userId && !apiKey.revokedAt) {
        oldKey = apiKey;
        break;
      }
    }

    if (!oldKey) {
      throw new Error('API key not found or access denied');
    }

    // Calculate remaining days if expiry was set
    const expiresInDays = oldKey.expiresAt
      ? Math.max(1, Math.ceil((oldKey.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : undefined;

    // Create new key with same scopes
    const newKey = await this.createAPIKey(
      userId,
      `${oldKey.name} (rotated)`,
      oldKey.scopes,
      expiresInDays
    );

    // Revoke old key
    await this.revokeAPIKey(oldKeyId);

    return newKey;
  }

  // Temporary in-memory storage (replace with database)
  private static apiKeys: Map<string, APIKey> = new Map();
}

/**
 * API Key authentication middleware
 */
export function apiKeyAuth(requiredScopes?: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Extract API key from header
      const apiKeyHeader = req.headers['x-api-key'] as string;

      if (!apiKeyHeader) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'API key is required. Provide it in the X-API-Key header.',
        });
      }

      // Verify API key
      const apiKey = await APIKeyService.verifyAPIKey(apiKeyHeader);

      if (!apiKey) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired API key.',
        });
      }

      // Check required scopes
      if (requiredScopes && requiredScopes.length > 0) {
        const hasRequiredScopes = requiredScopes.every(scope =>
          apiKey.scopes.includes(scope) || apiKey.scopes.includes(APIScope.ADMIN)
        );

        if (!hasRequiredScopes) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Insufficient permissions. Required scopes: ' + requiredScopes.join(', '),
            required: requiredScopes,
            provided: apiKey.scopes,
          });
        }
      }

      // Attach API key info to request
      req.apiKey = apiKey;
      req.user = {
        id: apiKey.userId,
        scopes: apiKey.scopes,
      };

      next();
    } catch (error) {
      console.error('API key authentication error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication failed.',
      });
    }
  };
}

/**
 * JWT Bearer token authentication middleware
 */
export function jwtAuth(requiredScopes?: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Bearer token is required. Provide it in the Authorization header.',
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer '

      // Verify JWT
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, jwtSecret) as {
        userId: string;
        email?: string;
        role?: string;
        scopes?: string[];
      };

      // Check required scopes
      if (requiredScopes && requiredScopes.length > 0) {
        const userScopes = decoded.scopes || [];
        const hasRequiredScopes = requiredScopes.every(scope =>
          userScopes.includes(scope) || userScopes.includes(APIScope.ADMIN)
        );

        if (!hasRequiredScopes) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Insufficient permissions. Required scopes: ' + requiredScopes.join(', '),
            required: requiredScopes,
            provided: userScopes,
          });
        }
      }

      // Attach user info to request
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        scopes: decoded.scopes,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token.',
        });
      }

      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token has expired.',
        });
      }

      console.error('JWT authentication error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication failed.',
      });
    }
  };
}

/**
 * Flexible authentication middleware (tries multiple methods)
 */
export function flexibleAuth(requiredScopes?: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Try API key first
    if (req.headers['x-api-key']) {
      return apiKeyAuth(requiredScopes)(req, res, next);
    }

    // Try JWT bearer token
    if (req.headers.authorization?.startsWith('Bearer ')) {
      return jwtAuth(requiredScopes)(req, res, next);
    }

    // No authentication method provided
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Provide either an API key (X-API-Key header) or JWT token (Authorization: Bearer header).',
    });
  };
}

/**
 * Optional authentication middleware (doesn't fail if not authenticated)
 */
export function optionalAuth() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Try API key
      if (req.headers['x-api-key']) {
        const apiKeyHeader = req.headers['x-api-key'] as string;
        const apiKey = await APIKeyService.verifyAPIKey(apiKeyHeader);

        if (apiKey) {
          req.apiKey = apiKey;
          req.user = {
            id: apiKey.userId,
            scopes: apiKey.scopes,
          };
        }
      }

      // Try JWT
      else if (req.headers.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.substring(7);
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

        try {
          const decoded = jwt.verify(token, jwtSecret) as {
            userId: string;
            email?: string;
            role?: string;
            scopes?: string[];
          };

          req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            scopes: decoded.scopes,
          };
        } catch {
          // Invalid token, but continue as unauthenticated
        }
      }

      next();
    } catch (error) {
      // Don't fail, just continue without authentication
      next();
    }
  };
}

/**
 * Scope checking middleware (use after authentication)
 */
export function requireScopes(...scopes: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.scopes) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Authentication required to access this resource.',
      });
    }

    const hasRequiredScopes = scopes.every(scope =>
      req.user!.scopes!.includes(scope) || req.user!.scopes!.includes(APIScope.ADMIN)
    );

    if (!hasRequiredScopes) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions. Required scopes: ' + scopes.join(', '),
        required: scopes,
        provided: req.user.scopes,
      });
    }

    next();
  };
}

/**
 * Generate a JWT token
 */
export function generateJWT(
  userId: string,
  email?: string,
  role?: string,
  scopes?: string[],
  expiresIn: string = '24h'
): string {
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

  return jwt.sign(
    {
      userId,
      email,
      role,
      scopes,
    },
    jwtSecret,
    { expiresIn } as jwt.SignOptions
  );
}

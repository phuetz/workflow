/**
 * API Keys Management Routes
 * Handles API key lifecycle management for programmatic access
 *
 * Security features:
 * - Keys are hashed before storage (bcrypt)
 * - Full key returned only once at creation
 * - Keys masked in responses (show only last 4 chars)
 * - Support for expiration dates
 * - Permission scopes (read, write, execute, admin)
 * - Rate limiting per key
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { authHandler, AuthRequest } from '../middleware/auth';
import { prisma } from '../../database/prisma';
import { logger } from '../../../services/SimpleLogger';

const router = Router();

// Constants
const API_KEY_PREFIX = 'wf_'; // Workflow API key prefix
const KEY_BYTES = 32; // 256 bits
const BCRYPT_ROUNDS = 12;
const VALID_SCOPES = ['read', 'write', 'execute', 'admin'] as const;

type ApiKeyScope = typeof VALID_SCOPES[number];

// Interfaces
interface CreateApiKeyRequest {
  name: string;
  permissions?: ApiKeyScope[];
  expiresAt?: string | null;
  rateLimit?: number;
}

interface UpdateApiKeyRequest {
  name?: string;
  permissions?: ApiKeyScope[];
  expiresAt?: string | null;
  rateLimit?: number;
  isActive?: boolean;
}

/**
 * Generate a secure random API key
 */
function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(KEY_BYTES);
  const base64Key = randomBytes.toString('base64url');
  return `${API_KEY_PREFIX}${base64Key}`;
}

/**
 * Hash an API key using bcrypt
 */
async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, BCRYPT_ROUNDS);
}

/**
 * Verify an API key against its hash
 */
async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  return bcrypt.compare(key, hash);
}

/**
 * Mask an API key, showing only prefix and last 4 characters
 * Example: wf_abc...xyz1
 */
function maskApiKey(key: string): string {
  if (!key || key.length < 8) {
    return '***';
  }
  const prefix = key.slice(0, API_KEY_PREFIX.length + 3);
  const suffix = key.slice(-4);
  return `${prefix}...${suffix}`;
}

/**
 * Create a key hint for display (prefix + first 4 chars of random part)
 */
function createKeyHint(key: string): string {
  if (!key || key.length < API_KEY_PREFIX.length + 4) {
    return key;
  }
  return key.slice(0, API_KEY_PREFIX.length + 4);
}

/**
 * Validate permission scopes
 */
function validateScopes(scopes: string[]): scopes is ApiKeyScope[] {
  return scopes.every(scope => VALID_SCOPES.includes(scope as ApiKeyScope));
}

/**
 * Format API key response (with masking)
 */
function formatApiKeyResponse(apiKey: {
  id: string;
  name: string;
  permissions: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}, keyHint?: string) {
  return {
    id: apiKey.id,
    name: apiKey.name,
    keyHint: keyHint || `${API_KEY_PREFIX}****`,
    permissions: apiKey.permissions,
    rateLimit: apiKey.rateLimit,
    isActive: apiKey.isActive,
    lastUsedAt: apiKey.lastUsedAt,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
    isExpired: apiKey.expiresAt ? new Date(apiKey.expiresAt) < new Date() : false,
  };
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/api-keys
 * List user's API keys (masked)
 */
router.get('/', authHandler, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const apiKeys = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      permissions: true,
      rateLimit: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  logger.info('API keys listed', { userId, count: apiKeys.length });

  res.json({
    apiKeys: apiKeys.map(key => formatApiKeyResponse(key)),
    total: apiKeys.length,
  });
}));

/**
 * POST /api/api-keys
 * Create new API key (returns full key only once)
 */
router.post('/', authHandler, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const { name, permissions = ['read'], expiresAt, rateLimit = 1000 }: CreateApiKeyRequest = req.body;

  // Validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new ApiError(400, 'API key name is required');
  }

  if (name.length > 100) {
    throw new ApiError(400, 'API key name must be 100 characters or less');
  }

  if (!Array.isArray(permissions) || !validateScopes(permissions)) {
    throw new ApiError(400, `Invalid permissions. Valid values: ${VALID_SCOPES.join(', ')}`);
  }

  if (rateLimit !== undefined && (typeof rateLimit !== 'number' || rateLimit < 0 || rateLimit > 100000)) {
    throw new ApiError(400, 'Rate limit must be a number between 0 and 100000');
  }

  let expiresAtDate: Date | null = null;
  if (expiresAt) {
    expiresAtDate = new Date(expiresAt);
    if (isNaN(expiresAtDate.getTime())) {
      throw new ApiError(400, 'Invalid expiration date');
    }
    if (expiresAtDate <= new Date()) {
      throw new ApiError(400, 'Expiration date must be in the future');
    }
  }

  // Check for existing API keys with the same name for this user
  const existingKey = await prisma.apiKey.findFirst({
    where: { userId, name: name.trim() },
  });

  if (existingKey) {
    throw new ApiError(409, 'An API key with this name already exists');
  }

  // Generate and hash the key
  const plainKey = generateApiKey();
  const keyHash = await hashApiKey(plainKey);
  const keyHint = createKeyHint(plainKey);

  // Create the API key
  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name: name.trim(),
      keyHash,
      permissions,
      rateLimit,
      expiresAt: expiresAtDate,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      permissions: true,
      rateLimit: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  logger.info('API key created', {
    userId,
    keyId: apiKey.id,
    name: apiKey.name,
    permissions: apiKey.permissions,
  });

  // Return with full key - THIS IS THE ONLY TIME THE FULL KEY IS SHOWN
  res.status(201).json({
    message: 'API key created successfully. Save the key now - it will not be shown again.',
    apiKey: {
      ...formatApiKeyResponse(apiKey, keyHint),
      key: plainKey, // Full key - only returned at creation
    },
  });
}));

/**
 * GET /api/api-keys/:id
 * Get API key details (masked)
 */
router.get('/:id', authHandler, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  const { id } = req.params;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      name: true,
      permissions: true,
      rateLimit: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  if (!apiKey) {
    throw new ApiError(404, 'API key not found');
  }

  // Check ownership
  if (apiKey.userId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  logger.debug('API key retrieved', { userId, keyId: id });

  res.json({
    apiKey: formatApiKeyResponse(apiKey),
  });
}));

/**
 * PUT /api/api-keys/:id
 * Update API key (name, permissions, expiry)
 */
router.put('/:id', authHandler, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  const { id } = req.params;
  const { name, permissions, expiresAt, rateLimit, isActive }: UpdateApiKeyRequest = req.body;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { id },
  });

  if (!apiKey) {
    throw new ApiError(404, 'API key not found');
  }

  // Check ownership
  if (apiKey.userId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  // Build update data
  const updateData: {
    name?: string;
    permissions?: string[];
    expiresAt?: Date | null;
    rateLimit?: number;
    isActive?: boolean;
  } = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new ApiError(400, 'API key name cannot be empty');
    }
    if (name.length > 100) {
      throw new ApiError(400, 'API key name must be 100 characters or less');
    }

    // Check for duplicate name
    const existingKey = await prisma.apiKey.findFirst({
      where: { userId, name: name.trim(), id: { not: id } },
    });
    if (existingKey) {
      throw new ApiError(409, 'An API key with this name already exists');
    }

    updateData.name = name.trim();
  }

  if (permissions !== undefined) {
    if (!Array.isArray(permissions) || !validateScopes(permissions)) {
      throw new ApiError(400, `Invalid permissions. Valid values: ${VALID_SCOPES.join(', ')}`);
    }
    updateData.permissions = permissions;
  }

  if (expiresAt !== undefined) {
    if (expiresAt === null) {
      updateData.expiresAt = null;
    } else {
      const expiresAtDate = new Date(expiresAt);
      if (isNaN(expiresAtDate.getTime())) {
        throw new ApiError(400, 'Invalid expiration date');
      }
      if (expiresAtDate <= new Date()) {
        throw new ApiError(400, 'Expiration date must be in the future');
      }
      updateData.expiresAt = expiresAtDate;
    }
  }

  if (rateLimit !== undefined) {
    if (typeof rateLimit !== 'number' || rateLimit < 0 || rateLimit > 100000) {
      throw new ApiError(400, 'Rate limit must be a number between 0 and 100000');
    }
    updateData.rateLimit = rateLimit;
  }

  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') {
      throw new ApiError(400, 'isActive must be a boolean');
    }
    updateData.isActive = isActive;
  }

  // Check if there's anything to update
  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, 'No valid fields to update');
  }

  const updated = await prisma.apiKey.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      permissions: true,
      rateLimit: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  logger.info('API key updated', {
    userId,
    keyId: id,
    updatedFields: Object.keys(updateData),
  });

  res.json({
    message: 'API key updated successfully',
    apiKey: formatApiKeyResponse(updated),
  });
}));

/**
 * DELETE /api/api-keys/:id
 * Revoke (delete) API key
 */
router.delete('/:id', authHandler, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  const { id } = req.params;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { id },
  });

  if (!apiKey) {
    throw new ApiError(404, 'API key not found');
  }

  // Check ownership
  if (apiKey.userId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  await prisma.apiKey.delete({
    where: { id },
  });

  logger.info('API key revoked', { userId, keyId: id, name: apiKey.name });

  res.json({
    message: 'API key revoked successfully',
    id,
  });
}));

/**
 * POST /api/api-keys/:id/regenerate
 * Regenerate API key (creates new key, invalidates old one)
 */
router.post('/:id/regenerate', authHandler, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  const { id } = req.params;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { id },
  });

  if (!apiKey) {
    throw new ApiError(404, 'API key not found');
  }

  // Check ownership
  if (apiKey.userId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  // Generate new key
  const newPlainKey = generateApiKey();
  const newKeyHash = await hashApiKey(newPlainKey);
  const keyHint = createKeyHint(newPlainKey);

  // Update with new hash
  const updated = await prisma.apiKey.update({
    where: { id },
    data: {
      keyHash: newKeyHash,
      lastUsedAt: null, // Reset last used since it's a new key
    },
    select: {
      id: true,
      name: true,
      permissions: true,
      rateLimit: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  logger.info('API key regenerated', { userId, keyId: id, name: apiKey.name });

  // Return with full key - THIS IS THE ONLY TIME THE NEW KEY IS SHOWN
  res.json({
    message: 'API key regenerated successfully. Save the new key now - it will not be shown again.',
    apiKey: {
      ...formatApiKeyResponse(updated, keyHint),
      key: newPlainKey, // Full key - only returned at regeneration
    },
  });
}));

/**
 * POST /api/api-keys/:id/verify
 * Verify an API key (useful for testing)
 */
router.post('/:id/verify', authHandler, asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  const { id } = req.params;
  const { key } = req.body;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  if (!key || typeof key !== 'string') {
    throw new ApiError(400, 'API key is required for verification');
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { id },
  });

  if (!apiKey) {
    throw new ApiError(404, 'API key not found');
  }

  // Check ownership
  if (apiKey.userId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  // Verify the key
  const isValid = await verifyApiKey(key, apiKey.keyHash);

  // Check if expired
  const isExpired = apiKey.expiresAt ? new Date(apiKey.expiresAt) < new Date() : false;

  logger.debug('API key verification', { userId, keyId: id, isValid, isExpired });

  res.json({
    valid: isValid && apiKey.isActive && !isExpired,
    isActive: apiKey.isActive,
    isExpired,
    keyMatches: isValid,
  });
}));

/**
 * GET /api/api-keys/scopes
 * Get available permission scopes
 */
router.get('/scopes/available', authHandler, asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
  res.json({
    scopes: VALID_SCOPES.map(scope => ({
      name: scope,
      description: getScopeDescription(scope),
    })),
  });
}));

function getScopeDescription(scope: ApiKeyScope): string {
  const descriptions: Record<ApiKeyScope, string> = {
    read: 'Read access to workflows, executions, and credentials',
    write: 'Create and update workflows and credentials',
    execute: 'Execute workflows and trigger webhooks',
    admin: 'Full administrative access including user management',
  };
  return descriptions[scope];
}

export default router;
export { verifyApiKey, hashApiKey, maskApiKey, generateApiKey };

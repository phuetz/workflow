/**
 * Credentials API Routes
 * Handles secure credential management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { authHandler, AuthRequest } from '../middleware/auth';
import { prisma } from '../../database/prisma';
import { logger } from '../../../services/SimpleLogger';
import { CredentialType, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import {
  validateBody,
  validateParams,
  credentialIdSchema,
  createCredentialBodySchema,
  updateCredentialBodySchema,
  testCredentialBodySchema,
  testExistingCredentialBodySchema
} from '../middleware/validation';
import { getCredentialTesterService } from '../../services/CredentialTesterService';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Rate limiting for credential operations to prevent brute-force attacks
// Uses user ID + IP as key for authenticated requests

// POST /credentials (create) - 10 requests per minute
const createCredentialRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many credential creation attempts. Please try again later.',
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id || 'anonymous';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `credential:create:${userId}:${ip}`;
  },
  onLimitReached: (req) => {
    const authReq = req as AuthRequest;
    logger.warn('Credential creation rate limit exceeded', {
      userId: authReq.user?.id,
      ip: req.ip,
      path: req.path
    });
  }
});

// POST /credentials/test - 5 requests per minute (more sensitive)
const testCredentialRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many credential test attempts. Please try again later.',
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id || 'anonymous';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `credential:test:${userId}:${ip}`;
  },
  onLimitReached: (req) => {
    const authReq = req as AuthRequest;
    logger.warn('Credential test rate limit exceeded', {
      userId: authReq.user?.id,
      ip: req.ip,
      path: req.path
    });
  }
});

// GET /credentials/:id/decrypt - 20 requests per minute
const decryptCredentialRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: 'Too many credential decryption requests. Please try again later.',
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id || 'anonymous';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `credential:decrypt:${userId}:${ip}`;
  },
  onLimitReached: (req) => {
    const authReq = req as AuthRequest;
    logger.warn('Credential decryption rate limit exceeded', {
      userId: authReq.user?.id,
      ip: req.ip,
      path: req.path
    });
  }
});

// Encryption functions
function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_MASTER_KEY || process.env.MASTER_KEY;
  if (!raw) {
    throw new Error(
      'SECURITY ERROR: ENCRYPTION_MASTER_KEY environment variable is required. ' +
      'Generate a secure key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return crypto.createHash('sha256').update(raw).digest();
}

function encryptData(data: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.from(JSON.stringify({
    iv: iv.toString('base64'),
    ct: encrypted.toString('base64'),
    tag: tag.toString('base64')
  }), 'utf8').toString('base64');
}

function decryptData(dataB64: string): unknown {
  const raw = JSON.parse(Buffer.from(dataB64, 'base64').toString('utf8')) as {
    iv: string;
    ct: string;
    tag: string;
  };
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(raw.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(raw.tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(raw.ct, 'base64')),
    decipher.final()
  ]).toString('utf8');
  return JSON.parse(decrypted);
}

// Map kind string to CredentialType enum
function mapKindToType(kind: string): CredentialType {
  const map: Record<string, CredentialType> = {
    api_key: CredentialType.API_KEY,
    oauth2: CredentialType.OAUTH2,
    basic: CredentialType.BASIC_AUTH,
    bearer: CredentialType.JWT,
    ssh: CredentialType.SSH_KEY,
    database: CredentialType.DATABASE,
    custom: CredentialType.CUSTOM,
  };
  return map[kind.toLowerCase()] || CredentialType.CUSTOM;
}

// Map CredentialType enum to kind string
function mapTypeToKind(type: CredentialType): string {
  const map: Record<CredentialType, string> = {
    [CredentialType.API_KEY]: 'api_key',
    [CredentialType.OAUTH2]: 'oauth2',
    [CredentialType.BASIC_AUTH]: 'basic',
    [CredentialType.JWT]: 'bearer',
    [CredentialType.SSH_KEY]: 'ssh',
    [CredentialType.DATABASE]: 'database',
    [CredentialType.CUSTOM]: 'custom',
  };
  return map[type] || 'custom';
}

// GET /api/credentials - List all credentials for user
router.get('/', authHandler, asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  const credentials = await prisma.credential.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      isActive: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({
    credentials: credentials.map(c => ({
      id: c.id,
      name: c.name,
      kind: mapTypeToKind(c.type),
      description: c.description,
      isActive: c.isActive,
      expiresAt: c.expiresAt,
      lastUsedAt: c.lastUsedAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  });
}));

// POST /api/credentials - Create new credential
router.post('/', authHandler, createCredentialRateLimiter, validateBody(createCredentialBodySchema), asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  const { kind, name, description, data, expiresAt } = req.body;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  // Encrypt the credential data
  const encryptedData = encryptData(data || {});

  const credential = await prisma.credential.create({
    data: {
      name,
      type: mapKindToType(kind),
      description: description || null,
      data: encryptedData,
      userId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  logger.info('Credential created', { userId, credentialId: credential.id, kind });

  res.status(201).json({
    id: credential.id,
    name: credential.name,
    kind: mapTypeToKind(credential.type),
    description: credential.description,
    createdAt: credential.createdAt,
    updatedAt: credential.updatedAt,
  });
}));

// GET /api/credentials/:id - Get credential (without secret data)
router.get('/:id', authHandler, validateParams(credentialIdSchema), asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  const { id } = req.params;

  const credential = await prisma.credential.findUnique({
    where: { id },
  });

  if (!credential) {
    throw new ApiError(404, 'Credential not found');
  }

  // Check ownership
  if (credential.userId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  res.json({
    id: credential.id,
    name: credential.name,
    kind: mapTypeToKind(credential.type),
    description: credential.description,
    isActive: credential.isActive,
    expiresAt: credential.expiresAt,
    lastUsedAt: credential.lastUsedAt,
    createdAt: credential.createdAt,
    updatedAt: credential.updatedAt,
  });
}));

// GET /api/credentials/:id/decrypt - Get credential with decrypted data (for execution)
router.get('/:id/decrypt', authHandler, validateParams(credentialIdSchema), decryptCredentialRateLimiter, asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  const { id } = req.params;

  const credential = await prisma.credential.findUnique({
    where: { id },
  });

  if (!credential) {
    throw new ApiError(404, 'Credential not found');
  }

  // Check ownership
  if (credential.userId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  // Update last used
  await prisma.credential.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  });

  // Decrypt the data
  const decryptedData = decryptData(credential.data);

  logger.info('Credential decrypted', { userId, credentialId: id });

  res.json({
    id: credential.id,
    name: credential.name,
    kind: mapTypeToKind(credential.type),
    data: decryptedData,
  });
}));

// PUT /api/credentials/:id - Update credential
router.put('/:id', authHandler, validateParams(credentialIdSchema), validateBody(updateCredentialBodySchema), asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  const { id } = req.params;
  const { name, description, data, isActive, expiresAt } = req.body;

  const credential = await prisma.credential.findUnique({
    where: { id },
  });

  if (!credential) {
    throw new ApiError(404, 'Credential not found');
  }

  // Check ownership
  if (credential.userId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  // Build update data
  const updateData: Prisma.CredentialUpdateInput = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (data !== undefined) updateData.data = encryptData(data);
  if (isActive !== undefined) updateData.isActive = isActive;
  if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

  const updated = await prisma.credential.update({
    where: { id },
    data: updateData,
  });

  logger.info('Credential updated', { userId, credentialId: id });

  res.json({
    id: updated.id,
    name: updated.name,
    kind: mapTypeToKind(updated.type),
    description: updated.description,
    isActive: updated.isActive,
    expiresAt: updated.expiresAt,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}));

// DELETE /api/credentials/:id - Delete credential
router.delete('/:id', authHandler, validateParams(credentialIdSchema), asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  const { id } = req.params;

  const credential = await prisma.credential.findUnique({
    where: { id },
  });

  if (!credential) {
    throw new ApiError(404, 'Credential not found');
  }

  // Check ownership
  if (credential.userId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  await prisma.credential.delete({
    where: { id },
  });

  logger.info('Credential deleted', { userId, credentialId: id });

  res.json({ success: true });
}));

// POST /api/credentials/test - Test new credential (before saving)
router.post('/test', authHandler, testCredentialRateLimiter, validateBody(testCredentialBodySchema), asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const { kind, type, data, testEndpoint, timeoutMs } = req.body;

  // Get credential type (Zod already validated that kind or type exists)
  const credentialType = kind || type;

  // Get tester service
  const tester = getCredentialTesterService();

  // Run the test
  const result = await tester.test({
    type: credentialType,
    data,
    testEndpoint,
    timeoutMs: timeoutMs ? Math.min(Number(timeoutMs), 10000) : undefined
  });

  logger.info('Credential test completed', {
    userId,
    type: credentialType,
    success: result.success
  });

  res.json(result);
}));

// POST /api/credentials/:id/test - Test existing credential
router.post('/:id/test', authHandler, validateParams(credentialIdSchema), testCredentialRateLimiter, validateBody(testExistingCredentialBodySchema), asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  const { id } = req.params;
  const { testEndpoint, timeoutMs } = req.body;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  // Find the credential
  const credential = await prisma.credential.findUnique({
    where: { id },
  });

  if (!credential) {
    throw new ApiError(404, 'Credential not found');
  }

  // Check ownership
  if (credential.userId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  // Check if active
  if (!credential.isActive) {
    throw new ApiError(400, 'Credential is inactive');
  }

  // Check if expired
  if (credential.expiresAt && credential.expiresAt < new Date()) {
    throw new ApiError(400, 'Credential has expired');
  }

  // Decrypt the credential data
  const decryptedData = decryptData(credential.data) as Record<string, unknown>;

  // Merge with any test-specific data from request body
  const testData = { ...decryptedData };
  if (testEndpoint) {
    testData.testUrl = testEndpoint;
  }

  // Get tester service
  const tester = getCredentialTesterService();

  // Run the test
  const result = await tester.test({
    type: credential.type,
    data: testData,
    timeoutMs: timeoutMs ? Math.min(Number(timeoutMs), 10000) : undefined
  });

  // Update last tested timestamp
  await prisma.credential.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  });

  logger.info('Credential test completed', {
    userId,
    credentialId: id,
    type: credential.type,
    success: result.success
  });

  res.json({
    ...result,
    credentialId: id,
    credentialName: credential.name
  });
}));

export default router;

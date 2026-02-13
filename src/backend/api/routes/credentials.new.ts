/**
 * Credentials API Routes
 *
 * Handles CRUD operations for encrypted credentials.
 * All credentials are encrypted with AES-256-GCM before storage.
 *
 * @module backend/api/routes/credentials
 */

import { Router, Request, Response } from 'express';
import { CredentialType } from '@prisma/client';
import { getCredentialRepository, CredentialInput } from '../../repositories/CredentialRepository';
import { getCredentialEncryption } from '../../../security/CredentialEncryption';
import { authHandler, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../../middleware/authorization';
import { logger } from '../../services/LogService';
import { getCredentialTesterService } from '../../services/CredentialTesterService';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const repository = getCredentialRepository();
const encryption = getCredentialEncryption();

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

/**
 * GET /api/credentials
 * Lists all credentials for the authenticated user (without sensitive data)
 * SECURITY FIX: Requires JWT authentication, removed x-user-id header fallback
 */
router.get('/', authHandler, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const credentials = await repository.listByUser(userId);

    res.json({
      success: true,
      count: credentials.length,
      credentials
    });
  } catch (error) {
    logger.error('Error listing credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list credentials'
    });
  }
});

/**
 * GET /api/credentials/:id
 * Gets a specific credential (without sensitive data)
 */
router.get('/:id', authHandler, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const credential = await repository.findByIdWithData(req.params.id, userId);

    if (!credential) {
      return res.status(404).json({
        success: false,
        error: 'Credential not found'
      });
    }

    // Return without sensitive data by default
    const { data, ...credentialWithoutData } = credential;

    res.json({
      success: true,
      credential: credentialWithoutData
    });
  } catch (error) {
    logger.error('Error getting credential:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get credential'
    });
  }
});

/**
 * GET /api/credentials/:id/decrypt
 * Gets credential with decrypted sensitive data
 * Requires special permission or additional authentication
 */
router.get('/:id/decrypt', authHandler, decryptCredentialRateLimiter, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const credential = await repository.findByIdWithData(req.params.id, userId);

    if (!credential) {
      return res.status(404).json({
        success: false,
        error: 'Credential not found'
      });
    }

    // Check if expired
    const isExpired = await repository.isExpired(req.params.id);
    if (isExpired) {
      return res.status(403).json({
        success: false,
        error: 'Credential has expired'
      });
    }

    // Mark as used
    await repository.markAsUsed(req.params.id);

    // Return with decrypted data
    res.json({
      success: true,
      credential
    });
  } catch (error) {
    logger.error('Error decrypting credential:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to decrypt credential'
    });
  }
});

/**
 * POST /api/credentials
 * Creates a new encrypted credential
 */
router.post('/', authHandler, createCredentialRateLimiter, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { name, type, data, description, expiresAt } = req.body;

    // Validation
    if (!name || !type || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type, data'
      });
    }

    // Validate credential type
    if (!Object.values(CredentialType).includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid credential type. Must be one of: ${Object.values(CredentialType).join(', ')}`
      });
    }

    // Create credential input
    const input: CredentialInput = {
      name,
      type,
      data,
      description,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    };

    // Create encrypted credential
    const credential = await repository.create(userId, input);

    res.status(201).json({
      success: true,
      credential,
      message: 'Credential created and encrypted successfully'
    });
  } catch (error) {
    logger.error('Error creating credential:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create credential'
    });
  }
});

/**
 * PATCH /api/credentials/:id
 * Updates an existing credential
 */
router.patch('/:id', authHandler, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { name, data, description, expiresAt } = req.body;

    const updates: Partial<CredentialInput> = {};
    if (name !== undefined) updates.name = name;
    if (data !== undefined) updates.data = data;
    if (description !== undefined) updates.description = description;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : undefined;

    const credential = await repository.update(req.params.id, userId, updates);

    res.json({
      success: true,
      credential,
      message: 'Credential updated successfully'
    });
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Credential not found or access denied'
      });
    }

    logger.error('Error updating credential:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update credential'
    });
  }
});

/**
 * DELETE /api/credentials/:id
 * Soft deletes a credential (marks as inactive)
 */
router.delete('/:id', authHandler, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const hardDelete = req.query.hard === 'true';

    const deleted = hardDelete
      ? await repository.hardDelete(req.params.id, userId)
      : await repository.softDelete(req.params.id, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Credential not found or access denied'
      });
    }

    res.json({
      success: true,
      message: hardDelete ? 'Credential permanently deleted' : 'Credential deactivated'
    });
  } catch (error) {
    logger.error('Error deleting credential:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete credential'
    });
  }
});

/**
 * GET /api/credentials/stats/encryption
 * Gets encryption statistics (admin only)
 */
router.get('/stats/encryption', requireAdmin, async (req: Request, res: Response) => {
  try {
    const stats = await repository.getEncryptionStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error getting encryption stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get encryption statistics'
    });
  }
});

/**
 * POST /api/credentials/validate-setup
 * Validates encryption setup
 */
router.post('/validate-setup', async (req: Request, res: Response) => {
  try {
    const validation = await encryption.validateSetup();

    res.json({
      success: true,
      validation
    });
  } catch (error) {
    logger.error('Error validating encryption setup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate encryption setup'
    });
  }
});

/**
 * GET /api/credentials/type/:type
 * Lists credentials by type
 */
router.get('/type/:type', authHandler, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const type = req.params.type as CredentialType;

    // Validate type
    if (!Object.values(CredentialType).includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid credential type. Must be one of: ${Object.values(CredentialType).join(', ')}`
      });
    }

    const credentials = await repository.listByType(userId, type);

    res.json({
      success: true,
      count: credentials.length,
      type,
      credentials
    });
  } catch (error) {
    logger.error('Error listing credentials by type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list credentials by type'
    });
  }
});

/**
 * GET /api/credentials/expired
 * Lists all expired credentials (admin only)
 */
router.get('/expired', requireAdmin, async (req: Request, res: Response) => {
  try {
    const expiredCredentials = await repository.findExpired();

    res.json({
      success: true,
      count: expiredCredentials.length,
      credentials: expiredCredentials
    });
  } catch (error) {
    logger.error('Error finding expired credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find expired credentials'
    });
  }
});

/**
 * POST /api/credentials/test
 * Test new credential (before saving)
 */
router.post('/test', authHandler, testCredentialRateLimiter, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { type, data, testEndpoint, timeoutMs } = req.body;

    // Validate required fields
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Credential type is required'
      });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Credential data is required'
      });
    }

    // Get tester service
    const tester = getCredentialTesterService();

    // Run the test
    const result = await tester.test({
      type,
      data,
      testEndpoint,
      timeoutMs: timeoutMs ? Math.min(Number(timeoutMs), 10000) : undefined
    });

    logger.info('Credential test completed', {
      userId,
      type,
      success: result.success
    });

    res.json(result);
  } catch (error) {
    logger.error('Error testing credential:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test credential'
    });
  }
});

/**
 * POST /api/credentials/:id/test
 * Test existing credential
 */
router.post('/:id/test', authHandler, testCredentialRateLimiter, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { testEndpoint, timeoutMs } = req.body;

    // Get the credential with decrypted data
    const credential = await repository.findByIdWithData(req.params.id, userId);

    if (!credential) {
      return res.status(404).json({
        success: false,
        error: 'Credential not found'
      });
    }

    // Check if active
    if (!credential.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Credential is inactive'
      });
    }

    // Check if expired
    const isExpired = await repository.isExpired(req.params.id);
    if (isExpired) {
      return res.status(400).json({
        success: false,
        error: 'Credential has expired'
      });
    }

    // Merge with any test-specific data from request body
    const testData = { ...credential.data };
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

    // Update last used timestamp
    await repository.markAsUsed(req.params.id);

    logger.info('Credential test completed', {
      userId,
      credentialId: req.params.id,
      type: credential.type,
      success: result.success
    });

    res.json({
      ...result,
      credentialId: credential.id,
      credentialName: credential.name
    });
  } catch (error) {
    logger.error('Error testing credential:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test credential'
    });
  }
});

export default router;

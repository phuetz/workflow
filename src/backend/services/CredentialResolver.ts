/**
 * Credential Resolver Service
 * Fetches and decrypts credentials for use during workflow execution.
 * Reuses encryption logic from credentials route.
 */

import * as crypto from 'crypto';
import { prisma } from '../database/prisma';
import { logger } from '../../services/SimpleLogger';

function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_MASTER_KEY || process.env.MASTER_KEY;
  if (!raw) {
    throw new Error(
      'SECURITY ERROR: ENCRYPTION_MASTER_KEY environment variable is required.'
    );
  }
  return crypto.createHash('sha256').update(raw).digest();
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

class CredentialResolver {
  /**
   * Resolve credentials by ID for a given user.
   * Checks ownership, decrypts data, and updates lastUsedAt.
   */
  async resolve(credentialId: string, userId: string): Promise<Record<string, any>> {
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) {
      throw new Error(`Credential not found: ${credentialId}`);
    }

    // Check ownership
    if (credential.userId !== userId) {
      throw new Error(`Access denied to credential: ${credentialId}`);
    }

    // Check active
    if (!credential.isActive) {
      throw new Error(`Credential is inactive: ${credentialId}`);
    }

    // Check expiry
    if (credential.expiresAt && credential.expiresAt < new Date()) {
      throw new Error(`Credential has expired: ${credentialId}`);
    }

    // Decrypt
    const decrypted = decryptData(credential.data) as Record<string, any>;

    // Update lastUsedAt (fire-and-forget)
    prisma.credential.update({
      where: { id: credentialId },
      data: { lastUsedAt: new Date() },
    }).catch(err => {
      logger.warn('Failed to update credential lastUsedAt', { credentialId, error: String(err) });
    });

    logger.debug('Credential resolved', { credentialId, userId });

    return decrypted;
  }
}

export const credentialResolver = new CredentialResolver();

/**
 * Credential Resolver Service
 * Fetches and decrypts credentials for use during workflow execution.
 * Includes OAuth2 token auto-refresh when tokens are near expiry.
 */

import * as crypto from 'crypto';
import { prisma } from '../database/prisma';
import { logger } from '../../services/SimpleLogger';

const OAUTH2_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

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

function encryptData(data: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const plaintext = JSON.stringify(data);
  const ct = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  const envelope = {
    iv: iv.toString('base64'),
    ct: ct.toString('base64'),
    tag: tag.toString('base64'),
  };
  return Buffer.from(JSON.stringify(envelope)).toString('base64');
}

class CredentialResolver {
  /**
   * Resolve credentials by ID for a given user.
   * Checks ownership, decrypts data, auto-refreshes OAuth2 tokens if needed,
   * and updates lastUsedAt.
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
    let decrypted = decryptData(credential.data) as Record<string, any>;

    // Auto-refresh OAuth2 tokens if near expiry
    if (credential.type === 'OAUTH2' && decrypted.refreshToken) {
      const expiresAt = decrypted.expiresAt ? new Date(decrypted.expiresAt).getTime() : 0;
      const now = Date.now();

      if (expiresAt > 0 && expiresAt - now < OAUTH2_REFRESH_BUFFER_MS) {
        logger.info('OAuth2 token near expiry, attempting refresh', {
          credentialId,
          expiresAt: new Date(expiresAt).toISOString(),
          bufferMs: OAUTH2_REFRESH_BUFFER_MS,
        });

        try {
          const refreshed = await this.refreshOAuth2Token(decrypted);
          if (refreshed) {
            decrypted = { ...decrypted, ...refreshed };

            // Re-encrypt and persist the updated credential
            const encryptedData = encryptData(decrypted);
            await prisma.credential.update({
              where: { id: credentialId },
              data: { data: encryptedData },
            });
            logger.info('OAuth2 token refreshed and persisted', { credentialId });
          }
        } catch (err) {
          logger.warn('OAuth2 token refresh failed, using existing token', {
            credentialId,
            error: String(err),
          });
        }
      }
    }

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

  /**
   * Refresh an OAuth2 access token using the refresh token.
   * Returns the new token fields or null if refresh fails.
   */
  private async refreshOAuth2Token(
    cred: Record<string, any>
  ): Promise<Record<string, any> | null> {
    const tokenUrl = cred.tokenUrl || cred.accessTokenUrl;
    if (!tokenUrl || !cred.refreshToken) {
      return null;
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: cred.refreshToken,
      client_id: cred.clientId || '',
      client_secret: cred.clientSecret || '',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OAuth2 refresh failed (${response.status}): ${text}`);
    }

    const data = await response.json() as Record<string, any>;

    const result: Record<string, any> = {
      accessToken: data.access_token,
    };

    if (data.refresh_token) {
      result.refreshToken = data.refresh_token;
    }

    if (data.expires_in) {
      result.expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    }

    if (data.token_type) {
      result.tokenType = data.token_type;
    }

    return result;
  }
}

export const credentialResolver = new CredentialResolver();

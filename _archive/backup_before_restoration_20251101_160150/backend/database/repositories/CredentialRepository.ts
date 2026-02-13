/**
 * Credential Repository - Prisma Implementation
 * Handles encrypted credential storage and retrieval
 */

import { Credential, CredentialType, Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { logger } from '../../../services/LoggingService';
import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32ch';

// Ensure the key is exactly 32 bytes for AES-256
const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));

export interface CreateCredentialInput {
  userId: string;
  name: string;
  type: CredentialType;
  data: Record<string, any>;
  description?: string;
  expiresAt?: Date;
}

export interface UpdateCredentialInput {
  name?: string;
  data?: Record<string, any>;
  description?: string;
  isActive?: boolean;
  expiresAt?: Date | null;
}

export interface DecryptedCredential extends Omit<Credential, 'data'> {
  data: Record<string, any>;
}

/**
 * Encrypt credential data
 */
function encryptData(data: Record<string, any>): string {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, KEY_BUFFER, iv);

    const jsonData = JSON.stringify(data);
    let encrypted = cipher.update(jsonData, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = (cipher as any).getAuthTag().toString('hex');

    // Return IV + Auth Tag + Encrypted Data
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    logger.error('Error encrypting credential data:', error);
    throw new Error('Failed to encrypt credential data');
  }
}

/**
 * Decrypt credential data
 */
function decryptData(encryptedData: string): Record<string, any> {
  try {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, KEY_BUFFER, iv);

    (decipher as any).setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    logger.error('Error decrypting credential data:', error);
    throw new Error('Failed to decrypt credential data');
  }
}

export class CredentialRepository {
  /**
   * Create new credential
   */
  async create(data: CreateCredentialInput): Promise<Credential> {
    try {
      const encryptedData = encryptData(data.data);

      return await prisma.credential.create({
        data: {
          userId: data.userId,
          name: data.name,
          type: data.type,
          data: encryptedData,
          description: data.description,
          expiresAt: data.expiresAt,
        },
      });
    } catch (error) {
      logger.error('Error creating credential:', error);
      throw error;
    }
  }

  /**
   * Find credential by ID
   */
  async findById(id: string, userId?: string): Promise<Credential | null> {
    try {
      const where: Prisma.CredentialWhereInput = { id };
      if (userId) {
        where.userId = userId;
      }

      return await prisma.credential.findFirst({ where });
    } catch (error) {
      logger.error('Error finding credential:', error);
      throw error;
    }
  }

  /**
   * Find credential by ID and decrypt
   */
  async findByIdDecrypted(
    id: string,
    userId?: string
  ): Promise<DecryptedCredential | null> {
    try {
      const credential = await this.findById(id, userId);
      if (!credential) return null;

      return {
        ...credential,
        data: decryptData(credential.data),
      };
    } catch (error) {
      logger.error('Error finding and decrypting credential:', error);
      throw error;
    }
  }

  /**
   * Find all credentials for a user
   */
  async findByUser(
    userId: string,
    options?: {
      skip?: number;
      limit?: number;
      type?: CredentialType;
      isActive?: boolean;
    }
  ): Promise<{ credentials: Credential[]; total: number }> {
    try {
      const where: Prisma.CredentialWhereInput = { userId };

      if (options?.type) {
        where.type = options.type;
      }
      if (options?.isActive !== undefined) {
        where.isActive = options.isActive;
      }

      const [credentials, total] = await Promise.all([
        prisma.credential.findMany({
          where,
          skip: options?.skip || 0,
          take: options?.limit || 100,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            userId: true,
            name: true,
            type: true,
            description: true,
            isActive: true,
            expiresAt: true,
            lastUsedAt: true,
            createdAt: true,
            updatedAt: true,
            // Don't select encrypted data in list view
            data: false,
          },
        }) as Credential[],
        prisma.credential.count({ where }),
      ]);

      return { credentials, total };
    } catch (error) {
      logger.error('Error finding credentials by user:', error);
      throw error;
    }
  }

  /**
   * Update credential
   */
  async update(
    id: string,
    userId: string,
    updates: UpdateCredentialInput
  ): Promise<Credential> {
    try {
      const data: any = { ...updates };

      // Encrypt data if provided
      if (updates.data) {
        data.data = encryptData(updates.data);
      }

      return await prisma.credential.update({
        where: {
          id,
          userId, // Ensure user owns the credential
        },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Credential not found or access denied');
        }
      }
      logger.error('Error updating credential:', error);
      throw error;
    }
  }

  /**
   * Delete credential
   */
  async delete(id: string, userId: string): Promise<boolean> {
    try {
      await prisma.credential.delete({
        where: {
          id,
          userId, // Ensure user owns the credential
        },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return false;
        }
      }
      logger.error('Error deleting credential:', error);
      throw error;
    }
  }

  /**
   * Mark credential as used
   */
  async markAsUsed(id: string): Promise<void> {
    try {
      await prisma.credential.update({
        where: { id },
        data: {
          lastUsedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error marking credential as used:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Get expired credentials
   */
  async getExpiredCredentials(): Promise<Credential[]> {
    try {
      return await prisma.credential.findMany({
        where: {
          expiresAt: {
            not: null,
            lt: new Date(),
          },
          isActive: true,
        },
        select: {
          id: true,
          userId: true,
          name: true,
          type: true,
          description: true,
          isActive: true,
          expiresAt: true,
          lastUsedAt: true,
          createdAt: true,
          updatedAt: true,
          data: false,
        },
      }) as Credential[];
    } catch (error) {
      logger.error('Error getting expired credentials:', error);
      throw error;
    }
  }

  /**
   * Deactivate expired credentials
   */
  async deactivateExpiredCredentials(): Promise<number> {
    try {
      const result = await prisma.credential.updateMany({
        where: {
          expiresAt: {
            not: null,
            lt: new Date(),
          },
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      logger.info(`Deactivated ${result.count} expired credentials`);
      return result.count;
    } catch (error) {
      logger.error('Error deactivating expired credentials:', error);
      throw error;
    }
  }

  /**
   * Find credentials by type
   */
  async findByType(
    userId: string,
    type: CredentialType
  ): Promise<Credential[]> {
    try {
      return await prisma.credential.findMany({
        where: {
          userId,
          type,
          isActive: true,
        },
        select: {
          id: true,
          userId: true,
          name: true,
          type: true,
          description: true,
          isActive: true,
          expiresAt: true,
          lastUsedAt: true,
          createdAt: true,
          updatedAt: true,
          data: false,
        },
      }) as Credential[];
    } catch (error) {
      logger.error('Error finding credentials by type:', error);
      throw error;
    }
  }

  /**
   * Search credentials
   */
  async search(userId: string, query: string): Promise<Credential[]> {
    try {
      return await prisma.credential.findMany({
        where: {
          userId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          userId: true,
          name: true,
          type: true,
          description: true,
          isActive: true,
          expiresAt: true,
          lastUsedAt: true,
          createdAt: true,
          updatedAt: true,
          data: false,
        },
      }) as Credential[];
    } catch (error) {
      logger.error('Error searching credentials:', error);
      throw error;
    }
  }

  /**
   * Get credential statistics
   */
  async getStatistics(userId?: string) {
    try {
      const where: Prisma.CredentialWhereInput = userId ? { userId } : {};

      const [total, active, expired, byType] = await Promise.all([
        prisma.credential.count({ where }),
        prisma.credential.count({ where: { ...where, isActive: true } }),
        prisma.credential.count({
          where: {
            ...where,
            expiresAt: {
              not: null,
              lt: new Date(),
            },
          },
        }),
        prisma.credential.groupBy({
          by: ['type'],
          where,
          _count: true,
        }),
      ]);

      const typeDistribution = byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        active,
        inactive: total - active,
        expired,
        byType: typeDistribution,
      };
    } catch (error) {
      logger.error('Error getting credential statistics:', error);
      throw error;
    }
  }

  /**
   * Validate credential (check if active and not expired)
   */
  async isValid(id: string): Promise<boolean> {
    try {
      const credential = await prisma.credential.findUnique({
        where: { id },
        select: {
          isActive: true,
          expiresAt: true,
        },
      });

      if (!credential || !credential.isActive) {
        return false;
      }

      if (credential.expiresAt && credential.expiresAt < new Date()) {
        // Auto-deactivate expired credential
        await this.update(id, '', { isActive: false }).catch(() => {});
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error validating credential:', error);
      return false;
    }
  }

  /**
   * Rotate encryption key (re-encrypt all credentials with new key)
   * This should be called during key rotation
   */
  async rotateEncryptionKey(oldKey: string, newKey: string): Promise<number> {
    try {
      const allCredentials = await prisma.credential.findMany();
      let rotated = 0;

      for (const credential of allCredentials) {
        try {
          // Decrypt with old key
          const oldKeyBuffer = Buffer.from(oldKey.padEnd(32, '0').substring(0, 32));
          const [ivHex, authTagHex, encrypted] = credential.data.split(':');

          const iv = Buffer.from(ivHex, 'hex');
          const authTag = Buffer.from(authTagHex, 'hex');
          const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, oldKeyBuffer, iv);
          (decipher as any).setAuthTag(authTag);

          let decrypted = decipher.update(encrypted, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          const data = JSON.parse(decrypted);

          // Encrypt with new key
          const newKeyBuffer = Buffer.from(newKey.padEnd(32, '0').substring(0, 32));
          const newIv = crypto.randomBytes(16);
          const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, newKeyBuffer, newIv);

          let reencrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
          reencrypted += cipher.final('hex');
          const newAuthTag = (cipher as any).getAuthTag().toString('hex');

          const newEncryptedData = `${newIv.toString('hex')}:${newAuthTag}:${reencrypted}`;

          await prisma.credential.update({
            where: { id: credential.id },
            data: { data: newEncryptedData },
          });

          rotated++;
        } catch (error) {
          logger.error(`Failed to rotate credential ${credential.id}:`, error);
        }
      }

      logger.info(`Rotated encryption key for ${rotated}/${allCredentials.length} credentials`);
      return rotated;
    } catch (error) {
      logger.error('Error rotating encryption key:', error);
      throw error;
    }
  }
}

// Singleton instance
export const credentialRepository = new CredentialRepository();
export default credentialRepository;

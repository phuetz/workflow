/**
 * Credential Repository
 *
 * Manages encrypted credential storage using Prisma and AES-256-GCM encryption.
 * All credentials are encrypted before storage and decrypted on retrieval.
 *
 * @module backend/repositories/CredentialRepository
 */

import { PrismaClient, Credential, CredentialType } from '@prisma/client';
import { getCredentialEncryption } from '../../security/CredentialEncryption';

const prisma = new PrismaClient();
const encryption = getCredentialEncryption();

export interface CredentialData {
  // Common fields
  [key: string]: unknown;

  // Type-specific fields
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  token?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  privateKey?: string;
  certificate?: string;
}

export interface CredentialInput {
  name: string;
  type: CredentialType;
  data: CredentialData;
  description?: string;
  expiresAt?: Date;
}

export interface CredentialOutput {
  id: string;
  userId: string;
  name: string;
  type: CredentialType;
  description?: string;
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CredentialWithData extends CredentialOutput {
  data: CredentialData;
}

/**
 * Credential Repository class
 */
export class CredentialRepository {
  /**
   * Creates a new encrypted credential
   */
  async create(
    userId: string,
    input: CredentialInput
  ): Promise<CredentialOutput> {
    // Encrypt credential data
    const encryptedData = await encryption.encryptCredential(input.data);

    // Create in database
    const credential = await prisma.credential.create({
      data: {
        userId,
        name: input.name,
        type: input.type,
        data: encryptedData,
        description: input.description,
        expiresAt: input.expiresAt,
        isEncrypted: true,
        encryptionVersion: 'v1'
      }
    });

    return this.toOutput(credential);
  }

  /**
   * Updates an existing credential
   */
  async update(
    credentialId: string,
    userId: string,
    updates: Partial<CredentialInput>
  ): Promise<CredentialOutput> {
    // Verify ownership
    const existing = await this.findById(credentialId);
    if (!existing || existing.userId !== userId) {
      throw new Error('Credential not found or access denied');
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.expiresAt !== undefined) updateData.expiresAt = updates.expiresAt;

    // If updating credential data, re-encrypt
    if (updates.data) {
      updateData.data = await encryption.encryptCredential(updates.data);
      updateData.encryptionVersion = 'v1'; // Update version if key rotated
    }

    const credential = await prisma.credential.update({
      where: { id: credentialId },
      data: updateData
    });

    return this.toOutput(credential);
  }

  /**
   * Finds credential by ID (without decrypting data)
   */
  async findById(credentialId: string): Promise<CredentialOutput | null> {
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId }
    });

    return credential ? this.toOutput(credential) : null;
  }

  /**
   * Finds credential by ID and decrypts data
   */
  async findByIdWithData(
    credentialId: string,
    userId: string
  ): Promise<CredentialWithData | null> {
    const credential = await prisma.credential.findFirst({
      where: {
        id: credentialId,
        userId
      }
    });

    if (!credential) {
      return null;
    }

    // Decrypt data
    const decryptedData = await this.decryptCredentialData(credential);

    return {
      ...this.toOutput(credential),
      data: decryptedData
    };
  }

  /**
   * Lists all credentials for a user (without sensitive data)
   */
  async listByUser(userId: string): Promise<CredentialOutput[]> {
    const credentials = await prisma.credential.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    return credentials.map(cred => this.toOutput(cred));
  }

  /**
   * Lists credentials by type
   */
  async listByType(
    userId: string,
    type: CredentialType
  ): Promise<CredentialOutput[]> {
    const credentials = await prisma.credential.findMany({
      where: {
        userId,
        type,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return credentials.map(cred => this.toOutput(cred));
  }

  /**
   * Soft deletes a credential (marks as inactive)
   */
  async softDelete(credentialId: string, userId: string): Promise<boolean> {
    try {
      await prisma.credential.updateMany({
        where: {
          id: credentialId,
          userId
        },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Permanently deletes a credential
   */
  async hardDelete(credentialId: string, userId: string): Promise<boolean> {
    try {
      await prisma.credential.deleteMany({
        where: {
          id: credentialId,
          userId
        }
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Updates last used timestamp
   */
  async markAsUsed(credentialId: string): Promise<void> {
    await prisma.credential.update({
      where: { id: credentialId },
      data: { lastUsedAt: new Date() }
    });
  }

  /**
   * Checks if credential is expired
   */
  async isExpired(credentialId: string): Promise<boolean> {
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
      select: { expiresAt: true }
    });

    if (!credential || !credential.expiresAt) {
      return false;
    }

    return credential.expiresAt < new Date();
  }

  /**
   * Finds all expired credentials
   */
  async findExpired(): Promise<CredentialOutput[]> {
    const credentials = await prisma.credential.findMany({
      where: {
        expiresAt: {
          lt: new Date()
        },
        isActive: true
      }
    });

    return credentials.map(cred => this.toOutput(cred));
  }

  /**
   * Re-encrypts credential with new key version (for key rotation)
   */
  async reencrypt(
    credentialId: string,
    newVersion: string
  ): Promise<CredentialOutput> {
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId }
    });

    if (!credential) {
      throw new Error('Credential not found');
    }

    // Decrypt with old key
    const decryptedData = await this.decryptCredentialData(credential);

    // Re-encrypt with new key (new version)
    const reencryptedData = await encryption.encrypt(JSON.stringify(decryptedData));

    // Update in database
    const updated = await prisma.credential.update({
      where: { id: credentialId },
      data: {
        data: reencryptedData,
        encryptionVersion: newVersion,
        updatedAt: new Date()
      }
    });

    return this.toOutput(updated);
  }

  /**
   * Re-encrypts all credentials (for key rotation)
   */
  async reencryptAll(newVersion: string): Promise<number> {
    const credentials = await prisma.credential.findMany({
      where: {
        isEncrypted: true,
        encryptionVersion: { not: newVersion }
      }
    });

    let count = 0;

    for (const credential of credentials) {
      try {
        await this.reencrypt(credential.id, newVersion);
        count++;
      } catch (error) {
        console.error(`Failed to re-encrypt credential ${credential.id}:`, error);
      }
    }

    return count;
  }

  /**
   * Gets encryption statistics
   */
  async getEncryptionStats(): Promise<{
    total: number;
    encrypted: number;
    unencrypted: number;
    byVersion: Record<string, number>;
  }> {
    const total = await prisma.credential.count();
    const encrypted = await prisma.credential.count({
      where: { isEncrypted: true }
    });

    const byVersionRaw = await prisma.credential.groupBy({
      by: ['encryptionVersion'],
      where: { isEncrypted: true },
      _count: true
    });

    const byVersion: Record<string, number> = {};
    byVersionRaw.forEach(item => {
      byVersion[item.encryptionVersion] = item._count;
    });

    return {
      total,
      encrypted,
      unencrypted: total - encrypted,
      byVersion
    };
  }

  /**
   * Helper: Decrypts credential data
   */
  private async decryptCredentialData(credential: Credential): Promise<CredentialData> {
    if (!credential.isEncrypted) {
      // Legacy plain text credential (should not happen after migration)
      console.warn(`Credential ${credential.id} is not encrypted!`);
      return JSON.parse(credential.data);
    }

    // Decrypt
    const decrypted = await encryption.decrypt(credential.data);
    return JSON.parse(decrypted);
  }

  /**
   * Helper: Converts Prisma model to output DTO
   */
  private toOutput(credential: Credential): CredentialOutput {
    return {
      id: credential.id,
      userId: credential.userId,
      name: credential.name,
      type: credential.type,
      description: credential.description || undefined,
      isActive: credential.isActive,
      expiresAt: credential.expiresAt || undefined,
      lastUsedAt: credential.lastUsedAt || undefined,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt
    };
  }
}

// Singleton instance
let repositoryInstance: CredentialRepository | null = null;

/**
 * Gets singleton instance of CredentialRepository
 */
export function getCredentialRepository(): CredentialRepository {
  if (!repositoryInstance) {
    repositoryInstance = new CredentialRepository();
  }
  return repositoryInstance;
}

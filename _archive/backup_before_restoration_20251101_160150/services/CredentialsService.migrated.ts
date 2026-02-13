/**
 * Credentials Management Service - MIGRATED VERSION
 * Now uses database repositories with encryption and secure storage
 *
 * Migration Status: PHASE 3 - Using ServiceMigrationAdapter + EncryptionService
 * - Dual mode operation (memory + database)
 * - All credentials encrypted at rest
 * - Enhanced security with EncryptionService
 * - Audit logging enabled
 */

import { BaseService } from './BaseService';
import { logger } from './LoggingService';
import { credentialRepository } from '../backend/database/repositories';
import { ServiceMigrationAdapter } from '../backend/services/ServiceMigrationAdapter';
import { EncryptionService } from '../backend/security/EncryptionService';
import { EventBus } from '../backend/services/EventBus';

export interface Credentials {
  id: string;
  name: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  isValid: boolean;
  userId?: string;
  isActive?: boolean;
  expiresAt?: Date;
}

export interface ServiceCredentials {
  google?: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  };
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  openai?: {
    apiKey: string;
  };
  slack?: {
    token: string;
    webhookUrl?: string;
  };
  github?: {
    token: string;
  };
  custom?: Record<string, unknown>;
}

export class CredentialsService extends BaseService {
  private static instance: CredentialsService;
  private adapter: ServiceMigrationAdapter<Credentials>;
  private encryptionService: EncryptionService;
  private eventBus?: EventBus;

  // Sensitive field patterns
  private readonly SENSITIVE_PATTERNS = [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /apikey/i,
    /api_key/i,
    /accesskey/i,
    /privatekey/i,
  ];

  public static getInstance(eventBus?: EventBus): CredentialsService {
    if (!CredentialsService.instance) {
      CredentialsService.instance = new CredentialsService(eventBus);
    }
    return CredentialsService.instance;
  }

  constructor(eventBus?: EventBus) {
    super('CredentialsService');
    this.eventBus = eventBus;

    // Initialize encryption service
    this.encryptionService = new EncryptionService();

    // Initialize migration adapter
    this.adapter = new ServiceMigrationAdapter<Credentials>(
      'credentials',
      {
        mode: 'dual',
        syncToDatabase: true,
        syncFromDatabase: true,
        fallbackToMemory: true,
      },
      eventBus
    );

    this.initializeService();
  }

  protected async initializeService(): Promise<void> {
    await super.initializeService();
    logger.info('CredentialsService initialized with encryption and database support');
  }

  /**
   * Convert database credential to service format (with decryption)
   */
  private async dbToService(dbCredential: any): Promise<Credentials> {
    try {
      // Decrypt the credential data
      const decryptedData = await this.encryptionService.decrypt(dbCredential.encryptedData);

      return {
        id: dbCredential.id,
        name: dbCredential.name,
        type: dbCredential.type,
        data: JSON.parse(decryptedData),
        createdAt: new Date(dbCredential.createdAt),
        updatedAt: new Date(dbCredential.updatedAt),
        lastUsed: dbCredential.lastUsedAt ? new Date(dbCredential.lastUsedAt) : undefined,
        isValid: dbCredential.isActive && (!dbCredential.expiresAt || new Date(dbCredential.expiresAt) > new Date()),
        userId: dbCredential.userId,
        isActive: dbCredential.isActive,
        expiresAt: dbCredential.expiresAt ? new Date(dbCredential.expiresAt) : undefined,
      };
    } catch (error) {
      logger.error('Failed to decrypt credential:', error);
      // Return credential with empty data if decryption fails
      return {
        id: dbCredential.id,
        name: dbCredential.name,
        type: dbCredential.type,
        data: {},
        createdAt: new Date(dbCredential.createdAt),
        updatedAt: new Date(dbCredential.updatedAt),
        isValid: false,
        userId: dbCredential.userId,
      };
    }
  }

  /**
   * List all credentials (with masked sensitive data by default)
   */
  async listCredentials(userId?: string, showSensitive = false): Promise<Credentials[]> {
    try {
      const credentials = await this.adapter.list(async () => {
        const dbCredentials = await credentialRepository.findMany({ userId });
        return await Promise.all(dbCredentials.map(c => this.dbToService(c)));
      });

      // Mask sensitive data if requested
      if (!showSensitive) {
        return credentials.map(cred => ({
          ...cred,
          data: this.maskSensitiveData(cred.data),
        }));
      }

      return credentials;
    } catch (error) {
      logger.error('Failed to list credentials:', error);
      throw error;
    }
  }

  /**
   * Get credential by ID (full data)
   */
  async getCredential(id: string, userId?: string): Promise<Credentials | null> {
    try {
      const credential = await this.adapter.get(id, async (credId) => {
        const dbCredential = await credentialRepository.findById(credId);
        if (!dbCredential) return null;

        // Check user access
        if (userId && dbCredential.userId !== userId) {
          logger.warn(`User ${userId} attempted to access credential ${id} owned by ${dbCredential.userId}`);
          return null;
        }

        return await this.dbToService(dbCredential);
      });

      if (credential) {
        // Update last used timestamp
        await this.updateLastUsed(id);
      }

      return credential;
    } catch (error) {
      logger.error(`Failed to get credential ${id}:`, error);
      return null;
    }
  }

  /**
   * Create new credential (with encryption)
   */
  async createCredential(
    credential: Omit<Credentials, 'id' | 'createdAt' | 'updatedAt' | 'isValid'>,
    userId: string
  ): Promise<Credentials> {
    try {
      // Validate credential data
      this.validateCredentialData(credential.type, credential.data);

      const newCredential: Credentials = {
        ...credential,
        id: `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        isValid: true,
        userId,
        isActive: true,
      };

      const created = await this.adapter.set(
        newCredential.id,
        newCredential,
        async (id, data) => {
          // Encrypt credential data
          const encryptedData = await this.encryptionService.encrypt(
            JSON.stringify(data.data)
          );

          const dbCredential = await credentialRepository.create({
            userId,
            name: data.name,
            type: data.type,
            encryptedData,
            description: data.name,
            expiresAt: data.expiresAt,
          });

          return await this.dbToService(dbCredential);
        }
      );

      // Emit event
      if (this.eventBus) {
        this.eventBus.emit({
          id: `credential-created-${created.id}`,
          type: 'system.health_check',
          timestamp: new Date(),
          source: 'CredentialsService',
          data: {
            action: 'credential_created',
            credentialId: created.id,
            type: created.type,
            userId,
          },
        });
      }

      logger.info(`Created credential: ${created.id} (type: ${created.type})`);
      return created;
    } catch (error) {
      logger.error('Failed to create credential:', error);
      throw error;
    }
  }

  /**
   * Update credential
   */
  async updateCredential(
    id: string,
    updates: Partial<Credentials>,
    userId: string
  ): Promise<Credentials | null> {
    try {
      const existing = await this.getCredential(id, userId);
      if (!existing) {
        logger.warn(`Credential ${id} not found or access denied for user ${userId}`);
        return null;
      }

      const updated: Credentials = {
        ...existing,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date(),
      };

      const result = await this.adapter.set(id, updated, async (credId, data) => {
        // Encrypt credential data if it was updated
        const encryptedData = updates.data
          ? await this.encryptionService.encrypt(JSON.stringify(data.data))
          : undefined;

        const dbCredential = await credentialRepository.update(credId, {
          name: data.name,
          type: data.type,
          encryptedData,
          description: data.name,
          isActive: data.isActive,
          expiresAt: data.expiresAt,
        });

        return dbCredential ? await this.dbToService(dbCredential) : data;
      });

      // Emit event
      if (this.eventBus) {
        this.eventBus.emit({
          id: `credential-updated-${id}`,
          type: 'system.health_check',
          timestamp: new Date(),
          source: 'CredentialsService',
          data: {
            action: 'credential_updated',
            credentialId: id,
            updates: Object.keys(updates),
            userId,
          },
        });
      }

      logger.info(`Updated credential: ${id}`);
      return result;
    } catch (error) {
      logger.error(`Failed to update credential ${id}:`, error);
      return null;
    }
  }

  /**
   * Delete credential
   */
  async deleteCredential(id: string, userId: string): Promise<boolean> {
    try {
      // Verify ownership
      const credential = await this.getCredential(id, userId);
      if (!credential) {
        return false;
      }

      const deleted = await this.adapter.delete(id, async (credId) => {
        return await credentialRepository.delete(credId);
      });

      if (deleted && this.eventBus) {
        this.eventBus.emit({
          id: `credential-deleted-${id}`,
          type: 'system.health_check',
          timestamp: new Date(),
          source: 'CredentialsService',
          data: {
            action: 'credential_deleted',
            credentialId: id,
            userId,
          },
        });
      }

      logger.info(`Deleted credential: ${id}`);
      return deleted;
    } catch (error) {
      logger.error(`Failed to delete credential ${id}:`, error);
      return false;
    }
  }

  /**
   * Test credential validity
   */
  async testCredential(id: string, userId: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const credential = await this.getCredential(id, userId);
      if (!credential) {
        return { valid: false, error: 'Credential not found' };
      }

      // Validate based on type
      const isValid = this.validateCredentialData(credential.type, credential.data);

      return { valid: isValid };
    } catch (error) {
      logger.error(`Failed to test credential ${id}:`, error);
      return { valid: false, error: String(error) };
    }
  }

  /**
   * Validate credential data based on type
   */
  private validateCredentialData(type: string, data: Record<string, unknown>): boolean {
    switch (type) {
      case 'google':
        return !!(data.clientId && data.clientSecret);
      case 'aws':
        return !!(data.accessKeyId && data.secretAccessKey && data.region);
      case 'openai':
        return !!data.apiKey;
      case 'slack':
        return !!(data.token || data.webhookUrl);
      case 'github':
        return !!data.token;
      default:
        return Object.keys(data).length > 0;
    }
  }

  /**
   * Mask sensitive data for display
   */
  private maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
    const masked: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const isSensitive = this.SENSITIVE_PATTERNS.some(pattern => pattern.test(key));

      if (isSensitive && typeof value === 'string') {
        // Show first 4 and last 4 characters
        masked[key] = value.length > 8
          ? `${value.substring(0, 4)}${'*'.repeat(value.length - 8)}${value.substring(value.length - 4)}`
          : '*'.repeat(value.length);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(id: string): Promise<void> {
    try {
      await credentialRepository.update(id, {
        lastUsedAt: new Date(),
      });
    } catch (error) {
      logger.error(`Failed to update last used for credential ${id}:`, error);
    }
  }

  /**
   * Get credential statistics
   */
  async getStatistics(userId?: string): Promise<{
    total: number;
    active: number;
    expired: number;
    byType: Record<string, number>;
  }> {
    try {
      const stats = await credentialRepository.getStatistics();
      return stats;
    } catch (error) {
      logger.error('Failed to get credential statistics:', error);
      return { total: 0, active: 0, expired: 0, byType: {} };
    }
  }

  /**
   * Get migration adapter (for monitoring)
   */
  getAdapter(): ServiceMigrationAdapter<Credentials> {
    return this.adapter;
  }

  /**
   * Switch to database-only mode
   */
  async switchToDatabaseOnly(): Promise<void> {
    logger.info('Switching CredentialsService to database-only mode');
    this.adapter.setMode('database-only');
    this.adapter.clearMemory();
    logger.info('CredentialsService now running in database-only mode');
  }
}

// Export singleton instance
export const credentialsService = CredentialsService.getInstance();

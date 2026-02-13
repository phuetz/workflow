/**
 * Vault Service
 * Main orchestrator for secure secret management
 */

import { EventEmitter } from 'events';
import { logger } from './SimpleLogger';
import { EncryptionHandler } from './vault/EncryptionHandler';
import { SecretStorage } from './vault/SecretStorage';
import { AccessControl } from './vault/AccessControl';
import { AuditLogger } from './vault/AuditLogger';
import {
  VaultConfig,
  Secret,
  EncryptedData,
  AuditLog,
  AuditLogFilters,
  SecretCreateOptions,
  SecretSearchQuery,
  ExportBundle
} from './vault/types';

export class VaultService extends EventEmitter {
  private encryption: EncryptionHandler;
  private storage: SecretStorage;
  private accessControl: AccessControl;
  private auditLogger: AuditLogger;
  private maxSecretSize: number;
  private rotationInterval: number;
  private rotationTimer?: NodeJS.Timeout;

  constructor(config: VaultConfig = {}) {
    super();

    // Initialize configuration
    const algorithm = config.algorithm || 'aes-256-gcm';
    const keyDerivationRounds = config.keyDerivationRounds || 100000;
    this.maxSecretSize = config.maxSecretSize || 1024 * 1024;
    this.rotationInterval = config.rotationInterval || 30 * 24 * 60 * 60 * 1000;

    // Initialize encryption key
    const key = config.encryptionKey || process.env.VAULT_ENCRYPTION_KEY;
    let encryptionKey: Buffer;
    if (!key) {
      logger.warn('No encryption key provided, generating random key (not for production!)');
      encryptionKey = EncryptionHandler.generateRandomKey();
    } else {
      const tempHandler = new EncryptionHandler(Buffer.alloc(32), algorithm, keyDerivationRounds);
      encryptionKey = tempHandler.deriveKey(key);
    }

    // Initialize components
    this.encryption = new EncryptionHandler(encryptionKey, algorithm, keyDerivationRounds);
    this.storage = new SecretStorage();
    this.accessControl = new AccessControl();
    this.auditLogger = new AuditLogger(config.auditLogging !== false);

    // Forward audit events
    this.auditLogger.on('audit', (log) => this.emit('audit', log));

    // Start key rotation if enabled
    if (config.autoRotateKeys !== false) {
      this.startKeyRotation();
    }

    // Load initial secrets
    this.loadSecrets();
  }

  public async createSecret(
    name: string,
    value: string,
    userId: string,
    options: SecretCreateOptions = {}
  ): Promise<Secret> {
    try {
      if (value.length > this.maxSecretSize) {
        throw new Error(`Secret exceeds maximum size of ${this.maxSecretSize} bytes`);
      }

      if (this.storage.getByName(name)) {
        throw new Error(`Secret with name "${name}" already exists`);
      }

      const encrypted = this.encryption.encrypt(value);
      const secret: Secret = {
        id: SecretStorage.generateId(),
        name,
        value: JSON.stringify(encrypted),
        encrypted: true,
        metadata: {
          created: new Date(),
          modified: new Date(),
          createdBy: userId,
          modifiedBy: userId,
          version: 1,
          tags: options.tags || [],
          expiresAt: options.expiresAt
        },
        permissions: options.permissions || AccessControl.getDefaultPermissions(userId)
      };

      this.storage.set(secret);
      this.auditLogger.log({ action: 'create', secretId: secret.id, secretName: name, userId, success: true });
      this.emit('secret:created', secret);
      await this.saveSecrets();

      return SecretStorage.sanitize(secret);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.auditLogger.log({ action: 'create', secretId: '', secretName: name, userId, success: false, error: errorMessage });
      throw error;
    }
  }

  public async getSecret(secretId: string, userId: string): Promise<Secret | null> {
    try {
      const secret = this.storage.get(secretId);
      if (!secret) throw new Error(`Secret not found: ${secretId}`);
      if (!this.accessControl.canAccess(secret, userId)) throw new Error('Access denied');

      this.auditLogger.log({ action: 'read', secretId: secret.id, secretName: secret.name, userId, success: true });
      return SecretStorage.sanitize(secret);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.auditLogger.log({ action: 'read', secretId, secretName: '', userId, success: false, error: errorMessage });
      return null;
    }
  }

  public async getSecretValue(secretId: string, userId: string): Promise<string | null> {
    try {
      const secret = this.storage.get(secretId);
      if (!secret) throw new Error(`Secret not found: ${secretId}`);
      if (!this.accessControl.canAccess(secret, userId)) throw new Error('Access denied');

      const encrypted = JSON.parse(secret.value) as EncryptedData;
      const decrypted = this.encryption.decrypt(encrypted);

      this.auditLogger.log({ action: 'read', secretId: secret.id, secretName: secret.name, userId, success: true, metadata: { valueAccessed: true } });
      return decrypted;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.auditLogger.log({ action: 'read', secretId, secretName: '', userId, success: false, error: errorMessage });
      return null;
    }
  }

  public async updateSecret(secretId: string, value: string, userId: string): Promise<Secret | null> {
    try {
      const secret = this.storage.get(secretId);
      if (!secret) throw new Error(`Secret not found: ${secretId}`);
      if (!this.accessControl.hasPermission(secret, userId, 'write')) throw new Error('Access denied');
      if (value.length > this.maxSecretSize) throw new Error(`Secret exceeds maximum size of ${this.maxSecretSize} bytes`);

      const encrypted = this.encryption.encrypt(value);
      this.storage.updateMetadata(secretId, { modifiedBy: userId, value: JSON.stringify(encrypted) });

      this.auditLogger.log({ action: 'update', secretId: secret.id, secretName: secret.name, userId, success: true, metadata: { version: secret.metadata.version } });
      this.emit('secret:updated', secret);
      await this.saveSecrets();

      return SecretStorage.sanitize(secret);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.auditLogger.log({ action: 'update', secretId, secretName: '', userId, success: false, error: errorMessage });
      return null;
    }
  }

  public async deleteSecret(secretId: string, userId: string): Promise<boolean> {
    try {
      const secret = this.storage.get(secretId);
      if (!secret) throw new Error(`Secret not found: ${secretId}`);
      if (!this.accessControl.hasPermission(secret, userId, 'delete')) throw new Error('Access denied');

      this.storage.delete(secretId);
      this.auditLogger.log({ action: 'delete', secretId: secret.id, secretName: secret.name, userId, success: true });
      this.emit('secret:deleted', { id: secretId, name: secret.name });
      await this.saveSecrets();

      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.auditLogger.log({ action: 'delete', secretId, secretName: '', userId, success: false, error: errorMessage });
      return false;
    }
  }

  public async listSecrets(userId: string): Promise<Secret[]> {
    return this.storage
      .search({}, (secret) => this.accessControl.canAccess(secret, userId))
      .map(SecretStorage.sanitize);
  }

  public async searchSecrets(userId: string, query: SecretSearchQuery): Promise<Secret[]> {
    return this.storage
      .search(query, (secret) => this.accessControl.canAccess(secret, userId))
      .map(SecretStorage.sanitize);
  }

  public async rotateEncryptionKey(): Promise<void> {
    try {
      const { newKeyVersion } = this.encryption.rotateKey();

      // Re-encrypt all secrets with new key
      for (const secret of this.storage.getAll()) {
        const encrypted = JSON.parse(secret.value) as EncryptedData;
        const reEncrypted = this.encryption.reEncrypt(encrypted);
        secret.value = JSON.stringify(reEncrypted);
      }

      this.auditLogger.log({ action: 'rotate', secretId: '', secretName: 'encryption-key', userId: 'system', success: true, metadata: { keyVersion: newKeyVersion } });
      await this.saveSecrets();
      this.emit('key:rotated', { version: newKeyVersion });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.auditLogger.log({ action: 'rotate', secretId: '', secretName: 'encryption-key', userId: 'system', success: false, error: errorMessage });
      throw error;
    }
  }

  public async exportSecrets(userId: string, password: string): Promise<string> {
    try {
      if (!this.accessControl.isAdmin(userId)) throw new Error('Only administrators can export secrets');

      const secrets = this.storage.getAll().map((secret) => {
        const encrypted = JSON.parse(secret.value) as EncryptedData;
        return { ...secret, value: this.encryption.decrypt(encrypted) };
      });

      const exportData = JSON.stringify(secrets);
      const encryptedExport = this.encryption.encryptForExport(exportData, password);

      const exportBundle: ExportBundle = {
        version: '1.0',
        algorithm: this.encryption.getAlgorithm(),
        ...encryptedExport,
        timestamp: Date.now(),
        exportedBy: userId
      };

      this.auditLogger.log({ action: 'export', secretId: '', secretName: 'all-secrets', userId, success: true, metadata: { count: secrets.length } });
      return JSON.stringify(exportBundle);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.auditLogger.log({ action: 'export', secretId: '', secretName: 'all-secrets', userId, success: false, error: errorMessage });
      throw error;
    }
  }

  public async importSecrets(userId: string, exportData: string, password: string, overwrite: boolean = false): Promise<number> {
    try {
      if (!this.accessControl.isAdmin(userId)) throw new Error('Only administrators can import secrets');

      const exportBundle = JSON.parse(exportData) as ExportBundle;
      const decrypted = this.encryption.decryptFromImport(exportBundle.data, password, exportBundle.iv, exportBundle.authTag, exportBundle.algorithm);
      const secrets = JSON.parse(decrypted);

      let imported = 0;
      for (const secret of secrets) {
        const existing = this.storage.getByName(secret.name);
        if (existing && !overwrite) continue;

        const encrypted = this.encryption.encrypt(secret.value);
        secret.value = JSON.stringify(encrypted);
        secret.encrypted = true;

        if (existing) {
          secret.metadata.modified = new Date();
          secret.metadata.modifiedBy = userId;
          secret.metadata.version = existing.metadata.version + 1;
        }

        this.storage.set(secret);
        imported++;
      }

      this.auditLogger.log({ action: 'import', secretId: '', secretName: 'all-secrets', userId, success: true, metadata: { imported, total: secrets.length } });
      await this.saveSecrets();
      return imported;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.auditLogger.log({ action: 'import', secretId: '', secretName: 'all-secrets', userId, success: false, error: errorMessage });
      throw error;
    }
  }

  public getAuditLogs(filters: AuditLogFilters = {}): AuditLog[] {
    return this.auditLogger.getLogs(filters);
  }

  private startKeyRotation(): void {
    if (this.rotationTimer) clearInterval(this.rotationTimer);

    this.rotationTimer = setInterval(async () => {
      try {
        await this.rotateEncryptionKey();
        logger.debug('Encryption key rotated successfully');
      } catch (error) {
        logger.error('Failed to rotate encryption key:', error);
      }
    }, this.rotationInterval);
  }

  private async loadSecrets(): Promise<void> {
    if (this.storage.count() === 0) {
      await this.createSecret('database-password', 'super-secret-password', 'system', {
        tags: ['database', 'production'],
        permissions: { read: ['admin', 'backend-service'], write: ['admin'], delete: ['admin'] }
      });
      await this.createSecret('api-key', 'sk-1234567890abcdef', 'system', {
        tags: ['api', 'external'],
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        permissions: { read: ['admin', 'api-service'], write: ['admin'], delete: ['admin'] }
      });
    }
  }

  private async saveSecrets(): Promise<void> {
    this.emit('secrets:saved', { count: this.storage.count(), timestamp: new Date() });
  }

  public async shutdown(): Promise<void> {
    if (this.rotationTimer) clearInterval(this.rotationTimer);
    await this.saveSecrets();
    this.storage.clear();
    this.auditLogger.clear();
    this.emit('shutdown');
  }
}

// Export singleton instance
let vaultService: VaultService | null = null;

export function initializeVaultService(config?: VaultConfig): VaultService {
  if (!vaultService) {
    vaultService = new VaultService(config);
  }
  return vaultService;
}

export function getVaultService(): VaultService {
  if (!vaultService) {
    vaultService = new VaultService();
  }
  return vaultService;
}

export default VaultService;

// Re-export types for convenience
export * from './vault/types';

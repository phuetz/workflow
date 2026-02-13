import crypto from 'crypto';
import { EventEmitter } from 'events';
import { logger } from './LoggingService';

interface VaultConfig {
  encryptionKey?: string;
  algorithm?: string;
  keyDerivationRounds?: number;
  maxSecretSize?: number;
  autoRotateKeys?: boolean;
  rotationInterval?: number;
  auditLogging?: boolean;
}

interface Secret {
  id: string;
  name: string;
  value: string;
  encrypted: boolean;
  metadata: {
    created: Date;
    modified: Date;
    createdBy: string;
    modifiedBy: string;
    version: number;
    tags: string[];
    expiresAt?: Date;
  };
  permissions: {
    read: string[];
    write: string[];
    delete: string[];
  };
}

interface EncryptedData {
  data: string;
  iv: string;
  authTag: string;
  algorithm: string;
  timestamp: number;
}

interface AuditLog {
  id: string;
  timestamp: Date;
  action: 'create' | 'read' | 'update' | 'delete' | 'rotate' | 'export' | 'import';
  secretId: string;
  secretName: string;
  userId: string;
  userIp?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export class VaultService extends EventEmitter {
  private secrets: Map<string, Secret> = new Map();
  private encryptionKey: Buffer;
  private algorithm: string;
  private keyDerivationRounds: number;
  private maxSecretSize: number;
  private rotationInterval: number;
  private autoRotateKeys: boolean;
  private auditLogging: boolean;
  private auditLogs: AuditLog[] = [];
  private rotationTimer?: NodeJS.Timeout;
  private keyVersion: number = 1;
  private previousKeys: Map<number, Buffer> = new Map();

  constructor(config: VaultConfig = {}) {
    super();

    // Initialize configuration
    this.algorithm = config.algorithm || 'aes-256-gcm';
    this.keyDerivationRounds = config.keyDerivationRounds || 100000;
    this.maxSecretSize = config.maxSecretSize || 1024 * 1024; // 1MB
    this.autoRotateKeys = config.autoRotateKeys !== false;
    this.rotationInterval = config.rotationInterval || 30 * 24 * 60 * 60 * 1000; // 30 days
    this.auditLogging = config.auditLogging !== false;

    // Initialize encryption key
    const key = config.encryptionKey || process.env.VAULT_ENCRYPTION_KEY;
    if (!key) {
      // Generate a random key if none provided (for development only)
      logger.warn('No encryption key provided, generating random key (not for production!)');
      this.encryptionKey = crypto.randomBytes(32);
    } else {
      // Derive key from provided string
      this.encryptionKey = this.deriveKey(key);
    }

    // Start key rotation if enabled
    if (this.autoRotateKeys) {
      this.startKeyRotation();
    }

    // Load secrets from storage (in production, this would be from a database)
    this.loadSecrets();
  }

  private deriveKey(password: string): Buffer {
    const salt = crypto.createHash('sha256').update('vault-salt').digest();
    return crypto.pbkdf2Sync(password, salt, this.keyDerivationRounds, 32, 'sha256');
  }

  private encrypt(text: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = (cipher as any).getAuthTag();

    return {
      data: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: this.algorithm,
      timestamp: Date.now()
    };
  }

  private decrypt(encryptedData: EncryptedData): string {
    try {
      const decipher = crypto.createDecipheriv(
        encryptedData.algorithm,
        this.encryptionKey,
        Buffer.from(encryptedData.iv, 'hex')
      );
      
      (decipher as any).setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      // Try with previous keys if decryption fails (for key rotation)
      for (const [version, key] of this.previousKeys) {
        try {
          const decipher = crypto.createDecipheriv(
            encryptedData.algorithm,
            key,
            Buffer.from(encryptedData.iv, 'hex')
          );
          
          (decipher as any).setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
          
          let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          
          return decrypted;
        } catch {
          // Continue trying other keys
        }
      }
      
      throw new Error('Failed to decrypt data');
    }
  }

  public async createSecret(
    name: string,
    value: string,
    userId: string,
    options: {
      tags?: string[];
      expiresAt?: Date;
      permissions?: Secret['permissions'];
    } = {}
  ): Promise<Secret> {
    try {
      // Validate secret size
      if (value.length > this.maxSecretSize) {
        throw new Error(`Secret exceeds maximum size of ${this.maxSecretSize} bytes`);
      }

      // Check if secret already exists
      if (this.getSecretByName(name)) {
        throw new Error(`Secret with name "${name}" already exists`);
      }

      // Encrypt the value
      const encrypted = this.encrypt(value);

      // Create secret
      const secret: Secret = {
        id: `secret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
        permissions: options.permissions || {
          read: [userId],
          write: [userId],
          delete: [userId]
        }
      };

      // Store secret
      this.secrets.set(secret.id, secret);

      // Audit log
      this.logAudit({
        action: 'create',
        secretId: secret.id,
        secretName: name,
        userId,
        success: true
      });

      // Emit event
      this.emit('secret:created', secret);

      // Save to storage
      await this.saveSecrets();

      return this.sanitizeSecret(secret);
    } catch (error: any) {
      // Audit log failure
      this.logAudit({
        action: 'create',
        secretId: '',
        secretName: name,
        userId,
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  public async getSecret(secretId: string, userId: string): Promise<Secret | null> {
    try {
      const secret = this.secrets.get(secretId);
      
      if (!secret) {
        throw new Error(`Secret not found: ${secretId}`);
      }

      // Check permissions
      if (!this.hasPermission(secret, userId, 'read')) {
        throw new Error('Access denied');
      }

      // Check expiration
      if (secret.metadata.expiresAt && new Date() > secret.metadata.expiresAt) {
        throw new Error('Secret has expired');
      }

      // Audit log
      this.logAudit({
        action: 'read',
        secretId: secret.id,
        secretName: secret.name,
        userId,
        success: true
      });

      return this.sanitizeSecret(secret);
    } catch (error: any) {
      // Audit log failure
      this.logAudit({
        action: 'read',
        secretId,
        secretName: '',
        userId,
        success: false,
        error: error.message
      });

      return null;
    }
  }

  public async getSecretValue(secretId: string, userId: string): Promise<string | null> {
    try {
      const secret = this.secrets.get(secretId);
      
      if (!secret) {
        throw new Error(`Secret not found: ${secretId}`);
      }

      // Check permissions
      if (!this.hasPermission(secret, userId, 'read')) {
        throw new Error('Access denied');
      }

      // Check expiration
      if (secret.metadata.expiresAt && new Date() > secret.metadata.expiresAt) {
        throw new Error('Secret has expired');
      }

      // Decrypt value
      const encrypted = JSON.parse(secret.value) as EncryptedData;
      const decrypted = this.decrypt(encrypted);

      // Audit log
      this.logAudit({
        action: 'read',
        secretId: secret.id,
        secretName: secret.name,
        userId,
        success: true,
        metadata: { valueAccessed: true }
      });

      return decrypted;
    } catch (error: any) {
      // Audit log failure
      this.logAudit({
        action: 'read',
        secretId,
        secretName: '',
        userId,
        success: false,
        error: error.message
      });

      return null;
    }
  }

  public async updateSecret(
    secretId: string,
    value: string,
    userId: string
  ): Promise<Secret | null> {
    try {
      const secret = this.secrets.get(secretId);
      
      if (!secret) {
        throw new Error(`Secret not found: ${secretId}`);
      }

      // Check permissions
      if (!this.hasPermission(secret, userId, 'write')) {
        throw new Error('Access denied');
      }

      // Validate secret size
      if (value.length > this.maxSecretSize) {
        throw new Error(`Secret exceeds maximum size of ${this.maxSecretSize} bytes`);
      }

      // Encrypt new value
      const encrypted = this.encrypt(value);

      // Update secret
      secret.value = JSON.stringify(encrypted);
      secret.metadata.modified = new Date();
      secret.metadata.modifiedBy = userId;
      secret.metadata.version++;

      // Audit log
      this.logAudit({
        action: 'update',
        secretId: secret.id,
        secretName: secret.name,
        userId,
        success: true,
        metadata: { version: secret.metadata.version }
      });

      // Emit event
      this.emit('secret:updated', secret);

      // Save to storage
      await this.saveSecrets();

      return this.sanitizeSecret(secret);
    } catch (error: any) {
      // Audit log failure
      this.logAudit({
        action: 'update',
        secretId,
        secretName: '',
        userId,
        success: false,
        error: error.message
      });

      return null;
    }
  }

  public async deleteSecret(secretId: string, userId: string): Promise<boolean> {
    try {
      const secret = this.secrets.get(secretId);
      
      if (!secret) {
        throw new Error(`Secret not found: ${secretId}`);
      }

      // Check permissions
      if (!this.hasPermission(secret, userId, 'delete')) {
        throw new Error('Access denied');
      }

      // Delete secret
      this.secrets.delete(secretId);

      // Audit log
      this.logAudit({
        action: 'delete',
        secretId: secret.id,
        secretName: secret.name,
        userId,
        success: true
      });

      // Emit event
      this.emit('secret:deleted', { id: secretId, name: secret.name });

      // Save to storage
      await this.saveSecrets();

      return true;
    } catch (error: any) {
      // Audit log failure
      this.logAudit({
        action: 'delete',
        secretId,
        secretName: '',
        userId,
        success: false,
        error: error.message
      });

      return false;
    }
  }

  public async listSecrets(userId: string): Promise<Secret[]> {
    const accessibleSecrets: Secret[] = [];

    for (const secret of this.secrets.values()) {
      // Check if user has read permission
      if (this.hasPermission(secret, userId, 'read')) {
        // Check if not expired
        if (!secret.metadata.expiresAt || new Date() <= secret.metadata.expiresAt) {
          accessibleSecrets.push(this.sanitizeSecret(secret));
        }
      }
    }

    return accessibleSecrets;
  }

  public async searchSecrets(
    userId: string,
    query: {
      name?: string;
      tags?: string[];
      createdBy?: string;
      createdAfter?: Date;
      createdBefore?: Date;
    }
  ): Promise<Secret[]> {
    const results: Secret[] = [];

    for (const secret of this.secrets.values()) {
      // Check permissions
      if (!this.hasPermission(secret, userId, 'read')) {
        continue;
      }

      // Check expiration
      if (secret.metadata.expiresAt && new Date() > secret.metadata.expiresAt) {
        continue;
      }

      // Apply filters
      let matches = true;

      if (query.name && !secret.name.includes(query.name)) {
        matches = false;
      }

      if (query.tags && query.tags.length > 0) {
        const hasAllTags = query.tags.every(tag => 
          secret.metadata.tags.includes(tag)
        );
        if (!hasAllTags) {
          matches = false;
        }
      }

      if (query.createdBy && secret.metadata.createdBy !== query.createdBy) {
        matches = false;
      }

      if (query.createdAfter && secret.metadata.created < query.createdAfter) {
        matches = false;
      }

      if (query.createdBefore && secret.metadata.created > query.createdBefore) {
        matches = false;
      }

      if (matches) {
        results.push(this.sanitizeSecret(secret));
      }
    }

    return results;
  }

  public async rotateEncryptionKey(): Promise<void> {
    try {
      // Store current key as previous
      this.previousKeys.set(this.keyVersion, Buffer.from(this.encryptionKey));

      // Generate new key
      const newKey = crypto.randomBytes(32);
      this.encryptionKey = newKey;
      this.keyVersion++;

      // Re-encrypt all secrets with new key
      for (const secret of this.secrets.values()) {
        const encrypted = JSON.parse(secret.value) as EncryptedData;
        const decrypted = this.decrypt(encrypted);
        const reEncrypted = this.encrypt(decrypted);
        secret.value = JSON.stringify(reEncrypted);
      }

      // Audit log
      this.logAudit({
        action: 'rotate',
        secretId: '',
        secretName: 'encryption-key',
        userId: 'system',
        success: true,
        metadata: { keyVersion: this.keyVersion }
      });

      // Save secrets with new encryption
      await this.saveSecrets();

      // Emit event
      this.emit('key:rotated', { version: this.keyVersion });

      // Clean up old keys (keep last 3 versions)
      if (this.previousKeys.size > 3) {
        const oldestVersion = Math.min(...Array.from(this.previousKeys.keys()));
        this.previousKeys.delete(oldestVersion);
      }
    } catch (error: any) {
      // Audit log failure
      this.logAudit({
        action: 'rotate',
        secretId: '',
        secretName: 'encryption-key',
        userId: 'system',
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  public async exportSecrets(userId: string, password: string): Promise<string> {
    try {
      // Check if user is admin (implement your own logic)
      if (!this.isAdmin(userId)) {
        throw new Error('Only administrators can export secrets');
      }

      const secrets: any[] = [];

      for (const secret of this.secrets.values()) {
        const encrypted = JSON.parse(secret.value) as EncryptedData;
        const decrypted = this.decrypt(encrypted);

        secrets.push({
          ...secret,
          value: decrypted // Export decrypted values
        });
      }

      // Encrypt the export with the provided password
      const exportData = JSON.stringify(secrets);
      const exportKey = this.deriveKey(password);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, exportKey, iv);
      
      let encrypted = cipher.update(exportData, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = (cipher as any).getAuthTag();

      const exportBundle = {
        version: '1.0',
        algorithm: this.algorithm,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        data: encrypted,
        timestamp: Date.now(),
        exportedBy: userId
      };

      // Audit log
      this.logAudit({
        action: 'export',
        secretId: '',
        secretName: 'all-secrets',
        userId,
        success: true,
        metadata: { count: secrets.length }
      });

      return JSON.stringify(exportBundle);
    } catch (error: any) {
      // Audit log failure
      this.logAudit({
        action: 'export',
        secretId: '',
        secretName: 'all-secrets',
        userId,
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  public async importSecrets(
    userId: string,
    exportData: string,
    password: string,
    overwrite: boolean = false
  ): Promise<number> {
    try {
      // Check if user is admin
      if (!this.isAdmin(userId)) {
        throw new Error('Only administrators can import secrets');
      }

      const exportBundle = JSON.parse(exportData);

      // Decrypt the export
      const exportKey = this.deriveKey(password);
      const decipher = crypto.createDecipheriv(
        exportBundle.algorithm,
        exportKey,
        Buffer.from(exportBundle.iv, 'hex')
      );
      
      (decipher as any).setAuthTag(Buffer.from(exportBundle.authTag, 'hex'));
      
      let decrypted = decipher.update(exportBundle.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const secrets = JSON.parse(decrypted);

      let imported = 0;

      for (const secret of secrets) {
        // Check if secret exists
        const existing = this.getSecretByName(secret.name);
        
        if (existing && !overwrite) {
          continue;
        }

        // Re-encrypt with current key
        const encrypted = this.encrypt(secret.value);
        secret.value = JSON.stringify(encrypted);
        secret.encrypted = true;

        // Update metadata
        if (existing) {
          secret.metadata.modified = new Date();
          secret.metadata.modifiedBy = userId;
          secret.metadata.version = existing.metadata.version + 1;
        }

        // Store secret
        this.secrets.set(secret.id, secret);
        imported++;
      }

      // Audit log
      this.logAudit({
        action: 'import',
        secretId: '',
        secretName: 'all-secrets',
        userId,
        success: true,
        metadata: { imported, total: secrets.length }
      });

      // Save to storage
      await this.saveSecrets();

      return imported;
    } catch (error: any) {
      // Audit log failure
      this.logAudit({
        action: 'import',
        secretId: '',
        secretName: 'all-secrets',
        userId,
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  public getAuditLogs(
    filters: {
      userId?: string;
      secretId?: string;
      action?: AuditLog['action'];
      startDate?: Date;
      endDate?: Date;
      success?: boolean;
    } = {}
  ): AuditLog[] {
    let logs = [...this.auditLogs];

    // Apply filters
    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }

    if (filters.secretId) {
      logs = logs.filter(log => log.secretId === filters.secretId);
    }

    if (filters.action) {
      logs = logs.filter(log => log.action === filters.action);
    }

    if (filters.startDate) {
      logs = logs.filter(log => log.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      logs = logs.filter(log => log.timestamp <= filters.endDate!);
    }

    if (filters.success !== undefined) {
      logs = logs.filter(log => log.success === filters.success);
    }

    // Sort by timestamp descending
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return logs;
  }

  private hasPermission(
    secret: Secret,
    userId: string,
    action: 'read' | 'write' | 'delete'
  ): boolean {
    // Admin bypass (implement your own logic)
    if (this.isAdmin(userId)) {
      return true;
    }

    const permissions = secret.permissions[action];
    return permissions.includes(userId) || permissions.includes('*');
  }

  private isAdmin(userId: string): boolean {
    // Implement your admin check logic
    // For now, check if userId contains 'admin'
    return userId.includes('admin');
  }

  private sanitizeSecret(secret: Secret): Secret {
    // Return secret without the encrypted value
    return {
      ...secret,
      value: '***ENCRYPTED***'
    };
  }

  private getSecretByName(name: string): Secret | undefined {
    for (const secret of this.secrets.values()) {
      if (secret.name === name) {
        return secret;
      }
    }
    return undefined;
  }

  private logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
    if (!this.auditLogging) {
      return;
    }

    const auditLog: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...log
    };

    this.auditLogs.push(auditLog);

    // Keep only last 10000 logs in memory
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }

    // Emit audit event
    this.emit('audit', auditLog);
  }

  private startKeyRotation(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

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
    // In production, load from database
    // For now, initialize with some default secrets
    if (this.secrets.size === 0) {
      await this.createSecret(
        'database-password',
        'super-secret-password',
        'system',
        {
          tags: ['database', 'production'],
          permissions: {
            read: ['admin', 'backend-service'],
            write: ['admin'],
            delete: ['admin']
          }
        }
      );

      await this.createSecret(
        'api-key',
        'sk-1234567890abcdef',
        'system',
        {
          tags: ['api', 'external'],
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          permissions: {
            read: ['admin', 'api-service'],
            write: ['admin'],
            delete: ['admin']
          }
        }
      );
    }
  }

  private async saveSecrets(): Promise<void> {
    // In production, save to database
    // For now, just emit an event
    this.emit('secrets:saved', {
      count: this.secrets.size,
      timestamp: new Date()
    });
  }

  public async shutdown(): Promise<void> {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    await this.saveSecrets();
    
    this.secrets.clear();
    this.auditLogs = [];
    this.previousKeys.clear();

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
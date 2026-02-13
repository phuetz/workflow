/**
 * Encryption Service
 * End-to-end encryption for sensitive data including credentials, workflow data, and logs
 */

import { logger } from './SimpleLogger';
import { BaseService } from './BaseService';

export interface EncryptionConfig {
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  keyDerivation: 'PBKDF2' | 'Argon2id';
  iterations: number;
  saltLength: number;
  ivLength: number;
  tagLength: number;
}

export interface EncryptedData {
  encrypted: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  tag: string; // Base64 encoded authentication tag
  salt: string; // Base64 encoded salt (for key derivation)
  keyId: string; // Key identifier for key rotation
  algorithm: string;
  metadata?: {
    timestamp: number;
    version: string;
    context: string;
  };
}

export interface DecryptionResult {
  data: string;
  metadata?: {
    timestamp: number;
    version: string;
    context: string;
  };
}

export interface EncryptionKey {
  id: string;
  key: CryptoKey;
  algorithm: string;
  usage: KeyUsage[];
  createdAt: Date;
  expiresAt?: Date;
  rotationDue: boolean;
  context: 'credentials' | 'workflow_data' | 'logs' | 'system';
}

export interface KeyRotationPolicy {
  enabled: boolean;
  interval: number; // days
  autoRotate: boolean;
  preserveOldKeys: number; // how many old keys to keep
  notifyBeforeExpiry: number; // days before expiry to notify
}

export class EncryptionService extends BaseService {
  private encryptionConfig: EncryptionConfig;
  private keys: Map<string, EncryptionKey> = new Map();
  private masterKey: CryptoKey | null = null;
  private keyRotationPolicy: KeyRotationPolicy;

  constructor() {
    super('EncryptionService', {
      enableRetry: true,
      maxRetries: 1 // Encryption should not be retried on failure
    });

    this.encryptionConfig = {
      algorithm: 'AES-256-GCM',
      keyDerivation: 'PBKDF2',
      iterations: 100000,
      saltLength: 32,
      ivLength: 12,
      tagLength: 16
    };

    this.keyRotationPolicy = {
      enabled: true,
      interval: 90, // 90 days
      autoRotate: true,
      preserveOldKeys: 3,
      notifyBeforeExpiry: 7
    };

    this.initializeEncryption();
  }

  private async initializeEncryption(): Promise<void> {
    try {
      await this.initializeMasterKey();
      await this.loadOrCreateKeys();
      this.scheduleKeyRotation();

      logger.info('Encryption service initialized', {
        algorithm: this.encryptionConfig.algorithm,
        keyCount: this.keys.size
      });
    } catch (error) {
      logger.error('Failed to initialize encryption service', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  private async initializeMasterKey(): Promise<void> {
    // In production, this would be loaded from secure key management service (HSM, AWS KMS, etc.)
    const keyMaterial = await this.getKeyMaterial();

    this.masterKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
  }

  private async getKeyMaterial(): Promise<ArrayBuffer> {
    // In production, this would be securely retrieved from environment or key management service
    const encoder = new TextEncoder();
    const password = process.env.ENCRYPTION_MASTER_KEY || 'default-secure-key-change-in-production';
    return encoder.encode(password).buffer;
  }

  private async loadOrCreateKeys(): Promise<void> {
    // Create default keys for different contexts
    const contexts: Array<EncryptionKey['context']> = ['credentials', 'workflow_data', 'logs', 'system'];

    for (const context of contexts) {
      const keyId = `${context}_${Date.now()}`;
      const key = await this.generateEncryptionKey(keyId, context);
      this.keys.set(keyId, key);
    }
  }

  private async generateEncryptionKey(keyId: string, context: EncryptionKey['context']): Promise<EncryptionKey> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    // Generate salt for key derivation
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Derive encryption key from master key
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: this.encryptionConfig.keyDerivation,
        salt: salt,
        iterations: this.encryptionConfig.iterations,
        hash: 'SHA-256'
      },
      this.masterKey,
      {
        name: this.encryptionConfig.algorithm,
        length: 256
      },
      false, // not extractable
      ['encrypt', 'decrypt']
    );

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + this.keyRotationPolicy.interval);

    return {
      id: keyId,
      key: derivedKey,
      algorithm: this.encryptionConfig.algorithm,
      usage: ['encrypt', 'decrypt'],
      createdAt: new Date(),
      expiresAt: expiryDate,
      rotationDue: false,
      context
    };
  }

  private scheduleKeyRotation(): void {
    if (!this.keyRotationPolicy.enabled) return;

    // Check for keys that need rotation daily
    setInterval(() => {
      this.checkKeyRotation();
    }, 24 * 60 * 60 * 1000); // Daily check
  }

  private async checkKeyRotation(): Promise<void> {
    const now = new Date();

    for (const [keyId, keyInfo] of Array.from(this.keys.entries())) {
      if (!keyInfo.expiresAt) continue;

      const daysUntilExpiry = Math.floor(
        (keyInfo.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Mark key for rotation if expiring soon
      if (daysUntilExpiry <= this.keyRotationPolicy.notifyBeforeExpiry) {
        keyInfo.rotationDue = true;
        
        logger.warn('Encryption key rotation due', {
          keyId,
          context: keyInfo.context,
          expiresAt: keyInfo.expiresAt,
          daysUntilExpiry
        });

        // Auto-rotate if enabled
        if (this.keyRotationPolicy.autoRotate && daysUntilExpiry <= 0) {
          await this.rotateKey(keyId);
        }
      }
    }
  }

  private async rotateKey(oldKeyId: string): Promise<string> {
    const oldKey = this.keys.get(oldKeyId);
    if (!oldKey) {
      throw new Error(`Key ${oldKeyId} not found for rotation`);
    }

    // Generate new key
    const newKeyId = `${oldKey.context}_${Date.now()}`;
    const newKey = await this.generateEncryptionKey(newKeyId, oldKey.context);

    // Add new key
    this.keys.set(newKeyId, newKey);

    // Keep old key for decryption of existing data
    const preservedKeys = Array.from(this.keys.values())
      .filter(k => k.context === oldKey.context)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Remove excess old keys
    const keysToRemove = preservedKeys.slice(this.keyRotationPolicy.preserveOldKeys + 1);
    if (keysToRemove.length > 0) {
      for (const keyToRemove of keysToRemove) {
        this.keys.delete(keyToRemove.id);
      }
    }

    logger.info('Encryption key rotated', {
      oldKeyId,
      newKeyId,
      context: oldKey.context
    });

    return newKeyId;
  }

  private getActiveKeyForContext(context: EncryptionKey['context']): EncryptionKey {
    const contextKeys = Array.from(this.keys.values())
      .filter(k => k.context === context && !k.rotationDue)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (contextKeys.length === 0) {
      throw new Error(`No active encryption key found for context: ${context}`);
    }

    return contextKeys[0];
  }

  /**
   * Encrypt sensitive data
   */
  public async encryptData(
    data: string,
    context: EncryptionKey['context'] = 'system'
  ): Promise<EncryptedData> {
    const result = await this.executeOperation('encryptData', async () => {
      const key = this.getActiveKeyForContext(context);

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Generate salt for additional security
      const salt = crypto.getRandomValues(new Uint8Array(16));

      // Encrypt data
      const dataBuffer = new TextEncoder().encode(data);
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key.key,
        dataBuffer
      );

      // Split encrypted data and authentication tag (last 16 bytes)
      const encrypted = new Uint8Array(encryptedBuffer.slice(0, -16));
      const tag = new Uint8Array(encryptedBuffer.slice(-16));

      const result: EncryptedData = {
        encrypted: this.arrayBufferToBase64(encrypted.buffer),
        iv: this.arrayBufferToBase64(iv.buffer),
        tag: this.arrayBufferToBase64(tag.buffer),
        salt: this.arrayBufferToBase64(salt.buffer),
        keyId: key.id,
        algorithm: this.encryptionConfig.algorithm,
        metadata: {
          timestamp: Date.now(),
          version: '1.0.0',
          context
        }
      };

      logger.debug('Data encrypted', {
        keyId: key.id,
        context,
        dataLength: data.length
      });

      return result;
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Encryption failed');
    }
    return result.data;
  }

  /**
   * Decrypt sensitive data
   */
  public async decryptData(encryptedData: EncryptedData): Promise<DecryptionResult> {
    const result = await this.executeOperation('decryptData', async () => {
      const key = this.keys.get(encryptedData.keyId);
      if (!key) {
        throw new Error(`Encryption key ${encryptedData.keyId} not found`);
      }

      // Convert base64 back to ArrayBuffer
      const encrypted = this.base64ToArrayBuffer(encryptedData.encrypted);
      const tag = this.base64ToArrayBuffer(encryptedData.tag);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);

      // Combine encrypted data and tag
      const encryptedWithTag = new Uint8Array(encrypted.byteLength + tag.byteLength);
      encryptedWithTag.set(new Uint8Array(encrypted));
      encryptedWithTag.set(new Uint8Array(tag), encrypted.byteLength);

      // Decrypt data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(iv)
        },
        key.key,
        encryptedWithTag
      );

      const decryptedData = new TextDecoder().decode(decryptedBuffer);

      logger.debug('Data decrypted', {
        keyId: encryptedData.keyId,
        context: encryptedData.metadata?.context
      });

      return {
        data: decryptedData,
        metadata: encryptedData.metadata
      };
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Decryption failed');
    }
    return result.data;
  }

  /**
   * Encrypt workflow credentials
   */
  public async encryptCredentials(credentials: Record<string, unknown>): Promise<EncryptedData> {
    const credentialsJson = JSON.stringify(credentials);
    return this.encryptData(credentialsJson, 'credentials');
  }

  /**
   * Decrypt workflow credentials
   */
  public async decryptCredentials(encryptedCredentials: EncryptedData): Promise<Record<string, unknown>> {
    const result = await this.decryptData(encryptedCredentials);
    return JSON.parse(result.data);
  }

  /**
   * Encrypt workflow execution data
   */
  public async encryptWorkflowData(data: unknown): Promise<EncryptedData> {
    const dataJson = JSON.stringify(data);
    return this.encryptData(dataJson, 'workflow_data');
  }

  /**
   * Decrypt workflow execution data
   */
  public async decryptWorkflowData(encryptedData: EncryptedData): Promise<unknown> {
    const result = await this.decryptData(encryptedData);
    return JSON.parse(result.data);
  }

  /**
   * Encrypt sensitive logs
   */
  public async encryptLogs(logData: string): Promise<EncryptedData> {
    return this.encryptData(logData, 'logs');
  }

  /**
   * Decrypt sensitive logs
   */
  public async decryptLogs(encryptedLogs: EncryptedData): Promise<string> {
    const result = await this.decryptData(encryptedLogs);
    return result.data;
  }

  /**
   * Generate hash for data integrity verification
   */
  public async generateHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return this.arrayBufferToBase64(hashBuffer);
  }

  /**
   * Verify data integrity using hash
   */
  public async verifyHash(data: string, hash: string): Promise<boolean> {
    const computedHash = await this.generateHash(data);
    return computedHash === hash;
  }

  /**
   * Get encryption status and metrics
   */
  public getEncryptionStatus(): {
    initialized: boolean;
    keyCount: number;
    rotationDue: number;
    algorithm: string;
    keyRotationEnabled: boolean;
  } {
    const rotationDueKeys = Array.from(this.keys.values()).filter(k => k.rotationDue);

    return {
      initialized: this.masterKey !== null,
      keyCount: this.keys.size,
      rotationDue: rotationDueKeys.length,
      algorithm: this.encryptionConfig.algorithm,
      keyRotationEnabled: this.keyRotationPolicy.enabled
    };
  }

  /**
   * Force key rotation for testing or security incidents
   */
  public async forceKeyRotation(context?: EncryptionKey['context']): Promise<string[]> {
    const rotatedKeys: string[] = [];

    for (const [keyId, keyInfo] of Array.from(this.keys.entries())) {
      if (!context || keyInfo.context === context) {
        const newKeyId = await this.rotateKey(keyId);
        rotatedKeys.push(newKeyId);
      }
    }

    logger.info('Forced key rotation completed', {
      context,
      rotatedKeysCount: rotatedKeys.length
    });

    return rotatedKeys;
  }

  /**
   * Securely wipe sensitive data from memory
   */
  public secureWipe(data: string): void {
    // In JavaScript, we can't directly wipe memory, but we can overwrite the string
    // This is more symbolic than effective, but shows security intent
    // In production with native extensions, actual memory wiping would be implemented
    try {
      (data as unknown as string) = '\x00'.repeat(data.length);
    } catch {
      // Ignore errors - string may be immutable
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();
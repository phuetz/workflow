/**
 * Encryption Service
 * End-to-end encryption for sensitive data including credentials, workflow data, and logs
 */

import { logger } from './LoggingService';
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
  private config: EncryptionConfig;
  private keys: Map<string, EncryptionKey> = new Map();
  private masterKey: CryptoKey | null = null;
  private keyRotationPolicy: KeyRotationPolicy;

  constructor() {
    super('EncryptionService', {
      enableRetry: true,
      maxRetries: 1 // Encryption should not be retried on failure
    });

    this.config = {
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
        algorithm: this.config.algorithm,
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
    return encoder.encode(password).buffer;
  }

  private async loadOrCreateKeys(): Promise<void> {
    // Create default keys for different contexts
    const contexts: Array<EncryptionKey['context']> = ['credentials', 'workflow_data', 'logs', 'system'];
    
    for (const context of contexts) {
      this.keys.set(keyId, key);
    }
  }

  private async generateEncryptionKey(keyId: string, context: EncryptionKey['context']): Promise<EncryptionKey> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    // Generate salt for key derivation

    // Derive encryption key from master key
      {
        name: this.config.keyDerivation,
        salt: salt,
        iterations: this.config.iterations,
        hash: 'SHA-256'
      },
      this.masterKey,
      {
        name: this.config.algorithm,
        length: 256
      },
      false, // not extractable
      ['encrypt', 'decrypt']
    );

    expiryDate.setDate(expiryDate.getDate() + this.keyRotationPolicy.interval);

    return {
      id: keyId,
      key: derivedKey,
      algorithm: this.config.algorithm,
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
    
    for (const [keyId, keyInfo] of this.keys.entries()) {
      if (!keyInfo.expiresAt) continue;

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
    if (!oldKey) {
      throw new Error(`Key ${oldKeyId} not found for rotation`);
    }

    // Generate new key
    
    // Add new key
    this.keys.set(newKeyId, newKey);

    // Keep old key for decryption of existing data
      .filter(k => k.context === oldKey.context)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Remove excess old keys
    if (preservedKeys.length > this.keyRotationPolicy.preserveOldKeys + 1) {
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
    return this.executeOperation('encryptData', async () => {
      
      // Generate random IV
      
      // Generate salt for additional security
      
      // Encrypt data
      
        {
          name: this.config.algorithm,
          iv: iv
        },
        key.key,
        dataBuffer
      );

      // Split encrypted data and authentication tag

      const result: EncryptedData = {
        encrypted: this.arrayBufferToBase64(encrypted),
        iv: this.arrayBufferToBase64(iv),
        tag: this.arrayBufferToBase64(tag),
        salt: this.arrayBufferToBase64(salt),
        keyId: key.id,
        algorithm: this.config.algorithm,
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
  }

  /**
   * Decrypt sensitive data
   */
  public async decryptData(encryptedData: EncryptedData): Promise<DecryptionResult> {
    return this.executeOperation('decryptData', async () => {
      if (!key) {
        throw new Error(`Encryption key ${encryptedData.keyId} not found`);
      }

      // Convert base64 back to ArrayBuffer

      // Combine encrypted data and tag
      encryptedWithTag.set(new Uint8Array(encrypted));
      encryptedWithTag.set(new Uint8Array(tag), encrypted.byteLength);

      // Decrypt data
        {
          name: encryptedData.algorithm,
          iv: iv
        },
        key.key,
        encryptedWithTag
      );


      logger.debug('Data decrypted', {
        keyId: encryptedData.keyId,
        context: encryptedData.metadata?.context
      });

      return {
        data: decryptedData,
        metadata: encryptedData.metadata
      };
    });
  }

  /**
   * Encrypt workflow credentials
   */
  public async encryptCredentials(credentials: Record<string, unknown>): Promise<EncryptedData> {
    return this.encryptData(credentialsJson, 'credentials');
  }

  /**
   * Decrypt workflow credentials
   */
  public async decryptCredentials(encryptedCredentials: EncryptedData): Promise<Record<string, unknown>> {
    return JSON.parse(result.data);
  }

  /**
   * Encrypt workflow execution data
   */
  public async encryptWorkflowData(data: unknown): Promise<EncryptedData> {
    return this.encryptData(dataJson, 'workflow_data');
  }

  /**
   * Decrypt workflow execution data
   */
  public async decryptWorkflowData(encryptedData: EncryptedData): Promise<unknown> {
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
    return result.data;
  }

  /**
   * Generate hash for data integrity verification
   */
  public async generateHash(data: string): Promise<string> {
    return this.arrayBufferToBase64(hashBuffer);
  }

  /**
   * Verify data integrity using hash
   */
  public async verifyHash(data: string, hash: string): Promise<boolean> {
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
    
    return {
      initialized: this.masterKey !== null,
      keyCount: this.keys.size,
      rotationDue: rotationDueKeys.length,
      algorithm: this.config.algorithm,
      keyRotationEnabled: this.keyRotationPolicy.enabled
    };
  }

  /**
   * Force key rotation for testing or security incidents
   */
  public async forceKeyRotation(context?: EncryptionKey['context']): Promise<string[]> {
    const rotatedKeys: string[] = [];
    
    for (const [keyId, keyInfo] of this.keys.entries()) {
      if (!context || keyInfo.context === context) {
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
    for (let __i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    for (let __i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();
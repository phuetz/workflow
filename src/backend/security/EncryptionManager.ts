/**
 * Encryption Manager for securing sensitive data (Node.js version)
 * Handles encryption/decryption of credentials and sensitive information
 */

import * as crypto from 'crypto';
import { logger } from '../../services/SimpleLogger';

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag?: string;
  algorithm: string;
  version: number;
}

export interface EncryptionKey {
  id: string;
  key: Buffer;
  algorithm: string;
  createdAt: number;
  expiresAt?: number;
}

// In-memory storage for Node.js (use proper secure storage in production)
const keyStorage: Map<string, string> = new Map();

export class EncryptionManager {
  private masterKey: Buffer | null = null;
  private keys: Map<string, EncryptionKey> = new Map();
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly version = 1;

  constructor() {
    this.initializeEncryption();
  }

  /**
   * Initialize encryption with master key
   */
  private async initializeEncryption(): Promise<void> {
    try {
      // Try to load existing master key from secure storage
      const storedKey = await this.loadMasterKey();

      if (storedKey) {
        this.masterKey = storedKey;
        logger.debug('Master encryption key loaded successfully');
      } else {
        // Generate new master key
        this.masterKey = await this.generateKey();
        await this.storeMasterKey(this.masterKey);
        logger.debug('New master encryption key generated successfully');
      }
    } catch (error) {
      logger.error('Encryption initialization failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Generate a new encryption key
   */
  private async generateKey(): Promise<Buffer> {
    return crypto.randomBytes(this.keyLength);
  }

  /**
   * Encrypt data
   */
  async encrypt(data: string, keyId?: string): Promise<EncryptedData> {
    try {
      const key = keyId ? this.keys.get(keyId)?.key : this.masterKey;

      if (!key) {
        throw new Error('Encryption key not found');
      }

      // Generate random IV (Initialization Vector)
      const iv = crypto.randomBytes(12);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get auth tag for GCM
      const tag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        algorithm: this.algorithm,
        version: this.version
      };
    } catch (error) {
      logger.error('Encryption operation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedData: EncryptedData, keyId?: string): Promise<string> {
    try {
      const key = keyId ? this.keys.get(keyId)?.key : this.masterKey;

      if (!key) {
        throw new Error('Decryption key not found');
      }

      // Convert from base64
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const tag = encryptedData.tag ? Buffer.from(encryptedData.tag, 'base64') : undefined;

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

      if (tag) {
        decipher.setAuthTag(tag);
      }

      // Decrypt
      let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption operation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt object
   */
  async encryptObject<T extends Record<string, unknown>>(obj: T, keyId?: string): Promise<EncryptedData> {
    const jsonString = JSON.stringify(obj);
    return await this.encrypt(jsonString, keyId);
  }

  /**
   * Decrypt object
   */
  async decryptObject<T>(encryptedData: EncryptedData, keyId?: string): Promise<T> {
    const jsonString = await this.decrypt(encryptedData, keyId);
    return JSON.parse(jsonString) as T;
  }

  /**
   * Hash data (one-way)
   */
  async hash(data: string, algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha256'): Promise<string> {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Verify hash
   */
  async verifyHash(data: string, hash: string, algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha256'): Promise<boolean> {
    const computedHash = await this.hash(data, algorithm);
    return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));
  }

  /**
   * Generate HMAC for data integrity
   */
  async generateHMAC(data: string, secret: string): Promise<string> {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC
   */
  async verifyHMAC(data: string, hmac: string, secret: string): Promise<boolean> {
    const computedHMAC = await this.generateHMAC(data, secret);
    try {
      return crypto.timingSafeEqual(Buffer.from(computedHMAC), Buffer.from(hmac));
    } catch {
      return false;
    }
  }

  /**
   * Generate secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt credential data
   */
  async encryptCredential(credential: {
    type: string;
    data: Record<string, unknown>;
  }): Promise<{
    id: string;
    type: string;
    encrypted: EncryptedData;
    createdAt: string;
  }> {
    const id = this.generateToken(16);
    const encrypted = await this.encryptObject(credential.data);

    return {
      id,
      type: credential.type,
      encrypted,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Decrypt credential data
   */
  async decryptCredential(encryptedCredential: {
    encrypted: EncryptedData;
  }): Promise<Record<string, unknown>> {
    return await this.decryptObject(encryptedCredential.encrypted);
  }

  /**
   * Derive key from password (for user-specific encryption)
   */
  async deriveKeyFromPassword(password: string, salt?: Buffer): Promise<{
    key: Buffer;
    salt: Buffer;
  }> {
    // Generate or use provided salt
    const actualSalt = salt || crypto.randomBytes(16);

    // Derive key using PBKDF2
    const key = await new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2(password, actualSalt, 100000, this.keyLength, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });

    return { key, salt: actualSalt };
  }

  /**
   * Create data encryption key (for key rotation)
   */
  async createDataKey(id: string, expiresIn?: number): Promise<EncryptionKey> {
    const key = await this.generateKey();
    const createdAt = Date.now();
    const expiresAt = expiresIn ? createdAt + expiresIn : undefined;

    const encryptionKey: EncryptionKey = {
      id,
      key,
      algorithm: this.algorithm,
      createdAt,
      expiresAt
    };

    this.keys.set(id, encryptionKey);

    return encryptionKey;
  }

  /**
   * Rotate encryption key
   */
  async rotateKey(oldKeyId: string, newKeyId: string): Promise<void> {
    const oldKey = this.keys.get(oldKeyId);
    if (!oldKey) {
      throw new Error('Old key not found');
    }

    // Create new key
    await this.createDataKey(newKeyId);

    // Mark old key as expired
    oldKey.expiresAt = Date.now();
  }

  /**
   * Re-encrypt data with new key
   */
  async reencrypt(encryptedData: EncryptedData, oldKeyId: string, newKeyId: string): Promise<EncryptedData> {
    // Decrypt with old key
    const decrypted = await this.decrypt(encryptedData, oldKeyId);

    // Encrypt with new key
    return await this.encrypt(decrypted, newKeyId);
  }

  /**
   * Secure data erasure
   */
  secureErase(data: Buffer): void {
    // Overwrite with random data
    crypto.randomFillSync(data);
    // Overwrite with zeros
    data.fill(0);
  }

  /**
   * Store master key (in production, use secure key management service)
   */
  private async storeMasterKey(key: Buffer): Promise<void> {
    try {
      const keyData = key.toString('base64');
      const hash = await this.hash(keyData);
      // In production, store in secure key management service (AWS KMS, Azure Key Vault, etc.)
      keyStorage.set('_master_key', keyData);
      keyStorage.set('_master_key_hash', hash);
    } catch (error) {
      logger.error('Failed to store master key', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Load master key
   */
  private async loadMasterKey(): Promise<Buffer | null> {
    try {
      const keyData = keyStorage.get('_master_key');
      const storedHash = keyStorage.get('_master_key_hash');

      if (!keyData || !storedHash) {
        return null;
      }

      // Verify integrity
      const computedHash = await this.hash(keyData);
      if (computedHash !== storedHash) {
        logger.error('Master key integrity check failed');
        return null;
      }

      return Buffer.from(keyData, 'base64');
    } catch (error) {
      logger.error('Failed to load master key', { error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }

  /**
   * Clear all keys (for logout/security purposes)
   */
  clearKeys(): void {
    this.keys.clear();
    this.masterKey = null;
  }
}

// Export singleton instance
export const encryptionManager = new EncryptionManager();

/**
 * Encryption Handler
 * Handles all encryption/decryption operations for the vault
 */

import crypto from 'crypto';
import { EncryptedData } from './types';

export class EncryptionHandler {
  private encryptionKey: Buffer;
  private algorithm: string;
  private keyDerivationRounds: number;
  private keyVersion: number = 1;
  private previousKeys: Map<number, Buffer> = new Map();

  constructor(
    encryptionKey: Buffer,
    algorithm: string = 'aes-256-gcm',
    keyDerivationRounds: number = 100000
  ) {
    this.encryptionKey = encryptionKey;
    this.algorithm = algorithm;
    this.keyDerivationRounds = keyDerivationRounds;
  }

  /**
   * Derive a key from a password string
   */
  public deriveKey(password: string): Buffer {
    const salt = crypto.createHash('sha256').update('vault-salt').digest();
    return crypto.pbkdf2Sync(password, salt, this.keyDerivationRounds, 32, 'sha256');
  }

  /**
   * Generate a random encryption key
   */
  public static generateRandomKey(): Buffer {
    return crypto.randomBytes(32);
  }

  /**
   * Encrypt a plaintext string
   */
  public encrypt(text: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = (cipher as crypto.CipherGCM).getAuthTag();

    return {
      data: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: this.algorithm,
      timestamp: Date.now()
    };
  }

  /**
   * Decrypt encrypted data
   */
  public decrypt(encryptedData: EncryptedData): string {
    try {
      return this.decryptWithKey(encryptedData, this.encryptionKey);
    } catch {
      // Try with previous keys if decryption fails (for key rotation)
      for (const [, key] of this.previousKeys) {
        try {
          return this.decryptWithKey(encryptedData, key);
        } catch {
          // Continue trying other keys
        }
      }

      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Decrypt with a specific key
   */
  private decryptWithKey(encryptedData: EncryptedData, key: Buffer): string {
    const decipher = crypto.createDecipheriv(
      encryptedData.algorithm,
      key,
      Buffer.from(encryptedData.iv, 'hex')
    );

    (decipher as crypto.DecipherGCM).setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Rotate the encryption key
   */
  public rotateKey(): { newKeyVersion: number } {
    // Store current key as previous
    this.previousKeys.set(this.keyVersion, Buffer.from(this.encryptionKey));

    // Generate new key
    this.encryptionKey = crypto.randomBytes(32);
    this.keyVersion++;

    // Clean up old keys (keep last 3 versions)
    if (this.previousKeys.size > 3) {
      const oldestVersion = Math.min(...Array.from(this.previousKeys.keys()));
      this.previousKeys.delete(oldestVersion);
    }

    return { newKeyVersion: this.keyVersion };
  }

  /**
   * Re-encrypt data with current key
   */
  public reEncrypt(encryptedData: EncryptedData): EncryptedData {
    const decrypted = this.decrypt(encryptedData);
    return this.encrypt(decrypted);
  }

  /**
   * Get current key version
   */
  public getKeyVersion(): number {
    return this.keyVersion;
  }

  /**
   * Get algorithm
   */
  public getAlgorithm(): string {
    return this.algorithm;
  }

  /**
   * Encrypt data for export with a custom password
   */
  public encryptForExport(data: string, password: string): {
    iv: string;
    authTag: string;
    data: string;
  } {
    const exportKey = this.deriveKey(password);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, exportKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = (cipher as crypto.CipherGCM).getAuthTag();

    return {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted
    };
  }

  /**
   * Decrypt data from an import with a custom password
   */
  public decryptFromImport(
    data: string,
    password: string,
    iv: string,
    authTag: string,
    algorithm: string
  ): string {
    const exportKey = this.deriveKey(password);
    const decipher = crypto.createDecipheriv(
      algorithm,
      exportKey,
      Buffer.from(iv, 'hex')
    );

    (decipher as crypto.DecipherGCM).setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

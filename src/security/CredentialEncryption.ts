/**
 * Credential Encryption Service
 *
 * Provides AES-256-GCM encryption for sensitive credentials.
 * Implements industry-standard encryption with unique IV per credential
 * and authentication tags for integrity verification.
 *
 * Security Features:
 * - AES-256-GCM (Galois/Counter Mode)
 * - Unique IV (Initialization Vector) per credential
 * - Authentication tags for tamper detection
 * - Key derivation using scrypt
 * - Version prefix for future key rotation
 *
 * @module security/CredentialEncryption
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { logger } from '../services/SimpleLogger';

const scryptAsync = promisify(scrypt);

interface EncryptionResult {
  encrypted: string;
  version: string;
}

interface DecryptionResult {
  decrypted: string;
  version: string;
}

/**
 * Main encryption service for credentials
 */
export class CredentialEncryption {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly CURRENT_VERSION = 'v1';
  private readonly IV_LENGTH = 16; // 128 bits
  private readonly AUTH_TAG_LENGTH = 16; // 128 bits
  private readonly KEY_LENGTH = 32; // 256 bits

  private encryptionKeyCache: Map<string, Buffer> = new Map();

  /**
   * Derives encryption key from environment variables
   * Uses scrypt for key derivation (more secure than simple hashing)
   */
  private async getEncryptionKey(version: string = this.CURRENT_VERSION): Promise<Buffer> {
    // Check cache first
    const cached = this.encryptionKeyCache.get(version);
    if (cached) {
      return cached;
    }

    const encryptionKey = process.env.ENCRYPTION_KEY;
    const encryptionSalt = process.env.ENCRYPTION_SALT;

    if (!encryptionKey || !encryptionSalt) {
      throw new Error(
        'ENCRYPTION_KEY and ENCRYPTION_SALT environment variables must be set. ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }

    // Validate key and salt lengths
    if (encryptionKey.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters (16 bytes hex)');
    }

    if (encryptionSalt.length < 16) {
      throw new Error('ENCRYPTION_SALT must be at least 16 characters (8 bytes hex)');
    }

    try {
      // Derive key using scrypt (CPU-intensive, resistant to brute-force)
      const salt = Buffer.from(encryptionSalt, 'hex');
      const derivedKey = (await scryptAsync(
        encryptionKey,
        salt,
        this.KEY_LENGTH
      )) as Buffer;

      // Cache for performance
      this.encryptionKeyCache.set(version, derivedKey);

      return derivedKey;
    } catch (error) {
      throw new Error(`Failed to derive encryption key: ${(error as Error).message}`);
    }
  }

  /**
   * Encrypts credential data using AES-256-GCM
   *
   * @param data - Plain text data to encrypt
   * @returns Encrypted string in format: version:iv:encrypted:authTag
   *
   * @example
   * const encrypted = await encryption.encrypt(JSON.stringify({
   *   apiKey: 'secret-api-key',
   *   apiSecret: 'secret-api-secret'
   * }));
   * // Returns: "v1:a3f7b2c1d4e5f6a7:8b9c0d1e2f3a4b5c:4f5a6b7c8d9e0f1a"
   */
  async encrypt(data: string): Promise<string> {
    try {
      // Get encryption key
      const key = await this.getEncryptionKey();

      // Generate unique IV (Initialization Vector)
      const iv = randomBytes(this.IV_LENGTH);

      // Create cipher
      const cipher = createCipheriv(this.ALGORITHM, key, iv);

      // Encrypt data
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag (for integrity verification)
      const authTag = cipher.getAuthTag();

      // Return in format: version:iv:encrypted:authTag
      // This allows for key rotation by supporting multiple versions
      return `${this.CURRENT_VERSION}:${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Decrypts credential data encrypted with AES-256-GCM
   *
   * @param encryptedData - Encrypted string from encrypt()
   * @returns Decrypted plain text data
   *
   * @throws Error if authentication tag verification fails (data tampered)
   * @throws Error if encryption version is unsupported
   *
   * @example
   * const decrypted = await encryption.decrypt(
   *   "v1:a3f7b2c1d4e5f6a7:8b9c0d1e2f3a4b5c:4f5a6b7c8d9e0f1a"
   * );
   * // Returns: '{"apiKey":"secret-api-key","apiSecret":"secret-api-secret"}'
   */
  async decrypt(encryptedData: string): Promise<string> {
    try {
      // Parse encrypted data format: version:iv:encrypted:authTag
      const parts = encryptedData.split(':');

      if (parts.length !== 4) {
        throw new Error(
          'Invalid encrypted data format. Expected: version:iv:encrypted:authTag'
        );
      }

      const [version, ivHex, encrypted, authTagHex] = parts;

      // Validate version
      if (version !== this.CURRENT_VERSION) {
        // In future, support multiple versions for key rotation
        throw new Error(`Unsupported encryption version: ${version}`);
      }

      // Get encryption key for this version
      const key = await this.getEncryptionKey(version);

      // Parse IV and auth tag
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // Validate lengths
      if (iv.length !== this.IV_LENGTH) {
        throw new Error(`Invalid IV length: ${iv.length}, expected ${this.IV_LENGTH}`);
      }

      if (authTag.length !== this.AUTH_TAG_LENGTH) {
        throw new Error(`Invalid auth tag length: ${authTag.length}, expected ${this.AUTH_TAG_LENGTH}`);
      }

      // Create decipher
      const decipher = createDecipheriv(this.ALGORITHM, key, iv);

      // Set authentication tag (MUST be set before calling update/final)
      decipher.setAuthTag(authTag);

      // Decrypt data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // Authentication tag verification failure indicates tampering
      if ((error as Error).message.includes('Unsupported state or unable to authenticate data')) {
        throw new Error('Credential authentication failed - data may have been tampered with');
      }

      throw new Error(`Decryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Encrypts a credential object (convenience method)
   *
   * @param credential - Object containing credential data
   * @returns Encrypted string
   */
  async encryptCredential(credential: Record<string, unknown>): Promise<string> {
    const json = JSON.stringify(credential);
    return this.encrypt(json);
  }

  /**
   * Decrypts a credential object (convenience method)
   *
   * @param encryptedData - Encrypted string
   * @returns Decrypted credential object
   */
  async decryptCredential(encryptedData: string): Promise<Record<string, unknown>> {
    const decrypted = await this.decrypt(encryptedData);
    return JSON.parse(decrypted);
  }

  /**
   * Checks if data is encrypted (has version prefix)
   *
   * @param data - Data to check
   * @returns True if data appears to be encrypted
   */
  isEncrypted(data: string): boolean {
    // Check for version prefix (v1:, v2:, etc.)
    return /^v\d+:/.test(data);
  }

  /**
   * Validates encryption key setup
   *
   * @returns Object with validation results
   */
  async validateSetup(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check environment variables
    if (!process.env.ENCRYPTION_KEY) {
      errors.push('ENCRYPTION_KEY environment variable is not set');
    } else if (process.env.ENCRYPTION_KEY.length < 32) {
      errors.push('ENCRYPTION_KEY is too short (minimum 32 characters)');
    }

    if (!process.env.ENCRYPTION_SALT) {
      errors.push('ENCRYPTION_SALT environment variable is not set');
    } else if (process.env.ENCRYPTION_SALT.length < 16) {
      errors.push('ENCRYPTION_SALT is too short (minimum 16 characters)');
    }

    // Test encryption/decryption if keys are present
    if (errors.length === 0) {
      try {
        const testData = 'test-encryption-data';
        const encrypted = await this.encrypt(testData);
        const decrypted = await this.decrypt(encrypted);

        if (decrypted !== testData) {
          errors.push('Encryption/decryption test failed - data mismatch');
        }
      } catch (error) {
        errors.push(`Encryption/decryption test failed: ${(error as Error).message}`);
      }
    }

    // Warnings for production
    if (process.env.NODE_ENV === 'production') {
      if (process.env.ENCRYPTION_KEY === process.env.ENCRYPTION_SALT) {
        warnings.push('ENCRYPTION_KEY and ENCRYPTION_SALT should be different');
      }

      // Check if keys are hex-encoded (recommended)
      if (!/^[0-9a-fA-F]+$/.test(process.env.ENCRYPTION_KEY || '')) {
        warnings.push('ENCRYPTION_KEY should be hex-encoded for better randomness');
      }

      if (!/^[0-9a-fA-F]+$/.test(process.env.ENCRYPTION_SALT || '')) {
        warnings.push('ENCRYPTION_SALT should be hex-encoded for better randomness');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Clears encryption key cache (useful for key rotation)
   */
  clearKeyCache(): void {
    this.encryptionKeyCache.clear();
  }
}

// Singleton instance
let encryptionInstance: CredentialEncryption | null = null;

/**
 * Gets singleton instance of CredentialEncryption
 */
export function getCredentialEncryption(): CredentialEncryption {
  if (!encryptionInstance) {
    encryptionInstance = new CredentialEncryption();
  }
  return encryptionInstance;
}

/**
 * Helper function to generate encryption key and salt
 * Run with: node -e "require('./dist/security/CredentialEncryption').generateKeys()"
 */
export function generateKeys(): void {
  const key = randomBytes(32).toString('hex');
  const salt = randomBytes(16).toString('hex');

  logger.info('Generated Encryption Keys');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('Add these to your .env file:');
  logger.info(`ENCRYPTION_KEY=${key}`);
  logger.info(`ENCRYPTION_SALT=${salt}`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('IMPORTANT:');
  logger.info('1. Keep these keys SECRET - never commit to git');
  logger.info('2. Use different keys for dev/staging/production');
  logger.info('3. Store keys in secure key management system (e.g., AWS Secrets Manager)');
  logger.info('4. Backup keys securely - losing them means losing all encrypted data');
  logger.info('5. Rotate keys periodically (every 90 days recommended)');
}

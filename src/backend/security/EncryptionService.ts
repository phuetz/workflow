/**
 * Production-Ready Encryption Service
 * AES-256-GCM encryption with key derivation and rotation
 */

import crypto from 'crypto';
import { logger } from '../../services/SimpleLogger';

interface EncryptionConfig {
  algorithm: 'aes-256-gcm';
  keyDerivationIterations: number;
  saltLength: number;
  ivLength: number;
  authTagLength: number;
  keyRotationDays: number;
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  salt: string;
  keyVersion: number;
  algorithm: string;
}

interface EncryptionKey {
  id: string;
  key: Buffer;
  version: number;
  createdAt: Date;
  expiresAt: Date;
  active: boolean;
}

export class EncryptionService {
  private config: EncryptionConfig;
  private masterKey: Buffer | null = null;
  private encryptionKeys: Map<number, EncryptionKey> = new Map();
  private currentKeyVersion: number = 1;
  private initialized: boolean = false;

  constructor(config: Partial<EncryptionConfig> = {}) {
    this.config = {
      algorithm: 'aes-256-gcm',
      keyDerivationIterations: config.keyDerivationIterations || 100000,
      saltLength: config.saltLength || 32,
      ivLength: config.ivLength || 16,
      authTagLength: config.authTagLength || 16,
      keyRotationDays: config.keyRotationDays || 90
    };
  }

  /**
   * Initialize encryption service with master password
   */
  async initialize(masterPassword: string): Promise<void> {
    if (this.initialized) {
      logger.warn('EncryptionService already initialized');
      return;
    }

    try {
      // Derive master key from password
      const salt = process.env.ENCRYPTION_SALT || this.generateSalt();
      this.masterKey = await this.deriveKey(masterPassword, Buffer.from(salt, 'hex'));

      // Generate initial encryption key
      await this.generateEncryptionKey();

      this.initialized = true;
      logger.info('EncryptionService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize EncryptionService:', error);
      throw new Error('Encryption initialization failed');
    }
  }

  /**
   * Initialize with environment variable
   */
  async initializeFromEnv(): Promise<void> {
    const masterPassword = process.env.ENCRYPTION_MASTER_KEY;
    if (!masterPassword) {
      throw new Error('ENCRYPTION_MASTER_KEY environment variable not set');
    }

    await this.initialize(masterPassword);
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.masterKey !== null;
  }

  /**
   * Encrypt data with AES-256-GCM
   */
  async encrypt(plaintext: string | Buffer): Promise<EncryptedData> {
    if (!this.isInitialized()) {
      throw new Error('EncryptionService not initialized');
    }

    const plaintextBuffer = typeof plaintext === 'string'
      ? Buffer.from(plaintext, 'utf8')
      : plaintext;

    // Get current encryption key
    const encKey = this.encryptionKeys.get(this.currentKeyVersion);
    if (!encKey) {
      throw new Error('No active encryption key available');
    }

    // Generate random IV (Initialization Vector)
    const iv = crypto.randomBytes(this.config.ivLength);

    // Generate random salt for additional security
    const salt = crypto.randomBytes(this.config.saltLength);

    // Create cipher
    const cipher = crypto.createCipheriv(
      this.config.algorithm,
      encKey.key,
      iv,
      { authTagLength: this.config.authTagLength }
    );

    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(plaintextBuffer),
      cipher.final()
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    const result: EncryptedData = {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      salt: salt.toString('base64'),
      keyVersion: this.currentKeyVersion,
      algorithm: this.config.algorithm
    };

    return result;
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  async decrypt(encryptedData: EncryptedData): Promise<string> {
    if (!this.isInitialized()) {
      throw new Error('EncryptionService not initialized');
    }

    // Get encryption key for this data
    const encKey = this.encryptionKeys.get(encryptedData.keyVersion);
    if (!encKey) {
      throw new Error(`Encryption key version ${encryptedData.keyVersion} not found`);
    }

    // Convert from base64
    const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');

    // Create decipher
    const decipher = crypto.createDecipheriv(
      encryptedData.algorithm as crypto.CipherGCMTypes,
      encKey.key,
      iv,
      { authTagLength: this.config.authTagLength }
    );

    // Set authentication tag
    decipher.setAuthTag(authTag);

    try {
      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Decryption failed - data may be corrupted or tampered with');
    }
  }

  /**
   * Encrypt object (serializes to JSON first)
   */
  async encryptObject<T extends Record<string, unknown>>(obj: T): Promise<EncryptedData> {
    const json = JSON.stringify(obj);
    return this.encrypt(json);
  }

  /**
   * Decrypt object (deserializes from JSON)
   */
  async decryptObject<T extends Record<string, unknown>>(encryptedData: EncryptedData): Promise<T> {
    const json = await this.decrypt(encryptedData);
    return JSON.parse(json) as T;
  }

  /**
   * Hash data (one-way, for passwords, etc.)
   */
  async hash(data: string, salt?: string): Promise<{ hash: string; salt: string }> {
    const saltBuffer = salt
      ? Buffer.from(salt, 'hex')
      : crypto.randomBytes(this.config.saltLength);

    const hash = await this.deriveKey(data, saltBuffer);

    return {
      hash: hash.toString('hex'),
      salt: saltBuffer.toString('hex')
    };
  }

  /**
   * Verify hash
   */
  async verifyHash(data: string, hash: string, salt: string): Promise<boolean> {
    const computed = await this.hash(data, salt);
    return this.constantTimeCompare(computed.hash, hash);
  }

  /**
   * Generate new encryption key
   */
  async generateEncryptionKey(): Promise<EncryptionKey> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    // Generate key derivation salt
    const salt = crypto.randomBytes(this.config.saltLength);

    // Derive key from master key
    const key = await this.deriveKey(
      this.masterKey.toString('hex'),
      salt
    );

    const encryptionKey: EncryptionKey = {
      id: crypto.randomUUID(),
      key: key.slice(0, 32), // AES-256 requires 32 bytes
      version: this.currentKeyVersion,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.keyRotationDays * 24 * 60 * 60 * 1000),
      active: true
    };

    this.encryptionKeys.set(this.currentKeyVersion, encryptionKey);

    logger.info('New encryption key generated', {
      version: this.currentKeyVersion,
      expiresAt: encryptionKey.expiresAt
    });

    return encryptionKey;
  }

  /**
   * Rotate encryption keys
   */
  async rotateKeys(): Promise<void> {
    logger.info('Starting key rotation');

    // Mark current key as inactive
    const currentKey = this.encryptionKeys.get(this.currentKeyVersion);
    if (currentKey) {
      currentKey.active = false;
    }

    // Increment version and generate new key
    this.currentKeyVersion++;
    await this.generateEncryptionKey();

    logger.info('Key rotation completed', {
      newVersion: this.currentKeyVersion,
      totalKeys: this.encryptionKeys.size
    });
  }

  /**
   * Re-encrypt data with new key version
   */
  async reencrypt(oldEncryptedData: EncryptedData): Promise<EncryptedData> {
    // Decrypt with old key
    const plaintext = await this.decrypt(oldEncryptedData);

    // Encrypt with current key
    return this.encrypt(plaintext);
  }

  /**
   * Get encryption key statistics
   */
  getKeyStats(): {
    currentVersion: number;
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
  } {
    const now = new Date();
    let activeKeys = 0;
    let expiredKeys = 0;

    for (const key of this.encryptionKeys.values()) {
      if (key.expiresAt > now && key.active) {
        activeKeys++;
      } else {
        expiredKeys++;
      }
    }

    return {
      currentVersion: this.currentKeyVersion,
      totalKeys: this.encryptionKeys.size,
      activeKeys,
      expiredKeys
    };
  }

  /**
   * Cleanup expired keys
   */
  cleanupExpiredKeys(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [version, key] of this.encryptionKeys.entries()) {
      // Keep keys for 2x rotation period for re-encryption purposes
      const keepUntil = new Date(
        key.expiresAt.getTime() + (this.config.keyRotationDays * 2 * 24 * 60 * 60 * 1000)
      );

      if (now > keepUntil && !key.active) {
        this.encryptionKeys.delete(version);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} expired encryption keys`);
    }

    return cleaned;
  }

  // Private helper methods

  /**
   * Derive key using PBKDF2
   */
  private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        this.config.keyDerivationIterations,
        32, // 256 bits
        'sha512',
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        }
      );
    });
  }

  /**
   * Generate random salt
   */
  private generateSalt(): string {
    return crypto.randomBytes(this.config.saltLength).toString('hex');
  }

  /**
   * Constant-time comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Generate secure random token
   */
  async generateToken(bytes: number = 32): Promise<string> {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Generate API key with specific format
   */
  async generateAPIKey(prefix: string = 'sk'): Promise<string> {
    const randomPart = crypto.randomBytes(32).toString('base64url');
    return `${prefix}_${randomPart}`;
  }

  /**
   * Hash API key for storage
   */
  async hashAPIKey(apiKey: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    hash.update(apiKey);
    return hash.digest('hex');
  }

  /**
   * Verify API key
   */
  async verifyAPIKey(apiKey: string, storedHash: string): Promise<boolean> {
    const computedHash = await this.hashAPIKey(apiKey);
    return this.constantTimeCompare(computedHash, storedHash);
  }

  /**
   * Encrypt credential object - specifically designed for credential storage
   */
  async encryptCredential(credential: {
    type: string;
    name: string;
    data: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<EncryptedData & { credentialId: string }> {
    if (!this.isInitialized()) {
      throw new Error('EncryptionService not initialized');
    }

    // Add timestamp and validation
    const credentialWithMetadata = {
      ...credential,
      encryptedAt: new Date().toISOString(),
      metadata: {
        ...credential.metadata,
        encryptionVersion: this.currentKeyVersion,
        algorithm: this.config.algorithm
      }
    };

    // Validate sensitive fields are not logged
    const sanitizedData: Partial<typeof credentialWithMetadata> = { ...credentialWithMetadata };
    sanitizedData.data = undefined; // Never log actual credential data

    logger.info('Encrypting credential', sanitizedData);

    const encrypted = await this.encryptObject(credentialWithMetadata);

    return {
      ...encrypted,
      credentialId: crypto.randomUUID()
    };
  }

  /**
   * Decrypt credential object
   */
  async decryptCredential<T = Record<string, unknown>>(
    encryptedData: EncryptedData
  ): Promise<{
    type: string;
    name: string;
    data: T;
    metadata?: Record<string, unknown>;
    encryptedAt: string;
  }> {
    if (!this.isInitialized()) {
      throw new Error('EncryptionService not initialized');
    }

    const decrypted = await this.decryptObject<{
      type: string;
      name: string;
      data: T;
      metadata?: Record<string, unknown>;
      encryptedAt: string;
    }>(encryptedData);

    // Validate decrypted structure
    if (!decrypted.type || !decrypted.name || !decrypted.data) {
      throw new Error('Invalid credential structure after decryption');
    }

    return decrypted;
  }

  /**
   * Encrypt OAuth2 tokens separately (optimized for token refresh)
   */
  async encryptOAuth2Tokens(tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    scope?: string;
    tokenType?: string;
  }): Promise<EncryptedData> {
    if (!this.isInitialized()) {
      throw new Error('EncryptionService not initialized');
    }

    const tokenData = {
      ...tokens,
      encryptedAt: Date.now(),
      keyVersion: this.currentKeyVersion
    };

    return this.encryptObject(tokenData);
  }

  /**
   * Decrypt OAuth2 tokens
   */
  async decryptOAuth2Tokens(encryptedData: EncryptedData): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    scope?: string;
    tokenType?: string;
    encryptedAt: number;
  }> {
    if (!this.isInitialized()) {
      throw new Error('EncryptionService not initialized');
    }

    return this.decryptObject(encryptedData);
  }

  /**
   * Batch encrypt multiple credentials (for migration)
   */
  async batchEncryptCredentials(
    credentials: Array<{
      id: string;
      type: string;
      name: string;
      data: Record<string, unknown>;
    }>
  ): Promise<Map<string, EncryptedData & { credentialId: string }>> {
    const results = new Map<string, EncryptedData & { credentialId: string }>();
    const errors: Array<{ id: string; error: string }> = [];

    for (const cred of credentials) {
      try {
        const encrypted = await this.encryptCredential({
          type: cred.type,
          name: cred.name,
          data: cred.data
        });
        results.set(cred.id, encrypted);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ id: cred.id, error: errorMessage });
        logger.error(`Failed to encrypt credential ${cred.id}:`, error);
      }
    }

    if (errors.length > 0) {
      logger.warn(`Batch encryption completed with ${errors.length} errors`, errors);
    }

    return results;
  }

  /**
   * Check if credential needs re-encryption (key rotation)
   */
  needsReencryption(encryptedData: EncryptedData): boolean {
    return encryptedData.keyVersion < this.currentKeyVersion;
  }

  /**
   * Get encryption metadata for audit
   */
  getEncryptionMetadata(): {
    algorithm: string;
    currentKeyVersion: number;
    keyDerivationIterations: number;
    initialized: boolean;
    keyStats: ReturnType<EncryptionService['getKeyStats']>;
  } {
    return {
      algorithm: this.config.algorithm,
      currentKeyVersion: this.currentKeyVersion,
      keyDerivationIterations: this.config.keyDerivationIterations,
      initialized: this.initialized,
      keyStats: this.getKeyStats()
    };
  }

  /**
   * Destroy encryption service (clear sensitive data)
   */
  destroy(): void {
    if (this.masterKey) {
      this.masterKey.fill(0);
      this.masterKey = null;
    }

    for (const key of this.encryptionKeys.values()) {
      key.key.fill(0);
    }

    this.encryptionKeys.clear();
    this.initialized = false;

    logger.info('EncryptionService destroyed');
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();

// Auto-initialize from environment if available
if (process.env.ENCRYPTION_MASTER_KEY) {
  encryptionService.initializeFromEnv().catch(err => {
    logger.error('Failed to auto-initialize encryption service:', err);
  });
}

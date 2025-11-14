/**
 * Encryption Manager for securing sensitive data
 * Handles encryption/decryption of credentials and sensitive information
 */

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag?: string;
  algorithm: string;
  version: number;
}

export interface EncryptionKey {
  id: string;
  key: CryptoKey;
  algorithm: string;
  createdAt: number;
  expiresAt?: number;
}

export class EncryptionManager {
  private masterKey: CryptoKey | null = null;
  private keys: Map<string, EncryptionKey> = new Map();
  private readonly algorithm = 'AES-GCM';
  private readonly keyLength = 256;
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
        console.log('✅ Master encryption key loaded');
      } else {
        // Generate new master key
        this.masterKey = await this.generateKey();
        await this.storeMasterKey(this.masterKey);
        console.log('✅ New master encryption key generated');
      }
    } catch (error) {
      console.error('❌ Encryption initialization failed:', error);
      throw error;
    }
  }

  /**
   * Generate a new encryption key
   */
  private async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.algorithm,
        length: this.keyLength
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
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
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Convert data to bytes
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(data);

      // Encrypt
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        key,
        dataBytes
      );

      // Convert to base64 for storage
      const encryptedArray = new Uint8Array(encryptedBuffer);
      const encrypted = this.arrayBufferToBase64(encryptedArray);
      const ivBase64 = this.arrayBufferToBase64(iv);

      return {
        encrypted,
        iv: ivBase64,
        algorithm: this.algorithm,
        version: this.version
      };
    } catch (error) {
      console.error('❌ Encryption failed:', error);
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
      const encryptedBytes = this.base64ToArrayBuffer(encryptedData.encrypted);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);

      // Decrypt
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        key,
        encryptedBytes
      );

      // Convert bytes back to string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt object
   */
  async encryptObject<T extends Record<string, any>>(obj: T, keyId?: string): Promise<EncryptedData> {
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
  async hash(data: string, algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'): Promise<string> {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);

    const hashBuffer = await crypto.subtle.digest(algorithm, dataBytes);
    const hashArray = new Uint8Array(hashBuffer);

    return this.arrayBufferToHex(hashArray);
  }

  /**
   * Verify hash
   */
  async verifyHash(data: string, hash: string, algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'): Promise<boolean> {
    const computedHash = await this.hash(data, algorithm);
    return computedHash === hash;
  }

  /**
   * Generate HMAC for data integrity
   */
  async generateHMAC(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();

    // Import secret as key
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      {
        name: 'HMAC',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );

    // Generate HMAC
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(data)
    );

    return this.arrayBufferToHex(new Uint8Array(signature));
  }

  /**
   * Verify HMAC
   */
  async verifyHMAC(data: string, hmac: string, secret: string): Promise<boolean> {
    const computedHMAC = await this.generateHMAC(data, secret);
    return computedHMAC === hmac;
  }

  /**
   * Generate secure random token
   */
  generateToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return this.arrayBufferToHex(array);
  }

  /**
   * Encrypt credential data
   */
  async encryptCredential(credential: {
    type: string;
    data: Record<string, any>;
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
  }): Promise<Record<string, any>> {
    return await this.decryptObject(encryptedCredential.encrypted);
  }

  /**
   * Derive key from password (for user-specific encryption)
   */
  async deriveKeyFromPassword(password: string, salt?: Uint8Array): Promise<{
    key: CryptoKey;
    salt: Uint8Array;
  }> {
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);

    // Generate or use provided salt
    const actualSalt = salt || crypto.getRandomValues(new Uint8Array(16));

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive key using PBKDF2
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: actualSalt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: this.algorithm,
        length: this.keyLength
      },
      true,
      ['encrypt', 'decrypt']
    );

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
  secureErase(data: Uint8Array): void {
    // Overwrite with random data
    crypto.getRandomValues(data);
    // Overwrite with zeros
    data.fill(0);
  }

  /**
   * Helper: Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    const binary = Array.from(buffer)
      .map(byte => String.fromCharCode(byte))
      .join('');
    return btoa(binary);
  }

  /**
   * Helper: Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Helper: Convert ArrayBuffer to Hex
   */
  private arrayBufferToHex(buffer: Uint8Array): string {
    return Array.from(buffer)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Store master key (in production, use secure key management service)
   */
  private async storeMasterKey(key: CryptoKey): Promise<void> {
    try {
      const exported = await crypto.subtle.exportKey('jwk', key);
      // In production, store in secure key management service (AWS KMS, Azure Key Vault, etc.)
      // For now, using localStorage (NOT RECOMMENDED for production)
      const keyData = JSON.stringify(exported);
      const hash = await this.hash(keyData);
      localStorage.setItem('_master_key', keyData);
      localStorage.setItem('_master_key_hash', hash);
    } catch (error) {
      console.error('Failed to store master key:', error);
      throw error;
    }
  }

  /**
   * Load master key
   */
  private async loadMasterKey(): Promise<CryptoKey | null> {
    try {
      const keyData = localStorage.getItem('_master_key');
      const storedHash = localStorage.getItem('_master_key_hash');

      if (!keyData || !storedHash) {
        return null;
      }

      // Verify integrity
      const computedHash = await this.hash(keyData);
      if (computedHash !== storedHash) {
        console.error('Master key integrity check failed');
        return null;
      }

      const jwk = JSON.parse(keyData);
      return await crypto.subtle.importKey(
        'jwk',
        jwk,
        {
          name: this.algorithm,
          length: this.keyLength
        },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Failed to load master key:', error);
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

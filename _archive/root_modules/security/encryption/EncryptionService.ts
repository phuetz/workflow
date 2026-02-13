/**
 * Encryption Service
 * Advanced encryption, key management, and cryptographic operations
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';
import bcrypt from 'bcrypt';
import * as zlib from 'zlib';

export interface EncryptionConfig {
  defaultAlgorithm: 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';
  keyDerivation: {
    algorithm: 'pbkdf2' | 'scrypt' | 'argon2';
    iterations?: number;
    memory?: number;
    parallelism?: number;
    saltLength: number;
  };
  keyRotation: {
    enabled: boolean;
    intervalDays: number;
    keepOldKeys: number;
  };
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'deflate' | 'brotli';
  };
}

export interface EncryptionKey {
  id: string;
  algorithm: string;
  key: Buffer;
  salt?: Buffer;
  iv?: Buffer;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  metadata: Record<string, unknown>;
}

export interface EncryptedData {
  keyId: string;
  algorithm: string;
  data: string; // Base64 encoded
  iv: string; // Base64 encoded
  authTag?: string; // Base64 encoded (for authenticated encryption)
  salt?: string; // Base64 encoded
  metadata: {
    compressed: boolean;
    originalSize: number;
    encryptedAt: Date;
  };
}

export interface KeyDerivationOptions {
  password: string;
  salt?: Buffer;
  algorithm?: 'pbkdf2' | 'scrypt' | 'argon2';
  iterations?: number;
  memory?: number;
  parallelism?: number;
  keyLength?: number;
}

export interface DigitalSignature {
  algorithm: string;
  signature: string; // Base64 encoded
  publicKey: string; // Base64 encoded
  createdAt: Date;
}

export interface KeyPair {
  publicKey: string; // Base64 encoded
  privateKey: string; // Base64 encoded
  algorithm: string;
  keySize: number;
  createdAt: Date;
}

export class EncryptionService extends EventEmitter {
  private config: EncryptionConfig;
  private keys: Map<string, EncryptionKey> = new Map();
  private activeKeyId: string | null = null;
  private keyRotationTimer?: NodeJS.Timeout;
  
  constructor(config: EncryptionConfig) {
    super();
    this.config = config;
    this.initializeService();
  }
  
  private initializeService(): void {
    // Generate initial master key
    this.generateMasterKey();
    
    // Start key rotation if enabled
    if (this.config.keyRotation.enabled) {
      this.startKeyRotation();
    }
  }
  
  // Key Management
  
  public generateMasterKey(): string {
    const keyId = `key-${Date.now()}-${crypto.randomUUID()}`;
    const key = crypto.randomBytes(32); // 256-bit key
    
    const encryptionKey: EncryptionKey = {
      id: keyId,
      algorithm: this.config.defaultAlgorithm,
      key,
      createdAt: new Date(),
      isActive: true,
      metadata: { type: 'master', generated: true }
    };
    
    this.keys.set(keyId, encryptionKey);
    this.activeKeyId = keyId;
    
    this.emit('keyGenerated', {
      keyId,
      algorithm: this.config.defaultAlgorithm,
      type: 'master'
    });
    
    return keyId;
  }
  
  public async deriveKey(options: KeyDerivationOptions): Promise<string> {
    const salt = options.salt || crypto.randomBytes(this.config.keyDerivation.saltLength);
    const keyLength = options.keyLength || 32;
    let derivedKey: Buffer;
    
    switch (options.algorithm || this.config.keyDerivation.algorithm) {
      case 'pbkdf2':
        derivedKey = crypto.pbkdf2Sync(
          options.password,
          salt,
          options.iterations || this.config.keyDerivation.iterations || 100000,
          keyLength,
          'sha512'
        );
        break;
        
      case 'scrypt':
        derivedKey = crypto.scryptSync(
          options.password,
          salt,
          keyLength,
          {
            N: this.config.keyDerivation.iterations || 16384,
            r: 8,
            p: this.config.keyDerivation.parallelism || 1,
            maxmem: this.config.keyDerivation.memory || 32 * 1024 * 1024
          }
        );
        break;
        
      case 'argon2':
        // Note: This would require the argon2 package
        // For now, fallback to scrypt
        derivedKey = crypto.scryptSync(
          options.password,
          salt,
          keyLength,
          {
            N: this.config.keyDerivation.iterations || 16384,
            r: 8,
            p: this.config.keyDerivation.parallelism || 1
          }
        );
        break;
        
      default:
        throw new Error(`Unsupported key derivation algorithm: ${options.algorithm}`);
    }
    
    const keyId = `derived-${Date.now()}-${crypto.randomUUID()}`;
    const encryptionKey: EncryptionKey = {
      id: keyId,
      algorithm: this.config.defaultAlgorithm,
      key: derivedKey,
      salt,
      createdAt: new Date(),
      isActive: true,
      metadata: {
        type: 'derived',
        derivationAlgorithm: options.algorithm || this.config.keyDerivation.algorithm
      }
    };
    
    this.keys.set(keyId, encryptionKey);
    
    this.emit('keyDerived', {
      keyId,
      algorithm: options.algorithm || this.config.keyDerivation.algorithm
    });
    
    return keyId;
  }
  
  public rotateKeys(): string {
    // Deactivate current active key
    if (this.activeKeyId) {
      const currentKey = this.keys.get(this.activeKeyId);
      if (currentKey) {
        currentKey.isActive = false;
        currentKey.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      }
    }
    
    // Generate new master key
    const newKeyId = this.generateMasterKey();
    
    // Clean up old keys if necessary
    this.cleanupOldKeys();
    
    this.emit('keysRotated', {
      oldKeyId: this.activeKeyId,
      newKeyId
    });
    
    return newKeyId;
  }
  
  private cleanupOldKeys(): void {
    const keys = Array.from(this.keys.values())
      .filter(key => !key.isActive)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (keys.length > this.config.keyRotation.keepOldKeys) {
      const keysToDelete = keys.slice(this.config.keyRotation.keepOldKeys);
      
      for (const key of keysToDelete) {
        this.keys.delete(key.id);
        this.emit('keyDeleted', { keyId: key.id });
      }
    }
  }
  
  private startKeyRotation(): void {
    const intervalMs = this.config.keyRotation.intervalDays * 24 * 60 * 60 * 1000;
    
    this.keyRotationTimer = setInterval(() => {
      this.rotateKeys();
    }, intervalMs);
  }
  
  public stopKeyRotation(): void {
    if (this.keyRotationTimer) {
      clearInterval(this.keyRotationTimer);
      this.keyRotationTimer = undefined;
    }
  }
  
  // Encryption/Decryption
  
  public async encrypt(
    data: string | Buffer,
    keyId?: string,
    algorithm?: string
  ): Promise<EncryptedData> {
    const useKeyId = keyId || this.activeKeyId;
    if (!useKeyId) {
      throw new Error('No encryption key available');
    }
    
    const key = this.keys.get(useKeyId);
    if (!key) {
      throw new Error('Encryption key not found');
    }
    
    const useAlgorithm = algorithm || key.algorithm;
    let inputData = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    const originalSize = inputData.length;
    let compressed = false;
    
    // Compression if enabled and beneficial
    if (this.config.compression.enabled && inputData.length > 1024) {
      const compressedData = this.compressData(inputData);
      if (compressedData.length < inputData.length * 0.9) { // Only compress if >10% savings
        inputData = compressedData;
        compressed = true;
      }
    }
    
    let encryptedData: Buffer;
    let iv: Buffer;
    let authTag: Buffer | undefined;
    
    switch (useAlgorithm) {
      case 'aes-256-gcm': {
        iv = crypto.randomBytes(12); // 96-bit IV for GCM
        const gcmCipher = crypto.createCipher('aes-256-gcm', key.key);
        gcmCipher.setAAD(Buffer.from(useKeyId)); // Additional authenticated data
        encryptedData = Buffer.concat([
          gcmCipher.update(inputData),
          gcmCipher.final()
        ]);
        authTag = gcmCipher.getAuthTag();
        break;
      }
        
      case 'aes-256-cbc': {
        iv = crypto.randomBytes(16); // 128-bit IV for CBC
        const cbcCipher = crypto.createCipheriv('aes-256-cbc', key.key, iv);
        encryptedData = Buffer.concat([
          cbcCipher.update(inputData),
          cbcCipher.final()
        ]);
        break;
      }
        
      case 'chacha20-poly1305': {
        iv = crypto.randomBytes(12); // 96-bit nonce for ChaCha20-Poly1305
        const chachaCipher = crypto.createCipheriv('chacha20-poly1305', key.key, iv);
        chachaCipher.setAAD(Buffer.from(useKeyId));
        encryptedData = Buffer.concat([
          chachaCipher.update(inputData),
          chachaCipher.final()
        ]);
        authTag = chachaCipher.getAuthTag();
        break;
      }
        
      default:
        throw new Error(`Unsupported encryption algorithm: ${useAlgorithm}`);
    }
    
    const result: EncryptedData = {
      keyId: useKeyId,
      algorithm: useAlgorithm,
      data: encryptedData.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag?.toString('base64'),
      salt: key.salt?.toString('base64'),
      metadata: {
        compressed,
        originalSize,
        encryptedAt: new Date()
      }
    };
    
    this.emit('dataEncrypted', {
      keyId: useKeyId,
      algorithm: useAlgorithm,
      originalSize,
      encryptedSize: encryptedData.length,
      compressed
    });
    
    return result;
  }
  
  public async decrypt(encryptedData: EncryptedData): Promise<Buffer> {
    const key = this.keys.get(encryptedData.keyId);
    if (!key) {
      throw new Error('Decryption key not found');
    }
    
    const data = Buffer.from(encryptedData.data, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = encryptedData.authTag ? Buffer.from(encryptedData.authTag, 'base64') : undefined;
    
    let decryptedData: Buffer;
    
    switch (encryptedData.algorithm) {
      case 'aes-256-gcm': {
        if (!authTag) {
          throw new Error('Authentication tag required for GCM decryption');
        }
        const gcmDecipher = crypto.createDecipheriv('aes-256-gcm', key.key, iv);
        gcmDecipher.setAAD(Buffer.from(encryptedData.keyId));
        gcmDecipher.setAuthTag(authTag);
        decryptedData = Buffer.concat([
          gcmDecipher.update(data),
          gcmDecipher.final()
        ]);
        break;
      }
        
      case 'aes-256-cbc': {
        const cbcDecipher = crypto.createDecipheriv('aes-256-cbc', key.key, iv);
        decryptedData = Buffer.concat([
          cbcDecipher.update(data),
          cbcDecipher.final()
        ]);
        break;
      }
        
      case 'chacha20-poly1305': {
        if (!authTag) {
          throw new Error('Authentication tag required for ChaCha20-Poly1305 decryption');
        }
        const chachaDecipher = crypto.createDecipheriv('chacha20-poly1305', key.key, iv);
        chachaDecipher.setAAD(Buffer.from(encryptedData.keyId));
        chachaDecipher.setAuthTag(authTag);
        decryptedData = Buffer.concat([
          chachaDecipher.update(data),
          chachaDecipher.final()
        ]);
        break;
      }
        
      default:
        throw new Error(`Unsupported decryption algorithm: ${encryptedData.algorithm}`);
    }
    
    // Decompress if needed
    if (encryptedData.metadata.compressed) {
      decryptedData = this.decompressData(decryptedData);
    }
    
    this.emit('dataDecrypted', {
      keyId: encryptedData.keyId,
      algorithm: encryptedData.algorithm,
      decryptedSize: decryptedData.length
    });
    
    return decryptedData;
  }
  
  // Hashing
  
  public hash(data: string | Buffer, algorithm: string = 'sha256'): string {
    const hash = crypto.createHash(algorithm);
    hash.update(data);
    return hash.digest('hex');
  }
  
  public async hashPassword(password: string, rounds: number = 12): Promise<string> {
    return await bcrypt.hash(password, rounds);
  }
  
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }
  
  public hmac(data: string | Buffer, secret: string | Buffer, algorithm: string = 'sha256'): string {
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(data);
    return hmac.digest('hex');
  }
  
  // Digital Signatures
  
  public generateKeyPair(algorithm: 'rsa' | 'ec' = 'rsa', keySize: number = 2048): KeyPair {
    let keyPair: crypto.KeyPairSyncResult<string, string>;
    
    switch (algorithm) {
      case 'rsa':
        keyPair = crypto.generateKeyPairSync('rsa', {
          modulusLength: keySize,
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          }
        });
        break;
        
      case 'ec':
        keyPair = crypto.generateKeyPairSync('ec', {
          namedCurve: keySize === 256 ? 'secp256k1' : 'secp384r1',
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          }
        });
        break;
        
      default:
        throw new Error(`Unsupported key pair algorithm: ${algorithm}`);
    }
    
    return {
      publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
      privateKey: Buffer.from(keyPair.privateKey).toString('base64'),
      algorithm,
      keySize,
      createdAt: new Date()
    };
  }
  
  public sign(
    data: string | Buffer,
    privateKey: string,
    algorithm: string = 'sha256'
  ): DigitalSignature {
    const privateKeyPem = Buffer.from(privateKey, 'base64').toString();
    const sign = crypto.createSign(`${algorithm}WithRSA`);
    sign.update(data);
    const signature = sign.sign(privateKeyPem, 'base64');
    
    // Extract public key from private key
    const privateKeyObj = crypto.createPrivateKey(privateKeyPem);
    const publicKeyPem = crypto.createPublicKey(privateKeyObj).export({
      type: 'spki',
      format: 'pem'
    }) as string;
    
    return {
      algorithm: `${algorithm}WithRSA`,
      signature,
      publicKey: Buffer.from(publicKeyPem).toString('base64'),
      createdAt: new Date()
    };
  }
  
  public verify(
    data: string | Buffer,
    signature: DigitalSignature
  ): boolean {
    try {
      const publicKeyPem = Buffer.from(signature.publicKey, 'base64').toString();
      const verify = crypto.createVerify(signature.algorithm);
      verify.update(data);
      return verify.verify(publicKeyPem, signature.signature, 'base64');
    } catch {
      return false;
    }
  }
  
  // Secure Random Generation
  
  public generateSecureRandom(length: number): string {
    return crypto.randomBytes(length).toString('hex');
  }
  
  public generateSecureRandomBase64(length: number): string {
    return crypto.randomBytes(length).toString('base64');
  }
  
  public generateUUID(): string {
    return crypto.randomUUID();
  }
  
  // Key Exchange
  
  public generateDiffieHellmanKeys(): {
    publicKey: string;
    privateKey: string;
  } {
    const dh = crypto.createDiffieHellman(2048);
    dh.generateKeys();
    
    return {
      publicKey: dh.getPublicKey('base64'),
      privateKey: dh.getPrivateKey('base64')
    };
  }
  
  public computeSharedSecret(
    publicKey: string,
    privateKey: string
  ): string {
    const dh = crypto.createDiffieHellman(2048);
    dh.setPrivateKey(Buffer.from(privateKey, 'base64'));
    const sharedSecret = dh.computeSecret(Buffer.from(publicKey, 'base64'));
    return sharedSecret.toString('base64');
  }
  
  // Compression Utilities
  
  private compressData(data: Buffer): Buffer {
    switch (this.config.compression.algorithm) {
      case 'gzip':
        return zlib.gzipSync(data);
      case 'deflate':
        return zlib.deflateSync(data);
      case 'brotli':
        return zlib.brotliCompressSync(data);
      default:
        return data;
    }
  }
  
  private decompressData(data: Buffer): Buffer {
    switch (this.config.compression.algorithm) {
      case 'gzip':
        return zlib.gunzipSync(data);
      case 'deflate':
        return zlib.inflateSync(data);
      case 'brotli':
        return zlib.brotliDecompressSync(data);
      default:
        return data;
    }
  }
  
  // Secure Storage
  
  public async encryptAndStore(
    data: unknown,
    keyId?: string
  ): Promise<string> {
    const serialized = JSON.stringify(data);
    const encrypted = await this.encrypt(serialized, keyId);
    return Buffer.from(JSON.stringify(encrypted)).toString('base64');
  }
  
  public async retrieveAndDecrypt(encryptedBlob: string): Promise<unknown> {
    const encryptedData: EncryptedData = JSON.parse(
      Buffer.from(encryptedBlob, 'base64').toString()
    );
    const decrypted = await this.decrypt(encryptedData);
    return JSON.parse(decrypted.toString());
  }
  
  // Utility Methods
  
  public getActiveKeyId(): string | null {
    return this.activeKeyId;
  }
  
  public getKey(keyId: string): EncryptionKey | undefined {
    return this.keys.get(keyId);
  }
  
  public getAllKeys(): EncryptionKey[] {
    return Array.from(this.keys.values());
  }
  
  public getActiveKeys(): EncryptionKey[] {
    return Array.from(this.keys.values()).filter(key => key.isActive);
  }
  
  public deleteKey(keyId: string): void {
    if (keyId === this.activeKeyId) {
      throw new Error('Cannot delete active key');
    }
    
    const key = this.keys.get(keyId);
    if (key) {
      this.keys.delete(keyId);
      this.emit('keyDeleted', { keyId });
    }
  }
  
  public getStats(): {
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    keyRotationEnabled: boolean;
    defaultAlgorithm: string;
  } {
    const keys = Array.from(this.keys.values());
    const now = new Date();
    
    return {
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.isActive).length,
      expiredKeys: keys.filter(k => k.expiresAt && k.expiresAt < now).length,
      keyRotationEnabled: this.config.keyRotation.enabled,
      defaultAlgorithm: this.config.defaultAlgorithm
    };
  }
  
  // Cleanup
  
  public destroy(): void {
    this.stopKeyRotation();
    
    // Clear all keys from memory
    for (const key of this.keys.values()) {
      key.key.fill(0); // Zero out key material
    }
    
    this.keys.clear();
    this.activeKeyId = null;
    
    this.emit('serviceDestroyed');
  }
}
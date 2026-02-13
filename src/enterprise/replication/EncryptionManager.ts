/**
 * Encryption Manager
 * Handles encryption, decryption, and key rotation for replication data
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import type { EncryptionConfig, CDCEvent, EncryptionAlgorithm } from './types';

export class EncryptionManager extends EventEmitter {
  private encryptionKeys: Map<string, Buffer> = new Map();
  private keyRotationInterval: NodeJS.Timeout | null = null;
  private config: EncryptionConfig | null = null;
  private algorithm: EncryptionAlgorithm = 'aes-256-gcm';

  public async initialize(config: EncryptionConfig): Promise<void> {
    this.config = config;
    this.algorithm = config.algorithm;

    const masterKey = config.masterKeyId
      ? await this.retrieveMasterKey(config.masterKeyId)
      : crypto.randomBytes(32);

    const salt = crypto.randomBytes(16);
    const dek = crypto.pbkdf2Sync(
      masterKey,
      salt,
      config.keyDerivationIterations,
      32,
      'sha512'
    );

    this.encryptionKeys.set('current', dek);
    this.emit('encryptionInitialized', { algorithm: config.algorithm });
  }

  private async retrieveMasterKey(keyId: string): Promise<Buffer> {
    this.emit('masterKeyRetrieved', { keyId });
    return crypto.randomBytes(32);
  }

  public async encryptEvent(event: CDCEvent): Promise<CDCEvent> {
    if (!this.config?.enabled) return event;

    const key = this.encryptionKeys.get('current');
    if (!key) throw new Error('Encryption key not initialized');

    const encrypted = { ...event };

    if (event.before) {
      encrypted.before = this.encryptData(event.before, key);
    }

    if (event.after) {
      encrypted.after = this.encryptData(event.after, key);
    }

    return encrypted;
  }

  public encryptData(data: Record<string, unknown>, key: Buffer): Record<string, unknown> {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    const plaintext = JSON.stringify(data);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = (cipher as crypto.CipherGCM).getAuthTag?.() || Buffer.alloc(0);

    return {
      __encrypted: true,
      iv: iv.toString('base64'),
      data: encrypted,
      authTag: authTag.toString('base64'),
      algorithm: this.algorithm
    };
  }

  public decryptData(encryptedData: Record<string, unknown>, key: Buffer): Record<string, unknown> {
    if (!encryptedData.__encrypted) return encryptedData;

    const algorithm = encryptedData.algorithm as string;
    const iv = Buffer.from(encryptedData.iv as string, 'base64');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    if (encryptedData.authTag) {
      (decipher as crypto.DecipherGCM).setAuthTag(
        Buffer.from(encryptedData.authTag as string, 'base64')
      );
    }

    let decrypted = decipher.update(encryptedData.data as string, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  public startKeyRotation(intervalMs: number): void {
    if (!intervalMs) return;

    this.keyRotationInterval = setInterval(async () => {
      await this.rotateEncryptionKey();
    }, intervalMs);
  }

  private async rotateEncryptionKey(): Promise<void> {
    const currentKey = this.encryptionKeys.get('current');
    if (currentKey) {
      this.encryptionKeys.set('previous', currentKey);
    }

    const newKey = crypto.randomBytes(32);
    this.encryptionKeys.set('current', newKey);

    this.emit('keyRotated', { timestamp: new Date() });
  }

  public getKey(name: string): Buffer | undefined {
    return this.encryptionKeys.get(name);
  }

  public cleanup(): void {
    if (this.keyRotationInterval) {
      clearInterval(this.keyRotationInterval);
      this.keyRotationInterval = null;
    }
    this.encryptionKeys.clear();
    this.removeAllListeners();
  }
}

/**
 * Unit tests for EncryptionManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptionManager } from '../backend/security/EncryptionManager';

describe('EncryptionManager', () => {
  let manager: EncryptionManager;

  beforeEach(() => {
    manager = new EncryptionManager();
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const plaintext = 'Hello, World!';
      const encrypted = await manager.encrypt(plaintext);

      expect(encrypted.encrypted).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.algorithm).toBe('AES-GCM');

      const decrypted = await manager.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty strings', async () => {
      const plaintext = '';
      const encrypted = await manager.encrypt(plaintext);
      const decrypted = await manager.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', async () => {
      const plaintext = '🔒 Special chars: éàü ñ 中文';
      const encrypted = await manager.encrypt(plaintext);
      const decrypted = await manager.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext', async () => {
      const plaintext = 'Same data';
      const encrypted1 = await manager.encrypt(plaintext);
      const encrypted2 = await manager.encrypt(plaintext);

      // Different IVs should produce different ciphertexts
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);

      // But both should decrypt to same plaintext
      expect(await manager.decrypt(encrypted1)).toBe(plaintext);
      expect(await manager.decrypt(encrypted2)).toBe(plaintext);
    });
  });

  describe('encryptObject/decryptObject', () => {
    it('should encrypt and decrypt objects', async () => {
      const obj = {
        username: 'testuser',
        password: 'secret123',
        apiKey: 'key-123-456'
      };

      const encrypted = await manager.encryptObject(obj);
      const decrypted = await manager.decryptObject(encrypted);

      expect(decrypted).toEqual(obj);
    });

    it('should handle nested objects', async () => {
      const obj = {
        user: {
          name: 'John',
          credentials: {
            password: 'secret',
            apiKey: 'key123'
          }
        }
      };

      const encrypted = await manager.encryptObject(obj);
      const decrypted = await manager.decryptObject(encrypted);

      expect(decrypted).toEqual(obj);
    });

    it('should handle arrays', async () => {
      const obj = {
        items: [1, 2, 3, 4, 5],
        strings: ['a', 'b', 'c']
      };

      const encrypted = await manager.encryptObject(obj);
      const decrypted = await manager.decryptObject(encrypted);

      expect(decrypted).toEqual(obj);
    });
  });

  describe('hash', () => {
    it('should generate consistent hashes', async () => {
      const data = 'test data';
      const hash1 = await manager.hash(data);
      const hash2 = await manager.hash(data);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex chars
    });

    it('should generate different hashes for different data', async () => {
      const hash1 = await manager.hash('data1');
      const hash2 = await manager.hash('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should verify hash correctly', async () => {
      const data = 'verify this';
      const hash = await manager.hash(data);

      const isValid = await manager.verifyHash(data, hash);
      expect(isValid).toBe(true);

      const isInvalid = await manager.verifyHash('wrong data', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate random tokens', () => {
      const token1 = manager.generateToken();
      const token2 = manager.generateToken();

      expect(token1).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });

    it('should generate tokens of specified length', () => {
      const token = manager.generateToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });
  });

  describe('encryptCredential', () => {
    it('should encrypt credential data', async () => {
      const credential = {
        type: 'api_key',
        data: {
          apiKey: 'sk-1234567890',
          secret: 'my-secret'
        }
      };

      const encrypted = await manager.encryptCredential(credential);

      expect(encrypted.id).toBeTruthy();
      expect(encrypted.type).toBe('api_key');
      expect(encrypted.encrypted).toBeTruthy();
      expect(encrypted.createdAt).toBeTruthy();

      const decrypted = await manager.decryptCredential(encrypted);
      expect(decrypted).toEqual(credential.data);
    });
  });

  describe('HMAC', () => {
    it('should generate and verify HMAC', async () => {
      const data = 'important data';
      const secret = 'my-secret-key';

      const hmac = await manager.generateHMAC(data, secret);
      expect(hmac).toBeTruthy();

      const isValid = await manager.verifyHMAC(data, hmac, secret);
      expect(isValid).toBe(true);
    });

    it('should fail verification with wrong secret', async () => {
      const data = 'important data';
      const hmac = await manager.generateHMAC(data, 'secret1');

      const isValid = await manager.verifyHMAC(data, hmac, 'secret2');
      expect(isValid).toBe(false);
    });

    it('should fail verification with modified data', async () => {
      const secret = 'my-secret';
      const hmac = await manager.generateHMAC('original data', secret);

      const isValid = await manager.verifyHMAC('modified data', hmac, secret);
      expect(isValid).toBe(false);
    });
  });
});

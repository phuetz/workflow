/**
 * Credential Security Test Suite
 *
 * Comprehensive tests for AES-256-GCM credential encryption
 * Tests cover: encryption, decryption, key rotation, repository, API routes
 *
 * @group security
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient, CredentialType } from '@prisma/client';
import { getCredentialEncryption } from '../../security/CredentialEncryption';
import { getCredentialRepository, CredentialInput } from '../../backend/repositories/CredentialRepository';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();
const encryption = getCredentialEncryption();
const repository = getCredentialRepository();

// Test data
const testUserId = 'test-user-id';
const testCredentialData = {
  apiKey: 'sk_test_123456789',
  apiSecret: 'secret_abc123xyz',
  username: 'testuser@example.com',
  password: 'SuperSecret123!',
  token: 'token_xyz789abc'
};

describe('Credential Encryption Security Tests', () => {
  beforeAll(async () => {
    // Ensure encryption keys are set
    if (!process.env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex');
    }
    if (!process.env.ENCRYPTION_SALT) {
      process.env.ENCRYPTION_SALT = randomBytes(16).toString('hex');
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.credential.deleteMany({
      where: { userId: testUserId }
    });
    await prisma.$disconnect();
  });

  describe('1. CredentialEncryption Service', () => {
    it('1.1 should validate encryption setup correctly', async () => {
      const validation = await encryption.validateSetup();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('1.2 should encrypt credential data using AES-256-GCM', async () => {
      const encrypted = await encryption.encryptCredential(testCredentialData);

      // Should be a string with format: version:iv:encrypted:authTag
      expect(typeof encrypted).toBe('string');
      expect(encrypted).toContain(':');

      // Should start with version
      expect(encrypted.startsWith('v1:')).toBe(true);

      // Should have all parts
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe('v1'); // version
      expect(parts[1]).toHaveLength(32); // IV (16 bytes hex = 32 chars)
      expect(parts[2].length).toBeGreaterThan(0); // encrypted data
      expect(parts[3]).toHaveLength(32); // auth tag (16 bytes hex = 32 chars)
    });

    it('1.3 should decrypt credential data correctly', async () => {
      const encrypted = await encryption.encryptCredential(testCredentialData);
      const decrypted = await encryption.decrypt(encrypted);

      const parsedData = JSON.parse(decrypted);
      expect(parsedData).toEqual(testCredentialData);
    });

    it('1.4 should produce different ciphertexts for same data (unique IVs)', async () => {
      const encrypted1 = await encryption.encryptCredential(testCredentialData);
      const encrypted2 = await encryption.encryptCredential(testCredentialData);

      // Different ciphertexts
      expect(encrypted1).not.toBe(encrypted2);

      // But both decrypt to same data
      const decrypted1 = JSON.parse(await encryption.decrypt(encrypted1));
      const decrypted2 = JSON.parse(await encryption.decrypt(encrypted2));
      expect(decrypted1).toEqual(decrypted2);
    });

    it('1.5 should fail decryption with tampered ciphertext', async () => {
      const encrypted = await encryption.encryptCredential(testCredentialData);

      // Tamper with the ciphertext
      const parts = encrypted.split(':');
      parts[2] = parts[2].replace('a', 'b'); // Modify encrypted data
      const tampered = parts.join(':');

      await expect(encryption.decrypt(tampered)).rejects.toThrow();
    });

    it('1.6 should fail decryption with tampered auth tag', async () => {
      const encrypted = await encryption.encryptCredential(testCredentialData);

      // Tamper with auth tag
      const parts = encrypted.split(':');
      parts[3] = parts[3].replace('0', '1');
      const tampered = parts.join(':');

      await expect(encryption.decrypt(tampered)).rejects.toThrow();
    });

    it('1.7 should fail decryption with wrong version', async () => {
      const encrypted = await encryption.encryptCredential(testCredentialData);
      const wrongVersion = encrypted.replace('v1:', 'v2:');

      await expect(encryption.decrypt(wrongVersion)).rejects.toThrow();
    });

    it('1.8 should fail decryption with invalid format', async () => {
      await expect(encryption.decrypt('invalid:format')).rejects.toThrow();
      await expect(encryption.decrypt('no-colons')).rejects.toThrow();
      await expect(encryption.decrypt('')).rejects.toThrow();
    });
  });

  describe('2. CredentialRepository with Encryption', () => {
    beforeEach(async () => {
      // Clean up before each test
      await prisma.credential.deleteMany({
        where: { userId: testUserId }
      });
    });

    it('2.1 should create encrypted credential in database', async () => {
      const input: CredentialInput = {
        name: 'Test API Key',
        type: CredentialType.API_KEY,
        data: testCredentialData,
        description: 'Test credential'
      };

      const credential = await repository.create(testUserId, input);

      expect(credential.id).toBeDefined();
      expect(credential.name).toBe(input.name);
      expect(credential.type).toBe(input.type);
      expect(credential.userId).toBe(testUserId);

      // Verify it's marked as encrypted in database
      const dbCredential = await prisma.credential.findUnique({
        where: { id: credential.id }
      });

      expect(dbCredential?.isEncrypted).toBe(true);
      expect(dbCredential?.encryptionVersion).toBe('v1');

      // Data should be encrypted (not plain JSON)
      expect(dbCredential?.data).not.toContain(testCredentialData.apiKey);
      expect(dbCredential?.data).toContain('v1:'); // Encrypted format
    });

    it('2.2 should retrieve and decrypt credential correctly', async () => {
      const input: CredentialInput = {
        name: 'Test Credential',
        type: CredentialType.OAUTH2,
        data: testCredentialData
      };

      const created = await repository.create(testUserId, input);
      const retrieved = await repository.findByIdWithData(created.id, testUserId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.data).toEqual(testCredentialData);
    });

    it('2.3 should list credentials without exposing sensitive data', async () => {
      await repository.create(testUserId, {
        name: 'Cred 1',
        type: CredentialType.API_KEY,
        data: testCredentialData
      });

      await repository.create(testUserId, {
        name: 'Cred 2',
        type: CredentialType.BASIC_AUTH,
        data: { username: 'user', password: 'pass' }
      });

      const credentials = await repository.listByUser(testUserId);

      expect(credentials).toHaveLength(2);

      // Should not include data field
      credentials.forEach(cred => {
        expect(cred).not.toHaveProperty('data');
        expect(cred.id).toBeDefined();
        expect(cred.name).toBeDefined();
        expect(cred.type).toBeDefined();
      });
    });

    it('2.4 should update credential and re-encrypt', async () => {
      const created = await repository.create(testUserId, {
        name: 'Original',
        type: CredentialType.API_KEY,
        data: testCredentialData
      });

      const newData = { apiKey: 'new_key_456', apiSecret: 'new_secret_789' };

      await repository.update(created.id, testUserId, {
        name: 'Updated',
        data: newData
      });

      const updated = await repository.findByIdWithData(created.id, testUserId);

      expect(updated?.name).toBe('Updated');
      expect(updated?.data).toEqual(newData);
      expect(updated?.data).not.toEqual(testCredentialData);
    });

    it('2.5 should prevent unauthorized access to credentials', async () => {
      const created = await repository.create(testUserId, {
        name: 'Secure Cred',
        type: CredentialType.API_KEY,
        data: testCredentialData
      });

      // Try to access with different user ID
      const unauthorized = await repository.findByIdWithData(
        created.id,
        'different-user-id'
      );

      expect(unauthorized).toBeNull();
    });

    it('2.6 should soft delete credentials', async () => {
      const created = await repository.create(testUserId, {
        name: 'To Delete',
        type: CredentialType.API_KEY,
        data: testCredentialData
      });

      const deleted = await repository.softDelete(created.id, testUserId);
      expect(deleted).toBe(true);

      // Should not appear in user's credential list
      const credentials = await repository.listByUser(testUserId);
      expect(credentials).toHaveLength(0);

      // But should still exist in database (soft deleted)
      const dbCredential = await prisma.credential.findUnique({
        where: { id: created.id }
      });
      expect(dbCredential?.isActive).toBe(false);
    });

    it('2.7 should hard delete credentials permanently', async () => {
      const created = await repository.create(testUserId, {
        name: 'To Delete',
        type: CredentialType.API_KEY,
        data: testCredentialData
      });

      const deleted = await repository.hardDelete(created.id, testUserId);
      expect(deleted).toBe(true);

      // Should not exist in database at all
      const dbCredential = await prisma.credential.findUnique({
        where: { id: created.id }
      });
      expect(dbCredential).toBeNull();
    });

    it('2.8 should filter credentials by type', async () => {
      await repository.create(testUserId, {
        name: 'API Key 1',
        type: CredentialType.API_KEY,
        data: testCredentialData
      });

      await repository.create(testUserId, {
        name: 'OAuth 1',
        type: CredentialType.OAUTH2,
        data: testCredentialData
      });

      await repository.create(testUserId, {
        name: 'API Key 2',
        type: CredentialType.API_KEY,
        data: testCredentialData
      });

      const apiKeys = await repository.listByType(testUserId, CredentialType.API_KEY);
      const oauth = await repository.listByType(testUserId, CredentialType.OAUTH2);

      expect(apiKeys).toHaveLength(2);
      expect(oauth).toHaveLength(1);
    });

    it('2.9 should track credential usage', async () => {
      const created = await repository.create(testUserId, {
        name: 'Track Usage',
        type: CredentialType.API_KEY,
        data: testCredentialData
      });

      // Initially no lastUsedAt
      let credential = await repository.findById(created.id);
      expect(credential?.lastUsedAt).toBeUndefined();

      // Mark as used
      await repository.markAsUsed(created.id);

      // Should now have lastUsedAt
      credential = await repository.findById(created.id);
      expect(credential?.lastUsedAt).toBeInstanceOf(Date);
    });

    it('2.10 should detect expired credentials', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const expired = await repository.create(testUserId, {
        name: 'Expired Cred',
        type: CredentialType.API_KEY,
        data: testCredentialData,
        expiresAt: yesterday
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const valid = await repository.create(testUserId, {
        name: 'Valid Cred',
        type: CredentialType.API_KEY,
        data: testCredentialData,
        expiresAt: tomorrow
      });

      const isExpired1 = await repository.isExpired(expired.id);
      const isExpired2 = await repository.isExpired(valid.id);

      expect(isExpired1).toBe(true);
      expect(isExpired2).toBe(false);
    });

    it('2.11 should find all expired credentials', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await repository.create(testUserId, {
        name: 'Expired 1',
        type: CredentialType.API_KEY,
        data: testCredentialData,
        expiresAt: yesterday
      });

      await repository.create(testUserId, {
        name: 'Expired 2',
        type: CredentialType.API_KEY,
        data: testCredentialData,
        expiresAt: yesterday
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await repository.create(testUserId, {
        name: 'Valid',
        type: CredentialType.API_KEY,
        data: testCredentialData,
        expiresAt: tomorrow
      });

      const expiredCreds = await repository.findExpired();
      expect(expiredCreds.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('3. Key Rotation and Re-encryption', () => {
    it('3.1 should re-encrypt credential with new version', async () => {
      const created = await repository.create(testUserId, {
        name: 'To Rotate',
        type: CredentialType.API_KEY,
        data: testCredentialData
      });

      const reencrypted = await repository.reencrypt(created.id, 'v2');

      expect(reencrypted.id).toBe(created.id);

      // Verify version updated in database
      const dbCredential = await prisma.credential.findUnique({
        where: { id: created.id }
      });
      expect(dbCredential?.encryptionVersion).toBe('v2');
    });

    it('3.2 should get encryption statistics', async () => {
      // Create some test credentials
      await repository.create(testUserId, {
        name: 'Stat Test 1',
        type: CredentialType.API_KEY,
        data: testCredentialData
      });

      await repository.create(testUserId, {
        name: 'Stat Test 2',
        type: CredentialType.API_KEY,
        data: testCredentialData
      });

      const stats = await repository.getEncryptionStats();

      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.encrypted).toBeGreaterThanOrEqual(2);
      expect(stats.byVersion).toHaveProperty('v1');
      expect(stats.byVersion.v1).toBeGreaterThanOrEqual(2);
    });
  });

  describe('4. Security Edge Cases', () => {
    it('4.1 should reject empty credential data', async () => {
      await expect(
        repository.create(testUserId, {
          name: 'Empty Data',
          type: CredentialType.API_KEY,
          data: {}
        })
      ).rejects.toThrow();
    });

    it('4.2 should handle large credential data', async () => {
      const largeData = {
        certificate: 'A'.repeat(10000), // 10KB certificate
        privateKey: 'B'.repeat(10000),
        metadata: { large: 'C'.repeat(5000) }
      };

      const created = await repository.create(testUserId, {
        name: 'Large Cred',
        type: CredentialType.CERTIFICATE,
        data: largeData
      });

      const retrieved = await repository.findByIdWithData(created.id, testUserId);
      expect(retrieved?.data).toEqual(largeData);
    });

    it('4.3 should handle special characters in credential data', async () => {
      const specialData = {
        password: 'P@ssw0rd!#$%^&*()_+-=[]{}|;:\'",.<>?/~`',
        apiKey: '中文🔐émojis™®',
        username: 'user+test@example.com'
      };

      const created = await repository.create(testUserId, {
        name: 'Special Chars',
        type: CredentialType.BASIC_AUTH,
        data: specialData
      });

      const retrieved = await repository.findByIdWithData(created.id, testUserId);
      expect(retrieved?.data).toEqual(specialData);
    });

    it('4.4 should prevent SQL injection in credential queries', async () => {
      const maliciousUserId = "'; DROP TABLE credentials; --";

      // Should not throw SQL error or delete anything
      const credentials = await repository.listByUser(maliciousUserId);
      expect(credentials).toEqual([]);

      // Verify table still exists
      const count = await prisma.credential.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('4.5 should handle concurrent credential creation', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        repository.create(testUserId, {
          name: `Concurrent ${i}`,
          type: CredentialType.API_KEY,
          data: { ...testCredentialData, index: i }
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(new Set(results.map(r => r.id)).size).toBe(10); // All unique IDs
    });
  });

  describe('5. Encryption Performance', () => {
    it('5.1 should encrypt credentials quickly (< 100ms)', async () => {
      const start = Date.now();

      await encryption.encryptCredential(testCredentialData);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('5.2 should decrypt credentials quickly (< 100ms)', async () => {
      const encrypted = await encryption.encryptCredential(testCredentialData);

      const start = Date.now();
      await encryption.decrypt(encrypted);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('5.3 should handle batch encryption efficiently', async () => {
      const batch = Array.from({ length: 100 }, (_, i) => ({
        ...testCredentialData,
        apiKey: `key_${i}`
      }));

      const start = Date.now();

      await Promise.all(batch.map(data => encryption.encryptCredential(data)));

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // 5 seconds for 100 encryptions
    });
  });
});

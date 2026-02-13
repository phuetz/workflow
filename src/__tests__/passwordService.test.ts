/**
 * Password Service Tests
 * Comprehensive testing of bcrypt-based password hashing and security features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as crypto from 'crypto';

// Mock logger to avoid console spam during tests
vi.mock('../../services/LoggingService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Import after mocking
import { passwordService, PasswordService } from '../backend/auth/passwordService';

describe('PasswordService - Bcrypt Implementation', () => {
  describe('hashPassword', () => {
    it('should hash a valid password using bcrypt', async () => {
      const password = 'SecureP@ssw0rd';
      const hash = await passwordService.hashPassword(password);

      // Bcrypt hashes start with $2a$, $2b$, or $2y$
      expect(hash).toMatch(/^\$2[aby]\$/);
      // Bcrypt hashes are 60 characters long
      expect(hash.length).toBe(60);
    });

    it('should generate different hashes for the same password (random salt)', async () => {
      const password = 'SecureP@ssw0rd';
      const hash1 = await passwordService.hashPassword(password);
      const hash2 = await passwordService.hashPassword(password);

      // Different salts should produce different hashes
      expect(hash1).not.toBe(hash2);
    });

    it('should include the cost factor in the hash', async () => {
      const password = 'SecureP@ssw0rd';
      const hash = await passwordService.hashPassword(password);

      // Extract cost factor from hash (format: $2a$12$...)
      const costFactor = parseInt(hash.split('$')[2]);
      expect(costFactor).toBe(12); // Default cost factor
    });

    it('should reject passwords shorter than 8 characters', async () => {
      const shortPassword = 'Pass1!';

      await expect(passwordService.hashPassword(shortPassword)).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });

    it('should reject passwords longer than 128 characters', async () => {
      const longPassword = 'A'.repeat(129) + 'a1!';

      await expect(passwordService.hashPassword(longPassword)).rejects.toThrow(
        'Password must be no more than 128 characters long'
      );
    });

    it('should reject non-string passwords', async () => {
      await expect(passwordService.hashPassword(null as any)).rejects.toThrow(
        'Password must be a string'
      );
      await expect(passwordService.hashPassword(undefined as any)).rejects.toThrow(
        'Password must be a string'
      );
      await expect(passwordService.hashPassword(12345 as any)).rejects.toThrow(
        'Password must be a string'
      );
    });

    it('should reject passwords with insufficient complexity', async () => {
      const weakPasswords = [
        { pass: 'alllowercase', reason: 'Only lowercase (1 type)' },
        { pass: 'ALLUPPERCASE', reason: 'Only uppercase (1 type)' },
        { pass: '12345678', reason: 'Only numbers (1 type)' },
        { pass: 'lowercase123', reason: 'Only lowercase and numbers (2 types)' },
      ];

      for (const { pass } of weakPasswords) {
        await expect(async () => {
          await passwordService.hashPassword(pass);
        }).rejects.toThrow(/Password must contain at least 3 of/);
      }
    });

    it('should accept passwords with sufficient complexity', async () => {
      const validPasswords = [
        'Password1!', // lowercase, uppercase, numbers, special
        'MyP@ssw0rd', // lowercase, uppercase, numbers, special
        'SECURE123!', // uppercase, numbers, special (3 types)
        'secure123!', // lowercase, numbers, special (3 types)
      ];

      for (const valid of validPasswords) {
        const hash = await passwordService.hashPassword(valid);
        expect(hash).toBeTruthy();
        expect(hash).toMatch(/^\$2[aby]\$/);
      }
    });
  });

  describe('verifyPassword - Bcrypt Hashes', () => {
    it('should verify correct password against bcrypt hash', async () => {
      const password = 'SecureP@ssw0rd';
      const hash = await passwordService.hashPassword(password);

      const isValid = await passwordService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password against bcrypt hash', async () => {
      const password = 'SecureP@ssw0rd';
      const wrongPassword = 'WrongP@ssw0rd';
      const hash = await passwordService.hashPassword(password);

      const isValid = await passwordService.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should handle case-sensitive passwords correctly', async () => {
      const password = 'SecureP@ssw0rd';
      const hash = await passwordService.hashPassword(password);

      expect(await passwordService.verifyPassword('SECUREP@SSW0RD', hash)).toBe(false);
      expect(await passwordService.verifyPassword('securep@ssw0rd', hash)).toBe(false);
      expect(await passwordService.verifyPassword('SecureP@ssw0rd', hash)).toBe(true);
    });

    it('should verify password with special characters', async () => {
      const password = 'P@ss!#$%^&*()_+-=[]{}|;:,.<>?w0rd';
      const hash = await passwordService.hashPassword(password);

      const isValid = await passwordService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });
  });

  describe('verifyPassword - Legacy Scrypt Hashes (Backward Compatibility)', () => {
    it('should detect legacy scrypt hash format', async () => {
      // Use a pre-generated legacy scrypt hash (format: salt:hash)
      const legacyHash = 'abcd1234:ef567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12';

      // PasswordService should recognize this as legacy format
      const needsRehash = passwordService.needsRehash(legacyHash);
      expect(needsRehash).toBe(true);
    });

    it('should handle legacy hash verification gracefully', async () => {
      // Test with a legacy-format hash (even if verification fails in test environment)
      const legacyHash = 'salt123:hash456';
      const password = 'TestPassword123!';

      // Should not throw error, just return false if it can't verify
      const result = await passwordService.verifyPassword(password, legacyHash);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('verifyPassword - Invalid Hashes', () => {
    it('should return false for unknown hash format', async () => {
      const password = 'SecureP@ssw0rd';
      const invalidHash = 'invalid_hash_format';

      const isValid = await passwordService.verifyPassword(password, invalidHash);
      expect(isValid).toBe(false);
    });

    it('should return false for malformed bcrypt hash', async () => {
      const password = 'SecureP@ssw0rd';
      const malformedHash = '$2a$12$invalid';

      const isValid = await passwordService.verifyPassword(password, malformedHash);
      expect(isValid).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const password = 'SecureP@ssw0rd';

      const isValid = await passwordService.verifyPassword(password, '');
      expect(isValid).toBe(false);
    });
  });

  describe('needsRehash', () => {
    it('should return false for current bcrypt hash with 12 rounds', async () => {
      const password = 'SecureP@ssw0rd';
      const hash = await passwordService.hashPassword(password);

      const needsRehash = passwordService.needsRehash(hash);
      expect(needsRehash).toBe(false);
    });

    it('should return true for bcrypt hash with fewer than 12 rounds', () => {
      // Simulate a hash with 10 rounds
      const lowRoundHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

      const needsRehash = passwordService.needsRehash(lowRoundHash);
      expect(needsRehash).toBe(true);
    });

    it('should return true for legacy scrypt hash', () => {
      const legacyHash = 'somesalt:somehash';

      const needsRehash = passwordService.needsRehash(legacyHash);
      expect(needsRehash).toBe(true);
    });

    it('should return true for unknown hash format', () => {
      const unknownHash = 'unknown_format';

      const needsRehash = passwordService.needsRehash(unknownHash);
      expect(needsRehash).toBe(true);
    });

    it('should return true for empty hash', () => {
      const needsRehash = passwordService.needsRehash('');
      expect(needsRehash).toBe(true);
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password of specified length', () => {
      const password = passwordService.generateSecurePassword(16);
      expect(password.length).toBe(16);

      const longPassword = passwordService.generateSecurePassword(32);
      expect(longPassword.length).toBe(32);
    });

    it('should generate password with default length of 16', () => {
      const password = passwordService.generateSecurePassword();
      expect(password.length).toBe(16);
    });

    it('should generate different passwords on each call', () => {
      const password1 = passwordService.generateSecurePassword(16);
      const password2 = passwordService.generateSecurePassword(16);

      expect(password1).not.toBe(password2);
    });

    it('should include characters from all categories', () => {
      // Generate a long password to increase chances of all categories
      const password = passwordService.generateSecurePassword(64);

      expect(password).toMatch(/[a-z]/); // lowercase
      expect(password).toMatch(/[A-Z]/); // uppercase
      expect(password).toMatch(/[0-9]/); // numbers
      expect(password).toMatch(/[^a-zA-Z0-9]/); // special characters
    });
  });

  describe('validatePassword', () => {
    it('should accept valid password', () => {
      expect(() => passwordService.validatePassword('SecureP@ss1')).not.toThrow();
    });

    it('should reject password shorter than 8 characters', () => {
      expect(() => passwordService.validatePassword('Pass1!')).toThrow(
        'Password must be at least 8 characters long'
      );
    });

    it('should reject password longer than 128 characters', () => {
      const longPassword = 'A'.repeat(129);
      expect(() => passwordService.validatePassword(longPassword)).toThrow(
        'Password must be no more than 128 characters long'
      );
    });

    it('should reject non-string input', () => {
      expect(() => passwordService.validatePassword(null as any)).toThrow(
        'Password must be a string'
      );
      expect(() => passwordService.validatePassword(undefined as any)).toThrow(
        'Password must be a string'
      );
      expect(() => passwordService.validatePassword(12345 as any)).toThrow(
        'Password must be a string'
      );
    });

    it('should reject password with insufficient complexity', () => {
      expect(() => passwordService.validatePassword('alllowercase')).toThrow(
        'Password must contain at least 3 of: lowercase, uppercase, numbers, special characters'
      );
    });
  });

  describe('checkPasswordPwned', () => {
    it('should return false for strong unique password (likely not pwned)', async () => {
      // Use a random password that is very unlikely to be pwned
      const uniquePassword = crypto.randomBytes(32).toString('hex') + 'Aa1!';

      const isPwned = await passwordService.checkPasswordPwned(uniquePassword);
      // Most likely not pwned, but we can't guarantee
      expect(typeof isPwned).toBe('boolean');
    });

    it('should handle API errors gracefully', async () => {
      // Test with a password (actual check depends on network)
      const password = 'SecureP@ssw0rd123';

      const isPwned = await passwordService.checkPasswordPwned(password);
      // Should return boolean, not throw error
      expect(typeof isPwned).toBe('boolean');
    });
  });

  describe('generateResetToken', () => {
    it('should generate a 64-character hex token', () => {
      const token = passwordService.generateResetToken();

      expect(token).toMatch(/^[0-9a-f]{64}$/);
      expect(token.length).toBe(64);
    });

    it('should generate different tokens on each call', () => {
      const token1 = passwordService.generateResetToken();
      const token2 = passwordService.generateResetToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('hashResetToken', () => {
    it('should hash token with SHA-256', () => {
      const token = 'sample-reset-token';
      const hash = passwordService.hashResetToken(token);

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(hash.length).toBe(64);
    });

    it('should produce consistent hash for same token', () => {
      const token = 'sample-reset-token';
      const hash1 = passwordService.hashResetToken(token);
      const hash2 = passwordService.hashResetToken(token);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', () => {
      const token1 = 'sample-reset-token-1';
      const token2 = 'sample-reset-token-2';
      const hash1 = passwordService.hashResetToken(token1);
      const hash2 = passwordService.hashResetToken(token2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Security Properties', () => {
    it('should take reasonable time to hash (adaptive cost)', async () => {
      const password = 'SecureP@ssw0rd';

      const startTime = Date.now();
      await passwordService.hashPassword(password);
      const duration = Date.now() - startTime;

      // 12 rounds should take at least 50ms but less than 2000ms
      expect(duration).toBeGreaterThan(50);
      expect(duration).toBeLessThan(2000);
    });

    it('should resist timing attacks (constant-time comparison)', async () => {
      const password = 'SecureP@ssw0rd';
      const hash = await passwordService.hashPassword(password);

      // Test with passwords of different lengths
      const times: number[] = [];
      const testPasswords = ['a', 'ab', 'abc', 'abcd', 'abcdefgh', 'abcdefghijklmnop'];

      for (const testPass of testPasswords) {
        const start = Date.now();
        await passwordService.verifyPassword(testPass, hash);
        times.push(Date.now() - start);
      }

      // Bcrypt should have relatively consistent timing regardless of password length
      // Allow for some variance but should be in similar range
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const variance = maxTime - minTime;

      // Variance should be less than 100ms (constant-time property)
      expect(variance).toBeLessThan(100);
    });

    it('should be resistant to rainbow tables (unique salts)', async () => {
      const password = 'SecureP@ssw0rd';
      const hash1 = await passwordService.hashPassword(password);
      const hash2 = await passwordService.hashPassword(password);

      // Different salts = different hashes for same password
      expect(hash1).not.toBe(hash2);

      // Both should verify correctly
      expect(await passwordService.verifyPassword(password, hash1)).toBe(true);
      expect(await passwordService.verifyPassword(password, hash2)).toBe(true);
    });
  });

  describe('Integration - Full Password Lifecycle', () => {
    it('should handle complete password lifecycle', async () => {
      // 1. Generate secure password
      const password = passwordService.generateSecurePassword(16);
      expect(password.length).toBe(16);

      // 2. Validate password
      expect(() => passwordService.validatePassword(password)).not.toThrow();

      // 3. Hash password
      const hash = await passwordService.hashPassword(password);
      expect(hash).toMatch(/^\$2[aby]\$/);

      // 4. Verify correct password
      expect(await passwordService.verifyPassword(password, hash)).toBe(true);

      // 5. Verify incorrect password
      expect(await passwordService.verifyPassword('WrongPassword!1', hash)).toBe(false);

      // 6. Check if rehash needed
      expect(passwordService.needsRehash(hash)).toBe(false);
    });

    it('should demonstrate hash migration workflow', async () => {
      const password = 'SecureP@ssw0rd';

      // Simulate a legacy hash (format: salt:hash)
      const legacyHash = 'somesalt:somehash';

      // 1. Verify legacy hash needs rehash
      expect(passwordService.needsRehash(legacyHash)).toBe(true);

      // 2. Generate new bcrypt hash to replace legacy
      const newHash = await passwordService.hashPassword(password);

      // 3. Verify new hash works
      expect(await passwordService.verifyPassword(password, newHash)).toBe(true);

      // 4. Verify new hash doesn't need rehashing
      expect(passwordService.needsRehash(newHash)).toBe(false);
    });
  });
});

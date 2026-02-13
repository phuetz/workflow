/**
 * Password Security Test Suite
 *
 * Comprehensive tests for all password security features:
 * - Argon2id hashing
 * - Password strength validation
 * - Breach checking (Have I Been Pwned)
 * - Password history enforcement
 * - Secure password reset flow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getPasswordHashingService } from '../backend/auth/PasswordHashingService';
import { getPasswordStrengthValidator } from '../backend/auth/PasswordStrengthValidator';
import { getPasswordBreachChecker } from '../backend/auth/PasswordBreachChecker';
import { getPasswordHistoryManager } from '../backend/auth/PasswordHistoryManager';
import { getPasswordResetService } from '../backend/auth/PasswordResetService';

describe('Password Hashing Service (Argon2id)', () => {
  const hashingService = getPasswordHashingService();

  it('should hash passwords using Argon2id', async () => {
    const password = 'MySecurePassword123!';
    const hash = await hashingService.hash(password);

    expect(hash).toBeDefined();
    expect(hash).toContain('$argon2id$');
    expect(hash.length).toBeGreaterThan(50);
  });

  it('should verify correct password', async () => {
    const password = 'MySecurePassword123!';
    const hash = await hashingService.hash(password);

    const isValid = await hashingService.verify(hash, password);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'MySecurePassword123!';
    const hash = await hashingService.hash(password);

    const isValid = await hashingService.verify(hash, 'WrongPassword');
    expect(isValid).toBe(false);
  });

  it('should generate unique hashes for same password', async () => {
    const password = 'MySecurePassword123!';
    const hash1 = await hashingService.hash(password);
    const hash2 = await hashingService.hash(password);

    expect(hash1).not.toBe(hash2); // Different salts
    expect(await hashingService.verify(hash1, password)).toBe(true);
    expect(await hashingService.verify(hash2, password)).toBe(true);
  });

  it('should reject empty password', async () => {
    await expect(hashingService.hash('')).rejects.toThrow();
  });

  it('should reject too long password', async () => {
    const longPassword = 'a'.repeat(150);
    await expect(hashingService.hash(longPassword)).rejects.toThrow();
  });

  it('should detect when hash needs rehashing', async () => {
    const password = 'MySecurePassword123!';
    const hash = await hashingService.hash(password, {
      memoryCost: 16384, // Low memory cost
      timeCost: 2
    });

    // Check if needs rehash with higher parameters
    const needsRehash = hashingService.needsRehash(hash, {
      memoryCost: 65536,
      timeCost: 3
    });

    expect(needsRehash).toBe(true);
  });

  it('should extract hash information', async () => {
    const password = 'MySecurePassword123!';
    const hash = await hashingService.hash(password);

    const info = await hashingService.getHashInfo(hash);

    expect(info).toBeDefined();
    expect(info?.algorithm).toBe('argon2id');
    expect(info?.memoryCost).toBeGreaterThan(0);
    expect(info?.timeCost).toBeGreaterThan(0);
    expect(info?.parallelism).toBeGreaterThan(0);
  });
});

describe('Password Strength Validator', () => {
  const validator = getPasswordStrengthValidator();

  it('should validate strong password', () => {
    const result = validator.validate('MyStr0ng!Pass@2024');

    expect(result.isValid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.strength).toMatch(/strong|very-strong/);
  });

  it('should reject weak password', () => {
    const result = validator.validate('password');

    expect(result.isValid).toBe(false);
    expect(result.score).toBeLessThan(40);
    expect(result.feedback.length).toBeGreaterThan(0);
  });

  it('should reject common passwords', () => {
    const commonPasswords = ['password', '123456', 'qwerty', 'letmein'];

    commonPasswords.forEach(pwd => {
      const result = validator.validate(pwd);
      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('This is a commonly used password');
    });
  });

  it('should enforce minimum length', () => {
    const result = validator.validate('Short1!', { minLength: 12 });

    expect(result.isValid).toBe(false);
    expect(result.requirements.minLength).toBe(false);
  });

  it('should require uppercase letters', () => {
    const result = validator.validate('lowercase123!', { requireUppercase: true });

    expect(result.requirements.hasUppercase).toBe(false);
  });

  it('should require lowercase letters', () => {
    const result = validator.validate('UPPERCASE123!', { requireLowercase: true });

    expect(result.requirements.hasLowercase).toBe(false);
  });

  it('should require numbers', () => {
    const result = validator.validate('NoNumbers!@#', { requireNumbers: true });

    expect(result.requirements.hasNumber).toBe(false);
  });

  it('should require special characters', () => {
    const result = validator.validate('NoSpecialChar123', { requireSpecialChars: true });

    expect(result.requirements.hasSpecialChar).toBe(false);
  });

  it('should detect sequential characters', () => {
    const result = validator.validate('abcd1234!@#$');

    expect(result.requirements.noSequential).toBe(false);
    expect(result.feedback).toContain('Avoid sequential characters (e.g., abc, 123)');
  });

  it('should detect repeated characters', () => {
    const result = validator.validate('aaa111!!!XXX');

    expect(result.requirements.noRepeated).toBe(false);
    expect(result.feedback).toContain('Avoid repeated characters (e.g., aaa, 111)');
  });

  it('should detect keyboard patterns', () => {
    const result = validator.validate('qwerty123456!');

    expect(result.feedback.some(f => f.includes('keyboard'))).toBe(true);
  });

  it('should reject passwords containing personal info', () => {
    const result = validator.validate('john.doe@example.com123!', {
      personalInfo: ['john', 'doe', 'john.doe@example.com']
    });

    expect(result.feedback).toContain('Password should not contain personal information');
  });

  it('should calculate entropy correctly', () => {
    const weak = validator.validate('abc123');
    const strong = validator.validate('xK9#mQ2$vL7@pN4');

    expect(strong.score).toBeGreaterThan(weak.score);
  });

  it('should estimate crack time', () => {
    const result = validator.validate('MyStr0ng!Pass@2024');

    expect(result.estimatedCrackTime).toBeDefined();
    expect(result.estimatedCrackTime.length).toBeGreaterThan(0);
  });

  it('should generate strong password', () => {
    const password = validator.generateStrongPassword(16);

    expect(password.length).toBe(16);

    const result = validator.validate(password);
    expect(result.isValid).toBe(true);
    expect(result.strength).toMatch(/strong|very-strong/);
  });
});

describe('Password Breach Checker (Have I Been Pwned)', () => {
  const breachChecker = getPasswordBreachChecker();

  it('should detect breached password (password)', async () => {
    const result = await breachChecker.checkPassword('password');

    expect(result.isBreached).toBe(true);
    expect(result.breachCount).toBeGreaterThan(1000000); // Very common
    expect(result.severity).toBe('critical');
  }, 10000); // 10s timeout for API call

  it('should not detect secure random password', async () => {
    // Very unlikely to be breached
    const randomPassword = 'xK9#mQ2$vL7@pN4!rT6&';
    const result = await breachChecker.checkPassword(randomPassword);

    expect(result.isBreached).toBe(false);
    expect(result.breachCount).toBe(0);
    expect(result.severity).toBe('safe');
  }, 10000);

  it('should provide severity levels', async () => {
    const result = await breachChecker.checkPassword('password');

    expect(['safe', 'low', 'medium', 'high', 'critical']).toContain(result.severity);
  }, 10000);

  it('should provide recommendations', async () => {
    const result = await breachChecker.checkPassword('password');

    expect(result.recommendation).toBeDefined();
    expect(result.recommendation.length).toBeGreaterThan(0);
  }, 10000);

  it('should handle API errors gracefully', async () => {
    // Should not throw, even on error
    const result = await breachChecker.checkPassword('test');

    expect(result).toBeDefined();
    expect(result.isBreached).toBeDefined();
  }, 10000);

  it('should check API health', async () => {
    const isHealthy = await breachChecker.healthCheck();

    expect(typeof isHealthy).toBe('boolean');
  }, 10000);
});

describe('Password History Manager', () => {
  const historyManager = getPasswordHistoryManager();
  const hashingService = getPasswordHashingService();
  const testUserId = 'test-user-' + Date.now();

  afterEach(async () => {
    // Cleanup test data
    await historyManager.deleteUserHistory(testUserId);
  });

  it('should prevent password reuse', async () => {
    const password = 'MySecurePassword123!';
    const hash = await hashingService.hash(password);

    // Add to history
    await historyManager.addToHistory(testUserId, hash);

    // Try to reuse
    const result = await historyManager.canUsePassword(testUserId, password);

    expect(result.canUse).toBe(false);
    expect(result.reason).toContain('was used');
  });

  it('should allow new password', async () => {
    const oldPassword = 'OldPassword123!';
    const newPassword = 'NewPassword456@';

    const oldHash = await hashingService.hash(oldPassword);
    await historyManager.addToHistory(testUserId, oldHash);

    const result = await historyManager.canUsePassword(testUserId, newPassword);

    expect(result.canUse).toBe(true);
  });

  it('should enforce history size limit', async () => {
    // Add 30 passwords
    for (let i = 0; i < 30; i++) {
      const hash = await hashingService.hash(`Password${i}!`);
      await historyManager.addToHistory(testUserId, hash);
    }

    const history = await historyManager.getPasswordHistory(testUserId);

    // Should only keep 24 (default limit)
    expect(history.length).toBeLessThanOrEqual(24);
  });

  it('should get password statistics', async () => {
    const hash = await hashingService.hash('TestPassword123!');
    await historyManager.addToHistory(testUserId, hash);

    const stats = await historyManager.getPasswordStats(testUserId);

    expect(stats.totalChanges).toBe(1);
    expect(stats.lastChanged).toBeInstanceOf(Date);
    expect(stats.passwordAge).toBeDefined();
  });

  it('should enforce minimum password age', async () => {
    const hash = await hashingService.hash('TestPassword123!');
    await historyManager.addToHistory(testUserId, hash);

    const result = await historyManager.canChangePassword(testUserId, 24);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Minimum time');
  });

  it('should allow password change after minimum age', async () => {
    const hash = await hashingService.hash('TestPassword123!');
    await historyManager.addToHistory(testUserId, hash);

    const result = await historyManager.canChangePassword(testUserId, 0);

    expect(result.allowed).toBe(true);
  });
});

describe('Password Reset Service', () => {
  const resetService = getPasswordResetService();
  const testEmail = `test-${Date.now()}@example.com`;

  it('should return success message (prevent enumeration)', async () => {
    const result = await resetService.requestReset({
      email: 'nonexistent@example.com'
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('If an account exists');
  });

  it('should enforce email rate limiting', async () => {
    // Make 4 requests (limit is 3)
    for (let i = 0; i < 4; i++) {
      const result = await resetService.requestReset({ email: testEmail });

      if (i < 3) {
        expect(result.rateLimited).toBeFalsy();
      } else {
        expect(result.rateLimited).toBe(true);
        expect(result.message).toContain('Too many');
      }
    }
  });

  it('should generate secure tokens', () => {
    // Access private method through instance (for testing)
    const token1 = (resetService as any).generateSecureToken();
    const token2 = (resetService as any).generateSecureToken();

    expect(token1).not.toBe(token2);
    expect(token1.length).toBe(64); // 32 bytes hex encoded
  });

  it('should cleanup expired tokens', async () => {
    const deleted = await resetService.cleanupExpiredTokens();

    expect(typeof deleted).toBe('number');
    expect(deleted).toBeGreaterThanOrEqual(0);
  });
});

describe('Integration Tests', () => {
  it('should complete full password change workflow', async () => {
    const hashingService = getPasswordHashingService();
    const validator = getPasswordStrengthValidator();
    const breachChecker = getPasswordBreachChecker();
    const historyManager = getPasswordHistoryManager();

    const testUserId = 'integration-test-' + Date.now();
    const oldPassword = 'OldSecurePass123!';
    const newPassword = 'NewSecurePass456@';

    try {
      // 1. Hash old password and add to history
      const oldHash = await hashingService.hash(oldPassword);
      await historyManager.addToHistory(testUserId, oldHash);

      // 2. Validate new password strength
      const strengthResult = validator.validate(newPassword);
      expect(strengthResult.isValid).toBe(true);

      // 3. Check if password has been breached
      const breachResult = await breachChecker.checkPassword(newPassword);
      expect(breachResult.isBreached).toBe(false);

      // 4. Check password history
      const historyCheck = await historyManager.canUsePassword(testUserId, newPassword);
      expect(historyCheck.canUse).toBe(true);

      // 5. Hash new password
      const newHash = await hashingService.hash(newPassword);
      expect(newHash).toBeDefined();

      // 6. Verify new password
      const verified = await hashingService.verify(newHash, newPassword);
      expect(verified).toBe(true);

    } finally {
      // Cleanup
      await historyManager.deleteUserHistory(testUserId);
    }
  }, 15000);
});

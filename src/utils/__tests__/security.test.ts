/**
 * Security Utilities Tests
 * Comprehensive tests for security functions and validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sanitizeHtml,
  sanitizeUrl,
  validateInput,
  sanitizeObject,
  sanitizeArray,
  SecureStorage,
  RateLimiter,
  createValidationSchema,
  SECURITY_CONFIG
} from '../security';

vi.mock('../../services/LoggingService', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Security Utilities', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset rate limiter
    RateLimiter.reset('test-user');
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const result = sanitizeHtml('<p>Safe content</p><script>alert("xss")</script>');
      expect(result).toBe('<p>Safe content</p>');
      expect(result).not.toContain('<script>');
    });

    it('should remove dangerous event handlers', () => {
      const result = sanitizeHtml('<div onclick="evil()" onmouseover="bad()">Content</div>');
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onmouseover');
      expect(result).toContain('<div>Content</div>');
    });

    it('should remove javascript: protocols', () => {
      const result = sanitizeHtml('<a href="javascript:alert(1)">Click</a>');
      expect(result).toContain('href="#"');
      expect(result).not.toContain('javascript:');
    });

    it('should remove blocked tags', () => {
      const result = sanitizeHtml('<div>Safe</div><iframe src="evil.com"></iframe><form><input type="text"></form>');
      expect(result).not.toContain('<iframe>');
      expect(result).not.toContain('<form>');
      expect(result).not.toContain('<input>');
    });

    it('should handle non-string input gracefully', () => {
      expect(sanitizeHtml(null as unknown as string)).toBe('');
      expect(sanitizeHtml(undefined as unknown as string)).toBe('');
      expect(sanitizeHtml(123 as unknown as string)).toBe('');
    });

    it('should truncate very long strings', () => {
      const longString = 'a'.repeat(SECURITY_CONFIG.maxStringLength + 1000);
      const result = sanitizeHtml(longString);
      expect(result.length).toBe(SECURITY_CONFIG.maxStringLength);
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept valid HTTP/HTTPS URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
      expect(sanitizeUrl('http://localhost:3000')).toBe('http://localhost:3000/');
    });

    it('should reject javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert("xss")')).toBeNull();
    });

    it('should reject data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert("xss")</script>')).toBeNull();
    });

    it('should reject invalid protocols', () => {
      expect(sanitizeUrl('ftp://example.com')).toBeNull();
      expect(sanitizeUrl('file:///etc/passwd')).toBeNull();
    });

    it('should handle malformed URLs', () => {
      expect(sanitizeUrl('not-a-url')).toBeNull();
      expect(sanitizeUrl('http://')).toBeNull();
    });

    it('should reject very long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(SECURITY_CONFIG.maxUrlLength + 100);
      expect(sanitizeUrl(longUrl)).toBeNull();
    });
  });

  describe('validateInput', () => {
    it('should validate string inputs', () => {
      const result = validateInput('Hello World', {
        type: 'string',
        maxLength: 20,
        minLength: 5
      });

      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('Hello World');
      expect(result.errors).toHaveLength(0);
    });

    it('should reject strings that are too long', () => {
      const result = validateInput('Too long string', {
        type: 'string',
        maxLength: 5
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Must be 5 characters or less');
    });

    it('should validate email addresses', () => {
      const validEmail = validateInput('test@example.com', { type: 'email' });
      expect(validEmail.isValid).toBe(true);

      const invalidEmail = validateInput('not-an-email', { type: 'email' });
      expect(invalidEmail.isValid).toBe(false);
      expect(invalidEmail.errors).toContain('Must be a valid email address');
    });

    it('should validate numbers', () => {
      const validNumber = validateInput('123', { type: 'number' });
      expect(validNumber.isValid).toBe(true);
      expect(validNumber.sanitizedValue).toBe(123);

      const invalidNumber = validateInput('not-a-number', { type: 'number' });
      expect(invalidNumber.isValid).toBe(false);
    });

    it('should validate URLs', () => {
      const validUrl = validateInput('https://example.com', { type: 'url' });
      expect(validUrl.isValid).toBe(true);

      const invalidUrl = validateInput('not-a-url', { type: 'url' });
      expect(invalidUrl.isValid).toBe(false);
    });

    it('should handle required fields', () => {
      const result = validateInput('', { type: 'string', required: true });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('This field is required');
    });

    it('should validate patterns', () => {
      const phonePattern = /^\d{3}-\d{3}-\d{4}$/;
      const validPhone = validateInput('555-123-4567', {
        type: 'string',
        pattern: phonePattern
      });
      expect(validPhone.isValid).toBe(true);

      const invalidPhone = validateInput('invalid-phone', {
        type: 'string',
        pattern: phonePattern
      });
      expect(invalidPhone.isValid).toBe(false);
      expect(invalidPhone.errors).toContain('Invalid format');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize object values', () => {
      const obj = {
        name: '<script>alert("xss")</script>John',
        email: 'john@example.com',
        bio: '<p>Good <script>evil()</script> person</p>'
      };
      const result = sanitizeObject(obj);
      expect(result.name).not.toContain('<script>');
      expect(result.name).toBe('John');
      expect(result.email).toBe('john@example.com');
      expect(result.bio).toBe('<p>Good  person</p>');
    });

    it('should handle nested objects', () => {
      const nested = {
        user: {
          profile: {
            name: '<script>alert("xss")</script>Safe Name'
          }
        }
      };
      const result = sanitizeObject(nested);
      expect(result.user.profile.name).toBe('Safe Name');
    });

    it('should skip sensitive keys', () => {
      const sensitive = {
        username: 'john',
        password: 'secret123',
        token: 'abc123',
        normalField: 'safe'
      };
      const result = sanitizeObject(sensitive);
      expect(result.username).toBe('john');
      expect(result.normalField).toBe('safe');
      expect(result.password).toBeUndefined();
      expect(result.token).toBeUndefined();
    });

    it('should prevent deep recursion', () => {
      const deepObject: Record<string, unknown> = {};
      let current: Record<string, unknown> = deepObject;
      // Create an object deeper than max depth
      for (let i = 0; i < SECURITY_CONFIG.maxObjectDepth + 5; i++) {
        current.next = {};
        current = current.next as Record<string, unknown>;
      }

      // Should not crash and should limit depth
      const result = sanitizeObject(deepObject);
      expect(result).toBeDefined();
    });
  });

  describe('sanitizeArray', () => {
    it('should sanitize array elements', () => {
      const arr = [
        '<script>evil()</script>Safe',
        { name: '<script>alert("xss")</script>John' },
        'Normal string'
      ];
      const result = sanitizeArray(arr);
      expect(result[0]).toBe('Safe');
      expect(result[1].name).toBe('John');
      expect(result[2]).toBe('Normal string');
    });

    it('should limit array length', () => {
      const longArray = new Array(SECURITY_CONFIG.maxArrayLength + 100).fill('item');
      const result = sanitizeArray(longArray);
      expect(result.length).toBe(SECURITY_CONFIG.maxArrayLength);
    });
  });

  describe('SecureStorage', () => {
    it('should store and retrieve data securely', () => {
      const testData = { user: 'john', role: 'admin' };
      const stored = SecureStorage.setItem('test-key', testData);
      expect(stored).toBe(true);
      const retrieved = SecureStorage.getItem('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should sanitize stored data', () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>John',
        bio: 'Safe content'
      };

      SecureStorage.setItem('malicious-key', maliciousData);
      const retrieved = SecureStorage.getItem('malicious-key');
      expect(retrieved.name).toBe('John');
      expect(retrieved.bio).toBe('Safe content');
    });

    it('should reject invalid keys', () => {
      const result = SecureStorage.setItem('<script>evil</script>', { data: 'test' });
      expect(result).toBe(false);
    });

    it('should handle storage errors gracefully', () => {
      // Mock localStorage to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage full');
      });
      const result = SecureStorage.setItem('key', { data: 'test' });
      expect(result).toBe(false);

      // Restore original
      localStorage.setItem = originalSetItem;
    });

    it('should remove items securely', () => {
      SecureStorage.setItem('to-remove', { data: 'test' });
      const removed = SecureStorage.removeItem('to-remove');
      expect(removed).toBe(true);
      const retrieved = SecureStorage.getItem('to-remove');
      expect(retrieved).toBeNull();
    });
  });

  describe('RateLimiter', () => {
    it('should allow requests within limit', () => {
      expect(RateLimiter.isAllowed('user1', 5, 60000)).toBe(true);
      expect(RateLimiter.isAllowed('user1', 5, 60000)).toBe(true);
      expect(RateLimiter.isAllowed('user1', 5, 60000)).toBe(true);
    });

    it('should block requests exceeding limit', () => {
      const maxAttempts = 3;
      // Use up all attempts
      for (let i = 0; i < maxAttempts; i++) {
        expect(RateLimiter.isAllowed('user2', maxAttempts, 60000)).toBe(true);
      }

      // Next attempt should be blocked
      expect(RateLimiter.isAllowed('user2', maxAttempts, 60000)).toBe(false);
    });

    it('should reset after window expires', () => {
      const shortWindow = 100; // 100ms
      // Use up attempts
      expect(RateLimiter.isAllowed('user3', 1, shortWindow)).toBe(true);
      expect(RateLimiter.isAllowed('user3', 1, shortWindow)).toBe(false);

      // Wait for window to expire
      return new Promise(resolve => {
        setTimeout(() => {
          expect(RateLimiter.isAllowed('user3', 1, shortWindow)).toBe(true);
          resolve(undefined);
        }, shortWindow + 10);
      });
    });

    it('should handle different users independently', () => {
      expect(RateLimiter.isAllowed('userA', 1, 60000)).toBe(true);
      expect(RateLimiter.isAllowed('userB', 1, 60000)).toBe(true);
      expect(RateLimiter.isAllowed('userA', 1, 60000)).toBe(false);
      expect(RateLimiter.isAllowed('userB', 1, 60000)).toBe(false);
    });
  });

  describe('createValidationSchema', () => {
    it('should validate data against schema', () => {
      const schema = {
        name: { type: 'string' as const, required: true, maxLength: 50 },
        email: { type: 'email' as const, required: true },
        age: { type: 'number' as const }
      };

      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        age: '30'
      };
      const validator = createValidationSchema(schema);
      const result = validator(data);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData.name).toBe('John Doe');
      expect(result.sanitizedData.email).toBe('john@example.com');
      expect(result.sanitizedData.age).toBe(30);
    });

    it('should return errors for invalid data', () => {
      const schema = {
        name: { type: 'string' as const, required: true },
        email: { type: 'email' as const, required: true }
      };

      const invalidData = {
        name: '',
        email: 'not-an-email'
      };
      const validator = createValidationSchema(schema);
      const result = validator(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toContain('This field is required');
      expect(result.errors.email).toContain('Must be a valid email address');
    });
  });
});
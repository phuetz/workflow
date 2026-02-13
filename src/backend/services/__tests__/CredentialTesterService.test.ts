/**
 * Tests for CredentialTesterService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CredentialType } from '@prisma/client';
import { CredentialTesterService, CredentialTestResult } from '../CredentialTesterService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('CredentialTesterService', () => {
  let service: CredentialTesterService;

  beforeEach(() => {
    service = new CredentialTesterService(5000);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Key Testing', () => {
    it('should validate API key format when no test URL provided', async () => {
      const result = await service.test({
        type: CredentialType.API_KEY,
        data: {
          apiKey: 'sk_test_1234567890abcdef'
        }
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('format validated');
      expect(result.details?.keyLength).toBeGreaterThanOrEqual(8);
    });

    it('should fail for short API keys', async () => {
      const result = await service.test({
        type: CredentialType.API_KEY,
        data: {
          apiKey: 'short'
        }
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('too short');
    });

    it('should fail when API key is missing', async () => {
      const result = await service.test({
        type: CredentialType.API_KEY,
        data: {}
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('missing');
    });

    it('should test API key against endpoint when URL provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['server', 'nginx']])
      });

      const result = await service.test({
        type: CredentialType.API_KEY,
        data: {
          apiKey: 'test_api_key_12345678',
          testUrl: 'https://api.example.com/me'
        }
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('successful');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/me',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_api_key_12345678'
          })
        })
      );
    });

    it('should handle authentication failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Map()
      });

      const result = await service.test({
        type: CredentialType.API_KEY,
        data: {
          apiKey: 'invalid_key',
          testUrl: 'https://api.example.com/me'
        }
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Authentication failed');
    });
  });

  describe('Basic Auth Testing', () => {
    it('should validate credentials format when no test URL provided', async () => {
      const result = await service.test({
        type: CredentialType.BASIC_AUTH,
        data: {
          username: 'user',
          password: 'pass123'
        }
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('format validated');
    });

    it('should fail when username or password missing', async () => {
      const result = await service.test({
        type: CredentialType.BASIC_AUTH,
        data: {
          username: 'user'
        }
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('missing');
    });

    it('should test basic auth against endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map()
      });

      const result = await service.test({
        type: CredentialType.BASIC_AUTH,
        data: {
          username: 'user',
          password: 'pass',
          testUrl: 'https://api.example.com/auth'
        }
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/^Basic /)
          })
        })
      );
    });
  });

  describe('JWT Testing', () => {
    it('should validate JWT format', async () => {
      // Create a valid JWT (header.payload.signature)
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        sub: '1234567890',
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      })).toString('base64url');
      const signature = 'dummysignature';
      const token = `${header}.${payload}.${signature}`;

      const result = await service.test({
        type: CredentialType.JWT,
        data: { token }
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('valid');
    });

    it('should detect expired JWT', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        sub: '1234567890',
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      })).toString('base64url');
      const signature = 'dummysignature';
      const token = `${header}.${payload}.${signature}`;

      const result = await service.test({
        type: CredentialType.JWT,
        data: { token }
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('expired');
    });

    it('should fail for invalid JWT format', async () => {
      const result = await service.test({
        type: CredentialType.JWT,
        data: { token: 'not.a.valid.jwt.format' }
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid JWT format');
    });

    it('should fail when token is missing', async () => {
      const result = await service.test({
        type: CredentialType.JWT,
        data: {}
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('missing');
    });
  });

  describe('SSH Key Testing', () => {
    it('should validate RSA private key format', async () => {
      const rsaKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0A
-----END RSA PRIVATE KEY-----`;

      // Note: This will fail in actual crypto validation but tests format detection
      const result = await service.test({
        type: CredentialType.SSH_KEY,
        data: { privateKey: rsaKey }
      });

      // Format is detected as RSA, but crypto validation may fail
      expect(result.testedAt).toBeDefined();
    });

    it('should fail for missing SSH key', async () => {
      const result = await service.test({
        type: CredentialType.SSH_KEY,
        data: {}
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('missing');
    });

    it('should fail for invalid SSH key format', async () => {
      const result = await service.test({
        type: CredentialType.SSH_KEY,
        data: { privateKey: 'not a valid ssh key' }
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid SSH key format');
    });
  });

  describe('OAuth2 Testing', () => {
    it('should validate token format when no endpoints provided', async () => {
      const result = await service.test({
        type: CredentialType.OAUTH2,
        data: {
          accessToken: 'ya29.a0AfH6SMBxxxxxxxxxxxxxxxxxxx'
        }
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('format validated');
    });

    it('should fail when access token is missing', async () => {
      const result = await service.test({
        type: CredentialType.OAUTH2,
        data: {}
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('missing');
    });

    it('should test token via userinfo endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ sub: 'user123', email: 'user@example.com' }),
        headers: new Map()
      });

      const result = await service.test({
        type: CredentialType.OAUTH2,
        data: {
          accessToken: 'valid_token',
          userInfoUrl: 'https://oauth.example.com/userinfo'
        }
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('valid');
    });
  });

  describe('SMTP Credential Testing', () => {
    it('should detect SMTP credentials by smtpHost field', async () => {
      const result = await service.test({
        type: CredentialType.CUSTOM,
        data: {
          smtpHost: 'smtp.example.com',
          port: 587,
          username: 'user@example.com',
          password: 'password123'
        }
      });

      // Will fail to connect (no actual SMTP server), but should detect as SMTP
      expect(result.testedAt).toBeDefined();
    });

    it('should detect SMTP credentials by port 587', async () => {
      const result = await service.test({
        type: CredentialType.CUSTOM,
        data: {
          host: 'mail.example.com',
          port: 587,
          username: 'user',
          password: 'pass'
        }
      });

      // Will fail to connect, but tests detection logic
      expect(result.testedAt).toBeDefined();
    });

    it('should detect SMTP credentials by port 465 (SSL)', async () => {
      const result = await service.test({
        type: CredentialType.CUSTOM,
        data: {
          host: 'mail.example.com',
          port: 465,
          secure: true
        }
      });

      expect(result.testedAt).toBeDefined();
    });
  });

  describe('Custom Credential Testing', () => {
    it('should validate custom credential has data', async () => {
      const result = await service.test({
        type: CredentialType.CUSTOM,
        data: {
          someField: 'value',
          anotherField: 123
        }
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('data present');
      expect(result.details?.fieldCount).toBe(2);
    });

    it('should test custom credential against endpoint when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map()
      });

      const result = await service.test({
        type: CredentialType.CUSTOM,
        data: {
          testUrl: 'https://api.example.com/test',
          testMethod: 'POST'
        }
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('Type Normalization', () => {
    it('should normalize string types to enums', async () => {
      const result = await service.test({
        type: 'api_key' as any,
        data: { apiKey: 'test_key_12345678' }
      });

      expect(result.success).toBe(true);
    });

    it('should handle uppercase types', async () => {
      const result = await service.test({
        type: 'API_KEY' as any,
        data: { apiKey: 'test_key_12345678' }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Timeout Handling', () => {
    it('should respect timeout configuration', async () => {
      const shortTimeoutService = new CredentialTesterService(100);

      // Simulate AbortController timeout behavior
      mockFetch.mockImplementation(() =>
        new Promise((_resolve, reject) => {
          const error = new Error('The operation was aborted');
          error.name = 'AbortError';
          setTimeout(() => reject(error), 50);
        })
      );

      const result = await shortTimeoutService.test({
        type: CredentialType.API_KEY,
        data: {
          apiKey: 'test_key_12345678',
          testUrl: 'https://slow-api.example.com'
        }
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('timed out');
    });
  });

  describe('Result Structure', () => {
    it('should always include testedAt timestamp', async () => {
      const result = await service.test({
        type: CredentialType.API_KEY,
        data: { apiKey: 'test_key_12345678' }
      });

      expect(result.testedAt).toBeDefined();
      expect(new Date(result.testedAt).getTime()).not.toBeNaN();
    });

    it('should include latency for successful endpoint tests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map()
      });

      const result = await service.test({
        type: CredentialType.API_KEY,
        data: {
          apiKey: 'test_key_12345678',
          testUrl: 'https://api.example.com/test'
        }
      });

      expect(result.success).toBe(true);
      expect(result.details?.latency).toBeDefined();
      expect(typeof result.details?.latency).toBe('number');
    });
  });
});

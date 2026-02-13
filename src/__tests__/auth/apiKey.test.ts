/**
 * Comprehensive tests for APIKeyService
 * Target coverage: >85% (statements, branches, functions, lines)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIKeyService } from '../../backend/auth/APIKeyService';
import crypto from 'crypto';

// Mock dependencies
vi.mock('../../services/LoggingService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../../backend/security/EncryptionService', () => ({
  encryptionService: {
    encrypt: vi.fn((data) => `encrypted_${data}`),
    decrypt: vi.fn((data) => data.replace('encrypted_', ''))
  }
}));

// Mock crypto
vi.mock('crypto', () => ({
  default: {
    randomBytes: (size: number) => ({
      toString: (encoding: string) => {
        if (encoding === 'base64url') {
          return 'randomBase64UrlString' + Math.random().toString(36).substring(7);
        }
        return 'randomString';
      }
    }),
    randomUUID: () => 'api-key-' + Math.random().toString(36).substring(7),
    createHash: (algorithm: string) => ({
      update: (data: string) => ({
        digest: (encoding: string) => {
          return `hashed_${data}`;
        }
      })
    })
  }
}));

describe('APIKeyService', () => {
  let apiKeyService: APIKeyService;
  const testUserId = 'user-123';

  beforeEach(() => {
    apiKeyService = new APIKeyService();
    vi.clearAllMocks();
  });

  describe('API Key Creation', () => {
    it('should create new API key with valid options', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'Test API Key',
        userId: testUserId,
        scopes: ['workflow:read', 'workflow:execute']
      });

      expect(apiKey.id).toBeTruthy();
      expect(apiKey.name).toBe('Test API Key');
      expect(apiKey.userId).toBe(testUserId);
      expect(apiKey.scopes).toEqual(['workflow:read', 'workflow:execute']);
      expect(apiKey.status).toBe('active');
      expect(apiKey.usageCount).toBe(0);
      expect(apiKey.key).toBeTruthy();
      expect(apiKey.hashedKey).toBeTruthy();
    });

    it('should generate key with correct prefix for test environment', async () => {
      process.env.NODE_ENV = 'test';

      const apiKey = await apiKeyService.createAPIKey({
        name: 'Test Key',
        userId: testUserId,
        scopes: ['*']
      });

      expect(apiKey.prefix).toBe('sk_test_');
      expect(apiKey.key).toContain('sk_test_');
    });

    it('should generate key with correct prefix for production environment', async () => {
      process.env.NODE_ENV = 'production';

      const apiKey = await apiKeyService.createAPIKey({
        name: 'Prod Key',
        userId: testUserId,
        scopes: ['*']
      });

      expect(apiKey.prefix).toBe('sk_live_');
      expect(apiKey.key).toContain('sk_live_');

      process.env.NODE_ENV = 'test'; // Reset
    });

    it('should set expiration date when expiresInDays provided', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'Expiring Key',
        userId: testUserId,
        scopes: ['workflow:read'],
        expiresInDays: 30
      });

      expect(apiKey.expiresAt).toBeDefined();
      const expectedExpiration = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(apiKey.expiresAt!.getTime() - expectedExpiration.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it('should create key without expiration when not specified', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'No Expiry Key',
        userId: testUserId,
        scopes: ['*']
      });

      expect(apiKey.expiresAt).toBeUndefined();
    });

    it('should store rate limits in API key', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'Rate Limited Key',
        userId: testUserId,
        scopes: ['*'],
        rateLimit: {
          requestsPerHour: 100,
          requestsPerDay: 1000
        }
      });

      expect(apiKey.rateLimit).toEqual({
        requestsPerHour: 100,
        requestsPerDay: 1000
      });
    });

    it('should store IP whitelist', async () => {
      const ipWhitelist = ['192.168.1.1', '10.0.0.1'];

      const apiKey = await apiKeyService.createAPIKey({
        name: 'IP Restricted Key',
        userId: testUserId,
        scopes: ['*'],
        ipWhitelist
      });

      expect(apiKey.ipWhitelist).toEqual(ipWhitelist);
    });

    it('should store metadata', async () => {
      const metadata = {
        application: 'Test App',
        environment: 'staging',
        owner: 'Team A'
      };

      const apiKey = await apiKeyService.createAPIKey({
        name: 'Key with Metadata',
        userId: testUserId,
        scopes: ['*'],
        metadata
      });

      expect(apiKey.metadata).toEqual(metadata);
    });

    it('should initialize usage counters', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'Counter Test',
        userId: testUserId,
        scopes: ['*']
      });

      // Usage counters should be initialized
      expect(apiKeyService['usageCounters'].has(apiKey.id)).toBe(true);
    });
  });

  describe('API Key Validation', () => {
    it('should validate correct API key', async () => {
      const created = await apiKeyService.createAPIKey({
        name: 'Valid Key',
        userId: testUserId,
        scopes: ['*']
      });

      const validated = await apiKeyService.validateAPIKey(created.key);

      expect(validated).toBeDefined();
      expect(validated!.id).toBe(created.id);
      expect(validated!.userId).toBe(testUserId);
    });

    it('should return null for invalid API key', async () => {
      const validated = await apiKeyService.validateAPIKey('sk_test_invalid_key');

      expect(validated).toBeNull();
    });

    it('should reject revoked API key', async () => {
      const created = await apiKeyService.createAPIKey({
        name: 'To Be Revoked',
        userId: testUserId,
        scopes: ['*']
      });

      await apiKeyService.revokeAPIKey(created.id, 'admin-123', 'Testing revocation');

      const validated = await apiKeyService.validateAPIKey(created.key);

      expect(validated).toBeNull();
    });

    it('should reject expired API key', async () => {
      const created = await apiKeyService.createAPIKey({
        name: 'Expired Key',
        userId: testUserId,
        scopes: ['*'],
        expiresInDays: -1 // Already expired
      });

      const validated = await apiKeyService.validateAPIKey(created.key);

      expect(validated).toBeNull();
    });

    it('should mark key as expired on validation', async () => {
      const created = await apiKeyService.createAPIKey({
        name: 'Expiring Key',
        userId: testUserId,
        scopes: ['*'],
        expiresInDays: -1
      });

      await apiKeyService.validateAPIKey(created.key);

      const apiKey = await apiKeyService.getAPIKeyById(created.id);
      expect(apiKey!.status).toBe('expired');
    });
  });

  describe('API Key Verification', () => {
    it('should verify key with correct scopes', async () => {
      const created = await apiKeyService.createAPIKey({
        name: 'Scoped Key',
        userId: testUserId,
        scopes: ['workflow:read', 'workflow:execute']
      });

      const result = await apiKeyService.verifyAPIKey(created.key, ['workflow:read']);

      expect(result.valid).toBe(true);
      expect(result.apiKey).toBeDefined();
    });

    it('should reject key with insufficient scopes', async () => {
      const created = await apiKeyService.createAPIKey({
        name: 'Limited Key',
        userId: testUserId,
        scopes: ['workflow:read']
      });

      const result = await apiKeyService.verifyAPIKey(created.key, ['workflow:delete']);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Insufficient scopes');
    });

    it('should accept wildcard scope for any permission', async () => {
      const created = await apiKeyService.createAPIKey({
        name: 'Wildcard Key',
        userId: testUserId,
        scopes: ['*']
      });

      const result = await apiKeyService.verifyAPIKey(created.key, ['workflow:delete', 'user:create']);

      expect(result.valid).toBe(true);
    });

    it('should verify multiple required scopes', async () => {
      const created = await apiKeyService.createAPIKey({
        name: 'Multi Scope Key',
        userId: testUserId,
        scopes: ['workflow:read', 'workflow:execute', 'credential:read']
      });

      const result = await apiKeyService.verifyAPIKey(created.key, [
        'workflow:read',
        'credential:read'
      ]);

      expect(result.valid).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within hourly limit', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'Rate Limited',
        userId: testUserId,
        scopes: ['*'],
        rateLimit: {
          requestsPerHour: 100,
          requestsPerDay: 1000
        }
      });

      const result = await apiKeyService.checkRateLimit(apiKey);

      expect(result.allowed).toBe(true);
    });

    it('should block requests exceeding hourly limit', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'Rate Limited',
        userId: testUserId,
        scopes: ['*'],
        rateLimit: {
          requestsPerHour: 5,
          requestsPerDay: 1000
        }
      });

      // Simulate 5 requests
      for (let i = 0; i < 5; i++) {
        await apiKeyService.recordUsage(apiKey, {
          endpoint: '/api/test',
          ipAddress: '127.0.0.1',
          statusCode: 200,
          responseTime: 100
        });
      }

      const result = await apiKeyService.checkRateLimit(apiKey);

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(0);
      expect(result.resetTime).toBeDefined();
    });

    it('should block requests exceeding daily limit', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'Daily Limited',
        userId: testUserId,
        scopes: ['*'],
        rateLimit: {
          requestsPerHour: 1000,
          requestsPerDay: 3
        }
      });

      // Simulate 3 requests
      for (let i = 0; i < 3; i++) {
        await apiKeyService.recordUsage(apiKey, {
          endpoint: '/api/test',
          ipAddress: '127.0.0.1',
          statusCode: 200,
          responseTime: 100
        });
      }

      const result = await apiKeyService.checkRateLimit(apiKey);

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(3);
    });

    it('should allow unlimited requests when no rate limit set', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'Unlimited',
        userId: testUserId,
        scopes: ['*']
      });

      const result = await apiKeyService.checkRateLimit(apiKey);

      expect(result.allowed).toBe(true);
    });
  });

  describe('Usage Recording', () => {
    it('should record API key usage', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'Usage Test',
        userId: testUserId,
        scopes: ['*']
      });

      await apiKeyService.recordUsage(apiKey, {
        endpoint: '/api/workflows',
        ipAddress: '192.168.1.1',
        statusCode: 200,
        responseTime: 150
      });

      expect(apiKey.lastUsedAt).toBeDefined();
      expect(apiKey.usageCount).toBe(1);
    });

    it('should increment usage count', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'Count Test',
        userId: testUserId,
        scopes: ['*']
      });

      expect(apiKey.usageCount).toBe(0);

      await apiKeyService.recordUsage(apiKey, {
        endpoint: '/api/test',
        ipAddress: '127.0.0.1',
        statusCode: 200,
        responseTime: 100
      });

      expect(apiKey.usageCount).toBe(1);

      await apiKeyService.recordUsage(apiKey, {
        endpoint: '/api/test',
        ipAddress: '127.0.0.1',
        statusCode: 200,
        responseTime: 100
      });

      expect(apiKey.usageCount).toBe(2);
    });

    it('should store usage history', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'History Test',
        userId: testUserId,
        scopes: ['*']
      });

      await apiKeyService.recordUsage(apiKey, {
        endpoint: '/api/workflows',
        ipAddress: '192.168.1.1',
        userAgent: 'TestClient/1.0',
        statusCode: 200,
        responseTime: 150
      });

      const usageHistory = apiKeyService['keyUsage'].get(apiKey.id);
      expect(usageHistory).toBeDefined();
      expect(usageHistory!.length).toBe(1);
      expect(usageHistory![0].endpoint).toBe('/api/workflows');
    });

    it('should limit usage history to 1000 records', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'Large History',
        userId: testUserId,
        scopes: ['*']
      });

      // Simulate 1100 requests
      for (let i = 0; i < 1100; i++) {
        await apiKeyService.recordUsage(apiKey, {
          endpoint: '/api/test',
          ipAddress: '127.0.0.1',
          statusCode: 200,
          responseTime: 100
        });
      }

      const usageHistory = apiKeyService['keyUsage'].get(apiKey.id);
      expect(usageHistory!.length).toBe(1000);
    });
  });

  describe('IP Whitelist', () => {
    it('should allow requests from whitelisted IP', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'IP Restricted',
        userId: testUserId,
        scopes: ['*'],
        ipWhitelist: ['192.168.1.1', '10.0.0.1']
      });

      const allowed = await apiKeyService.verifyIPWhitelist(apiKey, '192.168.1.1');

      expect(allowed).toBe(true);
    });

    it('should block requests from non-whitelisted IP', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'IP Restricted',
        userId: testUserId,
        scopes: ['*'],
        ipWhitelist: ['192.168.1.1']
      });

      const allowed = await apiKeyService.verifyIPWhitelist(apiKey, '192.168.1.2');

      expect(allowed).toBe(false);
    });

    it('should allow all IPs when no whitelist configured', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'No Restriction',
        userId: testUserId,
        scopes: ['*']
      });

      const allowed = await apiKeyService.verifyIPWhitelist(apiKey, '1.2.3.4');

      expect(allowed).toBe(true);
    });

    it('should allow all IPs when whitelist is empty', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'Empty Whitelist',
        userId: testUserId,
        scopes: ['*'],
        ipWhitelist: []
      });

      const allowed = await apiKeyService.verifyIPWhitelist(apiKey, '1.2.3.4');

      expect(allowed).toBe(true);
    });
  });

  describe('API Key Revocation', () => {
    it('should revoke API key', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'To Revoke',
        userId: testUserId,
        scopes: ['*']
      });

      const revoked = await apiKeyService.revokeAPIKey(apiKey.id, 'admin-123', 'Security breach');

      expect(revoked).toBe(true);
      expect(apiKey.status).toBe('revoked');
      expect(apiKey.revokedAt).toBeDefined();
      expect(apiKey.revokedBy).toBe('admin-123');
      expect(apiKey.revokedReason).toBe('Security breach');
    });

    it('should return false when revoking non-existent key', async () => {
      const revoked = await apiKeyService.revokeAPIKey('non-existent-id', 'admin-123');

      expect(revoked).toBe(false);
    });

    it('should allow revocation without reason', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'To Revoke',
        userId: testUserId,
        scopes: ['*']
      });

      const revoked = await apiKeyService.revokeAPIKey(apiKey.id, 'admin-123');

      expect(revoked).toBe(true);
      expect(apiKey.revokedReason).toBeUndefined();
    });
  });

  describe('API Key Retrieval', () => {
    it('should get user API keys', async () => {
      await apiKeyService.createAPIKey({
        name: 'Key 1',
        userId: testUserId,
        scopes: ['*']
      });

      await apiKeyService.createAPIKey({
        name: 'Key 2',
        userId: testUserId,
        scopes: ['workflow:read']
      });

      const userKeys = await apiKeyService.getUserAPIKeys(testUserId);

      expect(userKeys.length).toBe(2);
      expect(userKeys[0].userId).toBe(testUserId);
      expect(userKeys[1].userId).toBe(testUserId);
    });

    it('should not expose full key when retrieving user keys', async () => {
      await apiKeyService.createAPIKey({
        name: 'Secret Key',
        userId: testUserId,
        scopes: ['*']
      });

      const userKeys = await apiKeyService.getUserAPIKeys(testUserId);

      expect(userKeys[0].key).toBeUndefined();
    });

    it('should return empty array for user with no keys', async () => {
      const userKeys = await apiKeyService.getUserAPIKeys('no-keys-user');

      expect(userKeys).toEqual([]);
    });

    it('should get API key by ID', async () => {
      const created = await apiKeyService.createAPIKey({
        name: 'Find Me',
        userId: testUserId,
        scopes: ['*']
      });

      const found = await apiKeyService.getAPIKeyById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe('Find Me');
    });

    it('should not expose full key when getting by ID', async () => {
      const created = await apiKeyService.createAPIKey({
        name: 'Secret',
        userId: testUserId,
        scopes: ['*']
      });

      const found = await apiKeyService.getAPIKeyById(created.id);

      expect(found!.key).toBeUndefined();
    });

    it('should return null for non-existent key ID', async () => {
      const found = await apiKeyService.getAPIKeyById('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('Usage Statistics', () => {
    it('should get usage statistics for API key', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'Stats Test',
        userId: testUserId,
        scopes: ['*']
      });

      await apiKeyService.recordUsage(apiKey, {
        endpoint: '/api/workflows',
        ipAddress: '127.0.0.1',
        statusCode: 200,
        responseTime: 150
      });

      const stats = await apiKeyService.getUsageStats(apiKey.id);

      expect(stats).toBeDefined();
      expect(stats!.totalRequests).toBe(1);
      expect(stats!.lastUsedAt).toBeDefined();
      expect(stats!.requestsByDay.size).toBeGreaterThan(0);
      expect(stats!.requestsByEndpoint.size).toBeGreaterThan(0);
    });

    it('should calculate average response time', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'Response Time Test',
        userId: testUserId,
        scopes: ['*']
      });

      await apiKeyService.recordUsage(apiKey, {
        endpoint: '/api/test',
        ipAddress: '127.0.0.1',
        statusCode: 200,
        responseTime: 100
      });

      await apiKeyService.recordUsage(apiKey, {
        endpoint: '/api/test',
        ipAddress: '127.0.0.1',
        statusCode: 200,
        responseTime: 200
      });

      const stats = await apiKeyService.getUsageStats(apiKey.id);

      expect(stats!.averageResponseTime).toBe(150);
    });

    it('should return null for non-existent key', async () => {
      const stats = await apiKeyService.getUsageStats('non-existent');

      expect(stats).toBeNull();
    });
  });

  describe('API Key Rotation', () => {
    it('should rotate API key', async () => {
      const oldKey = await apiKeyService.createAPIKey({
        name: 'Original Key',
        userId: testUserId,
        scopes: ['workflow:read']
      });

      const newKey = await apiKeyService.rotateAPIKey(oldKey.id);

      expect(newKey).toBeDefined();
      expect(newKey!.id).not.toBe(oldKey.id);
      expect(newKey!.name).toContain('rotated');
      expect(newKey!.scopes).toEqual(oldKey.scopes);
      expect(newKey!.status).toBe('active');

      // Old key should be revoked
      const oldKeyStatus = await apiKeyService.getAPIKeyById(oldKey.id);
      expect(oldKeyStatus!.status).toBe('revoked');
    });

    it('should preserve settings when rotating', async () => {
      const oldKey = await apiKeyService.createAPIKey({
        name: 'Original',
        userId: testUserId,
        scopes: ['*'],
        rateLimit: {
          requestsPerHour: 100,
          requestsPerDay: 1000
        },
        ipWhitelist: ['192.168.1.1'],
        metadata: { app: 'test' }
      });

      const newKey = await apiKeyService.rotateAPIKey(oldKey.id);

      expect(newKey!.rateLimit).toEqual(oldKey.rateLimit);
      expect(newKey!.ipWhitelist).toEqual(oldKey.ipWhitelist);
      expect(newKey!.metadata).toEqual(oldKey.metadata);
    });

    it('should return null when rotating non-existent key', async () => {
      const newKey = await apiKeyService.rotateAPIKey('non-existent');

      expect(newKey).toBeNull();
    });
  });

  describe('Cleanup Operations', () => {
    it('should mark expired keys during cleanup', async () => {
      await apiKeyService.createAPIKey({
        name: 'Expired',
        userId: testUserId,
        scopes: ['*'],
        expiresInDays: -1
      });

      const result = await apiKeyService.cleanup();

      expect(result.expiredKeys).toBe(1);
    });

    it('should clean old usage records', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'Old Usage',
        userId: testUserId,
        scopes: ['*']
      });

      // Manually add old usage counters
      const counters = apiKeyService['usageCounters'].get(apiKey.id)!;
      const oldHour = Math.floor((Date.now() - 31 * 24 * 60 * 60 * 1000) / (60 * 60 * 1000));
      counters.hourly.set(oldHour, 10);

      const result = await apiKeyService.cleanup();

      expect(result.oldUsageRecords).toBeGreaterThan(0);
    });

    it('should not affect active keys during cleanup', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'Active Key',
        userId: testUserId,
        scopes: ['*'],
        expiresInDays: 30
      });

      await apiKeyService.cleanup();

      const found = await apiKeyService.getAPIKeyById(apiKey.id);
      expect(found!.status).toBe('active');
    });
  });

  describe('Statistics', () => {
    it('should get global API key statistics', async () => {
      await apiKeyService.createAPIKey({
        name: 'Key 1',
        userId: 'user-1',
        scopes: ['*']
      });

      await apiKeyService.createAPIKey({
        name: 'Key 2',
        userId: 'user-2',
        scopes: ['*']
      });

      const key3 = await apiKeyService.createAPIKey({
        name: 'Key 3',
        userId: 'user-1',
        scopes: ['*']
      });

      await apiKeyService.revokeAPIKey(key3.id, 'admin');

      const stats = await apiKeyService.getStats();

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.revoked).toBe(1);
      expect(stats.byUser.get('user-1')).toBe(2);
      expect(stats.byUser.get('user-2')).toBe(1);
    });
  });

  describe('Security', () => {
    it('should hash API keys for storage', async () => {
      const apiKey = await apiKeyService.createAPIKey({
        name: 'Hashed',
        userId: testUserId,
        scopes: ['*']
      });

      expect(apiKey.hashedKey).toBeTruthy();
      expect(apiKey.hashedKey).not.toBe(apiKey.key);
      expect(apiKey.hashedKey).toContain('hashed_');
    });

    it('should generate unique keys', async () => {
      const key1 = await apiKeyService.createAPIKey({
        name: 'Key 1',
        userId: testUserId,
        scopes: ['*']
      });

      const key2 = await apiKeyService.createAPIKey({
        name: 'Key 2',
        userId: testUserId,
        scopes: ['*']
      });

      expect(key1.key).not.toBe(key2.key);
      expect(key1.hashedKey).not.toBe(key2.hashedKey);
    });
  });
});

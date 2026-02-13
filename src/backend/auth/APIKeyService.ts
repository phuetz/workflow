/**
 * API Key Management Service
 * Complete API key lifecycle management with rate limiting and scopes
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../services/SimpleLogger';
import { encryptionService } from '../security/EncryptionService';

export interface APIKey {
  id: string;
  name: string;
  key: string; // Full key (only shown once at creation)
  hashedKey: string; // Stored hash
  prefix: string; // e.g., 'sk_live_'
  userId: string;
  scopes: string[];
  metadata?: Record<string, unknown>;
  rateLimit?: {
    requestsPerHour: number;
    requestsPerDay: number;
  };
  ipWhitelist?: string[];
  status: 'active' | 'revoked' | 'expired';
  lastUsedAt?: Date;
  usageCount: number;
  createdAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  revokedBy?: string;
  revokedReason?: string;
}

export interface APIKeyCreateOptions {
  name: string;
  userId: string;
  scopes: string[];
  expiresInDays?: number;
  rateLimit?: {
    requestsPerHour: number;
    requestsPerDay: number;
  };
  ipWhitelist?: string[];
  metadata?: Record<string, unknown>;
}

export interface APIKeyUsage {
  keyId: string;
  timestamp: Date;
  endpoint: string;
  ipAddress: string;
  userAgent?: string;
  statusCode: number;
  responseTime: number;
}

export class APIKeyService {
  private apiKeys: Map<string, APIKey> = new Map(); // hashedKey -> APIKey
  private userKeys: Map<string, Set<string>> = new Map(); // userId -> set of key IDs
  private keyUsage: Map<string, APIKeyUsage[]> = new Map(); // keyId -> usage history
  private usageCounters: Map<string, {
    hourly: Map<number, number>; // timestamp hour -> count
    daily: Map<string, number>; // date string -> count
  }> = new Map();

  constructor() {
    logger.info('APIKeyService initialized');
  }

  /**
   * Create new API key
   */
  async createAPIKey(options: APIKeyCreateOptions): Promise<APIKey> {
    // Generate key prefix based on environment
    const environment = process.env.NODE_ENV === 'production' ? 'live' : 'test';
    const prefix = `sk_${environment}_`;

    // Generate secure random key
    const randomPart = crypto.randomBytes(32).toString('base64url');
    const fullKey = `${prefix}${randomPart}`;

    // Hash the key for storage
    const hashedKey = await this.hashAPIKey(fullKey);

    // Calculate expiration
    const expiresAt = options.expiresInDays
      ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    const apiKey: APIKey = {
      id: uuidv4(),
      name: options.name,
      key: fullKey, // Only shown once at creation
      hashedKey,
      prefix,
      userId: options.userId,
      scopes: options.scopes,
      metadata: options.metadata,
      rateLimit: options.rateLimit,
      ipWhitelist: options.ipWhitelist,
      status: 'active',
      usageCount: 0,
      createdAt: new Date(),
      expiresAt
    };

    // Store API key
    this.apiKeys.set(hashedKey, apiKey);

    // Add to user's keys
    let userKeySet = this.userKeys.get(options.userId);
    if (!userKeySet) {
      userKeySet = new Set();
      this.userKeys.set(options.userId, userKeySet);
    }
    userKeySet.add(apiKey.id);

    // Initialize usage counters
    this.usageCounters.set(apiKey.id, {
      hourly: new Map(),
      daily: new Map()
    });

    logger.info('API key created', {
      keyId: apiKey.id,
      userId: options.userId,
      name: options.name,
      scopes: options.scopes
    });

    return apiKey;
  }

  /**
   * Validate and retrieve API key
   */
  async validateAPIKey(key: string): Promise<APIKey | null> {
    // Hash the provided key
    const hashedKey = await this.hashAPIKey(key);

    // Find the API key
    const apiKey = this.apiKeys.get(hashedKey);
    if (!apiKey) {
      logger.warn('API key validation failed: key not found');
      return null;
    }

    // Check if revoked
    if (apiKey.status === 'revoked') {
      logger.warn('API key validation failed: key revoked', { keyId: apiKey.id });
      return null;
    }

    // Check if expired
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      apiKey.status = 'expired';
      logger.warn('API key validation failed: key expired', { keyId: apiKey.id });
      return null;
    }

    return apiKey;
  }

  /**
   * Verify API key and check permissions
   */
  async verifyAPIKey(key: string, requiredScopes: string[]): Promise<{
    valid: boolean;
    apiKey?: APIKey;
    reason?: string;
  }> {
    const apiKey = await this.validateAPIKey(key);

    if (!apiKey) {
      return { valid: false, reason: 'Invalid or expired API key' };
    }

    // Check scopes
    const hasRequiredScopes = requiredScopes.every(scope =>
      apiKey.scopes.includes(scope) || apiKey.scopes.includes('*')
    );

    if (!hasRequiredScopes) {
      logger.warn('API key scope verification failed', {
        keyId: apiKey.id,
        required: requiredScopes,
        available: apiKey.scopes
      });
      return { valid: false, reason: 'Insufficient scopes' };
    }

    return { valid: true, apiKey };
  }

  /**
   * Check rate limit for API key
   */
  async checkRateLimit(apiKey: APIKey): Promise<{
    allowed: boolean;
    limit?: number;
    remaining?: number;
    resetTime?: Date;
  }> {
    if (!apiKey.rateLimit) {
      return { allowed: true };
    }

    const counters = this.usageCounters.get(apiKey.id);
    if (!counters) {
      return { allowed: true };
    }

    const now = new Date();
    const currentHour = Math.floor(now.getTime() / (60 * 60 * 1000));
    const currentDate = now.toISOString().split('T')[0];

    // Check hourly limit
    if (apiKey.rateLimit.requestsPerHour) {
      const hourlyCount = counters.hourly.get(currentHour) || 0;
      if (hourlyCount >= apiKey.rateLimit.requestsPerHour) {
        const resetTime = new Date((currentHour + 1) * 60 * 60 * 1000);
        return {
          allowed: false,
          limit: apiKey.rateLimit.requestsPerHour,
          remaining: 0,
          resetTime
        };
      }
    }

    // Check daily limit
    if (apiKey.rateLimit.requestsPerDay) {
      const dailyCount = counters.daily.get(currentDate) || 0;
      if (dailyCount >= apiKey.rateLimit.requestsPerDay) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return {
          allowed: false,
          limit: apiKey.rateLimit.requestsPerDay,
          remaining: 0,
          resetTime: tomorrow
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Record API key usage
   */
  async recordUsage(
    apiKey: APIKey,
    usage: Omit<APIKeyUsage, 'keyId' | 'timestamp'>
  ): Promise<void> {
    const now = new Date();
    const currentHour = Math.floor(now.getTime() / (60 * 60 * 1000));
    const currentDate = now.toISOString().split('T')[0];

    // Update usage counters
    const counters = this.usageCounters.get(apiKey.id);
    if (counters) {
      counters.hourly.set(currentHour, (counters.hourly.get(currentHour) || 0) + 1);
      counters.daily.set(currentDate, (counters.daily.get(currentDate) || 0) + 1);
    }

    // Record detailed usage
    let usageHistory = this.keyUsage.get(apiKey.id);
    if (!usageHistory) {
      usageHistory = [];
      this.keyUsage.set(apiKey.id, usageHistory);
    }

    const usageRecord: APIKeyUsage = {
      ...usage,
      keyId: apiKey.id,
      timestamp: now
    };

    usageHistory.push(usageRecord);

    // Keep only last 1000 usage records
    if (usageHistory.length > 1000) {
      usageHistory.splice(0, usageHistory.length - 1000);
    }

    // Update API key
    apiKey.lastUsedAt = now;
    apiKey.usageCount++;

    logger.debug('API key usage recorded', {
      keyId: apiKey.id,
      endpoint: usage.endpoint,
      statusCode: usage.statusCode
    });
  }

  /**
   * Verify IP whitelist
   */
  async verifyIPWhitelist(apiKey: APIKey, ipAddress: string): Promise<boolean> {
    if (!apiKey.ipWhitelist || apiKey.ipWhitelist.length === 0) {
      return true; // No whitelist configured
    }

    const isAllowed = apiKey.ipWhitelist.some(allowedIP => {
      // Support CIDR notation in the future
      return allowedIP === ipAddress;
    });

    if (!isAllowed) {
      logger.warn('IP address not in whitelist', {
        keyId: apiKey.id,
        ipAddress,
        whitelist: apiKey.ipWhitelist
      });
    }

    return isAllowed;
  }

  /**
   * Revoke API key
   */
  async revokeAPIKey(
    keyId: string,
    revokedBy: string,
    reason?: string
  ): Promise<boolean> {
    // Find the API key
    let foundKey: APIKey | undefined;
    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.id === keyId) {
        foundKey = apiKey;
        break;
      }
    }

    if (!foundKey) {
      logger.warn('API key revocation failed: key not found', { keyId });
      return false;
    }

    // Revoke the key
    foundKey.status = 'revoked';
    foundKey.revokedAt = new Date();
    foundKey.revokedBy = revokedBy;
    foundKey.revokedReason = reason;

    logger.info('API key revoked', {
      keyId,
      revokedBy,
      reason
    });

    return true;
  }

  /**
   * Get API keys for user
   */
  async getUserAPIKeys(userId: string): Promise<APIKey[]> {
    const keyIds = this.userKeys.get(userId);
    if (!keyIds) {
      return [];
    }

    const keys: APIKey[] = [];
    for (const apiKey of this.apiKeys.values()) {
      if (keyIds.has(apiKey.id)) {
        // Don't include the full key
        const { key, ...keyWithoutSecret } = apiKey;
        keys.push(keyWithoutSecret as APIKey);
      }
    }

    return keys;
  }

  /**
   * Get API key by ID
   */
  async getAPIKeyById(keyId: string): Promise<APIKey | null> {
    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.id === keyId) {
        // Don't include the full key
        const { key, ...keyWithoutSecret } = apiKey;
        return keyWithoutSecret as APIKey;
      }
    }
    return null;
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStats(keyId: string): Promise<{
    totalRequests: number;
    lastUsedAt?: Date;
    requestsByDay: Map<string, number>;
    requestsByEndpoint: Map<string, number>;
    averageResponseTime: number;
  } | null> {
    const apiKey = await this.getAPIKeyById(keyId);
    if (!apiKey) {
      return null;
    }

    const usageHistory = this.keyUsage.get(keyId) || [];

    const requestsByDay = new Map<string, number>();
    const requestsByEndpoint = new Map<string, number>();
    let totalResponseTime = 0;

    for (const usage of usageHistory) {
      const date = usage.timestamp.toISOString().split('T')[0];
      requestsByDay.set(date, (requestsByDay.get(date) || 0) + 1);
      requestsByEndpoint.set(usage.endpoint, (requestsByEndpoint.get(usage.endpoint) || 0) + 1);
      totalResponseTime += usage.responseTime;
    }

    return {
      totalRequests: apiKey.usageCount,
      lastUsedAt: apiKey.lastUsedAt,
      requestsByDay,
      requestsByEndpoint,
      averageResponseTime: usageHistory.length > 0 ? totalResponseTime / usageHistory.length : 0
    };
  }

  /**
   * Rotate API key
   */
  async rotateAPIKey(keyId: string): Promise<APIKey | null> {
    const oldKey = await this.getAPIKeyById(keyId);
    if (!oldKey) {
      return null;
    }

    // Create new key with same settings
    const newKey = await this.createAPIKey({
      name: `${oldKey.name} (rotated)`,
      userId: oldKey.userId,
      scopes: oldKey.scopes,
      rateLimit: oldKey.rateLimit,
      ipWhitelist: oldKey.ipWhitelist,
      metadata: oldKey.metadata
    });

    // Revoke old key
    await this.revokeAPIKey(keyId, oldKey.userId, 'Key rotated');

    logger.info('API key rotated', {
      oldKeyId: keyId,
      newKeyId: newKey.id,
      userId: oldKey.userId
    });

    return newKey;
  }

  /**
   * Cleanup expired keys and old usage data
   */
  async cleanup(): Promise<{
    expiredKeys: number;
    oldUsageRecords: number;
  }> {
    const now = new Date();
    let expiredKeys = 0;
    let oldUsageRecords = 0;

    // Mark expired keys
    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.expiresAt && apiKey.expiresAt < now && apiKey.status === 'active') {
        apiKey.status = 'expired';
        expiredKeys++;
      }
    }

    // Clean up old usage counters (older than 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoHour = Math.floor(thirtyDaysAgo.getTime() / (60 * 60 * 1000));

    for (const [keyId, counters] of this.usageCounters.entries()) {
      // Clean hourly counters
      for (const hour of counters.hourly.keys()) {
        if (hour < thirtyDaysAgoHour) {
          counters.hourly.delete(hour);
          oldUsageRecords++;
        }
      }

      // Clean daily counters
      const thirtyDaysAgoDate = thirtyDaysAgo.toISOString().split('T')[0];
      for (const date of counters.daily.keys()) {
        if (date < thirtyDaysAgoDate) {
          counters.daily.delete(date);
          oldUsageRecords++;
        }
      }
    }

    logger.info('API key cleanup completed', {
      expiredKeys,
      oldUsageRecords
    });

    return { expiredKeys, oldUsageRecords };
  }

  // Private helper methods

  /**
   * Hash API key for storage
   */
  private async hashAPIKey(key: string): Promise<string> {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Get API key statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    revoked: number;
    expired: number;
    byUser: Map<string, number>;
  }> {
    let active = 0;
    let revoked = 0;
    let expired = 0;
    const byUser = new Map<string, number>();

    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.status === 'active') active++;
      else if (apiKey.status === 'revoked') revoked++;
      else if (apiKey.status === 'expired') expired++;

      byUser.set(apiKey.userId, (byUser.get(apiKey.userId) || 0) + 1);
    }

    return {
      total: this.apiKeys.size,
      active,
      revoked,
      expired,
      byUser
    };
  }
}

// Singleton instance
export const apiKeyService = new APIKeyService();

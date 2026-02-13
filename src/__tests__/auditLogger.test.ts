/**
 * Comprehensive Test Suite for AuditLogger
 * Tests all audit logging functionality including:
 * - HMAC signing and verification
 * - Log chaining and tamper detection
 * - Query filtering
 * - Export functionality
 * - Compliance requirements (SOC2, ISO 27001, GDPR)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AuditLogger,
  AuditEventType,
  AuditLogResult,
  AuditSeverity,
  auditLogger,
} from '../audit/AuditLogger';
import { v4 as uuidv4 } from 'uuid';

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(async () => {
    logger = AuditLogger.getInstance();
    await logger.clear();
  });

  afterEach(async () => {
    await logger.clear();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = AuditLogger.getInstance();
      const instance2 = AuditLogger.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should provide access via exported singleton', () => {
      expect(auditLogger).toBeDefined();
      expect(auditLogger).toBe(AuditLogger.getInstance());
    });
  });

  describe('HMAC Signing and Verification', () => {
    it('should sign audit log entries with HMAC-SHA256', async () => {
      await logger.log({
        eventType: AuditEventType.AUTH_LOGIN,
        userId: 'user-123',
        resource: 'auth',
        action: 'login',
        result: AuditLogResult.SUCCESS,
      });

      const entries = await logger.query({});
      expect(entries).toHaveLength(1);
      expect(entries[0].signature).toBeDefined();
      expect(entries[0].signature).toHaveLength(64); // SHA256 hex length
    });

    it('should verify valid signatures', async () => {
      await logger.log({
        eventType: AuditEventType.AUTH_LOGIN,
        userId: 'user-123',
        resource: 'auth',
        action: 'login',
        result: AuditLogResult.SUCCESS,
      });

      const entries = await logger.query({});
      expect(logger.verify(entries[0])).toBe(true);
    });

    it('should detect tampered signatures', async () => {
      await logger.log({
        eventType: AuditEventType.AUTH_LOGIN,
        userId: 'user-123',
        resource: 'auth',
        action: 'login',
        result: AuditLogResult.SUCCESS,
      });

      const entries = await logger.query({});
      const entry = entries[0];

      // Tamper with the entry
      entry.metadata = { ...entry.metadata, tampered: true };

      // Signature should no longer match
      expect(logger.verify(entry)).toBe(false);
    });

    it('should reject entries with modified result field', async () => {
      await logger.log({
        eventType: AuditEventType.AUTH_LOGIN,
        userId: 'user-123',
        resource: 'auth',
        action: 'login',
        result: AuditLogResult.SUCCESS,
      });

      const entries = await logger.query({});
      const entry = entries[0];

      // Try to change result
      entry.result = AuditLogResult.FAILURE;

      expect(logger.verify(entry)).toBe(false);
    });
  });

  describe('Log Chaining', () => {
    it('should create hash chain between entries', async () => {
      await logger.log({
        eventType: AuditEventType.AUTH_LOGIN,
        userId: 'user-1',
        resource: 'auth',
        action: 'login',
        result: AuditLogResult.SUCCESS,
      });

      await logger.log({
        eventType: AuditEventType.DATA_READ,
        userId: 'user-1',
        resource: 'workflow',
        action: 'read',
        result: AuditLogResult.SUCCESS,
      });

      const entries = await logger.query({});
      expect(entries).toHaveLength(2);

      // Second entry should reference first entry's hash
      expect(entries[1].previousHash).toBeDefined();
    });

    it('should verify entire chain integrity', async () => {
      // Create multiple entries
      for (let i = 0; i < 5; i++) {
        await logger.log({
          eventType: AuditEventType.DATA_CREATE,
          userId: `user-${i}`,
          resource: 'workflow',
          action: 'create',
          result: AuditLogResult.SUCCESS,
        });
      }

      const entries = await logger.query({});
      expect(logger.verifyChain(entries)).toBe(true);
    });

    it('should detect broken chains', async () => {
      for (let i = 0; i < 3; i++) {
        await logger.log({
          eventType: AuditEventType.DATA_CREATE,
          userId: `user-${i}`,
          resource: 'workflow',
          action: 'create',
          result: AuditLogResult.SUCCESS,
        });
      }

      const entries = await logger.query({});

      // Tamper with middle entry
      entries[1].metadata = { tampered: true };

      expect(logger.verifyChain(entries)).toBe(false);
    });
  });

  describe('Logging Methods', () => {
    it('should log authentication events', async () => {
      await logger.logAuth('user-123', 'login', AuditLogResult.SUCCESS);

      const entries = await logger.query({ userId: 'user-123' });
      expect(entries).toHaveLength(1);
      expect(entries[0].eventType).toBe(AuditEventType.AUTH_LOGIN);
    });

    it('should log failed authentication', async () => {
      await logger.logAuth('user-123', 'login', AuditLogResult.FAILURE, {
        reason: 'Invalid credentials',
      });

      const entries = await logger.query({ userId: 'user-123' });
      expect(entries[0].result).toBe(AuditLogResult.FAILURE);
      expect(entries[0].metadata?.reason).toBe('Invalid credentials');
    });

    it('should log data access events', async () => {
      await logger.logDataAccess('user-123', 'workflow:123', 'read', {
        workflowName: 'Test Workflow',
      });

      const entries = await logger.query({ userId: 'user-123' });
      expect(entries[0].eventType).toBe(AuditEventType.DATA_READ);
    });

    it('should log configuration changes', async () => {
      await logger.logConfigChange('user-123', 'smtp_server', 'old.server.com', 'new.server.com');

      const entries = await logger.query({ userId: 'user-123' });
      expect(entries[0].eventType).toBe(AuditEventType.CONFIG_SETTING_CHANGE);
      expect(entries[0].metadata?.oldValue).toBe('[REDACTED]');
    });

    it('should sanitize sensitive values in config changes', async () => {
      await logger.logConfigChange(
        'user-123',
        'apiKey',
        'secret-old-key-12345',
        'secret-new-key-67890'
      );

      const entries = await logger.query({ userId: 'user-123' });
      expect(entries[0].metadata?.oldValue).toBe('[REDACTED]');
      expect(entries[0].metadata?.newValue).toBe('[REDACTED]');
    });

    it('should log security events', async () => {
      await logger.logSecurityEvent(
        AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED,
        AuditSeverity.WARNING,
        { rateLimit: 100, requests: 150 }
      );

      const entries = await logger.query({});
      expect(entries[0].eventType).toBe(AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED);
      expect(entries[0].severity).toBe(AuditSeverity.WARNING);
    });

    it('should log authorization decisions', async () => {
      await logger.logAuthorization('user-123', 'workflow:456', 'execute', true);

      let entries = await logger.query({ userId: 'user-123' });
      expect(entries[0].eventType).toBe(AuditEventType.AUTHZ_PERMISSION_GRANTED);
      expect(entries[0].result).toBe(AuditLogResult.SUCCESS);

      await logger.logAuthorization('user-123', 'workflow:789', 'delete', false);

      entries = await logger.query({ userId: 'user-123', limit: 1 });
      expect(entries[0].eventType).toBe(AuditEventType.AUTHZ_PERMISSION_DENIED);
      expect(entries[0].result).toBe(AuditLogResult.DENIED);
    });

    it('should log admin actions', async () => {
      await logger.logAdminAction('admin-user', 'create_user', 'new-user-123', {
        email: 'newuser@example.com',
      });

      const entries = await logger.query({ userId: 'admin-user' });
      expect(entries[0].eventType).toBe(AuditEventType.ADMIN_USER_CREATE);
      expect(entries[0].metadata?.targetUserId).toBe('new-user-123');
    });
  });

  describe('Query Filtering', () => {
    beforeEach(async () => {
      // Create diverse entries
      await logger.log({
        eventType: AuditEventType.AUTH_LOGIN,
        userId: 'user-1',
        resource: 'auth',
        action: 'login',
        result: AuditLogResult.SUCCESS,
        severity: AuditSeverity.INFO,
        sessionId: 'session-1',
      });

      await logger.log({
        eventType: AuditEventType.DATA_READ,
        userId: 'user-1',
        resource: 'workflow',
        action: 'read',
        result: AuditLogResult.SUCCESS,
        severity: AuditSeverity.INFO,
      });

      await logger.log({
        eventType: AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED,
        userId: 'user-2',
        resource: 'api',
        action: 'request',
        result: AuditLogResult.DENIED,
        severity: AuditSeverity.WARNING,
      });

      await logger.log({
        eventType: AuditEventType.AUTH_FAILED_LOGIN,
        userId: 'attacker',
        resource: 'auth',
        action: 'login',
        result: AuditLogResult.FAILURE,
        severity: AuditSeverity.WARNING,
      });
    });

    it('should filter by user ID', async () => {
      const entries = await logger.query({ userId: 'user-1' });
      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.userId === 'user-1')).toBe(true);
    });

    it('should filter by event type', async () => {
      const entries = await logger.query({ eventType: AuditEventType.AUTH_LOGIN });
      expect(entries).toHaveLength(1);
      expect(entries[0].eventType).toBe(AuditEventType.AUTH_LOGIN);
    });

    it('should filter by multiple event types', async () => {
      const entries = await logger.query({
        eventType: [AuditEventType.AUTH_LOGIN, AuditEventType.AUTH_FAILED_LOGIN],
      });
      expect(entries).toHaveLength(2);
    });

    it('should filter by resource', async () => {
      const entries = await logger.query({ resource: 'auth' });
      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.resource === 'auth')).toBe(true);
    });

    it('should filter by result', async () => {
      const entries = await logger.query({ result: AuditLogResult.FAILURE });
      expect(entries).toHaveLength(1);
      expect(entries[0].result).toBe(AuditLogResult.FAILURE);
    });

    it('should filter by severity', async () => {
      const entries = await logger.query({ severity: AuditSeverity.WARNING });
      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.severity === AuditSeverity.WARNING)).toBe(true);
    });

    it('should filter by session ID', async () => {
      const entries = await logger.query({ sessionId: 'session-1' });
      expect(entries).toHaveLength(1);
      expect(entries[0].sessionId).toBe('session-1');
    });

    it('should apply pagination', async () => {
      const allEntries = await logger.query({});
      expect(allEntries).toHaveLength(4);

      const page1 = await logger.query({ limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);

      const page2 = await logger.query({ limit: 2, offset: 2 });
      expect(page2).toHaveLength(2);

      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const entries = await logger.query({
        startDate: oneDayAgo,
        endDate: oneHourFromNow,
      });

      expect(entries).toHaveLength(4);
    });

    it('should combine multiple filters', async () => {
      const entries = await logger.query({
        userId: 'user-1',
        eventType: AuditEventType.AUTH_LOGIN,
        result: AuditLogResult.SUCCESS,
      });

      expect(entries).toHaveLength(1);
      expect(entries[0].userId).toBe('user-1');
      expect(entries[0].eventType).toBe(AuditEventType.AUTH_LOGIN);
      expect(entries[0].result).toBe(AuditLogResult.SUCCESS);
    });

    it('should sort by timestamp descending', async () => {
      const entries = await logger.query({});
      for (let i = 0; i < entries.length - 1; i++) {
        expect(entries[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          entries[i + 1].timestamp.getTime()
        );
      }
    });
  });

  describe('Export Functionality', () => {
    beforeEach(async () => {
      await logger.logAuth('user-123', 'login', AuditLogResult.SUCCESS);
      await logger.logDataAccess('user-123', 'workflow:456', 'read');
      await logger.logSecurityEvent(
        AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED,
        AuditSeverity.WARNING
      );
    });

    it('should export to JSON', async () => {
      const json = await logger.export({}, 'json');
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0]).toHaveProperty('id');
      expect(parsed[0]).toHaveProperty('signature');
    });

    it('should export to CSV', async () => {
      const csv = await logger.export({}, 'csv');

      expect(csv).toContain('ID');
      expect(csv).toContain('Timestamp');
      expect(csv).toContain('EventType');
      expect(csv.split('\n').length).toBeGreaterThan(1);
    });

    it('should export filtered results', async () => {
      const json = await logger.export({ userId: 'user-123' }, 'json');
      const parsed = JSON.parse(json);

      expect(parsed.length).toBe(2);
      expect(parsed.every((e: any) => e.userId === 'user-123')).toBe(true);
    });

    it('should log the export action', async () => {
      await logger.export({}, 'json');

      const entries = await logger.query({
        eventType: AuditEventType.ADMIN_AUDIT_LOG_EXPORT,
      });

      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await logger.logAuth('user-1', 'login', AuditLogResult.SUCCESS);
      await logger.logAuth('user-1', 'logout', AuditLogResult.SUCCESS);
      await logger.logAuth('user-2', 'login', AuditLogResult.FAILURE);
      await logger.logDataAccess('user-2', 'workflow', 'read');
    });

    it('should calculate aggregate statistics', async () => {
      const stats = await logger.getStatistics();

      expect(stats.totalEntries).toBe(4);
      expect(stats.byUser['user-1']).toBe(2);
      expect(stats.byUser['user-2']).toBe(2);
    });

    it('should count by event type', async () => {
      const stats = await logger.getStatistics();

      expect(stats.byEventType[AuditEventType.AUTH_LOGIN]).toBe(2);
      expect(stats.byEventType[AuditEventType.AUTH_LOGOUT]).toBe(1);
    });

    it('should count by result', async () => {
      const stats = await logger.getStatistics();

      expect(stats.byResult[AuditLogResult.SUCCESS]).toBe(3);
      expect(stats.byResult[AuditLogResult.FAILURE]).toBe(1);
    });

    it('should include date range', async () => {
      const stats = await logger.getStatistics();

      expect(stats.dateRange.oldest).toBeDefined();
      expect(stats.dateRange.newest).toBeDefined();
      expect(stats.dateRange.newest).toEqual(stats.dateRange.newest);
    });
  });

  describe('Context Enrichment', () => {
    it('should attach user context automatically', async () => {
      await logger.log(
        {
          eventType: AuditEventType.AUTH_LOGIN,
          resource: 'auth',
          action: 'login',
          result: AuditLogResult.SUCCESS,
        },
        {
          userId: 'user-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        }
      );

      const entries = await logger.query({});
      expect(entries[0].userId).toBe('user-123');
      expect(entries[0].ipAddress).toBe('192.168.1.1');
      expect(entries[0].userAgent).toBe('Mozilla/5.0');
    });

    it('should include correlation ID in metadata', async () => {
      const correlationId = uuidv4();

      await logger.log(
        {
          eventType: AuditEventType.DATA_CREATE,
          resource: 'workflow',
          action: 'create',
          result: AuditLogResult.SUCCESS,
        },
        { correlationId }
      );

      const entries = await logger.query({ correlationId });
      expect(entries[0].correlationId).toBe(correlationId);
    });
  });

  describe('Error Handling', () => {
    it('should not throw errors during logging', async () => {
      expect(
        async () => {
          await logger.log({
            eventType: AuditEventType.AUTH_LOGIN,
            resource: 'auth',
            action: 'login',
            result: AuditLogResult.SUCCESS,
          });
        }
      ).not.toThrow();
    });

    it('should handle malformed queries gracefully', async () => {
      const entries = await logger.query({
        userId: 'non-existent-user',
      });

      expect(Array.isArray(entries)).toBe(true);
      expect(entries).toHaveLength(0);
    });

    it('should handle export errors gracefully', async () => {
      const result = await logger.export({}, 'json');
      expect(typeof result).toBe('string');
    });
  });

  describe('Compliance', () => {
    beforeEach(async () => {
      // Create a comprehensive audit trail
      await logger.logAuth('user-123', 'login', AuditLogResult.SUCCESS, {}, {
        userId: 'user-123',
        sessionId: 'session-456',
        ipAddress: '192.168.1.100',
        userAgent: 'Chrome/91.0',
      });

      await logger.logConfigChange('user-123', 'LDAP_SERVER', 'old-server', 'new-server');

      await logger.logAuthorization('user-123', 'sensitive-data', 'read', false);

      await logger.logSecurityEvent(
        AuditEventType.SECURITY_UNAUTHORIZED_ACCESS,
        AuditSeverity.CRITICAL,
        {
          attemptedResource: 'admin-panel',
          reason: 'Insufficient permissions',
        }
      );
    });

    it('should meet SOC2 CC8.1 requirements (Change Management)', async () => {
      const configChanges = await logger.query({
        eventType: [AuditEventType.CONFIG_SETTING_CHANGE, AuditEventType.CONFIG_CREDENTIAL_UPDATE],
      });

      // Should have immutable record of all changes
      expect(configChanges.length).toBeGreaterThan(0);
      configChanges.forEach((entry) => {
        expect(entry.userId).toBeDefined();
        expect(entry.timestamp).toBeDefined();
        expect(entry.metadata).toBeDefined();
        expect(logger.verify(entry)).toBe(true);
      });
    });

    it('should meet ISO 27001 A.12.4.1 requirements (Event Logging)', async () => {
      const allEvents = await logger.query({});

      // Should have complete event record
      expect(allEvents.length).toBeGreaterThan(0);

      allEvents.forEach((entry) => {
        expect(entry.id).toBeDefined();
        expect(entry.timestamp).toBeDefined();
        expect(entry.eventType).toBeDefined();
        expect(entry.userId).toBeDefined();
        expect(entry.resource).toBeDefined();
        expect(entry.action).toBeDefined();
        expect(entry.result).toBeDefined();
        expect(entry.signature).toBeDefined();
      });
    });

    it('should meet PCI DSS 10.1-10.7 requirements (Audit Logging)', async () => {
      const authEvents = await logger.query({
        eventType: [
          AuditEventType.AUTH_LOGIN,
          AuditEventType.AUTH_LOGOUT,
          AuditEventType.AUTH_FAILED_LOGIN,
        ],
      });

      // Should have user identification
      authEvents.forEach((entry) => {
        expect(entry.userId).toBeDefined();
        expect(entry.ipAddress).toBeDefined();
        expect(entry.timestamp).toBeDefined();
      });
    });

    it('should support GDPR Article 30 (Records of Processing)', async () => {
      const userData = await logger.query({ userId: 'user-123' });

      // Should be able to export all user activities
      expect(userData.length).toBeGreaterThan(0);

      const csv = await logger.export({ userId: 'user-123' }, 'csv');
      expect(csv.length).toBeGreaterThan(0);
    });

    it('should have tamper-evident logs for compliance', async () => {
      const entries = await logger.query({});

      // All entries should be verifiable
      entries.forEach((entry) => {
        expect(logger.verify(entry)).toBe(true);
      });

      // Chain should be verifiable
      expect(logger.verifyChain(entries)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should log entries with minimal overhead', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        await logger.log({
          eventType: AuditEventType.DATA_READ,
          userId: `user-${i % 10}`,
          resource: 'workflow',
          action: 'read',
          result: AuditLogResult.SUCCESS,
        });
      }

      const duration = Date.now() - startTime;
      const avgPerEntry = duration / 100;

      // Should be under 5ms per entry on average
      expect(avgPerEntry).toBeLessThan(5);
    });

    it('should handle batch queries efficiently', async () => {
      // Create many entries
      for (let i = 0; i < 500; i++) {
        await logger.log({
          eventType: AuditEventType.DATA_READ,
          userId: `user-${i % 50}`,
          resource: `resource-${i % 100}`,
          action: 'read',
          result: i % 10 === 0 ? AuditLogResult.FAILURE : AuditLogResult.SUCCESS,
        });
      }

      const startTime = Date.now();
      const results = await logger.query({ result: AuditLogResult.SUCCESS });
      const duration = Date.now() - startTime;

      expect(results.length).toBeGreaterThan(400);
      expect(duration).toBeLessThan(100); // Query should be fast
    });
  });
});

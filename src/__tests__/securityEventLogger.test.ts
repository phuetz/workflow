/**
 * Security Event Logger Tests
 * Comprehensive tests for threat detection and event logging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SecurityEventLogger,
  SecuritySeverity,
  SecurityCategory,
  type SecurityEvent,
  type ThreatAnalysis,
  type ThreatIndicators
} from '../audit/SecurityEventLogger';

describe('SecurityEventLogger', () => {
  let logger: SecurityEventLogger;

  beforeEach(() => {
    logger = new SecurityEventLogger();
  });

  afterEach(() => {
    logger.clear();
  });

  // Basic Event Logging Tests
  describe('Basic Event Logging', () => {
    it('should log a security event', async () => {
      const event = await logger.logEvent({
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.AUTH,
        eventType: 'auth.test',
        description: 'Test event',
        userId: 'user_123'
      });

      expect(event.id).toBeDefined();
      expect(event.id).toMatch(/^sec_/);
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.severity).toBe(SecuritySeverity.MEDIUM);
      expect(event.category).toBe(SecurityCategory.AUTH);
      expect(event.immutableHash).toBeDefined();
    });

    it('should calculate threat score automatically', async () => {
      const event = await logger.logEvent({
        severity: SecuritySeverity.CRITICAL,
        category: SecurityCategory.CREDENTIAL_COMPROMISE,
        eventType: 'cred.compromised',
        description: 'Credentials compromised'
      });

      expect(event.threatIndicators.score).toBeGreaterThanOrEqual(90);
    });

    it('should emit event:logged event', async () => {
      const spy = vi.fn();
      logger.on('event:logged', spy);

      await logger.logEvent({
        severity: SecuritySeverity.LOW,
        category: SecurityCategory.AUTH,
        eventType: 'auth.test',
        description: 'Test'
      });

      expect(spy).toHaveBeenCalled();
    });

    it('should maintain event chain integrity', async () => {
      const event1 = await logger.logEvent({
        severity: SecuritySeverity.LOW,
        category: SecurityCategory.AUTH,
        eventType: 'event.1',
        description: 'First event'
      });

      const event2 = await logger.logEvent({
        severity: SecuritySeverity.LOW,
        category: SecurityCategory.AUTH,
        eventType: 'event.2',
        description: 'Second event'
      });

      expect(event2.previousHash).toBe(event1.immutableHash);

      const verification = logger.verifyIntegrity();
      expect(verification.valid).toBe(true);
      expect(verification.errors).toHaveLength(0);
    });
  });

  // Authentication Tests
  describe('Authentication Events', () => {
    it('should log failed authentication', async () => {
      const event = await logger.logFailedAuth('user_123', 'Invalid password', {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        country: 'US'
      });

      expect(event.eventType).toBe('auth.failed');
      expect(event.category).toBe(SecurityCategory.AUTH);
      expect(event.severity).toBe(SecuritySeverity.LOW);
      expect(event.metadata?.reason).toBe('Invalid password');
    });

    it('should detect brute force patterns', async () => {
      // Log multiple failed attempts
      for (let i = 0; i < 6; i++) {
        await logger.logFailedAuth('user_123', 'Invalid password', {
          ipAddress: '192.168.1.1',
          country: 'US'
        });
      }

      // The 6th attempt should have higher threat score due to brute force
      const events = logger.getEventsByUser('user_123');
      const lastEvent = events[0];

      expect(lastEvent.threatIndicators.indicators).toContain('brute_force_pattern');
      expect(lastEvent.threatIndicators.score).toBeGreaterThan(40);
    });

    it('should track login attempts over time', async () => {
      await logger.logFailedAuth('user_123', 'Invalid', {
        ipAddress: '192.168.1.1',
        country: 'US'
      });

      // Analyze pattern
      const analysis = logger.analyzePattern('user_123', 3600000);

      expect(analysis.patterns.failedLogins).toBe(1);
      expect(analysis.eventCount).toBeGreaterThan(0);
    });
  });

  // Injection Attack Tests
  describe('Injection Attack Detection', () => {
    it('should log SQL injection attempts', async () => {
      const payload = "'; DROP TABLE users; --";
      const event = await logger.logInjectionAttempt('sql', payload, {
        ipAddress: '192.168.1.1',
        parameterName: 'username',
        endpoint: '/api/users/search'
      });

      expect(event.eventType).toBe('injection.sql');
      expect(event.category).toBe(SecurityCategory.INJECTION);
      expect(event.severity).toBe(SecuritySeverity.MEDIUM);
      expect(event.metadata?.type).toBe('sql');
      expect(event.metadata?.payloadLength).toBe(payload.length);
    });

    it('should log XSS injection attempts', async () => {
      const payload = '<script>alert("XSS")</script>';
      const event = await logger.logInjectionAttempt('xss', payload, {
        ipAddress: '192.168.1.1'
      });

      expect(event.eventType).toBe('injection.xss');
      expect(event.threatIndicators.indicators).toContain('malicious_input');
    });

    it('should escalate severity for large payloads', async () => {
      const largePayload = 'a'.repeat(11000); // > 10000 byte threshold
      const event = await logger.logInjectionAttempt('sql', largePayload, {
        ipAddress: '192.168.1.1'
      });

      expect(event.severity).toBe(SecuritySeverity.HIGH);
    });

    it('should include payload hash for tracking', async () => {
      const payload = "'; DROP TABLE users; --";
      const event = await logger.logInjectionAttempt('sql', payload, {
        ipAddress: '192.168.1.1'
      });

      expect(event.metadata?.payloadHash).toBeDefined();
      expect(event.metadata?.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  // Rate Limiting Tests
  describe('Rate Limit Violations', () => {
    it('should log rate limit violations', async () => {
      const event = await logger.logRateLimitViolation(
        '/api/workflows',
        100,
        450,
        {
          userId: 'user_123',
          ipAddress: '192.168.1.1'
        }
      );

      expect(event.eventType).toBe('ratelimit.exceeded');
      expect(event.category).toBe(SecurityCategory.RATE_LIMIT);
      expect(event.metadata?.actual).toBe(450);
      expect(event.metadata?.limit).toBe(100);
      expect(event.metadata?.violationRatio).toBe(4.5);
    });

    it('should escalate severity for extreme violations', async () => {
      const event = await logger.logRateLimitViolation(
        '/api/workflows',
        10,
        310, // 3100% violation
        {
          ipAddress: '192.168.1.1'
        }
      );

      expect(event.severity).toBe(SecuritySeverity.HIGH);
    });

    it('should track rate limit violations by resource', async () => {
      await logger.logRateLimitViolation('/api/resource1', 100, 150, {
        ipAddress: '192.168.1.1'
      });

      await logger.logRateLimitViolation('/api/resource2', 100, 150, {
        ipAddress: '192.168.1.1'
      });

      const events = logger.getEventsByCategory(SecurityCategory.RATE_LIMIT);
      expect(events).toHaveLength(2);
    });
  });

  // Permission Escalation Tests
  describe('Permission Escalation', () => {
    it('should log permission escalation attempts', async () => {
      const event = await logger.logPermissionEscalation('user_123', 'admin', {
        ipAddress: '192.168.1.1',
        currentRole: 'user',
        method: 'token_manipulation'
      });

      expect(event.eventType).toBe('permission.escalation_attempt');
      expect(event.category).toBe(SecurityCategory.PERMISSION);
      expect(event.severity).toBe(SecuritySeverity.HIGH);
      expect(event.metadata?.attemptedRole).toBe('admin');
    });

    it('should immediately trigger alert for escalation', async () => {
      const spy = vi.fn();
      logger.on('alert:triggered', spy);

      await logger.logPermissionEscalation('user_123', 'admin', {
        ipAddress: '192.168.1.1'
      });

      expect(spy).toHaveBeenCalled();
      const call = spy.mock.calls[0][0];
      expect(call.alertLevel).toBe(SecuritySeverity.HIGH);
    });
  });

  // Data Exfiltration Tests
  describe('Data Exfiltration', () => {
    it('should log data exfiltration with normal size', async () => {
      const size = 50 * 1024 * 1024; // 50 MB
      const event = await logger.logDataExfiltration(
        'Dataset export',
        size,
        {
          userId: 'user_123',
          ipAddress: '192.168.1.1',
          dataType: 'user_records',
          destination: 'external_api'
        }
      );

      expect(event.eventType).toBe('data.exfiltration');
      expect(event.severity).toBe(SecuritySeverity.HIGH);
      expect(event.metadata?.dataSize).toBe(size);
    });

    it('should escalate to CRITICAL for massive exports', async () => {
      const size = 150 * 1024 * 1024; // 150 MB
      const event = await logger.logDataExfiltration(
        'Massive export',
        size,
        {
          userId: 'user_123',
          ipAddress: '192.168.1.1'
        }
      );

      expect(event.severity).toBe(SecuritySeverity.CRITICAL);
    });
  });

  // Threat Scoring Tests
  describe('Threat Score Calculation', () => {
    it('should calculate threat score based on severity', async () => {
      const criticalEvent = await logger.logEvent({
        severity: SecuritySeverity.CRITICAL,
        category: SecurityCategory.AUTH,
        eventType: 'test',
        description: 'Test'
      });

      expect(criticalEvent.threatIndicators.score).toBeGreaterThanOrEqual(90);
    });

    it('should adjust score based on IP reputation', async () => {
      // Log many events from same IP to build bad reputation
      for (let i = 0; i < 25; i++) {
        await logger.logFailedAuth('user_' + i, 'Invalid', {
          ipAddress: '192.168.1.100'
        });
      }

      // New event from same IP should have higher threat score
      const event = await logger.logEvent({
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.AUTH,
        eventType: 'test',
        description: 'Test',
        ipAddress: '192.168.1.100'
      });

      expect(event.threatIndicators.score).toBeGreaterThan(50);
    });
  });

  // Impossible Travel Tests
  describe('Impossible Travel Detection', () => {
    it('should not detect impossible travel with single login', async () => {
      await logger.logFailedAuth('user_123', 'test', {
        ipAddress: '192.168.1.1',
        country: 'US'
      });

      const result = logger.detectImpossibleTravel('user_123');
      expect(result.detected).toBe(false);
    });

    it('should detect impossible travel from different countries', async () => {
      // First login from US
      await logger.logFailedAuth('user_123', 'test', {
        ipAddress: '192.168.1.1',
        country: 'US'
      });

      // Immediately log another attempt from UK (impossible in reality)
      await logger.logFailedAuth('user_123', 'test', {
        ipAddress: '10.0.0.1',
        country: 'UK'
      });

      const result = logger.detectImpossibleTravel('user_123');
      expect(result.detected).toBe(true);
      expect(result.indicators).toContain('impossible_travel');
    });
  });

  // Suspicious Activity Tests
  describe('Suspicious Activity Logging', () => {
    it('should log suspicious activity with custom indicators', async () => {
      const event = await logger.logSuspiciousActivity(
        'Unusual API pattern',
        SecuritySeverity.MEDIUM,
        {
          userId: 'user_123',
          ipAddress: '192.168.1.1',
          indicators: ['high_api_calls', 'non_business_hours'],
          riskFactors: ['pattern_deviation']
        }
      );

      expect(event.eventType).toBe('suspicious.activity');
      expect(event.threatIndicators.indicators).toContain('high_api_calls');
      expect(event.threatIndicators.riskFactors).toContain('pattern_deviation');
    });
  });

  // Query and Retrieval Tests
  describe('Event Querying and Retrieval', () => {
    beforeEach(async () => {
      // Create diverse events
      await logger.logEvent({
        severity: SecuritySeverity.CRITICAL,
        category: SecurityCategory.AUTH,
        eventType: 'critical',
        description: 'Critical event',
        userId: 'user_1',
        ipAddress: '192.168.1.1'
      });

      await logger.logEvent({
        severity: SecuritySeverity.HIGH,
        category: SecurityCategory.INJECTION,
        eventType: 'injection',
        description: 'Injection event',
        userId: 'user_2',
        ipAddress: '192.168.1.2'
      });

      await logger.logEvent({
        severity: SecuritySeverity.LOW,
        category: SecurityCategory.AUTH,
        eventType: 'low',
        description: 'Low event',
        userId: 'user_1',
        ipAddress: '192.168.1.1'
      });
    });

    it('should get events by severity', () => {
      const critical = logger.getEventsBySeverity(SecuritySeverity.CRITICAL);
      expect(critical).toHaveLength(1);
      expect(critical[0].severity).toBe(SecuritySeverity.CRITICAL);
    });

    it('should get events by category', () => {
      const injections = logger.getEventsByCategory(SecurityCategory.INJECTION);
      expect(injections).toHaveLength(1);
      expect(injections[0].category).toBe(SecurityCategory.INJECTION);
    });

    it('should get events by user', () => {
      const userEvents = logger.getEventsByUser('user_1');
      expect(userEvents).toHaveLength(2);
      expect(userEvents.every(e => e.userId === 'user_1')).toBe(true);
    });

    it('should get events by IP address', () => {
      const ipEvents = logger.getEventsByIP('192.168.1.1');
      expect(ipEvents).toHaveLength(2);
      expect(ipEvents.every(e => e.ipAddress === '192.168.1.1')).toBe(true);
    });

    it('should get events by time range', () => {
      const start = new Date(Date.now() - 1000);
      const end = new Date(Date.now() + 1000);
      const events = logger.getEventsByTimeRange(start, end);
      expect(events.length).toBeGreaterThan(0);
    });

    it('should enforce limit on retrieved events', () => {
      const events = logger.getEventsBySeverity(SecuritySeverity.HIGH, 10);
      expect(events.length).toBeLessThanOrEqual(10);
    });
  });

  // Statistics Tests
  describe('Security Statistics', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        await logger.logFailedAuth('user_' + i, 'invalid', {
          ipAddress: '192.168.1.' + i,
          country: 'US'
        });
      }

      await logger.logInjectionAttempt('sql', 'payload', {
        ipAddress: '192.168.1.100'
      });

      await logger.logRateLimitViolation('/api/test', 100, 500, {
        ipAddress: '192.168.1.100'
      });
    });

    it('should calculate total event count', () => {
      const stats = logger.getStatistics();
      expect(stats.totalEvents).toBeGreaterThan(5);
    });

    it('should count events by severity', () => {
      const stats = logger.getStatistics();
      expect(stats.eventsBySeverity[SecuritySeverity.LOW]).toBeGreaterThan(0);
    });

    it('should count events by category', () => {
      const stats = logger.getStatistics();
      expect(stats.eventsByCategory[SecurityCategory.AUTH]).toBeGreaterThan(0);
      expect(stats.eventsByCategory[SecurityCategory.INJECTION]).toBeGreaterThan(0);
      expect(stats.eventsByCategory[SecurityCategory.RATE_LIMIT]).toBeGreaterThan(0);
    });

    it('should identify top threatened users', () => {
      const stats = logger.getStatistics();
      expect(stats.topThreatenedUsers.length).toBeGreaterThan(0);
      expect(stats.topThreatenedUsers[0].userId).toBeDefined();
    });

    it('should identify suspicious IPs', () => {
      const stats = logger.getStatistics();
      expect(stats.topThreatenedIPs.length).toBeGreaterThan(0);
      expect(stats.topThreatenedIPs[0].ipAddress).toBeDefined();
    });

    it('should calculate average threat score', () => {
      const stats = logger.getStatistics();
      expect(stats.averageThreatScore).toBeGreaterThanOrEqual(0);
      expect(stats.averageThreatScore).toBeLessThanOrEqual(100);
    });
  });

  // Pattern Analysis Tests
  describe('Threat Pattern Analysis', () => {
    it('should analyze user threat patterns', async () => {
      // Create multiple failure events
      for (let i = 0; i < 4; i++) {
        await logger.logFailedAuth('user_123', 'invalid', {
          ipAddress: '192.168.1.1',
          country: 'US'
        });
      }

      const analysis = logger.analyzePattern('user_123', 3600000);

      expect(analysis.userId).toBe('user_123');
      expect(analysis.eventCount).toBe(4);
      expect(analysis.patterns.failedLogins).toBe(4);
    });

    it('should generate recommendations', async () => {
      // Create brute force scenario
      for (let i = 0; i < 10; i++) {
        await logger.logFailedAuth('user_123', 'invalid', {
          ipAddress: '192.168.1.1'
        });
      }

      const analysis = logger.analyzePattern('user_123', 3600000);

      expect(analysis.recommendations).toContain('Enforce MFA for this user');
      expect(analysis.recommendations).toContain('Reset user password');
    });

    it('should calculate risk score for user', async () => {
      await logger.logEvent({
        severity: SecuritySeverity.CRITICAL,
        category: SecurityCategory.CREDENTIAL_COMPROMISE,
        eventType: 'test',
        description: 'Critical',
        userId: 'user_123'
      });

      const analysis = logger.analyzePattern('user_123');
      expect(analysis.riskScore).toBeGreaterThan(0);
    });
  });

  // Alert Triggering Tests
  describe('Alert Triggering', () => {
    it('should trigger alert for CRITICAL events', async () => {
      const spy = vi.fn();
      logger.on('alert:triggered', spy);

      await logger.logEvent({
        severity: SecuritySeverity.CRITICAL,
        category: SecurityCategory.AUTH,
        eventType: 'test',
        description: 'Critical'
      });

      expect(spy).toHaveBeenCalled();
    });

    it('should trigger alert for HIGH severity with high threat score', async () => {
      const spy = vi.fn();
      logger.on('alert:triggered', spy);

      await logger.logEvent({
        severity: SecuritySeverity.HIGH,
        category: SecurityCategory.INJECTION,
        eventType: 'test',
        description: 'High threat',
        threatIndicators: {
          score: 80,
          indicators: ['test'],
          riskFactors: [],
          confidence: 0.9
        }
      });

      expect(spy).toHaveBeenCalled();
    });

    it('should not trigger alert for LOW severity events', async () => {
      const spy = vi.fn();
      logger.on('alert:triggered', spy);

      await logger.logEvent({
        severity: SecuritySeverity.LOW,
        category: SecurityCategory.AUTH,
        eventType: 'test',
        description: 'Low'
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it('should trigger alert for critical categories', async () => {
      const spy = vi.fn();
      logger.on('alert:triggered', spy);

      await logger.logEvent({
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.CREDENTIAL_COMPROMISE,
        eventType: 'test',
        description: 'Compromised'
      });

      expect(spy).toHaveBeenCalled();
    });
  });

  // Export Tests
  describe('Event Export', () => {
    beforeEach(async () => {
      await logger.logEvent({
        severity: SecuritySeverity.CRITICAL,
        category: SecurityCategory.AUTH,
        eventType: 'test',
        description: 'Test event'
      });
    });

    it('should export events as JSON', () => {
      const json = logger.exportJSON();
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it('should export events as CSV', () => {
      const csv = logger.exportCSV();
      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThan(1); // Header + at least one event
      expect(lines[0]).toContain('ID');
      expect(lines[0]).toContain('Severity');
    });

    it('should support time range filtering in export', () => {
      const start = new Date(Date.now() - 10000);
      const end = new Date();

      const json = logger.exportJSON(start, end);
      const parsed = JSON.parse(json);
      expect(parsed.length).toBeGreaterThan(0);
    });
  });

  // Integrity Verification Tests
  describe('Event Chain Integrity', () => {
    it('should verify intact event chain', async () => {
      await logger.logEvent({
        severity: SecuritySeverity.LOW,
        category: SecurityCategory.AUTH,
        eventType: 'event1',
        description: 'First'
      });

      await logger.logEvent({
        severity: SecuritySeverity.LOW,
        category: SecurityCategory.AUTH,
        eventType: 'event2',
        description: 'Second'
      });

      const verification = logger.verifyIntegrity();
      expect(verification.valid).toBe(true);
      expect(verification.errors).toHaveLength(0);
    });
  });

  // Clear Data Tests
  describe('Data Management', () => {
    it('should clear all events', async () => {
      await logger.logEvent({
        severity: SecuritySeverity.LOW,
        category: SecurityCategory.AUTH,
        eventType: 'test',
        description: 'Test'
      });

      logger.clear();
      const stats = logger.getStatistics();
      expect(stats.totalEvents).toBe(0);
    });
  });

  // Edge Cases
  describe('Edge Cases', () => {
    it('should handle missing optional fields', async () => {
      const event = await logger.logEvent({
        severity: SecuritySeverity.INFO,
        category: SecurityCategory.AUTH,
        eventType: 'test',
        description: 'Test'
        // No userId, ipAddress, etc.
      });

      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it('should handle empty threat indicators', async () => {
      const event = await logger.logEvent({
        severity: SecuritySeverity.LOW,
        category: SecurityCategory.AUTH,
        eventType: 'test',
        description: 'Test',
        threatIndicators: {
          score: 0,
          indicators: [],
          riskFactors: [],
          confidence: 0
        }
      });

      expect(event.threatIndicators).toBeDefined();
      expect(event.threatIndicators.indicators).toHaveLength(0);
    });

    it('should handle very long descriptions', async () => {
      const longDescription = 'A'.repeat(10000);
      const event = await logger.logEvent({
        severity: SecuritySeverity.LOW,
        category: SecurityCategory.AUTH,
        eventType: 'test',
        description: longDescription
      });

      expect(event.description).toBe(longDescription);
    });

    it('should handle many concurrent events', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          logger.logEvent({
            severity: SecuritySeverity.INFO,
            category: SecurityCategory.AUTH,
            eventType: 'test_' + i,
            description: 'Test ' + i,
            userId: 'user_' + (i % 10)
          })
        );
      }

      await Promise.all(promises);
      const stats = logger.getStatistics();
      expect(stats.totalEvents).toBe(100);
    });
  });
});

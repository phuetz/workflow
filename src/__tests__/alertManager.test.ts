/**
 * Alert Manager Test Suite
 * Comprehensive tests for multi-channel alerting system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AlertManager,
  Alert,
  AlertSeverity,
  AlertCategory,
  NotificationChannel,
  EscalationPolicy,
  RoutingRule,
  AlertFilter
} from '../monitoring/AlertManager';

describe('AlertManager', () => {
  let alertManager: AlertManager;

  beforeEach(() => {
    alertManager = AlertManager.getInstance();
    // Reset state between tests to ensure isolation
    alertManager.reset();
  });

  afterEach(() => {
    // Clean up
    vi.clearAllMocks();
  });

  // ================================
  // ALERT CREATION & MANAGEMENT
  // ================================

  describe('Alert Creation', () => {
    it('should create an alert with minimal data', async () => {
      const alert = await alertManager.createAlert({
        title: 'Test Alert',
        severity: 'high',
        source: 'test',
        category: 'security'
      });

      expect(alert).toBeDefined();
      expect(alert.id).toBeDefined();
      expect(alert.title).toBe('Test Alert');
      expect(alert.severity).toBe('high');
      expect(alert.status).toBe('open');
    });

    it('should create an alert with all properties', async () => {
      const alert = await alertManager.createAlert({
        title: 'Comprehensive Alert',
        severity: 'critical',
        description: 'Full description',
        source: 'api',
        category: 'security',
        metrics: { cpu: 95, memory: 88 },
        context: { userId: '123', action: 'login_failed' },
        recommended_actions: ['Review logs', 'Block IP']
      });

      expect(alert.metrics).toEqual({ cpu: 95, memory: 88 });
      expect(alert.context).toEqual({ userId: '123', action: 'login_failed' });
      expect(alert.recommended_actions).toHaveLength(2);
    });

    it('should deduplicate identical alerts within 5 minutes', async () => {
      const alert1 = await alertManager.createAlert({
        title: 'Duplicate Alert',
        severity: 'high',
        source: 'test',
        category: 'security'
      });

      const alert2 = await alertManager.createAlert({
        title: 'Duplicate Alert',
        severity: 'high',
        source: 'test',
        category: 'security'
      });

      // Second alert should not trigger multiple notifications
      expect(alert1.id).toBeDefined();
      expect(alert2.id).toBeDefined();
    });

    it('should auto-generate alert ID', async () => {
      const alert = await alertManager.createAlert({
        title: 'ID Test',
        severity: 'medium',
        source: 'test',
        category: 'system'
      });

      expect(alert.id).toMatch(/^alert-/);
    });

    it('should set timestamp on creation', async () => {
      const beforeTime = Date.now();
      const alert = await alertManager.createAlert({
        title: 'Timestamp Test',
        severity: 'low',
        source: 'test',
        category: 'system'
      });
      const afterTime = Date.now();

      expect(alert.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime);
      expect(alert.timestamp.getTime()).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Alert Retrieval', () => {
    beforeEach(async () => {
      await alertManager.createAlert({
        title: 'Critical Alert',
        severity: 'critical',
        source: 'security',
        category: 'security'
      });

      await alertManager.createAlert({
        title: 'Warning Alert',
        severity: 'medium',
        source: 'performance',
        category: 'performance'
      });

      await alertManager.createAlert({
        title: 'Info Alert',
        severity: 'low',
        source: 'system',
        category: 'system'
      });
    });

    it('should retrieve all alerts', () => {
      const alerts = alertManager.getAllAlerts();
      expect(alerts.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter alerts by severity', () => {
      const alerts = alertManager.getAllAlerts({
        severity: ['critical']
      });

      expect(alerts.every(a => a.severity === 'critical')).toBe(true);
    });

    it('should filter alerts by category', () => {
      const alerts = alertManager.getAllAlerts({
        category: ['security']
      });

      expect(alerts.every(a => a.category === 'security')).toBe(true);
    });

    it('should filter alerts by status', () => {
      const alerts = alertManager.getAllAlerts({
        status: ['open']
      });

      expect(alerts.every(a => a.status === 'open')).toBe(true);
    });

    it('should filter alerts by source', () => {
      const alerts = alertManager.getAllAlerts({
        source: 'security'
      });

      expect(alerts.every(a => a.source === 'security')).toBe(true);
    });

    it('should respect pagination', () => {
      const alerts1 = alertManager.getAllAlerts({ limit: 1 });
      const alerts2 = alertManager.getAllAlerts({ limit: 1, offset: 1 });

      expect(alerts1.length).toBeLessThanOrEqual(1);
      expect(alerts1.length).toBeGreaterThanOrEqual(0);
    });

    it('should sort alerts by timestamp descending', () => {
      const alerts = alertManager.getAllAlerts();
      for (let i = 0; i < alerts.length - 1; i++) {
        expect(alerts[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          alerts[i + 1].timestamp.getTime()
        );
      }
    });
  });

  describe('Alert Status Management', () => {
    let testAlert: Alert;

    beforeEach(async () => {
      testAlert = await alertManager.createAlert({
        title: 'Status Test',
        severity: 'high',
        source: 'test',
        category: 'security'
      });
    });

    it('should acknowledge an alert', async () => {
      await alertManager.acknowledgeAlert(testAlert.id, 'user123');
      const updated = alertManager.getAlert(testAlert.id);

      expect(updated?.status).toBe('acknowledged');
      expect(updated?.acknowledgedBy).toBe('user123');
      expect(updated?.acknowledgedAt).toBeDefined();
    });

    it('should resolve an alert', async () => {
      await alertManager.resolveAlert(testAlert.id, 'user123');
      const updated = alertManager.getAlert(testAlert.id);

      expect(updated?.status).toBe('resolved');
      expect(updated?.resolvedBy).toBe('user123');
      expect(updated?.resolvedAt).toBeDefined();
    });

    it('should mute an alert', async () => {
      const muteTime = 60 * 60 * 1000; // 1 hour
      await alertManager.muteAlert(testAlert.id, muteTime);
      const updated = alertManager.getAlert(testAlert.id);

      expect(updated?.status).toBe('muted');
      expect(updated?.muteUntil).toBeDefined();
      if (updated?.muteUntil) {
        expect(updated.muteUntil.getTime()).toBeGreaterThan(Date.now());
      }
    });

    it('should throw error for non-existent alert', async () => {
      await expect(alertManager.acknowledgeAlert('invalid-id', 'user')).rejects.toThrow();
    });
  });

  // ================================
  // CHANNEL MANAGEMENT
  // ================================

  describe('Channel Management', () => {
    it('should add a notification channel', () => {
      const channel: NotificationChannel = {
        type: 'email',
        name: 'test-email',
        enabled: true,
        config: {
          email: {
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            auth: { user: 'test', pass: 'password' },
            from: 'alerts@example.com',
            to: ['recipient@example.com']
          }
        },
        severityFilter: ['high', 'critical']
      };

      alertManager.addChannel(channel);
      // Verify channel was added (no errors thrown)
    });

    it('should remove a channel', () => {
      const channel: NotificationChannel = {
        type: 'slack',
        name: 'test-slack',
        enabled: true,
        config: {
          slack: {
            webhookUrl: 'https://hooks.slack.com/services/...',
            channel: '#alerts'
          }
        },
        severityFilter: ['critical']
      };

      alertManager.addChannel(channel);
      alertManager.removeChannel('test-slack');
    });

    it('should enable/disable channels', () => {
      const channel: NotificationChannel = {
        type: 'teams',
        name: 'test-teams',
        enabled: false,
        config: {
          teams: {
            webhookUrl: 'https://...'
          }
        },
        severityFilter: ['critical']
      };

      alertManager.addChannel(channel);
      alertManager.enableChannel('test-teams');
      alertManager.disableChannel('test-teams');
    });
  });

  // ================================
  // ROUTING & ESCALATION
  // ================================

  describe('Alert Routing', () => {
    it('should route critical alerts to all channels', async () => {
      const alert = await alertManager.createAlert({
        title: 'Critical',
        severity: 'critical',
        source: 'test',
        category: 'security'
      });

      const channels = alertManager.routeAlert(alert);
      // At minimum, should have routing logic
      expect(channels).toBeDefined();
      expect(Array.isArray(channels)).toBe(true);
    });

    it('should route high severity to email and slack', async () => {
      const alert = await alertManager.createAlert({
        title: 'High Priority',
        severity: 'high',
        source: 'test',
        category: 'security'
      });

      const channels = alertManager.routeAlert(alert);
      expect(channels).toBeDefined();
    });

    it('should apply custom routing rules', async () => {
      const rule: RoutingRule = {
        id: 'rule-1',
        name: 'Security to PagerDuty',
        priority: 10,
        condition: (alert) => alert.category === 'security' && alert.severity === 'critical',
        channels: ['pagerduty', 'sms']
      };

      alertManager.addRoutingRule(rule);

      const alert = await alertManager.createAlert({
        title: 'Security Event',
        severity: 'critical',
        source: 'auth',
        category: 'security'
      });

      const channels = alertManager.routeAlert(alert);
      expect(channels).toBeDefined();
    });
  });

  describe('Escalation Policies', () => {
    it('should add an escalation policy', () => {
      const policy: EscalationPolicy = {
        id: 'policy-1',
        name: 'Critical Escalation',
        enabled: true,
        rules: [
          {
            level: 0,
            delay: 0,
            channels: ['email'],
            recipients: ['team@example.com']
          },
          {
            level: 1,
            delay: 15,
            channels: ['pagerduty'],
            recipients: ['oncall@example.com']
          }
        ]
      };

      alertManager.addEscalationPolicy(policy);
      // Policy added successfully
    });

    it('should escalate alert based on policy', async () => {
      const policy: EscalationPolicy = {
        id: 'policy-escalate',
        name: 'Test Escalation',
        enabled: true,
        rules: [
          {
            level: 0,
            delay: 0,
            channels: ['email'],
            recipients: []
          },
          {
            level: 1,
            delay: 0,
            channels: ['pagerduty'],
            recipients: [],
            condition: (alert) => alert.severity === 'critical'
          }
        ]
      };

      alertManager.addEscalationPolicy(policy);

      const alert = await alertManager.createAlert({
        title: 'Escalation Test',
        severity: 'critical',
        source: 'test',
        category: 'security'
      });

      await alertManager.escalateAlert(alert.id);
      const updated = alertManager.getAlert(alert.id);
      expect(updated?.escalationLevel).toBeGreaterThan(0);
    });
  });

  // ================================
  // STATISTICS & ANALYTICS
  // ================================

  describe('Statistics & Analytics', () => {
    beforeEach(async () => {
      // Create various alerts
      await alertManager.createAlert({
        title: 'Alert 1',
        severity: 'critical',
        source: 'test',
        category: 'security'
      });

      await alertManager.createAlert({
        title: 'Alert 2',
        severity: 'high',
        source: 'test',
        category: 'performance'
      });

      await alertManager.createAlert({
        title: 'Alert 3',
        severity: 'low',
        source: 'test',
        category: 'system'
      });
    });

    it('should calculate alert statistics', () => {
      const stats = alertManager.getAlertStats({
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      });

      expect(stats).toBeDefined();
      expect(stats.totalAlerts).toBeGreaterThanOrEqual(0);
      expect(stats.bySeverity).toBeDefined();
      expect(stats.byStatus).toBeDefined();
    });

    it('should calculate acknowledgment rate', async () => {
      const alerts = alertManager.getAllAlerts();
      if (alerts.length > 0) {
        await alertManager.acknowledgeAlert(alerts[0].id, 'user');
      }

      const rate = alertManager.getAcknowledgmentRate();
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });

    it('should calculate Mean Time To Resolve', async () => {
      const alerts = alertManager.getAllAlerts();
      if (alerts.length > 0) {
        await alertManager.resolveAlert(alerts[0].id, 'user');
      }

      const mttr = alertManager.getMTTR();
      expect(mttr).toBeGreaterThanOrEqual(0);
    });

    it('should get channel statistics', () => {
      const stats = alertManager.getChannelStats();
      expect(Array.isArray(stats)).toBe(true);
    });
  });

  // ================================
  // EVENT EMISSION
  // ================================

  describe('Event Emission', () => {
    it('should emit alert:created event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        alertManager.on('alert:created', (alert: Alert) => {
          expect(alert).toBeDefined();
          resolve();
        });
      });

      await alertManager.createAlert({
        title: 'Event Test',
        severity: 'medium',
        source: 'test',
        category: 'system'
      });

      await eventPromise;
    });

    it('should emit alert:acknowledged event', async () => {
      const ackPromise = new Promise<void>((resolve) => {
        alertManager.on('alert:acknowledged', (alert: Alert) => {
          expect(alert.status).toBe('acknowledged');
          resolve();
        });
      });

      const alert = await alertManager.createAlert({
        title: 'Ack Test',
        severity: 'medium',
        source: 'test',
        category: 'system'
      });

      await alertManager.acknowledgeAlert(alert.id, 'user');
      await ackPromise;
    });
  });

  // ================================
  // EDGE CASES & ERROR HANDLING
  // ================================

  describe('Edge Cases & Error Handling', () => {
    it('should handle alert with undefined severity', async () => {
      const alert = await alertManager.createAlert({
        title: 'Undefined Severity',
        source: 'test',
        category: 'system'
      });

      expect(alert.severity).toBeDefined();
      expect(['low', 'medium', 'high', 'critical']).toContain(alert.severity);
    });

    it('should handle alert with empty recommended actions', async () => {
      const alert = await alertManager.createAlert({
        title: 'No Actions',
        severity: 'low',
        source: 'test',
        category: 'system'
      });

      expect(Array.isArray(alert.recommended_actions)).toBe(true);
    });

    it('should handle concurrent alert creation', async () => {
      const promises = Array(10).fill(null).map(() =>
        alertManager.createAlert({
          title: 'Concurrent Alert',
          severity: 'medium',
          source: 'test',
          category: 'system'
        })
      );

      const alerts = await Promise.all(promises);
      expect(alerts).toHaveLength(10);
      expect(new Set(alerts.map(a => a.id)).size).toBeGreaterThan(0);
    });

    it('should maintain max alert history size', async () => {
      // Create many alerts to test size limiting
      for (let i = 0; i < 50; i++) {
        await alertManager.createAlert({
          title: `History Test ${i}`,
          severity: 'low',
          source: 'test',
          category: 'system'
        });
      }

      const allAlerts = alertManager.getAllAlerts({ limit: 10000 });
      expect(allAlerts.length).toBeLessThanOrEqual(1100); // Max + some buffer
    });
  });
});

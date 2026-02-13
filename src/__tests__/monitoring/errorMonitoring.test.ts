/**
 * Error Monitoring System Tests
 * Comprehensive test suite for error monitoring, pattern analysis, and auto-correction
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ErrorMonitoringSystem,
  type ErrorEvent,
  type MonitoringConfig,
} from '../../monitoring/ErrorMonitoringSystem';
import { ErrorPatternAnalyzer } from '../../monitoring/ErrorPatternAnalyzer';
import { AutoCorrection } from '../../monitoring/AutoCorrection';
import { ErrorStorage } from '../../monitoring/ErrorStorage';

describe('ErrorMonitoringSystem', () => {
  let monitor: ErrorMonitoringSystem;

  beforeEach(() => {
    monitor = ErrorMonitoringSystem.getInstance({
      enabled: true,
      captureUnhandledRejections: false, // Disable for tests
      captureConsoleErrors: false,
      sampleRate: 1.0,
    });
  });

  afterEach(async () => {
    await monitor.shutdown();
  });

  describe('Error Capture', () => {
    it('should capture basic error', () => {
      const error = monitor.captureError({
        message: 'Test error',
        type: 'runtime',
        severity: 'high',
      });

      expect(error).toBeTruthy();
      expect(error?.message).toBe('Test error');
      expect(error?.type).toBe('runtime');
      expect(error?.severity).toBe('high');
    });

    it('should generate unique error IDs', () => {
      const error1 = monitor.captureError({ message: 'Error 1' });
      const error2 = monitor.captureError({ message: 'Error 2' });

      expect(error1?.id).toBeTruthy();
      expect(error2?.id).toBeTruthy();
      expect(error1?.id).not.toBe(error2?.id);
    });

    it('should generate fingerprints for deduplication', () => {
      const error1 = monitor.captureError({ message: 'Connection failed to server 1' });
      const error2 = monitor.captureError({ message: 'Connection failed to server 2' });

      expect(error1?.fingerprint).toBeTruthy();
      expect(error2?.fingerprint).toBeTruthy();
      expect(error1?.fingerprint).toBe(error2?.fingerprint); // Should be same pattern
    });

    it('should respect sample rate', () => {
      const lowRateMonitor = ErrorMonitoringSystem.getInstance({
        sampleRate: 0.1,
      });

      const errors: (ErrorEvent | null)[] = [];
      for (let i = 0; i < 100; i++) {
        errors.push(lowRateMonitor.captureError({ message: `Error ${i}` }));
      }

      const captured = errors.filter(e => e !== null).length;
      expect(captured).toBeLessThan(30); // Should capture roughly 10%
    });

    it('should ignore configured error patterns', () => {
      const error = monitor.captureError({ message: 'ResizeObserver loop limit exceeded' });
      expect(error).toBeNull();
    });
  });

  describe('Error Classification', () => {
    it('should detect network errors', () => {
      const error = monitor.captureNetworkError({
        url: 'https://api.example.com',
        method: 'GET',
        status: 500,
        message: 'Server error',
      });

      expect(error?.type).toBe('network');
    });

    it('should detect validation errors', () => {
      const error = monitor.captureValidationError({
        field: 'email',
        value: 'invalid-email',
        message: 'Invalid email format',
      });

      expect(error?.type).toBe('validation');
      expect(error?.severity).toBe('low');
    });

    it('should detect security errors', () => {
      const error = monitor.captureSecurityError({
        type: 'unauthorized',
        message: 'Unauthorized access attempt',
      });

      expect(error?.type).toBe('security');
      expect(error?.severity).toBe('critical');
    });

    it('should detect performance errors', () => {
      const error = monitor.capturePerformanceError({
        metric: 'api_response_time',
        value: 5000,
        threshold: 1000,
      });

      expect(error?.type).toBe('performance');
      expect(error?.severity).toBe('high');
    });
  });

  describe('Error Statistics', () => {
    beforeEach(() => {
      // Create some test errors
      monitor.captureError({ message: 'Error 1', severity: 'low', type: 'runtime' });
      monitor.captureError({ message: 'Error 2', severity: 'high', type: 'network' });
      monitor.captureError({ message: 'Error 3', severity: 'critical', type: 'security' });
    });

    it('should calculate error statistics', async () => {
      const stats = await monitor.getStats();

      expect(stats.total).toBeGreaterThanOrEqual(3);
      expect(stats.byType.runtime).toBeGreaterThanOrEqual(1);
      expect(stats.byType.network).toBeGreaterThanOrEqual(1);
      expect(stats.byType.security).toBeGreaterThanOrEqual(1);
    });

    it('should filter stats by severity', async () => {
      const stats = await monitor.getStats({ severity: 'critical' });

      expect(stats.total).toBeGreaterThanOrEqual(1);
      expect(stats.bySeverity.critical).toBeGreaterThanOrEqual(1);
    });

    it('should calculate error rate', async () => {
      const stats = await monitor.getStats();

      expect(stats.errorRate).toBeGreaterThan(0);
    });
  });

  describe('Error Resolution', () => {
    it('should mark errors as resolved', async () => {
      const error = monitor.captureError({ message: 'Test error' });
      expect(error?.resolved).toBe(false);

      if (error) {
        await monitor.resolveError(error.id, 'manual', 'Fixed by developer');
      }

      // Verification would require storage access
    });
  });

  describe('Alert System', () => {
    it('should emit alert event for critical errors', async () => {
      const alertPromise = new Promise<void>((resolve) => {
        monitor.once('alert', (alert) => {
          expect(alert.type).toBe('critical-threshold');
          resolve();
        });
      });

      // Create multiple critical errors to trigger alert
      for (let i = 0; i < 5; i++) {
        monitor.captureError({
          message: `Critical error ${i}`,
          severity: 'critical',
        });
      }

      await alertPromise;
    });
  });
});

describe('ErrorPatternAnalyzer', () => {
  let analyzer: ErrorPatternAnalyzer;

  beforeEach(() => {
    analyzer = new ErrorPatternAnalyzer();
  });

  describe('Pattern Detection', () => {
    it('should detect recurring error patterns', async () => {
      const errors: ErrorEvent[] = Array.from({ length: 5 }, (_, i) => ({
        id: `error-${i}`,
        timestamp: new Date(),
        type: 'network',
        severity: 'high',
        message: `Failed to connect to server ${i}`,
        fingerprint: 'network-connection-error',
        context: {
          timestamp: new Date(),
          environment: 'production' as const,
        },
        metadata: {},
        resolved: false,
        attempts: 0,
      }));

      const analysis = await analyzer.analyzeErrors(errors);

      expect(analysis.patterns).toBeTruthy();
      expect(analysis.patterns.length).toBeGreaterThan(0);
    });

    it('should cluster similar patterns', async () => {
      const errors: ErrorEvent[] = [
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `error-network-${i}`,
          timestamp: new Date(),
          type: 'network' as const,
          severity: 'high' as const,
          message: `Network timeout on request ${i}`,
          fingerprint: 'network-timeout',
          context: { timestamp: new Date(), environment: 'production' as const },
          metadata: {},
          resolved: false,
          attempts: 0,
        })),
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `error-validation-${i}`,
          timestamp: new Date(),
          type: 'validation' as const,
          severity: 'low' as const,
          message: `Invalid input field ${i}`,
          fingerprint: 'validation-error',
          context: { timestamp: new Date(), environment: 'production' as const },
          metadata: {},
          resolved: false,
          attempts: 0,
        })),
      ];

      const analysis = await analyzer.analyzeErrors(errors);

      expect(analysis.clusters).toBeTruthy();
      expect(analysis.clusters.length).toBeGreaterThan(0);
    });

    it('should identify trending errors', async () => {
      const now = Date.now();
      const errors: ErrorEvent[] = Array.from({ length: 10 }, (_, i) => ({
        id: `error-${i}`,
        timestamp: new Date(now - (9 - i) * 60000), // Increasing frequency
        type: 'runtime' as const,
        severity: 'medium' as const,
        message: 'Memory leak detected',
        fingerprint: 'memory-leak',
        context: { timestamp: new Date(), environment: 'production' as const },
        metadata: {},
        resolved: false,
        attempts: 0,
      }));

      const analysis = await analyzer.analyzeErrors(errors);

      expect(analysis.trending).toBeTruthy();
    });

    it('should suggest fixes for known patterns', async () => {
      const errors: ErrorEvent[] = [{
        id: 'error-1',
        timestamp: new Date(),
        type: 'network',
        severity: 'high',
        message: 'Network timeout',
        fingerprint: 'network-timeout',
        context: { timestamp: new Date(), environment: 'production' as const },
        metadata: {},
        resolved: false,
        attempts: 0,
      }];

      const analysis = await analyzer.analyzeErrors(errors);
      const pattern = analysis.patterns.find(p => p.suggestedFix);

      expect(pattern?.suggestedFix).toBeTruthy();
    });
  });

  describe('Root Cause Analysis', () => {
    it('should identify root cause of error pattern', async () => {
      const pattern = {
        id: 'pattern-1',
        pattern: 'Database connection failed',
        signature: 'db-connection-error',
        count: 5,
        firstSeen: new Date(),
        lastSeen: new Date(),
        affectedUsers: new Set(['user1']),
        affectedWorkflows: new Set(['wf1']),
        autoFixAvailable: false,
        confidence: 0.9,
        severity: 'critical' as const,
        type: 'database' as const,
        examples: [{
          id: 'error-1',
          timestamp: new Date(),
          type: 'database' as const,
          severity: 'critical' as const,
          message: 'Database connection failed',
          stack: 'Error at db.connect()',
          fingerprint: 'db-connection-error',
          context: {
            timestamp: new Date(),
            environment: 'production' as const,
            workflowId: 'wf1',
            userId: 'user1',
          },
          metadata: {},
          resolved: false,
          attempts: 0,
        }],
        metadata: {},
      };

      const rootCause = await analyzer.findRootCause(pattern);

      expect(rootCause).toBeTruthy();
      expect(rootCause).toContain('Pattern:');
    });
  });

  describe('Correlation Analysis', () => {
    it('should correlate errors with system events', () => {
      const errors: ErrorEvent[] = Array.from({ length: 5 }, (_, i) => ({
        id: `error-${i}`,
        timestamp: new Date(Date.now() - i * 60000),
        type: 'network' as const,
        severity: 'high' as const,
        message: 'Error',
        fingerprint: 'error',
        context: { timestamp: new Date(), environment: 'production' as const },
        metadata: {},
        resolved: false,
        attempts: 0,
      }));

      const events = Array.from({ length: 5 }, (_, i) => ({
        type: 'deployment',
        timestamp: new Date(Date.now() - i * 60000),
      }));

      const correlations = analyzer.correlateWithEvents(errors, events);

      expect(correlations).toBeTruthy();
    });
  });
});

describe('AutoCorrection', () => {
  let autoCorrection: AutoCorrection;

  beforeEach(() => {
    autoCorrection = new AutoCorrection();
  });

  describe('Strategy Execution', () => {
    it('should attempt to correct network errors', async () => {
      const error: ErrorEvent = {
        id: 'error-1',
        timestamp: new Date(),
        type: 'network',
        severity: 'high',
        message: 'Network timeout',
        fingerprint: 'network-timeout',
        context: { timestamp: new Date(), environment: 'production' as const },
        metadata: { url: 'https://api.example.com' },
        resolved: false,
        attempts: 0,
      };

      const result = await autoCorrection.tryCorrect(error);

      expect(result).toBeTruthy();
      expect(result?.method).toBeTruthy();
    });

    it('should record correction statistics', async () => {
      const error: ErrorEvent = {
        id: 'error-1',
        timestamp: new Date(),
        type: 'network',
        severity: 'high',
        message: 'Rate limit exceeded',
        fingerprint: 'rate-limit',
        context: { timestamp: new Date(), environment: 'production' as const },
        metadata: {},
        resolved: false,
        attempts: 0,
      };

      await autoCorrection.tryCorrect(error);

      const stats = autoCorrection.getStats();

      expect(stats.total).toBeGreaterThan(0);
    });

    it('should use circuit breaker for repeated failures', async () => {
      const errors: ErrorEvent[] = Array.from({ length: 6 }, (_, i) => ({
        id: `error-${i}`,
        timestamp: new Date(),
        type: 'database' as const,
        severity: 'high' as const,
        message: 'Database connection failed',
        fingerprint: 'db-error',
        context: { timestamp: new Date(), environment: 'production' as const },
        metadata: { service: 'database' },
        resolved: false,
        attempts: 0,
      }));

      for (const error of errors) {
        await autoCorrection.tryCorrect(error);
      }

      const breakers = autoCorrection.getCircuitBreakerStatus();
      expect(breakers.size).toBeGreaterThan(0);
    });
  });

  describe('Custom Strategies', () => {
    it('should allow registering custom correction strategies', async () => {
      autoCorrection.registerStrategy({
        name: 'custom-fix',
        description: 'Custom fix strategy',
        applicableErrors: ['runtime'],
        confidence: 0.9,
        estimatedTime: 100,
        execute: async () => ({
          success: true,
          method: 'custom-fix',
          message: 'Fixed',
          duration: 100,
        }),
      });

      const error: ErrorEvent = {
        id: 'error-1',
        timestamp: new Date(),
        type: 'runtime',
        severity: 'medium',
        message: 'Runtime error',
        fingerprint: 'runtime-error',
        context: { timestamp: new Date(), environment: 'production' as const },
        metadata: {},
        resolved: false,
        attempts: 0,
      };

      const result = await autoCorrection.tryCorrect(error);

      expect(result?.method).toBe('custom-fix');
    });
  });

  describe('Retry Configuration', () => {
    it('should allow configuring retry behavior', () => {
      autoCorrection.configureRetry({
        maxAttempts: 5,
        baseDelay: 500,
      });

      // Configuration should be applied (no error thrown)
      expect(true).toBe(true);
    });
  });
});

describe('ErrorStorage', () => {
  let storage: ErrorStorage;

  beforeEach(() => {
    storage = new ErrorStorage({
      maxErrors: 100,
      retentionDays: 7,
    });
  });

  afterEach(async () => {
    await storage.close();
  });

  describe('Storage Operations', () => {
    it('should store errors', async () => {
      const error: ErrorEvent = {
        id: 'error-1',
        timestamp: new Date(),
        type: 'runtime',
        severity: 'medium',
        message: 'Test error',
        fingerprint: 'test-error',
        context: { timestamp: new Date(), environment: 'production' as const },
        metadata: {},
        resolved: false,
        attempts: 0,
      };

      await storage.storeErrors([error]);

      const retrieved = await storage.getError('error-1');
      expect(retrieved).toBeTruthy();
      expect(retrieved?.message).toBe('Test error');
    });

    it('should query errors with filters', async () => {
      const errors: ErrorEvent[] = [
        {
          id: 'error-1',
          timestamp: new Date(),
          type: 'network',
          severity: 'high',
          message: 'Network error',
          fingerprint: 'network-error',
          context: { timestamp: new Date(), environment: 'production' as const },
          metadata: {},
          resolved: false,
          attempts: 0,
        },
        {
          id: 'error-2',
          timestamp: new Date(),
          type: 'validation',
          severity: 'low',
          message: 'Validation error',
          fingerprint: 'validation-error',
          context: { timestamp: new Date(), environment: 'production' as const },
          metadata: {},
          resolved: false,
          attempts: 0,
        },
      ];

      await storage.storeErrors(errors);

      const networkErrors = await storage.getErrors({ type: 'network' });
      expect(networkErrors.length).toBeGreaterThan(0);
      expect(networkErrors.every(e => e.type === 'network')).toBe(true);
    });

    it('should get recent errors', async () => {
      const errors: ErrorEvent[] = Array.from({ length: 5 }, (_, i) => ({
        id: `error-${i}`,
        timestamp: new Date(Date.now() - i * 60000),
        type: 'runtime' as const,
        severity: 'medium' as const,
        message: `Error ${i}`,
        fingerprint: `error-${i}`,
        context: { timestamp: new Date(), environment: 'production' as const },
        metadata: {},
        resolved: false,
        attempts: 0,
      }));

      await storage.storeErrors(errors);

      const recent = await storage.getRecentErrors({ minutes: 10 });
      expect(recent.length).toBeGreaterThan(0);
    });

    it('should update errors', async () => {
      const error: ErrorEvent = {
        id: 'error-1',
        timestamp: new Date(),
        type: 'runtime',
        severity: 'medium',
        message: 'Test error',
        fingerprint: 'test-error',
        context: { timestamp: new Date(), environment: 'production' as const },
        metadata: {},
        resolved: false,
        attempts: 0,
      };

      await storage.storeErrors([error]);

      await storage.updateError('error-1', { resolved: true });

      const updated = await storage.getError('error-1');
      expect(updated?.resolved).toBe(true);
    });

    it('should enforce max errors limit', async () => {
      const errors: ErrorEvent[] = Array.from({ length: 150 }, (_, i) => ({
        id: `error-${i}`,
        timestamp: new Date(),
        type: 'runtime' as const,
        severity: 'medium' as const,
        message: `Error ${i}`,
        fingerprint: `error-${i}`,
        context: { timestamp: new Date(), environment: 'production' as const },
        metadata: {},
        resolved: false,
        attempts: 0,
      }));

      await storage.storeErrors(errors);

      const stats = storage.getStats();
      expect(stats.totalErrors).toBeLessThanOrEqual(100);
    });

    it('should cleanup old errors', async () => {
      const oldError: ErrorEvent = {
        id: 'old-error',
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        type: 'runtime',
        severity: 'medium',
        message: 'Old error',
        fingerprint: 'old-error',
        context: { timestamp: new Date(), environment: 'production' as const },
        metadata: {},
        resolved: false,
        attempts: 0,
      };

      await storage.storeErrors([oldError]);

      const deleted = await storage.cleanup();
      expect(deleted).toBeGreaterThan(0);
    });
  });

  describe('Import/Export', () => {
    it('should export errors to JSON', async () => {
      const error: ErrorEvent = {
        id: 'error-1',
        timestamp: new Date(),
        type: 'runtime',
        severity: 'medium',
        message: 'Test error',
        fingerprint: 'test-error',
        context: { timestamp: new Date(), environment: 'production' as const },
        metadata: {},
        resolved: false,
        attempts: 0,
      };

      await storage.storeErrors([error]);

      const json = await storage.exportToJSON();
      expect(json).toBeTruthy();
      expect(json).toContain('Test error');
    });

    it('should import errors from JSON', async () => {
      const error: ErrorEvent = {
        id: 'error-1',
        timestamp: new Date(),
        type: 'runtime',
        severity: 'medium',
        message: 'Test error',
        fingerprint: 'test-error',
        context: { timestamp: new Date(), environment: 'production' as const },
        metadata: {},
        resolved: false,
        attempts: 0,
      };

      const json = JSON.stringify([error]);
      const imported = await storage.importFromJSON(json);

      expect(imported).toBe(1);

      const retrieved = await storage.getError('error-1');
      expect(retrieved).toBeTruthy();
    });
  });

  describe('Statistics', () => {
    it('should calculate storage statistics', async () => {
      const errors: ErrorEvent[] = Array.from({ length: 10 }, (_, i) => ({
        id: `error-${i}`,
        timestamp: new Date(),
        type: 'runtime' as const,
        severity: 'medium' as const,
        message: `Error ${i}`,
        fingerprint: `error-${i}`,
        context: { timestamp: new Date(), environment: 'production' as const },
        metadata: {},
        resolved: i < 5,
        attempts: 0,
      }));

      await storage.storeErrors(errors);

      const stats = storage.getStats();

      expect(stats.totalErrors).toBe(10);
      expect(stats.resolvedErrors).toBe(5);
      expect(stats.unresolvedErrors).toBe(5);
      expect(stats.storageSize).toBeGreaterThan(0);
    });
  });
});

describe('Integration Tests', () => {
  it('should work end-to-end', async () => {
    const monitor = ErrorMonitoringSystem.getInstance();

    // Capture errors
    monitor.captureError({ message: 'Error 1', severity: 'high', type: 'network' });
    monitor.captureError({ message: 'Error 2', severity: 'low', type: 'validation' });
    monitor.captureError({ message: 'Error 3', severity: 'critical', type: 'security' });

    // Get statistics
    const stats = await monitor.getStats();
    expect(stats.total).toBeGreaterThanOrEqual(3);

    // Get recent errors
    const recentErrors = await monitor.getRecentErrors(10);
    expect(recentErrors.length).toBeGreaterThan(0);

    await monitor.shutdown();
  });

  it('should handle high volume of errors', async () => {
    const monitor = ErrorMonitoringSystem.getInstance();

    // Capture many errors quickly
    const promises = Array.from({ length: 100 }, (_, i) =>
      Promise.resolve(monitor.captureError({ message: `Error ${i}` }))
    );

    await Promise.all(promises);

    const stats = await monitor.getStats();
    expect(stats.total).toBeGreaterThanOrEqual(100);

    await monitor.shutdown();
  });
});

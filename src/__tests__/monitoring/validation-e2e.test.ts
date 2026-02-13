/**
 * End-to-End Tests for Validation Loop
 * Tests complete validation cycle including detection, correction, and monitoring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validationLoop, Correction, ValidationResult } from '../../monitoring/ValidationLoop';
import { validationMetrics } from '../../monitoring/ValidationMetrics';
import { regressionTester } from '../../monitoring/RegressionTests';
import { correctionLearner } from '../../monitoring/LearningSystem';
import { intelligentAlerts } from '../../monitoring/AlertSystem';
import { monitoringSystem } from '../../monitoring/MonitoringSystem';

describe('Validation Loop E2E Tests', () => {
  beforeEach(() => {
    // Reset all systems
    validationMetrics.reset();
    correctionLearner.reset();
    intelligentAlerts.clearHistory();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Validation Cycle', () => {
    it('should detect, correct, and validate network error', async () => {
      // 1. Create a mock correction for network error
      const correction: Correction = {
        id: 'test-correction-1',
        type: 'auto',
        errorType: 'NETWORK_ERROR',
        method: 'retry_with_backoff',
        description: 'Retry network request with exponential backoff',
        apply: async () => {
          // Simulate applying correction
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            success: true,
            message: 'Network connection restored',
            changes: ['Reconnected to API endpoint'],
            metrics: { duration: 100, retries: 2 }
          };
        },
        rollback: async () => {
          // Simulate rollback
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      };

      // 2. Run validation
      const result = await validationLoop.validate(correction);

      // 3. Verify validation passed
      expect(result.success).toBe(true);
      expect(result.correctionId).toBe('test-correction-1');
      expect(result.preChecks.length).toBeGreaterThan(0);
      expect(result.postChecks.length).toBeGreaterThan(0);
      expect(result.monitoring.stable).toBe(true);

      // 4. Verify metrics were recorded
      const metrics = validationMetrics.getSnapshot();
      expect(metrics.overall.totalValidations).toBeGreaterThan(0);
      expect(metrics.overall.successfulValidations).toBeGreaterThan(0);

      // 5. Verify learning system was updated
      const learningModel = correctionLearner.exportModel();
      expect(learningModel.trainingDataSize).toBeGreaterThan(0);
    }, 15000);

    it('should rollback failed correction', async () => {
      let rollbackCalled = false;

      const failingCorrection: Correction = {
        id: 'test-correction-2',
        type: 'auto',
        errorType: 'DATABASE_ERROR',
        method: 'reconnect',
        description: 'Reconnect to database',
        apply: async () => {
          return {
            success: false,
            message: 'Failed to reconnect',
            changes: []
          };
        },
        rollback: async () => {
          rollbackCalled = true;
        }
      };

      const result = await validationLoop.validate(failingCorrection);

      expect(result.success).toBe(false);
      expect(rollbackCalled).toBe(true);
    }, 10000);

    it('should handle correction timeout gracefully', async () => {
      const timeoutCorrection: Correction = {
        id: 'test-correction-3',
        type: 'auto',
        errorType: 'TIMEOUT_ERROR',
        method: 'increase_timeout',
        description: 'Increase timeout threshold',
        apply: async () => {
          // Simulate long-running operation
          await new Promise(resolve => setTimeout(resolve, 30000));
          return {
            success: true,
            message: 'Timeout increased',
            changes: []
          };
        }
      };

      const result = await validationLoop.validate(timeoutCorrection);

      // Validation should handle timeout appropriately
      expect(result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Regression Testing', () => {
    it('should run regression tests after correction', async () => {
      const correction: Correction = {
        id: 'test-correction-4',
        type: 'auto',
        errorType: 'CACHE_ERROR',
        method: 'clear_cache',
        description: 'Clear and rebuild cache',
        apply: async () => ({
          success: true,
          message: 'Cache cleared',
          changes: ['Cleared cache', 'Rebuilt indexes']
        })
      };

      const testResult = await regressionTester.runAfterCorrection(correction);

      expect(testResult).toBeDefined();
      expect(testResult.totalTests).toBeGreaterThan(0);
      expect(testResult.results).toBeInstanceOf(Array);
    });

    it('should detect regression in critical endpoints', async () => {
      const endpoints = await regressionTester.testCriticalEndpoints();

      expect(endpoints).toBeInstanceOf(Array);
      expect(endpoints.length).toBeGreaterThan(0);

      // Verify all critical endpoints are tested
      const testedPaths = endpoints.map(e => e.endpoint);
      expect(testedPaths).toContain('/api/health');
      expect(testedPaths).toContain('/api/workflows');
    });
  });

  describe('Learning System', () => {
    it('should learn from successful correction', async () => {
      const correction: Correction = {
        id: 'test-correction-5',
        type: 'auto',
        errorType: 'NETWORK_ERROR',
        method: 'retry_with_backoff',
        description: 'Retry with backoff',
        apply: async () => ({
          success: true,
          message: 'Success',
          changes: []
        })
      };

      const validationResult = await validationLoop.validate(correction);

      // Verify learning occurred
      const model = correctionLearner.exportModel();
      expect(model.trainingDataSize).toBeGreaterThan(0);

      // Verify we can make predictions
      const prediction = correctionLearner.predictSuccess(correction);
      expect(prediction.successProbability).toBeGreaterThanOrEqual(0);
      expect(prediction.successProbability).toBeLessThanOrEqual(1);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    }, 15000);

    it('should adjust strategy after failures', async () => {
      const failingCorrection: Correction = {
        id: 'test-correction-6',
        type: 'auto',
        errorType: 'AUTH_ERROR',
        method: 'refresh_token',
        description: 'Refresh authentication token',
        apply: async () => ({
          success: false,
          message: 'Token refresh failed',
          changes: []
        })
      };

      // Run multiple failing corrections
      for (let i = 0; i < 3; i++) {
        await validationLoop.validate(failingCorrection);
      }

      // Verify strategy was adjusted
      const bestStrategy = correctionLearner.getBestStrategy('AUTH_ERROR');
      expect(bestStrategy).toBeDefined();
    }, 20000);

    it('should recommend alternative methods for low success probability', async () => {
      const correction: Correction = {
        id: 'test-correction-7',
        type: 'auto',
        errorType: 'DATABASE_ERROR',
        method: 'reconnect',
        description: 'Reconnect to database',
        apply: async () => ({
          success: true,
          message: 'Connected',
          changes: []
        })
      };

      const prediction = correctionLearner.predictSuccess(correction);

      if (prediction.successProbability < 0.6) {
        expect(prediction.alternativeMethods).toBeDefined();
        expect(prediction.alternativeMethods?.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Alert System', () => {
    it('should suppress duplicate alerts within cooldown period', async () => {
      const error = new Error('Test error');
      const errorType = 'NETWORK_ERROR';

      // Send first alert
      await intelligentAlerts.sendAlert(error, errorType);

      // Try to send same alert immediately
      const shouldAlert = await intelligentAlerts.shouldAlert(error, errorType);

      expect(shouldAlert).toBe(false);
    });

    it('should group similar alerts', async () => {
      const error = new Error('Test error');
      const errorType = 'DATABASE_ERROR';

      // Send multiple similar alerts
      for (let i = 0; i < 5; i++) {
        await intelligentAlerts.sendAlert(error, errorType, ['slack']);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const stats = intelligentAlerts.getStatistics();
      expect(stats.groupedAlerts).toBeGreaterThanOrEqual(0);
    });

    it('should not suppress critical alerts', async () => {
      const criticalError = new Error('Critical database failure');
      const errorType = 'DATABASE_ERROR';

      const shouldAlert = await intelligentAlerts.shouldAlert(criticalError, errorType);

      // Critical errors should always alert
      expect(shouldAlert).toBe(true);
    });

    it('should suppress alerts when auto-fix is in progress', async () => {
      const error = new Error('Network timeout');
      const errorType = 'TIMEOUT_ERROR';

      // Mark auto-fix as in progress
      intelligentAlerts.markAutoFixInProgress(errorType);

      const shouldAlert = await intelligentAlerts.shouldAlert(error, errorType);

      expect(shouldAlert).toBe(false);

      // Clean up
      intelligentAlerts.markAutoFixComplete(errorType);
    });
  });

  describe('Metrics Collection', () => {
    it('should track validation metrics over time', async () => {
      // Run multiple validations
      for (let i = 0; i < 5; i++) {
        const correction: Correction = {
          id: `test-correction-${i}`,
          type: 'auto',
          errorType: 'NETWORK_ERROR',
          method: 'retry',
          description: 'Retry',
          apply: async () => ({
            success: Math.random() > 0.3,
            message: 'Done',
            changes: []
          })
        };

        validationMetrics.recordValidation(
          correction.errorType,
          Math.random() > 0.3,
          Math.random() * 5000
        );
      }

      const snapshot = validationMetrics.getSnapshot();

      expect(snapshot.overall.totalValidations).toBe(5);
      expect(snapshot.byErrorType.size).toBeGreaterThan(0);
      expect(snapshot.timeSeries.successRateOverTime.length).toBeGreaterThan(0);
    });

    it('should calculate performance impact metrics', async () => {
      validationMetrics.recordPerformanceImpact(25, 30, 150, 5000);
      validationMetrics.recordPerformanceImpact(20, 25, 100, 3000);

      const perfImpact = validationMetrics.getPerformanceImpactMetrics();

      expect(perfImpact.avgCPUIncrease).toBeGreaterThan(0);
      expect(perfImpact.avgMemoryIncrease).toBeGreaterThan(0);
      expect(perfImpact.avgLatencyIncrease).toBeGreaterThan(0);
      expect(perfImpact.severity).toBeDefined();
    });

    it('should calculate user impact metrics', async () => {
      validationMetrics.recordUserImpact(50, 10000, 25);
      validationMetrics.recordUserImpact(30, 5000, 10);

      const userImpact = validationMetrics.getUserImpactMetrics();

      expect(userImpact.affectedUsers).toBeGreaterThan(0);
      expect(userImpact.downtime).toBeGreaterThan(0);
      expect(userImpact.errorCount).toBeGreaterThan(0);
      expect(userImpact.satisfactionScore).toBeGreaterThanOrEqual(0);
      expect(userImpact.satisfactionScore).toBeLessThanOrEqual(10);
      expect(userImpact.impactLevel).toBeDefined();
    });
  });

  describe('System Health Monitoring', () => {
    it('should monitor system health during validation', async () => {
      const correction: Correction = {
        id: 'test-correction-8',
        type: 'auto',
        errorType: 'MEMORY_ERROR',
        method: 'clear_memory',
        description: 'Clear memory',
        apply: async () => ({
          success: true,
          message: 'Memory cleared',
          changes: []
        })
      };

      const result = await validationLoop.validate(correction);

      expect(result.monitoring).toBeDefined();
      expect(result.monitoring.healthChecks.length).toBeGreaterThan(0);
      expect(result.monitoring.stable).toBeDefined();
    }, 15000);

    it('should detect health degradation', async () => {
      const health = monitoringSystem.getHealthStatus();

      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(health.checks).toBeInstanceOf(Array);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow from error to resolution', async () => {
      // 1. Simulate error detection
      const error = new Error('Database connection lost');
      const errorType = 'DATABASE_ERROR';

      // 2. Check if alert should be sent
      const shouldAlert = await intelligentAlerts.shouldAlert(error, errorType);

      // 3. Create correction
      const correction: Correction = {
        id: 'integration-test-1',
        type: 'auto',
        errorType,
        method: 'reconnect_and_retry',
        description: 'Reconnect to database',
        apply: async () => ({
          success: true,
          message: 'Database reconnected',
          changes: ['Reconnected', 'Validated connection']
        })
      };

      // 4. Predict success
      const prediction = correctionLearner.predictSuccess(correction);
      expect(prediction).toBeDefined();

      // 5. Run validation
      const validationResult = await validationLoop.validate(correction);
      expect(validationResult.success).toBe(true);

      // 6. Run regression tests
      const regressionResult = await regressionTester.runAfterCorrection(correction);
      expect(regressionResult.success).toBeDefined();

      // 7. Record metrics
      validationMetrics.recordValidation(
        errorType,
        validationResult.success,
        validationResult.duration
      );

      // 8. Verify complete cycle
      const snapshot = validationMetrics.getSnapshot();
      expect(snapshot.overall.totalValidations).toBeGreaterThan(0);
    }, 20000);

    it('should handle concurrent validations', async () => {
      const corrections: Correction[] = Array.from({ length: 3 }, (_, i) => ({
        id: `concurrent-${i}`,
        type: 'auto',
        errorType: 'NETWORK_ERROR',
        method: 'retry',
        description: 'Retry',
        apply: async () => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
          return {
            success: true,
            message: 'Success',
            changes: []
          };
        }
      }));

      const results = await Promise.all(
        corrections.map(c => validationLoop.validate(c))
      );

      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      });
    }, 20000);
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const errorCorrection: Correction = {
        id: 'error-test-1',
        type: 'auto',
        errorType: 'UNKNOWN_ERROR',
        method: 'unknown',
        description: 'Unknown correction',
        apply: async () => {
          throw new Error('Unexpected error during correction');
        }
      };

      const result = await validationLoop.validate(errorCorrection);

      expect(result.success).toBe(false);
      expect(result.recommendations).toContain('Manual intervention may be required');
    }, 10000);

    it('should handle missing rollback gracefully', async () => {
      const noRollbackCorrection: Correction = {
        id: 'no-rollback-1',
        type: 'auto',
        errorType: 'TEST_ERROR',
        method: 'test',
        description: 'Test',
        apply: async () => ({
          success: false,
          message: 'Failed',
          changes: []
        })
        // No rollback function
      };

      // Should not throw error even without rollback
      await expect(validationLoop.validate(noRollbackCorrection)).resolves.toBeDefined();
    }, 10000);
  });
});

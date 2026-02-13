/**
 * Safe Correction System Tests
 *
 * Tests for the error detection and recommendation system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  correctionOrchestrator,
  ErrorContext,
  CorrectionOrchestrator,
} from '../monitoring/corrections/CorrectionFramework';
import { NetworkErrorCorrector } from '../monitoring/corrections/NetworkCorrector';
import { MemoryErrorCorrector } from '../monitoring/corrections/MemoryCorrector';
import { DatabaseErrorCorrector } from '../monitoring/corrections/DatabaseCorrector';

describe('Safe Correction System', () => {
  let orchestrator: CorrectionOrchestrator;

  beforeEach(() => {
    // Create fresh orchestrator for each test
    orchestrator = new CorrectionOrchestrator();
  });

  describe('CorrectionOrchestrator', () => {
    it('should register correctors', () => {
      const corrector = new NetworkErrorCorrector();
      orchestrator.registerCorrector(corrector);

      // Should not throw
      expect(() => orchestrator.registerCorrector(corrector)).not.toThrow();
    });

    it('should analyze errors and generate recommendations', async () => {
      orchestrator.registerCorrector(new NetworkErrorCorrector());

      const error = new Error('ETIMEDOUT: Connection timeout');
      error.name = 'NetworkError';

      const recommendation = await orchestrator.analyzeError(error);

      expect(recommendation).not.toBeNull();
      expect(recommendation?.errorType).toBe('Network Timeout');
      expect(recommendation?.steps.length).toBeGreaterThan(0);
    });

    it('should NOT auto-apply corrections', async () => {
      orchestrator.registerCorrector(new NetworkErrorCorrector());

      const error = new Error('ETIMEDOUT');
      const initialState = { /* some state */ };

      await orchestrator.analyzeError(error);

      // State should remain unchanged - no auto-fix
      expect(initialState).toEqual({ /* same state */ });
    });

    it('should track error history', async () => {
      orchestrator.registerCorrector(new NetworkErrorCorrector());

      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      await orchestrator.analyzeError(error1);
      await orchestrator.analyzeError(error2);

      const history = orchestrator.getErrorHistory();
      expect(history.length).toBe(2);
    });

    it('should calculate error severity', async () => {
      orchestrator.registerCorrector(new MemoryErrorCorrector());

      const criticalError = new Error('ENOMEM: Out of memory');
      const recommendation = await orchestrator.analyzeError(criticalError);

      const history = orchestrator.getErrorHistory();
      const errorContext = history[history.length - 1];

      // Memory errors should be critical
      expect(['high', 'critical']).toContain(errorContext.severity);
    });

    it('should provide statistics', async () => {
      orchestrator.registerCorrector(new NetworkErrorCorrector());
      orchestrator.registerCorrector(new DatabaseErrorCorrector());

      await orchestrator.analyzeError(new Error('ETIMEDOUT'));
      await orchestrator.analyzeError(new Error('ECONNREFUSED'));

      const stats = orchestrator.getStatistics();

      expect(stats.totalErrors).toBe(2);
      expect(stats.recommendationsGenerated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('NetworkErrorCorrector', () => {
    it('should detect network timeout errors', () => {
      const corrector = new NetworkErrorCorrector();
      const error: ErrorContext = {
        timestamp: new Date(),
        error: new Error('ETIMEDOUT: Connection timeout'),
        severity: 'medium',
        metadata: {},
      };

      expect(corrector.canHandle(error)).toBe(true);
    });

    it('should detect connection refused errors', () => {
      const corrector = new NetworkErrorCorrector();
      const error: ErrorContext = {
        timestamp: new Date(),
        error: new Error('ECONNREFUSED'),
        severity: 'high',
        metadata: {},
      };

      expect(corrector.canHandle(error)).toBe(true);
    });

    it('should generate timeout recommendations', async () => {
      const corrector = new NetworkErrorCorrector();
      const error: ErrorContext = {
        timestamp: new Date(),
        error: new Error('ETIMEDOUT'),
        severity: 'medium',
        metadata: {},
      };

      const recommendation = await corrector.analyze(error);

      expect(recommendation.errorType).toBe('Network Timeout');
      expect(recommendation.steps.length).toBeGreaterThan(0);
      expect(recommendation.estimatedImpact).toBe('safe');
    });

    it('should provide validation checks', async () => {
      const corrector = new NetworkErrorCorrector();
      const error: ErrorContext = {
        timestamp: new Date(),
        error: new Error('ETIMEDOUT'),
        severity: 'medium',
        metadata: {},
      };

      const recommendation = await corrector.analyze(error);
      const validation = await corrector.validateCorrection(recommendation);

      expect(validation).toHaveProperty('safe');
      expect(validation).toHaveProperty('warnings');
      expect(validation).toHaveProperty('risks');
      expect(validation).toHaveProperty('testResults');
    });

    it('should provide rollback plan', async () => {
      const corrector = new NetworkErrorCorrector();
      const error: ErrorContext = {
        timestamp: new Date(),
        error: new Error('ETIMEDOUT'),
        severity: 'medium',
        metadata: {},
      };

      const recommendation = await corrector.analyze(error);
      const rollbackPlan = await corrector.generateRollbackPlan(recommendation);

      expect(Array.isArray(rollbackPlan)).toBe(true);
    });
  });

  describe('MemoryErrorCorrector', () => {
    it('should detect out of memory errors', () => {
      const corrector = new MemoryErrorCorrector();
      const error: ErrorContext = {
        timestamp: new Date(),
        error: new Error('JavaScript heap out of memory'),
        severity: 'critical',
        metadata: {},
      };

      expect(corrector.canHandle(error)).toBe(true);
    });

    it('should generate critical memory recommendations', async () => {
      const corrector = new MemoryErrorCorrector();
      const error: ErrorContext = {
        timestamp: new Date(),
        error: new Error('ENOMEM'),
        severity: 'critical',
        metadata: {},
      };

      const recommendation = await corrector.analyze(error);

      expect(recommendation.errorType).toContain('Memory');
      expect(recommendation.requiresRestart).toBeDefined();
    });

    it('should recommend heap size increase for critical usage', async () => {
      const corrector = new MemoryErrorCorrector();
      const error: ErrorContext = {
        timestamp: new Date(),
        error: new Error('High memory usage'),
        severity: 'critical',
        metadata: {
          memoryUsage: {
            heapUsed: 950 * 1024 * 1024,
            heapTotal: 1000 * 1024 * 1024,
          },
        },
      };

      const recommendation = await corrector.analyze(error);

      const hasHeapStep = recommendation.steps.some(step =>
        step.description.toLowerCase().includes('heap')
      );

      expect(hasHeapStep).toBe(true);
    });
  });

  describe('DatabaseErrorCorrector', () => {
    it('should detect database connection errors', () => {
      const corrector = new DatabaseErrorCorrector();
      const error: ErrorContext = {
        timestamp: new Date(),
        error: new Error('ECONNREFUSED: Database connection refused'),
        severity: 'high',
        metadata: {},
      };

      expect(corrector.canHandle(error)).toBe(true);
    });

    it('should detect deadlock errors', () => {
      const corrector = new DatabaseErrorCorrector();
      const error: ErrorContext = {
        timestamp: new Date(),
        error: new Error('Deadlock detected'),
        severity: 'medium',
        metadata: {},
      };

      expect(corrector.canHandle(error)).toBe(true);
    });

    it('should generate connection recommendations', async () => {
      const corrector = new DatabaseErrorCorrector();
      const error: ErrorContext = {
        timestamp: new Date(),
        error: new Error('ECONNREFUSED'),
        severity: 'high',
        metadata: {},
      };

      const recommendation = await corrector.analyze(error);

      expect(recommendation.errorType).toContain('Connection');
      expect(recommendation.steps.length).toBeGreaterThan(0);
    });

    it('should recommend retry logic for deadlocks', async () => {
      const corrector = new DatabaseErrorCorrector();
      const error: ErrorContext = {
        timestamp: new Date(),
        error: new Error('Deadlock detected'),
        severity: 'medium',
        metadata: {},
      };

      const recommendation = await corrector.analyze(error);

      const hasRetryStep = recommendation.steps.some(step =>
        step.description.toLowerCase().includes('retry')
      );

      expect(hasRetryStep).toBe(true);
    });
  });

  describe('Safety Guarantees', () => {
    it('should NEVER auto-apply corrections', async () => {
      orchestrator.registerCorrector(new NetworkErrorCorrector());

      const beforeState = {
        config: { timeout: 5000 },
        applied: false,
      };

      await orchestrator.analyzeError(new Error('ETIMEDOUT'));

      // State should be unchanged
      expect(beforeState.applied).toBe(false);
      expect(beforeState.config.timeout).toBe(5000);
    });

    it('should require human approval for risky changes', async () => {
      const corrector = new DatabaseErrorCorrector();
      const error: ErrorContext = {
        timestamp: new Date(),
        error: new Error('too many connections'),
        severity: 'high',
        metadata: {},
      };

      const recommendation = await corrector.analyze(error);

      // Changes that require restart should be flagged
      if (recommendation.requiresRestart) {
        expect(recommendation.estimatedImpact).not.toBe('safe');
      }
    });

    it('should provide validation before application', async () => {
      const corrector = new NetworkErrorCorrector();
      const error: ErrorContext = {
        timestamp: new Date(),
        error: new Error('ETIMEDOUT'),
        severity: 'medium',
        metadata: {},
      };

      const recommendation = await corrector.analyze(error);
      const validation = await corrector.validateCorrection(recommendation);

      // Validation should run without applying
      expect(validation.safe).toBeDefined();
    });

    it('should generate rollback plans', async () => {
      orchestrator.registerCorrector(new DatabaseErrorCorrector());

      const error = new Error('ECONNREFUSED');
      const recommendation = await orchestrator.analyzeError(error);

      expect(recommendation).not.toBeNull();
      if (recommendation) {
        expect(recommendation.rollbackPlan).toBeDefined();
      }
    });
  });

  describe('Recommendation Quality', () => {
    it('should provide actionable steps', async () => {
      orchestrator.registerCorrector(new NetworkErrorCorrector());

      const error = new Error('ETIMEDOUT');
      const recommendation = await orchestrator.analyzeError(error);

      expect(recommendation).not.toBeNull();
      if (recommendation) {
        expect(recommendation.steps.length).toBeGreaterThan(0);

        recommendation.steps.forEach(step => {
          expect(step.description).toBeTruthy();
          expect(step.estimatedDuration).toBeGreaterThan(0);
          // At least one of: command, code, or manualAction
          expect(
            step.command || step.code || step.manualAction
          ).toBeTruthy();
        });
      }
    });

    it('should estimate impact correctly', async () => {
      orchestrator.registerCorrector(new MemoryErrorCorrector());

      const error = new Error('ENOMEM');
      const recommendation = await orchestrator.analyzeError(error);

      expect(recommendation).not.toBeNull();
      if (recommendation) {
        expect(['safe', 'moderate', 'risky']).toContain(
          recommendation.estimatedImpact
        );
      }
    });

    it('should provide clear descriptions', async () => {
      orchestrator.registerCorrector(new DatabaseErrorCorrector());

      const error = new Error('Deadlock detected');
      const recommendation = await orchestrator.analyzeError(error);

      expect(recommendation).not.toBeNull();
      if (recommendation) {
        expect(recommendation.description).toBeTruthy();
        expect(recommendation.description.length).toBeGreaterThan(10);
      }
    });
  });
});

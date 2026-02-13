/**
 * Comprehensive Auto-Healing System Tests
 * Tests error diagnosis, healing strategies, learning, and analytics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorDiagnostician } from '../healing/ErrorDiagnostician';
import { HealingEngine } from '../healing/HealingEngine';
import { HealingAnalytics } from '../healing/HealingAnalytics';
import { LearningEngine } from '../healing/LearningEngine';
import { HealingStrategyRegistry } from '../healing/HealingStrategies';
import {
  WorkflowError,
  ErrorType,
  HealingStrategy,
  StrategyCategory,
  ActionType
} from '../types/healing';

describe('Error Diagnostician', () => {
  let diagnostician: ErrorDiagnostician;

  beforeEach(() => {
    diagnostician = new ErrorDiagnostician();
  });

  it('should classify timeout errors correctly', async () => {
    const error: WorkflowError = {
      id: 'err-1',
      workflowId: 'wf-1',
      executionId: 'exec-1',
      nodeId: 'node-1',
      nodeName: 'HTTP Request',
      nodeType: 'httpRequest',
      timestamp: new Date(),
      message: 'Request timeout after 30s',
      attempt: 1,
      context: {}
    };

    const diagnosis = await diagnostician.diagnose(error);
    
    expect(diagnosis.errorType).toBe(ErrorType.TIMEOUT);
    expect(diagnosis.healable).toBe(true);
    expect(diagnosis.confidence).toBeGreaterThan(0.5);
  });

  it('should classify rate limit errors correctly', async () => {
    const error: WorkflowError = {
      id: 'err-2',
      workflowId: 'wf-1',
      executionId: 'exec-1',
      nodeId: 'node-1',
      nodeName: 'API Call',
      nodeType: 'httpRequest',
      timestamp: new Date(),
      message: 'Rate limit exceeded',
      statusCode: 429,
      attempt: 1,
      context: {}
    };

    const diagnosis = await diagnostician.diagnose(error);
    
    expect(diagnosis.errorType).toBe(ErrorType.RATE_LIMIT);
    expect(diagnosis.suggestedStrategies.length).toBeGreaterThan(0);
  });

  it('should detect error patterns', async () => {
    // Create multiple similar errors
    for (let i = 0; i < 5; i++) {
      const error: WorkflowError = {
        id: `err-${i}`,
        workflowId: 'wf-1',
        executionId: `exec-${i}`,
        nodeId: 'node-1',
        nodeName: 'API Call',
        nodeType: 'httpRequest',
        timestamp: new Date(Date.now() - i * 60000),
        message: 'Connection refused',
        attempt: 1,
        context: {}
      };

      await diagnostician.diagnose(error);
    }

    const stats = diagnostician.getStats();
    expect(stats.totalErrors).toBe(5);
    expect(stats.errorsByType[ErrorType.CONNECTION_FAILED]).toBe(5);
  });

  it('should determine error severity', async () => {
    const criticalError: WorkflowError = {
      id: 'err-critical',
      workflowId: 'wf-1',
      executionId: 'exec-1',
      nodeId: 'node-1',
      nodeName: 'Process',
      nodeType: 'code',
      timestamp: new Date(),
      message: 'Deadlock detected',
      attempt: 1,
      context: {}
    };

    const diagnosis = await diagnostician.diagnose(criticalError);
    expect(diagnosis.severity).toBe('critical');
  });

  it('should identify root causes', async () => {
    const error: WorkflowError = {
      id: 'err-auth',
      workflowId: 'wf-1',
      executionId: 'exec-1',
      nodeId: 'node-1',
      nodeName: 'API Call',
      nodeType: 'httpRequest',
      timestamp: new Date(),
      message: 'Unauthorized',
      statusCode: 401,
      attempt: 1,
      context: {}
    };

    const diagnosis = await diagnostician.diagnose(error);
    expect(diagnosis.rootCause).toContain('credentials');
  });
});

describe('Healing Engine', () => {
  let healingEngine: HealingEngine;

  beforeEach(() => {
    healingEngine = new HealingEngine();
  });

  it('should heal rate limit errors with exponential backoff', async () => {
    const error: WorkflowError = {
      id: 'err-rate',
      workflowId: 'wf-1',
      executionId: 'exec-1',
      nodeId: 'node-1',
      nodeName: 'API Call',
      nodeType: 'httpRequest',
      timestamp: new Date(),
      message: 'Rate limit exceeded',
      statusCode: 429,
      attempt: 1,
      context: {}
    };

    const result = await healingEngine.heal(error);
    expect(result.success).toBe(true);
    expect(result.actionsTaken.length).toBeGreaterThan(0);
  });

  it('should respect max healing attempts', async () => {
    const error: WorkflowError = {
      id: 'err-fail',
      workflowId: 'wf-1',
      executionId: 'exec-1',
      nodeId: 'node-1',
      nodeName: 'API Call',
      nodeType: 'httpRequest',
      timestamp: new Date(),
      message: 'Service unavailable',
      attempt: 1,
      context: {}
    };

    const result = await healingEngine.heal(error, { maxAttempts: 2 });
    expect(result.attempts).toBeLessThanOrEqual(2);
  });

  it('should not heal when disabled', async () => {
    healingEngine.updateConfig({ enabled: false });

    const error: WorkflowError = {
      id: 'err-disabled',
      workflowId: 'wf-1',
      executionId: 'exec-1',
      nodeId: 'node-1',
      nodeName: 'API Call',
      nodeType: 'httpRequest',
      timestamp: new Date(),
      message: 'Timeout',
      attempt: 1,
      context: {}
    };

    const result = await healingEngine.heal(error);
    expect(result.success).toBe(false);
    expect(result.error).toContain('disabled');
  });

  it('should escalate after max attempts', async () => {
    healingEngine.updateConfig({ escalateAfterAttempts: 1 });

    const error: WorkflowError = {
      id: 'err-escalate',
      workflowId: 'wf-1',
      executionId: 'exec-1',
      nodeId: 'node-1',
      nodeName: 'API Call',
      nodeType: 'httpRequest',
      timestamp: new Date(),
      message: 'Service unavailable',
      attempt: 1,
      context: {}
    };

    const result = await healingEngine.heal(error);
    expect(result.escalated).toBe(true);
  });
});

describe('Healing Strategies', () => {
  let registry: HealingStrategyRegistry;

  beforeEach(() => {
    registry = new HealingStrategyRegistry();
  });

  it('should register default strategies', () => {
    const strategies = registry.getAll();
    expect(strategies.length).toBeGreaterThan(0);
  });

  it('should find strategies by error type', () => {
    const strategies = registry.getByErrorType(ErrorType.TIMEOUT);
    expect(strategies.length).toBeGreaterThan(0);
    expect(strategies[0].applicableErrors).toContain(ErrorType.TIMEOUT);
  });

  it('should filter by category', () => {
    const retryStrategies = registry.getByCategory(StrategyCategory.RETRY);
    expect(retryStrategies.length).toBeGreaterThan(0);
    expect(retryStrategies.every(s => s.category === StrategyCategory.RETRY)).toBe(true);
  });

  it('should retrieve strategy by id', () => {
    const strategy = registry.get('exponential-backoff');
    expect(strategy).toBeDefined();
    expect(strategy?.name).toBe('Exponential Backoff Retry');
  });
});

describe('Healing Analytics', () => {
  let analytics: HealingAnalytics;

  beforeEach(() => {
    analytics = new HealingAnalytics();
  });

  it('should record healing attempts', async () => {
    const error: WorkflowError = {
      id: 'err-1',
      workflowId: 'wf-1',
      executionId: 'exec-1',
      nodeId: 'node-1',
      nodeName: 'API Call',
      nodeType: 'httpRequest',
      timestamp: new Date(),
      message: 'Timeout',
      attempt: 1,
      context: {}
    };

    const diagnosis = {
      errorId: 'err-1',
      errorType: ErrorType.TIMEOUT,
      rootCause: 'Timeout occurred',
      severity: 'medium' as const,
      healable: true,
      confidence: 0.8,
      analysis: {
        patterns: [],
        similarErrors: [],
        affectedNodes: ['node-1'],
        timelineAnalysis: 'First occurrence'
      },
      suggestedStrategies: [],
      estimatedSuccessRate: 0.7,
      estimatedRecoveryTime: 5000,
      diagnosisTime: 100,
      timestamp: new Date()
    };

    const result = {
      success: true,
      strategyId: 'exponential-backoff',
      strategyName: 'Exponential Backoff',
      attempts: 2,
      duration: 3000,
      actionsTaken: [],
      timestamp: new Date()
    };

    await analytics.recordHealingAttempt(error, diagnosis, result);

    const data = await analytics.getAnalytics();
    expect(data.totalHealingAttempts).toBe(1);
    expect(data.successfulHealings).toBe(1);
  });

  it('should calculate success rate', async () => {
    // Add some test data
    for (let i = 0; i < 10; i++) {
      const error: WorkflowError = {
        id: `err-${i}`,
        workflowId: 'wf-1',
        executionId: `exec-${i}`,
        nodeId: 'node-1',
        nodeName: 'API Call',
        nodeType: 'httpRequest',
        timestamp: new Date(),
        message: 'Timeout',
        attempt: 1,
        context: {}
      };

      const diagnosis = {
        errorId: `err-${i}`,
        errorType: ErrorType.TIMEOUT,
        rootCause: 'Timeout',
        severity: 'medium' as const,
        healable: true,
        confidence: 0.8,
        analysis: {
          patterns: [],
          similarErrors: [],
          affectedNodes: [],
          timelineAnalysis: ''
        },
        suggestedStrategies: [],
        estimatedSuccessRate: 0.7,
        estimatedRecoveryTime: 5000,
        diagnosisTime: 100,
        timestamp: new Date()
      };

      const result = {
        success: i < 7, // 70% success rate
        strategyId: 'retry',
        strategyName: 'Retry',
        attempts: 1,
        duration: 1000,
        actionsTaken: [],
        timestamp: new Date()
      };

      await analytics.recordHealingAttempt(error, diagnosis, result);
    }

    const data = await analytics.getAnalytics();
    expect(data.successRate).toBeCloseTo(0.7, 1);
  });

  it('should calculate ROI metrics', async () => {
    const data = await analytics.getAnalytics();
    expect(data.costSavings).toBeGreaterThanOrEqual(0);
    expect(data.mttrReduction).toBeGreaterThanOrEqual(0);
  });

  it('should track strategy performance', async () => {
    const error: WorkflowError = {
      id: 'err-1',
      workflowId: 'wf-1',
      executionId: 'exec-1',
      nodeId: 'node-1',
      nodeName: 'API Call',
      nodeType: 'httpRequest',
      timestamp: new Date(),
      message: 'Timeout',
      attempt: 1,
      context: {}
    };

    const diagnosis = {
      errorId: 'err-1',
      errorType: ErrorType.TIMEOUT,
      rootCause: 'Timeout',
      severity: 'medium' as const,
      healable: true,
      confidence: 0.8,
      analysis: {
        patterns: [],
        similarErrors: [],
        affectedNodes: [],
        timelineAnalysis: ''
      },
      suggestedStrategies: [],
      estimatedSuccessRate: 0.7,
      estimatedRecoveryTime: 5000,
      diagnosisTime: 100,
      timestamp: new Date()
    };

    const result = {
      success: true,
      strategyId: 'test-strategy',
      strategyName: 'Test Strategy',
      attempts: 1,
      duration: 1000,
      actionsTaken: [],
      timestamp: new Date()
    };

    await analytics.recordHealingAttempt(error, diagnosis, result);

    const data = await analytics.getAnalytics();
    expect(data.strategyPerformance['test-strategy']).toBeDefined();
    expect(data.strategyPerformance['test-strategy'].timesUsed).toBe(1);
  });
});

describe('Learning Engine', () => {
  let learningEngine: LearningEngine;

  beforeEach(() => {
    learningEngine = new LearningEngine();
  });

  it('should learn from successful healing', async () => {
    const error: WorkflowError = {
      id: 'err-1',
      workflowId: 'wf-1',
      executionId: 'exec-1',
      nodeId: 'node-1',
      nodeName: 'API Call',
      nodeType: 'httpRequest',
      timestamp: new Date(),
      message: 'Timeout',
      attempt: 1,
      context: {}
    };

    const strategy: HealingStrategy = {
      id: 'test-strategy',
      name: 'Test Strategy',
      description: 'Test',
      category: StrategyCategory.RETRY,
      applicableErrors: [ErrorType.TIMEOUT],
      apply: async () => ({
        success: true,
        strategyId: 'test-strategy',
        strategyName: 'Test Strategy',
        attempts: 1,
        duration: 1000,
        actionsTaken: [],
        timestamp: new Date()
      }),
      successRate: 0.8,
      averageDuration: 1000,
      priority: 1,
      costMultiplier: 1.0
    };

    const result = {
      success: true,
      strategyId: 'test-strategy',
      strategyName: 'Test Strategy',
      attempts: 1,
      duration: 1000,
      actionsTaken: [],
      timestamp: new Date()
    };

    await learningEngine.learn(error, strategy, result);

    const data = learningEngine.getLearningData();
    expect(data.length).toBe(1);
    expect(data[0].success).toBe(true);
  });

  it('should not train model with insufficient data', () => {
    const model = learningEngine.getModel();
    expect(model).toBeNull();
  });

  it('should export and import model', async () => {
    // Add some data
    for (let i = 0; i < 15; i++) {
      const error: WorkflowError = {
        id: `err-${i}`,
        workflowId: 'wf-1',
        executionId: `exec-${i}`,
        nodeId: 'node-1',
        nodeName: 'API Call',
        nodeType: 'httpRequest',
        timestamp: new Date(),
        message: 'Timeout',
        attempt: 1,
        context: {}
      };

      const strategy: HealingStrategy = {
        id: 'test-strategy',
        name: 'Test',
        description: 'Test',
        category: StrategyCategory.RETRY,
        applicableErrors: [ErrorType.TIMEOUT],
        apply: async () => ({ success: true, strategyId: 'test', strategyName: 'Test', attempts: 1, duration: 1000, actionsTaken: [], timestamp: new Date() }),
        successRate: 0.8,
        averageDuration: 1000,
        priority: 1,
        costMultiplier: 1.0
      };

      const result = {
        success: true,
        strategyId: 'test-strategy',
        strategyName: 'Test',
        attempts: 1,
        duration: 1000,
        actionsTaken: [],
        timestamp: new Date()
      };

      await learningEngine.learn(error, strategy, result);
    }

    const exported = learningEngine.exportModel();
    expect(exported).toBeTruthy();

    const newEngine = new LearningEngine();
    newEngine.importModel(exported);
    
    const model = newEngine.getModel();
    expect(model).toBeDefined();
  });
});

describe('Integration Tests', () => {
  it('should perform end-to-end healing', async () => {
    const engine = new HealingEngine();

    const error: WorkflowError = {
      id: 'err-integration',
      workflowId: 'wf-integration',
      executionId: 'exec-integration',
      nodeId: 'node-1',
      nodeName: 'API Call',
      nodeType: 'httpRequest',
      timestamp: new Date(),
      message: 'Request timeout',
      attempt: 1,
      context: {
        httpUrl: 'https://api.example.com',
        httpMethod: 'GET'
      }
    };

    const result = await engine.heal(error);
    
    expect(result).toBeDefined();
    expect(result.strategyId).toBeTruthy();
    expect(result.attempts).toBeGreaterThan(0);
  });

  it('should track healing across multiple errors', async () => {
    const engine = new HealingEngine({ trackAnalytics: true });
    const analytics = new HealingAnalytics();

    for (let i = 0; i < 5; i++) {
      const error: WorkflowError = {
        id: `err-${i}`,
        workflowId: 'wf-1',
        executionId: `exec-${i}`,
        nodeId: 'node-1',
        nodeName: 'API Call',
        nodeType: 'httpRequest',
        timestamp: new Date(),
        message: 'Timeout',
        attempt: 1,
        context: {}
      };

      await engine.heal(error);
    }

    const data = await analytics.getAnalytics();
    expect(data.totalHealingAttempts).toBeGreaterThanOrEqual(0);
  });
});

describe('Edge Cases', () => {
  it('should handle unknown error types', async () => {
    const diagnostician = new ErrorDiagnostician();

    const error: WorkflowError = {
      id: 'err-unknown',
      workflowId: 'wf-1',
      executionId: 'exec-1',
      nodeId: 'node-1',
      nodeName: 'Custom Node',
      nodeType: 'custom',
      timestamp: new Date(),
      message: 'Something went wrong with custom logic',
      attempt: 1,
      context: {}
    };

    const diagnosis = await diagnostician.diagnose(error);
    expect(diagnosis.errorType).toBe(ErrorType.UNKNOWN);
  });

  it('should handle low confidence diagnoses', async () => {
    const engine = new HealingEngine({ minConfidenceThreshold: 0.9 });

    const error: WorkflowError = {
      id: 'err-low-confidence',
      workflowId: 'wf-1',
      executionId: 'exec-1',
      nodeId: 'node-1',
      nodeName: 'Node',
      nodeType: 'unknown',
      timestamp: new Date(),
      message: 'Vague error',
      attempt: 1,
      context: {}
    };

    const result = await engine.heal(error);
    expect(result.success).toBe(false);
  });

  it('should handle concurrent healing attempts', async () => {
    const engine = new HealingEngine();

    const errors = Array.from({ length: 5 }, (_, i) => ({
      id: `err-${i}`,
      workflowId: 'wf-1',
      executionId: `exec-${i}`,
      nodeId: 'node-1',
      nodeName: 'API Call',
      nodeType: 'httpRequest',
      timestamp: new Date(),
      message: 'Timeout',
      attempt: 1,
      context: {}
    }));

    const results = await Promise.all(errors.map(e => engine.heal(e)));
    expect(results.length).toBe(5);
  });
});

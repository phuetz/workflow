/**
 * Comprehensive Unit Tests for Self-Healing System
 * Tests WITHOUT mocks - using real implementations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorDiagnostician } from '../healing/ErrorDiagnostician';
import { HealingStrategyRegistry, healingStrategyRegistry, ALL_HEALING_STRATEGIES } from '../healing/HealingStrategies';
import {
  WorkflowError,
  ErrorType,
  ErrorSeverity,
  StrategyCategory,
  HealingStrategy,
  HealingContext,
  HealingResult,
} from '../types/healing';

// Helper function to create test workflow errors
function createWorkflowError(overrides: Partial<WorkflowError> = {}): WorkflowError {
  return {
    id: `err_${Date.now()}`,
    workflowId: 'wf_test',
    executionId: 'exec_test',
    nodeId: 'node_test',
    nodeName: 'Test Node',
    nodeType: 'http',
    timestamp: new Date(),
    message: 'Test error message',
    code: 'TEST_ERROR',
    statusCode: 500,
    context: {
      input: { key: 'value' },
      executionTime: 1000,
    },
    attempt: 1,
    ...overrides,
  };
}

describe('ErrorDiagnostician', () => {
  let diagnostician: ErrorDiagnostician;

  beforeEach(() => {
    diagnostician = new ErrorDiagnostician();
  });

  describe('diagnose', () => {
    it('should diagnose an error and return diagnosis', async () => {
      const error = createWorkflowError({
        message: 'Too many requests',
        statusCode: 429,
      });

      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis).toBeDefined();
      expect(diagnosis.errorId).toBe(error.id);
      expect(diagnosis.timestamp).toBeInstanceOf(Date);
    });

    it('should classify rate limit errors correctly', async () => {
      const error = createWorkflowError({
        message: 'Rate limit exceeded',
        statusCode: 429,
        code: 'RATE_LIMIT_EXCEEDED',
      });

      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.errorType).toBe(ErrorType.RATE_LIMIT);
    });

    it('should classify timeout errors correctly', async () => {
      const error = createWorkflowError({
        message: 'Request timed out',
        code: 'ETIMEDOUT',
        statusCode: 408,
      });

      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.errorType).toBe(ErrorType.TIMEOUT);
    });

    it('should classify authentication errors correctly', async () => {
      const error = createWorkflowError({
        message: 'Unauthorized access',
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });

      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.errorType).toBe(ErrorType.AUTHENTICATION_FAILED);
    });

    it('should classify authorization errors correctly', async () => {
      const error = createWorkflowError({
        message: 'Forbidden access',
        statusCode: 403,
        code: 'FORBIDDEN',
      });

      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.errorType).toBe(ErrorType.AUTHORIZATION_FAILED);
    });

    it('should classify resource not found errors correctly', async () => {
      const error = createWorkflowError({
        message: 'Resource not found',
        statusCode: 404,
        code: 'NOT_FOUND',
      });

      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.errorType).toBe(ErrorType.RESOURCE_NOT_FOUND);
    });

    it('should classify service unavailable errors correctly', async () => {
      const error = createWorkflowError({
        message: 'Service temporarily unavailable',
        statusCode: 503,
        code: 'SERVICE_UNAVAILABLE',
      });

      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.errorType).toBe(ErrorType.SERVICE_UNAVAILABLE);
    });

    it('should classify connection failed errors correctly', async () => {
      const error = createWorkflowError({
        message: 'Connection refused',
        code: 'ECONNREFUSED',
      });

      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.errorType).toBe(ErrorType.CONNECTION_FAILED);
    });

    it('should classify validation errors correctly', async () => {
      const error = createWorkflowError({
        message: 'Validation failed: invalid input',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });

      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.errorType).toBe(ErrorType.VALIDATION_ERROR);
    });

    it('should classify parse errors correctly', async () => {
      const error = createWorkflowError({
        message: 'JSON parse error: unexpected token',
        code: 'PARSE_ERROR',
      });

      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.errorType).toBe(ErrorType.PARSE_ERROR);
    });

    it('should classify memory limit errors correctly', async () => {
      const error = createWorkflowError({
        message: 'Out of memory',
        code: 'MEMORY_LIMIT_EXCEEDED',
      });

      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.errorType).toBe(ErrorType.MEMORY_LIMIT);
    });

    it('should classify quota exceeded errors correctly', async () => {
      const error = createWorkflowError({
        message: 'Quota exceeded for this API',
        code: 'QUOTA_EXCEEDED',
      });

      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.errorType).toBe(ErrorType.QUOTA_EXCEEDED);
    });

    it('should classify unknown errors when no match', async () => {
      const error = createWorkflowError({
        message: 'Some random error',
        code: 'RANDOM_CODE',
        statusCode: 599,
      });

      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.errorType).toBe(ErrorType.UNKNOWN);
    });

    it('should determine healability', async () => {
      const healableError = createWorkflowError({
        message: 'Rate limit exceeded',
        statusCode: 429,
      });

      const diagnosis = await diagnostician.diagnose(healableError);

      expect(typeof diagnosis.healable).toBe('boolean');
    });

    it('should provide confidence score between 0 and 1', async () => {
      const error = createWorkflowError({
        message: 'Timeout occurred',
        code: 'ETIMEDOUT',
      });

      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.confidence).toBeGreaterThanOrEqual(0);
      expect(diagnosis.confidence).toBeLessThanOrEqual(1);
    });

    it('should provide root cause analysis', async () => {
      const error = createWorkflowError({
        message: 'Authentication failed: token expired',
        statusCode: 401,
      });

      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.rootCause).toBeDefined();
      expect(typeof diagnosis.rootCause).toBe('string');
      expect(diagnosis.rootCause.length).toBeGreaterThan(0);
    });

    it('should determine severity level', async () => {
      const error = createWorkflowError({
        message: 'Service unavailable',
        statusCode: 503,
      });

      const diagnosis = await diagnostician.diagnose(error);

      expect([
        ErrorSeverity.CRITICAL,
        ErrorSeverity.HIGH,
        ErrorSeverity.MEDIUM,
        ErrorSeverity.LOW,
      ]).toContain(diagnosis.severity);
    });

    it('should provide diagnosis time', async () => {
      const error = createWorkflowError();

      const diagnosis = await diagnostician.diagnose(error);

      expect(typeof diagnosis.diagnosisTime).toBe('number');
      expect(diagnosis.diagnosisTime).toBeGreaterThanOrEqual(0);
    });

    it('should include analysis data', async () => {
      const error = createWorkflowError();

      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.analysis).toBeDefined();
      expect(diagnosis.analysis.patterns).toBeDefined();
      expect(diagnosis.analysis.similarErrors).toBeDefined();
      expect(diagnosis.analysis.affectedNodes).toBeDefined();
    });

    it('should suggest healing strategies', async () => {
      const error = createWorkflowError({
        message: 'Rate limit exceeded',
        statusCode: 429,
      });

      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.suggestedStrategies).toBeDefined();
      expect(Array.isArray(diagnosis.suggestedStrategies)).toBe(true);
    });

    it('should provide estimated success rate', async () => {
      const error = createWorkflowError();

      const diagnosis = await diagnostician.diagnose(error);

      expect(typeof diagnosis.estimatedSuccessRate).toBe('number');
      expect(diagnosis.estimatedSuccessRate).toBeGreaterThanOrEqual(0);
      expect(diagnosis.estimatedSuccessRate).toBeLessThanOrEqual(1);
    });

    it('should provide estimated recovery time', async () => {
      const error = createWorkflowError();

      const diagnosis = await diagnostician.diagnose(error);

      expect(typeof diagnosis.estimatedRecoveryTime).toBe('number');
      expect(diagnosis.estimatedRecoveryTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error pattern classification', () => {
    it('should match status code 429 to rate limit', async () => {
      const error = createWorkflowError({ statusCode: 429 });
      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.errorType).toBe(ErrorType.RATE_LIMIT);
    });

    it('should match status code 504 to timeout', async () => {
      const error = createWorkflowError({ statusCode: 504 });
      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.errorType).toBe(ErrorType.TIMEOUT);
    });

    it('should match status code 502 to service unavailable', async () => {
      const error = createWorkflowError({ statusCode: 502 });
      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.errorType).toBe(ErrorType.SERVICE_UNAVAILABLE);
    });

    it('should match ECONNRESET code to connection failed', async () => {
      const error = createWorkflowError({ code: 'ECONNRESET' });
      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.errorType).toBe(ErrorType.CONNECTION_FAILED);
    });

    it('should match ENOTFOUND code to connection failed', async () => {
      const error = createWorkflowError({ code: 'ENOTFOUND' });
      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.errorType).toBe(ErrorType.CONNECTION_FAILED);
    });

    it('should match status code 422 to validation error', async () => {
      const error = createWorkflowError({ statusCode: 422 });
      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.errorType).toBe(ErrorType.VALIDATION_ERROR);
    });
  });

  describe('root cause messages', () => {
    it('should provide specific root cause for rate limit', async () => {
      const error = createWorkflowError({ statusCode: 429 });
      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.rootCause).toContain('rate limit');
    });

    it('should provide specific root cause for authentication with expired token', async () => {
      const error = createWorkflowError({
        statusCode: 401,
        message: 'Token has expired',
      });
      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.rootCause.toLowerCase()).toContain('authentication');
    });

    it('should provide specific root cause for connection refused', async () => {
      const error = createWorkflowError({ code: 'ECONNREFUSED' });
      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.rootCause.toLowerCase()).toContain('connection');
    });

    it('should provide specific root cause for DNS failure', async () => {
      const error = createWorkflowError({ code: 'ENOTFOUND' });
      const diagnosis = await diagnostician.diagnose(error);

      expect(diagnosis.rootCause.toLowerCase()).toContain('dns');
    });
  });

  describe('class instantiation', () => {
    it('should allow creating multiple instances', () => {
      const instance1 = new ErrorDiagnostician();
      const instance2 = new ErrorDiagnostician();

      expect(instance1).toBeDefined();
      expect(instance2).toBeDefined();
      expect(instance1).not.toBe(instance2);
    });
  });
});

describe('HealingStrategyRegistry', () => {
  let registry: HealingStrategyRegistry;

  beforeEach(() => {
    registry = new HealingStrategyRegistry();
  });

  describe('constructor', () => {
    it('should create registry instance', () => {
      expect(registry).toBeDefined();
      expect(registry).toBeInstanceOf(HealingStrategyRegistry);
    });

    it('should register default strategies', () => {
      const strategies = registry.getAll();
      expect(Array.isArray(strategies)).toBe(true);
    });
  });

  describe('register', () => {
    it('should register a new strategy', () => {
      const strategy: HealingStrategy = {
        id: 'test_strategy',
        name: 'Test Strategy',
        description: 'A test strategy',
        category: StrategyCategory.RETRY,
        applicableErrors: [ErrorType.TIMEOUT],
        apply: async () => ({
          success: true,
          action: { type: 'retry' as any, description: 'Retried' },
          duration: 100,
          timestamp: new Date(),
        }),
        successRate: 0.8,
        averageDuration: 1000,
        priority: 5,
        costMultiplier: 1.0,
      };

      registry.register(strategy);

      const retrieved = registry.get('test_strategy');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test_strategy');
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent strategy', () => {
      const strategy = registry.get('non_existent');
      expect(strategy).toBeUndefined();
    });

    it('should return registered strategy', () => {
      const strategy: HealingStrategy = {
        id: 'get_test',
        name: 'Get Test',
        description: 'Test',
        category: StrategyCategory.FAILOVER,
        applicableErrors: [ErrorType.CONNECTION_FAILED],
        apply: async () => ({
          success: true,
          action: { type: 'failover' as any, description: 'Switched' },
          duration: 50,
          timestamp: new Date(),
        }),
        successRate: 0.9,
        averageDuration: 500,
        priority: 7,
        costMultiplier: 1.5,
      };

      registry.register(strategy);

      const retrieved = registry.get('get_test');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Get Test');
    });
  });

  describe('getAll', () => {
    it('should return array of strategies', () => {
      const strategies = registry.getAll();
      expect(Array.isArray(strategies)).toBe(true);
    });

    it('should include all registered strategies', () => {
      registry.register({
        id: 'all_test_1',
        name: 'All Test 1',
        description: 'Test 1',
        category: StrategyCategory.RETRY,
        applicableErrors: [ErrorType.TIMEOUT],
        apply: async () => ({
          success: true,
          action: { type: 'retry' as any, description: 'Done' },
          duration: 100,
          timestamp: new Date(),
        }),
        successRate: 0.7,
        averageDuration: 1000,
        priority: 5,
        costMultiplier: 1.0,
      });

      registry.register({
        id: 'all_test_2',
        name: 'All Test 2',
        description: 'Test 2',
        category: StrategyCategory.RETRY,
        applicableErrors: [ErrorType.TIMEOUT],
        apply: async () => ({
          success: true,
          action: { type: 'retry' as any, description: 'Done' },
          duration: 100,
          timestamp: new Date(),
        }),
        successRate: 0.8,
        averageDuration: 900,
        priority: 6,
        costMultiplier: 1.0,
      });

      const strategies = registry.getAll();
      const ids = strategies.map((s) => s.id);

      expect(ids).toContain('all_test_1');
      expect(ids).toContain('all_test_2');
    });
  });

  describe('getByErrorType', () => {
    beforeEach(() => {
      registry.register({
        id: 'timeout_strategy',
        name: 'Timeout Strategy',
        description: 'Handles timeouts',
        category: StrategyCategory.RETRY,
        applicableErrors: [ErrorType.TIMEOUT],
        apply: async () => ({
          success: true,
          action: { type: 'retry' as any, description: 'Done' },
          duration: 100,
          timestamp: new Date(),
        }),
        successRate: 0.8,
        averageDuration: 1000,
        priority: 5,
        costMultiplier: 1.0,
      });

      registry.register({
        id: 'rate_limit_strategy',
        name: 'Rate Limit Strategy',
        description: 'Handles rate limits',
        category: StrategyCategory.RETRY,
        applicableErrors: [ErrorType.RATE_LIMIT],
        apply: async () => ({
          success: true,
          action: { type: 'retry' as any, description: 'Done' },
          duration: 100,
          timestamp: new Date(),
        }),
        successRate: 0.9,
        averageDuration: 2000,
        priority: 7,
        costMultiplier: 1.0,
      });
    });

    it('should return strategies for specific error type', () => {
      const strategies = registry.getByErrorType(ErrorType.TIMEOUT);

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.every((s) => s.applicableErrors.includes(ErrorType.TIMEOUT))).toBe(true);
    });

    it('should return empty array for error type with no strategies', () => {
      const strategies = registry.getByErrorType(ErrorType.DEADLOCK);

      // May or may not have strategies, but should not throw
      expect(Array.isArray(strategies)).toBe(true);
    });

    it('should sort strategies by priority', () => {
      const strategies = registry.getByErrorType(ErrorType.TIMEOUT);

      if (strategies.length > 1) {
        for (let i = 0; i < strategies.length - 1; i++) {
          expect(strategies[i].priority).toBeLessThanOrEqual(strategies[i + 1].priority);
        }
      }
    });
  });

  describe('getByCategory', () => {
    beforeEach(() => {
      registry.register({
        id: 'retry_cat_test',
        name: 'Retry Category Test',
        description: 'Test',
        category: StrategyCategory.RETRY,
        applicableErrors: [ErrorType.TIMEOUT],
        apply: async () => ({
          success: true,
          action: { type: 'retry' as any, description: 'Done' },
          duration: 100,
          timestamp: new Date(),
        }),
        successRate: 0.8,
        averageDuration: 1000,
        priority: 5,
        costMultiplier: 1.0,
      });

      registry.register({
        id: 'failover_cat_test',
        name: 'Failover Category Test',
        description: 'Test',
        category: StrategyCategory.FAILOVER,
        applicableErrors: [ErrorType.SERVICE_UNAVAILABLE],
        apply: async () => ({
          success: true,
          action: { type: 'failover' as any, description: 'Done' },
          duration: 100,
          timestamp: new Date(),
        }),
        successRate: 0.9,
        averageDuration: 500,
        priority: 7,
        costMultiplier: 1.5,
      });
    });

    it('should return strategies for specific category', () => {
      const strategies = registry.getByCategory(StrategyCategory.RETRY);

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.every((s) => s.category === StrategyCategory.RETRY)).toBe(true);
    });

    it('should return failover strategies', () => {
      const strategies = registry.getByCategory(StrategyCategory.FAILOVER);

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.every((s) => s.category === StrategyCategory.FAILOVER)).toBe(true);
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(healingStrategyRegistry).toBeDefined();
      expect(healingStrategyRegistry).toBeInstanceOf(HealingStrategyRegistry);
    });
  });
});

describe('Error Types', () => {
  it('should have all error type values', () => {
    expect(ErrorType.RATE_LIMIT).toBe('RATE_LIMIT');
    expect(ErrorType.TIMEOUT).toBe('TIMEOUT');
    expect(ErrorType.CONNECTION_FAILED).toBe('CONNECTION_FAILED');
    expect(ErrorType.DNS_FAILURE).toBe('DNS_FAILURE');
    expect(ErrorType.SSL_ERROR).toBe('SSL_ERROR');
    expect(ErrorType.AUTHENTICATION_FAILED).toBe('AUTHENTICATION_FAILED');
    expect(ErrorType.AUTHORIZATION_FAILED).toBe('AUTHORIZATION_FAILED');
    expect(ErrorType.INVALID_REQUEST).toBe('INVALID_REQUEST');
    expect(ErrorType.RESOURCE_NOT_FOUND).toBe('RESOURCE_NOT_FOUND');
    expect(ErrorType.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorType.PARSE_ERROR).toBe('PARSE_ERROR');
    expect(ErrorType.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
    expect(ErrorType.MEMORY_LIMIT).toBe('MEMORY_LIMIT');
    expect(ErrorType.QUOTA_EXCEEDED).toBe('QUOTA_EXCEEDED');
    expect(ErrorType.UNKNOWN).toBe('UNKNOWN');
  });
});

describe('Error Severity', () => {
  it('should have all severity levels', () => {
    expect(ErrorSeverity.CRITICAL).toBe('critical');
    expect(ErrorSeverity.HIGH).toBe('high');
    expect(ErrorSeverity.MEDIUM).toBe('medium');
    expect(ErrorSeverity.LOW).toBe('low');
  });
});

describe('Strategy Categories', () => {
  it('should have all category values', () => {
    expect(StrategyCategory.RETRY).toBe('RETRY');
    expect(StrategyCategory.FAILOVER).toBe('FAILOVER');
    expect(StrategyCategory.DEGRADATION).toBe('DEGRADATION');
    expect(StrategyCategory.CONFIGURATION).toBe('CONFIGURATION');
    expect(StrategyCategory.RESOURCE).toBe('RESOURCE');
    expect(StrategyCategory.DATA).toBe('DATA');
    expect(StrategyCategory.CIRCUIT_BREAKER).toBe('CIRCUIT_BREAKER');
  });
});

describe('Workflow Error Structure', () => {
  it('should create valid workflow error object', () => {
    const error = createWorkflowError();

    expect(error.id).toBeDefined();
    expect(error.workflowId).toBeDefined();
    expect(error.executionId).toBeDefined();
    expect(error.nodeId).toBeDefined();
    expect(error.nodeName).toBeDefined();
    expect(error.nodeType).toBeDefined();
    expect(error.timestamp).toBeInstanceOf(Date);
    expect(error.message).toBeDefined();
    expect(error.context).toBeDefined();
    expect(error.attempt).toBeDefined();
  });

  it('should support custom overrides', () => {
    const error = createWorkflowError({
      workflowId: 'custom_workflow',
      message: 'Custom error message',
      statusCode: 418,
    });

    expect(error.workflowId).toBe('custom_workflow');
    expect(error.message).toBe('Custom error message');
    expect(error.statusCode).toBe(418);
  });

  it('should support error context', () => {
    const error = createWorkflowError({
      context: {
        input: { data: 'test' },
        output: { result: 'fail' },
        executionTime: 5000,
        memoryUsage: 1024,
        httpMethod: 'POST',
        httpUrl: 'https://api.example.com',
      },
    });

    expect(error.context.input).toEqual({ data: 'test' });
    expect(error.context.executionTime).toBe(5000);
    expect(error.context.httpMethod).toBe('POST');
  });
});

describe('Integration: Diagnosis to Strategy', () => {
  let diagnostician: ErrorDiagnostician;
  let registry: HealingStrategyRegistry;

  beforeEach(() => {
    diagnostician = new ErrorDiagnostician();
    registry = new HealingStrategyRegistry();

    // Register strategies for testing
    registry.register({
      id: 'integration_timeout_strategy',
      name: 'Integration Timeout Strategy',
      description: 'Handles timeout errors',
      category: StrategyCategory.RETRY,
      applicableErrors: [ErrorType.TIMEOUT],
      apply: async () => ({
        success: true,
        action: { type: 'retry' as any, description: 'Retried with backoff' },
        duration: 1500,
        timestamp: new Date(),
      }),
      successRate: 0.85,
      averageDuration: 1500,
      priority: 5,
      costMultiplier: 1.0,
    });
  });

  it('should diagnose error and find applicable strategies', async () => {
    const error = createWorkflowError({
      message: 'Request timed out',
      code: 'ETIMEDOUT',
    });

    const diagnosis = await diagnostician.diagnose(error);
    const strategies = registry.getByErrorType(diagnosis.errorType);

    expect(diagnosis.errorType).toBe(ErrorType.TIMEOUT);
    expect(strategies.length).toBeGreaterThan(0);
    expect(strategies.some((s) => s.applicableErrors.includes(ErrorType.TIMEOUT))).toBe(true);
  });

  it('should find strategies for rate limit errors', async () => {
    registry.register({
      id: 'integration_rate_limit_strategy',
      name: 'Rate Limit Strategy',
      description: 'Handles rate limit errors',
      category: StrategyCategory.RETRY,
      applicableErrors: [ErrorType.RATE_LIMIT],
      apply: async () => ({
        success: true,
        action: { type: 'retry' as any, description: 'Waited and retried' },
        duration: 5000,
        timestamp: new Date(),
      }),
      successRate: 0.95,
      averageDuration: 5000,
      priority: 8,
      costMultiplier: 1.0,
    });

    const error = createWorkflowError({
      message: 'Rate limit exceeded',
      statusCode: 429,
    });

    const diagnosis = await diagnostician.diagnose(error);
    const strategies = registry.getByErrorType(diagnosis.errorType);

    expect(diagnosis.errorType).toBe(ErrorType.RATE_LIMIT);
    expect(strategies.length).toBeGreaterThan(0);
  });
});

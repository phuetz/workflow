/**
 * Comprehensive Error Handling Tests
 * Tests for ErrorOutputHandler, ErrorWorkflowService, RetryManager, and CircuitBreaker
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorOutputHandler } from '../execution/ErrorOutputHandler';
import { ErrorWorkflowService, ErrorWorkflowContext } from '../services/ErrorWorkflowService';
import { RetryManager, RetryConfig } from '../execution/RetryManager';
import {
  CircuitBreaker,
  CircuitBreakerManager,
  CircuitBreakerOpenError
} from '../execution/CircuitBreaker';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';

describe('ErrorOutputHandler', () => {
  let nodes: WorkflowNode[];
  let edges: WorkflowEdge[];
  let handler: ErrorOutputHandler;

  beforeEach(() => {
    nodes = [
      {
        id: 'node1',
        type: 'httpRequest',
        position: { x: 0, y: 0 },
        data: {
          id: 'node1',
          type: 'httpRequest',
          label: 'API Call',
          icon: 'Globe',
          color: 'bg-blue-500',
          inputs: 1,
          outputs: 1,
          position: { x: 0, y: 0 },
          config: { enableErrorHandle: true }
        }
      },
      {
        id: 'node2',
        type: 'slack',
        position: { x: 200, y: 0 },
        data: {
          id: 'node2',
          type: 'slack',
          label: 'Notify Slack',
          icon: 'MessageSquare',
          color: 'bg-purple-500',
          inputs: 1,
          outputs: 1,
          position: { x: 200, y: 0 }
        }
      },
      {
        id: 'error-handler',
        type: 'function',
        position: { x: 200, y: 100 },
        data: {
          id: 'error-handler',
          type: 'function',
          label: 'Error Handler',
          icon: 'Code',
          color: 'bg-red-500',
          inputs: 1,
          outputs: 1,
          position: { x: 200, y: 100 }
        }
      }
    ];

    edges = [
      {
        id: 'e1',
        source: 'node1',
        target: 'node2',
        sourceHandle: 'output',
        targetHandle: 'input'
      },
      {
        id: 'e2',
        source: 'node1',
        target: 'error-handler',
        sourceHandle: 'error',
        targetHandle: 'input',
        data: { type: 'error' }
      }
    ];

    handler = new ErrorOutputHandler(nodes, edges);
  });

  it('should identify nodes with error handles', () => {
    expect(handler.hasErrorHandle('node1')).toBe(true);
    expect(handler.hasErrorHandle('node2')).toBe(false);
  });

  it('should route success output correctly', () => {
    const routes = handler.routeOutput('node1', true, { result: 'success' });

    expect(routes).toHaveLength(1);
    expect(routes[0].targetNodeId).toBe('node2');
    expect(routes[0].outputIndex).toBe(0);
  });

  it('should route error output correctly', () => {
    const error = new Error('Test error');
    const routes = handler.routeOutput(
      'node1',
      false,
      {},
      error,
      { executionId: 'exec1', workflowId: 'wf1' }
    );

    expect(routes).toHaveLength(1);
    expect(routes[0].targetNodeId).toBe('error-handler');
    expect(routes[0].outputIndex).toBe(1);

    const errorData = routes[0].data as any;
    expect(errorData.error.message).toBe('Test error');
    expect(errorData.error.nodeId).toBe('node1');
  });

  it('should create error output data structure', () => {
    const error = new Error('Test error');
    const errorData = handler.createErrorOutput('node1', error, { input: 'test' });

    expect(errorData.error.message).toBe('Test error');
    expect(errorData.error.nodeId).toBe('node1');
    expect(errorData.error.nodeType).toBe('httpRequest');
    expect(errorData.originalInput).toEqual({ input: 'test' });
  });

  it('should validate error outputs', () => {
    const validation = handler.validateErrorOutputs();
    expect(validation.valid).toBe(true);
  });

  it('should get statistics', () => {
    const stats = handler.getStatistics();
    expect(stats.totalNodes).toBe(3);
    expect(stats.nodesWithErrorHandles).toBe(1);
    expect(stats.errorEdges).toBe(1);
    expect(stats.successEdges).toBe(1);
  });
});

describe('ErrorWorkflowService', () => {
  let service: ErrorWorkflowService;

  beforeEach(() => {
    service = new ErrorWorkflowService();
  });

  it('should register error workflow', () => {
    const config = {
      id: 'test-workflow',
      name: 'Test Workflow',
      description: 'Test',
      enabled: true,
      workflowId: 'wf1',
      trigger: { type: 'all' as const },
      priority: 50,
      async: true
    };

    service.registerErrorWorkflow(config);
    const retrieved = service.getErrorWorkflow('test-workflow');
    expect(retrieved).toEqual(config);
  });

  it('should trigger matching error workflows', async () => {
    const config = {
      id: 'test-workflow',
      name: 'Test Workflow',
      description: 'Test',
      enabled: true,
      workflowId: 'wf1',
      trigger: { type: 'all' as const },
      priority: 50,
      async: true
    };

    service.registerErrorWorkflow(config);

    const context: ErrorWorkflowContext = {
      failedNodeId: 'node1',
      failedNodeType: 'httpRequest',
      failedNodeName: 'API Call',
      errorDetails: {
        message: 'Connection timeout',
        code: 'ETIMEDOUT',
        timestamp: Date.now()
      },
      executionId: 'exec1',
      workflowId: 'wf1'
    };

    const executions = await service.triggerErrorWorkflows(context);
    expect(executions).toHaveLength(1);
    expect(executions[0].workflowId).toBe('test-workflow');
  });

  it('should have error workflow templates', () => {
    const templates = service.getTemplates();
    expect(templates.length).toBeGreaterThan(0);

    const slackTemplate = templates.find(t => t.id === 'slack-notification');
    expect(slackTemplate).toBeDefined();
    expect(slackTemplate?.category).toBe('notification');
  });

  it('should create workflow from template', () => {
    const workflow = service.createFromTemplate('slack-notification', {
      name: 'Custom Slack Alert',
      workflowId: 'wf1'
    });

    expect(workflow).toBeDefined();
    expect(workflow?.name).toBe('Custom Slack Alert');
  });

  it('should get statistics', () => {
    const stats = service.getStatistics();
    expect(stats).toHaveProperty('totalWorkflows');
    expect(stats).toHaveProperty('enabledWorkflows');
    expect(stats).toHaveProperty('totalExecutions');
    expect(stats).toHaveProperty('successRate');
  });
});

describe('RetryManager', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = new RetryManager();
  });

  it('should execute without retry when disabled', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const config: RetryConfig = {
      enabled: false,
      maxAttempts: 3,
      strategy: 'fixed',
      initialDelay: 100
    };

    const result = await retryManager.executeWithRetry(fn, config);

    expect(result.success).toBe(true);
    expect(result.result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure with fixed delay', async () => {
    let attempts = 0;
    const fn = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) throw new Error('Temporary error');
      return 'success';
    });

    const config: RetryConfig = {
      enabled: true,
      maxAttempts: 5,
      strategy: 'fixed',
      initialDelay: 10
    };

    const result = await retryManager.executeWithRetry(fn, config);

    expect(result.success).toBe(true);
    expect(result.result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(result.metrics.totalRetries).toBe(2);
  });

  it('should use exponential backoff', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Always fails'));
    const config: RetryConfig = {
      enabled: true,
      maxAttempts: 4,
      strategy: 'exponential',
      initialDelay: 100,
      multiplier: 2,
      jitter: false
    };

    const result = await retryManager.executeWithRetry(fn, config);

    expect(result.success).toBe(false);
    expect(fn).toHaveBeenCalledTimes(4);

    // Verify delays follow exponential pattern: 100, 200, 400
    const delays = result.state.history.map(h => h.delay);
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(200);
    expect(delays[2]).toBe(400);
  });

  it('should use linear backoff', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Always fails'));
    const config: RetryConfig = {
      enabled: true,
      maxAttempts: 4,
      strategy: 'linear',
      initialDelay: 100,
      multiplier: 1,
      jitter: false
    };

    const result = await retryManager.executeWithRetry(fn, config);

    const delays = result.state.history.map(h => h.delay);
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(200);
    expect(delays[2]).toBe(300);
  });

  it('should use fibonacci backoff', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Always fails'));
    const config: RetryConfig = {
      enabled: true,
      maxAttempts: 5,
      strategy: 'fibonacci',
      initialDelay: 100,
      jitter: false
    };

    const result = await retryManager.executeWithRetry(fn, config);

    const delays = result.state.history.map(h => h.delay);
    // Fibonacci: 1, 1, 2, 3, 5 * 100 = 100, 100, 200, 300
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(100);
    expect(delays[2]).toBe(200);
    expect(delays[3]).toBe(300);
  });

  it('should respect maxDelay cap', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Always fails'));
    const config: RetryConfig = {
      enabled: true,
      maxAttempts: 5,
      strategy: 'exponential',
      initialDelay: 100,
      multiplier: 2,
      maxDelay: 300,
      jitter: false
    };

    const result = await retryManager.executeWithRetry(fn, config);

    const delays = result.state.history.map(h => h.delay);
    // Would be 100, 200, 400, 800 but capped at 300
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(200);
    expect(delays[2]).toBe(300);
    expect(delays[3]).toBe(300);
  });

  it('should skip retry for non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('401 Unauthorized'));
    const config: RetryConfig = {
      enabled: true,
      maxAttempts: 5,
      strategy: 'fixed',
      initialDelay: 100
    };

    const result = await retryManager.executeWithRetry(fn, config);

    expect(result.success).toBe(false);
    expect(fn).toHaveBeenCalledTimes(1); // No retries for auth errors
  });

  it('should validate retry config', () => {
    const validation1 = RetryManager.validateConfig({ maxAttempts: 101 });
    expect(validation1.valid).toBe(false);

    const validation2 = RetryManager.validateConfig({ maxAttempts: 5, initialDelay: 1000 });
    expect(validation2.valid).toBe(true);
  });

  it('should calculate total delay', () => {
    const config: RetryConfig = {
      enabled: true,
      maxAttempts: 3,
      strategy: 'exponential',
      initialDelay: 1000,
      multiplier: 2
    };

    const totalDelay = RetryManager.calculateTotalDelay(config);
    // 1000 + 2000 + 4000 = 7000
    expect(totalDelay).toBe(7000);
  });
});

describe('CircuitBreaker', () => {
  it('should allow execution when closed', async () => {
    const breaker = new CircuitBreaker('test', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000
    });

    const fn = vi.fn().mockResolvedValue('success');
    const result = await breaker.execute(fn);

    expect(result).toBe('success');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should open circuit after threshold failures', async () => {
    const breaker = new CircuitBreaker('test', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000
    });

    const fn = vi.fn().mockRejectedValue(new Error('Failure'));

    // Trigger failures
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(fn);
      } catch (error) {
        // Expected
      }
    }

    expect(breaker.getState()).toBe('OPEN');

    // Next call should be rejected immediately
    await expect(breaker.execute(fn)).rejects.toThrow(CircuitBreakerOpenError);
  });

  it('should transition to half-open after timeout', async () => {
    const breaker = new CircuitBreaker('test', {
      failureThreshold: 2,
      successThreshold: 1,
      timeout: 100 // Short timeout for testing
    });

    const fn = vi.fn().mockRejectedValue(new Error('Failure'));

    // Open the circuit
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(fn);
      } catch (error) {
        // Expected
      }
    }

    expect(breaker.getState()).toBe('OPEN');

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Next call should transition to HALF_OPEN
    fn.mockResolvedValue('success');
    await breaker.execute(fn);

    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should close circuit after success threshold in half-open', async () => {
    const breaker = new CircuitBreaker('test', {
      failureThreshold: 2,
      successThreshold: 2,
      timeout: 100
    });

    const fn = vi.fn();

    // Open circuit
    fn.mockRejectedValue(new Error('Failure'));
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(fn);
      } catch (error) {
        // Expected
      }
    }

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Successful calls in half-open
    fn.mockResolvedValue('success');
    await breaker.execute(fn);
    await breaker.execute(fn);

    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should get statistics', () => {
    const breaker = new CircuitBreaker('test', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000
    });

    const stats = breaker.getStats();
    expect(stats.state).toBe('CLOSED');
    expect(stats.totalCalls).toBe(0);
    expect(stats.failures).toBe(0);
  });

  it('should reset circuit', async () => {
    const breaker = new CircuitBreaker('test', {
      failureThreshold: 2,
      successThreshold: 2,
      timeout: 1000
    });

    const fn = vi.fn().mockRejectedValue(new Error('Failure'));

    // Open circuit
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(fn);
      } catch (error) {
        // Expected
      }
    }

    expect(breaker.getState()).toBe('OPEN');

    breaker.reset();
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.getStats().failures).toBe(0);
  });
});

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;

  beforeEach(() => {
    manager = new CircuitBreakerManager();
  });

  it('should create and retrieve circuit breakers', () => {
    const breaker1 = manager.getBreaker('service1');
    const breaker2 = manager.getBreaker('service1');

    expect(breaker1).toBe(breaker2); // Same instance
  });

  it('should execute with circuit breaker', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await manager.execute('test-service', fn);

    expect(result).toBe('success');
  });

  it('should get health summary', async () => {
    const fn1 = vi.fn().mockResolvedValue('success');
    const fn2 = vi.fn().mockRejectedValue(new Error('Failure'));

    await manager.execute('healthy-service', fn1);

    // Open a circuit
    for (let i = 0; i < 5; i++) {
      try {
        await manager.execute('failing-service', fn2);
      } catch (error) {
        // Expected
      }
    }

    const health = manager.getHealthSummary();
    expect(health.total).toBe(2);
    expect(health.open).toBeGreaterThan(0);
  });

  it('should create circuit breaker for node', () => {
    const breaker = manager.createForNode('node1', 'httpRequest');
    expect(breaker).toBeDefined();
  });

  it('should create circuit breaker for service', () => {
    const breaker = manager.createForService('external-api');
    expect(breaker).toBeDefined();
  });
});

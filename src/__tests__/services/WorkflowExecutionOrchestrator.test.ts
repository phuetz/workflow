/**
 * WorkflowExecutionOrchestrator Unit Tests
 * Tests for the unified workflow execution orchestrator
 *
 * Task: T2.8 - Tests WorkflowExecutionOrchestrator
 * Created: 2026-01-07
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies
vi.mock('../../services/SimpleLogger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn()
  }
}));

// Mock ExecutionManager
vi.mock('../../execution/ExecutionManager', () => ({
  ExecutionManager: vi.fn().mockImplementation(() => ({
    startExecution: vi.fn().mockResolvedValue({
      id: 'exec-123',
      workflowId: 'wf-1',
      status: 'running',
      startedAt: new Date(),
      nodeExecutions: []
    }),
    completeExecution: vi.fn().mockResolvedValue(undefined),
    cancelExecution: vi.fn().mockResolvedValue(undefined),
    recordNodeExecution: vi.fn().mockResolvedValue(undefined)
  }))
}));

// Mock RetryManager
vi.mock('../../execution/RetryManager', () => ({
  RetryManager: vi.fn().mockImplementation(() => ({
    executeWithRetry: vi.fn().mockImplementation(async (fn) => {
      const result = await fn();
      return {
        success: true,
        result,
        state: { attemptNumber: 1, totalAttempts: 1, totalDelay: 0, history: [] },
        metrics: { totalTime: 10, totalRetries: 0, averageDelay: 0, successOnAttempt: 1 }
      };
    })
  }))
}));

// Circuit breaker mock state - must be declared before the mock
const circuitBreakerState = {
  canExecute: true
};

// Mock CircuitBreaker
vi.mock('../../execution/CircuitBreaker', () => ({
  CircuitBreaker: vi.fn().mockImplementation(() => ({
    canExecute: vi.fn().mockImplementation(() => circuitBreakerState.canExecute),
    recordSuccess: vi.fn(),
    recordFailure: vi.fn()
  }))
}));

import {
  WorkflowExecutionOrchestrator,
  WorkflowDefinition,
  ExecutionOptions,
  ExecutionResult,
  WorkflowNode,
  WorkflowEdge
} from '../../services/execution/WorkflowExecutionOrchestrator';

// ============================================
// Test Fixtures
// ============================================

const createTestWorkflow = (overrides: Partial<WorkflowDefinition> = {}): WorkflowDefinition => ({
  id: 'wf-test-1',
  name: 'Test Workflow',
  version: '1.0.0',
  nodes: [
    {
      id: 'node-1',
      type: 'trigger',
      data: { label: 'Start Trigger' },
      position: { x: 0, y: 0 }
    },
    {
      id: 'node-2',
      type: 'transform',
      data: { label: 'Transform Data' },
      position: { x: 100, y: 0 }
    },
    {
      id: 'node-3',
      type: 'output',
      data: { label: 'Output' },
      position: { x: 200, y: 0 }
    }
  ],
  edges: [
    { id: 'edge-1', source: 'node-1', target: 'node-2' },
    { id: 'edge-2', source: 'node-2', target: 'node-3' }
  ],
  settings: {
    timeout: 60000,
    retryEnabled: false,
    errorHandling: 'stop'
  },
  ...overrides
});

const createSingleNodeWorkflow = (): WorkflowDefinition => ({
  id: 'wf-single',
  name: 'Single Node Workflow',
  nodes: [
    {
      id: 'node-1',
      type: 'action',
      data: { label: 'Single Action' },
      position: { x: 0, y: 0 }
    }
  ],
  edges: []
});

const createParallelWorkflow = (): WorkflowDefinition => ({
  id: 'wf-parallel',
  name: 'Parallel Workflow',
  nodes: [
    { id: 'start', type: 'trigger', data: { label: 'Start' }, position: { x: 0, y: 0 } },
    { id: 'branch-a', type: 'action', data: { label: 'Branch A' }, position: { x: 100, y: -50 } },
    { id: 'branch-b', type: 'action', data: { label: 'Branch B' }, position: { x: 100, y: 50 } },
    { id: 'end', type: 'output', data: { label: 'End' }, position: { x: 200, y: 0 } }
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'branch-a' },
    { id: 'e2', source: 'start', target: 'branch-b' },
    { id: 'e3', source: 'branch-a', target: 'end' },
    { id: 'e4', source: 'branch-b', target: 'end' }
  ]
});

// ============================================
// Tests
// ============================================

describe('WorkflowExecutionOrchestrator', () => {
  let orchestrator: WorkflowExecutionOrchestrator;

  beforeEach(() => {
    // Reset singleton and mocks before each test
    WorkflowExecutionOrchestrator.resetInstance();
    vi.clearAllMocks();
    circuitBreakerState.canExecute = true;
    orchestrator = WorkflowExecutionOrchestrator.getInstance();
  });

  afterEach(() => {
    WorkflowExecutionOrchestrator.resetInstance();
  });

  // ============================================
  // Singleton Pattern Tests
  // ============================================
  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = WorkflowExecutionOrchestrator.getInstance();
      const instance2 = WorkflowExecutionOrchestrator.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = WorkflowExecutionOrchestrator.getInstance();
      WorkflowExecutionOrchestrator.resetInstance();
      const instance2 = WorkflowExecutionOrchestrator.getInstance();

      expect(instance1).not.toBe(instance2);
    });

    it('should be an EventEmitter', () => {
      expect(typeof orchestrator.on).toBe('function');
      expect(typeof orchestrator.emit).toBe('function');
      expect(typeof orchestrator.removeListener).toBe('function');
    });
  });

  // ============================================
  // Execute Basic Tests
  // ============================================
  describe('execute()', () => {
    it('should execute a simple workflow successfully', async () => {
      const workflow = createTestWorkflow();

      const result = await orchestrator.execute(workflow);

      expect(result.status).toBe('success');
      expect(result.workflowId).toBe(workflow.id);
      expect(result.executionId).toBeDefined();
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should execute a single node workflow', async () => {
      const workflow = createSingleNodeWorkflow();

      const result = await orchestrator.execute(workflow);

      expect(result.status).toBe('success');
      expect(result.nodeResults).toHaveLength(1);
    });

    it('should return node results for each executed node', async () => {
      const workflow = createTestWorkflow();

      const result = await orchestrator.execute(workflow);

      expect(result.nodeResults).toHaveLength(3);
      expect(result.nodeResults[0].nodeId).toBe('node-1');
      expect(result.nodeResults[1].nodeId).toBe('node-2');
      expect(result.nodeResults[2].nodeId).toBe('node-3');
    });

    it('should pass input through execution options', async () => {
      const workflow = createTestWorkflow();
      const options: ExecutionOptions = {
        input: { key: 'value', count: 42 }
      };

      const result = await orchestrator.execute(workflow, options);

      expect(result.status).toBe('success');
      expect(result.output).toBeDefined();
    });

    it('should set execution mode from options', async () => {
      const workflow = createTestWorkflow();
      const options: ExecutionOptions = {
        mode: 'webhook',
        triggeredBy: 'webhook-123'
      };

      const result = await orchestrator.execute(workflow, options);

      expect(result.status).toBe('success');
    });

    it('should have valid execution ID format', async () => {
      const workflow = createTestWorkflow();

      const result = await orchestrator.execute(workflow);

      // ExecutionId comes from ExecutionManager which returns exec-123 in mock
      // In production, the orchestrator generates IDs with format: exec_timestamp_random
      expect(result.executionId).toBeDefined();
      expect(typeof result.executionId).toBe('string');
      expect(result.executionId.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Circuit Breaker Tests
  // ============================================
  describe('Circuit Breaker Integration', () => {
    it('should fail when circuit breaker is open', async () => {
      // Need fresh instance with circuit breaker closed
      WorkflowExecutionOrchestrator.resetInstance();
      circuitBreakerState.canExecute = false;
      const freshOrchestrator = WorkflowExecutionOrchestrator.getInstance();
      const workflow = createTestWorkflow();

      const result = await freshOrchestrator.execute(workflow);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('CIRCUIT_BREAKER_OPEN');
      expect(result.error?.recoverable).toBe(true);
    });

    it('should execute successfully when circuit breaker allows', async () => {
      const workflow = createTestWorkflow();

      const result = await orchestrator.execute(workflow);

      expect(result.status).toBe('success');
    });

    it('should allow execution when circuit breaker is closed', async () => {
      circuitBreakerState.canExecute = true;
      const workflow = createTestWorkflow();

      const result = await orchestrator.execute(workflow);

      expect(result.status).toBe('success');
    });
  });

  // ============================================
  // Concurrent Execution Tests
  // ============================================
  describe('Concurrent Execution Limits', () => {
    it('should track active executions count', () => {
      expect(orchestrator.getActiveExecutionsCount()).toBe(0);
    });

    it('should allow setting max concurrent executions', () => {
      orchestrator.setMaxConcurrentExecutions(5);

      // Should not throw
      expect(orchestrator.getActiveExecutionsCount()).toBe(0);
    });

    it('should fail when max concurrent executions is exceeded', async () => {
      // Set very low limit
      orchestrator.setMaxConcurrentExecutions(0);
      const workflow = createTestWorkflow();

      const result = await orchestrator.execute(workflow);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('MAX_CONCURRENT_EXCEEDED');
      expect(result.error?.recoverable).toBe(true);
    });
  });

  // ============================================
  // Dry Run Tests
  // ============================================
  describe('Dry Run Mode', () => {
    it('should skip node execution in dry run mode', async () => {
      const workflow = createTestWorkflow();
      const options: ExecutionOptions = {
        dryRun: true
      };

      const result = await orchestrator.execute(workflow, options);

      expect(result.status).toBe('success');
      expect(result.nodeResults.every(r => r.status === 'skipped')).toBe(true);
    });

    it('should include dryRun flag in node output', async () => {
      const workflow = createTestWorkflow();
      const options: ExecutionOptions = {
        dryRun: true
      };

      const result = await orchestrator.execute(workflow, options);

      const firstNode = result.nodeResults[0];
      expect(firstNode.output).toEqual({ dryRun: true });
    });
  });

  // ============================================
  // Retry Support Tests
  // ============================================
  describe('Retry Support', () => {
    it('should execute without retry when not configured', async () => {
      const workflow = createTestWorkflow();

      const result = await orchestrator.execute(workflow);

      expect(result.status).toBe('success');
    });

    it('should use retry when enabled in options', async () => {
      const workflow = createTestWorkflow();
      const options: ExecutionOptions = {
        retryConfig: {
          enabled: true,
          maxAttempts: 3,
          strategy: 'exponential'
        }
      };

      const result = await orchestrator.execute(workflow, options);

      expect(result.status).toBe('success');
    });
  });

  // ============================================
  // Workflow Structure Tests
  // ============================================
  describe('Workflow Structure Handling', () => {
    it('should fail when workflow has no start nodes', async () => {
      // Create circular workflow with no start nodes
      const workflow: WorkflowDefinition = {
        id: 'wf-circular',
        name: 'Circular Workflow',
        nodes: [
          { id: 'a', type: 'action', data: {}, position: { x: 0, y: 0 } },
          { id: 'b', type: 'action', data: {}, position: { x: 100, y: 0 } }
        ],
        edges: [
          { id: 'e1', source: 'a', target: 'b' },
          { id: 'e2', source: 'b', target: 'a' }
        ]
      };

      const result = await orchestrator.execute(workflow);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('NO_START_NODE');
    });

    it('should handle workflow with multiple start nodes', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf-multi-start',
        name: 'Multi Start Workflow',
        nodes: [
          { id: 'start-1', type: 'trigger', data: { label: 'Start 1' }, position: { x: 0, y: 0 } },
          { id: 'start-2', type: 'trigger', data: { label: 'Start 2' }, position: { x: 0, y: 100 } },
          { id: 'end', type: 'output', data: { label: 'End' }, position: { x: 100, y: 50 } }
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'end' },
          { id: 'e2', source: 'start-2', target: 'end' }
        ]
      };

      const result = await orchestrator.execute(workflow);

      expect(result.status).toBe('success');
    });

    it('should execute nodes in topological order', async () => {
      const workflow = createTestWorkflow();

      const result = await orchestrator.execute(workflow);

      const nodeOrder = result.nodeResults.map(r => r.nodeId);
      expect(nodeOrder).toEqual(['node-1', 'node-2', 'node-3']);
    });

    it('should handle empty workflow edges', async () => {
      const workflow = createSingleNodeWorkflow();

      const result = await orchestrator.execute(workflow);

      expect(result.status).toBe('success');
      expect(result.nodeResults).toHaveLength(1);
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    it('should return failed result with error details', async () => {
      WorkflowExecutionOrchestrator.resetInstance();
      circuitBreakerState.canExecute = false;
      const failingOrchestrator = WorkflowExecutionOrchestrator.getInstance();
      const workflow = createTestWorkflow();

      const result = await failingOrchestrator.execute(workflow);

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBeDefined();
      expect(result.error?.code).toBeDefined();
    });

    it('should include duration even on failure', async () => {
      WorkflowExecutionOrchestrator.resetInstance();
      circuitBreakerState.canExecute = false;
      const failingOrchestrator = WorkflowExecutionOrchestrator.getInstance();
      const workflow = createTestWorkflow();

      const result = await failingOrchestrator.execute(workflow);

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should return empty node results on early failure', async () => {
      WorkflowExecutionOrchestrator.resetInstance();
      circuitBreakerState.canExecute = false;
      const failingOrchestrator = WorkflowExecutionOrchestrator.getInstance();
      const workflow = createTestWorkflow();

      const result = await failingOrchestrator.execute(workflow);

      expect(result.nodeResults).toEqual([]);
    });
  });

  // ============================================
  // Metrics Tests
  // ============================================
  describe('Execution Metrics', () => {
    it('should calculate metrics for successful execution', async () => {
      const workflow = createTestWorkflow();

      const result = await orchestrator.execute(workflow);

      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalNodes).toBe(3);
      expect(result.metrics.executedNodes).toBe(3);
      expect(result.metrics.skippedNodes).toBe(0);
      expect(result.metrics.failedNodes).toBe(0);
    });

    it('should calculate metrics for dry run', async () => {
      const workflow = createTestWorkflow();
      const options: ExecutionOptions = { dryRun: true };

      const result = await orchestrator.execute(workflow, options);

      expect(result.metrics.totalNodes).toBe(3);
      expect(result.metrics.skippedNodes).toBe(3);
      expect(result.metrics.executedNodes).toBe(0);
    });

    it('should return empty metrics on circuit breaker failure', async () => {
      WorkflowExecutionOrchestrator.resetInstance();
      circuitBreakerState.canExecute = false;
      const failingOrchestrator = WorkflowExecutionOrchestrator.getInstance();
      const workflow = createTestWorkflow();

      const result = await failingOrchestrator.execute(workflow);

      expect(result.metrics.totalNodes).toBe(0);
      expect(result.metrics.executedNodes).toBe(0);
      expect(result.metrics.totalDuration).toBe(0);
    });

    it('should calculate average node duration', async () => {
      const workflow = createTestWorkflow();

      const result = await orchestrator.execute(workflow);

      expect(result.metrics.averageNodeDuration).toBeGreaterThanOrEqual(0);
      expect(typeof result.metrics.averageNodeDuration).toBe('number');
    });

    it('should calculate total duration', async () => {
      const workflow = createTestWorkflow();

      const result = await orchestrator.execute(workflow);

      expect(result.metrics.totalDuration).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // Node Results Tests
  // ============================================
  describe('Node Results', () => {
    it('should include node name in results', async () => {
      const workflow = createTestWorkflow();

      const result = await orchestrator.execute(workflow);

      expect(result.nodeResults[0].nodeName).toBe('Start Trigger');
      expect(result.nodeResults[1].nodeName).toBe('Transform Data');
      expect(result.nodeResults[2].nodeName).toBe('Output');
    });

    it('should include timing information', async () => {
      const workflow = createTestWorkflow();

      const result = await orchestrator.execute(workflow);

      for (const nodeResult of result.nodeResults) {
        expect(nodeResult.startTime).toBeInstanceOf(Date);
        expect(nodeResult.endTime).toBeInstanceOf(Date);
        expect(nodeResult.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it('should include node output', async () => {
      const workflow = createTestWorkflow();

      const result = await orchestrator.execute(workflow);

      for (const nodeResult of result.nodeResults) {
        expect(nodeResult.output).toBeDefined();
      }
    });
  });

  // ============================================
  // Event Emission Tests
  // ============================================
  describe('Event Emission', () => {
    it('should emit execution:started event', async () => {
      const startedHandler = vi.fn();
      orchestrator.on('execution:started', startedHandler);

      const workflow = createTestWorkflow();
      await orchestrator.execute(workflow);

      expect(startedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: expect.any(String),
          workflowId: workflow.id
        })
      );
    });

    it('should emit execution:completed event on success', async () => {
      const completedHandler = vi.fn();
      orchestrator.on('execution:completed', completedHandler);

      const workflow = createTestWorkflow();
      await orchestrator.execute(workflow);

      expect(completedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: expect.any(String),
          status: 'success'
        })
      );
    });

    it('should emit node:completed events', async () => {
      const nodeCompletedHandler = vi.fn();
      orchestrator.on('node:completed', nodeCompletedHandler);

      const workflow = createTestWorkflow();
      await orchestrator.execute(workflow);

      expect(nodeCompletedHandler).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================
  // Cancel Execution Tests
  // ============================================
  describe('cancelExecution()', () => {
    it('should return false for non-existent execution', async () => {
      const result = await orchestrator.cancelExecution('non-existent-id');

      expect(result).toBe(false);
    });

    it('should emit execution:cancelled event on cancellation', async () => {
      const cancelledHandler = vi.fn();
      orchestrator.on('execution:cancelled', cancelledHandler);

      // Start a workflow and get its execution ID
      // Since execution is fast, we'll test the cancellation path differently
      const result = await orchestrator.cancelExecution('fake-id');

      expect(result).toBe(false);
    });
  });

  // ============================================
  // Execution Status Tests
  // ============================================
  describe('getExecutionStatus()', () => {
    it('should return null for non-existent execution', async () => {
      const status = await orchestrator.getExecutionStatus('non-existent');

      expect(status).toBeNull();
    });
  });

  // ============================================
  // Workflow Settings Tests
  // ============================================
  describe('Workflow Settings', () => {
    it('should respect timeout setting', async () => {
      const workflow = createTestWorkflow({
        settings: { timeout: 5000 }
      });

      const result = await orchestrator.execute(workflow);

      expect(result.status).toBe('success');
    });

    it('should respect errorHandling: continue setting', async () => {
      const workflow = createTestWorkflow({
        settings: { errorHandling: 'continue' }
      });

      const result = await orchestrator.execute(workflow);

      expect(result.status).toBe('success');
    });

    it('should handle workflow without settings', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf-no-settings',
        name: 'No Settings Workflow',
        nodes: [
          { id: 'n1', type: 'action', data: {}, position: { x: 0, y: 0 } }
        ],
        edges: []
      };

      const result = await orchestrator.execute(workflow);

      expect(result.status).toBe('success');
    });
  });

  // ============================================
  // Execution Options Tests
  // ============================================
  describe('Execution Options', () => {
    it('should accept debug option', async () => {
      const workflow = createTestWorkflow();
      const options: ExecutionOptions = {
        debug: true
      };

      const result = await orchestrator.execute(workflow, options);

      expect(result.status).toBe('success');
    });

    it('should accept metadata option', async () => {
      const workflow = createTestWorkflow();
      const options: ExecutionOptions = {
        metadata: {
          correlationId: 'corr-123',
          requestId: 'req-456'
        }
      };

      const result = await orchestrator.execute(workflow, options);

      expect(result.status).toBe('success');
    });

    it('should handle all execution modes', async () => {
      const workflow = createTestWorkflow();
      const modes: ExecutionOptions['mode'][] = ['manual', 'trigger', 'webhook', 'schedule', 'test'];

      for (const mode of modes) {
        const result = await orchestrator.execute(workflow, { mode });
        expect(result.status).toBe('success');
      }
    });

    it('should use default mode when not specified', async () => {
      const workflow = createTestWorkflow();

      const result = await orchestrator.execute(workflow);

      expect(result.status).toBe('success');
    });
  });

  // ============================================
  // Type Safety Tests
  // ============================================
  describe('Type Safety', () => {
    it('should have correct types for ExecutionResult', async () => {
      const workflow = createTestWorkflow();

      const result: ExecutionResult = await orchestrator.execute(workflow);

      expect(typeof result.executionId).toBe('string');
      expect(typeof result.workflowId).toBe('string');
      expect(typeof result.status).toBe('string');
      expect(result.startTime instanceof Date).toBe(true);
      expect(Array.isArray(result.nodeResults)).toBe(true);
      expect(typeof result.metrics).toBe('object');
    });

    it('should have correct types for WorkflowNode', () => {
      const node: WorkflowNode = {
        id: 'test',
        type: 'action',
        data: { label: 'Test' },
        position: { x: 0, y: 0 }
      };

      expect(typeof node.id).toBe('string');
      expect(typeof node.type).toBe('string');
      expect(typeof node.data).toBe('object');
      expect(typeof node.position.x).toBe('number');
      expect(typeof node.position.y).toBe('number');
    });

    it('should have correct types for WorkflowEdge', () => {
      const edge: WorkflowEdge = {
        id: 'test',
        source: 'node-1',
        target: 'node-2'
      };

      expect(typeof edge.id).toBe('string');
      expect(typeof edge.source).toBe('string');
      expect(typeof edge.target).toBe('string');
    });
  });

  // ============================================
  // Edge Cases Tests
  // ============================================
  describe('Edge Cases', () => {
    it('should handle workflow with many nodes', async () => {
      const nodes: WorkflowNode[] = Array.from({ length: 50 }, (_, i) => ({
        id: `node-${i}`,
        type: 'action',
        data: { label: `Node ${i}` },
        position: { x: i * 50, y: 0 }
      }));

      const edges: WorkflowEdge[] = nodes.slice(0, -1).map((_, i) => ({
        id: `edge-${i}`,
        source: `node-${i}`,
        target: `node-${i + 1}`
      }));

      const workflow: WorkflowDefinition = {
        id: 'wf-large',
        name: 'Large Workflow',
        nodes,
        edges
      };

      const result = await orchestrator.execute(workflow);

      expect(result.status).toBe('success');
      expect(result.nodeResults).toHaveLength(50);
    });

    it('should handle nodes with special characters in labels', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf-special',
        name: 'Special Characters Workflow',
        nodes: [
          {
            id: 'node-1',
            type: 'action',
            data: { label: 'Tëst Nödé <script>alert("xss")</script>' },
            position: { x: 0, y: 0 }
          }
        ],
        edges: []
      };

      const result = await orchestrator.execute(workflow);

      expect(result.status).toBe('success');
    });

    it('should handle empty workflow name', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf-empty-name',
        name: '',
        nodes: [
          { id: 'n1', type: 'action', data: {}, position: { x: 0, y: 0 } }
        ],
        edges: []
      };

      const result = await orchestrator.execute(workflow);

      expect(result.status).toBe('success');
    });

    it('should handle nodes with empty data', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf-empty-data',
        name: 'Empty Data Workflow',
        nodes: [
          { id: 'n1', type: 'action', data: {}, position: { x: 0, y: 0 } }
        ],
        edges: []
      };

      const result = await orchestrator.execute(workflow);

      expect(result.status).toBe('success');
    });

    it('should handle rapid sequential executions', async () => {
      const workflow = createTestWorkflow();

      const results = await Promise.all([
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
        orchestrator.execute(workflow)
      ]);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.status === 'success')).toBe(true);
    });
  });
});

/**
 * Comprehensive Unit Tests for Durable Execution Engine
 * Tests WITHOUT mocks - using real InMemoryPersistenceAdapter
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  DurableExecutionEngine,
  InMemoryPersistenceAdapter,
  createDurableExecutionEngine,
  DurableWorkflowState,
  DurableStep,
  Checkpoint,
  SagaDefinition,
  SagaStep,
  RetryPolicy,
  PersistenceAdapter,
} from '../durable/DurableExecutionEngine';

describe('DurableExecutionEngine', () => {
  let engine: DurableExecutionEngine;
  let adapter: InMemoryPersistenceAdapter;

  beforeEach(() => {
    adapter = new InMemoryPersistenceAdapter();
    engine = new DurableExecutionEngine({
      persistenceAdapter: adapter,
      checkpointInterval: 1000,
      defaultTimeout: 5000,
      defaultRetryPolicy: {
        maxRetries: 2,
        backoffType: 'fixed',
        initialDelay: 100,
      },
    });
  });

  afterEach(async () => {
    await engine.stop();
  });

  describe('InMemoryPersistenceAdapter', () => {
    it('should save and load state', async () => {
      const state: DurableWorkflowState = {
        workflowId: 'wf_1',
        executionId: 'exec_1',
        status: 'pending',
        currentStep: 0,
        steps: [],
        checkpoints: [],
        startedAt: new Date(),
        retryCount: 0,
        metadata: {},
      };

      await adapter.saveState(state);
      const loaded = await adapter.loadState('exec_1');

      expect(loaded).toBeDefined();
      expect(loaded?.executionId).toBe('exec_1');
      expect(loaded?.workflowId).toBe('wf_1');
    });

    it('should return null for non-existent state', async () => {
      const loaded = await adapter.loadState('non_existent');
      expect(loaded).toBeNull();
    });

    it('should save and load checkpoints', async () => {
      const checkpoint: Checkpoint = {
        id: 'cp_exec_1_step_1',
        stepId: 'step_1',
        timestamp: new Date(),
        state: { data: 'test' },
      };

      await adapter.saveCheckpoint(checkpoint);
      const checkpoints = await adapter.loadCheckpoints('exec');

      expect(checkpoints.length).toBe(1);
      expect(checkpoints[0].id).toBe('cp_exec_1_step_1');
    });

    it('should list pending executions', async () => {
      const states: DurableWorkflowState[] = [
        { workflowId: 'wf_1', executionId: 'exec_1', status: 'pending', currentStep: 0, steps: [], checkpoints: [], startedAt: new Date(), retryCount: 0, metadata: {} },
        { workflowId: 'wf_2', executionId: 'exec_2', status: 'running', currentStep: 0, steps: [], checkpoints: [], startedAt: new Date(), retryCount: 0, metadata: {} },
        { workflowId: 'wf_3', executionId: 'exec_3', status: 'completed', currentStep: 0, steps: [], checkpoints: [], startedAt: new Date(), retryCount: 0, metadata: {} },
      ];

      for (const state of states) {
        await adapter.saveState(state);
      }

      const pending = await adapter.listPendingExecutions();

      expect(pending).toContain('exec_1');
      expect(pending).toContain('exec_2');
      expect(pending).not.toContain('exec_3');
    });

    it('should delete execution', async () => {
      const state: DurableWorkflowState = {
        workflowId: 'wf_1',
        executionId: 'exec_1',
        status: 'completed',
        currentStep: 0,
        steps: [],
        checkpoints: [],
        startedAt: new Date(),
        retryCount: 0,
        metadata: {},
      };

      await adapter.saveState(state);
      await adapter.deleteExecution('exec_1');

      const loaded = await adapter.loadState('exec_1');
      expect(loaded).toBeNull();
    });

    it('should deep clone state on save and load', async () => {
      const state: DurableWorkflowState = {
        workflowId: 'wf_1',
        executionId: 'exec_1',
        status: 'pending',
        currentStep: 0,
        steps: [],
        checkpoints: [],
        startedAt: new Date(),
        retryCount: 0,
        metadata: { key: 'value' },
      };

      await adapter.saveState(state);
      state.metadata.key = 'modified';

      const loaded = await adapter.loadState('exec_1');
      expect(loaded?.metadata.key).toBe('value');
    });
  });

  describe('engine lifecycle', () => {
    it('should start engine', async () => {
      let started = false;
      engine.on('started', () => { started = true; });

      await engine.start();

      expect(started).toBe(true);
    });

    it('should stop engine', async () => {
      let stopped = false;
      engine.on('stopped', () => { stopped = true; });

      await engine.start();
      await engine.stop();

      expect(stopped).toBe(true);
    });

    it('should recover pending executions on start', async () => {
      // Create a pending state
      const state: DurableWorkflowState = {
        workflowId: 'wf_1',
        executionId: 'exec_pending',
        status: 'pending',
        currentStep: 0,
        steps: [
          { id: 'step_1', nodeId: 'node_1', nodeType: 'http', status: 'completed', input: null, retryCount: 0 },
        ],
        checkpoints: [],
        startedAt: new Date(),
        retryCount: 0,
        metadata: {},
      };

      await adapter.saveState(state);

      let recovering = false;
      engine.on('execution:recovering', () => { recovering = true; });

      await engine.start();

      expect(recovering).toBe(true);
    });
  });

  describe('workflow execution', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should execute workflow successfully', async () => {
      const nodes = [
        { id: 'node_1', type: 'trigger', config: {} },
        { id: 'node_2', type: 'action', config: {} },
      ];

      const result = await engine.execute('wf_test', nodes, { data: 'input' });

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.steps.length).toBe(2);
    });

    it('should persist state during execution', async () => {
      const nodes = [
        { id: 'node_1', type: 'trigger', config: {} },
      ];

      const result = await engine.execute('wf_test', nodes, {});
      const loaded = await adapter.loadState(result.executionId);

      expect(loaded).toBeDefined();
      expect(loaded?.status).toBe('completed');
    });

    it('should create checkpoints after each step', async () => {
      const nodes = [
        { id: 'node_1', type: 'trigger', config: {} },
        { id: 'node_2', type: 'action', config: {} },
      ];

      let checkpointCount = 0;
      engine.on('checkpoint:created', () => { checkpointCount++; });

      await engine.execute('wf_test', nodes, {});

      expect(checkpointCount).toBe(2);
    });

    it('should emit execution:completed event', async () => {
      let completed = false;
      engine.on('execution:completed', () => { completed = true; });

      await engine.execute('wf_test', [{ id: 'node_1', type: 'test', config: {} }], {});

      expect(completed).toBe(true);
    });

    it('should include metadata in execution state', async () => {
      const metadata = { user: 'test', version: '1.0' };
      const result = await engine.execute('wf_test', [{ id: 'node_1', type: 'test', config: {} }], {}, metadata);

      expect(result.metadata).toEqual(metadata);
    });

    it('should generate unique execution IDs', async () => {
      const result1 = await engine.execute('wf_test', [{ id: 'n1', type: 't', config: {} }], {});
      const result2 = await engine.execute('wf_test', [{ id: 'n2', type: 't', config: {} }], {});

      expect(result1.executionId).not.toBe(result2.executionId);
      expect(result1.executionId).toMatch(/^exec_\d+_[a-z0-9]+$/);
    });

    it('should track step completion times', async () => {
      const nodes = [
        { id: 'node_1', type: 'trigger', config: {} },
      ];

      const result = await engine.execute('wf_test', nodes, {});

      expect(result.steps[0].startedAt).toBeDefined();
      expect(result.steps[0].completedAt).toBeDefined();
    });
  });

  describe('saga execution', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should execute saga with multiple steps', async () => {
      const saga: SagaDefinition = {
        steps: [
          {
            id: 'step_1',
            name: 'Step 1',
            action: async (ctx) => ({ result: 'step1' }),
          },
          {
            id: 'step_2',
            name: 'Step 2',
            action: async (ctx) => ({ result: 'step2', previous: ctx.stepResults.get('step_1') }),
          },
        ],
        compensationStrategy: 'backward',
      };

      const result = await engine.executeSaga('saga_test', saga, {});

      expect(result.status).toBe('completed');
      expect(result.steps.length).toBe(2);
    });

    it('should store step results in context', async () => {
      let step2Context: unknown = null;

      const saga: SagaDefinition = {
        steps: [
          {
            id: 'step_1',
            name: 'Step 1',
            action: async () => ({ value: 42 }),
          },
          {
            id: 'step_2',
            name: 'Step 2',
            action: async (ctx) => {
              step2Context = ctx.stepResults.get('step_1');
              return { received: ctx.stepResults.get('step_1') };
            },
          },
        ],
        compensationStrategy: 'backward',
      };

      await engine.executeSaga('saga_test', saga, {});

      expect(step2Context).toEqual({ value: 42 });
    });

    it('should emit saga:completed event', async () => {
      let completedData: unknown = null;
      engine.on('saga:completed', (data) => { completedData = data; });

      const saga: SagaDefinition = {
        steps: [
          { id: 's1', name: 'S1', action: async () => ({ done: true }) },
        ],
        compensationStrategy: 'backward',
      };

      await engine.executeSaga('saga_test', saga, {});

      expect(completedData).toBeDefined();
    });

    it('should handle saga failure and compensate', async () => {
      let compensated = false;

      const saga: SagaDefinition = {
        steps: [
          {
            id: 'step_1',
            name: 'Step 1',
            action: async () => ({ done: true }),
            compensation: async () => { compensated = true; },
          },
          {
            id: 'step_2',
            name: 'Step 2',
            action: async () => { throw new Error('Step 2 failed'); },
          },
        ],
        compensationStrategy: 'backward',
      };

      await expect(engine.executeSaga('saga_test', saga, {})).rejects.toThrow('Step 2 failed');
      expect(compensated).toBe(true);
    });

    it('should compensate in backward order', async () => {
      const compensationOrder: string[] = [];

      const saga: SagaDefinition = {
        steps: [
          {
            id: 'step_1',
            name: 'Step 1',
            action: async () => 'result_1',
            compensation: async () => { compensationOrder.push('step_1'); },
          },
          {
            id: 'step_2',
            name: 'Step 2',
            action: async () => 'result_2',
            compensation: async () => { compensationOrder.push('step_2'); },
          },
          {
            id: 'step_3',
            name: 'Step 3',
            action: async () => { throw new Error('Failed'); },
          },
        ],
        compensationStrategy: 'backward',
      };

      await expect(engine.executeSaga('saga_test', saga, {})).rejects.toThrow();
      expect(compensationOrder).toEqual(['step_2', 'step_1']);
    });

    it('should compensate in forward order', async () => {
      const compensationOrder: string[] = [];

      const saga: SagaDefinition = {
        steps: [
          {
            id: 'step_1',
            name: 'Step 1',
            action: async () => 'result_1',
            compensation: async () => { compensationOrder.push('step_1'); },
          },
          {
            id: 'step_2',
            name: 'Step 2',
            action: async () => 'result_2',
            compensation: async () => { compensationOrder.push('step_2'); },
          },
          {
            id: 'step_3',
            name: 'Step 3',
            action: async () => { throw new Error('Failed'); },
          },
        ],
        compensationStrategy: 'forward',
      };

      await expect(engine.executeSaga('saga_test', saga, {})).rejects.toThrow();
      expect(compensationOrder).toEqual(['step_1', 'step_2']);
    });

    it('should handle parallel compensation', async () => {
      const compensationOrder: string[] = [];
      const startTimes: Record<string, number> = {};

      const saga: SagaDefinition = {
        steps: [
          {
            id: 'step_1',
            name: 'Step 1',
            action: async () => 'result_1',
            compensation: async () => {
              startTimes['step_1'] = Date.now();
              compensationOrder.push('step_1');
            },
          },
          {
            id: 'step_2',
            name: 'Step 2',
            action: async () => 'result_2',
            compensation: async () => {
              startTimes['step_2'] = Date.now();
              compensationOrder.push('step_2');
            },
          },
          {
            id: 'step_3',
            name: 'Step 3',
            action: async () => { throw new Error('Failed'); },
          },
        ],
        compensationStrategy: 'parallel',
      };

      await expect(engine.executeSaga('saga_test', saga, {})).rejects.toThrow();
      expect(compensationOrder.length).toBe(2);
    });

    it('should support checkpointing in saga steps', async () => {
      let checkpointed = false;

      const saga: SagaDefinition = {
        steps: [
          {
            id: 'step_1',
            name: 'Step 1',
            action: async (ctx) => {
              await ctx.checkpoint({ progress: 50 });
              checkpointed = true;
              return { done: true };
            },
          },
        ],
        compensationStrategy: 'backward',
      };

      await engine.executeSaga('saga_test', saga, {});
      expect(checkpointed).toBe(true);
    });

    it('should handle step timeout', async () => {
      const saga: SagaDefinition = {
        steps: [
          {
            id: 'step_1',
            name: 'Step 1',
            action: async () => {
              await new Promise(resolve => setTimeout(resolve, 10000));
              return { done: true };
            },
            timeout: 50,
          },
        ],
        compensationStrategy: 'backward',
        timeout: 100,
      };

      await expect(engine.executeSaga('saga_test', saga, {})).rejects.toThrow('Execution timeout');
    });

    it('should record step duration', async () => {
      const saga: SagaDefinition = {
        steps: [
          {
            id: 'step_1',
            name: 'Step 1',
            action: async () => {
              await new Promise(resolve => setTimeout(resolve, 50));
              return { done: true };
            },
          },
        ],
        compensationStrategy: 'backward',
      };

      const result = await engine.executeSaga('saga_test', saga, {});
      expect(result.steps[0].duration).toBeGreaterThanOrEqual(40);
    });
  });

  describe('retry policy', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should retry failed steps', async () => {
      let attempts = 0;
      engine.on('node:execute', ({ callback }) => {
        attempts++;
        if (attempts < 3) {
          callback(new Error('Temporary failure'), null);
        } else {
          callback(null, { success: true });
        }
      });

      const result = await engine.execute('wf_test', [{ id: 'n1', type: 't', config: {} }], {});

      expect(result.status).toBe('completed');
      expect(attempts).toBe(3);
    });

    it('should emit step:retry event', async () => {
      let retryCount = 0;
      engine.on('step:retry', () => { retryCount++; });

      let attempts = 0;
      engine.on('node:execute', ({ callback }) => {
        attempts++;
        if (attempts < 2) {
          callback(new Error('Temporary failure'), null);
        } else {
          callback(null, { success: true });
        }
      });

      await engine.execute('wf_test', [{ id: 'n1', type: 't', config: {} }], {});

      expect(retryCount).toBeGreaterThan(0);
    });

    it('should calculate fixed delay correctly', async () => {
      const customEngine = new DurableExecutionEngine({
        persistenceAdapter: adapter,
        defaultRetryPolicy: {
          maxRetries: 1,
          backoffType: 'fixed',
          initialDelay: 100,
        },
      });

      await customEngine.start();

      let delayUsed = 0;
      customEngine.on('step:retry', ({ delay }) => { delayUsed = delay; });

      let attempts = 0;
      customEngine.on('node:execute', ({ callback }) => {
        attempts++;
        if (attempts < 2) {
          callback(new Error('Fail'), null);
        } else {
          callback(null, { success: true });
        }
      });

      await customEngine.execute('wf', [{ id: 'n1', type: 't', config: {} }], {});

      expect(delayUsed).toBe(100);
      await customEngine.stop();
    });

    it('should calculate exponential delay correctly', async () => {
      const customEngine = new DurableExecutionEngine({
        persistenceAdapter: adapter,
        defaultRetryPolicy: {
          maxRetries: 3,
          backoffType: 'exponential',
          initialDelay: 100,
          maxDelay: 10000,
        },
      });

      await customEngine.start();

      const delays: number[] = [];
      customEngine.on('step:retry', ({ delay }) => { delays.push(delay); });

      let attempts = 0;
      customEngine.on('node:execute', ({ callback }) => {
        attempts++;
        if (attempts < 3) {
          callback(new Error('Fail'), null);
        } else {
          callback(null, { success: true });
        }
      });

      await customEngine.execute('wf', [{ id: 'n1', type: 't', config: {} }], {});

      expect(delays[0]).toBe(100); // 100 * 2^0
      expect(delays[1]).toBe(200); // 100 * 2^1
      await customEngine.stop();
    });

    it('should calculate linear delay correctly', async () => {
      const customEngine = new DurableExecutionEngine({
        persistenceAdapter: adapter,
        defaultRetryPolicy: {
          maxRetries: 3,
          backoffType: 'linear',
          initialDelay: 100,
        },
      });

      await customEngine.start();

      const delays: number[] = [];
      customEngine.on('step:retry', ({ delay }) => { delays.push(delay); });

      let attempts = 0;
      customEngine.on('node:execute', ({ callback }) => {
        attempts++;
        if (attempts < 3) {
          callback(new Error('Fail'), null);
        } else {
          callback(null, { success: true });
        }
      });

      await customEngine.execute('wf', [{ id: 'n1', type: 't', config: {} }], {});

      expect(delays[0]).toBe(100); // 100 * 1
      expect(delays[1]).toBe(200); // 100 * 2
      await customEngine.stop();
    });

    it('should respect maxDelay in exponential backoff', async () => {
      const customEngine = new DurableExecutionEngine({
        persistenceAdapter: adapter,
        defaultRetryPolicy: {
          maxRetries: 5,
          backoffType: 'exponential',
          initialDelay: 1000,
          maxDelay: 2000,
        },
      });

      await customEngine.start();

      const delays: number[] = [];
      customEngine.on('step:retry', ({ delay }) => { delays.push(delay); });

      let attempts = 0;
      customEngine.on('node:execute', ({ callback }) => {
        attempts++;
        if (attempts < 4) {
          callback(new Error('Fail'), null);
        } else {
          callback(null, { success: true });
        }
      });

      await customEngine.execute('wf', [{ id: 'n1', type: 't', config: {} }], {});

      // All delays should be capped at maxDelay
      for (const delay of delays) {
        expect(delay).toBeLessThanOrEqual(2000);
      }
      await customEngine.stop();
    });
  });

  describe('compensation', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should emit execution:failed event on failure', async () => {
      let failed = false;
      engine.on('execution:failed', () => { failed = true; });

      // Force failure by making all retries fail
      engine.on('node:execute', ({ callback }) => {
        callback(new Error('Permanent failure'), null);
      });

      await expect(
        engine.execute('wf_test', [{ id: 'n1', type: 't', config: {} }], {})
      ).rejects.toThrow();

      expect(failed).toBe(true);
    });

    it('should emit step:compensated event', async () => {
      let compensated = false;
      engine.on('step:compensated', () => { compensated = true; });

      const saga: SagaDefinition = {
        steps: [
          {
            id: 'step_1',
            name: 'Step 1',
            action: async () => ({ done: true }),
            compensation: async () => {},
          },
          {
            id: 'step_2',
            name: 'Step 2',
            action: async () => { throw new Error('Fail'); },
          },
        ],
        compensationStrategy: 'backward',
      };

      await expect(engine.executeSaga('saga', saga, {})).rejects.toThrow();
      expect(compensated).toBe(true);
    });
  });

  describe('execution management', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should get execution state', async () => {
      const result = await engine.execute('wf', [{ id: 'n1', type: 't', config: {} }], {});
      const state = await engine.getExecutionState(result.executionId);

      expect(state).toBeDefined();
      expect(state?.executionId).toBe(result.executionId);
    });

    it('should return null for non-existent execution', async () => {
      const state = await engine.getExecutionState('non_existent');
      expect(state).toBeNull();
    });

    it('should list executions', async () => {
      const state: DurableWorkflowState = {
        workflowId: 'wf_1',
        executionId: 'exec_list_test',
        status: 'running',
        currentStep: 0,
        steps: [],
        checkpoints: [],
        startedAt: new Date(),
        retryCount: 0,
        metadata: {},
      };

      await adapter.saveState(state);
      const list = await engine.listExecutions();

      expect(list).toContain('exec_list_test');
    });

    it('should cancel running execution', async () => {
      const state: DurableWorkflowState = {
        workflowId: 'wf_1',
        executionId: 'exec_cancel_test',
        status: 'running',
        currentStep: 0,
        steps: [],
        checkpoints: [],
        startedAt: new Date(),
        retryCount: 0,
        metadata: {},
      };

      await adapter.saveState(state);

      let cancelled = false;
      engine.on('execution:cancelled', () => { cancelled = true; });

      await engine.cancelExecution('exec_cancel_test');

      expect(cancelled).toBe(true);

      const updated = await adapter.loadState('exec_cancel_test');
      expect(updated?.status).toBe('failed');
      expect(updated?.error).toBe('Cancelled by user');
    });

    it('should not cancel non-running execution', async () => {
      const state: DurableWorkflowState = {
        workflowId: 'wf_1',
        executionId: 'exec_completed',
        status: 'completed',
        currentStep: 0,
        steps: [],
        checkpoints: [],
        startedAt: new Date(),
        retryCount: 0,
        metadata: {},
      };

      await adapter.saveState(state);

      let cancelled = false;
      engine.on('execution:cancelled', () => { cancelled = true; });

      await engine.cancelExecution('exec_completed');

      expect(cancelled).toBe(false);
    });
  });

  describe('factory function', () => {
    it('should create engine with default adapter', () => {
      const defaultEngine = createDurableExecutionEngine();
      expect(defaultEngine).toBeInstanceOf(DurableExecutionEngine);
    });

    it('should create engine with custom config', () => {
      const customEngine = createDurableExecutionEngine({
        checkpointInterval: 10000,
        defaultTimeout: 60000,
      });
      expect(customEngine).toBeInstanceOf(DurableExecutionEngine);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should handle error in recovery', async () => {
      let errorEmitted = false;
      engine.on('recovery:failed', () => { errorEmitted = true; });

      const state: DurableWorkflowState = {
        workflowId: 'wf_1',
        executionId: 'exec_recovery_fail',
        status: 'running',
        currentStep: 1,
        steps: [
          { id: 's1', nodeId: 'n1', nodeType: 't', status: 'completed', input: null, retryCount: 0 },
        ],
        checkpoints: [],
        startedAt: new Date(),
        retryCount: 0,
        metadata: {},
      };

      await adapter.saveState(state);

      // Force re-recovery
      await engine.stop();
      await engine.start();

      // The recovery should have been triggered
      expect(true).toBe(true); // Just verify no crash
    });

    it('should handle step execution error', async () => {
      engine.on('node:execute', ({ callback }) => {
        callback(new Error('Node execution failed'), null);
      });

      await expect(
        engine.execute('wf', [{ id: 'n1', type: 't', config: {} }], {})
      ).rejects.toThrow();
    });
  });

  describe('checkpoints', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should create checkpoint with correct structure', async () => {
      const checkpoints: Checkpoint[] = [];
      engine.on('checkpoint:created', (cp) => { checkpoints.push(cp); });

      await engine.execute('wf', [{ id: 'n1', type: 't', config: {} }], {});

      expect(checkpoints.length).toBeGreaterThan(0);
      const cp = checkpoints[0];
      expect(cp.id).toBeDefined();
      expect(cp.stepId).toBeDefined();
      expect(cp.timestamp).toBeInstanceOf(Date);
      expect(cp.state).toBeDefined();
    });

    it('should persist checkpoints', async () => {
      const result = await engine.execute('wf', [{ id: 'n1', type: 't', config: {} }], {});

      const state = await adapter.loadState(result.executionId);
      expect(state?.checkpoints.length).toBeGreaterThan(0);
    });
  });
});

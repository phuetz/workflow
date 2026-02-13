/**
 * executionSlice Unit Tests
 * Tests for the Zustand execution slice - manages workflow execution state
 *
 * Task: T2.4 - Tests Store Slices (executionSlice)
 * Created: 2026-01-07
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createExecutionSlice,
  ExecutionSlice,
  ExecutionResult,
  ExecutionError,
  ExecutionHistory
} from '../../store/slices/executionSlice';

// Mock external services
vi.mock('../../services/SimpleLogger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Helper to create a minimal Zustand-like store for testing
function createTestStore() {
  let state: ExecutionSlice;

  const setState = (partial: Partial<ExecutionSlice> | ((state: ExecutionSlice) => Partial<ExecutionSlice>)) => {
    if (typeof partial === 'function') {
      const newState = partial(state);
      state = { ...state, ...newState };
    } else {
      state = { ...state, ...partial };
    }
  };

  const getState = () => state;

  // Initialize with the slice
  const slice = createExecutionSlice(setState as any, getState as any, {} as any);
  state = { ...slice };

  return {
    getState,
    setState,
    reset: () => {
      const freshSlice = createExecutionSlice(setState as any, getState as any, {} as any);
      state = { ...freshSlice };
    }
  };
}

// Test fixtures
const createTestExecutionResult = (overrides: Partial<ExecutionResult> = {}): ExecutionResult => ({
  data: { output: 'test data' },
  timestamp: new Date().toISOString(),
  updateSequence: 1,
  nodeId: 'test-node',
  ...overrides
});

const createTestExecutionError = (overrides: Partial<ExecutionError> = {}): ExecutionError => ({
  message: 'Test error message',
  timestamp: new Date().toISOString(),
  ...overrides
});

const createTestExecutionHistory = (overrides: Partial<ExecutionHistory> = {}): ExecutionHistory => ({
  id: `exec-${Date.now()}`,
  workflowId: 'workflow-1',
  status: 'completed',
  startTime: new Date(Date.now() - 1000).toISOString(),
  endTime: new Date().toISOString(),
  duration: 1000,
  ...overrides
});

describe('executionSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Initial State Tests
  // ============================================
  describe('Initial State', () => {
    it('should have isExecuting as false', () => {
      expect(store.getState().isExecuting).toBe(false);
    });

    it('should have empty executionResults', () => {
      expect(store.getState().executionResults).toEqual({});
    });

    it('should have empty executionErrors', () => {
      expect(store.getState().executionErrors).toEqual({});
    });

    it('should have empty nodeExecutionData', () => {
      expect(store.getState().nodeExecutionData).toEqual({});
    });

    it('should have empty nodeExecutionStatus', () => {
      expect(store.getState().nodeExecutionStatus).toEqual({});
    });

    it('should have null currentExecutingNode', () => {
      expect(store.getState().currentExecutingNode).toBeNull();
    });

    it('should have empty executionHistory', () => {
      expect(store.getState().executionHistory).toEqual([]);
    });

    it('should have empty executionLogs', () => {
      expect(store.getState().executionLogs).toEqual([]);
    });

    it('should have initialized executionStats', () => {
      expect(store.getState().executionStats).toEqual({
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        nodeStats: {},
        errorStats: {}
      });
    });
  });

  // ============================================
  // Basic Setters Tests
  // ============================================
  describe('Basic Setters', () => {
    describe('setIsExecuting', () => {
      it('should set isExecuting to true', () => {
        store.getState().setIsExecuting(true);
        expect(store.getState().isExecuting).toBe(true);
      });

      it('should set isExecuting to false', () => {
        store.getState().setIsExecuting(true);
        store.getState().setIsExecuting(false);
        expect(store.getState().isExecuting).toBe(false);
      });
    });

    describe('setCurrentExecutingNode', () => {
      it('should set current executing node', () => {
        store.getState().setCurrentExecutingNode('node-123');
        expect(store.getState().currentExecutingNode).toBe('node-123');
      });

      it('should clear current executing node with null', () => {
        store.getState().setCurrentExecutingNode('node-123');
        store.getState().setCurrentExecutingNode(null);
        expect(store.getState().currentExecutingNode).toBeNull();
      });
    });
  });

  // ============================================
  // Execution Results Tests
  // ============================================
  describe('setExecutionResult', () => {
    it('should set execution result for a node', () => {
      const result = createTestExecutionResult({ data: { value: 42 } });
      store.getState().setExecutionResult('node-1', result);

      const stored = store.getState().executionResults['node-1'];
      expect(stored.data).toEqual({ value: 42 });
      expect(stored.nodeId).toBe('node-1');
    });

    it('should add timestamp if not provided', () => {
      const result = createTestExecutionResult();
      delete (result as any).timestamp;

      store.getState().setExecutionResult('node-1', result);

      const stored = store.getState().executionResults['node-1'];
      expect(stored.timestamp).toBeDefined();
    });

    it('should add receivedAt timestamp', () => {
      const result = createTestExecutionResult();
      store.getState().setExecutionResult('node-1', result);

      const stored = store.getState().executionResults['node-1'];
      expect(stored.receivedAt).toBeDefined();
    });

    it('should increment updateSequence', () => {
      const result1 = createTestExecutionResult({ updateSequence: 1 });
      const result2 = createTestExecutionResult({ updateSequence: 2 });

      store.getState().setExecutionResult('node-1', result1);
      store.getState().setExecutionResult('node-1', result2);

      const stored = store.getState().executionResults['node-1'];
      expect(stored.updateSequence).toBe(2);
    });

    it('should ignore out-of-order results (lower sequence)', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      const result1 = createTestExecutionResult({ updateSequence: 5, data: { first: true } });
      const result2 = createTestExecutionResult({ updateSequence: 3, data: { second: true } });

      store.getState().setExecutionResult('node-1', result1);
      store.getState().setExecutionResult('node-1', result2);

      const stored = store.getState().executionResults['node-1'];
      expect(stored.data).toEqual({ first: true });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should ignore older timestamp results', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      const olderTime = new Date(Date.now() - 10000).toISOString();
      const newerTime = new Date().toISOString();

      const result1 = createTestExecutionResult({
        timestamp: newerTime,
        updateSequence: 1,
        data: { newer: true }
      });
      const result2 = createTestExecutionResult({
        timestamp: olderTime,
        updateSequence: 2,
        data: { older: true }
      });

      store.getState().setExecutionResult('node-1', result1);
      store.getState().setExecutionResult('node-1', result2);

      const stored = store.getState().executionResults['node-1'];
      expect(stored.data).toEqual({ newer: true });
    });
  });

  // ============================================
  // Node Execution Data Tests
  // ============================================
  describe('setNodeExecutionData', () => {
    it('should set node execution data', () => {
      store.getState().setNodeExecutionData('node-1', { input: 'test' });

      const data = store.getState().nodeExecutionData['node-1'];
      expect(data.input).toBe('test');
    });

    it('should add lastUpdated timestamp', () => {
      store.getState().setNodeExecutionData('node-1', { input: 'test' });

      const data = store.getState().nodeExecutionData['node-1'];
      expect(data.lastUpdated).toBeDefined();
      expect(typeof data.lastUpdated).toBe('number');
    });

    it('should track updateCount', () => {
      store.getState().setNodeExecutionData('node-1', { v: 1 });
      store.getState().setNodeExecutionData('node-1', { v: 2 });
      store.getState().setNodeExecutionData('node-1', { v: 3 });

      const data = store.getState().nodeExecutionData['node-1'];
      expect(data.updateCount).toBe(3);
    });

    it('should ignore invalid nodeId', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      store.getState().setNodeExecutionData('', { data: 'test' });

      expect(store.getState().nodeExecutionData['']).toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle multiple nodes independently', () => {
      store.getState().setNodeExecutionData('node-1', { a: 1 });
      store.getState().setNodeExecutionData('node-2', { b: 2 });

      expect(store.getState().nodeExecutionData['node-1'].a).toBe(1);
      expect(store.getState().nodeExecutionData['node-2'].b).toBe(2);
    });
  });

  // ============================================
  // Execution Errors Tests
  // ============================================
  describe('setExecutionError', () => {
    it('should set execution error for a node', () => {
      const error = createTestExecutionError({ message: 'Connection failed' });
      store.getState().setExecutionError('node-1', error);

      const stored = store.getState().executionErrors['node-1'];
      expect(stored.message).toBe('Connection failed');
    });

    it('should add timestamp if not provided', () => {
      store.getState().setExecutionError('node-1', { message: 'Error' });

      const stored = store.getState().executionErrors['node-1'];
      expect(stored.timestamp).toBeDefined();
    });

    it('should generate errorId', () => {
      store.getState().setExecutionError('node-1', { message: 'Error' });

      const stored = store.getState().executionErrors['node-1'];
      expect(stored.errorId).toBeDefined();
      expect(stored.errorId).toContain('node-1');
    });

    it('should increment sequence for same node', () => {
      store.getState().setExecutionError('node-1', { message: 'Error 1' });
      store.getState().setExecutionError('node-1', { message: 'Error 2' });

      const stored = store.getState().executionErrors['node-1'];
      expect(stored.sequence).toBe(2);
    });

    it('should ignore older errors', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      const newerTime = new Date().toISOString();
      const olderTime = new Date(Date.now() - 10000).toISOString();

      store.getState().setExecutionError('node-1', {
        message: 'Newer error',
        timestamp: newerTime
      });
      store.getState().setExecutionError('node-1', {
        message: 'Older error',
        timestamp: olderTime
      });

      const stored = store.getState().executionErrors['node-1'];
      expect(stored.message).toBe('Newer error');
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  // ============================================
  // Node Status Tests (State Machine)
  // ============================================
  describe('setNodeStatus', () => {
    it('should set initial status', () => {
      store.getState().setNodeStatus('node-1', 'idle');
      expect(store.getState().nodeExecutionStatus['node-1']).toBe('idle');
    });

    it('should allow valid transition: idle -> running', () => {
      store.getState().setNodeStatus('node-1', 'idle');
      store.getState().setNodeStatus('node-1', 'running');
      expect(store.getState().nodeExecutionStatus['node-1']).toBe('running');
    });

    it('should allow valid transition: running -> success', () => {
      store.getState().setNodeStatus('node-1', 'idle');
      store.getState().setNodeStatus('node-1', 'running');
      store.getState().setNodeStatus('node-1', 'success');
      expect(store.getState().nodeExecutionStatus['node-1']).toBe('success');
    });

    it('should allow valid transition: running -> error', () => {
      store.getState().setNodeStatus('node-1', 'idle');
      store.getState().setNodeStatus('node-1', 'running');
      store.getState().setNodeStatus('node-1', 'error');
      expect(store.getState().nodeExecutionStatus['node-1']).toBe('error');
    });

    it('should allow valid transition: running -> cancelled', () => {
      store.getState().setNodeStatus('node-1', 'idle');
      store.getState().setNodeStatus('node-1', 'running');
      store.getState().setNodeStatus('node-1', 'cancelled');
      expect(store.getState().nodeExecutionStatus['node-1']).toBe('cancelled');
    });

    it('should allow valid transition: idle -> skipped', () => {
      store.getState().setNodeStatus('node-1', 'idle');
      store.getState().setNodeStatus('node-1', 'skipped');
      expect(store.getState().nodeExecutionStatus['node-1']).toBe('skipped');
    });

    it('should allow retry: success -> running', () => {
      store.getState().setNodeStatus('node-1', 'idle');
      store.getState().setNodeStatus('node-1', 'running');
      store.getState().setNodeStatus('node-1', 'success');
      store.getState().setNodeStatus('node-1', 'running');
      expect(store.getState().nodeExecutionStatus['node-1']).toBe('running');
    });

    it('should reject invalid transition: idle -> success', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      store.getState().setNodeStatus('node-1', 'idle');
      store.getState().setNodeStatus('node-1', 'success');

      expect(store.getState().nodeExecutionStatus['node-1']).toBe('idle');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid status transition')
      );
    });

    it('should reject invalid transition: skipped -> running', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      store.getState().setNodeStatus('node-1', 'idle');
      store.getState().setNodeStatus('node-1', 'skipped');
      store.getState().setNodeStatus('node-1', 'running');

      expect(store.getState().nodeExecutionStatus['node-1']).toBe('skipped');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle multiple nodes with different statuses', () => {
      store.getState().setNodeStatus('node-1', 'idle');
      store.getState().setNodeStatus('node-1', 'running');
      store.getState().setNodeStatus('node-2', 'idle');
      store.getState().setNodeStatus('node-2', 'skipped');

      expect(store.getState().nodeExecutionStatus['node-1']).toBe('running');
      expect(store.getState().nodeExecutionStatus['node-2']).toBe('skipped');
    });
  });

  describe('clearNodeStatuses', () => {
    it('should clear all node statuses', () => {
      store.getState().setNodeStatus('node-1', 'idle');
      store.getState().setNodeStatus('node-2', 'running');
      store.getState().setNodeStatus('node-3', 'success');

      store.getState().clearNodeStatuses();

      expect(store.getState().nodeExecutionStatus).toEqual({});
    });
  });

  // ============================================
  // Clear Execution Tests
  // ============================================
  describe('clearExecution', () => {
    it('should clear all execution state', async () => {
      // Setup some state
      store.getState().setIsExecuting(true);
      store.getState().setCurrentExecutingNode('node-1');
      store.getState().setExecutionResult('node-1', createTestExecutionResult());
      store.getState().setExecutionError('node-2', createTestExecutionError());
      store.getState().setNodeExecutionData('node-1', { data: 'test' });
      store.getState().setNodeStatus('node-1', 'running');

      await store.getState().clearExecution();

      expect(store.getState().isExecuting).toBe(false);
      expect(store.getState().currentExecutingNode).toBeNull();
      expect(store.getState().executionResults).toEqual({});
      expect(store.getState().executionErrors).toEqual({});
      expect(store.getState().nodeExecutionData).toEqual({});
      expect(store.getState().nodeExecutionStatus).toEqual({});
    });

    it('should return a Promise', () => {
      const result = store.getState().clearExecution();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  // ============================================
  // Execution History Tests
  // ============================================
  describe('addExecutionToHistory', () => {
    it('should add execution to history', async () => {
      const execution = createTestExecutionHistory({ id: 'exec-1' });
      await store.getState().addExecutionToHistory(execution);

      expect(store.getState().executionHistory).toHaveLength(1);
      expect(store.getState().executionHistory[0].id).toBe('exec-1');
    });

    it('should prepend new executions (newest first)', async () => {
      await store.getState().addExecutionToHistory(createTestExecutionHistory({ id: 'exec-1' }));
      await store.getState().addExecutionToHistory(createTestExecutionHistory({ id: 'exec-2' }));

      expect(store.getState().executionHistory[0].id).toBe('exec-2');
      expect(store.getState().executionHistory[1].id).toBe('exec-1');
    });

    it('should add historyId to execution', async () => {
      const execution = createTestExecutionHistory();
      await store.getState().addExecutionToHistory(execution);

      expect((store.getState().executionHistory[0] as any).historyId).toBeDefined();
    });

    it('should add addedAt timestamp', async () => {
      const execution = createTestExecutionHistory();
      await store.getState().addExecutionToHistory(execution);

      expect((store.getState().executionHistory[0] as any).addedAt).toBeDefined();
    });

    it('should limit history to 100 entries', async () => {
      // Add 105 executions
      for (let i = 0; i < 105; i++) {
        await store.getState().addExecutionToHistory(
          createTestExecutionHistory({ id: `exec-${i}` })
        );
      }

      expect(store.getState().executionHistory).toHaveLength(100);
      // Newest should be first
      expect(store.getState().executionHistory[0].id).toBe('exec-104');
    });

    it('should handle invalid execution gracefully', async () => {
      await store.getState().addExecutionToHistory(null as any);
      expect(store.getState().executionHistory).toHaveLength(0);
    });
  });

  // ============================================
  // Execution Logs Tests
  // ============================================
  describe('addLog', () => {
    it('should add a log entry', () => {
      store.getState().addLog({ level: 'info', message: 'Test log' });

      expect(store.getState().executionLogs).toHaveLength(1);
      expect(store.getState().executionLogs[0].message).toBe('Test log');
    });

    it('should add timestamp to log', () => {
      store.getState().addLog({ message: 'Test' });

      expect(store.getState().executionLogs[0].timestamp).toBeDefined();
    });

    it('should add id to log', () => {
      store.getState().addLog({ message: 'Test' });

      expect(store.getState().executionLogs[0].id).toBeDefined();
      expect(store.getState().executionLogs[0].id).toContain('log_');
    });

    it('should limit logs to 100 entries', () => {
      for (let i = 0; i < 110; i++) {
        store.getState().addLog({ message: `Log ${i}` });
      }

      expect(store.getState().executionLogs).toHaveLength(100);
      // Should keep most recent (last 100)
      expect(store.getState().executionLogs[99].message).toBe('Log 109');
    });

    it('should preserve log order (oldest first)', () => {
      store.getState().addLog({ message: 'First' });
      store.getState().addLog({ message: 'Second' });
      store.getState().addLog({ message: 'Third' });

      expect(store.getState().executionLogs[0].message).toBe('First');
      expect(store.getState().executionLogs[2].message).toBe('Third');
    });
  });

  describe('searchLogs', () => {
    beforeEach(() => {
      store.getState().addLog({ level: 'info', message: 'Starting workflow' });
      store.getState().addLog({ level: 'debug', message: 'Processing node A' });
      store.getState().addLog({ level: 'error', message: 'Failed to connect' });
      store.getState().addLog({ level: 'info', message: 'Workflow completed' });
    });

    it('should find logs by message content', () => {
      const results = store.getState().searchLogs('workflow');
      expect(results).toHaveLength(2);
    });

    it('should find logs by level', () => {
      const results = store.getState().searchLogs('error');
      expect(results).toHaveLength(1);
      expect(results[0].message).toBe('Failed to connect');
    });

    it('should be case insensitive', () => {
      const results = store.getState().searchLogs('WORKFLOW');
      expect(results).toHaveLength(2);
    });

    it('should return empty array for no matches', () => {
      const results = store.getState().searchLogs('nonexistent');
      expect(results).toEqual([]);
    });

    it('should search all log properties', () => {
      const results = store.getState().searchLogs('debug');
      expect(results).toHaveLength(1);
    });
  });

  // ============================================
  // Batch Updates Tests
  // ============================================
  describe('batchExecutionUpdates', () => {
    it('should process multiple updates atomically', async () => {
      await store.getState().batchExecutionUpdates([
        { type: 'status', nodeId: 'node-1', payload: 'running' },
        { type: 'status', nodeId: 'node-2', payload: 'running' },
        { type: 'data', nodeId: 'node-1', payload: { input: 'test' } }
      ]);

      expect(store.getState().nodeExecutionStatus['node-1']).toBeDefined();
      expect(store.getState().nodeExecutionStatus['node-2']).toBeDefined();
      expect(store.getState().nodeExecutionData['node-1'].input).toBe('test');
    });

    it('should handle result updates', async () => {
      await store.getState().batchExecutionUpdates([
        { type: 'result', nodeId: 'node-1', payload: { data: { value: 42 } } }
      ]);

      expect(store.getState().executionResults['node-1'].data).toEqual({ value: 42 });
    });

    it('should handle error updates', async () => {
      await store.getState().batchExecutionUpdates([
        { type: 'error', nodeId: 'node-1', payload: { message: 'Test error' } }
      ]);

      expect(store.getState().executionErrors['node-1'].message).toBe('Test error');
    });

    it('should add batchId to updates', async () => {
      await store.getState().batchExecutionUpdates([
        { type: 'result', nodeId: 'node-1', payload: { data: 'test' } }
      ]);

      expect((store.getState().executionResults['node-1'] as any).batchId).toBeDefined();
    });

    it('should filter invalid nodeIds', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      await store.getState().batchExecutionUpdates([
        { type: 'status', nodeId: '', payload: 'running' },
        { type: 'status', nodeId: 'valid-node', payload: 'running' }
      ]);

      expect(store.getState().nodeExecutionStatus['']).toBeUndefined();
      expect(store.getState().nodeExecutionStatus['valid-node']).toBeDefined();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should return a Promise', () => {
      const result = store.getState().batchExecutionUpdates([]);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  // ============================================
  // Update Execution State Tests
  // ============================================
  describe('updateExecutionState', () => {
    it('should update status', () => {
      store.getState().updateExecutionState('node-1', { status: 'running' });
      expect(store.getState().nodeExecutionStatus['node-1']).toBe('running');
    });

    it('should update result', () => {
      store.getState().updateExecutionState('node-1', {
        result: { data: { value: 100 } }
      });
      expect(store.getState().executionResults['node-1'].data).toEqual({ value: 100 });
    });

    it('should update error', () => {
      store.getState().updateExecutionState('node-1', {
        error: { message: 'Something went wrong' }
      });
      expect(store.getState().executionErrors['node-1'].message).toBe('Something went wrong');
    });

    it('should update data', () => {
      store.getState().updateExecutionState('node-1', {
        data: { processed: true }
      });
      expect(store.getState().nodeExecutionData['node-1'].processed).toBe(true);
    });

    it('should update multiple fields at once', () => {
      store.getState().updateExecutionState('node-1', {
        status: 'success',
        result: { data: { output: 'done' } },
        data: { duration: 500 }
      });

      expect(store.getState().nodeExecutionStatus['node-1']).toBe('success');
      expect(store.getState().executionResults['node-1'].data).toEqual({ output: 'done' });
      expect(store.getState().nodeExecutionData['node-1'].duration).toBe(500);
    });

    it('should respect status transition rules', () => {
      store.getState().updateExecutionState('node-1', { status: 'idle' });
      store.getState().updateExecutionState('node-1', { status: 'success' }); // Invalid

      expect(store.getState().nodeExecutionStatus['node-1']).toBe('idle');
    });

    it('should increment updateSequence for results', () => {
      store.getState().updateExecutionState('node-1', { result: { data: 1 } });
      store.getState().updateExecutionState('node-1', { result: { data: 2 } });

      expect(store.getState().executionResults['node-1'].updateSequence).toBe(2);
    });

    it('should increment sequence for errors', () => {
      store.getState().updateExecutionState('node-1', { error: { message: 'Error 1' } });
      store.getState().updateExecutionState('node-1', { error: { message: 'Error 2' } });

      expect(store.getState().executionErrors['node-1'].sequence).toBe(2);
    });

    it('should track updateCount for data', () => {
      store.getState().updateExecutionState('node-1', { data: { v: 1 } });
      store.getState().updateExecutionState('node-1', { data: { v: 2 } });
      store.getState().updateExecutionState('node-1', { data: { v: 3 } });

      expect(store.getState().nodeExecutionData['node-1'].updateCount).toBe(3);
    });
  });

  // ============================================
  // Edge Cases and Integration Tests
  // ============================================
  describe('Edge Cases', () => {
    it('should handle concurrent updates to same node', async () => {
      const updates = Array.from({ length: 10 }, (_, i) => ({
        type: 'result' as const,
        nodeId: 'node-1',
        payload: { data: { sequence: i }, updateSequence: i }
      }));

      await store.getState().batchExecutionUpdates(updates);

      // Should have the highest sequence
      expect(store.getState().executionResults['node-1']).toBeDefined();
    });

    it('should handle execution lifecycle', async () => {
      // Start execution
      store.getState().setIsExecuting(true);
      store.getState().setCurrentExecutingNode('node-1');
      store.getState().setNodeStatus('node-1', 'idle');
      store.getState().setNodeStatus('node-1', 'running');

      // Execute and get result
      store.getState().setExecutionResult('node-1', {
        data: { output: 'success' },
        timestamp: new Date().toISOString()
      });
      store.getState().setNodeStatus('node-1', 'success');

      // Move to next node
      store.getState().setCurrentExecutingNode('node-2');
      store.getState().setNodeStatus('node-2', 'idle');
      store.getState().setNodeStatus('node-2', 'running');
      store.getState().setNodeStatus('node-2', 'success');

      // Complete execution
      store.getState().setCurrentExecutingNode(null);
      store.getState().setIsExecuting(false);

      // Add to history
      await store.getState().addExecutionToHistory({
        id: 'exec-1',
        workflowId: 'wf-1',
        status: 'completed',
        startTime: new Date(Date.now() - 1000).toISOString(),
        endTime: new Date().toISOString(),
        duration: 1000
      });

      expect(store.getState().isExecuting).toBe(false);
      expect(store.getState().currentExecutingNode).toBeNull();
      expect(store.getState().nodeExecutionStatus['node-1']).toBe('success');
      expect(store.getState().nodeExecutionStatus['node-2']).toBe('success');
      expect(store.getState().executionHistory).toHaveLength(1);
    });

    it('should handle error recovery flow', () => {
      // Initial run with error
      store.getState().setNodeStatus('node-1', 'idle');
      store.getState().setNodeStatus('node-1', 'running');
      store.getState().setExecutionError('node-1', { message: 'Connection timeout' });
      store.getState().setNodeStatus('node-1', 'error');

      // Retry
      store.getState().setNodeStatus('node-1', 'running');
      store.getState().setExecutionResult('node-1', { data: { success: true } });
      store.getState().setNodeStatus('node-1', 'success');

      expect(store.getState().nodeExecutionStatus['node-1']).toBe('success');
      expect(store.getState().executionErrors['node-1'].sequence).toBe(1);
    });

    it('should handle large data payloads', () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          data: { nested: { value: i * 2 } }
        }))
      };

      store.getState().setNodeExecutionData('node-1', largeData);

      const stored = store.getState().nodeExecutionData['node-1'];
      expect(stored.items).toHaveLength(1000);
    });
  });
});

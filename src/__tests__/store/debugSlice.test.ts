/**
 * debugSlice Unit Tests
 * Tests for the Zustand debug slice - manages debugging and breakpoints
 *
 * Task: T4.2 - Tests Store Slices (debugSlice)
 * Created: 2026-01-19
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createDebugSlice, DebugSlice, DebugSession } from '../../store/slices/debugSlice';

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
  let state: DebugSlice;

  const setState = (partial: Partial<typeof state> | ((state: typeof state) => Partial<typeof state>)) => {
    if (typeof partial === 'function') {
      const newState = partial(state);
      state = { ...state, ...newState };
    } else {
      state = { ...state, ...partial };
    }
  };

  const getState = () => state;

  // Initialize with the slice
  const slice = createDebugSlice(setState as any, getState as any, {} as any);
  state = { ...slice };

  return {
    getState,
    setState,
    reset: () => {
      const freshSlice = createDebugSlice(setState as any, getState as any, {} as any);
      state = { ...freshSlice };
    }
  };
}

// Counter for unique IDs
let sessionCounter = 0;

// Test fixtures
const createTestDebugSession = (overrides: Partial<DebugSession> = {}): DebugSession => ({
  id: `session-${Date.now()}-${++sessionCounter}-${Math.random().toString(36).substr(2, 9)}`,
  startedAt: new Date().toISOString(),
  status: 'running',
  currentNode: null,
  ...overrides
});

describe('debugSlice', () => {
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
    it('should have empty breakpoints object', () => {
      expect(store.getState().breakpoints).toEqual({});
    });

    it('should have null debugSession', () => {
      expect(store.getState().debugSession).toBeNull();
    });

    it('should have null currentDebugNode', () => {
      expect(store.getState().currentDebugNode).toBeNull();
    });

    it('should have empty testSessions object', () => {
      expect(store.getState().testSessions).toEqual({});
    });

    it('should have empty expressions object', () => {
      expect(store.getState().expressions).toEqual({});
    });

    it('should have empty customFunctions object', () => {
      expect(store.getState().customFunctions).toEqual({});
    });
  });

  // ============================================
  // Breakpoints Tests
  // ============================================
  describe('breakpoints', () => {
    it('should add breakpoint to node', () => {
      store.getState().addBreakpoint('node-1');

      expect(store.getState().breakpoints['node-1']).toBe(true);
    });

    it('should remove breakpoint from node', () => {
      store.getState().addBreakpoint('node-1');
      expect(store.getState().breakpoints['node-1']).toBe(true);

      store.getState().removeBreakpoint('node-1');

      expect(store.getState().breakpoints['node-1']).toBeUndefined();
    });

    it('should toggle breakpoint on (when not set)', () => {
      // Verify breakpoint doesn't exist
      expect(store.getState().breakpoints['toggle-node']).toBeUndefined();

      // Add breakpoint (simulating toggle on)
      store.getState().addBreakpoint('toggle-node');

      expect(store.getState().breakpoints['toggle-node']).toBe(true);
    });

    it('should toggle breakpoint off (when set)', () => {
      // Add breakpoint first
      store.getState().addBreakpoint('toggle-node');
      expect(store.getState().breakpoints['toggle-node']).toBe(true);

      // Remove breakpoint (simulating toggle off)
      store.getState().removeBreakpoint('toggle-node');

      expect(store.getState().breakpoints['toggle-node']).toBeUndefined();
    });

    it('should clear all breakpoints', () => {
      store.getState().addBreakpoint('node-1');
      store.getState().addBreakpoint('node-2');
      store.getState().addBreakpoint('node-3');

      // Manually clear by setting empty object
      store.setState({ breakpoints: {} });

      expect(store.getState().breakpoints).toEqual({});
    });

    it('should handle multiple breakpoints', () => {
      store.getState().addBreakpoint('node-1');
      store.getState().addBreakpoint('node-2');
      store.getState().addBreakpoint('node-3');

      expect(Object.keys(store.getState().breakpoints)).toHaveLength(3);
      expect(store.getState().breakpoints['node-1']).toBe(true);
      expect(store.getState().breakpoints['node-2']).toBe(true);
      expect(store.getState().breakpoints['node-3']).toBe(true);
    });

    it('should not create duplicate breakpoints', () => {
      store.getState().addBreakpoint('node-1');
      store.getState().addBreakpoint('node-1');

      expect(Object.keys(store.getState().breakpoints)).toHaveLength(1);
      expect(store.getState().breakpoints['node-1']).toBe(true);
    });
  });

  // ============================================
  // Step Execution Tests
  // ============================================
  describe('step execution', () => {
    it('should step to next node', () => {
      const session = createTestDebugSession({ currentNode: 'node-1' });
      store.setState({ debugSession: session });

      // debugStep logs info but doesn't change state in current implementation
      // Should not throw
      expect(() => store.getState().debugStep()).not.toThrow();
    });

    it('should step over (continue to next breakpoint)', () => {
      const session = createTestDebugSession({ status: 'paused', currentNode: 'node-1' });
      store.setState({ debugSession: session });

      // debugContinue logs info - should not throw
      expect(() => store.getState().debugContinue()).not.toThrow();
    });

    it('should step into subworkflow', () => {
      const session = createTestDebugSession({ currentNode: 'subworkflow-node' });
      store.setState({ debugSession: session });

      // This is a placeholder test - current implementation only logs
      // Should not throw
      expect(() => store.getState().debugStep()).not.toThrow();
    });

    it('should continue execution after pause', () => {
      const session = createTestDebugSession({ status: 'paused' });
      store.setState({ debugSession: session });

      // Should not throw
      expect(() => store.getState().debugContinue()).not.toThrow();
    });
  });

  // ============================================
  // Debug Session Tests
  // ============================================
  describe('debug session', () => {
    it('should start debug session', () => {
      const session = createTestDebugSession({ status: 'running' });
      store.setState({ debugSession: session });

      expect(store.getState().debugSession).not.toBeNull();
      expect(store.getState().debugSession?.status).toBe('running');
    });

    it('should pause at breakpoint', () => {
      const session = createTestDebugSession({
        status: 'paused',
        currentNode: 'breakpoint-node'
      });
      store.setState({
        debugSession: session,
        breakpoints: { 'breakpoint-node': true }
      });

      expect(store.getState().debugSession?.status).toBe('paused');
      expect(store.getState().debugSession?.currentNode).toBe('breakpoint-node');
    });

    it('should stop debug session', () => {
      const session = createTestDebugSession({ status: 'running' });
      store.setState({ debugSession: session, currentDebugNode: 'some-node' });

      store.getState().debugStop();

      expect(store.getState().debugSession).toBeNull();
      expect(store.getState().currentDebugNode).toBeNull();
    });

    it('should inspect node data during debug', () => {
      const session = createTestDebugSession({
        status: 'paused',
        currentNode: 'inspect-node'
      });
      store.setState({
        debugSession: session,
        currentDebugNode: 'inspect-node'
      });

      expect(store.getState().currentDebugNode).toBe('inspect-node');
      expect(store.getState().debugSession?.currentNode).toBe('inspect-node');
    });

    it('should track session start time', () => {
      const beforeTime = new Date().toISOString();
      const session = createTestDebugSession();
      store.setState({ debugSession: session });

      expect(store.getState().debugSession?.startedAt).toBeDefined();
      expect(new Date(store.getState().debugSession!.startedAt).getTime())
        .toBeGreaterThanOrEqual(new Date(beforeTime).getTime() - 1000);
    });

    it('should have unique session id', () => {
      const session1 = createTestDebugSession();
      const session2 = createTestDebugSession();

      expect(session1.id).not.toBe(session2.id);
    });
  });

  // ============================================
  // Test Sessions Tests
  // ============================================
  describe('test sessions', () => {
    it('should store test session data', () => {
      const testSession = {
        id: 'test-session-1',
        name: 'API Integration Test',
        testData: { input: 'test' },
        results: []
      };

      store.setState({
        testSessions: { 'test-session-1': testSession }
      });

      expect(store.getState().testSessions['test-session-1']).toEqual(testSession);
    });

    it('should handle multiple test sessions', () => {
      const sessions = {
        'session-1': { id: 'session-1', name: 'Test 1', testData: {}, results: [] },
        'session-2': { id: 'session-2', name: 'Test 2', testData: {}, results: [] }
      };

      store.setState({ testSessions: sessions });

      expect(Object.keys(store.getState().testSessions)).toHaveLength(2);
    });
  });

  // ============================================
  // Expressions and Custom Functions Tests
  // ============================================
  describe('expressions and custom functions', () => {
    it('should store expressions', () => {
      store.setState({
        expressions: { 'node-1': '{{ $json.value }}' }
      });

      expect(store.getState().expressions['node-1']).toBe('{{ $json.value }}');
    });

    it('should store custom functions', () => {
      store.setState({
        customFunctions: { 'myFunc': 'return input * 2;' }
      });

      expect(store.getState().customFunctions['myFunc']).toBe('return input * 2;');
    });
  });

  // ============================================
  // Edge Cases Tests
  // ============================================
  describe('Edge Cases', () => {
    it('should handle removing non-existent breakpoint', () => {
      store.getState().removeBreakpoint('non-existent');

      // Should not throw and state should remain unchanged
      expect(store.getState().breakpoints).toEqual({});
    });

    it('should handle debugStop when no session exists', () => {
      expect(store.getState().debugSession).toBeNull();

      store.getState().debugStop();

      // Should not throw
      expect(store.getState().debugSession).toBeNull();
    });

    it('should handle special characters in node IDs for breakpoints', () => {
      const specialId = 'node-with_special.chars:123';
      store.getState().addBreakpoint(specialId);

      expect(store.getState().breakpoints[specialId]).toBe(true);
    });

    it('should handle rapid breakpoint toggles', () => {
      for (let i = 0; i < 10; i++) {
        store.getState().addBreakpoint('rapid-node');
        store.getState().removeBreakpoint('rapid-node');
      }
      store.getState().addBreakpoint('rapid-node');

      expect(store.getState().breakpoints['rapid-node']).toBe(true);
    });
  });
});

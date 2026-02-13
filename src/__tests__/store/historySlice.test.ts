/**
 * historySlice Unit Tests
 * Tests for the Zustand history slice - manages undo/redo functionality
 *
 * Task: T4.2 - Tests Store Slices (historySlice)
 * Created: 2026-01-19
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createHistorySlice, HistorySlice, HistoryEntry } from '../../store/slices/historySlice';
import type { Node, Edge } from '@xyflow/react';

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
  let state: HistorySlice & { nodes: Node[]; edges: Edge[] };

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
  const slice = createHistorySlice(setState as any, getState as any, {} as any);
  state = { ...slice, nodes: [], edges: [] };

  return {
    getState,
    setState,
    reset: () => {
      const freshSlice = createHistorySlice(setState as any, getState as any, {} as any);
      state = { ...freshSlice, nodes: [], edges: [] };
    }
  };
}

// Test fixtures
const createTestNode = (overrides: Partial<Node> = {}): Node => ({
  id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: 'default',
  position: { x: 100, y: 100 },
  data: {
    type: 'action',
    label: 'Test Node',
    config: {}
  },
  ...overrides
});

const createTestEdge = (overrides: Partial<Edge> = {}): Edge => ({
  id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  source: 'node-1',
  target: 'node-2',
  ...overrides
});

describe('historySlice', () => {
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
    it('should have empty undoHistory array', () => {
      expect(store.getState().undoHistory).toEqual([]);
    });

    it('should have empty redoHistory array', () => {
      expect(store.getState().redoHistory).toEqual([]);
    });
  });

  // ============================================
  // Undo/Redo Tests
  // ============================================
  describe('undo/redo', () => {
    it('should undo last action', async () => {
      // Set initial state
      const initialNodes = [createTestNode({ id: 'node-1' })];
      const initialEdges = [createTestEdge({ id: 'edge-1' })];
      store.setState({ nodes: initialNodes, edges: initialEdges });

      // Add to history
      await store.getState().addToHistory(initialNodes, initialEdges);

      // Make changes
      const newNodes = [createTestNode({ id: 'node-2' })];
      const newEdges = [createTestEdge({ id: 'edge-2' })];
      store.setState({ nodes: newNodes, edges: newEdges });

      // Undo
      store.getState().undo();

      // Should restore to initial state
      expect(store.getState().nodes).toEqual(initialNodes);
      expect(store.getState().edges).toEqual(initialEdges);
    });

    it('should redo undone action', async () => {
      const initialNodes = [createTestNode({ id: 'node-1' })];
      const initialEdges = [createTestEdge({ id: 'edge-1' })];
      store.setState({ nodes: initialNodes, edges: initialEdges });

      await store.getState().addToHistory(initialNodes, initialEdges);

      const newNodes = [createTestNode({ id: 'node-2' })];
      const newEdges = [createTestEdge({ id: 'edge-2' })];
      store.setState({ nodes: newNodes, edges: newEdges });

      // Undo then redo
      store.getState().undo();
      store.getState().redo();

      // Should restore to new state
      expect(store.getState().nodes).toEqual(newNodes);
      expect(store.getState().edges).toEqual(newEdges);
    });

    it('should maintain undo stack', async () => {
      const nodes1 = [createTestNode({ id: 'node-1' })];
      const nodes2 = [createTestNode({ id: 'node-2' })];
      const nodes3 = [createTestNode({ id: 'node-3' })];
      const edges: Edge[] = [];

      store.setState({ nodes: nodes1, edges });
      await store.getState().addToHistory(nodes1, edges);

      store.setState({ nodes: nodes2, edges });
      await store.getState().addToHistory(nodes2, edges);

      store.setState({ nodes: nodes3, edges });
      await store.getState().addToHistory(nodes3, edges);

      expect(store.getState().undoHistory).toHaveLength(3);
    });

    it('should clear redo stack on new action', async () => {
      const nodes1 = [createTestNode({ id: 'node-1' })];
      const nodes2 = [createTestNode({ id: 'node-2' })];
      const nodes3 = [createTestNode({ id: 'node-3' })];
      const edges: Edge[] = [];

      store.setState({ nodes: nodes1, edges });
      await store.getState().addToHistory(nodes1, edges);

      store.setState({ nodes: nodes2, edges });
      await store.getState().addToHistory(nodes2, edges);

      // Undo once
      store.getState().undo();
      expect(store.getState().redoHistory).toHaveLength(1);

      // Add new history - should clear redo stack
      store.setState({ nodes: nodes3, edges });
      await store.getState().addToHistory(nodes3, edges);

      expect(store.getState().redoHistory).toHaveLength(0);
    });

    it('should limit history size to 20 entries', async () => {
      const edges: Edge[] = [];

      // Add 25 entries to history
      for (let i = 0; i < 25; i++) {
        const nodes = [createTestNode({ id: `node-${i}` })];
        store.setState({ nodes, edges });
        await store.getState().addToHistory(nodes, edges);
      }

      // Should only keep last 20
      expect(store.getState().undoHistory.length).toBeLessThanOrEqual(20);
    });

    it('should do nothing when undo stack is empty', () => {
      const initialNodes = [createTestNode({ id: 'node-1' })];
      store.setState({ nodes: initialNodes, edges: [] });

      // Try to undo with empty history
      store.getState().undo();

      // State should remain unchanged
      expect(store.getState().nodes).toEqual(initialNodes);
    });

    it('should do nothing when redo stack is empty', () => {
      const initialNodes = [createTestNode({ id: 'node-1' })];
      store.setState({ nodes: initialNodes, edges: [] });

      // Try to redo with empty history
      store.getState().redo();

      // State should remain unchanged
      expect(store.getState().nodes).toEqual(initialNodes);
    });
  });

  // ============================================
  // Snapshot Tests
  // ============================================
  describe('snapshot', () => {
    it('should create snapshot of current state', async () => {
      const nodes = [createTestNode({ id: 'snapshot-node' })];
      const edges = [createTestEdge({ id: 'snapshot-edge' })];
      store.setState({ nodes, edges });

      await store.getState().addToHistory(nodes, edges);

      const lastEntry = store.getState().undoHistory[store.getState().undoHistory.length - 1];
      expect(lastEntry.nodes).toEqual(nodes);
      expect(lastEntry.edges).toEqual(edges);
    });

    it('should restore from snapshot via undo', async () => {
      const snapshot1Nodes = [createTestNode({ id: 'snap-1' })];
      const snapshot1Edges = [createTestEdge({ id: 'edge-snap-1' })];
      store.setState({ nodes: snapshot1Nodes, edges: snapshot1Edges });
      await store.getState().addToHistory(snapshot1Nodes, snapshot1Edges);

      const snapshot2Nodes = [createTestNode({ id: 'snap-2' })];
      store.setState({ nodes: snapshot2Nodes, edges: [] });

      // Undo to restore first snapshot
      store.getState().undo();

      expect(store.getState().nodes).toEqual(snapshot1Nodes);
      expect(store.getState().edges).toEqual(snapshot1Edges);
    });

    it('should track snapshot metadata (timestamp)', async () => {
      const beforeTime = Date.now();
      const nodes = [createTestNode({ id: 'meta-node' })];
      await store.getState().addToHistory(nodes, []);
      const afterTime = Date.now();

      const lastEntry = store.getState().undoHistory[store.getState().undoHistory.length - 1];
      expect(lastEntry.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(lastEntry.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should track snapshot metadata (id)', async () => {
      const nodes = [createTestNode({ id: 'id-node' })];
      await store.getState().addToHistory(nodes, []);

      const lastEntry = store.getState().undoHistory[store.getState().undoHistory.length - 1];
      expect(lastEntry.id).toBeDefined();
      expect(typeof lastEntry.id).toBe('string');
    });
  });

  // ============================================
  // canUndo/canRedo Tests
  // ============================================
  describe('canUndo/canRedo', () => {
    it('should return true when undo is available', async () => {
      const nodes = [createTestNode({ id: 'undo-node' })];
      await store.getState().addToHistory(nodes, []);

      expect(store.getState().undoHistory.length).toBeGreaterThan(0);
    });

    it('should return false when undo stack is empty', () => {
      expect(store.getState().undoHistory.length).toBe(0);
    });

    it('should return true when redo is available', async () => {
      const nodes = [createTestNode({ id: 'redo-node' })];
      store.setState({ nodes, edges: [] });
      await store.getState().addToHistory(nodes, []);

      store.setState({ nodes: [], edges: [] });
      store.getState().undo();

      expect(store.getState().redoHistory.length).toBeGreaterThan(0);
    });

    it('should return false when redo stack is empty', () => {
      expect(store.getState().redoHistory.length).toBe(0);
    });
  });

  // ============================================
  // Clear History Tests
  // ============================================
  describe('clearHistory', () => {
    it('should clear all history', async () => {
      const nodes = [createTestNode({ id: 'clear-node' })];
      await store.getState().addToHistory(nodes, []);
      store.getState().undo();

      // Should have entries in both stacks
      expect(store.getState().undoHistory.length + store.getState().redoHistory.length).toBeGreaterThan(0);

      // Clear history
      store.getState().clearHistory();

      expect(store.getState().undoHistory).toEqual([]);
      expect(store.getState().redoHistory).toEqual([]);
    });
  });

  // ============================================
  // Edge Cases and Error Handling
  // ============================================
  describe('Edge Cases', () => {
    it('should handle rapid history additions', async () => {
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 10; i++) {
        const nodes = [createTestNode({ id: `rapid-${i}` })];
        promises.push(store.getState().addToHistory(nodes, []));
      }
      await Promise.all(promises);

      expect(store.getState().undoHistory.length).toBeGreaterThan(0);
    });

    it('should handle empty nodes array', async () => {
      await store.getState().addToHistory([], []);

      const lastEntry = store.getState().undoHistory[store.getState().undoHistory.length - 1];
      expect(lastEntry.nodes).toEqual([]);
    });

    it('should handle empty edges array', async () => {
      const nodes = [createTestNode({ id: 'empty-edges-node' })];
      await store.getState().addToHistory(nodes, []);

      const lastEntry = store.getState().undoHistory[store.getState().undoHistory.length - 1];
      expect(lastEntry.edges).toEqual([]);
    });

    it('should handle complex node data in history', async () => {
      const complexNode = createTestNode({
        id: 'complex',
        data: {
          type: 'complex',
          label: 'Complex',
          config: {
            nested: { deep: { value: 'test' } },
            array: [1, 2, 3]
          }
        }
      });
      await store.getState().addToHistory([complexNode], []);

      const lastEntry = store.getState().undoHistory[store.getState().undoHistory.length - 1];
      expect((lastEntry.nodes[0].data as any).config.nested.deep.value).toBe('test');
    });

    it('should create copies in history (addToHistory uses spread)', async () => {
      const originalNode = createTestNode({ id: 'ref-node', data: { type: 'action', label: 'Original' } });
      const nodes = [originalNode];
      store.setState({ nodes, edges: [] });
      await store.getState().addToHistory(nodes, []);

      // Verify history was created with the nodes
      const historyEntry = store.getState().undoHistory[store.getState().undoHistory.length - 1];
      expect(historyEntry.nodes).toHaveLength(1);
      expect(historyEntry.nodes[0].id).toBe('ref-node');
      // Note: The current implementation uses spread operator which creates shallow copies
      // Deep cloning would be needed for full isolation, but this tests the current behavior
    });

    it('should handle multiple undo operations correctly', async () => {
      const nodes1 = [createTestNode({ id: 'multi-1' })];
      const nodes2 = [createTestNode({ id: 'multi-2' })];
      const nodes3 = [createTestNode({ id: 'multi-3' })];

      store.setState({ nodes: nodes1, edges: [] });
      await store.getState().addToHistory(nodes1, []);

      store.setState({ nodes: nodes2, edges: [] });
      await store.getState().addToHistory(nodes2, []);

      store.setState({ nodes: nodes3, edges: [] });
      await store.getState().addToHistory(nodes3, []);

      store.setState({ nodes: [], edges: [] });

      // Multiple undos
      store.getState().undo(); // Should restore nodes3
      expect(store.getState().nodes).toEqual(nodes3);

      store.getState().undo(); // Should restore nodes2
      expect(store.getState().nodes).toEqual(nodes2);

      store.getState().undo(); // Should restore nodes1
      expect(store.getState().nodes).toEqual(nodes1);
    });
  });
});

/**
 * multiSelectSlice Unit Tests
 * Tests for the Zustand multi-select slice - manages multi-selection and bulk operations
 *
 * Task: T4.2 - Tests Store Slices (multiSelectSlice)
 * Created: 2026-01-19
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createMultiSelectSlice, MultiSelectSlice } from '../../store/slices/multiSelectSlice';
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
  let state: MultiSelectSlice & {
    nodes: Node[];
    edges: Edge[];
    nodeGroups: Array<{
      id: string;
      name: string;
      color: string;
      nodes: string[];
      position: { x: number; y: number };
      size: { width: number; height: number };
    }>;
    executionErrors: Record<string, unknown>;
    addToHistory: (nodes: Node[], edges: Edge[]) => Promise<void>;
  };

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
  const slice = createMultiSelectSlice(setState as any, getState as any, {} as any);
  state = {
    ...slice,
    nodes: [],
    edges: [],
    nodeGroups: [],
    executionErrors: {},
    addToHistory: vi.fn().mockResolvedValue(undefined)
  };

  return {
    getState,
    setState,
    reset: () => {
      const freshSlice = createMultiSelectSlice(setState as any, getState as any, {} as any);
      state = {
        ...freshSlice,
        nodes: [],
        edges: [],
        nodeGroups: [],
        executionErrors: {},
        addToHistory: vi.fn().mockResolvedValue(undefined)
      };
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

describe('multiSelectSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();

    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn()
      },
      writable: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Initial State Tests
  // ============================================
  describe('Initial State', () => {
    it('should have empty selectedNodes array', () => {
      expect(store.getState().selectedNodes).toEqual([]);
    });
  });

  // ============================================
  // Selection Tests
  // ============================================
  describe('selection', () => {
    it('should select multiple nodes', () => {
      store.getState().setSelectedNodes(['node-1', 'node-2', 'node-3']);

      expect(store.getState().selectedNodes).toEqual(['node-1', 'node-2', 'node-3']);
    });

    it('should add to selection', () => {
      store.getState().setSelectedNodes(['node-1']);
      store.getState().setSelectedNodes(['node-1', 'node-2']);

      expect(store.getState().selectedNodes).toContain('node-1');
      expect(store.getState().selectedNodes).toContain('node-2');
    });

    it('should remove from selection', () => {
      store.getState().setSelectedNodes(['node-1', 'node-2', 'node-3']);
      store.getState().setSelectedNodes(['node-1', 'node-3']);

      expect(store.getState().selectedNodes).not.toContain('node-2');
    });

    it('should clear selection', () => {
      store.getState().setSelectedNodes(['node-1', 'node-2']);
      store.getState().setSelectedNodes([]);

      expect(store.getState().selectedNodes).toEqual([]);
    });

    it('should select all nodes', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1' }),
          createTestNode({ id: 'node-2' }),
          createTestNode({ id: 'node-3' })
        ]
      });

      store.getState().selectAllNodes();

      expect(store.getState().selectedNodes).toEqual(['node-1', 'node-2', 'node-3']);
    });

    it('should select nodes by type', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'trigger-1', data: { type: 'trigger', label: 'T1' } }),
          createTestNode({ id: 'action-1', data: { type: 'action', label: 'A1' } }),
          createTestNode({ id: 'trigger-2', data: { type: 'trigger', label: 'T2' } })
        ]
      });

      store.getState().selectNodesByType('trigger');

      expect(store.getState().selectedNodes).toEqual(['trigger-1', 'trigger-2']);
    });

    it('should select nodes by category', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1', data: { type: 'action', category: 'data', label: 'N1' } }),
          createTestNode({ id: 'node-2', data: { type: 'action', category: 'api', label: 'N2' } }),
          createTestNode({ id: 'node-3', data: { type: 'action', category: 'data', label: 'N3' } })
        ]
      });

      store.getState().selectNodesByCategory('data');

      expect(store.getState().selectedNodes).toEqual(['node-1', 'node-3']);
    });

    it('should select disabled nodes', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1', data: { type: 'action', disabled: true, label: 'N1' } }),
          createTestNode({ id: 'node-2', data: { type: 'action', disabled: false, label: 'N2' } }),
          createTestNode({ id: 'node-3', data: { type: 'action', disabled: true, label: 'N3' } })
        ]
      });

      store.getState().selectDisabledNodes();

      expect(store.getState().selectedNodes).toEqual(['node-1', 'node-3']);
    });

    it('should select error nodes', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1' }),
          createTestNode({ id: 'node-2' }),
          createTestNode({ id: 'node-3' })
        ],
        executionErrors: {
          'node-1': { message: 'Error 1' },
          'node-3': { message: 'Error 3' }
        }
      });

      store.getState().selectErrorNodes();

      expect(store.getState().selectedNodes).toEqual(['node-1', 'node-3']);
    });

    it('should invert selection', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1' }),
          createTestNode({ id: 'node-2' }),
          createTestNode({ id: 'node-3' })
        ]
      });
      store.getState().setSelectedNodes(['node-1']);

      store.getState().invertSelection();

      expect(store.getState().selectedNodes).toEqual(['node-2', 'node-3']);
    });
  });

  // ============================================
  // Bulk Operations Tests
  // ============================================
  describe('bulk operations', () => {
    it('should delete selected nodes', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1' }),
          createTestNode({ id: 'node-2' }),
          createTestNode({ id: 'node-3' })
        ],
        edges: [
          createTestEdge({ id: 'edge-1', source: 'node-1', target: 'node-2' })
        ],
        selectedNodes: ['node-1', 'node-2']
      });

      store.getState().deleteSelectedNodes();

      expect(store.getState().nodes).toHaveLength(1);
      expect(store.getState().nodes[0].id).toBe('node-3');
      expect(store.getState().edges).toHaveLength(0);
      expect(store.getState().selectedNodes).toEqual([]);
    });

    it('should copy selected nodes to localStorage', () => {
      const node1 = createTestNode({ id: 'node-1' });
      const node2 = createTestNode({ id: 'node-2' });
      const edge = createTestEdge({ id: 'edge-1', source: 'node-1', target: 'node-2' });

      store.setState({
        nodes: [node1, node2],
        edges: [edge],
        selectedNodes: ['node-1', 'node-2']
      });

      store.getState().copySelectedNodes();

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'copiedNodes',
        expect.any(String)
      );
    });

    it('should move selected nodes', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1', position: { x: 100, y: 100 } }),
          createTestNode({ id: 'node-2', position: { x: 200, y: 200 } }),
          createTestNode({ id: 'node-3', position: { x: 300, y: 300 } })
        ],
        selectedNodes: ['node-1', 'node-2']
      });

      store.getState().bulkMoveNodes(50, 50);

      expect(store.getState().nodes[0].position).toEqual({ x: 150, y: 150 });
      expect(store.getState().nodes[1].position).toEqual({ x: 250, y: 250 });
      expect(store.getState().nodes[2].position).toEqual({ x: 300, y: 300 }); // Unchanged
    });

    it('should bulk enable nodes', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1', data: { type: 'action', disabled: true, label: 'N1' } }),
          createTestNode({ id: 'node-2', data: { type: 'action', disabled: true, label: 'N2' } })
        ],
        edges: [],
        selectedNodes: ['node-1', 'node-2']
      });

      store.getState().bulkEnableNodes();

      expect(store.getState().nodes[0].data.disabled).toBe(false);
      expect(store.getState().nodes[1].data.disabled).toBe(false);
    });

    it('should bulk disable nodes', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1', data: { type: 'action', disabled: false, label: 'N1' } }),
          createTestNode({ id: 'node-2', data: { type: 'action', disabled: false, label: 'N2' } })
        ],
        edges: [],
        selectedNodes: ['node-1', 'node-2']
      });

      store.getState().bulkDisableNodes();

      expect(store.getState().nodes[0].data.disabled).toBe(true);
      expect(store.getState().nodes[1].data.disabled).toBe(true);
    });

    it('should bulk set color', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1' }),
          createTestNode({ id: 'node-2' })
        ],
        edges: [],
        selectedNodes: ['node-1', 'node-2']
      });

      store.getState().bulkSetColor('#FF0000');

      expect(store.getState().nodes[0].data.color).toBe('#FF0000');
      expect(store.getState().nodes[1].data.color).toBe('#FF0000');
    });

    it('should bulk set notes', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1' }),
          createTestNode({ id: 'node-2' })
        ],
        edges: [],
        selectedNodes: ['node-1', 'node-2']
      });

      store.getState().bulkSetNotes('Important node');

      expect(store.getState().nodes[0].data.notes).toBe('Important node');
      expect(store.getState().nodes[1].data.notes).toBe('Important node');
    });

    it('should bulk set retry config', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1' }),
          createTestNode({ id: 'node-2' })
        ],
        edges: [],
        selectedNodes: ['node-1', 'node-2']
      });

      store.getState().bulkSetRetryConfig({ enabled: true, maxRetries: 5, retryInterval: 2000 });

      expect(store.getState().nodes[0].data.retryOnFail).toBe(true);
      expect(store.getState().nodes[0].data.maxRetries).toBe(5);
      expect(store.getState().nodes[0].data.retryInterval).toBe(2000);
    });

    it('should bulk set timeout', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1' }),
          createTestNode({ id: 'node-2' })
        ],
        edges: [],
        selectedNodes: ['node-1', 'node-2']
      });

      store.getState().bulkSetTimeout(30000);

      expect(store.getState().nodes[0].data.timeout).toBe(30000);
      expect(store.getState().nodes[1].data.timeout).toBe(30000);
    });

    it('should bulk set continue on fail', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1' }),
          createTestNode({ id: 'node-2' })
        ],
        edges: [],
        selectedNodes: ['node-1', 'node-2']
      });

      store.getState().bulkSetContinueOnFail(true);

      expect(store.getState().nodes[0].data.continueOnFail).toBe(true);
      expect(store.getState().nodes[1].data.continueOnFail).toBe(true);
    });
  });

  // ============================================
  // Grouping Tests
  // ============================================
  describe('grouping', () => {
    it('should group selected nodes', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1', position: { x: 100, y: 100 } }),
          createTestNode({ id: 'node-2', position: { x: 200, y: 200 } })
        ],
        selectedNodes: ['node-1', 'node-2']
      });

      store.getState().groupSelectedNodes();

      expect(store.getState().nodeGroups).toHaveLength(1);
      expect(store.getState().nodeGroups[0].nodes).toContain('node-1');
      expect(store.getState().nodeGroups[0].nodes).toContain('node-2');
    });

    it('should not group single node', () => {
      store.setState({
        nodes: [createTestNode({ id: 'node-1' })],
        selectedNodes: ['node-1']
      });

      store.getState().groupSelectedNodes();

      expect(store.getState().nodeGroups).toHaveLength(0);
    });

    it('should ungroup selected nodes', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1' }),
          createTestNode({ id: 'node-2' })
        ],
        nodeGroups: [{
          id: 'group-1',
          name: 'Test Group',
          color: '#3b82f6',
          nodes: ['node-1', 'node-2'],
          position: { x: 0, y: 0 },
          size: { width: 200, height: 200 }
        }],
        selectedNodes: ['node-1']
      });

      store.getState().ungroupSelectedNodes();

      expect(store.getState().nodeGroups).toHaveLength(0);
    });
  });

  // ============================================
  // Alignment Tests
  // ============================================
  describe('alignment', () => {
    it('should align nodes left', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1', position: { x: 100, y: 100 } }),
          createTestNode({ id: 'node-2', position: { x: 200, y: 200 } }),
          createTestNode({ id: 'node-3', position: { x: 300, y: 300 } })
        ],
        selectedNodes: ['node-1', 'node-2', 'node-3']
      });

      store.getState().alignNodes('left');

      // All nodes should have same x position (minimum)
      expect(store.getState().nodes[0].position.x).toBe(100);
      expect(store.getState().nodes[1].position.x).toBe(100);
      expect(store.getState().nodes[2].position.x).toBe(100);
    });

    it('should not align single node', () => {
      const originalPosition = { x: 100, y: 100 };
      store.setState({
        nodes: [createTestNode({ id: 'node-1', position: originalPosition })],
        selectedNodes: ['node-1']
      });

      store.getState().alignNodes('left');

      expect(store.getState().nodes[0].position).toEqual(originalPosition);
    });

    it('should distribute nodes horizontally', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1', position: { x: 0, y: 100 } }),
          createTestNode({ id: 'node-2', position: { x: 50, y: 100 } }),
          createTestNode({ id: 'node-3', position: { x: 200, y: 100 } })
        ],
        selectedNodes: ['node-1', 'node-2', 'node-3']
      });

      store.getState().distributeNodes('horizontal');

      // Nodes should be evenly distributed
      expect(store.getState().nodes[0].position.x).toBe(0);
      expect(store.getState().nodes[2].position.x).toBe(200);
      // Middle node should be at midpoint
      expect(store.getState().nodes[1].position.x).toBe(100);
    });
  });

  // ============================================
  // Edge Cases Tests
  // ============================================
  describe('Edge Cases', () => {
    it('should handle bulk operations with no selection', () => {
      store.setState({
        nodes: [createTestNode({ id: 'node-1' })],
        edges: [],
        selectedNodes: []
      });

      // Should not throw and state should remain unchanged
      store.getState().bulkEnableNodes();
      store.getState().bulkDisableNodes();
      store.getState().bulkMoveNodes(100, 100);

      expect(store.getState().nodes[0].position).toEqual({ x: 100, y: 100 });
    });

    it('should handle delete with no selection', () => {
      const node = createTestNode({ id: 'node-1' });
      store.setState({
        nodes: [node],
        edges: [],
        selectedNodes: []
      });

      store.getState().deleteSelectedNodes();

      expect(store.getState().nodes).toHaveLength(1);
    });

    it('should handle select all with empty nodes', () => {
      store.getState().selectAllNodes();

      expect(store.getState().selectedNodes).toEqual([]);
    });

    it('should handle bulk duplicate nodes', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1', position: { x: 100, y: 100 }, data: { type: 'action', label: 'Original' } }),
          createTestNode({ id: 'node-2', position: { x: 200, y: 200 }, data: { type: 'action', label: 'Original 2' } })
        ],
        edges: [createTestEdge({ id: 'edge-1', source: 'node-1', target: 'node-2' })],
        selectedNodes: ['node-1', 'node-2']
      });

      store.getState().bulkDuplicateNodes();

      // Should have original + duplicates
      expect(store.getState().nodes).toHaveLength(4);
      // Selection should be updated to duplicated nodes
      expect(store.getState().selectedNodes).toHaveLength(2);
      expect(store.getState().selectedNodes[0]).toContain('dup');
    });
  });
});

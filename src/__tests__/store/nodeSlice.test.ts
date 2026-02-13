/**
 * nodeSlice Unit Tests
 * Tests for the Zustand node slice - manages nodes, groups, and sticky notes
 *
 * Task: T2.3 - Tests Store Slices (nodeSlice)
 * Created: 2026-01-07
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createNodeSlice, Node, NodeGroup, StickyNote, NodesSlice } from '../../store/slices/nodeSlice';

// Mock external services
vi.mock('../../services/SimpleLogger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../../services/UpdateTimestampService', () => ({
  updateTimestampService: {
    updateTimestamp: vi.fn()
  }
}));

vi.mock('../../services/EventNotificationService', () => ({
  eventNotificationService: {
    emitEvent: vi.fn()
  }
}));

// Helper to create a minimal Zustand-like store for testing
function createTestStore() {
  let state: NodesSlice & { currentWorkflowId?: string };

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
  const slice = createNodeSlice(setState as any, getState as any, {} as any);
  state = { ...slice, currentWorkflowId: undefined };

  return {
    getState,
    setState,
    // Helper to reset state between tests
    reset: () => {
      const freshSlice = createNodeSlice(setState as any, getState as any, {} as any);
      state = { ...freshSlice, currentWorkflowId: undefined };
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

const createTestNodeGroup = (overrides: Partial<NodeGroup> = {}): NodeGroup => ({
  id: `group-${Date.now()}`,
  name: 'Test Group',
  color: '#3B82F6',
  nodes: [],
  position: { x: 0, y: 0 },
  size: { width: 200, height: 200 },
  ...overrides
});

const createTestStickyNote = (overrides: Partial<StickyNote> = {}): StickyNote => ({
  id: `note-${Date.now()}`,
  content: 'Test sticky note',
  color: '#FBBF24',
  position: { x: 50, y: 50 },
  ...overrides
});

describe('nodeSlice', () => {
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
    it('should have empty nodes array', () => {
      expect(store.getState().nodes).toEqual([]);
    });

    it('should have null selectedNode', () => {
      expect(store.getState().selectedNode).toBeNull();
    });

    it('should have empty nodeGroups array', () => {
      expect(store.getState().nodeGroups).toEqual([]);
    });

    it('should have empty stickyNotes array', () => {
      expect(store.getState().stickyNotes).toEqual([]);
    });

    it('should have empty nodeStats object', () => {
      expect(store.getState().nodeStats).toEqual({});
    });
  });

  // ============================================
  // Node CRUD Tests
  // ============================================
  describe('Node CRUD Operations', () => {
    describe('setNodes', () => {
      it('should set nodes array', () => {
        const nodes = [createTestNode({ id: 'node-1' }), createTestNode({ id: 'node-2' })];
        store.getState().setNodes(nodes);

        expect(store.getState().nodes).toHaveLength(2);
        expect(store.getState().nodes[0].id).toBe('node-1');
        expect(store.getState().nodes[1].id).toBe('node-2');
      });

      it('should replace existing nodes', () => {
        store.getState().setNodes([createTestNode({ id: 'old-node' })]);
        store.getState().setNodes([createTestNode({ id: 'new-node' })]);

        expect(store.getState().nodes).toHaveLength(1);
        expect(store.getState().nodes[0].id).toBe('new-node');
      });

      it('should handle empty array', () => {
        store.getState().setNodes([createTestNode()]);
        store.getState().setNodes([]);

        expect(store.getState().nodes).toEqual([]);
      });
    });

    describe('addNode', () => {
      it('should add a valid node', () => {
        const node = createTestNode({ id: 'test-node-1' });
        store.getState().addNode(node);

        expect(store.getState().nodes).toHaveLength(1);
        expect(store.getState().nodes[0]).toEqual(node);
      });

      it('should update nodeStats when adding node', () => {
        const node = createTestNode({
          id: 'action-node',
          data: { type: 'action', label: 'Action' }
        });
        store.getState().addNode(node);

        expect(store.getState().nodeStats['action']).toBe(1);
      });

      it('should increment nodeStats for same type', () => {
        store.getState().addNode(createTestNode({
          id: 'node-1',
          data: { type: 'trigger', label: 'T1' }
        }));
        store.getState().addNode(createTestNode({
          id: 'node-2',
          data: { type: 'trigger', label: 'T2' }
        }));

        expect(store.getState().nodeStats['trigger']).toBe(2);
      });

      it('should throw error for duplicate node ID', () => {
        const node = createTestNode({ id: 'duplicate-id' });
        store.getState().addNode(node);

        expect(() => store.getState().addNode(node)).toThrow('Node with ID duplicate-id already exists');
      });

      it('should throw error for node without ID', () => {
        const invalidNode = { position: { x: 0, y: 0 }, data: {} } as Node;
        expect(() => store.getState().addNode(invalidNode)).toThrow('Invalid node data');
      });

      it('should throw error for node without data', () => {
        const invalidNode = { id: 'no-data', position: { x: 0, y: 0 } } as Node;
        expect(() => store.getState().addNode(invalidNode)).toThrow('Invalid node data');
      });
    });

    describe('updateNode', () => {
      it('should update node data', () => {
        const node = createTestNode({ id: 'update-test' });
        store.getState().addNode(node);

        store.getState().updateNode('update-test', { label: 'Updated Label' });

        const updatedNode = store.getState().nodes[0];
        expect(updatedNode.data.label).toBe('Updated Label');
      });

      it('should preserve existing data when updating', () => {
        const node = createTestNode({
          id: 'preserve-test',
          data: { type: 'action', label: 'Original', config: { setting: true } }
        });
        store.getState().addNode(node);

        store.getState().updateNode('preserve-test', { label: 'Updated' });

        const updatedNode = store.getState().nodes[0];
        expect(updatedNode.data.type).toBe('action');
        expect(updatedNode.data.config).toEqual({ setting: true });
      });

      it('should throw error for non-existent node', () => {
        expect(() => store.getState().updateNode('non-existent', { label: 'Test' }))
          .toThrow('Node with ID non-existent not found');
      });

      it('should throw error when ID is empty', () => {
        expect(() => store.getState().updateNode('', { label: 'Test' }))
          .toThrow('Node ID is required for update');
      });
    });

    describe('deleteNode', () => {
      it('should delete existing node', () => {
        store.getState().addNode(createTestNode({ id: 'to-delete' }));
        expect(store.getState().nodes).toHaveLength(1);

        store.getState().deleteNode('to-delete');

        expect(store.getState().nodes).toHaveLength(0);
      });

      it('should clear selectedNode if deleted', () => {
        const node = createTestNode({ id: 'selected-delete' });
        store.getState().addNode(node);
        store.getState().setSelectedNode(node);

        store.getState().deleteNode('selected-delete');

        expect(store.getState().selectedNode).toBeNull();
      });

      it('should preserve selectedNode if different node deleted', () => {
        const node1 = createTestNode({ id: 'keep-selected' });
        const node2 = createTestNode({ id: 'delete-other' });
        store.getState().addNode(node1);
        store.getState().addNode(node2);
        store.getState().setSelectedNode(node1);

        store.getState().deleteNode('delete-other');

        expect(store.getState().selectedNode?.id).toBe('keep-selected');
      });

      it('should throw error for non-existent node', () => {
        expect(() => store.getState().deleteNode('non-existent'))
          .toThrow('Node with ID non-existent not found');
      });

      it('should throw error when ID is empty', () => {
        expect(() => store.getState().deleteNode(''))
          .toThrow('Node ID is required for deletion');
      });
    });

    describe('duplicateNode', () => {
      it('should create a copy of the node', () => {
        const original = createTestNode({
          id: 'original',
          position: { x: 100, y: 100 },
          data: { type: 'action', label: 'Original Node' }
        });
        store.getState().addNode(original);

        store.getState().duplicateNode('original');

        expect(store.getState().nodes).toHaveLength(2);
      });

      it('should offset position of duplicated node', () => {
        const original = createTestNode({
          id: 'original',
          position: { x: 100, y: 100 }
        });
        store.getState().addNode(original);

        store.getState().duplicateNode('original');

        const duplicate = store.getState().nodes[1];
        expect(duplicate.position.x).toBe(150);
        expect(duplicate.position.y).toBe(150);
      });

      it('should append (Copy) to label', () => {
        const original = createTestNode({
          id: 'original',
          data: { type: 'action', label: 'My Node' }
        });
        store.getState().addNode(original);

        store.getState().duplicateNode('original');

        const duplicate = store.getState().nodes[1];
        expect(duplicate.data.label).toBe('My Node (Copy)');
      });

      it('should generate unique ID for duplicate', () => {
        const original = createTestNode({ id: 'original' });
        store.getState().addNode(original);

        store.getState().duplicateNode('original');

        const duplicate = store.getState().nodes[1];
        expect(duplicate.id).not.toBe('original');
        expect(duplicate.id).toContain('original_copy_');
      });

      it('should do nothing if node does not exist', () => {
        store.getState().duplicateNode('non-existent');
        expect(store.getState().nodes).toHaveLength(0);
      });
    });

    describe('setSelectedNode', () => {
      it('should set selected node', () => {
        const node = createTestNode({ id: 'select-me' });
        store.getState().addNode(node);

        store.getState().setSelectedNode(node);

        expect(store.getState().selectedNode).toEqual(node);
      });

      it('should clear selected node with null', () => {
        const node = createTestNode();
        store.getState().addNode(node);
        store.getState().setSelectedNode(node);

        store.getState().setSelectedNode(null);

        expect(store.getState().selectedNode).toBeNull();
      });
    });

    describe('updateNodePosition', () => {
      it('should update node position', () => {
        const node = createTestNode({ id: 'move-me', position: { x: 0, y: 0 } });
        store.getState().addNode(node);

        store.getState().updateNodePosition('move-me', { x: 200, y: 300 });

        const updatedNode = store.getState().nodes[0];
        expect(updatedNode.position).toEqual({ x: 200, y: 300 });
      });

      it('should only update matching node', () => {
        store.getState().addNode(createTestNode({ id: 'node-1', position: { x: 0, y: 0 } }));
        store.getState().addNode(createTestNode({ id: 'node-2', position: { x: 50, y: 50 } }));

        store.getState().updateNodePosition('node-1', { x: 100, y: 100 });

        expect(store.getState().nodes[0].position).toEqual({ x: 100, y: 100 });
        expect(store.getState().nodes[1].position).toEqual({ x: 50, y: 50 });
      });
    });

    describe('updateNodeConfig', () => {
      beforeEach(() => {
        // Mock fetch for updateNodeConfig
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({})
        });

        // Mock localStorage
        global.localStorage = {
          getItem: vi.fn().mockReturnValue('test-token'),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
          length: 0,
          key: vi.fn()
        };
      });

      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('should update node config', async () => {
        const node = createTestNode({
          id: 'config-node',
          data: { type: 'action', config: { old: true } }
        });
        store.getState().addNode(node);

        await store.getState().updateNodeConfig('config-node', { new: true });

        const updatedNode = store.getState().nodes[0];
        expect(updatedNode.data.config).toEqual({ new: true });
      });

      it('should call updateTimestampService', async () => {
        const { updateTimestampService } = await import('../../services/UpdateTimestampService');

        const node = createTestNode({ id: 'timestamp-node' });
        store.getState().addNode(node);

        await store.getState().updateNodeConfig('timestamp-node', { setting: true });

        expect(updateTimestampService.updateTimestamp).toHaveBeenCalledWith(
          'node_config',
          'updated',
          { nodeId: 'timestamp-node' }
        );
      });

      it('should emit event notification', async () => {
        const { eventNotificationService } = await import('../../services/EventNotificationService');

        const node = createTestNode({ id: 'event-node' });
        store.getState().addNode(node);

        const config = { newSetting: 'value' };
        await store.getState().updateNodeConfig('event-node', config);

        expect(eventNotificationService.emitEvent).toHaveBeenCalledWith(
          'node_configuration_updated',
          { nodeId: 'event-node', config },
          'workflow_store'
        );
      });
    });
  });

  // ============================================
  // Node Groups Tests
  // ============================================
  describe('Node Groups', () => {
    describe('addNodeGroup', () => {
      it('should add a node group', () => {
        const group = createTestNodeGroup({ id: 'group-1' });
        store.getState().addNodeGroup(group);

        expect(store.getState().nodeGroups).toHaveLength(1);
        expect(store.getState().nodeGroups[0]).toEqual(group);
      });

      it('should add multiple groups', () => {
        store.getState().addNodeGroup(createTestNodeGroup({ id: 'group-1' }));
        store.getState().addNodeGroup(createTestNodeGroup({ id: 'group-2' }));

        expect(store.getState().nodeGroups).toHaveLength(2);
      });
    });

    describe('updateNodeGroup', () => {
      it('should update group properties', () => {
        const group = createTestNodeGroup({ id: 'update-group', name: 'Original' });
        store.getState().addNodeGroup(group);

        store.getState().updateNodeGroup('update-group', { name: 'Updated Name' });

        expect(store.getState().nodeGroups[0].name).toBe('Updated Name');
      });

      it('should update group nodes array', () => {
        const group = createTestNodeGroup({ id: 'nodes-group', nodes: [] });
        store.getState().addNodeGroup(group);

        store.getState().updateNodeGroup('nodes-group', { nodes: ['node-1', 'node-2'] });

        expect(store.getState().nodeGroups[0].nodes).toEqual(['node-1', 'node-2']);
      });

      it('should preserve other properties when updating', () => {
        const group = createTestNodeGroup({
          id: 'preserve-group',
          name: 'Original',
          color: '#FF0000'
        });
        store.getState().addNodeGroup(group);

        store.getState().updateNodeGroup('preserve-group', { name: 'New Name' });

        expect(store.getState().nodeGroups[0].color).toBe('#FF0000');
      });

      it('should not modify other groups', () => {
        store.getState().addNodeGroup(createTestNodeGroup({ id: 'group-1', name: 'First' }));
        store.getState().addNodeGroup(createTestNodeGroup({ id: 'group-2', name: 'Second' }));

        store.getState().updateNodeGroup('group-1', { name: 'Updated First' });

        expect(store.getState().nodeGroups[1].name).toBe('Second');
      });
    });

    describe('deleteNodeGroup', () => {
      it('should delete a group', () => {
        store.getState().addNodeGroup(createTestNodeGroup({ id: 'delete-group' }));
        expect(store.getState().nodeGroups).toHaveLength(1);

        store.getState().deleteNodeGroup('delete-group');

        expect(store.getState().nodeGroups).toHaveLength(0);
      });

      it('should only delete matching group', () => {
        store.getState().addNodeGroup(createTestNodeGroup({ id: 'keep-group' }));
        store.getState().addNodeGroup(createTestNodeGroup({ id: 'delete-group' }));

        store.getState().deleteNodeGroup('delete-group');

        expect(store.getState().nodeGroups).toHaveLength(1);
        expect(store.getState().nodeGroups[0].id).toBe('keep-group');
      });
    });
  });

  // ============================================
  // Sticky Notes Tests
  // ============================================
  describe('Sticky Notes', () => {
    describe('addStickyNote', () => {
      it('should add a sticky note', () => {
        const note = createTestStickyNote({ id: 'note-1' });
        store.getState().addStickyNote(note);

        expect(store.getState().stickyNotes).toHaveLength(1);
        expect(store.getState().stickyNotes[0]).toEqual(note);
      });

      it('should add multiple notes', () => {
        store.getState().addStickyNote(createTestStickyNote({ id: 'note-1' }));
        store.getState().addStickyNote(createTestStickyNote({ id: 'note-2' }));

        expect(store.getState().stickyNotes).toHaveLength(2);
      });
    });

    describe('updateStickyNote', () => {
      it('should update note content', () => {
        const note = createTestStickyNote({ id: 'update-note', content: 'Original' });
        store.getState().addStickyNote(note);

        store.getState().updateStickyNote('update-note', { content: 'Updated content' });

        expect(store.getState().stickyNotes[0].content).toBe('Updated content');
      });

      it('should update note color', () => {
        const note = createTestStickyNote({ id: 'color-note', color: '#FBBF24' });
        store.getState().addStickyNote(note);

        store.getState().updateStickyNote('color-note', { color: '#EF4444' });

        expect(store.getState().stickyNotes[0].color).toBe('#EF4444');
      });

      it('should update note position', () => {
        const note = createTestStickyNote({ id: 'move-note', position: { x: 0, y: 0 } });
        store.getState().addStickyNote(note);

        store.getState().updateStickyNote('move-note', { position: { x: 100, y: 100 } });

        expect(store.getState().stickyNotes[0].position).toEqual({ x: 100, y: 100 });
      });

      it('should handle anti-overlap when updating position', () => {
        // Add first note
        store.getState().addStickyNote(createTestStickyNote({
          id: 'fixed-note',
          position: { x: 100, y: 100 }
        }));

        // Add second note at different position
        store.getState().addStickyNote(createTestStickyNote({
          id: 'moving-note',
          position: { x: 0, y: 0 }
        }));

        // Try to move second note to overlap with first (within 200x100 area)
        store.getState().updateStickyNote('moving-note', { position: { x: 100, y: 100 } });

        // Should be offset to avoid overlap
        const movedNote = store.getState().stickyNotes.find(n => n.id === 'moving-note');
        expect(movedNote?.position.x).toBeGreaterThan(100);
        expect(movedNote?.position.y).toBeGreaterThan(100);
      });

      it('should preserve other properties when updating', () => {
        const note = createTestStickyNote({
          id: 'preserve-note',
          content: 'Original',
          color: '#FBBF24',
          author: 'Test User'
        });
        store.getState().addStickyNote(note);

        store.getState().updateStickyNote('preserve-note', { content: 'New Content' });

        expect(store.getState().stickyNotes[0].color).toBe('#FBBF24');
        expect(store.getState().stickyNotes[0].author).toBe('Test User');
      });
    });

    describe('deleteStickyNote', () => {
      it('should delete a sticky note', () => {
        store.getState().addStickyNote(createTestStickyNote({ id: 'delete-note' }));
        expect(store.getState().stickyNotes).toHaveLength(1);

        store.getState().deleteStickyNote('delete-note');

        expect(store.getState().stickyNotes).toHaveLength(0);
      });

      it('should only delete matching note', () => {
        store.getState().addStickyNote(createTestStickyNote({ id: 'keep-note' }));
        store.getState().addStickyNote(createTestStickyNote({ id: 'delete-note' }));

        store.getState().deleteStickyNote('delete-note');

        expect(store.getState().stickyNotes).toHaveLength(1);
        expect(store.getState().stickyNotes[0].id).toBe('keep-note');
      });
    });
  });

  // ============================================
  // Utility Functions Tests
  // ============================================
  describe('Utility Functions', () => {
    describe('getNodeById', () => {
      it('should return node by ID', () => {
        const node = createTestNode({ id: 'find-me' });
        store.getState().addNode(node);

        const found = store.getState().getNodeById('find-me');

        expect(found).toEqual(node);
      });

      it('should return undefined for non-existent ID', () => {
        const found = store.getState().getNodeById('non-existent');
        expect(found).toBeUndefined();
      });

      it('should find node among multiple nodes', () => {
        store.getState().addNode(createTestNode({ id: 'node-1' }));
        store.getState().addNode(createTestNode({ id: 'node-2' }));
        store.getState().addNode(createTestNode({ id: 'node-3' }));

        const found = store.getState().getNodeById('node-2');

        expect(found?.id).toBe('node-2');
      });
    });

    describe('getNodesByType', () => {
      it('should return all nodes of a type', () => {
        store.getState().addNode(createTestNode({
          id: 'trigger-1',
          data: { type: 'trigger', label: 'T1' }
        }));
        store.getState().addNode(createTestNode({
          id: 'action-1',
          data: { type: 'action', label: 'A1' }
        }));
        store.getState().addNode(createTestNode({
          id: 'trigger-2',
          data: { type: 'trigger', label: 'T2' }
        }));

        const triggers = store.getState().getNodesByType('trigger');

        expect(triggers).toHaveLength(2);
        expect(triggers.every(n => n.data.type === 'trigger')).toBe(true);
      });

      it('should return empty array for non-existent type', () => {
        store.getState().addNode(createTestNode({
          id: 'node-1',
          data: { type: 'action', label: 'A1' }
        }));

        const found = store.getState().getNodesByType('non-existent');

        expect(found).toEqual([]);
      });

      it('should return empty array when no nodes exist', () => {
        const found = store.getState().getNodesByType('trigger');
        expect(found).toEqual([]);
      });
    });
  });

  // ============================================
  // Edge Cases and Integration Tests
  // ============================================
  describe('Edge Cases', () => {
    it('should handle rapid node additions', () => {
      for (let i = 0; i < 100; i++) {
        store.getState().addNode(createTestNode({
          id: `rapid-node-${i}`,
          data: { type: 'action', label: `Node ${i}` }
        }));
      }

      expect(store.getState().nodes).toHaveLength(100);
      expect(store.getState().nodeStats['action']).toBe(100);
    });

    it('should handle node with complex nested data', () => {
      const complexNode = createTestNode({
        id: 'complex-node',
        data: {
          type: 'complex',
          label: 'Complex Node',
          config: {
            nested: {
              deep: {
                value: 'test'
              }
            },
            array: [1, 2, 3],
            boolean: true
          }
        }
      });

      store.getState().addNode(complexNode);

      const retrieved = store.getState().getNodeById('complex-node');
      expect((retrieved?.data.config as any)?.nested?.deep?.value).toBe('test');
    });

    it('should maintain node order after operations', () => {
      store.getState().addNode(createTestNode({ id: 'first' }));
      store.getState().addNode(createTestNode({ id: 'second' }));
      store.getState().addNode(createTestNode({ id: 'third' }));

      store.getState().updateNode('second', { label: 'Updated Second' });

      expect(store.getState().nodes[0].id).toBe('first');
      expect(store.getState().nodes[1].id).toBe('second');
      expect(store.getState().nodes[2].id).toBe('third');
    });

    it('should handle special characters in node IDs', () => {
      const specialId = 'node-with_special.chars:123';
      store.getState().addNode(createTestNode({ id: specialId }));

      const found = store.getState().getNodeById(specialId);
      expect(found?.id).toBe(specialId);
    });

    it('should handle empty string label', () => {
      const node = createTestNode({
        id: 'empty-label',
        data: { type: 'action', label: '' }
      });
      store.getState().addNode(node);

      const retrieved = store.getState().getNodeById('empty-label');
      expect(retrieved?.data.label).toBe('');
    });
  });
});

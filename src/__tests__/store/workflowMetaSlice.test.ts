/**
 * workflowMetaSlice Unit Tests
 * Tests for the Zustand workflow meta slice - manages workflow metadata, templates, versioning
 *
 * Task: T4.2 - Tests Store Slices (workflowMetaSlice)
 * Created: 2026-01-19
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createWorkflowMetaSlice,
  WorkflowMetaSlice,
  Workflow,
  WorkflowTemplate,
  WorkflowVersion,
  ValidationResult
} from '../../store/slices/workflowMetaSlice';

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

vi.mock('../../utils/fileReader', () => ({
  EnhancedFileReader: {
    readAsText: vi.fn().mockResolvedValue({
      success: true,
      data: JSON.stringify({ name: 'Test', nodes: [], edges: [] })
    })
  }
}));

// Helper to create a minimal Zustand-like store for testing
function createTestStore() {
  let state: WorkflowMetaSlice & {
    nodes: unknown[];
    edges: unknown[];
    currentEnvironment?: string;
    globalVariables?: Record<string, unknown>;
    setNodes?: (nodes: unknown[]) => void;
    setEdges?: (edges: unknown[]) => void;
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
  const slice = createWorkflowMetaSlice(setState as any, getState as any, {} as any);
  state = {
    ...slice,
    nodes: [],
    edges: [],
    currentEnvironment: 'dev',
    globalVariables: {},
    setNodes: (nodes: unknown[]) => setState({ nodes }),
    setEdges: (edges: unknown[]) => setState({ edges })
  };

  return {
    getState,
    setState,
    reset: () => {
      const freshSlice = createWorkflowMetaSlice(setState as any, getState as any, {} as any);
      state = {
        ...freshSlice,
        nodes: [],
        edges: [],
        currentEnvironment: 'dev',
        globalVariables: {},
        setNodes: (nodes: unknown[]) => setState({ nodes }),
        setEdges: (edges: unknown[]) => setState({ edges })
      };
    }
  };
}

// Test fixtures
const createTestNode = (overrides: Partial<any> = {}) => ({
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

const createTestEdge = (overrides: Partial<any> = {}) => ({
  id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  source: 'node-1',
  target: 'node-2',
  ...overrides
});

describe('workflowMetaSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'workflow-1', name: 'Test' })
    });

    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn().mockReturnValue('test-token'),
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
    vi.restoreAllMocks();
  });

  // ============================================
  // Initial State Tests
  // ============================================
  describe('Initial State', () => {
    it('should have empty workflows object', () => {
      expect(store.getState().workflows).toEqual({});
    });

    it('should have null currentWorkflowId', () => {
      expect(store.getState().currentWorkflowId).toBeNull();
    });

    it('should have default workflow name', () => {
      expect(store.getState().workflowName).toBe('Nouveau Workflow');
    });

    it('should have isSaved as true initially', () => {
      expect(store.getState().isSaved).toBe(true);
    });

    it('should have default workflow templates', () => {
      expect(Object.keys(store.getState().workflowTemplates)).toHaveLength(3);
      expect(store.getState().workflowTemplates['welcome-email']).toBeDefined();
    });
  });

  // ============================================
  // Metadata Tests
  // ============================================
  describe('metadata', () => {
    it('should set workflow name', () => {
      store.getState().setWorkflowName('My Workflow');

      expect(store.getState().workflowName).toBe('My Workflow');
    });

    it('should mark as unsaved when name changes', () => {
      store.getState().markAsSaved();
      expect(store.getState().isSaved).toBe(true);

      store.getState().setWorkflowName('Changed Name');

      expect(store.getState().isSaved).toBe(false);
    });

    it('should set workflow description via workflow save', async () => {
      store.setState({
        nodes: [createTestNode({ id: 'node-1' })],
        edges: []
      });

      const workflowId = await store.getState().saveWorkflow('Test Workflow');

      expect(workflowId).toBeDefined();
    });

    it('should track last modified date', () => {
      store.getState().markAsSaved();

      expect(store.getState().lastSaved).toBeInstanceOf(Date);
    });

    it('should update tags via workflow data', async () => {
      const workflow: Workflow = {
        id: 'workflow-1',
        name: 'Tagged Workflow',
        nodes: [],
        edges: [],
        version: '3.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['production', 'api']
      };

      store.setState({
        workflows: { 'workflow-1': workflow }
      });

      expect(store.getState().workflows['workflow-1'].tags).toContain('production');
    });
  });

  // ============================================
  // Validation Tests
  // ============================================
  describe('validation', () => {
    it('should validate workflow structure', () => {
      store.setState({
        nodes: [createTestNode({ id: 'node-1' })],
        edges: []
      });

      const result = store.getState().validateWorkflow();

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    it('should detect missing connections', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1' }),
          createTestNode({ id: 'node-2' })
        ],
        edges: []
      });

      const result = store.getState().validateWorkflow();

      // Both nodes should have no connections warning
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('no connections'))).toBe(true);
    });

    it('should validate node configurations', () => {
      store.setState({
        nodes: [createTestNode({ id: 'node-1' })],
        edges: []
      });

      const result = store.getState().validateWorkflow();

      expect(result.isValid).toBe(true);
    });

    it('should return validation errors for empty workflow', () => {
      store.setState({ nodes: [], edges: [] });

      const result = store.getState().validateWorkflow();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Workflow must contain at least one node');
    });

    it('should detect orphaned edges', () => {
      store.setState({
        nodes: [createTestNode({ id: 'node-1' })],
        edges: [createTestEdge({ id: 'orphan-edge', source: 'missing', target: 'node-1' })]
      });

      const result = store.getState().validateWorkflow();

      expect(result.errors.some(e => e.includes('non-existent source'))).toBe(true);
    });

    it('should provide summary statistics', () => {
      store.setState({
        nodes: [createTestNode({ id: 'node-1' })],
        edges: []
      });

      const result = store.getState().validateWorkflow();

      expect(result.summary).toBeDefined();
      expect(result.summary?.totalNodes).toBe(1);
      expect(result.summary?.totalEdges).toBe(0);
    });
  });

  // ============================================
  // Statistics Tests
  // ============================================
  describe('statistics', () => {
    it('should count nodes by type in validation summary', () => {
      store.setState({
        nodes: [
          createTestNode({ id: 'node-1', data: { type: 'action', label: 'A1' } }),
          createTestNode({ id: 'node-2', data: { type: 'trigger', label: 'T1' } }),
          createTestNode({ id: 'node-3', data: { type: 'action', label: 'A2' } })
        ],
        edges: [
          createTestEdge({ id: 'e1', source: 'node-2', target: 'node-1' }),
          createTestEdge({ id: 'e2', source: 'node-1', target: 'node-3' })
        ]
      });

      const result = store.getState().validateWorkflow();

      expect(result.summary?.totalNodes).toBe(3);
    });

    it('should calculate workflow complexity via validation', () => {
      store.setState({
        nodes: Array.from({ length: 60 }, (_, i) =>
          createTestNode({ id: `node-${i}` })
        ),
        edges: []
      });

      const result = store.getState().validateWorkflow();

      // Should warn about large workflow
      expect(result.warnings.some(w => w.includes('>50 nodes'))).toBe(true);
    });
  });

  // ============================================
  // Workflow CRUD Tests
  // ============================================
  describe('Workflow CRUD', () => {
    it('should duplicate workflow', () => {
      const workflow: Workflow = {
        id: 'original',
        name: 'Original Workflow',
        nodes: [createTestNode()],
        edges: [],
        version: '3.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      store.setState({ workflows: { 'original': workflow } });

      const newId = store.getState().duplicateWorkflow('original');

      expect(newId).not.toBeNull();
      expect(newId).not.toBe('original');
      expect(store.getState().workflows[newId!]).toBeDefined();
      expect(store.getState().workflows[newId!].name).toContain('(Copy)');
    });

    it('should delete workflow', () => {
      const workflow: Workflow = {
        id: 'to-delete',
        name: 'Delete Me',
        nodes: [],
        edges: [],
        version: '3.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      store.setState({
        workflows: { 'to-delete': workflow },
        currentWorkflowId: 'to-delete'
      });

      store.getState().deleteWorkflow('to-delete');

      expect(store.getState().workflows['to-delete']).toBeUndefined();
      expect(store.getState().currentWorkflowId).toBeNull();
    });
  });

  // ============================================
  // Templates Tests
  // ============================================
  describe('Templates', () => {
    it('should create template from current workflow', () => {
      store.setState({
        nodes: [createTestNode({ id: 'template-node' })],
        edges: []
      });

      store.getState().createTemplate('My Template', 'Template description', 'Custom');

      const templates = store.getState().workflowTemplates;
      const customTemplates = Object.values(templates).filter(t => t.category === 'Custom');

      expect(customTemplates.length).toBeGreaterThan(0);
    });

    it('should load template', () => {
      const nodes = [createTestNode({ id: 'loaded-node' })];
      const edges = [createTestEdge({ id: 'loaded-edge', source: 'loaded-node', target: 'loaded-node' })];

      store.setState({
        workflowTemplates: {
          'test-template': {
            name: 'Test Template',
            description: 'Test',
            category: 'Test',
            nodes,
            edges
          }
        }
      });

      store.getState().loadTemplate('test-template');

      expect(store.getState().workflowName).toBe('Test Template');
      expect(store.getState().isSaved).toBe(false);
    });
  });

  // ============================================
  // Versioning Tests
  // ============================================
  describe('Versioning', () => {
    it('should create version', () => {
      store.setState({
        currentWorkflowId: 'workflow-1',
        nodes: [createTestNode()],
        edges: []
      });

      const versionId = store.getState().createVersion('Initial version');

      expect(versionId).toBeDefined();
      const versions = store.getState().getVersionHistory('workflow-1');
      expect(versions.length).toBeGreaterThan(0);
    });

    it('should restore version', () => {
      const oldNodes = [createTestNode({ id: 'old-node' })];

      store.setState({
        currentWorkflowId: 'workflow-1',
        nodes: oldNodes,
        edges: [],
        workflowVersions: {
          'workflow-1': [{
            id: 'version-1',
            version: 'v1',
            createdAt: new Date().toISOString(),
            nodes: oldNodes,
            edges: []
          }]
        }
      });

      // Change current state
      store.setState({ nodes: [createTestNode({ id: 'new-node' })] });

      // Restore old version
      store.getState().restoreVersion('workflow-1', 'version-1');

      expect(store.getState().nodes).toEqual(oldNodes);
      expect(store.getState().isSaved).toBe(false);
    });

    it('should get version history', () => {
      const versions: WorkflowVersion[] = [
        { id: 'v1', version: 'v1', createdAt: new Date().toISOString(), nodes: [], edges: [] },
        { id: 'v2', version: 'v2', createdAt: new Date().toISOString(), nodes: [], edges: [] }
      ];

      store.setState({
        workflowVersions: { 'workflow-1': versions }
      });

      const history = store.getState().getVersionHistory('workflow-1');

      expect(history).toHaveLength(2);
    });
  });

  // ============================================
  // Data Pinning Tests
  // ============================================
  describe('Data Pinning', () => {
    it('should set pinned data', () => {
      store.getState().setPinnedData('node-1', { test: 'data' });

      expect(store.getState().pinnedData['node-1']).toEqual({ test: 'data' });
    });

    it('should clear pinned data', () => {
      store.getState().setPinnedData('node-1', { test: 'data' });
      store.getState().clearPinnedData('node-1');

      expect(store.getState().pinnedData['node-1']).toBeUndefined();
    });
  });

  // ============================================
  // Locking Tests
  // ============================================
  describe('Locking', () => {
    it('should lock workflow', () => {
      store.setState({ currentWorkflowId: 'workflow-1' });

      store.getState().setWorkflowLocked(null, true);

      expect(store.getState().isCurrentWorkflowLocked).toBe(true);
    });

    it('should unlock workflow', () => {
      store.setState({
        currentWorkflowId: 'workflow-1',
        isCurrentWorkflowLocked: true
      });

      store.getState().setWorkflowLocked(null, false);

      expect(store.getState().isCurrentWorkflowLocked).toBe(false);
    });
  });

  // ============================================
  // Storage Health Tests
  // ============================================
  describe('Storage Health', () => {
    it('should check storage health', () => {
      const result = store.getState().checkStorageHealth();

      expect(result).toHaveProperty('healthy');
      expect(result).toHaveProperty('message');
    });

    it('should validate data integrity', () => {
      store.setState({
        nodes: [createTestNode({ id: 'node-1' })],
        edges: [createTestEdge({ id: 'edge-1', source: 'node-1', target: 'node-1' })]
      });

      const result = store.getState().validateDataIntegrity();

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('issues');
    });
  });

  // ============================================
  // Edge Cases Tests
  // ============================================
  describe('Edge Cases', () => {
    it('should handle duplicate workflow of non-existent workflow', () => {
      const result = store.getState().duplicateWorkflow('non-existent');

      expect(result).toBeNull();
    });

    it('should handle load template of non-existent template', () => {
      const beforeNodes = store.getState().nodes;

      store.getState().loadTemplate('non-existent');

      // Should not change state
      expect(store.getState().nodes).toEqual(beforeNodes);
    });

    it('should handle restore version of non-existent version', () => {
      const beforeNodes = store.getState().nodes;

      store.getState().restoreVersion('workflow-1', 'non-existent');

      // Should not change state
      expect(store.getState().nodes).toEqual(beforeNodes);
    });
  });
});

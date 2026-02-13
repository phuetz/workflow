/**
 * Comprehensive Git/Versioning Tests
 * Tests for DiffGenerator, WorkflowSync, BranchManager patterns
 * WITHOUT MOCKS - Testing actual implementations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DiffGenerator, getDiffGenerator } from '../git/DiffGenerator';
import type { WorkflowData } from '../git/WorkflowSync';

// ============================================================================
// Test Data Factories
// ============================================================================

function createWorkflowData(overrides: Partial<WorkflowData> = {}): WorkflowData {
  return {
    id: `workflow_${Date.now()}`,
    name: 'Test Workflow',
    nodes: [],
    edges: [],
    settings: {},
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createNode(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const id = overrides.id || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    type: 'action',
    name: 'Test Node',
    position: { x: 0, y: 0 },
    data: {},
    ...overrides,
  };
}

function createEdge(source: string, target: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: `edge_${source}_${target}`,
    source,
    target,
    ...overrides,
  };
}

// ============================================================================
// DiffGenerator Tests
// ============================================================================

describe('DiffGenerator', () => {
  let diffGenerator: DiffGenerator;

  beforeEach(() => {
    diffGenerator = new DiffGenerator();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance from getDiffGenerator', () => {
      const instance1 = getDiffGenerator();
      const instance2 = getDiffGenerator();

      expect(instance1).toBe(instance2);
    });
  });

  describe('generateWorkflowDiff', () => {
    it('should detect no changes between identical workflows', async () => {
      const workflow = createWorkflowData({
        nodes: [createNode({ id: 'node1', name: 'Node 1' }) as any],
        edges: [],
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflow, workflow);

      expect(diff.summary.totalChanges).toBe(0);
      expect(diff.visualDiff.nodesAdded.length).toBe(0);
      expect(diff.visualDiff.nodesModified.length).toBe(0);
      expect(diff.visualDiff.nodesDeleted.length).toBe(0);
    });

    it('should detect added nodes', async () => {
      const workflowA = createWorkflowData({
        nodes: [createNode({ id: 'node1', name: 'Node 1' }) as any],
      });

      const workflowB = createWorkflowData({
        nodes: [
          createNode({ id: 'node1', name: 'Node 1' }) as any,
          createNode({ id: 'node2', name: 'Node 2' }) as any,
        ],
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

      expect(diff.visualDiff.nodesAdded.length).toBe(1);
      expect(diff.visualDiff.nodesAdded[0].id).toBe('node2');
      expect(diff.summary.nodesChanged).toBe(1);
    });

    it('should detect deleted nodes', async () => {
      const workflowA = createWorkflowData({
        nodes: [
          createNode({ id: 'node1', name: 'Node 1' }) as any,
          createNode({ id: 'node2', name: 'Node 2' }) as any,
        ],
      });

      const workflowB = createWorkflowData({
        nodes: [createNode({ id: 'node1', name: 'Node 1' }) as any],
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

      expect(diff.visualDiff.nodesDeleted.length).toBe(1);
      expect(diff.visualDiff.nodesDeleted[0].id).toBe('node2');
    });

    it('should detect modified nodes', async () => {
      const workflowA = createWorkflowData({
        nodes: [createNode({ id: 'node1', name: 'Node 1', data: { value: 1 } }) as any],
      });

      const workflowB = createWorkflowData({
        nodes: [createNode({ id: 'node1', name: 'Node 1 Modified', data: { value: 2 } }) as any],
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

      expect(diff.visualDiff.nodesModified.length).toBe(1);
      expect(diff.visualDiff.nodesModified[0].nodeId).toBe('node1');
      expect(diff.visualDiff.nodesModified[0].changes.length).toBeGreaterThan(0);
    });

    it('should detect added edges', async () => {
      const node1 = createNode({ id: 'node1' }) as any;
      const node2 = createNode({ id: 'node2' }) as any;

      const workflowA = createWorkflowData({
        nodes: [node1, node2],
        edges: [],
      });

      const workflowB = createWorkflowData({
        nodes: [node1, node2],
        edges: [createEdge('node1', 'node2') as any],
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

      expect(diff.visualDiff.edgesAdded.length).toBe(1);
      expect(diff.visualDiff.edgesAdded[0].source).toBe('node1');
      expect(diff.visualDiff.edgesAdded[0].target).toBe('node2');
    });

    it('should detect deleted edges', async () => {
      const node1 = createNode({ id: 'node1' }) as any;
      const node2 = createNode({ id: 'node2' }) as any;

      const workflowA = createWorkflowData({
        nodes: [node1, node2],
        edges: [createEdge('node1', 'node2') as any],
      });

      const workflowB = createWorkflowData({
        nodes: [node1, node2],
        edges: [],
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

      expect(diff.visualDiff.edgesDeleted.length).toBe(1);
      expect(diff.visualDiff.edgesDeleted[0].source).toBe('node1');
    });

    it('should detect settings changes', async () => {
      const workflowA = createWorkflowData({
        settings: { timeout: 30000, retries: 3 },
      });

      const workflowB = createWorkflowData({
        settings: { timeout: 60000, retries: 3 },
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

      expect(diff.visualDiff.settingsChanged.length).toBe(1);
      expect(diff.visualDiff.settingsChanged[0].setting).toBe('timeout');
      expect(diff.visualDiff.settingsChanged[0].oldValue).toBe(30000);
      expect(diff.visualDiff.settingsChanged[0].newValue).toBe(60000);
    });

    it('should handle complex workflow changes', async () => {
      const workflowA = createWorkflowData({
        nodes: [
          createNode({ id: 'node1', name: 'Start', type: 'trigger' }) as any,
          createNode({ id: 'node2', name: 'Process', type: 'action' }) as any,
          createNode({ id: 'node3', name: 'End', type: 'action' }) as any,
        ],
        edges: [
          createEdge('node1', 'node2') as any,
          createEdge('node2', 'node3') as any,
        ],
        settings: { executionTimeout: 30000 },
      });

      const workflowB = createWorkflowData({
        nodes: [
          createNode({ id: 'node1', name: 'Start Modified', type: 'trigger' }) as any,
          createNode({ id: 'node2', name: 'Process', type: 'action' }) as any,
          createNode({ id: 'node4', name: 'New Node', type: 'condition' }) as any,
        ],
        edges: [
          createEdge('node1', 'node2') as any,
          createEdge('node2', 'node4') as any,
        ],
        settings: { executionTimeout: 60000 },
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

      // Node3 deleted, node4 added, node1 modified
      expect(diff.visualDiff.nodesAdded.length).toBe(1);
      expect(diff.visualDiff.nodesDeleted.length).toBe(1);
      expect(diff.visualDiff.nodesModified.length).toBe(1);

      // Edge to node3 deleted, edge to node4 added
      expect(diff.visualDiff.edgesDeleted.length).toBe(1);
      expect(diff.visualDiff.edgesAdded.length).toBe(1);

      // Settings changed
      expect(diff.visualDiff.settingsChanged.length).toBe(1);
    });
  });

  describe('Diff Complexity', () => {
    it('should classify low complexity changes', async () => {
      const workflowA = createWorkflowData({
        nodes: [createNode({ id: 'node1' }) as any],
      });

      const workflowB = createWorkflowData({
        nodes: [createNode({ id: 'node1', name: 'Updated' }) as any],
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

      expect(diff.summary.complexity).toBe('low');
    });

    it('should classify medium complexity changes', async () => {
      const workflowA = createWorkflowData({
        nodes: Array.from({ length: 5 }, (_, i) => createNode({ id: `node${i}` }) as any),
      });

      const workflowB = createWorkflowData({
        nodes: Array.from({ length: 5 }, (_, i) =>
          createNode({ id: `node${i}`, name: `Updated ${i}` }) as any
        ),
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

      expect(['medium', 'high']).toContain(diff.summary.complexity);
    });

    it('should classify high complexity changes', async () => {
      const workflowA = createWorkflowData({
        nodes: Array.from({ length: 10 }, (_, i) => createNode({ id: `node${i}` }) as any),
      });

      const workflowB = createWorkflowData({
        nodes: Array.from({ length: 10 }, (_, i) =>
          createNode({ id: `node${i + 10}` }) as any // All nodes replaced
        ),
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

      expect(diff.summary.complexity).toBe('high');
    });
  });

  describe('Git Diff Generation', () => {
    it('should generate git-style diff', async () => {
      const workflowA = createWorkflowData({ name: 'Old Workflow' });
      const workflowB = createWorkflowData({ name: 'New Workflow' });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

      expect(diff.gitDiff).toBeDefined();
      expect(diff.gitDiff.file).toContain('.json');
      expect(diff.gitDiff.status).toBe('modified');
      expect(diff.gitDiff.hunks.length).toBeGreaterThan(0);
    });

    it('should calculate additions and deletions', async () => {
      const workflowA = createWorkflowData({
        nodes: [createNode({ id: 'node1' }) as any],
      });

      const workflowB = createWorkflowData({
        nodes: [
          createNode({ id: 'node1' }) as any,
          createNode({ id: 'node2' }) as any,
        ],
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

      expect(diff.gitDiff.stats.additions).toBeGreaterThan(0);
    });
  });

  describe('generateDescription', () => {
    it('should generate human-readable description', async () => {
      const workflowA = createWorkflowData({
        name: 'My Workflow',
        nodes: [createNode({ id: 'node1', name: 'Start' }) as any],
      });

      const workflowB = createWorkflowData({
        name: 'My Workflow',
        nodes: [
          createNode({ id: 'node1', name: 'Start' }) as any,
          createNode({ id: 'node2', name: 'New Node' }) as any,
        ],
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);
      const description = diffGenerator.generateDescription(diff);

      expect(description).toContain('My Workflow');
      expect(description).toContain('Added nodes');
      expect(description).toContain('New Node');
    });

    it('should include deleted nodes in description', async () => {
      const workflowA = createWorkflowData({
        name: 'My Workflow',
        nodes: [
          createNode({ id: 'node1', name: 'Keep' }) as any,
          createNode({ id: 'node2', name: 'Delete Me' }) as any,
        ],
      });

      const workflowB = createWorkflowData({
        name: 'My Workflow',
        nodes: [createNode({ id: 'node1', name: 'Keep' }) as any],
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);
      const description = diffGenerator.generateDescription(diff);

      expect(description).toContain('Deleted nodes');
      expect(description).toContain('Delete Me');
    });

    it('should include modified nodes in description', async () => {
      const workflowA = createWorkflowData({
        name: 'My Workflow',
        nodes: [createNode({ id: 'node1', name: 'Original Name' }) as any],
      });

      const workflowB = createWorkflowData({
        name: 'My Workflow',
        nodes: [createNode({ id: 'node1', name: 'New Name' }) as any],
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);
      const description = diffGenerator.generateDescription(diff);

      expect(description).toContain('Modified nodes');
    });

    it('should include connection changes in description', async () => {
      const node1 = createNode({ id: 'node1' }) as any;
      const node2 = createNode({ id: 'node2' }) as any;

      const workflowA = createWorkflowData({
        name: 'My Workflow',
        nodes: [node1, node2],
        edges: [],
      });

      const workflowB = createWorkflowData({
        name: 'My Workflow',
        nodes: [node1, node2],
        edges: [createEdge('node1', 'node2') as any],
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);
      const description = diffGenerator.generateDescription(diff);

      expect(description).toContain('Connection changes');
      expect(description).toContain('node1');
      expect(description).toContain('node2');
    });

    it('should include settings changes in description', async () => {
      const workflowA = createWorkflowData({
        name: 'My Workflow',
        settings: { timeout: 30000 },
      });

      const workflowB = createWorkflowData({
        name: 'My Workflow',
        settings: { timeout: 60000 },
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);
      const description = diffGenerator.generateDescription(diff);

      expect(description).toContain('Settings changed');
      expect(description).toContain('timeout');
    });
  });

  describe('compareWithGit', () => {
    it('should compare workflow with git version', async () => {
      const gitWorkflow = createWorkflowData({
        name: 'Git Version',
        nodes: [createNode({ id: 'node1' }) as any],
      });

      const currentWorkflow = createWorkflowData({
        name: 'Current Version',
        nodes: [
          createNode({ id: 'node1' }) as any,
          createNode({ id: 'node2' }) as any,
        ],
      });

      const diff = await diffGenerator.compareWithGit(currentWorkflow, gitWorkflow);

      expect(diff.visualDiff.nodesAdded.length).toBe(1);
      expect(diff.workflowName).toBe('Current Version');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty workflows', async () => {
      const emptyWorkflowA = createWorkflowData();
      const emptyWorkflowB = createWorkflowData();

      const diff = await diffGenerator.generateWorkflowDiff(emptyWorkflowA, emptyWorkflowB);

      expect(diff.summary.totalChanges).toBe(0);
    });

    it('should handle workflows with many nodes', async () => {
      const manyNodes = Array.from({ length: 100 }, (_, i) =>
        createNode({ id: `node${i}`, name: `Node ${i}` }) as any
      );

      const workflowA = createWorkflowData({ nodes: manyNodes });
      const workflowB = createWorkflowData({
        nodes: manyNodes.map((n, i) =>
          i % 10 === 0 ? { ...n, name: `Modified ${i}` } : n
        ),
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

      expect(diff.visualDiff.nodesModified.length).toBe(10);
    });

    it('should handle deep nested data changes', async () => {
      const workflowA = createWorkflowData({
        nodes: [
          createNode({
            id: 'node1',
            data: {
              config: {
                nested: {
                  deep: {
                    value: 'original',
                  },
                },
              },
            },
          }) as any,
        ],
      });

      const workflowB = createWorkflowData({
        nodes: [
          createNode({
            id: 'node1',
            data: {
              config: {
                nested: {
                  deep: {
                    value: 'modified',
                  },
                },
              },
            },
          }) as any,
        ],
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

      expect(diff.visualDiff.nodesModified.length).toBe(1);
      const changes = diff.visualDiff.nodesModified[0].changes;
      expect(changes.some(c => c.path.includes('deep'))).toBe(true);
    });

    it('should handle null and undefined values', async () => {
      const workflowA = createWorkflowData({
        settings: { value: null },
      });

      const workflowB = createWorkflowData({
        settings: { value: undefined },
      });

      // Should not throw
      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);
      expect(diff).toBeDefined();
    });

    it('should handle arrays in node data', async () => {
      const workflowA = createWorkflowData({
        nodes: [
          createNode({
            id: 'node1',
            data: { items: ['a', 'b', 'c'] },
          }) as any,
        ],
      });

      const workflowB = createWorkflowData({
        nodes: [
          createNode({
            id: 'node1',
            data: { items: ['a', 'b', 'c', 'd'] },
          }) as any,
        ],
      });

      const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

      expect(diff.visualDiff.nodesModified.length).toBe(1);
    });
  });
});

// ============================================================================
// Line Diff Algorithm Tests
// ============================================================================

describe('Line Diff Algorithm', () => {
  let diffGenerator: DiffGenerator;

  beforeEach(() => {
    diffGenerator = new DiffGenerator();
  });

  it('should produce correct git diff hunks', async () => {
    const workflowA = createWorkflowData({ name: 'A' });
    const workflowB = createWorkflowData({ name: 'B' });

    const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

    // Check hunk structure
    expect(diff.gitDiff.hunks.length).toBeGreaterThan(0);

    const hunk = diff.gitDiff.hunks[0];
    expect(hunk.oldStart).toBeGreaterThanOrEqual(1);
    expect(hunk.newStart).toBeGreaterThanOrEqual(1);
    expect(hunk.lines).toBeDefined();
  });

  it('should identify context, addition, and deletion lines', async () => {
    const workflowA = createWorkflowData({
      name: 'Workflow',
      nodes: [createNode({ id: 'node1', name: 'Original' }) as any],
    });

    const workflowB = createWorkflowData({
      name: 'Workflow',
      nodes: [createNode({ id: 'node1', name: 'Modified' }) as any],
    });

    const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

    // Should have some context, additions, and deletions
    let hasContext = false;
    let hasAddition = false;
    let hasDeletion = false;

    for (const hunk of diff.gitDiff.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'context') hasContext = true;
        if (line.type === 'addition') hasAddition = true;
        if (line.type === 'deletion') hasDeletion = true;
      }
    }

    expect(hasContext).toBe(true);
    // At least one change type should be present
    expect(hasAddition || hasDeletion).toBe(true);
  });
});

// ============================================================================
// Version Comparison Patterns Tests
// ============================================================================

describe('Version Comparison Patterns', () => {
  let diffGenerator: DiffGenerator;

  beforeEach(() => {
    diffGenerator = new DiffGenerator();
  });

  it('should detect breaking changes (node removal)', async () => {
    const workflowA = createWorkflowData({
      nodes: [
        createNode({ id: 'trigger', type: 'trigger' }) as any,
        createNode({ id: 'action1', type: 'action' }) as any,
        createNode({ id: 'action2', type: 'action' }) as any,
      ],
      edges: [
        createEdge('trigger', 'action1') as any,
        createEdge('action1', 'action2') as any,
      ],
    });

    const workflowB = createWorkflowData({
      nodes: [
        createNode({ id: 'trigger', type: 'trigger' }) as any,
        createNode({ id: 'action1', type: 'action' }) as any,
        // action2 removed
      ],
      edges: [
        createEdge('trigger', 'action1') as any,
        // edge to action2 removed
      ],
    });

    const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

    // This is a breaking change - nodes and edges removed
    expect(diff.visualDiff.nodesDeleted.length).toBe(1);
    expect(diff.visualDiff.edgesDeleted.length).toBe(1);
  });

  it('should detect additive changes (new nodes)', async () => {
    const workflowA = createWorkflowData({
      nodes: [createNode({ id: 'start', type: 'trigger' }) as any],
    });

    const workflowB = createWorkflowData({
      nodes: [
        createNode({ id: 'start', type: 'trigger' }) as any,
        createNode({ id: 'new1', type: 'action' }) as any,
        createNode({ id: 'new2', type: 'action' }) as any,
      ],
      edges: [
        createEdge('start', 'new1') as any,
        createEdge('new1', 'new2') as any,
      ],
    });

    const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

    // Additive change - only new nodes/edges, no deletions
    expect(diff.visualDiff.nodesAdded.length).toBe(2);
    expect(diff.visualDiff.nodesDeleted.length).toBe(0);
    expect(diff.visualDiff.edgesAdded.length).toBe(2);
    expect(diff.visualDiff.edgesDeleted.length).toBe(0);
  });

  it('should detect configuration-only changes', async () => {
    const baseNode = createNode({ id: 'node1', name: 'Action' }) as any;

    const workflowA = createWorkflowData({
      nodes: [{ ...baseNode, data: { timeout: 30000 } }],
      settings: { executionMode: 'parallel' },
    });

    const workflowB = createWorkflowData({
      nodes: [{ ...baseNode, data: { timeout: 60000 } }],
      settings: { executionMode: 'sequential' },
    });

    const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

    // No structural changes (no added/deleted nodes or edges)
    expect(diff.visualDiff.nodesAdded.length).toBe(0);
    expect(diff.visualDiff.nodesDeleted.length).toBe(0);
    expect(diff.visualDiff.edgesAdded.length).toBe(0);
    expect(diff.visualDiff.edgesDeleted.length).toBe(0);

    // Only modifications and settings changes
    expect(diff.visualDiff.nodesModified.length).toBe(1);
    expect(diff.visualDiff.settingsChanged.length).toBe(1);
  });

  it('should detect complete workflow replacement', async () => {
    const workflowA = createWorkflowData({
      nodes: [
        createNode({ id: 'old1' }) as any,
        createNode({ id: 'old2' }) as any,
        createNode({ id: 'old3' }) as any,
      ],
      edges: [
        createEdge('old1', 'old2') as any,
        createEdge('old2', 'old3') as any,
      ],
    });

    const workflowB = createWorkflowData({
      nodes: [
        createNode({ id: 'new1' }) as any,
        createNode({ id: 'new2' }) as any,
      ],
      edges: [createEdge('new1', 'new2') as any],
    });

    const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

    // Complete replacement
    expect(diff.visualDiff.nodesDeleted.length).toBe(3);
    expect(diff.visualDiff.nodesAdded.length).toBe(2);
    expect(diff.visualDiff.edgesDeleted.length).toBe(2);
    expect(diff.visualDiff.edgesAdded.length).toBe(1);
    // Complexity can be 'medium' or 'high' depending on total changes
    expect(['medium', 'high']).toContain(diff.summary.complexity);
  });
});

// ============================================================================
// Property Change Detection Tests
// ============================================================================

describe('Property Change Detection', () => {
  let diffGenerator: DiffGenerator;

  beforeEach(() => {
    diffGenerator = new DiffGenerator();
  });

  it('should detect string property changes', async () => {
    const workflowA = createWorkflowData({
      nodes: [createNode({ id: 'node1', name: 'Original' }) as any],
    });

    const workflowB = createWorkflowData({
      nodes: [createNode({ id: 'node1', name: 'Modified' }) as any],
    });

    const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

    expect(diff.visualDiff.nodesModified.length).toBe(1);
    const changes = diff.visualDiff.nodesModified[0].changes;
    expect(changes.some(c => c.path === 'name')).toBe(true);
  });

  it('should detect number property changes', async () => {
    const workflowA = createWorkflowData({
      nodes: [createNode({ id: 'node1', position: { x: 0, y: 0 } }) as any],
    });

    const workflowB = createWorkflowData({
      nodes: [createNode({ id: 'node1', position: { x: 100, y: 200 } }) as any],
    });

    const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

    expect(diff.visualDiff.nodesModified.length).toBe(1);
    const changes = diff.visualDiff.nodesModified[0].changes;
    expect(changes.some(c => c.path.includes('position'))).toBe(true);
  });

  it('should detect boolean property changes', async () => {
    const workflowA = createWorkflowData({
      nodes: [createNode({ id: 'node1', data: { enabled: true } }) as any],
    });

    const workflowB = createWorkflowData({
      nodes: [createNode({ id: 'node1', data: { enabled: false } }) as any],
    });

    const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

    expect(diff.visualDiff.nodesModified.length).toBe(1);
  });

  it('should detect added properties', async () => {
    const workflowA = createWorkflowData({
      nodes: [createNode({ id: 'node1', data: {} }) as any],
    });

    const workflowB = createWorkflowData({
      nodes: [createNode({ id: 'node1', data: { newProp: 'value' } }) as any],
    });

    const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

    expect(diff.visualDiff.nodesModified.length).toBe(1);
    const changes = diff.visualDiff.nodesModified[0].changes;
    expect(changes.some(c => c.path.includes('newProp'))).toBe(true);
  });

  it('should detect removed properties', async () => {
    const workflowA = createWorkflowData({
      nodes: [createNode({ id: 'node1', data: { oldProp: 'value' } }) as any],
    });

    const workflowB = createWorkflowData({
      nodes: [createNode({ id: 'node1', data: {} }) as any],
    });

    const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

    expect(diff.visualDiff.nodesModified.length).toBe(1);
    const changes = diff.visualDiff.nodesModified[0].changes;
    expect(changes.some(c => c.path.includes('oldProp'))).toBe(true);
  });
});

// ============================================================================
// Summary Generation Tests
// ============================================================================

describe('Summary Generation', () => {
  let diffGenerator: DiffGenerator;

  beforeEach(() => {
    diffGenerator = new DiffGenerator();
  });

  it('should calculate total changes correctly', async () => {
    const workflowA = createWorkflowData({
      nodes: [
        createNode({ id: 'node1' }) as any,
        createNode({ id: 'node2' }) as any,
      ],
      edges: [createEdge('node1', 'node2') as any],
      settings: { timeout: 30000 },
    });

    const workflowB = createWorkflowData({
      nodes: [
        createNode({ id: 'node1', name: 'Modified' }) as any,
        createNode({ id: 'node3' }) as any,
      ],
      edges: [createEdge('node1', 'node3') as any],
      settings: { timeout: 60000 },
    });

    const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

    // 1 added (node3), 1 deleted (node2), 1 modified (node1)
    // 1 edge added, 1 edge deleted, 1 setting changed
    const expectedTotal =
      diff.visualDiff.nodesAdded.length +
      diff.visualDiff.nodesDeleted.length +
      diff.visualDiff.nodesModified.length +
      diff.visualDiff.edgesAdded.length +
      diff.visualDiff.edgesDeleted.length +
      diff.visualDiff.settingsChanged.length;

    expect(diff.summary.totalChanges).toBe(expectedTotal);
  });

  it('should calculate node changes correctly', async () => {
    const workflowA = createWorkflowData({
      nodes: [
        createNode({ id: 'node1' }) as any,
        createNode({ id: 'node2' }) as any,
      ],
    });

    const workflowB = createWorkflowData({
      nodes: [
        createNode({ id: 'node1', name: 'Modified' }) as any,
        createNode({ id: 'node3' }) as any,
      ],
    });

    const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

    const expectedNodeChanges =
      diff.visualDiff.nodesAdded.length +
      diff.visualDiff.nodesDeleted.length +
      diff.visualDiff.nodesModified.length;

    expect(diff.summary.nodesChanged).toBe(expectedNodeChanges);
  });

  it('should calculate edge changes correctly', async () => {
    const node1 = createNode({ id: 'node1' }) as any;
    const node2 = createNode({ id: 'node2' }) as any;
    const node3 = createNode({ id: 'node3' }) as any;

    const workflowA = createWorkflowData({
      nodes: [node1, node2, node3],
      edges: [
        createEdge('node1', 'node2') as any,
        createEdge('node2', 'node3') as any,
      ],
    });

    const workflowB = createWorkflowData({
      nodes: [node1, node2, node3],
      edges: [
        createEdge('node1', 'node3') as any, // New edge
      ],
    });

    const diff = await diffGenerator.generateWorkflowDiff(workflowA, workflowB);

    const expectedEdgeChanges =
      diff.visualDiff.edgesAdded.length + diff.visualDiff.edgesDeleted.length;

    expect(diff.summary.edgesChanged).toBe(expectedEdgeChanges);
  });
});

// ============================================================================
// Integration: Full Workflow Lifecycle
// ============================================================================

describe('Full Workflow Version Lifecycle', () => {
  let diffGenerator: DiffGenerator;

  beforeEach(() => {
    diffGenerator = new DiffGenerator();
  });

  it('should track changes through multiple versions', async () => {
    // Version 1: Initial workflow
    const v1 = createWorkflowData({
      nodes: [createNode({ id: 'trigger', type: 'trigger', name: 'Start' }) as any],
    });

    // Version 2: Add action node
    const v2 = createWorkflowData({
      nodes: [
        createNode({ id: 'trigger', type: 'trigger', name: 'Start' }) as any,
        createNode({ id: 'action1', type: 'action', name: 'Process' }) as any,
      ],
      edges: [createEdge('trigger', 'action1') as any],
    });

    // Version 3: Add another action
    const v3 = createWorkflowData({
      nodes: [
        createNode({ id: 'trigger', type: 'trigger', name: 'Start' }) as any,
        createNode({ id: 'action1', type: 'action', name: 'Process' }) as any,
        createNode({ id: 'action2', type: 'action', name: 'Notify' }) as any,
      ],
      edges: [
        createEdge('trigger', 'action1') as any,
        createEdge('action1', 'action2') as any,
      ],
    });

    // v1 -> v2: Added 1 node, 1 edge
    const diff1to2 = await diffGenerator.generateWorkflowDiff(v1, v2);
    expect(diff1to2.visualDiff.nodesAdded.length).toBe(1);
    expect(diff1to2.visualDiff.edgesAdded.length).toBe(1);

    // v2 -> v3: Added 1 node, 1 edge
    const diff2to3 = await diffGenerator.generateWorkflowDiff(v2, v3);
    expect(diff2to3.visualDiff.nodesAdded.length).toBe(1);
    expect(diff2to3.visualDiff.edgesAdded.length).toBe(1);

    // v1 -> v3: Added 2 nodes, 2 edges
    const diff1to3 = await diffGenerator.generateWorkflowDiff(v1, v3);
    expect(diff1to3.visualDiff.nodesAdded.length).toBe(2);
    expect(diff1to3.visualDiff.edgesAdded.length).toBe(2);
  });

  it('should handle branch and merge scenario', async () => {
    // Main branch
    const main = createWorkflowData({
      nodes: [
        createNode({ id: 'trigger', type: 'trigger' }) as any,
        createNode({ id: 'action1', type: 'action' }) as any,
      ],
      edges: [createEdge('trigger', 'action1') as any],
    });

    // Feature branch (adds new action)
    const feature = createWorkflowData({
      nodes: [
        createNode({ id: 'trigger', type: 'trigger' }) as any,
        createNode({ id: 'action1', type: 'action' }) as any,
        createNode({ id: 'action2', type: 'action', name: 'New Feature' }) as any,
      ],
      edges: [
        createEdge('trigger', 'action1') as any,
        createEdge('action1', 'action2') as any,
      ],
    });

    const diff = await diffGenerator.generateWorkflowDiff(main, feature);

    expect(diff.visualDiff.nodesAdded.length).toBe(1);
    expect(diff.visualDiff.nodesAdded[0].name).toBe('New Feature');
    expect(diff.summary.complexity).toBe('low');
  });

  it('should detect rollback scenario', async () => {
    // Current version (complex)
    const current = createWorkflowData({
      nodes: [
        createNode({ id: 'trigger' }) as any,
        createNode({ id: 'action1' }) as any,
        createNode({ id: 'action2' }) as any,
        createNode({ id: 'action3' }) as any,
      ],
      edges: [
        createEdge('trigger', 'action1') as any,
        createEdge('action1', 'action2') as any,
        createEdge('action2', 'action3') as any,
      ],
    });

    // Previous version (simpler - rollback target)
    const previous = createWorkflowData({
      nodes: [
        createNode({ id: 'trigger' }) as any,
        createNode({ id: 'action1' }) as any,
      ],
      edges: [createEdge('trigger', 'action1') as any],
    });

    // Rolling back current -> previous
    const diff = await diffGenerator.generateWorkflowDiff(current, previous);

    // Rollback removes nodes and edges
    expect(diff.visualDiff.nodesDeleted.length).toBe(2);
    expect(diff.visualDiff.edgesDeleted.length).toBe(2);
    expect(diff.summary.complexity).toBe('low'); // Low because only 2 nodes changed
  });
});

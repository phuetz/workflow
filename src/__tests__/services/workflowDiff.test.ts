/**
 * Workflow Diff Service Tests
 */

import { describe, it, expect } from 'vitest';
import {
  WorkflowDiffService,
  WorkflowDiff
} from '../../services/WorkflowDiffService';
import { WorkflowSnapshot } from '../../services/WorkflowVersioningService';

describe('WorkflowDiffService', () => {
  let service: WorkflowDiffService;

  beforeEach(() => {
    service = new WorkflowDiffService();
  });

  describe('compareSnapshots', () => {
    it('should detect added nodes', async () => {
      const oldSnapshot: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Test',
        nodes: [{ id: 'node1', type: 'trigger', data: {} }],
        edges: []
      };

      const newSnapshot: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Test',
        nodes: [
          { id: 'node1', type: 'trigger', data: {} },
          { id: 'node2', type: 'action', data: {} }
        ],
        edges: []
      };

      const result = await service.compareSnapshots(oldSnapshot, newSnapshot);

      expect(result.diff.summary.nodesAdded).toBe(1);
      const addedNode = result.diff.nodes.find(n => n.type === 'added');
      expect(addedNode?.nodeId).toBe('node2');
    });

    it('should detect removed nodes', async () => {
      const oldSnapshot: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Test',
        nodes: [
          { id: 'node1', type: 'trigger', data: {} },
          { id: 'node2', type: 'action', data: {} }
        ],
        edges: []
      };

      const newSnapshot: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Test',
        nodes: [{ id: 'node1', type: 'trigger', data: {} }],
        edges: []
      };

      const result = await service.compareSnapshots(oldSnapshot, newSnapshot);

      expect(result.diff.summary.nodesRemoved).toBe(1);
      const removedNode = result.diff.nodes.find(n => n.type === 'removed');
      expect(removedNode?.nodeId).toBe('node2');
    });

    it('should detect modified nodes', async () => {
      const oldSnapshot: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Test',
        nodes: [{ id: 'node1', type: 'trigger', data: { config: 'old' } }],
        edges: []
      };

      const newSnapshot: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Test',
        nodes: [{ id: 'node1', type: 'trigger', data: { config: 'new' } }],
        edges: []
      };

      const result = await service.compareSnapshots(oldSnapshot, newSnapshot);

      expect(result.diff.summary.nodesModified).toBe(1);
      const modifiedNode = result.diff.nodes.find(n => n.type === 'modified');
      expect(modifiedNode?.changes?.length).toBeGreaterThan(0);
    });

    it('should detect added edges', async () => {
      const oldSnapshot: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Test',
        nodes: [
          { id: 'node1', type: 'trigger', data: {} },
          { id: 'node2', type: 'action', data: {} }
        ],
        edges: []
      };

      const newSnapshot: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Test',
        nodes: [
          { id: 'node1', type: 'trigger', data: {} },
          { id: 'node2', type: 'action', data: {} }
        ],
        edges: [{ id: 'edge1', source: 'node1', target: 'node2' }]
      };

      const result = await service.compareSnapshots(oldSnapshot, newSnapshot);

      expect(result.diff.summary.edgesAdded).toBe(1);
    });

    it('should detect variable changes', async () => {
      const oldSnapshot: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Test',
        nodes: [],
        edges: [],
        variables: { var1: 'old' }
      };

      const newSnapshot: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Test',
        nodes: [],
        edges: [],
        variables: { var1: 'new', var2: 'added' }
      };

      const result = await service.compareSnapshots(oldSnapshot, newSnapshot);

      expect(result.diff.variables?.length).toBeGreaterThan(0);
    });
  });

  describe('conflict detection', () => {
    it('should detect orphaned edges', async () => {
      const oldSnapshot: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Test',
        nodes: [
          { id: 'node1', type: 'trigger', data: {} },
          { id: 'node2', type: 'action', data: {} }
        ],
        edges: [{ id: 'edge1', source: 'node1', target: 'node2' }]
      };

      const newSnapshot: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Test',
        nodes: [{ id: 'node1', type: 'trigger', data: {} }],
        edges: [{ id: 'edge1', source: 'node1', target: 'node2' }]
      };

      const result = await service.compareSnapshots(oldSnapshot, newSnapshot);

      expect(result.conflicts.length).toBeGreaterThan(0);
      const orphanedEdgeConflict = result.conflicts.find(
        c => c.type === 'edge'
      );
      expect(orphanedEdgeConflict).toBeDefined();
    });
  });

  describe('diff generation', () => {
    it('should generate JSON diff', async () => {
      const oldSnapshot: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Old Name',
        nodes: [],
        edges: []
      };

      const newSnapshot: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'New Name',
        nodes: [],
        edges: []
      };

      const jsonDiff = await service.generateJsonDiff(oldSnapshot, newSnapshot);

      expect(jsonDiff).toContain('Old Name');
      expect(jsonDiff).toContain('New Name');
    });

    it('should generate unified diff', async () => {
      const oldSnapshot: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Old Name',
        nodes: [],
        edges: []
      };

      const newSnapshot: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'New Name',
        nodes: [],
        edges: []
      };

      const unifiedDiff = await service.generateUnifiedDiff(
        oldSnapshot,
        newSnapshot
      );

      expect(unifiedDiff).toContain('-');
      expect(unifiedDiff).toContain('+');
    });
  });

  describe('diff statistics', () => {
    it('should calculate diff stats', async () => {
      const oldSnapshot: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Test',
        nodes: [{ id: 'node1', type: 'trigger', data: {} }],
        edges: []
      };

      const newSnapshot: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Test',
        nodes: [
          { id: 'node1', type: 'trigger', data: { modified: true } },
          { id: 'node2', type: 'action', data: {} }
        ],
        edges: [{ id: 'edge1', source: 'node1', target: 'node2' }]
      };

      const result = await service.compareSnapshots(oldSnapshot, newSnapshot);
      const stats = await service.getDiffStats(result.diff);

      expect(stats.additions).toBe(2); // 1 node + 1 edge
      expect(stats.modifications).toBe(1); // 1 modified node
      expect(stats.totalChanges).toBe(3);
      expect(stats.changePercentage).toBeGreaterThan(0);
    });
  });

  describe('merge snapshots', () => {
    it('should merge non-conflicting changes', async () => {
      const base: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Base',
        nodes: [{ id: 'node1', type: 'trigger', data: {} }],
        edges: []
      };

      const snapshot1: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Base',
        nodes: [
          { id: 'node1', type: 'trigger', data: {} },
          { id: 'node2', type: 'action', data: {} }
        ],
        edges: []
      };

      const snapshot2: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Base',
        nodes: [
          { id: 'node1', type: 'trigger', data: {} },
          { id: 'node3', type: 'action', data: {} }
        ],
        edges: []
      };

      const result = await service.mergeSnapshots(
        base,
        snapshot1,
        snapshot2,
        'manual'
      );

      expect(result.merged.nodes.length).toBeGreaterThan(1);
    });

    it('should use "ours" strategy', async () => {
      const base: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Base',
        nodes: [],
        edges: []
      };

      const snapshot1: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Version 1',
        nodes: [],
        edges: []
      };

      const snapshot2: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Version 2',
        nodes: [],
        edges: []
      };

      const result = await service.mergeSnapshots(
        base,
        snapshot1,
        snapshot2,
        'ours'
      );

      expect(result.merged.name).toBe('Version 1');
    });

    it('should use "theirs" strategy', async () => {
      const base: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Base',
        nodes: [],
        edges: []
      };

      const snapshot1: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Version 1',
        nodes: [],
        edges: []
      };

      const snapshot2: WorkflowSnapshot = {
        id: 'workflow1',
        name: 'Version 2',
        nodes: [],
        edges: []
      };

      const result = await service.mergeSnapshots(
        base,
        snapshot1,
        snapshot2,
        'theirs'
      );

      expect(result.merged.name).toBe('Version 2');
    });
  });
});

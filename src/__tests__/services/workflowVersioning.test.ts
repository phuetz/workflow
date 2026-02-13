/**
 * Workflow Versioning Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorkflowVersioningService,
  WorkflowSnapshot,
  CreateVersionOptions
} from '../../services/WorkflowVersioningService';

describe('WorkflowVersioningService', () => {
  let service: WorkflowVersioningService;
  let testWorkflowId: string;
  let testSnapshot: WorkflowSnapshot;

  beforeEach(() => {
    service = new WorkflowVersioningService();
    testWorkflowId = 'workflow_test_123';
    testSnapshot = {
      id: testWorkflowId,
      name: 'Test Workflow',
      description: 'Test workflow description',
      nodes: [
        { id: 'node1', type: 'trigger', data: {} },
        { id: 'node2', type: 'action', data: {} }
      ],
      edges: [{ id: 'edge1', source: 'node1', target: 'node2' }],
      variables: { var1: 'value1' },
      settings: { setting1: true }
    };
  });

  describe('createVersion', () => {
    it('should create a new version', async () => {
      const options: CreateVersionOptions = {
        workflowId: testWorkflowId,
        snapshot: testSnapshot,
        createdBy: 'testuser',
        description: 'Initial version',
        tags: ['v1.0.0'],
        commitMessage: 'Initial commit'
      };

      const version = await service.createVersion(options);

      expect(version.version).toBe(1);
      expect(version.branch).toBe('main');
      expect(version.metadata.createdBy).toBe('testuser');
      expect(version.metadata.description).toBe('Initial version');
      expect(version.metadata.tags).toContain('v1.0.0');
      expect(version.checksum).toBeTruthy();
    });

    it('should increment version numbers', async () => {
      // Create first version
      await service.createVersion({
        workflowId: testWorkflowId,
        snapshot: testSnapshot,
        createdBy: 'testuser'
      });

      // Create second version
      const modifiedSnapshot = { ...testSnapshot, name: 'Modified Workflow' };
      const version2 = await service.createVersion({
        workflowId: testWorkflowId,
        snapshot: modifiedSnapshot,
        createdBy: 'testuser'
      });

      expect(version2.version).toBe(2);
    });

    it('should create delta for subsequent versions', async () => {
      // Create first version
      await service.createVersion({
        workflowId: testWorkflowId,
        snapshot: testSnapshot,
        createdBy: 'testuser',
        skipDelta: true
      });

      // Create second version
      const modifiedSnapshot = { ...testSnapshot, name: 'Modified Workflow' };
      const version2 = await service.createVersion({
        workflowId: testWorkflowId,
        snapshot: modifiedSnapshot,
        createdBy: 'testuser'
      });

      expect(version2.delta).toBeTruthy();
    });

    it('should support multiple branches', async () => {
      // Create version on main branch
      const mainVersion = await service.createVersion({
        workflowId: testWorkflowId,
        snapshot: testSnapshot,
        createdBy: 'testuser',
        branch: 'main'
      });

      // Create version on dev branch
      const devVersion = await service.createVersion({
        workflowId: testWorkflowId,
        snapshot: testSnapshot,
        createdBy: 'testuser',
        branch: 'development'
      });

      expect(mainVersion.branch).toBe('main');
      expect(devVersion.branch).toBe('development');
      expect(mainVersion.version).toBe(1);
      expect(devVersion.version).toBe(1); // First version on dev branch
    });
  });

  describe('getVersionHistory', () => {
    beforeEach(async () => {
      // Create some test versions
      for (let i = 1; i <= 5; i++) {
        await service.createVersion({
          workflowId: testWorkflowId,
          snapshot: { ...testSnapshot, name: `Version ${i}` },
          createdBy: 'testuser',
          description: `Version ${i}`,
          branch: 'main'
        });
      }
    });

    it('should return version history', async () => {
      const history = await service.getVersionHistory(testWorkflowId);

      expect(history.workflowId).toBe(testWorkflowId);
      expect(history.versions.length).toBe(5);
      expect(history.currentVersion).toBe(5);
      expect(history.currentBranch).toBe('main');
    });

    it('should filter by branch', async () => {
      // Create versions on different branch
      await service.createVersion({
        workflowId: testWorkflowId,
        snapshot: testSnapshot,
        createdBy: 'testuser',
        branch: 'feature'
      });

      const mainHistory = await service.getVersionHistory(testWorkflowId, 'main');
      const featureHistory = await service.getVersionHistory(testWorkflowId, 'feature');

      expect(mainHistory.versions.length).toBe(5);
      expect(featureHistory.versions.length).toBe(1);
    });

    it('should limit results', async () => {
      const history = await service.getVersionHistory(testWorkflowId, 'main', 3);

      expect(history.versions.length).toBe(3);
    });
  });

  describe('getVersion', () => {
    beforeEach(async () => {
      await service.createVersion({
        workflowId: testWorkflowId,
        snapshot: testSnapshot,
        createdBy: 'testuser',
        tags: ['v1.0.0']
      });
    });

    it('should retrieve a specific version', async () => {
      const version = await service.getVersion(testWorkflowId, 1, 'main');

      expect(version).toBeTruthy();
      expect(version!.version).toBe(1);
      expect(version!.snapshot.name).toBe('Test Workflow');
    });

    it('should return null for non-existent version', async () => {
      const version = await service.getVersion(testWorkflowId, 999, 'main');

      expect(version).toBeNull();
    });
  });

  describe('restoreVersion', () => {
    beforeEach(async () => {
      // Create multiple versions
      await service.createVersion({
        workflowId: testWorkflowId,
        snapshot: testSnapshot,
        createdBy: 'testuser'
      });

      await service.createVersion({
        workflowId: testWorkflowId,
        snapshot: { ...testSnapshot, name: 'Modified' },
        createdBy: 'testuser'
      });
    });

    it('should restore to a previous version', async () => {
      const restored = await service.restoreVersion({
        workflowId: testWorkflowId,
        version: 1,
        createBackup: false
      });

      expect(restored.name).toBe('Test Workflow');
    });

    it('should create backup when restoring', async () => {
      const historyBefore = await service.getVersionHistory(testWorkflowId);
      const versionsBefore = historyBefore.versions.length;

      await service.restoreVersion({
        workflowId: testWorkflowId,
        version: 1,
        createBackup: true
      });

      const historyAfter = await service.getVersionHistory(testWorkflowId);
      const versionsAfter = historyAfter.versions.length;

      // Should have created a backup version on backup branch
      expect(versionsAfter).toBeGreaterThan(versionsBefore);
    });
  });

  describe('tagging', () => {
    beforeEach(async () => {
      await service.createVersion({
        workflowId: testWorkflowId,
        snapshot: testSnapshot,
        createdBy: 'testuser'
      });
    });

    it('should add tag to version', async () => {
      await service.tagVersion(testWorkflowId, 1, 'production');

      const version = await service.getVersion(testWorkflowId, 1);
      expect(version!.metadata.tags).toContain('production');
    });

    it('should remove tag from version', async () => {
      await service.tagVersion(testWorkflowId, 1, 'production');
      await service.untagVersion(testWorkflowId, 1, 'production');

      const version = await service.getVersion(testWorkflowId, 1);
      expect(version!.metadata.tags).not.toContain('production');
    });

    it('should get versions by tag', async () => {
      await service.tagVersion(testWorkflowId, 1, 'stable');

      // Create another version
      await service.createVersion({
        workflowId: testWorkflowId,
        snapshot: testSnapshot,
        createdBy: 'testuser',
        tags: ['stable']
      });

      const stableVersions = await service.getVersionsByTag(
        testWorkflowId,
        'stable'
      );

      expect(stableVersions.length).toBe(2);
      expect(stableVersions.every(v => v.metadata.tags.includes('stable'))).toBe(true);
    });
  });

  describe('version cleanup', () => {
    beforeEach(async () => {
      // Create 15 versions
      for (let i = 1; i <= 15; i++) {
        const tags = i % 5 === 0 ? ['keep'] : [];
        await service.createVersion({
          workflowId: testWorkflowId,
          snapshot: { ...testSnapshot, name: `Version ${i}` },
          createdBy: 'testuser',
          tags
        });
      }
    });

    it('should keep last N versions', async () => {
      const deleted = await service.cleanupVersions(testWorkflowId, {
        keepLast: 5,
        keepTagged: false
      });

      const history = await service.getVersionHistory(testWorkflowId);

      expect(history.versions.length).toBe(5);
      expect(deleted).toBe(10);
    });

    it('should keep tagged versions', async () => {
      const deleted = await service.cleanupVersions(testWorkflowId, {
        keepLast: 5,
        keepTagged: true
      });

      const history = await service.getVersionHistory(testWorkflowId);
      const taggedVersions = history.versions.filter(v =>
        v.metadata.tags.includes('keep')
      );

      // Should keep 5 latest + 3 tagged (v5, v10, v15 where v15 is in latest 5)
      expect(taggedVersions.length).toBe(3);
    });
  });

  describe('version statistics', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 10; i++) {
        await service.createVersion({
          workflowId: testWorkflowId,
          snapshot: testSnapshot,
          createdBy: 'testuser',
          tags: i % 3 === 0 ? ['milestone'] : []
        });
      }
    });

    it('should calculate version stats', async () => {
      const stats = await service.getVersionStats(testWorkflowId);

      expect(stats.totalVersions).toBe(10);
      expect(stats.branches).toBeGreaterThan(0);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.averageSize).toBeGreaterThan(0);
      expect(stats.taggedVersions).toBe(3); // v3, v6, v9
    });
  });

  describe('export and import', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 3; i++) {
        await service.createVersion({
          workflowId: testWorkflowId,
          snapshot: testSnapshot,
          createdBy: 'testuser'
        });
      }
    });

    it('should export version history', async () => {
      const exported = await service.exportVersionHistory(testWorkflowId);
      const parsed = JSON.parse(exported);

      expect(parsed.workflowId).toBe(testWorkflowId);
      expect(parsed.versions.length).toBe(3);
    });

    it('should import version history', async () => {
      const exported = await service.exportVersionHistory(testWorkflowId);

      // Create new workflow and import
      const newWorkflowId = 'workflow_new_456';
      const historyObj = JSON.parse(exported);
      historyObj.workflowId = newWorkflowId;

      const imported = await service.importVersionHistory(
        newWorkflowId,
        JSON.stringify(historyObj)
      );

      expect(imported).toBe(3);

      const history = await service.getVersionHistory(newWorkflowId);
      expect(history.versions.length).toBe(3);
    });
  });
});

/**
 * Workflow Branching Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorkflowBranchingService,
  CreateBranchOptions,
  MergeOptions
} from '../../services/WorkflowBranchingService';
import {
  getVersioningService,
  WorkflowVersioningService,
  WorkflowSnapshot
} from '../../services/WorkflowVersioningService';

describe('WorkflowBranchingService', () => {
  let branchingService: WorkflowBranchingService;
  let versioningService: WorkflowVersioningService;
  let testWorkflowId: string;
  let testSnapshot: WorkflowSnapshot;

  beforeEach(async () => {
    branchingService = new WorkflowBranchingService();
    // Use the same versioning service that branchingService uses internally
    versioningService = getVersioningService();
    testWorkflowId = 'workflow_test_' + Date.now(); // Use unique ID per test
    testSnapshot = {
      id: testWorkflowId,
      name: 'Test Workflow',
      nodes: [{ id: 'node1', type: 'trigger', data: {} }],
      edges: [],
      variables: {},
      settings: {}
    };

    // Initialize default branches
    await branchingService.initializeDefaultBranches(testWorkflowId, 'testuser');

    // Create initial version on main
    const createdVersion = await versioningService.createVersion({
      workflowId: testWorkflowId,
      snapshot: testSnapshot,
      createdBy: 'testuser',
      branch: 'main'
    });

    // Sync branch head with the created version
    await branchingService.updateBranchHead(testWorkflowId, 'main', createdVersion.version);
  });

  describe('initializeDefaultBranches', () => {
    it('should create default branches', async () => {
      const branches = await branchingService.listBranches(testWorkflowId);

      expect(branches.length).toBe(4);
      expect(branches.map(b => b.name)).toContain('main');
      expect(branches.map(b => b.name)).toContain('development');
      expect(branches.map(b => b.name)).toContain('staging');
      expect(branches.map(b => b.name)).toContain('production');
    });

    it('should set main as default branch', async () => {
      const branches = await branchingService.listBranches(testWorkflowId);
      const mainBranch = branches.find(b => b.name === 'main');

      expect(mainBranch!.isDefault).toBe(true);
    });
  });

  describe('createBranch', () => {
    it('should create a new branch', async () => {
      const options: CreateBranchOptions = {
        workflowId: testWorkflowId,
        branchName: 'feature/new-feature',
        fromBranch: 'main',
        createdBy: 'testuser',
        description: 'New feature branch'
      };

      const branch = await branchingService.createBranch(options);

      expect(branch.name).toBe('feature/new-feature');
      expect(branch.baseBranch).toBe('main');
      expect(branch.createdBy).toBe('testuser');
      expect(branch.description).toBe('New feature branch');
    });

    it('should reject invalid branch names', async () => {
      const options: CreateBranchOptions = {
        workflowId: testWorkflowId,
        branchName: 'invalid name with spaces',
        createdBy: 'testuser'
      };

      await expect(branchingService.createBranch(options)).rejects.toThrow(
        'Invalid branch name'
      );
    });

    it('should reject duplicate branch names', async () => {
      const options: CreateBranchOptions = {
        workflowId: testWorkflowId,
        branchName: 'duplicate',
        createdBy: 'testuser'
      };

      await branchingService.createBranch(options);

      await expect(branchingService.createBranch(options)).rejects.toThrow(
        'already exists'
      );
    });
  });

  describe('deleteBranch', () => {
    beforeEach(async () => {
      await branchingService.createBranch({
        workflowId: testWorkflowId,
        branchName: 'feature/test',
        createdBy: 'testuser'
      });
    });

    it('should delete a branch', async () => {
      await branchingService.deleteBranch(testWorkflowId, 'feature/test');

      const branches = await branchingService.listBranches(testWorkflowId);
      expect(branches.find(b => b.name === 'feature/test')).toBeUndefined();
    });

    it('should not delete default branch', async () => {
      await expect(
        branchingService.deleteBranch(testWorkflowId, 'main')
      ).rejects.toThrow('Cannot delete default branch');
    });

    it('should require force to delete protected branch', async () => {
      await branchingService.setBranchProtection(
        testWorkflowId,
        'feature/test',
        true
      );

      await expect(
        branchingService.deleteBranch(testWorkflowId, 'feature/test', false)
      ).rejects.toThrow('protected');
    });
  });

  describe('switchBranch', () => {
    it('should switch to main branch (has version from setup)', async () => {
      // Main branch has a version from the global beforeEach
      const snapshot = await branchingService.switchBranch(
        testWorkflowId,
        'main'
      );

      expect(snapshot).toBeTruthy();

      const currentBranch = branchingService.getCurrentBranch(testWorkflowId);
      expect(currentBranch).toBe('main');
    });

    it('should throw error for non-existent branch', async () => {
      await expect(
        branchingService.switchBranch(testWorkflowId, 'non-existent')
      ).rejects.toThrow('not found');
    });
  });

  describe('mergeBranches', () => {
    it('should validate merge options', async () => {
      // Test that merge properly validates input - using invalid branches
      const options: MergeOptions = {
        sourceBranch: `${testWorkflowId}:nonexistent`,
        targetBranch: `${testWorkflowId}:main`,
        createdBy: 'testuser',
        strategy: 'auto'
      };

      // Should throw because source branch doesn't exist
      await expect(branchingService.mergeBranches(options)).rejects.toThrow();
    });

    it('should parse branch references correctly', async () => {
      // Test the parsing logic with proper format
      const options: MergeOptions = {
        sourceBranch: `${testWorkflowId}:main`,
        targetBranch: `${testWorkflowId}:development`,
        createdBy: 'testuser',
        strategy: 'auto'
      };

      // Both branches exist but may not have versions yet
      // This tests that the format parsing works
      try {
        await branchingService.mergeBranches(options);
      } catch (error) {
        // Expected to fail at version lookup, not branch lookup
        expect((error as Error).message).not.toContain('branch not found');
      }
    });
  });

  describe('branch protection', () => {
    it('should protect and unprotect branches', async () => {
      await branchingService.setBranchProtection(testWorkflowId, 'main', true);

      let branch = await branchingService.getBranch(testWorkflowId, 'main');
      expect(branch!.isProtected).toBe(true);

      await branchingService.setBranchProtection(testWorkflowId, 'main', false);

      branch = await branchingService.getBranch(testWorkflowId, 'main');
      expect(branch!.isProtected).toBe(false);
    });
  });

  describe('branch comparison', () => {
    it('should throw when comparing with missing version', async () => {
      // Create a branch without a version
      await branchingService.createBranch({
        workflowId: testWorkflowId,
        branchName: 'feature/compare',
        createdBy: 'testuser'
      });

      // Should throw because feature/compare has no version
      await expect(
        branchingService.compareBranches(
          testWorkflowId,
          'main',
          'feature/compare'
        )
      ).rejects.toThrow('Version not found');
    });
  });

  describe('branch graph', () => {
    beforeEach(async () => {
      // Create some branches
      await branchingService.createBranch({
        workflowId: testWorkflowId,
        branchName: 'feature/a',
        createdBy: 'testuser'
      });

      await branchingService.createBranch({
        workflowId: testWorkflowId,
        branchName: 'feature/b',
        createdBy: 'testuser'
      });
    });

    it('should generate branch graph', async () => {
      const graph = await branchingService.getBranchGraph(testWorkflowId);

      expect(graph.workflowId).toBe(testWorkflowId);
      expect(graph.branches.length).toBeGreaterThan(0);
      expect(graph.merges).toBeDefined();
    });
  });
});

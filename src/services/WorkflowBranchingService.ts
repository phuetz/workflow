/**
 * Workflow Branching Service
 * Git-like branching and merging for workflows
 *
 * Features:
 * - Create/delete branches
 * - Switch between branches
 * - Merge branches with conflict resolution
 * - Branch visualization
 * - Default branches (main, development, staging, production)
 */

import { logger } from './SimpleLogger';
import {
  WorkflowSnapshot,
  WorkflowVersion,
  getVersioningService
} from './WorkflowVersioningService';
import { getDiffService, Conflict } from './WorkflowDiffService';

export interface Branch {
  name: string;
  workflowId: string;
  baseVersion: number;
  baseBranch?: string;
  headVersion: number;
  createdAt: Date;
  createdBy: string;
  description?: string;
  isDefault: boolean;
  isProtected: boolean;
  mergedInto?: string[];
  metadata?: Record<string, unknown>;
}

export interface BranchGraph {
  workflowId: string;
  branches: BranchNode[];
  merges: MergeEdge[];
}

export interface BranchNode {
  branch: string;
  versions: number[];
  current: boolean;
}

export interface MergeEdge {
  from: string;
  to: string;
  version: number;
  timestamp: Date;
  strategy: MergeStrategy;
}

export type MergeStrategy = 'auto' | 'manual' | 'ours' | 'theirs' | 'recursive';

export interface MergeOptions {
  sourceBranch: string;
  targetBranch: string;
  strategy?: MergeStrategy;
  commitMessage?: string;
  createdBy: string;
  resolveConflicts?: boolean;
  fastForward?: boolean;
}

export interface MergeResult {
  success: boolean;
  merged: WorkflowSnapshot;
  conflicts: Conflict[];
  newVersion: WorkflowVersion;
  messages: string[];
}

export interface CreateBranchOptions {
  workflowId: string;
  branchName: string;
  fromBranch?: string;
  fromVersion?: number;
  createdBy: string;
  description?: string;
  isProtected?: boolean;
}

export class WorkflowBranchingService {
  private branches: Map<string, Branch[]> = new Map();
  private currentBranches: Map<string, string> = new Map();
  private versioningService = getVersioningService();
  private diffService = getDiffService();

  private defaultBranches = ['main', 'development', 'staging', 'production'];

  constructor() {
    logger.info('WorkflowBranchingService initialized');
  }

  /**
   * Initialize default branches for a workflow
   */
  async initializeDefaultBranches(
    workflowId: string,
    createdBy: string
  ): Promise<Branch[]> {
    const branches: Branch[] = [];

    for (const branchName of this.defaultBranches) {
      const branch: Branch = {
        name: branchName,
        workflowId,
        baseVersion: 0,
        headVersion: 0,
        createdAt: new Date(),
        createdBy,
        isDefault: branchName === 'main',
        isProtected: ['main', 'production'].includes(branchName),
        mergedInto: []
      };

      branches.push(branch);
    }

    this.branches.set(workflowId, branches);
    this.currentBranches.set(workflowId, 'main');

    logger.info('Default branches initialized', { workflowId, branches: this.defaultBranches });

    return branches;
  }

  /**
   * Create a new branch
   */
  async createBranch(options: CreateBranchOptions): Promise<Branch> {
    const {
      workflowId,
      branchName,
      fromBranch = 'main',
      fromVersion,
      createdBy,
      description,
      isProtected = false
    } = options;

    try {
      // Validate branch name
      if (!this.isValidBranchName(branchName)) {
        throw new Error(
          'Invalid branch name. Use alphanumeric characters, hyphens, and underscores only.'
        );
      }

      // Check if branch already exists
      const existingBranches = this.branches.get(workflowId) || [];
      if (existingBranches.some(b => b.name === branchName)) {
        throw new Error(`Branch '${branchName}' already exists`);
      }

      // Get source branch
      const sourceBranch = existingBranches.find(b => b.name === fromBranch);
      if (!sourceBranch && fromBranch !== 'main') {
        throw new Error(`Source branch '${fromBranch}' not found`);
      }

      // Determine base version
      let baseVersion = fromVersion;
      if (!baseVersion) {
        if (sourceBranch) {
          baseVersion = sourceBranch.headVersion;
        } else {
          // Get latest version from versioning service
          const history = await this.versioningService.getVersionHistory(
            workflowId,
            fromBranch
          );
          baseVersion = history.currentVersion;
        }
      }

      // Create branch
      const branch: Branch = {
        name: branchName,
        workflowId,
        baseVersion,
        baseBranch: fromBranch,
        headVersion: baseVersion,
        createdAt: new Date(),
        createdBy,
        description,
        isDefault: false,
        isProtected,
        mergedInto: []
      };

      existingBranches.push(branch);
      this.branches.set(workflowId, existingBranches);

      logger.info('Branch created', {
        workflowId,
        branchName,
        fromBranch,
        baseVersion,
        createdBy
      });

      return branch;
    } catch (error) {
      logger.error('Failed to create branch', {
        workflowId,
        branchName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Delete a branch
   */
  async deleteBranch(
    workflowId: string,
    branchName: string,
    force: boolean = false
  ): Promise<void> {
    try {
      const branches = this.branches.get(workflowId) || [];
      const branch = branches.find(b => b.name === branchName);

      if (!branch) {
        throw new Error(`Branch '${branchName}' not found`);
      }

      // Prevent deletion of default branch
      if (branch.isDefault) {
        throw new Error('Cannot delete default branch');
      }

      // Check if branch is protected
      if (branch.isProtected && !force) {
        throw new Error(
          `Branch '${branchName}' is protected. Use force=true to override.`
        );
      }

      // Check if branch is current
      if (this.currentBranches.get(workflowId) === branchName) {
        throw new Error(
          'Cannot delete current branch. Switch to another branch first.'
        );
      }

      // Remove branch
      const updatedBranches = branches.filter(b => b.name !== branchName);
      this.branches.set(workflowId, updatedBranches);

      logger.info('Branch deleted', { workflowId, branchName, forced: force });
    } catch (error) {
      logger.error('Failed to delete branch', {
        workflowId,
        branchName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Switch to a different branch
   */
  async switchBranch(
    workflowId: string,
    branchName: string
  ): Promise<WorkflowSnapshot> {
    try {
      const branches = this.branches.get(workflowId) || [];
      const targetBranch = branches.find(b => b.name === branchName);

      if (!targetBranch) {
        throw new Error(`Branch '${branchName}' not found`);
      }

      // Get latest version on target branch
      const version = await this.versioningService.getVersion(
        workflowId,
        targetBranch.headVersion,
        branchName
      );

      if (!version) {
        throw new Error(`No version found for branch '${branchName}'`);
      }

      // Update current branch
      this.currentBranches.set(workflowId, branchName);

      logger.info('Switched branch', {
        workflowId,
        branchName,
        version: targetBranch.headVersion
      });

      return version.snapshot;
    } catch (error) {
      logger.error('Failed to switch branch', {
        workflowId,
        branchName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * List all branches for a workflow
   */
  async listBranches(workflowId: string): Promise<Branch[]> {
    const branches = this.branches.get(workflowId) || [];
    return branches.sort((a, b) => {
      // Default branch first
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      // Then by creation date
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /**
   * Get current branch
   */
  getCurrentBranch(workflowId: string): string {
    return this.currentBranches.get(workflowId) || 'main';
  }

  /**
   * Get branch information
   */
  async getBranch(workflowId: string, branchName: string): Promise<Branch | null> {
    const branches = this.branches.get(workflowId) || [];
    return branches.find(b => b.name === branchName) || null;
  }

  /**
   * Merge branches
   */
  async mergeBranches(options: MergeOptions): Promise<MergeResult> {
    const {
      sourceBranch,
      targetBranch,
      strategy = 'auto',
      commitMessage,
      createdBy,
      resolveConflicts = false,
      fastForward = true
    } = options;

    try {
      logger.info('Starting merge', {
        sourceBranch,
        targetBranch,
        strategy
      });

      // Get source and target branch info
      // Support format: workflowId:branchName or just branchName
      const parseRef = (ref: string) => {
        if (ref.includes(':')) {
          const [wfId, ...rest] = ref.split(':');
          return { workflowId: wfId, branchName: rest.join(':') };
        }
        return { workflowId: ref, branchName: ref };
      };

      const sourceRef = parseRef(sourceBranch);
      const targetRef = parseRef(targetBranch);
      const workflowId = sourceRef.workflowId;

      const branches = this.branches.get(workflowId) || [];
      const source = branches.find(b => b.name === sourceRef.branchName);
      const target = branches.find(b => b.name === targetRef.branchName);

      if (!source || !target) {
        throw new Error('Source or target branch not found');
      }

      // Get versions
      const sourceVersion = await this.versioningService.getVersion(
        source.workflowId,
        source.headVersion,
        sourceRef.branchName
      );

      const targetVersion = await this.versioningService.getVersion(
        target.workflowId,
        target.headVersion,
        targetRef.branchName
      );

      if (!sourceVersion || !targetVersion) {
        throw new Error('Version not found for merge');
      }

      // Check if fast-forward merge is possible
      if (fastForward && this.canFastForward(source, target)) {
        return await this.fastForwardMerge(source, target, sourceVersion, createdBy);
      }

      // Get base version (common ancestor)
      const baseVersion = await this.findCommonAncestor(source, target);

      // Perform three-way merge
      const mergeResult = await this.diffService.mergeSnapshots(
        baseVersion?.snapshot || targetVersion.snapshot,
        sourceVersion.snapshot,
        targetVersion.snapshot,
        strategy === 'ours' || strategy === 'theirs' ? strategy : 'manual'
      );

      // Check for conflicts
      if (mergeResult.conflicts.length > 0 && !resolveConflicts) {
        return {
          success: false,
          merged: mergeResult.merged,
          conflicts: mergeResult.conflicts,
          newVersion: targetVersion,
          messages: [
            `Merge has ${mergeResult.conflicts.length} conflict(s). Set resolveConflicts=true to auto-resolve.`
          ]
        };
      }

      // Create new version on target branch
      const newVersion = await this.versioningService.createVersion({
        workflowId: target.workflowId,
        snapshot: mergeResult.merged,
        createdBy,
        description: commitMessage || `Merge ${sourceRef.branchName} into ${targetRef.branchName}`,
        tags: ['merge'],
        branch: targetRef.branchName
      });

      // Update merge metadata
      newVersion.metadata.mergeInfo = {
        sourceBranch,
        targetBranch,
        mergeStrategy: strategy === 'recursive' ? 'auto' : strategy
      };

      // Update branch head
      target.headVersion = newVersion.version;
      if (!target.mergedInto) target.mergedInto = [];
      if (!target.mergedInto.includes(sourceBranch)) {
        target.mergedInto.push(sourceBranch);
      }

      logger.info('Merge completed', {
        sourceBranch,
        targetBranch,
        newVersion: newVersion.version,
        conflicts: mergeResult.conflicts.length
      });

      return {
        success: true,
        merged: mergeResult.merged,
        conflicts: mergeResult.conflicts,
        newVersion,
        messages: [
          `Successfully merged ${sourceBranch} into ${targetBranch}`,
          `Created version ${newVersion.version}`
        ]
      };
    } catch (error) {
      logger.error('Failed to merge branches', {
        sourceBranch,
        targetBranch,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate branch graph for visualization
   */
  async getBranchGraph(workflowId: string): Promise<BranchGraph> {
    const branches = this.branches.get(workflowId) || [];
    const history = await this.versioningService.getVersionHistory(workflowId);
    const currentBranch = this.getCurrentBranch(workflowId);

    // Build branch nodes
    const branchNodes: BranchNode[] = branches.map(branch => {
      const branchVersions = history.versions
        .filter(v => v.branch === branch.name)
        .map(v => v.version);

      return {
        branch: branch.name,
        versions: branchVersions,
        current: branch.name === currentBranch
      };
    });

    // Build merge edges
    const merges: MergeEdge[] = [];

    for (const version of history.versions) {
      if (version.metadata.mergeInfo) {
        merges.push({
          from: version.metadata.mergeInfo.sourceBranch,
          to: version.metadata.mergeInfo.targetBranch,
          version: version.version,
          timestamp: version.metadata.timestamp,
          strategy: version.metadata.mergeInfo.mergeStrategy as MergeStrategy
        });
      }
    }

    return {
      workflowId,
      branches: branchNodes,
      merges
    };
  }

  /**
   * Rename a branch
   */
  async renameBranch(
    workflowId: string,
    oldName: string,
    newName: string
  ): Promise<void> {
    try {
      if (!this.isValidBranchName(newName)) {
        throw new Error('Invalid new branch name');
      }

      const branches = this.branches.get(workflowId) || [];
      const branch = branches.find(b => b.name === oldName);

      if (!branch) {
        throw new Error(`Branch '${oldName}' not found`);
      }

      if (branch.isDefault) {
        throw new Error('Cannot rename default branch');
      }

      if (branches.some(b => b.name === newName)) {
        throw new Error(`Branch '${newName}' already exists`);
      }

      // Update branch name
      branch.name = newName;

      // Update current branch if needed
      if (this.currentBranches.get(workflowId) === oldName) {
        this.currentBranches.set(workflowId, newName);
      }

      logger.info('Branch renamed', { workflowId, oldName, newName });
    } catch (error) {
      logger.error('Failed to rename branch', {
        workflowId,
        oldName,
        newName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Protect/unprotect a branch
   */
  async setBranchProtection(
    workflowId: string,
    branchName: string,
    isProtected: boolean
  ): Promise<void> {
    const branches = this.branches.get(workflowId) || [];
    const branch = branches.find(b => b.name === branchName);

    if (!branch) {
      throw new Error(`Branch '${branchName}' not found`);
    }

    branch.isProtected = isProtected;

    logger.info('Branch protection updated', {
      workflowId,
      branchName,
      isProtected
    });
  }

  /**
   * Update the head version of a branch
   * This should be called after creating a new version on the branch
   */
  async updateBranchHead(
    workflowId: string,
    branchName: string,
    version: number
  ): Promise<void> {
    const branches = this.branches.get(workflowId) || [];
    const branch = branches.find(b => b.name === branchName);

    if (!branch) {
      throw new Error(`Branch '${branchName}' not found`);
    }

    branch.headVersion = version;

    logger.info('Branch head updated', {
      workflowId,
      branchName,
      version
    });
  }

  /**
   * Get branch comparison (diff between branches)
   */
  async compareBranches(
    workflowId: string,
    branch1: string,
    branch2: string
  ): Promise<{
    diff: any;
    divergence: number;
    commonAncestor: number | null;
  }> {
    const branches = this.branches.get(workflowId) || [];
    const b1 = branches.find(b => b.name === branch1);
    const b2 = branches.find(b => b.name === branch2);

    if (!b1 || !b2) {
      throw new Error('One or both branches not found');
    }

    const version1 = await this.versioningService.getVersion(
      workflowId,
      b1.headVersion,
      branch1
    );

    const version2 = await this.versioningService.getVersion(
      workflowId,
      b2.headVersion,
      branch2
    );

    if (!version1 || !version2) {
      throw new Error('Version not found for comparison');
    }

    const comparison = await this.diffService.compareSnapshots(
      version1.snapshot,
      version2.snapshot
    );

    const commonAncestor = await this.findCommonAncestor(b1, b2);
    const divergence = Math.abs(b1.headVersion - b2.headVersion);

    return {
      diff: comparison.diff,
      divergence,
      commonAncestor: commonAncestor?.version || null
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Validate branch name
   */
  private isValidBranchName(name: string): boolean {
    // Allow alphanumeric, hyphens, underscores, and forward slashes
    const pattern = /^[a-zA-Z0-9/_-]+$/;
    return pattern.test(name) && name.length > 0 && name.length <= 100;
  }

  /**
   * Check if fast-forward merge is possible
   */
  private canFastForward(source: Branch, target: Branch): boolean {
    // Fast-forward is possible if target is an ancestor of source
    return target.headVersion <= source.baseVersion;
  }

  /**
   * Perform fast-forward merge
   */
  private async fastForwardMerge(
    source: Branch,
    target: Branch,
    sourceVersion: WorkflowVersion,
    createdBy: string
  ): Promise<MergeResult> {
    // Simply update target to point to source version
    target.headVersion = source.headVersion;

    logger.info('Fast-forward merge completed', {
      sourceBranch: source.name,
      targetBranch: target.name,
      newHead: target.headVersion
    });

    return {
      success: true,
      merged: sourceVersion.snapshot,
      conflicts: [],
      newVersion: sourceVersion,
      messages: ['Fast-forward merge completed']
    };
  }

  /**
   * Find common ancestor between two branches
   */
  private async findCommonAncestor(
    branch1: Branch,
    branch2: Branch
  ): Promise<WorkflowVersion | null> {
    // Get version history for both branches
    const history1 = await this.versioningService.getVersionHistory(
      branch1.workflowId,
      branch1.name
    );

    const history2 = await this.versioningService.getVersionHistory(
      branch2.workflowId,
      branch2.name
    );

    // Find common versions
    const versions1 = new Set(history1.versions.map(v => v.version));
    const commonVersions = history2.versions.filter(v => versions1.has(v.version));

    if (commonVersions.length === 0) {
      return null;
    }

    // Return the latest common version
    return commonVersions.sort((a, b) => b.version - a.version)[0];
  }
}

// Singleton instance
let branchingServiceInstance: WorkflowBranchingService | null = null;

export function getBranchingService(): WorkflowBranchingService {
  if (!branchingServiceInstance) {
    branchingServiceInstance = new WorkflowBranchingService();
  }
  return branchingServiceInstance;
}

export function initializeBranchingService(): WorkflowBranchingService {
  if (branchingServiceInstance) {
    logger.warn('Branching service already initialized');
    return branchingServiceInstance;
  }

  branchingServiceInstance = new WorkflowBranchingService();
  return branchingServiceInstance;
}

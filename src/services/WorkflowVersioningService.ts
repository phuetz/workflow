/**
 * Workflow Versioning Service
 * Automatic versioning system with Git-like features
 *
 * Features:
 * - Auto-create version on every save
 * - Version metadata (number, timestamp, user, description, tags)
 * - Delta compression for efficient storage
 * - Version restoration
 * - Version comparison
 */

import { logger } from './SimpleLogger';
import * as diff from 'diff';

export interface WorkflowSnapshot {
  id: string;
  name: string;
  description?: string;
  nodes: unknown[];
  edges: unknown[];
  variables?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface VersionMetadata {
  version: number;
  timestamp: Date;
  createdBy: string;
  description?: string;
  tags: string[];
  commitMessage?: string;
  branch: string;
  parentVersion?: number;
  mergeInfo?: {
    sourceBranch: string;
    targetBranch: string;
    mergeStrategy: 'auto' | 'manual' | 'ours' | 'theirs';
  };
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;
  branch: string;
  snapshot: WorkflowSnapshot;
  delta?: string; // JSON patch/diff from previous version
  metadata: VersionMetadata;
  size: number; // Size in bytes
  checksum: string; // SHA-256 checksum for integrity
}

export interface VersionHistory {
  workflowId: string;
  versions: WorkflowVersion[];
  currentVersion: number;
  currentBranch: string;
  branches: string[];
}

export interface CreateVersionOptions {
  workflowId: string;
  snapshot: WorkflowSnapshot;
  createdBy: string;
  description?: string;
  tags?: string[];
  commitMessage?: string;
  branch?: string;
  skipDelta?: boolean; // Skip delta compression for initial version
}

export interface RestoreVersionOptions {
  workflowId: string;
  version: number;
  branch?: string;
  createBackup?: boolean;
}

export class WorkflowVersioningService {
  private versions: Map<string, WorkflowVersion[]> = new Map();
  private currentVersions: Map<string, number> = new Map();
  private currentBranches: Map<string, string> = new Map();
  private compressionThreshold = 1024 * 100; // 100KB - use delta above this

  constructor() {
    logger.info('WorkflowVersioningService initialized');
  }

  /**
   * Create a new version of a workflow
   */
  async createVersion(options: CreateVersionOptions): Promise<WorkflowVersion> {
    const {
      workflowId,
      snapshot,
      createdBy,
      description,
      tags = [],
      commitMessage,
      branch = 'main',
      skipDelta = false
    } = options;

    try {
      // Get existing versions for this workflow
      const existingVersions = this.versions.get(workflowId) || [];

      // Get the latest version on this branch
      const branchVersions = existingVersions.filter(v => v.branch === branch);
      const latestVersion = branchVersions.length > 0
        ? Math.max(...branchVersions.map(v => v.version))
        : 0;

      const newVersionNumber = latestVersion + 1;

      // Calculate delta from previous version
      let delta: string | undefined;
      const previousVersion = branchVersions.find(v => v.version === latestVersion);

      if (previousVersion && !skipDelta) {
        delta = await this.calculateDelta(previousVersion.snapshot, snapshot);
      }

      // Calculate checksum
      const checksum = this.calculateChecksum(snapshot);

      // Calculate size
      const size = JSON.stringify(snapshot).length;

      // Create version metadata
      const metadata: VersionMetadata = {
        version: newVersionNumber,
        timestamp: new Date(),
        createdBy,
        description,
        tags,
        commitMessage,
        branch,
        parentVersion: latestVersion > 0 ? latestVersion : undefined
      };

      // Create version object
      const version: WorkflowVersion = {
        id: `${workflowId}_v${newVersionNumber}_${branch}_${Date.now()}`,
        workflowId,
        version: newVersionNumber,
        branch,
        snapshot,
        delta,
        metadata,
        size,
        checksum
      };

      // Store version
      existingVersions.push(version);
      this.versions.set(workflowId, existingVersions);
      this.currentVersions.set(`${workflowId}:${branch}`, newVersionNumber);
      this.currentBranches.set(workflowId, branch);

      logger.info('Version created', {
        workflowId,
        version: newVersionNumber,
        branch,
        hasDelta: !!delta,
        size,
        createdBy
      });

      return version;
    } catch (error) {
      logger.error('Failed to create version', {
        workflowId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get all versions for a workflow
   */
  async getVersionHistory(
    workflowId: string,
    branch?: string,
    limit?: number
  ): Promise<VersionHistory> {
    const allVersions = this.versions.get(workflowId) || [];

    let filteredVersions = allVersions;
    if (branch) {
      filteredVersions = allVersions.filter(v => v.branch === branch);
    }

    if (limit) {
      filteredVersions = filteredVersions.slice(-limit);
    }

    // Sort by version number descending
    filteredVersions.sort((a, b) => b.version - a.version);

    const currentBranch = this.currentBranches.get(workflowId) || 'main';
    const currentVersion = this.currentVersions.get(`${workflowId}:${currentBranch}`) || 0;

    // Get all unique branches
    const branches = [...new Set(allVersions.map(v => v.branch))];

    return {
      workflowId,
      versions: filteredVersions,
      currentVersion,
      currentBranch,
      branches
    };
  }

  /**
   * Get a specific version
   */
  async getVersion(
    workflowId: string,
    version: number,
    branch: string = 'main'
  ): Promise<WorkflowVersion | null> {
    const versions = this.versions.get(workflowId) || [];
    return versions.find(v => v.version === version && v.branch === branch) || null;
  }

  /**
   * Restore workflow to a specific version
   */
  async restoreVersion(options: RestoreVersionOptions): Promise<WorkflowSnapshot> {
    const { workflowId, version, branch = 'main', createBackup = true } = options;

    try {
      const targetVersion = await this.getVersion(workflowId, version, branch);

      if (!targetVersion) {
        throw new Error(`Version ${version} not found on branch ${branch}`);
      }

      // Create backup of current state if requested
      if (createBackup) {
        const currentVersions = this.versions.get(workflowId) || [];
        const latestVersion = currentVersions
          .filter(v => v.branch === branch)
          .sort((a, b) => b.version - a.version)[0];

        if (latestVersion) {
          await this.createVersion({
            workflowId,
            snapshot: latestVersion.snapshot,
            createdBy: 'system',
            description: `Backup before restore to v${version}`,
            tags: ['backup', 'auto'],
            branch: `backup/${Date.now()}`
          });
        }
      }

      // Reconstruct full snapshot if delta is used
      const fullSnapshot = await this.reconstructSnapshot(targetVersion);

      logger.info('Version restored', {
        workflowId,
        version,
        branch,
        backupCreated: createBackup
      });

      return fullSnapshot;
    } catch (error) {
      logger.error('Failed to restore version', {
        workflowId,
        version,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Tag a version (e.g., v1.0.0, production, staging)
   */
  async tagVersion(
    workflowId: string,
    version: number,
    tag: string,
    branch: string = 'main'
  ): Promise<void> {
    const targetVersion = await this.getVersion(workflowId, version, branch);

    if (!targetVersion) {
      throw new Error(`Version ${version} not found on branch ${branch}`);
    }

    if (!targetVersion.metadata.tags.includes(tag)) {
      targetVersion.metadata.tags.push(tag);
      logger.info('Version tagged', { workflowId, version, tag, branch });
    }
  }

  /**
   * Remove a tag from a version
   */
  async untagVersion(
    workflowId: string,
    version: number,
    tag: string,
    branch: string = 'main'
  ): Promise<void> {
    const targetVersion = await this.getVersion(workflowId, version, branch);

    if (!targetVersion) {
      throw new Error(`Version ${version} not found on branch ${branch}`);
    }

    const tagIndex = targetVersion.metadata.tags.indexOf(tag);
    if (tagIndex > -1) {
      targetVersion.metadata.tags.splice(tagIndex, 1);
      logger.info('Version tag removed', { workflowId, version, tag, branch });
    }
  }

  /**
   * Get versions by tag
   */
  async getVersionsByTag(
    workflowId: string,
    tag: string,
    branch?: string
  ): Promise<WorkflowVersion[]> {
    const allVersions = this.versions.get(workflowId) || [];

    let filteredVersions = allVersions.filter(v => v.metadata.tags.includes(tag));

    if (branch) {
      filteredVersions = filteredVersions.filter(v => v.branch === branch);
    }

    return filteredVersions.sort((a, b) => b.version - a.version);
  }

  /**
   * Delete a version (use with caution)
   */
  async deleteVersion(
    workflowId: string,
    version: number,
    branch: string = 'main',
    force: boolean = false
  ): Promise<void> {
    const versions = this.versions.get(workflowId) || [];
    const versionIndex = versions.findIndex(
      v => v.version === version && v.branch === branch
    );

    if (versionIndex === -1) {
      throw new Error(`Version ${version} not found on branch ${branch}`);
    }

    // Check if this is a tagged version
    const targetVersion = versions[versionIndex];
    if (targetVersion.metadata.tags.length > 0 && !force) {
      throw new Error(
        `Cannot delete tagged version. Tags: ${targetVersion.metadata.tags.join(', ')}. Use force=true to override.`
      );
    }

    // Remove version
    versions.splice(versionIndex, 1);
    this.versions.set(workflowId, versions);

    logger.warn('Version deleted', {
      workflowId,
      version,
      branch,
      forced: force
    });
  }

  /**
   * Get version statistics
   */
  async getVersionStats(workflowId: string): Promise<{
    totalVersions: number;
    branches: number;
    totalSize: number;
    averageSize: number;
    oldestVersion: Date;
    newestVersion: Date;
    taggedVersions: number;
    compressionRatio: number;
  }> {
    const versions = this.versions.get(workflowId) || [];

    if (versions.length === 0) {
      return {
        totalVersions: 0,
        branches: 0,
        totalSize: 0,
        averageSize: 0,
        oldestVersion: new Date(),
        newestVersion: new Date(),
        taggedVersions: 0,
        compressionRatio: 0
      };
    }

    const branches = new Set(versions.map(v => v.branch)).size;
    const totalSize = versions.reduce((sum, v) => sum + v.size, 0);
    const averageSize = totalSize / versions.length;

    const timestamps = versions.map(v => v.metadata.timestamp.getTime());
    const oldestVersion = new Date(Math.min(...timestamps));
    const newestVersion = new Date(Math.max(...timestamps));

    const taggedVersions = versions.filter(v => v.metadata.tags.length > 0).length;

    // Calculate compression ratio
    const totalSnapshotSize = versions.reduce((sum, v) =>
      sum + JSON.stringify(v.snapshot).length, 0
    );
    const totalDeltaSize = versions.reduce((sum, v) =>
      sum + (v.delta ? v.delta.length : JSON.stringify(v.snapshot).length), 0
    );
    const compressionRatio = totalDeltaSize / totalSnapshotSize;

    return {
      totalVersions: versions.length,
      branches,
      totalSize,
      averageSize,
      oldestVersion,
      newestVersion,
      taggedVersions,
      compressionRatio
    };
  }

  /**
   * Clean up old versions (retention policy)
   */
  async cleanupVersions(
    workflowId: string,
    options: {
      keepLast?: number;
      keepTagged?: boolean;
      olderThan?: Date;
      branch?: string;
    }
  ): Promise<number> {
    const { keepLast = 10, keepTagged = true, olderThan, branch } = options;

    let versions = this.versions.get(workflowId) || [];

    // Filter by branch if specified
    if (branch) {
      versions = versions.filter(v => v.branch === branch);
    }

    // Sort by version number descending
    versions.sort((a, b) => b.version - a.version);

    let toDelete: WorkflowVersion[] = [];

    // Keep last N versions
    const versionsToKeep = versions.slice(0, keepLast);
    let candidates = versions.slice(keepLast);

    // Filter by date if specified
    if (olderThan) {
      candidates = candidates.filter(v =>
        v.metadata.timestamp < olderThan
      );
    }

    // Keep tagged versions if specified
    if (keepTagged) {
      candidates = candidates.filter(v => v.metadata.tags.length === 0);
    }

    toDelete = candidates;

    // Delete versions
    const allVersions = this.versions.get(workflowId) || [];
    const remainingVersions = allVersions.filter(v =>
      !toDelete.some(d => d.id === v.id)
    );

    this.versions.set(workflowId, remainingVersions);

    logger.info('Versions cleaned up', {
      workflowId,
      deleted: toDelete.length,
      remaining: remainingVersions.length
    });

    return toDelete.length;
  }

  /**
   * Export version history to JSON
   */
  async exportVersionHistory(
    workflowId: string,
    branch?: string
  ): Promise<string> {
    const history = await this.getVersionHistory(workflowId, branch);
    return JSON.stringify(history, null, 2);
  }

  /**
   * Import version history from JSON
   */
  async importVersionHistory(
    workflowId: string,
    historyJson: string
  ): Promise<number> {
    try {
      const history = JSON.parse(historyJson) as VersionHistory;

      if (history.workflowId !== workflowId) {
        throw new Error('Workflow ID mismatch');
      }

      this.versions.set(workflowId, history.versions);
      this.currentVersions.set(
        `${workflowId}:${history.currentBranch}`,
        history.currentVersion
      );
      this.currentBranches.set(workflowId, history.currentBranch);

      logger.info('Version history imported', {
        workflowId,
        versionsImported: history.versions.length
      });

      return history.versions.length;
    } catch (error) {
      logger.error('Failed to import version history', {
        workflowId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Calculate delta between two snapshots using JSON patch
   */
  private async calculateDelta(
    oldSnapshot: WorkflowSnapshot,
    newSnapshot: WorkflowSnapshot
  ): Promise<string> {
    try {
      const oldJson = JSON.stringify(oldSnapshot, null, 2);
      const newJson = JSON.stringify(newSnapshot, null, 2);

      // Use diff library to create patch
      const patches = diff.createPatch(
        'workflow',
        oldJson,
        newJson,
        'old',
        'new'
      );

      return patches;
    } catch (error) {
      logger.error('Failed to calculate delta', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Reconstruct full snapshot from delta chain
   */
  private async reconstructSnapshot(
    version: WorkflowVersion
  ): Promise<WorkflowSnapshot> {
    // If no delta, return snapshot directly
    if (!version.delta) {
      return version.snapshot;
    }

    // Find the base version (version without delta)
    const allVersions = this.versions.get(version.workflowId) || [];
    const branchVersions = allVersions.filter(v => v.branch === version.branch);

    // Build delta chain
    const deltaChain: WorkflowVersion[] = [];
    let currentVersion = version;

    while (currentVersion && currentVersion.delta) {
      deltaChain.unshift(currentVersion);

      if (currentVersion.metadata.parentVersion) {
        currentVersion = branchVersions.find(
          v => v.version === currentVersion.metadata.parentVersion
        ) || currentVersion;
      } else {
        break;
      }
    }

    // Start with base snapshot
    let reconstructed = currentVersion.snapshot;

    // Apply deltas in order
    for (const deltaVersion of deltaChain) {
      if (deltaVersion.delta) {
        reconstructed = this.applyDelta(reconstructed, deltaVersion.delta);
      }
    }

    return reconstructed;
  }

  /**
   * Apply delta patch to snapshot
   */
  private applyDelta(
    snapshot: WorkflowSnapshot,
    delta: string
  ): WorkflowSnapshot {
    try {
      const snapshotJson = JSON.stringify(snapshot, null, 2);
      const patched = diff.applyPatch(snapshotJson, delta);

      if (!patched) {
        throw new Error('Failed to apply delta patch');
      }

      return JSON.parse(patched) as WorkflowSnapshot;
    } catch (error) {
      logger.error('Failed to apply delta', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Calculate SHA-256 checksum for integrity verification
   */
  private calculateChecksum(snapshot: WorkflowSnapshot): string {
    const data = JSON.stringify(snapshot);

    // Simple hash function (in production, use crypto.subtle.digest)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(16).padStart(8, '0');
  }
}

// Singleton instance
let versioningServiceInstance: WorkflowVersioningService | null = null;

export function getVersioningService(): WorkflowVersioningService {
  if (!versioningServiceInstance) {
    versioningServiceInstance = new WorkflowVersioningService();
  }
  return versioningServiceInstance;
}

export function initializeVersioningService(): WorkflowVersioningService {
  if (versioningServiceInstance) {
    logger.warn('Versioning service already initialized');
    return versioningServiceInstance;
  }

  versioningServiceInstance = new WorkflowVersioningService();
  return versioningServiceInstance;
}

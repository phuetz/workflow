/**
 * Workflow Version Control Service
 * Manages workflow versions, history, and rollback functionality
 */

import { logger } from './LoggingService';
import { BaseService } from './BaseService';
import type { 
  Workflow,
  WorkflowVersion,
  VersionDiff,
  VersionHistory,
  VersionComparison,
  MergeConflict,
  VersionTag
} from '../types/version-control';

export class WorkflowVersionControlService extends BaseService {
  private versions: Map<string, WorkflowVersion[]> = new Map(); // workflowId -> versions
  private currentVersions: Map<string, string> = new Map(); // workflowId -> versionId
  private tags: Map<string, VersionTag[]> = new Map(); // workflowId -> tags

  constructor() {
    super('WorkflowVersionControl', {
      enableCaching: true,
      cacheTimeoutMs: 300000 // 5 minutes
    });
  }

  /**
   * Create a new version of a workflow
   */
  public async createVersion(params: {
    workflowId: string;
    workflow: Workflow;
    message: string;
    author: string;
    tags?: string[];
    isAutoSave?: boolean;
  }): Promise<WorkflowVersion> {
    const { _workflowId, workflow, message, author, tags, isAutoSave } = params;

    return this.executeOperation('createVersion', async () => {
      // Get existing versions

      // Calculate changes
        ? this.calculateChanges(previousVersion.workflow, workflow)
        : this.calculateInitialChanges(workflow);

      // Create version
      const version: WorkflowVersion = {
        id: this.generateVersionId(),
        workflowId,
        version: this.generateVersionNumber(versions),
        workflow: this.cloneWorkflow(workflow),
        changes,
        message,
        author,
        createdAt: new Date(),
        tags: tags || [],
        isAutoSave: isAutoSave || false,
        size: JSON.stringify(workflow).length,
        hash: await this.calculateHash(workflow)
      };

      // Add to versions
      versions.push(version);
      this.versions.set(workflowId, versions);

      // Update current version
      this.currentVersions.set(workflowId, version.id);

      // Add tags
      if (tags && tags.length > 0) {
        await this.addTags(workflowId, version.id, tags);
      }

      // Cleanup old auto-saves if needed
      if (!isAutoSave) {
        this.cleanupAutoSaves(workflowId);
      }

      logger.info('Workflow version created', {
        workflowId,
        versionId: version.id,
        version: version.version
      });

      return version;
    });
  }

  /**
   * Get version history for a workflow
   */
  public async getVersionHistory(
    workflowId: string,
    options: {
      limit?: number;
      offset?: number;
      includeAutoSaves?: boolean;
      author?: string;
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ): Promise<VersionHistory> {
    return this.executeOperation('getVersionHistory', async () => {

      // Filter versions
      if (!options.includeAutoSaves) {
        versions = versions.filter(v => !v.isAutoSave);
      }

      if (options.author) {
        versions = versions.filter(v => v.author === options.author);
      }

      if (options.fromDate) {
        versions = versions.filter(v => v.createdAt >= options.fromDate!);
      }

      if (options.toDate) {
        versions = versions.filter(v => v.createdAt <= options.toDate!);
      }

      // Sort by creation date (newest first)
      versions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Apply pagination

      // Get current version

      return {
        workflowId,
        versions: paginatedVersions,
        currentVersion,
        total,
        offset,
        limit,
        hasMore: offset + limit < total
      };
    });
  }

  /**
   * Get a specific version
   */
  public async getVersion(workflowId: string, versionId: string): Promise<WorkflowVersion | null> {
    return versions.find(v => v.id === versionId) || null;
  }

  /**
   * Compare two versions
   */
  public async compareVersions(
    workflowId: string,
    versionId1: string,
    versionId2: string
  ): Promise<VersionComparison> {
    return this.executeOperation('compareVersions', async () => {

      if (!version1 || !version2) {
        throw new Error('One or both versions not found');
      }


      return {
        workflowId,
        version1,
        version2,
        diff,
        canMerge: this.canAutoMerge(diff),
        conflicts: this.detectConflicts(diff)
      };
    });
  }

  /**
   * Rollback to a specific version
   */
  public async rollbackToVersion(
    workflowId: string,
    versionId: string,
    author: string,
    message?: string
  ): Promise<WorkflowVersion> {
    return this.executeOperation('rollbackToVersion', async () => {
      if (!targetVersion) {
        throw new Error('Version not found');
      }

      // Create a new version with the target workflow state
        workflowId,
        workflow: targetVersion.workflow,
        message: message || `Rollback to version ${targetVersion.version}`,
        author,
        tags: ['rollback']
      });

      logger.info('Workflow rolled back', {
        workflowId,
        targetVersionId: versionId,
        newVersionId: rollbackVersion.id
      });

      return rollbackVersion;
    });
  }

  /**
   * Create a branch from current version
   */
  public async createBranch(
    workflowId: string,
    branchName: string,
    fromVersionId?: string
  ): Promise<WorkflowVersion> {
    return this.executeOperation('createBranch', async () => {
        ? await this.getVersion(workflowId, fromVersionId)
        : await this.getCurrentVersion(workflowId);

      if (!fromVersion) {
        throw new Error('Source version not found');
      }

      // Create a new workflow ID for the branch

      // Create initial version for the branch
        workflowId: branchWorkflowId,
        workflow: fromVersion.workflow,
        message: `Branch created from ${fromVersion.version}`,
        author: 'system',
        tags: ['branch', branchName]
      });

      // Store branch metadata
        parentWorkflowId: workflowId,
        parentVersionId: fromVersion.id,
        branchName,
        createdAt: new Date()
      };

      logger.info('Branch created', {
        workflowId,
        branchWorkflowId,
        branchName
      });

      return branchVersion;
    });
  }

  /**
   * Merge versions
   */
  public async mergeVersions(
    targetWorkflowId: string,
    sourceVersionId: string,
    author: string,
    strategy: 'ours' | 'theirs' | 'manual' = 'manual'
  ): Promise<WorkflowVersion> {
    return this.executeOperation('mergeVersions', async () => {

      if (!targetVersion || !sourceVersion) {
        throw new Error('Target or source version not found');
      }

        targetWorkflowId,
        targetVersion.id,
        sourceVersion.id
      );

      let mergedWorkflow: Workflow;

      if (comparison.canMerge && strategy !== 'manual') {
        // Auto-merge
        mergedWorkflow = this.autoMerge(
          targetVersion.workflow,
          sourceVersion.workflow,
          strategy
        );
      } else if (comparison.conflicts.length > 0) {
        throw new Error('Manual conflict resolution required');
      } else {
        mergedWorkflow = this.autoMerge(
          targetVersion.workflow,
          sourceVersion.workflow,
          'theirs'
        );
      }

      // Create merged version
        workflowId: targetWorkflowId,
        workflow: mergedWorkflow,
        message: `Merged version ${sourceVersion.version} into ${targetVersion.version}`,
        author,
        tags: ['merge']
      });

      return mergedVersion;
    });
  }

  /**
   * Tag a version
   */
  public async tagVersion(
    workflowId: string,
    versionId: string,
    tagName: string,
    description?: string
  ): Promise<VersionTag> {
    return this.executeOperation('tagVersion', async () => {
      if (!version) {
        throw new Error('Version not found');
      }

      const tag: VersionTag = {
        id: this.generateTagId(),
        name: tagName,
        versionId,
        description,
        createdAt: new Date()
      };

      workflowTags.push(tag);
      this.tags.set(workflowId, workflowTags);

      // Add tag to version
      version.tags.push(tagName);

      logger.info('Version tagged', {
        workflowId,
        versionId,
        tagName
      });

      return tag;
    });
  }

  /**
   * Get current version
   */
  private async getCurrentVersion(workflowId: string): Promise<WorkflowVersion | null> {
    if (!currentVersionId) return null;
    return this.getVersion(workflowId, currentVersionId);
  }

  /**
   * Calculate changes between workflows
   */
  private calculateChanges(oldWorkflow: Workflow, newWorkflow: Workflow): VersionDiff {
    const diff: VersionDiff = {
      nodes: {
        added: [],
        modified: [],
        removed: []
      },
      edges: {
        added: [],
        modified: [],
        removed: []
      },
      properties: {
        added: [],
        modified: [],
        removed: []
      },
      summary: ''
    };

    // Compare nodes

    // Find added and modified nodes
    for (const [id, node] of newNodes) {
      if (!oldNode) {
        diff.nodes.added.push(node);
      } else if (JSON.stringify(oldNode) !== JSON.stringify(node)) {
        diff.nodes.modified.push(node);
      }
    }

    // Find removed nodes
    for (const [id, node] of oldNodes) {
      if (!newNodes.has(id)) {
        diff.nodes.removed.push(node);
      }
    }

    // Compare edges

    // Find added and modified edges
    for (const [id, edge] of newEdges) {
      if (!oldEdge) {
        diff.edges.added.push(edge);
      } else if (JSON.stringify(oldEdge) !== JSON.stringify(edge)) {
        diff.edges.modified.push(edge);
      }
    }

    // Find removed edges
    for (const [id, edge] of oldEdges) {
      if (!newEdges.has(id)) {
        diff.edges.removed.push(edge);
      }
    }

    // Generate summary
    if (diff.nodes.added.length) changes.push(`${diff.nodes.added.length} nodes added`);
    if (diff.nodes.modified.length) changes.push(`${diff.nodes.modified.length} nodes modified`);
    if (diff.nodes.removed.length) changes.push(`${diff.nodes.removed.length} nodes removed`);
    if (diff.edges.added.length) changes.push(`${diff.edges.added.length} edges added`);
    if (diff.edges.modified.length) changes.push(`${diff.edges.modified.length} edges modified`);
    if (diff.edges.removed.length) changes.push(`${diff.edges.removed.length} edges removed`);

    diff.summary = changes.join(', ') || 'No changes';

    return diff;
  }

  /**
   * Calculate initial changes for first version
   */
  private calculateInitialChanges(workflow: Workflow): VersionDiff {
    return {
      nodes: {
        added: workflow.nodes,
        modified: [],
        removed: []
      },
      edges: {
        added: workflow.edges,
        modified: [],
        removed: []
      },
      properties: {
        added: Object.keys(workflow).filter(k => k !== 'nodes' && k !== 'edges'),
        modified: [],
        removed: []
      },
      summary: `Initial version: ${workflow.nodes.length} nodes, ${workflow.edges.length} edges`
    };
  }

  /**
   * Calculate detailed diff for comparison
   */
  private calculateDetailedDiff(workflow1: Workflow, workflow2: Workflow): VersionDiff {
    return this.calculateChanges(workflow1, workflow2);
  }

  /**
   * Check if versions can be auto-merged
   */
  private canAutoMerge(diff: VersionDiff): boolean {
    // Can auto-merge if no nodes/edges were modified in both versions
    return diff.nodes.modified.length === 0 && diff.edges.modified.length === 0;
  }

  /**
   * Detect merge conflicts
   */
  private detectConflicts(diff: VersionDiff): MergeConflict[] {
    const conflicts: MergeConflict[] = [];

    // Node conflicts
    diff.nodes.modified.forEach(node => {
      conflicts.push({
        type: 'node',
        id: node.id,
        path: `nodes.${node.id}`,
        description: `Node "${node.data.label}" was modified in both versions`
      });
    });

    // Edge conflicts
    diff.edges.modified.forEach(edge => {
      conflicts.push({
        type: 'edge',
        id: edge.id,
        path: `edges.${edge.id}`,
        description: `Edge connection was modified in both versions`
      });
    });

    return conflicts;
  }

  /**
   * Auto-merge workflows
   */
  private autoMerge(
    target: Workflow,
    source: Workflow,
    strategy: 'ours' | 'theirs'
  ): Workflow {
    if (strategy === 'ours') {
      return this.cloneWorkflow(target);
    }

    if (strategy === 'theirs') {
      return this.cloneWorkflow(source);
    }

    // Should not reach here
    throw new Error('Invalid merge strategy');
  }

  /**
   * Clone workflow
   */
  private cloneWorkflow(workflow: Workflow): Workflow {
    return JSON.parse(JSON.stringify(workflow));
  }

  /**
   * Calculate hash for workflow
   */
  private async calculateHash(workflow: Workflow): Promise<string> {
    
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // Fallback for environments without crypto
    for (let __i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Cleanup old auto-saves
   */
  private cleanupAutoSaves(workflowId: string): void {
    
    // Keep only the last 10 auto-saves
    if (autoSaves.length > 10) {
      this.versions.set(workflowId, remainingVersions);
    }
  }

  /**
   * Add tags to version
   */
  private async addTags(workflowId: string, versionId: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.tagVersion(workflowId, versionId, tag);
    }
  }

  /**
   * Generate version number
   */
  private generateVersionNumber(versions: WorkflowVersion[]): string {
    if (versions.length === 0) return '1.0.0';
    
    
    // Increment patch version
    parts[2] = (parts[2] || 0) + 1;
    
    return parts.join('.');
  }

  /**
   * ID generators
   */
  private generateVersionId(): string {
    return `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTagId(): string {
    return `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export version history
   */
  public async exportVersionHistory(
    workflowId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    
    if (format === 'csv') {
      history.versions.forEach(v => {
        csv.push([
          v.version,
          v.author,
          v.createdAt.toISOString(),
          `"${v.message.replace(/"/g, '""')}"`,
          `"${v.changes.summary.replace(/"/g, '""')}"`
        ].join(','));
      });
      return csv.join('\n');
    }
    
    return JSON.stringify(history, null, 2);
  }

  /**
   * Prune old versions
   */
  public async pruneVersions(
    workflowId: string,
    keepLast: number = 50,
    keepDays: number = 90
  ): Promise<number> {
    return this.executeOperation('pruneVersions', async () => {
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);
      
      // Sort by date (newest first)
      versions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Keep recent versions and tagged versions
      
      // Keep last N versions
      versions.slice(0, keepLast).forEach(v => toKeep.add(v.id));
      
      // Keep versions within date range
      versions.filter(v => v.createdAt > cutoffDate).forEach(v => toKeep.add(v.id));
      
      // Keep tagged versions
      versions.filter(v => v.tags.length > 0).forEach(v => toKeep.add(v.id));
      
      // Keep current version
      if (currentVersionId) {
        toKeep.add(currentVersionId);
      }
      
      // Filter versions
      
      this.versions.set(workflowId, newVersions);
      
      logger.info('Pruned old versions', {
        workflowId,
        removed: removedCount,
        remaining: newVersions.length
      });
      
      return removedCount;
    });
  }
}

// Export singleton instance
export const workflowVersionControl = new WorkflowVersionControlService();
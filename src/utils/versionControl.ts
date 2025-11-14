/**
 * Workflow Version Control
 * Git-like versioning system for workflows
 */

import type { Node, Edge } from 'reactflow';

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;
  nodes: Node[];
  edges: Edge[];
  settings?: Record<string, any>;
  commitMessage: string;
  author: string;
  authorId: string;
  timestamp: Date;
  parentVersion?: number;
  tags?: string[];
  diff?: WorkflowDiff;
}

export interface WorkflowDiff {
  nodesAdded: Node[];
  nodesRemoved: Node[];
  nodesModified: Array<{
    before: Node;
    after: Node;
    changes: string[];
  }>;
  edgesAdded: Edge[];
  edgesRemoved: Edge[];
  settingsChanged?: Record<string, { before: any; after: any }>;
}

export interface VersionHistory {
  workflowId: string;
  currentVersion: number;
  versions: WorkflowVersion[];
  branches?: VersionBranch[];
}

export interface VersionBranch {
  name: string;
  headVersion: number;
  createdAt: Date;
  createdBy: string;
  description?: string;
}

export interface MergeResult {
  success: boolean;
  conflicts?: Array<{
    type: 'node' | 'edge' | 'setting';
    id: string;
    message: string;
  }>;
  mergedNodes?: Node[];
  mergedEdges?: Edge[];
}

class VersionControl {
  private versions: Map<string, VersionHistory> = new Map();

  /**
   * Initialize version control for a workflow
   */
  initializeWorkflow(
    workflowId: string,
    nodes: Node[],
    edges: Edge[],
    author: string,
    authorId: string
  ): WorkflowVersion {
    const version: WorkflowVersion = {
      id: this.generateVersionId(),
      workflowId,
      version: 1,
      nodes: this.cloneData(nodes),
      edges: this.cloneData(edges),
      commitMessage: 'Initial commit',
      author,
      authorId,
      timestamp: new Date()
    };

    const history: VersionHistory = {
      workflowId,
      currentVersion: 1,
      versions: [version]
    };

    this.versions.set(workflowId, history);
    return version;
  }

  /**
   * Commit a new version
   */
  commit(
    workflowId: string,
    nodes: Node[],
    edges: Edge[],
    commitMessage: string,
    author: string,
    authorId: string,
    settings?: Record<string, any>
  ): WorkflowVersion {
    const history = this.versions.get(workflowId);
    if (!history) {
      throw new Error(`Workflow ${workflowId} not initialized for version control`);
    }

    const previousVersion = history.versions[history.versions.length - 1];
    const diff = this.calculateDiff(
      previousVersion.nodes,
      nodes,
      previousVersion.edges,
      edges,
      previousVersion.settings,
      settings
    );

    const version: WorkflowVersion = {
      id: this.generateVersionId(),
      workflowId,
      version: history.currentVersion + 1,
      nodes: this.cloneData(nodes),
      edges: this.cloneData(edges),
      settings: settings ? this.cloneData(settings) : undefined,
      commitMessage,
      author,
      authorId,
      timestamp: new Date(),
      parentVersion: previousVersion.version,
      diff
    };

    history.versions.push(version);
    history.currentVersion = version.version;
    this.versions.set(workflowId, history);

    return version;
  }

  /**
   * Get version history
   */
  getHistory(workflowId: string): VersionHistory | undefined {
    return this.versions.get(workflowId);
  }

  /**
   * Get specific version
   */
  getVersion(workflowId: string, version: number): WorkflowVersion | undefined {
    const history = this.versions.get(workflowId);
    return history?.versions.find(v => v.version === version);
  }

  /**
   * Revert to previous version
   */
  revert(
    workflowId: string,
    targetVersion: number,
    author: string,
    authorId: string
  ): WorkflowVersion {
    const history = this.versions.get(workflowId);
    if (!history) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const targetVer = history.versions.find(v => v.version === targetVersion);
    if (!targetVer) {
      throw new Error(`Version ${targetVersion} not found`);
    }

    return this.commit(
      workflowId,
      targetVer.nodes,
      targetVer.edges,
      `Revert to version ${targetVersion}`,
      author,
      authorId,
      targetVer.settings
    );
  }

  /**
   * Calculate diff between two versions
   */
  private calculateDiff(
    oldNodes: Node[],
    newNodes: Node[],
    oldEdges: Edge[],
    newEdges: Edge[],
    oldSettings?: Record<string, any>,
    newSettings?: Record<string, any>
  ): WorkflowDiff {
    const diff: WorkflowDiff = {
      nodesAdded: [],
      nodesRemoved: [],
      nodesModified: [],
      edgesAdded: [],
      edgesRemoved: []
    };

    // Find added and modified nodes
    for (const newNode of newNodes) {
      const oldNode = oldNodes.find(n => n.id === newNode.id);
      if (!oldNode) {
        diff.nodesAdded.push(newNode);
      } else if (JSON.stringify(oldNode) !== JSON.stringify(newNode)) {
        const changes = this.getNodeChanges(oldNode, newNode);
        diff.nodesModified.push({
          before: oldNode,
          after: newNode,
          changes
        });
      }
    }

    // Find removed nodes
    for (const oldNode of oldNodes) {
      if (!newNodes.find(n => n.id === oldNode.id)) {
        diff.nodesRemoved.push(oldNode);
      }
    }

    // Find added edges
    for (const newEdge of newEdges) {
      if (!oldEdges.find(e => e.id === newEdge.id)) {
        diff.edgesAdded.push(newEdge);
      }
    }

    // Find removed edges
    for (const oldEdge of oldEdges) {
      if (!newEdges.find(e => e.id === oldEdge.id)) {
        diff.edgesRemoved.push(oldEdge);
      }
    }

    // Find settings changes
    if (oldSettings || newSettings) {
      diff.settingsChanged = this.getSettingsChanges(oldSettings || {}, newSettings || {});
    }

    return diff;
  }

  /**
   * Get changes between two nodes
   */
  private getNodeChanges(oldNode: Node, newNode: Node): string[] {
    const changes: string[] = [];

    if (oldNode.type !== newNode.type) {
      changes.push(`type changed from ${oldNode.type} to ${newNode.type}`);
    }

    if (oldNode.position.x !== newNode.position.x || oldNode.position.y !== newNode.position.y) {
      changes.push('position changed');
    }

    if (JSON.stringify(oldNode.data) !== JSON.stringify(newNode.data)) {
      changes.push('data modified');
    }

    return changes;
  }

  /**
   * Get settings changes
   */
  private getSettingsChanges(
    oldSettings: Record<string, any>,
    newSettings: Record<string, any>
  ): Record<string, { before: any; after: any }> {
    const changes: Record<string, { before: any; after: any }> = {};

    const allKeys = new Set([...Object.keys(oldSettings), ...Object.keys(newSettings)]);

    for (const key of allKeys) {
      if (JSON.stringify(oldSettings[key]) !== JSON.stringify(newSettings[key])) {
        changes[key] = {
          before: oldSettings[key],
          after: newSettings[key]
        };
      }
    }

    return changes;
  }

  /**
   * Create a branch
   */
  createBranch(
    workflowId: string,
    branchName: string,
    fromVersion: number,
    createdBy: string,
    description?: string
  ): VersionBranch {
    const history = this.versions.get(workflowId);
    if (!history) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (!history.branches) {
      history.branches = [];
    }

    const branch: VersionBranch = {
      name: branchName,
      headVersion: fromVersion,
      createdAt: new Date(),
      createdBy,
      description
    };

    history.branches.push(branch);
    this.versions.set(workflowId, history);

    return branch;
  }

  /**
   * Merge branches (simplified - no conflict resolution)
   */
  merge(
    workflowId: string,
    sourceBranch: string,
    targetBranch: string,
    author: string,
    authorId: string
  ): MergeResult {
    const history = this.versions.get(workflowId);
    if (!history || !history.branches) {
      throw new Error('Branches not found');
    }

    const source = history.branches.find(b => b.name === sourceBranch);
    const target = history.branches.find(b => b.name === targetBranch);

    if (!source || !target) {
      throw new Error('Branch not found');
    }

    const sourceVersion = this.getVersion(workflowId, source.headVersion);
    const targetVersion = this.getVersion(workflowId, target.headVersion);

    if (!sourceVersion || !targetVersion) {
      throw new Error('Version not found');
    }

    // Simple merge: just take source version (in production, would need conflict resolution)
    const mergeResult = this.commit(
      workflowId,
      sourceVersion.nodes,
      sourceVersion.edges,
      `Merge ${sourceBranch} into ${targetBranch}`,
      author,
      authorId,
      sourceVersion.settings
    );

    return {
      success: true,
      mergedNodes: mergeResult.nodes,
      mergedEdges: mergeResult.edges
    };
  }

  /**
   * Tag a version
   */
  tagVersion(workflowId: string, version: number, tag: string): void {
    const history = this.versions.get(workflowId);
    if (!history) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const versionObj = history.versions.find(v => v.version === version);
    if (!versionObj) {
      throw new Error(`Version ${version} not found`);
    }

    if (!versionObj.tags) {
      versionObj.tags = [];
    }

    if (!versionObj.tags.includes(tag)) {
      versionObj.tags.push(tag);
    }
  }

  /**
   * Get versions by tag
   */
  getVersionsByTag(workflowId: string, tag: string): WorkflowVersion[] {
    const history = this.versions.get(workflowId);
    if (!history) {
      return [];
    }

    return history.versions.filter(v => v.tags?.includes(tag));
  }

  /**
   * Compare two versions
   */
  compare(workflowId: string, version1: number, version2: number): WorkflowDiff | null {
    const v1 = this.getVersion(workflowId, version1);
    const v2 = this.getVersion(workflowId, version2);

    if (!v1 || !v2) {
      return null;
    }

    return this.calculateDiff(v1.nodes, v2.nodes, v1.edges, v2.edges, v1.settings, v2.settings);
  }

  /**
   * Get version statistics
   */
  getStatistics(workflowId: string) {
    const history = this.versions.get(workflowId);
    if (!history) {
      return null;
    }

    const totalCommits = history.versions.length;
    const authors = new Set(history.versions.map(v => v.authorId));
    const tags = history.versions.flatMap(v => v.tags || []);

    const changesOverTime = history.versions.map(v => ({
      version: v.version,
      timestamp: v.timestamp,
      nodesCount: v.nodes.length,
      edgesCount: v.edges.length,
      changesCount:
        (v.diff?.nodesAdded.length || 0) +
        (v.diff?.nodesRemoved.length || 0) +
        (v.diff?.nodesModified.length || 0) +
        (v.diff?.edgesAdded.length || 0) +
        (v.diff?.edgesRemoved.length || 0)
    }));

    return {
      totalCommits,
      uniqueAuthors: authors.size,
      totalTags: tags.length,
      branches: history.branches?.length || 0,
      currentVersion: history.currentVersion,
      firstCommit: history.versions[0]?.timestamp,
      lastCommit: history.versions[history.versions.length - 1]?.timestamp,
      changesOverTime
    };
  }

  /**
   * Export version history
   */
  exportHistory(workflowId: string): string {
    const history = this.versions.get(workflowId);
    if (!history) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    return JSON.stringify(history, null, 2);
  }

  /**
   * Import version history
   */
  importHistory(historyData: string): void {
    const history = JSON.parse(historyData) as VersionHistory;

    // Convert date strings back to Date objects
    history.versions = history.versions.map(v => ({
      ...v,
      timestamp: new Date(v.timestamp)
    }));

    if (history.branches) {
      history.branches = history.branches.map(b => ({
        ...b,
        createdAt: new Date(b.createdAt)
      }));
    }

    this.versions.set(history.workflowId, history);
  }

  /**
   * Clone data (deep copy)
   */
  private cloneData<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
  }

  /**
   * Generate unique version ID
   */
  private generateVersionId(): string {
    return `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear history (for testing)
   */
  clear() {
    this.versions.clear();
  }
}

// Singleton instance
export const versionControl = new VersionControl();

/**
 * Helper to format version for display
 */
export function formatVersion(version: WorkflowVersion): string {
  const date = version.timestamp.toLocaleDateString();
  const time = version.timestamp.toLocaleTimeString();
  return `v${version.version} - ${version.commitMessage} (${version.author} on ${date} at ${time})`;
}

/**
 * Helper to format diff for display
 */
export function formatDiff(diff: WorkflowDiff): string {
  const parts: string[] = [];

  if (diff.nodesAdded.length > 0) {
    parts.push(`+${diff.nodesAdded.length} nodes added`);
  }
  if (diff.nodesRemoved.length > 0) {
    parts.push(`-${diff.nodesRemoved.length} nodes removed`);
  }
  if (diff.nodesModified.length > 0) {
    parts.push(`~${diff.nodesModified.length} nodes modified`);
  }
  if (diff.edgesAdded.length > 0) {
    parts.push(`+${diff.edgesAdded.length} edges added`);
  }
  if (diff.edgesRemoved.length > 0) {
    parts.push(`-${diff.edgesRemoved.length} edges removed`);
  }

  return parts.join(', ') || 'No changes';
}

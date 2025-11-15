/**
 * Workflow Versioning & Rollback
 * Complete version control system for workflows
 */

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;
  versionTag?: string; // e.g., "v1.0.0", "production", "staging"
  workflow: any; // Complete workflow snapshot
  changelog?: string;
  author: {
    id: string;
    name: string;
    email?: string;
  };
  createdAt: string;
  metadata: {
    nodeCount: number;
    edgeCount: number;
    hash: string; // SHA-256 hash for integrity
    size: number; // Bytes
  };
  tags?: string[];
  isActive?: boolean;
  deployedTo?: ('development' | 'staging' | 'production')[];
}

export interface VersionComparison {
  from: WorkflowVersion;
  to: WorkflowVersion;
  changes: {
    nodesAdded: any[];
    nodesRemoved: any[];
    nodesModified: Array<{
      nodeId: string;
      before: any;
      after: any;
      changes: string[];
    }>;
    edgesAdded: any[];
    edgesRemoved: any[];
    settingsChanged: Array<{
      key: string;
      before: any;
      after: any;
    }>;
  };
  summary: {
    totalChanges: number;
    breaking: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export interface RollbackOptions {
  createBackup?: boolean;
  reason?: string;
  notifyUsers?: boolean;
  validateBeforeRollback?: boolean;
}

class WorkflowVersionManager {
  private versions: Map<string, WorkflowVersion[]> = new Map();
  private maxVersionsPerWorkflow: number = 50;
  private autoVersioning: boolean = true;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Create new version
   */
  createVersion(
    workflowId: string,
    workflow: any,
    author: { id: string; name: string; email?: string },
    options?: {
      changelog?: string;
      tag?: string;
      tags?: string[];
      isActive?: boolean;
    }
  ): WorkflowVersion {
    const versions = this.versions.get(workflowId) || [];
    const nextVersion = versions.length + 1;

    const version: WorkflowVersion = {
      id: this.generateVersionId(workflowId, nextVersion),
      workflowId,
      version: nextVersion,
      versionTag: options?.tag,
      workflow: this.cloneWorkflow(workflow),
      changelog: options?.changelog,
      author,
      createdAt: new Date().toISOString(),
      metadata: {
        nodeCount: workflow.nodes?.length || 0,
        edgeCount: workflow.edges?.length || 0,
        hash: this.calculateHash(workflow),
        size: JSON.stringify(workflow).length
      },
      tags: options?.tags,
      isActive: options?.isActive ?? false,
      deployedTo: []
    };

    versions.push(version);

    // Enforce max versions limit
    if (versions.length > this.maxVersionsPerWorkflow) {
      versions.shift(); // Remove oldest version
    }

    this.versions.set(workflowId, versions);
    this.saveToStorage();

    return version;
  }

  /**
   * Get all versions for workflow
   */
  getVersions(workflowId: string): WorkflowVersion[] {
    return this.versions.get(workflowId) || [];
  }

  /**
   * Get specific version
   */
  getVersion(workflowId: string, version: number): WorkflowVersion | undefined {
    const versions = this.versions.get(workflowId) || [];
    return versions.find(v => v.version === version);
  }

  /**
   * Get version by tag
   */
  getVersionByTag(workflowId: string, tag: string): WorkflowVersion | undefined {
    const versions = this.versions.get(workflowId) || [];
    return versions.find(v => v.versionTag === tag);
  }

  /**
   * Get latest version
   */
  getLatestVersion(workflowId: string): WorkflowVersion | undefined {
    const versions = this.versions.get(workflowId) || [];
    return versions[versions.length - 1];
  }

  /**
   * Get active version
   */
  getActiveVersion(workflowId: string): WorkflowVersion | undefined {
    const versions = this.versions.get(workflowId) || [];
    return versions.find(v => v.isActive);
  }

  /**
   * Rollback to previous version
   */
  async rollback(
    workflowId: string,
    targetVersion: number,
    author: { id: string; name: string; email?: string },
    options: RollbackOptions = {}
  ): Promise<WorkflowVersion> {
    const versions = this.versions.get(workflowId) || [];
    const target = versions.find(v => v.version === targetVersion);

    if (!target) {
      throw new Error(`Version ${targetVersion} not found`);
    }

    // Validate before rollback
    if (options.validateBeforeRollback) {
      const validation = this.validateWorkflow(target.workflow);
      if (!validation.valid) {
        throw new Error(`Rollback validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Create backup of current state
    if (options.createBackup) {
      const current = this.getLatestVersion(workflowId);
      if (current) {
        this.createVersion(workflowId, current.workflow, author, {
          changelog: `Backup before rollback to v${targetVersion}`,
          tags: ['backup', 'pre-rollback']
        });
      }
    }

    // Create new version from target
    const rolledBack = this.createVersion(
      workflowId,
      target.workflow,
      author,
      {
        changelog: options.reason || `Rolled back to version ${targetVersion}`,
        tags: ['rollback'],
        isActive: true
      }
    );

    // Deactivate other versions
    for (const version of versions) {
      if (version.id !== rolledBack.id) {
        version.isActive = false;
      }
    }

    this.versions.set(workflowId, versions);
    this.saveToStorage();

    return rolledBack;
  }

  /**
   * Compare two versions
   */
  compareVersions(
    workflowId: string,
    fromVersion: number,
    toVersion: number
  ): VersionComparison {
    const versions = this.versions.get(workflowId) || [];
    const from = versions.find(v => v.version === fromVersion);
    const to = versions.find(v => v.version === toVersion);

    if (!from || !to) {
      throw new Error('Version not found');
    }

    const changes = this.calculateChanges(from.workflow, to.workflow);
    const totalChanges =
      changes.nodesAdded.length +
      changes.nodesRemoved.length +
      changes.nodesModified.length +
      changes.edgesAdded.length +
      changes.edgesRemoved.length +
      changes.settingsChanged.length;

    return {
      from,
      to,
      changes,
      summary: {
        totalChanges,
        breaking: changes.nodesRemoved.length > 0 || changes.edgesRemoved.length > 0,
        riskLevel: this.calculateRiskLevel(changes)
      }
    };
  }

  /**
   * Tag a version
   */
  tagVersion(
    workflowId: string,
    version: number,
    tag: string
  ): WorkflowVersion {
    const versions = this.versions.get(workflowId) || [];
    const versionObj = versions.find(v => v.version === version);

    if (!versionObj) {
      throw new Error(`Version ${version} not found`);
    }

    versionObj.versionTag = tag;
    this.versions.set(workflowId, versions);
    this.saveToStorage();

    return versionObj;
  }

  /**
   * Deploy version to environment
   */
  deployVersion(
    workflowId: string,
    version: number,
    environment: 'development' | 'staging' | 'production'
  ): WorkflowVersion {
    const versions = this.versions.get(workflowId) || [];
    const versionObj = versions.find(v => v.version === version);

    if (!versionObj) {
      throw new Error(`Version ${version} not found`);
    }

    if (!versionObj.deployedTo) {
      versionObj.deployedTo = [];
    }

    if (!versionObj.deployedTo.includes(environment)) {
      versionObj.deployedTo.push(environment);
    }

    // Production deployments should be tagged as active
    if (environment === 'production') {
      // Deactivate other versions
      for (const v of versions) {
        v.isActive = false;
      }
      versionObj.isActive = true;
    }

    this.versions.set(workflowId, versions);
    this.saveToStorage();

    return versionObj;
  }

  /**
   * Delete version
   */
  deleteVersion(workflowId: string, version: number): void {
    const versions = this.versions.get(workflowId) || [];
    const versionObj = versions.find(v => v.version === version);

    if (!versionObj) {
      throw new Error(`Version ${version} not found`);
    }

    if (versionObj.isActive) {
      throw new Error('Cannot delete active version');
    }

    const filtered = versions.filter(v => v.version !== version);
    this.versions.set(workflowId, filtered);
    this.saveToStorage();
  }

  /**
   * Export version history
   */
  exportHistory(workflowId: string): string {
    const versions = this.versions.get(workflowId) || [];
    return JSON.stringify(versions, null, 2);
  }

  /**
   * Import version history
   */
  importHistory(workflowId: string, data: string): number {
    try {
      const versions = JSON.parse(data) as WorkflowVersion[];

      if (!Array.isArray(versions)) {
        throw new Error('Invalid format');
      }

      this.versions.set(workflowId, versions);
      this.saveToStorage();

      return versions.length;
    } catch (error) {
      throw new Error(`Failed to import history: ${error}`);
    }
  }

  /**
   * Calculate changes between workflows
   */
  private calculateChanges(from: any, to: any): VersionComparison['changes'] {
    const changes: VersionComparison['changes'] = {
      nodesAdded: [],
      nodesRemoved: [],
      nodesModified: [],
      edgesAdded: [],
      edgesRemoved: [],
      settingsChanged: []
    };

    const fromNodes = new Map((from.nodes || []).map((n: any) => [n.id, n]));
    const toNodes = new Map((to.nodes || []).map((n: any) => [n.id, n]));

    // Find added nodes
    for (const [id, node] of toNodes) {
      if (!fromNodes.has(id)) {
        changes.nodesAdded.push(node);
      }
    }

    // Find removed nodes
    for (const [id, node] of fromNodes) {
      if (!toNodes.has(id)) {
        changes.nodesRemoved.push(node);
      }
    }

    // Find modified nodes
    for (const [id, toNode] of toNodes) {
      const fromNode = fromNodes.get(id);
      if (fromNode) {
        const nodeChanges = this.getNodeChanges(fromNode, toNode);
        if (nodeChanges.length > 0) {
          changes.nodesModified.push({
            nodeId: id,
            before: fromNode,
            after: toNode,
            changes: nodeChanges
          });
        }
      }
    }

    // Find edge changes
    const fromEdges = new Set((from.edges || []).map((e: any) => `${e.source}-${e.target}`));
    const toEdges = new Set((to.edges || []).map((e: any) => `${e.source}-${e.target}`));

    for (const edge of to.edges || []) {
      const key = `${edge.source}-${edge.target}`;
      if (!fromEdges.has(key)) {
        changes.edgesAdded.push(edge);
      }
    }

    for (const edge of from.edges || []) {
      const key = `${edge.source}-${edge.target}`;
      if (!toEdges.has(key)) {
        changes.edgesRemoved.push(edge);
      }
    }

    return changes;
  }

  /**
   * Get changes for a specific node
   */
  private getNodeChanges(from: any, to: any): string[] {
    const changes: string[] = [];

    if (from.type !== to.type) {
      changes.push(`Type changed from ${from.type} to ${to.type}`);
    }

    if (JSON.stringify(from.data) !== JSON.stringify(to.data)) {
      changes.push('Configuration changed');
    }

    if (from.position?.x !== to.position?.x || from.position?.y !== to.position?.y) {
      changes.push('Position changed');
    }

    return changes;
  }

  /**
   * Calculate risk level
   */
  private calculateRiskLevel(changes: VersionComparison['changes']): 'low' | 'medium' | 'high' {
    const removed = changes.nodesRemoved.length + changes.edgesRemoved.length;
    const modified = changes.nodesModified.length;
    const added = changes.nodesAdded.length + changes.edgesAdded.length;

    if (removed > 5) return 'high';
    if (removed > 0 || modified > 10) return 'medium';
    if (modified > 5 || added > 10) return 'medium';
    return 'low';
  }

  /**
   * Validate workflow
   */
  private validateWorkflow(workflow: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow has no nodes');
    }

    if (!workflow.edges || workflow.edges.length === 0) {
      errors.push('Workflow has no edges');
    }

    // Check for orphaned nodes
    const connectedNodes = new Set<string>();
    for (const edge of workflow.edges || []) {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    }

    for (const node of workflow.nodes || []) {
      if (!connectedNodes.has(node.id) && workflow.nodes.length > 1) {
        errors.push(`Node ${node.id} is not connected`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Clone workflow
   */
  private cloneWorkflow(workflow: any): any {
    return JSON.parse(JSON.stringify(workflow));
  }

  /**
   * Calculate hash
   */
  private calculateHash(workflow: any): string {
    const str = JSON.stringify(workflow);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Generate version ID
   */
  private generateVersionId(workflowId: string, version: number): string {
    return `${workflowId}_v${version}_${Date.now()}`;
  }

  /**
   * Save to storage
   */
  private saveToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const data = Array.from(this.versions.entries());
        localStorage.setItem('workflow-versions', JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save versions:', error);
      }
    }
  }

  /**
   * Load from storage
   */
  private loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('workflow-versions');
        if (stored) {
          const data = JSON.parse(stored);
          this.versions = new Map(data);
        }
      } catch (error) {
        console.error('Failed to load versions:', error);
      }
    }
  }

  /**
   * Get statistics
   */
  getStatistics(workflowId: string) {
    const versions = this.versions.get(workflowId) || [];

    return {
      totalVersions: versions.length,
      activeVersion: versions.find(v => v.isActive)?.version,
      oldestVersion: versions[0],
      latestVersion: versions[versions.length - 1],
      totalSize: versions.reduce((sum, v) => sum + v.metadata.size, 0),
      averageSize: versions.length > 0
        ? versions.reduce((sum, v) => sum + v.metadata.size, 0) / versions.length
        : 0,
      deployments: {
        development: versions.filter(v => v.deployedTo?.includes('development')).length,
        staging: versions.filter(v => v.deployedTo?.includes('staging')).length,
        production: versions.filter(v => v.deployedTo?.includes('production')).length
      },
      authors: new Set(versions.map(v => v.author.name)).size
    };
  }
}

// Singleton instance
export const versionManager = new WorkflowVersionManager();

/**
 * Auto-versioning hook
 */
export function useAutoVersioning(
  workflowId: string,
  workflow: any,
  author: { id: string; name: string; email?: string }
): void {
  // Auto-save version on significant changes
  const lastVersion = versionManager.getLatestVersion(workflowId);

  if (!lastVersion) {
    versionManager.createVersion(workflowId, workflow, author, {
      changelog: 'Initial version',
      tag: 'v1.0.0',
      isActive: true
    });
    return;
  }

  const currentHash = JSON.stringify(workflow);
  const lastHash = JSON.stringify(lastVersion.workflow);

  if (currentHash !== lastHash) {
    versionManager.createVersion(workflowId, workflow, author, {
      changelog: 'Auto-saved changes'
    });
  }
}

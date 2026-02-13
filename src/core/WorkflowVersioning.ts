/**
 * Workflow Versioning System
 * Version control for workflows with history and rollback
 */

import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { logger } from '../services/SimpleLogger';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// Define Workflow interface for versioning
export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  version: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  description?: string;
  metadata?: Record<string, any>;
  settings?: {
    environment: string;
    variables: Record<string, unknown>;
  };
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: string;
  semver: {
    major: number;
    minor: number;
    patch: number;
  };
  snapshot: Workflow;
  changes: VersionChange[];
  author: string;
  message?: string;
  tags?: string[];
  createdAt: Date;
  publishedAt?: Date;
  deprecated?: boolean;
  deprecationDate?: Date;
  metadata?: Record<string, any>;
}

export interface VersionChange {
  type: 'node_added' | 'node_removed' | 'node_modified' | 'edge_added' | 'edge_removed' | 'edge_modified' | 'config_changed' | 'metadata_changed';
  path: string;
  oldValue?: any;
  newValue?: any;
  nodeId?: string;
  edgeId?: string;
}

export interface VersionComparisonResult {
  version1: string;
  version2: string;
  changes: VersionChange[];
  breaking: boolean;
  summary: {
    nodesAdded: number;
    nodesRemoved: number;
    nodesModified: number;
    edgesAdded: number;
    edgesRemoved: number;
    edgesModified: number;
  };
}

export interface VersioningConfig {
  autoVersion: boolean;
  strategy: 'semantic' | 'incremental' | 'timestamp';
  maxVersions?: number;
  retentionDays?: number;
  requireMessage?: boolean;
  requireApproval?: boolean;
}

export class WorkflowVersioning extends EventEmitter {
  private versions: Map<string, WorkflowVersion[]> = new Map();
  private currentVersions: Map<string, string> = new Map();
  private config: VersioningConfig;

  constructor(config?: Partial<VersioningConfig>) {
    super();
    this.config = {
      autoVersion: true,
      strategy: 'semantic',
      maxVersions: 100,
      retentionDays: 365,
      requireMessage: false,
      requireApproval: false,
      ...config
    };
  }

  /**
   * Create a new version of workflow
   */
  createVersion(
    workflow: Workflow,
    options?: {
      message?: string;
      author?: string;
      tags?: string[];
      versionType?: 'major' | 'minor' | 'patch';
      customVersion?: string;
    }
  ): WorkflowVersion {
    const workflowId = workflow.id;
    const previousVersion = this.getLatestVersion(workflowId);
    
    // Calculate version number
    const version = options?.customVersion || this.calculateNextVersion(
      previousVersion,
      options?.versionType || 'patch'
    );
    
    // Detect changes
    const changes = previousVersion 
      ? this.detectChanges(previousVersion.snapshot, workflow)
      : [];
    
    // Create version object
    const workflowVersion: WorkflowVersion = {
      id: `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      version,
      semver: this.parseSemver(version),
      snapshot: this.createSnapshot(workflow),
      changes,
      author: options?.author || 'system',
      message: options?.message,
      tags: options?.tags,
      createdAt: new Date()
    };
    
    // Check if approval required
    if (this.config.requireApproval && this.isBreakingChange(changes)) {
      // Allow subclasses to handle approval
      if (typeof (this as any).createApprovalRequest === 'function') {
        (this as any).createApprovalRequest(workflowVersion);
      }
      this.emit('version-pending-approval', workflowVersion);
      return workflowVersion;
    }
    
    // Store version
    this.storeVersion(workflowVersion);
    
    // Update current version
    this.currentVersions.set(workflowId, version);
    
    // Emit event
    this.emit('version-created', workflowVersion);
    
    // Cleanup old versions if needed
    this.cleanupOldVersions(workflowId);
    
    logger.info(`Created version ${version} for workflow ${workflowId}`);
    
    return workflowVersion;
  }

  /**
   * Calculate next version number
   */
  private calculateNextVersion(
    previousVersion: WorkflowVersion | undefined,
    versionType: 'major' | 'minor' | 'patch'
  ): string {
    if (!previousVersion) {
      return '1.0.0';
    }
    
    switch (this.config.strategy) {
      case 'semantic':
        const semver = previousVersion.semver;
        switch (versionType) {
          case 'major':
            return `${semver.major + 1}.0.0`;
          case 'minor':
            return `${semver.major}.${semver.minor + 1}.0`;
          case 'patch':
          default:
            return `${semver.major}.${semver.minor}.${semver.patch + 1}`;
        }
      
      case 'incremental':
        const current = parseInt(previousVersion.version);
        return String(current + 1);
      
      case 'timestamp':
        return new Date().toISOString();
      
      default:
        return '1.0.0';
    }
  }

  /**
   * Parse semantic version
   */
  private parseSemver(version: string): { major: number; minor: number; patch: number } {
    const parts = version.split('.');
    return {
      major: parseInt(parts[0]) || 0,
      minor: parseInt(parts[1]) || 0,
      patch: parseInt(parts[2]) || 0
    };
  }

  /**
   * Create workflow snapshot
   */
  private createSnapshot(workflow: Workflow): Workflow {
    // Deep clone the workflow
    return JSON.parse(JSON.stringify(workflow));
  }

  /**
   * Detect changes between versions
   */
  private detectChanges(oldWorkflow: Workflow, newWorkflow: Workflow): VersionChange[] {
    const changes: VersionChange[] = [];
    
    // Check nodes
    const oldNodes = new Map(oldWorkflow.nodes.map(n => [n.id, n]));
    const newNodes = new Map(newWorkflow.nodes.map(n => [n.id, n]));

    // Find added nodes
    for (const [id, node] of Array.from(newNodes.entries())) {
      if (!oldNodes.has(id)) {
        changes.push({
          type: 'node_added',
          path: `nodes.${id}`,
          newValue: node,
          nodeId: id
        });
      }
    }

    // Find removed nodes
    for (const [id, node] of Array.from(oldNodes.entries())) {
      if (!newNodes.has(id)) {
        changes.push({
          type: 'node_removed',
          path: `nodes.${id}`,
          oldValue: node,
          nodeId: id
        });
      }
    }

    // Find modified nodes
    for (const [id, newNode] of Array.from(newNodes.entries())) {
      const oldNode = oldNodes.get(id);
      if (oldNode && !this.isEqual(oldNode, newNode)) {
        changes.push({
          type: 'node_modified',
          path: `nodes.${id}`,
          oldValue: oldNode,
          newValue: newNode,
          nodeId: id
        });
      }
    }
    
    // Check edges
    const oldEdges = new Map(oldWorkflow.edges.map(e => [e.id, e]));
    const newEdges = new Map(newWorkflow.edges.map(e => [e.id, e]));

    // Find added edges
    for (const [id, edge] of Array.from(newEdges.entries())) {
      if (!oldEdges.has(id)) {
        changes.push({
          type: 'edge_added',
          path: `edges.${id}`,
          newValue: edge,
          edgeId: id
        });
      }
    }

    // Find removed edges
    for (const [id, edge] of Array.from(oldEdges.entries())) {
      if (!newEdges.has(id)) {
        changes.push({
          type: 'edge_removed',
          path: `edges.${id}`,
          oldValue: edge,
          edgeId: id
        });
      }
    }

    // Find modified edges
    for (const [id, newEdge] of Array.from(newEdges.entries())) {
      const oldEdge = oldEdges.get(id);
      if (oldEdge && !this.isEqual(oldEdge, newEdge)) {
        changes.push({
          type: 'edge_modified',
          path: `edges.${id}`,
          oldValue: oldEdge,
          newValue: newEdge,
          edgeId: id
        });
      }
    }
    
    // Check metadata
    if (!this.isEqual(oldWorkflow.metadata, newWorkflow.metadata)) {
      changes.push({
        type: 'metadata_changed',
        path: 'metadata',
        oldValue: oldWorkflow.metadata,
        newValue: newWorkflow.metadata
      });
    }
    
    return changes;
  }

  /**
   * Check if two objects are equal
   */
  private isEqual(obj1: any, obj2: any): boolean {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

  /**
   * Check if changes are breaking
   */
  private isBreakingChange(changes: VersionChange[]): boolean {
    return changes.some(change => 
      change.type === 'node_removed' || 
      change.type === 'edge_removed' ||
      (change.type === 'node_modified' && this.isBreakingNodeChange(change))
    );
  }

  /**
   * Check if node change is breaking
   */
  private isBreakingNodeChange(change: VersionChange): boolean {
    if (!change.oldValue || !change.newValue) return false;
    
    // Check if inputs/outputs changed
    const oldNode = change.oldValue;
    const newNode = change.newValue;
    
    return oldNode.inputs !== newNode.inputs || 
           oldNode.outputs !== newNode.outputs ||
           oldNode.type !== newNode.type;
  }

  /**
   * Store version
   */
  protected storeVersion(version: WorkflowVersion): void {
    const workflowId = version.workflowId;

    if (!this.versions.has(workflowId)) {
      this.versions.set(workflowId, []);
    }

    const versions = this.versions.get(workflowId)!;
    versions.push(version);

    // Sort by version
    versions.sort((a, b) => this.compareVersions(a.version, b.version));
  }

  /**
   * Compare version strings
   */
  private compareVersions(v1: string, v2: string): number {
    const semver1 = this.parseSemver(v1);
    const semver2 = this.parseSemver(v2);
    
    if (semver1.major !== semver2.major) {
      return semver1.major - semver2.major;
    }
    if (semver1.minor !== semver2.minor) {
      return semver1.minor - semver2.minor;
    }
    return semver1.patch - semver2.patch;
  }

  /**
   * Get latest version
   */
  getLatestVersion(workflowId: string): WorkflowVersion | undefined {
    const versions = this.versions.get(workflowId);
    return versions?.[versions.length - 1];
  }

  /**
   * Get version by ID
   */
  getVersion(versionId: string): WorkflowVersion | undefined {
    for (const versions of Array.from(this.versions.values())) {
      const version = versions.find(v => v.id === versionId);
      if (version) return version;
    }
    return undefined;
  }

  /**
   * Get version by number
   */
  getVersionByNumber(workflowId: string, versionNumber: string): WorkflowVersion | undefined {
    const versions = this.versions.get(workflowId);
    return versions?.find(v => v.version === versionNumber);
  }

  /**
   * Get all versions for workflow
   */
  getVersionHistory(workflowId: string): WorkflowVersion[] {
    return this.versions.get(workflowId) || [];
  }

  /**
   * Rollback to version
   */
  rollback(workflowId: string, targetVersion: string): Workflow {
    const version = this.getVersionByNumber(workflowId, targetVersion);
    
    if (!version) {
      throw new Error(`Version ${targetVersion} not found for workflow ${workflowId}`);
    }
    
    // Create rollback version
    const rollbackVersion = this.createVersion(version.snapshot, {
      message: `Rollback to version ${targetVersion}`,
      author: 'system',
      tags: ['rollback']
    });
    
    // Emit rollback event
    this.emit('version-rollback', {
      workflowId,
      fromVersion: this.currentVersions.get(workflowId),
      toVersion: targetVersion,
      rollbackVersion
    });
    
    logger.info(`Rolled back workflow ${workflowId} to version ${targetVersion}`);
    
    return version.snapshot;
  }

  /**
   * Compare two versions
   */
  compareVersions2(workflowId: string, version1: string, version2: string): VersionComparisonResult {
    const v1 = this.getVersionByNumber(workflowId, version1);
    const v2 = this.getVersionByNumber(workflowId, version2);
    
    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }
    
    const changes = this.detectChanges(v1.snapshot, v2.snapshot);
    
    const summary = {
      nodesAdded: changes.filter(c => c.type === 'node_added').length,
      nodesRemoved: changes.filter(c => c.type === 'node_removed').length,
      nodesModified: changes.filter(c => c.type === 'node_modified').length,
      edgesAdded: changes.filter(c => c.type === 'edge_added').length,
      edgesRemoved: changes.filter(c => c.type === 'edge_removed').length,
      edgesModified: changes.filter(c => c.type === 'edge_modified').length
    };
    
    return {
      version1,
      version2,
      changes,
      breaking: this.isBreakingChange(changes),
      summary
    };
  }

  /**
   * Tag version
   */
  tagVersion(versionId: string, tags: string[]): void {
    const version = this.getVersion(versionId);
    
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }
    
    version.tags = [...(version.tags || []), ...tags];
    
    this.emit('version-tagged', { version, tags });
  }

  /**
   * Publish version
   */
  publishVersion(versionId: string): void {
    const version = this.getVersion(versionId);
    
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }
    
    version.publishedAt = new Date();
    
    this.emit('version-published', version);
    
    logger.info(`Published version ${version.version} for workflow ${version.workflowId}`);
  }

  /**
   * Deprecate version
   */
  deprecateVersion(versionId: string, deprecationDate?: Date): void {
    const version = this.getVersion(versionId);
    
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }
    
    version.deprecated = true;
    version.deprecationDate = deprecationDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    this.emit('version-deprecated', version);
    
    logger.warn(`Deprecated version ${version.version} for workflow ${version.workflowId}`);
  }

  /**
   * Cleanup old versions
   */
  private cleanupOldVersions(workflowId: string): void {
    const versions = this.versions.get(workflowId);
    
    if (!versions) return;
    
    // Remove by max count
    if (this.config.maxVersions && versions.length > this.config.maxVersions) {
      const toRemove = versions.length - this.config.maxVersions;
      const removed = versions.splice(0, toRemove);
      
      removed.forEach(v => {
        logger.debug(`Removed old version ${v.version} for workflow ${workflowId}`);
      });
    }
    
    // Remove by retention days
    if (this.config.retentionDays) {
      const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
      const filtered = versions.filter(v => v.createdAt > cutoffDate);
      
      if (filtered.length < versions.length) {
        this.versions.set(workflowId, filtered);
      }
    }
  }

  /**
   * Export version
   */
  exportVersion(versionId: string): string {
    const version = this.getVersion(versionId);
    
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }
    
    return JSON.stringify(version, null, 2);
  }

  /**
   * Import version
   */
  importVersion(data: string): WorkflowVersion {
    try {
      const version = JSON.parse(data) as WorkflowVersion;
      
      // Validate version
      if (!version.id || !version.workflowId || !version.version) {
        throw new Error('Invalid version data');
      }
      
      // Store imported version
      this.storeVersion(version);
      
      this.emit('version-imported', version);
      
      return version;
    } catch (error) {
      throw new Error(`Failed to import version: ${(error as Error).message}`);
    }
  }

  /**
   * Generate version hash
   */
  private generateHash(workflow: Workflow): string {
    const data = JSON.stringify(workflow);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get version statistics
   */
  getStatistics(workflowId?: string): any {
    if (workflowId) {
      const versions = this.versions.get(workflowId) || [];
      return {
        totalVersions: versions.length,
        latestVersion: versions[versions.length - 1]?.version,
        publishedVersions: versions.filter(v => v.publishedAt).length,
        deprecatedVersions: versions.filter(v => v.deprecated).length
      };
    }
    
    // Global statistics
    let total = 0;
    let published = 0;
    let deprecated = 0;

    for (const versions of Array.from(this.versions.values())) {
      total += versions.length;
      published += versions.filter(v => v.publishedAt).length;
      deprecated += versions.filter(v => v.deprecated).length;
    }
    
    return {
      totalWorkflows: this.versions.size,
      totalVersions: total,
      publishedVersions: published,
      deprecatedVersions: deprecated
    };
  }
}

// Approval system interfaces
interface VersionApproval {
  id: string;
  versionId: string;
  requestedBy: string;
  requestedAt: Date;
  approvers: string[];
  approvals: Array<{
    approver: string;
    approved: boolean;
    timestamp: Date;
    comments?: string;
  }>;
  status: 'pending' | 'approved' | 'rejected';
}

// Extend class with approval methods
export class WorkflowVersioningWithApproval extends WorkflowVersioning {
  private approvals: Map<string, VersionApproval> = new Map();

  /**
   * Create approval request
   */
  private createApprovalRequest(version: WorkflowVersion): void {
    const approval: VersionApproval = {
      id: `approval_${Date.now()}`,
      versionId: version.id,
      requestedBy: version.author,
      requestedAt: new Date(),
      approvers: ['admin'], // Would be configurable
      approvals: [],
      status: 'pending'
    };
    
    this.approvals.set(approval.id, approval);
  }

  /**
   * Approve version
   */
  approveVersion(approvalId: string, approver: string, comments?: string): void {
    const approval = this.approvals.get(approvalId);
    
    if (!approval) {
      throw new Error('Approval request not found');
    }
    
    approval.approvals.push({
      approver,
      approved: true,
      timestamp: new Date(),
      comments
    });
    
    // Check if all required approvals received
    if (approval.approvals.length >= approval.approvers.length) {
      approval.status = 'approved';
      
      // Publish the version
      const version = this.getVersion(approval.versionId);
      if (version) {
        this.storeVersion(version);
        this.emit('version-approved', version);
      }
    }
  }

  /**
   * Reject version
   */
  rejectVersion(approvalId: string, approver: string, reason: string): void {
    const approval = this.approvals.get(approvalId);
    
    if (!approval) {
      throw new Error('Approval request not found');
    }
    
    approval.approvals.push({
      approver,
      approved: false,
      timestamp: new Date(),
      comments: reason
    });
    
    approval.status = 'rejected';
    
    this.emit('version-rejected', approval);
  }
}

// Export singleton instance
export const workflowVersioning = new WorkflowVersioningWithApproval();
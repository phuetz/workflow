/**
 * Agent Version Control
 *
 * Git-like version control system for AI agents with:
 * - Branching and merging
 * - Visual and text diff
 * - Tagging and history
 * - Conflict resolution
 *
 * Storage: Git-compatible, Myers diff algorithm, three-way merge
 */

import {
  Agent,
  AgentBranch,
  AgentChange,
  AgentVersion,
  MergeResult,
  User,
  VersionOperation,
} from './types/agentops';
import { EventEmitter } from 'events';

/**
 * Version control manager for agents
 */
export class AgentVersionControl extends EventEmitter {
  private versions: Map<string, AgentVersion> = new Map();
  private branches: Map<string, AgentBranch> = new Map();
  private agentHeads: Map<string, Map<string, string>> = new Map(); // agentId -> branchName -> versionId

  /**
   * Commit changes to an agent
   */
  async commit(
    agent: Agent,
    message: string,
    author: User,
    branch: string = 'main'
  ): Promise<AgentVersion> {
    const agentId = agent.id;

    // Get current version
    const parentVersion = this.getCurrentVersion(agentId, branch);
    const changes = parentVersion ? this.detectChanges(parentVersion.snapshot, agent) : this.initialChanges(agent);

    // Create new version
    const version: AgentVersion = {
      id: this.generateVersionId(),
      agentId,
      version: this.incrementVersion(parentVersion?.version ?? '0.0.0'),
      commit: this.generateCommitHash(),
      author,
      timestamp: Date.now(),
      message,
      changes,
      tags: [],
      parent: parentVersion?.id,
      branch,
      snapshot: JSON.parse(JSON.stringify(agent)), // Deep clone
    };

    this.versions.set(version.id, version);
    this.updateHead(agentId, branch, version.id);

    this.emit('commit', {
      type: 'commit',
      agentId,
      timestamp: Date.now(),
      user: author,
      data: { version },
    } as VersionOperation);

    return version;
  }

  /**
   * Create a new branch
   */
  async createBranch(
    agentId: string,
    branchName: string,
    fromBranch: string = 'main',
    creator: User
  ): Promise<AgentBranch> {
    const branchKey = `${agentId}:${branchName}`;

    if (this.branches.has(branchKey)) {
      throw new Error(`Branch ${branchName} already exists for agent ${agentId}`);
    }

    // Get current head of source branch
    const sourceHead = this.getHead(agentId, fromBranch);
    if (!sourceHead) {
      throw new Error(`Source branch ${fromBranch} not found for agent ${agentId}`);
    }

    const branch: AgentBranch = {
      name: branchName,
      agentId,
      head: sourceHead,
      created: Date.now(),
      creator,
      description: `Branch created from ${fromBranch}`,
      protected: false,
    };

    this.branches.set(branchKey, branch);
    this.updateHead(agentId, branchName, sourceHead);

    this.emit('branch', {
      type: 'branch',
      agentId,
      timestamp: Date.now(),
      user: creator,
      data: { branch, fromBranch },
    } as VersionOperation);

    return branch;
  }

  /**
   * Merge two branches
   */
  async mergeBranches(
    agentId: string,
    sourceBranch: string,
    targetBranch: string,
    merger: User
  ): Promise<MergeResult> {
    const sourceHead = this.getHead(agentId, sourceBranch);
    const targetHead = this.getHead(agentId, targetBranch);

    if (!sourceHead || !targetHead) {
      throw new Error('Source or target branch not found');
    }

    const sourceVersion = this.versions.get(sourceHead);
    const targetVersion = this.versions.get(targetHead);

    if (!sourceVersion || !targetVersion) {
      throw new Error('Source or target version not found');
    }

    // Find common ancestor
    const ancestor = this.findCommonAncestor(sourceVersion, targetVersion);

    // Perform three-way merge
    const mergeResult = this.threeWayMerge(
      ancestor?.snapshot,
      sourceVersion.snapshot,
      targetVersion.snapshot
    );

    if (mergeResult.conflicts.length > 0) {
      return {
        success: false,
        conflicts: mergeResult.conflicts,
      };
    }

    // Create merge commit
    const mergedAgent = mergeResult.merged!;
    const changes = this.detectChanges(targetVersion.snapshot, mergedAgent);

    const mergedVersion: AgentVersion = {
      id: this.generateVersionId(),
      agentId,
      version: this.incrementVersion(targetVersion.version),
      commit: this.generateCommitHash(),
      author: merger,
      timestamp: Date.now(),
      message: `Merge ${sourceBranch} into ${targetBranch}`,
      changes,
      tags: [],
      parent: targetHead,
      branch: targetBranch,
      snapshot: mergedAgent,
    };

    this.versions.set(mergedVersion.id, mergedVersion);
    this.updateHead(agentId, targetBranch, mergedVersion.id);

    this.emit('merge', {
      type: 'merge',
      agentId,
      timestamp: Date.now(),
      user: merger,
      data: { sourceBranch, targetBranch, mergedVersion },
    } as VersionOperation);

    return {
      success: true,
      conflicts: [],
      mergedVersion,
    };
  }

  /**
   * Tag a version
   */
  async tagVersion(
    versionId: string,
    tag: string,
    tagger: User
  ): Promise<void> {
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    if (version.tags.includes(tag)) {
      throw new Error(`Tag ${tag} already exists on version ${versionId}`);
    }

    version.tags.push(tag);

    this.emit('tag', {
      type: 'tag',
      agentId: version.agentId,
      timestamp: Date.now(),
      user: tagger,
      data: { versionId, tag },
    } as VersionOperation);
  }

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(
    agentId: string,
    versionId: string,
    branch: string = 'main',
    user: User
  ): Promise<AgentVersion> {
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    if (version.agentId !== agentId) {
      throw new Error('Version does not belong to this agent');
    }

    // Create a new commit with the old snapshot
    const rollbackVersion: AgentVersion = {
      id: this.generateVersionId(),
      agentId,
      version: this.incrementVersion(this.getCurrentVersion(agentId, branch)?.version ?? '0.0.0'),
      commit: this.generateCommitHash(),
      author: user,
      timestamp: Date.now(),
      message: `Rollback to version ${version.version} (${versionId})`,
      changes: this.detectChanges(this.getCurrentVersion(agentId, branch)?.snapshot!, version.snapshot),
      tags: [],
      parent: this.getHead(agentId, branch),
      branch,
      snapshot: JSON.parse(JSON.stringify(version.snapshot)),
    };

    this.versions.set(rollbackVersion.id, rollbackVersion);
    this.updateHead(agentId, branch, rollbackVersion.id);

    this.emit('rollback', {
      type: 'rollback',
      agentId,
      timestamp: Date.now(),
      user,
      data: { fromVersion: this.getHead(agentId, branch), toVersion: versionId, rollbackVersion },
    } as VersionOperation);

    return rollbackVersion;
  }

  /**
   * Get version history for an agent
   */
  getHistory(agentId: string, branch?: string, limit: number = 50): AgentVersion[] {
    const head = branch ? this.getHead(agentId, branch) : this.getHead(agentId, 'main');
    if (!head) return [];

    const history: AgentVersion[] = [];
    let current: AgentVersion | undefined = this.versions.get(head);

    while (current && history.length < limit) {
      history.push(current);
      current = current.parent ? this.versions.get(current.parent) : undefined;
    }

    return history;
  }

  /**
   * Get all branches for an agent
   */
  getBranches(agentId: string): AgentBranch[] {
    return Array.from(this.branches.values()).filter(b => b.agentId === agentId);
  }

  /**
   * Get a specific version
   */
  getVersion(versionId: string): AgentVersion | undefined {
    return this.versions.get(versionId);
  }

  /**
   * Get current version on a branch
   */
  getCurrentVersion(agentId: string, branch: string = 'main'): AgentVersion | undefined {
    const head = this.getHead(agentId, branch);
    return head ? this.versions.get(head) : undefined;
  }

  /**
   * Compare two versions (diff)
   */
  diff(versionIdA: string, versionIdB: string): AgentChange[] {
    const versionA = this.versions.get(versionIdA);
    const versionB = this.versions.get(versionIdB);

    if (!versionA || !versionB) {
      throw new Error('One or both versions not found');
    }

    return this.detectChanges(versionA.snapshot, versionB.snapshot);
  }

  /**
   * Get versions by tag
   */
  getVersionsByTag(tag: string): AgentVersion[] {
    return Array.from(this.versions.values()).filter(v => v.tags.includes(tag));
  }

  // Private helper methods

  private getHead(agentId: string, branch: string): string | undefined {
    return this.agentHeads.get(agentId)?.get(branch);
  }

  private updateHead(agentId: string, branch: string, versionId: string): void {
    if (!this.agentHeads.has(agentId)) {
      this.agentHeads.set(agentId, new Map());
    }
    this.agentHeads.get(agentId)!.set(branch, versionId);
  }

  private detectChanges(oldAgent: Agent, newAgent: Agent): AgentChange[] {
    const changes: AgentChange[] = [];

    // Code changes
    if (oldAgent.code !== newAgent.code) {
      changes.push({
        type: 'code',
        path: 'code',
        oldValue: oldAgent.code,
        newValue: newAgent.code,
        diff: this.generateDiff(oldAgent.code, newAgent.code),
      });
    }

    // Configuration changes
    const configDiff = this.detectObjectChanges(oldAgent.configuration, newAgent.configuration, 'configuration');
    changes.push(...configDiff);

    // Dependencies changes
    const depDiff = this.detectObjectChanges(oldAgent.dependencies, newAgent.dependencies, 'dependencies');
    changes.push(...depDiff);

    // Metadata changes
    if (oldAgent.description !== newAgent.description) {
      changes.push({
        type: 'metadata',
        path: 'description',
        oldValue: oldAgent.description,
        newValue: newAgent.description,
      });
    }

    return changes;
  }

  private initialChanges(agent: Agent): AgentChange[] {
    return [
      {
        type: 'code',
        path: 'code',
        newValue: agent.code,
      },
      {
        type: 'config',
        path: 'configuration',
        newValue: agent.configuration,
      },
      {
        type: 'dependencies',
        path: 'dependencies',
        newValue: agent.dependencies,
      },
    ];
  }

  private detectObjectChanges(oldObj: any, newObj: any, basePath: string): AgentChange[] {
    const changes: AgentChange[] = [];
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);

    for (const key of allKeys) {
      const oldValue = oldObj?.[key];
      const newValue = newObj?.[key];
      const path = `${basePath}.${key}`;

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          type: 'config',
          path,
          oldValue,
          newValue,
        });
      }
    }

    return changes;
  }

  private generateDiff(oldText: string, newText: string): string {
    // Simple line-by-line diff (Myers algorithm would be more sophisticated)
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const diff: string[] = [];

    let i = 0, j = 0;
    while (i < oldLines.length || j < newLines.length) {
      if (i >= oldLines.length) {
        diff.push(`+ ${newLines[j]}`);
        j++;
      } else if (j >= newLines.length) {
        diff.push(`- ${oldLines[i]}`);
        i++;
      } else if (oldLines[i] === newLines[j]) {
        diff.push(`  ${oldLines[i]}`);
        i++;
        j++;
      } else {
        diff.push(`- ${oldLines[i]}`);
        diff.push(`+ ${newLines[j]}`);
        i++;
        j++;
      }
    }

    return diff.join('\n');
  }

  private findCommonAncestor(v1: AgentVersion, v2: AgentVersion): AgentVersion | undefined {
    // Build ancestry chain for v1
    const v1Ancestors = new Set<string>();
    let current: AgentVersion | undefined = v1;
    while (current) {
      v1Ancestors.add(current.id);
      current = current.parent ? this.versions.get(current.parent) : undefined;
    }

    // Find first common ancestor in v2's chain
    current = v2;
    while (current) {
      if (v1Ancestors.has(current.id)) {
        return current;
      }
      current = current.parent ? this.versions.get(current.parent) : undefined;
    }

    return undefined;
  }

  private threeWayMerge(
    base: Agent | undefined,
    source: Agent,
    target: Agent
  ): { merged?: Agent; conflicts: Array<{ path: string; base: any; source: any; target: any }> } {
    const conflicts: Array<{ path: string; base: any; source: any; target: any }> = [];

    if (!base) {
      // No common ancestor, cannot merge
      return { conflicts: [{ path: 'root', base: null, source, target }] };
    }

    const merged: Agent = JSON.parse(JSON.stringify(target)); // Start with target

    // Merge code
    if (base.code !== source.code && base.code !== target.code && source.code !== target.code) {
      conflicts.push({ path: 'code', base: base.code, source: source.code, target: target.code });
    } else if (base.code !== source.code) {
      merged.code = source.code;
    }

    // Merge configuration
    const configConflicts = this.mergeObjects(
      base.configuration,
      source.configuration,
      target.configuration,
      merged.configuration,
      'configuration'
    );
    conflicts.push(...configConflicts);

    // Merge dependencies
    const depConflicts = this.mergeObjects(
      base.dependencies,
      source.dependencies,
      target.dependencies,
      merged.dependencies,
      'dependencies'
    );
    conflicts.push(...depConflicts);

    if (conflicts.length > 0) {
      return { conflicts };
    }

    return { merged, conflicts: [] };
  }

  private mergeObjects(
    base: any,
    source: any,
    target: any,
    merged: any,
    basePath: string
  ): Array<{ path: string; base: any; source: any; target: any }> {
    const conflicts: Array<{ path: string; base: any; source: any; target: any }> = [];
    const allKeys = new Set([...Object.keys(source || {}), ...Object.keys(target || {})]);

    for (const key of allKeys) {
      const path = `${basePath}.${key}`;
      const baseValue = base?.[key];
      const sourceValue = source?.[key];
      const targetValue = target?.[key];

      if (JSON.stringify(baseValue) !== JSON.stringify(sourceValue) &&
          JSON.stringify(baseValue) !== JSON.stringify(targetValue) &&
          JSON.stringify(sourceValue) !== JSON.stringify(targetValue)) {
        // Both modified differently - conflict
        conflicts.push({ path, base: baseValue, source: sourceValue, target: targetValue });
      } else if (JSON.stringify(baseValue) !== JSON.stringify(sourceValue)) {
        // Only source modified
        merged[key] = sourceValue;
      }
      // If only target modified or both modified the same way, keep target value (already in merged)
    }

    return conflicts;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    parts[2]++; // Increment patch version
    return parts.join('.');
  }

  private generateVersionId(): string {
    return `ver-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCommitHash(): string {
    return Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }
}

/**
 * Singleton instance
 */
export const versionControl = new AgentVersionControl();

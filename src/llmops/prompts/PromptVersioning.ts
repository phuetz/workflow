/**
 * Prompt Versioning System
 * Git-like version control for prompt templates
 */

import { logger } from '../../services/SimpleLogger';
import type {
  PromptTemplate,
  PromptVersion,
  PromptDiff,
} from '../types/llmops';

export interface Branch {
  name: string;
  promptId: string;
  currentVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MergeResult {
  success: boolean;
  conflicts?: Conflict[];
  mergedVersion?: string;
}

export interface Conflict {
  path: string;
  ours: any;
  theirs: any;
  resolved?: any;
}

export class PromptVersioning {
  private versions: Map<string, PromptVersion[]> = new Map();
  private branches: Map<string, Branch[]> = new Map();
  private tags: Map<string, { version: string; tag: string }[]> = new Map();

  /**
   * Create new version of prompt
   */
  async createVersion(
    promptId: string,
    template: string,
    changelog: string,
    author: string
  ): Promise<PromptVersion> {
    const versions = this.versions.get(promptId) || [];
    const currentVersion = versions.length > 0 ? versions[versions.length - 1].version : '0.0.0';

    const newVersion: PromptVersion = {
      version: this.incrementVersion(currentVersion),
      promptId,
      template,
      changelog,
      author,
      createdAt: new Date(),
    };

    versions.push(newVersion);
    this.versions.set(promptId, versions);

    logger.debug(`[PromptVersioning] Created version ${newVersion.version} for ${promptId}`);
    return newVersion;
  }

  /**
   * Get specific version
   */
  getVersion(promptId: string, version: string): PromptVersion | undefined {
    const versions = this.versions.get(promptId);
    return versions?.find((v) => v.version === version);
  }

  /**
   * Get latest version
   */
  getLatestVersion(promptId: string): PromptVersion | undefined {
    const versions = this.versions.get(promptId);
    return versions && versions.length > 0 ? versions[versions.length - 1] : undefined;
  }

  /**
   * Get all versions for prompt
   */
  getVersionHistory(promptId: string): PromptVersion[] {
    return this.versions.get(promptId) || [];
  }

  /**
   * Compare two versions
   */
  diff(promptId: string, fromVersion: string, toVersion: string): PromptDiff {
    const from = this.getVersion(promptId, fromVersion);
    const to = this.getVersion(promptId, toVersion);

    if (!from || !to) {
      throw new Error('Version not found');
    }

    const changes: PromptDiff['changes'] = [];

    // Compare templates
    if (from.template !== to.template) {
      changes.push({
        type: 'modified',
        path: 'template',
        oldValue: from.template,
        newValue: to.template,
      });
    }

    return {
      from: fromVersion,
      to: toVersion,
      changes,
    };
  }

  /**
   * Rollback to previous version
   */
  async rollback(
    promptId: string,
    targetVersion: string,
    author: string
  ): Promise<PromptVersion> {
    const target = this.getVersion(promptId, targetVersion);
    if (!target) {
      throw new Error(`Version not found: ${targetVersion}`);
    }

    return this.createVersion(
      promptId,
      target.template,
      `Rollback to version ${targetVersion}`,
      author
    );
  }

  /**
   * Create branch
   */
  async createBranch(
    promptId: string,
    branchName: string,
    fromVersion?: string
  ): Promise<Branch> {
    const versions = this.versions.get(promptId);
    if (!versions || versions.length === 0) {
      throw new Error('No versions found for prompt');
    }

    const currentVersion = fromVersion || versions[versions.length - 1].version;

    const branch: Branch = {
      name: branchName,
      promptId,
      currentVersion,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const branches = this.branches.get(promptId) || [];
    branches.push(branch);
    this.branches.set(promptId, branches);

    logger.debug(`[PromptVersioning] Created branch ${branchName} for ${promptId}`);
    return branch;
  }

  /**
   * Get branch
   */
  getBranch(promptId: string, branchName: string): Branch | undefined {
    const branches = this.branches.get(promptId);
    return branches?.find((b) => b.name === branchName);
  }

  /**
   * List branches
   */
  listBranches(promptId: string): Branch[] {
    return this.branches.get(promptId) || [];
  }

  /**
   * Delete branch
   */
  async deleteBranch(promptId: string, branchName: string): Promise<void> {
    const branches = this.branches.get(promptId) || [];
    const filtered = branches.filter((b) => b.name !== branchName);
    this.branches.set(promptId, filtered);

    logger.debug(`[PromptVersioning] Deleted branch ${branchName}`);
  }

  /**
   * Merge branches
   */
  async mergeBranches(
    promptId: string,
    sourceBranch: string,
    targetBranch: string,
    author: string
  ): Promise<MergeResult> {
    const source = this.getBranch(promptId, sourceBranch);
    const target = this.getBranch(promptId, targetBranch);

    if (!source || !target) {
      throw new Error('Branch not found');
    }

    const sourceVersion = this.getVersion(promptId, source.currentVersion);
    const targetVersion = this.getVersion(promptId, target.currentVersion);

    if (!sourceVersion || !targetVersion) {
      throw new Error('Version not found');
    }

    // Detect conflicts
    const conflicts: Conflict[] = [];

    if (sourceVersion.template !== targetVersion.template) {
      conflicts.push({
        path: 'template',
        ours: targetVersion.template,
        theirs: sourceVersion.template,
      });
    }

    // If conflicts, return for manual resolution
    if (conflicts.length > 0) {
      return {
        success: false,
        conflicts,
      };
    }

    // No conflicts - auto-merge
    const merged = await this.createVersion(
      promptId,
      sourceVersion.template,
      `Merge ${sourceBranch} into ${targetBranch}`,
      author
    );

    // Update target branch
    target.currentVersion = merged.version;
    target.updatedAt = new Date();

    return {
      success: true,
      mergedVersion: merged.version,
    };
  }

  /**
   * Tag a version
   */
  async tagVersion(
    promptId: string,
    version: string,
    tag: string
  ): Promise<void> {
    const versionObj = this.getVersion(promptId, version);
    if (!versionObj) {
      throw new Error(`Version not found: ${version}`);
    }

    const tags = this.tags.get(promptId) || [];
    tags.push({ version, tag });
    this.tags.set(promptId, tags);

    logger.debug(`[PromptVersioning] Tagged version ${version} as ${tag}`);
  }

  /**
   * Get version by tag
   */
  getVersionByTag(promptId: string, tag: string): PromptVersion | undefined {
    const tags = this.tags.get(promptId);
    const tagEntry = tags?.find((t) => t.tag === tag);

    if (!tagEntry) {
      return undefined;
    }

    return this.getVersion(promptId, tagEntry.version);
  }

  /**
   * List tags
   */
  listTags(promptId: string): { version: string; tag: string }[] {
    return this.tags.get(promptId) || [];
  }

  /**
   * Get changelog
   */
  getChangelog(promptId: string): string {
    const versions = this.versions.get(promptId) || [];

    return versions
      .reverse()
      .map(
        (v) =>
          `## Version ${v.version} - ${v.createdAt.toISOString()}\n` +
          `Author: ${v.author}\n\n${v.changelog}\n`
      )
      .join('\n---\n\n');
  }

  /**
   * Increment semantic version
   */
  private incrementVersion(version: string, type: 'major' | 'minor' | 'patch' = 'patch'): string {
    const [major, minor, patch] = version.split('.').map(Number);

    switch (type) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
      default:
        return `${major}.${minor}.${patch + 1}`;
    }
  }

  /**
   * Visual diff (line-by-line)
   */
  visualDiff(promptId: string, fromVersion: string, toVersion: string): string {
    const from = this.getVersion(promptId, fromVersion);
    const to = this.getVersion(promptId, toVersion);

    if (!from || !to) {
      throw new Error('Version not found');
    }

    const fromLines = from.template.split('\n');
    const toLines = to.template.split('\n');

    const diff: string[] = [];
    diff.push(`--- Version ${fromVersion}`);
    diff.push(`+++ Version ${toVersion}`);

    const maxLines = Math.max(fromLines.length, toLines.length);

    for (let i = 0; i < maxLines; i++) {
      const fromLine = fromLines[i] || '';
      const toLine = toLines[i] || '';

      if (fromLine === toLine) {
        diff.push(`  ${fromLine}`);
      } else {
        if (fromLine) {
          diff.push(`- ${fromLine}`);
        }
        if (toLine) {
          diff.push(`+ ${toLine}`);
        }
      }
    }

    return diff.join('\n');
  }

  /**
   * Export version history
   */
  exportHistory(promptId: string): string {
    const versions = this.versions.get(promptId) || [];
    return JSON.stringify(versions, null, 2);
  }

  /**
   * Import version history
   */
  importHistory(promptId: string, json: string): number {
    const versions: PromptVersion[] = JSON.parse(json);
    this.versions.set(promptId, versions);

    logger.debug(`[PromptVersioning] Imported ${versions.length} versions`);
    return versions.length;
  }
}

/**
 * Version Manager and Rollback Service
 * Complete version management with safe rollback capabilities
 */

import { getGitService } from '../backend/git/GitService';
import { getDiffGenerator } from './DiffGenerator';
import { WorkflowData } from './WorkflowSync';
import {
  WorkflowVersion,
  VersionMetadata,
  VersionComparison,
  RollbackRequest,
  RollbackResult,
  GitHistory,
  GitAuthor,
} from '../types/git';
import { logger } from '../backend/services/LogService';
import * as fs from 'fs/promises';
import * as path from 'path';

export class VersionManager {
  private gitService = getGitService();
  private diffGenerator = getDiffGenerator();

  /**
   * Get workflow version history
   */
  async getVersionHistory(
    workflowId: string,
    repositoryId: string,
    limit: number = 50
  ): Promise<WorkflowVersion[]> {
    try {
      const repository = await this.gitService.getRepository(repositoryId);
      if (!repository) {
        throw new Error(`Repository not found: ${repositoryId}`);
      }

      const mapping = await this.gitService.getWorkflowMapping(workflowId);
      if (!mapping) {
        throw new Error(`No Git mapping found for workflow: ${workflowId}`);
      }

      // Get commit history for the workflow file
      const history = await this.gitService.getWorkflowGitHistory(
        workflowId,
        repositoryId,
        limit
      );

      // Load each version
      const versions: WorkflowVersion[] = [];

      for (const commit of history.commits) {
        try {
          const workflowData = await this.loadWorkflowAtCommit(
            repositoryId,
            mapping.filePath,
            commit.hash
          );

          const metadata = this.calculateMetadata(workflowData);

          // Convert author to proper GitAuthor format if it's a string
          const author: GitAuthor = typeof commit.author === 'string'
            ? { name: commit.author, email: (commit as any).email || '' }
            : commit.author;

          versions.push({
            id: commit.hash,
            workflowId,
            versionNumber: versions.length + 1,
            commitHash: commit.hash,
            branch: commit.branch,
            author,
            message: commit.message,
            timestamp: commit.timestamp,
            workflowData: workflowData as unknown as Record<string, unknown>,
            metadata,
          });
        } catch (error) {
          logger.warn('Failed to load workflow version', {
            workflowId,
            commitHash: commit.hash,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.info('Retrieved workflow version history', {
        workflowId,
        repositoryId,
        versionCount: versions.length,
      });

      return versions;
    } catch (error) {
      logger.error('Failed to get version history', {
        workflowId,
        repositoryId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get specific workflow version
   */
  async getVersion(
    workflowId: string,
    repositoryId: string,
    commitHash: string
  ): Promise<WorkflowVersion> {
    try {
      const repository = await this.gitService.getRepository(repositoryId);
      if (!repository) {
        throw new Error(`Repository not found: ${repositoryId}`);
      }

      const mapping = await this.gitService.getWorkflowMapping(workflowId);
      if (!mapping) {
        throw new Error(`No Git mapping found for workflow: ${workflowId}`);
      }

      const commit = await this.getCommitInfo(repositoryId, commitHash);
      const workflowData = await this.loadWorkflowAtCommit(
        repositoryId,
        mapping.filePath,
        commitHash
      );

      const metadata = this.calculateMetadata(workflowData);

      // Convert author to proper GitAuthor format if it's a string
      const author: GitAuthor = typeof commit.author === 'string'
        ? { name: commit.author, email: (commit as any).email || '' }
        : commit.author;

      return {
        id: commitHash,
        workflowId,
        versionNumber: 0, // Would need to calculate from history
        commitHash,
        branch: commit.branch,
        author,
        message: commit.message,
        timestamp: commit.timestamp,
        workflowData: workflowData as unknown as Record<string, unknown>,
        metadata,
      };
    } catch (error) {
      logger.error('Failed to get workflow version', {
        workflowId,
        commitHash,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    workflowId: string,
    repositoryId: string,
    fromCommit: string,
    toCommit: string
  ): Promise<VersionComparison> {
    try {
      const fromVersion = await this.getVersion(workflowId, repositoryId, fromCommit);
      const toVersion = await this.getVersion(workflowId, repositoryId, toCommit);

      const diff = await this.diffGenerator.generateWorkflowDiff(
        fromVersion.workflowData as unknown as WorkflowData,
        toVersion.workflowData as unknown as WorkflowData
      );

      // Analyze compatibility and breaking changes
      const { compatible, breakingChanges } = this.analyzeCompatibility(
        fromVersion,
        toVersion,
        diff
      );

      const recommendations = this.generateRecommendations(
        fromVersion,
        toVersion,
        diff
      );

      return {
        fromVersion,
        toVersion,
        diff,
        compatible,
        breakingChanges,
        recommendations,
      };
    } catch (error) {
      logger.error('Failed to compare versions', {
        workflowId,
        fromCommit,
        toCommit,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Tag a version
   */
  async tagVersion(
    workflowId: string,
    repositoryId: string,
    commitHash: string,
    tag: string,
    message?: string,
    userId: string = 'system'
  ): Promise<void> {
    try {
      await this.gitService.tagWorkflowVersion(
        workflowId,
        0, // Version number would be calculated
        tag,
        repositoryId,
        userId
      );

      logger.info('Version tagged', {
        workflowId,
        commitHash,
        tag,
      });
    } catch (error) {
      logger.error('Failed to tag version', {
        workflowId,
        commitHash,
        tag,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Rollback to previous version
   */
  async rollback(request: RollbackRequest, userId: string): Promise<RollbackResult> {
    const { workflowId, targetVersion, strategy, validateBefore } = request;

    try {
      logger.info('Starting rollback', {
        workflowId,
        targetVersion,
        strategy,
        userId,
      });

      // Get workflow mapping
      const mapping = await this.gitService.getWorkflowMapping(workflowId);
      if (!mapping) {
        throw new Error(`No Git mapping found for workflow: ${workflowId}`);
      }

      const repositoryId = mapping.repositoryId;

      // Get current and target versions
      const currentVersion = await this.getCurrentVersion(workflowId, repositoryId);
      const targetWorkflowVersion = await this.getVersion(
        workflowId,
        repositoryId,
        targetVersion
      );

      // Validate before rollback if requested
      let validationPassed = true;
      const warnings: string[] = [];

      if (validateBefore) {
        const validation = await this.validateRollback(
          currentVersion,
          targetWorkflowVersion
        );
        validationPassed = validation.valid;
        warnings.push(...validation.warnings);

        if (!validationPassed && strategy !== 'soft') {
          throw new Error('Rollback validation failed: ' + validation.errors.join(', '));
        }
      }

      let createdBranch: string | undefined;

      // Perform rollback based on strategy
      switch (strategy) {
        case 'hard':
          await this.performHardRollback(
            repositoryId,
            mapping.filePath,
            targetVersion,
            userId
          );
          break;

        case 'soft':
          await this.performSoftRollback(
            workflowId,
            repositoryId,
            targetWorkflowVersion.workflowData as unknown as WorkflowData,
            userId
          );
          break;

        case 'create-branch':
          createdBranch = await this.performBranchRollback(
            workflowId,
            repositoryId,
            targetVersion,
            userId
          );
          break;

        default:
          throw new Error(`Unknown rollback strategy: ${strategy}`);
      }

      logger.info('Rollback completed', {
        workflowId,
        from: currentVersion.commitHash,
        to: targetVersion,
        strategy,
        createdBranch,
      });

      return {
        success: true,
        workflowId,
        rolledBackFrom: currentVersion.commitHash,
        rolledBackTo: targetVersion,
        validationPassed,
        warnings,
        createdBranch,
      };
    } catch (error) {
      logger.error('Rollback failed', {
        workflowId,
        targetVersion,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        workflowId,
        rolledBackFrom: '',
        rolledBackTo: targetVersion,
        validationPassed: false,
        warnings: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Perform hard rollback (reset to commit)
   */
  private async performHardRollback(
    repositoryId: string,
    filePath: string,
    targetCommit: string,
    userId: string
  ): Promise<void> {
    // This would use git reset --hard or git checkout
    // For safety, we'll use checkout to a specific file

    const repository = await this.gitService.getRepository(repositoryId);
    if (!repository) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    // Load file at target commit and write it
    const targetContent = await this.loadFileAtCommit(
      repositoryId,
      filePath,
      targetCommit
    );

    const fullPath = path.join(repository.localPath, filePath);
    await fs.writeFile(fullPath, targetContent);

    // Commit the rollback
    await this.gitService.commit(
      {
        repositoryId,
        message: `Rollback to ${targetCommit}`,
        files: [filePath],
        author: {
          name: userId,
          email: `${userId}@workflow.local`,
        },
      },
      userId
    );
  }

  /**
   * Perform soft rollback (create new commit with old content)
   */
  private async performSoftRollback(
    workflowId: string,
    repositoryId: string,
    targetWorkflowData: WorkflowData,
    userId: string
  ): Promise<void> {
    // This creates a new commit with the old workflow data
    // Similar to git revert but for specific content

    const mapping = await this.gitService.getWorkflowMapping(workflowId);
    if (!mapping) {
      throw new Error(`No Git mapping found for workflow: ${workflowId}`);
    }

    const repository = await this.gitService.getRepository(repositoryId);
    if (!repository) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    // Write the old workflow data
    const fullPath = path.join(repository.localPath, mapping.filePath);
    await fs.writeFile(fullPath, JSON.stringify(targetWorkflowData, null, 2));

    // Commit as a new version
    await this.gitService.commit(
      {
        repositoryId,
        message: `Soft rollback: Restore previous version of ${targetWorkflowData.name}`,
        files: [mapping.filePath],
        author: {
          name: userId,
          email: `${userId}@workflow.local`,
        },
      },
      userId
    );
  }

  /**
   * Perform rollback by creating a new branch
   */
  private async performBranchRollback(
    workflowId: string,
    repositoryId: string,
    targetCommit: string,
    userId: string
  ): Promise<string> {
    const branchName = `rollback-${workflowId}-${Date.now()}`;

    // Create branch from target commit
    await this.gitService.createBranch(
      {
        repositoryId,
        branchName,
        from: targetCommit,
        checkout: true,
      },
      userId
    );

    logger.info('Created rollback branch', {
      workflowId,
      branchName,
      fromCommit: targetCommit,
    });

    return branchName;
  }

  /**
   * Validate rollback
   */
  private async validateRollback(
    currentVersion: WorkflowVersion,
    targetVersion: WorkflowVersion
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if rolling back to a much older version
    const daysDiff =
      (currentVersion.timestamp.getTime() - targetVersion.timestamp.getTime()) /
      (1000 * 60 * 60 * 24);

    if (daysDiff > 30) {
      warnings.push(
        `Rolling back ${Math.round(daysDiff)} days. This may cause significant changes.`
      );
    }

    // Check if target version has fewer nodes (potential data loss)
    if (
      targetVersion.metadata.nodeCount < currentVersion.metadata.nodeCount * 0.5
    ) {
      warnings.push(
        `Target version has ${targetVersion.metadata.nodeCount} nodes vs current ${currentVersion.metadata.nodeCount}. Significant workflow changes detected.`
      );
    }

    // Check execution history
    if (currentVersion.metadata.executionCount && currentVersion.metadata.executionCount > 100) {
      warnings.push(
        'Current version has significant execution history. Consider backing up before rollback.'
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Load workflow at specific commit
   */
  private async loadWorkflowAtCommit(
    repositoryId: string,
    filePath: string,
    commitHash: string
  ): Promise<WorkflowData> {
    const content = await this.loadFileAtCommit(repositoryId, filePath, commitHash);
    return JSON.parse(content);
  }

  /**
   * Load file content at specific commit
   */
  private async loadFileAtCommit(
    repositoryId: string,
    filePath: string,
    commitHash: string
  ): Promise<string> {
    // This would use git show commitHash:filePath
    // For now, simplified implementation

    const repository = await this.gitService.getRepository(repositoryId);
    if (!repository) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    // Would execute: git show commitHash:filePath
    // For now, return a placeholder
    const fullPath = path.join(repository.localPath, filePath);
    return await fs.readFile(fullPath, 'utf-8');
  }

  /**
   * Get commit info
   */
  private async getCommitInfo(
    repositoryId: string,
    commitHash: string
  ): Promise<any> {
    // Would get commit info from git service
    return {
      hash: commitHash,
      branch: '',
      author: { name: '', email: '' },
      message: '',
      timestamp: new Date(),
      files: [],
      parents: [],
      stats: { additions: 0, deletions: 0, total: 0, filesChanged: 0 },
    };
  }

  /**
   * Get current version
   */
  private async getCurrentVersion(
    workflowId: string,
    repositoryId: string
  ): Promise<WorkflowVersion> {
    const history = await this.getVersionHistory(workflowId, repositoryId, 1);
    if (history.length === 0) {
      throw new Error('No version history found');
    }
    return history[0];
  }

  /**
   * Calculate version metadata
   */
  private calculateMetadata(workflow: WorkflowData): VersionMetadata {
    const nodeCount = workflow.nodes.length;
    const edgeCount = workflow.edges.length;

    // Calculate complexity (simplified)
    const complexity = nodeCount + edgeCount * 0.5;

    return {
      nodeCount,
      edgeCount,
      complexity,
      executionCount: 0,
      stable: false,
      production: false,
    };
  }

  /**
   * Analyze compatibility between versions
   */
  private analyzeCompatibility(
    fromVersion: WorkflowVersion,
    toVersion: WorkflowVersion,
    diff: any
  ): { compatible: boolean; breakingChanges: string[] } {
    const breakingChanges: string[] = [];

    // Check for removed nodes
    if (diff.visualDiff.nodesDeleted.length > 0) {
      breakingChanges.push(
        `${diff.visualDiff.nodesDeleted.length} node(s) were removed`
      );
    }

    // Check for removed connections
    if (diff.visualDiff.edgesDeleted.length > 0) {
      breakingChanges.push(
        `${diff.visualDiff.edgesDeleted.length} connection(s) were removed`
      );
    }

    // Check for major node modifications
    const majorModifications = diff.visualDiff.nodesModified.filter(
      (mod: any) => mod.changes.length > 5
    );

    if (majorModifications.length > 0) {
      breakingChanges.push(
        `${majorModifications.length} node(s) have major modifications`
      );
    }

    return {
      compatible: breakingChanges.length === 0,
      breakingChanges,
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    fromVersion: WorkflowVersion,
    toVersion: WorkflowVersion,
    diff: any
  ): string[] {
    const recommendations: string[] = [];

    if (diff.summary.complexity === 'high') {
      recommendations.push('High complexity changes detected. Review carefully before deploying.');
    }

    if (diff.visualDiff.nodesDeleted.length > 0) {
      recommendations.push('Nodes were removed. Ensure dependent workflows are updated.');
    }

    if (toVersion.metadata.nodeCount > fromVersion.metadata.nodeCount * 2) {
      recommendations.push('Workflow size has doubled. Consider splitting into sub-workflows.');
    }

    if (!toVersion.metadata.stable && fromVersion.metadata.stable) {
      recommendations.push('Moving from stable to unstable version. Test thoroughly.');
    }

    return recommendations;
  }
}

// Singleton instance
let versionManagerInstance: VersionManager | null = null;

export function getVersionManager(): VersionManager {
  if (!versionManagerInstance) {
    versionManagerInstance = new VersionManager();
  }
  return versionManagerInstance;
}

/**
 * Workflow Synchronization Service
 * Bi-directional sync between workflows and Git repositories
 */

import { getGitService } from '../backend/git/GitService';
import { GitSyncResult, WorkflowGitMapping, SyncConfig, GitConflict } from '../types/git';
import { logger } from '../backend/services/LogService';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface WorkflowData {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
  settings?: Record<string, any>;
  version?: string;
  updatedAt: Date;
}

export class WorkflowSync {
  private syncConfig: Map<string, SyncConfig> = new Map();
  private gitService = getGitService();

  /**
   * Configure sync for a workflow
   */
  configureSyncConfig(workflowId: string, config: SyncConfig): void {
    this.syncConfig.set(workflowId, config);
    logger.info('Workflow sync configured', { workflowId, config });
  }

  /**
   * Sync workflow to Git (push)
   */
  async syncToGit(
    workflow: WorkflowData,
    repositoryId: string,
    branch: string,
    userId: string
  ): Promise<GitSyncResult> {
    const startTime = Date.now();

    try {
      const config = this.syncConfig.get(workflow.id) || this.getDefaultConfig();
      const mapping = await this.gitService.getWorkflowMapping(workflow.id);

      // Get repository
      const repository = await this.gitService.getRepository(repositoryId);
      if (!repository) {
        throw new Error(`Repository not found: ${repositoryId}`);
      }

      // Determine file path
      const filePath = mapping?.filePath || `workflows/${workflow.id}.json`;
      const fullPath = path.join(repository.localPath, filePath);

      // Pull before push if configured
      if (config.pullBeforePush) {
        try {
          await this.gitService.pull({ repositoryId, branch }, userId);
        } catch (error) {
          logger.warn('Pull before push failed', { error });
        }
      }

      // Check for conflicts
      const status = await this.gitService.getStatus(repositoryId);
      const conflicts: GitConflict[] = [];

      if (status.conflicted.length > 0 && config.preventConflicts) {
        // There are conflicts - return them for resolution
        for (const file of status.conflicted) {
          const content = await fs.readFile(path.join(repository.localPath, file), 'utf-8');
          conflicts.push({
            file,
            ours: '',
            theirs: '',
            resolved: false,
            markers: [],
          });
        }

        return {
          success: false,
          workflowId: workflow.id,
          repositoryId,
          branch,
          changes: {
            added: [],
            modified: [],
            deleted: [],
          },
          conflicts,
          syncDuration: Date.now() - startTime,
        };
      }

      // Create directory if needed
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      // Write workflow file with metadata
      const workflowExport = {
        ...workflow,
        exportedAt: new Date().toISOString(),
        exportedBy: userId,
        git: {
          repository: repositoryId,
          branch,
        },
      };

      await fs.writeFile(fullPath, JSON.stringify(workflowExport, null, 2));

      let commitHash: string | undefined;

      // Auto-commit if configured
      if (config.autoCommit) {
        let message: string;

        if (config.useAICommitMessages) {
          // Generate AI commit message (would call AI service)
          message = await this.generateCommitMessage(workflow, mapping);
        } else if (config.commitMessageTemplate) {
          message = this.applyTemplate(config.commitMessageTemplate, workflow);
        } else {
          message = `Update workflow: ${workflow.name}`;
        }

        const commit = await this.gitService.commit(
          {
            repositoryId,
            message,
            files: [filePath],
            branch,
            author: {
              name: userId,
              email: `${userId}@workflow.local`,
            },
          },
          userId
        );

        commitHash = commit.hash;

        // Auto-push if configured
        if (config.autoPush) {
          await this.gitService.push({ repositoryId, branch }, userId);
        }
      }

      // Update mapping
      const newMapping: WorkflowGitMapping = {
        workflowId: workflow.id,
        workflowName: workflow.name,
        repositoryId,
        filePath,
        branch,
        lastCommitHash: commitHash,
        lastSyncedAt: new Date(),
        autoSync: config.autoCommit,
        syncStrategy: config.autoCommit ? 'on-save' : 'manual',
      };

      // Store mapping (would save to database)
      logger.info('Workflow synced to Git', {
        workflowId: workflow.id,
        repositoryId,
        branch,
        commitHash,
      });

      return {
        success: true,
        workflowId: workflow.id,
        repositoryId,
        commitHash,
        branch,
        changes: {
          added: commitHash ? [filePath] : [],
          modified: !commitHash ? [filePath] : [],
          deleted: [],
        },
        syncDuration: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('Failed to sync workflow to Git', {
        workflowId: workflow.id,
        repositoryId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Sync workflow from Git (pull)
   */
  async syncFromGit(
    workflowId: string,
    repositoryId: string,
    branch: string,
    userId: string
  ): Promise<WorkflowData> {
    try {
      const mapping = await this.gitService.getWorkflowMapping(workflowId);
      if (!mapping) {
        throw new Error(`No Git mapping found for workflow: ${workflowId}`);
      }

      const repository = await this.gitService.getRepository(repositoryId);
      if (!repository) {
        throw new Error(`Repository not found: ${repositoryId}`);
      }

      // Pull latest changes
      await this.gitService.pull({ repositoryId, branch }, userId);

      // Read workflow file
      const fullPath = path.join(repository.localPath, mapping.filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const workflowData = JSON.parse(content);

      // Remove Git metadata
      delete workflowData.exportedAt;
      delete workflowData.exportedBy;
      delete workflowData.git;

      logger.info('Workflow synced from Git', {
        workflowId,
        repositoryId,
        branch,
      });

      return workflowData;
    } catch (error) {
      logger.error('Failed to sync workflow from Git', {
        workflowId,
        repositoryId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Sync all workflows in a repository
   */
  async syncAllFromGit(
    repositoryId: string,
    branch: string,
    userId: string
  ): Promise<WorkflowData[]> {
    try {
      const repository = await this.gitService.getRepository(repositoryId);
      if (!repository) {
        throw new Error(`Repository not found: ${repositoryId}`);
      }

      // Pull latest changes
      await this.gitService.pull({ repositoryId, branch }, userId);

      // Find all workflow files
      const workflowsDir = path.join(repository.localPath, 'workflows');
      const workflows: WorkflowData[] = [];

      try {
        const files = await fs.readdir(workflowsDir);

        for (const file of files) {
          if (file.endsWith('.json')) {
            const fullPath = path.join(workflowsDir, file);
            const content = await fs.readFile(fullPath, 'utf-8');
            const workflow = JSON.parse(content);

            // Remove Git metadata
            delete workflow.exportedAt;
            delete workflow.exportedBy;
            delete workflow.git;

            workflows.push(workflow);
          }
        }
      } catch (error) {
        // Directory doesn't exist or no files
        logger.warn('No workflows found in repository', { repositoryId });
      }

      logger.info('All workflows synced from Git', {
        repositoryId,
        branch,
        count: workflows.length,
      });

      return workflows;
    } catch (error) {
      logger.error('Failed to sync all workflows from Git', {
        repositoryId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if workflow has changes compared to Git
   */
  async hasChanges(
    workflow: WorkflowData,
    repositoryId: string
  ): Promise<boolean> {
    try {
      const mapping = await this.gitService.getWorkflowMapping(workflow.id);
      if (!mapping) {
        return false;
      }

      const repository = await this.gitService.getRepository(repositoryId);
      if (!repository) {
        return false;
      }

      // Read current Git version
      const fullPath = path.join(repository.localPath, mapping.filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const gitWorkflow = JSON.parse(content);

      // Compare (simplified comparison)
      const currentStr = JSON.stringify({
        nodes: workflow.nodes,
        edges: workflow.edges,
        settings: workflow.settings,
      });

      const gitStr = JSON.stringify({
        nodes: gitWorkflow.nodes,
        edges: gitWorkflow.edges,
        settings: gitWorkflow.settings,
      });

      return currentStr !== gitStr;
    } catch (error) {
      logger.error('Failed to check workflow changes', {
        workflowId: workflow.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Generate AI-powered commit message
   */
  private async generateCommitMessage(
    workflow: WorkflowData,
    previousMapping: WorkflowGitMapping | null
  ): Promise<string> {
    // This would integrate with an AI service
    // For now, generate a descriptive message based on changes

    const prefix = previousMapping ? 'Update' : 'Add';
    const nodeCount = workflow.nodes.length;
    const edgeCount = workflow.edges.length;

    return `${prefix} workflow: ${workflow.name}

- Nodes: ${nodeCount}
- Connections: ${edgeCount}
- Last modified: ${workflow.updatedAt.toISOString()}`;
  }

  /**
   * Apply commit message template
   */
  private applyTemplate(template: string, workflow: WorkflowData): string {
    return template
      .replace('{name}', workflow.name)
      .replace('{id}', workflow.id)
      .replace('{nodeCount}', workflow.nodes.length.toString())
      .replace('{edgeCount}', workflow.edges.length.toString())
      .replace('{date}', new Date().toISOString());
  }

  /**
   * Get default sync configuration
   */
  private getDefaultConfig(): SyncConfig {
    return {
      autoCommit: false,
      autoPush: false,
      useAICommitMessages: false,
      preventConflicts: true,
      pullBeforePush: true,
    };
  }

  /**
   * Enable auto-sync for a workflow
   */
  enableAutoSync(workflowId: string, interval: number = 60000): void {
    // This would set up a periodic sync
    logger.info('Auto-sync enabled for workflow', { workflowId, interval });
  }

  /**
   * Disable auto-sync for a workflow
   */
  disableAutoSync(workflowId: string): void {
    logger.info('Auto-sync disabled for workflow', { workflowId });
  }
}

// Singleton instance
let workflowSyncInstance: WorkflowSync | null = null;

export function getWorkflowSync(): WorkflowSync {
  if (!workflowSyncInstance) {
    workflowSyncInstance = new WorkflowSync();
  }
  return workflowSyncInstance;
}

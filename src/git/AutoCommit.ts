/**
 * Auto-Commit Service
 * Automatic commit generation with AI-powered commit messages
 */

import { getGitService } from '../backend/git/GitService';
import { getWorkflowSync, WorkflowData } from './WorkflowSync';
import { AICommitMessage } from '../types/git';
import { logger } from '../backend/services/LogService';

export interface AutoCommitConfig {
  enabled: boolean;
  debounceMs: number; // Wait time before committing
  useAI: boolean;
  commitOnSave: boolean;
  commitOnExecute: boolean;
  batchCommits: boolean; // Group multiple changes into one commit
  maxBatchSize: number;
}

export class AutoCommit {
  private config: Map<string, AutoCommitConfig> = new Map();
  private pendingCommits: Map<string, NodeJS.Timeout> = new Map();
  private gitService = getGitService();
  private workflowSync = getWorkflowSync();

  /**
   * Configure auto-commit for a workflow
   */
  configure(workflowId: string, config: AutoCommitConfig): void {
    this.config.set(workflowId, config);
    logger.info('Auto-commit configured', { workflowId, config });
  }

  /**
   * Trigger auto-commit on workflow save
   */
  async onWorkflowSave(
    workflow: WorkflowData,
    repositoryId: string,
    branch: string,
    userId: string
  ): Promise<void> {
    const config = this.config.get(workflow.id);

    if (!config || !config.enabled || !config.commitOnSave) {
      return;
    }

    // Cancel any pending commit
    const pending = this.pendingCommits.get(workflow.id);
    if (pending) {
      clearTimeout(pending);
    }

    // Debounce the commit
    const timeout = setTimeout(async () => {
      await this.performCommit(workflow, repositoryId, branch, userId, 'save');
      this.pendingCommits.delete(workflow.id);
    }, config.debounceMs);

    this.pendingCommits.set(workflow.id, timeout);
  }

  /**
   * Trigger auto-commit on workflow execution
   */
  async onWorkflowExecute(
    workflow: WorkflowData,
    repositoryId: string,
    branch: string,
    userId: string
  ): Promise<void> {
    const config = this.config.get(workflow.id);

    if (!config || !config.enabled || !config.commitOnExecute) {
      return;
    }

    await this.performCommit(workflow, repositoryId, branch, userId, 'execute');
  }

  /**
   * Perform the actual commit
   */
  private async performCommit(
    workflow: WorkflowData,
    repositoryId: string,
    branch: string,
    userId: string,
    trigger: 'save' | 'execute'
  ): Promise<void> {
    try {
      const config = this.config.get(workflow.id);
      if (!config) return;

      // Generate commit message
      let message: string;

      if (config.useAI) {
        const aiMessage = await this.generateAICommitMessage(workflow, trigger);
        message = this.formatAIMessage(aiMessage);
      } else {
        message = this.generateDefaultMessage(workflow, trigger);
      }

      // Sync to Git with commit
      const result = await this.workflowSync.syncToGit(
        workflow,
        repositoryId,
        branch,
        userId
      );

      if (result.success) {
        logger.info('Auto-commit successful', {
          workflowId: workflow.id,
          commitHash: result.commitHash,
          trigger,
          aiGenerated: config.useAI,
        });
      } else if (result.conflicts && result.conflicts.length > 0) {
        logger.warn('Auto-commit blocked by conflicts', {
          workflowId: workflow.id,
          conflicts: result.conflicts.length,
        });
      }
    } catch (error) {
      logger.error('Auto-commit failed', {
        workflowId: workflow.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate AI-powered commit message
   */
  private async generateAICommitMessage(
    workflow: WorkflowData,
    trigger: string
  ): Promise<AICommitMessage> {
    // This would integrate with an AI service (OpenAI, Claude, etc.)
    // For now, generate a structured message based on workflow analysis

    const changes = this.analyzeWorkflowChanges(workflow);

    let type: AICommitMessage['type'] = 'chore';
    let breaking = false;

    if (changes.nodesAdded > 0 || changes.majorChanges) {
      type = 'feat';
    } else if (changes.nodesRemoved > 0) {
      type = 'refactor';
    } else if (changes.settingsChanged) {
      type = 'fix';
    }

    const scope = this.determineScope(workflow);

    let message = `${type}`;
    if (scope) {
      message += `(${scope})`;
    }
    message += `: ${this.generateShortDescription(workflow, changes)}`;

    const body = this.generateDetailedDescription(workflow, changes, trigger);

    return {
      message,
      body,
      confidence: 0.85,
      type,
      scope,
      breaking,
    };
  }

  /**
   * Analyze workflow changes
   */
  private analyzeWorkflowChanges(workflow: WorkflowData): {
    nodesAdded: number;
    nodesRemoved: number;
    nodesModified: number;
    edgesChanged: number;
    settingsChanged: boolean;
    majorChanges: boolean;
  } {
    // This would compare with previous version
    // For now, provide a simplified analysis

    return {
      nodesAdded: 0,
      nodesRemoved: 0,
      nodesModified: 0,
      edgesChanged: 0,
      settingsChanged: false,
      majorChanges: false,
    };
  }

  /**
   * Determine commit scope
   */
  private determineScope(workflow: WorkflowData): string | undefined {
    // Analyze workflow to determine scope
    // Could be based on node types, workflow category, etc.

    const nodeTypes = new Set(workflow.nodes.map(n => n.type));

    if (nodeTypes.has('http') || nodeTypes.has('webhook')) {
      return 'api';
    } else if (nodeTypes.has('schedule') || nodeTypes.has('cron')) {
      return 'automation';
    } else if (nodeTypes.has('ai') || nodeTypes.has('llm')) {
      return 'ai';
    } else if (nodeTypes.has('database') || nodeTypes.has('sql')) {
      return 'data';
    }

    return undefined;
  }

  /**
   * Generate short description
   */
  private generateShortDescription(
    workflow: WorkflowData,
    changes: ReturnType<typeof this.analyzeWorkflowChanges>
  ): string {
    if (changes.nodesAdded > 0) {
      return `add ${changes.nodesAdded} new node${changes.nodesAdded > 1 ? 's' : ''} to ${workflow.name}`;
    } else if (changes.nodesRemoved > 0) {
      return `remove ${changes.nodesRemoved} node${changes.nodesRemoved > 1 ? 's' : ''} from ${workflow.name}`;
    } else if (changes.edgesChanged > 0) {
      return `update connections in ${workflow.name}`;
    } else if (changes.settingsChanged) {
      return `update settings for ${workflow.name}`;
    } else {
      return `update ${workflow.name}`;
    }
  }

  /**
   * Generate detailed description
   */
  private generateDetailedDescription(
    workflow: WorkflowData,
    changes: ReturnType<typeof this.analyzeWorkflowChanges>,
    trigger: string
  ): string {
    const lines: string[] = [];

    lines.push(`Workflow: ${workflow.name} (${workflow.id})`);
    lines.push(`Trigger: ${trigger}`);
    lines.push('');

    lines.push('Current state:');
    lines.push(`- Nodes: ${workflow.nodes.length}`);
    lines.push(`- Connections: ${workflow.edges.length}`);

    if (changes.nodesAdded > 0 || changes.nodesRemoved > 0 || changes.nodesModified > 0) {
      lines.push('');
      lines.push('Changes:');
      if (changes.nodesAdded > 0) {
        lines.push(`- Added: ${changes.nodesAdded} node${changes.nodesAdded > 1 ? 's' : ''}`);
      }
      if (changes.nodesRemoved > 0) {
        lines.push(`- Removed: ${changes.nodesRemoved} node${changes.nodesRemoved > 1 ? 's' : ''}`);
      }
      if (changes.nodesModified > 0) {
        lines.push(`- Modified: ${changes.nodesModified} node${changes.nodesModified > 1 ? 's' : ''}`);
      }
      if (changes.edgesChanged > 0) {
        lines.push(`- Edge changes: ${changes.edgesChanged}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format AI message for commit
   */
  private formatAIMessage(aiMessage: AICommitMessage): string {
    let message = aiMessage.message;

    if (aiMessage.body) {
      message += '\n\n' + aiMessage.body;
    }

    if (aiMessage.breaking) {
      message += '\n\nBREAKING CHANGE: This commit contains breaking changes';
    }

    message += `\n\nAI-generated commit message (confidence: ${Math.round(aiMessage.confidence * 100)}%)`;

    return message;
  }

  /**
   * Generate default commit message
   */
  private generateDefaultMessage(workflow: WorkflowData, trigger: string): string {
    const timestamp = new Date().toISOString();
    return `Update workflow: ${workflow.name}

Triggered by: ${trigger}
Updated at: ${timestamp}
Nodes: ${workflow.nodes.length}
Connections: ${workflow.edges.length}`;
  }

  /**
   * Get default auto-commit configuration
   */
  getDefaultConfig(): AutoCommitConfig {
    return {
      enabled: false,
      debounceMs: 5000,
      useAI: false,
      commitOnSave: true,
      commitOnExecute: false,
      batchCommits: true,
      maxBatchSize: 10,
    };
  }

  /**
   * Flush pending commits immediately
   */
  async flushPending(workflowId: string): Promise<void> {
    const pending = this.pendingCommits.get(workflowId);
    if (pending) {
      clearTimeout(pending);
      this.pendingCommits.delete(workflowId);
      logger.info('Flushed pending commit', { workflowId });
    }
  }

  /**
   * Flush all pending commits
   */
  async flushAll(): Promise<void> {
    for (const [workflowId, timeout] of this.pendingCommits.entries()) {
      clearTimeout(timeout);
      this.pendingCommits.delete(workflowId);
    }
    logger.info('Flushed all pending commits');
  }
}

// Singleton instance
let autoCommitInstance: AutoCommit | null = null;

export function getAutoCommit(): AutoCommit {
  if (!autoCommitInstance) {
    autoCommitInstance = new AutoCommit();
  }
  return autoCommitInstance;
}

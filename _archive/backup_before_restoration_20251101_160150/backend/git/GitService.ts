/**
 * Git Integration Service
 * Version control for workflows using Git
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  GitConfig,
  GitRepository,
  GitCommit,
  GitBranch,
  GitStatus,
  WorkflowGitMapping,
  CommitRequest,
  PushRequest,
  PullRequest,
  CloneRequest,
  GitDiff,
  MergeRequest,
  GitConflict,
  ResolveConflictRequest,
  GitTag,
  TagRequest,
  GitHistory,
  WorkflowVersionInfo,
  GitSyncRequest,
  GitSyncResult,
  BranchRequest,
  CheckoutRequest,
  GitRemote,
  AddRemoteRequest,
  GitStats,
  WorkflowExportRequest,
  WorkflowImportRequest,
} from './GitTypes';
import { logger } from '../services/LogService';
import { getAuditService } from '../audit/AuditService';
import { AuditAction, AuditCategory, AuditSeverity } from '../audit/AuditTypes';

const execAsync = promisify(exec);

export class GitService {
  private config: GitConfig;
  private repositories: Map<string, GitRepository> = new Map();
  private workflowMappings: Map<string, WorkflowGitMapping> = new Map();
  private baseRepoPath: string;

  constructor(config?: GitConfig) {
    this.config = config || {
      enabled: process.env.GIT_ENABLED === 'true',
      defaultBranch: process.env.GIT_DEFAULT_BRANCH || 'main',
      repositoryPath: process.env.GIT_REPO_PATH || './git-repos',
    };

    this.baseRepoPath = this.config.repositoryPath || './git-repos';
  }

  /**
   * Initialize Git service
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Git integration is disabled');
      return;
    }

    // Create base repository directory
    try {
      await fs.mkdir(this.baseRepoPath, { recursive: true });
      logger.info(`Git service initialized at ${this.baseRepoPath}`);
    } catch (error) {
      logger.error('Failed to initialize Git service', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Clone a repository
   */
  async cloneRepository(request: CloneRequest, userId: string): Promise<GitRepository> {
    const { remoteUrl, name, description, branch, credentials } = request;

    const repoId = `repo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const localPath = path.join(this.baseRepoPath, repoId);

    try {
      // Build clone command with credentials if provided
      let cloneUrl = remoteUrl;
      if (credentials?.token) {
        // For GitHub: https://token@github.com/user/repo.git
        cloneUrl = remoteUrl.replace('https://', `https://${credentials.token}@`);
      } else if (credentials?.username && credentials?.password) {
        cloneUrl = remoteUrl.replace(
          'https://',
          `https://${credentials.username}:${credentials.password}@`
        );
      }

      const branchArg = branch ? `-b ${branch}` : '';
      await execAsync(`git clone ${branchArg} ${cloneUrl} ${localPath}`);

      // Get current branch
      const { stdout: branchOutput } = await execAsync('git branch --show-current', {
        cwd: localPath,
      });

      const repository: GitRepository = {
        id: repoId,
        name,
        description,
        remoteUrl,
        localPath,
        defaultBranch: branch || this.config.defaultBranch,
        currentBranch: branchOutput.trim(),
        isClean: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.repositories.set(repoId, repository);

      // Audit log
      const auditService = getAuditService();
      await auditService.log({
        action: AuditAction.INTEGRATION_ADD,
        category: AuditCategory.INTEGRATION,
        severity: AuditSeverity.INFO,
        userId,
        username: userId,
        resourceType: 'git-repository',
        resourceId: repoId,
        success: true,
        details: {
          repositoryName: name,
          remoteUrl,
          branch: repository.currentBranch,
        },
      });

      logger.info('Repository cloned', {
        repoId,
        name,
        remoteUrl,
        clonedBy: userId,
      });

      return repository;
    } catch (error) {
      logger.error('Failed to clone repository', {
        error: error instanceof Error ? error.message : String(error),
        remoteUrl,
      });
      throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get repository status
   */
  async getStatus(repositoryId: string): Promise<GitStatus> {
    const repo = this.repositories.get(repositoryId);
    if (!repo) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    try {
      // Get current branch
      const { stdout: branchOutput } = await execAsync('git branch --show-current', {
        cwd: repo.localPath,
      });

      // Get tracking info
      const { stdout: trackingOutput } = await execAsync(
        'git rev-list --left-right --count HEAD...@{u} 2>/dev/null || echo "0\t0"',
        { cwd: repo.localPath }
      );

      const [ahead, behind] = trackingOutput.trim().split('\t').map(Number);

      // Get file status
      const { stdout: statusOutput } = await execAsync('git status --porcelain', {
        cwd: repo.localPath,
      });

      const staged: string[] = [];
      const unstaged: string[] = [];
      const untracked: string[] = [];
      const conflicted: string[] = [];

      statusOutput.split('\n').forEach((line) => {
        if (!line.trim()) return;

        const status = line.substring(0, 2);
        const file = line.substring(3);

        if (status.includes('U') || status.includes('A') && status.includes('A')) {
          conflicted.push(file);
        } else if (status[0] !== ' ' && status[0] !== '?') {
          staged.push(file);
        } else if (status[1] !== ' ') {
          unstaged.push(file);
        } else if (status === '??') {
          untracked.push(file);
        }
      });

      const gitStatus: GitStatus = {
        branch: branchOutput.trim(),
        ahead,
        behind,
        staged,
        unstaged,
        untracked,
        conflicted,
      };

      // Update repository clean status
      repo.isClean = staged.length === 0 && unstaged.length === 0 && conflicted.length === 0;
      this.repositories.set(repositoryId, repo);

      return gitStatus;
    } catch (error) {
      logger.error('Failed to get repository status', {
        error: error instanceof Error ? error.message : String(error),
        repositoryId,
      });
      throw error;
    }
  }

  /**
   * Commit changes
   */
  async commit(request: CommitRequest, userId: string): Promise<GitCommit> {
    const { repositoryId, message, author, files, branch } = request;

    const repo = this.repositories.get(repositoryId);
    if (!repo) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    try {
      // Checkout branch if specified
      if (branch && branch !== repo.currentBranch) {
        await execAsync(`git checkout ${branch}`, { cwd: repo.localPath });
      }

      // Stage files
      if (files && files.length > 0) {
        await execAsync(`git add ${files.join(' ')}`, { cwd: repo.localPath });
      } else {
        await execAsync('git add .', { cwd: repo.localPath });
      }

      // Set author if provided
      const authorEnv = author
        ? {
            GIT_AUTHOR_NAME: author.name,
            GIT_AUTHOR_EMAIL: author.email,
            GIT_COMMITTER_NAME: author.name,
            GIT_COMMITTER_EMAIL: author.email,
          }
        : {};

      // Commit
      await execAsync(`git commit -m "${message}"`, {
        cwd: repo.localPath,
        env: { ...process.env, ...authorEnv },
      });

      // Get commit info
      const { stdout: hashOutput } = await execAsync('git rev-parse HEAD', {
        cwd: repo.localPath,
      });

      const { stdout: authorOutput } = await execAsync('git log -1 --format="%an|%ae|%at"', {
        cwd: repo.localPath,
      });

      const [commitAuthor, email, timestamp] = authorOutput.trim().split('|');

      const { stdout: filesOutput } = await execAsync('git diff-tree --no-commit-id --name-only -r HEAD', {
        cwd: repo.localPath,
      });

      const commit: GitCommit = {
        hash: hashOutput.trim(),
        author: commitAuthor,
        email,
        message,
        timestamp: new Date(parseInt(timestamp) * 1000),
        files: filesOutput.trim().split('\n').filter(Boolean),
        branch: branch || repo.currentBranch,
      };

      // Audit log
      const auditService = getAuditService();
      await auditService.log({
        action: AuditAction.WORKFLOW_UPDATE,
        category: AuditCategory.WORKFLOW,
        severity: AuditSeverity.INFO,
        userId,
        username: userId,
        resourceType: 'git-commit',
        resourceId: commit.hash,
        success: true,
        details: {
          repositoryId,
          repositoryName: repo.name,
          message,
          branch: commit.branch,
          files: commit.files,
        },
      });

      logger.info('Changes committed', {
        repositoryId,
        commitHash: commit.hash,
        branch: commit.branch,
        committedBy: userId,
      });

      return commit;
    } catch (error) {
      logger.error('Failed to commit changes', {
        error: error instanceof Error ? error.message : String(error),
        repositoryId,
      });
      throw error;
    }
  }

  /**
   * Push changes to remote
   */
  async push(request: PushRequest, userId: string): Promise<void> {
    const { repositoryId, branch, remote = 'origin', force } = request;

    const repo = this.repositories.get(repositoryId);
    if (!repo) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    try {
      const branchArg = branch || repo.currentBranch;
      const forceArg = force ? '--force' : '';

      await execAsync(`git push ${remote} ${branchArg} ${forceArg}`, {
        cwd: repo.localPath,
      });

      // Audit log
      const auditService = getAuditService();
      await auditService.log({
        action: AuditAction.WORKFLOW_EXPORT,
        category: AuditCategory.WORKFLOW,
        severity: AuditSeverity.INFO,
        userId,
        username: userId,
        resourceType: 'git-push',
        resourceId: repositoryId,
        success: true,
        details: {
          repositoryName: repo.name,
          branch: branchArg,
          remote,
          force,
        },
      });

      logger.info('Changes pushed', {
        repositoryId,
        branch: branchArg,
        remote,
        pushedBy: userId,
      });
    } catch (error) {
      logger.error('Failed to push changes', {
        error: error instanceof Error ? error.message : String(error),
        repositoryId,
      });
      throw error;
    }
  }

  /**
   * Pull changes from remote
   */
  async pull(request: PullRequest, userId: string): Promise<void> {
    const { repositoryId, branch, remote = 'origin', rebase } = request;

    const repo = this.repositories.get(repositoryId);
    if (!repo) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    try {
      const branchArg = branch || repo.currentBranch;
      const rebaseArg = rebase ? '--rebase' : '';

      await execAsync(`git pull ${remote} ${branchArg} ${rebaseArg}`, {
        cwd: repo.localPath,
      });

      // Audit log
      const auditService = getAuditService();
      await auditService.log({
        action: AuditAction.WORKFLOW_IMPORT,
        category: AuditCategory.WORKFLOW,
        severity: AuditSeverity.INFO,
        userId,
        username: userId,
        resourceType: 'git-pull',
        resourceId: repositoryId,
        success: true,
        details: {
          repositoryName: repo.name,
          branch: branchArg,
          remote,
          rebase,
        },
      });

      logger.info('Changes pulled', {
        repositoryId,
        branch: branchArg,
        remote,
        pulledBy: userId,
      });
    } catch (error) {
      logger.error('Failed to pull changes', {
        error: error instanceof Error ? error.message : String(error),
        repositoryId,
      });
      throw error;
    }
  }

  /**
   * List branches
   */
  async listBranches(repositoryId: string): Promise<GitBranch[]> {
    const repo = this.repositories.get(repositoryId);
    if (!repo) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    try {
      const { stdout } = await execAsync('git branch -vv', { cwd: repo.localPath });

      const branches: GitBranch[] = stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const isCurrent = line.startsWith('*');
          const name = line.substring(2).split(/\s+/)[0];

          return {
            name,
            isDefault: name === repo.defaultBranch,
            isCurrent,
            ahead: 0,
            behind: 0,
          };
        });

      return branches;
    } catch (error) {
      logger.error('Failed to list branches', {
        error: error instanceof Error ? error.message : String(error),
        repositoryId,
      });
      throw error;
    }
  }

  /**
   * Create branch
   */
  async createBranch(request: BranchRequest, userId: string): Promise<GitBranch> {
    const { repositoryId, branchName, from, checkout } = request;

    const repo = this.repositories.get(repositoryId);
    if (!repo) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    try {
      const fromArg = from ? from : '';
      await execAsync(`git branch ${branchName} ${fromArg}`, { cwd: repo.localPath });

      if (checkout) {
        await execAsync(`git checkout ${branchName}`, { cwd: repo.localPath });
        repo.currentBranch = branchName;
        this.repositories.set(repositoryId, repo);
      }

      logger.info('Branch created', {
        repositoryId,
        branchName,
        checkout,
        createdBy: userId,
      });

      return {
        name: branchName,
        isDefault: false,
        isCurrent: checkout || false,
        ahead: 0,
        behind: 0,
      };
    } catch (error) {
      logger.error('Failed to create branch', {
        error: error instanceof Error ? error.message : String(error),
        repositoryId,
      });
      throw error;
    }
  }

  /**
   * Checkout branch
   */
  async checkout(request: CheckoutRequest, userId: string): Promise<void> {
    const { repositoryId, branch, createIfNotExists } = request;

    const repo = this.repositories.get(repositoryId);
    if (!repo) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    try {
      const createArg = createIfNotExists ? '-b' : '';
      await execAsync(`git checkout ${createArg} ${branch}`, { cwd: repo.localPath });

      repo.currentBranch = branch;
      this.repositories.set(repositoryId, repo);

      logger.info('Branch checked out', {
        repositoryId,
        branch,
        checkedOutBy: userId,
      });
    } catch (error) {
      logger.error('Failed to checkout branch', {
        error: error instanceof Error ? error.message : String(error),
        repositoryId,
      });
      throw error;
    }
  }

  /**
   * Get commit history
   */
  async getHistory(repositoryId: string, limit: number = 50, branch?: string): Promise<GitHistory> {
    const repo = this.repositories.get(repositoryId);
    if (!repo) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    try {
      const branchArg = branch || repo.currentBranch;
      const { stdout } = await execAsync(
        `git log ${branchArg} -n ${limit} --format="%H|%an|%ae|%at|%s"`,
        { cwd: repo.localPath }
      );

      const commits: GitCommit[] = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [hash, author, email, timestamp, ...messageParts] = line.split('|');
          return {
            hash,
            author,
            email,
            message: messageParts.join('|'),
            timestamp: new Date(parseInt(timestamp) * 1000),
            files: [],
            branch: branchArg,
          };
        });

      return {
        commits,
        branch: branchArg,
        total: commits.length,
        hasMore: commits.length === limit,
      };
    } catch (error) {
      logger.error('Failed to get history', {
        error: error instanceof Error ? error.message : String(error),
        repositoryId,
      });
      throw error;
    }
  }

  /**
   * Export workflow to Git
   */
  async exportWorkflow(request: WorkflowExportRequest, userId: string): Promise<GitSyncResult> {
    const { workflowId, repositoryId, branch, filePath, commit: shouldCommit, commitMessage } = request;

    const repo = this.repositories.get(repositoryId);
    if (!repo) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    try {
      // In a real implementation, we would get the workflow data
      // For now, create a mock workflow JSON
      const workflowData = {
        id: workflowId,
        name: `Workflow ${workflowId}`,
        nodes: [],
        edges: [],
        exportedAt: new Date().toISOString(),
      };

      const targetPath = filePath || `workflows/${workflowId}.json`;
      const fullPath = path.join(repo.localPath, targetPath);

      // Create directory if needed
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      // Write workflow file
      await fs.writeFile(fullPath, JSON.stringify(workflowData, null, 2));

      // Create/update mapping
      const mapping: WorkflowGitMapping = {
        workflowId,
        workflowName: workflowData.name,
        repositoryId,
        filePath: targetPath,
        branch,
        lastSyncedAt: new Date(),
      };
      this.workflowMappings.set(workflowId, mapping);

      // Commit if requested
      let commitHash: string | undefined;
      if (shouldCommit) {
        const commitResult = await this.commit(
          {
            repositoryId,
            message: commitMessage || `Export workflow ${workflowId}`,
            files: [targetPath],
            branch,
          },
          userId
        );
        commitHash = commitResult.hash;
        mapping.lastCommitHash = commitHash;
        this.workflowMappings.set(workflowId, mapping);
      }

      logger.info('Workflow exported to Git', {
        workflowId,
        repositoryId,
        filePath: targetPath,
        commit: shouldCommit,
        exportedBy: userId,
      });

      return {
        success: true,
        workflowId,
        repositoryId,
        commitHash,
        branch,
        changes: {
          added: [targetPath],
          modified: [],
          deleted: [],
        },
      };
    } catch (error) {
      logger.error('Failed to export workflow', {
        error: error instanceof Error ? error.message : String(error),
        workflowId,
        repositoryId,
      });
      throw error;
    }
  }

  /**
   * Get repositories
   */
  async getRepositories(): Promise<GitRepository[]> {
    return Array.from(this.repositories.values());
  }

  /**
   * Get repository by ID
   */
  async getRepository(repositoryId: string): Promise<GitRepository | null> {
    return this.repositories.get(repositoryId) || null;
  }

  /**
   * Get workflow mapping
   */
  async getWorkflowMapping(workflowId: string): Promise<WorkflowGitMapping | null> {
    return this.workflowMappings.get(workflowId) || null;
  }

  /**
   * Sync workflow version with Git commit
   */
  async syncWorkflowVersion(
    workflowId: string,
    versionNumber: number,
    repositoryId: string,
    branch?: string,
    userId: string = 'system'
  ): Promise<GitSyncResult> {
    const repo = this.repositories.get(repositoryId);
    if (!repo) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    try {
      // Get workflow version data (would come from versioning service in real implementation)
      const versionData = {
        workflowId,
        version: versionNumber,
        timestamp: new Date().toISOString()
      };

      const targetBranch = branch || repo.currentBranch;
      const filePath = `workflows/${workflowId}/v${versionNumber}.json`;
      const fullPath = path.join(repo.localPath, filePath);

      // Create directory if needed
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      // Write version file
      await fs.writeFile(fullPath, JSON.stringify(versionData, null, 2));

      // Commit the version
      const commitResult = await this.commit(
        {
          repositoryId,
          message: `Workflow version ${versionNumber} for ${workflowId}`,
          files: [filePath],
          branch: targetBranch
        },
        userId
      );

      logger.info('Workflow version synced with Git', {
        workflowId,
        version: versionNumber,
        commitHash: commitResult.hash,
        repositoryId
      });

      return {
        success: true,
        workflowId,
        repositoryId,
        commitHash: commitResult.hash,
        branch: targetBranch,
        changes: {
          added: [filePath],
          modified: [],
          deleted: []
        }
      };
    } catch (error) {
      logger.error('Failed to sync workflow version', {
        workflowId,
        versionNumber,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Pull workflow versions from Git
   */
  async pullWorkflowVersions(
    workflowId: string,
    repositoryId: string,
    userId: string
  ): Promise<string[]> {
    const repo = this.repositories.get(repositoryId);
    if (!repo) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    try {
      // Pull latest changes
      await this.pull({ repositoryId }, userId);

      // List version files
      const workflowDir = path.join(repo.localPath, `workflows/${workflowId}`);

      try {
        const files = await fs.readdir(workflowDir);
        const versionFiles = files.filter(f => f.endsWith('.json'));

        logger.info('Pulled workflow versions from Git', {
          workflowId,
          repositoryId,
          versionCount: versionFiles.length
        });

        return versionFiles;
      } catch (readError) {
        // Directory doesn't exist yet
        return [];
      }
    } catch (error) {
      logger.error('Failed to pull workflow versions', {
        workflowId,
        repositoryId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Push workflow branch to Git
   */
  async pushWorkflowBranch(
    workflowId: string,
    branchName: string,
    repositoryId: string,
    userId: string
  ): Promise<void> {
    const repo = this.repositories.get(repositoryId);
    if (!repo) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    try {
      // Ensure Git branch exists
      try {
        await execAsync(`git show-ref --verify refs/heads/${branchName}`, {
          cwd: repo.localPath
        });
      } catch {
        // Branch doesn't exist, create it
        await execAsync(`git checkout -b ${branchName}`, {
          cwd: repo.localPath
        });
      }

      // Push branch
      await this.push(
        {
          repositoryId,
          branch: branchName
        },
        userId
      );

      logger.info('Workflow branch pushed to Git', {
        workflowId,
        branchName,
        repositoryId
      });
    } catch (error) {
      logger.error('Failed to push workflow branch', {
        workflowId,
        branchName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Create Git tag for workflow version
   */
  async tagWorkflowVersion(
    workflowId: string,
    versionNumber: number,
    tag: string,
    repositoryId: string,
    userId: string
  ): Promise<void> {
    const repo = this.repositories.get(repositoryId);
    if (!repo) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    try {
      await execAsync(
        `git tag -a ${tag} -m "Workflow ${workflowId} version ${versionNumber}"`,
        { cwd: repo.localPath }
      );

      logger.info('Git tag created for workflow version', {
        workflowId,
        versionNumber,
        tag,
        repositoryId
      });
    } catch (error) {
      logger.error('Failed to create Git tag', {
        workflowId,
        tag,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get Git history for workflow
   */
  async getWorkflowGitHistory(
    workflowId: string,
    repositoryId: string,
    limit: number = 50
  ): Promise<GitHistory> {
    const repo = this.repositories.get(repositoryId);
    if (!repo) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    try {
      const workflowPath = `workflows/${workflowId}`;

      const { stdout } = await execAsync(
        `git log -n ${limit} --format="%H|%an|%ae|%at|%s" -- ${workflowPath}`,
        { cwd: repo.localPath }
      );

      const commits: GitCommit[] = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [hash, author, email, timestamp, ...messageParts] = line.split('|');
          return {
            hash,
            author,
            email,
            message: messageParts.join('|'),
            timestamp: new Date(parseInt(timestamp) * 1000),
            files: [],
            branch: repo.currentBranch
          };
        });

      return {
        commits,
        branch: repo.currentBranch,
        total: commits.length,
        hasMore: commits.length === limit
      };
    } catch (error) {
      logger.error('Failed to get workflow Git history', {
        workflowId,
        repositoryId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

// Singleton instance
let gitServiceInstance: GitService | null = null;

export function getGitService(): GitService {
  if (!gitServiceInstance) {
    gitServiceInstance = new GitService();
    gitServiceInstance.initialize().catch((err) => {
      logger.error('Failed to initialize Git service', { error: err.message });
    });
  }

  return gitServiceInstance;
}

export function initializeGitService(config?: GitConfig): GitService {
  if (gitServiceInstance) {
    logger.warn('Git service already initialized');
    return gitServiceInstance;
  }

  gitServiceInstance = new GitService(config);
  gitServiceInstance.initialize().catch((err) => {
    logger.error('Failed to initialize Git service', { error: err.message });
  });

  return gitServiceInstance;
}

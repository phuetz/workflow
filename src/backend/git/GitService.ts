/**
 * Git Integration Service
 * Version control for workflows using Git
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { execFile } from 'child_process';
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
import { logger } from '../../services/SimpleLogger';
import { getAuditService } from '../audit/AuditService';
import { AuditAction, AuditCategory, AuditSeverity } from '../audit/AuditTypes';

const execFileAsync = promisify(execFile);

// Security validation constants
const VALID_BRANCH_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_\-\/\.]*$/;
const VALID_REMOTE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_\-]*$/;
const VALID_TAG_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_\-\.]*$/;
const VALID_FILE_PATH = /^[a-zA-Z0-9][a-zA-Z0-9_\-\/\.]*$/;
const MAX_NAME_LENGTH = 250;

/**
 * Validate branch name to prevent command injection
 */
function validateBranchName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new Error('Branch name is required');
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new Error(`Branch name too long (max ${MAX_NAME_LENGTH} characters)`);
  }
  if (!VALID_BRANCH_NAME.test(name)) {
    throw new Error('Invalid branch name. Use only letters, numbers, hyphens, underscores, dots, and slashes');
  }
  // Prevent path traversal and command injection
  if (name.includes('..') || name.startsWith('/') || name.startsWith('-')) {
    throw new Error('Invalid branch name format');
  }
}

/**
 * Validate remote name to prevent command injection
 */
function validateRemoteName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new Error('Remote name is required');
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new Error(`Remote name too long (max ${MAX_NAME_LENGTH} characters)`);
  }
  if (!VALID_REMOTE_NAME.test(name)) {
    throw new Error('Invalid remote name. Use only letters, numbers, hyphens, and underscores');
  }
  if (name.startsWith('-')) {
    throw new Error('Invalid remote name format');
  }
}

/**
 * Validate tag name to prevent command injection
 */
function validateTagName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new Error('Tag name is required');
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new Error(`Tag name too long (max ${MAX_NAME_LENGTH} characters)`);
  }
  if (!VALID_TAG_NAME.test(name)) {
    throw new Error('Invalid tag name. Use only letters, numbers, hyphens, underscores, and dots');
  }
  if (name.includes('..') || name.startsWith('-')) {
    throw new Error('Invalid tag name format');
  }
}

/**
 * Validate file path to prevent command injection
 */
function validateFilePath(filePath: string): void {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('File path is required');
  }
  if (filePath.length > MAX_NAME_LENGTH * 2) {
    throw new Error('File path too long');
  }
  // Prevent path traversal
  if (filePath.includes('..') || filePath.startsWith('/') || filePath.startsWith('-')) {
    throw new Error('Invalid file path format');
  }
}

/**
 * Validate Git URL to prevent command injection
 */
function validateGitUrl(url: string): void {
  if (!url || typeof url !== 'string') {
    throw new Error('Git URL is required');
  }

  // Maximum URL length to prevent buffer overflow attacks
  if (url.length > 2048) {
    throw new Error('Git URL too long (max 2048 characters)');
  }

  // Only allow https://, git://, and git@ (SSH) URLs
  if (!url.startsWith('https://') && !url.startsWith('git://') && !url.startsWith('git@')) {
    throw new Error('Invalid Git URL. Only HTTPS, Git protocol, and SSH URLs are allowed');
  }

  // Strict validation for HTTPS URLs
  if (url.startsWith('https://')) {
    // Allow: https://host.com/path/repo.git or https://user:token@host.com/path/repo.git
    const httpsPattern = /^https:\/\/([a-zA-Z0-9._\-]+:[^@\s]*@)?[a-zA-Z0-9][a-zA-Z0-9.\-]*\.[a-zA-Z]{2,}(:[0-9]+)?\/[a-zA-Z0-9._\-\/]+$/;
    if (!httpsPattern.test(url)) {
      throw new Error('Invalid HTTPS Git URL format');
    }
  }

  // Strict validation for git:// URLs
  if (url.startsWith('git://')) {
    const gitPattern = /^git:\/\/[a-zA-Z0-9][a-zA-Z0-9.\-]*\.[a-zA-Z]{2,}(:[0-9]+)?\/[a-zA-Z0-9._\-\/]+$/;
    if (!gitPattern.test(url)) {
      throw new Error('Invalid git:// URL format');
    }
  }

  // Strict validation for SSH URLs (git@host:path)
  if (url.startsWith('git@')) {
    const sshPattern = /^git@[a-zA-Z0-9][a-zA-Z0-9.\-]*\.[a-zA-Z]{2,}:[a-zA-Z0-9._\-\/]+$/;
    if (!sshPattern.test(url)) {
      throw new Error('Invalid SSH Git URL format');
    }
  }

  // Final check: prevent shell metacharacters that could be dangerous
  // even though execFile doesn't use a shell, be defensive
  const dangerousChars = /[;&|`$(){}[\]<>!\n\r\t\0]/;
  if (dangerousChars.test(url)) {
    throw new Error('Invalid characters in Git URL');
  }
}

/**
 * Validate commit message to prevent command injection
 */
function validateCommitMessage(message: string): void {
  if (!message || typeof message !== 'string') {
    throw new Error('Commit message is required');
  }
  if (message.length > 5000) {
    throw new Error('Commit message too long (max 5000 characters)');
  }
}

/**
 * Validate credential token/password to prevent URL injection
 */
function validateCredential(credential: string): void {
  if (!credential || typeof credential !== 'string') {
    return; // Optional credential, empty is OK
  }
  // Prevent characters that could break URL parsing or enable injection
  // Credentials should be URL-safe or will be encoded
  const dangerousChars = /[@:\/\n\r\t\0]/;
  if (dangerousChars.test(credential)) {
    throw new Error('Invalid characters in credential. Credentials containing @, :, or / must be URL-encoded');
  }
}

/**
 * Validate repository ID format
 */
function validateRepositoryId(repoId: string): void {
  if (!repoId || typeof repoId !== 'string') {
    throw new Error('Repository ID is required');
  }
  // Repository IDs should match our generated format: repo_timestamp_random
  const repoIdPattern = /^repo_[0-9]+_[a-z0-9]+$/;
  if (!repoIdPattern.test(repoId)) {
    throw new Error('Invalid repository ID format');
  }
}

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

    // Validate inputs
    validateGitUrl(remoteUrl);
    if (branch) {
      validateBranchName(branch);
    }

    const repoId = `repo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const localPath = path.join(this.baseRepoPath, repoId);

    try {
      // Build clone command with credentials if provided
      let cloneUrl = remoteUrl;
      if (credentials?.token) {
        // Validate and URL-encode token to prevent URL injection
        validateCredential(credentials.token);
        const encodedToken = encodeURIComponent(credentials.token);
        // For GitHub: https://token@github.com/user/repo.git
        cloneUrl = remoteUrl.replace('https://', `https://${encodedToken}@`);
      } else if (credentials?.username && credentials?.password) {
        // Validate and URL-encode credentials to prevent URL injection
        validateCredential(credentials.username);
        validateCredential(credentials.password);
        const encodedUsername = encodeURIComponent(credentials.username);
        const encodedPassword = encodeURIComponent(credentials.password);
        cloneUrl = remoteUrl.replace(
          'https://',
          `https://${encodedUsername}:${encodedPassword}@`
        );
      }

      // Use execFileAsync with array arguments (no shell interpretation)
      const cloneArgs = ['clone'];
      if (branch) {
        cloneArgs.push('-b', branch);
      }
      cloneArgs.push(cloneUrl, localPath);
      await execFileAsync('git', cloneArgs);

      // Get current branch
      const { stdout: branchOutput } = await execFileAsync('git', ['branch', '--show-current'], {
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
      const { stdout: branchOutput } = await execFileAsync('git', ['branch', '--show-current'], {
        cwd: repo.localPath,
      });

      // Get tracking info - use try/catch since @{u} may not exist
      let ahead = 0;
      let behind = 0;
      try {
        const { stdout: trackingOutput } = await execFileAsync(
          'git',
          ['rev-list', '--left-right', '--count', 'HEAD...@{u}'],
          { cwd: repo.localPath }
        );
        const parts = trackingOutput.trim().split('\t').map(Number);
        ahead = parts[0] || 0;
        behind = parts[1] || 0;
      } catch {
        // No upstream configured, default to 0
      }

      // Get file status
      const { stdout: statusOutput } = await execFileAsync('git', ['status', '--porcelain'], {
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
      // Validate inputs
      if (branch) {
        validateBranchName(branch);
      }
      validateCommitMessage(message);
      if (files && files.length > 0) {
        files.forEach(validateFilePath);
      }

      // Checkout branch if specified
      if (branch && branch !== repo.currentBranch) {
        await execFileAsync('git', ['checkout', branch], { cwd: repo.localPath });
      }

      // Stage files
      if (files && files.length > 0) {
        await execFileAsync('git', ['add', ...files], { cwd: repo.localPath });
      } else {
        await execFileAsync('git', ['add', '.'], { cwd: repo.localPath });
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

      // Commit using -m flag with message as separate argument (safe from injection)
      await execFileAsync('git', ['commit', '-m', message], {
        cwd: repo.localPath,
        env: { ...process.env, ...authorEnv },
      });

      // Get commit info
      const { stdout: hashOutput } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
        cwd: repo.localPath,
      });

      const { stdout: authorOutput } = await execFileAsync('git', ['log', '-1', '--format=%an|%ae|%at'], {
        cwd: repo.localPath,
      });

      const [commitAuthor, email, timestamp] = authorOutput.trim().split('|');

      const { stdout: filesOutput } = await execFileAsync('git', ['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD'], {
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
      // Validate inputs
      validateRemoteName(remote);
      const branchArg = branch || repo.currentBranch;
      validateBranchName(branchArg);

      // Build push arguments array (no shell interpretation)
      const pushArgs = ['push', remote, branchArg];
      if (force) {
        pushArgs.push('--force');
      }

      await execFileAsync('git', pushArgs, {
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
      // Validate inputs
      validateRemoteName(remote);
      const branchArg = branch || repo.currentBranch;
      validateBranchName(branchArg);

      // Build pull arguments array (no shell interpretation)
      const pullArgs = ['pull', remote, branchArg];
      if (rebase) {
        pullArgs.push('--rebase');
      }

      await execFileAsync('git', pullArgs, {
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
      const { stdout } = await execFileAsync('git', ['branch', '-vv'], { cwd: repo.localPath });

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
      // Validate inputs
      validateBranchName(branchName);
      if (from) {
        validateBranchName(from);
      }

      // Build branch arguments array (no shell interpretation)
      const branchArgs = ['branch', branchName];
      if (from) {
        branchArgs.push(from);
      }
      await execFileAsync('git', branchArgs, { cwd: repo.localPath });

      if (checkout) {
        await execFileAsync('git', ['checkout', branchName], { cwd: repo.localPath });
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
      // Validate inputs
      validateBranchName(branch);

      // Build checkout arguments array (no shell interpretation)
      const checkoutArgs = ['checkout'];
      if (createIfNotExists) {
        checkoutArgs.push('-b');
      }
      checkoutArgs.push(branch);
      await execFileAsync('git', checkoutArgs, { cwd: repo.localPath });

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
      // Validate inputs
      validateBranchName(branchArg);
      // Validate limit is a safe number
      const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 1000);

      const { stdout } = await execFileAsync(
        'git',
        ['log', branchArg, '-n', String(safeLimit), '--format=%H|%an|%ae|%at|%s'],
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
        autoSync: false,
        syncStrategy: 'manual',
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
      // Validate inputs
      validateBranchName(branchName);

      // Ensure Git branch exists
      try {
        await execFileAsync('git', ['show-ref', '--verify', `refs/heads/${branchName}`], {
          cwd: repo.localPath
        });
      } catch {
        // Branch doesn't exist, create it
        await execFileAsync('git', ['checkout', '-b', branchName], {
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
      // Validate inputs
      validateTagName(tag);

      const tagMessage = `Workflow ${workflowId} version ${versionNumber}`;
      await execFileAsync(
        'git',
        ['tag', '-a', tag, '-m', tagMessage],
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
      // Validate limit is a safe number
      const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 1000);

      const { stdout } = await execFileAsync(
        'git',
        ['log', '-n', String(safeLimit), '--format=%H|%an|%ae|%at|%s', '--', workflowPath],
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

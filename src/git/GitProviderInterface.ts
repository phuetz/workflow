/**
 * Git Provider Interface
 * Abstract interface for different Git providers (GitHub, GitLab, Bitbucket)
 */

import type {
  GitProviderConfig,
  GitProviderCapabilities,
  GitProviderUser,
  GitPullRequest,
  CreatePullRequestRequest,
  PullRequestComment,
  PullRequestReview,
  GitRelease,
  GitRepository,
  GitBranch,
  GitCommit,
  GitWebhook,
} from '../types/git';

export interface IGitProvider {
  /**
   * Initialize the provider with credentials
   */
  initialize(config: GitProviderConfig): Promise<void>;

  /**
   * Get provider capabilities
   */
  getCapabilities(): GitProviderCapabilities;

  /**
   * Authenticate and get user info
   */
  authenticate(): Promise<GitProviderUser>;

  /**
   * Test authentication without full auth flow
   */
  testConnection(): Promise<boolean>;

  // ==================== Repository Operations ====================

  /**
   * List user's repositories
   */
  listRepositories(page?: number, perPage?: number): Promise<GitRepository[]>;

  /**
   * Get repository details
   */
  getRepository(owner: string, repo: string): Promise<GitRepository>;

  /**
   * Create a new repository
   */
  createRepository(name: string, description?: string, isPrivate?: boolean): Promise<GitRepository>;

  /**
   * Fork a repository
   */
  forkRepository(owner: string, repo: string): Promise<GitRepository>;

  // ==================== Branch Operations ====================

  /**
   * List branches in a repository
   */
  listBranches(owner: string, repo: string): Promise<GitBranch[]>;

  /**
   * Get branch details
   */
  getBranch(owner: string, repo: string, branch: string): Promise<GitBranch>;

  /**
   * Create a branch
   */
  createBranch(owner: string, repo: string, branchName: string, from?: string): Promise<GitBranch>;

  /**
   * Delete a branch
   */
  deleteBranch(owner: string, repo: string, branchName: string): Promise<void>;

  /**
   * Protect a branch
   */
  protectBranch(owner: string, repo: string, branchName: string): Promise<void>;

  // ==================== Commit Operations ====================

  /**
   * Get commit details
   */
  getCommit(owner: string, repo: string, sha: string): Promise<GitCommit>;

  /**
   * List commits
   */
  listCommits(owner: string, repo: string, branch?: string, limit?: number): Promise<GitCommit[]>;

  /**
   * Compare commits
   */
  compareCommits(owner: string, repo: string, base: string, head: string): Promise<{
    commits: GitCommit[];
    totalCommits: number;
  }>;

  // ==================== Pull Request Operations ====================

  /**
   * Create a pull request
   */
  createPullRequest(owner: string, repo: string, request: CreatePullRequestRequest): Promise<GitPullRequest>;

  /**
   * Get pull request
   */
  getPullRequest(owner: string, repo: string, number: number): Promise<GitPullRequest>;

  /**
   * List pull requests
   */
  listPullRequests(
    owner: string,
    repo: string,
    state?: 'open' | 'closed' | 'all'
  ): Promise<GitPullRequest[]>;

  /**
   * Update pull request
   */
  updatePullRequest(
    owner: string,
    repo: string,
    number: number,
    updates: Partial<CreatePullRequestRequest>
  ): Promise<GitPullRequest>;

  /**
   * Merge pull request
   */
  mergePullRequest(
    owner: string,
    repo: string,
    number: number,
    strategy?: 'merge' | 'squash' | 'rebase'
  ): Promise<void>;

  /**
   * Close pull request
   */
  closePullRequest(owner: string, repo: string, number: number): Promise<void>;

  /**
   * Add reviewers to pull request
   */
  requestReview(owner: string, repo: string, number: number, reviewers: string[]): Promise<void>;

  /**
   * Submit pull request review
   */
  submitReview(
    owner: string,
    repo: string,
    number: number,
    state: 'approved' | 'changes_requested' | 'commented',
    body?: string
  ): Promise<PullRequestReview>;

  /**
   * List pull request comments
   */
  listPullRequestComments(owner: string, repo: string, number: number): Promise<PullRequestComment[]>;

  /**
   * Add comment to pull request
   */
  addPullRequestComment(
    owner: string,
    repo: string,
    number: number,
    body: string,
    path?: string,
    line?: number
  ): Promise<PullRequestComment>;

  // ==================== Release Operations ====================

  /**
   * Create a release
   */
  createRelease(
    owner: string,
    repo: string,
    tag: string,
    name: string,
    description: string,
    draft?: boolean,
    prerelease?: boolean
  ): Promise<GitRelease>;

  /**
   * Get release
   */
  getRelease(owner: string, repo: string, tag: string): Promise<GitRelease>;

  /**
   * List releases
   */
  listReleases(owner: string, repo: string): Promise<GitRelease[]>;

  /**
   * Delete release
   */
  deleteRelease(owner: string, repo: string, releaseId: string): Promise<void>;

  // ==================== Webhook Operations ====================

  /**
   * Create a webhook
   */
  createWebhook(
    owner: string,
    repo: string,
    url: string,
    events: string[],
    secret?: string
  ): Promise<GitWebhook>;

  /**
   * List webhooks
   */
  listWebhooks(owner: string, repo: string): Promise<GitWebhook[]>;

  /**
   * Delete webhook
   */
  deleteWebhook(owner: string, repo: string, webhookId: string): Promise<void>;

  // ==================== File Operations ====================

  /**
   * Get file content
   */
  getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string>;

  /**
   * Create or update file
   */
  updateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    sha?: string
  ): Promise<GitCommit>;

  /**
   * Delete file
   */
  deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    branch: string,
    sha: string
  ): Promise<void>;

  // ==================== User Operations ====================

  /**
   * Get authenticated user
   */
  getCurrentUser(): Promise<GitProviderUser>;

  /**
   * Get user by username
   */
  getUser(username: string): Promise<GitProviderUser>;

  /**
   * Search users
   */
  searchUsers(query: string): Promise<GitProviderUser[]>;
}

// Re-export types for use in other modules
export type {
  GitProviderConfig,
  GitProviderCapabilities,
  GitProviderUser,
  GitPullRequest,
  CreatePullRequestRequest,
  PullRequestComment,
  PullRequestReview,
  GitRelease,
  GitRepository,
  GitBranch,
  GitCommit,
  GitWebhook,
};

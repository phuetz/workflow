/**
 * Complete Git Integration Types
 * GitOps workflow management with multi-provider support
 */

// ==================== Core Configuration ====================

export type GitProvider = 'github' | 'gitlab' | 'bitbucket';
export type AuthMethod = 'oauth2' | 'pat' | 'ssh' | 'basic';
export type MergeStrategy = 'merge' | 'rebase' | 'squash';

export interface GitConfig {
  enabled: boolean;
  defaultBranch: string;
  repositoryPath?: string;
  remoteUrl?: string;
  authType?: AuthMethod;
  provider?: GitProvider;
  credentials?: GitCredentials;
  autoCommit?: boolean;
  autoPush?: boolean;
  autoSync?: boolean;
  syncInterval?: number; // milliseconds
}

export interface GitCredentials {
  username?: string;
  password?: string;
  token?: string;
  sshKeyPath?: string;
  sshPrivateKey?: string;
  sshPublicKey?: string;
  oauth2AccessToken?: string;
  oauth2RefreshToken?: string;
  oauth2ExpiresAt?: Date;
}

// ==================== Repository Management ====================

export interface GitRepository {
  id: string;
  name: string;
  description?: string;
  provider: GitProvider;
  remoteUrl: string;
  localPath: string;
  defaultBranch: string;
  currentBranch: string;
  isClean: boolean;
  health: RepositoryHealth;
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RepositoryHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  issues: string[];
  metrics: {
    totalCommits: number;
    totalBranches: number;
    totalTags: number;
    diskUsage: number; // bytes
    lastPush?: Date;
    lastPull?: Date;
  };
}

// ==================== Provider Abstraction ====================

export interface GitProviderConfig {
  provider: GitProvider;
  baseUrl?: string; // For self-hosted instances
  apiUrl?: string;
  credentials: GitCredentials;
}

export interface GitProviderCapabilities {
  supportsPullRequests: boolean;
  supportsCodeReview: boolean;
  supportsWebhooks: boolean;
  supportsLFS: boolean;
  supportsActions: boolean;
  maxFileSize: number; // bytes
}

export interface GitProviderUser {
  id: string;
  username: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

// ==================== Commits and History ====================

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: GitAuthor;
  committer: GitAuthor;
  message: string;
  body?: string;
  timestamp: Date;
  files: GitFileChange[];
  branch: string;
  parents: string[];
  tags?: string[];
  stats: CommitStats;
}

export interface GitAuthor {
  name: string;
  email: string;
  timestamp?: Date;
}

export interface CommitStats {
  additions: number;
  deletions: number;
  total: number;
  filesChanged: number;
}

export interface GitFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  additions: number;
  deletions: number;
  oldPath?: string; // For renames
}

export interface GitHistory {
  commits: GitCommit[];
  branch: string;
  total: number;
  hasMore: boolean;
  since?: Date;
  until?: Date;
}

// ==================== Branches ====================

export interface GitBranch {
  name: string;
  isDefault: boolean;
  isCurrent: boolean;
  isProtected?: boolean;
  lastCommit?: GitCommit;
  ahead: number;
  behind: number;
  remote?: string;
  upstream?: string;
}

export interface BranchProtection {
  enabled: boolean;
  requirePullRequest: boolean;
  requireReviews: number;
  requireStatusChecks: boolean;
  requireSignedCommits: boolean;
  restrictPushers: string[];
}

// ==================== Status and Diff ====================

export interface GitStatus {
  branch: string;
  tracking?: string;
  ahead: number;
  behind: number;
  staged: GitFileStatus[];
  unstaged: GitFileStatus[];
  untracked: string[];
  conflicted: GitConflict[];
  stashed: number;
}

export interface GitFileStatus {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  staged: boolean;
  oldPath?: string;
}

export interface GitDiff {
  file: string;
  oldPath?: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  hunks: DiffHunk[];
  stats: {
    additions: number;
    deletions: number;
  };
  binary: boolean;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'addition' | 'deletion';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

// ==================== Workflow-Specific Diff ====================

export interface WorkflowDiff {
  workflowId: string;
  workflowName: string;
  gitDiff: GitDiff;
  visualDiff: VisualWorkflowDiff;
  summary: DiffSummary;
}

export interface VisualWorkflowDiff {
  nodesAdded: WorkflowNode[];
  nodesModified: NodeModification[];
  nodesDeleted: WorkflowNode[];
  edgesAdded: WorkflowEdge[];
  edgesDeleted: WorkflowEdge[];
  settingsChanged: SettingChange[];
}

export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export interface NodeModification {
  nodeId: string;
  nodeName: string;
  changes: PropertyChange[];
}

export interface PropertyChange {
  path: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface SettingChange {
  setting: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface DiffSummary {
  totalChanges: number;
  nodesChanged: number;
  edgesChanged: number;
  settingsChanged: number;
  complexity: 'low' | 'medium' | 'high';
}

// ==================== Conflicts ====================

export interface GitConflict {
  file: string;
  ours: string;
  theirs: string;
  base?: string;
  markers: ConflictMarker[];
  resolved: boolean;
}

export interface ConflictMarker {
  start: number;
  end: number;
  type: 'ours' | 'theirs' | 'base';
  content: string;
}

export interface ConflictResolution {
  file: string;
  strategy: 'ours' | 'theirs' | 'manual' | 'ai';
  content: string;
  confidence?: number; // For AI-based resolution
}

// ==================== Tags and Releases ====================

export interface GitTag {
  name: string;
  message?: string;
  commit: string;
  type: 'lightweight' | 'annotated';
  tagger?: GitAuthor;
  createdAt: Date;
}

export interface GitRelease {
  id: string;
  tagName: string;
  name: string;
  description: string;
  commit: string;
  draft: boolean;
  prerelease: boolean;
  createdAt: Date;
  publishedAt?: Date;
  author: GitProviderUser;
  assets: ReleaseAsset[];
}

export interface ReleaseAsset {
  id: string;
  name: string;
  contentType: string;
  size: number;
  downloadUrl: string;
  downloadCount: number;
}

// ==================== Pull Requests ====================

export interface GitPullRequest {
  id: string;
  number: number;
  title: string;
  description: string;
  state: 'open' | 'closed' | 'merged';
  sourceBranch: string;
  targetBranch: string;
  author: GitProviderUser;
  reviewers: GitProviderUser[];
  commits: number;
  additions: number;
  deletions: number;
  changedFiles: number;
  createdAt: Date;
  updatedAt: Date;
  mergedAt?: Date;
  closedAt?: Date;
  url: string;
}

export interface PullRequestComment {
  id: string;
  author: GitProviderUser;
  body: string;
  path?: string;
  line?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PullRequestReview {
  id: string;
  author: GitProviderUser;
  state: 'approved' | 'changes_requested' | 'commented';
  body: string;
  submittedAt: Date;
}

// ==================== Workflow Sync ====================

export interface WorkflowGitMapping {
  workflowId: string;
  workflowName: string;
  repositoryId: string;
  filePath: string;
  branch: string;
  lastCommitHash?: string;
  lastSyncedAt?: Date;
  autoSync: boolean;
  syncStrategy: 'manual' | 'on-save' | 'on-execute' | 'scheduled';
}

export interface SyncConfig {
  autoCommit: boolean;
  autoPush: boolean;
  commitMessageTemplate?: string;
  useAICommitMessages: boolean;
  preventConflicts: boolean;
  pullBeforePush: boolean;
}

export interface GitSyncResult {
  success: boolean;
  workflowId: string;
  repositoryId: string;
  commitHash?: string;
  branch: string;
  changes: {
    added: string[];
    modified: string[];
    deleted: string[];
  };
  conflicts?: GitConflict[];
  aiCommitMessage?: string;
  syncDuration: number;
}

// ==================== Version Management ====================

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  versionNumber: number;
  commitHash: string;
  branch: string;
  tag?: string;
  author: GitAuthor;
  message: string;
  timestamp: Date;
  workflowData: Record<string, unknown>;
  metadata: VersionMetadata;
}

export interface VersionMetadata {
  nodeCount: number;
  edgeCount: number;
  complexity: number;
  executionCount?: number;
  lastExecuted?: Date;
  stable: boolean;
  production: boolean;
}

export interface VersionComparison {
  fromVersion: WorkflowVersion;
  toVersion: WorkflowVersion;
  diff: WorkflowDiff;
  compatible: boolean;
  breakingChanges: string[];
  recommendations: string[];
}

export interface RollbackRequest {
  workflowId: string;
  targetVersion: string; // commit hash or tag
  strategy: 'hard' | 'soft' | 'create-branch';
  reason?: string;
  validateBefore: boolean;
}

export interface RollbackResult {
  success: boolean;
  workflowId: string;
  rolledBackFrom: string;
  rolledBackTo: string;
  validationPassed: boolean;
  warnings: string[];
  createdBranch?: string;
}

// ==================== Request/Response Types ====================

export interface CloneRequest {
  remoteUrl: string;
  name: string;
  description?: string;
  provider: GitProvider;
  branch?: string;
  credentials?: GitCredentials;
  shallow?: boolean;
  depth?: number;
}

export interface CommitRequest {
  repositoryId: string;
  message: string;
  author?: GitAuthor;
  files?: string[];
  branch?: string;
  amend?: boolean;
}

export interface PushRequest {
  repositoryId: string;
  branch?: string;
  remote?: string;
  force?: boolean;
  tags?: boolean;
}

export interface PullRequest {
  repositoryId: string;
  branch?: string;
  remote?: string;
  rebase?: boolean;
  autostash?: boolean;
}

export interface BranchRequest {
  repositoryId: string;
  branchName: string;
  from?: string;
  checkout?: boolean;
}

export interface CheckoutRequest {
  repositoryId: string;
  branch: string;
  createIfNotExists?: boolean;
  force?: boolean;
}

export interface MergeRequest {
  repositoryId: string;
  sourceBranch: string;
  targetBranch: string;
  strategy?: MergeStrategy;
  message?: string;
  noFastForward?: boolean;
}

export interface TagRequest {
  repositoryId: string;
  name: string;
  message?: string;
  commit?: string;
  annotated?: boolean;
}

export interface WorkflowExportRequest {
  workflowId: string;
  repositoryId: string;
  branch: string;
  filePath?: string;
  commit?: boolean;
  commitMessage?: string;
  push?: boolean;
}

export interface WorkflowImportRequest {
  repositoryId: string;
  filePath: string;
  branch?: string;
  commit?: string;
}

export interface CreatePullRequestRequest {
  repositoryId: string;
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
  draft?: boolean;
  reviewers?: string[];
  labels?: string[];
}

// ==================== AI-Powered Features ====================

export interface AICommitMessage {
  message: string;
  body?: string;
  confidence: number;
  type: 'feat' | 'fix' | 'docs' | 'refactor' | 'test' | 'chore';
  scope?: string;
  breaking: boolean;
}

export interface AIConflictResolution {
  file: string;
  resolution: string;
  confidence: number;
  explanation: string;
  alternatives: Array<{
    resolution: string;
    confidence: number;
  }>;
}

// ==================== Analytics and Stats ====================

export interface GitStats {
  totalCommits: number;
  totalBranches: number;
  totalTags: number;
  contributors: Contributor[];
  activity: ActivityData[];
  codeFrequency: FrequencyData[];
  punchCard: PunchCardData[];
}

export interface Contributor {
  name: string;
  email: string;
  commits: number;
  additions: number;
  deletions: number;
  firstCommit: Date;
  lastCommit: Date;
}

export interface ActivityData {
  date: string;
  commits: number;
  additions: number;
  deletions: number;
}

export interface FrequencyData {
  week: number;
  additions: number;
  deletions: number;
}

export interface PunchCardData {
  day: number; // 0-6
  hour: number; // 0-23
  commits: number;
}

// ==================== Remote Management ====================

export interface GitRemote {
  name: string;
  url: string;
  fetch: string;
  push: string;
}

export interface AddRemoteRequest {
  repositoryId: string;
  name: string;
  url: string;
}

// ==================== LFS Support ====================

export interface LFSObject {
  oid: string;
  size: number;
  path: string;
  pointer: boolean;
}

export interface LFSConfig {
  enabled: boolean;
  patterns: string[];
  threshold: number; // File size threshold in bytes
}

// ==================== Hooks ====================

export interface GitHook {
  name: string;
  enabled: boolean;
  script: string;
  type: 'pre-commit' | 'post-commit' | 'pre-push' | 'post-push';
}

export interface GitWebhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
}

// ==================== Error Types ====================

export interface GitError {
  code: string;
  message: string;
  details?: string;
  recoverable: boolean;
  suggestions: string[];
}

export type GitErrorCode =
  | 'AUTHENTICATION_FAILED'
  | 'REPOSITORY_NOT_FOUND'
  | 'MERGE_CONFLICT'
  | 'PUSH_REJECTED'
  | 'NETWORK_ERROR'
  | 'INVALID_BRANCH'
  | 'INVALID_COMMIT'
  | 'PERMISSION_DENIED'
  | 'FILE_TOO_LARGE'
  | 'DIRTY_WORKING_TREE'
  | 'DETACHED_HEAD';

// ==================== Workflow Export Formats ====================

export interface WorkflowExportFormat {
  format: 'json' | 'yaml' | 'toml';
  includeMetadata: boolean;
  includeHistory: boolean;
  compress: boolean;
}

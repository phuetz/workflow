/**
 * Git Integration Types
 * Version control for workflows
 */

export interface GitConfig {
  enabled: boolean;
  defaultBranch: string;
  repositoryPath?: string; // Local path for git repos
  remoteUrl?: string; // Remote git URL
  authType?: 'ssh' | 'token' | 'basic';
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
    sshKeyPath?: string;
  };
}

export interface GitRepository {
  id: string;
  name: string;
  description?: string;
  remoteUrl: string;
  localPath: string;
  defaultBranch: string;
  currentBranch: string;
  isClean: boolean; // No uncommitted changes
  createdAt: Date;
  updatedAt: Date;
}

export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  message: string;
  timestamp: Date;
  files: string[];
  branch: string;
}

export interface GitBranch {
  name: string;
  isDefault: boolean;
  isCurrent: boolean;
  lastCommit?: GitCommit;
  ahead: number; // commits ahead of remote
  behind: number; // commits behind remote
}

export interface WorkflowGitMapping {
  workflowId: string;
  workflowName: string;
  repositoryId: string;
  filePath: string; // Path within repo
  branch: string;
  lastCommitHash?: string;
  lastSyncedAt?: Date;
  autoSync: boolean;
  syncStrategy: 'manual' | 'on-save' | 'on-execute' | 'scheduled';
}

export interface GitStatus {
  branch: string;
  tracking?: string; // remote tracking branch
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  conflicted: string[];
}

export interface CommitRequest {
  repositoryId: string;
  message: string;
  author?: {
    name: string;
    email: string;
  };
  files?: string[]; // specific files to commit, or all if not specified
  branch?: string;
}

export interface PushRequest {
  repositoryId: string;
  branch?: string;
  remote?: string;
  force?: boolean;
}

export interface PullRequest {
  repositoryId: string;
  branch?: string;
  remote?: string;
  rebase?: boolean;
}

export interface CloneRequest {
  remoteUrl: string;
  name: string;
  description?: string;
  branch?: string;
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
  };
}

export interface GitDiff {
  file: string;
  changes: Array<{
    type: 'add' | 'delete' | 'modify';
    lineNumber: number;
    content: string;
  }>;
  stats: {
    additions: number;
    deletions: number;
  };
}

export interface MergeRequest {
  repositoryId: string;
  sourceBranch: string;
  targetBranch: string;
  strategy?: 'merge' | 'rebase' | 'squash';
  message?: string;
}

export interface GitConflict {
  file: string;
  ours: string;
  theirs: string;
  base?: string;
}

export interface ResolveConflictRequest {
  repositoryId: string;
  file: string;
  resolution: 'ours' | 'theirs' | 'manual';
  content?: string; // for manual resolution
}

export interface GitTag {
  name: string;
  message?: string;
  commit: string;
  createdAt: Date;
  createdBy: string;
}

export interface TagRequest {
  repositoryId: string;
  name: string;
  message?: string;
  commit?: string; // defaults to HEAD
}

export interface GitHistory {
  commits: GitCommit[];
  branch: string;
  total: number;
  hasMore: boolean;
}

export interface WorkflowVersionInfo {
  workflowId: string;
  currentVersion: string; // commit hash
  versions: Array<{
    hash: string;
    message: string;
    author: string;
    timestamp: Date;
    branch: string;
  }>;
  branches: string[];
  tags: GitTag[];
}

export interface GitSyncRequest {
  workflowId: string;
  repositoryId: string;
  branch?: string;
  autoCommit?: boolean;
  commitMessage?: string;
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
}

export interface BranchRequest {
  repositoryId: string;
  branchName: string;
  from?: string; // branch or commit to branch from
  checkout?: boolean; // checkout after creating
}

export interface CheckoutRequest {
  repositoryId: string;
  branch: string;
  createIfNotExists?: boolean;
}

export interface GitRemote {
  name: string;
  url: string;
  type: 'fetch' | 'push';
}

export interface AddRemoteRequest {
  repositoryId: string;
  name: string;
  url: string;
}

export interface GitStats {
  totalCommits: number;
  totalBranches: number;
  totalTags: number;
  contributors: Array<{
    name: string;
    email: string;
    commits: number;
  }>;
  activity: Array<{
    date: string;
    commits: number;
  }>;
}

export interface WorkflowExportRequest {
  workflowId: string;
  repositoryId: string;
  branch: string;
  filePath?: string; // defaults to workflows/{workflowId}.json
  commit?: boolean;
  commitMessage?: string;
}

export interface WorkflowImportRequest {
  repositoryId: string;
  filePath: string;
  branch?: string;
  commit?: string; // specific commit, defaults to HEAD
}

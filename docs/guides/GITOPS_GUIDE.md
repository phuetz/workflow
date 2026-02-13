# GitOps Guide - Workflow Automation Platform

Complete guide for Git-based workflow management with multi-provider support, automatic backup, version control, and rollback capabilities.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Provider Setup](#provider-setup)
4. [Workflow Synchronization](#workflow-synchronization)
5. [Version Management](#version-management)
6. [Branch-Based Development](#branch-based-development)
7. [Pull Requests](#pull-requests)
8. [Rollback and Recovery](#rollback-and-recovery)
9. [Advanced Features](#advanced-features)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

## Overview

The GitOps integration provides enterprise-grade version control for workflows using Git as the single source of truth. Features include:

- **Multi-Provider Support**: GitHub, GitLab, and Bitbucket
- **Automatic Workflow Backup**: Auto-commit on save with AI-generated messages
- **Version Control**: Complete version history with visual diff
- **Rollback Capabilities**: Safe rollback to any previous version
- **Branch-Based Development**: Feature branches for workflow development
- **Pull Request Integration**: Code review workflow for changes
- **Conflict Resolution**: Intelligent merge conflict resolution

## Quick Start

### 1. Connect to Git Repository

```typescript
import { GitProviderFactory } from './git/GitProviderFactory';

// GitHub
const githubProvider = await GitProviderFactory.createProvider({
  provider: 'github',
  credentials: {
    token: 'YOUR_PERSONAL_ACCESS_TOKEN',
  },
});

// GitLab
const gitlabProvider = await GitProviderFactory.createProvider({
  provider: 'gitlab',
  credentials: {
    token: 'YOUR_PERSONAL_ACCESS_TOKEN',
  },
  apiUrl: 'https://gitlab.com/api/v4', // Optional for self-hosted
});

// Bitbucket
const bitbucketProvider = await GitProviderFactory.createProvider({
  provider: 'bitbucket',
  credentials: {
    token: 'YOUR_APP_PASSWORD',
    username: 'YOUR_USERNAME',
  },
});
```

### 2. Initialize Git Service

```typescript
import { getGitService } from './backend/git/GitService';

const gitService = getGitService();
await gitService.initialize();

// Clone a repository
const repository = await gitService.cloneRepository(
  {
    remoteUrl: 'https://github.com/user/repo.git',
    name: 'workflow-repo',
    branch: 'main',
    credentials: {
      token: 'YOUR_TOKEN',
    },
  },
  'user-123'
);
```

### 3. Configure Workflow Sync

```typescript
import { getWorkflowSync } from './git/WorkflowSync';

const workflowSync = getWorkflowSync();

// Configure sync for a workflow
workflowSync.configureSyncconfig('workflow-id', {
  autoCommit: true,
  autoPush: true,
  useAICommitMessages: true,
  preventConflicts: true,
  pullBeforePush: true,
});

// Sync workflow to Git
const result = await workflowSync.syncToGit(
  workflow,
  repositoryId,
  'main',
  'user-123'
);
```

## Provider Setup

### GitHub

1. **Generate Personal Access Token**
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Generate new token with `repo` scope
   - Copy the token

2. **Configure Authentication**
   ```typescript
   const config = {
     provider: 'github',
     credentials: {
       token: 'ghp_xxxxxxxxxxxxxxxxxxxx',
     },
   };
   ```

3. **OAuth2 Authentication** (Recommended for production)
   ```typescript
   const config = {
     provider: 'github',
     credentials: {
       oauth2AccessToken: 'access_token',
       oauth2RefreshToken: 'refresh_token',
       oauth2ExpiresAt: new Date('2025-01-01'),
     },
   };
   ```

### GitLab

1. **Generate Personal Access Token**
   - Go to GitLab Settings > Access Tokens
   - Create token with `api`, `read_repository`, `write_repository` scopes

2. **Configure for Self-Hosted**
   ```typescript
   const config = {
     provider: 'gitlab',
     baseUrl: 'https://gitlab.yourcompany.com',
     apiUrl: 'https://gitlab.yourcompany.com/api/v4',
     credentials: {
       token: 'glpat-xxxxxxxxxxxxxxxxxxxx',
     },
   };
   ```

### Bitbucket

1. **Generate App Password**
   - Go to Bitbucket Settings > App passwords
   - Create password with `repository:write` permission

2. **Configure Authentication**
   ```typescript
   const config = {
     provider: 'bitbucket',
     credentials: {
       username: 'your-username',
       token: 'app-password',
     },
   };
   ```

## Workflow Synchronization

### Automatic Sync on Save

```typescript
import { getAutoCommit } from './git/AutoCommit';

const autoCommit = getAutoCommit();

// Configure auto-commit
autoCommit.configure('workflow-id', {
  enabled: true,
  debounceMs: 5000, // Wait 5 seconds after last edit
  useAI: true, // Use AI-generated commit messages
  commitOnSave: true,
  commitOnExecute: false,
  batchCommits: true,
  maxBatchSize: 10,
});

// Trigger on save
await autoCommit.onWorkflowSave(
  workflow,
  repositoryId,
  'main',
  'user-123'
);
```

### Manual Sync

```typescript
// Sync to Git (push)
const result = await workflowSync.syncToGit(
  workflow,
  repositoryId,
  'feature-branch',
  'user-123'
);

// Sync from Git (pull)
const workflow = await workflowSync.syncFromGit(
  'workflow-id',
  repositoryId,
  'main',
  'user-123'
);

// Sync all workflows
const workflows = await workflowSync.syncAllFromGit(
  repositoryId,
  'main',
  'user-123'
);
```

### Check for Changes

```typescript
const hasChanges = await workflowSync.hasChanges(workflow, repositoryId);

if (hasChanges) {
  console.log('Workflow has unsaved changes');
}
```

## Version Management

### View Version History

```typescript
import { getVersionManager } from './git/VersionManager';

const versionManager = getVersionManager();

// Get version history
const versions = await versionManager.getVersionHistory(
  'workflow-id',
  repositoryId,
  50 // limit
);

// Display in UI
versions.forEach(version => {
  console.log(`Version ${version.versionNumber}`);
  console.log(`  Commit: ${version.commitHash}`);
  console.log(`  Author: ${version.author.name}`);
  console.log(`  Date: ${version.timestamp}`);
  console.log(`  Message: ${version.message}`);
  console.log(`  Nodes: ${version.metadata.nodeCount}`);
  console.log(`  Edges: ${version.metadata.edgeCount}`);
});
```

### Compare Versions

```typescript
const comparison = await versionManager.compareVersions(
  'workflow-id',
  repositoryId,
  'older-commit-hash',
  'newer-commit-hash'
);

console.log('Changes:', comparison.diff.summary);
console.log('Compatible:', comparison.compatible);
console.log('Breaking changes:', comparison.breakingChanges);
console.log('Recommendations:', comparison.recommendations);
```

### Visual Diff

```typescript
import { getDiffGenerator } from './git/DiffGenerator';

const diffGenerator = getDiffGenerator();

const diff = await diffGenerator.generateWorkflowDiff(
  oldWorkflow,
  newWorkflow
);

console.log('Summary:', diff.summary);
console.log('Nodes added:', diff.visualDiff.nodesAdded.length);
console.log('Nodes modified:', diff.visualDiff.nodesModified.length);
console.log('Nodes deleted:', diff.visualDiff.nodesDeleted.length);
console.log('Edges changed:', diff.visualDiff.edgesAdded.length + diff.visualDiff.edgesDeleted.length);

// Generate human-readable description
const description = diffGenerator.generateDescription(diff);
console.log(description);
```

### Tag Versions

```typescript
// Tag a stable version
await versionManager.tagVersion(
  'workflow-id',
  repositoryId,
  'commit-hash',
  'v1.0.0',
  'Stable production release',
  'user-123'
);
```

## Branch-Based Development

### Create Feature Branch

```typescript
import { getBranchManager } from './git/BranchManager';

const branchManager = getBranchManager();

// Create feature branch
const branch = await branchManager.createFeatureBranch(
  repositoryId,
  'workflow-id',
  'feature/add-email-notification', // Optional custom name
  'user-123'
);

console.log('Created branch:', branch.name);
```

### Switch Branches

```typescript
// Switch to different branch
await branchManager.switchBranch(
  repositoryId,
  'feature/add-email-notification',
  'user-123'
);

// Now all changes will be committed to this branch
```

### List Branches

```typescript
const branches = await branchManager.listBranches(repositoryId);

branches.forEach(branch => {
  console.log(`${branch.name} ${branch.isCurrent ? '(current)' : ''}`);
  console.log(`  Default: ${branch.isDefault}`);
  console.log(`  Protected: ${branch.isProtected}`);
  console.log(`  Ahead: ${branch.ahead}, Behind: ${branch.behind}`);
});
```

### Delete Branch

```typescript
// Delete merged branch
await branchManager.deleteBranch(
  repositoryId,
  'feature/old-feature',
  false, // force
  'user-123'
);
```

## Pull Requests

### Create Pull Request

```typescript
import { getPullRequestService } from './git/BranchManager';

const prService = getPullRequestService();

// Create PR for workflow changes
const pr = await prService.createWorkflowPullRequest(
  'workflow-id',
  'Email Notification Workflow',
  repositoryId,
  providerConfig,
  'feature/add-email-notification',
  'main',
  'github-username',
  'repo-name',
  'user-123'
);

console.log('PR created:', pr.url);
console.log('PR number:', pr.number);
```

### List Pull Requests

```typescript
const prs = await prService.listPullRequests(
  providerConfig,
  'owner',
  'repo',
  'open' // or 'closed' or 'all'
);

prs.forEach(pr => {
  console.log(`#${pr.number}: ${pr.title}`);
  console.log(`  ${pr.sourceBranch} → ${pr.targetBranch}`);
  console.log(`  State: ${pr.state}`);
  console.log(`  +${pr.additions} -${pr.deletions}`);
});
```

### Review and Merge

```typescript
// Request review
await prService.requestReview(
  providerConfig,
  'owner',
  'repo',
  123, // PR number
  ['reviewer1', 'reviewer2'],
  'user-123'
);

// Submit review
await prService.submitReview(
  providerConfig,
  'owner',
  'repo',
  123,
  'approved', // or 'changes_requested' or 'commented'
  'Looks good to me!',
  'user-123'
);

// Merge PR
await prService.mergePullRequest(
  providerConfig,
  'owner',
  'repo',
  123,
  'squash', // or 'merge' or 'rebase'
  'user-123'
);
```

### Add Comments

```typescript
await prService.addComment(
  providerConfig,
  'owner',
  'repo',
  123,
  'Please update the email template',
  'user-123'
);
```

## Rollback and Recovery

### Safe Rollback

```typescript
// Rollback to specific version
const result = await versionManager.rollback(
  {
    workflowId: 'workflow-id',
    targetVersion: 'commit-hash-or-tag',
    strategy: 'soft', // or 'hard' or 'create-branch'
    validateBefore: true,
    reason: 'Reverting buggy changes',
  },
  'user-123'
);

if (result.success) {
  console.log('Rollback successful');
  console.log('Rolled back from:', result.rolledBackFrom);
  console.log('Rolled back to:', result.rolledBackTo);
  console.log('Warnings:', result.warnings);
} else {
  console.error('Rollback failed:', result.warnings);
}
```

### Rollback Strategies

#### 1. Hard Rollback (Reset to commit)
```typescript
// Resets workflow to exact state at commit
// WARNING: Loses all changes after that commit
const result = await versionManager.rollback({
  workflowId: 'workflow-id',
  targetVersion: 'abc123',
  strategy: 'hard',
  validateBefore: true,
}, 'user-123');
```

#### 2. Soft Rollback (Create new commit with old content)
```typescript
// Creates new commit with old workflow data
// Preserves history
const result = await versionManager.rollback({
  workflowId: 'workflow-id',
  targetVersion: 'abc123',
  strategy: 'soft',
  validateBefore: true,
}, 'user-123');
```

#### 3. Create Branch Rollback (Non-destructive)
```typescript
// Creates new branch from target commit
// Safest option for testing
const result = await versionManager.rollback({
  workflowId: 'workflow-id',
  targetVersion: 'abc123',
  strategy: 'create-branch',
  validateBefore: false,
}, 'user-123');

console.log('Created branch:', result.createdBranch);
```

## Advanced Features

### AI-Powered Commit Messages

```typescript
// Enable AI commit messages
autoCommit.configure('workflow-id', {
  enabled: true,
  useAI: true,
  debounceMs: 5000,
});

// AI will generate messages like:
// "feat(api): add new HTTP request node to payment workflow"
// "fix(automation): update schedule trigger configuration"
// "refactor: remove deprecated email node"
```

### Conflict Resolution

```typescript
// Sync will detect conflicts
const result = await workflowSync.syncToGit(
  workflow,
  repositoryId,
  'main',
  'user-123'
);

if (result.conflicts && result.conflicts.length > 0) {
  console.log('Conflicts detected:', result.conflicts);

  // Resolve manually or use AI resolution
  // (Implementation depends on your conflict resolution strategy)
}
```

### Batch Operations

```typescript
// Sync multiple workflows
const workflows = [workflow1, workflow2, workflow3];

for (const workflow of workflows) {
  await workflowSync.syncToGit(
    workflow,
    repositoryId,
    'main',
    'user-123'
  );
}
```

### Repository Health Monitoring

```typescript
const repository = await gitService.getRepository(repositoryId);

console.log('Health:', repository.health.status);
console.log('Issues:', repository.health.issues);
console.log('Metrics:', repository.health.metrics);
console.log('  Total commits:', repository.health.metrics.totalCommits);
console.log('  Total branches:', repository.health.metrics.totalBranches);
console.log('  Disk usage:', repository.health.metrics.diskUsage, 'bytes');
```

## Best Practices

### 1. Commit Messages

- Use conventional commits format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Enable AI-generated messages for consistency

### 2. Branch Naming

- Feature branches: `feature/description`
- Bug fixes: `fix/issue-description`
- Hotfixes: `hotfix/critical-fix`
- Releases: `release/v1.0.0`

### 3. Version Tagging

- Tag stable versions: `v1.0.0`, `v1.1.0`
- Tag production releases: `prod-2024-01-15`
- Tag before major changes

### 4. Pull Request Workflow

1. Create feature branch
2. Make changes
3. Create pull request
4. Request review
5. Address feedback
6. Merge to main
7. Delete feature branch

### 5. Rollback Safety

- Always validate before rollback
- Use soft rollback by default
- Test in branch before hard rollback
- Keep backups of critical workflows

### 6. Conflict Prevention

- Pull before push
- Use feature branches
- Communicate with team
- Enable conflict prevention in sync config

## Troubleshooting

### Authentication Errors

```
Error: GitHub API Error: Bad credentials
```

**Solution**: Verify your token has correct permissions and hasn't expired.

### Push Rejected

```
Error: Push rejected - branch is protected
```

**Solution**: Create pull request instead of direct push, or update branch protection rules.

### Merge Conflicts

```
Error: Merge conflict detected
```

**Solution**: Pull latest changes, resolve conflicts manually, then commit.

### Large File Error

```
Error: File too large for GitHub
```

**Solution**: Enable Git LFS or split large workflows into sub-workflows.

### Rate Limiting

```
Error: API rate limit exceeded
```

**Solution**: Wait for rate limit reset or use authenticated requests.

## Performance Tips

1. **Debounce auto-commits**: Set reasonable debounce time (5-10 seconds)
2. **Batch operations**: Sync multiple workflows together
3. **Limit history depth**: Only fetch recent versions when needed
4. **Use shallow clones**: For initial repository setup
5. **Enable compression**: Reduce network transfer size

## Security Considerations

1. **Never commit secrets**: Use environment variables
2. **Use SSH keys**: More secure than passwords
3. **Enable 2FA**: On Git provider account
4. **Rotate tokens**: Regularly update access tokens
5. **Audit logs**: Monitor all Git operations
6. **Branch protection**: Protect main/production branches

## API Reference

### GitService
- `initialize()`: Initialize Git service
- `cloneRepository()`: Clone remote repository
- `getStatus()`: Get repository status
- `commit()`: Create commit
- `push()`: Push changes
- `pull()`: Pull changes
- `listBranches()`: List all branches
- `createBranch()`: Create new branch
- `checkout()`: Checkout branch
- `getHistory()`: Get commit history

### WorkflowSync
- `configureSyncconfig()`: Configure sync settings
- `syncToGit()`: Sync workflow to Git
- `syncFromGit()`: Sync workflow from Git
- `syncAllFromGit()`: Sync all workflows
- `hasChanges()`: Check for unsaved changes

### AutoCommit
- `configure()`: Configure auto-commit
- `onWorkflowSave()`: Trigger on save
- `onWorkflowExecute()`: Trigger on execute
- `flushPending()`: Flush pending commits

### VersionManager
- `getVersionHistory()`: Get version history
- `getVersion()`: Get specific version
- `compareVersions()`: Compare two versions
- `tagVersion()`: Tag a version
- `rollback()`: Rollback to version

### BranchManager
- `createFeatureBranch()`: Create feature branch
- `createHotfixBranch()`: Create hotfix branch
- `createReleaseBranch()`: Create release branch
- `switchBranch()`: Switch branches
- `deleteBranch()`: Delete branch
- `listBranches()`: List all branches

### PullRequestService
- `createPullRequest()`: Create PR
- `createWorkflowPullRequest()`: Create workflow PR
- `getPullRequest()`: Get PR details
- `listPullRequests()`: List PRs
- `updatePullRequest()`: Update PR
- `mergePullRequest()`: Merge PR
- `closePullRequest()`: Close PR
- `requestReview()`: Request review
- `submitReview()`: Submit review
- `addComment()`: Add comment

## Support

For issues, feature requests, or questions:
- GitHub Issues: https://github.com/your-org/workflow-automation/issues
- Documentation: https://workflow-platform.com/docs
- Support Email: support@workflow-platform.com

---

**Version**: 1.0.0
**Last Updated**: 2025-01-10
**Generated with**: Claude Code

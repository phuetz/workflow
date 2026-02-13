# GitOps Quick Reference

Quick reference for common GitOps operations.

## Setup

### Connect to GitHub
```typescript
import { GitProviderFactory } from './git/GitProviderFactory';

const provider = await GitProviderFactory.createProvider({
  provider: 'github',
  credentials: { token: 'YOUR_TOKEN' },
});
```

### Clone Repository
```typescript
import { getGitService } from './backend/git/GitService';

const gitService = getGitService();
const repo = await gitService.cloneRepository({
  remoteUrl: 'https://github.com/user/repo.git',
  name: 'my-workflows',
  branch: 'main',
  credentials: { token: 'YOUR_TOKEN' },
}, 'user-id');
```

## Workflow Sync

### Auto-Commit on Save
```typescript
import { getAutoCommit } from './git/AutoCommit';

const autoCommit = getAutoCommit();
autoCommit.configure('workflow-id', {
  enabled: true,
  debounceMs: 5000,
  useAI: true,
  commitOnSave: true,
});

await autoCommit.onWorkflowSave(workflow, repoId, 'main', 'user-id');
```

### Manual Sync
```typescript
import { getWorkflowSync } from './git/WorkflowSync';

const workflowSync = getWorkflowSync();

// Push to Git
await workflowSync.syncToGit(workflow, repoId, 'main', 'user-id');

// Pull from Git
const workflow = await workflowSync.syncFromGit('wf-id', repoId, 'main', 'user-id');
```

## Version Management

### View History
```typescript
import { getVersionManager } from './git/VersionManager';

const versionManager = getVersionManager();
const versions = await versionManager.getVersionHistory('wf-id', repoId, 50);
```

### Compare Versions
```typescript
const comparison = await versionManager.compareVersions(
  'wf-id',
  repoId,
  'old-commit',
  'new-commit'
);
```

### Rollback
```typescript
const result = await versionManager.rollback({
  workflowId: 'wf-id',
  targetVersion: 'commit-hash',
  strategy: 'soft', // or 'hard' or 'create-branch'
  validateBefore: true,
}, 'user-id');
```

## Branches

### Create Feature Branch
```typescript
import { getBranchManager } from './git/BranchManager';

const branchManager = getBranchManager();
const branch = await branchManager.createFeatureBranch(
  repoId,
  'wf-id',
  'feature/my-feature',
  'user-id'
);
```

### Switch Branch
```typescript
await branchManager.switchBranch(repoId, 'feature/my-feature', 'user-id');
```

## Pull Requests

### Create PR
```typescript
import { getPullRequestService } from './git/BranchManager';

const prService = getPullRequestService();
const pr = await prService.createWorkflowPullRequest(
  'wf-id',
  'Workflow Name',
  repoId,
  providerConfig,
  'feature/my-feature',
  'main',
  'owner',
  'repo',
  'user-id'
);
```

### Merge PR
```typescript
await prService.mergePullRequest(
  providerConfig,
  'owner',
  'repo',
  123, // PR number
  'squash',
  'user-id'
);
```

## Diff

### Generate Diff
```typescript
import { getDiffGenerator } from './git/DiffGenerator';

const diffGenerator = getDiffGenerator();
const diff = await diffGenerator.generateWorkflowDiff(oldWorkflow, newWorkflow);
```

## UI Components

### Version History
```tsx
import { VersionHistory } from './components/git/VersionHistory';

<VersionHistory
  workflowId="wf-id"
  repositoryId={repoId}
  onSelectVersion={(v) => console.log(v)}
  onRollback={(v) => handleRollback(v)}
/>
```

### Diff Viewer
```tsx
import { DiffViewer } from './components/git/DiffViewer';

<DiffViewer diff={diff} mode="visual" />
```

## Common Patterns

### Complete Workflow Sync Flow
```typescript
// 1. Configure sync
workflowSync.configureSyncconfig('wf-id', {
  autoCommit: true,
  autoPush: true,
  useAICommitMessages: true,
  preventConflicts: true,
  pullBeforePush: true,
});

// 2. Sync workflow
const result = await workflowSync.syncToGit(
  workflow,
  repoId,
  'main',
  'user-id'
);

// 3. Check result
if (result.success) {
  console.log('Synced:', result.commitHash);
} else if (result.conflicts) {
  console.log('Conflicts:', result.conflicts);
}
```

### Feature Branch Workflow
```typescript
// 1. Create feature branch
const branch = await branchManager.createFeatureBranch(
  repoId,
  'wf-id',
  undefined,
  'user-id'
);

// 2. Make changes and commit
await workflowSync.syncToGit(workflow, repoId, branch.name, 'user-id');

// 3. Create PR
const pr = await prService.createWorkflowPullRequest(
  'wf-id',
  workflow.name,
  repoId,
  providerConfig,
  branch.name,
  'main',
  'owner',
  'repo',
  'user-id'
);

// 4. Merge when approved
await prService.mergePullRequest(
  providerConfig,
  'owner',
  'repo',
  pr.number,
  'squash',
  'user-id'
);

// 5. Clean up
await branchManager.deleteBranch(repoId, branch.name, false, 'user-id');
```

### Safe Rollback Pattern
```typescript
// 1. Compare versions
const comparison = await versionManager.compareVersions(
  'wf-id',
  repoId,
  'current-commit',
  'target-commit'
);

// 2. Check compatibility
if (!comparison.compatible) {
  console.warn('Breaking changes:', comparison.breakingChanges);
}

// 3. Create test branch first (safest)
const testResult = await versionManager.rollback({
  workflowId: 'wf-id',
  targetVersion: 'target-commit',
  strategy: 'create-branch',
  validateBefore: true,
}, 'user-id');

// 4. Test in branch, then rollback for real if good
if (testsPass) {
  await versionManager.rollback({
    workflowId: 'wf-id',
    targetVersion: 'target-commit',
    strategy: 'soft',
    validateBefore: true,
  }, 'user-id');
}
```

## Error Handling

### Authentication Errors
```typescript
try {
  const provider = await GitProviderFactory.createProvider(config);
} catch (error) {
  if (error.message.includes('Bad credentials')) {
    // Token invalid or expired
  }
}
```

### Conflict Handling
```typescript
const result = await workflowSync.syncToGit(workflow, repoId, 'main', 'user-id');

if (result.conflicts && result.conflicts.length > 0) {
  // Handle conflicts
  for (const conflict of result.conflicts) {
    console.log('Conflict in:', conflict.file);
    // Resolve manually or automatically
  }
}
```

### Rate Limiting
```typescript
try {
  await provider.listRepositories();
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
}
```

## Environment Variables

```bash
# GitHub
GIT_ENABLED=true
GIT_DEFAULT_BRANCH=main
GIT_REPO_PATH=./git-repos
GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# GitLab
GITLAB_TOKEN=glpat_xxxxxxxxxxxx
GITLAB_URL=https://gitlab.com

# Bitbucket
BITBUCKET_USERNAME=username
BITBUCKET_APP_PASSWORD=xxxxxxxxxxxx
```

## Best Practices

1. **Always pull before push**
   ```typescript
   workflowSync.configureSyncconfig('wf-id', {
     pullBeforePush: true,
   });
   ```

2. **Use AI commit messages**
   ```typescript
   autoCommit.configure('wf-id', {
     useAI: true,
   });
   ```

3. **Validate before rollback**
   ```typescript
   await versionManager.rollback({
     validateBefore: true,
   }, 'user-id');
   ```

4. **Use feature branches**
   ```typescript
   const branch = await branchManager.createFeatureBranch(repoId, 'wf-id');
   ```

5. **Enable conflict prevention**
   ```typescript
   workflowSync.configureSyncconfig('wf-id', {
     preventConflicts: true,
   });
   ```

## Shortcuts

```typescript
// Get all services
import {
  getGitService,
  getWorkflowSync,
  getAutoCommit,
  getDiffGenerator,
  getVersionManager,
  getBranchManager,
  getPullRequestService,
} from './git';

const gitService = getGitService();
const workflowSync = getWorkflowSync();
const autoCommit = getAutoCommit();
const diffGenerator = getDiffGenerator();
const versionManager = getVersionManager();
const branchManager = getBranchManager();
const prService = getPullRequestService();
```

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { GitProviderFactory } from './git/GitProviderFactory';

describe('GitOps', () => {
  it('should create provider', async () => {
    const provider = await GitProviderFactory.createProvider({
      provider: 'github',
      credentials: { token: 'test-token' },
    });
    expect(provider).toBeDefined();
  });
});
```

---

For complete documentation, see [GITOPS_GUIDE.md](./GITOPS_GUIDE.md)

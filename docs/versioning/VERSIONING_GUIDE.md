# Workflow Versioning & Git Integration Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
4. [Getting Started](#getting-started)
5. [Version Management](#version-management)
6. [Branching](#branching)
7. [Merging](#merging)
8. [Visual Diff](#visual-diff)
9. [Git Integration](#git-integration)
10. [API Reference](#api-reference)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The Workflow Versioning system provides Git-like version control for workflow automation. It enables teams to:

- Automatically version every workflow change
- Create and manage branches for parallel development
- Merge branches with conflict resolution
- View visual diffs between versions
- Tag releases (v1.0.0, production, staging)
- Integrate with Git repositories
- Restore previous versions

### Key Benefits

- **Version History**: Never lose work with automatic versioning
- **Collaboration**: Multiple developers can work on different branches
- **Safety**: Restore previous versions anytime with backup creation
- **Visibility**: Visual diffs show exactly what changed
- **Integration**: Sync with Git for complete version control

---

## Architecture

The versioning system consists of three main services:

### 1. WorkflowVersioningService

Manages version creation, storage, and restoration.

**Location**: `/src/services/WorkflowVersioningService.ts`

**Features**:
- Automatic version numbering (v1, v2, v3...)
- Delta compression for efficient storage
- Version tagging and metadata
- Export/import version history
- Cleanup policies (retention)

### 2. WorkflowDiffService

Provides diff and comparison functionality.

**Location**: `/src/services/WorkflowDiffService.ts`

**Features**:
- Node-level diff detection (added, removed, modified)
- Edge diff detection
- Variable and setting comparison
- Visual diff generation
- JSON and unified diff formats
- Conflict detection

### 3. WorkflowBranchingService

Handles branch management and merging.

**Location**: `/src/services/WorkflowBranchingService.ts`

**Features**:
- Branch creation and deletion
- Branch switching
- Branch protection
- Merge strategies (auto, ours, theirs, manual)
- Branch graph visualization
- Default branches (main, development, staging, production)

### Database Schema

```prisma
model WorkflowVersion {
  id              String    @id
  workflowId      String
  version         Int
  branch          String    @default("main")
  snapshot        Json
  delta           String?   // Compressed diff
  size            Int
  checksum        String
  tags            String[]
  parentVersion   Int?
  mergeInfo       Json?
  createdAt       DateTime
  createdBy       String

  @@unique([workflowId, branch, version])
  @@index([workflowId, version])
  @@index([tags])
}
```

---

## Core Features

### Automatic Versioning

Every workflow save automatically creates a new version:

```typescript
import { getVersioningService } from '@/services/WorkflowVersioningService';

const versioningService = getVersioningService();

// Create a version (happens automatically on save)
const version = await versioningService.createVersion({
  workflowId: 'workflow_123',
  snapshot: workflowData,
  createdBy: userId,
  description: 'Added email notification node',
  tags: ['stable'],
  branch: 'main'
});

console.log(`Created version ${version.version}`);
```

### Delta Compression

Subsequent versions use delta compression to save space:

```typescript
// First version - full snapshot
await versioningService.createVersion({
  workflowId: 'workflow_123',
  snapshot: fullWorkflow,
  createdBy: userId,
  skipDelta: true // Force full snapshot
});

// Second version - delta only
await versioningService.createVersion({
  workflowId: 'workflow_123',
  snapshot: modifiedWorkflow,
  createdBy: userId
  // Delta automatically calculated
});
```

### Version Tagging

Tag important versions for easy identification:

```typescript
// Tag a version
await versioningService.tagVersion(
  'workflow_123',
  5,
  'v1.0.0',
  'main'
);

// Get all versions with tag
const stableVersions = await versioningService.getVersionsByTag(
  'workflow_123',
  'stable'
);

// Remove tag
await versioningService.untagVersion(
  'workflow_123',
  5,
  'v1.0.0'
);
```

---

## Getting Started

### Basic Setup

```typescript
import { initializeVersioningService } from '@/services/WorkflowVersioningService';
import { initializeBranchingService } from '@/services/WorkflowBranchingService';
import { initializeDiffService } from '@/services/WorkflowDiffService';

// Initialize services
const versioningService = initializeVersioningService();
const branchingService = initializeBranchingService();
const diffService = initializeDiffService();

// Initialize default branches for a workflow
await branchingService.initializeDefaultBranches(
  'workflow_123',
  'admin@example.com'
);
```

### Creating Your First Version

```typescript
const workflowSnapshot = {
  id: 'workflow_123',
  name: 'My Workflow',
  nodes: [...],
  edges: [...],
  variables: {},
  settings: {}
};

const version = await versioningService.createVersion({
  workflowId: 'workflow_123',
  snapshot: workflowSnapshot,
  createdBy: 'user@example.com',
  description: 'Initial workflow setup',
  tags: ['initial'],
  commitMessage: 'Initial commit',
  branch: 'main'
});
```

---

## Version Management

### Viewing Version History

```typescript
// Get all versions
const history = await versioningService.getVersionHistory('workflow_123');

console.log(`Current version: ${history.currentVersion}`);
console.log(`Current branch: ${history.currentBranch}`);
console.log(`Total versions: ${history.versions.length}`);

// Filter by branch
const mainHistory = await versioningService.getVersionHistory(
  'workflow_123',
  'main'
);

// Limit results
const recentVersions = await versioningService.getVersionHistory(
  'workflow_123',
  'main',
  10 // Last 10 versions
);
```

### Restoring a Version

```typescript
// Restore to version 3 with automatic backup
const restoredWorkflow = await versioningService.restoreVersion({
  workflowId: 'workflow_123',
  version: 3,
  branch: 'main',
  createBackup: true // Creates backup on separate branch
});

// Use restored workflow
updateWorkflow(restoredWorkflow);
```

### Version Statistics

```typescript
const stats = await versioningService.getVersionStats('workflow_123');

console.log({
  totalVersions: stats.totalVersions,
  branches: stats.branches,
  totalSize: stats.totalSize,
  averageSize: stats.averageSize,
  compressionRatio: stats.compressionRatio,
  taggedVersions: stats.taggedVersions
});
```

### Cleanup Old Versions

```typescript
// Keep last 50 versions, preserve tagged ones
const deleted = await versioningService.cleanupVersions('workflow_123', {
  keepLast: 50,
  keepTagged: true,
  olderThan: new Date('2024-01-01'), // Optional date filter
  branch: 'main' // Optional branch filter
});

console.log(`Deleted ${deleted} old versions`);
```

---

## Branching

### Creating Branches

```typescript
// Create feature branch from main
const branch = await branchingService.createBranch({
  workflowId: 'workflow_123',
  branchName: 'feature/new-integration',
  fromBranch: 'main',
  createdBy: 'developer@example.com',
  description: 'New Slack integration feature',
  isProtected: false
});
```

### Branch Naming Conventions

Good branch names:
- `feature/slack-integration`
- `bugfix/email-timeout`
- `hotfix/critical-error`
- `release/v1.2.0`

Invalid branch names:
- `my branch` (spaces not allowed)
- `feature@test` (special characters not allowed)

### Switching Branches

```typescript
// Switch to different branch
const workflowSnapshot = await branchingService.switchBranch(
  'workflow_123',
  'feature/new-integration'
);

// Get current branch
const currentBranch = branchingService.getCurrentBranch('workflow_123');
console.log(`Now on: ${currentBranch}`);
```

### Branch Protection

```typescript
// Protect main branch
await branchingService.setBranchProtection(
  'workflow_123',
  'main',
  true
);

// Unprotect
await branchingService.setBranchProtection(
  'workflow_123',
  'feature/test',
  false
);
```

### Listing Branches

```typescript
const branches = await branchingService.listBranches('workflow_123');

branches.forEach(branch => {
  console.log({
    name: branch.name,
    current: branch.name === currentBranch,
    protected: branch.isProtected,
    baseVersion: branch.baseVersion,
    headVersion: branch.headVersion,
    createdAt: branch.createdAt
  });
});
```

### Deleting Branches

```typescript
// Delete regular branch
await branchingService.deleteBranch('workflow_123', 'feature/old-feature');

// Force delete protected branch
await branchingService.deleteBranch(
  'workflow_123',
  'feature/protected',
  true // force
);
```

---

## Merging

### Basic Merge

```typescript
const result = await branchingService.mergeBranches({
  sourceBranch: 'feature/new-integration',
  targetBranch: 'main',
  createdBy: 'developer@example.com',
  strategy: 'auto',
  commitMessage: 'Merge feature/new-integration into main'
});

if (result.success) {
  console.log('Merge successful!');
  console.log(`New version: ${result.newVersion.version}`);
} else {
  console.log('Merge has conflicts:', result.conflicts);
}
```

### Merge Strategies

#### Auto (3-way merge)
```typescript
const result = await branchingService.mergeBranches({
  sourceBranch: 'feature/a',
  targetBranch: 'main',
  strategy: 'auto',
  createdBy: userId
});
```

#### Ours (keep target branch changes)
```typescript
const result = await branchingService.mergeBranches({
  sourceBranch: 'feature/a',
  targetBranch: 'main',
  strategy: 'ours', // Prefer main's changes
  createdBy: userId
});
```

#### Theirs (accept source branch changes)
```typescript
const result = await branchingService.mergeBranches({
  sourceBranch: 'feature/a',
  targetBranch: 'main',
  strategy: 'theirs', // Accept feature/a's changes
  createdBy: userId
});
```

### Handling Conflicts

```typescript
const result = await branchingService.mergeBranches({
  sourceBranch: 'feature/a',
  targetBranch: 'main',
  strategy: 'manual',
  createdBy: userId,
  resolveConflicts: false // Don't auto-resolve
});

if (!result.success && result.conflicts.length > 0) {
  result.conflicts.forEach(conflict => {
    console.log({
      type: conflict.type,
      resource: conflict.resourceId,
      description: conflict.description,
      severity: conflict.severity
    });

    // Show resolution options
    conflict.resolutionOptions.forEach(option => {
      console.log(`  - ${option.strategy}: ${option.description}`);
    });
  });
}
```

### Fast-Forward Merge

```typescript
// Enable fast-forward when possible
const result = await branchingService.mergeBranches({
  sourceBranch: 'feature/a',
  targetBranch: 'main',
  createdBy: userId,
  fastForward: true // Default is true
});

if (result.messages.includes('Fast-forward merge')) {
  console.log('Clean fast-forward merge completed');
}
```

---

## Visual Diff

### Comparing Versions

```typescript
import { getDiffService } from '@/services/WorkflowDiffService';

const diffService = getDiffService();

// Get two versions
const v1 = await versioningService.getVersion('workflow_123', 1);
const v2 = await versioningService.getVersion('workflow_123', 2);

// Compare them
const comparison = await diffService.compareSnapshots(
  v1.snapshot,
  v2.snapshot
);

// View summary
console.log({
  nodesAdded: comparison.diff.summary.nodesAdded,
  nodesRemoved: comparison.diff.summary.nodesRemoved,
  nodesModified: comparison.diff.summary.nodesModified,
  edgesAdded: comparison.diff.summary.edgesAdded,
  edgesRemoved: comparison.diff.summary.edgesRemoved,
  totalChanges: comparison.diff.summary.totalChanges
});
```

### Visual Diff Rendering

```typescript
// Generate visual HTML diff
const visualDiff = await diffService.generateVisualDiff(
  comparison.diff,
  {
    highlightColors: {
      added: '#22c55e',
      removed: '#ef4444',
      modified: '#f59e0b',
      unchanged: '#6b7280'
    },
    showUnchanged: false
  }
);

document.getElementById('diff-container').innerHTML = visualDiff;
```

### JSON Diff

```typescript
// Generate JSON patch format
const jsonDiff = await diffService.generateJsonDiff(
  v1.snapshot,
  v2.snapshot
);

console.log(jsonDiff);
```

### Unified Diff (Git-style)

```typescript
// Generate unified diff
const unifiedDiff = await diffService.generateUnifiedDiff(
  v1.snapshot,
  v2.snapshot
);

console.log(unifiedDiff);
// Output:
// - "name": "Old Name"
// + "name": "New Name"
```

### Diff Statistics

```typescript
const stats = await diffService.getDiffStats(comparison.diff);

console.log({
  additions: stats.additions,
  deletions: stats.deletions,
  modifications: stats.modifications,
  changePercentage: stats.changePercentage
});
```

---

## Git Integration

### Syncing Versions with Git

```typescript
import { getGitService } from '@/backend/git/GitService';

const gitService = getGitService();

// Sync workflow version to Git
await gitService.syncWorkflowVersion(
  'workflow_123',
  5, // version number
  'repo_id',
  'main', // git branch
  userId
);
```

### Pushing Workflow Branches

```typescript
// Push workflow branch to Git
await gitService.pushWorkflowBranch(
  'workflow_123',
  'feature/new-integration',
  'repo_id',
  userId
);
```

### Creating Git Tags

```typescript
// Tag workflow version in Git
await gitService.tagWorkflowVersion(
  'workflow_123',
  5,
  'v1.0.0',
  'repo_id',
  userId
);
```

### Pulling Versions from Git

```typescript
// Pull workflow versions from Git
const versionFiles = await gitService.pullWorkflowVersions(
  'workflow_123',
  'repo_id',
  userId
);

console.log(`Pulled ${versionFiles.length} versions`);
```

---

## API Reference

### WorkflowVersioningService

#### `createVersion(options)`
Creates a new workflow version.

**Parameters:**
- `workflowId`: string
- `snapshot`: WorkflowSnapshot
- `createdBy`: string
- `description?`: string
- `tags?`: string[]
- `commitMessage?`: string
- `branch?`: string (default: 'main')
- `skipDelta?`: boolean

**Returns:** `Promise<WorkflowVersion>`

#### `getVersionHistory(workflowId, branch?, limit?)`
Gets version history for a workflow.

**Returns:** `Promise<VersionHistory>`

#### `restoreVersion(options)`
Restores a workflow to a specific version.

**Parameters:**
- `workflowId`: string
- `version`: number
- `branch?`: string
- `createBackup?`: boolean

**Returns:** `Promise<WorkflowSnapshot>`

### WorkflowBranchingService

#### `createBranch(options)`
Creates a new branch.

**Parameters:**
- `workflowId`: string
- `branchName`: string
- `fromBranch?`: string
- `createdBy`: string
- `description?`: string
- `isProtected?`: boolean

**Returns:** `Promise<Branch>`

#### `mergeBranches(options)`
Merges two branches.

**Parameters:**
- `sourceBranch`: string
- `targetBranch`: string
- `strategy?`: 'auto' | 'ours' | 'theirs' | 'manual'
- `createdBy`: string
- `commitMessage?`: string
- `resolveConflicts?`: boolean
- `fastForward?`: boolean

**Returns:** `Promise<MergeResult>`

### WorkflowDiffService

#### `compareSnapshots(oldSnapshot, newSnapshot, options?)`
Compares two workflow snapshots.

**Returns:** `Promise<ComparisonResult>`

#### `generateVisualDiff(diff, options?)`
Generates HTML for visual diff display.

**Returns:** `Promise<string>`

---

## Best Practices

### Version Management

1. **Use descriptive commit messages**
   ```typescript
   await versioningService.createVersion({
     // ...
     commitMessage: 'Add Slack notification to approval workflow',
     description: 'Integration with Slack webhooks for real-time notifications'
   });
   ```

2. **Tag important releases**
   ```typescript
   // Semantic versioning
   await versioningService.tagVersion(workflowId, 10, 'v1.2.0');

   // Environment tags
   await versioningService.tagVersion(workflowId, 10, 'production');
   await versioningService.tagVersion(workflowId, 9, 'staging');
   ```

3. **Regular cleanup**
   ```typescript
   // Weekly cleanup job
   await versioningService.cleanupVersions(workflowId, {
     keepLast: 100,
     keepTagged: true,
     olderThan: thirtyDaysAgo
   });
   ```

### Branching Strategy

1. **Use Git Flow model**
   - `main`: Production-ready code
   - `development`: Integration branch
   - `feature/*`: New features
   - `bugfix/*`: Bug fixes
   - `hotfix/*`: Critical fixes
   - `release/*`: Release preparation

2. **Protect critical branches**
   ```typescript
   await branchingService.setBranchProtection(workflowId, 'main', true);
   await branchingService.setBranchProtection(workflowId, 'production', true);
   ```

3. **Delete merged branches**
   ```typescript
   // After successful merge
   await branchingService.deleteBranch(workflowId, 'feature/completed');
   ```

### Merging

1. **Review diffs before merging**
   ```typescript
   const comparison = await branchingService.compareBranches(
     workflowId,
     'main',
     'feature/new'
   );

   if (comparison.diff.summary.totalChanges > 50) {
     console.warn('Large changes detected, review carefully');
   }
   ```

2. **Handle conflicts explicitly**
   ```typescript
   const result = await branchingService.mergeBranches({
     sourceBranch: 'feature/a',
     targetBranch: 'main',
     strategy: 'manual',
     resolveConflicts: false,
     createdBy: userId
   });

   if (!result.success) {
     // Manual conflict resolution required
     showConflictResolutionUI(result.conflicts);
   }
   ```

---

## Troubleshooting

### Common Issues

#### Version Not Found
```typescript
const version = await versioningService.getVersion(workflowId, 999);
if (!version) {
  console.error('Version does not exist');
  // Check version history
  const history = await versioningService.getVersionHistory(workflowId);
  console.log('Available versions:', history.versions.map(v => v.version));
}
```

#### Cannot Delete Branch
```typescript
try {
  await branchingService.deleteBranch(workflowId, 'main');
} catch (error) {
  if (error.message.includes('default branch')) {
    console.error('Cannot delete default branch');
  }
}
```

#### Merge Conflicts
```typescript
const result = await branchingService.mergeBranches({
  sourceBranch: 'feature/a',
  targetBranch: 'main',
  strategy: 'auto',
  createdBy: userId
});

if (result.conflicts.length > 0) {
  console.log('Manual resolution required:');
  result.conflicts.forEach(conflict => {
    console.log(`- ${conflict.type}: ${conflict.description}`);
    console.log('  Resolution options:', conflict.resolutionOptions);
  });
}
```

#### Delta Reconstruction Failed
```typescript
try {
  const restored = await versioningService.restoreVersion({
    workflowId,
    version: 5
  });
} catch (error) {
  if (error.message.includes('delta')) {
    console.error('Delta chain broken, using full snapshot');
    // Recreate version with full snapshot
  }
}
```

### Performance Optimization

1. **Use delta compression for large workflows**
2. **Limit version history queries**
3. **Clean up old versions regularly**
4. **Use branch protection to prevent accidental changes**
5. **Batch version operations when possible**

---

## UI Components

The versioning system includes ready-to-use React components:

### VersionHistory Component

```tsx
import { VersionHistory } from '@/components/versioning/VersionHistory';

<VersionHistory
  workflowId="workflow_123"
  branch="main"
  onVersionSelect={(version) => console.log('Selected:', version)}
  onVersionRestore={(version) => console.log('Restored:', version)}
  onVersionTag={(version, tag) => console.log('Tagged:', version, tag)}
/>
```

### BranchManager Component

```tsx
import { BranchManager } from '@/components/versioning/BranchManager';

<BranchManager
  workflowId="workflow_123"
  currentUserId="user@example.com"
  onBranchSwitch={(branch) => console.log('Switched to:', branch)}
  onBranchCreate={(branch) => console.log('Created:', branch)}
  onBranchDelete={(branch) => console.log('Deleted:', branch)}
/>
```

### VersionComparison Component

```tsx
import { VersionComparison } from '@/components/versioning/VersionComparison';

<VersionComparison
  workflowId="workflow_123"
  version1={1}
  version2={2}
  branch="main"
/>
```

---

## Support

For issues, questions, or feature requests:

- GitHub Issues: [workflow/issues](https://github.com/yourorg/workflow/issues)
- Documentation: [/docs/versioning](/docs/versioning)
- API Reference: [/docs/api](/docs/api)

---

## Changelog

### v1.0.0 (2025-10-18)
- Initial release
- Automatic versioning
- Branch management
- Merge strategies
- Visual diff viewer
- Git integration
- UI components
- Comprehensive tests

---

**Last Updated**: 2025-10-18
**Version**: 1.0.0

/**
 * Version Control Type Definitions
 * Types for workflow version control system
 */

import type { Node, Edge } from '@xyflow/react';
import type { Workflow } from './workflowTypes';

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: string; // Semantic version (e.g., "1.2.3")
  workflow: Workflow;
  changes: VersionDiff;
  message: string; // Commit message
  author: string; // User who created the version
  createdAt: Date;
  tags: string[];
  isAutoSave: boolean;
  size: number; // Size in bytes
  hash: string; // SHA-256 hash of workflow
  parentVersionId?: string; // For branching
  mergeInfo?: MergeInfo;
}

export interface VersionDiff {
  nodes: {
    added: Node[];
    modified: Node[];
    removed: Node[];
  };
  edges: {
    added: Edge[];
    modified: Edge[];
    removed: Edge[];
  };
  properties: {
    added: string[];
    modified: string[];
    removed: string[];
  };
  summary: string;
}

export interface VersionHistory {
  workflowId: string;
  versions: WorkflowVersion[];
  currentVersion?: WorkflowVersion;
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface VersionComparison {
  workflowId: string;
  version1: WorkflowVersion;
  version2: WorkflowVersion;
  diff: VersionDiff;
  canMerge: boolean;
  conflicts: MergeConflict[];
}

export interface MergeConflict {
  type: 'node' | 'edge' | 'property';
  id: string;
  path: string;
  description: string;
  ours?: unknown;
  theirs?: unknown;
  resolution?: 'ours' | 'theirs' | 'manual';
  resolvedValue?: unknown;
}

export interface MergeInfo {
  sourceVersionId: string;
  targetVersionId: string;
  strategy: 'ours' | 'theirs' | 'manual';
  conflicts: MergeConflict[];
  resolvedAt: Date;
  resolvedBy: string;
}

export interface VersionTag {
  id: string;
  name: string;
  versionId: string;
  description?: string;
  createdAt: Date;
  createdBy?: string;
  type?: 'release' | 'milestone' | 'checkpoint' | 'custom';
}

export interface Branch {
  id: string;
  name: string;
  workflowId: string;
  parentWorkflowId: string;
  parentVersionId: string;
  createdAt: Date;
  createdBy: string;
  lastActivity: Date;
  ahead: number; // Commits ahead of parent
  behind: number; // Commits behind parent
  status: 'active' | 'merged' | 'abandoned';
}

export interface VersionControlConfig {
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // milliseconds
  maxVersions: number;
  retentionDays: number;
  requireMessage: boolean;
  allowBranching: boolean;
  defaultBranch: string;
}

export interface VersionSearchCriteria {
  workflowId?: string;
  author?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  message?: string; // Search in commit messages
  includeAutoSaves?: boolean;
}

export interface VersionMetrics {
  totalVersions: number;
  totalSize: number; // bytes
  averageChangeSize: number;
  mostActiveAuthors: Array<{
    author: string;
    versions: number;
  }>;
  changeFrequency: Array<{
    date: Date;
    changes: number;
  }>;
}

export interface DiffVisualization {
  type: 'side-by-side' | 'inline' | 'unified';
  highlightChanges: boolean;
  showLineNumbers: boolean;
  contextLines: number;
  ignoreWhitespace: boolean;
}

export interface VersionComment {
  id: string;
  versionId: string;
  author: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  replyTo?: string; // For threaded comments
}

export interface VersionReview {
  id: string;
  versionId: string;
  reviewer: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes-requested';
  comments: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  sourceVersionId: string;
  targetBranch: string;
  author: string;
  status: 'open' | 'merged' | 'closed' | 'draft';
  reviewers: string[];
  reviews: VersionReview[];
  comments: VersionComment[];
  createdAt: Date;
  updatedAt?: Date;
  mergedAt?: Date;
  mergedBy?: string;
}

// Utility types for version operations

export interface RestoreOptions {
  createBackup: boolean;
  preserveCurrentVersion: boolean;
  mergeStrategy?: 'replace' | 'merge';
}

export interface CompareOptions {
  ignoreNodePositions: boolean;
  ignoreNodeStyles: boolean;
  ignoreMetadata: boolean;
  deepComparison: boolean;
}

export interface ExportOptions {
  format: 'json' | 'yaml' | 'xml';
  includeHistory: boolean;
  includeComments: boolean;
  compress: boolean;
}

export interface ImportOptions {
  mergeStrategy: 'replace' | 'merge' | 'create-branch';
  validateSchema: boolean;
  preserveIds: boolean;
}

// Event types for version control

export interface VersionEvent {
  type: VersionEventType;
  workflowId: string;
  versionId?: string;
  author: string;
  timestamp: Date;
  data?: unknown;
}

export type VersionEventType = 
  | 'version.created'
  | 'version.restored'
  | 'version.tagged'
  | 'version.deleted'
  | 'branch.created'
  | 'branch.merged'
  | 'branch.deleted'
  | 'conflict.detected'
  | 'conflict.resolved';

// Helper functions

export function isVersionNewer(v1: string, v2: string): boolean {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return true;
    if (p1 < p2) return false;
  }

  return false;
}

export function incrementVersion(
  version: string,
  type: 'major' | 'minor' | 'patch' = 'patch'
): string {
  const parts = version.split('.').map(Number);

  switch (type) {
    case 'major':
      parts[0] = (parts[0] || 0) + 1;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1] = (parts[1] || 0) + 1;
      parts[2] = 0;
      break;
    case 'patch':
      parts[2] = (parts[2] || 0) + 1;
      break;
  }

  return parts.join('.');
}
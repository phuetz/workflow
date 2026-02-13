/**
 * Workflow Organization System Types
 * Comprehensive type definitions for folders, tags, archiving, and search
 */

// ============================================================================
// Folder System Types
// ============================================================================

export interface Folder {
  id: string;
  name: string;
  parentId: string | null; // null for root folders
  description?: string;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  path: string; // Full path from root, e.g., "/Projects/2024/Q1"
  level: number; // Depth level, 0 for root
  workflowIds: string[]; // Workflows directly in this folder
  permissions?: FolderPermissions;
  isExpanded?: boolean; // UI state
  metadata?: Record<string, unknown>;
}

export interface FolderPermissions {
  owner: string;
  readers: string[];
  editors: string[];
  admins: string[];
  isPublic: boolean;
  inheritFromParent: boolean;
}

export interface FolderTreeNode {
  folder: Folder;
  children: FolderTreeNode[];
  parent: FolderTreeNode | null;
}

export interface FolderMove {
  folderId: string;
  targetParentId: string | null;
  position?: number;
}

export interface FolderStats {
  totalWorkflows: number;
  activeWorkflows: number;
  archivedWorkflows: number;
  totalExecutions: number;
  lastActivity: string | null;
  size: number; // Total size in bytes
}

// ============================================================================
// Workflow Tagging Types
// ============================================================================

export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  usageCount: number; // Number of workflows using this tag
  category?: string; // Optional tag category
  metadata?: Record<string, unknown>;
}

export interface WorkflowTag {
  workflowId: string;
  tagId: string;
  addedAt: string;
  addedBy: string;
}

export interface TagFilter {
  operation: 'AND' | 'OR' | 'NOT';
  tagIds: string[];
}

// ============================================================================
// Archive System Types
// ============================================================================

export interface ArchivedWorkflow {
  id: string;
  originalWorkflowId: string;
  workflowName: string;
  workflowData: string; // Compressed JSON
  archivedAt: string;
  archivedBy: string;
  reason?: string;
  folderId?: string; // Original folder location
  tags: string[];
  metadata: {
    nodeCount: number;
    edgeCount: number;
    lastExecuted?: string;
    executionCount?: number;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
  expiresAt?: string; // Auto-delete date (default 30 days)
  isRestorable: boolean;
}

export interface ArchiveStats {
  totalArchived: number;
  totalSize: number;
  compressedSize: number;
  averageCompressionRatio: number;
  oldestArchive: string | null;
  newestArchive: string | null;
  expiringSoon: number; // Count of archives expiring in next 7 days
}

export interface ArchiveFilter {
  dateFrom?: string;
  dateTo?: string;
  archivedBy?: string;
  folderId?: string;
  tags?: string[];
  searchQuery?: string;
}

// ============================================================================
// Bulk Operations Types
// ============================================================================

export type BulkOperationType =
  | 'move'
  | 'archive'
  | 'delete'
  | 'tag'
  | 'untag'
  | 'duplicate'
  | 'export'
  | 'share';

export interface BulkOperation {
  id: string;
  type: BulkOperationType;
  workflowIds: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  startedAt: string;
  completedAt?: string;
  result?: BulkOperationResult;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface BulkOperationResult {
  successful: string[];
  failed: Array<{
    workflowId: string;
    error: string;
  }>;
  totalProcessed: number;
  duration: number; // milliseconds
}

export interface BulkMoveParams {
  workflowIds: string[];
  targetFolderId: string | null;
}

export interface BulkTagParams {
  workflowIds: string[];
  tagIds: string[];
  action: 'add' | 'remove' | 'replace';
}

export interface BulkArchiveParams {
  workflowIds: string[];
  reason?: string;
}

export interface BulkExportParams {
  workflowIds: string[];
  format: 'json' | 'zip';
  includeExecutionHistory?: boolean;
}

// ============================================================================
// Advanced Search Types
// ============================================================================

export interface SearchQuery {
  query: string;
  filters: SearchFilters;
  sort?: SearchSort;
  pagination?: SearchPagination;
}

export interface SearchFilters {
  name?: string; // Fuzzy search on name
  tags?: TagFilter;
  folderId?: string;
  includeSubfolders?: boolean;
  createdBy?: string[];
  dateCreated?: DateRange;
  dateModified?: DateRange;
  status?: WorkflowStatus[];
  executionStats?: ExecutionStatsFilter;
  hasSchedule?: boolean;
  hasWebhook?: boolean;
  isFavorite?: boolean;
}

export interface DateRange {
  from?: string;
  to?: string;
}

export type WorkflowStatus = 'active' | 'inactive' | 'archived' | 'draft';

export interface ExecutionStatsFilter {
  successRate?: { min?: number; max?: number };
  executionCount?: { min?: number; max?: number };
  avgExecutionTime?: { min?: number; max?: number }; // milliseconds
  lastExecuted?: DateRange;
}

export interface SearchSort {
  field: SearchSortField;
  direction: 'asc' | 'desc';
}

export type SearchSortField =
  | 'name'
  | 'createdAt'
  | 'updatedAt'
  | 'lastExecuted'
  | 'executionCount'
  | 'successRate'
  | 'avgExecutionTime';

export interface SearchPagination {
  page: number;
  pageSize: number;
}

export interface SearchResult {
  workflowId: string;
  workflowName: string;
  folderId?: string;
  folderPath?: string;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: WorkflowStatus;
  executionStats?: {
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    lastExecuted?: string;
  };
  matchScore?: number; // Fuzzy search relevance score
  highlights?: string[]; // Matched text snippets
}

export interface SearchResults {
  results: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets?: SearchFacets;
}

export interface SearchFacets {
  tags: Array<{ tag: Tag; count: number }>;
  folders: Array<{ folder: Folder; count: number }>;
  status: Array<{ status: WorkflowStatus; count: number }>;
  creators: Array<{ userId: string; userName: string; count: number }>;
}

// ============================================================================
// Smart Collections Types
// ============================================================================

export type SmartCollectionType =
  | 'recent'
  | 'favorites'
  | 'my-workflows'
  | 'shared-with-me'
  | 'high-execution'
  | 'failing'
  | 'inactive'
  | 'custom';

export interface SmartCollection {
  id: string;
  type: SmartCollectionType;
  name: string;
  description: string;
  icon: string;
  color: string;
  query: SearchQuery;
  autoUpdate: boolean; // Automatically refresh results
  refreshInterval?: number; // minutes
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isSystem: boolean; // System-defined vs user-defined
  isPinned: boolean;
}

// ============================================================================
// Saved Searches Types
// ============================================================================

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  query: SearchQuery;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isShared: boolean;
  sharedWith?: string[];
  usageCount: number;
  lastUsed?: string;
}

// ============================================================================
// Organization State Types
// ============================================================================

export interface OrganizationState {
  folders: Record<string, Folder>;
  folderTree: FolderTreeNode[];
  tags: Record<string, Tag>;
  workflowTags: WorkflowTag[];
  archives: Record<string, ArchivedWorkflow>;
  smartCollections: SmartCollection[];
  savedSearches: SavedSearch[];
  bulkOperations: BulkOperation[];

  // UI State
  selectedFolderId: string | null;
  expandedFolderIds: Set<string>;
  selectedWorkflowIds: Set<string>;
  searchQuery: string;
  activeFilters: SearchFilters;

  // Cache
  searchCache: Map<string, SearchResults>;
  folderStatsCache: Map<string, FolderStats>;
}

// ============================================================================
// Action Types
// ============================================================================

export interface CreateFolderParams {
  name: string;
  parentId?: string | null;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateFolderParams {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  permissions?: FolderPermissions;
}

export interface MoveFolderParams {
  folderId: string;
  targetParentId: string | null;
}

export interface CreateTagParams {
  name: string;
  color: string;
  description?: string;
  category?: string;
}

export interface UpdateTagParams {
  name?: string;
  color?: string;
  description?: string;
  category?: string;
}

// ============================================================================
// Event Types
// ============================================================================

export interface OrganizationEvent {
  id: string;
  type: OrganizationEventType;
  timestamp: string;
  userId: string;
  metadata: Record<string, unknown>;
}

export type OrganizationEventType =
  | 'folder.created'
  | 'folder.updated'
  | 'folder.deleted'
  | 'folder.moved'
  | 'workflow.moved'
  | 'workflow.archived'
  | 'workflow.restored'
  | 'tag.created'
  | 'tag.updated'
  | 'tag.deleted'
  | 'tag.applied'
  | 'tag.removed'
  | 'bulk.operation.started'
  | 'bulk.operation.completed';

// ============================================================================
// Error Types
// ============================================================================

export class OrganizationError extends Error {
  constructor(
    message: string,
    public code: OrganizationErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'OrganizationError';
  }
}

export type OrganizationErrorCode =
  | 'FOLDER_NOT_FOUND'
  | 'FOLDER_ALREADY_EXISTS'
  | 'CIRCULAR_DEPENDENCY'
  | 'PERMISSION_DENIED'
  | 'TAG_NOT_FOUND'
  | 'TAG_ALREADY_EXISTS'
  | 'ARCHIVE_NOT_FOUND'
  | 'ARCHIVE_EXPIRED'
  | 'BULK_OPERATION_FAILED'
  | 'INVALID_OPERATION';

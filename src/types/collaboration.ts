/**
 * Collaboration and Sharing Types
 * Types for real-time collaboration, sharing, and team management features
 */

export interface WorkflowCollaborator {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  avatar?: string;
  role: CollaborationRole;
  permissions: CollaborationPermission[];
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  invitedBy: string;
  invitedAt: Date;
  acceptedAt?: Date;
}

export type CollaborationRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'commenter';

export type CollaborationPermission = 
  | 'read'
  | 'write'
  | 'execute'
  | 'share'
  | 'manage_users'
  | 'delete'
  | 'export'
  | 'view_credentials'
  | 'manage_credentials'
  | 'view_executions'
  | 'view_analytics';

export interface CollaborationSession {
  id: string;
  workflowId: string;
  participants: WorkflowCollaborator[];
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  changes: CollaborationChange[];
}

export interface CollaborationChange {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  type: ChangeType;
  timestamp: Date;
  description: string;
  data: {
    nodeId?: string;
    property?: string;
    oldValue?: unknown;
    newValue?: unknown;
    position?: { x: number; y: number };
  };
  applied: boolean;
  conflicted?: boolean;
  conflictedWith?: string[];
}

export type ChangeType = 
  | 'node_added'
  | 'node_removed'
  | 'node_moved'
  | 'node_updated'
  | 'connection_added'
  | 'connection_removed'
  | 'workflow_renamed'
  | 'workflow_description_updated'
  | 'variable_added'
  | 'variable_updated'
  | 'variable_removed'
  | 'cursor_moved'
  | 'selection_changed';

export interface RealtimePresence {
  userId: string;
  userName: string;
  avatar?: string;
  cursor?: { x: number; y: number };
  selection?: string[]; // node IDs
  viewport?: { x: number; y: number; zoom: number };
  isActive: boolean;
  lastActivity: Date;
}

export interface WorkflowShare {
  id: string;
  workflowId: string;
  shareType: ShareType;
  sharedBy: string;
  sharedAt: Date;
  expiresAt?: Date;
  accessCount: number;
  maxAccess?: number;
  password?: string;
  allowedDomains?: string[];
  permissions: SharePermission[];
  metadata: {
    title: string;
    description?: string;
    tags?: string[];
    category?: string;
  };
}

export type ShareType = 'public' | 'private' | 'team' | 'organization' | 'link';

export type SharePermission = 'view' | 'copy' | 'execute' | 'comment';

export interface WorkflowComment {
  id: string;
  workflowId: string;
  nodeId?: string; // If comment is on a specific node
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  mentions: string[]; // User IDs mentioned in comment
  attachments?: CommentAttachment[];
  createdAt: Date;
  updatedAt?: Date;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  replies: WorkflowComment[];
  reactions: CommentReaction[];
  position?: { x: number; y: number }; // Position on canvas for sticky comments
}

export interface CommentAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'document' | 'link' | 'screenshot';
  size?: number;
}

export interface CommentReaction {
  emoji: string;
  users: Array<{ id: string; name: string }>;
  count: number;
}

export interface CollaborationConflict {
  id: string;
  workflowId: string;
  changeIds: string[];
  type: ConflictType;
  description: string;
  users: Array<{ id: string; name: string }>;
  autoResolvable: boolean;
  resolution?: ConflictResolution;
  createdAt: Date;
  resolvedAt?: Date;
}

export type ConflictType = 'concurrent_edit' | 'move_collision' | 'delete_reference' | 'property_collision';

export interface ConflictResolution {
  strategy: 'merge' | 'override' | 'manual';
  winningChangeId?: string;
  mergedData?: unknown;
  resolvedBy: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  organization: string;
  members: TeamMember[];
  workflows: string[]; // Workflow IDs
  settings: TeamSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  userId: string;
  userName: string;
  userEmail: string;
  avatar?: string;
  role: TeamRole;
  permissions: TeamPermission[];
  joinedAt: Date;
  invitedBy: string;
  isActive: boolean;
}

export type TeamRole = 'owner' | 'admin' | 'member' | 'guest';

export type TeamPermission = 
  | 'create_workflows'
  | 'manage_workflows'
  | 'invite_users'
  | 'remove_users'
  | 'manage_settings'
  | 'view_analytics'
  | 'export_data';

export interface TeamSettings {
  defaultWorkflowPermissions: CollaborationPermission[];
  allowPublicSharing: boolean;
  requireApprovalForSharing: boolean;
  allowExternalCollaborators: boolean;
  workflowNamingConvention?: string;
  autoDeleteInactiveWorkflows: boolean;
  inactivityThresholdDays: number;
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: string;
  name?: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  data: unknown; // Complete workflow data
  changelog: VersionChangelogEntry[];
  tags: string[];
  isDeployed: boolean;
  deployedAt?: Date;
  deployedBy?: string;
}

export interface VersionChangelogEntry {
  type: 'added' | 'modified' | 'removed' | 'fixed';
  description: string;
  details?: string;
  author: string;
}

export interface MergeRequest {
  id: string;
  workflowId: string;
  title: string;
  description: string;
  sourceVersion: string;
  targetVersion: string;
  author: string;
  status: 'open' | 'merged' | 'closed' | 'draft';
  reviewers: Array<{ userId: string; status: 'pending' | 'approved' | 'changes_requested' }>;
  changes: CollaborationChange[];
  conflicts: CollaborationConflict[];
  comments: WorkflowComment[];
  createdAt: Date;
  updatedAt: Date;
  mergedAt?: Date;
  mergedBy?: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  notifications: {
    mentions: boolean;
    comments: boolean;
    shares: boolean;
    workflowChanges: boolean;
    executions: boolean;
    teamInvites: boolean;
    mergeRequests: boolean;
  };
}

export interface CollaborationAnalytics {
  workflowId: string;
  timeRange: { start: Date; end: Date };
  metrics: {
    totalCollaborators: number;
    activeCollaborators: number;
    totalChanges: number;
    conflictsResolved: number;
    averageResolutionTime: number;
    commentsCount: number;
    sharesCount: number;
    versionCount: number;
  };
  collaboratorActivity: Array<{
    userId: string;
    userName: string;
    changesCount: number;
    commentsCount: number;
    lastActivity: Date;
    activeDays: number;
  }>;
  changesByType: Record<ChangeType, number>;
  activityTimeline: Array<{
    date: string;
    changes: number;
    comments: number;
    conflicts: number;
  }>;
}

export interface CollaborationService {
  // Session Management
  createSession(workflowId: string): Promise<CollaborationSession>;
  joinSession(sessionId: string, userId: string): Promise<void>;
  leaveSession(sessionId: string, userId: string): Promise<void>;
  getActiveSession(workflowId: string): Promise<CollaborationSession | null>;
  
  // Real-time Collaboration
  broadcastChange(sessionId: string, change: CollaborationChange): Promise<void>;
  broadcastPresence(sessionId: string, presence: RealtimePresence): Promise<void>;
  subscribeToChanges(sessionId: string, callback: (change: CollaborationChange) => void): Promise<void>;
  subscribeToPresence(sessionId: string, callback: (presence: RealtimePresence[]) => void): Promise<void>;
  
  // Conflict Resolution
  detectConflicts(changes: CollaborationChange[]): Promise<CollaborationConflict[]>;
  resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void>;
  
  // User Management
  addCollaborator(workflowId: string, collaborator: Omit<WorkflowCollaborator, 'id'>): Promise<WorkflowCollaborator>;
  removeCollaborator(workflowId: string, userId: string): Promise<void>;
  updateCollaboratorRole(workflowId: string, userId: string, role: CollaborationRole): Promise<void>;
  getCollaborators(workflowId: string): Promise<WorkflowCollaborator[]>;
  
  // Sharing
  createShare(workflowId: string, shareConfig: Omit<WorkflowShare, 'id' | 'accessCount'>): Promise<WorkflowShare>;
  getShare(shareId: string): Promise<WorkflowShare | null>;
  updateShare(shareId: string, updates: Partial<WorkflowShare>): Promise<void>;
  revokeShare(shareId: string): Promise<void>;
  
  // Comments
  addComment(comment: Omit<WorkflowComment, 'id' | 'createdAt'>): Promise<WorkflowComment>;
  updateComment(commentId: string, content: string): Promise<void>;
  deleteComment(commentId: string): Promise<void>;
  resolveComment(commentId: string, userId: string): Promise<void>;
  getComments(workflowId: string, nodeId?: string): Promise<WorkflowComment[]>;
  
  // Analytics
  getCollaborationAnalytics(workflowId: string, timeRange: { start: Date; end: Date }): Promise<CollaborationAnalytics>;
}
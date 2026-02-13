/**
 * Workflow Collaboration
 * Real-time collaboration features for workflows
 */

import type { Node, Edge } from '@xyflow/react';

export enum CollaboratorRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  COMMENTER = 'commenter'
}

export enum ActivityType {
  WORKFLOW_CREATED = 'workflow_created',
  WORKFLOW_UPDATED = 'workflow_updated',
  WORKFLOW_DELETED = 'workflow_deleted',
  NODE_ADDED = 'node_added',
  NODE_REMOVED = 'node_removed',
  NODE_UPDATED = 'node_updated',
  EDGE_ADDED = 'edge_added',
  EDGE_REMOVED = 'edge_removed',
  COMMENT_ADDED = 'comment_added',
  COMMENT_RESOLVED = 'comment_resolved',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left'
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: CollaboratorRole;
  isOnline: boolean;
  lastSeen: Date;
  currentNode?: string; // ID of node they're currently viewing/editing
  cursorPosition?: { x: number; y: number };
}

export interface Comment {
  id: string;
  workflowId: string;
  nodeId?: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  replies?: Comment[];
  position?: { x: number; y: number };
}

export interface Activity {
  id: string;
  workflowId: string;
  type: ActivityType;
  userId: string;
  userName: string;
  timestamp: Date;
  data?: Record<string, any>;
  description: string;
}

export interface PresenceUpdate {
  userId: string;
  workflowId: string;
  cursorPosition?: { x: number; y: number };
  currentNode?: string;
  isTyping?: boolean;
}

export interface CollaborationState {
  workflowId: string;
  collaborators: Collaborator[];
  comments: Comment[];
  activities: Activity[];
  pendingChanges: Array<{
    type: string;
    data: any;
    timestamp: Date;
  }>;
}

class CollaborationManager {
  private states: Map<string, CollaborationState> = new Map();
  private listeners: Map<string, Set<(state: CollaborationState) => void>> = new Map();
  private presenceInterval?: NodeJS.Timeout;
  private currentUserId?: string;

  /**
   * Initialize collaboration for a workflow
   */
  initialize(workflowId: string, userId: string): CollaborationState {
    this.currentUserId = userId;

    const state: CollaborationState = {
      workflowId,
      collaborators: [],
      comments: [],
      activities: [],
      pendingChanges: []
    };

    this.states.set(workflowId, state);
    this.startPresenceTracking(workflowId);

    return state;
  }

  /**
   * Add collaborator to workflow
   */
  addCollaborator(
    workflowId: string,
    collaborator: Omit<Collaborator, 'isOnline' | 'lastSeen'>
  ): void {
    const state = this.states.get(workflowId);
    if (!state) return;

    const fullCollaborator: Collaborator = {
      ...collaborator,
      isOnline: false,
      lastSeen: new Date()
    };

    state.collaborators.push(fullCollaborator);
    this.updateState(workflowId, state);

    this.addActivity(workflowId, {
      type: ActivityType.USER_JOINED,
      userId: collaborator.id,
      userName: collaborator.name,
      description: `${collaborator.name} was added as ${collaborator.role}`
    });
  }

  /**
   * Remove collaborator
   */
  removeCollaborator(workflowId: string, userId: string): void {
    const state = this.states.get(workflowId);
    if (!state) return;

    const collaborator = state.collaborators.find(c => c.id === userId);
    if (!collaborator) return;

    state.collaborators = state.collaborators.filter(c => c.id !== userId);
    this.updateState(workflowId, state);

    this.addActivity(workflowId, {
      type: ActivityType.USER_LEFT,
      userId,
      userName: collaborator.name,
      description: `${collaborator.name} left the workflow`
    });
  }

  /**
   * Update collaborator presence
   */
  updatePresence(workflowId: string, update: PresenceUpdate): void {
    const state = this.states.get(workflowId);
    if (!state) return;

    const collaborator = state.collaborators.find(c => c.id === update.userId);
    if (!collaborator) return;

    if (update.cursorPosition) {
      collaborator.cursorPosition = update.cursorPosition;
    }

    if (update.currentNode !== undefined) {
      collaborator.currentNode = update.currentNode;
    }

    collaborator.isOnline = true;
    collaborator.lastSeen = new Date();

    this.updateState(workflowId, state);
  }

  /**
   * Add comment
   */
  addComment(
    workflowId: string,
    comment: Omit<Comment, 'id' | 'createdAt' | 'resolved'>
  ): Comment {
    const state = this.states.get(workflowId);
    if (!state) throw new Error('Workflow not initialized');

    const fullComment: Comment = {
      ...comment,
      id: this.generateId('comment'),
      createdAt: new Date(),
      resolved: false
    };

    state.comments.push(fullComment);
    this.updateState(workflowId, state);

    this.addActivity(workflowId, {
      type: ActivityType.COMMENT_ADDED,
      userId: comment.authorId,
      userName: comment.authorName,
      description: `${comment.authorName} added a comment${comment.nodeId ? ' on a node' : ''}`,
      data: { commentId: fullComment.id, nodeId: comment.nodeId }
    });

    return fullComment;
  }

  /**
   * Reply to comment
   */
  replyToComment(
    workflowId: string,
    commentId: string,
    reply: Omit<Comment, 'id' | 'createdAt' | 'resolved' | 'replies'>
  ): Comment {
    const state = this.states.get(workflowId);
    if (!state) throw new Error('Workflow not initialized');

    const parentComment = state.comments.find(c => c.id === commentId);
    if (!parentComment) throw new Error('Comment not found');

    const fullReply: Comment = {
      ...reply,
      id: this.generateId('reply'),
      createdAt: new Date(),
      resolved: false
    };

    if (!parentComment.replies) {
      parentComment.replies = [];
    }

    parentComment.replies.push(fullReply);
    this.updateState(workflowId, state);

    return fullReply;
  }

  /**
   * Resolve comment
   */
  resolveComment(workflowId: string, commentId: string, userId: string, userName: string): void {
    const state = this.states.get(workflowId);
    if (!state) return;

    const comment = state.comments.find(c => c.id === commentId);
    if (!comment) return;

    comment.resolved = true;
    comment.resolvedBy = userId;
    comment.resolvedAt = new Date();

    this.updateState(workflowId, state);

    this.addActivity(workflowId, {
      type: ActivityType.COMMENT_RESOLVED,
      userId,
      userName,
      description: `${userName} resolved a comment`,
      data: { commentId }
    });
  }

  /**
   * Get comments for a node
   */
  getNodeComments(workflowId: string, nodeId: string): Comment[] {
    const state = this.states.get(workflowId);
    if (!state) return [];

    return state.comments.filter(c => c.nodeId === nodeId && !c.resolved);
  }

  /**
   * Track activity
   */
  private addActivity(
    workflowId: string,
    activity: Omit<Activity, 'id' | 'workflowId' | 'timestamp'>
  ): void {
    const state = this.states.get(workflowId);
    if (!state) return;

    const fullActivity: Activity = {
      ...activity,
      id: this.generateId('activity'),
      workflowId,
      timestamp: new Date()
    };

    state.activities.unshift(fullActivity);

    // Keep only last 100 activities
    if (state.activities.length > 100) {
      state.activities = state.activities.slice(0, 100);
    }

    this.updateState(workflowId, state);
  }

  /**
   * Record workflow change
   */
  recordChange(
    workflowId: string,
    type: ActivityType,
    data: any,
    userId: string,
    userName: string
  ): void {
    this.addActivity(workflowId, {
      type,
      userId,
      userName,
      description: this.getActivityDescription(type, data, userName),
      data
    });
  }

  /**
   * Get activity description
   */
  private getActivityDescription(type: ActivityType, data: any, userName: string): string {
    switch (type) {
      case ActivityType.WORKFLOW_CREATED:
        return `${userName} created the workflow`;
      case ActivityType.WORKFLOW_UPDATED:
        return `${userName} updated the workflow`;
      case ActivityType.WORKFLOW_DELETED:
        return `${userName} deleted the workflow`;
      case ActivityType.NODE_ADDED:
        return `${userName} added a ${data.nodeType || 'node'}`;
      case ActivityType.NODE_REMOVED:
        return `${userName} removed a node`;
      case ActivityType.NODE_UPDATED:
        return `${userName} updated a node`;
      case ActivityType.EDGE_ADDED:
        return `${userName} added a connection`;
      case ActivityType.EDGE_REMOVED:
        return `${userName} removed a connection`;
      default:
        return `${userName} made a change`;
    }
  }

  /**
   * Get recent activity
   */
  getRecentActivity(workflowId: string, limit: number = 20): Activity[] {
    const state = this.states.get(workflowId);
    if (!state) return [];

    return state.activities.slice(0, limit);
  }

  /**
   * Get online collaborators
   */
  getOnlineCollaborators(workflowId: string): Collaborator[] {
    const state = this.states.get(workflowId);
    if (!state) return [];

    // Consider users online if they were active in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return state.collaborators.filter(c => c.lastSeen > fiveMinutesAgo);
  }

  /**
   * Check if user can edit
   */
  canEdit(workflowId: string, userId: string): boolean {
    const state = this.states.get(workflowId);
    if (!state) return false;

    const collaborator = state.collaborators.find(c => c.id === userId);
    if (!collaborator) return false;

    return [CollaboratorRole.OWNER, CollaboratorRole.EDITOR].includes(collaborator.role);
  }

  /**
   * Check if user can comment
   */
  canComment(workflowId: string, userId: string): boolean {
    const state = this.states.get(workflowId);
    if (!state) return false;

    const collaborator = state.collaborators.find(c => c.id === userId);
    return !!collaborator; // All collaborators can comment
  }

  /**
   * Subscribe to state changes
   */
  subscribe(workflowId: string, callback: (state: CollaborationState) => void): () => void {
    if (!this.listeners.has(workflowId)) {
      this.listeners.set(workflowId, new Set());
    }

    this.listeners.get(workflowId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(workflowId);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * Update state and notify listeners
   */
  private updateState(workflowId: string, state: CollaborationState): void {
    this.states.set(workflowId, state);

    const listeners = this.listeners.get(workflowId);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(state);
        } catch (error) {
          console.error('Error in collaboration listener:', error);
        }
      });
    }
  }

  /**
   * Start presence tracking
   */
  private startPresenceTracking(workflowId: string): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }

    // Send presence updates every 30 seconds
    this.presenceInterval = setInterval(() => {
      if (this.currentUserId) {
        this.updatePresence(workflowId, {
          userId: this.currentUserId,
          workflowId
        });
      }

      // Mark users as offline if they haven't sent presence in 2 minutes
      const state = this.states.get(workflowId);
      if (state) {
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        state.collaborators.forEach(c => {
          if (c.lastSeen < twoMinutesAgo) {
            c.isOnline = false;
          }
        });
        this.updateState(workflowId, state);
      }
    }, 30000);
  }

  /**
   * Stop presence tracking
   */
  stopPresenceTracking(): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = undefined;
    }
  }

  /**
   * Cleanup
   */
  cleanup(workflowId: string): void {
    this.states.delete(workflowId);
    this.listeners.delete(workflowId);
    this.stopPresenceTracking();
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const collaborationManager = new CollaborationManager();

/**
 * React hook for collaboration
 */
export function useCollaboration(workflowId: string, userId: string) {
  const [state, setState] = React.useState<CollaborationState | null>(null);

  React.useEffect(() => {
    const initialState = collaborationManager.initialize(workflowId, userId);
    setState(initialState);

    const unsubscribe = collaborationManager.subscribe(workflowId, setState);

    return () => {
      unsubscribe();
      collaborationManager.cleanup(workflowId);
    };
  }, [workflowId, userId]);

  return {
    state,
    addComment: (comment: Omit<Comment, 'id' | 'createdAt' | 'resolved'>) =>
      collaborationManager.addComment(workflowId, comment),
    resolveComment: (commentId: string, userName: string) =>
      collaborationManager.resolveComment(workflowId, commentId, userId, userName),
    updatePresence: (update: Omit<PresenceUpdate, 'userId' | 'workflowId'>) =>
      collaborationManager.updatePresence(workflowId, { ...update, userId, workflowId }),
    canEdit: () => collaborationManager.canEdit(workflowId, userId),
    canComment: () => collaborationManager.canComment(workflowId, userId)
  };
}

// React namespace
import * as React from 'react';

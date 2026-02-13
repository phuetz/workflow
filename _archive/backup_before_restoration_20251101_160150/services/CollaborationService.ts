/**
 * Collaboration Service
 * Real-time collaboration, sharing, and team management for workflows
 */

import { logger } from './LoggingService';
import { BaseService } from './BaseService';
import { encryptionService } from './EncryptionService';
import type {
  WorkflowCollaborator,
  CollaborationSession,
  CollaborationChange,
  RealtimePresence,
  WorkflowShare,
  WorkflowComment,
  CollaborationConflict,
  ConflictResolution,
  Team,
  CollaborationAnalytics,
  CollaborationService as ICollaborationService,
  ChangeType,
  ConflictType,
  ShareType,
  CollaborationRole
} from '../types/collaboration';

export class CollaborationService extends BaseService implements ICollaborationService {
  private activeSessions: Map<string, CollaborationSession> = new Map();
  private presenceData: Map<string, RealtimePresence[]> = new Map();
  private workflowCollaborators: Map<string, WorkflowCollaborator[]> = new Map();
  private workflowShares: Map<string, WorkflowShare[]> = new Map();
  private workflowComments: Map<string, WorkflowComment[]> = new Map();
  private teams: Map<string, Team> = new Map();
  private conflicts: Map<string, CollaborationConflict[]> = new Map();
  private changeSubscribers: Map<string, Array<(change: CollaborationChange) => void>> = new Map();
  private presenceSubscribers: Map<string, Array<(presence: RealtimePresence[]) => void>> = new Map();

  constructor() {
    super('CollaborationService', {
      enableRetry: true,
      maxRetries: 3,
      enableCaching: false // Real-time data shouldn't be cached
    });

    this.initializeCollaboration();
  }

  private async initializeCollaboration(): Promise<void> {
    // Initialize default teams and sample data
    await this.createSampleData();
    
    // Start background cleanup
    this.startBackgroundCleanup();
    
    logger.info('Collaboration service initialized', {
      activeSessions: this.activeSessions.size,
      totalTeams: this.teams.size
    });
  }

  private async createSampleData(): Promise<void> {
    // Sample team
    const sampleTeam: Team = {
      id: 'team-default',
      name: 'Default Team',
      description: 'Default team for workflow collaboration',
      organization: 'organization-1',
      members: [
        {
          userId: 'user-1',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          role: 'owner',
          permissions: ['create_workflows', 'manage_workflows', 'invite_users', 'manage_settings'],
          joinedAt: new Date(),
          invitedBy: 'system',
          isActive: true
        },
        {
          userId: 'user-2',
          userName: 'Jane Smith',
          userEmail: 'jane@example.com',
          role: 'admin',
          permissions: ['create_workflows', 'manage_workflows', 'invite_users'],
          joinedAt: new Date(),
          invitedBy: 'user-1',
          isActive: true
        }
      ],
      workflows: ['workflow-1', 'workflow-2'],
      settings: {
        defaultWorkflowPermissions: ['read', 'write', 'execute'],
        allowPublicSharing: true,
        requireApprovalForSharing: false,
        allowExternalCollaborators: true,
        autoDeleteInactiveWorkflows: false,
        inactivityThresholdDays: 90
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.teams.set(sampleTeam.id, sampleTeam);

    // Sample collaborators for a workflow
    const sampleCollaborators: WorkflowCollaborator[] = [
      {
        id: 'collab-1',
        userId: 'user-1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        role: 'owner',
        permissions: ['read', 'write', 'execute', 'share', 'manage_users', 'delete'],
        status: 'online',
        lastSeen: new Date(),
        invitedBy: 'system',
        invitedAt: new Date(),
        acceptedAt: new Date()
      },
      {
        id: 'collab-2',
        userId: 'user-2',
        userName: 'Jane Smith',
        userEmail: 'jane@example.com',
        role: 'editor',
        permissions: ['read', 'write', 'execute'],
        status: 'away',
        lastSeen: new Date(Date.now() - 5 * 60 * 1000),
        invitedBy: 'user-1',
        invitedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        acceptedAt: new Date(Date.now() - 23 * 60 * 60 * 1000)
      }
    ];

    this.workflowCollaborators.set('workflow-1', sampleCollaborators);
  }

  private startBackgroundCleanup(): void {
    // Clean up inactive sessions every 5 minutes
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);

    // Clean up old presence data every minute
    setInterval(() => {
      this.cleanupStalePresence();
    }, 60 * 1000);
  }

  private cleanupInactiveSessions(): void {

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity.getTime() > inactivityThreshold) {
        this.activeSessions.delete(sessionId);
        this.presenceData.delete(sessionId);
        this.changeSubscribers.delete(sessionId);
        this.presenceSubscribers.delete(sessionId);
        
        logger.info('Cleaned up inactive collaboration session', { sessionId });
      }
    }
  }

  private cleanupStalePresence(): void {

    for (const [sessionId, presenceList] of this.presenceData.entries()) {
        presence => now - presence.lastActivity.getTime() < staleThreshold
      );
      
      if (activePresence.length !== presenceList.length) {
        this.presenceData.set(sessionId, activePresence);
      }
    }
  }

  /**
   * Create a new collaboration session for a workflow
   */
  public async createSession(workflowId: string): Promise<CollaborationSession> {
    return this.executeOperation('createSession', async () => {
      
      const session: CollaborationSession = {
        id: sessionId,
        workflowId,
        participants: collaborators,
        createdAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
        changes: []
      };

      this.activeSessions.set(sessionId, session);
      this.presenceData.set(sessionId, []);
      this.changeSubscribers.set(sessionId, []);
      this.presenceSubscribers.set(sessionId, []);

      logger.info('Collaboration session created', { sessionId, workflowId });
      return session;
    });
  }

  /**
   * Join an existing collaboration session
   */
  public async joinSession(sessionId: string, userId: string): Promise<void> {
    return this.executeOperation('joinSession', async () => {
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Check if user is already a participant
      if (!isParticipant) {
        // Get user info from collaborators
        
        if (collaborator) {
          session.participants.push(collaborator);
        }
      }

      session.lastActivity = new Date();
      
      logger.info('User joined collaboration session', { sessionId, userId });
    });
  }

  /**
   * Leave a collaboration session
   */
  public async leaveSession(sessionId: string, userId: string): Promise<void> {
    return this.executeOperation('leaveSession', async () => {
      if (!session) return;

      // Remove user from participants
      session.participants = session.participants.filter(p => p.userId !== userId);
      
      // Remove user from presence data
      this.presenceData.set(sessionId, presenceList.filter(p => p.userId !== userId));
      
      session.lastActivity = new Date();
      
      logger.info('User left collaboration session', { sessionId, userId });
    });
  }

  /**
   * Get active collaboration session for a workflow
   */
  public async getActiveSession(workflowId: string): Promise<CollaborationSession | null> {
    for (const session of this.activeSessions.values()) {
      if (session.workflowId === workflowId && session.isActive) {
        return session;
      }
    }
    return null;
  }

  /**
   * Broadcast a change to all session participants
   */
  public async broadcastChange(sessionId: string, change: CollaborationChange): Promise<void> {
    return this.executeOperation('broadcastChange', async () => {
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Add change to session history
      session.changes.push(change);
      session.lastActivity = new Date();

      // Detect potential conflicts
      if (conflicts.length > 0) {
        this.conflicts.set(session.workflowId, [...workflowConflicts, ...conflicts]);
      }

      // Notify all subscribers
      subscribers.forEach(callback => {
        try {
          callback(change);
        } catch (error) {
          logger.error('Error in change subscriber callback', { error, sessionId });
        }
      });

      logger.debug('Change broadcasted', { sessionId, changeType: change.type, userId: change.userId });
    });
  }

  /**
   * Broadcast presence information
   */
  public async broadcastPresence(sessionId: string, presence: RealtimePresence): Promise<void> {
    return this.executeOperation('broadcastPresence', async () => {
      
      // Update or add presence
      if (existingIndex >= 0) {
        presenceList[existingIndex] = presence;
      } else {
        presenceList.push(presence);
      }
      
      this.presenceData.set(sessionId, presenceList);

      // Notify all subscribers
      subscribers.forEach(callback => {
        try {
          callback(presenceList);
        } catch (error) {
          logger.error('Error in presence subscriber callback', { error, sessionId });
        }
      });
    });
  }

  /**
   * Subscribe to changes in a session
   */
  public async subscribeToChanges(sessionId: string, callback: (change: CollaborationChange) => void): Promise<void> {
    subscribers.push(callback);
    this.changeSubscribers.set(sessionId, subscribers);
  }

  /**
   * Subscribe to presence updates in a session
   */
  public async subscribeToPresence(sessionId: string, callback: (presence: RealtimePresence[]) => void): Promise<void> {
    subscribers.push(callback);
    this.presenceSubscribers.set(sessionId, subscribers);
  }

  /**
   * Detect conflicts between changes
   */
  public async detectConflicts(changes: CollaborationChange[]): Promise<CollaborationConflict[]> {
    return this.executeOperation('detectConflicts', async () => {
      const conflicts: CollaborationConflict[] = [];
        now.getTime() - change.timestamp.getTime() < 30000 // 30 seconds
      );

      // Group changes by target (nodeId, property, etc.)
      
      recentChanges.forEach(change => {
        group.push(change);
        changeGroups.set(key, group);
      });

      // Check for conflicts in each group
      changeGroups.forEach((groupChanges, key) => {
        if (groupChanges.length > 1) {
          
          if (userIds.length > 1) {
            // Multiple users editing the same thing
            const conflict: CollaborationConflict = {
              id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              workflowId: groupChanges[0].sessionId,
              changeIds: groupChanges.map(c => c.id),
              type: this.determineConflictType(groupChanges),
              description: `Multiple users edited ${key} simultaneously`,
              users: userIds.map(id => {
                return { id, name: change.userName };
              }),
              autoResolvable: this.isAutoResolvable(groupChanges),
              createdAt: now
            };

            conflicts.push(conflict);
          }
        }
      });

      return conflicts;
    });
  }

  private determineConflictType(changes: CollaborationChange[]): ConflictType {
    
    if (types.includes('node_moved')) return 'move_collision';
    if (types.includes('node_removed')) return 'delete_reference';
    if (types.some(t => t.includes('updated'))) return 'property_collision';
    
    return 'concurrent_edit';
  }

  private isAutoResolvable(changes: CollaborationChange[]): boolean {
    // Simple heuristic - cursor movements and selections are auto-resolvable
    const autoResolvableTypes: ChangeType[] = ['cursor_moved', 'selection_changed'];
    return changes.every(c => autoResolvableTypes.includes(c.type));
  }

  /**
   * Resolve a collaboration conflict
   */
  public async resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void> {
    return this.executeOperation('resolveConflict', async () => {
      for (const [workflowId, workflowConflicts] of this.conflicts.entries()) {
        
        if (conflictIndex >= 0) {
          conflict.resolution = resolution;
          conflict.resolvedAt = new Date();
          
          // Mark conflicted changes as resolved
          for (const session of this.activeSessions.values()) {
            if (session.workflowId === workflowId) {
              session.changes.forEach(change => {
                if (conflict.changeIds.includes(change.id)) {
                  change.conflicted = false;
                }
              });
            }
          }
          
          logger.info('Conflict resolved', { conflictId, strategy: resolution.strategy });
          return;
        }
      }
      
      throw new Error(`Conflict ${conflictId} not found`);
    });
  }

  /**
   * Add a collaborator to a workflow
   */
  public async addCollaborator(workflowId: string, collaborator: Omit<WorkflowCollaborator, 'id'>): Promise<WorkflowCollaborator> {
    return this.executeOperation('addCollaborator', async () => {
      const newCollaborator: WorkflowCollaborator = {
        ...collaborator,
        id: `collab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      
      // Check if user is already a collaborator
      if (existingIndex >= 0) {
        throw new Error('User is already a collaborator');
      }

      collaborators.push(newCollaborator);
      this.workflowCollaborators.set(workflowId, collaborators);

      logger.info('Collaborator added', { workflowId, userId: collaborator.userId, role: collaborator.role });
      return newCollaborator;
    });
  }

  /**
   * Remove a collaborator from a workflow
   */
  public async removeCollaborator(workflowId: string, userId: string): Promise<void> {
    return this.executeOperation('removeCollaborator', async () => {
      
      if (updatedCollaborators.length === collaborators.length) {
        throw new Error('Collaborator not found');
      }

      this.workflowCollaborators.set(workflowId, updatedCollaborators);
      
      logger.info('Collaborator removed', { workflowId, userId });
    });
  }

  /**
   * Update collaborator role
   */
  public async updateCollaboratorRole(workflowId: string, userId: string, role: CollaborationRole): Promise<void> {
    return this.executeOperation('updateCollaboratorRole', async () => {
      
      if (!collaborator) {
        throw new Error('Collaborator not found');
      }

      collaborator.role = role;
      
      // Update permissions based on role
      switch (role) {
        case 'owner':
          collaborator.permissions = ['read', 'write', 'execute', 'share', 'manage_users', 'delete', 'export', 'view_credentials', 'manage_credentials', 'view_executions', 'view_analytics'];
          break;
        case 'admin':
          collaborator.permissions = ['read', 'write', 'execute', 'share', 'manage_users', 'export', 'view_executions', 'view_analytics'];
          break;
        case 'editor':
          collaborator.permissions = ['read', 'write', 'execute', 'view_executions'];
          break;
        case 'viewer':
          collaborator.permissions = ['read'];
          break;
        case 'commenter':
          collaborator.permissions = ['read'];
          break;
      }

      logger.info('Collaborator role updated', { workflowId, userId, role });
    });
  }

  /**
   * Get all collaborators for a workflow
   */
  public async getCollaborators(workflowId: string): Promise<WorkflowCollaborator[]> {
    return this.workflowCollaborators.get(workflowId) || [];
  }

  /**
   * Create a share link for a workflow
   */
  public async createShare(workflowId: string, shareConfig: Omit<WorkflowShare, 'id' | 'accessCount'>): Promise<WorkflowShare> {
    return this.executeOperation('createShare', async () => {
      const share: WorkflowShare = {
        ...shareConfig,
        id: `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        accessCount: 0
      };

      shares.push(share);
      this.workflowShares.set(workflowId, shares);

      logger.info('Workflow share created', { workflowId, shareId: share.id, shareType: share.shareType });
      return share;
    });
  }

  /**
   * Get a share by ID
   */
  public async getShare(shareId: string): Promise<WorkflowShare | null> {
    for (const shares of this.workflowShares.values()) {
      if (share) {
        // Check if share is expired
        if (share.expiresAt && new Date() > share.expiresAt) {
          return null;
        }
        
        // Check access limits
        if (share.maxAccess && share.accessCount >= share.maxAccess) {
          return null;
        }
        
        return share;
      }
    }
    return null;
  }

  /**
   * Update a share
   */
  public async updateShare(shareId: string, updates: Partial<WorkflowShare>): Promise<void> {
    return this.executeOperation('updateShare', async () => {
      for (const shares of this.workflowShares.values()) {
        if (share) {
          Object.assign(share, updates);
          logger.info('Workflow share updated', { shareId, updates });
          return;
        }
      }
      throw new Error(`Share ${shareId} not found`);
    });
  }

  /**
   * Revoke a share
   */
  public async revokeShare(shareId: string): Promise<void> {
    return this.executeOperation('revokeShare', async () => {
      for (const [workflowId, shares] of this.workflowShares.entries()) {
        if (updatedShares.length !== shares.length) {
          this.workflowShares.set(workflowId, updatedShares);
          logger.info('Workflow share revoked', { shareId });
          return;
        }
      }
      throw new Error(`Share ${shareId} not found`);
    });
  }

  /**
   * Add a comment to a workflow
   */
  public async addComment(comment: Omit<WorkflowComment, 'id' | 'createdAt'>): Promise<WorkflowComment> {
    return this.executeOperation('addComment', async () => {
      const newComment: WorkflowComment = {
        ...comment,
        id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date()
      };

      comments.push(newComment);
      this.workflowComments.set(comment.workflowId, comments);

      logger.info('Comment added', { workflowId: comment.workflowId, commentId: newComment.id });
      return newComment;
    });
  }

  /**
   * Update a comment
   */
  public async updateComment(commentId: string, content: string): Promise<void> {
    return this.executeOperation('updateComment', async () => {
      for (const comments of this.workflowComments.values()) {
        if (comment) {
          comment.content = content;
          comment.updatedAt = new Date();
          logger.info('Comment updated', { commentId });
          return;
        }
      }
      throw new Error(`Comment ${commentId} not found`);
    });
  }

  /**
   * Delete a comment
   */
  public async deleteComment(commentId: string): Promise<void> {
    return this.executeOperation('deleteComment', async () => {
      for (const [workflowId, comments] of this.workflowComments.entries()) {
        if (updatedComments.length !== comments.length) {
          this.workflowComments.set(workflowId, updatedComments);
          logger.info('Comment deleted', { commentId });
          return;
        }
      }
      throw new Error(`Comment ${commentId} not found`);
    });
  }

  /**
   * Resolve a comment
   */
  public async resolveComment(commentId: string, userId: string): Promise<void> {
    return this.executeOperation('resolveComment', async () => {
      for (const comments of this.workflowComments.values()) {
        if (comment) {
          comment.isResolved = true;
          comment.resolvedBy = userId;
          comment.resolvedAt = new Date();
          logger.info('Comment resolved', { commentId, userId });
          return;
        }
      }
      throw new Error(`Comment ${commentId} not found`);
    });
  }

  /**
   * Get comments for a workflow
   */
  public async getComments(workflowId: string, nodeId?: string): Promise<WorkflowComment[]> {
    
    if (nodeId) {
      return comments.filter(c => c.nodeId === nodeId);
    }
    
    return comments;
  }

  /**
   * Get collaboration analytics for a workflow
   */
  public async getCollaborationAnalytics(workflowId: string, timeRange: { start: Date; end: Date }): Promise<CollaborationAnalytics> {
    return this.executeOperation('getCollaborationAnalytics', async () => {
      
      // Get changes from all sessions for this workflow
      const allChanges: CollaborationChange[] = [];
      for (const session of this.activeSessions.values()) {
        if (session.workflowId === workflowId) {
          allChanges.push(...session.changes.filter(c => 
            c.timestamp >= timeRange.start && c.timestamp <= timeRange.end
          ));
        }
      }

      const analytics: CollaborationAnalytics = {
        workflowId,
        timeRange,
        metrics: {
          totalCollaborators: collaborators.length,
          activeCollaborators: collaborators.filter(c => c.status === 'online').length,
          totalChanges: allChanges.length,
          conflictsResolved: (this.conflicts.get(workflowId) || []).filter(c => c.resolvedAt).length,
          averageResolutionTime: this.calculateAverageResolutionTime(workflowId),
          commentsCount: comments.length,
          sharesCount: shares.length,
          versionCount: 1 // Would be calculated from version control system
        },
        collaboratorActivity: collaborators.map(collaborator => ({
          userId: collaborator.userId,
          userName: collaborator.userName,
          changesCount: allChanges.filter(c => c.userId === collaborator.userId).length,
          commentsCount: comments.filter(c => c.authorId === collaborator.userId).length,
          lastActivity: collaborator.lastSeen,
          activeDays: this.calculateActiveDays(collaborator.userId, allChanges, timeRange)
        })),
        changesByType: this.aggregateChangesByType(allChanges),
        activityTimeline: this.generateActivityTimeline(allChanges, comments, timeRange)
      };

      return analytics;
    });
  }

  private calculateAverageResolutionTime(workflowId: string): number {
    
    if (resolvedConflicts.length === 0) return 0;
    
      return sum + (conflict.resolvedAt!.getTime() - conflict.createdAt.getTime());
    }, 0);
    
    return totalTime / resolvedConflicts.length;
  }

  private calculateActiveDays(userId: string, changes: CollaborationChange[], timeRange: { start: Date; end: Date }): number {
      userChanges.map(c => c.timestamp.toDateString())
    );
    return uniqueDays.size;
  }

  private aggregateChangesByType(changes: CollaborationChange[]): Record<ChangeType, number> {
    const aggregation: Partial<Record<ChangeType, number>> = {};
    
    changes.forEach(change => {
      aggregation[change.type] = (aggregation[change.type] || 0) + 1;
    });
    
    return aggregation as Record<ChangeType, number>;
  }

  private generateActivityTimeline(
    changes: CollaborationChange[], 
    comments: WorkflowComment[], 
    timeRange: { start: Date; end: Date }
  ): Array<{ date: string; changes: number; comments: number; conflicts: number }> {
    const timeline: Record<string, { changes: number; comments: number; conflicts: number }> = {};
    
    // Initialize timeline
    while (current <= timeRange.end) {
      timeline[dateKey] = { changes: 0, comments: 0, conflicts: 0 };
      current.setDate(current.getDate() + 1);
    }
    
    // Aggregate changes
    changes.forEach(change => {
      if (timeline[dateKey]) {
        timeline[dateKey].changes++;
        if (change.conflicted) {
          timeline[dateKey].conflicts++;
        }
      }
    });
    
    // Aggregate comments
    comments.forEach(comment => {
      if (timeline[dateKey]) {
        timeline[dateKey].comments++;
      }
    });
    
    return Object.entries(timeline).map(([date, data]) => ({
      date,
      ...data
    }));
  }
}

// Export singleton instance
export const collaborationService = new CollaborationService();
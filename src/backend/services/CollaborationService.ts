/**
 * Collaboration Service
 * Manages real-time collaboration, presence tracking, and conflict resolution
 *
 * Features:
 * - Real-time presence and cursor tracking
 * - Operational Transformation (OT) for conflict resolution
 * - Node locking mechanism
 * - Comment system with threads and mentions
 * - Permission management
 * - Activity tracking
 */

import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';
import { getWebSocketServer } from '../websocket/WebSocketServer';
import type {
  CollaborationSession,
  CollaborationChange,
  RealtimePresence,
  WorkflowCollaborator,
  WorkflowComment,
  CollaborationConflict,
  ConflictResolution,
  ChangeType,
  CollaborationRole,
  CollaborationPermission
} from '../../types/collaboration';

interface NodeLock {
  nodeId: string;
  userId: string;
  userName: string;
  acquiredAt: Date;
  expiresAt: Date;
}

interface OperationTransform {
  id: string;
  operation: CollaborationChange;
  dependencies: string[];
  version: number;
  transformed: boolean;
}

export class CollaborationService extends EventEmitter {
  private sessions = new Map<string, CollaborationSession>();
  private presenceByWorkflow = new Map<string, Map<string, RealtimePresence>>();
  private nodeLocks = new Map<string, NodeLock>();
  private operationBuffer = new Map<string, OperationTransform[]>();
  private versionVectors = new Map<string, Map<string, number>>();
  private comments = new Map<string, WorkflowComment[]>();
  private collaborators = new Map<string, WorkflowCollaborator[]>();

  private lockTimeout = 30000; // 30 seconds
  private presenceTimeout = 60000; // 1 minute
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    super();
    this.setMaxListeners(1000);

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredLocks();
      this.cleanupInactivePresence();
    }, 10000); // Every 10 seconds

    // Subscribe to WebSocket events
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.on('message', this.handleWebSocketMessage.bind(this));
      wsServer.on('disconnect', this.handleClientDisconnect.bind(this));
    }

    logger.info('CollaborationService initialized');
  }

  /**
   * Create a collaboration session for a workflow
   */
  async createSession(workflowId: string, userId: string): Promise<CollaborationSession> {
    let session = this.sessions.get(workflowId);

    if (!session) {
      session = {
        id: this.generateId('session'),
        workflowId,
        participants: [],
        createdAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
        changes: []
      };

      this.sessions.set(workflowId, session);
      this.presenceByWorkflow.set(workflowId, new Map());
      this.operationBuffer.set(workflowId, []);
      this.versionVectors.set(workflowId, new Map());

      logger.info('Collaboration session created', { workflowId, sessionId: session.id });
    }

    return session;
  }

  /**
   * Join a collaboration session
   */
  async joinSession(sessionId: string, userId: string, userName: string, role: CollaborationRole): Promise<void> {
    const session = Array.from(this.sessions.values()).find(s => s.id === sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add to participants if not already present
    const existing = session.participants.find(p => p.userId === userId);
    if (!existing) {
      const participant: WorkflowCollaborator = {
        id: this.generateId('collaborator'),
        userId,
        userName,
        userEmail: `${userId}@example.com`, // Should come from user service
        role,
        permissions: this.getRolePermissions(role),
        status: 'online',
        lastSeen: new Date(),
        invitedBy: 'system',
        invitedAt: new Date(),
        acceptedAt: new Date()
      };

      session.participants.push(participant);
    } else {
      existing.status = 'online';
      existing.lastSeen = new Date();
    }

    session.lastActivity = new Date();

    // Initialize presence
    const presenceMap = this.presenceByWorkflow.get(session.workflowId);
    if (presenceMap) {
      presenceMap.set(userId, {
        userId,
        userName,
        isActive: true,
        lastActivity: new Date()
      });
    }

    // Broadcast join event
    this.broadcastToSession(session.workflowId, 'collaboration:user-joined', {
      userId,
      userName,
      role
    });

    logger.info('User joined collaboration session', {
      sessionId,
      userId,
      workflowId: session.workflowId
    });
  }

  /**
   * Leave a collaboration session
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const session = Array.from(this.sessions.values()).find(s => s.id === sessionId);
    if (!session) return;

    const participant = session.participants.find(p => p.userId === userId);
    if (participant) {
      participant.status = 'offline';
      participant.lastSeen = new Date();
    }

    // Remove presence
    const presenceMap = this.presenceByWorkflow.get(session.workflowId);
    if (presenceMap) {
      presenceMap.delete(userId);
    }

    // Release all locks held by user
    this.releaseUserLocks(userId);

    // Broadcast leave event
    this.broadcastToSession(session.workflowId, 'collaboration:user-left', {
      userId
    });

    logger.info('User left collaboration session', {
      sessionId,
      userId,
      workflowId: session.workflowId
    });
  }

  /**
   * Update user presence (cursor, selection, viewport)
   */
  async updatePresence(workflowId: string, userId: string, presence: Partial<RealtimePresence>): Promise<void> {
    const presenceMap = this.presenceByWorkflow.get(workflowId);
    if (!presenceMap) return;

    const current = presenceMap.get(userId) || {
      userId,
      userName: presence.userName || 'Unknown',
      isActive: true,
      lastActivity: new Date()
    };

    const updated: RealtimePresence = {
      ...current,
      ...presence,
      lastActivity: new Date()
    };

    presenceMap.set(userId, updated);

    // Broadcast presence update (throttled on client side)
    this.broadcastToSession(workflowId, 'collaboration:presence-update', {
      userId,
      presence: updated
    }, [userId]); // Exclude sender
  }

  /**
   * Get all active presence for a workflow
   */
  async getPresence(workflowId: string): Promise<RealtimePresence[]> {
    const presenceMap = this.presenceByWorkflow.get(workflowId);
    if (!presenceMap) return [];

    return Array.from(presenceMap.values()).filter(p => p.isActive);
  }

  /**
   * Apply a change with Operational Transformation
   */
  async applyChange(
    workflowId: string,
    userId: string,
    change: Omit<CollaborationChange, 'id' | 'timestamp' | 'applied'>
  ): Promise<CollaborationChange> {
    const session = this.sessions.get(workflowId);
    if (!session) {
      throw new Error('No active session for workflow');
    }

    // Create change object
    const fullChange: CollaborationChange = {
      id: this.generateId('change'),
      ...change,
      timestamp: new Date(),
      applied: false
    };

    // Check for node lock if editing a node
    if (change.data.nodeId && this.isNodeEditable(change.type)) {
      const lock = this.nodeLocks.get(change.data.nodeId);
      if (lock && lock.userId !== userId) {
        throw new Error(`Node is locked by ${lock.userName}`);
      }
    }

    // Add to operation buffer for OT
    const buffer = this.operationBuffer.get(workflowId) || [];
    const version = this.getNextVersion(workflowId, userId);

    const operation: OperationTransform = {
      id: fullChange.id,
      operation: fullChange,
      dependencies: this.getDependencies(workflowId, userId),
      version,
      transformed: false
    };

    buffer.push(operation);
    this.operationBuffer.set(workflowId, buffer);

    // Perform operational transformation
    const transformed = await this.transformOperation(workflowId, operation);

    if (transformed) {
      // Mark as applied
      fullChange.applied = true;
      session.changes.push(fullChange);
      session.lastActivity = new Date();

      // Update version vector
      this.updateVersionVector(workflowId, userId, version);

      // Broadcast change to all participants
      this.broadcastToSession(workflowId, 'collaboration:change', {
        change: fullChange,
        version
      }, [userId]); // Exclude sender

      logger.debug('Change applied', {
        workflowId,
        changeId: fullChange.id,
        type: change.type
      });

      this.emit('change-applied', fullChange);
    }

    return fullChange;
  }

  /**
   * Acquire a lock on a node
   */
  async acquireNodeLock(nodeId: string, userId: string, userName: string): Promise<boolean> {
    const existing = this.nodeLocks.get(nodeId);

    // Check if already locked by another user
    if (existing && existing.userId !== userId) {
      const now = Date.now();
      if (now < existing.expiresAt.getTime()) {
        return false; // Lock still valid
      }
      // Lock expired, can acquire
    }

    const lock: NodeLock = {
      nodeId,
      userId,
      userName,
      acquiredAt: new Date(),
      expiresAt: new Date(Date.now() + this.lockTimeout)
    };

    this.nodeLocks.set(nodeId, lock);

    logger.debug('Node lock acquired', { nodeId, userId, userName });

    return true;
  }

  /**
   * Release a node lock
   */
  async releaseNodeLock(nodeId: string, userId: string): Promise<void> {
    const lock = this.nodeLocks.get(nodeId);

    if (lock && lock.userId === userId) {
      this.nodeLocks.delete(nodeId);
      logger.debug('Node lock released', { nodeId, userId });
    }
  }

  /**
   * Check if node is locked
   * When userId is provided, returns true only if locked by someone OTHER than that user
   * When userId is not provided, returns false (no user context to check against)
   */
  isNodeLocked(nodeId: string, userId?: string): boolean {
    const lock = this.nodeLocks.get(nodeId);
    if (!lock) return false;

    const now = Date.now();
    if (now >= lock.expiresAt.getTime()) {
      this.nodeLocks.delete(nodeId);
      return false;
    }

    // If no userId provided, we can't determine if it's locked "for" anyone
    // Return false since we have no user context to check against
    if (!userId) {
      return false;
    }

    if (lock.userId === userId) {
      return false; // User owns the lock
    }

    return true;
  }

  /**
   * Get node lock info
   */
  getNodeLock(nodeId: string): NodeLock | null {
    const lock = this.nodeLocks.get(nodeId);
    if (!lock) return null;

    const now = Date.now();
    if (now >= lock.expiresAt.getTime()) {
      this.nodeLocks.delete(nodeId);
      return null;
    }

    return lock;
  }

  /**
   * Add a comment
   */
  async addComment(
    workflowId: string,
    comment: Omit<WorkflowComment, 'id' | 'createdAt' | 'replies' | 'reactions'>
  ): Promise<WorkflowComment> {
    const fullComment: WorkflowComment = {
      id: this.generateId('comment'),
      ...comment,
      createdAt: new Date(),
      replies: [],
      reactions: []
    };

    const workflowComments = this.comments.get(workflowId) || [];
    workflowComments.push(fullComment);
    this.comments.set(workflowId, workflowComments);

    // Broadcast new comment
    this.broadcastToSession(workflowId, 'collaboration:comment-added', {
      comment: fullComment
    });

    // Notify mentioned users
    if (fullComment.mentions.length > 0) {
      this.notifyMentionedUsers(workflowId, fullComment);
    }

    logger.info('Comment added', {
      workflowId,
      commentId: fullComment.id,
      mentions: fullComment.mentions.length
    });

    return fullComment;
  }

  /**
   * Get comments for a workflow or node
   */
  async getComments(workflowId: string, nodeId?: string): Promise<WorkflowComment[]> {
    const workflowComments = this.comments.get(workflowId) || [];

    if (nodeId) {
      return workflowComments.filter(c => c.nodeId === nodeId);
    }

    return workflowComments;
  }

  /**
   * Resolve a comment
   */
  async resolveComment(commentId: string, userId: string, userName: string): Promise<void> {
    for (const [workflowId, comments] of this.comments.entries()) {
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
        comment.isResolved = true;
        comment.resolvedBy = userId;
        comment.resolvedAt = new Date();

        this.broadcastToSession(workflowId, 'collaboration:comment-resolved', {
          commentId,
          resolvedBy: userId,
          userName
        });

        logger.info('Comment resolved', { workflowId, commentId, userId });
        break;
      }
    }
  }

  /**
   * Detect conflicts between changes
   */
  async detectConflicts(workflowId: string, changes: CollaborationChange[]): Promise<CollaborationConflict[]> {
    const conflicts: CollaborationConflict[] = [];

    // Group changes by node AND property for proper conflict detection
    const changesByNodeAndProperty = new Map<string, CollaborationChange[]>();
    for (const change of changes) {
      if (change.data.nodeId && change.data.property) {
        const key = `${change.data.nodeId}:${change.data.property}`;
        const nodePropertyChanges = changesByNodeAndProperty.get(key) || [];
        nodePropertyChanges.push(change);
        changesByNodeAndProperty.set(key, nodePropertyChanges);
      }
    }

    // Check for concurrent edits on same node AND same property
    for (const [nodePropertyKey, nodePropertyChanges] of changesByNodeAndProperty.entries()) {
      if (nodePropertyChanges.length > 1) {
        // Check if changes are from different users
        const userChanges = new Map<string, CollaborationChange[]>();
        for (const change of nodePropertyChanges) {
          const userChangesArr = userChanges.get(change.userId) || [];
          userChangesArr.push(change);
          userChanges.set(change.userId, userChangesArr);
        }

        // Only report conflict if multiple users edited the SAME property
        if (userChanges.size > 1) {
          const nodeId = nodePropertyChanges[0].data.nodeId;
          const property = nodePropertyChanges[0].data.property;
          const conflict: CollaborationConflict = {
            id: this.generateId('conflict'),
            workflowId,
            changeIds: nodePropertyChanges.map(c => c.id),
            type: 'concurrent_edit',
            description: `Multiple users edited property '${property}' of node ${nodeId} simultaneously`,
            users: Array.from(userChanges.keys()).map(userId => ({
              id: userId,
              name: nodePropertyChanges.find(c => c.userId === userId)?.userName || 'Unknown'
            })),
            autoResolvable: this.canAutoResolve(nodePropertyChanges),
            createdAt: new Date()
          };

          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  /**
   * Operational Transformation - transform operation against concurrent operations
   */
  private async transformOperation(
    workflowId: string,
    operation: OperationTransform
  ): Promise<boolean> {
    const buffer = this.operationBuffer.get(workflowId) || [];
    const concurrent = buffer.filter(op =>
      !operation.dependencies.includes(op.id) &&
      op.id !== operation.id &&
      !op.transformed
    );

    if (concurrent.length === 0) {
      operation.transformed = true;
      return true;
    }

    // Transform against concurrent operations
    for (const concOp of concurrent) {
      const transformed = this.transform(operation.operation, concOp.operation);
      if (transformed) {
        operation.operation = transformed;
      }
    }

    operation.transformed = true;
    return true;
  }

  /**
   * Transform two operations (simplified OT algorithm)
   */
  private transform(op1: CollaborationChange, op2: CollaborationChange): CollaborationChange | null {
    // Same node edits - handle property conflicts
    if (op1.data.nodeId === op2.data.nodeId && op1.data.property === op2.data.property) {
      // Last-write-wins for same property
      if (op1.timestamp > op2.timestamp) {
        return op1;
      }
      return null; // Op2 wins, discard op1
    }

    // Position conflicts - adjust positions
    if (op1.type === 'node_moved' && op2.type === 'node_moved') {
      // Check if nodes would overlap
      // Simplified: just apply both moves
      return op1;
    }

    // Delete/reference conflicts
    if (op1.type === 'node_removed' && op2.type === 'node_updated') {
      if (op1.data.nodeId === op2.data.nodeId) {
        // Node was deleted, ignore update
        return null;
      }
    }

    // No conflict, apply as-is
    return op1;
  }

  /**
   * Check if changes can be auto-resolved
   */
  private canAutoResolve(changes: CollaborationChange[]): boolean {
    // Check if all changes are on different properties
    const properties = new Set(changes.map(c => c.data.property));
    return properties.size === changes.length;
  }

  /**
   * Get operation dependencies for a user
   */
  private getDependencies(workflowId: string, userId: string): string[] {
    const buffer = this.operationBuffer.get(workflowId) || [];
    return buffer
      .filter(op => op.operation.userId !== userId)
      .map(op => op.id);
  }

  /**
   * Get next version number for user
   */
  private getNextVersion(workflowId: string, userId: string): number {
    const versionVector = this.versionVectors.get(workflowId) || new Map();
    const current = versionVector.get(userId) || 0;
    return current + 1;
  }

  /**
   * Update version vector
   */
  private updateVersionVector(workflowId: string, userId: string, version: number): void {
    const versionVector = this.versionVectors.get(workflowId) || new Map();
    versionVector.set(userId, version);
    this.versionVectors.set(workflowId, versionVector);
  }

  /**
   * Check if change type affects node editing
   */
  private isNodeEditable(type: ChangeType): boolean {
    return ['node_updated', 'node_moved'].includes(type);
  }

  /**
   * Broadcast message to all session participants
   */
  private broadcastToSession(
    workflowId: string,
    type: string,
    data: unknown,
    exclude: string[] = []
  ): void {
    const wsServer = getWebSocketServer();
    if (!wsServer) return;

    const roomId = `workflow:${workflowId}`;
    wsServer.broadcast({
      id: this.generateId('msg'),
      type,
      data,
      timestamp: new Date()
    }, {
      room: roomId,
      exclude
    });
  }

  /**
   * Handle WebSocket messages
   */
  private async handleWebSocketMessage(client: any, message: any): Promise<void> {
    try {
      switch (message.type) {
        case 'collaboration:join':
          await this.handleJoinMessage(client, message);
          break;
        case 'collaboration:leave':
          await this.handleLeaveMessage(client, message);
          break;
        case 'collaboration:presence':
          await this.handlePresenceMessage(client, message);
          break;
        case 'collaboration:change':
          await this.handleChangeMessage(client, message);
          break;
        case 'collaboration:lock':
          await this.handleLockMessage(client, message);
          break;
        case 'collaboration:unlock':
          await this.handleUnlockMessage(client, message);
          break;
      }
    } catch (error) {
      logger.error('Error handling collaboration message', { error, type: message.type });
    }
  }

  /**
   * Handle client disconnect
   */
  private async handleClientDisconnect(client: any): Promise<void> {
    if (!client.userId) return;

    // Leave all sessions
    for (const session of this.sessions.values()) {
      await this.leaveSession(session.id, client.userId);
    }
  }

  /**
   * Handle join message
   */
  private async handleJoinMessage(client: any, message: any): Promise<void> {
    const { workflowId, userName, role } = message.data;
    const session = await this.createSession(workflowId, client.userId);
    await this.joinSession(session.id, client.userId, userName, role || 'editor');

    // Join WebSocket room - using public sendToClient API instead of private handleJoinRoom
    const roomId = `workflow:${workflowId}`;
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.sendToClient(client, {
        id: this.generateId('msg'),
        type: 'join.success',
        data: { roomId },
        correlationId: message.id,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle leave message
   */
  private async handleLeaveMessage(client: any, message: any): Promise<void> {
    const { sessionId } = message.data;
    await this.leaveSession(sessionId, client.userId);
  }

  /**
   * Handle presence message
   */
  private async handlePresenceMessage(client: any, message: any): Promise<void> {
    const { workflowId, presence } = message.data;
    await this.updatePresence(workflowId, client.userId, presence);
  }

  /**
   * Handle change message
   */
  private async handleChangeMessage(client: any, message: any): Promise<void> {
    const { workflowId, change } = message.data;
    await this.applyChange(workflowId, client.userId, change);
  }

  /**
   * Handle lock message
   */
  private async handleLockMessage(client: any, message: any): Promise<void> {
    const { nodeId, userName } = message.data;
    const locked = await this.acquireNodeLock(nodeId, client.userId, userName);

    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.sendToClient(client, {
        id: this.generateId('msg'),
        type: locked ? 'collaboration:lock-acquired' : 'collaboration:lock-denied',
        data: { nodeId, userId: client.userId },
        correlationId: message.id,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle unlock message
   */
  private async handleUnlockMessage(client: any, message: any): Promise<void> {
    const { nodeId } = message.data;
    await this.releaseNodeLock(nodeId, client.userId);
  }

  /**
   * Notify mentioned users
   */
  private notifyMentionedUsers(workflowId: string, comment: WorkflowComment): void {
    this.broadcastToSession(workflowId, 'collaboration:mention', {
      commentId: comment.id,
      authorName: comment.authorName,
      content: comment.content,
      mentions: comment.mentions,
      nodeId: comment.nodeId
    });
  }

  /**
   * Cleanup expired locks
   */
  private cleanupExpiredLocks(): void {
    const now = Date.now();
    for (const [nodeId, lock] of this.nodeLocks.entries()) {
      if (now >= lock.expiresAt.getTime()) {
        this.nodeLocks.delete(nodeId);
        logger.debug('Expired lock cleaned up', { nodeId });
      }
    }
  }

  /**
   * Cleanup inactive presence
   */
  private cleanupInactivePresence(): void {
    const now = Date.now();
    for (const [workflowId, presenceMap] of this.presenceByWorkflow.entries()) {
      for (const [userId, presence] of presenceMap.entries()) {
        if (now - presence.lastActivity.getTime() > this.presenceTimeout) {
          presenceMap.delete(userId);
          this.broadcastToSession(workflowId, 'collaboration:user-inactive', { userId });
          logger.debug('Inactive presence cleaned up', { workflowId, userId });
        }
      }
    }
  }

  /**
   * Release all locks held by a user
   */
  private releaseUserLocks(userId: string): void {
    for (const [nodeId, lock] of this.nodeLocks.entries()) {
      if (lock.userId === userId) {
        this.nodeLocks.delete(nodeId);
        logger.debug('User lock released on disconnect', { nodeId, userId });
      }
    }
  }

  /**
   * Get role permissions
   */
  private getRolePermissions(role: CollaborationRole): CollaborationPermission[] {
    const permissionMap: Record<CollaborationRole, CollaborationPermission[]> = {
      owner: ['read', 'write', 'execute', 'share', 'manage_users', 'delete', 'export',
              'view_credentials', 'manage_credentials', 'view_executions', 'view_analytics'],
      admin: ['read', 'write', 'execute', 'share', 'manage_users', 'export',
              'view_credentials', 'view_executions', 'view_analytics'],
      editor: ['read', 'write', 'execute', 'view_executions'],
      viewer: ['read', 'view_executions'],
      commenter: ['read']
    };

    return permissionMap[role] || [];
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      activeSessions: this.sessions.size,
      totalPresence: Array.from(this.presenceByWorkflow.values())
        .reduce((sum, map) => sum + map.size, 0),
      activeLocks: this.nodeLocks.size,
      totalComments: Array.from(this.comments.values())
        .reduce((sum, comments) => sum + comments.length, 0),
      pendingOperations: Array.from(this.operationBuffer.values())
        .reduce((sum, buffer) => sum + buffer.length, 0)
    };
  }

  /**
   * Shutdown service
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.sessions.clear();
    this.presenceByWorkflow.clear();
    this.nodeLocks.clear();
    this.operationBuffer.clear();
    this.versionVectors.clear();
    this.comments.clear();
    this.collaborators.clear();

    this.removeAllListeners();
    logger.info('CollaborationService shutdown complete');
  }
}

// Singleton instance
let collaborationService: CollaborationService | null = null;

export function getCollaborationService(): CollaborationService {
  if (!collaborationService) {
    collaborationService = new CollaborationService();
  }
  return collaborationService;
}

export function initializeCollaborationService(): CollaborationService {
  if (!collaborationService) {
    collaborationService = new CollaborationService();
  }
  return collaborationService;
}

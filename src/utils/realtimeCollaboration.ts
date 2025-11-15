/**
 * Real-time Collaboration System
 * WebSocket-based multi-user collaboration for workflows
 */

export interface CollaborationSession {
  id: string;
  workflowId: string;
  participants: Participant[];
  createdAt: string;
  lastActivity: string;
}

export interface Participant {
  userId: string;
  userName: string;
  userColor: string;
  cursor?: {
    x: number;
    y: number;
  };
  selection?: {
    nodeIds: string[];
  };
  isActive: boolean;
  joinedAt: string;
  lastSeen: string;
}

export interface CollaborationEvent {
  id: string;
  sessionId: string;
  userId: string;
  type: CollaborationEventType;
  data: any;
  timestamp: string;
}

export type CollaborationEventType =
  | 'user.joined'
  | 'user.left'
  | 'user.active'
  | 'user.idle'
  | 'cursor.move'
  | 'cursor.hide'
  | 'selection.change'
  | 'node.create'
  | 'node.update'
  | 'node.delete'
  | 'node.move'
  | 'edge.create'
  | 'edge.delete'
  | 'workflow.update'
  | 'comment.create'
  | 'comment.update'
  | 'comment.delete'
  | 'lock.acquire'
  | 'lock.release';

export interface Comment {
  id: string;
  workflowId: string;
  nodeId?: string;
  position?: { x: number; y: number };
  text: string;
  author: {
    userId: string;
    userName: string;
  };
  resolved: boolean;
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Lock {
  resourceType: 'node' | 'workflow' | 'settings';
  resourceId: string;
  userId: string;
  userName: string;
  acquiredAt: string;
  expiresAt: string;
}

class RealtimeCollaborationManager {
  private sessions: Map<string, CollaborationSession> = new Map();
  private comments: Map<string, Comment[]> = new Map(); // workflowId -> comments
  private locks: Map<string, Lock> = new Map(); // resourceId -> lock
  private eventHandlers: Map<CollaborationEventType, Set<(event: CollaborationEvent) => void>> = new Map();
  private websocket?: WebSocket;
  private heartbeatInterval?: NodeJS.Timeout;
  private lockCleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.loadFromStorage();
    this.startLockCleanup();
  }

  /**
   * Initialize WebSocket connection
   */
  connect(url: string, userId: string): void {
    this.websocket = new WebSocket(url);

    this.websocket.onopen = () => {
      console.log('Collaboration WebSocket connected');
      this.startHeartbeat();

      // Send user info
      this.send({
        type: 'auth',
        userId
      });
    };

    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleServerMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.websocket.onclose = () => {
      console.log('Collaboration WebSocket disconnected');
      this.stopHeartbeat();
    };

    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = undefined;
    }

    this.stopHeartbeat();
  }

  /**
   * Join collaboration session
   */
  joinSession(
    workflowId: string,
    userId: string,
    userName: string
  ): CollaborationSession {
    let session = Array.from(this.sessions.values()).find(
      s => s.workflowId === workflowId
    );

    if (!session) {
      session = {
        id: this.generateId(),
        workflowId,
        participants: [],
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      this.sessions.set(session.id, session);
    }

    // Add participant
    const participant: Participant = {
      userId,
      userName,
      userColor: this.generateUserColor(),
      isActive: true,
      joinedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    };

    session.participants.push(participant);
    session.lastActivity = new Date().toISOString();

    this.sessions.set(session.id, session);
    this.saveToStorage();

    // Broadcast join event
    this.broadcast(session.id, {
      type: 'user.joined',
      userId,
      data: { participant }
    });

    return session;
  }

  /**
   * Leave collaboration session
   */
  leaveSession(sessionId: string, userId: string): void {
    const session = this.sessions.get(sessionId);

    if (!session) return;

    // Remove participant
    session.participants = session.participants.filter(p => p.userId !== userId);
    session.lastActivity = new Date().toISOString();

    // If no participants left, delete session
    if (session.participants.length === 0) {
      this.sessions.delete(sessionId);
    } else {
      this.sessions.set(sessionId, session);
    }

    this.saveToStorage();

    // Broadcast leave event
    this.broadcast(sessionId, {
      type: 'user.left',
      userId,
      data: { userId }
    });

    // Release all locks held by user
    this.releaseUserLocks(userId);
  }

  /**
   * Update cursor position
   */
  updateCursor(sessionId: string, userId: string, x: number, y: number): void {
    const session = this.sessions.get(sessionId);

    if (!session) return;

    const participant = session.participants.find(p => p.userId === userId);

    if (participant) {
      participant.cursor = { x, y };
      participant.lastSeen = new Date().toISOString();
      session.lastActivity = new Date().toISOString();

      this.sessions.set(sessionId, session);

      // Broadcast cursor move
      this.broadcast(sessionId, {
        type: 'cursor.move',
        userId,
        data: { x, y }
      });
    }
  }

  /**
   * Update selection
   */
  updateSelection(sessionId: string, userId: string, nodeIds: string[]): void {
    const session = this.sessions.get(sessionId);

    if (!session) return;

    const participant = session.participants.find(p => p.userId === userId);

    if (participant) {
      participant.selection = { nodeIds };
      participant.lastSeen = new Date().toISOString();
      session.lastActivity = new Date().toISOString();

      this.sessions.set(sessionId, session);

      // Broadcast selection change
      this.broadcast(sessionId, {
        type: 'selection.change',
        userId,
        data: { nodeIds }
      });
    }
  }

  /**
   * Broadcast workflow change
   */
  broadcastChange(
    sessionId: string,
    userId: string,
    type: CollaborationEventType,
    data: any
  ): void {
    const session = this.sessions.get(sessionId);

    if (!session) return;

    session.lastActivity = new Date().toISOString();
    this.sessions.set(sessionId, session);

    this.broadcast(sessionId, {
      type,
      userId,
      data
    });
  }

  /**
   * Create comment
   */
  createComment(
    workflowId: string,
    text: string,
    author: { userId: string; userName: string },
    options?: {
      nodeId?: string;
      position?: { x: number; y: number };
    }
  ): Comment {
    const comment: Comment = {
      id: this.generateId(),
      workflowId,
      nodeId: options?.nodeId,
      position: options?.position,
      text,
      author,
      resolved: false,
      replies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const comments = this.comments.get(workflowId) || [];
    comments.push(comment);
    this.comments.set(workflowId, comments);
    this.saveToStorage();

    // Broadcast comment creation
    const session = this.getSessionByWorkflowId(workflowId);
    if (session) {
      this.broadcast(session.id, {
        type: 'comment.create',
        userId: author.userId,
        data: { comment }
      });
    }

    return comment;
  }

  /**
   * Update comment
   */
  updateComment(commentId: string, updates: Partial<Comment>): Comment {
    for (const [workflowId, comments] of this.comments) {
      const idx = comments.findIndex(c => c.id === commentId);

      if (idx >= 0) {
        comments[idx] = {
          ...comments[idx],
          ...updates,
          updatedAt: new Date().toISOString()
        };

        this.comments.set(workflowId, comments);
        this.saveToStorage();

        // Broadcast update
        const session = this.getSessionByWorkflowId(workflowId);
        if (session) {
          this.broadcast(session.id, {
            type: 'comment.update',
            userId: comments[idx].author.userId,
            data: { comment: comments[idx] }
          });
        }

        return comments[idx];
      }
    }

    throw new Error('Comment not found');
  }

  /**
   * Delete comment
   */
  deleteComment(commentId: string): void {
    for (const [workflowId, comments] of this.comments) {
      const filtered = comments.filter(c => c.id !== commentId);

      if (filtered.length !== comments.length) {
        this.comments.set(workflowId, filtered);
        this.saveToStorage();

        // Broadcast deletion
        const session = this.getSessionByWorkflowId(workflowId);
        if (session) {
          this.broadcast(session.id, {
            type: 'comment.delete',
            userId: 'system',
            data: { commentId }
          });
        }

        return;
      }
    }
  }

  /**
   * Get comments for workflow
   */
  getComments(workflowId: string, nodeId?: string): Comment[] {
    const comments = this.comments.get(workflowId) || [];

    if (nodeId) {
      return comments.filter(c => c.nodeId === nodeId);
    }

    return comments;
  }

  /**
   * Acquire lock
   */
  acquireLock(
    resourceType: Lock['resourceType'],
    resourceId: string,
    userId: string,
    userName: string,
    duration: number = 300000 // 5 minutes default
  ): Lock | null {
    const existing = this.locks.get(resourceId);

    // Check if already locked
    if (existing) {
      // Check if expired
      if (new Date(existing.expiresAt) > new Date()) {
        return null; // Still locked
      }
    }

    const lock: Lock = {
      resourceType,
      resourceId,
      userId,
      userName,
      acquiredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + duration).toISOString()
    };

    this.locks.set(resourceId, lock);

    // Broadcast lock acquisition
    const session = this.getSessionByUserId(userId);
    if (session) {
      this.broadcast(session.id, {
        type: 'lock.acquire',
        userId,
        data: { lock }
      });
    }

    return lock;
  }

  /**
   * Release lock
   */
  releaseLock(resourceId: string, userId: string): void {
    const lock = this.locks.get(resourceId);

    if (lock && lock.userId === userId) {
      this.locks.delete(resourceId);

      // Broadcast lock release
      const session = this.getSessionByUserId(userId);
      if (session) {
        this.broadcast(session.id, {
          type: 'lock.release',
          userId,
          data: { resourceId }
        });
      }
    }
  }

  /**
   * Release all locks held by user
   */
  private releaseUserLocks(userId: string): void {
    for (const [resourceId, lock] of this.locks) {
      if (lock.userId === userId) {
        this.locks.delete(resourceId);
      }
    }
  }

  /**
   * Check if resource is locked
   */
  isLocked(resourceId: string, userId?: string): boolean {
    const lock = this.locks.get(resourceId);

    if (!lock) return false;

    // Check if expired
    if (new Date(lock.expiresAt) <= new Date()) {
      this.locks.delete(resourceId);
      return false;
    }

    // If userId provided, check if locked by someone else
    if (userId) {
      return lock.userId !== userId;
    }

    return true;
  }

  /**
   * Start lock cleanup
   */
  private startLockCleanup(): void {
    this.lockCleanupInterval = setInterval(() => {
      const now = new Date();

      for (const [resourceId, lock] of this.locks) {
        if (new Date(lock.expiresAt) <= now) {
          this.locks.delete(resourceId);
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Broadcast event to session
   */
  private broadcast(
    sessionId: string,
    event: {
      type: CollaborationEventType;
      userId: string;
      data: any;
    }
  ): void {
    const fullEvent: CollaborationEvent = {
      id: this.generateId(),
      sessionId,
      userId: event.userId,
      type: event.type,
      data: event.data,
      timestamp: new Date().toISOString()
    };

    // Emit to event handlers
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(fullEvent));
    }

    // Send via WebSocket
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.send({
        type: 'broadcast',
        sessionId,
        event: fullEvent
      });
    }
  }

  /**
   * Send WebSocket message
   */
  private send(data: any): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(data));
    }
  }

  /**
   * Handle server message
   */
  private handleServerMessage(data: any): void {
    if (data.type === 'event') {
      const handlers = this.eventHandlers.get(data.event.type);
      if (handlers) {
        handlers.forEach(handler => handler(data.event));
      }
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  /**
   * Register event handler
   */
  on(type: CollaborationEventType, handler: (event: CollaborationEvent) => void): void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }

    this.eventHandlers.get(type)!.add(handler);
  }

  /**
   * Unregister event handler
   */
  off(type: CollaborationEventType, handler: (event: CollaborationEvent) => void): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Get session by workflow ID
   */
  private getSessionByWorkflowId(workflowId: string): CollaborationSession | undefined {
    return Array.from(this.sessions.values()).find(s => s.workflowId === workflowId);
  }

  /**
   * Get session by user ID
   */
  private getSessionByUserId(userId: string): CollaborationSession | undefined {
    return Array.from(this.sessions.values()).find(s =>
      s.participants.some(p => p.userId === userId)
    );
  }

  /**
   * Generate user color
   */
  private generateUserColor(): string {
    const colors = [
      '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
    ];

    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save to storage
   */
  private saveToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('collaboration-sessions', JSON.stringify(Array.from(this.sessions.entries())));
        localStorage.setItem('collaboration-comments', JSON.stringify(Array.from(this.comments.entries())));
      } catch (error) {
        console.error('Failed to save collaboration data:', error);
      }
    }
  }

  /**
   * Load from storage
   */
  private loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const sessions = localStorage.getItem('collaboration-sessions');
        if (sessions) {
          this.sessions = new Map(JSON.parse(sessions));
        }

        const comments = localStorage.getItem('collaboration-comments');
        if (comments) {
          this.comments = new Map(JSON.parse(comments));
        }
      } catch (error) {
        console.error('Failed to load collaboration data:', error);
      }
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.disconnect();

    if (this.lockCleanupInterval) {
      clearInterval(this.lockCleanupInterval);
    }
  }
}

// Singleton instance
export const collaborationManager = new RealtimeCollaborationManager();

/**
 * Presence awareness hook
 */
export class PresenceManager {
  private idleTimeout: number = 300000; // 5 minutes
  private checkInterval?: NodeJS.Timeout;

  constructor() {
    this.startIdleCheck();
  }

  private startIdleCheck(): void {
    this.checkInterval = setInterval(() => {
      const now = Date.now();

      for (const session of collaborationManager['sessions'].values()) {
        for (const participant of session.participants) {
          const lastSeen = new Date(participant.lastSeen).getTime();

          if (now - lastSeen > this.idleTimeout) {
            participant.isActive = false;
          }
        }
      }
    }, 60000); // Check every minute
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

export const presenceManager = new PresenceManager();

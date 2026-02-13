/**
 * React Hooks for Real-time Collaboration
 * Provides hooks for presence, cursors, comments, and collaborative editing
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../services/SimpleLogger';
import type {
  RealtimePresence,
  CollaborationChange,
  WorkflowComment,
  CollaborationRole,
  ChangeType
} from '../types/collaboration';

// Simple WebSocket hook replacement
const useWebSocket = (config: { url: string; autoConnect: boolean }) => {
  const [connected, setConnected] = useState(false);

  const send = useCallback(async (event: string, data: unknown) => {
    logger.debug(`WebSocket send: ${event}`, data);
  }, []);

  const subscribe = useCallback((event: string, callback: (data: unknown) => void) => {
    logger.debug(`WebSocket subscribe: ${event}`);
    return () => {
      logger.debug(`WebSocket unsubscribe: ${event}`);
    };
  }, []);

  useEffect(() => {
    setConnected(true);
  }, []);

  return { connected, send, subscribe };
};

interface UseCollaborationOptions {
  workflowId: string;
  userId: string;
  userName: string;
  userEmail: string;
  avatar?: string;
  role?: CollaborationRole;
  autoJoin?: boolean;
}

interface UseCollaborationReturn {
  // Connection
  isConnected: boolean;
  isJoined: boolean;
  joinSession: () => Promise<void>;
  leaveSession: () => Promise<void>;

  // Presence
  presence: RealtimePresence[];
  updatePresence: (update: Partial<RealtimePresence>) => void;
  myPresence: RealtimePresence | null;

  // Changes
  applyChange: (change: Omit<CollaborationChange, 'id' | 'timestamp' | 'userId' | 'userName' | 'applied' | 'sessionId'>) => Promise<void>;
  changes: CollaborationChange[];

  // Locks
  acquireLock: (nodeId: string) => Promise<boolean>;
  releaseLock: (nodeId: string) => Promise<void>;
  isNodeLocked: (nodeId: string) => boolean;
  getNodeLock: (nodeId: string) => { userId: string; userName: string } | null;

  // Comments
  comments: WorkflowComment[];
  addComment: (comment: Omit<WorkflowComment, 'id' | 'createdAt' | 'replies' | 'reactions'>) => Promise<void>;
  resolveComment: (commentId: string) => Promise<void>;
  getNodeComments: (nodeId: string) => WorkflowComment[];

  // Stats
  stats: {
    activeUsers: number;
    totalChanges: number;
    totalComments: number;
  };
}

export function useCollaboration(options: UseCollaborationOptions): UseCollaborationReturn {
  const { workflowId, userId, userName, userEmail, avatar, role = 'editor', autoJoin = true } = options;

  const [isJoined, setIsJoined] = useState(false);
  const [presence, setPresence] = useState<RealtimePresence[]>([]);
  const [myPresence, setMyPresence] = useState<RealtimePresence | null>(null);
  const [changes, setChanges] = useState<CollaborationChange[]>([]);
  const [comments, setComments] = useState<WorkflowComment[]>([]);
  const [locks, setLocks] = useState<Map<string, { userId: string; userName: string }>>(new Map());

  const sessionIdRef = useRef<string | null>(null);
  const presenceThrottleRef = useRef<NodeJS.Timeout | null>(null);

  const { connected, send, subscribe } = useWebSocket({
    url: process.env.VITE_WS_URL || 'ws://localhost:3001/ws',
    autoConnect: true
  });

  /**
   * Join collaboration session
   */
  const joinSession = useCallback(async () => {
    if (!connected || isJoined) return;

    await send('collaboration:join', {
      workflowId,
      userName,
      role
    });

    setIsJoined(true);

    // Initialize my presence
    const initialPresence: RealtimePresence = {
      userId,
      userName,
      avatar,
      isActive: true,
      lastActivity: new Date()
    };
    setMyPresence(initialPresence);
  }, [connected, isJoined, workflowId, userName, role, userId, avatar, send]);

  /**
   * Leave collaboration session
   */
  const leaveSession = useCallback(async () => {
    if (!connected || !isJoined || !sessionIdRef.current) return;

    await send('collaboration:leave', {
      sessionId: sessionIdRef.current
    });

    setIsJoined(false);
    setPresence([]);
    setMyPresence(null);
  }, [connected, isJoined, send]);

  /**
   * Update presence (cursor, selection, viewport)
   */
  const updatePresence = useCallback((update: Partial<RealtimePresence>) => {
    if (!connected || !isJoined) return;

    const updatedPresence: RealtimePresence = {
      ...myPresence!,
      ...update,
      lastActivity: new Date()
    };

    setMyPresence(updatedPresence);

    // Throttle presence updates to avoid flooding
    if (presenceThrottleRef.current) {
      clearTimeout(presenceThrottleRef.current);
    }

    presenceThrottleRef.current = setTimeout(() => {
      send('collaboration:presence', {
        workflowId,
        presence: update
      });
    }, 100); // 100ms throttle
  }, [connected, isJoined, workflowId, myPresence, send]);

  /**
   * Apply a change to the workflow
   */
  const applyChange = useCallback(async (
    change: Omit<CollaborationChange, 'id' | 'timestamp' | 'userId' | 'userName' | 'applied' | 'sessionId'>
  ) => {
    if (!connected || !isJoined) return;

    const fullChange = {
      ...change,
      userId,
      userName,
      sessionId: sessionIdRef.current!
    };

    await send('collaboration:change', {
      workflowId,
      change: fullChange
    });

    // Optimistically add to local changes
    const optimisticChange: CollaborationChange = {
      id: `temp-${Date.now()}`,
      sessionId: sessionIdRef.current!,
      userId,
      userName,
      type: change.type,
      timestamp: new Date(),
      description: change.description,
      data: change.data,
      applied: true
    };

    setChanges(prev => [...prev, optimisticChange]);
  }, [connected, isJoined, workflowId, userId, userName, send]);

  /**
   * Acquire lock on a node
   */
  const acquireLock = useCallback(async (nodeId: string): Promise<boolean> => {
    if (!connected || !isJoined) return false;

    return new Promise((resolve) => {
      const handler = (data: any) => {
        if (data.nodeId === nodeId) {
          const acquired = data.userId === userId;
          if (acquired) {
            setLocks(prev => new Map(prev).set(nodeId, { userId, userName }));
          }
          resolve(acquired);
        }
      };

      // Subscribe to response
      const unsubscribeAcquired = subscribe('collaboration:lock-acquired', handler);
      const unsubscribeDenied = subscribe('collaboration:lock-denied', (data: any) => {
        if (data.nodeId === nodeId) {
          resolve(false);
        }
      });

      // Send lock request
      send('collaboration:lock', {
        nodeId,
        userName
      });

      // Cleanup after timeout
      setTimeout(() => {
        unsubscribeAcquired();
        unsubscribeDenied();
      }, 5000);
    });
  }, [connected, isJoined, userId, userName, send, subscribe]);

  /**
   * Release lock on a node
   */
  const releaseLock = useCallback(async (nodeId: string) => {
    if (!connected || !isJoined) return;

    await send('collaboration:unlock', {
      nodeId
    });

    setLocks(prev => {
      const updated = new Map(prev);
      updated.delete(nodeId);
      return updated;
    });
  }, [connected, isJoined, send]);

  /**
   * Check if node is locked
   */
  const isNodeLocked = useCallback((nodeId: string): boolean => {
    const lock = locks.get(nodeId);
    return lock !== undefined && lock.userId !== userId;
  }, [locks, userId]);

  /**
   * Get node lock info
   */
  const getNodeLock = useCallback((nodeId: string) => {
    return locks.get(nodeId) || null;
  }, [locks]);

  /**
   * Add a comment
   */
  const addComment = useCallback(async (
    comment: Omit<WorkflowComment, 'id' | 'createdAt' | 'replies' | 'reactions'>
  ) => {
    if (!connected || !isJoined) return;

    await send('collaboration:comment-add', {
      workflowId,
      comment: {
        ...comment,
        workflowId,
        authorId: userId,
        authorName: userName,
        authorAvatar: avatar
      }
    });
  }, [connected, isJoined, workflowId, userId, userName, avatar, send]);

  /**
   * Resolve a comment
   */
  const resolveComment = useCallback(async (commentId: string) => {
    if (!connected || !isJoined) return;

    await send('collaboration:comment-resolve', {
      workflowId,
      commentId,
      userId,
      userName
    });
  }, [connected, isJoined, workflowId, userId, userName, send]);

  /**
   * Get comments for a specific node
   */
  const getNodeComments = useCallback((nodeId: string) => {
    return comments.filter(c => c.nodeId === nodeId);
  }, [comments]);

  // Subscribe to collaboration events
  useEffect(() => {
    if (!connected) return;

    const unsubscribers: Array<() => void> = [];

    // User joined
    unsubscribers.push(subscribe('collaboration:user-joined', (data: any) => {
      logger.debug('User joined:', data);
    }));

    // User left
    unsubscribers.push(subscribe('collaboration:user-left', (data: any) => {
      setPresence(prev => prev.filter(p => p.userId !== data.userId));
    }));

    // Presence update
    unsubscribers.push(subscribe('collaboration:presence-update', (data: any) => {
      setPresence(prev => {
        const updated = prev.filter(p => p.userId !== data.userId);
        return [...updated, data.presence];
      });
    }));

    // Change received
    unsubscribers.push(subscribe('collaboration:change', (data: any) => {
      setChanges(prev => [...prev, data.change]);
    }));

    // Comment added
    unsubscribers.push(subscribe('collaboration:comment-added', (data: any) => {
      setComments(prev => [...prev, data.comment]);
    }));

    // Comment resolved
    unsubscribers.push(subscribe('collaboration:comment-resolved', (data: any) => {
      setComments(prev =>
        prev.map(c =>
          c.id === data.commentId
            ? { ...c, isResolved: true, resolvedBy: data.userId, resolvedAt: new Date() }
            : c
        )
      );
    }));

    // Lock acquired (by another user)
    unsubscribers.push(subscribe('collaboration:lock-acquired', (data: any) => {
      if (data.userId !== userId) {
        setLocks(prev => new Map(prev).set(data.nodeId, {
          userId: data.userId,
          userName: data.userName || 'Unknown'
        }));
      }
    }));

    // Lock released (by another user)
    unsubscribers.push(subscribe('collaboration:lock-released', (data: any) => {
      setLocks(prev => {
        const updated = new Map(prev);
        updated.delete(data.nodeId);
        return updated;
      });
    }));

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [connected, userId, subscribe]);

  // Auto-join on connect
  useEffect(() => {
    if (connected && autoJoin && !isJoined) {
      joinSession();
    }
  }, [connected, autoJoin, isJoined, joinSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isJoined) {
        leaveSession();
      }
      if (presenceThrottleRef.current) {
        clearTimeout(presenceThrottleRef.current);
      }
    };
  }, [isJoined, leaveSession]);

  return {
    isConnected: connected,
    isJoined,
    joinSession,
    leaveSession,
    presence,
    updatePresence,
    myPresence,
    applyChange,
    changes,
    acquireLock,
    releaseLock,
    isNodeLocked,
    getNodeLock,
    comments,
    addComment,
    resolveComment,
    getNodeComments,
    stats: {
      activeUsers: presence.length,
      totalChanges: changes.length,
      totalComments: comments.length
    }
  };
}

/**
 * Hook for cursor tracking
 */
export function useCursorTracking(workflowId: string) {
  const [cursors, setCursors] = useState<Map<string, { x: number; y: number; userName: string; color: string }>>(new Map());

  const { subscribe } = useWebSocket({
    url: process.env.VITE_WS_URL || 'ws://localhost:3001/ws',
    autoConnect: true
  });

  useEffect(() => {
    const unsubscribe = subscribe('collaboration:presence-update', (data: any) => {
      // Only track cursors for the current workflow
      if (data.workflowId === workflowId && data.presence.cursor) {
        setCursors(prev => {
          const updated = new Map(prev);
          updated.set(data.userId, {
            x: data.presence.cursor.x,
            y: data.presence.cursor.y,
            userName: data.presence.userName,
            color: getUserColor(data.userId)
          });
          return updated;
        });
      }
    });

    return unsubscribe;
  }, [subscribe, workflowId]);

  return cursors;
}

/**
 * Generate consistent color for user
 */
function getUserColor(userId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
  ];

  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  return colors[Math.abs(hash) % colors.length];
}

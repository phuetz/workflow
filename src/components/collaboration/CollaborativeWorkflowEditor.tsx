/**
 * Collaborative Workflow Editor
 * Example integration of all collaboration features into the workflow editor
 */

import React, { useEffect, useCallback } from 'react';
import { useCollaboration } from '../../hooks/useCollaboration';
import { CollaborativeCursors } from './CollaborativeCursors';
import { CollaborationToolbar } from './CollaborationToolbar';
import { NodeLockIndicator } from './NodeLockIndicator';
import type { WorkflowComment } from '../../types/collaboration';
import { logger } from '../../services/SimpleLogger';
import { useToast } from '../ui/Toast';

interface CollaborativeWorkflowEditorProps {
  workflowId: string;
  userId: string;
  userName: string;
  userEmail: string;
  avatar?: string;
  children: React.ReactNode;
  onNodeEdit?: (nodeId: string) => void;
  onNodeMove?: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeUpdate?: (nodeId: string, updates: any) => void;
}

export const CollaborativeWorkflowEditor: React.FC<CollaborativeWorkflowEditorProps> = ({
  workflowId,
  userId,
  userName,
  userEmail,
  avatar,
  children,
  onNodeEdit,
  onNodeMove,
  onNodeUpdate
}) => {
  const toast = useToast();
  const {
    isConnected,
    isJoined,
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
    stats
  } = useCollaboration({
    workflowId,
    userId,
    userName,
    userEmail,
    avatar,
    role: 'editor',
    autoJoin: true
  });

  // Track mouse movement for cursor
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      updatePresence({
        cursor: { x: e.clientX, y: e.clientY }
      });
    };

    // Throttle mouse move events
    let throttleTimeout: NodeJS.Timeout;
    const throttledMouseMove = (e: MouseEvent) => {
      if (!throttleTimeout) {
        handleMouseMove(e);
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null as any;
        }, 50); // 50ms throttle
      }
    };

    window.addEventListener('mousemove', throttledMouseMove);

    return () => {
      window.removeEventListener('mousemove', throttledMouseMove);
    };
  }, [updatePresence]);

  // Handle node editing with locks
  const handleNodeEdit = useCallback(async (nodeId: string) => {
    // Check if node is locked
    if (isNodeLocked(nodeId)) {
      const lock = getNodeLock(nodeId);
      toast.warning(`This node is currently being edited by ${lock?.userName}`);
      return;
    }

    // Acquire lock
    const locked = await acquireLock(nodeId);
    if (!locked) {
      toast.error('Failed to acquire lock on this node');
      return;
    }

    // Call original handler
    onNodeEdit?.(nodeId);

    // Apply change
    await applyChange({
      type: 'node_updated',
      description: 'Editing node',
      data: { nodeId }
    });
  }, [isNodeLocked, getNodeLock, acquireLock, onNodeEdit, applyChange]);

  // Handle node move
  const handleNodeMove = useCallback(async (nodeId: string, position: { x: number; y: number }) => {
    // Apply change
    await applyChange({
      type: 'node_moved',
      description: 'Moved node',
      data: {
        nodeId,
        position
      }
    });

    // Call original handler
    onNodeMove?.(nodeId, position);
  }, [applyChange, onNodeMove]);

  // Handle node update
  const handleNodeUpdate = useCallback(async (nodeId: string, updates: any) => {
    // Apply change
    await applyChange({
      type: 'node_updated',
      description: 'Updated node',
      data: {
        nodeId,
        property: Object.keys(updates)[0],
        oldValue: undefined, // Should get from current state
        newValue: updates[Object.keys(updates)[0]]
      }
    });

    // Call original handler
    onNodeUpdate?.(nodeId, updates);

    // Release lock after update
    await releaseLock(nodeId);
  }, [applyChange, onNodeUpdate, releaseLock]);

  // Handle adding comment
  const handleAddComment = useCallback(async (
    comment: Omit<WorkflowComment, 'id' | 'createdAt' | 'replies' | 'reactions'>
  ) => {
    await addComment(comment);
  }, [addComment]);

  // Handle resolving comment
  const handleResolveComment = useCallback(async (commentId: string) => {
    await resolveComment(commentId);
  }, [resolveComment]);

  // Handle reply to comment
  const handleReplyComment = useCallback(async (parentId: string, content: string) => {
    // Implementation would add reply to parent comment
    logger.debug('Reply to comment', parentId, content);
  }, []);

  // Handle reaction to comment
  const handleReaction = useCallback(async (commentId: string, emoji: string) => {
    // Implementation would add reaction to comment
    logger.debug('React to comment', commentId, emoji);
  }, []);

  // Convert presence to cursor format
  const cursors = new Map(
    presence
      .filter(p => p.cursor)
      .map(p => [
        p.userId,
        {
          userId: p.userId,
          userName: p.userName,
          x: p.cursor!.x,
          y: p.cursor!.y,
          color: getUserColor(p.userId),
          lastUpdate: p.lastActivity
        }
      ])
  );

  return (
    <div className="relative w-full h-full">
      {/* Connection indicator */}
      {!isConnected && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Reconnecting...</span>
          </div>
        </div>
      )}

      {/* Collaboration Toolbar */}
      <CollaborationToolbar
        workflowId={workflowId}
        presence={presence}
        changes={changes}
        comments={comments}
        currentUserId={userId}
        currentUserName={userName}
        isConnected={isConnected}
        onAddComment={handleAddComment}
        onResolveComment={handleResolveComment}
        onReplyComment={handleReplyComment}
        onReaction={handleReaction}
      />

      {/* Collaborative Cursors */}
      <CollaborativeCursors
        cursors={cursors}
        showLabels={true}
        fadeTimeout={5000}
      />

      {/* Main Editor Content */}
      <div className="w-full h-full">
        {React.cloneElement(children as React.ReactElement, {
          onNodeEdit: handleNodeEdit,
          onNodeMove: handleNodeMove,
          onNodeUpdate: handleNodeUpdate,
          isNodeLocked,
          getNodeLock,
          collaborationStats: stats
        })}
      </div>

      {/* Stats Display (for development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 text-xs space-y-1">
          <div className="font-semibold text-gray-900 dark:text-white">
            Collaboration Stats
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            Connected: {isConnected ? 'Yes' : 'No'}
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            Joined: {isJoined ? 'Yes' : 'No'}
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            Active Users: {stats.activeUsers}
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            Total Changes: {stats.totalChanges}
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            Comments: {stats.totalComments}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Generate consistent color for user
 */
function getUserColor(userId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
    '#E056FD', '#686DE0', '#4BCFFA', '#FEA47F', '#25CCF7'
  ];

  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  return colors[Math.abs(hash) % colors.length];
}

export default CollaborativeWorkflowEditor;

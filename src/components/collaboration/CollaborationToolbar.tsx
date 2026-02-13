/**
 * Collaboration Toolbar Component
 * Main toolbar for real-time collaboration features
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PresenceAvatars } from './PresenceAvatars';
import { ActivityFeed } from './ActivityFeed';
import { CommentThread } from './CommentThread';
import type { RealtimePresence, CollaborationChange, WorkflowComment } from '../../types/collaboration';

interface CollaborationToolbarProps {
  workflowId: string;
  presence: RealtimePresence[];
  changes: CollaborationChange[];
  comments: WorkflowComment[];
  currentUserId: string;
  currentUserName: string;
  isConnected: boolean;
  onAddComment: (comment: Omit<WorkflowComment, 'id' | 'createdAt' | 'replies' | 'reactions'>) => void;
  onResolveComment: (commentId: string) => void;
  onReplyComment: (parentId: string, content: string) => void;
  onReaction: (commentId: string, emoji: string) => void;
  className?: string;
}

type PanelView = 'activity' | 'comments' | 'presence' | null;

export const CollaborationToolbar: React.FC<CollaborationToolbarProps> = ({
  workflowId,
  presence,
  changes,
  comments,
  currentUserId,
  currentUserName,
  isConnected,
  onAddComment,
  onResolveComment,
  onReplyComment,
  onReaction,
  className = ''
}) => {
  const [activePanel, setActivePanel] = useState<PanelView>(null);
  const [showConnectionStatus, setShowConnectionStatus] = useState(true);

  const togglePanel = (panel: PanelView) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const unresolvedComments = comments.filter(c => !c.isResolved);

  return (
    <>
      {/* Main Toolbar */}
      <div className={`fixed top-4 right-4 z-40 ${className}`}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
          <div className="flex items-center space-x-2">
            {/* Connection Status */}
            {showConnectionStatus && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-md"
              >
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
                  {isConnected && (
                    <motion.div
                      className="w-full h-full rounded-full bg-green-500"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                <button
                  onClick={() => setShowConnectionStatus(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            )}

            {/* Presence Avatars */}
            <button
              onClick={() => togglePanel('presence')}
              className={`relative ${activePanel === 'presence' ? 'bg-blue-50 dark:bg-blue-900/20' : ''} rounded-md p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
            >
              <PresenceAvatars
                presence={presence}
                maxVisible={5}
                size="md"
              />
            </button>

            {/* Activity Feed Button */}
            <button
              onClick={() => togglePanel('activity')}
              className={`relative p-2 rounded-md ${activePanel === 'activity' ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'} transition-colors`}
              title="Activity Feed"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {changes.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                  {changes.length > 9 ? '9+' : changes.length}
                </span>
              )}
            </button>

            {/* Comments Button */}
            <button
              onClick={() => togglePanel('comments')}
              className={`relative p-2 rounded-md ${activePanel === 'comments' ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'} transition-colors`}
              title="Comments"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              {unresolvedComments.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unresolvedComments.length > 9 ? '9+' : unresolvedComments.length}
                </span>
              )}
            </button>

            {/* Settings/Options */}
            <button
              className="p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Collaboration Settings"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Side Panels */}
      <AnimatePresence>
        {activePanel && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-20 right-4 z-30 w-96"
          >
            {activePanel === 'activity' && (
              <ActivityFeed
                changes={changes}
                maxItems={50}
                showTimestamps={true}
              />
            )}

            {activePanel === 'comments' && (
              <CommentThread
                comments={comments}
                workflowId={workflowId}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                onAddComment={onAddComment}
                onResolveComment={onResolveComment}
                onReplyComment={onReplyComment}
                onReaction={onReaction}
              />
            )}

            {activePanel === 'presence' && (
              <PresencePanel presence={presence} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * Presence Details Panel
 */
interface PresencePanelProps {
  presence: RealtimePresence[];
}

const PresencePanel: React.FC<PresencePanelProps> = ({ presence }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Active Users
          <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
            {presence.length} online
          </span>
        </h3>
      </div>

      {/* User List */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {presence.map((user) => (
          <motion.div
            key={user.userId}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {/* Avatar */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.userName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  user.userName.charAt(0).toUpperCase()
                )}
              </div>
              {user.isActive && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-white truncate">
                {user.userName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {user.isActive ? 'Active now' : `Last seen ${getTimeAgo(user.lastActivity)}`}
              </div>
              {user.viewport && (
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Viewing at {Math.round(user.viewport.zoom * 100)}% zoom
                </div>
              )}
            </div>

            {/* Selection indicator */}
            {user.selection && user.selection.length > 0 && (
              <div className="flex-shrink-0">
                <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                  {user.selection.length} selected
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

/**
 * Get relative time ago string
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return 'earlier today';
}

export default CollaborationToolbar;

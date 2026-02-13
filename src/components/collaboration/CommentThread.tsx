/**
 * Comment Thread Component
 * Displays and manages comments with threading, mentions, and reactions
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WorkflowComment } from '../../types/collaboration';

interface CommentThreadProps {
  comments: WorkflowComment[];
  nodeId?: string;
  workflowId: string;
  currentUserId: string;
  currentUserName: string;
  onAddComment: (comment: Omit<WorkflowComment, 'id' | 'createdAt' | 'replies' | 'reactions'>) => void;
  onResolveComment: (commentId: string) => void;
  onReplyComment: (parentId: string, content: string) => void;
  onReaction: (commentId: string, emoji: string) => void;
  showResolved?: boolean;
  position?: { x: number; y: number };
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  nodeId,
  workflowId,
  currentUserId,
  currentUserName,
  onAddComment,
  onResolveComment,
  onReplyComment,
  onReaction,
  showResolved = false,
  position
}) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredComments = showResolved
    ? comments
    : comments.filter(c => !c.isResolved);

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;

    onAddComment({
      workflowId,
      nodeId,
      authorId: currentUserId,
      authorName: currentUserName,
      content: newComment,
      mentions: extractMentions(newComment),
      isResolved: false
    });

    setNewComment('');
    setMentions([]);
  };

  const handleSubmitReply = (parentId: string) => {
    if (!replyText.trim()) return;

    onReplyComment(parentId, replyText);
    setReplyText('');
    setReplyingTo(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: 'comment' | 'reply') => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (action === 'comment') {
        handleSubmitComment();
      } else if (replyingTo) {
        handleSubmitReply(replyingTo);
      }
    }
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-96 max-h-[600px] flex flex-col"
      style={position ? { position: 'absolute', left: position.x, top: position.y } : undefined}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          Comments
          {filteredComments.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
              {filteredComments.length}
            </span>
          )}
        </h3>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <AnimatePresence>
          {filteredComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onResolve={() => onResolveComment(comment.id)}
              onReply={() => setReplyingTo(comment.id)}
              onReaction={(emoji) => onReaction(comment.id, emoji)}
              isReplying={replyingTo === comment.id}
              replyText={replyText}
              onReplyTextChange={setReplyText}
              onSubmitReply={() => handleSubmitReply(comment.id)}
              onCancelReply={() => setReplyingTo(null)}
            />
          ))}
        </AnimatePresence>

        {filteredComments.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>No comments yet</p>
            <p className="text-sm mt-1">Be the first to comment</p>
          </div>
        )}
      </div>

      {/* New Comment Input */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-start space-x-2">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
              {currentUserName.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e, 'comment')}
              placeholder="Add a comment... (use @ to mention)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              rows={2}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Cmd+Enter to submit
              </span>
              <button
                onClick={handleSubmitComment}
                disabled={!newComment.trim()}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CommentItemProps {
  comment: WorkflowComment;
  currentUserId: string;
  onResolve: () => void;
  onReply: () => void;
  onReaction: (emoji: string) => void;
  isReplying: boolean;
  replyText: string;
  onReplyTextChange: (text: string) => void;
  onSubmitReply: () => void;
  onCancelReply: () => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  onResolve,
  onReply,
  onReaction,
  isReplying,
  replyText,
  onReplyTextChange,
  onSubmitReply,
  onCancelReply
}) => {
  const isOwner = comment.authorId === currentUserId;
  const timeAgo = getTimeAgo(comment.createdAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-lg p-3 ${comment.isResolved ? 'bg-gray-50 dark:bg-gray-900/50 opacity-75' : 'bg-gray-50 dark:bg-gray-900'}`}
    >
      {/* Comment Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-medium">
            {comment.authorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {comment.authorName}
              {isOwner && (
                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">(you)</span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</div>
          </div>
        </div>

        {comment.isResolved && (
          <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
            Resolved
          </span>
        )}
      </div>

      {/* Comment Content */}
      <div className="text-sm text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-wrap">
        {renderContentWithMentions(comment.content, comment.mentions)}
      </div>

      {/* Reactions */}
      {comment.reactions.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {comment.reactions.map((reaction, idx) => (
            <button
              key={idx}
              onClick={() => onReaction(reaction.emoji)}
              className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-xs hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {reaction.emoji} {reaction.count}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-3 text-xs">
        <button
          onClick={onReply}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Reply
        </button>
        <button
          onClick={() => onReaction('👍')}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          👍
        </button>
        <button
          onClick={() => onReaction('❤️')}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          ❤️
        </button>
        {!comment.isResolved && isOwner && (
          <button
            onClick={onResolve}
            className="text-green-600 dark:text-green-400 hover:underline"
          >
            Resolve
          </button>
        )}
      </div>

      {/* Reply Input */}
      {isReplying && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 pl-8"
        >
          <textarea
            value={replyText}
            onChange={(e) => onReplyTextChange(e.target.value)}
            placeholder="Write a reply..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            rows={2}
            autoFocus
          />
          <div className="flex items-center justify-end space-x-2 mt-2">
            <button
              onClick={onCancelReply}
              className="px-3 py-1 text-gray-600 dark:text-gray-400 text-sm hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={onSubmitReply}
              disabled={!replyText.trim()}
              className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reply
            </button>
          </div>
        </motion.div>
      )}

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="mt-3 pl-8 space-y-2 border-l-2 border-gray-200 dark:border-gray-700">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs">
                  {reply.authorName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white text-xs">
                    {reply.authorName}
                  </div>
                  <div className="text-gray-700 dark:text-gray-300">
                    {reply.content}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {getTimeAgo(reply.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

/**
 * Extract @mentions from text
 */
function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

/**
 * Render content with highlighted mentions
 */
function renderContentWithMentions(content: string, mentions: string[]) {
  if (mentions.length === 0) return content;

  const parts = content.split(/(@\w+)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('@') && mentions.some(m => part.includes(m))) {
      return (
        <span key={idx} className="text-blue-600 dark:text-blue-400 font-medium">
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

/**
 * Get relative time ago string
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
}

export default CommentThread;

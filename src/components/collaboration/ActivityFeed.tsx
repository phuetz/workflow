/**
 * Activity Feed Component
 * Displays real-time collaboration activity and changes
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CollaborationChange, ChangeType } from '../../types/collaboration';

interface ActivityFeedProps {
  changes: CollaborationChange[];
  maxItems?: number;
  showTimestamps?: boolean;
  groupByUser?: boolean;
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  changes,
  maxItems = 50,
  showTimestamps = true,
  groupByUser = false,
  className = ''
}) => {
  const [filteredChanges, setFilteredChanges] = useState<CollaborationChange[]>([]);
  const [filter, setFilter] = useState<ChangeType | 'all'>('all');

  useEffect(() => {
    let filtered = [...changes].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    if (filter !== 'all') {
      filtered = filtered.filter(c => c.type === filter);
    }

    setFilteredChanges(filtered.slice(0, maxItems));
  }, [changes, filter, maxItems]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Activity
          </h3>

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ChangeType | 'all')}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Activity</option>
            <option value="node_added">Nodes Added</option>
            <option value="node_removed">Nodes Removed</option>
            <option value="node_moved">Nodes Moved</option>
            <option value="node_updated">Nodes Updated</option>
            <option value="connection_added">Connections Added</option>
            <option value="connection_removed">Connections Removed</option>
          </select>
        </div>
      </div>

      {/* Activity List */}
      <div className="overflow-y-auto max-h-96">
        <AnimatePresence initial={false}>
          {filteredChanges.map((change, index) => (
            <ActivityItem
              key={change.id}
              change={change}
              showTimestamp={showTimestamps}
              delay={index * 0.02}
            />
          ))}
        </AnimatePresence>

        {filteredChanges.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p>No activity yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface ActivityItemProps {
  change: CollaborationChange;
  showTimestamp: boolean;
  delay: number;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ change, showTimestamp, delay }) => {
  const icon = getActivityIcon(change.type);
  const color = getActivityColor(change.type);
  const description = getActivityDescription(change);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay }}
      className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${color.bg} ${color.text}`}
        >
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-900 dark:text-white">
                <span className="font-medium">{change.userName}</span>
                {' '}
                <span className="text-gray-600 dark:text-gray-400">{description}</span>
              </p>

              {change.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {change.description}
                </p>
              )}

              {showTimestamp && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {getTimeAgo(change.timestamp)}
                </p>
              )}
            </div>

            {change.conflicted && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full">
                Conflict
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Get icon for activity type
 */
function getActivityIcon(type: ChangeType): React.ReactNode {
  const iconProps = { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' };

  switch (type) {
    case 'node_added':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      );
    case 'node_removed':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      );
    case 'node_moved':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    case 'node_updated':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    case 'connection_added':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
    case 'connection_removed':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      );
    case 'workflow_renamed':
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
  }
}

/**
 * Get color scheme for activity type
 */
function getActivityColor(type: ChangeType): { bg: string; text: string } {
  switch (type) {
    case 'node_added':
    case 'connection_added':
      return { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-600 dark:text-green-400' };
    case 'node_removed':
    case 'connection_removed':
      return { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-600 dark:text-red-400' };
    case 'node_moved':
      return { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-600 dark:text-blue-400' };
    case 'node_updated':
    case 'workflow_renamed':
      return { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-600 dark:text-purple-400' };
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400' };
  }
}

/**
 * Get human-readable description
 */
function getActivityDescription(change: CollaborationChange): string {
  switch (change.type) {
    case 'node_added':
      return `added a node`;
    case 'node_removed':
      return `removed a node`;
    case 'node_moved':
      return `moved a node`;
    case 'node_updated':
      return `updated a node`;
    case 'connection_added':
      return `added a connection`;
    case 'connection_removed':
      return `removed a connection`;
    case 'workflow_renamed':
      return `renamed the workflow`;
    case 'workflow_description_updated':
      return `updated the description`;
    case 'variable_added':
      return `added a variable`;
    case 'variable_updated':
      return `updated a variable`;
    case 'variable_removed':
      return `removed a variable`;
    case 'cursor_moved':
      return `moved cursor`;
    case 'selection_changed':
      return `changed selection`;
    default:
      return `made a change`;
  }
}

/**
 * Get relative time ago string
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffSecs < 10) return 'just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
}

export default ActivityFeed;

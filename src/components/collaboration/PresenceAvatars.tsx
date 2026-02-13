/**
 * Presence Avatars Component
 * Shows avatars of all active users in the workflow
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RealtimePresence } from '../../types/collaboration';

interface PresenceAvatarsProps {
  presence: RealtimePresence[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

export const PresenceAvatars: React.FC<PresenceAvatarsProps> = ({
  presence,
  maxVisible = 5,
  size = 'md',
  showTooltip = true,
  className = ''
}) => {
  const visible = presence.slice(0, maxVisible);
  const overflow = presence.length - maxVisible;

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  const sizeClass = sizeClasses[size];

  return (
    <div className={`flex items-center -space-x-2 ${className}`}>
      <AnimatePresence>
        {visible.map((user, index) => (
          <motion.div
            key={user.userId}
            initial={{ opacity: 0, scale: 0, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative group"
          >
            <div
              className={`${sizeClass} rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center font-medium text-white shadow-md cursor-pointer transition-transform hover:scale-110 hover:z-10`}
              style={{ backgroundColor: getUserColor(user.userId) }}
              title={showTooltip ? user.userName : undefined}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.userName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span>{getInitials(user.userName)}</span>
              )}

              {/* Active indicator */}
              {user.isActive && (
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
              )}
            </div>

            {/* Tooltip */}
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                {user.userName}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Overflow counter */}
      {overflow > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`${sizeClass} rounded-full bg-gray-300 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 font-medium shadow-md`}
        >
          +{overflow}
        </motion.div>
      )}
    </div>
  );
};

/**
 * Get user initials from name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

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

export default PresenceAvatars;

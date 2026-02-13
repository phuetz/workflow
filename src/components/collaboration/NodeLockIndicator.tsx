/**
 * Node Lock Indicator Component
 * Shows when a node is locked by another user
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NodeLockIndicatorProps {
  locked: boolean;
  lockedBy?: {
    userId: string;
    userName: string;
  };
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: 'sm' | 'md' | 'lg';
}

export const NodeLockIndicator: React.FC<NodeLockIndicatorProps> = ({
  locked,
  lockedBy,
  position = 'top-right',
  size = 'md'
}) => {
  const positionClasses = {
    'top-left': '-top-2 -left-2',
    'top-right': '-top-2 -right-2',
    'bottom-left': '-bottom-2 -left-2',
    'bottom-right': '-bottom-2 -right-2'
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  if (!locked || !lockedBy) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`absolute ${positionClasses[position]} ${sizeClasses[size]} z-10 group`}
      >
        {/* Lock icon */}
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-full h-full drop-shadow-lg"
          >
            {/* Background circle */}
            <circle cx="12" cy="12" r="11" fill="white" />
            <circle cx="12" cy="12" r="11" stroke="#E5E7EB" strokeWidth="1" />

            {/* Lock icon */}
            <path
              d="M16 11V8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8V11M7 11H17C17.5523 11 18 11.4477 18 12V19C18 19.5523 17.5523 20 17 20H7C6.44772 20 6 19.5523 6 19V12C6 11.4477 6.44772 12 7 12Z"
              stroke="#EF4444"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Pulse animation */}
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500 opacity-25"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.25, 0, 0.25]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
          Locked by {lockedBy.userName}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Node editing overlay - shown when attempting to edit a locked node
 */
interface LockedNodeOverlayProps {
  lockedBy: {
    userId: string;
    userName: string;
  };
  onRequestAccess?: () => void;
}

export const LockedNodeOverlay: React.FC<LockedNodeOverlayProps> = ({
  lockedBy,
  onRequestAccess
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-lg z-50 flex items-center justify-center"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm mx-4">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
          Node is Locked
        </h3>

        <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
          This node is currently being edited by{' '}
          <span className="font-medium text-gray-900 dark:text-white">
            {lockedBy.userName}
          </span>
        </p>

        <div className="flex flex-col space-y-2">
          {onRequestAccess && (
            <button
              onClick={onRequestAccess}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Request Access
            </button>
          )}

          <button
            onClick={() => window.history.back()}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default NodeLockIndicator;

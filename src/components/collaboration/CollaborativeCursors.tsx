/**
 * Collaborative Cursors Component
 * Displays real-time cursor positions from all active users
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CursorPosition {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
  lastUpdate: Date;
}

interface CollaborativeCursorsProps {
  cursors: Map<string, CursorPosition>;
  containerRef?: React.RefObject<HTMLElement>;
  showLabels?: boolean;
  fadeTimeout?: number;
}

export const CollaborativeCursors: React.FC<CollaborativeCursorsProps> = ({
  cursors,
  containerRef,
  showLabels = true,
  fadeTimeout = 5000
}) => {
  const [activeCursors, setActiveCursors] = useState<Map<string, CursorPosition>>(new Map());
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Update active cursors and handle fade out
  useEffect(() => {
    cursors.forEach((cursor, userId) => {
      // Clear existing timeout
      const existingTimeout = timeoutsRef.current.get(userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Add/update cursor
      setActiveCursors(prev => new Map(prev).set(userId, cursor));

      // Set new timeout to fade out
      const timeout = setTimeout(() => {
        setActiveCursors(prev => {
          const updated = new Map(prev);
          updated.delete(userId);
          return updated;
        });
      }, fadeTimeout);

      timeoutsRef.current.set(userId, timeout);
    });

    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, [cursors, fadeTimeout]);

  return (
    <div className="collaborative-cursors pointer-events-none fixed inset-0 z-50">
      <AnimatePresence>
        {Array.from(activeCursors.values()).map((cursor) => (
          <Cursor
            key={cursor.userId}
            cursor={cursor}
            showLabel={showLabels}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface CursorProps {
  cursor: CursorPosition;
  showLabel: boolean;
}

const Cursor: React.FC<CursorProps> = ({ cursor, showLabel }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1, x: cursor.x, y: cursor.y }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
        opacity: { duration: 0.2 }
      }}
      className="absolute top-0 left-0"
      style={{ color: cursor.color }}
    >
      {/* Cursor SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        <path
          d="M5 3L19 12L12 13L9 20L5 3Z"
          fill="currentColor"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* User label */}
      {showLabel && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="ml-6 -mt-1 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg"
          style={{ backgroundColor: cursor.color }}
        >
          {cursor.userName}
        </motion.div>
      )}
    </motion.div>
  );
};

export default CollaborativeCursors;

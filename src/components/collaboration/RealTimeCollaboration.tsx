/**
 * Real-Time Collaboration Component
 * Enables multiple users to collaborate on workflows in real-time
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, 
  MousePointer, 
  Edit3, 
  Circle,
  Eye,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useCollaboration } from '../../hooks/useWebSocket';
import { useWorkflowStore } from '../../store/workflowStore';
import type { Node, Edge } from '@xyflow/react';

// Collaborator interfaces
interface CollaboratorData {
  userId: string;
  userName: string;
  joinedAt: Date;
}

interface CollaboratorCursor {
  userId: string;
  userName: string;
  x: number;
  y: number;
  timestamp?: Date;
}

interface CollaboratorPresence {
  userId: string;
  userName: string;
  joinedAt: Date;
  color: string;
  avatar?: string;
  status: 'active' | 'idle' | 'away';
}

interface CollaborationProps {
  workflowId: string;
  userId: string;
  userName: string;
  onCollaboratorChange?: (collaborators: CollaboratorPresence[]) => void;
}

const COLLABORATOR_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316'  // Orange
];

export const RealTimeCollaboration: React.FC<CollaborationProps> = ({
  workflowId,
  userId,
  userName,
  onCollaboratorChange
}) => {
  const [showCollaborators, setShowCollaborators] = useState(true);
  const [showCursors, setShowCursors] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers] = useState<Set<string>>(new Set());

  // Refs for color mapping and cursor throttling
  const colorMapRef = useRef<Map<string, string>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Removed unused destructuring from useWorkflowStore - not needed in this component

  const {
    collaborators: rawCollaborators,
    cursors: rawCursors,
    sendCursorPosition,
    sendSelection,
    sendEdit,
    connected
  } = useCollaboration(workflowId, userId, userName);

  // Type-cast the collaborators and cursors from unknown to proper types
  const collaborators = rawCollaborators as CollaboratorData[];
  const cursors = rawCursors as CollaboratorCursor[];

  // Assign colors to collaborators
  const getCollaboratorColor = useCallback((userId: string): string => {
    if (!colorMapRef.current.has(userId)) {
      const colorIndex = colorMapRef.current.size % COLLABORATOR_COLORS.length;
      const color = COLLABORATOR_COLORS[colorIndex];
      colorMapRef.current.set(userId, color);
    }
    return colorMapRef.current.get(userId)!;
  }, []);

  // Handle mouse movement
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!containerRef.current || !showCursors) return;

    const { clientX: x, clientY: y } = event;

    // Throttle cursor updates
    if (!cursorTimeoutRef.current.has('self')) {
      sendCursorPosition({ x, y });

      cursorTimeoutRef.current.set('self', setTimeout(() => {
        cursorTimeoutRef.current.delete('self');
      }, 50)); // 20 updates per second max
    }
  }, [sendCursorPosition, showCursors]);

  // Handle selection change
  const handleSelectionChange = useCallback((selectedNodes: Node[], selectedEdges: Edge[]) => {
    sendSelection({
      nodes: selectedNodes.map(n => n.id),
      edges: selectedEdges.map(e => e.id)
    });
  }, [sendSelection]);

  // Handle node/edge updates
  const handleNodeUpdate = useCallback((nodeId: string, updates: any) => {
    sendEdit({
      type: 'node',
      id: nodeId,
      updates,
      timestamp: new Date()
    });
  }, [sendEdit]);

  const handleEdgeUpdate = useCallback((edgeId: string, updates: any) => {
    sendEdit({
      type: 'edge',
      id: edgeId,
      updates,
      timestamp: new Date()
    });
  }, [sendEdit]);

  // Handle typing indicator
  const handleTypingStart = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      sendEdit({
        type: 'typing',
        status: 'start',
        timestamp: new Date()
      });
    }
  }, [isTyping, sendEdit]);

  const handleTypingStop = useCallback(() => {
    if (isTyping) {
      setIsTyping(false);
      sendEdit({
        type: 'typing',
        status: 'stop',
        timestamp: new Date()
      });
    }
  }, [isTyping, sendEdit]);

  // Setup event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  // Update collaborator list
  useEffect(() => {
    const presenceList: CollaboratorPresence[] = collaborators.map(collab => ({
      ...collab,
      color: getCollaboratorColor(collab.userId),
      status: 'active' as const
    }));

    onCollaboratorChange?.(presenceList);
  }, [collaborators, getCollaboratorColor, onCollaboratorChange]);

  // Clean up old cursors
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeout = 5000; // 5 seconds timeout
      cursors.forEach(cursor => {
        const lastUpdate = cursor.timestamp?.getTime() || 0;
        if (now - lastUpdate > timeout) {
          // Cursor is stale, hide it
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cursors]);

  // Render collaborator cursors
  const renderCursors = () => {
    if (!showCursors) return null;

    return (
      <div className="absolute inset-0 pointer-events-none z-50">
        {cursors.map(cursor => (
          <div
            key={cursor.userId}
            className="absolute transition-all duration-100"
            style={{
              left: cursor.x,
              top: cursor.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <MousePointer
              className="w-5 h-5"
              style={{ 
                color: getCollaboratorColor(cursor.userId),
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
              }}
            />
            <span
              className="absolute top-5 left-0 text-xs font-medium px-2 py-1 rounded shadow-sm whitespace-nowrap"
              style={{
                backgroundColor: getCollaboratorColor(cursor.userId),
                color: 'white'
              }}
            >
              {cursor.userName}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Render collaborator list
  const renderCollaboratorList = () => {
    if (!showCollaborators) return null;

    return (
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-40 max-w-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Collaborators ({collaborators.length + 1})
          </h3>
          <button
            onClick={() => setShowCollaborators(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-2">
          {/* Current user */}
          <div className="flex items-center space-x-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: getCollaboratorColor(userId) }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{userName} (You)</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>

          {/* Other collaborators */}
          {collaborators.map(collab => (
            <div key={collab.userId} className="flex items-center space-x-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: getCollaboratorColor(collab.userId) }}
              >
                {collab.userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{collab.userName}</p>
                <p className="text-xs text-gray-500">
                  {typingUsers.has(collab.userId) ? (
                    <span className="flex items-center">
                      <Edit3 className="w-3 h-3 mr-1" />
                      Typing...
                    </span>
                  ) : (
                    'Active'
                  )}
                </p>
              </div>
              <Eye className="w-4 h-4 text-gray-400" />
            </div>
          ))}
        </div>

        {/* Connection status */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Connection</span>
            <span className={`flex items-center ${connected ? 'text-green-600' : 'text-red-600'}`}>
              {connected ? (
                <>
                  <Wifi className="w-3 h-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 mr-1" />
                  Disconnected
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render typing indicator
  const renderTypingIndicator = () => {
    if (typingUsers.size === 0) return null;

    const typingUserNames = Array.from(typingUsers)
      .map(uid => collaborators.find(c => c.userId === uid)?.userName)
      .filter(Boolean);

    if (typingUserNames.length === 0) return null;

    return (
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md px-3 py-2 flex items-center space-x-2 z-40">
        <div className="flex space-x-1">
          <Circle className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <Circle className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <Circle className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-sm text-gray-600">
          {typingUserNames.length === 1
            ? `${typingUserNames[0]} is typing...`
            : `${typingUserNames.length} people are typing...`}
        </span>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative h-full">
      {/* Cursors */}
      {renderCursors()}

      {/* Collaborator list */}
      {renderCollaboratorList()}

      {/* Typing indicator */}
      {renderTypingIndicator()}

      {/* Toggle buttons */}
      <div className="absolute top-4 left-4 flex space-x-2 z-40">
        <button
          onClick={() => setShowCursors(!showCursors)}
          className={`p-2 rounded-lg shadow-md transition-colors ${
            showCursors 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title={showCursors ? 'Hide cursors' : 'Show cursors'}
        >
          <MousePointer className="w-4 h-4" />
        </button>
        
        {!showCollaborators && (
          <button
            onClick={() => setShowCollaborators(true)}
            className="p-2 bg-white rounded-lg shadow-md text-gray-700 hover:bg-gray-100"
            title="Show collaborators"
          >
            <Users className="w-4 h-4" />
            {collaborators.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                {collaborators.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Connection status indicator */}
      {!connected && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-50 border border-red-200 rounded-lg p-4 z-50">
          <div className="flex items-center space-x-3">
            <WifiOff className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-900">Connection Lost</p>
              <p className="text-sm text-red-700">Attempting to reconnect...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
/**
 * N8N-Style Node Component
 * Flat, futuristic design with circular loading indicators
 * Reference: https://www.geeky-gadgets.com/n8n-2-0-update-release-features/
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Play, AlertCircle, CheckCircle, Pin, Settings,
  MoreHorizontal, Trash2, Copy, Zap, Loader2
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface N8NNodeData {
  type: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
  config?: Record<string, any>;
  isConfigured?: boolean;
  isDirty?: boolean;
  isPinned?: boolean;
  executionStatus?: 'idle' | 'queued' | 'executing' | 'success' | 'error';
  executionTime?: number;
  itemCount?: number;
  errorMessage?: string;
}

interface N8NStyleNodeProps extends NodeProps {
  data: N8NNodeData;
}

// ============================================================================
// Circular Progress Component (n8n style loading)
// ============================================================================

const CircularProgress: React.FC<{
  size?: number;
  strokeWidth?: number;
  isIndeterminate?: boolean;
  progress?: number;
  color?: string;
}> = ({
  size = 56,
  strokeWidth = 3,
  isIndeterminate = true,
  progress = 0,
  color = '#6366f1',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className={isIndeterminate ? 'animate-spin' : ''}
      style={{ animationDuration: '1.5s' }}
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-gray-200 dark:text-gray-700"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={isIndeterminate ? circumference * 0.75 : offset}
        className="transition-all duration-300"
        style={{
          transformOrigin: '50% 50%',
          transform: 'rotate(-90deg)',
        }}
      />
    </svg>
  );
};

// ============================================================================
// Status Badge Component
// ============================================================================

const StatusBadge: React.FC<{
  status: N8NNodeData['executionStatus'];
  itemCount?: number;
  executionTime?: number;
}> = ({ status, itemCount, executionTime }) => {
  if (status === 'idle') return null;

  const statusConfig = {
    queued: { color: 'bg-gray-100 text-gray-600', icon: null, text: 'Queued' },
    executing: { color: 'bg-blue-100 text-blue-600', icon: <Loader2 className="w-3 h-3 animate-spin" />, text: 'Running' },
    success: { color: 'bg-green-100 text-green-600', icon: <CheckCircle className="w-3 h-3" />, text: itemCount !== undefined ? `${itemCount} items` : 'Success' },
    error: { color: 'bg-red-100 text-red-600', icon: <AlertCircle className="w-3 h-3" />, text: 'Error' },
  };

  const config = statusConfig[status || 'idle'];
  if (!config) return null;

  return (
    <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color} whitespace-nowrap`}>
      {config.icon}
      <span>{config.text}</span>
      {executionTime !== undefined && status === 'success' && (
        <span className="opacity-70">• {executionTime}ms</span>
      )}
    </div>
  );
};

// ============================================================================
// Main Node Component
// ============================================================================

export const N8NStyleNode = memo<N8NStyleNodeProps>(({
  data,
  id,
  selected,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const {
    type,
    label,
    icon,
    color = '#6b7280',
    isConfigured = false,
    isDirty = false,
    isPinned = false,
    executionStatus = 'idle',
    executionTime,
    itemCount,
    errorMessage,
  } = data;

  // Determine border color based on status
  const borderColor = useMemo(() => {
    if (executionStatus === 'executing') return '#3b82f6';
    if (executionStatus === 'success') return '#22c55e';
    if (executionStatus === 'error') return '#ef4444';
    if (selected) return '#6366f1';
    return 'transparent';
  }, [executionStatus, selected]);

  // Determine if showing loading indicator
  const isLoading = executionStatus === 'executing';

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowActions(false);
      }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-gray-400 dark:!bg-gray-500 !border-2 !border-white dark:!border-gray-900 !-left-1.5 hover:!bg-primary-500 transition-colors"
      />

      {/* Main Node Container */}
      <div
        className={`
          relative w-[52px] h-[52px]
          bg-white dark:bg-gray-800
          rounded-xl
          transition-all duration-200 ease-out
          ${selected ? 'shadow-lg shadow-primary-500/20' : 'shadow-md hover:shadow-lg'}
          ${isHovered ? 'scale-105' : ''}
        `}
        style={{
          boxShadow: borderColor !== 'transparent'
            ? `0 0 0 2px ${borderColor}, 0 4px 6px -1px rgba(0, 0, 0, 0.1)`
            : undefined,
        }}
      >
        {/* Loading ring overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <CircularProgress size={60} strokeWidth={2} color={color} />
          </div>
        )}

        {/* Icon container */}
        <div
          className={`
            absolute inset-0 flex items-center justify-center
            rounded-xl overflow-hidden
            ${isLoading ? 'opacity-70' : ''}
          `}
        >
          {/* Color strip at top */}
          <div
            className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl"
            style={{ backgroundColor: color }}
          />

          {/* Icon */}
          <div className="text-gray-600 dark:text-gray-300 mt-1">
            {icon || <Zap className="w-6 h-6" />}
          </div>
        </div>

        {/* Dirty indicator (unsaved changes) */}
        {isDirty && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white dark:border-gray-900" />
        )}

        {/* Pinned indicator */}
        {isPinned && (
          <div className="absolute -top-1 -left-1 w-5 h-5 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center">
            <Pin className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          </div>
        )}

        {/* Not configured indicator */}
        {!isConfigured && executionStatus === 'idle' && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-amber-400 rounded-full" />
        )}

        {/* Error indicator */}
        {executionStatus === 'error' && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <AlertCircle className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Success indicator */}
        {executionStatus === 'success' && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-gray-400 dark:!bg-gray-500 !border-2 !border-white dark:!border-gray-900 !-right-1.5 hover:!bg-primary-500 transition-colors"
      />

      {/* Label */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 px-2 py-0.5 bg-white/80 dark:bg-gray-900/80 rounded backdrop-blur-sm">
          {label}
        </span>
      </div>

      {/* Status Badge */}
      <StatusBadge
        status={executionStatus}
        itemCount={itemCount}
        executionTime={executionTime}
      />

      {/* Quick actions (n8n style toolbar on hover) */}
      {isHovered && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 z-20">
          <button
            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
            title="Execute node"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            title="Open settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error tooltip */}
      {executionStatus === 'error' && errorMessage && isHovered && (
        <div className="absolute top-full mt-8 left-1/2 -translate-x-1/2 max-w-xs bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs p-2 rounded-lg shadow-lg z-30">
          {errorMessage}
        </div>
      )}
    </div>
  );
});

N8NStyleNode.displayName = 'N8NStyleNode';

export default N8NStyleNode;

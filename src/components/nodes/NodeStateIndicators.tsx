/**
 * Node State Indicators
 * Visual indicators for node execution states (n8n style)
 * Dirty, Pinned, Executing, Success, Error states
 */

import React, { memo } from 'react';
import {
  Pin, AlertCircle, CheckCircle, Loader2, Clock, PauseCircle,
  FastForward, AlertTriangle, XCircle, RefreshCw, Play, Zap
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type ExecutionStatus =
  | 'idle'
  | 'queued'
  | 'executing'
  | 'success'
  | 'error'
  | 'warning'
  | 'paused'
  | 'skipped'
  | 'waiting'
  | 'retrying';

export interface NodeStateConfig {
  isDirty?: boolean;
  isPinned?: boolean;
  isConfigured?: boolean;
  isDisabled?: boolean;
  executionStatus?: ExecutionStatus;
  executionTime?: number;
  itemCount?: number;
  retryCount?: number;
  errorMessage?: string;
}

// ============================================================================
// Execution Status Badge
// ============================================================================

const statusConfig: Record<ExecutionStatus, {
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  label: string;
  animate?: boolean;
}> = {
  idle: {
    icon: null,
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-500',
    label: 'Idle',
  },
  queued: {
    icon: <Clock className="w-3 h-3" />,
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-600 dark:text-gray-400',
    label: 'Queued',
  },
  executing: {
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-600 dark:text-blue-400',
    label: 'Running',
    animate: true,
  },
  success: {
    icon: <CheckCircle className="w-3 h-3" />,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400',
    label: 'Success',
  },
  error: {
    icon: <XCircle className="w-3 h-3" />,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-600 dark:text-red-400',
    label: 'Error',
  },
  warning: {
    icon: <AlertTriangle className="w-3 h-3" />,
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-600 dark:text-amber-400',
    label: 'Warning',
  },
  paused: {
    icon: <PauseCircle className="w-3 h-3" />,
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-600 dark:text-orange-400',
    label: 'Paused',
  },
  skipped: {
    icon: <FastForward className="w-3 h-3" />,
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-500',
    label: 'Skipped',
  },
  waiting: {
    icon: <Clock className="w-3 h-3 animate-pulse" />,
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-600 dark:text-purple-400',
    label: 'Waiting',
    animate: true,
  },
  retrying: {
    icon: <RefreshCw className="w-3 h-3 animate-spin" />,
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-600 dark:text-orange-400',
    label: 'Retrying',
    animate: true,
  },
};

export const ExecutionStatusBadge: React.FC<{
  status: ExecutionStatus;
  itemCount?: number;
  executionTime?: number;
  retryCount?: number;
  size?: 'sm' | 'md';
}> = memo(({ status, itemCount, executionTime, retryCount, size = 'sm' }) => {
  if (status === 'idle') return null;

  const config = statusConfig[status];

  return (
    <div
      className={`
        inline-flex items-center gap-1
        ${size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'}
        rounded-full font-medium
        ${config.bgColor} ${config.textColor}
        ${config.animate ? 'animate-pulse' : ''}
      `}
    >
      {config.icon}
      <span>
        {status === 'success' && itemCount !== undefined
          ? `${itemCount} item${itemCount !== 1 ? 's' : ''}`
          : status === 'retrying' && retryCount
            ? `Retry ${retryCount}`
            : config.label
        }
      </span>
      {executionTime !== undefined && status === 'success' && (
        <span className="opacity-70">• {executionTime}ms</span>
      )}
    </div>
  );
});

ExecutionStatusBadge.displayName = 'ExecutionStatusBadge';

// ============================================================================
// Dirty Indicator (Unsaved changes)
// ============================================================================

export const DirtyIndicator: React.FC<{
  isDirty: boolean;
  size?: 'sm' | 'md' | 'lg';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}> = memo(({ isDirty, size = 'sm', position = 'top-right' }) => {
  if (!isDirty) return null;

  const sizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const positions = {
    'top-right': '-top-1 -right-1',
    'top-left': '-top-1 -left-1',
    'bottom-right': '-bottom-1 -right-1',
    'bottom-left': '-bottom-1 -left-1',
  };

  return (
    <div
      className={`
        absolute ${positions[position]} ${sizes[size]}
        bg-amber-500 rounded-full
        border-2 border-white dark:border-gray-900
        shadow-sm
      `}
      title="Unsaved changes"
    />
  );
});

DirtyIndicator.displayName = 'DirtyIndicator';

// ============================================================================
// Pinned Indicator
// ============================================================================

export const PinnedIndicator: React.FC<{
  isPinned: boolean;
  size?: 'sm' | 'md' | 'lg';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  showLabel?: boolean;
}> = memo(({ isPinned, size = 'sm', position = 'top-left', showLabel = false }) => {
  if (!isPinned) return null;

  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const positions = {
    'top-right': '-top-1.5 -right-1.5',
    'top-left': '-top-1.5 -left-1.5',
    'bottom-right': '-bottom-1.5 -right-1.5',
    'bottom-left': '-bottom-1.5 -left-1.5',
  };

  return (
    <div
      className={`
        absolute ${positions[position]} ${sizes[size]}
        bg-amber-100 dark:bg-amber-900/50 rounded-full
        flex items-center justify-center
        border border-amber-300 dark:border-amber-700
        shadow-sm
      `}
      title="Pinned test data"
    >
      <Pin className={`${iconSizes[size]} text-amber-600 dark:text-amber-400`} />
    </div>
  );
});

PinnedIndicator.displayName = 'PinnedIndicator';

// ============================================================================
// Not Configured Indicator
// ============================================================================

export const NotConfiguredIndicator: React.FC<{
  isConfigured: boolean;
  variant?: 'bar' | 'badge' | 'icon';
}> = memo(({ isConfigured, variant = 'bar' }) => {
  if (isConfigured) return null;

  if (variant === 'bar') {
    return (
      <div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-amber-400 rounded-full"
        title="Not configured"
      />
    );
  }

  if (variant === 'badge') {
    return (
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap">
        Configure
      </div>
    );
  }

  return (
    <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center">
      <AlertTriangle className="w-3 h-3 text-amber-600" />
    </div>
  );
});

NotConfiguredIndicator.displayName = 'NotConfiguredIndicator';

// ============================================================================
// Disabled Indicator
// ============================================================================

export const DisabledIndicator: React.FC<{
  isDisabled: boolean;
}> = memo(({ isDisabled }) => {
  if (!isDisabled) return null;

  return (
    <div className="absolute inset-0 bg-gray-500/20 dark:bg-gray-900/40 rounded-xl flex items-center justify-center pointer-events-none">
      <div className="w-8 h-0.5 bg-gray-500 dark:bg-gray-400 transform -rotate-45" />
    </div>
  );
});

DisabledIndicator.displayName = 'DisabledIndicator';

// ============================================================================
// Error Indicator with Tooltip
// ============================================================================

export const ErrorIndicator: React.FC<{
  hasError: boolean;
  errorMessage?: string;
  showOnHover?: boolean;
}> = memo(({ hasError, errorMessage, showOnHover = true }) => {
  if (!hasError) return null;

  return (
    <div className="group absolute -top-1 -right-1">
      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse shadow-sm">
        <AlertCircle className="w-3 h-3 text-white" />
      </div>

      {/* Error tooltip */}
      {errorMessage && showOnHover && (
        <div className="
          absolute top-full right-0 mt-1 z-50
          max-w-xs p-2 rounded-lg shadow-lg
          bg-red-50 dark:bg-red-900/30
          border border-red-200 dark:border-red-800
          text-red-700 dark:text-red-300 text-xs
          opacity-0 group-hover:opacity-100
          pointer-events-none transition-opacity duration-200
        ">
          {errorMessage}
        </div>
      )}
    </div>
  );
});

ErrorIndicator.displayName = 'ErrorIndicator';

// ============================================================================
// Success Indicator
// ============================================================================

export const SuccessIndicator: React.FC<{
  isSuccess: boolean;
  itemCount?: number;
}> = memo(({ isSuccess, itemCount }) => {
  if (!isSuccess) return null;

  return (
    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
      <CheckCircle className="w-3 h-3 text-white" />
    </div>
  );
});

SuccessIndicator.displayName = 'SuccessIndicator';

// ============================================================================
// Executing Indicator (Ring animation)
// ============================================================================

export const ExecutingIndicator: React.FC<{
  isExecuting: boolean;
  color?: string;
  size?: number;
}> = memo(({ isExecuting, color = '#3b82f6', size = 60 }) => {
  if (!isExecuting) return null;

  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <svg
        width={size}
        height={size}
        className="animate-spin"
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
          strokeDashoffset={circumference * 0.75}
          style={{
            transformOrigin: '50% 50%',
            transform: 'rotate(-90deg)',
          }}
        />
      </svg>
    </div>
  );
});

ExecutingIndicator.displayName = 'ExecutingIndicator';

// ============================================================================
// Combined Node State Overlay
// ============================================================================

export const NodeStateOverlay: React.FC<NodeStateConfig> = memo(({
  isDirty = false,
  isPinned = false,
  isConfigured = true,
  isDisabled = false,
  executionStatus = 'idle',
  executionTime,
  itemCount,
  retryCount,
  errorMessage,
}) => {
  return (
    <>
      {/* Executing ring */}
      <ExecutingIndicator
        isExecuting={executionStatus === 'executing'}
      />

      {/* Disabled overlay */}
      <DisabledIndicator isDisabled={isDisabled} />

      {/* Corner indicators */}
      <DirtyIndicator isDirty={isDirty} position="top-right" />
      <PinnedIndicator isPinned={isPinned} position="top-left" />

      {/* Not configured bar */}
      {!isConfigured && executionStatus === 'idle' && (
        <NotConfiguredIndicator isConfigured={false} variant="bar" />
      )}

      {/* Error indicator */}
      <ErrorIndicator
        hasError={executionStatus === 'error'}
        errorMessage={errorMessage}
      />

      {/* Success indicator */}
      <SuccessIndicator
        isSuccess={executionStatus === 'success'}
        itemCount={itemCount}
      />
    </>
  );
});

NodeStateOverlay.displayName = 'NodeStateOverlay';

// ============================================================================
// Execution Result Badge (for node footer)
// ============================================================================

export const ExecutionResultBadge: React.FC<{
  status: ExecutionStatus;
  itemCount?: number;
  executionTime?: number;
}> = memo(({ status, itemCount, executionTime }) => {
  if (status === 'idle') return null;

  return (
    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
      <ExecutionStatusBadge
        status={status}
        itemCount={itemCount}
        executionTime={executionTime}
        size="sm"
      />
    </div>
  );
});

ExecutionResultBadge.displayName = 'ExecutionResultBadge';

export default NodeStateOverlay;

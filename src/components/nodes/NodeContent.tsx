import React from 'react';
import { Check, X, Loader2, Settings } from 'lucide-react';

interface NodeContentProps {
  nodeIcon: JSX.Element;
  isConfigured: boolean;
  isExecuting: boolean;
  hasResult: boolean;
  hasError: boolean;
  borderColor: string;
  selected?: boolean;
  nodeColor?: string;
  label?: string;
  itemCount?: number;
}

/**
 * NodeContent - n8n-style compact node visual
 *
 * Layout: [Icon] Label        (110px wide)
 * With execution glow, status badges, and item count
 */
export const NodeContent: React.FC<NodeContentProps> = ({
  nodeIcon,
  isConfigured,
  isExecuting,
  hasResult,
  hasError,
  selected,
  label,
  itemCount,
}) => {
  const statusState = isExecuting ? 'executing' : hasError ? 'error' : hasResult ? 'success' : 'idle';

  // n8n-style CSS class for the node wrapper
  const nodeClass = [
    'n8n-node',
    selected ? 'selected' : '',
    statusState === 'executing' ? 'executing' : '',
    statusState === 'success' ? 'success' : '',
    statusState === 'error' ? 'error' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={`relative ${nodeClass}`} style={{ width: 'var(--n8n-node-width, 110px)' }}>
      {/* Node body */}
      <div className="flex flex-col items-center px-2 py-3 gap-1.5">
        {/* Icon container */}
        <div
          className={`
            n8n-node-icon
            transition-all duration-200
            ${isExecuting ? '' : ''}
          `}
        >
          {isExecuting ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : (
            <div className="w-5 h-5 flex items-center justify-center">
              {nodeIcon}
            </div>
          )}
        </div>

        {/* Label */}
        {label && (
          <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight truncate w-full px-1">
            {label}
          </span>
        )}
      </div>

      {/* Execution status badge (top-right) */}
      {statusState !== 'idle' && (
        <div className={`n8n-exec-badge ${statusState}`}>
          {isExecuting && (
            <Loader2 className="w-3 h-3 text-white animate-spin" />
          )}
          {hasResult && !isExecuting && (
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          )}
          {hasError && !isExecuting && (
            <X className="w-3 h-3 text-white" strokeWidth={3} />
          )}
        </div>
      )}

      {/* Configured indicator (small dot, top-right) */}
      {isConfigured && statusState === 'idle' && (
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-400 rounded-full flex items-center justify-center border border-white z-10">
          <Settings className="w-2 h-2 text-white" />
        </div>
      )}

      {/* Unconfigured warning bar */}
      {!isConfigured && statusState === 'idle' && (
        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-amber-400 rounded-full" />
      )}

      {/* Item count badge (n8n style - below node) */}
      {itemCount !== undefined && itemCount > 0 && (
        <div
          className={`n8n-item-count ${
            hasError
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {itemCount} item{itemCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

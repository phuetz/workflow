/**
 * Node Disable Toggle Component
 * Visual indicator and toggle for disabled nodes (like n8n)
 */

import React, { useCallback } from 'react';
import { Power, PowerOff, AlertCircle } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface NodeDisableToggleProps {
  nodeId: string;
  compact?: boolean;
}

const NodeDisableToggle: React.FC<NodeDisableToggleProps> = ({
  nodeId,
  compact = false,
}) => {
  const { nodes, updateNode } = useWorkflowStore();

  const node = nodes.find(n => n.id === nodeId);
  const isDisabled = (node?.data as any)?.disabled || false;

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    updateNode(nodeId, { disabled: !isDisabled });
  }, [nodeId, isDisabled, updateNode]);

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        className={`
          p-1 rounded transition-colors
          ${isDisabled
            ? 'bg-red-100 text-red-600 hover:bg-red-200'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }
        `}
        title={isDisabled ? 'Enable node' : 'Disable node'}
      >
        {isDisabled ? <PowerOff size={14} /> : <Power size={14} />}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
          transition-all duration-200
          ${isDisabled
            ? 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200'
            : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
          }
        `}
      >
        {isDisabled ? (
          <>
            <PowerOff size={16} />
            <span>Disabled</span>
          </>
        ) : (
          <>
            <Power size={16} />
            <span>Enabled</span>
          </>
        )}
      </button>

      {isDisabled && (
        <div className="flex items-center gap-1 text-xs text-amber-600">
          <AlertCircle size={12} />
          <span>This node will be skipped during execution</span>
        </div>
      )}
    </div>
  );
};

// Overlay component for disabled nodes
export const DisabledNodeOverlay: React.FC<{ nodeId: string }> = ({ nodeId }) => {
  const { nodes, updateNode } = useWorkflowStore();

  const node = nodes.find(n => n.id === nodeId);
  const isDisabled = (node?.data as any)?.disabled || false;

  if (!isDisabled) return null;

  return (
    <div
      className="absolute inset-0 bg-gray-900/30 rounded-lg z-10 flex items-center justify-center cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        updateNode(nodeId, { disabled: false });
      }}
      title="Click to enable node"
    >
      <div className="bg-white/90 rounded-full p-2 shadow-lg">
        <PowerOff size={20} className="text-red-500" />
      </div>

      {/* Diagonal stripes pattern */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <pattern
          id={`stripes-${nodeId}`}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="8"
            stroke="#ef4444"
            strokeWidth="2"
          />
        </pattern>
        <rect width="100%" height="100%" fill={`url(#stripes-${nodeId})`} />
      </svg>
    </div>
  );
};

export default NodeDisableToggle;

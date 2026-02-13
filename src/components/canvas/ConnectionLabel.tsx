/**
 * Connection Label Component
 * Shows data count and animations on edges (like n8n)
 */

import React, { useMemo } from 'react';
import { EdgeLabelRenderer, getBezierPath, BaseEdge, EdgeProps } from '@xyflow/react';
import { useWorkflowStore } from '../../store/workflowStore';

interface ConnectionLabelData {
  label?: string;
  itemCount?: number;
  animated?: boolean;
  condition?: string;
}

const ConnectionLabelComponent: React.FC<EdgeProps<ConnectionLabelData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  selected,
}) => {
  const { nodeExecutionStatus, executionResults, isExecuting } = useWorkflowStore();

  // Get edge path for bezier curve
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  // Get item count from execution results
  const sourceNodeId = id.split('__')[0] || id.split('-')[0];
  const itemCount = useMemo(() => {
    if (data?.itemCount !== undefined) return data.itemCount;
    const result = executionResults?.[sourceNodeId];
    if (Array.isArray(result)) return result.length;
    if (result && typeof result === 'object') return Object.keys(result).length;
    return null;
  }, [data?.itemCount, executionResults, sourceNodeId]);

  // Determine if this edge is active (connected to running node)
  const isActive = useMemo(() => {
    if (!isExecuting) return false;
    const sourceStatus = nodeExecutionStatus[sourceNodeId];
    return sourceStatus === 'running' || sourceStatus === 'success';
  }, [isExecuting, nodeExecutionStatus, sourceNodeId]);

  // Get edge style based on status
  const edgeStyle = useMemo(() => {
    const baseStyle = {
      strokeWidth: selected ? 3 : 2,
      transition: 'all 0.3s ease',
      ...style,
    };

    if (isActive) {
      return {
        ...baseStyle,
        stroke: '#3b82f6',
        strokeWidth: 3,
        filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))',
      };
    }

    if (selected) {
      return {
        ...baseStyle,
        stroke: '#6366f1',
      };
    }

    return baseStyle;
  }, [isActive, selected, style]);

  return (
    <>
      {/* The edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        markerEnd={markerEnd}
      />

      {/* Data flow animation particles */}
      {isActive && (
        <circle r="4" fill="#3b82f6" className="animate-flow">
          <animateMotion dur="1s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {/* Label renderer */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {/* Item count badge */}
          {itemCount !== null && itemCount > 0 && (
            <div
              className={`
                px-2 py-0.5 rounded-full text-xs font-medium
                transition-all duration-300 cursor-default
                ${isActive
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-110'
                  : selected
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                }
              `}
              title={`${itemCount} item${itemCount > 1 ? 's' : ''}`}
            >
              {itemCount > 99 ? '99+' : itemCount}
            </div>
          )}

          {/* Custom label */}
          {data?.label && !itemCount && (
            <div
              className={`
                px-2 py-1 rounded text-xs font-medium
                ${selected
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-white text-gray-600 border border-gray-200 shadow-sm'
                }
              `}
            >
              {data.label}
            </div>
          )}

          {/* Condition label (for if/switch branches) */}
          {data?.condition && (
            <div
              className={`
                mt-1 px-2 py-0.5 rounded text-xs
                ${data.condition === 'true'
                  ? 'bg-green-100 text-green-700'
                  : data.condition === 'false'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
                }
              `}
            >
              {data.condition}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>

      {/* CSS for animation */}
      <style>{`
        @keyframes flow {
          from {
            offset-distance: 0%;
          }
          to {
            offset-distance: 100%;
          }
        }
        .animate-flow {
          offset-path: path('${edgePath}');
          animation: flow 1s linear infinite;
        }
      `}</style>
    </>
  );
};

export const ConnectionLabel = React.memo(ConnectionLabelComponent, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.sourceX === next.sourceX &&
    prev.sourceY === next.sourceY &&
    prev.targetX === next.targetX &&
    prev.targetY === next.targetY &&
    prev.sourcePosition === next.sourcePosition &&
    prev.targetPosition === next.targetPosition &&
    prev.selected === next.selected &&
    prev.data?.itemCount === next.data?.itemCount &&
    prev.data?.label === next.data?.label &&
    prev.data?.condition === next.data?.condition
  );
});

export default ConnectionLabel;

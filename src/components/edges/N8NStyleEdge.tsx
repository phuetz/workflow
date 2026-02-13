/**
 * N8N-Style Edge Component
 * Pronounced, animated connection lines with glow effects
 * Reference: n8n 2.0 visual design patterns
 */

import React, { memo, useMemo } from 'react';
import {
  BaseEdge,
  EdgeProps,
  getSmoothStepPath,
  getBezierPath,
  EdgeLabelRenderer,
} from '@xyflow/react';

// ============================================================================
// Types
// ============================================================================

type EdgeVariant = 'default' | 'success' | 'error' | 'executing' | 'selected' | 'dimmed';

interface N8NEdgeData {
  variant?: EdgeVariant;
  label?: string;
  itemCount?: number;
  animated?: boolean;
  pathType?: 'smoothstep' | 'bezier' | 'straight';
  onAddNode?: (sourceId: string, targetId: string, position: { x: number; y: number }) => void;
}

// ============================================================================
// Edge Styles Configuration
// ============================================================================

const edgeStyles: Record<EdgeVariant, {
  stroke: string;
  strokeWidth: number;
  filter?: string;
  animation?: string;
}> = {
  default: {
    stroke: '#94a3b8',
    strokeWidth: 2,
  },
  success: {
    stroke: '#22c55e',
    strokeWidth: 2.5,
    filter: 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.5))',
  },
  error: {
    stroke: '#ef4444',
    strokeWidth: 2.5,
    filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))',
  },
  executing: {
    stroke: '#3b82f6',
    strokeWidth: 2.5,
    filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  selected: {
    stroke: '#6366f1',
    strokeWidth: 3,
    filter: 'drop-shadow(0 0 6px rgba(99, 102, 241, 0.5))',
  },
  dimmed: {
    stroke: '#cbd5e1',
    strokeWidth: 1.5,
  },
};

// ============================================================================
// Animated Flow Dots
// ============================================================================

const FlowDots: React.FC<{
  path: string;
  color: string;
  speed?: number;
}> = ({ path, color, speed = 2 }) => {
  return (
    <>
      <circle r="3" fill={color}>
        <animateMotion
          dur={`${speed}s`}
          repeatCount="indefinite"
          path={path}
        />
      </circle>
      <circle r="3" fill={color} opacity="0.5">
        <animateMotion
          dur={`${speed}s`}
          repeatCount="indefinite"
          path={path}
          begin={`${speed / 3}s`}
        />
      </circle>
      <circle r="3" fill={color} opacity="0.3">
        <animateMotion
          dur={`${speed}s`}
          repeatCount="indefinite"
          path={path}
          begin={`${speed * 2 / 3}s`}
        />
      </circle>
    </>
  );
};

// ============================================================================
// Edge Label Badge
// ============================================================================

const EdgeLabelBadge: React.FC<{
  label?: string;
  itemCount?: number;
  variant: EdgeVariant;
  labelX: number;
  labelY: number;
}> = ({ label, itemCount, variant, labelX, labelY }) => {
  if (!label && itemCount === undefined) return null;

  const badgeColors = {
    default: 'bg-gray-100 text-gray-700 border-gray-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    executing: 'bg-blue-50 text-blue-700 border-blue-200',
    selected: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dimmed: 'bg-gray-50 text-gray-500 border-gray-100',
  };

  return (
    <EdgeLabelRenderer>
      <div
        className={`
          absolute px-2 py-0.5 rounded-full text-xs font-medium
          border shadow-sm pointer-events-none
          ${badgeColors[variant]}
        `}
        style={{
          transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
        }}
      >
        {itemCount !== undefined ? `${itemCount} items` : label}
      </div>
    </EdgeLabelRenderer>
  );
};

// ============================================================================
// Plus Button (Add node between)
// ============================================================================

const AddNodeButton: React.FC<{
  x: number;
  y: number;
  onClick?: () => void;
}> = ({ x, y, onClick }) => {
  return (
    <EdgeLabelRenderer>
      <button
        onClick={onClick}
        className="
          absolute w-6 h-6 rounded-full
          bg-white dark:bg-gray-800
          border-2 border-gray-300 dark:border-gray-600
          flex items-center justify-center
          opacity-0 group-hover:opacity-100
          hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20
          transition-all duration-200
          shadow-md hover:shadow-lg
          z-10
        "
        style={{
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
        }}
      >
        <svg className="w-3 h-3 text-gray-500 hover:text-primary-500" viewBox="0 0 12 12">
          <path
            d="M6 2v8M2 6h8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </EdgeLabelRenderer>
  );
};

// ============================================================================
// Main N8N Style Edge Component
// ============================================================================

export const N8NStyleEdge = memo<EdgeProps<N8NEdgeData>>(({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}) => {
  const {
    variant = 'default',
    label,
    itemCount,
    animated = false,
    pathType = 'smoothstep',
    onAddNode,
  } = data || {};

  // Determine actual variant based on selection state
  const actualVariant = selected ? 'selected' : variant;
  const style = edgeStyles[actualVariant];

  // Calculate path based on type
  const [edgePath, labelX, labelY] = useMemo(() => {
    if (pathType === 'bezier') {
      return getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
      });
    }
    return getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: 16,
    });
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, pathType]);

  // Should show flowing animation
  const showFlowAnimation = animated || actualVariant === 'executing';

  return (
    <g className="group">
      {/* Invisible wider path for easier selection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="cursor-pointer"
      />

      {/* Glow effect layer */}
      {(actualVariant === 'success' || actualVariant === 'error' || actualVariant === 'executing' || actualVariant === 'selected') && (
        <path
          d={edgePath}
          fill="none"
          stroke={style.stroke}
          strokeWidth={style.strokeWidth + 4}
          strokeOpacity={0.2}
          className="transition-all duration-300"
        />
      )}

      {/* Main edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: style.stroke,
          strokeWidth: style.strokeWidth,
          filter: style.filter,
          transition: 'all 0.3s ease',
        }}
      />

      {/* Animated dashed overlay for executing state */}
      {actualVariant === 'executing' && (
        <path
          d={edgePath}
          fill="none"
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          strokeDasharray="8 4"
          className="animate-[dash_0.5s_linear_infinite]"
        />
      )}

      {/* Flow dots animation */}
      {showFlowAnimation && (
        <FlowDots
          path={edgePath}
          color={style.stroke}
          speed={actualVariant === 'executing' ? 1 : 2}
        />
      )}

      {/* Label badge */}
      <EdgeLabelBadge
        label={label}
        itemCount={itemCount}
        variant={actualVariant}
        labelX={labelX}
        labelY={labelY}
      />

      {/* Add node button (shown on hover) */}
      <AddNodeButton
        x={labelX}
        y={labelY}
        onClick={onAddNode ? () => onAddNode(source, target, { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2 }) : undefined}
      />
    </g>
  );
});

N8NStyleEdge.displayName = 'N8NStyleEdge';

// ============================================================================
// Error Branch Edge
// ============================================================================

export const ErrorBranchEdge = memo<EdgeProps<N8NEdgeData>>(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  return (
    <g className="group">
      {/* Selection area */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="cursor-pointer"
      />

      {/* Glow */}
      <path
        d={edgePath}
        fill="none"
        stroke="#ef4444"
        strokeWidth={6}
        strokeOpacity={0.15}
      />

      {/* Main path - dashed for error branch */}
      <path
        d={edgePath}
        fill="none"
        stroke="#ef4444"
        strokeWidth={selected ? 3 : 2}
        strokeDasharray="6 4"
        markerEnd={markerEnd}
        style={{
          filter: selected ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))' : undefined,
        }}
      />

      {/* Error label */}
      <EdgeLabelRenderer>
        <div
          className="
            absolute px-2 py-0.5 rounded-full text-xs font-medium
            bg-red-50 text-red-600 border border-red-200
            pointer-events-none
          "
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          On Error
        </div>
      </EdgeLabelRenderer>
    </g>
  );
});

ErrorBranchEdge.displayName = 'ErrorBranchEdge';

// ============================================================================
// Conditional Branch Edge
// ============================================================================

export const ConditionalEdge = memo<EdgeProps<N8NEdgeData & { condition?: string }>>(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}) => {
  const { condition = 'true' } = data || {};
  const isTrue = condition === 'true';

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  const color = isTrue ? '#22c55e' : '#f59e0b';

  return (
    <g className="group">
      {/* Selection area */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="cursor-pointer"
      />

      {/* Glow */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeOpacity={0.15}
      />

      {/* Main path */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={selected ? 3 : 2}
        markerEnd={markerEnd}
        style={{
          filter: selected ? `drop-shadow(0 0 4px ${color}66)` : undefined,
        }}
      />

      {/* Condition label */}
      <EdgeLabelRenderer>
        <div
          className={`
            absolute px-2 py-0.5 rounded-full text-xs font-medium
            pointer-events-none
            ${isTrue
              ? 'bg-green-50 text-green-600 border border-green-200'
              : 'bg-amber-50 text-amber-600 border border-amber-200'
            }
          `}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {isTrue ? 'True' : 'False'}
        </div>
      </EdgeLabelRenderer>
    </g>
  );
});

ConditionalEdge.displayName = 'ConditionalEdge';

// ============================================================================
// Connection Line (During drag)
// ============================================================================

export const N8NConnectionLine: React.FC<{
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  connectionStatus?: 'valid' | 'invalid' | 'pending';
}> = ({ fromX, fromY, toX, toY, connectionStatus = 'pending' }) => {
  const colors = {
    valid: '#22c55e',
    invalid: '#ef4444',
    pending: '#6366f1',
  };

  const color = colors[connectionStatus];

  // Calculate control points for smooth bezier
  const controlPointX1 = fromX + Math.min((toX - fromX) / 2, 100);
  const controlPointX2 = toX - Math.min((toX - fromX) / 2, 100);

  const path = `M ${fromX} ${fromY} C ${controlPointX1} ${fromY}, ${controlPointX2} ${toY}, ${toX} ${toY}`;

  return (
    <g>
      {/* Glow */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeOpacity={0.2}
        className="animate-pulse"
      />

      {/* Dashed line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray="8 4"
        className="animate-[dash_0.5s_linear_infinite]"
      />

      {/* End dot */}
      <circle
        cx={toX}
        cy={toY}
        r={6}
        fill={color}
        className="animate-pulse"
      />
    </g>
  );
};

// ============================================================================
// Edge Types Export
// ============================================================================

export const n8nEdgeTypes = {
  default: N8NStyleEdge,
  error: ErrorBranchEdge,
  conditional: ConditionalEdge,
};

export default N8NStyleEdge;

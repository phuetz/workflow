/**
 * Connection Preview Line
 * Preview connection while dragging (like n8n)
 */

import React, { useMemo } from 'react';
import { getBezierPath, Position } from '@xyflow/react';

interface ConnectionPreviewLineProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  fromPosition: Position;
  toPosition: Position;
  connectionType?: 'default' | 'success' | 'error' | 'conditional';
  isValid?: boolean;
  targetNodeType?: string;
  animated?: boolean;
}

const ConnectionPreviewLine: React.FC<ConnectionPreviewLineProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition = Position.Right,
  toPosition = Position.Left,
  connectionType = 'default',
  isValid = true,
  targetNodeType,
  animated = true,
}) => {
  // Calculate bezier path
  const [path, labelX, labelY] = useMemo(() => {
    return getBezierPath({
      sourceX: fromX,
      sourceY: fromY,
      sourcePosition: fromPosition,
      targetX: toX,
      targetY: toY,
      targetPosition: toPosition,
      curvature: 0.25,
    });
  }, [fromX, fromY, toX, toY, fromPosition, toPosition]);

  // Get color based on connection type and validity
  const getColors = () => {
    if (!isValid) {
      return {
        stroke: '#EF4444',
        fill: '#FEE2E2',
        glow: 'rgba(239, 68, 68, 0.3)',
      };
    }

    switch (connectionType) {
      case 'success':
        return {
          stroke: '#10B981',
          fill: '#D1FAE5',
          glow: 'rgba(16, 185, 129, 0.3)',
        };
      case 'error':
        return {
          stroke: '#F59E0B',
          fill: '#FEF3C7',
          glow: 'rgba(245, 158, 11, 0.3)',
        };
      case 'conditional':
        return {
          stroke: '#8B5CF6',
          fill: '#EDE9FE',
          glow: 'rgba(139, 92, 246, 0.3)',
        };
      default:
        return {
          stroke: '#3B82F6',
          fill: '#DBEAFE',
          glow: 'rgba(59, 130, 246, 0.3)',
        };
    }
  };

  const colors = getColors();

  // Calculate distance for animation speed
  const distance = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
  const animationDuration = Math.max(0.5, distance / 500);

  return (
    <g className="connection-preview-line">
      {/* Glow effect */}
      <defs>
        <filter id="connection-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id={`gradient-${connectionType}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colors.stroke} stopOpacity="0.5" />
          <stop offset="50%" stopColor={colors.stroke} stopOpacity="1" />
          <stop offset="100%" stopColor={colors.stroke} stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* Background glow path */}
      <path
        d={path}
        fill="none"
        stroke={colors.glow}
        strokeWidth={12}
        strokeLinecap="round"
        filter="url(#connection-glow)"
        opacity={0.5}
      />

      {/* Main path */}
      <path
        d={path}
        fill="none"
        stroke={colors.stroke}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={animated ? '8 4' : undefined}
        className={animated ? 'animate-dash' : ''}
        style={{
          animation: animated ? `dash ${animationDuration}s linear infinite` : undefined,
        }}
      />

      {/* Connection endpoint indicator */}
      <circle
        cx={toX}
        cy={toY}
        r={8}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={2}
        className="animate-pulse"
      />

      {/* Valid/Invalid indicator at endpoint */}
      {!isValid && (
        <g transform={`translate(${toX - 6}, ${toY - 6})`}>
          <circle cx={6} cy={6} r={8} fill="#EF4444" />
          <text
            x={6}
            y={10}
            textAnchor="middle"
            fill="white"
            fontSize={12}
            fontWeight="bold"
          >
            ×
          </text>
        </g>
      )}

      {/* Target node type indicator */}
      {targetNodeType && isValid && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x={-30}
            y={-12}
            width={60}
            height={24}
            rx={12}
            fill="white"
            stroke={colors.stroke}
            strokeWidth={1}
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            fill={colors.stroke}
            fontSize={10}
            fontWeight="500"
          >
            {targetNodeType.length > 8 ? targetNodeType.slice(0, 8) + '...' : targetNodeType}
          </text>
        </g>
      )}

      {/* Animated particles along path */}
      {animated && isValid && (
        <>
          <circle r={4} fill={colors.stroke}>
            <animateMotion
              dur={`${animationDuration}s`}
              repeatCount="indefinite"
              path={path}
            />
          </circle>
          <circle r={3} fill={colors.stroke} opacity={0.5}>
            <animateMotion
              dur={`${animationDuration}s`}
              repeatCount="indefinite"
              path={path}
              begin={`${animationDuration / 3}s`}
            />
          </circle>
          <circle r={2} fill={colors.stroke} opacity={0.3}>
            <animateMotion
              dur={`${animationDuration}s`}
              repeatCount="indefinite"
              path={path}
              begin={`${(animationDuration * 2) / 3}s`}
            />
          </circle>
        </>
      )}

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -12;
          }
        }
      `}</style>
    </g>
  );
};

// Export edge component for ReactFlow
export const ConnectionPreviewEdge = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  ...props
}: any) => {
  return (
    <ConnectionPreviewLine
      fromX={sourceX}
      fromY={sourceY}
      toX={targetX}
      toY={targetY}
      fromPosition={sourcePosition}
      toPosition={targetPosition}
      connectionType={data?.connectionType}
      isValid={data?.isValid !== false}
      targetNodeType={data?.targetNodeType}
      animated={data?.animated !== false}
    />
  );
};

export default ConnectionPreviewLine;

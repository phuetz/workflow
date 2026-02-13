/**
 * LineageEdge - SVG component for rendering edges between lineage nodes
 */

import React from 'react';
import { LineageEdgeProps } from './types';

export const LineageEdge: React.FC<LineageEdgeProps> = ({
  edge,
  highlighted,
  hovered,
  showFieldMappings,
  onClick,
  onMouseEnter,
  onMouseLeave
}) => {
  const strokeColor = highlighted ? '#7c3aed' : hovered ? '#4b5563' : edge.color;
  const strokeWidth = highlighted ? 3 : hovered ? 2.5 : edge.width;
  const markerEnd = highlighted ? 'url(#arrowhead-highlighted)' : 'url(#arrowhead)';

  if (!edge.path) return null;

  // Parse path to get midpoint for label
  const pathParts = edge.path.split(' ');
  const midX = parseFloat(pathParts[7] || '0');
  const midY = parseFloat(pathParts[8] || '0');

  return (
    <g
      className="cursor-pointer transition-all duration-200"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Edge path */}
      <path
        d={edge.path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        markerEnd={markerEnd}
        className={`transition-all duration-200 ${edge.animated ? 'animate-pulse' : ''}`}
        strokeDasharray={edge.animated ? '5,5' : undefined}
      />

      {/* Hover hitbox */}
      <path
        d={edge.path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
      />

      {/* Edge label */}
      {edge.label && (
        <g transform={`translate(${midX}, ${midY - 10})`}>
          <rect
            x={-30}
            y={-8}
            width={60}
            height={16}
            rx={4}
            fill="white"
            stroke="#e5e7eb"
            strokeWidth={1}
          />
          <text
            x={0}
            y={4}
            fill="#374151"
            fontSize="10"
            textAnchor="middle"
          >
            {edge.label.length > 10 ? edge.label.substring(0, 10) + '...' : edge.label}
          </text>
        </g>
      )}

      {/* Field mappings indicator */}
      {showFieldMappings && edge.fieldMappings.length > 0 && (
        <g transform={`translate(${midX}, ${midY + 10})`}>
          <circle r={8} fill="#7c3aed" />
          <text
            x={0}
            y={4}
            fill="white"
            fontSize="9"
            fontWeight="600"
            textAnchor="middle"
          >
            {edge.fieldMappings.length}
          </text>
        </g>
      )}
    </g>
  );
};

export default LineageEdge;

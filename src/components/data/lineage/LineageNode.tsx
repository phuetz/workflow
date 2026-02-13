/**
 * LineageNode - SVG component for rendering individual lineage nodes
 */

import React from 'react';
import { LineageNodeProps } from './types';

const TYPE_ICONS: Record<string, string> = {
  source: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4',
  transform: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  destination: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  unknown: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
};

export const LineageNode: React.FC<LineageNodeProps> = ({
  node,
  selected,
  highlighted,
  hovered,
  showMetrics,
  showFields,
  selectedField,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFieldClick
}) => {
  const strokeColor = selected ? '#1d4ed8' : highlighted ? '#7c3aed' : hovered ? '#4b5563' : '#9ca3af';
  const strokeWidth = selected ? 3 : highlighted ? 2.5 : hovered ? 2 : 1;
  const filter = highlighted ? 'url(#glow)' : 'url(#shadow)';

  return (
    <g
      className="cursor-pointer transition-all duration-200"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      filter={filter}
    >
      {/* Node background */}
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        fill={node.color}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        rx={8}
        className="transition-all duration-200"
      />

      {/* Node type icon */}
      <g transform={`translate(${node.x + 12}, ${node.y + 12})`}>
        <circle cx="10" cy="10" r="12" fill="rgba(255,255,255,0.2)" />
        <svg x="-2" y="-2" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d={TYPE_ICONS[node.type] || TYPE_ICONS.unknown}
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </g>

      {/* Node label */}
      <text
        x={node.x + 40}
        y={node.y + 28}
        fill="#fff"
        fontSize="14"
        fontWeight="600"
        className="pointer-events-none"
      >
        {node.label.length > 18 ? node.label.substring(0, 18) + '...' : node.label}
      </text>

      {/* Node type */}
      <text
        x={node.x + 40}
        y={node.y + 46}
        fill="rgba(255,255,255,0.85)"
        fontSize="11"
        className="pointer-events-none"
      >
        {node.metadata.nodeType}
      </text>

      {/* Metrics display */}
      {showMetrics && (
        <>
          <text
            x={node.x + 12}
            y={node.y + node.height - 12}
            fill="rgba(255,255,255,0.9)"
            fontSize="10"
            fontWeight="500"
            className="pointer-events-none"
          >
            {node.metadata.recordCount.toLocaleString()} records
          </text>

          {node.metadata.sensitivity && (
            <g transform={`translate(${node.x + node.width - 50}, ${node.y + 8})`}>
              <rect
                width="42"
                height="16"
                rx="3"
                fill="rgba(0,0,0,0.3)"
              />
              <text
                x="21"
                y="12"
                fill="#fff"
                fontSize="8"
                fontWeight="500"
                textAnchor="middle"
                className="pointer-events-none"
              >
                {node.metadata.sensitivity.toUpperCase()}
              </text>
            </g>
          )}
        </>
      )}

      {/* Fields display */}
      {showFields && node.fields.length > 0 && (
        <g transform={`translate(${node.x}, ${node.y + 60})`}>
          {node.fields.slice(0, 4).map((field, index) => (
            <g
              key={field.name}
              transform={`translate(8, ${index * 16})`}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onFieldClick(field.name);
              }}
            >
              <rect
                x={0}
                y={0}
                width={node.width - 16}
                height={14}
                fill={selectedField === field.name ? 'rgba(124, 58, 237, 0.5)' : 'rgba(255,255,255,0.1)'}
                rx={2}
                className="hover:fill-[rgba(255,255,255,0.2)] transition-colors"
              />
              <text
                x={4}
                y={10}
                fill={field.isPII ? '#fbbf24' : '#fff'}
                fontSize="9"
                fontWeight={field.isKey ? '600' : '400'}
                className="pointer-events-none"
              >
                {field.isPII && '* '}{field.name}: {field.type}
              </text>
            </g>
          ))}
          {node.fields.length > 4 && (
            <text
              x={8}
              y={4 * 16 + 10}
              fill="rgba(255,255,255,0.6)"
              fontSize="9"
              className="pointer-events-none"
            >
              +{node.fields.length - 4} more fields
            </text>
          )}
        </g>
      )}
    </g>
  );
};

export default LineageNode;

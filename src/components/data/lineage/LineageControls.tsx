/**
 * LineageControls - Zoom and pan controls for lineage viewer
 */

import React from 'react';
import { LineageControlsProps, LineageMiniMapProps, VisualNode, VisualizationStats } from './types';

export const LineageControls: React.FC<LineageControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom
}) => {
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2">
      <button
        onClick={onZoomIn}
        className="p-2 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="Zoom In (+)"
      >
        <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <div className="px-2 py-1 bg-white dark:bg-gray-800 rounded shadow text-xs text-center text-gray-600 dark:text-gray-400">
        {Math.round(zoom * 100)}%
      </div>
      <button
        onClick={onZoomOut}
        className="p-2 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="Zoom Out (-)"
      >
        <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>
      <button
        onClick={onResetZoom}
        className="p-2 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="Reset View (0)"
      >
        <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
};

export const LineageMiniMap: React.FC<LineageMiniMapProps> = ({
  nodes,
  stats,
  pan,
  zoom,
  viewWidth,
  viewHeight
}) => {
  return (
    <div className="absolute top-4 right-4 w-32 h-24 bg-white/80 dark:bg-gray-800/80 rounded shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
      <svg viewBox={`0 0 ${stats.estimatedWidth} ${stats.estimatedHeight}`} className="w-full h-full">
        {nodes.map(node => (
          <rect
            key={node.id}
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            fill={node.color}
            opacity={0.6}
          />
        ))}
        <rect
          x={-pan.x / zoom}
          y={-pan.y / zoom}
          width={viewWidth}
          height={viewHeight}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={4}
          opacity={0.5}
        />
      </svg>
    </div>
  );
};

export const LineageLegend: React.FC<{ stats: VisualizationStats }> = ({ stats }) => {
  return (
    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4 text-xs">
      <span className="text-gray-500 dark:text-gray-400">Legend:</span>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded bg-blue-600" />
        <span className="text-gray-600 dark:text-gray-400">Source ({stats.sources})</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded bg-violet-600" />
        <span className="text-gray-600 dark:text-gray-400">Transform ({stats.transforms})</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded bg-green-600" />
        <span className="text-gray-600 dark:text-gray-400">Destination ({stats.destinations})</span>
      </div>
    </div>
  );
};

export const LineageSvgDefs: React.FC = () => {
  return (
    <defs>
      {/* Arrow marker */}
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
      </marker>
      <marker
        id="arrowhead-highlighted"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#7c3aed" />
      </marker>

      {/* Drop shadow filter */}
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.15" />
      </filter>

      {/* Glow filter for highlighted elements */}
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Grid pattern */}
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
      </pattern>
    </defs>
  );
};

export default LineageControls;

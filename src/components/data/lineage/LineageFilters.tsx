/**
 * LineageFilters - Toolbar with filtering and view options
 */

import React from 'react';
import { LineageFiltersProps, LineageVisualizationOptions } from './types';

export const LineageFilters: React.FC<LineageFiltersProps> = ({
  options,
  stats,
  selectedField,
  showFieldPanel,
  onOptionsChange,
  onFieldPanelToggle,
  onClearFieldSelection
}) => {
  const updateOption = <K extends keyof LineageVisualizationOptions>(
    key: K,
    value: LineageVisualizationOptions[K]
  ) => {
    onOptionsChange({ ...options, [key]: value });
  };

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Data Lineage</h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
              {stats.totalNodes} nodes
            </span>
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
              {stats.totalEdges} edges
            </span>
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
              {stats.maxLevel + 1} levels
            </span>
          </div>
        </div>

        {/* View Options */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Layout Selection */}
          <select
            value={options.layout}
            onChange={e => updateOption('layout', e.target.value as LineageVisualizationOptions['layout'])}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="dagre">Dagre</option>
            <option value="hierarchical">Hierarchical</option>
            <option value="force-directed">Force Directed</option>
          </select>

          {/* Orientation */}
          <select
            value={options.orientation}
            onChange={e => updateOption('orientation', e.target.value as LineageVisualizationOptions['orientation'])}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>

          {/* Color By */}
          <select
            value={options.colorBy}
            onChange={e => updateOption('colorBy', e.target.value as LineageVisualizationOptions['colorBy'])}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="status">By Type</option>
            <option value="sensitivity">By Sensitivity</option>
            <option value="compliance">By Compliance</option>
          </select>

          {/* Toggle Options */}
          <button
            onClick={() => updateOption('showMetrics', !options.showMetrics)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              options.showMetrics
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Metrics
          </button>

          <button
            onClick={onFieldPanelToggle}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              showFieldPanel
                ? 'bg-violet-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Fields
          </button>

          <button
            onClick={() => updateOption('highlightCriticalPath', !options.highlightCriticalPath)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              options.highlightCriticalPath
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Critical Path
          </button>
        </div>
      </div>

      {/* Field tracing info */}
      {selectedField && (
        <div className="mt-3 flex items-center gap-2 p-2 bg-violet-50 dark:bg-violet-900/30 rounded">
          <span className="text-sm text-violet-800 dark:text-violet-200">
            Tracing field: <strong>{selectedField.field}</strong> from node <strong>{selectedField.nodeId}</strong>
          </span>
          <button
            onClick={onClearFieldSelection}
            className="ml-auto px-2 py-1 text-xs bg-violet-200 dark:bg-violet-800 text-violet-800 dark:text-violet-200 rounded hover:bg-violet-300 dark:hover:bg-violet-700"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default LineageFilters;

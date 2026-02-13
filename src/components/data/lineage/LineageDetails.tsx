/**
 * LineageDetails - Side panel for displaying node details
 */

import React from 'react';
import { LineageDetailsProps } from './types';

export const LineageDetails: React.FC<LineageDetailsProps> = ({
  nodeId,
  graph,
  onClose,
  onFieldClick
}) => {
  const node = graph.nodes.get(nodeId);

  if (!node) return null;

  return (
    <div className="absolute top-0 right-0 w-96 h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto shadow-xl">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Node Details</h4>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</label>
            <p className="text-gray-900 dark:text-white font-medium">{node.metadata.nodeName}</p>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</label>
            <p className="text-gray-900 dark:text-white">{node.metadata.nodeType}</p>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data Source</label>
            <p className="text-gray-900 dark:text-white font-medium">{node.dataSource.name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{node.dataSource.type}</p>
          </div>

          {/* Data Snapshot */}
          {node.dataSnapshot && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <label className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Records</label>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {node.dataSnapshot.recordCount.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <label className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">Size</label>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">
                    {(node.dataSnapshot.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              {/* Schema */}
              {Object.keys(node.dataSnapshot.schema).length > 0 && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                    Schema ({Object.keys(node.dataSnapshot.schema).length} fields)
                  </label>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {Object.entries(node.dataSnapshot.schema).map(([field, type]) => (
                      <button
                        key={field}
                        onClick={() => onFieldClick(field)}
                        className="w-full flex items-center justify-between px-2 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-left"
                      >
                        <span className="text-gray-900 dark:text-white font-mono">{field}</span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">{String(type)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Connections */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Upstream</label>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{node.upstreamNodes.length}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Downstream</label>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{node.downstreamNodes.length}</p>
            </div>
          </div>

          {/* Transformations */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transformations</label>
            <p className="text-gray-900 dark:text-white">{node.transformations.length}</p>
          </div>

          {/* Sensitivity */}
          {node.dataSource.metadata.sensitivity && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
              <label className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Sensitivity</label>
              <span className="inline-block mt-1 px-3 py-1 text-sm font-medium bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded">
                {node.dataSource.metadata.sensitivity}
              </span>
            </div>
          )}

          {/* Compliance */}
          {node.dataSource.metadata.complianceFrameworks && node.dataSource.metadata.complianceFrameworks.length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                Compliance Frameworks
              </label>
              <div className="flex flex-wrap gap-2">
                {node.dataSource.metadata.complianceFrameworks.map(framework => (
                  <span
                    key={framework}
                    className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                  >
                    {framework.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {node.dataSource.metadata.tags && node.dataSource.metadata.tags.length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {node.dataSource.metadata.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LineageDetails;

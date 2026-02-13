/**
 * Data Pinning Panel
 * UI for managing pinned data on nodes
 */

import React, { useState, useEffect } from 'react';
import { Pin, X, Eye, EyeOff, Download, Upload, Trash2, Info } from 'lucide-react';
import { dataPinningService, PinnedData } from '../../execution/DataPinning';
import { useWorkflowStore } from '../../store/workflowStore';
import { logger } from '../../services/SimpleLogger';

export default function DataPinningPanel() {
  const { nodes } = useWorkflowStore();
  const [pinnedDataList, setPinnedDataList] = useState<PinnedData[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  useEffect(() => {
    refreshPinnedData();
  }, [nodes]);

  const refreshPinnedData = () => {
    const allPinned = Array.from(dataPinningService.getAllPinnedData().values());
    setPinnedDataList(allPinned);
  };

  const handleUnpin = (nodeId: string) => {
    dataPinningService.unpinData(nodeId);
    refreshPinnedData();
    logger.info(`Unpinned data from node: ${nodeId}`);
  };

  const handleToggleDetails = (nodeId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const handleExport = () => {
    const exported = dataPinningService.exportPinnedData();
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pinned-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logger.info('Exported pinned data');
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const count = dataPinningService.importPinnedData(data);
      refreshPinnedData();
      logger.info(`Imported ${count} pinned data entries`);
    } catch (error) {
      logger.error('Failed to import pinned data:', error);
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all pinned data?')) {
      dataPinningService.clearAll();
      refreshPinnedData();
      logger.info('Cleared all pinned data');
    }
  };

  const getNodeInfo = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? {
      label: node.data.label,
      type: node.data.type,
      color: node.data.color
    } : null;
  };

  const stats = dataPinningService.getStats();

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Pin size={20} className="text-blue-600" />
            Pinned Data
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={pinnedDataList.length === 0}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export pinned data"
            >
              <Download size={18} />
            </button>
            <label className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
              <Upload size={18} />
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <button
              onClick={handleClearAll}
              disabled={pinnedDataList.length === 0}
              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear all pinned data"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-blue-50 rounded-lg p-2">
            <div className="text-blue-900 font-semibold">{stats.totalPinned}</div>
            <div className="text-blue-700 text-xs">Total Pinned</div>
          </div>
          <div className="bg-green-50 rounded-lg p-2">
            <div className="text-green-900 font-semibold">{stats.bySource.execution}</div>
            <div className="text-green-700 text-xs">From Execution</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-2">
            <div className="text-purple-900 font-semibold">{stats.bySource.manual}</div>
            <div className="text-purple-700 text-xs">Manual</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {pinnedDataList.length === 0 ? (
          <div className="text-center py-12">
            <Pin size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No pinned data</p>
            <p className="text-gray-400 text-xs mt-1">
              Pin data to nodes for testing
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pinnedDataList.map((pinned) => {
              const nodeInfo = getNodeInfo(pinned.nodeId);
              const isExpanded = showDetails[pinned.nodeId];

              return (
                <div
                  key={pinned.nodeId}
                  className={`border rounded-lg overflow-hidden transition-all ${
                    selectedNodeId === pinned.nodeId
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Header */}
                  <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {nodeInfo && (
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: nodeInfo.color }}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {nodeInfo?.label || pinned.nodeId}
                        </div>
                        {nodeInfo && (
                          <div className="text-xs text-gray-500">
                            {nodeInfo.type}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleDetails(pinned.nodeId)}
                        className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
                        title={isExpanded ? 'Hide details' : 'Show details'}
                      >
                        {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        onClick={() => handleUnpin(pinned.nodeId)}
                        className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Unpin data"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Details */}
                  {isExpanded && (
                    <div className="px-3 py-2 border-t border-gray-200">
                      {/* Metadata */}
                      <div className="text-xs text-gray-600 mb-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Source:</span>
                          <span className={`px-2 py-0.5 rounded ${
                            pinned.source === 'execution'
                              ? 'bg-green-100 text-green-800'
                              : pinned.source === 'manual'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {pinned.source}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Pinned:</span>{' '}
                          {new Date(pinned.timestamp).toLocaleString()}
                        </div>
                        {pinned.description && (
                          <div>
                            <span className="font-medium">Description:</span>{' '}
                            {pinned.description}
                          </div>
                        )}
                      </div>

                      {/* Data Preview */}
                      <div className="bg-gray-50 rounded p-2 max-h-64 overflow-auto">
                        <pre className="text-xs font-mono text-gray-800">
                          {JSON.stringify(pinned.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="px-4 py-3 border-t border-gray-200 bg-blue-50">
        <div className="flex items-start gap-2 text-xs text-blue-800">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">About Data Pinning</p>
            <p className="text-blue-700">
              Pinned data allows you to test nodes with fixed input data without
              executing upstream nodes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

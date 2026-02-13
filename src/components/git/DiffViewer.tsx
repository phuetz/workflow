/**
 * Diff Viewer Component
 * Visual diff display for workflow changes
 */

import React, { useState } from 'react';
import {
  WorkflowDiff,
  VisualWorkflowDiff,
  DiffLine,
} from '../../types/git';
import {
  Plus,
  Minus,
  Edit,
  GitBranch,
  Settings,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface DiffViewerProps {
  diff: WorkflowDiff;
  mode?: 'visual' | 'json' | 'split';
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diff,
  mode = 'visual',
}) => {
  const [activeMode, setActiveMode] = useState(mode);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNodeExpansion = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getComplexityBadge = (complexity: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };

    const icons = {
      low: Info,
      medium: AlertTriangle,
      high: AlertTriangle,
    };

    const Icon = icons[complexity as keyof typeof icons];

    return (
      <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${colors[complexity as keyof typeof colors]}`}>
        <Icon className="h-3 w-3" />
        {complexity.toUpperCase()} complexity
      </span>
    );
  };

  const renderVisualDiff = () => {
    const { visualDiff, summary } = diff;

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Total Changes</div>
              <div className="text-2xl font-bold text-gray-900">{summary.totalChanges}</div>
            </div>
            <div>
              <div className="text-gray-600">Nodes Changed</div>
              <div className="text-2xl font-bold text-blue-600">{summary.nodesChanged}</div>
            </div>
            <div>
              <div className="text-gray-600">Edges Changed</div>
              <div className="text-2xl font-bold text-purple-600">{summary.edgesChanged}</div>
            </div>
            <div>
              <div className="text-gray-600">Complexity</div>
              <div className="mt-1">{getComplexityBadge(summary.complexity)}</div>
            </div>
          </div>
        </div>

        {/* Added Nodes */}
        {visualDiff.nodesAdded.length > 0 && (
          <div className="border border-green-200 rounded-lg overflow-hidden">
            <div className="bg-green-50 px-4 py-2 border-b border-green-200">
              <div className="flex items-center gap-2 font-semibold text-green-900">
                <Plus className="h-4 w-4" />
                Added Nodes ({visualDiff.nodesAdded.length})
              </div>
            </div>
            <div className="divide-y divide-green-100">
              {visualDiff.nodesAdded.map((node) => (
                <div key={node.id} className="p-4 bg-green-50/30">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                      <Plus className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{node.name || node.type}</div>
                      <div className="text-sm text-gray-600">Type: {node.type}</div>
                      <div className="text-xs text-gray-500 font-mono mt-1">ID: {node.id}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modified Nodes */}
        {visualDiff.nodesModified.length > 0 && (
          <div className="border border-yellow-200 rounded-lg overflow-hidden">
            <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-200">
              <div className="flex items-center gap-2 font-semibold text-yellow-900">
                <Edit className="h-4 w-4" />
                Modified Nodes ({visualDiff.nodesModified.length})
              </div>
            </div>
            <div className="divide-y divide-yellow-100">
              {visualDiff.nodesModified.map((mod) => (
                <div key={mod.nodeId} className="bg-yellow-50/30">
                  <div
                    onClick={() => toggleNodeExpansion(mod.nodeId)}
                    className="p-4 cursor-pointer hover:bg-yellow-50/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 rounded flex items-center justify-center">
                        <Edit className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{mod.nodeName}</div>
                            <div className="text-sm text-gray-600">{mod.changes.length} changes</div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {expandedNodes.has(mod.nodeId) ? 'Click to collapse' : 'Click to expand'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {expandedNodes.has(mod.nodeId) && (
                    <div className="px-4 pb-4 space-y-2">
                      {mod.changes.map((change, idx) => (
                        <div key={idx} className="bg-white border border-yellow-200 rounded p-3">
                          <div className="text-sm font-medium text-gray-700 mb-2">{change.path}</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-red-50 border border-red-200 rounded p-2">
                              <div className="text-red-700 font-medium mb-1">Old Value:</div>
                              <div className="text-red-900 font-mono break-all">
                                {JSON.stringify(change.oldValue)}
                              </div>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded p-2">
                              <div className="text-green-700 font-medium mb-1">New Value:</div>
                              <div className="text-green-900 font-mono break-all">
                                {JSON.stringify(change.newValue)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deleted Nodes */}
        {visualDiff.nodesDeleted.length > 0 && (
          <div className="border border-red-200 rounded-lg overflow-hidden">
            <div className="bg-red-50 px-4 py-2 border-b border-red-200">
              <div className="flex items-center gap-2 font-semibold text-red-900">
                <Minus className="h-4 w-4" />
                Deleted Nodes ({visualDiff.nodesDeleted.length})
              </div>
            </div>
            <div className="divide-y divide-red-100">
              {visualDiff.nodesDeleted.map((node) => (
                <div key={node.id} className="p-4 bg-red-50/30">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded flex items-center justify-center">
                      <Minus className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{node.name || node.type}</div>
                      <div className="text-sm text-gray-600">Type: {node.type}</div>
                      <div className="text-xs text-gray-500 font-mono mt-1">ID: {node.id}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edge Changes */}
        {(visualDiff.edgesAdded.length > 0 || visualDiff.edgesDeleted.length > 0) && (
          <div className="border border-purple-200 rounded-lg overflow-hidden">
            <div className="bg-purple-50 px-4 py-2 border-b border-purple-200">
              <div className="flex items-center gap-2 font-semibold text-purple-900">
                <GitBranch className="h-4 w-4" />
                Connection Changes ({visualDiff.edgesAdded.length + visualDiff.edgesDeleted.length})
              </div>
            </div>
            <div className="p-4 space-y-2">
              {visualDiff.edgesAdded.map((edge) => (
                <div key={edge.id} className="flex items-center gap-2 text-sm text-green-800">
                  <Plus className="h-3 w-3" />
                  <span className="font-mono">{edge.source}</span>
                  <span>→</span>
                  <span className="font-mono">{edge.target}</span>
                </div>
              ))}
              {visualDiff.edgesDeleted.map((edge) => (
                <div key={edge.id} className="flex items-center gap-2 text-sm text-red-800">
                  <Minus className="h-3 w-3" />
                  <span className="font-mono">{edge.source}</span>
                  <span>→</span>
                  <span className="font-mono">{edge.target}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Changes */}
        {visualDiff.settingsChanged.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <div className="flex items-center gap-2 font-semibold text-gray-900">
                <Settings className="h-4 w-4" />
                Settings Changed ({visualDiff.settingsChanged.length})
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {visualDiff.settingsChanged.map((change, idx) => (
                <div key={idx} className="p-4 bg-gray-50/30">
                  <div className="font-medium text-gray-900 mb-2">{change.setting}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <div className="text-red-700 font-medium mb-1">Before:</div>
                      <div className="text-red-900 font-mono break-all">
                        {JSON.stringify(change.oldValue)}
                      </div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <div className="text-green-700 font-medium mb-1">After:</div>
                      <div className="text-green-900 font-mono break-all">
                        {JSON.stringify(change.newValue)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Changes */}
        {summary.totalChanges === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Info className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No changes detected</p>
          </div>
        )}
      </div>
    );
  };

  const renderJSONDiff = () => {
    const { gitDiff } = diff;

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-800 px-4 py-2 text-white flex items-center justify-between">
          <span className="font-mono text-sm">{gitDiff.file}</span>
          <div className="flex gap-4 text-xs">
            <span className="text-green-400">+{gitDiff.stats.additions}</span>
            <span className="text-red-400">-{gitDiff.stats.deletions}</span>
          </div>
        </div>

        <div className="bg-gray-50 font-mono text-sm overflow-x-auto">
          {gitDiff.hunks.map((hunk, hunkIdx) => (
            <div key={hunkIdx} className="border-b border-gray-200 last:border-b-0">
              <div className="bg-blue-50 px-4 py-1 text-xs text-blue-900">
                @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
              </div>
              {hunk.lines.map((line, lineIdx) => {
                const bgColor =
                  line.type === 'addition'
                    ? 'bg-green-50'
                    : line.type === 'deletion'
                    ? 'bg-red-50'
                    : 'bg-white';

                const textColor =
                  line.type === 'addition'
                    ? 'text-green-900'
                    : line.type === 'deletion'
                    ? 'text-red-900'
                    : 'text-gray-700';

                const prefix =
                  line.type === 'addition'
                    ? '+'
                    : line.type === 'deletion'
                    ? '-'
                    : ' ';

                return (
                  <div key={lineIdx} className={`${bgColor} px-4 py-0.5 ${textColor}`}>
                    <span className="inline-block w-8 text-gray-400 select-none">
                      {line.oldLineNumber || line.newLineNumber}
                    </span>
                    <span className="mr-2">{prefix}</span>
                    <span>{line.content}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveMode('visual')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeMode === 'visual'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Visual
        </button>
        <button
          onClick={() => setActiveMode('json')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeMode === 'json'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          JSON
        </button>
      </div>

      {/* Content */}
      {activeMode === 'visual' ? renderVisualDiff() : renderJSONDiff()}
    </div>
  );
};

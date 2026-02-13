/**
 * Node Input/Output Preview
 * Side-by-side comparison of input and output data (like n8n)
 */

import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  Database,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface NodeIOPreviewProps {
  nodeId: string;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'input' | 'output';

const NodeIOPreview: React.FC<NodeIOPreviewProps> = ({ nodeId, isOpen, onClose }) => {
  const { nodes, edges, executionResults, pinnedData, nodeExecutionStatus } = useWorkflowStore();
  const [activeTab, setActiveTab] = useState<TabType>('output');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['root']));

  // Get current node
  const node = nodes.find(n => n.id === nodeId);

  // Get input data (from connected source nodes)
  const inputData = useMemo(() => {
    const incomingEdges = edges.filter(e => e.target === nodeId);
    const sourceNodes = incomingEdges.map(e => {
      const sourceNode = nodes.find(n => n.id === e.source);
      const sourceData = executionResults?.[e.source] || pinnedData?.[e.source];
      return {
        nodeId: e.source,
        nodeName: sourceNode?.data?.label || sourceNode?.data?.type || 'Unknown',
        data: sourceData,
      };
    });
    return sourceNodes;
  }, [nodeId, nodes, edges, executionResults, pinnedData]);

  // Get output data
  const outputData = executionResults?.[nodeId] || pinnedData?.[nodeId];

  // Get execution status
  const status = nodeExecutionStatus[nodeId];

  // Toggle path expansion
  const togglePath = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  // Copy to clipboard
  const copyToClipboard = (data: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  // Render data tree
  const renderDataTree = (data: unknown, path: string = 'root', depth: number = 0): React.ReactNode => {
    if (data === null) return <span className="text-gray-400">null</span>;
    if (data === undefined) return <span className="text-gray-400">undefined</span>;

    if (Array.isArray(data)) {
      const isExpanded = expandedPaths.has(path);
      return (
        <div className="ml-2">
          <button
            onClick={() => togglePath(path)}
            className="flex items-center gap-1 text-purple-600 hover:text-purple-800"
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span className="text-xs font-medium">Array [{data.length}]</span>
          </button>
          {isExpanded && (
            <div className="ml-4 border-l-2 border-purple-100 pl-2 mt-1">
              {data.slice(0, 20).map((item, i) => (
                <div key={i} className="py-0.5">
                  <span className="text-gray-400 text-xs mr-2">[{i}]</span>
                  {renderDataTree(item, `${path}.${i}`, depth + 1)}
                </div>
              ))}
              {data.length > 20 && (
                <span className="text-xs text-gray-400">... {data.length - 20} more items</span>
              )}
            </div>
          )}
        </div>
      );
    }

    if (typeof data === 'object') {
      const entries = Object.entries(data as object);
      const isExpanded = expandedPaths.has(path);
      return (
        <div className="ml-2">
          <button
            onClick={() => togglePath(path)}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span className="text-xs font-medium">Object {'{'}...{'}'}</span>
          </button>
          {isExpanded && (
            <div className="ml-4 border-l-2 border-blue-100 pl-2 mt-1">
              {entries.slice(0, 30).map(([key, value]) => (
                <div key={key} className="py-0.5">
                  <span className="text-cyan-600 text-xs font-medium">{key}: </span>
                  {renderDataTree(value, `${path}.${key}`, depth + 1)}
                </div>
              ))}
              {entries.length > 30 && (
                <span className="text-xs text-gray-400">... {entries.length - 30} more keys</span>
              )}
            </div>
          )}
        </div>
      );
    }

    if (typeof data === 'string') {
      const display = data.length > 100 ? data.substring(0, 100) + '...' : data;
      return <span className="text-amber-600 text-xs">"{display}"</span>;
    }

    if (typeof data === 'number') {
      return <span className="text-green-600 text-xs">{data}</span>;
    }

    if (typeof data === 'boolean') {
      return (
        <span className={`text-xs px-1 py-0.5 rounded ${
          data ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {data.toString()}
        </span>
      );
    }

    return <span className="text-gray-600 text-xs">{String(data)}</span>;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-16 bottom-8 w-96 bg-white shadow-2xl border-l border-gray-200 z-40 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">
              {node?.data?.label || node?.data?.type || 'Node'}
            </h3>
            <div className="flex items-center gap-2">
              {status === 'success' && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle size={10} /> Success
                </span>
              )}
              {status === 'error' && (
                <span className="flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle size={10} /> Error
                </span>
              )}
              {status === 'running' && (
                <span className="flex items-center gap-1 text-xs text-blue-600">
                  <RefreshCw size={10} className="animate-spin" /> Running
                </span>
              )}
              {!status && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={10} /> Not executed
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <ExternalLink size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('input')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'input'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ArrowRight size={14} className="rotate-180" />
          Input
          {inputData.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
              {inputData.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('output')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'output'
              ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Output
          <ArrowRight size={14} />
          {outputData && (
            <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
              {Array.isArray(outputData) ? outputData.length : 1}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'input' ? (
          inputData.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {inputData.map((source, index) => (
                <div key={source.nodeId} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">From:</span>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {source.nodeName}
                      </span>
                    </div>
                    {source.data && (
                      <button
                        onClick={() => copyToClipboard(source.data)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Copy"
                      >
                        <Copy size={12} className="text-gray-400" />
                      </button>
                    )}
                  </div>
                  {source.data ? (
                    <div className="font-mono text-xs bg-gray-50 rounded-lg p-2 overflow-x-auto">
                      {renderDataTree(source.data, `input-${index}`)}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      No data available
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <ArrowRight size={32} className="rotate-180 opacity-50 mb-2" />
              <p className="text-sm">No input connections</p>
            </div>
          )
        ) : outputData ? (
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">
                Output Data
              </span>
              <button
                onClick={() => copyToClipboard(outputData)}
                className="p-1 hover:bg-gray-100 rounded"
                title="Copy"
              >
                <Copy size={12} className="text-gray-400" />
              </button>
            </div>
            <div className="font-mono text-xs bg-gray-50 rounded-lg p-2 overflow-x-auto">
              {renderDataTree(outputData)}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <ArrowRight size={32} className="opacity-50 mb-2" />
            <p className="text-sm">No output data</p>
            <p className="text-xs mt-1">Execute the workflow to see results</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>
            {activeTab === 'input'
              ? `${inputData.length} input source${inputData.length !== 1 ? 's' : ''}`
              : outputData
              ? `${Array.isArray(outputData) ? outputData.length : 1} item${Array.isArray(outputData) && outputData.length !== 1 ? 's' : ''}`
              : 'No data'}
          </span>
          <button
            onClick={() => setExpandedPaths(new Set(['root']))}
            className="text-blue-600 hover:underline"
          >
            Collapse all
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeIOPreview;

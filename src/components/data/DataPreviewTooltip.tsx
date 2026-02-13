/**
 * Data Preview Tooltip
 * Shows data preview when hovering over nodes or edges
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Copy, Eye, EyeOff, Database, Hash, Type, List, Braces } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface DataPreviewTooltipProps {
  nodeId: string;
  position: { x: number; y: number };
  onClose: () => void;
}

const DataPreviewTooltip: React.FC<DataPreviewTooltipProps> = ({
  nodeId,
  position,
  onClose,
}) => {
  const { executionResults, pinnedData } = useWorkflowStore();
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [showRaw, setShowRaw] = useState(false);

  const data = executionResults?.[nodeId] || pinnedData?.[nodeId];

  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedKeys(newExpanded);
  };

  const getTypeIcon = (value: unknown) => {
    if (Array.isArray(value)) return <List size={12} className="text-purple-400" />;
    if (typeof value === 'object' && value !== null) return <Braces size={12} className="text-blue-400" />;
    if (typeof value === 'number') return <Hash size={12} className="text-green-400" />;
    if (typeof value === 'string') return <Type size={12} className="text-yellow-400" />;
    return <Database size={12} className="text-gray-400" />;
  };

  const renderValue = (value: unknown, key: string, depth: number = 0): React.ReactNode => {
    if (value === null) return <span className="text-gray-500">null</span>;
    if (value === undefined) return <span className="text-gray-500">undefined</span>;

    if (Array.isArray(value)) {
      const isExpanded = expandedKeys.has(key);
      return (
        <div className="ml-2">
          <button
            onClick={() => toggleExpand(key)}
            className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span className="text-xs">Array [{value.length}]</span>
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {value.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-gray-500 text-xs">[{i}]</span>
                  {renderValue(item, `${key}.${i}`, depth + 1)}
                </div>
              ))}
              {value.length > 5 && (
                <span className="text-gray-500 text-xs">... {value.length - 5} more items</span>
              )}
            </div>
          )}
        </div>
      );
    }

    if (typeof value === 'object') {
      const isExpanded = expandedKeys.has(key);
      const keys = Object.keys(value);
      return (
        <div className="ml-2">
          <button
            onClick={() => toggleExpand(key)}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span className="text-xs">Object {'{'}...{'}'}</span>
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {keys.slice(0, 10).map((k) => (
                <div key={k} className="flex items-start gap-2">
                  <span className="text-cyan-400 text-xs">{k}:</span>
                  {renderValue((value as Record<string, unknown>)[k], `${key}.${k}`, depth + 1)}
                </div>
              ))}
              {keys.length > 10 && (
                <span className="text-gray-500 text-xs">... {keys.length - 10} more keys</span>
              )}
            </div>
          )}
        </div>
      );
    }

    if (typeof value === 'string') {
      const truncated = value.length > 50 ? value.substring(0, 50) + '...' : value;
      return <span className="text-yellow-300 text-xs">"{truncated}"</span>;
    }

    if (typeof value === 'number') {
      return <span className="text-green-300 text-xs">{value}</span>;
    }

    if (typeof value === 'boolean') {
      return <span className="text-orange-300 text-xs">{value.toString()}</span>;
    }

    return <span className="text-gray-300 text-xs">{String(value)}</span>;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  if (!data) return null;

  return (
    <div
      className="fixed z-50 bg-slate-900 rounded-lg shadow-2xl border border-slate-700 max-w-md overflow-hidden"
      style={{
        left: Math.min(position.x, window.innerWidth - 420),
        top: Math.min(position.y, window.innerHeight - 400),
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-blue-400" />
          <span className="text-white text-sm font-medium">Output Data</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title={showRaw ? 'Show formatted' : 'Show raw JSON'}
          >
            {showRaw ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button
            onClick={copyToClipboard}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title="Copy to clipboard"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[300px] overflow-y-auto p-3">
        {showRaw ? (
          <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <div className="space-y-1">
            {typeof data === 'object' && data !== null ? (
              Object.entries(data).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2">
                  {getTypeIcon(value)}
                  <span className="text-cyan-400 text-xs font-medium">{key}:</span>
                  {renderValue(value, key)}
                </div>
              ))
            ) : (
              renderValue(data, 'root')
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-slate-700 bg-slate-800">
        <p className="text-xs text-slate-500">
          {Array.isArray(data) ? `${data.length} items` : `${Object.keys(data || {}).length} keys`}
        </p>
      </div>
    </div>
  );
};

export default DataPreviewTooltip;

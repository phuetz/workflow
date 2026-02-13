/**
 * Node Output Tabs Component
 * Display node output in JSON, Table, or Binary views (like n8n)
 */

import React, { useState, useMemo } from 'react';
import {
  Code,
  Table2,
  FileImage,
  Copy,
  Download,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Search,
  Filter,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface NodeOutputTabsProps {
  nodeId: string;
  data: unknown;
  onClose?: () => void;
}

type ViewMode = 'json' | 'table' | 'binary';

const NodeOutputTabs: React.FC<NodeOutputTabsProps> = ({ nodeId, data, onClose }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('json');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Convert data to array format
  const items = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') return [data];
    return [];
  }, [data]);

  // Get current item
  const currentItem = items[currentIndex];

  // Get table columns from data
  const tableColumns = useMemo(() => {
    if (items.length === 0) return [];
    const allKeys = new Set<string>();
    items.forEach(item => {
      if (item && typeof item === 'object') {
        Object.keys(item as object).forEach(key => allKeys.add(key));
      }
    });
    return Array.from(allKeys);
  }, [items]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter(item =>
      JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  // Check if data contains binary
  const hasBinaryData = useMemo(() => {
    const checkBinary = (obj: unknown): boolean => {
      if (!obj || typeof obj !== 'object') return false;
      const keys = Object.keys(obj as object);
      if (keys.includes('data') && keys.includes('mimeType')) return true;
      return Object.values(obj as object).some(v => checkBinary(v));
    };
    return items.some(item => checkBinary(item));
  }, [items]);

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  // Download as JSON
  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `node-output-${nodeId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render JSON value with syntax highlighting
  const renderJsonValue = (value: unknown, depth = 0): React.ReactNode => {
    if (value === null) return <span className="text-gray-500">null</span>;
    if (value === undefined) return <span className="text-gray-500">undefined</span>;
    if (typeof value === 'boolean') {
      return <span className="text-orange-500">{value.toString()}</span>;
    }
    if (typeof value === 'number') {
      return <span className="text-green-600">{value}</span>;
    }
    if (typeof value === 'string') {
      if (value.length > 100 && depth > 0) {
        return <span className="text-amber-600">"{value.substring(0, 100)}..."</span>;
      }
      return <span className="text-amber-600">"{value}"</span>;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-gray-500">[]</span>;
      return (
        <span>
          <span className="text-gray-500">[</span>
          <div className="pl-4">
            {value.slice(0, 10).map((item, i) => (
              <div key={i}>
                {renderJsonValue(item, depth + 1)}
                {i < Math.min(value.length, 10) - 1 && <span className="text-gray-500">,</span>}
              </div>
            ))}
            {value.length > 10 && (
              <div className="text-gray-400 text-xs">... {value.length - 10} more items</div>
            )}
          </div>
          <span className="text-gray-500">]</span>
        </span>
      );
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as object);
      if (entries.length === 0) return <span className="text-gray-500">{'{}'}</span>;
      return (
        <span>
          <span className="text-gray-500">{'{'}</span>
          <div className="pl-4">
            {entries.slice(0, 20).map(([k, v], i) => (
              <div key={k}>
                <span className="text-blue-600">"{k}"</span>
                <span className="text-gray-500">: </span>
                {renderJsonValue(v, depth + 1)}
                {i < Math.min(entries.length, 20) - 1 && <span className="text-gray-500">,</span>}
              </div>
            ))}
            {entries.length > 20 && (
              <div className="text-gray-400 text-xs">... {entries.length - 20} more keys</div>
            )}
          </div>
          <span className="text-gray-500">{'}'}</span>
        </span>
      );
    }
    return <span>{String(value)}</span>;
  };

  // Render table cell
  const renderTableCell = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">-</span>;
    }
    if (typeof value === 'object') {
      return (
        <span className="text-gray-500 text-xs bg-gray-100 px-1 py-0.5 rounded">
          {Array.isArray(value) ? `[${value.length}]` : '{...}'}
        </span>
      );
    }
    if (typeof value === 'boolean') {
      return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {value.toString()}
        </span>
      );
    }
    const strValue = String(value);
    if (strValue.length > 50) {
      return <span title={strValue}>{strValue.substring(0, 50)}...</span>;
    }
    return strValue;
  };

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-white'
    : 'bg-white rounded-lg border border-gray-200 overflow-hidden';

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        {/* View mode tabs */}
        <div className="flex items-center gap-1 bg-gray-200 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('json')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'json'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Code size={14} />
            JSON
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Table2 size={14} />
            Table
          </button>
          {hasBinaryData && (
            <button
              onClick={() => setViewMode('binary')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'binary'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileImage size={14} />
              Binary
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-32 pl-7 pr-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Copy to clipboard"
          >
            <Copy size={14} className="text-gray-600" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Download JSON"
          >
            <Download size={14} className="text-gray-600" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Toggle fullscreen"
          >
            <Maximize2 size={14} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Item navigation */}
      {items.length > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-blue-50">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="p-1 hover:bg-blue-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} className="text-blue-600" />
          </button>
          <span className="text-sm text-blue-700 font-medium">
            Item {currentIndex + 1} of {items.length}
          </span>
          <button
            onClick={() => setCurrentIndex(Math.min(items.length - 1, currentIndex + 1))}
            disabled={currentIndex === items.length - 1}
            className="p-1 hover:bg-blue-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} className="text-blue-600" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className={`overflow-auto ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'max-h-96'}`}>
        {viewMode === 'json' && (
          <div className="p-4 font-mono text-sm">
            {items.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No output data</div>
            ) : (
              renderJsonValue(items.length === 1 ? items[0] : items)
            )}
          </div>
        )}

        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            {tableColumns.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No tabular data</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b">
                      #
                    </th>
                    {tableColumns.map(col => (
                      <th
                        key={col}
                        className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      {tableColumns.map(col => (
                        <td key={col} className="px-3 py-2">
                          {renderTableCell((item as Record<string, unknown>)?.[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {viewMode === 'binary' && (
          <div className="p-4 text-center">
            <FileImage size={48} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">Binary data preview</p>
            <p className="text-xs text-gray-400 mt-1">
              Download to view binary content
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        {items.length} item{items.length !== 1 ? 's' : ''} •
        {viewMode === 'table' && ` ${tableColumns.length} columns`}
        {searchTerm && ` • ${filteredItems.length} matches`}
      </div>
    </div>
  );
};

export default NodeOutputTabs;

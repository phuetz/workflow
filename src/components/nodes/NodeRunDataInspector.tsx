/**
 * Node Run Data Inspector
 * Detailed inspection of node execution data (like n8n)
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Database,
  X,
  ChevronRight,
  ChevronDown,
  Copy,
  CheckCircle,
  Clock,
  Zap,
  AlertTriangle,
  FileJson,
  Table2,
  Code,
  Search,
  Filter,
  Download,
  Pin,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  ArrowUpDown,
  Hash,
  Type,
  ToggleLeft,
  List,
  Braces,
  Calendar,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface NodeRunDataInspectorProps {
  nodeId: string;
  isOpen: boolean;
  onClose: () => void;
  onPinData?: (nodeId: string, data: unknown) => void;
}

interface ExecutionRun {
  id: string;
  executionId: string;
  startTime: Date;
  endTime: Date;
  status: 'success' | 'error';
  inputItems: number;
  outputItems: number;
  data: unknown;
  error?: string;
}

type ViewMode = 'json' | 'table' | 'raw';
type SortField = 'key' | 'type' | 'value';

const NodeRunDataInspector: React.FC<NodeRunDataInspectorProps> = ({
  nodeId,
  isOpen,
  onClose,
  onPinData,
}) => {
  const { nodes, executionResults, nodeExecutionStatus } = useWorkflowStore();
  const executionTimes = (useWorkflowStore as any).executionTimes;
  const [viewMode, setViewMode] = useState<ViewMode>('json');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['root']));
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOnlyMatches, setShowOnlyMatches] = useState(false);
  const [sortField, setSortField] = useState<SortField>('key');
  const [sortAsc, setSortAsc] = useState(true);
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set());

  // Get node info
  const node = nodes.find(n => n.id === nodeId);
  const status = nodeExecutionStatus[nodeId];
  const executionTime = executionTimes?.[nodeId];
  const data = executionResults?.[nodeId];

  // Mock execution history - in production would come from execution store
  const executionRuns: ExecutionRun[] = useMemo(() => {
    if (!data) return [];
    return [
      {
        id: 'run-1',
        executionId: 'exec-123',
        startTime: new Date(Date.now() - 5000),
        endTime: new Date(),
        status: status === 'error' ? 'error' : 'success',
        inputItems: 1,
        outputItems: Array.isArray(data) ? data.length : 1,
        data,
      },
    ];
  }, [data, status]);

  // Current run
  const currentRun = executionRuns[selectedRun];

  // Get type icon
  const getTypeIcon = (value: unknown) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">∅</span>;
    }
    if (typeof value === 'string') return <Type size={12} className="text-amber-500" />;
    if (typeof value === 'number') return <Hash size={12} className="text-green-500" />;
    if (typeof value === 'boolean') return <ToggleLeft size={12} className="text-blue-500" />;
    if (Array.isArray(value)) return <List size={12} className="text-purple-500" />;
    if (typeof value === 'object') return <Braces size={12} className="text-cyan-500" />;
    if (value instanceof Date) return <Calendar size={12} className="text-orange-500" />;
    return <Code size={12} className="text-gray-500" />;
  };

  // Get type name
  const getTypeName = (value: unknown): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return `Array[${value.length}]`;
    if (value instanceof Date) return 'Date';
    return typeof value;
  };

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

  // Toggle field visibility
  const toggleHideField = (path: string) => {
    const newHidden = new Set(hiddenFields);
    if (newHidden.has(path)) {
      newHidden.delete(path);
    } else {
      newHidden.add(path);
    }
    setHiddenFields(newHidden);
  };

  // Copy path to clipboard
  const copyPath = (path: string) => {
    const expression = `{{ $node["${node?.data?.label || nodeId}"].json${path.replace(/^root/, '')} }}`;
    navigator.clipboard.writeText(expression);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // Check if value matches search
  const matchesSearch = (value: unknown, path: string): boolean => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    if (path.toLowerCase().includes(searchLower)) return true;
    if (typeof value === 'string' && value.toLowerCase().includes(searchLower)) return true;
    if (typeof value === 'number' && value.toString().includes(searchTerm)) return true;
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value as object).some(([k, v]) =>
        k.toLowerCase().includes(searchLower) || matchesSearch(v, `${path}.${k}`)
      );
    }
    return false;
  };

  // Render data tree
  const renderDataTree = useCallback((
    data: unknown,
    path: string = 'root',
    depth: number = 0
  ): React.ReactNode => {
    if (hiddenFields.has(path)) return null;

    const isExpanded = expandedPaths.has(path);
    const matches = matchesSearch(data, path);

    if (showOnlyMatches && !matches && searchTerm) return null;

    if (data === null || data === undefined) {
      return (
        <span className="text-gray-400 italic">
          {data === null ? 'null' : 'undefined'}
        </span>
      );
    }

    if (Array.isArray(data)) {
      return (
        <div className={depth > 0 ? 'ml-4' : ''}>
          <div className="flex items-center gap-2 py-0.5 group">
            <button
              onClick={() => togglePath(path)}
              className="flex items-center gap-1 text-purple-600 hover:text-purple-800"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {getTypeIcon(data)}
              <span className="text-xs font-mono">Array[{data.length}]</span>
            </button>
            <button
              onClick={() => copyPath(path)}
              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-all"
            >
              {copiedPath === path ? (
                <CheckCircle size={10} className="text-green-500" />
              ) : (
                <Copy size={10} className="text-gray-400" />
              )}
            </button>
            <button
              onClick={() => toggleHideField(path)}
              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-all"
            >
              <EyeOff size={10} className="text-gray-400" />
            </button>
          </div>
          {isExpanded && (
            <div className="border-l-2 border-purple-100 ml-2 pl-2">
              {data.slice(0, 50).map((item, i) => (
                <div key={i} className="flex items-start py-0.5">
                  <span className="text-gray-400 text-xs w-6">[{i}]</span>
                  {renderDataTree(item, `${path}[${i}]`, depth + 1)}
                </div>
              ))}
              {data.length > 50 && (
                <span className="text-xs text-gray-400 pl-2">
                  ... {data.length - 50} more items
                </span>
              )}
            </div>
          )}
        </div>
      );
    }

    if (typeof data === 'object') {
      const entries = Object.entries(data as object);

      // Sort entries
      const sortedEntries = [...entries].sort((a, b) => {
        let cmp = 0;
        if (sortField === 'key') cmp = a[0].localeCompare(b[0]);
        else if (sortField === 'type') cmp = getTypeName(a[1]).localeCompare(getTypeName(b[1]));
        else cmp = String(a[1]).localeCompare(String(b[1]));
        return sortAsc ? cmp : -cmp;
      });

      return (
        <div className={depth > 0 ? 'ml-4' : ''}>
          <div className="flex items-center gap-2 py-0.5 group">
            <button
              onClick={() => togglePath(path)}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {getTypeIcon(data)}
              <span className="text-xs font-mono">Object</span>
            </button>
            <button
              onClick={() => copyPath(path)}
              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-all"
            >
              {copiedPath === path ? (
                <CheckCircle size={10} className="text-green-500" />
              ) : (
                <Copy size={10} className="text-gray-400" />
              )}
            </button>
          </div>
          {isExpanded && (
            <div className="border-l-2 border-blue-100 ml-2 pl-2">
              {sortedEntries.slice(0, 100).map(([key, value]) => {
                const childPath = `${path}.${key}`;
                if (hiddenFields.has(childPath)) return null;
                if (showOnlyMatches && searchTerm && !matchesSearch(value, childPath)) return null;

                return (
                  <div key={key} className="flex items-start py-0.5 group">
                    <span className="text-cyan-600 text-xs font-mono min-w-0">
                      {key}:
                    </span>
                    <span className="mx-1 text-gray-400">:</span>
                    {typeof value === 'object' && value !== null ? (
                      renderDataTree(value, childPath, depth + 1)
                    ) : (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getTypeIcon(value)}
                        <span className={`text-xs truncate ${
                          typeof value === 'string' ? 'text-amber-600' :
                          typeof value === 'number' ? 'text-green-600' :
                          typeof value === 'boolean' ? 'text-blue-600' :
                          'text-gray-600'
                        }`}>
                          {typeof value === 'string' ? `"${value}"` : String(value)}
                        </span>
                        <button
                          onClick={() => copyPath(childPath)}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-all flex-shrink-0"
                        >
                          {copiedPath === childPath ? (
                            <CheckCircle size={10} className="text-green-500" />
                          ) : (
                            <Copy size={10} className="text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleHideField(childPath)}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-all flex-shrink-0"
                        >
                          <EyeOff size={10} className="text-gray-400" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {entries.length > 100 && (
                <span className="text-xs text-gray-400 pl-2">
                  ... {entries.length - 100} more keys
                </span>
              )}
            </div>
          )}
        </div>
      );
    }

    // Primitive values
    return (
      <span className={`text-xs ${
        typeof data === 'string' ? 'text-amber-600' :
        typeof data === 'number' ? 'text-green-600' :
        typeof data === 'boolean' ? 'text-blue-600' :
        'text-gray-600'
      }`}>
        {typeof data === 'string' ? `"${data}"` : String(data)}
      </span>
    );
  }, [expandedPaths, hiddenFields, showOnlyMatches, searchTerm, sortField, sortAsc, copiedPath, node, nodeId]);

  // Render table view
  const renderTableView = useCallback(() => {
    if (!currentRun?.data) return null;
    const items = Array.isArray(currentRun.data) ? currentRun.data : [currentRun.data];
    if (items.length === 0) return <p className="text-gray-400 p-4">No data</p>;

    // Get all columns
    const columns = new Set<string>();
    items.forEach(item => {
      if (item && typeof item === 'object') {
        Object.keys(item as object).forEach(k => columns.add(k));
      }
    });

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border-b">#</th>
              {Array.from(columns).map(col => (
                <th
                  key={col}
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border-b cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortField === 'key') setSortAsc(!sortAsc);
                    setSortField('key');
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 100).map((item, i) => (
              <tr key={i} className="hover:bg-gray-50 border-b border-gray-100">
                <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                {Array.from(columns).map(col => (
                  <td key={col} className="px-3 py-2 font-mono text-xs max-w-xs truncate">
                    {renderCellValue((item as Record<string, unknown>)?.[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {items.length > 100 && (
          <p className="p-2 text-xs text-gray-400 text-center">
            Showing 100 of {items.length} items
          </p>
        )}
      </div>
    );
  }, [currentRun, sortField, sortAsc]);

  // Render cell value
  const renderCellValue = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">-</span>;
    }
    if (typeof value === 'object') {
      return (
        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
          {Array.isArray(value) ? `[${value.length}]` : '{...}'}
        </span>
      );
    }
    if (typeof value === 'boolean') {
      return (
        <span className={`px-1.5 py-0.5 rounded text-xs ${
          value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {String(value)}
        </span>
      );
    }
    return String(value);
  };

  if (!isOpen) return null;

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-white'
    : 'fixed right-0 top-16 bottom-8 w-[500px] bg-white shadow-2xl border-l border-gray-200 z-40';

  return (
    <div className={`${containerClass} flex flex-col animate-in slide-in-from-right duration-200`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-cyan-50 to-blue-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-100 rounded-lg">
            <Database size={20} className="text-cyan-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {node?.data?.label || node?.data?.type || 'Node'}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
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
              {executionTime && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={10} /> {executionTime}ms
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 size={16} className="text-gray-500" />
            ) : (
              <Maximize2 size={16} className="text-gray-500" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50">
        {/* View mode */}
        <div className="flex items-center bg-gray-200 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('json')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'json' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
            }`}
          >
            <FileJson size={12} className="inline mr-1" />
            JSON
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
            }`}
          >
            <Table2 size={12} className="inline mr-1" />
            Table
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'raw' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
            }`}
          >
            <Code size={12} className="inline mr-1" />
            Raw
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full pl-7 pr-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Actions */}
        <button
          onClick={() => setShowOnlyMatches(!showOnlyMatches)}
          className={`p-1.5 rounded-lg transition-colors ${
            showOnlyMatches ? 'bg-cyan-100 text-cyan-600' : 'hover:bg-gray-200 text-gray-500'
          }`}
          title="Show only matches"
        >
          <Filter size={14} />
        </button>
        <button
          onClick={() => onPinData?.(nodeId, currentRun?.data)}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          title="Pin data"
        >
          <Pin size={14} className="text-gray-500" />
        </button>
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(currentRun?.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${node?.data?.label || nodeId}-data.json`;
            a.click();
          }}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          title="Download"
        >
          <Download size={14} className="text-gray-500" />
        </button>
      </div>

      {/* Run selector */}
      {executionRuns.length > 1 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-blue-50/50">
          <Zap size={14} className="text-blue-500" />
          <span className="text-xs text-blue-700">
            Run {selectedRun + 1} of {executionRuns.length}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!currentRun?.data ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Database size={32} className="opacity-50 mb-2" />
            <p className="text-sm">No data available</p>
            <p className="text-xs mt-1">Execute the workflow to see results</p>
          </div>
        ) : viewMode === 'json' ? (
          <div className="p-4 font-mono text-xs">
            {renderDataTree(currentRun.data)}
          </div>
        ) : viewMode === 'table' ? (
          renderTableView()
        ) : (
          <pre className="p-4 text-xs font-mono whitespace-pre-wrap overflow-x-auto">
            {JSON.stringify(currentRun.data, null, 2)}
          </pre>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
        <span>
          {currentRun?.outputItems || 0} item{(currentRun?.outputItems || 0) !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-4">
          {hiddenFields.size > 0 && (
            <button
              onClick={() => setHiddenFields(new Set())}
              className="text-cyan-600 hover:underline"
            >
              Show {hiddenFields.size} hidden
            </button>
          )}
          <button
            onClick={() => setExpandedPaths(new Set(['root']))}
            className="text-cyan-600 hover:underline"
          >
            Collapse all
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeRunDataInspector;

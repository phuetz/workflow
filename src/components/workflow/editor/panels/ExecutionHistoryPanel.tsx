/**
 * Execution History Panel
 * Displays history of workflow executions with detailed results
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useWorkflowStore } from '../../../../store/workflowStore';
import {
  History,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  ChevronDown,
  ChevronRight,
  Trash2,
  RefreshCw,
  Download,
  Search,
  Filter,
  X,
  AlertTriangle,
  Eye,
} from 'lucide-react';

interface ExecutionRecord {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'success' | 'error' | 'running' | 'cancelled';
  startTime: number;
  endTime?: number;
  duration?: number;
  nodeResults: Record<string, { status: string; data?: unknown; error?: string }>;
  triggerData?: unknown;
  errorMessage?: string;
}

interface ExecutionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onReplayExecution?: (executionId: string) => void;
}

const ExecutionHistoryPanelComponent: React.FC<ExecutionHistoryPanelProps> = ({
  isOpen,
  onClose,
  onReplayExecution,
}) => {
  const darkMode = useWorkflowStore((state) => state.darkMode);
  const workflowId = useWorkflowStore((state) => state.currentWorkflowId);
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const executionResults = useWorkflowStore((state) => state.executionResults);
  const executionLogs = useWorkflowStore((state) => state.executionLogs);
  const isExecuting = useWorkflowStore((state) => state.isExecuting);

  // Local state for execution history (in real app, this would come from backend)
  const [executionHistory, setExecutionHistory] = useState<ExecutionRecord[]>(() => {
    // Generate some mock history based on current results
    const history: ExecutionRecord[] = [];

    // Add current execution if exists
    if (Object.keys(executionResults).length > 0) {
      const hasError = Object.values(executionResults).some(
        (r: unknown) => (r as { status?: string })?.status === 'error'
      );
      history.push({
        id: `exec_${Date.now()}`,
        workflowId: workflowId || 'unknown',
        workflowName: workflowName || 'Untitled Workflow',
        status: hasError ? 'error' : 'success',
        startTime: Date.now() - 5000,
        endTime: Date.now(),
        duration: 5000,
        nodeResults: Object.fromEntries(
          Object.entries(executionResults).map(([key, value]) => [
            key,
            { status: 'success', data: value },
          ])
        ),
      });
    }

    // Add some mock historical executions
    const mockStatuses: ('success' | 'error')[] = ['success', 'success', 'error', 'success', 'success'];
    mockStatuses.forEach((status, i) => {
      history.push({
        id: `exec_mock_${i}`,
        workflowId: workflowId || 'unknown',
        workflowName: workflowName || 'Untitled Workflow',
        status,
        startTime: Date.now() - (i + 1) * 3600000, // 1 hour apart
        endTime: Date.now() - (i + 1) * 3600000 + 3000 + Math.random() * 5000,
        duration: 3000 + Math.random() * 5000,
        nodeResults: {},
        errorMessage: status === 'error' ? 'Connection timeout' : undefined,
      });
    });

    return history;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedExecution, setExpandedExecution] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter executions
  const filteredExecutions = useMemo(() => {
    return executionHistory.filter((exec) => {
      // Status filter
      if (statusFilter !== 'all' && exec.status !== statusFilter) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          exec.workflowName.toLowerCase().includes(query) ||
          exec.id.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [executionHistory, statusFilter, searchQuery]);

  // Format duration
  const formatDuration = useCallback((ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }, []);

  // Format timestamp
  const formatTimestamp = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString();
    } else if (diffHours < 48) {
      return `Yesterday ${date.toLocaleTimeString()}`;
    }
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }, []);

  // Get status icon
  const getStatusIcon = useCallback((status: ExecutionRecord['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'cancelled':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  }, []);

  // Delete execution from history
  const deleteExecution = useCallback((execId: string) => {
    setExecutionHistory((prev) => prev.filter((e) => e.id !== execId));
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    setExecutionHistory([]);
  }, []);

  // Export history
  const exportHistory = useCallback(() => {
    const blob = new Blob([JSON.stringify(executionHistory, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-history-${workflowName || 'workflow'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [executionHistory, workflowName]);

  // Toggle expanded execution
  const toggleExpanded = useCallback((execId: string) => {
    setExpandedExecution((prev) => (prev === execId ? null : execId));
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed right-4 top-20 w-[450px] max-h-[calc(100vh-6rem)] overflow-hidden rounded-xl shadow-2xl border z-50 flex flex-col ${
        darkMode
          ? 'bg-gray-900 border-gray-700 text-white'
          : 'bg-white border-gray-200 text-gray-900'
      }`}
    >
      {/* Header */}
      <div
        className={`p-4 border-b flex items-center justify-between ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold">Execution History</h3>
          <span
            className={`px-2 py-0.5 text-xs rounded-full ${
              darkMode ? 'bg-gray-800' : 'bg-gray-100'
            }`}
          >
            {filteredExecutions.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-lg transition-colors ${
              showFilters
                ? 'bg-blue-500 text-white'
                : darkMode
                ? 'hover:bg-gray-800'
                : 'hover:bg-gray-100'
            }`}
            title="Filters"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={exportHistory}
            className={`p-1.5 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
            title="Export history"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={clearHistory}
            className={`p-1.5 rounded-lg transition-colors text-red-500 ${
              darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
            title="Clear history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div
          className={`p-3 border-b space-y-2 ${
            darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
          }`}
        >
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search executions..."
              className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm ${
                darkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              } border`}
            />
          </div>
          {/* Status filter */}
          <div className="flex gap-2">
            {['all', 'success', 'error', 'running'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-xs rounded-full capitalize transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-500 text-white'
                    : darkMode
                    ? 'bg-gray-800 hover:bg-gray-700'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current execution */}
      {isExecuting && (
        <div
          className={`p-3 border-b ${
            darkMode ? 'border-gray-700 bg-blue-500/10' : 'border-gray-200 bg-blue-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="text-sm font-medium">Execution in progress...</span>
          </div>
        </div>
      )}

      {/* Execution list */}
      <div className="flex-1 overflow-y-auto">
        {filteredExecutions.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500 text-sm">No execution history</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredExecutions.map((execution) => (
              <div key={execution.id}>
                <div
                  className={`p-3 cursor-pointer transition-colors ${
                    darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleExpanded(execution.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedExecution === execution.id ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      {getStatusIcon(execution.status)}
                      <div>
                        <div className="text-sm font-medium">{execution.workflowName}</div>
                        <div className="text-xs text-gray-500">
                          {formatTimestamp(execution.startTime)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {execution.duration && (
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${
                            darkMode ? 'bg-gray-800' : 'bg-gray-100'
                          }`}
                        >
                          {formatDuration(execution.duration)}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReplayExecution?.(execution.id);
                        }}
                        className={`p-1 rounded transition-colors ${
                          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                        }`}
                        title="Replay"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteExecution(execution.id);
                        }}
                        className={`p-1 rounded transition-colors text-red-500 ${
                          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                        }`}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Error message */}
                  {execution.status === 'error' && execution.errorMessage && (
                    <div className="mt-2 ml-9 text-xs text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {execution.errorMessage}
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {expandedExecution === execution.id && (
                  <div
                    className={`px-3 pb-3 ml-9 ${
                      darkMode ? 'bg-gray-800/50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="text-xs">
                        <span className="text-gray-500">Execution ID:</span>{' '}
                        <code className={`px-1 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                          {execution.id}
                        </code>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-500">Start:</span>{' '}
                        {new Date(execution.startTime).toLocaleString()}
                      </div>
                      {execution.endTime && (
                        <div className="text-xs">
                          <span className="text-gray-500">End:</span>{' '}
                          {new Date(execution.endTime).toLocaleString()}
                        </div>
                      )}
                      {Object.keys(execution.nodeResults).length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-500 mb-1">Node Results:</div>
                          <div className="space-y-1">
                            {Object.entries(execution.nodeResults).map(([nodeId, result]) => (
                              <div
                                key={nodeId}
                                className={`text-xs p-2 rounded flex items-center justify-between ${
                                  darkMode ? 'bg-gray-800' : 'bg-white'
                                }`}
                              >
                                <span>{nodeId}</span>
                                <span
                                  className={
                                    result.status === 'error' ? 'text-red-500' : 'text-green-500'
                                  }
                                >
                                  {result.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className={`p-3 border-t text-xs text-gray-500 flex items-center justify-between ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <span>{executionHistory.length} total executions</span>
        <button
          onClick={exportHistory}
          className="text-blue-500 hover:underline flex items-center gap-1"
        >
          <Download className="w-3 h-3" />
          Export all
        </button>
      </div>
    </div>
  );
};

const ExecutionHistoryPanel = React.memo(ExecutionHistoryPanelComponent, (prev, next) => {
  return prev.isOpen === next.isOpen;
});

export default ExecutionHistoryPanel;

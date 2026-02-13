/**
 * Live Execution View Component
 * Real-time workflow execution timeline and visualization
 *
 * Features:
 * - Live execution timeline
 * - Real-time progress tracking
 * - Node-by-node visualization
 * - Performance metrics display
 * - Error highlighting
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  AlertCircle,
  TrendingUp,
  Cpu,
  HardDrive,
  Filter,
  Search
} from 'lucide-react';
import {
  globalExecutionMonitor,
  LiveExecution,
  NodeExecutionInfo,
  ExecutionMetrics
} from '../../observability/LiveExecutionMonitor';

interface LiveExecutionViewProps {
  workflowId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const LiveExecutionView: React.FC<LiveExecutionViewProps> = ({
  workflowId,
  autoRefresh = true,
  refreshInterval = 1000
}) => {
  const [executions, setExecutions] = useState<LiveExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<LiveExecution | null>(null);
  const [metrics, setMetrics] = useState<ExecutionMetrics | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load executions
   */
  const loadExecutions = useCallback(() => {
    const filter = workflowId ? { workflowId } : undefined;
    const activeExecutions = globalExecutionMonitor.getActiveExecutions(filter);
    setExecutions(activeExecutions);

    // Update selected execution if it exists
    if (selectedExecution) {
      const updated = activeExecutions.find(e => e.executionId === selectedExecution.executionId);
      if (updated) {
        setSelectedExecution(updated);
        const executionMetrics = globalExecutionMonitor.getMetrics(updated.executionId);
        setMetrics(executionMetrics);
      }
    }
  }, [workflowId, selectedExecution]);

  /**
   * Auto-refresh
   */
  useEffect(() => {
    loadExecutions();

    if (autoRefresh) {
      intervalRef.current = setInterval(loadExecutions, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadExecutions, autoRefresh, refreshInterval]);

  /**
   * Listen to execution events
   */
  useEffect(() => {
    const handleExecutionUpdate = () => {
      loadExecutions();
    };

    globalExecutionMonitor.on('execution:started', handleExecutionUpdate);
    globalExecutionMonitor.on('execution:completed', handleExecutionUpdate);
    globalExecutionMonitor.on('execution:failed', handleExecutionUpdate);
    globalExecutionMonitor.on('node:started', handleExecutionUpdate);
    globalExecutionMonitor.on('node:completed', handleExecutionUpdate);
    globalExecutionMonitor.on('node:failed', handleExecutionUpdate);

    return () => {
      globalExecutionMonitor.off('execution:started', handleExecutionUpdate);
      globalExecutionMonitor.off('execution:completed', handleExecutionUpdate);
      globalExecutionMonitor.off('execution:failed', handleExecutionUpdate);
      globalExecutionMonitor.off('node:started', handleExecutionUpdate);
      globalExecutionMonitor.off('node:completed', handleExecutionUpdate);
      globalExecutionMonitor.off('node:failed', handleExecutionUpdate);
    };
  }, [loadExecutions]);

  /**
   * Filter executions
   */
  const filteredExecutions = executions.filter(execution => {
    if (statusFilter !== 'all' && execution.status !== statusFilter) {
      return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        execution.workflowName.toLowerCase().includes(query) ||
        execution.executionId.toLowerCase().includes(query)
      );
    }

    return true;
  });

  /**
   * Format duration
   */
  const formatDuration = (ms?: number): string => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Get node status icon
   */
  const getNodeStatusIcon = (status: string): React.ReactNode => {
    switch (status) {
      case 'running':
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'retrying':
        return <AlertCircle className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  /**
   * Render node timeline
   */
  const renderNodeTimeline = (nodes: Map<string, NodeExecutionInfo>) => {
    const nodeArray = Array.from(nodes.values());

    return (
      <div className="space-y-2">
        {nodeArray.map((node) => (
          <div
            key={node.nodeId}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex-shrink-0">
              {getNodeStatusIcon(node.status)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {node.nodeName}
                </p>
                <span className="text-xs text-gray-500">({node.nodeType})</span>
              </div>

              {node.duration !== undefined && (
                <p className="text-xs text-gray-500 mt-1">
                  Duration: {formatDuration(node.duration)}
                </p>
              )}

              {node.error && (
                <p className="text-xs text-red-600 mt-1 truncate">
                  Error: {node.error}
                </p>
              )}
            </div>

            {node.memoryUsage !== undefined && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <HardDrive className="w-3 h-3" />
                {(node.memoryUsage / 1024 / 1024).toFixed(1)}MB
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Live Executions</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {executions.length} active
            </span>
            {autoRefresh && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <Activity className="w-3 h-3 animate-pulse" />
                Live
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search executions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Execution List */}
        <div className="w-96 border-r border-gray-200 overflow-y-auto">
          {filteredExecutions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No active executions</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredExecutions.map((execution) => (
                <button
                  key={execution.executionId}
                  onClick={() => setSelectedExecution(execution)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedExecution?.executionId === execution.executionId
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 truncate">
                      {execution.workflowName}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(execution.status)}`}>
                      {execution.status}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>ID: {execution.executionId.substring(0, 8)}...</p>
                    <p>Progress: {execution.progress.toFixed(0)}%</p>
                    <p>
                      Nodes: {execution.completedNodes}/{execution.totalNodes}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        execution.status === 'failed'
                          ? 'bg-red-500'
                          : execution.status === 'completed'
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${execution.progress}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Execution Details */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedExecution ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Play className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Select an execution to view details</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Execution Info */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Execution Details
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Execution ID</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedExecution.executionId}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Workflow</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedExecution.workflowName}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getStatusColor(selectedExecution.status)}`}>
                      {selectedExecution.status}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Started At</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {new Date(selectedExecution.startTime).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {formatDuration(
                        selectedExecution.duration ||
                          Date.now() - selectedExecution.startTime
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Progress</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedExecution.progress.toFixed(1)}%
                    </p>
                  </div>

                  {selectedExecution.triggeredBy && (
                    <div>
                      <p className="text-sm text-gray-500">Triggered By</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {selectedExecution.triggeredBy}
                      </p>
                    </div>
                  )}

                  {selectedExecution.environment && (
                    <div>
                      <p className="text-sm text-gray-500">Environment</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {selectedExecution.environment}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Metrics */}
              {metrics && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Performance Metrics
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                      <p className="text-2xl font-bold text-blue-900">
                        {formatDuration(metrics.averageNodeDuration)}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">Avg Node Time</p>
                    </div>

                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p className="text-2xl font-bold text-green-900">
                        {selectedExecution.completedNodes}
                      </p>
                      <p className="text-xs text-green-600 mt-1">Completed</p>
                    </div>

                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <XCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                      <p className="text-2xl font-bold text-red-900">
                        {selectedExecution.failedNodes}
                      </p>
                      <p className="text-xs text-red-600 mt-1">Failed</p>
                    </div>
                  </div>

                  {metrics.slowestNode && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-500">Slowest Node</p>
                      <p className="text-sm font-medium text-gray-900">
                        {metrics.slowestNode.nodeId} -{' '}
                        {formatDuration(metrics.slowestNode.duration)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Node Timeline */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Node Execution Timeline
                </h3>
                {renderNodeTimeline(selectedExecution.nodes)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveExecutionView;

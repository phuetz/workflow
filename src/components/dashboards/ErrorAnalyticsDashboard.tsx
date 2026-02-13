/**
 * Error Analytics Dashboard
 * Comprehensive error monitoring and analytics
 *
 * Features:
 * - Error count by node type
 * - Error trends over time
 * - MTTR (Mean Time To Recovery)
 * - Recovery rate (successful retries %)
 * - Top failing nodes
 * - Error types distribution
 * - Real-time error monitoring
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Activity,
  RefreshCw
} from 'lucide-react';

interface ErrorRecord {
  id: string;
  timestamp: number;
  nodeId: string;
  nodeType: string;
  nodeName: string;
  errorMessage: string;
  errorCode?: string;
  executionId: string;
  workflowId: string;
  resolved: boolean;
  resolvedAt?: number;
  retryAttempts: number;
  recoveredByRetry: boolean;
}

interface ErrorAnalytics {
  totalErrors: number;
  errorsByType: Map<string, number>;
  errorsByNode: Map<string, number>;
  errorTrend: Array<{ timestamp: number; count: number }>;
  mttr: number; // Mean Time To Recovery (ms)
  recoveryRate: number; // Percentage
  topFailingNodes: Array<{ nodeId: string; nodeName: string; count: number }>;
  recentErrors: ErrorRecord[];
}

export const ErrorAnalyticsDashboard: React.FC = () => {
  const [errors, setErrors] = useState<ErrorRecord[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  // Load errors from storage/API
  useEffect(() => {
    loadErrors();

    if (autoRefresh) {
      const interval = setInterval(loadErrors, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const loadErrors = async () => {
    // In real implementation, fetch from API/database
    // For now, load from localStorage or use mock data
    const storedErrors = localStorage.getItem('workflow_error_logs');
    if (storedErrors) {
      setErrors(JSON.parse(storedErrors));
    } else {
      // Generate mock data for demonstration
      setErrors(generateMockErrors());
    }
  };

  // Calculate analytics
  const analytics = useMemo((): ErrorAnalytics => {
    const now = Date.now();
    const timeRangeMs = getTimeRangeMs(timeRange);
    const filteredErrors = errors.filter(e => now - e.timestamp < timeRangeMs);

    // Error counts by type
    const errorsByType = new Map<string, number>();
    filteredErrors.forEach(error => {
      const count = errorsByType.get(error.nodeType) || 0;
      errorsByType.set(error.nodeType, count + 1);
    });

    // Error counts by node
    const errorsByNode = new Map<string, number>();
    filteredErrors.forEach(error => {
      const key = `${error.nodeId}:${error.nodeName}`;
      const count = errorsByNode.get(key) || 0;
      errorsByNode.set(key, count + 1);
    });

    // Top failing nodes
    const topFailingNodes = Array.from(errorsByNode.entries())
      .map(([key, count]) => {
        const [nodeId, nodeName] = key.split(':');
        return { nodeId, nodeName, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Error trend (hourly buckets)
    const errorTrend = calculateErrorTrend(filteredErrors, timeRangeMs);

    // MTTR (Mean Time To Recovery)
    const resolvedErrors = filteredErrors.filter(e => e.resolved && e.resolvedAt);
    const mttr = resolvedErrors.length > 0
      ? resolvedErrors.reduce((sum, e) => sum + (e.resolvedAt! - e.timestamp), 0) / resolvedErrors.length
      : 0;

    // Recovery rate
    const retriedErrors = filteredErrors.filter(e => e.retryAttempts > 0);
    const recoveredErrors = retriedErrors.filter(e => e.recoveredByRetry);
    const recoveryRate = retriedErrors.length > 0
      ? (recoveredErrors.length / retriedErrors.length) * 100
      : 0;

    return {
      totalErrors: filteredErrors.length,
      errorsByType,
      errorsByNode,
      errorTrend,
      mttr,
      recoveryRate,
      topFailingNodes,
      recentErrors: filteredErrors.slice(0, 20)
    };
  }, [errors, timeRange]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              Error Analytics
            </h1>
            <p className="text-gray-600 mt-1">Monitor and analyze workflow errors</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            {/* Auto Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                autoRefresh
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto Refresh
            </button>

            {/* Manual Refresh */}
            <button
              onClick={loadErrors}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Errors */}
          <MetricCard
            icon={<XCircle className="w-6 h-6" />}
            title="Total Errors"
            value={analytics.totalErrors.toLocaleString()}
            iconColor="text-red-500"
            bgColor="bg-red-50"
          />

          {/* MTTR */}
          <MetricCard
            icon={<Clock className="w-6 h-6" />}
            title="Mean Time To Recovery"
            value={formatDuration(analytics.mttr)}
            iconColor="text-blue-500"
            bgColor="bg-blue-50"
          />

          {/* Recovery Rate */}
          <MetricCard
            icon={<CheckCircle className="w-6 h-6" />}
            title="Recovery Rate"
            value={`${analytics.recoveryRate.toFixed(1)}%`}
            iconColor="text-green-500"
            bgColor="bg-green-50"
          />

          {/* Trend */}
          <MetricCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Error Trend"
            value={calculateTrendDirection(analytics.errorTrend)}
            iconColor="text-orange-500"
            bgColor="bg-orange-50"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Error Trend Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Error Trend
            </h2>
            <ErrorTrendChart data={analytics.errorTrend} />
          </div>

          {/* Errors by Node Type */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              Errors by Node Type
            </h2>
            <ErrorsByTypeChart data={analytics.errorsByType} />
          </div>
        </div>

        {/* Top Failing Nodes */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Top Failing Nodes</h2>
          <TopFailingNodesTable nodes={analytics.topFailingNodes} />
        </div>

        {/* Recent Errors */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Errors</h2>
          <RecentErrorsTable errors={analytics.recentErrors} />
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string;
  iconColor: string;
  bgColor: string;
}> = ({ icon, title, value, iconColor, bgColor }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between">
      <div className={`p-3 rounded-lg ${bgColor}`}>
        <div className={iconColor}>{icon}</div>
      </div>
    </div>
    <div className="mt-4">
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  </div>
);

// Error Trend Chart (Simple Bar Chart)
const ErrorTrendChart: React.FC<{ data: Array<{ timestamp: number; count: number }> }> = ({
  data
}) => {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="space-y-2">
      {data.map((point, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="w-24 text-sm text-gray-600">
            {new Date(point.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
            <div
              className="bg-red-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${(point.count / maxCount) * 100}%` }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-700">
              {point.count}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Errors by Type Chart
const ErrorsByTypeChart: React.FC<{ data: Map<string, number> }> = ({ data }) => {
  const entries = Array.from(data.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxCount = Math.max(...entries.map(e => e[1]), 1);

  return (
    <div className="space-y-2">
      {entries.map(([type, count]) => (
        <div key={type} className="flex items-center gap-2">
          <div className="w-32 text-sm text-gray-700 truncate" title={type}>
            {type}
          </div>
          <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${(count / maxCount) * 100}%` }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-700">
              {count}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Top Failing Nodes Table
const TopFailingNodesTable: React.FC<{
  nodes: Array<{ nodeId: string; nodeName: string; count: number }>;
}> = ({ nodes }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Rank
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Node Name
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Node ID
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Error Count
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {nodes.map((node, index) => (
          <tr key={node.nodeId} className="hover:bg-gray-50">
            <td className="px-4 py-3 text-sm text-gray-900">#{index + 1}</td>
            <td className="px-4 py-3 text-sm font-medium text-gray-900">{node.nodeName}</td>
            <td className="px-4 py-3 text-sm text-gray-500 font-mono">{node.nodeId}</td>
            <td className="px-4 py-3 text-sm text-red-600 font-semibold">{node.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Recent Errors Table
const RecentErrorsTable: React.FC<{ errors: ErrorRecord[] }> = ({ errors }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Time
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Node
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Error
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Retries
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Status
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {errors.map(error => (
          <tr key={error.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 text-sm text-gray-600">
              {new Date(error.timestamp).toLocaleString()}
            </td>
            <td className="px-4 py-3 text-sm">
              <div className="font-medium text-gray-900">{error.nodeName}</div>
              <div className="text-gray-500 text-xs">{error.nodeType}</div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-700 max-w-md truncate">
              {error.errorMessage}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">{error.retryAttempts}</td>
            <td className="px-4 py-3 text-sm">
              {error.resolved ? (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  Resolved
                </span>
              ) : (
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                  Active
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Helper Functions

function getTimeRangeMs(range: '1h' | '24h' | '7d' | '30d'): number {
  switch (range) {
    case '1h':
      return 60 * 60 * 1000;
    case '24h':
      return 24 * 60 * 60 * 1000;
    case '7d':
      return 7 * 24 * 60 * 60 * 1000;
    case '30d':
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

function calculateErrorTrend(
  errors: ErrorRecord[],
  timeRangeMs: number
): Array<{ timestamp: number; count: number }> {
  const now = Date.now();
  const bucketSize = timeRangeMs / 12; // 12 buckets
  const buckets: Array<{ timestamp: number; count: number }> = [];

  for (let i = 11; i >= 0; i--) {
    const bucketStart = now - (i + 1) * bucketSize;
    const bucketEnd = now - i * bucketSize;
    const count = errors.filter(e => e.timestamp >= bucketStart && e.timestamp < bucketEnd).length;

    buckets.push({
      timestamp: bucketEnd,
      count
    });
  }

  return buckets;
}

function calculateTrendDirection(trend: Array<{ timestamp: number; count: number }>): string {
  if (trend.length < 2) return 'N/A';

  const recent = trend.slice(-3);
  const older = trend.slice(0, 3);

  const recentAvg = recent.reduce((sum, t) => sum + t.count, 0) / recent.length;
  const olderAvg = older.reduce((sum, t) => sum + t.count, 0) / older.length;

  const change = ((recentAvg - olderAvg) / (olderAvg || 1)) * 100;

  if (Math.abs(change) < 10) return 'Stable';
  if (change > 0) return `↑ ${change.toFixed(0)}%`;
  return `↓ ${Math.abs(change).toFixed(0)}%`;
}

function generateMockErrors(): ErrorRecord[] {
  const errors: ErrorRecord[] = [];
  const now = Date.now();
  const nodeTypes = ['httpRequest', 'email', 'slack', 'database', 'function'];
  const nodeNames = ['API Call', 'Send Email', 'Notify Slack', 'Query DB', 'Transform Data'];

  for (let i = 0; i < 100; i++) {
    const typeIndex = Math.floor(Math.random() * nodeTypes.length);
    const resolved = Math.random() > 0.5;
    const timestamp = now - Math.random() * 24 * 60 * 60 * 1000;

    errors.push({
      id: `error-${i}`,
      timestamp,
      nodeId: `node-${typeIndex}-${i}`,
      nodeType: nodeTypes[typeIndex],
      nodeName: nodeNames[typeIndex],
      errorMessage: `Failed to execute ${nodeNames[typeIndex]}: Connection timeout`,
      errorCode: Math.random() > 0.5 ? 'ETIMEDOUT' : 'ECONNREFUSED',
      executionId: `exec-${i}`,
      workflowId: `workflow-${Math.floor(i / 10)}`,
      resolved,
      resolvedAt: resolved ? timestamp + Math.random() * 3600000 : undefined,
      retryAttempts: Math.floor(Math.random() * 5),
      recoveredByRetry: resolved && Math.random() > 0.3
    });
  }

  return errors.sort((a, b) => b.timestamp - a.timestamp);
}

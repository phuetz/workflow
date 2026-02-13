/**
 * Performance Monitoring Dashboard
 * Real-time performance metrics and monitoring for the workflow application
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  LineChart,
  Line,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  Activity, 
  Zap, 
  AlertTriangle, 
  TrendingUp,
  Clock,
  Database,
  Cpu,
  HardDrive,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { usePerformanceMetrics } from '../../hooks/usePerformanceMetrics';
import { performanceMonitor } from '../../services/PerformanceMonitoringService';
import { formatBytes, formatDuration, formatNumber } from '../../utils/formatters';
import type { 
  PerformanceMetrics, 
  SystemMetrics, 
  QueryMetrics,
  WorkflowMetrics 
} from '../../types/performance';
import { logger } from '../../services/SimpleLogger';
import { useToast } from '../ui/Toast';

interface DashboardProps {
  refreshInterval?: number;
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
}

const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#6366F1',
  secondary: '#6B7280'
};

export const PerformanceMonitoringDashboard: React.FC<DashboardProps> = ({
  refreshInterval = 5000,
  timeRange = '1h'
}) => {
  const toast = useToast();
  const [selectedMetric, setSelectedMetric] = useState<string>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // Use custom hook for performance metrics
  const {
    metrics,
    loading,
    error,
    refresh,
    exportData
  } = usePerformanceMetrics({
    refreshInterval: autoRefresh ? refreshInterval : 0,
    timeRange: timeRange as '1h' | '6h' | '24h' | '7d' | '30d'
  });

  // Calculate system health score
  const calculateSystemHealth = useCallback((system: SystemMetrics | undefined) => {
    if (!system) return 100;

    const cpuScore = (1 - system.cpu.usage / 100) * 100;
    const memoryScore = (1 - system.memory.usagePercent / 100) * 100;
    const diskScore = (1 - system.disk.usagePercent / 100) * 100;

    return Math.round((cpuScore + memoryScore + diskScore) / 3);
  }, []);

  // Calculate derived metrics
  const summaryMetrics = useMemo(() => {
    if (!metrics) return null;

    return {
      avgResponseTime: metrics.api?.avgResponseTime || 0,
      totalRequests: metrics.api?.totalRequests || 0,
      errorRate: metrics.api?.errorRate || 0,
      activeWorkflows: metrics.workflows?.active || 0,
      systemHealth: calculateSystemHealth(metrics.system),
      cacheHitRate: metrics.cache?.hitRate || 0
    };
  }, [metrics, calculateSystemHealth]);

  // Format chart data
  const formatChartData = useCallback((data: any[], key: string) => {
    return data.map(item => ({
      ...item,
      time: new Date(item.timestamp).toLocaleTimeString(),
      value: item[key]
    }));
  }, []);

  // Render metric card
  const renderMetricCard = useCallback((
    title: string,
    value: string | number,
    icon: React.ReactNode,
    trend?: number,
    color: string = COLORS.primary
  ) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold mt-2" style={{ color }}>
            {value}
          </p>
          {trend !== undefined && (
            <p className={`text-sm mt-2 flex items-center ${
              trend > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className="w-4 h-4 mr-1" />
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            </p>
          )}
        </div>
        <div className="p-3 rounded-full bg-gray-100" style={{ color }}>
          {icon}
        </div>
      </div>
    </div>
  ), []);

  // Render response time chart
  const renderResponseTimeChart = useCallback(() => {
    if (!metrics?.api?.responseTimeHistory) return null;

    const data = formatChartData(metrics.api.responseTimeHistory, 'avgResponseTime');

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Response Time Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke={COLORS.primary}
              name="Avg Response Time (ms)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }, [metrics, formatChartData]);

  // Render system resources chart
  const renderSystemResourcesChart = useCallback(() => {
    if (!metrics?.system) return null;

    const data = [
      { name: 'CPU', usage: metrics.system.cpu.usage, color: COLORS.primary },
      { name: 'Memory', usage: metrics.system.memory.usagePercent, color: COLORS.success },
      { name: 'Disk', usage: metrics.system.disk.usagePercent, color: COLORS.warning }
    ];

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">System Resources</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
            <Bar dataKey="usage" name="Usage %">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }, [metrics]);

  // Render workflow performance chart
  const renderWorkflowPerformanceChart = useCallback(() => {
    if (!metrics?.workflows?.executionStats) return null;

    const data = Object.entries(metrics.workflows.executionStats).map(([status, count]) => ({
      name: status,
      value: count,
      color: status === 'success' ? COLORS.success :
             status === 'failed' ? COLORS.danger :
             COLORS.warning
    }));

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Workflow Executions</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }, [metrics]);

  // Handle query optimization
  const handleOptimizeQuery = useCallback(async (query: QueryMetrics) => {
    try {
      const suggestions = await performanceMonitor.getQueryOptimizationSuggestions(query.query);
      // Show suggestions in a toast
      toast.info(`Optimization suggestions: ${suggestions.join(', ')}`);
    } catch (error) {
      logger.error('Failed to get optimization suggestions:', error);
    }
  }, []);

  // Render slow queries table
  const renderSlowQueries = useCallback(() => {
    if (!metrics?.database?.slowQueries || metrics.database.slowQueries.length === 0) {
      return null;
    }

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Slow Queries</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Query
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.database.slowQueries.map((query, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {query.query.substring(0, 50)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {query.avgTime}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {query.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleOptimizeQuery(query)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Optimize
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [metrics, handleOptimizeQuery]);

  // Render error logs
  const renderErrorLogs = useCallback(() => {
    if (!metrics?.errors || metrics.errors.length === 0) {
      return null;
    }

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Errors</h3>
        <div className="space-y-4">
          {metrics.errors.slice(0, 5).map((error, index) => (
            <div key={index} className="border-l-4 border-red-500 pl-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{error.message}</p>
                  <p className="text-sm text-gray-500">{error.code}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(error.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className="text-sm font-medium text-red-600">
                  {error.count}x
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }, [metrics]);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading performance metrics
            </h3>
            <p className="text-sm text-red-700 mt-2">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Performance Monitoring</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              autoRefresh 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>{autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}</span>
          </button>
          <button
            onClick={() => exportData('csv')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderMetricCard(
          'Avg Response Time',
          `${summaryMetrics?.avgResponseTime || 0}ms`,
          <Clock className="w-6 h-6" />,
          metrics?.api?.responseTimeTrend,
          COLORS.primary
        )}
        {renderMetricCard(
          'Total Requests',
          formatNumber(summaryMetrics?.totalRequests || 0),
          <Activity className="w-6 h-6" />,
          metrics?.api?.requestTrend,
          COLORS.success
        )}
        {renderMetricCard(
          'Error Rate',
          `${(summaryMetrics?.errorRate || 0).toFixed(2)}%`,
          <AlertTriangle className="w-6 h-6" />,
          metrics?.api?.errorTrend,
          summaryMetrics?.errorRate > 5 ? COLORS.danger : COLORS.warning
        )}
        {renderMetricCard(
          'System Health',
          `${summaryMetrics?.systemHealth || 100}%`,
          <Zap className="w-6 h-6" />,
          undefined,
          summaryMetrics?.systemHealth < 70 ? COLORS.danger : COLORS.success
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderResponseTimeChart()}
        {renderSystemResourcesChart()}
        {renderWorkflowPerformanceChart()}
        
        {/* Cache Performance */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Cache Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Hit Rate</span>
              <span className="font-semibold">
                {((metrics?.cache?.hitRate || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${(metrics?.cache?.hitRate || 0) * 100}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Cache Hits</p>
                <p className="font-semibold">{formatNumber(metrics?.cache?.hits || 0)}</p>
              </div>
              <div>
                <p className="text-gray-600">Cache Misses</p>
                <p className="font-semibold">{formatNumber(metrics?.cache?.misses || 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="space-y-6">
        {renderSlowQueries()}
        {renderErrorLogs()}
      </div>

      {/* System Details */}
      {showDetails && metrics?.system && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">System Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                <Cpu className="w-4 h-4 mr-2" />
                CPU
              </h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Usage</dt>
                  <dd className="font-medium">{metrics.system.cpu.usage.toFixed(1)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Cores</dt>
                  <dd className="font-medium">{metrics.system.cpu.cores}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Load Average</dt>
                  <dd className="font-medium">{metrics.system.cpu.loadAverage.join(', ')}</dd>
                </div>
              </dl>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                <HardDrive className="w-4 h-4 mr-2" />
                Memory
              </h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Used</dt>
                  <dd className="font-medium">{formatBytes(metrics.system.memory.used)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Total</dt>
                  <dd className="font-medium">{formatBytes(metrics.system.memory.total)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Usage</dt>
                  <dd className="font-medium">{metrics.system.memory.usagePercent.toFixed(1)}%</dd>
                </div>
              </dl>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                <Database className="w-4 h-4 mr-2" />
                Disk
              </h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Used</dt>
                  <dd className="font-medium">{formatBytes(metrics.system.disk.used)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Total</dt>
                  <dd className="font-medium">{formatBytes(metrics.system.disk.total)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Usage</dt>
                  <dd className="font-medium">{metrics.system.disk.usagePercent.toFixed(1)}%</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Details Button */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          {showDetails ? 'Hide Details' : 'Show System Details'}
        </button>
      </div>
    </div>
  );
};
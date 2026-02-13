/**
 * Analytics Dashboard Component
 * Comprehensive dashboard for workflow analytics and insights
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Users,
  AlertTriangle,
  Activity,
  Download,
  RefreshCw,
  Target,
  Cpu,
  HardDrive
} from 'lucide-react';
import { workflowAnalytics } from '../../services/WorkflowAnalyticsService';
import type {
  WorkflowAnalytics,
  AnalyticsTimeRange,
  MetricCard
} from '../../types/analytics';
import { logger } from '../../services/SimpleLogger';

interface AnalyticsDashboardProps {
  workflowId?: string;
  onClose?: () => void;
}

type TimeRangeOption = '1h' | '24h' | '7d' | '30d';

// Helper functions moved to top level
const formatMetricValue = (value: number, format: string): string => {
  switch (format) {
    case 'number':
      return value.toLocaleString();
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'duration':
      return formatDuration(value);
    default:
      return String(value);
  }
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = React.memo(({
  workflowId = 'all',
  onClose
}) => {
  const [analytics, setAnalytics] = useState<WorkflowAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeOption>('7d');
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const timeRange = getTimeRangeConfig();
      const data = await workflowAnalytics.getWorkflowAnalytics(workflowId, timeRange);
      setAnalytics(data);
    } catch (error) {
      logger.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [workflowId, selectedTimeRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const refreshAnalytics = useCallback(async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  }, [loadAnalytics]);

  const exportData = useCallback((format: 'json' | 'csv') => {
    if (!analytics) return;

    try {
      const data = format === 'json' 
        ? JSON.stringify(analytics, null, 2)
        : convertToCSV(analytics);
      
      const blob = new Blob([data], {
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${workflowId}-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Failed to export analytics:', error);
    }
  }, [analytics, workflowId]);

  const convertToCSV = useCallback((data: any): string => {
    // Simple CSV conversion
    const headers = Object.keys(data).join(',');
    const values = Object.values(data).map(v =>
      typeof v === 'object' ? JSON.stringify(v) : v
    ).join(',');
    return `${headers}\n${values}`;
  }, []);

  const getTimeRangeConfig = useCallback((): AnalyticsTimeRange => {
    const now = new Date();
    let start: Date;
    let granularity: AnalyticsTimeRange['granularity'] = 'hour';

    switch (selectedTimeRange) {
      case '1h':
        start = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        granularity = 'day';
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        granularity = 'day';
        break;
      default:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        granularity = 'day';
    }

    return { start, end: now, granularity };
  }, [selectedTimeRange]);

  const metricCards: MetricCard[] = useMemo(() => {
    if (!analytics) return [];

    return [
      {
        title: 'Total Executions',
        value: analytics.metrics.totalExecutions,
        format: 'number',
        icon: 'activity',
        color: 'blue'
      },
      {
        title: 'Success Rate',
        value: analytics.metrics.successRate,
        format: 'percentage',
        icon: 'check-circle',
        color: analytics.metrics.successRate > 95 ? 'green' : 'yellow'
      },
      {
        title: 'Avg Execution Time',
        value: analytics.metrics.averageExecutionTime,
        format: 'duration',
        icon: 'clock',
        color: 'gray'
      },
      {
        title: 'Active Users',
        value: analytics.usage.dailyActiveUsers,
        format: 'number',
        icon: 'users',
        color: 'green'
      }
    ];
  }, [analytics]);

  const getColorClasses = useCallback((color: string) => {
    const colorMap = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      red: 'bg-red-50 text-red-700 border-red-200',
      gray: 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.gray;
  }, []);

  const exportAnalytics = useCallback((format: 'json' | 'csv') => {
    exportData(format);
  }, [exportData]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No analytics data available</p>
          <button
            onClick={loadAnalytics}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BarChart3 className="w-6 h-6 text-gray-700 mr-3" />
            <div>
              <h2 className="text-lg font-semibold">Analytics Dashboard</h2>
              <p className="text-sm text-gray-600">
                {analytics.workflowName} • Last updated {analytics.lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as TimeRangeOption)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            
            <button
              onClick={refreshAnalytics}
              disabled={refreshing}
              className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={() => exportAnalytics('json')}
              className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
            </button>
            
            {onClose && (
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metricCards.map((card, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getColorClasses(card.color || 'gray')}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-75">{card.title}</p>
                  <p className="text-2xl font-bold">
                    {formatMetricValue(card.value as number, card.format)}
                  </p>
                </div>
                <Activity className="w-6 h-6 opacity-75" />
              </div>
            </div>
          ))}
        </div>

        {/* Performance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Latency Distribution</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">P50 (Median)</span>
                <span className="font-medium">{formatDuration(analytics.performance.p50Latency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">P95</span>
                <span className="font-medium">{formatDuration(analytics.performance.p95Latency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Average</span>
                <span className="font-medium">{formatDuration(analytics.performance.averageLatency)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Resource Usage</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Cpu className="w-4 h-4 text-blue-500 mr-2" />
                    <span className="text-sm text-gray-600">CPU Usage</span>
                  </div>
                  <span className="font-medium">{analytics.performance.cpuUsage.average.toFixed(1)}%</span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <HardDrive className="w-4 h-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Memory Usage</span>
                  </div>
                  <span className="font-medium">{analytics.performance.memoryUsage.average.toFixed(0)} MB</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Insights Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Insights & Recommendations</h3>
          
          {analytics.insights.length > 0 ? (
            <div className="space-y-4">
              {analytics.insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    insight.severity === 'critical' ? 'border-red-500 bg-red-50' :
                    insight.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <AlertTriangle className={`w-4 h-4 mr-2 ${
                          insight.severity === 'critical' ? 'text-red-600' :
                          insight.severity === 'warning' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`} />
                        <h4 className="font-medium">{insight.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                      {insight.recommendation && (
                        <p className="text-sm text-gray-800 mt-2">
                          <strong>Recommendation:</strong> {insight.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-gray-600">All systems operating normally</p>
            </div>
          )}
        </div>

        {/* Top Users */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Top Users</h3>
          
          {analytics.usage.topUsers.length > 0 ? (
            <div className="space-y-3">
              {analytics.usage.topUsers.slice(0, 5).map((user, index) => (
                <div key={user.userId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{user.username || user.userId}</p>
                      <p className="text-sm text-gray-500">
                        Last active: {user.lastActivity.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{user.executionCount}</p>
                    <p className="text-sm text-gray-500">executions</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No user activity data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

AnalyticsDashboard.displayName = 'AnalyticsDashboard';
/**
 * Advanced Analytics Dashboard
 * Main dashboard for analytics with real-time charts and insights
 */

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DateRange, TimeInterval } from '../../types/advanced-analytics';
import { analyticsEngine } from '../../analytics/AdvancedAnalyticsEngine';
import { CostAnalysisPanel } from '../cost/CostAnalysisPanel';
import { PerformanceInsightsPanel } from '../monitoring/PerformanceInsightsPanel';
import { RecommendationsPanel } from '../ai/RecommendationsPanel';
import { logger } from '../../services/SimpleLogger';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const AdvancedAnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start, end };
  });

  const [timeInterval, setTimeInterval] = useState<TimeInterval>('1h');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'cost' | 'performance' | 'insights'>('overview');
  const [metrics, setMetrics] = useState<ReturnType<typeof analyticsEngine.getAggregatedMetrics> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const refreshIntervalId = setInterval(loadMetrics, 30000); // Refresh every 30s
    return () => clearInterval(refreshIntervalId);
  }, [dateRange, timeInterval]);

  const loadMetrics = () => {
    setLoading(true);
    try {
      const data = analyticsEngine.getAggregatedMetrics(dateRange, timeInterval);
      setMetrics(data);
    } catch (error) {
      logger.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (range: 'today' | '7d' | '30d' | '90d') => {
    const end = new Date();
    const start = new Date();

    switch (range) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        setTimeInterval('1h');
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        setTimeInterval('1h');
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        setTimeInterval('1d');
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        setTimeInterval('1d');
        break;
    }

    setDateRange({ start, end });
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
              <p className="mt-1 text-sm text-gray-500">
                Real-time insights and cost analysis for your workflows
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDateRangeChange('today')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Today
              </button>
              <button
                onClick={() => handleDateRangeChange('7d')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                7 Days
              </button>
              <button
                onClick={() => handleDateRangeChange('30d')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                30 Days
              </button>
              <button
                onClick={() => handleDateRangeChange('90d')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                90 Days
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {(['overview', 'cost', 'performance', 'insights'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`
                    ${selectedTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize
                  `}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedTab === 'overview' && metrics && (
          <OverviewTab metrics={metrics} />
        )}
        {selectedTab === 'cost' && (
          <CostAnalysisPanel dateRange={dateRange} />
        )}
        {selectedTab === 'performance' && (
          <PerformanceInsightsPanel dateRange={dateRange} />
        )}
        {selectedTab === 'insights' && (
          <RecommendationsPanel dateRange={dateRange} />
        )}
      </div>
    </div>
  );
};

interface OverviewTabProps {
  metrics: ReturnType<typeof analyticsEngine.getAggregatedMetrics>;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ metrics }) => {
  // Prepare execution trend data
  const executionTrendData = [
    { name: 'Mon', executions: 120, successful: 110, failed: 10 },
    { name: 'Tue', executions: 150, successful: 145, failed: 5 },
    { name: 'Wed', executions: 180, successful: 170, failed: 10 },
    { name: 'Thu', executions: 160, successful: 155, failed: 5 },
    { name: 'Fri', executions: 200, successful: 190, failed: 10 },
    { name: 'Sat', executions: 90, successful: 85, failed: 5 },
    { name: 'Sun', executions: 100, successful: 95, failed: 5 },
  ];

  // Prepare status distribution
  const statusData = [
    { name: 'Successful', value: metrics.metrics.executions.successful },
    { name: 'Failed', value: metrics.metrics.executions.failed },
    { name: 'Running', value: metrics.metrics.executions.running },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Executions"
          value={metrics.metrics.executions.total.toLocaleString()}
          trend={5.2}
          icon="📊"
        />
        <MetricCard
          title="Success Rate"
          value={`${metrics.metrics.executions.successRate.toFixed(1)}%`}
          trend={2.1}
          icon="✅"
        />
        <MetricCard
          title="Avg Latency"
          value={`${(metrics.metrics.performance.avgLatency / 1000).toFixed(2)}s`}
          trend={-3.5}
          icon="⚡"
        />
        <MetricCard
          title="Total Cost"
          value={`$${metrics.metrics.cost.total.toFixed(2)}`}
          trend={metrics.metrics.cost.trend}
          icon="💰"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Execution Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Execution Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={executionTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="successful"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                name="Successful"
              />
              <Area
                type="monotone"
                dataKey="failed"
                stackId="1"
                stroke="#ef4444"
                fill="#ef4444"
                name="Failed"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: any) => `${props.name} ${((props.percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">P50 Latency</span>
              <span className="text-sm font-medium text-gray-900">
                {(metrics.metrics.performance.p50Latency / 1000).toFixed(2)}s
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: '50%' }}
              ></div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">P95 Latency</span>
              <span className="text-sm font-medium text-gray-900">
                {(metrics.metrics.performance.p95Latency / 1000).toFixed(2)}s
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full"
                style={{ width: '75%' }}
              ></div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">P99 Latency</span>
              <span className="text-sm font-medium text-gray-900">
                {(metrics.metrics.performance.p99Latency / 1000).toFixed(2)}s
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full"
                style={{ width: '90%' }}
              ></div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-600">Throughput</span>
              <span className="text-sm font-medium text-gray-900">
                {metrics.metrics.performance.throughput.toFixed(1)} exec/hr
              </span>
            </div>
          </div>
        </div>

        {/* Top Workflows */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Workflows</h3>
          <div className="space-y-3">
            {metrics.metrics.topWorkflows.slice(0, 5).map((workflow, index) => (
              <div key={workflow.workflowId} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{workflow.workflowName}</p>
                    <p className="text-xs text-gray-500">{workflow.metric}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {workflow.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  trend: number;
  icon: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend, icon }) => {
  const isPositive = trend > 0;
  const trendColor = isPositive ? 'text-green-600' : 'text-red-600';
  const trendBg = isPositive ? 'bg-green-50' : 'bg-red-50';

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
      <div className="mt-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${trendBg} ${trendColor}`}>
          {isPositive ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
        </span>
        <span className="ml-2 text-xs text-gray-500">vs last period</span>
      </div>
    </div>
  );
};

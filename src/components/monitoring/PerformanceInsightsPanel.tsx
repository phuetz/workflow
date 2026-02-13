/**
 * Performance Insights Panel
 * Detailed performance analysis and bottleneck detection
 */

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import type { DateRange } from '../../types/advanced-analytics';
import { analyticsEngine } from '../../analytics/AdvancedAnalyticsEngine';
import { aggregationService } from '../../analytics/AggregationService';

interface PerformanceInsightsPanelProps {
  dateRange: DateRange;
}

export const PerformanceInsightsPanel: React.FC<PerformanceInsightsPanelProps> = ({ dateRange }) => {
  const [metrics, setMetrics] = useState<ReturnType<typeof analyticsEngine.getAggregatedMetrics> | null>(null);
  const [anomalies, setAnomalies] = useState<ReturnType<typeof analyticsEngine.getPerformanceAnomalies>>([]);
  const [nodeProfiles, setNodeProfiles] = useState<ReturnType<typeof analyticsEngine.getNodePerformanceProfiles>>([]);

  useEffect(() => {
    loadPerformanceData();
  }, [dateRange]);

  const loadPerformanceData = () => {
    const data = analyticsEngine.getAggregatedMetrics(dateRange);
    const perf = analyticsEngine.getPerformanceAnomalies(dateRange);
    const profiles = analyticsEngine.getNodePerformanceProfiles();

    setMetrics(data);
    setAnomalies(perf);
    setNodeProfiles(profiles);
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading performance data...</p>
        </div>
      </div>
    );
  }

  // Mock latency distribution data
  const latencyDistribution = [
    { range: '0-5s', count: 120 },
    { range: '5-10s', count: 85 },
    { range: '10-20s', count: 45 },
    { range: '20-30s', count: 25 },
    { range: '30-60s', count: 15 },
    { range: '60+s', count: 10 },
  ];

  // Mock latency over time
  const latencyOverTime = [
    { time: '00:00', p50: 5.2, p95: 12.5, p99: 18.3 },
    { time: '04:00', p50: 4.8, p95: 11.2, p99: 16.8 },
    { time: '08:00', p50: 6.5, p95: 15.8, p99: 22.4 },
    { time: '12:00', p50: 7.2, p95: 17.5, p99: 25.6 },
    { time: '16:00', p50: 6.8, p95: 16.2, p99: 23.1 },
    { time: '20:00', p50: 5.5, p95: 13.8, p99: 19.7 },
  ];

  // Mock slowest workflows
  const slowestWorkflows = [
    { name: 'Data Processing Pipeline', avgDuration: 45.2, p95: 62.5, executions: 150 },
    { name: 'Report Generation', avgDuration: 38.7, p95: 55.3, executions: 89 },
    { name: 'Email Campaign', avgDuration: 32.4, p95: 48.9, executions: 234 },
    { name: 'Database Sync', avgDuration: 28.9, p95: 42.1, executions: 112 },
    { name: 'API Integration', avgDuration: 25.3, p95: 38.7, executions: 298 },
  ];

  return (
    <div className="space-y-6">
      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Latency</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {(metrics.metrics.performance.avgLatency / 1000).toFixed(2)}s
              </p>
            </div>
            <div className="text-4xl">⚡</div>
          </div>
          <div className="mt-4">
            <span className="text-xs text-gray-500">Across all workflows</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">P95 Latency</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {(metrics.metrics.performance.p95Latency / 1000).toFixed(2)}s
              </p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
          <div className="mt-4">
            <span className="text-xs text-gray-500">95th percentile</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Throughput</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {metrics.metrics.performance.throughput.toFixed(1)}
              </p>
            </div>
            <div className="text-4xl">🚀</div>
          </div>
          <div className="mt-4">
            <span className="text-xs text-gray-500">Executions/hour</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Anomalies</p>
              <p className="mt-2 text-3xl font-bold text-red-600">
                {anomalies.length}
              </p>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
          <div className="mt-4">
            <span className="text-xs text-gray-500">Detected issues</span>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Over Time */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Latency Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={latencyOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="p50" stroke="#0088FE" name="P50" strokeWidth={2} />
              <Line type="monotone" dataKey="p95" stroke="#FFBB28" name="P95" strokeWidth={2} />
              <Line type="monotone" dataKey="p99" stroke="#FF8042" name="P99" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Latency Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Latency Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={latencyDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#00C49F" name="Executions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Slowest Workflows */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Slowest Workflows</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workflow
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P95 Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Executions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {slowestWorkflows.map((workflow, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {workflow.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {workflow.avgDuration.toFixed(1)}s
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {workflow.p95.toFixed(1)}s
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {workflow.executions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        workflow.avgDuration > 40
                          ? 'bg-red-100 text-red-800'
                          : workflow.avgDuration > 30
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {workflow.avgDuration > 40 ? 'Slow' : workflow.avgDuration > 30 ? 'Medium' : 'Fast'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Anomalies */}
      {anomalies.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Anomalies</h3>
          <div className="space-y-4">
            {anomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className="text-sm font-semibold text-red-800">
                      Performance Spike Detected
                    </h4>
                    <div className="mt-2 text-sm text-red-700">
                      <p>
                        Detected at {anomaly.detectedAt.toLocaleString()} - Deviation:{' '}
                        {anomaly.deviation.toFixed(1)}%
                      </p>
                      <p className="mt-1">
                        Expected: {anomaly.expected.toFixed(2)}s | Actual: {anomaly.actual.toFixed(2)}s
                      </p>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-medium text-red-800">Possible Causes:</p>
                      <ul className="mt-1 list-disc list-inside text-sm text-red-700">
                        {anomaly.possibleCauses.map((cause, idx) => (
                          <li key={idx}>{cause}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Recommendations */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Recommendations</h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
            <div className="flex-shrink-0">
              <span className="text-2xl">💡</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-900">Parallelize Independent Nodes</h4>
              <p className="mt-1 text-sm text-blue-700">
                Identify nodes that can run in parallel to reduce overall execution time by up to 40%.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
            <div className="flex-shrink-0">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-green-900">Optimize Database Queries</h4>
              <p className="mt-1 text-sm text-green-700">
                Review slow database nodes and add indexes to improve query performance.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚡</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-yellow-900">Implement Caching</h4>
              <p className="mt-1 text-sm text-yellow-700">
                Cache frequently accessed data to reduce API calls and improve response times.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

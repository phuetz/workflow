/**
 * Validation Dashboard
 * Real-time monitoring of validation system
 */

import React, { useState, useEffect } from 'react';
import { validationLoop } from '../../monitoring/ValidationLoop';
import { validationMetrics } from '../../monitoring/ValidationMetrics';
import { intelligentAlerts } from '../../monitoring/AlertSystem';
import { correctionLearner } from '../../monitoring/LearningSystem';
import type { ValidationMetricsSnapshot, ErrorTypeMetrics } from '../../monitoring/ValidationMetrics';
import { logger } from '../../services/SimpleLogger';

interface DashboardState {
  metrics: ValidationMetricsSnapshot | null;
  recentCorrections: any[];
  learningProgress: any;
  alerts: any;
  loading: boolean;
}

export const ValidationDashboard: React.FC = () => {
  const [state, setState] = useState<DashboardState>({
    metrics: null,
    recentCorrections: [],
    learningProgress: null,
    alerts: null,
    loading: true
  });

  const [selectedErrorType, setSelectedErrorType] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      const metrics = validationMetrics.getSnapshot();
      const recentCorrections = validationLoop.getHistory(20);
      const learningProgress = correctionLearner.exportModel();
      const alerts = intelligentAlerts.getStatistics();

      setState({
        metrics,
        recentCorrections,
        learningProgress,
        alerts,
        loading: false
      });
    } catch (error) {
      logger.error('Failed to load dashboard data', { error });
    }
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Validation Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Real-time monitoring of auto-correction and validation system
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex gap-2">
          {(['1h', '24h', '7d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {range === '1h' ? '1 Hour' : range === '24h' ? '24 Hours' : '7 Days'}
            </button>
          ))}
        </div>

        {/* Metrics Overview */}
        <MetricsOverview metrics={state.metrics?.overall} />

        {/* Success Rate Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <SuccessRateChart data={state.metrics?.timeSeries} />
          <ResolutionTimeChart data={state.metrics?.timeSeries} />
        </div>

        {/* Error Type Breakdown */}
        <ErrorTypeBreakdown
          errorTypes={state.metrics?.byErrorType}
          onSelectErrorType={setSelectedErrorType}
          selectedErrorType={selectedErrorType}
        />

        {/* Recent Corrections */}
        <RecentCorrectionsTable corrections={state.recentCorrections} />

        {/* Learning Progress */}
        <LearningProgressIndicator progress={state.learningProgress} />

        {/* System Health & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <SystemHealthMonitor />
          <AlertsPanel alerts={state.alerts} />
        </div>

        {/* Performance Impact */}
        <PerformanceImpactCard impact={state.metrics?.performanceImpact} />

        {/* User Impact */}
        <UserImpactCard impact={state.metrics?.userImpact} />

        {/* Recommendations */}
        {state.metrics?.recommendations && state.metrics.recommendations.length > 0 && (
          <RecommendationsCard recommendations={state.metrics.recommendations} />
        )}
      </div>
    </div>
  );
};

// Metrics Overview Component
const MetricsOverview: React.FC<{ metrics: any }> = ({ metrics }) => {
  if (!metrics) return null;

  const cards = [
    {
      title: 'Total Validations',
      value: metrics.totalValidations,
      color: 'blue',
      icon: '📊'
    },
    {
      title: 'Success Rate',
      value: `${(metrics.overallSuccessRate * 100).toFixed(1)}%`,
      color: metrics.overallSuccessRate > 0.8 ? 'green' : 'red',
      icon: '✅'
    },
    {
      title: 'Avg Resolution Time',
      value: `${(metrics.avgResolutionTime / 1000).toFixed(1)}s`,
      color: metrics.avgResolutionTime < 10000 ? 'green' : 'yellow',
      icon: '⏱️'
    },
    {
      title: 'Failed Validations',
      value: metrics.failedValidations,
      color: metrics.failedValidations > 10 ? 'red' : 'green',
      icon: '❌'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">{card.title}</p>
              <p className={`text-2xl font-bold text-${card.color}-600 mt-1`}>
                {card.value}
              </p>
            </div>
            <div className="text-3xl">{card.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Success Rate Chart Component
const SuccessRateChart: React.FC<{ data: any }> = ({ data }) => {
  if (!data?.successRateOverTime) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Success Rate Over Time</h3>
      <div className="h-64 flex items-end justify-between gap-2">
        {data.successRateOverTime.slice(-20).map((point: any, idx: number) => (
          <div
            key={idx}
            className="flex-1 bg-green-500 rounded-t"
            style={{ height: `${point.value * 100}%` }}
            title={`${(point.value * 100).toFixed(1)}%`}
          />
        ))}
      </div>
    </div>
  );
};

// Resolution Time Chart Component
const ResolutionTimeChart: React.FC<{ data: any }> = ({ data }) => {
  if (!data?.resolutionTimeOverTime) return null;

  const maxTime = Math.max(...data.resolutionTimeOverTime.map((p: any) => p.value));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Resolution Time Over Time</h3>
      <div className="h-64 flex items-end justify-between gap-2">
        {data.resolutionTimeOverTime.slice(-20).map((point: any, idx: number) => (
          <div
            key={idx}
            className="flex-1 bg-blue-500 rounded-t"
            style={{ height: `${(point.value / maxTime) * 100}%` }}
            title={`${(point.value / 1000).toFixed(2)}s`}
          />
        ))}
      </div>
    </div>
  );
};

// Error Type Breakdown Component
const ErrorTypeBreakdown: React.FC<{
  errorTypes: Map<string, ErrorTypeMetrics> | undefined;
  onSelectErrorType: (type: string | null) => void;
  selectedErrorType: string | null;
}> = ({ errorTypes, onSelectErrorType, selectedErrorType }) => {
  if (!errorTypes) return null;

  const types = Array.from(errorTypes.values()).sort(
    (a, b) => b.totalAttempts - a.totalAttempts
  );

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">Error Type Breakdown</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Error Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Total Attempts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Success Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Avg Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Trend
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {types.map(type => (
              <tr
                key={type.errorType}
                className={`hover:bg-gray-50 cursor-pointer ${
                  selectedErrorType === type.errorType ? 'bg-blue-50' : ''
                }`}
                onClick={() => onSelectErrorType(type.errorType)}
              >
                <td className="px-6 py-4 whitespace-nowrap font-medium">
                  {type.errorType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{type.totalAttempts}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      type.successRate > 0.8
                        ? 'bg-green-100 text-green-800'
                        : type.successRate > 0.6
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {(type.successRate * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {(type.avgResolutionTime / 1000).toFixed(2)}s
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {type.trendDirection === 'improving' && '📈'}
                  {type.trendDirection === 'degrading' && '📉'}
                  {type.trendDirection === 'stable' && '➡️'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Recent Corrections Table Component
const RecentCorrectionsTable: React.FC<{ corrections: any[] }> = ({ corrections }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">Recent Corrections</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Correction ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Duration
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {corrections.map((correction, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {new Date(correction.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                  {correction.correctionId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      correction.result.success
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {correction.result.success ? 'Success' : 'Failed'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {(correction.result.duration / 1000).toFixed(2)}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Learning Progress Indicator Component
const LearningProgressIndicator: React.FC<{ progress: any }> = ({ progress }) => {
  if (!progress) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">Learning System Status</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-gray-600 text-sm">Training Data</p>
          <p className="text-2xl font-bold text-blue-600">{progress.trainingDataSize}</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Strategies</p>
          <p className="text-2xl font-bold text-green-600">
            {progress.strategies?.length || 0}
          </p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Last Training</p>
          <p className="text-sm font-medium text-gray-700">
            {progress.lastTraining
              ? new Date(progress.lastTraining).toLocaleString()
              : 'Never'}
          </p>
        </div>
      </div>
    </div>
  );
};

// System Health Monitor Component
const SystemHealthMonitor: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">System Health</h3>
      <div className="space-y-4">
        <HealthCheckItem name="API Endpoints" status="healthy" />
        <HealthCheckItem name="Database" status="healthy" />
        <HealthCheckItem name="Cache" status="healthy" />
        <HealthCheckItem name="Queue" status="degraded" />
      </div>
    </div>
  );
};

const HealthCheckItem: React.FC<{ name: string; status: string }> = ({ name, status }) => {
  const statusColors = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    unhealthy: 'bg-red-500'
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-700">{name}</span>
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${statusColors[status as keyof typeof statusColors]}`} />
        <span className="text-sm text-gray-600 capitalize">{status}</span>
      </div>
    </div>
  );
};

// Alerts Panel Component
const AlertsPanel: React.FC<{ alerts: any }> = ({ alerts }) => {
  if (!alerts) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Alerts (24h)</h3>
      <div className="space-y-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Total</span>
          <span className="font-bold">{alerts.last24h}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Sent</span>
          <span className="font-bold text-green-600">{alerts.sent}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Suppressed</span>
          <span className="font-bold text-blue-600">{alerts.suppressed}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Active Cooldowns</span>
          <span className="font-bold text-yellow-600">{alerts.activeCooldowns}</span>
        </div>
      </div>
    </div>
  );
};

// Performance Impact Card Component
const PerformanceImpactCard: React.FC<{ impact: any }> = ({ impact }) => {
  if (!impact) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">Performance Impact</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-gray-600 text-sm">CPU Increase</p>
          <p className="text-xl font-bold">{impact.avgCPUIncrease.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Memory Increase</p>
          <p className="text-xl font-bold">{impact.avgMemoryIncrease.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Latency Increase</p>
          <p className="text-xl font-bold">{impact.avgLatencyIncrease.toFixed(0)}ms</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Severity</p>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
              impact.severity === 'low'
                ? 'bg-green-100 text-green-800'
                : impact.severity === 'medium'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {impact.severity}
          </span>
        </div>
      </div>
    </div>
  );
};

// User Impact Card Component
const UserImpactCard: React.FC<{ impact: any }> = ({ impact }) => {
  if (!impact) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">User Impact</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-gray-600 text-sm">Affected Users</p>
          <p className="text-xl font-bold">{impact.affectedUsers}</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Downtime</p>
          <p className="text-xl font-bold">{(impact.downtime / 1000).toFixed(0)}s</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Errors</p>
          <p className="text-xl font-bold">{impact.errorCount}</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Satisfaction</p>
          <p className="text-xl font-bold">{impact.satisfactionScore.toFixed(1)}/10</p>
        </div>
      </div>
    </div>
  );
};

// Recommendations Card Component
const RecommendationsCard: React.FC<{ recommendations: string[] }> = ({
  recommendations
}) => {
  return (
    <div className="bg-blue-50 rounded-lg p-6 mt-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        💡 Recommendations
      </h3>
      <ul className="space-y-2">
        {recommendations.map((rec, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span className="text-gray-700">{rec}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ValidationDashboard;

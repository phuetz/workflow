/**
 * Healing Dashboard
 * Displays healing analytics, success rates, and ROI metrics
 */

import React, { useState, useEffect } from 'react';
import { healingAnalytics } from '../../healing/HealingAnalytics';
import { logger } from '../../services/SimpleLogger';
import {
  HealingAnalytics as IHealingAnalytics,
  ErrorType,
  StrategyPerformance
} from '../../types/healing';

export const HealingDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<IHealingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await healingAnalytics.getAnalytics();
      setAnalytics(data);
    } catch (error) {
      logger.error('Failed to load healing analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading healing analytics...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Auto-Healing Dashboard</h1>
        <button
          onClick={loadAnalytics}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Success Rate"
          value={`${(analytics.successRate * 100).toFixed(1)}%`}
          subtitle={`${analytics.successfulHealings} of ${analytics.totalHealingAttempts} attempts`}
          trend={analytics.successRate >= 0.7 ? 'up' : 'down'}
        />
        <MetricCard
          title="MTTR Reduction"
          value={`${analytics.mttrReduction.toFixed(0)}%`}
          subtitle="Mean Time To Resolution"
          trend="up"
        />
        <MetricCard
          title="Time Saved"
          value={`${analytics.timesSaved.toFixed(1)}h`}
          subtitle="Developer hours saved"
          trend="up"
        />
        <MetricCard
          title="Cost Savings"
          value={`$${analytics.costSavings.toFixed(0)}`}
          subtitle="Estimated savings"
          trend="up"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Over Time */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Healing Performance</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Average Time:</span>
              <span className="font-medium">{(analytics.averageHealingTime / 1000).toFixed(1)}s</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Median Time:</span>
              <span className="font-medium">{(analytics.medianHealingTime / 1000).toFixed(1)}s</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>P95 Time:</span>
              <span className="font-medium">{(analytics.p95HealingTime / 1000).toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* Error Types */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Errors by Type</h2>
          <div className="space-y-3">
            {Object.entries(analytics.healingByErrorType)
              .sort(([, a], [, b]) => b.count - a.count)
              .slice(0, 5)
              .map(([type, stats]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{type}</span>
                      <span className="text-gray-500">{stats.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${stats.successRate * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Strategy Performance */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Strategy Performance</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Strategy</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Used</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Success Rate</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Avg Duration</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Time Saved</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.values(analytics.strategyPerformance)
                .sort((a, b) => b.timesUsed - a.timesUsed)
                .slice(0, 10)
                .map((perf) => (
                  <tr key={perf.strategyId}>
                    <td className="px-4 py-2 text-sm">{perf.strategyName}</td>
                    <td className="px-4 py-2 text-sm">{perf.timesUsed}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${perf.successRate >= 0.7 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {(perf.successRate * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">{(perf.averageDuration / 1000).toFixed(1)}s</td>
                    <td className="px-4 py-2 text-sm">{(perf.totalTimeSaved / 60).toFixed(0)}min</td>
                    <td className="px-4 py-2 text-sm">
                      <TrendIndicator trend={perf.trend} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Stats */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-2">
          {analytics.dailyStats.slice(-7).reverse().map((day) => (
            <div key={day.date} className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium">{day.date}</span>
              <div className="flex space-x-4 text-sm">
                <span className="text-green-600">{day.successes} healed</span>
                <span className="text-red-600">{day.failures} failed</span>
                <span className="text-gray-500">{(day.averageTime / 1000).toFixed(1)}s avg</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  trend: 'up' | 'down' | 'neutral';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, trend }) => {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600'
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <span className={trendColors[trend]}>
          {trend === 'up' && '↑'}
          {trend === 'down' && '↓'}
          {trend === 'neutral' && '→'}
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
    </div>
  );
};

const TrendIndicator: React.FC<{ trend: 'improving' | 'declining' | 'stable' }> = ({ trend }) => {
  const colors = {
    improving: 'text-green-600',
    declining: 'text-red-600',
    stable: 'text-gray-600'
  };

  const icons = {
    improving: '↑',
    declining: '↓',
    stable: '→'
  };

  return (
    <span className={colors[trend]}>
      {icons[trend]} {trend}
    </span>
  );
};

export default HealingDashboard;

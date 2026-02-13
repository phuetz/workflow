/**
 * Metrics Dashboard
 * View evaluation results with charts and analytics
 */

import React, { useState } from 'react';
import type { EvaluationRun, MetricType } from '../../types/evaluation';

interface MetricsDashboardProps {
  run?: EvaluationRun;
  runs?: EvaluationRun[];
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ run, runs = [] }) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType | 'all'>('all');

  if (!run && runs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No evaluation data to display
      </div>
    );
  }

  const displayRun = run || runs[0];

  // Calculate metrics
  const metricTypes = Object.keys(displayRun.summary.metrics) as MetricType[];
  const passRate = (displayRun.summary.passed / displayRun.summary.totalTests) * 100;

  return (
    <div className="metrics-dashboard bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{displayRun.evaluationName}</h2>
        <p className="text-gray-600 mt-1">
          Run on {new Date(displayRun.startTime).toLocaleString()}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium">Total Tests</div>
          <div className="text-3xl font-bold text-blue-900 mt-1">{displayRun.summary.totalTests}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium">Passed</div>
          <div className="text-3xl font-bold text-green-900 mt-1">{displayRun.summary.passed}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm text-red-600 font-medium">Failed</div>
          <div className="text-3xl font-bold text-red-900 mt-1">{displayRun.summary.failed}</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-medium">Pass Rate</div>
          <div className="text-3xl font-bold text-purple-900 mt-1">{passRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Metric Filter */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedMetric('all')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              selectedMetric === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Metrics
          </button>
          {metricTypes.map((metricType) => (
            <button
              key={metricType}
              onClick={() => setSelectedMetric(metricType)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                selectedMetric === metricType
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {metricType.charAt(0).toUpperCase() + metricType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="space-y-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Metric Scores</h3>
        {metricTypes.map((metricType) => {
          const metric = displayRun.summary.metrics[metricType];
          if (!metric) return null;

          const percentage = metric.average * 100;

          return (
            <div key={metricType} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800 capitalize">{metricType}</span>
                <span className="text-sm font-semibold text-gray-900">{percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 rounded-full h-2 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                <span>Min: {(metric.min * 100).toFixed(1)}%</span>
                <span>Max: {(metric.max * 100).toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Test Results */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Test Results</h3>
        <div className="space-y-2">
          {displayRun.results.map((result) => (
            <div
              key={result.id}
              className={`border rounded-lg p-3 ${
                result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-xl ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {result.passed ? '✓' : '✗'}
                  </span>
                  <div>
                    <div className="font-medium text-gray-800">{result.inputName}</div>
                    <div className="text-sm text-gray-600">
                      Score: {(result.overallScore * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {result.executionData?.duration}ms
                </div>
              </div>
              {!result.passed && (
                <div className="mt-2 text-sm text-red-700">
                  Failed metrics: {result.metrics.filter((m) => !m.passed).map((m) => m.metricName).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Trend Chart (if multiple runs) */}
      {runs.length > 1 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Score Trend</h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {runs.slice(0, 10).reverse().map((r, index) => {
              const height = r.summary.averageScore * 100;
              return (
                <div key={r.id} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                    style={{ height: `${height}%` }}
                    title={`Score: ${height.toFixed(1)}%`}
                  />
                  <div className="text-xs text-gray-600 mt-2">
                    {new Date(r.startTime).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Export Options */}
      <div className="mt-6 flex justify-end gap-2">
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          Export JSON
        </button>
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          Export CSV
        </button>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Export PDF Report
        </button>
      </div>
    </div>
  );
};

export default MetricsDashboard;

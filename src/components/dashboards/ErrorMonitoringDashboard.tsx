/**
 * ErrorMonitoringDashboard.tsx
 * Real-time error monitoring dashboard with visualizations and actions
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ErrorMonitoringSystem,
  type ErrorEvent,
  type ErrorStats,
  type ErrorSeverity,
  type ErrorType,
} from '../../monitoring/ErrorMonitoringSystem';
import {
  ErrorPatternAnalyzer,
  type ErrorPattern,
  type PatternAnalysis,
} from '../../monitoring/ErrorPatternAnalyzer';
import { AutoCorrection, type CorrectionStats } from '../../monitoring/AutoCorrection';
import { logger } from '../../services/SimpleLogger';

interface ErrorMonitoringDashboardProps {
  className?: string;
}

export const ErrorMonitoringDashboard: React.FC<ErrorMonitoringDashboardProps> = ({
  className = '',
}) => {
  const [monitor] = useState(() => ErrorMonitoringSystem.getInstance());
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [recentErrors, setRecentErrors] = useState<ErrorEvent[]>([]);
  const [patterns, setPatterns] = useState<PatternAnalysis | null>(null);
  const [correctionStats, setCorrectionStats] = useState<CorrectionStats | null>(null);
  const [selectedError, setSelectedError] = useState<ErrorEvent | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [severityFilter, setSeverityFilter] = useState<ErrorSeverity | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ErrorType | 'all'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const now = new Date();
      const timeRanges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };

      const startDate = new Date(now.getTime() - timeRanges[timeRange]);

      // Get stats
      const statsData = await monitor.getStats({
        startDate,
        endDate: now,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
      });
      setStats(statsData);

      // Get recent errors
      const errors = await monitor.getRecentErrors(100);
      setRecentErrors(errors);

      // Get patterns
      const analyzer = new ErrorPatternAnalyzer();
      const patternsData = await analyzer.analyzeErrors(errors);
      setPatterns(patternsData);

      // Get correction stats
      const correction = new AutoCorrection();
      const corrStats = correction.getStats();
      setCorrectionStats(corrStats);
    } catch (error) {
      logger.error('Failed to load monitoring data', { error });
    }
  }, [monitor, timeRange, severityFilter, typeFilter]);

  useEffect(() => {
    loadData();

    if (autoRefresh) {
      const interval = setInterval(loadData, 5000); // Refresh every 5s
      return () => clearInterval(interval);
    }
  }, [loadData, autoRefresh]);

  // Listen for new errors
  useEffect(() => {
    const handleNewError = (error: ErrorEvent) => {
      setRecentErrors(prev => [error, ...prev].slice(0, 100));
    };

    monitor.on('error', handleNewError);
    return () => {
      monitor.off('error', handleNewError);
    };
  }, [monitor]);

  // Calculate error rate chart data
  const errorRateData = useMemo(() => {
    if (!recentErrors.length) return [];

    const now = Date.now();
    const intervals = 12;
    const intervalSize = (timeRange === '1h' ? 5 : timeRange === '24h' ? 120 : 360) * 60 * 1000;

    const data = Array.from({ length: intervals }, (_, i) => {
      const start = now - (intervals - i) * intervalSize;
      const end = start + intervalSize;
      const count = recentErrors.filter(
        e => e.timestamp.getTime() >= start && e.timestamp.getTime() < end
      ).length;

      return {
        time: new Date(start).toLocaleTimeString(),
        errors: count,
      };
    });

    return data;
  }, [recentErrors, timeRange]);

  const handleResolveError = async (errorId: string) => {
    try {
      await monitor.resolveError(errorId, 'manual', 'Resolved by user');
      await loadData();
    } catch (error) {
      logger.error('Failed to resolve error', { error });
    }
  };

  const getSeverityColor = (severity: ErrorSeverity): string => {
    const colors = {
      low: 'text-blue-600 bg-blue-100',
      medium: 'text-yellow-600 bg-yellow-100',
      high: 'text-orange-600 bg-orange-100',
      critical: 'text-red-600 bg-red-100',
    };
    return colors[severity];
  };

  const getSeverityBadge = (severity: ErrorSeverity) => (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getSeverityColor(severity)}`}>
      {severity.toUpperCase()}
    </span>
  );

  return (
    <div className={`error-monitoring-dashboard ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Error Monitoring</h1>
            <p className="text-gray-600 mt-1">Real-time error tracking and analysis</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          value={timeRange}
          onChange={e => setTimeRange(e.target.value as typeof timeRange)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="1h">Last Hour</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>

        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value as typeof severityFilter)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Types</option>
          <option value="runtime">Runtime</option>
          <option value="network">Network</option>
          <option value="validation">Validation</option>
          <option value="security">Security</option>
          <option value="performance">Performance</option>
          <option value="database">Database</option>
        </select>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Errors</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500 mt-2">
              {stats.errorRate.toFixed(2)} errors/min
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Resolved</div>
            <div className="text-3xl font-bold text-green-600">{stats.resolved}</div>
            <div className="text-sm text-gray-500 mt-2">
              {((stats.resolved / stats.total) * 100).toFixed(1)}% resolution rate
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Unresolved</div>
            <div className="text-3xl font-bold text-red-600">{stats.unresolved}</div>
            <div className="text-sm text-gray-500 mt-2">Requires attention</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">MTTR</div>
            <div className="text-3xl font-bold text-blue-600">{stats.mttr.toFixed(1)}m</div>
            <div className="text-sm text-gray-500 mt-2">Mean time to resolution</div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Error Rate Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Error Rate Over Time</h3>
          <div className="h-64">
            <svg viewBox="0 0 600 200" className="w-full h-full">
              {errorRateData.map((point, i) => {
                const x = (i / (errorRateData.length - 1)) * 550 + 25;
                const maxErrors = Math.max(...errorRateData.map(d => d.errors), 1);
                const y = 180 - (point.errors / maxErrors) * 150;

                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="4" fill="#3b82f6" />
                    {i > 0 && (
                      <line
                        x1={(i - 1) / (errorRateData.length - 1) * 550 + 25}
                        y1={180 - (errorRateData[i - 1].errors / maxErrors) * 150}
                        x2={x}
                        y2={y}
                        stroke="#3b82f6"
                        strokeWidth="2"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Error Types Distribution */}
        {stats && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Errors by Type</h3>
            <div className="space-y-3">
              {Object.entries(stats.byType).map(([type, count]) => {
                const percentage = (count / stats.total) * 100;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{type}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Top Patterns */}
      {patterns && patterns.patterns.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Top Error Patterns</h3>
          <div className="space-y-4">
            {patterns.patterns.slice(0, 5).map((pattern: ErrorPattern) => (
              <div key={pattern.id} className="border-l-4 border-blue-600 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{String(pattern.pattern)}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {pattern.count} occurrences • {pattern.affectedUsers.size} users affected
                    </div>
                    {pattern.suggestedFix && (
                      <div className="text-sm text-blue-600 mt-2">
                        Suggested fix: {pattern.suggestedFix}
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    {getSeverityBadge(pattern.severity)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {patterns && patterns.recommendations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-yellow-900">Recommendations</h3>
          <ul className="space-y-2">
            {patterns.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-yellow-900">
                <span className="text-yellow-600 mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Auto-Correction Stats */}
      {correctionStats && correctionStats.total > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Auto-Correction Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Success Rate</div>
              <div className="text-2xl font-bold text-green-600">
                {(correctionStats.successRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {correctionStats.successful} / {correctionStats.total} corrections
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Average Time</div>
              <div className="text-2xl font-bold text-blue-600">
                {correctionStats.averageTime.toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-500 mt-1">Per correction</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Top Strategy</div>
              <div className="text-lg font-bold text-gray-900">
                {Object.entries(correctionStats.byStrategy).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Errors Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Recent Errors</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentErrors.slice(0, 20).map(error => (
                <tr key={error.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {error.timestamp.toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getSeverityBadge(error.severity)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <span className="capitalize">{error.type}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-md truncate">{error.message}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {error.resolved ? (
                      <span className="text-green-600 font-medium">Resolved</span>
                    ) : (
                      <span className="text-red-600 font-medium">Unresolved</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedError(error)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      View
                    </button>
                    {!error.resolved && (
                      <button
                        onClick={() => handleResolveError(error.id)}
                        className="text-green-600 hover:text-green-800"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Detail Modal */}
      {selectedError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Error Details</h3>
              <button
                onClick={() => setSelectedError(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Message</div>
                <div className="text-gray-900 font-medium">{selectedError.message}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Severity</div>
                  {getSeverityBadge(selectedError.severity)}
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Type</div>
                  <div className="text-gray-900 capitalize">{selectedError.type}</div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">Timestamp</div>
                <div className="text-gray-900">{selectedError.timestamp.toLocaleString()}</div>
              </div>

              {selectedError.stack && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Stack Trace</div>
                  <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto">
                    {selectedError.stack}
                  </pre>
                </div>
              )}

              {selectedError.context.workflowId && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Workflow ID</div>
                  <div className="text-gray-900 font-mono text-sm">
                    {selectedError.context.workflowId}
                  </div>
                </div>
              )}

              {Object.keys(selectedError.metadata).length > 0 && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Metadata</div>
                  <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedError.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrorMonitoringDashboard;

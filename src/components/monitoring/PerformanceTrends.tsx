import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Activity,
  Calendar,
  BarChart3,
  LineChart,
  X,
} from 'lucide-react';
import { performanceTrends, TrendAnalysis, ComparativeAnalysis, PerformanceRegression } from '../../profiling/PerformanceTrends';
import { continuousMonitor } from '../../profiling/ContinuousMonitor';

interface PerformanceTrendsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PerformanceTrends: React.FC<PerformanceTrendsProps> = ({ isOpen, onClose }) => {
  const { darkMode } = useWorkflowStore();
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null);
  const [comparison, setComparison] = useState<ComparativeAnalysis | null>(null);
  const [regressions, setRegressions] = useState<PerformanceRegression[]>([]);
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<7 | 30>(7);
  const [activeTab, setActiveTab] = useState<'trends' | 'comparison' | 'regressions'>('trends');

  useEffect(() => {
    if (!isOpen) return;

    // Load available metrics
    const metrics = continuousMonitor.getAvailableMetrics();
    setAvailableMetrics(metrics);

    // Select first metric if none selected
    if (!selectedMetric && metrics.length > 0) {
      setSelectedMetric(metrics[0]);
    }

    // Load regressions
    const regs = performanceTrends.getRegressions(50);
    setRegressions(regs);

    // Update every 10 seconds
    const interval = setInterval(() => {
      const metrics = continuousMonitor.getAvailableMetrics();
      setAvailableMetrics(metrics);

      const regs = performanceTrends.getRegressions(50);
      setRegressions(regs);
    }, 10000);

    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (!selectedMetric) return;

    // Analyze trends
    const analysis = performanceTrends.analyzeTrends(selectedMetric, timeRange);
    setTrendAnalysis(analysis);

    // Compare performance
    const comp = performanceTrends.comparePerformance(selectedMetric);
    setComparison(comp);
  }, [selectedMetric, timeRange]);

  const getTrendIcon = (trend: 'improving' | 'stable' | 'degrading') => {
    switch (trend) {
      case 'improving':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-500" />;
      case 'degrading':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
    }
  };

  const getTrendColor = (trend: 'improving' | 'stable' | 'degrading') => {
    switch (trend) {
      case 'improving':
        return 'text-green-600';
      case 'stable':
        return 'text-gray-600';
      case 'degrading':
        return 'text-red-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const formatValue = (value: number, metric: string): string => {
    if (metric.includes('time') || metric.includes('latency')) {
      return `${value.toFixed(2)}ms`;
    }
    if (metric.includes('memory') || metric.includes('usage')) {
      return `${value.toFixed(2)}%`;
    }
    return value.toFixed(2);
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`w-full max-w-6xl h-5/6 rounded-lg shadow-xl border overflow-hidden flex flex-col ${
          darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Performance Trends</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {(['trends', 'comparison', 'regressions'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? darkMode
                    ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400'
                    : 'bg-gray-50 text-blue-600 border-b-2 border-blue-600'
                  : darkMode
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Metric Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Select Metric</label>
            <div className="flex gap-4">
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className={`flex-1 px-3 py-2 rounded border ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-300'
                }`}
              >
                {availableMetrics.map(metric => (
                  <option key={metric} value={metric}>
                    {metric}
                  </option>
                ))}
              </select>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(Number(e.target.value) as 7 | 30)}
                className={`px-3 py-2 rounded border ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-300'
                }`}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </div>
          </div>

          {/* Trends Tab */}
          {activeTab === 'trends' && trendAnalysis && (
            <div className="space-y-6">
              {/* Trend Summary Card */}
              <div
                className={`p-4 rounded-lg border ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Trend Analysis</h3>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(trendAnalysis.trend)}
                    <span className={`font-medium ${getTrendColor(trendAnalysis.trend)}`}>
                      {trendAnalysis.trend.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Current Value</div>
                    <div className="text-xl font-bold">
                      {formatValue(trendAnalysis.currentValue, selectedMetric)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Previous Value</div>
                    <div className="text-xl font-bold">
                      {formatValue(trendAnalysis.previousValue, selectedMetric)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Change</div>
                    <div className={`text-xl font-bold ${
                      trendAnalysis.percentChange > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {trendAnalysis.percentChange > 0 ? '+' : ''}
                      {trendAnalysis.percentChange.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Trend Strength</div>
                    <div className="text-xl font-bold">
                      {(Math.abs(trendAnalysis.trendStrength) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div
                className={`p-4 rounded-lg border ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <h3 className="text-lg font-semibold mb-4">Statistics</h3>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 mb-1">Mean</div>
                    <div className="font-medium">
                      {formatValue(trendAnalysis.statistics.mean, selectedMetric)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Median</div>
                    <div className="font-medium">
                      {formatValue(trendAnalysis.statistics.median, selectedMetric)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">P95</div>
                    <div className="font-medium">
                      {formatValue(trendAnalysis.statistics.p95, selectedMetric)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">P99</div>
                    <div className="font-medium">
                      {formatValue(trendAnalysis.statistics.p99, selectedMetric)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Min</div>
                    <div className="font-medium">
                      {formatValue(trendAnalysis.statistics.min, selectedMetric)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Max</div>
                    <div className="font-medium">
                      {formatValue(trendAnalysis.statistics.max, selectedMetric)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Std Dev</div>
                    <div className="font-medium">
                      {formatValue(trendAnalysis.statistics.stdDev, selectedMetric)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Sample Size</div>
                    <div className="font-medium">{trendAnalysis.statistics.sampleSize}</div>
                  </div>
                </div>
              </div>

              {/* Forecast */}
              <div
                className={`p-4 rounded-lg border ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <h3 className="text-lg font-semibold mb-4">Forecast</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Next Day</div>
                    <div className="text-lg font-bold">
                      {formatValue(trendAnalysis.forecast.nextDay, selectedMetric)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Next Week</div>
                    <div className="text-lg font-bold">
                      {formatValue(trendAnalysis.forecast.nextWeek, selectedMetric)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Next Month</div>
                    <div className="text-lg font-bold">
                      {formatValue(trendAnalysis.forecast.nextMonth, selectedMetric)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Confidence</div>
                    <div className="text-lg font-bold">
                      {(trendAnalysis.forecast.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Simple Chart Visualization */}
              <div
                className={`p-4 rounded-lg border ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <h3 className="text-lg font-semibold mb-4">Trend Visualization</h3>
                <div className="flex items-end justify-between h-48 gap-1">
                  {trendAnalysis.dataPoints.slice(-50).map((point, i) => {
                    const maxValue = Math.max(...trendAnalysis.dataPoints.map(p => p.smoothedValue || p.value));
                    const height = ((point.smoothedValue || point.value) / maxValue) * 100;
                    return (
                      <div
                        key={i}
                        className={`flex-1 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} rounded-t transition-all`}
                        style={{ height: `${height}%` }}
                        title={`${formatValue(point.smoothedValue || point.value, selectedMetric)}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Comparison Tab */}
          {activeTab === 'comparison' && comparison && (
            <div className="space-y-6">
              <div
                className={`p-4 rounded-lg border ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <h3 className="text-lg font-semibold mb-4">Week-over-Week Comparison</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Change</div>
                    <div className={`text-xl font-bold ${
                      comparison.weekOverWeek.change > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {comparison.weekOverWeek.change > 0 ? '+' : ''}
                      {formatValue(comparison.weekOverWeek.change, selectedMetric)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Percent Change</div>
                    <div className={`text-xl font-bold ${
                      comparison.weekOverWeek.percentChange > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {comparison.weekOverWeek.percentChange > 0 ? '+' : ''}
                      {comparison.weekOverWeek.percentChange.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Statistically Significant</div>
                    <div className="flex items-center gap-2">
                      {comparison.weekOverWeek.significant ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="font-medium">Yes</span>
                        </>
                      ) : (
                        <>
                          <X className="w-5 h-5 text-gray-500" />
                          <span className="font-medium">No</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 rounded-lg border ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <h3 className="text-lg font-semibold mb-4">Month-over-Month Comparison</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Change</div>
                    <div className={`text-xl font-bold ${
                      comparison.monthOverMonth.change > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {comparison.monthOverMonth.change > 0 ? '+' : ''}
                      {formatValue(comparison.monthOverMonth.change, selectedMetric)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Percent Change</div>
                    <div className={`text-xl font-bold ${
                      comparison.monthOverMonth.percentChange > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {comparison.monthOverMonth.percentChange > 0 ? '+' : ''}
                      {comparison.monthOverMonth.percentChange.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Statistically Significant</div>
                    <div className="flex items-center gap-2">
                      {comparison.monthOverMonth.significant ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="font-medium">Yes</span>
                        </>
                      ) : (
                        <>
                          <X className="w-5 h-5 text-gray-500" />
                          <span className="font-medium">No</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 rounded-lg border ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <h3 className="text-lg font-semibold mb-4">Current vs Previous Statistics</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3 text-blue-600">Current Period</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Mean</span>
                        <span className="font-medium">{formatValue(comparison.current.mean, selectedMetric)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">P95</span>
                        <span className="font-medium">{formatValue(comparison.current.p95, selectedMetric)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sample Size</span>
                        <span className="font-medium">{comparison.current.sampleSize}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3 text-gray-600">Previous Period</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Mean</span>
                        <span className="font-medium">{formatValue(comparison.previous.mean, selectedMetric)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">P95</span>
                        <span className="font-medium">{formatValue(comparison.previous.p95, selectedMetric)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sample Size</span>
                        <span className="font-medium">{comparison.previous.sampleSize}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Regressions Tab */}
          {activeTab === 'regressions' && (
            <div className="space-y-4">
              {regressions.length === 0 ? (
                <div
                  className={`p-8 rounded-lg border text-center ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold mb-2">No Regressions Detected</h3>
                  <p className="text-gray-500">All metrics are performing within expected ranges.</p>
                </div>
              ) : (
                regressions.map((regression, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className={`w-5 h-5 ${
                            regression.severity === 'critical' ? 'text-red-500' :
                            regression.severity === 'high' ? 'text-orange-500' :
                            regression.severity === 'medium' ? 'text-yellow-500' :
                            'text-blue-500'
                          }`} />
                          <h3 className="font-semibold">{regression.metric}</h3>
                        </div>
                        <div className="text-sm text-gray-500">
                          Detected: {formatTimestamp(regression.detectedAt)}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        getSeverityColor(regression.severity)
                      }`}>
                        {regression.severity.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Previous Baseline</div>
                        <div className="font-medium">
                          {formatValue(regression.previousBaseline, regression.metric)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Current Value</div>
                        <div className="font-medium text-red-600">
                          {formatValue(regression.currentValue, regression.metric)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Degradation</div>
                        <div className="font-medium text-red-600">
                          +{regression.degradation.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Possible Causes:</div>
                      <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
                        {regression.possibleCauses.map((cause, i) => (
                          <li key={i}>{cause}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

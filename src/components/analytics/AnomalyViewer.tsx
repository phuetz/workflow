/**
 * Anomaly Viewer Component
 *
 * Displays detected anomalies with:
 * - Timeline visualization
 * - Anomaly details and severity
 * - Root cause analysis
 * - Remediation suggestions
 * - Filtering and search
 *
 * @module AnomalyViewer
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  TrendingUp,
  Filter,
  Search,
  Calendar,
  Zap,
  Activity,
} from 'lucide-react';
import {
  getAnomalyDetectionEngine,
  Anomaly,
  AnomalyReport,
  RootCause,
} from '../../analytics/AnomalyDetection';
import { WorkflowExecutionData } from '../../analytics/MLModels';
import { logger } from '../../services/SimpleLogger';

// ============================================================================
// Types
// ============================================================================

interface AnomalyViewerProps {
  workflowId?: string;
  timeRange?: { start: number; end: number };
  autoRefresh?: boolean;
}

// ============================================================================
// Severity Badge Component
// ============================================================================

const SeverityBadge: React.FC<{ severity: Anomaly['severity'] }> = ({ severity }) => {
  const config = {
    low: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      icon: <Info className="w-4 h-4" />,
    },
    medium: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      icon: <AlertCircle className="w-4 h-4" />,
    },
    high: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    critical: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: <AlertTriangle className="w-4 h-4" />,
    },
  };

  const { bg, text, icon } = config[severity];

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${bg} ${text} text-xs font-medium`}>
      {icon}
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </div>
  );
};

// ============================================================================
// Anomaly Card Component
// ============================================================================

const AnomalyCard: React.FC<{ anomaly: Anomaly; onSelect: () => void }> = ({
  anomaly,
  onSelect,
}) => {
  const getTypeIcon = (type: Anomaly['type']) => {
    const icons = {
      performance: <Activity className="w-5 h-5" />,
      error: <AlertTriangle className="w-5 h-5" />,
      resource: <Zap className="w-5 h-5" />,
      cost: <TrendingUp className="w-5 h-5" />,
      pattern: <Filter className="w-5 h-5" />,
    };

    return icons[type];
  };

  return (
    <div
      onClick={onSelect}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-gray-600">{getTypeIcon(anomaly.type)}</div>
          <div>
            <h3 className="font-semibold text-gray-900">{anomaly.description}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(anomaly.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
        <SeverityBadge severity={anomaly.severity} />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Metric:</span>
          <span className="font-medium">{anomaly.metric}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Anomaly Score:</span>
          <span className="font-medium">{(anomaly.score * 100).toFixed(0)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Deviation:</span>
          <span className="font-medium">{anomaly.deviation.toFixed(2)}σ</span>
        </div>
      </div>

      {anomaly.recommendations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600 font-medium mb-1">Top Recommendation:</p>
          <p className="text-xs text-gray-800">{anomaly.recommendations[0]}</p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Anomaly Details Panel
// ============================================================================

const AnomalyDetailsPanel: React.FC<{ anomaly: Anomaly; onClose: () => void }> = ({
  anomaly,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Anomaly Details</h2>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(anomaly.timestamp).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Overview */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Overview</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium capitalize">{anomaly.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Severity:</span>
                <SeverityBadge severity={anomaly.severity} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Metric:</span>
                <span className="font-medium">{anomaly.metric}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Anomaly Score:</span>
                <span className="font-medium">{(anomaly.score * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Values */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Values</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Actual Value:</span>
                <span className="font-medium text-red-600">{anomaly.actualValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expected Value:</span>
                <span className="font-medium text-green-600">{anomaly.expectedValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Deviation:</span>
                <span className="font-medium">{anomaly.deviation.toFixed(2)} standard deviations</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
            <p className="text-gray-700 bg-gray-50 rounded-lg p-4">{anomaly.description}</p>
          </div>

          {/* Root Causes */}
          {anomaly.rootCauses.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Root Cause Analysis</h3>
              <div className="space-y-3">
                {anomaly.rootCauses.map((cause, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{cause.description}</h4>
                      <span className="text-sm text-gray-500">
                        {(cause.likelihood * 100).toFixed(0)}% likely
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${cause.likelihood * 100}%` }}
                      ></div>
                    </div>
                    {cause.evidence.length > 0 && (
                      <ul className="text-sm text-gray-600 space-y-1 mt-2">
                        {cause.evidence.map((ev, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">•</span>
                            <span>{ev}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {anomaly.recommendations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommendations</h3>
              <ul className="space-y-2">
                {anomaly.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-blue-50 rounded-lg p-3">
                    <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-800">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Auto Remediation */}
          {anomaly.autoRemediation && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Auto Remediation</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{anomaly.autoRemediation.action}</h4>
                  <span className="text-sm text-green-600">
                    {(anomaly.autoRemediation.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
                <p className="text-gray-700 mb-3">{anomaly.autoRemediation.description}</p>
                {anomaly.autoRemediation.requiresApproval && (
                  <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                    Approve & Execute
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main AnomalyViewer Component
// ============================================================================

export const AnomalyViewer: React.FC<AnomalyViewerProps> = ({
  workflowId,
  timeRange,
  autoRefresh = true,
}) => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [report, setReport] = useState<AnomalyReport | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<Anomaly['severity'] | 'all'>('all');
  const [filterType, setFilterType] = useState<Anomaly['type'] | 'all'>('all');

  useEffect(() => {
    loadAnomalies();

    if (autoRefresh) {
      const interval = setInterval(loadAnomalies, 30000);
      return () => clearInterval(interval);
    }
  }, [workflowId, timeRange, autoRefresh]);

  const loadAnomalies = async () => {
    try {
      setLoading(true);

      const detector = getAnomalyDetectionEngine();

      // Initialize with mock data if needed
      if (!detector.getDetectedAnomalies().length) {
        const mockData = generateMockExecutionData(50);
        detector.initialize(mockData);

        // Detect anomalies in mock data
        for (const execution of mockData.slice(0, 10)) {
          await detector.detectAnomalies(execution);
        }
      }

      const detectedAnomalies = detector.getDetectedAnomalies();

      // Filter by workflow if specified
      let filtered = workflowId
        ? detectedAnomalies.filter((a) => a.workflowId === workflowId)
        : detectedAnomalies;

      // Filter by time range
      if (timeRange) {
        filtered = filtered.filter(
          (a) => a.timestamp >= timeRange.start && a.timestamp <= timeRange.end
        );
      }

      setAnomalies(filtered);

      // Generate report
      const anomalyReport = detector.generateReport(timeRange);
      setReport(anomalyReport);

      setLoading(false);
    } catch (err) {
      logger.error('Error loading anomalies:', err);
      setLoading(false);
    }
  };

  // Filter anomalies based on search and filters
  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((anomaly) => {
      // Search filter
      if (searchTerm && !anomaly.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Severity filter
      if (filterSeverity !== 'all' && anomaly.severity !== filterSeverity) {
        return false;
      }

      // Type filter
      if (filterType !== 'all' && anomaly.type !== filterType) {
        return false;
      }

      return true;
    });
  }, [anomalies, searchTerm, filterSeverity, filterType]);

  // Prepare timeline data
  const timelineData = useMemo(() => {
    return filteredAnomalies.map((a) => ({
      timestamp: a.timestamp,
      score: a.score * 100,
      severity: a.severity,
      description: a.description,
    }));
  }, [filteredAnomalies]);

  const getSeverityColor = (severity: Anomaly['severity']) => {
    const colors = {
      low: '#3b82f6',
      medium: '#eab308',
      high: '#f97316',
      critical: '#ef4444',
    };
    return colors[severity];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Anomaly Detection</h1>
        <p className="text-gray-600 mt-1">
          Real-time monitoring and analysis of workflow anomalies
        </p>
      </div>

      {/* Summary Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Anomalies</p>
                <p className="text-2xl font-bold text-gray-900">{report.totalAnomalies}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Critical</p>
                <p className="text-2xl font-bold text-red-600">
                  {report.anomaliesBySeverity.critical || 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">High Priority</p>
                <p className="text-2xl font-bold text-orange-600">
                  {report.anomaliesBySeverity.high || 0}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Trend</p>
                <p className="text-2xl font-bold text-gray-900">
                  {report.trends.rate.toFixed(1)}/day
                </p>
              </div>
              <TrendingUp
                className={`w-8 h-8 ${report.trends.increasing ? 'text-red-500' : 'text-green-500'}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Timeline Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Anomaly Timeline</h2>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(ts) => new Date(ts).toLocaleDateString()}
            />
            <YAxis dataKey="score" label={{ value: 'Anomaly Score (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                if (!payload || !payload[0]) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                    <p className="font-semibold">{data.description}</p>
                    <p className="text-sm text-gray-600">{new Date(data.timestamp).toLocaleString()}</p>
                    <p className="text-sm">Score: {data.score.toFixed(1)}%</p>
                  </div>
                );
              }}
            />
            <Scatter data={timelineData}>
              {timelineData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getSeverityColor(entry.severity)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search anomalies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="performance">Performance</option>
            <option value="error">Error</option>
            <option value="resource">Resource</option>
            <option value="cost">Cost</option>
            <option value="pattern">Pattern</option>
          </select>
        </div>
      </div>

      {/* Anomaly List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAnomalies.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg shadow p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Anomalies Detected</h3>
            <p className="text-gray-600">All workflows are running normally</p>
          </div>
        ) : (
          filteredAnomalies.map((anomaly) => (
            <AnomalyCard
              key={anomaly.id}
              anomaly={anomaly}
              onSelect={() => setSelectedAnomaly(anomaly)}
            />
          ))
        )}
      </div>

      {/* Details Panel */}
      {selectedAnomaly && (
        <AnomalyDetailsPanel
          anomaly={selectedAnomaly}
          onClose={() => setSelectedAnomaly(null)}
        />
      )}
    </div>
  );
};

// Helper function
function generateMockExecutionData(count: number): WorkflowExecutionData[] {
  const data: WorkflowExecutionData[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const timestamp = now - i * 3600000;
    const isAnomaly = Math.random() > 0.8;

    data.push({
      id: `exec-${i}`,
      workflowId: 'workflow-1',
      nodeCount: 5 + Math.floor(Math.random() * 15),
      edgeCount: 4 + Math.floor(Math.random() * 14),
      complexity: 10 + Math.random() * 30,
      duration: isAnomaly ? 80000 + Math.random() * 40000 : 10000 + Math.random() * 30000,
      success: !isAnomaly || Math.random() > 0.3,
      errorCount: isAnomaly ? Math.floor(Math.random() * 5) : 0,
      retryCount: isAnomaly ? Math.floor(Math.random() * 3) : 0,
      cpuUsage: isAnomaly ? 70 + Math.random() * 30 : 20 + Math.random() * 40,
      memoryUsage: isAnomaly ? 400 + Math.random() * 300 : 100 + Math.random() * 200,
      networkCalls: Math.floor(Math.random() * 10),
      dbQueries: Math.floor(Math.random() * 8),
      cost: isAnomaly ? 0.05 + Math.random() * 0.1 : 0.001 + Math.random() * 0.02,
      timestamp,
      timeOfDay: new Date(timestamp).getHours(),
      dayOfWeek: new Date(timestamp).getDay(),
      hasLoops: Math.random() > 0.7,
      hasConditionals: Math.random() > 0.5,
      hasParallelExecution: Math.random() > 0.6,
      maxDepth: 3 + Math.floor(Math.random() * 5),
      avgNodeComplexity: 1 + Math.random() * 3,
    });
  }

  return data;
}

export default AnomalyViewer;

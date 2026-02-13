/**
 * Intelligence Dashboard
 * Main dashboard for workflow intelligence, health scores, and recommendations
 */

import React, { useState, useEffect, useMemo } from 'react';
import { IntelligenceMetrics, Anomaly, Recommendation } from '../../types/intelligence';
import { HealthScoreCard } from '../monitoring/HealthScoreCard';
import { TrendCharts } from '../monitoring/TrendCharts';
import { RecommendationCenter } from '../ai/RecommendationCenter';
import { logger } from '../../services/SimpleLogger';

interface IntelligenceDashboardProps {
  workflowId?: string;
  onRefresh?: () => void;
  className?: string;
}

interface DashboardStats {
  totalWorkflows: number;
  healthyWorkflows: number;
  unhealthyWorkflows: number;
  activeAnomalies: number;
  pendingRecommendations: number;
  avgHealthScore: number;
  totalSavingsOpportunity: number;
}

export const IntelligenceDashboard: React.FC<IntelligenceDashboardProps> = ({
  workflowId,
  onRefresh,
  className = '',
}) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<IntelligenceMetrics[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(workflowId || null);
  const [viewMode, setViewMode] = useState<'overview' | 'workflows' | 'anomalies' | 'recommendations'>('overview');
  const [refreshInterval, setRefreshInterval] = useState<number>(60000); // 1 minute
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch intelligence data
  useEffect(() => {
    fetchIntelligenceData();

    if (autoRefresh) {
      const interval = setInterval(fetchIntelligenceData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [workflowId, autoRefresh, refreshInterval]);

  const fetchIntelligenceData = async () => {
    try {
      setLoading(true);
      // In real implementation, fetch from API
      // const response = await fetch(`/api/intelligence${workflowId ? `?workflowId=${workflowId}` : ''}`);
      // const data = await response.json();
      // setMetrics(data);

      // Mock data for demonstration
      setMetrics([]);
      setLoading(false);
    } catch (error) {
      logger.error('Failed to fetch intelligence data:', error);
      setLoading(false);
    }
  };

  // Calculate dashboard statistics
  const stats: DashboardStats = useMemo(() => {
    const totalWorkflows = metrics.length;
    const healthyWorkflows = metrics.filter(m => m.healthScore.overall >= 70).length;
    const unhealthyWorkflows = totalWorkflows - healthyWorkflows;
    const activeAnomalies = metrics.reduce((sum, m) => sum + m.anomalies.filter(a => !a.resolved).length, 0);
    const pendingRecommendations = metrics.reduce((sum, m) => sum + m.recommendations.filter(r => r.status === 'pending').length, 0);
    const avgHealthScore = totalWorkflows > 0
      ? metrics.reduce((sum, m) => sum + m.healthScore.overall, 0) / totalWorkflows
      : 0;
    const totalSavingsOpportunity = metrics.reduce((sum, m) => sum + m.costAnalysis.savingsOpportunity, 0);

    return {
      totalWorkflows,
      healthyWorkflows,
      unhealthyWorkflows,
      activeAnomalies,
      pendingRecommendations,
      avgHealthScore,
      totalSavingsOpportunity,
    };
  }, [metrics]);

  // Filter metrics by selected workflow
  const displayMetrics = useMemo(() => {
    if (selectedWorkflow) {
      return metrics.filter(m => m.workflowId === selectedWorkflow);
    }
    return metrics;
  }, [metrics, selectedWorkflow]);

  // Get all anomalies
  const allAnomalies = useMemo(() => {
    return displayMetrics.flatMap(m => m.anomalies).filter(a => !a.resolved);
  }, [displayMetrics]);

  // Get all recommendations
  const allRecommendations = useMemo(() => {
    return displayMetrics.flatMap(m => m.recommendations).filter(r => r.status === 'pending');
  }, [displayMetrics]);

  const handleRefresh = () => {
    fetchIntelligenceData();
    onRefresh?.();
  };

  const getHealthColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: Anomaly['severity']): string => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className={`intelligence-dashboard ${className}`}>
      {/* Header */}
      <div className="dashboard-header border-b border-gray-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workflow Intelligence</h1>
            <p className="text-sm text-gray-600 mt-1">
              AI-powered insights, health monitoring, and proactive recommendations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 mt-4">
          {(['overview', 'workflows', 'anomalies', 'recommendations'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && metrics.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Overview Mode */}
      {viewMode === 'overview' && !loading && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Average Health"
              value={stats.avgHealthScore.toFixed(1)}
              unit="/ 100"
              color={getHealthColor(stats.avgHealthScore)}
              icon="❤️"
            />
            <StatCard
              title="Active Anomalies"
              value={stats.activeAnomalies}
              color={stats.activeAnomalies > 0 ? 'text-orange-600' : 'text-green-600'}
              icon="⚠️"
            />
            <StatCard
              title="Pending Recommendations"
              value={stats.pendingRecommendations}
              color="text-blue-600"
              icon="💡"
            />
            <StatCard
              title="Savings Opportunity"
              value={`$${stats.totalSavingsOpportunity.toFixed(0)}`}
              unit="/month"
              color="text-green-600"
              icon="💰"
            />
          </div>

          {/* Health Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow Health Distribution</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{stats.healthyWorkflows}</div>
                <div className="text-sm text-gray-600 mt-1">Healthy (≥70)</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-3xl font-bold text-yellow-600">
                  {stats.totalWorkflows - stats.healthyWorkflows - stats.unhealthyWorkflows}
                </div>
                <div className="text-sm text-gray-600 mt-1">Needs Attention (50-69)</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600">{stats.unhealthyWorkflows}</div>
                <div className="text-sm text-gray-600 mt-1">Unhealthy (&lt;50)</div>
              </div>
            </div>
          </div>

          {/* Top Workflows by Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Healthiest Workflows</h2>
              <div className="space-y-3">
                {[...metrics]
                  .sort((a, b) => b.healthScore.overall - a.healthScore.overall)
                  .slice(0, 5)
                  .map((metric) => (
                    <div key={metric.workflowId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-900">{metric.workflowName}</span>
                      <span className={`text-lg font-bold ${getHealthColor(metric.healthScore.overall)}`}>
                        {metric.healthScore.overall}
                      </span>
                    </div>
                  ))}
                {metrics.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No workflows found</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Needs Attention</h2>
              <div className="space-y-3">
                {[...metrics]
                  .sort((a, b) => a.healthScore.overall - b.healthScore.overall)
                  .slice(0, 5)
                  .map((metric) => (
                    <div key={metric.workflowId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-900">{metric.workflowName}</span>
                      <span className={`text-lg font-bold ${getHealthColor(metric.healthScore.overall)}`}>
                        {metric.healthScore.overall}
                      </span>
                    </div>
                  ))}
                {metrics.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No workflows found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflows Mode */}
      {viewMode === 'workflows' && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {displayMetrics.map((metric) => (
            <HealthScoreCard
              key={metric.workflowId}
              workflowId={metric.workflowId}
              workflowName={metric.workflowName}
              healthScore={metric.healthScore}
              anomalies={metric.anomalies}
              recommendations={metric.recommendations}
              costAnalysis={metric.costAnalysis}
              onViewDetails={() => setSelectedWorkflow(metric.workflowId)}
            />
          ))}
          {displayMetrics.length === 0 && (
            <div className="col-span-2 text-center py-12 text-gray-500">
              No workflows found
            </div>
          )}
        </div>
      )}

      {/* Anomalies Mode */}
      {viewMode === 'anomalies' && !loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Active Anomalies ({allAnomalies.length})
            </h2>
            <div className="space-y-3">
              {allAnomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(anomaly.severity)}`}>
                          {anomaly.severity}
                        </span>
                        <span className="text-sm text-gray-600">{anomaly.metric}</span>
                      </div>
                      <p className="text-gray-900 font-medium">{anomaly.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span>Detected: {new Date(anomaly.detectedAt).toLocaleString()}</span>
                        <span>Confidence: {(anomaly.confidence * 100).toFixed(0)}%</span>
                        <span>σ Level: {anomaly.sigmaLevel.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {allAnomalies.length === 0 && (
                <p className="text-center py-8 text-gray-500">No active anomalies detected</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Mode */}
      {viewMode === 'recommendations' && !loading && (
        <RecommendationCenter
          recommendations={allRecommendations}
          onAccept={(id) => logger.debug('Accept:', id)}
          onReject={(id) => logger.debug('Reject:', id)}
          onImplement={(id) => logger.debug('Implement:', id)}
        />
      )}

      {/* Trend Charts */}
      {!loading && displayMetrics.length > 0 && (
        <div className="mt-8">
          <TrendCharts
            workflowId={selectedWorkflow || undefined}
            metrics={displayMetrics}
          />
        </div>
      )}
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  color: string;
  icon: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, unit, color, icon }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-gray-600">{title}</span>
      <span className="text-2xl">{icon}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
      {unit && <span className="text-sm text-gray-500">{unit}</span>}
    </div>
  </div>
);

export default IntelligenceDashboard;

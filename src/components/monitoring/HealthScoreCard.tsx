/**
 * Health Score Card
 * Displays workflow health score with component breakdown and trend
 */

import React from 'react';
import { HealthScore, Anomaly, Recommendation } from '../../types/intelligence';

interface HealthScoreCardProps {
  workflowId: string;
  workflowName: string;
  healthScore: HealthScore;
  anomalies: Anomaly[];
  recommendations: Recommendation[];
  costAnalysis?: {
    currentMonthly: number;
    projectedMonthly: number;
    savingsOpportunity: number;
  };
  onViewDetails?: () => void;
  className?: string;
}

export const HealthScoreCard: React.FC<HealthScoreCardProps> = ({
  workflowId,
  workflowName,
  healthScore,
  anomalies,
  recommendations,
  costAnalysis,
  onViewDetails,
  className = '',
}) => {
  const getHealthColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getTrendIcon = (trend: HealthScore['trend']): string => {
    switch (trend) {
      case 'improving': return '📈';
      case 'degrading': return '📉';
      case 'stable': return '➡️';
    }
  };

  const getTrendColor = (trend: HealthScore['trend']): string => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'degrading': return 'text-red-600';
      case 'stable': return 'text-gray-600';
    }
  };

  const activeAnomalies = anomalies.filter(a => !a.resolved);
  const pendingRecommendations = recommendations.filter(r => r.status === 'pending');

  return (
    <div className={`health-score-card bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{workflowName}</h3>
          <p className="text-sm text-gray-500">ID: {workflowId}</p>
        </div>
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            View Details
          </button>
        )}
      </div>

      {/* Overall Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">Overall Health</span>
          <div className="flex items-center gap-2">
            <span className={`text-lg ${getTrendColor(healthScore.trend)}`}>
              {getTrendIcon(healthScore.trend)}
            </span>
            <span className="text-xs text-gray-500">
              {(healthScore.trendConfidence * 100).toFixed(0)}% confidence
            </span>
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className={`text-5xl font-bold ${getHealthColor(healthScore.overall)}`}>
            {healthScore.overall}
          </div>
          <div className="text-2xl text-gray-400 mb-1">/ 100</div>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-200 rounded-full mt-3 overflow-hidden">
          <div
            className={`h-full ${getHealthBgColor(healthScore.overall)} transition-all duration-500`}
            style={{ width: `${healthScore.overall}%` }}
          />
        </div>
      </div>

      {/* Component Scores */}
      <div className="space-y-3 mb-6">
        <ComponentScore
          label="Reliability"
          score={healthScore.components.reliability}
          weight={30}
          icon="🛡️"
        />
        <ComponentScore
          label="Performance"
          score={healthScore.components.performance}
          weight={25}
          icon="⚡"
        />
        <ComponentScore
          label="Cost"
          score={healthScore.components.cost}
          weight={20}
          icon="💰"
        />
        <ComponentScore
          label="Usage"
          score={healthScore.components.usage}
          weight={15}
          icon="📊"
        />
        <ComponentScore
          label="Freshness"
          score={healthScore.components.freshness}
          weight={10}
          icon="🔄"
        />
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className={`p-3 rounded-lg ${activeAnomalies.length > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">⚠️</span>
            <span className="text-sm font-medium text-gray-700">Anomalies</span>
          </div>
          <div className={`text-2xl font-bold ${activeAnomalies.length > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
            {activeAnomalies.length}
          </div>
        </div>

        <div className={`p-3 rounded-lg ${pendingRecommendations.length > 0 ? 'bg-blue-50' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">💡</span>
            <span className="text-sm font-medium text-gray-700">Recommendations</span>
          </div>
          <div className={`text-2xl font-bold ${pendingRecommendations.length > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
            {pendingRecommendations.length}
          </div>
        </div>
      </div>

      {/* Cost Analysis */}
      {costAnalysis && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Cost Analysis</span>
            {costAnalysis.savingsOpportunity > 0 && (
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                ${costAnalysis.savingsOpportunity.toFixed(0)} savings
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-600">Current</div>
              <div className="font-semibold text-gray-900">
                ${costAnalysis.currentMonthly.toFixed(2)}/mo
              </div>
            </div>
            <div>
              <div className="text-gray-600">Projected</div>
              <div className="font-semibold text-gray-900">
                ${costAnalysis.projectedMonthly.toFixed(2)}/mo
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Recommendations Preview */}
      {pendingRecommendations.length > 0 && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Top Recommendation</div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="text-lg">{getRecommendationIcon(pendingRecommendations[0].type)}</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-sm">{pendingRecommendations[0].title}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {pendingRecommendations[0].impact.improvementPercent.toFixed(0)}% improvement possible
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(pendingRecommendations[0].priority)}`}>
                {pendingRecommendations[0].priority}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="border-t border-gray-200 pt-3 mt-4">
        <div className="text-xs text-gray-500">
          Last updated: {new Date(healthScore.metadata.calculatedAt).toLocaleString()}
          {' • '}
          {healthScore.metadata.dataPoints} data points
          {' • '}
          {healthScore.metadata.timeRange} days
        </div>
      </div>
    </div>
  );
};

// Component Score Sub-component
interface ComponentScoreProps {
  label: string;
  score: number;
  weight: number;
  icon: string;
}

const ComponentScore: React.FC<ComponentScoreProps> = ({ label, score, weight, icon }) => {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{weight}%</span>
            <span className="text-sm font-semibold text-gray-900">{score}</span>
          </div>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getScoreColor(score)} transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Helper Functions
function getRecommendationIcon(type: Recommendation['type']): string {
  const icons: Record<Recommendation['type'], string> = {
    archive_unused: '📦',
    consolidate_workflows: '🔗',
    cost_optimization: '💰',
    performance_improvement: '⚡',
    add_caching: '💾',
    add_retry: '🔄',
    add_error_handling: '🛡️',
    add_circuit_breaker: '🔌',
    optimize_concurrency: '⚙️',
    reduce_polling: '⏱️',
    upgrade_node: '⬆️',
    split_workflow: '✂️',
    add_monitoring: '📊',
    security_enhancement: '🔒',
  };
  return icons[type] || '💡';
}

function getPriorityColor(priority: Recommendation['priority']): string {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-blue-100 text-blue-800';
  }
}

export default HealthScoreCard;

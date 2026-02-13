/**
 * Recommendations Panel
 * AI-powered recommendations and insights
 */

import React, { useState, useEffect } from 'react';
import type { DateRange, AnalyticsInsight } from '../../types/advanced-analytics';
import { analyticsEngine } from '../../analytics/AdvancedAnalyticsEngine';
import { logger } from '../../services/SimpleLogger';

interface RecommendationsPanelProps {
  dateRange: DateRange;
}

export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({ dateRange }) => {
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [filter, setFilter] = useState<'all' | 'performance' | 'cost' | 'reliability' | 'optimization'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [dateRange]);

  const loadInsights = () => {
    setLoading(true);
    try {
      const data = analyticsEngine.getInsights(dateRange);
      setInsights(data);
    } catch (error) {
      logger.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInsights = filter === 'all'
    ? insights
    : insights.filter(insight => insight.type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analyzing workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
      <div className="flex gap-2">
        {(['all', 'performance', 'cost', 'reliability', 'optimization'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`
              px-4 py-2 text-sm font-medium rounded-md capitalize
              ${filter === type
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            {type}
            {type !== 'all' && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-25">
                {insights.filter(i => i.type === type).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Insights</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{insights.length}</p>
            </div>
            <div className="text-4xl">💡</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Issues</p>
              <p className="mt-2 text-3xl font-bold text-red-600">
                {insights.filter(i => i.severity === 'critical').length}
              </p>
            </div>
            <div className="text-4xl">🚨</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Impact</p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {insights.length > 0
                  ? Math.round(insights.reduce((sum, i) => sum + i.impact.improvement, 0) / insights.length)
                  : 0}%
              </p>
            </div>
            <div className="text-4xl">📈</div>
          </div>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {filteredInsights.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
            <div className="text-6xl mb-4">✨</div>
            <h3 className="text-lg font-semibold text-gray-900">No Insights Available</h3>
            <p className="mt-2 text-sm text-gray-600">
              Your workflows are running optimally. Check back later for new recommendations.
            </p>
          </div>
        ) : (
          filteredInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))
        )}
      </div>
    </div>
  );
};

interface InsightCardProps {
  insight: AnalyticsInsight;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const [expanded, setExpanded] = useState(false);

  const severityConfig = {
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      badge: 'bg-red-100 text-red-800',
      icon: '🚨',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900',
      badge: 'bg-yellow-100 text-yellow-800',
      icon: '⚠️',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      badge: 'bg-blue-100 text-blue-800',
      icon: 'ℹ️',
    },
  };

  const config = severityConfig[insight.severity];

  const typeConfig = {
    performance: { color: 'text-purple-600', icon: '⚡' },
    cost: { color: 'text-green-600', icon: '💰' },
    reliability: { color: 'text-blue-600', icon: '🛡️' },
    optimization: { color: 'text-orange-600', icon: '🎯' },
    anomaly: { color: 'text-red-600', icon: '📊' },
  };

  const typeInfo = typeConfig[insight.type];

  return (
    <div className={`${config.bg} border ${config.border} rounded-lg p-6`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="text-3xl">{config.icon}</div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className={`text-lg font-semibold ${config.text}`}>
                {insight.title}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.badge} capitalize`}>
                {insight.severity}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white ${typeInfo.color} capitalize`}>
                {typeInfo.icon} {insight.type}
              </span>
            </div>
            <p className={`mt-2 text-sm ${config.text}`}>
              {insight.description}
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-4 text-gray-400 hover:text-gray-600"
        >
          <svg
            className={`h-5 w-5 transform transition-transform ${expanded ? 'rotate-180' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Impact Summary */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="bg-white bg-opacity-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-600">Current</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {insight.impact.metric === 'monthly_cost' || insight.impact.metric.includes('cost')
              ? `$${insight.impact.current.toFixed(2)}`
              : insight.impact.metric.includes('rate')
              ? `${insight.impact.current.toFixed(1)}%`
              : `${insight.impact.current.toFixed(2)}s`}
          </p>
        </div>
        <div className="bg-white bg-opacity-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-600">Potential</p>
          <p className="mt-1 text-lg font-bold text-green-600">
            {insight.impact.metric === 'monthly_cost' || insight.impact.metric.includes('cost')
              ? `$${insight.impact.potential.toFixed(2)}`
              : insight.impact.metric.includes('rate')
              ? `${insight.impact.potential.toFixed(1)}%`
              : `${insight.impact.potential.toFixed(2)}s`}
          </p>
        </div>
        <div className="bg-white bg-opacity-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-600">Improvement</p>
          <p className="mt-1 text-lg font-bold text-blue-600">
            {insight.impact.improvement.toFixed(1)}%
          </p>
        </div>
      </div>

      {insight.impact.estimatedSavings && (
        <div className="mt-3 bg-green-100 bg-opacity-50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">💰</span>
            <p className="text-sm font-semibold text-green-900">
              Estimated Savings: ${insight.impact.estimatedSavings.toFixed(2)}/month
            </p>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {expanded && (
        <div className="mt-6 space-y-4">
          <h4 className={`text-sm font-semibold ${config.text}`}>
            Recommended Actions:
          </h4>
          {insight.recommendations.map((rec, idx) => (
            <div key={idx} className="bg-white bg-opacity-70 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-gray-900">{rec.action}</h5>
                  <p className="mt-1 text-sm text-gray-700">{rec.description}</p>
                  {rec.implementation && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono text-gray-800">
                      {rec.implementation}
                    </div>
                  )}
                </div>
                <div className="ml-4 flex flex-col space-y-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      rec.effort === 'low'
                        ? 'bg-green-100 text-green-800'
                        : rec.effort === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {rec.effort} effort
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      rec.impact === 'high'
                        ? 'bg-green-100 text-green-800'
                        : rec.impact === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {rec.impact} impact
                  </span>
                </div>
              </div>
            </div>
          ))}

          {insight.affectedWorkflows && insight.affectedWorkflows.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h5 className="text-sm font-semibold text-gray-900 mb-2">Affected Workflows:</h5>
              <div className="flex flex-wrap gap-2">
                {insight.affectedWorkflows.map((workflowId) => (
                  <span
                    key={workflowId}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-300"
                  >
                    {workflowId.slice(0, 8)}...
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

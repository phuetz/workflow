/**
 * Recommendation Center
 * Displays and manages workflow recommendations
 */

import React, { useState, useMemo } from 'react';
import { Recommendation } from '../../types/intelligence';

interface RecommendationCenterProps {
  recommendations: Recommendation[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onImplement: (id: string) => void;
  className?: string;
}

export const RecommendationCenter: React.FC<RecommendationCenterProps> = ({
  recommendations,
  onAccept,
  onReject,
  onImplement,
  className = '',
}) => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'confidence' | 'impact'>('priority');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter and sort recommendations
  const filteredRecommendations = useMemo(() => {
    let filtered = [...recommendations];

    // Priority filter
    if (filter !== 'all') {
      filtered = filtered.filter(r => r.priority === filter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(r => r.type === typeFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority': {
          const priorityScores = { critical: 4, high: 3, medium: 2, low: 1 };
          return priorityScores[b.priority] - priorityScores[a.priority];
        }
        case 'confidence':
          return b.confidence - a.confidence;
        case 'impact':
          return b.impact.improvementPercent - a.impact.improvementPercent;
        default:
          return 0;
      }
    });

    return filtered;
  }, [recommendations, filter, typeFilter, sortBy]);

  // Get unique types
  const uniqueTypes = useMemo(() => {
    const types = new Set(recommendations.map(r => r.type));
    return Array.from(types);
  }, [recommendations]);

  const getPriorityColor = (priority: Recommendation['priority']): string => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getEffortColor = (effort: Recommendation['effort']): string => {
    switch (effort) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
    }
  };

  const getRecommendationIcon = (type: Recommendation['type']): string => {
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
  };

  return (
    <div className={`recommendation-center ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Recommendations ({filteredRecommendations.length})
        </h2>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Priority:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="priority">Priority</option>
              <option value="confidence">Confidence</option>
              <option value="impact">Impact</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {filteredRecommendations.map((rec) => (
          <div
            key={rec.id}
            className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-all"
          >
            {/* Header */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{getRecommendationIcon(rec.type)}</span>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {rec.title}
                      </h3>
                      <p className="text-sm text-gray-600">{rec.description}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(rec.priority)}`}>
                        {rec.priority}
                      </span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Impact:</span>
                      <span className="font-semibold text-green-600">
                        +{rec.impact.improvementPercent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Effort:</span>
                      <span className={`font-semibold ${getEffortColor(rec.effort)}`}>
                        {rec.effort}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Confidence:</span>
                      <span className="font-semibold text-gray-900">
                        {(rec.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    {rec.autoImplementable && (
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                        Auto-implementable
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedId === rec.id && (
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                {/* Impact Details */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Expected Impact</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">Current</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {rec.impact.currentValue.toFixed(2)} {rec.impact.unit}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">Expected</div>
                      <div className="text-lg font-semibold text-green-600">
                        {rec.impact.expectedValue.toFixed(2)} {rec.impact.unit}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Steps */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Implementation Steps</h4>
                  <ol className="space-y-2">
                    {rec.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAccept(rec.id);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Accept
                  </button>
                  {rec.autoImplementable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onImplement(rec.id);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Auto-Implement
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReject(rec.id);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    Dismiss
                  </button>
                  <div className="flex-1" />
                  <div className="text-xs text-gray-500">
                    Created {new Date(rec.createdAt).toLocaleDateString()}
                    {rec.expiresAt && (
                      <> • Expires {new Date(rec.expiresAt).toLocaleDateString()}</>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredRecommendations.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-3">✨</div>
            <p className="text-lg font-medium">No recommendations found</p>
            <p className="text-sm mt-1">Your workflows are in great shape!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationCenter;

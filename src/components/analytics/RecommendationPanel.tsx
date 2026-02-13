/**
 * AI Recommendations Panel
 *
 * Displays AI-powered workflow optimization recommendations:
 * - Optimization suggestions
 * - Node replacements
 * - Alternative designs
 * - Cost and performance improvements
 * - Security best practices
 * - Interactive application of recommendations
 *
 * @module RecommendationPanel
 */

import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  TrendingUp,
  DollarSign,
  Shield,
  Zap,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { logger } from '../../services/SimpleLogger';
import {
  getAIRecommendationsEngine,
  Recommendation,
  OptimizationAnalysis,
  Workflow,
} from '../../analytics/AIRecommendations';

// ============================================================================
// Types
// ============================================================================

interface RecommendationPanelProps {
  workflow: Workflow;
  onApplyRecommendation?: (recommendation: Recommendation) => void;
}

// ============================================================================
// Priority Badge Component
// ============================================================================

const PriorityBadge: React.FC<{ priority: Recommendation['priority'] }> = ({ priority }) => {
  const config = {
    low: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
    medium: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    high: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
    critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  };

  const { bg, text, border } = config[priority];

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded border ${bg} ${text} ${border} text-xs font-medium`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
};

// ============================================================================
// Type Icon Component
// ============================================================================

const TypeIcon: React.FC<{ type: Recommendation['type'] }> = ({ type }) => {
  const icons = {
    optimization: <Zap className="w-5 h-5 text-yellow-500" />,
    replacement: <RefreshCw className="w-5 h-5 text-blue-500" />,
    alternative: <Lightbulb className="w-5 h-5 text-purple-500" />,
    cost: <DollarSign className="w-5 h-5 text-green-500" />,
    performance: <TrendingUp className="w-5 h-5 text-orange-500" />,
    security: <Shield className="w-5 h-5 text-red-500" />,
    best_practice: <CheckCircle className="w-5 h-5 text-teal-500" />,
  };

  return icons[type] || <Lightbulb className="w-5 h-5 text-gray-500" />;
};

// ============================================================================
// Impact Indicator Component
// ============================================================================

const ImpactIndicator: React.FC<{
  label: string;
  value: number;
  color: string;
}> = ({ label, value, color }) => {
  if (value === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600">{label}:</span>
      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
        <div
          className={`${color} h-2 rounded-full`}
          style={{ width: `${Math.min(100, value)}%` }}
        ></div>
      </div>
      <span className="text-xs font-medium">{value.toFixed(0)}%</span>
    </div>
  );
};

// ============================================================================
// Recommendation Card Component
// ============================================================================

const RecommendationCard: React.FC<{
  recommendation: Recommendation;
  onApply?: () => void;
}> = ({ recommendation, onApply }) => {
  const [expanded, setExpanded] = useState(false);

  const effortColors = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-1">
              <TypeIcon type={recommendation.type} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900">{recommendation.title}</h3>
                <PriorityBadge priority={recommendation.priority} />
              </div>
              <p className="text-sm text-gray-600 mb-3">{recommendation.description}</p>

              {/* Impact Summary */}
              <div className="space-y-1">
                {recommendation.impact.performance && (
                  <ImpactIndicator
                    label="Performance"
                    value={recommendation.impact.performance}
                    color="bg-orange-500"
                  />
                )}
                {recommendation.impact.cost && (
                  <ImpactIndicator
                    label="Cost Savings"
                    value={recommendation.impact.cost}
                    color="bg-green-500"
                  />
                )}
                {recommendation.impact.reliability && (
                  <ImpactIndicator
                    label="Reliability"
                    value={recommendation.impact.reliability}
                    color="bg-blue-500"
                  />
                )}
                {recommendation.impact.security && (
                  <ImpactIndicator
                    label="Security"
                    value={recommendation.impact.security * 10}
                    color="bg-red-500"
                  />
                )}
              </div>

              {/* Meta Info */}
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span>Effort: <span className={effortColors[recommendation.effort]}>{recommendation.effort}</span></span>
                <span>•</span>
                <span>Confidence: {(recommendation.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
          {/* Reasoning */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Reasoning</h4>
            <p className="text-sm text-gray-700">{recommendation.reasoning}</p>
          </div>

          {/* Suggested Changes */}
          {recommendation.suggestedChanges.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Suggested Changes</h4>
              <div className="space-y-2">
                {recommendation.suggestedChanges.map((change, idx) => (
                  <div key={idx} className="bg-white rounded border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        {change.action}
                      </span>
                      <span className="text-xs text-gray-600">
                        {change.target.type}
                        {change.target.id && `: ${change.target.id}`}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{change.details}</p>

                    {/* Before/After Preview */}
                    {(change.before || change.after) && (
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        {change.before && (
                          <div className="bg-red-50 border border-red-200 rounded p-2">
                            <span className="text-red-700 font-medium">Before:</span>
                            <pre className="mt-1 text-gray-700 overflow-x-auto">
                              {JSON.stringify(change.before, null, 2)}
                            </pre>
                          </div>
                        )}
                        {change.after && (
                          <div className="bg-green-50 border border-green-200 rounded p-2">
                            <span className="text-green-700 font-medium">After:</span>
                            <pre className="mt-1 text-gray-700 overflow-x-auto">
                              {JSON.stringify(change.after, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* References */}
          {recommendation.references && recommendation.references.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Learn More</h4>
              <ul className="space-y-1">
                {recommendation.references.map((ref, idx) => (
                  <li key={idx}>
                    <a
                      href={ref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      {ref}
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <button
              onClick={onApply}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Apply Recommendation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Main Recommendation Panel Component
// ============================================================================

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  workflow,
  onApplyRecommendation,
}) => {
  const [analysis, setAnalysis] = useState<OptimizationAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Recommendation['type'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'impact'>('priority');

  useEffect(() => {
    analyzeWorkflow();
  }, [workflow]);

  const analyzeWorkflow = async () => {
    try {
      setLoading(true);

      const engine = getAIRecommendationsEngine();
      const result = await engine.analyzeWorkflow(workflow);

      setAnalysis(result);
      setLoading(false);
    } catch (err) {
      logger.error('Error analyzing workflow:', err);
      setLoading(false);
    }
  };

  const filteredRecommendations = analysis?.recommendations.filter((rec) =>
    filter === 'all' ? true : rec.type === filter
  ) || [];

  const sortedRecommendations = [...filteredRecommendations].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    } else {
      const aImpact = (a.impact.performance || 0) + (a.impact.cost || 0) + (a.impact.reliability || 0);
      const bImpact = (b.impact.performance || 0) + (b.impact.cost || 0) + (b.impact.reliability || 0);
      return bImpact - aImpact;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">Unable to analyze workflow</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Recommendations</h1>
        <p className="text-gray-600 mt-1">{analysis.summary}</p>
      </div>

      {/* Score Card */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium opacity-90 mb-1">Current Score</h3>
            <p className="text-4xl font-bold">{analysis.score.current.toFixed(0)}/100</p>
          </div>
          <div>
            <h3 className="text-sm font-medium opacity-90 mb-1">Potential Score</h3>
            <p className="text-4xl font-bold">{analysis.score.potential.toFixed(0)}/100</p>
          </div>
          <div>
            <h3 className="text-sm font-medium opacity-90 mb-1">Improvement</h3>
            <p className="text-4xl font-bold flex items-center gap-2">
              <TrendingUp className="w-8 h-8" />
              +{analysis.score.improvement.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">Total</span>
            <Lightbulb className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {analysis.recommendations.length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">Critical</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {analysis.recommendations.filter((r) => r.priority === 'critical').length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">High Priority</span>
            <TrendingUp className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-600 mt-1">
            {analysis.recommendations.filter((r) => r.priority === 'high').length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">Quick Wins</span>
            <Zap className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {analysis.recommendations.filter((r) => r.effort === 'low').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="optimization">Optimization</option>
              <option value="replacement">Replacement</option>
              <option value="alternative">Alternative</option>
              <option value="cost">Cost</option>
              <option value="performance">Performance</option>
              <option value="security">Security</option>
              <option value="best_practice">Best Practice</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="priority">Priority</option>
              <option value="impact">Impact</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {sortedRecommendations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Recommendations Found
            </h3>
            <p className="text-gray-600">
              Your workflow looks great! No optimizations needed.
            </p>
          </div>
        ) : (
          sortedRecommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onApply={() => onApplyRecommendation?.(rec)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default RecommendationPanel;

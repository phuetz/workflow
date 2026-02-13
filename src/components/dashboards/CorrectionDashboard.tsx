/**
 * Correction Dashboard
 *
 * Dashboard for viewing error detection and correction recommendations.
 * Allows humans to review and manually apply recommended fixes.
 */

import React, { useState, useEffect } from 'react';
import {
  correctionOrchestrator,
  CorrectionRecommendation,
  ErrorContext,
} from '@/monitoring/corrections/CorrectionFramework';
import { useToast } from '../ui/Toast';

interface CorrectionDashboardProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const CorrectionDashboard: React.FC<CorrectionDashboardProps> = ({
  autoRefresh = true,
  refreshInterval = 30000,
}) => {
  const [recommendations, setRecommendations] = useState<CorrectionRecommendation[]>([]);
  const [errorHistory, setErrorHistory] = useState<ErrorContext[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<CorrectionRecommendation | null>(null);
  const [filter, setFilter] = useState<'all' | 'safe' | 'moderate' | 'risky'>('all');

  useEffect(() => {
    loadData();

    if (autoRefresh) {
      const interval = setInterval(loadData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const loadData = () => {
    setRecommendations(correctionOrchestrator.getRecommendations());
    setErrorHistory(correctionOrchestrator.getErrorHistory());
    setStatistics(correctionOrchestrator.getStatistics());
  };

  const filteredRecommendations = recommendations.filter(rec => {
    if (filter === 'all') return true;
    return rec.estimatedImpact === filter;
  });

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'safe':
        return 'text-green-600 bg-green-50';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-50';
      case 'risky':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'text-blue-600 bg-blue-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'critical':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="correction-dashboard p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Error Correction Dashboard</h1>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-600">Total Errors</div>
            <div className="text-2xl font-bold">{statistics.totalErrors}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-600">Recommendations</div>
            <div className="text-2xl font-bold">{statistics.recommendationsGenerated}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-600">Critical Errors</div>
            <div className="text-2xl font-bold text-red-600">
              {statistics.errorsBySeverity?.critical || 0}
            </div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-600">High Priority</div>
            <div className="text-2xl font-bold text-orange-600">
              {statistics.errorsBySeverity?.high || 0}
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white p-4 rounded shadow">
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            All ({recommendations.length})
          </button>
          <button
            onClick={() => setFilter('safe')}
            className={`px-4 py-2 rounded ${filter === 'safe' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
          >
            Safe ({recommendations.filter(r => r.estimatedImpact === 'safe').length})
          </button>
          <button
            onClick={() => setFilter('moderate')}
            className={`px-4 py-2 rounded ${filter === 'moderate' ? 'bg-yellow-600 text-white' : 'bg-gray-100'}`}
          >
            Moderate ({recommendations.filter(r => r.estimatedImpact === 'moderate').length})
          </button>
          <button
            onClick={() => setFilter('risky')}
            className={`px-4 py-2 rounded ${filter === 'risky' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}
          >
            Risky ({recommendations.filter(r => r.estimatedImpact === 'risky').length})
          </button>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Correction Recommendations</h2>
        {filteredRecommendations.length === 0 ? (
          <div className="bg-white p-8 rounded shadow text-center text-gray-500">
            No recommendations found
          </div>
        ) : (
          filteredRecommendations.map(rec => (
            <div
              key={rec.id}
              className="bg-white p-4 rounded shadow hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedRecommendation(rec)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">{rec.errorType}</h3>
                <div className="flex space-x-2">
                  <span className={`px-3 py-1 rounded text-sm font-medium ${getImpactColor(rec.estimatedImpact)}`}>
                    {rec.estimatedImpact}
                  </span>
                  {rec.requiresRestart && (
                    <span className="px-3 py-1 rounded text-sm font-medium bg-orange-50 text-orange-600">
                      Restart Required
                    </span>
                  )}
                  {rec.requiresDowntime && (
                    <span className="px-3 py-1 rounded text-sm font-medium bg-red-50 text-red-600">
                      Downtime Required
                    </span>
                  )}
                </div>
              </div>
              <p className="text-gray-600 mb-2">{rec.description}</p>
              <div className="text-sm text-gray-500">
                {rec.steps.length} steps • Est. {Math.round(rec.steps.reduce((sum, s) => sum + s.estimatedDuration, 0) / 60)} minutes
              </div>
            </div>
          ))
        )}
      </div>

      {/* Error History */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Errors</h2>
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {errorHistory.slice(0, 10).map((error, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {error.timestamp.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(error.severity)}`}>
                      {error.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {error.error.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {error.error.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendation Detail Modal */}
      {selectedRecommendation && (
        <RecommendationDetailModal
          recommendation={selectedRecommendation}
          onClose={() => setSelectedRecommendation(null)}
        />
      )}
    </div>
  );
};

interface RecommendationDetailModalProps {
  recommendation: CorrectionRecommendation;
  onClose: () => void;
}

const RecommendationDetailModal: React.FC<RecommendationDetailModalProps> = ({
  recommendation,
  onClose,
}) => {
  const toast = useToast();
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyToClipboard = (text: string, stepOrder: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepOrder);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{recommendation.errorType}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-600 mt-2">{recommendation.description}</p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* Steps */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Correction Steps</h3>
              {recommendation.steps.map(step => (
                <div key={step.order} className="mb-4 p-4 border rounded">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                        {step.order}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2">{step.description}</h4>
                      <div className="text-sm text-gray-500 mb-2">
                        Est. duration: {step.estimatedDuration}s
                      </div>

                      {step.command && (
                        <div className="relative">
                          <pre className="bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto text-sm">
                            {step.command}
                          </pre>
                          <button
                            onClick={() => copyToClipboard(step.command!, step.order)}
                            className="absolute top-2 right-2 px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
                          >
                            {copiedStep === step.order ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      )}

                      {step.code && (
                        <div className="relative">
                          <pre className="bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto text-sm">
                            {step.code}
                          </pre>
                          <button
                            onClick={() => copyToClipboard(step.code!, step.order)}
                            className="absolute top-2 right-2 px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
                          >
                            {copiedStep === step.order ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      )}

                      {step.manualAction && (
                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                          <div className="font-semibold text-yellow-800 mb-1">Manual Action Required:</div>
                          <div className="text-yellow-700 text-sm whitespace-pre-wrap">{step.manualAction}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Validation Checks */}
            {recommendation.validationChecks.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Validation Checks</h3>
                {recommendation.validationChecks.map((check, idx) => (
                  <div key={idx} className="mb-2 p-3 bg-gray-50 rounded">
                    <div className="font-semibold">{check.name}</div>
                    <div className="text-sm text-gray-600">{check.description}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            <div className="bg-orange-50 border border-orange-200 p-4 rounded">
              <div className="font-semibold text-orange-800 mb-2">⚠️ Important Notes:</div>
              <ul className="list-disc list-inside space-y-1 text-orange-700 text-sm">
                {recommendation.requiresRestart && <li>This correction requires a service restart</li>}
                {recommendation.requiresDowntime && <li>This correction requires scheduled downtime</li>}
                <li>Always test in a staging environment first</li>
                <li>Have rollback plan ready before applying</li>
                <li>Monitor system closely after applying correction</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            >
              Close
            </button>
            <button
              onClick={() => {
                toast.info('This is a recommendation only. Please review and apply manually.');
                onClose();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Mark as Reviewed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

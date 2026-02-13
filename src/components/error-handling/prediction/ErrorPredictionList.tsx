/**
 * Error Prediction List component - displays predicted errors
 */

import React from 'react';
import {
  AlertTriangle,
  Shield,
  Zap,
  Activity,
  Share2,
  AlertCircle,
  Clock,
  Check,
  RefreshCw
} from 'lucide-react';
import type { PredictedError, Severity, ErrorType } from './types';
import { SEVERITY_ORDER } from './types';

interface ErrorPredictionListProps {
  predictions: PredictedError[];
  darkMode: boolean;
  showIgnoredErrors: boolean;
  onIgnore: (errorId: string) => void;
  onRefresh: () => void;
  onToggleShowIgnored: () => void;
}

function getSeverityColor(severity: Severity): string {
  switch (severity) {
    case 'critical': return 'text-red-500';
    case 'high': return 'text-orange-500';
    case 'medium': return 'text-yellow-500';
    case 'low': return 'text-blue-500';
    default: return 'text-gray-500';
  }
}

function getSeverityBadgeColor(severity: Severity): string {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getErrorTypeIcon(type: ErrorType): React.ReactNode {
  switch (type) {
    case 'connectivity': return <Share2 size={16} />;
    case 'data': return <AlertCircle size={16} />;
    case 'rate_limit': return <Activity size={16} />;
    case 'timeout': return <Clock size={16} />;
    case 'auth': return <Shield size={16} />;
    case 'validation': return <AlertTriangle size={16} />;
    case 'resource': return <Activity size={16} />;
    case 'logic': return <Zap size={16} />;
    default: return <AlertTriangle size={16} />;
  }
}

export default function ErrorPredictionList({
  predictions,
  darkMode,
  showIgnoredErrors,
  onIgnore,
  onRefresh,
  onToggleShowIgnored
}: ErrorPredictionListProps) {
  const sortedPredictions = [...predictions].sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.probability - a.probability;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <h3 className="text-lg font-semibold">Erreurs Potentielles</h3>
          <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
            predictions.length === 0
              ? 'bg-green-100 text-green-800'
              : predictions.length < 3
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {predictions.length}
          </span>
        </div>
        <div className="flex space-x-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showIgnored"
              checked={showIgnoredErrors}
              onChange={onToggleShowIgnored}
              className="mr-2"
            />
            <label htmlFor="showIgnored" className="text-sm">
              Afficher ignorees
            </label>
          </div>
          <button
            onClick={onRefresh}
            className="px-3 py-1 bg-yellow-500 text-white rounded-md text-sm flex items-center space-x-1"
          >
            <RefreshCw size={16} />
            <span>Analyser</span>
          </button>
        </div>
      </div>

      {sortedPredictions.length === 0 ? (
        <div className="text-center py-12 bg-green-50 rounded-lg">
          <Check size={48} className="mx-auto text-green-500 mb-4" />
          <p className="text-lg font-medium">Aucune erreur predite !</p>
          <p className="text-gray-500">
            Votre workflow semble robuste et ne presente pas de risques d'erreurs detectables.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedPredictions.map(error => (
            <div
              key={error.id}
              className={`p-4 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600'
                  : error.severity === 'critical'
                  ? 'bg-red-50 border-red-200'
                  : error.severity === 'high'
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-white border-gray-200'
              } shadow-sm`}
            >
              <div className="flex items-start">
                <div className={`mt-1 mr-3 ${getSeverityColor(error.severity)}`}>
                  {getErrorTypeIcon(error.errorType)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{error.description}</div>
                    <div className={`px-2 py-1 text-xs rounded-full font-medium ${getSeverityBadgeColor(error.severity)}`}>
                      {error.severity.charAt(0).toUpperCase() + error.severity.slice(1)}
                    </div>
                  </div>
                  <div className="text-sm mt-1">
                    <span className="font-medium">Noeud :</span> {error.nodeName}
                  </div>
                  <div className="text-sm mt-1">
                    <span className="font-medium">Suggestion :</span> {error.suggestedFix}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">Probabilite :</span> {error.probability}%
                      </div>
                      <div>
                        <span className="font-medium">Confiance :</span> {error.detectionConfidence}%
                      </div>
                    </div>
                    <button
                      onClick={() => onIgnore(error.id)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Ignorer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

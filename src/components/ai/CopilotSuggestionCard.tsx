/**
 * Copilot Suggestion Card Component
 *
 * Displays AI-powered suggestions with:
 * - Visual priority indicators
 * - Confidence scores
 * - One-click application
 * - Impact preview
 * - Dismissal capability
 */

import React from 'react';
import {
  Box, Check, Eye, FileText, GitBranch, Lightbulb,
  Link, X, Zap
} from 'lucide-react';
import { WorkflowSuggestion } from '../../copilot/types/copilot';

interface CopilotSuggestionCardProps {
  suggestion: WorkflowSuggestion;
  onApply?: (suggestion: WorkflowSuggestion) => void;
  onDismiss?: (suggestion: WorkflowSuggestion) => void;
  darkMode?: boolean;
  compact?: boolean;
}

export const CopilotSuggestionCard: React.FC<CopilotSuggestionCardProps> = ({
  suggestion,
  onApply,
  onDismiss,
  darkMode = false,
  compact = false
}) => {
  const getPriorityColor = (priority: WorkflowSuggestion['priority']) => {
    const colors = {
      critical: 'red',
      high: 'orange',
      medium: 'yellow',
      low: 'blue'
    };
    return colors[priority];
  };

  const getTypeIcon = (type: WorkflowSuggestion['type']) => {
    const icons = {
      template: FileText,
      optimization: Zap,
      node: Box,
      connection: Link,
      alternative: GitBranch
    };
    return icons[type] || Lightbulb;
  };

  const priorityColor = getPriorityColor(suggestion.priority);
  const IconComponent = getTypeIcon(suggestion.type);

  const baseClasses = darkMode
    ? 'bg-gray-800 border-gray-700 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  if (compact) {
    return (
      <div className={`${baseClasses} border rounded-lg p-3 hover:shadow-md transition-shadow`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-${priorityColor}-100 dark:bg-${priorityColor}-900/20`}>
            <IconComponent size={16} className={`text-${priorityColor}-600 dark:text-${priorityColor}-400`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{suggestion.title}</div>
            <div className="text-xs opacity-70 mt-0.5">{suggestion.description}</div>
          </div>
          {onApply && (
            <button
              onClick={() => onApply(suggestion)}
              className={`px-3 py-1 text-xs rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors`}
            >
              Apply
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${baseClasses} border rounded-xl p-4 hover:shadow-lg transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-3 rounded-lg bg-${priorityColor}-100 dark:bg-${priorityColor}-900/20`}>
            <IconComponent size={24} className={`text-${priorityColor}-600 dark:text-${priorityColor}-400`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{suggestion.title}</h3>
              <span
                className={`px-2 py-0.5 text-xs rounded-full bg-${priorityColor}-100 text-${priorityColor}-800 dark:bg-${priorityColor}-900/20 dark:text-${priorityColor}-300`}
              >
                {suggestion.priority}
              </span>
            </div>
            <p className="text-sm opacity-80">{suggestion.description}</p>
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={() => onDismiss(suggestion)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="text-xs opacity-70 mb-1">Confidence</div>
          <div className="font-semibold">{Math.round(suggestion.confidence * 100)}%</div>
        </div>
        <div className="text-center">
          <div className="text-xs opacity-70 mb-1">Applicability</div>
          <div className="font-semibold">{suggestion.applicability}%</div>
        </div>
        <div className="text-center">
          <div className="text-xs opacity-70 mb-1">Type</div>
          <div className="font-semibold capitalize text-xs">{suggestion.type}</div>
        </div>
      </div>

      {/* Impact */}
      {suggestion.estimatedImpact && (
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} mb-4`}>
          <div className="text-xs font-medium mb-2 opacity-70">Estimated Impact</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {suggestion.estimatedImpact.performance !== undefined && (
              <div>
                <div className="opacity-70">Performance</div>
                <div className="font-semibold text-green-600 dark:text-green-400">
                  +{suggestion.estimatedImpact.performance}%
                </div>
              </div>
            )}
            {suggestion.estimatedImpact.cost !== undefined && (
              <div>
                <div className="opacity-70">Cost</div>
                <div className="font-semibold text-green-600 dark:text-green-400">
                  -${suggestion.estimatedImpact.cost.toFixed(2)}
                </div>
              </div>
            )}
            {suggestion.estimatedImpact.reliability !== undefined && (
              <div>
                <div className="opacity-70">Reliability</div>
                <div className="font-semibold text-green-600 dark:text-green-400">
                  +{Math.round(suggestion.estimatedImpact.reliability * 100)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reasoning */}
      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} mb-4`}>
        <div className="text-xs font-medium mb-1 opacity-70">Reasoning</div>
        <div className="text-sm">{suggestion.reasoning}</div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onApply && (
          <button
            onClick={() => onApply(suggestion)}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Apply Suggestion
          </button>
        )}
        {suggestion.preview && (
          <button
            className={`px-4 py-2 rounded-lg border ${
              darkMode
                ? 'border-gray-600 hover:bg-gray-700'
                : 'border-gray-300 hover:bg-gray-50'
            } transition-colors font-medium text-sm flex items-center gap-2`}
          >
            <Eye size={16} />
            Preview
          </button>
        )}
      </div>
    </div>
  );
};

export default CopilotSuggestionCard;

/**
 * CostRecommendations Component
 * Optimization suggestions with accept/apply functionality
 */

import React from 'react';
import {
  Database,
  Package,
  Sliders,
  Activity,
  Cpu,
  Share2,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useCostAnalysis } from './useCostAnalysis';
import type { CostRecommendationsProps, OptimizationSuggestion, OptimizationType } from './types';

const TYPE_ICONS: Record<OptimizationType, React.ReactNode> = {
  caching: <Database size={20} className="text-blue-500" />,
  batching: <Package size={20} className="text-purple-500" />,
  consolidation: <Sliders size={20} className="text-orange-500" />,
  rate_limiting: <Activity size={20} className="text-yellow-500" />,
  scaling: <Cpu size={20} className="text-red-500" />,
  alternative: <Share2 size={20} className="text-green-500" />,
};

export function CostRecommendations({
  suggestions,
  acceptedOptimizations,
  darkMode,
  onToggleOptimization,
  onApplyOptimizations,
}: CostRecommendationsProps) {
  const { calculatePotentialSavings, formatCurrency, getDifficultyColor, getImpactColor } =
    useCostAnalysis();

  const acceptedSuggestions = suggestions.filter(s => acceptedOptimizations.includes(s.id));
  const potentialSavings = calculatePotentialSavings(acceptedSuggestions, acceptedOptimizations);

  const sortedSuggestions = [...suggestions].sort(
    (a, b) => b.savingsAmount - a.savingsAmount
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <h3 className="text-lg font-semibold">Recommended Optimizations</h3>
          <span
            className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
              suggestions.length === 0
                ? 'bg-gray-100 text-gray-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {suggestions.length}
          </span>
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-500">Savings: {formatCurrency(potentialSavings)}</span>
          <button
            onClick={onApplyOptimizations}
            disabled={acceptedOptimizations.length === 0}
            className="px-3 py-1 bg-green-500 text-white rounded-md text-sm flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle size={16} />
            <span>Apply</span>
          </button>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <p className="text-lg font-medium">Workflow already optimized!</p>
          <p className="text-gray-500">No additional optimizations were identified.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSuggestions.map(suggestion => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              isAccepted={
                suggestion.accepted || acceptedOptimizations.includes(suggestion.id)
              }
              darkMode={darkMode}
              onToggle={() => onToggleOptimization(suggestion.id)}
              formatCurrency={formatCurrency}
              getDifficultyColor={getDifficultyColor}
              getImpactColor={getImpactColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: OptimizationSuggestion;
  isAccepted: boolean;
  darkMode: boolean;
  onToggle: () => void;
  formatCurrency: (amount: number) => string;
  getDifficultyColor: (difficulty: string) => string;
  getImpactColor: (impact: string) => string;
}

function SuggestionCard({
  suggestion,
  isAccepted,
  darkMode,
  onToggle,
  formatCurrency,
  getDifficultyColor,
  getImpactColor,
}: SuggestionCardProps) {
  const difficultyLabels: Record<string, string> = {
    easy: 'Easy',
    medium: 'Medium',
    complex: 'Complex',
  };

  return (
    <div
      className={`p-4 rounded-lg ${
        isAccepted
          ? darkMode
            ? 'bg-green-900/20 border-green-800'
            : 'bg-green-50 border-green-200'
          : darkMode
          ? 'bg-gray-700 border-gray-600'
          : 'bg-white border-gray-200'
      } border shadow-sm`}
    >
      <div className="flex items-start">
        <div className="mr-3">{TYPE_ICONS[suggestion.type]}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{suggestion.title}</h4>
            <div className="flex items-center space-x-2">
              <div className="text-sm font-bold text-blue-500">
                {formatCurrency(suggestion.savingsAmount)}
              </div>
              <div className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                -{suggestion.savingsPercent}%
              </div>
            </div>
          </div>
          <p className="text-sm mt-1">{suggestion.description}</p>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-4 text-xs">
              <div className={`flex items-center ${getImpactColor(suggestion.impact)}`}>
                <AlertCircle size={12} className="mr-1" />
                <span>Impact {suggestion.impact}</span>
              </div>
              <div className={`flex items-center ${getDifficultyColor(suggestion.difficulty)}`}>
                <Clock size={12} className="mr-1" />
                <span>{difficultyLabels[suggestion.difficulty]}</span>
              </div>
              <div className="text-gray-500">{suggestion.nodes.length} node(s)</div>
            </div>
            <button
              onClick={onToggle}
              className={`px-3 py-1 text-sm rounded ${
                isAccepted ? 'bg-gray-200 text-gray-700' : 'bg-green-500 text-white'
              }`}
            >
              {isAccepted ? 'Accepted' : 'Accept'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Cost Estimate - Detailed Cost Breakdown Display
 * Shows estimated costs with breakdown by category
 */

import React, { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, PieChart } from 'lucide-react';
import { CostBreakdown } from '../../types/simulation';

interface CostEstimateProps {
  costBreakdown: CostBreakdown;
  executionsPerDay?: number;
  budgetLimit?: number;
}

export const CostEstimate: React.FC<CostEstimateProps> = ({
  costBreakdown,
  executionsPerDay = 100,
  budgetLimit = 10.0,
}) => {
  const [timeframe, setTimeframe] = useState<'execution' | 'daily' | 'monthly' | 'yearly'>(
    'execution'
  );

  const calculateCost = () => {
    switch (timeframe) {
      case 'daily':
        return costBreakdown.total * executionsPerDay;
      case 'monthly':
        return costBreakdown.total * executionsPerDay * 30;
      case 'yearly':
        return costBreakdown.total * executionsPerDay * 365;
      default:
        return costBreakdown.total;
    }
  };

  const cost = calculateCost();
  const budgetPercentage = (cost / budgetLimit) * 100;
  const withinBudget = cost <= budgetLimit;

  const categories = [
    { name: 'API Calls', value: costBreakdown.apiCalls, color: 'bg-blue-500' },
    { name: 'LLM Tokens', value: costBreakdown.llmTokens, color: 'bg-purple-500' },
    { name: 'Compute Time', value: costBreakdown.computeTime, color: 'bg-green-500' },
    { name: 'Storage', value: costBreakdown.storage, color: 'bg-yellow-500' },
    { name: 'Network', value: costBreakdown.network, color: 'bg-red-500' },
  ].filter(c => c.value > 0);

  const maxCategory = categories.length > 0
    ? categories.reduce((max, cat) => (cat.value > max.value ? cat : max))
    : null;

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Cost Estimate</h2>

        {/* Timeframe Selector */}
        <div className="flex gap-2 mb-4">
          {(['execution', 'daily', 'monthly', 'yearly'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 text-sm rounded-lg ${
                timeframe === tf
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tf.charAt(0).toUpperCase() + tf.slice(1)}
            </button>
          ))}
        </div>

        {/* Total Cost */}
        <div
          className={`p-6 rounded-lg ${
            withinBudget ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className={`w-6 h-6 ${withinBudget ? 'text-green-600' : 'text-red-600'}`} />
            <span className="text-sm font-medium text-gray-600">
              {timeframe === 'execution' ? 'Per Execution' : `Per ${timeframe}`}
            </span>
          </div>
          <div className={`text-4xl font-bold ${withinBudget ? 'text-green-600' : 'text-red-600'}`}>
            ${cost.toFixed(4)}
          </div>
          {timeframe === 'execution' && executionsPerDay > 0 && (
            <div className="text-sm text-gray-600 mt-2">
              ~${(cost * executionsPerDay * 30).toFixed(2)}/month at {executionsPerDay} exec/day
            </div>
          )}
        </div>

        {/* Budget Indicator */}
        {timeframe !== 'execution' && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Budget Usage</span>
              <span className={withinBudget ? 'text-green-600' : 'text-red-600'}>
                {budgetPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${withinBudget ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>${cost.toFixed(2)}</span>
              <span>${budgetLimit.toFixed(2)} limit</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Cost Breakdown */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Cost Breakdown
          </h3>
          <div className="space-y-2">
            {categories.map(category => (
              <div key={category.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{category.name}</span>
                  <span className="font-medium text-gray-900">
                    ${category.value.toFixed(4)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={category.color}
                    style={{
                      width: `${(category.value / costBreakdown.total) * 100}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {((category.value / costBreakdown.total) * 100).toFixed(1)}% of total
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Largest Cost Driver */}
        {maxCategory && maxCategory.value > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-blue-900">Largest Cost Driver</span>
            </div>
            <p className="text-sm text-blue-700">
              <span className="font-medium">{maxCategory.name}</span> accounts for{' '}
              {((maxCategory.value / costBreakdown.total) * 100).toFixed(1)}% of total cost (
              ${maxCategory.value.toFixed(4)})
            </p>
          </div>
        )}

        {/* Budget Warning */}
        {!withinBudget && timeframe !== 'execution' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="font-semibold text-red-900">Budget Exceeded</span>
            </div>
            <p className="text-sm text-red-700">
              Estimated cost exceeds budget by ${(cost - budgetLimit).toFixed(2)}. Consider:
            </p>
            <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
              <li>Reducing execution frequency</li>
              <li>Optimizing expensive nodes</li>
              <li>Implementing caching</li>
              <li>Using cheaper alternatives</li>
            </ul>
          </div>
        )}

        {/* Cost Savings Tips */}
        {costBreakdown.llmTokens > costBreakdown.total * 0.5 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-yellow-600" />
              <span className="font-semibold text-yellow-900">Cost Optimization Tip</span>
            </div>
            <p className="text-sm text-yellow-700">
              LLM costs are high. Consider using smaller models, caching responses, or reducing
              prompt sizes.
            </p>
          </div>
        )}

        {costBreakdown.apiCalls > costBreakdown.total * 0.3 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-yellow-600" />
              <span className="font-semibold text-yellow-900">Cost Optimization Tip</span>
            </div>
            <p className="text-sm text-yellow-700">
              API call costs are significant. Consider batching requests or implementing result
              caching.
            </p>
          </div>
        )}

        {/* Detailed Info */}
        <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
          <p className="mb-1">
            <span className="font-medium">Currency:</span> {costBreakdown.currency}
          </p>
          {timeframe === 'execution' && (
            <p className="mb-1">
              <span className="font-medium">Estimated executions/day:</span> {executionsPerDay}
            </p>
          )}
          <p>
            <span className="font-medium">Note:</span> Costs are estimates and may vary based on
            actual usage and pricing changes.
          </p>
        </div>
      </div>
    </div>
  );
};

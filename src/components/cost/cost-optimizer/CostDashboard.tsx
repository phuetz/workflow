/**
 * CostDashboard Component
 * Overview tab showing cost metrics, budget usage, and top expensive nodes
 */

import React from 'react';
import {
  DollarSign,
  TrendingDown,
  Calculator,
  Repeat,
  AlertTriangle,
  BarChart,
} from 'lucide-react';
import { useCostAnalysis } from './useCostAnalysis';
import type { CostDashboardProps } from './types';

export function CostDashboard({
  costBreakdown,
  suggestions,
  budgetSettings,
  darkMode,
}: CostDashboardProps) {
  const {
    calculateTotalCost,
    calculatePotentialSavings,
    getBudgetStatusColor,
    getBudgetPercentage,
    isBudgetExceeded,
    calculateCostsByCategory,
    getTopExpensiveNodes,
    formatCurrency,
    getImpactColor,
  } = useCostAnalysis();

  const totalCost = calculateTotalCost(costBreakdown);
  const potentialSavings = calculatePotentialSavings(suggestions, []);
  const budgetPercentage = getBudgetPercentage(totalCost, budgetSettings);
  const budgetStatusColor = getBudgetStatusColor(totalCost, budgetSettings);
  const budgetExceeded = isBudgetExceeded(totalCost, budgetSettings);
  const categoryCosts = calculateCostsByCategory(costBreakdown);
  const topNodes = getTopExpensiveNodes(costBreakdown, 5);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Monthly Total Cost"
          value={formatCurrency(totalCost)}
          subtitle="per month"
          icon={<DollarSign size={16} className="text-green-500" />}
          darkMode={darkMode}
        />
        <SummaryCard
          title="Potential Savings"
          value={formatCurrency(potentialSavings)}
          subtitle={`${((potentialSavings / totalCost) * 100 || 0).toFixed(0)}% savings`}
          valueColor="text-blue-500"
          icon={<TrendingDown size={16} className="text-blue-500" />}
          darkMode={darkMode}
        />
        <SummaryCard
          title="Monthly Budget"
          value={formatCurrency(budgetSettings.monthlyBudget)}
          subtitle={budgetExceeded ? 'Budget exceeded' : 'Within limits'}
          valueColor={budgetStatusColor}
          icon={<Calculator size={16} className="text-purple-500" />}
          darkMode={darkMode}
        />
        <SummaryCard
          title="Monthly Executions"
          value={(costBreakdown[0]?.executionsPerMonth || 0).toLocaleString()}
          subtitle="estimated"
          icon={<Repeat size={16} className="text-orange-500" />}
          darkMode={darkMode}
        />
      </div>

      {/* Budget Progress */}
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-sm border`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Budget Usage</h3>
          <div className={`text-sm font-medium ${budgetStatusColor}`}>
            {budgetPercentage.toFixed(0)}%
          </div>
        </div>

        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${
              budgetExceeded
                ? 'bg-red-500'
                : budgetPercentage > budgetSettings.alertThreshold
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, budgetPercentage)}%` }}
          />
        </div>

        {budgetExceeded && (
          <div className="flex items-center mt-2 text-sm text-red-500">
            <AlertTriangle size={16} className="mr-1" />
            <span>
              Budget exceeded by {formatCurrency(totalCost - budgetSettings.monthlyBudget)}
            </span>
          </div>
        )}
      </div>

      {/* Top Expensive Nodes */}
      <div>
        <h3 className="font-medium mb-3">Most Expensive Nodes</h3>
        {costBreakdown.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <BarChart size={36} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">No cost data available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topNodes.map((node, index) => (
              <div
                key={node.nodeId}
                className={`p-3 rounded-lg flex items-center ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-800 flex items-center justify-center flex-shrink-0 mr-3">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{node.nodeName}</div>
                    <div className="text-green-600 font-bold">
                      {formatCurrency(node.monthlyEstimate)}
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <span>{node.nodeType}</span>
                    {node.apiProvider && (
                      <>
                        <span className="mx-2">-</span>
                        <span>{node.apiProvider}</span>
                      </>
                    )}
                    <span className="mx-2">-</span>
                    <span>{node.executionsPerMonth.toLocaleString()} exec/month</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Breakdown & Optimization Opportunities */}
      <div
        className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} grid grid-cols-1 md:grid-cols-2 gap-4`}
      >
        <div>
          <h4 className="text-sm font-medium mb-2">Cost Breakdown by Category</h4>
          <div className="space-y-2">
            {Object.entries(categoryCosts)
              .sort(([, costA], [, costB]) => costB - costA)
              .map(([category, cost]) => (
                <div key={category} className="flex items-center">
                  <div className="w-full flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs">{category}</span>
                      <span className="text-xs font-medium">{formatCurrency(cost)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-green-500"
                        style={{ width: `${(cost / totalCost) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Optimization Opportunities</h4>
          <div className="space-y-1">
            {suggestions.length > 0 ? (
              suggestions
                .sort((a, b) => b.savingsAmount - a.savingsAmount)
                .slice(0, 4)
                .map(suggestion => (
                  <div
                    key={suggestion.id}
                    className="text-sm flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <TrendingDown
                        size={14}
                        className={`mr-2 ${getImpactColor(suggestion.impact)}`}
                      />
                      <span className="truncate max-w-64">{suggestion.title}</span>
                    </div>
                    <span className="font-medium text-blue-500">
                      {formatCurrency(suggestion.savingsAmount)}
                    </span>
                  </div>
                ))
            ) : (
              <div className="text-sm text-gray-500">No optimizations available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  darkMode: boolean;
  valueColor?: string;
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  darkMode,
  valueColor = '',
}: SummaryCardProps) {
  return (
    <div
      className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-sm border`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm text-gray-500">{title}</div>
        {icon}
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
    </div>
  );
}

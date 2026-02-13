/**
 * Cost Analysis Panel
 * Detailed cost breakdown and analysis
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DateRange } from '../../types/advanced-analytics';
import { costBreakdown } from '../../analytics/cost/CostBreakdown';
import { costOptimizer } from '../../analytics/cost/CostOptimizer';
import { budgetMonitor } from '../../analytics/cost/BudgetMonitor';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B9D'];

interface CostAnalysisPanelProps {
  dateRange: DateRange;
}

export const CostAnalysisPanel: React.FC<CostAnalysisPanelProps> = ({ dateRange }) => {
  const [costData, setCostData] = useState<ReturnType<typeof costBreakdown.getCostSummary> | null>(null);
  const [topWorkflows, setTopWorkflows] = useState<ReturnType<typeof costBreakdown.getMostExpensiveWorkflows>>([]);
  const [topNodeTypes, setTopNodeTypes] = useState<ReturnType<typeof costBreakdown.getMostExpensiveNodeTypes>>([]);
  const [optimizations, setOptimizations] = useState<ReturnType<typeof costOptimizer.getAllOptimizations>>([]);
  const [budgets, setBudgets] = useState<ReturnType<typeof budgetMonitor.getAllBudgets>>([]);

  useEffect(() => {
    loadCostData();
  }, [dateRange]);

  const loadCostData = () => {
    const summary = costBreakdown.getCostSummary(dateRange);
    const workflows = costBreakdown.getMostExpensiveWorkflows(dateRange, 10);
    const nodeTypes = costBreakdown.getMostExpensiveNodeTypes(dateRange, 10);
    const opts = costOptimizer.getAllOptimizations(dateRange);
    const allBudgets = budgetMonitor.getAllBudgets();

    setCostData(summary);
    setTopWorkflows(workflows);
    setTopNodeTypes(nodeTypes);
    setOptimizations(opts);
    setBudgets(allBudgets);
  };

  if (!costData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cost data...</p>
        </div>
      </div>
    );
  }

  // Prepare cost by category data
  const categoryData = Object.entries(costData.byCategory).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Number(value.toFixed(2)),
  }));

  // Prepare workflow cost data
  const workflowCostData = topWorkflows.map((w) => ({
    name: w.workflowId.slice(0, 8),
    cost: Number(w.totalCost.toFixed(2)),
    executions: w.executionCount,
  }));

  // Prepare node type cost data
  const nodeTypeCostData = topNodeTypes.map((n) => ({
    name: n.nodeType,
    cost: Number(n.totalCost.toFixed(2)),
    avgCost: Number(n.avgCost.toFixed(4)),
  }));

  // Calculate potential savings
  const totalSavings = optimizations.reduce((sum, opt) => sum + opt.savings, 0);
  const savingsPercentage = costData.totalCost > 0 ? (totalSavings / costData.totalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Cost Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cost</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                ${costData.totalCost.toFixed(2)}
              </p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
          <div className="mt-4">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                costData.trend > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
              }`}
            >
              {costData.trend > 0 ? '↑' : '↓'} {Math.abs(costData.trend).toFixed(1)}%
            </span>
            <span className="ml-2 text-xs text-gray-500">vs last period</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Cost/Execution</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                ${costData.avgCostPerExecution.toFixed(4)}
              </p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
          <div className="mt-4">
            <span className="text-xs text-gray-500">Per workflow run</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Potential Savings</p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                ${totalSavings.toFixed(2)}
              </p>
            </div>
            <div className="text-4xl">💡</div>
          </div>
          <div className="mt-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600">
              {savingsPercentage.toFixed(1)}% reduction
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Top Category</p>
              <p className="mt-2 text-xl font-bold text-gray-900 capitalize">
                {costData.mostExpensiveCategory}
              </p>
            </div>
            <div className="text-4xl">🎯</div>
          </div>
          <div className="mt-4">
            <span className="text-xs text-gray-500">
              ${costData.byCategory[costData.mostExpensiveCategory]?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Category */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: $${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Workflows by Cost */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Workflows by Cost</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workflowCostData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value}`} />
              <Legend />
              <Bar dataKey="cost" fill="#0088FE" name="Total Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Node Types by Cost */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Node Types by Cost</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={nodeTypeCostData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip formatter={(value) => `$${value}`} />
              <Bar dataKey="cost" fill="#00C49F" name="Total Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budgets */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Tracking</h3>
          <div className="space-y-4">
            {budgets.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No budgets configured</p>
            ) : (
              budgets.map((budget) => (
                <div key={budget.id} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900">{budget.name}</span>
                    <span className="text-sm text-gray-600">
                      ${budget.current.toFixed(2)} / ${budget.limit.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        budget.percentage >= 90
                          ? 'bg-red-600'
                          : budget.percentage >= 75
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {budget.percentage.toFixed(1)}% used - {budget.period}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Optimization Recommendations */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Optimization Recommendations</h3>
        <div className="space-y-4">
          {optimizations.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No optimization recommendations available</p>
          ) : (
            optimizations.slice(0, 5).map((opt) => (
              <div key={opt.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-gray-900">Workflow: {opt.workflowId.slice(0, 16)}...</h4>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Save ${opt.savings.toFixed(2)} ({opt.savingsPercentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {opt.optimizations.map((action, idx) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <div className="flex-1">
                            <p className="text-sm text-gray-700">{action.description}</p>
                            <div className="mt-1 flex items-center space-x-2">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  action.complexity === 'low'
                                    ? 'bg-green-100 text-green-800'
                                    : action.complexity === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {action.complexity} effort
                              </span>
                              <span className="text-xs text-gray-500">Impact: ${action.impact.toFixed(2)}</span>
                              {action.autoApplicable && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  Auto-applicable
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

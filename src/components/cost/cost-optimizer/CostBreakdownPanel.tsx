/**
 * CostBreakdownPanel Component
 * Detailed cost breakdown table and node cost details
 */

import React from 'react';
import { RefreshCw, Calculator } from 'lucide-react';
import { useCostAnalysis } from './useCostAnalysis';
import type { CostBreakdownProps } from './types';

export function CostBreakdownPanel({
  costBreakdown,
  darkMode,
  onRefresh,
}: CostBreakdownProps) {
  const { calculateTotalCost, formatCurrency } = useCostAnalysis();

  const sortedBreakdown = [...costBreakdown].sort(
    (a, b) => b.monthlyEstimate - a.monthlyEstimate
  );
  const totalCost = calculateTotalCost(costBreakdown);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Cost Details by Node</h3>
        <button
          onClick={onRefresh}
          className="px-3 py-1 bg-green-500 text-white rounded-md text-sm flex items-center space-x-1"
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {costBreakdown.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Calculator size={36} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">No cost data available</p>
        </div>
      ) : (
        <>
          {/* Cost Table */}
          <div className="overflow-x-auto">
            <table className={`min-w-full ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <tr>
                  <th className="py-2 px-3 text-left text-sm font-medium">Node</th>
                  <th className="py-2 px-3 text-left text-sm font-medium">Type</th>
                  <th className="py-2 px-3 text-left text-sm font-medium">Service</th>
                  <th className="py-2 px-3 text-right text-sm font-medium">Cost/Exec</th>
                  <th className="py-2 px-3 text-right text-sm font-medium">Executions</th>
                  <th className="py-2 px-3 text-right text-sm font-medium">Monthly Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedBreakdown.map(node => (
                  <tr
                    key={node.nodeId}
                    className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                  >
                    <td className="py-3 px-3 text-sm">{node.nodeName}</td>
                    <td className="py-3 px-3 text-sm">{node.nodeType}</td>
                    <td className="py-3 px-3 text-sm">{node.apiProvider || 'N/A'}</td>
                    <td className="py-3 px-3 text-right text-sm">
                      {node.costPerExecution < 0.001
                        ? formatCurrency(node.costPerExecution * 1000) + '/1K'
                        : formatCurrency(node.costPerExecution)}
                    </td>
                    <td className="py-3 px-3 text-right text-sm">
                      {node.executionsPerMonth.toLocaleString()}/month
                    </td>
                    <td className="py-3 px-3 text-right text-sm font-medium">
                      {formatCurrency(node.monthlyEstimate)}
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr
                  className={`${
                    darkMode ? 'bg-gray-700 font-medium' : 'bg-gray-100 font-medium'
                  }`}
                >
                  <td colSpan={5} className="py-3 px-3 text-right text-sm">
                    Total
                  </td>
                  <td className="py-3 px-3 text-right text-sm font-bold">
                    {formatCurrency(totalCost)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Node Detail Cards */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Cost Details by Node</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedBreakdown.slice(0, 6).map(node => (
                <NodeCostCard key={node.nodeId} node={node} darkMode={darkMode} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface NodeCostCardProps {
  node: {
    nodeId: string;
    nodeName: string;
    nodeType: string;
    apiProvider?: string;
    monthlyEstimate: number;
    costPerExecution: number;
    executionsPerMonth: number;
    costFactors: { factor: string; cost: number }[];
  };
  darkMode: boolean;
}

function NodeCostCard({ node, darkMode }: NodeCostCardProps) {
  const { formatCurrency } = useCostAnalysis();

  return (
    <div
      className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-sm border`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-medium">{node.nodeName}</div>
          <div className="text-sm text-gray-500">
            {node.nodeType} {node.apiProvider ? `- ${node.apiProvider}` : ''}
          </div>
        </div>
        <div className="text-lg font-bold text-green-600">
          {formatCurrency(node.monthlyEstimate)}
        </div>
      </div>

      <div className="space-y-2">
        {node.costFactors.map((factor, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <span>{factor.factor}</span>
            <span>{formatCurrency(factor.cost)}</span>
          </div>
        ))}
        <div className="pt-2 text-xs text-gray-500 border-t">
          <div className="flex justify-between">
            <span>Cost per execution:</span>
            <span>{formatCurrency(node.costPerExecution)}</span>
          </div>
          <div className="flex justify-between">
            <span>Executions per month:</span>
            <span>{node.executionsPerMonth.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

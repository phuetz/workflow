/**
 * Agent Performance Panel
 *
 * Displays real-time performance metrics for individual agents and patterns
 */

import React, { useState, useEffect } from 'react';
import { Agent } from '../../types/agents';
import { PatternMetrics, AgenticPattern } from '../../agentic/AgenticWorkflowEngine';

interface AgentPerformancePanelProps {
  agents: Agent[];
  patternMetrics?: PatternMetrics[];
  onRefresh?: () => void;
}

interface AgentMetrics {
  agentId: string;
  agentName: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  successRate: number;
  averageExecutionTime: number;
  averageConfidence: number;
  costTotal: number;
}

export const AgentPerformancePanel: React.FC<AgentPerformancePanelProps> = ({
  agents,
  patternMetrics = [],
  onRefresh,
}) => {
  const [selectedView, setSelectedView] = useState<'agents' | 'patterns'>('agents');
  const [sortBy, setSortBy] = useState<'name' | 'performance' | 'cost'>('performance');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  // Mock agent metrics (in production, fetch from AgentOrchestrator)
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics[]>([]);

  useEffect(() => {
    // Simulate fetching metrics
    const metrics = agents.map(agent => ({
      agentId: agent.id,
      agentName: agent.name,
      totalTasks: Math.floor(Math.random() * 100),
      completedTasks: Math.floor(Math.random() * 90),
      failedTasks: Math.floor(Math.random() * 10),
      successRate: 0.85 + Math.random() * 0.14,
      averageExecutionTime: 1000 + Math.random() * 4000,
      averageConfidence: 0.7 + Math.random() * 0.25,
      costTotal: Math.random() * 10,
    }));
    setAgentMetrics(metrics);
  }, [agents]);

  const sortedAgentMetrics = [...agentMetrics].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.agentName.localeCompare(b.agentName);
      case 'performance':
        return b.successRate - a.successRate;
      case 'cost':
        return a.costTotal - b.costTotal;
      default:
        return 0;
    }
  });

  const sortedPatternMetrics = [...patternMetrics].sort(
    (a, b) => b.averageROI - a.averageROI
  );

  const getPerformanceColor = (value: number): string => {
    if (value >= 0.9) return 'text-green-600';
    if (value >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getROIColor = (value: number): string => {
    if (value >= 6) return 'text-green-600';
    if (value >= 4) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <div className="agent-performance-panel bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Performance Metrics</h2>

        <div className="flex gap-4">
          {/* Time Range */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSelectedView('agents')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedView === 'agents'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Agent Performance
        </button>
        <button
          onClick={() => setSelectedView('patterns')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedView === 'patterns'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Pattern Performance
        </button>
      </div>

      {/* Agent Performance View */}
      {selectedView === 'agents' && (
        <>
          {/* Sort Controls */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm text-gray-600">Sort by:</span>
            {(['name', 'performance', 'cost'] as const).map(sort => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                className={`px-3 py-1 rounded ${
                  sortBy === sort
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {sort.charAt(0).toUpperCase() + sort.slice(1)}
              </button>
            ))}
          </div>

          {/* Agent Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Agent</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Tasks</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Success Rate</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Avg Time</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Confidence</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Cost</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedAgentMetrics.map(metrics => (
                  <tr key={metrics.agentId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{metrics.agentName}</div>
                      <div className="text-xs text-gray-500">{metrics.agentId}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-medium">{metrics.totalTasks}</div>
                      <div className="text-xs text-gray-500">
                        {metrics.completedTasks}/{metrics.failedTasks} C/F
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${getPerformanceColor(metrics.successRate)}`}>
                        {(metrics.successRate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium">
                        {metrics.averageExecutionTime.toFixed(0)}ms
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${metrics.averageConfidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm">
                          {(metrics.averageConfidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium">${metrics.costTotal.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-600">Total Tasks</div>
              <div className="text-2xl font-bold text-blue-600">
                {agentMetrics.reduce((sum, m) => sum + m.totalTasks, 0)}
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-gray-600">Avg Success Rate</div>
              <div className="text-2xl font-bold text-green-600">
                {((agentMetrics.reduce((sum, m) => sum + m.successRate, 0) / agentMetrics.length) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-gray-600">Avg Execution Time</div>
              <div className="text-2xl font-bold text-purple-600">
                {(agentMetrics.reduce((sum, m) => sum + m.averageExecutionTime, 0) / agentMetrics.length).toFixed(0)}ms
              </div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="text-sm text-gray-600">Total Cost</div>
              <div className="text-2xl font-bold text-orange-600">
                ${agentMetrics.reduce((sum, m) => sum + m.costTotal, 0).toFixed(2)}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pattern Performance View */}
      {selectedView === 'patterns' && (
        <>
          <div className="space-y-4">
            {sortedPatternMetrics.map(metrics => (
              <div
                key={metrics.pattern}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold capitalize">
                      {metrics.pattern.replace('-', ' ')}
                    </h3>
                    <div className="text-sm text-gray-600">
                      {metrics.totalExecutions} executions
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${getROIColor(metrics.averageROI)}`}>
                    {metrics.averageROI.toFixed(1)}:1 ROI
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-600">Success Rate</div>
                    <div className={`text-lg font-semibold ${getPerformanceColor(metrics.successRate)}`}>
                      {(metrics.successRate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Avg Execution Time</div>
                    <div className="text-lg font-semibold">
                      {metrics.averageExecutionTime.toFixed(0)}ms
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Efficiency Gain</div>
                    <div className="text-lg font-semibold text-green-600">
                      {metrics.averageEfficiencyGain.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Cost Reduction</div>
                    <div className="text-lg font-semibold text-blue-600">
                      {metrics.averageCostReduction.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                    <span>Performance</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                        style={{ width: `${metrics.successRate * 100}%` }}
                      />
                    </div>
                    <span>{(metrics.successRate * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}

            {patternMetrics.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No pattern metrics available yet. Execute workflows to see performance data.
              </div>
            )}
          </div>

          {/* Overall Pattern Stats */}
          {patternMetrics.length > 0 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
              <h3 className="font-semibold mb-3">Overall Pattern Performance</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Best Pattern</div>
                  <div className="text-xl font-bold text-green-600 capitalize">
                    {sortedPatternMetrics[0]?.pattern.replace('-', ' ')}
                  </div>
                  <div className="text-sm text-gray-600">
                    {sortedPatternMetrics[0]?.averageROI.toFixed(1)}:1 ROI
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Avg Efficiency Gain</div>
                  <div className="text-xl font-bold text-blue-600">
                    {(patternMetrics.reduce((sum, m) => sum + m.averageEfficiencyGain, 0) / patternMetrics.length).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Avg ROI</div>
                  <div className="text-xl font-bold text-purple-600">
                    {(patternMetrics.reduce((sum, m) => sum + m.averageROI, 0) / patternMetrics.length).toFixed(1)}:1
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

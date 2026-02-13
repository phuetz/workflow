/**
 * Simulator Panel - Workflow Simulation Controls
 * UI for running simulations and viewing results
 */

import React, { useState } from 'react';
import {
  Play,
  RefreshCw,
  Download,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Zap,
  Shield,
  TrendingUp,
} from 'lucide-react';
import { WorkflowSimulator } from '../../simulation/WorkflowSimulator';
import { SimulationResult, SimulationOptions } from '../../types/simulation';
import { useWorkflowStore } from '../../store/workflowStore';
import { logger } from '../../services/SimpleLogger';

export const SimulatorPanel: React.FC = () => {
  const { nodes, edges } = useWorkflowStore();
  const [simulator] = useState(() => new WorkflowSimulator());
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [options, setOptions] = useState<SimulationOptions>({
    skipCredentialValidation: false,
    skipQuotaCheck: false,
    skipCostEstimation: false,
    maxSimulationTime: 30000,
    historicalDataSource: 'average',
    costModel: 'realistic',
    includeDetailedLogs: false,
  });

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      const result = await simulator.simulate(nodes, edges, options);
      setSimulationResult(result);
    } catch (error) {
      logger.error('Simulation failed:', error);
    } finally {
      setIsSimulating(false);
    }
  };

  const exportResults = () => {
    if (!simulationResult) return;

    const dataStr = JSON.stringify(simulationResult, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `simulation-${simulationResult.simulationId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Workflow Simulator</h2>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Simulation Controls */}
        <div className="flex gap-2">
          <button
            onClick={runSimulation}
            disabled={isSimulating || nodes.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Simulation
              </>
            )}
          </button>

          {simulationResult && (
            <button
              onClick={exportResults}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.skipCredentialValidation}
                onChange={e =>
                  setOptions({ ...options, skipCredentialValidation: e.target.checked })
                }
                className="rounded"
              />
              <span className="text-sm text-gray-700">Skip credential validation</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.skipQuotaCheck}
                onChange={e => setOptions({ ...options, skipQuotaCheck: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Skip quota checks</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.skipCostEstimation}
                onChange={e =>
                  setOptions({ ...options, skipCostEstimation: e.target.checked })
                }
                className="rounded"
              />
              <span className="text-sm text-gray-700">Skip cost estimation</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost Model
              </label>
              <select
                value={options.costModel}
                onChange={e =>
                  setOptions({
                    ...options,
                    costModel: e.target.value as 'conservative' | 'realistic' | 'optimistic',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="conservative">Conservative</option>
                <option value="realistic">Realistic</option>
                <option value="optimistic">Optimistic</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {!simulationResult ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Zap className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Run a simulation to see results</p>
              <p className="text-sm mt-2">
                Test your workflow without side effects
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Execution Status */}
            <div
              className={`p-4 rounded-lg border-2 ${
                simulationResult.readyForExecution
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-red-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {simulationResult.readyForExecution ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {simulationResult.readyForExecution
                      ? 'Ready for Execution'
                      : 'Not Ready for Execution'}
                  </h3>
                  {simulationResult.blockers.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      {simulationResult.blockers.length} blocker(s) found
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-2 gap-4">
              <ScoreCard
                title="Reliability"
                score={simulationResult.score.reliability}
                icon={<Shield className="w-5 h-5" />}
              />
              <ScoreCard
                title="Performance"
                score={simulationResult.score.performance}
                icon={<Zap className="w-5 h-5" />}
              />
              <ScoreCard
                title="Cost Efficiency"
                score={simulationResult.score.costEfficiency}
                icon={<DollarSign className="w-5 h-5" />}
              />
              <ScoreCard
                title="Security"
                score={simulationResult.score.security}
                icon={<Shield className="w-5 h-5" />}
              />
            </div>

            {/* Overall Score */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Overall Score</p>
                <div
                  className={`text-5xl font-bold ${getScoreColor(
                    simulationResult.score.overall
                  )}`}
                >
                  {simulationResult.score.overall}
                  <span className="text-2xl">/100</span>
                </div>
              </div>
            </div>

            {/* Estimates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Estimated Time
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {(simulationResult.estimatedTime.total / 1000).toFixed(2)}s
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Estimated Cost
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  ${simulationResult.estimatedCost.total.toFixed(4)}
                </p>
              </div>
            </div>

            {/* Warnings and Errors */}
            {simulationResult.potentialErrors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">
                    Potential Errors ({simulationResult.potentialErrors.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {simulationResult.potentialErrors.slice(0, 5).map((error, idx) => (
                    <div key={idx} className="text-sm text-red-800">
                      <span className="font-medium">{error.nodeType}:</span> {error.message}
                      {error.probability > 0.5 && (
                        <span className="ml-2 text-xs text-red-600">
                          ({(error.probability * 100).toFixed(0)}% likely)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {simulationResult.warnings.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-900">
                    Warnings ({simulationResult.warnings.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {simulationResult.warnings.slice(0, 5).map((warning, idx) => (
                    <div key={idx} className="text-sm text-yellow-800">
                      {warning.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {simulationResult.recommendations.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Recommendations</h3>
                </div>
                <div className="space-y-3">
                  {simulationResult.recommendations.map((rec, idx) => (
                    <div key={idx} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            rec.priority === 'high'
                              ? 'bg-red-100 text-red-700'
                              : rec.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {rec.priority}
                        </span>
                        <span className="font-medium text-blue-900">{rec.message}</span>
                      </div>
                      <p className="text-blue-700">{rec.impact}</p>
                      {rec.implementation && (
                        <p className="text-blue-600 italic mt-1">
                          → {rec.implementation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ScoreCard: React.FC<{
  title: string;
  score: number;
  icon: React.ReactNode;
}> = ({ title, score, icon }) => {
  const getColor = (score: number): string => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  const color = getColor(score);
  const colorClasses = {
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="text-3xl font-bold">{score}</p>
    </div>
  );
};

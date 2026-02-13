/**
 * Evaluation Panel
 * Main UI for managing and running evaluations
 */

import React, { useState, useEffect } from 'react';
import { logger } from '../../services/SimpleLogger';
import type {
  Evaluation,
  EvaluationRun,
  EvaluationStatus,
  TestSuite,
} from '../../types/evaluation';

interface EvaluationPanelProps {
  workflowId: string;
  onCreateEvaluation?: () => void;
  onRunEvaluation?: (evaluationId: string) => void;
  onViewResults?: (runId: string) => void;
}

export const EvaluationPanel: React.FC<EvaluationPanelProps> = ({
  workflowId,
  onCreateEvaluation,
  onRunEvaluation,
  onViewResults,
}) => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [recentRuns, setRecentRuns] = useState<EvaluationRun[]>([]);
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [activeTab, setActiveTab] = useState<'evaluations' | 'runs' | 'suites'>('evaluations');
  const [loading, setLoading] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<string | null>(null);

  // Load evaluations
  useEffect(() => {
    loadEvaluations();
    loadRecentRuns();
    loadTestSuites();
  }, [workflowId]);

  const loadEvaluations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/evaluations?workflowId=${workflowId}`);
      if (response.ok) {
        const data = await response.json();
        setEvaluations(Array.isArray(data) ? data : data.evaluations || []);
      } else {
        // Fall back to empty array if API not available
        setEvaluations([]);
      }
    } catch (error) {
      logger.error('Failed to load evaluations:', error);
      setEvaluations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentRuns = async () => {
    try {
      const response = await fetch(`/api/evaluation-runs?workflowId=${workflowId}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setRecentRuns(Array.isArray(data) ? data : data.runs || []);
      } else {
        setRecentRuns([]);
      }
    } catch (error) {
      logger.error('Failed to load recent runs:', error);
      setRecentRuns([]);
    }
  };

  const loadTestSuites = async () => {
    try {
      const response = await fetch(`/api/test-suites?workflowId=${workflowId}`);
      if (response.ok) {
        const data = await response.json();
        setTestSuites(Array.isArray(data) ? data : data.suites || []);
      } else {
        setTestSuites([]);
      }
    } catch (error) {
      logger.error('Failed to load test suites:', error);
      setTestSuites([]);
    }
  };

  const handleRunEvaluation = (evaluationId: string) => {
    setSelectedEvaluation(evaluationId);
    if (onRunEvaluation) {
      onRunEvaluation(evaluationId);
    }
  };

  const getStatusColor = (status: EvaluationStatus): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'running':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-gray-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status: EvaluationStatus): string => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
      case 'running':
        return '↻';
      case 'pending':
        return '○';
      default:
        return '?';
    }
  };

  return (
    <div className="evaluation-panel flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-bold text-gray-800">AI Workflow Evaluations</h2>
        <button
          onClick={onCreateEvaluation}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Evaluation
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('evaluations')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'evaluations'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Evaluations ({evaluations.length})
        </button>
        <button
          onClick={() => setActiveTab('runs')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'runs'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Recent Runs ({recentRuns.length})
        </button>
        <button
          onClick={() => setActiveTab('suites')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'suites'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Test Suites ({testSuites.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : (
          <>
            {/* Evaluations Tab */}
            {activeTab === 'evaluations' && (
              <div className="space-y-3">
                {evaluations.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-lg mb-4">No evaluations yet</div>
                    <button
                      onClick={onCreateEvaluation}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Create Your First Evaluation
                    </button>
                  </div>
                ) : (
                  evaluations.map((evaluation) => (
                    <div
                      key={evaluation.id}
                      className="border rounded-lg p-4 hover:border-blue-400 transition-colors cursor-pointer"
                      onClick={() => setSelectedEvaluation(evaluation.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{evaluation.name}</h3>
                          {evaluation.description && (
                            <p className="text-sm text-gray-600 mt-1">{evaluation.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>{evaluation.metrics.length} metrics</span>
                            <span>{evaluation.inputs.length} test inputs</span>
                            <span>Updated {new Date(evaluation.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunEvaluation(evaluation.id);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Run
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Runs Tab */}
            {activeTab === 'runs' && (
              <div className="space-y-3">
                {recentRuns.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">No evaluation runs yet</div>
                ) : (
                  recentRuns.map((run) => (
                    <div
                      key={run.id}
                      className="border rounded-lg p-4 hover:border-blue-400 transition-colors cursor-pointer"
                      onClick={() => onViewResults && onViewResults(run.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className={`w-3 h-3 rounded-full ${getStatusColor(run.status)}`} />
                            <h3 className="font-semibold text-gray-800">{run.evaluationName}</h3>
                          </div>
                          <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500">Total Tests</div>
                              <div className="font-semibold">{run.summary.totalTests}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Passed</div>
                              <div className="font-semibold text-green-600">{run.summary.passed}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Failed</div>
                              <div className="font-semibold text-red-600">{run.summary.failed}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Avg Score</div>
                              <div className="font-semibold">{(run.summary.averageScore * 100).toFixed(1)}%</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            {new Date(run.startTime).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Suites Tab */}
            {activeTab === 'suites' && (
              <div className="space-y-3">
                {testSuites.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">No test suites yet</div>
                ) : (
                  testSuites.map((suite) => (
                    <div key={suite.id} className="border rounded-lg p-4 hover:border-blue-400 transition-colors">
                      <h3 className="font-semibold text-gray-800">{suite.name}</h3>
                      {suite.description && <p className="text-sm text-gray-600 mt-1">{suite.description}</p>}
                      <div className="text-sm text-gray-500 mt-2">{suite.evaluations.length} evaluations</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EvaluationPanel;

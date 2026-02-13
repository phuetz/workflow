/**
 * Digital Twin Viewer Component
 *
 * Side-by-side visualization of virtual twin simulation vs real execution
 * with diff highlighting, playback controls, and metrics comparison.
 */

import React, { useState, useEffect, useMemo } from 'react';
import type {
  VirtualWorkflow,
  SimulationResult,
  ComparisonResult,
  TwinStatistics,
} from '../../digitaltwin/types/digitaltwin';
import { getDigitalTwinManager } from '../../digitaltwin/WorkflowDigitalTwin';
import { getTwinComparison } from '../../digitaltwin/TwinComparison';
import type { WorkflowExecution } from '../../types/workflowTypes';

interface DigitalTwinViewerProps {
  twinId: string;
  simulationId?: string;
  realExecutionId?: string;
  autoPlay?: boolean;
}

const DigitalTwinViewer: React.FC<DigitalTwinViewerProps> = ({
  twinId,
  simulationId,
  realExecutionId,
  autoPlay = false,
}) => {
  const [twin, setTwin] = useState<VirtualWorkflow | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [realExecution, setRealExecution] = useState<WorkflowExecution | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [statistics, setStatistics] = useState<TwinStatistics | null>(null);
  const [playing, setPlaying] = useState(autoPlay);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'comparison' | 'metrics'>('overview');

  const digitalTwinManager = useMemo(() => getDigitalTwinManager(), []);
  const twinComparison = useMemo(() => getTwinComparison(), []);

  useEffect(() => {
    loadTwinData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twinId, simulationId, realExecutionId]);

  const loadTwinData = async () => {
    // Load twin
    const loadedTwin = digitalTwinManager.getTwin(twinId);
    setTwin(loadedTwin || null);

    // Load statistics
    const stats = digitalTwinManager.getStatistics(twinId);
    setStatistics(stats || null);

    // Load simulation if provided
    if (simulationId && loadedTwin) {
      // Would load from storage
      // setSimulation(simulation);
    }

    // Load real execution if provided
    if (realExecutionId) {
      // Would load from storage
      // setRealExecution(execution);
    }

    // Compare if both available
    if (simulation && realExecution) {
      const comparisonResult = await twinComparison.compare(
        twinId,
        simulation,
        realExecution
      );
      setComparison(comparisonResult);
    }
  };

  const maxSteps = useMemo(() => {
    if (!simulation) return 0;
    return simulation.nodeResults.length;
  }, [simulation]);

  useEffect(() => {
    if (!playing || currentStep >= maxSteps) return;

    const timer = setTimeout(() => {
      setCurrentStep(prev => Math.min(prev + 1, maxSteps));
    }, 1000);

    return () => clearTimeout(timer);
  }, [playing, currentStep, maxSteps]);

  const handlePlayPause = () => {
    setPlaying(!playing);
  };

  const handleStep = (direction: 'forward' | 'backward') => {
    setPlaying(false);
    setCurrentStep(prev => {
      if (direction === 'forward') {
        return Math.min(prev + 1, maxSteps);
      }
      return Math.max(prev - 1, 0);
    });
  };

  const handleSeek = (step: number) => {
    setPlaying(false);
    setCurrentStep(Math.max(0, Math.min(step, maxSteps)));
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.99) return 'text-green-600';
    if (accuracy >= 0.90) return 'text-yellow-600';
    if (accuracy >= 0.50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'identical':
        return 'bg-green-100 text-green-800';
      case 'similar':
        return 'bg-yellow-100 text-yellow-800';
      case 'different':
        return 'bg-orange-100 text-orange-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!twin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading digital twin...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Digital Twin Viewer
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Workflow: {twin.workflow.name}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {statistics && (
              <div className="text-right">
                <div className="text-sm text-gray-600">Simulations</div>
                <div className="text-lg font-semibold">{statistics.totalSimulations}</div>
              </div>
            )}
            {statistics && (
              <div className="text-right">
                <div className="text-sm text-gray-600">Avg Accuracy</div>
                <div className={`text-lg font-semibold ${getAccuracyColor(statistics.avgAccuracy)}`}>
                  {(statistics.avgAccuracy * 100).toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mt-4">
          {(['overview', 'comparison', 'metrics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                selectedTab === tab
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Twin Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">Twin Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Twin ID</p>
                  <p className="text-sm font-mono">{twin.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Real Workflow ID</p>
                  <p className="text-sm font-mono">{twin.realWorkflowId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Execution Count</p>
                  <p className="text-sm font-semibold">{twin.executionCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Divergence</p>
                  <p className="text-sm font-semibold">
                    {(twin.divergence * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="text-sm">{twin.metadata.created.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Sync</p>
                  <p className="text-sm">
                    {twin.lastSyncAt?.toLocaleDateString() || 'Never'}
                  </p>
                </div>
              </div>
            </div>

            {/* Simulation Results */}
            {simulation && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4">Latest Simulation</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className={`text-sm font-semibold ${
                      simulation.status === 'success' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {simulation.status.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="text-sm font-semibold">
                      {simulation.duration.toFixed(0)}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Nodes Executed</p>
                    <p className="text-sm font-semibold">
                      {simulation.metrics.nodesExecuted} / {simulation.metrics.totalNodes}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'comparison' && comparison && (
          <div className="space-y-6">
            {/* Comparison Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Comparison Results</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(comparison.status)}`}>
                  {comparison.status.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Overall Accuracy</p>
                  <p className={`text-2xl font-semibold ${getAccuracyColor(comparison.accuracy)}`}>
                    {(comparison.accuracy * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Output Match</p>
                  <p className={`text-lg font-semibold ${getAccuracyColor(comparison.metrics.outputMatch)}`}>
                    {(comparison.metrics.outputMatch * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration Match</p>
                  <p className={`text-lg font-semibold ${getAccuracyColor(comparison.metrics.durationMatch)}`}>
                    {(comparison.metrics.durationMatch * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Error Match</p>
                  <p className={`text-lg font-semibold ${getAccuracyColor(comparison.metrics.errorMatch)}`}>
                    {(comparison.metrics.errorMatch * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Differences */}
            {comparison.differences.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h4 className="font-medium">
                    Differences ({comparison.differences.length})
                  </h4>
                </div>
                <div className="divide-y divide-gray-200">
                  {comparison.differences.map((diff, index) => (
                    <div key={index} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              diff.severity === 'critical'
                                ? 'bg-red-100 text-red-800'
                                : diff.severity === 'major'
                                ? 'bg-orange-100 text-orange-800'
                                : diff.severity === 'minor'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {diff.severity}
                            </span>
                            <span className="text-xs text-gray-500">{diff.type}</span>
                          </div>
                          <p className="mt-2 text-sm text-gray-900">{diff.description}</p>
                          <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="text-gray-500">Virtual:</p>
                              <pre className="mt-1 bg-red-50 p-2 rounded">
                                {JSON.stringify(diff.virtualValue, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <p className="text-gray-500">Real:</p>
                              <pre className="mt-1 bg-green-50 p-2 rounded">
                                {JSON.stringify(diff.realValue, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'metrics' && statistics && (
          <div className="space-y-6">
            {/* Performance Metrics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Simulations</p>
                  <p className="text-2xl font-semibold">{statistics.totalSimulations}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-2xl font-semibold text-green-600">
                    {((statistics.successfulSimulations / statistics.totalSimulations) * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Duration</p>
                  <p className="text-2xl font-semibold">
                    {statistics.avgDuration.toFixed(0)}ms
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Accuracy</p>
                  <p className={`text-2xl font-semibold ${getAccuracyColor(statistics.avgAccuracy)}`}>
                    {(statistics.avgAccuracy * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fault Recovery Rate</p>
                  <p className="text-2xl font-semibold">
                    {(statistics.faultRecoveryRate * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Divergence</p>
                  <p className="text-2xl font-semibold">
                    {(statistics.divergence * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Playback Controls */}
      {simulation && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleStep('backward')}
              disabled={currentStep === 0}
              className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handlePlayPause}
              className="p-2 rounded hover:bg-gray-200"
            >
              {playing ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => handleStep('forward')}
              disabled={currentStep >= maxSteps}
              className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max={maxSteps}
                value={currentStep}
                onChange={e => handleSeek(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="text-sm text-gray-600">
              Step {currentStep} / {maxSteps}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DigitalTwinViewer;

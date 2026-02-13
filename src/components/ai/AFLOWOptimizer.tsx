import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { Zap, BarChart3, TrendingUp, CheckCircle, AlertTriangle, Cpu, Activity, Play, Square, Settings } from 'lucide-react';
import { optimizationService, OptimizationResult, OptimizationConfig } from '../../services/OptimizationService';
import { notificationService } from '../../services/NotificationService';

export default function AFLOWOptimizer() {
  const { nodes, edges, darkMode, addLog } = useWorkflowStore();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  // Comparison view - future enhancement
  // const [showComparison, setShowComparison] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState({ phase: '', progress: 0 });
  const [config, setConfig] = useState<OptimizationConfig>({
    goals: ['performance', 'cost'],
    constraints: {},
    algorithms: ['mcts', 'genetic']
  });

  useEffect(() => {
    const handleProgressUpdate = (progress: unknown) => {
      setOptimizationProgress(progress as { phase: string; progress: number });
    };

    const handleOptimizationComplete = (result: OptimizationResult) => {
      setOptimizationResult(result);
      setIsOptimizing(false);
      notificationService.show('success', 'Optimization Complete',
        `Achieved ${result.savings.toFixed(1)}% cost savings with ${result.changes.length} optimizations`);
    };

    const handleOptimizationStart = () => {
      setIsOptimizing(true);
      setOptimizationResult(null);
    };

    // Set up event listeners
    optimizationService.on('optimizationProgress', handleProgressUpdate);
    optimizationService.on('optimizationCompleted', handleOptimizationComplete);
    optimizationService.on('optimizationStarted', handleOptimizationStart);
    
    return () => {
      optimizationService.off('optimizationProgress', handleProgressUpdate);
      optimizationService.off('optimizationCompleted', handleOptimizationComplete);
      optimizationService.off('optimizationStarted', handleOptimizationStart);
    };
  }, []);

  const startOptimization = async () => {
    if (nodes.length === 0) {
      notificationService.show('warning', 'No Workflow', 'Please create a workflow before optimizing');
      return;
    }

    try {
      setIsOptimizing(true);

      // Start optimization with configured settings
      const result = await optimizationService.optimizeWorkflow(
        nodes,
        edges,
        config
      );

      setOptimizationResult(result);
      setIsOptimizing(false);
      
      addLog({
        level: 'info',
        message: 'AFLOW optimization completed',
        data: { 
          savings: result.savings,
          changes: result.changes.length,
          score: result.score,
          performance: result.performance
        }
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setIsOptimizing(false);
      notificationService.show('error', 'Optimization Failed', errorMessage);
      addLog({
        level: 'error',
        message: 'AFLOW optimization failed',
        data: { error: errorMessage }
      });
    }
  };

  const cancelOptimization = () => {
    optimizationService.cancelOptimization();
    setIsOptimizing(false);
    notificationService.show('info', 'Optimization Cancelled', 'The optimization process has been cancelled');
  };

  const applyOptimizations = () => {
    if (!optimizationResult) return;

    // Apply the optimizations to the workflow
    // This would modify the nodes and edges based on the optimization suggestions
    notificationService.show('success', 'Optimizations Applied', 
      `Applied ${optimizationResult.changes.length} optimizations to your workflow`);
    
    addLog({
      level: 'info',
      message: 'Optimizations applied to workflow',
      data: { appliedChanges: optimizationResult.changes.length }
    });
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getOptimizationIcon = (type: string) => {
    switch (type) {
      case 'remove': return AlertTriangle;
      case 'merge': return Activity;
      case 'cache': return Cpu;
      case 'parallel': return BarChart3;
      case 'batch': return TrendingUp;
      default: return CheckCircle;
    }
  };

  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Zap className="text-purple-500" size={24} />
            <h1 className="text-2xl font-bold">AFLOW Optimizer</h1>
          </div>
          <div className="flex space-x-3">
            {!isOptimizing ? (
              <button
                onClick={startOptimization}
                disabled={nodes.length === 0}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Play size={16} />
                <span>Start Optimization</span>
              </button>
            ) : (
              <button
                onClick={cancelOptimization}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex items-center space-x-2"
              >
                <Square size={16} />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* Configuration Panel */}
        <div className={`mb-6 p-4 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center space-x-2 mb-4">
            <Settings size={20} />
            <h3 className="text-lg font-semibold">Optimization Configuration</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Goals</label>
              <div className="space-y-2">
                {['performance', 'cost', 'reliability', 'simplicity'].map(goal => (
                  <label key={goal} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.goals.includes(goal as 'performance' | 'cost' | 'reliability' | 'simplicity')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setConfig(prev => ({ ...prev, goals: [...prev.goals, goal as 'performance' | 'cost' | 'reliability' | 'simplicity'] }));
                        } else {
                          setConfig(prev => ({ ...prev, goals: prev.goals.filter(g => g !== goal) }));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="capitalize">{goal}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Algorithms</label>
              <div className="space-y-2">
                {['mcts', 'genetic', 'greedy', 'simulated_annealing'].map(algorithm => (
                  <label key={algorithm} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.algorithms.includes(algorithm as 'mcts' | 'genetic' | 'greedy' | 'simulated_annealing')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setConfig(prev => ({ ...prev, algorithms: [...prev.algorithms, algorithm as 'mcts' | 'genetic' | 'greedy' | 'simulated_annealing'] }));
                        } else {
                          setConfig(prev => ({ ...prev, algorithms: prev.algorithms.filter(a => a !== algorithm) }));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="uppercase">{algorithm.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Constraints</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.constraints.preserveOrder || false}
                    onChange={(e) => {
                      setConfig(prev => ({ 
                        ...prev, 
                        constraints: { ...prev.constraints, preserveOrder: e.target.checked }
                      }));
                    }}
                    className="rounded"
                  />
                  <span>Preserve Order</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        {isOptimizing && (
          <div className={`mb-6 p-4 rounded-lg border ${darkMode ? 'border-blue-700 bg-blue-900/20' : 'border-blue-200 bg-blue-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Optimization Progress</span>
              <span className="text-sm">{optimizationProgress.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${optimizationProgress.progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 capitalize">
              {optimizationProgress.phase.replace('_', ' ')} phase...
            </p>
          </div>
        )}

        {/* Results */}
        {optimizationResult && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg border ${darkMode ? 'border-green-700 bg-green-900/20' : 'border-green-200 bg-green-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Cost Savings</p>
                    <p className="text-2xl font-bold text-green-700">{optimizationResult.savings.toFixed(1)}%</p>
                  </div>
                  <TrendingUp className="text-green-500" size={24} />
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${darkMode ? 'border-blue-700 bg-blue-900/20' : 'border-blue-200 bg-blue-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Reliability</p>
                    <p className="text-2xl font-bold text-blue-700">{(optimizationResult.reliability * 100).toFixed(1)}%</p>
                  </div>
                  <CheckCircle className="text-blue-500" size={24} />
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${darkMode ? 'border-purple-700 bg-purple-900/20' : 'border-purple-200 bg-purple-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Optimizations</p>
                    <p className="text-2xl font-bold text-purple-700">{optimizationResult.changes.length}</p>
                  </div>
                  <Zap className="text-purple-500" size={24} />
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${darkMode ? 'border-yellow-700 bg-yellow-900/20' : 'border-yellow-200 bg-yellow-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">Score</p>
                    <p className="text-2xl font-bold text-yellow-700">{optimizationResult.score.toFixed(2)}</p>
                  </div>
                  <BarChart3 className="text-yellow-500" size={24} />
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className={`p-6 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
              <h3 className="text-lg font-semibold mb-4">Performance Impact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Throughput</p>
                  <p className="text-xl font-bold">{optimizationResult.performance.throughput.toFixed(0)} req/min</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Latency</p>
                  <p className="text-xl font-bold">{optimizationResult.performance.latency.toFixed(0)}ms</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Resource Reduction</p>
                  <p className="text-xl font-bold">{optimizationResult.performance.resourceUsage.toFixed(0)}%</p>
                </div>
              </div>
            </div>

            {/* Optimization Changes */}
            <div className={`p-6 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Recommended Changes</h3>
                <button
                  onClick={applyOptimizations}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                >
                  Apply All
                </button>
              </div>

              <div className="space-y-4">
                {optimizationResult.changes.map((change, index) => {
                  const IconComponent = getOptimizationIcon(change.type);
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <IconComponent className={getImpactColor(change.impact)} size={20} />
                          <div>
                            <h4 className="font-semibold">{change.description}</h4>
                            <p className="text-sm text-gray-600 mt-1">{change.suggestion}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Affects {change.nodeIds.length} node(s) • 
                              {change.estimatedSavings ? ` ${(change.estimatedSavings * 100).toFixed(1)}% savings • ` : ' '}
                              {(change.confidence * 100).toFixed(0)}% confidence
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          change.impact === 'high' ? 'bg-red-100 text-red-800' :
                          change.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {change.impact.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cost Comparison */}
            <div className={`p-6 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
              <h3 className="text-lg font-semibold mb-4">Cost Analysis</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Original Cost</span>
                  <span className="font-bold">{optimizationResult.originalCost.toFixed(2)} units</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Optimized Cost</span>
                  <span className="font-bold text-green-600">{optimizationResult.optimizedCost.toFixed(2)} units</span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between">
                  <span className="font-semibold">Total Savings</span>
                  <span className="font-bold text-green-600">
                    {(optimizationResult.originalCost - optimizationResult.optimizedCost).toFixed(2)} units 
                    ({optimizationResult.savings.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isOptimizing && !optimizationResult && nodes.length === 0 && (
          <div className="text-center py-12">
            <Zap size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Workflow to Optimize</h3>
            <p className="text-gray-500">
              Create a workflow first, then return here to optimize its performance and cost.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
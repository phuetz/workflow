import React, { useState } from 'react';
import {
  Activity, AlertCircle, AlertTriangle, Box, Clock, Database,
  Gauge, GitBranch, Info, Keyboard, Layers, Lightbulb,
  Maximize2, Minimize2, TrendingUp, X, XCircle, Zap
} from 'lucide-react';
import { useWorkflowPerformance } from '../../hooks/useWorkflowPerformance';

interface PerformanceMonitorPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PerformanceMonitorPanel: React.FC<PerformanceMonitorPanelProps> = ({ isOpen, onClose }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const metrics = useWorkflowPerformance(isOpen);

  if (!isOpen) return null;

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 75) return 'text-blue-600 dark:text-blue-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score: number): string => {
    if (score >= 90) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 75) return 'bg-blue-100 dark:bg-blue-900/30';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Poor';
  };

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Get metric status
  const getMetricStatus = (value: number, thresholds: { good: number; warning: number }): 'good' | 'warning' | 'danger' => {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.warning) return 'warning';
    return 'danger';
  };

  const statusColors = {
    good: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    warning: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
    danger: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
  };

  return (
    <div
      className={`fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[9998] transition-all duration-300 ${
        isMinimized ? 'w-72' : 'w-96'
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-white dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary-100 dark:bg-primary-900 rounded-lg">
              <Activity className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Performance Monitor
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Real-time metrics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              aria-label={isMinimized ? 'Maximize' : 'Minimize'}
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Performance Score */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Overall Performance
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${getScoreBg(metrics.score)}`}>
                {getScoreLabel(metrics.score)}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${getScoreColor(metrics.score)}`}>
                {metrics.score}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">/100</span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  metrics.score >= 90
                    ? 'bg-green-500'
                    : metrics.score >= 75
                    ? 'bg-blue-500'
                    : metrics.score >= 60
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${metrics.score}%` }}
              />
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5" />
              Real-time Metrics
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {/* FPS */}
              <div className={`p-2 rounded-lg ${statusColors[getMetricStatus(60 - metrics.render.fps, { good: 0, warning: 30 })]}`}>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">FPS</span>
                </div>
                <div className="text-xl font-bold mt-1">
                  {metrics.render.fps}
                </div>
              </div>

              {/* Render Time */}
              <div className={`p-2 rounded-lg ${statusColors[getMetricStatus(metrics.render.renderTime, { good: 16, warning: 33 })]}`}>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Render</span>
                </div>
                <div className="text-xl font-bold mt-1">
                  {metrics.render.renderTime.toFixed(0)}ms
                </div>
              </div>

              {/* Memory */}
              <div className={`p-2 rounded-lg ${statusColors[getMetricStatus(metrics.memory.percentage, { good: 50, warning: 70 })]}`}>
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Memory</span>
                </div>
                <div className="text-xl font-bold mt-1">
                  {formatBytes(metrics.memory.heapUsed)}
                </div>
              </div>

              {/* Complexity */}
              <div className={`p-2 rounded-lg ${statusColors[getMetricStatus(100 - metrics.complexity.score, { good: 20, warning: 40 })]}`}>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Complexity</span>
                </div>
                <div className="text-xl font-bold mt-1 capitalize">
                  {metrics.complexity.complexity}
                </div>
              </div>
            </div>

            {/* Additional stats */}
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Box className="w-3 h-3" />
                <span>{metrics.complexity.nodeCount} nodes</span>
              </div>
              <div className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                <span>{metrics.complexity.edgeCount} edges</span>
              </div>
              <div className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                <span>depth: {metrics.complexity.maxDepth}</span>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {metrics.warnings.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 max-h-32 overflow-y-auto">
              <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                Warnings ({metrics.warnings.length})
              </h4>
              <div className="space-y-1.5">
                {metrics.warnings.map((warning) => (
                  <div
                    key={warning.id}
                    className={`p-2 rounded-lg text-xs ${
                      warning.severity === 'high'
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        : warning.severity === 'medium'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      {warning.severity === 'high' ? (
                        <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      ) : warning.severity === 'medium' ? (
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      )}
                      <span className="flex-1">{warning.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {metrics.suggestions.length > 0 && (
            <div className="px-4 py-3 max-h-40 overflow-y-auto">
              <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-blue-500" />
                Optimization Suggestions
              </h4>
              <div className="space-y-1.5">
                {metrics.suggestions.slice(0, 3).map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                          {suggestion.message}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-300 mt-0.5">
                          Impact: +{suggestion.impact}% faster
                        </p>
                      </div>
                      <span className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 rounded text-xs font-medium">
                        +{suggestion.impact}%
                      </span>
                    </div>
                  </div>
                ))}
                {metrics.suggestions.length > 3 && (
                  <div className="text-center">
                    <button className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                      +{metrics.suggestions.length - 3} more suggestions
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Last update: {new Date(metrics.render.lastUpdate).toLocaleTimeString()}</span>
          <div className="flex items-center gap-1">
            <Keyboard className="w-3 h-3" />
            <span>Ctrl+Shift+P</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitorPanel;

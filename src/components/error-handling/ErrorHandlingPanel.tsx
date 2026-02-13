import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  Zap,
  XCircle,
  CheckCircle,
  Clock,
  Settings,
  TrendingUp,
  Activity,
  List,
  X,
  Play,
  Trash2,
  Download
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { CircuitBreaker, DeadLetterQueue, categorizeError, type ErrorCategory } from '../../utils/ErrorHandling';
import { SubWorkflowService } from '../../services/SubWorkflowService';
import type { SubWorkflow } from '../../types/subworkflows';

interface ErrorHandlingPanelProps {
  onClose?: () => void;
}

export const ErrorHandlingPanel: React.FC<ErrorHandlingPanelProps> = ({ onClose }) => {
  const { nodes, darkMode } = useWorkflowStore();
  const [activeTab, setActiveTab] = useState<'config' | 'monitoring' | 'dlq'>('config');
  const [errorWorkflows, setErrorWorkflows] = useState<SubWorkflow[]>([]);
  const [globalErrorWorkflow, setGlobalErrorWorkflow] = useState<string>('');
  const [nodeHandlers, setNodeHandlers] = useState<Map<string, string>>(new Map());
  const [circuitBreakers, setCircuitBreakers] = useState<Map<string, CircuitBreaker>>(new Map());
  const [deadLetterQueue] = useState(() => new DeadLetterQueue(1000));
  const [dlqStats, setDlqStats] = useState(deadLetterQueue.getStats());

  const subWorkflowService = SubWorkflowService.getInstance();

  // Load error workflows
  useEffect(() => {
    const loadErrorWorkflows = async () => {
      const workflows = await subWorkflowService.listSubWorkflows({
        tags: ['error-handling'],
        isPublished: true
      });
      setErrorWorkflows(workflows);
    };
    loadErrorWorkflows();
  }, []);

  // Update DLQ stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setDlqStats(deadLetterQueue.getStats());
    }, 5000);
    return () => clearInterval(interval);
  }, [deadLetterQueue]);

  const setNodeErrorHandler = (nodeId: string, workflowId: string) => {
    const newHandlers = new Map(nodeHandlers);
    if (workflowId) {
      newHandlers.set(nodeId, workflowId);
    } else {
      newHandlers.delete(nodeId);
    }
    setNodeHandlers(newHandlers);
  };

  const createCircuitBreaker = (nodeId: string) => {
    const breaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      monitoringPeriod: 300000
    });
    const newBreakers = new Map(circuitBreakers);
    newBreakers.set(nodeId, breaker);
    setCircuitBreakers(newBreakers);
  };

  const removeCircuitBreaker = (nodeId: string) => {
    const newBreakers = new Map(circuitBreakers);
    newBreakers.delete(nodeId);
    setCircuitBreakers(newBreakers);
  };

  const clearDLQ = () => {
    deadLetterQueue.clear();
    setDlqStats(deadLetterQueue.getStats());
  };

  const exportDLQ = () => {
    const items = deadLetterQueue.getAll();
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dead-letter-queue-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const bgColor = darkMode ? 'bg-gray-800' : 'bg-white';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const secondaryTextColor = darkMode ? 'text-gray-400' : 'text-gray-600';
  const inputBg = darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50`}>
      <div className={`${bgColor} ${textColor} rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${borderColor}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            <h2 className="text-2xl font-bold">Error Handling Configuration</h2>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className={`flex gap-2 px-6 pt-4 border-b ${borderColor}`}>
          {[
            { id: 'config', label: 'Configuration', icon: Settings },
            { id: 'monitoring', label: 'Monitoring', icon: Activity },
            { id: 'dlq', label: 'Dead Letter Queue', icon: List }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : `${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'} hover:bg-blue-400 hover:text-white`
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'config' && (
            <div className="space-y-6">
              {/* Global Error Workflow */}
              <div className={`p-4 rounded-lg border ${borderColor}`}>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Global Error Workflow
                </h3>
                <p className={`text-sm ${secondaryTextColor} mb-3`}>
                  This workflow will be executed when any node encounters an error (unless overridden by node-specific handlers)
                </p>
                <select
                  value={globalErrorWorkflow}
                  onChange={(e) => setGlobalErrorWorkflow(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${inputBg}`}
                >
                  <option value="">-- No global error handler --</option>
                  {errorWorkflows.map(workflow => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name} (v{workflow.version})
                    </option>
                  ))}
                </select>
              </div>

              {/* Node-Specific Error Handlers */}
              <div className={`p-4 rounded-lg border ${borderColor}`}>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-500" />
                  Node-Specific Error Handlers
                </h3>
                <p className={`text-sm ${secondaryTextColor} mb-4`}>
                  Configure custom error handling for individual nodes
                </p>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {nodes.map(node => (
                    <div key={node.id} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium">{node.data.label}</div>
                          <div className={`text-xs ${secondaryTextColor}`}>{node.data.type}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {circuitBreakers.has(node.id) ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-green-500 flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                Circuit Breaker Active
                              </span>
                              <button
                                onClick={() => removeCircuitBreaker(node.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => createCircuitBreaker(node.id)}
                              className="text-blue-500 hover:text-blue-700 text-xs flex items-center gap-1"
                            >
                              <Zap className="w-3 h-3" />
                              Add Circuit Breaker
                            </button>
                          )}
                        </div>
                      </div>

                      <select
                        value={nodeHandlers.get(node.id) || ''}
                        onChange={(e) => setNodeErrorHandler(node.id, e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
                      >
                        <option value="">-- Use global handler --</option>
                        {errorWorkflows.map(workflow => (
                          <option key={workflow.id} value={workflow.id}>
                            {workflow.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Retry Strategy Configuration */}
              <div className={`p-4 rounded-lg border ${borderColor}`}>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-purple-500" />
                  Default Retry Strategy
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Attempts</label>
                    <input type="number" defaultValue="3" min="1" max="10" className={`w-full px-3 py-2 border rounded-lg ${inputBg}`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Initial Delay (ms)</label>
                    <input type="number" defaultValue="1000" min="100" step="100" className={`w-full px-3 py-2 border rounded-lg ${inputBg}`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Backoff Type</label>
                    <select className={`w-full px-3 py-2 border rounded-lg ${inputBg}`}>
                      <option value="exponential">Exponential</option>
                      <option value="linear">Linear</option>
                      <option value="jitter">Jitter</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Delay (ms)</label>
                    <input type="number" defaultValue="30000" min="1000" step="1000" className={`w-full px-3 py-2 border rounded-lg ${inputBg}`} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              {/* Circuit Breaker Status */}
              <div className={`p-4 rounded-lg border ${borderColor}`}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Circuit Breakers Status
                </h3>

                {circuitBreakers.size === 0 ? (
                  <p className={secondaryTextColor}>No circuit breakers configured</p>
                ) : (
                  <div className="space-y-3">
                    {Array.from(circuitBreakers.entries()).map(([nodeId, breaker]) => {
                      const node = nodes.find(n => n.id === nodeId);
                      const state = breaker.getState();
                      const stats = breaker.getStats();

                      return (
                        <div key={nodeId} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">{node?.data.label || nodeId}</div>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              state.state === 'closed' ? 'bg-green-100 text-green-700' :
                              state.state === 'open' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {state.state.toUpperCase()}
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2 text-sm">
                            <div>
                              <div className={secondaryTextColor}>Failures</div>
                              <div className="font-medium">{stats.recentFailures}</div>
                            </div>
                            <div>
                              <div className={secondaryTextColor}>Successes</div>
                              <div className="font-medium">{stats.successCount}</div>
                            </div>
                            <div className="col-span-2">
                              <div className={secondaryTextColor}>Next Attempt</div>
                              <div className="font-medium text-xs">
                                {stats.nextAttempt || 'N/A'}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => breaker.reset()}
                            className="mt-2 text-sm text-blue-500 hover:text-blue-700"
                          >
                            Reset Circuit Breaker
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Error Statistics */}
              <div className={`p-4 rounded-lg border ${borderColor}`}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  Error Statistics
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(dlqStats.byCategory).map(([category, count]) => (
                    <div key={category} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                      <div className={`text-sm ${secondaryTextColor} mb-1`}>{category}</div>
                      <div className="text-2xl font-bold">{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dlq' && (
            <div className="space-y-6">
              {/* DLQ Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Dead Letter Queue</h3>
                  <p className={`text-sm ${secondaryTextColor}`}>
                    {dlqStats.totalItems} items • Oldest: {dlqStats.oldestItem?.toLocaleString() || 'N/A'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={exportDLQ}
                    disabled={dlqStats.totalItems === 0}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <button
                    onClick={clearDLQ}
                    disabled={dlqStats.totalItems === 0}
                    className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All
                  </button>
                </div>
              </div>

              {/* DLQ Items */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {dlqStats.totalItems === 0 ? (
                  <div className={`p-8 text-center ${darkMode ? 'bg-gray-750' : 'bg-gray-50'} rounded-lg`}>
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className={secondaryTextColor}>No failed operations in queue</p>
                  </div>
                ) : (
                  deadLetterQueue.getAll().map(item => (
                    <div key={item.id} className={`p-4 rounded-lg border ${borderColor} ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="font-medium">{item.error.message}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              item.category === 'transient' ? 'bg-yellow-100 text-yellow-700' :
                              item.category === 'permanent' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {item.category}
                            </span>
                          </div>
                          <div className={`text-xs ${secondaryTextColor}`}>
                            {new Date(item.timestamp).toLocaleString()} • {item.attemptCount} attempts
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            deadLetterQueue.remove(item.id);
                            setDlqStats(deadLetterQueue.getStats());
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {Object.keys(item.context).length > 0 && (
                        <details className="mt-2">
                          <summary className={`text-xs cursor-pointer ${secondaryTextColor} hover:text-blue-500`}>
                            View Context
                          </summary>
                          <pre className={`text-xs mt-2 p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} overflow-x-auto`}>
                            {JSON.stringify(item.context, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-3 p-6 border-t ${borderColor}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Close
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorHandlingPanel;

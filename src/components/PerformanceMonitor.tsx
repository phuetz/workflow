import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Activity, Cpu, HardDrive, Clock, TrendingUp, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface PerformanceMonitorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MetricData {
  timestamp: number;
  cpu: number;
  memory: number;
  latency: number;
  throughput: number;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ isOpen, onClose }) => {
  const { executionHistory, darkMode } = useWorkflowStore();
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'logs'>('overview');

  // Simulate real-time metrics
  useEffect(() => {
    const interval = setInterval(() => {
      const newMetric: MetricData = {
        timestamp: Date.now(),
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        latency: Math.random() * 200 + 50,
        throughput: Math.random() * 1000 + 500
      };
      
      setMetrics(prev => [...prev.slice(-19), newMetric]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const currentMetrics = metrics[metrics.length - 1] || {
    cpu: 0,
    memory: 0,
    latency: 0,
    throughput: 0
  };

  const getHealthColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value < thresholds.good) return 'text-green-600';
    if (value < thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const recentExecutions = executionHistory.slice(-10);
  const successRate = recentExecutions.length > 0 
    ? (recentExecutions.filter(e => e.status === 'completed').length / recentExecutions.length) * 100
    : 0;

  if (!isOpen) return null;

  return (
    <div
      className={`fixed right-4 top-20 w-96 rounded-lg shadow-xl border z-50 ${
        darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200'
      }`}
    >
      <div
        className={`flex items-center justify-between p-4 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Performance Monitor</h3>
        <button
          onClick={onClose}
          className={`${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
        >
          <X size={20} />
        </button>
      </div>

      <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? darkMode
                ? 'bg-gray-800 text-blue-300 border-b-2 border-blue-400'
                : 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : darkMode
                ? 'text-gray-300 hover:text-gray-100'
                : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Activity size={16} />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'metrics'
              ? darkMode
                ? 'bg-gray-800 text-blue-300 border-b-2 border-blue-400'
                : 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : darkMode
                ? 'text-gray-300 hover:text-gray-100'
                : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <TrendingUp size={16} />
          Metrics
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'logs'
              ? darkMode
                ? 'bg-gray-800 text-blue-300 border-b-2 border-blue-400'
                : 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : darkMode
                ? 'text-gray-300 hover:text-gray-100'
                : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <AlertTriangle size={16} />
          Logs
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} p-3 rounded-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <Cpu size={16} className="text-blue-500" />
                  <span className={`text-sm font-medium ${getHealthColor(currentMetrics.cpu, { good: 70, warning: 85 })}`}>
                    {currentMetrics.cpu.toFixed(1)}%
                  </span>
                </div>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>CPU Usage</div>
              </div>
              
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} p-3 rounded-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <HardDrive size={16} className="text-green-500" />
                  <span className={`text-sm font-medium ${getHealthColor(currentMetrics.memory, { good: 80, warning: 90 })}`}>
                    {currentMetrics.memory.toFixed(1)}%
                  </span>
                </div>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Memory Usage</div>
              </div>
              
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} p-3 rounded-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <Clock size={16} className="text-orange-500" />
                  <span className={`text-sm font-medium ${getHealthColor(currentMetrics.latency, { good: 100, warning: 150 })}`}>
                    {currentMetrics.latency.toFixed(0)}ms
                  </span>
                </div>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Latency</div>
              </div>
              
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} p-3 rounded-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp size={16} className="text-purple-500" />
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}` }>
                    {currentMetrics.throughput.toFixed(0)}
                  </span>
                </div>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Throughput/min</div>
              </div>
            </div>

            <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} p-3 rounded-lg`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Success Rate</span>
                <span className={`text-sm font-medium ${successRate >= 95 ? 'text-green-600' : successRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {successRate.toFixed(1)}%
                </span>
              </div>
              <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    successRate >= 95 ? 'bg-green-500' : successRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${successRate}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>System Health</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>API</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle size={12} className="text-green-500" />
                    <span className="text-xs text-green-600">Online</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Database</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle size={12} className="text-green-500" />
                    <span className="text-xs text-green-600">Connected</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Queue</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle size={12} className="text-green-500" />
                    <span className="text-xs text-green-600">Processing</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="p-4">
            <div className="space-y-4">
              {metrics.length > 0 && (
                <div className="space-y-2">
                  <div className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Real-time Metrics</div>
                  <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} p-2 rounded text-xs font-mono`}>
                    {metrics.slice(-5).map((metric, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{new Date(metric.timestamp).toLocaleTimeString()}</span>
                        <span>CPU: {metric.cpu.toFixed(1)}%</span>
                        <span>MEM: {metric.memory.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <div className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Recent Executions</div>
                <div className="space-y-1">
                  {recentExecutions.map((execution) => (
                    <div key={execution.id} className="flex items-center justify-between text-xs">
                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{execution.workflowId}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        execution.status === 'completed' ? 'bg-green-100 text-green-800' :
                        execution.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {execution.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="p-4">
            <div className="space-y-2">
              <div className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>System Logs</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-green-500" />
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Workflow execution completed</span>
                  <span className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} ml-auto`}>2m ago</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={12} className="text-yellow-500" />
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>High memory usage detected</span>
                  <span className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} ml-auto`}>5m ago</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-green-500" />
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Database connection restored</span>
                  <span className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} ml-auto`}>8m ago</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
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
  const { darkMode } = useWorkflowStore();
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'logs'>('overview');

  // Simulated metrics (in production, these would come from real monitoring)
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const newMetric: MetricData = {
        timestamp: Date.now(),
        cpu: Math.random() * 100,
        memory: 50 + Math.random() * 30,
        latency: 10 + Math.random() * 50,
        throughput: 100 + Math.random() * 400
      };
      
      setMetrics(prev => [...prev.slice(-19), newMetric]);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const currentMetrics = metrics[metrics.length - 1] || {
    cpu: 0,
    memory: 0,
    latency: 0,
    throughput: 0
  };

  const getMetricColor = (value: number, type: 'cpu' | 'memory' | 'latency' | 'throughput') => {
    const thresholds = {
      cpu: { good: 50, warning: 75 },
      memory: { good: 60, warning: 80 },
      latency: { good: 30, warning: 50 },
      throughput: { good: 200, warning: 100 }
    };

    const threshold = thresholds[type];
    if (type === 'throughput') {
      if (value > threshold.good) return 'text-green-600';
      if (value > threshold.warning) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (value < threshold.good) return 'text-green-600';
      if (value < threshold.warning) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed right-4 top-20 w-96 rounded-lg shadow-xl border z-50 ${
        darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold">Performance Monitor</h3>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        {(['overview', 'metrics', 'logs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? darkMode
                  ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400'
                  : 'bg-gray-50 text-blue-600 border-b-2 border-blue-600'
                : darkMode
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {activeTab === 'overview' && (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">CPU Usage</span>
                  <Cpu className="w-4 h-4 text-gray-400" />
                </div>
                <div className={`text-2xl font-bold ${getMetricColor(currentMetrics.cpu, 'cpu')}`}>
                  {currentMetrics.cpu.toFixed(1)}%
                </div>
              </div>

              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Memory</span>
                  <HardDrive className="w-4 h-4 text-gray-400" />
                </div>
                <div className={`text-2xl font-bold ${getMetricColor(currentMetrics.memory, 'memory')}`}>
                  {currentMetrics.memory.toFixed(1)}%
                </div>
              </div>

              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Latency</span>
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
                <div className={`text-2xl font-bold ${getMetricColor(currentMetrics.latency, 'latency')}`}>
                  {currentMetrics.latency.toFixed(0)}ms
                </div>
              </div>

              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Throughput</span>
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                </div>
                <div className={`text-2xl font-bold ${getMetricColor(currentMetrics.throughput, 'throughput')}`}>
                  {currentMetrics.throughput.toFixed(0)}/s
                </div>
              </div>
            </div>

            {/* Status Indicators */}
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <h4 className="font-medium mb-3">System Status</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Server</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-500">Healthy</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-500">Connected</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Queue</span>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs text-yellow-500">High Load</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'metrics' && (
          <div className="space-y-4">
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <h4 className="font-medium mb-3">Performance Trends</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg Response Time</span>
                  <span className="font-medium">23ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Request Rate</span>
                  <span className="font-medium">342 req/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Error Rate</span>
                  <span className="font-medium text-green-600">0.02%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Active Connections</span>
                  <span className="font-medium">127</span>
                </div>
              </div>
            </div>

            {/* Simple chart visualization */}
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <h4 className="font-medium mb-3">CPU History (Last 20s)</h4>
              <div className="flex items-end justify-between h-20 gap-1">
                {metrics.map((metric, i) => (
                  <div
                    key={i}
                    className={`flex-1 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} rounded-t`}
                    style={{ height: `${metric.cpu}%` }}
                    title={`${metric.cpu.toFixed(1)}%`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-2">
            <div className={`p-2 rounded text-xs font-mono ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <span className="text-gray-500">[12:34:56]</span> Workflow execution started
            </div>
            <div className={`p-2 rounded text-xs font-mono ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <span className="text-gray-500">[12:34:57]</span> Node "trigger" completed
            </div>
            <div className={`p-2 rounded text-xs font-mono ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <span className="text-yellow-500">[12:34:58]</span> High memory usage detected
            </div>
            <div className={`p-2 rounded text-xs font-mono ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <span className="text-gray-500">[12:34:59]</span> Cache cleared successfully
            </div>
            <div className={`p-2 rounded text-xs font-mono ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <span className="text-green-500">[12:35:00]</span> Workflow completed
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
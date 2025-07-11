import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Activity, Cpu, HardDrive, Zap, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function PerformanceMonitor() {
  const { darkMode } = useWorkflowStore();
  const [isOpen, setIsOpen] = useState(false);
  const [metrics, setMetrics] = useState({
    cpu: 0,
    memory: 0,
    executions: 0,
    latency: 0,
    errors: 0
  });
  const [history, setHistory] = useState<any[]>([]);

  // Simulation des métriques en temps réel
  useEffect(() => {
    const interval = setInterval(() => {
      const newMetrics = {
        cpu: Math.floor(Math.random() * 50) + 20,
        memory: Math.floor(Math.random() * 40) + 30,
        executions: Math.floor(Math.random() * 20) + 5,
        latency: Math.floor(Math.random() * 200) + 50,
        errors: Math.floor(Math.random() * 3),
        timestamp: new Date().toISOString()
      };
      
      setMetrics(newMetrics);
      setHistory(prev => [...prev.slice(-19), newMetrics]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (value: number, thresholds: [number, number]) => {
    if (value < thresholds[0]) return 'text-green-500';
    if (value < thresholds[1]) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <>
      {/* Performance Monitor Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 z-40 p-3 rounded-full ${
          darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
        } shadow-lg border transition-colors`}
      >
        <Activity size={20} />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
      </button>

      {/* Performance Panel */}
      {isOpen && (
        <div className={`fixed bottom-20 right-4 z-30 w-96 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border rounded-lg shadow-xl overflow-hidden`}>
          {/* Header */}
          <div className={`p-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} border-b`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center space-x-2">
                <Activity size={16} />
                <span>Performance Monitor</span>
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Real-time Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <Cpu size={14} />
                  <span className="text-sm font-medium">CPU</span>
                </div>
                <div className={`text-lg font-bold ${getStatusColor(metrics.cpu, [50, 80])}`}>
                  {metrics.cpu}%
                </div>
              </div>

              <div className={`p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <HardDrive size={14} />
                  <span className="text-sm font-medium">Memory</span>
                </div>
                <div className={`text-lg font-bold ${getStatusColor(metrics.memory, [60, 85])}`}>
                  {metrics.memory}%
                </div>
              </div>

              <div className={`p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <Zap size={14} />
                  <span className="text-sm font-medium">Exec/min</span>
                </div>
                <div className="text-lg font-bold text-blue-500">
                  {metrics.executions}
                </div>
              </div>

              <div className={`p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <TrendingUp size={14} />
                  <span className="text-sm font-medium">Latency</span>
                </div>
                <div className={`text-lg font-bold ${getStatusColor(metrics.latency, [100, 200])}`}>
                  {metrics.latency}ms
                </div>
              </div>
            </div>

            {/* Performance Chart */}
            <div>
              <h4 className="font-medium text-sm mb-2">CPU Usage (Last 20 samples)</h4>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <XAxis dataKey="timestamp" hide />
                    <YAxis hide />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                      formatter={(value) => [`${value}%`, 'CPU']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cpu" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* System Health */}
            <div>
              <h4 className="font-medium text-sm mb-2">System Health</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Workflow Engine</span>
                  <span className="text-green-500">● Online</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Database</span>
                  <span className="text-green-500">● Connected</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>External APIs</span>
                  <span className="text-yellow-500">● Degraded</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Queue System</span>
                  <span className="text-green-500">● Healthy</span>
                </div>
              </div>
            </div>

            {/* Recent Events */}
            <div>
              <h4 className="font-medium text-sm mb-2">Recent Events</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Workflow executed successfully</span>
                  <span className="text-gray-400 ml-auto">2s ago</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>New node added</span>
                  <span className="text-gray-400 ml-auto">1m ago</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>High memory usage detected</span>
                  <span className="text-gray-400 ml-auto">3m ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
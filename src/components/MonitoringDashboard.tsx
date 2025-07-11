import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';

export default function MonitoringDashboard() {
  const { 
    executionHistory, 
    executionStats, 
    workflows, 
    nodes, 
    edges,
    darkMode,
    executionLogs,
    addLog
  } = useWorkflowStore();

  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [timeRange, setTimeRange] = useState('24h');
  const [realTimeData, setRealTimeData] = useState<any[]>([]);

  // Simulation de données en temps réel
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const newDataPoint = {
        timestamp: now.toISOString(),
        executions: Math.floor(Math.random() * 10) + 5,
        errors: Math.floor(Math.random() * 3),
        avgTime: Math.floor(Math.random() * 1000) + 500,
        cpu: Math.floor(Math.random() * 30) + 20,
        memory: Math.floor(Math.random() * 40) + 30,
      };
      
      setRealTimeData(prev => [...prev.slice(-29), newDataPoint]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Métriques calculées
  const metrics = {
    totalExecutions: executionStats.totalExecutions || 0,
    successRate: executionStats.totalExecutions > 0 
      ? Math.round((executionStats.successfulExecutions / executionStats.totalExecutions) * 100) 
      : 0,
    avgExecutionTime: Math.round(executionStats.averageExecutionTime || 0),
    errorRate: executionStats.totalExecutions > 0 
      ? Math.round(((executionStats.totalExecutions - executionStats.successfulExecutions) / executionStats.totalExecutions) * 100) 
      : 0,
    activeWorkflows: Object.keys(workflows).length,
    totalNodes: nodes.length,
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const executionData = executionHistory.slice(0, 10).map(exec => ({
    name: new Date(exec.timestamp).toLocaleDateString(),
    executions: 1,
    success: exec.status === 'success' ? 1 : 0,
    errors: exec.status === 'error' ? 1 : 0,
    duration: exec.duration || 0
  }));

  const nodeTypeData = Object.entries(executionStats.nodeStats || {}).map(([type, count]) => ({
    name: type,
    value: count
  }));

  const performanceData = realTimeData.map(point => ({
    time: new Date(point.timestamp).toLocaleTimeString(),
    cpu: point.cpu,
    memory: point.memory,
    executions: point.executions
  }));

  const errorData = executionHistory
    .filter(exec => exec.status === 'error')
    .slice(0, 10)
    .map(exec => ({
      time: new Date(exec.timestamp).toLocaleTimeString(),
      errors: exec.errors?.length || 1,
      workflow: exec.workflowId
    }));

  const MetricCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          {trend > 0 ? (
            <TrendingUp className="text-green-500" size={16} />
          ) : (
            <TrendingDown className="text-red-500" size={16} />
          )}
          <span className={`ml-2 text-sm ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {Math.abs(trend)}%
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'} min-h-screen`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Monitoring Dashboard</h1>
            <p className="text-gray-500 mt-2">Real-time workflow performance and analytics</p>
          </div>
          <div className="flex space-x-2">
            {['overview', 'performance', 'errors', 'analytics'].map(metric => (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedMetric === metric
                    ? 'bg-blue-500 text-white'
                    : darkMode 
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {metric.charAt(0).toUpperCase() + metric.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Executions"
            value={metrics.totalExecutions}
            icon={Activity}
            color="bg-blue-500"
            trend={12}
          />
          <MetricCard
            title="Success Rate"
            value={`${metrics.successRate}%`}
            icon={CheckCircle}
            color="bg-green-500"
            trend={5}
          />
          <MetricCard
            title="Avg Duration"
            value={`${metrics.avgExecutionTime}ms`}
            icon={Clock}
            color="bg-yellow-500"
            trend={-8}
          />
          <MetricCard
            title="Error Rate"
            value={`${metrics.errorRate}%`}
            icon={AlertTriangle}
            color="bg-red-500"
            trend={-3}
          />
        </div>

        {/* Dashboard Content */}
        {selectedMetric === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <h3 className="text-lg font-semibold mb-4">Execution Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="executions" stroke="#8884d8" fill="#8884d8" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <h3 className="text-lg font-semibold mb-4">Node Type Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={nodeTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {nodeTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {selectedMetric === 'performance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <h3 className="text-lg font-semibold mb-4">System Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="cpu" stroke="#8884d8" name="CPU %" />
                  <Line type="monotone" dataKey="memory" stroke="#82ca9d" name="Memory %" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <h3 className="text-lg font-semibold mb-4">Execution Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={executionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="duration" fill="#8884d8" name="Duration (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {selectedMetric === 'errors' && (
          <div className="space-y-6">
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <h3 className="text-lg font-semibold mb-4">Error Analysis</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={errorData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="errors" fill="#ef4444" name="Errors" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <h3 className="text-lg font-semibold mb-4">Recent Errors</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {executionHistory
                  .filter(exec => exec.status === 'error')
                  .slice(0, 10)
                  .map((exec, index) => (
                    <div key={index} className="p-3 bg-red-100 text-red-800 rounded">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Workflow: {exec.workflowId}</span>
                        <span className="text-sm">
                          {new Date(exec.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1">
                        Execution failed after {exec.duration}ms
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {selectedMetric === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <h3 className="text-lg font-semibold mb-4">Workflow Analytics</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Active Workflows</span>
                  <span className="font-bold">{metrics.activeWorkflows}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Nodes</span>
                  <span className="font-bold">{metrics.totalNodes}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Connections</span>
                  <span className="font-bold">{edges.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate</span>
                  <span className={`font-bold ${metrics.successRate > 90 ? 'text-green-500' : 'text-yellow-500'}`}>
                    {metrics.successRate}%
                  </span>
                </div>
              </div>
            </div>

            <div className={`col-span-2 p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <h3 className="text-lg font-semibold mb-4">Usage Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={executionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="executions" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Real-time Status */}
        <div className={`mt-8 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">System Status</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm">All systems operational</span>
              </div>
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Activity, Users, Zap, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const { workflows, executionHistory, nodes, edges, darkMode } = useWorkflowStore();

  const stats = {
    totalWorkflows: Object.keys(workflows).length,
    totalExecutions: executionHistory.length,
    successRate: executionHistory.length > 0 
      ? Math.round((executionHistory.filter(e => e.status === 'success').length / executionHistory.length) * 100)
      : 0,
    activeNodes: nodes.length
  };

  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'} min-h-screen`}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="text-white" size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Total Workflows</p>
                <p className="text-2xl font-bold">{stats.totalWorkflows}</p>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Total Executions</p>
                <p className="text-2xl font-bold">{stats.totalExecutions}</p>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-white" size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Success Rate</p>
                <p className="text-2xl font-bold">{stats.successRate}%</p>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <Users className="text-white" size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Active Nodes</p>
                <p className="text-2xl font-bold">{stats.activeNodes}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className={`rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm p-6`}>
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {executionHistory.slice(0, 5).map((execution, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    execution.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="font-medium">Workflow Execution</span>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(execution.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
            {executionHistory.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Activity className="mx-auto mb-2" size={24} />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
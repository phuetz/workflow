/**
 * Dashboard Component
 * REFACTORED: Utilise SharedPatterns et StrictTypes
 */

import React, { useMemo } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { Activity, Users, Zap, CheckCircle } from 'lucide-react';
import { withSyncErrorHandling, memoize } from '../../utils/SharedPatterns';
import { 
  UnknownObject,
  PerformanceMetrics,
  isNumber
} from '../../types/StrictTypes';

interface DashboardStats {
  totalWorkflows: number;
  totalExecutions: number;
  successRate: number;
  activeNodes: number;
}

interface ExecutionItem {
  status: 'success' | 'error' | 'pending';
  timestamp: string | Date;
  workflowId?: string;
  duration?: number;
}

interface StatsCardProps {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  color: string;
  darkMode: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, title, value, color, darkMode }) => {
  return (
    <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="flex items-center">
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
};

const ActivityItem: React.FC<{
  execution: ExecutionItem;
  darkMode: boolean;
  index: number;
}> = ({ execution, darkMode, index }) => {
  const statusColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    pending: 'bg-yellow-500'
  };

  const statusIcons = {
    success: '✓',
    error: '✗',
    pending: '⏳'
  };

  const formatTimestamp = (timestamp: string | Date): string => {
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg ${
        darkMode ? 'bg-gray-700' : 'bg-gray-50'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div
          className={`w-4 h-4 rounded-full flex items-center justify-center ${
            statusColors[execution.status]
          }`}
          aria-label={`Execution ${execution.status}`}
          title={`Execution ${execution.status}`}
        >
          <span className="text-white text-xs font-bold">
            {statusIcons[execution.status]}
          </span>
        </div>
        <span className="font-medium">
          Workflow Execution {execution.workflowId ? `#${execution.workflowId}` : `#${index + 1}`}
        </span>
      </div>
      <div className="flex items-center space-x-4">
        {isNumber(execution.duration) && (
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {execution.duration}ms
          </span>
        )}
        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {formatTimestamp(execution.timestamp)}
        </span>
      </div>
    </div>
  );
};

// Memoize stats calculation
const calculateStats = memoize((
  workflows: UnknownObject,
  executionHistory: ExecutionItem[],
  nodesCount: number
): DashboardStats => {
  const totalWorkflows = Object.keys(workflows).length;
  const totalExecutions = executionHistory.length;
  
  const successCount = executionHistory.filter(e => e.status === 'success').length;
  const successRate = totalExecutions > 0 
    ? Math.round((successCount / totalExecutions) * 100)
    : 0;

  return {
    totalWorkflows,
    totalExecutions,
    successRate,
    activeNodes: nodesCount
  };
});

export default function Dashboard() {
  const { workflows, executionHistory, nodes, darkMode } = useWorkflowStore();

  // Calculate stats with memoization
  const stats = useMemo(
    () => calculateStats(workflows, executionHistory as ExecutionItem[], nodes.length),
    [workflows, executionHistory, nodes.length]
  );

  // Get recent executions
  const recentExecutions = useMemo(
    () => (executionHistory as ExecutionItem[]).slice(0, 5),
    [executionHistory]
  );

  // Render with error handling
  const renderContent = () => {
    return (
      <div className={`p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'} min-h-screen`}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              icon={<Zap className="text-white" size={24} />}
              title="Total Workflows"
              value={stats.totalWorkflows}
              color="bg-blue-500"
              darkMode={darkMode}
            />
            
            <StatsCard
              icon={<Activity className="text-white" size={24} />}
              title="Total Executions"
              value={stats.totalExecutions}
              color="bg-green-500"
              darkMode={darkMode}
            />
            
            <StatsCard
              icon={<CheckCircle className="text-white" size={24} />}
              title="Success Rate"
              value={`${stats.successRate}%`}
              color="bg-purple-500"
              darkMode={darkMode}
            />
            
            <StatsCard
              icon={<Users className="text-white" size={24} />}
              title="Active Nodes"
              value={stats.activeNodes}
              color="bg-orange-500"
              darkMode={darkMode}
            />
          </div>

          {/* Recent Activity */}
          <div className={`rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm p-6`}>
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            
            {recentExecutions.length > 0 ? (
              <div className="space-y-4">
                {recentExecutions.map((execution, index) => (
                  <ActivityItem
                    key={`execution-${index}`}
                    execution={execution}
                    darkMode={darkMode}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No recent activity to display
              </div>
            )}
          </div>

          {/* Performance Metrics (if available) */}
          {stats.totalExecutions > 0 && (
            <div className={`mt-8 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm p-6`}>
              <h2 className="text-xl font-semibold mb-4">Performance Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Average Execution Time</p>
                  <p className="text-lg font-semibold">
                    {Math.round(
                      recentExecutions
                        .filter(e => isNumber(e.duration))
                        .reduce((acc, e) => acc + (e.duration || 0), 0) / 
                      recentExecutions.filter(e => isNumber(e.duration)).length || 0
                    )}ms
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Error Rate</p>
                  <p className="text-lg font-semibold">
                    {100 - stats.successRate}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Throughput</p>
                  <p className="text-lg font-semibold">
                    {Math.round(stats.totalExecutions / Math.max(1, recentExecutions.length))} exec/hour
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Wrap render in error handling
  return withSyncErrorHandling(
    renderContent,
    {
      operation: 'renderDashboard',
      module: 'Dashboard'
    },
    <div className="p-6 text-center">
      <p className="text-red-500">Failed to load dashboard</p>
    </div>
  ) as React.ReactElement;
}
/**
 * User Analytics Dashboard
 * Displays user-specific workflow ownership and usage analytics
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, AlertCircle, BarChart3, Clock, Layers, Loader2,
  Play, Puzzle, Star, TrendingDown, TrendingUp, User,
  Users
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { analyticsService } from '../../backend/services/analyticsService';
import { logger } from '../../services/SimpleLogger';

interface UserAnalyticsProps {
  userId?: string;
  isAdminView?: boolean;
}

interface UserOwnershipData {
  ownedWorkflows: number;
  collaboratingWorkflows: number;
  totalWorkflows: number;
  workflowsByStatus: Record<string, number>;
  creationTrend: Array<{ date: string; count: number }>;
  executionStats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
  };
  mostActiveWorkflows: Array<{
    workflowId: string;
    executionCount: number;
    lastExecuted: Date;
  }>;
  mostUsedNodes: Array<{
    nodeType: string;
    count: number;
    category: string;
  }>;
}

export default function UserAnalyticsDashboard({
  userId = 'current-user',
  isAdminView = false
}: UserAnalyticsProps) {
  const { darkMode } = useWorkflowStore();
  const [loading, setLoading] = useState(true);
  const [ownershipData, setOwnershipData] = useState<UserOwnershipData | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'workflows' | 'nodes' | 'activity'>('overview');

  // Use isAdminView for potential admin-specific features
  const canViewAllUsers = isAdminView;

  // Load user ownership analytics
  useEffect(() => {
    loadUserAnalytics();
  }, [userId, selectedTimeframe]);

  const loadUserAnalytics = async () => {
    try {
      setLoading(true);

      const data = analyticsService.getUserWorkflowOwnership(userId);

      // Map nodeUsageStats to mostUsedNodes for compatibility
      const formattedData: UserOwnershipData = {
        ...data,
        totalWorkflows: data.ownedWorkflows + data.collaboratingWorkflows,
        mostUsedNodes: data.nodeUsageStats || []
      };

      setOwnershipData(formattedData);

      logger.info('Loaded user analytics', {
        userId,
        ownedWorkflows: formattedData.ownedWorkflows,
        totalExecutions: formattedData.executionStats.totalExecutions
      });
    } catch (error) {
      logger.error('Failed to load user analytics', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate derived metrics
  const calculateMetrics = () => {
    if (!ownershipData) return null;

    const successRate = ownershipData.executionStats.totalExecutions > 0
      ? (ownershipData.executionStats.successfulExecutions / ownershipData.executionStats.totalExecutions) * 100
      : 0;

    const categoryBreakdown = ownershipData.mostUsedNodes.reduce((acc, node) => {
      acc[node.category] = (acc[node.category] || 0) + node.count;
      return acc;
    }, {} as Record<string, number>);

    const topCategory = Object.entries(categoryBreakdown)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

    const totalWorkflows = ownershipData.totalWorkflows || 1;
    const avgExecutionsPerWorkflow = totalWorkflows > 0
      ? ownershipData.executionStats.totalExecutions / totalWorkflows
      : 0;

    return {
      successRate,
      totalWorkflows: ownershipData.totalWorkflows,
      topCategory,
      avgExecutionsPerWorkflow,
      categoryBreakdown,
      mostUsedCategory: categoryBreakdown
    };
  };

  const derivedMetrics = calculateMetrics();

  // Render metric card
  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    color: string;
    trend?: number;
  }> = ({ title, value, subtitle, icon: Icon, color, trend }) => (
    <div className={`p-6 rounded-lg border ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white ${color}`}>
          <Icon size={24} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-sm ${
            trend >= 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {trend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span className="ml-1">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold mb-1">{value}</h3>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-400">{subtitle}</p>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (!ownershipData || !derivedMetrics) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
        <p className="text-gray-500">No analytics data available for this user</p>
      </div>
    );
  }

  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">User Workflow Analytics</h2>
            <p className="text-sm text-gray-500 mt-1">
              Detailed analytics for user: {userId}
            </p>
          </div>
          
          {/* Timeframe selector */}
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as '7d' | '30d' | '90d')}
            className={`px-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'workflows', label: 'Workflows', icon: Layers },
          { id: 'nodes', label: 'Node Usage', icon: Puzzle },
          { id: 'activity', label: 'Activity', icon: Activity }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'overview' | 'workflows' | 'nodes' | 'activity')}
            className={`flex items-center space-x-2 px-4 py-2 font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Owned Workflows"
              value={ownershipData.ownedWorkflows}
              icon={Layers}
              color="bg-blue-500"
            />
            <MetricCard
              title="Total Executions"
              value={ownershipData.executionStats.totalExecutions}
              icon={Play}
              color="bg-green-500"
            />
            <MetricCard
              title="Success Rate"
              value={`${derivedMetrics.successRate.toFixed(1)}%`}
              icon={TrendingUp}
              color="bg-purple-500"
            />
            <MetricCard
              title="Avg Execution Time"
              value={`${ownershipData.executionStats.averageExecutionTime.toFixed(0)}ms`}
              icon={Clock}
              color="bg-orange-500"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workflow Status Distribution */}
            <div className={`p-6 rounded-lg border ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h3 className="text-lg font-semibold mb-4">Workflow Status Distribution</h3>
              <div className="space-y-3">
                {Object.entries(ownershipData.workflowsByStatus).map(([status, count]) => (
                  <div key={status}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm capitalize">{status}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          status === 'active' ? 'bg-green-500' :
                          status === 'draft' ? 'bg-yellow-500' : 'bg-gray-500'
                        }`}
                        style={{
                          width: `${(count / ownershipData.ownedWorkflows) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Execution Statistics */}
            <div className={`p-6 rounded-lg border ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h3 className="text-lg font-semibold mb-4">Execution Statistics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Successful</span>
                  <span className="text-sm font-medium text-green-500">
                    {ownershipData.executionStats.successfulExecutions}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Failed</span>
                  <span className="text-sm font-medium text-red-500">
                    {ownershipData.executionStats.failedExecutions}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Avg per Workflow</span>
                  <span className="text-sm font-medium">
                    {derivedMetrics.avgExecutionsPerWorkflow.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflows Tab */}
      {activeTab === 'workflows' && (
        <div className="space-y-6">
          {/* Most Active Workflows */}
          <div className={`rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Most Active Workflows</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Workflow ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Executions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Last Executed
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  darkMode ? 'divide-gray-700' : 'divide-gray-200'
                }`}>
                  {ownershipData.mostActiveWorkflows.map((workflow, index) => (
                    <tr key={workflow.workflowId}>
                      <td className="px-6 py-4 text-sm font-medium">
                        {workflow.workflowId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {workflow.executionCount}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(workflow.lastExecuted).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Creation Trend */}
          <div className={`p-6 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h3 className="text-lg font-semibold mb-4">Workflow Creation Trend</h3>
            <div className="h-64 flex items-center justify-center text-gray-500">
              Chart showing creation trend over time would go here
            </div>
          </div>
        </div>
      )}

      {/* Nodes Tab */}
      {activeTab === 'nodes' && (
        <div className="space-y-6">
          {/* Node Usage Statistics */}
          <div className={`p-6 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h3 className="text-lg font-semibold mb-4">Most Used Node Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ownershipData.mostUsedNodes.slice(0, 9).map((node, index) => (
                <div
                  key={node.nodeType}
                  className={`p-4 rounded-lg border ${
                    darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{node.nodeType}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {node.category}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${(node.count / ownershipData.mostUsedNodes[0].count) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                    <span className="ml-3 text-sm font-semibold">{node.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Distribution */}
          <div className={`p-6 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h3 className="text-lg font-semibold mb-4">Node Category Usage</h3>
            <div className="space-y-3">
              {Object.entries(derivedMetrics.categoryBreakdown).map(([category, count]) => (
                <div key={category}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm capitalize">{category}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{
                        width: `${(count / Math.max(...Object.values(derivedMetrics.categoryBreakdown))) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          {/* Activity Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Favorite Category"
              value={derivedMetrics.topCategory}
              icon={Star}
              color="bg-yellow-500"
            />
            <MetricCard
              title="Avg Executions/Workflow"
              value={derivedMetrics.avgExecutionsPerWorkflow.toFixed(1)}
              icon={BarChart3}
              color="bg-indigo-500"
            />
            <MetricCard
              title="Total Workflows"
              value={derivedMetrics.totalWorkflows}
              subtitle={`${ownershipData.ownedWorkflows} owned, ${ownershipData.collaboratingWorkflows} shared`}
              icon={Users}
              color="bg-cyan-500"
            />
          </div>

          {/* Recent Activity */}
          <div className={`p-6 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
            <div className="text-center py-8 text-gray-500">
              Activity timeline visualization would go here
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

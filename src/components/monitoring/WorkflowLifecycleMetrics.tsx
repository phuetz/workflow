/**
 * Workflow Lifecycle Metrics Dashboard
 * Displays comprehensive analytics about workflow creation, updates, execution, and deletion
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, Archive, BarChart3, Layers, Loader2, TrendingDown,
  TrendingUp
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { analyticsService } from '../../backend/services/analyticsService';
import { workflowRepository } from '../../backend/database/workflowRepository';
import { logger } from '../../services/SimpleLogger';
// import { config } from '../config/environment';

interface WorkflowLifecycleStats {
  totalWorkflows: number;
  activeWorkflows: number;
  archivedWorkflows: number;
  totalExecutions: number;
  successRate: number;
  averageLifespan: number;
  creationTrend: Array<{ date: string; count: number }>;
  deletionTrend: Array<{ date: string; count: number }>;
  executionTrend: Array<{ date: string; count: number }>;
}

interface WorkflowDetails {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  lastExecuted?: Date;
  deletedAt?: Date;
  executionCount: number;
  successRate: number;
  nodeCount: number;
}

// Mock execution monitoring service
const executionMonitoringService = {
  getWorkflowMetrics: async (workflowId: string, _options?: any) => {
    return {
      metrics: {},
      nodeMetrics: {},
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0
    };
  }
};

export default function WorkflowLifecycleMetrics() {
  const darkMode = useWorkflowStore((state) => state.darkMode);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'workflows' | 'archived'>('overview');
  const [lifecycleStats, setLifecycleStats] = useState<WorkflowLifecycleStats | null>(null);
  const [workflowsList, setWorkflowsList] = useState<WorkflowDetails[]>([]);
  const [archivedWorkflows, setArchivedWorkflows] = useState<WorkflowDetails[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [workflowMetrics, setWorkflowMetrics] = useState<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
  } | null>(null);

  // Calculate time range dates
  const timeRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    
    switch (selectedTimeRange) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    
    return { start, end };
  }, [selectedTimeRange]);

  // Calculate trend from data points
  const calculateTrend = (dataPoints: any[]) => {
    if (!dataPoints || dataPoints.length === 0) return [];
    return dataPoints.map(point => ({
      date: point.date || new Date().toLocaleDateString(),
      count: point.count || 0
    }));
  };

  // Load lifecycle statistics
  useEffect(() => {
    loadLifecycleStats();
  }, [timeRange]);

  // Load lifecycle statistics
  const loadLifecycleStats = async () => {
    try {
      setLoading(true);

      // Get workflow statistics
      const stats = await workflowRepository.getStatistics();

      // Mock report data (getReport doesn't exist on analyticsService)
      const report = {
        events: [],
        summary: {
          totalExecutions: stats.totalExecutions || 0,
          successfulExecutions: 0 // Not available in stats
        }
      };

      // Mock archived workflows (getArchivedWorkflows doesn't exist)
      const archivedList: any[] = [];

      // Process trends
      const creationTrend = processCreationTrend(report);
      const deletionTrend = processDeletionTrend(archivedList);
      const executionTrend = processExecutionTrend(report);

      setLifecycleStats({
        totalWorkflows: stats.total,
        activeWorkflows: stats.active,
        archivedWorkflows: archivedList.length,
        totalExecutions: stats.totalExecutions,
        successRate: calculateSuccessRate(report),
        averageLifespan: calculateAverageLifespan(archivedList),
        creationTrend,
        deletionTrend,
        executionTrend
      });

      logger.info('Loaded workflow lifecycle statistics', {
        totalWorkflows: stats.total,
        timeRange: selectedTimeRange
      });
    } catch (error) {
      logger.error('Failed to load lifecycle statistics', error);
    } finally {
      setLoading(false);
    }
  };

  // Load workflows list
  const loadWorkflows = async () => {
    try {
      const { workflows } = await workflowRepository.findByUser('current-user', {
        limit: 100
      });
      
      const workflowDetails: WorkflowDetails[] = await Promise.all(
        workflows.map(async (workflow) => {
          
          return {
            id: workflow.id,
            name: workflow.name,
            status: workflow.status,
            createdAt: workflow.createdAt,
            lastExecuted: workflow.statistics.lastExecutedAt,
            executionCount: workflow.statistics.totalExecutions,
            successRate: workflow.statistics.totalExecutions > 0
              ? (workflow.statistics.successfulExecutions / workflow.statistics.totalExecutions) * 100
              : 0,
            nodeCount: workflow.nodes.length
          };
        })
      );
      
      setWorkflowsList(workflowDetails);
    } catch (error) {
      logger.error('Failed to load workflows', error);
    }
  };

  // Load archived workflows
  const loadArchivedWorkflows = async () => {
    try {
      // Mock archived workflows (getArchivedWorkflows doesn't exist)
      const archivedList: any[] = [];

      const archivedDetails: WorkflowDetails[] = await Promise.all(
        archivedList.map(async (archived) => {
          const result = await executionMonitoringService.getWorkflowMetrics(
            archived.workflowId,
            { includeNodeMetrics: true }
          );

          return {
            id: archived.workflowId,
            name: `Archived Workflow ${archived.workflowId}`,
            status: 'archived',
            createdAt: new Date(), // Would need to be stored in archive
            deletedAt: archived.archivedAt,
            executionCount: archived.totalExecutions,
            successRate: archived.successRate,
            nodeCount: Object.keys(result.nodeMetrics || {}).length
          };
        })
      );

      setArchivedWorkflows(archivedDetails);
    } catch (error) {
      logger.error('Failed to load archived workflows', error);
    }
  };

  // Load specific workflow metrics
  const loadWorkflowMetrics = async (workflowId: string, isArchived: boolean = false) => {
    try {
      let metrics;

      if (isArchived) {
        const result = await executionMonitoringService.getWorkflowMetrics(workflowId, {
          includeNodeMetrics: true,
          includeErrorDistribution: true
        });
        metrics = {
          totalExecutions: result.totalExecutions,
          successfulExecutions: result.successfulExecutions,
          failedExecutions: result.failedExecutions,
          averageExecutionTime: result.averageExecutionTime
        };
      } else {
        // Mock metrics since getWorkflowMetrics doesn't exist on analyticsService
        metrics = {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          averageExecutionTime: 0
        };
      }

      setWorkflowMetrics(metrics);
      setSelectedWorkflow(workflowId);
    } catch (error) {
      logger.error('Failed to load workflow metrics', error);
    }
  };

  // Process creation trend from events
  const processCreationTrend = (report: any) => {
    const trend: Record<string, number> = {};
    
    // Filter creation events from recent events
    const creationEvents = (report.events || []).filter(
      (event: any) => event.type === 'workflow_created' && 
               event.timestamp >= timeRange.start && 
               event.timestamp <= timeRange.end
    );
    
    creationEvents.forEach((event: any) => {
      const date = new Date(event.timestamp).toLocaleDateString();
      trend[date] = (trend[date] || 0) + 1;
    });
    
    return Object.entries(trend)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Process deletion trend from archived workflows
  const processDeletionTrend = (archivedList: any[]) => {
    const trend: Record<string, number> = {};
    
    archivedList.forEach(archived => {
      const date = new Date(archived.archivedAt).toLocaleDateString();
      trend[date] = (trend[date] || 0) + 1;
    });
    
    return Object.entries(trend)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Process execution trend
  const processExecutionTrend = (report: any) => {
    const trend: Record<string, number> = {};
    
    // Filter execution events from recent events
    const executionEvents = (report.events || []).filter(
      (event: any) => event.type === 'workflow_start' && 
               event.timestamp >= timeRange.start && 
               event.timestamp <= timeRange.end
    );
    
    executionEvents.forEach((event: any) => {
      const date = new Date(event.timestamp).toLocaleDateString();
      trend[date] = (trend[date] || 0) + 1;
    });
    
    return Object.entries(trend)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Calculate overall success rate
  const calculateSuccessRate = (report: any) => {
    if (!report?.summary?.totalExecutions || report.summary.totalExecutions === 0) return 0;
    return (report.summary.successfulExecutions / report.summary.totalExecutions) * 100;
  };

  // Calculate average workflow lifespan
  const calculateAverageLifespan = (archivedList: any[]) => {
    if (archivedList.length === 0) return 0;
    
    // This would need creation date to be stored in archive
    // For now, return a placeholder
    return 30; // days
  };

  // Load data based on active tab
  useEffect(() => {
    switch (activeTab) {
      case 'workflows':
        loadWorkflows();
        break;
      case 'archived':
        loadArchivedWorkflows();
        break;
    }
  }, [activeTab, timeRange]);

  // Render metric card
  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: number;
    color: string;
  }> = ({ title, value, icon: Icon, trend, color }) => (
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
      <p className="text-sm text-gray-500">{title}</p>
    </div>
  );

  // Render workflow row
  const WorkflowRow: React.FC<{
    workflow: WorkflowDetails;
    isArchived?: boolean;
  }> = ({ workflow, isArchived = false }) => (
    <tr
      onClick={() => loadWorkflowMetrics(workflow.id, isArchived)}
      className={`cursor-pointer transition-colors ${
        darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
      } ${selectedWorkflow === workflow.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
    >
      <td className="px-6 py-4">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-3 ${
            workflow.status === 'active' ? 'bg-green-500' :
            workflow.status === 'archived' ? 'bg-gray-400' :
            'bg-yellow-500'
          }`} />
          <span className="font-medium">{workflow.name}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-sm">{workflow.status}</td>
      <td className="px-6 py-4 text-sm">
        {new Date(workflow.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 text-sm">
        {workflow.deletedAt ? new Date(workflow.deletedAt).toLocaleDateString() : '-'}
      </td>
      <td className="px-6 py-4 text-sm">{workflow.executionCount}</td>
      <td className="px-6 py-4 text-sm">
        <div className="flex items-center">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${workflow.successRate}%` }}
            />
          </div>
          <span>{workflow.successRate.toFixed(1)}%</span>
        </div>
      </td>
      <td className="px-6 py-4 text-sm">{workflow.nodeCount}</td>
    </tr>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Workflow Lifecycle Metrics</h2>
            <p className="text-sm text-gray-500 mt-1">
              Track workflow creation, execution, and archival patterns
            </p>
          </div>
          
          {/* Time range selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as '7d' | '30d' | '90d' | '1y')}
            className={`px-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'workflows', label: 'Active Workflows', icon: Activity },
          { id: 'archived', label: 'Archived Workflows', icon: Archive }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'overview' | 'workflows' | 'archived')}
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
      {activeTab === 'overview' && lifecycleStats && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Workflows"
              value={lifecycleStats.totalWorkflows}
              icon={Layers}
              color="bg-blue-500"
            />
            <MetricCard
              title="Active Workflows"
              value={lifecycleStats.activeWorkflows}
              icon={Activity}
              color="bg-green-500"
            />
            <MetricCard
              title="Archived Workflows"
              value={lifecycleStats.archivedWorkflows}
              icon={Archive}
              color="bg-gray-500"
            />
            <MetricCard
              title="Success Rate"
              value={`${lifecycleStats.successRate.toFixed(1)}%`}
              icon={TrendingUp}
              color="bg-purple-500"
            />
          </div>

          {/* Charts would go here */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Execution Trend Chart */}
            <div className={`p-6 rounded-lg border ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h3 className="text-lg font-semibold mb-4">Execution Trend</h3>
              <div className="h-64 flex items-center justify-center text-gray-500">
                Chart visualization would go here
              </div>
            </div>

            {/* Lifecycle Distribution */}
            <div className={`p-6 rounded-lg border ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h3 className="text-lg font-semibold mb-4">Workflow Lifecycle</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Active</span>
                    <span className="text-sm font-medium">
                      {lifecycleStats.activeWorkflows}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${(lifecycleStats.activeWorkflows / lifecycleStats.totalWorkflows) * 100}%`
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Archived</span>
                    <span className="text-sm font-medium">
                      {lifecycleStats.archivedWorkflows}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gray-500 h-2 rounded-full"
                      style={{
                        width: `${(lifecycleStats.archivedWorkflows / lifecycleStats.totalWorkflows) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflows Tab */}
      {activeTab === 'workflows' && (
        <div className="space-y-4">
          <div className={`overflow-hidden rounded-lg border ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Workflow
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Last Executed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Executions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Nodes
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                darkMode ? 'divide-gray-700 bg-gray-900' : 'divide-gray-200 bg-white'
              }`}>
                {workflowsList.map(workflow => (
                  <WorkflowRow key={workflow.id} workflow={workflow} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Selected workflow metrics */}
          {selectedWorkflow && workflowMetrics && (
            <div className={`p-6 rounded-lg border ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h3 className="text-lg font-semibold mb-4">Workflow Metrics Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Executions</span>
                  <p className="font-semibold">{workflowMetrics.totalExecutions}</p>
                </div>
                <div>
                  <span className="text-gray-500">Successful</span>
                  <p className="font-semibold text-green-500">
                    {workflowMetrics.successfulExecutions}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Failed</span>
                  <p className="font-semibold text-red-500">
                    {workflowMetrics.failedExecutions}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Avg. Execution Time</span>
                  <p className="font-semibold">
                    {workflowMetrics.averageExecutionTime.toFixed(2)}ms
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Archived Tab */}
      {activeTab === 'archived' && (
        <div className="space-y-4">
          <div className={`overflow-hidden rounded-lg border ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Workflow
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Archived
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Executions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Nodes
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                darkMode ? 'divide-gray-700 bg-gray-900' : 'divide-gray-200 bg-white'
              }`}>
                {archivedWorkflows.map(workflow => (
                  <WorkflowRow key={workflow.id} workflow={workflow} isArchived />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
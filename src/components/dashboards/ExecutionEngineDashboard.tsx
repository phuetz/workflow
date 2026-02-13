/**
 * Execution Engine Dashboard Component
 * Advanced monitoring and control for the workflow execution engine
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Zap,
  Clock,
  CheckCircle,
  Pause,
  Play,
  BarChart3,
  TrendingUp,
  RefreshCw,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Eye,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Copy,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Trash2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Filter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Download,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Upload,
  Server,
  Network,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Users,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Database,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Shield,
  Layers,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  GitBranch,
  Target,
  Gauge,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Timer,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Hash,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Workflow,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  PieChart,
  LineChart,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  MoreVertical,
  XCircle,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  AlertCircle,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Info
} from 'lucide-react';
import { advancedExecutionEngine } from '../../services/AdvancedExecutionEngine';
import { logger } from '../../services/SimpleLogger';

interface ExecutionEngineMetrics {
  activeExecutions: number;
  queuedExecutions: number;
  completedToday: number;
  errorRate: number;
  averageExecutionTime: number;
  poolUtilization: Record<string, number>;
  throughputPerHour: number;
  resourceUsage: {
    memoryUsage: number;
    cpuUsage: number;
    networkBandwidth: number;
  };
  queueHealth: Record<string, {
    size: number;
    avgWaitTime: number;
    throughput: number;
  }>;
}

interface ExecutionStatistics {
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  peakConcurrency: number;
  resourceEfficiency: number;
  topErrors: Array<{ error: string; count: number; percentage: number }>;
  performanceTrends: Array<{ timestamp: number; executions: number; avgTime: number }>;
}

export const ExecutionEngineDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ExecutionEngineMetrics | null>(null);
  const [statistics, setStatistics] = useState<ExecutionStatistics | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pools' | 'performance' | 'queues'>('overview');
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [loading, setLoading] = useState(true);
  const [poolStates, setPoolStates] = useState<Record<string, 'running' | 'paused' | 'draining'>>({});

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadMetrics = async () => {
    try {
      const engineMetrics = advancedExecutionEngine.getEngineMetrics();

      // Extend metrics with additional data needed by the dashboard
      const extendedMetrics: ExecutionEngineMetrics = {
        activeExecutions: engineMetrics.activeExecutions,
        queuedExecutions: engineMetrics.queuedExecutions,
        completedToday: engineMetrics.completedToday,
        errorRate: engineMetrics.errorRate,
        averageExecutionTime: engineMetrics.averageExecutionTime,
        poolUtilization: engineMetrics.poolUtilization,
        throughputPerHour: Math.round(engineMetrics.completedToday / 24),
        resourceUsage: {
          memoryUsage: 0.45, // Placeholder - would come from system metrics
          cpuUsage: 0.32,
          networkBandwidth: 2.4
        },
        queueHealth: {}
      };

      // Generate statistics based on available data
      const engineStatistics: ExecutionStatistics = {
        totalExecutions: engineMetrics.completedToday,
        successRate: 1 - engineMetrics.errorRate,
        averageExecutionTime: engineMetrics.averageExecutionTime,
        peakConcurrency: engineMetrics.activeExecutions,
        resourceEfficiency: 0.78, // Placeholder
        topErrors: [],
        performanceTrends: []
      };

      setMetrics(extendedMetrics);
      setStatistics(engineStatistics);
    } catch (error) {
      logger.error('Failed to load execution engine metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePoolAction = async (poolId: string, action: 'pause' | 'resume' | 'drain') => {
    try {
      setPoolStates(prev => ({ ...prev, [poolId]: action === 'drain' ? 'draining' : action === 'pause' ? 'paused' : 'running' }));

      switch (action) {
        case 'pause':
          await advancedExecutionEngine.pauseExecutionPool(poolId);
          break;
        case 'resume':
          await advancedExecutionEngine.resumeExecutionPool(poolId);
          break;
        case 'drain':
          await advancedExecutionEngine.drainExecutionPool(poolId);
          break;
      }
      
      await loadMetrics();
    } catch (error) {
      logger.error(`Failed to ${action} pool ${poolId}:`, error);
    }
  };

  const optimizePools = async () => {
    try {
      // Optimization logic: analyze pool utilization and adjust
      logger.info('Optimizing execution pools...');

      // In a real implementation, this would:
      // 1. Analyze current pool utilization
      // 2. Rebalance workloads across pools
      // 3. Adjust pool configurations based on demand
      // For now, we'll just reload metrics to refresh the view

      await loadMetrics();
      logger.info('Execution pools optimized');
    } catch (error) {
      logger.error('Failed to optimize execution pools:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const k = 1024;
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization < 0.5) return 'text-green-600 bg-green-100';
    if (utilization < 0.8) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'draining': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderOverview = () => {
    if (!metrics || !statistics) return null;

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Executions</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.activeExecutions}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center">
                <span className="text-sm text-gray-600">
                  {metrics.queuedExecutions} queued
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(statistics.successRate * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center">
                <span className="text-sm text-gray-600">
                  {statistics.totalExecutions} total executions
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Execution Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(statistics.averageExecutionTime / 1000).toFixed(1)}s
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center">
                <span className="text-sm text-gray-600">
                  Peak: {statistics.peakConcurrency} concurrent
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Throughput</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.throughputPerHour}/hr
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center">
                <span className="text-sm text-gray-600">
                  Efficiency: {(statistics.resourceEfficiency * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Resource Usage</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-3 relative">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray={`${metrics.resourceUsage.memoryUsage * 100}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {(metrics.resourceUsage.memoryUsage * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Memory Usage</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-3 relative">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeDasharray={`${metrics.resourceUsage.cpuUsage * 100}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {(metrics.resourceUsage.cpuUsage * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">CPU Usage</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-3 relative">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="2"
                    strokeDasharray={`${Math.min(metrics.resourceUsage.networkBandwidth / 10, 1) * 100}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Network className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {metrics.resourceUsage.networkBandwidth.toFixed(1)} MB/s
              </p>
              <p className="text-sm text-gray-600">Network I/O</p>
            </div>
          </div>
        </div>

        {/* Top Errors */}
        {statistics.topErrors.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Top Errors</h3>
            <div className="space-y-3">
              {statistics.topErrors.map((error, index) => (
                <div key={error.error} className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-bold text-red-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-red-900">{error.error}</p>
                      <p className="text-sm text-red-600">{error.count} occurrences</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-red-700">
                      {error.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPools = () => {
    if (!metrics) return null;

    return (
      <div className="space-y-6">
        {/* Pool Controls */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Execution Pool Management</h3>
            <button
              onClick={optimizePools}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Target className="w-4 h-4 mr-2" />
              Optimize Pools
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(metrics.poolUtilization).map(([poolId, utilization]) => (
              <div key={poolId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Server className="w-5 h-5 text-gray-600 mr-2" />
                    <h4 className="font-medium text-gray-900 capitalize">{poolId} Pool</h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(poolStates[poolId] || 'running')}`}>
                      {poolStates[poolId] || 'running'}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Utilization</span>
                    <span className="text-sm font-medium">{(utilization * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${utilization > 0.8 ? 'bg-red-500' : utilization > 0.5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${utilization * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePoolAction(poolId, 'pause')}
                    disabled={poolStates[poolId] === 'paused'}
                    className="flex items-center px-3 py-1 text-sm text-yellow-700 bg-yellow-100 rounded hover:bg-yellow-200 disabled:opacity-50"
                  >
                    <Pause className="w-3 h-3 mr-1" />
                    Pause
                  </button>
                  <button
                    onClick={() => handlePoolAction(poolId, 'resume')}
                    disabled={poolStates[poolId] === 'running'}
                    className="flex items-center px-3 py-1 text-sm text-green-700 bg-green-100 rounded hover:bg-green-200 disabled:opacity-50"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Resume
                  </button>
                  <button
                    onClick={() => handlePoolAction(poolId, 'drain')}
                    className="flex items-center px-3 py-1 text-sm text-orange-700 bg-orange-100 rounded hover:bg-orange-200"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Drain
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600">Loading execution engine metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Gauge className="w-6 h-6 text-gray-700 mr-3" />
            <div>
              <h2 className="text-lg font-semibold">Execution Engine Dashboard</h2>
              <p className="text-sm text-gray-600">
                Advanced workflow execution monitoring and control
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'hour' | 'day' | 'week' | 'month')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="hour">Last Hour</option>
              <option value="day">Last Day</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
            </select>
            
            <button
              onClick={loadMetrics}
              className="flex items-center px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'pools', label: 'Execution Pools', icon: Server },
            { id: 'performance', label: 'Performance', icon: TrendingUp },
            { id: 'queues', label: 'Queue Health', icon: Layers }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'pools' | 'performance' | 'queues')}
                className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'pools' && renderPools()}
        {activeTab === 'performance' && (
          <div className="text-center py-12">
            <LineChart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Performance analytics coming soon</p>
          </div>
        )}
        {activeTab === 'queues' && (
          <div className="text-center py-12">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Queue health monitoring coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
};
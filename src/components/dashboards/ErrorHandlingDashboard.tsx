/**
 * Advanced Error Handling Dashboard
 * Comprehensive error monitoring, recovery management, and system health oversight
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Shield,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Filter,
  Search,
  Eye,
  Target,
  BarChart3,
  Network,
  RotateCcw,
  Bug,
  Wrench,
  Heart,
  Code,
  Hash
} from 'lucide-react';
import { errorHandlingService } from '../../services/ErrorHandlingService';
import type {
  WorkflowError,
  ErrorDashboard,
  ErrorPattern,
  CircuitBreaker,
  HealthCheck,
  FaultToleranceMetrics,
  ErrorSeverity,
  ErrorCategory,
  HealthStatus,
  CircuitBreakerState
} from '../../types/errorHandling';
import { logger } from '../../services/SimpleLogger';

interface ErrorHandlingDashboardProps {
  workflowId?: string;
  onClose?: () => void;
}

export const ErrorHandlingDashboard: React.FC<ErrorHandlingDashboardProps> = ({
  workflowId,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'errors' | 'recovery' | 'health' | 'patterns'>('overview');
  const [dashboard, setDashboard] = useState<ErrorDashboard | null>(null);
  const [errors, setErrors] = useState<WorkflowError[]>([]);
  const [patterns, setPatterns] = useState<ErrorPattern[]>([]);
  const [metrics, setMetrics] = useState<FaultToleranceMetrics | null>(null);
  const [circuitBreakers, setCircuitBreakers] = useState<CircuitBreaker[]>([]);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filterSeverity, setFilterSeverity] = useState<ErrorSeverity[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filterCategory, setFilterCategory] = useState<ErrorCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadDashboardData = useCallback(async () => {
    try {
      const startTime = new Date();
      const endTime = new Date();

      switch (timeRange) {
        case '1h':
          startTime.setHours(startTime.getHours() - 1);
          break;
        case '24h':
          startTime.setDate(startTime.getDate() - 1);
          break;
        case '7d':
          startTime.setDate(startTime.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(startTime.getDate() - 30);
          break;
      }

      const [dashboardData, errorsData, patternsData, metricsData] = await Promise.all([
        errorHandlingService.getErrorDashboard({ start: startTime, end: endTime }),
        errorHandlingService.getErrors({ 
          workflowId, 
          timeRange: { start: startTime, end: endTime },
          limit: 100 
        }),
        errorHandlingService.detectErrorPatterns(),
        errorHandlingService.getMetrics(workflowId)
      ]);

      setDashboard(dashboardData);
      setErrors(errorsData);
      setPatterns(patternsData);
      setMetrics(metricsData);

      // Mock circuit breakers and health checks data
      setCircuitBreakers([
        {
          id: 'cb-api-1',
          name: 'External API Circuit Breaker',
          state: 'closed',
          failureThreshold: 5,
          successThreshold: 3,
          timeout: 60000,
          halfOpenMaxCalls: 3,
          metrics: {
            totalCalls: 1250,
            successfulCalls: 1190,
            failedCalls: 60,
            consecutiveFailures: 1,
            averageResponseTime: 245,
            lastSuccessTime: new Date(Date.now() - 30000),
            lastFailureTime: new Date(Date.now() - 120000)
          },
          lastStateChange: new Date(Date.now() - 3600000),
          config: {
            enabled: true,
            slidingWindowSize: 100,
            minimumNumberOfCalls: 10,
            slowCallDurationThreshold: 5000,
            slowCallRateThreshold: 0.5,
            automaticTransitionFromOpenToHalfOpenEnabled: true,
            waitDurationInOpenState: 60000
          }
        }
      ]);

      setHealthChecks([
        {
          id: 'hc-system',
          name: 'System Health',
          status: 'healthy',
          interval: 30000,
          timeout: 5000,
          retries: 3,
          lastCheck: new Date(),
          lastSuccess: new Date(Date.now() - 30000),
          consecutiveFailures: 0,
          metrics: {
            uptime: 99.9,
            availability: 99.8,
            averageResponseTime: 120,
            totalChecks: 2880,
            successfulChecks: 2874,
            failedChecks: 6
          }
        },
        {
          id: 'hc-database',
          name: 'Database Health',
          status: 'degraded',
          interval: 60000,
          timeout: 10000,
          retries: 3,
          lastCheck: new Date(),
          lastSuccess: new Date(Date.now() - 60000),
          lastFailure: new Date(Date.now() - 30000),
          consecutiveFailures: 1,
          metrics: {
            uptime: 98.5,
            availability: 98.2,
            averageResponseTime: 450,
            totalChecks: 1440,
            successfulChecks: 1414,
            failedChecks: 26
          }
        }
      ]);

    } catch (error) {
      logger.error('Failed to load error handling dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [workflowId, timeRange]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical': return 'text-red-800 bg-red-100 border-red-200';
      case 'fatal': return 'text-red-900 bg-red-200 border-red-300';
      case 'high': return 'text-orange-800 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-800 bg-blue-100 border-blue-200';
      default: return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  };

  const getHealthStatusColor = (status: HealthStatus) => {
    switch (status) {
      case 'healthy': return 'text-green-800 bg-green-100';
      case 'degraded': return 'text-yellow-800 bg-yellow-100';
      case 'unhealthy': return 'text-red-800 bg-red-100';
      case 'unknown': return 'text-gray-800 bg-gray-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  const getCircuitBreakerStateColor = (state: CircuitBreakerState) => {
    switch (state) {
      case 'closed': return 'text-green-800 bg-green-100';
      case 'open': return 'text-red-800 bg-red-100';
      case 'half_open': return 'text-yellow-800 bg-yellow-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  const renderOverview = () => {
    if (!dashboard || !metrics) return null;

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Errors</p>
                <p className="text-2xl font-bold text-gray-900">{dashboard.summary.totalErrors}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                <span className="text-sm text-gray-600">
                  {dashboard.summary.errorRate.toFixed(1)}/hr
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recovery Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboard.summary.recoveryRate.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-gray-600">
                  {metrics.recoveredErrors} recovered
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(dashboard.summary.averageResolutionTime / 1000).toFixed(1)}s
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center">
                <RotateCcw className="w-4 h-4 text-blue-500 mr-1" />
                <span className="text-sm text-gray-600">Auto recovery</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                dashboard.summary.systemHealth === 'healthy' ? 'bg-green-100' :
                dashboard.summary.systemHealth === 'degraded' ? 'bg-yellow-100' :
                dashboard.summary.systemHealth === 'unhealthy' ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                <Heart className={`w-6 h-6 ${
                  dashboard.summary.systemHealth === 'healthy' ? 'text-green-600' :
                  dashboard.summary.systemHealth === 'degraded' ? 'text-yellow-600' :
                  dashboard.summary.systemHealth === 'unhealthy' ? 'text-red-600' : 'text-gray-600'
                }`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">System Health</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {dashboard.summary.systemHealth}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center">
                <Activity className="w-4 h-4 text-purple-500 mr-1" />
                <span className="text-sm text-gray-600">All systems</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Errors by Severity</h3>
            <div className="space-y-3">
              {Object.entries(dashboard.errorsBySeverity).map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      severity === 'critical' || severity === 'fatal' ? 'bg-red-500' :
                      severity === 'high' ? 'bg-orange-500' :
                      severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-900 capitalize">{severity}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-bold text-gray-900 mr-2">{count}</span>
                    <div className="w-20 h-2 bg-gray-200 rounded-full">
                      <div 
                        className={`h-2 rounded-full ${
                          severity === 'critical' || severity === 'fatal' ? 'bg-red-500' :
                          severity === 'high' ? 'bg-orange-500' :
                          severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${(count / dashboard.summary.totalErrors) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Errors by Category</h3>
            <div className="space-y-3">
              {Object.entries(dashboard.errorsByCategory).slice(0, 5).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                      {category === 'network' && <Network className="w-4 h-4 text-gray-600" />}
                      {category === 'authentication' && <Shield className="w-4 h-4 text-gray-600" />}
                      {category === 'timeout' && <Clock className="w-4 h-4 text-gray-600" />}
                      {category === 'rate_limit' && <Target className="w-4 h-4 text-gray-600" />}
                      {!['network', 'authentication', 'timeout', 'rate_limit'].includes(category) && 
                        <Bug className="w-4 h-4 text-gray-600" />}
                    </div>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {category.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Errors */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Most Common Errors</h3>
          <div className="space-y-3">
            {dashboard.topErrors.slice(0, 5).map((error, index) => (
              <div key={error.code} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-bold text-red-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{error.code}</p>
                    <p className="text-sm text-gray-600 truncate max-w-md">{error.message}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{error.count}</p>
                    <p className="text-xs text-gray-500">{error.percentage.toFixed(1)}%</p>
                  </div>
                  <div className="flex items-center">
                    {error.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
                    {error.trend === 'down' && <TrendingDown className="w-4 h-4 text-green-500" />}
                    {error.trend === 'stable' && <div className="w-4 h-4 bg-gray-300 rounded-full"></div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recovery Strategies Performance */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recovery Strategy Performance</h3>
          <div className="space-y-3">
            {dashboard.recoveryStrategies.map((strategy) => (
              <div key={strategy.strategyId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <Wrench className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{strategy.name}</p>
                    <p className="text-sm text-gray-600">{strategy.usageCount} attempts</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">{strategy.successRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">success rate</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">{strategy.averageTime.toFixed(0)}ms</p>
                    <p className="text-xs text-gray-500">avg time</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderErrors = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Error List</h3>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search errors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="flex items-center px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </button>
            <button className="flex items-center px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Error List */}
      <div className="space-y-3">
        {errors.slice(0, 20).map((error) => (
          <div key={error.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  error.severity === 'critical' || error.severity === 'fatal' ? 'bg-red-100' :
                  error.severity === 'high' ? 'bg-orange-100' :
                  error.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${
                    error.severity === 'critical' || error.severity === 'fatal' ? 'text-red-600' :
                    error.severity === 'high' ? 'text-orange-600' :
                    error.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                  }`} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">{error.code}</span>
                    <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(error.severity)}`}>
                      {error.severity}
                    </span>
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded capitalize">
                      {error.category.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-2">{error.message}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {error.timestamp.toLocaleString()}
                    </div>
                    {error.workflowId && (
                      <div className="flex items-center">
                        <Hash className="w-4 h-4 mr-1" />
                        Workflow: {error.workflowId.slice(0, 8)}...
                      </div>
                    )}
                    {error.nodeId && (
                      <div className="flex items-center">
                        <Code className="w-4 h-4 mr-1" />
                        Node: {error.nodeId}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {error.recoverable && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                    Recoverable
                  </span>
                )}
                {error.retryable && (
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    Retryable
                  </span>
                )}
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderHealth = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">System Health Overview</h3>
        <p className="text-sm text-gray-600">Monitor component health and circuit breakers</p>
      </div>

      {/* Health Checks */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold mb-4">Health Checks</h4>
        <div className="space-y-4">
          {healthChecks.map((check) => (
            <div key={check.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${getHealthStatusColor(check.status)}`}>
                  {check.status === 'healthy' && <CheckCircle className="w-5 h-5" />}
                  {check.status === 'degraded' && <AlertCircle className="w-5 h-5" />}
                  {check.status === 'unhealthy' && <XCircle className="w-5 h-5" />}
                  {check.status === 'unknown' && <RefreshCw className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{check.name}</p>
                  <p className="text-sm text-gray-600">
                    Last check: {check.lastCheck.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{check.metrics.availability.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">availability</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{check.metrics.averageResponseTime}ms</p>
                  <p className="text-xs text-gray-500">avg response</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{check.consecutiveFailures}</p>
                  <p className="text-xs text-gray-500">failures</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Circuit Breakers */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold mb-4">Circuit Breakers</h4>
        <div className="space-y-4">
          {circuitBreakers.map((breaker) => (
            <div key={breaker.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${getCircuitBreakerStateColor(breaker.state)}`}>
                  {breaker.state === 'closed' && <CheckCircle className="w-5 h-5" />}
                  {breaker.state === 'open' && <XCircle className="w-5 h-5" />}
                  {breaker.state === 'half_open' && <AlertCircle className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{breaker.name}</p>
                  <p className="text-sm text-gray-600 capitalize">
                    State: {breaker.state.replace('_', ' ')}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {((breaker.metrics.successfulCalls / breaker.metrics.totalCalls) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">success rate</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{breaker.metrics.averageResponseTime}ms</p>
                  <p className="text-xs text-gray-500">avg response</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{breaker.metrics.consecutiveFailures}</p>
                  <p className="text-xs text-gray-500">failures</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPatterns = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Error Patterns</h3>
        <p className="text-sm text-gray-600">Detected patterns and recommendations</p>
      </div>

      {patterns.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No error patterns detected</p>
          <p className="text-sm text-gray-500">This is a good sign! Your system is running smoothly.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {patterns.map((pattern) => (
            <div key={pattern.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                    <Target className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{pattern.name}</h4>
                    <p className="text-sm text-gray-600">{pattern.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {pattern.frequency} occurrences • Last seen: {pattern.lastSeen.toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(pattern.severity)}`}>
                  {pattern.severity}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Common Causes</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {pattern.commonCauses.map((cause, index) => (
                      <li key={index} className="flex items-center">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></div>
                        {cause}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Recommended Actions</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {pattern.recommendedActions.map((action, index) => (
                      <li key={index} className="flex items-center">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <h5 className="font-medium text-gray-900 mb-2">Prevention Tips</h5>
                <div className="flex flex-wrap gap-2">
                  {pattern.preventionTips.map((tip, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      {tip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600">Loading error handling dashboard...</p>
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
            <Shield className="w-6 h-6 text-gray-700 mr-3" />
            <div>
              <h2 className="text-lg font-semibold">Error Handling & Recovery</h2>
              <p className="text-sm text-gray-600">
                Advanced error management, recovery strategies, and system health
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '1h' | '24h' | '7d' | '30d')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            
            <button
              onClick={loadDashboardData}
              className="flex items-center px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 p-2"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'errors', label: 'Errors', icon: AlertTriangle, count: errors.length },
            { id: 'recovery', label: 'Recovery', icon: RefreshCw },
            { id: 'health', label: 'Health', icon: Heart },
            { id: 'patterns', label: 'Patterns', icon: Target, count: patterns.length }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'errors' | 'recovery' | 'health' | 'patterns')}
                className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'errors' && renderErrors()}
        {activeTab === 'recovery' && (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Recovery management interface coming soon</p>
          </div>
        )}
        {activeTab === 'health' && renderHealth()}
        {activeTab === 'patterns' && renderPatterns()}
      </div>
    </div>
  );
};
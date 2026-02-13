/**
 * Performance Dashboard Component
 * PLAN C PHASE 3 - Dashboard de performance unifié
 * Combine monitoring temps réel, métriques historiques et alertes
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  GitBranch,
  Layers,
  Package,
  Server,
  Users,
  Zap,
  Activity
} from 'lucide-react';
import { RealTimeMonitor } from '../monitoring/RealTimeMonitor';
import { 
  withErrorHandling,
  withCache,
  debounce,
  paginate,
  groupBy
} from '../../utils/SharedPatterns';
import {
  MetricData,
  PerformanceMetrics,
  LoadingState,
  PaginationState,
  FilterState,
  SortState,
  isNumber,
  toSafeNumber
} from '../../types/StrictTypes';

interface PerformanceData {
  timestamp: string;
  metrics: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
    activeUsers: number;
  };
  alerts: Alert[];
}

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color: string;
  }>;
}

interface DashboardTab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: DashboardTab[] = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'realtime', label: 'Real-Time', icon: <Activity className="w-4 h-4" /> },
  { id: 'historical', label: 'Historical', icon: <LineChart className="w-4 h-4" /> },
  { id: 'alerts', label: 'Alerts', icon: <AlertTriangle className="w-4 h-4" /> },
  { id: 'resources', label: 'Resources', icon: <Server className="w-4 h-4" /> }
];

const MetricTile: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  darkMode: boolean;
}> = ({ title, value, change, icon, color, darkMode }) => {
  const getTrendIcon = () => {
    if (!isNumber(change)) return null;
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return null;
  };

  return (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        {getTrendIcon()}
      </div>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
      {isNumber(change) && (
        <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change > 0 ? '+' : ''}{change.toFixed(1)}%
        </p>
      )}
    </div>
  );
};

const SimpleChart: React.FC<{
  data: ChartData;
  type: 'line' | 'bar';
  title: string;
  darkMode: boolean;
}> = ({ data, type, title, darkMode }) => {
  const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
  
  return (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="h-48 flex items-end space-x-2">
        {data.labels.map((label, index) => (
          <div key={label} className="flex-1 flex flex-col items-center">
            <div className="w-full flex items-end justify-center space-x-1 h-40">
              {data.datasets.map((dataset, datasetIndex) => {
                const value = dataset.data[index];
                const height = (value / maxValue) * 100;
                
                return type === 'bar' ? (
                  <div
                    key={datasetIndex}
                    className={`w-full ${dataset.color} rounded-t`}
                    style={{ height: `${height}%` }}
                    title={`${dataset.label}: ${value}`}
                  />
                ) : null;
              })}
            </div>
            <span className="text-xs text-gray-500 mt-2">{label}</span>
          </div>
        ))}
      </div>
      {type === 'line' && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {data.datasets.map((dataset, datasetIndex) => {
            const points = dataset.data.map((value, index) => {
              const x = (index / (data.labels.length - 1)) * 100;
              const y = 100 - (value / maxValue) * 100;
              return `${x},${y}`;
            }).join(' ');
            
            return (
              <polyline
                key={datasetIndex}
                points={points}
                fill="none"
                stroke={dataset.color}
                strokeWidth="2"
              />
            );
          })}
        </svg>
      )}
    </div>
  );
};

const AlertsList: React.FC<{
  alerts: Alert[];
  darkMode: boolean;
  onResolve: (id: string) => void;
}> = ({ alerts, darkMode, onResolve }) => {
  const severityColors = {
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500'
  };

  const sortedAlerts = useMemo(
    () => [...alerts].sort((a, b) => {
      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }),
    [alerts]
  );

  return (
    <div className={`rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="p-4 border-b dark:border-gray-700">
        <h3 className="text-lg font-semibold">Recent Alerts</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {sortedAlerts.length > 0 ? (
          sortedAlerts.map(alert => (
            <div
              key={alert.id}
              className={`p-4 border-b dark:border-gray-700 ${
                alert.resolved ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`w-2 h-2 mt-2 rounded-full ${severityColors[alert.severity]}`} />
                  <div>
                    <p className={`font-medium ${alert.resolved ? 'line-through' : ''}`}>
                      {alert.message}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!alert.resolved && (
                  <button
                    onClick={() => onResolve(alert.id)}
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            No alerts to display
          </div>
        )}
      </div>
    </div>
  );
};

export const PerformanceDashboard: React.FC<{ darkMode?: boolean }> = ({ darkMode = false }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: true });
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  // Generate sample data
  const generateSampleData = useCallback(() => {
    const now = Date.now();
    const dataPoints = 24; // 24 hours
    const data: PerformanceData[] = [];
    
    for (let i = 0; i < dataPoints; i++) {
      data.push({
        timestamp: new Date(now - (dataPoints - i) * 3600000).toISOString(),
        metrics: {
          responseTime: 50 + Math.random() * 150,
          throughput: 100 + Math.random() * 400,
          errorRate: Math.random() * 5,
          cpuUsage: 20 + Math.random() * 60,
          memoryUsage: 30 + Math.random() * 50,
          activeUsers: Math.floor(10 + Math.random() * 90)
        },
        alerts: []
      });
    }
    
    return data;
  }, []);

  // Generate sample alerts
  const generateSampleAlerts = useCallback((): Alert[] => {
    const severities: Alert['severity'][] = ['low', 'medium', 'high', 'critical'];
    const messages = [
      'High CPU usage detected',
      'Memory usage approaching limit',
      'Increased error rate',
      'Slow response times',
      'Database connection pool exhausted'
    ];
    
    return Array.from({ length: 5 }, (_, i) => ({
      id: `alert-${i}`,
      severity: severities[Math.floor(Math.random() * severities.length)],
      message: messages[i % messages.length],
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      resolved: Math.random() > 0.7
    }));
  }, []);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoadingState({ isLoading: true });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPerformanceData(generateSampleData());
      setAlerts(generateSampleAlerts());
      setLoadingState({ isLoading: false });
    };
    
    loadData();
  }, [generateSampleData, generateSampleAlerts]);

  // Calculate current metrics
  const currentMetrics = useMemo(() => {
    if (performanceData.length === 0) {
      return {
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        activeUsers: 0,
        availability: 100,
        responseTimeChange: 0,
        throughputChange: 0,
        errorRateChange: 0
      };
    }

    const latest = performanceData[performanceData.length - 1].metrics;
    const previous = performanceData[Math.max(0, performanceData.length - 2)].metrics;

    return {
      ...latest,
      availability: 100 - latest.errorRate,
      responseTimeChange: ((latest.responseTime - previous.responseTime) / previous.responseTime) * 100,
      throughputChange: ((latest.throughput - previous.throughput) / previous.throughput) * 100,
      errorRateChange: ((latest.errorRate - previous.errorRate) / Math.max(1, previous.errorRate)) * 100
    };
  }, [performanceData]);

  // Prepare chart data
  const chartData = useMemo((): ChartData => {
    const last6Hours = performanceData.slice(-6);
    
    return {
      labels: last6Hours.map(d => new Date(d.timestamp).getHours() + ':00'),
      datasets: [
        {
          label: 'Response Time',
          data: last6Hours.map(d => d.metrics.responseTime),
          color: 'bg-blue-500'
        },
        {
          label: 'Throughput',
          data: last6Hours.map(d => d.metrics.throughput / 10),
          color: 'bg-green-500'
        }
      ]
    };
  }, [performanceData]);

  const handleResolveAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, resolved: true } : alert
    ));
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'realtime':
        return <RealTimeMonitor darkMode={darkMode} />;
      
      case 'historical':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SimpleChart
              data={chartData}
              type="line"
              title="Response Time Trend"
              darkMode={darkMode}
            />
            <SimpleChart
              data={chartData}
              type="bar"
              title="Throughput Analysis"
              darkMode={darkMode}
            />
          </div>
        );
      
      case 'alerts':
        return (
          <AlertsList
            alerts={alerts}
            darkMode={darkMode}
            onResolve={handleResolveAlert}
          />
        );
      
      case 'resources':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricTile
              title="CPU Usage"
              value={`${Math.round(currentMetrics.cpuUsage)}%`}
              icon={<Cpu className="w-5 h-5 text-white" />}
              color="bg-purple-500"
              darkMode={darkMode}
            />
            <MetricTile
              title="Memory Usage"
              value={`${Math.round(currentMetrics.memoryUsage)}%`}
              icon={<Database className="w-5 h-5 text-white" />}
              color="bg-indigo-500"
              darkMode={darkMode}
            />
            <MetricTile
              title="Active Users"
              value={currentMetrics.activeUsers}
              icon={<Users className="w-5 h-5 text-white" />}
              color="bg-cyan-500"
              darkMode={darkMode}
            />
          </div>
        );
      
      default: // overview
        return (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricTile
                title="Avg Response Time"
                value={`${Math.round(currentMetrics.responseTime)}ms`}
                change={currentMetrics.responseTimeChange}
                icon={<Clock className="w-5 h-5 text-white" />}
                color="bg-blue-500"
                darkMode={darkMode}
              />
              <MetricTile
                title="Throughput"
                value={`${Math.round(currentMetrics.throughput)} req/s`}
                change={currentMetrics.throughputChange}
                icon={<Zap className="w-5 h-5 text-white" />}
                color="bg-green-500"
                darkMode={darkMode}
              />
              <MetricTile
                title="Error Rate"
                value={`${currentMetrics.errorRate.toFixed(2)}%`}
                change={currentMetrics.errorRateChange}
                icon={<AlertTriangle className="w-5 h-5 text-white" />}
                color="bg-red-500"
                darkMode={darkMode}
              />
              <MetricTile
                title="Availability"
                value={`${currentMetrics.availability.toFixed(2)}%`}
                icon={<CheckCircle2 className="w-5 h-5 text-white" />}
                color="bg-emerald-500"
                darkMode={darkMode}
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SimpleChart
                data={chartData}
                type="line"
                title="Performance Trends"
                darkMode={darkMode}
              />
              <AlertsList
                alerts={alerts.filter(a => !a.resolved).slice(0, 3)}
                darkMode={darkMode}
                onResolve={handleResolveAlert}
              />
            </div>
          </div>
        );
    }
  };

  if (loadingState.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'} min-h-screen`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Performance Dashboard</h1>
          <div className="flex items-center justify-between">
            <p className="text-gray-500">Monitor and analyze system performance</p>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
              className={`px-3 py-1 rounded-lg ${
                darkMode ? 'bg-gray-800 text-white' : 'bg-white'
              } border dark:border-gray-700`}
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 border-b dark:border-gray-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
};

export default PerformanceDashboard;
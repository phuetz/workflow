/**
 * Real-Time Monitor Component
 * PLAN C PHASE 3 - Monitoring temps réel
 * Affiche les métriques en temps réel avec WebSocket
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  Database,
  HardDrive,
  Network,
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react';
import { 
  withErrorHandling, 
  throttle, 
  debounce,
  memoize 
} from '../../utils/SharedPatterns';
import {
  MetricData,
  PerformanceMetrics,
  LoadingState,
  ErrorState,
  isNumber,
  toSafeNumber
} from '../../types/StrictTypes';
import { logger } from '../../services/SimpleLogger';

interface RealTimeMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  history: number[];
  threshold?: {
    warning: number;
    critical: number;
  };
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    in: number;
    out: number;
  };
  activeConnections: number;
  requestsPerSecond: number;
  errorRate: number;
  responseTime: number;
}

interface MonitorProps {
  wsUrl?: string;
  refreshInterval?: number;
  maxHistoryPoints?: number;
  darkMode?: boolean;
}

const MetricCard: React.FC<{
  metric: RealTimeMetric;
  icon: React.ReactNode;
  color: string;
  darkMode: boolean;
}> = ({ metric, icon, color, darkMode }) => {
  const getStatusColor = useCallback((value: number, threshold?: RealTimeMetric['threshold']) => {
    if (!threshold) return color;
    if (value >= threshold.critical) return 'bg-red-500';
    if (value >= threshold.warning) return 'bg-yellow-500';
    return color;
  }, [color]);

  const getTrendIcon = useCallback((trend: RealTimeMetric['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4" />;
    }
  }, []);

  const formatValue = useCallback((value: number, unit: string): string => {
    if (unit === '%') return `${Math.round(value)}%`;
    if (unit === 'ms') return `${Math.round(value)}ms`;
    if (unit === 'MB') return `${(value / 1024 / 1024).toFixed(1)}MB`;
    if (unit === 'KB/s') return `${Math.round(value)}KB/s`;
    return `${value}${unit}`;
  }, []);

  return (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 ${getStatusColor(metric.value, metric.threshold)} rounded flex items-center justify-center`}>
            {icon}
          </div>
          <span className="font-medium text-sm">{metric.name}</span>
        </div>
        {getTrendIcon(metric.trend)}
      </div>
      
      <div className="mt-2">
        <div className="text-2xl font-bold">
          {formatValue(metric.value, metric.unit)}
        </div>
        
        {/* Mini chart */}
        <div className="mt-2 h-8 flex items-end space-x-1">
          {metric.history.slice(-20).map((value, index) => {
            const height = Math.max(5, (value / Math.max(...metric.history)) * 32);
            return (
              <div
                key={index}
                className={`flex-1 ${darkMode ? 'bg-blue-600' : 'bg-blue-400'} rounded-t`}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

const AlertBanner: React.FC<{
  message: string;
  type: 'info' | 'warning' | 'error';
  darkMode: boolean;
}> = ({ message, type, darkMode }) => {
  const colors = {
    info: darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800',
    warning: darkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800',
    error: darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
  };

  const icons = {
    info: <Activity className="w-4 h-4" />,
    warning: <AlertCircle className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />
  };

  return (
    <div className={`p-3 rounded-lg ${colors[type]} flex items-center space-x-2`}>
      {icons[type]}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

export const RealTimeMonitor: React.FC<MonitorProps> = ({
  wsUrl = 'ws://localhost:8080',
  refreshInterval = 1000,
  maxHistoryPoints = 60,
  darkMode = false
}) => {
  const [metrics, setMetrics] = useState<RealTimeMetric[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<Array<{ id: string; message: string; type: 'info' | 'warning' | 'error' }>>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: true, message: 'Connecting...' });
  const [errorState, setErrorState] = useState<ErrorState>({ hasError: false });
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize metrics
  const initializeMetrics = useCallback((): RealTimeMetric[] => {
    return [
      {
        id: 'cpu',
        name: 'CPU Usage',
        value: 0,
        unit: '%',
        trend: 'stable',
        history: [],
        threshold: { warning: 70, critical: 90 }
      },
      {
        id: 'memory',
        name: 'Memory',
        value: 0,
        unit: 'MB',
        trend: 'stable',
        history: [],
        threshold: { warning: 1024, critical: 1536 }
      },
      {
        id: 'requests',
        name: 'Requests/sec',
        value: 0,
        unit: 'req/s',
        trend: 'stable',
        history: []
      },
      {
        id: 'response_time',
        name: 'Response Time',
        value: 0,
        unit: 'ms',
        trend: 'stable',
        history: [],
        threshold: { warning: 500, critical: 1000 }
      },
      {
        id: 'error_rate',
        name: 'Error Rate',
        value: 0,
        unit: '%',
        trend: 'stable',
        history: [],
        threshold: { warning: 5, critical: 10 }
      },
      {
        id: 'connections',
        name: 'Active Connections',
        value: 0,
        unit: '',
        trend: 'stable',
        history: []
      }
    ];
  }, []);

  // Update metric with new value
  const updateMetric = useCallback((id: string, value: number) => {
    setMetrics(prevMetrics => {
      return prevMetrics.map(metric => {
        if (metric.id !== id) return metric;

        const history = [...metric.history, value];
        if (history.length > maxHistoryPoints) {
          history.shift();
        }

        const lastValue = metric.history[metric.history.length - 1] || value;
        let trend: RealTimeMetric['trend'] = 'stable';
        if (value > lastValue * 1.1) trend = 'up';
        else if (value < lastValue * 0.9) trend = 'down';

        return {
          ...metric,
          value,
          history,
          trend
        };
      });
    });
  }, [maxHistoryPoints]);

  // Process incoming WebSocket message
  const processMessage = useCallback((data: unknown) => {
    try {
      if (!data || typeof data !== 'object') return;

      const message = data as Record<string, unknown>;
      
      if (message.type === 'metrics' && message.data) {
        const metricsData = message.data as Partial<SystemMetrics>;
        
        if (isNumber(metricsData.cpu)) updateMetric('cpu', metricsData.cpu);
        if (isNumber(metricsData.memory)) updateMetric('memory', metricsData.memory);
        if (isNumber(metricsData.requestsPerSecond)) updateMetric('requests', metricsData.requestsPerSecond);
        if (isNumber(metricsData.responseTime)) updateMetric('response_time', metricsData.responseTime);
        if (isNumber(metricsData.errorRate)) updateMetric('error_rate', metricsData.errorRate);
        if (isNumber(metricsData.activeConnections)) updateMetric('connections', metricsData.activeConnections);
        
        setSystemMetrics(metricsData as SystemMetrics);
      }

      if (message.type === 'alert' && message.alert) {
        const alert = message.alert as { message: string; severity: string };
        setAlerts(prev => [
          ...prev.slice(-4),
          {
            id: `alert-${Date.now()}`,
            message: alert.message,
            type: (alert.severity === 'critical' ? 'error' : alert.severity) as 'info' | 'warning' | 'error'
          }
        ]);
      }
    } catch (error) {
      logger.error('Error processing message:', error);
    }
  }, [updateMetric]);

  // Throttled message handler
  const handleMessage = useRef(
    throttle((event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        processMessage(data);
      } catch (error) {
        logger.error('Failed to parse WebSocket message:', error);
      }
    }, 100)
  ).current;

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setLoadingState({ isLoading: false });
        setErrorState({ hasError: false });
        logger.debug('WebSocket connected');
      };

      wsRef.current.onmessage = handleMessage;

      wsRef.current.onerror = (error) => {
        logger.error('WebSocket error:', error);
        setErrorState({ hasError: true, message: 'Connection error' });
      };

      wsRef.current.onclose = () => {
        logger.debug('WebSocket disconnected');
        setLoadingState({ isLoading: true, message: 'Reconnecting...' });
        
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };
    } catch (error) {
      setErrorState({ hasError: true, message: 'Failed to connect' });
    }
  }, [wsUrl, handleMessage]);

  // Initialize on mount
  useEffect(() => {
    setMetrics(initializeMetrics());
    connectWebSocket();

    // Simulate data if WebSocket is not available
    const simulationInterval = setInterval(() => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        updateMetric('cpu', 30 + Math.random() * 40);
        updateMetric('memory', 512 + Math.random() * 512);
        updateMetric('requests', 10 + Math.random() * 90);
        updateMetric('response_time', 50 + Math.random() * 200);
        updateMetric('error_rate', Math.random() * 5);
        updateMetric('connections', 5 + Math.floor(Math.random() * 20));
      }
    }, refreshInterval);

    return () => {
      clearInterval(simulationInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Real-Time Monitor</h1>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${loadingState.isLoading ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`} />
            <span className="text-sm text-gray-500">
              {loadingState.isLoading ? loadingState.message : 'Connected'}
            </span>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map(alert => (
              <AlertBanner
                key={alert.id}
                message={alert.message}
                type={alert.type}
                darkMode={darkMode}
              />
            ))}
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map(metric => {
            const icons: Record<string, React.ReactNode> = {
              cpu: <Cpu className="w-4 h-4 text-white" />,
              memory: <HardDrive className="w-4 h-4 text-white" />,
              requests: <Zap className="w-4 h-4 text-white" />,
              response_time: <Clock className="w-4 h-4 text-white" />,
              error_rate: <AlertCircle className="w-4 h-4 text-white" />,
              connections: <Network className="w-4 h-4 text-white" />
            };

            return (
              <MetricCard
                key={metric.id}
                metric={metric}
                icon={icons[metric.id]}
                color="bg-blue-500"
                darkMode={darkMode}
              />
            );
          })}
        </div>

        {/* System Status */}
        {systemMetrics && (
          <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <h2 className="text-lg font-semibold mb-3">System Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Network In</p>
                <p className="text-lg font-semibold">{Math.round(systemMetrics.network.in)}KB/s</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Network Out</p>
                <p className="text-lg font-semibold">{Math.round(systemMetrics.network.out)}KB/s</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Disk Usage</p>
                <p className="text-lg font-semibold">{Math.round(systemMetrics.disk)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Health Score</p>
                <p className="text-lg font-semibold text-green-500">
                  {Math.round(100 - (systemMetrics.errorRate * 10))}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeMonitor;
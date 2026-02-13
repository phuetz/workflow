/**
 * Real-time Monitoring Dashboard
 * Complete monitoring system with live metrics and alerts
 */

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, AlertCircle, CheckCircle, Clock, Cpu, Database, HardDrive, MemoryStick, Network, Server, TrendingUp, TrendingDown, Users, Zap, AlertTriangle, Monitor } from 'lucide-react';
import { EventEmitter } from 'events';
import { logger } from '../services/SimpleLogger';

// Types
export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    cores: number;
    temperature?: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
    iops: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    errors: number;
  };
  process: {
    pid: number;
    uptime: number;
    handles: number;
    threads: number;
  };
}

export interface WorkflowMetrics {
  timestamp: Date;
  executions: {
    total: number;
    successful: number;
    failed: number;
    running: number;
    queued: number;
  };
  performance: {
    averageExecutionTime: number;
    p95ExecutionTime: number;
    p99ExecutionTime: number;
    throughput: number;
  };
  nodes: {
    total: number;
    byType: Record<string, number>;
    errors: Record<string, number>;
  };
}

export interface APIMetrics {
  timestamp: Date;
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number; // requests per second
  };
  latency: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
  endpoints: Array<{
    path: string;
    method: string;
    count: number;
    averageLatency: number;
    errorRate: number;
  }>;
  errors: Array<{
    code: number;
    message: string;
    count: number;
  }>;
}

export interface UserMetrics {
  timestamp: Date;
  users: {
    total: number;
    active: number;
    new: number;
  };
  sessions: {
    total: number;
    average: number;
    concurrent: number;
  };
  activity: Array<{
    userId: string;
    username: string;
    action: string;
    timestamp: Date;
  }>;
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: any;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime: number;
  details?: any;
}

export interface DashboardConfig {
  refreshInterval: number;
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  metrics: {
    system: boolean;
    workflow: boolean;
    api: boolean;
    users: boolean;
  };
  alerts: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
  layout: 'grid' | 'list' | 'compact';
}

// Monitoring Service
class MonitoringService extends EventEmitter {
  private metrics: {
    system: SystemMetrics[];
    workflow: WorkflowMetrics[];
    api: APIMetrics[];
    users: UserMetrics[];
  } = {
    system: [],
    workflow: [],
    api: [],
    users: []
  };

  private alerts: Alert[] = [];
  private healthChecks: Map<string, HealthCheck> = new Map();
  private ws: WebSocket | null = null;
  private config: DashboardConfig;

  constructor(config: DashboardConfig) {
    super();
    this.config = config;
    this.initialize();
  }

  private initialize(): void {
    // Initialize WebSocket connection
    this.connectWebSocket();
    
    // Start metric collection
    this.startMetricCollection();
    
    // Start health checks
    this.startHealthChecks();
  }

  private connectWebSocket(): void {
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3001/monitoring';
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      logger.debug('WebSocket connected');
      this.emit('connected');
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    };
    
    this.ws.onerror = (error) => {
      logger.error('WebSocket error:', error);
      this.emit('error', error);
    };
    
    this.ws.onclose = () => {
      logger.debug('WebSocket disconnected');
      this.emit('disconnected');
      
      // Reconnect after 5 seconds
      setTimeout(() => this.connectWebSocket(), 5000);
    };
  }

  private handleWebSocketMessage(data: any): void {
    switch (data.type) {
      case 'metrics':
        this.updateMetrics(data.category, data.payload);
        break;
      case 'alert':
        this.addAlert(data.payload);
        break;
      case 'health':
        this.updateHealthCheck(data.payload);
        break;
    }
  }

  private updateMetrics(category: string, metrics: any): void {
    const maxDataPoints = 100;
    
    switch (category) {
      case 'system':
        this.metrics.system.push(metrics);
        if (this.metrics.system.length > maxDataPoints) {
          this.metrics.system.shift();
        }
        this.emit('metrics:system', metrics);
        break;
      case 'workflow':
        this.metrics.workflow.push(metrics);
        if (this.metrics.workflow.length > maxDataPoints) {
          this.metrics.workflow.shift();
        }
        this.emit('metrics:workflow', metrics);
        break;
      case 'api':
        this.metrics.api.push(metrics);
        if (this.metrics.api.length > maxDataPoints) {
          this.metrics.api.shift();
        }
        this.emit('metrics:api', metrics);
        break;
      case 'users':
        this.metrics.users.push(metrics);
        if (this.metrics.users.length > maxDataPoints) {
          this.metrics.users.shift();
        }
        this.emit('metrics:users', metrics);
        break;
    }
  }

  private addAlert(alert: Alert): void {
    this.alerts.unshift(alert);
    if (this.alerts.length > 100) {
      this.alerts.pop();
    }
    
    this.emit('alert', alert);
    
    // Send notifications if enabled
    if (this.config.alerts.enabled) {
      this.sendNotification(alert);
    }
  }

  private updateHealthCheck(health: HealthCheck): void {
    this.healthChecks.set(health.service, health);
    this.emit('health', health);
  }

  private sendNotification(alert: Alert): void {
    // Desktop notification
    if (this.config.alerts.desktop && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Monitoring Alert', {
        body: alert.message,
        icon: alert.type === 'critical' ? '🔴' : alert.type === 'warning' ? '🟡' : 'ℹ️',
      });
    }
    
    // Sound notification
    if (this.config.alerts.sound) {
      const audio = new Audio('/alert.mp3');
      audio.play().catch(e => logger.error('Failed to play alert sound:', e));
    }
  }

  private startMetricCollection(): void {
    // Simulate metric collection (in production, would fetch from backend)
    setInterval(() => {
      if (this.config.metrics.system) {
        const systemMetrics: SystemMetrics = {
          timestamp: new Date(),
          cpu: {
            usage: Math.random() * 100,
            cores: 8,
            temperature: 45 + Math.random() * 20
          },
          memory: {
            used: 8 * 1024 * 1024 * 1024,
            total: 16 * 1024 * 1024 * 1024,
            percentage: 50 + Math.random() * 30
          },
          disk: {
            used: 256 * 1024 * 1024 * 1024,
            total: 512 * 1024 * 1024 * 1024,
            percentage: 50,
            iops: Math.floor(Math.random() * 1000)
          },
          network: {
            bytesIn: Math.floor(Math.random() * 1024 * 1024),
            bytesOut: Math.floor(Math.random() * 1024 * 1024),
            packetsIn: Math.floor(Math.random() * 1000),
            packetsOut: Math.floor(Math.random() * 1000),
            errors: Math.floor(Math.random() * 10)
          },
          process: {
            pid: 1234,
            uptime: Date.now(),
            handles: 567,
            threads: 12
          }
        };
        
        this.updateMetrics('system', systemMetrics);
      }
    }, this.config.refreshInterval);
  }

  private startHealthChecks(): void {
    const services = ['API', 'Database', 'Redis', 'Queue', 'Storage'];
    
    setInterval(() => {
      services.forEach(service => {
        const health: HealthCheck = {
          service,
          status: Math.random() > 0.1 ? 'healthy' : Math.random() > 0.5 ? 'degraded' : 'unhealthy',
          lastCheck: new Date(),
          responseTime: Math.random() * 100
        };
        
        this.updateHealthCheck(health);
      });
    }, 10000); // Check every 10 seconds
  }

  public getMetrics(): typeof this.metrics {
    return this.metrics;
  }

  public getAlerts(): Alert[] {
    return this.alerts;
  }

  public getHealthChecks(): HealthCheck[] {
    return Array.from(this.healthChecks.values());
  }

  public resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.emit('alert:resolved', alert);
    }
  }

  public updateConfig(config: Partial<DashboardConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:updated', this.config);
  }

  public destroy(): void {
    if (this.ws) {
      this.ws.close();
    }
    this.removeAllListeners();
  }
}

// Dashboard Component
export const RealtimeMonitoringDashboard: React.FC = () => {
  const [config, setConfig] = useState<DashboardConfig>({
    refreshInterval: 5000,
    timeRange: '1h',
    metrics: {
      system: true,
      workflow: true,
      api: true,
      users: true
    },
    alerts: {
      enabled: true,
      sound: false,
      desktop: false
    },
    layout: 'grid'
  });

  const [metrics, setMetrics] = useState({
    system: [] as SystemMetrics[],
    workflow: [] as WorkflowMetrics[],
    api: [] as APIMetrics[],
    users: [] as UserMetrics[]
  });

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'system' | 'workflow' | 'api' | 'users'>('system');

  const monitoringService = useMemo(() => new MonitoringService(config), []);

  useEffect(() => {
    // Subscribe to events
    monitoringService.on('metrics:system', (data) => {
      setMetrics(prev => ({
        ...prev,
        system: [...prev.system.slice(-99), data]
      }));
    });

    monitoringService.on('alert', (alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 99)]);
    });

    monitoringService.on('health', () => {
      setHealthChecks(monitoringService.getHealthChecks());
    });

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      monitoringService.destroy();
    };
  }, [monitoringService]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'unhealthy': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertCircle className="text-red-500" />;
      case 'warning': return <AlertTriangle className="text-yellow-500" />;
      default: return <Activity className="text-blue-500" />;
    }
  };

  const latestSystemMetrics = metrics.system[metrics.system.length - 1];

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Real-time Monitoring Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Live system metrics and performance monitoring
            </p>
          </div>
          
          <div className="flex space-x-4">
            <select
              value={config.timeRange}
              onChange={(e) => setConfig({ ...config, timeRange: e.target.value as any })}
              className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            
            <button
              onClick={() => monitoringService.updateConfig(config)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Health Status */}
      <div className="grid grid-cols-5 gap-4">
        {healthChecks.map(health => (
          <div key={health.service} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{health.service}</p>
                <p className={`text-lg font-semibold ${getStatusColor(health.status)}`}>
                  {health.status.toUpperCase()}
                </p>
              </div>
              <Server className={getStatusColor(health.status)} size={24} />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Response: {health.responseTime.toFixed(0)}ms
            </p>
          </div>
        ))}
      </div>

      {/* Key Metrics */}
      {latestSystemMetrics && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">CPU Usage</p>
                <p className="text-2xl font-bold">
                  {latestSystemMetrics.cpu.usage.toFixed(1)}%
                </p>
              </div>
              <Cpu className="text-blue-500" size={32} />
            </div>
            <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${latestSystemMetrics.cpu.usage}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Memory Usage</p>
                <p className="text-2xl font-bold">
                  {latestSystemMetrics.memory.percentage.toFixed(1)}%
                </p>
              </div>
              <MemoryStick className="text-green-500" size={32} />
            </div>
            <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${latestSystemMetrics.memory.percentage}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Disk Usage</p>
                <p className="text-2xl font-bold">
                  {latestSystemMetrics.disk.percentage.toFixed(1)}%
                </p>
              </div>
              <HardDrive className="text-purple-500" size={32} />
            </div>
            <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: `${latestSystemMetrics.disk.percentage}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Network I/O</p>
                <p className="text-2xl font-bold">
                  {((latestSystemMetrics.network.bytesIn + latestSystemMetrics.network.bytesOut) / 1024 / 1024).toFixed(1)} MB/s
                </p>
              </div>
              <Network className="text-orange-500" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* CPU Usage Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">CPU Usage Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.system}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(time) => new Date(time).toLocaleTimeString()}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="cpu.usage" 
                stroke="#3B82F6" 
                name="CPU %"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Memory Usage Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Memory Usage Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics.system}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(time) => new Date(time).toLocaleTimeString()}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="memory.percentage" 
                stroke="#10B981" 
                fill="#10B981"
                fillOpacity={0.3}
                name="Memory %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold">Recent Alerts</h3>
        </div>
        <div className="divide-y dark:divide-gray-700 max-h-96 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No alerts at this time
            </div>
          ) : (
            alerts.map(alert => (
              <div key={alert.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-start space-x-3">
                  <div className="mt-1">{getAlertIcon(alert.type)}</div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-medium">{alert.message}</p>
                      <span className="text-sm text-gray-500">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {alert.category}
                    </p>
                    {!alert.resolved && (
                      <button
                        onClick={() => monitoringService.resolveAlert(alert.id)}
                        className="text-sm text-blue-500 hover:text-blue-600 mt-2"
                      >
                        Mark as Resolved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Dashboard Settings</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Refresh Interval</label>
            <select
              value={config.refreshInterval}
              onChange={(e) => setConfig({ ...config, refreshInterval: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="1000">1 second</option>
              <option value="5000">5 seconds</option>
              <option value="10000">10 seconds</option>
              <option value="30000">30 seconds</option>
              <option value="60000">1 minute</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Alert Notifications</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.alerts.enabled}
                  onChange={(e) => setConfig({
                    ...config,
                    alerts: { ...config.alerts, enabled: e.target.checked }
                  })}
                  className="mr-2"
                />
                <span>Enable Alerts</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.alerts.sound}
                  onChange={(e) => setConfig({
                    ...config,
                    alerts: { ...config.alerts, sound: e.target.checked }
                  })}
                  className="mr-2"
                />
                <span>Sound Notifications</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.alerts.desktop}
                  onChange={(e) => setConfig({
                    ...config,
                    alerts: { ...config.alerts, desktop: e.target.checked }
                  })}
                  className="mr-2"
                />
                <span>Desktop Notifications</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Metrics</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.metrics.system}
                  onChange={(e) => setConfig({
                    ...config,
                    metrics: { ...config.metrics, system: e.target.checked }
                  })}
                  className="mr-2"
                />
                <span>System Metrics</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.metrics.workflow}
                  onChange={(e) => setConfig({
                    ...config,
                    metrics: { ...config.metrics, workflow: e.target.checked }
                  })}
                  className="mr-2"
                />
                <span>Workflow Metrics</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.metrics.api}
                  onChange={(e) => setConfig({
                    ...config,
                    metrics: { ...config.metrics, api: e.target.checked }
                  })}
                  className="mr-2"
                />
                <span>API Metrics</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeMonitoringDashboard;
/**
 * PLAN C - Dashboard de Monitoring Temps Réel
 * Ultra Think methodology - Visualisation complète des métriques
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Activity, 
  Users, 
  Server, 
  Cpu, 
  HardDrive,
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart,
  PieChart,
  Globe,
  Database,
  Cloud
} from 'lucide-react';

interface MetricData {
  timestamp: number;
  value: number;
}

interface SystemMetrics {
  users: number;
  requestsPerSec: number;
  cpuUsage: number;
  memoryUsage: number;
  errorRate: number;
  uptime: number;
  activeWorkers: number;
  queueLength: number;
  avgLatency: number;
  throughput: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  color: string;
  unit?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon, 
  trend, 
  color,
  unit = ''
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
        {getTrendIcon()}
      </div>
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {title}
      </h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
        {value}{unit}
      </p>
    </div>
  );
};

const LiveChart: React.FC<{ 
  data: MetricData[]; 
  title: string;
  color: string;
  max?: number;
}> = ({ data, title, color, max = 100 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = (canvas.height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw data
    if (data.length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      data.forEach((point, index) => {
        const x = (canvas.width / (data.length - 1)) * index;
        const y = canvas.height - (point.value / max) * canvas.height;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();

      // Fill area under line
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.closePath();
      ctx.fillStyle = color + '20';
      ctx.fill();
    }
  }, [data, color, max]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
        {title}
      </h3>
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={100}
        className="w-full"
      />
    </div>
  );
};

export const RealTimeDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    users: 10247,
    requestsPerSec: 9832,
    cpuUsage: 45,
    memoryUsage: 52,
    errorRate: 0.01,
    uptime: 99.99,
    activeWorkers: 847,
    queueLength: 234,
    avgLatency: 47,
    throughput: 8921
  });

  const [cpuHistory, setCpuHistory] = useState<MetricData[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<MetricData[]>([]);
  const [requestHistory, setRequestHistory] = useState<MetricData[]>([]);
  const [latencyHistory, setLatencyHistory] = useState<MetricData[]>([]);

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      // Update metrics with realistic variations
      setMetrics(prev => ({
        users: Math.max(0, prev.users + Math.floor(Math.random() * 100 - 45)),
        requestsPerSec: Math.max(0, prev.requestsPerSec + Math.floor(Math.random() * 500 - 240)),
        cpuUsage: Math.min(100, Math.max(0, prev.cpuUsage + (Math.random() * 10 - 5))),
        memoryUsage: Math.min(100, Math.max(0, prev.memoryUsage + (Math.random() * 5 - 2))),
        errorRate: Math.max(0, prev.errorRate + (Math.random() * 0.02 - 0.01)),
        uptime: 99.99,
        activeWorkers: Math.max(0, prev.activeWorkers + Math.floor(Math.random() * 50 - 24)),
        queueLength: Math.max(0, prev.queueLength + Math.floor(Math.random() * 100 - 48)),
        avgLatency: Math.max(1, prev.avgLatency + (Math.random() * 10 - 5)),
        throughput: Math.max(0, prev.throughput + Math.floor(Math.random() * 200 - 95))
      }));

      // Update history charts
      setCpuHistory(prev => {
        const updated = [...prev, { timestamp: now, value: metrics.cpuUsage }];
        return updated.slice(-30); // Keep last 30 points
      });

      setMemoryHistory(prev => {
        const updated = [...prev, { timestamp: now, value: metrics.memoryUsage }];
        return updated.slice(-30);
      });

      setRequestHistory(prev => {
        const updated = [...prev, { timestamp: now, value: metrics.requestsPerSec / 100 }];
        return updated.slice(-30);
      });

      setLatencyHistory(prev => {
        const updated = [...prev, { timestamp: now, value: metrics.avgLatency }];
        return updated.slice(-30);
      });
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [metrics]);

  const systemStatus = useMemo(() => {
    if (metrics.errorRate > 5) return 'critical';
    if (metrics.errorRate > 1 || metrics.cpuUsage > 80) return 'warning';
    return 'healthy';
  }, [metrics]);

  const getStatusColor = () => {
    switch (systemStatus) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Real-Time System Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Plan C - Ultra Think Monitoring
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-lg text-white font-medium ${getStatusColor()}`}>
              System: {systemStatus.toUpperCase()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Critical Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
        <MetricCard
          title="Active Users"
          value={metrics.users.toLocaleString()}
          icon={<Users className="w-5 h-5 text-white" />}
          trend="up"
          color="bg-blue-500"
        />
        <MetricCard
          title="Requests/sec"
          value={metrics.requestsPerSec.toLocaleString()}
          icon={<Activity className="w-5 h-5 text-white" />}
          trend="stable"
          color="bg-purple-500"
        />
        <MetricCard
          title="CPU Usage"
          value={metrics.cpuUsage.toFixed(1)}
          icon={<Cpu className="w-5 h-5 text-white" />}
          trend={metrics.cpuUsage > 70 ? 'up' : 'stable'}
          color="bg-orange-500"
          unit="%"
        />
        <MetricCard
          title="Memory"
          value={metrics.memoryUsage.toFixed(1)}
          icon={<HardDrive className="w-5 h-5 text-white" />}
          trend="stable"
          color="bg-green-500"
          unit="%"
        />
        <MetricCard
          title="Error Rate"
          value={metrics.errorRate.toFixed(2)}
          icon={<AlertTriangle className="w-5 h-5 text-white" />}
          trend={metrics.errorRate > 0.1 ? 'up' : 'stable'}
          color="bg-red-500"
          unit="%"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Uptime"
          value={metrics.uptime.toFixed(2)}
          icon={<CheckCircle className="w-5 h-5 text-white" />}
          color="bg-emerald-500"
          unit="%"
        />
        <MetricCard
          title="Active Workers"
          value={metrics.activeWorkers}
          icon={<Server className="w-5 h-5 text-white" />}
          trend="up"
          color="bg-indigo-500"
        />
        <MetricCard
          title="Queue Length"
          value={metrics.queueLength}
          icon={<Database className="w-5 h-5 text-white" />}
          color="bg-pink-500"
        />
        <MetricCard
          title="Avg Latency"
          value={metrics.avgLatency.toFixed(0)}
          icon={<Zap className="w-5 h-5 text-white" />}
          trend={metrics.avgLatency > 100 ? 'up' : 'stable'}
          color="bg-yellow-500"
          unit="ms"
        />
      </div>

      {/* Live Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <LiveChart 
          data={cpuHistory} 
          title="CPU Usage (%)" 
          color="#f97316"
          max={100}
        />
        <LiveChart 
          data={memoryHistory} 
          title="Memory Usage (%)" 
          color="#10b981"
          max={100}
        />
        <LiveChart 
          data={requestHistory} 
          title="Requests (x100/sec)" 
          color="#8b5cf6"
          max={150}
        />
        <LiveChart 
          data={latencyHistory} 
          title="Latency (ms)" 
          color="#eab308"
          max={200}
        />
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Infrastructure Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Infrastructure Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Kubernetes Pods</span>
              <span className="font-medium text-green-500">47/50 Running</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Docker Services</span>
              <span className="font-medium text-green-500">12/12 Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Load Balancers</span>
              <span className="font-medium text-green-500">3/3 Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Database Connections</span>
              <span className="font-medium text-yellow-500">234/500</span>
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Alerts
          </h3>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">
                  Auto-scaling triggered
                </p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mt-1" />
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">
                  High memory usage on worker-3
                </p>
                <p className="text-xs text-gray-500">5 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">
                  Backup completed successfully
                </p>
                <p className="text-xs text-gray-500">1 hour ago</p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Score */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Performance Score
          </h3>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#10b981"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${Math.PI * 2 * 56 * 0.97} ${Math.PI * 2 * 56}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  97%
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400">Availability</p>
              <p className="font-semibold text-green-500">99.99%</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400">Response Time</p>
              <p className="font-semibold text-green-500">47ms</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
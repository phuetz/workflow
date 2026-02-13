/**
 * Live Metrics Dashboard Component
 * Real-time monitoring of application performance and health
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  Network,
  TrendingUp,
  Zap,
  AlertCircle,
  Server,
  Users,
  Globe,
  Package,
  GitBranch,
  Code,
  FileText,
  BarChart3,
} from 'lucide-react';

// Types
interface Metric {
  timestamp: number;
  value: number;
  label?: string;
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  activeConnections: number;
  requestsPerSecond: number;
}

interface ApplicationMetrics {
  responseTime: number;
  errorRate: number;
  throughput: number;
  activeUsers: number;
  workflowsExecuted: number;
  cacheHitRate: number;
}

interface CodeMetrics {
  linesOfCode: number;
  technicalDebt: number;
  codeComplexity: number;
  testCoverage: number;
  buildTime: number;
  bundleSize: number;
}

interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  paintTime: number;
  scriptTime: number;
  layoutTime: number;
  memoryUsage: number;
}

// Custom Hook for Real-time Metrics
const useRealtimeMetrics = (interval = 1000) => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
    activeConnections: 0,
    requestsPerSecond: 0,
  });

  const [appMetrics, setAppMetrics] = useState<ApplicationMetrics>({
    responseTime: 0,
    errorRate: 0,
    throughput: 0,
    activeUsers: 0,
    workflowsExecuted: 0,
    cacheHitRate: 0,
  });

  const [codeMetrics] = useState<CodeMetrics>({
    linesOfCode: 203707,
    technicalDebt: 550,
    codeComplexity: 15.3,
    testCoverage: 40,
    buildTime: 60,
    bundleSize: 668,
  });

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    renderTime: 0,
    paintTime: 0,
    scriptTime: 0,
    layoutTime: 0,
    memoryUsage: 0,
  });

  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const updateMetrics = () => {
      // Simulate real-time metrics
      setSystemMetrics({
        cpu: Math.random() * 100,
        memory: 40 + Math.random() * 40,
        disk: 30 + Math.random() * 30,
        network: Math.random() * 1000,
        activeConnections: Math.floor(10 + Math.random() * 90),
        requestsPerSecond: Math.floor(100 + Math.random() * 400),
      });

      setAppMetrics({
        responseTime: 50 + Math.random() * 150,
        errorRate: Math.random() * 5,
        throughput: 1000 + Math.random() * 4000,
        activeUsers: Math.floor(100 + Math.random() * 900),
        workflowsExecuted: Math.floor(50 + Math.random() * 450),
        cacheHitRate: 70 + Math.random() * 25,
      });

      setPerformanceMetrics({
        fps: 55 + Math.random() * 10,
        renderTime: 5 + Math.random() * 15,
        paintTime: 2 + Math.random() * 8,
        scriptTime: 3 + Math.random() * 12,
        layoutTime: 1 + Math.random() * 5,
        memoryUsage: 100 + Math.random() * 400,
      });

      // Update history
      setHistory((prev) => {
        const newPoint = {
          time: new Date().toLocaleTimeString(),
          cpu: systemMetrics.cpu,
          memory: systemMetrics.memory,
          responseTime: appMetrics.responseTime,
          errorRate: appMetrics.errorRate,
        };
        return [...prev.slice(-29), newPoint];
      });
    };

    const intervalId = setInterval(updateMetrics, interval);
    updateMetrics(); // Initial call

    return () => clearInterval(intervalId);
  }, [interval]);

  return {
    systemMetrics,
    appMetrics,
    codeMetrics,
    performanceMetrics,
    history,
  };
};

// Metric Card Component
const MetricCard: React.FC<{
  title: string;
  value: number | string;
  unit?: string;
  icon: React.ReactNode;
  trend?: number;
  status?: 'good' | 'warning' | 'critical';
  sparklineData?: number[];
}> = ({ title, value, unit, icon, trend, status = 'good', sparklineData }) => {
  const statusColors = {
    good: 'text-green-600 bg-green-50',
    warning: 'text-yellow-600 bg-yellow-50',
    critical: 'text-red-600 bg-red-50',
  };

  const trendIcon = trend && trend > 0 ? '↑' : trend && trend < 0 ? '↓' : '→';
  const trendColor = trend && trend > 0 ? 'text-red-500' : 'text-green-500';

  return (
    <div className={`p-4 rounded-lg border ${statusColors[status]} border-opacity-50`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium opacity-75">{title}</span>
        </div>
        {trend !== undefined && (
          <span className={`text-sm ${trendColor}`}>
            {trendIcon} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold">
        {typeof value === 'number' ? value.toFixed(1) : value}
        {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
      </div>
      {sparklineData && (
        <div className="mt-2 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData.map((v, i) => ({ value: v, index: i }))}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="currentColor"
                strokeWidth={1}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// Main Dashboard Component
export const MetricsLiveDashboard: React.FC = () => {
  const { systemMetrics, appMetrics, codeMetrics, performanceMetrics, history } =
    useRealtimeMetrics();

  // Calculate health score
  const healthScore = useMemo(() => {
    const factors = [
      systemMetrics.cpu < 80 ? 25 : 0,
      systemMetrics.memory < 80 ? 25 : 0,
      appMetrics.errorRate < 1 ? 25 : 0,
      appMetrics.responseTime < 200 ? 25 : 0,
    ];
    return factors.reduce((a, b) => a + b, 0);
  }, [systemMetrics, appMetrics]);

  // Prepare chart data
  const performanceRadarData = [
    { metric: 'CPU', value: 100 - systemMetrics.cpu, fullMark: 100 },
    { metric: 'Memory', value: 100 - systemMetrics.memory, fullMark: 100 },
    { metric: 'Response', value: Math.max(0, 100 - appMetrics.responseTime / 3), fullMark: 100 },
    { metric: 'Errors', value: Math.max(0, 100 - appMetrics.errorRate * 20), fullMark: 100 },
    { metric: 'Cache', value: appMetrics.cacheHitRate, fullMark: 100 },
    { metric: 'FPS', value: (performanceMetrics.fps / 60) * 100, fullMark: 100 },
  ];

  const codeQualityData = [
    { name: 'Coverage', value: codeMetrics.testCoverage },
    { name: 'Debt', value: 100 - (codeMetrics.technicalDebt / 10) },
    { name: 'Complexity', value: Math.max(0, 100 - codeMetrics.codeComplexity * 5) },
  ];

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Live Metrics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Real-time monitoring and performance analytics</p>
        </div>

        {/* Health Score */}
        <div className="mb-6 p-6 bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">System Health Score</h2>
              <p className="text-gray-600">Overall system performance</p>
            </div>
            <div className="flex items-center gap-4">
              <div
                className={`text-4xl font-bold ${
                  healthScore >= 75
                    ? 'text-green-600'
                    : healthScore >= 50
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {healthScore}%
              </div>
              {healthScore >= 75 ? (
                <CheckCircle className="w-12 h-12 text-green-600" />
              ) : healthScore >= 50 ? (
                <AlertCircle className="w-12 h-12 text-yellow-600" />
              ) : (
                <AlertTriangle className="w-12 h-12 text-red-600" />
              )}
            </div>
          </div>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${
                healthScore >= 75
                  ? 'bg-green-600'
                  : healthScore >= 50
                  ? 'bg-yellow-600'
                  : 'bg-red-600'
              }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>

        {/* System Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="CPU Usage"
            value={systemMetrics.cpu}
            unit="%"
            icon={<Cpu className="w-5 h-5" />}
            trend={-2.3}
            status={systemMetrics.cpu > 80 ? 'critical' : systemMetrics.cpu > 60 ? 'warning' : 'good'}
            sparklineData={history.map((h) => h.cpu)}
          />
          <MetricCard
            title="Memory"
            value={systemMetrics.memory}
            unit="%"
            icon={<MemoryStick className="w-5 h-5" />}
            trend={1.2}
            status={
              systemMetrics.memory > 80 ? 'critical' : systemMetrics.memory > 60 ? 'warning' : 'good'
            }
            sparklineData={history.map((h) => h.memory)}
          />
          <MetricCard
            title="Response Time"
            value={appMetrics.responseTime}
            unit="ms"
            icon={<Clock className="w-5 h-5" />}
            trend={-5.1}
            status={
              appMetrics.responseTime > 200
                ? 'critical'
                : appMetrics.responseTime > 100
                ? 'warning'
                : 'good'
            }
            sparklineData={history.map((h) => h.responseTime)}
          />
          <MetricCard
            title="Error Rate"
            value={appMetrics.errorRate}
            unit="%"
            icon={<AlertTriangle className="w-5 h-5" />}
            trend={0.3}
            status={
              appMetrics.errorRate > 5 ? 'critical' : appMetrics.errorRate > 1 ? 'warning' : 'good'
            }
            sparklineData={history.map((h) => h.errorRate)}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Real-time Line Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Real-time Metrics</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  stroke="#ef4444"
                  name="CPU %"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="memory"
                  stroke="#3b82f6"
                  name="Memory %"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="responseTime"
                  stroke="#10b981"
                  name="Response (ms)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Radar Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Performance Overview</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={performanceRadarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="Performance"
                  dataKey="value"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Application Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricCard
            title="Active Users"
            value={appMetrics.activeUsers}
            icon={<Users className="w-5 h-5" />}
            status="good"
          />
          <MetricCard
            title="Workflows/min"
            value={appMetrics.workflowsExecuted}
            icon={<GitBranch className="w-5 h-5" />}
            trend={12.5}
            status="good"
          />
          <MetricCard
            title="Cache Hit Rate"
            value={appMetrics.cacheHitRate}
            unit="%"
            icon={<Database className="w-5 h-5" />}
            status={appMetrics.cacheHitRate > 80 ? 'good' : 'warning'}
          />
        </div>

        {/* Code Quality Metrics */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h3 className="text-lg font-semibold mb-4">Code Quality Metrics</h3>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {(codeMetrics.linesOfCode / 1000).toFixed(0)}k
              </div>
              <div className="text-sm text-gray-600">Lines of Code</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{codeMetrics.technicalDebt}h</div>
              <div className="text-sm text-gray-600">Tech Debt</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {codeMetrics.codeComplexity.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Complexity</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {codeMetrics.testCoverage}%
              </div>
              <div className="text-sm text-gray-600">Coverage</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{codeMetrics.buildTime}s</div>
              <div className="text-sm text-gray-600">Build Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">{codeMetrics.bundleSize}MB</div>
              <div className="text-sm text-gray-600">Bundle Size</div>
            </div>
          </div>
        </div>

        {/* Performance Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Browser Performance</h3>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <MetricCard
              title="FPS"
              value={performanceMetrics.fps}
              icon={<Zap className="w-5 h-5" />}
              status={performanceMetrics.fps > 55 ? 'good' : 'warning'}
            />
            <MetricCard
              title="Render"
              value={performanceMetrics.renderTime}
              unit="ms"
              icon={<Activity className="w-5 h-5" />}
              status={performanceMetrics.renderTime < 16 ? 'good' : 'warning'}
            />
            <MetricCard
              title="Paint"
              value={performanceMetrics.paintTime}
              unit="ms"
              icon={<Package className="w-5 h-5" />}
              status="good"
            />
            <MetricCard
              title="Script"
              value={performanceMetrics.scriptTime}
              unit="ms"
              icon={<Code className="w-5 h-5" />}
              status="good"
            />
            <MetricCard
              title="Layout"
              value={performanceMetrics.layoutTime}
              unit="ms"
              icon={<FileText className="w-5 h-5" />}
              status="good"
            />
            <MetricCard
              title="JS Heap"
              value={performanceMetrics.memoryUsage}
              unit="MB"
              icon={<HardDrive className="w-5 h-5" />}
              status={performanceMetrics.memoryUsage > 400 ? 'warning' : 'good'}
            />
          </div>
        </div>

        {/* Footer Status */}
        <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
          <div>Last updated: {new Date().toLocaleString()}</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Live monitoring active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsLiveDashboard;
/**
 * Stream Monitor
 *
 * Real-time monitoring dashboard for stream processing:
 * - Throughput metrics (events/sec, bytes/sec)
 * - Latency percentiles (p50, p90, p95, p99)
 * - Error rates and types
 * - Resource utilization
 * - Consumer lag
 * - Live charts and graphs
 */

import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { StreamMetrics, BackpressureMetrics } from '../../types/streaming';

interface StreamMonitorProps {
  pipelineId: string;
  refreshInterval?: number;
}

export const StreamMonitor: React.FC<StreamMonitorProps> = ({
  pipelineId,
  refreshInterval = 1000,
}) => {
  const [metrics, setMetrics] = useState<StreamMetrics[]>([]);
  const [backpressure, setBackpressure] = useState<BackpressureMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate real-time metrics (in production, fetch from API)
      const newMetric: StreamMetrics = {
        pipelineId,
        timestamp: Date.now(),
        throughput: {
          eventsPerSecond: Math.floor(Math.random() * 10000) + 5000,
          bytesPerSecond: Math.floor(Math.random() * 1000000) + 500000,
          recordsIn: Math.floor(Math.random() * 100000),
          recordsOut: Math.floor(Math.random() * 95000),
        },
        latency: {
          p50: Math.random() * 20 + 10,
          p90: Math.random() * 40 + 30,
          p95: Math.random() * 60 + 50,
          p99: Math.random() * 100 + 80,
          avg: Math.random() * 30 + 20,
          max: Math.random() * 150 + 100,
        },
        errors: {
          total: Math.floor(Math.random() * 100),
          rate: Math.random() * 0.05,
          byType: new Map([
            ['timeout', Math.floor(Math.random() * 30)],
            ['parse-error', Math.floor(Math.random() * 20)],
            ['connection', Math.floor(Math.random() * 10)],
          ]),
        },
        resources: {
          cpuUsage: Math.random() * 80 + 10,
          memoryUsage: Math.random() * 70 + 20,
          networkIn: Math.floor(Math.random() * 1000000),
          networkOut: Math.floor(Math.random() * 800000),
        },
      };

      setMetrics((prev) => {
        const updated = [...prev, newMetric];
        return updated.slice(-60); // Keep last 60 data points
      });

      setBackpressure({
        currentLag: Math.floor(Math.random() * 5000),
        bufferUtilization: Math.random() * 0.8,
        droppedEvents: Math.floor(Math.random() * 50),
        throughput: newMetric.throughput.eventsPerSecond,
        consumerInstances: Math.floor(Math.random() * 3) + 1,
      });

      setIsConnected(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [pipelineId, refreshInterval]);

  const latestMetric = metrics[metrics.length - 1];
  const chartData = metrics.map((m) => ({
    time: new Date(m.timestamp).toLocaleTimeString(),
    throughput: m.throughput.eventsPerSecond,
    latency: m.latency.avg,
    errors: m.errors.total,
    cpu: m.resources.cpuUsage,
    memory: m.resources.memoryUsage,
  }));

  return (
    <div className="h-full bg-gray-50 overflow-auto">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Stream Monitor</h2>
            <p className="text-sm text-gray-500 mt-1">Pipeline: {pipelineId}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Key Metrics Cards */}
        {latestMetric && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Throughput"
              value={latestMetric.throughput.eventsPerSecond.toLocaleString()}
              unit="events/sec"
              trend={5.2}
              color="blue"
            />
            <MetricCard
              title="Avg Latency"
              value={latestMetric.latency.avg.toFixed(2)}
              unit="ms"
              trend={-2.1}
              color="green"
            />
            <MetricCard
              title="Error Rate"
              value={(latestMetric.errors.rate * 100).toFixed(3)}
              unit="%"
              trend={-0.5}
              color="red"
            />
            <MetricCard
              title="CPU Usage"
              value={latestMetric.resources.cpuUsage.toFixed(1)}
              unit="%"
              trend={1.2}
              color="purple"
            />
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Throughput Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Throughput</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="throughput" stroke="#3b82f6" fillOpacity={1} fill="url(#colorThroughput)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Latency Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Latency</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="latency" stroke="#10b981" name="Avg (ms)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Resource Usage */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Resource Usage</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="cpu" stroke="#8b5cf6" name="CPU %" />
                <Line type="monotone" dataKey="memory" stroke="#f59e0b" name="Memory %" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Errors */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Errors</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="errors" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Backpressure Metrics */}
        {backpressure && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Backpressure & Flow Control</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Consumer Lag</div>
                <div className="text-2xl font-bold text-gray-900">
                  {backpressure.currentLag.toLocaleString()}
                  <span className="text-sm font-normal text-gray-500 ml-1">ms</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Buffer Usage</div>
                <div className="text-2xl font-bold text-gray-900">
                  {(backpressure.bufferUtilization * 100).toFixed(1)}
                  <span className="text-sm font-normal text-gray-500 ml-1">%</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Dropped Events</div>
                <div className="text-2xl font-bold text-gray-900">
                  {backpressure.droppedEvents.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Throughput</div>
                <div className="text-2xl font-bold text-gray-900">
                  {backpressure.throughput.toLocaleString()}
                  <span className="text-sm font-normal text-gray-500 ml-1">/s</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Consumers</div>
                <div className="text-2xl font-bold text-gray-900">
                  {backpressure.consumerInstances}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  trend?: number;
  color: 'blue' | 'green' | 'red' | 'purple';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, trend, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-sm text-gray-600 mb-2">{title}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{unit}</div>
      </div>
      {trend !== undefined && (
        <div className="mt-2 flex items-center gap-1">
          <svg
            className={`w-4 h-4 ${trend >= 0 ? 'text-green-500 transform rotate-180' : 'text-red-500'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <span className={`text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(trend).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
};

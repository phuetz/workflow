/**
 * Edge Monitoring Dashboard
 * Real-time monitoring of edge devices, latency, and performance metrics
 */

import React, { useState, useEffect } from 'react';
import { Activity, DollarSign, Radio, TrendingDown, Wifi, Zap } from 'lucide-react';
import type { EdgeDevice, EdgeMetrics, LatencyBenchmark, BandwidthSavings } from '../../types/edge';

export default function EdgeMonitoringDashboard() {
  const [devices, setDevices] = useState<EdgeDevice[]>([]);
  const [latencyData, setLatencyData] = useState<LatencyBenchmark | null>(null);
  const [bandwidthSavings, setBandwidthSavings] = useState<BandwidthSavings | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  useEffect(() => {
    // Simulate real-time data updates
    const interval = setInterval(() => {
      generateMockData();
    }, 3000);

    generateMockData();

    return () => clearInterval(interval);
  }, []);

  const generateMockData = () => {
    // Mock latency benchmark
    setLatencyData({
      deviceId: 'device-1',
      workflowId: 'workflow-1',
      measurements: {
        edge: [3, 5, 4, 6, 5, 7, 4, 5],
        cloud: [45, 52, 48, 55, 50, 58, 47, 51],
        hybrid: [25, 28, 26, 30, 27, 32, 24, 29]
      },
      statistics: {
        edge: { min: 3, max: 7, avg: 5, p50: 5, p95: 7, p99: 7, stdDev: 1.2 },
        cloud: { min: 45, max: 58, avg: 51, p50: 51, p95: 58, p99: 58, stdDev: 3.5 },
        hybrid: { min: 24, max: 32, avg: 27, p50: 27, p95: 32, p99: 32, stdDev: 2.1 }
      },
      improvement: {
        edgeVsCloud: 90.2,
        hybridVsCloud: 47.1
      },
      timestamp: new Date()
    });

    // Mock bandwidth savings
    setBandwidthSavings({
      deviceId: 'device-1',
      period: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      },
      baseline: {
        totalBytes: 1024 * 1024 * 500 // 500 MB
      },
      actual: {
        edgeBytes: 1024 * 1024 * 50, // 50 MB
        cloudBytes: 1024 * 1024 * 100, // 100 MB
        totalBytes: 1024 * 1024 * 150 // 150 MB
      },
      savings: {
        bytes: 1024 * 1024 * 350, // 350 MB saved
        percentage: 70,
        cost: 0.05 // $0.05 saved
      }
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Edge Latency</p>
              <p className="text-3xl font-bold mt-2">{latencyData?.statistics.edge.avg.toFixed(1) || '0'} ms</p>
              <p className="text-xs opacity-75 mt-1">
                {latencyData?.improvement.edgeVsCloud.toFixed(1)}% faster than cloud
              </p>
            </div>
            <Zap size={40} className="opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Bandwidth Saved</p>
              <p className="text-3xl font-bold mt-2">{bandwidthSavings?.savings.percentage || 0}%</p>
              <p className="text-xs opacity-75 mt-1">
                {((bandwidthSavings?.savings.bytes || 0) / 1024 / 1024).toFixed(0)} MB saved
              </p>
            </div>
            <TrendingDown size={40} className="opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Cost Savings</p>
              <p className="text-3xl font-bold mt-2">${(bandwidthSavings?.savings.cost || 0).toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-1">Last 24 hours</p>
            </div>
            <DollarSign size={40} className="opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Offline Capability</p>
              <p className="text-3xl font-bold mt-2">100%</p>
              <p className="text-xs opacity-75 mt-1">Always operational</p>
            </div>
            <Wifi size={40} className="opacity-80" />
          </div>
        </div>
      </div>

      {/* Latency Comparison Chart */}
      {latencyData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Activity size={20} />
            <span>Latency Comparison (Edge vs Cloud)</span>
          </h3>

          <div className="space-y-4">
            {/* Edge */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-600">Edge</span>
                <span className="text-sm font-bold">{latencyData.statistics.edge.avg.toFixed(1)} ms avg</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div
                  className="bg-blue-500 h-4 rounded-full flex items-center justify-end pr-2"
                  style={{ width: `${(latencyData.statistics.edge.avg / latencyData.statistics.cloud.avg) * 100}%` }}
                >
                  <span className="text-xs text-white font-semibold">
                    {latencyData.statistics.edge.avg.toFixed(1)}ms
                  </span>
                </div>
              </div>
            </div>

            {/* Hybrid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-600">Hybrid</span>
                <span className="text-sm font-bold">{latencyData.statistics.hybrid.avg.toFixed(1)} ms avg</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div
                  className="bg-purple-500 h-4 rounded-full flex items-center justify-end pr-2"
                  style={{ width: `${(latencyData.statistics.hybrid.avg / latencyData.statistics.cloud.avg) * 100}%` }}
                >
                  <span className="text-xs text-white font-semibold">
                    {latencyData.statistics.hybrid.avg.toFixed(1)}ms
                  </span>
                </div>
              </div>
            </div>

            {/* Cloud */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Cloud</span>
                <span className="text-sm font-bold">{latencyData.statistics.cloud.avg.toFixed(1)} ms avg</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div className="bg-gray-500 h-4 rounded-full flex items-center justify-end pr-2" style={{ width: '100%' }}>
                  <span className="text-xs text-white font-semibold">
                    {latencyData.statistics.cloud.avg.toFixed(1)}ms
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              Edge execution is {latencyData.improvement.edgeVsCloud.toFixed(1)}% faster than cloud
            </p>
          </div>
        </div>
      )}

      {/* Bandwidth Savings */}
      {bandwidthSavings && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <TrendingDown size={20} />
            <span>Bandwidth Optimization</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <p className="text-sm text-gray-500 mb-2">Baseline (Cloud Only)</p>
              <p className="text-2xl font-bold">{(bandwidthSavings.baseline.totalBytes / 1024 / 1024).toFixed(0)} MB</p>
            </div>

            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-gray-500 mb-2">Actual (Edge + Cloud)</p>
              <p className="text-2xl font-bold text-green-600">{(bandwidthSavings.actual.totalBytes / 1024 / 1024).toFixed(0)} MB</p>
            </div>

            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-500 mb-2">Savings</p>
              <p className="text-2xl font-bold text-blue-600">{(bandwidthSavings.savings.bytes / 1024 / 1024).toFixed(0)} MB</p>
              <p className="text-sm text-blue-500 mt-1">{bandwidthSavings.savings.percentage}% reduction</p>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Metrics Stream */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Radio size={20} />
          <span>Real-time Metrics</span>
        </h3>

        <div className="space-y-2 font-mono text-sm">
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-750 rounded">
            <span className="text-gray-600">Edge Executions</span>
            <span className="text-green-600 font-semibold">1,247 /sec</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-750 rounded">
            <span className="text-gray-600">Network Latency</span>
            <span className="text-blue-600 font-semibold">5.2 ms</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-750 rounded">
            <span className="text-gray-600">Sync Lag</span>
            <span className="text-green-600 font-semibold">2.1 sec</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-750 rounded">
            <span className="text-gray-600">Offline Buffer</span>
            <span className="text-orange-600 font-semibold">0 events</span>
          </div>
        </div>
      </div>
    </div>
  );
}

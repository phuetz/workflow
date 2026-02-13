/**
 * Edge Device Panel
 * Real-time monitoring of edge devices with health, resources, and deployment status
 *
 * Features:
 * - Device status grid
 * - Resource utilization charts
 * - Deployment tracking
 * - Geographic distribution
 * - Alert management
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Server,
  MapPin,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Activity,
  ThermometerSun,
  Battery,
  Clock,
  Package
} from 'lucide-react';
import {
  globalEdgeDeviceMonitor,
  EdgeDeviceInfo,
  DeviceAlert
} from '../../observability/EdgeDeviceMonitor';

export const EdgeDevicePanel: React.FC = () => {
  const [devices, setDevices] = useState<EdgeDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<EdgeDeviceInfo | null>(null);
  const [alerts, setAlerts] = useState<DeviceAlert[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof globalEdgeDeviceMonitor.getStatistics>>();
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load data
   */
  const loadData = useCallback(() => {
    const filter = regionFilter !== 'all' ? { region: regionFilter } : undefined;
    setDevices(globalEdgeDeviceMonitor.getDevices(filter));
    setAlerts(globalEdgeDeviceMonitor.getAlerts());
    setStats(globalEdgeDeviceMonitor.getStatistics());
  }, [regionFilter]);

  /**
   * Auto-refresh
   */
  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadData]);

  /**
   * Listen to device events
   */
  useEffect(() => {
    globalEdgeDeviceMonitor.on('device:registered', loadData);
    globalEdgeDeviceMonitor.on('device:status_changed', loadData);
    globalEdgeDeviceMonitor.on('device:resources_updated', loadData);
    globalEdgeDeviceMonitor.on('alert:triggered', loadData);

    return () => {
      globalEdgeDeviceMonitor.off('device:registered', loadData);
      globalEdgeDeviceMonitor.off('device:status_changed', loadData);
      globalEdgeDeviceMonitor.off('device:resources_updated', loadData);
      globalEdgeDeviceMonitor.off('alert:triggered', loadData);
    };
  }, [loadData]);

  /**
   * Get status icon
   */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'offline':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'maintenance':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Server className="w-4 h-4 text-gray-400" />;
    }
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'offline':
        return 'bg-red-100 text-red-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'maintenance':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Get health color
   */
  const getHealthColor = (status: string): string => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  /**
   * Get unique regions
   */
  const regions = Array.from(new Set(devices.map(d => d.region)));

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Edge Devices</h2>
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <Activity className="w-3 h-3 animate-pulse" />
            Live
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-5 gap-4 mb-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Server className="w-6 h-6 mx-auto mb-1 text-blue-500" />
              <p className="text-xl font-bold text-blue-900">{stats.totalDevices}</p>
              <p className="text-xs text-blue-600">Total Devices</p>
            </div>

            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Wifi className="w-6 h-6 mx-auto mb-1 text-green-500" />
              <p className="text-xl font-bold text-green-900">{stats.onlineDevices}</p>
              <p className="text-xs text-green-600">Online</p>
            </div>

            <div className="text-center p-3 bg-red-50 rounded-lg">
              <WifiOff className="w-6 h-6 mx-auto mb-1 text-red-500" />
              <p className="text-xl font-bold text-red-900">{stats.offlineDevices}</p>
              <p className="text-xs text-red-600">Offline</p>
            </div>

            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
              <p className="text-xl font-bold text-yellow-900">{stats.activeAlerts}</p>
              <p className="text-xs text-yellow-600">Alerts</p>
            </div>

            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Cpu className="w-6 h-6 mx-auto mb-1 text-purple-500" />
              <p className="text-xl font-bold text-purple-900">
                {stats.avgCpuUsage.toFixed(0)}%
              </p>
              <p className="text-xs text-purple-600">Avg CPU</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Regions</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Device Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {devices.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <Server className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No devices found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {devices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => setSelectedDevice(device)}
                  className={`p-4 text-left rounded-lg border transition-all ${
                    selectedDevice?.deviceId === device.deviceId
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(device.status)}
                      <span className="font-medium text-gray-900 text-sm truncate">
                        {device.name}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(device.status)}`}>
                      {device.status}
                    </span>
                  </div>

                  {/* Location */}
                  {device.location && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{device.region}</span>
                    </div>
                  )}

                  {/* Resources */}
                  <div className="space-y-2">
                    {/* CPU */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">CPU</span>
                        <span className="font-medium text-gray-900">
                          {device.resources.cpuPercent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            device.resources.cpuPercent > 80
                              ? 'bg-red-500'
                              : device.resources.cpuPercent > 60
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${device.resources.cpuPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Memory */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">Memory</span>
                        <span className="font-medium text-gray-900">
                          {device.resources.memoryPercent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            device.resources.memoryPercent > 80
                              ? 'bg-red-500'
                              : device.resources.memoryPercent > 60
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${device.resources.memoryPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Disk */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">Disk</span>
                        <span className="font-medium text-gray-900">
                          {device.resources.diskPercent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            device.resources.diskPercent > 80
                              ? 'bg-red-500'
                              : device.resources.diskPercent > 60
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${device.resources.diskPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Health Indicators */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200">
                    {device.health.temperature && (
                      <div className={`flex items-center gap-1 ${getHealthColor(
                        device.health.temperature > 70 ? 'critical' : 'healthy'
                      )}`}>
                        <ThermometerSun className="w-3 h-3" />
                        <span className="text-xs">{device.health.temperature}°C</span>
                      </div>
                    )}

                    {device.health.batteryLevel !== undefined && (
                      <div className={`flex items-center gap-1 ${getHealthColor(
                        device.health.batteryLevel < 20 ? 'warning' : 'healthy'
                      )}`}>
                        <Battery className="w-3 h-3" />
                        <span className="text-xs">{device.health.batteryLevel}%</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Device Details Sidebar */}
        {selectedDevice && (
          <div className="w-96 border-l border-gray-200 overflow-y-auto p-6 bg-gray-50">
            <div className="space-y-6">
              {/* Device Info */}
              <div className="bg-white rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Device Information
                </h3>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Device ID</p>
                    <p className="text-sm font-medium text-gray-900 mt-1 break-all">
                      {selectedDevice.deviceId}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedDevice.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Region</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedDevice.region}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getStatusColor(selectedDevice.status)}`}>
                      {selectedDevice.status}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Last Seen</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {new Date(selectedDevice.lastSeen).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Deployment Status */}
              <div className="bg-white rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Deployment
                </h3>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Version</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedDevice.deployment.version || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${
                      selectedDevice.deployment.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : selectedDevice.deployment.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedDevice.deployment.status}
                    </span>
                  </div>

                  {selectedDevice.deployment.syncLag !== undefined && (
                    <div>
                      <p className="text-sm text-gray-500">Sync Lag</p>
                      <p className={`text-sm font-medium mt-1 ${
                        selectedDevice.deployment.syncLag > 60000
                          ? 'text-red-600'
                          : 'text-gray-900'
                      }`}>
                        {Math.round(selectedDevice.deployment.syncLag / 1000)}s
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Capabilities */}
              <div className="bg-white rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Capabilities
                </h3>

                <div className="flex flex-wrap gap-2">
                  {selectedDevice.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Alerts */}
              {alerts.filter(a => a.deviceId === selectedDevice.deviceId && !a.resolvedAt).length > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Active Alerts
                  </h3>

                  <div className="space-y-2">
                    {alerts
                      .filter(a => a.deviceId === selectedDevice.deviceId && !a.resolvedAt)
                      .map((alert) => (
                        <div
                          key={alert.id}
                          className="p-3 bg-white rounded border border-red-200"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-red-900">
                              {alert.type}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              alert.severity === 'critical'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {alert.severity}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700">{alert.message}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EdgeDevicePanel;

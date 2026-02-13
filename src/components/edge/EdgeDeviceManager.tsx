/**
 * Edge Device Manager Component
 * Comprehensive UI for managing edge devices, groups, and fleet operations
 */

import React, { useState, useEffect } from 'react';
import {
  Activity, CheckCircle, Clock, Plus, RefreshCw, Server,
  Settings, XCircle
} from 'lucide-react';
import { logger } from '../../services/SimpleLogger';
import { createDeviceManager } from '../../edge/DeviceManager';
import type { EdgeDevice, EdgeMetrics, DeviceGroup } from '../../types/edge';

const deviceManager = createDeviceManager();

export default function EdgeDeviceManager() {
  const [devices, setDevices] = useState<EdgeDevice[]>([]);
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<EdgeDevice | null>(null);
  const [filter, setFilter] = useState<{
    type?: EdgeDevice['type'];
    status?: EdgeDevice['status'];
    platform?: EdgeDevice['platform'];
  }>({});
  const [fleetStats, setFleetStats] = useState<ReturnType<typeof deviceManager.getFleetStats> | null>(null);

  useEffect(() => {
    loadDevices();
    deviceManager.start();

    const interval = setInterval(loadDevices, 10000);
    return () => {
      clearInterval(interval);
      deviceManager.stop();
    };
  }, []);

  const loadDevices = () => {
    const allDevices = deviceManager.getDevices(filter);
    setDevices(allDevices);
    setFleetStats(deviceManager.getFleetStats());
  };

  const handleRegisterDevice = async () => {
    try {
      const newDevice = await deviceManager.registerDevice({
        name: `Edge Device ${devices.length + 1}`,
        type: 'raspberry-pi',
        platform: 'linux-arm64',
        status: 'online',
        capabilities: {
          cpu: { cores: 4, architecture: 'arm64', clockSpeed: 1500 },
          memory: { total: 4096, available: 2048 },
          storage: { total: 64, available: 32 },
          network: { type: 'wifi', bandwidth: 100, latency: 5 }
        },
        metadata: {}
      });

      setDevices([...devices, newDevice]);
      logger.info('Device registered successfully');
    } catch (error) {
      logger.error('Failed to register device', { context: { error } });
    }
  };

  const handleHealthCheck = async (deviceId: string) => {
    const result = await deviceManager.healthCheck(deviceId);
    logger.info(`Health check for ${deviceId}:`, { context: result });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Fleet Statistics */}
      {fleetStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Devices</p>
                <p className="text-3xl font-bold mt-2">{fleetStats.totalDevices}</p>
              </div>
              <Server className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Online</p>
                <p className="text-3xl font-bold mt-2 text-green-500">{fleetStats.onlineDevices}</p>
              </div>
              <CheckCircle className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Offline</p>
                <p className="text-3xl font-bold mt-2 text-gray-500">{fleetStats.offlineDevices}</p>
              </div>
              <XCircle className="text-gray-500" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Uptime</p>
                <p className="text-3xl font-bold mt-2">{Math.floor(fleetStats.averageUptime / 3600)}h</p>
              </div>
              <Clock className="text-purple-500" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <select
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              value={filter.type || ''}
              onChange={(e) => setFilter({ ...filter, type: e.target.value ? e.target.value as EdgeDevice['type'] : undefined })}
            >
              <option value="">All Types</option>
              <option value="raspberry-pi">Raspberry Pi</option>
              <option value="industrial-gateway">Industrial Gateway</option>
              <option value="iot-hub">IoT Hub</option>
              <option value="arm-server">ARM Server</option>
            </select>

            <select
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              value={filter.status || ''}
              onChange={(e) => setFilter({ ...filter, status: e.target.value ? e.target.value as EdgeDevice['status'] : undefined })}
            >
              <option value="">All Statuses</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="syncing">Syncing</option>
              <option value="error">Error</option>
            </select>

            <button
              onClick={loadDevices}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2"
            >
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
          </div>

          <button
            onClick={handleRegisterDevice}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Register Device</span>
          </button>
        </div>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map(device => (
          <div
            key={device.id}
            className={`bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 cursor-pointer transition-all hover:shadow-lg ${
              selectedDevice?.id === device.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedDevice(device)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">{device.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{device.type.replace(/-/g, ' ')}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                device.status === 'online' ? 'bg-green-100 text-green-800' :
                device.status === 'offline' ? 'bg-gray-100 text-gray-800' :
                device.status === 'syncing' ? 'bg-blue-100 text-blue-800' :
                'bg-red-100 text-red-800'
              }`}>
                {device.status}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Platform</span>
                <span className="font-medium">{device.platform}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">CPU Cores</span>
                <span className="font-medium">{device.capabilities.cpu.cores}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Memory</span>
                <span className="font-medium">{device.capabilities.memory.total} MB</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Network</span>
                <span className="font-medium">{device.capabilities.network.type}</span>
              </div>

              {device.location && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Location</span>
                  <span className="font-medium text-xs">{device.location.name}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleHealthCheck(device.id);
                }}
                className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm flex items-center justify-center space-x-1"
              >
                <Activity size={14} />
                <span>Health Check</span>
              </button>
              <button className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <Settings size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {devices.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
          <Server className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold mb-2">No Devices Found</h3>
          <p className="text-gray-500 mb-4">Get started by registering your first edge device</p>
          <button
            onClick={handleRegisterDevice}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Register First Device
          </button>
        </div>
      )}
    </div>
  );
}

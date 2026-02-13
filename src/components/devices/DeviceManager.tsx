/**
 * Device Manager Component
 * Manage registered devices for push notifications
 */

import React, { useState, useEffect } from 'react';
import { DeviceToken, PushPlatform } from '../../types/push';
import { logger } from '../../services/SimpleLogger';
import { useToast } from '../ui/Toast';

interface DeviceManagerProps {
  userId: string;
  onDeviceRemoved?: (deviceId: string) => void;
}

export const DeviceManager: React.FC<DeviceManagerProps> = ({ userId, onDeviceRemoved }) => {
  const toast = useToast();
  const [devices, setDevices] = useState<DeviceToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingDevice, setRemovingDevice] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, [userId]);

  const loadDevices = async () => {
    try {
      // In production, load from API
      // const response = await fetch(`/api/push/devices/${userId}`);
      // const data = await response.json();

      // For now, use mock data
      const mockDevices: DeviceToken[] = [
        {
          id: '1',
          userId,
          token: 'mock_ios_token_1234567890abcdef',
          platform: 'ios',
          deviceName: 'iPhone 14 Pro',
          deviceModel: 'iPhone15,2',
          osVersion: '17.0',
          appVersion: '1.2.0',
          locale: 'en',
          timezone: 'America/New_York',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-10-15'),
          lastUsed: new Date('2024-10-15'),
          isActive: true,
        },
        {
          id: '2',
          userId,
          token: 'mock_android_token_abcdef1234567890',
          platform: 'android',
          deviceName: 'Samsung Galaxy S23',
          deviceModel: 'SM-S911U',
          osVersion: '14',
          appVersion: '1.2.0',
          locale: 'en',
          timezone: 'America/New_York',
          createdAt: new Date('2024-02-20'),
          updatedAt: new Date('2024-10-14'),
          lastUsed: new Date('2024-10-14'),
          isActive: true,
        },
      ];

      setDevices(mockDevices);
      setLoading(false);
    } catch (error) {
      logger.error('Failed to load devices:', error);
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to remove this device? You will no longer receive push notifications on it.')) {
      return;
    }

    setRemovingDevice(deviceId);
    try {
      // In production, call API
      // await fetch(`/api/push/devices/${deviceId}`, { method: 'DELETE' });

      setDevices(prev => prev.filter(d => d.id !== deviceId));
      onDeviceRemoved?.(deviceId);
      toast.success('Device removed successfully');
    } catch (error) {
      logger.error('Failed to remove device:', error);
      toast.error('Failed to remove device');
    } finally {
      setRemovingDevice(null);
    }
  };

  const getPlatformIcon = (platform: PushPlatform): string => {
    switch (platform) {
      case 'ios':
        return '📱';
      case 'android':
        return '🤖';
      case 'web':
        return '🌐';
      default:
        return '📱';
    }
  };

  const getPlatformColor = (platform: PushPlatform): string => {
    switch (platform) {
      case 'ios':
        return 'bg-gray-100 text-gray-800';
      case 'android':
        return 'bg-green-100 text-green-800';
      case 'web':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Registered Devices</h2>
        <span className="text-sm text-gray-600">
          {devices.length} device{devices.length !== 1 ? 's' : ''}
        </span>
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📱</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No devices registered</h3>
          <p className="text-gray-600">
            Install the mobile app and sign in to receive push notifications.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {devices.map(device => (
            <div
              key={device.id}
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="text-3xl">{getPlatformIcon(device.platform)}</div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">
                        {device.deviceName || 'Unknown Device'}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${getPlatformColor(
                          device.platform
                        )}`}
                      >
                        {device.platform.toUpperCase()}
                      </span>
                      {!device.isActive && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      {device.deviceModel && (
                        <div>Model: {device.deviceModel}</div>
                      )}
                      {device.osVersion && (
                        <div>OS Version: {device.osVersion}</div>
                      )}
                      {device.appVersion && (
                        <div>App Version: {device.appVersion}</div>
                      )}
                      <div>
                        Registered: {formatDate(device.createdAt)}
                      </div>
                      {device.lastUsed && (
                        <div>
                          Last used: {formatRelativeTime(device.lastUsed)}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-gray-500 font-mono truncate max-w-md">
                      Token: {device.token.substring(0, 40)}...
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveDevice(device.id)}
                  disabled={removingDevice === device.id}
                  className="ml-4 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {removingDevice === device.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">About Device Management</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Devices are automatically registered when you sign in to the mobile app</li>
          <li>• You can have multiple devices registered at the same time</li>
          <li>• Removing a device will stop push notifications on that device only</li>
          <li>• Inactive devices may have invalid or expired tokens</li>
        </ul>
      </div>
    </div>
  );
};

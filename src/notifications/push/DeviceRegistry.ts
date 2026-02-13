/**
 * Device Registry
 * Manages device tokens for push notifications
 */

import { EventEmitter } from 'events';
import { generateUUID } from '../../utils/uuid';
import { DeviceToken, PushPlatform } from '../../types/push';

export interface RegisterDeviceParams {
  userId: string;
  token: string;
  platform: PushPlatform;
  deviceName?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  locale?: string;
  timezone?: string;
}

export interface DeviceRegistryStats {
  totalDevices: number;
  activeDevices: number;
  devicesByPlatform: Record<PushPlatform, number>;
  devicesByUser: Record<string, number>;
}

export class DeviceRegistry extends EventEmitter {
  private devices: Map<string, DeviceToken>;
  private userDevices: Map<string, Set<string>>;
  private tokenIndex: Map<string, string>; // token -> deviceId

  constructor() {
    super();
    this.devices = new Map();
    this.userDevices = new Map();
    this.tokenIndex = new Map();
  }

  /**
   * Register a new device
   */
  async registerDevice(params: RegisterDeviceParams): Promise<DeviceToken> {
    // Check if token already exists
    const existingDeviceId = this.tokenIndex.get(params.token);
    if (existingDeviceId) {
      return this.updateDevice(existingDeviceId, params);
    }

    // Create new device
    const deviceId = generateUUID();
    const device: DeviceToken = {
      id: deviceId,
      userId: params.userId,
      token: params.token,
      platform: params.platform,
      deviceName: params.deviceName,
      deviceModel: params.deviceModel,
      osVersion: params.osVersion,
      appVersion: params.appVersion,
      locale: params.locale || 'en',
      timezone: params.timezone || 'UTC',
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    this.devices.set(deviceId, device);
    this.tokenIndex.set(params.token, deviceId);

    // Add to user devices
    if (!this.userDevices.has(params.userId)) {
      this.userDevices.set(params.userId, new Set());
    }
    this.userDevices.get(params.userId)!.add(deviceId);

    this.emit('device:registered', device);
    return device;
  }

  /**
   * Update existing device
   */
  async updateDevice(
    deviceId: string,
    params: Partial<RegisterDeviceParams>
  ): Promise<DeviceToken> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    // Update device properties
    if (params.deviceName !== undefined) device.deviceName = params.deviceName;
    if (params.deviceModel !== undefined) device.deviceModel = params.deviceModel;
    if (params.osVersion !== undefined) device.osVersion = params.osVersion;
    if (params.appVersion !== undefined) device.appVersion = params.appVersion;
    if (params.locale !== undefined) device.locale = params.locale;
    if (params.timezone !== undefined) device.timezone = params.timezone;

    device.updatedAt = new Date();
    device.lastUsed = new Date();
    device.isActive = true;

    this.devices.set(deviceId, device);
    this.emit('device:updated', device);
    return device;
  }

  /**
   * Refresh device token (when FCM/APNs rotates it)
   */
  async refreshToken(oldToken: string, newToken: string): Promise<DeviceToken> {
    const deviceId = this.tokenIndex.get(oldToken);
    if (!deviceId) {
      throw new Error(`Device not found for token: ${oldToken}`);
    }

    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    // Update token
    device.token = newToken;
    device.updatedAt = new Date();

    // Update index
    this.tokenIndex.delete(oldToken);
    this.tokenIndex.set(newToken, deviceId);

    this.devices.set(deviceId, device);
    this.emit('device:token_refreshed', device, oldToken);
    return device;
  }

  /**
   * Unregister device
   */
  async unregisterDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return;
    }

    // Remove from maps
    this.devices.delete(deviceId);
    this.tokenIndex.delete(device.token);

    // Remove from user devices
    const userDevices = this.userDevices.get(device.userId);
    if (userDevices) {
      userDevices.delete(deviceId);
      if (userDevices.size === 0) {
        this.userDevices.delete(device.userId);
      }
    }

    this.emit('device:unregistered', device);
  }

  /**
   * Unregister device by token
   */
  async unregisterDeviceByToken(token: string): Promise<void> {
    const deviceId = this.tokenIndex.get(token);
    if (deviceId) {
      await this.unregisterDevice(deviceId);
    }
  }

  /**
   * Mark device as inactive (on send failure)
   */
  async markDeviceInactive(deviceId: string, reason?: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return;
    }

    device.isActive = false;
    device.updatedAt = new Date();
    this.devices.set(deviceId, device);

    this.emit('device:inactive', device, reason);
  }

  /**
   * Get device by ID
   */
  async getDevice(deviceId: string): Promise<DeviceToken | null> {
    return this.devices.get(deviceId) || null;
  }

  /**
   * Get device by token
   */
  async getDeviceByToken(token: string): Promise<DeviceToken | null> {
    const deviceId = this.tokenIndex.get(token);
    return deviceId ? this.devices.get(deviceId) || null : null;
  }

  /**
   * Get all devices for a user
   */
  async getUserDevices(userId: string, activeOnly = true): Promise<DeviceToken[]> {
    const deviceIds = this.userDevices.get(userId);
    if (!deviceIds) {
      return [];
    }

    const devices: DeviceToken[] = [];
    for (const deviceId of deviceIds) {
      const device = this.devices.get(deviceId);
      if (device && (!activeOnly || device.isActive)) {
        devices.push(device);
      }
    }

    return devices;
  }

  /**
   * Get user device tokens
   */
  async getUserDeviceTokens(
    userId: string,
    platform?: PushPlatform,
    activeOnly = true
  ): Promise<string[]> {
    const devices = await this.getUserDevices(userId, activeOnly);
    return devices
      .filter(d => !platform || d.platform === platform)
      .map(d => d.token);
  }

  /**
   * Get multiple users' device tokens
   */
  async getMultipleUsersDeviceTokens(
    userIds: string[],
    platform?: PushPlatform,
    activeOnly = true
  ): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();

    for (const userId of userIds) {
      const tokens = await this.getUserDeviceTokens(userId, platform, activeOnly);
      if (tokens.length > 0) {
        result.set(userId, tokens);
      }
    }

    return result;
  }

  /**
   * Get devices by platform
   */
  async getDevicesByPlatform(platform: PushPlatform): Promise<DeviceToken[]> {
    const devices: DeviceToken[] = [];
    for (const device of this.devices.values()) {
      if (device.platform === platform && device.isActive) {
        devices.push(device);
      }
    }
    return devices;
  }

  /**
   * Clean up inactive devices
   */
  async cleanupInactiveDevices(daysInactive = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    let removedCount = 0;
    const devicesToRemove: string[] = [];

    for (const [deviceId, device] of this.devices) {
      if (
        !device.isActive &&
        device.updatedAt < cutoffDate
      ) {
        devicesToRemove.push(deviceId);
      }
    }

    for (const deviceId of devicesToRemove) {
      await this.unregisterDevice(deviceId);
      removedCount++;
    }

    this.emit('devices:cleaned', removedCount);
    return removedCount;
  }

  /**
   * Get registry statistics
   */
  async getStats(): Promise<DeviceRegistryStats> {
    const stats: DeviceRegistryStats = {
      totalDevices: this.devices.size,
      activeDevices: 0,
      devicesByPlatform: {
        ios: 0,
        android: 0,
        web: 0,
      },
      devicesByUser: {},
    };

    for (const device of this.devices.values()) {
      if (device.isActive) {
        stats.activeDevices++;
      }

      stats.devicesByPlatform[device.platform]++;

      if (!stats.devicesByUser[device.userId]) {
        stats.devicesByUser[device.userId] = 0;
      }
      stats.devicesByUser[device.userId]++;
    }

    return stats;
  }

  /**
   * Export devices for persistence
   */
  async exportDevices(): Promise<DeviceToken[]> {
    return Array.from(this.devices.values());
  }

  /**
   * Import devices from persistence
   */
  async importDevices(devices: DeviceToken[]): Promise<void> {
    for (const device of devices) {
      this.devices.set(device.id, device);
      this.tokenIndex.set(device.token, device.id);

      if (!this.userDevices.has(device.userId)) {
        this.userDevices.set(device.userId, new Set());
      }
      this.userDevices.get(device.userId)!.add(device.id);
    }

    this.emit('devices:imported', devices.length);
  }

  /**
   * Clear all devices (for testing)
   */
  async clearAll(): Promise<void> {
    this.devices.clear();
    this.userDevices.clear();
    this.tokenIndex.clear();
    this.emit('devices:cleared');
  }
}

// Singleton instance
export const deviceRegistry = new DeviceRegistry();

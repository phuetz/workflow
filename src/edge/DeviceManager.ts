/**
 * Edge Device Manager
 * Manages device registration, health monitoring, and fleet operations
 * Supports OTA updates, device grouping, and remote management
 */

import { logger } from '../services/SimpleLogger';
import type {
  EdgeDevice,
  EdgeMetrics,
  DeviceGroup,
  OTAUpdate,
  EdgeDeployment
} from '../types/edge';

export interface DeviceDiscoveryConfig {
  protocol: 'mdns' | 'upnp' | 'bluetooth' | 'manual';
  scanInterval: number; // seconds
  autoRegister: boolean;
}

export interface HealthCheckConfig {
  interval: number; // seconds
  timeout: number; // seconds
  failureThreshold: number;
  successThreshold: number;
}

export class DeviceManager {
  private devices: Map<string, EdgeDevice> = new Map();
  private deviceMetrics: Map<string, EdgeMetrics[]> = new Map(); // Historical metrics
  private groups: Map<string, DeviceGroup> = new Map();
  private otaUpdates: Map<string, OTAUpdate> = new Map();
  private deployments: Map<string, EdgeDeployment> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private discoveryInterval?: NodeJS.Timeout;

  constructor(
    private discoveryConfig: DeviceDiscoveryConfig = {
      protocol: 'mdns',
      scanInterval: 60,
      autoRegister: false
    },
    private healthCheckConfig: HealthCheckConfig = {
      interval: 30,
      timeout: 10,
      failureThreshold: 3,
      successThreshold: 1
    }
  ) {
    logger.info('Device Manager initialized', {
      context: {
        discoveryProtocol: discoveryConfig.protocol,
        healthCheckInterval: healthCheckConfig.interval
      }
    });
  }

  /**
   * Start device management
   */
  start(): void {
    logger.info('Starting device management');

    // Start health monitoring
    this.startHealthMonitoring();

    // Start device discovery
    if (this.discoveryConfig.autoRegister) {
      this.startDeviceDiscovery();
    }
  }

  /**
   * Stop device management
   */
  stop(): void {
    logger.info('Stopping device management');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
  }

  /**
   * Register a new device
   */
  async registerDevice(device: Omit<EdgeDevice, 'id' | 'createdAt' | 'lastSeen'>): Promise<EdgeDevice> {
    const id = this.generateDeviceId(device);

    const newDevice: EdgeDevice = {
      ...device,
      id,
      createdAt: new Date(),
      lastSeen: new Date()
    };

    this.devices.set(id, newDevice);

    logger.info('Device registered', {
      context: {
        deviceId: id,
        type: device.type,
        platform: device.platform
      }
    });

    return newDevice;
  }

  /**
   * Update device information
   */
  async updateDevice(deviceId: string, updates: Partial<EdgeDevice>): Promise<EdgeDevice> {
    const device = this.devices.get(deviceId);

    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    const updated: EdgeDevice = {
      ...device,
      ...updates,
      lastSeen: new Date()
    };

    this.devices.set(deviceId, updated);

    logger.debug('Device updated', {
      context: { deviceId }
    });

    return updated;
  }

  /**
   * Unregister a device
   */
  async unregisterDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);

    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    // Remove from all groups
    for (const group of this.groups.values()) {
      group.deviceIds = group.deviceIds.filter(id => id !== deviceId);
    }

    // Remove device
    this.devices.delete(deviceId);
    this.deviceMetrics.delete(deviceId);

    logger.info('Device unregistered', {
      context: { deviceId }
    });
  }

  /**
   * Get device by ID
   */
  getDevice(deviceId: string): EdgeDevice | undefined {
    return this.devices.get(deviceId);
  }

  /**
   * Get all devices
   */
  getDevices(filter?: {
    type?: EdgeDevice['type'];
    status?: EdgeDevice['status'];
    platform?: EdgeDevice['platform'];
    groupId?: string;
  }): EdgeDevice[] {
    let devices = Array.from(this.devices.values());

    if (filter) {
      if (filter.type) {
        devices = devices.filter(d => d.type === filter.type);
      }

      if (filter.status) {
        devices = devices.filter(d => d.status === filter.status);
      }

      if (filter.platform) {
        devices = devices.filter(d => d.platform === filter.platform);
      }

      if (filter.groupId) {
        const group = this.groups.get(filter.groupId);
        if (group) {
          devices = devices.filter(d => group.deviceIds.includes(d.id));
        }
      }
    }

    return devices;
  }

  /**
   * Update device metrics
   */
  async updateMetrics(deviceId: string, metrics: EdgeMetrics): Promise<void> {
    const device = this.devices.get(deviceId);

    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    // Store historical metrics
    const history = this.deviceMetrics.get(deviceId) || [];
    history.push(metrics);

    // Keep last 1000 metrics
    if (history.length > 1000) {
      history.shift();
    }

    this.deviceMetrics.set(deviceId, history);

    // Update device last seen
    device.lastSeen = new Date();

    logger.debug('Device metrics updated', {
      context: {
        deviceId,
        cpuUsage: metrics.cpu.usage,
        memoryUsage: metrics.memory.usage
      }
    });
  }

  /**
   * Get device metrics
   */
  getMetrics(deviceId: string, limit?: number): EdgeMetrics[] {
    const metrics = this.deviceMetrics.get(deviceId) || [];

    if (limit) {
      return metrics.slice(-limit);
    }

    return metrics;
  }

  /**
   * Create device group
   */
  async createGroup(group: Omit<DeviceGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<DeviceGroup> {
    const id = this.generateId('group');

    const newGroup: DeviceGroup = {
      ...group,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.groups.set(id, newGroup);

    logger.info('Device group created', {
      context: {
        groupId: id,
        name: group.name,
        deviceCount: group.deviceIds.length
      }
    });

    return newGroup;
  }

  /**
   * Update device group
   */
  async updateGroup(groupId: string, updates: Partial<DeviceGroup>): Promise<DeviceGroup> {
    const group = this.groups.get(groupId);

    if (!group) {
      throw new Error(`Group not found: ${groupId}`);
    }

    const updated: DeviceGroup = {
      ...group,
      ...updates,
      updatedAt: new Date()
    };

    this.groups.set(groupId, updated);

    logger.info('Device group updated', {
      context: { groupId }
    });

    return updated;
  }

  /**
   * Add device to group
   */
  async addToGroup(groupId: string, deviceId: string): Promise<void> {
    const group = this.groups.get(groupId);

    if (!group) {
      throw new Error(`Group not found: ${groupId}`);
    }

    if (!this.devices.has(deviceId)) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    if (!group.deviceIds.includes(deviceId)) {
      group.deviceIds.push(deviceId);
      group.updatedAt = new Date();

      logger.info('Device added to group', {
        context: { groupId, deviceId }
      });
    }
  }

  /**
   * Remove device from group
   */
  async removeFromGroup(groupId: string, deviceId: string): Promise<void> {
    const group = this.groups.get(groupId);

    if (!group) {
      throw new Error(`Group not found: ${groupId}`);
    }

    group.deviceIds = group.deviceIds.filter(id => id !== deviceId);
    group.updatedAt = new Date();

    logger.info('Device removed from group', {
      context: { groupId, deviceId }
    });
  }

  /**
   * Create OTA update
   */
  async createOTAUpdate(update: Omit<OTAUpdate, 'id' | 'createdAt'>): Promise<OTAUpdate> {
    const id = this.generateId('ota');

    const otaUpdate: OTAUpdate = {
      ...update,
      id,
      createdAt: new Date()
    };

    this.otaUpdates.set(id, otaUpdate);

    logger.info('OTA update created', {
      context: {
        updateId: id,
        version: update.version,
        targetDevices: update.deviceIds.length
      }
    });

    // Start update process
    setTimeout(() => this.processOTAUpdate(id), 1000);

    return otaUpdate;
  }

  /**
   * Get OTA update status
   */
  getOTAUpdate(updateId: string): OTAUpdate | undefined {
    return this.otaUpdates.get(updateId);
  }

  /**
   * Perform health check on device
   */
  async healthCheck(deviceId: string): Promise<{
    healthy: boolean;
    latency: number;
    error?: string;
  }> {
    const device = this.devices.get(deviceId);

    if (!device) {
      return {
        healthy: false,
        latency: 0,
        error: 'Device not found'
      };
    }

    const startTime = Date.now();

    try {
      // Simulate health check (in production, ping device or check metrics)
      await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));

      const latency = Date.now() - startTime;

      // Check if device is responsive
      const timeSinceLastSeen = Date.now() - device.lastSeen.getTime();
      const isHealthy = timeSinceLastSeen < this.healthCheckConfig.timeout * 1000;

      if (isHealthy) {
        device.status = 'online';
      } else {
        device.status = 'offline';
      }

      return {
        healthy: isHealthy,
        latency
      };

    } catch (error) {
      device.status = 'error';

      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Discover devices on network
   */
  async discoverDevices(): Promise<EdgeDevice[]> {
    logger.info('Scanning for devices', {
      context: { protocol: this.discoveryConfig.protocol }
    });

    const discovered: EdgeDevice[] = [];

    try {
      // Simulate device discovery (in production, use actual discovery protocol)
      const mockDevices = await this.scanNetwork();

      for (const mockDevice of mockDevices) {
        if (this.discoveryConfig.autoRegister) {
          const device = await this.registerDevice(mockDevice);
          discovered.push(device);
        }
      }

      logger.info('Device discovery completed', {
        context: { discovered: discovered.length }
      });

    } catch (error) {
      logger.error('Device discovery failed', {
        context: { error: error instanceof Error ? error.message : String(error) }
      });
    }

    return discovered;
  }

  /**
   * Get fleet statistics
   */
  getFleetStats(): {
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    devicesByType: Record<string, number>;
    devicesByPlatform: Record<string, number>;
    averageUptime: number;
    totalWorkflows: number;
  } {
    const devices = Array.from(this.devices.values());

    const stats = {
      totalDevices: devices.length,
      onlineDevices: devices.filter(d => d.status === 'online').length,
      offlineDevices: devices.filter(d => d.status === 'offline').length,
      devicesByType: {} as Record<string, number>,
      devicesByPlatform: {} as Record<string, number>,
      averageUptime: 0,
      totalWorkflows: 0
    };

    // Count by type
    for (const device of devices) {
      stats.devicesByType[device.type] = (stats.devicesByType[device.type] || 0) + 1;
      stats.devicesByPlatform[device.platform] = (stats.devicesByPlatform[device.platform] || 0) + 1;
    }

    // Calculate average uptime (simplified)
    if (devices.length > 0) {
      const totalUptime = devices.reduce((sum, d) => {
        const uptime = Date.now() - d.createdAt.getTime();
        return sum + uptime;
      }, 0);

      stats.averageUptime = totalUptime / devices.length / 1000; // seconds
    }

    return stats;
  }

  // Private methods

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const device of this.devices.values()) {
        await this.healthCheck(device.id);
      }
    }, this.healthCheckConfig.interval * 1000);

    logger.debug('Health monitoring started', {
      context: { interval: this.healthCheckConfig.interval }
    });
  }

  private startDeviceDiscovery(): void {
    this.discoveryInterval = setInterval(async () => {
      await this.discoverDevices();
    }, this.discoveryConfig.scanInterval * 1000);

    logger.debug('Device discovery started', {
      context: { interval: this.discoveryConfig.scanInterval }
    });
  }

  private async processOTAUpdate(updateId: string): Promise<void> {
    const update = this.otaUpdates.get(updateId);

    if (!update) {
      return;
    }

    logger.info('Processing OTA update', {
      context: { updateId, targetDevices: update.deviceIds.length }
    });

    update.status = 'downloading';
    update.progress = 0;

    // Simulate download and installation
    const progressInterval = setInterval(() => {
      update.progress = Math.min(100, update.progress + Math.random() * 20);

      if (update.progress >= 50 && update.status === 'downloading') {
        update.status = 'installing';
      }

      if (update.progress >= 100) {
        clearInterval(progressInterval);
        update.status = 'completed';
        update.completedAt = new Date();

        logger.info('OTA update completed', {
          context: { updateId }
        });
      }
    }, 1000);
  }

  private async scanNetwork(): Promise<Array<Omit<EdgeDevice, 'id' | 'createdAt' | 'lastSeen'>>> {
    // Simulate network scan (in production, use actual discovery protocol)
    await new Promise(resolve => setTimeout(resolve, 100));

    return [];
  }

  private generateDeviceId(device: Omit<EdgeDevice, 'id' | 'createdAt' | 'lastSeen'>): string {
    const prefix = device.type.substring(0, 3);
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 6);
    return `${prefix}-${timestamp}-${random}`;
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create a device manager instance
 */
export function createDeviceManager(
  discoveryConfig?: DeviceDiscoveryConfig,
  healthCheckConfig?: HealthCheckConfig
): DeviceManager {
  return new DeviceManager(discoveryConfig, healthCheckConfig);
}

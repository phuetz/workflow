/**
 * Edge Device Monitor
 * Real-time monitoring of edge devices and their deployments
 *
 * Features:
 * - Device health status
 * - Resource usage tracking (CPU, memory, network, storage)
 * - Deployment status monitoring
 * - Sync lag detection
 * - Offline/online transitions
 */

import { EventEmitter } from 'events';
import { logger } from '../services/SimpleLogger';
import { globalMetricsCollector } from './RealTimeMetricsCollector';

/**
 * Device status
 */
export type DeviceStatus = 'online' | 'offline' | 'degraded' | 'maintenance';

/**
 * Device health
 */
export interface DeviceHealth {
  status: 'healthy' | 'warning' | 'critical';
  lastHeartbeat: number;
  uptime: number;
  temperature?: number;
  batteryLevel?: number;
}

/**
 * Device resources
 */
export interface DeviceResources {
  cpuPercent: number;
  memoryPercent: number;
  memoryMB: number;
  diskPercent: number;
  diskGB: number;
  networkRxMBps: number;
  networkTxMBps: number;
}

/**
 * Deployment info
 */
export interface DeploymentInfo {
  deploymentId: string;
  version: string;
  status: 'pending' | 'deploying' | 'active' | 'failed' | 'rollback';
  deployedAt?: number;
  lastSync?: number;
  syncLag?: number; // milliseconds
}

/**
 * Edge device info
 */
export interface EdgeDeviceInfo {
  deviceId: string;
  name: string;
  region: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  status: DeviceStatus;
  health: DeviceHealth;
  resources: DeviceResources;
  deployment: DeploymentInfo;
  capabilities: string[];
  metadata?: Record<string, unknown>;
  registeredAt: number;
  lastSeen: number;
}

/**
 * Device event
 */
export interface DeviceEvent {
  id: string;
  deviceId: string;
  type: 'status_change' | 'deployment' | 'alert' | 'metric' | 'error';
  timestamp: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  data?: unknown;
}

/**
 * Device alert
 */
export interface DeviceAlert {
  id: string;
  deviceId: string;
  type: 'resource' | 'connectivity' | 'deployment' | 'health';
  severity: 'warning' | 'critical';
  message: string;
  triggeredAt: number;
  resolvedAt?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Edge Device Monitor
 */
export class EdgeDeviceMonitor extends EventEmitter {
  private devices = new Map<string, EdgeDeviceInfo>();
  private events: DeviceEvent[] = [];
  private alerts = new Map<string, DeviceAlert>();
  private maxEventHistory = 10000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout = 60000; // 1 minute

  constructor() {
    super();
    this.startHeartbeatCheck();
    logger.info('EdgeDeviceMonitor initialized');
  }

  /**
   * Register device
   */
  registerDevice(
    deviceId: string,
    name: string,
    region: string,
    capabilities: string[],
    options?: {
      location?: EdgeDeviceInfo['location'];
      metadata?: Record<string, unknown>;
    }
  ): void {
    const now = Date.now();

    const device: EdgeDeviceInfo = {
      deviceId,
      name,
      region,
      location: options?.location,
      status: 'online',
      health: {
        status: 'healthy',
        lastHeartbeat: now,
        uptime: 0
      },
      resources: {
        cpuPercent: 0,
        memoryPercent: 0,
        memoryMB: 0,
        diskPercent: 0,
        diskGB: 0,
        networkRxMBps: 0,
        networkTxMBps: 0
      },
      deployment: {
        deploymentId: '',
        version: '',
        status: 'pending'
      },
      capabilities,
      metadata: options?.metadata,
      registeredAt: now,
      lastSeen: now
    };

    this.devices.set(deviceId, device);

    // Record event
    this.recordEvent({
      deviceId,
      type: 'status_change',
      severity: 'info',
      message: `Device ${name} registered`
    });

    // Update metrics
    this.updateRegionMetrics();

    this.emit('device:registered', { deviceId, device });

    logger.info('Edge device registered', {
      deviceId,
      name,
      region
    });
  }

  /**
   * Unregister device
   */
  unregisterDevice(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (!device) return;

    this.devices.delete(deviceId);

    // Record event
    this.recordEvent({
      deviceId,
      type: 'status_change',
      severity: 'info',
      message: `Device ${device.name} unregistered`
    });

    // Update metrics
    this.updateRegionMetrics();

    this.emit('device:unregistered', { deviceId });

    logger.info('Edge device unregistered', { deviceId });
  }

  /**
   * Update device heartbeat
   */
  heartbeat(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (!device) return;

    const now = Date.now();
    const wasOffline = device.status === 'offline';

    device.lastSeen = now;
    device.health.lastHeartbeat = now;
    device.health.uptime = now - device.registeredAt;

    // Check if device came back online
    if (wasOffline) {
      device.status = 'online';
      this.recordEvent({
        deviceId,
        type: 'status_change',
        severity: 'info',
        message: `Device ${device.name} came back online`
      });

      this.emit('device:online', { deviceId, device });

      logger.info('Device came back online', { deviceId });
    }
  }

  /**
   * Update device status
   */
  updateStatus(deviceId: string, status: DeviceStatus): void {
    const device = this.devices.get(deviceId);
    if (!device) return;

    const oldStatus = device.status;
    device.status = status;

    if (oldStatus !== status) {
      this.recordEvent({
        deviceId,
        type: 'status_change',
        severity: status === 'offline' ? 'error' : 'info',
        message: `Device status changed from ${oldStatus} to ${status}`
      });

      this.emit('device:status_changed', { deviceId, oldStatus, newStatus: status });
    }
  }

  /**
   * Update device resources
   */
  updateResources(
    deviceId: string,
    resources: Partial<DeviceResources>
  ): void {
    const device = this.devices.get(deviceId);
    if (!device) return;

    device.resources = {
      ...device.resources,
      ...resources
    };

    // Update health based on resources
    this.updateDeviceHealth(device);

    // Record metrics
    if (resources.cpuPercent !== undefined) {
      globalMetricsCollector.setGauge('edge_device_cpu_percent', resources.cpuPercent, {
        device_id: deviceId,
        region: device.region
      });
    }

    if (resources.memoryPercent !== undefined) {
      globalMetricsCollector.setGauge('edge_device_memory_percent', resources.memoryPercent, {
        device_id: deviceId,
        region: device.region
      });
    }

    if (resources.diskPercent !== undefined) {
      globalMetricsCollector.setGauge('edge_device_disk_percent', resources.diskPercent, {
        device_id: deviceId,
        region: device.region
      });
    }

    this.emit('device:resources_updated', { deviceId, resources: device.resources });
  }

  /**
   * Update device health
   */
  updateHealth(
    deviceId: string,
    health: Partial<DeviceHealth>
  ): void {
    const device = this.devices.get(deviceId);
    if (!device) return;

    device.health = {
      ...device.health,
      ...health
    };

    this.emit('device:health_updated', { deviceId, health: device.health });
  }

  /**
   * Update deployment
   */
  updateDeployment(
    deviceId: string,
    deployment: Partial<DeploymentInfo>
  ): void {
    const device = this.devices.get(deviceId);
    if (!device) return;

    const oldStatus = device.deployment.status;
    device.deployment = {
      ...device.deployment,
      ...deployment
    };

    // Check for sync lag
    if (deployment.lastSync) {
      device.deployment.syncLag = Date.now() - deployment.lastSync;

      // Alert if sync lag is too high
      if (device.deployment.syncLag > 300000) { // 5 minutes
        this.createAlert({
          deviceId,
          type: 'deployment',
          severity: 'warning',
          message: `High sync lag: ${Math.round(device.deployment.syncLag / 1000)}s`
        });
      }
    }

    if (oldStatus !== deployment.status && deployment.status) {
      this.recordEvent({
        deviceId,
        type: 'deployment',
        severity: deployment.status === 'failed' ? 'error' : 'info',
        message: `Deployment ${deployment.deploymentId} status: ${deployment.status}`
      });
    }

    this.emit('device:deployment_updated', { deviceId, deployment: device.deployment });
  }

  /**
   * Get all devices
   */
  getDevices(filter?: {
    status?: DeviceStatus[];
    region?: string;
    healthStatus?: DeviceHealth['status'][];
  }): EdgeDeviceInfo[] {
    let devices = Array.from(this.devices.values());

    if (filter) {
      if (filter.status) {
        devices = devices.filter(d => filter.status!.includes(d.status));
      }

      if (filter.region) {
        devices = devices.filter(d => d.region === filter.region);
      }

      if (filter.healthStatus) {
        devices = devices.filter(d => filter.healthStatus!.includes(d.health.status));
      }
    }

    return devices;
  }

  /**
   * Get device by ID
   */
  getDevice(deviceId: string): EdgeDeviceInfo | null {
    return this.devices.get(deviceId) || null;
  }

  /**
   * Get devices by region
   */
  getDevicesByRegion(): Map<string, EdgeDeviceInfo[]> {
    const byRegion = new Map<string, EdgeDeviceInfo[]>();

    for (const device of this.devices.values()) {
      if (!byRegion.has(device.region)) {
        byRegion.set(device.region, []);
      }
      byRegion.get(device.region)!.push(device);
    }

    return byRegion;
  }

  /**
   * Get recent events
   */
  getEvents(
    deviceId?: string,
    limit: number = 100
  ): DeviceEvent[] {
    let events = [...this.events];

    if (deviceId) {
      events = events.filter(e => e.deviceId === deviceId);
    }

    return events.slice(-limit);
  }

  /**
   * Get active alerts
   */
  getAlerts(
    deviceId?: string,
    severity?: DeviceAlert['severity'][]
  ): DeviceAlert[] {
    let alerts = Array.from(this.alerts.values()).filter(a => !a.resolvedAt);

    if (deviceId) {
      alerts = alerts.filter(a => a.deviceId === deviceId);
    }

    if (severity) {
      alerts = alerts.filter(a => severity.includes(a.severity));
    }

    return alerts;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolvedAt) return;

    alert.resolvedAt = Date.now();

    this.emit('alert:resolved', { alertId, alert });

    logger.info('Device alert resolved', { alertId });
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    degradedDevices: number;
    devicesByRegion: Record<string, number>;
    avgCpuUsage: number;
    avgMemoryUsage: number;
    avgDiskUsage: number;
    activeAlerts: number;
    criticalAlerts: number;
  } {
    const devices = Array.from(this.devices.values());
    const totalDevices = devices.length;
    const onlineDevices = devices.filter(d => d.status === 'online').length;
    const offlineDevices = devices.filter(d => d.status === 'offline').length;
    const degradedDevices = devices.filter(d => d.status === 'degraded').length;

    const devicesByRegion: Record<string, number> = {};
    for (const device of devices) {
      devicesByRegion[device.region] = (devicesByRegion[device.region] || 0) + 1;
    }

    const avgCpuUsage = devices.length > 0
      ? devices.reduce((sum, d) => sum + d.resources.cpuPercent, 0) / devices.length
      : 0;

    const avgMemoryUsage = devices.length > 0
      ? devices.reduce((sum, d) => sum + d.resources.memoryPercent, 0) / devices.length
      : 0;

    const avgDiskUsage = devices.length > 0
      ? devices.reduce((sum, d) => sum + d.resources.diskPercent, 0) / devices.length
      : 0;

    const activeAlerts = Array.from(this.alerts.values()).filter(a => !a.resolvedAt).length;
    const criticalAlerts = Array.from(this.alerts.values()).filter(
      a => !a.resolvedAt && a.severity === 'critical'
    ).length;

    return {
      totalDevices,
      onlineDevices,
      offlineDevices,
      degradedDevices,
      devicesByRegion,
      avgCpuUsage,
      avgMemoryUsage,
      avgDiskUsage,
      activeAlerts,
      criticalAlerts
    };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.events = [];
    logger.info('Device event history cleared');
  }

  /**
   * Shutdown monitor
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.removeAllListeners();
    logger.info('EdgeDeviceMonitor shutdown');
  }

  // Private methods

  private recordEvent(event: Omit<DeviceEvent, 'id' | 'timestamp'>): void {
    const fullEvent: DeviceEvent = {
      id: `${event.deviceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...event
    };

    this.events.push(fullEvent);

    // Limit history size
    if (this.events.length > this.maxEventHistory) {
      this.events = this.events.slice(-this.maxEventHistory);
    }

    this.emit('event:recorded', { event: fullEvent });
  }

  private createAlert(alert: Omit<DeviceAlert, 'id' | 'triggeredAt'>): void {
    const fullAlert: DeviceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      triggeredAt: Date.now(),
      ...alert
    };

    this.alerts.set(fullAlert.id, fullAlert);

    this.recordEvent({
      deviceId: alert.deviceId,
      type: 'alert',
      severity: alert.severity === 'critical' ? 'critical' : 'warning',
      message: `Alert: ${alert.message}`,
      data: alert
    });

    this.emit('alert:triggered', { alert: fullAlert });

    logger.warn('Device alert triggered', {
      deviceId: alert.deviceId,
      type: alert.type,
      severity: alert.severity,
      message: alert.message
    });
  }

  private updateDeviceHealth(device: EdgeDeviceInfo): void {
    let healthStatus: DeviceHealth['status'] = 'healthy';

    // Check resource thresholds
    if (
      device.resources.cpuPercent > 90 ||
      device.resources.memoryPercent > 90 ||
      device.resources.diskPercent > 95
    ) {
      healthStatus = 'critical';
      this.createAlert({
        deviceId: device.deviceId,
        type: 'resource',
        severity: 'critical',
        message: 'Critical resource usage detected'
      });
    } else if (
      device.resources.cpuPercent > 75 ||
      device.resources.memoryPercent > 75 ||
      device.resources.diskPercent > 85
    ) {
      healthStatus = 'warning';
      this.createAlert({
        deviceId: device.deviceId,
        type: 'resource',
        severity: 'warning',
        message: 'High resource usage detected'
      });
    }

    // Check temperature if available
    if (device.health.temperature && device.health.temperature > 80) {
      healthStatus = 'critical';
      this.createAlert({
        deviceId: device.deviceId,
        type: 'health',
        severity: 'critical',
        message: `High temperature: ${device.health.temperature}°C`
      });
    }

    // Check battery if available
    if (device.health.batteryLevel && device.health.batteryLevel < 10) {
      healthStatus = 'warning';
      this.createAlert({
        deviceId: device.deviceId,
        type: 'health',
        severity: 'warning',
        message: `Low battery: ${device.health.batteryLevel}%`
      });
    }

    const oldStatus = device.health.status;
    device.health.status = healthStatus;

    if (oldStatus !== healthStatus) {
      this.emit('device:health_changed', { deviceId: device.deviceId, health: device.health });
    }
  }

  private startHeartbeatCheck(): void {
    // Check heartbeats every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, 30000);
  }

  private checkHeartbeats(): void {
    const now = Date.now();

    for (const device of this.devices.values()) {
      const timeSinceHeartbeat = now - device.health.lastHeartbeat;

      if (timeSinceHeartbeat > this.heartbeatTimeout && device.status !== 'offline') {
        device.status = 'offline';

        this.recordEvent({
          deviceId: device.deviceId,
          type: 'status_change',
          severity: 'error',
          message: `Device ${device.name} went offline (no heartbeat for ${Math.round(timeSinceHeartbeat / 1000)}s)`
        });

        this.createAlert({
          deviceId: device.deviceId,
          type: 'connectivity',
          severity: 'critical',
          message: 'Device offline - no heartbeat received'
        });

        this.emit('device:offline', { deviceId: device.deviceId, device });

        logger.warn('Device went offline', {
          deviceId: device.deviceId,
          timeSinceHeartbeat
        });
      }
    }

    // Update metrics
    this.updateRegionMetrics();
  }

  private updateRegionMetrics(): void {
    const byRegion = this.getDevicesByRegion();

    for (const [region, devices] of byRegion) {
      const onlineCount = devices.filter(d => d.status === 'online').length;
      globalMetricsCollector.setGauge('edge_devices_online', onlineCount, { region });
    }
  }
}

/**
 * Global edge device monitor instance
 */
export const globalEdgeDeviceMonitor = new EdgeDeviceMonitor();

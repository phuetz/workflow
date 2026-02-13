/**
 * Push Service
 * Main service for managing push notifications
 */

import { EventEmitter } from 'events';
import { FCMProvider, FCMConfig } from './FCMProvider';
import { APNsProvider, APNsConfig } from './APNsProvider';
import { DeviceRegistry, RegisterDeviceParams } from './DeviceRegistry';
import {
  PushNotificationPayload,
  PushNotificationOptions,
  PushNotificationResult,
  PushPlatform,
  DeviceToken,
  PushNotificationType,
  PushAnalytics,
  PushDeliveryReport,
} from '../../types/push';

export interface PushServiceConfig {
  fcm?: FCMConfig;
  apns?: APNsConfig;
  defaultProvider?: 'fcm' | 'apns';
  retryAttempts?: number;
  retryDelay?: number;
  batchSize?: number;
  analytics?: boolean;
}

export class PushService extends EventEmitter {
  private fcmProvider?: FCMProvider;
  private apnsProvider?: APNsProvider;
  private deviceRegistry: DeviceRegistry;
  private config: PushServiceConfig;
  private analytics: Map<string, PushAnalytics>;
  private deliveryMetrics: {
    sent: number;
    delivered: number;
    opened: number;
    failed: number;
  };

  constructor(config: PushServiceConfig, deviceRegistry?: DeviceRegistry) {
    super();
    this.config = {
      defaultProvider: 'fcm',
      retryAttempts: 3,
      retryDelay: 1000,
      batchSize: 500,
      analytics: true,
      ...config,
    };

    this.deviceRegistry = deviceRegistry || new DeviceRegistry();
    this.analytics = new Map();
    this.deliveryMetrics = {
      sent: 0,
      delivered: 0,
      opened: 0,
      failed: 0,
    };

    this.setupProviders();
    this.setupEventListeners();
  }

  /**
   * Setup push notification providers
   */
  private setupProviders(): void {
    if (this.config.fcm) {
      this.fcmProvider = new FCMProvider(this.config.fcm);
    }

    if (this.config.apns) {
      this.apnsProvider = new APNsProvider(this.config.apns);
    }

    if (!this.fcmProvider && !this.apnsProvider) {
      throw new Error('At least one push provider (FCM or APNs) must be configured');
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen to FCM events
    if (this.fcmProvider) {
      this.fcmProvider.on('notification:sent', (result, latency) => {
        this.deliveryMetrics.sent++;
        this.deliveryMetrics.delivered++;
        this.emit('notification:sent', result, latency);
      });

      this.fcmProvider.on('notification:failed', (result, error) => {
        this.deliveryMetrics.failed++;
        this.emit('notification:failed', result, error);
      });

      this.fcmProvider.on('token:invalid', async (token) => {
        await this.deviceRegistry.unregisterDeviceByToken(token);
        this.emit('device:removed', token);
      });
    }

    // Listen to APNs events
    if (this.apnsProvider) {
      this.apnsProvider.on('notification:sent', (result, latency) => {
        this.deliveryMetrics.sent++;
        this.deliveryMetrics.delivered++;
        this.emit('notification:sent', result, latency);
      });

      this.apnsProvider.on('notification:failed', (result, error) => {
        this.deliveryMetrics.failed++;
        this.emit('notification:failed', result, error);
      });

      this.apnsProvider.on('token:invalid', async (token) => {
        await this.deviceRegistry.unregisterDeviceByToken(token);
        this.emit('device:removed', token);
      });
    }

    // Listen to device registry events
    this.deviceRegistry.on('device:registered', (device) => {
      this.emit('device:registered', device);
    });

    this.deviceRegistry.on('device:unregistered', (device) => {
      this.emit('device:unregistered', device);
    });
  }

  /**
   * Initialize push service
   */
  async initialize(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.fcmProvider) {
      promises.push(this.fcmProvider.initialize());
    }

    if (this.apnsProvider) {
      promises.push(this.apnsProvider.initialize());
    }

    await Promise.all(promises);
    this.emit('initialized');
  }

  /**
   * Register a device
   */
  async registerDevice(params: RegisterDeviceParams): Promise<DeviceToken> {
    // Validate token format
    if (!this.validateDeviceToken(params.token, params.platform)) {
      throw new Error(`Invalid device token format for platform: ${params.platform}`);
    }

    const device = await this.deviceRegistry.registerDevice(params);
    return device;
  }

  /**
   * Unregister a device
   */
  async unregisterDevice(deviceId: string): Promise<void> {
    await this.deviceRegistry.unregisterDevice(deviceId);
  }

  /**
   * Unregister device by token
   */
  async unregisterDeviceByToken(token: string): Promise<void> {
    await this.deviceRegistry.unregisterDeviceByToken(token);
  }

  /**
   * Get user devices
   */
  async getUserDevices(userId: string): Promise<DeviceToken[]> {
    return this.deviceRegistry.getUserDevices(userId);
  }

  /**
   * Send push notification to a user
   */
  async sendToUser(
    userId: string,
    payload: PushNotificationPayload,
    options: PushNotificationOptions = {}
  ): Promise<PushNotificationResult[]> {
    const devices = await this.deviceRegistry.getUserDevices(userId, true);

    if (devices.length === 0) {
      this.emit('no_devices', userId);
      return [];
    }

    // Filter by platform if specified
    let targetDevices = devices;
    if (options.platforms && options.platforms.length > 0) {
      targetDevices = devices.filter(d => options.platforms!.includes(d.platform));
    }

    if (targetDevices.length === 0) {
      return [];
    }

    // Send to all user devices
    const results = await this.sendToDevices(targetDevices, payload, options);

    // Track analytics
    if (this.config.analytics) {
      this.trackNotification(userId, payload, results);
    }

    return results;
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload,
    options: PushNotificationOptions = {}
  ): Promise<Map<string, PushNotificationResult[]>> {
    const resultsByUser = new Map<string, PushNotificationResult[]>();

    // Process in batches to avoid overwhelming the system
    const batchSize = 100;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const promises = batch.map(async (userId) => {
        const results = await this.sendToUser(userId, payload, options);
        return { userId, results };
      });

      const batchResults = await Promise.all(promises);
      for (const { userId, results } of batchResults) {
        resultsByUser.set(userId, results);
      }
    }

    return resultsByUser;
  }

  /**
   * Send push notification to specific devices
   */
  async sendToDevices(
    devices: DeviceToken[],
    payload: PushNotificationPayload,
    options: PushNotificationOptions = {}
  ): Promise<PushNotificationResult[]> {
    // Group devices by platform
    const devicesByPlatform = this.groupDevicesByPlatform(devices);

    const allResults: PushNotificationResult[] = [];

    // Send to iOS devices
    if (devicesByPlatform.ios.length > 0) {
      const iosResults = await this.sendToIOSDevices(
        devicesByPlatform.ios,
        payload,
        options
      );
      allResults.push(...iosResults);
    }

    // Send to Android devices
    if (devicesByPlatform.android.length > 0) {
      const androidResults = await this.sendToAndroidDevices(
        devicesByPlatform.android,
        payload,
        options
      );
      allResults.push(...androidResults);
    }

    // Send to web devices
    if (devicesByPlatform.web.length > 0) {
      const webResults = await this.sendToWebDevices(
        devicesByPlatform.web,
        payload,
        options
      );
      allResults.push(...webResults);
    }

    return allResults;
  }

  /**
   * Send to iOS devices
   */
  private async sendToIOSDevices(
    devices: DeviceToken[],
    payload: PushNotificationPayload,
    options: PushNotificationOptions
  ): Promise<PushNotificationResult[]> {
    const tokens = devices.map(d => d.token);

    // Use APNs if available, otherwise use FCM
    if (this.apnsProvider && this.config.defaultProvider === 'apns') {
      return this.apnsProvider.sendToMultipleDevices(tokens, payload, options);
    } else if (this.fcmProvider) {
      return this.fcmProvider.sendToMultipleDevices(tokens, payload, options);
    }

    throw new Error('No provider available for iOS devices');
  }

  /**
   * Send to Android devices
   */
  private async sendToAndroidDevices(
    devices: DeviceToken[],
    payload: PushNotificationPayload,
    options: PushNotificationOptions
  ): Promise<PushNotificationResult[]> {
    const tokens = devices.map(d => d.token);

    if (!this.fcmProvider) {
      throw new Error('FCM provider not configured for Android devices');
    }

    return this.fcmProvider.sendToMultipleDevices(tokens, payload, options);
  }

  /**
   * Send to web devices
   */
  private async sendToWebDevices(
    devices: DeviceToken[],
    payload: PushNotificationPayload,
    options: PushNotificationOptions
  ): Promise<PushNotificationResult[]> {
    const tokens = devices.map(d => d.token);

    if (!this.fcmProvider) {
      throw new Error('FCM provider not configured for web push');
    }

    return this.fcmProvider.sendToMultipleDevices(tokens, payload, options);
  }

  /**
   * Send to topic
   */
  async sendToTopic(
    topic: string,
    payload: PushNotificationPayload,
    options: PushNotificationOptions = {}
  ): Promise<PushNotificationResult> {
    if (!this.fcmProvider) {
      throw new Error('FCM provider required for topic messaging');
    }

    return this.fcmProvider.sendToTopic(topic, payload, options);
  }

  /**
   * Subscribe devices to topic
   */
  async subscribeToTopic(deviceTokens: string[], topic: string): Promise<void> {
    if (!this.fcmProvider) {
      throw new Error('FCM provider required for topic subscriptions');
    }

    await this.fcmProvider.subscribeToTopic(deviceTokens, topic);
  }

  /**
   * Unsubscribe devices from topic
   */
  async unsubscribeFromTopic(deviceTokens: string[], topic: string): Promise<void> {
    if (!this.fcmProvider) {
      throw new Error('FCM provider required for topic subscriptions');
    }

    await this.fcmProvider.unsubscribeFromTopic(deviceTokens, topic);
  }

  /**
   * Group devices by platform
   */
  private groupDevicesByPlatform(devices: DeviceToken[]): Record<PushPlatform, DeviceToken[]> {
    return {
      ios: devices.filter(d => d.platform === 'ios'),
      android: devices.filter(d => d.platform === 'android'),
      web: devices.filter(d => d.platform === 'web'),
    };
  }

  /**
   * Validate device token
   */
  private validateDeviceToken(token: string, platform: PushPlatform): boolean {
    if (platform === 'ios' && this.apnsProvider) {
      return this.apnsProvider.validateToken(token);
    }

    if (this.fcmProvider) {
      return this.fcmProvider.validateToken(token);
    }

    return true; // If no provider, assume valid
  }

  /**
   * Track notification for analytics
   */
  private trackNotification(
    userId: string,
    payload: PushNotificationPayload,
    results: PushNotificationResult[]
  ): void {
    for (const result of results) {
      const analytics: PushAnalytics = {
        notificationId: result.id,
        deviceToken: result.deviceToken,
        platform: result.platform,
        type: payload.type,
        sentAt: new Date(),
        deliveredAt: result.success ? new Date() : undefined,
        failedAt: !result.success ? new Date() : undefined,
        error: result.error?.message,
      };

      this.analytics.set(result.id, analytics);
    }
  }

  /**
   * Record notification opened
   */
  async recordNotificationOpened(notificationId: string): Promise<void> {
    const analytics = this.analytics.get(notificationId);
    if (analytics) {
      analytics.openedAt = new Date();
      this.deliveryMetrics.opened++;
      this.emit('notification:opened', analytics);
    }
  }

  /**
   * Get delivery report
   */
  async getDeliveryReport(
    startDate: Date,
    endDate: Date
  ): Promise<PushDeliveryReport> {
    const analyticsInRange = Array.from(this.analytics.values()).filter(
      a => a.sentAt >= startDate && a.sentAt <= endDate
    );

    const totalSent = analyticsInRange.length;
    const totalDelivered = analyticsInRange.filter(a => a.deliveredAt).length;
    const totalOpened = analyticsInRange.filter(a => a.openedAt).length;
    const totalFailed = analyticsInRange.filter(a => a.failedAt).length;

    // Calculate platform breakdown
    const platformBreakdown = ['ios', 'android', 'web'].map(platform => {
      const platformAnalytics = analyticsInRange.filter(
        a => a.platform === platform
      );
      return {
        platform: platform as PushPlatform,
        sent: platformAnalytics.length,
        delivered: platformAnalytics.filter(a => a.deliveredAt).length,
        opened: platformAnalytics.filter(a => a.openedAt).length,
        failed: platformAnalytics.filter(a => a.failedAt).length,
      };
    });

    // Calculate type breakdown
    const types = [...new Set(analyticsInRange.map(a => a.type))];
    const typeBreakdown = types.map(type => {
      const typeAnalytics = analyticsInRange.filter(a => a.type === type);
      return {
        type,
        sent: typeAnalytics.length,
        delivered: typeAnalytics.filter(a => a.deliveredAt).length,
        opened: typeAnalytics.filter(a => a.openedAt).length,
        failed: typeAnalytics.filter(a => a.failedAt).length,
      };
    });

    // Calculate average delivery time
    const deliveryTimes = analyticsInRange
      .filter(a => a.deliveredAt && a.sentAt)
      .map(a => a.deliveredAt!.getTime() - a.sentAt.getTime());

    const avgDeliveryTime = deliveryTimes.length > 0
      ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
      : 0;

    return {
      totalSent,
      totalDelivered,
      totalOpened,
      totalFailed,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
      avgDeliveryTime,
      platformBreakdown,
      typeBreakdown,
    };
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.deliveryMetrics,
      deliveryRate: this.deliveryMetrics.sent > 0
        ? (this.deliveryMetrics.delivered / this.deliveryMetrics.sent) * 100
        : 0,
      openRate: this.deliveryMetrics.delivered > 0
        ? (this.deliveryMetrics.opened / this.deliveryMetrics.delivered) * 100
        : 0,
    };
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      fcm: this.fcmProvider?.getStatus(),
      apns: this.apnsProvider?.getStatus(),
      deviceRegistry: {
        initialized: true,
      },
      metrics: this.getMetrics(),
    };
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.fcmProvider) {
      promises.push(this.fcmProvider.shutdown());
    }

    if (this.apnsProvider) {
      promises.push(this.apnsProvider.shutdown());
    }

    await Promise.all(promises);
    this.emit('shutdown');
  }
}

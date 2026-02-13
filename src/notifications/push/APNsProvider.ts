/**
 * Apple Push Notification service (APNs) Provider
 * Direct iOS push notifications (optional, FCM can also handle iOS)
 */

import { EventEmitter } from 'events';
import { generateUUID } from '../../utils/uuid';
import {
  PushNotificationPayload,
  PushNotificationOptions,
  PushNotificationResult,
  PushNotificationError,
  APNsMessage,
} from '../../types/push';

export interface APNsConfig {
  teamId: string;
  keyId: string;
  key: string | Buffer;
  bundleId: string;
  production: boolean;
}

export interface APNsConnectionConfig {
  host: string;
  port: number;
  token: {
    key: string | Buffer;
    keyId: string;
    teamId: string;
  };
}

export class APNsProvider extends EventEmitter {
  private config: APNsConfig;
  private initialized = false;
  private connectionPool: any[] = [];

  constructor(config: APNsConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize APNs provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Validate configuration
    if (!this.config.teamId || !this.config.keyId || !this.config.key) {
      throw new Error('APNs configuration incomplete');
    }

    try {
      // In production, this would initialize HTTP/2 connection to APNs
      const host = this.config.production
        ? 'api.push.apple.com'
        : 'api.sandbox.push.apple.com';

      this.initialized = true;
      this.emit('initialized', { host, port: 443 });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Send notification to a single device
   */
  async sendToDevice(
    deviceToken: string,
    payload: PushNotificationPayload,
    options: PushNotificationOptions = {}
  ): Promise<PushNotificationResult> {
    const message = this.buildAPNsMessage(deviceToken, payload, options);
    const startTime = Date.now();

    try {
      // In production, this would send via HTTP/2 to APNs
      const response = await this.sendAPNsRequest(message);

      const result: PushNotificationResult = {
        id: generateUUID(),
        success: true,
        deviceToken,
        platform: 'ios',
        messageId: response.messageId,
        timestamp: new Date(),
      };

      this.emit('notification:sent', result, Date.now() - startTime);
      return result;
    } catch (error: any) {
      const pushError = this.parseAPNsError(error);
      const result: PushNotificationResult = {
        id: generateUUID(),
        success: false,
        deviceToken,
        platform: 'ios',
        error: pushError,
        timestamp: new Date(),
      };

      this.emit('notification:failed', result, error);

      if (pushError.shouldRemoveToken) {
        this.emit('token:invalid', deviceToken);
      }

      return result;
    }
  }

  /**
   * Send notifications to multiple devices
   */
  async sendToMultipleDevices(
    deviceTokens: string[],
    payload: PushNotificationPayload,
    options: PushNotificationOptions = {}
  ): Promise<PushNotificationResult[]> {
    if (deviceTokens.length === 0) {
      return [];
    }

    // APNs doesn't have batch API, send individually
    const results = await Promise.all(
      deviceTokens.map(token => this.sendToDevice(token, payload, options))
    );

    return results;
  }

  /**
   * Build APNs message from payload
   */
  private buildAPNsMessage(
    deviceToken: string,
    payload: PushNotificationPayload,
    options: PushNotificationOptions
  ): APNsMessage {
    const message: APNsMessage = {
      deviceToken,
      notification: {
        alert: {
          title: payload.title,
          body: payload.body,
        },
        badge: payload.badge,
        sound: payload.sound || 'default',
        contentAvailable: options.contentAvailable,
        mutableContent: options.mutableContent,
        category: options.category,
        threadId: payload.tag,
      },
      data: payload.data,
      options: {
        priority: payload.priority === 'critical' || payload.priority === 'high' ? 10 : 5,
        expiration: options.ttl ? Math.floor(Date.now() / 1000) + options.ttl : undefined,
        collapseId: options.collapseKey,
        topic: options.topic || this.config.bundleId,
      },
    };

    // For critical notifications, enable critical alert sound
    if (payload.priority === 'critical') {
      message.notification.sound = {
        critical: true,
        name: payload.sound || 'default',
        volume: 1.0,
      } as any;
    }

    return message;
  }

  /**
   * Send APNs request
   */
  private async sendAPNsRequest(message: APNsMessage): Promise<{ messageId: string }> {
    // In production, this would:
    // 1. Create HTTP/2 connection to api.push.apple.com:443
    // 2. Generate JWT token for authentication
    // 3. Send POST request to /3/device/{deviceToken}
    // 4. Handle response

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 70));

    // Simulate 99.5% success rate (APNs is very reliable)
    if (Math.random() > 0.995) {
      throw new Error('ServiceUnavailable: APNs service temporarily unavailable');
    }

    // Simulate invalid token (0.5% of cases)
    if (Math.random() > 0.995) {
      throw new Error('BadDeviceToken: The specified device token is invalid');
    }

    return {
      messageId: `apns_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  /**
   * Parse APNs error
   */
  private parseAPNsError(error: any): PushNotificationError {
    const message = error.message || error.toString();

    // Bad device token
    if (message.includes('BadDeviceToken') || message.includes('device token')) {
      return {
        code: 'BAD_DEVICE_TOKEN',
        message: 'Invalid or expired device token',
        isRetryable: false,
        shouldRemoveToken: true,
      };
    }

    // Unregistered
    if (message.includes('Unregistered') || message.includes('unregistered')) {
      return {
        code: 'UNREGISTERED',
        message: 'Device token is no longer registered',
        isRetryable: false,
        shouldRemoveToken: true,
      };
    }

    // Service unavailable
    if (message.includes('ServiceUnavailable') || message.includes('unavailable')) {
      return {
        code: 'SERVICE_UNAVAILABLE',
        message: 'APNs service temporarily unavailable',
        isRetryable: true,
        shouldRemoveToken: false,
      };
    }

    // Too many requests
    if (message.includes('TooManyRequests') || message.includes('429')) {
      return {
        code: 'TOO_MANY_REQUESTS',
        message: 'APNs rate limit exceeded',
        isRetryable: true,
        shouldRemoveToken: false,
      };
    }

    // Internal server error
    if (message.includes('InternalServerError') || message.includes('500')) {
      return {
        code: 'INTERNAL_ERROR',
        message: 'APNs internal error',
        isRetryable: true,
        shouldRemoveToken: false,
      };
    }

    // Missing topic
    if (message.includes('MissingTopic') || message.includes('topic')) {
      return {
        code: 'MISSING_TOPIC',
        message: 'Missing topic (bundle ID)',
        isRetryable: false,
        shouldRemoveToken: false,
      };
    }

    // Unknown error
    return {
      code: 'UNKNOWN_ERROR',
      message: message || 'Unknown APNs error',
      isRetryable: true,
      shouldRemoveToken: false,
    };
  }

  /**
   * Validate device token format
   */
  validateToken(token: string): boolean {
    // APNs tokens are 64 hex characters
    return /^[a-f0-9]{64}$/i.test(token);
  }

  /**
   * Get provider status
   */
  getStatus(): { initialized: boolean; production: boolean } {
    return {
      initialized: this.initialized,
      production: this.config.production,
    };
  }

  /**
   * Shutdown provider
   */
  async shutdown(): Promise<void> {
    this.initialized = false;
    this.connectionPool = [];
    this.emit('shutdown');
  }
}

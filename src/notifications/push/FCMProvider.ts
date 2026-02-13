/**
 * Firebase Cloud Messaging (FCM) Provider
 * Handles push notifications via Firebase
 */

import { EventEmitter } from 'events';
import { generateUUID } from '../../utils/uuid';
import {
  PushNotificationPayload,
  PushNotificationOptions,
  PushNotificationResult,
  PushNotificationError,
  FCMMessage,
  PushPlatform,
} from '../../types/push';

export interface FCMConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  serviceAccountPath?: string;
}

export interface FCMResponse {
  messageId?: string;
  error?: {
    code: string;
    message: string;
  };
}

export class FCMProvider extends EventEmitter {
  private config: FCMConfig;
  private initialized = false;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: FCMConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize FCM provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Validate configuration
    if (!this.config.projectId) {
      throw new Error('FCM project ID is required');
    }

    // In production, this would initialize the Firebase Admin SDK
    // For now, we'll simulate initialization
    try {
      await this.refreshAccessToken();
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Refresh OAuth2 access token
   */
  private async refreshAccessToken(): Promise<void> {
    // In production, this would use Google OAuth2 to get an access token
    // For now, simulate token generation
    this.accessToken = `ya29.${Buffer.from(JSON.stringify({
      projectId: this.config.projectId,
      timestamp: Date.now(),
    })).toString('base64')}`;

    this.tokenExpiry = new Date();
    this.tokenExpiry.setHours(this.tokenExpiry.getHours() + 1);
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
      await this.refreshAccessToken();
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
    await this.ensureValidToken();

    const message = this.buildFCMMessage(deviceToken, payload, options);
    const startTime = Date.now();

    try {
      // In production, this would make an HTTP request to FCM API
      // For now, simulate the request
      const response = await this.sendFCMRequest(message);

      const result: PushNotificationResult = {
        id: generateUUID(),
        success: true,
        deviceToken,
        platform: this.detectPlatform(options),
        messageId: response.messageId,
        timestamp: new Date(),
      };

      this.emit('notification:sent', result, Date.now() - startTime);
      return result;
    } catch (error: any) {
      const pushError = this.parseFCMError(error);
      const result: PushNotificationResult = {
        id: generateUUID(),
        success: false,
        deviceToken,
        platform: this.detectPlatform(options),
        error: pushError,
        timestamp: new Date(),
      };

      this.emit('notification:failed', result, error);

      // If token is invalid, emit event for cleanup
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

    // FCM supports sending to up to 500 devices at once
    const batchSize = 500;
    const results: PushNotificationResult[] = [];

    for (let i = 0; i < deviceTokens.length; i += batchSize) {
      const batch = deviceTokens.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(token => this.sendToDevice(token, payload, options))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Send notification to a topic
   */
  async sendToTopic(
    topic: string,
    payload: PushNotificationPayload,
    options: PushNotificationOptions = {}
  ): Promise<PushNotificationResult> {
    await this.ensureValidToken();

    const message = this.buildFCMMessage(topic, payload, options, 'topic');
    const startTime = Date.now();

    try {
      const response = await this.sendFCMRequest(message);

      const result: PushNotificationResult = {
        id: generateUUID(),
        success: true,
        deviceToken: `topic:${topic}`,
        platform: 'android',
        messageId: response.messageId,
        timestamp: new Date(),
      };

      this.emit('notification:sent', result, Date.now() - startTime);
      return result;
    } catch (error: any) {
      const result: PushNotificationResult = {
        id: generateUUID(),
        success: false,
        deviceToken: `topic:${topic}`,
        platform: 'android',
        error: this.parseFCMError(error),
        timestamp: new Date(),
      };

      this.emit('notification:failed', result, error);
      return result;
    }
  }

  /**
   * Subscribe device to topic
   */
  async subscribeToTopic(deviceTokens: string[], topic: string): Promise<void> {
    // In production, this would call FCM Instance ID API
    this.emit('topic:subscribed', { deviceTokens, topic });
  }

  /**
   * Unsubscribe device from topic
   */
  async unsubscribeFromTopic(deviceTokens: string[], topic: string): Promise<void> {
    // In production, this would call FCM Instance ID API
    this.emit('topic:unsubscribed', { deviceTokens, topic });
  }

  /**
   * Build FCM message from payload
   */
  private buildFCMMessage(
    target: string,
    payload: PushNotificationPayload,
    options: PushNotificationOptions,
    targetType: 'token' | 'topic' = 'token'
  ): FCMMessage {
    const message: FCMMessage = {
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.image,
      },
      data: this.convertDataToStrings(payload.data || {}),
    };

    // Set target
    if (targetType === 'token') {
      message.token = target;
    } else {
      message.topic = target;
    }

    // Android-specific configuration
    message.android = {
      priority: payload.priority === 'critical' || payload.priority === 'high' ? 'high' : 'normal',
      ttl: options.ttl ? options.ttl * 1000 : undefined,
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon,
        color: payload.color,
        sound: payload.sound || 'default',
        tag: payload.tag,
        clickAction: payload.clickAction,
        channelId: payload.channelId || 'default',
        priority: this.mapPriorityToAndroid(payload.priority),
        defaultSound: true,
        defaultVibrateTimings: true,
        image: payload.image,
      },
    };

    // iOS-specific configuration via APNs
    message.apns = {
      payload: {
        aps: {
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
        ...payload.data,
      },
    };

    // Web push configuration
    message.webpush = {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon,
        badge: payload.icon,
        image: payload.image,
        tag: payload.tag,
        requireInteraction: payload.priority === 'critical',
        data: payload.data,
      },
    };

    // FCM options
    message.fcmOptions = {
      analyticsLabel: `${payload.type}_${payload.priority}`,
    };

    return message;
  }

  /**
   * Convert data object to strings (FCM requirement)
   */
  private convertDataToStrings(data: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return result;
  }

  /**
   * Map priority to Android notification priority
   */
  private mapPriorityToAndroid(priority: string): 'min' | 'low' | 'default' | 'high' | 'max' {
    switch (priority) {
      case 'critical':
        return 'max';
      case 'high':
        return 'high';
      case 'normal':
        return 'default';
      case 'low':
        return 'low';
      default:
        return 'default';
    }
  }

  /**
   * Detect platform from options
   */
  private detectPlatform(options: PushNotificationOptions): PushPlatform {
    if (options.platforms && options.platforms.length > 0) {
      return options.platforms[0];
    }
    return 'android';
  }

  /**
   * Send FCM request
   */
  private async sendFCMRequest(message: FCMMessage): Promise<FCMResponse> {
    // In production, this would make an HTTPS request to:
    // https://fcm.googleapis.com/v1/projects/{project_id}/messages:send

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

    // Simulate 99% success rate
    if (Math.random() > 0.99) {
      throw new Error('UNAVAILABLE: FCM service temporarily unavailable');
    }

    // Simulate invalid token (1% of cases)
    if (Math.random() > 0.99) {
      throw new Error('INVALID_ARGUMENT: The registration token is not a valid FCM registration token');
    }

    return {
      messageId: `fcm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  /**
   * Parse FCM error
   */
  private parseFCMError(error: any): PushNotificationError {
    const message = error.message || error.toString();

    // Invalid registration token
    if (message.includes('registration token') || message.includes('INVALID_ARGUMENT')) {
      return {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired FCM registration token',
        isRetryable: false,
        shouldRemoveToken: true,
      };
    }

    // Not registered (token unregistered)
    if (message.includes('not registered') || message.includes('UNREGISTERED')) {
      return {
        code: 'UNREGISTERED',
        message: 'Device token is no longer registered',
        isRetryable: false,
        shouldRemoveToken: true,
      };
    }

    // Service unavailable
    if (message.includes('UNAVAILABLE') || message.includes('service unavailable')) {
      return {
        code: 'SERVICE_UNAVAILABLE',
        message: 'FCM service temporarily unavailable',
        isRetryable: true,
        shouldRemoveToken: false,
      };
    }

    // Quota exceeded
    if (message.includes('QUOTA_EXCEEDED') || message.includes('quota')) {
      return {
        code: 'QUOTA_EXCEEDED',
        message: 'FCM quota exceeded',
        isRetryable: true,
        shouldRemoveToken: false,
      };
    }

    // Internal error
    if (message.includes('INTERNAL') || message.includes('internal error')) {
      return {
        code: 'INTERNAL_ERROR',
        message: 'FCM internal error',
        isRetryable: true,
        shouldRemoveToken: false,
      };
    }

    // Unknown error
    return {
      code: 'UNKNOWN_ERROR',
      message: message || 'Unknown FCM error',
      isRetryable: true,
      shouldRemoveToken: false,
    };
  }

  /**
   * Validate device token format
   */
  validateToken(token: string): boolean {
    // FCM tokens are typically 152+ characters
    return token.length >= 140 && /^[a-zA-Z0-9_-]+$/.test(token);
  }

  /**
   * Get provider status
   */
  getStatus(): { initialized: boolean; hasValidToken: boolean } {
    return {
      initialized: this.initialized,
      hasValidToken: !!(this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry),
    };
  }

  /**
   * Shutdown provider
   */
  async shutdown(): Promise<void> {
    this.initialized = false;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.emit('shutdown');
  }
}

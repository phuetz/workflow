/**
 * Push Notification Types
 * Type definitions for mobile push notification system
 */

export type PushPlatform = 'ios' | 'android' | 'web';

export type PushPriority = 'critical' | 'high' | 'normal' | 'low';

export type PushNotificationType =
  | 'workflow_started'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'workflow_timeout'
  | 'approval_request'
  | 'approval_approved'
  | 'approval_rejected'
  | 'system_alert'
  | 'system_warning'
  | 'system_error'
  | 'custom';

export interface DeviceToken {
  id: string;
  userId: string;
  token: string;
  platform: PushPlatform;
  deviceName?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  locale?: string;
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  isActive: boolean;
}

export interface PushNotificationPayload {
  type: PushNotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  icon?: string;
  image?: string;
  clickAction?: string;
  tag?: string;
  color?: string;
  channelId?: string;
  priority: PushPriority;
}

export interface PushNotificationOptions {
  userId?: string;
  userIds?: string[];
  deviceTokens?: string[];
  platforms?: PushPlatform[];
  priority?: PushPriority;
  ttl?: number; // Time to live in seconds
  collapseKey?: string;
  dryRun?: boolean;
  contentAvailable?: boolean;
  mutableContent?: boolean;
  topic?: string;
  badge?: number;
  sound?: string;
  category?: string;
}

export interface PushNotificationResult {
  id: string;
  success: boolean;
  deviceToken: string;
  platform: PushPlatform;
  messageId?: string;
  error?: PushNotificationError;
  timestamp: Date;
}

export interface PushNotificationError {
  code: string;
  message: string;
  isRetryable: boolean;
  shouldRemoveToken: boolean;
}

export interface PushNotificationBatch {
  id: string;
  notifications: PushNotificationPayload[];
  options: PushNotificationOptions;
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: PushNotificationResult[];
}

export interface PushNotificationRule {
  id: string;
  userId: string;
  type: PushNotificationType;
  enabled: boolean;
  priority: PushPriority;
  platforms: PushPlatform[];
  quietHours?: QuietHours;
  conditions?: RuleCondition[];
  customizations?: NotificationCustomization;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuietHours {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  timezone: string;
  days?: number[]; // 0-6 (Sunday-Saturday)
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface NotificationCustomization {
  title?: string;
  body?: string;
  sound?: string;
  badge?: number;
  icon?: string;
  color?: string;
}

export interface PushAnalytics {
  notificationId: string;
  deviceToken: string;
  platform: PushPlatform;
  type: PushNotificationType;
  sentAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  dismissedAt?: Date;
  failedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PushDeliveryReport {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalFailed: number;
  deliveryRate: number;
  openRate: number;
  avgDeliveryTime: number;
  platformBreakdown: {
    platform: PushPlatform;
    sent: number;
    delivered: number;
    opened: number;
    failed: number;
  }[];
  typeBreakdown: {
    type: PushNotificationType;
    sent: number;
    delivered: number;
    opened: number;
    failed: number;
  }[];
}

export interface FCMMessage {
  token?: string;
  tokens?: string[];
  topic?: string;
  condition?: string;
  notification?: {
    title: string;
    body: string;
    imageUrl?: string;
  };
  data?: Record<string, string>;
  android?: {
    priority?: 'high' | 'normal';
    ttl?: number;
    restrictedPackageName?: string;
    data?: Record<string, string>;
    notification?: {
      title?: string;
      body?: string;
      icon?: string;
      color?: string;
      sound?: string;
      tag?: string;
      clickAction?: string;
      bodyLocKey?: string;
      bodyLocArgs?: string[];
      titleLocKey?: string;
      titleLocArgs?: string[];
      channelId?: string;
      ticker?: string;
      sticky?: boolean;
      eventTime?: Date;
      localOnly?: boolean;
      priority?: 'min' | 'low' | 'default' | 'high' | 'max';
      vibrateTimingsMillis?: number[];
      defaultVibrateTimings?: boolean;
      defaultSound?: boolean;
      lightSettings?: {
        color: string;
        lightOnDurationMillis: number;
        lightOffDurationMillis: number;
      };
      defaultLightSettings?: boolean;
      visibility?: 'private' | 'public' | 'secret';
      notificationCount?: number;
      image?: string;
    };
  };
  apns?: {
    headers?: Record<string, string>;
    payload: {
      aps: {
        alert?: {
          title?: string;
          subtitle?: string;
          body?: string;
          launchImage?: string;
          titleLocKey?: string;
          titleLocArgs?: string[];
          subtitleLocKey?: string;
          subtitleLocArgs?: string[];
          locKey?: string;
          locArgs?: string[];
        };
        badge?: number;
        sound?: string | {
          critical?: boolean;
          name?: string;
          volume?: number;
        };
        contentAvailable?: boolean;
        mutableContent?: boolean;
        category?: string;
        threadId?: string;
      };
      [key: string]: any;
    };
    fcmOptions?: {
      analyticsLabel?: string;
      imageUrl?: string;
    };
  };
  webpush?: {
    headers?: Record<string, string>;
    data?: Record<string, string>;
    notification?: {
      title?: string;
      body?: string;
      icon?: string;
      badge?: string;
      image?: string;
      vibrate?: number[];
      timestamp?: number;
      renotify?: boolean;
      silent?: boolean;
      requireInteraction?: boolean;
      tag?: string;
      data?: any;
      actions?: {
        action: string;
        title: string;
        icon?: string;
      }[];
    };
    fcmOptions?: {
      link?: string;
      analyticsLabel?: string;
    };
  };
  fcmOptions?: {
    analyticsLabel?: string;
  };
}

export interface APNsMessage {
  deviceToken: string;
  notification: {
    alert: string | {
      title?: string;
      subtitle?: string;
      body: string;
    };
    badge?: number;
    sound?: string;
    contentAvailable?: boolean;
    mutableContent?: boolean;
    category?: string;
    threadId?: string;
  };
  data?: Record<string, any>;
  options?: {
    priority?: 5 | 10;
    expiration?: number;
    collapseId?: string;
    topic?: string;
  };
}

export interface PushSubscription {
  userId: string;
  deviceTokenId: string;
  topics: string[];
  preferences: {
    [key in PushNotificationType]?: boolean;
  };
  quietHours?: QuietHours;
  createdAt: Date;
  updatedAt: Date;
}

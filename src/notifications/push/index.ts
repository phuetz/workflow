/**
 * Push Notification System
 * Export all push notification modules
 */

// Core Services
export { PushService } from './PushService';
export type { PushServiceConfig } from './PushService';

// Providers
export { FCMProvider } from './FCMProvider';
export type { FCMConfig, FCMResponse } from './FCMProvider';
export { APNsProvider } from './APNsProvider';
export type { APNsConfig } from './APNsProvider';

// Device Management
export { DeviceRegistry, deviceRegistry } from './DeviceRegistry';
export type { RegisterDeviceParams, DeviceRegistryStats } from './DeviceRegistry';

// Notification Types & Builders
export { NotificationBuilder, NOTIFICATION_TEMPLATES, NOTIFICATION_CATEGORIES } from './NotificationTypes';
export type { NotificationTemplate } from './NotificationTypes';

// Rules Engine
export { NotificationRuleEngine, notificationRuleEngine } from './RuleEngine';
export type { RuleEvaluationContext, RuleEvaluationResult } from './RuleEngine';

// Priority Management
export { PriorityManager } from './PriorityManager';
export type { PriorityQueueItem } from './PriorityManager';

// Batch Sending
export { BatchSender } from './BatchSender';
export type { BatchConfig } from './BatchSender';

// Analytics
export { PushAnalyticsService, pushAnalyticsService } from './Analytics';
export type { AnalyticsTimeRange, AnalyticsMetrics } from './Analytics';

// Types
export type {
  PushPlatform,
  PushPriority,
  PushNotificationType,
  DeviceToken,
  PushNotificationPayload,
  PushNotificationOptions,
  PushNotificationResult,
  PushNotificationError,
  PushNotificationBatch,
  PushNotificationRule,
  QuietHours,
  PushAnalytics,
  PushDeliveryReport,
  FCMMessage,
  APNsMessage,
  PushSubscription,
} from '../../types/push';

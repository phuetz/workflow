/**
 * Notification Services - Barrel Export
 *
 * Architecture Overview (3 Layers):
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Layer 3: MULTI-CHANNEL (UnifiedNotificationService)                │
 * │  - Email, SMS, Slack, Teams, Discord, Webhooks, WebSocket           │
 * │  - Templates, Subscriptions, Preferences                            │
 * │  - Alerts with escalation policies, Rate limiting                   │
 * │  - Use for: Enterprise notification delivery                        │
 * └─────────────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Layer 2: EVENT-BASED (EventNotificationService)                    │
 * │  - Notification rules triggered by events                           │
 * │  - Conditions, Cooldowns, Priority                                  │
 * │  - Use for: Automated notifications from app events                 │
 * └─────────────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Layer 1: UI NOTIFICATIONS (NotificationService)                    │
 * │  - Toast notifications, User feedback                               │
 * │  - Auto-dismiss, Actions                                            │
 * │  - Use for: In-app UI notifications                                 │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Usage Guide:
 *
 * - For UI toasts: notificationService.success('Title', 'Message')
 * - For event-based rules: eventNotificationService.addRule(rule)
 * - For multi-channel delivery: notificationService (unified).send(notification)
 *
 * Note: Most UI components should use NotificationService (Layer 1).
 * Backend services should use UnifiedNotificationService for delivery.
 *
 * @module notifications
 * @created 2026-01-07
 */

// ============================================
// Layer 1: UI Notifications
// ============================================

export {
  NotificationService,
  notificationService,
  type Notification as UINotification,
  type NotificationType,
  type NotificationAction,
  type NotificationOptions
} from '../NotificationService';

// ============================================
// Layer 2: Event-Based Notifications
// ============================================

export {
  EventNotificationService,
  type AppEventData,
  type NotificationRule
} from '../EventNotificationService';

// ============================================
// Layer 3: Multi-Channel (Unified)
// ============================================

export {
  UnifiedNotificationService,
  type NotificationChannel,
  type Notification as UnifiedNotification,
  type NotificationTemplate,
  type NotificationFormatting,
  type NotificationFilter,
  type RateLimit,
  type NotificationSubscription,
  type NotificationPreferences,
  type Alert,
  type AlertCondition,
  type EscalationPolicy,
  type EscalationLevel
} from '../core/UnifiedNotificationService';

// Re-export singleton for convenience
export { notificationService as unifiedNotificationService } from '../core/UnifiedNotificationService';

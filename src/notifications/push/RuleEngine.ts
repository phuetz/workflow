/**
 * Notification Rule Engine
 * Determines when and how to send push notifications based on rules
 */

import { EventEmitter } from 'events';
import {
  PushNotificationPayload,
  PushNotificationOptions,
  PushNotificationRule,
  PushNotificationType,
  PushPlatform,
  QuietHours,
} from '../../types/push';

export interface RuleEvaluationContext {
  userId: string;
  type: PushNotificationType;
  payload: PushNotificationPayload;
  timestamp: Date;
  data?: Record<string, any>;
}

export interface RuleEvaluationResult {
  shouldSend: boolean;
  reason?: string;
  modifiedPayload?: PushNotificationPayload;
  modifiedOptions?: PushNotificationOptions;
}

export class NotificationRuleEngine extends EventEmitter {
  private rules: Map<string, Map<PushNotificationType, PushNotificationRule>>;
  private defaultRules: Map<PushNotificationType, PushNotificationRule>;

  constructor() {
    super();
    this.rules = new Map();
    this.defaultRules = new Map();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default rules for all notification types
   */
  private initializeDefaultRules(): void {
    const notificationTypes: PushNotificationType[] = [
      'workflow_started',
      'workflow_completed',
      'workflow_failed',
      'workflow_timeout',
      'approval_request',
      'approval_approved',
      'approval_rejected',
      'system_alert',
      'system_warning',
      'system_error',
      'custom',
    ];

    for (const type of notificationTypes) {
      this.defaultRules.set(type, {
        id: `default_${type}`,
        userId: 'default',
        type,
        enabled: true,
        priority: this.getDefaultPriority(type),
        platforms: ['ios', 'android', 'web'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Get default priority for notification type
   */
  private getDefaultPriority(type: PushNotificationType): any {
    switch (type) {
      case 'system_error':
      case 'approval_request':
        return 'high';
      case 'workflow_failed':
      case 'workflow_timeout':
      case 'system_alert':
        return 'high';
      case 'workflow_completed':
      case 'approval_approved':
      case 'approval_rejected':
      case 'system_warning':
        return 'normal';
      case 'workflow_started':
        return 'low';
      default:
        return 'normal';
    }
  }

  /**
   * Set rule for user and notification type
   */
  async setRule(rule: PushNotificationRule): Promise<void> {
    if (!this.rules.has(rule.userId)) {
      this.rules.set(rule.userId, new Map());
    }

    this.rules.get(rule.userId)!.set(rule.type, rule);
    this.emit('rule:set', rule);
  }

  /**
   * Get rule for user and notification type
   */
  async getRule(userId: string, type: PushNotificationType): Promise<PushNotificationRule | null> {
    const userRules = this.rules.get(userId);
    if (userRules && userRules.has(type)) {
      return userRules.get(type)!;
    }

    // Return default rule if no user-specific rule exists
    return this.defaultRules.get(type) || null;
  }

  /**
   * Get all rules for user
   */
  async getUserRules(userId: string): Promise<PushNotificationRule[]> {
    const userRules = this.rules.get(userId);
    if (!userRules) {
      return [];
    }

    return Array.from(userRules.values());
  }

  /**
   * Delete rule
   */
  async deleteRule(userId: string, type: PushNotificationType): Promise<void> {
    const userRules = this.rules.get(userId);
    if (userRules) {
      userRules.delete(type);
      if (userRules.size === 0) {
        this.rules.delete(userId);
      }
      this.emit('rule:deleted', { userId, type });
    }
  }

  /**
   * Evaluate if notification should be sent
   */
  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const rule = await this.getRule(context.userId, context.type);

    if (!rule) {
      return {
        shouldSend: false,
        reason: 'No rule found for notification type',
      };
    }

    // Check if rule is enabled
    if (!rule.enabled) {
      return {
        shouldSend: false,
        reason: 'Notification type is disabled',
      };
    }

    // Check quiet hours
    if (rule.quietHours) {
      const isQuietHours = this.isWithinQuietHours(
        context.timestamp,
        rule.quietHours
      );

      if (isQuietHours) {
        // For critical notifications, still send during quiet hours
        if (context.payload.priority !== 'critical') {
          return {
            shouldSend: false,
            reason: 'Within quiet hours',
          };
        }
      }
    }

    // Evaluate conditions
    if (rule.conditions && rule.conditions.length > 0) {
      const conditionsMet = this.evaluateConditions(
        rule.conditions as any,
        context.data || {}
      );

      if (!conditionsMet) {
        return {
          shouldSend: false,
          reason: 'Rule conditions not met',
        };
      }
    }

    // Apply customizations
    const modifiedPayload = this.applyCustomizations(
      context.payload,
      rule.customizations as any
    );

    // Build options
    const modifiedOptions: PushNotificationOptions = {
      platforms: rule.platforms.map(p => p.toLowerCase() as PushPlatform),
      priority: rule.priority.toLowerCase() as any,
    };

    return {
      shouldSend: true,
      modifiedPayload,
      modifiedOptions,
    };
  }

  /**
   * Check if current time is within quiet hours
   */
  private isWithinQuietHours(timestamp: Date, quietHours: QuietHours): boolean {
    if (!quietHours.enabled) {
      return false;
    }

    // Parse time strings (HH:mm)
    const [startHour, startMinute] = quietHours.startTime.split(':').map(Number);
    const [endHour, endMinute] = quietHours.endTime.split(':').map(Number);

    // Convert timestamp to user's timezone
    const userTime = new Date(timestamp.toLocaleString('en-US', {
      timeZone: quietHours.timezone,
    }));

    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;

    // Check if current day is in allowed days
    if (quietHours.days && quietHours.days.length > 0) {
      const currentDay = userTime.getDay();
      if (!quietHours.days.includes(currentDay)) {
        return false; // Not a quiet day
      }
    }

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (endTimeMinutes < startTimeMinutes) {
      return (
        currentTimeMinutes >= startTimeMinutes ||
        currentTimeMinutes <= endTimeMinutes
      );
    }

    // Normal quiet hours (e.g., 08:00 to 22:00)
    return (
      currentTimeMinutes >= startTimeMinutes &&
      currentTimeMinutes <= endTimeMinutes
    );
  }

  /**
   * Evaluate rule conditions
   */
  private evaluateConditions(
    conditions: any[],
    data: Record<string, any>
  ): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    // All conditions must be met (AND logic)
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, data)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(condition: any, data: Record<string, any>): boolean {
    const value = this.getNestedValue(data, condition.field);

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;

      case 'contains':
        return String(value).includes(String(condition.value));

      case 'greater_than':
        return Number(value) > Number(condition.value);

      case 'less_than':
        return Number(value) < Number(condition.value);

      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);

      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);

      default:
        return false;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Apply customizations to payload
   */
  private applyCustomizations(
    payload: PushNotificationPayload,
    customizations?: any
  ): PushNotificationPayload {
    if (!customizations) {
      return payload;
    }

    const customized = { ...payload };

    if (customizations.title) {
      customized.title = customizations.title;
    }

    if (customizations.body) {
      customized.body = customizations.body;
    }

    if (customizations.sound) {
      customized.sound = customizations.sound;
    }

    if (customizations.badge !== undefined) {
      customized.badge = customizations.badge;
    }

    if (customizations.icon) {
      customized.icon = customizations.icon;
    }

    if (customizations.color) {
      customized.color = customizations.color;
    }

    return customized;
  }

  /**
   * Batch evaluate notifications
   */
  async batchEvaluate(
    contexts: RuleEvaluationContext[]
  ): Promise<Map<string, RuleEvaluationResult>> {
    const results = new Map<string, RuleEvaluationResult>();

    for (const context of contexts) {
      const key = `${context.userId}_${context.type}`;
      const result = await this.evaluate(context);
      results.set(key, result);
    }

    return results;
  }

  /**
   * Get rule statistics
   */
  async getStats(): Promise<{
    totalRules: number;
    rulesPerUser: Record<string, number>;
    rulesPerType: Record<string, number>;
    enabledRules: number;
    disabledRules: number;
  }> {
    let totalRules = 0;
    let enabledRules = 0;
    let disabledRules = 0;
    const rulesPerUser: Record<string, number> = {};
    const rulesPerType: Record<string, number> = {};

    for (const [userId, userRules] of this.rules) {
      rulesPerUser[userId] = userRules.size;
      totalRules += userRules.size;

      for (const rule of userRules.values()) {
        if (rule.enabled) {
          enabledRules++;
        } else {
          disabledRules++;
        }

        rulesPerType[rule.type] = (rulesPerType[rule.type] || 0) + 1;
      }
    }

    return {
      totalRules,
      rulesPerUser,
      rulesPerType,
      enabledRules,
      disabledRules,
    };
  }

  /**
   * Export rules for persistence
   */
  async exportRules(): Promise<PushNotificationRule[]> {
    const allRules: PushNotificationRule[] = [];

    for (const userRules of this.rules.values()) {
      allRules.push(...Array.from(userRules.values()));
    }

    return allRules;
  }

  /**
   * Import rules from persistence
   */
  async importRules(rules: PushNotificationRule[]): Promise<void> {
    for (const rule of rules) {
      await this.setRule(rule);
    }

    this.emit('rules:imported', rules.length);
  }

  /**
   * Clear all rules (for testing)
   */
  async clearAll(): Promise<void> {
    this.rules.clear();
    this.emit('rules:cleared');
  }
}

// Singleton instance
export const notificationRuleEngine = new NotificationRuleEngine();

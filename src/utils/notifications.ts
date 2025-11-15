/**
 * Notification System
 * Multi-channel notification delivery and management
 */

export type NotificationChannel = 'email' | 'slack' | 'webhook' | 'inApp' | 'sms' | 'push';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationTrigger =
  | 'workflow.started'
  | 'workflow.completed'
  | 'workflow.failed'
  | 'workflow.paused'
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'execution.timeout'
  | 'execution.retry'
  | 'error.occurred'
  | 'approval.required'
  | 'approval.approved'
  | 'approval.rejected'
  | 'schedule.triggered'
  | 'quota.warning'
  | 'quota.exceeded';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  trigger: NotificationTrigger;
  channels: NotificationChannel[];
  data?: any; // Additional context
  read: boolean;
  archived: boolean;
  createdAt: string;
  readAt?: string;
  archivedAt?: string;
}

export interface NotificationRule {
  id: string;
  userId: string;
  name: string;
  enabled: boolean;
  trigger: NotificationTrigger;
  conditions?: {
    workflowIds?: string[];
    tags?: string[];
    errorTypes?: string[];
    customCondition?: string; // Expression
  };
  channels: NotificationChannel[];
  priority: NotificationPriority;
  recipients?: string[]; // Additional user IDs
  template?: string; // Custom message template
  cooldown?: number; // Min seconds between notifications
  createdAt: string;
  updatedAt: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  trigger: NotificationTrigger;
  subject: string;
  body: string;
  variables: string[]; // Available template variables
}

class NotificationManager {
  private notifications: Map<string, Notification> = new Map();
  private rules: Map<string, NotificationRule> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private lastNotificationTime: Map<string, number> = new Map();
  private channelHandlers: Map<NotificationChannel, (notification: Notification) => Promise<void>> = new Map();

  constructor() {
    this.initializeTemplates();
    this.loadFromStorage();
  }

  /**
   * Initialize default templates
   */
  private initializeTemplates(): void {
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: 'workflow.completed',
        name: 'Workflow Completed',
        trigger: 'workflow.completed',
        subject: 'Workflow "{{workflowName}}" completed successfully',
        body: 'Your workflow "{{workflowName}}" has completed successfully.\n\nExecution ID: {{executionId}}\nDuration: {{duration}}\nStatus: {{status}}',
        variables: ['workflowName', 'executionId', 'duration', 'status']
      },
      {
        id: 'workflow.failed',
        name: 'Workflow Failed',
        trigger: 'workflow.failed',
        subject: '🚨 Workflow "{{workflowName}}" failed',
        body: 'Your workflow "{{workflowName}}" has failed.\n\nExecution ID: {{executionId}}\nError: {{error}}\nNode: {{failedNode}}',
        variables: ['workflowName', 'executionId', 'error', 'failedNode']
      },
      {
        id: 'approval.required',
        name: 'Approval Required',
        trigger: 'approval.required',
        subject: 'Approval required for "{{workflowName}}"',
        body: 'An approval is required for workflow "{{workflowName}}".\n\nMessage: {{message}}\nApproval URL: {{approvalUrl}}',
        variables: ['workflowName', 'message', 'approvalUrl']
      },
      {
        id: 'error.occurred',
        name: 'Error Occurred',
        trigger: 'error.occurred',
        subject: 'Error in "{{workflowName}}"',
        body: 'An error occurred in workflow "{{workflowName}}".\n\nError: {{error}}\nStack: {{stack}}',
        variables: ['workflowName', 'error', 'stack']
      }
    ];

    for (const template of defaultTemplates) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * Create notification rule
   */
  createRule(
    userId: string,
    name: string,
    trigger: NotificationTrigger,
    channels: NotificationChannel[],
    options?: {
      conditions?: NotificationRule['conditions'];
      priority?: NotificationPriority;
      recipients?: string[];
      template?: string;
      cooldown?: number;
    }
  ): NotificationRule {
    const rule: NotificationRule = {
      id: this.generateId(),
      userId,
      name,
      enabled: true,
      trigger,
      channels,
      priority: options?.priority || 'medium',
      conditions: options?.conditions,
      recipients: options?.recipients,
      template: options?.template,
      cooldown: options?.cooldown,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.rules.set(rule.id, rule);
    this.saveToStorage();

    return rule;
  }

  /**
   * Send notification
   */
  async sendNotification(
    userId: string,
    title: string,
    message: string,
    options: {
      priority?: NotificationPriority;
      trigger?: NotificationTrigger;
      channels?: NotificationChannel[];
      data?: any;
    } = {}
  ): Promise<Notification> {
    const notification: Notification = {
      id: this.generateId(),
      userId,
      title,
      message,
      priority: options.priority || 'medium',
      trigger: options.trigger || 'workflow.completed',
      channels: options.channels || ['inApp'],
      data: options.data,
      read: false,
      archived: false,
      createdAt: new Date().toISOString()
    };

    this.notifications.set(notification.id, notification);

    // Send through channels
    for (const channel of notification.channels) {
      await this.sendThroughChannel(channel, notification);
    }

    this.saveToStorage();

    return notification;
  }

  /**
   * Trigger notification based on event
   */
  async trigger(
    trigger: NotificationTrigger,
    data: any
  ): Promise<Notification[]> {
    const sent: Notification[] = [];

    // Find matching rules
    for (const rule of this.rules.values()) {
      if (!rule.enabled || rule.trigger !== trigger) {
        continue;
      }

      // Check conditions
      if (!this.checkConditions(rule, data)) {
        continue;
      }

      // Check cooldown
      const lastTime = this.lastNotificationTime.get(`${rule.userId}_${trigger}`);
      if (lastTime && rule.cooldown) {
        const elapsed = (Date.now() - lastTime) / 1000;
        if (elapsed < rule.cooldown) {
          continue;
        }
      }

      // Get template
      const template = rule.template
        ? this.templates.get(rule.template)
        : this.templates.get(trigger);

      const title = template
        ? this.renderTemplate(template.subject, data)
        : `Notification: ${trigger}`;

      const message = template
        ? this.renderTemplate(template.body, data)
        : JSON.stringify(data);

      // Send to rule owner
      const notification = await this.sendNotification(
        rule.userId,
        title,
        message,
        {
          priority: rule.priority,
          trigger,
          channels: rule.channels,
          data
        }
      );

      sent.push(notification);

      // Send to additional recipients
      if (rule.recipients) {
        for (const recipientId of rule.recipients) {
          const recipientNotification = await this.sendNotification(
            recipientId,
            title,
            message,
            {
              priority: rule.priority,
              trigger,
              channels: rule.channels,
              data
            }
          );
          sent.push(recipientNotification);
        }
      }

      // Update last notification time
      this.lastNotificationTime.set(`${rule.userId}_${trigger}`, Date.now());
    }

    return sent;
  }

  /**
   * Check if rule conditions are met
   */
  private checkConditions(rule: NotificationRule, data: any): boolean {
    if (!rule.conditions) return true;

    // Check workflow IDs
    if (rule.conditions.workflowIds && data.workflowId) {
      if (!rule.conditions.workflowIds.includes(data.workflowId)) {
        return false;
      }
    }

    // Check tags
    if (rule.conditions.tags && data.tags) {
      const hasTag = rule.conditions.tags.some(tag => data.tags.includes(tag));
      if (!hasTag) {
        return false;
      }
    }

    // Check error types
    if (rule.conditions.errorTypes && data.errorType) {
      if (!rule.conditions.errorTypes.includes(data.errorType)) {
        return false;
      }
    }

    // Check custom condition
    if (rule.conditions.customCondition) {
      try {
        const func = new Function('data', `return ${rule.conditions.customCondition}`);
        if (!func(data)) {
          return false;
        }
      } catch {
        return false;
      }
    }

    return true;
  }

  /**
   * Render template
   */
  private renderTemplate(template: string, data: any): string {
    let result = template;

    // Replace {{variable}} with data values
    const matches = template.match(/\{\{(\w+)\}\}/g);

    if (matches) {
      for (const match of matches) {
        const variable = match.slice(2, -2);
        const value = data[variable] || '';
        result = result.replace(match, String(value));
      }
    }

    return result;
  }

  /**
   * Send through specific channel
   */
  private async sendThroughChannel(
    channel: NotificationChannel,
    notification: Notification
  ): Promise<void> {
    const handler = this.channelHandlers.get(channel);

    if (handler) {
      await handler(notification);
    } else {
      // Default handlers
      switch (channel) {
        case 'inApp':
          // Already stored in notifications map
          break;

        case 'email':
          console.log('[Email]', notification.title, notification.message);
          break;

        case 'slack':
          console.log('[Slack]', notification.title, notification.message);
          break;

        case 'webhook':
          console.log('[Webhook]', notification);
          break;

        case 'sms':
          console.log('[SMS]', notification.message);
          break;

        case 'push':
          console.log('[Push]', notification.title);
          break;
      }
    }
  }

  /**
   * Register channel handler
   */
  registerChannelHandler(
    channel: NotificationChannel,
    handler: (notification: Notification) => Promise<void>
  ): void {
    this.channelHandlers.set(channel, handler);
  }

  /**
   * Get user notifications
   */
  getUserNotifications(userId: string, options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Notification[] {
    let notifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId && !n.archived);

    if (options?.unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }

    notifications.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (options?.offset) {
      notifications = notifications.slice(options.offset);
    }

    if (options?.limit) {
      notifications = notifications.slice(0, options.limit);
    }

    return notifications;
  }

  /**
   * Mark as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);

    if (notification && !notification.read) {
      notification.read = true;
      notification.readAt = new Date().toISOString();
      this.notifications.set(notificationId, notification);
      this.saveToStorage();
    }
  }

  /**
   * Mark all as read
   */
  markAllAsRead(userId: string): void {
    for (const notification of this.notifications.values()) {
      if (notification.userId === userId && !notification.read) {
        notification.read = true;
        notification.readAt = new Date().toISOString();
        this.notifications.set(notification.id, notification);
      }
    }
    this.saveToStorage();
  }

  /**
   * Archive notification
   */
  archiveNotification(notificationId: string): void {
    const notification = this.notifications.get(notificationId);

    if (notification) {
      notification.archived = true;
      notification.archivedAt = new Date().toISOString();
      this.notifications.set(notificationId, notification);
      this.saveToStorage();
    }
  }

  /**
   * Get unread count
   */
  getUnreadCount(userId: string): number {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId && !n.read && !n.archived)
      .length;
  }

  /**
   * Get rules
   */
  getRules(userId: string): NotificationRule[] {
    return Array.from(this.rules.values())
      .filter(r => r.userId === userId);
  }

  /**
   * Update rule
   */
  updateRule(ruleId: string, updates: Partial<NotificationRule>): NotificationRule {
    const rule = this.rules.get(ruleId);

    if (!rule) {
      throw new Error('Rule not found');
    }

    const updated = {
      ...rule,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.rules.set(ruleId, updated);
    this.saveToStorage();

    return updated;
  }

  /**
   * Delete rule
   */
  deleteRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.saveToStorage();
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save to storage
   */
  private saveToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('notifications', JSON.stringify(Array.from(this.notifications.entries())));
        localStorage.setItem('notification-rules', JSON.stringify(Array.from(this.rules.entries())));
      } catch (error) {
        console.error('Failed to save notifications:', error);
      }
    }
  }

  /**
   * Load from storage
   */
  private loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const notifications = localStorage.getItem('notifications');
        if (notifications) {
          this.notifications = new Map(JSON.parse(notifications));
        }

        const rules = localStorage.getItem('notification-rules');
        if (rules) {
          this.rules = new Map(JSON.parse(rules));
        }
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    }
  }
}

// Singleton instance
export const notificationManager = new NotificationManager();

/**
 * Quick notification helpers
 */
export const notify = {
  success: (userId: string, message: string) =>
    notificationManager.sendNotification(userId, 'Success', message, {
      priority: 'low',
      channels: ['inApp']
    }),

  error: (userId: string, message: string) =>
    notificationManager.sendNotification(userId, 'Error', message, {
      priority: 'high',
      channels: ['inApp', 'email']
    }),

  warning: (userId: string, message: string) =>
    notificationManager.sendNotification(userId, 'Warning', message, {
      priority: 'medium',
      channels: ['inApp']
    }),

  info: (userId: string, message: string) =>
    notificationManager.sendNotification(userId, 'Info', message, {
      priority: 'low',
      channels: ['inApp']
    })
};

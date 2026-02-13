/**
 * Notification Types
 * Pre-defined notification templates and types
 */

import {
  PushNotificationPayload,
  PushNotificationType,
  PushPriority,
} from '../../types/push';

export interface NotificationTemplate {
  type: PushNotificationType;
  titleTemplate: string;
  bodyTemplate: string;
  priority: PushPriority;
  sound?: string;
  icon?: string;
  color?: string;
  channelId?: string;
  badge?: number;
}

export const NOTIFICATION_TEMPLATES: Record<PushNotificationType, NotificationTemplate> = {
  workflow_started: {
    type: 'workflow_started',
    titleTemplate: 'Workflow Started',
    bodyTemplate: 'Workflow "{{workflowName}}" has started execution',
    priority: 'normal',
    sound: 'default',
    icon: 'workflow_icon',
    color: '#3B82F6',
    channelId: 'workflow_updates',
  },
  workflow_completed: {
    type: 'workflow_completed',
    titleTemplate: 'Workflow Completed',
    bodyTemplate: 'Workflow "{{workflowName}}" completed successfully',
    priority: 'normal',
    sound: 'success',
    icon: 'check_circle',
    color: '#10B981',
    channelId: 'workflow_updates',
    badge: 1,
  },
  workflow_failed: {
    type: 'workflow_failed',
    titleTemplate: 'Workflow Failed',
    bodyTemplate: 'Workflow "{{workflowName}}" failed: {{errorMessage}}',
    priority: 'high',
    sound: 'error',
    icon: 'error_icon',
    color: '#EF4444',
    channelId: 'workflow_alerts',
    badge: 1,
  },
  workflow_timeout: {
    type: 'workflow_timeout',
    titleTemplate: 'Workflow Timeout',
    bodyTemplate: 'Workflow "{{workflowName}}" exceeded time limit',
    priority: 'high',
    sound: 'warning',
    icon: 'timer_icon',
    color: '#F59E0B',
    channelId: 'workflow_alerts',
    badge: 1,
  },
  approval_request: {
    type: 'approval_request',
    titleTemplate: 'Approval Required',
    bodyTemplate: 'Workflow "{{workflowName}}" requires your approval',
    priority: 'high',
    sound: 'notification',
    icon: 'approval_icon',
    color: '#8B5CF6',
    channelId: 'approvals',
    badge: 1,
  },
  approval_approved: {
    type: 'approval_approved',
    titleTemplate: 'Approval Granted',
    bodyTemplate: 'Your approval for "{{workflowName}}" was granted',
    priority: 'normal',
    sound: 'success',
    icon: 'check_icon',
    color: '#10B981',
    channelId: 'approvals',
  },
  approval_rejected: {
    type: 'approval_rejected',
    titleTemplate: 'Approval Rejected',
    bodyTemplate: 'Your approval for "{{workflowName}}" was rejected',
    priority: 'normal',
    sound: 'notification',
    icon: 'cancel_icon',
    color: '#EF4444',
    channelId: 'approvals',
  },
  system_alert: {
    type: 'system_alert',
    titleTemplate: 'System Alert',
    bodyTemplate: '{{message}}',
    priority: 'high',
    sound: 'alert',
    icon: 'alert_icon',
    color: '#F59E0B',
    channelId: 'system_alerts',
    badge: 1,
  },
  system_warning: {
    type: 'system_warning',
    titleTemplate: 'System Warning',
    bodyTemplate: '{{message}}',
    priority: 'normal',
    sound: 'warning',
    icon: 'warning_icon',
    color: '#F59E0B',
    channelId: 'system_notifications',
  },
  system_error: {
    type: 'system_error',
    titleTemplate: 'System Error',
    bodyTemplate: '{{message}}',
    priority: 'critical',
    sound: 'error',
    icon: 'error_icon',
    color: '#EF4444',
    channelId: 'system_alerts',
    badge: 1,
  },
  custom: {
    type: 'custom',
    titleTemplate: '{{title}}',
    bodyTemplate: '{{message}}',
    priority: 'normal',
    sound: 'default',
    icon: 'notification_icon',
    color: '#6B7280',
    channelId: 'general',
  },
};

export class NotificationBuilder {
  /**
   * Build notification from template
   */
  static buildFromTemplate(
    type: PushNotificationType,
    data: Record<string, any>
  ): PushNotificationPayload {
    const template = NOTIFICATION_TEMPLATES[type];
    if (!template) {
      throw new Error(`Unknown notification type: ${type}`);
    }

    return {
      type,
      title: this.interpolate(template.titleTemplate, data),
      body: this.interpolate(template.bodyTemplate, data),
      data,
      priority: template.priority,
      sound: template.sound,
      icon: template.icon,
      color: template.color,
      channelId: template.channelId,
      badge: template.badge,
    };
  }

  /**
   * Build workflow started notification
   */
  static workflowStarted(workflowId: string, workflowName: string): PushNotificationPayload {
    return this.buildFromTemplate('workflow_started', {
      workflowId,
      workflowName,
    });
  }

  /**
   * Build workflow completed notification
   */
  static workflowCompleted(
    workflowId: string,
    workflowName: string,
    duration?: number
  ): PushNotificationPayload {
    const data: any = { workflowId, workflowName };
    if (duration !== undefined) {
      data.duration = duration;
    }
    return this.buildFromTemplate('workflow_completed', data);
  }

  /**
   * Build workflow failed notification
   */
  static workflowFailed(
    workflowId: string,
    workflowName: string,
    errorMessage: string
  ): PushNotificationPayload {
    return this.buildFromTemplate('workflow_failed', {
      workflowId,
      workflowName,
      errorMessage: errorMessage.substring(0, 100), // Limit error message length
    });
  }

  /**
   * Build workflow timeout notification
   */
  static workflowTimeout(
    workflowId: string,
    workflowName: string,
    timeLimit: number
  ): PushNotificationPayload {
    return this.buildFromTemplate('workflow_timeout', {
      workflowId,
      workflowName,
      timeLimit,
    });
  }

  /**
   * Build approval request notification
   */
  static approvalRequest(
    approvalId: string,
    workflowId: string,
    workflowName: string,
    message?: string
  ): PushNotificationPayload {
    return this.buildFromTemplate('approval_request', {
      approvalId,
      workflowId,
      workflowName,
      message,
    });
  }

  /**
   * Build approval approved notification
   */
  static approvalApproved(
    approvalId: string,
    workflowId: string,
    workflowName: string,
    approvedBy: string
  ): PushNotificationPayload {
    return this.buildFromTemplate('approval_approved', {
      approvalId,
      workflowId,
      workflowName,
      approvedBy,
    });
  }

  /**
   * Build approval rejected notification
   */
  static approvalRejected(
    approvalId: string,
    workflowId: string,
    workflowName: string,
    rejectedBy: string,
    reason?: string
  ): PushNotificationPayload {
    return this.buildFromTemplate('approval_rejected', {
      approvalId,
      workflowId,
      workflowName,
      rejectedBy,
      reason,
    });
  }

  /**
   * Build system alert notification
   */
  static systemAlert(message: string, data?: Record<string, any>): PushNotificationPayload {
    return this.buildFromTemplate('system_alert', {
      message,
      ...data,
    });
  }

  /**
   * Build system warning notification
   */
  static systemWarning(message: string, data?: Record<string, any>): PushNotificationPayload {
    return this.buildFromTemplate('system_warning', {
      message,
      ...data,
    });
  }

  /**
   * Build system error notification
   */
  static systemError(message: string, error?: any): PushNotificationPayload {
    return this.buildFromTemplate('system_error', {
      message,
      error: error ? JSON.stringify(error) : undefined,
    });
  }

  /**
   * Build custom notification
   */
  static custom(
    title: string,
    message: string,
    data?: Record<string, any>,
    priority: PushPriority = 'normal'
  ): PushNotificationPayload {
    const payload = this.buildFromTemplate('custom', {
      title,
      message,
      ...data,
    });
    payload.priority = priority;
    return payload;
  }

  /**
   * Interpolate template with data
   */
  private static interpolate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }
}

/**
 * Notification categories for grouping
 */
export const NOTIFICATION_CATEGORIES = {
  WORKFLOW: ['workflow_started', 'workflow_completed', 'workflow_failed', 'workflow_timeout'],
  APPROVAL: ['approval_request', 'approval_approved', 'approval_rejected'],
  SYSTEM: ['system_alert', 'system_warning', 'system_error'],
  CUSTOM: ['custom'],
} as const;

/**
 * Get category for notification type
 */
export function getNotificationCategory(type: PushNotificationType): string {
  for (const [category, types] of Object.entries(NOTIFICATION_CATEGORIES)) {
    if ((types as readonly PushNotificationType[]).includes(type)) {
      return category;
    }
  }
  return 'CUSTOM';
}

/**
 * Get notification types for category
 */
export function getNotificationTypesForCategory(category: string): PushNotificationType[] {
  return (NOTIFICATION_CATEGORIES as any)[category] || [];
}

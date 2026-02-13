/**
 * Event-based Notification Service
 * Generates real notifications based on actual application events
 */

import { notificationService } from './NotificationService';
import { EventEmitter } from 'events';
import { logger } from './LoggingService';

export interface AppEventData {
  type: string;
  data: unknown;
  timestamp: Date;
  source: string;
}

export interface NotificationRule {
  id: string;
  eventType: string;
  condition?: (data: Record<string, unknown>) => boolean;
  notificationType: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string | ((data: Record<string, unknown>) => string);
  enabled: boolean;
  cooldown?: number; // Minimum time between notifications of this type (in ms)
  priority: 'low' | 'medium' | 'high';
}

export class EventNotificationService extends EventEmitter {
  private notificationRules: Map<string, NotificationRule> = new Map();
  private lastNotificationTime: Map<string, number> = new Map();
  private eventHistory: AppEventData[] = [];
  private isInitialized = false;

  constructor() {
    super();
    // Initialize rules synchronously
    this.initializeDefaultRules();
  }

  // Initialize default notification rules - arrow function to maintain binding
  private initializeDefaultRules = (): void => {
    const defaultRules: NotificationRule[] = [
      {
        id: 'workflow_execution_success',
        eventType: 'workflow_execution_completed',
        condition: (data) => data.success === true,
        notificationType: 'success',
        title: 'Workflow Executed Successfully',
        message: (data) => `Workflow "${data.workflowName || 'Unknown'}" completed in ${data.duration || 0}ms`,
        enabled: true,
        cooldown: 5000, // 5 seconds
        priority: 'medium'
      },
      {
        id: 'workflow_execution_failed',
        eventType: 'workflow_execution_completed',
        condition: (data) => data.success === false,
        notificationType: 'error',
        title: 'Workflow Execution Failed',
        message: (data) => `Workflow "${data.workflowName || 'Unknown'}" failed: ${data.error || 'Unknown error'}`,
        enabled: true,
        cooldown: 3000,
        priority: 'high'
      },
      {
        id: 'test_execution_completed',
        eventType: 'test_execution_completed',
        condition: (data) => data.status === 'passed',
        notificationType: 'success',
        title: 'Test Passed',
        message: (data) => `Test "${data.testName}" passed in ${data.duration}ms`,
        enabled: true,
        cooldown: 10000,
        priority: 'low'
      },
      {
        id: 'test_execution_failed',
        eventType: 'test_execution_completed',
        condition: (data) => data.status === 'failed',
        notificationType: 'error',
        title: 'Test Failed',
        message: (data) => `Test "${data.testName}" failed: ${data.error || 'Unknown error'}`,
        enabled: true,
        cooldown: 5000,
        priority: 'high'
      },
      {
        id: 'new_template_available',
        eventType: 'template_added',
        notificationType: 'info',
        title: 'New Template Available',
        message: (data) => `New template "${data.templateName}" is now available`,
        enabled: true,
        cooldown: 60000, // 1 minute
        priority: 'low'
      },
      {
        id: 'quota_warning',
        eventType: 'quota_check',
        condition: (data) => data.percentage >= 80,
        notificationType: 'warning',
        title: 'Quota Warning',
        message: (data) => `You have used ${data.percentage}% of your ${data.quotaType} quota`,
        enabled: true,
        cooldown: 300000, // 5 minutes
        priority: 'medium'
      },
      {
        id: 'credential_expired',
        eventType: 'credential_validation',
        condition: (data) => data.expired === true,
        notificationType: 'error',
        title: 'Credential Expired',
        message: (data) => `Your ${data.credentialType} credential has expired`,
        enabled: true,
        cooldown: 86400000, // 24 hours
        priority: 'high'
      },
      {
        id: 'webhook_configured',
        eventType: 'webhook_configured',
        notificationType: 'success',
        title: 'Webhook Configured',
        message: (data) => `Webhook "${data.webhookName}" has been configured successfully`,
        enabled: true,
        cooldown: 30000,
        priority: 'low'
      },
      {
        id: 'node_execution_slow',
        eventType: 'node_execution_completed',
        condition: (data) => data.duration > 5000, // > 5 seconds
        notificationType: 'warning',
        title: 'Slow Node Execution',
        message: (data) => `Node "${data.nodeName}" took ${Math.round(data.duration / 1000)}s to execute`,
        enabled: true,
        cooldown: 60000,
        priority: 'low'
      },
      {
        id: 'api_rate_limit_warning',
        eventType: 'api_rate_limit',
        condition: (data) => data.remainingRequests < 10,
        notificationType: 'warning',
        title: 'API Rate Limit Warning',
        message: (data) => `Only ${data.remainingRequests} API requests remaining for ${data.service}`,
        enabled: true,
        cooldown: 300000,
        priority: 'medium'
      },
      {
        id: 'security_alert',
        eventType: 'security_event',
        condition: (data) => data.severity === 'high',
        notificationType: 'error',
        title: 'Security Alert',
        message: (data) => `Security event detected: ${data.description}`,
        enabled: true,
        cooldown: 60000,
        priority: 'high'
      },
      {
        id: 'backup_completed',
        eventType: 'backup_completed',
        condition: (data) => data.success === true,
        notificationType: 'success',
        title: 'Backup Completed',
        message: (data) => `Backup of ${data.dataType} completed successfully`,
        enabled: true,
        cooldown: 3600000, // 1 hour
        priority: 'low'
      },
      {
        id: 'app_installed',
        eventType: 'app_installed',
        notificationType: 'success',
        title: 'App Installed',
        message: (data) => `${data.appName} v${data.version} has been installed successfully`,
        enabled: true,
        cooldown: 10000,
        priority: 'low'
      }
    ];

    defaultRules.forEach(rule => {
      this.notificationRules.set(rule.id, rule);
    });

    this.isInitialized = true;
  }

  // Emit an application event
  emitEvent(eventType: string, data: Record<string, unknown>, source: string = 'unknown'): void {
    const eventData: AppEventData = {
      type: eventType,
      data,
      timestamp: new Date(),
      source
    };

    // Add to event history
    this.eventHistory.unshift(eventData);
    
    // Keep only last 1000 events
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(0, 1000);
    }

    // Process notification rules
    this.processEventForNotifications(eventData);

    // Emit event for other listeners
    this.emit('event', eventData);
  }

  // Process an event against all notification rules
  private processEventForNotifications(eventData: AppEventData): void {
    const matchingRules = Array.from(this.notificationRules.values())
      .filter(rule => rule.enabled && rule.eventType === eventData.type);

    const now = Date.now();

    for (const rule of matchingRules) {
      // Check condition if specified
      if (rule.condition && !rule.condition(eventData.data)) {
        continue;
      }

      // Check cooldown
      const lastNotification = this.lastNotificationTime.get(rule.id);
      if (lastNotification && rule.cooldown && (now - lastNotification) < rule.cooldown) {
        continue;
      }

      // Generate notification
      this.generateNotification(rule, eventData);
      
      // Update last notification time
      this.lastNotificationTime.set(rule.id, now);
    }
  }

  // Generate a notification based on a rule and event
  private generateNotification(rule: NotificationRule, eventData: AppEventData): void {
    const message = typeof rule.message === 'function'
      ? rule.message(eventData.data)
      : rule.message;

    // Create context-aware actions based on event type
    const actions: any[] = [];

    notificationService.show(rule.notificationType, rule.title, message, {
      duration: rule.priority === 'high' ? 0 : 5000, // High priority notifications don't auto-dismiss
      actions,
      metadata: {
        eventType: eventData.type,
        ruleId: rule.id,
        priority: rule.priority,
        source: eventData.source,
        timestamp: eventData.timestamp
      }
    });
  }

  // Create appropriate actions for different notification types
  private createNotificationActions(rule: NotificationRule, eventData: AppEventData): unknown[] {

    switch (rule.id) {
      case 'workflow_execution_failed':
        actions.push({
          label: 'View Details',
          callback: () => {
            this.emit('action_triggered', {
              action: 'view_workflow_details',
              workflowId: eventData.data.workflowId
            });
          }
        });
        actions.push({
          label: 'Retry',
          callback: () => {
            this.emit('action_triggered', {
              action: 'retry_workflow',
              workflowId: eventData.data.workflowId
            });
          }
        });
        break;

      case 'test_execution_failed':
        actions.push({
          label: 'View Logs',
          callback: () => {
            this.emit('action_triggered', {
              action: 'view_test_logs',
              testId: eventData.data.testId
            });
          }
        });
        break;

      case 'quota_warning':
        actions.push({
          label: 'Upgrade Plan',
          callback: () => {
            this.emit('action_triggered', {
              action: 'upgrade_plan',
              quotaType: eventData.data.quotaType
            });
          }
        });
        break;

      case 'credential_expired':
        actions.push({
          label: 'Update Credential',
          callback: () => {
            this.emit('action_triggered', {
              action: 'update_credential',
              credentialType: eventData.data.credentialType
            });
          }
        });
        break;

      case 'api_rate_limit_warning':
        actions.push({
          label: 'View Usage',
          callback: () => {
            this.emit('action_triggered', {
              action: 'view_api_usage',
              service: eventData.data.service
            });
          }
        });
        break;
    }

    return actions;
  }

  // Add or update a notification rule
  addRule(rule: NotificationRule): void {
    this.notificationRules.set(rule.id, rule);
  }

  // Remove a notification rule
  removeRule(ruleId: string): void {
    this.notificationRules.delete(ruleId);
    this.lastNotificationTime.delete(ruleId);
  }

  // Enable/disable a rule
  toggleRule(ruleId: string, enabled: boolean): void {
    if (rule) {
      rule.enabled = enabled;
    }
  }

  // Get all notification rules
  getRules(): NotificationRule[] {
    return Array.from(this.notificationRules.values());
  }

  // Get recent events
  getRecentEvents(limit: number = 50): AppEventData[] {
    return this.eventHistory.slice(0, limit);
  }

  // Clear event history
  clearEventHistory(): void {
    this.eventHistory = [];
  }

  // Get event statistics
  getEventStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySource: Record<string, number>;
    recentEventRate: number; // events per minute in last 10 minutes
  } {
    
    const eventsByType: Record<string, number> = {};
    const eventsBySource: Record<string, number> = {};

    this.eventHistory.forEach(event => {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      
      // Count by source
      eventsBySource[event.source] = (eventsBySource[event.source] || 0) + 1;
      
      // Count recent events
      if (event.timestamp >= tenMinutesAgo) {
        recentEvents++;
      }
    });

    return {
      totalEvents: this.eventHistory.length,
      eventsByType,
      eventsBySource,
      recentEventRate: recentEvents / 10 // per minute
    };
  }

  // Simulate some application events for demonstration
  startEventSimulation(): void {
    if (!this.isInitialized) return;

    // Generate realistic application events
    setInterval(() => {
      // Workflow execution events
      if (Math.random() > 0.7) {
        const success = Math.random() > 0.3;
        this.emitEvent('workflow_execution_completed', {
          workflowName: `Workflow ${Math.floor(Math.random() * 5) + 1}`,
          success,
          duration: Math.random() * 3000 + 500,
          error: success ? null : 'Network timeout error',
          nodeCount: Math.floor(Math.random() * 10) + 3
        }, 'workflow_engine');
      }

      // Test execution events
      if (Math.random() > 0.8) {
        const passed = Math.random() > 0.2;
        this.emitEvent('test_execution_completed', {
          testName: `Test Case ${Math.floor(Math.random() * 20) + 1}`,
          status: passed ? 'passed' : 'failed',
          duration: Math.random() * 2000 + 100,
          error: passed ? null : 'Assertion failed: expected true but got false'
        }, 'testing_framework');
      }

      // Quota check events
      if (Math.random() > 0.95) {
        const quotaTypes = ['api_calls', 'storage', 'bandwidth', 'executions'];
        const quotaType = quotaTypes[Math.floor(Math.random() * quotaTypes.length)];
        this.emitEvent('quota_check', {
          quotaType,
          percentage: Math.floor(Math.random() * 30) + 70, // 70-100%
          used: Math.floor(Math.random() * 1000) + 800,
          limit: 1000
        }, 'quota_manager');
      }

      // New template events
      if (Math.random() > 0.98) {
        const templateName = `Template ${Math.floor(Math.random() * 100) + 1}`;
        this.emitEvent('template_added', {
          templateName,
          category: 'analytics',
          author: 'System'
        }, 'template_manager');
      }

      // Webhook configuration events
      if (Math.random() > 0.97) {
        this.emitEvent('webhook_configured', {
          webhookName: `Webhook ${Math.floor(Math.random() * 5) + 1}`,
          url: 'https://api.example.com/webhook',
          events: ['workflow.completed', 'test.failed']
        }, 'webhook_manager');
      }

      // Node execution events
      if (Math.random() > 0.85) {
        const nodeNames = ['Transform Data', 'Send Email', 'HTTP Request', 'Database Query'];
        const nodeName = nodeNames[Math.floor(Math.random() * nodeNames.length)];
        this.emitEvent('node_execution_completed', {
          nodeName,
          nodeType: nodeName.toLowerCase().replace(' ', '_'),
          duration: Math.random() * 8000 + 500, // 500ms to 8.5s
          success: Math.random() > 0.1
        }, 'execution_engine');
      }
    }, 5000);

    logger.info('Event-based notification simulation started');
  }

  // Stop all simulations (useful for cleanup)
  stopEventSimulation(): void {
    // In a real implementation, you'd track interval IDs and clear them
    logger.info('Event simulation stopped');
  }
}

// Singleton instance
export const eventNotificationService = new EventNotificationService();

// Auto-start event simulation in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Start simulation after a short delay to allow initialization
  setTimeout(() => {
    eventNotificationService.startEventSimulation();
  }, 2000);
}
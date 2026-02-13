/**
 * Approval Notifier - Sends notifications for approval requests
 * Integrates with multiple notification channels
 */

import { logger } from '../services/SimpleLogger';
import { ApprovalRequest, ApprovalNotification, Approver, NotificationChannel } from '../types/approval';
import { EmailApprovalChannel } from './channels/EmailApproval';
import { SlackApprovalChannel } from './channels/SlackApproval';

export interface INotificationChannel {
  name: string;
  send(notification: ApprovalNotification): Promise<{ success: boolean; error?: string }>;
}

export class ApprovalNotifier {
  private channels = new Map<NotificationChannel, INotificationChannel>();
  private notificationQueue: Array<{
    notification: ApprovalNotification;
    channels: INotificationChannel[];
    retries: number;
  }> = [];
  private processing = false;

  constructor() {
    // Register default channels
    this.registerChannel('email', new EmailApprovalChannel());
    this.registerChannel('slack', new SlackApprovalChannel());

    logger.info('ApprovalNotifier initialized');
  }

  /**
   * Register a notification channel
   */
  registerChannel(channelType: NotificationChannel, channel: INotificationChannel): void {
    this.channels.set(channelType, channel);
    logger.info(`Registered notification channel: ${channelType}`);
  }

  /**
   * Send notification for new approval request
   */
  async notifyNewRequest(request: ApprovalRequest, baseUrl: string = ''): Promise<void> {
    logger.info('Sending new approval request notifications', {
      requestId: request.id,
      approvers: request.approvers.length,
    });

    for (const approver of request.approvers) {
      await this.sendNotification(
        {
          requestId: request.id,
          approver,
          type: 'new_request',
          subject: `Approval Required: ${request.dataPreview?.title || request.nodeName}`,
          body: this.buildNotificationBody(request, approver, 'new_request'),
          data: {
            workflowName: request.workflowName,
            nodeName: request.nodeName,
            priority: request.priority,
            expiresAt: request.expiresAt,
          },
          actionLinks: this.buildActionLinks(request.id, baseUrl),
          priority: request.priority,
        },
        approver.notificationChannels
      );
    }
  }

  /**
   * Send reminder notification
   */
  async notifyReminder(request: ApprovalRequest, baseUrl: string = ''): Promise<void> {
    logger.info('Sending reminder notifications', {
      requestId: request.id,
    });

    // Only send to approvers who haven't responded
    const pendingApprovers = request.approvers.filter(
      (approver) => !request.responses.some((r) => r.approverId === approver.id || r.approverEmail === approver.email)
    );

    for (const approver of pendingApprovers) {
      await this.sendNotification(
        {
          requestId: request.id,
          approver,
          type: 'reminder',
          subject: `Reminder: Approval Required - ${request.dataPreview?.title || request.nodeName}`,
          body: this.buildNotificationBody(request, approver, 'reminder'),
          data: {
            workflowName: request.workflowName,
            nodeName: request.nodeName,
            priority: request.priority,
            expiresAt: request.expiresAt,
            responseCount: request.responses.length,
            totalApprovers: request.approvers.length,
          },
          actionLinks: this.buildActionLinks(request.id, baseUrl),
          priority: request.priority,
        },
        approver.notificationChannels
      );
    }
  }

  /**
   * Send escalation notification
   */
  async notifyEscalation(request: ApprovalRequest, baseUrl: string = ''): Promise<void> {
    if (!request.escalationTargets || request.escalationTargets.length === 0) {
      return;
    }

    logger.info('Sending escalation notifications', {
      requestId: request.id,
      escalationTargets: request.escalationTargets.length,
    });

    for (const target of request.escalationTargets) {
      await this.sendNotification(
        {
          requestId: request.id,
          approver: target,
          type: 'escalation',
          subject: `ESCALATED: Approval Required - ${request.dataPreview?.title || request.nodeName}`,
          body: this.buildNotificationBody(request, target, 'escalation'),
          data: {
            workflowName: request.workflowName,
            nodeName: request.nodeName,
            priority: request.priority,
            originalApprovers: request.approvers.length,
            responseCount: request.responses.length,
          },
          actionLinks: this.buildActionLinks(request.id, baseUrl),
          priority: 'critical',
        },
        target.notificationChannels
      );
    }
  }

  /**
   * Send status change notification
   */
  async notifyStatusChange(request: ApprovalRequest, newStatus: string): Promise<void> {
    logger.info('Sending status change notifications', {
      requestId: request.id,
      status: newStatus,
    });

    // Notify all approvers about status change
    for (const approver of request.approvers) {
      await this.sendNotification(
        {
          requestId: request.id,
          approver,
          type: 'status_change',
          subject: `Approval ${newStatus}: ${request.dataPreview?.title || request.nodeName}`,
          body: this.buildNotificationBody(request, approver, 'status_change'),
          data: {
            workflowName: request.workflowName,
            nodeName: request.nodeName,
            newStatus,
            responseCount: request.responses.length,
          },
        },
        approver.notificationChannels.filter((c) => c === 'email' || c === 'in-app') // Don't spam with Slack for status changes
      );
    }
  }

  /**
   * Send delegation notification
   */
  async notifyDelegation(
    request: ApprovalRequest,
    fromApprover: Approver,
    toApprover: Approver,
    reason?: string,
    baseUrl: string = ''
  ): Promise<void> {
    logger.info('Sending delegation notification', {
      requestId: request.id,
      from: fromApprover.name,
      to: toApprover.name,
    });

    await this.sendNotification(
      {
        requestId: request.id,
        approver: toApprover,
        type: 'delegation',
        subject: `Delegated Approval: ${request.dataPreview?.title || request.nodeName}`,
        body: `${fromApprover.name} has delegated an approval request to you.\n\n${
          reason ? `Reason: ${reason}\n\n` : ''
        }${this.buildNotificationBody(request, toApprover, 'delegation')}`,
        data: {
          workflowName: request.workflowName,
          nodeName: request.nodeName,
          delegatedFrom: fromApprover.name,
          reason,
        },
        actionLinks: this.buildActionLinks(request.id, baseUrl),
        priority: request.priority,
      },
      toApprover.notificationChannels
    );
  }

  /**
   * Send notification through specified channels
   */
  private async sendNotification(
    notification: ApprovalNotification,
    channelTypes: NotificationChannel[]
  ): Promise<void> {
    const channels = channelTypes
      .map((type) => this.channels.get(type))
      .filter((channel): channel is INotificationChannel => channel !== undefined);

    if (channels.length === 0) {
      logger.warn('No valid notification channels found', {
        requestedChannels: channelTypes,
      });
      return;
    }

    // Add to queue
    this.notificationQueue.push({
      notification,
      channels,
      retries: 0,
    });

    // Start processing if not already running
    if (!this.processing) {
      await this.processQueue();
    }
  }

  /**
   * Process notification queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    while (this.notificationQueue.length > 0) {
      const item = this.notificationQueue.shift();
      if (!item) continue;

      const { notification, channels, retries } = item;

      for (const channel of channels) {
        try {
          const result = await channel.send(notification);

          if (!result.success) {
            logger.warn('Notification failed', {
              channel: channel.name,
              requestId: notification.requestId,
              error: result.error,
              retries,
            });

            // Retry logic
            if (retries < 3) {
              setTimeout(() => {
                this.notificationQueue.push({
                  notification,
                  channels: [channel],
                  retries: retries + 1,
                });
              }, 1000 * Math.pow(2, retries)); // Exponential backoff
            }
          } else {
            logger.info('Notification sent successfully', {
              channel: channel.name,
              requestId: notification.requestId,
              approver: notification.approver.name,
            });
          }
        } catch (error) {
          logger.error('Error sending notification', {
            channel: channel.name,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    this.processing = false;
  }

  /**
   * Build notification body
   */
  private buildNotificationBody(
    request: ApprovalRequest,
    approver: Approver,
    type: 'new_request' | 'reminder' | 'escalation' | 'status_change' | 'delegation'
  ): string {
    let body = '';

    switch (type) {
      case 'new_request':
        body = `Hello ${approver.name},\n\nYou have a new approval request:\n\n`;
        break;
      case 'reminder':
        body = `Hello ${approver.name},\n\nThis is a reminder that you have a pending approval request:\n\n`;
        break;
      case 'escalation':
        body = `Hello ${approver.name},\n\nAn approval request has been escalated to you:\n\n`;
        break;
      case 'status_change':
        body = `Hello ${approver.name},\n\nThe approval request status has changed:\n\n`;
        break;
      case 'delegation':
        body = `Hello ${approver.name},\n\nAn approval request has been delegated to you:\n\n`;
        break;
    }

    body += `Workflow: ${request.workflowName}\n`;
    body += `Node: ${request.nodeName}\n`;

    if (request.dataPreview) {
      body += `\nRequest: ${request.dataPreview.title}\n`;
      if (request.dataPreview.summary) {
        body += `${request.dataPreview.summary}\n`;
      }
      if (request.dataPreview.fields.length > 0) {
        body += '\nDetails:\n';
        request.dataPreview.fields.forEach((field) => {
          body += `- ${field.label}: ${field.value}\n`;
        });
      }
    }

    if (request.priority) {
      body += `\nPriority: ${request.priority.toUpperCase()}\n`;
    }

    if (request.expiresAt) {
      const timeRemaining = Math.max(0, Math.floor((new Date(request.expiresAt).getTime() - Date.now()) / 60000));
      body += `Time Remaining: ${timeRemaining} minutes\n`;
    }

    body += `\nApproval Mode: ${request.approvalMode}\n`;
    body += `Responses: ${request.responses.length}/${request.approvers.length}\n`;

    return body;
  }

  /**
   * Build action links
   */
  private buildActionLinks(requestId: string, baseUrl: string): ApprovalNotification['actionLinks'] {
    if (!baseUrl) {
      return undefined;
    }

    return {
      approve: `${baseUrl}/api/approvals/${requestId}/approve`,
      reject: `${baseUrl}/api/approvals/${requestId}/reject`,
      view: `${baseUrl}/approvals/${requestId}`,
    };
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.notificationQueue.length;
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.notificationQueue = [];
  }
}

// Export singleton instance
export const approvalNotifier = new ApprovalNotifier();

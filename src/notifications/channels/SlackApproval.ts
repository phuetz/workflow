/**
 * Slack Approval Channel - Send approval notifications via Slack
 * Includes interactive buttons for one-click approval/rejection
 */

import { logger } from '../../services/SimpleLogger';
import { ApprovalNotification } from '../../types/approval';
import type { INotificationChannel } from '../ApprovalNotifier';

export class SlackApprovalChannel implements INotificationChannel {
  name = 'slack';
  private webhookUrl: string | null = null;

  constructor() {
    // Initialize from environment or config
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || null;
  }

  /**
   * Send Slack notification
   */
  async send(notification: ApprovalNotification): Promise<{ success: boolean; error?: string }> {
    try {
      const message = this.buildSlackMessage(notification);

      if (this.webhookUrl) {
        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        });

        if (!response.ok) {
          throw new Error(`Slack API error: ${response.statusText}`);
        }
      } else {
        // Fallback: log message
        logger.info('Slack notification (webhook not configured)', {
          approver: notification.approver.name,
          subject: notification.subject,
        });
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to send Slack approval notification', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Build Slack message with Block Kit
   */
  private buildSlackMessage(notification: ApprovalNotification) {
    const priorityEmojis = {
      low: ':large_green_circle:',
      medium: ':large_blue_circle:',
      high: ':large_orange_circle:',
      critical: ':red_circle:',
    };

    const typeEmojis = {
      new_request: ':memo:',
      reminder: ':alarm_clock:',
      escalation: ':rotating_light:',
      delegation: ':busts_in_silhouette:',
      status_change: ':chart_with_upwards_trend:',
    };

    const priorityEmoji = notification.priority
      ? priorityEmojis[notification.priority]
      : priorityEmojis.medium;

    const typeEmoji = typeEmojis[notification.type] || ':bell:';

    const blocks: unknown[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${typeEmoji} ${notification.subject}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Attention:* <@${notification.approver.email}>`,
        },
      },
    ];

    // Priority badge
    if (notification.priority) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `${priorityEmoji} *${notification.priority.toUpperCase()} Priority*`,
          },
        ],
      });
    }

    // Workflow info
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Workflow:*\n${notification.data.workflowName || 'N/A'}`,
        },
        {
          type: 'mrkdwn',
          text: `*Node:*\n${notification.data.nodeName || 'N/A'}`,
        },
      ],
    });

    // Expiration info
    if (notification.data.expiresAt) {
      const expiresAt = new Date(notification.data.expiresAt as string);
      const timeRemaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 60000));
      const isUrgent = timeRemaining < 60;

      blocks.push({
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Expires:*\n${expiresAt.toLocaleString()}`,
          },
          {
            type: 'mrkdwn',
            text: `*Time Remaining:*\n${isUrgent ? ':warning: ' : ''}${timeRemaining} minutes`,
          },
        ],
      });
    }

    // Response info
    if (notification.data.responseCount !== undefined) {
      blocks.push({
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Responses:*\n${notification.data.responseCount}/${notification.data.totalApprovers}`,
          },
        ],
      });
    }

    // Divider
    blocks.push({
      type: 'divider',
    });

    // Action buttons
    if (notification.actionLinks) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✓ Approve',
              emoji: true,
            },
            style: 'primary',
            url: notification.actionLinks.approve,
            action_id: 'approve_request',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✗ Reject',
              emoji: true,
            },
            style: 'danger',
            url: notification.actionLinks.reject,
            action_id: 'reject_request',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Details',
              emoji: true,
            },
            url: notification.actionLinks.view,
            action_id: 'view_details',
          },
        ],
      });
    }

    // Urgent warning
    if (
      notification.data.expiresAt &&
      new Date(notification.data.expiresAt as string).getTime() - Date.now() < 3600000
    ) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: ':warning: *Urgent:* This approval request expires soon!',
          },
        ],
      });
    }

    // Footer
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Request ID: \`${notification.requestId}\` | ${new Date().toLocaleString()}`,
        },
      ],
    });

    return {
      blocks,
      text: notification.subject, // Fallback text for notifications
    };
  }

  /**
   * Set webhook URL
   */
  setWebhookUrl(url: string): void {
    this.webhookUrl = url;
  }
}

/**
 * Email Approval Channel - Send approval notifications via email
 * Includes approve/reject links for one-click actions
 */

import { logger } from '../../services/SimpleLogger';
import { ApprovalNotification } from '../../types/approval';
import type { INotificationChannel } from '../ApprovalNotifier';

export class EmailApprovalChannel implements INotificationChannel {
  name = 'email';
  private emailService: EmailService | null = null;

  constructor() {
    // Initialize email service (could be nodemailer, SendGrid, AWS SES, etc.)
    this.initializeEmailService();
  }

  /**
   * Send email notification
   */
  async send(notification: ApprovalNotification): Promise<{ success: boolean; error?: string }> {
    try {
      if (!notification.approver.email) {
        return {
          success: false,
          error: 'No email address configured for approver',
        };
      }

      // Build email HTML
      const html = this.buildEmailHtml(notification);
      const text = notification.body;

      // Send email
      if (this.emailService) {
        await this.emailService.send({
          to: notification.approver.email,
          subject: notification.subject,
          html,
          text,
        });
      } else {
        // Fallback: log email
        logger.info('Email notification (service not configured)', {
          to: notification.approver.email,
          subject: notification.subject,
        });
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to send email approval notification', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Build HTML email template
   */
  private buildEmailHtml(notification: ApprovalNotification): string {
    const priorityColors = {
      low: '#10b981',
      medium: '#3b82f6',
      high: '#f59e0b',
      critical: '#ef4444',
    };

    const priorityColor = notification.priority
      ? priorityColors[notification.priority]
      : priorityColors.medium;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${notification.subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #374151;
      background-color: #f3f4f6;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: ${priorityColor};
      color: #ffffff;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 32px 24px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      background-color: ${priorityColor};
      color: #ffffff;
      margin-bottom: 16px;
    }
    .info-section {
      background-color: #f9fafb;
      border-left: 4px solid ${priorityColor};
      padding: 16px;
      margin: 16px 0;
      border-radius: 4px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
    }
    .info-value {
      color: #111827;
    }
    .action-buttons {
      display: flex;
      gap: 12px;
      margin: 32px 0;
      justify-content: center;
    }
    .button {
      display: inline-block;
      padding: 12px 32px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      transition: all 0.2s;
    }
    .button-approve {
      background-color: #10b981;
      color: #ffffff;
    }
    .button-approve:hover {
      background-color: #059669;
    }
    .button-reject {
      background-color: #ef4444;
      color: #ffffff;
    }
    .button-reject:hover {
      background-color: #dc2626;
    }
    .button-view {
      background-color: #6b7280;
      color: #ffffff;
    }
    .button-view:hover {
      background-color: #4b5563;
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 16px 0;
      border-radius: 4px;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${this.getTypeIcon(notification.type)} ${notification.subject}</h1>
    </div>

    <div class="content">
      ${notification.priority ? `<span class="badge">${notification.priority} Priority</span>` : ''}

      <p>Hello ${notification.approver.name},</p>

      ${this.getTypeMessage(notification.type)}

      <div class="info-section">
        ${
          notification.data.workflowName
            ? `<div class="info-row">
          <span class="info-label">Workflow:</span>
          <span class="info-value">${notification.data.workflowName}</span>
        </div>`
            : ''
        }
        ${
          notification.data.nodeName
            ? `<div class="info-row">
          <span class="info-label">Node:</span>
          <span class="info-value">${notification.data.nodeName}</span>
        </div>`
            : ''
        }
        ${
          notification.data.expiresAt
            ? `<div class="info-row">
          <span class="info-label">Expires:</span>
          <span class="info-value">${new Date(notification.data.expiresAt as string).toLocaleString()}</span>
        </div>`
            : ''
        }
        ${
          notification.data.responseCount !== undefined
            ? `<div class="info-row">
          <span class="info-label">Responses:</span>
          <span class="info-value">${notification.data.responseCount}/${notification.data.totalApprovers}</span>
        </div>`
            : ''
        }
      </div>

      ${
        notification.data.expiresAt &&
        new Date(notification.data.expiresAt as string).getTime() - Date.now() < 3600000
          ? `<div class="warning">
        ⚠️ <strong>Urgent:</strong> This approval request expires soon!
      </div>`
          : ''
      }

      ${
        notification.actionLinks
          ? `<div class="action-buttons">
        <a href="${notification.actionLinks.approve}" class="button button-approve">✓ Approve</a>
        <a href="${notification.actionLinks.reject}" class="button button-reject">✗ Reject</a>
      </div>

      <div style="text-align: center; margin-top: 16px;">
        <a href="${notification.actionLinks.view}" class="button button-view">View Details</a>
      </div>`
          : ''
      }
    </div>

    <div class="footer">
      <p>This is an automated notification from the Workflow Automation Platform.</p>
      <p>If you have any questions, please contact your workflow administrator.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Get type icon
   */
  private getTypeIcon(type: string): string {
    switch (type) {
      case 'new_request':
        return '📋';
      case 'reminder':
        return '⏰';
      case 'escalation':
        return '🚨';
      case 'delegation':
        return '👥';
      case 'status_change':
        return '📊';
      default:
        return '📬';
    }
  }

  /**
   * Get type message
   */
  private getTypeMessage(type: string): string {
    switch (type) {
      case 'new_request':
        return '<p>You have a new approval request that requires your attention.</p>';
      case 'reminder':
        return '<p>This is a reminder that you have a pending approval request.</p>';
      case 'escalation':
        return '<p><strong>This approval request has been escalated to you.</strong></p>';
      case 'delegation':
        return '<p>An approval request has been delegated to you.</p>';
      case 'status_change':
        return '<p>The status of an approval request has changed.</p>';
      default:
        return '';
    }
  }

  /**
   * Initialize email service
   */
  private initializeEmailService(): void {
    // In production, initialize with actual email service
    // For now, we'll use a mock service
    this.emailService = {
      send: async (options: { to: string; subject: string; html: string; text: string }) => {
        logger.info('Email sent (mock)', {
          to: options.to,
          subject: options.subject,
        });
        return { success: true };
      },
    };
  }
}

interface EmailService {
  send(options: { to: string; subject: string; html: string; text: string }): Promise<{ success: boolean }>;
}

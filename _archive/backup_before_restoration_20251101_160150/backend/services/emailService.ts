import { logger } from '../../services/LoggingService';
/**
 * Email Service
 * Handles sending transactional emails
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly baseUrl: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@workflowpro.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'WorkflowPro';
    this.baseUrl = process.env.APP_URL || 'http://localhost:3000';
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(user: {
    email: string;
    firstName?: string;
    emailVerificationToken?: string;
  }): Promise<void> {
    if (!user.emailVerificationToken) {
      throw new Error('No verification token found');
    }

    
    const template: EmailTemplate = {
      subject: 'Verify your WorkflowPro account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Welcome to WorkflowPro!</h1>
          <p>Hi ${user.firstName || 'there'},</p>
          <p>Please verify your email address by clicking the link below:</p>
          <div style="margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #4CAF50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            WorkflowPro - Visual Workflow Automation Platform
          </p>
        </div>
      `,
      text: `
Welcome to WorkflowPro!

Hi ${user.firstName || 'there'},

Please verify your email address by visiting:
${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

WorkflowPro - Visual Workflow Automation Platform
      `
    };

    await this.sendEmail(user.email, template);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user: {
    email: string;
    firstName?: string;
  }, resetToken: string): Promise<void> {
    
    const template: EmailTemplate = {
      subject: 'Reset your WorkflowPro password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Password Reset Request</h1>
          <p>Hi ${user.firstName || 'there'},</p>
          <p>We received a request to reset your password. Click the link below to create a new password:</p>
          <div style="margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #2196F3; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${resetUrl}</p>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p><strong>If you didn't request this password reset, please ignore this email.</strong></p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            WorkflowPro - Visual Workflow Automation Platform
          </p>
        </div>
      `,
      text: `
Password Reset Request

Hi ${user.firstName || 'there'},

We received a request to reset your password. Visit the link below to create a new password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email.

WorkflowPro - Visual Workflow Automation Platform
      `
    };

    await this.sendEmail(user.email, template);
  }

  /**
   * Send welcome email after successful registration
   */
  async sendWelcomeEmail(user: {
    email: string;
    firstName?: string;
  }): Promise<void> {
    const template: EmailTemplate = {
      subject: 'Welcome to WorkflowPro!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Welcome aboard! 🎉</h1>
          <p>Hi ${user.firstName || 'there'},</p>
          <p>Your WorkflowPro account has been successfully created. You're now ready to start building amazing workflows!</p>
          
          <h2>Getting Started</h2>
          <ul style="line-height: 1.8;">
            <li>📖 Check out our <a href="${this.baseUrl}/docs">documentation</a></li>
            <li>🚀 Create your first workflow</li>
            <li>🛒 Explore the marketplace for pre-built integrations</li>
            <li>💬 Join our community forum</li>
          </ul>
          
          <div style="margin: 30px 0;">
            <a href="${this.baseUrl}/dashboard" 
               style="background-color: #673AB7; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
          
          <p>Need help? Feel free to reach out to our support team at support@workflowpro.com</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            WorkflowPro - Visual Workflow Automation Platform
          </p>
        </div>
      `,
      text: `
Welcome aboard! 🎉

Hi ${user.firstName || 'there'},

Your WorkflowPro account has been successfully created. You're now ready to start building amazing workflows!

Getting Started:
- Check out our documentation at ${this.baseUrl}/docs
- Create your first workflow
- Explore the marketplace for pre-built integrations
- Join our community forum

Go to Dashboard: ${this.baseUrl}/dashboard

Need help? Feel free to reach out to our support team at support@workflowpro.com

WorkflowPro - Visual Workflow Automation Platform
      `
    };

    await this.sendEmail(user.email, template);
  }

  /**
   * Send workflow execution notification
   */
  async sendWorkflowNotification(user: {
    email: string;
    firstName?: string;
  }, workflow: {
    name: string;
    status: 'success' | 'failure';
    executionTime: number;
    error?: string;
  }): Promise<void> {
    
    const template: EmailTemplate = {
      subject: `${statusEmoji} Workflow "${workflow.name}" ${workflow.status}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Workflow Execution ${workflow.status === 'success' ? 'Completed' : 'Failed'}</h1>
          <p>Hi ${user.firstName || 'there'},</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: ${statusColor};">${statusEmoji} ${workflow.name}</h2>
            <p><strong>Status:</strong> ${workflow.status}</p>
            <p><strong>Execution Time:</strong> ${workflow.executionTime}ms</p>
            ${workflow.error ? `<p><strong>Error:</strong> ${workflow.error}</p>` : ''}
          </div>
          
          <div style="margin: 30px 0;">
            <a href="${this.baseUrl}/workflows" 
               style="background-color: #2196F3; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block;">
              View Workflow Details
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            You're receiving this because you have workflow notifications enabled.
            <a href="${this.baseUrl}/settings/notifications">Manage notification preferences</a>
          </p>
        </div>
      `,
      text: `
Workflow Execution ${workflow.status === 'success' ? 'Completed' : 'Failed'}

Hi ${user.firstName || 'there'},

${statusEmoji} ${workflow.name}
Status: ${workflow.status}
Execution Time: ${workflow.executionTime}ms
${workflow.error ? `Error: ${workflow.error}` : ''}

View workflow details: ${this.baseUrl}/workflows

You're receiving this because you have workflow notifications enabled.
Manage notification preferences: ${this.baseUrl}/settings/notifications
      `
    };

    await this.sendEmail(user.email, template);
  }

  /**
   * Core email sending method
   */
  private async sendEmail(to: string, template: EmailTemplate): Promise<void> {
    // In development, log emails to console
    if (process.env.NODE_ENV === 'development') {
      logger.info('📧 Email would be sent:');
      logger.info('To:', to);
      logger.info('From:', `${this.fromName} <${this.fromEmail}>`);
      logger.info('Subject:', template.subject);
      logger.info('---');
      logger.info(template.text || 'No text version');
      logger.info('---');
      return;
    }

    // In production, integrate with email service provider
    // Options: SendGrid, AWS SES, Mailgun, etc.
    
    try {
      // Example with a generic email API:
      if (emailProvider) {
        await emailProvider.send({
          to,
          from: {
            email: this.fromEmail,
            name: this.fromName
          },
          subject: template.subject,
          html: template.html,
          text: template.text
        });
      }
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new Error('Email delivery failed');
    }
  }

  /**
   * Get configured email provider
   */
  private getEmailProvider(): Record<string, unknown> | null {
    // This would return the configured email service provider
    // For now, return null to use console logging
    return null;
  }
}

// Singleton instance
export const emailService = new EmailService();
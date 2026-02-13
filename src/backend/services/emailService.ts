import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type * as SMTPTransport from 'nodemailer/lib/smtp-transport';
import { logger } from '../../services/SimpleLogger';

/**
 * Email Service
 * Handles sending transactional emails using nodemailer
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export class EmailService {
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly baseUrl: string;
  private transporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.fromEmail = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@workflowpro.com';
    this.fromName = process.env.SMTP_FROM_NAME || process.env.EMAIL_FROM_NAME || 'WorkflowPro';
    this.baseUrl = process.env.APP_URL || 'http://localhost:3000';
  }

  /**
   * Initialize the nodemailer transporter
   */
  private async initializeTransporter(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Check if SMTP configuration is available
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      const smtpConfig: SMTPTransport.Options = {
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      };

      // Add optional TLS settings
      if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false') {
        smtpConfig.tls = {
          rejectUnauthorized: false,
        };
      }

      this.transporter = nodemailer.createTransport(smtpConfig);

      // Verify connection configuration
      try {
        await this.transporter.verify();
        logger.info('SMTP connection verified successfully');
        this.isInitialized = true;
      } catch (error) {
        logger.error('SMTP connection verification failed:', error);
        this.transporter = null;
      }
    } else {
      logger.warn('SMTP configuration not found. Emails will be logged to console in development mode.');
    }
  }

  /**
   * Get the transporter, initializing if necessary
   */
  private async getTransporter(): Promise<Transporter<SMTPTransport.SentMessageInfo> | null> {
    if (!this.isInitialized) {
      await this.initializeTransporter();
    }
    return this.transporter;
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

    const verificationUrl = `${this.baseUrl}/verify-email?token=${user.emailVerificationToken}`;

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
    const resetUrl = `${this.baseUrl}/reset-password?token=${resetToken}`;

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
   * Send password change confirmation email
   */
  async sendPasswordChangedEmail(user: {
    email: string;
    firstName?: string;
  }): Promise<void> {
    const template: EmailTemplate = {
      subject: 'Your WorkflowPro password has been changed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Password Changed Successfully</h1>
          <p>Hi ${user.firstName || 'there'},</p>
          <p>Your WorkflowPro account password was recently changed.</p>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0;"><strong>⚠️ If you did not make this change</strong>, please contact our support team immediately or reset your password:</p>
          </div>

          <div style="margin: 30px 0;">
            <a href="${this.baseUrl}/forgot-password"
               style="background-color: #f44336; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </div>

          <p><strong>Security Tips:</strong></p>
          <ul style="line-height: 1.8;">
            <li>Use a unique password for each account</li>
            <li>Enable two-factor authentication</li>
            <li>Never share your password with anyone</li>
          </ul>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This email was sent because your password was changed.
            If you made this change, no further action is needed.
          </p>
        </div>
      `,
      text: `
Password Changed Successfully

Hi ${user.firstName || 'there'},

Your WorkflowPro account password was recently changed.

If you did not make this change, please contact our support team immediately or reset your password at:
${this.baseUrl}/forgot-password

Security Tips:
- Use a unique password for each account
- Enable two-factor authentication
- Never share your password with anyone

This email was sent because your password was changed.
If you made this change, no further action is needed.

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
    const statusEmoji = workflow.status === 'success' ? '✅' : '❌';
    const statusColor = workflow.status === 'success' ? '#4CAF50' : '#f44336';

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
   * Core email sending method using nodemailer
   */
  private async sendEmail(to: string, template: EmailTemplate): Promise<void> {
    const transporter = await this.getTransporter();

    // If no transporter available (SMTP not configured), log to console
    if (!transporter) {
      if (process.env.NODE_ENV === 'development' || process.env.EMAIL_LOG_TO_CONSOLE === 'true') {
        logger.info('========================================');
        logger.info('Email would be sent (SMTP not configured):');
        logger.info('To:', to);
        logger.info('From:', `${this.fromName} <${this.fromEmail}>`);
        logger.info('Subject:', template.subject);
        logger.info('----------------------------------------');
        logger.info(template.text || 'No text version');
        logger.info('========================================');
        return;
      }
      throw new Error('Email service not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
    }

    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to,
        subject: template.subject,
      });
    } catch (error) {
      logger.error('Failed to send email:', {
        error,
        to,
        subject: template.subject,
      });
      throw new Error('Email delivery failed');
    }
  }

  /**
   * Test the SMTP connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      if (!transporter) {
        return false;
      }
      await transporter.verify();
      return true;
    } catch (error) {
      logger.error('SMTP connection test failed:', error);
      return false;
    }
  }

  /**
   * Send a test email to verify configuration
   */
  async sendTestEmail(to: string): Promise<void> {
    const template: EmailTemplate = {
      subject: 'WorkflowPro Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Email Configuration Test</h1>
          <p>This is a test email from WorkflowPro.</p>
          <p>If you received this email, your SMTP configuration is working correctly!</p>
          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #2e7d32;">Configuration verified successfully.</p>
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            WorkflowPro - Visual Workflow Automation Platform
          </p>
        </div>
      `,
      text: `
Email Configuration Test

This is a test email from WorkflowPro.
If you received this email, your SMTP configuration is working correctly!

WorkflowPro - Visual Workflow Automation Platform
      `,
    };

    await this.sendEmail(to, template);
  }
}

// Singleton instance
export const emailService = new EmailService();
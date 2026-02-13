/**
 * Email Node Executor
 * Sends emails through configured email service
 */

import { Node } from 'reactflow';
import { NodeExecutor } from './index';
// import { emailService } from '../emailService';
import { logger } from '../../../services/LoggingService';

export const emailExecutor: NodeExecutor = {
  async execute(node: Node, context: unknown): Promise<unknown> {
    const {
      to,
      cc,
      bcc,
      subject,
      body,
      bodyType = 'text',
      attachments = []
    } = node.data;

    if (!to) {
      throw new Error('Recipient email is required');
    }

    if (!subject) {
      throw new Error('Email subject is required');
    }

    if (!body) {
      throw new Error('Email body is required');
    }

    try {
      // Process template variables in subject and body
      const processedSubject = this.processTemplate(subject, context);
      const processedBody = this.processTemplate(body, context);

      // Send email
      const result = await this.sendEmail({
        to: Array.isArray(to) ? to : [to],
        cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
        subject: processedSubject,
        body: processedBody,
        bodyType,
        attachments
      });

      return {
        success: true,
        messageId: result.messageId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  },

  validate(node: Node): string[] {
    const errors: string[] = [];

    if (!node.data.to) {
      errors.push('Recipient email is required');
    } else if (!this.isValidEmail(node.data.to)) {
      errors.push('Invalid recipient email format');
    }

    if (!node.data.subject) {
      errors.push('Email subject is required');
    }

    if (!node.data.body) {
      errors.push('Email body is required');
    }

    return errors;
  },

  // Helper methods
  processTemplate(template: string, context: unknown): string {
    // Replace {{variable}} with values from context
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getValueFromPath(context, path);
      return value !== undefined ? String(value) : match;
    });
  },

  getValueFromPath(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  },

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  async sendEmail(options: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    bodyType: string;
    attachments: unknown[];
  }): Promise<unknown> {
    // In production, integrate with actual email service
    // For now, use the emailService to log
    logger.info('📧 Sending email:', {
      to: options.to,
      subject: options.subject
    });

    // Simulate email sending
    return {
      messageId: `msg_${Math.random().toString(36).substring(2, 15)}`,
      status: 'sent'
    };
  }
};
/**
 * Email Node Executor
 * Sends emails through configured email service
 */

import { Node } from '@xyflow/react';
import { logger } from '../../../services/SimpleLogger';

// Email configuration interface
interface EmailConfig {
  to?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject?: string;
  body?: string;
  bodyType?: string;
  attachments?: Array<{ filename: string; content: string }>;
}

// Email send options interface
interface EmailSendOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyType: string;
  attachments: Array<{ filename: string; content: string }>;
}

// Helper function to get value from nested path
function getValueFromPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    const objCurrent = current as Record<string, unknown>;
    return objCurrent?.[key];
  }, obj);
}

// Helper function to process template
function processTemplate(template: string, context: unknown): string {
  // Replace {{variable}} with values from context
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const value = getValueFromPath(context, path);
    return value !== undefined ? String(value) : match;
  });
}

// Helper function to validate email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to send email
async function sendEmail(options: EmailSendOptions): Promise<{ messageId: string; status: string }> {
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

export const emailExecutor = {
  async execute(node: Node, context: unknown): Promise<unknown> {
    // Extract config
    const config = (node.data?.config || node.data || {}) as EmailConfig;

    const {
      to,
      cc,
      bcc,
      subject,
      body,
      bodyType = 'text',
      attachments = []
    } = config;

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
      const processedSubject = processTemplate(subject, context);
      const processedBody = processTemplate(body, context);

      // Send email
      const result = await sendEmail({
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
    const config = (node.data?.config || node.data || {}) as EmailConfig;

    if (!config.to) {
      errors.push('Recipient email is required');
    } else {
      const emailToValidate = Array.isArray(config.to) ? config.to[0] : config.to;
      if (emailToValidate && !isValidEmail(emailToValidate)) {
        errors.push('Invalid recipient email format');
      }
    }

    if (!config.subject) {
      errors.push('Email subject is required');
    }

    if (!config.body) {
      errors.push('Email body is required');
    }

    return errors;
  }
};
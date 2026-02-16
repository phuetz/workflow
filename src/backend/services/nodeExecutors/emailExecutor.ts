/**
 * Email Node Executor
 * Sends emails via SMTP using nodemailer
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import nodemailer from 'nodemailer';
import { logger } from '../../../services/SimpleLogger';

function getValueFromPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    const objCurrent = current as Record<string, unknown>;
    return objCurrent?.[key];
  }, obj);
}

function processTemplate(template: string, context: unknown): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const value = getValueFromPath(context, path);
    return value !== undefined ? String(value) : match;
  });
}

export const emailExecutor: NodeExecutor = {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = context.config || {};
    const credentials = context.credentials || {};

    const to = config.to as string | string[] | undefined;
    const cc = config.cc as string | string[] | undefined;
    const bcc = config.bcc as string | string[] | undefined;
    const subject = config.subject as string | undefined;
    const body = config.body as string | undefined;
    const bodyType = (config.bodyType || 'text') as string;
    const attachments = (config.attachments || []) as Array<{ filename: string; content: string }>;

    if (!to) throw new Error('Recipient email is required');
    if (!subject) throw new Error('Email subject is required');
    if (!body) throw new Error('Email body is required');

    // Process template variables
    const processedSubject = processTemplate(subject, context.input);
    const processedBody = processTemplate(body, context.input);

    // Build SMTP transport from credentials
    const host = credentials.host || credentials.smtpHost || 'localhost';
    const port = credentials.port || credentials.smtpPort || 587;
    const user = credentials.user || credentials.username || credentials.email;
    const pass = credentials.pass || credentials.password;
    const secure = credentials.secure !== undefined ? credentials.secure : port === 465;

    const transport = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Boolean(secure),
      auth: user && pass ? { user, pass } : undefined,
    });

    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: credentials.from || credentials.email || user,
        to: Array.isArray(to) ? to.join(', ') : to,
        cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
        subject: processedSubject,
        attachments: attachments.map(a => ({
          filename: a.filename,
          content: a.content,
        })),
      };

      if (bodyType === 'html') {
        mailOptions.html = processedBody;
      } else {
        mailOptions.text = processedBody;
      }

      const info = await transport.sendMail(mailOptions);

      logger.info('Email sent', {
        messageId: info.messageId,
        to: mailOptions.to,
      });

      return {
        success: true,
        data: {
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
        },
        timestamp: new Date().toISOString(),
      };
    } finally {
      transport.close();
    }
  },
};

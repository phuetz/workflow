/**
 * ReportDistributor - Handles report distribution across multiple channels
 */

import { EventEmitter } from 'events';
import type {
  GeneratedReport,
  DistributionRecipient,
  DistributionChannel,
} from './types';
import { ReportFormatter } from './ReportFormatter';

/**
 * ReportDistributor handles distributing reports to various channels
 */
export class ReportDistributor extends EventEmitter {
  private formatter: ReportFormatter;

  constructor() {
    super();
    this.formatter = new ReportFormatter();
  }

  /**
   * Distribute report to all recipients
   */
  async distributeReport(
    report: GeneratedReport,
    recipients: DistributionRecipient[]
  ): Promise<{ success: string[]; failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };

    for (const recipient of recipients) {
      if (!recipient.enabled) continue;

      try {
        await this.sendToChannel(report, recipient);
        results.success.push(`${recipient.channel}:${recipient.destination}`);

        this.emit('distribution:success', {
          reportId: report.id,
          channel: recipient.channel,
          destination: recipient.destination
        });
      } catch (error) {
        results.failed.push(`${recipient.channel}:${recipient.destination}`);

        this.emit('distribution:failed', {
          reportId: report.id,
          channel: recipient.channel,
          destination: recipient.destination,
          error
        });
      }
    }

    return results;
  }

  /**
   * Send report to a specific channel
   */
  private async sendToChannel(
    report: GeneratedReport,
    recipient: DistributionRecipient
  ): Promise<void> {
    switch (recipient.channel) {
      case 'email' as DistributionChannel:
        await this.sendEmail(report, recipient);
        break;
      case 'slack' as DistributionChannel:
        await this.sendToSlack(report, recipient);
        break;
      case 'teams' as DistributionChannel:
        await this.sendToTeams(report, recipient);
        break;
      case 's3' as DistributionChannel:
        await this.uploadToS3(report, recipient);
        break;
      case 'webhook' as DistributionChannel:
        await this.sendWebhook(report, recipient);
        break;
      case 'sftp' as DistributionChannel:
        await this.uploadToSFTP(report, recipient);
        break;
      default:
        throw new Error(`Unsupported distribution channel: ${recipient.channel}`);
    }
  }

  /**
   * Send report via email
   */
  private async sendEmail(
    report: GeneratedReport,
    recipient: DistributionRecipient
  ): Promise<void> {
    const config = recipient.config;

    this.emit('email:send', {
      to: recipient.destination,
      cc: config.ccRecipients,
      bcc: config.bccRecipients,
      subject: config.emailSubject || `Compliance Report: ${report.content.title}`,
      body: config.emailBody || this.formatter.generateEmailBody(report),
      attachments: [{ path: report.filePath, filename: `${report.id}.${report.format}` }],
    });
  }

  /**
   * Send report to Slack
   */
  private async sendToSlack(
    report: GeneratedReport,
    recipient: DistributionRecipient
  ): Promise<void> {
    const config = recipient.config;

    this.emit('slack:send', {
      channel: config.slackChannel || recipient.destination,
      webhookUrl: config.slackWebhookUrl,
      message: this.formatter.formatSlackMessage(report),
      mentions: config.slackMention,
      attachments: [{ path: report.filePath }],
    });
  }

  /**
   * Send report to Microsoft Teams
   */
  private async sendToTeams(
    report: GeneratedReport,
    recipient: DistributionRecipient
  ): Promise<void> {
    const config = recipient.config;

    this.emit('teams:send', {
      webhookUrl: config.teamsWebhookUrl,
      channel: config.teamsChannel || recipient.destination,
      card: this.formatter.formatTeamsCard(report),
    });
  }

  /**
   * Upload report to S3
   */
  private async uploadToS3(
    report: GeneratedReport,
    recipient: DistributionRecipient
  ): Promise<void> {
    const config = recipient.config;

    this.emit('s3:upload', {
      bucket: config.s3Bucket || recipient.destination,
      key: `${config.s3Prefix || 'reports'}/${report.id}.${report.format}`,
      region: config.s3Region || 'us-east-1',
      filePath: report.filePath,
    });
  }

  /**
   * Send report via webhook
   */
  private async sendWebhook(
    report: GeneratedReport,
    recipient: DistributionRecipient
  ): Promise<void> {
    const config = recipient.config;

    this.emit('webhook:send', {
      url: config.webhookUrl || recipient.destination,
      headers: config.webhookHeaders,
      payload: {
        reportId: report.id,
        reportType: report.reportType,
        generatedAt: report.generatedAt,
        downloadUrl: report.downloadUrl,
        summary: report.content.executiveSummary,
      },
    });
  }

  /**
   * Upload report to SFTP
   */
  private async uploadToSFTP(
    report: GeneratedReport,
    recipient: DistributionRecipient
  ): Promise<void> {
    const config = recipient.config;

    this.emit('sftp:upload', {
      host: config.sftpHost || recipient.destination,
      path: config.sftpPath || `/reports/${report.id}.${report.format}`,
      credentialId: config.sftpCredentialId,
      filePath: report.filePath,
    });
  }
}

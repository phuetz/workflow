/**
 * AlertNotifier - Multi-channel Alert Notification Delivery
 * Handles sending alerts via Email, Slack, Teams, PagerDuty, SMS, and Webhooks
 */

import * as nodemailer from 'nodemailer';
import {
  Alert,
  NotificationChannel,
  DeliveryStatusRecord
} from './types';
import { AlertRouter } from './AlertRouter';
import {
  formatEmailAlert,
  formatSlackAlert,
  formatTeamsAlert,
  formatPagerDutyAlert,
  formatSMSAlert,
  formatWebhookAlert
} from './AlertFormatters';
import {
  makeHttpRequest,
  generateWebhookSignature,
  sendSMS,
  testSMSChannel
} from './ChannelSenders';
import { logger } from '../../services/SimpleLogger';

export class AlertNotifier {
  private emailTransporter?: nodemailer.Transporter;
  private router: AlertRouter;

  constructor(router: AlertRouter) {
    this.router = router;
  }

  /**
   * Configure email transporter
   */
  configureEmailTransporter(channel: NotificationChannel): void {
    if (channel.type === 'email' && channel.config.email) {
      this.emailTransporter = nodemailer.createTransport(channel.config.email);
    }
  }

  /**
   * Send alert through appropriate channels
   */
  async sendAlert(alert: Alert): Promise<void> {
    if (alert.status === 'muted' && alert.muteUntil && alert.muteUntil > new Date()) {
      return;
    }

    const channelNames = this.router.routeAlert(alert);

    for (const channelName of channelNames) {
      const channel = this.router.getChannel(channelName);
      if (channel && channel.enabled) {
        await this.sendToChannel(alert, channel);
      }
    }

    alert.notificationsSent = channelNames.length;
  }

  /**
   * Send alert to specific channel
   */
  async sendToChannel(alert: Alert, channel: NotificationChannel): Promise<void> {
    try {
      if (!this.router.checkRateLimit(channel, alert.severity)) {
        logger.debug(`Rate limit exceeded for channel: ${channel.name}`, { component: 'AlertNotifier' });
        return;
      }

      if (!channel.severityFilter.includes(alert.severity)) return;
      if (channel.categoryFilter && !channel.categoryFilter.includes(alert.category)) return;

      const deliveryRecord: DeliveryStatusRecord = {
        alertId: alert.id,
        channel: channel.name,
        status: 'pending',
        timestamp: new Date(),
        retryCount: 0
      };

      switch (channel.type) {
        case 'email':
          await this.sendEmailAlert(alert, channel, deliveryRecord);
          break;
        case 'slack':
          await this.sendSlackAlert(alert, channel, deliveryRecord);
          break;
        case 'teams':
          await this.sendTeamsAlert(alert, channel, deliveryRecord);
          break;
        case 'pagerduty':
          await this.sendPagerDutyAlert(alert, channel, deliveryRecord);
          break;
        case 'sms':
          await this.sendSMSAlert(alert, channel, deliveryRecord);
          break;
        case 'webhook':
          await this.sendWebhookAlert(alert, channel, deliveryRecord);
          break;
      }

      this.router.addDeliveryRecord(deliveryRecord);
      this.router.recordDelivery(channel, alert.severity);
    } catch (error) {
      logger.error(`Failed to send alert to ${channel.name}`, { component: 'AlertNotifier', error });
    }
  }

  private async sendEmailAlert(alert: Alert, channel: NotificationChannel, record: DeliveryStatusRecord): Promise<void> {
    if (!this.emailTransporter || !channel.config.email) {
      throw new Error('Email transport not configured');
    }

    const emailConfig = channel.config.email;
    try {
      await this.emailTransporter.sendMail({
        from: emailConfig.from,
        to: emailConfig.to.join(','),
        subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
        html: formatEmailAlert(alert)
      });
      record.status = 'delivered';
    } catch (error) {
      record.status = 'failed';
      record.error = (error as Error).message;
      this.scheduleRetry(alert, channel, record);
    }
  }

  private async sendSlackAlert(alert: Alert, channel: NotificationChannel, record: DeliveryStatusRecord): Promise<void> {
    if (!channel.config.slack) throw new Error('Slack config not found');

    try {
      const response = await makeHttpRequest(
        channel.config.slack.webhookUrl,
        'POST',
        JSON.stringify(formatSlackAlert(alert, channel.config.slack)),
        { 'Content-Type': 'application/json' }
      );
      record.status = response ? 'delivered' : 'failed';
    } catch (error) {
      record.status = 'failed';
      record.error = (error as Error).message;
      this.scheduleRetry(alert, channel, record);
    }
  }

  private async sendTeamsAlert(alert: Alert, channel: NotificationChannel, record: DeliveryStatusRecord): Promise<void> {
    if (!channel.config.teams) throw new Error('Teams config not found');

    try {
      const response = await makeHttpRequest(
        channel.config.teams.webhookUrl,
        'POST',
        JSON.stringify(formatTeamsAlert(alert)),
        { 'Content-Type': 'application/json' }
      );
      record.status = response ? 'delivered' : 'failed';
    } catch (error) {
      record.status = 'failed';
      record.error = (error as Error).message;
      this.scheduleRetry(alert, channel, record);
    }
  }

  private async sendPagerDutyAlert(alert: Alert, channel: NotificationChannel, record: DeliveryStatusRecord): Promise<void> {
    if (!channel.config.pagerduty) throw new Error('PagerDuty config not found');

    const config = channel.config.pagerduty;
    try {
      const response = await makeHttpRequest(
        config.integrationUrl || 'https://events.pagerduty.com/v2/enqueue',
        'POST',
        JSON.stringify(formatPagerDutyAlert(alert, config)),
        { 'Content-Type': 'application/json', 'Accept': 'application/vnd.pagerduty+json;version=2' }
      );
      record.status = response ? 'delivered' : 'failed';
    } catch (error) {
      record.status = 'failed';
      record.error = (error as Error).message;
      this.scheduleRetry(alert, channel, record);
    }
  }

  private async sendSMSAlert(alert: Alert, channel: NotificationChannel, record: DeliveryStatusRecord): Promise<void> {
    if (!channel.config.sms) throw new Error('SMS config not found');

    try {
      const response = await sendSMS(channel.config.sms, formatSMSAlert(alert));
      record.status = response ? 'delivered' : 'failed';
    } catch (error) {
      record.status = 'failed';
      record.error = (error as Error).message;
      this.scheduleRetry(alert, channel, record);
    }
  }

  private async sendWebhookAlert(alert: Alert, channel: NotificationChannel, record: DeliveryStatusRecord): Promise<void> {
    if (!channel.config.webhook) throw new Error('Webhook config not found');

    const config = channel.config.webhook;
    const payload = formatWebhookAlert(alert);
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': generateWebhookSignature(JSON.stringify(payload)),
        'X-Alert-Id': alert.id,
        'X-Alert-Timestamp': alert.timestamp.toISOString(),
        ...config.headers
      };

      const response = await makeHttpRequest(config.url, config.method, JSON.stringify(payload), headers, config.timeout);
      record.status = response ? 'delivered' : 'failed';
    } catch (error) {
      record.status = 'failed';
      record.error = (error as Error).message;
      this.scheduleRetry(alert, channel, record);
    }
  }

  private scheduleRetry(alert: Alert, channel: NotificationChannel, record: DeliveryStatusRecord): void {
    const maxRetries = 3;
    if (record.retryCount >= maxRetries) return;

    record.retryCount++;
    const backoffMs = Math.pow(2, record.retryCount) * 1000;
    record.nextRetryAt = new Date(Date.now() + backoffMs);

    setTimeout(async () => {
      await this.sendToChannel(alert, channel);
    }, backoffMs);
  }

  async testChannel(name: string): Promise<boolean> {
    const channel = this.router.getChannel(name);
    if (!channel) throw new Error(`Channel not found: ${name}`);

    try {
      switch (channel.type) {
        case 'email':
          return this.emailTransporter && channel.config.email
            ? await this.emailTransporter.verify().then(() => true).catch(() => false)
            : false;
        case 'slack':
          return channel.config.slack
            ? await makeHttpRequest(channel.config.slack.webhookUrl, 'POST', JSON.stringify({ text: 'Test' }), { 'Content-Type': 'application/json' })
            : false;
        case 'teams':
          return channel.config.teams
            ? await makeHttpRequest(channel.config.teams.webhookUrl, 'POST', JSON.stringify({ text: 'Test' }), { 'Content-Type': 'application/json' })
            : false;
        case 'pagerduty':
          return !!channel.config.pagerduty?.apiKey;
        case 'sms':
          return await testSMSChannel(channel);
        case 'webhook':
          return channel.config.webhook
            ? await makeHttpRequest(channel.config.webhook.url, 'POST', JSON.stringify({ test: true }), { 'Content-Type': 'application/json' }, channel.config.webhook.timeout)
            : false;
        default:
          return false;
      }
    } catch (error) {
      logger.error(`Channel test failed: ${name}`, { component: 'AlertNotifier', error });
      return false;
    }
  }
}

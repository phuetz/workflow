/**
 * Comprehensive Alerting System
 * Multi-channel alerting with escalation, deduplication, and alert fatigue prevention
 */

import { EventEmitter } from 'events';
import nodemailer from 'nodemailer';
import { getLogger } from './EnhancedLogger';

const logger = getLogger('alerting-system');

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'suppressed';
export type AlertChannel = 'email' | 'slack' | 'pagerduty' | 'webhook' | 'sms' | 'teams';

export interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  description?: string;
  source: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: Date;
  endsAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  fingerprint: string;
  count: number;
  lastOccurrence: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: any) => boolean;
  severity: AlertSeverity;
  description?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  channels: AlertChannel[];
  throttle?: number; // Minutes
  escalationDelay?: number; // Minutes
  escalationChannels?: AlertChannel[];
  autoResolve?: boolean;
  autoResolveAfter?: number; // Minutes
}

export interface AlertingConfig {
  enabled: boolean;
  emailConfig?: {
    host: string;
    port: number;
    secure: boolean;
    auth: { user: string; pass: string };
    from: string;
    to: string[];
  };
  slackConfig?: {
    webhookUrl: string;
    channel?: string;
    username?: string;
  };
  pagerDutyConfig?: {
    apiKey: string;
    routingKey: string;
  };
  teamsConfig?: {
    webhookUrl: string;
  };
  webhookConfig?: {
    url: string;
    headers?: Record<string, string>;
  };
  smsConfig?: {
    provider: string;
    apiKey: string;
    from: string;
    to: string[];
  };
  deduplicationWindow?: number; // Minutes
  escalationEnabled?: boolean;
  maxAlertsPerHour?: number;
}

/**
 * Alerting System
 */
export class AlertingSystem extends EventEmitter {
  private static instance: AlertingSystem;
  private config: AlertingConfig;
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private emailTransporter: any;
  private alertCounts: Map<string, number> = new Map();
  private lastAlertTimes: Map<string, Date> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor(config: AlertingConfig) {
    super();
    this.config = {
      deduplicationWindow: 5,
      escalationEnabled: true,
      maxAlertsPerHour: 100,
      ...config,
    };

    this.initializeChannels();
  }

  public static getInstance(config?: AlertingConfig): AlertingSystem {
    if (!AlertingSystem.instance && config) {
      AlertingSystem.instance = new AlertingSystem(config);
    }
    return AlertingSystem.instance;
  }

  /**
   * Initialize notification channels
   */
  private async initializeChannels(): Promise<void> {
    // Initialize email
    if (this.config.emailConfig) {
      this.emailTransporter = nodemailer.createTransport({
        host: this.config.emailConfig.host,
        port: this.config.emailConfig.port,
        secure: this.config.emailConfig.secure,
        auth: this.config.emailConfig.auth,
      });

      logger.info('Email alerting channel initialized');
    }

    logger.info('Alerting system initialized', {
      channels: this.getEnabledChannels(),
    });
  }

  /**
   * Get enabled channels
   */
  private getEnabledChannels(): AlertChannel[] {
    const channels: AlertChannel[] = [];
    if (this.config.emailConfig) channels.push('email');
    if (this.config.slackConfig) channels.push('slack');
    if (this.config.pagerDutyConfig) channels.push('pagerduty');
    if (this.config.teamsConfig) channels.push('teams');
    if (this.config.webhookConfig) channels.push('webhook');
    if (this.config.smsConfig) channels.push('sms');
    return channels;
  }

  /**
   * Register an alert rule
   */
  registerRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    logger.info('Alert rule registered', {
      ruleId: rule.id,
      name: rule.name,
      severity: rule.severity,
    });
  }

  /**
   * Unregister an alert rule
   */
  unregisterRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      logger.info('Alert rule unregistered', { ruleId });
    }
    return deleted;
  }

  /**
   * Create and send an alert
   */
  async alert(params: {
    name: string;
    severity: AlertSeverity;
    message: string;
    description?: string;
    source: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    channels?: AlertChannel[];
  }): Promise<Alert> {
    const fingerprint = this.generateFingerprint(params.name, params.source, params.labels);

    // Check for duplicate
    const existing = this.alerts.get(fingerprint);
    if (existing && existing.status === 'active') {
      const timeSinceLastOccurrence = Date.now() - existing.lastOccurrence.getTime();
      const deduplicationWindowMs = (this.config.deduplicationWindow || 5) * 60 * 1000;

      if (timeSinceLastOccurrence < deduplicationWindowMs) {
        // Update existing alert
        existing.count++;
        existing.lastOccurrence = new Date();
        logger.debug('Alert deduplicated', {
          fingerprint,
          count: existing.count,
        });
        return existing;
      }
    }

    // Create new alert
    const alert: Alert = {
      id: this.generateAlertId(),
      name: params.name,
      severity: params.severity,
      status: 'active',
      message: params.message,
      description: params.description,
      source: params.source,
      labels: params.labels || {},
      annotations: params.annotations || {},
      startsAt: new Date(),
      fingerprint,
      count: 1,
      lastOccurrence: new Date(),
    };

    this.alerts.set(fingerprint, alert);

    // Check rate limiting
    if (!this.checkRateLimit(alert.severity)) {
      logger.warn('Alert rate limit exceeded, suppressing alert', {
        alertId: alert.id,
        severity: alert.severity,
      });
      alert.status = 'suppressed';
      return alert;
    }

    // Send to channels
    const channels = params.channels || this.getDefaultChannels(alert.severity);
    await this.sendToChannels(alert, channels);

    // Set up escalation
    if (this.config.escalationEnabled) {
      this.scheduleEscalation(alert);
    }

    // Set up auto-resolve
    const rule = Array.from(this.rules.values()).find(r => r.name === alert.name);
    if (rule?.autoResolve && rule.autoResolveAfter) {
      setTimeout(() => {
        this.resolveAlert(alert.id, 'Auto-resolved');
      }, rule.autoResolveAfter * 60 * 1000);
    }

    this.emit('alert-created', alert);
    logger.info('Alert created', {
      alertId: alert.id,
      name: alert.name,
      severity: alert.severity,
    });

    return alert;
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(severity: AlertSeverity): boolean {
    if (!this.config.maxAlertsPerHour) {
      return true;
    }

    const key = `rate_${severity}`;
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    // Clean old entries
    for (const [k, time] of this.lastAlertTimes.entries()) {
      if (time.getTime() < oneHourAgo) {
        this.lastAlertTimes.delete(k);
        this.alertCounts.delete(k);
      }
    }

    const count = this.alertCounts.get(key) || 0;
    if (count >= this.config.maxAlertsPerHour) {
      return false;
    }

    this.alertCounts.set(key, count + 1);
    this.lastAlertTimes.set(key, new Date());
    return true;
  }

  /**
   * Get default channels for severity
   */
  private getDefaultChannels(severity: AlertSeverity): AlertChannel[] {
    switch (severity) {
      case 'critical':
        return ['email', 'slack', 'pagerduty', 'sms'];
      case 'high':
        return ['email', 'slack', 'pagerduty'];
      case 'medium':
        return ['email', 'slack'];
      case 'low':
        return ['slack'];
      case 'info':
        return ['slack'];
      default:
        return ['email'];
    }
  }

  /**
   * Send alert to channels
   */
  private async sendToChannels(alert: Alert, channels: AlertChannel[]): Promise<void> {
    const availableChannels = this.getEnabledChannels();
    const validChannels = channels.filter(c => availableChannels.includes(c));

    await Promise.allSettled(
      validChannels.map(channel => this.sendToChannel(alert, channel))
    );
  }

  /**
   * Send alert to specific channel
   */
  private async sendToChannel(alert: Alert, channel: AlertChannel): Promise<void> {
    try {
      switch (channel) {
        case 'email':
          await this.sendEmail(alert);
          break;
        case 'slack':
          await this.sendSlack(alert);
          break;
        case 'pagerduty':
          await this.sendPagerDuty(alert);
          break;
        case 'teams':
          await this.sendTeams(alert);
          break;
        case 'webhook':
          await this.sendWebhook(alert);
          break;
        case 'sms':
          await this.sendSMS(alert);
          break;
      }

      logger.info('Alert sent', {
        alertId: alert.id,
        channel,
      });
    } catch (error) {
      logger.error(`Failed to send alert via ${channel}`, error, {
        alertId: alert.id,
      });
    }
  }

  /**
   * Send email alert
   */
  private async sendEmail(alert: Alert): Promise<void> {
    if (!this.emailTransporter || !this.config.emailConfig) {
      return;
    }

    const subject = `[${alert.severity.toUpperCase()}] ${alert.name}`;
    const html = this.formatEmailHtml(alert);

    await this.emailTransporter.sendMail({
      from: this.config.emailConfig.from,
      to: this.config.emailConfig.to.join(', '),
      subject,
      html,
    });
  }

  /**
   * Format email HTML
   */
  private formatEmailHtml(alert: Alert): string {
    const severityColors: Record<AlertSeverity, string> = {
      critical: '#dc3545',
      high: '#fd7e14',
      medium: '#ffc107',
      low: '#0dcaf0',
      info: '#0d6efd',
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .alert-box { border-left: 4px solid ${severityColors[alert.severity]}; padding: 15px; background: #f8f9fa; }
          .severity { color: ${severityColors[alert.severity]}; font-weight: bold; text-transform: uppercase; }
          .metadata { background: #fff; padding: 10px; margin: 10px 0; border-radius: 4px; }
          .label { display: inline-block; background: #e9ecef; padding: 2px 8px; margin: 2px; border-radius: 3px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="alert-box">
          <h2><span class="severity">${alert.severity}</span> - ${alert.name}</h2>
          <p><strong>Message:</strong> ${alert.message}</p>
          ${alert.description ? `<p><strong>Description:</strong> ${alert.description}</p>` : ''}

          <div class="metadata">
            <p><strong>Alert ID:</strong> ${alert.id}</p>
            <p><strong>Source:</strong> ${alert.source}</p>
            <p><strong>Started At:</strong> ${alert.startsAt.toISOString()}</p>
            <p><strong>Count:</strong> ${alert.count}</p>
          </div>

          ${Object.keys(alert.labels).length > 0 ? `
            <div class="metadata">
              <p><strong>Labels:</strong></p>
              ${Object.entries(alert.labels).map(([k, v]) =>
                `<span class="label">${k}: ${v}</span>`
              ).join(' ')}
            </div>
          ` : ''}

          ${Object.keys(alert.annotations).length > 0 ? `
            <div class="metadata">
              <p><strong>Annotations:</strong></p>
              ${Object.entries(alert.annotations).map(([k, v]) =>
                `<p><strong>${k}:</strong> ${v}</p>`
              ).join('')}
            </div>
          ` : ''}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send Slack alert
   */
  private async sendSlack(alert: Alert): Promise<void> {
    if (!this.config.slackConfig) {
      return;
    }

    const severityEmojis: Record<AlertSeverity, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵',
      info: 'ℹ️',
    };

    const severityColors: Record<AlertSeverity, string> = {
      critical: 'danger',
      high: 'warning',
      medium: 'warning',
      low: 'good',
      info: '#0d6efd',
    };

    const payload = {
      channel: this.config.slackConfig.channel,
      username: this.config.slackConfig.username || 'Alert Bot',
      attachments: [
        {
          color: severityColors[alert.severity],
          title: `${severityEmojis[alert.severity]} ${alert.name}`,
          text: alert.message,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Source',
              value: alert.source,
              short: true,
            },
            {
              title: 'Started At',
              value: alert.startsAt.toISOString(),
              short: true,
            },
            {
              title: 'Count',
              value: alert.count.toString(),
              short: true,
            },
            ...Object.entries(alert.labels).map(([key, value]) => ({
              title: key,
              value,
              short: true,
            })),
          ],
          footer: `Alert ID: ${alert.id}`,
          ts: Math.floor(alert.startsAt.getTime() / 1000),
        },
      ],
    };

    await fetch(this.config.slackConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Send PagerDuty alert
   */
  private async sendPagerDuty(alert: Alert): Promise<void> {
    if (!this.config.pagerDutyConfig) {
      return;
    }

    const payload = {
      routing_key: this.config.pagerDutyConfig.routingKey,
      event_action: 'trigger',
      dedup_key: alert.fingerprint,
      payload: {
        summary: alert.message,
        severity: alert.severity,
        source: alert.source,
        timestamp: alert.startsAt.toISOString(),
        custom_details: {
          name: alert.name,
          description: alert.description,
          labels: alert.labels,
          annotations: alert.annotations,
        },
      },
    };

    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token token=${this.config.pagerDutyConfig.apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Send Microsoft Teams alert
   */
  private async sendTeams(alert: Alert): Promise<void> {
    if (!this.config.teamsConfig) {
      return;
    }

    const severityColors: Record<AlertSeverity, string> = {
      critical: 'FF0000',
      high: 'FF8800',
      medium: 'FFCC00',
      low: '0099FF',
      info: '0066FF',
    };

    const payload = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: alert.name,
      themeColor: severityColors[alert.severity],
      sections: [
        {
          activityTitle: alert.name,
          activitySubtitle: alert.message,
          activityImage: 'https://adaptivecards.io/content/cats/1.png',
          facts: [
            { name: 'Severity', value: alert.severity.toUpperCase() },
            { name: 'Source', value: alert.source },
            { name: 'Started At', value: alert.startsAt.toISOString() },
            { name: 'Count', value: alert.count.toString() },
            ...Object.entries(alert.labels).map(([key, value]) => ({
              name: key,
              value,
            })),
          ],
        },
      ],
    };

    await fetch(this.config.teamsConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Send webhook alert
   */
  private async sendWebhook(alert: Alert): Promise<void> {
    if (!this.config.webhookConfig) {
      return;
    }

    await fetch(this.config.webhookConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.webhookConfig.headers,
      },
      body: JSON.stringify(alert),
    });
  }

  /**
   * Send SMS alert
   */
  private async sendSMS(alert: Alert): Promise<void> {
    if (!this.config.smsConfig) {
      return;
    }

    // Mock SMS implementation
    logger.info('SMS alert would be sent', {
      alertId: alert.id,
      to: this.config.smsConfig.to,
      message: `[${alert.severity.toUpperCase()}] ${alert.name}: ${alert.message}`,
    });
  }

  /**
   * Schedule escalation
   */
  private scheduleEscalation(alert: Alert): void {
    const rule = Array.from(this.rules.values()).find(r => r.name === alert.name);
    if (!rule?.escalationDelay || !rule.escalationChannels) {
      return;
    }

    const timer = setTimeout(() => {
      if (alert.status === 'active') {
        logger.info('Escalating alert', { alertId: alert.id });
        this.sendToChannels(alert, rule.escalationChannels!);
        this.emit('alert-escalated', alert);
      }
    }, rule.escalationDelay * 60 * 1000);

    this.escalationTimers.set(alert.id, timer);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = Array.from(this.alerts.values()).find(a => a.id === alertId);
    if (!alert || alert.status !== 'active') {
      return false;
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    // Cancel escalation
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    this.emit('alert-acknowledged', alert);
    logger.info('Alert acknowledged', { alertId, acknowledgedBy });

    return true;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string, resolvedBy?: string): boolean {
    const alert = Array.from(this.alerts.values()).find(a => a.id === alertId);
    if (!alert) {
      return false;
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.endsAt = new Date();

    // Cancel escalation
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    this.emit('alert-resolved', alert);
    logger.info('Alert resolved', { alertId, resolvedBy });

    return true;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(a => a.status === 'active');
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Generate fingerprint
   */
  private generateFingerprint(name: string, source: string, labels?: Record<string, string>): string {
    const parts = [name, source];
    if (labels) {
      parts.push(...Object.entries(labels).sort().map(([k, v]) => `${k}:${v}`));
    }
    return parts.join('|');
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Clear resolved alerts
   */
  clearResolvedAlerts(olderThan?: Date): number {
    const threshold = olderThan || new Date(Date.now() - 86400000); // 24 hours
    let cleared = 0;

    for (const [fingerprint, alert] of this.alerts.entries()) {
      if (alert.status === 'resolved' && alert.resolvedAt && alert.resolvedAt < threshold) {
        this.alerts.delete(fingerprint);
        cleared++;
      }
    }

    logger.info('Cleared resolved alerts', { count: cleared });
    return cleared;
  }
}

export function getAlertingSystem(config?: AlertingConfig): AlertingSystem {
  return AlertingSystem.getInstance(config);
}

export default AlertingSystem;

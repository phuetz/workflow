/**
 * ExternalIntegrations.ts
 * External error monitoring service integrations (Sentry, DataDog, Slack, PagerDuty)
 */

import type { ErrorEvent } from './ErrorMonitoringSystem';
import type { ErrorPattern } from './ErrorPatternAnalyzer';
import { logger } from '../services/SimpleLogger';

export interface IntegrationConfig {
  enabled: boolean;
  apiKey?: string;
  endpoint?: string;
  metadata?: Record<string, unknown>;
}

export interface SentryConfig extends IntegrationConfig {
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
}

export interface DataDogConfig extends IntegrationConfig {
  apiKey: string;
  site?: string;
  service?: string;
  env?: string;
}

export interface SlackConfig extends IntegrationConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
  mentionUsers?: string[];
}

export interface PagerDutyConfig extends IntegrationConfig {
  integrationKey: string;
  routingKey?: string;
}

export interface DiscordConfig extends IntegrationConfig {
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
}

export interface NewRelicConfig extends IntegrationConfig {
  licenseKey: string;
  accountId: string;
  applicationId?: string;
}

export class ExternalIntegrations {
  private sentryConfig?: SentryConfig;
  private dataDogConfig?: DataDogConfig;
  private slackConfig?: SlackConfig;
  private pagerDutyConfig?: PagerDutyConfig;
  private discordConfig?: DiscordConfig;
  private newRelicConfig?: NewRelicConfig;
  private sentryClient?: unknown; // Would be actual Sentry client

  constructor() {
    this.loadFromEnv();
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnv(): void {
    // Sentry
    if (process.env.SENTRY_DSN) {
      this.sentryConfig = {
        enabled: true,
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.APP_VERSION,
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      };
    }

    // DataDog
    if (process.env.DATADOG_API_KEY) {
      this.dataDogConfig = {
        enabled: true,
        apiKey: process.env.DATADOG_API_KEY,
        site: process.env.DATADOG_SITE || 'datadoghq.com',
        service: process.env.DATADOG_SERVICE || 'workflow-automation',
        env: process.env.NODE_ENV || 'development',
      };
    }

    // Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      this.slackConfig = {
        enabled: true,
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_CHANNEL,
        username: process.env.SLACK_USERNAME || 'Error Monitor',
        iconEmoji: process.env.SLACK_ICON_EMOJI || ':rotating_light:',
        mentionUsers: process.env.SLACK_MENTION_USERS?.split(','),
      };
    }

    // PagerDuty
    if (process.env.PAGERDUTY_INTEGRATION_KEY) {
      this.pagerDutyConfig = {
        enabled: true,
        integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
        routingKey: process.env.PAGERDUTY_ROUTING_KEY,
      };
    }

    // Discord
    if (process.env.DISCORD_WEBHOOK_URL) {
      this.discordConfig = {
        enabled: true,
        webhookUrl: process.env.DISCORD_WEBHOOK_URL,
        username: process.env.DISCORD_USERNAME || 'Error Monitor',
        avatarUrl: process.env.DISCORD_AVATAR_URL,
      };
    }

    // New Relic
    if (process.env.NEW_RELIC_LICENSE_KEY) {
      this.newRelicConfig = {
        enabled: true,
        licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
        accountId: process.env.NEW_RELIC_ACCOUNT_ID || '',
        applicationId: process.env.NEW_RELIC_APP_ID,
      };
    }
  }

  /**
   * Configure Sentry
   */
  public configureSentry(config: SentryConfig): void {
    this.sentryConfig = config;

    if (config.enabled && config.dsn) {
      // Initialize Sentry client
      // This would use actual @sentry/node or @sentry/browser
      try {
        // const Sentry = require('@sentry/node');
        // Sentry.init({
        //   dsn: config.dsn,
        //   environment: config.environment,
        //   release: config.release,
        //   tracesSampleRate: config.tracesSampleRate,
        // });
        // this.sentryClient = Sentry;
      } catch (error) {
        logger.error('Failed to initialize Sentry', error);
      }
    }
  }

  /**
   * Configure DataDog
   */
  public configureDataDog(config: DataDogConfig): void {
    this.dataDogConfig = config;
  }

  /**
   * Configure Slack
   */
  public configureSlack(config: SlackConfig): void {
    this.slackConfig = config;
  }

  /**
   * Configure PagerDuty
   */
  public configurePagerDuty(config: PagerDutyConfig): void {
    this.pagerDutyConfig = config;
  }

  /**
   * Configure Discord
   */
  public configureDiscord(config: DiscordConfig): void {
    this.discordConfig = config;
  }

  /**
   * Configure New Relic
   */
  public configureNewRelic(config: NewRelicConfig): void {
    this.newRelicConfig = config;
  }

  /**
   * Send errors to all configured integrations
   */
  public async sendErrors(errors: ErrorEvent[], patterns?: ErrorPattern[]): Promise<void> {
    const promises: Promise<void>[] = [];

    // Send to Sentry
    if (this.sentryConfig?.enabled) {
      promises.push(this.sendToSentry(errors));
    }

    // Send to DataDog
    if (this.dataDogConfig?.enabled) {
      promises.push(this.sendToDataDog(errors));
    }

    // Send to New Relic
    if (this.newRelicConfig?.enabled) {
      promises.push(this.sendToNewRelic(errors));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Send alert for critical errors
   */
  public async sendAlert(error: ErrorEvent, recentErrors: ErrorEvent[]): Promise<void> {
    const promises: Promise<void>[] = [];

    // Send to Slack
    if (this.slackConfig?.enabled) {
      promises.push(this.sendSlackAlert(error, recentErrors));
    }

    // Send to Discord
    if (this.discordConfig?.enabled) {
      promises.push(this.sendDiscordAlert(error, recentErrors));
    }

    // Send to PagerDuty
    if (this.pagerDutyConfig?.enabled) {
      promises.push(this.sendPagerDutyAlert(error, recentErrors));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Sentry integration
   */
  private async sendToSentry(errors: ErrorEvent[]): Promise<void> {
    if (!this.sentryConfig?.dsn) return;

    try {
      errors.forEach(error => {
        // Send to Sentry
        // if (this.sentryClient) {
        //   this.sentryClient.captureException(new Error(error.message), {
        //     level: this.mapSeverityToSentryLevel(error.severity),
        //     tags: {
        //       type: error.type,
        //       workflowId: error.context.workflowId,
        //       nodeId: error.context.nodeId,
        //     },
        //     contexts: {
        //       error: error.context,
        //     },
        //     fingerprint: [error.fingerprint],
        //   });
        // }
      });
    } catch (error) {
      logger.error('Failed to send errors to Sentry', error);
    }
  }

  /**
   * DataDog integration
   */
  private async sendToDataDog(errors: ErrorEvent[]): Promise<void> {
    if (!this.dataDogConfig?.apiKey) return;

    try {
      const endpoint = `https://api.${this.dataDogConfig.site}/api/v1/logs`;

      const logs = errors.map(error => ({
        ddsource: 'workflow-automation',
        ddtags: `env:${this.dataDogConfig!.env},service:${this.dataDogConfig!.service},type:${error.type},severity:${error.severity}`,
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
        message: error.message,
        service: this.dataDogConfig!.service,
        status: this.mapSeverityToDataDogStatus(error.severity),
        timestamp: error.timestamp.getTime(),
        error: {
          kind: error.type,
          message: error.message,
          stack: error.stack,
        },
        context: error.context,
        metadata: error.metadata,
      }));

      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': this.dataDogConfig.apiKey,
        },
        body: JSON.stringify(logs),
      });
    } catch (error) {
      logger.error('Failed to send errors to DataDog', error);
    }
  }

  /**
   * New Relic integration
   */
  private async sendToNewRelic(errors: ErrorEvent[]): Promise<void> {
    if (!this.newRelicConfig?.licenseKey) return;

    try {
      const endpoint = 'https://log-api.newrelic.com/log/v1';

      const logs = errors.map(error => ({
        timestamp: error.timestamp.getTime(),
        message: error.message,
        logtype: 'error',
        service: 'workflow-automation',
        error_type: error.type,
        severity: error.severity,
        stack_trace: error.stack,
        context: error.context,
        metadata: error.metadata,
      }));

      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-License-Key': this.newRelicConfig.licenseKey,
        },
        body: JSON.stringify(logs),
      });
    } catch (error) {
      logger.error('Failed to send errors to New Relic', error);
    }
  }

  /**
   * Slack alert
   */
  private async sendSlackAlert(error: ErrorEvent, recentErrors: ErrorEvent[]): Promise<void> {
    if (!this.slackConfig?.webhookUrl) return;

    try {
      const mentions = this.slackConfig.mentionUsers
        ? this.slackConfig.mentionUsers.map(u => `<@${u}>`).join(' ')
        : '';

      const color = this.getAlertColor(error.severity);
      const emoji = this.getErrorEmoji(error.severity);

      const message = {
        username: this.slackConfig.username,
        icon_emoji: this.slackConfig.iconEmoji,
        channel: this.slackConfig.channel,
        text: `${mentions} ${emoji} Critical Error Alert`,
        attachments: [
          {
            color,
            title: `${error.severity.toUpperCase()}: ${error.message}`,
            fields: [
              {
                title: 'Type',
                value: error.type,
                short: true,
              },
              {
                title: 'Severity',
                value: error.severity,
                short: true,
              },
              {
                title: 'Workflow',
                value: error.context.workflowId || 'N/A',
                short: true,
              },
              {
                title: 'Recent Errors',
                value: `${recentErrors.length} errors in last 5 minutes`,
                short: true,
              },
              {
                title: 'Timestamp',
                value: error.timestamp.toISOString(),
                short: false,
              },
            ],
            footer: 'Error Monitoring System',
            ts: Math.floor(error.timestamp.getTime() / 1000),
          },
        ],
      };

      await fetch(this.slackConfig.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
    } catch (error) {
      logger.error('Failed to send Slack alert', error);
    }
  }

  /**
   * Discord alert
   */
  private async sendDiscordAlert(error: ErrorEvent, recentErrors: ErrorEvent[]): Promise<void> {
    if (!this.discordConfig?.webhookUrl) return;

    try {
      const color = this.getAlertColorHex(error.severity);
      const emoji = this.getErrorEmoji(error.severity);

      const message = {
        username: this.discordConfig.username,
        avatar_url: this.discordConfig.avatarUrl,
        embeds: [
          {
            title: `${emoji} Critical Error Alert`,
            description: error.message,
            color: parseInt(color.substring(1), 16),
            fields: [
              {
                name: 'Type',
                value: error.type,
                inline: true,
              },
              {
                name: 'Severity',
                value: error.severity,
                inline: true,
              },
              {
                name: 'Recent Errors',
                value: `${recentErrors.length} in last 5 minutes`,
                inline: true,
              },
            ],
            timestamp: error.timestamp.toISOString(),
            footer: {
              text: 'Error Monitoring System',
            },
          },
        ],
      };

      await fetch(this.discordConfig.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
    } catch (error) {
      logger.error('Failed to send Discord alert', error);
    }
  }

  /**
   * PagerDuty alert
   */
  private async sendPagerDutyAlert(error: ErrorEvent, recentErrors: ErrorEvent[]): Promise<void> {
    if (!this.pagerDutyConfig?.integrationKey) return;

    try {
      const endpoint = 'https://events.pagerduty.com/v2/enqueue';

      const payload = {
        routing_key: this.pagerDutyConfig.integrationKey,
        event_action: 'trigger',
        dedup_key: error.fingerprint,
        payload: {
          summary: `${error.severity.toUpperCase()}: ${error.message}`,
          severity: this.mapSeverityToPagerDuty(error.severity),
          source: 'workflow-automation',
          timestamp: error.timestamp.toISOString(),
          component: error.context.nodeId || 'unknown',
          group: error.type,
          class: error.severity,
          custom_details: {
            workflow_id: error.context.workflowId,
            user_id: error.context.userId,
            recent_errors: recentErrors.length,
            stack_trace: error.stack,
            metadata: error.metadata,
          },
        },
      };

      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      logger.error('Failed to send PagerDuty alert', error);
    }
  }

  /**
   * Utility methods
   */
  private mapSeverityToSentryLevel(severity: string): string {
    const map: Record<string, string> = {
      low: 'info',
      medium: 'warning',
      high: 'error',
      critical: 'fatal',
    };
    return map[severity] || 'error';
  }

  private mapSeverityToDataDogStatus(severity: string): string {
    const map: Record<string, string> = {
      low: 'info',
      medium: 'warn',
      high: 'error',
      critical: 'critical',
    };
    return map[severity] || 'error';
  }

  private mapSeverityToPagerDuty(severity: string): string {
    const map: Record<string, string> = {
      low: 'info',
      medium: 'warning',
      high: 'error',
      critical: 'critical',
    };
    return map[severity] || 'error';
  }

  private getAlertColor(severity: string): string {
    const map: Record<string, string> = {
      low: '#36a64f',
      medium: '#ff9900',
      high: '#ff0000',
      critical: '#8b0000',
    };
    return map[severity] || '#ff0000';
  }

  private getAlertColorHex(severity: string): string {
    return this.getAlertColor(severity);
  }

  private getErrorEmoji(severity: string): string {
    const map: Record<string, string> = {
      low: '⚠️',
      medium: '🔶',
      high: '🔴',
      critical: '🚨',
    };
    return map[severity] || '❌';
  }

  /**
   * Test integrations
   */
  public async testIntegrations(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    // Test Slack
    if (this.slackConfig?.enabled) {
      try {
        await fetch(this.slackConfig.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Test message from Error Monitoring System' }),
        });
        results.slack = true;
      } catch {
        results.slack = false;
      }
    }

    // Test Discord
    if (this.discordConfig?.enabled) {
      try {
        await fetch(this.discordConfig.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Test message from Error Monitoring System' }),
        });
        results.discord = true;
      } catch {
        results.discord = false;
      }
    }

    return results;
  }
}

export default ExternalIntegrations;

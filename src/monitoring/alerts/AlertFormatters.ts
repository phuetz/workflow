/**
 * AlertFormatters - Alert Message Formatting for Various Channels
 * Handles formatting alerts for Email, Slack, Teams, PagerDuty, SMS, and Webhooks
 */

import {
  Alert,
  SlackConfig,
  PagerDutyConfig,
  getSeverityColor,
  mapSeverityToPagerDuty
} from './types';

/**
 * Format alert as HTML email
 */
export function formatEmailAlert(alert: Alert): string {
  return `
    <html>
      <head><style>
        body { font-family: Arial, sans-serif; }
        .header { background-color: #${getSeverityColor(alert.severity)}; color: white; padding: 20px; }
        .content { padding: 20px; }
        .actions { margin-top: 20px; }
        .metric { margin: 10px 0; }
      </style></head>
      <body>
        <div class="header">
          <h1>${alert.title}</h1>
          <p>Severity: ${alert.severity.toUpperCase()}</p>
        </div>
        <div class="content">
          <p>${alert.description}</p>
          ${alert.metrics ? `<h3>Metrics:</h3><pre>${JSON.stringify(alert.metrics, null, 2)}</pre>` : ''}
          <h3>Recommended Actions:</h3>
          <ul>${alert.recommended_actions.map(a => `<li>${a}</li>`).join('')}</ul>
        </div>
      </body>
    </html>
  `;
}

/**
 * Format alert for Slack
 */
export function formatSlackAlert(alert: Alert, config: SlackConfig): any {
  const colorMap = { low: '#36a64f', medium: '#ff9900', high: '#ff0000', critical: '#8B0000' };

  return {
    channel: config.channel,
    username: config.username || 'Alert Manager',
    icon_emoji: config.iconEmoji || ':warning:',
    attachments: [{
      color: colorMap[alert.severity],
      title: alert.title,
      text: alert.description,
      fields: [
        { title: 'Severity', value: alert.severity, short: true },
        { title: 'Category', value: alert.category, short: true },
        { title: 'Source', value: alert.source, short: true },
        { title: 'Time', value: alert.timestamp.toISOString(), short: true }
      ],
      ...(alert.metrics && { footer: `Metrics: ${JSON.stringify(alert.metrics)}` })
    }]
  };
}

/**
 * Format alert for Microsoft Teams
 */
export function formatTeamsAlert(alert: Alert): any {
  const colorMap = { low: '28a745', medium: 'ffc107', high: 'dc3545', critical: '721c24' };

  return {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: alert.title,
    themeColor: colorMap[alert.severity],
    sections: [{
      activityTitle: alert.title,
      activitySubtitle: alert.description,
      facts: [
        { name: 'Severity', value: alert.severity },
        { name: 'Category', value: alert.category },
        { name: 'Source', value: alert.source },
        { name: 'Timestamp', value: alert.timestamp.toISOString() }
      ]
    }]
  };
}

/**
 * Format alert for PagerDuty
 */
export function formatPagerDutyAlert(alert: Alert, config: PagerDutyConfig): any {
  return {
    routing_key: config.routingKey,
    event_action: 'trigger',
    dedup_key: alert.id,
    payload: {
      summary: alert.title,
      severity: mapSeverityToPagerDuty(alert.severity),
      source: alert.source,
      custom_details: {
        description: alert.description,
        category: alert.category,
        recommended_actions: alert.recommended_actions,
        metrics: alert.metrics
      }
    }
  };
}

/**
 * Format alert for SMS
 */
export function formatSMSAlert(alert: Alert): string {
  return `[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.description.substring(0, 100)}`;
}

/**
 * Format alert for generic webhook
 */
export function formatWebhookAlert(alert: Alert): any {
  return {
    alert_id: alert.id,
    timestamp: alert.timestamp.toISOString(),
    severity: alert.severity,
    title: alert.title,
    description: alert.description,
    category: alert.category,
    source: alert.source,
    recommended_actions: alert.recommended_actions,
    metrics: alert.metrics,
    context: alert.context
  };
}

/**
 * Alert Manager Configuration Examples
 * Complete setup guide with all channel configurations
 */

import { alertManager, AlertManager, NotificationChannel, EscalationPolicy, RoutingRule } from './AlertManager';

/**
 * SECTION 1: Email Channel Configuration
 * =====================================
 */
export function configureEmailChannel() {
  const emailChannel: NotificationChannel = {
    type: 'email',
    name: 'email-alerts',
    enabled: true,
    config: {
      email: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || 'alerts@company.com',
          pass: process.env.SMTP_PASSWORD || 'your-app-password'
        },
        from: process.env.ALERTS_EMAIL_FROM || 'alerts@company.com',
        to: (process.env.ALERT_RECIPIENTS_EMAIL || 'ops@company.com').split(',')
      }
    },
    severityFilter: ['medium', 'high', 'critical'],
    categoryFilter: ['security', 'compliance', 'system'],
    rateLimit: {
      maxPerHour: 100,
      maxPerDay: 1000
    }
  };

  alertManager.addChannel(emailChannel);
  console.log('Email channel configured');
}

/**
 * SECTION 2: Slack Channel Configuration
 * =======================================
 */
export function configureSlackChannel() {
  const slackChannel: NotificationChannel = {
    type: 'slack',
    name: 'slack-alerts',
    enabled: true,
    config: {
      slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/...',
        channel: process.env.SLACK_CHANNEL || '#alerts',
        username: 'Alert Manager',
        iconEmoji: ':warning:'
      }
    },
    severityFilter: ['high', 'critical'],
    categoryFilter: ['security', 'system'],
    rateLimit: {
      maxPerHour: 200,
      maxPerDay: 2000
    }
  };

  alertManager.addChannel(slackChannel);
  console.log('Slack channel configured');
}

/**
 * SECTION 3: Microsoft Teams Channel Configuration
 * ==================================================
 */
export function configureTeamsChannel() {
  const teamsChannel: NotificationChannel = {
    type: 'teams',
    name: 'teams-alerts',
    enabled: true,
    config: {
      teams: {
        webhookUrl: process.env.TEAMS_WEBHOOK_URL || 'https://outlook.webhook.office.com/...'
      }
    },
    severityFilter: ['high', 'critical'],
    categoryFilter: ['security', 'compliance'],
    rateLimit: {
      maxPerHour: 150,
      maxPerDay: 1500
    }
  };

  alertManager.addChannel(teamsChannel);
  console.log('Teams channel configured');
}

/**
 * SECTION 4: PagerDuty Channel Configuration
 * ===========================================
 */
export function configurePagerDutyChannel() {
  const pagerDutyChannel: NotificationChannel = {
    type: 'pagerduty',
    name: 'pagerduty-oncall',
    enabled: true,
    config: {
      pagerduty: {
        apiKey: process.env.PAGERDUTY_API_KEY || 'u+...',
        routingKey: process.env.PAGERDUTY_ROUTING_KEY || 'R...',
        integrationUrl: 'https://events.pagerduty.com/v2/enqueue'
      }
    },
    severityFilter: ['critical'],
    rateLimit: {
      maxPerHour: 50,
      maxPerDay: 500
    }
  };

  alertManager.addChannel(pagerDutyChannel);
  console.log('PagerDuty channel configured');
}

/**
 * SECTION 5: SMS (Twilio) Channel Configuration
 * ==============================================
 */
export function configureSMSChannel() {
  const smsChannel: NotificationChannel = {
    type: 'sms',
    name: 'sms-oncall',
    enabled: true,
    config: {
      sms: {
        provider: 'twilio',
        apiKey: process.env.TWILIO_AUTH_TOKEN || '',
        apiSecret: process.env.TWILIO_ACCOUNT_SID || '',
        accountSid: process.env.TWILIO_ACCOUNT_SID || 'AC...',
        from: process.env.TWILIO_PHONE_FROM || '+1234567890',
        to: (process.env.SMS_RECIPIENTS || '+9876543210').split(',')
      }
    },
    severityFilter: ['critical'],
    rateLimit: {
      maxPerHour: 20,
      maxPerDay: 200
    }
  };

  alertManager.addChannel(smsChannel);
  console.log('SMS channel configured');
}

/**
 * SECTION 6: Custom Webhook Channel Configuration
 * ================================================
 */
export function configureWebhookChannel() {
  const webhookChannel: NotificationChannel = {
    type: 'webhook',
    name: 'custom-webhook',
    enabled: true,
    config: {
      webhook: {
        url: process.env.WEBHOOK_URL || 'https://yourapi.com/alerts',
        method: 'POST',
        timeout: 5000,
        verifySsl: true,
        headers: {
          'Authorization': `Bearer ${process.env.WEBHOOK_TOKEN || ''}`,
          'Content-Type': 'application/json',
          'X-Alert-Source': 'workflow-automation'
        }
      }
    },
    severityFilter: ['low', 'medium', 'high', 'critical'],
    rateLimit: {
      maxPerHour: 500,
      maxPerDay: 5000
    }
  };

  alertManager.addChannel(webhookChannel);
  console.log('Webhook channel configured');
}

/**
 * SECTION 7: Default Escalation Policy
 * ====================================
 */
export function setupDefaultEscalationPolicy() {
  const policy: EscalationPolicy = {
    id: 'standard-escalation',
    name: 'Standard Escalation Policy',
    enabled: true,
    rules: [
      // Level 0: Immediate notification to team
      {
        level: 0,
        delay: 0,
        channels: ['email', 'slack'],
        recipients: ['ops-team@company.com', '#operations'],
        condition: undefined
      },
      // Level 1: After 15 minutes, notify team lead
      {
        level: 1,
        delay: 15,
        channels: ['email', 'slack'],
        recipients: ['ops-lead@company.com', '#operations'],
        condition: (alert) => alert.severity !== 'low'
      },
      // Level 2: After 30 minutes, notify on-call
      {
        level: 2,
        delay: 30,
        channels: ['pagerduty', 'sms'],
        recipients: ['oncall@company.com'],
        condition: (alert) => ['high', 'critical'].includes(alert.severity)
      },
      // Level 3: After 60 minutes, notify CISO (critical only)
      {
        level: 3,
        delay: 60,
        channels: ['email', 'sms'],
        recipients: ['ciso@company.com'],
        condition: (alert) => alert.severity === 'critical' && alert.category === 'security'
      }
    ]
  };

  alertManager.addEscalationPolicy(policy);
  console.log('Default escalation policy configured');
}

/**
 * SECTION 8: Custom Escalation Policies
 * =====================================
 */
export function setupSecurityEscalationPolicy() {
  const policy: EscalationPolicy = {
    id: 'security-escalation',
    name: 'Security Incident Escalation',
    enabled: true,
    rules: [
      {
        level: 0,
        delay: 0,
        channels: ['email', 'slack'],
        recipients: ['security@company.com', '#security-alerts'],
        condition: (alert) => alert.category === 'security'
      },
      {
        level: 1,
        delay: 5,
        channels: ['pagerduty'],
        recipients: ['security-lead@company.com'],
        condition: (alert) =>
          alert.category === 'security' && alert.severity === 'critical'
      },
      {
        level: 2,
        delay: 10,
        channels: ['sms'],
        recipients: ['ciso@company.com'],
        condition: (alert) =>
          alert.category === 'security' &&
          alert.severity === 'critical' &&
          alert.metrics?.breach_size > 100
      }
    ]
  };

  alertManager.addEscalationPolicy(policy);
  console.log('Security escalation policy configured');
}

export function setupComplianceEscalationPolicy() {
  const policy: EscalationPolicy = {
    id: 'compliance-escalation',
    name: 'Compliance Violation Escalation',
    enabled: true,
    rules: [
      {
        level: 0,
        delay: 0,
        channels: ['email', 'teams'],
        recipients: ['compliance@company.com'],
        condition: (alert) => alert.category === 'compliance'
      },
      {
        level: 1,
        delay: 30,
        channels: ['email'],
        recipients: ['legal@company.com', 'cfo@company.com'],
        condition: (alert) =>
          alert.category === 'compliance' && alert.severity === 'high'
      }
    ]
  };

  alertManager.addEscalationPolicy(policy);
  console.log('Compliance escalation policy configured');
}

/**
 * SECTION 9: Routing Rules
 * ========================
 */
export function setupRoutingRules() {
  // Rule 1: Security alerts to security team via PagerDuty
  const securityRule: RoutingRule = {
    id: 'route-security-to-pagerduty',
    name: 'Route critical security to PagerDuty',
    priority: 100,
    condition: (alert) =>
      alert.category === 'security' && alert.severity === 'critical',
    channels: ['pagerduty', 'sms', 'email'],
    recipients: ['security-oncall@company.com']
  };

  alertManager.addRoutingRule(securityRule);

  // Rule 2: Compliance alerts to compliance team
  const complianceRule: RoutingRule = {
    id: 'route-compliance-to-teams',
    name: 'Route compliance violations to Teams',
    priority: 90,
    condition: (alert) =>
      alert.category === 'compliance' && alert.severity !== 'low',
    channels: ['teams', 'email'],
    recipients: ['compliance@company.com']
  };

  alertManager.addRoutingRule(complianceRule);

  // Rule 3: Performance alerts during business hours only
  const performanceRule: RoutingRule = {
    id: 'route-performance-business-hours',
    name: 'Performance alerts during business hours',
    priority: 80,
    condition: (alert) => {
      const hour = new Date().getHours();
      return (
        alert.category === 'performance' &&
        alert.severity !== 'low' &&
        hour >= 9 &&
        hour <= 18
      );
    },
    channels: ['slack', 'email'],
    recipients: ['ops@company.com']
  };

  alertManager.addRoutingRule(performanceRule);

  // Rule 4: Data alerts to data team
  const dataRule: RoutingRule = {
    id: 'route-data-to-data-team',
    name: 'Route data issues to data team',
    priority: 75,
    condition: (alert) => alert.category === 'data',
    channels: ['slack', 'email'],
    recipients: ['data-team@company.com']
  };

  alertManager.addRoutingRule(dataRule);

  console.log('Routing rules configured');
}

/**
 * SECTION 10: Complete Setup
 * ==========================
 */
export async function setupAlertManager() {
  console.log('Setting up Alert Manager...');

  // Configure all channels
  configureEmailChannel();
  configureSlackChannel();
  configureTeamsChannel();
  configurePagerDutyChannel();
  configureSMSChannel();
  configureWebhookChannel();

  // Setup escalation policies
  setupDefaultEscalationPolicy();
  setupSecurityEscalationPolicy();
  setupComplianceEscalationPolicy();

  // Setup routing rules
  setupRoutingRules();

  console.log('Alert Manager setup complete');

  // Test all channels
  console.log('Testing channels...');
  const channels = ['email', 'slack', 'teams', 'pagerduty', 'sms', 'webhook'];

  for (const channel of channels) {
    try {
      const isConnected = await alertManager.testChannel(channel);
      console.log(`  ${channel}: ${isConnected ? '✓' : '✗'}`);
    } catch (error) {
      console.log(`  ${channel}: ✗ (${(error as Error).message})`);
    }
  }
}

/**
 * SECTION 11: Usage Examples
 * ==========================
 */
export async function exampleUsage() {
  // Example 1: Create a security alert
  const securityAlert = await alertManager.createAlert({
    title: 'Unauthorized API Access Detected',
    severity: 'critical',
    source: 'api-gateway',
    category: 'security',
    description: 'Multiple unauthorized API requests detected from external IP',
    metrics: {
      failed_requests: 250,
      source_ip: '203.0.113.42',
      time_window: '5 minutes'
    },
    context: {
      api_endpoint: '/api/users',
      affected_accounts: 15,
      request_pattern: 'brute-force'
    },
    recommended_actions: [
      'Block source IP immediately',
      'Review API gateway logs',
      'Check for successful breaches',
      'Enable rate limiting'
    ]
  });

  console.log('Security alert created:', securityAlert.id);

  // Example 2: Acknowledge alert
  await alertManager.acknowledgeAlert(securityAlert.id, 'john.doe@company.com');
  console.log('Alert acknowledged by john.doe@company.com');

  // Example 3: Get alert statistics
  const stats = alertManager.getAlertStats({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000),
    end: new Date()
  });

  console.log('Alert statistics:', stats);

  // Example 4: Get channel statistics
  const channelStats = alertManager.getChannelStats();
  console.log('Channel statistics:', channelStats);

  // Example 5: Get acknowledgment rate
  const ackRate = alertManager.getAcknowledgmentRate();
  console.log(`Acknowledgment rate: ${ackRate.toFixed(2)}%`);

  // Example 6: Get Mean Time To Resolve
  const mttr = alertManager.getMTTR();
  console.log(`Mean Time To Resolve: ${(mttr / 1000 / 60).toFixed(2)} minutes`);
}

/**
 * SECTION 12: Event Listeners
 * ===========================
 */
export function setupEventListeners() {
  // Listen to alert creation
  alertManager.on('alert:created', (alert) => {
    console.log(`Alert created: [${alert.severity.toUpperCase()}] ${alert.title}`);
  });

  // Listen to alert acknowledgment
  alertManager.on('alert:acknowledged', (alert) => {
    console.log(`Alert acknowledged: ${alert.title} by ${alert.acknowledgedBy}`);
  });

  // Listen to alert resolution
  alertManager.on('alert:resolved', (alert) => {
    console.log(`Alert resolved: ${alert.title} by ${alert.resolvedBy}`);
  });

  // Listen to alert escalation
  alertManager.on('alert:escalated', ({ alert, level }) => {
    console.log(`Alert escalated to level ${level}: ${alert.title}`);
  });

  // Listen to channel addition
  alertManager.on('channel:added', (channel) => {
    console.log(`Channel added: ${channel.name} (${channel.type})`);
  });

  // Listen to routing rule addition
  alertManager.on('routing:rule-added', (rule) => {
    console.log(`Routing rule added: ${rule.name}`);
  });

  // Listen to escalation policy addition
  alertManager.on('escalation:policy-added', (policy) => {
    console.log(`Escalation policy added: ${policy.name}`);
  });
}

/**
 * SECTION 13: Integration with Error Handler
 * ===========================================
 */
export function setupErrorHandlerIntegration() {
  // Example: Create alert when unhandled error occurs
  process.on('unhandledRejection', async (reason: any) => {
    await alertManager.createAlert({
      title: 'Unhandled Promise Rejection',
      severity: 'high',
      source: 'process',
      category: 'system',
      description: String(reason),
      context: {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version
      },
      recommended_actions: [
        'Review application logs',
        'Identify the source promise',
        'Implement proper error handling'
      ]
    });
  });

  // Example: Create alert on uncaught exception
  process.on('uncaughtException', async (error: Error) => {
    await alertManager.createAlert({
      title: 'Uncaught Exception',
      severity: 'critical',
      source: 'process',
      category: 'system',
      description: error.message,
      context: {
        stack: error.stack,
        timestamp: new Date().toISOString()
      },
      recommended_actions: [
        'Restart application immediately',
        'Review stack trace',
        'Implement comprehensive error handling'
      ]
    });
  });
}

/**
 * Initialize all configurations
 */
export async function initializeAlertManager() {
  setupEventListeners();
  await setupAlertManager();
  setupErrorHandlerIntegration();
}

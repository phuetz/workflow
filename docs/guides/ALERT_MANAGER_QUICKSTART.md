# Alert Manager Quick Start Guide

## 5-Minute Setup

### 1. Import and Initialize

```typescript
import { alertManager } from './monitoring/AlertManager';
import { setupAlertManager } from './monitoring/alertManagerConfig.example';

// Initialize with all default channels and policies
await setupAlertManager();
```

### 2. Create Your First Alert

```typescript
const alert = await alertManager.createAlert({
  title: 'High CPU Usage',
  severity: 'high',
  source: 'monitoring',
  category: 'performance',
  description: 'CPU usage exceeded 90%',
  recommended_actions: ['Scale horizontally', 'Investigate processes']
});

console.log('Alert created:', alert.id);
```

### 3. Manage Alert Status

```typescript
// Acknowledge
await alertManager.acknowledgeAlert(alert.id, 'john@company.com');

// Resolve
await alertManager.resolveAlert(alert.id, 'john@company.com');

// Mute for 1 hour
await alertManager.muteAlert(alert.id, 60 * 60 * 1000);
```

### 4. Query Alerts

```typescript
// Get all alerts
const alerts = alertManager.getAllAlerts();

// Filter by severity
const critical = alertManager.getAllAlerts({
  severity: ['critical']
});

// Filter by status
const open = alertManager.getAllAlerts({
  status: ['open']
});
```

### 5. Get Statistics

```typescript
const stats = alertManager.getAlertStats({
  start: new Date(Date.now() - 24 * 60 * 60 * 1000),
  end: new Date()
});

console.log(`Total alerts: ${stats.totalAlerts}`);
console.log(`Acknowledgment rate: ${stats.acknowledgedRate.toFixed(2)}%`);
console.log(`Resolution rate: ${stats.resolvedRate.toFixed(2)}%`);
```

---

## Common Patterns

### Pattern 1: Security Alert with Escalation

```typescript
const securityAlert = await alertManager.createAlert({
  title: 'Brute Force Attack Detected',
  severity: 'critical',
  source: 'auth-service',
  category: 'security',
  description: 'Multiple failed login attempts from 192.168.1.100',
  metrics: {
    failed_attempts: 15,
    threshold: 5,
    source_ip: '192.168.1.100'
  },
  recommended_actions: [
    'Block IP address',
    'Review login logs',
    'Reset affected passwords',
    'Enable MFA'
  ]
});

// Alert automatically escalates based on policy
// Level 0 (0min): Email notification
// Level 1 (15min): Slack + Email if not acknowledged
// Level 2 (30min): PagerDuty + SMS if critical
```

### Pattern 2: Performance Monitoring

```typescript
// Monitor high error rates
const errorAlert = await alertManager.createAlert({
  title: 'High Error Rate Detected',
  severity: 'high',
  source: 'api-gateway',
  category: 'performance',
  description: 'Error rate exceeded 5% threshold',
  metrics: {
    error_rate: 5.8,
    threshold: 5,
    errors_per_minute: 28
  },
  recommended_actions: [
    'Check application logs',
    'Review recent deployments',
    'Scale up servers'
  ]
});
```

### Pattern 3: Compliance Monitoring

```typescript
const complianceAlert = await alertManager.createAlert({
  title: 'GDPR Compliance Violation',
  severity: 'high',
  source: 'compliance-engine',
  category: 'compliance',
  description: 'Data retention exceeds GDPR limits',
  metrics: {
    retention_days: 2555,
    gdpr_limit: 1825,
    affected_records: 1250
  },
  recommended_actions: [
    'Review retention policies',
    'Schedule data purge',
    'Notify legal department'
  ]
});
```

---

## Environment Setup

### .env Configuration

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=alerts@company.com
SMTP_PASSWORD=your-app-password

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_CHANNEL=#alerts

# Teams
TEAMS_WEBHOOK_URL=https://outlook.webhook.office.com/webhookb2/YOUR/URL

# PagerDuty
PAGERDUTY_API_KEY=u+YOUR_API_KEY
PAGERDUTY_ROUTING_KEY=R+YOUR_ROUTING_KEY

# Twilio (SMS)
TWILIO_ACCOUNT_SID=AC+YOUR_SID
TWILIO_AUTH_TOKEN=YOUR_TOKEN
TWILIO_PHONE_FROM=+1234567890

# Custom Webhook
WEBHOOK_URL=https://yourapi.com/alerts
WEBHOOK_TOKEN=your-bearer-token
WEBHOOK_SECRET=your-webhook-secret
```

---

## Testing Channels

```typescript
// Test email channel
const emailOk = await alertManager.testChannel('email');
console.log('Email:', emailOk ? '✓' : '✗');

// Test Slack
const slackOk = await alertManager.testChannel('slack');
console.log('Slack:', slackOk ? '✓' : '✗');

// Test all channels
const channels = ['email', 'slack', 'teams', 'pagerduty', 'sms', 'webhook'];
for (const channel of channels) {
  const ok = await alertManager.testChannel(channel);
  console.log(`${channel}: ${ok ? '✓' : '✗'}`);
}
```

---

## Event Listeners

```typescript
// Listen to alert creation
alertManager.on('alert:created', (alert) => {
  console.log(`New alert: [${alert.severity}] ${alert.title}`);
});

// Listen to acknowledgments
alertManager.on('alert:acknowledged', (alert) => {
  console.log(`Acknowledged by ${alert.acknowledgedBy}`);
});

// Listen to escalation
alertManager.on('alert:escalated', ({ alert, level }) => {
  console.log(`Escalated to level ${level}`);
});

// Listen to channel events
alertManager.on('channel:added', (channel) => {
  console.log(`Channel added: ${channel.name}`);
});
```

---

## Routing Rules

### Custom Routing

```typescript
// Route critical security alerts to PagerDuty
alertManager.addRoutingRule({
  id: 'security-critical-pagerduty',
  name: 'Security Critical to PagerDuty',
  priority: 100,
  condition: (alert) =>
    alert.category === 'security' && alert.severity === 'critical',
  channels: ['pagerduty', 'sms']
});

// Route compliance issues to Teams
alertManager.addRoutingRule({
  id: 'compliance-teams',
  name: 'Compliance to Teams',
  priority: 90,
  condition: (alert) => alert.category === 'compliance',
  channels: ['teams', 'email']
});
```

---

## Escalation Policies

### Custom Policy

```typescript
alertManager.addEscalationPolicy({
  id: 'critical-response',
  name: 'Critical Response Policy',
  enabled: true,
  rules: [
    {
      level: 0,
      delay: 0,
      channels: ['email', 'slack'],
      recipients: ['ops@company.com']
    },
    {
      level: 1,
      delay: 15,
      channels: ['pagerduty'],
      recipients: ['oncall@company.com'],
      condition: (alert) => alert.severity === 'critical'
    },
    {
      level: 2,
      delay: 30,
      channels: ['sms'],
      recipients: ['ciso@company.com'],
      condition: (alert) =>
        alert.severity === 'critical' &&
        alert.category === 'security'
    }
  ]
});
```

---

## Monitoring & Analytics

```typescript
// Get detailed statistics
const stats = alertManager.getAlertStats({
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
  end: new Date()
});

console.log('Total Alerts:', stats.totalAlerts);
console.log('By Severity:', stats.bySeverity);
console.log('By Category:', stats.byCategory);
console.log('Acknowledgment Rate:', stats.acknowledgedRate.toFixed(2) + '%');
console.log('Resolution Rate:', stats.resolvedRate.toFixed(2) + '%');
console.log('Avg Time to Acknowledge:', Math.round(stats.avgTimeToAcknowledge / 1000 / 60) + ' min');
console.log('Avg Time to Resolve:', Math.round(stats.avgTimeToResolve / 1000 / 60) + ' min');

// Channel performance
const channelStats = alertManager.getChannelStats();
for (const stat of channelStats) {
  console.log(`${stat.name}: ${stat.successRate.toFixed(2)}% success rate`);
}

// Overall metrics
console.log('Overall Acknowledgment Rate:', alertManager.getAcknowledgmentRate().toFixed(2) + '%');
console.log('Mean Time To Resolve:', Math.round(alertManager.getMTTR() / 1000 / 60) + ' min');
```

---

## Integration Examples

### With Error Handler

```typescript
process.on('unhandledRejection', async (reason: any) => {
  await alertManager.createAlert({
    title: 'Unhandled Rejection',
    severity: 'high',
    source: 'process',
    category: 'system',
    description: String(reason),
    recommended_actions: ['Check logs', 'Fix error handling']
  });
});
```

### With Execution Engine

```typescript
executor.on('execution-failed', async (execution) => {
  await alertManager.createAlert({
    title: `Workflow Failed: ${execution.workflowName}`,
    severity: 'high',
    source: 'executor',
    category: 'system',
    description: execution.error.message,
    context: { workflowId: execution.workflowId },
    recommended_actions: ['Check logs', 'Investigate node']
  });
});
```

### With Database Events

```typescript
// Monitor database connectivity
db.on('connection-lost', async () => {
  await alertManager.createAlert({
    title: 'Database Connection Lost',
    severity: 'critical',
    source: 'database',
    category: 'system',
    description: 'Cannot connect to primary database',
    recommended_actions: ['Check DB status', 'Failover', 'Page on-call']
  });
});
```

---

## Troubleshooting

### Alerts Not Being Sent

1. Check if channels are enabled:
   ```typescript
   alertManager.enableChannel('slack');
   ```

2. Test channel connectivity:
   ```typescript
   const ok = await alertManager.testChannel('slack');
   console.log('Channel OK:', ok);
   ```

3. Check rate limits:
   ```typescript
   const channelStats = alertManager.getChannelStats();
   for (const stat of channelStats) {
     console.log(`${stat.name}: ${stat.sentCount} sent, ${stat.failedCount} failed`);
   }
   ```

### High Alert Fatigue

1. Enable deduplication (5-minute window by default)
2. Add routing rules to filter non-critical alerts
3. Adjust severity thresholds
4. Review escalation delays

### Escalation Not Working

1. Verify escalation policy is enabled
2. Check escalation delays
3. Confirm condition functions
4. Check channel configuration

---

## TypeScript Types

```typescript
import type {
  Alert,
  AlertSeverity,
  AlertCategory,
  NotificationChannel,
  EscalationPolicy,
  RoutingRule,
  AlertStatistics
} from './monitoring/AlertManager';

// Create typed alert
const alert: Alert = {
  id: 'alert-123',
  timestamp: new Date(),
  severity: 'critical',
  title: 'Critical Alert',
  description: 'Description',
  source: 'source',
  category: 'security',
  recommended_actions: [],
  status: 'open',
  escalationLevel: 0,
  notificationsSent: 0
};
```

---

## Running Tests

```bash
# Run all alert manager tests
npm run test -- src/__tests__/alertManager.test.ts

# Run specific test suite
npm run test -- src/__tests__/alertManager.test.ts -t "Alert Creation"

# Run with coverage
npm run test:coverage -- src/__tests__/alertManager.test.ts
```

---

## Next Steps

1. ✅ Set up email channel with SMTP credentials
2. ✅ Configure Slack webhook
3. ✅ Set up PagerDuty integration
4. ✅ Define escalation policies
5. ✅ Create routing rules for your categories
6. ✅ Test all channels
7. ✅ Monitor alert statistics
8. ✅ Fine-tune escalation based on metrics

---

## Support & Documentation

- Full Documentation: `WEEK8_PHASE2_ALERT_MANAGER.md`
- Configuration Examples: `src/monitoring/alertManagerConfig.example.ts`
- Test Suite: `src/__tests__/alertManager.test.ts`
- API Reference: See CLAUDE.md

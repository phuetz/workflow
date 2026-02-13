# Security Monitor - Quick Start Guide

## Installation & Setup

### 1. Import the Monitor
```typescript
import { securityMonitor } from '@/monitoring/SecurityMonitor';
```

### 2. Start Monitoring
```typescript
// Start the monitoring system
securityMonitor.start();

// Process security events
const event: SecurityEvent = {
  id: 'evt_' + Date.now(),
  timestamp: new Date(),
  severity: SecuritySeverity.HIGH,
  category: SecurityCategory.AUTH,
  eventType: 'failed_login',
  description: 'Multiple failed login attempts',
  threatIndicators: {
    score: 85,
    indicators: ['brute_force'],
    riskFactors: ['password_spray'],
    confidence: 0.95
  }
};

securityMonitor.processSecurityEvent(event);

// Stop when done
securityMonitor.stop();
```

## Common Operations

### Get Current Metrics
```typescript
const metrics = securityMonitor.getMetrics();
console.log(`Threat Score: ${metrics.averageThreatScore}`);
console.log(`Failed Logins: ${metrics.failedLoginAttempts}`);
console.log(`API Error Rate: ${metrics.errorRate}%`);
```

### Get Dashboard Data
```typescript
const dashboard = securityMonitor.getDashboardData();

// Display system status
console.log(`System: ${dashboard.systemStatus.overall}`);

// Show recent alerts
dashboard.recentAlerts.forEach(alert => {
  console.log(`[${alert.severity}] ${alert.title}`);
});

// Show compliance
console.log(`Compliance: ${dashboard.complianceStatus.overall}%`);
```

### Listen for Alerts
```typescript
// Single alert event
securityMonitor.on('alert', (alert) => {
  console.log(`ALERT: ${alert.title}`);
  console.log(`Recommended Actions:`);
  alert.recommended_actions.forEach(a => console.log(`  - ${a}`));
});

// Multiple alerts (batch from rule evaluation)
securityMonitor.on('alerts', (alerts) => {
  alerts.forEach(alert => console.log(`[${alert.severity}] ${alert.title}`));
});
```

### Real-Time Metrics
```typescript
securityMonitor.on('metrics-updated', (metrics) => {
  console.log(`Events: ${metrics.totalSecurityEvents}`);
  console.log(`Threat Score: ${metrics.averageThreatScore}`);
});
```

### Add Custom Rule
```typescript
securityMonitor.addRule({
  id: 'high-error-rate',
  name: 'High Error Rate Alert',
  description: 'Alert when API error rate exceeds 10%',
  condition: (metrics) => metrics.errorRate > 10,
  severity: 'high',
  threshold: 10,
  action: 'alert',
  enabled: true,
  cooldownMs: 300000 // 5 minutes
});
```

### Acknowledge Alert
```typescript
securityMonitor.acknowledgeAlert(alertId, 'john.doe@company.com');
```

### Get Trend Data
```typescript
// Get 1-hour trend for failure rate
const trend = securityMonitor.calculateTrends('failureRate', 3600000);

console.log(`Average failure rate: ${trend.avg}%`);
console.log(`Peak: ${trend.max}%`);
console.log(`Min: ${trend.min}%`);
```

### Detect Anomalies
```typescript
const anomalies = securityMonitor.identifyAnomalies();

anomalies.forEach(anomaly => {
  console.log(`Anomaly: ${anomaly.type}`);
  console.log(`Current: ${anomaly.value}, Baseline: ${anomaly.baseline}`);
  console.log(`Deviation: ${anomaly.deviation} (${anomaly.severity})`);
});
```

### Identify Attack Vectors
```typescript
const vectors = securityMonitor.getTopAttackVectors();

vectors.forEach(vector => {
  console.log(`${vector.type}: ${vector.count} attempts`);
  vector.sources.forEach(source => {
    console.log(`  From ${source.ipAddress}: ${source.count}`);
  });
});
```

### Health Check
```typescript
const health = securityMonitor.getSystemHealth();

console.log(`Overall: ${health.overall}`);
Object.entries(health.components).forEach(([name, status]) => {
  console.log(`  ${name}: ${status}`);
});

// Update component status
securityMonitor.updateComponentHealth('database', 'down', 5000); // 5 second latency
```

### Compliance Check
```typescript
const compliance = securityMonitor.checkCompliance();

console.log(`Overall Score: ${compliance.overall}%`);

Object.entries(compliance.frameworks).forEach(([framework, score]) => {
  console.log(`${framework}: ${score}%`);
});

// Recent violations
compliance.violations.forEach(v => {
  console.log(`Violation: ${v.framework} - ${v.control} (${v.severity})`);
});
```

## Integration Examples

### With Express API
```typescript
import express from 'express';
import { securityMonitor } from '@/monitoring/SecurityMonitor';

const app = express();

// Security metrics endpoint
app.get('/api/security/metrics', (req, res) => {
  res.json(securityMonitor.getMetrics());
});

// Security dashboard endpoint
app.get('/api/security/dashboard', (req, res) => {
  res.json(securityMonitor.getDashboardData());
});

// Get alerts
app.get('/api/security/alerts', (req, res) => {
  res.json(securityMonitor.getAlerts());
});

// Start monitoring on app startup
app.listen(3000, () => {
  securityMonitor.start();
  console.log('Security monitoring started');
});
```

### With WebSocket (Socket.io)
```typescript
import { io } from 'socket.io';
import { securityMonitor } from '@/monitoring/SecurityMonitor';

const socketServer = io(3001);

securityMonitor.start();

// Stream metrics to clients
securityMonitor.on('metrics-updated', (metrics) => {
  socketServer.emit('security:metrics', metrics);
});

// Stream alerts to clients
securityMonitor.on('alert', (alert) => {
  socketServer.emit('security:alert', {
    id: alert.id,
    severity: alert.severity,
    title: alert.title,
    description: alert.description,
    actions: alert.recommended_actions,
    timestamp: alert.timestamp
  });
});

// Stream anomalies periodically
setInterval(() => {
  const anomalies = securityMonitor.identifyAnomalies();
  if (anomalies.length > 0) {
    socketServer.emit('security:anomalies', anomalies);
  }
}, 60000); // Every minute
```

### With Security Event Logger
```typescript
import { SecurityEventLogger } from '@/audit/SecurityEventLogger';
import { securityMonitor } from '@/monitoring/SecurityMonitor';

const eventLogger = new SecurityEventLogger();
securityMonitor.start();

// Forward security events to monitor
eventLogger.on('event', (event) => {
  securityMonitor.processSecurityEvent(event);
});

// Log failed login
eventLogger.logSecurityEvent({
  severity: SecuritySeverity.MEDIUM,
  category: SecurityCategory.AUTH,
  eventType: 'failed_login',
  description: 'Failed login attempt for user admin',
  userId: 'admin',
  ipAddress: '192.168.1.1'
});
```

### With Alert Manager
```typescript
import { securityMonitor } from '@/monitoring/SecurityMonitor';
import { alertManager } from '@/services/AlertManager';

securityMonitor.on('alert', async (alert) => {
  if (alert.severity === 'critical') {
    // Send to PagerDuty
    await alertManager.sendAlert({
      channel: 'pagerduty',
      title: alert.title,
      description: alert.description,
      severity: alert.severity,
      actions: alert.recommended_actions
    });
  } else if (alert.severity === 'high') {
    // Send to Slack
    await alertManager.sendAlert({
      channel: 'slack',
      title: alert.title,
      description: alert.description,
      severity: alert.severity
    });
  }
});
```

## Configuration Examples

### Strict Security Rules
```typescript
// Disable all lenient rules
securityMonitor.disableRule('unusual-activity-hours');

// Lower threshold for failure rate
securityMonitor.removeRule('high-failure-rate');
securityMonitor.addRule({
  id: 'high-failure-rate',
  name: 'High Login Failure Rate',
  description: 'Alert on any suspicious login patterns',
  condition: (m) => m.failureRate > 10, // Lower threshold
  severity: 'high',
  threshold: 10,
  action: 'block',
  enabled: true,
  cooldownMs: 600000
});
```

### Compliance-Focused Monitoring
```typescript
// Monitor compliance closely
setInterval(() => {
  const compliance = securityMonitor.checkCompliance();

  if (compliance.overall < 85) {
    console.warn(`Compliance dropped to ${compliance.overall}%`);
    // Trigger audit
  }
}, 300000); // Every 5 minutes
```

### Development vs Production
```typescript
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  // Strict rules
  securityMonitor.enableRule('brute-force-detected');
  securityMonitor.enableRule('permission-escalation');
  securityMonitor.enableRule('large-data-export');
} else {
  // Lenient rules
  securityMonitor.disableRule('unusual-activity-hours');
  securityMonitor.disableRule('large-data-export');
}

securityMonitor.start();
```

## Troubleshooting

### Events Not Being Processed
```typescript
// Check if monitor is running
console.log('Is running:', securityMonitor['isRunning']);

// Check event buffer
console.log('Buffer size:', securityMonitor['eventBuffer'].length);

// Restart monitor
securityMonitor.stop();
securityMonitor.start();
```

### Metrics Not Updating
```typescript
// Check metrics timestamp
const metrics = securityMonitor.getMetrics();
console.log('Last update:', metrics.timestamp);

// Manually trigger update
securityMonitor['updateMetrics']();
```

### Rules Not Triggering
```typescript
// Check rule enabled status
securityMonitor.getRules().forEach(rule => {
  console.log(`${rule.id}: ${rule.enabled ? 'enabled' : 'disabled'}`);
  console.log(`  Last triggered: ${rule.lastTriggered}`);
});

// Check rule condition manually
const metrics = securityMonitor.getMetrics();
const rule = securityMonitor.getRules()[0];
console.log(`Condition result: ${rule.condition(metrics)}`);
```

## Performance Tips

1. **Use Event Listeners**: Don't poll metrics, use event emitters
2. **Batch Processing**: Events are batched for efficiency
3. **Selective Rules**: Only enable rules you need
4. **Cleanup Old Alerts**: Periodically clear old alerts with `clearAlerts()`
5. **Export Periodically**: Save metrics to persistent storage periodically

```typescript
// Example: Save metrics daily
setInterval(() => {
  const json = securityMonitor.exportMetrics();
  fs.writeFileSync(`metrics-${Date.now()}.json`, json);
}, 24 * 3600 * 1000);
```

## API Summary

| Method | Purpose |
|--------|---------|
| `start()` | Start monitoring |
| `stop()` | Stop monitoring |
| `processSecurityEvent()` | Process security event |
| `processAuditLog()` | Process audit log |
| `getMetrics()` | Get current metrics |
| `getHistoricalMetrics()` | Get historical metrics |
| `getDashboardData()` | Get dashboard snapshot |
| `addRule()` | Add custom rule |
| `removeRule()` | Remove rule |
| `evaluateRules()` | Manually evaluate rules |
| `getAlerts()` | Get all alerts |
| `acknowledgeAlert()` | Mark alert as acknowledged |
| `clearAlerts()` | Clear all alerts |
| `calculateTrends()` | Get trend data |
| `identifyAnomalies()` | Detect anomalies |
| `getTopAttackVectors()` | Get attack vectors |
| `getSystemHealth()` | Get system health |
| `checkCompliance()` | Get compliance status |
| `updateComponentHealth()` | Update component status |
| `exportMetrics()` | Export all data as JSON |
| `resetMetrics()` | Reset to defaults |

## Events Reference

```typescript
// Lifecycle
on('started') // Monitor started
on('stopped')  // Monitor stopped

// Processing
on('security-event', event)        // Security event processed
on('audit-log', log)               // Audit log processed
on('metrics-updated', metrics)     // Metrics updated (every second)

// Alerting
on('alerts', alerts[])             // Rules triggered (batch)
on('alert', alert)                 // Single alert
on('alert-acknowledged', alert)    // Alert acknowledged

// Health
on('component-health-updated', update) // Component health changed
```

---

**Last Updated**: Phase 2, Week 8
**Status**: Production Ready ✅

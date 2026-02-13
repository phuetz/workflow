# Security Monitoring & Alerting Guide

**Week 8: Phase 2 - Enterprise Security Infrastructure**

A comprehensive guide to the real-time security monitoring system with advanced alerting, anomaly detection, and incident response capabilities.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [SecurityMonitor](#securitymonitor)
4. [AlertManager](#alertmanager)
5. [AnomalyDetector](#anomalydetector)
6. [IncidentResponder](#incidentresponder)
7. [Integration Examples](#integration-examples)
8. [Dashboard Setup](#dashboard-setup)
9. [Alert Configuration](#alert-configuration)
10. [Playbook Development](#playbook-development)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)
13. [API Reference](#api-reference)

---

## Overview

The Security Monitoring & Alerting system provides enterprise-grade real-time security monitoring with:

- **Real-Time Metrics**: 20+ security metrics updated every second
- **Rule-Based Alerting**: 10+ built-in rules with custom threshold support
- **Anomaly Detection**: ML-powered detection of 6 anomaly types
- **Incident Response**: Automated response with 10+ action types and 4+ playbooks
- **Multi-Channel Notifications**: Email, Slack, Teams, PagerDuty, SMS, Webhooks
- **Historical Data**: 24-hour retention with 1-minute granularity

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Events & Audit Logs              │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              SecurityMonitor (Event Processing)              │
│  - Event buffering & aggregation                            │
│  - Real-time metrics calculation                            │
│  - 20+ metric types                                         │
└────────┬──────────────────┬──────────────────┬──────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
    ┌────────────┐    ┌──────────────┐   ┌────────────┐
    │AlertManager│    │AnomalyDetector│  │ Compliance │
    │ - Routing  │    │ - Baselines   │  │  Tracking  │
    │ - Channels │    │ - ML Analysis │  │            │
    │- Escalation│    │ - Forecasting │  │            │
    └────────┬───┘    └──────────────┘   └────────────┘
             │
             ▼
    ┌─────────────────────┐
    │   Notification      │
    │   Channels (6)      │
    └─────────────────────┘
             │
             ▼
    ┌─────────────────────┐
    │  IncidentResponder  │
    │  - Auto Response    │
    │  - Playbook Exec    │
    │  - Forensics        │
    └─────────────────────┘
```

### Key Capabilities

#### SecurityMonitor
- Process 1000+ events/second
- Calculate metrics in real-time
- Maintain 24-hour historical data
- Generate dashboard data
- Support WebSocket streaming

#### AlertManager
- 6 notification channels
- Intelligent routing and deduplication
- Multi-level escalation
- Rate limiting and quiet hours
- Alert aggregation

#### AnomalyDetector
- Statistical baseline analysis
- 6 detection methods (spike, drop, pattern, behavior, frequency, temporal)
- User behavior profiling
- Time-series forecasting
- Confidence scoring

#### IncidentResponder
- 8 incident categories
- 10 automated response actions
- 4+ response playbooks
- Forensic data collection
- Post-mortem generation

---

## Quick Start

### 5-Minute Setup

#### Step 1: Initialize Monitoring

```typescript
import { securityMonitor } from '@/monitoring/SecurityMonitor'

// Start monitoring
securityMonitor.start()
console.log('SecurityMonitor started')
```

#### Step 2: Configure Alert Channels

```typescript
import { alertManager } from '@/monitoring/AlertManager'

// Add Slack channel
alertManager.addChannel({
  type: 'slack',
  name: 'security-alerts',
  enabled: true,
  config: {
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK,
      channel: '#security'
    }
  },
  severityFilter: ['high', 'critical']
})

// Add Email channel
alertManager.addChannel({
  type: 'email',
  name: 'security-email',
  enabled: true,
  config: {
    email: {
      host: process.env.SMTP_HOST,
      port: 587,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      from: 'security@company.com',
      to: ['security-team@company.com']
    }
  },
  severityFilter: ['medium', 'high', 'critical']
})
```

#### Step 3: Start Processing Events

```typescript
import { SecurityEvent } from '@/audit/SecurityEventLogger'

const event: SecurityEvent = {
  timestamp: new Date(),
  category: 'api_abuse',
  severity: 'high',
  description: 'High number of failed login attempts',
  ipAddress: '192.168.1.100',
  userId: 'user123',
  threatIndicators: {
    score: 75,
    risks: ['brute_force', 'credential_stuffing']
  }
}

securityMonitor.processSecurityEvent(event)
```

#### Step 4: View Dashboard

```typescript
// Get current dashboard data
const dashboard = securityMonitor.getDashboardData()

console.log(`Total Events: ${dashboard.currentMetrics.totalSecurityEvents}`)
console.log(`Critical Events: ${dashboard.currentMetrics.criticalEvents}`)
console.log(`Compliance Score: ${dashboard.complianceStatus.overall.toFixed(2)}%`)
console.log(`Recent Alerts: ${dashboard.recentAlerts.length}`)
```

#### Step 5: Listen for Alerts

```typescript
// Listen for new alerts
securityMonitor.on('alert', (alert) => {
  console.log(`ALERT: ${alert.title} (${alert.severity})`)
  console.log(`Recommended Actions:`)
  alert.recommended_actions.forEach(action => {
    console.log(`  - ${action}`)
  })
})

// Listen for anomalies
const detector = AnomalyDetector.getInstance()
detector.on('anomaly', (anomaly) => {
  console.log(`ANOMALY: ${anomaly.description}`)
  console.log(`Confidence: ${(anomaly.confidence * 100).toFixed(0)}%`)
})
```

---

## SecurityMonitor

### Overview

The SecurityMonitor is the core real-time monitoring engine that processes security events and generates metrics for dashboard visualization and alerting.

### Features

- **Real-Time Processing**: Event buffer processes up to 100 events every 100ms
- **20+ Metrics**: Login attempts, threat scores, compliance status, system health
- **10+ Built-in Rules**: Automatic alert generation based on metric thresholds
- **24-Hour History**: Circular buffer maintains 1,440 data points (1-minute intervals)
- **Dashboard Data**: Pre-formatted data for visualization
- **WebSocket Support**: Real-time streaming via EventEmitter

### Architecture

```
Event Buffer (100 items max)
    ↓
Event Processing (100ms interval)
    ↓
Metrics Calculation (1s interval)
    ↓
Rule Evaluation (5s interval)
    ↓
Alert Generation
    ↓
Historical Storage (24 hours)
```

### Metrics Reference

| Metric | Type | Description |
|--------|------|-------------|
| totalLoginAttempts | number | Total login attempts |
| failedLoginAttempts | number | Number of failed logins |
| successfulLogins | number | Number of successful logins |
| failureRate | percentage | Failed login rate (0-100) |
| totalSecurityEvents | number | Total security events recorded |
| criticalEvents | number | Count of critical-severity events |
| highSeverityEvents | number | Count of high-severity events |
| mediumSeverityEvents | number | Count of medium-severity events |
| lowSeverityEvents | number | Count of low-severity events |
| averageThreatScore | number | Average threat score (0-100) |
| maxThreatScore | number | Maximum threat score recorded |
| activeThreats | number | Currently active threats |
| mitigatedThreats | number | Successfully mitigated threats |
| injectionAttempts | number | SQL/code injection attempts |
| bruteForceAttempts | number | Brute force attack attempts |
| rateLimitViolations | number | API rate limit violations |
| permissionEscalations | number | Privilege escalation attempts |
| dataExfiltrationAttempts | number | Data exfiltration attempts |
| systemUptime | milliseconds | System uptime since start |
| activeUsers | number | Currently active users |
| activeSessions | number | Active user sessions |
| apiCallRate | calls/second | API calls per second |
| errorRate | percentage | API error rate (0-100) |
| complianceScore | percentage | Overall compliance score (0-100) |
| controlsCompliant | number | Compliant controls count |
| controlsNonCompliant | number | Non-compliant controls count |
| violations | number | Total compliance violations |

### Built-In Rules

#### 1. High Failure Rate
- **Condition**: Failure rate > 20%
- **Severity**: HIGH
- **Action**: Alert
- **Cooldown**: 5 minutes

#### 2. Brute Force Attack
- **Condition**: >5 failed attempts in 5 minutes
- **Severity**: CRITICAL
- **Action**: Block
- **Cooldown**: 10 minutes

#### 3. Critical Events Spike
- **Condition**: >10 critical events in 1 minute
- **Severity**: CRITICAL
- **Action**: Alert
- **Cooldown**: 5 minutes

#### 4. High Threat Score
- **Condition**: Average threat score > 70
- **Severity**: HIGH
- **Action**: Alert
- **Cooldown**: 5 minutes

#### 5. API Error Rate High
- **Condition**: Error rate > 5%
- **Severity**: MEDIUM
- **Action**: Notify
- **Cooldown**: 10 minutes

#### 6. Rapid API Calls
- **Condition**: >100 calls/second
- **Severity**: HIGH
- **Action**: Block
- **Cooldown**: 5 minutes

#### 7. Compliance Score Drop
- **Condition**: Compliance score < 80%
- **Severity**: HIGH
- **Action**: Alert
- **Cooldown**: 15 minutes

#### 8. Unusual Activity Hours
- **Condition**: Activity outside 6am-10pm OR >500 active users
- **Severity**: MEDIUM
- **Action**: Log
- **Cooldown**: 1 hour

#### 9. Permission Escalation
- **Condition**: >3 escalation attempts in 1 minute
- **Severity**: CRITICAL
- **Action**: Block
- **Cooldown**: 10 minutes

#### 10. Large Data Export
- **Condition**: >3 data exfiltration attempts in 1 hour
- **Severity**: HIGH
- **Action**: Block
- **Cooldown**: 10 minutes

### Usage Examples

#### Example 1: Monitor System Health

```typescript
import { securityMonitor } from '@/monitoring/SecurityMonitor'

// Start monitoring
securityMonitor.start()

// Get current metrics
setInterval(() => {
  const metrics = securityMonitor.getMetrics()

  // Log key metrics
  console.log(`
    Active Users: ${metrics.activeUsers}
    Failed Logins: ${metrics.failedLoginAttempts}/${metrics.totalLoginAttempts}
    Error Rate: ${metrics.errorRate.toFixed(2)}%
    Threat Score: ${metrics.averageThreatScore.toFixed(1)}/100
    Compliance: ${metrics.complianceScore.toFixed(1)}/100
  `)
}, 10000)
```

#### Example 2: Analyze Trends

```typescript
const detector = AnomalyDetector.getInstance()

// Get trend data for last 24 hours
const trends = securityMonitor.calculateTrends('totalSecurityEvents', 24 * 3600000)

console.log(`Events Trend (24h):`)
console.log(`  Average: ${trends.avg.toFixed(0)}`)
console.log(`  Min: ${trends.min}`)
console.log(`  Max: ${trends.max}`)
console.log(`  Trend: ${trends.values[trends.values.length - 1] > trends.values[0] ? 'increasing' : 'decreasing'}`)
```

#### Example 3: Detect Anomalies

```typescript
const anomalies = securityMonitor.identifyAnomalies()

anomalies.forEach(anomaly => {
  console.log(`
    Anomaly: ${anomaly.type}
    Severity: ${anomaly.severity}
    Value: ${anomaly.value.toFixed(2)}
    Baseline: ${anomaly.baseline.toFixed(2)}
    Deviation: ${anomaly.deviation.toFixed(2)}σ
    Description: ${anomaly.description}
  `)
})
```

#### Example 4: Top Attack Vectors

```typescript
const vectors = securityMonitor.getTopAttackVectors()

console.log('Top 10 Attack Vectors:')
vectors.forEach((vector, index) => {
  console.log(`
    ${index + 1}. ${vector.type}
       Count: ${vector.count}
       Severity: ${vector.severity}
       Last Seen: ${vector.lastSeen.toISOString()}
       Sources: ${vector.sources.length}
  `)
})
```

#### Example 5: Dashboard Integration

```typescript
import express from 'express'

const app = express()

// Dashboard endpoint
app.get('/api/security/dashboard', (req, res) => {
  const dashboard = securityMonitor.getDashboardData()

  res.json({
    timestamp: new Date().toISOString(),
    metrics: dashboard.currentMetrics,
    trends: dashboard.trendData,
    topThreats: dashboard.topThreats,
    recentAlerts: dashboard.recentAlerts.slice(0, 10),
    systemStatus: dashboard.systemStatus,
    compliance: dashboard.complianceStatus
  })
})

// WebSocket streaming
import { Server as SocketIOServer } from 'socket.io'

const io = new SocketIOServer(server)

securityMonitor.on('metrics-updated', (metrics) => {
  io.emit('metrics:update', metrics)
})

securityMonitor.on('alert', (alert) => {
  io.emit('alert:new', alert)
})

securityMonitor.on('anomaly', (anomaly) => {
  io.emit('anomaly:detected', anomaly)
})
```

### Dashboard Concepts

The dashboard provides real-time visualization of:

1. **Current Metrics**: KPIs at the current moment
2. **Trend Data**: Last 60 minutes of historical data
3. **Top Threats**: 10 most common threat types
4. **Recent Alerts**: Last 20 alerts
5. **System Status**: Health of key components
6. **Compliance Status**: Framework-specific compliance scores

---

## AlertManager

### Overview

The AlertManager handles sophisticated multi-channel alert routing, escalation, deduplication, and delivery tracking for 6 different notification channels.

### Notification Channels

#### 1. Email (SMTP)

```typescript
alertManager.addChannel({
  type: 'email',
  name: 'security-email',
  enabled: true,
  config: {
    email: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: true,
      auth: {
        user: 'alerts@company.com',
        pass: process.env.EMAIL_PASSWORD
      },
      from: 'security-alerts@company.com',
      to: ['security-team@company.com', 'ciso@company.com']
    }
  },
  severityFilter: ['medium', 'high', 'critical'],
  rateLimit: {
    maxPerHour: 100,
    maxPerDay: 500
  }
})

// Test channel
const isWorking = await alertManager.testChannel('security-email')
console.log(`Email channel: ${isWorking ? 'working' : 'failed'}`)
```

#### 2. Slack Webhooks

```typescript
alertManager.addChannel({
  type: 'slack',
  name: 'slack-security',
  enabled: true,
  config: {
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: '#security-alerts',
      username: 'Security Monitor',
      iconEmoji: ':shield:'
    }
  },
  severityFilter: ['high', 'critical'],
  categoryFilter: ['security', 'compliance'],
  rateLimit: {
    maxPerHour: 200,
    maxPerDay: 1000
  }
})
```

#### 3. Microsoft Teams

```typescript
alertManager.addChannel({
  type: 'teams',
  name: 'teams-security',
  enabled: true,
  config: {
    teams: {
      webhookUrl: process.env.TEAMS_WEBHOOK_URL
    }
  },
  severityFilter: ['critical']
})
```

#### 4. PagerDuty

```typescript
alertManager.addChannel({
  type: 'pagerduty',
  name: 'pagerduty-oncall',
  enabled: true,
  config: {
    pagerduty: {
      apiKey: process.env.PAGERDUTY_API_KEY,
      routingKey: process.env.PAGERDUTY_ROUTING_KEY,
      integrationUrl: 'https://events.pagerduty.com/v2/enqueue'
    }
  },
  severityFilter: ['critical'],
  rateLimit: {
    maxPerHour: 50,
    maxPerDay: 200
  }
})
```

#### 5. SMS (Twilio)

```typescript
alertManager.addChannel({
  type: 'sms',
  name: 'sms-oncall',
  enabled: true,
  config: {
    sms: {
      provider: 'twilio',
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      apiKey: process.env.TWILIO_AUTH_TOKEN,
      from: '+1234567890',
      to: ['+0987654321', '+1111111111']
    }
  },
  severityFilter: ['critical'],
  rateLimit: {
    maxPerHour: 20,
    maxPerDay: 50
  }
})
```

#### 6. Custom Webhooks

```typescript
alertManager.addChannel({
  type: 'webhook',
  name: 'custom-siem',
  enabled: true,
  config: {
    webhook: {
      url: 'https://siem.company.com/api/alerts',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SIEM_API_KEY}`,
        'X-Integration': 'workflow-platform'
      },
      timeout: 10000,
      verifySsl: true
    }
  },
  severityFilter: ['low', 'medium', 'high', 'critical']
})
```

### Escalation Policies

```typescript
// Define escalation policy
alertManager.addEscalationPolicy({
  id: 'security-escalation',
  name: 'Security Team Escalation',
  enabled: true,
  rules: [
    {
      level: 0,
      delay: 0,  // Immediate
      channels: ['slack'],
      recipients: ['oncall-engineer@company.com'],
      condition: (alert) => alert.severity !== 'critical'
    },
    {
      level: 1,
      delay: 15,  // 15 minutes
      channels: ['email', 'slack'],
      recipients: ['security-lead@company.com']
    },
    {
      level: 2,
      delay: 30,  // 30 minutes
      channels: ['pagerduty', 'sms', 'email'],
      recipients: ['ciso@company.com', '+1234567890'],
      condition: (alert) => alert.severity === 'critical'
    }
  ]
})

// Automatic escalation check (runs every minute)
// If unacknowledged after delay, escalates to next level
```

### Alert Templates

Built-in alert templates with customizable fields:

```typescript
// Template: Brute Force Attack
{
  title: 'Brute Force Attack Detected',
  category: 'security',
  severity: 'critical',
  description: 'Multiple failed login attempts detected from {source}',
  recommended_actions: [
    'Review failed login attempts',
    'Consider blocking the source IP',
    'Reset passwords if credentials compromised',
    'Enable multi-factor authentication'
  ]
}

// Template: Data Breach Indicator
{
  title: 'Potential Data Breach Indicator',
  category: 'security',
  severity: 'critical',
  description: 'Indicators of potential data breach: {indicator}',
  recommended_actions: [
    'Initiate breach response protocol',
    'Isolate affected systems',
    'Preserve evidence and logs',
    'Notify affected parties'
  ]
}

// Template: Compliance Violation
{
  title: 'Compliance Violation Detected',
  category: 'compliance',
  severity: 'high',
  description: 'Framework violation: {framework}',
  recommended_actions: [
    'Review compliance requirements',
    'Implement corrective actions',
    'Document remediation steps',
    'Schedule compliance audit'
  ]
}

// Template: System Degradation
{
  title: 'System Degradation Detected',
  category: 'system',
  severity: 'high',
  description: 'System performance degraded: {metric}',
  recommended_actions: [
    'Check system resources',
    'Review active processes',
    'Investigate resource leaks',
    'Scale resources if needed'
  ]
}
```

### Routing Rules

```typescript
// Route alerts based on custom logic
alertManager.addRoutingRule({
  id: 'route-critical-security',
  name: 'Critical Security Alerts',
  priority: 100,
  condition: (alert) => alert.severity === 'critical' && alert.category === 'security',
  channels: ['pagerduty', 'slack', 'email', 'sms'],
  grouping: false
})

alertManager.addRoutingRule({
  id: 'route-compliance',
  name: 'Compliance Violations',
  priority: 90,
  condition: (alert) => alert.category === 'compliance',
  channels: ['email', 'slack'],
  grouping: true  // Aggregate similar alerts
})

alertManager.addRoutingRule({
  id: 'route-performance',
  name: 'Performance Issues',
  priority: 50,
  condition: (alert) => alert.category === 'performance',
  channels: ['slack'],
  grouping: true
})
```

### Usage Examples

#### Example 1: Create and Send Alert

```typescript
const alert = await alertManager.createAlert({
  severity: 'high',
  title: 'Suspicious Login Activity',
  description: 'Multiple failed login attempts from IP 192.168.1.100',
  source: 'authentication-service',
  category: 'security',
  metrics: {
    failed_attempts: 12,
    time_window_minutes: 5,
    source_ip: '192.168.1.100'
  },
  recommended_actions: [
    'Review authentication logs',
    'Consider blocking the source IP',
    'Contact user to verify activity'
  ]
})

console.log(`Alert created: ${alert.id}`)
console.log(`Notifications sent to: ${alert.notificationsSent} channels`)
```

#### Example 2: Acknowledge Alert

```typescript
await alertManager.acknowledgeAlert('alert-123', 'john.doe@company.com')
console.log('Alert acknowledged')

// Alert won't trigger escalation if acknowledged
```

#### Example 3: Filter Alerts

```typescript
const criticalAlerts = alertManager.getAllAlerts({
  severity: ['critical'],
  category: ['security'],
  status: ['open'],
  startDate: new Date(Date.now() - 24 * 3600000),
  limit: 50
})

console.log(`Open critical security alerts: ${criticalAlerts.length}`)
```

#### Example 4: Get Statistics

```typescript
const stats = alertManager.getAlertStats({
  start: new Date(Date.now() - 7 * 24 * 3600000),  // Last 7 days
  end: new Date()
})

console.log(`
  Total Alerts: ${stats.totalAlerts}
  Critical: ${stats.bySeverity.critical}
  High: ${stats.bySeverity.high}

  Acknowledged: ${stats.acknowledgedCount} (${stats.acknowledgedRate.toFixed(1)}%)
  Resolved: ${stats.resolvedCount} (${stats.resolvedRate.toFixed(1)}%)

  Avg Time to Acknowledge: ${(stats.avgTimeToAcknowledge / 60000).toFixed(1)} minutes
  Avg Time to Resolve: ${(stats.avgTimeToResolve / 3600000).toFixed(1)} hours
`)
```

#### Example 5: Channel Statistics

```typescript
const channelStats = alertManager.getChannelStats()

channelStats.forEach(stat => {
  console.log(`
    Channel: ${stat.name} (${stat.channel})
    Sent: ${stat.sentCount}
    Delivered: ${stat.deliveredCount}
    Failed: ${stat.failedCount}
    Success Rate: ${stat.successRate.toFixed(1)}%
    Avg Delivery Time: ${(stat.averageDeliveryTime / 1000).toFixed(2)}s
  `)
})
```

---

## AnomalyDetector

### Overview

The AnomalyDetector uses statistical analysis and machine learning to identify unusual patterns and behaviors that may indicate security threats.

### Detection Methods

#### 1. Spike Detection

Detects sudden increases in metrics:

```typescript
const anomaly = detector.detectSpike(current, baseline)

// Example: 100 logins in 1 minute vs baseline of 5
// Result: Anomaly with deviation of 4.7 standard deviations
```

**Triggers when**: `(current - baseline.mean) / baseline.stdDev > threshold`

#### 2. Drop Detection

Detects sudden decreases in metrics:

```typescript
const anomaly = detector.detectDrop(current, baseline)

// Example: API response time drops from 500ms to 50ms
// Result: May indicate service instability or attack
```

**Triggers when**: `(baseline.mean - current) / baseline.stdDev > threshold`

#### 3. Pattern Deviation

Detects deviation from expected patterns:

```typescript
const expected = [100, 105, 98, 102, 99, 103]
const actual = [100, 95, 110, 120, 80, 150]

const anomaly = detector.detectPatternDeviation(actual, expected)
```

#### 4. User Behavior Change

Detects unusual user actions:

```typescript
detector.detectLoginAnomalies({
  userId: 'user123',
  loginTime: new Date(),
  location: 'Tokyo',
  ipAddress: '203.0.113.45',
  deviceId: 'device-456',
  success: true,
  userAgent: 'Mozilla/5.0...',
  timestamp: new Date()
})

// Detects: Unusual login time, new location, rapid logins
```

#### 5. API Anomalies

Detects unusual API call patterns:

```typescript
detector.detectAPIAnomalies({
  userId: 'user123',
  endpoint: '/api/users/export',
  method: 'POST',
  timestamp: new Date(),
  responseTime: 5000,  // Very slow
  statusCode: 200,
  dataSize: 524288000,  // 500MB - unusual
  parameters: { limit: 1000000 }
})

// Detects: Slow response time, large export, unusual parameters
```

#### 6. Data Access Anomalies

Detects suspicious data access:

```typescript
detector.detectDataAccessAnomalies({
  userId: 'user123',
  resource: 'customer_database',
  accessType: 'export',
  timestamp: new Date(),
  dataSize: 1073741824,  // 1GB
  queryPattern: 'SELECT * FROM customers',
  sensitivity: 'restricted'
})

// Detects: Large export of sensitive data
```

### Baseline Management

```typescript
// Initialize baselines from historical data
const historicalData = [
  { metric: 'login_attempts', value: 45, timestamp: new Date() },
  { metric: 'login_attempts', value: 52, timestamp: new Date() },
  // ... more data points
]

detector.calculateBaselines(historicalData)

// Or update individual metrics
detector.updateBaseline('api_calls', 100)
detector.updateBaseline('failed_logins', 5)

// Get baseline for metric
const baseline = detector.getBaseline('login_attempts')
console.log(`
  Mean: ${baseline.mean}
  StdDev: ${baseline.standardDeviation}
  95th percentile: ${baseline.p95}
  99th percentile: ${baseline.p99}
  Data points: ${baseline.dataPoints}
`)
```

### Configuration

```typescript
const detector = AnomalyDetector.getInstance({
  sensitivity: 0.85,           // 0-1 (higher = more sensitive)
  baselineWindow: 30,          // days of data for baseline
  minimumDataPoints: 100,      // min points to calculate baseline
  deviationThreshold: 3.0,     // standard deviations
  confidenceThreshold: 0.8,    // 0-1 (min confidence)
  adaptiveLearning: true,      // update baselines continuously
  ignoreList: ['internal_metric_1']
})

// Adjust sensitivity
detector.setSensitivity(0.9)  // More sensitive
```

### Time Series Analysis

```typescript
const data = [100, 105, 98, 102, 99, 150, 95, 103, 108, 101]
const timestamps = data.map((_, i) => new Date(Date.now() - (10 - i) * 60000))

const analysis = detector.analyzeTimeSeries(data, timestamps)

console.log(`
  Trend: ${analysis.trend}  // 'increasing', 'decreasing', or 'stable'
  Seasonality: ${analysis.seasonality}  // true/false
  Outliers: ${analysis.outliers}  // array of indices
  Change Points: ${analysis.changePoints.length}
  Forecast: ${analysis.forecast}
`)
```

### Usage Examples

#### Example 1: Real-Time Detection

```typescript
// Process metrics every second
setInterval(() => {
  const metrics = securityMonitor.getMetrics()

  const anomalies = detector.detect({
    loginAttempts: metrics.totalLoginAttempts,
    failedLogins: metrics.failedLoginAttempts,
    apiCalls: Math.floor(metrics.apiCallRate * 60),
    dataExports: metrics.dataExfiltrationAttempts,
    errorRate: metrics.errorRate,
    responseTime: 250,
    cpuUsage: 45,
    memoryUsage: 60,
    networkTraffic: 1000
  })

  anomalies.forEach(anomaly => {
    console.log(`ANOMALY: ${anomaly.description}`)
  })
}, 1000)
```

#### Example 2: User Behavior Analysis

```typescript
// Train detector with historical user activity
const historicalLogins = [
  // ... array of past login events
]

detector.train(historicalLogins)

// Now detect anomalies for a new login
const newLogin = {
  userId: 'user456',
  loginTime: new Date(),
  location: 'Berlin',
  ipAddress: '198.51.100.50',
  deviceId: 'unknown-device',
  success: true,
  userAgent: 'Mozilla/5.0...',
  timestamp: new Date()
}

const anomalies = detector.detectLoginAnomalies(newLogin)
// Returns anomalies for unusual location, device, time, etc.
```

#### Example 3: Anomaly Reporting

```typescript
// Get anomalies with filters
const anomalies = detector.getAnomalies({
  metricName: 'api_calls',
  severity: 'high',
  startTime: new Date(Date.now() - 24 * 3600000),
  endTime: new Date(),
  userId: 'user123'
})

// Export to CSV
const csv = detector.exportAnomalies('csv')
fs.writeFileSync('anomalies.csv', csv)

// Get statistics
const rate = detector.getAnomalyRate(60)  // per minute in last 60 minutes
console.log(`Anomaly rate: ${rate.toFixed(2)} per minute`)
```

#### Example 4: System Anomaly Detection

```typescript
const systemAnomalies = detector.detectSystemAnomalies({
  timestamp: new Date(),
  cpuUsage: 95,  // Critical
  memoryUsage: 85,
  diskUsage: 92,
  networkIn: 1000,
  networkOut: 500,
  errorCount: 45,  // Spike
  responseTime: 3000,
  throughput: 100
})

systemAnomalies.forEach(anomaly => {
  if (anomaly.severity === 'critical') {
    console.log(`CRITICAL: ${anomaly.description}`)
    console.log(`Recommendations: ${anomaly.recommendations.join(', ')}`)
  }
})
```

---

## IncidentResponder

### Overview

The IncidentResponder automatically detects, classifies, and responds to security incidents with configurable playbooks and forensic data collection.

### Incident Categories

| Category | Examples | Auto-Response |
|----------|----------|---------------|
| BRUTE_FORCE | Multiple failed logins, account lockouts | Yes |
| DATA_BREACH | Large data exports, sensitive access | Yes |
| UNAUTHORIZED_ACCESS | Access denied to restricted resources | Yes |
| MALWARE | Suspected malicious code, infected systems | Yes |
| DDOS | Excessive requests, traffic spike | Yes |
| INSIDER_THREAT | Unusual data access, after-hours activity | Yes |
| CONFIGURATION_ERROR | Misconfigured security settings | No |
| COMPLIANCE_VIOLATION | Policy violations, audit failures | No |

### Response Actions

10 automated response actions available:

1. **BLOCK_IP**: Block source IP for duration
2. **LOCK_ACCOUNT**: Lock user account
3. **TERMINATE_SESSION**: End active sessions
4. **REVOKE_TOKEN**: Revoke authentication tokens
5. **DISABLE_API_KEY**: Disable API keys
6. **QUARANTINE_RESOURCE**: Isolate affected resources
7. **ALERT_SECURITY_TEAM**: Send alert notifications
8. **CAPTURE_FORENSICS**: Collect forensic data
9. **ISOLATE_SYSTEM**: Disconnect system from network
10. **TRIGGER_BACKUP**: Create emergency backup

### Built-In Playbooks

#### 1. Brute Force Response

```
Step 1: Block IP Address (automated)
  - Timeout: 30s
  - Rollback: Yes

Step 2: Lock User Account (automated)
  - Timeout: 30s
  - Rollback: Yes

Step 3: Review Logs (manual)
  - Check authentication logs for breach indicators
  - Rollback: No

Step 4: Notify User (automated)
  - Send notification of unauthorized access attempt
  - Timeout: 60s
  - Rollback: No
```

#### 2. Data Breach Response

```
Step 1: Isolate Systems (automated)
  - Disconnect affected systems
  - Timeout: 60s
  - Rollback: Yes

Step 2: Capture Forensics (automated)
  - Collect logs, memory dumps, network traffic
  - Timeout: 120s
  - Rollback: No

Step 3: Trigger Backup (automated)
  - Create emergency backups
  - Timeout: 300s
  - Rollback: No

Step 4: Notify Stakeholders (manual)
  - Contact affected parties
  - Rollback: No
```

#### 3. Unauthorized Access Response

```
Step 1: Terminate Sessions (automated)
Step 2: Lock Account (automated)
Step 3: Reset Credentials (manual)
Step 4: Review Access Logs (manual)
```

#### 4. Malware Response

```
Step 1: Isolate System (automated)
Step 2: Capture Memory Dump (automated)
Step 3: Scan for Malware (manual)
Step 4: Trigger Backup (automated)
```

### Detection Rules

```typescript
// 8 built-in detection rules
const rules = responder.getDetectionRules()

rules.forEach(rule => {
  console.log(`
    Rule: ${rule.name}
    Category: ${rule.category}
    Severity: ${rule.severity}
    Auto-Response: ${rule.automaticResponse}
    Enabled: ${rule.enabled}
  `)
})
```

### Usage Examples

#### Example 1: Create and Respond to Incident

```typescript
const responder = new IncidentResponder()

// Create incident
const incident = responder.createIncident({
  title: 'Suspicious Data Export',
  description: 'Large data export from customer_db detected',
  severity: 'critical',
  category: IncidentCategory.DATA_BREACH,
  affectedResources: ['customer_db', 'backup_system'],
  affectedUsers: ['user123', 'user456'],
  detectionMethod: 'anomaly_detection'
})

console.log(`Incident created: ${incident.id}`)
console.log(`Status: ${incident.status}`)

// Incident automatically triggers response actions
responder.on('incident:responded', ({ incident, actions }) => {
  console.log(`Responded with ${actions.length} actions`)
  actions.forEach(action => {
    console.log(`  - ${action.type}: ${action.result}`)
  })
})
```

#### Example 2: Custom Detection Rule

```typescript
responder.addDetectionRule({
  id: 'rule-custom-api-abuse',
  name: 'Custom API Abuse Detection',
  description: 'Detects unusual API usage patterns',
  category: IncidentCategory.DDOS,
  severity: 'high',
  conditions: [
    {
      field: 'requestCount',
      operator: 'greater_than',
      value: 1000,
      timeWindow: 60000  // 1 minute
    },
    {
      field: 'uniqueEndpoints',
      operator: 'less_than',
      value: 5
    }
  ],
  automaticResponse: true,
  responseActions: [
    ResponseActionType.BLOCK_IP,
    ResponseActionType.ALERT_SECURITY_TEAM
  ],
  notificationChannels: ['slack', 'email'],
  enabled: true
})
```

#### Example 3: Custom Response Playbook

```typescript
responder.addPlaybook({
  id: 'playbook-custom-ransomware',
  name: 'Ransomware Response Playbook',
  category: IncidentCategory.MALWARE,
  estimatedDuration: 1200000,  // 20 minutes
  requiredApprovals: ['security_manager', 'ciso'],
  steps: [
    {
      order: 1,
      action: 'Isolate System',
      description: 'Disconnect from network immediately',
      automated: true,
      timeout: 30000,
      rollbackPossible: true
    },
    {
      order: 2,
      action: 'Capture System State',
      description: 'Dump memory and file system',
      automated: true,
      timeout: 300000,
      rollbackPossible: false
    },
    {
      order: 3,
      action: 'Suspend All Processes',
      description: 'Stop all running services',
      automated: false,
      timeout: 60000,
      rollbackPossible: true
    },
    {
      order: 4,
      action: 'Restore from Backup',
      description: 'Restore system from clean backup',
      automated: false,
      timeout: 600000,
      rollbackPossible: false
    }
  ]
})
```

#### Example 4: Incident Monitoring

```typescript
responder.on('incident:created', (incident) => {
  console.log(`Incident: ${incident.title} (${incident.severity})`)
  console.log(`Category: ${incident.category}`)
  console.log(`Affected: ${incident.affectedUsers.length} users, ${incident.affectedResources.length} resources`)
})

responder.on('incident:status-changed', ({ incident, status }) => {
  console.log(`Status changed to: ${status}`)
})

responder.on('incident:escalated', ({ incident }) => {
  console.log(`Incident escalated after timeout`)
})

responder.on('incident:resolved', ({ incident, resolution }) => {
  console.log(`Incident resolved: ${resolution}`)
})
```

#### Example 5: Forensic Analysis

```typescript
const incident = responder.getIncident('incident-123')

// Generate post-mortem
const postMortem = await responder.generatePostMortem('incident-123')

console.log(`
  Summary: ${postMortem.summary}
  Root Cause: ${postMortem.rootCause}
  Duration: ${(postMortem.impactAnalysis.duration / 60000).toFixed(1)} minutes
  Affected Users: ${postMortem.impactAnalysis.affectedUsers}
  Data Compromised: ${postMortem.impactAnalysis.dataCompromised}
  Response Effectiveness: ${postMortem.responseEffectiveness.toFixed(1)}/100

  Lessons Learned:
  ${postMortem.lessonsLearned.map(l => `  - ${l}`).join('\n')}

  Recommendations:
  ${postMortem.recommendations.map(r => `  - ${r}`).join('\n')}
`)

// Export forensic data
const forensics = await responder.captureForensics(incident)
console.log(`Forensic data collected: ${forensics.logs.length} log entries, ${forensics.networkTraffic.length} network packets`)
```

#### Example 6: Statistics and KPIs

```typescript
const stats = responder.getIncidentStats({
  startDate: new Date(Date.now() - 30 * 24 * 3600000),  // Last 30 days
  endDate: new Date()
})

console.log(`
  Total Incidents: ${stats.totalIncidents}

  By Category:
  ${Object.entries(stats.byCategory).map(([cat, count]) => `    ${cat}: ${count}`).join('\n')}

  By Severity:
  ${Object.entries(stats.bySeverity).map(([sev, count]) => `    ${sev}: ${count}`).join('\n')}

  By Status:
  ${Object.entries(stats.byStatus).map(([status, count]) => `    ${status}: ${count}`).join('\n')}

  Performance:
  - Avg Resolution Time: ${(stats.avgResolutionTime / 3600000).toFixed(1)} hours
  - Automated Response Rate: ${stats.automatedResponseRate.toFixed(1)}%
  - MTTD: ${responder.getMTTD()}ms
  - MTTR: ${(responder.getMTTR() / 1000).toFixed(1)}s
  - Automation Rate: ${responder.getAutomationRate().toFixed(1)}%
`)
```

---

## Integration Examples

### Express.js Backend Integration

```typescript
import express from 'express'
import { securityMonitor } from '@/monitoring/SecurityMonitor'
import { alertManager } from '@/monitoring/AlertManager'
import { IncidentResponder } from '@/monitoring/IncidentResponder'

const app = express()
const responder = new IncidentResponder()

// Middleware to track security events
app.use((req, res, next) => {
  const startTime = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - startTime

    // Track API metrics
    if (res.statusCode >= 400) {
      securityMonitor.processSecurityEvent({
        timestamp: new Date(),
        category: 'api_error',
        severity: res.statusCode >= 500 ? 'high' : 'medium',
        description: `API error: ${req.method} ${req.path} -> ${res.statusCode}`,
        ipAddress: req.ip
      })
    }
  })

  next()
})

// Security monitoring routes
app.get('/api/security/dashboard', (req, res) => {
  const dashboard = securityMonitor.getDashboardData()
  res.json(dashboard)
})

app.get('/api/security/metrics', (req, res) => {
  const metrics = securityMonitor.getMetrics()
  res.json(metrics)
})

app.get('/api/security/alerts', (req, res) => {
  const { severity, category, status } = req.query

  const alerts = alertManager.getAllAlerts({
    severity: severity ? [severity] : undefined,
    category: category ? [category] : undefined,
    status: status ? [status] : undefined
  })

  res.json(alerts)
})

app.post('/api/security/alerts/:id/acknowledge', async (req, res) => {
  const { id } = req.params
  const { userId } = req.body

  try {
    await alertManager.acknowledgeAlert(id, userId)
    res.json({ success: true })
  } catch (error) {
    res.status(400).json({ error: String(error) })
  }
})

app.get('/api/security/incidents', (req, res) => {
  const { status, severity } = req.query

  const incidents = responder.getAllIncidents({
    status: status as any,
    severity: severity as any
  })

  res.json(incidents)
})

app.post('/api/security/incidents/:id/response', async (req, res) => {
  const { id } = req.params

  try {
    const incident = responder.getIncident(id)
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' })
    }

    const actions = await responder.respondToIncident(incident)
    res.json({ actions })
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

app.listen(3000, () => {
  console.log('Security monitoring API started on port 3000')
  securityMonitor.start()
})
```

### WebSocket Real-Time Updates

```typescript
import { Server as SocketIOServer } from 'socket.io'
import { createServer } from 'http'

const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' }
})

// Real-time metric streaming
securityMonitor.on('metrics-updated', (metrics) => {
  io.emit('metrics:update', {
    timestamp: new Date(),
    metrics
  })
})

// Real-time alert notifications
securityMonitor.on('alert', (alert) => {
  io.emit('alert:new', alert)
})

// Real-time anomaly detection
detector.on('anomaly', (anomaly) => {
  io.emit('anomaly:detected', anomaly)
})

// Real-time incident response
responder.on('incident:created', (incident) => {
  io.emit('incident:new', incident)
})

responder.on('incident:status-changed', (data) => {
  io.emit('incident:updated', data)
})

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  // Send current state on connect
  socket.emit('metrics:current', securityMonitor.getMetrics())
  socket.emit('alerts:current', alertManager.getAllAlerts().slice(-20))

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
  })
})

httpServer.listen(3000)
```

### React Dashboard Component

```typescript
import React, { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const SecurityDashboard = () => {
  const [metrics, setMetrics] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [anomalies, setAnomalies] = useState([])
  const [trendData, setTrendData] = useState([])
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    // Connect to WebSocket server
    const newSocket = io('http://localhost:3000')
    setSocket(newSocket)

    // Listen for metric updates
    newSocket.on('metrics:update', (data) => {
      setMetrics(data)
    })

    newSocket.on('metrics:current', (data) => {
      setMetrics(data)
    })

    // Listen for alerts
    newSocket.on('alert:new', (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 20))
    })

    newSocket.on('alerts:current', (data) => {
      setAlerts(data)
    })

    // Listen for anomalies
    newSocket.on('anomaly:detected', (anomaly) => {
      setAnomalies(prev => [anomaly, ...prev].slice(0, 50))
    })

    return () => newSocket.disconnect()
  }, [])

  if (!metrics) return <div>Loading...</div>

  return (
    <div className='dashboard'>
      {/* Key Metrics */}
      <div className='metrics-grid'>
        <MetricCard
          title='Total Events'
          value={metrics.totalSecurityEvents}
          trend={metrics.totalSecurityEvents > 1000 ? 'up' : 'stable'}
        />
        <MetricCard
          title='Critical Events'
          value={metrics.criticalEvents}
          color={metrics.criticalEvents > 5 ? 'red' : 'green'}
        />
        <MetricCard
          title='Threat Score'
          value={metrics.averageThreatScore.toFixed(1)}
          unit='/100'
        />
        <MetricCard
          title='Compliance'
          value={metrics.complianceScore.toFixed(1)}
          unit='%'
        />
      </div>

      {/* Charts */}
      <div className='charts-grid'>
        {/* Trend Chart */}
        <ResponsiveContainer width='100%' height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='time' />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type='monotone' dataKey='events' stroke='#8884d8' />
            <Line type='monotone' dataKey='threats' stroke='#ff7300' />
          </LineChart>
        </ResponsiveContainer>

        {/* Severity Distribution */}
        <ResponsiveContainer width='100%' height={300}>
          <PieChart>
            <Pie
              data={[
                { name: 'Critical', value: metrics.criticalEvents },
                { name: 'High', value: metrics.highSeverityEvents },
                { name: 'Medium', value: metrics.mediumSeverityEvents },
                { name: 'Low', value: metrics.lowSeverityEvents }
              ]}
              cx='50%'
              cy='50%'
              labelLine={false}
            />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Alerts */}
      <div className='alerts-panel'>
        <h3>Recent Alerts ({alerts.length})</h3>
        {alerts.map(alert => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
      </div>

      {/* Anomalies */}
      <div className='anomalies-panel'>
        <h3>Detected Anomalies ({anomalies.length})</h3>
        {anomalies.slice(0, 10).map(anomaly => (
          <AnomalyItem key={anomaly.id} anomaly={anomaly} />
        ))}
      </div>
    </div>
  )
}
```

---

## Dashboard Setup

### Self-Hosted Dashboard

```html
<!DOCTYPE html>
<html>
<head>
  <title>Security Monitoring Dashboard</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI'; background: #0f0f0f; color: #fff; }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .metric-card { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 20px; }
    .metric-value { font-size: 32px; font-weight: bold; margin: 10px 0; }
    .metric-label { color: #888; font-size: 14px; }
    .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    .status.healthy { background: #28a745; }
    .status.warning { background: #ffc107; }
    .status.critical { background: #dc3545; }
    .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .chart-container { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 20px; }
    .alerts-list { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 20px; }
    .alert-item { padding: 12px; margin-bottom: 10px; border-left: 4px solid; background: #222; border-radius: 4px; }
    .alert-item.critical { border-color: #dc3545; }
    .alert-item.high { border-color: #ff7300; }
    .alert-item.medium { border-color: #ffc107; }
    .alert-item.low { border-color: #28a745; }
  </style>
</head>
<body>
  <div class='container'>
    <div class='header'>
      <h1>Security Monitoring Dashboard</h1>
      <div>
        <span class='status healthy' id='status'>HEALTHY</span>
        <span id='timestamp' style='margin-left: 20px; color: #888; font-size: 14px;'></span>
      </div>
    </div>

    <div class='metrics-grid'>
      <div class='metric-card'>
        <div class='metric-label'>Total Security Events</div>
        <div class='metric-value' id='totalEvents'>0</div>
      </div>
      <div class='metric-card'>
        <div class='metric-label'>Critical Events</div>
        <div class='metric-value' id='criticalEvents' style='color: #dc3545;'>0</div>
      </div>
      <div class='metric-card'>
        <div class='metric-label'>Active Threats</div>
        <div class='metric-value' id='activeThreats' style='color: #ff7300;'>0</div>
      </div>
      <div class='metric-card'>
        <div class='metric-label'>Compliance Score</div>
        <div class='metric-value' id='complianceScore'>0%</div>
      </div>
    </div>

    <div class='charts-grid'>
      <div class='chart-container'>
        <canvas id='eventsChart'></canvas>
      </div>
      <div class='chart-container'>
        <canvas id='threatChart'></canvas>
      </div>
    </div>

    <div class='alerts-list'>
      <h2 style='margin-bottom: 15px;'>Recent Alerts</h2>
      <div id='alertsList'></div>
    </div>
  </div>

  <script>
    const socket = io('http://localhost:3000')

    let eventsChart, threatChart

    socket.on('connect', () => {
      console.log('Connected to monitoring server')
    })

    socket.on('metrics:update', (data) => {
      updateMetrics(data)
      updateTimestamp()
    })

    socket.on('alert:new', (alert) => {
      addAlert(alert)
    })

    function updateMetrics(metrics) {
      document.getElementById('totalEvents').textContent = metrics.totalSecurityEvents
      document.getElementById('criticalEvents').textContent = metrics.criticalEvents
      document.getElementById('activeThreats').textContent = metrics.activeThreats
      document.getElementById('complianceScore').textContent =
        Math.round(metrics.complianceScore) + '%'

      // Determine status
      let status = 'HEALTHY'
      let statusEl = document.getElementById('status')
      if (metrics.criticalEvents > 5) {
        status = 'CRITICAL'
        statusEl.className = 'status critical'
      } else if (metrics.highSeverityEvents > 3 || metrics.errorRate > 5) {
        status = 'WARNING'
        statusEl.className = 'status warning'
      } else {
        statusEl.className = 'status healthy'
      }
      statusEl.textContent = status
    }

    function addAlert(alert) {
      const alertsList = document.getElementById('alertsList')
      const alertEl = document.createElement('div')
      alertEl.className = `alert-item ${alert.severity}`
      alertEl.innerHTML = `
        <strong>${alert.title}</strong>
        <div style='color: #aaa; font-size: 12px; margin-top: 5px;'>${alert.description}</div>
        <div style='color: #888; font-size: 11px; margin-top: 5px;'>${new Date(alert.timestamp).toLocaleTimeString()}</div>
      `
      alertsList.insertBefore(alertEl, alertsList.firstChild)

      // Keep only last 20 alerts
      while (alertsList.children.length > 20) {
        alertsList.removeChild(alertsList.lastChild)
      }
    }

    function updateTimestamp() {
      document.getElementById('timestamp').textContent =
        new Date().toLocaleTimeString()
    }

    setInterval(updateTimestamp, 1000)
  </script>
</body>
</html>
```

---

## Alert Configuration

### Severity Guidelines

**Low**: Minor issues, monitoring purposes
- Example: Configuration change, test alert, low error rate
- Channels: Email
- Response: Logging only

**Medium**: Noteworthy, requires investigation
- Example: Unusual activity, compliance warning
- Channels: Email, Slack
- Response: Alert team, investigate

**High**: Significant threat, immediate attention
- Example: Brute force attempt, high error rate
- Channels: Email, Slack, Teams
- Response: Alert, investigate, possible action

**Critical**: Severe incident, immediate action required
- Example: Data breach, privilege escalation, system down
- Channels: All (Email, Slack, Teams, PagerDuty, SMS)
- Response: Immediate action, incident response

### Quiet Hours

```typescript
// Set quiet hours (don't send alerts for low/medium severity)
alertManager.businessHours = { start: 9, end: 18 }
alertManager.quietHours = true

// Critical alerts still sent during quiet hours
```

### Rate Limiting

```typescript
// Configure per-channel rate limits
const channel = {
  type: 'email',
  name: 'security-email',
  rateLimit: {
    maxPerHour: 100,      // Max 100 alerts/hour
    maxPerDay: 500        // Max 500 alerts/day
  }
}

// Rate limit prevents alert fatigue
// Oldest alerts dropped when limit exceeded
```

### Alert Aggregation

```typescript
// Group similar alerts together
// Aggregates alerts within 10-minute window
// Reduces noise from repeated issues

// Example: 50 "High API Error Rate" alerts -> 1 aggregated alert with count
```

---

## Playbook Development

### Playbook Structure

```typescript
interface ResponsePlaybook {
  id: string                    // Unique identifier
  name: string                  // Display name
  category: IncidentCategory    // Which incidents it handles
  estimatedDuration: number     // Expected execution time (ms)
  requiredApprovals: string[]   // Who must approve execution
  steps: PlaybookStep[]         // Ordered execution steps
}

interface PlaybookStep {
  order: number                 // Execution order
  action: string                // Action name
  description: string           // What the step does
  automated: boolean            // Auto-execute or manual
  timeout?: number              // Max execution time (ms)
  rollbackPossible: boolean     // Can be rolled back
}
```

### Custom Playbook Example

```typescript
// Security Team Emergency Response Playbook
responder.addPlaybook({
  id: 'playbook-emergency',
  name: 'Emergency Security Response',
  category: IncidentCategory.DATA_BREACH,
  estimatedDuration: 1800000,  // 30 minutes
  requiredApprovals: ['ciso', 'security_manager'],
  steps: [
    {
      order: 1,
      action: 'Emergency Shutdown',
      description: 'Shut down all external API access',
      automated: false,  // Requires manual confirmation
      timeout: 300000,   // 5 minutes to approve/execute
      rollbackPossible: true
    },
    {
      order: 2,
      action: 'Capture System State',
      description: 'Preserve all logs and system state for forensics',
      automated: true,
      timeout: 600000,   // 10 minutes
      rollbackPossible: false
    },
    {
      order: 3,
      action: 'Isolate Database',
      description: 'Disconnect database from network',
      automated: false,
      timeout: 120000,   // 2 minutes
      rollbackPossible: true
    },
    {
      order: 4,
      action: 'Notify Legal',
      description: 'Send notification to legal team',
      automated: true,
      timeout: 60000,    // 1 minute
      rollbackPossible: false
    },
    {
      order: 5,
      action: 'Notification Campaign',
      description: 'Notify affected users and stakeholders',
      automated: false,
      timeout: 3600000,  // 1 hour
      rollbackPossible: false
    }
  ]
})
```

### Testing Playbooks

```typescript
// Test playbook without actually executing actions
const testIncident = responder.createIncident({
  title: 'Test Incident',
  description: 'Testing playbook execution',
  severity: 'high',
  category: IncidentCategory.DATA_BREACH,
  affectedResources: ['test_db'],
  affectedUsers: []
})

// Enable test mode - simulates actions without executing
responder.on('action:executing', ({ action }) => {
  console.log(`[TEST] Would execute: ${action.type}`)
})

// Run playbook
const playbook = responder.getPlaybook(IncidentCategory.DATA_BREACH)
if (playbook) {
  await responder.executePlaybook(playbook.id, testIncident)
}
```

---

## Best Practices

### Monitoring Best Practices

1. **Know Your Baselines**
   - Establish normal operating parameters
   - Review baselines quarterly
   - Account for seasonal variations

2. **Monitor the Right Metrics**
   - Focus on business impact metrics
   - Don't monitor everything
   - 3-5 key metrics per system

3. **Alert on Changes**
   - Alert on significant deviations (>2 StdDev)
   - Not on absolute values
   - Use trend-based alerting

4. **Plan for Scale**
   - Current: 1000+ events/second
   - Archive old data (>30 days)
   - Use time-series database for long-term storage

### Alert Best Practices

1. **Make Alerts Actionable**
   - Include recommended actions
   - Provide context
   - Link to documentation

2. **Prevent Alert Fatigue**
   - Use aggregation for similar alerts
   - Set appropriate thresholds
   - Implement quiet hours for low severity

3. **Escalation Strategy**
   - Level 1: Notification only
   - Level 2: Escalate to team (15 minutes)
   - Level 3: Escalate to management (30 minutes)
   - Level 4: Executive escalation (60 minutes)

4. **Tracking and Analysis**
   - Track acknowledgment time
   - Measure resolution time (MTTR)
   - Review alert effectiveness quarterly

### Incident Response Best Practices

1. **Response Time Targets (SLAs)**
   - P1 (Critical): 15 minutes
   - P2 (High): 1 hour
   - P3 (Medium): 4 hours
   - P4 (Low): 24 hours

2. **Documentation**
   - Log all actions
   - Record decisions
   - Preserve evidence
   - Complete post-mortems

3. **Communication**
   - Clear incident commander
   - Regular status updates
   - Stakeholder notifications
   - Post-incident review

4. **Automation**
   - Automate obvious responses
   - Keep playbooks updated
   - Test playbooks regularly
   - Train team on procedures

### Anomaly Detection Best Practices

1. **Baseline Management**
   - Collect at least 100 data points
   - Review baselines monthly
   - Account for seasonal patterns
   - Use adaptive learning

2. **Tuning Sensitivity**
   - Start conservative (lower sensitivity)
   - Gradually increase sensitivity
   - Monitor false positive rate
   - Adjust per metric

3. **User Profile Maintenance**
   - Update profiles when roles change
   - Review profiles quarterly
   - Include new locations/devices
   - Archive old profiles

---

## Troubleshooting

### High False Positive Rate

**Symptoms**: Too many alerts, most are not real issues

**Solutions**:
```typescript
// 1. Lower sensitivity
detector.setSensitivity(0.7)  // Was 0.85

// 2. Increase minimum data points
detector.setConfig({
  minimumDataPoints: 200  // Was 100
})

// 3. Adjust deviation threshold
detector.setConfig({
  deviationThreshold: 3.5  // Was 3.0
})

// 4. Review baselines
const baseline = detector.getBaseline('metric_name')
if (baseline.dataPoints < 100) {
  console.log('Baseline needs more data')
}
```

### Missed Critical Events

**Symptoms**: Security incidents not detected

**Solutions**:
```typescript
// 1. Increase sensitivity
detector.setSensitivity(0.95)

// 2. Lower deviation threshold
detector.setConfig({
  deviationThreshold: 2.5  // More sensitive
})

// 3. Add detection rules
responder.addDetectionRule({
  id: 'rule-custom',
  name: 'Custom Detection',
  category: IncidentCategory.UNAUTHORIZED_ACCESS,
  severity: 'high',
  conditions: [
    {
      field: 'accessDenied',
      operator: 'equals',
      value: true
    }
  ],
  automaticResponse: true,
  responseActions: [ResponseActionType.ALERT_SECURITY_TEAM],
  enabled: true
})

// 4. Review thresholds
const rules = responder.getDetectionRules()
rules.forEach(rule => {
  console.log(`${rule.name}: ${rule.conditions}`)
})
```

### Performance Issues

**Symptoms**: Slow dashboard, delayed alerts

**Solutions**:
```typescript
// 1. Check event buffer size
// Reduce if > 100 items (increase processing frequency)

// 2. Archive old data
const cutoff = Date.now() - 7 * 24 * 3600000  // 7 days
// Delete incidents before cutoff

// 3. Optimize rule evaluation
// Disable rules that aren't needed
alertManager.rules.forEach(rule => {
  if (!rule.important) {
    rule.enabled = false
  }
})

// 4. Use time-series database for historical data
// SQLite -> InfluxDB or TimescaleDB for large deployments
```

### Missing Context in Alerts

**Symptoms**: Alerts lack information needed to respond

**Solutions**:
```typescript
// 1. Add context to alerts
await alertManager.createAlert({
  title: 'Brute Force Attack',
  description: 'Multiple failed logins',
  context: {
    user: 'john.doe',
    ip: '192.168.1.100',
    failedAttempts: 12,
    timeWindow: '5 minutes',
    lastAttempt: new Date().toISOString()
  },
  metrics: {
    failureRate: 85,
    attemptRate: 2.4  // per second
  },
  recommended_actions: [
    'Block IP: 192.168.1.100',
    'Lock account: john.doe',
    'Review last 10 failed login attempts',
    'Check for credential compromise'
  ]
})

// 2. Include metrics in alert
// 3. Provide specific recommendations
// 4. Add documentation link
```

---

## API Reference

### SecurityMonitor API

```typescript
class SecurityMonitor {
  // Initialization
  static getInstance(): SecurityMonitor
  start(): void
  stop(): void

  // Event Processing
  processSecurityEvent(event: SecurityEvent): void
  processAuditLog(log: AuditLogEntry): void

  // Metrics
  getMetrics(): SecurityMetrics
  getHistoricalMetrics(duration: number): SecurityMetrics[]
  calculateTrends(field: string, duration: number): TrendData
  identifyAnomalies(): Anomaly[]

  // Rules
  addRule(rule: MonitoringRule): void
  removeRule(ruleId: string): void
  enableRule(ruleId: string): void
  disableRule(ruleId: string): void
  getRules(): MonitoringRule[]
  evaluateRules(): Alert[]

  // Alerts
  getAlerts(): Alert[]
  acknowledgeAlert(alertId: string, userId: string): void

  // Dashboard
  getDashboardData(): DashboardData
  getSystemHealth(): HealthStatus
  checkCompliance(): ComplianceStatus
  getTopAttackVectors(): AttackVector[]

  // Component Health
  updateComponentHealth(component: string, status: 'up' | 'down' | 'degraded', latency?: number): void

  // Utilities
  clearAlerts(): void
  resetMetrics(): void
  exportMetrics(): string

  // Events
  on(event: string, listener: Function): void
}
```

### AlertManager API

```typescript
class AlertManager {
  // Alert Management
  static getInstance(): AlertManager
  async createAlert(data: Partial<Alert>): Promise<Alert>
  getAlert(id: string): Alert | undefined
  getAllAlerts(filter?: AlertFilter): Alert[]
  async acknowledgeAlert(id: string, userId: string): Promise<void>
  async resolveAlert(id: string, userId: string): Promise<void>
  async muteAlert(id: string, durationMs: number): Promise<void>

  // Channel Management
  addChannel(channel: NotificationChannel): void
  removeChannel(name: string): void
  enableChannel(name: string): void
  disableChannel(name: string): void
  async testChannel(name: string): Promise<boolean>

  // Notification
  async sendAlert(alert: Alert): Promise<void>
  routeAlert(alert: Alert): string[]

  // Escalation
  addEscalationPolicy(policy: EscalationPolicy): void
  async escalateAlert(alertId: string): Promise<void>
  async checkEscalations(): Promise<void>

  // Routing
  addRoutingRule(rule: RoutingRule): void

  // Statistics
  getAlertStats(dateRange: TimeRange): AlertStatistics
  getChannelStats(): ChannelStatistics[]
  getAcknowledgmentRate(): number
  getMTTR(): number
}
```

### AnomalyDetector API

```typescript
class AnomalyDetector {
  // Initialization
  static getInstance(config?: Partial<DetectionConfig>): AnomalyDetector

  // Detection
  detect(metrics: SecurityMetrics): Anomaly[]
  detectForUser(userId: string, timeWindow: number): Anomaly[]
  detectForResource(resource: string, timeWindow: number): Anomaly[]
  detectSpike(current: number, baseline: Baseline): Anomaly | null
  detectDrop(current: number, baseline: Baseline): Anomaly | null
  detectLoginAnomalies(user: UserActivity): Anomaly[]
  detectAPIAnomalies(metrics: APIMetrics): Anomaly[]
  detectDataAccessAnomalies(access: DataAccess): Anomaly[]
  detectSystemAnomalies(metrics: SystemMetrics): Anomaly[]
  detectPatternDeviation(pattern: number[], expected: number[]): Anomaly | null

  // Baselines
  updateBaseline(metric: string, value: number): void
  getBaseline(metric: string): Baseline | null
  calculateBaselines(data: MetricData[]): void
  resetBaseline(metric: string): void

  // Time Series
  analyzeTimeSeries(data: number[], timestamps: Date[]): TimeSeriesAnalysis
  predict(metric: string, horizon: number): number[]

  // Configuration
  setConfig(config: Partial<DetectionConfig>): void
  setSensitivity(sensitivity: number): void
  addToIgnoreList(metric: string): void

  // Reporting
  getAnomalies(filter?: AnomalyFilter): Anomaly[]
  getAnomalyRate(timeWindow: number): number
  getAnomaliesByType(type: AnomalyType): Anomaly[]
  getAnomaliesBySeverity(severity: string): Anomaly[]
  exportAnomalies(format: 'json' | 'csv'): string

  // Training
  train(historicalData: MetricData[]): void
  calculateConfidence(anomaly: Anomaly): number
}
```

### IncidentResponder API

```typescript
class IncidentResponder {
  // Incident Management
  createIncident(data: Partial<Incident>): Incident
  getIncident(id: string): Incident | undefined
  getAllIncidents(filter?: IncidentFilter): Incident[]
  async updateIncidentStatus(id: string, status: IncidentStatus): Promise<void>
  async assignIncident(id: string, userId: string): Promise<void>
  async resolveIncident(id: string, resolution: string): Promise<void>
  closeIncident(id: string): void

  // Detection & Response
  detectIncidents(events: SecurityEvent[]): Incident[]
  evaluateDetectionRules(event: SecurityEvent): Partial<Incident> | null
  async respondToIncident(incident: Incident): Promise<ResponseAction[]>
  async executeAction(action: ResponseAction, incident: Incident): Promise<void>

  // Detection Rules
  addDetectionRule(rule: DetectionRule): void
  removeDetectionRule(ruleId: string): void
  getDetectionRules(): DetectionRule[]

  // Response Actions
  async blockIP(ipAddress: string, duration: number): Promise<void>
  async lockAccount(userId: string, reason: string): Promise<void>
  async unlockAccount(userId: string): Promise<void>
  async terminateSession(sessionId: string): Promise<void>
  async revokeToken(token: string): Promise<void>
  async disableAPIKey(apiKey: string): Promise<void>
  async captureForensics(incident: Incident): Promise<ForensicData>
  async alertSecurityTeam(incident: Incident): Promise<void>

  // Playbooks
  addPlaybook(playbook: ResponsePlaybook): void
  getPlaybook(category: IncidentCategory): ResponsePlaybook | undefined
  async executePlaybook(playbookId: string, incident: Incident): Promise<void>
  getPlaybooks(): ResponsePlaybook[]

  // Timeline & Evidence
  addTimelineEvent(incidentId: string, event: IncidentEvent): void
  getTimeline(incidentId: string): IncidentEvent[]
  async gatherEvidence(incident: Incident): Promise<Evidence[]>

  // Analysis
  async generatePostMortem(incidentId: string): Promise<PostMortem>
  getIncidentStats(dateRange: DateRange): IncidentStatistics
  getMTTD(): number  // Mean Time To Detect
  getMTTR(): number  // Mean Time To Respond
  getMTTRe(): number  // Mean Time To Resolve
  getAutomationRate(): number

  // Blocking & Locking
  isIPBlocked(ipAddress: string): boolean
  isAccountLocked(userId: string): boolean
  isTokenRevoked(token: string): boolean
  isAPIKeyDisabled(apiKey: string): boolean

  // Events
  on(event: string, listener: Function): void
}
```

---

## Conclusion

The Security Monitoring & Alerting system provides enterprise-grade real-time security monitoring with:

- Real-time metrics and alerting
- Sophisticated multi-channel notification routing
- ML-powered anomaly detection
- Automated incident response with playbooks
- Comprehensive forensics and post-mortems
- Extensible architecture for custom rules and actions

For production deployments, ensure proper configuration of all notification channels, establishment of baseline metrics, and testing of response playbooks before enabling automated responses.

---

**Last Updated**: November 2024
**Version**: 1.0.0
**Author**: Security Engineering Team

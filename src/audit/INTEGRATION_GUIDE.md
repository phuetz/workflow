# Security Event Logger - Integration Guide

## Week 7 Phase 2: Audit Logging & Compliance

This guide covers integrating the `SecurityEventLogger` into your application for comprehensive security event tracking and threat detection.

## Quick Start

### 1. Import the Logger

```typescript
import { securityEventLogger, SecuritySeverity, SecurityCategory } from '@/audit/SecurityEventLogger';
```

### 2. Set Up Event Listeners

```typescript
// Listen for all logged events
securityEventLogger.on('event:logged', ({ event }) => {
  // Could send to external logging service
  console.log(`Security event: ${event.eventType}`);
});

// Listen for alerts
securityEventLogger.on('alert:triggered', ({ event, alertLevel }) => {
  // Send notifications to Slack, PagerDuty, etc.
  notificationService.send({
    channel: 'security-alerts',
    level: alertLevel,
    message: event.description
  });
});
```

### 3. Integrate with Authentication Service

```typescript
import { securityEventLogger } from '@/audit/SecurityEventLogger';

export class AuthenticationService {
  async authenticate(username: string, password: string, context: any): Promise<User | null> {
    try {
      const user = await this.validateCredentials(username, password);

      if (!user) {
        // Log failed authentication
        await securityEventLogger.logFailedAuth(
          username,
          'Invalid credentials',
          {
            ipAddress: context.ip,
            userAgent: context.userAgent,
            country: context.geoip?.country
          }
        );
        return null;
      }

      // Log successful login
      await securityEventLogger.logEvent({
        severity: SecuritySeverity.INFO,
        category: SecurityCategory.AUTH,
        eventType: 'auth.success',
        description: `User ${username} authenticated successfully`,
        userId: user.id,
        ipAddress: context.ip,
        userAgent: context.userAgent
      });

      return user;
    } catch (error) {
      // Log error
      await securityEventLogger.logEvent({
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.AUTH,
        eventType: 'auth.error',
        description: `Authentication error: ${error.message}`,
        userId: username,
        ipAddress: context.ip
      });
      return null;
    }
  }
}
```

## Backend Integration

### Express Middleware

```typescript
import { securityEventLogger, SecuritySeverity } from '@/audit/SecurityEventLogger';
import { Request, Response, NextFunction } from 'express';

export function securityAuditMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Store original send function
  const originalSend = res.send;

  res.send = function(data: any) {
    const duration = Date.now() - startTime;

    // Log based on response status
    if (res.statusCode === 401) {
      securityEventLogger.logFailedAuth(
        req.user?.id || 'unknown',
        'Unauthorized access attempt',
        {
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'],
          country: (req as any).geoip?.country
        }
      ).catch(console.error);
    }

    if (res.statusCode === 403) {
      if (req.path.includes('/admin')) {
        securityEventLogger.logPermissionEscalation(
          req.user?.id || 'unknown',
          'admin',
          {
            ipAddress: req.ip || '',
            currentRole: req.user?.role || 'guest',
            method: 'unauthorized_access'
          }
        ).catch(console.error);
      }
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}

// Register in Express app
app.use(securityAuditMiddleware);
```

### Input Validation Integration

```typescript
import { securityEventLogger } from '@/audit/SecurityEventLogger';

const INJECTION_PATTERNS = [
  /(\bselect\b|\bunion\b|\bdrop\b|\binsert\b|\bupdate\b|\bdelete\b).*\b(from|where|table)\b/i,
  /('|")([\s\w])*?(or|and)([\s\w])*?('|")/i,
  /<script[^>]*>/i,
  /javascript:/i
];

export function validateInput(
  input: string,
  paramName: string,
  context: { userId?: string; ipAddress: string; endpoint: string }
): boolean {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      // Log injection attempt
      securityEventLogger.logInjectionAttempt(
        detectInjectionType(input),
        input,
        {
          userId: context.userId,
          ipAddress: context.ipAddress,
          parameterName: paramName,
          endpoint: context.endpoint
        }
      ).catch(console.error);

      return false;
    }
  }

  return true;
}

function detectInjectionType(input: string): string {
  if (/select|union|drop|insert|update|delete|from|where/i.test(input)) return 'sql';
  if (/<script|javascript:|onerror|onload/i.test(input)) return 'xss';
  if (/\.\.\/|\.\.\\|\x00/.test(input)) return 'path_traversal';
  return 'unknown';
}
```

## Rate Limiting Integration

```typescript
import { securityEventLogger } from '@/audit/SecurityEventLogger';
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  handler: async (req: Request, res: Response) => {
    // Log rate limit violation
    const actualCount = req.rateLimit.current;
    const limit = req.rateLimit.limit;

    await securityEventLogger.logRateLimitViolation(
      req.path,
      limit,
      actualCount,
      {
        userId: req.user?.id,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'],
        timeWindow: 1
      }
    );

    res.status(429).json({
      error: 'Too many requests',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

app.use('/api', limiter);
```

## Authorization Integration

```typescript
import { securityEventLogger, SecuritySeverity } from '@/audit/SecurityEventLogger';

export async function checkPermission(
  userId: string,
  requiredRole: string,
  context: any
): Promise<boolean> {
  const user = await userService.getUser(userId);

  if (!hasRequiredRole(user.role, requiredRole)) {
    // Log escalation attempt
    await securityEventLogger.logPermissionEscalation(
      userId,
      requiredRole,
      {
        ipAddress: context.ip,
        currentRole: user.role,
        method: 'unauthorized_resource_access'
      }
    );

    return false;
  }

  return true;
}

function hasRequiredRole(userRole: string, required: string): boolean {
  const hierarchy = ['guest', 'user', 'moderator', 'admin'];
  return hierarchy.indexOf(userRole) >= hierarchy.indexOf(required);
}
```

## Data Export/Deletion Integration

```typescript
import { securityEventLogger } from '@/audit/SecurityEventLogger';

export async function handleDataExport(
  userId: string,
  dataSize: number,
  context: any
): Promise<void> {
  if (dataSize > 100 * 1024 * 1024) {
    // 100 MB
    await securityEventLogger.logDataExfiltration(
      `User requested data export of ${(dataSize / 1024 / 1024).toFixed(2)} MB`,
      dataSize,
      {
        userId,
        ipAddress: context.ip,
        dataType: 'user_data',
        destination: 'user_download'
      }
    );
  }
}
```

## Monitoring Dashboard Integration

### Display Security Metrics

```typescript
export function SecurityMetricsDashboard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const updateMetrics = () => {
      const stats = securityEventLogger.getStatistics();

      setMetrics({
        threatLevel: stats.averageThreatScore > 70 ? 'HIGH' : 'NORMAL',
        totalEvents: stats.totalEvents,
        critical: stats.eventsBySeverity['CRITICAL'],
        high: stats.eventsBySeverity['HIGH'],
        topThreats: stats.topThreatenedUsers,
        suspiciousIPs: stats.topThreatenedIPs
          .filter(ip => ip.reputation === 'suspicious')
          .slice(0, 5)
      });
    };

    // Update every 30 seconds
    const interval = setInterval(updateMetrics, 30000);
    updateMetrics(); // Initial load

    return () => clearInterval(interval);
  }, []);

  if (!metrics) return null;

  return (
    <div className="security-dashboard">
      <div className="threat-level" data-level={metrics.threatLevel}>
        <h2>Threat Level: {metrics.threatLevel}</h2>
      </div>

      <div className="metrics-grid">
        <MetricCard label="Total Events" value={metrics.totalEvents} />
        <MetricCard label="Critical Alerts" value={metrics.critical} severity="critical" />
        <MetricCard label="High Severity" value={metrics.high} severity="high" />
      </div>

      <div className="top-threats">
        <h3>Top Threatened Users</h3>
        <UserThreatList users={metrics.topThreats} />
      </div>

      <div className="suspicious-ips">
        <h3>Suspicious IP Addresses</h3>
        <IPRepList ips={metrics.suspiciousIPs} />
      </div>
    </div>
  );
}
```

### Real-time Event Feed

```typescript
export function SecurityEventFeed() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);

  useEffect(() => {
    // Listen for new events
    const handleNewEvent = ({ event }: { event: SecurityEvent }) => {
      setEvents(prev => [event, ...prev].slice(0, 50)); // Keep last 50
    };

    const handleAlert = ({ event, alertLevel }: any) => {
      // Highlight alerts
      setEvents(prev => [{
        ...event,
        isAlert: true
      }, ...prev].slice(0, 50));
    };

    securityEventLogger.on('event:logged', handleNewEvent);
    securityEventLogger.on('alert:triggered', handleAlert);

    return () => {
      securityEventLogger.removeListener('event:logged', handleNewEvent);
      securityEventLogger.removeListener('alert:triggered', handleAlert);
    };
  }, []);

  return (
    <div className="event-feed">
      <h2>Security Events</h2>
      <div className="event-list">
        {events.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: SecurityEvent }) {
  return (
    <div className={`event-card severity-${event.severity.toLowerCase()}
                      ${event.isAlert ? 'is-alert' : ''}`}>
      <div className="event-header">
        <span className="event-type">{event.eventType}</span>
        <span className="timestamp">{new Date(event.timestamp).toLocaleTimeString()}</span>
      </div>
      <div className="event-body">
        <p className="description">{event.description}</p>
        {event.userId && <p>User: {event.userId}</p>}
        {event.ipAddress && <p>IP: {event.ipAddress}</p>}
        <div className="threat-score">
          Threat: {event.threatIndicators.score}/100
        </div>
      </div>
    </div>
  );
}
```

## API Endpoints

### Get Security Statistics

```typescript
app.get('/api/security/statistics', async (req, res) => {
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const stats = securityEventLogger.getStatistics(startDate, endDate);
  res.json(stats);
});
```

### Get User Threat Analysis

```typescript
app.get('/api/security/analysis/:userId', async (req, res) => {
  const timeWindow = parseInt(req.query.timeWindow as string) || 3600000;
  const analysis = securityEventLogger.analyzePattern(req.params.userId, timeWindow);
  res.json(analysis);
});
```

### Export Events

```typescript
app.get('/api/security/export', async (req, res) => {
  const format = req.query.format as 'json' | 'csv' || 'json';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const exported = format === 'csv'
    ? securityEventLogger.exportCSV(startDate, endDate)
    : securityEventLogger.exportJSON(startDate, endDate);

  res.contentType(`text/${format}`);
  res.send(exported);
});
```

## Alerting Integrations

### Slack Integration

```typescript
import axios from 'axios';

securityEventLogger.on('alert:triggered', async ({ event, alertLevel }) => {
  const color = alertLevel === SecuritySeverity.CRITICAL ? '#FF0000' : '#FFA500';

  await axios.post(process.env.SLACK_WEBHOOK_URL, {
    attachments: [{
      color,
      title: `Security Alert: ${event.eventType}`,
      text: event.description,
      fields: [
        {
          title: 'Severity',
          value: event.severity,
          short: true
        },
        {
          title: 'User',
          value: event.userId || 'Unknown',
          short: true
        },
        {
          title: 'IP Address',
          value: event.ipAddress || 'Unknown',
          short: true
        },
        {
          title: 'Threat Score',
          value: event.threatIndicators.score + '/100',
          short: true
        }
      ],
      ts: Math.floor(event.timestamp.getTime() / 1000)
    }]
  });
});
```

### PagerDuty Integration

```typescript
import axios from 'axios';

securityEventLogger.on('alert:triggered', async ({ event, alertLevel }) => {
  const severity = alertLevel === SecuritySeverity.CRITICAL ? 'critical' : 'error';

  await axios.post('https://events.pagerduty.com/v2/enqueue', {
    routing_key: process.env.PAGERDUTY_ROUTING_KEY,
    event_action: 'trigger',
    dedup_key: event.id,
    payload: {
      summary: event.description,
      severity,
      source: 'Security Event Logger',
      custom_details: {
        userId: event.userId,
        ipAddress: event.ipAddress,
        threatScore: event.threatIndicators.score,
        indicators: event.threatIndicators.indicators
      }
    }
  });
});
```

### Email Notifications

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

securityEventLogger.on('alert:triggered', async ({ event, alertLevel }) => {
  if (alertLevel === SecuritySeverity.CRITICAL) {
    await transporter.sendMail({
      from: 'security@company.com',
      to: 'security-team@company.com',
      subject: `CRITICAL SECURITY ALERT: ${event.eventType}`,
      html: `
        <h2>Critical Security Alert</h2>
        <p><strong>Event:</strong> ${event.eventType}</p>
        <p><strong>Description:</strong> ${event.description}</p>
        <p><strong>User:</strong> ${event.userId || 'Unknown'}</p>
        <p><strong>IP Address:</strong> ${event.ipAddress || 'Unknown'}</p>
        <p><strong>Threat Score:</strong> ${event.threatIndicators.score}/100</p>
        <p><strong>Indicators:</strong></p>
        <ul>
          ${event.threatIndicators.indicators.map(i => `<li>${i}</li>`).join('')}
        </ul>
      `
    });
  }
});
```

## Compliance Reporting

### Generate Security Report

```typescript
export function generateSecurityReport(startDate: Date, endDate: Date) {
  const stats = securityEventLogger.getStatistics(startDate, endDate);
  const events = securityEventLogger.getEventsByTimeRange(startDate, endDate);

  return {
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    summary: {
      totalEvents: stats.totalEvents,
      criticalAlerts: stats.eventsBySeverity['CRITICAL'],
      highSeverity: stats.eventsBySeverity['HIGH'],
      averageThreatScore: stats.averageThreatScore
    },
    eventsByCategory: stats.eventsByCategory,
    topThreats: stats.topThreatenedUsers,
    suspiciousActivity: stats.topThreatenedIPs,
    recommendations: generateRecommendations(stats)
  };
}

function generateRecommendations(stats: any): string[] {
  const recommendations: string[] = [];

  if (stats.eventsBySeverity['CRITICAL'] > 0) {
    recommendations.push('Review and address all CRITICAL security events immediately');
  }

  if (stats.topThreatenedUsers.some((u: any) => u.riskScore > 80)) {
    recommendations.push('Enforce MFA for high-risk users');
  }

  if (stats.eventsByCategory['rate_limit'] > 100) {
    recommendations.push('Increase rate limiting thresholds or implement IP whitelisting');
  }

  if (stats.eventsByCategory['injection'] > 5) {
    recommendations.push('Review input validation implementation');
  }

  return recommendations;
}
```

## Performance Optimization

### Batch Event Logging

```typescript
class SecurityEventBatcher {
  private batch: Partial<SecurityEvent>[] = [];
  private batchSize = 100;
  private flushInterval = 5000;

  constructor() {
    setInterval(() => this.flush(), this.flushInterval);
  }

  async add(event: Partial<SecurityEvent>): Promise<void> {
    this.batch.push(event);

    if (this.batch.length >= this.batchSize) {
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    const events = this.batch.splice(0);

    for (const event of events) {
      await securityEventLogger.logEvent(event);
    }
  }
}

export const eventBatcher = new SecurityEventBatcher();
```

### Caching Threat Analysis

```typescript
class CachedThreatAnalyzer {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 60000; // 1 minute

  getThreatAnalysis(userId: string): any {
    const cached = this.cache.get(userId);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    const analysis = securityEventLogger.analyzePattern(userId);
    this.cache.set(userId, { data: analysis, timestamp: Date.now() });

    return analysis;
  }
}
```

## Best Practices

1. **Always log authentication failures** - Enables detection of brute force attacks
2. **Monitor rate limit violations** - Indicates potential API abuse
3. **Track permission escalation attempts** - Critical security indicator
4. **Log injection attempts** - Foundation for input validation audit
5. **Monitor unusual patterns** - Use threat analysis for proactive detection
6. **Export regular reports** - Maintain compliance audit trail
7. **Set up real-time alerts** - Respond quickly to critical events
8. **Review recommendations** - Implement suggested mitigations
9. **Verify chain integrity** - Ensure audit trail hasn't been tampered with
10. **Archive historical data** - Maintain long-term compliance records

## Troubleshooting

### Events not being logged

```typescript
// Check if logger is properly initialized
console.log(securityEventLogger instanceof SecurityEventLogger);

// Verify event listeners are registered
console.log(securityEventLogger.eventNames());
```

### Missing threat scores

```typescript
// Ensure threatIndicators is provided
const event = await securityEventLogger.logEvent({
  // ...
  threatIndicators: {
    score: 0,
    indicators: [],
    riskFactors: [],
    confidence: 0
  }
});
```

### Performance issues

```typescript
// Use batching for high-volume events
const batcher = new SecurityEventBatcher();
await batcher.add(event);

// Export and clear old events periodically
const exported = securityEventLogger.exportJSON(
  new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  new Date()
);
securityEventLogger.clear();
```

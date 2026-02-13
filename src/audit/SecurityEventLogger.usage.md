# Security Event Logger - Usage Guide

## Overview

The `SecurityEventLogger` is a specialized logging system for tracking security-related events with comprehensive threat intelligence, anomaly detection, and automatic response capabilities. It's designed for Phase 2 Week 7 of the audit logging and compliance framework.

## Features

### 1. Security Event Logging
- **Multiple event types**: Authentication, rate limiting, injection attacks, permission escalation, data exfiltration, etc.
- **Severity levels**: INFO, LOW, MEDIUM, HIGH, CRITICAL
- **Threat scoring**: Automatic calculation of threat risk (0-100)
- **Chain integrity**: Cryptographic hashing for immutable audit trail

### 2. Threat Intelligence
- **Brute force detection**: Tracks failed login patterns
- **Impossible travel detection**: Identifies logins from different countries in short timeframes
- **IP reputation tracking**: Maintains reputation scores for IP addresses
- **Rate limit enforcement**: Monitors and logs API abuse patterns

### 3. Anomaly Detection
- **Login pattern analysis**: Detects unusual authentication behavior
- **Rapid request detection**: Identifies bot-like activity
- **Data exfiltration indicators**: Flags large data exports
- **Injection attack detection**: Identifies malicious payloads

### 4. Real-time Alerting
- **Severity-based alerts**: HIGH and CRITICAL events trigger immediate alerts
- **WebSocket/Event emission**: Real-time notification to connected clients
- **Slack/Email integration**: Configure external notification channels
- **Automatic response suggestions**: Recommends mitigations based on threat analysis

## Basic Usage

### Initialize the Logger

```typescript
import { securityEventLogger, SecuritySeverity, SecurityCategory } from '@/audit/SecurityEventLogger';

// The logger is exported as a singleton
// No need to instantiate - just import and use
```

### Log a Simple Security Event

```typescript
await securityEventLogger.logEvent({
  severity: SecuritySeverity.MEDIUM,
  category: SecurityCategory.AUTH,
  eventType: 'auth.suspicious',
  description: 'Login from new IP address detected',
  userId: 'user_123',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
  threatIndicators: {
    score: 45,
    indicators: ['new_ip_location'],
    riskFactors: ['first_login_from_ip'],
    confidence: 0.8
  }
});
```

### Log Failed Authentication

```typescript
await securityEventLogger.logFailedAuth(
  'user_123',
  'Invalid password',
  {
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0...',
    country: 'US'
  }
);

// Automatically detects brute force patterns
// Tracks login attempts for anomaly detection
// Logs threat score if pattern matches thresholds
```

### Log Suspicious Activity

```typescript
await securityEventLogger.logSuspiciousActivity(
  'Unusual API access pattern detected',
  SecuritySeverity.MEDIUM,
  {
    userId: 'user_123',
    ipAddress: '192.168.1.100',
    indicators: ['high_api_calls', 'non_business_hours'],
    riskFactors: ['typical_pattern_deviation']
  }
);
```

### Log Injection Attempt

```typescript
await securityEventLogger.logInjectionAttempt(
  'sql',
  "'; DROP TABLE users; --",
  {
    userId: 'user_123',
    ipAddress: '192.168.1.100',
    parameterName: 'username',
    endpoint: '/api/users/search'
  }
);

// Severity automatically upgraded to HIGH if payload is large
// Includes payload hash for tracking similar attempts
// Correlates with other injection attempts
```

### Log Rate Limit Violation

```typescript
await securityEventLogger.logRateLimitViolation(
  '/api/workflows',
  100, // requests per minute limit
  450, // actual requests made
  {
    userId: 'user_123',
    ipAddress: '192.168.1.100',
    timeWindow: 60
  }
);

// Calculates excess percentage
// Tracks violations by user/IP/resource
// Triggers alert if significantly exceeded
```

### Log Permission Escalation

```typescript
await securityEventLogger.logPermissionEscalation(
  'user_123',
  'admin',
  {
    ipAddress: '192.168.1.100',
    currentRole: 'user',
    method: 'token_manipulation'
  }
);

// Immediately logs as HIGH severity
// Triggers alert for suspicious privilege escalation
// Includes method details for forensics
```

### Log Data Exfiltration

```typescript
await securityEventLogger.logDataExfiltration(
  'Large dataset export detected',
  500 * 1024 * 1024, // 500 MB
  {
    userId: 'user_123',
    ipAddress: '192.168.1.100',
    dataType: 'customer_records',
    destination: 'external_server'
  }
);

// Severity auto-upgraded to CRITICAL if > 100MB
// Includes data size and type
// Flags destination for investigation
```

## Advanced Usage

### Listen for Security Alerts

```typescript
import { securityEventLogger } from '@/audit/SecurityEventLogger';

// Listen for all logged events
securityEventLogger.on('event:logged', ({ event }) => {
  console.log(`Event logged: ${event.eventType}`, event);
});

// Listen for high-priority alerts
securityEventLogger.on('alert:triggered', ({ event, alertLevel }) => {
  // Send to PagerDuty, Slack, etc.
  notificationService.sendAlert({
    level: alertLevel,
    title: `Security Alert: ${event.description}`,
    userId: event.userId,
    ipAddress: event.ipAddress
  });
});
```

### Analyze Threat Patterns

```typescript
// Get comprehensive threat analysis for a user
const analysis = securityEventLogger.analyzePattern('user_123', 3600000); // 1 hour

console.log('Risk Score:', analysis.riskScore);
console.log('Failed Logins:', analysis.patterns.failedLogins);
console.log('Unusual Locations:', analysis.patterns.unusualLocations);
console.log('Rapid Requests:', analysis.patterns.rapidRequests);
console.log('Abnormal Behavior:', analysis.patterns.abnormalBehavior);

// Get recommendations
console.log('Recommendations:', analysis.recommendations);
// ["Enforce MFA for this user", "Reset user password", ...]
```

### Detect Impossible Travel

```typescript
const impossibleTravel = securityEventLogger.detectImpossibleTravel('user_123');

if (impossibleTravel.detected) {
  console.log('Impossible travel detected!');
  console.log('Indicators:', impossibleTravel.indicators);
  // ["impossible_travel", "from_US", "to_UK", "time_delta_120s"]
}
```

### Query Events

```typescript
// Get all CRITICAL events
const criticalEvents = securityEventLogger.getEventsBySeverity(
  SecuritySeverity.CRITICAL,
  50
);

// Get all events for a user
const userEvents = securityEventLogger.getEventsByUser('user_123', 100);

// Get all events from an IP address
const ipEvents = securityEventLogger.getEventsByIP('192.168.1.100', 100);

// Get events by category
const injectionEvents = securityEventLogger.getEventsByCategory(
  SecurityCategory.INJECTION,
  50
);

// Get events in time range
const rangeEvents = securityEventLogger.getEventsByTimeRange(
  new Date('2025-01-01'),
  new Date('2025-01-31')
);
```

### Get Security Statistics

```typescript
const stats = securityEventLogger.getStatistics();

console.log('Total Events:', stats.totalEvents);
console.log('Average Threat Score:', stats.averageThreatScore);
console.log('Events by Severity:', stats.eventsBySeverity);
console.log('Events by Category:', stats.eventsByCategory);
console.log('Top Threatened Users:', stats.topThreatenedUsers);
console.log('Top Threatened IPs:', stats.topThreatenedIPs);

// Get stats for specific time range
const monthStats = securityEventLogger.getStatistics(
  new Date('2025-01-01'),
  new Date('2025-01-31')
);
```

### Export for Compliance

```typescript
// Export as JSON
const jsonExport = securityEventLogger.exportJSON(
  new Date('2025-01-01'),
  new Date('2025-01-31')
);

// Export as CSV
const csvExport = securityEventLogger.exportCSV(
  new Date('2025-01-01'),
  new Date('2025-01-31')
);

// Save to file
fs.writeFileSync('security_audit_q1.json', jsonExport);
fs.writeFileSync('security_audit_q1.csv', csvExport);
```

## Integration with Backend Services

### Express Middleware Example

```typescript
import { securityEventLogger } from '@/audit/SecurityEventLogger';
import express, { Request, Response, NextFunction } from 'express';

// Log all requests for monitoring
export function securityAuditMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on('finish', async () => {
    const duration = Date.now() - startTime;

    // Log failed authentication
    if (res.statusCode === 401) {
      await securityEventLogger.logFailedAuth(
        req.user?.id || 'unknown',
        'Authentication failed',
        {
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'],
          country: req.geoip?.country
        }
      );
    }

    // Log permission escalation attempts
    if (res.statusCode === 403 && req.path.includes('/admin')) {
      await securityEventLogger.logPermissionEscalation(
        req.user?.id || 'unknown',
        'admin',
        {
          ipAddress: req.ip || '',
          currentRole: req.user?.role || 'guest',
          method: 'unauthorized_access'
        }
      );
    }

    // Log rate limit violations
    const rateLimitRemaining = parseInt(res.getHeader('X-RateLimit-Remaining') as string) || 0;
    if (rateLimitRemaining === 0) {
      await securityEventLogger.logRateLimitViolation(
        req.path,
        100,
        101, // Just over limit
        {
          userId: req.user?.id,
          ipAddress: req.ip || ''
        }
      );
    }
  });

  next();
}

// Register middleware
app.use(securityAuditMiddleware);
```

### Input Validation Integration

```typescript
import { securityEventLogger, SecurityCategory } from '@/audit/SecurityEventLogger';

export function detectAndLogInjectionAttempts(
  input: string,
  parameterName: string,
  context: any
): boolean {
  const injectionPatterns = [
    /(\bselect\b|\bunion\b|\bdrop\b|\binsert\b|\bupdate\b|\bdelete\b).*\b(from|where|table|database)\b/i,
    /[<>]/g,
    /('|")([\s\w])*?(or|and)([\s\w])*?('|")/i,
    /<script[^>]*>/i,
    /javascript:/i
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(input)) {
      const type = detectInjectionType(input);

      securityEventLogger.logInjectionAttempt(
        type,
        input,
        {
          userId: context.userId,
          ipAddress: context.ipAddress,
          parameterName,
          endpoint: context.endpoint
        }
      ).catch(console.error);

      return true;
    }
  }

  return false;
}

function detectInjectionType(input: string): string {
  if (/select|union|drop|insert|update|delete/i.test(input)) return 'sql';
  if (/<script|javascript:/i.test(input)) return 'xss';
  if (/\.\.\//i.test(input)) return 'path_traversal';
  if (/union.*select|;.*drop/i.test(input)) return 'combined';
  return 'unknown';
}
```

## Threat Scoring Algorithm

The threat score is calculated using multiple factors:

1. **Base Score from Severity** (0-95)
   - INFO: 10
   - LOW: 25
   - MEDIUM: 50
   - HIGH: 75
   - CRITICAL: 95

2. **IP Reputation Penalty** (up to +30)
   - Trusted IP: no penalty
   - Suspicious IP: +10-20
   - Blocked IP: +30

3. **Impossible Travel Bonus** (up to +85)
   - Login from different country within 15 minutes

4. **Threat Indicator Score**
   - Uses custom indicators provided with event

Final score is clamped to 0-100 range.

## Automatic Responses

The logger can integrate with response systems:

```typescript
// Listen for alerts and trigger automatic responses
securityEventLogger.on('alert:triggered', async ({ event }) => {
  if (event.severity === SecuritySeverity.CRITICAL) {
    // Auto-lock account
    await userService.lockAccount(event.userId);

    // Block IP temporarily
    await securityService.blockIP(event.ipAddress, 3600); // 1 hour

    // Log the automatic response
    event.mitigation = {
      action: 'account_locked_and_ip_blocked',
      automated: true,
      success: true,
      timestamp: new Date()
    };
  }
});
```

## Retention Policy

- Events are retained for 90 days
- Login attempts are retained for 24 hours
- Rate limit tracking is retained for 60 minutes
- Retention cleanup runs daily

## Performance Considerations

- Maintains up to 100,000 events in memory
- Incremental hash chain verification
- Efficient IP reputation caching
- Optimized pattern detection algorithms
- Event correlation via Map-based lookup

## Security Best Practices

1. Always use HTTPS when sending security events to external services
2. Sanitize sensitive data before logging (already done for passwords/tokens)
3. Regularly export and archive audit logs
4. Monitor the security event logger itself for tampering
5. Verify event chain integrity periodically
6. Review threat scores and adjust thresholds as needed
7. Integrate with SIEM for centralized monitoring
8. Set up automated alerting for HIGH and CRITICAL events
9. Conduct quarterly security reviews of logged events
10. Maintain immutable audit trail for compliance

## Metrics and Dashboard Data

The logger provides comprehensive metrics for security dashboards:

```typescript
const stats = securityEventLogger.getStatistics();

// Metrics for dashboard
const securityMetrics = {
  threatLevel: stats.averageThreatScore > 70 ? 'HIGH' : 'NORMAL',
  eventsToday: stats.totalEvents,
  criticalAlerts: stats.eventsBySeverity[SecuritySeverity.CRITICAL],
  topThreats: stats.topThreatenedUsers,
  suspiciousIPs: stats.topThreatenedIPs.filter(ip => ip.reputation === 'suspicious')
};
```

## Testing

See `src/__tests__/securityEventLogger.test.ts` for comprehensive test examples covering:
- Basic event logging
- Threat score calculation
- Pattern detection
- Alert triggering
- Data export
- Event chain integrity

# Security Event Logger - Quick Reference Card

## Import
```typescript
import { securityEventLogger, SecuritySeverity, SecurityCategory } from '@/audit/SecurityEventLogger';
```

## Quick Events

### Authentication
```typescript
// Failed login
await securityEventLogger.logFailedAuth('user_id', 'Invalid password', {
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
  country: 'US'
});
```

### Injection Attacks
```typescript
// SQL injection attempt
await securityEventLogger.logInjectionAttempt('sql', "'; DROP TABLE users; --", {
  ipAddress: '192.168.1.1',
  parameterName: 'username',
  endpoint: '/api/users/search'
});

// XSS injection attempt
await securityEventLogger.logInjectionAttempt('xss', '<script>alert("XSS")</script>', {
  ipAddress: '192.168.1.1'
});
```

### Rate Limiting
```typescript
// Rate limit exceeded
await securityEventLogger.logRateLimitViolation(
  '/api/workflows',      // resource
  100,                   // limit
  450,                   // actual requests
  { ipAddress: '192.168.1.1' }
);
```

### Permission Escalation
```typescript
// Escalation attempt
await securityEventLogger.logPermissionEscalation(
  'user_id',
  'admin',               // attempted role
  {
    ipAddress: '192.168.1.1',
    currentRole: 'user'
  }
);
```

### Data Exfiltration
```typescript
// Large data export
await securityEventLogger.logDataExfiltration(
  'Dataset export detected',
  500 * 1024 * 1024,     // 500 MB
  {
    userId: 'user_id',
    ipAddress: '192.168.1.1',
    dataType: 'customer_records',
    destination: 'external_server'
  }
);
```

### Suspicious Activity
```typescript
// Custom suspicious activity
await securityEventLogger.logSuspiciousActivity(
  'Unusual API access pattern',
  SecuritySeverity.MEDIUM,
  {
    userId: 'user_id',
    ipAddress: '192.168.1.1',
    indicators: ['high_api_calls', 'non_business_hours'],
    riskFactors: ['deviation_from_pattern']
  }
);
```

### Generic Event
```typescript
// Any security event
await securityEventLogger.logEvent({
  severity: SecuritySeverity.CRITICAL,
  category: SecurityCategory.CREDENTIAL_COMPROMISE,
  eventType: 'cred.compromised',
  description: 'User credentials compromised',
  userId: 'user_id',
  ipAddress: '192.168.1.1',
  threatIndicators: {
    score: 95,
    indicators: ['compromised_credentials'],
    riskFactors: ['password_breach'],
    confidence: 0.99
  }
});
```

## Query Events

```typescript
// By severity
logger.getEventsBySeverity(SecuritySeverity.CRITICAL, 100);
logger.getEventsBySeverity(SecuritySeverity.HIGH, 50);

// By category
logger.getEventsByCategory(SecurityCategory.INJECTION, 100);
logger.getEventsByCategory(SecurityCategory.AUTH, 50);

// By user
logger.getEventsByUser('user_id', 100);

// By IP
logger.getEventsByIP('192.168.1.1', 100);

// By time range
logger.getEventsByTimeRange(
  new Date('2025-01-01'),
  new Date('2025-01-31')
);
```

## Analysis & Metrics

```typescript
// Threat analysis for user
const analysis = logger.analyzePattern('user_id', 3600000);
// {
//   userId: 'user_id',
//   timeWindow: 3600000,
//   eventCount: 5,
//   suspiciousEvents: 2,
//   riskScore: 65,
//   patterns: {
//     failedLogins: 3,
//     unusualLocations: 1,
//     rapidRequests: 0,
//     abnormalBehavior: 1
//   },
//   recommendations: ['Enforce MFA', 'Reset password', ...]
// }

// Impossible travel detection
const travel = logger.detectImpossibleTravel('user_id');
// { detected: true, score: 85, indicators: [...] }

// Statistics
const stats = logger.getStatistics(startDate, endDate);
// {
//   totalEvents: 1000,
//   eventsBySeverity: { CRITICAL: 5, HIGH: 20, MEDIUM: 100, ... },
//   eventsByCategory: { auth: 500, injection: 50, ... },
//   topThreatenedUsers: [{userId, eventCount, riskScore}, ...],
//   topThreatenedIPs: [{ipAddress, eventCount, reputation}, ...],
//   averageThreatScore: 45
// }
```

## Alerts & Listeners

```typescript
// Listen for all events
logger.on('event:logged', ({ event }) => {
  console.log(`Logged: ${event.eventType}`);
});

// Listen for alerts (CRITICAL/HIGH only)
logger.on('alert:triggered', ({ event, alertLevel }) => {
  // Send to Slack, PagerDuty, email, etc.
  notificationService.send({
    level: alertLevel,
    title: event.description,
    userId: event.userId,
    ipAddress: event.ipAddress
  });
});
```

## Exports

```typescript
// Export as JSON
const json = logger.exportJSON();
const filteredJson = logger.exportJSON(
  new Date('2025-01-01'),
  new Date('2025-01-31')
);

// Export as CSV
const csv = logger.exportCSV();
const filteredCSV = logger.exportCSV(
  new Date('2025-01-01'),
  new Date('2025-01-31')
);

// Save to file
fs.writeFileSync('audit.json', json);
fs.writeFileSync('audit.csv', csv);
```

## Integrity & Management

```typescript
// Verify event chain (detect tampering)
const verification = logger.verifyIntegrity();
// { valid: true, errors: [] }

// Clear all events
logger.clear();

// Get related events (by correlation ID)
const related = logger.getRelatedEvents('event_id');
```

## Severity Levels

| Level | Score | Use Case | Alert? |
|-------|-------|----------|--------|
| `INFO` | 10 | Normal operations | No |
| `LOW` | 25 | Minor issues | No |
| `MEDIUM` | 50 | Suspicious activity | No |
| `HIGH` | 75 | Active attack | Yes* |
| `CRITICAL` | 95 | Breach confirmed | Yes |

*HIGH alerts if threat score > 70

## Event Categories

- `AUTH` - Authentication/login events
- `RATE_LIMIT` - API rate limiting violations
- `TOKEN` - Token/JWT issues
- `PERMISSION` - Authorization failures
- `DATA_EXFILTRATION` - Data theft indicators
- `INJECTION` - SQL/XSS/Command injection
- `API_ABUSE` - API misuse patterns
- `CONFIG_TAMPERING` - Configuration changes
- `CREDENTIAL_COMPROMISE` - Account compromise
- `SESSION_HIJACKING` - Session theft
- `SUSPICIOUS_PATTERN` - General anomalies

## Threat Scoring Formula

```
Score = BaseSeverity + IPReputation + ImpossibleTravel
Score = max(0, min(100, score))

Examples:
- CRITICAL (95) = 95
- HIGH (75) + bad IP (20) = 95
- MEDIUM (50) + impossible travel (85) = 100
```

## Common Patterns

### Brute Force Detection
```typescript
// Automatically detected when:
// - 5+ failed logins in 15 minutes from same IP
// Auto-adds threat indicators and increases score

for (let i = 0; i < 6; i++) {
  await logger.logFailedAuth('user_id', 'invalid', { ipAddress });
}
// Last attempt will have brute_force_pattern detected
```

### Rate Limit Enforcement
```typescript
app.use(rateLimit({
  max: 100,
  handler: (req, res) => {
    logger.logRateLimitViolation('/api', 100, 101, { ipAddress: req.ip });
    res.status(429).send('Too many requests');
  }
}));
```

### Input Validation
```typescript
function validateInput(input: string, paramName: string, context: any) {
  if (/select|union|drop/i.test(input)) {
    logger.logInjectionAttempt('sql', input, {
      parameterName: paramName,
      ...context
    }).catch(console.error);
    return false;
  }
  return true;
}
```

### Dashboard Metrics
```typescript
function getSecurityMetrics() {
  const stats = logger.getStatistics();
  return {
    threatLevel: stats.averageThreatScore > 70 ? 'HIGH' : 'NORMAL',
    criticalAlerts: stats.eventsBySeverity['CRITICAL'],
    topThreats: stats.topThreatenedUsers.slice(0, 5),
    suspiciousIPs: stats.topThreatenedIPs
      .filter(ip => ip.reputation === 'suspicious')
      .slice(0, 5)
  };
}
```

## Environment Variables

```bash
# Optional: Configure logger behavior
SECURITY_LOGGER_RETENTION_DAYS=90         # Event retention period
SECURITY_LOGGER_MAX_EVENTS=100000         # Max events in memory
SECURITY_ALERT_WEBHOOK=https://...        # Alert webhook URL
```

## Performance Tips

1. **Batch Events** - Use batching middleware for high-volume logging
2. **Archive Events** - Export and clear events regularly
3. **Cache Analysis** - Cache threat analysis results with TTL
4. **Async Logging** - All methods are async, use properly
5. **Indexed Queries** - Use category/severity for faster filtering

## Compliance Notes

- **Retention**: 90 days default (configurable)
- **Immutability**: SHA-256 chain prevents tampering
- **PII**: Sanitize before logging if needed
- **Exports**: JSON and CSV formats for reports
- **Archival**: Long-term storage recommended for compliance

## Testing

```bash
# Run security event logger tests
npm run test -- src/__tests__/securityEventLogger.test.ts

# Run with coverage
npm run test:coverage -- src/__tests__/securityEventLogger.test.ts

# Watch mode for development
npm run test -- src/__tests__/securityEventLogger.test.ts --watch
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Events not logging | Check EventEmitter is initialized; verify async/await usage |
| Low threat scores | Provide threatIndicators; check IP reputation building |
| Memory issues | Limit retained events; archive regularly |
| Missing IPs | Verify context includes ipAddress field |
| No alerts | Check alert severity thresholds; verify listeners |

## Related Files

- **Main**: `/home/patrice/claude/workflow/src/audit/SecurityEventLogger.ts`
- **Tests**: `/home/patrice/claude/workflow/src/__tests__/securityEventLogger.test.ts`
- **Usage**: `/home/patrice/claude/workflow/src/audit/SecurityEventLogger.usage.md`
- **Integration**: `/home/patrice/claude/workflow/src/audit/INTEGRATION_GUIDE.md`
- **Summary**: `/home/patrice/claude/workflow/PHASE2_WEEK7_SECURITY_EVENT_LOGGER.md`

---

**Phase 2 Week 7** | Security Event Logger v1.0 | Ready for Production

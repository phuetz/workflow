# Audit Logger - Quick Reference Guide

## Installation

The Audit Logger is included in `src/audit/AuditLogger.ts`. No additional installation needed.

## Import

```typescript
import { auditLogger, AuditEventType, AuditLogResult, AuditSeverity } from './audit/AuditLogger';
```

## Quick Start (5 minutes)

### 1. Log a User Login
```typescript
await auditLogger.logAuth(
  'user-123',
  'login',
  AuditLogResult.SUCCESS,
  undefined,
  { ipAddress: '192.168.1.1' }
);
```

### 2. Query the Logs
```typescript
const logs = await auditLogger.query({
  userId: 'user-123',
  eventType: AuditEventType.AUTH_LOGIN,
});
console.log(logs);
```

### 3. Export to CSV
```typescript
const csv = await auditLogger.export({}, 'csv');
console.log(csv);
```

---

## Common Log Types

| Event | Method | Example |
|-------|--------|---------|
| User Login | `logAuth()` | `logAuth('user-123', 'login', 'success')` |
| Data Read | `logDataAccess()` | `logDataAccess('user-123', 'workflow:123', 'read')` |
| Config Change | `logConfigChange()` | `logConfigChange('user-123', 'smtp_host', 'old', 'new')` |
| Permission Denied | `logAuthorization()` | `logAuthorization('user-123', 'admin', 'write', false)` |
| Security Issue | `logSecurityEvent()` | `logSecurityEvent(EventType.RATE_LIMIT, CRITICAL)` |
| Admin Action | `logAdminAction()` | `logAdminAction('admin-1', 'create_user', 'user-2')` |

---

## API Reference

### Core Methods

```typescript
// Log generic event
log(entry: Partial<AuditLogEntry>, context?: {...}): Promise<void>

// Log authentication event
logAuth(userId: string, action: string, result: AuditLogResult,
        metadata?: {...}, context?: {...}): Promise<void>

// Log data access
logDataAccess(userId: string, resource: string, action: string,
              metadata?: {...}, context?: {...}): Promise<void>

// Log configuration change
logConfigChange(userId: string, setting: string, oldValue: any,
                newValue: any, context?: {...}): Promise<void>

// Log security event
logSecurityEvent(eventType: AuditEventType, severity: AuditSeverity,
                 metadata?: {...}, context?: {...}): Promise<void>

// Log authorization decision
logAuthorization(userId: string, resource: string, action: string,
                 granted: boolean, context?: {...}): Promise<void>

// Log admin action
logAdminAction(userId: string, action: string, targetUserId?: string,
               metadata?: {...}, context?: {...}): Promise<void>
```

### Query Methods

```typescript
// Query logs with filters
query(filter: AuditQueryFilter): Promise<AuditLogEntry[]>

// Verify single entry signature
verify(entry: AuditLogEntry): boolean

// Verify entire log chain
verifyChain(entries: AuditLogEntry[]): boolean

// Export logs to JSON or CSV
export(filter: AuditQueryFilter, format: 'json' | 'csv'): Promise<string>

// Get statistics
getStatistics(): Promise<Record<string, any>>
```

---

## Query Filters

```typescript
interface AuditQueryFilter {
  userId?: string;                    // Filter by user
  eventType?: AuditEventType[];      // Filter by event type(s)
  resource?: string;                  // Filter by resource
  startDate?: Date;                   // Start of date range
  endDate?: Date;                     // End of date range
  result?: AuditLogResult;            // success, failure, or denied
  severity?: AuditSeverity;           // info, warning, or critical
  sessionId?: string;                 // Filter by session
  correlationId?: string;             // Filter by correlation ID
  limit?: number;                     // Limit results (default 100)
  offset?: number;                    // Offset for pagination
}
```

---

## Event Types (26)

**Authentication**: LOGIN, LOGOUT, FAILED_LOGIN, PASSWORD_CHANGE, MFA_ENABLE, MFA_DISABLE, TOKEN_ISSUED, TOKEN_REVOKED

**Authorization**: PERMISSION_GRANTED, PERMISSION_DENIED, PERMISSION_REVOKED, ROLE_ASSIGNED, ROLE_REMOVED

**Data**: READ, CREATE, UPDATE, DELETE, EXPORT

**Config**: SETTING_CHANGE, CREDENTIAL_CREATE, CREDENTIAL_UPDATE, CREDENTIAL_DELETE, WORKFLOW_DEPLOY, WORKFLOW_ROLLBACK

**Security**: SUSPICIOUS_ACTIVITY, RATE_LIMIT_EXCEEDED, INVALID_TOKEN, UNAUTHORIZED_ACCESS, ENCRYPTION_KEY_ROTATION

**Admin**: USER_CREATE, USER_UPDATE, USER_DELETE, USER_LOCK, USER_UNLOCK, ROLE_CREATE, ROLE_UPDATE, ROLE_DELETE, BACKUP_CREATE, BACKUP_RESTORE, AUDIT_LOG_EXPORT

---

## Complete Example

```typescript
import { auditLogger, AuditEventType, AuditLogResult, AuditSeverity } from './audit/AuditLogger';

// 1. Log user action
await auditLogger.logDataAccess(
  'john.doe@company.com',
  'workflow:email-campaign',
  'read',
  {
    workflowName: 'Q4 Email Campaign',
    purpose: 'Review automation rules'
  },
  {
    sessionId: 'sess_abc123',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  }
);

// 2. Query user's activity
const userLogs = await auditLogger.query({
  userId: 'john.doe@company.com',
  startDate: new Date('2024-11-01'),
  endDate: new Date('2024-11-30'),
  limit: 50
});

// 3. Verify integrity
const allValid = auditLogger.verifyChain(userLogs);
if (!allValid) {
  console.error('WARNING: Log tampering detected!');
}

// 4. Export for compliance
const csv = await auditLogger.export({
  userId: 'john.doe@company.com',
  startDate: new Date('2024-11-01'),
  endDate: new Date('2024-11-30')
}, 'csv');

// 5. Get statistics
const stats = await auditLogger.getStatistics();
console.log(`Total events: ${stats.totalEntries}`);
console.log(`Critical events: ${stats.bySeverity.critical}`);
```

---

## Express Middleware

### Automatic Request Logging

```typescript
import { createAuditMiddleware } from './audit/AuditLogger';

app.use(createAuditMiddleware({
  excludePaths: ['/health', '/metrics'],
  logAllRequests: false
}));
```

### Manual Route Logging

```typescript
app.post('/api/workflows/:id/execute', async (req, res) => {
  try {
    const workflow = await executeWorkflow(req.params.id);

    // Log successful execution
    await auditLogger.logDataAccess(
      req.user.id,
      `workflow:${req.params.id}`,
      'execute',
      { status: 'success' },
      {
        ipAddress: req.ip,
        sessionId: req.sessionID
      }
    );

    res.json(workflow);
  } catch (error) {
    // Log failed execution
    await auditLogger.logDataAccess(
      req.user.id,
      `workflow:${req.params.id}`,
      'execute',
      { status: 'failed', error: error.message },
      { ipAddress: req.ip }
    );

    res.status(500).json({ error: error.message });
  }
});
```

---

## Compliance Checklist

- [ ] **SOC2 CC8.1**: Log all configuration changes with `logConfigChange()`
- [ ] **ISO 27001 A.12.4.1**: Query logs regularly to verify event coverage
- [ ] **PCI DSS**: Ensure `ipAddress` included in context for all logs
- [ ] **GDPR Article 30**: Export user data with `export(filter, 'json')`
- [ ] **Tamper Detection**: Run `verifyChain()` daily on recent logs
- [ ] **Retention**: Set `AUDIT_LOG_RETENTION_DAYS` environment variable
- [ ] **Secret Key**: Configure `AUDIT_LOG_SECRET` in production

---

## Troubleshooting

### Logs not appearing?
1. Check `AUDIT_LOG_PATH` directory exists
2. Verify `AUDIT_LOG_LEVEL` is set to 'info' or lower
3. Check file permissions on log directory

### Signature verification failed?
1. Entry was modified after creation
2. Wrong `AUDIT_LOG_SECRET` in use
3. Log file corrupted

### Performance issues?
1. Reduce `limit` in queries
2. Archive old logs periodically
3. Increase batch flush timeout

### Export producing empty result?
1. Check filter conditions
2. Verify events exist in date range
3. Use `query()` first to verify entries exist

---

## Environment Configuration

```bash
# .env file
AUDIT_LOG_SECRET=your-32-char-minimum-secret-key
AUDIT_LOG_PATH=/var/log/audit
AUDIT_LOG_LEVEL=info
AUDIT_LOG_RETENTION_DAYS=90
NODE_ENV=production
```

---

## Testing

```bash
# Run all audit logger tests
npm run test src/__tests__/auditLogger.test.ts

# Run specific test
npm run test src/__tests__/auditLogger.test.ts -- --grep "HMAC"

# Watch mode
npm run test -- --watch src/__tests__/auditLogger.test.ts
```

---

## Files Reference

| File | Purpose | Lines |
|------|---------|-------|
| `src/audit/AuditLogger.ts` | Main implementation | 700 |
| `src/__tests__/auditLogger.test.ts` | Test suite | 500+ |
| `AUDIT_LOGGER_GUIDE.md` | Comprehensive guide | 400+ |
| `AUDIT_LOGGER_QUICK_REFERENCE.md` | This file | 250+ |

---

## One-Liners

```typescript
// Log login
await auditLogger.logAuth('user-123', 'login', 'success');

// Log API call
await auditLogger.logDataAccess('user-123', 'api/workflows', 'read');

// Get user's today's activity
const today = await auditLogger.query({
  userId: 'user-123',
  startDate: new Date(new Date().setHours(0, 0, 0, 0))
});

// Export this month's logs
const csv = await auditLogger.export({
  startDate: new Date('2024-11-01'),
  endDate: new Date('2024-11-30')
}, 'csv');

// Check log integrity
const isValid = auditLogger.verifyChain(logs);

// Get stats
const stats = await auditLogger.getStatistics();
```

---

## Need Help?

1. **Implementation questions**: See `AUDIT_LOGGER_GUIDE.md`
2. **API reference**: See `src/audit/AuditLogger.ts` inline documentation
3. **Examples**: Check `src/__tests__/auditLogger.test.ts`
4. **Compliance**: Review "Compliance Standards" section in `AUDIT_LOGGER_GUIDE.md`


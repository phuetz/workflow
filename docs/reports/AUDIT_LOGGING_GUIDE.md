# Audit Logging & Compliance Guide

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [AuditLogger](#auditlogger)
4. [SecurityEventLogger](#securityeventlogger)
5. [ComplianceReporter](#compliancereporter)
6. [LogAnalyzer](#loganalyzer)
7. [Integration Examples](#integration-examples)
8. [Best Practices](#best-practices)
9. [Compliance Frameworks](#compliance-frameworks)
10. [Troubleshooting](#troubleshooting)
11. [API Reference](#api-reference)

---

## 1. Overview

The Audit Logging & Compliance system provides enterprise-grade logging, security event tracking, and compliance reporting capabilities. This system ensures that all critical actions in the workflow automation platform are recorded, analyzed, and reported for regulatory compliance.

### Key Features

- **Immutable Audit Trail**: Cryptographically signed and hash-chained audit logs that prevent tampering
- **Security Event Detection**: Real-time threat intelligence with threat scoring (0-100)
- **Advanced Log Analysis**: Full-text search, correlation, anomaly detection, and pattern recognition
- **Compliance Reporting**: Generate reports for SOC 2, ISO 27001, PCI DSS, HIPAA, and GDPR
- **Performance Optimized**: Batched writes, caching, indexing for fast retrieval
- **Multi-Format Export**: JSON, CSV exports for external systems

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Events                        │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┬────────────────────┐
        │                         │                    │
        ▼                         ▼                    ▼
   ┌─────────────┐         ┌──────────────┐     ┌─────────────┐
   │ AuditLogger │         │ SecurityEvent│     │  Middleware │
   │             │         │   Logger     │     │             │
   └────────┬────┘         └──────┬───────┘     └────────┬────┘
            │                      │                     │
            └──────────┬───────────┴─────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │   Batched Write Buffer      │
         │   (100 entries or 5 sec)    │
         └────────────┬────────────────┘
                      │
         ┌────────────┴────────────────┐
         │                             │
         ▼                             ▼
    Winston Logger              Disk Storage
    (File Rotation)           (Immutable Append)
         │                             │
         └─────────────┬───────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │      LogAnalyzer            │
         │  (Indexes, Search, Queries) │
         └────────────┬────────────────┘
                      │
         ┌────────────┴────────────────┐
         │                             │
         ▼                             ▼
   Compliance Reports          Visualization
   (SOC2, ISO27001, etc.)         Data
```

### Component Overview

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **AuditLogger** | Immutable audit trail | HMAC signatures, hash chaining, compliance-ready |
| **SecurityEventLogger** | Threat detection | Threat scoring, anomaly detection, IP reputation |
| **LogAnalyzer** | Advanced search & analysis | Full-text search, correlation, pattern recognition |
| **ComplianceReporter** | Report generation | SOC2, ISO27001, GDPR, HIPAA, PCI DSS |

---

## 2. Quick Start

### Installation & Setup

```bash
# Dependencies already included in package.json
npm install

# No additional setup required - singletons handle initialization
```

### Basic Logging

```typescript
import { auditLogger } from './src/audit/AuditLogger';
import { securityEventLogger } from './src/audit/SecurityEventLogger';

// Log authentication
await auditLogger.logAuth('user123', 'login', 'success', undefined, {
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});

// Log data access
await auditLogger.logDataAccess('user123', 'workflow_123', 'read', {
  workflowName: 'Email Campaign'
});

// Log security event
await securityEventLogger.logFailedAuth('user123', 'invalid_password', {
  ipAddress: '192.168.1.1'
});
```

### Querying Logs

```typescript
// Query audit logs with filters
const results = await auditLogger.query({
  userId: 'user123',
  eventType: AuditEventType.AUTH_LOGIN,
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  endDate: new Date(),
  limit: 100,
  offset: 0
});

// Advanced search with LogAnalyzer
const analyzer = new LogAnalyzer();
const searchResults = await analyzer.search({
  search: 'failed OR error',
  filters: {
    eventType: ['auth:login', 'auth:failed_login'],
    severity: ['high', 'critical'],
    dateRange: { start: new Date(), end: new Date() }
  },
  limit: 50,
  facets: ['userId', 'eventType', 'severity']
});
```

### Generating Reports

```typescript
import { ComplianceReporter } from './src/compliance/reporting/ComplianceReporter';

const reporter = new ComplianceReporter();

const report = await reporter.generateReport(
  'SOC2', // framework
  'annual', // reportType
  'compliance@company.com', // generatedBy
  {
    controlAssessments: [...],
    gaps: [...],
    totalControls: 45,
    evidenceCount: 150,
    attestationCount: 30
  },
  {
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31')
  }
);

// Export to JSON or CSV
const jsonReport = await reporter.exportToJSON(report);
const csvReport = await reporter.exportToCSV(report);
```

### Express.js Integration

```typescript
import express from 'express';
import { createAuditMiddleware } from './src/audit/AuditLogger';

const app = express();

// Add audit middleware
app.use(createAuditMiddleware({
  excludePaths: ['/health', '/metrics'],
  logAllRequests: true
}));

app.get('/api/workflows', (req, res) => {
  // Automatically logged by middleware
  res.json({ workflows: [...] });
});
```

---

## 3. AuditLogger

The `AuditLogger` is the core immutable audit trail component. It provides cryptographic signing and hash chaining to ensure audit logs cannot be tampered with.

### Features

- **Immutable Append-Only Logs**: Entries cannot be modified after creation
- **HMAC-SHA256 Signatures**: Each entry is signed with a secret key
- **Hash Chaining**: Each entry references the hash of the previous entry, creating an unbreakable chain
- **Daily Log Rotation**: Automatic file rotation with compression
- **Batch Writing**: Entries are batched for performance (100 entries or 5 seconds)
- **Structured Logging**: Winston-based JSON logging for easy parsing

### Audit Event Types (26 Total)

#### Authentication Events (8)
```typescript
AUTH_LOGIN = 'auth:login'              // Successful login
AUTH_LOGOUT = 'auth:logout'            // Logout event
AUTH_FAILED_LOGIN = 'auth:failed_login' // Failed login attempt
AUTH_PASSWORD_CHANGE = 'auth:password_change' // Password change
AUTH_MFA_ENABLE = 'auth:mfa_enable'    // MFA enabled
AUTH_MFA_DISABLE = 'auth:mfa_disable'  // MFA disabled
AUTH_TOKEN_ISSUED = 'auth:token_issued' // Token issued
AUTH_TOKEN_REVOKED = 'auth:token_revoked' // Token revoked
```

#### Authorization Events (5)
```typescript
AUTHZ_PERMISSION_GRANTED = 'authz:permission_granted'   // Permission granted
AUTHZ_PERMISSION_DENIED = 'authz:permission_denied'     // Permission denied
AUTHZ_PERMISSION_REVOKED = 'authz:permission_revoked'   // Permission revoked
AUTHZ_ROLE_ASSIGNED = 'authz:role_assigned'             // Role assigned
AUTHZ_ROLE_REMOVED = 'authz:role_removed'               // Role removed
```

#### Data Access Events (5)
```typescript
DATA_READ = 'data:read'           // Data read
DATA_CREATE = 'data:create'       // Data created
DATA_UPDATE = 'data:update'       // Data updated
DATA_DELETE = 'data:delete'       // Data deleted
DATA_EXPORT = 'data:export'       // Data exported
```

#### Configuration Events (5)
```typescript
CONFIG_SETTING_CHANGE = 'config:setting_change'       // Setting changed
CONFIG_CREDENTIAL_CREATE = 'config:credential_create' // Credential created
CONFIG_CREDENTIAL_UPDATE = 'config:credential_update' // Credential updated
CONFIG_CREDENTIAL_DELETE = 'config:credential_delete' // Credential deleted
CONFIG_WORKFLOW_DEPLOY = 'config:workflow_deploy'     // Workflow deployed
CONFIG_WORKFLOW_ROLLBACK = 'config:workflow_rollback' // Workflow rolled back
```

#### Security Events (4)
```typescript
SECURITY_SUSPICIOUS_ACTIVITY = 'security:suspicious_activity'
SECURITY_RATE_LIMIT_EXCEEDED = 'security:rate_limit_exceeded'
SECURITY_INVALID_TOKEN = 'security:invalid_token'
SECURITY_UNAUTHORIZED_ACCESS = 'security:unauthorized_access'
SECURITY_ENCRYPTION_KEY_ROTATION = 'security:encryption_key_rotation'
```

#### Admin Actions (13)
```typescript
ADMIN_USER_CREATE = 'admin:user_create'
ADMIN_USER_UPDATE = 'admin:user_update'
ADMIN_USER_DELETE = 'admin:user_delete'
ADMIN_USER_LOCK = 'admin:user_lock'
ADMIN_USER_UNLOCK = 'admin:user_unlock'
ADMIN_ROLE_CREATE = 'admin:role_create'
ADMIN_ROLE_UPDATE = 'admin:role_update'
ADMIN_ROLE_DELETE = 'admin:role_delete'
ADMIN_BACKUP_CREATE = 'admin:backup_create'
ADMIN_BACKUP_RESTORE = 'admin:backup_restore'
ADMIN_AUDIT_LOG_EXPORT = 'admin:audit_log_export'
```

### Configuration

Set these environment variables to customize the AuditLogger:

```bash
# Secret key for HMAC signing (REQUIRED for production)
AUDIT_LOG_SECRET=your-super-secret-key-change-in-production

# Path to store audit logs
AUDIT_LOG_PATH=/var/log/audit

# Log retention in days
AUDIT_LOG_RETENTION_DAYS=90

# Log level (info, warning, error)
AUDIT_LOG_LEVEL=info
```

### Usage Examples

#### Log Authentication Events

```typescript
// Successful login
await auditLogger.logAuth('user123', 'login', AuditLogResult.SUCCESS,
  { method: 'password' },
  {
    sessionId: 'sess_abc123',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...'
  }
);

// Failed login attempt
await auditLogger.logAuth('user123', 'login', AuditLogResult.FAILURE,
  { reason: 'Invalid password', attempt: 2 },
  { ipAddress: '192.168.1.1' }
);

// MFA enable
await auditLogger.logAuth('user123', 'mfa_enable', AuditLogResult.SUCCESS,
  { method: 'TOTP', deviceCount: 1 }
);
```

#### Log Data Access

```typescript
// User reads a workflow
await auditLogger.logDataAccess('user123', 'workflow_456', 'read', {
  workflowName: 'Customer Email Campaign',
  templateCount: 15
}, {
  correlationId: 'req_xyz789',
  sessionId: 'sess_abc123'
});

// User creates a workflow
await auditLogger.logDataAccess('user123', 'workflow_new', 'create', {
  workflowName: 'New Automation',
  triggers: ['webhook'],
  nodes: 5
});

// User exports workflows
await auditLogger.logDataAccess('user123', 'workflows', 'export', {
  count: 10,
  format: 'json'
});
```

#### Log Configuration Changes

```typescript
// Update workflow
await auditLogger.logConfigChange('user123', 'workflow_123',
  { status: 'active' }, // old value
  { status: 'paused' }, // new value
  { sessionId: 'sess_abc123' }
);

// Create credential
await auditLogger.logConfigChange('user123', 'credential_slack',
  null, // old (didn't exist)
  { type: 'slack_webhook' }, // new
  { sessionId: 'sess_abc123' }
);
```

#### Log Security Events

```typescript
// Suspicious activity detected
await auditLogger.logSecurityEvent(
  AuditEventType.SECURITY_SUSPICIOUS_ACTIVITY,
  AuditSeverity.HIGH,
  { reason: 'Multiple failed logins from different countries' },
  { userId: 'user123', ipAddress: '203.0.113.42' }
);

// Rate limit exceeded
await auditLogger.logSecurityEvent(
  AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED,
  AuditSeverity.WARNING,
  { limit: 100, actual: 250, timeWindow: 60 }
);
```

#### Log Authorization Decisions

```typescript
// Permission granted
await auditLogger.logAuthorization('user123', 'workflow_123', 'execute', true,
  { sessionId: 'sess_abc123' }
);

// Permission denied
await auditLogger.logAuthorization('user123', 'admin_panel', 'view', false,
  { sessionId: 'sess_abc123', reason: 'Insufficient role' }
);
```

#### Log Admin Actions

```typescript
// Create user
await auditLogger.logAdminAction('admin_001', 'create_user', 'user_999',
  { email: 'user@example.com', role: 'viewer' },
  { sessionId: 'sess_admin_123' }
);

// Lock user
await auditLogger.logAdminAction('admin_001', 'lock_user', 'user_123',
  { reason: 'Suspicious activity', duration: 86400 }
);

// Delete role
await auditLogger.logAdminAction('admin_001', 'delete_role', undefined,
  { roleId: 'role_456', roleName: 'CustomRole' }
);
```

### Querying Logs

```typescript
// Get all events for a user in the last 7 days
const userEvents = await auditLogger.query({
  userId: 'user123',
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  endDate: new Date(),
  limit: 1000
});

// Get all failed login attempts
const failedLogins = await auditLogger.query({
  eventType: AuditEventType.AUTH_FAILED_LOGIN,
  result: AuditLogResult.FAILURE,
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
});

// Get critical security events
const criticalEvents = await auditLogger.query({
  eventType: [
    AuditEventType.SECURITY_SUSPICIOUS_ACTIVITY,
    AuditEventType.SECURITY_UNAUTHORIZED_ACCESS
  ],
  severity: AuditSeverity.CRITICAL,
  limit: 100
});

// Paginated query with sorting
const page1 = await auditLogger.query({
  resource: 'user_management',
  limit: 50,
  offset: 0
});

const page2 = await auditLogger.query({
  resource: 'user_management',
  limit: 50,
  offset: 50
});
```

### Verification & Integrity

```typescript
// Verify a single entry's signature
const entry = await auditLogger.query({ userId: 'user123', limit: 1 });
const isValid = auditLogger.verify(entry[0]);
console.log(`Entry signature valid: ${isValid}`);

// Verify entire audit log chain integrity
const allLogs = await auditLogger.query({ limit: 10000 });
const chainValid = auditLogger.verifyChain(allLogs);
console.log(`Audit log chain integrity: ${chainValid ? 'VALID' : 'COMPROMISED'}`);

// If chain is broken, investigate
if (!chainValid) {
  // Alert security team
  // Review backup logs
  // Restore from tamper-proof backup
}
```

### Export Logs

```typescript
// Export as JSON
const jsonExport = await auditLogger.export({
  userId: 'user123',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31')
}, 'json');

fs.writeFileSync('audit_logs_jan.json', jsonExport);

// Export as CSV for Excel
const csvExport = await auditLogger.export({
  eventType: [
    AuditEventType.AUTH_LOGIN,
    AuditEventType.AUTH_FAILED_LOGIN
  ],
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
}, 'csv');

fs.writeFileSync('auth_logs.csv', csvExport);
```

### Get Statistics

```typescript
const stats = await auditLogger.getStatistics();
console.log(`Total audit entries: ${stats.totalEntries}`);
console.log(`Events by type:`, stats.byEventType);
console.log(`Events by result:`, stats.byResult);
console.log(`Events by severity:`, stats.bySeverity);
console.log(`Events by user:`, stats.byUser);
console.log(`Date range:`, {
  oldest: stats.dateRange.oldest,
  newest: stats.dateRange.newest
});
```

---

## 4. SecurityEventLogger

The `SecurityEventLogger` is a specialized logging system for security-related events with real-time threat detection and analysis.

### Features

- **Threat Scoring**: 0-100 threat score based on severity and indicators
- **Anomaly Detection**: Detects impossible travel, brute force, unusual patterns
- **IP Reputation Tracking**: Tracks suspicious IPs and builds reputation scores
- **Real-time Alerts**: Emits events for critical security issues
- **Breach Detection**: Identifies indicators of compromise
- **Pattern Recognition**: Detects attack patterns and sequences

### Security Severity Levels

```typescript
SecuritySeverity.INFO      // 10 points - Informational
SecuritySeverity.LOW       // 25 points - Low risk
SecuritySeverity.MEDIUM    // 50 points - Medium risk
SecuritySeverity.HIGH      // 75 points - High risk
SecuritySeverity.CRITICAL  // 95 points - Critical
```

### Security Event Categories

```typescript
SecurityCategory.AUTH                    // Authentication events
SecurityCategory.RATE_LIMIT              // Rate limiting violations
SecurityCategory.TOKEN                   // Token-related issues
SecurityCategory.PERMISSION              // Permission escalation attempts
SecurityCategory.DATA_EXFILTRATION       // Data theft indicators
SecurityCategory.INJECTION               // Code/SQL injection attempts
SecurityCategory.API_ABUSE               // API misuse
SecurityCategory.CONFIG_TAMPERING        // Configuration changes
SecurityCategory.CREDENTIAL_COMPROMISE   // Compromised credentials
SecurityCategory.SESSION_HIJACKING       // Session hijacking attempts
SecurityCategory.SUSPICIOUS_PATTERN      // Unusual patterns
```

### Usage Examples

#### Log Failed Authentication

```typescript
import { SecurityEventLogger, SecuritySeverity } from './src/audit/SecurityEventLogger';
const securityLogger = new SecurityEventLogger();

// Simple failed auth
await securityLogger.logFailedAuth('user123', 'invalid_password', {
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
  country: 'US'
});

// Failed auth with multiple attempts
for (let i = 0; i < 5; i++) {
  await securityLogger.logFailedAuth('user456', 'invalid_password', {
    ipAddress: '203.0.113.50',
    country: 'CN'
  });
}
// System will detect brute force pattern and increase threat score
```

#### Log Injection Attempts

```typescript
// SQL injection attempt
await securityLogger.logInjectionAttempt(
  'SQL',
  "'; DROP TABLE users; --",
  {
    userId: 'attacker_001',
    ipAddress: '198.51.100.42',
    parameterName: 'search',
    endpoint: '/api/workflows'
  }
);

// Script injection attempt
await securityLogger.logInjectionAttempt(
  'XSS',
  '<script>alert("xss")</script>',
  {
    ipAddress: '198.51.100.42',
    parameterName: 'description',
    endpoint: '/api/workflows'
  }
);
```

#### Log Rate Limit Violations

```typescript
// Minor rate limit breach
await securityLogger.logRateLimitViolation('/api/workflows', 100, 150,
  {
    ipAddress: '192.168.1.1',
    timeWindow: 60 // seconds
  }
);

// Severe rate limit breach (3x limit)
await securityLogger.logRateLimitViolation('/api/execute', 10, 35,
  {
    userId: 'user789',
    ipAddress: '203.0.113.99',
    timeWindow: 60
  }
);
```

#### Log Permission Escalation Attempts

```typescript
// Attempt to escalate from viewer to admin
await securityLogger.logPermissionEscalation('user123', 'admin',
  {
    ipAddress: '192.168.1.1',
    currentRole: 'viewer',
    method: 'token_manipulation'
  }
);
```

#### Log Data Exfiltration

```typescript
// Large data export
await securityLogger.logDataExfiltration(
  'Exported 500 workflows to CSV',
  512 * 1024 * 1024, // 512 MB
  {
    userId: 'user_suspicious_001',
    ipAddress: '203.0.113.1',
    dataType: 'workflows',
    destination: 'external_email@attacker.com'
  }
);
```

#### Log Suspicious Activity

```typescript
// Unusual IP location
await securityLogger.logSuspiciousActivity(
  'Login from new location',
  SecuritySeverity.MEDIUM,
  {
    userId: 'user456',
    ipAddress: '203.0.113.100',
    indicators: ['new_location', 'unusual_time'],
    riskFactors: ['Previous logins from US', 'Login from UK at 3 AM UTC']
  }
);
```

### Threat Analysis

```typescript
// Analyze threat patterns for a user over 1 hour
const analysis = securityLogger.analyzePattern('user123', 3600000);

console.log(`User: ${analysis.userId}`);
console.log(`Event count: ${analysis.eventCount}`);
console.log(`Suspicious events: ${analysis.suspiciousEvents}`);
console.log(`Risk score: ${analysis.riskScore}/100`);
console.log(`Patterns detected:`, {
  failedLogins: analysis.patterns.failedLogins,
  unusualLocations: analysis.patterns.unusualLocations,
  rapidRequests: analysis.patterns.rapidRequests,
  abnormalBehavior: analysis.patterns.abnormalBehavior
});
console.log(`Recommendations:`, analysis.recommendations);

// Output might be:
// User: user123
// Event count: 15
// Suspicious events: 5
// Risk score: 72/100
// Patterns detected: {
//   failedLogins: 6,
//   unusualLocations: 2,
//   rapidRequests: 3,
//   abnormalBehavior: 1
// }
// Recommendations: [
//   'Enforce MFA for this user',
//   'Reset user password',
//   'Temporarily suspend account',
//   'Conduct security audit'
// ]
```

### Detect Impossible Travel

```typescript
// Check if user's last two logins are geographically impossible
const impossibleTravel = securityLogger.detectImpossibleTravel('user789');

if (impossibleTravel.detected) {
  console.log('ALERT: Impossible travel detected!');
  console.log(`Score: ${impossibleTravel.score}/100`);
  console.log('Indicators:', impossibleTravel.indicators);
  // Take action: lock account, require MFA, etc.
}
```

### Event Listeners

```typescript
// Listen for security events
securityLogger.on('event:logged', ({ event }) => {
  console.log(`Event logged: ${event.eventType}`);
});

// Listen for security alerts (high/critical events)
securityLogger.on('alert:triggered', ({ event, timestamp, alertLevel }) => {
  console.error(`SECURITY ALERT [${alertLevel}]: ${event.description}`);
  // Send to SIEM, trigger incident response, etc.
});
```

### Get Statistics

```typescript
const stats = securityLogger.getStatistics(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
  new Date()
);

console.log(`Total events: ${stats.totalEvents}`);
console.log(`Critical events: ${stats.eventsBySeverity.CRITICAL}`);
console.log(`High severity: ${stats.eventsBySeverity.HIGH}`);
console.log(`By category:`, stats.eventsByCategory);
console.log(`Top threatened users:`, stats.topThreatenedUsers);
console.log(`Top threatened IPs:`, stats.topThreatenedIPs);
console.log(`Average threat score: ${stats.averageThreatScore}/100`);
```

### Export Security Events

```typescript
// Export as JSON
const jsonExport = securityLogger.exportJSON(
  new Date('2025-01-01'),
  new Date('2025-01-31')
);

// Export as CSV
const csvExport = securityLogger.exportCSV(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  new Date()
);
```

### Verify Event Chain Integrity

```typescript
const integrity = securityLogger.verifyIntegrity();

if (!integrity.valid) {
  console.error('CRITICAL: Security event log has been tampered with!');
  console.error('Integrity errors:', integrity.errors);
  // Alert security team
  // Restore from backup
}
```

---

## 5. ComplianceReporter

The `ComplianceReporter` generates comprehensive compliance reports for various regulatory frameworks.

### Supported Frameworks

1. **SOC 2 Type II** - 45+ controls covering:
   - CC1-CC9: Control environment, communication, risk assessment
   - A1: Availability
   - C1: Confidentiality
   - I1-I3: Integrity
   - P1-P8: Privacy

2. **ISO 27001:2022** - 93 controls covering:
   - A.1: Organizational controls
   - A.5: Access control
   - A.6: Cryptography
   - A.7: Physical/environmental security
   - A.8: Operations security
   - A.13: Communication security

3. **PCI DSS 4.0** - 12 requirements:
   - Requirement 1: Firewall configuration
   - Requirement 2: Default passwords
   - Requirement 3: Stored data protection
   - Requirement 4: Transmission security
   - Requirement 5: Malware protection
   - Requirement 6: Secure software
   - Requirement 7: Access control
   - Requirement 8: Identification/authentication
   - Requirement 9: Physical access
   - Requirement 10: Logging and monitoring
   - Requirement 11: Testing
   - Requirement 12: Policy

4. **HIPAA Security Rule** - 25+ controls:
   - Administrative safeguards
   - Physical safeguards
   - Technical safeguards
   - Policies and procedures
   - Documentation

5. **GDPR** - 30+ articles:
   - Chapter I: General provisions
   - Chapter II: Principles
   - Chapter III: Rights of data subject
   - Chapter IV: Controller and processor
   - Chapter V: Transfers
   - Chapter VI: Independent authorities
   - Chapter VII: Cooperation and consistency

### Generate Compliance Report

```typescript
import { ComplianceReporter } from './src/compliance/reporting/ComplianceReporter';

const reporter = new ComplianceReporter();

const report = await reporter.generateReport(
  'SOC2', // framework
  'annual', // reportType: 'initial', 'annual', 'interim', 'remediation'
  'compliance@company.com', // generatedBy (user email)
  {
    controlAssessments: [
      {
        controlId: 'CC1.1',
        status: 'compliant', // 'compliant', 'non_compliant', 'partial', 'not_assessed'
        assessedBy: 'compliance@company.com',
        assessedAt: new Date(),
        findings: ['Control is properly implemented']
      },
      {
        controlId: 'CC1.2',
        status: 'partial',
        assessedBy: 'compliance@company.com',
        assessedAt: new Date(),
        findings: ['Needs update to policy documentation']
      },
      // ... 43 more controls
    ],
    gaps: [
      {
        gapId: 'gap_001',
        controlId: 'CC1.2',
        severity: 'high', // 'low', 'medium', 'high', 'critical'
        status: 'open', // 'open', 'in_progress', 'resolved'
        description: 'Missing backup testing documentation',
        remediationPlan: 'Implement quarterly backup restoration tests',
        targetDate: new Date('2025-03-31'),
        assignee: 'ops@company.com'
      }
    ],
    totalControls: 45,
    evidenceCount: 150, // Number of evidence documents
    attestationCount: 30 // Number of attestations
  },
  {
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31')
  }
);

console.log(`Compliance Score: ${report.summary.complianceScore}%`);
console.log(`Compliant Controls: ${report.summary.compliantControls}/${report.summary.totalControls}`);
console.log(`Critical Findings: ${report.summary.criticalFindings}`);
console.log(`Open Gaps: ${report.summary.openGaps}`);
console.log(`Recommendations:`, report.recommendations);
```

### Report Structure

```typescript
interface ComplianceReport {
  id: string;
  framework: 'SOC2' | 'ISO27001' | 'PCIDSS' | 'HIPAA' | 'GDPR';
  reportType: 'initial' | 'annual' | 'interim' | 'remediation';
  generatedAt: Date;
  generatedBy: string; // User email
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalControls: number;
    compliantControls: number;
    complianceScore: number; // 0-100 percentage
    criticalFindings: number;
    openGaps: number;
  };
  controlAssessments: ControlAssessment[];
  gaps: ComplianceGap[];
  recommendations: string[];
  evidenceCount: number;
  attestationCount: number;
  format: 'json' | 'pdf' | 'html';
}
```

### Export Reports

```typescript
// Export to JSON
const jsonReport = await reporter.exportToJSON(report);
fs.writeFileSync('soc2_report_2025.json', jsonReport);

// Export to CSV (control assessments)
const csvReport = await reporter.exportToCSV(report);
fs.writeFileSync('soc2_controls.csv', csvReport);

// The CSV will contain columns:
// Control ID, Status, Assessed By, Assessed At, Findings
```

### Track Control Compliance

```typescript
// Create a control compliance tracker
const controls = new Map<string, ControlStatus>();

controls.set('CC1.1', {
  name: 'Risk Assessment',
  status: 'compliant',
  evidenceFiles: ['risk_assessment_2025.pdf', 'audit_results.pdf'],
  lastAssessed: new Date('2025-01-15'),
  nextReview: new Date('2026-01-15')
});

controls.set('A5.1.1', { // ISO 27001
  name: 'Approval Process',
  status: 'partial',
  evidenceFiles: ['access_policy.pdf'],
  lastAssessed: new Date('2025-01-10'),
  nextReview: new Date('2025-04-10'),
  remediationPlan: 'Implement approval workflow by March 31'
});
```

---

## 6. LogAnalyzer

The `LogAnalyzer` provides advanced search, correlation, and analysis capabilities for audit logs.

### Features

- **Full-Text Search**: Regex, wildcard, and phrase search
- **Field Indexing**: Fast indexed searches on common fields
- **Faceted Search**: Drill-down analysis by field values
- **Correlation**: Link related events by session, user, workflow
- **Anomaly Detection**: Statistical anomaly detection
- **Pattern Recognition**: Find common action sequences
- **User Behavior Profiling**: Build baseline behavior models
- **Timeline Building**: Create chronological event sequences

### Advanced Search

```typescript
import { LogAnalyzer } from './src/audit/LogAnalyzer';

const analyzer = new LogAnalyzer();

// Add logs to analyzer
const logs = await auditLogger.query({ limit: 10000 });
analyzer.addLogs(logs);

// Simple search
const results = await analyzer.search({
  search: 'failed',
  limit: 50
});

// Advanced search with filters
const advancedResults = await analyzer.search({
  search: 'error OR failed',
  filters: {
    eventType: ['auth:login', 'auth:failed_login'],
    severity: ['high', 'critical'],
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    },
    result: ['failure'],
    action: ['login', 'create']
  },
  sort: [
    { field: 'timestamp', order: 'desc' },
    { field: 'severity', order: 'asc' }
  ],
  limit: 100,
  offset: 0,
  facets: ['userId', 'eventType', 'severity', 'ipAddress'],
  aggregations: [
    { field: 'timestamp', type: 'count' },
    { field: 'severity', type: 'count' },
    { field: 'duration', type: 'avg' }
  ]
});

// Results include facets for drill-down
console.log('Events by User:', advancedResults.facets.get('userId'));
console.log('Events by Type:', advancedResults.facets.get('eventType'));
console.log('Events by Severity:', advancedResults.facets.get('severity'));
```

### Search Syntax

```typescript
// Simple text search (substring match, case-insensitive)
await analyzer.search({ search: 'workflow' });

// Wildcard search (use * for any characters)
await analyzer.search({ search: 'wf_*_main' });

// Regex search (wrap in slashes)
await analyzer.search({ search: '/^wf_[0-9]+$/' });

// Complex boolean search
await analyzer.search({ search: '(failed OR error) AND auth' });
```

### Correlate Events

```typescript
// Get event with ID
const eventId = results.hits[0].id;

// Correlate with related events
const correlated = await analyzer.correlate(eventId);

console.log(`Root event: ${correlated.rootEvent.eventType}`);
console.log(`Correlation type: ${correlated.correlationType}`);
console.log(`Correlation score: ${correlated.correlationScore}`);
console.log(`Related events: ${correlated.relatedEvents.length}`);
console.log(`Timeline:`, correlated.timeline.map(e => ({
  timestamp: e.timestamp,
  eventType: e.eventType,
  action: e.action
})));

// Timeline shows event progression:
// [
//   { timestamp: "2025-01-15T10:05:30Z", eventType: "auth:login", action: "login" },
//   { timestamp: "2025-01-15T10:05:45Z", eventType: "data:read", action: "read" },
//   { timestamp: "2025-01-15T10:06:00Z", eventType: "data:update", action: "update" }
// ]
```

### Build User Timeline

```typescript
const timeline = await analyzer.buildTimeline('user123', {
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  end: new Date()
});

console.log(`User: ${timeline.userId}`);
console.log(`Total events: ${timeline.events.length}`);
console.log(`Sessions: ${timeline.sessions.length}`);

// Analyze sessions
for (const session of timeline.sessions) {
  console.log(`\nSession ${session.sessionId}`);
  console.log(`  Start: ${session.startTime}`);
  console.log(`  IP: ${session.ipAddress}`);
  console.log(`  Events: ${session.eventCount}`);
  console.log(`  Success: ${session.success}, Failures: ${session.failures}`);
  console.log(`  Actions: ${session.actions.join(', ')}`);
}

// Analyze activity heatmap
console.log('\nActivity by hour (day-hour):');
for (const [key, count] of timeline.activityHeatmap.entries()) {
  console.log(`  ${key}: ${count} events`);
}
```

### Detect Anomalies

```typescript
// Detect anomalies in the last 30 days
const anomalies = await analyzer.detectAnomalies({
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  end: new Date()
}, 0.85); // 85% sensitivity (0-1 scale)

console.log(`Anomalies detected: ${anomalies.length}`);

for (const anomaly of anomalies) {
  console.log(`\nAnomaly ID: ${anomaly.id}`);
  console.log(`  Type: ${anomaly.type}`);
  console.log(`  Severity: ${anomaly.severity}`);
  console.log(`  Score: ${anomaly.score}`);
  console.log(`  Reason: ${anomaly.reason}`);
  console.log(`  Context:`, anomaly.context);
}

// Anomaly types:
// - unusual-failure: High failure rate
// - unusual-action: Performing uncommon action
// - unusual-time: Activity outside typical hours
// - critical-event: Critical security event
```

### Analyze Patterns

```typescript
// Analyze patterns for 'auth:login' events
const patterns = await analyzer.analyzePatterns('auth:login', {
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  end: new Date()
});

console.log(`Event type: ${patterns.eventType}`);
console.log(`Total events: ${patterns.totalEvents}`);

console.log('\nCommon action sequences:');
for (const seq of patterns.commonActionSequences) {
  console.log(`  ${seq.join(' -> ')}`);
}

console.log('\nFrequency distribution:');
for (const [action, count] of patterns.frequencyDistribution.entries()) {
  console.log(`  ${action}: ${count}`);
}

console.log('\nTime distribution (hourly):');
for (const [hour, count] of patterns.timeDistribution.entries()) {
  console.log(`  ${hour}: ${count}`);
}
```

### Get User Behavior Profile

```typescript
// Build behavior profile for a user
const profile = await analyzer.getUserBehaviorProfile('user456');

console.log(`User: ${profile.userId}`);
console.log(`Total events: ${profile.totalEvents}`);
console.log(`Actions per hour: ${profile.actionsPerHour}`);
console.log(`Failure rate: ${(profile.failureRate * 100).toFixed(2)}%`);
console.log(`Risk score: ${profile.riskScore}/100`);
console.log(`Last activity: ${profile.lastActivity}`);

console.log('\nCommon actions:', profile.commonActions);
console.log('Common resources:', profile.commonResources);
console.log('Typical working hours:', `${profile.typicalWorkingHours.start}:00-${profile.typicalWorkingHours.end}:00`);
console.log('Event frequency:', Object.fromEntries(profile.eventFrequency));
```

### Get Statistics

```typescript
// Top 10 users by event count
const topUsers = await analyzer.getTopStats('userId', 10, {
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  end: new Date()
});

for (const stat of topUsers) {
  console.log(`${stat.value}: ${stat.count} events (${stat.percentage.toFixed(2)}%)`);
}

// Top resources accessed
const topResources = await analyzer.getTopStats('resource', 10, {
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  end: new Date()
});

console.log('Top accessed resources:', topResources);
```

### Trend Analysis

```typescript
// Analyze failure rate trend
const trend = await analyzer.getTrendData('result', '1h', { // 1 hour intervals
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  end: new Date()
});

console.log(`Field: ${trend.field}`);
console.log(`Interval: ${trend.interval}`);
console.log(`Trend: ${trend.trend}`);
console.log(`Change: ${trend.changePercent.toFixed(2)}%`);
console.log(`Average: ${trend.average}`);

// Plot trend data
for (const point of trend.dataPoints) {
  console.log(`${point.timestamp}: ${point.value} (${point.count} entries)`);
}
```

### Find Similar Events

```typescript
// Find events similar to a specific event
const eventId = results.hits[0].id;
const similarEvents = await analyzer.findSimilarEvents(eventId, 0.80); // 80% similarity

console.log(`Found ${similarEvents.length} similar events`);

for (const event of similarEvents.slice(0, 5)) {
  console.log(`- ${event.eventType}: ${event.action} (${event.resource})`);
}
```

### Export Results

```typescript
// Export search results as JSON
const jsonExport = await analyzer.exportSearchResults(
  {
    search: 'error',
    limit: 100
  },
  'json'
);

fs.writeFileSync('search_results.json', jsonExport);

// Export as CSV
const csvExport = await analyzer.exportSearchResults(
  {
    filters: {
      severity: ['high', 'critical'],
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      }
    }
  },
  'csv'
);

fs.writeFileSync('critical_events.csv', csvExport);
```

### Visualization Data

```typescript
// Get data for dashboards and charts
const vizData = await analyzer.getVisualizationData({
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  end: new Date()
});

console.log('Summary:', vizData.summary);
// {
//   total: 5000,
//   successRate: 0.95,
//   failureRate: 0.05,
//   criticalCount: 2,
//   highCount: 15
// }

console.log('Distributions:', vizData.distributions);
// {
//   byEventType: { 'auth:login': 2000, 'data:read': 1500, ... },
//   bySeverity: { 'low': 4500, 'medium': 450, 'high': 40, 'critical': 10 },
//   byResult: { 'success': 4750, 'failure': 250 }
// }

console.log('Hourly activity:', vizData.timeSeries.hourlyActivity);
// [ { hour: 0, count: 50 }, { hour: 1, count: 45 }, ... ]

console.log('Top stats:', vizData.topStats);
// {
//   users: [ { value: 'user123', count: 200, percentage: 4 }, ... ],
//   resources: [ { value: 'workflow_456', count: 150, percentage: 3 }, ... ]
// }
```

---

## 7. Integration Examples

### Complete Express.js Application

```typescript
import express from 'express';
import { auditLogger, createAuditMiddleware } from './src/audit/AuditLogger';
import { securityEventLogger } from './src/audit/SecurityEventLogger';
import { LogAnalyzer } from './src/audit/LogAnalyzer';

const app = express();

// Add audit middleware to all routes
app.use(createAuditMiddleware({
  excludePaths: ['/health', '/metrics', '/api/health'],
  logAllRequests: true
}));

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || '';

  try {
    // Authenticate user
    const user = await authenticateUser(email, password);

    // Log successful login
    await auditLogger.logAuth(user.id, 'login', 'success', {
      method: 'password',
      email
    }, {
      ipAddress,
      userAgent: req.get('user-agent')
    });

    res.json({ token: user.token });
  } catch (error) {
    // Log failed login
    await auditLogger.logAuth(email, 'login', 'failure', {
      reason: 'Invalid credentials'
    }, {
      ipAddress,
      userAgent: req.get('user-agent')
    });

    // Log security event
    await securityEventLogger.logFailedAuth(email, 'invalid_password', {
      ipAddress,
      userAgent: req.get('user-agent')
    });

    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Workflow execution endpoint
app.post('/api/workflows/:id/execute', async (req, res) => {
  const workflowId = req.params.id;
  const userId = req.user?.id;
  const correlationId = req.get('x-correlation-id') || generateId();

  try {
    // Check authorization
    const authorized = await checkAuthorization(userId, 'execute', workflowId);

    await auditLogger.logAuthorization(userId, workflowId, 'execute', authorized, {
      sessionId: req.sessionID,
      ipAddress: req.ip,
      correlationId
    });

    if (!authorized) {
      await securityEventLogger.logPermissionEscalation(userId, 'workflow_executor', {
        ipAddress: req.ip,
        currentRole: req.user?.role
      });
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Execute workflow
    const execution = await executeWorkflow(workflowId);

    await auditLogger.logDataAccess(userId, workflowId, 'execute', {
      executionId: execution.id,
      status: execution.status,
      duration: execution.duration
    }, {
      correlationId,
      sessionId: req.sessionID
    });

    res.json({ executionId: execution.id, status: 'started' });
  } catch (error) {
    await auditLogger.log({
      eventType: 'data:read',
      userId,
      resource: workflowId,
      action: 'execute',
      result: 'failure',
      severity: 'high',
      metadata: { error: error.message }
    }, {
      correlationId,
      sessionId: req.sessionID
    });

    res.status(500).json({ error: 'Execution failed' });
  }
});

// Audit log search endpoint
app.get('/api/admin/audit-logs', async (req, res) => {
  const { userId, eventType, startDate, endDate, limit } = req.query;

  try {
    const results = await auditLogger.query({
      userId: userId as string,
      eventType: eventType as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: parseInt(limit as string) || 100
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Security dashboard endpoint
app.get('/api/admin/security-dashboard', async (req, res) => {
  const stats = securityEventLogger.getStatistics(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    new Date()
  );

  res.json(stats);
});

// Analytics endpoint
app.get('/api/admin/analytics', async (req, res) => {
  const analyzer = new LogAnalyzer();
  const logs = await auditLogger.query({ limit: 10000 });
  analyzer.addLogs(logs);

  const vizData = await analyzer.getVisualizationData({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });

  res.json(vizData);
});

// Compliance reporting endpoint
app.get('/api/admin/compliance/soc2', async (req, res) => {
  const reporter = new ComplianceReporter();

  // Get control assessments from your database
  const assessments = await getSOC2ControlAssessments();
  const gaps = await getComplianceGaps('SOC2');

  const report = await reporter.generateReport(
    'SOC2',
    'annual',
    req.user.email,
    {
      controlAssessments: assessments,
      gaps: gaps,
      totalControls: 45,
      evidenceCount: 150,
      attestationCount: 30
    },
    {
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31')
    }
  );

  res.json(report);
});

// Start server
app.listen(3000, () => {
  console.log('Server running on port 3000 with audit logging enabled');
});
```

### Real-Time Monitoring with WebSocket

```typescript
import { Server as SocketIO } from 'socket.io';
import { securityEventLogger } from './src/audit/SecurityEventLogger';

const io = new SocketIO(server);

// Broadcast security alerts to connected admins
securityEventLogger.on('alert:triggered', ({ event, alertLevel }) => {
  io.to('admins').emit('security-alert', {
    id: event.id,
    timestamp: event.timestamp,
    severity: alertLevel,
    description: event.description,
    userId: event.userId,
    ipAddress: event.ipAddress,
    threatScore: event.threatIndicators.score
  });
});

// Broadcast audit events (low frequency for performance)
let eventBuffer = [];
setInterval(() => {
  if (eventBuffer.length > 0) {
    io.to('compliance-team').emit('audit-events-batch', eventBuffer);
    eventBuffer = [];
  }
}, 5000);

securityEventLogger.on('event:logged', ({ event }) => {
  eventBuffer.push({
    timestamp: event.timestamp,
    eventType: event.eventType,
    userId: event.userId
  });
});
```

### Scheduled Compliance Reports

```typescript
import cron from 'node-cron';
import { ComplianceReporter } from './src/compliance/reporting/ComplianceReporter';
import nodemailer from 'nodemailer';

const mailer = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Daily security summary email
cron.schedule('0 9 * * *', async () => {
  const stats = securityEventLogger.getStatistics(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    new Date()
  );

  const emailBody = `
    <h2>Daily Security Summary</h2>
    <p>Total Events: ${stats.totalEvents}</p>
    <p>Critical: ${stats.eventsBySeverity.CRITICAL}</p>
    <p>High: ${stats.eventsBySeverity.HIGH}</p>
    <p>Top Threatened Users: ${stats.topThreatenedUsers.slice(0, 5)
      .map(u => `${u.userId} (${u.riskScore} risk)`).join(', ')}</p>
  `;

  await mailer.sendMail({
    to: 'security@company.com',
    subject: 'Daily Security Summary',
    html: emailBody
  });
});

// Weekly compliance report
cron.schedule('0 8 * * MON', async () => {
  const reporter = new ComplianceReporter();

  const report = await reporter.generateReport(
    'SOC2',
    'interim',
    'compliance@company.com',
    {
      controlAssessments: await getControlAssessments(),
      gaps: await getGaps(),
      totalControls: 45,
      evidenceCount: 150,
      attestationCount: 30
    },
    {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    }
  );

  const jsonReport = await reporter.exportToJSON(report);

  await mailer.sendMail({
    to: 'compliance-team@company.com',
    subject: 'Weekly Compliance Report',
    attachments: [
      {
        filename: `soc2_weekly_${new Date().toISOString().split('T')[0]}.json`,
        content: jsonReport
      }
    ]
  });
});

// Monthly audit log archival
cron.schedule('0 0 1 * *', async () => {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
  const endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

  // Export logs
  const jsonExport = await auditLogger.export({
    startDate,
    endDate
  }, 'json');

  // Compress and store in archive
  const filename = `audit_${startDate.getFullYear()}_${String(startDate.getMonth() + 1).padStart(2, '0')}.json.gz`;
  const filepath = `/archive/audit_logs/${filename}`;

  // Save to immutable storage (S3, etc.)
  await uploadToArchiveStorage(filepath, jsonExport);

  console.log(`Archived ${filename}`);
});
```

---

## 8. Best Practices

### Logging Best Practices

#### What to Log

- All authentication events (success and failures)
- Authorization decisions (grants and denials)
- Data access and modifications
- Configuration changes
- Administrative actions
- Security events and anomalies
- All API calls (at minimum status and duration)

#### What NOT to Log

- Passwords or password hashes
- API keys or tokens
- Personally identifiable information (PII) without justification
- Encryption keys or private keys
- Credit card numbers
- Health records (PHI)
- Confidential business information

#### Sensitive Data Handling

```typescript
// Good: Log action without sensitive data
await auditLogger.logAuth('user123', 'login', 'success', {
  method: 'password', // Don't log the password itself
  mfaUsed: true
});

// Good: Redact sensitive data
const sanitizeData = (data) => {
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret'];
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) =>
      sensitiveKeys.some(sk => k.toLowerCase().includes(sk))
        ? [k, '[REDACTED]']
        : [k, v]
    )
  );
};

await auditLogger.logConfigChange('user123', 'credential',
  sanitizeData(oldValue),
  sanitizeData(newValue)
);
```

#### Log Retention

```bash
# In .env or environment
AUDIT_LOG_RETENTION_DAYS=90    # General audit logs
AUDIT_LOG_RETENTION_DAYS=365   # For compliance (SOC2, ISO27001)
AUDIT_LOG_RETENTION_DAYS=2555  # For HIPAA (7 years)
```

#### Performance Optimization

```typescript
// Good: Use batch operations
const operations = [
  { userId: 'user1', action: 'login' },
  { userId: 'user2', action: 'read' },
  { userId: 'user3', action: 'update' }
];

// Batch write instead of individual calls
for (const op of operations) {
  await auditLogger.log({
    userId: op.userId,
    action: op.action,
    // ...
  });
}
// Automatically batched and flushed

// Good: Ensure flush before shutdown
process.on('SIGTERM', async () => {
  await auditLogger.ensureFlush();
  process.exit(0);
});
```

### Security Best Practices

#### Secret Key Management

```typescript
// WRONG: Hardcoded secret
const secret = 'my-super-secret-key';

// RIGHT: Use environment variables
const secret = process.env.AUDIT_LOG_SECRET;

// RIGHT: Use secure secret management
import { secretsManager } from './services/SecretsManager';
const secret = await secretsManager.getSecret('audit-log-secret');

// RIGHT: Rotate secrets periodically
// Implement key rotation every 90 days
// Maintain old keys for log verification during transition
const currentSecret = process.env.AUDIT_LOG_SECRET;
const previousSecret = process.env.AUDIT_LOG_SECRET_PREVIOUS;
```

#### Log Access Control

```typescript
// Restrict audit log access to authorized users
app.get('/api/audit-logs', requireRole(['admin', 'compliance']), async (req, res) => {
  const logs = await auditLogger.query({
    // filters from request
  });
  res.json(logs);
});

// Log who accesses the audit logs
app.get('/api/audit-logs', async (req, res) => {
  // ... authorization and query ...

  // Log this audit log access itself!
  await auditLogger.logDataAccess(req.user.id, 'audit_logs', 'read', {
    filter: req.query,
    resultCount: results.length
  });

  res.json(results);
});
```

#### Tamper Detection

```typescript
// Regular integrity checks
setInterval(async () => {
  const logs = await auditLogger.query({ limit: 10000 });
  const chainValid = auditLogger.verifyChain(logs);

  if (!chainValid) {
    // CRITICAL: Audit log has been tampered with
    await alertSecurityTeam('CRITICAL: Audit log tampering detected');

    // Disable certain operations
    // Require incident response
    // Restore from backup
  }
}, 24 * 60 * 60 * 1000); // Daily check
```

#### Alert Configuration

```typescript
// Configure different alert channels based on severity
securityEventLogger.on('alert:triggered', async ({ event, alertLevel }) => {
  if (event.severity === SecuritySeverity.CRITICAL) {
    // CRITICAL: Page on-call
    await pagingService.alertOncall(event);
    // Send to SIEM
    await siemService.sendEvent(event);
    // Create incident
    await incidentService.createCritical(event);
  } else if (event.severity === SecuritySeverity.HIGH) {
    // HIGH: Email security team
    await emailService.sendAlert(event);
    // Send to SIEM
    await siemService.sendEvent(event);
  } else {
    // MEDIUM/LOW: Log to dashboard
    await dashboardService.logEvent(event);
  }
});
```

### Compliance Best Practices

#### Regular Reporting

```typescript
// SOC2: Generate quarterly reports
cron.schedule('0 0 1 */3 *', async () => {
  const reporter = new ComplianceReporter();
  const report = await generateSOC2Report();
  await archiveReport(report);
  await notifyAuditor(report);
});

// ISO27001: Annual report
cron.schedule('0 0 1 1 *', async () => {
  const reporter = new ComplianceReporter();
  const report = await generateISO27001Report();
  await submitToAuditor(report);
});

// GDPR: Monthly DPA checks
cron.schedule('0 0 1 * *', async () => {
  const dpas = await getDPAs();
  await dataSubjectRights.processRequests(dpas);
});
```

#### Evidence Collection

```typescript
// Automatically collect evidence
const evidenceCollector = {
  logAuditTrail: async () => {
    const logs = await auditLogger.query({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    });
    return {
      type: 'AUDIT_TRAIL',
      data: logs,
      timestamp: new Date()
    };
  },

  logAccessControl: async () => {
    const acl = await getRoleBasedAccessControl();
    return {
      type: 'ACCESS_CONTROL',
      data: acl,
      timestamp: new Date()
    };
  },

  logSecurityEvents: async () => {
    const stats = securityEventLogger.getStatistics();
    return {
      type: 'SECURITY_STATS',
      data: stats,
      timestamp: new Date()
    };
  }
};

// Collect evidence monthly
cron.schedule('0 0 1 * *', async () => {
  const evidence = await Promise.all([
    evidenceCollector.logAuditTrail(),
    evidenceCollector.logAccessControl(),
    evidenceCollector.logSecurityEvents()
  ]);

  await storeEvidence(evidence);
});
```

#### Gap Tracking

```typescript
// Track and remediate compliance gaps
const gapTracker = new Map<string, {
  framework: string;
  controlId: string;
  status: 'open' | 'in_progress' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  targetDate: Date;
  assignee: string;
}>();

// Monitor gap remediation
cron.schedule('0 9 * * *', async () => {
  const today = new Date();

  for (const [gapId, gap] of gapTracker.entries()) {
    if (gap.status === 'open' && gap.targetDate <= today) {
      // GAP OVERDUE
      await alertManager.sendOverdueGapAlert(gap);
    } else if (gap.status === 'in_progress') {
      // Check progress
      const progress = await getGapRemediationProgress(gapId);
      if (progress < 50 && daysUntilTarget(gap.targetDate) < 7) {
        await alertManager.sendProgressAlert(gap, progress);
      }
    }
  }
});
```

---

## 9. Compliance Frameworks

### SOC 2 Type II

**Purpose**: Audit report for service organizations covering security, availability, processing integrity, confidentiality, and privacy.

**Report Components**:
- Description of system
- Control environment
- Communication and information
- Risk assessment
- 45+ control objectives with test results
- Management attestation
- Auditor's opinion

**Key Controls**:
- Access control (CC6, CC7)
- Data protection (C1)
- Incident response (PI1)
- Backup and recovery (A1)
- Logging and monitoring (AI1, AI2)
- Change management (CC7)

**Reporting Frequency**: Typically annual, sometimes interim

**Evidence Requirements**:
- Policies and procedures
- Training records
- Access logs
- Incident reports
- System change records
- Backup test results

### ISO 27001:2022

**Purpose**: Information Security Management System (ISMS) certification for all organizational types.

**Key Sections**:
- **A.1-A.4**: Organizational controls
- **A.5**: Access control (25+ controls)
- **A.6**: Cryptography
- **A.7**: Physical/environmental security
- **A.8**: Operations security
- **A.9-A.12**: Communications and systems
- **A.13**: Supplier relationships
- **A.14**: Information security incident management
- **A.15-A.18**: Compliance, human resources, asset management

**Control Assessment Process**:
1. Control design review
2. Operating effectiveness testing
3. Evidence collection
4. Gap identification
5. Remediation planning
6. Audit and certification

### PCI DSS 4.0

**Purpose**: Payment Card Industry Data Security Standard for organizations handling credit cards.

**12 Requirements**:
1. **Firewall Configuration**: Network segmentation
2. **Default Passwords**: Change vendor defaults
3. **Data Protection**: Encrypt sensitive data
4. **Transmission Security**: Secure protocols only
5. **Malware**: Anti-malware programs
6. **Secure Software**: Regular patching
7. **Access Control**: Principle of least privilege
8. **Identification**: User IDs and authentication
9. **Physical Access**: Restrict access to facilities
10. **Logging & Monitoring**: Log all access
11. **Testing**: Regular penetration testing
12. **Policy**: Maintain written policies

**Log Retention**: Minimum 1 year (3-6 months readily available)

**Audit**: Annual for large merchants, quarterly assessments

### HIPAA Security Rule

**Purpose**: Protect patient health information (PHI) in healthcare organizations.

**Safeguards**:
- **Administrative**: Policies, procedures, training
- **Physical**: Facility access, equipment security
- **Technical**: Access controls, encryption, integrity controls

**Audit Controls** (§164.312(b)):
- Implement recording/examination of information system activity
- Implement procedures to log and examine access/activity
- Retention period: 6 years

**Breach Notification**: Required within 60 days

### GDPR

**Purpose**: Protect personal data of EU residents globally.

**Key Principles**:
- Lawfulness, fairness, transparency
- Purpose limitation
- Data minimization
- Accuracy
- Storage limitation
- Integrity and confidentiality
- Accountability

**Data Subject Rights**:
- Right of access
- Right to rectification
- Right to erasure ("right to be forgotten")
- Right to restrict processing
- Right to data portability
- Right to object
- Automated decision-making rights

**Compliance Obligations**:
- Record keeping (Article 30)
- Data protection impact assessments (DPIA)
- Incident reporting (72 hours)
- Data processing agreements
- Privacy by design

---

## 10. Troubleshooting

### Signature Verification Failures

**Problem**: `auditLogger.verify(entry)` returns false

**Possible Causes**:
1. Wrong `AUDIT_LOG_SECRET` environment variable
2. Entry data was modified after creation
3. System clock is out of sync

**Solutions**:
```typescript
// Verify the secret key is correct
console.log('Secret key (first 10 chars):', process.env.AUDIT_LOG_SECRET?.substring(0, 10));

// Check for modifications
const original = await auditLogger.query({ userId: 'user123', limit: 1 });
const recalulated = auditLogger.calculateSignature(original[0]);
console.log('Original:', original[0].signature);
console.log('Recalculated:', recalulated);

// Sync system time
// Linux: ntpdate pool.ntp.org
// Windows: net time /setsntp:time.google.com && net start w32time
```

### Performance Issues

**Problem**: Slow audit log queries

**Possible Causes**:
1. Too many logs in memory
2. Missing database indexes
3. Large result sets

**Solutions**:
```typescript
// Archive old logs
await auditLogger.export({
  endDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
}, 'json');

// Check cache hit rate
const stats = analyzer.getStats();
console.log(`Cache size: ${stats.cacheSize}`);

// Use pagination for large result sets
const page1 = await auditLogger.query({
  userId: 'user123',
  limit: 100,
  offset: 0
});

const page2 = await auditLogger.query({
  userId: 'user123',
  limit: 100,
  offset: 100
});

// Clear old cache entries
// Done automatically, but can be triggered
```

### Missing Events

**Problem**: Expected events are not appearing in logs

**Possible Causes**:
1. Batch buffer hasn't flushed
2. Logs were deleted or archieved
3. Filter is too restrictive

**Solutions**:
```typescript
// Force flush before querying
await auditLogger.ensureFlush();

// Check all filters
const allLogs = await auditLogger.query({
  startDate: new Date(0), // Beginning of time
  endDate: new Date(),     // Now
  limit: 10000             // Large limit
});

// Check if logs exist in raw files
// Look in AUDIT_LOG_PATH directory
import fs from 'fs/promises';
const files = await fs.readdir(process.env.AUDIT_LOG_PATH || './logs/audit');
console.log('Log files:', files);
```

### Chain Broken Error

**Problem**: `auditLogger.verifyChain()` returns false

**Causes**: Log tampering or corruption

**Solutions**:
```typescript
// Identify which entry broke the chain
const logs = await auditLogger.query({ limit: 10000 });
let previousHash = null;

for (let i = 0; i < logs.length; i++) {
  const entry = logs[i];

  if (previousHash && entry.previousHash !== previousHash) {
    console.error(`Chain broken at entry ${i}`);
    console.error(`Entry ID: ${entry.id}`);
    console.error(`Expected hash: ${previousHash}`);
    console.error(`Got hash: ${entry.previousHash}`);

    // Restore from backup
    const backup = await loadBackupLogs();
    // Merge with current logs
    break;
  }

  previousHash = auditLogger.calculateHash(entry);
}
```

### High Memory Usage

**Problem**: AuditLogger consuming too much memory

**Solutions**:
```typescript
// Check memory usage
const stats = analyzer.getStats();
console.log(`Logs in memory: ${stats.totalLogs}`);

// Archive older logs
if (stats.totalLogs > 100000) {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const exported = await auditLogger.export({
    endDate: cutoff
  }, 'json');

  await archiveToStorage(exported);

  // Don't delete from logs, they're indexed for search
}

// Clear analyzer cache if not using
if (!usingAnalyzer) {
  analyzer.clear();
}
```

---

## 11. API Reference

### AuditLogger API

```typescript
interface AuditLogger {
  // Singleton pattern
  static getInstance(): AuditLogger;

  // Core logging
  log(entry: Partial<AuditLogEntry>, context?: Context): Promise<void>;
  logAuth(userId, action, result, metadata?, context?): Promise<void>;
  logDataAccess(userId, resource, action, metadata?, context?): Promise<void>;
  logConfigChange(userId, setting, oldValue, newValue, context?): Promise<void>;
  logSecurityEvent(eventType, severity, metadata?, context?): Promise<void>;
  logAuthorization(userId, resource, action, granted, context?): Promise<void>;
  logAdminAction(userId, action, targetUserId?, metadata?, context?): Promise<void>;

  // Querying
  query(filter: AuditQueryFilter): Promise<AuditLogEntry[]>;
  export(filter: AuditQueryFilter, format: 'json'|'csv'): Promise<string>;
  getStatistics(): Promise<Record<string, any>>;

  // Verification
  verify(entry: AuditLogEntry): boolean;
  verifyChain(entries: AuditLogEntry[]): boolean;

  // Utility
  ensureFlush(): Promise<void>;
  clear(): Promise<void>;
  getWinstonLogger(): winston.Logger;
}

// Event Types (26 total)
enum AuditEventType {
  AUTH_LOGIN, AUTH_LOGOUT, AUTH_FAILED_LOGIN, AUTH_PASSWORD_CHANGE,
  AUTH_MFA_ENABLE, AUTH_MFA_DISABLE, AUTH_TOKEN_ISSUED, AUTH_TOKEN_REVOKED,
  AUTHZ_PERMISSION_GRANTED, AUTHZ_PERMISSION_DENIED, AUTHZ_PERMISSION_REVOKED,
  AUTHZ_ROLE_ASSIGNED, AUTHZ_ROLE_REMOVED,
  DATA_READ, DATA_CREATE, DATA_UPDATE, DATA_DELETE, DATA_EXPORT,
  CONFIG_SETTING_CHANGE, CONFIG_CREDENTIAL_CREATE, CONFIG_CREDENTIAL_UPDATE,
  CONFIG_CREDENTIAL_DELETE, CONFIG_WORKFLOW_DEPLOY, CONFIG_WORKFLOW_ROLLBACK,
  SECURITY_SUSPICIOUS_ACTIVITY, SECURITY_RATE_LIMIT_EXCEEDED,
  SECURITY_INVALID_TOKEN, SECURITY_UNAUTHORIZED_ACCESS,
  SECURITY_ENCRYPTION_KEY_ROTATION,
  ADMIN_USER_CREATE, ADMIN_USER_UPDATE, ADMIN_USER_DELETE, ADMIN_USER_LOCK,
  ADMIN_USER_UNLOCK, ADMIN_ROLE_CREATE, ADMIN_ROLE_UPDATE, ADMIN_ROLE_DELETE,
  ADMIN_BACKUP_CREATE, ADMIN_BACKUP_RESTORE, ADMIN_AUDIT_LOG_EXPORT
}

enum AuditLogResult { SUCCESS, FAILURE, DENIED }
enum AuditSeverity { INFO, WARNING, CRITICAL }

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  resource: string;
  action: string;
  result: AuditLogResult;
  severity?: AuditSeverity;
  metadata?: Record<string, any>;
  previousHash?: string;
  signature: string;
}

interface AuditQueryFilter {
  userId?: string;
  eventType?: AuditEventType | AuditEventType[];
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  result?: AuditLogResult;
  severity?: AuditSeverity;
  sessionId?: string;
  correlationId?: string;
  limit?: number;
  offset?: number;
}
```

### SecurityEventLogger API

```typescript
interface SecurityEventLogger {
  // Event logging
  logEvent(event: Partial<SecurityEvent>): Promise<SecurityEvent>;
  logFailedAuth(userId, reason, context): Promise<SecurityEvent>;
  logSuspiciousActivity(description, severity, context): Promise<SecurityEvent>;
  logInjectionAttempt(type, payload, context): Promise<SecurityEvent>;
  logRateLimitViolation(resource, limit, actual, context): Promise<SecurityEvent>;
  logPermissionEscalation(userId, attemptedRole, context): Promise<SecurityEvent>;
  logDataExfiltration(description, dataSize, context): Promise<SecurityEvent>;

  // Analysis
  analyzePattern(userId, timeWindowMs?): ThreatAnalysis;
  detectImpossibleTravel(userId): { detected: boolean; score: number; indicators: string[] };
  getRelatedEvents(eventId): Promise<SecurityEvent[]>;

  // Querying
  getEventsBySeverity(severity, limit?): SecurityEvent[];
  getEventsByCategory(category, limit?): SecurityEvent[];
  getEventsByUser(userId, limit?): SecurityEvent[];
  getEventsByIP(ipAddress, limit?): SecurityEvent[];
  getEventsByTimeRange(startDate, endDate): SecurityEvent[];
  getStatistics(startDate?, endDate?): Object;

  // Verification
  verifyIntegrity(): { valid: boolean; errors: string[] };

  // Export
  exportJSON(startDate?, endDate?): string;
  exportCSV(startDate?, endDate?): string;
  clear(): void;

  // Events
  on('event:logged', callback);
  on('alert:triggered', callback);
}

enum SecuritySeverity { INFO, LOW, MEDIUM, HIGH, CRITICAL }
enum SecurityCategory {
  AUTH, RATE_LIMIT, TOKEN, PERMISSION, DATA_EXFILTRATION,
  INJECTION, API_ABUSE, CONFIG_TAMPERING, CREDENTIAL_COMPROMISE,
  SESSION_HIJACKING, SUSPICIOUS_PATTERN
}

interface SecurityEvent {
  id: string;
  timestamp: Date;
  severity: SecuritySeverity;
  category: SecurityCategory;
  eventType: string;
  description: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestDetails?: RequestDetails;
  threatIndicators: ThreatIndicators;
  mitigation?: MitigationAction;
  correlationId?: string;
  metadata?: Record<string, any>;
  immutableHash?: string;
  previousHash?: string;
}

interface ThreatAnalysis {
  userId: string;
  timeWindow: number;
  eventCount: number;
  suspiciousEvents: number;
  riskScore: number;
  patterns: {
    failedLogins: number;
    unusualLocations: number;
    rapidRequests: number;
    abnormalBehavior: number;
  };
  recommendations: string[];
}
```

### LogAnalyzer API

```typescript
interface LogAnalyzer {
  // Data management
  addLog(log: AuditLogEntry): void;
  addLogs(logs: AuditLogEntry[]): void;

  // Searching
  search(query: LogQuery): Promise<SearchResult>;
  findSimilarEvents(eventId, similarity?): Promise<AuditLogEntry[]>;

  // Correlation
  correlate(eventId): Promise<CorrelatedEvents>;

  // Analysis
  buildTimeline(userId, dateRange): Promise<Timeline>;
  detectAnomalies(dateRange, sensitivity?): Promise<Anomaly[]>;
  analyzePatterns(eventType, dateRange): Promise<PatternAnalysis>;
  getUserBehaviorProfile(userId): Promise<BehaviorProfile>;

  // Statistics
  getTopStats(field, limit, dateRange): Promise<TopStat[]>;
  getTrendData(field, interval, dateRange): Promise<TrendData>;
  getVisualizationData(dateRange): Promise<Record<string, any>>;

  // Export
  exportSearchResults(query, format): Promise<string>;

  // Utility
  getStats(): { totalLogs, totalAnomalies, cacheSize, indexedFields };
  clear(): void;
}

interface LogQuery {
  search?: string;
  filters?: {
    eventType?: string[];
    userId?: string[];
    dateRange?: { start: Date; end: Date };
    severity?: string[];
    result?: string[];
    resource?: string[];
    ipAddress?: string[];
    action?: string[];
    workflowId?: string[];
  };
  sort?: { field: string; order: 'asc'|'desc' }[];
  limit?: number;
  offset?: number;
  aggregations?: Array<{
    field: string;
    type: 'count'|'sum'|'avg'|'min'|'max'|'histogram';
    bucketSize?: number;
  }>;
  facets?: string[];
}
```

### ComplianceReporter API

```typescript
interface ComplianceReporter {
  generateReport(
    framework: 'SOC2'|'ISO27001'|'PCIDSS'|'HIPAA'|'GDPR',
    reportType: 'initial'|'annual'|'interim'|'remediation',
    generatedBy: string,
    data: {
      controlAssessments: ControlAssessment[];
      gaps: ComplianceGap[];
      totalControls: number;
      evidenceCount: number;
      attestationCount: number;
    },
    period: { startDate: Date; endDate: Date }
  ): Promise<ComplianceReport>;

  exportToJSON(report: ComplianceReport): Promise<string>;
  exportToCSV(report: ComplianceReport): Promise<string>;
}

interface ComplianceReport {
  id: string;
  framework: string;
  reportType: string;
  generatedAt: Date;
  generatedBy: string;
  period: { startDate: Date; endDate: Date };
  summary: {
    totalControls: number;
    compliantControls: number;
    complianceScore: number;
    criticalFindings: number;
    openGaps: number;
  };
  controlAssessments: ControlAssessment[];
  gaps: ComplianceGap[];
  recommendations: string[];
  evidenceCount: number;
  attestationCount: number;
}

interface ControlAssessment {
  controlId: string;
  status: 'compliant'|'non_compliant'|'partial'|'not_assessed';
  assessedBy: string;
  assessedAt: Date;
  findings: string[];
}

interface ComplianceGap {
  gapId: string;
  controlId: string;
  severity: 'low'|'medium'|'high'|'critical';
  status: 'open'|'in_progress'|'resolved';
  description: string;
  remediationPlan?: string;
  targetDate?: Date;
  assignee?: string;
}
```

---

## Conclusion

The Audit Logging & Compliance system provides a comprehensive solution for maintaining immutable audit trails, detecting security threats, and generating compliance reports. By following the best practices outlined in this guide, you can ensure your organization maintains a secure, auditable, and compliant workflow automation platform.

For support and additional resources:
- Review existing reports in the `/logs/audit` directory
- Check security events through the SecurityEventLogger dashboard
- Generate compliance reports through the API
- Contact your compliance officer for framework-specific guidance

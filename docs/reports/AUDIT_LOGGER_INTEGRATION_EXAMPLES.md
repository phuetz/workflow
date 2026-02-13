# Audit Logger Integration Examples
## Real-world Usage Scenarios

---

## 1. Authentication System Integration

### Login Flow with Audit Logging

```typescript
// src/backend/api/routes/auth.ts
import express from 'express';
import { auditLogger, AuditLogResult } from '../audit/AuditLogger';
import { hashPassword, verifyPassword } from '../auth/passwordService';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  try {
    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      // Log failed login (user not found)
      await auditLogger.logAuth(
        email,
        'login',
        AuditLogResult.FAILURE,
        { reason: 'User not found' },
        { ipAddress, userAgent }
      );

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      // Log failed login (wrong password)
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      await user.save();

      await auditLogger.logAuth(
        email,
        'login',
        AuditLogResult.FAILURE,
        {
          reason: 'Invalid password',
          attemptNumber: user.failedLoginAttempts,
        },
        { ipAddress, userAgent }
      );

      // Alert on multiple failures
      if (user.failedLoginAttempts > 5) {
        await auditLogger.logSecurityEvent(
          AuditEventType.SECURITY_SUSPICIOUS_ACTIVITY,
          AuditSeverity.WARNING,
          {
            reason: 'Multiple failed login attempts',
            userId: user.id,
            attempts: user.failedLoginAttempts,
          },
          { ipAddress }
        );
      }

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate session
    const sessionId = generateSessionId();
    const token = generateJWT(user, sessionId);

    // Reset failed attempts
    user.failedLoginAttempts = 0;
    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    await user.save();

    // Log successful login
    await auditLogger.logAuth(
      user.id,
      'login',
      AuditLogResult.SUCCESS,
      {
        method: 'password',
        sessionId,
        mfaRequired: user.mfaEnabled,
      },
      { sessionId, ipAddress, userAgent }
    );

    // If MFA enabled, send OTP
    if (user.mfaEnabled) {
      const otp = await MFAService.generateOTP(user.id);
      await EmailService.sendOTP(user.email, otp);

      return res.json({
        status: 'mfa_required',
        sessionId,
        message: 'OTP sent to email',
      });
    }

    res.json({ token, user: user.toJSON() });
  } catch (error) {
    await auditLogger.logAuth(
      email,
      'login',
      AuditLogResult.FAILURE,
      { error: error.message },
      { ipAddress, userAgent }
    );

    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', async (req, res) => {
  const userId = req.user.id;
  const sessionId = req.sessionID;

  try {
    // Invalidate session
    await Session.invalidate(sessionId);

    // Log logout
    await auditLogger.logAuth(
      userId,
      'logout',
      AuditLogResult.SUCCESS,
      { sessionId },
      { sessionId, ipAddress: req.ip }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## 2. Data Access Control with Audit Logging

### Workflow Execution Auditing

```typescript
// src/backend/api/routes/workflows.ts
import { auditLogger, AuditEventType, AuditLogResult } from '../audit/AuditLogger';

router.get('/workflows/:id', async (req, res) => {
  const userId = req.user.id;
  const workflowId = req.params.id;

  try {
    // Check authorization
    const hasAccess = await WorkflowACL.check(userId, workflowId, 'read');
    if (!hasAccess) {
      // Log permission denied
      await auditLogger.logAuthorization(
        userId,
        `workflow:${workflowId}`,
        'read',
        false,
        {
          sessionId: req.sessionID,
          ipAddress: req.ip,
        }
      );

      return res.status(403).json({ error: 'Access denied' });
    }

    // Log access
    await auditLogger.logDataAccess(
      userId,
      `workflow:${workflowId}`,
      'read',
      {
        workflowName: workflow.name,
        owner: workflow.ownerId,
        nodeCount: workflow.nodes.length,
      },
      {
        sessionId: req.sessionID,
        ipAddress: req.ip,
        correlationId: req.correlationId,
      }
    );

    const workflow = await Workflow.findById(workflowId);
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/:id/execute', async (req, res) => {
  const userId = req.user.id;
  const workflowId = req.params.id;
  const correlationId = generateCorrelationId();

  try {
    // Verify permission
    const canExecute = await WorkflowACL.check(userId, workflowId, 'execute');
    if (!canExecute) {
      await auditLogger.logAuthorization(
        userId,
        `workflow:${workflowId}`,
        'execute',
        false,
        { ipAddress: req.ip }
      );
      return res.status(403).json({ error: 'Access denied' });
    }

    // Execute workflow
    const execution = await WorkflowExecutor.execute(workflowId, {
      input: req.body.input,
      userId,
      correlationId,
    });

    // Log execution
    const result = execution.status === 'success'
      ? AuditLogResult.SUCCESS
      : AuditLogResult.FAILURE;

    await auditLogger.logDataAccess(
      userId,
      `workflow:${workflowId}`,
      'execute',
      {
        executionId: execution.id,
        status: execution.status,
        duration: execution.duration,
        nodeExecutions: execution.nodeExecutions.length,
        result: execution.status === 'success' ? 'SUCCESS' : 'FAILED',
      },
      {
        sessionId: req.sessionID,
        ipAddress: req.ip,
        correlationId,
      }
    );

    res.json(execution);
  } catch (error) {
    // Log failure
    await auditLogger.logDataAccess(
      userId,
      `workflow:${workflowId}`,
      'execute',
      {
        error: error.message,
        status: 'error',
      },
      {
        sessionId: req.sessionID,
        ipAddress: req.ip,
        correlationId,
      }
    );

    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/:id/export', async (req, res) => {
  const userId = req.user.id;
  const workflowId = req.params.id;

  try {
    const workflow = await Workflow.findById(workflowId);
    const exportData = JSON.stringify(workflow);

    // Log data export
    await auditLogger.logDataAccess(
      userId,
      `workflow:${workflowId}`,
      'export',
      {
        format: 'json',
        size: exportData.length,
        exportTime: new Date().toISOString(),
      },
      {
        sessionId: req.sessionID,
        ipAddress: req.ip,
      }
    );

    res.setHeader('Content-Type', 'application/json');
    res.send(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 3. Configuration Changes with Audit Logging

### Credential Management Auditing

```typescript
// src/backend/api/routes/credentials.ts
import { auditLogger, AuditEventType } from '../audit/AuditLogger';

router.post('/credentials', async (req, res) => {
  const userId = req.user.id;
  const { name, type, config } = req.body;

  try {
    // Create credential
    const credential = await Credential.create({
      name,
      type,
      config,
      ownerId: userId,
    });

    // Log credential creation
    await auditLogger.log({
      eventType: AuditEventType.CONFIG_CREDENTIAL_CREATE,
      userId,
      resource: `credential:${credential.id}`,
      action: `create_${type}`,
      result: 'success',
      metadata: {
        credentialId: credential.id,
        credentialName: name,
        credentialType: type,
      },
    });

    res.json(credential.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/credentials/:id', async (req, res) => {
  const userId = req.user.id;
  const credentialId = req.params.id;
  const { name, config } = req.body;

  try {
    const credential = await Credential.findById(credentialId);

    // Store old values for audit
    const oldConfig = credential.config;

    // Update credential
    credential.name = name;
    credential.config = config;
    credential.updatedAt = new Date();
    credential.updatedBy = userId;
    await credential.save();

    // Log configuration change
    await auditLogger.logConfigChange(
      userId,
      `credential:${credentialId}`,
      oldConfig, // Will be redacted if contains sensitive fields
      config // Will be redacted if contains sensitive fields
    );

    res.json(credential.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/credentials/:id', async (req, res) => {
  const userId = req.user.id;
  const credentialId = req.params.id;

  try {
    const credential = await Credential.findById(credentialId);

    // Delete credential
    await Credential.deleteOne({ _id: credentialId });

    // Log deletion
    await auditLogger.log({
      eventType: AuditEventType.CONFIG_CREDENTIAL_DELETE,
      userId,
      resource: `credential:${credentialId}`,
      action: 'delete',
      result: 'success',
      metadata: {
        credentialId,
        credentialName: credential.name,
        credentialType: credential.type,
        deletedAt: new Date().toISOString(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 4. Security Events with Audit Logging

### Rate Limiting and Suspicious Activity Detection

```typescript
// src/middleware/securityMiddleware.ts
import { auditLogger, AuditEventType, AuditSeverity } from '../audit/AuditLogger';

export const rateLimitMiddleware = async (req, res, next) => {
  const userId = req.user?.id;
  const ipAddress = req.ip;
  const endpoint = req.path;

  try {
    const key = `ratelimit:${userId || ipAddress}:${endpoint}`;
    const count = await redis.incr(key);
    const ttl = await redis.ttl(key);

    if (ttl === -1) {
      await redis.expire(key, 60); // 1 minute window
    }

    const limit = req.user ? 1000 : 100;

    if (count > limit) {
      // Log rate limit exceeded
      await auditLogger.logSecurityEvent(
        AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED,
        AuditSeverity.WARNING,
        {
          endpoint,
          limit,
          requests: count,
          window: '1m',
        },
        { userId, ipAddress }
      );

      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: ttl > 0 ? ttl : 60,
      });
    }

    next();
  } catch (error) {
    console.error('Rate limit check error:', error);
    next(); // Allow request on error
  }
};

export const suspiciousActivityDetector = async (req, res, next) => {
  const userId = req.user?.id;
  const ipAddress = req.ip;

  if (!userId) return next();

  try {
    // Get user's recent activity
    const recentLogins = await auditLogger.query({
      userId,
      eventType: AuditEventType.AUTH_LOGIN,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    const uniqueIPs = new Set(
      recentLogins.map((log) => log.ipAddress).filter(Boolean)
    );

    // Detect geographic anomalies (example)
    if (uniqueIPs.size > 5 && recentLogins.length > 10) {
      const lastLogin = recentLogins[0];
      const currentLocation = await getGeolocation(ipAddress);
      const previousLocation = await getGeolocation(lastLogin.ipAddress);

      const distance = calculateDistance(currentLocation, previousLocation);
      const timeDiff = (Date.now() - lastLogin.timestamp.getTime()) / 60000;
      const requiredTravelTime = distance / 900; // 900 km/h max speed

      if (timeDiff < requiredTravelTime) {
        // Alert on impossible travel
        await auditLogger.logSecurityEvent(
          AuditEventType.SECURITY_SUSPICIOUS_ACTIVITY,
          AuditSeverity.CRITICAL,
          {
            type: 'impossible_travel',
            previousLocation,
            currentLocation,
            distance,
            timeBetweenLogins: timeDiff,
          },
          { userId, ipAddress }
        );

        // Require re-authentication
        return res.status(401).json({
          error: 'Re-authentication required',
          reason: 'Unusual location detected',
        });
      }
    }

    next();
  } catch (error) {
    console.error('Suspicious activity detection error:', error);
    next();
  }
};
```

---

## 5. Admin Actions with Audit Logging

### User Management Auditing

```typescript
// src/backend/api/routes/admin.ts
import { auditLogger, AuditEventType } from '../audit/AuditLogger';

router.post('/admin/users', async (req, res) => {
  const adminId = req.user.id;
  const { email, role, department } = req.body;

  // Verify admin role
  if (req.user.role !== 'admin') {
    await auditLogger.logAuthorization(
      adminId,
      'user_management',
      'create',
      false,
      { ipAddress: req.ip }
    );
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    // Create user
    const user = await User.create({
      email,
      role,
      department,
      createdBy: adminId,
    });

    // Log user creation
    await auditLogger.logAdminAction(
      adminId,
      'create_user',
      user.id,
      {
        email,
        role,
        department,
      }
    );

    // Send welcome email
    await EmailService.sendWelcome(user.email);

    res.json(user.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/admin/users/:id', async (req, res) => {
  const adminId = req.user.id;
  const userId = req.params.id;

  if (req.user.role !== 'admin') {
    await auditLogger.logAuthorization(
      adminId,
      'user_management',
      'delete',
      false,
      { ipAddress: req.ip }
    );
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const user = await User.findById(userId);

    // Soft delete user
    user.deletedAt = new Date();
    user.deletedBy = adminId;
    await user.save();

    // Revoke all sessions
    await Session.revokeByUserId(userId);

    // Log user deletion
    await auditLogger.logAdminAction(
      adminId,
      'delete_user',
      userId,
      {
        email: user.email,
        reason: req.body.reason || 'No reason provided',
      }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/admin/users/:id/role', async (req, res) => {
  const adminId = req.user.id;
  const userId = req.params.id;
  const { newRole } = req.body;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const user = await User.findById(userId);
    const oldRole = user.role;

    // Update role
    user.role = newRole;
    user.roleChangedAt = new Date();
    user.roleChangedBy = adminId;
    await user.save();

    // Log role assignment
    await auditLogger.logConfigChange(
      adminId,
      `user:${userId}:role`,
      oldRole,
      newRole
    );

    res.json(user.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 6. Compliance Reporting

### Generating Audit Reports for SOC2/ISO27001

```typescript
// src/services/ComplianceReporting.ts
import { auditLogger, AuditEventType } from '../audit/AuditLogger';

export class ComplianceReporting {
  /**
   * Generate SOC2 CC8.1 Change Management Report
   */
  async generateSOC2CC81Report(startDate: Date, endDate: Date) {
    const changes = await auditLogger.query({
      eventType: [
        AuditEventType.CONFIG_SETTING_CHANGE,
        AuditEventType.CONFIG_CREDENTIAL_UPDATE,
        AuditEventType.CONFIG_WORKFLOW_DEPLOY,
      ],
      startDate,
      endDate,
    });

    const report = {
      title: 'SOC2 CC8.1 - Change Management Report',
      period: { startDate, endDate },
      totalChanges: changes.length,
      changesByType: {},
      changesByUser: {},
      changes: changes.map((log) => ({
        date: log.timestamp,
        user: log.userId,
        type: log.eventType,
        resource: log.resource,
        action: log.action,
        metadata: log.metadata,
        verified: auditLogger.verify(log),
      })),
    };

    // Verify chain integrity
    report.chainIntegrity = auditLogger.verifyChain(changes);

    return report;
  }

  /**
   * Generate ISO 27001 A.12.4.1 Event Logging Report
   */
  async generateISO27001A1241Report(startDate: Date, endDate: Date) {
    const allEvents = await auditLogger.query({
      startDate,
      endDate,
      limit: 10000,
    });

    const stats = await auditLogger.getStatistics();

    const report = {
      title: 'ISO 27001 A.12.4.1 - Event Logging Report',
      period: { startDate, endDate },
      stats: {
        totalEvents: allEvents.length,
        byEventType: stats.byEventType,
        byResult: stats.byResult,
        bySeverity: stats.bySeverity,
        byUser: stats.byUser,
      },
      coverage: {
        authenticationEvents: this.countEventType(allEvents, 'auth:*'),
        authorizationEvents: this.countEventType(allEvents, 'authz:*'),
        dataAccessEvents: this.countEventType(allEvents, 'data:*'),
        configurationEvents: this.countEventType(allEvents, 'config:*'),
        securityEvents: this.countEventType(allEvents, 'security:*'),
      },
      integrityStatus: auditLogger.verifyChain(allEvents),
    };

    return report;
  }

  /**
   * Generate GDPR Article 30 Records of Processing Report
   */
  async generateGDPRArticle30Report(userId: string) {
    const userActivities = await auditLogger.query({ userId });

    const report = {
      title: 'GDPR Article 30 - Records of Processing',
      subject: userId,
      activities: userActivities.map((log) => ({
        timestamp: log.timestamp,
        activity: log.action,
        resource: log.resource,
        result: log.result,
        metadata: this.sanitizeForGDPR(log.metadata),
      })),
      exportedAt: new Date(),
      dataPortability: await auditLogger.export({ userId }, 'json'),
    };

    return report;
  }

  private countEventType(events: any[], pattern: string) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return events.filter((e) => regex.test(e.eventType)).length;
  }

  private sanitizeForGDPR(metadata: any) {
    if (!metadata) return null;
    const sanitized = { ...metadata };
    delete sanitized.apiKey;
    delete sanitized.password;
    delete sanitized.secret;
    return sanitized;
  }
}
```

---

## 7. Daily Integrity Verification Task

### Scheduled Audit Log Verification

```typescript
// src/jobs/auditLogVerification.ts
import cron from 'node-cron';
import { auditLogger } from '../audit/AuditLogger';

/**
 * Daily audit log integrity verification
 * Runs at 2 AM UTC every day
 */
export function setupAuditLogVerification() {
  cron.schedule('0 2 * * *', async () => {
    console.log('[AUDIT] Starting daily integrity verification...');

    try {
      // Get logs from last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const entries = await auditLogger.query({
        startDate: yesterday,
      });

      // Verify chain
      const isValid = auditLogger.verifyChain(entries);

      if (!isValid) {
        // Alert security team
        await AlertService.sendCritical(
          'AUDIT LOG TAMPERING DETECTED',
          {
            message: 'Audit log chain verification failed',
            entriesChecked: entries.length,
            timestamp: new Date(),
            action: 'Immediate investigation required',
          }
        );

        // Log the alert itself
        await auditLogger.logSecurityEvent(
          AuditEventType.SECURITY_SUSPICIOUS_ACTIVITY,
          AuditSeverity.CRITICAL,
          {
            type: 'audit_log_tampering',
            entriesChecked: entries.length,
            affectedPeriod: {
              start: yesterday,
              end: new Date(),
            },
          }
        );
      } else {
        console.log('[AUDIT] Integrity verification passed');

        // Log successful verification
        await auditLogger.log({
          eventType: AuditEventType.SECURITY_UNAUTHORIZED_ACCESS,
          resource: 'audit_system',
          action: 'integrity_check',
          result: 'success',
          metadata: {
            entriesVerified: entries.length,
            chainValid: true,
          },
        });
      }
    } catch (error) {
      console.error('[AUDIT] Verification failed:', error);
    }
  });
}
```

---

## 8. Audit Log Export for Compliance Review

### Batch Export with Verification

```typescript
// src/services/ComplianceExport.ts
import { auditLogger } from '../audit/AuditLogger';

export async function exportComplianceAudit(
  period: { startDate: Date; endDate: Date },
  format: 'json' | 'csv' = 'json'
) {
  // Get all logs in period
  const logs = await auditLogger.query({
    startDate: period.startDate,
    endDate: period.endDate,
    limit: 100000, // Large limit for full export
  });

  // Verify integrity
  const isValid = auditLogger.verifyChain(logs);

  if (!isValid) {
    throw new Error('Audit log integrity verification failed');
  }

  // Export
  const exportData = await auditLogger.export(
    {
      startDate: period.startDate,
      endDate: period.endDate,
    },
    format
  );

  // Create manifest
  const manifest = {
    exportDate: new Date(),
    period,
    format,
    totalRecords: logs.length,
    fileSize: exportData.length,
    integrityVerified: true,
    chainsValid: true,
    statistics: {
      byEventType: {},
      byResult: {},
      bySeverity: {},
    },
  };

  // Add statistics
  for (const log of logs) {
    manifest.statistics.byEventType[log.eventType] =
      (manifest.statistics.byEventType[log.eventType] || 0) + 1;
    manifest.statistics.byResult[log.result] =
      (manifest.statistics.byResult[log.result] || 0) + 1;
    if (log.severity) {
      manifest.statistics.bySeverity[log.severity] =
        (manifest.statistics.bySeverity[log.severity] || 0) + 1;
    }
  }

  return {
    manifest,
    data: exportData,
    filename: `audit-export-${period.startDate.toISOString()}-to-${period.endDate.toISOString()}.${format === 'json' ? 'json' : 'csv'}`,
  };
}
```

---

## Summary

These integration examples show:

1. **Authentication**: Login/logout with failure tracking
2. **Data Access**: Read/write/export with permission auditing
3. **Configuration**: Credential and setting changes
4. **Security**: Rate limiting and suspicious activity detection
5. **Admin Actions**: User management with full audit trail
6. **Compliance**: Report generation for SOC2, ISO, GDPR
7. **Verification**: Daily integrity checks
8. **Export**: Batch export with verification

All examples follow best practices:
- Always include context (userId, sessionId, ipAddress)
- Use correlation IDs for related events
- Log both success and failure cases
- Verify integrity regularly
- Generate compliance reports


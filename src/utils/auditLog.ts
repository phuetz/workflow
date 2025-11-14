/**
 * Audit Logging System
 * Comprehensive audit trail for compliance and security
 */

export enum AuditAction {
  // User actions
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_REGISTER = 'user.register',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',
  PASSWORD_CHANGE = 'user.password_change',
  PASSWORD_RESET = 'user.password_reset',

  // Workflow actions
  WORKFLOW_CREATE = 'workflow.create',
  WORKFLOW_UPDATE = 'workflow.update',
  WORKFLOW_DELETE = 'workflow.delete',
  WORKFLOW_EXECUTE = 'workflow.execute',
  WORKFLOW_SHARE = 'workflow.share',
  WORKFLOW_EXPORT = 'workflow.export',
  WORKFLOW_IMPORT = 'workflow.import',

  // Credential actions
  CREDENTIAL_CREATE = 'credential.create',
  CREDENTIAL_UPDATE = 'credential.update',
  CREDENTIAL_DELETE = 'credential.delete',
  CREDENTIAL_VIEW = 'credential.view',

  // Permission actions
  PERMISSION_GRANT = 'permission.grant',
  PERMISSION_REVOKE = 'permission.revoke',
  ROLE_ASSIGN = 'role.assign',
  ROLE_REMOVE = 'role.remove',

  // Settings actions
  SETTINGS_UPDATE = 'settings.update',
  API_KEY_CREATE = 'api_key.create',
  API_KEY_REVOKE = 'api_key.revoke',

  // Security events
  LOGIN_FAILED = 'security.login_failed',
  ACCESS_DENIED = 'security.access_denied',
  SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
  MFA_ENABLED = 'security.mfa_enabled',
  MFA_DISABLED = 'security.mfa_disabled',

  // Data actions
  DATA_EXPORT = 'data.export',
  DATA_IMPORT = 'data.import',
  DATA_DELETE = 'data.delete',
  BACKUP_CREATE = 'backup.create',
  BACKUP_RESTORE = 'backup.restore'
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  action: AuditAction;
  severity: AuditSeverity;
  actor: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  };
  resource?: {
    type: string;
    id: string;
    name?: string;
  };
  changes?: {
    before?: any;
    after?: any;
    fields?: string[];
  };
  metadata: {
    ip?: string;
    userAgent?: string;
    location?: string;
    organizationId?: string;
    sessionId?: string;
    requestId?: string;
  };
  result: 'success' | 'failure';
  error?: string;
  description: string;
}

export interface AuditQuery {
  actions?: AuditAction[];
  actorIds?: string[];
  resourceTypes?: string[];
  resourceIds?: string[];
  severity?: AuditSeverity[];
  result?: 'success' | 'failure';
  startDate?: Date;
  endDate?: Date;
  searchText?: string;
  limit?: number;
  offset?: number;
}

export interface AuditReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalEvents: number;
    successfulActions: number;
    failedActions: number;
    uniqueActors: number;
    criticalEvents: number;
  };
  byAction: Record<AuditAction, number>;
  byActor: Array<{
    actorId: string;
    actorName: string;
    actionCount: number;
  }>;
  bySeverity: Record<AuditSeverity, number>;
  securityEvents: AuditLogEntry[];
  recentActivity: AuditLogEntry[];
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs: number = 10000;
  private retentionDays: number = 90;

  /**
   * Log an audit event
   */
  log(
    action: AuditAction,
    actor: AuditLogEntry['actor'],
    options?: {
      resource?: AuditLogEntry['resource'];
      changes?: AuditLogEntry['changes'];
      metadata?: Partial<AuditLogEntry['metadata']>;
      result?: 'success' | 'failure';
      error?: string;
    }
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      action,
      severity: this.determineSeverity(action),
      actor,
      resource: options?.resource,
      changes: options?.changes,
      metadata: {
        ip: this.getClientIp(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        ...options?.metadata
      },
      result: options?.result || 'success',
      error: options?.error,
      description: this.generateDescription(action, actor, options?.resource, options?.result)
    };

    this.logs.unshift(entry);

    // Enforce max logs limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Send to backend for persistence
    this.persistLog(entry);

    // Alert on critical events
    if (entry.severity === AuditSeverity.CRITICAL) {
      this.alertCriticalEvent(entry);
    }

    return entry;
  }

  /**
   * Determine severity based on action
   */
  private determineSeverity(action: AuditAction): AuditSeverity {
    const criticalActions = [
      AuditAction.USER_DELETE,
      AuditAction.CREDENTIAL_DELETE,
      AuditAction.WORKFLOW_DELETE,
      AuditAction.DATA_DELETE,
      AuditAction.BACKUP_RESTORE,
      AuditAction.SUSPICIOUS_ACTIVITY
    ];

    const highActions = [
      AuditAction.CREDENTIAL_CREATE,
      AuditAction.CREDENTIAL_UPDATE,
      AuditAction.PERMISSION_GRANT,
      AuditAction.ROLE_ASSIGN,
      AuditAction.API_KEY_CREATE,
      AuditAction.PASSWORD_CHANGE,
      AuditAction.MFA_DISABLED,
      AuditAction.DATA_EXPORT
    ];

    const mediumActions = [
      AuditAction.USER_UPDATE,
      AuditAction.WORKFLOW_CREATE,
      AuditAction.WORKFLOW_UPDATE,
      AuditAction.WORKFLOW_SHARE,
      AuditAction.SETTINGS_UPDATE,
      AuditAction.LOGIN_FAILED,
      AuditAction.ACCESS_DENIED
    ];

    if (criticalActions.includes(action)) return AuditSeverity.CRITICAL;
    if (highActions.includes(action)) return AuditSeverity.HIGH;
    if (mediumActions.includes(action)) return AuditSeverity.MEDIUM;
    return AuditSeverity.LOW;
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(
    action: AuditAction,
    actor: AuditLogEntry['actor'],
    resource?: AuditLogEntry['resource'],
    result?: 'success' | 'failure'
  ): string {
    const actorName = actor.name || actor.email;
    const resourceText = resource ? ` ${resource.type} "${resource.name || resource.id}"` : '';
    const resultText = result === 'failure' ? ' (failed)' : '';

    const descriptions: Partial<Record<AuditAction, string>> = {
      [AuditAction.USER_LOGIN]: `${actorName} logged in`,
      [AuditAction.USER_LOGOUT]: `${actorName} logged out`,
      [AuditAction.USER_REGISTER]: `${actorName} registered`,
      [AuditAction.WORKFLOW_CREATE]: `${actorName} created${resourceText}`,
      [AuditAction.WORKFLOW_UPDATE]: `${actorName} updated${resourceText}`,
      [AuditAction.WORKFLOW_DELETE]: `${actorName} deleted${resourceText}`,
      [AuditAction.WORKFLOW_EXECUTE]: `${actorName} executed${resourceText}`,
      [AuditAction.CREDENTIAL_CREATE]: `${actorName} created credentials`,
      [AuditAction.CREDENTIAL_DELETE]: `${actorName} deleted credentials`,
      [AuditAction.PERMISSION_GRANT]: `${actorName} granted permissions`,
      [AuditAction.ACCESS_DENIED]: `${actorName} was denied access to${resourceText}`,
      [AuditAction.LOGIN_FAILED]: `Failed login attempt for ${actor.email}`,
      [AuditAction.DATA_EXPORT]: `${actorName} exported data`,
      [AuditAction.BACKUP_CREATE]: `${actorName} created backup`,
      [AuditAction.BACKUP_RESTORE]: `${actorName} restored from backup`
    };

    return (descriptions[action] || `${actorName} performed ${action}`) + resultText;
  }

  /**
   * Query audit logs
   */
  query(filters: AuditQuery = {}): AuditLogEntry[] {
    let results = [...this.logs];

    // Filter by actions
    if (filters.actions && filters.actions.length > 0) {
      results = results.filter(log => filters.actions!.includes(log.action));
    }

    // Filter by actors
    if (filters.actorIds && filters.actorIds.length > 0) {
      results = results.filter(log => filters.actorIds!.includes(log.actor.id));
    }

    // Filter by resource type
    if (filters.resourceTypes && filters.resourceTypes.length > 0) {
      results = results.filter(log =>
        log.resource && filters.resourceTypes!.includes(log.resource.type)
      );
    }

    // Filter by resource ID
    if (filters.resourceIds && filters.resourceIds.length > 0) {
      results = results.filter(log =>
        log.resource && filters.resourceIds!.includes(log.resource.id)
      );
    }

    // Filter by severity
    if (filters.severity && filters.severity.length > 0) {
      results = results.filter(log => filters.severity!.includes(log.severity));
    }

    // Filter by result
    if (filters.result) {
      results = results.filter(log => log.result === filters.result);
    }

    // Filter by date range
    if (filters.startDate) {
      results = results.filter(log => log.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      results = results.filter(log => log.timestamp <= filters.endDate!);
    }

    // Search text
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      results = results.filter(log =>
        log.description.toLowerCase().includes(searchLower) ||
        log.actor.email.toLowerCase().includes(searchLower) ||
        (log.resource?.name || '').toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    return results.slice(offset, offset + limit);
  }

  /**
   * Generate compliance report
   */
  generateReport(startDate: Date, endDate: Date): AuditReport {
    const logs = this.query({ startDate, endDate, limit: 999999 });

    const uniqueActors = new Set(logs.map(l => l.actor.id));
    const successfulActions = logs.filter(l => l.result === 'success').length;
    const failedActions = logs.filter(l => l.result === 'failure').length;
    const criticalEvents = logs.filter(l => l.severity === AuditSeverity.CRITICAL).length;

    // Count by action
    const byAction = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<AuditAction, number>);

    // Count by actor
    const actorCounts = logs.reduce((acc, log) => {
      const key = log.actor.id;
      if (!acc[key]) {
        acc[key] = {
          actorId: log.actor.id,
          actorName: log.actor.name || log.actor.email,
          actionCount: 0
        };
      }
      acc[key].actionCount++;
      return acc;
    }, {} as Record<string, { actorId: string; actorName: string; actionCount: number }>);

    const byActor = Object.values(actorCounts).sort((a, b) => b.actionCount - a.actionCount);

    // Count by severity
    const bySeverity = logs.reduce((acc, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {} as Record<AuditSeverity, number>);

    // Get security events
    const securityActions = [
      AuditAction.LOGIN_FAILED,
      AuditAction.ACCESS_DENIED,
      AuditAction.SUSPICIOUS_ACTIVITY
    ];
    const securityEvents = logs.filter(l => securityActions.includes(l.action));

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalEvents: logs.length,
        successfulActions,
        failedActions,
        uniqueActors: uniqueActors.size,
        criticalEvents
      },
      byAction,
      byActor,
      bySeverity,
      securityEvents,
      recentActivity: logs.slice(0, 20)
    };
  }

  /**
   * Export audit logs
   */
  export(filters: AuditQuery = {}, format: 'json' | 'csv' = 'json'): string {
    const logs = this.query(filters);

    if (format === 'csv') {
      return this.exportCsv(logs);
    }

    return JSON.stringify(logs, null, 2);
  }

  /**
   * Export as CSV
   */
  private exportCsv(logs: AuditLogEntry[]): string {
    const headers = [
      'Timestamp',
      'Action',
      'Severity',
      'Actor',
      'Resource',
      'Result',
      'Description',
      'IP Address'
    ];

    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      log.action,
      log.severity,
      log.actor.email,
      log.resource ? `${log.resource.type}:${log.resource.id}` : '',
      log.result,
      log.description,
      log.metadata.ip || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Persist log to backend
   */
  private async persistLog(entry: AuditLogEntry): Promise<void> {
    if (!import.meta.env.VITE_AUDIT_LOG_ENDPOINT) return;

    try {
      await fetch(import.meta.env.VITE_AUDIT_LOG_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
        keepalive: true
      });
    } catch (error) {
      console.error('Failed to persist audit log:', error);
    }
  }

  /**
   * Alert on critical events
   */
  private alertCriticalEvent(entry: AuditLogEntry): void {
    console.warn('CRITICAL AUDIT EVENT:', entry.description);

    // In production, send to alerting system (PagerDuty, etc.)
    if (import.meta.env.VITE_ALERT_ENDPOINT) {
      fetch(import.meta.env.VITE_ALERT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          severity: 'critical',
          title: 'Critical Audit Event',
          description: entry.description,
          metadata: entry
        })
      }).catch(console.error);
    }
  }

  /**
   * Get client IP (simplified)
   */
  private getClientIp(): string | undefined {
    // In production, this would come from request headers
    return undefined;
  }

  /**
   * Clean old logs
   */
  cleanOldLogs(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    this.logs = this.logs.filter(log => log.timestamp >= cutoffDate);
  }

  /**
   * Get retention policy
   */
  getRetentionPolicy() {
    return {
      retentionDays: this.retentionDays,
      maxLogs: this.maxLogs,
      currentLogCount: this.logs.length,
      oldestLog: this.logs[this.logs.length - 1]?.timestamp
    };
  }

  /**
   * Update retention policy
   */
  updateRetentionPolicy(retentionDays: number, maxLogs: number): void {
    this.retentionDays = retentionDays;
    this.maxLogs = maxLogs;
    this.cleanOldLogs();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();

/**
 * Decorator for auditing method calls
 */
export function Audited(action: AuditAction) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const actor = (this as any).getCurrentUser?.() || {
        id: 'system',
        email: 'system@workflowbuilder.app'
      };

      try {
        const result = await originalMethod.apply(this, args);

        auditLogger.log(action, actor, {
          result: 'success',
          metadata: { method: propertyKey }
        });

        return result;
      } catch (error) {
        auditLogger.log(action, actor, {
          result: 'failure',
          error: error instanceof Error ? error.message : String(error),
          metadata: { method: propertyKey }
        });

        throw error;
      }
    };

    return descriptor;
  };
}

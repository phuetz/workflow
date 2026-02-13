/**
 * Comprehensive Audit Logger Implementation
 * Phase 2, Week 7: Audit Logging & Compliance
 *
 * Features:
 * - Immutable append-only audit trail with HMAC signatures
 * - Log chaining (each entry references previous hash)
 * - Tamper detection and verification
 * - Winston-based file logging with daily rotation
 * - Structured logging for SOC2, ISO 27001, PCI DSS, GDPR compliance
 * - Async batch writing for performance
 * - Query interface for filtering and searching
 * - Export functionality (JSON, CSV)
 */

import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import * as winston from 'winston';
// @ts-ignore - CommonJS module
import DailyRotateFile from 'winston-daily-rotate-file';
import { v4 as uuidv4 } from 'uuid';

/**
 * Audit event type definitions
 */
export enum AuditEventType {
  // Authentication events
  AUTH_LOGIN = 'auth:login',
  AUTH_LOGOUT = 'auth:logout',
  AUTH_FAILED_LOGIN = 'auth:failed_login',
  AUTH_PASSWORD_CHANGE = 'auth:password_change',
  AUTH_MFA_ENABLE = 'auth:mfa_enable',
  AUTH_MFA_DISABLE = 'auth:mfa_disable',
  AUTH_TOKEN_ISSUED = 'auth:token_issued',
  AUTH_TOKEN_REVOKED = 'auth:token_revoked',

  // Authorization events
  AUTHZ_PERMISSION_GRANTED = 'authz:permission_granted',
  AUTHZ_PERMISSION_DENIED = 'authz:permission_denied',
  AUTHZ_PERMISSION_REVOKED = 'authz:permission_revoked',
  AUTHZ_ROLE_ASSIGNED = 'authz:role_assigned',
  AUTHZ_ROLE_REMOVED = 'authz:role_removed',

  // Data access events
  DATA_READ = 'data:read',
  DATA_CREATE = 'data:create',
  DATA_UPDATE = 'data:update',
  DATA_DELETE = 'data:delete',
  DATA_EXPORT = 'data:export',

  // Configuration events
  CONFIG_SETTING_CHANGE = 'config:setting_change',
  CONFIG_CREDENTIAL_CREATE = 'config:credential_create',
  CONFIG_CREDENTIAL_UPDATE = 'config:credential_update',
  CONFIG_CREDENTIAL_DELETE = 'config:credential_delete',
  CONFIG_WORKFLOW_DEPLOY = 'config:workflow_deploy',
  CONFIG_WORKFLOW_ROLLBACK = 'config:workflow_rollback',

  // Security events
  SECURITY_SUSPICIOUS_ACTIVITY = 'security:suspicious_activity',
  SECURITY_RATE_LIMIT_EXCEEDED = 'security:rate_limit_exceeded',
  SECURITY_INVALID_TOKEN = 'security:invalid_token',
  SECURITY_UNAUTHORIZED_ACCESS = 'security:unauthorized_access',
  SECURITY_ENCRYPTION_KEY_ROTATION = 'security:encryption_key_rotation',

  // Admin actions
  ADMIN_USER_CREATE = 'admin:user_create',
  ADMIN_USER_UPDATE = 'admin:user_update',
  ADMIN_USER_DELETE = 'admin:user_delete',
  ADMIN_USER_LOCK = 'admin:user_lock',
  ADMIN_USER_UNLOCK = 'admin:user_unlock',
  ADMIN_ROLE_CREATE = 'admin:role_create',
  ADMIN_ROLE_UPDATE = 'admin:role_update',
  ADMIN_ROLE_DELETE = 'admin:role_delete',
  ADMIN_BACKUP_CREATE = 'admin:backup_create',
  ADMIN_BACKUP_RESTORE = 'admin:backup_restore',
  ADMIN_AUDIT_LOG_EXPORT = 'admin:audit_log_export',
}

/**
 * Audit log result types
 */
export enum AuditLogResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  DENIED = 'denied',
}

/**
 * Audit log severity levels
 */
export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Core audit log entry structure
 */
export interface AuditLogEntry {
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

/**
 * Audit log query filter
 */
export interface AuditQueryFilter {
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

/**
 * Batch write entry
 */
interface BatchEntry {
  entry: Partial<AuditLogEntry>;
  timestamp: number;
}

/**
 * Immutable Audit Logger with HMAC signing and log chaining
 * Singleton pattern ensures single instance across application
 */
export class AuditLogger {
  private static instance: AuditLogger;
  private logger: winston.Logger;
  private hmacSecret: string;
  private previousHash: string | null = null;
  private auditLogPath: string;
  private entries: AuditLogEntry[] = [];
  private writeBuffer: BatchEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_TIMEOUT = 5000; // 5 seconds
  private initialized = false;

  private constructor() {
    this.hmacSecret = process.env.AUDIT_LOG_SECRET || 'default-secret-key-change-in-production';
    this.auditLogPath = process.env.AUDIT_LOG_PATH || path.join(process.cwd(), 'logs', 'audit');

    // Ensure audit log directory exists
    if (!existsSync(this.auditLogPath)) {
      mkdirSync(this.auditLogPath, { recursive: true });
    }

    this.logger = this.initializeWinston();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Initialize Winston logger with daily rotation
   */
  private initializeWinston(): winston.Logger {
    const transports: winston.transport[] = [];

    // Daily rotate file transport
    transports.push(
      new DailyRotateFile({
        filename: path.join(this.auditLogPath, 'audit-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: process.env.AUDIT_LOG_RETENTION_DAYS ? `${process.env.AUDIT_LOG_RETENTION_DAYS}d` : '90d',
        zippedArchive: true,
      })
    );

    // Error file transport
    transports.push(
      new DailyRotateFile({
        filename: path.join(this.auditLogPath, 'audit-error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: process.env.AUDIT_LOG_RETENTION_DAYS ? `${process.env.AUDIT_LOG_RETENTION_DAYS}d` : '90d',
        level: 'error',
        zippedArchive: true,
      })
    );

    // Console transport in development
    if (process.env.NODE_ENV !== 'production') {
      transports.push(new winston.transports.Console());
    }

    return winston.createLogger({
      level: process.env.AUDIT_LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'audit-logger' },
      transports,
    });
  }

  /**
   * Calculate HMAC-SHA256 signature for log entry
   */
  private calculateSignature(entry: Partial<AuditLogEntry>): string {
    const entryToSign = {
      ...entry,
      signature: undefined,
    };

    const data = JSON.stringify(entryToSign);
    return crypto.createHmac('sha256', this.hmacSecret).update(data).digest('hex');
  }

  /**
   * Calculate SHA256 hash of entry for chaining
   */
  private calculateHash(entry: AuditLogEntry): string {
    const entryForHash = {
      ...entry,
      signature: undefined,
      previousHash: undefined,
    };

    const data = JSON.stringify(entryForHash);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Enrich log entry with context
   */
  private enrichLogEntry(
    entry: Partial<AuditLogEntry>,
    context?: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      correlationId?: string;
    }
  ): Partial<AuditLogEntry> {
    return {
      id: uuidv4(),
      timestamp: new Date(),
      ...entry,
      ...(context || {}),
    };
  }

  /**
   * Log a generic audit event
   */
  public async log(
    entry: Partial<AuditLogEntry>,
    context?: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      correlationId?: string;
    }
  ): Promise<void> {
    try {
      const enrichedEntry = this.enrichLogEntry(entry, context) as AuditLogEntry;

      // Add previous hash for chaining
      if (this.previousHash) {
        enrichedEntry.previousHash = this.previousHash;
      }

      // Calculate and add signature
      enrichedEntry.signature = this.calculateSignature(enrichedEntry);

      // Update previous hash for next entry
      this.previousHash = this.calculateHash(enrichedEntry);

      // Add to buffer for batch writing
      this.writeBuffer.push({
        entry: enrichedEntry,
        timestamp: Date.now(),
      });

      // Write immediately if buffer is full
      if (this.writeBuffer.length >= this.BATCH_SIZE) {
        await this.flush();
      } else if (!this.flushTimer) {
        // Set timer for delayed flush
        this.flushTimer = setTimeout(() => {
          this.flush().catch((err) => {
            this.logger.error('Failed to flush audit log buffer', { error: err });
          });
        }, this.BATCH_TIMEOUT);
      }

      // Also add to in-memory entries
      this.entries.push(enrichedEntry);
    } catch (error) {
      // Never throw from audit logger - log to fallback
      this.logger.error('Error logging audit entry', { error });
    }
  }

  /**
   * Flush buffered entries to disk
   */
  private async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.writeBuffer.length === 0) {
      return;
    }

    try {
      const entriesToWrite = [...this.writeBuffer];
      this.writeBuffer = [];

      // Write to file using Winston
      for (const { entry } of entriesToWrite) {
        this.logger.info('Audit Event', entry);
      }
    } catch (error) {
      this.logger.error('Failed to flush audit log entries', { error });
    }
  }

  /**
   * Log authentication event
   */
  public async logAuth(
    userId: string,
    action: string,
    result: AuditLogResult,
    metadata?: Record<string, any>,
    context?: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    const eventType = action.toLowerCase().includes('logout')
      ? AuditEventType.AUTH_LOGOUT
      : action.toLowerCase().includes('failed')
        ? AuditEventType.AUTH_FAILED_LOGIN
        : action.toLowerCase().includes('password')
          ? AuditEventType.AUTH_PASSWORD_CHANGE
          : action.toLowerCase().includes('mfa')
            ? AuditEventType.AUTH_MFA_ENABLE
            : AuditEventType.AUTH_LOGIN;

    await this.log(
      {
        eventType,
        userId,
        resource: 'auth',
        action,
        result,
        metadata,
        severity: result === AuditLogResult.FAILURE ? AuditSeverity.WARNING : AuditSeverity.INFO,
      },
      context
    );
  }

  /**
   * Log data access event
   */
  public async logDataAccess(
    userId: string,
    resource: string,
    action: string,
    metadata?: Record<string, any>,
    context?: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      correlationId?: string;
    }
  ): Promise<void> {
    const actionLower = action.toLowerCase();
    const eventType = actionLower.includes('read')
      ? AuditEventType.DATA_READ
      : actionLower.includes('create')
        ? AuditEventType.DATA_CREATE
        : actionLower.includes('update')
          ? AuditEventType.DATA_UPDATE
          : actionLower.includes('delete')
            ? AuditEventType.DATA_DELETE
            : actionLower.includes('export')
              ? AuditEventType.DATA_EXPORT
              : AuditEventType.DATA_READ;

    await this.log(
      {
        eventType,
        userId,
        resource,
        action,
        result: AuditLogResult.SUCCESS,
        metadata,
      },
      context
    );
  }

  /**
   * Log configuration change
   */
  public async logConfigChange(
    userId: string,
    setting: string,
    oldValue: any,
    newValue: any,
    context?: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    const eventType = setting.toLowerCase().includes('credential')
      ? AuditEventType.CONFIG_CREDENTIAL_UPDATE
      : setting.toLowerCase().includes('workflow')
        ? AuditEventType.CONFIG_WORKFLOW_DEPLOY
        : AuditEventType.CONFIG_SETTING_CHANGE;

    await this.log(
      {
        eventType,
        userId,
        resource: 'config',
        action: `update_${setting}`,
        result: AuditLogResult.SUCCESS,
        metadata: {
          setting,
          oldValue: this.sanitizeValue(oldValue),
          newValue: this.sanitizeValue(newValue),
        },
      },
      context
    );
  }

  /**
   * Log security event
   */
  public async logSecurityEvent(
    eventType: AuditEventType,
    severity: AuditSeverity,
    metadata?: Record<string, any>,
    context?: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    await this.log(
      {
        eventType,
        resource: 'security',
        action: eventType.replace('security:', ''),
        result: AuditLogResult.DENIED,
        severity,
        metadata,
      },
      context
    );
  }

  /**
   * Log authorization decision
   */
  public async logAuthorization(
    userId: string,
    resource: string,
    action: string,
    granted: boolean,
    context?: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    const eventType = granted ? AuditEventType.AUTHZ_PERMISSION_GRANTED : AuditEventType.AUTHZ_PERMISSION_DENIED;

    await this.log(
      {
        eventType,
        userId,
        resource,
        action,
        result: granted ? AuditLogResult.SUCCESS : AuditLogResult.DENIED,
        severity: granted ? AuditSeverity.INFO : AuditSeverity.WARNING,
      },
      context
    );
  }

  /**
   * Log admin action
   */
  public async logAdminAction(
    userId: string,
    action: string,
    targetUserId?: string,
    metadata?: Record<string, any>,
    context?: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    const actionLower = action.toLowerCase();
    const eventType = actionLower.includes('create')
      ? AuditEventType.ADMIN_USER_CREATE
      : actionLower.includes('delete')
        ? AuditEventType.ADMIN_USER_DELETE
        : actionLower.includes('lock')
          ? AuditEventType.ADMIN_USER_LOCK
          : actionLower.includes('unlock')
            ? AuditEventType.ADMIN_USER_UNLOCK
            : AuditEventType.ADMIN_USER_UPDATE;

    await this.log(
      {
        eventType,
        userId,
        resource: 'user_management',
        action,
        result: AuditLogResult.SUCCESS,
        metadata: {
          targetUserId,
          ...metadata,
        },
      },
      context
    );
  }

  /**
   * Verify audit log entry signature
   */
  public verify(entry: AuditLogEntry): boolean {
    try {
      const originalSignature = entry.signature;
      const expectedSignature = this.calculateSignature(entry);
      return originalSignature === expectedSignature;
    } catch {
      return false;
    }
  }

  /**
   * Verify entire audit log chain
   */
  public verifyChain(entries: AuditLogEntry[]): boolean {
    try {
      let previousHash: string | null = null;

      for (const entry of entries) {
        // Verify signature
        if (!this.verify(entry)) {
          this.logger.warn('Signature verification failed', { entryId: entry.id });
          return false;
        }

        // Verify chain link
        if (previousHash && entry.previousHash !== previousHash) {
          this.logger.warn('Chain verification failed', { entryId: entry.id });
          return false;
        }

        previousHash = this.calculateHash(entry);
      }

      return true;
    } catch (error) {
      this.logger.error('Error verifying audit log chain', { error });
      return false;
    }
  }

  /**
   * Query audit logs
   */
  public async query(filter: AuditQueryFilter): Promise<AuditLogEntry[]> {
    try {
      let results = [...this.entries];

      // Filter by user
      if (filter.userId) {
        results = results.filter((e) => e.userId === filter.userId);
      }

      // Filter by event type
      if (filter.eventType) {
        const eventTypes = Array.isArray(filter.eventType) ? filter.eventType : [filter.eventType];
        results = results.filter((e) => eventTypes.includes(e.eventType));
      }

      // Filter by resource
      if (filter.resource) {
        results = results.filter((e) => e.resource === filter.resource);
      }

      // Filter by date range
      if (filter.startDate) {
        results = results.filter((e) => e.timestamp >= filter.startDate!);
      }

      if (filter.endDate) {
        results = results.filter((e) => e.timestamp <= filter.endDate!);
      }

      // Filter by result
      if (filter.result) {
        results = results.filter((e) => e.result === filter.result);
      }

      // Filter by severity
      if (filter.severity) {
        results = results.filter((e) => e.severity === filter.severity);
      }

      // Filter by session
      if (filter.sessionId) {
        results = results.filter((e) => e.sessionId === filter.sessionId);
      }

      // Filter by correlation ID
      if (filter.correlationId) {
        results = results.filter((e) => e.correlationId === filter.correlationId);
      }

      // Sort by timestamp descending
      results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply pagination
      if (filter.limit || filter.offset) {
        const offset = filter.offset || 0;
        const limit = filter.limit || 100;
        results = results.slice(offset, offset + limit);
      }

      return results;
    } catch (error) {
      this.logger.error('Error querying audit logs', { error });
      return [];
    }
  }

  /**
   * Export audit logs to JSON or CSV
   */
  public async export(filter: AuditQueryFilter, format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const entries = await this.query(filter);

      // Log the export action
      await this.log({
        eventType: AuditEventType.ADMIN_AUDIT_LOG_EXPORT,
        resource: 'audit_log',
        action: `export_${format}`,
        result: AuditLogResult.SUCCESS,
        metadata: {
          format,
          recordCount: entries.length,
        },
      });

      if (format === 'json') {
        return JSON.stringify(entries, null, 2);
      }

      // CSV format
      const headers = [
        'ID',
        'Timestamp',
        'EventType',
        'UserId',
        'SessionId',
        'Resource',
        'Action',
        'Result',
        'Severity',
        'IPAddress',
        'Metadata',
      ];

      const rows = entries.map((entry) => [
        entry.id,
        entry.timestamp.toISOString(),
        entry.eventType,
        entry.userId || '',
        entry.sessionId || '',
        entry.resource,
        entry.action,
        entry.result,
        entry.severity || '',
        entry.ipAddress || '',
        entry.metadata ? JSON.stringify(entry.metadata) : '',
      ]);

      const csv =
        headers.join(',') +
        '\n' +
        rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

      return csv;
    } catch (error) {
      this.logger.error('Error exporting audit logs', { error });
      return '';
    }
  }

  /**
   * Get audit log statistics
   */
  public async getStatistics(): Promise<Record<string, any>> {
    try {
      const stats = {
        totalEntries: this.entries.length,
        byEventType: {} as Record<string, number>,
        byResult: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
        byUser: {} as Record<string, number>,
        dateRange: {
          oldest: this.entries.length > 0 ? this.entries[0].timestamp : null,
          newest: this.entries.length > 0 ? this.entries[this.entries.length - 1].timestamp : null,
        },
      };

      // Count by event type
      for (const entry of this.entries) {
        stats.byEventType[entry.eventType] = (stats.byEventType[entry.eventType] || 0) + 1;
        stats.byResult[entry.result] = (stats.byResult[entry.result] || 0) + 1;
        if (entry.severity) {
          stats.bySeverity[entry.severity] = (stats.bySeverity[entry.severity] || 0) + 1;
        }
        if (entry.userId) {
          stats.byUser[entry.userId] = (stats.byUser[entry.userId] || 0) + 1;
        }
      }

      return stats;
    } catch (error) {
      this.logger.error('Error calculating audit statistics', { error });
      return {};
    }
  }

  /**
   * Sanitize sensitive values before logging
   */
  private sanitizeValue(value: any): any {
    if (typeof value !== 'object' || value === null) {
      return '[REDACTED]';
    }

    const sanitized = { ...value };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'apiKey', 'accessToken'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Clear in-memory entries (for testing)
   */
  public async clear(): Promise<void> {
    this.entries = [];
    this.previousHash = null;
    this.writeBuffer = [];
  }

  /**
   * Ensure all pending writes are flushed
   */
  public async ensureFlush(): Promise<void> {
    await this.flush();
  }

  /**
   * Get logger instance (for advanced use cases)
   */
  public getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}

/**
 * Export singleton instance
 */
export const auditLogger = AuditLogger.getInstance();

/**
 * Middleware for Express to automatically log requests
 */
export function createAuditMiddleware(options?: {
  excludePaths?: string[];
  logAllRequests?: boolean;
}) {
  return (req: any, res: any, next: any) => {
    const excludePaths = options?.excludePaths || ['/health', '/metrics', '/api/health'];
    const logAllRequests = options?.logAllRequests ?? false;

    // Store original send
    const originalSend = res.send;

    res.send = function (data: any) {
      // Log the request
      const shouldLog = logAllRequests || !excludePaths.includes(req.path);
      if (shouldLog) {
        const statusCode = res.statusCode;
        const result = statusCode >= 400 ? AuditLogResult.FAILURE : AuditLogResult.SUCCESS;

        auditLogger.log(
          {
            eventType: AuditEventType.DATA_READ,
            resource: req.path,
            action: req.method,
            result,
            metadata: {
              statusCode,
              method: req.method,
              path: req.path,
              responseSize: typeof data === 'string' ? data.length : 0,
            },
          },
          {
            userId: req.user?.id,
            sessionId: req.sessionID,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          }
        ).catch(() => {
          // Silently fail
        });
      }

      res.send = originalSend;
      return res.send(data);
    };

    next();
  };
}

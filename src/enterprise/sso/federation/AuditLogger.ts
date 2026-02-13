/**
 * AuditLogger - Federation audit logging and event tracking
 */

import { EventEmitter } from 'events';

export interface AuditEvent {
  timestamp: Date;
  eventType: string;
  details: Record<string, unknown>;
  userId?: string;
  providerId?: string;
  trustId?: string;
  sessionId?: string;
  ipAddress?: string;
  success: boolean;
  errorMessage?: string;
}

export class AuditLogger extends EventEmitter {
  private auditLog: AuditEvent[] = [];
  private maxLogSize: number;

  constructor(maxLogSize: number = 10000) {
    super();
    this.maxLogSize = maxLogSize;
  }

  /**
   * Log an audit event
   */
  log(event: Omit<AuditEvent, 'timestamp'>): void {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.auditLog.push(auditEvent);

    // Trim log if it exceeds max size
    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog = this.auditLog.slice(-this.maxLogSize);
    }

    this.emit('auditEvent', auditEvent);
  }

  /**
   * Log trust relationship event
   */
  logTrustEvent(
    eventType: 'created' | 'activated' | 'suspended' | 'revoked' | 'renewed' | 'expired',
    trustId: string,
    details: Record<string, unknown>,
    success: boolean = true,
    errorMessage?: string
  ): void {
    this.log({
      eventType: `trust.${eventType}`,
      trustId,
      details,
      success,
      errorMessage,
    });
  }

  /**
   * Log identity event
   */
  logIdentityEvent(
    eventType: 'created' | 'updated' | 'linked' | 'unlinked' | 'revoked',
    userId: string,
    providerId: string,
    details: Record<string, unknown>,
    success: boolean = true,
    errorMessage?: string
  ): void {
    this.log({
      eventType: `identity.${eventType}`,
      userId,
      providerId,
      details,
      success,
      errorMessage,
    });
  }

  /**
   * Log session event
   */
  logSessionEvent(
    eventType: 'created' | 'refreshed' | 'terminated' | 'expired',
    sessionId: string,
    userId: string,
    details: Record<string, unknown>,
    success: boolean = true,
    errorMessage?: string
  ): void {
    this.log({
      eventType: `session.${eventType}`,
      sessionId,
      userId,
      details,
      success,
      errorMessage,
    });
  }

  /**
   * Log authentication event
   */
  logAuthEvent(
    eventType: 'login' | 'logout' | 'token_exchange' | 'validation',
    userId: string | undefined,
    providerId: string,
    details: Record<string, unknown>,
    success: boolean,
    errorMessage?: string,
    ipAddress?: string
  ): void {
    this.log({
      eventType: `auth.${eventType}`,
      userId,
      providerId,
      details,
      success,
      errorMessage,
      ipAddress,
    });
  }

  /**
   * Log SCIM event
   */
  logSCIMEvent(
    eventType: 'user_created' | 'user_updated' | 'user_deleted',
    userId: string,
    providerId: string,
    details: Record<string, unknown>,
    success: boolean = true,
    errorMessage?: string
  ): void {
    this.log({
      eventType: `scim.${eventType}`,
      userId,
      providerId,
      details,
      success,
      errorMessage,
    });
  }

  /**
   * Get audit log entries
   */
  getAuditLog(options?: {
    startDate?: Date;
    endDate?: Date;
    eventType?: string;
    userId?: string;
    providerId?: string;
    limit?: number;
  }): AuditEvent[] {
    let filtered = this.auditLog;

    if (options?.startDate) {
      filtered = filtered.filter(e => e.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      filtered = filtered.filter(e => e.timestamp <= options.endDate!);
    }

    if (options?.eventType) {
      filtered = filtered.filter(e => e.eventType.includes(options.eventType!));
    }

    if (options?.userId) {
      filtered = filtered.filter(e => e.userId === options.userId);
    }

    if (options?.providerId) {
      filtered = filtered.filter(e => e.providerId === options.providerId);
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEvents: number;
    successRate: number;
    eventsByType: Record<string, number>;
  } {
    const totalEvents = this.auditLog.length;
    const successCount = this.auditLog.filter(e => e.success).length;
    const successRate = totalEvents > 0 ? successCount / totalEvents : 1;

    const eventsByType: Record<string, number> = {};
    for (const event of this.auditLog) {
      const baseType = event.eventType.split('.')[0];
      eventsByType[baseType] = (eventsByType[baseType] || 0) + 1;
    }

    return {
      totalEvents,
      successRate,
      eventsByType,
    };
  }

  /**
   * Clear audit log
   */
  clear(): void {
    this.auditLog = [];
  }
}

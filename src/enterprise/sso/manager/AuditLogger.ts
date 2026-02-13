/**
 * Audit Logger
 * Handles SSO audit logging and log retrieval
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  AuditLogEntry,
  AuditEventType,
} from './types';

export class AuditLogger {
  private auditLogs: AuditLogEntry[] = [];
  private eventEmitter: EventEmitter;
  private maxEntries: number;

  constructor(eventEmitter: EventEmitter, maxEntries: number = 10000) {
    this.eventEmitter = eventEmitter;
    this.maxEntries = maxEntries;
  }

  /**
   * Generate a secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Log an audit event
   */
  public log(event: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const auditEntry: AuditLogEntry = {
      id: this.generateSecureToken(),
      timestamp: new Date(),
      ...event,
    };

    this.auditLogs.push(auditEntry);

    // Keep only last maxEntries entries in memory
    if (this.auditLogs.length > this.maxEntries) {
      this.auditLogs = this.auditLogs.slice(-this.maxEntries);
    }

    this.eventEmitter.emit('audit:log', auditEntry);
  }

  /**
   * Get audit logs with optional filters
   */
  public getLogs(filters?: {
    userId?: string;
    providerId?: string;
    eventType?: AuditEventType;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    limit?: number;
    offset?: number;
  }): { logs: AuditLogEntry[]; total: number } {
    let logs = [...this.auditLogs];

    // Apply filters
    if (filters) {
      if (filters.userId) {
        logs = logs.filter((l) => l.userId === filters.userId);
      }
      if (filters.providerId) {
        logs = logs.filter((l) => l.providerId === filters.providerId);
      }
      if (filters.eventType) {
        logs = logs.filter((l) => l.eventType === filters.eventType);
      }
      if (filters.startDate) {
        logs = logs.filter((l) => l.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter((l) => l.timestamp <= filters.endDate!);
      }
      if (filters.success !== undefined) {
        logs = logs.filter((l) => l.success === filters.success);
      }
    }

    const total = logs.length;

    // Apply pagination
    if (filters?.offset) {
      logs = logs.slice(filters.offset);
    }
    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return { logs, total };
  }

  /**
   * Clear audit logs older than specified date
   */
  public clearLogs(olderThan: Date): number {
    const originalLength = this.auditLogs.length;
    this.auditLogs = this.auditLogs.filter((l) => l.timestamp >= olderThan);
    return originalLength - this.auditLogs.length;
  }

  /**
   * Get all logs
   */
  public getAllLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  /**
   * Get log count
   */
  public get size(): number {
    return this.auditLogs.length;
  }

  /**
   * Get failure count
   */
  public getFailureCount(): number {
    return this.auditLogs.filter((l) => !l.success).length;
  }

  /**
   * Get logs from last 24 hours
   */
  public getLast24HoursCount(): number {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.auditLogs.filter((l) => l.timestamp >= last24h).length;
  }
}

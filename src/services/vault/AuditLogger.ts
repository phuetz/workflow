/**
 * Audit Logger
 * Handles audit logging for vault operations
 */

import { EventEmitter } from 'events';
import { AuditLog, AuditLogInput, AuditLogFilters } from './types';

export class AuditLogger extends EventEmitter {
  private logs: AuditLog[] = [];
  private enabled: boolean;
  private maxLogs: number;

  constructor(enabled: boolean = true, maxLogs: number = 10000) {
    super();
    this.enabled = enabled;
    this.maxLogs = maxLogs;
  }

  /**
   * Log an audit event
   */
  public log(input: AuditLogInput): AuditLog | null {
    if (!this.enabled) {
      return null;
    }

    const auditLog: AuditLog = {
      id: this.generateId(),
      timestamp: new Date(),
      ...input
    };

    this.logs.push(auditLog);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Emit audit event
    this.emit('audit', auditLog);

    return auditLog;
  }

  /**
   * Get audit logs with filters
   */
  public getLogs(filters: AuditLogFilters = {}): AuditLog[] {
    let result = [...this.logs];

    if (filters.userId) {
      result = result.filter(log => log.userId === filters.userId);
    }

    if (filters.secretId) {
      result = result.filter(log => log.secretId === filters.secretId);
    }

    if (filters.action) {
      result = result.filter(log => log.action === filters.action);
    }

    if (filters.startDate) {
      result = result.filter(log => log.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      result = result.filter(log => log.timestamp <= filters.endDate!);
    }

    if (filters.success !== undefined) {
      result = result.filter(log => log.success === filters.success);
    }

    // Sort by timestamp descending
    result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return result;
  }

  /**
   * Clear all logs
   */
  public clear(): void {
    this.logs = [];
  }

  /**
   * Get log count
   */
  public count(): number {
    return this.logs.length;
  }

  /**
   * Enable audit logging
   */
  public enable(): void {
    this.enabled = true;
  }

  /**
   * Disable audit logging
   */
  public disable(): void {
    this.enabled = false;
  }

  /**
   * Check if logging is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Generate a unique audit log ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export logs to JSON
   */
  public export(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Get logs summary statistics
   */
  public getStats(): {
    totalLogs: number;
    successCount: number;
    failureCount: number;
    byAction: Record<string, number>;
  } {
    const stats = {
      totalLogs: this.logs.length,
      successCount: 0,
      failureCount: 0,
      byAction: {} as Record<string, number>
    };

    for (const log of this.logs) {
      if (log.success) {
        stats.successCount++;
      } else {
        stats.failureCount++;
      }

      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
    }

    return stats;
  }
}

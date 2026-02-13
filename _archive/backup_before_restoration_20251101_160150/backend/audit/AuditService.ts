/**
 * Audit Logging Service
 * Enterprise-grade audit logging with search and filtering
 */

import { logger } from '../services/LogService';
import type {
  AuditLogEntry,
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditLogFilter,
  AuditLogStats,
} from './AuditTypes';

export class AuditService {
  private auditLogs: AuditLogEntry[] = [];
  private maxLogs: number = 10000; // Keep last 10k logs in memory
  private logToConsole: boolean = true;

  constructor() {
    logger.info('AuditService initialized');
  }

  /**
   * Log an audit event
   */
  async log(params: {
    action: AuditAction;
    category: AuditCategory;
    severity?: AuditSeverity;
    userId: string;
    username?: string;
    userEmail?: string;
    ipAddress?: string;
    userAgent?: string;
    resourceType: string;
    resourceId: string;
    resourceName?: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    details?: Record<string, unknown>;
    success: boolean;
    errorMessage?: string;
    duration?: number;
    metadata?: Record<string, unknown>;
  }): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      severity: params.severity || AuditSeverity.INFO,
      ...params,
    };

    // Add to in-memory store
    this.auditLogs.push(entry);

    // Trim if exceeds max
    if (this.auditLogs.length > this.maxLogs) {
      this.auditLogs = this.auditLogs.slice(-this.maxLogs);
    }

    // Log to console/file if enabled
    if (this.logToConsole) {
      const logData = {
        action: entry.action,
        userId: entry.userId,
        resource: `${entry.resourceType}:${entry.resourceId}`,
        success: entry.success,
        ip: entry.ipAddress,
      };

      if (entry.success) {
        logger.info(`[AUDIT] ${entry.action}`, logData);
      } else {
        logger.warn(`[AUDIT] ${entry.action} FAILED`, {
          ...logData,
          error: entry.errorMessage,
        });
      }
    }

    // TODO: In production, save to database
    // await this.saveToDatabase(entry);

    return entry;
  }

  /**
   * Get audit logs with filtering
   */
  async query(filter: AuditLogFilter = {}): Promise<{
    entries: AuditLogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    let filtered = [...this.auditLogs];

    // Apply filters
    if (filter.startDate) {
      filtered = filtered.filter(e => e.timestamp >= filter.startDate!);
    }

    if (filter.endDate) {
      filtered = filtered.filter(e => e.timestamp <= filter.endDate!);
    }

    if (filter.actions && filter.actions.length > 0) {
      filtered = filtered.filter(e => filter.actions!.includes(e.action));
    }

    if (filter.categories && filter.categories.length > 0) {
      filtered = filtered.filter(e => filter.categories!.includes(e.category));
    }

    if (filter.severities && filter.severities.length > 0) {
      filtered = filtered.filter(e => filter.severities!.includes(e.severity));
    }

    if (filter.userIds && filter.userIds.length > 0) {
      filtered = filtered.filter(e => filter.userIds!.includes(e.userId));
    }

    if (filter.resourceTypes && filter.resourceTypes.length > 0) {
      filtered = filtered.filter(e => filter.resourceTypes!.includes(e.resourceType));
    }

    if (filter.resourceIds && filter.resourceIds.length > 0) {
      filtered = filtered.filter(e => filter.resourceIds!.includes(e.resourceId));
    }

    if (filter.success !== undefined) {
      filtered = filtered.filter(e => e.success === filter.success);
    }

    if (filter.searchText) {
      const search = filter.searchText.toLowerCase();
      filtered = filtered.filter(
        e =>
          e.action.toLowerCase().includes(search) ||
          e.resourceName?.toLowerCase().includes(search) ||
          e.username?.toLowerCase().includes(search) ||
          e.userEmail?.toLowerCase().includes(search)
      );
    }

    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = filtered.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;

    const entries = filtered.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      entries,
      total,
      hasMore,
    };
  }

  /**
   * Get audit log statistics
   */
  async getStats(filter: Partial<AuditLogFilter> = {}): Promise<AuditLogStats> {
    const { entries, total } = await this.query(filter);

    // Count by category
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    const userCounts: Record<string, number> = {};
    let failures = 0;

    for (const entry of this.auditLogs) {
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
      bySeverity[entry.severity] = (bySeverity[entry.severity] || 0) + 1;
      byAction[entry.action] = (byAction[entry.action] || 0) + 1;
      userCounts[entry.userId] = (userCounts[entry.userId] || 0) + 1;

      if (!entry.success) {
        failures++;
      }
    }

    // Top users
    const topUsers = Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent activity
    const recentActivity = entries.slice(0, 10);

    return {
      totalEntries: total,
      byCategory: byCategory as Record<AuditCategory, number>,
      bySeverity: bySeverity as Record<AuditSeverity, number>,
      byAction,
      recentActivity,
      topUsers,
      failureRate: total > 0 ? (failures / total) * 100 : 0,
    };
  }

  /**
   * Get single audit entry by ID
   */
  async getById(id: string): Promise<AuditLogEntry | null> {
    return this.auditLogs.find(e => e.id === id) || null;
  }

  /**
   * Export audit logs
   */
  async export(filter: AuditLogFilter = {}): Promise<string> {
    const { entries } = await this.query(filter);

    // Convert to CSV
    const headers = [
      'ID',
      'Timestamp',
      'Action',
      'Category',
      'Severity',
      'User ID',
      'Username',
      'Resource Type',
      'Resource ID',
      'Success',
      'Error Message',
      'IP Address',
    ];

    const rows = entries.map(e => [
      e.id,
      e.timestamp.toISOString(),
      e.action,
      e.category,
      e.severity,
      e.userId,
      e.username || '',
      e.resourceType,
      e.resourceId,
      e.success ? 'Yes' : 'No',
      e.errorMessage || '',
      e.ipAddress || '',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    return csv;
  }

  /**
   * Clear old audit logs
   */
  async cleanup(olderThan: Date): Promise<number> {
    const before = this.auditLogs.length;
    this.auditLogs = this.auditLogs.filter(e => e.timestamp > olderThan);
    const removed = before - this.auditLogs.length;

    logger.info(`Cleaned up ${removed} old audit logs`);
    return removed;
  }

  /**
   * Get total audit log count
   */
  async count(): Promise<number> {
    return this.auditLogs.length;
  }

  /**
   * Set whether to log to console
   */
  setConsoleLogging(enabled: boolean) {
    this.logToConsole = enabled;
  }

  /**
   * Set max logs to keep in memory
   */
  setMaxLogs(max: number) {
    this.maxLogs = max;
    if (this.auditLogs.length > max) {
      this.auditLogs = this.auditLogs.slice(-max);
    }
  }
}

// Singleton instance
let auditServiceInstance: AuditService | null = null;

export function getAuditService(): AuditService {
  if (!auditServiceInstance) {
    auditServiceInstance = new AuditService();
  }
  return auditServiceInstance;
}

export function initializeAuditService(): AuditService {
  if (auditServiceInstance) {
    logger.warn('Audit service already initialized');
    return auditServiceInstance;
  }

  auditServiceInstance = new AuditService();
  return auditServiceInstance;
}

// Convenience helper for logging audit events
export async function auditLog(params: Parameters<AuditService['log']>[0]): Promise<void> {
  const service = getAuditService();
  await service.log(params);
}

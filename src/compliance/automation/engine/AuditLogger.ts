/**
 * AuditLogger - Immutable audit trail logging
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  AuditLogEntry,
  AuditTrailExport,
  ComplianceFrameworkType,
} from './types';

export class AuditLogger extends EventEmitter {
  private auditLog: AuditLogEntry[] = [];
  private readonly MAX_AUDIT_ENTRIES = 1000000;

  private generateId: (prefix: string) => string;

  constructor(generateId: (prefix: string) => string) {
    super();
    this.generateId = generateId;
  }

  /**
   * Log an audit entry with immutable hash chain
   */
  async logAuditEntry(
    entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'immutableHash' | 'previousHash'>
  ): Promise<AuditLogEntry> {
    const previousEntry = this.auditLog[this.auditLog.length - 1];

    const fullEntry: AuditLogEntry = {
      ...entry,
      id: this.generateId('audit'),
      timestamp: new Date(),
      previousHash: previousEntry?.immutableHash,
      immutableHash: '',
    };

    // Calculate hash including previous hash for chain integrity
    fullEntry.immutableHash = this.calculateEntryHash(fullEntry);

    this.auditLog.push(fullEntry);

    // Trim if exceeded max
    if (this.auditLog.length > this.MAX_AUDIT_ENTRIES) {
      this.auditLog = this.auditLog.slice(-this.MAX_AUDIT_ENTRIES);
    }

    this.emit('audit:logged', { entry: fullEntry });

    return fullEntry;
  }

  /**
   * Export audit trail
   */
  async exportAuditTrail(options: {
    framework?: ComplianceFrameworkType;
    startDate?: Date;
    endDate?: Date;
    exportedBy: string;
    format?: 'json' | 'csv' | 'pdf';
  }): Promise<AuditTrailExport> {
    const { framework, startDate, endDate, exportedBy, format = 'json' } = options;

    let filteredEntries = [...this.auditLog];

    if (framework) {
      filteredEntries = filteredEntries.filter(e => e.framework === framework);
    }

    if (startDate) {
      filteredEntries = filteredEntries.filter(e => e.timestamp >= startDate);
    }

    if (endDate) {
      filteredEntries = filteredEntries.filter(e => e.timestamp <= endDate);
    }

    // Verify integrity
    const integrityCheck = this.verifyAuditIntegrity(filteredEntries);

    const exportData: AuditTrailExport = {
      exportedAt: new Date(),
      exportedBy,
      framework,
      dateRange: {
        start: startDate || filteredEntries[0]?.timestamp || new Date(),
        end: endDate || filteredEntries[filteredEntries.length - 1]?.timestamp || new Date(),
      },
      totalEntries: filteredEntries.length,
      entries: filteredEntries,
      integrityVerification: {
        valid: integrityCheck.valid,
        errors: integrityCheck.errors,
        checksum: this.calculateChecksum(filteredEntries),
      },
      format,
    };

    // Log the export
    await this.logAuditEntry({
      eventType: 'audit_trail_exported',
      framework,
      actor: exportedBy,
      action: 'export_audit_trail',
      resourceType: 'audit_trail',
      resourceId: 'all',
      afterState: { entryCount: filteredEntries.length, format },
      result: 'success',
    });

    this.emit('audit:exported', { export: exportData });

    return exportData;
  }

  /**
   * Get audit log entries
   */
  getAuditLog(): AuditLogEntry[] {
    return [...this.auditLog];
  }

  /**
   * Calculate hash for audit entry
   */
  private calculateEntryHash(entry: AuditLogEntry): string {
    const data = JSON.stringify({
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      actor: entry.actor,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      beforeState: entry.beforeState,
      afterState: entry.afterState,
      previousHash: entry.previousHash,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify audit trail integrity
   */
  verifyAuditIntegrity(entries: AuditLogEntry[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Verify hash
      const calculatedHash = this.calculateEntryHash(entry);
      if (calculatedHash !== entry.immutableHash) {
        errors.push(`Entry ${entry.id} hash mismatch`);
      }

      // Verify chain
      if (i > 0) {
        const previousEntry = entries[i - 1];
        if (entry.previousHash !== previousEntry.immutableHash) {
          errors.push(`Entry ${entry.id} chain broken`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Calculate checksum
   */
  calculateChecksum(data: unknown): string {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }
}

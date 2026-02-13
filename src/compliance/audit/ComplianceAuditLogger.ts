/**
 * Compliance Audit Logger
 * Specialized audit logging for compliance events
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';
import { ComplianceAuditEvent, ComplianceFramework } from '../../types/compliance';

export class ComplianceAuditLogger extends EventEmitter {
  private events: ComplianceAuditEvent[] = [];
  private maxEvents: number = 100000;

  /**
   * Log compliance event
   */
  async logEvent(event: Omit<ComplianceAuditEvent, 'id' | 'timestamp' | 'immutableHash' | 'previousHash'>): Promise<ComplianceAuditEvent> {
    const previousEvent = this.events[this.events.length - 1];

    const fullEvent: ComplianceAuditEvent = {
      ...event,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      previousHash: previousEvent?.immutableHash,
      immutableHash: '',
    };

    // Calculate immutable hash
    fullEvent.immutableHash = this.calculateHash(fullEvent);

    this.events.push(fullEvent);

    // Trim if exceeded max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    this.emit('event:logged', { event: fullEvent });

    return fullEvent;
  }

  /**
   * Calculate cryptographic hash for event
   */
  private calculateHash(event: ComplianceAuditEvent): string {
    const data = JSON.stringify({
      timestamp: event.timestamp,
      userId: event.userId,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      beforeState: event.beforeState,
      afterState: event.afterState,
      previousHash: event.previousHash,
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify audit trail integrity
   */
  verifyIntegrity(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];

      // Verify hash
      const calculatedHash = this.calculateHash(event);
      if (calculatedHash !== event.immutableHash) {
        errors.push(`Event ${event.id} hash mismatch`);
      }

      // Verify chain
      if (i > 0) {
        const previousEvent = this.events[i - 1];
        if (event.previousHash !== previousEvent.immutableHash) {
          errors.push(`Event ${event.id} chain broken`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get events by framework
   */
  getEventsByFramework(framework: ComplianceFramework): ComplianceAuditEvent[] {
    return this.events.filter(e => e.framework === framework);
  }

  /**
   * Get events by time range
   */
  getEventsByTimeRange(startDate: Date, endDate: Date): ComplianceAuditEvent[] {
    return this.events.filter(
      e => e.timestamp >= startDate && e.timestamp <= endDate
    );
  }

  /**
   * Export audit trail
   */
  exportAuditTrail(): {
    exportedAt: Date;
    totalEvents: number;
    events: ComplianceAuditEvent[];
    integrityCheck: ReturnType<ComplianceAuditLogger['verifyIntegrity']>;
  } {
    return {
      exportedAt: new Date(),
      totalEvents: this.events.length,
      events: this.events,
      integrityCheck: this.verifyIntegrity(),
    };
  }
}

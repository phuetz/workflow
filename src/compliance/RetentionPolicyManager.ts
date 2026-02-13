/**
 * Retention Policy Manager
 * Manages data retention policies and automated deletion
 */

import { EventEmitter } from 'events';
import type {
  RetentionPolicy,
  RetentionRecord,
  DataClassification,
} from '../types/compliance';

export class RetentionPolicyManager extends EventEmitter {
  private policies: Map<string, RetentionPolicy> = new Map();
  private records: Map<string, RetentionRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startAutomatedCleanup();
  }

  /**
   * Create retention policy
   */
  createPolicy(
    policy: Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): RetentionPolicy {
    const fullPolicy: RetentionPolicy = {
      ...policy,
      id: `retention_policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.policies.set(fullPolicy.id, fullPolicy);
    this.emit('policy:created', { policy: fullPolicy });

    return fullPolicy;
  }

  /**
   * Update retention policy
   */
  updatePolicy(policyId: string, updates: Partial<RetentionPolicy>): RetentionPolicy {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy ${policyId} not found`);
    }

    const updatedPolicy = {
      ...policy,
      ...updates,
      updatedAt: new Date(),
    };

    this.policies.set(policyId, updatedPolicy);
    this.emit('policy:updated', { policy: updatedPolicy });

    return updatedPolicy;
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): RetentionPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get policies by resource type
   */
  getPoliciesByResourceType(resourceType: string): RetentionPolicy[] {
    return Array.from(this.policies.values()).filter(
      p => p.resourceType === resourceType || p.resourceType === 'custom'
    );
  }

  /**
   * Create retention record for a resource
   */
  createRecord(
    resourceType: string,
    resourceId: string,
    classification: DataClassification[]
  ): RetentionRecord {
    // Find applicable policy
    const policy = this.findApplicablePolicy(resourceType, classification);
    if (!policy) {
      throw new Error(`No retention policy found for ${resourceType}`);
    }

    const createdAt = new Date();
    const expiresAt = new Date(
      createdAt.getTime() + policy.retentionPeriodDays * 24 * 60 * 60 * 1000
    );

    const record: RetentionRecord = {
      id: `retention_record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      resourceType,
      resourceId,
      policyId: policy.id,
      createdAt,
      expiresAt,
      onLegalHold: false,
    };

    // Set archive date if configured
    if (policy.archiveAfterDays) {
      record.metadata = {
        archiveAt: new Date(
          createdAt.getTime() + policy.archiveAfterDays * 24 * 60 * 60 * 1000
        ),
      };
    }

    this.records.set(record.id, record);
    this.emit('record:created', { record });

    return record;
  }

  /**
   * Find applicable retention policy
   */
  private findApplicablePolicy(
    resourceType: string,
    classification: DataClassification[]
  ): RetentionPolicy | undefined {
    const policies = this.getPoliciesByResourceType(resourceType);

    // Find policy matching classification
    for (const policy of policies) {
      const hasMatchingClassification = policy.classification.some(c =>
        classification.includes(c)
      );
      if (hasMatchingClassification) {
        return policy;
      }
    }

    // Return first matching resource type if no classification match
    return policies[0];
  }

  /**
   * Place record on legal hold
   */
  placeLegalHold(recordId: string, reason: string): void {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error(`Record ${recordId} not found`);
    }

    const policy = this.policies.get(record.policyId);
    if (policy && policy.legalHoldExempt) {
      throw new Error(`Policy ${policy.id} is exempt from legal holds`);
    }

    record.onLegalHold = true;
    record.metadata = {
      ...record.metadata,
      legalHoldReason: reason,
      legalHoldPlacedAt: new Date(),
    };

    this.emit('record:legal_hold_placed', { record, reason });
  }

  /**
   * Release legal hold
   */
  releaseLegalHold(recordId: string): void {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error(`Record ${recordId} not found`);
    }

    record.onLegalHold = false;
    record.metadata = {
      ...record.metadata,
      legalHoldReleasedAt: new Date(),
    };

    this.emit('record:legal_hold_released', { record });
  }

  /**
   * Get expired records
   */
  getExpiredRecords(): RetentionRecord[] {
    const now = new Date();
    return Array.from(this.records.values()).filter(
      r => r.expiresAt <= now && !r.onLegalHold && !r.deletedAt
    );
  }

  /**
   * Get records expiring soon
   */
  getExpiringRecords(daysThreshold: number = 30): RetentionRecord[] {
    const threshold = new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000);
    const now = new Date();

    return Array.from(this.records.values()).filter(
      r =>
        r.expiresAt > now &&
        r.expiresAt <= threshold &&
        !r.onLegalHold &&
        !r.deletedAt
    );
  }

  /**
   * Get records ready for archival
   */
  getRecordsForArchival(): RetentionRecord[] {
    const now = new Date();
    return Array.from(this.records.values()).filter(r => {
      if (r.archivedAt || r.deletedAt || r.onLegalHold) {
        return false;
      }
      const archiveAt = r.metadata?.archiveAt as Date | undefined;
      return archiveAt && archiveAt <= now;
    });
  }

  /**
   * Mark record as archived
   */
  markAsArchived(recordId: string, archiveLocation: string): void {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error(`Record ${recordId} not found`);
    }

    record.archivedAt = new Date();
    record.metadata = {
      ...record.metadata,
      archiveLocation,
    };

    this.emit('record:archived', { record, archiveLocation });
  }

  /**
   * Mark record as deleted
   */
  markAsDeleted(recordId: string): void {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error(`Record ${recordId} not found`);
    }

    if (record.onLegalHold) {
      throw new Error(`Cannot delete record on legal hold: ${recordId}`);
    }

    record.deletedAt = new Date();
    this.emit('record:deleted', { record });
  }

  /**
   * Process expired records
   */
  async processExpiredRecords(): Promise<{
    processed: number;
    deleted: number;
    errors: Array<{ recordId: string; error: string }>;
  }> {
    const expiredRecords = this.getExpiredRecords();
    let deleted = 0;
    const errors: Array<{ recordId: string; error: string }> = [];

    for (const record of expiredRecords) {
      try {
        const policy = this.policies.get(record.policyId);
        if (!policy) {
          errors.push({
            recordId: record.id,
            error: 'Policy not found',
          });
          continue;
        }

        if (policy.autoDelete) {
          this.markAsDeleted(record.id);
          deleted++;
          this.emit('record:auto_deleted', { record });
        } else {
          this.emit('record:expiration_warning', { record });
        }
      } catch (error) {
        errors.push({
          recordId: record.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      processed: expiredRecords.length,
      deleted,
      errors,
    };
  }

  /**
   * Get retention statistics
   */
  getStatistics(): {
    totalPolicies: number;
    totalRecords: number;
    activeRecords: number;
    archivedRecords: number;
    deletedRecords: number;
    onLegalHold: number;
    expiredRecords: number;
    expiringIn30Days: number;
  } {
    const records = Array.from(this.records.values());

    return {
      totalPolicies: this.policies.size,
      totalRecords: records.length,
      activeRecords: records.filter(r => !r.deletedAt && !r.archivedAt).length,
      archivedRecords: records.filter(r => r.archivedAt).length,
      deletedRecords: records.filter(r => r.deletedAt).length,
      onLegalHold: records.filter(r => r.onLegalHold).length,
      expiredRecords: this.getExpiredRecords().length,
      expiringIn30Days: this.getExpiringRecords(30).length,
    };
  }

  /**
   * Start automated cleanup process
   */
  private startAutomatedCleanup(): void {
    // Run cleanup every 6 hours
    this.cleanupInterval = setInterval(
      () => {
        this.processExpiredRecords().catch(error => {
          this.emit('cleanup:error', { error });
        });
      },
      6 * 60 * 60 * 1000
    );
  }

  /**
   * Stop automated cleanup
   */
  stopAutomatedCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Delete policy
   */
  deletePolicy(policyId: string): void {
    // Check if policy is in use
    const recordsUsingPolicy = Array.from(this.records.values()).filter(
      r => r.policyId === policyId
    );

    if (recordsUsingPolicy.length > 0) {
      throw new Error(
        `Cannot delete policy ${policyId}: ${recordsUsingPolicy.length} records still using it`
      );
    }

    this.policies.delete(policyId);
    this.emit('policy:deleted', { policyId });
  }

  /**
   * Export retention report
   */
  exportReport(): {
    generatedAt: Date;
    policies: RetentionPolicy[];
    statistics: ReturnType<RetentionPolicyManager['getStatistics']>;
    expiredRecords: RetentionRecord[];
    expiringRecords: RetentionRecord[];
    recordsOnHold: RetentionRecord[];
  } {
    return {
      generatedAt: new Date(),
      policies: Array.from(this.policies.values()),
      statistics: this.getStatistics(),
      expiredRecords: this.getExpiredRecords(),
      expiringRecords: this.getExpiringRecords(30),
      recordsOnHold: Array.from(this.records.values()).filter(r => r.onLegalHold),
    };
  }
}

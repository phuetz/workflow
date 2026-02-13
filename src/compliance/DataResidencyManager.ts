/**
 * Data Residency Manager
 * Controls where data is stored and processed geographically
 */

import { EventEmitter } from 'events';
import {
  DataResidency,
  DataClassification,
} from '../types/compliance';
import type {
  DataResidencyPolicy,
} from '../types/compliance';

export class DataResidencyManager extends EventEmitter {
  private currentRegion: DataResidency;
  private policies: Map<string, DataResidencyPolicy> = new Map();
  private dataLocations: Map<string, DataResidency> = new Map();
  private regionRestrictions: Map<DataResidency, string[]> = new Map();

  constructor(defaultRegion: DataResidency) {
    super();
    this.currentRegion = defaultRegion;
    this.initializeRegionRestrictions();
  }

  /**
   * Set primary data residency region
   */
  setPrimaryRegion(region: DataResidency): void {
    const oldRegion = this.currentRegion;
    this.currentRegion = region;
    this.emit('region:changed', { oldRegion, newRegion: region });
  }

  /**
   * Get current primary region
   */
  getPrimaryRegion(): DataResidency {
    return this.currentRegion;
  }

  /**
   * Create data residency policy
   */
  createPolicy(policy: Omit<DataResidencyPolicy, 'id' | 'createdAt' | 'updatedAt'>): DataResidencyPolicy {
    const fullPolicy: DataResidencyPolicy = {
      ...policy,
      id: `residency_policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.policies.set(fullPolicy.id, fullPolicy);
    this.emit('policy:created', { policy: fullPolicy });

    return fullPolicy;
  }

  /**
   * Update data residency policy
   */
  updatePolicy(policyId: string, updates: Partial<DataResidencyPolicy>): DataResidencyPolicy {
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
  getPolicy(policyId: string): DataResidencyPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get all policies for a region
   */
  getPoliciesByRegion(region: DataResidency): DataResidencyPolicy[] {
    return Array.from(this.policies.values()).filter(p => p.region === region);
  }

  /**
   * Track data location
   */
  trackDataLocation(dataId: string, region: DataResidency): void {
    this.dataLocations.set(dataId, region);
    this.emit('data:location_tracked', { dataId, region });
  }

  /**
   * Get data location
   */
  getDataLocation(dataId: string): DataResidency | undefined {
    return this.dataLocations.get(dataId);
  }

  /**
   * Validate data can be stored in region
   */
  validateDataResidency(
    dataType: string,
    targetRegion: DataResidency,
    classification: DataClassification
  ): {
    allowed: boolean;
    violations: string[];
    restrictions: string[];
  } {
    const violations: string[] = [];
    const restrictions: string[] = [];

    // Check region-specific restrictions
    const regionRestrictions = this.regionRestrictions.get(targetRegion) || [];
    restrictions.push(...regionRestrictions);

    // Check policies
    for (const policy of this.policies.values()) {
      if (policy.region === targetRegion && policy.dataTypes.includes(dataType)) {
        if (!policy.enforced) {
          continue;
        }

        // Check if operation is allowed
        if (!policy.allowedOperations.includes('store')) {
          violations.push(`Storage of ${dataType} not allowed in ${targetRegion}`);
        }

        restrictions.push(...policy.restrictions);
      }
    }

    // GDPR-specific checks
    if (targetRegion === DataResidency.EU) {
      // EU has strict requirements
      if (classification === DataClassification.PII || classification === DataClassification.PHI) {
        restrictions.push('GDPR compliance required');
        restrictions.push('Adequate safeguards must be in place');
      }
    }

    // US-specific checks
    if (targetRegion === DataResidency.US) {
      if (classification === DataClassification.PHI) {
        restrictions.push('HIPAA compliance required');
      }
    }

    return {
      allowed: violations.length === 0,
      violations,
      restrictions,
    };
  }

  /**
   * Check if data transfer between regions is allowed
   */
  validateDataTransfer(
    dataType: string,
    fromRegion: DataResidency,
    toRegion: DataResidency,
    classification: DataClassification
  ): {
    allowed: boolean;
    violations: string[];
    requirements: string[];
  } {
    const violations: string[] = [];
    const requirements: string[] = [];

    // EU to non-EU transfers require special handling
    if (fromRegion === DataResidency.EU && toRegion !== DataResidency.EU && toRegion !== DataResidency.UK) {
      requirements.push('Standard Contractual Clauses (SCCs) required');
      requirements.push('Adequacy decision or appropriate safeguards required');

      if (classification === DataClassification.PII) {
        requirements.push('Data subject consent may be required');
        requirements.push('DPIA may be required');
      }
    }

    // UK to non-UK transfers
    if (fromRegion === DataResidency.UK && toRegion !== DataResidency.UK && toRegion !== DataResidency.EU) {
      requirements.push('UK adequacy regulations apply');
      requirements.push('Appropriate safeguards required');
    }

    // APAC regional considerations
    if (fromRegion === DataResidency.APAC || toRegion === DataResidency.APAC) {
      requirements.push('Check local data protection laws');
      requirements.push('Cross-border transfer agreements may be required');
    }

    // PHI transfers
    if (classification === DataClassification.PHI) {
      requirements.push('BAA (Business Associate Agreement) required');
      requirements.push('HIPAA-compliant encryption required');
      requirements.push('Audit trail of transfer required');
    }

    // Check policies
    for (const policy of this.policies.values()) {
      if (policy.region === fromRegion && policy.dataTypes.includes(dataType)) {
        if (policy.enforced && !policy.allowedOperations.includes('transfer')) {
          violations.push(`Transfer of ${dataType} from ${fromRegion} not allowed by policy`);
        }
      }
    }

    return {
      allowed: violations.length === 0,
      violations,
      requirements,
    };
  }

  /**
   * Get compliance status for current configuration
   */
  getComplianceStatus(): {
    primaryRegion: DataResidency;
    policiesCount: number;
    enforcedPolicies: number;
    trackedDataCount: number;
    regionDistribution: Record<DataResidency, number>;
    violations: string[];
  } {
    const violations: string[] = [];
    const regionDistribution: Record<string, number> = {};

    // Count data by region
    for (const region of this.dataLocations.values()) {
      regionDistribution[region] = (regionDistribution[region] || 0) + 1;
    }

    // Check for policy violations
    for (const [dataId, region] of this.dataLocations.entries()) {
      const applicablePolicies = Array.from(this.policies.values()).filter(
        p => p.region === region && p.enforced
      );

      for (const policy of applicablePolicies) {
        if (!policy.allowedOperations.includes('store')) {
          violations.push(`Data ${dataId} violates storage policy in ${region}`);
        }
      }
    }

    const enforcedPolicies = Array.from(this.policies.values()).filter(p => p.enforced).length;

    return {
      primaryRegion: this.currentRegion,
      policiesCount: this.policies.size,
      enforcedPolicies,
      trackedDataCount: this.dataLocations.size,
      regionDistribution: regionDistribution as Record<DataResidency, number>,
      violations,
    };
  }

  /**
   * Initialize region-specific restrictions
   */
  private initializeRegionRestrictions(): void {
    // EU restrictions
    this.regionRestrictions.set(DataResidency.EU, [
      'GDPR Article 44-50 apply to transfers',
      'Adequate level of protection required',
      'Data subject rights must be enforceable',
    ]);

    // US restrictions
    this.regionRestrictions.set(DataResidency.US, [
      'State-specific laws may apply (CCPA, etc.)',
      'HIPAA applies to health data',
      'Industry-specific regulations apply',
    ]);

    // UK restrictions
    this.regionRestrictions.set(DataResidency.UK, [
      'UK GDPR applies',
      'ICO guidance must be followed',
      'Adequacy regulations for transfers',
    ]);

    // APAC restrictions
    this.regionRestrictions.set(DataResidency.APAC, [
      'Local data protection laws vary by country',
      'Cross-border transfer restrictions may apply',
      'Data localization requirements in some jurisdictions',
    ]);

    // Canada restrictions
    this.regionRestrictions.set(DataResidency.CANADA, [
      'PIPEDA applies',
      'Provincial laws may apply',
      'Adequate safeguards for transfers',
    ]);

    // Australia restrictions
    this.regionRestrictions.set(DataResidency.AUSTRALIA, [
      'Privacy Act 1988 applies',
      'Notifiable Data Breaches scheme',
      'APP guidelines must be followed',
    ]);
  }

  /**
   * Export residency report
   */
  exportReport(): {
    generatedAt: Date;
    primaryRegion: DataResidency;
    policies: DataResidencyPolicy[];
    dataLocations: Array<{ dataId: string; region: DataResidency }>;
    compliance: ReturnType<DataResidencyManager['getComplianceStatus']>;
  } {
    return {
      generatedAt: new Date(),
      primaryRegion: this.currentRegion,
      policies: Array.from(this.policies.values()),
      dataLocations: Array.from(this.dataLocations.entries()).map(([dataId, region]) => ({
        dataId,
        region,
      })),
      compliance: this.getComplianceStatus(),
    };
  }

  /**
   * Clear data location tracking
   */
  clearDataLocation(dataId: string): void {
    this.dataLocations.delete(dataId);
    this.emit('data:location_cleared', { dataId });
  }

  /**
   * Delete policy
   */
  deletePolicy(policyId: string): void {
    this.policies.delete(policyId);
    this.emit('policy:deleted', { policyId });
  }
}

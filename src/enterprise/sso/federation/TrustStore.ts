/**
 * TrustStore - Manages trust relationships between organizations
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  TrustRelationship,
  TrustType,
  TrustDirection,
  FederationProtocol,
  FederationMetadata,
  ClaimsMappingRule,
  OrganizationInfo,
} from './types';

export class TrustStore extends EventEmitter {
  private trustRelationships: Map<string, TrustRelationship> = new Map();

  /**
   * Create a trust relationship between organizations
   */
  async createTrustRelationship(
    sourceOrg: OrganizationInfo,
    targetOrg: OrganizationInfo,
    options: {
      trustType: TrustType;
      trustDirection: TrustDirection;
      protocol: FederationProtocol;
      metadata: FederationMetadata;
      claimsMapping?: ClaimsMappingRule[];
      validityDays?: number;
      autoRenew?: boolean;
      tags?: string[];
    }
  ): Promise<TrustRelationship> {
    this.validateOrganization(sourceOrg);
    this.validateOrganization(targetOrg);

    const existingTrust = this.findTrustRelationship(
      sourceOrg.entityId,
      targetOrg.entityId
    );
    if (existingTrust) {
      throw new Error(
        `Trust relationship already exists between ${sourceOrg.name} and ${targetOrg.name}`
      );
    }

    const now = new Date();
    const validityDays = options.validityDays || 365;

    const trustRelationship: TrustRelationship = {
      id: crypto.randomUUID(),
      name: `${sourceOrg.name} <-> ${targetOrg.name}`,
      sourceOrganization: sourceOrg,
      targetOrganization: targetOrg,
      trustType: options.trustType,
      trustDirection: options.trustDirection,
      status: 'pending',
      protocol: options.protocol,
      metadata: options.metadata,
      claimsMapping: options.claimsMapping || [],
      validFrom: now,
      validUntil: new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
      autoRenew: options.autoRenew ?? true,
      tags: options.tags || [],
    };

    this.trustRelationships.set(trustRelationship.id, trustRelationship);

    this.emit('trustRelationshipCreated', {
      trustId: trustRelationship.id,
      sourceOrg: sourceOrg.name,
      targetOrg: targetOrg.name,
      protocol: options.protocol,
    });

    return trustRelationship;
  }

  /**
   * Activate a trust relationship
   */
  async activateTrustRelationship(trustId: string): Promise<TrustRelationship> {
    const trust = this.trustRelationships.get(trustId);
    if (!trust) {
      throw new Error(`Trust relationship not found: ${trustId}`);
    }

    if (trust.status === 'active') {
      return trust;
    }

    await this.verifyTrustMetadata(trust);

    trust.status = 'active';
    trust.updatedAt = new Date();
    trust.lastVerifiedAt = new Date();

    this.emit('trustRelationshipActivated', {
      trustId: trust.id,
      sourceOrg: trust.sourceOrganization.name,
      targetOrg: trust.targetOrganization.name,
    });

    return trust;
  }

  /**
   * Suspend a trust relationship
   */
  async suspendTrustRelationship(
    trustId: string,
    reason: string
  ): Promise<TrustRelationship> {
    const trust = this.trustRelationships.get(trustId);
    if (!trust) {
      throw new Error(`Trust relationship not found: ${trustId}`);
    }

    trust.status = 'suspended';
    trust.updatedAt = new Date();

    this.emit('trustRelationshipSuspended', {
      trustId: trust.id,
      reason,
    });

    return trust;
  }

  /**
   * Revoke a trust relationship
   */
  async revokeTrustRelationship(trustId: string, reason: string): Promise<void> {
    const trust = this.trustRelationships.get(trustId);
    if (!trust) {
      throw new Error(`Trust relationship not found: ${trustId}`);
    }

    trust.status = 'revoked';
    trust.updatedAt = new Date();

    this.emit('trustRelationshipRevoked', {
      trustId: trust.id,
      reason,
    });
  }

  /**
   * Get a trust relationship by ID
   */
  getTrustRelationship(trustId: string): TrustRelationship | undefined {
    return this.trustRelationships.get(trustId);
  }

  /**
   * Find trust relationship by entity IDs
   */
  findTrustRelationship(
    sourceEntityId: string,
    targetEntityId: string
  ): TrustRelationship | undefined {
    return Array.from(this.trustRelationships.values()).find(
      t =>
        (t.sourceOrganization.entityId === sourceEntityId &&
         t.targetOrganization.entityId === targetEntityId) ||
        (t.trustDirection === 'two-way' &&
         t.sourceOrganization.entityId === targetEntityId &&
         t.targetOrganization.entityId === sourceEntityId)
    );
  }

  /**
   * Get all trust relationships
   */
  getAllTrustRelationships(): TrustRelationship[] {
    return Array.from(this.trustRelationships.values());
  }

  /**
   * Get active trust relationships count
   */
  getActiveTrustCount(): number {
    return Array.from(this.trustRelationships.values())
      .filter(t => t.status === 'active').length;
  }

  /**
   * Get total trust relationships count
   */
  getTotalTrustCount(): number {
    return this.trustRelationships.size;
  }

  /**
   * Verify trust relationships for expiration
   */
  async verifyTrustRelationships(): Promise<void> {
    const now = new Date();
    const trusts = Array.from(this.trustRelationships.values());

    for (const trust of trusts) {
      if (trust.validUntil < now) {
        if (trust.autoRenew) {
          trust.validUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
          trust.updatedAt = now;
          this.emit('trustRelationshipRenewed', { trustId: trust.id });
        } else {
          trust.status = 'expired';
          this.emit('trustRelationshipExpired', { trustId: trust.id });
        }
      }
    }
  }

  /**
   * Clear all trust relationships
   */
  clear(): void {
    this.trustRelationships.clear();
  }

  private validateOrganization(org: OrganizationInfo): void {
    if (!org.id || !org.name || !org.domain || !org.entityId) {
      throw new Error('Invalid organization info: missing required fields');
    }
  }

  private async verifyTrustMetadata(trust: TrustRelationship): Promise<void> {
    if (trust.metadata.certificate) {
      const certValid = true; // Placeholder for certificate verification
      if (!certValid) {
        throw new Error('Invalid certificate in trust metadata');
      }
    }
  }
}

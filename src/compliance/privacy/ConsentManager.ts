/**
 * Consent Manager
 * Manages user consent for data processing
 */

import { EventEmitter } from 'events';
import { ConsentRecord, ConsentPurpose } from '../../types/compliance';

export class ConsentManager extends EventEmitter {
  private consents: Map<string, ConsentRecord[]> = new Map();

  /**
   * Grant consent
   */
  grantConsent(
    userId: string,
    purpose: ConsentPurpose,
    version: string,
    metadata?: Record<string, unknown>
  ): ConsentRecord {
    const consent: ConsentRecord = {
      id: `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      purpose,
      granted: true,
      grantedAt: new Date(),
      version,
      metadata,
    };

    const userConsents = this.consents.get(userId) || [];
    userConsents.push(consent);
    this.consents.set(userId, userConsents);

    this.emit('consent:granted', { consent });
    return consent;
  }

  /**
   * Revoke consent
   */
  revokeConsent(userId: string, purpose: ConsentPurpose): void {
    const userConsents = this.consents.get(userId) || [];
    const activeConsent = userConsents.find(
      c => c.purpose === purpose && c.granted && !c.revokedAt
    );

    if (activeConsent) {
      activeConsent.granted = false;
      activeConsent.revokedAt = new Date();
      this.emit('consent:revoked', { consent: activeConsent });
    }
  }

  /**
   * Check if user has consented
   */
  hasConsent(userId: string, purpose: ConsentPurpose): boolean {
    const userConsents = this.consents.get(userId) || [];
    const activeConsent = userConsents.find(
      c => c.purpose === purpose && c.granted && !c.revokedAt
    );

    if (!activeConsent) return false;

    // Check expiration
    if (activeConsent.expiresAt && activeConsent.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Get user consents
   */
  getUserConsents(userId: string): ConsentRecord[] {
    return this.consents.get(userId) || [];
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalUsers: number;
    totalConsents: number;
    activeConsents: number;
    revokedConsents: number;
    byPurpose: Record<ConsentPurpose, number>;
  } {
    const byPurpose: Partial<Record<ConsentPurpose, number>> = {};
    let totalConsents = 0;
    let activeConsents = 0;
    let revokedConsents = 0;

    for (const userConsents of this.consents.values()) {
      for (const consent of userConsents) {
        totalConsents++;
        byPurpose[consent.purpose] = (byPurpose[consent.purpose] || 0) + 1;

        if (consent.granted && !consent.revokedAt) {
          activeConsents++;
        } else if (consent.revokedAt) {
          revokedConsents++;
        }
      }
    }

    return {
      totalUsers: this.consents.size,
      totalConsents,
      activeConsents,
      revokedConsents,
      byPurpose: byPurpose as Record<ConsentPurpose, number>,
    };
  }
}

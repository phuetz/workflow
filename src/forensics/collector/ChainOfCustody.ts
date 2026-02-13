/**
 * ChainOfCustody - Evidence Integrity Management Module
 *
 * Manages chain of custody, legal holds, evidence hashing,
 * and integrity verification for forensic evidence.
 */

import * as crypto from 'crypto';
import {
  EvidenceItem,
  EvidenceHashes,
  ChainOfCustodyEntry,
  LegalHold,
  HashAlgorithm,
} from './types';

/**
 * Chain of custody report structure
 */
export interface ChainOfCustodyReport {
  evidence: EvidenceItem;
  chainOfCustody: ChainOfCustodyEntry[];
  generatedAt: Date;
  generatedBy: string;
}

/**
 * Verification result structure
 */
export interface VerificationResult {
  valid: boolean;
  originalHash: string;
  currentHash: string;
  algorithm: string;
  verifiedAt: Date;
}

/**
 * Chain of custody manager for evidence integrity
 */
export class ChainOfCustodyManager {
  private legalHolds: Map<string, LegalHold> = new Map();
  private generateId: () => string;

  constructor(generateId: () => string) {
    this.generateId = generateId;
  }

  /**
   * Hash evidence for integrity verification
   */
  public async hashEvidence(
    evidence: EvidenceItem,
    data: Buffer,
    algorithms: HashAlgorithm[] = ['sha256']
  ): Promise<EvidenceHashes> {
    const hashes: EvidenceHashes = {
      sha256: evidence.hashes.sha256,
    };

    for (const algorithm of algorithms) {
      const hash = crypto.createHash(algorithm);
      hash.update(data);
      const hashValue = hash.digest('hex');

      switch (algorithm) {
        case 'md5':
          hashes.md5 = hashValue;
          break;
        case 'sha1':
          hashes.sha1 = hashValue;
          break;
        case 'sha256':
          hashes.sha256 = hashValue;
          break;
        case 'sha512':
          hashes.sha512 = hashValue;
          break;
      }
    }

    hashes.verifiedAt = new Date();

    // Update evidence with new hashes
    evidence.hashes = hashes;
    evidence.verified = true;

    // Add verification to chain of custody
    evidence.chainOfCustody.push({
      id: this.generateId(),
      timestamp: new Date(),
      action: 'verified',
      actor: 'system',
      description: `Hash verification completed: ${algorithms.join(', ')}`,
      newHash: hashes.sha256,
    });

    return hashes;
  }

  /**
   * Verify evidence integrity
   */
  public async verifyEvidence(
    evidence: EvidenceItem,
    data: Buffer
  ): Promise<VerificationResult> {
    const originalHash = evidence.hashes.sha256;
    const currentHash = crypto.createHash('sha256').update(data).digest('hex');

    const result: VerificationResult = {
      valid: originalHash === currentHash,
      originalHash,
      currentHash,
      algorithm: 'sha256',
      verifiedAt: new Date(),
    };

    evidence.chainOfCustody.push({
      id: this.generateId(),
      timestamp: new Date(),
      action: 'verified',
      actor: 'system',
      description: result.valid ? 'Integrity verification passed' : 'Integrity verification FAILED',
      previousHash: originalHash,
      newHash: currentHash,
    });

    return result;
  }

  /**
   * Add chain of custody entry
   */
  public addCustodyEntry(
    evidence: EvidenceItem,
    action: ChainOfCustodyEntry['action'],
    actor: string,
    description: string,
    options: {
      previousHash?: string;
      newHash?: string;
      location?: string;
      signature?: string;
    } = {}
  ): ChainOfCustodyEntry {
    const entry: ChainOfCustodyEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      action,
      actor,
      description,
      ...options,
    };

    evidence.chainOfCustody.push(entry);
    return entry;
  }

  /**
   * Apply legal hold to evidence
   */
  public applyLegalHold(
    holdConfig: Omit<LegalHold, 'id' | 'isActive'>,
    evidenceItems: Map<string, EvidenceItem>,
    evidenceIds: string[]
  ): LegalHold {
    const holdId = this.generateId();
    const hold: LegalHold = {
      ...holdConfig,
      id: holdId,
      isActive: true,
    };

    this.legalHolds.set(holdId, hold);

    // Apply hold to each evidence item
    for (const evidenceId of evidenceIds) {
      const evidence = evidenceItems.get(evidenceId);
      if (evidence) {
        evidence.legalHold = hold;
        evidence.chainOfCustody.push({
          id: this.generateId(),
          timestamp: new Date(),
          action: 'transferred',
          actor: holdConfig.createdBy,
          description: `Legal hold applied: ${hold.name} (${hold.caseReference})`,
        });
      }
    }

    return hold;
  }

  /**
   * Release legal hold
   */
  public releaseLegalHold(
    holdId: string,
    releasedBy: string,
    evidenceItems: Map<string, EvidenceItem>
  ): void {
    const hold = this.legalHolds.get(holdId);
    if (!hold) {
      throw new Error(`Legal hold not found: ${holdId}`);
    }

    hold.isActive = false;
    hold.endDate = new Date();

    // Update all evidence under this hold
    evidenceItems.forEach((evidence) => {
      if (evidence.legalHold?.id === holdId) {
        evidence.chainOfCustody.push({
          id: this.generateId(),
          timestamp: new Date(),
          action: 'transferred',
          actor: releasedBy,
          description: `Legal hold released: ${hold.name}`,
        });
      }
    });
  }

  /**
   * Get evidence under specific legal hold
   */
  public getEvidenceUnderHold(
    holdId: string,
    evidenceItems: Map<string, EvidenceItem>
  ): EvidenceItem[] {
    return Array.from(evidenceItems.values()).filter(
      evidence => evidence.legalHold?.id === holdId
    );
  }

  /**
   * Check if evidence can be deleted
   */
  public canDeleteEvidence(
    evidenceId: string,
    evidenceItems: Map<string, EvidenceItem>
  ): { canDelete: boolean; reason?: string } {
    const evidence = evidenceItems.get(evidenceId);
    if (!evidence) {
      return { canDelete: false, reason: 'Evidence not found' };
    }

    if (evidence.legalHold?.isActive) {
      return {
        canDelete: false,
        reason: `Evidence is under active legal hold: ${evidence.legalHold.name}`,
      };
    }

    return { canDelete: true };
  }

  /**
   * Get legal hold by ID
   */
  public getLegalHold(holdId: string): LegalHold | null {
    return this.legalHolds.get(holdId) || null;
  }

  /**
   * Get all active legal holds
   */
  public getActiveLegalHolds(): LegalHold[] {
    return Array.from(this.legalHolds.values()).filter(h => h.isActive);
  }

  /**
   * Export chain of custody report
   */
  public exportChainOfCustody(
    evidenceId: string,
    evidenceItems: Map<string, EvidenceItem>
  ): ChainOfCustodyReport {
    const evidence = evidenceItems.get(evidenceId);
    if (!evidence) {
      throw new Error(`Evidence not found: ${evidenceId}`);
    }

    return {
      evidence,
      chainOfCustody: evidence.chainOfCustody,
      generatedAt: new Date(),
      generatedBy: 'EvidenceCollector',
    };
  }

  /**
   * Load legal holds from storage
   */
  public loadLegalHolds(holds: LegalHold[]): void {
    for (const hold of holds) {
      this.legalHolds.set(hold.id, hold);
    }
  }

  /**
   * Get all legal holds
   */
  public getAllLegalHolds(): LegalHold[] {
    return Array.from(this.legalHolds.values());
  }
}

export default ChainOfCustodyManager;

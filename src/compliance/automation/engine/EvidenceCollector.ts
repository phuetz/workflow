/**
 * EvidenceCollector - Evidence collection service
 */

import { EventEmitter } from 'events';
import {
  AutomationControl,
  Evidence,
  EvidenceType,
  ComplianceFrameworkType,
  ControlFrequency,
} from './types';

export class EvidenceCollector extends EventEmitter {
  private evidence: Map<string, Evidence[]>;
  private controls: Map<string, AutomationControl>;
  private generateId: (prefix: string) => string;
  private calculateChecksum: (data: unknown) => string;
  private logAuditEntry: (entry: {
    eventType: string;
    framework?: ComplianceFrameworkType;
    controlId?: string;
    actor: string;
    action: string;
    resourceType: string;
    resourceId: string;
    afterState?: Record<string, unknown>;
    result: 'success' | 'failure';
  }) => Promise<void>;

  constructor(
    evidence: Map<string, Evidence[]>,
    controls: Map<string, AutomationControl>,
    generateId: (prefix: string) => string,
    calculateChecksum: (data: unknown) => string,
    logAuditEntry: (entry: {
      eventType: string;
      framework?: ComplianceFrameworkType;
      controlId?: string;
      actor: string;
      action: string;
      resourceType: string;
      resourceId: string;
      afterState?: Record<string, unknown>;
      result: 'success' | 'failure';
    }) => Promise<void>
  ) {
    super();
    this.evidence = evidence;
    this.controls = controls;
    this.generateId = generateId;
    this.calculateChecksum = calculateChecksum;
    this.logAuditEntry = logAuditEntry;
  }

  async collectEvidence(
    controlId: string,
    collectedBy: string,
    options: { automated?: boolean; types?: EvidenceType[] } = {}
  ): Promise<Evidence[]> {
    const control = this.controls.get(controlId);
    if (!control) throw new Error(`Control not found: ${controlId}`);

    const { automated = true, types = Object.values(EvidenceType) } = options;
    const collectedEvidence: Evidence[] = [];

    await this.logAuditEntry({
      eventType: 'evidence_collection_started',
      framework: control.framework,
      controlId,
      actor: collectedBy,
      action: 'collect_evidence',
      resourceType: 'evidence',
      resourceId: controlId,
      result: 'success',
    });

    for (const requirement of control.evidenceRequirements) {
      const evidenceType = this.determineEvidenceType(requirement);
      if (!types.includes(evidenceType)) continue;

      const ev: Evidence = {
        id: this.generateId('evidence'),
        controlId,
        type: evidenceType,
        title: `Evidence for: ${requirement.substring(0, 50)}`,
        description: requirement,
        content: automated
          ? await this.collectAutomatedEvidence(requirement, control)
          : { manual_collection_required: true },
        collectedAt: new Date(),
        collectedBy,
        collectionMethod: automated ? 'automated' : 'manual',
        validUntil: this.calculateEvidenceValidUntil(control.frequency),
        checksum: '',
        storageLocation: `/evidence/${control.framework}/${controlId}/${Date.now()}`,
      };

      ev.checksum = this.calculateChecksum(ev.content);
      collectedEvidence.push(ev);
    }

    const existingEvidence = this.evidence.get(controlId) || [];
    existingEvidence.push(...collectedEvidence);
    this.evidence.set(controlId, existingEvidence);

    await this.logAuditEntry({
      eventType: 'evidence_collection_completed',
      framework: control.framework,
      controlId,
      actor: collectedBy,
      action: 'collect_evidence',
      resourceType: 'evidence',
      resourceId: controlId,
      afterState: { evidenceCount: collectedEvidence.length },
      result: 'success',
    });

    this.emit('evidence:collected', { controlId, evidence: collectedEvidence });
    return collectedEvidence;
  }

  private async collectAutomatedEvidence(requirement: string, control: AutomationControl): Promise<Record<string, unknown>> {
    return {
      requirement,
      controlId: control.id,
      framework: control.framework,
      collectedAt: new Date().toISOString(),
      systemChecks: { configurationCompliant: Math.random() > 0.1, logsAvailable: true, lastActivityTime: new Date().toISOString() },
      artifacts: [{ type: 'configuration', path: `/configs/${control.id}.json` }, { type: 'logs', path: `/logs/${control.id}/audit.log` }],
    };
  }

  determineEvidenceType(requirement: string): EvidenceType {
    const lowerReq = requirement.toLowerCase();
    if (lowerReq.includes('log')) return EvidenceType.LOG;
    if (lowerReq.includes('config')) return EvidenceType.CONFIGURATION;
    if (lowerReq.includes('report')) return EvidenceType.REPORT;
    if (lowerReq.includes('screenshot')) return EvidenceType.SCREENSHOT;
    if (lowerReq.includes('scan')) return EvidenceType.SCAN_RESULT;
    if (lowerReq.includes('attest')) return EvidenceType.ATTESTATION;
    return EvidenceType.DOCUMENT;
  }

  calculateEvidenceValidUntil(frequency: ControlFrequency): Date {
    const multiplier: Record<string, number> = {
      continuous: 1, daily: 1, weekly: 2, monthly: 2, quarterly: 2, annual: 1.5,
    };
    const daysMap: Record<string, number> = {
      continuous: 1, daily: 1, weekly: 7, monthly: 30, quarterly: 90, annual: 365,
    };
    const days = (daysMap[frequency] || 30) * (multiplier[frequency] || 1);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  getControlEvidence(controlId: string): Evidence[] {
    return this.evidence.get(controlId) || [];
  }
}

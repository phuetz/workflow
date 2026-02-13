/**
 * ControlEvaluator - Control assessment and evaluation logic
 */

import { EventEmitter } from 'events';
import {
  AutomationControl,
  AssessmentResult,
  AssessmentType,
  ControlStatus,
  Evidence,
  EvidenceType,
  Finding,
  AlertSeverity,
  ComplianceFrameworkType,
  RemediationPlan,
  ComplianceGap,
  ControlFrequency,
} from './types';

export class ControlEvaluator extends EventEmitter {
  private controls: Map<string, AutomationControl>;
  private evidence: Map<string, Evidence[]>;
  private assessments: Map<string, AssessmentResult[]>;
  private gaps: Map<string, ComplianceGap>;

  private generateId: (prefix: string) => string;
  private createRemediationPlan: (
    control: AutomationControl,
    findings: Finding[],
    createdBy: string
  ) => Promise<RemediationPlan>;
  private logAuditEntry: (entry: {
    eventType: string;
    framework?: ComplianceFrameworkType;
    controlId?: string;
    actor: string;
    action: string;
    resourceType: string;
    resourceId: string;
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;
    result: 'success' | 'failure';
  }) => Promise<void>;

  constructor(
    controls: Map<string, AutomationControl>,
    evidence: Map<string, Evidence[]>,
    assessments: Map<string, AssessmentResult[]>,
    gaps: Map<string, ComplianceGap>,
    generateId: (prefix: string) => string,
    createRemediationPlan: (
      control: AutomationControl,
      findings: Finding[],
      createdBy: string
    ) => Promise<RemediationPlan>,
    logAuditEntry: (entry: {
      eventType: string;
      framework?: ComplianceFrameworkType;
      controlId?: string;
      actor: string;
      action: string;
      resourceType: string;
      resourceId: string;
      beforeState?: Record<string, unknown>;
      afterState?: Record<string, unknown>;
      result: 'success' | 'failure';
    }) => Promise<void>
  ) {
    super();
    this.controls = controls;
    this.evidence = evidence;
    this.assessments = assessments;
    this.gaps = gaps;
    this.generateId = generateId;
    this.createRemediationPlan = createRemediationPlan;
    this.logAuditEntry = logAuditEntry;
  }

  /**
   * Assess a specific control and collect evidence
   */
  async assessControl(
    controlId: string,
    assessedBy: string,
    options: {
      collectEvidence?: boolean;
      runAutomation?: boolean;
      notes?: string;
    } = {},
    collectEvidenceFunc: (controlId: string, collectedBy: string, opts: { automated?: boolean }) => Promise<Evidence[]>,
    createGapFunc: (control: AutomationControl, assessment: AssessmentResult | undefined, identifiedBy: string) => Promise<ComplianceGap>,
    createAlertFunc: (params: { framework?: ComplianceFrameworkType; controlId?: string; severity: AlertSeverity; title: string; description: string; source: string }) => Promise<void>,
    updateScoreFunc: (framework: ComplianceFrameworkType) => Promise<void>
  ): Promise<AssessmentResult> {
    const control = this.controls.get(controlId);
    if (!control) {
      throw new Error(`Control not found: ${controlId}`);
    }

    const { collectEvidence = true, runAutomation = true, notes } = options;

    // Log assessment start
    await this.logAuditEntry({
      eventType: 'control_assessment_started',
      framework: control.framework,
      controlId,
      actor: assessedBy,
      action: 'assess_control',
      resourceType: 'control',
      resourceId: controlId,
      result: 'success',
    });

    let evidenceIds: string[] = [];
    let findings: Finding[] = [];
    let status: ControlStatus = ControlStatus.NOT_ASSESSED;
    let score = 0;

    // Collect evidence if requested
    if (collectEvidence) {
      const collectedEvidence = await collectEvidenceFunc(controlId, assessedBy, {
        automated: runAutomation,
      });
      evidenceIds = collectedEvidence.map(e => e.id);
    }

    // Run automation assessment if available
    if (runAutomation && control.automationScript) {
      const automationResult = await this.runAutomatedAssessment(control);
      findings = automationResult.findings;
      status = automationResult.status;
      score = automationResult.score;
    } else {
      // Manual assessment - calculate based on evidence
      const evidenceList = this.evidence.get(controlId) || [];
      const evidenceScore = this.calculateEvidenceScore(control, evidenceList);
      score = evidenceScore;
      status = this.determineStatusFromScore(score);
    }

    // Create assessment result
    const assessment: AssessmentResult = {
      id: this.generateId('assessment'),
      controlId,
      framework: control.framework,
      status,
      assessmentType: runAutomation ? AssessmentType.AUTOMATED : AssessmentType.MANUAL,
      assessedBy,
      assessedAt: new Date(),
      findings,
      evidenceIds,
      score,
      notes,
      nextReviewDate: this.calculateNextReviewDate(control.frequency),
      remediationRequired: status === ControlStatus.NON_COMPLIANT || status === ControlStatus.PARTIALLY_COMPLIANT,
    };

    // Create remediation plan if needed
    if (assessment.remediationRequired) {
      assessment.remediationPlan = await this.createRemediationPlan(control, findings, assessedBy);
    }

    // Store assessment
    const controlAssessments = this.assessments.get(controlId) || [];
    controlAssessments.push(assessment);
    this.assessments.set(controlId, controlAssessments);

    // Update control status
    control.status = status;
    control.lastAssessedAt = new Date();
    control.nextAssessmentDue = assessment.nextReviewDate;
    this.controls.set(controlId, control);

    // Create gap if non-compliant
    if (status === ControlStatus.NON_COMPLIANT || status === ControlStatus.PARTIALLY_COMPLIANT) {
      await createGapFunc(control, assessment, assessedBy);
    }

    // Update compliance score
    await updateScoreFunc(control.framework);

    // Log assessment completion
    await this.logAuditEntry({
      eventType: 'control_assessment_completed',
      framework: control.framework,
      controlId,
      actor: assessedBy,
      action: 'assess_control',
      resourceType: 'control',
      resourceId: controlId,
      afterState: { status, score },
      result: 'success',
    });

    // Emit event
    this.emit('control:assessed', { assessment, control });

    // Generate alert if needed
    if (status === ControlStatus.NON_COMPLIANT) {
      await createAlertFunc({
        framework: control.framework,
        controlId,
        severity: AlertSeverity.HIGH,
        title: `Control ${control.name} is non-compliant`,
        description: `Assessment found control ${controlId} to be non-compliant with a score of ${score}`,
        source: 'assessment',
      });
    }

    return assessment;
  }

  /**
   * Run automated assessment using control's automation script
   */
  private async runAutomatedAssessment(control: AutomationControl): Promise<{
    status: ControlStatus;
    score: number;
    findings: Finding[];
  }> {
    const findings: Finding[] = [];
    let score = 100;

    // Simulate checking various requirements
    for (const requirement of control.requirements) {
      const isCompliant = await this.checkRequirement(requirement);
      if (!isCompliant) {
        score -= Math.floor(100 / control.requirements.length);
        findings.push({
          id: this.generateId('finding'),
          severity: AlertSeverity.MEDIUM,
          title: `Requirement not met: ${requirement.substring(0, 50)}`,
          description: `The requirement "${requirement}" was not satisfied during automated assessment.`,
          affectedResources: [control.id],
          recommendation: `Review and implement the requirement: ${requirement}`,
          references: [],
        });
      }
    }

    const status = this.determineStatusFromScore(score);
    return { status, score: Math.max(0, score), findings };
  }

  /**
   * Check a specific requirement (simulated)
   */
  private async checkRequirement(_requirement: string): Promise<boolean> {
    // In production, this would perform actual checks
    return Math.random() > 0.15;
  }

  /**
   * Calculate evidence score
   */
  calculateEvidenceScore(control: AutomationControl, evidenceList: Evidence[]): number {
    if (control.evidenceRequirements.length === 0) return 100;

    const fulfilledRequirements = control.evidenceRequirements.filter(req =>
      evidenceList.some(e => e.description.toLowerCase().includes(req.toLowerCase()))
    );

    return (fulfilledRequirements.length / control.evidenceRequirements.length) * 100;
  }

  /**
   * Determine status from score
   */
  determineStatusFromScore(score: number): ControlStatus {
    if (score >= 90) return ControlStatus.COMPLIANT;
    if (score >= 70) return ControlStatus.PARTIALLY_COMPLIANT;
    return ControlStatus.NON_COMPLIANT;
  }

  /**
   * Calculate next review date based on frequency
   */
  calculateNextReviewDate(frequency: ControlFrequency): Date {
    const now = Date.now();
    const daysMap: Record<string, number> = {
      continuous: 1,
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      annual: 365,
    };
    return new Date(now + (daysMap[frequency] || 30) * 24 * 60 * 60 * 1000);
  }

  /**
   * Get frequency in days
   */
  getFrequencyDays(frequency: ControlFrequency): number {
    const daysMap: Record<string, number> = {
      continuous: 0,
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      annual: 365,
    };
    return daysMap[frequency] || 30;
  }

  /**
   * Determine evidence type from requirement
   */
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

  /**
   * Calculate evidence valid until date
   */
  calculateEvidenceValidUntil(frequency: ControlFrequency): Date {
    const multiplier: Record<string, number> = {
      continuous: 1,
      daily: 1,
      weekly: 2,
      monthly: 2,
      quarterly: 2,
      annual: 1.5,
    };
    const daysMap: Record<string, number> = {
      continuous: 1,
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      annual: 365,
    };
    const days = (daysMap[frequency] || 30) * (multiplier[frequency] || 1);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}

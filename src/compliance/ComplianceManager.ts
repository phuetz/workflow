/**
 * Compliance Manager - Core Compliance Engine
 * Manages compliance frameworks, controls, evidence, and reporting
 */

import { EventEmitter } from 'events';
import {
  ComplianceStatus,
  DataResidency,
} from '../types/compliance';
import type {
  ComplianceFramework,
  ComplianceControl,
  ControlAssessment,
  Evidence,
  Attestation,
  ComplianceGap,
  GapAnalysisReport,
  ComplianceConfig,
  ComplianceMetrics,
  ComplianceDashboardData,
  ControlCategory,
} from '../types/compliance';

export interface IComplianceFramework {
  framework: ComplianceFramework;
  getControls(): ComplianceControl[];
  assessControl(controlId: string): Promise<ControlAssessment>;
  getControlById(controlId: string): ComplianceControl | undefined;
}

export class ComplianceManager extends EventEmitter {
  private config: ComplianceConfig;
  private frameworks: Map<ComplianceFramework, IComplianceFramework> = new Map();
  private controls: Map<string, ComplianceControl> = new Map();
  private assessments: Map<string, ControlAssessment> = new Map();
  private evidence: Map<string, Evidence[]> = new Map();
  private attestations: Map<string, Attestation[]> = new Map();
  private gaps: Map<string, ComplianceGap> = new Map();

  constructor(config: Partial<ComplianceConfig> = {}) {
    super();
    this.config = {
      enabledFrameworks: config.enabledFrameworks || [],
      dataResidency: config.dataResidency || DataResidency.US,
      defaultRetentionDays: config.defaultRetentionDays || 2555, // 7 years
      enableAutomatedEvidence: config.enableAutomatedEvidence ?? true,
      enableContinuousMonitoring: config.enableContinuousMonitoring ?? true,
      auditLogRetentionDays: config.auditLogRetentionDays || 2555,
      requireAttestations: config.requireAttestations ?? true,
      enablePIIDetection: config.enablePIIDetection ?? true,
      notifyOnNonCompliance: config.notifyOnNonCompliance ?? true,
      autoRemediationEnabled: config.autoRemediationEnabled ?? false,
    };
  }

  // ============================================================================
  // Framework Management
  // ============================================================================

  /**
   * Register a compliance framework
   */
  registerFramework(framework: IComplianceFramework): void {
    this.frameworks.set(framework.framework, framework);

    // Load controls from framework
    const controls = framework.getControls();
    for (const control of controls) {
      this.controls.set(control.id, control);
    }

    this.emit('framework:registered', {
      framework: framework.framework,
      controlCount: controls.length,
    });
  }

  /**
   * Enable a compliance framework
   */
  enableFramework(framework: ComplianceFramework): void {
    if (!this.frameworks.has(framework)) {
      throw new Error(`Framework ${framework} not registered`);
    }

    if (!this.config.enabledFrameworks.includes(framework)) {
      this.config.enabledFrameworks.push(framework);
      this.emit('framework:enabled', { framework });
    }
  }

  /**
   * Disable a compliance framework
   */
  disableFramework(framework: ComplianceFramework): void {
    this.config.enabledFrameworks = this.config.enabledFrameworks.filter(
      f => f !== framework
    );
    this.emit('framework:disabled', { framework });
  }

  /**
   * Get enabled frameworks
   */
  getEnabledFrameworks(): ComplianceFramework[] {
    return [...this.config.enabledFrameworks];
  }

  /**
   * Check if framework is enabled
   */
  isFrameworkEnabled(framework: ComplianceFramework): boolean {
    return this.config.enabledFrameworks.includes(framework);
  }

  // ============================================================================
  // Control Management
  // ============================================================================

  /**
   * Get all controls for a framework
   */
  getControlsByFramework(framework: ComplianceFramework): ComplianceControl[] {
    return Array.from(this.controls.values()).filter(
      c => c.framework === framework
    );
  }

  /**
   * Get control by ID
   */
  getControl(controlId: string): ComplianceControl | undefined {
    return this.controls.get(controlId);
  }

  /**
   * Get controls by category
   */
  getControlsByCategory(category: ControlCategory): ComplianceControl[] {
    return Array.from(this.controls.values()).filter(
      c => c.category === category
    );
  }

  /**
   * Get controls by status
   */
  getControlsByStatus(status: ComplianceStatus): ComplianceControl[] {
    return Array.from(this.controls.values()).filter(
      c => c.status === status
    );
  }

  /**
   * Update control status
   */
  updateControlStatus(
    controlId: string,
    status: ComplianceStatus,
    notes?: string
  ): void {
    const control = this.controls.get(controlId);
    if (!control) {
      throw new Error(`Control ${controlId} not found`);
    }

    const oldStatus = control.status;
    control.status = status;
    control.lastAssessed = new Date();

    this.emit('control:status_changed', {
      controlId,
      oldStatus,
      newStatus: status,
      notes,
    });

    // Trigger alerts for non-compliance
    if (status === ComplianceStatus.NON_COMPLIANT && this.config.notifyOnNonCompliance) {
      this.emit('control:non_compliant', { control, notes });
    }
  }

  // ============================================================================
  // Assessment Management
  // ============================================================================

  /**
   * Create control assessment
   */
  async assessControl(
    controlId: string,
    assessedBy: string,
    status: ComplianceStatus,
    findings: string[] = [],
    evidenceLinks: string[] = []
  ): Promise<ControlAssessment> {
    const control = this.controls.get(controlId);
    if (!control) {
      throw new Error(`Control ${controlId} not found`);
    }

    const assessment: ControlAssessment = {
      id: `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      controlId,
      assessedBy,
      assessedAt: new Date(),
      status,
      findings,
      evidenceLinks,
      nextReviewDate: this.calculateNextReviewDate(control.frequency),
      notes: findings.join('; '),
    };

    this.assessments.set(assessment.id, assessment);
    this.updateControlStatus(controlId, status);

    this.emit('control:assessed', { assessment });

    // Create gap if non-compliant
    if (status === ComplianceStatus.NON_COMPLIANT) {
      await this.createGap(controlId, findings.join('; '), assessedBy);
    }

    return assessment;
  }

  /**
   * Get assessments for control
   */
  getAssessments(controlId: string): ControlAssessment[] {
    return Array.from(this.assessments.values()).filter(
      a => a.controlId === controlId
    );
  }

  /**
   * Get latest assessment for control
   */
  getLatestAssessment(controlId: string): ControlAssessment | undefined {
    const assessments = this.getAssessments(controlId);
    if (assessments.length === 0) return undefined;

    return assessments.sort(
      (a, b) => b.assessedAt.getTime() - a.assessedAt.getTime()
    )[0];
  }

  // ============================================================================
  // Evidence Management
  // ============================================================================

  /**
   * Add evidence for control
   */
  addEvidence(evidence: Evidence): void {
    const controlEvidence = this.evidence.get(evidence.controlId) || [];
    controlEvidence.push(evidence);
    this.evidence.set(evidence.controlId, controlEvidence);

    this.emit('evidence:added', { evidence });
  }

  /**
   * Get evidence for control
   */
  getEvidence(controlId: string): Evidence[] {
    return this.evidence.get(controlId) || [];
  }

  /**
   * Get all evidence
   */
  getAllEvidence(): Evidence[] {
    const all: Evidence[] = [];
    for (const evidenceList of this.evidence.values()) {
      all.push(...evidenceList);
    }
    return all;
  }

  /**
   * Remove expired evidence
   */
  cleanupExpiredEvidence(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [controlId, evidenceList] of this.evidence.entries()) {
      const valid = evidenceList.filter(e => {
        if (e.validUntil && e.validUntil < now) {
          cleaned++;
          return false;
        }
        return true;
      });
      this.evidence.set(controlId, valid);
    }

    if (cleaned > 0) {
      this.emit('evidence:cleaned', { count: cleaned });
    }

    return cleaned;
  }

  // ============================================================================
  // Attestation Management
  // ============================================================================

  /**
   * Add attestation for control
   */
  addAttestation(attestation: Attestation): void {
    const controlAttestations = this.attestations.get(attestation.controlId) || [];
    controlAttestations.push(attestation);
    this.attestations.set(attestation.controlId, controlAttestations);

    this.emit('attestation:added', { attestation });
  }

  /**
   * Get attestations for control
   */
  getAttestations(controlId: string): Attestation[] {
    return this.attestations.get(controlId) || [];
  }

  /**
   * Approve attestation
   */
  approveAttestation(
    attestationId: string,
    approvedBy: string
  ): void {
    for (const attestationList of this.attestations.values()) {
      const attestation = attestationList.find(a => a.id === attestationId);
      if (attestation) {
        attestation.approved = true;
        attestation.approvedBy = approvedBy;
        attestation.approvedAt = new Date();
        this.emit('attestation:approved', { attestation });
        return;
      }
    }
    throw new Error(`Attestation ${attestationId} not found`);
  }

  // ============================================================================
  // Gap Analysis
  // ============================================================================

  /**
   * Create compliance gap
   */
  async createGap(
    controlId: string,
    description: string,
    createdBy: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<ComplianceGap> {
    const control = this.controls.get(controlId);
    if (!control) {
      throw new Error(`Control ${controlId} not found`);
    }

    const gap: ComplianceGap = {
      id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      framework: control.framework,
      controlId,
      gapDescription: description,
      severity,
      impact: this.calculateGapImpact(severity, control),
      currentState: 'Non-compliant',
      requiredState: control.description,
      remediationSteps: control.requirements,
      estimatedEffort: this.estimateRemediationEffort(severity),
      priority: this.calculateGapPriority(severity),
      status: 'open',
    };

    this.gaps.set(gap.id, gap);
    this.emit('gap:created', { gap });

    return gap;
  }

  /**
   * Get gaps by framework
   */
  getGapsByFramework(framework: ComplianceFramework): ComplianceGap[] {
    return Array.from(this.gaps.values()).filter(
      g => g.framework === framework
    );
  }

  /**
   * Get open gaps
   */
  getOpenGaps(): ComplianceGap[] {
    return Array.from(this.gaps.values()).filter(
      g => g.status === 'open' || g.status === 'in_progress'
    );
  }

  /**
   * Resolve gap
   */
  resolveGap(gapId: string, resolvedBy: string, notes?: string): void {
    const gap = this.gaps.get(gapId);
    if (!gap) {
      throw new Error(`Gap ${gapId} not found`);
    }

    gap.status = 'resolved';
    gap.resolvedAt = new Date();
    gap.resolvedBy = resolvedBy;

    this.emit('gap:resolved', { gap, notes });

    // Update control status to compliant
    this.updateControlStatus(gap.controlId, ComplianceStatus.COMPLIANT, notes);
  }

  /**
   * Generate gap analysis report
   */
  async generateGapAnalysis(
    framework: ComplianceFramework,
    generatedBy: string
  ): Promise<GapAnalysisReport> {
    const controls = this.getControlsByFramework(framework);
    const gaps = this.getGapsByFramework(framework);

    const compliant = controls.filter(
      c => c.status === ComplianceStatus.COMPLIANT
    ).length;

    const nonCompliant = controls.filter(
      c => c.status === ComplianceStatus.NON_COMPLIANT
    ).length;

    const score = controls.length > 0
      ? (compliant / controls.length) * 100
      : 0;

    const criticalGaps = gaps.filter(g => g.severity === 'critical').length;
    const riskLevel = this.calculateRiskLevel(score, criticalGaps);

    const report: GapAnalysisReport = {
      id: `gap_report_${Date.now()}`,
      framework,
      generatedAt: new Date(),
      generatedBy,
      totalControls: controls.length,
      compliantControls: compliant,
      nonCompliantControls: nonCompliant,
      gaps,
      overallScore: score,
      riskLevel,
      recommendations: this.generateRecommendations(gaps),
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    };

    this.emit('gap_analysis:generated', { report });

    return report;
  }

  // ============================================================================
  // Metrics & Dashboard
  // ============================================================================

  /**
   * Get metrics for framework
   */
  getMetrics(framework: ComplianceFramework): ComplianceMetrics {
    const controls = this.getControlsByFramework(framework);

    const compliant = controls.filter(
      c => c.status === ComplianceStatus.COMPLIANT
    ).length;

    const nonCompliant = controls.filter(
      c => c.status === ComplianceStatus.NON_COMPLIANT
    ).length;

    const inProgress = controls.filter(
      c => c.status === ComplianceStatus.IN_PROGRESS
    ).length;

    const score = controls.length > 0
      ? (compliant / controls.length) * 100
      : 0;

    const gaps = this.getGapsByFramework(framework);
    const openGaps = gaps.filter(
      g => g.status === 'open' || g.status === 'in_progress'
    ).length;

    const criticalGaps = gaps.filter(
      g => g.severity === 'critical' && g.status !== 'resolved'
    ).length;

    const evidenceCount = controls.reduce(
      (sum, c) => sum + this.getEvidence(c.id).length,
      0
    );

    const attestationCount = controls.reduce(
      (sum, c) => sum + this.getAttestations(c.id).length,
      0
    );

    return {
      framework,
      totalControls: controls.length,
      compliantControls: compliant,
      nonCompliantControls: nonCompliant,
      inProgressControls: inProgress,
      complianceScore: score,
      openGaps,
      criticalGaps,
      evidenceCount,
      attestationCount,
      auditEventsToday: 0, // Populated by AuditLogger
      dataBreaches: 0, // Populated by breach management
    };
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(): Promise<Partial<ComplianceDashboardData>> {
    const frameworkMetrics = this.config.enabledFrameworks.map(f =>
      this.getMetrics(f)
    );

    const overallScore = frameworkMetrics.length > 0
      ? frameworkMetrics.reduce((sum, m) => sum + m.complianceScore, 0) /
        frameworkMetrics.length
      : 0;

    const openGaps = this.getOpenGaps();

    return {
      overallComplianceScore: overallScore,
      frameworkMetrics,
      openGaps: openGaps.slice(0, 10), // Top 10
      dataResidencyStatus: {
        region: this.config.dataResidency,
        compliant: true,
        violations: [],
      },
      alerts: this.generateAlerts(),
    };
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Set data residency
   */
  setDataResidency(region: DataResidency): void {
    const oldRegion = this.config.dataResidency;
    this.config.dataResidency = region;
    this.emit('config:data_residency_changed', { oldRegion, newRegion: region });
  }

  /**
   * Get configuration
   */
  getConfig(): ComplianceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ComplianceConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('config:updated', { config: this.config });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private calculateNextReviewDate(
    frequency: ComplianceControl['frequency']
  ): Date {
    const now = Date.now();
    const daysMap = {
      continuous: 1,
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      annual: 365,
    };

    const days = daysMap[frequency];
    return new Date(now + days * 24 * 60 * 60 * 1000);
  }

  private calculateGapImpact(
    severity: string,
    control: ComplianceControl
  ): string {
    const impactMap = {
      critical: `Critical compliance violation in ${control.category}`,
      high: `High risk to ${control.framework} certification`,
      medium: `Moderate impact on compliance posture`,
      low: `Minor compliance gap`,
    };
    return impactMap[severity as keyof typeof impactMap] || 'Unknown impact';
  }

  private estimateRemediationEffort(severity: string): string {
    const effortMap = {
      critical: '2-4 weeks',
      high: '1-2 weeks',
      medium: '3-5 days',
      low: '1-2 days',
    };
    return effortMap[severity as keyof typeof effortMap] || 'Unknown';
  }

  private calculateGapPriority(severity: string): number {
    const priorityMap = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 4,
    };
    return priorityMap[severity as keyof typeof priorityMap] || 5;
  }

  private calculateRiskLevel(
    score: number,
    criticalGaps: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (criticalGaps > 0 || score < 50) return 'critical';
    if (score < 70) return 'high';
    if (score < 85) return 'medium';
    return 'low';
  }

  private generateRecommendations(gaps: ComplianceGap[]): string[] {
    const recommendations: string[] = [];

    const criticalGaps = gaps.filter(g => g.severity === 'critical');
    if (criticalGaps.length > 0) {
      recommendations.push(
        `Address ${criticalGaps.length} critical gap(s) immediately`
      );
    }

    const highGaps = gaps.filter(g => g.severity === 'high');
    if (highGaps.length > 0) {
      recommendations.push(
        `Remediate ${highGaps.length} high-severity gap(s) within 30 days`
      );
    }

    if (gaps.length > 10) {
      recommendations.push('Consider additional resources for compliance remediation');
    }

    return recommendations;
  }

  private generateAlerts(): Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
    framework?: ComplianceFramework;
  }> {
    const alerts: Array<{
      id: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      timestamp: Date;
      framework?: ComplianceFramework;
    }> = [];

    // Check for critical gaps
    const criticalGaps = Array.from(this.gaps.values()).filter(
      g => g.severity === 'critical' && g.status !== 'resolved'
    );

    for (const gap of criticalGaps) {
      alerts.push({
        id: `alert_${gap.id}`,
        severity: 'critical',
        message: `Critical compliance gap: ${gap.gapDescription}`,
        timestamp: new Date(),
        framework: gap.framework,
      });
    }

    // Check for overdue assessments
    const now = new Date();
    for (const control of this.controls.values()) {
      if (control.nextAssessment && control.nextAssessment < now) {
        alerts.push({
          id: `alert_overdue_${control.id}`,
          severity: 'medium',
          message: `Control assessment overdue: ${control.name}`,
          timestamp: new Date(),
          framework: control.framework,
        });
      }
    }

    return alerts;
  }
}

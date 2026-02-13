/**
 * ComplianceAutomationEngine - Enterprise-grade compliance automation
 *
 * Features: SOC2, ISO27001, HIPAA, GDPR, PCI-DSS, NIST, FedRAMP, CCPA, SOX, GLBA
 * Automated control assessment, continuous monitoring, GRC platform integrations
 */

import { EventEmitter } from 'events';

// Export types
export * from './engine/types';

// Import sub-engines
import { PolicyEngine } from './engine/PolicyEngine';
import { RemediationEngine } from './engine/RemediationEngine';
import { AuditLogger } from './engine/AuditLogger';
import { ComplianceScanner } from './engine/ComplianceScanner';
import { FrameworkManager } from './engine/FrameworkManager';
import { MonitoringService } from './engine/MonitoringService';
import { EvidenceCollector } from './engine/EvidenceCollector';
import { ControlEvaluator } from './engine/ControlEvaluator';

import {
  AutomationControl, AssessmentResult, ComplianceGap, ComplianceScore, ComplianceAlert,
  ComplianceFrameworkType, Evidence, EvidenceType, Policy, RemediationPlan,
  ControlMapping, UnifiedControl, GRCIntegrationConfig, GRCPlatform, AuditTrailExport,
} from './engine/types';

export class ComplianceAutomationEngine extends EventEmitter {
  private static instance: ComplianceAutomationEngine;

  // Data stores
  private controls: Map<string, AutomationControl> = new Map();
  private evidence: Map<string, Evidence[]> = new Map();
  private assessments: Map<string, AssessmentResult[]> = new Map();
  private gaps: Map<string, ComplianceGap> = new Map();
  private scores: Map<ComplianceFrameworkType, ComplianceScore> = new Map();
  private alerts: Map<string, ComplianceAlert> = new Map();
  private unifiedControls: Map<string, UnifiedControl> = new Map();
  private controlMappings: ControlMapping[] = [];
  private remediationPlans: Map<string, RemediationPlan> = new Map();
  private grcIntegrations: Map<GRCPlatform, GRCIntegrationConfig> = new Map();

  // Sub-engines
  private policyEngine: PolicyEngine;
  private remediationEngine: RemediationEngine;
  private auditLogger: AuditLogger;
  private complianceScanner: ComplianceScanner;
  private frameworkManager: FrameworkManager;
  private monitoringService: MonitoringService;
  private evidenceCollector: EvidenceCollector;
  private controlEvaluator: ControlEvaluator;

  private constructor() {
    super();
    this.initializeEngines();
    this.frameworkManager.initializeFrameworks();
    this.frameworkManager.buildUnifiedControlLibrary();
  }

  private initializeEngines(): void {
    this.auditLogger = new AuditLogger(this.generateId.bind(this));

    this.evidenceCollector = new EvidenceCollector(
      this.evidence, this.controls, this.generateId.bind(this),
      this.auditLogger.calculateChecksum.bind(this.auditLogger),
      this.auditLogger.logAuditEntry.bind(this.auditLogger)
    );

    this.remediationEngine = new RemediationEngine(
      this.gaps, this.remediationPlans, this.controls, this.generateId.bind(this)
    );

    this.frameworkManager = new FrameworkManager(
      this.controls, this.unifiedControls, this.controlMappings, this.grcIntegrations
    );

    this.complianceScanner = new ComplianceScanner(
      this.controls, this.assessments, this.gaps, this.scores
    );

    // MonitoringService needs assessControl bound later
    this.monitoringService = new MonitoringService(
      this.alerts, this.evidence, this.gaps, this.controls,
      this.generateId.bind(this),
      this.frameworkManager.getControlsByFramework.bind(this.frameworkManager),
      this.assessControl.bind(this)
    );

    this.policyEngine = new PolicyEngine(
      this.generateId.bind(this),
      this.monitoringService.createAlert.bind(this.monitoringService),
      this.auditLogger.logAuditEntry.bind(this.auditLogger)
    );

    this.controlEvaluator = new ControlEvaluator(
      this.controls, this.evidence, this.assessments, this.gaps,
      this.generateId.bind(this),
      this.remediationEngine.createRemediationPlan.bind(this.remediationEngine),
      this.auditLogger.logAuditEntry.bind(this.auditLogger)
    );
  }

  static getInstance(): ComplianceAutomationEngine {
    if (!ComplianceAutomationEngine.instance) {
      ComplianceAutomationEngine.instance = new ComplianceAutomationEngine();
    }
    return ComplianceAutomationEngine.instance;
  }

  static resetInstance(): void {
    if (ComplianceAutomationEngine.instance) {
      ComplianceAutomationEngine.instance.stopMonitoring();
      ComplianceAutomationEngine.instance = undefined as unknown as ComplianceAutomationEngine;
    }
  }

  // Control Assessment
  async assessControl(controlId: string, assessedBy: string, options: { collectEvidence?: boolean; runAutomation?: boolean; notes?: string } = {}): Promise<AssessmentResult> {
    return this.controlEvaluator.assessControl(
      controlId, assessedBy, options,
      this.evidenceCollector.collectEvidence.bind(this.evidenceCollector),
      this.remediationEngine.createGap.bind(this.remediationEngine),
      this.monitoringService.createAlert.bind(this.monitoringService),
      this.complianceScanner.updateComplianceScore.bind(this.complianceScanner)
    );
  }

  // Evidence Collection
  async collectEvidence(controlId: string, collectedBy: string, options: { automated?: boolean; types?: EvidenceType[] } = {}): Promise<Evidence[]> {
    return this.evidenceCollector.collectEvidence(controlId, collectedBy, options);
  }

  // Compliance Check & Scoring
  async runComplianceCheck(framework: ComplianceFrameworkType, options: { fullAssessment?: boolean; collectEvidence?: boolean; assessedBy?: string } = {}) {
    return this.complianceScanner.runComplianceCheck(
      framework, options,
      this.assessControl.bind(this),
      this.monitoringService.createAlert.bind(this.monitoringService),
      this.auditLogger.logAuditEntry.bind(this.auditLogger)
    );
  }

  async getComplianceScore(framework: ComplianceFrameworkType): Promise<ComplianceScore> {
    return this.complianceScanner.getComplianceScore(framework);
  }

  // Gap Analysis & Remediation
  async identifyGaps(framework: ComplianceFrameworkType, options: { includeRemediation?: boolean; prioritize?: boolean } = {}) {
    return this.remediationEngine.identifyGaps(framework, options);
  }

  async generateRemediationPlan(gapId: string, options: { assignTo?: string; dueDate?: Date; priority?: number } = {}): Promise<RemediationPlan> {
    return this.remediationEngine.generateRemediationPlan(gapId, options);
  }

  // Policy Enforcement
  async enforcePolicy(policyId: string, context: Record<string, unknown>) {
    return this.policyEngine.enforcePolicy(policyId, context);
  }

  registerPolicy(policy: Policy): void {
    this.policyEngine.registerPolicy(policy);
  }

  // Control Mapping & Framework Management
  mapControlsAcrossFrameworks(): Map<string, UnifiedControl> {
    return this.frameworkManager.mapControlsAcrossFrameworks();
  }

  getControlMappings(sourceFramework: ComplianceFrameworkType, targetFramework: ComplianceFrameworkType): ControlMapping[] {
    return this.frameworkManager.getControlMappings(sourceFramework, targetFramework);
  }

  addControlMapping(mapping: ControlMapping): void {
    this.frameworkManager.addControlMapping(mapping);
  }

  // GRC Integration
  configureGRCIntegration(config: GRCIntegrationConfig): void {
    this.frameworkManager.configureGRCIntegration(config);
  }

  async syncWithGRCPlatform(platform: GRCPlatform) {
    return this.frameworkManager.syncWithGRCPlatform(platform, this.auditLogger.logAuditEntry.bind(this.auditLogger));
  }

  // Audit Trail
  async exportAuditTrail(options: { framework?: ComplianceFrameworkType; startDate?: Date; endDate?: Date; exportedBy: string; format?: 'json' | 'csv' | 'pdf' }): Promise<AuditTrailExport> {
    return this.auditLogger.exportAuditTrail(options);
  }

  // Continuous Monitoring
  startMonitoring(): void { this.monitoringService.startMonitoring(); }
  stopMonitoring(): void { this.monitoringService.stopMonitoring(); }

  // Public Getters
  getAlerts(options?: { framework?: ComplianceFrameworkType; status?: ComplianceAlert['status'] }): ComplianceAlert[] {
    return this.monitoringService.getAlerts(options);
  }

  getGaps(options?: { framework?: ComplianceFrameworkType; status?: ComplianceGap['status'] }): ComplianceGap[] {
    return this.remediationEngine.getGaps(options);
  }

  getPolicies(): Policy[] { return this.policyEngine.getPolicies(); }
  getControl(controlId: string): AutomationControl | undefined { return this.frameworkManager.getControl(controlId); }
  getControlsByFramework(framework: ComplianceFrameworkType): AutomationControl[] { return this.frameworkManager.getControlsByFramework(framework); }
  getControlEvidence(controlId: string): Evidence[] { return this.evidenceCollector.getControlEvidence(controlId); }
  getControlAssessments(controlId: string): AssessmentResult[] { return this.assessments.get(controlId) || []; }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default ComplianceAutomationEngine.getInstance();

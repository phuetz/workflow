/**
 * Comprehensive Test Suite for Compliance Automation System
 *
 * Tests the following modules:
 * 1. ComplianceAutomationEngine - Control assessment and evidence collection
 * 2. RegulatoryFrameworkManager - Framework loading and management
 * 3. ComplianceReportGenerator - Report generation and distribution
 *
 * @module compliance-automation.test
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { EventEmitter } from 'events';

// Mock external dependencies before imports
vi.mock('crypto', async () => {
  const actual = await vi.importActual('crypto');
  return {
    ...actual,
    createHash: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => 'mocked-hash-value-abc123'),
    })),
    randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substring(7)),
  };
});

// ============================================================================
// Import modules after mocks are set up
// ============================================================================

import {
  ComplianceAutomationEngine,
  ComplianceFrameworkType,
  ControlStatus,
  AssessmentType,
  EvidenceType,
  AlertSeverity,
  RemediationType,
  GRCPlatform,
  type AutomationControl,
  type Evidence,
  type AssessmentResult,
  type ComplianceGap,
  type ComplianceScore,
  type ComplianceAlert,
  type Policy,
  type ControlMapping,
  type AuditLogEntry,
} from '../compliance/automation/ComplianceAutomationEngine';

import {
  RegulatoryFrameworkManager,
  type ComplianceFramework as RegulatoryFramework,
  type ControlDefinition,
  type CommonControlMapping,
  type ApplicableFrameworks,
  type RegulatoryUpdate,
  type CustomFramework,
  type CertificationStatus,
  type CoverageReport,
  type OrganizationProfile,
} from '../compliance/automation/RegulatoryFrameworkManager';

import {
  ComplianceReportGenerator,
  ReportType,
  ReportFormat,
  ScheduleFrequency,
  DistributionChannel,
  StakeholderView,
  RiskPriority,
  type ReportTemplate,
  type ReportSchedule,
  type GeneratedReport,
  type CertificationPackage,
  type ExecutiveDashboard,
  type DistributionRecipient,
  type ReportPeriod,
  type ReportComparison,
  type HistoricalTrendData,
} from '../compliance/automation/ComplianceReportGenerator';

import { ComplianceFramework } from '../types/compliance';

// ============================================================================
// Test Utilities
// ============================================================================

const createTestPeriod = (daysBack: number = 30): ReportPeriod => ({
  startDate: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000),
  endDate: new Date(),
});

const createTestRecipient = (
  channel: DistributionChannel = DistributionChannel.EMAIL
): DistributionRecipient => ({
  channel,
  destination: 'test@company.com',
  config: { emailSubject: 'Test Report' },
  enabled: true,
});

// ============================================================================
// ComplianceAutomationEngine Tests
// ============================================================================

describe('ComplianceAutomationEngine', () => {
  let engine: ComplianceAutomationEngine;

  beforeEach(() => {
    // Reset singleton for clean state
    ComplianceAutomationEngine.resetInstance();
    engine = ComplianceAutomationEngine.getInstance();
  });

  afterEach(() => {
    engine.stopMonitoring();
    ComplianceAutomationEngine.resetInstance();
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = ComplianceAutomationEngine.getInstance();
      const instance2 = ComplianceAutomationEngine.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = ComplianceAutomationEngine.getInstance();
      ComplianceAutomationEngine.resetInstance();
      const instance2 = ComplianceAutomationEngine.getInstance();
      expect(instance1).not.toBe(instance2);
    });

    it('should extend EventEmitter', () => {
      expect(engine).toBeInstanceOf(EventEmitter);
    });
  });

  describe('Control Assessment', () => {
    it('should assess a SOC2 control successfully', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.SOC2);
      expect(controls.length).toBeGreaterThan(0);

      const controlId = controls[0].id;
      const result = await engine.assessControl(controlId, 'test_user', {
        collectEvidence: false,
        runAutomation: true,
      });

      expect(result).toBeDefined();
      expect(result.controlId).toBe(controlId);
      expect(result.framework).toBe(ComplianceFrameworkType.SOC2);
      expect(result.assessedBy).toBe('test_user');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should throw error for non-existent control', async () => {
      await expect(
        engine.assessControl('non_existent_control_xyz', 'test_user')
      ).rejects.toThrow();
    });

    it('should assess ISO27001 control', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.ISO27001);
      expect(controls.length).toBeGreaterThan(0);

      const result = await engine.assessControl(controls[0].id, 'auditor', {
        collectEvidence: false,
      });

      expect(result.framework).toBe(ComplianceFrameworkType.ISO27001);
      expect(Object.values(ControlStatus)).toContain(result.status);
    });

    it('should assess HIPAA control', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.HIPAA);
      const result = await engine.assessControl(controls[0].id, 'compliance_officer', {
        collectEvidence: false,
      });

      expect(result.framework).toBe(ComplianceFrameworkType.HIPAA);
    });

    it('should assess GDPR control', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.GDPR);
      const result = await engine.assessControl(controls[0].id, 'dpo', {
        collectEvidence: false,
      });

      expect(result.framework).toBe(ComplianceFrameworkType.GDPR);
    });

    it('should update control status after assessment', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.PCI_DSS);
      const controlId = controls[0].id;

      await engine.assessControl(controlId, 'test_user', { collectEvidence: false });

      const updatedControl = engine.getControl(controlId);
      expect(updatedControl).toBeDefined();
      expect(updatedControl?.lastAssessedAt).toBeDefined();
    });

    it('should calculate next review date based on frequency', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.NIST);
      const result = await engine.assessControl(controls[0].id, 'test_user', {
        collectEvidence: false,
      });

      expect(result.nextReviewDate).toBeDefined();
      expect(result.nextReviewDate.getTime()).toBeGreaterThan(Date.now());
    });

    it('should emit control:assessed event', async () => {
      const eventHandler = vi.fn();
      engine.on('control:assessed', eventHandler);

      const controls = engine.getControlsByFramework(ComplianceFrameworkType.SOC2);
      await engine.assessControl(controls[0].id, 'test_user', { collectEvidence: false });

      expect(eventHandler).toHaveBeenCalled();
    });

    it('should support assessment notes', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.SOC2);
      const result = await engine.assessControl(controls[0].id, 'test_user', {
        collectEvidence: false,
        notes: 'Manual assessment completed with no issues found',
      });

      expect(result.notes).toBe('Manual assessment completed with no issues found');
    });
  });

  describe('Evidence Collection', () => {
    it('should collect evidence for a control', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.SOC2);
      const controlId = controls[0].id;

      const evidence = await engine.collectEvidence(controlId, 'test_user', {
        automated: true,
      });

      expect(evidence).toBeDefined();
      expect(Array.isArray(evidence)).toBe(true);
    });

    it('should assign evidence type based on requirement', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.FEDRAMP);
      const evidence = await engine.collectEvidence(controls[0].id, 'test_user');

      evidence.forEach((e) => {
        expect(Object.values(EvidenceType)).toContain(e.type);
        expect(e.checksum).toBeDefined();
        expect(e.collectedAt).toBeInstanceOf(Date);
      });
    });

    it('should store evidence with control reference', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.CCPA);
      const controlId = controls[0].id;

      await engine.collectEvidence(controlId, 'test_user');

      const storedEvidence = engine.getControlEvidence(controlId);
      expect(storedEvidence.length).toBeGreaterThan(0);
      storedEvidence.forEach((e) => {
        expect(e.controlId).toBe(controlId);
      });
    });

    it('should emit evidence:collected event', async () => {
      const eventHandler = vi.fn();
      engine.on('evidence:collected', eventHandler);

      const controls = engine.getControlsByFramework(ComplianceFrameworkType.SOX);
      await engine.collectEvidence(controls[0].id, 'test_user');

      expect(eventHandler).toHaveBeenCalled();
    });

    it('should throw error when collecting evidence for non-existent control', async () => {
      await expect(
        engine.collectEvidence('invalid_control_xyz', 'test_user')
      ).rejects.toThrow();
    });
  });

  describe('Compliance Scoring (0-100 scale)', () => {
    it('should calculate compliance score for SOC2', async () => {
      const score = await engine.getComplianceScore(ComplianceFrameworkType.SOC2);

      expect(score).toBeDefined();
      expect(score.framework).toBe(ComplianceFrameworkType.SOC2);
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
    });

    it('should calculate compliance score for ISO27001', async () => {
      const score = await engine.getComplianceScore(ComplianceFrameworkType.ISO27001);

      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
    });

    it('should calculate compliance score for HIPAA', async () => {
      const score = await engine.getComplianceScore(ComplianceFrameworkType.HIPAA);

      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
    });

    it('should calculate compliance score for GDPR', async () => {
      const score = await engine.getComplianceScore(ComplianceFrameworkType.GDPR);

      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
    });

    it('should calculate weighted scores', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.PCI_DSS);
      await engine.assessControl(controls[0].id, 'test_user', { collectEvidence: false });

      const score = await engine.getComplianceScore(ComplianceFrameworkType.PCI_DSS);
      expect(score.weightedScore).toBeDefined();
      expect(typeof score.weightedScore).toBe('number');
    });

    it('should count gaps by severity', async () => {
      const score = await engine.getComplianceScore(ComplianceFrameworkType.NIST);

      expect(score.criticalGaps).toBeGreaterThanOrEqual(0);
      expect(score.highGaps).toBeGreaterThanOrEqual(0);
      expect(score.mediumGaps).toBeGreaterThanOrEqual(0);
      expect(score.lowGaps).toBeGreaterThanOrEqual(0);
    });

    it('should determine score trend', async () => {
      const score = await engine.getComplianceScore(ComplianceFrameworkType.FEDRAMP);
      expect(['improving', 'stable', 'declining']).toContain(score.trend);
    });

    it('should track historical scores', async () => {
      // Perform some assessments
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.SOC2);
      for (let i = 0; i < 2; i++) {
        await engine.assessControl(controls[i].id, 'test_user', { collectEvidence: false });
      }

      const score = await engine.getComplianceScore(ComplianceFrameworkType.SOC2);
      expect(score.historicalScores).toBeDefined();
      expect(Array.isArray(score.historicalScores)).toBe(true);
    });

    it('should calculate category scores', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.GLBA);
      await engine.assessControl(controls[0].id, 'test_user', { collectEvidence: false });

      const score = await engine.getComplianceScore(ComplianceFrameworkType.GLBA);
      expect(score.categoryScores).toBeDefined();
    });
  });

  describe('Gap Analysis and Remediation Plans', () => {
    it('should identify compliance gaps', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.SOC2);
      for (let i = 0; i < 3; i++) {
        await engine.assessControl(controls[i].id, 'test_user', { collectEvidence: false });
      }

      const result = await engine.identifyGaps(ComplianceFrameworkType.SOC2);

      expect(result).toBeDefined();
      expect(result.gaps).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should prioritize gaps by severity', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.HIPAA);
      for (let i = 0; i < 2; i++) {
        await engine.assessControl(controls[i].id, 'test_user', { collectEvidence: false });
      }

      const result = await engine.identifyGaps(ComplianceFrameworkType.HIPAA, {
        prioritize: true,
      });

      if (result.gaps.length > 1) {
        const severityOrder = {
          [AlertSeverity.CRITICAL]: 0,
          [AlertSeverity.HIGH]: 1,
          [AlertSeverity.MEDIUM]: 2,
          [AlertSeverity.LOW]: 3,
          [AlertSeverity.INFO]: 4,
        };
        for (let i = 1; i < result.gaps.length; i++) {
          expect(
            severityOrder[result.gaps[i - 1].severity] <=
              severityOrder[result.gaps[i].severity]
          ).toBe(true);
        }
      }
    });

    it('should generate remediation recommendations', async () => {
      const result = await engine.identifyGaps(ComplianceFrameworkType.GDPR, {
        includeRemediation: true,
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate total remediation effort', async () => {
      const result = await engine.identifyGaps(ComplianceFrameworkType.PCI_DSS);
      expect(result.summary.estimatedRemediationEffort).toBeDefined();
    });

    it('should generate remediation plan for a gap', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.NIST);
      await engine.assessControl(controls[0].id, 'test_user', { collectEvidence: false });

      const gaps = engine.getGaps({ framework: ComplianceFrameworkType.NIST });

      if (gaps.length > 0) {
        const plan = await engine.generateRemediationPlan(gaps[0].id);

        expect(plan).toBeDefined();
        expect(plan.steps.length).toBeGreaterThan(0);
        expect(plan.estimatedEffort).toBeDefined();
      }
    });

    it('should throw error for non-existent gap remediation', async () => {
      await expect(
        engine.generateRemediationPlan('non_existent_gap_xyz')
      ).rejects.toThrow();
    });

    it('should allow custom assignment and due date for remediation', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.SOC2);
      await engine.assessControl(controls[0].id, 'test_user', { collectEvidence: false });

      const gaps = engine.getGaps({ framework: ComplianceFrameworkType.SOC2 });

      if (gaps.length > 0) {
        const customDueDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
        const plan = await engine.generateRemediationPlan(gaps[0].id, {
          assignTo: 'security_team',
          dueDate: customDueDate,
          priority: 1,
        });

        expect(plan.assignedTo).toBe('security_team');
        expect(plan.dueDate).toEqual(customDueDate);
        expect(plan.priority).toBe(1);
      }
    });
  });

  describe('Policy Enforcement', () => {
    it('should register and enforce policies', async () => {
      const policy: Policy = {
        id: 'test_policy_1',
        name: 'Test Access Policy',
        description: 'Test policy for access control',
        frameworks: [ComplianceFrameworkType.SOC2],
        rules: [
          {
            id: 'rule_1',
            condition: "accessLevel == 'admin'",
            action: 'alert',
            severity: AlertSeverity.HIGH,
            message: 'Admin access detected',
          },
        ],
        enforcementLevel: 'strict',
        autoRemediation: false,
        enabled: true,
        createdAt: new Date(),
        createdBy: 'admin',
        updatedAt: new Date(),
      };

      engine.registerPolicy(policy);

      const result = await engine.enforcePolicy('test_policy_1', {
        accessLevel: 'admin',
      });

      expect(result.policyId).toBe('test_policy_1');
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should not enforce disabled policies', async () => {
      const policy: Policy = {
        id: 'disabled_policy',
        name: 'Disabled Policy',
        description: 'This policy is disabled',
        frameworks: [ComplianceFrameworkType.ISO27001],
        rules: [
          {
            id: 'rule_1',
            condition: 'status == "active"',
            action: 'block',
            severity: AlertSeverity.CRITICAL,
            message: 'Access blocked',
          },
        ],
        enforcementLevel: 'strict',
        autoRemediation: false,
        enabled: false,
        createdAt: new Date(),
        createdBy: 'admin',
        updatedAt: new Date(),
      };

      engine.registerPolicy(policy);

      const result = await engine.enforcePolicy('disabled_policy', {
        status: 'active',
      });

      expect(result.violations.length).toBe(0);
    });

    it('should throw error for non-existent policy', async () => {
      await expect(
        engine.enforcePolicy('non_existent_policy_xyz', {})
      ).rejects.toThrow();
    });

    it('should evaluate different operator conditions', async () => {
      const policy: Policy = {
        id: 'comparison_policy',
        name: 'Comparison Policy',
        description: 'Tests different comparison operators',
        frameworks: [ComplianceFrameworkType.HIPAA],
        rules: [
          {
            id: 'rule_gt',
            condition: 'score > 90',
            action: 'alert',
            severity: AlertSeverity.INFO,
            message: 'High score detected',
          },
        ],
        enforcementLevel: 'moderate',
        autoRemediation: false,
        enabled: true,
        createdAt: new Date(),
        createdBy: 'admin',
        updatedAt: new Date(),
      };

      engine.registerPolicy(policy);

      const result = await engine.enforcePolicy('comparison_policy', {
        score: 95,
      });

      expect(result.violations.length).toBe(1);
    });

    it('should get all registered policies', () => {
      const policy1: Policy = {
        id: 'policy_list_1',
        name: 'Policy 1',
        description: 'First test policy',
        frameworks: [ComplianceFrameworkType.SOC2],
        rules: [],
        enforcementLevel: 'advisory',
        autoRemediation: false,
        enabled: true,
        createdAt: new Date(),
        createdBy: 'admin',
        updatedAt: new Date(),
      };

      engine.registerPolicy(policy1);

      const policies = engine.getPolicies();
      expect(policies.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Cross-Framework Control Mapping', () => {
    it('should map controls across frameworks', () => {
      const mappings = engine.mapControlsAcrossFrameworks();

      expect(mappings).toBeDefined();
      expect(mappings).toBeInstanceOf(Map);
    });

    it('should get control mappings between SOC2 and ISO27001', () => {
      const mappings = engine.getControlMappings(
        ComplianceFrameworkType.SOC2,
        ComplianceFrameworkType.ISO27001
      );

      expect(Array.isArray(mappings)).toBe(true);
      mappings.forEach((mapping) => {
        expect(mapping.sourceFramework).toBe(ComplianceFrameworkType.SOC2);
        expect(mapping.targetFramework).toBe(ComplianceFrameworkType.ISO27001);
      });
    });

    it('should add new control mapping', () => {
      const soc2Controls = engine.getControlsByFramework(ComplianceFrameworkType.SOC2);
      const hipaaControls = engine.getControlsByFramework(ComplianceFrameworkType.HIPAA);

      if (soc2Controls.length > 0 && hipaaControls.length > 0) {
        const mapping: ControlMapping = {
          sourceFramework: ComplianceFrameworkType.SOC2,
          sourceControlId: soc2Controls[0].id,
          targetFramework: ComplianceFrameworkType.HIPAA,
          targetControlId: hipaaControls[0].id,
          mappingStrength: 'strong',
        };

        engine.addControlMapping(mapping);

        const mappings = engine.getControlMappings(
          ComplianceFrameworkType.SOC2,
          ComplianceFrameworkType.HIPAA
        );
        expect(mappings.some(
          (m) =>
            m.sourceControlId === soc2Controls[0].id &&
            m.targetControlId === hipaaControls[0].id
        )).toBe(true);
      }
    });
  });

  describe('Audit Trail Integrity', () => {
    it('should export audit trail with integrity verification', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.SOC2);
      await engine.assessControl(controls[0].id, 'test_user', { collectEvidence: false });

      const exportData = await engine.exportAuditTrail({
        exportedBy: 'admin',
        format: 'json',
      });

      expect(exportData).toBeDefined();
      expect(exportData.entries).toBeDefined();
      expect(exportData.integrityVerification).toBeDefined();
      expect(exportData.integrityVerification.checksum).toBeDefined();
    });

    it('should filter audit trail by framework', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.ISO27001);
      await engine.assessControl(controls[0].id, 'test_user', { collectEvidence: false });

      const exportData = await engine.exportAuditTrail({
        framework: ComplianceFrameworkType.ISO27001,
        exportedBy: 'admin',
      });

      exportData.entries.forEach((entry) => {
        if (entry.framework) {
          expect(entry.framework).toBe(ComplianceFrameworkType.ISO27001);
        }
      });
    });

    it('should filter audit trail by date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const exportData = await engine.exportAuditTrail({
        startDate,
        endDate,
        exportedBy: 'admin',
      });

      exportData.entries.forEach((entry) => {
        expect(entry.timestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(entry.timestamp.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should emit audit:logged event for each entry', async () => {
      const eventHandler = vi.fn();
      engine.on('audit:logged', eventHandler);

      const controls = engine.getControlsByFramework(ComplianceFrameworkType.HIPAA);
      await engine.assessControl(controls[0].id, 'test_user', { collectEvidence: false });

      expect(eventHandler).toHaveBeenCalled();
    });
  });

  describe('GRC Platform Integration', () => {
    it('should configure GRC integration', () => {
      const config = {
        platform: GRCPlatform.SERVICENOW_GRC,
        enabled: true,
        apiEndpoint: 'https://test.service-now.com/api',
        apiKey: 'test-api-key',
        syncFrequency: 'daily' as const,
        syncDirection: 'bidirectional' as const,
        mappings: [],
      };

      engine.configureGRCIntegration(config);

      const eventHandler = vi.fn();
      engine.on('grc:configured', eventHandler);
      engine.configureGRCIntegration(config);
      expect(eventHandler).toHaveBeenCalled();
    });

    it('should sync with GRC platform', async () => {
      const config = {
        platform: GRCPlatform.SERVICENOW_GRC,
        enabled: true,
        apiEndpoint: 'https://test.service-now.com/api',
        apiKey: 'test-api-key',
        syncFrequency: 'hourly' as const,
        syncDirection: 'push' as const,
        mappings: [],
      };

      engine.configureGRCIntegration(config);

      const result = await engine.syncWithGRCPlatform(GRCPlatform.SERVICENOW_GRC);

      expect(result.platform).toBe(GRCPlatform.SERVICENOW_GRC);
      expect(result.syncedItems).toBeGreaterThanOrEqual(0);
    });

    it('should handle unconfigured GRC platform', async () => {
      const result = await engine.syncWithGRCPlatform(GRCPlatform.RSA_ARCHER);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Continuous Monitoring', () => {
    it('should start and stop monitoring', () => {
      const startHandler = vi.fn();
      const stopHandler = vi.fn();

      engine.on('monitoring:started', startHandler);
      engine.on('monitoring:stopped', stopHandler);

      engine.startMonitoring();
      expect(startHandler).toHaveBeenCalled();

      engine.stopMonitoring();
      expect(stopHandler).toHaveBeenCalled();
    });

    it('should not start monitoring twice', () => {
      const startHandler = vi.fn();
      engine.on('monitoring:started', startHandler);

      engine.startMonitoring();
      engine.startMonitoring();

      expect(startHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Alerts Management', () => {
    it('should get alerts by framework', async () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.SOC2);
      await engine.assessControl(controls[0].id, 'test_user', { collectEvidence: false });

      const alerts = engine.getAlerts({ framework: ComplianceFrameworkType.SOC2 });

      alerts.forEach((alert) => {
        expect(alert.framework).toBe(ComplianceFrameworkType.SOC2);
      });
    });

    it('should get alerts by status', () => {
      const openAlerts = engine.getAlerts({ status: 'open' });

      openAlerts.forEach((alert) => {
        expect(alert.status).toBe('open');
      });
    });

    it('should sort alerts by triggered time descending', () => {
      const alerts = engine.getAlerts();

      for (let i = 1; i < alerts.length; i++) {
        expect(alerts[i - 1].triggeredAt.getTime()).toBeGreaterThanOrEqual(
          alerts[i].triggeredAt.getTime()
        );
      }
    });
  });

  describe('Framework Controls (10 frameworks)', () => {
    it('should have controls for all 10 frameworks', () => {
      const frameworks = Object.values(ComplianceFrameworkType);
      expect(frameworks.length).toBe(10);

      frameworks.forEach((framework) => {
        const controls = engine.getControlsByFramework(framework);
        expect(controls.length).toBeGreaterThan(0);
      });
    });

    it('should have SOC2 controls', () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.SOC2);
      expect(controls.length).toBeGreaterThan(0);
    });

    it('should have ISO27001 controls', () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.ISO27001);
      expect(controls.length).toBeGreaterThan(0);
    });

    it('should have HIPAA controls', () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.HIPAA);
      expect(controls.length).toBeGreaterThan(0);
    });

    it('should have GDPR controls', () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.GDPR);
      expect(controls.length).toBeGreaterThan(0);
    });

    it('should have PCI-DSS controls', () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.PCI_DSS);
      expect(controls.length).toBeGreaterThan(0);
    });

    it('should have NIST controls', () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.NIST);
      expect(controls.length).toBeGreaterThan(0);
    });

    it('should have FedRAMP controls', () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.FEDRAMP);
      expect(controls.length).toBeGreaterThan(0);
    });

    it('should have CCPA controls', () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.CCPA);
      expect(controls.length).toBeGreaterThan(0);
    });

    it('should have SOX controls', () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.SOX);
      expect(controls.length).toBeGreaterThan(0);
    });

    it('should have GLBA controls', () => {
      const controls = engine.getControlsByFramework(ComplianceFrameworkType.GLBA);
      expect(controls.length).toBeGreaterThan(0);
    });
  });

  describe('Comprehensive Compliance Check', () => {
    it('should run comprehensive compliance check', async () => {
      const result = await engine.runComplianceCheck(ComplianceFrameworkType.SOC2, {
        fullAssessment: false,
        collectEvidence: false,
        assessedBy: 'system',
      });

      expect(result.framework).toBe(ComplianceFrameworkType.SOC2);
      expect(result.score).toBeDefined();
      expect(result.assessments).toBeDefined();
      expect(result.gaps).toBeDefined();
      expect(result.alerts).toBeDefined();
    });
  });
});

// ============================================================================
// RegulatoryFrameworkManager Tests
// ============================================================================

describe('RegulatoryFrameworkManager', () => {
  let manager: RegulatoryFrameworkManager;

  beforeEach(() => {
    manager = RegulatoryFrameworkManager.getInstance();
  });

  describe('Framework Loading and Management (10 frameworks)', () => {
    it('should load all 10 frameworks', () => {
      const frameworks = manager.getAllFrameworks();
      expect(frameworks.length).toBe(10);
    });

    it('should load SOC2 framework with trust principles', async () => {
      const soc2 = await manager.loadFramework('soc2');

      expect(soc2).toBeDefined();
      expect(soc2.name).toBe('SOC2');
      expect(soc2.principles).toBeDefined();
      expect(soc2.principles?.length).toBe(5); // CC, A, C, I, P
    });

    it('should load ISO 27001 framework with sections', async () => {
      const iso = await manager.loadFramework('iso27001');

      expect(iso).toBeDefined();
      expect(iso.name).toContain('27001');
      expect(iso.sections).toBeDefined();
      expect(iso.sections!.length).toBeGreaterThan(0);
    });

    it('should load HIPAA framework', async () => {
      const hipaa = await manager.loadFramework('hipaa');

      expect(hipaa).toBeDefined();
      expect(hipaa.name).toBe('HIPAA');
      expect(hipaa.applicableIndustries).toContain('Healthcare');
    });

    it('should load GDPR framework', async () => {
      const gdpr = await manager.loadFramework('gdpr');

      expect(gdpr).toBeDefined();
      expect(gdpr.name).toBe('GDPR');
      expect(gdpr.applicableGeographies).toContain('EU');
    });

    it('should load PCI-DSS framework with 12 requirements', async () => {
      const pci = await manager.loadFramework('pci-dss');

      expect(pci).toBeDefined();
      expect(pci.name).toContain('PCI');
      expect(pci.controls.length).toBe(12);
    });

    it('should load NIST CSF framework with 5 functions', async () => {
      const nist = await manager.loadFramework('nist-csf');

      expect(nist).toBeDefined();
      expect(nist.sections?.length).toBe(5); // Identify, Protect, Detect, Respond, Recover
    });

    it('should load FedRAMP framework', async () => {
      const fedramp = await manager.loadFramework('fedramp');

      expect(fedramp).toBeDefined();
      expect(fedramp.name).toBe('FedRAMP');
      expect(fedramp.controls.length).toBe(325);
    });

    it('should load CCPA framework', async () => {
      const ccpa = await manager.loadFramework('ccpa');

      expect(ccpa).toBeDefined();
      expect(ccpa.name).toBe('CCPA');
      expect(ccpa.controls.length).toBe(6);
    });

    it('should load SOX framework', async () => {
      const sox = await manager.loadFramework('sox');

      expect(sox).toBeDefined();
      expect(sox.name).toBe('SOX');
      expect(sox.controls.length).toBe(6);
    });

    it('should load GLBA framework', async () => {
      const glba = await manager.loadFramework('glba');

      expect(glba).toBeDefined();
      expect(glba.name).toBe('GLBA');
      expect(glba.controls.length).toBe(9);
    });

    it('should throw error for non-existent framework', async () => {
      await expect(manager.loadFramework('invalid_framework_xyz')).rejects.toThrow();
    });

    it('should emit framework-loaded event', async () => {
      const eventHandler = vi.fn();
      manager.on('framework-loaded', eventHandler);

      await manager.loadFramework('soc2');

      expect(eventHandler).toHaveBeenCalled();
    });
  });

  describe('Control Details', () => {
    it('should get control details by ID', () => {
      const control = manager.getControlDetails('soc2', 'cc1.1');

      expect(control).toBeDefined();
      expect(control.id).toBe('cc1.1');
    });

    it('should throw error for non-existent control', () => {
      expect(() =>
        manager.getControlDetails('soc2', 'invalid_control_xyz')
      ).toThrow();
    });

    it('should throw error for non-existent framework', () => {
      expect(() =>
        manager.getControlDetails('invalid_framework', 'cc1.1')
      ).toThrow();
    });
  });

  describe('Cross-Framework Control Mapping', () => {
    it('should map framework controls to common controls', () => {
      const mappings = manager.mapToCommonControls('soc2');

      expect(Array.isArray(mappings)).toBe(true);
    });
  });

  describe('Applicability Assessment', () => {
    it('should assess framework applicability for healthcare organization', () => {
      const orgProfile: OrganizationProfile = {
        industry: 'Healthcare',
        geography: ['United States', 'EU'],
        dataTypes: ['PHI', 'PII'],
        regulations: ['HIPAA', 'GDPR'],
        organizationSize: 'large',
        businessModel: 'B2B',
        dataProcessingAreas: ['patient records', 'billing'],
      };

      const applicable = manager.assessApplicability(orgProfile);

      expect(applicable.length).toBeGreaterThan(0);
      expect(applicable[0].applicabilityScore).toBeGreaterThan(0);
      expect(applicable[0].reasoning.length).toBeGreaterThan(0);
    });

    it('should assess framework applicability for financial organization', () => {
      const orgProfile: OrganizationProfile = {
        industry: 'Financial',
        geography: ['United States'],
        dataTypes: ['PII', 'financial data'],
        regulations: ['SOX', 'GLBA', 'PCI-DSS'],
        organizationSize: 'enterprise',
        businessModel: 'B2C',
        dataProcessingAreas: ['payments', 'transactions'],
      };

      const applicable = manager.assessApplicability(orgProfile);

      expect(applicable.length).toBeGreaterThan(0);
    });

    it('should sort applicable frameworks by score', () => {
      const orgProfile: OrganizationProfile = {
        industry: 'Technology',
        geography: ['Global'],
        dataTypes: ['PII'],
        regulations: ['SOC2', 'ISO27001'],
        organizationSize: 'medium',
        businessModel: 'B2B',
        dataProcessingAreas: ['cloud services'],
      };

      const applicable = manager.assessApplicability(orgProfile);

      for (let i = 1; i < applicable.length; i++) {
        expect(applicable[i - 1].applicabilityScore).toBeGreaterThanOrEqual(
          applicable[i].applicabilityScore
        );
      }
    });
  });

  describe('Regulatory Change Tracking', () => {
    it('should track regulatory changes for framework', async () => {
      const framework = await manager.loadFramework('gdpr');
      const updates = manager.trackRegulatoryChanges(framework);

      expect(Array.isArray(updates)).toBe(true);
    });

    it('should add and track regulatory updates', () => {
      const update: RegulatoryUpdate = {
        id: 'update_1',
        frameworkId: 'gdpr',
        date: new Date(),
        updateType: 'amended_control',
        controlId: 'gdpr_1',
        description: 'Updated data transfer requirements',
        effectiveDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        impactLevel: 'high',
        affectedIndustries: ['All'],
      };

      manager.addRegulatoryUpdate(update);

      const eventHandler = vi.fn();
      manager.on('regulatory-update-added', eventHandler);
      manager.addRegulatoryUpdate({ ...update, id: 'update_2' });
      expect(eventHandler).toHaveBeenCalled();
    });
  });

  describe('Custom Framework Creation', () => {
    it('should create custom framework', () => {
      const customFramework = manager.createCustomFramework({
        name: 'Custom Security Framework',
        description: 'Organization-specific security controls',
        baseFrameworks: ['soc2', 'iso27001'],
        customControls: [
          {
            id: 'custom_1',
            title: 'Custom Control 1',
            description: 'Custom security control',
            controlCategory: 'access-control',
            controlType: 'preventive',
            implementationLevel: 'advanced',
            frequency: 'quarterly',
            testingRequirements: [],
            evidence: [],
            priority: 9,
            riskMitigation: [],
            relatedControls: [],
            auditSteps: [],
          },
        ],
        organizationId: 'org_123',
      });

      expect(customFramework).toBeDefined();
      expect(customFramework.id).toBeDefined();
      expect(customFramework.name).toBe('Custom Security Framework');
      expect(customFramework.baseFrameworks).toContain('soc2');
    });

    it('should register custom framework', () => {
      const customFramework: CustomFramework = {
        id: 'custom_framework_test',
        name: 'Test Framework',
        description: 'Test custom framework',
        baseFrameworks: ['hipaa'],
        customControls: [],
        organizationId: 'org_456',
        createdDate: new Date(),
        modifiedDate: new Date(),
        active: true,
      };

      const eventHandler = vi.fn();
      manager.on('custom-framework-registered', eventHandler);

      manager.registerCustomFramework(customFramework);

      expect(eventHandler).toHaveBeenCalled();
    });
  });

  describe('Certification Status', () => {
    it('should get certification status for framework', async () => {
      const framework = await manager.loadFramework('soc2');
      const status = manager.getCertificationStatus(framework);

      expect(status).toBeDefined();
      expect(status.frameworkId).toBe('soc2');
      expect(['active', 'expired', 'pending', 'suspended', 'revoked']).toContain(
        status.status
      );
    });
  });

  describe('Control Coverage Calculation', () => {
    it('should calculate control coverage', () => {
      const coverage = manager.calculateControlCoverage(['soc2']);

      expect(coverage).toBeDefined();
      expect(coverage.frameworkId).toBe('soc2');
      expect(coverage.totalControls).toBeGreaterThan(0);
      expect(coverage.coveragePercentage).toBeGreaterThanOrEqual(0);
      expect(coverage.coveragePercentage).toBeLessThanOrEqual(100);
    });

    it('should throw error when no frameworks specified', () => {
      expect(() => manager.calculateControlCoverage([])).toThrow();
    });

    it('should generate recommendations', () => {
      const coverage = manager.calculateControlCoverage(['iso27001']);

      expect(coverage.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Framework Properties', () => {
    it('should have correct version information', async () => {
      const soc2 = await manager.loadFramework('soc2');
      expect(soc2.version).toBeDefined();
      expect(soc2.lastUpdated).toBeInstanceOf(Date);
      expect(soc2.releaseDate).toBeInstanceOf(Date);
    });

    it('should have control hierarchy', async () => {
      const iso = await manager.loadFramework('iso27001');
      expect(iso.controlHierarchy).toBeDefined();
      expect(iso.controlHierarchy.rootControls).toBeDefined();
    });

    it('should mark deprecated frameworks', async () => {
      const frameworks = manager.getAllFrameworks();
      frameworks.forEach((f) => {
        expect(typeof f.deprecated).toBe('boolean');
      });
    });
  });
});

// ============================================================================
// ComplianceReportGenerator Tests
// ============================================================================

describe('ComplianceReportGenerator', () => {
  let generator: ComplianceReportGenerator;

  beforeEach(() => {
    generator = ComplianceReportGenerator.getInstance();
  });

  afterEach(() => {
    generator.stopScheduler();
    vi.clearAllMocks();
  });

  describe('Report Generation (8 types)', () => {
    it('should generate executive summary report', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.EXECUTIVE_SUMMARY,
        frameworks: [ComplianceFramework.SOC2],
        format: ReportFormat.PDF,
        period: createTestPeriod(30),
        generatedBy: 'test_user',
      });

      expect(report).toBeDefined();
      expect(report.reportType).toBe(ReportType.EXECUTIVE_SUMMARY);
      expect(report.status).toBe('completed');
      expect(report.content.executiveSummary).toBeDefined();
    });

    it('should generate detailed assessment report', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.DETAILED_ASSESSMENT,
        frameworks: [ComplianceFramework.ISO27001],
        format: ReportFormat.HTML,
        period: createTestPeriod(90),
        generatedBy: 'test_user',
        includeEvidence: true,
      });

      expect(report).toBeDefined();
      expect(report.reportType).toBe(ReportType.DETAILED_ASSESSMENT);
      expect(report.content.controlAssessments).toBeDefined();
    });

    it('should generate gap analysis report', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.GAP_ANALYSIS,
        frameworks: [ComplianceFramework.HIPAA],
        format: ReportFormat.JSON,
        period: createTestPeriod(60),
        generatedBy: 'test_user',
        includeRecommendations: true,
      });

      expect(report).toBeDefined();
      expect(report.reportType).toBe(ReportType.GAP_ANALYSIS);
      expect(report.content.gapAnalysis).toBeDefined();
    });

    it('should generate audit report', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.AUDIT_REPORT,
        frameworks: [ComplianceFramework.GDPR],
        format: ReportFormat.WORD,
        period: createTestPeriod(365),
        generatedBy: 'auditor',
        stakeholderView: StakeholderView.AUDITORS,
      });

      expect(report).toBeDefined();
      expect(report.reportType).toBe(ReportType.AUDIT_REPORT);
      expect(report.stakeholderView).toBe(StakeholderView.AUDITORS);
    });

    it('should generate certification package report', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.CERTIFICATION_PACKAGE,
        frameworks: [ComplianceFramework.SOC2],
        format: ReportFormat.PDF,
        period: createTestPeriod(365),
        generatedBy: 'compliance_officer',
      });

      expect(report).toBeDefined();
      expect(report.reportType).toBe(ReportType.CERTIFICATION_PACKAGE);
    });

    it('should generate evidence package report', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.EVIDENCE_PACKAGE,
        frameworks: [ComplianceFramework.ISO27001],
        format: ReportFormat.JSON,
        period: createTestPeriod(90),
        generatedBy: 'test_user',
        includeEvidence: true,
      });

      expect(report).toBeDefined();
      expect(report.reportType).toBe(ReportType.EVIDENCE_PACKAGE);
    });

    it('should generate remediation report', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.REMEDIATION_REPORT,
        frameworks: [ComplianceFramework.SOC2],
        format: ReportFormat.XLSX,
        period: createTestPeriod(30),
        generatedBy: 'security_team',
      });

      expect(report).toBeDefined();
      expect(report.reportType).toBe(ReportType.REMEDIATION_REPORT);
    });

    it('should generate trend analysis report', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.TREND_ANALYSIS,
        frameworks: [ComplianceFramework.SOC2, ComplianceFramework.ISO27001],
        format: ReportFormat.HTML,
        period: createTestPeriod(365),
        generatedBy: 'analyst',
      });

      expect(report).toBeDefined();
      expect(report.reportType).toBe(ReportType.TREND_ANALYSIS);
      expect(report.content.trends).toBeDefined();
    });
  });

  describe('Report Formats (6 formats)', () => {
    it('should support PDF format', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.EXECUTIVE_SUMMARY,
        frameworks: [ComplianceFramework.SOC2],
        format: ReportFormat.PDF,
        period: createTestPeriod(),
        generatedBy: 'test_user',
      });
      expect(report.format).toBe(ReportFormat.PDF);
    });

    it('should support HTML format', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.EXECUTIVE_SUMMARY,
        frameworks: [ComplianceFramework.SOC2],
        format: ReportFormat.HTML,
        period: createTestPeriod(),
        generatedBy: 'test_user',
      });
      expect(report.format).toBe(ReportFormat.HTML);
    });

    it('should support JSON format', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.EXECUTIVE_SUMMARY,
        frameworks: [ComplianceFramework.SOC2],
        format: ReportFormat.JSON,
        period: createTestPeriod(),
        generatedBy: 'test_user',
      });
      expect(report.format).toBe(ReportFormat.JSON);
    });

    it('should support CSV format', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.EXECUTIVE_SUMMARY,
        frameworks: [ComplianceFramework.SOC2],
        format: ReportFormat.CSV,
        period: createTestPeriod(),
        generatedBy: 'test_user',
      });
      expect(report.format).toBe(ReportFormat.CSV);
    });

    it('should support XLSX format', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.EXECUTIVE_SUMMARY,
        frameworks: [ComplianceFramework.SOC2],
        format: ReportFormat.XLSX,
        period: createTestPeriod(),
        generatedBy: 'test_user',
      });
      expect(report.format).toBe(ReportFormat.XLSX);
    });

    it('should support DOCX/Word format', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.EXECUTIVE_SUMMARY,
        frameworks: [ComplianceFramework.SOC2],
        format: ReportFormat.WORD,
        period: createTestPeriod(),
        generatedBy: 'test_user',
      });
      expect(report.format).toBe(ReportFormat.WORD);
    });
  });

  describe('Report Events', () => {
    it('should emit report generation events', async () => {
      const startHandler = vi.fn();
      const completeHandler = vi.fn();

      generator.on('report:generation_started', startHandler);
      generator.on('report:generation_completed', completeHandler);

      await generator.generateReport({
        reportType: ReportType.EXECUTIVE_SUMMARY,
        frameworks: [ComplianceFramework.SOC2],
        format: ReportFormat.PDF,
        period: createTestPeriod(),
        generatedBy: 'test_user',
      });

      expect(startHandler).toHaveBeenCalled();
      expect(completeHandler).toHaveBeenCalled();
    });

    it('should generate download URL', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.EXECUTIVE_SUMMARY,
        frameworks: [ComplianceFramework.SOC2],
        format: ReportFormat.PDF,
        period: createTestPeriod(),
        generatedBy: 'test_user',
      });

      expect(report.downloadUrl).toBeDefined();
      expect(report.downloadUrl).toContain(report.id);
    });

    it('should set expiration date for reports', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.GAP_ANALYSIS,
        frameworks: [ComplianceFramework.HIPAA],
        format: ReportFormat.JSON,
        period: createTestPeriod(),
        generatedBy: 'test_user',
      });

      expect(report.expiresAt).toBeDefined();
      expect(report.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Report Templates', () => {
    it('should create custom template', async () => {
      const template = await generator.createTemplate({
        name: 'Custom Executive Report',
        description: 'Custom template for board reporting',
        reportType: ReportType.EXECUTIVE_SUMMARY,
        stakeholderView: StakeholderView.BOARD,
        branding: {
          primaryColor: '#1a365d',
          secondaryColor: '#2b6cb0',
          fontFamily: 'Arial',
          companyName: 'Test Company',
        },
        sections: [
          {
            id: 'summary',
            name: 'Summary',
            type: 'summary',
            order: 1,
            visible: true,
            config: {},
          },
        ],
        createdBy: 'admin',
      });

      expect(template).toBeDefined();
      expect(template.id).toBeDefined();
      expect(template.name).toBe('Custom Executive Report');
    });

    it('should update template', async () => {
      const template = await generator.createTemplate({
        name: 'Template to Update',
        description: 'Original description',
        reportType: ReportType.DETAILED_ASSESSMENT,
        stakeholderView: StakeholderView.IT,
        branding: {
          primaryColor: '#000',
          secondaryColor: '#fff',
          fontFamily: 'Helvetica',
          companyName: 'Company',
        },
        sections: [],
        createdBy: 'admin',
      });

      const updated = await generator.updateTemplate(template.id, {
        description: 'Updated description',
      });

      expect(updated.description).toBe('Updated description');
    });

    it('should delete template', async () => {
      const template = await generator.createTemplate({
        name: 'Template to Delete',
        description: 'Will be deleted',
        reportType: ReportType.GAP_ANALYSIS,
        stakeholderView: StakeholderView.SECURITY,
        branding: {
          primaryColor: '#000',
          secondaryColor: '#fff',
          fontFamily: 'Helvetica',
          companyName: 'Company',
        },
        sections: [],
        createdBy: 'admin',
      });

      await generator.deleteTemplate(template.id);

      const templates = generator.getTemplates();
      expect(templates.find((t) => t.id === template.id)).toBeUndefined();
    });

    it('should throw error when updating non-existent template', async () => {
      await expect(
        generator.updateTemplate('invalid_template_xyz', { description: 'test' })
      ).rejects.toThrow();
    });

    it('should throw error when deleting non-existent template', async () => {
      await expect(generator.deleteTemplate('invalid_template_xyz')).rejects.toThrow();
    });
  });

  describe('Scheduling and Distribution', () => {
    it('should schedule recurring report', async () => {
      const template = await generator.createTemplate({
        name: 'Scheduled Report Template',
        description: 'For scheduling tests',
        reportType: ReportType.EXECUTIVE_SUMMARY,
        stakeholderView: StakeholderView.EXECUTIVE,
        branding: {
          primaryColor: '#000',
          secondaryColor: '#fff',
          fontFamily: 'Arial',
          companyName: 'Company',
        },
        sections: [],
        createdBy: 'admin',
      });

      const schedule = await generator.scheduleReport({
        name: 'Weekly Executive Report',
        templateId: template.id,
        frequency: ScheduleFrequency.WEEKLY,
        recipients: [createTestRecipient()],
        frameworks: [ComplianceFramework.SOC2],
        formats: [ReportFormat.PDF],
        createdBy: 'admin',
      });

      expect(schedule).toBeDefined();
      expect(schedule.frequency).toBe(ScheduleFrequency.WEEKLY);
      expect(schedule.nextRunAt).toBeDefined();
    });

    it('should calculate next run time for all frequencies', async () => {
      const template = await generator.createTemplate({
        name: 'Frequency Test Template',
        description: 'For frequency tests',
        reportType: ReportType.EXECUTIVE_SUMMARY,
        stakeholderView: StakeholderView.EXECUTIVE,
        branding: {
          primaryColor: '#000',
          secondaryColor: '#fff',
          fontFamily: 'Arial',
          companyName: 'Company',
        },
        sections: [],
        createdBy: 'admin',
      });

      const frequencies = [
        ScheduleFrequency.DAILY,
        ScheduleFrequency.WEEKLY,
        ScheduleFrequency.MONTHLY,
        ScheduleFrequency.QUARTERLY,
        ScheduleFrequency.ANNUALLY,
      ];

      for (const frequency of frequencies) {
        const schedule = await generator.scheduleReport({
          name: `${frequency} Report`,
          templateId: template.id,
          frequency,
          recipients: [],
          frameworks: [ComplianceFramework.SOC2],
          formats: [ReportFormat.PDF],
          createdBy: 'admin',
        });

        expect(schedule.nextRunAt).toBeDefined();
        expect(schedule.nextRunAt.getTime()).toBeGreaterThan(Date.now());
      }
    });

    it('should update schedule', async () => {
      const template = await generator.createTemplate({
        name: 'Schedule Update Template',
        description: 'For update tests',
        reportType: ReportType.GAP_ANALYSIS,
        stakeholderView: StakeholderView.IT,
        branding: {
          primaryColor: '#000',
          secondaryColor: '#fff',
          fontFamily: 'Arial',
          companyName: 'Company',
        },
        sections: [],
        createdBy: 'admin',
      });

      const schedule = await generator.scheduleReport({
        name: 'Monthly Report',
        templateId: template.id,
        frequency: ScheduleFrequency.MONTHLY,
        recipients: [],
        frameworks: [ComplianceFramework.ISO27001],
        formats: [ReportFormat.PDF],
        createdBy: 'admin',
      });

      const updated = await generator.updateSchedule(schedule.id, {
        frequency: ScheduleFrequency.QUARTERLY,
      });

      expect(updated.frequency).toBe(ScheduleFrequency.QUARTERLY);
    });

    it('should delete schedule', async () => {
      const template = await generator.createTemplate({
        name: 'Schedule Delete Template',
        description: 'For delete tests',
        reportType: ReportType.AUDIT_REPORT,
        stakeholderView: StakeholderView.AUDITORS,
        branding: {
          primaryColor: '#000',
          secondaryColor: '#fff',
          fontFamily: 'Arial',
          companyName: 'Company',
        },
        sections: [],
        createdBy: 'admin',
      });

      const schedule = await generator.scheduleReport({
        name: 'Report to Delete',
        templateId: template.id,
        frequency: ScheduleFrequency.DAILY,
        recipients: [],
        frameworks: [ComplianceFramework.HIPAA],
        formats: [ReportFormat.HTML],
        createdBy: 'admin',
      });

      await generator.deleteSchedule(schedule.id);

      const schedules = generator.getSchedules();
      expect(schedules.find((s) => s.id === schedule.id)).toBeUndefined();
    });

    it('should distribute report to recipients', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.EXECUTIVE_SUMMARY,
        frameworks: [ComplianceFramework.SOC2],
        format: ReportFormat.PDF,
        period: createTestPeriod(),
        generatedBy: 'test_user',
      });

      const recipients = [createTestRecipient()];
      const result = await generator.distributeReport(report, recipients);

      expect(result.success.length).toBeGreaterThan(0);
    });

    it('should skip disabled recipients', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.GAP_ANALYSIS,
        frameworks: [ComplianceFramework.HIPAA],
        format: ReportFormat.PDF,
        period: createTestPeriod(),
        generatedBy: 'test_user',
      });

      const recipients = [
        {
          channel: DistributionChannel.EMAIL,
          destination: 'disabled@company.com',
          config: {},
          enabled: false,
        },
      ];

      const result = await generator.distributeReport(report, recipients);

      expect(result.success.length).toBe(0);
      expect(result.failed.length).toBe(0);
    });

    it('should support multiple distribution channels', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.EXECUTIVE_SUMMARY,
        frameworks: [ComplianceFramework.SOC2],
        format: ReportFormat.PDF,
        period: createTestPeriod(),
        generatedBy: 'test_user',
      });

      const channels = [
        DistributionChannel.EMAIL,
        DistributionChannel.SLACK,
        DistributionChannel.TEAMS,
        DistributionChannel.S3,
        DistributionChannel.WEBHOOK,
        DistributionChannel.SFTP,
      ];

      for (const channel of channels) {
        const recipients = [
          {
            channel,
            destination: 'destination',
            config: {},
            enabled: true,
          },
        ];

        const result = await generator.distributeReport(report, recipients);
        expect(result.success.length + result.failed.length).toBe(1);
      }
    });
  });

  describe('Certification Package Generation', () => {
    it('should generate certification package', async () => {
      const certPackage = await generator.generateCertificationPackage({
        framework: ComplianceFramework.SOC2,
        controlIds: ['soc2_1', 'soc2_2', 'soc2_3'],
        evidenceIds: ['evidence_1', 'evidence_2'],
        generatedBy: 'compliance_officer',
        certifyingBody: 'Third Party Auditor',
      });

      expect(certPackage).toBeDefined();
      expect(certPackage.framework).toBe(ComplianceFramework.SOC2);
      expect(certPackage.status).toBe('draft');
      expect(certPackage.documents.length).toBeGreaterThan(0);
      expect(certPackage.attestations.length).toBeGreaterThan(0);
    });

    it('should update certification status', async () => {
      const certPackage = await generator.generateCertificationPackage({
        framework: ComplianceFramework.ISO27001,
        controlIds: ['iso_1', 'iso_2'],
        evidenceIds: ['evidence_1'],
        generatedBy: 'admin',
      });

      const updated = await generator.updateCertificationStatus(
        certPackage.id,
        'review',
        'reviewer',
        'Ready for review'
      );

      expect(updated.status).toBe('review');
      expect(updated.auditTrail.length).toBeGreaterThan(1);
    });

    it('should maintain audit trail for certification changes', async () => {
      const certPackage = await generator.generateCertificationPackage({
        framework: ComplianceFramework.HIPAA,
        controlIds: ['hipaa_1'],
        evidenceIds: [],
        generatedBy: 'admin',
      });

      expect(certPackage.auditTrail.length).toBe(1);
      expect(certPackage.auditTrail[0].action).toBe('created');

      await generator.updateCertificationStatus(certPackage.id, 'approved', 'approver');

      const updatedPackage = generator.getCertificationPackage(certPackage.id);
      expect(updatedPackage?.auditTrail.length).toBe(2);
    });

    it('should throw error when updating non-existent package', async () => {
      await expect(
        generator.updateCertificationStatus('invalid_package_xyz', 'review', 'user')
      ).rejects.toThrow();
    });
  });

  describe('Historical Analysis', () => {
    it('should get historical trends', async () => {
      const trends = await generator.getHistoricalTrends(
        [ComplianceFramework.SOC2, ComplianceFramework.ISO27001],
        12,
        'month'
      );

      expect(trends.length).toBe(2);
      trends.forEach((trend) => {
        expect(trend.periods.length).toBe(12);
        expect(trend.aggregations.length).toBeGreaterThan(0);
      });
    });

    it('should generate trend predictions', async () => {
      const trends = await generator.getHistoricalTrends(
        [ComplianceFramework.HIPAA],
        6,
        'quarter'
      );

      expect(trends[0].predictions).toBeDefined();
      expect(trends[0].predictions!.length).toBeGreaterThan(0);
    });

    it('should compare two reports', async () => {
      const report1 = await generator.generateReport({
        reportType: ReportType.EXECUTIVE_SUMMARY,
        frameworks: [ComplianceFramework.SOC2],
        format: ReportFormat.JSON,
        period: createTestPeriod(60),
        generatedBy: 'analyst',
      });

      const report2 = await generator.generateReport({
        reportType: ReportType.EXECUTIVE_SUMMARY,
        frameworks: [ComplianceFramework.SOC2],
        format: ReportFormat.JSON,
        period: createTestPeriod(30),
        generatedBy: 'analyst',
      });

      const comparison = await generator.compareReports(report1.id, report2.id);

      expect(comparison).toBeDefined();
      expect(comparison.baseReportId).toBe(report1.id);
      expect(comparison.compareReportId).toBe(report2.id);
      expect(comparison.summary).toBeDefined();
    });

    it('should throw error when comparing non-existent reports', async () => {
      await expect(
        generator.compareReports('invalid_1_xyz', 'invalid_2_xyz')
      ).rejects.toThrow();
    });
  });

  describe('Executive Dashboard', () => {
    it('should create executive dashboard', async () => {
      const dashboard = await generator.createExecutiveDashboard({
        title: 'Compliance Overview',
        stakeholderView: StakeholderView.BOARD,
        frameworks: [ComplianceFramework.SOC2, ComplianceFramework.ISO27001],
        createdBy: 'admin',
      });

      expect(dashboard).toBeDefined();
      expect(dashboard.title).toBe('Compliance Overview');
      expect(dashboard.widgets.length).toBeGreaterThan(0);
      expect(dashboard.filters.length).toBeGreaterThan(0);
    });

    it('should get dashboard data', async () => {
      const dashboard = await generator.createExecutiveDashboard({
        title: 'Test Dashboard',
        stakeholderView: StakeholderView.EXECUTIVE,
        frameworks: [ComplianceFramework.SOC2],
        createdBy: 'admin',
      });

      const data = await generator.getDashboardData(dashboard.id);

      expect(data).toBeDefined();
      expect(Object.keys(data).length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent dashboard', async () => {
      await expect(generator.getDashboardData('invalid_dashboard_xyz')).rejects.toThrow();
    });

    it('should include stakeholder-specific widgets', async () => {
      const boardDashboard = await generator.createExecutiveDashboard({
        title: 'Board Dashboard',
        stakeholderView: StakeholderView.BOARD,
        frameworks: [ComplianceFramework.SOC2],
        createdBy: 'admin',
      });

      const hasExecutiveWidget = boardDashboard.widgets.some(
        (w) => w.id === 'widget_executive_summary'
      );
      expect(hasExecutiveWidget).toBe(true);
    });
  });

  describe('Stakeholder Views', () => {
    it('should support all stakeholder views', async () => {
      const views = [
        StakeholderView.BOARD,
        StakeholderView.AUDITORS,
        StakeholderView.IT,
        StakeholderView.LEGAL,
        StakeholderView.EXECUTIVE,
        StakeholderView.OPERATIONS,
        StakeholderView.SECURITY,
      ];

      for (const view of views) {
        const report = await generator.generateReport({
          reportType: ReportType.EXECUTIVE_SUMMARY,
          frameworks: [ComplianceFramework.SOC2],
          format: ReportFormat.PDF,
          period: createTestPeriod(),
          generatedBy: 'test_user',
          stakeholderView: view,
        });

        expect(report.stakeholderView).toBe(view);
      }
    });
  });

  describe('Report Content Structure', () => {
    it('should include risk matrix in executive summary reports', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.EXECUTIVE_SUMMARY,
        frameworks: [ComplianceFramework.SOC2],
        format: ReportFormat.PDF,
        period: createTestPeriod(),
        generatedBy: 'test_user',
      });

      expect(report.content.riskMatrix).toBeDefined();
      expect(report.content.riskMatrix?.matrix).toBeDefined();
      expect(report.content.riskMatrix?.topRisks).toBeDefined();
    });

    it('should include framework analysis for multiple frameworks', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.DETAILED_ASSESSMENT,
        frameworks: [ComplianceFramework.SOC2, ComplianceFramework.ISO27001],
        format: ReportFormat.JSON,
        period: createTestPeriod(),
        generatedBy: 'test_user',
      });

      expect(report.content.frameworkAnalysis).toBeDefined();
      expect(report.content.frameworkAnalysis?.length).toBe(2);
    });
  });

  describe('Report Retrieval', () => {
    it('should get report by ID', async () => {
      const report = await generator.generateReport({
        reportType: ReportType.EXECUTIVE_SUMMARY,
        frameworks: [ComplianceFramework.SOC2],
        format: ReportFormat.PDF,
        period: createTestPeriod(),
        generatedBy: 'test_user',
      });

      const retrieved = generator.getReport(report.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(report.id);
    });

    it('should get all reports', async () => {
      await generator.generateReport({
        reportType: ReportType.EXECUTIVE_SUMMARY,
        frameworks: [ComplianceFramework.SOC2],
        format: ReportFormat.PDF,
        period: createTestPeriod(),
        generatedBy: 'test_user',
      });

      const reports = generator.getReports();
      expect(reports.length).toBeGreaterThan(0);
    });

    it('should get all certification packages', () => {
      const packages = generator.getCertificationPackages();
      expect(Array.isArray(packages)).toBe(true);
    });

    it('should get all dashboards', () => {
      const dashboards = generator.getDashboards();
      expect(Array.isArray(dashboards)).toBe(true);
    });
  });
});

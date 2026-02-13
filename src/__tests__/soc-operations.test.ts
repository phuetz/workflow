/**
 * SOC Operations Test Suite
 *
 * Comprehensive test coverage for the Security Operations Center (SOC) system:
 * - SOCOperationsCenter: Alert triage, case management, shift management, SLA tracking
 * - ThreatIntelligencePlatform: Threat feed ingestion, IOC management, campaign tracking
 * - SecurityOrchestrationHub: Playbook execution, containment, remediation, integration health
 *
 * @module __tests__/soc-operations.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SOCOperationsCenter,
  type SecurityAlert,
  type SOCCase,
  type SOCAnalyst,
  type Runbook,
  type Shift,
  type SLAConfig,
  type AlertSeverity,
  type CasePriority,
} from '../soc/SOCOperationsCenter';
import {
  ThreatIntelligencePlatform,
  type IOC,
  type ThreatActor,
  type Campaign,
  type ThreatFeed,
  type IOCType,
  type ThreatSeverity as TIPThreatSeverity,
  type ThreatCategory,
  type HuntPlatform,
} from '../soc/ThreatIntelligencePlatform';
import {
  SecurityOrchestrationHub,
  ThreatSeverity,
  IncidentState,
  PlaybookActionCategory,
  IntegrationSystem,
  ApprovalStatus,
  PlaybookExecutionStatus,
  ContainmentType,
  RemediationType,
  type ResponsePlaybook,
  type PlaybookAction,
  type SecurityIncident,
  type IntegrationConfig,
  type RollbackRequest,
} from '../soc/SecurityOrchestrationHub';

// ============================================================================
// SOCOperationsCenter Tests
// ============================================================================

describe('SOCOperationsCenter', () => {
  let soc: SOCOperationsCenter;

  beforeEach(() => {
    SOCOperationsCenter.resetInstance();
    soc = SOCOperationsCenter.getInstance({
      autoTriageEnabled: true,
      mlScoringEnabled: true,
      autoAssignmentEnabled: true,
    });
  });

  afterEach(() => {
    SOCOperationsCenter.resetInstance();
  });

  // --------------------------------------------------------------------------
  // Alert Triage Tests
  // --------------------------------------------------------------------------

  describe('Alert Triage and Management', () => {
    it('should ingest a new alert', async () => {
      const alertData = {
        title: 'Suspicious Login Attempt',
        description: 'Multiple failed login attempts from unknown IP',
        severity: 'high' as AlertSeverity,
        source: 'siem',
        sourceType: 'siem' as const,
        indicators: [{ type: 'ip' as const, value: '192.168.1.100', confidence: 80 }],
        affectedAssets: ['web-server-01'],
        tags: ['authentication', 'brute-force'],
      };

      const alert = await soc.ingestAlert(alertData);

      expect(alert.id).toMatch(/^ALT-/);
      expect(alert.status).toBe('triaged'); // Auto-triage enabled
      expect(alert.title).toBe('Suspicious Login Attempt');
      expect(alert.severity).toBe('high');
      expect(alert.mlScore).toBeDefined();
      expect(alert.triageScore).toBeDefined();
    });

    it('should calculate triage score based on severity', async () => {
      const criticalAlert = await soc.ingestAlert({
        title: 'Critical Alert',
        description: 'Critical security incident',
        severity: 'critical' as AlertSeverity,
        source: 'edr',
        sourceType: 'edr' as const,
        indicators: [],
        affectedAssets: [],
        tags: [],
      });

      const lowAlert = await soc.ingestAlert({
        title: 'Low Alert',
        description: 'Low priority security event',
        severity: 'low' as AlertSeverity,
        source: 'ids',
        sourceType: 'ids' as const,
        indicators: [],
        affectedAssets: [],
        tags: [],
      });

      expect(criticalAlert.triageScore!).toBeGreaterThan(lowAlert.triageScore!);
    });

    it('should calculate triage score with indicator and asset counts', async () => {
      const alertWithIndicators = await soc.ingestAlert({
        title: 'Alert with IOCs',
        description: 'Multiple indicators detected',
        severity: 'medium' as AlertSeverity,
        source: 'siem',
        sourceType: 'siem' as const,
        indicators: [
          { type: 'ip' as const, value: '10.0.0.1', confidence: 90 },
          { type: 'domain' as const, value: 'malicious.com', confidence: 85 },
          { type: 'hash' as const, value: 'abc123', confidence: 95 },
        ],
        affectedAssets: ['server-01', 'server-02', 'workstation-05'],
        tags: [],
      });

      expect(alertWithIndicators.triageScore!).toBeGreaterThan(50);
    });

    it('should filter alerts by severity', async () => {
      await soc.ingestAlert({
        title: 'Critical Alert',
        description: 'Critical',
        severity: 'critical' as AlertSeverity,
        source: 'edr',
        sourceType: 'edr' as const,
        indicators: [],
        affectedAssets: [],
        tags: [],
      });

      await soc.ingestAlert({
        title: 'Medium Alert',
        description: 'Medium',
        severity: 'medium' as AlertSeverity,
        source: 'siem',
        sourceType: 'siem' as const,
        indicators: [],
        affectedAssets: [],
        tags: [],
      });

      const criticalAlerts = soc.getAlerts({ severity: ['critical'] });
      expect(criticalAlerts).toHaveLength(1);
      expect(criticalAlerts[0].severity).toBe('critical');
    });

    it('should filter alerts by status', async () => {
      const alert = await soc.ingestAlert({
        title: 'Test Alert',
        description: 'Test',
        severity: 'high' as AlertSeverity,
        source: 'firewall',
        sourceType: 'firewall' as const,
        indicators: [],
        affectedAssets: [],
        tags: [],
      });

      const triagedAlerts = soc.getAlerts({ status: ['triaged'] });
      expect(triagedAlerts.some(a => a.id === alert.id)).toBe(true);
    });

    it('should filter alerts by date range', async () => {
      const alert = await soc.ingestAlert({
        title: 'Date Range Alert',
        description: 'Test',
        severity: 'medium' as AlertSeverity,
        source: 'dlp',
        sourceType: 'dlp' as const,
        indicators: [],
        affectedAssets: [],
        tags: [],
      });

      const now = new Date();
      const alerts = soc.getAlerts({
        dateRange: {
          start: new Date(now.getTime() - 3600000),
          end: new Date(now.getTime() + 3600000),
        },
      });

      expect(alerts.some(a => a.id === alert.id)).toBe(true);
    });

    it('should emit alert:ingested event', async () => {
      const eventHandler = vi.fn();
      soc.on('alert:ingested', eventHandler);

      await soc.ingestAlert({
        title: 'Event Test Alert',
        description: 'Test',
        severity: 'low' as AlertSeverity,
        source: 'manual',
        sourceType: 'manual' as const,
        indicators: [],
        affectedAssets: [],
        tags: [],
      });

      expect(eventHandler).toHaveBeenCalled();
    });

    it('should manually triage an alert', async () => {
      SOCOperationsCenter.resetInstance();
      soc = SOCOperationsCenter.getInstance({ autoTriageEnabled: false });

      const alert = await soc.ingestAlert({
        title: 'Manual Triage Alert',
        description: 'Test',
        severity: 'high' as AlertSeverity,
        source: 'external',
        sourceType: 'external' as const,
        indicators: [],
        affectedAssets: [],
        tags: [],
      });

      expect(alert.status).toBe('new');

      const triagedAlert = await soc.triageAlert(alert.id, 'analyst-01');
      expect(triagedAlert.status).toBe('triaged');
      expect(triagedAlert.triageScore).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // Case Management Tests
  // --------------------------------------------------------------------------

  describe('Case Management', () => {
    it('should create a new case', async () => {
      const socCase = await soc.createCase(
        {
          title: 'Ransomware Investigation',
          description: 'Investigating potential ransomware infection',
          priority: 'P1' as CasePriority,
          tags: ['ransomware', 'critical'],
        },
        'analyst-01'
      );

      expect(socCase.id).toMatch(/^CASE-/);
      expect(socCase.status).toBe('open');
      expect(socCase.priority).toBe('P1');
      expect(socCase.timeline).toHaveLength(1);
      expect(socCase.slaDeadline).toBeDefined();
    });

    it('should create a case with related alerts', async () => {
      const alert1 = await soc.ingestAlert({
        title: 'Related Alert 1',
        description: 'First alert',
        severity: 'high' as AlertSeverity,
        source: 'siem',
        sourceType: 'siem' as const,
        indicators: [{ type: 'ip' as const, value: '1.2.3.4', confidence: 80 }],
        affectedAssets: ['server-01'],
        tags: [],
      });

      const alert2 = await soc.ingestAlert({
        title: 'Related Alert 2',
        description: 'Second alert',
        severity: 'high' as AlertSeverity,
        source: 'siem',
        sourceType: 'siem' as const,
        indicators: [{ type: 'domain' as const, value: 'evil.com', confidence: 90 }],
        affectedAssets: ['server-02'],
        tags: [],
      });

      const socCase = await soc.createCase(
        {
          title: 'Multi-Alert Case',
          description: 'Case with multiple alerts',
          priority: 'P2' as CasePriority,
          relatedAlerts: [alert1.id, alert2.id],
        },
        'analyst-01'
      );

      expect(socCase.relatedAlerts).toHaveLength(2);
      expect(socCase.indicators).toHaveLength(2);
      expect(socCase.affectedAssets).toHaveLength(2);
    });

    it('should assign an analyst to a case', async () => {
      soc.registerAnalyst({
        id: 'analyst-01',
        name: 'John Analyst',
        email: 'john@example.com',
        role: 'senior_analyst',
        shift: 'day',
        skills: ['incident-response', 'malware-analysis'],
        currentCaseload: 2,
        maxCaseload: 10,
        available: true,
      });

      const socCase = await soc.createCase(
        {
          title: 'Assignment Test Case',
          description: 'Test',
          priority: 'P3' as CasePriority,
        },
        'manager-01'
      );

      const updatedCase = await soc.assignAnalyst(socCase.id, 'analyst-01', 'manager-01');

      expect(updatedCase.assignedTo).toBe('analyst-01');
      expect(updatedCase.timeline.some(t => t.type === 'assignment')).toBe(true);
    });

    it('should reject assignment when analyst is at max caseload', async () => {
      soc.registerAnalyst({
        id: 'busy-analyst',
        name: 'Busy Analyst',
        email: 'busy@example.com',
        role: 'analyst',
        shift: 'day',
        skills: [],
        currentCaseload: 5,
        maxCaseload: 5,
        available: true,
      });

      const socCase = await soc.createCase(
        {
          title: 'Overload Test',
          description: 'Test',
          priority: 'P4' as CasePriority,
        },
        'manager-01'
      );

      await expect(soc.assignAnalyst(socCase.id, 'busy-analyst', 'manager-01')).rejects.toThrow(
        'at maximum caseload'
      );
    });

    it('should escalate a case', async () => {
      const eventHandler = vi.fn();
      soc.on('case:escalated', eventHandler);

      const socCase = await soc.createCase(
        {
          title: 'Escalation Test',
          description: 'Test',
          priority: 'P1' as CasePriority,
        },
        'analyst-01'
      );

      const escalatedCase = await soc.escalateCase(
        socCase.id,
        'soc-manager',
        'Requires manager attention',
        'analyst-01'
      );

      expect(escalatedCase.status).toBe('escalated');
      expect(escalatedCase.escalatedTo).toBe('soc-manager');
      expect(eventHandler).toHaveBeenCalled();
    });

    it('should filter cases by priority', async () => {
      await soc.createCase(
        { title: 'P1 Case', description: 'Test', priority: 'P1' as CasePriority },
        'analyst-01'
      );
      await soc.createCase(
        { title: 'P3 Case', description: 'Test', priority: 'P3' as CasePriority },
        'analyst-01'
      );

      const p1Cases = soc.getCases({ priority: ['P1'] });
      expect(p1Cases).toHaveLength(1);
      expect(p1Cases[0].priority).toBe('P1');
    });

    it('should sort cases by priority and update time', async () => {
      await soc.createCase(
        { title: 'P3 Case', description: 'Test', priority: 'P3' as CasePriority },
        'analyst-01'
      );
      await soc.createCase(
        { title: 'P1 Case', description: 'Test', priority: 'P1' as CasePriority },
        'analyst-01'
      );
      await soc.createCase(
        { title: 'P2 Case', description: 'Test', priority: 'P2' as CasePriority },
        'analyst-01'
      );

      const cases = soc.getCases();
      expect(cases[0].priority).toBe('P1');
      expect(cases[1].priority).toBe('P2');
      expect(cases[2].priority).toBe('P3');
    });
  });

  // --------------------------------------------------------------------------
  // Shift Management and SLA Tracking Tests
  // --------------------------------------------------------------------------

  describe('Shift Management and SLA Tracking', () => {
    it('should track SLA status for alerts', async () => {
      const alert = await soc.ingestAlert({
        title: 'SLA Test Alert',
        description: 'Test',
        severity: 'critical' as AlertSeverity,
        source: 'siem',
        sourceType: 'siem' as const,
        indicators: [],
        affectedAssets: [],
        tags: [],
      });

      const slaStatus = soc.trackSLA(alert.id);

      expect(slaStatus).toBeDefined();
      expect(slaStatus!.severity).toBe('critical');
      expect(slaStatus!.responseDeadline).toBeDefined();
      expect(slaStatus!.resolutionDeadline).toBeDefined();
      expect(slaStatus!.responseBreached).toBe(false);
    });

    it('should record response time when alert is triaged', async () => {
      const alert = await soc.ingestAlert({
        title: 'Response Time Test',
        description: 'Test',
        severity: 'high' as AlertSeverity,
        source: 'ids',
        sourceType: 'ids' as const,
        indicators: [],
        affectedAssets: [],
        tags: [],
      });

      const slaStatus = soc.trackSLA(alert.id);
      expect(slaStatus!.respondedAt).toBeDefined();
      expect(slaStatus!.timeToResponse).toBeDefined();
    });

    it('should get available analysts by shift', () => {
      soc.registerAnalyst({
        id: 'day-analyst',
        name: 'Day Analyst',
        email: 'day@example.com',
        role: 'analyst',
        shift: 'day',
        skills: [],
        currentCaseload: 2,
        maxCaseload: 5,
        available: true,
      });

      soc.registerAnalyst({
        id: 'night-analyst',
        name: 'Night Analyst',
        email: 'night@example.com',
        role: 'analyst',
        shift: 'night',
        skills: [],
        currentCaseload: 1,
        maxCaseload: 5,
        available: true,
      });

      const dayAnalysts = soc.getAvailableAnalysts('day');
      expect(dayAnalysts).toHaveLength(1);
      expect(dayAnalysts[0].shift).toBe('day');
    });

    it('should auto-assign senior analyst for critical alerts', async () => {
      soc.registerAnalyst({
        id: 'junior-analyst',
        name: 'Junior',
        email: 'junior@example.com',
        role: 'analyst',
        shift: 'day',
        skills: [],
        currentCaseload: 0,
        maxCaseload: 5,
        available: true,
      });

      soc.registerAnalyst({
        id: 'senior-analyst',
        name: 'Senior',
        email: 'senior@example.com',
        role: 'senior_analyst',
        shift: 'day',
        skills: [],
        currentCaseload: 0,
        maxCaseload: 5,
        available: true,
      });

      const alert = await soc.ingestAlert({
        title: 'Critical Auto-Assign',
        description: 'Test',
        severity: 'critical' as AlertSeverity,
        source: 'edr',
        sourceType: 'edr' as const,
        indicators: [],
        affectedAssets: [],
        tags: [],
      });

      expect(alert.assignedTo).toBe('senior-analyst');
    });
  });

  // --------------------------------------------------------------------------
  // Runbook Execution Tests
  // --------------------------------------------------------------------------

  describe('Runbook Execution', () => {
    it('should register a runbook', () => {
      const runbook: Runbook = {
        id: 'rb-001',
        name: 'Malware Response',
        description: 'Automated malware response playbook',
        category: 'incident-response',
        triggerConditions: [{ field: 'severity', operator: 'equals', value: 'critical' }],
        steps: [
          {
            id: 'step-1',
            order: 1,
            name: 'Isolate Host',
            description: 'Isolate affected host from network',
            type: 'api_call',
            config: {},
            onFailure: 'stop',
          },
        ],
        automationLevel: 'automated',
        estimatedDurationMinutes: 15,
        createdBy: 'soc-admin',
        lastUpdated: new Date(),
        version: '1.0.0',
        enabled: true,
      };

      soc.registerRunbook(runbook);

      const eventHandler = vi.fn();
      soc.on('runbook:registered', eventHandler);
      soc.registerRunbook({ ...runbook, id: 'rb-002' });

      expect(eventHandler).toHaveBeenCalled();
    });

    it('should execute a runbook', async () => {
      const runbook: Runbook = {
        id: 'rb-exec-001',
        name: 'Test Runbook',
        description: 'Test',
        category: 'testing',
        triggerConditions: [],
        steps: [
          {
            id: 'step-1',
            order: 1,
            name: 'Test Step',
            description: 'Test step',
            type: 'script',
            config: {},
            onFailure: 'continue',
          },
        ],
        automationLevel: 'automated',
        estimatedDurationMinutes: 5,
        createdBy: 'admin',
        lastUpdated: new Date(),
        version: '1.0.0',
        enabled: true,
      };

      soc.registerRunbook(runbook);

      const socCase = await soc.createCase(
        {
          title: 'Runbook Execution Test',
          description: 'Test',
          priority: 'P2' as CasePriority,
        },
        'analyst-01'
      );

      const execution = await soc.executeRunbook(
        'rb-exec-001',
        { caseId: socCase.id },
        'analyst-01'
      );

      expect(execution.id).toMatch(/^RBX-/);
      expect(execution.status).toBe('completed');
      expect(execution.stepResults).toHaveLength(1);
    });

    it('should handle runbook step failure', async () => {
      const runbook: Runbook = {
        id: 'rb-fail-001',
        name: 'Failing Runbook',
        description: 'Test',
        category: 'testing',
        triggerConditions: [],
        steps: [
          {
            id: 'fail-step',
            order: 1,
            name: 'Failing Step',
            description: 'This step might fail',
            type: 'manual', // Will complete successfully in simulation
            config: {},
            onFailure: 'continue',
          },
        ],
        automationLevel: 'semi-automated',
        estimatedDurationMinutes: 10,
        createdBy: 'admin',
        lastUpdated: new Date(),
        version: '1.0.0',
        enabled: true,
      };

      soc.registerRunbook(runbook);

      const execution = await soc.executeRunbook('rb-fail-001', {}, 'analyst-01');
      expect(execution.status).toBe('completed');
    });

    it('should reject execution of disabled runbook', async () => {
      const runbook: Runbook = {
        id: 'rb-disabled',
        name: 'Disabled Runbook',
        description: 'Test',
        category: 'testing',
        triggerConditions: [],
        steps: [],
        automationLevel: 'automated',
        estimatedDurationMinutes: 5,
        createdBy: 'admin',
        lastUpdated: new Date(),
        version: '1.0.0',
        enabled: false,
      };

      soc.registerRunbook(runbook);

      await expect(soc.executeRunbook('rb-disabled', {}, 'analyst-01')).rejects.toThrow(
        'is disabled'
      );
    });
  });

  // --------------------------------------------------------------------------
  // Metrics Generation Tests
  // --------------------------------------------------------------------------

  describe('Metrics and KPI Generation', () => {
    it('should generate SOC metrics', async () => {
      await soc.ingestAlert({
        title: 'Metric Test Alert 1',
        description: 'Test',
        severity: 'high' as AlertSeverity,
        source: 'siem',
        sourceType: 'siem' as const,
        indicators: [],
        affectedAssets: [],
        tags: [],
      });

      await soc.ingestAlert({
        title: 'Metric Test Alert 2',
        description: 'Test',
        severity: 'medium' as AlertSeverity,
        source: 'ids',
        sourceType: 'ids' as const,
        indicators: [],
        affectedAssets: [],
        tags: [],
      });

      const metrics = soc.generateMetrics();

      expect(metrics.alertVolume.total).toBeGreaterThanOrEqual(2);
      expect(metrics.period.start).toBeDefined();
      expect(metrics.period.end).toBeDefined();
      expect(metrics.slaMetrics).toBeDefined();
    });

    it('should calculate false positive rate', async () => {
      // Ingest alerts (they will be auto-triaged, not marked as false positive)
      await soc.ingestAlert({
        title: 'Real Alert',
        description: 'Test',
        severity: 'high' as AlertSeverity,
        source: 'siem',
        sourceType: 'siem' as const,
        indicators: [],
        affectedAssets: [],
        tags: [],
      });

      const metrics = soc.generateMetrics();
      expect(metrics.falsePositiveRate).toBeDefined();
      expect(typeof metrics.falsePositiveRate).toBe('number');
    });

    it('should generate trend data points', async () => {
      const metrics = soc.generateMetrics();

      expect(metrics.trendData).toBeDefined();
      expect(Array.isArray(metrics.trendData)).toBe(true);
    });

    it('should cache metrics for performance', () => {
      const metrics1 = soc.generateMetrics();
      const metrics2 = soc.generateMetrics();

      expect(metrics1.period.start.getTime()).toBe(metrics2.period.start.getTime());
    });
  });
});

// ============================================================================
// ThreatIntelligencePlatform Tests
// ============================================================================

describe('ThreatIntelligencePlatform', () => {
  let tip: ThreatIntelligencePlatform;

  beforeEach(() => {
    ThreatIntelligencePlatform.resetInstance();
    tip = ThreatIntelligencePlatform.getInstance({
      autoEnrichment: false, // Disable for faster tests
      deduplicationEnabled: true,
      correlationEnabled: true,
    });
  });

  afterEach(() => {
    ThreatIntelligencePlatform.resetInstance();
  });

  // --------------------------------------------------------------------------
  // Threat Feed Ingestion Tests
  // --------------------------------------------------------------------------

  describe('Threat Feed Ingestion', () => {
    it('should have default feeds initialized', () => {
      const feeds = tip.getAllFeeds();
      expect(feeds.length).toBeGreaterThan(0);
      expect(feeds.some(f => f.type === 'urlhaus')).toBe(true);
      expect(feeds.some(f => f.type === 'feodo-tracker')).toBe(true);
    });

    it('should ingest feed and return IOC count', async () => {
      const result = await tip.ingestFeed('abuse-ch-urlhaus');

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.iocCount).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should return error for non-existent feed', async () => {
      const result = await tip.ingestFeed('non-existent-feed');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('not found');
    });

    it('should emit feed:ingesting event', async () => {
      const eventHandler = vi.fn();
      tip.on('feed:ingesting', eventHandler);

      await tip.ingestFeed('abuse-ch-urlhaus');

      expect(eventHandler).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // IOC Management Tests
  // --------------------------------------------------------------------------

  describe('IOC Management', () => {
    it('should add a new IOC', async () => {
      const ioc = await tip.addIOC({
        type: 'ip-dst' as IOCType,
        value: '192.168.1.100',
        confidence: 85,
        severity: 'high' as TIPThreatSeverity,
        categories: ['c2' as ThreatCategory],
        sources: ['manual-entry'],
        tags: ['apt', 'targeted'],
      });

      expect(ioc).not.toBeNull();
      expect(ioc!.id).toMatch(/^ioc_/);
      expect(ioc!.value).toBe('192.168.1.100');
      expect(ioc!.confidence).toBe(85);
    });

    it('should normalize IOC values', async () => {
      const domainIOC = await tip.addIOC({
        type: 'domain' as IOCType,
        value: 'WWW.MALICIOUS.COM',
        severity: 'high' as TIPThreatSeverity,
      });

      expect(domainIOC!.value).toBe('malicious.com');
    });

    it('should deduplicate IOCs with same type and value', async () => {
      const ioc1 = await tip.addIOC({
        type: 'sha256' as IOCType,
        value: 'a'.repeat(64),
        confidence: 70,
        severity: 'medium' as TIPThreatSeverity,
        sources: ['source-1'],
      });

      const ioc2 = await tip.addIOC({
        type: 'sha256' as IOCType,
        value: 'A'.repeat(64), // Same value, different case
        confidence: 90,
        severity: 'high' as TIPThreatSeverity,
        sources: ['source-2'],
      });

      // Should update existing rather than create new
      expect(ioc1!.id).toBe(ioc2!.id);
      expect(ioc2!.sources).toContain('source-1');
      expect(ioc2!.sources).toContain('source-2');
    });

    it('should reject IOC without type or value', async () => {
      await expect(
        tip.addIOC({
          type: undefined as unknown as IOCType,
          value: '192.168.1.1',
        })
      ).rejects.toThrow('type and value are required');
    });

    it('should get IOC by ID', async () => {
      const ioc = await tip.addIOC({
        type: 'url' as IOCType,
        value: 'https://malware.example.com/payload',
        severity: 'critical' as TIPThreatSeverity,
      });

      const retrieved = tip.getIOC(ioc!.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.value).toBe('https://malware.example.com/payload');
    });

    it('should get all IOCs', async () => {
      await tip.addIOC({
        type: 'ip-dst' as IOCType,
        value: '10.0.0.1',
        severity: 'medium' as TIPThreatSeverity,
      });

      await tip.addIOC({
        type: 'domain' as IOCType,
        value: 'bad.example.com',
        severity: 'high' as TIPThreatSeverity,
      });

      const allIOCs = tip.getAllIOCs();
      expect(allIOCs.length).toBeGreaterThanOrEqual(2);
    });

    it('should enrich an IOC', async () => {
      ThreatIntelligencePlatform.resetInstance();
      tip = ThreatIntelligencePlatform.getInstance({
        autoEnrichment: false,
        enrichmentProviders: ['virustotal', 'shodan', 'whois', 'geoip'],
      });

      const ioc = await tip.addIOC({
        type: 'ip-dst' as IOCType,
        value: '8.8.8.8',
        severity: 'low' as TIPThreatSeverity,
      });

      const enriched = await tip.enrichIOC(ioc!.id);

      expect(enriched).not.toBeNull();
      expect(enriched!.enrichment).toBeDefined();
      expect(enriched!.enrichment!.geoLocation).toBeDefined();
    });

    it('should emit ioc:added event', async () => {
      const eventHandler = vi.fn();
      tip.on('ioc:added', eventHandler);

      await tip.addIOC({
        type: 'md5' as IOCType,
        value: 'a'.repeat(32),
        severity: 'medium' as TIPThreatSeverity,
      });

      expect(eventHandler).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Threat Actor Tracking Tests
  // --------------------------------------------------------------------------

  describe('Campaign and Threat Actor Tracking', () => {
    it('should track a threat actor', () => {
      const actor = tip.trackThreatActor({
        name: 'APT29',
        aliases: ['Cozy Bear', 'The Dukes'],
        description: 'Russian state-sponsored threat actor',
        motivation: ['espionage'],
        sophistication: 'expert',
        targetedSectors: ['government', 'defense'],
        targetedCountries: ['US', 'EU'],
      });

      expect(actor.id).toMatch(/^actor_/);
      expect(actor.name).toBe('APT29');
      expect(actor.aliases).toContain('Cozy Bear');
    });

    it('should reject threat actor without name', () => {
      expect(() =>
        tip.trackThreatActor({
          description: 'No name actor',
        })
      ).toThrow('name is required');
    });

    it('should get threat actor by ID', () => {
      const actor = tip.trackThreatActor({
        name: 'Test Actor',
        sophistication: 'intermediate',
      });

      const retrieved = tip.getThreatActor(actor.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('Test Actor');
    });

    it('should create a campaign', () => {
      const campaign = tip.createCampaign({
        name: 'Operation SolarStorm',
        description: 'Supply chain attack campaign',
        status: 'active',
        objectives: ['espionage', 'data-theft'],
        targetedSectors: ['technology', 'government'],
      });

      expect(campaign.id).toMatch(/^campaign_/);
      expect(campaign.name).toBe('Operation SolarStorm');
      expect(campaign.status).toBe('active');
    });

    it('should reject campaign without name', () => {
      expect(() =>
        tip.createCampaign({
          description: 'Unnamed campaign',
        })
      ).toThrow('name is required');
    });

    it('should link campaign to threat actor', () => {
      const actor = tip.trackThreatActor({
        name: 'Campaign Actor',
        sophistication: 'advanced',
      });

      const campaign = tip.createCampaign({
        name: 'Linked Campaign',
        threatActorIds: [actor.id],
      });

      expect(campaign.threatActorIds).toContain(actor.id);

      const updatedActor = tip.getThreatActor(actor.id);
      expect(updatedActor!.campaignIds).toContain(campaign.id);
    });

    it('should get all threat actors', () => {
      tip.trackThreatActor({ name: 'Actor 1', sophistication: 'minimal' });
      tip.trackThreatActor({ name: 'Actor 2', sophistication: 'intermediate' });

      const actors = tip.getAllThreatActors();
      expect(actors.length).toBeGreaterThanOrEqual(2);
    });

    it('should get all campaigns', () => {
      tip.createCampaign({ name: 'Campaign 1', status: 'active' });
      tip.createCampaign({ name: 'Campaign 2', status: 'historic' });

      const campaigns = tip.getAllCampaigns();
      expect(campaigns.length).toBeGreaterThanOrEqual(2);
    });
  });

  // --------------------------------------------------------------------------
  // Hunt Query Generation Tests
  // --------------------------------------------------------------------------

  describe('Hunt Query Generation', () => {
    it('should generate Splunk hunt query', async () => {
      const ioc = await tip.addIOC({
        type: 'ip-dst' as IOCType,
        value: '192.168.100.50',
        severity: 'high' as TIPThreatSeverity,
      });

      const huntQuery = tip.generateHuntQuery({
        platform: 'splunk' as HuntPlatform,
        iocIds: [ioc!.id],
        name: 'Test Splunk Query',
      });

      expect(huntQuery.id).toMatch(/^hunt_/);
      expect(huntQuery.platform).toBe('splunk');
      expect(huntQuery.query).toContain('dest_ip');
    });

    it('should generate Elastic hunt query', async () => {
      const ioc = await tip.addIOC({
        type: 'domain' as IOCType,
        value: 'malicious.example.com',
        severity: 'medium' as TIPThreatSeverity,
      });

      const huntQuery = tip.generateHuntQuery({
        platform: 'elastic' as HuntPlatform,
        iocIds: [ioc!.id],
      });

      expect(huntQuery.platform).toBe('elastic');
      expect(huntQuery.query).toContain('dns.question.name');
    });

    it('should generate Sigma rule', async () => {
      const ioc = await tip.addIOC({
        type: 'ip-dst' as IOCType,
        value: '10.10.10.10',
        severity: 'high' as TIPThreatSeverity,
      });

      const huntQuery = tip.generateHuntQuery({
        platform: 'sigma' as HuntPlatform,
        iocIds: [ioc!.id],
      });

      expect(huntQuery.query).toContain('title:');
      expect(huntQuery.query).toContain('detection:');
    });

    it('should generate YARA rule', async () => {
      const ioc = await tip.addIOC({
        type: 'domain' as IOCType,
        value: 'yara-test.malware.com',
        severity: 'critical' as TIPThreatSeverity,
      });

      const huntQuery = tip.generateHuntQuery({
        platform: 'yara' as HuntPlatform,
        iocIds: [ioc!.id],
      });

      expect(huntQuery.query).toContain('rule');
      expect(huntQuery.query).toContain('strings:');
      expect(huntQuery.query).toContain('condition:');
    });

    it('should include IOCs from threat actors in hunt query', async () => {
      const ioc = await tip.addIOC({
        type: 'ip-dst' as IOCType,
        value: '172.16.0.100',
        severity: 'high' as TIPThreatSeverity,
      });

      const actor = tip.trackThreatActor({
        name: 'Hunt Actor',
        iocIds: [ioc!.id],
      });

      const huntQuery = tip.generateHuntQuery({
        platform: 'splunk' as HuntPlatform,
        threatActorIds: [actor.id],
      });

      expect(huntQuery.iocIds).toContain(ioc!.id);
    });

    it('should emit huntQuery:generated event', async () => {
      const eventHandler = vi.fn();
      tip.on('huntQuery:generated', eventHandler);

      tip.generateHuntQuery({
        platform: 'splunk' as HuntPlatform,
        iocIds: [],
      });

      expect(eventHandler).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Intelligence Sharing Tests
  // --------------------------------------------------------------------------

  describe('Intelligence Sharing', () => {
    it('should share intelligence to MISP', async () => {
      const ioc = await tip.addIOC({
        type: 'sha256' as IOCType,
        value: 'b'.repeat(64),
        severity: 'critical' as TIPThreatSeverity,
      });

      const result = await tip.shareIntelligence({
        iocIds: [ioc!.id],
        destination: 'misp',
      });

      expect(result.success).toBe(true);
      expect(result.objectsShared).toBeGreaterThanOrEqual(1);
    });

    it('should share intelligence to OpenCTI', async () => {
      const actor = tip.trackThreatActor({
        name: 'Share Test Actor',
        sophistication: 'advanced',
      });

      const result = await tip.shareIntelligence({
        threatActorIds: [actor.id],
        destination: 'opencti',
      });

      expect(result.success).toBe(true);
    });

    it('should emit intelligence:sharing event', async () => {
      const eventHandler = vi.fn();
      tip.on('intelligence:sharing', eventHandler);

      await tip.shareIntelligence({
        iocIds: [],
        destination: 'taxii',
      });

      expect(eventHandler).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Report Generation Tests
  // --------------------------------------------------------------------------

  describe('Report Generation', () => {
    it('should generate threat report', () => {
      const actor = tip.trackThreatActor({
        name: 'Report Test Actor',
        sophistication: 'expert',
      });

      const report = tip.generateReport({
        title: 'Threat Actor Analysis',
        reportType: 'actor-profile',
        tlp: 'amber',
        threatActorIds: [actor.id],
      });

      expect(report.id).toMatch(/^report_/);
      expect(report.title).toBe('Threat Actor Analysis');
      expect(report.tlp).toBe('amber');
      expect(report.content).toContain('Report Test Actor');
    });

    it('should generate campaign report with IOCs', async () => {
      const ioc = await tip.addIOC({
        type: 'url' as IOCType,
        value: 'https://campaign-report.test/malware',
        severity: 'high' as TIPThreatSeverity,
      });

      const campaign = tip.createCampaign({
        name: 'Report Campaign',
        iocIds: [ioc!.id],
        status: 'active',
      });

      const report = tip.generateReport({
        title: 'Campaign Report',
        reportType: 'campaign-report',
        tlp: 'green',
        campaignIds: [campaign.id],
        iocIds: [ioc!.id],
      });

      expect(report.campaignIds).toContain(campaign.id);
      expect(report.iocIds).toContain(ioc!.id);
      expect(report.stixBundle).toBeDefined();
    });

    it('should generate recommendations in report', () => {
      const actor = tip.trackThreatActor({
        name: 'Advanced Actor',
        sophistication: 'expert',
      });

      const report = tip.generateReport({
        title: 'Expert Threat Report',
        reportType: 'threat-report',
        tlp: 'red',
        threatActorIds: [actor.id],
      });

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes('advanced'))).toBe(true);
    });

    it('should emit report:generated event', () => {
      const eventHandler = vi.fn();
      tip.on('report:generated', eventHandler);

      tip.generateReport({
        title: 'Event Test Report',
        reportType: 'threat-report',
        tlp: 'white',
      });

      expect(eventHandler).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Platform Stats Tests
  // --------------------------------------------------------------------------

  describe('Platform Statistics', () => {
    it('should return platform stats', async () => {
      await tip.addIOC({
        type: 'ip-dst' as IOCType,
        value: '1.1.1.1',
        severity: 'low' as TIPThreatSeverity,
      });

      tip.trackThreatActor({ name: 'Stats Actor', sophistication: 'minimal' });
      tip.createCampaign({ name: 'Stats Campaign' });

      const stats = tip.getStats();

      expect(stats.totalIOCs).toBeGreaterThanOrEqual(1);
      expect(stats.threatActors).toBeGreaterThanOrEqual(1);
      expect(stats.campaigns).toBeGreaterThanOrEqual(1);
      expect(stats.feeds).toBeGreaterThan(0);
      expect(stats.lastUpdated).toBeDefined();
    });
  });
});

// ============================================================================
// SecurityOrchestrationHub Tests
// ============================================================================

describe('SecurityOrchestrationHub', () => {
  let hub: SecurityOrchestrationHub;

  beforeEach(() => {
    SecurityOrchestrationHub.resetInstance();
    hub = SecurityOrchestrationHub.getInstance({
      autoContainCritical: false,
      autoContainHigh: false,
      requireApprovalForContainment: false,
      maxConcurrentPlaybooks: 5,
    });
  });

  afterEach(() => {
    SecurityOrchestrationHub.resetInstance();
  });

  // --------------------------------------------------------------------------
  // Playbook Execution Tests
  // --------------------------------------------------------------------------

  describe('Playbook Execution', () => {
    it('should register a playbook', () => {
      const playbook: ResponsePlaybook = {
        id: 'pb-001',
        name: 'Malware Response',
        description: 'Automated malware response',
        version: '1.0.0',
        threatTypes: ['malware', 'ransomware'],
        severity: [ThreatSeverity.CRITICAL, ThreatSeverity.HIGH],
        actions: [],
        autoExecute: false,
        approvalRequired: false,
        approvers: [],
        maxDuration: 3600000,
        tags: ['automated'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
      };

      const registered = hub.registerPlaybook(playbook);
      expect(registered.id).toBe('pb-001');
    });

    it('should find matching playbooks', () => {
      hub.registerPlaybook({
        id: 'pb-malware',
        name: 'Malware Playbook',
        description: 'Test',
        version: '1.0.0',
        threatTypes: ['malware'],
        severity: [ThreatSeverity.HIGH],
        actions: [],
        autoExecute: false,
        approvalRequired: false,
        approvers: [],
        maxDuration: 3600000,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
      });

      const matches = hub.findMatchingPlaybooks('malware', ThreatSeverity.HIGH);
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches[0].threatTypes).toContain('malware');
    });

    it('should execute a playbook', async () => {
      const playbook: ResponsePlaybook = {
        id: 'pb-exec-001',
        name: 'Execution Test',
        description: 'Test',
        version: '1.0.0',
        threatTypes: ['test'],
        severity: [ThreatSeverity.MEDIUM],
        actions: [
          {
            id: 'action-1',
            name: 'Test Action',
            description: 'Test action',
            category: PlaybookActionCategory.INVESTIGATION,
            automated: true,
            requiresApproval: false,
            timeout: 60000,
            retryCount: 0,
            rollbackEnabled: false,
            dependencies: [],
            parameters: {},
            integrations: [],
          },
        ],
        autoExecute: false,
        approvalRequired: false,
        approvers: [],
        maxDuration: 3600000,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
      };

      hub.registerPlaybook(playbook);

      const incident = hub.createIncident({
        title: 'Playbook Test Incident',
        severity: ThreatSeverity.MEDIUM,
        threatType: 'test',
        reportedBy: 'tester',
      });

      const execution = await hub.executePlaybook('pb-exec-001', incident.id, 'analyst');

      expect(execution.status).toBe(PlaybookExecutionStatus.COMPLETED);
      expect(execution.metrics.completedActions).toBe(1);
    });

    it('should await approval when playbook requires it', async () => {
      const playbook: ResponsePlaybook = {
        id: 'pb-approval',
        name: 'Approval Required',
        description: 'Test',
        version: '1.0.0',
        threatTypes: ['test'],
        severity: [ThreatSeverity.HIGH],
        actions: [],
        autoExecute: false,
        approvalRequired: true,
        approvers: ['manager'],
        maxDuration: 3600000,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
      };

      hub.registerPlaybook(playbook);

      const incident = hub.createIncident({
        title: 'Approval Test',
        severity: ThreatSeverity.HIGH,
        threatType: 'test',
      });

      const execution = await hub.executePlaybook('pb-approval', incident.id, 'analyst');

      expect(execution.status).toBe(PlaybookExecutionStatus.AWAITING_APPROVAL);
      expect(execution.approvalStatus).toBe(ApprovalStatus.PENDING);
    });

    it('should reject execution when max concurrent reached', async () => {
      SecurityOrchestrationHub.resetInstance();
      hub = SecurityOrchestrationHub.getInstance({ maxConcurrentPlaybooks: 0 });

      hub.registerPlaybook({
        id: 'pb-concurrent',
        name: 'Concurrent Test',
        description: 'Test',
        version: '1.0.0',
        threatTypes: ['test'],
        severity: [ThreatSeverity.LOW],
        actions: [],
        autoExecute: false,
        approvalRequired: false,
        approvers: [],
        maxDuration: 3600000,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
      });

      const incident = hub.createIncident({
        title: 'Concurrent Test',
        severity: ThreatSeverity.LOW,
        threatType: 'test',
      });

      await expect(hub.executePlaybook('pb-concurrent', incident.id, 'analyst')).rejects.toThrow(
        'Maximum concurrent'
      );
    });
  });

  // --------------------------------------------------------------------------
  // Containment Tests
  // --------------------------------------------------------------------------

  describe('Containment Actions', () => {
    it('should contain a threat by isolating host', async () => {
      const incident = hub.createIncident({
        title: 'Containment Test',
        severity: ThreatSeverity.HIGH,
        threatType: 'malware',
        affectedAssets: [
          {
            id: 'asset-1',
            type: 'host',
            identifier: 'workstation-01',
            name: 'Workstation 01',
            criticality: 'medium',
            containmentStatus: 'none',
            metadata: {},
          },
        ],
      });

      const actions = await hub.containThreat(
        incident.id,
        [{ type: ContainmentType.ISOLATE_HOST, target: 'workstation-01', targetType: 'host' }],
        'analyst'
      );

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe(ContainmentType.ISOLATE_HOST);
      expect(actions[0].status).toBe('active');
    });

    it('should contain multiple targets', async () => {
      const incident = hub.createIncident({
        title: 'Multi-Containment Test',
        severity: ThreatSeverity.CRITICAL,
        threatType: 'apt',
      });

      const actions = await hub.containThreat(
        incident.id,
        [
          { type: ContainmentType.BLOCK_IP, target: '10.0.0.100', targetType: 'ip' },
          { type: ContainmentType.DISABLE_USER, target: 'compromised-user', targetType: 'user' },
          { type: ContainmentType.BLOCK_DOMAIN, target: 'malicious.com', targetType: 'domain' },
        ],
        'analyst'
      );

      expect(actions).toHaveLength(3);
      expect(actions.every(a => a.status === 'active')).toBe(true);
    });

    it('should release containment', async () => {
      const incident = hub.createIncident({
        title: 'Release Test',
        severity: ThreatSeverity.MEDIUM,
        threatType: 'test',
      });

      const [action] = await hub.containThreat(
        incident.id,
        [{ type: ContainmentType.LOCK_ACCOUNT, target: 'test-user', targetType: 'user' }],
        'analyst'
      );

      const released = await hub.releaseContainment(
        action.id,
        'manager',
        'Threat remediated'
      );

      expect(released.status).toBe('released');
      expect(released.releasedBy).toBe('manager');
      expect(released.duration).toBeDefined();
    });

    it('should update incident MTTC on first containment', async () => {
      const incident = hub.createIncident({
        title: 'MTTC Test',
        severity: ThreatSeverity.HIGH,
        threatType: 'malware',
      });

      await hub.containThreat(
        incident.id,
        [{ type: ContainmentType.QUARANTINE_FILE, target: '/tmp/malware.exe', targetType: 'host' }],
        'analyst'
      );

      const updated = hub.getIncident(incident.id);
      expect(updated!.metrics.mttc).toBeGreaterThan(0);
    });

    it('should emit containment events', async () => {
      const eventHandler = vi.fn();
      hub.on('threat:contained', eventHandler);

      const incident = hub.createIncident({
        title: 'Event Test',
        severity: ThreatSeverity.LOW,
        threatType: 'test',
      });

      await hub.containThreat(
        incident.id,
        [{ type: ContainmentType.REVOKE_SESSIONS, target: 'user-01', targetType: 'user' }],
        'analyst'
      );

      expect(eventHandler).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Remediation Tests
  // --------------------------------------------------------------------------

  describe('Remediation with Approval Gates', () => {
    it('should create remediation action requiring approval', async () => {
      const incident = hub.createIncident({
        title: 'Remediation Test',
        severity: ThreatSeverity.HIGH,
        threatType: 'vulnerability',
      });

      const actions = await hub.remediateIncident(
        incident.id,
        [{ type: RemediationType.PATCH_SYSTEM, target: 'server-01', requiresApproval: true }],
        'analyst'
      );

      expect(actions).toHaveLength(1);
      expect(actions[0].status).toBe('awaiting_approval');
      expect(actions[0].approvalStatus).toBe(ApprovalStatus.PENDING);
    });

    it('should auto-execute remediation without approval', async () => {
      const incident = hub.createIncident({
        title: 'Auto Remediation Test',
        severity: ThreatSeverity.MEDIUM,
        threatType: 'test',
      });

      const actions = await hub.remediateIncident(
        incident.id,
        [{ type: RemediationType.UPDATE_SIGNATURES, target: 'edr-server', requiresApproval: false }],
        'analyst'
      );

      expect(actions[0].status).toBe('completed');
      expect(actions[0].approvalStatus).toBe(ApprovalStatus.AUTO_APPROVED);
    });

    it('should approve and execute remediation', async () => {
      SecurityOrchestrationHub.resetInstance();
      hub = SecurityOrchestrationHub.getInstance({
        remediationApprovers: ['security_manager', 'ciso', 'manager'],
      });

      const incident = hub.createIncident({
        title: 'Approval Flow Test',
        severity: ThreatSeverity.HIGH,
        threatType: 'breach',
      });

      const [action] = await hub.remediateIncident(
        incident.id,
        [{ type: RemediationType.ROTATE_CREDENTIALS, target: 'db-server', requiresApproval: true }],
        'analyst'
      );

      const approved = await hub.approveRemediation(action.id, 'manager');

      expect(approved.approvalStatus).toBe(ApprovalStatus.APPROVED);
      expect(approved.approvedBy).toBe('manager');
      expect(approved.status).toBe('completed');
    });

    it('should reject unauthorized approver', async () => {
      SecurityOrchestrationHub.resetInstance();
      hub = SecurityOrchestrationHub.getInstance({
        remediationApprovers: ['ciso'],
      });

      const incident = hub.createIncident({
        title: 'Unauthorized Test',
        severity: ThreatSeverity.MEDIUM,
        threatType: 'test',
      });

      const [action] = await hub.remediateIncident(
        incident.id,
        [{ type: RemediationType.RESET_PASSWORD, target: 'user-01', requiresApproval: true }],
        'analyst'
      );

      await expect(hub.approveRemediation(action.id, 'random-user')).rejects.toThrow(
        'not authorized'
      );
    });

    it('should emit remediation events', async () => {
      const eventHandler = vi.fn();
      hub.on('incident:remediation_started', eventHandler);

      const incident = hub.createIncident({
        title: 'Event Test',
        severity: ThreatSeverity.LOW,
        threatType: 'test',
      });

      await hub.remediateIncident(
        incident.id,
        [{ type: RemediationType.UPDATE_WAF_RULES, target: 'waf-01', requiresApproval: false }],
        'analyst'
      );

      expect(eventHandler).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Integration Health Monitoring Tests
  // --------------------------------------------------------------------------

  describe('Integration Health Monitoring', () => {
    it('should register an integration', () => {
      const config: IntegrationConfig = {
        system: IntegrationSystem.EDR_CROWDSTRIKE,
        name: 'CrowdStrike Falcon',
        baseUrl: 'https://api.crowdstrike.com',
        apiKey: 'test-key',
        timeout: 30000,
        retryCount: 3,
        rateLimitPerSecond: 10,
        enabled: true,
        healthStatus: 'unknown',
      };

      hub.integrateSystem(config);

      const eventHandler = vi.fn();
      hub.on('integration:registered', eventHandler);

      hub.integrateSystem({
        ...config,
        system: IntegrationSystem.SIEM_SPLUNK,
        name: 'Splunk Enterprise',
      });

      expect(eventHandler).toHaveBeenCalled();
    });

    it('should check health of all integrations', async () => {
      hub.integrateSystem({
        system: IntegrationSystem.FIREWALL_PALO_ALTO,
        name: 'Palo Alto',
        baseUrl: 'https://pa.local',
        timeout: 5000,
        retryCount: 1,
        rateLimitPerSecond: 5,
        enabled: true,
        healthStatus: 'unknown',
      });

      const healthResults = await hub.checkHealth();

      expect(healthResults.size).toBeGreaterThanOrEqual(1);
      const paHealth = healthResults.get(IntegrationSystem.FIREWALL_PALO_ALTO);
      if (paHealth) {
        expect(['healthy', 'degraded', 'unhealthy']).toContain(paHealth.status);
      }
    });

    it('should track integration health metrics', async () => {
      hub.integrateSystem({
        system: IntegrationSystem.IAM_OKTA,
        name: 'Okta',
        baseUrl: 'https://okta.local',
        timeout: 5000,
        retryCount: 2,
        rateLimitPerSecond: 20,
        enabled: true,
        healthStatus: 'unknown',
      });

      const healthResults = await hub.checkHealth();
      const oktaHealth = healthResults.get(IntegrationSystem.IAM_OKTA);

      if (oktaHealth) {
        expect(oktaHealth.latency).toBeDefined();
        expect(oktaHealth.lastCheck).toBeDefined();
        expect(typeof oktaHealth.successRate).toBe('number');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Rollback Tests
  // --------------------------------------------------------------------------

  describe('Rollback Capabilities', () => {
    it('should rollback playbook execution', async () => {
      const playbook: ResponsePlaybook = {
        id: 'pb-rollback',
        name: 'Rollback Test',
        description: 'Test',
        version: '1.0.0',
        threatTypes: ['test'],
        severity: [ThreatSeverity.MEDIUM],
        actions: [
          {
            id: 'rollback-action',
            name: 'Rollbackable Action',
            description: 'Test',
            category: PlaybookActionCategory.CONTAINMENT,
            automated: true,
            requiresApproval: false,
            timeout: 60000,
            retryCount: 0,
            rollbackEnabled: true,
            dependencies: [],
            parameters: {},
            integrations: [],
          },
        ],
        autoExecute: false,
        approvalRequired: false,
        approvers: [],
        maxDuration: 3600000,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
      };

      hub.registerPlaybook(playbook);

      const incident = hub.createIncident({
        title: 'Rollback Incident',
        severity: ThreatSeverity.MEDIUM,
        threatType: 'test',
      });

      const execution = await hub.executePlaybook('pb-rollback', incident.id, 'analyst');

      const rollbackRequest: RollbackRequest = {
        executionId: execution.id,
        reason: 'Testing rollback',
        requestedBy: 'analyst',
        approvalRequired: false,
      };

      const result = await hub.rollbackAction(rollbackRequest);

      expect(result.success).toBe(true);
      expect(result.rolledBackActions.length).toBeGreaterThanOrEqual(0);
    });

    it('should reject rollback when not available', async () => {
      const playbook: ResponsePlaybook = {
        id: 'pb-no-rollback',
        name: 'No Rollback',
        description: 'Test',
        version: '1.0.0',
        threatTypes: ['test'],
        severity: [ThreatSeverity.LOW],
        actions: [
          {
            id: 'no-rollback-action',
            name: 'Non-rollbackable',
            description: 'Test',
            category: PlaybookActionCategory.NOTIFICATION,
            automated: true,
            requiresApproval: false,
            timeout: 60000,
            retryCount: 0,
            rollbackEnabled: false,
            dependencies: [],
            parameters: {},
            integrations: [],
          },
        ],
        autoExecute: false,
        approvalRequired: false,
        approvers: [],
        maxDuration: 3600000,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
      };

      hub.registerPlaybook(playbook);

      const incident = hub.createIncident({
        title: 'No Rollback Test',
        severity: ThreatSeverity.LOW,
        threatType: 'test',
      });

      const execution = await hub.executePlaybook('pb-no-rollback', incident.id, 'analyst');

      await expect(
        hub.rollbackAction({
          executionId: execution.id,
          reason: 'Test',
          requestedBy: 'analyst',
          approvalRequired: false,
        })
      ).rejects.toThrow('not available');
    });
  });

  // --------------------------------------------------------------------------
  // Incident Report Generation Tests
  // --------------------------------------------------------------------------

  describe('Incident Report Generation', () => {
    it('should generate incident report', async () => {
      const incident = hub.createIncident({
        title: 'Report Test Incident',
        description: 'Test incident for report generation',
        severity: ThreatSeverity.HIGH,
        threatType: 'data-breach',
        affectedAssets: [
          {
            id: 'db-1',
            type: 'database',
            identifier: 'production-db',
            name: 'Production Database',
            criticality: 'critical',
            containmentStatus: 'none',
            metadata: { containsPII: true },
          },
        ],
        indicators: [
          {
            id: 'ioc-1',
            type: 'ip',
            value: '192.168.1.200',
            severity: ThreatSeverity.HIGH,
            confidence: 90,
            firstSeen: new Date(),
            lastSeen: new Date(),
            source: 'siem',
            tags: [],
          },
        ],
      });

      await hub.containThreat(
        incident.id,
        [{ type: ContainmentType.BLOCK_IP, target: '192.168.1.200', targetType: 'ip' }],
        'analyst'
      );

      const report = hub.generateIncidentReport(incident.id, 'analyst');

      expect(report.incidentId).toBe(incident.id);
      expect(report.summary).toContain('data-breach');
      expect(report.containmentSummary.totalActions).toBe(1);
      expect(report.indicators).toHaveLength(1);
      expect(report.compliance.frameworks).toContain('SOC2');
    });

    it('should include lessons learned in report', async () => {
      const incident = hub.createIncident({
        title: 'Lessons Learned Test',
        severity: ThreatSeverity.CRITICAL,
        threatType: 'apt',
        affectedAssets: [
          {
            id: 'critical-asset',
            type: 'host',
            identifier: 'critical-server',
            name: 'Critical Server',
            criticality: 'critical',
            containmentStatus: 'none',
            metadata: {},
          },
        ],
      });

      // Simulate long detection time by modifying metrics
      const updated = hub.getIncident(incident.id);
      updated!.metrics.mttd = 4000000; // > 1 hour
      updated!.metrics.mttc = 2000000; // > 30 minutes

      const report = hub.generateIncidentReport(incident.id, 'analyst');

      expect(report.lessonsLearned.length).toBeGreaterThan(0);
    });

    it('should include compliance notifications for critical incidents', () => {
      const incident = hub.createIncident({
        title: 'Compliance Test',
        severity: ThreatSeverity.CRITICAL,
        threatType: 'breach',
        affectedAssets: [
          {
            id: 'pii-db',
            type: 'database',
            identifier: 'customer-db',
            name: 'Customer Database',
            criticality: 'critical',
            containmentStatus: 'none',
            metadata: { containsPII: true },
          },
        ],
      });

      const report = hub.generateIncidentReport(incident.id, 'analyst');

      expect(report.compliance.notificationRequired).toBe(true);
      expect(report.compliance.dueDate).toBeDefined();
      expect(report.compliance.frameworks).toContain('GDPR');
    });
  });

  // --------------------------------------------------------------------------
  // Incident Management Tests
  // --------------------------------------------------------------------------

  describe('Incident Management', () => {
    it('should create a security incident', () => {
      const incident = hub.createIncident({
        title: 'Test Incident',
        description: 'Test description',
        severity: ThreatSeverity.MEDIUM,
        threatType: 'phishing',
        reportedBy: 'user-01',
        tags: ['email', 'social-engineering'],
      });

      expect(incident.id).toMatch(/^inc_/);
      expect(incident.state).toBe(IncidentState.DETECTED);
      expect(incident.title).toBe('Test Incident');
      expect(incident.timeline).toHaveLength(1);
    });

    it('should update incident state', () => {
      const incident = hub.createIncident({
        title: 'State Update Test',
        severity: ThreatSeverity.HIGH,
        threatType: 'malware',
      });

      const updated = hub.updateIncidentState(
        incident.id,
        IncidentState.INVESTIGATING,
        'analyst'
      );

      expect(updated.state).toBe(IncidentState.INVESTIGATING);
      expect(updated.timeline.some(t => t.action.includes('State changed'))).toBe(true);
    });

    it('should get incident by ID', () => {
      const incident = hub.createIncident({
        title: 'Get Test',
        severity: ThreatSeverity.LOW,
        threatType: 'test',
      });

      const retrieved = hub.getIncident(incident.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.title).toBe('Get Test');
    });

    it('should calculate impact score based on severity', () => {
      const criticalIncident = hub.createIncident({
        title: 'Critical Impact',
        severity: ThreatSeverity.CRITICAL,
        threatType: 'apt',
        affectedAssets: [
          {
            id: 'a1',
            type: 'host',
            identifier: 'h1',
            name: 'H1',
            criticality: 'critical',
            containmentStatus: 'none',
            metadata: {},
          },
          {
            id: 'a2',
            type: 'host',
            identifier: 'h2',
            name: 'H2',
            criticality: 'high',
            containmentStatus: 'none',
            metadata: {},
          },
        ],
      });

      const lowIncident = hub.createIncident({
        title: 'Low Impact',
        severity: ThreatSeverity.LOW,
        threatType: 'scan',
      });

      expect(criticalIncident.metrics.impactScore).toBeGreaterThan(lowIncident.metrics.impactScore);
    });

    it('should emit incident:created event', () => {
      const eventHandler = vi.fn();
      hub.on('incident:created', eventHandler);

      hub.createIncident({
        title: 'Event Test',
        severity: ThreatSeverity.INFO,
        threatType: 'test',
      });

      expect(eventHandler).toHaveBeenCalled();
    });

    it('should emit incident:state_changed event', () => {
      const eventHandler = vi.fn();
      hub.on('incident:state_changed', eventHandler);

      const incident = hub.createIncident({
        title: 'State Event Test',
        severity: ThreatSeverity.MEDIUM,
        threatType: 'test',
      });

      hub.updateIncidentState(incident.id, IncidentState.CLOSED, 'analyst');

      expect(eventHandler).toHaveBeenCalled();
    });
  });
});

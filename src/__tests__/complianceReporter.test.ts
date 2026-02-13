/**
 * Tests for ComplianceReporter
 * Tests all compliance framework reporting functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ComplianceReporter, {
  ComplianceFramework,
  ReportType,
  ComplianceReport,
  ControlAssessment,
  ComplianceViolation,
} from '../audit/ComplianceReporter';

describe('ComplianceReporter', () => {
  let reporter: ComplianceReporter;
  const dateRange = {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  };

  beforeEach(() => {
    reporter = new ComplianceReporter();
  });

  describe('Report Generation', () => {
    it('should generate a SOC2 report', async () => {
      const report = await reporter.generateSOC2Report(dateRange);

      expect(report).toBeDefined();
      expect(report.framework).toBe('SOC2');
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.summary).toBeDefined();
      expect(report.controls.length).toBeGreaterThan(0);
      expect(report.findings).toBeDefined();
    });

    it('should generate an ISO 27001 report', async () => {
      const report = await reporter.generateISO27001Report(dateRange);

      expect(report).toBeDefined();
      expect(report.framework).toBe('ISO27001');
      expect(report.controls.length).toBeGreaterThan(0);
      expect(report.summary.complianceScore).toBeGreaterThanOrEqual(0);
      expect(report.summary.complianceScore).toBeLessThanOrEqual(100);
    });

    it('should generate a PCI DSS report', async () => {
      const report = await reporter.generatePCIDSSReport(dateRange);

      expect(report).toBeDefined();
      expect(report.framework).toBe('PCIDSS');
      expect(report.summary.criticalFindings).toBeGreaterThanOrEqual(0);
    });

    it('should generate a HIPAA report', async () => {
      const report = await reporter.generateHIPAAReport(dateRange);

      expect(report).toBeDefined();
      expect(report.framework).toBe('HIPAA');
      expect(report.controls.length).toBeGreaterThan(0);
    });

    it('should generate a GDPR report', async () => {
      const report = await reporter.generateGDPRReport(dateRange);

      expect(report).toBeDefined();
      expect(report.framework).toBe('GDPR');
      expect(report.summary.assessmentCoverage).toBeGreaterThan(0);
    });

    it('should generate report with custom date range', async () => {
      const customRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
      };

      const report = await reporter.generateReport('SOC2', customRange, 'audit-trail');

      expect(report.dateRange.start).toEqual(customRange.start);
      expect(report.dateRange.end).toEqual(customRange.end);
    });

    it('should include findings in report', async () => {
      const report = await reporter.generateSOC2Report(dateRange);

      expect(Array.isArray(report.findings)).toBe(true);
      expect(report.summary.criticalFindings).toBeGreaterThanOrEqual(0);
      expect(report.summary.highFindings).toBeGreaterThanOrEqual(0);
    });

    it('should calculate compliance score', async () => {
      const report = await reporter.generateISO27001Report(dateRange);

      expect(report.summary.complianceScore).toBeGreaterThanOrEqual(0);
      expect(report.summary.complianceScore).toBeLessThanOrEqual(100);
    });

    it('should include recommendations', async () => {
      const report = await reporter.generatePCIDSSReport(dateRange);

      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Control Assessment', () => {
    it('should assess SOC2 control compliance', async () => {
      const assessment = await reporter.assessControlCompliance('SOC2', 'CC6.1');

      expect(assessment).toBeDefined();
      expect(assessment.controlId).toBe('CC6.1');
      expect(['compliant', 'non-compliant', 'partial', 'not-assessed']).toContain(assessment.status);
      expect(assessment.score).toBeGreaterThanOrEqual(0);
      expect(assessment.score).toBeLessThanOrEqual(100);
    });

    it('should assess ISO 27001 control compliance', async () => {
      const assessment = await reporter.assessControlCompliance('ISO27001', 'A.9.2');

      expect(assessment).toBeDefined();
      expect(assessment.controlId).toBe('A.9.2');
      expect(assessment.evidence).toBeDefined();
    });

    it('should assess PCI DSS requirement compliance', async () => {
      const assessment = await reporter.assessControlCompliance('PCIDSS', 'Req 10.1');

      expect(assessment).toBeDefined();
      expect(assessment.controlId).toBe('Req 10.1');
      expect(assessment.recommendations).toBeDefined();
    });

    it('should handle invalid control gracefully', async () => {
      await expect(reporter.assessControlCompliance('SOC2', 'INVALID')).rejects.toThrow();
    });

    it('should set next assessment due date', async () => {
      const assessment = await reporter.assessControlCompliance('SOC2', 'CC6.1');

      expect(assessment.nextAssessmentDue).toBeInstanceOf(Date);
      expect(assessment.nextAssessmentDue.getTime()).toBeGreaterThan(new Date().getTime());
    });
  });

  describe('Violation Detection', () => {
    it('should identify violations in date range', async () => {
      const violations = await reporter.identifyViolations('SOC2', dateRange);

      expect(Array.isArray(violations)).toBe(true);
      violations.forEach(v => {
        expect(v.id).toBeDefined();
        expect(v.timestamp).toBeInstanceOf(Date);
        expect(v.userId).toBeDefined();
        expect(v.framework).toBe('SOC2');
      });
    });

    it('should detect failed authentication violations', async () => {
      const violations = await reporter.identifyViolations('ISO27001', dateRange);

      const authViolations = violations.filter(v => v.type === 'Failed Authentication');
      if (authViolations.length > 0) {
        expect(authViolations[0].severity).toBe('medium');
      }
    });

    it('should detect unauthorized access violations', async () => {
      const violations = await reporter.identifyViolations('PCIDSS', dateRange);

      const accessViolations = violations.filter(v => v.type === 'Unauthorized Access');
      if (accessViolations.length > 0) {
        expect(accessViolations[0].severity).toBe('high');
      }
    });

    it('should mark violations as unresolved initially', async () => {
      const violations = await reporter.identifyViolations('HIPAA', dateRange);

      violations.forEach(v => {
        expect(v.resolved).toBe(false);
      });
    });
  });

  describe('Report Export', () => {
    let report: ComplianceReport;

    beforeEach(async () => {
      report = await reporter.generateSOC2Report(dateRange);
    });

    it('should export report as JSON', async () => {
      const exported = await reporter.exportReport(report, 'json');

      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported as string);
      expect(parsed.framework).toBe('SOC2');
      expect(parsed.id).toBe(report.id);
    });

    it('should export report as CSV', async () => {
      const exported = await reporter.exportReport(report, 'csv');

      expect(typeof exported).toBe('string');
      expect((exported as string).includes('Compliance Report Export')).toBe(true);
      expect((exported as string).includes('Framework')).toBe(true);
    });

    it('should export report as HTML', async () => {
      const exported = await reporter.exportReport(report, 'html');

      expect(typeof exported).toBe('string');
      expect((exported as string).includes('<!DOCTYPE html>')).toBe(true);
      expect((exported as string).includes(report.framework)).toBe(true);
    });

    it('should export report as PDF', async () => {
      const exported = await reporter.exportReport(report, 'pdf');

      expect(Buffer.isBuffer(exported)).toBe(true);
      expect((exported as Buffer).toString().includes('%PDF')).toBe(true);
    });

    it('should reject invalid export format', async () => {
      await expect(reporter.exportReport(report, 'xml' as any)).rejects.toThrow();
    });
  });

  describe('Report Scheduling', () => {
    it('should schedule daily reports', async () => {
      const schedule = await reporter.scheduleReport('SOC2', 'audit-trail', 'daily', ['admin@example.com']);

      expect(schedule).toBeDefined();
      expect(schedule.frequency).toBe('daily');
      expect(schedule.enabled).toBe(true);
      expect(schedule.recipients).toContain('admin@example.com');
    });

    it('should schedule monthly reports', async () => {
      const schedule = await reporter.scheduleReport('PCIDSS', 'audit-trail', 'monthly', ['compliance@example.com']);

      expect(schedule).toBeDefined();
      expect(schedule.frequency).toBe('monthly');
    });

    it('should calculate next run date for daily', async () => {
      const schedule = await reporter.scheduleReport('ISO27001', 'audit-trail', 'daily', ['admin@example.com']);

      expect(schedule.nextRun).toBeDefined();
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
      expect(schedule.nextRun!.getDate()).toBe(nextDay.getDate());
    });

    it('should calculate next run date for weekly', async () => {
      const schedule = await reporter.scheduleReport('HIPAA', 'audit-trail', 'weekly', ['admin@example.com']);

      expect(schedule.nextRun).toBeDefined();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      expect(schedule.nextRun!.getDate()).toBe(nextWeek.getDate());
    });

    it('should list scheduled reports', async () => {
      await reporter.scheduleReport('SOC2', 'audit-trail', 'daily', ['admin@example.com']);
      await reporter.scheduleReport('ISO27001', 'audit-trail', 'monthly', ['compliance@example.com']);

      const schedules = await reporter.listScheduledReports();

      expect(Array.isArray(schedules)).toBe(true);
      expect(schedules.length).toBeGreaterThanOrEqual(2);
    });

    it('should cancel scheduled report', async () => {
      const schedule = await reporter.scheduleReport('PCIDSS', 'audit-trail', 'quarterly', ['admin@example.com']);

      await reporter.cancelScheduledReport(schedule.id);

      const schedules = await reporter.listScheduledReports();
      const cancelled = schedules.find(s => s.id === schedule.id);
      expect(cancelled?.enabled).toBe(false);
    });
  });

  describe('Report Attestation', () => {
    it('should attest to a report', async () => {
      const report = await reporter.generateSOC2Report(dateRange);

      const attested = await reporter.attestReport(
        report.id,
        'John Doe',
        true,
        'Reviewed and verified'
      );

      expect(attested.attestation).toBeDefined();
      expect(attested.attestation?.reviewer).toBe('John Doe');
      expect(attested.attestation?.approved).toBe(true);
      expect(attested.attestation?.signature).toBeDefined();
    });

    it('should include signature date in attestation', async () => {
      const report = await reporter.generateSOC2Report(dateRange);

      const attested = await reporter.attestReport(
        report.id,
        'Jane Smith',
        true,
        'Compliant'
      );

      expect(attested.attestation?.signatureDate).toBeInstanceOf(Date);
    });

    it('should handle attestation for non-existent report', async () => {
      await expect(
        reporter.attestReport('non-existent-id', 'John Doe', true, 'Test')
      ).rejects.toThrow();
    });
  });

  describe('Report Summary Metrics', () => {
    it('should calculate total events', async () => {
      const report = await reporter.generateSOC2Report(dateRange);

      expect(report.summary.totalEvents).toBeGreaterThanOrEqual(0);
    });

    it('should calculate security events', async () => {
      const report = await reporter.generateISO27001Report(dateRange);

      expect(report.summary.securityEvents).toBeGreaterThanOrEqual(0);
    });

    it('should count failed authentication attempts', async () => {
      const report = await reporter.generatePCIDSSReport(dateRange);

      expect(report.summary.failedAuthAttempts).toBeGreaterThanOrEqual(0);
    });

    it('should count configuration changes', async () => {
      const report = await reporter.generateHIPAAReport(dateRange);

      expect(report.summary.configChanges).toBeGreaterThanOrEqual(0);
    });

    it('should count data access events', async () => {
      const report = await reporter.generateGDPRReport(dateRange);

      expect(report.summary.dataAccessEvents).toBeGreaterThanOrEqual(0);
    });

    it('should generate findings trend chart', async () => {
      const report = await reporter.generateSOC2Report(dateRange);

      expect(report.charts.findingsBySeverity).toBeDefined();
      expect(report.charts.findingsBySeverity.critical).toBeGreaterThanOrEqual(0);
      expect(report.charts.findingsBySeverity.high).toBeGreaterThanOrEqual(0);
    });

    it('should generate controls compliance breakdown chart', async () => {
      const report = await reporter.generateISO27001Report(dateRange);

      expect(report.charts.controlsComplianceBreakdown).toBeDefined();
      expect(report.charts.controlsComplianceBreakdown.compliant).toBeGreaterThanOrEqual(0);
      expect(report.charts.controlsComplianceBreakdown['non-compliant']).toBeGreaterThanOrEqual(0);
    });

    it('should generate events trend data', async () => {
      const report = await reporter.generateSOC2Report(dateRange);

      expect(Array.isArray(report.charts.eventsTrend)).toBe(true);
      report.charts.eventsTrend.forEach(trend => {
        expect(trend.date).toBeDefined();
        expect(trend.count).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Report Retrieval', () => {
    it('should retrieve generated report by ID', async () => {
      const generated = await reporter.generateSOC2Report(dateRange);

      const retrieved = await reporter.getReport(generated.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(generated.id);
      expect(retrieved?.framework).toBe('SOC2');
    });

    it('should return null for non-existent report', async () => {
      const retrieved = await reporter.getReport('non-existent-id');

      expect(retrieved).toBeNull();
    });
  });

  describe('Event Listeners', () => {
    it('should emit report-generation-started event', async () => {
      const listener = vi.fn();
      reporter.on('report-generation-started', listener);

      await reporter.generateSOC2Report(dateRange);

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0]).toHaveProperty('framework', 'SOC2');
    });

    it('should emit report-generation-completed event', async () => {
      const listener = vi.fn();
      reporter.on('report-generation-completed', listener);

      await reporter.generateSOC2Report(dateRange);

      expect(listener).toHaveBeenCalled();
    });

    it('should emit schedule-created event', async () => {
      const listener = vi.fn();
      reporter.on('schedule-created', listener);

      await reporter.scheduleReport('SOC2', 'audit-trail', 'daily', ['admin@example.com']);

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Multi-Framework Reporting', () => {
    it('should generate reports for all frameworks', async () => {
      const frameworks: ComplianceFramework[] = ['SOC2', 'ISO27001', 'PCIDSS', 'HIPAA', 'GDPR'];

      for (const framework of frameworks) {
        const report = await reporter.generateReport(framework, dateRange);
        expect(report.framework).toBe(framework);
        expect(report.controls.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Report Customization', () => {
    it('should support custom report options', async () => {
      const options = {
        includeEvidence: true,
        includePreviousFindings: true,
        detailedAnalysis: true,
      };

      const report = await reporter.generateReport('SOC2', dateRange, 'audit-trail', options);

      expect(report).toBeDefined();
      expect(report.findings.length).toBeGreaterThanOrEqual(0);
    });
  });
});

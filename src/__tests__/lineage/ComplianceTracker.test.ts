/**
 * Compliance Tracker Tests
 * Tests for GDPR, HIPAA, and PCI-DSS compliance tracking
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComplianceTracker } from '../../lineage/ComplianceTracker';
import { DataLineageTracker } from '../../lineage/DataLineageTracker';
import {
  ComplianceFramework,
  DataSourceType,
  DataSensitivity
} from '../../types/lineage';

describe('ComplianceTracker', () => {
  let lineageTracker: DataLineageTracker;
  let complianceTracker: ComplianceTracker;

  beforeEach(() => {
    lineageTracker = new DataLineageTracker({ enabled: true, asyncMode: false });
    lineageTracker.startExecution('compliance-workflow', 'compliance-exec');

    complianceTracker = new ComplianceTracker(lineageTracker, {
      [ComplianceFramework.GDPR]: { enabled: true },
      [ComplianceFramework.HIPAA]: { enabled: true },
      [ComplianceFramework.PCI_DSS]: { enabled: true }
    });
  });

  afterEach(() => {
    lineageTracker.endExecution();
  });

  describe('GDPR Compliance', () => {
    it('should detect unencrypted PII', async () => {
      const source = lineageTracker.registerDataSource(
        'pii-node',
        DataSourceType.DATABASE,
        'User Data',
        'db://users',
        {
          sensitivity: DataSensitivity.PII,
          complianceFrameworks: [ComplianceFramework.GDPR]
        }
      );

      lineageTracker.trackNode('pii-node', source, {
        nodeName: 'User Data',
        nodeType: 'database'
      });

      const audit = await complianceTracker.performAudit(ComplianceFramework.GDPR);

      expect(audit.framework).toBe(ComplianceFramework.GDPR);
      expect(audit.findings.violations.length).toBeGreaterThan(0);

      const encryptionViolation = audit.findings.violations.find(
        v => v.rule.includes('Security of Processing')
      );

      expect(encryptionViolation).toBeDefined();
      expect(encryptionViolation?.severity).toBe('critical');
    });

    it('should handle GDPR data subject requests', async () => {
      const request = await complianceTracker.handleGDPRRequest({
        requestType: 'access',
        subject: {
          id: 'user-123',
          email: 'user@example.com',
          identifiers: { userId: 'user-123' }
        },
        scope: {
          dataCategories: ['personal', 'contact']
        }
      });

      expect(request).toBeDefined();
      expect(request.id).toBeDefined();
      expect(request.requestType).toBe('access');
      expect(request.deadline).toBeDefined();

      // GDPR requires response within 30 days
      const deadline = new Date(request.deadline);
      const now = new Date();
      const daysDiff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      expect(daysDiff).toBeLessThanOrEqual(30);
      expect(daysDiff).toBeGreaterThan(0);
    });

    it('should support all GDPR request types', async () => {
      const requestTypes = [
        'access',
        'rectification',
        'erasure',
        'portability',
        'restriction',
        'objection'
      ] as const;

      for (const requestType of requestTypes) {
        const request = await complianceTracker.handleGDPRRequest({
          requestType,
          subject: {
            id: `user-${requestType}`,
            identifiers: { userId: `user-${requestType}` }
          },
          scope: {}
        });

        expect(request.requestType).toBe(requestType);
        expect(request.status).toMatch(/^(pending|in-progress|completed)$/);
      }
    });
  });

  describe('HIPAA Compliance', () => {
    it('should detect unencrypted PHI', async () => {
      const source = lineageTracker.registerDataSource(
        'phi-node',
        DataSourceType.DATABASE,
        'Patient Records',
        'db://patients',
        {
          sensitivity: DataSensitivity.PHI,
          complianceFrameworks: [ComplianceFramework.HIPAA]
        }
      );

      lineageTracker.trackNode('phi-node', source, {
        nodeName: 'Patient Records',
        nodeType: 'database'
      });

      const audit = await complianceTracker.performAudit(ComplianceFramework.HIPAA);

      expect(audit.framework).toBe(ComplianceFramework.HIPAA);

      const encryptionViolation = audit.findings.violations.find(
        v => v.rule.includes('Encryption and Decryption')
      );

      expect(encryptionViolation).toBeDefined();
      expect(encryptionViolation?.severity).toBe('critical');
    });

    it('should detect missing audit trails for PHI', async () => {
      const source = lineageTracker.registerDataSource(
        'phi-node',
        DataSourceType.API,
        'Patient API',
        'api://patients',
        {
          sensitivity: DataSensitivity.PHI,
          complianceFrameworks: [ComplianceFramework.HIPAA]
        }
      );

      lineageTracker.trackNode('phi-node', source);

      const audit = await complianceTracker.performAudit(ComplianceFramework.HIPAA);

      const auditTrailViolation = audit.findings.violations.find(
        v => v.rule.includes('Audit Controls')
      );

      expect(auditTrailViolation).toBeDefined();
    });

    it('should register PHI records', () => {
      const phiRecord = complianceTracker.registerPHI({
        phiElements: [
          { type: 'Name', field: 'patientName', encrypted: true, masked: false },
          { type: 'SSN', field: 'ssn', encrypted: true, masked: true },
          { type: 'MedicalRecordNumber', field: 'mrn', encrypted: false, masked: false }
        ],
        accessControl: {
          minimumRole: 'healthcare_provider',
          authorizedUsers: ['doctor-1', 'nurse-1'],
          auditRequired: true
        },
        breachNotification: {
          enabled: true,
          recipients: ['security@example.com'],
          threshold: 500
        }
      });

      expect(phiRecord).toBeDefined();
      expect(phiRecord.id).toBeDefined();
      expect(phiRecord.phiElements.length).toBe(3);
      expect(phiRecord.accessControl.auditRequired).toBe(true);
    });
  });

  describe('PCI-DSS Compliance', () => {
    it('should detect unencrypted cardholder data', async () => {
      const source = lineageTracker.registerDataSource(
        'payment-node',
        DataSourceType.API,
        'Payment Gateway',
        'api://payments',
        {
          sensitivity: DataSensitivity.PCI,
          complianceFrameworks: [ComplianceFramework.PCI_DSS]
        }
      );

      lineageTracker.trackNode('payment-node', source);

      const audit = await complianceTracker.performAudit(ComplianceFramework.PCI_DSS);

      const encryptionViolation = audit.findings.violations.find(
        v => v.rule.includes('Protect Stored Cardholder Data')
      );

      expect(encryptionViolation).toBeDefined();
      expect(encryptionViolation?.severity).toBe('critical');
    });

    it('should register cardholder data', () => {
      const pciRecord = complianceTracker.registerCardholderData({
        dataElements: [
          { type: 'PAN', field: 'cardNumber', encrypted: true, tokenized: true, truncated: false },
          { type: 'CVV', field: 'cvv', encrypted: true, tokenized: false, truncated: false }
        ],
        storage: {
          encrypted: true,
          encryptionMethod: 'AES-256',
          keyManagement: 'HSM',
          retentionDays: 90
        },
        transmission: {
          tlsRequired: true,
          tlsVersion: '1.3',
          certificateValidation: true
        }
      });

      expect(pciRecord).toBeDefined();
      expect(pciRecord.id).toBeDefined();
      expect(pciRecord.dataElements.length).toBe(2);
      expect(pciRecord.storage.encrypted).toBe(true);
      expect(pciRecord.transmission.tlsRequired).toBe(true);
    });
  });

  describe('Compliance Status', () => {
    it('should provide compliance status summary', async () => {
      // Create some violations
      const source = lineageTracker.registerDataSource(
        'test-node',
        DataSourceType.API,
        'Test',
        'api://test',
        {
          sensitivity: DataSensitivity.PII,
          complianceFrameworks: [ComplianceFramework.GDPR]
        }
      );

      lineageTracker.trackNode('test-node', source);

      await complianceTracker.performAudit(ComplianceFramework.GDPR);

      const status = complianceTracker.getComplianceStatus();

      expect(status).toBeDefined();
      expect(Array.isArray(status.frameworks)).toBe(true);
      expect(typeof status.totalViolations).toBe('number');
      expect(typeof status.criticalViolations).toBe('number');

      status.frameworks.forEach(framework => {
        expect(framework).toHaveProperty('framework');
        expect(framework).toHaveProperty('enabled');
        expect(framework).toHaveProperty('compliant');
        expect(framework).toHaveProperty('openViolations');
      });
    });

    it('should track compliance over time', async () => {
      const source = lineageTracker.registerDataSource(
        'test-node',
        DataSourceType.API,
        'Test',
        'url'
      );

      lineageTracker.trackNode('test-node', source);

      const audit1 = await complianceTracker.performAudit(ComplianceFramework.GDPR);
      const audit2 = await complianceTracker.performAudit(ComplianceFramework.GDPR);

      const history = complianceTracker.getAuditHistory(ComplianceFramework.GDPR);

      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history).toContain(audit1);
      expect(history).toContain(audit2);
    });
  });

  describe('Violation Management', () => {
    it('should get violations by framework', async () => {
      const source = lineageTracker.registerDataSource(
        'test-node',
        DataSourceType.API,
        'Test',
        'url',
        {
          sensitivity: DataSensitivity.PII,
          complianceFrameworks: [ComplianceFramework.GDPR]
        }
      );

      lineageTracker.trackNode('test-node', source);

      await complianceTracker.performAudit(ComplianceFramework.GDPR);

      const violations = complianceTracker.getViolations(ComplianceFramework.GDPR);

      expect(Array.isArray(violations)).toBe(true);
      violations.forEach(v => {
        expect(v.framework).toBe(ComplianceFramework.GDPR);
      });
    });

    it('should filter violations by status', async () => {
      const source = lineageTracker.registerDataSource(
        'test-node',
        DataSourceType.API,
        'Test',
        'url',
        { sensitivity: DataSensitivity.PII }
      );

      lineageTracker.trackNode('test-node', source);

      await complianceTracker.performAudit(ComplianceFramework.GDPR);

      const openViolations = complianceTracker.getViolations(undefined, 'open');
      const resolvedViolations = complianceTracker.getViolations(undefined, 'resolved');

      expect(Array.isArray(openViolations)).toBe(true);
      expect(Array.isArray(resolvedViolations)).toBe(true);

      openViolations.forEach(v => {
        expect(v.status).toBe('open');
      });
    });

    it('should resolve violations', async () => {
      const source = lineageTracker.registerDataSource(
        'test-node',
        DataSourceType.API,
        'Test',
        'url',
        { sensitivity: DataSensitivity.PII }
      );

      lineageTracker.trackNode('test-node', source);

      await complianceTracker.performAudit(ComplianceFramework.GDPR);

      const violations = complianceTracker.getViolations(undefined, 'open');

      if (violations.length > 0) {
        const violationId = violations[0].id;

        complianceTracker.resolveViolation(violationId, 'Encryption enabled');

        const updatedViolations = complianceTracker.getViolations(undefined, 'resolved');
        const resolvedViolation = updatedViolations.find(v => v.id === violationId);

        expect(resolvedViolation?.status).toBe('resolved');
      }
    });
  });

  describe('Multi-Framework Compliance', () => {
    it('should handle multiple compliance frameworks', async () => {
      const source = lineageTracker.registerDataSource(
        'multi-node',
        DataSourceType.DATABASE,
        'Multi Framework Data',
        'db://multi',
        {
          sensitivity: DataSensitivity.PII,
          complianceFrameworks: [
            ComplianceFramework.GDPR,
            ComplianceFramework.HIPAA,
            ComplianceFramework.PCI_DSS
          ]
        }
      );

      lineageTracker.trackNode('multi-node', source);

      const gdprAudit = await complianceTracker.performAudit(ComplianceFramework.GDPR);
      const hipaaAudit = await complianceTracker.performAudit(ComplianceFramework.HIPAA);
      const pciAudit = await complianceTracker.performAudit(ComplianceFramework.PCI_DSS);

      expect(gdprAudit.framework).toBe(ComplianceFramework.GDPR);
      expect(hipaaAudit.framework).toBe(ComplianceFramework.HIPAA);
      expect(pciAudit.framework).toBe(ComplianceFramework.PCI_DSS);

      const status = complianceTracker.getComplianceStatus();
      const enabledFrameworks = status.frameworks.filter(f => f.enabled);

      expect(enabledFrameworks.length).toBeGreaterThanOrEqual(3);
    });
  });
});

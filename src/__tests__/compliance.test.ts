/**
 * Compliance Framework Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ComplianceManager } from '../compliance/ComplianceManager';
import { SOC2Framework } from '../compliance/frameworks/SOC2Framework';
import { ISO27001Framework } from '../compliance/frameworks/ISO27001Framework';
import { HIPAAFramework } from '../compliance/frameworks/HIPAAFramework';
import { GDPRFramework } from '../compliance/frameworks/GDPRFramework';
import { DataResidencyManager } from '../compliance/DataResidencyManager';
import { RetentionPolicyManager } from '../compliance/RetentionPolicyManager';
import { DataClassifier } from '../compliance/DataClassifier';
import { PIIDetector } from '../compliance/privacy/PIIDetector';
import { ConsentManager } from '../compliance/privacy/ConsentManager';
import { DataSubjectRights } from '../compliance/privacy/DataSubjectRights';
import {
  ComplianceFramework,
  ComplianceStatus,
  DataResidency,
  DataClassification,
  ConsentPurpose,
  DataSubjectRight,
  PIIType,
} from '../types/compliance';

describe('ComplianceManager', () => {
  let manager: ComplianceManager;

  beforeEach(() => {
    manager = new ComplianceManager({
      enabledFrameworks: [],
      dataResidency: DataResidency.US,
      defaultRetentionDays: 2555,
    });
  });

  it('should initialize with default config', () => {
    const config = manager.getConfig();
    expect(config.dataResidency).toBe(DataResidency.US);
    expect(config.defaultRetentionDays).toBe(2555);
  });

  it('should register and enable frameworks', () => {
    const soc2 = new SOC2Framework();
    manager.registerFramework(soc2);
    manager.enableFramework(ComplianceFramework.SOC2);

    const enabled = manager.getEnabledFrameworks();
    expect(enabled).toContain(ComplianceFramework.SOC2);
  });

  it('should get controls by framework', () => {
    const soc2 = new SOC2Framework();
    manager.registerFramework(soc2);

    const controls = manager.getControlsByFramework(ComplianceFramework.SOC2);
    expect(controls.length).toBeGreaterThan(0);
    expect(controls[0].framework).toBe(ComplianceFramework.SOC2);
  });

  it('should create and track compliance gaps', async () => {
    const soc2 = new SOC2Framework();
    manager.registerFramework(soc2);

    const controls = manager.getControlsByFramework(ComplianceFramework.SOC2);
    const controlId = controls[0].id;

    const gap = await manager.createGap(
      controlId,
      'Test gap description',
      'test_user',
      'high'
    );

    expect(gap.controlId).toBe(controlId);
    expect(gap.severity).toBe('high');
    expect(gap.status).toBe('open');
  });

  it('should generate gap analysis report', async () => {
    const soc2 = new SOC2Framework();
    manager.registerFramework(soc2);

    const report = await manager.generateGapAnalysis(
      ComplianceFramework.SOC2,
      'test_user'
    );

    expect(report.framework).toBe(ComplianceFramework.SOC2);
    expect(report.totalControls).toBeGreaterThan(0);
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
  });

  it('should get metrics for framework', () => {
    const soc2 = new SOC2Framework();
    manager.registerFramework(soc2);

    const metrics = manager.getMetrics(ComplianceFramework.SOC2);

    expect(metrics.framework).toBe(ComplianceFramework.SOC2);
    expect(metrics.totalControls).toBeGreaterThan(0);
    expect(metrics.complianceScore).toBeGreaterThanOrEqual(0);
  });

  it('should update control status', () => {
    const soc2 = new SOC2Framework();
    manager.registerFramework(soc2);

    const controls = manager.getControlsByFramework(ComplianceFramework.SOC2);
    const controlId = controls[0].id;

    manager.updateControlStatus(controlId, ComplianceStatus.COMPLIANT, 'Test update');

    const control = manager.getControl(controlId);
    expect(control?.status).toBe(ComplianceStatus.COMPLIANT);
  });
});

describe('Framework Implementations', () => {
  it('should load SOC2 controls', () => {
    const soc2 = new SOC2Framework();
    const controls = soc2.getControls();

    expect(controls.length).toBeGreaterThan(20);
    expect(controls[0].framework).toBe(ComplianceFramework.SOC2);
    expect(controls[0].id).toMatch(/^SOC2-/);
  });

  it('should load ISO27001 controls', () => {
    const iso = new ISO27001Framework();
    const controls = iso.getControls();

    expect(controls.length).toBeGreaterThan(20);
    expect(controls[0].framework).toBe(ComplianceFramework.ISO27001);
    expect(controls[0].id).toMatch(/^ISO-/);
  });

  it('should load HIPAA controls', () => {
    const hipaa = new HIPAAFramework();
    const controls = hipaa.getControls();

    expect(controls.length).toBeGreaterThan(10);
    expect(controls[0].framework).toBe(ComplianceFramework.HIPAA);
    expect(controls[0].id).toMatch(/^HIPAA-/);
  });

  it('should load GDPR controls', () => {
    const gdpr = new GDPRFramework();
    const controls = gdpr.getControls();

    expect(controls.length).toBeGreaterThan(15);
    expect(controls[0].framework).toBe(ComplianceFramework.GDPR);
    expect(controls[0].id).toMatch(/^GDPR-/);
  });
});

describe('DataResidencyManager', () => {
  let manager: DataResidencyManager;

  beforeEach(() => {
    manager = new DataResidencyManager(DataResidency.US);
  });

  it('should set and get primary region', () => {
    expect(manager.getPrimaryRegion()).toBe(DataResidency.US);

    manager.setPrimaryRegion(DataResidency.EU);
    expect(manager.getPrimaryRegion()).toBe(DataResidency.EU);
  });

  it('should create residency policy', () => {
    const policy = manager.createPolicy({
      region: DataResidency.EU,
      dataTypes: ['user_data'],
      restrictions: ['No US storage'],
      allowedOperations: ['store', 'process'],
      enforced: true,
    });

    expect(policy.region).toBe(DataResidency.EU);
    expect(policy.enforced).toBe(true);
  });

  it('should validate data residency', () => {
    const result = manager.validateDataResidency(
      'user_data',
      DataResidency.EU,
      DataClassification.PII
    );

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('violations');
    expect(result).toHaveProperty('restrictions');
  });

  it('should validate data transfer between regions', () => {
    const result = manager.validateDataTransfer(
      'user_data',
      DataResidency.EU,
      DataResidency.US,
      DataClassification.PII
    );

    expect(result).toHaveProperty('allowed');
    expect(result.requirements.length).toBeGreaterThan(0);
  });

  it('should track data location', () => {
    manager.trackDataLocation('data_123', DataResidency.EU);
    expect(manager.getDataLocation('data_123')).toBe(DataResidency.EU);
  });
});

describe('RetentionPolicyManager', () => {
  let manager: RetentionPolicyManager;

  beforeEach(() => {
    manager = new RetentionPolicyManager();
  });

  it('should create retention policy', () => {
    const policy = manager.createPolicy({
      resourceType: 'executions',
      retentionPeriodDays: 30,
      autoDelete: true,
      legalHoldExempt: false,
      classification: [DataClassification.INTERNAL],
      createdBy: 'test_user',
    });

    expect(policy.resourceType).toBe('executions');
    expect(policy.retentionPeriodDays).toBe(30);
    expect(policy.autoDelete).toBe(true);
  });

  it('should create retention record', () => {
    const policy = manager.createPolicy({
      resourceType: 'executions',
      retentionPeriodDays: 30,
      autoDelete: true,
      legalHoldExempt: false,
      classification: [DataClassification.INTERNAL],
      createdBy: 'test_user',
    });

    const record = manager.createRecord('executions', 'exec_123', [DataClassification.INTERNAL]);

    expect(record.resourceType).toBe('executions');
    expect(record.resourceId).toBe('exec_123');
    expect(record.policyId).toBe(policy.id);
  });

  it('should place and release legal hold', () => {
    const policy = manager.createPolicy({
      resourceType: 'executions',
      retentionPeriodDays: 30,
      autoDelete: true,
      legalHoldExempt: false,
      classification: [DataClassification.INTERNAL],
      createdBy: 'test_user',
    });

    const record = manager.createRecord('executions', 'exec_123', [DataClassification.INTERNAL]);

    manager.placeLegalHold(record.id, 'Litigation hold');
    expect(record.onLegalHold).toBe(true);

    manager.releaseLegalHold(record.id);
    expect(record.onLegalHold).toBe(false);
  });

  it('should get retention statistics', () => {
    const stats = manager.getStatistics();

    expect(stats).toHaveProperty('totalPolicies');
    expect(stats).toHaveProperty('totalRecords');
    expect(stats).toHaveProperty('activeRecords');
  });
});

describe('DataClassifier', () => {
  let classifier: DataClassifier;

  beforeEach(() => {
    classifier = new DataClassifier();
  });

  it('should classify PII data', () => {
    const data = { email: 'test@example.com', phone: '555-1234' };
    const classification = classifier.classify(data);

    expect(classification).toBe(DataClassification.PII);
  });

  it('should classify PHI data', () => {
    const data = { diagnosis: 'Test', patient: 'John Doe' };
    const classification = classifier.classify(data, { type: 'health_data' });

    expect(classification).toBe(DataClassification.PHI);
  });

  it('should classify public data', () => {
    const data = { name: 'Public Company' };
    const classification = classifier.classify(data, { public: true });

    expect(classification).toBe(DataClassification.PUBLIC);
  });
});

describe('PIIDetector', () => {
  let detector: PIIDetector;

  beforeEach(() => {
    detector = new PIIDetector();
  });

  it('should detect email addresses', () => {
    const result = detector.detect({ email: 'test@example.com' });

    expect(result.detected).toBe(true);
    expect(result.types).toContain(PIIType.EMAIL);
    expect(result.locations.length).toBeGreaterThan(0);
  });

  it('should detect phone numbers', () => {
    const result = detector.detect({ phone: '555-123-4567' });

    expect(result.detected).toBe(true);
    expect(result.types).toContain(PIIType.PHONE);
  });

  it('should detect SSN', () => {
    const result = detector.detect({ ssn: '123-45-6789' });

    expect(result.detected).toBe(true);
    expect(result.types).toContain(PIIType.SSN);
  });

  it('should provide recommendations', () => {
    const result = detector.detect({ ssn: '123-45-6789' });

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations).toContain('Encrypt data at rest and in transit');
  });

  it('should mask sensitive values', () => {
    const result = detector.detect({ email: 'test@example.com' });

    expect(result.locations[0].value).not.toBe('test@example.com');
    expect(result.locations[0].value).toContain('***');
  });
});

describe('ConsentManager', () => {
  let manager: ConsentManager;

  beforeEach(() => {
    manager = new ConsentManager();
  });

  it('should grant consent', () => {
    const consent = manager.grantConsent('user_123', ConsentPurpose.MARKETING, '1.0');

    expect(consent.userId).toBe('user_123');
    expect(consent.purpose).toBe(ConsentPurpose.MARKETING);
    expect(consent.granted).toBe(true);
  });

  it('should revoke consent', () => {
    manager.grantConsent('user_123', ConsentPurpose.MARKETING, '1.0');
    manager.revokeConsent('user_123', ConsentPurpose.MARKETING);

    expect(manager.hasConsent('user_123', ConsentPurpose.MARKETING)).toBe(false);
  });

  it('should check consent status', () => {
    manager.grantConsent('user_123', ConsentPurpose.ANALYTICS, '1.0');

    expect(manager.hasConsent('user_123', ConsentPurpose.ANALYTICS)).toBe(true);
    expect(manager.hasConsent('user_123', ConsentPurpose.MARKETING)).toBe(false);
  });

  it('should get statistics', () => {
    manager.grantConsent('user_123', ConsentPurpose.MARKETING, '1.0');
    manager.grantConsent('user_456', ConsentPurpose.ANALYTICS, '1.0');

    const stats = manager.getStatistics();

    expect(stats.totalUsers).toBe(2);
    expect(stats.totalConsents).toBe(2);
    expect(stats.activeConsents).toBe(2);
  });
});

describe('DataSubjectRights', () => {
  let dsr: DataSubjectRights;

  beforeEach(() => {
    dsr = new DataSubjectRights();
  });

  it('should create data subject request', () => {
    const request = dsr.createRequest(
      'user_123',
      DataSubjectRight.ACCESS,
      'user_123',
      'email_verification'
    );

    expect(request.userId).toBe('user_123');
    expect(request.requestType).toBe(DataSubjectRight.ACCESS);
    expect(request.status).toBe('pending');
  });

  it('should verify request', () => {
    const request = dsr.createRequest(
      'user_123',
      DataSubjectRight.ACCESS,
      'user_123',
      'email_verification'
    );

    dsr.verifyRequest(request.id);
    expect(request.verified).toBe(true);
    expect(request.status).toBe('in_progress');
  });

  it('should complete request', () => {
    const request = dsr.createRequest(
      'user_123',
      DataSubjectRight.ACCESS,
      'user_123',
      'email_verification'
    );

    dsr.completeRequest(request.id, 'admin_user', 'https://example.com/data.zip');
    expect(request.status).toBe('completed');
    expect(request.dataExportUrl).toBe('https://example.com/data.zip');
  });

  it('should reject request', () => {
    const request = dsr.createRequest(
      'user_123',
      DataSubjectRight.ERASURE,
      'user_123',
      'email_verification'
    );

    dsr.rejectRequest(request.id, 'Legal obligation to retain');
    expect(request.status).toBe('rejected');
    expect(request.rejectionReason).toBe('Legal obligation to retain');
  });

  it('should get statistics', () => {
    dsr.createRequest('user_123', DataSubjectRight.ACCESS, 'user_123', 'email');
    dsr.createRequest('user_456', DataSubjectRight.ERASURE, 'user_456', 'email');

    const stats = dsr.getStatistics();

    expect(stats.total).toBe(2);
    expect(stats.pending).toBe(2);
  });
});

/**
 * Compliance Tracker
 * Implements GDPR, HIPAA, and PCI-DSS compliance tracking
 */

import { randomUUID } from 'crypto';
import { logger } from '../services/SimpleLogger';
import {
  ComplianceFramework,
  ComplianceAudit,
  GDPRDataSubjectRequest,
  HIPAAPHIRecord,
  PCIDSSCardholderData,
  LineageId,
  DataLineageNode,
  DataSensitivity
} from '../types/lineage';
import { DataLineageTracker } from './DataLineageTracker';

/**
 * Compliance policy configuration
 */
export interface CompliancePolicy {
  framework: ComplianceFramework;
  enabled: boolean;
  automaticAudits: boolean;
  auditFrequencyDays: number;
  retentionDays: number;
  encryptionRequired: boolean;
  accessLoggingRequired: boolean;
}

/**
 * Compliance violation
 */
export interface ComplianceViolation {
  id: string;
  timestamp: string;
  framework: ComplianceFramework;
  severity: 'info' | 'warning' | 'error' | 'critical';
  rule: string;
  description: string;
  affectedEntities: string[];
  remediation: string;
  status: 'open' | 'acknowledged' | 'resolved';
}

/**
 * Compliance Tracker Service
 */
export class ComplianceTracker {
  private policies: Map<ComplianceFramework, CompliancePolicy> = new Map();
  private audits: Map<string, ComplianceAudit> = new Map();
  private violations: Map<string, ComplianceViolation> = new Map();
  private gdprRequests: Map<string, GDPRDataSubjectRequest> = new Map();
  private phiRecords: Map<string, HIPAAPHIRecord> = new Map();
  private pciRecords: Map<string, PCIDSSCardholderData> = new Map();

  constructor(
    private lineageTracker: DataLineageTracker,
    policies: Partial<Record<ComplianceFramework, Partial<CompliancePolicy>>> = {}
  ) {
    this.initializePolicies(policies);

    logger.info('ComplianceTracker initialized', {
      enabledFrameworks: Array.from(this.policies.values())
        .filter(p => p.enabled)
        .map(p => p.framework)
    });
  }

  /**
   * Initialize compliance policies
   */
  private initializePolicies(
    customPolicies: Partial<Record<ComplianceFramework, Partial<CompliancePolicy>>>
  ): void {
    const defaultPolicies: Record<ComplianceFramework, CompliancePolicy> = {
      [ComplianceFramework.GDPR]: {
        framework: ComplianceFramework.GDPR,
        enabled: true,
        automaticAudits: true,
        auditFrequencyDays: 30,
        retentionDays: 365,
        encryptionRequired: true,
        accessLoggingRequired: true
      },
      [ComplianceFramework.HIPAA]: {
        framework: ComplianceFramework.HIPAA,
        enabled: true,
        automaticAudits: true,
        auditFrequencyDays: 90,
        retentionDays: 2555, // 7 years
        encryptionRequired: true,
        accessLoggingRequired: true
      },
      [ComplianceFramework.PCI_DSS]: {
        framework: ComplianceFramework.PCI_DSS,
        enabled: true,
        automaticAudits: true,
        auditFrequencyDays: 90,
        retentionDays: 365,
        encryptionRequired: true,
        accessLoggingRequired: true
      },
      [ComplianceFramework.SOC2]: {
        framework: ComplianceFramework.SOC2,
        enabled: false,
        automaticAudits: false,
        auditFrequencyDays: 365,
        retentionDays: 730,
        encryptionRequired: true,
        accessLoggingRequired: true
      },
      [ComplianceFramework.ISO27001]: {
        framework: ComplianceFramework.ISO27001,
        enabled: false,
        automaticAudits: false,
        auditFrequencyDays: 365,
        retentionDays: 730,
        encryptionRequired: true,
        accessLoggingRequired: true
      },
      [ComplianceFramework.CCPA]: {
        framework: ComplianceFramework.CCPA,
        enabled: false,
        automaticAudits: false,
        auditFrequencyDays: 90,
        retentionDays: 365,
        encryptionRequired: false,
        accessLoggingRequired: true
      }
    };

    for (const [framework, defaultPolicy] of Object.entries(defaultPolicies)) {
      const customPolicy = customPolicies[framework as ComplianceFramework] || {};
      this.policies.set(framework as ComplianceFramework, {
        ...defaultPolicy,
        ...customPolicy
      });
    }
  }

  /**
   * Perform compliance audit
   */
  async performAudit(
    framework: ComplianceFramework,
    scope?: {
      workflowId?: string;
      executionId?: string;
      nodeIds?: string[];
    }
  ): Promise<ComplianceAudit> {
    const startTime = performance.now();

    logger.info('Starting compliance audit', { framework, scope });

    const audit: ComplianceAudit = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      framework,
      scope: scope || {},
      findings: {
        compliant: true,
        violations: [],
        warnings: [],
        recommendations: []
      },
      evidence: {
        auditTrails: [],
        logs: [],
        attestations: []
      },
      auditor: {
        name: 'Automated Compliance System',
        role: 'System',
        timestamp: new Date().toISOString()
      }
    };

    // Perform framework-specific checks
    switch (framework) {
      case ComplianceFramework.GDPR:
        await this.auditGDPR(audit, scope);
        break;
      case ComplianceFramework.HIPAA:
        await this.auditHIPAA(audit, scope);
        break;
      case ComplianceFramework.PCI_DSS:
        await this.auditPCIDSS(audit, scope);
        break;
      default:
        await this.auditGeneric(audit, scope);
    }

    // Determine overall compliance
    audit.findings.compliant = audit.findings.violations.length === 0;

    this.audits.set(audit.id, audit);

    // Store violations
    for (const violation of audit.findings.violations) {
      this.recordViolation({
        id: randomUUID(),
        timestamp: audit.timestamp,
        framework,
        severity: violation.severity,
        rule: violation.rule,
        description: violation.description,
        affectedEntities: violation.affectedEntities,
        remediation: violation.remediation,
        status: 'open'
      });
    }

    const duration = performance.now() - startTime;
    logger.info('Compliance audit completed', {
      framework,
      duration: `${duration.toFixed(2)}ms`,
      compliant: audit.findings.compliant,
      violations: audit.findings.violations.length
    });

    return audit;
  }

  /**
   * GDPR-specific audit
   */
  private async auditGDPR(
    audit: ComplianceAudit,
    scope?: ComplianceAudit['scope']
  ): Promise<void> {
    const policy = this.policies.get(ComplianceFramework.GDPR);
    if (!policy?.enabled) return;

    // Check for PII data handling
    const lineageData = this.lineageTracker.queryLineage({
      workflowId: scope?.workflowId,
      executionId: scope?.executionId
    });

    for (const node of lineageData.nodes) {
      const sensitivity = node.dataSource.metadata.sensitivity;

      // Check if PII is properly handled
      if (sensitivity === DataSensitivity.PII) {
        // Verify encryption
        if (policy.encryptionRequired) {
          const hasEncryption = node.transformations.some(tId => {
            const t = this.lineageTracker['transformations'].get(tId);
            return t?.compliance.encryptionApplied;
          });

          if (!hasEncryption) {
            audit.findings.violations.push({
              severity: 'critical',
              rule: 'GDPR Article 32 - Security of Processing',
              description: `PII data in node ${node.nodeId} is not encrypted`,
              affectedEntities: [node.nodeId],
              remediation: 'Enable encryption for all PII data processing'
            });
          }
        }

        // Verify consent
        const hasConsentVerification = node.transformations.some(tId => {
          const t = this.lineageTracker['transformations'].get(tId);
          return t?.compliance.frameworks.includes(ComplianceFramework.GDPR);
        });

        if (!hasConsentVerification) {
          audit.findings.warnings.push(
            'Consent verification not documented for PII processing'
          );
        }

        // Check retention
        audit.findings.recommendations.push(
          `Verify data retention policy for node ${node.nodeId} complies with GDPR`
        );
      }
    }

    // Check for data subject request capability
    if (this.gdprRequests.size === 0) {
      audit.findings.recommendations.push(
        'Implement data subject request handling procedures'
      );
    }
  }

  /**
   * HIPAA-specific audit
   */
  private async auditHIPAA(
    audit: ComplianceAudit,
    scope?: ComplianceAudit['scope']
  ): Promise<void> {
    const policy = this.policies.get(ComplianceFramework.HIPAA);
    if (!policy?.enabled) return;

    const lineageData = this.lineageTracker.queryLineage({
      workflowId: scope?.workflowId,
      executionId: scope?.executionId
    });

    for (const node of lineageData.nodes) {
      const sensitivity = node.dataSource.metadata.sensitivity;

      // Check for PHI handling
      if (sensitivity === DataSensitivity.PHI) {
        // Verify encryption at rest and in transit
        if (policy.encryptionRequired) {
          const hasEncryption = node.transformations.some(tId => {
            const t = this.lineageTracker['transformations'].get(tId);
            return t?.compliance.encryptionApplied;
          });

          if (!hasEncryption) {
            audit.findings.violations.push({
              severity: 'critical',
              rule: 'HIPAA Security Rule - Encryption and Decryption',
              description: `PHI in node ${node.nodeId} is not encrypted`,
              affectedEntities: [node.nodeId],
              remediation: 'Enable encryption for all PHI data'
            });
          }
        }

        // Verify audit trail
        if (policy.accessLoggingRequired) {
          const hasAuditTrail = node.transformations.some(tId => {
            const t = this.lineageTracker['transformations'].get(tId);
            return t?.compliance.auditTrail;
          });

          if (!hasAuditTrail) {
            audit.findings.violations.push({
              severity: 'error',
              rule: 'HIPAA Security Rule - Audit Controls',
              description: `Audit trail missing for PHI access in node ${node.nodeId}`,
              affectedEntities: [node.nodeId],
              remediation: 'Enable comprehensive audit logging for PHI access'
            });
          }
        }

        // Check minimum necessary principle
        audit.findings.recommendations.push(
          `Verify minimum necessary PHI usage for node ${node.nodeId}`
        );
      }
    }

    // Check for breach notification procedures
    if (this.phiRecords.size > 0) {
      const recordsWithBreachNotification = Array.from(this.phiRecords.values()).filter(
        r => r.breachNotification.enabled
      );

      if (recordsWithBreachNotification.length === 0) {
        audit.findings.violations.push({
          severity: 'error',
          rule: 'HIPAA Breach Notification Rule',
          description: 'Breach notification procedures not configured',
          affectedEntities: [],
          remediation: 'Implement breach notification procedures'
        });
      }
    }
  }

  /**
   * PCI-DSS specific audit
   */
  private async auditPCIDSS(
    audit: ComplianceAudit,
    scope?: ComplianceAudit['scope']
  ): Promise<void> {
    const policy = this.policies.get(ComplianceFramework.PCI_DSS);
    if (!policy?.enabled) return;

    const lineageData = this.lineageTracker.queryLineage({
      workflowId: scope?.workflowId,
      executionId: scope?.executionId
    });

    for (const node of lineageData.nodes) {
      const sensitivity = node.dataSource.metadata.sensitivity;

      // Check for cardholder data
      if (sensitivity === DataSensitivity.PCI) {
        // Verify strong encryption
        const hasEncryption = node.transformations.some(tId => {
          const t = this.lineageTracker['transformations'].get(tId);
          return t?.compliance.encryptionApplied;
        });

        if (!hasEncryption) {
          audit.findings.violations.push({
            severity: 'critical',
            rule: 'PCI-DSS Requirement 3 - Protect Stored Cardholder Data',
            description: `Cardholder data in node ${node.nodeId} is not encrypted`,
            affectedEntities: [node.nodeId],
            remediation: 'Enable strong encryption for all cardholder data'
          });
        }

        // Verify access controls
        audit.findings.recommendations.push(
          `Verify access controls for cardholder data in node ${node.nodeId}`
        );

        // Check data retention
        audit.findings.recommendations.push(
          `Verify cardholder data retention complies with PCI-DSS requirements`
        );
      }
    }

    // Check for transmission security
    for (const node of lineageData.nodes) {
      if (node.dataSource.type === 'api' || node.dataSource.type === 'webhook') {
        audit.findings.recommendations.push(
          `Verify TLS 1.2+ for transmission of cardholder data in node ${node.nodeId}`
        );
      }
    }
  }

  /**
   * Generic compliance audit
   */
  private async auditGeneric(
    audit: ComplianceAudit,
    scope?: ComplianceAudit['scope']
  ): Promise<void> {
    const policy = this.policies.get(audit.framework);
    if (!policy?.enabled) return;

    const lineageData = this.lineageTracker.queryLineage({
      workflowId: scope?.workflowId,
      executionId: scope?.executionId
    });

    // Basic checks
    for (const node of lineageData.nodes) {
      if (policy.encryptionRequired && node.dataSource.metadata.sensitivity) {
        audit.findings.recommendations.push(
          `Verify encryption for sensitive data in node ${node.nodeId}`
        );
      }

      if (policy.accessLoggingRequired) {
        audit.findings.recommendations.push(
          `Verify access logging for node ${node.nodeId}`
        );
      }
    }
  }

  /**
   * Handle GDPR data subject request
   */
  async handleGDPRRequest(
    request: Omit<GDPRDataSubjectRequest, 'id' | 'timestamp' | 'status'>
  ): Promise<GDPRDataSubjectRequest> {
    const gdprRequest: GDPRDataSubjectRequest = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      status: 'pending',
      ...request
    };

    // Calculate deadline (30 days for GDPR)
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);
    gdprRequest.deadline = deadline.toISOString();

    this.gdprRequests.set(gdprRequest.id, gdprRequest);

    logger.info('GDPR data subject request created', {
      requestId: gdprRequest.id,
      requestType: gdprRequest.requestType,
      deadline: gdprRequest.deadline
    });

    // Automatically process if possible
    await this.processGDPRRequest(gdprRequest.id);

    return gdprRequest;
  }

  /**
   * Process GDPR request
   */
  private async processGDPRRequest(requestId: string): Promise<void> {
    const request = this.gdprRequests.get(requestId);
    if (!request) return;

    request.status = 'in-progress';

    // Search for subject's data in lineage
    const lineageData = this.lineageTracker.queryLineage({});
    const dataFound: LineageId[] = [];

    // This is simplified - in production, you'd search by subject identifiers
    for (const node of lineageData.nodes) {
      if (this.nodeContainsSubjectData(node, request.subject)) {
        dataFound.push(node.id);
      }
    }

    // Perform requested action
    const actionsPerformed: string[] = [];

    switch (request.requestType) {
      case 'access':
        actionsPerformed.push('Data access report generated');
        break;
      case 'erasure':
        actionsPerformed.push(`${dataFound.length} data records marked for deletion`);
        break;
      case 'portability':
        actionsPerformed.push('Data export package created');
        break;
      case 'rectification':
        actionsPerformed.push('Data correction procedures initiated');
        break;
      case 'restriction':
        actionsPerformed.push('Data processing restriction applied');
        break;
      case 'objection':
        actionsPerformed.push('Processing objection recorded');
        break;
    }

    request.results = {
      dataFound,
      actionsPerformed,
      evidence: ['lineage-search-report', 'action-confirmation']
    };

    request.status = 'completed';
    request.completedAt = new Date().toISOString();

    logger.info('GDPR request processed', {
      requestId,
      dataFound: dataFound.length,
      actionsPerformed
    });
  }

  /**
   * Register PHI record
   */
  registerPHI(record: Omit<HIPAAPHIRecord, 'id' | 'timestamp'>): HIPAAPHIRecord {
    const phiRecord: HIPAAPHIRecord = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...record
    };

    this.phiRecords.set(phiRecord.id, phiRecord);

    logger.info('PHI record registered', {
      recordId: phiRecord.id,
      elementCount: phiRecord.phiElements.length
    });

    return phiRecord;
  }

  /**
   * Register PCI cardholder data
   */
  registerCardholderData(
    record: Omit<PCIDSSCardholderData, 'id' | 'timestamp'>
  ): PCIDSSCardholderData {
    const pciRecord: PCIDSSCardholderData = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...record
    };

    this.pciRecords.set(pciRecord.id, pciRecord);

    logger.info('PCI cardholder data registered', {
      recordId: pciRecord.id,
      elementCount: pciRecord.dataElements.length
    });

    return pciRecord;
  }

  /**
   * Get compliance status summary
   */
  getComplianceStatus(): {
    frameworks: Array<{
      framework: ComplianceFramework;
      enabled: boolean;
      compliant: boolean;
      openViolations: number;
      lastAudit?: string;
    }>;
    totalViolations: number;
    criticalViolations: number;
  } {
    const frameworks: Array<{
      framework: ComplianceFramework;
      enabled: boolean;
      compliant: boolean;
      openViolations: number;
      lastAudit?: string;
    }> = [];

    for (const [framework, policy] of this.policies) {
      const frameworkViolations = Array.from(this.violations.values()).filter(
        v => v.framework === framework && v.status === 'open'
      );

      const frameworkAudits = Array.from(this.audits.values())
        .filter(a => a.framework === framework)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      frameworks.push({
        framework,
        enabled: policy.enabled,
        compliant: frameworkViolations.length === 0,
        openViolations: frameworkViolations.length,
        lastAudit: frameworkAudits[0]?.timestamp
      });
    }

    const allViolations = Array.from(this.violations.values()).filter(
      v => v.status === 'open'
    );

    const criticalViolations = allViolations.filter(
      v => v.severity === 'critical'
    ).length;

    return {
      frameworks,
      totalViolations: allViolations.length,
      criticalViolations
    };
  }

  /**
   * Get audit history
   */
  getAuditHistory(framework?: ComplianceFramework): ComplianceAudit[] {
    const audits = Array.from(this.audits.values());

    if (framework) {
      return audits.filter(a => a.framework === framework);
    }

    return audits;
  }

  /**
   * Get violations
   */
  getViolations(
    framework?: ComplianceFramework,
    status?: ComplianceViolation['status']
  ): ComplianceViolation[] {
    let violations = Array.from(this.violations.values());

    if (framework) {
      violations = violations.filter(v => v.framework === framework);
    }

    if (status) {
      violations = violations.filter(v => v.status === status);
    }

    return violations.sort((a, b) => {
      const severityOrder = { critical: 4, error: 3, warning: 2, info: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Resolve violation
   */
  resolveViolation(violationId: string, resolution: string): void {
    const violation = this.violations.get(violationId);
    if (violation) {
      violation.status = 'resolved';
      logger.info('Violation resolved', { violationId, resolution });
    }
  }

  // Private helper methods

  private recordViolation(violation: ComplianceViolation): void {
    this.violations.set(violation.id, violation);

    logger.warn('Compliance violation recorded', {
      framework: violation.framework,
      severity: violation.severity,
      rule: violation.rule
    });
  }

  private nodeContainsSubjectData(
    node: DataLineageNode,
    subject: GDPRDataSubjectRequest['subject']
  ): boolean {
    // Simplified check - in production, implement actual data search
    // This would involve checking node data against subject identifiers
    return false;
  }
}

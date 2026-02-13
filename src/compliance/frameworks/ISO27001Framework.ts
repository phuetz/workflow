/**
 * ISO 27001:2022 Framework Implementation
 * Information Security Management System (ISMS) - 114 controls across 4 themes
 */

import type {
  ComplianceControl,
  ControlAssessment,
} from '../../types/compliance';
import { ComplianceFramework, ControlCategory, ComplianceStatus } from '../../types/compliance';
import type { IComplianceFramework } from '../ComplianceManager';

export class ISO27001Framework implements IComplianceFramework {
  framework = ComplianceFramework.ISO27001;
  private controls: Map<string, ComplianceControl> = new Map();

  constructor() {
    this.initializeControls();
  }

  getControls(): ComplianceControl[] {
    return Array.from(this.controls.values());
  }

  getControlById(controlId: string): ComplianceControl | undefined {
    return this.controls.get(controlId);
  }

  async assessControl(controlId: string): Promise<ControlAssessment> {
    const control = this.controls.get(controlId);
    if (!control) {
      throw new Error(`Control ${controlId} not found`);
    }

    const status = await this.autoAssess(control);

    return {
      id: `assessment_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      controlId,
      assessedBy: 'system',
      assessedAt: new Date(),
      status,
      findings: [],
      evidenceLinks: [],
      nextReviewDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
    };
  }

  private async autoAssess(control: ComplianceControl): Promise<ComplianceStatus> {
    return ComplianceStatus.IN_PROGRESS;
  }

  private initializeControls(): void {
    // ========================================================================
    // Annex A.5: Organizational Controls (37 controls)
    // ========================================================================

    this.addControl({
      id: 'ISO-5.1',
      name: 'Policies for information security',
      description: 'Information security policy and topic-specific policies defined and approved',
      category: ControlCategory.RISK_ASSESSMENT,
      requirements: [
        'Define information security policy',
        'Obtain management approval',
        'Communicate to all personnel',
        'Review and update regularly',
      ],
      testProcedures: [
        'Review security policies',
        'Verify management approval',
        'Test communication to staff',
      ],
      evidence: ['Security Policy', 'Management Approval', 'Policy Distribution Records'],
      automationLevel: 'manual',
      frequency: 'annual',
    });

    this.addControl({
      id: 'ISO-5.2',
      name: 'Information security roles and responsibilities',
      description: 'Information security roles and responsibilities are defined and allocated',
      category: ControlCategory.ACCESS_CONTROL,
      requirements: [
        'Define security roles',
        'Assign responsibilities',
        'Document role assignments',
        'Segregate conflicting duties',
      ],
      testProcedures: [
        'Review role definitions',
        'Verify responsibility assignments',
        'Test segregation of duties',
      ],
      evidence: ['Role Definitions', 'Responsibility Matrix', 'Access Control Lists'],
      automationLevel: 'semi-automated',
      frequency: 'annual',
    });

    this.addControl({
      id: 'ISO-5.3',
      name: 'Segregation of duties',
      description: 'Conflicting duties and areas of responsibility segregated',
      category: ControlCategory.ACCESS_CONTROL,
      requirements: [
        'Identify conflicting duties',
        'Implement segregation controls',
        'Monitor for violations',
        'Document segregation matrix',
      ],
      testProcedures: [
        'Review segregation matrix',
        'Test access combinations',
        'Verify monitoring controls',
      ],
      evidence: ['Segregation Matrix', 'Access Reviews', 'Violation Reports'],
      automationLevel: 'automated',
      frequency: 'quarterly',
    });

    this.addControl({
      id: 'ISO-5.7',
      name: 'Threat intelligence',
      description: 'Information relating to information security threats collected and analyzed',
      category: ControlCategory.RISK_ASSESSMENT,
      requirements: [
        'Subscribe to threat feeds',
        'Analyze threat intelligence',
        'Share threat information',
        'Update defenses based on threats',
      ],
      testProcedures: [
        'Review threat intelligence sources',
        'Verify threat analysis',
        'Test defense updates',
      ],
      evidence: ['Threat Intelligence Reports', 'Analysis Documentation', 'Defense Updates'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'ISO-5.8',
      name: 'Information security in project management',
      description: 'Information security integrated into project management',
      category: ControlCategory.CHANGE_MANAGEMENT,
      requirements: [
        'Include security in project planning',
        'Conduct security reviews',
        'Document security requirements',
        'Test security controls',
      ],
      testProcedures: [
        'Review project documentation',
        'Verify security requirements',
        'Test security controls',
      ],
      evidence: ['Project Plans', 'Security Requirements', 'Test Results'],
      automationLevel: 'manual',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'ISO-5.10',
      name: 'Acceptable use of information and other associated assets',
      description: 'Rules for acceptable use of information and assets identified and documented',
      category: ControlCategory.DATA_PROTECTION,
      requirements: [
        'Define acceptable use policy',
        'Communicate to users',
        'Monitor compliance',
        'Enforce violations',
      ],
      testProcedures: [
        'Review acceptable use policy',
        'Verify user acknowledgment',
        'Test monitoring controls',
      ],
      evidence: ['Acceptable Use Policy', 'User Acknowledgments', 'Monitoring Reports'],
      automationLevel: 'semi-automated',
      frequency: 'annual',
    });

    this.addControl({
      id: 'ISO-5.14',
      name: 'Information transfer',
      description: 'Rules, procedures, or agreements for information transfer in place',
      category: ControlCategory.DATA_PROTECTION,
      requirements: [
        'Define transfer procedures',
        'Encrypt data in transit',
        'Log transfers',
        'Verify recipient authorization',
      ],
      testProcedures: [
        'Review transfer procedures',
        'Verify encryption',
        'Test transfer logging',
      ],
      evidence: ['Transfer Procedures', 'Encryption Configuration', 'Transfer Logs'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'ISO-5.23',
      name: 'Information security for use of cloud services',
      description: 'Information security requirements for use of cloud services defined',
      category: ControlCategory.VENDOR_MANAGEMENT,
      requirements: [
        'Define cloud security requirements',
        'Review cloud provider security',
        'Monitor cloud service compliance',
        'Manage cloud access',
      ],
      testProcedures: [
        'Review cloud security requirements',
        'Verify provider compliance',
        'Test access controls',
      ],
      evidence: ['Cloud Security Policy', 'Provider Certifications', 'Access Logs'],
      automationLevel: 'semi-automated',
      frequency: 'quarterly',
    });

    // ========================================================================
    // Annex A.6: People Controls (8 controls)
    // ========================================================================

    this.addControl({
      id: 'ISO-6.1',
      name: 'Screening',
      description: 'Background verification checks on candidates for employment',
      category: ControlCategory.ACCESS_CONTROL,
      requirements: [
        'Define screening requirements',
        'Conduct background checks',
        'Document screening results',
        'Comply with legal requirements',
      ],
      testProcedures: [
        'Review screening procedures',
        'Verify background checks',
        'Test compliance with laws',
      ],
      evidence: ['Screening Policy', 'Background Check Records', 'Legal Compliance Documentation'],
      automationLevel: 'manual',
      frequency: 'annual',
    });

    this.addControl({
      id: 'ISO-6.2',
      name: 'Terms and conditions of employment',
      description: 'Employment contracts state responsibilities for information security',
      category: ControlCategory.TRAINING,
      requirements: [
        'Include security in contracts',
        'Define confidentiality obligations',
        'Specify post-employment restrictions',
        'Obtain signed acknowledgment',
      ],
      testProcedures: [
        'Review employment contracts',
        'Verify security clauses',
        'Test acknowledgment process',
      ],
      evidence: ['Employment Contracts', 'Confidentiality Agreements', 'Signed Acknowledgments'],
      automationLevel: 'manual',
      frequency: 'annual',
    });

    this.addControl({
      id: 'ISO-6.3',
      name: 'Information security awareness, education and training',
      description: 'Personnel receive appropriate awareness, education and training',
      category: ControlCategory.TRAINING,
      requirements: [
        'Provide security awareness training',
        'Conduct role-specific training',
        'Test training effectiveness',
        'Maintain training records',
      ],
      testProcedures: [
        'Review training program',
        'Verify completion rates',
        'Test knowledge retention',
      ],
      evidence: ['Training Materials', 'Completion Records', 'Assessment Results'],
      automationLevel: 'semi-automated',
      frequency: 'annual',
    });

    this.addControl({
      id: 'ISO-6.4',
      name: 'Disciplinary process',
      description: 'Disciplinary process for violations of information security policy',
      category: ControlCategory.INCIDENT_RESPONSE,
      requirements: [
        'Define disciplinary procedures',
        'Document violations',
        'Apply consistent discipline',
        'Track disciplinary actions',
      ],
      testProcedures: [
        'Review disciplinary procedures',
        'Verify violation documentation',
        'Test consistency of actions',
      ],
      evidence: ['Disciplinary Policy', 'Violation Records', 'Action Logs'],
      automationLevel: 'manual',
      frequency: 'annual',
    });

    this.addControl({
      id: 'ISO-6.5',
      name: 'Responsibilities after termination or change of employment',
      description: 'Information security responsibilities after termination or change remain valid',
      category: ControlCategory.ACCESS_CONTROL,
      requirements: [
        'Define post-employment obligations',
        'Return assets upon termination',
        'Revoke access promptly',
        'Enforce confidentiality obligations',
      ],
      testProcedures: [
        'Review termination procedures',
        'Verify asset return',
        'Test access revocation',
      ],
      evidence: ['Termination Checklist', 'Asset Return Records', 'Access Revocation Logs'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    // ========================================================================
    // Annex A.7: Physical Controls (14 controls)
    // ========================================================================

    this.addControl({
      id: 'ISO-7.1',
      name: 'Physical security perimeters',
      description: 'Security perimeters defined and used to protect areas with information',
      category: ControlCategory.PHYSICAL_SECURITY,
      requirements: [
        'Define security perimeters',
        'Implement physical barriers',
        'Control entry points',
        'Monitor perimeters',
      ],
      testProcedures: [
        'Inspect physical perimeters',
        'Test access controls',
        'Verify monitoring systems',
      ],
      evidence: ['Facility Diagrams', 'Access Control Systems', 'Monitoring Logs'],
      automationLevel: 'automated',
      frequency: 'quarterly',
    });

    this.addControl({
      id: 'ISO-7.2',
      name: 'Physical entry',
      description: 'Secure areas protected by appropriate entry controls',
      category: ControlCategory.PHYSICAL_SECURITY,
      requirements: [
        'Implement entry controls',
        'Authenticate entrants',
        'Log physical access',
        'Escort visitors',
      ],
      testProcedures: [
        'Test entry controls',
        'Review access logs',
        'Verify visitor procedures',
      ],
      evidence: ['Access Card Logs', 'Visitor Logs', 'Entry Control Configuration'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'ISO-7.4',
      name: 'Physical security monitoring',
      description: 'Premises continuously monitored for unauthorized physical access',
      category: ControlCategory.PHYSICAL_SECURITY,
      requirements: [
        'Install monitoring systems',
        'Monitor 24/7',
        'Respond to alerts',
        'Review monitoring records',
      ],
      testProcedures: [
        'Inspect monitoring systems',
        'Test alert response',
        'Review monitoring records',
      ],
      evidence: ['Camera Footage', 'Alarm Logs', 'Response Records'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    // ========================================================================
    // Annex A.8: Technological Controls (34 controls)
    // ========================================================================

    this.addControl({
      id: 'ISO-8.1',
      name: 'User endpoint devices',
      description: 'Information on user endpoint devices protected',
      category: ControlCategory.APPLICATION_SECURITY,
      requirements: [
        'Implement endpoint protection',
        'Enforce device policies',
        'Monitor endpoint compliance',
        'Secure remote access',
      ],
      testProcedures: [
        'Review endpoint policies',
        'Test protection software',
        'Verify compliance monitoring',
      ],
      evidence: ['Endpoint Policies', 'Protection Software Logs', 'Compliance Reports'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'ISO-8.2',
      name: 'Privileged access rights',
      description: 'Allocation and use of privileged access rights restricted and managed',
      category: ControlCategory.ACCESS_CONTROL,
      requirements: [
        'Define privileged access requirements',
        'Grant based on business need',
        'Monitor privileged access usage',
        'Review regularly',
      ],
      testProcedures: [
        'Review privileged accounts',
        'Test access controls',
        'Verify monitoring',
      ],
      evidence: ['Privileged Account List', 'Access Logs', 'Review Reports'],
      automationLevel: 'automated',
      frequency: 'quarterly',
    });

    this.addControl({
      id: 'ISO-8.3',
      name: 'Information access restriction',
      description: 'Access to information and other associated assets restricted',
      category: ControlCategory.ACCESS_CONTROL,
      requirements: [
        'Implement access controls',
        'Enforce need-to-know',
        'Monitor access',
        'Review access rights',
      ],
      testProcedures: [
        'Test access restrictions',
        'Verify need-to-know enforcement',
        'Review access logs',
      ],
      evidence: ['Access Control Matrix', 'Access Logs', 'Review Reports'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'ISO-8.5',
      name: 'Secure authentication',
      description: 'Secure authentication technologies and procedures implemented',
      category: ControlCategory.ACCESS_CONTROL,
      requirements: [
        'Implement multi-factor authentication',
        'Enforce strong passwords',
        'Configure secure protocols',
        'Monitor authentication failures',
      ],
      testProcedures: [
        'Test MFA implementation',
        'Verify password policies',
        'Review authentication logs',
      ],
      evidence: ['MFA Configuration', 'Password Policies', 'Authentication Logs'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'ISO-8.9',
      name: 'Configuration management',
      description: 'Configurations of hardware, software, services and networks documented and reviewed',
      category: ControlCategory.CHANGE_MANAGEMENT,
      requirements: [
        'Document baseline configurations',
        'Control configuration changes',
        'Review configurations regularly',
        'Maintain configuration inventory',
      ],
      testProcedures: [
        'Review configuration baselines',
        'Test change controls',
        'Verify inventory accuracy',
      ],
      evidence: ['Configuration Baselines', 'Change Records', 'Configuration Inventory'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'ISO-8.10',
      name: 'Information deletion',
      description: 'Information stored in information systems, devices or any other storage media deleted when no longer required',
      category: ControlCategory.DATA_PROTECTION,
      requirements: [
        'Define deletion procedures',
        'Implement secure deletion',
        'Verify deletion completeness',
        'Document deletions',
      ],
      testProcedures: [
        'Review deletion procedures',
        'Test secure deletion',
        'Verify deletion logs',
      ],
      evidence: ['Deletion Procedures', 'Deletion Logs', 'Verification Reports'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'ISO-8.11',
      name: 'Data masking',
      description: 'Data masking used in accordance with topic-specific policy on access control',
      category: ControlCategory.DATA_PROTECTION,
      requirements: [
        'Identify sensitive data',
        'Implement masking rules',
        'Test masking effectiveness',
        'Monitor masking compliance',
      ],
      testProcedures: [
        'Review masking policies',
        'Test masking implementation',
        'Verify compliance monitoring',
      ],
      evidence: ['Masking Policies', 'Masking Configuration', 'Compliance Reports'],
      automationLevel: 'automated',
      frequency: 'quarterly',
    });

    this.addControl({
      id: 'ISO-8.24',
      name: 'Use of cryptography',
      description: 'Rules for the effective use of cryptography defined and implemented',
      category: ControlCategory.ENCRYPTION,
      requirements: [
        'Define cryptography policy',
        'Implement encryption',
        'Manage encryption keys',
        'Review cryptography usage',
      ],
      testProcedures: [
        'Review cryptography policy',
        'Verify encryption implementation',
        'Test key management',
      ],
      evidence: ['Cryptography Policy', 'Encryption Configuration', 'Key Management Records'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'ISO-8.28',
      name: 'Secure coding',
      description: 'Secure coding principles applied to software development',
      category: ControlCategory.APPLICATION_SECURITY,
      requirements: [
        'Define secure coding standards',
        'Train developers',
        'Conduct code reviews',
        'Use security testing tools',
      ],
      testProcedures: [
        'Review coding standards',
        'Verify training completion',
        'Test code review process',
      ],
      evidence: ['Coding Standards', 'Training Records', 'Code Review Reports'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    // Add more controls to reach 114 total...
  }

  private addControl(control: Omit<ComplianceControl, 'framework' | 'status'>): void {
    const fullControl: ComplianceControl = {
      ...control,
      framework: this.framework,
      status: ComplianceStatus.IN_PROGRESS,
    };
    this.controls.set(fullControl.id, fullControl);
  }
}

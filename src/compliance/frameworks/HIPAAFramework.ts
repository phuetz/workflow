/**
 * HIPAA (Health Insurance Portability and Accountability Act) Framework
 * Privacy Rule, Security Rule, and Breach Notification Rule
 */

import type {
  ComplianceControl,
  ControlAssessment,
} from '../../types/compliance';
import { ComplianceFramework, ControlCategory, ComplianceStatus } from '../../types/compliance';
import type { IComplianceFramework } from '../ComplianceManager';

export class HIPAAFramework implements IComplianceFramework {
  framework = ComplianceFramework.HIPAA;
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
      id: `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      controlId,
      assessedBy: 'system',
      assessedAt: new Date(),
      status,
      findings: [],
      evidenceLinks: [],
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    };
  }

  private async autoAssess(control: ComplianceControl): Promise<ComplianceStatus> {
    return ComplianceStatus.IN_PROGRESS;
  }

  private initializeControls(): void {
    // ========================================================================
    // Administrative Safeguards (164.308)
    // ========================================================================

    this.addControl({
      id: 'HIPAA-164.308(a)(1)',
      name: 'Security Management Process',
      description: 'Implement policies and procedures to prevent, detect, contain, and correct security violations',
      category: ControlCategory.RISK_ASSESSMENT,
      requirements: [
        'Conduct risk analysis',
        'Implement risk management',
        'Apply sanctions policy',
        'Review information system activity',
      ],
      testProcedures: [
        'Review risk analysis documentation',
        'Verify risk management procedures',
        'Test sanctions enforcement',
        'Review system activity logs',
      ],
      evidence: ['Risk Analysis', 'Risk Management Plan', 'Sanctions Policy', 'Activity Logs'],
      automationLevel: 'semi-automated',
      frequency: 'annual',
    });

    this.addControl({
      id: 'HIPAA-164.308(a)(2)',
      name: 'Assigned Security Responsibility',
      description: 'Identify security official responsible for developing and implementing security policies',
      category: ControlCategory.ACCESS_CONTROL,
      requirements: [
        'Designate security official',
        'Document responsibilities',
        'Grant appropriate authority',
        'Ensure accountability',
      ],
      testProcedures: [
        'Verify security official designation',
        'Review responsibility documentation',
        'Test authority level',
      ],
      evidence: ['Security Official Designation', 'Job Description', 'Organization Chart'],
      automationLevel: 'manual',
      frequency: 'annual',
    });

    this.addControl({
      id: 'HIPAA-164.308(a)(3)',
      name: 'Workforce Security',
      description: 'Implement policies and procedures to ensure workforce members have appropriate access',
      category: ControlCategory.ACCESS_CONTROL,
      requirements: [
        'Authorize and/or supervise workforce',
        'Determine access for workforce',
        'Terminate access when employment ends',
        'Review workforce access periodically',
      ],
      testProcedures: [
        'Review authorization procedures',
        'Test access determination',
        'Verify termination procedures',
        'Review access review logs',
      ],
      evidence: ['Access Authorization Forms', 'Access Review Reports', 'Termination Checklists'],
      automationLevel: 'automated',
      frequency: 'quarterly',
    });

    this.addControl({
      id: 'HIPAA-164.308(a)(4)',
      name: 'Information Access Management',
      description: 'Implement policies and procedures for authorizing access to ePHI',
      category: ControlCategory.ACCESS_CONTROL,
      requirements: [
        'Isolate healthcare clearinghouse functions',
        'Grant access based on role',
        'Authorize access to ePHI',
        'Review access regularly',
      ],
      testProcedures: [
        'Verify role-based access',
        'Test access authorization',
        'Review access logs',
      ],
      evidence: ['Access Control Policies', 'Role Definitions', 'Access Logs'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'HIPAA-164.308(a)(5)',
      name: 'Security Awareness and Training',
      description: 'Implement security awareness and training program for workforce',
      category: ControlCategory.TRAINING,
      requirements: [
        'Provide security reminders',
        'Protect from malicious software',
        'Monitor log-in attempts',
        'Train on password management',
      ],
      testProcedures: [
        'Review training materials',
        'Verify training completion',
        'Test awareness level',
      ],
      evidence: ['Training Records', 'Security Reminders', 'Training Materials'],
      automationLevel: 'semi-automated',
      frequency: 'annual',
    });

    this.addControl({
      id: 'HIPAA-164.308(a)(6)',
      name: 'Security Incident Procedures',
      description: 'Implement policies and procedures to address security incidents',
      category: ControlCategory.INCIDENT_RESPONSE,
      requirements: [
        'Identify security incidents',
        'Respond to incidents',
        'Document incidents',
        'Mitigate harmful effects',
      ],
      testProcedures: [
        'Review incident response plan',
        'Test incident detection',
        'Verify incident documentation',
      ],
      evidence: ['Incident Response Plan', 'Incident Reports', 'Mitigation Records'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'HIPAA-164.308(a)(7)',
      name: 'Contingency Plan',
      description: 'Establish and implement policies and procedures for responding to emergencies',
      category: ControlCategory.BUSINESS_CONTINUITY,
      requirements: [
        'Create data backup plan',
        'Develop disaster recovery plan',
        'Create emergency mode operation plan',
        'Test and revise contingency plan',
      ],
      testProcedures: [
        'Review contingency plan',
        'Test backup procedures',
        'Verify disaster recovery',
      ],
      evidence: ['Contingency Plan', 'Backup Logs', 'DR Test Results'],
      automationLevel: 'automated',
      frequency: 'annual',
    });

    this.addControl({
      id: 'HIPAA-164.308(a)(8)',
      name: 'Evaluation',
      description: 'Perform periodic technical and non-technical evaluation',
      category: ControlCategory.AUDIT_LOGGING,
      requirements: [
        'Conduct periodic evaluations',
        'Review security controls',
        'Assess compliance',
        'Document findings',
      ],
      testProcedures: [
        'Review evaluation reports',
        'Verify evaluation frequency',
        'Test remediation process',
      ],
      evidence: ['Evaluation Reports', 'Compliance Assessments', 'Remediation Records'],
      automationLevel: 'manual',
      frequency: 'annual',
    });

    // ========================================================================
    // Physical Safeguards (164.310)
    // ========================================================================

    this.addControl({
      id: 'HIPAA-164.310(a)(1)',
      name: 'Facility Access Controls',
      description: 'Implement policies and procedures to limit physical access to systems with ePHI',
      category: ControlCategory.PHYSICAL_SECURITY,
      requirements: [
        'Establish contingency operations',
        'Control facility access',
        'Validate visitor access',
        'Maintain and repair access controls',
      ],
      testProcedures: [
        'Inspect physical controls',
        'Test access restrictions',
        'Review visitor logs',
      ],
      evidence: ['Access Control Logs', 'Visitor Logs', 'Maintenance Records'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'HIPAA-164.310(b)',
      name: 'Workstation Use',
      description: 'Implement policies and procedures for workstation use',
      category: ControlCategory.APPLICATION_SECURITY,
      requirements: [
        'Define proper workstation use',
        'Specify physical safeguards',
        'Control workstation access',
        'Monitor workstation activity',
      ],
      testProcedures: [
        'Review workstation policies',
        'Test access controls',
        'Verify monitoring',
      ],
      evidence: ['Workstation Use Policy', 'Access Logs', 'Monitoring Reports'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'HIPAA-164.310(c)',
      name: 'Workstation Security',
      description: 'Implement physical safeguards for workstations',
      category: ControlCategory.PHYSICAL_SECURITY,
      requirements: [
        'Secure workstation location',
        'Implement screen locks',
        'Control physical access',
        'Protect from unauthorized access',
      ],
      testProcedures: [
        'Inspect workstation placement',
        'Test screen locks',
        'Verify physical controls',
      ],
      evidence: ['Facility Layout', 'Screen Lock Configuration', 'Access Controls'],
      automationLevel: 'semi-automated',
      frequency: 'quarterly',
    });

    this.addControl({
      id: 'HIPAA-164.310(d)(1)',
      name: 'Device and Media Controls',
      description: 'Implement policies and procedures for disposal and reuse of ePHI media',
      category: ControlCategory.DATA_PROTECTION,
      requirements: [
        'Dispose of ePHI securely',
        'Remove ePHI before reuse',
        'Maintain accountability for media',
        'Create backup and storage procedures',
      ],
      testProcedures: [
        'Review disposal procedures',
        'Test media sanitization',
        'Verify accountability tracking',
      ],
      evidence: ['Disposal Procedures', 'Sanitization Logs', 'Media Inventory'],
      automationLevel: 'semi-automated',
      frequency: 'continuous',
    });

    // ========================================================================
    // Technical Safeguards (164.312)
    // ========================================================================

    this.addControl({
      id: 'HIPAA-164.312(a)(1)',
      name: 'Access Control',
      description: 'Implement technical policies and procedures for access to ePHI',
      category: ControlCategory.ACCESS_CONTROL,
      requirements: [
        'Assign unique user identification',
        'Implement emergency access procedure',
        'Provide automatic logoff',
        'Encrypt and decrypt ePHI',
      ],
      testProcedures: [
        'Verify unique user IDs',
        'Test emergency access',
        'Review auto-logoff settings',
        'Verify encryption',
      ],
      evidence: ['User ID List', 'Emergency Access Procedures', 'Encryption Configuration'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'HIPAA-164.312(b)',
      name: 'Audit Controls',
      description: 'Implement hardware, software, and procedural mechanisms to record and examine access',
      category: ControlCategory.AUDIT_LOGGING,
      requirements: [
        'Record access to ePHI',
        'Examine access activity',
        'Monitor system activity',
        'Retain audit logs',
      ],
      testProcedures: [
        'Review audit logging',
        'Test log completeness',
        'Verify log retention',
      ],
      evidence: ['Audit Logs', 'Log Review Reports', 'Log Retention Policy'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'HIPAA-164.312(c)(1)',
      name: 'Integrity',
      description: 'Implement policies and procedures to protect ePHI from improper alteration',
      category: ControlCategory.DATA_PROTECTION,
      requirements: [
        'Implement mechanisms to authenticate ePHI',
        'Detect unauthorized changes',
        'Prevent improper alteration',
        'Maintain data integrity',
      ],
      testProcedures: [
        'Review integrity controls',
        'Test change detection',
        'Verify authentication',
      ],
      evidence: ['Integrity Policies', 'Change Detection Logs', 'Authentication Records'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'HIPAA-164.312(d)',
      name: 'Person or Entity Authentication',
      description: 'Implement procedures to verify identity of persons or entities',
      category: ControlCategory.ACCESS_CONTROL,
      requirements: [
        'Verify user identity',
        'Implement authentication mechanisms',
        'Use multi-factor authentication',
        'Monitor authentication events',
      ],
      testProcedures: [
        'Test authentication mechanisms',
        'Verify MFA implementation',
        'Review authentication logs',
      ],
      evidence: ['Authentication Configuration', 'MFA Settings', 'Authentication Logs'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'HIPAA-164.312(e)(1)',
      name: 'Transmission Security',
      description: 'Implement technical security measures to guard against unauthorized access to ePHI',
      category: ControlCategory.ENCRYPTION,
      requirements: [
        'Implement integrity controls',
        'Encrypt ePHI in transmission',
        'Protect against unauthorized access',
        'Monitor transmission security',
      ],
      testProcedures: [
        'Verify encryption in transit',
        'Test integrity controls',
        'Review transmission logs',
      ],
      evidence: ['Encryption Configuration', 'TLS Certificates', 'Transmission Logs'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    // ========================================================================
    // Privacy Rule (164.500-534)
    // ========================================================================

    this.addControl({
      id: 'HIPAA-164.520',
      name: 'Notice of Privacy Practices',
      description: 'Provide notice of privacy practices to individuals',
      category: ControlCategory.PRIVACY,
      requirements: [
        'Create privacy notice',
        'Distribute to individuals',
        'Obtain acknowledgment',
        'Update as needed',
      ],
      testProcedures: [
        'Review privacy notice',
        'Verify distribution',
        'Test acknowledgment process',
      ],
      evidence: ['Privacy Notice', 'Distribution Records', 'Acknowledgment Forms'],
      automationLevel: 'manual',
      frequency: 'annual',
    });

    this.addControl({
      id: 'HIPAA-164.522',
      name: 'Rights to Request Privacy Protection',
      description: 'Permit individuals to request privacy protection for PHI',
      category: ControlCategory.PRIVACY,
      requirements: [
        'Accept privacy requests',
        'Review requests',
        'Grant reasonable requests',
        'Document decisions',
      ],
      testProcedures: [
        'Review request procedures',
        'Test request handling',
        'Verify documentation',
      ],
      evidence: ['Request Forms', 'Decision Records', 'Implementation Logs'],
      automationLevel: 'manual',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'HIPAA-164.524',
      name: 'Access of Individuals to PHI',
      description: 'Provide individuals with access to their PHI',
      category: ControlCategory.PRIVACY,
      requirements: [
        'Accept access requests',
        'Provide access within 30 days',
        'Provide in requested format',
        'Document access provided',
      ],
      testProcedures: [
        'Review access procedures',
        'Test timeliness',
        'Verify format compliance',
      ],
      evidence: ['Access Request Forms', 'Response Timeliness Reports', 'Access Logs'],
      automationLevel: 'semi-automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'HIPAA-164.526',
      name: 'Amendment of PHI',
      description: 'Permit individuals to request amendment of PHI',
      category: ControlCategory.PRIVACY,
      requirements: [
        'Accept amendment requests',
        'Review within 60 days',
        'Grant or deny requests',
        'Document amendments',
      ],
      testProcedures: [
        'Review amendment procedures',
        'Test review timeliness',
        'Verify documentation',
      ],
      evidence: ['Amendment Request Forms', 'Review Records', 'Amendment Logs'],
      automationLevel: 'manual',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'HIPAA-164.528',
      name: 'Accounting of Disclosures',
      description: 'Provide individuals with accounting of PHI disclosures',
      category: ControlCategory.AUDIT_LOGGING,
      requirements: [
        'Track all disclosures',
        'Maintain disclosure records',
        'Provide accounting when requested',
        'Respond within 60 days',
      ],
      testProcedures: [
        'Review disclosure tracking',
        'Test accounting generation',
        'Verify timeliness',
      ],
      evidence: ['Disclosure Logs', 'Accounting Reports', 'Response Records'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    // ========================================================================
    // Breach Notification Rule (164.400-414)
    // ========================================================================

    this.addControl({
      id: 'HIPAA-164.404',
      name: 'Notification to Individuals',
      description: 'Notify affected individuals of breach without unreasonable delay',
      category: ControlCategory.INCIDENT_RESPONSE,
      requirements: [
        'Detect breaches',
        'Notify within 60 days',
        'Include required information',
        'Document notifications',
      ],
      testProcedures: [
        'Review breach detection',
        'Test notification timeliness',
        'Verify content completeness',
      ],
      evidence: ['Breach Detection Logs', 'Notification Letters', 'Notification Records'],
      automationLevel: 'semi-automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'HIPAA-164.406',
      name: 'Notification to Media',
      description: 'Notify media of breaches affecting 500+ individuals in jurisdiction',
      category: ControlCategory.INCIDENT_RESPONSE,
      requirements: [
        'Identify large breaches',
        'Notify media promptly',
        'Provide required information',
        'Document media notification',
      ],
      testProcedures: [
        'Review breach size determination',
        'Test notification procedures',
        'Verify documentation',
      ],
      evidence: ['Breach Size Calculations', 'Media Notifications', 'Notification Records'],
      automationLevel: 'manual',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'HIPAA-164.408',
      name: 'Notification to Secretary',
      description: 'Notify HHS Secretary of breaches',
      category: ControlCategory.INCIDENT_RESPONSE,
      requirements: [
        'Report breaches to HHS',
        'Submit within required timeframe',
        'Include all required information',
        'Maintain submission records',
      ],
      testProcedures: [
        'Review HHS reporting',
        'Test timeliness',
        'Verify completeness',
      ],
      evidence: ['HHS Breach Reports', 'Submission Confirmations', 'Reporting Records'],
      automationLevel: 'manual',
      frequency: 'continuous',
    });
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

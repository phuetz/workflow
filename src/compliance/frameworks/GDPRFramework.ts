/**
 * GDPR (General Data Protection Regulation) Framework
 * EU Regulation 2016/679 - Data Protection and Privacy
 */

import type {
  ComplianceControl,
  ControlAssessment,
} from '../../types/compliance';
import { ComplianceFramework, ComplianceStatus, ControlCategory } from '../../types/compliance';
import type { IComplianceFramework } from '../ComplianceManager';

export class GDPRFramework implements IComplianceFramework {
  framework = ComplianceFramework.GDPR;
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
    // Chapter 2: Principles (Articles 5-11)
    // ========================================================================

    this.addControl({
      id: 'GDPR-Art5.1(a)',
      name: 'Lawfulness, Fairness and Transparency',
      description: 'Process personal data lawfully, fairly and transparently',
      category: ControlCategory.PRIVACY,
      requirements: [
        'Ensure lawful basis for processing',
        'Process data fairly',
        'Be transparent about processing',
        'Provide clear privacy notices',
      ],
      testProcedures: [
        'Review lawful basis documentation',
        'Verify privacy notice clarity',
        'Test transparency mechanisms',
      ],
      evidence: ['Privacy Policy', 'Lawful Basis Documentation', 'Privacy Notices'],
      automationLevel: 'manual',
      frequency: 'annual',
    });

    this.addControl({
      id: 'GDPR-Art5.1(b)',
      name: 'Purpose Limitation',
      description: 'Collect data for specified, explicit and legitimate purposes',
      category: ControlCategory.DATA_PROTECTION,
      requirements: [
        'Define specific purposes',
        'Document purposes',
        'Limit processing to defined purposes',
        'Obtain consent for new purposes',
      ],
      testProcedures: [
        'Review purpose documentation',
        'Test purpose limitations',
        'Verify consent for new uses',
      ],
      evidence: ['Purpose Documentation', 'Consent Records', 'Processing Logs'],
      automationLevel: 'semi-automated',
      frequency: 'quarterly',
    });

    this.addControl({
      id: 'GDPR-Art5.1(c)',
      name: 'Data Minimization',
      description: 'Ensure data is adequate, relevant and limited to what is necessary',
      category: ControlCategory.DATA_PROTECTION,
      requirements: [
        'Collect only necessary data',
        'Review data collected',
        'Remove unnecessary data fields',
        'Document data requirements',
      ],
      testProcedures: [
        'Review data collection forms',
        'Test data minimization',
        'Verify necessity documentation',
      ],
      evidence: ['Data Collection Forms', 'Minimization Reviews', 'Necessity Documentation'],
      automationLevel: 'semi-automated',
      frequency: 'annual',
    });

    this.addControl({
      id: 'GDPR-Art5.1(d)',
      name: 'Accuracy',
      description: 'Ensure personal data is accurate and kept up to date',
      category: ControlCategory.DATA_PROTECTION,
      requirements: [
        'Implement accuracy checks',
        'Update data regularly',
        'Enable data correction',
        'Delete inaccurate data',
      ],
      testProcedures: [
        'Test accuracy mechanisms',
        'Review update procedures',
        'Verify correction process',
      ],
      evidence: ['Accuracy Checks', 'Update Logs', 'Correction Records'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'GDPR-Art5.1(e)',
      name: 'Storage Limitation',
      description: 'Keep data only as long as necessary for the purposes',
      category: ControlCategory.DATA_PROTECTION,
      requirements: [
        'Define retention periods',
        'Implement retention policies',
        'Delete data when no longer needed',
        'Archive data appropriately',
      ],
      testProcedures: [
        'Review retention policies',
        'Test deletion procedures',
        'Verify archival processes',
      ],
      evidence: ['Retention Policies', 'Deletion Logs', 'Archive Records'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'GDPR-Art5.1(f)',
      name: 'Integrity and Confidentiality',
      description: 'Process data securely with appropriate technical and organizational measures',
      category: ControlCategory.DATA_PROTECTION,
      requirements: [
        'Implement security measures',
        'Protect against unauthorized processing',
        'Prevent accidental loss or damage',
        'Ensure data confidentiality',
      ],
      testProcedures: [
        'Review security controls',
        'Test access controls',
        'Verify encryption',
      ],
      evidence: ['Security Policies', 'Access Control Lists', 'Encryption Configuration'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'GDPR-Art5.2',
      name: 'Accountability',
      description: 'Controller responsible for and able to demonstrate compliance',
      category: ControlCategory.AUDIT_LOGGING,
      requirements: [
        'Document compliance measures',
        'Maintain processing records',
        'Demonstrate accountability',
        'Conduct regular audits',
      ],
      testProcedures: [
        'Review compliance documentation',
        'Verify processing records',
        'Test audit procedures',
      ],
      evidence: ['Compliance Documentation', 'Processing Records', 'Audit Reports'],
      automationLevel: 'semi-automated',
      frequency: 'annual',
    });

    // ========================================================================
    // Chapter 3: Rights of Data Subjects (Articles 12-23)
    // ========================================================================

    this.addControl({
      id: 'GDPR-Art12',
      name: 'Transparent Information and Communication',
      description: 'Provide transparent, intelligible information to data subjects',
      category: ControlCategory.PRIVACY,
      requirements: [
        'Provide concise information',
        'Use clear language',
        'Provide information free of charge',
        'Respond to requests promptly',
      ],
      testProcedures: [
        'Review information clarity',
        'Test response times',
        'Verify no charges applied',
      ],
      evidence: ['Privacy Notices', 'Response Time Reports', 'Request Records'],
      automationLevel: 'manual',
      frequency: 'annual',
    });

    this.addControl({
      id: 'GDPR-Art15',
      name: 'Right of Access',
      description: 'Provide data subjects access to their personal data',
      category: ControlCategory.PRIVACY,
      requirements: [
        'Accept access requests',
        'Provide data within one month',
        'Provide in accessible format',
        'Provide free of charge',
      ],
      testProcedures: [
        'Test access request process',
        'Verify timeliness',
        'Review data format',
      ],
      evidence: ['Access Request Forms', 'Response Records', 'Data Exports'],
      automationLevel: 'semi-automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'GDPR-Art16',
      name: 'Right to Rectification',
      description: 'Enable data subjects to rectify inaccurate data',
      category: ControlCategory.PRIVACY,
      requirements: [
        'Accept rectification requests',
        'Correct data without delay',
        'Complete incomplete data',
        'Notify third parties of corrections',
      ],
      testProcedures: [
        'Test rectification process',
        'Verify correction timeliness',
        'Review third-party notifications',
      ],
      evidence: ['Rectification Requests', 'Correction Logs', 'Notification Records'],
      automationLevel: 'semi-automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'GDPR-Art17',
      name: 'Right to Erasure (Right to be Forgotten)',
      description: 'Enable data subjects to request deletion of their data',
      category: ControlCategory.PRIVACY,
      requirements: [
        'Accept erasure requests',
        'Delete data when required',
        'Verify no legal basis to retain',
        'Notify third parties of deletion',
      ],
      testProcedures: [
        'Test erasure process',
        'Verify deletion completeness',
        'Review third-party notifications',
      ],
      evidence: ['Erasure Requests', 'Deletion Logs', 'Verification Records'],
      automationLevel: 'semi-automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'GDPR-Art18',
      name: 'Right to Restriction of Processing',
      description: 'Enable data subjects to request processing restriction',
      category: ControlCategory.PRIVACY,
      requirements: [
        'Accept restriction requests',
        'Restrict processing when required',
        'Maintain restricted data separately',
        'Inform data subject before lifting restriction',
      ],
      testProcedures: [
        'Test restriction process',
        'Verify data segregation',
        'Review notification procedures',
      ],
      evidence: ['Restriction Requests', 'Restriction Flags', 'Notification Records'],
      automationLevel: 'semi-automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'GDPR-Art20',
      name: 'Right to Data Portability',
      description: 'Provide data in structured, commonly used, machine-readable format',
      category: ControlCategory.PRIVACY,
      requirements: [
        'Accept portability requests',
        'Provide data in machine-readable format',
        'Transmit directly to another controller if requested',
        'Respond within one month',
      ],
      testProcedures: [
        'Test portability process',
        'Verify data format',
        'Review transmission procedures',
      ],
      evidence: ['Portability Requests', 'Data Exports', 'Transmission Records'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'GDPR-Art21',
      name: 'Right to Object',
      description: 'Enable data subjects to object to processing',
      category: ControlCategory.PRIVACY,
      requirements: [
        'Accept objection requests',
        'Stop processing unless compelling grounds',
        'Inform about right to object',
        'Document objections',
      ],
      testProcedures: [
        'Test objection process',
        'Verify processing cessation',
        'Review notification procedures',
      ],
      evidence: ['Objection Requests', 'Processing Stop Records', 'Notification Records'],
      automationLevel: 'semi-automated',
      frequency: 'continuous',
    });

    // ========================================================================
    // Chapter 4: Controller and Processor (Articles 24-43)
    // ========================================================================

    this.addControl({
      id: 'GDPR-Art24',
      name: 'Responsibility of the Controller',
      description: 'Implement appropriate technical and organizational measures',
      category: ControlCategory.RISK_ASSESSMENT,
      requirements: [
        'Implement data protection measures',
        'Review and update measures',
        'Document implementation',
        'Demonstrate compliance',
      ],
      testProcedures: [
        'Review implemented measures',
        'Test effectiveness',
        'Verify documentation',
      ],
      evidence: ['Implementation Documentation', 'Review Reports', 'Compliance Records'],
      automationLevel: 'manual',
      frequency: 'annual',
    });

    this.addControl({
      id: 'GDPR-Art25',
      name: 'Data Protection by Design and by Default',
      description: 'Implement data protection measures from the design stage',
      category: ControlCategory.APPLICATION_SECURITY,
      requirements: [
        'Integrate data protection in system design',
        'Implement privacy by default',
        'Minimize data processing by default',
        'Document design decisions',
      ],
      testProcedures: [
        'Review system design',
        'Test default settings',
        'Verify minimization',
      ],
      evidence: ['Design Documentation', 'Default Settings', 'Minimization Evidence'],
      automationLevel: 'semi-automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'GDPR-Art28',
      name: 'Processor Requirements',
      description: 'Use only processors providing sufficient guarantees',
      category: ControlCategory.VENDOR_MANAGEMENT,
      requirements: [
        'Assess processor guarantees',
        'Establish written contracts',
        'Ensure processor compliance',
        'Monitor processor activities',
      ],
      testProcedures: [
        'Review processor agreements',
        'Verify compliance monitoring',
        'Test contract enforcement',
      ],
      evidence: ['Data Processing Agreements', 'Processor Assessments', 'Monitoring Reports'],
      automationLevel: 'manual',
      frequency: 'annual',
    });

    this.addControl({
      id: 'GDPR-Art30',
      name: 'Records of Processing Activities',
      description: 'Maintain records of all processing activities',
      category: ControlCategory.AUDIT_LOGGING,
      requirements: [
        'Document all processing activities',
        'Maintain processing records',
        'Update records regularly',
        'Make records available to authorities',
      ],
      testProcedures: [
        'Review processing records',
        'Verify completeness',
        'Test availability',
      ],
      evidence: ['Processing Records', 'Record of Processing Activities (RoPA)', 'Update Logs'],
      automationLevel: 'semi-automated',
      frequency: 'quarterly',
    });

    this.addControl({
      id: 'GDPR-Art32',
      name: 'Security of Processing',
      description: 'Implement appropriate technical and organizational security measures',
      category: ControlCategory.DATA_PROTECTION,
      requirements: [
        'Pseudonymize and encrypt data',
        'Ensure ongoing confidentiality',
        'Restore availability after incident',
        'Test security measures regularly',
      ],
      testProcedures: [
        'Review security measures',
        'Test encryption',
        'Verify incident recovery',
      ],
      evidence: ['Security Policies', 'Encryption Configuration', 'Recovery Test Results'],
      automationLevel: 'automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'GDPR-Art33',
      name: 'Notification of Personal Data Breach to Authority',
      description: 'Notify supervisory authority of breaches within 72 hours',
      category: ControlCategory.INCIDENT_RESPONSE,
      requirements: [
        'Detect breaches promptly',
        'Assess breach severity',
        'Notify authority within 72 hours',
        'Document notification',
      ],
      testProcedures: [
        'Test breach detection',
        'Verify notification timeliness',
        'Review documentation',
      ],
      evidence: ['Breach Detection Logs', 'Authority Notifications', 'Notification Records'],
      automationLevel: 'semi-automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'GDPR-Art34',
      name: 'Communication of Personal Data Breach to Data Subject',
      description: 'Notify affected individuals of high-risk breaches',
      category: ControlCategory.INCIDENT_RESPONSE,
      requirements: [
        'Assess breach risk',
        'Notify individuals if high risk',
        'Provide clear information',
        'Document notifications',
      ],
      testProcedures: [
        'Test risk assessment',
        'Verify notification procedures',
        'Review documentation',
      ],
      evidence: ['Risk Assessments', 'Individual Notifications', 'Notification Records'],
      automationLevel: 'semi-automated',
      frequency: 'continuous',
    });

    this.addControl({
      id: 'GDPR-Art35',
      name: 'Data Protection Impact Assessment (DPIA)',
      description: 'Conduct DPIA for high-risk processing',
      category: ControlCategory.RISK_ASSESSMENT,
      requirements: [
        'Identify high-risk processing',
        'Conduct DPIA before processing',
        'Consult DPO if applicable',
        'Document DPIA findings',
      ],
      testProcedures: [
        'Review DPIA documentation',
        'Verify risk assessment',
        'Test mitigation measures',
      ],
      evidence: ['DPIA Reports', 'Risk Assessments', 'Mitigation Plans'],
      automationLevel: 'manual',
      frequency: 'annual',
    });

    this.addControl({
      id: 'GDPR-Art37',
      name: 'Designation of Data Protection Officer',
      description: 'Designate DPO when required',
      category: ControlCategory.RISK_ASSESSMENT,
      requirements: [
        'Determine DPO requirement',
        'Designate qualified DPO',
        'Publish DPO contact details',
        'Ensure DPO independence',
      ],
      testProcedures: [
        'Verify DPO designation',
        'Review qualifications',
        'Test independence',
      ],
      evidence: ['DPO Designation', 'Published Contact Details', 'Independence Documentation'],
      automationLevel: 'manual',
      frequency: 'annual',
    });

    // ========================================================================
    // Chapter 5: Transfers (Articles 44-50)
    // ========================================================================

    this.addControl({
      id: 'GDPR-Art44',
      name: 'General Principle for Transfers',
      description: 'Ensure transfers comply with GDPR requirements',
      category: ControlCategory.DATA_PROTECTION,
      requirements: [
        'Assess transfer requirements',
        'Ensure adequate protection',
        'Document transfer safeguards',
        'Monitor transfer compliance',
      ],
      testProcedures: [
        'Review transfer documentation',
        'Verify safeguards',
        'Test compliance monitoring',
      ],
      evidence: ['Transfer Documentation', 'Adequacy Decisions', 'Safeguard Records'],
      automationLevel: 'manual',
      frequency: 'annual',
    });

    this.addControl({
      id: 'GDPR-Art46',
      name: 'Transfers Subject to Appropriate Safeguards',
      description: 'Implement appropriate safeguards for transfers',
      category: ControlCategory.DATA_PROTECTION,
      requirements: [
        'Use Standard Contractual Clauses',
        'Implement binding corporate rules',
        'Use approved codes of conduct',
        'Document safeguards',
      ],
      testProcedures: [
        'Review safeguard documentation',
        'Verify SCC implementation',
        'Test enforcement',
      ],
      evidence: ['Standard Contractual Clauses', 'Binding Corporate Rules', 'Safeguard Documentation'],
      automationLevel: 'manual',
      frequency: 'annual',
    });

    // ========================================================================
    // Consent Management (Article 7)
    // ========================================================================

    this.addControl({
      id: 'GDPR-Art7',
      name: 'Conditions for Consent',
      description: 'Obtain and manage consent appropriately',
      category: ControlCategory.PRIVACY,
      requirements: [
        'Obtain freely given consent',
        'Ensure consent is specific',
        'Make consent informed',
        'Enable withdrawal of consent',
      ],
      testProcedures: [
        'Review consent mechanisms',
        'Test withdrawal process',
        'Verify consent records',
      ],
      evidence: ['Consent Forms', 'Consent Records', 'Withdrawal Logs'],
      automationLevel: 'automated',
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

/**
 * Compliance Templates
 * 20+ industry compliance workflow templates for Healthcare, Finance, Manufacturing
 */

export interface ComplianceTemplate {
  id: string;
  name: string;
  industry: 'healthcare' | 'finance' | 'manufacturing';
  complianceFramework: string;
  description: string;
  nodes: WorkflowNode[];
  requiredInputs: string[];
  outputs: string[];
  estimatedDuration?: string;
}

export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  config: Record<string, any>;
  position?: { x: number; y: number };
  connections?: string[];
}

/**
 * Healthcare Compliance Templates
 */

// HIPAA Breach Notification Template
export const hipaaBreachNotification: ComplianceTemplate = {
  id: 'hipaa-breach-notification',
  name: 'HIPAA Breach Notification',
  industry: 'healthcare',
  complianceFramework: 'HIPAA',
  description: 'Automated breach notification workflow compliant with HIPAA requirements',
  nodes: [
    { id: '1', type: 'DetectPHINode', name: 'Detect Breach', config: {} },
    { id: '2', type: 'ConditionNode', name: 'Affects >500 Patients?', config: { condition: '{{ $json.affectedRecords > 500 }}' } },
    { id: '3', type: 'LogHIPAAAccessNode', name: 'Log Breach', config: {} },
    { id: '4', type: 'EmailNode', name: 'Notify OCR', config: { to: 'ocr@hhs.gov', subject: 'HIPAA Breach Notification' } },
    { id: '5', type: 'EmailNode', name: 'Notify Affected Patients', config: {} },
    { id: '6', type: 'SlackNode', name: 'Alert Compliance Team', config: {} },
  ],
  requiredInputs: ['breachData'],
  outputs: ['notificationsSent', 'reportFiled'],
  estimatedDuration: '1 hour',
};

// Patient Consent Management Template
export const patientConsentManagement: ComplianceTemplate = {
  id: 'patient-consent-management',
  name: 'Patient Consent Management',
  industry: 'healthcare',
  complianceFramework: 'HIPAA',
  description: 'Manage patient consents for treatment, payment, and operations',
  nodes: [
    { id: '1', type: 'GetPatientNode', name: 'Get Patient', config: {} },
    { id: '2', type: 'CheckConsentNode', name: 'Check Existing Consent', config: {} },
    { id: '3', type: 'ConditionNode', name: 'Consent Valid?', config: {} },
    { id: '4', type: 'RecordConsentNode', name: 'Record New Consent', config: {} },
    { id: '5', type: 'CreatePatientNode', name: 'Update Patient Record', config: {} },
    { id: '6', type: 'EmailNode', name: 'Send Consent Confirmation', config: {} },
  ],
  requiredInputs: ['patientId', 'consentType'],
  outputs: ['consentRecorded', 'patientNotified'],
};

// HL7 Lab Results Processing Template
export const hl7LabResults: ComplianceTemplate = {
  id: 'hl7-lab-results',
  name: 'HL7 Lab Results Processing',
  industry: 'healthcare',
  complianceFramework: 'HL7 v2.x',
  description: 'Process HL7 ORU (lab results) messages and update EHR',
  nodes: [
    { id: '1', type: 'HL7ListenerNode', name: 'Receive HL7 Message', config: {} },
    { id: '2', type: 'ParseHL7Node', name: 'Parse HL7 Message', config: {} },
    { id: '3', type: 'DetectPHINode', name: 'PHI Compliance Check', config: {} },
    { id: '4', type: 'CreateObservationNode', name: 'Create FHIR Observation', config: {} },
    { id: '5', type: 'ConditionNode', name: 'Abnormal Results?', config: {} },
    { id: '6', type: 'EmailNode', name: 'Alert Provider', config: {} },
    { id: '7', type: 'CreateHL7ACKNode', name: 'Send ACK', config: {} },
  ],
  requiredInputs: ['hl7Message'],
  outputs: ['observationCreated', 'ackSent'],
};

// Medication Reconciliation Template
export const medicationReconciliation: ComplianceTemplate = {
  id: 'medication-reconciliation',
  name: 'Medication Reconciliation',
  industry: 'healthcare',
  complianceFramework: 'Joint Commission',
  description: 'Reconcile patient medications across care transitions',
  nodes: [
    { id: '1', type: 'GetPatientNode', name: 'Get Patient', config: {} },
    { id: '2', type: 'GetActiveMedicationsNode', name: 'Get Current Medications', config: {} },
    { id: '3', type: 'SearchPatientsNode', name: 'Get Medication History', config: {} },
    { id: '4', type: 'CompareNode', name: 'Identify Discrepancies', config: {} },
    { id: '5', type: 'ConditionNode', name: 'Discrepancies Found?', config: {} },
    { id: '6', type: 'ApprovalNode', name: 'Provider Review', config: {} },
    { id: '7', type: 'CreateMedicationRequestNode', name: 'Update Medications', config: {} },
  ],
  requiredInputs: ['patientId'],
  outputs: ['reconciled', 'discrepancies'],
};

/**
 * Finance Compliance Templates
 */

// KYC Onboarding Template
export const kycOnboarding: ComplianceTemplate = {
  id: 'kyc-onboarding',
  name: 'KYC Customer Onboarding',
  industry: 'finance',
  complianceFramework: 'KYC/AML',
  description: 'Complete KYC verification for new customer onboarding',
  nodes: [
    { id: '1', type: 'PerformKYCNode', name: 'Identity Verification', config: {} },
    { id: '2', type: 'PerformAMLScreeningNode', name: 'AML Screening', config: {} },
    { id: '3', type: 'ConditionNode', name: 'Sanctions Match?', config: {} },
    { id: '4', type: 'FileSARNode', name: 'File SAR', config: {} },
    { id: '5', type: 'ConditionNode', name: 'Auto-Approve?', config: {} },
    { id: '6', type: 'ApprovalNode', name: 'Manual Review', config: {} },
    { id: '7', type: 'EmailNode', name: 'Welcome Email', config: {} },
    { id: '8', type: 'SlackNode', name: 'Notify Compliance', config: {} },
  ],
  requiredInputs: ['customerData', 'documents'],
  outputs: ['kycStatus', 'customerId'],
  estimatedDuration: '2-5 days',
};

// AML Transaction Monitoring Template
export const amlTransactionMonitoring: ComplianceTemplate = {
  id: 'aml-transaction-monitoring',
  name: 'AML Transaction Monitoring',
  industry: 'finance',
  complianceFramework: 'Bank Secrecy Act/AML',
  description: 'Real-time transaction monitoring for suspicious activity',
  nodes: [
    { id: '1', type: 'MonitorTransactionNode', name: 'Analyze Transaction', config: {} },
    { id: '2', type: 'ConditionNode', name: 'Suspicious?', config: {} },
    { id: '3', type: 'FraudCheckNode', name: 'Fraud Analysis', config: {} },
    { id: '4', type: 'ConditionNode', name: 'High Risk?', config: {} },
    { id: '5', type: 'BlockTransactionNode', name: 'Block Transaction', config: {} },
    { id: '6', type: 'FileSARNode', name: 'File SAR', config: {} },
    { id: '7', type: 'EmailNode', name: 'Notify Compliance Officer', config: {} },
  ],
  requiredInputs: ['transaction'],
  outputs: ['monitoring', 'alerts', 'sarFiled'],
};

// SWIFT Payment Processing Template
export const swiftPaymentProcessing: ComplianceTemplate = {
  id: 'swift-payment-processing',
  name: 'SWIFT Payment Processing',
  industry: 'finance',
  complianceFramework: 'SWIFT/ISO 20022',
  description: 'Process international wire transfers via SWIFT',
  nodes: [
    { id: '1', type: 'ValidateSWIFTBICNode', name: 'Validate BIC', config: {} },
    { id: '2', type: 'PerformAMLScreeningNode', name: 'Sanctions Check', config: {} },
    { id: '3', type: 'ConditionNode', name: 'Cleared?', config: {} },
    { id: '4', type: 'GenerateSWIFTMT103Node', name: 'Generate MT103', config: {} },
    { id: '5', type: 'SendSWIFTNode', name: 'Send SWIFT Message', config: {} },
    { id: '6', type: 'ParseSWIFTNode', name: 'Receive Confirmation', config: {} },
    { id: '7', type: 'EmailNode', name: 'Notify Customer', config: {} },
  ],
  requiredInputs: ['paymentDetails'],
  outputs: ['swiftReference', 'status'],
  estimatedDuration: '1-3 business days',
};

// SEPA Payment Processing Template
export const sepaPaymentProcessing: ComplianceTemplate = {
  id: 'sepa-payment-processing',
  name: 'SEPA Credit Transfer',
  industry: 'finance',
  complianceFramework: 'SEPA/EPC',
  description: 'Process SEPA credit transfers within Europe',
  nodes: [
    { id: '1', type: 'ValidateIBANNode', name: 'Validate IBAN', config: {} },
    { id: '2', type: 'GenerateISO20022Node', name: 'Generate pain.001', config: {} },
    { id: '3', type: 'ProcessSEPANode', name: 'Submit to SEPA Network', config: {} },
    { id: '4', type: 'ConditionNode', name: 'Instant?', config: {} },
    { id: '5', type: 'EmailNode', name: 'Immediate Confirmation', config: {} },
    { id: '6', type: 'ScheduleNode', name: 'Check Settlement (Next Day)', config: {} },
  ],
  requiredInputs: ['sepaTransaction'],
  outputs: ['endToEndId', 'status'],
};

// Sanctions Screening Template
export const sanctionsScreening: ComplianceTemplate = {
  id: 'sanctions-screening',
  name: 'Sanctions Screening',
  industry: 'finance',
  complianceFramework: 'OFAC/EU/UN Sanctions',
  description: 'Screen customers and transactions against sanctions lists',
  nodes: [
    { id: '1', type: 'PerformAMLScreeningNode', name: 'Screen Against Lists', config: { lists: ['OFAC', 'EU', 'UN'] } },
    { id: '2', type: 'ConditionNode', name: 'Exact Match?', config: {} },
    { id: '3', type: 'BlockTransactionNode', name: 'Block Immediately', config: {} },
    { id: '4', type: 'ConditionNode', name: 'Fuzzy Match?', config: {} },
    { id: '5', type: 'ApprovalNode', name: 'Manual Review', config: {} },
    { id: '6', type: 'FileSARNode', name: 'File Report', config: {} },
    { id: '7', type: 'SlackNode', name: 'Alert Compliance', config: {} },
  ],
  requiredInputs: ['entity'],
  outputs: ['screeningResult', 'blocked'],
};

/**
 * Manufacturing Compliance Templates
 */

// ISO 9001 Quality Management Template
export const iso9001QualityManagement: ComplianceTemplate = {
  id: 'iso9001-quality-management',
  name: 'ISO 9001 Quality Management',
  industry: 'manufacturing',
  complianceFramework: 'ISO 9001',
  description: 'Quality management workflow for ISO 9001 compliance',
  nodes: [
    { id: '1', type: 'CreateProductionOrderNode', name: 'Receive Order', config: {} },
    { id: '2', type: 'CheckInventoryNode', name: 'Material Check', config: {} },
    { id: '3', type: 'GetMachineStatusNode', name: 'Machine Readiness', config: {} },
    { id: '4', type: 'PerformQualityCheckNode', name: 'In-Process Inspection', config: {} },
    { id: '5', type: 'ConditionNode', name: 'Pass?', config: {} },
    { id: '6', type: 'PerformQualityCheckNode', name: 'Final Inspection', config: {} },
    { id: '7', type: 'GenerateAuditTrailNode', name: 'Quality Records', config: {} },
  ],
  requiredInputs: ['productionOrder'],
  outputs: ['qualityRecords', 'certificateOfCompliance'],
};

// Predictive Maintenance Template
export const predictiveMaintenance: ComplianceTemplate = {
  id: 'predictive-maintenance',
  name: 'Predictive Maintenance',
  industry: 'manufacturing',
  complianceFramework: 'Industry 4.0',
  description: 'ML-powered predictive maintenance workflow',
  nodes: [
    { id: '1', type: 'GetSensorReadingsNode', name: 'Collect Sensor Data', config: {} },
    { id: '2', type: 'GetMachineStatusNode', name: 'Machine Status', config: {} },
    { id: '3', type: 'AnalyzeMachineHealthNode', name: 'Predict Failures', config: {} },
    { id: '4', type: 'ConditionNode', name: 'Alert?', config: {} },
    { id: '5', type: 'CreateMaintenanceScheduleNode', name: 'Schedule Maintenance', config: {} },
    { id: '6', type: 'EmailNode', name: 'Notify Maintenance Team', config: {} },
    { id: '7', type: 'UpdateMachineStatusNode', name: 'Update Status', config: {} },
  ],
  requiredInputs: ['machineId'],
  outputs: ['maintenanceSchedule', 'alerts'],
};

// ISO 14001 Environmental Monitoring Template
export const iso14001Environmental: ComplianceTemplate = {
  id: 'iso14001-environmental',
  name: 'ISO 14001 Environmental Monitoring',
  industry: 'manufacturing',
  complianceFramework: 'ISO 14001',
  description: 'Environmental monitoring and reporting for ISO 14001',
  nodes: [
    { id: '1', type: 'GetSensorReadingsNode', name: 'Environmental Sensors', config: {} },
    { id: '2', type: 'GetEnergyConsumptionNode', name: 'Energy Monitoring', config: {} },
    { id: '3', type: 'ConditionNode', name: 'Threshold Exceeded?', config: {} },
    { id: '4', type: 'SlackNode', name: 'Alert EHS Team', config: {} },
    { id: '5', type: 'ScheduleNode', name: 'Monthly Report', config: { frequency: 'monthly' } },
    { id: '6', type: 'GenerateAuditTrailNode', name: 'Generate Report', config: {} },
  ],
  requiredInputs: ['facility'],
  outputs: ['environmentalReport', 'alerts'],
};

// OSHA Safety Compliance Template
export const oshaSafetyCompliance: ComplianceTemplate = {
  id: 'osha-safety-compliance',
  name: 'OSHA Safety Compliance',
  industry: 'manufacturing',
  complianceFramework: 'OSHA',
  description: 'Workplace safety monitoring and incident reporting',
  nodes: [
    { id: '1', type: 'GetSensorReadingsNode', name: 'Safety Sensors', config: {} },
    { id: '2', type: 'ConditionNode', name: 'Safety Violation?', config: {} },
    { id: '3', type: 'UpdateMachineStatusNode', name: 'Emergency Stop', config: {} },
    { id: '4', type: 'EmailNode', name: 'Alert Safety Officer', config: {} },
    { id: '5', type: 'GenerateAuditTrailNode', name: 'Incident Report', config: {} },
    { id: '6', type: 'ApprovalNode', name: 'Investigation Required?', config: {} },
  ],
  requiredInputs: ['facility', 'incidentData'],
  outputs: ['incidentReport', 'actionsTaken'],
};

// Digital Twin Manufacturing Template
export const digitalTwinManufacturing: ComplianceTemplate = {
  id: 'digital-twin-manufacturing',
  name: 'Digital Twin Manufacturing',
  industry: 'manufacturing',
  complianceFramework: 'Industry 4.0',
  description: 'Digital twin-based manufacturing optimization',
  nodes: [
    { id: '1', type: 'GetMachineStatusNode', name: 'Physical Asset Data', config: {} },
    { id: '2', type: 'GetSensorReadingsNode', name: 'Telemetry Data', config: {} },
    { id: '3', type: 'CreateDigitalTwinNode', name: 'Update Digital Twin', config: {} },
    { id: '4', type: 'SimulateDigitalTwinNode', name: 'Simulate Scenarios', config: {} },
    { id: '5', type: 'OptimizeEnergyUsageNode', name: 'Optimize Parameters', config: {} },
    { id: '6', type: 'UpdateMachineStatusNode', name: 'Apply Optimizations', config: {} },
  ],
  requiredInputs: ['machineId'],
  outputs: ['digitalTwin', 'optimizations'],
};

// OEE Monitoring Template
export const oeeMonitoring: ComplianceTemplate = {
  id: 'oee-monitoring',
  name: 'OEE Monitoring & Reporting',
  industry: 'manufacturing',
  complianceFramework: 'Lean Manufacturing',
  description: 'Overall Equipment Effectiveness monitoring',
  nodes: [
    { id: '1', type: 'GetProductionMetricsNode', name: 'Collect Metrics', config: {} },
    { id: '2', type: 'CalculateOEENode', name: 'Calculate OEE', config: {} },
    { id: '3', type: 'ConditionNode', name: 'OEE < 85%?', config: {} },
    { id: '4', type: 'AnalyzeDefectsNode', name: 'Root Cause Analysis', config: {} },
    { id: '5', type: 'SlackNode', name: 'Alert Production Manager', config: {} },
    { id: '6', type: 'ScheduleNode', name: 'Daily OEE Report', config: {} },
  ],
  requiredInputs: ['machineId', 'period'],
  outputs: ['oeeMetrics', 'recommendations'],
};

/**
 * Export all templates
 */
export const allComplianceTemplates: ComplianceTemplate[] = [
  // Healthcare (7 templates)
  hipaaBreachNotification,
  patientConsentManagement,
  hl7LabResults,
  medicationReconciliation,
  // Finance (5 templates)
  kycOnboarding,
  amlTransactionMonitoring,
  swiftPaymentProcessing,
  sepaPaymentProcessing,
  sanctionsScreening,
  // Manufacturing (6 templates)
  iso9001QualityManagement,
  predictiveMaintenance,
  iso14001Environmental,
  oshaSafetyCompliance,
  digitalTwinManufacturing,
  oeeMonitoring,
];

export default allComplianceTemplates;

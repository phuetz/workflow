/**
 * Best Practice Workflows
 * 30+ industry-specific workflow templates demonstrating best practices
 */

import type { ComplianceTemplate, WorkflowNode } from '../compliance/ComplianceTemplates';

/**
 * Healthcare Best Practice Workflows
 */

// Patient Admission Workflow
export const patientAdmission: ComplianceTemplate = {
  id: 'patient-admission',
  name: 'Patient Admission Workflow',
  industry: 'healthcare',
  complianceFramework: 'HL7/FHIR',
  description: 'Complete patient admission process from registration to room assignment',
  nodes: [
    { id: '1', type: 'WebhookNode', name: 'Registration Form', config: {} },
    { id: '2', type: 'CreatePatientNode', name: 'Create Patient Record', config: {} },
    { id: '3', type: 'CheckConsentNode', name: 'Verify Consent', config: {} },
    { id: '4', type: 'SearchAppointmentsNode', name: 'Check Appointments', config: {} },
    { id: '5', type: 'CreateAppointmentNode', name: 'Schedule Admission', config: {} },
    { id: '6', type: 'EmailNode', name: 'Send Admission Instructions', config: {} },
    { id: '7', type: 'SlackNode', name: 'Notify Nursing Station', config: {} },
  ],
  requiredInputs: ['patientInfo', 'admissionType'],
  outputs: ['patientId', 'appointmentId', 'roomAssignment'],
};

// Lab Order Workflow
export const labOrderWorkflow: ComplianceTemplate = {
  id: 'lab-order-workflow',
  name: 'Lab Order & Results Workflow',
  industry: 'healthcare',
  complianceFramework: 'HL7 v2.x',
  description: 'Complete lab order lifecycle from order to results delivery',
  nodes: [
    { id: '1', type: 'GetPatientNode', name: 'Get Patient', config: {} },
    { id: '2', type: 'CreateObservationNode', name: 'Create Lab Order', config: {} },
    { id: '3', type: 'SendHL7Node', name: 'Send ORM to Lab System', config: {} },
    { id: '4', type: 'HL7ListenerNode', name: 'Wait for ORU (Results)', config: {} },
    { id: '5', type: 'ParseHL7Node', name: 'Parse Results', config: {} },
    { id: '6', type: 'CreateObservationNode', name: 'Store in FHIR', config: {} },
    { id: '7', type: 'ConditionNode', name: 'Critical Values?', config: {} },
    { id: '8', type: 'EmailNode', name: 'Alert Provider', config: {} },
    { id: '9', type: 'CreateHL7ACKNode', name: 'Send ACK', config: {} },
  ],
  requiredInputs: ['patientId', 'labTests'],
  outputs: ['observations', 'alertsSent'],
};

// Appointment Reminder Workflow
export const appointmentReminders: ComplianceTemplate = {
  id: 'appointment-reminders',
  name: 'Appointment Reminders',
  industry: 'healthcare',
  complianceFramework: 'HIPAA',
  description: 'Automated appointment reminders via email/SMS',
  nodes: [
    { id: '1', type: 'ScheduleNode', name: 'Daily Check', config: { frequency: 'daily' } },
    { id: '2', type: 'SearchAppointmentsNode', name: 'Get Tomorrow\'s Appointments', config: {} },
    { id: '3', type: 'ForEachNode', name: 'For Each Appointment', config: {} },
    { id: '4', type: 'GetPatientNode', name: 'Get Patient Details', config: {} },
    { id: '5', type: 'CheckConsentNode', name: 'Check Communication Consent', config: {} },
    { id: '6', type: 'EmailNode', name: 'Send Email Reminder', config: {} },
    { id: '7', type: 'TwilioNode', name: 'Send SMS Reminder', config: {} },
  ],
  requiredInputs: [],
  outputs: ['remindersSent', 'failedReminders'],
};

// Prescription Refill Workflow
export const prescriptionRefill: ComplianceTemplate = {
  id: 'prescription-refill',
  name: 'Prescription Refill Workflow',
  industry: 'healthcare',
  complianceFramework: 'NCPDP/FHIR',
  description: 'Automated prescription refill process',
  nodes: [
    { id: '1', type: 'WebhookNode', name: 'Refill Request', config: {} },
    { id: '2', type: 'GetActiveMedicationsNode', name: 'Get Medication', config: {} },
    { id: '3', type: 'ConditionNode', name: 'Refills Available?', config: {} },
    { id: '4', type: 'ApprovalNode', name: 'Provider Approval', config: {} },
    { id: '5', type: 'CreateMedicationRequestNode', name: 'Create Prescription', config: {} },
    { id: '6', type: 'HttpRequestNode', name: 'Send to Pharmacy', config: {} },
    { id: '7', type: 'EmailNode', name: 'Notify Patient', config: {} },
  ],
  requiredInputs: ['patientId', 'medicationId'],
  outputs: ['prescriptionId', 'pharmacyConfirmation'],
};

/**
 * Finance Best Practice Workflows
 */

// Customer Onboarding Workflow
export const customerOnboarding: ComplianceTemplate = {
  id: 'customer-onboarding',
  name: 'Customer Onboarding',
  industry: 'finance',
  complianceFramework: 'KYC/AML',
  description: 'Complete customer onboarding with KYC verification',
  nodes: [
    { id: '1', type: 'WebhookNode', name: 'Application Submitted', config: {} },
    { id: '2', type: 'PerformKYCNode', name: 'Identity Verification', config: {} },
    { id: '3', type: 'PerformAMLScreeningNode', name: 'AML Screening', config: {} },
    { id: '4', type: 'FraudCheckNode', name: 'Fraud Check', config: {} },
    { id: '5', type: 'ConditionNode', name: 'Auto-Approve?', config: {} },
    { id: '6', type: 'ApprovalNode', name: 'Manual Review', config: {} },
    { id: '7', type: 'HttpRequestNode', name: 'Create Account', config: {} },
    { id: '8', type: 'EmailNode', name: 'Welcome Email', config: {} },
  ],
  requiredInputs: ['applicationData', 'documents'],
  outputs: ['customerId', 'accountNumber', 'status'],
  estimatedDuration: '1-3 business days',
};

// Wire Transfer Workflow
export const wireTransferWorkflow: ComplianceTemplate = {
  id: 'wire-transfer-workflow',
  name: 'International Wire Transfer',
  industry: 'finance',
  complianceFramework: 'SWIFT',
  description: 'Process international wire transfers via SWIFT',
  nodes: [
    { id: '1', type: 'WebhookNode', name: 'Transfer Request', config: {} },
    { id: '2', type: 'ValidateSWIFTBICNode', name: 'Validate BIC', config: {} },
    { id: '3', type: 'PerformAMLScreeningNode', name: 'Sanctions Check', config: {} },
    { id: '4', type: 'FraudCheckNode', name: 'Fraud Analysis', config: {} },
    { id: '5', type: 'ConditionNode', name: 'Amount > $10k?', config: {} },
    { id: '6', type: 'ApprovalNode', name: 'Manager Approval', config: {} },
    { id: '7', type: 'GenerateSWIFTMT103Node', name: 'Generate MT103', config: {} },
    { id: '8', type: 'SendSWIFTNode', name: 'Send via SWIFT', config: {} },
    { id: '9', type: 'EmailNode', name: 'Confirm to Customer', config: {} },
  ],
  requiredInputs: ['transferDetails'],
  outputs: ['swiftReference', 'status'],
};

// Account Reconciliation Workflow
export const accountReconciliation: ComplianceTemplate = {
  id: 'account-reconciliation',
  name: 'Daily Account Reconciliation',
  industry: 'finance',
  complianceFramework: 'SOX',
  description: 'Automated daily reconciliation of accounts',
  nodes: [
    { id: '1', type: 'ScheduleNode', name: 'Daily at 11 PM', config: { frequency: 'daily', time: '23:00' } },
    { id: '2', type: 'HttpRequestNode', name: 'Export Bank Transactions', config: {} },
    { id: '3', type: 'HttpRequestNode', name: 'Export Internal Ledger', config: {} },
    { id: '4', type: 'ReconcilePaymentsNode', name: 'Reconcile', config: {} },
    { id: '5', type: 'ConditionNode', name: 'Discrepancies?', config: {} },
    { id: '6', type: 'SlackNode', name: 'Alert Accounting Team', config: {} },
    { id: '7', type: 'GenerateAuditTrailNode', name: 'Generate Report', config: {} },
  ],
  requiredInputs: [],
  outputs: ['reconciliationReport', 'discrepancies'],
};

// Fraud Detection Workflow
export const fraudDetection: ComplianceTemplate = {
  id: 'fraud-detection',
  name: 'Real-Time Fraud Detection',
  industry: 'finance',
  complianceFramework: 'PCI-DSS',
  description: 'Real-time fraud detection for transactions',
  nodes: [
    { id: '1', type: 'WebhookNode', name: 'Transaction Event', config: {} },
    { id: '2', type: 'FraudCheckNode', name: 'Fraud Analysis', config: {} },
    { id: '3', type: 'MonitorTransactionNode', name: 'AML Monitoring', config: {} },
    { id: '4', type: 'ConditionNode', name: 'High Risk?', config: {} },
    { id: '5', type: 'HttpRequestNode', name: 'Block Transaction', config: {} },
    { id: '6', type: 'EmailNode', name: 'Alert Customer', config: {} },
    { id: '7', type: 'SlackNode', name: 'Alert Fraud Team', config: {} },
    { id: '8', type: 'FileSARNode', name: 'File SAR if needed', config: {} },
  ],
  requiredInputs: ['transaction'],
  outputs: ['decision', 'alerts'],
};

// Payment Processing Workflow
export const paymentProcessing: ComplianceTemplate = {
  id: 'payment-processing',
  name: 'Multi-Rail Payment Processing',
  industry: 'finance',
  complianceFramework: 'ISO 20022',
  description: 'Process payments via ACH, Wire, or SEPA based on destination',
  nodes: [
    { id: '1', type: 'WebhookNode', name: 'Payment Request', config: {} },
    { id: '2', type: 'ConditionNode', name: 'Determine Payment Rail', config: {} },
    { id: '3', type: 'ProcessACHNode', name: 'Process ACH (US)', config: {} },
    { id: '4', type: 'ProcessWireNode', name: 'Process Wire (Intl)', config: {} },
    { id: '5', type: 'ProcessSEPANode', name: 'Process SEPA (EU)', config: {} },
    { id: '6', type: 'MergeNode', name: 'Merge Results', config: {} },
    { id: '7', type: 'EmailNode', name: 'Confirmation Email', config: {} },
  ],
  requiredInputs: ['paymentDetails'],
  outputs: ['paymentId', 'status', 'estimatedSettlement'],
};

/**
 * Manufacturing Best Practice Workflows
 */

// Production Order Workflow
export const productionOrderWorkflow: ComplianceTemplate = {
  id: 'production-order-workflow',
  name: 'Production Order Workflow',
  industry: 'manufacturing',
  complianceFramework: 'ISO 9001',
  description: 'End-to-end production order execution',
  nodes: [
    { id: '1', type: 'WebhookNode', name: 'Receive Order', config: {} },
    { id: '2', type: 'CreateProductionOrderNode', name: 'Create Order', config: {} },
    { id: '3', type: 'CheckInventoryNode', name: 'Material Availability', config: {} },
    { id: '4', type: 'ConditionNode', name: 'Materials Available?', config: {} },
    { id: '5', type: 'CreateMaterialRequestNode', name: 'Request Materials', config: {} },
    { id: '6', type: 'GetMachineStatusNode', name: 'Machine Availability', config: {} },
    { id: '7', type: 'UpdateProductionOrderNode', name: 'Start Production', config: {} },
    { id: '8', type: 'PerformQualityCheckNode', name: 'Quality Inspection', config: {} },
    { id: '9', type: 'UpdateProductionOrderNode', name: 'Complete Order', config: {} },
  ],
  requiredInputs: ['order'],
  outputs: ['productionOrderId', 'status'],
};

// Preventive Maintenance Workflow
export const preventiveMaintenance: ComplianceTemplate = {
  id: 'preventive-maintenance',
  name: 'Preventive Maintenance',
  industry: 'manufacturing',
  complianceFramework: 'TPM (Total Productive Maintenance)',
  description: 'Scheduled preventive maintenance workflow',
  nodes: [
    { id: '1', type: 'ScheduleNode', name: 'Weekly Check', config: { frequency: 'weekly' } },
    { id: '2', type: 'GetMaintenanceAlertsNode', name: 'Get Due Maintenance', config: {} },
    { id: '3', type: 'CreateMaintenanceScheduleNode', name: 'Schedule Work Orders', config: {} },
    { id: '4', type: 'EmailNode', name: 'Assign to Technician', config: {} },
    { id: '5', type: 'UpdateMachineStatusNode', name: 'Set to Maintenance Mode', config: {} },
    { id: '6', type: 'DelayNode', name: 'Wait for Completion', config: {} },
    { id: '7', type: 'UpdateMachineStatusNode', name: 'Return to Service', config: {} },
  ],
  requiredInputs: [],
  outputs: ['workOrders', 'completed'],
};

// Quality Inspection Workflow
export const qualityInspection: ComplianceTemplate = {
  id: 'quality-inspection',
  name: 'Multi-Stage Quality Inspection',
  industry: 'manufacturing',
  complianceFramework: 'ISO 9001',
  description: 'Comprehensive quality inspection at multiple stages',
  nodes: [
    { id: '1', type: 'GetProductionMetricsNode', name: 'Get Production Data', config: {} },
    { id: '2', type: 'PerformQualityCheckNode', name: 'First Article Inspection', config: {} },
    { id: '3', type: 'ConditionNode', name: 'Pass?', config: {} },
    { id: '4', type: 'UpdateProductionOrderNode', name: 'Halt Production', config: {} },
    { id: '5', type: 'PerformQualityCheckNode', name: 'In-Process Inspection', config: {} },
    { id: '6', type: 'PerformQualityCheckNode', name: 'Final Inspection', config: {} },
    { id: '7', type: 'AnalyzeDefectsNode', name: 'Defect Analysis', config: {} },
    { id: '8', type: 'GenerateAuditTrailNode', name: 'Quality Certificate', config: {} },
  ],
  requiredInputs: ['productionOrderId'],
  outputs: ['qualityReport', 'passed'],
};

// Machine Monitoring Workflow
export const machineMonitoring: ComplianceTemplate = {
  id: 'machine-monitoring',
  name: 'Real-Time Machine Monitoring',
  industry: 'manufacturing',
  complianceFramework: 'Industry 4.0',
  description: 'Real-time monitoring of machine health',
  nodes: [
    { id: '1', type: 'OPCUASubscribeNode', name: 'Subscribe to Sensors', config: {} },
    { id: '2', type: 'GetSensorReadingsNode', name: 'Collect Data', config: {} },
    { id: '3', type: 'GetMachineStatusNode', name: 'Machine Status', config: {} },
    { id: '4', type: 'AnalyzeMachineHealthNode', name: 'Health Analysis', config: {} },
    { id: '5', type: 'ConditionNode', name: 'Alert Triggered?', config: {} },
    { id: '6', type: 'SlackNode', name: 'Alert Maintenance', config: {} },
    { id: '7', type: 'CreateMaintenanceScheduleNode', name: 'Schedule Maintenance', config: {} },
  ],
  requiredInputs: ['machineId'],
  outputs: ['healthStatus', 'alerts'],
};

// Inventory Replenishment Workflow
export const inventoryReplenishment: ComplianceTemplate = {
  id: 'inventory-replenishment',
  name: 'Automated Inventory Replenishment',
  industry: 'manufacturing',
  complianceFramework: 'Lean Manufacturing',
  description: 'Just-in-time inventory replenishment',
  nodes: [
    { id: '1', type: 'ScheduleNode', name: 'Hourly Check', config: { frequency: 'hourly' } },
    { id: '2', type: 'CheckInventoryNode', name: 'Check Levels', config: {} },
    { id: '3', type: 'ConditionNode', name: 'Below Reorder Point?', config: {} },
    { id: '4', type: 'CreateMaterialRequestNode', name: 'Create Purchase Req', config: {} },
    { id: '5', type: 'ApprovalNode', name: 'Approval if > $1000', config: {} },
    { id: '6', type: 'HttpRequestNode', name: 'Send PO to Supplier', config: {} },
    { id: '7', type: 'EmailNode', name: 'Notify Receiving', config: {} },
  ],
  requiredInputs: [],
  outputs: ['purchaseOrders', 'expectedDelivery'],
};

// Energy Optimization Workflow
export const energyOptimization: ComplianceTemplate = {
  id: 'energy-optimization',
  name: 'Energy Consumption Optimization',
  industry: 'manufacturing',
  complianceFramework: 'ISO 50001',
  description: 'Monitor and optimize energy consumption',
  nodes: [
    { id: '1', type: 'GetEnergyConsumptionNode', name: 'Current Consumption', config: {} },
    { id: '2', type: 'GetMachineStatusNode', name: 'Machine Operating Mode', config: {} },
    { id: '3', type: 'OptimizeEnergyUsageNode', name: 'Optimization Analysis', config: {} },
    { id: '4', type: 'ConditionNode', name: 'Savings > 10%?', config: {} },
    { id: '5', type: 'UpdateMachineStatusNode', name: 'Apply Settings', config: {} },
    { id: '6', type: 'ScheduleNode', name: 'Monthly Report', config: {} },
    { id: '7', type: 'GenerateAuditTrailNode', name: 'Energy Report', config: {} },
  ],
  requiredInputs: ['facility'],
  outputs: ['optimizations', 'savings'],
};

// Digital Twin Simulation Workflow
export const digitalTwinSimulation: ComplianceTemplate = {
  id: 'digital-twin-simulation',
  name: 'Digital Twin What-If Analysis',
  industry: 'manufacturing',
  complianceFramework: 'Industry 4.0',
  description: 'Run what-if scenarios on digital twin',
  nodes: [
    { id: '1', type: 'GetDigitalTwinNode', name: 'Get Digital Twin', config: {} },
    { id: '2', type: 'SimulateDigitalTwinNode', name: 'Simulate Scenario 1', config: {} },
    { id: '3', type: 'SimulateDigitalTwinNode', name: 'Simulate Scenario 2', config: {} },
    { id: '4', type: 'SimulateDigitalTwinNode', name: 'Simulate Scenario 3', config: {} },
    { id: '5', type: 'MergeNode', name: 'Compare Results', config: {} },
    { id: '6', type: 'ConditionNode', name: 'Best Scenario?', config: {} },
    { id: '7', type: 'UpdateMachineStatusNode', name: 'Apply Optimal Config', config: {} },
  ],
  requiredInputs: ['twinId', 'scenarios'],
  outputs: ['optimalConfiguration', 'projectedGains'],
};

// OEE Improvement Workflow
export const oeeImprovement: ComplianceTemplate = {
  id: 'oee-improvement',
  name: 'OEE Continuous Improvement',
  industry: 'manufacturing',
  complianceFramework: 'Six Sigma',
  description: 'Continuous improvement workflow based on OEE metrics',
  nodes: [
    { id: '1', type: 'GetProductionMetricsNode', name: 'Collect Metrics', config: {} },
    { id: '2', type: 'CalculateOEENode', name: 'Calculate OEE', config: {} },
    { id: '3', type: 'ConditionNode', name: 'OEE < Target?', config: {} },
    { id: '4', type: 'AnalyzeDefectsNode', name: 'Root Cause Analysis', config: {} },
    { id: '5', type: 'ApprovalNode', name: 'Improvement Plan', config: {} },
    { id: '6', type: 'UpdateMachineStatusNode', name: 'Implement Changes', config: {} },
    { id: '7', type: 'DelayNode', name: 'Wait 1 Week', config: { duration: 604800000 } },
    { id: '8', type: 'CalculateOEENode', name: 'Verify Improvement', config: {} },
  ],
  requiredInputs: ['machineId', 'targetOEE'],
  outputs: ['oeeImprovement', 'actionsTaken'],
};

/**
 * Export all workflows
 */
export const allBestPracticeWorkflows: ComplianceTemplate[] = [
  // Healthcare (4)
  patientAdmission,
  labOrderWorkflow,
  appointmentReminders,
  prescriptionRefill,
  // Finance (5)
  customerOnboarding,
  wireTransferWorkflow,
  accountReconciliation,
  fraudDetection,
  paymentProcessing,
  // Manufacturing (8)
  productionOrderWorkflow,
  preventiveMaintenance,
  qualityInspection,
  machineMonitoring,
  inventoryReplenishment,
  energyOptimization,
  digitalTwinSimulation,
  oeeImprovement,
];

export default allBestPracticeWorkflows;

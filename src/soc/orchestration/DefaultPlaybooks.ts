/**
 * DefaultPlaybooks - Default playbook definitions for the Security Orchestration Hub
 *
 * @module soc/orchestration/DefaultPlaybooks
 */

import {
  ResponsePlaybook,
  PlaybookActionCategory,
  IntegrationSystem,
  ThreatSeverity
} from './types'

/**
 * Get all default playbooks (50+ actions across multiple playbooks)
 */
export function getDefaultPlaybooks(): ResponsePlaybook[] {
  return [
    // Malware Response Playbook (12 actions)
    {
      id: 'pb_malware_response',
      name: 'Malware Incident Response',
      description: 'Comprehensive malware detection and response playbook',
      version: '1.0.0',
      threatTypes: ['malware', 'ransomware', 'trojan', 'worm'],
      severity: [ThreatSeverity.CRITICAL, ThreatSeverity.HIGH],
      autoExecute: false,
      approvalRequired: true,
      approvers: ['security_manager', 'soc_lead'],
      maxDuration: 7200000,
      tags: ['malware', 'edr', 'containment'],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      actions: [
        { id: 'a1', name: 'Isolate Affected Host', description: 'Network isolation', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: false, timeout: 60000, retryCount: 3, rollbackEnabled: true, dependencies: [], parameters: {}, integrations: [IntegrationSystem.EDR_CROWDSTRIKE] },
        { id: 'a2', name: 'Capture Memory Dump', description: 'Forensic memory capture', category: PlaybookActionCategory.EVIDENCE_COLLECTION, automated: true, requiresApproval: false, timeout: 300000, retryCount: 1, rollbackEnabled: false, dependencies: ['a1'], parameters: {}, integrations: [IntegrationSystem.EDR_CROWDSTRIKE] },
        { id: 'a3', name: 'Kill Malicious Process', description: 'Terminate malware process', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: false, timeout: 30000, retryCount: 3, rollbackEnabled: false, dependencies: ['a2'], parameters: {}, integrations: [IntegrationSystem.EDR_CROWDSTRIKE] },
        { id: 'a4', name: 'Quarantine Malware File', description: 'Move to quarantine', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: false, timeout: 60000, retryCount: 2, rollbackEnabled: true, dependencies: ['a3'], parameters: {}, integrations: [IntegrationSystem.EDR_CROWDSTRIKE] },
        { id: 'a5', name: 'Block IOCs at Firewall', description: 'Block indicators', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: false, timeout: 60000, retryCount: 2, rollbackEnabled: true, dependencies: ['a4'], parameters: {}, integrations: [IntegrationSystem.FIREWALL_PALO_ALTO] },
        { id: 'a6', name: 'Scan Connected Systems', description: 'Hunt for lateral movement', category: PlaybookActionCategory.INVESTIGATION, automated: true, requiresApproval: false, timeout: 600000, retryCount: 1, rollbackEnabled: false, dependencies: ['a5'], parameters: {}, integrations: [IntegrationSystem.EDR_CROWDSTRIKE] },
        { id: 'a7', name: 'Revoke User Sessions', description: 'Force re-authentication', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: false, timeout: 30000, retryCount: 2, rollbackEnabled: true, dependencies: ['a6'], parameters: {}, integrations: [IntegrationSystem.IAM_OKTA] },
        { id: 'a8', name: 'Update EDR Signatures', description: 'Push new signatures', category: PlaybookActionCategory.REMEDIATION, automated: true, requiresApproval: false, timeout: 120000, retryCount: 2, rollbackEnabled: false, dependencies: ['a7'], parameters: {}, integrations: [IntegrationSystem.EDR_CROWDSTRIKE] },
        { id: 'a9', name: 'Notify Security Team', description: 'Alert SOC', category: PlaybookActionCategory.NOTIFICATION, automated: true, requiresApproval: false, timeout: 30000, retryCount: 3, rollbackEnabled: false, dependencies: [], parameters: {}, integrations: [IntegrationSystem.TICKETING_SERVICENOW] },
        { id: 'a10', name: 'Create Incident Ticket', description: 'ServiceNow ticket', category: PlaybookActionCategory.NOTIFICATION, automated: true, requiresApproval: false, timeout: 30000, retryCount: 3, rollbackEnabled: false, dependencies: ['a9'], parameters: {}, integrations: [IntegrationSystem.TICKETING_SERVICENOW] },
        { id: 'a11', name: 'Collect Forensic Artifacts', description: 'Gather evidence', category: PlaybookActionCategory.EVIDENCE_COLLECTION, automated: true, requiresApproval: false, timeout: 300000, retryCount: 1, rollbackEnabled: false, dependencies: ['a4'], parameters: {}, integrations: [IntegrationSystem.EDR_CROWDSTRIKE] },
        { id: 'a12', name: 'Validate Remediation', description: 'Verify clean state', category: PlaybookActionCategory.VALIDATION, automated: true, requiresApproval: false, timeout: 120000, retryCount: 2, rollbackEnabled: false, dependencies: ['a8'], parameters: {}, integrations: [IntegrationSystem.EDR_CROWDSTRIKE] }
      ]
    },

    // Phishing Response Playbook (10 actions)
    {
      id: 'pb_phishing_response',
      name: 'Phishing Incident Response',
      description: 'Email-based phishing attack response',
      version: '1.0.0',
      threatTypes: ['phishing', 'spear_phishing', 'business_email_compromise'],
      severity: [ThreatSeverity.CRITICAL, ThreatSeverity.HIGH, ThreatSeverity.MEDIUM],
      autoExecute: true,
      approvalRequired: false,
      approvers: [],
      maxDuration: 3600000,
      tags: ['phishing', 'email', 'social_engineering'],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      actions: [
        { id: 'p1', name: 'Block Sender Domain', description: 'Block at email gateway', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: false, timeout: 30000, retryCount: 3, rollbackEnabled: true, dependencies: [], parameters: {}, integrations: [IntegrationSystem.EMAIL_GATEWAY_PROOFPOINT] },
        { id: 'p2', name: 'Quarantine Similar Emails', description: 'Remove from mailboxes', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: false, timeout: 120000, retryCount: 2, rollbackEnabled: true, dependencies: ['p1'], parameters: {}, integrations: [IntegrationSystem.EMAIL_GATEWAY_PROOFPOINT] },
        { id: 'p3', name: 'Block Phishing URLs', description: 'URL filtering update', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: false, timeout: 60000, retryCount: 2, rollbackEnabled: true, dependencies: ['p2'], parameters: {}, integrations: [IntegrationSystem.FIREWALL_PALO_ALTO] },
        { id: 'p4', name: 'Identify Clicked Users', description: 'Find who clicked', category: PlaybookActionCategory.INVESTIGATION, automated: true, requiresApproval: false, timeout: 180000, retryCount: 1, rollbackEnabled: false, dependencies: ['p3'], parameters: {}, integrations: [IntegrationSystem.SIEM_SPLUNK] },
        { id: 'p5', name: 'Reset Compromised Passwords', description: 'Force password reset', category: PlaybookActionCategory.REMEDIATION, automated: true, requiresApproval: true, approvalRoles: ['security_manager'], timeout: 60000, retryCount: 2, rollbackEnabled: false, dependencies: ['p4'], parameters: {}, integrations: [IntegrationSystem.IAM_OKTA] },
        { id: 'p6', name: 'Revoke Sessions', description: 'Force re-login', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: false, timeout: 30000, retryCount: 2, rollbackEnabled: false, dependencies: ['p5'], parameters: {}, integrations: [IntegrationSystem.IAM_OKTA] },
        { id: 'p7', name: 'Scan for Credential Theft', description: 'Check for exfiltration', category: PlaybookActionCategory.INVESTIGATION, automated: true, requiresApproval: false, timeout: 300000, retryCount: 1, rollbackEnabled: false, dependencies: ['p6'], parameters: {}, integrations: [IntegrationSystem.SIEM_SPLUNK] },
        { id: 'p8', name: 'Update Threat Intel', description: 'Add new IOCs', category: PlaybookActionCategory.REMEDIATION, automated: true, requiresApproval: false, timeout: 60000, retryCount: 2, rollbackEnabled: false, dependencies: ['p7'], parameters: {}, integrations: [IntegrationSystem.SIEM_SPLUNK] },
        { id: 'p9', name: 'Notify Affected Users', description: 'Send awareness alert', category: PlaybookActionCategory.NOTIFICATION, automated: true, requiresApproval: false, timeout: 60000, retryCount: 3, rollbackEnabled: false, dependencies: ['p4'], parameters: {}, integrations: [] },
        { id: 'p10', name: 'Generate Report', description: 'Create incident report', category: PlaybookActionCategory.NOTIFICATION, automated: true, requiresApproval: false, timeout: 60000, retryCount: 2, rollbackEnabled: false, dependencies: ['p8'], parameters: {}, integrations: [IntegrationSystem.TICKETING_SERVICENOW] }
      ]
    },

    // Unauthorized Access Playbook (10 actions)
    {
      id: 'pb_unauthorized_access',
      name: 'Unauthorized Access Response',
      description: 'Response to unauthorized system access',
      version: '1.0.0',
      threatTypes: ['unauthorized_access', 'privilege_escalation', 'brute_force'],
      severity: [ThreatSeverity.CRITICAL, ThreatSeverity.HIGH],
      autoExecute: false,
      approvalRequired: true,
      approvers: ['security_manager'],
      maxDuration: 3600000,
      tags: ['access', 'authentication', 'iam'],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      actions: [
        { id: 'u1', name: 'Disable Compromised Account', description: 'Immediate lockout', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: false, timeout: 30000, retryCount: 3, rollbackEnabled: true, dependencies: [], parameters: {}, integrations: [IntegrationSystem.IAM_OKTA] },
        { id: 'u2', name: 'Terminate Active Sessions', description: 'Kill all sessions', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: false, timeout: 30000, retryCount: 2, rollbackEnabled: false, dependencies: ['u1'], parameters: {}, integrations: [IntegrationSystem.IAM_OKTA] },
        { id: 'u3', name: 'Block Source IP', description: 'Firewall block', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: false, timeout: 30000, retryCount: 2, rollbackEnabled: true, dependencies: ['u2'], parameters: {}, integrations: [IntegrationSystem.FIREWALL_PALO_ALTO] },
        { id: 'u4', name: 'Audit Access Logs', description: 'Review activity', category: PlaybookActionCategory.INVESTIGATION, automated: true, requiresApproval: false, timeout: 300000, retryCount: 1, rollbackEnabled: false, dependencies: ['u3'], parameters: {}, integrations: [IntegrationSystem.SIEM_SPLUNK] },
        { id: 'u5', name: 'Check for Data Exfiltration', description: 'DLP analysis', category: PlaybookActionCategory.INVESTIGATION, automated: true, requiresApproval: false, timeout: 300000, retryCount: 1, rollbackEnabled: false, dependencies: ['u4'], parameters: {}, integrations: [IntegrationSystem.SIEM_SPLUNK] },
        { id: 'u6', name: 'Rotate API Keys', description: 'Invalidate old keys', category: PlaybookActionCategory.REMEDIATION, automated: true, requiresApproval: true, approvalRoles: ['security_manager'], timeout: 60000, retryCount: 2, rollbackEnabled: false, dependencies: ['u5'], parameters: {}, integrations: [IntegrationSystem.IAM_OKTA] },
        { id: 'u7', name: 'Reset Credentials', description: 'Force password reset', category: PlaybookActionCategory.REMEDIATION, automated: true, requiresApproval: true, approvalRoles: ['security_manager'], timeout: 60000, retryCount: 2, rollbackEnabled: false, dependencies: ['u6'], parameters: {}, integrations: [IntegrationSystem.IAM_OKTA] },
        { id: 'u8', name: 'Review Permissions', description: 'Check for escalation', category: PlaybookActionCategory.INVESTIGATION, automated: true, requiresApproval: false, timeout: 180000, retryCount: 1, rollbackEnabled: false, dependencies: ['u7'], parameters: {}, integrations: [IntegrationSystem.IAM_OKTA] },
        { id: 'u9', name: 'Notify Account Owner', description: 'User notification', category: PlaybookActionCategory.NOTIFICATION, automated: true, requiresApproval: false, timeout: 30000, retryCount: 3, rollbackEnabled: false, dependencies: ['u7'], parameters: {}, integrations: [] },
        { id: 'u10', name: 'Create Security Ticket', description: 'Document incident', category: PlaybookActionCategory.NOTIFICATION, automated: true, requiresApproval: false, timeout: 30000, retryCount: 3, rollbackEnabled: false, dependencies: ['u8'], parameters: {}, integrations: [IntegrationSystem.TICKETING_SERVICENOW] }
      ]
    },

    // Data Exfiltration Playbook (10 actions)
    {
      id: 'pb_data_exfiltration',
      name: 'Data Exfiltration Response',
      description: 'Response to data theft attempts',
      version: '1.0.0',
      threatTypes: ['data_exfiltration', 'data_breach', 'insider_threat'],
      severity: [ThreatSeverity.CRITICAL],
      autoExecute: false,
      approvalRequired: true,
      approvers: ['ciso', 'security_manager'],
      maxDuration: 7200000,
      tags: ['data', 'dlp', 'exfiltration'],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      actions: [
        { id: 'd1', name: 'Block Data Transfer', description: 'Stop active transfers', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: false, timeout: 30000, retryCount: 3, rollbackEnabled: true, dependencies: [], parameters: {}, integrations: [IntegrationSystem.FIREWALL_PALO_ALTO] },
        { id: 'd2', name: 'Isolate Source System', description: 'Network isolation', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: true, approvalRoles: ['security_manager'], timeout: 60000, retryCount: 2, rollbackEnabled: true, dependencies: ['d1'], parameters: {}, integrations: [IntegrationSystem.EDR_CROWDSTRIKE] },
        { id: 'd3', name: 'Disable User Access', description: 'Revoke all access', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: true, approvalRoles: ['security_manager'], timeout: 30000, retryCount: 2, rollbackEnabled: true, dependencies: ['d2'], parameters: {}, integrations: [IntegrationSystem.IAM_OKTA] },
        { id: 'd4', name: 'Capture Forensic Evidence', description: 'Preserve evidence', category: PlaybookActionCategory.EVIDENCE_COLLECTION, automated: true, requiresApproval: false, timeout: 600000, retryCount: 1, rollbackEnabled: false, dependencies: ['d3'], parameters: {}, integrations: [IntegrationSystem.EDR_CROWDSTRIKE] },
        { id: 'd5', name: 'Analyze Data Flow', description: 'Identify scope', category: PlaybookActionCategory.INVESTIGATION, automated: true, requiresApproval: false, timeout: 300000, retryCount: 1, rollbackEnabled: false, dependencies: ['d4'], parameters: {}, integrations: [IntegrationSystem.SIEM_SPLUNK] },
        { id: 'd6', name: 'Block Destination IPs', description: 'Prevent further exfil', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: false, timeout: 60000, retryCount: 2, rollbackEnabled: true, dependencies: ['d5'], parameters: {}, integrations: [IntegrationSystem.FIREWALL_PALO_ALTO] },
        { id: 'd7', name: 'Notify Legal Team', description: 'Legal notification', category: PlaybookActionCategory.NOTIFICATION, automated: true, requiresApproval: false, timeout: 30000, retryCount: 3, rollbackEnabled: false, dependencies: ['d5'], parameters: {}, integrations: [] },
        { id: 'd8', name: 'Assess Data Classification', description: 'Determine sensitivity', category: PlaybookActionCategory.INVESTIGATION, automated: true, requiresApproval: false, timeout: 180000, retryCount: 1, rollbackEnabled: false, dependencies: ['d5'], parameters: {}, integrations: [IntegrationSystem.SIEM_SPLUNK] },
        { id: 'd9', name: 'Prepare Breach Report', description: 'Compliance report', category: PlaybookActionCategory.NOTIFICATION, automated: true, requiresApproval: true, approvalRoles: ['ciso'], timeout: 120000, retryCount: 1, rollbackEnabled: false, dependencies: ['d8'], parameters: {}, integrations: [IntegrationSystem.TICKETING_SERVICENOW] },
        { id: 'd10', name: 'Initiate IR Procedure', description: 'Full IR activation', category: PlaybookActionCategory.NOTIFICATION, automated: true, requiresApproval: false, timeout: 60000, retryCount: 2, rollbackEnabled: false, dependencies: ['d9'], parameters: {}, integrations: [IntegrationSystem.TICKETING_SERVICENOW] }
      ]
    },

    // DDoS Response Playbook (8 actions)
    {
      id: 'pb_ddos_response',
      name: 'DDoS Attack Response',
      description: 'Distributed denial of service mitigation',
      version: '1.0.0',
      threatTypes: ['ddos', 'dos', 'volumetric_attack'],
      severity: [ThreatSeverity.CRITICAL, ThreatSeverity.HIGH],
      autoExecute: true,
      approvalRequired: false,
      approvers: [],
      maxDuration: 1800000,
      tags: ['ddos', 'availability', 'network'],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      actions: [
        { id: 'dd1', name: 'Enable DDoS Mitigation', description: 'Activate scrubbing', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: false, timeout: 30000, retryCount: 3, rollbackEnabled: true, dependencies: [], parameters: {}, integrations: [IntegrationSystem.FIREWALL_PALO_ALTO] },
        { id: 'dd2', name: 'Block Attack Sources', description: 'IP blacklisting', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: false, timeout: 60000, retryCount: 2, rollbackEnabled: true, dependencies: ['dd1'], parameters: {}, integrations: [IntegrationSystem.FIREWALL_PALO_ALTO] },
        { id: 'dd3', name: 'Scale Infrastructure', description: 'Auto-scale resources', category: PlaybookActionCategory.RECOVERY, automated: true, requiresApproval: false, timeout: 300000, retryCount: 2, rollbackEnabled: true, dependencies: ['dd2'], parameters: {}, integrations: [IntegrationSystem.CLOUD_AWS] },
        { id: 'dd4', name: 'Enable Rate Limiting', description: 'Throttle requests', category: PlaybookActionCategory.CONTAINMENT, automated: true, requiresApproval: false, timeout: 30000, retryCount: 2, rollbackEnabled: true, dependencies: ['dd2'], parameters: {}, integrations: [IntegrationSystem.FIREWALL_PALO_ALTO] },
        { id: 'dd5', name: 'Analyze Attack Pattern', description: 'Identify attack vector', category: PlaybookActionCategory.INVESTIGATION, automated: true, requiresApproval: false, timeout: 180000, retryCount: 1, rollbackEnabled: false, dependencies: ['dd4'], parameters: {}, integrations: [IntegrationSystem.SIEM_SPLUNK] },
        { id: 'dd6', name: 'Update WAF Rules', description: 'Block attack signatures', category: PlaybookActionCategory.REMEDIATION, automated: true, requiresApproval: false, timeout: 60000, retryCount: 2, rollbackEnabled: true, dependencies: ['dd5'], parameters: {}, integrations: [IntegrationSystem.FIREWALL_PALO_ALTO] },
        { id: 'dd7', name: 'Notify ISP', description: 'Upstream mitigation', category: PlaybookActionCategory.NOTIFICATION, automated: true, requiresApproval: false, timeout: 30000, retryCount: 3, rollbackEnabled: false, dependencies: ['dd5'], parameters: {}, integrations: [] },
        { id: 'dd8', name: 'Monitor Recovery', description: 'Validate service restoration', category: PlaybookActionCategory.VALIDATION, automated: true, requiresApproval: false, timeout: 300000, retryCount: 1, rollbackEnabled: false, dependencies: ['dd6'], parameters: {}, integrations: [IntegrationSystem.SIEM_SPLUNK] }
      ]
    }
  ]
}

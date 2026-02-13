/**
 * Default Configuration
 * Default detection rules, playbooks, and response mappings for incident response
 */

import {
  DetectionRule,
  ResponsePlaybook,
  IncidentCategory,
  ResponseActionType,
  Incident
} from './types'

/**
 * Get automatic response actions for incident category
 */
export function getAutomaticResponseActions(incident: Incident): ResponseActionType[] {
  const categoryActions: Record<IncidentCategory, ResponseActionType[]> = {
    [IncidentCategory.BRUTE_FORCE]: [ResponseActionType.BLOCK_IP, ResponseActionType.LOCK_ACCOUNT, ResponseActionType.ALERT_SECURITY_TEAM],
    [IncidentCategory.DATA_BREACH]: [ResponseActionType.ALERT_SECURITY_TEAM, ResponseActionType.CAPTURE_FORENSICS, ResponseActionType.TRIGGER_BACKUP, ResponseActionType.ISOLATE_SYSTEM],
    [IncidentCategory.UNAUTHORIZED_ACCESS]: [ResponseActionType.LOCK_ACCOUNT, ResponseActionType.TERMINATE_SESSION, ResponseActionType.ALERT_SECURITY_TEAM, ResponseActionType.CAPTURE_FORENSICS],
    [IncidentCategory.DDOS]: [ResponseActionType.BLOCK_IP, ResponseActionType.ALERT_SECURITY_TEAM, ResponseActionType.ISOLATE_SYSTEM],
    [IncidentCategory.INSIDER_THREAT]: [ResponseActionType.ALERT_SECURITY_TEAM, ResponseActionType.CAPTURE_FORENSICS, ResponseActionType.LOCK_ACCOUNT],
    [IncidentCategory.MALWARE]: [ResponseActionType.ISOLATE_SYSTEM, ResponseActionType.ALERT_SECURITY_TEAM, ResponseActionType.CAPTURE_FORENSICS, ResponseActionType.TRIGGER_BACKUP],
    [IncidentCategory.COMPLIANCE_VIOLATION]: [ResponseActionType.ALERT_SECURITY_TEAM, ResponseActionType.CAPTURE_FORENSICS],
    [IncidentCategory.CONFIGURATION_ERROR]: [ResponseActionType.ALERT_SECURITY_TEAM]
  }
  return categoryActions[incident.category] || [ResponseActionType.ALERT_SECURITY_TEAM]
}

/**
 * Get default detection rules
 */
export function getDefaultDetectionRules(): DetectionRule[] {
  return [
    {
      id: 'rule_brute_force',
      name: 'Brute Force Attack Detection',
      description: 'Detects multiple failed login attempts',
      category: IncidentCategory.BRUTE_FORCE,
      severity: 'high',
      conditions: [{ field: 'failedLoginCount', operator: 'greater_than', value: 5, timeWindow: 300000 }],
      automaticResponse: true,
      responseActions: [ResponseActionType.BLOCK_IP, ResponseActionType.LOCK_ACCOUNT, ResponseActionType.ALERT_SECURITY_TEAM],
      notificationChannels: ['email', 'slack'],
      enabled: true
    },
    {
      id: 'rule_data_breach',
      name: 'Large Data Export Detection',
      description: 'Detects unusual large data exports',
      category: IncidentCategory.DATA_BREACH,
      severity: 'critical',
      conditions: [
        { field: 'dataSize', operator: 'greater_than', value: 104857600 },
        { field: 'time', operator: 'matches', value: '(22|23|0|1|2|3|4|5):\\d{2}' }
      ],
      automaticResponse: true,
      responseActions: [ResponseActionType.ALERT_SECURITY_TEAM, ResponseActionType.CAPTURE_FORENSICS, ResponseActionType.TRIGGER_BACKUP],
      notificationChannels: ['email', 'slack', 'pagerduty'],
      enabled: true
    },
    {
      id: 'rule_unauthorized_access',
      name: 'Unauthorized Access Attempt',
      description: 'Detects access to restricted resources',
      category: IncidentCategory.UNAUTHORIZED_ACCESS,
      severity: 'high',
      conditions: [
        { field: 'accessDenied', operator: 'equals', value: true },
        { field: 'resourceType', operator: 'contains', value: 'sensitive' }
      ],
      automaticResponse: true,
      responseActions: [ResponseActionType.LOCK_ACCOUNT, ResponseActionType.ALERT_SECURITY_TEAM, ResponseActionType.CAPTURE_FORENSICS],
      notificationChannels: ['email', 'slack'],
      enabled: true
    },
    {
      id: 'rule_api_abuse',
      name: 'API Abuse Detection',
      description: 'Detects excessive API requests',
      category: IncidentCategory.DDOS,
      severity: 'medium',
      conditions: [{ field: 'requestCount', operator: 'greater_than', value: 1000, timeWindow: 60000 }],
      automaticResponse: true,
      responseActions: [ResponseActionType.BLOCK_IP, ResponseActionType.ALERT_SECURITY_TEAM],
      notificationChannels: ['slack'],
      enabled: true
    },
    {
      id: 'rule_injection_attempt',
      name: 'Injection Attack Detection',
      description: 'Detects SQL/code injection attempts',
      category: IncidentCategory.MALWARE,
      severity: 'high',
      conditions: [{ field: 'payload', operator: 'matches', value: '(union|select|drop|insert|delete|exec|script)' }],
      automaticResponse: true,
      responseActions: [ResponseActionType.BLOCK_IP, ResponseActionType.ALERT_SECURITY_TEAM],
      notificationChannels: ['email', 'slack'],
      enabled: true
    },
    {
      id: 'rule_insider_threat',
      name: 'Insider Threat Detection',
      description: 'Detects unusual user behavior',
      category: IncidentCategory.INSIDER_THREAT,
      severity: 'high',
      conditions: [
        { field: 'accessToSensitive', operator: 'equals', value: true },
        { field: 'dataExportSize', operator: 'greater_than', value: 52428800 }
      ],
      automaticResponse: true,
      responseActions: [ResponseActionType.ALERT_SECURITY_TEAM, ResponseActionType.CAPTURE_FORENSICS, ResponseActionType.LOCK_ACCOUNT],
      notificationChannels: ['email', 'slack', 'pagerduty'],
      enabled: true
    },
    {
      id: 'rule_privilege_escalation',
      name: 'Privilege Escalation Attempt',
      description: 'Detects attempts to escalate privileges',
      category: IncidentCategory.UNAUTHORIZED_ACCESS,
      severity: 'critical',
      conditions: [{ field: 'escalationAttempt', operator: 'equals', value: true }],
      automaticResponse: true,
      responseActions: [ResponseActionType.LOCK_ACCOUNT, ResponseActionType.TERMINATE_SESSION, ResponseActionType.ALERT_SECURITY_TEAM],
      notificationChannels: ['email', 'slack', 'pagerduty'],
      enabled: true
    },
    {
      id: 'rule_compliance_violation',
      name: 'Compliance Violation Detected',
      description: 'Detects actions that violate compliance policies',
      category: IncidentCategory.COMPLIANCE_VIOLATION,
      severity: 'medium',
      conditions: [{ field: 'noAuditTrail', operator: 'equals', value: true }],
      automaticResponse: false,
      responseActions: [ResponseActionType.ALERT_SECURITY_TEAM],
      notificationChannels: ['email'],
      enabled: true
    }
  ]
}

/**
 * Get default response playbooks
 */
export function getDefaultPlaybooks(): ResponsePlaybook[] {
  return [
    {
      id: 'playbook_brute_force',
      name: 'Brute Force Response Playbook',
      category: IncidentCategory.BRUTE_FORCE,
      estimatedDuration: 300000,
      requiredApprovals: [],
      steps: [
        { order: 1, action: 'Block IP Address', description: 'Immediately block the attacking IP', automated: true, timeout: 30000, rollbackPossible: true },
        { order: 2, action: 'Lock User Account', description: 'Lock the targeted user account', automated: true, timeout: 30000, rollbackPossible: true },
        { order: 3, action: 'Review Logs', description: 'Review authentication logs for breach', automated: false, rollbackPossible: false },
        { order: 4, action: 'Notify User', description: 'Notify user of unauthorized access attempt', automated: true, timeout: 60000, rollbackPossible: false }
      ]
    },
    {
      id: 'playbook_data_breach',
      name: 'Data Breach Response Playbook',
      category: IncidentCategory.DATA_BREACH,
      estimatedDuration: 600000,
      requiredApprovals: ['security_manager', 'ciso'],
      steps: [
        { order: 1, action: 'Isolate Systems', description: 'Isolate affected systems from network', automated: true, timeout: 60000, rollbackPossible: true },
        { order: 2, action: 'Capture Forensics', description: 'Capture forensic data for analysis', automated: true, timeout: 120000, rollbackPossible: false },
        { order: 3, action: 'Trigger Backup', description: 'Trigger emergency backup of systems', automated: true, timeout: 300000, rollbackPossible: false },
        { order: 4, action: 'Notify Stakeholders', description: 'Notify affected parties of potential breach', automated: false, rollbackPossible: false }
      ]
    },
    {
      id: 'playbook_unauthorized_access',
      name: 'Unauthorized Access Response Playbook',
      category: IncidentCategory.UNAUTHORIZED_ACCESS,
      estimatedDuration: 300000,
      requiredApprovals: [],
      steps: [
        { order: 1, action: 'Terminate Sessions', description: 'Terminate all active sessions for user', automated: true, timeout: 30000, rollbackPossible: true },
        { order: 2, action: 'Lock Account', description: 'Lock the affected user account', automated: true, timeout: 30000, rollbackPossible: true },
        { order: 3, action: 'Reset Credentials', description: 'Force password/credential reset', automated: false, rollbackPossible: false },
        { order: 4, action: 'Review Access Logs', description: 'Review what was accessed', automated: false, rollbackPossible: false }
      ]
    },
    {
      id: 'playbook_malware',
      name: 'Malware Response Playbook',
      category: IncidentCategory.MALWARE,
      estimatedDuration: 900000,
      requiredApprovals: ['security_manager'],
      steps: [
        { order: 1, action: 'Isolate System', description: 'Isolate infected system from network', automated: true, timeout: 60000, rollbackPossible: true },
        { order: 2, action: 'Capture Memory Dump', description: 'Capture system memory for analysis', automated: true, timeout: 180000, rollbackPossible: false },
        { order: 3, action: 'Scan for Malware', description: 'Run comprehensive malware scan', automated: false, rollbackPossible: false },
        { order: 4, action: 'Trigger Backup', description: 'Backup uninfected systems', automated: true, timeout: 300000, rollbackPossible: false }
      ]
    }
  ]
}

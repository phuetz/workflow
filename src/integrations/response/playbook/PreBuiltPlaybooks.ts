/**
 * Pre-Built Playbooks
 * 10+ pre-built security incident response playbooks
 *
 * @module playbook/PreBuiltPlaybooks
 */

import type { PlaybookDefinition } from './types';

/**
 * Create a timestamp for playbook creation
 */
const timestamp = (): string => new Date().toISOString();

/**
 * Brute Force Response Playbook
 * Trigger: 5+ failed logins in 5 minutes
 */
export function createBruteForcePlaybook(): PlaybookDefinition {
  return {
    metadata: {
      id: 'pb_bruteforce',
      name: 'Brute Force Attack Response',
      description: 'Automated response to brute force attack attempts',
      severity: 'high',
      author: 'Security Team',
      version: 1,
      state: 'active',
      created: timestamp(),
      updated: timestamp(),
      tags: ['brute-force', 'authentication', 'security'],
      category: 'access-control'
    },
    triggers: [{ eventType: 'access_alert', condition: '{{event.failedLoginCount}} >= 5', threshold: 5, timeWindow: 300000 }],
    variables: { sourceIP: '{{event.sourceIP}}', userId: '{{event.userId}}', timestamp: '{{event.timestamp}}' },
    actions: [
      { id: 'action_block_ip', name: 'Block Source IP', type: 'blocking', service: 'firewall', payload: { ip: '{{event.sourceIP}}', duration: 3600, reason: 'Brute force attempt' }, timeout: 5000 },
      { id: 'action_lock_account', name: 'Lock User Account', type: 'blocking', service: 'iam', payload: { userId: '{{event.userId}}', reason: 'Brute force attack detected' }, timeout: 5000, dependsOn: ['action_block_ip'] },
      { id: 'action_notify_soc', name: 'Notify Security Operations', type: 'notification', service: 'slack', payload: { channel: '#security-incidents', message: 'Brute force attack on user {{event.userId}} from IP {{event.sourceIP}}' }, timeout: 3000, runInParallel: true },
      { id: 'action_create_ticket', name: 'Create Incident Ticket', type: 'escalation', service: 'jira', payload: { summary: 'Brute Force Attack: {{event.userId}}', priority: 'high', assignee: 'security-team' }, timeout: 10000, runInParallel: true }
    ],
    approval: { mode: 'auto' },
    schedule: { immediate: true }
  };
}

/**
 * Malware Detection Response Playbook
 */
export function createMalwareDetectionPlaybook(): PlaybookDefinition {
  return {
    metadata: {
      id: 'pb_malware',
      name: 'Malware Detection Response',
      description: 'Automated response to malware IOC detection',
      severity: 'critical',
      author: 'Security Team',
      version: 1,
      state: 'active',
      created: timestamp(),
      updated: timestamp(),
      tags: ['malware', 'threat', 'endpoint'],
      category: 'threat-response'
    },
    triggers: [{ eventType: 'security_alert', condition: '{{event.iocType}} === "malware"', pattern: 'malware_hash|c2_domain' }],
    variables: { hostId: '{{event.hostId}}', iocHash: '{{event.hash}}', severity: '{{event.severity}}' },
    actions: [
      { id: 'action_isolate_host', name: 'Isolate Infected Host', type: 'remediation', service: 'endpoint', payload: { hostId: '{{event.hostId}}', isolationType: 'network' }, timeout: 10000 },
      { id: 'action_capture_memory', name: 'Capture Memory Dump', type: 'remediation', service: 'endpoint', payload: { hostId: '{{event.hostId}}', format: 'raw' }, timeout: 30000, dependsOn: ['action_isolate_host'] },
      { id: 'action_notify_ir_team', name: 'Alert Incident Response Team', type: 'notification', service: 'pagerduty', payload: { severity: 'critical', title: 'Malware detected on {{event.hostId}}' }, timeout: 5000, runInParallel: true },
      { id: 'action_log_incident', name: 'Log Incident Details', type: 'logging', service: 'siem', payload: { event: '{{event}}' }, runInParallel: true }
    ],
    approval: { mode: 'escalating', requiredApprovers: ['ir_lead'], timeoutMs: 300000, timeoutAction: 'auto_approve' }
  };
}

/**
 * Data Exfiltration Response Playbook
 */
export function createDataExfiltrationPlaybook(): PlaybookDefinition {
  return {
    metadata: {
      id: 'pb_exfiltration',
      name: 'Data Exfiltration Response',
      description: 'Response to unusual data transfer patterns',
      severity: 'critical',
      author: 'Security Team',
      version: 1,
      state: 'active',
      created: timestamp(),
      updated: timestamp(),
      tags: ['data-loss', 'dlp', 'exfiltration'],
      category: 'data-protection'
    },
    triggers: [{ eventType: 'data_alert', condition: '{{event.transferVolume}} > {{event.baselineVolume}} * 5', threshold: 5 }],
    variables: { userId: '{{event.userId}}', destination: '{{event.destination}}', volume: '{{event.transferVolume}}' },
    actions: [
      { id: 'action_block_transfer', name: 'Block Data Transfer', type: 'blocking', service: 'firewall', payload: { destination: '{{event.destination}}', userId: '{{event.userId}}' }, timeout: 3000 },
      { id: 'action_alert_dlp', name: 'Alert DLP Team', type: 'notification', service: 'email', payload: { to: 'dlp-team@company.com', subject: 'Potential Data Exfiltration Detected', body: 'User {{event.userId}} attempting unusual data transfer' }, timeout: 5000 },
      { id: 'action_create_case', name: 'Create Investigation Case', type: 'escalation', service: 'servicenow', payload: { title: 'Data Exfiltration: {{event.userId}}', priority: 1, assignment_group: 'Incident Response' }, timeout: 10000 }
    ]
  };
}

/**
 * Privilege Escalation Response Playbook
 */
export function createPrivilegeEscalationPlaybook(): PlaybookDefinition {
  return {
    metadata: {
      id: 'pb_privesc',
      name: 'Privilege Escalation Response',
      description: 'Response to unauthorized privilege elevation',
      severity: 'high',
      author: 'Security Team',
      version: 1,
      state: 'active',
      created: timestamp(),
      updated: timestamp(),
      tags: ['privilege-escalation', 'access-control'],
      category: 'access-control'
    },
    triggers: [{ eventType: 'access_alert', condition: '{{event.action}} === "privilege_grant" && !{{event.authorized}}' }],
    variables: { userId: '{{event.userId}}', role: '{{event.grantedRole}}' },
    actions: [
      { id: 'action_revoke_privileges', name: 'Revoke Granted Privileges', type: 'remediation', service: 'iam', payload: { userId: '{{event.userId}}', roles: ['{{event.grantedRole}}'] }, timeout: 5000 },
      { id: 'action_lock_account_privesc', name: 'Lock Account', type: 'blocking', service: 'iam', payload: { userId: '{{event.userId}}' }, timeout: 3000 },
      { id: 'action_audit_trail', name: 'Log to Audit Trail', type: 'logging', service: 'audit', payload: { event: 'unauthorized_privilege_escalation', userId: '{{event.userId}}' } }
    ]
  };
}

/**
 * Ransomware Response Playbook
 */
export function createRansomwarePlaybook(): PlaybookDefinition {
  return {
    metadata: {
      id: 'pb_ransomware',
      name: 'Ransomware Attack Response',
      description: 'Automated response to ransomware indicators',
      severity: 'critical',
      author: 'Security Team',
      version: 1,
      state: 'active',
      created: timestamp(),
      updated: timestamp(),
      tags: ['ransomware', 'malware', 'critical'],
      category: 'threat-response'
    },
    triggers: [{ eventType: 'security_alert', condition: '{{event.threatType}} === "ransomware"' }],
    variables: { affectedSystems: '{{event.systems}}' },
    actions: [
      { id: 'action_isolate_systems', name: 'Isolate Affected Systems', type: 'remediation', service: 'network', payload: { systems: '{{event.systems}}', isolation: 'full' }, timeout: 10000 },
      { id: 'action_disable_shares', name: 'Disable Network Shares', type: 'blocking', service: 'file-server', payload: { shareType: 'network' }, timeout: 5000 },
      { id: 'action_exec_notify', name: 'Notify Executive Team', type: 'notification', service: 'email', payload: { to: 'ciso@company.com,ceo@company.com', priority: 'critical' }, timeout: 3000, runInParallel: true },
      { id: 'action_activate_incident', name: 'Activate Incident Response', type: 'escalation', service: 'incident-management', payload: { severity: 'critical', type: 'ransomware' }, timeout: 10000 }
    ],
    approval: { mode: 'manual', requiredApprovers: ['ciso'], timeoutMs: 60000, timeoutAction: 'auto_approve' }
  };
}

/**
 * Phishing Response Playbook
 */
export function createPhishingPlaybook(): PlaybookDefinition {
  return {
    metadata: {
      id: 'pb_phishing',
      name: 'Phishing Email Response',
      description: 'Automated response to detected phishing emails',
      severity: 'high',
      author: 'Security Team',
      version: 1,
      state: 'active',
      created: timestamp(),
      updated: timestamp(),
      tags: ['phishing', 'email', 'threat'],
      category: 'threat-response'
    },
    triggers: [{ eventType: 'security_alert', condition: '{{event.threatType}} === "phishing"' }],
    variables: { senderEmail: '{{event.from}}', recipientCount: '{{event.recipientCount}}' },
    actions: [
      { id: 'action_quarantine_email', name: 'Quarantine Phishing Email', type: 'remediation', service: 'email-gateway', payload: { messageId: '{{event.messageId}}', action: 'quarantine' }, timeout: 5000 },
      { id: 'action_block_sender', name: 'Block Sender Address', type: 'blocking', service: 'email-gateway', payload: { sender: '{{event.from}}' }, timeout: 3000 },
      { id: 'action_notify_users', name: 'Notify Affected Users', type: 'notification', service: 'email', payload: { recipients: '{{event.recipients}}', message: 'Phishing email detected and quarantined' }, timeout: 10000, runInParallel: true },
      { id: 'action_log_phishing', name: 'Log Phishing Report', type: 'logging', service: 'threat-intel', payload: { sender: '{{event.from}}', subject: '{{event.subject}}' }, runInParallel: true }
    ]
  };
}

/**
 * DDoS Response Playbook
 */
export function createDDoSPlaybook(): PlaybookDefinition {
  return {
    metadata: {
      id: 'pb_ddos',
      name: 'DDoS Attack Response',
      description: 'Response to detected DDoS traffic anomalies',
      severity: 'high',
      author: 'Security Team',
      version: 1,
      state: 'active',
      created: timestamp(),
      updated: timestamp(),
      tags: ['ddos', 'network', 'availability'],
      category: 'network-security'
    },
    triggers: [{ eventType: 'performance_alert', condition: '{{event.anomalyScore}} > 0.8' }],
    variables: { sourceIPs: '{{event.sourceIPs}}' },
    actions: [
      { id: 'action_enable_ratelimit', name: 'Enable Rate Limiting', type: 'blocking', service: 'firewall', payload: { rateLimit: 1000, unit: 'requests_per_second' }, timeout: 3000 },
      { id: 'action_activate_cdn', name: 'Activate CDN Acceleration', type: 'remediation', service: 'cdn', payload: { mode: 'aggressive' }, timeout: 5000 },
      { id: 'action_notify_noc', name: 'Alert Network Operations', type: 'notification', service: 'pagerduty', payload: { severity: 'high' }, timeout: 3000, runInParallel: true }
    ]
  };
}

/**
 * Insider Threat Response Playbook
 */
export function createInsiderThreatPlaybook(): PlaybookDefinition {
  return {
    metadata: {
      id: 'pb_insider',
      name: 'Insider Threat Response',
      description: 'Response to detected suspicious insider activity',
      severity: 'high',
      author: 'Security Team',
      version: 1,
      state: 'active',
      created: timestamp(),
      updated: timestamp(),
      tags: ['insider-threat', 'ueba', 'monitoring'],
      category: 'threat-response'
    },
    triggers: [{ eventType: 'security_alert', condition: '{{event.riskScore}} > {{event.threshold}}' }],
    variables: { userId: '{{event.userId}}' },
    actions: [
      { id: 'action_enhance_monitoring', name: 'Enable Enhanced Monitoring', type: 'remediation', service: 'ueba', payload: { userId: '{{event.userId}}', monitoringLevel: 'aggressive' }, timeout: 5000 },
      { id: 'action_restrict_access', name: 'Restrict User Access', type: 'blocking', service: 'iam', payload: { userId: '{{event.userId}}', restrictions: ['sensitive_data', 'admin_functions'] }, timeout: 5000 },
      { id: 'action_notify_hr', name: 'Notify HR Department', type: 'notification', service: 'email', payload: { to: 'hr@company.com' }, timeout: 3000 }
    ]
  };
}

/**
 * API Abuse Response Playbook
 */
export function createAPIAbusePlaybook(): PlaybookDefinition {
  return {
    metadata: {
      id: 'pb_api_abuse',
      name: 'API Abuse Response',
      description: 'Response to API rate limit and abuse detection',
      severity: 'medium',
      author: 'Security Team',
      version: 1,
      state: 'active',
      created: timestamp(),
      updated: timestamp(),
      tags: ['api-abuse', 'rate-limiting', 'security'],
      category: 'api-security'
    },
    triggers: [{ eventType: 'security_alert', condition: '{{event.requestRate}} > {{event.rateLimit}}' }],
    variables: { apiKey: '{{event.apiKey}}', developer: '{{event.developer}}' },
    actions: [
      { id: 'action_throttle_api', name: 'Throttle API Access', type: 'blocking', service: 'api-gateway', payload: { apiKey: '{{event.apiKey}}', rateLimit: 100 }, timeout: 2000 },
      { id: 'action_revoke_key', name: 'Revoke API Key', type: 'blocking', service: 'api-gateway', payload: { apiKey: '{{event.apiKey}}' }, timeout: 3000, dependsOn: ['action_throttle_api'] },
      { id: 'action_notify_developer', name: 'Notify Developer', type: 'notification', service: 'email', payload: { to: '{{event.developerEmail}}' }, timeout: 3000 }
    ]
  };
}

/**
 * Credential Compromise Response Playbook
 */
export function createCredentialCompromisePlaybook(): PlaybookDefinition {
  return {
    metadata: {
      id: 'pb_credential_compromise',
      name: 'Credential Compromise Response',
      description: 'Response to detected compromised credentials',
      severity: 'critical',
      author: 'Security Team',
      version: 1,
      state: 'active',
      created: timestamp(),
      updated: timestamp(),
      tags: ['credential-compromise', 'password', 'mfa'],
      category: 'access-control'
    },
    triggers: [{ eventType: 'security_alert', condition: '{{event.credentialStatus}} === "compromised"' }],
    variables: { userId: '{{event.userId}}' },
    actions: [
      { id: 'action_force_password_reset', name: 'Force Password Reset', type: 'remediation', service: 'iam', payload: { userId: '{{event.userId}}', resetRequired: true }, timeout: 5000 },
      { id: 'action_revoke_sessions', name: 'Revoke Active Sessions', type: 'blocking', service: 'iam', payload: { userId: '{{event.userId}}' }, timeout: 3000 },
      { id: 'action_enforce_mfa', name: 'Enforce MFA Enrollment', type: 'remediation', service: 'iam', payload: { userId: '{{event.userId}}', mfaRequired: true }, timeout: 5000 },
      { id: 'action_notify_user', name: 'Notify User', type: 'notification', service: 'email', payload: { userId: '{{event.userId}}', message: 'Your credentials were compromised. Password reset required.' }, timeout: 3000 }
    ]
  };
}

/**
 * Get all pre-built playbooks
 */
export function getAllPreBuiltPlaybooks(): PlaybookDefinition[] {
  return [
    createBruteForcePlaybook(),
    createMalwareDetectionPlaybook(),
    createDataExfiltrationPlaybook(),
    createPrivilegeEscalationPlaybook(),
    createRansomwarePlaybook(),
    createPhishingPlaybook(),
    createDDoSPlaybook(),
    createInsiderThreatPlaybook(),
    createAPIAbusePlaybook(),
    createCredentialCompromisePlaybook()
  ];
}

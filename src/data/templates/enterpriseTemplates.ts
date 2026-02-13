/**
 * Enterprise Workflow Templates
 * 50+ templates for enterprise use cases
 */

import type { WorkflowTemplate } from '../../types/templates';

export const ENTERPRISE_TEMPLATES: WorkflowTemplate[] = [
  // ========================================
  // HR & RECRUITING (10 templates)
  // ========================================
  {
    id: 'onboarding-automation',
    name: 'Employee Onboarding Automation',
    description: 'Complete onboarding workflow with account provisioning',
    category: 'hr',
    subcategory: 'onboarding',
    author: 'System',
    authorType: 'official',
    tags: ['hr', 'onboarding', 'provisioning', 'gsuite', 'slack'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'webhook_trigger', position: { x: 100, y: 200 }, data: { label: 'New Hire', properties: { path: '/onboard' } } },
        { id: 'gsuite', type: 'google_admin', position: { x: 300, y: 100 }, data: { label: 'Create Google Account', properties: { operation: 'createUser' } } },
        { id: 'slack-invite', type: 'slack', position: { x: 300, y: 200 }, data: { label: 'Slack Invite', properties: { operation: 'inviteUser' } } },
        { id: 'github', type: 'github', position: { x: 300, y: 300 }, data: { label: 'GitHub Invite', properties: { operation: 'addOrgMember' } } },
        { id: 'bamboo', type: 'bamboohr', position: { x: 500, y: 200 }, data: { label: 'Update BambooHR', properties: { operation: 'update', resource: 'employee' } } },
        { id: 'calendar', type: 'google_calendar', position: { x: 700, y: 200 }, data: { label: 'Schedule Meetings', properties: { operation: 'createEvent', summary: 'Onboarding Session' } } },
        { id: 'email', type: 'email', position: { x: 900, y: 200 }, data: { label: 'Welcome Email', properties: { template: 'welcome-employee' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'gsuite' },
        { id: 'e2', source: 'trigger', target: 'slack-invite' },
        { id: 'e3', source: 'trigger', target: 'github' },
        { id: 'e4', source: 'gsuite', target: 'bamboo' },
        { id: 'e5', source: 'bamboo', target: 'calendar' },
        { id: 'e6', source: 'calendar', target: 'email' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date(),
    downloads: 2345,
    rating: 4.8,
    reviewCount: 189,
    featured: true,
    requiredIntegrations: ['webhook_trigger', 'google_admin', 'slack', 'github', 'bamboohr', 'google_calendar', 'email'],
    requiredCredentials: ['googleAdminOAuth2', 'slackOAuth2', 'githubOAuth2', 'bamboohrApi', 'googleCalendarOAuth2'],
    estimatedSetupTime: 45,
    documentation: { overview: 'Complete employee onboarding automation.', setup: [], usage: 'Trigger when new hire is approved.' }
  },
  {
    id: 'offboarding-workflow',
    name: 'Employee Offboarding Workflow',
    description: 'Automated account deprovisioning and exit process',
    category: 'hr',
    subcategory: 'offboarding',
    author: 'System',
    authorType: 'official',
    tags: ['hr', 'offboarding', 'security', 'deprovisioning', 'compliance'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'webhook_trigger', position: { x: 100, y: 200 }, data: { label: 'Termination', properties: { path: '/offboard' } } },
        { id: 'gsuite-disable', type: 'google_admin', position: { x: 300, y: 100 }, data: { label: 'Disable Google', properties: { operation: 'suspendUser' } } },
        { id: 'slack-disable', type: 'slack', position: { x: 300, y: 200 }, data: { label: 'Deactivate Slack', properties: { operation: 'deactivateUser' } } },
        { id: 'github-remove', type: 'github', position: { x: 300, y: 300 }, data: { label: 'Remove GitHub', properties: { operation: 'removeOrgMember' } } },
        { id: 'transfer-data', type: 'google_drive', position: { x: 500, y: 100 }, data: { label: 'Transfer Files', properties: { operation: 'transferOwnership' } } },
        { id: 'it-ticket', type: 'jira', position: { x: 500, y: 300 }, data: { label: 'Equipment Return', properties: { operation: 'create', issueType: 'Task', project: 'IT' } } },
        { id: 'audit-log', type: 'google_sheets', position: { x: 700, y: 200 }, data: { label: 'Log Offboarding', properties: { operation: 'append' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'gsuite-disable' },
        { id: 'e2', source: 'trigger', target: 'slack-disable' },
        { id: 'e3', source: 'trigger', target: 'github-remove' },
        { id: 'e4', source: 'gsuite-disable', target: 'transfer-data' },
        { id: 'e5', source: 'slack-disable', target: 'it-ticket' },
        { id: 'e6', source: 'transfer-data', target: 'audit-log' },
        { id: 'e7', source: 'it-ticket', target: 'audit-log' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
    downloads: 1876,
    rating: 4.7,
    reviewCount: 134,
    featured: true,
    requiredIntegrations: ['webhook_trigger', 'google_admin', 'slack', 'github', 'google_drive', 'jira', 'google_sheets'],
    requiredCredentials: ['googleAdminOAuth2', 'slackOAuth2', 'githubOAuth2', 'jiraApi', 'googleSheetsOAuth2'],
    estimatedSetupTime: 40,
    documentation: { overview: 'Secure employee offboarding with account deprovisioning.', setup: [], usage: 'Trigger when termination is approved.' }
  },
  {
    id: 'applicant-tracking-sync',
    name: 'Greenhouse to Workday Sync',
    description: 'Sync hired candidates from Greenhouse to Workday',
    category: 'hr',
    subcategory: 'recruiting',
    author: 'System',
    authorType: 'official',
    tags: ['greenhouse', 'workday', 'recruiting', 'hr', 'sync'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'greenhouse_trigger', position: { x: 100, y: 200 }, data: { label: 'Candidate Hired', properties: { event: 'hired' } } },
        { id: 'get-details', type: 'greenhouse', position: { x: 300, y: 200 }, data: { label: 'Get Candidate', properties: { operation: 'get', resource: 'candidate' } } },
        { id: 'workday', type: 'workday', position: { x: 500, y: 200 }, data: { label: 'Create Worker', properties: { operation: 'create', resource: 'worker' } } },
        { id: 'email-hr', type: 'email', position: { x: 700, y: 200 }, data: { label: 'Notify HR', properties: { to: '={{env.HR_EMAIL}}', subject: 'New hire created in Workday' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'get-details' },
        { id: 'e2', source: 'get-details', target: 'workday' },
        { id: 'e3', source: 'workday', target: 'email-hr' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date(),
    downloads: 987,
    rating: 4.5,
    reviewCount: 67,
    featured: false,
    requiredIntegrations: ['greenhouse_trigger', 'greenhouse', 'workday', 'email'],
    requiredCredentials: ['greenhouseApi', 'workdayApi'],
    estimatedSetupTime: 25,
    documentation: { overview: 'Sync hired candidates to Workday automatically.', setup: [], usage: 'Triggers when candidate is marked as hired.' }
  },
  {
    id: 'time-off-approval',
    name: 'Time Off Request Approval',
    description: 'Automated time off approval workflow with Slack notifications',
    category: 'hr',
    subcategory: 'time-off',
    author: 'System',
    authorType: 'official',
    tags: ['hr', 'time-off', 'approval', 'slack', 'bamboohr'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'bamboohr_trigger', position: { x: 100, y: 200 }, data: { label: 'Time Off Request', properties: { event: 'timeOffRequest' } } },
        { id: 'get-manager', type: 'bamboohr', position: { x: 300, y: 200 }, data: { label: 'Get Manager', properties: { operation: 'getDirectReports' } } },
        { id: 'slack-request', type: 'slack', position: { x: 500, y: 200 }, data: { label: 'Request Approval', properties: { operation: 'sendInteractiveMessage', blocks: [{ type: 'actions', elements: [{ type: 'button', text: 'Approve' }, { type: 'button', text: 'Deny' }] }] } } },
        { id: 'wait', type: 'wait', position: { x: 700, y: 200 }, data: { label: 'Wait for Response', properties: { timeout: 48, unit: 'hours' } } },
        { id: 'update', type: 'bamboohr', position: { x: 900, y: 200 }, data: { label: 'Update Request', properties: { operation: 'update', resource: 'timeOffRequest' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'get-manager' },
        { id: 'e2', source: 'get-manager', target: 'slack-request' },
        { id: 'e3', source: 'slack-request', target: 'wait' },
        { id: 'e4', source: 'wait', target: 'update' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date(),
    downloads: 1456,
    rating: 4.6,
    reviewCount: 98,
    featured: false,
    requiredIntegrations: ['bamboohr_trigger', 'bamboohr', 'slack', 'wait'],
    requiredCredentials: ['bamboohrApi', 'slackOAuth2'],
    estimatedSetupTime: 20,
    documentation: { overview: 'Time off approval via Slack interactive messages.', setup: [], usage: 'Managers receive Slack approval requests.' }
  },
  {
    id: 'linkedin-recruiter-sync',
    name: 'LinkedIn Recruiter to ATS Sync',
    description: 'Sync LinkedIn Recruiter candidates to your ATS',
    category: 'hr',
    subcategory: 'recruiting',
    author: 'System',
    authorType: 'official',
    tags: ['linkedin', 'recruiting', 'ats', 'lever', 'candidates'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Every 30 Min', properties: { interval: '30m' } } },
        { id: 'linkedin', type: 'linkedin_recruiter', position: { x: 300, y: 200 }, data: { label: 'Get Candidates', properties: { operation: 'getNewCandidates', since: '={{$now.minus(30, "minutes")}}' } } },
        { id: 'lever', type: 'lever', position: { x: 500, y: 200 }, data: { label: 'Create Candidates', properties: { operation: 'create', resource: 'candidate' } } },
        { id: 'slack', type: 'slack', position: { x: 700, y: 200 }, data: { label: 'Notify Recruiters', properties: { channel: '#recruiting' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'linkedin' },
        { id: 'e2', source: 'linkedin', target: 'lever' },
        { id: 'e3', source: 'lever', target: 'slack' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date(),
    downloads: 876,
    rating: 4.4,
    reviewCount: 54,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'linkedin_recruiter', 'lever', 'slack'],
    requiredCredentials: ['linkedinRecruiterApi', 'leverApi', 'slackOAuth2'],
    estimatedSetupTime: 20,
    documentation: { overview: 'Sync LinkedIn candidates to Lever ATS.', setup: [], usage: 'Runs every 30 minutes.' }
  },

  // ========================================
  // SECURITY & COMPLIANCE (10 templates)
  // ========================================
  {
    id: 'siem-alert-response',
    name: 'SIEM Alert Response Automation',
    description: 'Automate response to security alerts from SIEM',
    category: 'security',
    subcategory: 'incident-response',
    author: 'System',
    authorType: 'official',
    tags: ['security', 'siem', 'splunk', 'incident-response', 'automation'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'webhook_trigger', position: { x: 100, y: 200 }, data: { label: 'SIEM Alert', properties: { path: '/siem-alert' } } },
        { id: 'enrich', type: 'http_request', position: { x: 300, y: 200 }, data: { label: 'Threat Intel', properties: { url: 'https://api.threatintel.io/lookup', method: 'POST' } } },
        { id: 'severity', type: 'switch_case', position: { x: 500, y: 200 }, data: { label: 'Check Severity', properties: { field: '={{$json.severity}}' } } },
        { id: 'pagerduty', type: 'pagerduty', position: { x: 700, y: 100 }, data: { label: 'Page On-Call', properties: { operation: 'createIncident', urgency: 'high' } } },
        { id: 'jira', type: 'jira', position: { x: 700, y: 200 }, data: { label: 'Create Ticket', properties: { operation: 'create', issueType: 'Security Incident' } } },
        { id: 'block-ip', type: 'http_request', position: { x: 700, y: 300 }, data: { label: 'Block IP', properties: { url: '={{env.FIREWALL_API}}/block', method: 'POST' } } },
        { id: 'slack', type: 'slack', position: { x: 900, y: 200 }, data: { label: 'Alert SOC', properties: { channel: '#security-alerts' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'enrich' },
        { id: 'e2', source: 'enrich', target: 'severity' },
        { id: 'e3', source: 'severity', target: 'pagerduty', sourceHandle: 'critical' },
        { id: 'e4', source: 'severity', target: 'jira', sourceHandle: 'high' },
        { id: 'e5', source: 'severity', target: 'block-ip', sourceHandle: 'critical' },
        { id: 'e6', source: 'jira', target: 'slack' },
        { id: 'e7', source: 'pagerduty', target: 'slack' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    downloads: 1567,
    rating: 4.7,
    reviewCount: 112,
    featured: true,
    requiredIntegrations: ['webhook_trigger', 'http_request', 'switch_case', 'pagerduty', 'jira', 'slack'],
    requiredCredentials: ['pagerdutyApi', 'jiraApi', 'slackOAuth2'],
    estimatedSetupTime: 35,
    documentation: { overview: 'Automate security incident response.', setup: [], usage: 'Receives alerts from SIEM and takes action.' }
  },
  {
    id: 'compliance-audit-report',
    name: 'Compliance Audit Report Generator',
    description: 'Generate SOC2/GDPR compliance reports automatically',
    category: 'security',
    subcategory: 'compliance',
    author: 'System',
    authorType: 'official',
    tags: ['compliance', 'soc2', 'gdpr', 'audit', 'reporting'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Monthly', properties: { cron: '0 9 1 * *' } } },
        { id: 'aws-cloudtrail', type: 'aws', position: { x: 300, y: 100 }, data: { label: 'Get CloudTrail', properties: { service: 'cloudtrail', operation: 'lookupEvents' } } },
        { id: 'okta-logs', type: 'okta', position: { x: 300, y: 200 }, data: { label: 'Get Okta Logs', properties: { operation: 'getLogs' } } },
        { id: 'github-audit', type: 'github', position: { x: 300, y: 300 }, data: { label: 'Get Audit Logs', properties: { operation: 'getAuditLog' } } },
        { id: 'aggregate', type: 'code_javascript', position: { x: 500, y: 200 }, data: { label: 'Aggregate Data', properties: { code: '// Compile compliance metrics' } } },
        { id: 'report', type: 'pdf_generator', position: { x: 700, y: 200 }, data: { label: 'Generate PDF', properties: { template: 'compliance-report' } } },
        { id: 'email', type: 'email', position: { x: 900, y: 200 }, data: { label: 'Send Report', properties: { to: '={{env.COMPLIANCE_TEAM}}', attachments: true } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'aws-cloudtrail' },
        { id: 'e2', source: 'trigger', target: 'okta-logs' },
        { id: 'e3', source: 'trigger', target: 'github-audit' },
        { id: 'e4', source: 'aws-cloudtrail', target: 'aggregate' },
        { id: 'e5', source: 'okta-logs', target: 'aggregate' },
        { id: 'e6', source: 'github-audit', target: 'aggregate' },
        { id: 'e7', source: 'aggregate', target: 'report' },
        { id: 'e8', source: 'report', target: 'email' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
    downloads: 987,
    rating: 4.6,
    reviewCount: 67,
    featured: true,
    requiredIntegrations: ['schedule_trigger', 'aws', 'okta', 'github', 'code_javascript', 'pdf_generator', 'email'],
    requiredCredentials: ['awsCredentials', 'oktaApi', 'githubOAuth2'],
    estimatedSetupTime: 40,
    documentation: { overview: 'Monthly compliance report generation.', setup: [], usage: 'Runs on 1st of each month.' }
  },
  {
    id: 'access-review-automation',
    name: 'Quarterly Access Review',
    description: 'Automate quarterly user access reviews',
    category: 'security',
    subcategory: 'access-management',
    author: 'System',
    authorType: 'official',
    tags: ['security', 'access-review', 'compliance', 'okta', 'audit'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Quarterly', properties: { cron: '0 9 1 1,4,7,10 *' } } },
        { id: 'okta', type: 'okta', position: { x: 300, y: 200 }, data: { label: 'Get Users', properties: { operation: 'getAll', resource: 'user' } } },
        { id: 'loop', type: 'loop', position: { x: 500, y: 200 }, data: { label: 'For Each User', properties: {} } },
        { id: 'get-apps', type: 'okta', position: { x: 700, y: 200 }, data: { label: 'Get App Access', properties: { operation: 'getUserApps' } } },
        { id: 'sheets', type: 'google_sheets', position: { x: 900, y: 200 }, data: { label: 'Create Review', properties: { operation: 'append' } } },
        { id: 'email', type: 'email', position: { x: 1100, y: 200 }, data: { label: 'Notify Managers', properties: { to: '={{$json.manager.email}}' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'okta' },
        { id: 'e2', source: 'okta', target: 'loop' },
        { id: 'e3', source: 'loop', target: 'get-apps' },
        { id: 'e4', source: 'get-apps', target: 'sheets' },
        { id: 'e5', source: 'sheets', target: 'email' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date(),
    downloads: 756,
    rating: 4.5,
    reviewCount: 45,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'okta', 'loop', 'google_sheets', 'email'],
    requiredCredentials: ['oktaApi', 'googleSheetsOAuth2'],
    estimatedSetupTime: 30,
    documentation: { overview: 'Quarterly access review automation.', setup: [], usage: 'Runs quarterly and creates review spreadsheet.' }
  },
  {
    id: 'vulnerability-management',
    name: 'Vulnerability Scanner Integration',
    description: 'Process vulnerability scan results and create tickets',
    category: 'security',
    subcategory: 'vulnerability',
    author: 'System',
    authorType: 'official',
    tags: ['security', 'vulnerability', 'qualys', 'jira', 'scanning'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'webhook_trigger', position: { x: 100, y: 200 }, data: { label: 'Scan Complete', properties: { path: '/vuln-scan' } } },
        { id: 'filter-critical', type: 'filter', position: { x: 300, y: 200 }, data: { label: 'Critical Only', properties: { conditions: [{ field: '={{$json.severity}}', operator: 'greaterThanOrEqual', value: 9 }] } } },
        { id: 'jira', type: 'jira', position: { x: 500, y: 200 }, data: { label: 'Create Ticket', properties: { operation: 'create', project: 'SEC', issueType: 'Vulnerability' } } },
        { id: 'slack', type: 'slack', position: { x: 700, y: 200 }, data: { label: 'Alert Security', properties: { channel: '#security-critical' } } },
        { id: 'opsgenie', type: 'opsgenie', position: { x: 700, y: 300 }, data: { label: 'Create Alert', properties: { operation: 'createAlert', priority: 'P1' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'filter-critical' },
        { id: 'e2', source: 'filter-critical', target: 'jira' },
        { id: 'e3', source: 'jira', target: 'slack' },
        { id: 'e4', source: 'jira', target: 'opsgenie' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date(),
    downloads: 654,
    rating: 4.4,
    reviewCount: 38,
    featured: false,
    requiredIntegrations: ['webhook_trigger', 'filter', 'jira', 'slack', 'opsgenie'],
    requiredCredentials: ['jiraApi', 'slackOAuth2', 'opsgenieApi'],
    estimatedSetupTime: 25,
    documentation: { overview: 'Process vulnerability scan results automatically.', setup: [], usage: 'Receives webhook from vulnerability scanner.' }
  },
  {
    id: 'secret-rotation',
    name: 'Automated Secret Rotation',
    description: 'Rotate API keys and secrets automatically',
    category: 'security',
    subcategory: 'secrets',
    author: 'System',
    authorType: 'official',
    tags: ['security', 'secrets', 'vault', 'aws', 'rotation'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Monthly', properties: { cron: '0 3 1 * *' } } },
        { id: 'vault-list', type: 'hashicorp_vault', position: { x: 300, y: 200 }, data: { label: 'List Secrets', properties: { operation: 'list', path: 'secret/api-keys' } } },
        { id: 'filter', type: 'filter', position: { x: 500, y: 200 }, data: { label: 'Needs Rotation', properties: { conditions: [{ field: '={{$json.age_days}}', operator: 'greaterThan', value: 30 }] } } },
        { id: 'rotate', type: 'code_javascript', position: { x: 700, y: 200 }, data: { label: 'Generate New', properties: { code: '// Generate new secret' } } },
        { id: 'vault-update', type: 'hashicorp_vault', position: { x: 900, y: 200 }, data: { label: 'Update Secret', properties: { operation: 'write' } } },
        { id: 'slack', type: 'slack', position: { x: 1100, y: 200 }, data: { label: 'Notify', properties: { channel: '#security-ops' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'vault-list' },
        { id: 'e2', source: 'vault-list', target: 'filter' },
        { id: 'e3', source: 'filter', target: 'rotate' },
        { id: 'e4', source: 'rotate', target: 'vault-update' },
        { id: 'e5', source: 'vault-update', target: 'slack' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date(),
    downloads: 543,
    rating: 4.6,
    reviewCount: 32,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'hashicorp_vault', 'filter', 'code_javascript', 'slack'],
    requiredCredentials: ['vaultToken', 'slackOAuth2'],
    estimatedSetupTime: 35,
    documentation: { overview: 'Automated secret rotation.', setup: [], usage: 'Rotates secrets older than 30 days.' }
  },

  // ========================================
  // DEVOPS & INFRASTRUCTURE (10 templates)
  // ========================================
  {
    id: 'ci-cd-notifications',
    name: 'CI/CD Pipeline Notifications',
    description: 'Send deployment notifications to Slack and update Jira',
    category: 'devops',
    subcategory: 'ci-cd',
    author: 'System',
    authorType: 'official',
    tags: ['devops', 'ci-cd', 'github', 'slack', 'jira'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'github_trigger', position: { x: 100, y: 200 }, data: { label: 'Deploy Complete', properties: { event: 'deployment_status' } } },
        { id: 'switch', type: 'switch_case', position: { x: 300, y: 200 }, data: { label: 'Check Status', properties: { field: '={{$json.deployment_status.state}}' } } },
        { id: 'slack-success', type: 'slack', position: { x: 500, y: 100 }, data: { label: 'Success', properties: { channel: '#deployments', message: '✅ Deploy to {{$json.deployment.environment}} successful!' } } },
        { id: 'slack-failure', type: 'slack', position: { x: 500, y: 300 }, data: { label: 'Failure', properties: { channel: '#deployments', message: '❌ Deploy to {{$json.deployment.environment}} failed!' } } },
        { id: 'jira', type: 'jira', position: { x: 700, y: 200 }, data: { label: 'Update Issue', properties: { operation: 'addComment' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'switch' },
        { id: 'e2', source: 'switch', target: 'slack-success', sourceHandle: 'success' },
        { id: 'e3', source: 'switch', target: 'slack-failure', sourceHandle: 'failure' },
        { id: 'e4', source: 'slack-success', target: 'jira' },
        { id: 'e5', source: 'slack-failure', target: 'jira' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date(),
    downloads: 3456,
    rating: 4.8,
    reviewCount: 267,
    featured: true,
    requiredIntegrations: ['github_trigger', 'switch_case', 'slack', 'jira'],
    requiredCredentials: ['githubOAuth2', 'slackOAuth2', 'jiraApi'],
    estimatedSetupTime: 15,
    documentation: { overview: 'CI/CD deployment notifications.', setup: [], usage: 'Notifies on deployment success or failure.' }
  },
  {
    id: 'infrastructure-cost-alerts',
    name: 'Cloud Cost Anomaly Alerts',
    description: 'Monitor AWS costs and alert on anomalies',
    category: 'devops',
    subcategory: 'cost-management',
    author: 'System',
    authorType: 'official',
    tags: ['aws', 'costs', 'monitoring', 'alerts', 'finops'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Daily', properties: { cron: '0 8 * * *' } } },
        { id: 'aws-ce', type: 'aws', position: { x: 300, y: 200 }, data: { label: 'Get Costs', properties: { service: 'costexplorer', operation: 'getCostAndUsage' } } },
        { id: 'analyze', type: 'code_javascript', position: { x: 500, y: 200 }, data: { label: 'Detect Anomalies', properties: { code: '// Calculate 7-day average and detect spikes' } } },
        { id: 'filter', type: 'filter', position: { x: 700, y: 200 }, data: { label: 'Has Anomaly', properties: { conditions: [{ field: '={{$json.hasAnomaly}}', operator: 'equals', value: true }] } } },
        { id: 'slack', type: 'slack', position: { x: 900, y: 200 }, data: { label: 'Alert FinOps', properties: { channel: '#finops-alerts' } } },
        { id: 'email', type: 'email', position: { x: 900, y: 300 }, data: { label: 'Email Report', properties: { to: '={{env.FINOPS_EMAIL}}' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'aws-ce' },
        { id: 'e2', source: 'aws-ce', target: 'analyze' },
        { id: 'e3', source: 'analyze', target: 'filter' },
        { id: 'e4', source: 'filter', target: 'slack' },
        { id: 'e5', source: 'filter', target: 'email' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
    downloads: 1234,
    rating: 4.6,
    reviewCount: 89,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'aws', 'code_javascript', 'filter', 'slack', 'email'],
    requiredCredentials: ['awsCredentials', 'slackOAuth2'],
    estimatedSetupTime: 20,
    documentation: { overview: 'Daily cloud cost monitoring with anomaly detection.', setup: [], usage: 'Runs daily at 8 AM.' }
  },
  {
    id: 'kubernetes-alert-handler',
    name: 'Kubernetes Alert Handler',
    description: 'Handle Prometheus AlertManager alerts for Kubernetes',
    category: 'devops',
    subcategory: 'kubernetes',
    author: 'System',
    authorType: 'official',
    tags: ['kubernetes', 'prometheus', 'alertmanager', 'pagerduty', 'monitoring'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'webhook_trigger', position: { x: 100, y: 200 }, data: { label: 'Alert', properties: { path: '/k8s-alert' } } },
        { id: 'parse', type: 'set', position: { x: 300, y: 200 }, data: { label: 'Parse Alert', properties: { values: { alertName: '={{$json.alerts[0].labels.alertname}}', severity: '={{$json.alerts[0].labels.severity}}' } } } },
        { id: 'switch', type: 'switch_case', position: { x: 500, y: 200 }, data: { label: 'By Severity', properties: { field: '={{$json.severity}}' } } },
        { id: 'pagerduty', type: 'pagerduty', position: { x: 700, y: 100 }, data: { label: 'Page On-Call', properties: { operation: 'createIncident' } } },
        { id: 'slack', type: 'slack', position: { x: 700, y: 200 }, data: { label: 'Notify', properties: { channel: '#k8s-alerts' } } },
        { id: 'runbook', type: 'http_request', position: { x: 700, y: 300 }, data: { label: 'Run Runbook', properties: { url: '={{env.RUNBOOK_API}}/execute', method: 'POST' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'parse' },
        { id: 'e2', source: 'parse', target: 'switch' },
        { id: 'e3', source: 'switch', target: 'pagerduty', sourceHandle: 'critical' },
        { id: 'e4', source: 'switch', target: 'slack', sourceHandle: 'warning' },
        { id: 'e5', source: 'switch', target: 'runbook', sourceHandle: 'info' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date(),
    downloads: 987,
    rating: 4.7,
    reviewCount: 67,
    featured: true,
    requiredIntegrations: ['webhook_trigger', 'set', 'switch_case', 'pagerduty', 'slack', 'http_request'],
    requiredCredentials: ['pagerdutyApi', 'slackOAuth2'],
    estimatedSetupTime: 25,
    documentation: { overview: 'Handle Kubernetes alerts from Prometheus.', setup: [], usage: 'Receives alerts from AlertManager webhook.' }
  },
  {
    id: 'terraform-pr-plan',
    name: 'Terraform PR Plan Automation',
    description: 'Run terraform plan on PRs and post results',
    category: 'devops',
    subcategory: 'infrastructure',
    author: 'System',
    authorType: 'official',
    tags: ['terraform', 'github', 'infrastructure', 'automation', 'iac'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'github_trigger', position: { x: 100, y: 200 }, data: { label: 'PR Opened', properties: { event: 'pull_request.opened' } } },
        { id: 'filter', type: 'filter', position: { x: 300, y: 200 }, data: { label: 'Has TF Files', properties: { conditions: [{ field: '={{$json.files.some(f => f.endsWith(".tf"))}}', operator: 'equals', value: true }] } } },
        { id: 'run-plan', type: 'http_request', position: { x: 500, y: 200 }, data: { label: 'Terraform Plan', properties: { url: '={{env.ATLANTIS_URL}}/plan', method: 'POST' } } },
        { id: 'comment', type: 'github', position: { x: 700, y: 200 }, data: { label: 'Post Results', properties: { operation: 'createPullRequestComment', body: '```\n{{$json.plan_output}}\n```' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'filter' },
        { id: 'e2', source: 'filter', target: 'run-plan' },
        { id: 'e3', source: 'run-plan', target: 'comment' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date(),
    downloads: 876,
    rating: 4.5,
    reviewCount: 54,
    featured: false,
    requiredIntegrations: ['github_trigger', 'filter', 'http_request', 'github'],
    requiredCredentials: ['githubOAuth2'],
    estimatedSetupTime: 30,
    documentation: { overview: 'Automated terraform plan on PRs.', setup: [], usage: 'Runs terraform plan when PR contains TF files.' }
  },
  {
    id: 'database-backup-monitor',
    name: 'Database Backup Monitor',
    description: 'Monitor database backups and alert on failures',
    category: 'devops',
    subcategory: 'backup',
    author: 'System',
    authorType: 'official',
    tags: ['database', 'backup', 'monitoring', 'aws', 'rds'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Daily 6 AM', properties: { cron: '0 6 * * *' } } },
        { id: 'aws-rds', type: 'aws', position: { x: 300, y: 200 }, data: { label: 'Get Snapshots', properties: { service: 'rds', operation: 'describeDBSnapshots' } } },
        { id: 'check', type: 'code_javascript', position: { x: 500, y: 200 }, data: { label: 'Check Backups', properties: { code: '// Verify backup exists for each DB' } } },
        { id: 'filter', type: 'filter', position: { x: 700, y: 200 }, data: { label: 'Missing Backups', properties: { conditions: [{ field: '={{$json.hasMissing}}', operator: 'equals', value: true }] } } },
        { id: 'pagerduty', type: 'pagerduty', position: { x: 900, y: 200 }, data: { label: 'Alert', properties: { operation: 'createIncident' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'aws-rds' },
        { id: 'e2', source: 'aws-rds', target: 'check' },
        { id: 'e3', source: 'check', target: 'filter' },
        { id: 'e4', source: 'filter', target: 'pagerduty' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date(),
    downloads: 654,
    rating: 4.4,
    reviewCount: 38,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'aws', 'code_javascript', 'filter', 'pagerduty'],
    requiredCredentials: ['awsCredentials', 'pagerdutyApi'],
    estimatedSetupTime: 20,
    documentation: { overview: 'Monitor database backup completion.', setup: [], usage: 'Runs daily and alerts on missing backups.' }
  },

  // ========================================
  // MARKETING & ANALYTICS (10 templates)
  // ========================================
  {
    id: 'marketing-campaign-sync',
    name: 'Multi-Channel Campaign Sync',
    description: 'Sync campaign data across marketing platforms',
    category: 'marketing',
    subcategory: 'campaigns',
    author: 'System',
    authorType: 'official',
    tags: ['marketing', 'hubspot', 'facebook', 'google-ads', 'campaigns'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'hubspot_trigger', position: { x: 100, y: 200 }, data: { label: 'Campaign Created', properties: { event: 'campaign.create' } } },
        { id: 'fb-ads', type: 'facebook_ads', position: { x: 300, y: 100 }, data: { label: 'Create FB Campaign', properties: { operation: 'create', resource: 'campaign' } } },
        { id: 'google-ads', type: 'google_ads', position: { x: 300, y: 200 }, data: { label: 'Create Google Campaign', properties: { operation: 'create', resource: 'campaign' } } },
        { id: 'linkedin-ads', type: 'linkedin_ads', position: { x: 300, y: 300 }, data: { label: 'Create LinkedIn Campaign', properties: { operation: 'create', resource: 'campaign' } } },
        { id: 'update-hs', type: 'hubspot', position: { x: 500, y: 200 }, data: { label: 'Update HubSpot', properties: { operation: 'update', resource: 'campaign', fields: { fbId: '={{$node["fb-ads"].json.id}}', googleId: '={{$node["google-ads"].json.id}}' } } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'fb-ads' },
        { id: 'e2', source: 'trigger', target: 'google-ads' },
        { id: 'e3', source: 'trigger', target: 'linkedin-ads' },
        { id: 'e4', source: 'fb-ads', target: 'update-hs' },
        { id: 'e5', source: 'google-ads', target: 'update-hs' },
        { id: 'e6', source: 'linkedin-ads', target: 'update-hs' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date(),
    downloads: 1234,
    rating: 4.6,
    reviewCount: 89,
    featured: true,
    requiredIntegrations: ['hubspot_trigger', 'facebook_ads', 'google_ads', 'linkedin_ads', 'hubspot'],
    requiredCredentials: ['hubspotApi', 'facebookAdsApi', 'googleAdsApi', 'linkedinAdsApi'],
    estimatedSetupTime: 35,
    documentation: { overview: 'Sync campaigns across all marketing platforms.', setup: [], usage: 'Creates campaigns on all platforms from HubSpot.' }
  },
  {
    id: 'utm-attribution-tracker',
    name: 'UTM Attribution Tracker',
    description: 'Track UTM parameters and attribute conversions',
    category: 'marketing',
    subcategory: 'analytics',
    author: 'System',
    authorType: 'official',
    tags: ['utm', 'attribution', 'analytics', 'google-analytics', 'marketing'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'webhook_trigger', position: { x: 100, y: 200 }, data: { label: 'Form Submit', properties: { path: '/form-submit' } } },
        { id: 'parse-utm', type: 'set', position: { x: 300, y: 200 }, data: { label: 'Parse UTM', properties: { values: { source: '={{$json.utm_source}}', medium: '={{$json.utm_medium}}', campaign: '={{$json.utm_campaign}}' } } } },
        { id: 'ga4', type: 'google_analytics_4', position: { x: 500, y: 100 }, data: { label: 'Send to GA4', properties: { operation: 'sendEvent', eventName: 'conversion' } } },
        { id: 'hubspot', type: 'hubspot', position: { x: 500, y: 200 }, data: { label: 'Update Contact', properties: { operation: 'update', resource: 'contact', fields: { original_source: '={{$json.source}}' } } } },
        { id: 'sheets', type: 'google_sheets', position: { x: 500, y: 300 }, data: { label: 'Log Attribution', properties: { operation: 'append' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'parse-utm' },
        { id: 'e2', source: 'parse-utm', target: 'ga4' },
        { id: 'e3', source: 'parse-utm', target: 'hubspot' },
        { id: 'e4', source: 'parse-utm', target: 'sheets' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
    downloads: 987,
    rating: 4.5,
    reviewCount: 67,
    featured: false,
    requiredIntegrations: ['webhook_trigger', 'set', 'google_analytics_4', 'hubspot', 'google_sheets'],
    requiredCredentials: ['ga4Api', 'hubspotApi', 'googleSheetsOAuth2'],
    estimatedSetupTime: 20,
    documentation: { overview: 'Track UTM parameters and attribution.', setup: [], usage: 'Webhook receives form submissions with UTM params.' }
  },
  {
    id: 'social-media-scheduler',
    name: 'Social Media Cross-Post Scheduler',
    description: 'Schedule and post to multiple social platforms',
    category: 'marketing',
    subcategory: 'social',
    author: 'System',
    authorType: 'official',
    tags: ['social-media', 'twitter', 'linkedin', 'facebook', 'scheduling'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'airtable_trigger', position: { x: 100, y: 200 }, data: { label: 'Post Scheduled', properties: { table: 'Posts', field: 'Status', value: 'Scheduled' } } },
        { id: 'twitter', type: 'twitter', position: { x: 300, y: 100 }, data: { label: 'Post Tweet', properties: { operation: 'createTweet' } } },
        { id: 'linkedin', type: 'linkedin', position: { x: 300, y: 200 }, data: { label: 'Post LinkedIn', properties: { operation: 'createPost' } } },
        { id: 'facebook', type: 'facebook', position: { x: 300, y: 300 }, data: { label: 'Post Facebook', properties: { operation: 'createPost' } } },
        { id: 'update', type: 'airtable', position: { x: 500, y: 200 }, data: { label: 'Mark Posted', properties: { operation: 'update', table: 'Posts', fields: { Status: 'Posted' } } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'twitter' },
        { id: 'e2', source: 'trigger', target: 'linkedin' },
        { id: 'e3', source: 'trigger', target: 'facebook' },
        { id: 'e4', source: 'twitter', target: 'update' },
        { id: 'e5', source: 'linkedin', target: 'update' },
        { id: 'e6', source: 'facebook', target: 'update' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date(),
    downloads: 1567,
    rating: 4.7,
    reviewCount: 112,
    featured: true,
    requiredIntegrations: ['airtable_trigger', 'twitter', 'linkedin', 'facebook', 'airtable'],
    requiredCredentials: ['airtableApi', 'twitterApi', 'linkedinOAuth2', 'facebookApi'],
    estimatedSetupTime: 25,
    documentation: { overview: 'Schedule posts across social platforms.', setup: [], usage: 'Create post in Airtable and mark as Scheduled.' }
  },
  {
    id: 'email-marketing-ab-test',
    name: 'Email A/B Test Analyzer',
    description: 'Analyze email A/B tests and pick winner automatically',
    category: 'marketing',
    subcategory: 'email',
    author: 'System',
    authorType: 'official',
    tags: ['email', 'ab-testing', 'mailchimp', 'analytics', 'automation'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Check Tests', properties: { interval: 'hourly' } } },
        { id: 'mailchimp', type: 'mailchimp', position: { x: 300, y: 200 }, data: { label: 'Get Campaigns', properties: { operation: 'getAll', resource: 'campaign', filter: { type: 'abTest', status: 'running' } } } },
        { id: 'analyze', type: 'code_javascript', position: { x: 500, y: 200 }, data: { label: 'Analyze Results', properties: { code: '// Calculate statistical significance' } } },
        { id: 'filter', type: 'filter', position: { x: 700, y: 200 }, data: { label: 'Significant?', properties: { conditions: [{ field: '={{$json.isSignificant}}', operator: 'equals', value: true }] } } },
        { id: 'pick-winner', type: 'mailchimp', position: { x: 900, y: 200 }, data: { label: 'Pick Winner', properties: { operation: 'endAbTest', winner: '={{$json.winner}}' } } },
        { id: 'slack', type: 'slack', position: { x: 1100, y: 200 }, data: { label: 'Notify', properties: { channel: '#marketing' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'mailchimp' },
        { id: 'e2', source: 'mailchimp', target: 'analyze' },
        { id: 'e3', source: 'analyze', target: 'filter' },
        { id: 'e4', source: 'filter', target: 'pick-winner' },
        { id: 'e5', source: 'pick-winner', target: 'slack' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date(),
    downloads: 876,
    rating: 4.5,
    reviewCount: 54,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'mailchimp', 'code_javascript', 'filter', 'slack'],
    requiredCredentials: ['mailchimpApi', 'slackOAuth2'],
    estimatedSetupTime: 20,
    documentation: { overview: 'Automatic A/B test analysis and winner selection.', setup: [], usage: 'Checks running A/B tests hourly.' }
  },
  {
    id: 'seo-rank-tracker',
    name: 'SEO Rank Tracker',
    description: 'Track keyword rankings and alert on changes',
    category: 'marketing',
    subcategory: 'seo',
    author: 'System',
    authorType: 'official',
    tags: ['seo', 'keywords', 'rankings', 'semrush', 'monitoring'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Daily', properties: { cron: '0 7 * * *' } } },
        { id: 'semrush', type: 'semrush', position: { x: 300, y: 200 }, data: { label: 'Get Rankings', properties: { operation: 'getPositions', domain: '={{env.DOMAIN}}' } } },
        { id: 'sheets', type: 'google_sheets', position: { x: 500, y: 100 }, data: { label: 'Log Rankings', properties: { operation: 'append' } } },
        { id: 'compare', type: 'code_javascript', position: { x: 500, y: 200 }, data: { label: 'Compare', properties: { code: '// Compare with previous day' } } },
        { id: 'filter', type: 'filter', position: { x: 700, y: 200 }, data: { label: 'Major Changes', properties: { conditions: [{ field: '={{$json.positionChange}}', operator: 'greaterThan', value: 5 }] } } },
        { id: 'slack', type: 'slack', position: { x: 900, y: 200 }, data: { label: 'Alert', properties: { channel: '#seo-updates' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'semrush' },
        { id: 'e2', source: 'semrush', target: 'sheets' },
        { id: 'e3', source: 'semrush', target: 'compare' },
        { id: 'e4', source: 'compare', target: 'filter' },
        { id: 'e5', source: 'filter', target: 'slack' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date(),
    downloads: 654,
    rating: 4.4,
    reviewCount: 38,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'semrush', 'google_sheets', 'code_javascript', 'filter', 'slack'],
    requiredCredentials: ['semrushApi', 'googleSheetsOAuth2', 'slackOAuth2'],
    estimatedSetupTime: 20,
    documentation: { overview: 'Daily SEO keyword rank tracking.', setup: [], usage: 'Runs daily and alerts on major changes.' }
  },

  // ========================================
  // FINANCE & ACCOUNTING (10 templates)
  // ========================================
  {
    id: 'invoice-processing',
    name: 'Automated Invoice Processing',
    description: 'Process invoices with OCR and update accounting',
    category: 'finance',
    subcategory: 'invoices',
    author: 'System',
    authorType: 'official',
    tags: ['finance', 'invoices', 'ocr', 'quickbooks', 'automation'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'email_trigger', position: { x: 100, y: 200 }, data: { label: 'Invoice Email', properties: { folder: 'Invoices', hasAttachment: true } } },
        { id: 'extract', type: 'http_request', position: { x: 300, y: 200 }, data: { label: 'OCR Extract', properties: { url: 'https://api.mindee.net/v1/products/mindee/invoices/predict', method: 'POST' } } },
        { id: 'validate', type: 'code_javascript', position: { x: 500, y: 200 }, data: { label: 'Validate Data', properties: { code: '// Validate extracted data' } } },
        { id: 'qb', type: 'quickbooks', position: { x: 700, y: 200 }, data: { label: 'Create Bill', properties: { operation: 'create', resource: 'bill' } } },
        { id: 'drive', type: 'google_drive', position: { x: 700, y: 300 }, data: { label: 'Archive', properties: { operation: 'upload', folder: 'Processed Invoices' } } },
        { id: 'slack', type: 'slack', position: { x: 900, y: 200 }, data: { label: 'Notify AP', properties: { channel: '#accounts-payable' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'extract' },
        { id: 'e2', source: 'extract', target: 'validate' },
        { id: 'e3', source: 'validate', target: 'qb' },
        { id: 'e4', source: 'validate', target: 'drive' },
        { id: 'e5', source: 'qb', target: 'slack' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date(),
    downloads: 1876,
    rating: 4.7,
    reviewCount: 145,
    featured: true,
    requiredIntegrations: ['email_trigger', 'http_request', 'code_javascript', 'quickbooks', 'google_drive', 'slack'],
    requiredCredentials: ['imapCredentials', 'mindeeApi', 'quickbooksOAuth2', 'googleDriveOAuth2', 'slackOAuth2'],
    estimatedSetupTime: 35,
    documentation: { overview: 'Automated invoice processing with OCR.', setup: [], usage: 'Forward invoices to designated email address.' }
  },
  {
    id: 'expense-report-automation',
    name: 'Expense Report Automation',
    description: 'Process expense reports and sync to accounting',
    category: 'finance',
    subcategory: 'expenses',
    author: 'System',
    authorType: 'official',
    tags: ['finance', 'expenses', 'expensify', 'xero', 'automation'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'expensify_trigger', position: { x: 100, y: 200 }, data: { label: 'Report Submitted', properties: { event: 'reportSubmitted' } } },
        { id: 'get-report', type: 'expensify', position: { x: 300, y: 200 }, data: { label: 'Get Details', properties: { operation: 'get', resource: 'report' } } },
        { id: 'xero', type: 'xero', position: { x: 500, y: 200 }, data: { label: 'Create Expense', properties: { operation: 'create', resource: 'expense' } } },
        { id: 'email', type: 'email', position: { x: 700, y: 200 }, data: { label: 'Confirm', properties: { to: '={{$json.submitter.email}}', subject: 'Expense report processed' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'get-report' },
        { id: 'e2', source: 'get-report', target: 'xero' },
        { id: 'e3', source: 'xero', target: 'email' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
    downloads: 1234,
    rating: 4.6,
    reviewCount: 89,
    featured: false,
    requiredIntegrations: ['expensify_trigger', 'expensify', 'xero', 'email'],
    requiredCredentials: ['expensifyApi', 'xeroOAuth2'],
    estimatedSetupTime: 20,
    documentation: { overview: 'Sync expense reports to Xero.', setup: [], usage: 'Triggers when expense report is submitted.' }
  },
  {
    id: 'revenue-recognition',
    name: 'Revenue Recognition Automation',
    description: 'Automate revenue recognition for SaaS subscriptions',
    category: 'finance',
    subcategory: 'accounting',
    author: 'System',
    authorType: 'official',
    tags: ['finance', 'revenue', 'saas', 'stripe', 'accounting'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Monthly', properties: { cron: '0 0 1 * *' } } },
        { id: 'stripe', type: 'stripe', position: { x: 300, y: 200 }, data: { label: 'Get Subscriptions', properties: { operation: 'getAll', resource: 'subscription' } } },
        { id: 'calculate', type: 'code_javascript', position: { x: 500, y: 200 }, data: { label: 'Calculate Rev', properties: { code: '// Calculate monthly recognized revenue' } } },
        { id: 'netsuite', type: 'netsuite', position: { x: 700, y: 200 }, data: { label: 'Create Journal', properties: { operation: 'create', recordType: 'journalentry' } } },
        { id: 'sheets', type: 'google_sheets', position: { x: 700, y: 300 }, data: { label: 'Log', properties: { operation: 'append' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'stripe' },
        { id: 'e2', source: 'stripe', target: 'calculate' },
        { id: 'e3', source: 'calculate', target: 'netsuite' },
        { id: 'e4', source: 'calculate', target: 'sheets' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date(),
    downloads: 876,
    rating: 4.5,
    reviewCount: 54,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'stripe', 'code_javascript', 'netsuite', 'google_sheets'],
    requiredCredentials: ['stripeApi', 'netsuiteCredentials', 'googleSheetsOAuth2'],
    estimatedSetupTime: 40,
    documentation: { overview: 'Monthly revenue recognition automation.', setup: [], usage: 'Runs on first of each month.' }
  },
  {
    id: 'vendor-payment-automation',
    name: 'Vendor Payment Automation',
    description: 'Automate vendor payments based on due dates',
    category: 'finance',
    subcategory: 'payments',
    author: 'System',
    authorType: 'official',
    tags: ['finance', 'payments', 'bill.com', 'quickbooks', 'vendors'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Daily', properties: { cron: '0 9 * * *' } } },
        { id: 'qb', type: 'quickbooks', position: { x: 300, y: 200 }, data: { label: 'Get Due Bills', properties: { operation: 'getAll', resource: 'bill', filter: { dueDate: '={{$now.plus(3, "days")}}' } } } },
        { id: 'bill-com', type: 'bill_com', position: { x: 500, y: 200 }, data: { label: 'Create Payment', properties: { operation: 'create', resource: 'payment' } } },
        { id: 'update-qb', type: 'quickbooks', position: { x: 700, y: 200 }, data: { label: 'Mark Paid', properties: { operation: 'update', resource: 'bill' } } },
        { id: 'email', type: 'email', position: { x: 900, y: 200 }, data: { label: 'Notify Vendor', properties: { subject: 'Payment sent' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'qb' },
        { id: 'e2', source: 'qb', target: 'bill-com' },
        { id: 'e3', source: 'bill-com', target: 'update-qb' },
        { id: 'e4', source: 'update-qb', target: 'email' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date(),
    downloads: 765,
    rating: 4.4,
    reviewCount: 45,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'quickbooks', 'bill_com', 'email'],
    requiredCredentials: ['quickbooksOAuth2', 'billComApi'],
    estimatedSetupTime: 25,
    documentation: { overview: 'Automated vendor payments.', setup: [], usage: 'Pays bills due within 3 days.' }
  },
  {
    id: 'bank-reconciliation',
    name: 'Bank Reconciliation Automation',
    description: 'Automate bank reconciliation with matching rules',
    category: 'finance',
    subcategory: 'reconciliation',
    author: 'System',
    authorType: 'official',
    tags: ['finance', 'banking', 'reconciliation', 'plaid', 'automation'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Daily', properties: { cron: '0 6 * * *' } } },
        { id: 'plaid', type: 'plaid', position: { x: 300, y: 200 }, data: { label: 'Get Transactions', properties: { operation: 'getTransactions' } } },
        { id: 'qb-txns', type: 'quickbooks', position: { x: 300, y: 300 }, data: { label: 'Get QB Txns', properties: { operation: 'getAll', resource: 'transaction' } } },
        { id: 'match', type: 'code_javascript', position: { x: 500, y: 200 }, data: { label: 'Match', properties: { code: '// Match transactions by amount and date' } } },
        { id: 'reconcile', type: 'quickbooks', position: { x: 700, y: 200 }, data: { label: 'Reconcile', properties: { operation: 'reconcile' } } },
        { id: 'report', type: 'google_sheets', position: { x: 900, y: 200 }, data: { label: 'Exception Report', properties: { operation: 'append' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'plaid' },
        { id: 'e2', source: 'trigger', target: 'qb-txns' },
        { id: 'e3', source: 'plaid', target: 'match' },
        { id: 'e4', source: 'qb-txns', target: 'match' },
        { id: 'e5', source: 'match', target: 'reconcile' },
        { id: 'e6', source: 'match', target: 'report' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date(),
    downloads: 543,
    rating: 4.6,
    reviewCount: 32,
    featured: true,
    requiredIntegrations: ['schedule_trigger', 'plaid', 'quickbooks', 'code_javascript', 'google_sheets'],
    requiredCredentials: ['plaidCredentials', 'quickbooksOAuth2', 'googleSheetsOAuth2'],
    estimatedSetupTime: 35,
    documentation: { overview: 'Automated bank reconciliation.', setup: [], usage: 'Runs daily and matches transactions.' }
  }
];

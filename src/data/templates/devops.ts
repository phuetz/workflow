/**
 * Workflow Templates - devops
 */

import type { WorkflowTemplate } from '../../types/templates';

export const DEVOPS_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'backup-automation',
    name: 'Database Backup Automation',
    description: 'Automated database backups with cloud storage and retention policies.',
    category: 'devops',
    subcategory: 'backup',
    author: 'System',
    authorType: 'official',
    tags: ['backup', 'database', 'devops', 'storage', 'automation'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'schedule_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Daily 2AM',
            properties: {
              cron: '0 2 * * *'
            }
          }
        },
        {
          id: 'postgres-1',
          type: 'postgresql',
          position: { x: 300, y: 200 },
          data: {
            label: 'Create Backup',
            properties: {
              operation: 'raw',
              query: 'pg_dump dbname'
            },
            credentials: ['postgresApi']
          }
        },
        {
          id: 's3-1',
          type: 'awsS3',
          position: { x: 500, y: 200 },
          data: {
            label: 'Upload to S3',
            properties: {
              operation: 'upload',
              bucket: 'database-backups',
              key: 'backup-{{$now.format("YYYY-MM-DD")}}.sql'
            },
            credentials: ['awsApi']
          }
        },
        {
          id: 'cleanup-1',
          type: 'awsS3',
          position: { x: 700, y: 200 },
          data: {
            label: 'Cleanup Old Backups',
            properties: {
              operation: 'deleteObjects',
              bucket: 'database-backups',
              olderThan: 30
            },
            credentials: ['awsApi']
          }
        },
        {
          id: 'slack-1',
          type: 'slack',
          position: { x: 900, y: 200 },
          data: {
            label: 'Notify Team',
            properties: {
              channel: '#devops',
              text: 'Database backup completed: backup-{{$now.format("YYYY-MM-DD")}}.sql'
            },
            credentials: ['slackApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'postgres-1' },
        { id: 'e2', source: 'postgres-1', target: 's3-1' },
        { id: 'e3', source: 's3-1', target: 'cleanup-1' },
        { id: 'e4', source: 'cleanup-1', target: 'slack-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-27'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.8,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'postgresql', 'awsS3', 'slack'],
    requiredCredentials: ['postgresApi', 'awsApi', 'slackApi'],
    estimatedSetupTime: 20,
    documentation: {
      overview: 'Automated database backup workflow.',
      setup: [],
      usage: 'Runs daily at 2AM.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'deployment-notification',
    name: 'Deployment Notification',
    description: 'Notify teams when deployments happen across environments.',
    category: 'devops',
    subcategory: 'deployments',
    author: 'System',
    authorType: 'official',
    tags: ['deployment', 'notifications', 'devops', 'ci/cd'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'github_trigger', position: { x: 100, y: 200 }, data: { label: 'Deployment', properties: { event: 'deployment_status' }, credentials: ['githubApi'] } },
        { id: 'slack-1', type: 'slack', position: { x: 300, y: 200 }, data: { label: 'Notify Dev', properties: { channel: '#deployments' }, credentials: ['slackApi'] } },
        { id: 'pagerduty-1', type: 'pagerduty', position: { x: 500, y: 200 }, data: { label: 'Alert On-Call', properties: { operation: 'createEvent' }, credentials: ['pagerdutyApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'slack-1' },
        { id: 'e2', source: 'trigger-1', target: 'pagerduty-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-27'), updatedAt: new Date(), downloads: 0, rating: 4.7, reviewCount: 0, featured: false,
    requiredIntegrations: ['github_trigger', 'slack', 'pagerduty'], requiredCredentials: ['githubApi', 'slackApi', 'pagerdutyApi'], estimatedSetupTime: 15,
    documentation: { overview: 'Deployment notifications.', setup: [], usage: 'Triggers on GitHub deployments.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'infrastructure-monitoring',
    name: 'Infrastructure Monitoring',
    description: 'Monitor server health and alert on anomalies.',
    category: 'devops',
    subcategory: 'monitoring',
    author: 'System',
    authorType: 'official',
    tags: ['monitoring', 'servers', 'alerts', 'infrastructure'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Every 5 Min', properties: { cron: '*/5 * * * *' } } },
        { id: 'http-1', type: 'httpRequest', position: { x: 300, y: 200 }, data: { label: 'Check Metrics', properties: { url: 'https://metrics.company.com/api' } } },
        { id: 'code-1', type: 'code', position: { x: 500, y: 200 }, data: { label: 'Analyze', properties: { code: '// Check thresholds' } } },
        { id: 'switch-1', type: 'switchCase', position: { x: 700, y: 200 }, data: { label: 'Alert?', properties: { field: '={{$node["code-1"].json.alert}}' } } },
        { id: 'pagerduty-1', type: 'pagerduty', position: { x: 900, y: 200 }, data: { label: 'Create Incident', properties: { operation: 'createIncident' }, credentials: ['pagerdutyApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'http-1' },
        { id: 'e2', source: 'http-1', target: 'code-1' },
        { id: 'e3', source: 'code-1', target: 'switch-1' },
        { id: 'e4', source: 'switch-1', target: 'pagerduty-1', sourceHandle: 'true' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-28'), updatedAt: new Date(), downloads: 0, rating: 4.8, reviewCount: 0, featured: true,
    requiredIntegrations: ['schedule_trigger', 'httpRequest', 'code', 'switchCase', 'pagerduty'], requiredCredentials: ['pagerdutyApi'], estimatedSetupTime: 30,
    documentation: { overview: 'Server health monitoring.', setup: [], usage: 'Polls metrics endpoint.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'ssl-certificate-monitor',
    name: 'SSL Certificate Monitor',
    description: 'Monitor SSL certificate expiration and alert before expiry.',
    category: 'devops',
    subcategory: 'security',
    author: 'System',
    authorType: 'official',
    tags: ['ssl', 'certificates', 'security', 'monitoring'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Daily', properties: { cron: '0 9 * * *' } } },
        { id: 'http-1', type: 'httpRequest', position: { x: 300, y: 200 }, data: { label: 'Check Cert', properties: { url: 'https://api.ssllabs.com/api/v3/analyze' } } },
        { id: 'filter-1', type: 'filter', position: { x: 500, y: 200 }, data: { label: 'Expiring Soon', properties: { condition: '={{$input.daysUntilExpiry < 30}}' } } },
        { id: 'slack-1', type: 'slack', position: { x: 700, y: 200 }, data: { label: 'Alert Team', properties: { channel: '#security' }, credentials: ['slackApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'http-1' },
        { id: 'e2', source: 'http-1', target: 'filter-1' },
        { id: 'e3', source: 'filter-1', target: 'slack-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-29'), updatedAt: new Date(), downloads: 0, rating: 4.6, reviewCount: 0, featured: false,
    requiredIntegrations: ['schedule_trigger', 'httpRequest', 'filter', 'slack'], requiredCredentials: ['slackApi'], estimatedSetupTime: 15,
    documentation: { overview: 'SSL expiration monitoring.', setup: [], usage: 'Checks certificates daily.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'incident-response',
    name: 'Incident Response Automation',
    description: 'Automate incident response with notifications and runbook execution.',
    category: 'devops',
    subcategory: 'incidents',
    author: 'System',
    authorType: 'official',
    tags: ['incidents', 'response', 'automation', 'devops'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'pagerduty_trigger', position: { x: 100, y: 200 }, data: { label: 'New Incident', properties: { event: 'incident.triggered' }, credentials: ['pagerdutyApi'] } },
        { id: 'slack-1', type: 'slack', position: { x: 300, y: 100 }, data: { label: 'Create Channel', properties: { operation: 'createChannel', name: 'incident-{{$input.id}}' }, credentials: ['slackApi'] } },
        { id: 'jira-1', type: 'jira', position: { x: 300, y: 200 }, data: { label: 'Create Issue', properties: { operation: 'createIssue', type: 'Incident' }, credentials: ['jiraApi'] } },
        { id: 'confluence-1', type: 'confluence', position: { x: 300, y: 300 }, data: { label: 'Create Postmortem', properties: { operation: 'createPage', template: 'postmortem' }, credentials: ['confluenceApi'] } },
        { id: 'email-1', type: 'sendgrid', position: { x: 500, y: 200 }, data: { label: 'Notify Stakeholders', properties: { templateId: 'incident-notification' }, credentials: ['sendgridApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'slack-1' },
        { id: 'e2', source: 'trigger-1', target: 'jira-1' },
        { id: 'e3', source: 'trigger-1', target: 'confluence-1' },
        { id: 'e4', source: 'jira-1', target: 'email-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-30'), updatedAt: new Date(), downloads: 0, rating: 4.9, reviewCount: 0, featured: true,
    requiredIntegrations: ['pagerduty_trigger', 'slack', 'jira', 'confluence', 'sendgrid'], requiredCredentials: ['pagerdutyApi', 'slackApi', 'jiraApi', 'confluenceApi', 'sendgridApi'], estimatedSetupTime: 45,
    documentation: { overview: 'Automated incident response.', setup: [], usage: 'Triggers on PagerDuty incidents.' }, screenshots: [], customizableFields: [], pricing: 'free'
  }
];

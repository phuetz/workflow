/**
 * Workflow Templates - security
 */

import type { WorkflowTemplate } from '../../types/templates';

export const SECURITY_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'security-alert-workflow',
    name: 'Security Alert Workflow',
    description: 'Monitor security events and automatically respond to threats with multi-channel alerts.',
    category: 'security',
    subcategory: 'monitoring',
    author: 'System',
    authorType: 'official',
    tags: ['security', 'alerts', 'monitoring', 'siem', 'threats'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Security Event',
            properties: {
              path: '/security-event',
              methods: ['POST']
            }
          }
        },
        {
          id: 'classify-1',
          type: 'code',
          position: { x: 300, y: 200 },
          data: {
            label: 'Classify Threat',
            properties: {
              code: `// Classify security threat
const severity = event.type === 'intrusion' ? 'critical' :
                 event.type === 'malware' ? 'high' :
                 event.type === 'suspicious' ? 'medium' : 'low';
return [{...event, severity}];`
            }
          }
        },
        {
          id: 'pagerduty-1',
          type: 'pagerduty',
          position: { x: 500, y: 150 },
          data: {
            label: 'Alert Security Team',
            properties: {
              operation: 'createIncident',
              title: 'Security Alert: {{$input.type}}',
              severity: '={{$node["classify-1"].json.severity}}'
            },
            credentials: ['pagerdutyApi']
          }
        },
        {
          id: 'jira-1',
          type: 'jira',
          position: { x: 500, y: 250 },
          data: {
            label: 'Create Ticket',
            properties: {
              operation: 'createIssue',
              project: 'SEC',
              issueType: 'Bug',
              summary: 'Security Alert: {{$input.type}}'
            },
            credentials: ['jiraApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'classify-1' },
        { id: 'e2', source: 'classify-1', target: 'pagerduty-1' },
        { id: 'e3', source: 'classify-1', target: 'jira-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-18'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.8,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['webhook_trigger', 'code', 'pagerduty', 'jira'],
    requiredCredentials: ['pagerdutyApi', 'jiraApi'],
    estimatedSetupTime: 20,
    documentation: {
      overview: 'Automated security incident response.',
      setup: [],
      usage: 'Integrate with SIEM to send events.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  }
];

/**
 * Workflow Templates - communication
 */

import type { WorkflowTemplate } from '../../types/templates';

export const COMMUNICATION_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'multi-channel-notifications',
    name: 'Multi-Channel Notifications',
    description: 'Send notifications across multiple channels based on user preferences.',
    category: 'communication',
    subcategory: 'notifications',
    author: 'System',
    authorType: 'official',
    tags: ['notifications', 'email', 'sms', 'slack', 'push'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Notification Request',
            properties: {
              path: '/notify',
              methods: ['POST']
            }
          }
        },
        {
          id: 'route-1',
          type: 'switchCase',
          position: { x: 300, y: 200 },
          data: {
            label: 'By Channel',
            properties: {
              field: '={{$input.channel}}',
              cases: ['email', 'sms', 'slack', 'push']
            }
          }
        },
        {
          id: 'email-1',
          type: 'sendgrid',
          position: { x: 500, y: 100 },
          data: {
            label: 'Send Email',
            properties: {
              to: '={{$input.recipient}}',
              subject: '={{$input.subject}}',
              text: '={{$input.message}}'
            },
            credentials: ['sendgridApi']
          }
        },
        {
          id: 'sms-1',
          type: 'twilio',
          position: { x: 500, y: 200 },
          data: {
            label: 'Send SMS',
            properties: {
              to: '={{$input.recipient}}',
              body: '={{$input.message}}'
            },
            credentials: ['twilioApi']
          }
        },
        {
          id: 'slack-1',
          type: 'slack',
          position: { x: 500, y: 300 },
          data: {
            label: 'Send Slack',
            properties: {
              channel: '={{$input.recipient}}',
              text: '={{$input.message}}'
            },
            credentials: ['slackApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'route-1' },
        { id: 'e2', source: 'route-1', target: 'email-1', sourceHandle: 'email' },
        { id: 'e3', source: 'route-1', target: 'sms-1', sourceHandle: 'sms' },
        { id: 'e4', source: 'route-1', target: 'slack-1', sourceHandle: 'slack' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-17'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.7,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['webhook_trigger', 'switchCase', 'sendgrid', 'twilio', 'slack'],
    requiredCredentials: ['sendgridApi', 'twilioApi', 'slackApi'],
    estimatedSetupTime: 15,
    documentation: {
      overview: 'Unified notification system.',
      setup: [],
      usage: 'Call webhook with channel and message.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'slack-to-email-digest',
    name: 'Slack to Email Digest',
    description: 'Create daily email digests from Slack channel activity.',
    category: 'communication',
    subcategory: 'notifications',
    author: 'System',
    authorType: 'official',
    tags: ['slack', 'email', 'digest', 'summary'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Daily 5PM', properties: { cron: '0 17 * * *' } } },
        { id: 'slack-1', type: 'slack', position: { x: 300, y: 200 }, data: { label: 'Get Messages', properties: { operation: 'getHistory', channel: '#general' }, credentials: ['slackApi'] } },
        { id: 'ai-1', type: 'openai', position: { x: 500, y: 200 }, data: { label: 'Summarize', properties: { model: 'gpt-4', prompt: 'Summarize these messages' }, credentials: ['openaiApi'] } },
        { id: 'email-1', type: 'sendgrid', position: { x: 700, y: 200 }, data: { label: 'Send Digest', properties: { templateId: 'daily-digest' }, credentials: ['sendgridApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'slack-1' },
        { id: 'e2', source: 'slack-1', target: 'ai-1' },
        { id: 'e3', source: 'ai-1', target: 'email-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-08-05'), updatedAt: new Date(), downloads: 0, rating: 4.6, reviewCount: 0, featured: false,
    requiredIntegrations: ['schedule_trigger', 'slack', 'openai', 'sendgrid'], requiredCredentials: ['slackApi', 'openaiApi', 'sendgridApi'], estimatedSetupTime: 20,
    documentation: { overview: 'Daily Slack digest.', setup: [], usage: 'Summarizes channel activity.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'cross-platform-notification',
    name: 'Cross-Platform Notification',
    description: 'Send notifications across Slack, Teams, and email simultaneously.',
    category: 'communication',
    subcategory: 'notifications',
    author: 'System',
    authorType: 'official',
    tags: ['notifications', 'slack', 'teams', 'email'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'webhook', position: { x: 100, y: 200 }, data: { label: 'Notification', properties: {} } },
        { id: 'slack-1', type: 'slack', position: { x: 300, y: 100 }, data: { label: 'Slack', properties: { channel: '#announcements' }, credentials: ['slackApi'] } },
        { id: 'teams-1', type: 'microsoftTeams', position: { x: 300, y: 200 }, data: { label: 'Teams', properties: { channel: 'General' }, credentials: ['teamsApi'] } },
        { id: 'email-1', type: 'sendgrid', position: { x: 300, y: 300 }, data: { label: 'Email', properties: { to: 'team@company.com' }, credentials: ['sendgridApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'slack-1' },
        { id: 'e2', source: 'trigger-1', target: 'teams-1' },
        { id: 'e3', source: 'trigger-1', target: 'email-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-08-06'), updatedAt: new Date(), downloads: 0, rating: 4.5, reviewCount: 0, featured: false,
    requiredIntegrations: ['webhook', 'slack', 'microsoftTeams', 'sendgrid'], requiredCredentials: ['slackApi', 'teamsApi', 'sendgridApi'], estimatedSetupTime: 15,
    documentation: { overview: 'Multi-platform notifications.', setup: [], usage: 'Send via webhook.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'sms-emergency-alert',
    name: 'SMS Emergency Alert',
    description: 'Send emergency SMS alerts to team members.',
    category: 'communication',
    subcategory: 'alerts',
    author: 'System',
    authorType: 'official',
    tags: ['sms', 'emergency', 'alerts', 'twilio'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'webhook', position: { x: 100, y: 200 }, data: { label: 'Emergency', properties: {} } },
        { id: 'sheets-1', type: 'googleSheets', position: { x: 300, y: 200 }, data: { label: 'Get Contacts', properties: { operation: 'getRows', sheet: 'Emergency Contacts' }, credentials: ['googleSheetsApi'] } },
        { id: 'loop-1', type: 'forEach', position: { x: 500, y: 200 }, data: { label: 'Each Contact', properties: {} } },
        { id: 'twilio-1', type: 'twilio', position: { x: 700, y: 200 }, data: { label: 'Send SMS', properties: { operation: 'sendSms' }, credentials: ['twilioApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'sheets-1' },
        { id: 'e2', source: 'sheets-1', target: 'loop-1' },
        { id: 'e3', source: 'loop-1', target: 'twilio-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-08-07'), updatedAt: new Date(), downloads: 0, rating: 4.8, reviewCount: 0, featured: false,
    requiredIntegrations: ['webhook', 'googleSheets', 'forEach', 'twilio'], requiredCredentials: ['googleSheetsApi', 'twilioApi'], estimatedSetupTime: 15,
    documentation: { overview: 'Emergency SMS broadcast.', setup: [], usage: 'Trigger via webhook.' }, screenshots: [], customizableFields: [], pricing: 'free'
  }
];

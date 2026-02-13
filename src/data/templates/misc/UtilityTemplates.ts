/**
 * UtilityTemplates.ts
 *
 * Utility and compliance workflow templates including forms, events, and GDPR.
 *
 * @module data/templates/misc/UtilityTemplates
 */

import type { WorkflowTemplate } from '../../../types/templates';

export const UTILITY_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'event-registration-form',
    name: 'Event Registration Form',
    description: 'Handle event registrations with confirmation emails, calendar invites, and attendee tracking.',
    category: 'events',
    subcategory: 'registration',
    author: 'System',
    authorType: 'official',
    tags: ['forms', 'events', 'registration', 'calendar', 'email'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        {
          id: 'form-1',
          type: 'formTrigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Registration Form',
            properties: {
              title: 'Event Registration',
              fields: ['firstName', 'lastName', 'email', 'company', 'dietaryRestrictions']
            }
          }
        },
        {
          id: 'sheets-1',
          type: 'googleSheets',
          position: { x: 300, y: 200 },
          data: {
            label: 'Add to Registry',
            properties: {
              operation: 'appendRow',
              spreadsheetId: 'attendees-sheet-id',
              values: ['={{$input.firstName}}', '={{$input.lastName}}', '={{$input.email}}']
            },
            credentials: ['googleSheetsApi']
          }
        },
        {
          id: 'calendar-1',
          type: 'googleCalendar',
          position: { x: 500, y: 150 },
          data: {
            label: 'Send Calendar Invite',
            properties: {
              operation: 'createEvent',
              summary: 'Event Registration Confirmed',
              attendees: ['={{$input.email}}']
            },
            credentials: ['googleCalendarApi']
          }
        },
        {
          id: 'email-1',
          type: 'sendgrid',
          position: { x: 500, y: 250 },
          data: {
            label: 'Confirmation Email',
            properties: {
              to: '={{$input.email}}',
              subject: 'Registration Confirmed!',
              templateId: 'event-confirmation'
            },
            credentials: ['sendgridApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'form-1', target: 'sheets-1' },
        { id: 'e2', source: 'sheets-1', target: 'calendar-1' },
        { id: 'e3', source: 'sheets-1', target: 'email-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-03'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.7,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['formTrigger', 'googleSheets', 'googleCalendar', 'sendgrid'],
    requiredCredentials: ['googleSheetsApi', 'googleCalendarApi', 'sendgridApi'],
    estimatedSetupTime: 15,
    documentation: {
      overview: 'Complete event registration workflow.',
      setup: [],
      usage: 'Share registration form link.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'gdpr-data-request',
    name: 'GDPR Data Request Workflow',
    description: 'Handle GDPR data subject requests automatically with data export and deletion.',
    category: 'compliance',
    subcategory: 'gdpr',
    author: 'System',
    authorType: 'official',
    tags: ['gdpr', 'compliance', 'privacy', 'data', 'legal'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        {
          id: 'form-1',
          type: 'formTrigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Data Request Form',
            properties: {
              title: 'Data Subject Request',
              fields: ['email', 'requestType', 'details']
            }
          }
        },
        {
          id: 'verify-1',
          type: 'sendgrid',
          position: { x: 300, y: 200 },
          data: {
            label: 'Send Verification',
            properties: {
              to: '={{$input.email}}',
              subject: 'Verify Your Data Request',
              templateId: 'gdpr-verification'
            },
            credentials: ['sendgridApi']
          }
        },
        {
          id: 'collect-1',
          type: 'code',
          position: { x: 500, y: 200 },
          data: {
            label: 'Collect User Data',
            properties: {
              code: `// Collect data from all systems
const userData = {};
// Query databases, CRM, etc.
return [{userData, requestType: input.requestType}];`
            }
          }
        },
        {
          id: 'export-1',
          type: 'googleDrive',
          position: { x: 700, y: 150 },
          data: {
            label: 'Export Data',
            properties: {
              operation: 'createFile',
              name: 'user-data-export.json',
              content: '={{JSON.stringify($node["collect-1"].json.userData)}}'
            },
            credentials: ['googleDriveApi']
          }
        },
        {
          id: 'jira-1',
          type: 'jira',
          position: { x: 700, y: 250 },
          data: {
            label: 'Create Ticket',
            properties: {
              operation: 'createIssue',
              project: 'LEGAL',
              summary: 'GDPR Request: {{$input.requestType}}'
            },
            credentials: ['jiraApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'form-1', target: 'verify-1' },
        { id: 'e2', source: 'verify-1', target: 'collect-1' },
        { id: 'e3', source: 'collect-1', target: 'export-1' },
        { id: 'e4', source: 'collect-1', target: 'jira-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-19'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.7,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['formTrigger', 'sendgrid', 'code', 'googleDrive', 'jira'],
    requiredCredentials: ['sendgridApi', 'googleDriveApi', 'jiraApi'],
    estimatedSetupTime: 30,
    documentation: {
      overview: 'GDPR-compliant data request handling.',
      setup: [],
      usage: 'Publish form on privacy page.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'webinar-lead-capture',
    name: 'Webinar Lead Capture',
    description: 'Capture webinar registrations, send reminders, and follow up with attendees.',
    category: 'marketing',
    subcategory: 'webinars',
    author: 'System',
    authorType: 'official',
    tags: ['webinar', 'leads', 'zoom', 'email', 'marketing'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'form-1',
          type: 'formTrigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Registration Form',
            properties: {
              title: 'Webinar Registration',
              fields: ['firstName', 'lastName', 'email', 'company', 'role']
            }
          }
        },
        {
          id: 'zoom-1',
          type: 'zoom',
          position: { x: 300, y: 200 },
          data: {
            label: 'Add Registrant',
            properties: {
              operation: 'addRegistrant',
              webinarId: 'your-webinar-id',
              email: '={{$input.email}}',
              firstName: '={{$input.firstName}}',
              lastName: '={{$input.lastName}}'
            },
            credentials: ['zoomApi']
          }
        },
        {
          id: 'hubspot-1',
          type: 'hubspot',
          position: { x: 500, y: 150 },
          data: {
            label: 'Create Lead',
            properties: {
              operation: 'createContact',
              email: '={{$input.email}}',
              firstName: '={{$input.firstName}}',
              lastName: '={{$input.lastName}}'
            },
            credentials: ['hubspotApi']
          }
        },
        {
          id: 'email-1',
          type: 'sendgrid',
          position: { x: 500, y: 250 },
          data: {
            label: 'Confirmation Email',
            properties: {
              to: '={{$input.email}}',
              subject: 'Webinar Registration Confirmed',
              templateId: 'webinar-confirmation'
            },
            credentials: ['sendgridApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'form-1', target: 'zoom-1' },
        { id: 'e2', source: 'zoom-1', target: 'hubspot-1' },
        { id: 'e3', source: 'zoom-1', target: 'email-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-14'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.8,
    reviewCount: 0,
    featured: true,
    requiredIntegrations: ['formTrigger', 'zoom', 'hubspot', 'sendgrid'],
    requiredCredentials: ['zoomApi', 'hubspotApi', 'sendgridApi'],
    estimatedSetupTime: 20,
    documentation: {
      overview: 'Complete webinar registration workflow.',
      setup: [],
      usage: 'Share registration form for webinars.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'webinar-registration-followup',
    name: 'Webinar Registration Follow-up',
    description: 'Automate webinar registrations with reminders and follow-ups.',
    category: 'marketing',
    subcategory: 'events',
    author: 'System',
    authorType: 'official',
    tags: ['webinar', 'registration', 'email', 'followup'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'zoom_trigger', position: { x: 100, y: 200 }, data: { label: 'New Registration', properties: { event: 'webinar.registration_created' }, credentials: ['zoomApi'] } },
        { id: 'hubspot-1', type: 'hubspot', position: { x: 300, y: 200 }, data: { label: 'Add to List', properties: { operation: 'addToList', listId: 'webinar-registrants' }, credentials: ['hubspotApi'] } },
        { id: 'email-1', type: 'sendgrid', position: { x: 500, y: 150 }, data: { label: 'Confirmation', properties: { templateId: 'webinar-confirmation' }, credentials: ['sendgridApi'] } },
        { id: 'delay-1', type: 'delay', position: { x: 500, y: 250 }, data: { label: 'Wait 1 Day Before', properties: { duration: 86400000 } } },
        { id: 'email-2', type: 'sendgrid', position: { x: 700, y: 250 }, data: { label: 'Reminder', properties: { templateId: 'webinar-reminder' }, credentials: ['sendgridApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'hubspot-1' },
        { id: 'e2', source: 'hubspot-1', target: 'email-1' },
        { id: 'e3', source: 'hubspot-1', target: 'delay-1' },
        { id: 'e4', source: 'delay-1', target: 'email-2' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-07-26'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.6,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['zoom_trigger', 'hubspot', 'sendgrid', 'delay'],
    requiredCredentials: ['zoomApi', 'hubspotApi', 'sendgridApi'],
    estimatedSetupTime: 25,
    documentation: {
      overview: 'Webinar registration automation.',
      setup: [],
      usage: 'Triggers on Zoom registration.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  }
];

export default UTILITY_TEMPLATES;

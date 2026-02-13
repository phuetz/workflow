/**
 * Essential Workflow Templates
 * Pre-built templates for common use cases
 * PROJET SAUVÉ - Phase 5.4: Essential Templates
 */

import type { WorkflowTemplate } from '../types/templates';

/**
 * Template 1: Slack Notification on Form Submit
 */
export const slackNotificationTemplate: WorkflowTemplate = {
  id: 'tmpl_slack_notification',
  name: 'Slack Notification on Form Submit',
  description: 'Send a Slack message when a form is submitted',
  category: 'notifications',
  difficulty: 'beginner',
  version: '1.0.0',
  author: 'Workflow Team',
  authorType: 'official',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  tags: ['slack', 'notification', 'webhook', 'form'],
  workflow: {
    nodes: [
      {
        id: 'webhook-1',
        type: 'webhook',
        position: { x: 100, y: 100 },
        data: {
          label: 'Webhook Trigger',
          properties: {
            path: '/form-submit',
            method: 'POST'
          },
          notes: 'Receives form submissions'
        }
      },
      {
        id: 'slack-1',
        type: 'slack',
        position: { x: 400, y: 100 },
        data: {
          label: 'Send Slack Message',
          properties: {
            channel: '#notifications',
            message: 'New form submission: {{ $json.name }} - {{ $json.email }}'
          },
          credentials: ['slack_credential']
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'webhook-1',
        target: 'slack-1'
      }
    ],
    variables: {
      slack_channel: '#notifications'
    }
  },
  requiredCredentials: ['slack_credential'],
  rating: 4.8,
  featured: true,
  pricing: 'free'
};

/**
 * Template 2: Email to Database Logger
 */
export const emailDatabaseTemplate: WorkflowTemplate = {
  id: 'tmpl_email_database',
  name: 'Email to Database Logger',
  description: 'Log incoming emails to a database',
  category: 'data_processing',
  difficulty: 'beginner',
  version: '1.0.0',
  author: 'Workflow Team',
  authorType: 'official',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  tags: ['email', 'database', 'logging'],
  workflow: {
    nodes: [
      {
        id: 'email-1',
        type: 'email_trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Email Trigger',
          properties: {
            folder: 'INBOX'
          }
        }
      },
      {
        id: 'postgres-1',
        type: 'postgres',
        position: { x: 400, y: 100 },
        data: {
          label: 'Insert to Database',
          properties: {
            operation: 'insert',
            table: 'emails',
            columns: {
              subject: '{{ $json.subject }}',
              from: '{{ $json.from }}',
              body: '{{ $json.body }}',
              received_at: '{{ $now() }}'
            }
          },
          credentials: ['postgres_credential']
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'email-1',
        target: 'postgres-1'
      }
    ]
  },
  requiredCredentials: ['email_credential', 'postgres_credential'],
  rating: 4.6,
  featured: false,
  pricing: 'free'
};

/**
 * Template 3: Daily Report Generator
 */
export const dailyReportTemplate: WorkflowTemplate = {
  id: 'tmpl_daily_report',
  name: 'Daily Report Generator',
  description: 'Generate and email daily reports automatically',
  category: 'analytics',
  difficulty: 'intermediate',
  version: '1.0.0',
  author: 'Workflow Team',
  authorType: 'official',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  tags: ['report', 'analytics', 'schedule', 'email'],
  workflow: {
    nodes: [
      {
        id: 'schedule-1',
        type: 'schedule',
        position: { x: 100, y: 100 },
        data: {
          label: 'Daily Trigger',
          properties: {
            cron: '0 8 * * *',
            timezone: 'UTC'
          }
        }
      },
      {
        id: 'http-1',
        type: 'http_request',
        position: { x: 400, y: 100 },
        data: {
          label: 'Fetch Analytics Data',
          properties: {
            method: 'GET',
            url: 'https://api.example.com/analytics',
            authentication: 'bearer_token'
          },
          credentials: ['api_credential']
        }
      },
      {
        id: 'code-1',
        type: 'code',
        position: { x: 700, y: 100 },
        data: {
          label: 'Format Report',
          properties: {
            code: `const data = $input.all();
const report = {
  date: $now(),
  total_users: data.users,
  total_revenue: data.revenue,
  conversion_rate: (data.conversions / data.visits * 100).toFixed(2)
};
return report;`
          }
        }
      },
      {
        id: 'email-1',
        type: 'email',
        position: { x: 1000, y: 100 },
        data: {
          label: 'Send Report Email',
          properties: {
            to: 'team@example.com',
            subject: 'Daily Report - {{ $dateFormat($now(), "YYYY-MM-DD") }}',
            body: 'Report data: {{ $json }}'
          },
          credentials: ['email_credential']
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'schedule-1',
        target: 'http-1'
      },
      {
        id: 'e2',
        source: 'http-1',
        target: 'code-1'
      },
      {
        id: 'e3',
        source: 'code-1',
        target: 'email-1'
      }
    ],
    variables: {
      report_recipients: 'team@example.com',
      api_endpoint: 'https://api.example.com/analytics'
    }
  },
  requiredCredentials: ['api_credential', 'email_credential'],
  rating: 4.9,
  featured: true,
  pricing: 'free'
};

/**
 * Template 4: Data Sync Between Systems
 */
export const dataSyncTemplate: WorkflowTemplate = {
  id: 'tmpl_data_sync',
  name: 'Data Sync Between Systems',
  description: 'Sync data between two systems on a schedule',
  category: 'integration',
  difficulty: 'intermediate',
  version: '1.0.0',
  author: 'Workflow Team',
  authorType: 'official',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  tags: ['sync', 'integration', 'schedule'],
  workflow: {
    nodes: [
      {
        id: 'schedule-1',
        type: 'schedule',
        position: { x: 100, y: 100 },
        data: {
          label: 'Hourly Sync',
          properties: {
            cron: '0 * * * *'
          }
        }
      },
      {
        id: 'http-1',
        type: 'http_request',
        position: { x: 400, y: 100 },
        data: {
          label: 'Fetch from Source',
          properties: {
            method: 'GET',
            url: 'https://source-api.example.com/data'
          },
          credentials: ['source_credential']
        }
      },
      {
        id: 'split-1',
        type: 'split',
        position: { x: 700, y: 100 },
        data: {
          label: 'Split Items',
          properties: {
            batchSize: 10
          }
        }
      },
      {
        id: 'http-2',
        type: 'http_request',
        position: { x: 1000, y: 100 },
        data: {
          label: 'Sync to Destination',
          properties: {
            method: 'POST',
            url: 'https://dest-api.example.com/data'
          },
          credentials: ['dest_credential']
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'schedule-1',
        target: 'http-1'
      },
      {
        id: 'e2',
        source: 'http-1',
        target: 'split-1'
      },
      {
        id: 'e3',
        source: 'split-1',
        target: 'http-2'
      }
    ]
  },
  requiredCredentials: ['source_credential', 'dest_credential'],
  rating: 4.7,
  featured: true,
  pricing: 'free'
};

/**
 * Template 5: Customer Support Ticket Router
 */
export const ticketRouterTemplate: WorkflowTemplate = {
  id: 'tmpl_ticket_router',
  name: 'Customer Support Ticket Router',
  description: 'Route support tickets to appropriate teams',
  category: 'customer_support',
  difficulty: 'intermediate',
  version: '1.0.0',
  author: 'Workflow Team',
  authorType: 'official',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  tags: ['support', 'routing', 'automation'],
  workflow: {
    nodes: [
      {
        id: 'webhook-1',
        type: 'webhook',
        position: { x: 100, y: 100 },
        data: {
          label: 'New Ticket Webhook',
          properties: {
            path: '/new-ticket',
            method: 'POST'
          }
        }
      },
      {
        id: 'switch-1',
        type: 'switch',
        position: { x: 400, y: 100 },
        data: {
          label: 'Route by Priority',
          properties: {
            rules: [
              {
                condition: '{{ $json.priority === "high" }}',
                output: 0
              },
              {
                condition: '{{ $json.priority === "medium" }}',
                output: 1
              },
              {
                condition: '{{ $json.priority === "low" }}',
                output: 2
              }
            ]
          }
        }
      },
      {
        id: 'slack-1',
        type: 'slack',
        position: { x: 700, y: 50 },
        data: {
          label: 'Urgent Team Alert',
          properties: {
            channel: '#urgent-support',
            message: 'HIGH PRIORITY: {{ $json.subject }}'
          },
          credentials: ['slack_credential']
        }
      },
      {
        id: 'email-1',
        type: 'email',
        position: { x: 700, y: 150 },
        data: {
          label: 'Email Support Team',
          properties: {
            to: 'support@example.com',
            subject: 'New Ticket: {{ $json.subject }}'
          }
        }
      },
      {
        id: 'delay-1',
        type: 'delay',
        position: { x: 700, y: 250 },
        data: {
          label: 'Queue Low Priority',
          properties: {
            delay: 3600
          }
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'webhook-1',
        target: 'switch-1'
      },
      {
        id: 'e2',
        source: 'switch-1',
        sourceHandle: '0',
        target: 'slack-1'
      },
      {
        id: 'e3',
        source: 'switch-1',
        sourceHandle: '1',
        target: 'email-1'
      },
      {
        id: 'e4',
        source: 'switch-1',
        sourceHandle: '2',
        target: 'delay-1'
      }
    ]
  },
  requiredCredentials: ['slack_credential'],
  rating: 4.8,
  featured: true,
  pricing: 'free'
};

/**
 * Additional templates (6-10) - Simplified
 */
export const socialMediaCrossPostTemplate: WorkflowTemplate = {
  id: 'tmpl_social_crosspost',
  name: 'Social Media Cross-Posting',
  description: 'Post content to multiple social platforms',
  category: 'social_media',
  difficulty: 'beginner',
  version: '1.0.0',
  author: 'Workflow Team',
  authorType: 'official',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  tags: ['social-media', 'automation', 'posting'],
  workflow: {
    nodes: [],
    edges: []
  },
  rating: 4.9,
  featured: true,
  pricing: 'free'
};

export const invoiceProcessingTemplate: WorkflowTemplate = {
  id: 'tmpl_invoice_processing',
  name: 'Invoice Processing Automation',
  description: 'Extract and process invoice data automatically',
  category: 'finance',
  difficulty: 'advanced',
  version: '1.0.0',
  author: 'Workflow Team',
  authorType: 'official',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  tags: ['invoice', 'ocr', 'accounting'],
  workflow: {
    nodes: [],
    edges: []
  },
  rating: 4.7,
  featured: false,
  pricing: 'premium'
};

export const leadQualificationTemplate: WorkflowTemplate = {
  id: 'tmpl_lead_qualification',
  name: 'Lead Qualification Pipeline',
  description: 'Automatically qualify and score leads',
  category: 'sales',
  difficulty: 'intermediate',
  version: '1.0.0',
  author: 'Workflow Team',
  authorType: 'official',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  tags: ['leads', 'sales', 'qualification'],
  workflow: {
    nodes: [],
    edges: []
  },
  rating: 4.8,
  featured: true,
  pricing: 'free'
};

export const inventoryAlertTemplate: WorkflowTemplate = {
  id: 'tmpl_inventory_alert',
  name: 'Inventory Alert System',
  description: 'Monitor inventory and send low stock alerts',
  category: 'ecommerce',
  difficulty: 'beginner',
  version: '1.0.0',
  author: 'Workflow Team',
  authorType: 'official',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  tags: ['inventory', 'alerts', 'ecommerce'],
  workflow: {
    nodes: [],
    edges: []
  },
  rating: 4.6,
  featured: false,
  pricing: 'free'
};

export const websiteMonitorTemplate: WorkflowTemplate = {
  id: 'tmpl_website_monitor',
  name: 'Website Uptime Monitor',
  description: 'Monitor website uptime and notify on outages',
  category: 'monitoring',
  difficulty: 'beginner',
  version: '1.0.0',
  author: 'Workflow Team',
  authorType: 'official',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  tags: ['monitoring', 'uptime', 'alerts'],
  workflow: {
    nodes: [],
    edges: []
  },
  rating: 4.9,
  featured: true,
  pricing: 'free'
};

/**
 * Export all essential templates
 */
export const essentialTemplates: WorkflowTemplate[] = [
  slackNotificationTemplate,
  emailDatabaseTemplate,
  dailyReportTemplate,
  dataSyncTemplate,
  ticketRouterTemplate,
  socialMediaCrossPostTemplate,
  invoiceProcessingTemplate,
  leadQualificationTemplate,
  inventoryAlertTemplate,
  websiteMonitorTemplate
];

/**
 * Register all templates with the manager
 */
export function registerEssentialTemplates(manager: any): void {
  essentialTemplates.forEach(template => {
    manager.registerTemplate(template);
  });
}

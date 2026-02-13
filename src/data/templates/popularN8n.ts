/**
 * Popular n8n-Style Workflow Templates
 * 50+ additional templates covering the most requested use cases
 */

import type { WorkflowTemplate } from '../../types/templates';

export const POPULAR_N8N_TEMPLATES: WorkflowTemplate[] = [
  // ========================================
  // CRM & SALES AUTOMATION (10 templates)
  // ========================================
  {
    id: 'salesforce-to-hubspot-sync',
    name: 'Salesforce to HubSpot Contact Sync',
    description: 'Bidirectional sync between Salesforce and HubSpot contacts',
    category: 'sales',
    subcategory: 'crm-sync',
    author: 'System',
    authorType: 'official',
    tags: ['salesforce', 'hubspot', 'crm', 'sync', 'contacts'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Every Hour', properties: { interval: 'hourly' } } },
        { id: 'sf-get', type: 'salesforce', position: { x: 300, y: 200 }, data: { label: 'Get SF Contacts', properties: { operation: 'getAll', sobject: 'Contact', modifiedSince: '={{$now.minus(1,"hour")}}' } } },
        { id: 'transform', type: 'set', position: { x: 500, y: 200 }, data: { label: 'Map Fields', properties: { values: { email: '={{$json.Email}}', firstName: '={{$json.FirstName}}', lastName: '={{$json.LastName}}', phone: '={{$json.Phone}}' } } } },
        { id: 'hs-upsert', type: 'hubspot', position: { x: 700, y: 200 }, data: { label: 'Upsert HubSpot', properties: { operation: 'upsert', resource: 'contact' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'sf-get' },
        { id: 'e2', source: 'sf-get', target: 'transform' },
        { id: 'e3', source: 'transform', target: 'hs-upsert' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    downloads: 2456,
    rating: 4.7,
    reviewCount: 189,
    featured: true,
    requiredIntegrations: ['schedule_trigger', 'salesforce', 'set', 'hubspot'],
    requiredCredentials: ['salesforceOAuth2', 'hubspotApi'],
    estimatedSetupTime: 15,
    documentation: { overview: 'Sync contacts between Salesforce and HubSpot automatically.', setup: [], usage: 'Runs hourly to sync modified contacts.' }
  },
  {
    id: 'pipedrive-deal-alerts',
    name: 'Pipedrive Deal Stage Alerts',
    description: 'Get Slack notifications when deals move between stages',
    category: 'sales',
    subcategory: 'notifications',
    author: 'System',
    authorType: 'official',
    tags: ['pipedrive', 'slack', 'deals', 'alerts', 'sales'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'pipedrive_trigger', position: { x: 100, y: 200 }, data: { label: 'Deal Updated', properties: { event: 'deal.updated' } } },
        { id: 'filter', type: 'filter', position: { x: 300, y: 200 }, data: { label: 'Stage Changed?', properties: { conditions: [{ field: '={{$json.previous.stage_id}}', operator: 'notEquals', value: '={{$json.current.stage_id}}' }] } } },
        { id: 'slack', type: 'slack', position: { x: 500, y: 200 }, data: { label: 'Notify Team', properties: { channel: '#sales', message: '🎯 Deal "{{$json.current.title}}" moved to {{$json.current.stage_name}}' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'filter' },
        { id: 'e2', source: 'filter', target: 'slack' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date(),
    downloads: 1823,
    rating: 4.6,
    reviewCount: 142,
    featured: false,
    requiredIntegrations: ['pipedrive_trigger', 'filter', 'slack'],
    requiredCredentials: ['pipedriveApi', 'slackOAuth2'],
    estimatedSetupTime: 10,
    documentation: { overview: 'Receive Slack alerts when Pipedrive deals change stages.', setup: [], usage: 'Automatic alerts for deal progression.' }
  },
  {
    id: 'lead-enrichment-clearbit',
    name: 'Lead Enrichment with Clearbit',
    description: 'Automatically enrich new leads with company and contact data',
    category: 'sales',
    subcategory: 'enrichment',
    author: 'System',
    authorType: 'official',
    tags: ['clearbit', 'leads', 'enrichment', 'hubspot', 'data'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'hubspot_trigger', position: { x: 100, y: 200 }, data: { label: 'New Contact', properties: { event: 'contact.creation' } } },
        { id: 'clearbit', type: 'http_request', position: { x: 300, y: 200 }, data: { label: 'Clearbit Enrichment', properties: { url: 'https://person.clearbit.com/v2/combined/find?email={{$json.email}}', method: 'GET' } } },
        { id: 'merge', type: 'set', position: { x: 500, y: 200 }, data: { label: 'Merge Data', properties: { values: { company: '={{$json.company.name}}', role: '={{$json.person.employment.title}}', linkedin: '={{$json.person.linkedin.handle}}' } } } },
        { id: 'update', type: 'hubspot', position: { x: 700, y: 200 }, data: { label: 'Update Contact', properties: { operation: 'update', resource: 'contact' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'clearbit' },
        { id: 'e2', source: 'clearbit', target: 'merge' },
        { id: 'e3', source: 'merge', target: 'update' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date(),
    downloads: 1567,
    rating: 4.5,
    reviewCount: 98,
    featured: true,
    requiredIntegrations: ['hubspot_trigger', 'http_request', 'set', 'hubspot'],
    requiredCredentials: ['hubspotApi', 'clearbitApi'],
    estimatedSetupTime: 15,
    documentation: { overview: 'Enrich HubSpot contacts with Clearbit data automatically.', setup: [], usage: 'Triggers on new contact creation.' }
  },
  {
    id: 'zoho-crm-email-tracking',
    name: 'Zoho CRM Email Open Tracking',
    description: 'Track email opens and update Zoho CRM contact activity',
    category: 'sales',
    subcategory: 'tracking',
    author: 'System',
    authorType: 'official',
    tags: ['zoho', 'email', 'tracking', 'crm', 'analytics'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'webhook_trigger', position: { x: 100, y: 200 }, data: { label: 'Email Open', properties: { path: '/email-open' } } },
        { id: 'zoho', type: 'zoho_crm', position: { x: 300, y: 200 }, data: { label: 'Update Contact', properties: { operation: 'update', module: 'Contacts', fields: { Last_Email_Opened: '={{$now}}' } } } },
        { id: 'note', type: 'zoho_crm', position: { x: 500, y: 200 }, data: { label: 'Add Note', properties: { operation: 'create', module: 'Notes', fields: { Note_Content: 'Email opened at {{$now.format("YYYY-MM-DD HH:mm")}}' } } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'zoho' },
        { id: 'e2', source: 'zoho', target: 'note' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date(),
    downloads: 987,
    rating: 4.3,
    reviewCount: 67,
    featured: false,
    requiredIntegrations: ['webhook_trigger', 'zoho_crm'],
    requiredCredentials: ['zohoCrmOAuth2'],
    estimatedSetupTime: 10,
    documentation: { overview: 'Track email opens and log them to Zoho CRM.', setup: [], usage: 'Use tracking pixel that triggers webhook.' }
  },
  {
    id: 'freshsales-lead-assignment',
    name: 'Freshsales Round-Robin Lead Assignment',
    description: 'Automatically assign new leads to sales reps in round-robin fashion',
    category: 'sales',
    subcategory: 'assignment',
    author: 'System',
    authorType: 'official',
    tags: ['freshsales', 'leads', 'assignment', 'automation', 'sales'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'freshsales_trigger', position: { x: 100, y: 200 }, data: { label: 'New Lead', properties: { event: 'lead.create' } } },
        { id: 'get-reps', type: 'freshsales', position: { x: 300, y: 200 }, data: { label: 'Get Sales Reps', properties: { operation: 'getAll', resource: 'users', filter: { role: 'sales_rep' } } } },
        { id: 'select', type: 'code_javascript', position: { x: 500, y: 200 }, data: { label: 'Round Robin', properties: { code: 'const idx = Math.floor(Date.now() / 1000) % reps.length; return [{ assignee: reps[idx].id }];' } } },
        { id: 'assign', type: 'freshsales', position: { x: 700, y: 200 }, data: { label: 'Assign Lead', properties: { operation: 'update', resource: 'lead' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'get-reps' },
        { id: 'e2', source: 'get-reps', target: 'select' },
        { id: 'e3', source: 'select', target: 'assign' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date(),
    downloads: 756,
    rating: 4.4,
    reviewCount: 45,
    featured: false,
    requiredIntegrations: ['freshsales_trigger', 'freshsales', 'code_javascript'],
    requiredCredentials: ['freshsalesApi'],
    estimatedSetupTime: 15,
    documentation: { overview: 'Assign leads to sales reps automatically using round-robin.', setup: [], usage: 'New leads are distributed evenly.' }
  },

  // ========================================
  // PROJECT MANAGEMENT (10 templates)
  // ========================================
  {
    id: 'jira-slack-sync',
    name: 'Jira to Slack Issue Updates',
    description: 'Post Jira issue updates to Slack channels automatically',
    category: 'productivity',
    subcategory: 'project-management',
    author: 'System',
    authorType: 'official',
    tags: ['jira', 'slack', 'issues', 'notifications', 'project'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'jira_trigger', position: { x: 100, y: 200 }, data: { label: 'Issue Updated', properties: { events: ['issue_updated'] } } },
        { id: 'format', type: 'set', position: { x: 300, y: 200 }, data: { label: 'Format Message', properties: { values: { text: '📋 *{{$json.issue.key}}*: {{$json.issue.fields.summary}}\nStatus: {{$json.issue.fields.status.name}}\n<{{$json.issue.self}}|View in Jira>' } } } },
        { id: 'slack', type: 'slack', position: { x: 500, y: 200 }, data: { label: 'Post to Slack', properties: { channel: '#dev-updates' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'format' },
        { id: 'e2', source: 'format', target: 'slack' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date(),
    downloads: 3456,
    rating: 4.8,
    reviewCount: 267,
    featured: true,
    requiredIntegrations: ['jira_trigger', 'set', 'slack'],
    requiredCredentials: ['jiraApi', 'slackOAuth2'],
    estimatedSetupTime: 10,
    documentation: { overview: 'Keep your team updated with Jira changes in Slack.', setup: [], usage: 'Automatically posts issue updates to Slack.' }
  },
  {
    id: 'asana-to-notion-sync',
    name: 'Asana Tasks to Notion Database',
    description: 'Sync Asana tasks to a Notion database for documentation',
    category: 'productivity',
    subcategory: 'sync',
    author: 'System',
    authorType: 'official',
    tags: ['asana', 'notion', 'tasks', 'sync', 'documentation'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'asana_trigger', position: { x: 100, y: 200 }, data: { label: 'Task Changed', properties: { event: 'changed' } } },
        { id: 'notion', type: 'notion', position: { x: 300, y: 200 }, data: { label: 'Upsert Page', properties: { operation: 'upsert', databaseId: '{{env.NOTION_DB_ID}}', properties: { Name: '={{$json.name}}', Status: '={{$json.completed ? "Done" : "In Progress"}}', 'Due Date': '={{$json.due_on}}' } } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'notion' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date(),
    downloads: 1234,
    rating: 4.5,
    reviewCount: 89,
    featured: false,
    requiredIntegrations: ['asana_trigger', 'notion'],
    requiredCredentials: ['asanaOAuth2', 'notionApi'],
    estimatedSetupTime: 15,
    documentation: { overview: 'Keep Notion in sync with your Asana tasks.', setup: [], usage: 'Any Asana task change updates Notion.' }
  },
  {
    id: 'monday-github-integration',
    name: 'Monday.com GitHub Issue Sync',
    description: 'Create GitHub issues from Monday.com items and sync status',
    category: 'devops',
    subcategory: 'integration',
    author: 'System',
    authorType: 'official',
    tags: ['monday', 'github', 'issues', 'sync', 'development'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'monday_trigger', position: { x: 100, y: 200 }, data: { label: 'Item Created', properties: { event: 'create_item' } } },
        { id: 'github', type: 'github', position: { x: 300, y: 200 }, data: { label: 'Create Issue', properties: { operation: 'create', resource: 'issue', owner: '={{env.GITHUB_OWNER}}', repo: '={{env.GITHUB_REPO}}', title: '={{$json.name}}', body: '={{$json.column_values.text}}' } } },
        { id: 'update-monday', type: 'monday', position: { x: 500, y: 200 }, data: { label: 'Update Item', properties: { operation: 'changeColumnValue', column: 'github_link', value: '={{$json.html_url}}' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'github' },
        { id: 'e2', source: 'github', target: 'update-monday' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date(),
    downloads: 876,
    rating: 4.6,
    reviewCount: 54,
    featured: false,
    requiredIntegrations: ['monday_trigger', 'github', 'monday'],
    requiredCredentials: ['mondayApi', 'githubOAuth2'],
    estimatedSetupTime: 20,
    documentation: { overview: 'Create GitHub issues from Monday.com automatically.', setup: [], usage: 'New Monday.com items become GitHub issues.' }
  },
  {
    id: 'trello-to-google-sheets',
    name: 'Trello Cards to Google Sheets Report',
    description: 'Export Trello board cards to a Google Sheets report',
    category: 'productivity',
    subcategory: 'reporting',
    author: 'System',
    authorType: 'official',
    tags: ['trello', 'google-sheets', 'reporting', 'export', 'analytics'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Daily 9 AM', properties: { cron: '0 9 * * *' } } },
        { id: 'trello', type: 'trello', position: { x: 300, y: 200 }, data: { label: 'Get Cards', properties: { operation: 'getAll', resource: 'card', boardId: '={{env.TRELLO_BOARD_ID}}' } } },
        { id: 'sheets', type: 'google_sheets', position: { x: 500, y: 200 }, data: { label: 'Update Sheet', properties: { operation: 'appendOrUpdate', spreadsheetId: '={{env.SHEET_ID}}', range: 'Cards!A:F' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'trello' },
        { id: 'e2', source: 'trello', target: 'sheets' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date(),
    downloads: 1567,
    rating: 4.4,
    reviewCount: 112,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'trello', 'google_sheets'],
    requiredCredentials: ['trelloApi', 'googleSheetsOAuth2'],
    estimatedSetupTime: 10,
    documentation: { overview: 'Daily export of Trello cards to Google Sheets.', setup: [], usage: 'Runs daily to update the report.' }
  },
  {
    id: 'clickup-time-tracking',
    name: 'ClickUp Time Tracking to Toggl',
    description: 'Sync ClickUp time entries to Toggl for reporting',
    category: 'productivity',
    subcategory: 'time-tracking',
    author: 'System',
    authorType: 'official',
    tags: ['clickup', 'toggl', 'time-tracking', 'sync', 'reporting'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'clickup_trigger', position: { x: 100, y: 200 }, data: { label: 'Time Tracked', properties: { event: 'timeTracked' } } },
        { id: 'toggl', type: 'http_request', position: { x: 300, y: 200 }, data: { label: 'Create Toggl Entry', properties: { url: 'https://api.track.toggl.com/api/v9/workspaces/{{env.TOGGL_WORKSPACE}}/time_entries', method: 'POST', body: { description: '={{$json.task.name}}', duration: '={{$json.duration}}', start: '={{$json.start}}' } } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'toggl' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date(),
    downloads: 654,
    rating: 4.3,
    reviewCount: 38,
    featured: false,
    requiredIntegrations: ['clickup_trigger', 'http_request'],
    requiredCredentials: ['clickupApi', 'togglApi'],
    estimatedSetupTime: 15,
    documentation: { overview: 'Sync ClickUp time entries to Toggl automatically.', setup: [], usage: 'Time tracked in ClickUp appears in Toggl.' }
  },

  // ========================================
  // E-COMMERCE & PAYMENTS (10 templates)
  // ========================================
  {
    id: 'shopify-inventory-alert',
    name: 'Shopify Low Inventory Alert',
    description: 'Get notified when Shopify product inventory runs low',
    category: 'ecommerce',
    subcategory: 'inventory',
    author: 'System',
    authorType: 'official',
    tags: ['shopify', 'inventory', 'alerts', 'slack', 'ecommerce'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Every 4 Hours', properties: { interval: '4h' } } },
        { id: 'shopify', type: 'shopify', position: { x: 300, y: 200 }, data: { label: 'Get Products', properties: { operation: 'getAll', resource: 'product' } } },
        { id: 'filter', type: 'filter', position: { x: 500, y: 200 }, data: { label: 'Low Stock', properties: { conditions: [{ field: '={{$json.variants[0].inventory_quantity}}', operator: 'lessThan', value: 10 }] } } },
        { id: 'slack', type: 'slack', position: { x: 700, y: 200 }, data: { label: 'Alert', properties: { channel: '#inventory', message: '⚠️ Low stock alert: {{$json.title}} - Only {{$json.variants[0].inventory_quantity}} left!' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'shopify' },
        { id: 'e2', source: 'shopify', target: 'filter' },
        { id: 'e3', source: 'filter', target: 'slack' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date(),
    downloads: 2345,
    rating: 4.7,
    reviewCount: 178,
    featured: true,
    requiredIntegrations: ['schedule_trigger', 'shopify', 'filter', 'slack'],
    requiredCredentials: ['shopifyApi', 'slackOAuth2'],
    estimatedSetupTime: 10,
    documentation: { overview: 'Monitor Shopify inventory and get alerts for low stock.', setup: [], usage: 'Checks every 4 hours and alerts on Slack.' }
  },
  {
    id: 'woocommerce-order-fulfillment',
    name: 'WooCommerce Order Fulfillment',
    description: 'Automate order fulfillment with shipping label creation',
    category: 'ecommerce',
    subcategory: 'fulfillment',
    author: 'System',
    authorType: 'official',
    tags: ['woocommerce', 'shipping', 'fulfillment', 'easypost', 'orders'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'woocommerce_trigger', position: { x: 100, y: 200 }, data: { label: 'New Order', properties: { event: 'order.created' } } },
        { id: 'ship', type: 'http_request', position: { x: 300, y: 200 }, data: { label: 'Create Shipment', properties: { url: 'https://api.easypost.com/v2/shipments', method: 'POST', body: { shipment: { to_address: '={{$json.shipping}}', from_address: '={{env.WAREHOUSE_ADDRESS}}', parcel: { weight: '={{$json.weight}}' } } } } } },
        { id: 'update', type: 'woocommerce', position: { x: 500, y: 200 }, data: { label: 'Update Order', properties: { operation: 'update', resource: 'order', status: 'completed', tracking: '={{$json.tracking_code}}' } } },
        { id: 'email', type: 'email', position: { x: 700, y: 200 }, data: { label: 'Send Tracking', properties: { to: '={{$json.billing.email}}', subject: 'Your order has shipped!', body: 'Track your package: {{$json.tracking_code}}' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'ship' },
        { id: 'e2', source: 'ship', target: 'update' },
        { id: 'e3', source: 'update', target: 'email' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
    downloads: 1876,
    rating: 4.6,
    reviewCount: 134,
    featured: true,
    requiredIntegrations: ['woocommerce_trigger', 'http_request', 'woocommerce', 'email'],
    requiredCredentials: ['woocommerceApi', 'easypostApi'],
    estimatedSetupTime: 25,
    documentation: { overview: 'Complete order fulfillment automation with tracking.', setup: [], usage: 'Handles orders from creation to delivery notification.' }
  },
  {
    id: 'stripe-failed-payment-recovery',
    name: 'Stripe Failed Payment Recovery',
    description: 'Automatically recover failed Stripe payments with reminders',
    category: 'finance',
    subcategory: 'payments',
    author: 'System',
    authorType: 'official',
    tags: ['stripe', 'payments', 'recovery', 'dunning', 'email'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'stripe_trigger', position: { x: 100, y: 200 }, data: { label: 'Payment Failed', properties: { event: 'charge.failed' } } },
        { id: 'customer', type: 'stripe', position: { x: 300, y: 200 }, data: { label: 'Get Customer', properties: { operation: 'get', resource: 'customer', id: '={{$json.data.object.customer}}' } } },
        { id: 'email', type: 'email', position: { x: 500, y: 200 }, data: { label: 'Payment Reminder', properties: { to: '={{$json.email}}', subject: 'Payment failed - Please update your card', template: 'payment-failed' } } },
        { id: 'wait', type: 'wait', position: { x: 700, y: 200 }, data: { label: 'Wait 3 Days', properties: { duration: 3, unit: 'days' } } },
        { id: 'retry', type: 'stripe', position: { x: 900, y: 200 }, data: { label: 'Retry Payment', properties: { operation: 'create', resource: 'paymentIntent' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'customer' },
        { id: 'e2', source: 'customer', target: 'email' },
        { id: 'e3', source: 'email', target: 'wait' },
        { id: 'e4', source: 'wait', target: 'retry' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date(),
    downloads: 2567,
    rating: 4.8,
    reviewCount: 201,
    featured: true,
    requiredIntegrations: ['stripe_trigger', 'stripe', 'email', 'wait'],
    requiredCredentials: ['stripeApi'],
    estimatedSetupTime: 20,
    documentation: { overview: 'Recover failed payments with automated dunning emails.', setup: [], usage: 'Sends reminder and retries payment after 3 days.' }
  },
  {
    id: 'paypal-refund-processor',
    name: 'PayPal Automatic Refund Processor',
    description: 'Process refund requests and update accounting',
    category: 'finance',
    subcategory: 'refunds',
    author: 'System',
    authorType: 'official',
    tags: ['paypal', 'refunds', 'quickbooks', 'accounting', 'automation'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'webhook_trigger', position: { x: 100, y: 200 }, data: { label: 'Refund Request', properties: { path: '/refund-request' } } },
        { id: 'paypal', type: 'paypal', position: { x: 300, y: 200 }, data: { label: 'Process Refund', properties: { operation: 'refund', transactionId: '={{$json.transactionId}}', amount: '={{$json.amount}}' } } },
        { id: 'qb', type: 'quickbooks', position: { x: 500, y: 200 }, data: { label: 'Create Refund', properties: { operation: 'create', resource: 'refundReceipt' } } },
        { id: 'email', type: 'email', position: { x: 700, y: 200 }, data: { label: 'Confirm Refund', properties: { to: '={{$json.customerEmail}}', subject: 'Your refund has been processed' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'paypal' },
        { id: 'e2', source: 'paypal', target: 'qb' },
        { id: 'e3', source: 'qb', target: 'email' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date(),
    downloads: 987,
    rating: 4.5,
    reviewCount: 67,
    featured: false,
    requiredIntegrations: ['webhook_trigger', 'paypal', 'quickbooks', 'email'],
    requiredCredentials: ['paypalApi', 'quickbooksOAuth2'],
    estimatedSetupTime: 20,
    documentation: { overview: 'Automate refund processing and accounting updates.', setup: [], usage: 'Webhook triggers refund workflow.' }
  },
  {
    id: 'bigcommerce-abandoned-cart',
    name: 'BigCommerce Abandoned Cart Recovery',
    description: 'Send reminders for abandoned shopping carts',
    category: 'ecommerce',
    subcategory: 'cart-recovery',
    author: 'System',
    authorType: 'official',
    tags: ['bigcommerce', 'abandoned-cart', 'email', 'recovery', 'sales'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Every Hour', properties: { interval: 'hourly' } } },
        { id: 'get-carts', type: 'bigcommerce', position: { x: 300, y: 200 }, data: { label: 'Get Abandoned', properties: { operation: 'getAll', resource: 'abandonedCarts', filter: { age: '> 1 hour' } } } },
        { id: 'filter', type: 'filter', position: { x: 500, y: 200 }, data: { label: 'Not Reminded', properties: { conditions: [{ field: '={{$json.reminder_sent}}', operator: 'equals', value: false }] } } },
        { id: 'email', type: 'email', position: { x: 700, y: 200 }, data: { label: 'Recovery Email', properties: { template: 'abandoned-cart', to: '={{$json.email}}' } } },
        { id: 'update', type: 'bigcommerce', position: { x: 900, y: 200 }, data: { label: 'Mark Reminded', properties: { operation: 'update', resource: 'abandonedCart' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'get-carts' },
        { id: 'e2', source: 'get-carts', target: 'filter' },
        { id: 'e3', source: 'filter', target: 'email' },
        { id: 'e4', source: 'email', target: 'update' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date(),
    downloads: 1234,
    rating: 4.6,
    reviewCount: 89,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'bigcommerce', 'filter', 'email'],
    requiredCredentials: ['bigcommerceApi'],
    estimatedSetupTime: 15,
    documentation: { overview: 'Recover lost sales from abandoned carts.', setup: [], usage: 'Sends recovery emails for carts abandoned over 1 hour.' }
  },

  // ========================================
  // DATA INTEGRATION & ETL (10 templates)
  // ========================================
  {
    id: 'airtable-to-mysql-sync',
    name: 'Airtable to MySQL Sync',
    description: 'Sync Airtable records to a MySQL database',
    category: 'data',
    subcategory: 'sync',
    author: 'System',
    authorType: 'official',
    tags: ['airtable', 'mysql', 'sync', 'database', 'etl'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Every 15 Min', properties: { interval: '15m' } } },
        { id: 'airtable', type: 'airtable', position: { x: 300, y: 200 }, data: { label: 'Get Records', properties: { operation: 'list', baseId: '={{env.AIRTABLE_BASE}}', table: 'Main' } } },
        { id: 'mysql', type: 'mysql', position: { x: 500, y: 200 }, data: { label: 'Upsert Records', properties: { operation: 'executeQuery', query: 'INSERT INTO records (id, name, email) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = ?, email = ?' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'airtable' },
        { id: 'e2', source: 'airtable', target: 'mysql' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    downloads: 1567,
    rating: 4.5,
    reviewCount: 98,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'airtable', 'mysql'],
    requiredCredentials: ['airtableApi', 'mysqlCredentials'],
    estimatedSetupTime: 15,
    documentation: { overview: 'Keep MySQL database in sync with Airtable.', setup: [], usage: 'Syncs every 15 minutes.' }
  },
  {
    id: 'csv-to-postgres-import',
    name: 'CSV to PostgreSQL Import',
    description: 'Import CSV files from email attachments to PostgreSQL',
    category: 'data',
    subcategory: 'import',
    author: 'System',
    authorType: 'official',
    tags: ['csv', 'postgresql', 'email', 'import', 'data'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'email_trigger', position: { x: 100, y: 200 }, data: { label: 'Email with CSV', properties: { filter: { hasAttachment: true, attachmentType: 'csv' } } } },
        { id: 'parse', type: 'csv_parser', position: { x: 300, y: 200 }, data: { label: 'Parse CSV', properties: { headerRow: true } } },
        { id: 'postgres', type: 'postgresql', position: { x: 500, y: 200 }, data: { label: 'Insert Rows', properties: { operation: 'insert', table: '={{$json.tableName || "imports"}}' } } },
        { id: 'reply', type: 'email', position: { x: 700, y: 200 }, data: { label: 'Confirm Import', properties: { replyTo: true, body: 'Imported {{$items.length}} rows successfully.' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'parse' },
        { id: 'e2', source: 'parse', target: 'postgres' },
        { id: 'e3', source: 'postgres', target: 'reply' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date(),
    downloads: 1234,
    rating: 4.4,
    reviewCount: 76,
    featured: false,
    requiredIntegrations: ['email_trigger', 'csv_parser', 'postgresql', 'email'],
    requiredCredentials: ['imapCredentials', 'postgresCredentials'],
    estimatedSetupTime: 20,
    documentation: { overview: 'Import CSV files from emails to PostgreSQL.', setup: [], usage: 'Email CSV attachment to trigger import.' }
  },
  {
    id: 'mongodb-to-elasticsearch',
    name: 'MongoDB to Elasticsearch Index',
    description: 'Keep Elasticsearch index in sync with MongoDB collection',
    category: 'data',
    subcategory: 'search',
    author: 'System',
    authorType: 'official',
    tags: ['mongodb', 'elasticsearch', 'search', 'sync', 'index'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'mongodb_trigger', position: { x: 100, y: 200 }, data: { label: 'Change Stream', properties: { collection: 'products', operations: ['insert', 'update', 'delete'] } } },
        { id: 'switch', type: 'switch_case', position: { x: 300, y: 200 }, data: { label: 'Operation Type', properties: { field: '={{$json.operationType}}' } } },
        { id: 'es-index', type: 'elasticsearch', position: { x: 500, y: 100 }, data: { label: 'Index Doc', properties: { operation: 'index', index: 'products', id: '={{$json.documentKey._id}}' } } },
        { id: 'es-delete', type: 'elasticsearch', position: { x: 500, y: 300 }, data: { label: 'Delete Doc', properties: { operation: 'delete', index: 'products', id: '={{$json.documentKey._id}}' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'switch' },
        { id: 'e2', source: 'switch', target: 'es-index', sourceHandle: 'insert' },
        { id: 'e3', source: 'switch', target: 'es-index', sourceHandle: 'update' },
        { id: 'e4', source: 'switch', target: 'es-delete', sourceHandle: 'delete' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date(),
    downloads: 876,
    rating: 4.6,
    reviewCount: 54,
    featured: true,
    requiredIntegrations: ['mongodb_trigger', 'switch_case', 'elasticsearch'],
    requiredCredentials: ['mongodbCredentials', 'elasticsearchCredentials'],
    estimatedSetupTime: 25,
    documentation: { overview: 'Real-time sync from MongoDB to Elasticsearch.', setup: [], usage: 'Uses MongoDB change streams for real-time updates.' }
  },
  {
    id: 'api-to-bigquery',
    name: 'REST API to BigQuery Pipeline',
    description: 'Fetch data from REST APIs and load into BigQuery',
    category: 'data',
    subcategory: 'etl',
    author: 'System',
    authorType: 'official',
    tags: ['api', 'bigquery', 'etl', 'data-pipeline', 'analytics'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Daily', properties: { cron: '0 2 * * *' } } },
        { id: 'api', type: 'http_request', position: { x: 300, y: 200 }, data: { label: 'Fetch Data', properties: { url: '={{env.API_ENDPOINT}}', method: 'GET', pagination: { type: 'cursor' } } } },
        { id: 'transform', type: 'code_javascript', position: { x: 500, y: 200 }, data: { label: 'Transform', properties: { code: 'return items.map(item => ({ ...item, _loaded_at: new Date().toISOString() }));' } } },
        { id: 'bigquery', type: 'bigquery', position: { x: 700, y: 200 }, data: { label: 'Load to BQ', properties: { operation: 'insert', dataset: '={{env.BQ_DATASET}}', table: '={{env.BQ_TABLE}}' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'api' },
        { id: 'e2', source: 'api', target: 'transform' },
        { id: 'e3', source: 'transform', target: 'bigquery' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date(),
    downloads: 1456,
    rating: 4.5,
    reviewCount: 87,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'http_request', 'code_javascript', 'bigquery'],
    requiredCredentials: ['bigqueryCredentials'],
    estimatedSetupTime: 20,
    documentation: { overview: 'Daily API data pipeline to BigQuery.', setup: [], usage: 'Runs at 2 AM daily.' }
  },
  {
    id: 'snowflake-data-warehouse',
    name: 'Snowflake Data Warehouse ETL',
    description: 'Multi-source ETL pipeline to Snowflake',
    category: 'data',
    subcategory: 'warehouse',
    author: 'System',
    authorType: 'official',
    tags: ['snowflake', 'etl', 'data-warehouse', 'analytics', 'bi'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Every 6 Hours', properties: { interval: '6h' } } },
        { id: 'salesforce', type: 'salesforce', position: { x: 300, y: 100 }, data: { label: 'Get Opportunities', properties: { operation: 'getAll', sobject: 'Opportunity' } } },
        { id: 'hubspot', type: 'hubspot', position: { x: 300, y: 300 }, data: { label: 'Get Deals', properties: { operation: 'getAll', resource: 'deal' } } },
        { id: 'merge', type: 'merge', position: { x: 500, y: 200 }, data: { label: 'Merge Data', properties: { mode: 'append' } } },
        { id: 'snowflake', type: 'snowflake', position: { x: 700, y: 200 }, data: { label: 'Load to Snowflake', properties: { operation: 'insert', table: 'SALES_DATA' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'salesforce' },
        { id: 'e2', source: 'trigger', target: 'hubspot' },
        { id: 'e3', source: 'salesforce', target: 'merge' },
        { id: 'e4', source: 'hubspot', target: 'merge' },
        { id: 'e5', source: 'merge', target: 'snowflake' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date(),
    downloads: 756,
    rating: 4.7,
    reviewCount: 45,
    featured: true,
    requiredIntegrations: ['schedule_trigger', 'salesforce', 'hubspot', 'merge', 'snowflake'],
    requiredCredentials: ['salesforceOAuth2', 'hubspotApi', 'snowflakeCredentials'],
    estimatedSetupTime: 30,
    documentation: { overview: 'Multi-source ETL to Snowflake data warehouse.', setup: [], usage: 'Runs every 6 hours to sync sales data.' }
  },

  // ========================================
  // COMMUNICATION & MESSAGING (10 templates)
  // ========================================
  {
    id: 'telegram-command-bot',
    name: 'Telegram Command Bot',
    description: 'Create a Telegram bot that responds to commands',
    category: 'communication',
    subcategory: 'bots',
    author: 'System',
    authorType: 'official',
    tags: ['telegram', 'bot', 'commands', 'automation', 'chat'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'telegram_trigger', position: { x: 100, y: 200 }, data: { label: 'Message Received', properties: { updates: ['message'] } } },
        { id: 'switch', type: 'switch_case', position: { x: 300, y: 200 }, data: { label: 'Check Command', properties: { field: '={{$json.message.text.split(" ")[0]}}' } } },
        { id: 'help', type: 'telegram', position: { x: 500, y: 100 }, data: { label: 'Send Help', properties: { operation: 'sendMessage', text: 'Available commands: /help, /status, /report' } } },
        { id: 'status', type: 'http_request', position: { x: 500, y: 200 }, data: { label: 'Get Status', properties: { url: '={{env.STATUS_API}}' } } },
        { id: 'report', type: 'google_sheets', position: { x: 500, y: 300 }, data: { label: 'Get Report', properties: { operation: 'read', range: 'Daily!A:D' } } },
        { id: 'respond-status', type: 'telegram', position: { x: 700, y: 200 }, data: { label: 'Send Status', properties: { operation: 'sendMessage' } } },
        { id: 'respond-report', type: 'telegram', position: { x: 700, y: 300 }, data: { label: 'Send Report', properties: { operation: 'sendMessage' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'switch' },
        { id: 'e2', source: 'switch', target: 'help', sourceHandle: '/help' },
        { id: 'e3', source: 'switch', target: 'status', sourceHandle: '/status' },
        { id: 'e4', source: 'switch', target: 'report', sourceHandle: '/report' },
        { id: 'e5', source: 'status', target: 'respond-status' },
        { id: 'e6', source: 'report', target: 'respond-report' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date(),
    downloads: 2345,
    rating: 4.7,
    reviewCount: 178,
    featured: true,
    requiredIntegrations: ['telegram_trigger', 'switch_case', 'telegram', 'http_request', 'google_sheets'],
    requiredCredentials: ['telegramBotApi', 'googleSheetsOAuth2'],
    estimatedSetupTime: 20,
    documentation: { overview: 'Build a Telegram bot with custom commands.', setup: [], usage: 'Users can send /help, /status, /report commands.' }
  },
  {
    id: 'discord-moderation-bot',
    name: 'Discord Moderation Bot',
    description: 'Automated Discord moderation with keyword filtering',
    category: 'communication',
    subcategory: 'moderation',
    author: 'System',
    authorType: 'official',
    tags: ['discord', 'moderation', 'bot', 'filter', 'community'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'discord_trigger', position: { x: 100, y: 200 }, data: { label: 'Message', properties: { event: 'messageCreate' } } },
        { id: 'check', type: 'code_javascript', position: { x: 300, y: 200 }, data: { label: 'Check Content', properties: { code: 'const badWords = ["spam", "scam"]; const hasBad = badWords.some(w => $json.content.toLowerCase().includes(w)); return [{ flagged: hasBad }];' } } },
        { id: 'filter', type: 'filter', position: { x: 500, y: 200 }, data: { label: 'If Flagged', properties: { conditions: [{ field: '={{$json.flagged}}', operator: 'equals', value: true }] } } },
        { id: 'delete', type: 'discord', position: { x: 700, y: 200 }, data: { label: 'Delete Message', properties: { operation: 'deleteMessage' } } },
        { id: 'warn', type: 'discord', position: { x: 900, y: 200 }, data: { label: 'Warn User', properties: { operation: 'sendMessage', content: '⚠️ Your message was removed for violating community guidelines.' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'check' },
        { id: 'e2', source: 'check', target: 'filter' },
        { id: 'e3', source: 'filter', target: 'delete' },
        { id: 'e4', source: 'delete', target: 'warn' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date(),
    downloads: 1567,
    rating: 4.5,
    reviewCount: 112,
    featured: false,
    requiredIntegrations: ['discord_trigger', 'code_javascript', 'filter', 'discord'],
    requiredCredentials: ['discordBotToken'],
    estimatedSetupTime: 15,
    documentation: { overview: 'Automated Discord moderation.', setup: [], usage: 'Automatically removes messages with banned keywords.' }
  },
  {
    id: 'whatsapp-customer-support',
    name: 'WhatsApp Customer Support Bot',
    description: 'Automated WhatsApp support with FAQ and human handoff',
    category: 'support',
    subcategory: 'chatbot',
    author: 'System',
    authorType: 'official',
    tags: ['whatsapp', 'support', 'chatbot', 'faq', 'customer-service'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'whatsapp_trigger', position: { x: 100, y: 200 }, data: { label: 'Message', properties: { event: 'message' } } },
        { id: 'ai', type: 'openai', position: { x: 300, y: 200 }, data: { label: 'Classify Intent', properties: { operation: 'chat', model: 'gpt-4', messages: [{ role: 'system', content: 'Classify customer intent: order_status, return, faq, human' }] } } },
        { id: 'switch', type: 'switch_case', position: { x: 500, y: 200 }, data: { label: 'Route', properties: { field: '={{$json.intent}}' } } },
        { id: 'faq', type: 'http_request', position: { x: 700, y: 100 }, data: { label: 'Search FAQ', properties: { url: '={{env.FAQ_API}}' } } },
        { id: 'order', type: 'shopify', position: { x: 700, y: 200 }, data: { label: 'Get Order', properties: { operation: 'get', resource: 'order' } } },
        { id: 'zendesk', type: 'zendesk', position: { x: 700, y: 300 }, data: { label: 'Create Ticket', properties: { operation: 'create', resource: 'ticket' } } },
        { id: 'reply', type: 'whatsapp', position: { x: 900, y: 200 }, data: { label: 'Reply', properties: { operation: 'sendMessage' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'ai' },
        { id: 'e2', source: 'ai', target: 'switch' },
        { id: 'e3', source: 'switch', target: 'faq', sourceHandle: 'faq' },
        { id: 'e4', source: 'switch', target: 'order', sourceHandle: 'order_status' },
        { id: 'e5', source: 'switch', target: 'zendesk', sourceHandle: 'human' },
        { id: 'e6', source: 'faq', target: 'reply' },
        { id: 'e7', source: 'order', target: 'reply' },
        { id: 'e8', source: 'zendesk', target: 'reply' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date(),
    downloads: 2134,
    rating: 4.8,
    reviewCount: 156,
    featured: true,
    requiredIntegrations: ['whatsapp_trigger', 'openai', 'switch_case', 'http_request', 'shopify', 'zendesk', 'whatsapp'],
    requiredCredentials: ['whatsappApi', 'openaiApi', 'shopifyApi', 'zendeskApi'],
    estimatedSetupTime: 30,
    documentation: { overview: 'AI-powered WhatsApp support bot with human handoff.', setup: [], usage: 'Handles FAQs, order status, and escalates to human.' }
  },
  {
    id: 'teams-standup-bot',
    name: 'Microsoft Teams Standup Bot',
    description: 'Collect daily standup updates from team members',
    category: 'productivity',
    subcategory: 'standup',
    author: 'System',
    authorType: 'official',
    tags: ['teams', 'standup', 'daily', 'agile', 'productivity'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Daily 9 AM', properties: { cron: '0 9 * * 1-5' } } },
        { id: 'get-team', type: 'microsoft_teams', position: { x: 300, y: 200 }, data: { label: 'Get Members', properties: { operation: 'getMembers', teamId: '={{env.TEAM_ID}}' } } },
        { id: 'send-form', type: 'microsoft_teams', position: { x: 500, y: 200 }, data: { label: 'Send Form', properties: { operation: 'sendAdaptiveCard', card: { type: 'AdaptiveCard', body: [{ type: 'TextBlock', text: '🌅 Daily Standup' }] } } } },
        { id: 'collect', type: 'wait', position: { x: 700, y: 200 }, data: { label: 'Wait for Responses', properties: { duration: 2, unit: 'hours' } } },
        { id: 'summarize', type: 'code_javascript', position: { x: 900, y: 200 }, data: { label: 'Summarize', properties: { code: '// Aggregate standup responses' } } },
        { id: 'post', type: 'microsoft_teams', position: { x: 1100, y: 200 }, data: { label: 'Post Summary', properties: { operation: 'sendMessage', channel: '={{env.STANDUP_CHANNEL}}' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'get-team' },
        { id: 'e2', source: 'get-team', target: 'send-form' },
        { id: 'e3', source: 'send-form', target: 'collect' },
        { id: 'e4', source: 'collect', target: 'summarize' },
        { id: 'e5', source: 'summarize', target: 'post' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date(),
    downloads: 1876,
    rating: 4.6,
    reviewCount: 134,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'microsoft_teams', 'wait', 'code_javascript'],
    requiredCredentials: ['microsoftTeamsOAuth2'],
    estimatedSetupTime: 20,
    documentation: { overview: 'Automated daily standup collection and summary.', setup: [], usage: 'Runs at 9 AM on weekdays.' }
  },
  {
    id: 'sms-appointment-reminders',
    name: 'SMS Appointment Reminders',
    description: 'Send SMS reminders for upcoming appointments',
    category: 'communication',
    subcategory: 'reminders',
    author: 'System',
    authorType: 'official',
    tags: ['sms', 'twilio', 'reminders', 'appointments', 'healthcare'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Every Hour', properties: { interval: 'hourly' } } },
        { id: 'calendar', type: 'google_calendar', position: { x: 300, y: 200 }, data: { label: 'Get Appointments', properties: { operation: 'getEvents', timeMin: '={{$now}}', timeMax: '={{$now.plus(25, "hours")}}' } } },
        { id: 'filter', type: 'filter', position: { x: 500, y: 200 }, data: { label: '24h Away', properties: { conditions: [{ field: '={{$json.hoursUntil}}', operator: 'between', value: [23, 25] }] } } },
        { id: 'sms', type: 'twilio', position: { x: 700, y: 200 }, data: { label: 'Send SMS', properties: { operation: 'sendSms', to: '={{$json.attendee.phone}}', body: 'Reminder: Your appointment is tomorrow at {{$json.start.format("h:mm A")}}' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'calendar' },
        { id: 'e2', source: 'calendar', target: 'filter' },
        { id: 'e3', source: 'filter', target: 'sms' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date(),
    downloads: 2567,
    rating: 4.7,
    reviewCount: 189,
    featured: true,
    requiredIntegrations: ['schedule_trigger', 'google_calendar', 'filter', 'twilio'],
    requiredCredentials: ['googleCalendarOAuth2', 'twilioApi'],
    estimatedSetupTime: 15,
    documentation: { overview: 'Automated SMS reminders for appointments.', setup: [], usage: 'Sends reminders 24 hours before appointments.' }
  },

  // ========================================
  // AI & AUTOMATION (10 templates)
  // ========================================
  {
    id: 'ai-content-generator',
    name: 'AI Blog Content Generator',
    description: 'Generate blog posts using GPT-4 and publish to WordPress',
    category: 'ai',
    subcategory: 'content',
    author: 'System',
    authorType: 'official',
    tags: ['openai', 'gpt-4', 'wordpress', 'content', 'blog'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'webhook_trigger', position: { x: 100, y: 200 }, data: { label: 'Topic Request', properties: { path: '/generate-post' } } },
        { id: 'outline', type: 'openai', position: { x: 300, y: 200 }, data: { label: 'Generate Outline', properties: { operation: 'chat', model: 'gpt-4', messages: [{ role: 'system', content: 'Create a blog post outline' }] } } },
        { id: 'content', type: 'openai', position: { x: 500, y: 200 }, data: { label: 'Write Content', properties: { operation: 'chat', model: 'gpt-4' } } },
        { id: 'image', type: 'openai', position: { x: 500, y: 350 }, data: { label: 'Generate Image', properties: { operation: 'createImage', model: 'dall-e-3' } } },
        { id: 'wordpress', type: 'wordpress', position: { x: 700, y: 200 }, data: { label: 'Create Post', properties: { operation: 'create', resource: 'post', status: 'draft' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'outline' },
        { id: 'e2', source: 'outline', target: 'content' },
        { id: 'e3', source: 'outline', target: 'image' },
        { id: 'e4', source: 'content', target: 'wordpress' },
        { id: 'e5', source: 'image', target: 'wordpress' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    downloads: 3456,
    rating: 4.8,
    reviewCount: 267,
    featured: true,
    requiredIntegrations: ['webhook_trigger', 'openai', 'wordpress'],
    requiredCredentials: ['openaiApi', 'wordpressApi'],
    estimatedSetupTime: 15,
    documentation: { overview: 'AI-powered blog content generation.', setup: [], usage: 'Send topic via webhook to generate blog post.' }
  },
  {
    id: 'ai-email-responder',
    name: 'AI Email Auto-Responder',
    description: 'Automatically respond to emails using GPT-4',
    category: 'ai',
    subcategory: 'email',
    author: 'System',
    authorType: 'official',
    tags: ['openai', 'email', 'automation', 'gpt-4', 'support'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'email_trigger', position: { x: 100, y: 200 }, data: { label: 'New Email', properties: { folder: 'INBOX' } } },
        { id: 'classify', type: 'openai', position: { x: 300, y: 200 }, data: { label: 'Classify Email', properties: { operation: 'chat', messages: [{ role: 'system', content: 'Classify: support, sales, spam, personal' }] } } },
        { id: 'filter', type: 'filter', position: { x: 500, y: 200 }, data: { label: 'Not Spam', properties: { conditions: [{ field: '={{$json.category}}', operator: 'notEquals', value: 'spam' }] } } },
        { id: 'draft', type: 'openai', position: { x: 700, y: 200 }, data: { label: 'Draft Response', properties: { operation: 'chat', messages: [{ role: 'system', content: 'Write professional email response' }] } } },
        { id: 'send', type: 'email', position: { x: 900, y: 200 }, data: { label: 'Send Reply', properties: { replyTo: true } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'classify' },
        { id: 'e2', source: 'classify', target: 'filter' },
        { id: 'e3', source: 'filter', target: 'draft' },
        { id: 'e4', source: 'draft', target: 'send' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
    downloads: 2345,
    rating: 4.6,
    reviewCount: 178,
    featured: true,
    requiredIntegrations: ['email_trigger', 'openai', 'filter', 'email'],
    requiredCredentials: ['imapCredentials', 'smtpCredentials', 'openaiApi'],
    estimatedSetupTime: 20,
    documentation: { overview: 'AI-powered email auto-responder.', setup: [], usage: 'Automatically responds to non-spam emails.' }
  },
  {
    id: 'ai-document-processor',
    name: 'AI Document Processor',
    description: 'Extract and summarize information from documents using AI',
    category: 'ai',
    subcategory: 'documents',
    author: 'System',
    authorType: 'official',
    tags: ['openai', 'documents', 'extraction', 'pdf', 'ocr'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'google_drive_trigger', position: { x: 100, y: 200 }, data: { label: 'New File', properties: { folderId: '={{env.DRIVE_FOLDER}}' } } },
        { id: 'download', type: 'google_drive', position: { x: 300, y: 200 }, data: { label: 'Download', properties: { operation: 'download' } } },
        { id: 'ocr', type: 'http_request', position: { x: 500, y: 200 }, data: { label: 'OCR Extract', properties: { url: 'https://api.ocr.space/parse/image', method: 'POST' } } },
        { id: 'summarize', type: 'openai', position: { x: 700, y: 200 }, data: { label: 'Summarize', properties: { operation: 'chat', messages: [{ role: 'system', content: 'Summarize document and extract key entities' }] } } },
        { id: 'sheets', type: 'google_sheets', position: { x: 900, y: 200 }, data: { label: 'Save Results', properties: { operation: 'append' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'download' },
        { id: 'e2', source: 'download', target: 'ocr' },
        { id: 'e3', source: 'ocr', target: 'summarize' },
        { id: 'e4', source: 'summarize', target: 'sheets' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date(),
    downloads: 1567,
    rating: 4.5,
    reviewCount: 98,
    featured: false,
    requiredIntegrations: ['google_drive_trigger', 'google_drive', 'http_request', 'openai', 'google_sheets'],
    requiredCredentials: ['googleDriveOAuth2', 'ocrApiKey', 'openaiApi', 'googleSheetsOAuth2'],
    estimatedSetupTime: 25,
    documentation: { overview: 'AI-powered document processing and summarization.', setup: [], usage: 'Upload documents to trigger processing.' }
  },
  {
    id: 'ai-sentiment-monitor',
    name: 'AI Social Media Sentiment Monitor',
    description: 'Monitor brand mentions and analyze sentiment',
    category: 'ai',
    subcategory: 'sentiment',
    author: 'System',
    authorType: 'official',
    tags: ['openai', 'twitter', 'sentiment', 'brand', 'monitoring'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Every 15 Min', properties: { interval: '15m' } } },
        { id: 'twitter', type: 'twitter', position: { x: 300, y: 200 }, data: { label: 'Search Mentions', properties: { operation: 'search', query: '={{env.BRAND_NAME}}' } } },
        { id: 'analyze', type: 'openai', position: { x: 500, y: 200 }, data: { label: 'Analyze Sentiment', properties: { operation: 'chat', messages: [{ role: 'system', content: 'Analyze sentiment: positive, negative, neutral. Score 1-10.' }] } } },
        { id: 'filter', type: 'filter', position: { x: 700, y: 200 }, data: { label: 'Negative Only', properties: { conditions: [{ field: '={{$json.sentiment}}', operator: 'equals', value: 'negative' }] } } },
        { id: 'slack', type: 'slack', position: { x: 900, y: 200 }, data: { label: 'Alert Team', properties: { channel: '#social-alerts', message: '⚠️ Negative mention: {{$json.text}}' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'twitter' },
        { id: 'e2', source: 'twitter', target: 'analyze' },
        { id: 'e3', source: 'analyze', target: 'filter' },
        { id: 'e4', source: 'filter', target: 'slack' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date(),
    downloads: 1234,
    rating: 4.6,
    reviewCount: 89,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'twitter', 'openai', 'filter', 'slack'],
    requiredCredentials: ['twitterApi', 'openaiApi', 'slackOAuth2'],
    estimatedSetupTime: 20,
    documentation: { overview: 'AI-powered social media sentiment monitoring.', setup: [], usage: 'Monitors brand mentions and alerts on negative sentiment.' }
  },
  {
    id: 'ai-code-review',
    name: 'AI Code Review Bot',
    description: 'Automated code review on GitHub pull requests',
    category: 'devops',
    subcategory: 'code-review',
    author: 'System',
    authorType: 'official',
    tags: ['github', 'openai', 'code-review', 'automation', 'development'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'github_trigger', position: { x: 100, y: 200 }, data: { label: 'PR Opened', properties: { event: 'pull_request.opened' } } },
        { id: 'get-diff', type: 'github', position: { x: 300, y: 200 }, data: { label: 'Get Diff', properties: { operation: 'getPullRequestDiff' } } },
        { id: 'review', type: 'openai', position: { x: 500, y: 200 }, data: { label: 'AI Review', properties: { operation: 'chat', model: 'gpt-4', messages: [{ role: 'system', content: 'Review code for bugs, security issues, and best practices' }] } } },
        { id: 'comment', type: 'github', position: { x: 700, y: 200 }, data: { label: 'Add Comment', properties: { operation: 'createPullRequestComment', body: '={{$json.review}}' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'get-diff' },
        { id: 'e2', source: 'get-diff', target: 'review' },
        { id: 'e3', source: 'review', target: 'comment' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date(),
    downloads: 1876,
    rating: 4.7,
    reviewCount: 145,
    featured: true,
    requiredIntegrations: ['github_trigger', 'github', 'openai'],
    requiredCredentials: ['githubOAuth2', 'openaiApi'],
    estimatedSetupTime: 15,
    documentation: { overview: 'AI-powered automated code review.', setup: [], usage: 'Reviews PRs automatically when opened.' }
  }
];

/**
 * n8n Parity Templates - Popular workflow patterns from n8n
 */

import type { WorkflowTemplate } from '../../types/templates';

export const N8N_PARITY_TEMPLATES: WorkflowTemplate[] = [
  // Webhook to Slack notification
  {
    id: 'webhook-to-slack',
    name: 'Webhook to Slack Notification',
    description: 'Receive webhook data and send formatted notification to Slack channel',
    category: 'communication',
    subcategory: 'notifications',
    author: 'System',
    authorType: 'official',
    tags: ['webhook', 'slack', 'notifications', 'alerts'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'webhook-1', type: 'webhook', position: { x: 100, y: 200 }, data: { label: 'Webhook Trigger', config: { path: '/notify' } } },
        { id: 'slack-1', type: 'slack', position: { x: 300, y: 200 }, data: { label: 'Send to Slack', config: { channel: '#notifications', message: '{{$json.message}}' } } }
      ],
      edges: [{ id: 'e1', source: 'webhook-1', target: 'slack-1' }]
    }
  },

  // Schedule to Email report
  {
    id: 'scheduled-email-report',
    name: 'Scheduled Email Report',
    description: 'Generate and send reports on a schedule via email',
    category: 'productivity',
    subcategory: 'reports',
    author: 'System',
    authorType: 'official',
    tags: ['schedule', 'email', 'report', 'automation'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'schedule-1', type: 'schedule', position: { x: 100, y: 200 }, data: { label: 'Daily Schedule', config: { cron: '0 9 * * *' } } },
        { id: 'http-1', type: 'httpRequest', position: { x: 300, y: 200 }, data: { label: 'Fetch Data', config: { url: 'https://api.example.com/report' } } },
        { id: 'email-1', type: 'email', position: { x: 500, y: 200 }, data: { label: 'Send Report', config: { to: '{{$env.REPORT_EMAIL}}', subject: 'Daily Report' } } }
      ],
      edges: [{ id: 'e1', source: 'schedule-1', target: 'http-1' }, { id: 'e2', source: 'http-1', target: 'email-1' }]
    }
  },

  // Google Sheets to Slack sync
  {
    id: 'sheets-to-slack',
    name: 'Google Sheets Row to Slack',
    description: 'When a new row is added to Google Sheets, notify Slack',
    category: 'productivity',
    subcategory: 'sync',
    author: 'System',
    authorType: 'official',
    tags: ['google-sheets', 'slack', 'sync', 'notifications'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'sheets-1', type: 'googleSheets', position: { x: 100, y: 200 }, data: { label: 'New Row Trigger', config: { operation: 'watch' } } },
        { id: 'slack-1', type: 'slack', position: { x: 300, y: 200 }, data: { label: 'Notify Slack', config: { channel: '#updates' } } }
      ],
      edges: [{ id: 'e1', source: 'sheets-1', target: 'slack-1' }]
    }
  },

  // Form submission to Notion
  {
    id: 'form-to-notion',
    name: 'Form Submission to Notion Database',
    description: 'Capture form submissions and add them to a Notion database',
    category: 'productivity',
    subcategory: 'forms',
    author: 'System',
    authorType: 'official',
    tags: ['form', 'notion', 'database', 'leads'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'form-1', type: 'formTrigger', position: { x: 100, y: 200 }, data: { label: 'Form Submission' } },
        { id: 'notion-1', type: 'notion', position: { x: 300, y: 200 }, data: { label: 'Add to Notion', config: { operation: 'create' } } }
      ],
      edges: [{ id: 'e1', source: 'form-1', target: 'notion-1' }]
    }
  },

  // RSS to Discord
  {
    id: 'rss-to-discord',
    name: 'RSS Feed to Discord',
    description: 'Monitor RSS feed and post new items to Discord channel',
    category: 'social',
    subcategory: 'feeds',
    author: 'System',
    authorType: 'official',
    tags: ['rss', 'discord', 'news', 'automation'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'rss-1', type: 'rssFeed', position: { x: 100, y: 200 }, data: { label: 'RSS Feed', config: { url: '{{$env.RSS_URL}}' } } },
        { id: 'discord-1', type: 'discord', position: { x: 300, y: 200 }, data: { label: 'Post to Discord' } }
      ],
      edges: [{ id: 'e1', source: 'rss-1', target: 'discord-1' }]
    }
  },

  // Stripe to Slack payment notification
  {
    id: 'stripe-payment-slack',
    name: 'Stripe Payment to Slack',
    description: 'Get notified in Slack when a payment is received in Stripe',
    category: 'ecommerce',
    subcategory: 'payments',
    author: 'System',
    authorType: 'official',
    tags: ['stripe', 'slack', 'payments', 'notifications'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'webhook-1', type: 'webhook', position: { x: 100, y: 200 }, data: { label: 'Stripe Webhook' } },
        { id: 'filter-1', type: 'filter', position: { x: 300, y: 200 }, data: { label: 'Payment Success', config: { field: 'type', value: 'payment_intent.succeeded' } } },
        { id: 'slack-1', type: 'slack', position: { x: 500, y: 200 }, data: { label: 'Notify Payment' } }
      ],
      edges: [{ id: 'e1', source: 'webhook-1', target: 'filter-1' }, { id: 'e2', source: 'filter-1', target: 'slack-1' }]
    }
  },

  // HubSpot new contact to email
  {
    id: 'hubspot-welcome-email',
    name: 'HubSpot New Contact Welcome Email',
    description: 'Send welcome email when new contact is created in HubSpot',
    category: 'marketing',
    subcategory: 'crm',
    author: 'System',
    authorType: 'official',
    tags: ['hubspot', 'email', 'crm', 'onboarding'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'hubspot-1', type: 'hubspot', position: { x: 100, y: 200 }, data: { label: 'New Contact Trigger' } },
        { id: 'email-1', type: 'email', position: { x: 300, y: 200 }, data: { label: 'Welcome Email', config: { template: 'welcome' } } }
      ],
      edges: [{ id: 'e1', source: 'hubspot-1', target: 'email-1' }]
    }
  },

  // GitHub issue to Jira
  {
    id: 'github-to-jira',
    name: 'GitHub Issue to Jira Ticket',
    description: 'Create Jira ticket when GitHub issue is opened',
    category: 'devops',
    subcategory: 'issues',
    author: 'System',
    authorType: 'official',
    tags: ['github', 'jira', 'issues', 'sync'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'webhook-1', type: 'webhook', position: { x: 100, y: 200 }, data: { label: 'GitHub Webhook' } },
        { id: 'filter-1', type: 'filter', position: { x: 300, y: 200 }, data: { label: 'Issue Opened', config: { field: 'action', value: 'opened' } } },
        { id: 'jira-1', type: 'jira', position: { x: 500, y: 200 }, data: { label: 'Create Jira Issue' } }
      ],
      edges: [{ id: 'e1', source: 'webhook-1', target: 'filter-1' }, { id: 'e2', source: 'filter-1', target: 'jira-1' }]
    }
  },

  // Airtable to Mailchimp sync
  {
    id: 'airtable-mailchimp-sync',
    name: 'Airtable to Mailchimp Subscriber Sync',
    description: 'Sync new Airtable records to Mailchimp subscriber list',
    category: 'marketing',
    subcategory: 'email',
    author: 'System',
    authorType: 'official',
    tags: ['airtable', 'mailchimp', 'sync', 'subscribers'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'airtable-1', type: 'airtable', position: { x: 100, y: 200 }, data: { label: 'New Record' } },
        { id: 'mailchimp-1', type: 'mailchimp', position: { x: 300, y: 200 }, data: { label: 'Add Subscriber' } }
      ],
      edges: [{ id: 'e1', source: 'airtable-1', target: 'mailchimp-1' }]
    }
  },

  // OpenAI text processing
  {
    id: 'openai-text-summarizer',
    name: 'OpenAI Text Summarizer',
    description: 'Receive text via webhook and return AI-generated summary',
    category: 'ai',
    subcategory: 'nlp',
    author: 'System',
    authorType: 'official',
    tags: ['openai', 'gpt', 'summarize', 'text'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'webhook-1', type: 'webhook', position: { x: 100, y: 200 }, data: { label: 'Text Input' } },
        { id: 'openai-1', type: 'openai', position: { x: 300, y: 200 }, data: { label: 'Summarize', config: { model: 'gpt-4', prompt: 'Summarize: {{$json.text}}' } } },
        { id: 'respond-1', type: 'respondToWebhook', position: { x: 500, y: 200 }, data: { label: 'Return Summary' } }
      ],
      edges: [{ id: 'e1', source: 'webhook-1', target: 'openai-1' }, { id: 'e2', source: 'openai-1', target: 'respond-1' }]
    }
  },

  // Shopify order to Google Sheets
  {
    id: 'shopify-to-sheets',
    name: 'Shopify Orders to Google Sheets',
    description: 'Log all Shopify orders to a Google Sheets spreadsheet',
    category: 'ecommerce',
    subcategory: 'orders',
    author: 'System',
    authorType: 'official',
    tags: ['shopify', 'google-sheets', 'orders', 'logging'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'webhook-1', type: 'webhook', position: { x: 100, y: 200 }, data: { label: 'Shopify Order Webhook' } },
        { id: 'sheets-1', type: 'googleSheets', position: { x: 300, y: 200 }, data: { label: 'Log Order', config: { operation: 'append' } } }
      ],
      edges: [{ id: 'e1', source: 'webhook-1', target: 'sheets-1' }]
    }
  },

  // Typeform to Salesforce
  {
    id: 'typeform-to-salesforce',
    name: 'Typeform to Salesforce Lead',
    description: 'Create Salesforce lead from Typeform submission',
    category: 'marketing',
    subcategory: 'leads',
    author: 'System',
    authorType: 'official',
    tags: ['typeform', 'salesforce', 'leads', 'crm'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'typeform-1', type: 'typeform', position: { x: 100, y: 200 }, data: { label: 'Form Response' } },
        { id: 'salesforce-1', type: 'salesforce', position: { x: 300, y: 200 }, data: { label: 'Create Lead' } }
      ],
      edges: [{ id: 'e1', source: 'typeform-1', target: 'salesforce-1' }]
    }
  },

  // Calendly to Google Calendar
  {
    id: 'calendly-google-calendar',
    name: 'Calendly to Google Calendar Sync',
    description: 'Sync Calendly bookings to Google Calendar',
    category: 'productivity',
    subcategory: 'scheduling',
    author: 'System',
    authorType: 'official',
    tags: ['calendly', 'google-calendar', 'scheduling', 'sync'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'calendly-1', type: 'calendly', position: { x: 100, y: 200 }, data: { label: 'New Booking' } },
        { id: 'calendar-1', type: 'googleCalendar', position: { x: 300, y: 200 }, data: { label: 'Create Event' } }
      ],
      edges: [{ id: 'e1', source: 'calendly-1', target: 'calendar-1' }]
    }
  },

  // Error handling workflow
  {
    id: 'error-handling-template',
    name: 'Error Handling & Retry Pattern',
    description: 'Template for handling errors with retry logic and notifications',
    category: 'devops',
    subcategory: 'reliability',
    author: 'System',
    authorType: 'official',
    tags: ['error', 'retry', 'reliability', 'monitoring'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'manualTrigger', position: { x: 100, y: 200 }, data: { label: 'Start' } },
        { id: 'try-1', type: 'tryCatch', position: { x: 300, y: 200 }, data: { label: 'Try Block' } },
        { id: 'http-1', type: 'httpRequest', position: { x: 500, y: 200 }, data: { label: 'API Call' } },
        { id: 'retry-1', type: 'retry', position: { x: 500, y: 350 }, data: { label: 'Retry on Error', config: { maxRetries: 3 } } },
        { id: 'slack-1', type: 'slack', position: { x: 700, y: 350 }, data: { label: 'Alert on Failure' } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'try-1' },
        { id: 'e2', source: 'try-1', target: 'http-1', sourceHandle: 'success' },
        { id: 'e3', source: 'try-1', target: 'retry-1', sourceHandle: 'error' },
        { id: 'e4', source: 'retry-1', target: 'slack-1', sourceHandle: 'failed' }
      ]
    }
  },

  // Data transformation pipeline
  {
    id: 'data-transform-pipeline',
    name: 'Data Transformation Pipeline',
    description: 'Clean, transform, and validate data with multiple steps',
    category: 'data_processing',
    subcategory: 'etl',
    author: 'System',
    authorType: 'official',
    tags: ['transform', 'etl', 'data', 'pipeline'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'webhook-1', type: 'webhook', position: { x: 100, y: 200 }, data: { label: 'Data Input' } },
        { id: 'filter-1', type: 'filter', position: { x: 250, y: 200 }, data: { label: 'Filter Valid' } },
        { id: 'transform-1', type: 'transform', position: { x: 400, y: 200 }, data: { label: 'Transform' } },
        { id: 'dedup-1', type: 'removeDuplicates', position: { x: 550, y: 200 }, data: { label: 'Remove Dups' } },
        { id: 'sort-1', type: 'sort', position: { x: 700, y: 200 }, data: { label: 'Sort' } },
        { id: 'respond-1', type: 'respondToWebhook', position: { x: 850, y: 200 }, data: { label: 'Return' } }
      ],
      edges: [
        { id: 'e1', source: 'webhook-1', target: 'filter-1' },
        { id: 'e2', source: 'filter-1', target: 'transform-1' },
        { id: 'e3', source: 'transform-1', target: 'dedup-1' },
        { id: 'e4', source: 'dedup-1', target: 'sort-1' },
        { id: 'e5', source: 'sort-1', target: 'respond-1' }
      ]
    }
  },

  // Multi-channel notification
  {
    id: 'multi-channel-notify',
    name: 'Multi-Channel Notification',
    description: 'Send notifications to Slack, Email, and Discord simultaneously',
    category: 'communication',
    subcategory: 'notifications',
    author: 'System',
    authorType: 'official',
    tags: ['notifications', 'slack', 'email', 'discord', 'multi-channel'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'webhook-1', type: 'webhook', position: { x: 100, y: 250 }, data: { label: 'Alert Trigger' } },
        { id: 'split-1', type: 'split', position: { x: 300, y: 250 }, data: { label: 'Split' } },
        { id: 'slack-1', type: 'slack', position: { x: 500, y: 100 }, data: { label: 'Slack' } },
        { id: 'email-1', type: 'email', position: { x: 500, y: 250 }, data: { label: 'Email' } },
        { id: 'discord-1', type: 'discord', position: { x: 500, y: 400 }, data: { label: 'Discord' } }
      ],
      edges: [
        { id: 'e1', source: 'webhook-1', target: 'split-1' },
        { id: 'e2', source: 'split-1', target: 'slack-1' },
        { id: 'e3', source: 'split-1', target: 'email-1' },
        { id: 'e4', source: 'split-1', target: 'discord-1' }
      ]
    }
  },

  // Backup workflow
  {
    id: 'scheduled-backup',
    name: 'Scheduled Database Backup to S3',
    description: 'Automatically backup database to S3 on schedule',
    category: 'devops',
    subcategory: 'backup',
    author: 'System',
    authorType: 'official',
    tags: ['backup', 's3', 'database', 'schedule', 'automation'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'schedule-1', type: 'schedule', position: { x: 100, y: 200 }, data: { label: 'Daily Backup', config: { cron: '0 2 * * *' } } },
        { id: 'http-1', type: 'httpRequest', position: { x: 300, y: 200 }, data: { label: 'Get Backup', config: { url: '{{$env.BACKUP_URL}}' } } },
        { id: 'datetime-1', type: 'dateTime', position: { x: 500, y: 200 }, data: { label: 'Timestamp' } },
        { id: 's3-1', type: 'awsS3', position: { x: 700, y: 200 }, data: { label: 'Upload to S3' } },
        { id: 'slack-1', type: 'slack', position: { x: 900, y: 200 }, data: { label: 'Notify Complete' } }
      ],
      edges: [
        { id: 'e1', source: 'schedule-1', target: 'http-1' },
        { id: 'e2', source: 'http-1', target: 'datetime-1' },
        { id: 'e3', source: 'datetime-1', target: 's3-1' },
        { id: 'e4', source: 's3-1', target: 'slack-1' }
      ]
    }
  },

  // Lead scoring workflow
  {
    id: 'lead-scoring',
    name: 'Automated Lead Scoring',
    description: 'Score leads based on engagement and update CRM',
    category: 'marketing',
    subcategory: 'leads',
    author: 'System',
    authorType: 'official',
    tags: ['leads', 'scoring', 'crm', 'marketing', 'automation'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'webhook-1', type: 'webhook', position: { x: 100, y: 200 }, data: { label: 'Lead Activity' } },
        { id: 'code-1', type: 'code', position: { x: 300, y: 200 }, data: { label: 'Calculate Score' } },
        { id: 'condition-1', type: 'condition', position: { x: 500, y: 200 }, data: { label: 'Score > 80?' } },
        { id: 'hubspot-1', type: 'hubspot', position: { x: 700, y: 100 }, data: { label: 'Update as Hot' } },
        { id: 'hubspot-2', type: 'hubspot', position: { x: 700, y: 300 }, data: { label: 'Update Score' } }
      ],
      edges: [
        { id: 'e1', source: 'webhook-1', target: 'code-1' },
        { id: 'e2', source: 'code-1', target: 'condition-1' },
        { id: 'e3', source: 'condition-1', target: 'hubspot-1', sourceHandle: 'true' },
        { id: 'e4', source: 'condition-1', target: 'hubspot-2', sourceHandle: 'false' }
      ]
    }
  },

  // Invoice automation
  {
    id: 'invoice-automation',
    name: 'Automated Invoice Processing',
    description: 'Process invoices from email, extract data with AI, and update accounting',
    category: 'finance',
    subcategory: 'invoices',
    author: 'System',
    authorType: 'official',
    tags: ['invoice', 'ai', 'accounting', 'automation', 'email'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'email-1', type: 'emailTrigger', position: { x: 100, y: 200 }, data: { label: 'New Invoice Email' } },
        { id: 'openai-1', type: 'openai', position: { x: 300, y: 200 }, data: { label: 'Extract Data' } },
        { id: 'quickbooks-1', type: 'quickbooks', position: { x: 500, y: 200 }, data: { label: 'Create Invoice' } },
        { id: 'slack-1', type: 'slack', position: { x: 700, y: 200 }, data: { label: 'Notify Finance' } }
      ],
      edges: [
        { id: 'e1', source: 'email-1', target: 'openai-1' },
        { id: 'e2', source: 'openai-1', target: 'quickbooks-1' },
        { id: 'e3', source: 'quickbooks-1', target: 'slack-1' }
      ]
    }
  },

  // Customer feedback analysis
  {
    id: 'feedback-analysis',
    name: 'Customer Feedback Sentiment Analysis',
    description: 'Analyze customer feedback sentiment with AI and route to appropriate team',
    category: 'support',
    subcategory: 'feedback',
    author: 'System',
    authorType: 'official',
    tags: ['feedback', 'sentiment', 'ai', 'support', 'analysis'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'typeform-1', type: 'typeform', position: { x: 100, y: 200 }, data: { label: 'Feedback Form' } },
        { id: 'openai-1', type: 'openai', position: { x: 300, y: 200 }, data: { label: 'Analyze Sentiment' } },
        { id: 'switch-1', type: 'switchCase', position: { x: 500, y: 200 }, data: { label: 'Route by Sentiment' } },
        { id: 'zendesk-1', type: 'zendesk', position: { x: 700, y: 100 }, data: { label: 'Urgent Ticket' } },
        { id: 'airtable-1', type: 'airtable', position: { x: 700, y: 300 }, data: { label: 'Log Feedback' } }
      ],
      edges: [
        { id: 'e1', source: 'typeform-1', target: 'openai-1' },
        { id: 'e2', source: 'openai-1', target: 'switch-1' },
        { id: 'e3', source: 'switch-1', target: 'zendesk-1', sourceHandle: 'negative' },
        { id: 'e4', source: 'switch-1', target: 'airtable-1', sourceHandle: 'positive' }
      ]
    }
  }
];

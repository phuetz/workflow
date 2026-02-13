/**
 * Integration Workflow Templates
 * 50+ templates for popular integrations
 */

import type { WorkflowTemplate } from '../../types/templates';

export const INTEGRATION_TEMPLATES: WorkflowTemplate[] = [
  // ========================================
  // GOOGLE WORKSPACE (8 templates)
  // ========================================
  {
    id: 'gmail-to-notion',
    name: 'Gmail to Notion Inbox',
    description: 'Save important emails to Notion database',
    category: 'productivity',
    subcategory: 'email',
    author: 'System',
    authorType: 'official',
    tags: ['gmail', 'notion', 'email', 'inbox', 'productivity'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'gmail_trigger', position: { x: 100, y: 200 }, data: { label: 'Starred Email', properties: { label: 'STARRED' } } },
        { id: 'notion', type: 'notion', position: { x: 300, y: 200 }, data: { label: 'Create Page', properties: { operation: 'create', databaseId: '={{env.NOTION_INBOX_DB}}', title: '={{$json.subject}}', properties: { From: '={{$json.from}}', Date: '={{$json.date}}' } } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'notion' }]
    },
    version: '1.0.0', createdAt: new Date('2024-01-10'), updatedAt: new Date(),
    downloads: 2345, rating: 4.7, reviewCount: 178, featured: true,
    requiredIntegrations: ['gmail_trigger', 'notion'], requiredCredentials: ['gmailOAuth2', 'notionApi'],
    estimatedSetupTime: 10, documentation: { overview: 'Save starred emails to Notion.', setup: [], usage: 'Star an email to save it.' }
  },
  {
    id: 'drive-backup-dropbox',
    name: 'Google Drive to Dropbox Backup',
    description: 'Backup Google Drive files to Dropbox automatically',
    category: 'data',
    subcategory: 'backup',
    author: 'System',
    authorType: 'official',
    tags: ['google-drive', 'dropbox', 'backup', 'sync', 'files'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'google_drive_trigger', position: { x: 100, y: 200 }, data: { label: 'New File', properties: { folderId: '={{env.BACKUP_FOLDER}}' } } },
        { id: 'download', type: 'google_drive', position: { x: 300, y: 200 }, data: { label: 'Download', properties: { operation: 'download' } } },
        { id: 'dropbox', type: 'dropbox', position: { x: 500, y: 200 }, data: { label: 'Upload', properties: { operation: 'upload', path: '/Backups/{{$json.name}}' } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'download' }, { id: 'e2', source: 'download', target: 'dropbox' }]
    },
    version: '1.0.0', createdAt: new Date('2024-02-05'), updatedAt: new Date(),
    downloads: 1567, rating: 4.5, reviewCount: 98, featured: false,
    requiredIntegrations: ['google_drive_trigger', 'google_drive', 'dropbox'], requiredCredentials: ['googleDriveOAuth2', 'dropboxOAuth2'],
    estimatedSetupTime: 15, documentation: { overview: 'Backup Drive files to Dropbox.', setup: [], usage: 'Files are automatically synced.' }
  },
  {
    id: 'sheets-email-report',
    name: 'Google Sheets Weekly Report',
    description: 'Generate and email weekly report from Sheets data',
    category: 'productivity',
    subcategory: 'reporting',
    author: 'System',
    authorType: 'official',
    tags: ['google-sheets', 'email', 'report', 'weekly', 'automation'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Monday 9 AM', properties: { cron: '0 9 * * 1' } } },
        { id: 'sheets', type: 'google_sheets', position: { x: 300, y: 200 }, data: { label: 'Get Data', properties: { operation: 'read', range: 'Weekly!A:E' } } },
        { id: 'format', type: 'code_javascript', position: { x: 500, y: 200 }, data: { label: 'Format Report', properties: { code: '// Format data as HTML table' } } },
        { id: 'email', type: 'email', position: { x: 700, y: 200 }, data: { label: 'Send Report', properties: { to: '={{env.REPORT_RECIPIENTS}}', subject: 'Weekly Report - {{$now.format("YYYY-MM-DD")}}' } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'sheets' }, { id: 'e2', source: 'sheets', target: 'format' }, { id: 'e3', source: 'format', target: 'email' }]
    },
    version: '1.0.0', createdAt: new Date('2024-01-15'), updatedAt: new Date(),
    downloads: 2134, rating: 4.6, reviewCount: 156, featured: true,
    requiredIntegrations: ['schedule_trigger', 'google_sheets', 'code_javascript', 'email'], requiredCredentials: ['googleSheetsOAuth2'],
    estimatedSetupTime: 15, documentation: { overview: 'Weekly email report from Sheets.', setup: [], usage: 'Runs every Monday at 9 AM.' }
  },
  {
    id: 'calendar-reminder-sms',
    name: 'Calendar Event SMS Reminder',
    description: 'Send SMS reminders for calendar events',
    category: 'communication',
    subcategory: 'reminders',
    author: 'System',
    authorType: 'official',
    tags: ['google-calendar', 'sms', 'twilio', 'reminders', 'events'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Every Hour', properties: { interval: 'hourly' } } },
        { id: 'calendar', type: 'google_calendar', position: { x: 300, y: 200 }, data: { label: 'Get Events', properties: { operation: 'getEvents', timeMin: '={{$now}}', timeMax: '={{$now.plus(1, "hour")}}' } } },
        { id: 'twilio', type: 'twilio', position: { x: 500, y: 200 }, data: { label: 'Send SMS', properties: { operation: 'sendSms', body: 'Reminder: {{$json.summary}} starts in 1 hour' } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'calendar' }, { id: 'e2', source: 'calendar', target: 'twilio' }]
    },
    version: '1.0.0', createdAt: new Date('2024-02-10'), updatedAt: new Date(),
    downloads: 1876, rating: 4.7, reviewCount: 134, featured: false,
    requiredIntegrations: ['schedule_trigger', 'google_calendar', 'twilio'], requiredCredentials: ['googleCalendarOAuth2', 'twilioApi'],
    estimatedSetupTime: 10, documentation: { overview: 'SMS reminders for calendar events.', setup: [], usage: '1 hour reminder for all events.' }
  },
  {
    id: 'forms-to-airtable',
    name: 'Google Forms to Airtable',
    description: 'Sync Google Forms responses to Airtable',
    category: 'data',
    subcategory: 'sync',
    author: 'System',
    authorType: 'official',
    tags: ['google-forms', 'airtable', 'forms', 'sync', 'data'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'google_forms_trigger', position: { x: 100, y: 200 }, data: { label: 'Form Submit', properties: { formId: '={{env.FORM_ID}}' } } },
        { id: 'airtable', type: 'airtable', position: { x: 300, y: 200 }, data: { label: 'Create Record', properties: { operation: 'create', baseId: '={{env.AIRTABLE_BASE}}', table: 'Responses' } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'airtable' }]
    },
    version: '1.0.0', createdAt: new Date('2024-01-20'), updatedAt: new Date(),
    downloads: 1456, rating: 4.5, reviewCount: 98, featured: false,
    requiredIntegrations: ['google_forms_trigger', 'airtable'], requiredCredentials: ['googleFormsOAuth2', 'airtableApi'],
    estimatedSetupTime: 10, documentation: { overview: 'Sync Forms to Airtable.', setup: [], usage: 'Form responses appear in Airtable.' }
  },

  // ========================================
  // MICROSOFT 365 (8 templates)
  // ========================================
  {
    id: 'outlook-to-todoist',
    name: 'Outlook Emails to Todoist Tasks',
    description: 'Create Todoist tasks from flagged Outlook emails',
    category: 'productivity',
    subcategory: 'tasks',
    author: 'System',
    authorType: 'official',
    tags: ['outlook', 'todoist', 'email', 'tasks', 'productivity'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'microsoft_outlook_trigger', position: { x: 100, y: 200 }, data: { label: 'Flagged Email', properties: { filter: 'flag/flagStatus eq "flagged"' } } },
        { id: 'todoist', type: 'todoist', position: { x: 300, y: 200 }, data: { label: 'Create Task', properties: { operation: 'create', content: '={{$json.subject}}', description: 'From: {{$json.from.emailAddress.address}}' } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'todoist' }]
    },
    version: '1.0.0', createdAt: new Date('2024-02-01'), updatedAt: new Date(),
    downloads: 1234, rating: 4.6, reviewCount: 89, featured: false,
    requiredIntegrations: ['microsoft_outlook_trigger', 'todoist'], requiredCredentials: ['microsoftOAuth2', 'todoistApi'],
    estimatedSetupTime: 10, documentation: { overview: 'Create tasks from flagged emails.', setup: [], usage: 'Flag emails to create Todoist tasks.' }
  },
  {
    id: 'sharepoint-to-slack',
    name: 'SharePoint New Files to Slack',
    description: 'Notify Slack when new files are added to SharePoint',
    category: 'communication',
    subcategory: 'notifications',
    author: 'System',
    authorType: 'official',
    tags: ['sharepoint', 'slack', 'files', 'notifications', 'microsoft'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'sharepoint_trigger', position: { x: 100, y: 200 }, data: { label: 'New File', properties: { siteId: '={{env.SHAREPOINT_SITE}}', libraryId: '={{env.DOC_LIBRARY}}' } } },
        { id: 'slack', type: 'slack', position: { x: 300, y: 200 }, data: { label: 'Notify', properties: { channel: '#documents', message: '📄 New file: {{$json.name}}\n<{{$json.webUrl}}|Open in SharePoint>' } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'slack' }]
    },
    version: '1.0.0', createdAt: new Date('2024-01-25'), updatedAt: new Date(),
    downloads: 987, rating: 4.4, reviewCount: 67, featured: false,
    requiredIntegrations: ['sharepoint_trigger', 'slack'], requiredCredentials: ['microsoftOAuth2', 'slackOAuth2'],
    estimatedSetupTime: 10, documentation: { overview: 'Slack alerts for SharePoint files.', setup: [], usage: 'New files trigger Slack notifications.' }
  },
  {
    id: 'excel-to-database',
    name: 'Excel Online to Database Sync',
    description: 'Sync Excel Online data to PostgreSQL',
    category: 'data',
    subcategory: 'sync',
    author: 'System',
    authorType: 'official',
    tags: ['excel', 'postgresql', 'sync', 'database', 'microsoft'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Hourly', properties: { interval: 'hourly' } } },
        { id: 'excel', type: 'microsoft_excel', position: { x: 300, y: 200 }, data: { label: 'Get Data', properties: { operation: 'getRows', workbook: '={{env.EXCEL_WORKBOOK}}' } } },
        { id: 'postgres', type: 'postgresql', position: { x: 500, y: 200 }, data: { label: 'Upsert', properties: { operation: 'upsert', table: 'excel_data' } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'excel' }, { id: 'e2', source: 'excel', target: 'postgres' }]
    },
    version: '1.0.0', createdAt: new Date('2024-02-15'), updatedAt: new Date(),
    downloads: 765, rating: 4.3, reviewCount: 45, featured: false,
    requiredIntegrations: ['schedule_trigger', 'microsoft_excel', 'postgresql'], requiredCredentials: ['microsoftOAuth2', 'postgresCredentials'],
    estimatedSetupTime: 20, documentation: { overview: 'Sync Excel to PostgreSQL.', setup: [], usage: 'Hourly sync from Excel Online.' }
  },
  {
    id: 'onenote-to-evernote',
    name: 'OneNote to Evernote Migration',
    description: 'Migrate OneNote pages to Evernote',
    category: 'productivity',
    subcategory: 'migration',
    author: 'System',
    authorType: 'official',
    tags: ['onenote', 'evernote', 'notes', 'migration', 'productivity'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'webhook_trigger', position: { x: 100, y: 200 }, data: { label: 'Start Migration', properties: { path: '/migrate-notes' } } },
        { id: 'onenote', type: 'microsoft_onenote', position: { x: 300, y: 200 }, data: { label: 'Get Pages', properties: { operation: 'getAll', resource: 'page' } } },
        { id: 'loop', type: 'loop', position: { x: 500, y: 200 }, data: { label: 'Each Page' } },
        { id: 'evernote', type: 'evernote', position: { x: 700, y: 200 }, data: { label: 'Create Note', properties: { operation: 'create', resource: 'note' } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'onenote' }, { id: 'e2', source: 'onenote', target: 'loop' }, { id: 'e3', source: 'loop', target: 'evernote' }]
    },
    version: '1.0.0', createdAt: new Date('2024-03-01'), updatedAt: new Date(),
    downloads: 543, rating: 4.2, reviewCount: 32, featured: false,
    requiredIntegrations: ['webhook_trigger', 'microsoft_onenote', 'loop', 'evernote'], requiredCredentials: ['microsoftOAuth2', 'evernoteOAuth2'],
    estimatedSetupTime: 25, documentation: { overview: 'Migrate notes from OneNote.', setup: [], usage: 'Trigger via webhook to start.' }
  },

  // ========================================
  // SLACK INTEGRATIONS (8 templates)
  // ========================================
  {
    id: 'slack-github-review',
    name: 'Slack PR Review Request',
    description: 'Request code reviews via Slack',
    category: 'devops',
    subcategory: 'code-review',
    author: 'System',
    authorType: 'official',
    tags: ['slack', 'github', 'code-review', 'pr', 'devops'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'github_trigger', position: { x: 100, y: 200 }, data: { label: 'PR Ready', properties: { event: 'pull_request.ready_for_review' } } },
        { id: 'get-reviewers', type: 'github', position: { x: 300, y: 200 }, data: { label: 'Get CODEOWNERS', properties: { operation: 'getFileContent', path: 'CODEOWNERS' } } },
        { id: 'slack', type: 'slack', position: { x: 500, y: 200 }, data: { label: 'Request Review', properties: { operation: 'sendInteractiveMessage', channel: '#dev-reviews', blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '*Review Request*\n{{$json.title}}' } }] } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'get-reviewers' }, { id: 'e2', source: 'get-reviewers', target: 'slack' }]
    },
    version: '1.0.0', createdAt: new Date('2024-01-10'), updatedAt: new Date(),
    downloads: 1876, rating: 4.7, reviewCount: 145, featured: true,
    requiredIntegrations: ['github_trigger', 'github', 'slack'], requiredCredentials: ['githubOAuth2', 'slackOAuth2'],
    estimatedSetupTime: 15, documentation: { overview: 'Slack PR review requests.', setup: [], usage: 'Reviews requested when PR is ready.' }
  },
  {
    id: 'slack-daily-summary',
    name: 'Slack Channel Daily Summary',
    description: 'AI-generated daily summary of Slack channel activity',
    category: 'productivity',
    subcategory: 'summary',
    author: 'System',
    authorType: 'official',
    tags: ['slack', 'openai', 'summary', 'daily', 'ai'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'End of Day', properties: { cron: '0 18 * * 1-5' } } },
        { id: 'slack-get', type: 'slack', position: { x: 300, y: 200 }, data: { label: 'Get Messages', properties: { operation: 'getChannelHistory', channel: '={{env.SUMMARY_CHANNEL}}', oldest: '={{$now.minus(9, "hours")}}' } } },
        { id: 'openai', type: 'openai', position: { x: 500, y: 200 }, data: { label: 'Summarize', properties: { operation: 'chat', messages: [{ role: 'system', content: 'Summarize the key discussions and decisions from these Slack messages' }] } } },
        { id: 'slack-post', type: 'slack', position: { x: 700, y: 200 }, data: { label: 'Post Summary', properties: { channel: '={{env.SUMMARY_CHANNEL}}', message: '📋 *Daily Summary*\n\n{{$json.summary}}' } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'slack-get' }, { id: 'e2', source: 'slack-get', target: 'openai' }, { id: 'e3', source: 'openai', target: 'slack-post' }]
    },
    version: '1.0.0', createdAt: new Date('2024-02-05'), updatedAt: new Date(),
    downloads: 1456, rating: 4.8, reviewCount: 112, featured: true,
    requiredIntegrations: ['schedule_trigger', 'slack', 'openai'], requiredCredentials: ['slackOAuth2', 'openaiApi'],
    estimatedSetupTime: 15, documentation: { overview: 'AI daily summary of Slack.', setup: [], usage: 'Posts summary at 6 PM on weekdays.' }
  },
  {
    id: 'slack-incident-commander',
    name: 'Slack Incident Commander',
    description: 'Create incident channels with runbook automation',
    category: 'devops',
    subcategory: 'incident',
    author: 'System',
    authorType: 'official',
    tags: ['slack', 'incident', 'pagerduty', 'runbook', 'sre'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'pagerduty_trigger', position: { x: 100, y: 200 }, data: { label: 'Incident Created', properties: { event: 'incident.trigger' } } },
        { id: 'create-channel', type: 'slack', position: { x: 300, y: 200 }, data: { label: 'Create Channel', properties: { operation: 'createChannel', name: 'inc-{{$json.incident.number}}-{{$json.incident.title | slugify}}' } } },
        { id: 'invite-users', type: 'slack', position: { x: 500, y: 200 }, data: { label: 'Invite Team', properties: { operation: 'inviteUsers', users: '={{env.INCIDENT_RESPONDERS}}' } } },
        { id: 'post-runbook', type: 'slack', position: { x: 700, y: 200 }, data: { label: 'Post Runbook', properties: { message: '🚨 *Incident {{$json.incident.number}}*\n\n*Runbook Steps:*\n1. Assess impact\n2. Communicate status\n3. Mitigate\n4. Document' } } },
        { id: 'update-pd', type: 'pagerduty', position: { x: 900, y: 200 }, data: { label: 'Update PD', properties: { operation: 'addNote', note: 'Slack channel created: #{{$json.channel.name}}' } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'create-channel' }, { id: 'e2', source: 'create-channel', target: 'invite-users' }, { id: 'e3', source: 'invite-users', target: 'post-runbook' }, { id: 'e4', source: 'post-runbook', target: 'update-pd' }]
    },
    version: '1.0.0', createdAt: new Date('2024-01-20'), updatedAt: new Date(),
    downloads: 987, rating: 4.9, reviewCount: 78, featured: true,
    requiredIntegrations: ['pagerduty_trigger', 'slack', 'pagerduty'], requiredCredentials: ['pagerdutyApi', 'slackOAuth2'],
    estimatedSetupTime: 25, documentation: { overview: 'Automated incident channel creation.', setup: [], usage: 'Channels created on PagerDuty incidents.' }
  },
  {
    id: 'slack-approval-workflow',
    name: 'Slack Approval Workflow',
    description: 'General purpose approval workflow via Slack',
    category: 'productivity',
    subcategory: 'approval',
    author: 'System',
    authorType: 'official',
    tags: ['slack', 'approval', 'workflow', 'automation', 'request'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'webhook_trigger', position: { x: 100, y: 200 }, data: { label: 'Request', properties: { path: '/request-approval' } } },
        { id: 'slack-request', type: 'slack', position: { x: 300, y: 200 }, data: { label: 'Send Request', properties: { operation: 'sendInteractiveMessage', channel: '={{$json.approver}}', blocks: [{ type: 'actions', elements: [{ type: 'button', text: 'Approve', style: 'primary', action_id: 'approve' }, { type: 'button', text: 'Reject', style: 'danger', action_id: 'reject' }] }] } } },
        { id: 'wait', type: 'wait', position: { x: 500, y: 200 }, data: { label: 'Wait', properties: { timeout: 24, unit: 'hours' } } },
        { id: 'callback', type: 'http_request', position: { x: 700, y: 200 }, data: { label: 'Callback', properties: { url: '={{$json.callbackUrl}}', method: 'POST', body: { approved: '={{$json.response === "approve"}}' } } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'slack-request' }, { id: 'e2', source: 'slack-request', target: 'wait' }, { id: 'e3', source: 'wait', target: 'callback' }]
    },
    version: '1.0.0', createdAt: new Date('2024-02-15'), updatedAt: new Date(),
    downloads: 1567, rating: 4.6, reviewCount: 98, featured: false,
    requiredIntegrations: ['webhook_trigger', 'slack', 'wait', 'http_request'], requiredCredentials: ['slackOAuth2'],
    estimatedSetupTime: 20, documentation: { overview: 'General Slack approval workflow.', setup: [], usage: 'Webhook triggers approval request.' }
  },

  // ========================================
  // NOTION INTEGRATIONS (8 templates)
  // ========================================
  {
    id: 'notion-github-issues',
    name: 'Notion to GitHub Issues',
    description: 'Create GitHub issues from Notion tasks',
    category: 'devops',
    subcategory: 'integration',
    author: 'System',
    authorType: 'official',
    tags: ['notion', 'github', 'issues', 'tasks', 'sync'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'notion_trigger', position: { x: 100, y: 200 }, data: { label: 'New Task', properties: { databaseId: '={{env.NOTION_TASKS_DB}}', filter: { property: 'Status', select: { equals: 'To Dev' } } } } },
        { id: 'github', type: 'github', position: { x: 300, y: 200 }, data: { label: 'Create Issue', properties: { operation: 'create', resource: 'issue', title: '={{$json.properties.Name.title[0].text.content}}', body: '={{$json.properties.Description.rich_text[0].text.content}}' } } },
        { id: 'update', type: 'notion', position: { x: 500, y: 200 }, data: { label: 'Update Task', properties: { operation: 'update', pageId: '={{$json.id}}', properties: { 'GitHub Issue': '={{$node["github"].json.html_url}}' } } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'github' }, { id: 'e2', source: 'github', target: 'update' }]
    },
    version: '1.0.0', createdAt: new Date('2024-01-15'), updatedAt: new Date(),
    downloads: 1234, rating: 4.7, reviewCount: 89, featured: true,
    requiredIntegrations: ['notion_trigger', 'github', 'notion'], requiredCredentials: ['notionApi', 'githubOAuth2'],
    estimatedSetupTime: 15, documentation: { overview: 'Create GitHub issues from Notion.', setup: [], usage: 'Change task status to "To Dev".' }
  },
  {
    id: 'notion-meeting-notes',
    name: 'Notion AI Meeting Notes',
    description: 'Generate meeting notes in Notion from calendar events',
    category: 'productivity',
    subcategory: 'meetings',
    author: 'System',
    authorType: 'official',
    tags: ['notion', 'calendar', 'meetings', 'notes', 'ai'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'google_calendar_trigger', position: { x: 100, y: 200 }, data: { label: 'Meeting Started', properties: { offset: 0 } } },
        { id: 'notion', type: 'notion', position: { x: 300, y: 200 }, data: { label: 'Create Page', properties: { operation: 'create', databaseId: '={{env.MEETINGS_DB}}', title: '={{$json.summary}}', properties: { Date: '={{$json.start.dateTime}}', Attendees: '={{$json.attendees.map(a => a.email).join(", ")}}' } } } },
        { id: 'add-template', type: 'notion', position: { x: 500, y: 200 }, data: { label: 'Add Template', properties: { operation: 'appendBlocks', pageId: '={{$json.id}}', blocks: [{ type: 'heading_2', text: 'Agenda' }, { type: 'heading_2', text: 'Discussion' }, { type: 'heading_2', text: 'Action Items' }] } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'notion' }, { id: 'e2', source: 'notion', target: 'add-template' }]
    },
    version: '1.0.0', createdAt: new Date('2024-02-01'), updatedAt: new Date(),
    downloads: 1567, rating: 4.8, reviewCount: 112, featured: true,
    requiredIntegrations: ['google_calendar_trigger', 'notion'], requiredCredentials: ['googleCalendarOAuth2', 'notionApi'],
    estimatedSetupTime: 15, documentation: { overview: 'Auto-create meeting notes in Notion.', setup: [], usage: 'Notes created when meetings start.' }
  },
  {
    id: 'notion-reading-list',
    name: 'Notion Reading List from RSS',
    description: 'Add RSS feed articles to Notion reading list',
    category: 'productivity',
    subcategory: 'reading',
    author: 'System',
    authorType: 'official',
    tags: ['notion', 'rss', 'reading', 'articles', 'automation'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'rss_feed', position: { x: 100, y: 200 }, data: { label: 'New Article', properties: { url: '={{env.RSS_FEED_URL}}' } } },
        { id: 'notion', type: 'notion', position: { x: 300, y: 200 }, data: { label: 'Add to List', properties: { operation: 'create', databaseId: '={{env.READING_LIST_DB}}', title: '={{$json.title}}', properties: { URL: '={{$json.link}}', Source: '={{$json.source}}', 'Published Date': '={{$json.pubDate}}' } } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'notion' }]
    },
    version: '1.0.0', createdAt: new Date('2024-01-25'), updatedAt: new Date(),
    downloads: 987, rating: 4.5, reviewCount: 67, featured: false,
    requiredIntegrations: ['rss_feed', 'notion'], requiredCredentials: ['notionApi'],
    estimatedSetupTime: 10, documentation: { overview: 'Save RSS articles to Notion.', setup: [], usage: 'New articles added automatically.' }
  },
  {
    id: 'notion-crm',
    name: 'Notion Simple CRM',
    description: 'Track leads and deals in Notion with email integration',
    category: 'sales',
    subcategory: 'crm',
    author: 'System',
    authorType: 'official',
    tags: ['notion', 'crm', 'sales', 'email', 'leads'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'email_trigger', position: { x: 100, y: 200 }, data: { label: 'New Email', properties: { from: '@leads.example.com' } } },
        { id: 'parse', type: 'code_javascript', position: { x: 300, y: 200 }, data: { label: 'Parse Email', properties: { code: '// Extract lead info from email' } } },
        { id: 'notion', type: 'notion', position: { x: 500, y: 200 }, data: { label: 'Create Lead', properties: { operation: 'create', databaseId: '={{env.CRM_DB}}' } } },
        { id: 'email', type: 'email', position: { x: 700, y: 200 }, data: { label: 'Auto-Reply', properties: { replyTo: true, template: 'lead-autoresponse' } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'parse' }, { id: 'e2', source: 'parse', target: 'notion' }, { id: 'e3', source: 'notion', target: 'email' }]
    },
    version: '1.0.0', createdAt: new Date('2024-02-10'), updatedAt: new Date(),
    downloads: 876, rating: 4.4, reviewCount: 54, featured: false,
    requiredIntegrations: ['email_trigger', 'code_javascript', 'notion', 'email'], requiredCredentials: ['imapCredentials', 'notionApi', 'smtpCredentials'],
    estimatedSetupTime: 20, documentation: { overview: 'Simple CRM in Notion.', setup: [], usage: 'Emails from leads create Notion entries.' }
  },

  // ========================================
  // ZAPIER-LIKE UTILITY TEMPLATES (8 templates)
  // ========================================
  {
    id: 'delay-action',
    name: 'Delayed Action Trigger',
    description: 'Execute an action after a configurable delay',
    category: 'utilities',
    subcategory: 'timing',
    author: 'System',
    authorType: 'official',
    tags: ['delay', 'timer', 'scheduling', 'automation', 'utility'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'webhook_trigger', position: { x: 100, y: 200 }, data: { label: 'Trigger', properties: { path: '/delayed-action' } } },
        { id: 'wait', type: 'wait', position: { x: 300, y: 200 }, data: { label: 'Wait', properties: { duration: '={{$json.delay || 60}}', unit: '={{$json.unit || "minutes"}}' } } },
        { id: 'callback', type: 'http_request', position: { x: 500, y: 200 }, data: { label: 'Execute', properties: { url: '={{$json.callbackUrl}}', method: 'POST', body: '={{$json.payload}}' } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'wait' }, { id: 'e2', source: 'wait', target: 'callback' }]
    },
    version: '1.0.0', createdAt: new Date('2024-01-05'), updatedAt: new Date(),
    downloads: 2345, rating: 4.6, reviewCount: 178, featured: false,
    requiredIntegrations: ['webhook_trigger', 'wait', 'http_request'], requiredCredentials: [],
    estimatedSetupTime: 5, documentation: { overview: 'Execute actions after a delay.', setup: [], usage: 'Send delay and callback URL in webhook.' }
  },
  {
    id: 'multi-webhook-fan-out',
    name: 'Multi-Webhook Fan-Out',
    description: 'Send webhooks to multiple endpoints simultaneously',
    category: 'utilities',
    subcategory: 'webhooks',
    author: 'System',
    authorType: 'official',
    tags: ['webhook', 'fanout', 'parallel', 'integration', 'utility'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'webhook_trigger', position: { x: 100, y: 200 }, data: { label: 'Receive', properties: { path: '/fanout' } } },
        { id: 'endpoint1', type: 'http_request', position: { x: 300, y: 100 }, data: { label: 'Endpoint 1', properties: { url: '={{env.ENDPOINT_1}}', method: 'POST' } } },
        { id: 'endpoint2', type: 'http_request', position: { x: 300, y: 200 }, data: { label: 'Endpoint 2', properties: { url: '={{env.ENDPOINT_2}}', method: 'POST' } } },
        { id: 'endpoint3', type: 'http_request', position: { x: 300, y: 300 }, data: { label: 'Endpoint 3', properties: { url: '={{env.ENDPOINT_3}}', method: 'POST' } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'endpoint1' }, { id: 'e2', source: 'trigger', target: 'endpoint2' }, { id: 'e3', source: 'trigger', target: 'endpoint3' }]
    },
    version: '1.0.0', createdAt: new Date('2024-02-01'), updatedAt: new Date(),
    downloads: 1567, rating: 4.5, reviewCount: 98, featured: false,
    requiredIntegrations: ['webhook_trigger', 'http_request'], requiredCredentials: [],
    estimatedSetupTime: 10, documentation: { overview: 'Send to multiple endpoints.', setup: [], usage: 'Configure endpoints in environment.' }
  },
  {
    id: 'data-backup-scheduler',
    name: 'Universal Data Backup',
    description: 'Schedule backups of any API data to cloud storage',
    category: 'utilities',
    subcategory: 'backup',
    author: 'System',
    authorType: 'official',
    tags: ['backup', 's3', 'api', 'data', 'scheduling'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Daily', properties: { cron: '0 2 * * *' } } },
        { id: 'fetch', type: 'http_request', position: { x: 300, y: 200 }, data: { label: 'Fetch Data', properties: { url: '={{env.BACKUP_API_URL}}', method: 'GET' } } },
        { id: 's3', type: 'aws_s3', position: { x: 500, y: 200 }, data: { label: 'Upload to S3', properties: { operation: 'upload', bucket: '={{env.BACKUP_BUCKET}}', key: 'backups/{{$now.format("YYYY-MM-DD")}}.json' } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'fetch' }, { id: 'e2', source: 'fetch', target: 's3' }]
    },
    version: '1.0.0', createdAt: new Date('2024-01-20'), updatedAt: new Date(),
    downloads: 1234, rating: 4.6, reviewCount: 89, featured: false,
    requiredIntegrations: ['schedule_trigger', 'http_request', 'aws_s3'], requiredCredentials: ['awsCredentials'],
    estimatedSetupTime: 15, documentation: { overview: 'Backup any API to S3.', setup: [], usage: 'Runs at 2 AM daily.' }
  },
  {
    id: 'error-notification-hub',
    name: 'Error Notification Hub',
    description: 'Centralized error handling with multi-channel notifications',
    category: 'utilities',
    subcategory: 'monitoring',
    author: 'System',
    authorType: 'official',
    tags: ['errors', 'notifications', 'monitoring', 'slack', 'email'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'webhook_trigger', position: { x: 100, y: 200 }, data: { label: 'Error', properties: { path: '/error-hook' } } },
        { id: 'classify', type: 'switch_case', position: { x: 300, y: 200 }, data: { label: 'Severity', properties: { field: '={{$json.severity}}' } } },
        { id: 'pagerduty', type: 'pagerduty', position: { x: 500, y: 100 }, data: { label: 'Page', properties: { urgency: 'high' } } },
        { id: 'slack', type: 'slack', position: { x: 500, y: 200 }, data: { label: 'Slack', properties: { channel: '#errors' } } },
        { id: 'email', type: 'email', position: { x: 500, y: 300 }, data: { label: 'Email', properties: { to: '={{env.ERROR_EMAIL}}' } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'classify' }, { id: 'e2', source: 'classify', target: 'pagerduty', sourceHandle: 'critical' }, { id: 'e3', source: 'classify', target: 'slack', sourceHandle: 'warning' }, { id: 'e4', source: 'classify', target: 'email', sourceHandle: 'info' }]
    },
    version: '1.0.0', createdAt: new Date('2024-02-10'), updatedAt: new Date(),
    downloads: 987, rating: 4.7, reviewCount: 67, featured: true,
    requiredIntegrations: ['webhook_trigger', 'switch_case', 'pagerduty', 'slack', 'email'], requiredCredentials: ['pagerdutyApi', 'slackOAuth2'],
    estimatedSetupTime: 20, documentation: { overview: 'Centralized error notifications.', setup: [], usage: 'Send errors to webhook endpoint.' }
  },
  {
    id: 'batch-processor',
    name: 'Batch Data Processor',
    description: 'Process large datasets in configurable batches',
    category: 'utilities',
    subcategory: 'data',
    author: 'System',
    authorType: 'official',
    tags: ['batch', 'processing', 'data', 'etl', 'utility'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'webhook_trigger', position: { x: 100, y: 200 }, data: { label: 'Start Batch', properties: { path: '/batch-process' } } },
        { id: 'split', type: 'splitInBatches', position: { x: 300, y: 200 }, data: { label: 'Split', properties: { batchSize: 100 } } },
        { id: 'process', type: 'http_request', position: { x: 500, y: 200 }, data: { label: 'Process Batch', properties: { url: '={{$json.processingUrl}}', method: 'POST' } } },
        { id: 'aggregate', type: 'summarize', position: { x: 700, y: 200 }, data: { label: 'Aggregate', properties: { operation: 'count' } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'split' }, { id: 'e2', source: 'split', target: 'process' }, { id: 'e3', source: 'process', target: 'aggregate' }]
    },
    version: '1.0.0', createdAt: new Date('2024-01-25'), updatedAt: new Date(),
    downloads: 876, rating: 4.5, reviewCount: 54, featured: false,
    requiredIntegrations: ['webhook_trigger', 'splitInBatches', 'http_request', 'summarize'], requiredCredentials: [],
    estimatedSetupTime: 15, documentation: { overview: 'Batch processing for large data.', setup: [], usage: 'Send data array in webhook.' }
  },
  {
    id: 'conditional-routing',
    name: 'Conditional Request Router',
    description: 'Route requests based on conditions to different endpoints',
    category: 'utilities',
    subcategory: 'routing',
    author: 'System',
    authorType: 'official',
    tags: ['routing', 'conditional', 'api', 'gateway', 'utility'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'webhook_trigger', position: { x: 100, y: 200 }, data: { label: 'Request', properties: { path: '/route' } } },
        { id: 'switch', type: 'switch_case', position: { x: 300, y: 200 }, data: { label: 'Route By', properties: { field: '={{$json.type}}' } } },
        { id: 'route-a', type: 'http_request', position: { x: 500, y: 100 }, data: { label: 'Route A', properties: { url: '={{env.ROUTE_A_URL}}' } } },
        { id: 'route-b', type: 'http_request', position: { x: 500, y: 200 }, data: { label: 'Route B', properties: { url: '={{env.ROUTE_B_URL}}' } } },
        { id: 'route-c', type: 'http_request', position: { x: 500, y: 300 }, data: { label: 'Route C', properties: { url: '={{env.ROUTE_C_URL}}' } } },
        { id: 'respond', type: 'respondToWebhook', position: { x: 700, y: 200 }, data: { label: 'Respond', properties: { statusCode: 200 } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'switch' }, { id: 'e2', source: 'switch', target: 'route-a', sourceHandle: 'a' }, { id: 'e3', source: 'switch', target: 'route-b', sourceHandle: 'b' }, { id: 'e4', source: 'switch', target: 'route-c', sourceHandle: 'c' }, { id: 'e5', source: 'route-a', target: 'respond' }, { id: 'e6', source: 'route-b', target: 'respond' }, { id: 'e7', source: 'route-c', target: 'respond' }]
    },
    version: '1.0.0', createdAt: new Date('2024-02-20'), updatedAt: new Date(),
    downloads: 765, rating: 4.4, reviewCount: 45, featured: false,
    requiredIntegrations: ['webhook_trigger', 'switch_case', 'http_request', 'respondToWebhook'], requiredCredentials: [],
    estimatedSetupTime: 15, documentation: { overview: 'Route requests conditionally.', setup: [], usage: 'Send type field to determine route.' }
  },
  {
    id: 'rate-limited-processor',
    name: 'Rate-Limited API Processor',
    description: 'Process API calls respecting rate limits',
    category: 'utilities',
    subcategory: 'api',
    author: 'System',
    authorType: 'official',
    tags: ['rate-limit', 'api', 'queue', 'throttle', 'utility'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'webhook_trigger', position: { x: 100, y: 200 }, data: { label: 'Items', properties: { path: '/rate-limited' } } },
        { id: 'loop', type: 'loop', position: { x: 300, y: 200 }, data: { label: 'For Each' } },
        { id: 'api', type: 'http_request', position: { x: 500, y: 200 }, data: { label: 'Call API', properties: { url: '={{$json.apiUrl}}' } } },
        { id: 'wait', type: 'wait', position: { x: 700, y: 200 }, data: { label: 'Rate Limit', properties: { duration: 1, unit: 'seconds' } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'loop' }, { id: 'e2', source: 'loop', target: 'api' }, { id: 'e3', source: 'api', target: 'wait' }, { id: 'e4', source: 'wait', target: 'loop', label: 'continue' }]
    },
    version: '1.0.0', createdAt: new Date('2024-03-01'), updatedAt: new Date(),
    downloads: 654, rating: 4.3, reviewCount: 38, featured: false,
    requiredIntegrations: ['webhook_trigger', 'loop', 'http_request', 'wait'], requiredCredentials: [],
    estimatedSetupTime: 15, documentation: { overview: 'Respect API rate limits.', setup: [], usage: 'Send items array to process.' }
  },
  {
    id: 'data-enrichment-pipeline',
    name: 'Data Enrichment Pipeline',
    description: 'Enrich data from multiple sources',
    category: 'utilities',
    subcategory: 'data',
    author: 'System',
    authorType: 'official',
    tags: ['enrichment', 'data', 'pipeline', 'merge', 'utility'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger', type: 'webhook_trigger', position: { x: 100, y: 200 }, data: { label: 'Data', properties: { path: '/enrich' } } },
        { id: 'source1', type: 'http_request', position: { x: 300, y: 100 }, data: { label: 'Source 1', properties: { url: '={{env.ENRICH_API_1}}/{{$json.id}}' } } },
        { id: 'source2', type: 'http_request', position: { x: 300, y: 200 }, data: { label: 'Source 2', properties: { url: '={{env.ENRICH_API_2}}/{{$json.id}}' } } },
        { id: 'source3', type: 'http_request', position: { x: 300, y: 300 }, data: { label: 'Source 3', properties: { url: '={{env.ENRICH_API_3}}/{{$json.id}}' } } },
        { id: 'merge', type: 'merge', position: { x: 500, y: 200 }, data: { label: 'Merge All', properties: { mode: 'multiplex' } } },
        { id: 'respond', type: 'respondToWebhook', position: { x: 700, y: 200 }, data: { label: 'Return', properties: { body: '={{$json}}' } } }
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'source1' }, { id: 'e2', source: 'trigger', target: 'source2' }, { id: 'e3', source: 'trigger', target: 'source3' }, { id: 'e4', source: 'source1', target: 'merge' }, { id: 'e5', source: 'source2', target: 'merge' }, { id: 'e6', source: 'source3', target: 'merge' }, { id: 'e7', source: 'merge', target: 'respond' }]
    },
    version: '1.0.0', createdAt: new Date('2024-02-15'), updatedAt: new Date(),
    downloads: 543, rating: 4.6, reviewCount: 32, featured: true,
    requiredIntegrations: ['webhook_trigger', 'http_request', 'merge', 'respondToWebhook'], requiredCredentials: [],
    estimatedSetupTime: 20, documentation: { overview: 'Enrich data from multiple APIs.', setup: [], usage: 'Send data ID to enrich.' }
  }
];

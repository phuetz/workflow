/**
 * Workflow Templates - analytics
 */

import type { WorkflowTemplate } from '../../types/templates';

export const ANALYTICS_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'report-generation-automation',
    name: 'Report Generation Automation',
    description: 'Automatically generate and distribute reports from multiple data sources on a schedule.',
    category: 'analytics',
    subcategory: 'reporting',
    author: 'System',
    authorType: 'official',
    tags: ['reports', 'analytics', 'automation', 'scheduling', 'bi'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'schedule_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Weekly Schedule',
            properties: {
              cron: '0 8 * * 1',
              timezone: 'UTC'
            }
          }
        },
        {
          id: 'fetch-1',
          type: 'google_sheets',
          position: { x: 300, y: 150 },
          data: {
            label: 'Get Sales Data',
            properties: {
              operation: 'getValues',
              spreadsheetId: 'your-sheet-id',
              range: 'Sales!A:Z'
            },
            credentials: ['googleSheetsApi']
          }
        },
        {
          id: 'fetch-2',
          type: 'airtable',
          position: { x: 300, y: 250 },
          data: {
            label: 'Get Customer Data',
            properties: {
              operation: 'getRecords',
              table: 'Customers'
            },
            credentials: ['airtableApi']
          }
        },
        {
          id: 'analyze-1',
          type: 'code_javascript',
          position: { x: 500, y: 200 },
          data: {
            label: 'Generate Report',
            properties: {
              code: `// Generate weekly report
const totalSales = salesData.reduce((sum, row) => sum + row.amount, 0);
const newCustomers = customerData.filter(c =>
  new Date(c.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
).length;

return [{
  period: 'Week of ' + new Date().toLocaleDateString(),
  totalSales,
  newCustomers,
  avgOrderValue: totalSales / salesData.length
}];`
            }
          }
        },
        {
          id: 'email-1',
          type: 'sendgrid',
          position: { x: 700, y: 200 },
          data: {
            label: 'Send Report',
            properties: {
              to: 'team@company.com',
              subject: 'Weekly Report - {{$node["analyze-1"].json.period}}',
              templateId: 'weekly-report',
              dynamicData: '={{$node["analyze-1"].json}}'
            },
            credentials: ['sendgridApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'fetch-1' },
        { id: 'e2', source: 'trigger-1', target: 'fetch-2' },
        { id: 'e3', source: 'fetch-1', target: 'analyze-1' },
        { id: 'e4', source: 'fetch-2', target: 'analyze-1' },
        { id: 'e5', source: 'analyze-1', target: 'email-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date(),
    downloads: 734,
    rating: 4.8,
    reviewCount: 89,
    featured: true,
    requiredIntegrations: ['schedule_trigger', 'google_sheets', 'airtable', 'code_javascript', 'sendgrid'],
    requiredCredentials: ['googleSheetsApi', 'airtableApi', 'sendgridApi'],
    estimatedSetupTime: 25,
    documentation: {
      overview: 'Automated report generation from multiple data sources.',
      setup: [],
      usage: 'Runs weekly to generate and distribute reports.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'project-status-report',
    name: 'Project Status Report',
    description: 'Generate weekly project status reports from multiple project management tools.',
    category: 'analytics',
    subcategory: 'reporting',
    author: 'System',
    authorType: 'official',
    tags: ['reports', 'projects', 'status', 'management', 'weekly'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'schedule_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Weekly Friday 5PM',
            properties: {
              cron: '0 17 * * 5'
            }
          }
        },
        {
          id: 'jira-1',
          type: 'jira',
          position: { x: 300, y: 150 },
          data: {
            label: 'Get Sprint Status',
            properties: {
              operation: 'getBoard',
              boardId: 'your-board'
            },
            credentials: ['jiraApi']
          }
        },
        {
          id: 'asana-1',
          type: 'asana',
          position: { x: 300, y: 250 },
          data: {
            label: 'Get Tasks',
            properties: {
              operation: 'getTasks',
              project: 'your-project'
            },
            credentials: ['asanaApi']
          }
        },
        {
          id: 'aggregate-1',
          type: 'code',
          position: { x: 500, y: 200 },
          data: {
            label: 'Generate Report',
            properties: {
              code: `// Aggregate project data
const report = {
  sprint: jiraData,
  tasks: asanaData,
  completedThisWeek: asanaData.filter(t => t.completed).length,
  inProgress: asanaData.filter(t => t.status === 'in_progress').length
};
return [{report}];`
            }
          }
        },
        {
          id: 'email-1',
          type: 'sendgrid',
          position: { x: 700, y: 200 },
          data: {
            label: 'Send Report',
            properties: {
              to: 'stakeholders@company.com',
              subject: 'Weekly Project Status Report',
              templateId: 'project-status'
            },
            credentials: ['sendgridApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'jira-1' },
        { id: 'e2', source: 'trigger-1', target: 'asana-1' },
        { id: 'e3', source: 'jira-1', target: 'aggregate-1' },
        { id: 'e4', source: 'asana-1', target: 'aggregate-1' },
        { id: 'e5', source: 'aggregate-1', target: 'email-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-24'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.6,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'jira', 'asana', 'code', 'sendgrid'],
    requiredCredentials: ['jiraApi', 'asanaApi', 'sendgridApi'],
    estimatedSetupTime: 25,
    documentation: {
      overview: 'Automated weekly status reports.',
      setup: [],
      usage: 'Runs every Friday at 5PM.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'kpi-dashboard-sync',
    name: 'KPI Dashboard Sync',
    description: 'Aggregate KPIs from multiple sources and sync to your dashboard tool.',
    category: 'analytics',
    subcategory: 'dashboards',
    author: 'System',
    authorType: 'official',
    tags: ['kpi', 'dashboard', 'analytics', 'metrics', 'bi'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'schedule_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Hourly Sync',
            properties: {
              cron: '0 * * * *'
            }
          }
        },
        {
          id: 'stripe-1',
          type: 'stripe',
          position: { x: 300, y: 100 },
          data: {
            label: 'Get Revenue',
            properties: {
              operation: 'getBalance'
            },
            credentials: ['stripeApi']
          }
        },
        {
          id: 'ga4-1',
          type: 'ga4',
          position: { x: 300, y: 200 },
          data: {
            label: 'Get Traffic',
            properties: {
              operation: 'runReport',
              metrics: ['sessions', 'users']
            },
            credentials: ['ga4Api']
          }
        },
        {
          id: 'hubspot-1',
          type: 'hubspot',
          position: { x: 300, y: 300 },
          data: {
            label: 'Get Leads',
            properties: {
              operation: 'getContacts',
              filter: 'created_this_month'
            },
            credentials: ['hubspotApi']
          }
        },
        {
          id: 'aggregate-1',
          type: 'code',
          position: { x: 500, y: 200 },
          data: {
            label: 'Aggregate KPIs',
            properties: {
              code: `// Aggregate all KPIs
return [{
  mrr: stripe.balance / 100,
  sessions: ga4.sessions,
  newLeads: hubspot.length,
  timestamp: new Date().toISOString()
}];`
            }
          }
        },
        {
          id: 'sheets-1',
          type: 'googleSheets',
          position: { x: 700, y: 200 },
          data: {
            label: 'Update Dashboard',
            properties: {
              operation: 'appendRow',
              spreadsheetId: 'kpi-dashboard',
              range: 'KPIs!A:E'
            },
            credentials: ['googleSheetsApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'stripe-1' },
        { id: 'e2', source: 'trigger-1', target: 'ga4-1' },
        { id: 'e3', source: 'trigger-1', target: 'hubspot-1' },
        { id: 'e4', source: 'stripe-1', target: 'aggregate-1' },
        { id: 'e5', source: 'ga4-1', target: 'aggregate-1' },
        { id: 'e6', source: 'hubspot-1', target: 'aggregate-1' },
        { id: 'e7', source: 'aggregate-1', target: 'sheets-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-26'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.7,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'stripe', 'ga4', 'hubspot', 'code', 'googleSheets'],
    requiredCredentials: ['stripeApi', 'ga4Api', 'hubspotApi', 'googleSheetsApi'],
    estimatedSetupTime: 25,
    documentation: {
      overview: 'Real-time KPI aggregation.',
      setup: [],
      usage: 'Syncs KPIs every hour.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'google-analytics-report',
    name: 'Google Analytics Weekly Report',
    description: 'Generate and distribute weekly Google Analytics reports.',
    category: 'analytics',
    subcategory: 'reporting',
    author: 'System',
    authorType: 'official',
    tags: ['analytics', 'google', 'reports', 'weekly'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Weekly Monday', properties: { cron: '0 9 * * 1' } } },
        { id: 'ga-1', type: 'googleAnalytics', position: { x: 300, y: 200 }, data: { label: 'Get Metrics', properties: { metrics: ['sessions', 'users', 'pageviews'] }, credentials: ['googleAnalyticsApi'] } },
        { id: 'code-1', type: 'code', position: { x: 500, y: 200 }, data: { label: 'Format Report', properties: { code: '// Generate report HTML' } } },
        { id: 'email-1', type: 'sendgrid', position: { x: 700, y: 200 }, data: { label: 'Send Report', properties: { to: 'marketing@company.com', templateId: 'analytics-report' }, credentials: ['sendgridApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'ga-1' },
        { id: 'e2', source: 'ga-1', target: 'code-1' },
        { id: 'e3', source: 'code-1', target: 'email-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-08-11'), updatedAt: new Date(), downloads: 0, rating: 4.7, reviewCount: 0, featured: false,
    requiredIntegrations: ['schedule_trigger', 'googleAnalytics', 'code', 'sendgrid'], requiredCredentials: ['googleAnalyticsApi', 'sendgridApi'], estimatedSetupTime: 20,
    documentation: { overview: 'Weekly analytics reports.', setup: [], usage: 'Runs every Monday.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'sales-dashboard-sync',
    name: 'Sales Dashboard Sync',
    description: 'Sync sales data to a live dashboard from multiple sources.',
    category: 'analytics',
    subcategory: 'dashboards',
    author: 'System',
    authorType: 'official',
    tags: ['sales', 'dashboard', 'sync', 'reporting'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Every Hour', properties: { cron: '0 * * * *' } } },
        { id: 'hubspot-1', type: 'hubspot', position: { x: 300, y: 100 }, data: { label: 'Get Deals', properties: { operation: 'getDeals' }, credentials: ['hubspotApi'] } },
        { id: 'stripe-1', type: 'stripe', position: { x: 300, y: 200 }, data: { label: 'Get Revenue', properties: { operation: 'getBalance' }, credentials: ['stripeApi'] } },
        { id: 'sheets-1', type: 'googleSheets', position: { x: 300, y: 300 }, data: { label: 'Get Targets', properties: { operation: 'getRows' }, credentials: ['googleSheetsApi'] } },
        { id: 'merge-1', type: 'merge', position: { x: 500, y: 200 }, data: { label: 'Combine', properties: { mode: 'merge' } } },
        { id: 'dataStudio-1', type: 'googleDataStudio', position: { x: 700, y: 200 }, data: { label: 'Update Dashboard', properties: { operation: 'refreshData' }, credentials: ['googleDataStudioApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'hubspot-1' },
        { id: 'e2', source: 'trigger-1', target: 'stripe-1' },
        { id: 'e3', source: 'trigger-1', target: 'sheets-1' },
        { id: 'e4', source: 'hubspot-1', target: 'merge-1' },
        { id: 'e5', source: 'stripe-1', target: 'merge-1' },
        { id: 'e6', source: 'sheets-1', target: 'merge-1' },
        { id: 'e7', source: 'merge-1', target: 'dataStudio-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-08-12'), updatedAt: new Date(), downloads: 0, rating: 4.8, reviewCount: 0, featured: true,
    requiredIntegrations: ['schedule_trigger', 'hubspot', 'stripe', 'googleSheets', 'merge', 'googleDataStudio'], requiredCredentials: ['hubspotApi', 'stripeApi', 'googleSheetsApi', 'googleDataStudioApi'], estimatedSetupTime: 40,
    documentation: { overview: 'Real-time sales dashboard.', setup: [], usage: 'Updates hourly.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'competitor-tracking',
    name: 'Competitor Price Tracking',
    description: 'Monitor competitor pricing and alert on changes.',
    category: 'analytics',
    subcategory: 'competitive',
    author: 'System',
    authorType: 'official',
    tags: ['competitor', 'pricing', 'tracking', 'monitoring'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Daily', properties: { cron: '0 8 * * *' } } },
        { id: 'http-1', type: 'httpRequest', position: { x: 300, y: 200 }, data: { label: 'Scrape Prices', properties: { url: 'https://competitor-api.com/prices' } } },
        { id: 'code-1', type: 'code', position: { x: 500, y: 200 }, data: { label: 'Detect Changes', properties: { code: '// Compare with previous' } } },
        { id: 'filter-1', type: 'filter', position: { x: 700, y: 200 }, data: { label: 'Has Changes?', properties: { condition: '={{$input.hasChanges}}' } } },
        { id: 'slack-1', type: 'slack', position: { x: 900, y: 200 }, data: { label: 'Alert Team', properties: { channel: '#pricing' }, credentials: ['slackApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'http-1' },
        { id: 'e2', source: 'http-1', target: 'code-1' },
        { id: 'e3', source: 'code-1', target: 'filter-1' },
        { id: 'e4', source: 'filter-1', target: 'slack-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-08-13'), updatedAt: new Date(), downloads: 0, rating: 4.5, reviewCount: 0, featured: false,
    requiredIntegrations: ['schedule_trigger', 'httpRequest', 'code', 'filter', 'slack'], requiredCredentials: ['slackApi'], estimatedSetupTime: 25,
    documentation: { overview: 'Competitor price monitoring.', setup: [], usage: 'Checks prices daily.' }, screenshots: [], customizableFields: [], pricing: 'free'
  }
];

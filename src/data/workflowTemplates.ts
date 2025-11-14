/**
 * Workflow Templates Library
 * Pre-built workflow templates for common use cases
 */

import type { Node, Edge } from 'reactflow';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  nodes: Node[];
  edges: Edge[];
  thumbnail?: string;
  estimatedExecutionTime?: string;
  useCase: string;
  requirements?: string[];
}

export const workflowTemplates: WorkflowTemplate[] = [
  // Email Automation
  {
    id: 'email-welcome-series',
    name: 'Welcome Email Series',
    description: 'Automated welcome email sequence for new users',
    category: 'Email Marketing',
    tags: ['email', 'onboarding', 'automation'],
    difficulty: 'beginner',
    useCase: 'Send a series of welcome emails to new users over several days',
    requirements: ['Email provider credentials (Gmail, SendGrid, etc.)'],
    estimatedExecutionTime: '< 1 second per email',
    nodes: [
      {
        id: 'trigger-1',
        type: 'webhook',
        position: { x: 100, y: 100 },
        data: {
          label: 'Webhook Trigger',
          description: 'New user signup',
          config: { method: 'POST', path: '/new-user' }
        }
      },
      {
        id: 'delay-1',
        type: 'delay',
        position: { x: 100, y: 250 },
        data: {
          label: 'Wait 1 Day',
          config: { duration: 86400000 }
        }
      },
      {
        id: 'email-1',
        type: 'email',
        position: { x: 100, y: 400 },
        data: {
          label: 'Welcome Email',
          config: {
            subject: 'Welcome to our platform!',
            template: 'welcome-day-1'
          }
        }
      },
      {
        id: 'delay-2',
        type: 'delay',
        position: { x: 100, y: 550 },
        data: {
          label: 'Wait 3 Days',
          config: { duration: 259200000 }
        }
      },
      {
        id: 'email-2',
        type: 'email',
        position: { x: 100, y: 700 },
        data: {
          label: 'Tips Email',
          config: {
            subject: 'Getting started tips',
            template: 'tips-day-3'
          }
        }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'delay-1' },
      { id: 'e2-3', source: 'delay-1', target: 'email-1' },
      { id: 'e3-4', source: 'email-1', target: 'delay-2' },
      { id: 'e4-5', source: 'delay-2', target: 'email-2' }
    ]
  },

  // Data Processing
  {
    id: 'csv-to-database',
    name: 'CSV to Database Import',
    description: 'Import and process CSV data into a database',
    category: 'Data Processing',
    tags: ['csv', 'database', 'etl'],
    difficulty: 'intermediate',
    useCase: 'Automatically import CSV files into your database with validation',
    requirements: ['Database credentials', 'CSV file source'],
    estimatedExecutionTime: '5-30 seconds depending on file size',
    nodes: [
      {
        id: 'trigger-1',
        type: 'schedule',
        position: { x: 100, y: 100 },
        data: {
          label: 'Daily Trigger',
          config: { cron: '0 9 * * *' }
        }
      },
      {
        id: 'fetch-1',
        type: 'http',
        position: { x: 100, y: 250 },
        data: {
          label: 'Fetch CSV',
          config: {
            method: 'GET',
            url: 'https://example.com/data.csv'
          }
        }
      },
      {
        id: 'parse-1',
        type: 'csvParser',
        position: { x: 100, y: 400 },
        data: {
          label: 'Parse CSV',
          config: {
            delimiter: ',',
            hasHeader: true
          }
        }
      },
      {
        id: 'transform-1',
        type: 'jsonTransform',
        position: { x: 100, y: 550 },
        data: {
          label: 'Transform Data',
          config: {
            mapping: {
              name: '$.Name',
              email: '$.Email',
              createdAt: '$.Date'
            }
          }
        }
      },
      {
        id: 'db-1',
        type: 'database',
        position: { x: 100, y: 700 },
        data: {
          label: 'Insert to DB',
          config: {
            operation: 'insert',
            table: 'users'
          }
        }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'fetch-1' },
      { id: 'e2-3', source: 'fetch-1', target: 'parse-1' },
      { id: 'e3-4', source: 'parse-1', target: 'transform-1' },
      { id: 'e4-5', source: 'transform-1', target: 'db-1' }
    ]
  },

  // API Integration
  {
    id: 'slack-github-notifications',
    name: 'GitHub to Slack Notifications',
    description: 'Send Slack notifications for GitHub events',
    category: 'Integrations',
    tags: ['slack', 'github', 'notifications'],
    difficulty: 'beginner',
    useCase: 'Get notified in Slack when someone creates a PR or issue',
    requirements: ['Slack webhook URL', 'GitHub webhook'],
    estimatedExecutionTime: '< 1 second',
    nodes: [
      {
        id: 'trigger-1',
        type: 'webhook',
        position: { x: 100, y: 100 },
        data: {
          label: 'GitHub Webhook',
          config: {
            method: 'POST',
            path: '/github-events'
          }
        }
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 100, y: 250 },
        data: {
          label: 'Check Event Type',
          config: {
            field: 'action',
            operator: 'in',
            value: ['opened', 'created']
          }
        }
      },
      {
        id: 'transform-1',
        type: 'jsonTransform',
        position: { x: 100, y: 400 },
        data: {
          label: 'Format Message',
          config: {
            template: '*New {{event_type}}*\n{{title}}\nby {{user}}\n{{url}}'
          }
        }
      },
      {
        id: 'slack-1',
        type: 'slack',
        position: { x: 100, y: 550 },
        data: {
          label: 'Send to Slack',
          config: {
            channel: '#github-notifications'
          }
        }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'condition-1' },
      { id: 'e2-3', source: 'condition-1', target: 'transform-1', label: 'true' },
      { id: 'e3-4', source: 'transform-1', target: 'slack-1' }
    ]
  },

  // E-commerce
  {
    id: 'order-processing',
    name: 'E-commerce Order Processing',
    description: 'Complete order processing workflow with payment and fulfillment',
    category: 'E-commerce',
    tags: ['orders', 'payment', 'inventory'],
    difficulty: 'advanced',
    useCase: 'Process orders end-to-end from payment to shipment',
    requirements: ['Payment gateway', 'Inventory system', 'Shipping provider'],
    estimatedExecutionTime: '2-5 seconds',
    nodes: [
      {
        id: 'trigger-1',
        type: 'webhook',
        position: { x: 100, y: 100 },
        data: {
          label: 'New Order',
          config: { method: 'POST' }
        }
      },
      {
        id: 'payment-1',
        type: 'stripe',
        position: { x: 100, y: 250 },
        data: {
          label: 'Process Payment',
          config: { action: 'createCharge' }
        }
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 100, y: 400 },
        data: {
          label: 'Payment Success?',
          config: { field: 'status', operator: 'equals', value: 'succeeded' }
        }
      },
      {
        id: 'inventory-1',
        type: 'database',
        position: { x: 300, y: 550 },
        data: {
          label: 'Update Inventory',
          config: { operation: 'update', table: 'products' }
        }
      },
      {
        id: 'email-success',
        type: 'email',
        position: { x: 300, y: 700 },
        data: {
          label: 'Confirmation Email',
          config: { template: 'order-confirmation' }
        }
      },
      {
        id: 'shipping-1',
        type: 'http',
        position: { x: 300, y: 850 },
        data: {
          label: 'Create Shipment',
          config: { url: 'https://shipping-api.com/create' }
        }
      },
      {
        id: 'email-failure',
        type: 'email',
        position: { x: -100, y: 550 },
        data: {
          label: 'Payment Failed Email',
          config: { template: 'payment-failed' }
        }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'payment-1' },
      { id: 'e2-3', source: 'payment-1', target: 'condition-1' },
      { id: 'e3-4', source: 'condition-1', target: 'inventory-1', label: 'true' },
      { id: 'e4-5', source: 'inventory-1', target: 'email-success' },
      { id: 'e5-6', source: 'email-success', target: 'shipping-1' },
      { id: 'e3-7', source: 'condition-1', target: 'email-failure', label: 'false' }
    ]
  },

  // Social Media
  {
    id: 'social-media-scheduler',
    name: 'Social Media Post Scheduler',
    description: 'Schedule and publish posts to multiple platforms',
    category: 'Social Media',
    tags: ['social', 'scheduling', 'content'],
    difficulty: 'intermediate',
    useCase: 'Publish content across Twitter, LinkedIn, and Facebook simultaneously',
    requirements: ['Social media API credentials'],
    estimatedExecutionTime: '2-3 seconds',
    nodes: [
      {
        id: 'trigger-1',
        type: 'schedule',
        position: { x: 250, y: 100 },
        data: {
          label: 'Scheduled Time',
          config: { cron: '0 9 * * 1-5' }
        }
      },
      {
        id: 'db-1',
        type: 'database',
        position: { x: 250, y: 250 },
        data: {
          label: 'Get Next Post',
          config: { operation: 'select', table: 'scheduled_posts' }
        }
      },
      {
        id: 'twitter-1',
        type: 'twitter',
        position: { x: 100, y: 400 },
        data: {
          label: 'Post to Twitter',
          config: { action: 'tweet' }
        }
      },
      {
        id: 'linkedin-1',
        type: 'linkedin',
        position: { x: 250, y: 400 },
        data: {
          label: 'Post to LinkedIn',
          config: { action: 'share' }
        }
      },
      {
        id: 'facebook-1',
        type: 'facebook',
        position: { x: 400, y: 400 },
        data: {
          label: 'Post to Facebook',
          config: { action: 'post' }
        }
      },
      {
        id: 'db-2',
        type: 'database',
        position: { x: 250, y: 550 },
        data: {
          label: 'Mark as Published',
          config: { operation: 'update', table: 'scheduled_posts' }
        }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'db-1' },
      { id: 'e2-3', source: 'db-1', target: 'twitter-1' },
      { id: 'e2-4', source: 'db-1', target: 'linkedin-1' },
      { id: 'e2-5', source: 'db-1', target: 'facebook-1' },
      { id: 'e3-6', source: 'twitter-1', target: 'db-2' },
      { id: 'e4-6', source: 'linkedin-1', target: 'db-2' },
      { id: 'e5-6', source: 'facebook-1', target: 'db-2' }
    ]
  },

  // Data Backup
  {
    id: 'database-backup',
    name: 'Automated Database Backup',
    description: 'Daily database backup to cloud storage',
    category: 'DevOps',
    tags: ['backup', 'database', 'storage'],
    difficulty: 'intermediate',
    useCase: 'Automatically backup your database and upload to S3',
    requirements: ['Database credentials', 'AWS S3 bucket'],
    estimatedExecutionTime: '1-5 minutes depending on database size',
    nodes: [
      {
        id: 'trigger-1',
        type: 'schedule',
        position: { x: 100, y: 100 },
        data: {
          label: 'Daily at 2 AM',
          config: { cron: '0 2 * * *' }
        }
      },
      {
        id: 'db-1',
        type: 'database',
        position: { x: 100, y: 250 },
        data: {
          label: 'Export Database',
          config: { operation: 'export', format: 'sql' }
        }
      },
      {
        id: 'compress-1',
        type: 'transform',
        position: { x: 100, y: 400 },
        data: {
          label: 'Compress File',
          config: { format: 'gzip' }
        }
      },
      {
        id: 's3-1',
        type: 's3',
        position: { x: 100, y: 550 },
        data: {
          label: 'Upload to S3',
          config: {
            bucket: 'backups',
            key: 'db-{{date}}.sql.gz'
          }
        }
      },
      {
        id: 'email-1',
        type: 'email',
        position: { x: 100, y: 700 },
        data: {
          label: 'Notify Admin',
          config: { subject: 'Backup completed successfully' }
        }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'db-1' },
      { id: 'e2-3', source: 'db-1', target: 'compress-1' },
      { id: 'e3-4', source: 'compress-1', target: 's3-1' },
      { id: 'e4-5', source: 's3-1', target: 'email-1' }
    ]
  },

  // Monitoring & Alerts
  {
    id: 'website-monitoring',
    name: 'Website Uptime Monitor',
    description: 'Monitor website uptime and send alerts on downtime',
    category: 'Monitoring',
    tags: ['monitoring', 'alerts', 'uptime'],
    difficulty: 'beginner',
    useCase: 'Check website every 5 minutes and alert if down',
    requirements: ['Website URL', 'Alert channel (email/Slack)'],
    estimatedExecutionTime: '< 1 second',
    nodes: [
      {
        id: 'trigger-1',
        type: 'schedule',
        position: { x: 100, y: 100 },
        data: {
          label: 'Every 5 Minutes',
          config: { cron: '*/5 * * * *' }
        }
      },
      {
        id: 'http-1',
        type: 'http',
        position: { x: 100, y: 250 },
        data: {
          label: 'Check Website',
          config: {
            method: 'GET',
            url: 'https://example.com',
            timeout: 10000
          }
        }
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 100, y: 400 },
        data: {
          label: 'Is Down?',
          config: { field: 'statusCode', operator: 'notEquals', value: 200 }
        }
      },
      {
        id: 'slack-1',
        type: 'slack',
        position: { x: 100, y: 550 },
        data: {
          label: 'Alert Team',
          config: {
            channel: '#alerts',
            message: '🚨 Website is down!'
          }
        }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'http-1' },
      { id: 'e2-3', source: 'http-1', target: 'condition-1' },
      { id: 'e3-4', source: 'condition-1', target: 'slack-1', label: 'true' }
    ]
  },

  // Customer Support
  {
    id: 'support-ticket-triage',
    name: 'Support Ticket Auto-Triage',
    description: 'Automatically categorize and route support tickets',
    category: 'Customer Support',
    tags: ['support', 'ai', 'automation'],
    difficulty: 'advanced',
    useCase: 'Use AI to categorize tickets and assign to the right team',
    requirements: ['Support system API', 'AI/ML API (optional)'],
    estimatedExecutionTime: '1-2 seconds',
    nodes: [
      {
        id: 'trigger-1',
        type: 'webhook',
        position: { x: 100, y: 100 },
        data: {
          label: 'New Ticket',
          config: { method: 'POST' }
        }
      },
      {
        id: 'ai-1',
        type: 'sentimentAnalysis',
        position: { x: 100, y: 250 },
        data: {
          label: 'Analyze Sentiment',
          config: { field: 'message' }
        }
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 100, y: 400 },
        data: {
          label: 'Urgent?',
          config: { field: 'sentiment', operator: 'in', value: ['very_negative', 'angry'] }
        }
      },
      {
        id: 'assign-1',
        type: 'http',
        position: { x: 300, y: 550 },
        data: {
          label: 'Assign to Senior',
          config: { team: 'senior-support' }
        }
      },
      {
        id: 'assign-2',
        type: 'http',
        position: { x: -100, y: 550 },
        data: {
          label: 'Assign to General',
          config: { team: 'general-support' }
        }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'ai-1' },
      { id: 'e2-3', source: 'ai-1', target: 'condition-1' },
      { id: 'e3-4', source: 'condition-1', target: 'assign-1', label: 'true' },
      { id: 'e3-5', source: 'condition-1', target: 'assign-2', label: 'false' }
    ]
  }
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return workflowTemplates.filter(t => t.category === category);
}

/**
 * Get templates by difficulty
 */
export function getTemplatesByDifficulty(difficulty: WorkflowTemplate['difficulty']): WorkflowTemplate[] {
  return workflowTemplates.filter(t => t.difficulty === difficulty);
}

/**
 * Get templates by tag
 */
export function getTemplatesByTag(tag: string): WorkflowTemplate[] {
  return workflowTemplates.filter(t => t.tags.includes(tag));
}

/**
 * Search templates
 */
export function searchTemplates(query: string): WorkflowTemplate[] {
  const lowerQuery = query.toLowerCase();
  return workflowTemplates.filter(
    t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.includes(lowerQuery))
  );
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  return [...new Set(workflowTemplates.map(t => t.category))];
}

/**
 * Get all unique tags
 */
export function getAllTags(): string[] {
  return [...new Set(workflowTemplates.flatMap(t => t.tags))];
}

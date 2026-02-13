/**
 * AutomationTemplates.ts
 *
 * Marketing and sales automation workflow templates.
 *
 * @module data/templates/misc/AutomationTemplates
 */

import type { WorkflowTemplate } from '../../../types/templates';

export const AUTOMATION_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'sales-assistant-chat',
    name: 'Sales Assistant Chat',
    description: 'AI sales assistant that qualifies leads, answers product questions, and books meetings.',
    category: 'sales',
    subcategory: 'chat',
    author: 'System',
    authorType: 'official',
    tags: ['chat', 'ai', 'sales', 'leads', 'meetings'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'chat-1',
          type: 'chatTrigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Sales Chat',
            properties: {
              title: 'Sales Assistant',
              streaming: true,
              memory: true,
              memoryType: 'summary'
            }
          }
        },
        {
          id: 'ai-1',
          type: 'anthropic',
          position: { x: 300, y: 200 },
          data: {
            label: 'Sales AI',
            properties: {
              model: 'claude-3-opus',
              systemPrompt: 'You are a sales assistant. Qualify leads and offer to book meetings.',
              userMessage: '={{$input.message}}'
            },
            credentials: ['anthropicApi']
          }
        },
        {
          id: 'extract-1',
          type: 'code',
          position: { x: 500, y: 200 },
          data: {
            label: 'Extract Intent',
            properties: {
              code: `// Extract lead info and intent
const wantsDemo = message.includes('demo') || message.includes('meeting');
const leadInfo = extractLeadInfo(conversation);
return [{response, wantsDemo, leadInfo}];`
            }
          }
        },
        {
          id: 'hubspot-1',
          type: 'hubspot',
          position: { x: 700, y: 150 },
          data: {
            label: 'Create/Update Lead',
            properties: {
              operation: 'upsertContact',
              email: '={{$node["extract-1"].json.leadInfo.email}}'
            },
            credentials: ['hubspotApi']
          }
        },
        {
          id: 'calendly-1',
          type: 'calendly',
          position: { x: 700, y: 300 },
          data: {
            label: 'Book Meeting',
            properties: {
              operation: 'getSchedulingLink',
              eventType: 'demo-call'
            },
            credentials: ['calendlyApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'chat-1', target: 'ai-1' },
        { id: 'e2', source: 'ai-1', target: 'extract-1' },
        { id: 'e3', source: 'extract-1', target: 'hubspot-1' },
        { id: 'e4', source: 'extract-1', target: 'calendly-1', sourceHandle: 'wants-demo' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-06'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.8,
    reviewCount: 0,
    featured: true,
    requiredIntegrations: ['chatTrigger', 'anthropic', 'code', 'hubspot', 'calendly'],
    requiredCredentials: ['anthropicApi', 'hubspotApi', 'calendlyApi'],
    estimatedSetupTime: 25,
    documentation: {
      overview: 'AI sales assistant with lead qualification.',
      setup: [],
      usage: 'Add chat widget to product pages.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'ai-content-generator',
    name: 'AI Content Generator',
    description: 'Generate blog posts, social media content, and marketing copy using AI.',
    category: 'marketing',
    subcategory: 'content',
    author: 'System',
    authorType: 'official',
    tags: ['ai', 'content', 'marketing', 'blog', 'social'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Content Request',
            properties: {
              path: '/generate-content',
              methods: ['POST']
            }
          }
        },
        {
          id: 'ai-1',
          type: 'anthropic',
          position: { x: 300, y: 200 },
          data: {
            label: 'Generate Content',
            properties: {
              model: 'claude-3-opus',
              prompt: 'Write a {{$input.contentType}} about {{$input.topic}}'
            },
            credentials: ['anthropicApi']
          }
        },
        {
          id: 'notion-1',
          type: 'notion',
          position: { x: 500, y: 200 },
          data: {
            label: 'Save Draft',
            properties: {
              operation: 'createPage',
              parent: 'content-drafts-db',
              title: '={{$input.topic}}',
              content: '={{$node["ai-1"].json.content}}'
            },
            credentials: ['notionApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'ai-1' },
        { id: 'e2', source: 'ai-1', target: 'notion-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-08'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.8,
    reviewCount: 0,
    featured: true,
    requiredIntegrations: ['webhook_trigger', 'anthropic', 'notion'],
    requiredCredentials: ['anthropicApi', 'notionApi'],
    estimatedSetupTime: 10,
    documentation: {
      overview: 'AI-powered content generation.',
      setup: [],
      usage: 'Trigger via webhook with topic and content type.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'social-media-scheduler',
    name: 'Social Media Scheduler',
    description: 'Schedule and publish content across multiple social media platforms from a single workflow.',
    category: 'marketing',
    subcategory: 'social',
    author: 'System',
    authorType: 'official',
    tags: ['social', 'scheduling', 'twitter', 'linkedin', 'facebook'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'airtable_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'New Post',
            properties: {
              table: 'ScheduledPosts',
              event: 'record_created'
            },
            credentials: ['airtableApi']
          }
        },
        {
          id: 'twitter-1',
          type: 'twitter',
          position: { x: 300, y: 100 },
          data: {
            label: 'Post to Twitter',
            properties: {
              operation: 'createTweet',
              text: '={{$input.content}}'
            },
            credentials: ['twitterApi']
          }
        },
        {
          id: 'linkedin-1',
          type: 'linkedin',
          position: { x: 300, y: 200 },
          data: {
            label: 'Post to LinkedIn',
            properties: {
              operation: 'createPost',
              text: '={{$input.content}}'
            },
            credentials: ['linkedinApi']
          }
        },
        {
          id: 'facebook-1',
          type: 'facebook',
          position: { x: 300, y: 300 },
          data: {
            label: 'Post to Facebook',
            properties: {
              operation: 'createPost',
              message: '={{$input.content}}'
            },
            credentials: ['facebookApi']
          }
        },
        {
          id: 'airtable-1',
          type: 'airtable',
          position: { x: 500, y: 200 },
          data: {
            label: 'Mark as Published',
            properties: {
              operation: 'updateRecord',
              table: 'ScheduledPosts',
              recordId: '={{$input.id}}',
              fields: { status: 'published' }
            },
            credentials: ['airtableApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'twitter-1' },
        { id: 'e2', source: 'trigger-1', target: 'linkedin-1' },
        { id: 'e3', source: 'trigger-1', target: 'facebook-1' },
        { id: 'e4', source: 'twitter-1', target: 'airtable-1' },
        { id: 'e5', source: 'linkedin-1', target: 'airtable-1' },
        { id: 'e6', source: 'facebook-1', target: 'airtable-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-11'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.8,
    reviewCount: 0,
    featured: true,
    requiredIntegrations: ['airtable_trigger', 'twitter', 'linkedin', 'facebook', 'airtable'],
    requiredCredentials: ['airtableApi', 'twitterApi', 'linkedinApi', 'facebookApi'],
    estimatedSetupTime: 20,
    documentation: {
      overview: 'Multi-platform social media scheduling.',
      setup: [],
      usage: 'Add posts to Airtable to schedule.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'social-listening-alerts',
    name: 'Social Listening Alerts',
    description: 'Monitor social media for brand mentions and competitor activity with real-time alerts.',
    category: 'marketing',
    subcategory: 'monitoring',
    author: 'System',
    authorType: 'official',
    tags: ['social', 'monitoring', 'alerts', 'brand', 'mentions'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'schedule_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Every 15 Minutes',
            properties: {
              cron: '*/15 * * * *'
            }
          }
        },
        {
          id: 'twitter-1',
          type: 'twitter',
          position: { x: 300, y: 200 },
          data: {
            label: 'Search Mentions',
            properties: {
              operation: 'searchTweets',
              query: '@yourbrand OR "your brand"'
            },
            credentials: ['twitterApi']
          }
        },
        {
          id: 'ai-1',
          type: 'openai',
          position: { x: 500, y: 200 },
          data: {
            label: 'Analyze Sentiment',
            properties: {
              model: 'gpt-4',
              prompt: 'Analyze sentiment of these mentions: {{$node["twitter-1"].json.tweets}}'
            },
            credentials: ['openaiApi']
          }
        },
        {
          id: 'slack-1',
          type: 'slack',
          position: { x: 700, y: 200 },
          data: {
            label: 'Alert Team',
            properties: {
              channel: '#social-alerts',
              text: 'New mentions detected: {{$node["ai-1"].json.summary}}'
            },
            credentials: ['slackApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'twitter-1' },
        { id: 'e2', source: 'twitter-1', target: 'ai-1' },
        { id: 'e3', source: 'ai-1', target: 'slack-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-12'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.6,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'twitter', 'openai', 'slack'],
    requiredCredentials: ['twitterApi', 'openaiApi', 'slackApi'],
    estimatedSetupTime: 15,
    documentation: {
      overview: 'Real-time social media monitoring.',
      setup: [],
      usage: 'Runs automatically every 15 minutes.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'lead-enrichment-workflow',
    name: 'Lead Enrichment Workflow',
    description: 'Automatically enrich leads with company data, social profiles, and engagement scoring.',
    category: 'sales',
    subcategory: 'leads',
    author: 'System',
    authorType: 'official',
    tags: ['leads', 'enrichment', 'sales', 'crm', 'data'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'hubspot_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'New Contact',
            properties: {
              event: 'contact_created'
            },
            credentials: ['hubspotApi']
          }
        },
        {
          id: 'clearbit-1',
          type: 'http_request',
          position: { x: 300, y: 200 },
          data: {
            label: 'Enrich Data',
            properties: {
              method: 'GET',
              url: 'https://person.clearbit.com/v2/people/find?email={{$input.email}}'
            },
            credentials: ['clearbitApi']
          }
        },
        {
          id: 'score-1',
          type: 'code',
          position: { x: 500, y: 200 },
          data: {
            label: 'Calculate Score',
            properties: {
              code: `// Calculate lead score
let score = 0;
if (data.company?.employees > 100) score += 20;
if (data.title?.includes('Manager') || data.title?.includes('Director')) score += 30;
if (data.linkedin) score += 10;
return [{...data, leadScore: score}];`
            }
          }
        },
        {
          id: 'hubspot-1',
          type: 'hubspot',
          position: { x: 700, y: 200 },
          data: {
            label: 'Update Contact',
            properties: {
              operation: 'updateContact',
              email: '={{$input.email}}',
              properties: {
                company_size: '={{$node["clearbit-1"].json.company.employees}}',
                lead_score: '={{$node["score-1"].json.leadScore}}'
              }
            },
            credentials: ['hubspotApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'clearbit-1' },
        { id: 'e2', source: 'clearbit-1', target: 'score-1' },
        { id: 'e3', source: 'score-1', target: 'hubspot-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-13'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.7,
    reviewCount: 0,
    featured: true,
    requiredIntegrations: ['hubspot_trigger', 'http_request', 'code', 'hubspot'],
    requiredCredentials: ['hubspotApi', 'clearbitApi'],
    estimatedSetupTime: 20,
    documentation: {
      overview: 'Automatic lead enrichment and scoring.',
      setup: [],
      usage: 'Works automatically on new HubSpot contacts.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'email-drip-campaign',
    name: 'Email Drip Campaign',
    description: 'Automated email drip campaign with personalization and engagement tracking.',
    category: 'marketing',
    subcategory: 'email',
    author: 'System',
    authorType: 'official',
    tags: ['email', 'drip', 'campaign', 'marketing', 'automation'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'hubspot_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'New Subscriber',
            properties: {
              event: 'contact_created',
              listId: 'newsletter-subscribers'
            },
            credentials: ['hubspotApi']
          }
        },
        {
          id: 'email-1',
          type: 'sendgrid',
          position: { x: 300, y: 200 },
          data: {
            label: 'Welcome Email',
            properties: {
              to: '={{$input.email}}',
              subject: 'Welcome to {{company}}!',
              templateId: 'welcome-email'
            },
            credentials: ['sendgridApi']
          }
        },
        {
          id: 'delay-1',
          type: 'delay',
          position: { x: 500, y: 200 },
          data: {
            label: 'Wait 3 Days',
            properties: {
              delayType: 'fixed',
              duration: 259200
            }
          }
        },
        {
          id: 'email-2',
          type: 'sendgrid',
          position: { x: 700, y: 200 },
          data: {
            label: 'Follow-up Email',
            properties: {
              to: '={{$input.email}}',
              subject: 'Getting Started Guide',
              templateId: 'getting-started'
            },
            credentials: ['sendgridApi']
          }
        },
        {
          id: 'delay-2',
          type: 'delay',
          position: { x: 900, y: 200 },
          data: {
            label: 'Wait 7 Days',
            properties: {
              delayType: 'fixed',
              duration: 604800
            }
          }
        },
        {
          id: 'email-3',
          type: 'sendgrid',
          position: { x: 1100, y: 200 },
          data: {
            label: 'Conversion Email',
            properties: {
              to: '={{$input.email}}',
              subject: 'Special Offer Just for You',
              templateId: 'special-offer'
            },
            credentials: ['sendgridApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'email-1' },
        { id: 'e2', source: 'email-1', target: 'delay-1' },
        { id: 'e3', source: 'delay-1', target: 'email-2' },
        { id: 'e4', source: 'email-2', target: 'delay-2' },
        { id: 'e5', source: 'delay-2', target: 'email-3' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-25'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.8,
    reviewCount: 0,
    featured: true,
    requiredIntegrations: ['hubspot_trigger', 'sendgrid', 'delay'],
    requiredCredentials: ['hubspotApi', 'sendgridApi'],
    estimatedSetupTime: 20,
    documentation: {
      overview: 'Automated email drip campaign.',
      setup: [],
      usage: 'Triggers on new HubSpot subscribers.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'lead-scoring-automation',
    name: 'Lead Scoring Automation',
    description: 'Automatically score leads based on behavior and demographics.',
    category: 'marketing',
    subcategory: 'leads',
    author: 'System',
    authorType: 'official',
    tags: ['leads', 'scoring', 'automation', 'crm'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'hubspot_trigger', position: { x: 100, y: 200 }, data: { label: 'Contact Activity', properties: { event: 'contact.propertyChange' }, credentials: ['hubspotApi'] } },
        { id: 'code-1', type: 'code', position: { x: 300, y: 200 }, data: { label: 'Calculate Score', properties: { code: '// Lead scoring logic' } } },
        { id: 'hubspot-1', type: 'hubspot', position: { x: 500, y: 200 }, data: { label: 'Update Score', properties: { operation: 'updateContact', leadScore: '={{$node["code-1"].json.score}}' }, credentials: ['hubspotApi'] } },
        { id: 'switch-1', type: 'switchCase', position: { x: 700, y: 200 }, data: { label: 'Check Threshold', properties: { field: '={{$node["code-1"].json.score > 80}}' } } },
        { id: 'slack-1', type: 'slack', position: { x: 900, y: 200 }, data: { label: 'Notify Sales', properties: { channel: '#hot-leads' }, credentials: ['slackApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'code-1' },
        { id: 'e2', source: 'code-1', target: 'hubspot-1' },
        { id: 'e3', source: 'hubspot-1', target: 'switch-1' },
        { id: 'e4', source: 'switch-1', target: 'slack-1', sourceHandle: 'true' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-07-23'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.8,
    reviewCount: 0,
    featured: true,
    requiredIntegrations: ['hubspot_trigger', 'code', 'hubspot', 'switchCase', 'slack'],
    requiredCredentials: ['hubspotApi', 'slackApi'],
    estimatedSetupTime: 35,
    documentation: {
      overview: 'Automated lead scoring.',
      setup: [],
      usage: 'Scores leads on activity.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'utm-tracking-sync',
    name: 'UTM Tracking Sync',
    description: 'Sync UTM parameters from forms to your CRM for attribution.',
    category: 'marketing',
    subcategory: 'analytics',
    author: 'System',
    authorType: 'official',
    tags: ['utm', 'tracking', 'attribution', 'marketing'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'formTrigger', position: { x: 100, y: 200 }, data: { label: 'Form Submit', properties: { fields: ['email', 'utm_source', 'utm_medium', 'utm_campaign'] } } },
        { id: 'hubspot-1', type: 'hubspot', position: { x: 300, y: 200 }, data: { label: 'Update Contact', properties: { operation: 'updateContact' }, credentials: ['hubspotApi'] } },
        { id: 'sheets-1', type: 'googleSheets', position: { x: 500, y: 200 }, data: { label: 'Log Attribution', properties: { operation: 'appendRow' }, credentials: ['googleSheetsApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'hubspot-1' },
        { id: 'e2', source: 'hubspot-1', target: 'sheets-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-07-24'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.5,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['formTrigger', 'hubspot', 'googleSheets'],
    requiredCredentials: ['hubspotApi', 'googleSheetsApi'],
    estimatedSetupTime: 15,
    documentation: {
      overview: 'Marketing attribution tracking.',
      setup: [],
      usage: 'Captures UTM from forms.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'content-calendar-automation',
    name: 'Content Calendar Automation',
    description: 'Automate content publishing from a calendar with multi-platform support.',
    category: 'marketing',
    subcategory: 'content',
    author: 'System',
    authorType: 'official',
    tags: ['content', 'calendar', 'social', 'publishing'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'airtable_trigger', position: { x: 100, y: 200 }, data: { label: 'Scheduled Content', properties: { table: 'Content Calendar' }, credentials: ['airtableApi'] } },
        { id: 'twitter-1', type: 'twitter', position: { x: 300, y: 100 }, data: { label: 'Post Tweet', properties: { operation: 'createTweet' }, credentials: ['twitterApi'] } },
        { id: 'linkedin-1', type: 'linkedin', position: { x: 300, y: 200 }, data: { label: 'Post LinkedIn', properties: { operation: 'createPost' }, credentials: ['linkedinApi'] } },
        { id: 'facebook-1', type: 'facebook', position: { x: 300, y: 300 }, data: { label: 'Post Facebook', properties: { operation: 'createPost' }, credentials: ['facebookApi'] } },
        { id: 'airtable-1', type: 'airtable', position: { x: 500, y: 200 }, data: { label: 'Mark Published', properties: { operation: 'updateRecord', status: 'Published' }, credentials: ['airtableApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'twitter-1' },
        { id: 'e2', source: 'trigger-1', target: 'linkedin-1' },
        { id: 'e3', source: 'trigger-1', target: 'facebook-1' },
        { id: 'e4', source: 'twitter-1', target: 'airtable-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-07-25'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.7,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['airtable_trigger', 'twitter', 'linkedin', 'facebook', 'airtable'],
    requiredCredentials: ['airtableApi', 'twitterApi', 'linkedinApi', 'facebookApi'],
    estimatedSetupTime: 30,
    documentation: {
      overview: 'Multi-platform content publishing.',
      setup: [],
      usage: 'Schedule content in Airtable.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  }
];

export default AUTOMATION_TEMPLATES;

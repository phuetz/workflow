/**
 * Workflow Templates - ai
 */

import type { WorkflowTemplate } from '../../types/templates';

export const AI_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'ai-image-generation-pipeline',
    name: 'AI Image Generation Pipeline',
    description: 'Generate and manage AI images with automatic tagging and storage.',
    category: 'creative',
    subcategory: 'images',
    author: 'System',
    authorType: 'official',
    tags: ['ai', 'images', 'dalle', 'creative', 'design'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Image Request',
            properties: {
              path: '/generate-image',
              methods: ['POST']
            }
          }
        },
        {
          id: 'dalle-1',
          type: 'openai',
          position: { x: 300, y: 200 },
          data: {
            label: 'Generate Image',
            properties: {
              operation: 'createImage',
              prompt: '={{$input.prompt}}',
              size: '1024x1024'
            },
            credentials: ['openaiApi']
          }
        },
        {
          id: 's3-1',
          type: 'awsS3',
          position: { x: 500, y: 200 },
          data: {
            label: 'Store Image',
            properties: {
              operation: 'upload',
              bucket: 'generated-images',
              key: '={{Date.now()}}.png'
            },
            credentials: ['awsApi']
          }
        },
        {
          id: 'airtable-1',
          type: 'airtable',
          position: { x: 700, y: 200 },
          data: {
            label: 'Log to Database',
            properties: {
              operation: 'createRecord',
              table: 'GeneratedImages',
              fields: {
                prompt: '={{$input.prompt}}',
                url: '={{$node["s3-1"].json.url}}'
              }
            },
            credentials: ['airtableApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'dalle-1' },
        { id: 'e2', source: 'dalle-1', target: 's3-1' },
        { id: 'e3', source: 's3-1', target: 'airtable-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-09'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.6,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['webhook_trigger', 'openai', 'awsS3', 'airtable'],
    requiredCredentials: ['openaiApi', 'awsApi', 'airtableApi'],
    estimatedSetupTime: 20,
    documentation: {
      overview: 'Complete AI image generation workflow.',
      setup: [],
      usage: 'Send image generation requests via webhook.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'ai-data-extraction',
    name: 'AI Data Extraction',
    description: 'Extract structured data from unstructured documents using AI.',
    category: 'ai',
    subcategory: 'extraction',
    author: 'System',
    authorType: 'official',
    tags: ['ai', 'extraction', 'documents', 'gpt'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'googleDrive_trigger', position: { x: 100, y: 200 }, data: { label: 'New Document', properties: { folder: 'Inbox' }, credentials: ['googleDriveApi'] } },
        { id: 'download-1', type: 'googleDrive', position: { x: 300, y: 200 }, data: { label: 'Download File', properties: { operation: 'download' }, credentials: ['googleDriveApi'] } },
        { id: 'ai-1', type: 'openai', position: { x: 500, y: 200 }, data: { label: 'Extract Data', properties: { model: 'gpt-4', prompt: 'Extract key information from this document' }, credentials: ['openaiApi'] } },
        { id: 'sheets-1', type: 'googleSheets', position: { x: 700, y: 200 }, data: { label: 'Save Data', properties: { operation: 'appendRow' }, credentials: ['googleSheetsApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'download-1' },
        { id: 'e2', source: 'download-1', target: 'ai-1' },
        { id: 'e3', source: 'ai-1', target: 'sheets-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-18'), updatedAt: new Date(), downloads: 0, rating: 4.8, reviewCount: 0, featured: true,
    requiredIntegrations: ['googleDrive_trigger', 'googleDrive', 'openai', 'googleSheets'], requiredCredentials: ['googleDriveApi', 'openaiApi', 'googleSheetsApi'], estimatedSetupTime: 20,
    documentation: { overview: 'AI-powered data extraction.', setup: [], usage: 'Upload documents to trigger.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'ai-email-classifier',
    name: 'AI Email Classifier',
    description: 'Automatically classify and route emails using AI.',
    category: 'ai',
    subcategory: 'classification',
    author: 'System',
    authorType: 'official',
    tags: ['ai', 'email', 'classification', 'routing'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'email_trigger', position: { x: 100, y: 200 }, data: { label: 'New Email', properties: { inbox: 'support@company.com' }, credentials: ['emailApi'] } },
        { id: 'ai-1', type: 'openai', position: { x: 300, y: 200 }, data: { label: 'Classify', properties: { model: 'gpt-4', prompt: 'Classify this email: sales, support, or general' }, credentials: ['openaiApi'] } },
        { id: 'switch-1', type: 'switchCase', position: { x: 500, y: 200 }, data: { label: 'Route', properties: { field: '={{$node["ai-1"].json.category}}' } } },
        { id: 'slack-sales', type: 'slack', position: { x: 700, y: 100 }, data: { label: 'Sales', properties: { channel: '#sales' }, credentials: ['slackApi'] } },
        { id: 'zendesk-1', type: 'zendesk', position: { x: 700, y: 300 }, data: { label: 'Create Ticket', properties: { operation: 'createTicket' }, credentials: ['zendeskApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'ai-1' },
        { id: 'e2', source: 'ai-1', target: 'switch-1' },
        { id: 'e3', source: 'switch-1', target: 'slack-sales', sourceHandle: 'sales' },
        { id: 'e4', source: 'switch-1', target: 'zendesk-1', sourceHandle: 'support' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-19'), updatedAt: new Date(), downloads: 0, rating: 4.7, reviewCount: 0, featured: false,
    requiredIntegrations: ['email_trigger', 'openai', 'switchCase', 'slack', 'zendesk'], requiredCredentials: ['emailApi', 'openaiApi', 'slackApi', 'zendeskApi'], estimatedSetupTime: 25,
    documentation: { overview: 'Smart email routing.', setup: [], usage: 'Classifies incoming emails.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'ai-meeting-notes',
    name: 'AI Meeting Notes Generator',
    description: 'Automatically generate meeting summaries and action items from transcripts.',
    category: 'ai',
    subcategory: 'productivity',
    author: 'System',
    authorType: 'official',
    tags: ['ai', 'meetings', 'transcription', 'notes'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'zoom_trigger', position: { x: 100, y: 200 }, data: { label: 'Recording Ready', properties: { event: 'recording.completed' }, credentials: ['zoomApi'] } },
        { id: 'transcribe-1', type: 'openai', position: { x: 300, y: 200 }, data: { label: 'Transcribe', properties: { model: 'whisper-1' }, credentials: ['openaiApi'] } },
        { id: 'summarize-1', type: 'openai', position: { x: 500, y: 200 }, data: { label: 'Summarize', properties: { model: 'gpt-4', prompt: 'Summarize this meeting and list action items' }, credentials: ['openaiApi'] } },
        { id: 'notion-1', type: 'notion', position: { x: 700, y: 200 }, data: { label: 'Save Notes', properties: { operation: 'createPage', database: 'Meeting Notes' }, credentials: ['notionApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'transcribe-1' },
        { id: 'e2', source: 'transcribe-1', target: 'summarize-1' },
        { id: 'e3', source: 'summarize-1', target: 'notion-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-20'), updatedAt: new Date(), downloads: 0, rating: 4.9, reviewCount: 0, featured: true,
    requiredIntegrations: ['zoom_trigger', 'openai', 'notion'], requiredCredentials: ['zoomApi', 'openaiApi', 'notionApi'], estimatedSetupTime: 20,
    documentation: { overview: 'Automated meeting notes.', setup: [], usage: 'Processes Zoom recordings.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'ai-code-review',
    name: 'AI Code Review',
    description: 'Automatically review pull requests with AI suggestions.',
    category: 'ai',
    subcategory: 'development',
    author: 'System',
    authorType: 'official',
    tags: ['ai', 'code', 'review', 'github'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'github_trigger', position: { x: 100, y: 200 }, data: { label: 'PR Opened', properties: { event: 'pull_request.opened' }, credentials: ['githubApi'] } },
        { id: 'github-1', type: 'github', position: { x: 300, y: 200 }, data: { label: 'Get Diff', properties: { operation: 'getPullRequest' }, credentials: ['githubApi'] } },
        { id: 'ai-1', type: 'openai', position: { x: 500, y: 200 }, data: { label: 'Review Code', properties: { model: 'gpt-4', prompt: 'Review this code and suggest improvements' }, credentials: ['openaiApi'] } },
        { id: 'github-2', type: 'github', position: { x: 700, y: 200 }, data: { label: 'Post Review', properties: { operation: 'createReview' }, credentials: ['githubApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'github-1' },
        { id: 'e2', source: 'github-1', target: 'ai-1' },
        { id: 'e3', source: 'ai-1', target: 'github-2' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-21'), updatedAt: new Date(), downloads: 0, rating: 4.8, reviewCount: 0, featured: true,
    requiredIntegrations: ['github_trigger', 'github', 'openai'], requiredCredentials: ['githubApi', 'openaiApi'], estimatedSetupTime: 25,
    documentation: { overview: 'AI-powered code review.', setup: [], usage: 'Reviews PRs automatically.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'ai-translation-workflow',
    name: 'AI Translation Workflow',
    description: 'Automatically translate content to multiple languages.',
    category: 'ai',
    subcategory: 'translation',
    author: 'System',
    authorType: 'official',
    tags: ['ai', 'translation', 'localization', 'content'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'webhook', position: { x: 100, y: 200 }, data: { label: 'New Content', properties: {} } },
        { id: 'ai-es', type: 'openai', position: { x: 300, y: 100 }, data: { label: 'Spanish', properties: { model: 'gpt-4', prompt: 'Translate to Spanish' }, credentials: ['openaiApi'] } },
        { id: 'ai-fr', type: 'openai', position: { x: 300, y: 200 }, data: { label: 'French', properties: { model: 'gpt-4', prompt: 'Translate to French' }, credentials: ['openaiApi'] } },
        { id: 'ai-de', type: 'openai', position: { x: 300, y: 300 }, data: { label: 'German', properties: { model: 'gpt-4', prompt: 'Translate to German' }, credentials: ['openaiApi'] } },
        { id: 'airtable-1', type: 'airtable', position: { x: 500, y: 200 }, data: { label: 'Save Translations', properties: { operation: 'createRecord' }, credentials: ['airtableApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'ai-es' },
        { id: 'e2', source: 'trigger-1', target: 'ai-fr' },
        { id: 'e3', source: 'trigger-1', target: 'ai-de' },
        { id: 'e4', source: 'ai-es', target: 'airtable-1' },
        { id: 'e5', source: 'ai-fr', target: 'airtable-1' },
        { id: 'e6', source: 'ai-de', target: 'airtable-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-22'), updatedAt: new Date(), downloads: 0, rating: 4.6, reviewCount: 0, featured: false,
    requiredIntegrations: ['webhook', 'openai', 'airtable'], requiredCredentials: ['openaiApi', 'airtableApi'], estimatedSetupTime: 20,
    documentation: { overview: 'Multi-language translation.', setup: [], usage: 'Send content via webhook.' }, screenshots: [], customizableFields: [], pricing: 'free'
  }
];

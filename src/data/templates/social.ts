/**
 * Workflow Templates - social
 */

import type { WorkflowTemplate } from '../../types/templates';

export const SOCIAL_TEMPLATES: WorkflowTemplate[] = [
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

];

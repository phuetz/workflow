/**
 * Template Service
 * Manages workflow templates and marketplace
 */

import { logger } from './SimpleLogger';
import { BaseService } from './BaseService';
import type {
  WorkflowTemplate,
  TemplateCategory,
  TemplateMarketplace,
  TemplateFilters,
  TemplateInstallation,
  TemplateWorkflow,
  TemplateService as ITemplateService
} from '../types/templates';
import WORKFLOW_TEMPLATES from '../data/workflowTemplates';
import { workflowTemplateLibrary } from '../templates/comprehensiveTemplateLibrary';

export class TemplateService extends BaseService implements ITemplateService {
  private templates: Map<string, WorkflowTemplate> = new Map();
  private installations: Map<string, TemplateInstallation> = new Map();
  private categories: Map<TemplateCategory, WorkflowTemplate[]> = new Map();

  constructor() {
    super('TemplateService', {
      enableCaching: true,
      cacheTimeoutMs: 300000 // 5 minutes
    });

    this.initializeTemplates();
  }

  private async initializeTemplates(): Promise<void> {
    await this.createBuiltInTemplates();
    logger.info('Template service initialized', {
      totalTemplates: this.templates.size,
      categories: this.categories.size
    });
  }

  private async createBuiltInTemplates(): Promise<void> {
    // Load all pre-built templates from workflowTemplates.ts
    for (const template of WORKFLOW_TEMPLATES) {
      this.registerTemplate(template);
    }

    // Load comprehensive template library (100+ templates)
    for (const template of workflowTemplateLibrary) {
      this.registerTemplate(template);
    }

    // Legacy templates still included for backwards compatibility
    // Social Media Cross-Posting Template
    this.registerTemplate({
      id: 'social-media-cross-posting',
      name: 'Social Media Cross-Posting',
      description: 'Automatically post content across multiple social media platforms (Twitter, LinkedIn, Facebook) with platform-specific formatting.',
      category: 'social_media',
      subcategory: 'content_distribution',
      author: 'System',
      authorType: 'official',
      tags: ['social media', 'posting', 'automation', 'marketing', 'content'],
      difficulty: 'beginner',
      workflow: {
        nodes: [
          {
            id: 'trigger-1',
            type: 'webhook_trigger',
            position: { x: 100, y: 200 },
            data: {
              label: 'Content Webhook',
              properties: {
                path: '/publish-content',
                methods: ['POST']
              },
              notes: 'Receives content to post from external systems'
            },
            customizable: true,
            required: true,
            description: 'Configure the webhook URL to receive content'
          },
          {
            id: 'transform-1',
            type: 'code_javascript',
            position: { x: 300, y: 200 },
            data: {
              label: 'Format Content',
              properties: {
                code: `// Format content for different platforms
  twitter: {
    text: content.text.length > 280 ? content.text.substring(0, 277) + '...' : content.text,
    hashtags: content.hashtags?.slice(0, 3) || []
  },
  linkedin: {
    text: content.text,
    hashtags: content.hashtags || []
  },
  facebook: {
    text: content.text,
    link: content.link
  }
};
return [platforms];`
              },
              notes: 'Adapts content for each platform\'s requirements'
            }
          },
          {
            id: 'twitter-1',
            type: 'twitter',
            position: { x: 500, y: 100 },
            data: {
              label: 'Post to Twitter',
              properties: {
                operation: 'tweet',
                text: '={{$node["transform-1"].json.twitter.text}}',
                hashtags: '={{$node["transform-1"].json.twitter.hashtags}}'
              },
              credentials: ['twitterApi'],
              notes: 'Posts to Twitter with character limit consideration'
            },
            customizable: true,
            required: false,
            description: 'Configure Twitter credentials to enable posting'
          },
          {
            id: 'linkedin-1',
            type: 'linkedin',
            position: { x: 500, y: 200 },
            data: {
              label: 'Post to LinkedIn',
              properties: {
                operation: 'share',
                text: '={{$node["transform-1"].json.linkedin.text}}',
                hashtags: '={{$node["transform-1"].json.linkedin.hashtags}}'
              },
              credentials: ['linkedinApi'],
              notes: 'Posts to LinkedIn with professional formatting'
            },
            customizable: true,
            required: false,
            description: 'Configure LinkedIn credentials to enable posting'
          },
          {
            id: 'facebook-1',
            type: 'facebook',
            position: { x: 500, y: 300 },
            data: {
              label: 'Post to Facebook',
              properties: {
                operation: 'post',
                message: '={{$node["transform-1"].json.facebook.text}}',
                link: '={{$node["transform-1"].json.facebook.link}}'
              },
              credentials: ['facebookApi'],
              notes: 'Posts to Facebook page with link preview'
            },
            customizable: true,
            required: false,
            description: 'Configure Facebook credentials to enable posting'
          },
          {
            id: 'notification-1',
            type: 'slack',
            position: { x: 700, y: 200 },
            data: {
              label: 'Success Notification',
              properties: {
                operation: 'sendMessage',
                channel: '#marketing',
                text: 'Content successfully posted to social media platforms! 🎉'
              },
              credentials: ['slackApi'],
              notes: 'Notifies team of successful posting'
            },
            customizable: true,
            required: false,
            description: 'Configure Slack to receive success notifications'
          }
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'transform-1' },
          { id: 'e2', source: 'transform-1', target: 'twitter-1' },
          { id: 'e3', source: 'transform-1', target: 'linkedin-1' },
          { id: 'e4', source: 'transform-1', target: 'facebook-1' },
          { id: 'e5', source: 'twitter-1', target: 'notification-1' },
          { id: 'e6', source: 'linkedin-1', target: 'notification-1' },
          { id: 'e7', source: 'facebook-1', target: 'notification-1' }
        ],
        variables: {
          defaultHashtags: ['#automation', '#workflow'],
          maxTwitterLength: 280
        }
      },
      version: '1.2.0',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date(),
      downloads: 1247,
      rating: 4.8,
      reviewCount: 156,
      featured: true,
      requiredIntegrations: ['webhook_trigger', 'code_javascript'],
      requiredCredentials: ['twitterApi', 'linkedinApi', 'facebookApi', 'slackApi'],
      estimatedSetupTime: 15,
      documentation: {
        overview: 'This template allows you to automatically post content across multiple social media platforms with a single webhook call. Content is automatically formatted for each platform\'s specific requirements and character limits.',
        setup: [
          {
            step: 1,
            title: 'Configure Social Media Credentials',
            description: 'Set up API credentials for Twitter, LinkedIn, and Facebook in the credentials manager.'
          },
          {
            step: 2,
            title: 'Customize Platform Settings',
            description: 'Configure which platforms to post to and customize the content formatting rules.'
          },
          {
            step: 3,
            title: 'Set Up Webhook',
            description: 'Copy the webhook URL and integrate it with your content management system.'
          },
          {
            step: 4,
            title: 'Test the Workflow',
            description: 'Send a test post to verify all platforms are working correctly.'
          }
        ],
        usage: 'Send a POST request to the webhook URL with content in JSON format: {"text": "Your content", "hashtags": ["#tag1", "#tag2"], "link": "https://example.com"}',
        troubleshooting: [
          {
            problem: 'Posts not appearing on Twitter',
            solution: 'Check that your Twitter API credentials have write permissions and verify the character limit.'
          },
          {
            problem: 'LinkedIn posts failing',
            solution: 'Ensure your LinkedIn app has the correct permissions for posting to company pages.'
          }
        ]
      },
      screenshots: ['/templates/social-cross-post-1.png', '/templates/social-cross-post-2.png'],
      customizableFields: [
        {
          nodeId: 'trigger-1',
          propertyPath: 'path',
          displayName: 'Webhook Path',
          description: 'URL path for the webhook endpoint',
          type: 'string',
          required: true,
          placeholder: '/publish-content'
        },
        {
          nodeId: 'notification-1',
          propertyPath: 'channel',
          displayName: 'Notification Channel',
          description: 'Slack channel for success notifications',
          type: 'string',
          required: false,
          placeholder: '#marketing'
        }
      ],
      pricing: 'free'
    });

    // Lead Qualification Pipeline Template
    this.registerTemplate({
      id: 'lead-qualification-pipeline',
      name: 'Lead Qualification Pipeline',
      description: 'Automatically qualify leads based on customizable criteria and route them to appropriate sales representatives.',
      category: 'business_automation',
      subcategory: 'sales',
      author: 'System',
      authorType: 'official',
      tags: ['sales', 'crm', 'lead qualification', 'automation', 'scoring'],
      difficulty: 'intermediate',
      workflow: {
        nodes: [
          {
            id: 'webhook-1',
            type: 'webhook_trigger',
            position: { x: 100, y: 200 },
            data: {
              label: 'New Lead Webhook',
              properties: {
                path: '/new-lead',
                methods: ['POST']
              }
            },
            customizable: true,
            required: true
          },
          {
            id: 'score-1',
            type: 'code_javascript', 
            position: { x: 300, y: 200 },
            data: {
              label: 'Lead Scoring',
              properties: {
                code: `// Lead scoring algorithm
let __score = 0;

// Company size scoring
if (lead.companySize >= 1000) score += 30;
else if (lead.companySize >= 100) score += 20;
else if (lead.companySize >= 10) score += 10;

// Budget scoring
if (lead.budget >= 100000) score += 25;
else if (lead.budget >= 50000) score += 15;
else if (lead.budget >= 10000) score += 10;

// Industry scoring
if (highValueIndustries.includes(lead.industry?.toLowerCase())) score += 15;

// Urgency scoring
if (lead.timeline === 'immediate') score += 20;
else if (lead.timeline === '3months') score += 10;

return [{...lead, score, qualification: score >= 50 ? 'hot' : score >= 30 ? 'warm' : 'cold'}];`
              }
            }
          },
          {
            id: 'router-1',
            type: 'if_switch',
            position: { x: 500, y: 200 },
            data: {
              label: 'Route by Score',
              properties: {
                conditions: [
                  { field: 'score', operator: '>=', value: 50, output: 'hot' },
                  { field: 'score', operator: '>=', value: 30, output: 'warm' },
                  { field: 'score', operator: '<', value: 30, output: 'cold' }
                ]
              }
            }
          },
          {
            id: 'crm-hot',
            type: 'salesforce',
            position: { x: 700, y: 100 },
            data: {
              label: 'Create Hot Lead',
              properties: {
                operation: 'create',
                object: 'Lead',
                priority: 'High',
                assignTo: 'senior-sales-rep'
              },
              credentials: ['salesforceApi']
            },
            customizable: true
          },
          {
            id: 'crm-warm',
            type: 'salesforce',
            position: { x: 700, y: 200 },
            data: {
              label: 'Create Warm Lead',
              properties: {
                operation: 'create',
                object: 'Lead',
                priority: 'Medium',
                assignTo: 'sales-rep'
              },
              credentials: ['salesforceApi']
            },
            customizable: true
          },
          {
            id: 'nurture-cold',
            type: 'mailchimp',
            position: { x: 700, y: 300 },
            data: {
              label: 'Add to Nurture Campaign',
              properties: {
                operation: 'addToList',
                listId: 'nurture-campaign',
                tags: ['cold-lead', 'nurture']
              },
              credentials: ['mailchimpApi']
            },
            customizable: true
          }
        ],
        edges: [
          { id: 'e1', source: 'webhook-1', target: 'score-1' },
          { id: 'e2', source: 'score-1', target: 'router-1' },
          { id: 'e3', source: 'router-1', target: 'crm-hot', sourceHandle: 'hot' },
          { id: 'e4', source: 'router-1', target: 'crm-warm', sourceHandle: 'warm' },
          { id: 'e5', source: 'router-1', target: 'nurture-cold', sourceHandle: 'cold' }
        ]
      },
      version: '1.1.0',
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date(),
      downloads: 892,
      rating: 4.6,
      reviewCount: 89,
      featured: true,
      requiredIntegrations: ['webhook_trigger', 'code_javascript', 'if_switch'],
      requiredCredentials: ['salesforceApi', 'mailchimpApi'],
      estimatedSetupTime: 25,
      documentation: {
        overview: 'Automatically qualify leads using customizable scoring criteria and route them to appropriate sales processes.',
        setup: [
          {
            step: 1,
            title: 'Configure CRM Integration',
            description: 'Set up Salesforce or your CRM system credentials.'
          },
          {
            step: 2,
            title: 'Customize Scoring Rules',
            description: 'Modify the lead scoring algorithm based on your qualification criteria.'
          },
          {
            step: 3,
            title: 'Set Up Routing',
            description: 'Configure where different lead types should be routed.'
          }
        ],
        usage: 'Send lead data via webhook with fields: companySize, budget, industry, timeline.'
      },
      screenshots: ['/templates/lead-qualification-1.png'],
      customizableFields: [
        {
          nodeId: 'score-1',
          propertyPath: 'code',
          displayName: 'Scoring Algorithm',
          description: 'Customize the lead scoring logic',
          type: 'string',
          required: true
        }
      ],
      pricing: 'free'
    });

    // Email Campaign Automation Template
    this.registerTemplate({
      id: 'email-campaign-automation',
      name: 'Email Campaign Automation',
      description: 'Trigger personalized email campaigns based on user actions and behavior with advanced segmentation.',
      category: 'marketing',
      subcategory: 'email_marketing',
      author: 'System',
      authorType: 'official',
      tags: ['email', 'marketing', 'personalization', 'automation', 'campaigns'],
      difficulty: 'intermediate',
      workflow: {
        nodes: [
          {
            id: 'trigger-1',
            type: 'webhook_trigger',
            position: { x: 100, y: 200 },
            data: {
              label: 'User Action Trigger',
              properties: {
                path: '/user-action',
                methods: ['POST']
              }
            }
          },
          {
            id: 'segment-1',
            type: 'code_javascript',
            position: { x: 300, y: 200 },
            data: {
              label: 'User Segmentation',
              properties: {
                code: `// Segment users based on behavior and profile

// Behavior-based segmentation
if (user.pageViews > 10) segments.push('engaged');
if (user.purchases > 0) segments.push('customer');
if (user.lastLogin > 30) segments.push('inactive');

// Profile-based segmentation  
if (user.plan === 'premium') segments.push('premium');
if (user.industry) segments.push(user.industry);

// Campaign selection
let __campaign = 'default';
if (segments.includes('inactive')) campaign = 'reactivation';
else if (segments.includes('engaged') && !segments.includes('customer')) campaign = 'conversion';
else if (segments.includes('customer')) campaign = 'upsell';

return [{...user, segments, campaign}];`
              }
            }
          },
          {
            id: 'personalize-1',
            type: 'code_javascript',
            position: { x: 500, y: 200 },
            data: {
              label: 'Personalize Content',
              properties: {
                code: `// Personalize email content
  reactivation: {
    subject: "We miss you, {{firstName}}! Come back for 20% off",
    content: "Hi {{firstName}}, we noticed you haven't been around lately..."
  },
  conversion: {
    subject: "{{firstName}}, ready to take the next step?",
    content: "You've been exploring our platform, {{firstName}}. Here's what you're missing..."
  },
  upsell: {
    subject: "{{firstName}}, unlock more features!",
    content: "Thanks for being a valued customer, {{firstName}}. Upgrade to get..."
  }
};

  subject: template.subject.replace('{{firstName}}', data.firstName || 'there'),
  content: template.content.replace('{{firstName}}', data.firstName || 'there'),
  campaign: data.campaign
};

return [{...data, email: personalizedEmail}];`
              }
            }
          },
          {
            id: 'delay-1',
            type: 'delay',
            position: { x: 700, y: 200 },
            data: {
              label: 'Optimal Send Time',
              properties: {
                delayType: 'smart',
                timezone: '={{$input.timezone}}',
                preferredHour: 10
              }
            }
          },
          {
            id: 'email-1',
            type: 'sendgrid',
            position: { x: 900, y: 200 },
            data: {
              label: 'Send Email',
              properties: {
                to: '={{$input.email}}',
                subject: '={{$node["personalize-1"].json.email.subject}}',
                content: '={{$node["personalize-1"].json.email.content}}',
                templateId: 'dynamic',
                trackOpens: true,
                trackClicks: true
              },
              credentials: ['sendgridApi']
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'segment-1' },
          { id: 'e2', source: 'segment-1', target: 'personalize-1' },
          { id: 'e3', source: 'personalize-1', target: 'delay-1' },
          { id: 'e4', source: 'delay-1', target: 'email-1' }
        ]
      },
      version: '1.3.0',
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date(),
      downloads: 1543,
      rating: 4.9,
      reviewCount: 198,
      featured: true,
      requiredIntegrations: ['webhook_trigger', 'code_javascript', 'delay'],
      requiredCredentials: ['sendgridApi'],
      estimatedSetupTime: 20,
      documentation: {
        overview: 'Create sophisticated email campaigns that automatically segment users and personalize content based on behavior and profile data.',
        setup: [
          {
            step: 1,
            title: 'Configure Email Service',
            description: 'Set up SendGrid or your preferred email service credentials.'
          },
          {
            step: 2,
            title: 'Customize Segmentation',
            description: 'Modify the user segmentation logic to match your business rules.'
          },
          {
            step: 3,
            title: 'Design Email Templates',
            description: 'Create and customize email templates for different campaigns.'
          }
        ],
        usage: 'Trigger campaigns by sending user data: {email, firstName, pageViews, purchases, lastLogin, plan, industry}'
      },
      screenshots: ['/templates/email-campaign-1.png', '/templates/email-campaign-2.png'],
      customizableFields: [
        {
          nodeId: 'segment-1',
          propertyPath: 'code',
          displayName: 'Segmentation Rules',
          description: 'Customize how users are segmented',
          type: 'string',
          required: true
        }
      ],
      pricing: 'free'
    });

    // Data Sync Template
    this.registerTemplate({
      id: 'daily-data-sync',
      name: 'Daily Data Sync',
      description: 'Synchronize data between different systems on a daily schedule with error handling and notifications.',
      category: 'data_processing',
      subcategory: 'integration',
      author: 'System',
      authorType: 'official',
      tags: ['data sync', 'integration', 'scheduled', 'automation'],
      difficulty: 'intermediate',
      workflow: {
        nodes: [
          {
            id: 'trigger-1',
            type: 'schedule_trigger',
            position: { x: 100, y: 200 },
            data: {
              label: 'Daily Schedule',
              properties: {
                cron: '0 6 * * *',
                timezone: 'UTC'
              }
            },
            customizable: true,
            required: true
          },
          {
            id: 'extract-1',
            type: 'http_request',
            position: { x: 300, y: 200 },
            data: {
              label: 'Extract Data',
              properties: {
                method: 'GET',
                url: 'https://api.source-system.com/data',
                headers: { 'Authorization': 'Bearer {{credentials.sourceApiKey}}' }
              },
              credentials: ['sourceSystemApi']
            },
            customizable: true
          },
          {
            id: 'transform-1',
            type: 'code_javascript',
            position: { x: 500, y: 200 },
            data: {
              label: 'Transform Data',
              properties: {
                code: `// Transform data format
return sourceData.map(item => ({
  id: item.external_id,
  name: item.full_name,
  email: item.email_address,
  created: new Date(item.created_at).toISOString(),
  status: item.active ? 'active' : 'inactive'
}));`
              }
            }
          },
          {
            id: 'load-1',
            type: 'http_request',
            position: { x: 700, y: 200 },
            data: {
              label: 'Load to Destination',
              properties: {
                method: 'POST',
                url: 'https://api.destination-system.com/sync',
                headers: { 'Authorization': 'Bearer {{credentials.destApiKey}}' },
                body: '={{$input}}'
              },
              credentials: ['destinationSystemApi']
            },
            customizable: true
          },
          {
            id: 'notify-success',
            type: 'slack',
            position: { x: 900, y: 150 },
            data: {
              label: 'Success Notification',
              properties: {
                channel: '#data-team',
                text: '✅ Daily data sync completed successfully! Synced {{$node["load-1"].json.recordCount}} records.'
              },
              credentials: ['slackApi']
            }
          },
          {
            id: 'notify-error',
            type: 'slack',
            position: { x: 900, y: 250 },
            data: {
              label: 'Error Notification',
              properties: {
                channel: '#data-team',
                text: '❌ Daily data sync failed: {{$node.error.message}}'
              },
              credentials: ['slackApi']
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'extract-1' },
          { id: 'e2', source: 'extract-1', target: 'transform-1' },
          { id: 'e3', source: 'transform-1', target: 'load-1' },
          { id: 'e4', source: 'load-1', target: 'notify-success', type: 'success' },
          { id: 'e5', source: 'load-1', target: 'notify-error', type: 'error' }
        ]
      },
      version: '1.0.0',
      createdAt: new Date('2024-02-10'),
      updatedAt: new Date(),
      downloads: 654,
      rating: 4.5,
      reviewCount: 67,
      featured: false,
      requiredIntegrations: ['schedule_trigger', 'http_request', 'code_javascript'],
      requiredCredentials: ['sourceSystemApi', 'destinationSystemApi', 'slackApi'],
      estimatedSetupTime: 30,
      documentation: {
        overview: 'Synchronize data between different systems automatically with comprehensive error handling.',
        setup: [
          {
            step: 1,
            title: 'Configure Source System',
            description: 'Set up API credentials for the source data system.'
          },
          {
            step: 2,
            title: 'Configure Destination System', 
            description: 'Set up API credentials for the destination system.'
          },
          {
            step: 3,
            title: 'Customize Data Transformation',
            description: 'Modify the transformation logic to match your data formats.'
          }
        ],
        usage: 'The workflow runs automatically on the configured schedule. Monitor via Slack notifications.'
      },
      screenshots: ['/templates/data-sync-1.png'],
      customizableFields: [
        {
          nodeId: 'trigger-1',
          propertyPath: 'cron',
          displayName: 'Schedule',
          description: 'Cron expression for sync schedule',
          type: 'string',
          required: true,
          placeholder: '0 6 * * *'
        }
      ],
      pricing: 'free'
    });
  }

  private registerTemplate(template: WorkflowTemplate): void {
    this.templates.set(template.id, template);
    
    // Add to category
    const categoryTemplates = this.categories.get(template.category) || [];
    categoryTemplates.push(template);
    this.categories.set(template.category, categoryTemplates);

    logger.info('Template registered', { 
      templateId: template.id, 
      category: template.category 
    });
  }

  public getAll(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  public getById(id: string): WorkflowTemplate | undefined {
    return this.templates.get(id);
  }

  public getByCategory(category: TemplateCategory): WorkflowTemplate[] {
    return this.categories.get(category) || [];
  }

  public search(query: string, filters?: TemplateFilters): WorkflowTemplate[] {
    let templates = this.getAll();

    // Apply text search
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      templates = templates.filter(template =>
        template.name.toLowerCase().includes(lowerQuery) ||
        template.description.toLowerCase().includes(lowerQuery) ||
        template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }

    // Apply filters
    if (filters) {
      if (filters.category) {
        templates = templates.filter(t => t.category === filters.category);
      }
      if (filters.difficulty) {
        templates = templates.filter(t => t.difficulty === filters.difficulty);
      }
      if (filters.pricing) {
        templates = templates.filter(t => t.pricing === filters.pricing);
      }
      if (filters.authorType) {
        templates = templates.filter(t => t.authorType === filters.authorType);
      }
      if (filters.minRating) {
        templates = templates.filter(t => (t.rating ?? 0) >= filters.minRating!);
      }
      if (filters.maxSetupTime) {
        templates = templates.filter(t => (t.estimatedSetupTime ?? 0) <= filters.maxSetupTime!);
      }
      if (filters.tags?.length) {
        templates = templates.filter(t =>
          filters.tags!.some(tag => t.tags.includes(tag))
        );
      }
    }

    return templates;
  }

  public getFeatured(): WorkflowTemplate[] {
    return this.getAll().filter(t => t.featured);
  }

  public getPopular(limit: number = 10): WorkflowTemplate[] {
    return [...this.getAll()]
      .sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))
      .slice(0, limit);
  }

  public getRecent(limit: number = 10): WorkflowTemplate[] {
    return [...this.getAll()]
      .sort((a, b) => (b.updatedAt ?? new Date(0)).getTime() - (a.updatedAt ?? new Date(0)).getTime())
      .slice(0, limit);
  }

  public async install(
    templateId: string,
    customizations?: Record<string, unknown>
  ): Promise<TemplateInstallation> {
    const result = await this.executeOperation('install', async () => {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      const installationId = `inst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const workflowId = `wf-${templateId}-${Date.now()}`;

      const installation: TemplateInstallation = {
        templateId,
        workflowId,
        customizations: customizations || {},
        installedAt: new Date(),
        version: template.version ?? '1.0.0',
        status: 'installing'
      };

      this.installations.set(installationId, installation);

      // Simulate installation process
      setTimeout(() => {
        installation.status = 'configuring';
        setTimeout(() => {
          installation.status = 'ready';
          logger.info('Template installed successfully', { templateId, workflowId });
        }, 2000);
      }, 1000);

      logger.info('Template installation started', { templateId, installationId });
      return installation;
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Installation failed');
    }

    return result.data;
  }

  public async uninstall(installationId: string): Promise<void> {
    const result = await this.executeOperation('uninstall', async () => {
      const installation = this.installations.get(installationId);
      if (!installation) {
        throw new Error(`Installation ${installationId} not found`);
      }

      this.installations.delete(installationId);
      logger.info('Template uninstalled', { installationId });
    });

    if (!result.success) {
      throw new Error(result.error || 'Uninstall failed');
    }
  }

  public getInstallations(): TemplateInstallation[] {
    return Array.from(this.installations.values());
  }

  public async updateTemplate(
    templateId: string,
    updates: Partial<WorkflowTemplate>
  ): Promise<void> {
    const result = await this.executeOperation('updateTemplate', async () => {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      const updatedTemplate = { ...template, ...updates, updatedAt: new Date() };
      this.templates.set(templateId, updatedTemplate);

      logger.info('Template updated', { templateId });
    });

    if (!result.success) {
      throw new Error(result.error || 'Update failed');
    }
  }

  public async createTemplate(workflow: unknown): Promise<WorkflowTemplate> {
    const result = await this.executeOperation('createTemplate', async () => {
      const templateId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Type assertion for workflow object
      const workflowData = workflow as { name?: string; description?: string; nodes?: unknown[]; edges?: unknown[] };

      const template: WorkflowTemplate = {
        id: templateId,
        name: workflowData.name || 'Custom Template',
        description: workflowData.description || 'Custom workflow template',
        category: 'business_automation', // Changed from 'custom' to valid category
        author: 'User',
        authorType: 'community',
        tags: ['custom'],
        difficulty: 'intermediate',
        workflow: workflowData as TemplateWorkflow, // Type assertion for TemplateWorkflow
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        downloads: 0,
        rating: 0,
        reviewCount: 0,
        featured: false,
        requiredIntegrations: [],
        requiredCredentials: [],
        estimatedSetupTime: 30,
        documentation: {
          overview: 'Custom workflow template',
          setup: [],
          usage: 'Use this custom template in your workflows'
        },
        screenshots: [],
        customizableFields: [],
        pricing: 'free'
      };

      this.registerTemplate(template);
      logger.info('Custom template created', { templateId });
      return template;
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Create template failed');
    }

    return result.data;
  }

  public async publishTemplate(templateId: string): Promise<void> {
    const result = await this.executeOperation('publishTemplate', async () => {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      // In real implementation, would publish to marketplace
      logger.info('Template published to marketplace', { templateId });
    });

    if (!result.success) {
      throw new Error(result.error || 'Publish failed');
    }
  }

  public getMarketplace(filters?: TemplateFilters): TemplateMarketplace {
    let templates = this.getAll();

    // Apply filters if provided
    if (filters) {
      templates = this.search('', filters);
    }

    const featured = this.getFeatured();
    const popular = this.getPopular();
    const recent = this.getRecent();

    // Trending (high recent downloads/ratings)
    const trending = [...templates]
      .filter(t => {
        const daysSinceUpdate = (Date.now() - (t.updatedAt ?? new Date(0)).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate <= 30 && (t.rating ?? 0) >= 4.0;
      })
      .sort((a, b) => ((b.rating ?? 0) * (b.downloads ?? 0)) - ((a.rating ?? 0) * (a.downloads ?? 0)))
      .slice(0, 10);

    // Group by categories
    const categories = Array.from(this.categories.entries()).map(([name, categoryTemplates]) => ({
      name,
      displayName: this.getCategoryDisplayName(name),
      icon: this.getCategoryIcon(name),
      count: categoryTemplates.filter(t => templates.includes(t)).length,
      templates: categoryTemplates.filter(t => templates.includes(t))
    }));

    return {
      featured,
      categories,
      popular,
      recent,
      trending,
      search: (query: string, searchFilters?: TemplateFilters) => {
        return this.search(query, searchFilters);
      }
    };
  }

  private getCategoryDisplayName(category: TemplateCategory): string {
    const names: Record<TemplateCategory, string> = {
      business_automation: 'Business Automation',
      marketing: 'Marketing',
      sales: 'Sales',
      customer_support: 'Customer Support',
      data_processing: 'Data Processing',
      notifications: 'Notifications',
      social_media: 'Social Media',
      ecommerce: 'E-commerce',
      finance: 'Finance',
      hr: 'HR',
      development: 'Development',
      analytics: 'Analytics',
      productivity: 'Productivity',
      integration: 'Integration',
      monitoring: 'Monitoring',
      communication: 'Communication',
      devops: 'DevOps',
      iot: 'IoT',
      security: 'Security',
      lead_generation: 'Lead Generation',
      events: 'Events',
      compliance: 'Compliance',
      web3: 'Web3',
      data: 'Data',
      ai: 'AI',
      creative: 'Creative',
      chat: 'Chat',
      forms: 'Forms',
      utilities: 'Utilities',
      support: 'Support',
      social: 'Social'
    };
    return names[category] || category;
  }

  private getCategoryIcon(category: TemplateCategory): string {
    const icons: Record<TemplateCategory, string> = {
      business_automation: 'briefcase',
      marketing: 'megaphone',
      sales: 'trending-up',
      customer_support: 'headphones',
      data_processing: 'database',
      notifications: 'bell',
      social_media: 'share-2',
      ecommerce: 'shopping-cart',
      finance: 'dollar-sign',
      hr: 'users',
      development: 'code',
      analytics: 'bar-chart',
      productivity: 'zap',
      integration: 'shuffle',
      monitoring: 'activity',
      communication: 'message-circle',
      devops: 'terminal',
      iot: 'cpu',
      security: 'shield',
      lead_generation: 'user-plus',
      events: 'calendar',
      compliance: 'check-square',
      web3: 'layers',
      data: 'server',
      ai: 'cpu',
      creative: 'image',
      chat: 'message-square',
      forms: 'file-text',
      utilities: 'tool',
      support: 'life-buoy',
      social: 'users'
    };
    return icons[category] || 'folder';
  }
}

// Export singleton instance
export const templateService = new TemplateService();
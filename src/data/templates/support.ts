/**
 * Workflow Templates - support
 */

import type { WorkflowTemplate } from '../../types/templates';

export const SUPPORT_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'ticket-routing-system',
    name: 'Ticket Routing System',
    description: 'Automatically categorize and route support tickets to the appropriate team based on keywords and priority.',
    category: 'customer_support',
    subcategory: 'ticketing',
    author: 'System',
    authorType: 'official',
    tags: ['support', 'tickets', 'routing', 'zendesk', 'automation'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'zendesk_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'New Ticket',
            properties: {
              event: 'ticket_created'
            },
            credentials: ['zendeskApi']
          }
        },
        {
          id: 'classify-1',
          type: 'code_javascript',
          position: { x: 300, y: 200 },
          data: {
            label: 'Classify Ticket',
            properties: {
              code: `// Classify ticket based on content
const subject = ticket.subject.toLowerCase();
const body = ticket.description.toLowerCase();

let category = 'general';
let priority = 'normal';
let team = 'support';

// Technical issues
if (subject.includes('bug') || body.includes('error') || body.includes('crash')) {
  category = 'technical';
  team = 'engineering';
  priority = 'high';
}

// Billing issues
if (subject.includes('billing') || subject.includes('payment') || subject.includes('invoice')) {
  category = 'billing';
  team = 'finance';
  priority = 'high';
}

// Account issues
if (subject.includes('account') || subject.includes('login') || subject.includes('password')) {
  category = 'account';
  team = 'support';
  priority = 'high';
}

return [{...ticket, category, priority, team}];`
            }
          }
        },
        {
          id: 'update-ticket',
          type: 'zendesk',
          position: { x: 500, y: 200 },
          data: {
            label: 'Update & Route',
            properties: {
              operation: 'updateTicket',
              ticketId: '={{$input.id}}',
              priority: '={{$node["classify-1"].json.priority}}',
              tags: ['={{$node["classify-1"].json.category}}'],
              assignedTeam: '={{$node["classify-1"].json.team}}'
            },
            credentials: ['zendeskApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'classify-1' },
        { id: 'e2', source: 'classify-1', target: 'update-ticket' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-12'),
    updatedAt: new Date(),
    downloads: 789,
    rating: 4.7,
    reviewCount: 85,
    featured: false,
    requiredIntegrations: ['zendesk_trigger', 'code_javascript', 'zendesk'],
    requiredCredentials: ['zendeskApi'],
    estimatedSetupTime: 15,
    documentation: {
      overview: 'Intelligent ticket routing based on content analysis.',
      setup: [],
      usage: 'Automatically processes all new support tickets.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'customer-satisfaction-survey',
    name: 'Customer Satisfaction Survey',
    description: 'Automatically send satisfaction surveys after ticket resolution and track responses in your CRM.',
    category: 'customer_support',
    subcategory: 'feedback',
    author: 'System',
    authorType: 'official',
    tags: ['survey', 'csat', 'feedback', 'support', 'customer'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'zendesk_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Ticket Closed',
            properties: {
              event: 'ticket_closed'
            },
            credentials: ['zendeskApi']
          }
        },
        {
          id: 'delay-1',
          type: 'delay',
          position: { x: 300, y: 200 },
          data: {
            label: 'Wait 2 Hours',
            properties: {
              delayType: 'fixed',
              duration: 7200
            }
          }
        },
        {
          id: 'typeform-1',
          type: 'typeform',
          position: { x: 500, y: 200 },
          data: {
            label: 'Send Survey',
            properties: {
              operation: 'createResponse',
              formId: 'csat-survey',
              email: '={{$input.requester.email}}',
              hiddenFields: {
                ticket_id: '={{$input.id}}'
              }
            },
            credentials: ['typeformApi']
          }
        },
        {
          id: 'salesforce-1',
          type: 'salesforce',
          position: { x: 700, y: 200 },
          data: {
            label: 'Log to CRM',
            properties: {
              operation: 'createRecord',
              object: 'SurveyResponse',
              email: '={{$input.requester.email}}',
              ticketId: '={{$input.id}}'
            },
            credentials: ['salesforceApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'delay-1' },
        { id: 'e2', source: 'delay-1', target: 'typeform-1' },
        { id: 'e3', source: 'typeform-1', target: 'salesforce-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date(),
    downloads: 543,
    rating: 4.4,
    reviewCount: 56,
    featured: false,
    requiredIntegrations: ['zendesk_trigger', 'delay', 'typeform', 'salesforce'],
    requiredCredentials: ['zendeskApi', 'typeformApi', 'salesforceApi'],
    estimatedSetupTime: 20,
    documentation: {
      overview: 'Gather customer feedback after ticket resolution.',
      setup: [],
      usage: 'Automatically sends surveys when tickets are closed.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'feedback-survey-analysis',
    name: 'Feedback Survey Analysis',
    description: 'Collect customer feedback via forms and analyze sentiment with AI, then route to appropriate teams.',
    category: 'customer_support',
    subcategory: 'feedback',
    author: 'System',
    authorType: 'official',
    tags: ['forms', 'feedback', 'ai', 'sentiment', 'survey'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'form-1',
          type: 'formTrigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Feedback Form',
            properties: {
              title: 'Customer Feedback',
              fields: ['name', 'email', 'rating', 'feedback']
            }
          }
        },
        {
          id: 'ai-1',
          type: 'openai',
          position: { x: 300, y: 200 },
          data: {
            label: 'Analyze Sentiment',
            properties: {
              model: 'gpt-4',
              prompt: 'Analyze the sentiment of this feedback and categorize it: {{$input.feedback}}'
            },
            credentials: ['openaiApi']
          }
        },
        {
          id: 'route-1',
          type: 'switchCase',
          position: { x: 500, y: 200 },
          data: {
            label: 'Route by Sentiment',
            properties: {
              field: '={{$node["ai-1"].json.sentiment}}',
              cases: ['positive', 'negative', 'neutral']
            }
          }
        },
        {
          id: 'slack-positive',
          type: 'slack',
          position: { x: 700, y: 100 },
          data: {
            label: 'Share Positive',
            properties: {
              channel: '#wins',
              text: 'Great feedback from {{$input.name}}: {{$input.feedback}}'
            },
            credentials: ['slackApi']
          }
        },
        {
          id: 'slack-negative',
          type: 'slack',
          position: { x: 700, y: 300 },
          data: {
            label: 'Alert Support',
            properties: {
              channel: '#support-urgent',
              text: 'Negative feedback needs attention from {{$input.name}}: {{$input.feedback}}'
            },
            credentials: ['slackApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'form-1', target: 'ai-1' },
        { id: 'e2', source: 'ai-1', target: 'route-1' },
        { id: 'e3', source: 'route-1', target: 'slack-positive', sourceHandle: 'positive' },
        { id: 'e4', source: 'route-1', target: 'slack-negative', sourceHandle: 'negative' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-02'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.8,
    reviewCount: 0,
    featured: true,
    requiredIntegrations: ['formTrigger', 'openai', 'switchCase', 'slack'],
    requiredCredentials: ['openaiApi', 'slackApi'],
    estimatedSetupTime: 15,
    documentation: {
      overview: 'AI-powered feedback analysis and routing.',
      setup: [],
      usage: 'Share feedback form with customers.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'ai-customer-support-chat',
    name: 'AI Customer Support Chat',
    description: 'AI-powered customer support chatbot that can answer FAQs and escalate to human agents.',
    category: 'customer_support',
    subcategory: 'chat',
    author: 'System',
    authorType: 'official',
    tags: ['chat', 'ai', 'support', 'chatbot', 'gpt'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'chat-1',
          type: 'chatTrigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Support Chat',
            properties: {
              title: 'Customer Support',
              streaming: true,
              memory: true,
              memoryType: 'buffer'
            }
          }
        },
        {
          id: 'ai-1',
          type: 'openai',
          position: { x: 300, y: 200 },
          data: {
            label: 'AI Response',
            properties: {
              model: 'gpt-4',
              systemPrompt: 'You are a helpful customer support agent. Answer questions based on the knowledge base.',
              userMessage: '={{$input.message}}',
              temperature: 0.7
            },
            credentials: ['openaiApi']
          }
        },
        {
          id: 'classify-1',
          type: 'code',
          position: { x: 500, y: 200 },
          data: {
            label: 'Check Escalation',
            properties: {
              code: `// Check if needs human escalation
const needsHuman = response.includes("I'm not sure") ||
                   message.toLowerCase().includes("speak to human") ||
                   message.toLowerCase().includes("agent");
return [{response, needsHuman}];`
            }
          }
        },
        {
          id: 'zendesk-1',
          type: 'zendesk',
          position: { x: 700, y: 300 },
          data: {
            label: 'Create Ticket',
            properties: {
              operation: 'createTicket',
              subject: 'Chat Escalation',
              description: '={{$input.conversationHistory}}'
            },
            credentials: ['zendeskApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'chat-1', target: 'ai-1' },
        { id: 'e2', source: 'ai-1', target: 'classify-1' },
        { id: 'e3', source: 'classify-1', target: 'zendesk-1', sourceHandle: 'escalate' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-05'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.9,
    reviewCount: 0,
    featured: true,
    requiredIntegrations: ['chatTrigger', 'openai', 'code', 'zendesk'],
    requiredCredentials: ['openaiApi', 'zendeskApi'],
    estimatedSetupTime: 20,
    documentation: {
      overview: 'AI chatbot with human escalation.',
      setup: [],
      usage: 'Embed chat widget on website.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'zendesk-ticket-routing',
    name: 'Zendesk Ticket Auto-Routing',
    description: 'Automatically categorize and route support tickets to the right team.',
    category: 'customer_support',
    subcategory: 'tickets',
    author: 'System',
    authorType: 'official',
    tags: ['zendesk', 'tickets', 'routing', 'support'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'zendesk_trigger', position: { x: 100, y: 200 }, data: { label: 'New Ticket', properties: { event: 'ticket.created' }, credentials: ['zendeskApi'] } },
        { id: 'ai-1', type: 'openai', position: { x: 300, y: 200 }, data: { label: 'Classify Ticket', properties: { model: 'gpt-4', prompt: 'Classify this ticket: {{$input.subject}}' }, credentials: ['openaiApi'] } },
        { id: 'zendesk-1', type: 'zendesk', position: { x: 500, y: 200 }, data: { label: 'Assign Team', properties: { operation: 'updateTicket', group: '={{$node["ai-1"].json.category}}' }, credentials: ['zendeskApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'ai-1' },
        { id: 'e2', source: 'ai-1', target: 'zendesk-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-06'), updatedAt: new Date(), downloads: 0, rating: 4.8, reviewCount: 0, featured: true,
    requiredIntegrations: ['zendesk_trigger', 'openai', 'zendesk'], requiredCredentials: ['zendeskApi', 'openaiApi'], estimatedSetupTime: 20,
    documentation: { overview: 'AI-powered ticket routing.', setup: [], usage: 'Auto-categorizes incoming tickets.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'intercom-conversation-sync',
    name: 'Intercom to CRM Sync',
    description: 'Sync Intercom conversations to your CRM for unified customer view.',
    category: 'customer_support',
    subcategory: 'crm',
    author: 'System',
    authorType: 'official',
    tags: ['intercom', 'crm', 'sync', 'conversations'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'intercom_trigger', position: { x: 100, y: 200 }, data: { label: 'Conversation Closed', properties: { event: 'conversation.closed' }, credentials: ['intercomApi'] } },
        { id: 'hubspot-1', type: 'hubspot', position: { x: 300, y: 200 }, data: { label: 'Log Activity', properties: { operation: 'createEngagement', type: 'NOTE' }, credentials: ['hubspotApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'hubspot-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-07'), updatedAt: new Date(), downloads: 0, rating: 4.6, reviewCount: 0, featured: false,
    requiredIntegrations: ['intercom_trigger', 'hubspot'], requiredCredentials: ['intercomApi', 'hubspotApi'], estimatedSetupTime: 15,
    documentation: { overview: 'Keep CRM in sync with support.', setup: [], usage: 'Logs conversations to CRM.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'freshdesk-sla-monitor',
    name: 'Freshdesk SLA Monitor',
    description: 'Monitor SLA breaches and escalate tickets automatically.',
    category: 'customer_support',
    subcategory: 'sla',
    author: 'System',
    authorType: 'official',
    tags: ['freshdesk', 'sla', 'escalation', 'monitoring'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Every 15 Min', properties: { cron: '*/15 * * * *' } } },
        { id: 'freshdesk-1', type: 'freshdesk', position: { x: 300, y: 200 }, data: { label: 'Get Tickets', properties: { operation: 'getTickets', filter: 'sla_breaching' }, credentials: ['freshdeskApi'] } },
        { id: 'slack-1', type: 'slack', position: { x: 500, y: 200 }, data: { label: 'Alert Managers', properties: { channel: '#support-escalations' }, credentials: ['slackApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'freshdesk-1' },
        { id: 'e2', source: 'freshdesk-1', target: 'slack-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-08'), updatedAt: new Date(), downloads: 0, rating: 4.7, reviewCount: 0, featured: false,
    requiredIntegrations: ['schedule_trigger', 'freshdesk', 'slack'], requiredCredentials: ['freshdeskApi', 'slackApi'], estimatedSetupTime: 15,
    documentation: { overview: 'Never miss an SLA.', setup: [], usage: 'Monitors SLA compliance.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'customer-satisfaction-survey',
    name: 'Customer Satisfaction Survey',
    description: 'Send CSAT surveys after ticket resolution and track scores.',
    category: 'customer_support',
    subcategory: 'feedback',
    author: 'System',
    authorType: 'official',
    tags: ['csat', 'survey', 'feedback', 'support'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'zendesk_trigger', position: { x: 100, y: 200 }, data: { label: 'Ticket Solved', properties: { event: 'ticket.solved' }, credentials: ['zendeskApi'] } },
        { id: 'delay-1', type: 'delay', position: { x: 300, y: 200 }, data: { label: 'Wait 1 Hour', properties: { duration: 3600000 } } },
        { id: 'email-1', type: 'sendgrid', position: { x: 500, y: 200 }, data: { label: 'Send Survey', properties: { templateId: 'csat-survey' }, credentials: ['sendgridApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'delay-1' },
        { id: 'e2', source: 'delay-1', target: 'email-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-09'), updatedAt: new Date(), downloads: 0, rating: 4.5, reviewCount: 0, featured: false,
    requiredIntegrations: ['zendesk_trigger', 'delay', 'sendgrid'], requiredCredentials: ['zendeskApi', 'sendgridApi'], estimatedSetupTime: 10,
    documentation: { overview: 'Measure customer satisfaction.', setup: [], usage: 'Sends surveys after resolution.' }, screenshots: [], customizableFields: [], pricing: 'free'
  }
];

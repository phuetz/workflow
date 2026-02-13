/**
 * Workflow Templates - marketing
 */

import type { WorkflowTemplate } from '../../types/templates';

export const MARKETING_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'contact-form-to-crm',
    name: 'Contact Form to CRM',
    description: 'Capture contact form submissions and automatically create leads in your CRM with email notification.',
    category: 'lead_generation',
    subcategory: 'forms',
    author: 'System',
    authorType: 'official',
    tags: ['forms', 'crm', 'leads', 'contact', 'hubspot'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        {
          id: 'form-1',
          type: 'formTrigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Contact Form',
            properties: {
              title: 'Contact Us',
              fields: ['name', 'email', 'phone', 'company', 'message']
            }
          }
        },
        {
          id: 'hubspot-1',
          type: 'hubspot',
          position: { x: 300, y: 200 },
          data: {
            label: 'Create Contact',
            properties: {
              operation: 'createContact',
              email: '={{$input.email}}',
              firstName: '={{$input.name.split(" ")[0]}}',
              lastName: '={{$input.name.split(" ")[1] || ""}}',
              phone: '={{$input.phone}}',
              company: '={{$input.company}}'
            },
            credentials: ['hubspotApi']
          }
        },
        {
          id: 'email-1',
          type: 'sendgrid',
          position: { x: 500, y: 200 },
          data: {
            label: 'Notify Sales',
            properties: {
              to: 'sales@company.com',
              subject: 'New Contact Form Submission',
              text: 'New lead from {{$input.name}} at {{$input.company}}'
            },
            credentials: ['sendgridApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'form-1', target: 'hubspot-1' },
        { id: 'e2', source: 'hubspot-1', target: 'email-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.9,
    reviewCount: 0,
    featured: true,
    requiredIntegrations: ['formTrigger', 'hubspot', 'sendgrid'],
    requiredCredentials: ['hubspotApi', 'sendgridApi'],
    estimatedSetupTime: 10,
    documentation: {
      overview: 'Convert form submissions into CRM contacts automatically.',
      setup: [],
      usage: 'Embed the generated form on your website.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  }
];

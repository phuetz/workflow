/**
 * Workflow Templates - businessAutomation
 */

import type { WorkflowTemplate } from '../../types/templates';

export const BUSINESS_AUTOMATION_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'invoice-processing-automation',
    name: 'Invoice Processing Automation',
    description: 'Automatically extract data from incoming invoices, validate information, and update your accounting system with OCR and AI.',
    category: 'business_automation',
    subcategory: 'finance',
    author: 'System',
    authorType: 'official',
    tags: ['invoices', 'ocr', 'accounting', 'automation', 'ai'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'email_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Invoice Email Trigger',
            properties: {
              folder: 'Invoices',
              hasAttachments: true
            },
            notes: 'Monitors email for incoming invoices'
          },
          customizable: true,
          required: true
        },
        {
          id: 'ocr-1',
          type: 'ocr',
          position: { x: 300, y: 200 },
          data: {
            label: 'Extract Invoice Data',
            properties: {
              engine: 'google-vision',
              extractFields: ['invoice_number', 'date', 'amount', 'vendor', 'line_items']
            },
            credentials: ['googleVisionApi']
          }
        },
        {
          id: 'validate-1',
          type: 'code_javascript',
          position: { x: 500, y: 200 },
          data: {
            label: 'Validate Data',
            properties: {
              code: `// Validate extracted invoice data
const errors = [];
if (!data.invoice_number) errors.push('Missing invoice number');
if (!data.amount || isNaN(data.amount)) errors.push('Invalid amount');
if (!data.vendor) errors.push('Missing vendor');

return [{
  ...data,
  valid: errors.length === 0,
  errors
}];`
            }
          }
        },
        {
          id: 'quickbooks-1',
          type: 'quickbooks',
          position: { x: 700, y: 200 },
          data: {
            label: 'Create Bill in QuickBooks',
            properties: {
              operation: 'createBill',
              vendorName: '={{$node["ocr-1"].json.vendor}}',
              amount: '={{$node["ocr-1"].json.amount}}',
              invoiceNumber: '={{$node["ocr-1"].json.invoice_number}}'
            },
            credentials: ['quickbooksApi']
          },
          customizable: true
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'ocr-1' },
        { id: 'e2', source: 'ocr-1', target: 'validate-1' },
        { id: 'e3', source: 'validate-1', target: 'quickbooks-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    downloads: 823,
    rating: 4.7,
    reviewCount: 94,
    featured: true,
    requiredIntegrations: ['email_trigger', 'ocr', 'code_javascript', 'quickbooks'],
    requiredCredentials: ['googleVisionApi', 'quickbooksApi'],
    estimatedSetupTime: 25,
    documentation: {
      overview: 'Automate invoice processing with OCR, validation, and accounting integration.',
      setup: [
        {
          step: 1,
          title: 'Configure Email Trigger',
          description: 'Set up email monitoring for incoming invoices.'
        },
        {
          step: 2,
          title: 'Set Up OCR Service',
          description: 'Configure Google Vision or another OCR service.'
        },
        {
          step: 3,
          title: 'Connect Accounting System',
          description: 'Link QuickBooks or your accounting platform.'
        }
      ],
      usage: 'Forward invoices to the monitored email and they will be processed automatically.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  }
];

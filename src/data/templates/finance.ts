/**
 * Workflow Templates - finance
 */

import type { WorkflowTemplate } from '../../types/templates';

export const FINANCE_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'expense-report-processing',
    name: 'Expense Report Processing',
    description: 'Automatically process and approve expense reports with receipt validation and accounting integration.',
    category: 'finance',
    subcategory: 'expenses',
    author: 'System',
    authorType: 'official',
    tags: ['expenses', 'finance', 'accounting', 'receipts', 'approval'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'email_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Receipt Email',
            properties: {
              folder: 'Expenses',
              hasAttachments: true
            }
          }
        },
        {
          id: 'ocr-1',
          type: 'ocr',
          position: { x: 300, y: 200 },
          data: {
            label: 'Extract Receipt Data',
            properties: {
              engine: 'google-vision',
              extractFields: ['merchant', 'date', 'amount', 'category']
            },
            credentials: ['googleVisionApi']
          }
        },
        {
          id: 'validate-1',
          type: 'code_javascript',
          position: { x: 500, y: 200 },
          data: {
            label: 'Validate Expense',
            properties: {
              code: `// Validate expense against policy
const errors = [];

if (expense.amount > 500) {
  errors.push('Requires manager approval');
}

if (!expense.category) {
  errors.push('Missing category');
}

return [{
  ...expense,
  needsApproval: expense.amount > 500,
  valid: errors.length === 0,
  errors
}];`
            }
          }
        },
        {
          id: 'xero-1',
          type: 'xero',
          position: { x: 700, y: 150 },
          data: {
            label: 'Create Expense',
            properties: {
              operation: 'createExpense',
              amount: '={{$node["ocr-1"].json.amount}}',
              merchant: '={{$node["ocr-1"].json.merchant}}',
              category: '={{$node["ocr-1"].json.category}}'
            },
            credentials: ['xeroApi']
          }
        },
        {
          id: 'slack-1',
          type: 'slack',
          position: { x: 700, y: 250 },
          data: {
            label: 'Request Approval',
            properties: {
              channel: '#approvals',
              text: 'Expense approval needed: ${{$node["ocr-1"].json.amount}} from {{$node["ocr-1"].json.merchant}}'
            },
            credentials: ['slackApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'ocr-1' },
        { id: 'e2', source: 'ocr-1', target: 'validate-1' },
        { id: 'e3', source: 'validate-1', target: 'xero-1', sourceHandle: 'auto-approved' },
        { id: 'e4', source: 'validate-1', target: 'slack-1', sourceHandle: 'needs-approval' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-28'),
    updatedAt: new Date(),
    downloads: 445,
    rating: 4.5,
    reviewCount: 48,
    featured: false,
    requiredIntegrations: ['email_trigger', 'ocr', 'code_javascript', 'xero', 'slack'],
    requiredCredentials: ['googleVisionApi', 'xeroApi', 'slackApi'],
    estimatedSetupTime: 25,
    documentation: {
      overview: 'Streamline expense report processing with OCR and automation.',
      setup: [],
      usage: 'Forward receipts to the monitored email for automatic processing.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'payment-reminder-system',
    name: 'Payment Reminder System',
    description: 'Send automated payment reminders for overdue invoices with escalation rules.',
    category: 'finance',
    subcategory: 'collections',
    author: 'System',
    authorType: 'official',
    tags: ['invoices', 'payments', 'reminders', 'collections', 'ar'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'schedule_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Daily Check',
            properties: {
              cron: '0 9 * * *',
              timezone: 'UTC'
            }
          }
        },
        {
          id: 'quickbooks-1',
          type: 'quickbooks',
          position: { x: 300, y: 200 },
          data: {
            label: 'Get Overdue Invoices',
            properties: {
              operation: 'getInvoices',
              status: 'overdue'
            },
            credentials: ['quickbooksApi']
          }
        },
        {
          id: 'classify-1',
          type: 'code_javascript',
          position: { x: 500, y: 200 },
          data: {
            label: 'Classify by Age',
            properties: {
              code: `// Classify invoice by days overdue
const daysOverdue = Math.floor((Date.now() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24));

let reminderType = 'gentle';
if (daysOverdue > 30) {
  reminderType = 'urgent';
} else if (daysOverdue > 14) {
  reminderType = 'firm';
}

return [{...invoice, daysOverdue, reminderType}];`
            }
          }
        },
        {
          id: 'email-1',
          type: 'sendgrid',
          position: { x: 700, y: 200 },
          data: {
            label: 'Send Reminder',
            properties: {
              to: '={{$input.customerEmail}}',
              subject: 'Payment Reminder: Invoice #{{$input.invoiceNumber}}',
              templateId: 'payment-reminder-{{$node["classify-1"].json.reminderType}}'
            },
            credentials: ['sendgridApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'quickbooks-1' },
        { id: 'e2', source: 'quickbooks-1', target: 'classify-1' },
        { id: 'e3', source: 'classify-1', target: 'email-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date(),
    downloads: 756,
    rating: 4.6,
    reviewCount: 82,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'quickbooks', 'code_javascript', 'sendgrid'],
    requiredCredentials: ['quickbooksApi', 'sendgridApi'],
    estimatedSetupTime: 15,
    documentation: {
      overview: 'Automated payment reminders with escalation based on invoice age.',
      setup: [],
      usage: 'Runs daily to check for and remind on overdue invoices.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'invoice-processing',
    name: 'Invoice Processing Automation',
    description: 'Automatically process incoming invoices with OCR and approval workflow.',
    category: 'finance',
    subcategory: 'invoices',
    author: 'System',
    authorType: 'official',
    tags: ['invoices', 'ocr', 'approval', 'accounting'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'email_trigger', position: { x: 100, y: 200 }, data: { label: 'Invoice Email', properties: { filter: 'subject:invoice' }, credentials: ['emailApi'] } },
        { id: 'ocr-1', type: 'googleDocumentAI', position: { x: 300, y: 200 }, data: { label: 'Extract Data', properties: { processor: 'invoice' }, credentials: ['googleCloudApi'] } },
        { id: 'approval-1', type: 'approval', position: { x: 500, y: 200 }, data: { label: 'Manager Approval', properties: { approvers: ['finance-manager'] } } },
        { id: 'quickbooks-1', type: 'quickbooks', position: { x: 700, y: 200 }, data: { label: 'Create Bill', properties: { operation: 'createBill' }, credentials: ['quickbooksApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'ocr-1' },
        { id: 'e2', source: 'ocr-1', target: 'approval-1' },
        { id: 'e3', source: 'approval-1', target: 'quickbooks-1', sourceHandle: 'approved' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-14'), updatedAt: new Date(), downloads: 0, rating: 4.9, reviewCount: 0, featured: true,
    requiredIntegrations: ['email_trigger', 'googleDocumentAI', 'approval', 'quickbooks'], requiredCredentials: ['emailApi', 'googleCloudApi', 'quickbooksApi'], estimatedSetupTime: 45,
    documentation: { overview: 'End-to-end invoice automation.', setup: [], usage: 'Forward invoices to inbox.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'expense-report-workflow',
    name: 'Expense Report Workflow',
    description: 'Automate expense submissions with receipt scanning and approval.',
    category: 'finance',
    subcategory: 'expenses',
    author: 'System',
    authorType: 'official',
    tags: ['expenses', 'receipts', 'approval', 'finance'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'form-1', type: 'formTrigger', position: { x: 100, y: 200 }, data: { label: 'Expense Form', properties: { title: 'Expense Report', fields: ['description', 'amount', 'receipt', 'category'] } } },
        { id: 'ocr-1', type: 'googleDocumentAI', position: { x: 300, y: 200 }, data: { label: 'Scan Receipt', properties: { processor: 'receipt' }, credentials: ['googleCloudApi'] } },
        { id: 'approval-1', type: 'approval', position: { x: 500, y: 200 }, data: { label: 'Manager Approval', properties: { approvers: ['manager'] } } },
        { id: 'xero-1', type: 'xero', position: { x: 700, y: 200 }, data: { label: 'Record Expense', properties: { operation: 'createExpense' }, credentials: ['xeroApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'form-1', target: 'ocr-1' },
        { id: 'e2', source: 'ocr-1', target: 'approval-1' },
        { id: 'e3', source: 'approval-1', target: 'xero-1', sourceHandle: 'approved' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-15'), updatedAt: new Date(), downloads: 0, rating: 4.7, reviewCount: 0, featured: false,
    requiredIntegrations: ['formTrigger', 'googleDocumentAI', 'approval', 'xero'], requiredCredentials: ['googleCloudApi', 'xeroApi'], estimatedSetupTime: 35,
    documentation: { overview: 'Streamlined expense management.', setup: [], usage: 'Submit expenses via form.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'payment-reconciliation',
    name: 'Payment Reconciliation',
    description: 'Automatically reconcile payments between Stripe and your accounting system.',
    category: 'finance',
    subcategory: 'reconciliation',
    author: 'System',
    authorType: 'official',
    tags: ['reconciliation', 'stripe', 'accounting', 'payments'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Daily', properties: { cron: '0 6 * * *' } } },
        { id: 'stripe-1', type: 'stripe', position: { x: 300, y: 150 }, data: { label: 'Get Payments', properties: { operation: 'listPayments' }, credentials: ['stripeApi'] } },
        { id: 'quickbooks-1', type: 'quickbooks', position: { x: 300, y: 250 }, data: { label: 'Get Invoices', properties: { operation: 'listInvoices' }, credentials: ['quickbooksApi'] } },
        { id: 'code-1', type: 'code', position: { x: 500, y: 200 }, data: { label: 'Match Payments', properties: { code: '// Reconciliation logic' } } },
        { id: 'sheets-1', type: 'googleSheets', position: { x: 700, y: 200 }, data: { label: 'Log Results', properties: { operation: 'appendRow' }, credentials: ['googleSheetsApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'stripe-1' },
        { id: 'e2', source: 'trigger-1', target: 'quickbooks-1' },
        { id: 'e3', source: 'stripe-1', target: 'code-1' },
        { id: 'e4', source: 'quickbooks-1', target: 'code-1' },
        { id: 'e5', source: 'code-1', target: 'sheets-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-16'), updatedAt: new Date(), downloads: 0, rating: 4.8, reviewCount: 0, featured: false,
    requiredIntegrations: ['schedule_trigger', 'stripe', 'quickbooks', 'code', 'googleSheets'], requiredCredentials: ['stripeApi', 'quickbooksApi', 'googleSheetsApi'], estimatedSetupTime: 40,
    documentation: { overview: 'Automated payment matching.', setup: [], usage: 'Runs daily reconciliation.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'monthly-financial-report',
    name: 'Monthly Financial Report',
    description: 'Generate and distribute monthly financial reports automatically.',
    category: 'finance',
    subcategory: 'reporting',
    author: 'System',
    authorType: 'official',
    tags: ['reports', 'finance', 'monthly', 'automation'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Monthly', properties: { cron: '0 9 1 * *' } } },
        { id: 'quickbooks-1', type: 'quickbooks', position: { x: 300, y: 200 }, data: { label: 'Get Financials', properties: { operation: 'getReport', report: 'profitLoss' }, credentials: ['quickbooksApi'] } },
        { id: 'code-1', type: 'code', position: { x: 500, y: 200 }, data: { label: 'Format Report', properties: { code: '// Format financial data' } } },
        { id: 'email-1', type: 'sendgrid', position: { x: 700, y: 200 }, data: { label: 'Send Report', properties: { to: 'leadership@company.com', templateId: 'financial-report' }, credentials: ['sendgridApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'quickbooks-1' },
        { id: 'e2', source: 'quickbooks-1', target: 'code-1' },
        { id: 'e3', source: 'code-1', target: 'email-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-17'), updatedAt: new Date(), downloads: 0, rating: 4.6, reviewCount: 0, featured: false,
    requiredIntegrations: ['schedule_trigger', 'quickbooks', 'code', 'sendgrid'], requiredCredentials: ['quickbooksApi', 'sendgridApi'], estimatedSetupTime: 25,
    documentation: { overview: 'Automated financial reporting.', setup: [], usage: 'Runs on first of month.' }, screenshots: [], customizableFields: [], pricing: 'free'
  }
];

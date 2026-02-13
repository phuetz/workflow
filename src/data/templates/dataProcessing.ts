/**
 * Workflow Templates - dataProcessing
 */

import type { WorkflowTemplate } from '../../types/templates';

export const DATA_PROCESSING_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'data-validation-pipeline',
    name: 'Data Validation Pipeline',
    description: 'Validate and clean incoming data with comprehensive error handling and quality checks.',
    category: 'data_processing',
    subcategory: 'validation',
    author: 'System',
    authorType: 'official',
    tags: ['data', 'validation', 'quality', 'cleaning', 'etl'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Data Input',
            properties: {
              path: '/validate-data',
              methods: ['POST']
            }
          }
        },
        {
          id: 'validate-1',
          type: 'code_javascript',
          position: { x: 300, y: 200 },
          data: {
            label: 'Validate Schema',
            properties: {
              code: `// Validate data against schema
const errors = [];
const required = ['email', 'name', 'phone'];

required.forEach(field => {
  if (!data[field]) errors.push('Missing: ' + field);
});

// Email validation
if (data.email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(data.email)) {
  errors.push('Invalid email format');
}

// Phone validation
if (data.phone && !/^\\+?[1-9]\\d{1,14}$/.test(data.phone)) {
  errors.push('Invalid phone format');
}

return [{
  ...data,
  valid: errors.length === 0,
  errors
}];`
            }
          }
        },
        {
          id: 'clean-1',
          type: 'code_javascript',
          position: { x: 500, y: 150 },
          data: {
            label: 'Clean Data',
            properties: {
              code: `// Clean and normalize data
return [{
  email: data.email?.toLowerCase().trim(),
  name: data.name?.trim(),
  phone: data.phone?.replace(/\\D/g, ''),
  createdAt: new Date().toISOString()
}];`
            }
          }
        },
        {
          id: 'store-1',
          type: 'airtable',
          position: { x: 700, y: 150 },
          data: {
            label: 'Store Valid Data',
            properties: {
              operation: 'createRecord',
              table: 'ValidatedData',
              fields: '={{$node["clean-1"].json}}'
            },
            credentials: ['airtableApi']
          }
        },
        {
          id: 'error-log',
          type: 'slack',
          position: { x: 500, y: 250 },
          data: {
            label: 'Log Errors',
            properties: {
              channel: '#data-errors',
              text: 'Data validation failed: {{$node["validate-1"].json.errors.join(", ")}}'
            },
            credentials: ['slackApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'validate-1' },
        { id: 'e2', source: 'validate-1', target: 'clean-1', sourceHandle: 'valid' },
        { id: 'e3', source: 'validate-1', target: 'error-log', sourceHandle: 'invalid' },
        { id: 'e4', source: 'clean-1', target: 'store-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-03-12'),
    updatedAt: new Date(),
    downloads: 612,
    rating: 4.7,
    reviewCount: 71,
    featured: false,
    requiredIntegrations: ['webhook_trigger', 'code_javascript', 'airtable', 'slack'],
    requiredCredentials: ['airtableApi', 'slackApi'],
    estimatedSetupTime: 30,
    documentation: {
      overview: 'Comprehensive data validation and cleaning pipeline.',
      setup: [],
      usage: 'Send data via webhook for validation and storage.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'crm-database-sync',
    name: 'CRM Database Sync',
    description: 'Keep your CRM and database in sync with bi-directional data synchronization.',
    category: 'data_processing',
    subcategory: 'sync',
    author: 'System',
    authorType: 'official',
    tags: ['sync', 'crm', 'database', 'integration', 'data'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'salesforce_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Contact Updated',
            properties: {
              event: 'contact_updated'
            },
            credentials: ['salesforceApi']
          }
        },
        {
          id: 'transform-1',
          type: 'transform',
          position: { x: 300, y: 200 },
          data: {
            label: 'Map Fields',
            properties: {
              mappings: {
                email: '={{$input.Email}}',
                name: '={{$input.Name}}',
                phone: '={{$input.Phone}}'
              }
            }
          }
        },
        {
          id: 'postgres-1',
          type: 'postgresql',
          position: { x: 500, y: 200 },
          data: {
            label: 'Upsert Record',
            properties: {
              operation: 'upsert',
              table: 'contacts',
              conflictColumn: 'email'
            },
            credentials: ['postgresApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'transform-1' },
        { id: 'e2', source: 'transform-1', target: 'postgres-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-15'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.6,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['salesforce_trigger', 'transform', 'postgresql'],
    requiredCredentials: ['salesforceApi', 'postgresApi'],
    estimatedSetupTime: 25,
    documentation: {
      overview: 'Bi-directional CRM sync.',
      setup: [],
      usage: 'Automatically syncs on CRM updates.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'spreadsheet-database-import',
    name: 'Spreadsheet Database Import',
    description: 'Import data from spreadsheets into your database with validation and error handling.',
    category: 'data_processing',
    subcategory: 'import',
    author: 'System',
    authorType: 'official',
    tags: ['import', 'spreadsheet', 'database', 'etl', 'data'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'googleDrive_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'New Spreadsheet',
            properties: {
              folder: 'imports',
              fileTypes: ['spreadsheet']
            },
            credentials: ['googleDriveApi']
          }
        },
        {
          id: 'sheets-1',
          type: 'googleSheets',
          position: { x: 300, y: 200 },
          data: {
            label: 'Read Data',
            properties: {
              operation: 'getValues',
              spreadsheetId: '={{$input.fileId}}',
              range: 'Sheet1!A:Z'
            },
            credentials: ['googleSheetsApi']
          }
        },
        {
          id: 'validate-1',
          type: 'code',
          position: { x: 500, y: 200 },
          data: {
            label: 'Validate Rows',
            properties: {
              code: `// Validate each row
const valid = [];
const invalid = [];
rows.forEach((row, i) => {
  if (row.email && row.name) {
    valid.push(row);
  } else {
    invalid.push({row: i, errors: ['Missing required fields']});
  }
});
return [{valid, invalid}];`
            }
          }
        },
        {
          id: 'postgres-1',
          type: 'postgresql',
          position: { x: 700, y: 150 },
          data: {
            label: 'Insert Valid',
            properties: {
              operation: 'insert',
              table: 'imported_data'
            },
            credentials: ['postgresApi']
          }
        },
        {
          id: 'slack-1',
          type: 'slack',
          position: { x: 700, y: 250 },
          data: {
            label: 'Report Errors',
            properties: {
              channel: '#data-imports',
              text: 'Import completed: {{$node["validate-1"].json.valid.length}} success, {{$node["validate-1"].json.invalid.length}} failed'
            },
            credentials: ['slackApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'sheets-1' },
        { id: 'e2', source: 'sheets-1', target: 'validate-1' },
        { id: 'e3', source: 'validate-1', target: 'postgres-1' },
        { id: 'e4', source: 'validate-1', target: 'slack-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-16'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.5,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['googleDrive_trigger', 'googleSheets', 'code', 'postgresql', 'slack'],
    requiredCredentials: ['googleDriveApi', 'googleSheetsApi', 'postgresApi', 'slackApi'],
    estimatedSetupTime: 25,
    documentation: {
      overview: 'Spreadsheet to database import with validation.',
      setup: [],
      usage: 'Upload spreadsheets to monitored folder.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  }
];

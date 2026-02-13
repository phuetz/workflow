/**
 * DataTemplates.ts
 *
 * Data processing workflow templates including imports, transformations, and aggregation.
 *
 * @module data/templates/misc/DataTemplates
 */

import type { WorkflowTemplate } from '../../../types/templates';

export const DATA_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'csv-to-database',
    name: 'CSV to Database Import',
    description: 'Automatically import CSV files to your database.',
    category: 'data',
    subcategory: 'import',
    author: 'System',
    authorType: 'official',
    tags: ['csv', 'database', 'import', 'data'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'googleDrive_trigger', position: { x: 100, y: 200 }, data: { label: 'New CSV', properties: { folder: 'Imports', mimeType: 'text/csv' }, credentials: ['googleDriveApi'] } },
        { id: 'download-1', type: 'googleDrive', position: { x: 300, y: 200 }, data: { label: 'Download', properties: { operation: 'download' }, credentials: ['googleDriveApi'] } },
        { id: 'csv-1', type: 'csvParser', position: { x: 500, y: 200 }, data: { label: 'Parse CSV', properties: { delimiter: ',' } } },
        { id: 'postgres-1', type: 'postgres', position: { x: 700, y: 200 }, data: { label: 'Insert Data', properties: { operation: 'insert', table: 'imports' }, credentials: ['postgresApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'download-1' },
        { id: 'e2', source: 'download-1', target: 'csv-1' },
        { id: 'e3', source: 'csv-1', target: 'postgres-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.7,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['googleDrive_trigger', 'googleDrive', 'csvParser', 'postgres'],
    requiredCredentials: ['googleDriveApi', 'postgresApi'],
    estimatedSetupTime: 20,
    documentation: {
      overview: 'CSV to database automation.',
      setup: [],
      usage: 'Drop CSV files in folder.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'data-deduplication',
    name: 'Data Deduplication',
    description: 'Identify and merge duplicate records across systems.',
    category: 'data',
    subcategory: 'quality',
    author: 'System',
    authorType: 'official',
    tags: ['deduplication', 'data quality', 'cleaning', 'merge'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Weekly', properties: { cron: '0 2 * * 0' } } },
        { id: 'hubspot-1', type: 'hubspot', position: { x: 300, y: 200 }, data: { label: 'Get Contacts', properties: { operation: 'getContacts' }, credentials: ['hubspotApi'] } },
        { id: 'code-1', type: 'code', position: { x: 500, y: 200 }, data: { label: 'Find Duplicates', properties: { code: '// Fuzzy matching logic' } } },
        { id: 'hubspot-2', type: 'hubspot', position: { x: 700, y: 200 }, data: { label: 'Merge Duplicates', properties: { operation: 'mergeContacts' }, credentials: ['hubspotApi'] } },
        { id: 'sheets-1', type: 'googleSheets', position: { x: 900, y: 200 }, data: { label: 'Log Report', properties: { operation: 'appendRow' }, credentials: ['googleSheetsApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'hubspot-1' },
        { id: 'e2', source: 'hubspot-1', target: 'code-1' },
        { id: 'e3', source: 'code-1', target: 'hubspot-2' },
        { id: 'e4', source: 'hubspot-2', target: 'sheets-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-08-02'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.6,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'hubspot', 'code', 'googleSheets'],
    requiredCredentials: ['hubspotApi', 'googleSheetsApi'],
    estimatedSetupTime: 40,
    documentation: {
      overview: 'Automated duplicate detection.',
      setup: [],
      usage: 'Runs weekly cleanup.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'api-data-aggregation',
    name: 'API Data Aggregation',
    description: 'Aggregate data from multiple APIs into a single report.',
    category: 'data',
    subcategory: 'aggregation',
    author: 'System',
    authorType: 'official',
    tags: ['api', 'aggregation', 'reports', 'data'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Daily', properties: { cron: '0 6 * * *' } } },
        { id: 'http-1', type: 'httpRequest', position: { x: 300, y: 100 }, data: { label: 'API 1', properties: { url: 'https://api1.com/data' } } },
        { id: 'http-2', type: 'httpRequest', position: { x: 300, y: 200 }, data: { label: 'API 2', properties: { url: 'https://api2.com/data' } } },
        { id: 'http-3', type: 'httpRequest', position: { x: 300, y: 300 }, data: { label: 'API 3', properties: { url: 'https://api3.com/data' } } },
        { id: 'merge-1', type: 'merge', position: { x: 500, y: 200 }, data: { label: 'Combine Data', properties: { mode: 'append' } } },
        { id: 'sheets-1', type: 'googleSheets', position: { x: 700, y: 200 }, data: { label: 'Save Report', properties: { operation: 'updateSheet' }, credentials: ['googleSheetsApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'http-1' },
        { id: 'e2', source: 'trigger-1', target: 'http-2' },
        { id: 'e3', source: 'trigger-1', target: 'http-3' },
        { id: 'e4', source: 'http-1', target: 'merge-1' },
        { id: 'e5', source: 'http-2', target: 'merge-1' },
        { id: 'e6', source: 'http-3', target: 'merge-1' },
        { id: 'e7', source: 'merge-1', target: 'sheets-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-08-03'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.7,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'httpRequest', 'merge', 'googleSheets'],
    requiredCredentials: ['googleSheetsApi'],
    estimatedSetupTime: 25,
    documentation: {
      overview: 'Multi-source data aggregation.',
      setup: [],
      usage: 'Combines API data daily.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'json-to-xml-transform',
    name: 'JSON to XML Transform',
    description: 'Convert JSON data to XML format for legacy systems.',
    category: 'data',
    subcategory: 'transformation',
    author: 'System',
    authorType: 'official',
    tags: ['json', 'xml', 'transform', 'integration'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'webhook', position: { x: 100, y: 200 }, data: { label: 'Receive JSON', properties: {} } },
        { id: 'transform-1', type: 'transform', position: { x: 300, y: 200 }, data: { label: 'To XML', properties: { format: 'xml' } } },
        { id: 'http-1', type: 'httpRequest', position: { x: 500, y: 200 }, data: { label: 'Send XML', properties: { method: 'POST', contentType: 'application/xml' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'transform-1' },
        { id: 'e2', source: 'transform-1', target: 'http-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-08-04'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.4,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['webhook', 'transform', 'httpRequest'],
    requiredCredentials: [],
    estimatedSetupTime: 10,
    documentation: {
      overview: 'JSON to XML conversion.',
      setup: [],
      usage: 'Send JSON to webhook.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  }
];

export default DATA_TEMPLATES;

import { NodeConfigDefinition, validators } from '../../../types/nodeConfig';

// Operations that require record ID
const needsRecordId = [
  'getRecord',
  'updateRecord',
  'deleteRecord',
  'upsertRecord',
  'uploadAttachment'
];

// Operations that require record fields
const needsFields = [
  'createRecord',
  'updateRecord',
  'upsertRecord'
];

// Operations that require multiple records
const needsMultiple = [
  'createRecords',
  'updateRecords',
  'deleteRecords',
  'upsertRecords'
];

export const airtableConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Access Token',
      field: 'accessToken',
      type: 'password',
      placeholder: 'pat...',
      required: true,
      description: 'Airtable Personal Access Token',
      validation: (value) => {
        if (!value) return 'Access token is required';
        const token = String(value);
        if (!token.startsWith('pat')) {
          return 'Invalid token format (should start with pat)';
        }
        return null;
      }
    },
    {
      label: 'Base ID',
      field: 'baseId',
      type: 'text',
      placeholder: 'appXXXXXXXXXXXXXX',
      required: true,
      description: 'Airtable Base ID (found in API documentation)',
      validation: (value) => {
        if (!value) return 'Base ID is required';
        const baseId = String(value);
        if (!baseId.startsWith('app')) {
          return 'Invalid Base ID format (should start with app)';
        }
        return null;
      }
    },
    {
      label: 'Table Name',
      field: 'tableName',
      type: 'text',
      placeholder: 'My Table',
      required: true,
      description: 'Name of the table to work with',
      validation: validators.required('Table Name')
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      defaultValue: 'listRecords',
      options: [
        { value: 'getBase', label: 'Get Base Info' },
        { value: 'getTables', label: 'Get Tables in Base' },
        { value: 'getTable', label: 'Get Table Schema' },
        { value: 'listRecords', label: 'List Records' },
        { value: 'getRecord', label: 'Get Record' },
        { value: 'createRecord', label: 'Create Record' },
        { value: 'createRecords', label: 'Create Multiple Records' },
        { value: 'updateRecord', label: 'Update Record' },
        { value: 'updateRecords', label: 'Update Multiple Records' },
        { value: 'deleteRecord', label: 'Delete Record' },
        { value: 'deleteRecords', label: 'Delete Multiple Records' },
        { value: 'upsertRecord', label: 'Upsert Record' },
        { value: 'upsertRecords', label: 'Upsert Multiple Records' },
        { value: 'getAttachment', label: 'Get Attachment Info' },
        { value: 'uploadAttachment', label: 'Upload Attachment' },
        { value: 'createWebhook', label: 'Create Webhook' },
        { value: 'getWebhooks', label: 'List Webhooks' },
        { value: 'deleteWebhook', label: 'Delete Webhook' },
        { value: 'refreshWebhook', label: 'Refresh Webhook' }
      ]
    },
    {
      label: 'Record ID',
      field: 'recordId',
      type: 'text',
      placeholder: 'recXXXXXXXXXXXXXX',
      description: 'Airtable record ID',
      validation: (value) => {
        if (value) {
          const recordId = String(value);
          if (!recordId.startsWith('rec')) {
            return 'Invalid record ID format (should start with rec)';
          }
        }
        return null;
      }
    },
    {
      label: 'Record Fields',
      field: 'recordFields',
      type: 'json',
      placeholder: '{"Name": "{{$json.name}}", "Email": "{{$json.email}}", "Status": "Active"}',
      description: 'Record field values as JSON object',
      validation: (value) => {
        if (value) return validators.json(String(value));
        return null;
      }
    },
    {
      label: 'Multiple Records',
      field: 'multipleRecords',
      type: 'json',
      placeholder: '[{"fields": {"Name": "John", "Email": "john@example.com"}}, {"fields": {"Name": "Jane", "Email": "jane@example.com"}}]',
      description: 'Array of records for batch operations',
      validation: (value) => {
        if (value) return validators.json(String(value));
        return null;
      }
    },
    {
      label: 'Filter Formula',
      field: 'filterByFormula',
      type: 'expression',
      placeholder: 'AND({Status} = "Active", {Email} != "")',
      description: 'Airtable formula to filter records'
    },
    {
      label: 'View Name',
      field: 'view',
      type: 'text',
      placeholder: 'Grid view',
      description: 'Name of the view to use'
    },
    {
      label: 'Sort',
      field: 'sort',
      type: 'json',
      placeholder: '[{"field": "Created", "direction": "desc"}]',
      description: 'Sort criteria for records',
      validation: validators.json
    },
    {
      label: 'Fields to Return',
      field: 'fields',
      type: 'json',
      placeholder: '["Name", "Email", "Status", "Created"]',
      description: 'Array of field names to return',
      validation: validators.json
    },
    {
      label: 'Max Records',
      field: 'maxRecords',
      type: 'number',
      placeholder: '100',
      defaultValue: 100,
      description: 'Maximum number of records to return'
    },
    {
      label: 'Page Size',
      field: 'pageSize',
      type: 'number',
      placeholder: '100',
      defaultValue: 100,
      description: 'Number of records per page (max 100)'
    },
    {
      label: 'Offset',
      field: 'offset',
      type: 'text',
      placeholder: 'offset-string',
      description: 'Pagination offset from previous request'
    },
    {
      label: 'Cell Format',
      field: 'cellFormat',
      type: 'select',
      defaultValue: 'json',
      options: [
        { value: 'json', label: 'JSON' },
        { value: 'string', label: 'String' }
      ]
    },
    {
      label: 'Time Zone',
      field: 'timeZone',
      type: 'select',
      defaultValue: 'UTC',
      options: [
        { value: 'UTC', label: 'UTC' },
        { value: 'America/New_York', label: 'Eastern Time' },
        { value: 'America/Chicago', label: 'Central Time' },
        { value: 'America/Denver', label: 'Mountain Time' },
        { value: 'America/Los_Angeles', label: 'Pacific Time' },
        { value: 'Europe/London', label: 'London' },
        { value: 'Europe/Paris', label: 'Paris' },
        { value: 'Asia/Tokyo', label: 'Tokyo' }
      ]
    },
    {
      label: 'User Locale',
      field: 'userLocale',
      type: 'select',
      defaultValue: 'en',
      options: [
        { value: 'en', label: 'English' },
        { value: 'fr', label: 'French' },
        { value: 'es', label: 'Spanish' },
        { value: 'de', label: 'German' },
        { value: 'it', label: 'Italian' },
        { value: 'ja', label: 'Japanese' },
        { value: 'ko', label: 'Korean' },
        { value: 'zh', label: 'Chinese' }
      ]
    },
    {
      label: 'Typecast',
      field: 'typecast',
      type: 'checkbox',
      defaultValue: false,
      description: 'Automatically cast field values to correct types'
    },
    {
      label: 'Return Fields After Update',
      field: 'returnFieldsByFieldId',
      type: 'checkbox',
      defaultValue: false,
      description: 'Return field IDs instead of names'
    },
    {
      label: 'Merge Strategy',
      field: 'performUpsert',
      type: 'json',
      placeholder: '{"fieldsToMergeOn": ["Email"]}',
      description: 'Upsert configuration with merge fields',
      validation: validators.json
    },
    {
      label: 'Attachment URL',
      field: 'attachmentUrl',
      type: 'text',
      placeholder: 'https://example.com/file.pdf',
      description: 'URL of file to attach',
      validation: validators.url
    },
    {
      label: 'Attachment Filename',
      field: 'attachmentFilename',
      type: 'text',
      placeholder: 'document.pdf',
      description: 'Filename for attachment'
    },
    {
      label: 'Attachment Field',
      field: 'attachmentField',
      type: 'text',
      placeholder: 'Attachments',
      description: 'Name of attachment field'
    },
    {
      label: 'Webhook URL',
      field: 'webhookUrl',
      type: 'text',
      placeholder: 'https://example.com/airtable/webhook',
      description: 'Your webhook endpoint URL',
      validation: validators.url
    },
    {
      label: 'Webhook ID',
      field: 'webhookId',
      type: 'text',
      placeholder: 'ach00000000000001',
      description: 'Webhook ID for webhook operations'
    },
    {
      label: 'Webhook Specification',
      field: 'webhookSpec',
      type: 'json',
      placeholder: '{"options": {"filters": {"dataTypes": ["tableData"], "recordChangeScope": "tblXXXXXXXXXXXXXX"}}}',
      description: 'Webhook configuration options',
      validation: validators.json
    },
    {
      label: 'Include Cell Values in Fieldsets',
      field: 'includeCellValuesInFieldsets',
      type: 'checkbox',
      defaultValue: false,
      description: 'Include cell values when getting table schema'
    },
    {
      label: 'Include Shared View URLs',
      field: 'includeSharedViewUrls',
      type: 'checkbox',
      defaultValue: false,
      description: 'Include shared view URLs in response'
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Auth validation
    if (!config.accessToken) {
      errors.accessToken = 'Access token is required';
    }
    if (!config.baseId) {
      errors.baseId = 'Base ID is required';
    }
    if (!config.tableName) {
      errors.tableName = 'Table name is required';
    }

    // Operation-specific validation
    switch (config.operation) {
      case 'getRecord':
      case 'deleteRecord':
        if (!config.recordId) {
          errors.recordId = 'Record ID is required for this operation';
        }
        break;
      
      case 'updateRecord':
      case 'upsertRecord':
        if (!config.recordId) {
          errors.recordId = 'Record ID is required for this operation';
        }
        if (!config.recordFields) {
          errors.recordFields = 'Record fields are required';
        }
        break;
      
      case 'createRecord':
        if (!config.recordFields) {
          errors.recordFields = 'Record fields are required';
        }
        break;
      
      case 'createRecords':
      case 'updateRecords':
      case 'deleteRecords':
      case 'upsertRecords':
        if (!config.multipleRecords) {
          errors.multipleRecords = 'Multiple records data is required';
        }
        break;
      
      case 'uploadAttachment':
        if (!config.attachmentUrl) {
          errors.attachmentUrl = 'Attachment URL is required';
        }
        if (!config.attachmentField) {
          errors.attachmentField = 'Attachment field is required';
        }
        if (!config.recordId) {
          errors.recordId = 'Record ID is required for attachment upload';
        }
        break;
      
      case 'createWebhook':
        if (!config.webhookUrl) {
          errors.webhookUrl = 'Webhook URL is required';
        }
        break;
      
      case 'deleteWebhook':
      case 'refreshWebhook':
        if (!config.webhookId) {
          errors.webhookId = 'Webhook ID is required';
        }
        break;
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON fields
    const jsonFields = [
      'recordFields', 'multipleRecords', 'sort', 'fields', 'performUpsert', 'webhookSpec'
    ];
    
    jsonFields.forEach(field => {
      if (config[field] && typeof config[field] === 'string') {
        try {
          config[field] = JSON.parse(config[field]);
        } catch (e) {
          // Keep as string
        }
      }
    });

    // Set API URL and headers
    config.apiUrl = 'https://api.airtable.com/v0';
    config.headers = {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json'
    };

    // Build URL path based on operation
    switch (config.operation) {
      case 'getBase':
        config.endpoint = `/meta/bases/${config.baseId}`;
        break;
      case 'getTables':
        config.endpoint = `/meta/bases/${config.baseId}/tables`;
        break;
      case 'getTable':
        config.endpoint = `/meta/bases/${config.baseId}/tables`;
        break;
      case 'getWebhooks':
        config.endpoint = `/bases/${config.baseId}/webhooks`;
        break;
      case 'createWebhook':
        config.endpoint = `/bases/${config.baseId}/webhooks`;
        break;
      case 'deleteWebhook':
      case 'refreshWebhook':
        config.endpoint = `/bases/${config.baseId}/webhooks/${config.webhookId}`;
        break;
      default:
        config.endpoint = `/${config.baseId}/${encodeURIComponent(String(config.tableName))}`;
        if (config.recordId && ['getRecord', 'updateRecord', 'deleteRecord'].includes(String(config.operation))) {
          config.endpoint += `/${config.recordId}`;
        }
        break;
    }

    // Build query parameters
    const queryParams: Record<string, any> = {};
    
    if (config.filterByFormula) queryParams.filterByFormula = config.filterByFormula;
    if (config.view) queryParams.view = config.view;
    if (config.sort) queryParams.sort = config.sort;
    if (config.fields) queryParams.fields = config.fields;
    if (config.maxRecords) queryParams.maxRecords = config.maxRecords;
    if (config.pageSize) queryParams.pageSize = config.pageSize;
    if (config.offset) queryParams.offset = config.offset;
    if (config.cellFormat) queryParams.cellFormat = config.cellFormat;
    if (config.timeZone) queryParams.timeZone = config.timeZone;
    if (config.userLocale) queryParams.userLocale = config.userLocale;
    if (config.returnFieldsByFieldId) queryParams.returnFieldsByFieldId = config.returnFieldsByFieldId;
    if (config.includeCellValuesInFieldsets) queryParams.includeCellValuesInFieldsets = config.includeCellValuesInFieldsets;
    if (config.includeSharedViewUrls) queryParams.includeSharedViewUrls = config.includeSharedViewUrls;

    config.queryParams = queryParams;

    return config;
  },

  examples: [
    {
      label: 'Create Contact Record',
      config: {
        accessToken: 'pat_YOUR_TOKEN',
        baseId: 'appXXXXXXXXXXXXXX',
        tableName: 'Contacts',
        operation: 'createRecord',
        recordFields: JSON.stringify({
          Name: '{{$json.firstName}} {{$json.lastName}}',
          Email: '{{$json.email}}',
          Phone: '{{$json.phone}}',
          Company: '{{$json.company}}',
          Status: 'New Lead',
          Source: 'Website Form',
          Notes: '{{$json.message}}'
        }, null, 2),
        typecast: true
      }
    },
    {
      label: 'Query Active Projects',
      config: {
        accessToken: 'pat_YOUR_TOKEN',
        baseId: 'appXXXXXXXXXXXXXX',
        tableName: 'Projects',
        operation: 'listRecords',
        filterByFormula: 'AND({Status} = "Active", {Assigned To} != "")',
        sort: JSON.stringify([
          { field: 'Priority', direction: 'desc' },
          { field: 'Due Date', direction: 'asc' }
        ], null, 2),
        fields: JSON.stringify(['Name', 'Status', 'Priority', 'Due Date', 'Assigned To'], null, 2),
        maxRecords: 50
      }
    },
    {
      label: 'Batch Create Tasks',
      config: {
        accessToken: 'pat_YOUR_TOKEN',
        baseId: 'appXXXXXXXXXXXXXX',
        tableName: 'Tasks',
        operation: 'createRecords',
        multipleRecords: JSON.stringify([
          {
            fields: {
              Name: '{{$json.tasks[0].name}}',
              Description: '{{$json.tasks[0].description}}',
              Priority: 'High',
              Status: 'To Do',
              'Assigned To': ['{{$json.assigneeId}}']
            }
          },
          {
            fields: {
              Name: '{{$json.tasks[1].name}}',
              Description: '{{$json.tasks[1].description}}',
              Priority: 'Medium',
              Status: 'To Do',
              'Assigned To': ['{{$json.assigneeId}}']
            }
          }
        ], null, 2),
        typecast: true
      }
    },
    {
      label: 'Update Record Status',
      config: {
        accessToken: 'pat_YOUR_TOKEN',
        baseId: 'appXXXXXXXXXXXXXX',
        tableName: 'Orders',
        operation: 'updateRecord',
        recordId: '{{$json.airtableRecordId}}',
        recordFields: JSON.stringify({
          Status: '{{$json.newStatus}}',
          'Last Updated': '{{$now}}',
          'Updated By': '{{$json.updatedBy}}',
          Notes: '{{$json.statusNotes}}'
        }, null, 2)
      }
    },
    {
      label: 'Upsert Customer by Email',
      config: {
        accessToken: 'pat_YOUR_TOKEN',
        baseId: 'appXXXXXXXXXXXXXX',
        tableName: 'Customers',
        operation: 'upsertRecords',
        multipleRecords: JSON.stringify([
          {
            fields: {
              Email: '{{$json.email}}',
              Name: '{{$json.name}}',
              'Last Purchase': '{{$json.lastPurchaseDate}}',
              'Total Spent': '{{$json.totalSpent}}',
              'Customer Since': '{{$json.customerSince}}'
            }
          }
        ], null, 2),
        performUpsert: JSON.stringify({
          fieldsToMergeOn: ['Email']
        }, null, 2),
        typecast: true
      }
    },
    {
      label: 'Setup Webhook for Table Changes',
      config: {
        accessToken: 'pat_YOUR_TOKEN',
        baseId: 'appXXXXXXXXXXXXXX',
        operation: 'createWebhook',
        webhookUrl: 'https://example.com/airtable/webhook',
        webhookSpec: JSON.stringify({
          options: {
            filters: {
              dataTypes: ['tableData'],
              recordChangeScope: 'tblXXXXXXXXXXXXXX'
            }
          }
        }, null, 2)
      }
    }
  ]
};
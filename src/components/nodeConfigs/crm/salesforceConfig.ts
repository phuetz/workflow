import { NodeConfigDefinition, validators } from '../../../types/nodeConfig';

export const salesforceConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Salesforce Instance URL',
      field: 'instanceUrl',
      type: 'text',
      placeholder: 'https://yourcompany.salesforce.com',
      required: true,
      description: 'Your Salesforce instance URL',
      validation: (value) => {
        if (!value) return 'Instance URL is required';
        const strValue = String(value);
        if (!strValue.includes('.salesforce.com') && !strValue.includes('.my.salesforce.com')) {
          return 'Must be a valid Salesforce instance URL';
        }
        return null;
      }
    },
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      required: true,
      defaultValue: 'oauth',
      options: [
        { value: 'oauth', label: 'OAuth 2.0 (Recommended)' },
        { value: 'jwt', label: 'JWT Bearer Token' },
        { value: 'username_password', label: 'Username/Password + Security Token' }
      ]
    },
    {
      label: 'Client ID',
      field: 'clientId',
      type: 'text',
      placeholder: '3MVG9...',
      description: 'Connected App Client ID',
      showWhen: (config) => config?.authMethod === 'oauth' || config?.authMethod === 'jwt',
      required: (config) => config?.authMethod === 'oauth' || config?.authMethod === 'jwt'
    },
    {
      label: 'Client Secret',
      field: 'clientSecret',
      type: 'password',
      placeholder: 'Client secret from connected app',
      description: 'Connected App Client Secret',
      showWhen: (config) => config?.authMethod === 'oauth',
      required: (config) => config?.authMethod === 'oauth'
    },
    {
      label: 'Access Token',
      field: 'accessToken',
      type: 'password',
      placeholder: '00D...',
      description: 'OAuth Access Token',
      showWhen: (config) => config?.authMethod === 'oauth',
      required: (config) => config?.authMethod === 'oauth'
    },
    {
      label: 'Refresh Token',
      field: 'refreshToken',
      type: 'password',
      placeholder: '5Aep...',
      description: 'OAuth Refresh Token (for token renewal)'
    },
    {
      label: 'Username',
      field: 'username',
      type: 'text',
      placeholder: 'user@company.com',
      description: 'Salesforce username',
      showWhen: (config) => config?.authMethod === 'username_password',
      required: (config) => config?.authMethod === 'username_password',
      validation: validators.email
    },
    {
      label: 'Password',
      field: 'password',
      type: 'password',
      placeholder: 'Your password',
      description: 'Salesforce password',
      showWhen: (config) => config?.authMethod === 'username_password',
      required: (config) => config?.authMethod === 'username_password'
    },
    {
      label: 'Security Token',
      field: 'securityToken',
      type: 'password',
      placeholder: 'Security token from email',
      description: 'Required for username/password auth',
      showWhen: (config) => config?.authMethod === 'username_password',
      required: (config) => config?.authMethod === 'username_password'
    },
    {
      label: 'API Version',
      field: 'apiVersion',
      type: 'select',
      defaultValue: 'v59.0',
      options: [
        { value: 'v59.0', label: 'v59.0 (Summer 2023)' },
        { value: 'v58.0', label: 'v58.0 (Spring 2023)' },
        { value: 'v57.0', label: 'v57.0 (Winter 2023)' },
        { value: 'v56.0', label: 'v56.0 (Summer 2022)' }
      ]
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      defaultValue: 'query',
      options: [
        { value: 'query', label: 'SOQL Query' },
        { value: 'search', label: 'SOSL Search' },
        { value: 'create', label: 'Create Record' },
        { value: 'update', label: 'Update Record' },
        { value: 'upsert', label: 'Upsert Record' },
        { value: 'delete', label: 'Delete Record' },
        { value: 'retrieve', label: 'Get Record by ID' },
        { value: 'getUpdated', label: 'Get Updated Records' },
        { value: 'getDeleted', label: 'Get Deleted Records' },
        { value: 'createLead', label: 'Create Lead' },
        { value: 'convertLead', label: 'Convert Lead' },
        { value: 'createAccount', label: 'Create Account' },
        { value: 'createContact', label: 'Create Contact' },
        { value: 'createOpportunity', label: 'Create Opportunity' },
        { value: 'createCase', label: 'Create Case' },
        { value: 'updateCase', label: 'Update Case' },
        { value: 'createTask', label: 'Create Task' },
        { value: 'createEvent', label: 'Create Event' },
        { value: 'sendEmail', label: 'Send Email' },
        { value: 'executeApex', label: 'Execute Apex Code' },
        { value: 'createReport', label: 'Run Report' },
        { value: 'bulkInsert', label: 'Bulk Insert' },
        { value: 'bulkUpdate', label: 'Bulk Update' },
        { value: 'bulkUpsert', label: 'Bulk Upsert' },
        { value: 'bulkDelete', label: 'Bulk Delete' }
      ]
    },
    {
      label: 'SObject Type',
      field: 'sobjectType',
      type: 'select',
      required: true,
      defaultValue: 'Account',
      options: [
        { value: 'Account', label: 'Account' },
        { value: 'Contact', label: 'Contact' },
        { value: 'Lead', label: 'Lead' },
        { value: 'Opportunity', label: 'Opportunity' },
        { value: 'Case', label: 'Case' },
        { value: 'Task', label: 'Task' },
        { value: 'Event', label: 'Event' },
        { value: 'Campaign', label: 'Campaign' },
        { value: 'Product2', label: 'Product' },
        { value: 'User', label: 'User' },
        { value: 'Custom', label: 'Custom Object' }
      ]
    },
    {
      label: 'Custom Object API Name',
      field: 'customObjectName',
      type: 'text',
      placeholder: 'MyCustomObject__c',
      description: 'API name for custom objects (with __c suffix)',
      showWhen: (config) => config?.sobjectType === 'Custom',
      required: (config) => config?.sobjectType === 'Custom',
      validation: (value) => {
        if (value && typeof value === 'string' && !value.endsWith('__c')) {
          return 'Custom object must end with __c';
        }
        return null;
      }
    },
    {
      label: 'Record ID',
      field: 'recordId',
      type: 'text',
      placeholder: '0031234567890ABC',
      description: 'Salesforce record ID (15 or 18 characters)',
      showWhen: (config) => ['retrieve', 'update', 'delete', 'convertLead'].includes(config?.operation as string),
      required: (config) => ['retrieve', 'update', 'delete', 'convertLead'].includes(config?.operation as string),
      validation: (value) => {
        if (value && typeof value === 'string' && !/^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(value)) {
          return 'Invalid Salesforce ID format';
        }
        return null;
      }
    },
    {
      label: 'SOQL Query',
      field: 'soqlQuery',
      type: 'expression',
      placeholder: 'SELECT Id, Name, Email FROM Contact WHERE LastName = \'{{$json.lastName}}\'',
      description: 'SOQL query string',
      showWhen: (config) => config?.operation === 'query',
      required: (config) => config?.operation === 'query'
    },
    {
      label: 'SOSL Search',
      field: 'soslSearch',
      type: 'expression',
      placeholder: 'FIND {{{$json.searchTerm}}} IN ALL FIELDS RETURNING Account(Id, Name), Contact(Id, Name)',
      description: 'SOSL search string',
      showWhen: (config) => config?.operation === 'search',
      required: (config) => config?.operation === 'search'
    },
    {
      label: 'Record Fields',
      field: 'recordFields',
      type: 'json',
      placeholder: '{"Name": "{{$json.companyName}}", "Industry": "{{$json.industry}}", "Phone": "{{$json.phone}}"}',
      description: 'Field values as JSON object',
      showWhen: (config) => ['create', 'update', 'upsert', 'createLead', 'createAccount', 'createContact', 'createOpportunity', 'createCase', 'updateCase', 'createTask', 'createEvent'].includes(config?.operation as string),
      required: (config) => ['create', 'update', 'upsert', 'createLead', 'createAccount', 'createContact', 'createOpportunity', 'createCase', 'updateCase', 'createTask', 'createEvent'].includes(config?.operation as string),
      validation: validators.json
    },
    {
      label: 'External ID Field',
      field: 'externalIdField',
      type: 'text',
      placeholder: 'External_ID__c',
      description: 'External ID field for upsert operations'
    },
    {
      label: 'External ID Value',
      field: 'externalIdValue',
      type: 'text',
      placeholder: '{{$json.externalId}}',
      description: 'External ID value for upsert'
    },
    {
      label: 'Lead Status',
      field: 'leadStatus',
      type: 'select',
      defaultValue: 'Open - Not Contacted',
      options: [
        { value: 'Open - Not Contacted', label: 'Open - Not Contacted' },
        { value: 'Working - Contacted', label: 'Working - Contacted' },
        { value: 'Closed - Converted', label: 'Closed - Converted' },
        { value: 'Closed - Not Converted', label: 'Closed - Not Converted' }
      ]
    },
    {
      label: 'Convert Lead Settings',
      field: 'convertLeadSettings',
      type: 'json',
      placeholder: '{"accountId": "{{$json.accountId}}", "contactId": "{{$json.contactId}}", "convertedStatus": "Closed - Converted"}',
      description: 'Lead conversion settings',
      validation: validators.json
    },
    {
      label: 'Case Priority',
      field: 'casePriority',
      type: 'select',
      defaultValue: 'Medium',
      options: [
        { value: 'High', label: 'High' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Low', label: 'Low' }
      ]
    },
    {
      label: 'Case Status',
      field: 'caseStatus',
      type: 'select',
      defaultValue: 'New',
      options: [
        { value: 'New', label: 'New' },
        { value: 'Working', label: 'Working' },
        { value: 'Escalated', label: 'Escalated' },
        { value: 'Closed', label: 'Closed' }
      ]
    },
    {
      label: 'Subject',
      field: 'subject',
      type: 'text',
      placeholder: 'Case/Task/Event subject',
      description: 'Subject line'
    },
    {
      label: 'Description',
      field: 'description',
      type: 'expression',
      placeholder: 'Detailed description with {{$json.details}}',
      description: 'Description or body text'
    },
    {
      label: 'Email Template ID',
      field: 'emailTemplateId',
      type: 'text',
      placeholder: '00X1234567890ABC',
      description: 'Email template ID for sending emails'
    },
    {
      label: 'Email Recipients',
      field: 'emailRecipients',
      type: 'json',
      placeholder: '["contact@example.com", "lead@example.com"]',
      description: 'Array of email addresses',
      validation: validators.json
    },
    {
      label: 'Apex Class Name',
      field: 'apexClassName',
      type: 'text',
      placeholder: 'MyApexClass',
      description: 'Name of Apex class to execute'
    },
    {
      label: 'Apex Method',
      field: 'apexMethod',
      type: 'text',
      placeholder: 'myMethod',
      description: 'Apex method to call'
    },
    {
      label: 'Apex Parameters',
      field: 'apexParameters',
      type: 'json',
      placeholder: '{"param1": "value1", "param2": "{{$json.value2}}"}',
      description: 'Parameters for Apex method',
      validation: validators.json
    },
    {
      label: 'Report ID',
      field: 'reportId',
      type: 'text',
      placeholder: '00O1234567890ABC',
      description: 'Salesforce report ID'
    },
    {
      label: 'Report Format',
      field: 'reportFormat',
      type: 'select',
      defaultValue: 'json',
      options: [
        { value: 'json', label: 'JSON' },
        { value: 'csv', label: 'CSV' },
        { value: 'excel', label: 'Excel' }
      ]
    },
    {
      label: 'Bulk Records',
      field: 'bulkRecords',
      type: 'json',
      placeholder: '[{"Name": "Company 1", "Industry": "Tech"}, {"Name": "Company 2", "Industry": "Finance"}]',
      description: 'Array of records for bulk operations',
      validation: validators.json
    },
    {
      label: 'Batch Size',
      field: 'batchSize',
      type: 'number',
      placeholder: '200',
      defaultValue: 200,
      description: 'Batch size for bulk operations (max 10,000)'
    },
    {
      label: 'Date Range Start',
      field: 'startDate',
      type: 'text',
      placeholder: '2024-01-01T00:00:00Z',
      description: 'Start date for getUpdated/getDeleted (ISO format)'
    },
    {
      label: 'Date Range End',
      field: 'endDate',
      type: 'text',
      placeholder: '2024-01-31T23:59:59Z',
      description: 'End date for getUpdated/getDeleted (ISO format)'
    },
    {
      label: 'Fields to Retrieve',
      field: 'fields',
      type: 'text',
      placeholder: 'Id,Name,Email,Phone,CreatedDate',
      description: 'Comma-separated field names'
    },
    {
      label: 'All or None',
      field: 'allOrNone',
      type: 'checkbox',
      defaultValue: false,
      description: 'Fail entire operation if any record fails'
    },
    {
      label: 'Allow Field Truncation',
      field: 'allowFieldTruncation',
      type: 'checkbox',
      defaultValue: false,
      description: 'Allow field values to be truncated'
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Instance URL is always required
    if (!config.instanceUrl) {
      errors.instanceUrl = 'Instance URL is required';
    }

    // Auth validation
    switch (config.authMethod) {
      case 'oauth':
        if (!config.clientId) errors.clientId = 'Client ID is required for OAuth';
        if (!config.clientSecret) errors.clientSecret = 'Client Secret is required for OAuth';
        if (!config.accessToken) errors.accessToken = 'Access Token is required for OAuth';
        break;
      
      case 'jwt':
        if (!config.clientId) errors.clientId = 'Client ID is required for JWT';
        break;
      
      case 'username_password':
        if (!config.username) errors.username = 'Username is required';
        if (!config.password) errors.password = 'Password is required';
        if (!config.securityToken) errors.securityToken = 'Security token is required';
        break;
    }

    // Operation-specific validation
    switch (config.operation) {
      case 'query':
        if (!config.soqlQuery) errors.soqlQuery = 'SOQL query is required';
        break;
      
      case 'search':
        if (!config.soslSearch) errors.soslSearch = 'SOSL search is required';
        break;
      
      case 'create':
      case 'update':
        if (!config.recordFields) errors.recordFields = 'Record fields are required';
        break;
      
      case 'upsert':
        if (!config.recordFields) errors.recordFields = 'Record fields are required';
        if (!config.externalIdField) errors.externalIdField = 'External ID field is required for upsert';
        if (!config.externalIdValue) errors.externalIdValue = 'External ID value is required for upsert';
        break;
      
      case 'retrieve':
      case 'delete':
        if (!config.recordId) errors.recordId = 'Record ID is required';
        break;
      
      case 'convertLead':
        if (!config.recordId) errors.recordId = 'Lead ID is required';
        if (!config.convertLeadSettings) errors.convertLeadSettings = 'Convert lead settings are required';
        break;
      
      case 'sendEmail':
        if (!config.emailRecipients) errors.emailRecipients = 'Email recipients are required';
        break;
      
      case 'executeApex':
        if (!config.apexClassName) errors.apexClassName = 'Apex class name is required';
        if (!config.apexMethod) errors.apexMethod = 'Apex method is required';
        break;
      
      case 'createReport':
        if (!config.reportId) errors.reportId = 'Report ID is required';
        break;
      
      case 'bulkInsert':
      case 'bulkUpdate':  
      case 'bulkUpsert':
      case 'bulkDelete':
        if (!config.bulkRecords) errors.bulkRecords = 'Bulk records are required';
        break;
      
      case 'getUpdated':
      case 'getDeleted':
        if (!config.startDate) errors.startDate = 'Start date is required';
        if (!config.endDate) errors.endDate = 'End date is required';
        break;
    }

    // Custom object validation
    if (config.sobjectType === 'Custom' && !config.customObjectName) {
      errors.customObjectName = 'Custom object name is required';
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON fields
    const jsonFields = ['recordFields', 'convertLeadSettings', 'emailRecipients', 'apexParameters', 'bulkRecords'];

    jsonFields.forEach(field => {
      if (config[field] && typeof config[field] === 'string') {
        try {
          config[field] = JSON.parse(config[field]);
        } catch (e) {
          // Keep as string
        }
      }
    });

    // Set object type
    config.objectType = config.sobjectType === 'Custom' ? config.customObjectName : config.sobjectType;

    // Build API URL
    config.apiUrl = `${config.instanceUrl}/services/data/${config.apiVersion}`;

    // Set authentication headers
    if (config.authMethod === 'oauth') {
      config.headers = {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      };
    }

    return config;
  },

  examples: [
    {
      label: 'Query Contacts',
      config: {
        instanceUrl: 'https://yourcompany.salesforce.com',
        authMethod: 'oauth',
        clientId: 'YOUR_CLIENT_ID',
        clientSecret: 'YOUR_CLIENT_SECRET',
        accessToken: 'YOUR_ACCESS_TOKEN',
        apiVersion: 'v59.0',
        operation: 'query',
        soqlQuery: 'SELECT Id, Name, Email, Phone FROM Contact WHERE LastName = \'{{$json.lastName}}\' ORDER BY CreatedDate DESC LIMIT 10'
      }
    },
    {
      label: 'Create Account',
      config: {
        instanceUrl: 'https://yourcompany.salesforce.com',
        authMethod: 'oauth',
        clientId: 'YOUR_CLIENT_ID',
        clientSecret: 'YOUR_CLIENT_SECRET',
        accessToken: 'YOUR_ACCESS_TOKEN',
        operation: 'create',
        sobjectType: 'Account',
        recordFields: JSON.stringify({
          Name: '{{$json.companyName}}',
          Industry: '{{$json.industry}}',
          Phone: '{{$json.phone}}',
          Website: '{{$json.website}}',
          BillingStreet: '{{$json.address}}',
          BillingCity: '{{$json.city}}',
          BillingState: '{{$json.state}}',
          BillingPostalCode: '{{$json.zipCode}}'
        }, null, 2)
      }
    },
    {
      label: 'Create Lead from Form',
      config: {
        instanceUrl: 'https://yourcompany.salesforce.com',
        authMethod: 'oauth',
        clientId: 'YOUR_CLIENT_ID',
        clientSecret: 'YOUR_CLIENT_SECRET',
        accessToken: 'YOUR_ACCESS_TOKEN',
        operation: 'createLead',
        recordFields: JSON.stringify({
          FirstName: '{{$json.firstName}}',
          LastName: '{{$json.lastName}}',
          Email: '{{$json.email}}',
          Company: '{{$json.company}}',
          Phone: '{{$json.phone}}',
          Status: 'Open - Not Contacted',
          LeadSource: 'Website',
          Description: '{{$json.message}}'
        }, null, 2)
      }
    },
    {
      label: 'Create Support Case',
      config: {
        instanceUrl: 'https://yourcompany.salesforce.com',
        authMethod: 'oauth',
        clientId: 'YOUR_CLIENT_ID',
        clientSecret: 'YOUR_CLIENT_SECRET',
        accessToken: 'YOUR_ACCESS_TOKEN',
        operation: 'createCase',
        recordFields: JSON.stringify({
          Subject: '{{$json.issueTitle}}',
          Description: '{{$json.issueDescription}}',
          Priority: '{{$json.priority || "Medium"}}',
          Status: 'New',
          Origin: 'Web',
          ContactId: '{{$json.contactId}}',
          AccountId: '{{$json.accountId}}'
        }, null, 2)
      }
    },
    {
      label: 'Update Opportunity Stage',
      config: {
        instanceUrl: 'https://yourcompany.salesforce.com',
        authMethod: 'oauth',
        clientId: 'YOUR_CLIENT_ID',
        clientSecret: 'YOUR_CLIENT_SECRET',
        accessToken: 'YOUR_ACCESS_TOKEN',
        operation: 'update',
        sobjectType: 'Opportunity',
        recordId: '{{$json.opportunityId}}',
        recordFields: JSON.stringify({
          StageName: '{{$json.newStage}}',
          Probability: '{{$json.probability}}',
          CloseDate: '{{$json.closeDate}}',
          Amount: '{{$json.amount}}',
          Description: 'Updated via workflow: {{$json.updateReason}}'
        }, null, 2)
      }
    },
    {
      label: 'Bulk Insert Contacts',
      config: {
        instanceUrl: 'https://yourcompany.salesforce.com',
        authMethod: 'oauth',
        clientId: 'YOUR_CLIENT_ID',
        clientSecret: 'YOUR_CLIENT_SECRET',
        accessToken: 'YOUR_ACCESS_TOKEN',
        operation: 'bulkInsert',
        sobjectType: 'Contact',
        bulkRecords: JSON.stringify([
          {
            FirstName: 'John',
            LastName: 'Doe',
            Email: 'john.doe@example.com',
            AccountId: '001XXXXXXXXXXXXXXX'
          },
          {
            FirstName: 'Jane',
            LastName: 'Smith',
            Email: 'jane.smith@example.com',
            AccountId: '001XXXXXXXXXXXXXXX'
          }
        ], null, 2),
        batchSize: 200,
        allOrNone: false
      }
    }
  ]
};
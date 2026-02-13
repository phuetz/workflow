import { NodeConfigDefinition, validators } from '../../../types/nodeConfig';

// Operations that need a record ID
const needsRecordId = [
  'getContact', 'updateContact', 'deleteContact',
  'getCompany', 'updateCompany', 'deleteCompany',
  'getDeal', 'updateDeal', 'deleteDeal',
  'getTicket', 'updateTicket', 'deleteTicket'
];

// Operations that need properties
const needsProperties = [
  'createContact', 'updateContact',
  'createCompany', 'updateCompany',
  'createDeal', 'updateDeal',
  'createTicket', 'updateTicket',
  'createTask', 'createNote', 'createCall', 'createMeeting', 'createEmail'
];

// Operations that need search query
const needsSearch = [
  'searchContacts', 'searchCompanies', 'searchDeals', 'searchTickets'
];

// JSON fields that need parsing
const jsonFields = [
  'properties', 'associations', 'emailRecipients', 'propertyOptions', 'webhookEvents'
];

export const hubspotConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      required: true,
      defaultValue: 'private_app',
      options: [
        { value: 'private_app', label: 'Private App Token (Recommended)' },
        { value: 'oauth', label: 'OAuth 2.0' },
        { value: 'api_key', label: 'API Key (Legacy - Deprecated)' }
      ]
    },
    {
      label: 'Private App Token',
      field: 'privateAppToken',
      type: 'password',
      placeholder: 'pat-na1-...',
      description: 'HubSpot Private App access token',
      validation: (value, config) => {
        if (config?.authMethod === 'private_app' && !value) {
          return 'Private app token is required';
        }
        if (value && typeof value === 'string' && !value.startsWith('pat-')) {
          return 'Invalid private app token format';
        }
        return null;
      }
    },
    {
      label: 'API Key',
      field: 'apiKey',
      type: 'password',
      placeholder: 'your-api-key',
      description: 'HubSpot API Key (deprecated)',
      validation: (value, config) => {
        if (config?.authMethod === 'api_key' && !value) {
          return 'API key is required';
        }
        return null;
      }
    },
    {
      label: 'Access Token',
      field: 'accessToken',
      type: 'password',
      placeholder: 'OAuth access token',
      description: 'OAuth 2.0 access token',
      validation: (value, config) => {
        if (config?.authMethod === 'oauth' && !value) {
          return 'Access token is required';
        }
        return null;
      }
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      defaultValue: 'getContact',
      options: [
        { value: 'getContact', label: 'Get Contact' },
        { value: 'searchContacts', label: 'Search Contacts' },
        { value: 'createContact', label: 'Create Contact' },
        { value: 'updateContact', label: 'Update Contact' },
        { value: 'deleteContact', label: 'Delete Contact' },
        { value: 'getCompany', label: 'Get Company' },
        { value: 'searchCompanies', label: 'Search Companies' },
        { value: 'createCompany', label: 'Create Company' },
        { value: 'updateCompany', label: 'Update Company' },
        { value: 'deleteCompany', label: 'Delete Company' },
        { value: 'getDeal', label: 'Get Deal' },
        { value: 'searchDeals', label: 'Search Deals' },
        { value: 'createDeal', label: 'Create Deal' },
        { value: 'updateDeal', label: 'Update Deal' },
        { value: 'deleteDeal', label: 'Delete Deal' },
        { value: 'getTicket', label: 'Get Ticket' },
        { value: 'searchTickets', label: 'Search Tickets' },
        { value: 'createTicket', label: 'Create Ticket' },
        { value: 'updateTicket', label: 'Update Ticket' },
        { value: 'deleteTicket', label: 'Delete Ticket' },
        { value: 'createTask', label: 'Create Task' },
        { value: 'createNote', label: 'Create Note' },
        { value: 'createCall', label: 'Create Call Log' },
        { value: 'createMeeting', label: 'Create Meeting' },
        { value: 'createEmail', label: 'Create Email Activity' },
        { value: 'sendEmail', label: 'Send Email' },
        { value: 'createList', label: 'Create Contact List' },
        { value: 'addToList', label: 'Add Contact to List' },
        { value: 'removeFromList', label: 'Remove Contact from List' },
        { value: 'createWorkflow', label: 'Enroll in Workflow' },
        { value: 'getProperties', label: 'Get Object Properties' },
        { value: 'createProperty', label: 'Create Custom Property' },
        { value: 'getOwners', label: 'Get Owners' },
        { value: 'getPipelines', label: 'Get Pipelines' },
        { value: 'getAnalytics', label: 'Get Analytics Data' },
        { value: 'createWebhook', label: 'Create Webhook' }
      ]
    },
    {
      label: 'Object Type',
      field: 'objectType',
      type: 'select',
      defaultValue: 'contacts',
      options: [
        { value: 'contacts', label: 'Contacts' },
        { value: 'companies', label: 'Companies' },
        { value: 'deals', label: 'Deals' },
        { value: 'tickets', label: 'Tickets' },
        { value: 'products', label: 'Products' },
        { value: 'line_items', label: 'Line Items' },
        { value: 'quotes', label: 'Quotes' },
        { value: 'calls', label: 'Calls' },
        { value: 'emails', label: 'Emails' },
        { value: 'meetings', label: 'Meetings' },
        { value: 'notes', label: 'Notes' },
        { value: 'tasks', label: 'Tasks' }
      ]
    },
    {
      label: 'Record ID',
      field: 'recordId',
      type: 'text',
      placeholder: '12345',
      description: 'HubSpot record ID',
      validation: (value, config) => {
        const operation = config?.operation as string | undefined;
        if ((operation?.startsWith('get') && !operation?.startsWith('getAll') && !operation?.startsWith('search')) ||
            operation?.startsWith('update') || operation?.startsWith('delete')) {
          if (!value) return 'Record ID is required';
        }
        return null;
      }
    },
    {
      label: 'Email',
      field: 'email',
      type: 'email',
      placeholder: 'contact@example.com',
      description: 'Contact email address',
      validation: (value) => {
        if (value && typeof value === 'string') return validators.email(value);
        return null;
      }
    },
    {
      label: 'Search Query',
      field: 'searchQuery',
      type: 'text',
      placeholder: 'company:{{$json.companyName}}',
      description: 'Search query string',
      validation: (value, config) => {
        const operation = config?.operation as string | undefined;
        if (operation?.includes('search') && !value) {
          return 'Search query is required';
        }
        return null;
      }
    },
    {
      label: 'Properties',
      field: 'properties',
      type: 'json',
      placeholder: '{"firstname": "{{$json.firstName}}", "lastname": "{{$json.lastName}}", "email": "{{$json.email}}"}',
      description: 'Object properties as JSON',
      validation: (value, config) => {
        const operation = config?.operation as string | undefined;
        if ((operation === 'create' || operation?.includes('update')) && !value) {
          return 'Properties are required';
        }
        if (value && typeof value === 'string') return validators.json(value);
        return null;
      }
    },
    {
      label: 'Properties to Retrieve',
      field: 'propertiesToRetrieve',
      type: 'text',
      placeholder: 'firstname,lastname,email,company,phone',
      description: 'Comma-separated property names to return'
    },
    {
      label: 'Associations',
      field: 'associations',
      type: 'json',
      placeholder: '[{"to": {"id": "12345"}, "types": [{"associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 1}]}]',
      description: 'Object associations',
      validation: validators.json
    },
    {
      label: 'Deal Stage',
      field: 'dealStage',
      type: 'select',
      defaultValue: 'appointmentscheduled',
      options: [
        { value: 'appointmentscheduled', label: 'Appointment Scheduled' },
        { value: 'qualifiedtobuy', label: 'Qualified to Buy' },
        { value: 'presentationscheduled', label: 'Presentation Scheduled' },
        { value: 'decisionmakerboughtin', label: 'Decision Maker Bought-In' },
        { value: 'contractsent', label: 'Contract Sent' },
        { value: 'closedwon', label: 'Closed Won' },
        { value: 'closedlost', label: 'Closed Lost' }
      ]
    },
    {
      label: 'Deal Amount',
      field: 'dealAmount',
      type: 'number',
      placeholder: '10000',
      description: 'Deal amount in cents'
    },
    {
      label: 'Pipeline ID',
      field: 'pipelineId',
      type: 'text',
      placeholder: 'default',
      defaultValue: 'default',
      description: 'Deal pipeline ID'
    },
    {
      label: 'Owner ID',
      field: 'ownerId',
      type: 'text',
      placeholder: '12345',
      description: 'HubSpot user ID of the owner'
    },
    {
      label: 'Priority',
      field: 'priority',
      type: 'select',
      defaultValue: 'MEDIUM',
      options: [
        { value: 'LOW', label: 'Low' },
        { value: 'MEDIUM', label: 'Medium' },
        { value: 'HIGH', label: 'High' }
      ]
    },
    {
      label: 'Ticket Status',
      field: 'ticketStatus',
      type: 'select',
      defaultValue: 'new',
      options: [
        { value: 'new', label: 'New' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'waiting', label: 'Waiting on Contact' },
        { value: 'waiting_on_us', label: 'Waiting on Us' },
        { value: 'closed', label: 'Closed' }
      ]
    },
    {
      label: 'Subject',
      field: 'subject',
      type: 'text',
      placeholder: 'Meeting subject or ticket title',
      description: 'Subject line'
    },
    {
      label: 'Content/Body',
      field: 'content',
      type: 'expression',
      placeholder: 'Email body or note content with {{$json.data}}',
      description: 'Content body'
    },
    {
      label: 'Email Template ID',
      field: 'emailTemplateId',
      type: 'text',
      placeholder: '12345',
      description: 'HubSpot email template ID'
    },
    {
      label: 'Email Recipients',
      field: 'emailRecipients',
      type: 'json',
      placeholder: '[{"email": "recipient@example.com", "name": "Recipient Name"}]',
      description: 'Email recipients array',
      validation: validators.json
    },
    {
      label: 'List Name',
      field: 'listName',
      type: 'text',
      placeholder: 'My Contact List',
      description: 'Name for new contact list'
    },
    {
      label: 'List ID',
      field: 'listId',
      type: 'text',
      placeholder: '12345',
      description: 'Contact list ID'
    },
    {
      label: 'List Type',
      field: 'listType',
      type: 'select',
      defaultValue: 'STATIC',
      options: [
        { value: 'STATIC', label: 'Static List' },
        { value: 'DYNAMIC', label: 'Active List' }
      ]
    },
    {
      label: 'Workflow ID',
      field: 'workflowId',
      type: 'text',
      placeholder: '12345',
      description: 'HubSpot workflow ID for enrollment'
    },
    {
      label: 'Property Name',
      field: 'propertyName',
      type: 'text',
      placeholder: 'my_custom_property',
      description: 'Custom property name'
    },
    {
      label: 'Property Type',
      field: 'propertyType',
      type: 'select',
      defaultValue: 'string',
      options: [
        { value: 'string', label: 'Single-line text' },
        { value: 'number', label: 'Number' },
        { value: 'date', label: 'Date picker' },
        { value: 'datetime', label: 'Date & time picker' },
        { value: 'enumeration', label: 'Dropdown select' },
        { value: 'bool', label: 'Single checkbox' },
        { value: 'phone_number', label: 'Phone number' }
      ]
    },
    {
      label: 'Property Options',
      field: 'propertyOptions',
      type: 'json',
      placeholder: '[{"label": "Option 1", "value": "option1"}, {"label": "Option 2", "value": "option2"}]',
      description: 'Options for dropdown properties',
      validation: validators.json
    },
    {
      label: 'Analytics Type',
      field: 'analyticsType',
      type: 'select',
      defaultValue: 'traffic',
      options: [
        { value: 'traffic', label: 'Website Traffic' },
        { value: 'contacts', label: 'Contact Analytics' },
        { value: 'deals', label: 'Deal Analytics' },
        { value: 'email', label: 'Email Performance' },
        { value: 'social', label: 'Social Media' }
      ]
    },
    {
      label: 'Date Range',
      field: 'dateRange',
      type: 'select',
      defaultValue: 'last_30_days',
      options: [
        { value: 'today', label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'last_7_days', label: 'Last 7 days' },
        { value: 'last_30_days', label: 'Last 30 days' },
        { value: 'last_90_days', label: 'Last 90 days' },
        { value: 'custom', label: 'Custom Range' }
      ]
    },
    {
      label: 'Start Date',
      field: 'startDate',
      type: 'text',
      placeholder: '2024-01-01',
      description: 'Start date (YYYY-MM-DD)'
    },
    {
      label: 'End Date',
      field: 'endDate',
      type: 'text',
      placeholder: '2024-01-31',
      description: 'End date (YYYY-MM-DD)'
    },
    {
      label: 'Webhook URL',
      field: 'webhookUrl',
      type: 'text',
      placeholder: 'https://example.com/hubspot/webhook',
      description: 'Your webhook endpoint URL',
      validation: validators.url
    },
    {
      label: 'Webhook Events',
      field: 'webhookEvents',
      type: 'json',
      placeholder: '["contact.creation", "deal.propertyChange", "company.deletion"]',
      description: 'Events to subscribe to',
      validation: validators.json
    },
    {
      label: 'Limit',
      field: 'limit',
      type: 'number',
      placeholder: '100',
      defaultValue: 100,
      description: 'Maximum results to return'
    },
    {
      label: 'After',
      field: 'after',
      type: 'text',
      placeholder: 'pagination_token',
      description: 'Pagination token for next page'
    },
    {
      label: 'Sort',
      field: 'sort',
      type: 'text',
      placeholder: 'createdate',
      description: 'Property to sort by'
    },
    {
      label: 'Sort Direction',
      field: 'sortDirection',
      type: 'select',
      defaultValue: 'DESCENDING',
      options: [
        { value: 'DESCENDING', label: 'Descending' },
        { value: 'ASCENDING', label: 'Ascending' }
      ]
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Auth validation
    switch (config.authMethod) {
      case 'private_app':
        if (!config.privateAppToken) errors.privateAppToken = 'Private app token is required';
        break;
      case 'oauth':
        if (!config.accessToken) errors.accessToken = 'Access token is required';
        break;
      case 'api_key':
        if (!config.apiKey) errors.apiKey = 'API key is required';
        break;
    }

    // Operation-specific validation
    const operation = config.operation as string;
    if (needsRecordId.includes(operation) && !config.recordId) {
      errors.recordId = 'Record ID is required for this operation';
    }

    if (needsProperties.includes(operation) && !config.properties) {
      errors.properties = 'Properties are required for this operation';
    }

    if (needsSearch.includes(operation) && !config.searchQuery) {
      errors.searchQuery = 'Search query is required';
    }

    // Specific validations
    switch (config.operation) {
      case 'sendEmail':
        if (!config.emailRecipients) errors.emailRecipients = 'Email recipients are required';
        if (!config.content && !config.emailTemplateId) {
          errors.content = 'Email content or template ID is required';
        }
        break;
      
      case 'createList':
        if (!config.listName) errors.listName = 'List name is required';
        break;
      
      case 'addToList':
      case 'removeFromList':
        if (!config.listId) errors.listId = 'List ID is required';
        if (!config.recordId) errors.recordId = 'Record ID is required';
        break;
      
      case 'createWorkflow':
        if (!config.workflowId) errors.workflowId = 'Workflow ID is required';
        if (!config.recordId) errors.recordId = 'Record ID is required';
        break;
      
      case 'createProperty':
        if (!config.propertyName) errors.propertyName = 'Property name is required';
        if (!config.propertyType) errors.propertyType = 'Property type is required';
        break;
      
      case 'createWebhook':
        if (!config.webhookUrl) errors.webhookUrl = 'Webhook URL is required';
        if (!config.webhookEvents) errors.webhookEvents = 'Webhook events are required';
        break;
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON fields
    
    jsonFields.forEach(field => {
      if (config[field] && typeof config[field] === 'string') {
        try {
          config[field] = JSON.parse(config[field]);
        } catch (e) {
          // Keep as string
        }
      }
    });

    // Build API URL
    config.apiUrl = 'https://api.hubapi.com';

    // Set authentication headers
    if (config.authMethod === 'private_app' && config.privateAppToken) {
      config.headers = {
        'Authorization': `Bearer ${config.privateAppToken}`,
        'Content-Type': 'application/json'
      };
    } else if (config.authMethod === 'oauth' && config.accessToken) {
      config.headers = {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      };
    } else if (config.authMethod === 'api_key' && config.apiKey) {
      config.apiKey = config.apiKey; // Will be added as query param
    }

    return config;
  },

  examples: [
    {
      label: 'Create Contact from Form',
      config: {
        authMethod: 'private_app',
        privateAppToken: 'pat-na1-YOUR-TOKEN',
        operation: 'createContact',
        properties: JSON.stringify({
          firstname: '{{$json.firstName}}',
          lastname: '{{$json.lastName}}',
          email: '{{$json.email}}',
          phone: '{{$json.phone}}',
          company: '{{$json.company}}',
          website: '{{$json.website}}',
          lifecyclestage: 'lead',
          lead_status: 'NEW'
        }, null, 2)
      }
    },
    {
      label: 'Search Companies by Domain',
      config: {
        authMethod: 'private_app',
        privateAppToken: 'pat-na1-YOUR-TOKEN',
        operation: 'searchCompanies',
        searchQuery: 'domain:{{$json.domain}}',
        propertiesToRetrieve: 'name,domain,industry,city,state,country,numberofemployees',
        limit: 10
      }
    },
    {
      label: 'Create Deal with Associations',
      config: {
        authMethod: 'private_app',
        privateAppToken: 'pat-na1-YOUR-TOKEN',
        operation: 'createDeal',
        properties: JSON.stringify({
          dealname: '{{$json.dealName}}',
          amount: '{{$json.amount}}',
          dealstage: 'appointmentscheduled',
          pipeline: 'default',
          closedate: '{{$json.closeDate}}',
          hubspot_owner_id: '{{$json.ownerId}}'
        }, null, 2),
        associations: JSON.stringify([
          {
            to: { id: '{{$json.companyId}}' },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 5 }]
          },
          {
            to: { id: '{{$json.contactId}}' },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
          }
        ], null, 2)
      }
    },
    {
      label: 'Create Support Ticket',
      config: {
        authMethod: 'private_app',
        privateAppToken: 'pat-na1-YOUR-TOKEN',
        operation: 'createTicket',
        properties: JSON.stringify({
          subject: '{{$json.subject}}',
          content: '{{$json.description}}',
          hs_pipeline: 'support_pipeline',
          hs_pipeline_stage: 'new',
          hs_ticket_priority: '{{$json.priority || "MEDIUM"}}',
          source_type: 'CHAT',
          hubspot_owner_id: '{{$json.assignedTo}}'
        }, null, 2)
      }
    },
    {
      label: 'Update Deal Stage',
      config: {
        authMethod: 'private_app',
        privateAppToken: 'pat-na1-YOUR-TOKEN',
        operation: 'updateDeal',
        recordId: '{{$json.dealId}}',
        properties: JSON.stringify({
          dealstage: '{{$json.newStage}}',
          amount: '{{$json.newAmount}}',
          closedate: '{{$json.newCloseDate}}',
          notes_last_updated: '{{$now}}'
        }, null, 2)
      }
    },
    {
      label: 'Send Personalized Email',
      config: {
        authMethod: 'private_app',
        privateAppToken: 'pat-na1-YOUR-TOKEN',
        operation: 'sendEmail',
        emailRecipients: JSON.stringify([
          {
            email: '{{$json.recipientEmail}}',
            name: '{{$json.recipientName}}'
          }
        ], null, 2),
        subject: 'Welcome to {{$json.companyName}}!',
        content: 'Hi {{$json.firstName}},\n\nWelcome to our platform! We\'re excited to have you on board.\n\nBest regards,\nThe {{$json.companyName}} Team',
        emailTemplateId: '{{$json.templateId}}'
      }
    }
  ]
};
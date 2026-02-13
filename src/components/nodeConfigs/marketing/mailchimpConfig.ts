import { NodeConfigDefinition, validators } from '../../../types/nodeConfig';

// Operations that require email address
const needsEmail = [
  'getMember', 'addMember', 'updateMember', 'deleteMember',
  'getTags', 'addTags', 'removeTags'
];

// JSON fields that need parsing
const jsonFields = [
  'mergeFields', 'tags', 'interests', 'batchMembers', 'segmentOptions'
];

export const mailchimpConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'API Key',
      field: 'apiKey',
      type: 'password',
      placeholder: 'your-api-key-us1',
      required: true,
      description: 'Mailchimp API key (includes server prefix like us1, us2, etc.)',
      validation: (value) => {
        if (!value) return 'API key is required';
        const apiKey = String(value);
        if (!apiKey.includes('-us') && !apiKey.includes('-eu')) {
          return 'Invalid API key format (should include server prefix like -us1)';
        }
        return null;
      }
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      defaultValue: 'addMember',
      options: [
        { value: 'getLists', label: 'Get All Lists' },
        { value: 'getList', label: 'Get List Info' },
        { value: 'createList', label: 'Create List' },
        { value: 'updateList', label: 'Update List' },
        { value: 'deleteList', label: 'Delete List' },
        { value: 'getMembers', label: 'Get List Members' },
        { value: 'getMember', label: 'Get Member Info' },
        { value: 'addMember', label: 'Add/Subscribe Member' },
        { value: 'updateMember', label: 'Update Member' },
        { value: 'deleteMember', label: 'Delete/Unsubscribe Member' },
        { value: 'batchSubscribe', label: 'Batch Subscribe Members' },
        { value: 'batchUnsubscribe', label: 'Batch Unsubscribe Members' },
        { value: 'batchUpdate', label: 'Batch Update Members' },
        { value: 'getTags', label: 'Get Member Tags' },
        { value: 'addTags', label: 'Add Tags to Member' },
        { value: 'removeTags', label: 'Remove Tags from Member' },
        { value: 'getSegments', label: 'Get List Segments' },
        { value: 'createSegment', label: 'Create Segment' },
        { value: 'updateSegment', label: 'Update Segment' },
        { value: 'deleteSegment', label: 'Delete Segment' },
        { value: 'getCampaigns', label: 'Get Campaigns' },
        { value: 'getCampaign', label: 'Get Campaign Info' },
        { value: 'createCampaign', label: 'Create Campaign' },
        { value: 'updateCampaign', label: 'Update Campaign' },
        { value: 'deleteCampaign', label: 'Delete Campaign' },
        { value: 'sendCampaign', label: 'Send Campaign' },
        { value: 'scheduleCampaign', label: 'Schedule Campaign' },
        { value: 'cancelCampaign', label: 'Cancel Campaign' },
        { value: 'replicateCampaign', label: 'Replicate Campaign' },
        { value: 'getTemplates', label: 'Get Email Templates' },
        { value: 'getTemplate', label: 'Get Template Info' },
        { value: 'createTemplate', label: 'Create Template' },
        { value: 'updateTemplate', label: 'Update Template' },
        { value: 'deleteTemplate', label: 'Delete Template' },
        { value: 'getAutomations', label: 'Get Automations' },
        { value: 'getAutomation', label: 'Get Automation Info' },
        { value: 'pauseAutomation', label: 'Pause Automation' },
        { value: 'startAutomation', label: 'Start Automation' },
        { value: 'addSubscriberToAutomation', label: 'Add Subscriber to Automation' },
        { value: 'removeSubscriberFromAutomation', label: 'Remove Subscriber from Automation' },
        { value: 'getReports', label: 'Get Campaign Reports' },
        { value: 'getCampaignReport', label: 'Get Campaign Report' },
        { value: 'getListGrowthHistory', label: 'Get List Growth History' }
      ]
    },
    {
      label: 'List ID',
      field: 'listId',
      type: 'text',
      placeholder: 'abc123def4',
      description: 'Mailchimp list ID',
      validation: function(value) {
        const needsListId = [
          'getList', 'updateList', 'deleteList', 'getMembers', 'getMember',
          'addMember', 'updateMember', 'deleteMember', 'batchSubscribe',
          'batchUnsubscribe', 'batchUpdate', 'getTags', 'addTags', 'removeTags',
          'getSegments', 'createSegment', 'getListGrowthHistory'
        ];
        const operation = (this as any).operation;
        if (needsListId.includes(operation) && !value) {
          return 'List ID is required for this operation';
        }
        return null;
      }
    },
    {
      label: 'Email Address',
      field: 'emailAddress',
      type: 'email',
      placeholder: 'subscriber@example.com',
      description: 'Member email address',
      validation: function(value) {
        const operation = (this as any).operation;
        if (needsEmail.includes(operation) && !value) {
          return 'Email address is required';
        }
        if (value) return validators.email(String(value));
        return null;
      }
    },
    {
      label: 'Member Status',
      field: 'status',
      type: 'select',
      defaultValue: 'subscribed',
      options: [
        { value: 'subscribed', label: 'Subscribed' },
        { value: 'unsubscribed', label: 'Unsubscribed' },
        { value: 'cleaned', label: 'Cleaned' },
        { value: 'pending', label: 'Pending' },
        { value: 'transactional', label: 'Transactional' }
      ]
    },
    {
      label: 'Merge Fields',
      field: 'mergeFields',
      type: 'json',
      placeholder: '{"FNAME": "{{$json.firstName}}", "LNAME": "{{$json.lastName}}", "PHONE": "{{$json.phone}}"}',
      description: 'Member merge fields (FNAME, LNAME, etc.)',
      validation: validators.json
    },
    {
      label: 'Tags',
      field: 'tags',
      type: 'json',
      placeholder: '["customer", "vip", "newsletter"]',
      description: 'Array of tag names',
      validation: validators.json
    },
    {
      label: 'Interests',
      field: 'interests',
      type: 'json',
      placeholder: '{"interest_id_1": true, "interest_id_2": false}',
      description: 'Interest group preferences',
      validation: validators.json
    },
    {
      label: 'Double Opt-in',
      field: 'doubleOptin',
      type: 'checkbox',
      defaultValue: true,
      description: 'Send double opt-in confirmation email'
    },
    {
      label: 'Update Existing',
      field: 'updateExisting',
      type: 'checkbox',
      defaultValue: false,
      description: 'Update existing members if they exist'
    },
    {
      label: 'Replace Interests',
      field: 'replaceInterests',
      type: 'checkbox',
      defaultValue: false,
      description: 'Replace all existing interests'
    },
    {
      label: 'Send Welcome',
      field: 'sendWelcome',
      type: 'checkbox',
      defaultValue: false,
      description: 'Send welcome email'
    },
    {
      label: 'Batch Members',
      field: 'batchMembers',
      type: 'json',
      placeholder: '[{"email_address": "user1@example.com", "status": "subscribed", "merge_fields": {"FNAME": "John"}}, {"email_address": "user2@example.com", "status": "subscribed", "merge_fields": {"FNAME": "Jane"}}]',
      description: 'Array of members for batch operations',
      validation: validators.json
    },
    {
      label: 'List Name',
      field: 'listName',
      type: 'text',
      placeholder: 'My Email List',
      description: 'Name for new list',
      validation: function(value) {
        const operation = (this as any).operation;
        if (operation === 'createList' && !value) {
          return 'List name is required';
        }
        return null;
      }
    },
    {
      label: 'List Subject',
      field: 'listSubject',
      type: 'text',
      placeholder: 'Subscribe to our newsletter',
      description: 'Subject line for list'
    },
    {
      label: 'From Name',
      field: 'fromName',
      type: 'text',
      placeholder: 'Your Company',
      description: 'Default from name for campaigns'
    },
    {
      label: 'From Email',
      field: 'fromEmail',
      type: 'email',
      placeholder: 'noreply@yourcompany.com',
      description: 'Default from email address',
      validation: validators.email
    },
    {
      label: 'Language',
      field: 'language',
      type: 'select',
      defaultValue: 'en',
      options: [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Spanish' },
        { value: 'fr', label: 'French' },
        { value: 'de', label: 'German' },
        { value: 'it', label: 'Italian' },
        { value: 'pt', label: 'Portuguese' },
        { value: 'nl', label: 'Dutch' },
        { value: 'pl', label: 'Polish' },
        { value: 'ru', label: 'Russian' },
        { value: 'ja', label: 'Japanese' }
      ]
    },
    {
      label: 'Campaign ID',
      field: 'campaignId',
      type: 'text',
      placeholder: 'abc123def4',
      description: 'Mailchimp campaign ID',
      validation: function(value) {
        const needsCampaignId = [
          'getCampaign', 'updateCampaign', 'deleteCampaign', 'sendCampaign',
          'scheduleCampaign', 'cancelCampaign', 'replicateCampaign', 'getCampaignReport'
        ];
        const operation = (this as any).operation;
        if (needsCampaignId.includes(operation) && !value) {
          return 'Campaign ID is required for this operation';
        }
        return null;
      }
    },
    {
      label: 'Campaign Type',
      field: 'campaignType',
      type: 'select',
      defaultValue: 'regular',
      options: [
        { value: 'regular', label: 'Regular Campaign' },
        { value: 'plaintext', label: 'Plain Text' },
        { value: 'absplit', label: 'A/B Split Test' },
        { value: 'rss', label: 'RSS Campaign' },
        { value: 'variate', label: 'Multivariate Test' }
      ]
    },
    {
      label: 'Subject Line',
      field: 'subjectLine',
      type: 'text',
      placeholder: 'Newsletter - {{$json.month}} {{$json.year}}',
      description: 'Email subject line'
    },
    {
      label: 'Preview Text',
      field: 'previewText',
      type: 'text',
      placeholder: 'Preview of the email content...',
      description: 'Preview text shown in email clients'
    },
    {
      label: 'Title',
      field: 'title',
      type: 'text',
      placeholder: 'Campaign Title',
      description: 'Internal campaign title'
    },
    {
      label: 'Template ID',
      field: 'templateId',
      type: 'text',
      placeholder: '12345',
      description: 'Email template ID'
    },
    {
      label: 'HTML Content',
      field: 'htmlContent',
      type: 'expression',
      placeholder: '<h1>Hello {{$json.firstName}}!</h1><p>Your content here...</p>',
      description: 'HTML email content'
    },
    {
      label: 'Plain Text Content',
      field: 'plainTextContent',
      type: 'expression',
      placeholder: 'Hello {{$json.firstName}}!\n\nYour content here...',
      description: 'Plain text version of email'
    },
    {
      label: 'Send Time',
      field: 'sendTime',
      type: 'text',
      placeholder: '2024-12-25T10:00:00+00:00',
      description: 'Scheduled send time (ISO 8601 format)'
    },
    {
      label: 'Segment ID',
      field: 'segmentId',
      type: 'text',
      placeholder: '12345',
      description: 'List segment ID'
    },
    {
      label: 'Segment Name',
      field: 'segmentName',
      type: 'text',
      placeholder: 'VIP Customers',
      description: 'Name for new segment'
    },
    {
      label: 'Segment Options',
      field: 'segmentOptions',
      type: 'json',
      placeholder: '{"match": "any", "conditions": [{"field": "EMAIL", "op": "contains", "value": "@gmail.com"}]}',
      description: 'Segment conditions',
      validation: validators.json
    },
    {
      label: 'Automation ID',
      field: 'automationId',
      type: 'text',
      placeholder: 'abc123def4',
      description: 'Mailchimp automation workflow ID'
    },
    {
      label: 'Workflow Email ID',
      field: 'workflowEmailId',
      type: 'text',
      placeholder: 'abc123def4',
      description: 'Specific workflow email ID'
    },
    {
      label: 'Template Name',
      field: 'templateName',
      type: 'text',
      placeholder: 'My Custom Template',
      description: 'Template name'
    },
    {
      label: 'Folder ID',
      field: 'folderId',
      type: 'text',
      placeholder: 'abc123def4',
      description: 'Template folder ID'
    },
    {
      label: 'Count',
      field: 'count',
      type: 'number',
      placeholder: '100',
      defaultValue: 25,
      description: 'Number of results to return'
    },
    {
      label: 'Offset',
      field: 'offset',
      type: 'number',
      placeholder: '0',
      defaultValue: 0,
      description: 'Number of records to skip'
    },
    {
      label: 'Since Date',
      field: 'sinceDate',
      type: 'text',
      placeholder: '2024-01-01',
      description: 'Date filter (YYYY-MM-DD)'
    },
    {
      label: 'Before Date',
      field: 'beforeDate',
      type: 'text',
      placeholder: '2024-12-31',
      description: 'Date filter (YYYY-MM-DD)'
    },
    {
      label: 'Sort Field',
      field: 'sortField',
      type: 'select',
      defaultValue: 'created_at',
      options: [
        { value: 'created_at', label: 'Created Date' },
        { value: 'send_time', label: 'Send Time' },
        { value: 'title', label: 'Title' }
      ]
    },
    {
      label: 'Sort Direction',
      field: 'sortDir',
      type: 'select',
      defaultValue: 'DESC',
      options: [
        { value: 'ASC', label: 'Ascending' },
        { value: 'DESC', label: 'Descending' }
      ]
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // API key is always required
    if (!config.apiKey) {
      errors.apiKey = 'API key is required';
    }

    // Operation-specific validation
    switch (config.operation) {
      case 'createList':
        if (!config.listName) errors.listName = 'List name is required';
        if (!config.fromName) errors.fromName = 'From name is required';
        if (!config.fromEmail) errors.fromEmail = 'From email is required';
        break;
      
      case 'addMember':
        if (!config.listId) errors.listId = 'List ID is required';
        if (!config.emailAddress) errors.emailAddress = 'Email address is required';
        break;
      
      case 'batchSubscribe':
      case 'batchUnsubscribe':
      case 'batchUpdate':
        if (!config.listId) errors.listId = 'List ID is required';
        if (!config.batchMembers) errors.batchMembers = 'Batch members are required';
        break;
      
      case 'createCampaign':
        if (!config.listId) errors.listId = 'List ID is required';
        if (!config.subjectLine) errors.subjectLine = 'Subject line is required';
        if (!config.fromName) errors.fromName = 'From name is required';
        if (!config.fromEmail) errors.fromEmail = 'From email is required';
        break;
      
      case 'createSegment':
        if (!config.listId) errors.listId = 'List ID is required';
        if (!config.segmentName) errors.segmentName = 'Segment name is required';
        break;
      
      case 'createTemplate':
        if (!config.templateName) errors.templateName = 'Template name is required';
        if (!config.htmlContent) errors.htmlContent = 'HTML content is required';
        break;
      
      case 'scheduleCampaign':
        if (!config.campaignId) errors.campaignId = 'Campaign ID is required';
        if (!config.sendTime) errors.sendTime = 'Send time is required';
        break;
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON fields

    jsonFields.forEach(field => {
      if (config[field] && typeof config[field] === 'string') {
        try {
          config[field] = JSON.parse(config[field] as string);
        } catch (e) {
          // Keep as string
        }
      }
    });

    // Extract server prefix from API key
    if (config.apiKey) {
      const apiKey = String(config.apiKey);
      const serverMatch = apiKey.match(/-([a-z0-9]+)$/);
      config.serverPrefix = serverMatch ? serverMatch[1] : 'us1';
      config.apiUrl = `https://${config.serverPrefix}.api.mailchimp.com/3.0`;
    }

    // Set authentication headers
    config.headers = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    };

    return config;
  },

  examples: [
    {
      label: 'Subscribe User to Newsletter',
      config: {
        apiKey: 'your-api-key-us1',
        operation: 'addMember',
        listId: 'abc123def4',
        emailAddress: '{{$json.email}}',
        status: 'subscribed',
        mergeFields: JSON.stringify({
          FNAME: '{{$json.firstName}}',
          LNAME: '{{$json.lastName}}',
          PHONE: '{{$json.phone}}'
        }, null, 2),
        tags: JSON.stringify(['website', 'newsletter'], null, 2),
        doubleOptin: true,
        sendWelcome: true
      }
    },
    {
      label: 'Create Email Campaign',
      config: {
        apiKey: 'your-api-key-us1',
        operation: 'createCampaign',
        campaignType: 'regular',
        listId: 'abc123def4',
        subjectLine: 'Monthly Newsletter - {{$json.month}}',
        title: 'Monthly Newsletter Campaign',
        fromName: 'Your Company',
        fromEmail: 'newsletter@yourcompany.com',
        previewText: 'Check out our latest updates and offers...',
        htmlContent: '<h1>Hello {{FNAME}}!</h1><p>Welcome to our monthly newsletter...</p>',
        plainTextContent: 'Hello {{FNAME}}!\n\nWelcome to our monthly newsletter...'
      }
    },
    {
      label: 'Batch Subscribe from Form',
      config: {
        apiKey: 'your-api-key-us1',
        operation: 'batchSubscribe',
        listId: 'abc123def4',
        batchMembers: JSON.stringify([
          {
            email_address: '{{$json.emails[0]}}',
            status: 'subscribed',
            merge_fields: {
              FNAME: '{{$json.firstNames[0]}}',
              LNAME: '{{$json.lastNames[0]}}'
            }
          },
          {
            email_address: '{{$json.emails[1]}}',
            status: 'subscribed',
            merge_fields: {
              FNAME: '{{$json.firstNames[1]}}',
              LNAME: '{{$json.lastNames[1]}}'
            }
          }
        ], null, 2),
        updateExisting: true
      }
    },
    {
      label: 'Create VIP Customer Segment',
      config: {
        apiKey: 'your-api-key-us1',
        operation: 'createSegment',
        listId: 'abc123def4',
        segmentName: 'VIP Customers',
        segmentOptions: JSON.stringify({
          match: 'all',
          conditions: [
            {
              field: 'merge0',
              op: 'greater',
              value: '1000'
            },
            {
              field: 'EMAIL',
              op: 'contains',
              value: '@company.com'
            }
          ]
        }, null, 2)
      }
    },
    {
      label: 'Schedule Holiday Campaign',
      config: {
        apiKey: 'your-api-key-us1',
        operation: 'scheduleCampaign',
        campaignId: '{{$json.campaignId}}',
        sendTime: '2024-12-25T10:00:00+00:00'
      }
    },
    {
      label: 'Add Customer Tags',
      config: {
        apiKey: 'your-api-key-us1',
        operation: 'addTags',
        listId: 'abc123def4',
        emailAddress: '{{$json.email}}',
        tags: JSON.stringify(['customer', 'purchased', '{{$json.productCategory}}'], null, 2)
      }
    }
  ]
};
import { NodeConfigDefinition } from '../../../types/nodeConfig';

export const typeformConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Authentication',
      field: 'auth',
      type: 'credentials',
      required: true,
      credentialTypes: ['typeform-api'],
      placeholder: 'Select Typeform credentials',
      tooltip: 'Typeform Personal Access Token'
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      options: [
        // Form Operations
        { value: 'form_create', label: 'Create Form' },
        { value: 'form_update', label: 'Update Form' },
        { value: 'form_get', label: 'Get Form' },
        { value: 'form_list', label: 'List Forms' },
        { value: 'form_delete', label: 'Delete Form' },
        { value: 'form_clone', label: 'Clone Form' },
        { value: 'form_publish', label: 'Publish Form' },
        
        // Response Operations
        { value: 'response_list', label: 'List Responses' },
        { value: 'response_get', label: 'Get Response' },
        { value: 'response_delete', label: 'Delete Responses' },
        { value: 'response_export', label: 'Export Responses' },
        
        // Webhook Operations
        { value: 'webhook_create', label: 'Create Webhook' },
        { value: 'webhook_update', label: 'Update Webhook' },
        { value: 'webhook_get', label: 'Get Webhook' },
        { value: 'webhook_list', label: 'List Webhooks' },
        { value: 'webhook_delete', label: 'Delete Webhook' },
        
        // Analytics Operations
        { value: 'insights_get', label: 'Get Form Insights' },
        { value: 'metrics_get', label: 'Get Form Metrics' },
        
        // Theme Operations
        { value: 'theme_create', label: 'Create Theme' },
        { value: 'theme_update', label: 'Update Theme' },
        { value: 'theme_get', label: 'Get Theme' },
        { value: 'theme_list', label: 'List Themes' },
        { value: 'theme_delete', label: 'Delete Theme' },
        
        // Workspace Operations
        { value: 'workspace_get', label: 'Get Workspace' },
        { value: 'workspace_list', label: 'List Workspaces' },
        { value: 'workspace_update', label: 'Update Workspace' }
      ],
      defaultValue: 'form_list',
      tooltip: 'The operation to perform in Typeform'
    },
    {
      label: 'Form ID',
      field: 'formId',
      type: 'text',
      placeholder: 'lT4Z3j',
      required: function() {
        const formOps = [
          'form_update', 'form_get', 'form_delete', 'form_clone',
          'form_publish', 'response_list', 'response_get', 'response_delete',
          'response_export', 'insights_get', 'metrics_get'
        ];
        return formOps.includes(this.operation);
      },
      tooltip: 'The unique identifier of the form'
    },
    {
      label: 'Form Title',
      field: 'title',
      type: 'text',
      placeholder: 'Customer Feedback Survey',
      required: function() {
        return ['form_create', 'form_update'].includes(this.operation);
      },
      tooltip: 'Title of the form'
    },
    {
      label: 'Form Definition',
      field: 'formDefinition',
      type: 'json',
      placeholder: '{"fields": [{"type": "short_text", "title": "What is your name?"}]}',
      required: function() {
        return this.operation === 'form_create';
      },
      visible: function() {
        return ['form_create', 'form_update'].includes(this.operation);
      },
      tooltip: 'Complete form structure with fields, logic, and settings'
    },
    {
      label: 'Form Settings',
      field: 'settings',
      type: 'json',
      placeholder: '{"is_public": true, "is_trial": false, "language": "en"}',
      required: false,
      visible: function() {
        return ['form_create', 'form_update'].includes(this.operation);
      },
      tooltip: 'Form configuration settings'
    },
    {
      label: 'Theme ID',
      field: 'themeId',
      type: 'text',
      placeholder: '6lPNE6',
      required: false,
      visible: function() {
        const themeOps = [
          'form_create', 'form_update', 'theme_update', 'theme_get', 'theme_delete'
        ];
        return themeOps.includes(this.operation);
      }
    },
    {
      label: 'Response Token',
      field: 'responseToken',
      type: 'text',
      placeholder: '6lPNE6lPNE6lPNE6lPNE6lPNE6',
      required: function() {
        return this.operation === 'response_get';
      },
      visible: function() {
        return this.operation === 'response_get';
      },
      tooltip: 'Unique token for a specific response'
    },
    {
      label: 'Include Hidden Fields',
      field: 'includeHidden',
      type: 'boolean',
      defaultValue: true,
      visible: function() {
        return ['response_list', 'response_export'].includes(this.operation);
      },
      tooltip: 'Include hidden fields in response data'
    },
    {
      label: 'Completed Only',
      field: 'completed',
      type: 'boolean',
      defaultValue: true,
      visible: function() {
        return ['response_list', 'response_export'].includes(this.operation);
      },
      tooltip: 'Only include completed responses'
    },
    {
      label: 'Sort Order',
      field: 'sort',
      type: 'select',
      options: [
        { value: 'submitted_at,desc', label: 'Newest First' },
        { value: 'submitted_at,asc', label: 'Oldest First' }
      ],
      defaultValue: 'submitted_at,desc',
      visible: function() {
        return this.operation === 'response_list';
      }
    },
    {
      label: 'Date Filter (Since)',
      field: 'since',
      type: 'datetime',
      required: false,
      visible: function() {
        return ['response_list', 'response_export'].includes(this.operation);
      },
      tooltip: 'Only include responses submitted after this date'
    },
    {
      label: 'Date Filter (Until)',
      field: 'until',
      type: 'datetime',
      required: false,
      visible: function() {
        return ['response_list', 'response_export'].includes(this.operation);
      },
      tooltip: 'Only include responses submitted before this date'
    },
    {
      label: 'Export Format',
      field: 'format',
      type: 'select',
      options: [
        { value: 'json', label: 'JSON' },
        { value: 'csv', label: 'CSV' }
      ],
      defaultValue: 'json',
      visible: function() {
        return this.operation === 'response_export';
      }
    },
    {
      label: 'Webhook URL',
      field: 'url',
      type: 'url',
      placeholder: 'https://your-app.com/webhooks/typeform',
      required: function() {
        return this.operation === 'webhook_create';
      },
      visible: function() {
        return ['webhook_create', 'webhook_update'].includes(this.operation);
      },
      tooltip: 'URL to receive webhook notifications'
    },
    {
      label: 'Webhook Tag',
      field: 'tag',
      type: 'text',
      placeholder: 'customer_feedback',
      required: function() {
        return this.operation === 'webhook_create';
      },
      visible: function() {
        return ['webhook_create', 'webhook_update'].includes(this.operation);
      },
      tooltip: 'Identifier for this webhook'
    },
    {
      label: 'Webhook ID',
      field: 'webhookId',
      type: 'text',
      placeholder: 'lT4Z3j',
      required: function() {
        const webhookOps = ['webhook_update', 'webhook_get', 'webhook_delete'];
        return webhookOps.includes(this.operation);
      },
      visible: function() {
        const webhookOps = ['webhook_update', 'webhook_get', 'webhook_delete'];
        return webhookOps.includes(this.operation);
      }
    },
    {
      label: 'Webhook Secret',
      field: 'secret',
      type: 'password',
      placeholder: 'your-webhook-secret',
      required: false,
      visible: function() {
        return ['webhook_create', 'webhook_update'].includes(this.operation);
      },
      tooltip: 'Secret for webhook signature verification'
    },
    {
      label: 'Enable Webhook',
      field: 'enabled',
      type: 'boolean',
      defaultValue: true,
      visible: function() {
        return ['webhook_create', 'webhook_update'].includes(this.operation);
      }
    },
    {
      label: 'Verify SSL',
      field: 'verifySsl',
      type: 'boolean',
      defaultValue: true,
      visible: function() {
        return ['webhook_create', 'webhook_update'].includes(this.operation);
      },
      tooltip: 'Verify SSL certificate of webhook URL'
    },
    {
      label: 'Theme Name',
      field: 'themeName',
      type: 'text',
      placeholder: 'My Custom Theme',
      required: function() {
        return this.operation === 'theme_create';
      },
      visible: function() {
        return ['theme_create', 'theme_update'].includes(this.operation);
      }
    },
    {
      label: 'Theme Colors',
      field: 'colors',
      type: 'json',
      placeholder: '{"question": "#3D3D3D", "answer": "#4FB0AE", "button": "#4FB0AE", "background": "#FFFFFF"}',
      required: function() {
        return this.operation === 'theme_create';
      },
      visible: function() {
        return ['theme_create', 'theme_update'].includes(this.operation);
      },
      tooltip: 'Color scheme for the theme'
    },
    {
      label: 'Theme Font',
      field: 'font',
      type: 'select',
      options: [
        { value: 'Source Sans Pro', label: 'Source Sans Pro' },
        { value: 'Playfair Display', label: 'Playfair Display' },
        { value: 'Nunito', label: 'Nunito' },
        { value: 'Raleway', label: 'Raleway' },
        { value: 'Open Sans', label: 'Open Sans' },
        { value: 'Montserrat', label: 'Montserrat' },
        { value: 'Karla', label: 'Karla' },
        { value: 'Acumin', label: 'Acumin' }
      ],
      defaultValue: 'Source Sans Pro',
      visible: function() {
        return ['theme_create', 'theme_update'].includes(this.operation);
      }
    },
    {
      label: 'Workspace ID',
      field: 'workspaceId',
      type: 'text',
      placeholder: '01G2Z3ABC',
      required: function() {
        const workspaceOps = ['workspace_get', 'workspace_update'];
        return workspaceOps.includes(this.operation);
      },
      visible: function() {
        const workspaceOps = ['workspace_get', 'workspace_update'];
        return workspaceOps.includes(this.operation);
      }
    },
    {
      label: 'Workspace Name',
      field: 'workspaceName',
      type: 'text',
      placeholder: 'Marketing Team',
      required: function() {
        return this.operation === 'workspace_update';
      },
      visible: function() {
        return this.operation === 'workspace_update';
      }
    },
    {
      label: 'Search Query',
      field: 'search',
      type: 'text',
      placeholder: 'customer feedback',
      required: false,
      visible: function() {
        return this.operation === 'form_list';
      },
      tooltip: 'Search forms by title'
    },
    {
      label: 'Page Size',
      field: 'pageSize',
      type: 'number',
      placeholder: '200',
      defaultValue: 200,
      min: 1,
      max: 1000,
      visible: function() {
        const pageOps = ['form_list', 'response_list', 'webhook_list', 'theme_list', 'workspace_list'];
        return pageOps.includes(this.operation);
      }
    },
    {
      label: 'Page',
      field: 'page',
      type: 'number',
      placeholder: '1',
      defaultValue: 1,
      min: 1,
      visible: function() {
        const pageOps = ['form_list', 'response_list', 'webhook_list', 'theme_list', 'workspace_list'];
        return pageOps.includes(this.operation);
      }
    },
    {
      label: 'Include Fields',
      field: 'fields',
      type: 'multiselect',
      options: [
        { value: 'id', label: 'ID' },
        { value: 'title', label: 'Title' },
        { value: 'settings', label: 'Settings' },
        { value: 'theme', label: 'Theme' },
        { value: 'workspace', label: 'Workspace' },
        { value: '_links', label: 'Links' }
      ],
      defaultValue: ['id', 'title', 'settings'],
      visible: function() {
        return ['form_get', 'form_list'].includes(this.operation);
      },
      tooltip: 'Fields to include in the response'
    },
    {
      label: 'Clone Title',
      field: 'cloneTitle',
      type: 'text',
      placeholder: 'Copy of Customer Feedback Survey',
      required: function() {
        return this.operation === 'form_clone';
      },
      visible: function() {
        return this.operation === 'form_clone';
      }
    },
    {
      label: 'Include Responses',
      field: 'includeResponses',
      type: 'boolean',
      defaultValue: false,
      visible: function() {
        return this.operation === 'form_clone';
      },
      tooltip: 'Include existing responses in the cloned form'
    },
    {
      label: 'Delete Permanent',
      field: 'permanent',
      type: 'boolean',
      defaultValue: false,
      visible: function() {
        return ['form_delete', 'response_delete'].includes(this.operation);
      },
      tooltip: 'Permanently delete (cannot be recovered)'
    }
  ],

  validation: {
    title: (value) => {
      if (value && typeof value === 'string' && value.length > 60) {
        return 'Form title cannot exceed 60 characters';
      }
      return null;
    },
    url: (value) => {
      if (value && typeof value === 'string' && !/^https?:\/\/.+/.test(value)) {
        return 'Webhook URL must use HTTP or HTTPS protocol';
      }
      return null;
    },
    tag: (value) => {
      if (value && typeof value === 'string' && !/^[a-zA-Z0-9_-]+$/.test(value)) {
        return 'Webhook tag can only contain letters, numbers, underscores, and hyphens';
      }
      return null;
    },
    pageSize: (value) => {
      if (value && typeof value === 'number' && (value < 1 || value > 1000)) {
        return 'Page size must be between 1 and 1000';
      }
      return null;
    }
  },

  examples: [
    {
      name: 'Create Simple Contact Form',
      description: 'Create a basic contact form with name, email, and message fields',
      config: {
        operation: 'form_create',
        title: 'Contact Us Form',
        formDefinition: {
          fields: [
            {
              type: 'short_text',
              title: 'What is your name?',
              properties: {
                description: 'Please enter your full name'
              },
              validations: {
                required: true
              }
            },
            {
              type: 'email',
              title: 'What is your email address?',
              validations: {
                required: true
              }
            },
            {
              type: 'long_text',
              title: 'What would you like to tell us?',
              properties: {
                description: 'Please share your message or question'
              },
              validations: {
                required: true
              }
            }
          ]
        },
        settings: {
          is_public: true,
          language: 'en',
          progress_bar: 'proportion',
          show_progress_bar: true,
          show_typeform_branding: true
        }
      }
    },
    {
      name: 'Setup Form Webhook',
      description: 'Create webhook to receive form submissions',
      config: {
        operation: 'webhook_create',
        formId: 'lT4Z3j',
        url: 'https://api.myapp.com/webhooks/typeform',
        tag: 'contact_form_submissions',
        secret: 'my-secure-webhook-secret',
        enabled: true,
        verifySsl: true
      }
    },
    {
      name: 'Export Recent Responses',
      description: 'Export form responses from the last 30 days as CSV',
      config: {
        operation: 'response_export',
        formId: 'lT4Z3j',
        format: 'csv',
        completed: true,
        includeHidden: false,
        since: '2024-01-01T00:00:00Z'
      }
    },
    {
      name: 'Create Custom Theme',
      description: 'Create a branded theme with custom colors',
      config: {
        operation: 'theme_create',
        themeName: 'Company Brand Theme',
        colors: {
          question: '#2C3E50',
          answer: '#3498DB',
          button: '#E74C3C',
          background: '#ECF0F1'
        },
        font: 'Montserrat'
      }
    }
  ]
};
import { NodeConfigDefinition } from '../../../types/nodeConfig';

// Helper variables for validation and conditional logic
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const agentOps = [
  'agent_get', 'agent_update', 'agent_get_stats'
];

const ticketOps = [
  'ticket_get', 'ticket_update', 'ticket_delete',
  'ticket_add_comment', 'ticket_get_comments', 'ticket_get_metrics',
  'ticket_get_audits'
];

const userOps = [
  'user_get', 'user_update', 'user_delete', 'user_get_tickets'
];

const orgOps = [
  'org_get', 'org_update', 'org_delete', 'org_get_tickets'
];

const triggerOps = [
  'trigger_update', 'trigger_delete', 'trigger_test', 'trigger_get_activity'
];

const listOps = [
  'ticket_list', 'user_list', 'org_list', 'view_list'
];

const sortOps = [
  'ticket_list', 'user_list', 'org_list', 'search'
];

const pageOps = [
  'ticket_list', 'user_list', 'org_list', 'group_list',
  'agent_list', 'trigger_list', 'view_list', 'search'
];

const sideLoadOps = [
  'ticket_get', 'ticket_list', 'user_get', 'user_list'
];

export const zendeskConfig: NodeConfigDefinition = {
  fields: [
    // Authentication
    {
      label: 'Subdomain',
      field: 'subdomain',
      type: 'text',
      placeholder: 'yourcompany',
      required: true,
      tooltip: 'Your Zendesk subdomain (e.g., yourcompany from yourcompany.zendesk.com)'
    },
    {
      label: 'Authentication Type',
      field: 'authType',
      type: 'select',
      options: [
        { value: 'apiToken', label: 'API Token' },
        { value: 'oauth2', label: 'OAuth 2.0' },
        { value: 'basic', label: 'Basic Auth (Legacy)' }
      ],
      required: true,
      defaultValue: 'apiToken'
    },
    {
      label: 'Email',
      field: 'email',
      type: 'email',
      placeholder: 'agent@company.com',
      required: function() {
        return ['apiToken', 'basic'].includes(this.authType);
      }
    },
    {
      label: 'API Token',
      field: 'apiToken',
      type: 'password',
      required: function() {
        return this.authType === 'apiToken';
      },
      tooltip: 'Generate from Admin > API > Zendesk API'
    },
    {
      label: 'OAuth Token',
      field: 'oauthToken',
      type: 'password',
      required: function() {
        return this.authType === 'oauth2';
      }
    },
    {
      label: 'Password',
      field: 'password',
      type: 'password',
      required: function() {
        return this.authType === 'basic';
      }
    },

    // Operation
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // Ticket Operations
        { value: 'ticket_get', label: 'Get Ticket' },
        { value: 'ticket_list', label: 'List Tickets' },
        { value: 'ticket_create', label: 'Create Ticket' },
        { value: 'ticket_update', label: 'Update Ticket' },
        { value: 'ticket_delete', label: 'Delete Ticket' },
        { value: 'ticket_merge', label: 'Merge Tickets' },
        { value: 'ticket_mark_spam', label: 'Mark as Spam' },
        { value: 'ticket_mark_solved', label: 'Mark as Solved' },
        { value: 'ticket_add_comment', label: 'Add Ticket Comment' },
        { value: 'ticket_get_comments', label: 'Get Ticket Comments' },
        { value: 'ticket_get_metrics', label: 'Get Ticket Metrics' },
        { value: 'ticket_get_audits', label: 'Get Ticket Audits' },
        { value: 'ticket_bulk_update', label: 'Bulk Update Tickets' },
        { value: 'ticket_export', label: 'Export Tickets' },
        { value: 'ticket_import', label: 'Import Tickets' },
        { value: 'ticket_get_fields', label: 'Get Ticket Fields' },
        
        // User Operations
        { value: 'user_get', label: 'Get User' },
        { value: 'user_list', label: 'List Users' },
        { value: 'user_create', label: 'Create User' },
        { value: 'user_update', label: 'Update User' },
        { value: 'user_delete', label: 'Delete User' },
        { value: 'user_search', label: 'Search Users' },
        { value: 'user_get_tickets', label: 'Get User Tickets' },
        { value: 'user_merge', label: 'Merge Users' },
        
        // Organization Operations
        { value: 'org_get', label: 'Get Organization' },
        { value: 'org_list', label: 'List Organizations' },
        { value: 'org_create', label: 'Create Organization' },
        { value: 'org_update', label: 'Update Organization' },
        { value: 'org_delete', label: 'Delete Organization' },
        { value: 'org_get_tickets', label: 'Get Organization Tickets' },
        
        // Groups & Agents
        { value: 'group_list', label: 'List Groups' },
        { value: 'group_get', label: 'Get Group' },
        { value: 'agent_list', label: 'List Agents' },
        { value: 'agent_get', label: 'Get Agent' },
        { value: 'agent_update', label: 'Update Agent' },
        { value: 'agent_get_stats', label: 'Get Agent Statistics' },
        
        // Triggers & Automations
        { value: 'trigger_list', label: 'List Triggers' },
        { value: 'trigger_create', label: 'Create Trigger' },
        { value: 'trigger_update', label: 'Update Trigger' },
        { value: 'trigger_delete', label: 'Delete Trigger' },
        { value: 'trigger_test', label: 'Test Trigger' },
        { value: 'trigger_get_activity', label: 'Get Trigger Activity' },
        
        // Views & Reports
        { value: 'view_list', label: 'List Views' },
        { value: 'view_execute', label: 'Execute View' },
        { value: 'sla_get_policies', label: 'Get SLA Policies' },
        { value: 'satisfaction_get_ratings', label: 'Get Satisfaction Ratings' },
        { value: 'report_generate', label: 'Generate Report' },
        { value: 'analytics_get', label: 'Get Analytics' },
        
        // Search
        { value: 'search', label: 'Search' }
      ],
      required: true,
      tooltip: 'Zendesk operation to perform'
    },

    // Common Fields
    {
      label: 'Include Deleted',
      field: 'includeDeleted',
      type: 'boolean',
      defaultValue: false,
      showWhen: function() {
        const listOps = [
          'ticket_list', 'user_list', 'org_list', 'view_list'
        ];
        return listOps.includes(this.operation);
      }
    },
    {
      label: 'Sort By',
      field: 'sortBy',
      type: 'select',
      options: [
        { value: 'created_at', label: 'Created Date' },
        { value: 'updated_at', label: 'Updated Date' },
        { value: 'priority', label: 'Priority' },
        { value: 'status', label: 'Status' }
      ],
      defaultValue: 'created_at',
      showWhen: function() {
        const sortOps = [
          'ticket_list', 'user_list', 'org_list', 'search'
        ];
        return sortOps.includes(this.operation);
      }
    },
    {
      label: 'Sort Order',
      field: 'sortOrder',
      type: 'select',
      options: [
        { value: 'asc', label: 'Ascending' },
        { value: 'desc', label: 'Descending' }
      ],
      defaultValue: 'desc',
      showWhen: function() {
        const sortOps = [
          'ticket_list', 'user_list', 'org_list', 'search'
        ];
        return sortOps.includes(this.operation);
      }
    },
    {
      label: 'Page',
      field: 'page',
      type: 'number',
      placeholder: '1',
      defaultValue: 1,
      showWhen: function() {
        const pageOps = [
          'ticket_list', 'user_list', 'org_list', 'group_list',
          'agent_list', 'trigger_list', 'view_list', 'search'
        ];
        return pageOps.includes(this.operation);
      }
    },
    {
      label: 'Per Page',
      field: 'perPage',
      type: 'number',
      placeholder: '100',
      defaultValue: 100,
      validation: (value) => {
        const numValue = typeof value === 'string' ? parseInt(value, 10) : value as number;
        if (numValue && (numValue < 1 || numValue > 100)) {
          return 'Must be between 1 and 100';
        }
        return null;
      },
      showWhen: function(config) {
        const pageOps = [
          'ticket_list', 'user_list', 'org_list', 'group_list',
          'agent_list', 'trigger_list', 'view_list', 'search'
        ];
        return pageOps.includes(config?.operation as string);
      }
    },

    // Ticket Operations Fields
    {
      label: 'Ticket ID',
      field: 'ticketId',
      type: 'number',
      placeholder: '12345',
      required: function() {
        const ticketOps = [
          'ticket_get', 'ticket_update', 'ticket_delete',
          'ticket_add_comment', 'ticket_get_comments', 'ticket_get_metrics',
          'ticket_get_audits'
        ];
        return ticketOps.includes(this.operation);
      }
    },
    {
      label: 'Subject',
      field: 'subject',
      type: 'text',
      placeholder: 'Issue with login',
      required: function() {
        return this.operation === 'ticket_create';
      }
    },
    {
      label: 'Description',
      field: 'description',
      type: 'textarea',
      placeholder: 'Detailed description of the issue...',
      required: function() {
        return this.operation === 'ticket_create';
      }
    },
    {
      label: 'Priority',
      field: 'priority',
      type: 'select',
      options: [
        { value: 'urgent', label: 'Urgent' },
        { value: 'high', label: 'High' },
        { value: 'normal', label: 'Normal' },
        { value: 'low', label: 'Low' }
      ],
      defaultValue: 'normal',
      showWhen: function() {
        return ['ticket_create', 'ticket_update', 'ticket_list'].includes(this.operation);
      }
    },
    {
      label: 'Status',
      field: 'status',
      type: 'select',
      options: [
        { value: 'new', label: 'New' },
        { value: 'open', label: 'Open' },
        { value: 'pending', label: 'Pending' },
        { value: 'hold', label: 'On Hold' },
        { value: 'solved', label: 'Solved' },
        { value: 'closed', label: 'Closed' }
      ],
      showWhen: function() {
        return ['ticket_create', 'ticket_update', 'ticket_list'].includes(this.operation);
      }
    },
    {
      label: 'Type',
      field: 'type',
      type: 'select',
      options: [
        { value: 'problem', label: 'Problem' },
        { value: 'incident', label: 'Incident' },
        { value: 'question', label: 'Question' },
        { value: 'task', label: 'Task' }
      ],
      showWhen: function() {
        return ['ticket_create', 'ticket_update'].includes(this.operation);
      }
    },
    {
      label: 'Requester ID',
      field: 'requesterId',
      type: 'number',
      placeholder: '67890',
      required: function() {
        return this.operation === 'ticket_create';
      }
    },
    {
      label: 'Requester Email',
      field: 'requesterEmail',
      type: 'email',
      placeholder: 'customer@example.com',
      required: false,
      showWhen: function() {
        return this.operation === 'ticket_create' && !this.requesterId;
      },
      tooltip: 'Use if requester ID is not known'
    },
    {
      label: 'Assignee ID',
      field: 'assigneeId',
      type: 'number',
      placeholder: '54321',
      required: false,
      showWhen: function() {
        return ['ticket_create', 'ticket_update', 'ticket_list'].includes(this.operation);
      }
    },
    {
      label: 'Group ID',
      field: 'groupId',
      type: 'number',
      placeholder: '11111',
      required: false,
      showWhen: function() {
        return ['ticket_create', 'ticket_update', 'ticket_list'].includes(this.operation);
      }
    },
    {
      label: 'Organization ID',
      field: 'organizationId',
      type: 'number',
      placeholder: '99999',
      required: false,
      showWhen: function() {
        return ['ticket_create', 'ticket_update'].includes(this.operation);
      }
    },
    {
      label: 'Tags',
      field: 'tags',
      type: 'json',
      placeholder: '["bug", "urgent", "login-issue"]',
      required: false,
      showWhen: function() {
        return ['ticket_create', 'ticket_update'].includes(this.operation);
      }
    },
    {
      label: 'Custom Fields',
      field: 'customFields',
      type: 'json',
      placeholder: '[{"id": 123, "value": "custom_value"}]',
      required: false,
      showWhen: function() {
        return ['ticket_create', 'ticket_update'].includes(this.operation);
      }
    },

    // Comment Fields
    {
      label: 'Comment Body',
      field: 'body',
      type: 'textarea',
      placeholder: 'Your comment here...',
      required: function() {
        return this.operation === 'ticket_add_comment';
      }
    },
    {
      label: 'HTML Body',
      field: 'htmlBody',
      type: 'textarea',
      placeholder: '<p>Your HTML comment here...</p>',
      required: false,
      showWhen: function() {
        return this.operation === 'ticket_add_comment';
      }
    },
    {
      label: 'Public Comment',
      field: 'publicComment',
      type: 'boolean',
      defaultValue: true,
      showWhen: function() {
        return this.operation === 'ticket_add_comment';
      }
    },
    {
      label: 'Author ID',
      field: 'authorId',
      type: 'number',
      placeholder: '12345',
      required: false,
      showWhen: function() {
        return this.operation === 'ticket_add_comment';
      }
    },
    {
      label: 'Uploads',
      field: 'uploads',
      type: 'json',
      placeholder: '["upload_token_1", "upload_token_2"]',
      required: false,
      showWhen: function() {
        return this.operation === 'ticket_add_comment';
      },
      tooltip: 'Array of upload tokens from file uploads'
    },

    // Merge Tickets Fields
    {
      label: 'Source Ticket IDs',
      field: 'sourceTicketIds',
      type: 'json',
      placeholder: '[123, 456, 789]',
      required: function() {
        return this.operation === 'ticket_merge';
      }
    },
    {
      label: 'Target Ticket ID',
      field: 'targetTicketId',
      type: 'number',
      placeholder: '999',
      required: function() {
        return this.operation === 'ticket_merge';
      }
    },
    {
      label: 'Target Comment',
      field: 'targetComment',
      type: 'text',
      placeholder: 'Merged from tickets #123, #456',
      required: false,
      showWhen: function() {
        return this.operation === 'ticket_merge';
      }
    },
    {
      label: 'Source Comment',
      field: 'sourceComment',
      type: 'text',
      placeholder: 'This ticket was merged into #999',
      required: false,
      showWhen: function() {
        return this.operation === 'ticket_merge';
      }
    },

    // Bulk Update Fields
    {
      label: 'Ticket IDs',
      field: 'ticketIds',
      type: 'json',
      placeholder: '[123, 456, 789]',
      required: function() {
        return this.operation === 'ticket_bulk_update';
      }
    },

    // User Operations Fields
    {
      label: 'User ID',
      field: 'userId',
      type: 'number',
      placeholder: '67890',
      required: function() {
        const userOps = [
          'user_get', 'user_update', 'user_delete', 'user_get_tickets'
        ];
        return userOps.includes(this.operation);
      }
    },
    {
      label: 'Name',
      field: 'name',
      type: 'text',
      placeholder: 'John Doe',
      required: function() {
        return this.operation === 'user_create';
      }
    },
    {
      label: 'Email',
      field: 'userEmail',
      type: 'email',
      placeholder: 'user@example.com',
      required: function() {
        return this.operation === 'user_create';
      }
    },
    {
      label: 'Phone',
      field: 'phone',
      type: 'text',
      placeholder: '+1234567890',
      required: false,
      showWhen: function() {
        return ['user_create', 'user_update'].includes(this.operation);
      }
    },
    {
      label: 'Role',
      field: 'role',
      type: 'select',
      options: [
        { value: 'admin', label: 'Admin' },
        { value: 'agent', label: 'Agent' },
        { value: 'end-user', label: 'End User' }
      ],
      defaultValue: 'end-user',
      showWhen: function() {
        return ['user_create', 'user_update', 'user_list'].includes(this.operation);
      }
    },
    {
      label: 'Time Zone',
      field: 'timezone',
      type: 'text',
      placeholder: 'America/New_York',
      required: false,
      showWhen: function() {
        return ['user_create', 'user_update'].includes(this.operation);
      }
    },
    {
      label: 'Locale',
      field: 'locale',
      type: 'text',
      placeholder: 'en-US',
      required: false,
      showWhen: function() {
        return ['user_create', 'user_update'].includes(this.operation);
      }
    },
    {
      label: 'Verified',
      field: 'verified',
      type: 'boolean',
      defaultValue: false,
      showWhen: function() {
        return ['user_create', 'user_update'].includes(this.operation);
      }
    },
    {
      label: 'Active',
      field: 'active',
      type: 'boolean',
      defaultValue: true,
      showWhen: function() {
        return ['user_create', 'user_update'].includes(this.operation);
      }
    },
    {
      label: 'User Fields',
      field: 'userFields',
      type: 'json',
      placeholder: '{"department": "Sales", "employee_id": "EMP123"}',
      required: false,
      showWhen: function() {
        return ['user_create', 'user_update'].includes(this.operation);
      }
    },

    // Organization Operations Fields
    {
      label: 'Organization ID',
      field: 'orgId',
      type: 'number',
      placeholder: '99999',
      required: function() {
        const orgOps = [
          'org_get', 'org_update', 'org_delete', 'org_get_tickets'
        ];
        return orgOps.includes(this.operation);
      }
    },
    {
      label: 'Organization Name',
      field: 'orgName',
      type: 'text',
      placeholder: 'Acme Corporation',
      required: function() {
        return this.operation === 'org_create';
      }
    },
    {
      label: 'Domain Names',
      field: 'domainNames',
      type: 'json',
      placeholder: '["acme.com", "acmecorp.com"]',
      required: false,
      showWhen: function() {
        return ['org_create', 'org_update'].includes(this.operation);
      }
    },
    {
      label: 'Organization Fields',
      field: 'orgFields',
      type: 'json',
      placeholder: '{"industry": "Technology", "size": "1000+"}',
      required: false,
      showWhen: function() {
        return ['org_create', 'org_update'].includes(this.operation);
      }
    },

    // Group Fields
    {
      label: 'Group ID',
      field: 'groupIdValue',
      type: 'number',
      placeholder: '11111',
      required: function() {
        return this.operation === 'group_get';
      }
    },

    // Agent Fields
    {
      label: 'Agent ID',
      field: 'agentId',
      type: 'number',
      placeholder: '54321',
      required: function() {
        return agentOps.includes(this.operation);
      }
    },

    // Trigger Fields
    {
      label: 'Trigger ID',
      field: 'triggerId',
      type: 'number',
      placeholder: '77777',
      required: function() {
        const triggerOps = [
          'trigger_update', 'trigger_delete', 'trigger_test', 'trigger_get_activity'
        ];
        return triggerOps.includes(this.operation);
      }
    },
    {
      label: 'Trigger Title',
      field: 'triggerTitle',
      type: 'text',
      placeholder: 'Auto-assign to support',
      required: function() {
        return this.operation === 'trigger_create';
      }
    },
    {
      label: 'Trigger Conditions',
      field: 'triggerConditions',
      type: 'json',
      placeholder: '{"all": [{"field": "status", "operator": "is", "value": "new"}]}',
      required: function() {
        return ['trigger_create', 'trigger_update'].includes(this.operation);
      }
    },
    {
      label: 'Trigger Actions',
      field: 'triggerActions',
      type: 'json',
      placeholder: '[{"field": "group_id", "value": "11111"}]',
      required: function() {
        return ['trigger_create', 'trigger_update'].includes(this.operation);
      }
    },

    // View Fields
    {
      label: 'View ID',
      field: 'viewId',
      type: 'number',
      placeholder: '88888',
      required: function() {
        return this.operation === 'view_execute';
      }
    },

    // Search Fields
    {
      label: 'Search Query',
      field: 'query',
      type: 'text',
      placeholder: 'status:open priority:high',
      required: function() {
        return this.operation === 'search';
      },
      tooltip: 'Zendesk search syntax'
    },
    {
      label: 'Result Type',
      field: 'resultType',
      type: 'select',
      options: [
        { value: 'ticket', label: 'Tickets' },
        { value: 'user', label: 'Users' },
        { value: 'organization', label: 'Organizations' },
        { value: 'group', label: 'Groups' },
        { value: 'article', label: 'Articles' }
      ],
      defaultValue: 'ticket',
      showWhen: function() {
        return this.operation === 'search';
      }
    },

    // Date Range Filters
    {
      label: 'Created After',
      field: 'createdAfter',
      type: 'text',
      placeholder: '2024-01-01T00:00:00Z',
      required: false,
      showWhen: function() {
        return ['ticket_list', 'user_list', 'org_list'].includes(this.operation);
      }
    },
    {
      label: 'Created Before',
      field: 'createdBefore',
      type: 'text',
      placeholder: '2024-12-31T23:59:59Z',
      required: false,
      showWhen: function() {
        return ['ticket_list', 'user_list', 'org_list'].includes(this.operation);
      }
    },
    {
      label: 'Updated After',
      field: 'updatedAfter',
      type: 'text',
      placeholder: '2024-01-01T00:00:00Z',
      required: false,
      showWhen: function() {
        return ['ticket_list', 'user_list', 'org_list'].includes(this.operation);
      }
    },
    {
      label: 'Updated Before',
      field: 'updatedBefore',
      type: 'text',
      placeholder: '2024-12-31T23:59:59Z',
      required: false,
      showWhen: function() {
        return ['ticket_list', 'user_list', 'org_list'].includes(this.operation);
      }
    },

    // Advanced Options
    {
      label: 'Side Loads',
      field: 'sideLoads',
      type: 'json',
      placeholder: '["users", "groups", "organizations"]',
      required: false,
      showWhen: function() {
        const sideLoadOps = [
          'ticket_get', 'ticket_list', 'user_get', 'user_list'
        ];
        return sideLoadOps.includes(this.operation);
      },
      tooltip: 'Include related data in response'
    }
  ],

  examples: [
    {
      name: 'Create Support Ticket',
      description: 'Create a new support ticket with priority and tags',
      config: {
        subdomain: 'mycompany',
        authType: 'apiToken',
        email: 'support@mycompany.com',
        apiToken: '${ZENDESK_API_TOKEN}',
        operation: 'ticket_create',
        subject: 'Login issue - Cannot access account',
        description: 'Customer reports being unable to login since this morning. Error message: "Invalid credentials" despite using correct password.',
        priority: 'high',
        type: 'problem',
        requesterEmail: 'customer@example.com',
        tags: ['login-issue', 'high-priority', 'authentication'],
        customFields: [
          { id: 360001234567, value: 'web-app' },
          { id: 360001234568, value: 'v2.1.0' }
        ]
      }
    },
    {
      name: 'Auto-Escalate Urgent Tickets',
      description: 'Find and escalate high-priority unassigned tickets',
      config: {
        subdomain: 'mycompany',
        authType: 'apiToken',
        email: 'support@mycompany.com',
        apiToken: '${ZENDESK_API_TOKEN}',
        operation: 'ticket_list',
        status: ['new', 'open'],
        priority: ['high', 'urgent'],
        assigneeId: null,
        sortBy: 'created_at',
        sortOrder: 'asc',
        perPage: 50
      }
    },
    {
      name: 'Add Internal Note',
      description: 'Add an internal comment to track investigation progress',
      config: {
        subdomain: 'mycompany',
        authType: 'apiToken',
        email: 'agent@mycompany.com',
        apiToken: '${ZENDESK_API_TOKEN}',
        operation: 'ticket_add_comment',
        ticketId: 12345,
        body: 'Investigation update: Found root cause in authentication service. Database connection timeout was causing login failures. Fix deployed to staging, awaiting production deployment.',
        publicComment: false,
        authorId: 67890
      }
    },
    {
      name: 'Customer Satisfaction Follow-up',
      description: 'Search for recently solved tickets for feedback',
      config: {
        subdomain: 'mycompany',
        authType: 'apiToken',
        email: 'support@mycompany.com',
        apiToken: '${ZENDESK_API_TOKEN}',
        operation: 'search',
        query: 'status:solved updated>"7 days ago" satisfaction:offered_not_rated',
        resultType: 'ticket',
        sortBy: 'updated_at',
        sortOrder: 'desc'
      }
    },
    {
      name: 'Bulk Assign to Team',
      description: 'Assign multiple tickets to a specific support group',
      config: {
        subdomain: 'mycompany',
        authType: 'apiToken',
        email: 'support@mycompany.com',
        apiToken: '${ZENDESK_API_TOKEN}',
        operation: 'ticket_bulk_update',
        ticketIds: [123, 456, 789, 101, 112],
        groupId: 54321,
        status: 'open',
        tags: ['bulk-assigned', 'technical-support']
      }
    },
    {
      name: 'Create Automation Trigger',
      description: 'Auto-assign tickets based on keywords',
      config: {
        subdomain: 'mycompany',
        authType: 'apiToken',
        email: 'admin@mycompany.com',
        apiToken: '${ZENDESK_API_TOKEN}',
        operation: 'trigger_create',
        triggerTitle: 'Auto-assign billing tickets',
        triggerConditions: {
          all: [
            { field: 'status', operator: 'is', value: 'new' },
            { field: 'comment_text', operator: 'contains', value: 'billing' }
          ]
        },
        triggerActions: [
          { field: 'group_id', value: '99999' },
          { field: 'priority', value: 'high' },
          { field: 'add_tags', value: 'billing auto-assigned' }
        ]
      }
    }
  ]
};
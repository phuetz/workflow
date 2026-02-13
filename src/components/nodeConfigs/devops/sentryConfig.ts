import { NodeConfigDefinition } from '../../../types/nodeConfig';

export const sentryConfig: NodeConfigDefinition = {
  fields: [
    // Authentication
    {
      label: 'Sentry DSN',
      field: 'dsn',
      type: 'text',
      placeholder: 'https://abc123@o123456.ingest.sentry.io/123456',
      required: true,
      description: 'Data Source Name for your Sentry project'
    },
    {
      label: 'API Token',
      field: 'apiToken',
      type: 'password',
      required: true,
      description: 'Sentry API authentication token'
    },
    {
      label: 'Organization Slug',
      field: 'organization',
      type: 'text',
      placeholder: 'my-org',
      required: true,
      description: 'Your Sentry organization slug'
    },
    {
      label: 'Sentry Host',
      field: 'sentryHost',
      type: 'text',
      placeholder: 'https://sentry.io',
      defaultValue: 'https://sentry.io',
      required: false,
      description: 'Sentry instance URL (for self-hosted)'
    },

    // Operation
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // Error/Event Operations
        { value: 'capture_error', label: 'Capture Error' },
        { value: 'capture_message', label: 'Capture Message' },
        { value: 'capture_exception', label: 'Capture Exception' },
        { value: 'capture_event', label: 'Capture Custom Event' },
        { value: 'add_breadcrumb', label: 'Add Breadcrumb' },
        { value: 'set_context', label: 'Set Context' },
        { value: 'set_user', label: 'Set User Context' },
        { value: 'set_tags', label: 'Set Tags' },
        { value: 'set_extra', label: 'Set Extra Data' },
        
        // Issue Operations
        { value: 'issue_list', label: 'List Issues' },
        { value: 'issue_get', label: 'Get Issue Details' },
        { value: 'issue_update', label: 'Update Issue' },
        { value: 'issue_delete', label: 'Delete Issue' },
        { value: 'issue_events', label: 'Get Issue Events' },
        { value: 'issue_resolve', label: 'Resolve Issue' },
        { value: 'issue_ignore', label: 'Ignore Issue' },
        { value: 'issue_assign', label: 'Assign Issue' },
        { value: 'issue_merge', label: 'Merge Issues' },
        
        // Project Operations
        { value: 'project_list', label: 'List Projects' },
        { value: 'project_get', label: 'Get Project Details' },
        { value: 'project_create', label: 'Create Project' },
        { value: 'project_update', label: 'Update Project' },
        { value: 'project_delete', label: 'Delete Project' },
        { value: 'project_keys', label: 'Get Project Keys' },
        { value: 'project_stats', label: 'Get Project Stats' },
        { value: 'project_issues', label: 'Get Project Issues' },
        
        // Release Operations
        { value: 'release_create', label: 'Create Release' },
        { value: 'release_list', label: 'List Releases' },
        { value: 'release_get', label: 'Get Release Details' },
        { value: 'release_update', label: 'Update Release' },
        { value: 'release_delete', label: 'Delete Release' },
        { value: 'release_deploy', label: 'Create Deploy' },
        { value: 'release_commits', label: 'Associate Commits' },
        { value: 'release_files', label: 'Upload Source Maps' },
        
        // Performance Operations
        { value: 'transaction_start', label: 'Start Transaction' },
        { value: 'transaction_finish', label: 'Finish Transaction' },
        { value: 'span_start', label: 'Start Span' },
        { value: 'span_finish', label: 'Finish Span' },
        { value: 'performance_stats', label: 'Get Performance Stats' },
        
        // Team Operations
        { value: 'team_list', label: 'List Teams' },
        { value: 'team_get', label: 'Get Team Details' },
        { value: 'team_create', label: 'Create Team' },
        { value: 'team_update', label: 'Update Team' },
        { value: 'team_delete', label: 'Delete Team' },
        { value: 'team_members', label: 'Get Team Members' },
        
        // Alert Operations
        { value: 'alert_list', label: 'List Alert Rules' },
        { value: 'alert_get', label: 'Get Alert Rule' },
        { value: 'alert_create', label: 'Create Alert Rule' },
        { value: 'alert_update', label: 'Update Alert Rule' },
        { value: 'alert_delete', label: 'Delete Alert Rule' },
        { value: 'alert_history', label: 'Get Alert History' },
        
        // Integration Operations
        { value: 'integration_list', label: 'List Integrations' },
        { value: 'integration_install', label: 'Install Integration' },
        { value: 'integration_configure', label: 'Configure Integration' },
        { value: 'webhook_create', label: 'Create Webhook' }
      ],
      required: true,
      description: 'Sentry operation to perform'
    },

    // Error Capture Fields
    {
      label: 'Error Message',
      field: 'errorMessage',
      type: 'text',
      placeholder: 'An error occurred in the payment process',
      required: false,
      description: 'Required for capture_error and capture_message operations'
    },
    {
      label: 'Error Level',
      field: 'level',
      type: 'select',
      options: [
        { value: 'debug', label: 'Debug' },
        { value: 'info', label: 'Info' },
        { value: 'warning', label: 'Warning' },
        { value: 'error', label: 'Error' },
        { value: 'fatal', label: 'Fatal' }
      ],
      defaultValue: 'error',
      description: 'Severity level for capture operations'
    },
    {
      label: 'Exception Type',
      field: 'exceptionType',
      type: 'text',
      placeholder: 'ValueError',
      required: false,
      description: 'Required for capture_exception operation'
    },
    {
      label: 'Exception Value',
      field: 'exceptionValue',
      type: 'text',
      placeholder: 'Invalid input: expected number',
      required: false,
      description: 'Required for capture_exception operation'
    },
    {
      label: 'Stack Trace',
      field: 'stackTrace',
      type: 'text',
      placeholder: 'at processPayment (payment.js:45)\nat handleSubmit (form.js:123)',
      required: false,
      description: 'Stack trace for error operations'
    },
    {
      label: 'Fingerprint',
      field: 'fingerprint',
      type: 'json',
      placeholder: '["payment-error", "invalid-card"]',
      required: false,
      description: 'Custom fingerprint for grouping errors'
    },
    {
      label: 'Environment',
      field: 'environment',
      type: 'text',
      placeholder: 'production',
      defaultValue: 'production',
      description: 'Environment name (production, staging, development)'
    },
    {
      label: 'Release',
      field: 'release',
      type: 'text',
      placeholder: 'myapp@2.0.0',
      required: false,
      description: 'Release version for tracking'
    },

    // Context Fields
    {
      label: 'User ID',
      field: 'userId',
      type: 'text',
      placeholder: 'user123',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'set_user';
      }
    },
    {
      label: 'User Email',
      field: 'userEmail',
      type: 'email',
      placeholder: 'user@example.com',
      required: false,
      showWhen: (config?: Record<string, unknown>) => {
        return config?.operation === 'set_user';
      }
    },
    {
      label: 'User Username',
      field: 'userUsername',
      type: 'text',
      placeholder: 'johndoe',
      required: false,
      showWhen: (config?: Record<string, unknown>) => {
        return config?.operation === 'set_user';
      }
    },
    {
      label: 'User IP Address',
      field: 'userIpAddress',
      type: 'text',
      placeholder: '192.168.1.1',
      required: false,
      showWhen: (config?: Record<string, unknown>) => {
        return config?.operation === 'set_user';
      }
    },
    {
      label: 'Tags',
      field: 'tags',
      type: 'json',
      placeholder: '{\n  "module": "payment",\n  "customer_type": "premium",\n  "region": "us-east"\n}',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'set_tags';
      }
    },
    {
      label: 'Context Data',
      field: 'contextData',
      type: 'json',
      placeholder: '{\n  "browser": "Chrome 96",\n  "os": "Windows 10",\n  "device": "Desktop"\n}',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'set_context';
      }
    },
    {
      label: 'Extra Data',
      field: 'extraData',
      type: 'json',
      placeholder: '{\n  "cart_value": 150.00,\n  "items_count": 3,\n  "session_duration": 300\n}',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'set_extra';
      }
    },

    // Breadcrumb Fields
    {
      label: 'Breadcrumb Type',
      field: 'breadcrumbType',
      type: 'select',
      options: [
        { value: 'default', label: 'Default' },
        { value: 'navigation', label: 'Navigation' },
        { value: 'http', label: 'HTTP Request' },
        { value: 'database', label: 'Database Query' },
        { value: 'transaction', label: 'Transaction' },
        { value: 'ui', label: 'UI Action' },
        { value: 'user', label: 'User Action' }
      ],
      defaultValue: 'default',
      showWhen: (config?: Record<string, unknown>) => {
        return config?.operation === 'add_breadcrumb';
      }
    },
    {
      label: 'Breadcrumb Message',
      field: 'breadcrumbMessage',
      type: 'text',
      placeholder: 'User clicked checkout button',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'add_breadcrumb';
      }
    },
    {
      label: 'Breadcrumb Category',
      field: 'breadcrumbCategory',
      type: 'text',
      placeholder: 'ui.click',
      required: false,
      showWhen: (config?: Record<string, unknown>) => {
        return config?.operation === 'add_breadcrumb';
      }
    },
    {
      label: 'Breadcrumb Data',
      field: 'breadcrumbData',
      type: 'json',
      placeholder: '{\n  "button_id": "checkout-btn",\n  "cart_value": 150.00\n}',
      required: false,
      showWhen: (config?: Record<string, unknown>) => {
        return config?.operation === 'add_breadcrumb';
      }
    },

    // Issue Operations Fields
    {
      label: 'Project Slug',
      field: 'projectSlug',
      type: 'text',
      placeholder: 'my-project',
      required: (config?: Record<string, unknown>) => {
        const projectOps = [
          'issue_list', 'project_get', 'project_update', 'project_delete',
          'project_keys', 'project_stats', 'project_issues', 'release_create',
          'release_list', 'alert_create'
        ];
        return projectOps.includes(config?.operation as string);
      }
    },
    {
      label: 'Issue ID',
      field: 'issueId',
      type: 'text',
      placeholder: '123456789',
      required: (config?: Record<string, unknown>) => {
        const issueOps = [
          'issue_get', 'issue_update', 'issue_delete', 'issue_events',
          'issue_resolve', 'issue_ignore', 'issue_assign', 'issue_merge'
        ];
        return issueOps.includes(config?.operation as string);
      }
    },
    {
      label: 'Query',
      field: 'query',
      type: 'text',
      placeholder: 'is:unresolved error.type:TypeError',
      required: false,
      showWhen: (config?: Record<string, unknown>) => {
        return ['issue_list', 'project_issues'].includes(config?.operation as string);
      },
      tooltip: 'Sentry search query syntax'
    },
    {
      label: 'Status',
      field: 'status',
      type: 'select',
      options: [
        { value: 'resolved', label: 'Resolved' },
        { value: 'unresolved', label: 'Unresolved' },
        { value: 'ignored', label: 'Ignored' },
        { value: 'resolvedInNextRelease', label: 'Resolved in Next Release' }
      ],
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'issue_update';
      }
    },
    {
      label: 'Assignee',
      field: 'assignee',
      type: 'text',
      placeholder: 'user@example.com or team:frontend',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'issue_assign';
      }
    },
    {
      label: 'Ignore Duration',
      field: 'ignoreDuration',
      type: 'number',
      placeholder: '60',
      required: false,
      showWhen: (config?: Record<string, unknown>) => {
        return config?.operation === 'issue_ignore';
      },
      tooltip: 'Duration in minutes'
    },
    {
      label: 'Target Issue ID',
      field: 'targetIssueId',
      type: 'text',
      placeholder: '987654321',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'issue_merge';
      }
    },

    // Project Operations Fields
    {
      label: 'Project Name',
      field: 'projectName',
      type: 'text',
      placeholder: 'My New Project',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'project_create';
      }
    },
    {
      label: 'Platform',
      field: 'platform',
      type: 'select',
      options: [
        { value: 'javascript', label: 'JavaScript' },
        { value: 'javascript-react', label: 'React' },
        { value: 'javascript-vue', label: 'Vue' },
        { value: 'javascript-angular', label: 'Angular' },
        { value: 'node', label: 'Node.js' },
        { value: 'python', label: 'Python' },
        { value: 'python-django', label: 'Django' },
        { value: 'python-flask', label: 'Flask' },
        { value: 'ruby', label: 'Ruby' },
        { value: 'ruby-rails', label: 'Rails' },
        { value: 'go', label: 'Go' },
        { value: 'java', label: 'Java' },
        { value: 'java-spring', label: 'Spring' },
        { value: 'php', label: 'PHP' },
        { value: 'php-laravel', label: 'Laravel' },
        { value: 'dotnet', label: '.NET' },
        { value: 'dotnet-aspnetcore', label: 'ASP.NET Core' },
        { value: 'ios', label: 'iOS' },
        { value: 'android', label: 'Android' },
        { value: 'react-native', label: 'React Native' }
      ],
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'project_create';
      }
    },
    {
      label: 'Default Alert Settings',
      field: 'defaultAlerts',
      type: 'checkbox',
      defaultValue: true,
      showWhen: (config?: Record<string, unknown>) => {
        return config?.operation === 'project_create';
      }
    },

    // Release Operations Fields
    {
      label: 'Version',
      field: 'version',
      type: 'text',
      placeholder: 'myapp@2.0.0 or 2.0.0+build.123',
      required: (config?: Record<string, unknown>) => {
        const releaseOps = [
          'release_create', 'release_get', 'release_update',
          'release_delete', 'release_deploy', 'release_commits',
          'release_files'
        ];
        return releaseOps.includes(config?.operation as string);
      }
    },
    {
      label: 'Release URL',
      field: 'releaseUrl',
      type: 'text',
      placeholder: 'https://github.com/org/repo/releases/tag/v2.0.0',
      required: false,
      showWhen: (config?: Record<string, unknown>) => {
        return ['release_create', 'release_update'].includes(config?.operation as string);
      }
    },
    {
      label: 'Deploy Name',
      field: 'deployName',
      type: 'text',
      placeholder: 'production-us-east',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'release_deploy';
      }
    },
    {
      label: 'Deploy URL',
      field: 'deployUrl',
      type: 'text',
      placeholder: 'https://app.example.com',
      required: false,
      showWhen: (config?: Record<string, unknown>) => {
        return config?.operation === 'release_deploy';
      }
    },
    {
      label: 'Commits',
      field: 'commits',
      type: 'json',
      placeholder: '[\n  {\n    "id": "abc123",\n    "message": "Fix payment bug",\n    "author_name": "John Doe",\n    "author_email": "john@example.com"\n  }\n]',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'release_commits';
      }
    },
    {
      label: 'Source Maps',
      field: 'sourceMaps',
      type: 'json',
      placeholder: '[\n  {\n    "name": "~/app.min.js",\n    "file": "/path/to/app.min.js",\n    "file_map": "/path/to/app.min.js.map"\n  }\n]',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'release_files';
      }
    },

    // Performance Fields
    {
      label: 'Transaction Name',
      field: 'transactionName',
      type: 'text',
      placeholder: '/api/checkout',
      required: (config?: Record<string, unknown>) => {
        return ['transaction_start', 'transaction_finish'].includes(config?.operation as string);
      }
    },
    {
      label: 'Transaction ID',
      field: 'transactionId',
      type: 'text',
      placeholder: 'txn-123456',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'transaction_finish';
      }
    },
    {
      label: 'Operation',
      field: 'transactionOp',
      type: 'text',
      placeholder: 'http.request',
      required: false,
      showWhen: (config?: Record<string, unknown>) => {
        return ['transaction_start', 'span_start'].includes(config?.operation as string);
      }
    },
    {
      label: 'Span Description',
      field: 'spanDescription',
      type: 'text',
      placeholder: 'SELECT * FROM users',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'span_start';
      }
    },
    {
      label: 'Span ID',
      field: 'spanId',
      type: 'text',
      placeholder: 'span-789',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'span_finish';
      }
    },
    {
      label: 'Start Timestamp',
      field: 'startTimestamp',
      type: 'text',
      placeholder: '2023-12-01T10:00:00Z',
      required: false,
      showWhen: (config?: Record<string, unknown>) => {
        return ['transaction_start', 'span_start'].includes(config?.operation as string);
      }
    },

    // Team Operations Fields
    {
      label: 'Team Slug',
      field: 'teamSlug',
      type: 'text',
      placeholder: 'frontend-team',
      required: (config?: Record<string, unknown>) => {
        const teamOps = [
          'team_get', 'team_update', 'team_delete', 'team_members'
        ];
        return teamOps.includes(config?.operation as string);
      }
    },
    {
      label: 'Team Name',
      field: 'teamName',
      type: 'text',
      placeholder: 'Frontend Team',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'team_create';
      }
    },

    // Alert Operations Fields
    {
      label: 'Alert Rule Name',
      field: 'alertName',
      type: 'text',
      placeholder: 'High Error Rate Alert',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'alert_create';
      }
    },
    {
      label: 'Alert Rule ID',
      field: 'alertId',
      type: 'text',
      placeholder: '123',
      required: (config?: Record<string, unknown>) => {
        const alertOps = [
          'alert_get', 'alert_update', 'alert_delete', 'alert_history'
        ];
        return alertOps.includes(config?.operation as string);
      }
    },
    {
      label: 'Alert Conditions',
      field: 'alertConditions',
      type: 'json',
      placeholder: '{\n  "id": "sentry.rules.conditions.event_frequency.EventFrequencyCondition",\n  "value": 100,\n  "interval": "1h"\n}',
      required: (config?: Record<string, unknown>) => {
        return ['alert_create', 'alert_update'].includes(config?.operation as string);
      }
    },
    {
      label: 'Alert Actions',
      field: 'alertActions',
      type: 'json',
      placeholder: '[\n  {\n    "id": "sentry.integrations.slack.notify_action.SlackNotifyServiceAction",\n    "channel": "#alerts"\n  }\n]',
      required: (config?: Record<string, unknown>) => {
        return ['alert_create', 'alert_update'].includes(config?.operation as string);
      }
    },
    {
      label: 'Alert Frequency',
      field: 'alertFrequency',
      type: 'number',
      placeholder: '30',
      defaultValue: 30,
      showWhen: (config?: Record<string, unknown>) => {
        return ['alert_create', 'alert_update'].includes(config?.operation as string);
      },
      tooltip: 'Minutes between alert notifications'
    },

    // Integration Fields
    {
      label: 'Integration Provider',
      field: 'provider',
      type: 'select',
      options: [
        { value: 'slack', label: 'Slack' },
        { value: 'github', label: 'GitHub' },
        { value: 'gitlab', label: 'GitLab' },
        { value: 'jira', label: 'Jira' },
        { value: 'pagerduty', label: 'PagerDuty' },
        { value: 'webhook', label: 'Webhook' }
      ],
      required: (config?: Record<string, unknown>) => {
        return ['integration_install', 'integration_configure'].includes(config?.operation as string);
      }
    },
    {
      label: 'Integration ID',
      field: 'integrationId',
      type: 'text',
      placeholder: 'int-123',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'integration_configure';
      }
    },
    {
      label: 'Webhook URL',
      field: 'webhookUrl',
      type: 'text',
      placeholder: 'https://example.com/webhook',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'webhook_create';
      }
    },
    {
      label: 'Webhook Events',
      field: 'webhookEvents',
      type: 'json',
      placeholder: '["issue.created", "issue.resolved", "error.created"]',
      required: (config?: Record<string, unknown>) => {
        return config?.operation === 'webhook_create';
      }
    },

    // Pagination and Filtering
    {
      label: 'Page',
      field: 'page',
      type: 'number',
      placeholder: '1',
      defaultValue: 1,
      showWhen: (config?: Record<string, unknown>) => {
        const listOps = [
          'issue_list', 'project_list', 'release_list', 'team_list',
          'alert_list', 'project_issues', 'issue_events'
        ];
        return listOps.includes(config?.operation as string);
      }
    },
    {
      label: 'Page Size',
      field: 'pageSize',
      type: 'number',
      placeholder: '50',
      defaultValue: 50,
      showWhen: (config?: Record<string, unknown>) => {
        const listOps = [
          'issue_list', 'project_list', 'release_list', 'team_list',
          'alert_list', 'project_issues', 'issue_events'
        ];
        return listOps.includes(config?.operation as string);
      }
    },
    {
      label: 'Sort By',
      field: 'sortBy',
      type: 'select',
      options: [
        { value: 'date', label: 'Date' },
        { value: 'priority', label: 'Priority' },
        { value: 'freq', label: 'Frequency' },
        { value: 'new', label: 'First Seen' }
      ],
      defaultValue: 'date',
      showWhen: (config?: Record<string, unknown>) => {
        return ['issue_list', 'project_issues'].includes(config?.operation as string);
      }
    },
    {
      label: 'Time Range',
      field: 'statsPeriod',
      type: 'select',
      options: [
        { value: '1h', label: 'Last Hour' },
        { value: '24h', label: 'Last 24 Hours' },
        { value: '7d', label: 'Last 7 Days' },
        { value: '14d', label: 'Last 14 Days' },
        { value: '30d', label: 'Last 30 Days' },
        { value: '90d', label: 'Last 90 Days' }
      ],
      defaultValue: '24h',
      showWhen: (config?: Record<string, unknown>) => {
        const statsOps = [
          'issue_list', 'project_stats', 'performance_stats',
          'alert_history'
        ];
        return statsOps.includes(config?.operation as string);
      }
    }
  ],

  examples: [
    {
      label: 'Capture Payment Error',
      config: {
        dsn: 'https://abc123@o123456.ingest.sentry.io/123456',
        apiToken: '${SENTRY_AUTH_TOKEN}',
        organization: 'my-company',
        operation: 'capture_error',
        errorMessage: 'Payment failed: Card declined',
        level: 'error',
        environment: 'production',
        release: 'ecommerce@2.1.0',
        tags: {
          'module': 'payment',
          'payment_method': 'credit_card',
          'customer_type': 'premium'
        },
        extraData: {
          'card_last_four': '4242',
          'amount': 150.00,
          'currency': 'USD',
          'attempt_count': 3
        }
      }
    },
    {
      label: 'Monitor Performance',
      config: {
        dsn: 'https://abc123@o123456.ingest.sentry.io/123456',
        apiToken: '${SENTRY_AUTH_TOKEN}',
        organization: 'my-company',
        operation: 'transaction_start',
        transactionName: 'POST /api/checkout',
        transactionOp: 'http.server',
        environment: 'production',
        tags: {
          'endpoint': '/api/checkout',
          'method': 'POST',
          'server': 'api-server-01'
        }
      }
    },
    {
      label: 'Create Error Alert',
      config: {
        apiToken: '${SENTRY_AUTH_TOKEN}',
        organization: 'my-company',
        projectSlug: 'web-app',
        operation: 'alert_create',
        alertName: 'High Error Rate - Production',
        alertConditions: {
          'id': 'sentry.rules.conditions.event_frequency.EventFrequencyCondition',
          'value': 100,
          'interval': '1h'
        },
        alertActions: [
          {
            'id': 'sentry.integrations.slack.notify_action.SlackNotifyServiceAction',
            'channel': '#production-alerts',
            'workspace': 'workspace-id'
          }
        ],
        alertFrequency: 60
      }
    },
    {
      label: 'Track User Journey',
      config: {
        dsn: 'https://abc123@o123456.ingest.sentry.io/123456',
        apiToken: '${SENTRY_AUTH_TOKEN}',
        organization: 'my-company',
        operation: 'add_breadcrumb',
        breadcrumbType: 'user',
        breadcrumbMessage: 'User completed checkout',
        breadcrumbCategory: 'ui.click',
        breadcrumbData: {
          'button_id': 'complete-order-btn',
          'cart_total': 250.00,
          'items_count': 5,
          'payment_method': 'paypal'
        }
      }
    },
    {
      label: 'Search and Resolve Issues',
      config: {
        apiToken: '${SENTRY_AUTH_TOKEN}',
        organization: 'my-company',
        projectSlug: 'backend-api',
        operation: 'issue_list',
        query: 'is:unresolved error.type:TypeError level:error',
        sortBy: 'freq',
        statsPeriod: '24h',
        pageSize: 100
      }
    },
    {
      label: 'Deploy New Release',
      config: {
        apiToken: '${SENTRY_AUTH_TOKEN}',
        organization: 'my-company',
        projectSlug: 'web-app',
        operation: 'release_deploy',
        version: 'webapp@3.0.0',
        environment: 'production',
        deployName: 'production-us-east-1',
        deployUrl: 'https://app.example.com',
        commits: [
          {
            'id': 'abc123def456',
            'message': 'Fix: Resolve payment processing error',
            'author_name': 'John Doe',
            'author_email': 'john@example.com'
          }
        ]
      }
    }
  ]
};
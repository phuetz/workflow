import { NodeConfigDefinition, validators } from '../../../types/nodeConfig';

export const jiraConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Jira Instance URL',
      field: 'baseUrl',
      type: 'text',
      placeholder: 'https://your-company.atlassian.net',
      required: true,
      description: 'Your Jira instance URL',
      validation: (value) => {
        if (!value) return 'Jira instance URL is required';
        if (typeof value === 'string' && !value.startsWith('https://')) {
          return 'URL must start with https://';
        }
        return null;
      }
    },
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      required: true,
      defaultValue: 'basic',
      options: [
        { value: 'basic', label: 'Email + API Token' },
        { value: 'oauth', label: 'OAuth' },
        { value: 'pat', label: 'Personal Access Token' }
      ]
    },
    {
      label: 'Email',
      field: 'email',
      type: 'email',
      placeholder: 'user@company.com',
      description: 'Your Jira account email',
      validation: (value) => {
        if (value && typeof value === 'string') return validators.email(value);
        return null;
      }
    },
    {
      label: 'API Token',
      field: 'apiToken',
      type: 'password',
      placeholder: 'ATATT3xFfGE0...',
      description: 'Jira API token (create at id.atlassian.com)',
      validation: (value) => {
        return null;
      }
    },
    {
      label: 'Personal Access Token',
      field: 'personalAccessToken',
      type: 'password',
      placeholder: 'Bearer token...',
      description: 'Personal Access Token',
      validation: (value) => {
        return null;
      }
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      defaultValue: 'getIssue',
      options: [
        { value: 'getIssue', label: 'Get Issue' },
        { value: 'searchIssues', label: 'Search Issues' },
        { value: 'createIssue', label: 'Create Issue' },
        { value: 'updateIssue', label: 'Update Issue' },
        { value: 'deleteIssue', label: 'Delete Issue' },
        { value: 'transitionIssue', label: 'Transition Issue' },
        { value: 'addComment', label: 'Add Comment' },
        { value: 'getComments', label: 'Get Comments' },
        { value: 'updateComment', label: 'Update Comment' },
        { value: 'deleteComment', label: 'Delete Comment' },
        { value: 'getProject', label: 'Get Project' },
        { value: 'listProjects', label: 'List Projects' },
        { value: 'createProject', label: 'Create Project' },
        { value: 'getUser', label: 'Get User' },
        { value: 'searchUsers', label: 'Search Users' },
        { value: 'assignIssue', label: 'Assign Issue' },
        { value: 'addWatcher', label: 'Add Watcher' },
        { value: 'removeWatcher', label: 'Remove Watcher' },
        { value: 'createVersion', label: 'Create Version' },
        { value: 'listVersions', label: 'List Versions' },
        { value: 'createComponent', label: 'Create Component' },
        { value: 'listComponents', label: 'List Components' },
        { value: 'getWorkflows', label: 'Get Workflows' },
        { value: 'getStatuses', label: 'Get Issue Statuses' },
        { value: 'createWebhook', label: 'Create Webhook' },
        { value: 'listWebhooks', label: 'List Webhooks' }
      ]
    },
    {
      label: 'Issue Key',
      field: 'issueKey',
      type: 'text',
      placeholder: 'PROJ-123',
      description: 'Jira issue key (e.g., PROJ-123)',
      validation: (value) => {
        if (value && typeof value === 'string' && !/^[A-Z]+-\d+$/.test(value)) {
          return 'Invalid issue key format (should be PROJ-123)';
        }
        return null;
      }
    },
    {
      label: 'Project Key',
      field: 'projectKey',
      type: 'text',
      placeholder: 'PROJ',
      description: 'Project key',
      validation: (value) => {
        return null;
      }
    },
    {
      label: 'Issue Type',
      field: 'issueType',
      type: 'select',
      defaultValue: 'Task',
      options: [
        { value: 'Bug', label: 'Bug' },
        { value: 'Task', label: 'Task' },
        { value: 'Story', label: 'Story' },
        { value: 'Epic', label: 'Epic' },
        { value: 'Subtask', label: 'Sub-task' },
        { value: 'Improvement', label: 'Improvement' },
        { value: 'New Feature', label: 'New Feature' }
      ]
    },
    {
      label: 'Summary',
      field: 'summary',
      type: 'text',
      placeholder: 'Issue summary',
      description: 'Brief issue summary',
      validation: (value) => {
        return null;
      }
    },
    {
      label: 'Description',
      field: 'description',
      type: 'expression',
      placeholder: 'Detailed description with {{$json.details}}',
      description: 'Issue description (supports Jira markup)'
    },
    {
      label: 'Priority',
      field: 'priority',
      type: 'select',
      defaultValue: 'Medium',
      options: [
        { value: 'Highest', label: 'Highest' },
        { value: 'High', label: 'High' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Low', label: 'Low' },
        { value: 'Lowest', label: 'Lowest' }
      ]
    },
    {
      label: 'Assignee',
      field: 'assignee',
      type: 'text',
      placeholder: 'john.doe@company.com',
      description: 'Assignee email or account ID'
    },
    {
      label: 'Reporter',
      field: 'reporter',
      type: 'text',
      placeholder: 'jane.doe@company.com',
      description: 'Reporter email or account ID'
    },
    {
      label: 'Labels',
      field: 'labels',
      type: 'json',
      placeholder: '["bug", "critical", "frontend"]',
      description: 'Array of labels',
      validation: validators.json
    },
    {
      label: 'Components',
      field: 'components',
      type: 'json',
      placeholder: '["API", "Frontend"]',
      description: 'Array of component names',
      validation: validators.json
    },
    {
      label: 'Fix Versions',
      field: 'fixVersions',
      type: 'json',
      placeholder: '["1.0.0", "1.1.0"]',
      description: 'Array of fix version names',
      validation: validators.json
    },
    {
      label: 'Affects Versions',
      field: 'affectsVersions',
      type: 'json',
      placeholder: '["0.9.0"]',
      description: 'Array of affected version names',
      validation: validators.json
    },
    {
      label: 'Due Date',
      field: 'dueDate',
      type: 'text',
      placeholder: '2024-12-31',
      description: 'Due date (YYYY-MM-DD format)'
    },
    {
      label: 'Parent Issue Key',
      field: 'parentKey',
      type: 'text',
      placeholder: 'PROJ-100',
      description: 'Parent issue key (for sub-tasks)'
    },
    {
      label: 'Epic Link',
      field: 'epicLink',
      type: 'text',
      placeholder: 'PROJ-50',
      description: 'Epic issue key to link to'
    },
    {
      label: 'Transition ID',
      field: 'transitionId',
      type: 'text',
      placeholder: '31',
      description: 'Transition ID for issue workflow',
      validation: (value) => {
        return null;
      }
    },
    {
      label: 'Comment Body',
      field: 'commentBody',
      type: 'expression',
      placeholder: 'Comment text with {{$json.data}}',
      description: 'Comment content',
      validation: (value) => {
        return null;
      }
    },
    {
      label: 'Comment ID',
      field: 'commentId',
      type: 'text',
      placeholder: '12345',
      description: 'Comment ID for update/delete'
    },
    {
      label: 'JQL Query',
      field: 'jql',
      type: 'expression',
      placeholder: 'project = "{{$json.project}}" AND status = "Open"',
      description: 'JQL query for searching issues',
      validation: (value) => {
        return null;
      }
    },
    {
      label: 'Fields',
      field: 'fields',
      type: 'text',
      placeholder: 'summary,status,assignee,created',
      description: 'Comma-separated fields to return'
    },
    {
      label: 'Expand',
      field: 'expand',
      type: 'text',
      placeholder: 'changelog,comments,attachments',
      description: 'Comma-separated fields to expand'
    },
    {
      label: 'Max Results',
      field: 'maxResults',
      type: 'number',
      placeholder: '50',
      defaultValue: 50,
      description: 'Maximum results to return'
    },
    {
      label: 'Start At',
      field: 'startAt',
      type: 'number',
      placeholder: '0',
      defaultValue: 0,
      description: 'Starting index for pagination'
    },
    {
      label: 'Custom Fields',
      field: 'customFields',
      type: 'json',
      placeholder: '{"customfield_10001": "value", "customfield_10002": ["option1", "option2"]}',
      description: 'Custom field values',
      validation: validators.json
    },
    {
      label: 'Webhook URL',
      field: 'webhookUrl',
      type: 'text',
      placeholder: 'https://example.com/jira/webhook',
      description: 'Webhook endpoint URL',
      validation: validators.url
    },
    {
      label: 'Webhook Events',
      field: 'webhookEvents',
      type: 'json',
      placeholder: '["jira:issue_created", "jira:issue_updated", "jira:issue_deleted"]',
      description: 'Events to subscribe to',
      validation: validators.json
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Base URL is always required
    if (!config.baseUrl) {
      errors.baseUrl = 'Jira instance URL is required';
    }

    // Auth validation
    if (config.authMethod === 'basic') {
      if (!config.email) errors.email = 'Email is required for basic auth';
      if (!config.apiToken) errors.apiToken = 'API token is required for basic auth';
    } else if (config.authMethod === 'pat') {
      if (!config.personalAccessToken) errors.personalAccessToken = 'Personal Access Token is required';
    }

    // Operation-specific validation
    switch (config.operation) {
      case 'getIssue':
      case 'updateIssue':
      case 'deleteIssue':
      case 'assignIssue':
        if (!config.issueKey) errors.issueKey = 'Issue key is required';
        break;
      
      case 'transitionIssue':
        if (!config.issueKey) errors.issueKey = 'Issue key is required';
        if (!config.transitionId) errors.transitionId = 'Transition ID is required';
        break;
      
      case 'addComment':
        if (!config.issueKey) errors.issueKey = 'Issue key is required';
        if (!config.commentBody) errors.commentBody = 'Comment body is required';
        break;
      
      case 'createIssue':
        if (!config.projectKey) errors.projectKey = 'Project key is required';
        if (!config.summary) errors.summary = 'Summary is required';
        break;
      
      case 'searchIssues':
        if (!config.jql) errors.jql = 'JQL query is required';
        break;
      
      case 'getProject':
      case 'listVersions':
      case 'listComponents':
        if (!config.projectKey) errors.projectKey = 'Project key is required';
        break;
      
      case 'createWebhook':
        if (!config.webhookUrl) errors.webhookUrl = 'Webhook URL is required';
        break;
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON fields
    const jsonFields = ['labels', 'components', 'fixVersions', 'affectsVersions', 'customFields', 'webhookEvents'];

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
    config.apiUrl = `${config.baseUrl}/rest/api/3`;

    // Set authentication headers
    if (config.authMethod === 'basic') {
      const credentials = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
      config.headers = {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
    } else if (config.authMethod === 'pat') {
      config.headers = {
        'Authorization': `Bearer ${config.personalAccessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
    }

    return config;
  },

  examples: [
    {
      label: 'Get Issue Details',
      config: {
        baseUrl: 'https://your-company.atlassian.net',
        authMethod: 'basic',
        email: 'user@company.com',
        apiToken: 'ATATT3xFfGF0...',
        operation: 'getIssue',
        issueKey: '{{$json.issueKey}}',
        expand: 'changelog,comments,attachments'
      }
    },
    {
      label: 'Create Bug Report',
      config: {
        baseUrl: 'https://your-company.atlassian.net',
        authMethod: 'basic',
        email: 'user@company.com',
        apiToken: 'ATATT3xFfGF0...',
        operation: 'createIssue',
        projectKey: 'PROJ',
        issueType: 'Bug',
        summary: 'Bug: {{$json.errorType}} in {{$json.component}}',
        description: 'h2. Problem Description\n{{$json.description}}\n\nh2. Steps to Reproduce\n{{$json.steps}}\n\nh2. Expected Result\n{{$json.expected}}',
        priority: 'High',
        assignee: '{{$json.assigneeEmail}}',
        labels: JSON.stringify(['bug', 'urgent'], null, 2),
        components: JSON.stringify(['{{$json.component}}'], null, 2)
      }
    },
    {
      label: 'Search Open Issues',
      config: {
        baseUrl: 'https://your-company.atlassian.net',
        authMethod: 'basic',
        email: 'user@company.com',
        apiToken: 'ATATT3xFfGF0...',
        operation: 'searchIssues',
        jql: 'project = "{{$json.projectKey}}" AND status in ("To Do", "In Progress") AND assignee = "{{$json.assignee}}"',
        fields: 'summary,status,assignee,priority,created,updated',
        maxResults: 100
      }
    },
    {
      label: 'Transition Issue to Done',
      config: {
        baseUrl: 'https://your-company.atlassian.net',
        authMethod: 'basic',
        email: 'user@company.com',
        apiToken: 'ATATT3xFfGF0...',
        operation: 'transitionIssue',
        issueKey: '{{$json.issueKey}}',
        transitionId: '31',
        commentBody: 'Completed: {{$json.completionNotes}}'
      }
    },
    {
      label: 'Add Progress Comment',
      config: {
        baseUrl: 'https://your-company.atlassian.net',
        authMethod: 'basic',
        email: 'user@company.com',
        apiToken: 'ATATT3xFfGF0...',
        operation: 'addComment',
        issueKey: '{{$json.issueKey}}',
        commentBody: 'Progress Update:\n* {{$json.completed}}\n* Next: {{$json.nextSteps}}\n\nETA: {{$json.eta}}'
      }
    },
    {
      label: 'Create Epic with Story',
      config: {
        baseUrl: 'https://your-company.atlassian.net',
        authMethod: 'basic',
        email: 'user@company.com',
        apiToken: 'ATATT3xFfGF0...',
        operation: 'createIssue',
        projectKey: 'PROJ',
        issueType: 'Story',
        summary: '{{$json.storyTitle}}',
        description: '{{$json.storyDescription}}',
        epicLink: '{{$json.epicKey}}',
        priority: 'Medium',
        assignee: '{{$json.assignee}}',
        fixVersions: JSON.stringify(['{{$json.targetVersion}}'], null, 2)
      }
    }
  ]
};
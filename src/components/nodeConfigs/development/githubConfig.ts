import { NodeConfigDefinition, validators } from '../../../types/nodeConfig';

export const githubConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      required: true,
      defaultValue: 'token',
      options: [
        { value: 'token', label: 'Personal Access Token' },
        { value: 'oauth', label: 'OAuth App' },
        { value: 'github_app', label: 'GitHub App' }
      ]
    },
    {
      label: 'Access Token',
      field: 'accessToken',
      type: 'password',
      placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
      required: true,
      description: 'GitHub personal access token or OAuth token',
      validation: (value, config) => {
        if (!value) return 'Access token is required';
        const token = String(value);
        if (config?.authMethod === 'token' && !token.startsWith('ghp_') && !token.startsWith('gho_')) {
          return 'Invalid GitHub token format';
        }
        return null;
      }
    },
    {
      label: 'Repository Owner',
      field: 'owner',
      type: 'text',
      placeholder: 'octocat',
      required: true,
      description: 'GitHub username or organization name',
      validation: validators.required('Repository Owner')
    },
    {
      label: 'Repository Name',
      field: 'repo',
      type: 'text',
      placeholder: 'Hello-World',
      required: true,
      description: 'Repository name',
      validation: validators.required('Repository Name')
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      defaultValue: 'getRepository',
      options: [
        { value: 'getRepository', label: 'Get Repository Info' },
        { value: 'listRepositories', label: 'List Repositories' },
        { value: 'createRepository', label: 'Create Repository' },
        { value: 'updateRepository', label: 'Update Repository' },
        { value: 'deleteRepository', label: 'Delete Repository' },
        { value: 'getIssue', label: 'Get Issue' },
        { value: 'listIssues', label: 'List Issues' },
        { value: 'createIssue', label: 'Create Issue' },
        { value: 'updateIssue', label: 'Update Issue' },
        { value: 'closeIssue', label: 'Close Issue' },
        { value: 'getPullRequest', label: 'Get Pull Request' },
        { value: 'listPullRequests', label: 'List Pull Requests' },
        { value: 'createPullRequest', label: 'Create Pull Request' },
        { value: 'updatePullRequest', label: 'Update Pull Request' },
        { value: 'mergePullRequest', label: 'Merge Pull Request' },
        { value: 'getCommit', label: 'Get Commit' },
        { value: 'listCommits', label: 'List Commits' },
        { value: 'createCommit', label: 'Create Commit' },
        { value: 'getBranch', label: 'Get Branch' },
        { value: 'listBranches', label: 'List Branches' },
        { value: 'createBranch', label: 'Create Branch' },
        { value: 'deleteBranch', label: 'Delete Branch' },
        { value: 'createRelease', label: 'Create Release' },
        { value: 'listReleases', label: 'List Releases' },
        { value: 'createWebhook', label: 'Create Webhook' },
        { value: 'listWebhooks', label: 'List Webhooks' },
        { value: 'triggerWorkflow', label: 'Trigger GitHub Actions Workflow' }
      ]
    },
    {
      label: 'Issue Number',
      field: 'issueNumber',
      type: 'number',
      placeholder: '123',
      description: 'Issue or PR number',
      validation: (value, config) => {
        const operation = String(config?.operation || '');
        if ((operation.includes('Issue') || operation.includes('PullRequest')) &&
            operation !== 'listIssues' && operation !== 'createIssue' &&
            operation !== 'listPullRequests' && operation !== 'createPullRequest' && !value) {
          return 'Issue/PR number is required';
        }
        return null;
      }
    },
    {
      label: 'Title',
      field: 'title',
      type: 'text',
      placeholder: 'Bug fix: Resolve authentication issue',
      description: 'Title for issues, PRs, or repositories',
      validation: (value, config) => {
        if ((config?.operation === 'createIssue' || config?.operation === 'createPullRequest' ||
             config?.operation === 'createRepository') && !value) {
          return 'Title is required';
        }
        return null;
      }
    },
    {
      label: 'Body/Description',
      field: 'body',
      type: 'expression',
      placeholder: 'Detailed description of the {{$json.type}}',
      description: 'Content body (Markdown supported)'
    },
    {
      label: 'Labels',
      field: 'labels',
      type: 'json',
      placeholder: '["bug", "priority-high", "frontend"]',
      description: 'Array of label names',
      validation: validators.json
    },
    {
      label: 'Assignees',
      field: 'assignees',
      type: 'json',
      placeholder: '["username1", "username2"]',
      description: 'Array of GitHub usernames',
      validation: validators.json
    },
    {
      label: 'Milestone',
      field: 'milestone',
      type: 'number',
      placeholder: '1',
      description: 'Milestone number'
    },
    {
      label: 'State',
      field: 'state',
      type: 'select',
      defaultValue: 'open',
      options: [
        { value: 'open', label: 'Open' },
        { value: 'closed', label: 'Closed' },
        { value: 'all', label: 'All' }
      ]
    },
    {
      label: 'Head Branch',
      field: 'head',
      type: 'text',
      placeholder: 'feature/new-feature',
      description: 'Source branch for PR'
    },
    {
      label: 'Base Branch',
      field: 'base',
      type: 'text',
      placeholder: 'main',
      defaultValue: 'main',
      description: 'Target branch for PR'
    },
    {
      label: 'Branch Name',
      field: 'branchName',
      type: 'text',
      placeholder: 'feature/new-branch',
      description: 'Name for new branch',
      validation: (value, config) => {
        if (config?.operation === 'createBranch' && !value) {
          return 'Branch name is required';
        }
        return null;
      }
    },
    {
      label: 'Source Branch',
      field: 'sourceBranch',
      type: 'text',
      placeholder: 'main',
      defaultValue: 'main',
      description: 'Source branch to create from'
    },
    {
      label: 'Commit SHA',
      field: 'sha',
      type: 'text',
      placeholder: 'a1b2c3d4e5f6...',
      description: 'Git commit SHA'
    },
    {
      label: 'Tag Name',
      field: 'tagName',
      type: 'text',
      placeholder: 'v1.0.0',
      description: 'Release tag name',
      validation: (value, config) => {
        if (config?.operation === 'createRelease' && !value) {
          return 'Tag name is required';
        }
        return null;
      }
    },
    {
      label: 'Release Name',
      field: 'releaseName',
      type: 'text',
      placeholder: 'Version 1.0.0 - Major Release',
      description: 'Release title'
    },
    {
      label: 'Pre-release',
      field: 'prerelease',
      type: 'checkbox',
      defaultValue: false,
      description: 'Mark as pre-release'
    },
    {
      label: 'Draft',
      field: 'draft',
      type: 'checkbox',
      defaultValue: false,
      description: 'Create as draft'
    },
    {
      label: 'Webhook URL',
      field: 'webhookUrl',
      type: 'text',
      placeholder: 'https://example.com/webhook',
      description: 'Webhook endpoint URL',
      validation: validators.url
    },
    {
      label: 'Webhook Events',
      field: 'webhookEvents',
      type: 'json',
      placeholder: '["push", "pull_request", "issues"]',
      description: 'Events to subscribe to',
      validation: validators.json
    },
    {
      label: 'Workflow ID',
      field: 'workflowId',
      type: 'text',
      placeholder: 'ci.yml',
      description: 'GitHub Actions workflow file or ID'
    },
    {
      label: 'Workflow Inputs',
      field: 'workflowInputs',
      type: 'json',
      placeholder: '{"environment": "production", "version": "1.0.0"}',
      description: 'Workflow input parameters',
      validation: validators.json
    },
    {
      label: 'Per Page',
      field: 'perPage',
      type: 'number',
      placeholder: '30',
      defaultValue: 30,
      description: 'Number of results per page (max 100)'
    },
    {
      label: 'Page',
      field: 'page',
      type: 'number',
      placeholder: '1',
      defaultValue: 1,
      description: 'Page number for pagination'
    },
    {
      label: 'Sort',
      field: 'sort',
      type: 'select',
      defaultValue: 'created',
      options: [
        { value: 'created', label: 'Created Date' },
        { value: 'updated', label: 'Updated Date' },
        { value: 'comments', label: 'Comments Count' },
        { value: 'reactions', label: 'Reactions Count' }
      ]
    },
    {
      label: 'Direction',
      field: 'direction',
      type: 'select',
      defaultValue: 'desc',
      options: [
        { value: 'asc', label: 'Ascending' },
        { value: 'desc', label: 'Descending' }
      ]
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Auth validation
    if (!config.accessToken) {
      errors.accessToken = 'Access token is required';
    }

    // Repository validation
    if (!config.owner) errors.owner = 'Repository owner is required';
    if (!config.repo) errors.repo = 'Repository name is required';

    // Operation-specific validation
    switch (config.operation) {
      case 'createIssue':
      case 'createRepository':
        if (!config.title) errors.title = 'Title is required';
        break;
      
      case 'createPullRequest':
        if (!config.title) errors.title = 'Title is required';
        if (!config.head) errors.head = 'Head branch is required';
        if (!config.base) errors.base = 'Base branch is required';
        break;
      
      case 'createBranch':
        if (!config.branchName) errors.branchName = 'Branch name is required';
        break;
      
      case 'createRelease':
        if (!config.tagName) errors.tagName = 'Tag name is required';
        break;
      
      case 'createWebhook':
        if (!config.webhookUrl) errors.webhookUrl = 'Webhook URL is required';
        if (!config.webhookEvents) errors.webhookEvents = 'Webhook events are required';
        break;
      
      case 'triggerWorkflow':
        if (!config.workflowId) errors.workflowId = 'Workflow ID is required';
        break;
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON fields
    const jsonFields = ['labels', 'assignees', 'webhookEvents', 'workflowInputs'];

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
    config.apiUrl = 'https://api.github.com';

    // Set default headers
    config.headers = {
      'Authorization': `Bearer ${config.accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Workflow-Automation-App'
    };

    return config;
  },

  examples: [
    {
      label: 'Get Repository Info',
      config: {
        authMethod: 'token',
        accessToken: 'ghp_YOUR_TOKEN',
        owner: 'octocat',
        repo: 'Hello-World',
        operation: 'getRepository'
      }
    },
    {
      label: 'Create Issue',
      config: {
        authMethod: 'token',
        accessToken: 'ghp_YOUR_TOKEN',
        owner: 'myorg',
        repo: 'myrepo',
        operation: 'createIssue',
        title: 'Bug: {{$json.errorType}} in {{$json.component}}',
        body: '## Problem\n{{$json.description}}\n\n## Steps to Reproduce\n{{$json.steps}}\n\n## Expected Behavior\n{{$json.expected}}',
        labels: JSON.stringify(['bug', 'needs-triage'], null, 2),
        assignees: JSON.stringify(['{{$json.assignee}}'], null, 2)
      }
    },
    {
      label: 'Create Pull Request',
      config: {
        authMethod: 'token',
        accessToken: 'ghp_YOUR_TOKEN',
        owner: 'myorg',
        repo: 'myrepo',
        operation: 'createPullRequest',
        title: 'Feature: {{$json.featureName}}',
        body: '## Changes\n{{$json.changes}}\n\n## Testing\n{{$json.testing}}\n\nCloses #{{$json.issueNumber}}',
        head: '{{$json.branchName}}',
        base: 'main',
        labels: JSON.stringify(['enhancement', 'ready-for-review'], null, 2)
      }
    },
    {
      label: 'Trigger CI Workflow',
      config: {
        authMethod: 'token',
        accessToken: 'ghp_YOUR_TOKEN',
        owner: 'myorg',
        repo: 'myrepo',
        operation: 'triggerWorkflow',
        workflowId: 'deploy.yml',
        workflowInputs: JSON.stringify({
          environment: '{{$json.environment}}',
          version: '{{$json.version}}',
          skip_tests: false
        }, null, 2)
      }
    },
    {
      label: 'Create Release',
      config: {
        authMethod: 'token',
        accessToken: 'ghp_YOUR_TOKEN',
        owner: 'myorg',
        repo: 'myrepo',
        operation: 'createRelease',
        tagName: 'v{{$json.version}}',
        releaseName: 'Release {{$json.version}}',
        body: '## What\'s New\n{{$json.changelog}}\n\n## Bug Fixes\n{{$json.bugfixes}}',
        draft: false,
        prerelease: false
      }
    },
    {
      label: 'Setup Webhook',
      config: {
        authMethod: 'token',
        accessToken: 'ghp_YOUR_TOKEN',
        owner: 'myorg',
        repo: 'myrepo',
        operation: 'createWebhook',
        webhookUrl: 'https://example.com/github/webhook',
        webhookEvents: JSON.stringify([
          'push',
          'pull_request',
          'issues',
          'issue_comment',
          'release'
        ], null, 2)
      }
    }
  ]
};
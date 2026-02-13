import { NodeConfigDefinition, validators } from '../../../types/nodeConfig';

export const gitlabConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'GitLab Instance URL',
      field: 'baseUrl',
      type: 'text',
      placeholder: 'https://gitlab.com',
      defaultValue: 'https://gitlab.com',
      required: true,
      description: 'GitLab instance URL (use https://gitlab.com for GitLab.com)',
      validation: validators.url
    },
    {
      label: 'Access Token',
      field: 'accessToken',
      type: 'password',
      placeholder: 'glpat-xxxxxxxxxxxxxxxxxxxx',
      required: true,
      description: 'GitLab personal access token',
      validation: (value) => {
        if (!value) return 'Access token is required';
        const token = String(value);
        if (!token.startsWith('glpat-') && !token.startsWith('gldt-') && !token.startsWith('gloas-')) {
          return 'Invalid GitLab token format';
        }
        return null;
      }
    },
    {
      label: 'Project ID',
      field: 'projectId',
      type: 'text',
      placeholder: '42',
      required: true,
      description: 'GitLab project ID or namespace/project-name',
      validation: validators.required('Project ID')
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      defaultValue: 'getProject',
      options: [
        { value: 'getProject', label: 'Get Project Info' },
        { value: 'listProjects', label: 'List Projects' },
        { value: 'createProject', label: 'Create Project' },
        { value: 'updateProject', label: 'Update Project' },
        { value: 'deleteProject', label: 'Delete Project' },
        { value: 'getIssue', label: 'Get Issue' },
        { value: 'listIssues', label: 'List Issues' },
        { value: 'createIssue', label: 'Create Issue' },
        { value: 'updateIssue', label: 'Update Issue' },
        { value: 'closeIssue', label: 'Close Issue' },
        { value: 'getMergeRequest', label: 'Get Merge Request' },
        { value: 'listMergeRequests', label: 'List Merge Requests' },
        { value: 'createMergeRequest', label: 'Create Merge Request' },
        { value: 'updateMergeRequest', label: 'Update Merge Request' },
        { value: 'mergeMergeRequest', label: 'Merge Merge Request' },
        { value: 'getCommit', label: 'Get Commit' },
        { value: 'listCommits', label: 'List Commits' },
        { value: 'createCommit', label: 'Create Commit' },
        { value: 'getBranch', label: 'Get Branch' },
        { value: 'listBranches', label: 'List Branches' },
        { value: 'createBranch', label: 'Create Branch' },
        { value: 'deleteBranch', label: 'Delete Branch' },
        { value: 'createTag', label: 'Create Tag' },
        { value: 'listTags', label: 'List Tags' },
        { value: 'createRelease', label: 'Create Release' },
        { value: 'listReleases', label: 'List Releases' },
        { value: 'triggerPipeline', label: 'Trigger Pipeline' },
        { value: 'getPipeline', label: 'Get Pipeline' },
        { value: 'listPipelines', label: 'List Pipelines' },
        { value: 'createWebhook', label: 'Create Webhook' },
        { value: 'listWebhooks', label: 'List Webhooks' },
        { value: 'uploadFile', label: 'Upload File' },
        { value: 'getFile', label: 'Get File Content' }
      ]
    },
    {
      label: 'Issue/MR Number',
      field: 'iid',
      type: 'number',
      placeholder: '123',
      description: 'Issue or Merge Request internal ID',
      validation: (value, config) => {
        const operation = typeof config?.operation === 'string' ? config.operation : '';
        if ((operation.includes('Issue') || operation.includes('MergeRequest')) &&
            !operation.includes('list') && !operation.includes('create') && !value) {
          return 'Issue/MR number is required';
        }
        return null;
      }
    },
    {
      label: 'Title',
      field: 'title',
      type: 'text',
      placeholder: 'Fix critical authentication bug',
      description: 'Title for issues, MRs, or projects',
      validation: (value, config) => {
        const operation = typeof config?.operation === 'string' ? config.operation : '';
        if ((operation === 'createIssue' || operation === 'createMergeRequest' ||
             operation === 'createProject') && !value) {
          return 'Title is required';
        }
        return null;
      }
    },
    {
      label: 'Description',
      field: 'description',
      type: 'expression',
      placeholder: 'Detailed description with {{$json.details}}',
      description: 'Content description (Markdown supported)'
    },
    {
      label: 'Labels',
      field: 'labels',
      type: 'text',
      placeholder: 'bug,critical,backend',
      description: 'Comma-separated label names'
    },
    {
      label: 'Assignee IDs',
      field: 'assigneeIds',
      type: 'json',
      placeholder: '[123, 456]',
      description: 'Array of user IDs to assign',
      validation: validators.json
    },
    {
      label: 'Milestone ID',
      field: 'milestoneId',
      type: 'number',
      placeholder: '1',
      description: 'Milestone ID'
    },
    {
      label: 'State',
      field: 'state',
      type: 'select',
      defaultValue: 'opened',
      options: [
        { value: 'opened', label: 'Open' },
        { value: 'closed', label: 'Closed' },
        { value: 'merged', label: 'Merged (MR only)' },
        { value: 'all', label: 'All' }
      ]
    },
    {
      label: 'Source Branch',
      field: 'sourceBranch',
      type: 'text',
      placeholder: 'feature/new-feature',
      description: 'Source branch for MR'
    },
    {
      label: 'Target Branch',
      field: 'targetBranch',
      type: 'text',
      placeholder: 'main',
      defaultValue: 'main',
      description: 'Target branch for MR'
    },
    {
      label: 'Branch Name',
      field: 'branchName',
      type: 'text',
      placeholder: 'feature/new-branch',
      description: 'Name for new branch',
      validation: (value, config) => {
        const operation = typeof config?.operation === 'string' ? config.operation : '';
        if (operation === 'createBranch' && !value) {
          return 'Branch name is required';
        }
        return null;
      }
    },
    {
      label: 'Reference',
      field: 'ref',
      type: 'text',
      placeholder: 'main',
      defaultValue: 'main',
      description: 'Branch or commit SHA to create from'
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
      description: 'Tag name',
      validation: (value, config) => {
        const operation = typeof config?.operation === 'string' ? config.operation : '';
        if ((operation === 'createTag' || operation === 'createRelease') && !value) {
          return 'Tag name is required';
        }
        return null;
      }
    },
    {
      label: 'Release Description',
      field: 'releaseDescription',
      type: 'expression',
      placeholder: 'Release notes for version {{ json.version }}',
      description: 'Release notes (Markdown supported)'
    },
    {
      label: 'Pipeline Reference',
      field: 'pipelineRef',
      type: 'text',
      placeholder: 'main',
      defaultValue: 'main',
      description: 'Branch or tag to run pipeline on'
    },
    {
      label: 'Pipeline Variables',
      field: 'pipelineVariables',
      type: 'json',
      placeholder: '{"ENVIRONMENT": "production", "VERSION": "1.0.0"}',
      description: 'Pipeline variables',
      validation: validators.json
    },
    {
      label: 'Webhook URL',
      field: 'webhookUrl',
      type: 'text',
      placeholder: 'https://example.com/gitlab/webhook',
      description: 'Webhook endpoint URL',
      validation: validators.url
    },
    {
      label: 'Webhook Token',
      field: 'webhookToken',
      type: 'password',
      placeholder: 'secret-token',
      description: 'Secret token for webhook verification'
    },
    {
      label: 'Webhook Events',
      field: 'webhookEvents',
      type: 'json',
      placeholder: '["push_events", "merge_requests_events", "issues_events"]',
      description: 'Events to trigger webhook',
      validation: validators.json
    },
    {
      label: 'File Path',
      field: 'filePath',
      type: 'text',
      placeholder: 'src/config.json',
      description: 'File path in repository'
    },
    {
      label: 'File Content',
      field: 'fileContent',
      type: 'expression',
      placeholder: '{{$json.fileData}}',
      description: 'File content to upload'
    },
    {
      label: 'Commit Message',
      field: 'commitMessage',
      type: 'text',
      placeholder: 'Update configuration file',
      description: 'Commit message for file operations'
    },
    {
      label: 'Project Name',
      field: 'projectName',
      type: 'text',
      placeholder: 'my-awesome-project',
      description: 'Name for new project'
    },
    {
      label: 'Project Path',
      field: 'projectPath',
      type: 'text',
      placeholder: 'my-awesome-project',
      description: 'URL path for project'
    },
    {
      label: 'Namespace ID',
      field: 'namespaceId',
      type: 'number',
      placeholder: '123',
      description: 'Namespace (group) ID for project'
    },
    {
      label: 'Visibility',
      field: 'visibility',
      type: 'select',
      defaultValue: 'private',
      options: [
        { value: 'private', label: 'Private' },
        { value: 'internal', label: 'Internal' },
        { value: 'public', label: 'Public' }
      ]
    },
    {
      label: 'Per Page',
      field: 'perPage',
      type: 'number',
      placeholder: '20',
      defaultValue: 20,
      description: 'Results per page (max 100)'
    },
    {
      label: 'Page',
      field: 'page',
      type: 'number',
      placeholder: '1',
      defaultValue: 1,
      description: 'Page number'
    },
    {
      label: 'Sort',
      field: 'sort',
      type: 'select',
      defaultValue: 'created_at',
      options: [
        { value: 'created_at', label: 'Created Date' },
        { value: 'updated_at', label: 'Updated Date' },
        { value: 'title', label: 'Title' },
        { value: 'due_date', label: 'Due Date' }
      ]
    },
    {
      label: 'Order',
      field: 'order',
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
    if (!config.baseUrl) {
      errors.baseUrl = 'GitLab instance URL is required';
    }
    if (!config.projectId) {
      errors.projectId = 'Project ID is required';
    }

    // Operation-specific validation
    switch (config.operation) {
      case 'createIssue':
        if (!config.title) errors.title = 'Title is required';
        break;
      
      case 'createMergeRequest':
        if (!config.title) errors.title = 'Title is required';
        if (!config.sourceBranch) errors.sourceBranch = 'Source branch is required';
        if (!config.targetBranch) errors.targetBranch = 'Target branch is required';
        break;
      
      case 'createBranch':
        if (!config.branchName) errors.branchName = 'Branch name is required';
        break;
      
      case 'createTag':
      case 'createRelease':
        if (!config.tagName) errors.tagName = 'Tag name is required';
        break;
      
      case 'createProject':
        if (!config.title) errors.title = 'Title is required';
        if (!config.projectName) errors.projectName = 'Project name is required';
        if (!config.projectPath) errors.projectPath = 'Project path is required';
        break;
      
      case 'createWebhook':
        if (!config.webhookUrl) errors.webhookUrl = 'Webhook URL is required';
        break;
      
      case 'uploadFile':
        if (!config.filePath) errors.filePath = 'File path is required';
        if (!config.fileContent) errors.fileContent = 'File content is required';
        if (!config.commitMessage) errors.commitMessage = 'Commit message is required';
        break;
      
      case 'getFile':
        if (!config.filePath) errors.filePath = 'File path is required';
        break;
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON fields
    const jsonFields = ['assigneeIds', 'pipelineVariables', 'webhookEvents'];

    jsonFields.forEach(field => {
      if (config[field] && typeof config[field] === 'string') {
        try {
          config[field] = JSON.parse(config[field]);
        } catch (e) {
          // Keep as string
        }
      }
    });

    // Handle labels (convert comma-separated to array)
    if (config.labels && typeof config.labels === 'string') {
      config.labels = config.labels.split(',').map(label => label.trim());
    }

    // Build API URL
    config.apiUrl = `${config.baseUrl}/api/v4`;

    // Set default headers
    config.headers = {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json'
    };

    return config;
  },

  examples: [
    {
      label: 'Get Project Info',
      config: {
        baseUrl: 'https://gitlab.com',
        accessToken: 'glpat_YOUR_TOKEN',
        projectId: '123456',
        operation: 'getProject'
      }
    },
    {
      label: 'Create Issue',
      config: {
        baseUrl: 'https://gitlab.com',
        accessToken: 'glpat_YOUR_TOKEN',
        projectId: 'mygroup/myproject',
        operation: 'createIssue',
        title: 'Bug: {{$json.errorType}} in {{$json.component}}',
        description: '## Problem Description\n{{$json.description}}\n\n## Steps to Reproduce\n{{$json.steps}}\n\n## Expected Result\n{{$json.expected}}',
        labels: 'bug,critical,backend',
        assigneeIds: JSON.stringify([123], null, 2)
      }
    },
    {
      label: 'Create Merge Request',
      config: {
        baseUrl: 'https://gitlab.com',
        accessToken: 'glpat_YOUR_TOKEN',
        projectId: '123456',
        operation: 'createMergeRequest',
        title: 'Feature: {{$json.featureName}}',
        description: '## Changes Made\n{{$json.changes}}\n\n## Testing Done\n{{$json.testing}}\n\nCloses #{{$json.issueNumber}}',
        sourceBranch: '{{$json.branchName}}',
        targetBranch: 'main'
      }
    },
    {
      label: 'Trigger Pipeline',
      config: {
        baseUrl: 'https://gitlab.com',
        accessToken: 'glpat_YOUR_TOKEN',
        projectId: '123456',
        operation: 'triggerPipeline',
        pipelineRef: 'main',
        pipelineVariables: JSON.stringify({
          ENVIRONMENT: '{{$json.environment}}',
          VERSION: '{{$json.version}}',
          DEPLOY_MODE: 'automated'
        }, null, 2)
      }
    },
    {
      label: 'Create Release',
      config: {
        baseUrl: 'https://gitlab.com',
        accessToken: 'glpat_YOUR_TOKEN',
        projectId: '123456',
        operation: 'createRelease',
        tagName: 'v{{$json.version}}',
        title: 'Release {{$json.version}}',
        releaseDescription: '## What\'s New in {{$json.version}}\n{{$json.changelog}}\n\n## Bug Fixes\n{{$json.bugfixes}}'
      }
    },
    {
      label: 'Upload Configuration File',
      config: {
        baseUrl: 'https://gitlab.com',
        accessToken: 'glpat_YOUR_TOKEN',
        projectId: '123456',
        operation: 'uploadFile',
        filePath: 'config/{{$json.environment}}.json',
        fileContent: '{{$json.configData}}',
        commitMessage: 'Updated {{$json.environment}} configuration',
        ref: 'main'
      }
    }
  ]
};
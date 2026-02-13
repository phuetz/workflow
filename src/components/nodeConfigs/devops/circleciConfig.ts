import { NodeConfigDefinition } from '../../../types/nodeConfig';

export const circleciConfig: NodeConfigDefinition = {
  fields: [
    // Authentication
    {
      label: 'CircleCI API Token',
      field: 'apiToken',
      type: 'password',
      required: true,
      tooltip: 'Personal API token from CircleCI settings'
    },
    {
      label: 'API Version',
      field: 'apiVersion',
      type: 'select',
      options: [
        { value: 'v2', label: 'API v2 (Recommended)' },
        { value: 'v1.1', label: 'API v1.1 (Legacy)' }
      ],
      defaultValue: 'v2',
      required: true
    },
    {
      label: 'CircleCI Server URL',
      field: 'serverUrl',
      type: 'text',
      placeholder: 'https://circleci.com',
      defaultValue: 'https://circleci.com',
      required: false,
      tooltip: 'Only change for self-hosted CircleCI'
    },

    // Operation
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // Pipeline Operations
        { value: 'pipeline_trigger', label: 'Trigger Pipeline' },
        { value: 'pipeline_get', label: 'Get Pipeline' },
        { value: 'pipeline_list', label: 'List Pipelines' },
        { value: 'pipeline_workflows', label: 'Get Pipeline Workflows' },
        { value: 'pipeline_config', label: 'Get Pipeline Config' },
        
        // Workflow Operations
        { value: 'workflow_get', label: 'Get Workflow' },
        { value: 'workflow_cancel', label: 'Cancel Workflow' },
        { value: 'workflow_rerun', label: 'Rerun Workflow' },
        { value: 'workflow_jobs', label: 'Get Workflow Jobs' },
        
        // Job Operations
        { value: 'job_get', label: 'Get Job Details' },
        { value: 'job_cancel', label: 'Cancel Job' },
        { value: 'job_artifacts', label: 'Get Job Artifacts' },
        { value: 'job_tests', label: 'Get Job Test Results' },
        { value: 'job_steps', label: 'Get Job Steps' },
        
        // Project Operations
        { value: 'project_get', label: 'Get Project' },
        { value: 'project_envvars', label: 'List Environment Variables' },
        { value: 'project_envvar_create', label: 'Create Environment Variable' },
        { value: 'project_envvar_delete', label: 'Delete Environment Variable' },
        { value: 'project_checkout_keys', label: 'List Checkout Keys' },
        { value: 'project_checkout_key_create', label: 'Create Checkout Key' },
        { value: 'project_checkout_key_delete', label: 'Delete Checkout Key' },
        { value: 'project_settings', label: 'Get Project Settings' },
        { value: 'project_follow', label: 'Follow Project' },
        { value: 'project_unfollow', label: 'Unfollow Project' },
        
        // Insights Operations
        { value: 'insights_workflows', label: 'Get Workflow Insights' },
        { value: 'insights_workflow_jobs', label: 'Get Workflow Job Metrics' },
        { value: 'insights_workflow_summary', label: 'Get Workflow Summary' },
        { value: 'insights_project_summary', label: 'Get Project Summary' },
        { value: 'insights_flaky_tests', label: 'Get Flaky Tests' },
        
        // Context Operations
        { value: 'context_list', label: 'List Contexts' },
        { value: 'context_get', label: 'Get Context' },
        { value: 'context_create', label: 'Create Context' },
        { value: 'context_delete', label: 'Delete Context' },
        { value: 'context_envvars', label: 'List Context Variables' },
        { value: 'context_envvar_create', label: 'Create Context Variable' },
        { value: 'context_envvar_delete', label: 'Delete Context Variable' },
        
        // Organization Operations
        { value: 'org_projects', label: 'List Organization Projects' },
        { value: 'org_users', label: 'List Organization Users' },
        
        // User Operations
        { value: 'user_me', label: 'Get Current User' },
        { value: 'user_collaborations', label: 'Get User Collaborations' }
      ],
      required: true,
      tooltip: 'CircleCI operation to perform'
    },

    // Common Fields
    {
      label: 'Project Slug',
      field: 'projectSlug',
      type: 'text',
      placeholder: 'gh/organization/repository',
      required: (config: Record<string, unknown>) => {
        const projectOps = [
          'pipeline_trigger', 'pipeline_list', 'pipeline_config',
          'project_get', 'project_envvars', 'project_envvar_create',
          'project_envvar_delete', 'project_checkout_keys',
          'project_checkout_key_create', 'project_checkout_key_delete',
          'project_settings', 'project_follow', 'project_unfollow',
          'insights_workflows', 'insights_project_summary',
          'insights_flaky_tests'
        ];
        return projectOps.includes(config.operation as string);
      },
      tooltip: 'Format: vcs-type/org-name/repo-name (e.g., gh/myorg/myrepo)'
    },
    {
      label: 'VCS Type',
      field: 'vcsType',
      type: 'select',
      options: [
        { value: 'github', label: 'GitHub' },
        { value: 'bitbucket', label: 'Bitbucket' }
      ],
      defaultValue: 'github',
      showWhen: (config: Record<string, unknown>) => {
        return config.apiVersion === 'v1.1';
      }
    },
    {
      label: 'Organization',
      field: 'organization',
      type: 'text',
      placeholder: 'my-organization',
      required: (config: Record<string, unknown>) => {
        const orgOps = [
          'org_projects', 'org_users', 'context_list', 'context_create'
        ];
        return orgOps.includes(config.operation as string) || config.apiVersion === 'v1.1';
      }
    },
    {
      label: 'Repository',
      field: 'repository',
      type: 'text',
      placeholder: 'my-repository',
      required: (config: Record<string, unknown>) => {
        return config.apiVersion === 'v1.1' && !!config.projectSlug;
      }
    },

    // Pipeline Operations Fields
    {
      label: 'Pipeline ID',
      field: 'pipelineId',
      type: 'text',
      placeholder: '5034460f-c7c4-4c43-9457-de07e2029e7b',
      required: (config: Record<string, unknown>) => {
        const pipelineOps = [
          'pipeline_get', 'pipeline_workflows', 'pipeline_config'
        ];
        return pipelineOps.includes(config.operation as string);
      }
    },
    {
      label: 'Branch',
      field: 'branch',
      type: 'text',
      placeholder: 'main',
      required: false,
      showWhen: (config: Record<string, unknown>) => {
        return ['pipeline_trigger', 'pipeline_list'].includes(config.operation as string);
      }
    },
    {
      label: 'Tag',
      field: 'tag',
      type: 'text',
      placeholder: 'v1.0.0',
      required: false,
      showWhen: (config: Record<string, unknown>) => {
        return config.operation === 'pipeline_trigger';
      },
      tooltip: 'Trigger pipeline for specific tag'
    },
    {
      label: 'Pipeline Parameters',
      field: 'parameters',
      type: 'json',
      placeholder: '{\n  "deploy_env": "production",\n  "run_tests": true,\n  "version": "2.0.0"\n}',
      required: false,
      showWhen: (config: Record<string, unknown>) => {
        return config.operation === 'pipeline_trigger';
      }
    },

    // Workflow Operations Fields
    {
      label: 'Workflow ID',
      field: 'workflowId',
      type: 'text',
      placeholder: 'e411e5e9-c264-4c43-8bd9-7f5d06898d72',
      required: (config: Record<string, unknown>) => {
        const workflowOps = [
          'workflow_get', 'workflow_cancel', 'workflow_rerun', 'workflow_jobs'
        ];
        return workflowOps.includes(config.operation as string);
      }
    },
    {
      label: 'Enable SSH',
      field: 'enableSsh',
      type: 'boolean',
      defaultValue: false,
      showWhen: (config: Record<string, unknown>) => {
        return config.operation === 'workflow_rerun';
      }
    },
    {
      label: 'From Failed',
      field: 'fromFailed',
      type: 'boolean',
      defaultValue: false,
      showWhen: (config: Record<string, unknown>) => {
        return config.operation === 'workflow_rerun';
      },
      tooltip: 'Rerun from failed jobs only'
    },
    {
      label: 'Sparse Tree',
      field: 'sparseTree',
      type: 'boolean',
      defaultValue: false,
      showWhen: (config: Record<string, unknown>) => {
        return config.operation === 'workflow_rerun';
      },
      tooltip: 'Rerun only failed job and its dependencies'
    },
    {
      label: 'Jobs to Rerun',
      field: 'jobs',
      type: 'json',
      placeholder: '["job-id-1", "job-id-2"]',
      required: false,
      showWhen: (config: Record<string, unknown>) => {
        return config.operation === 'workflow_rerun';
      }
    },

    // Job Operations Fields
    {
      label: 'Job Number',
      field: 'jobNumber',
      type: 'text',
      placeholder: '12345',
      required: (config: Record<string, unknown>) => {
        const jobOps = [
          'job_get', 'job_cancel', 'job_artifacts', 'job_tests', 'job_steps'
        ];
        return jobOps.includes(config.operation as string);
      }
    },
    {
      label: 'Step Number',
      field: 'stepNumber',
      type: 'number',
      placeholder: '3',
      required: false,
      showWhen: (config: Record<string, unknown>) => {
        return config.operation === 'job_steps';
      }
    },

    // Environment Variable Fields
    {
      label: 'Variable Name',
      field: 'varName',
      type: 'text',
      placeholder: 'API_KEY',
      required: (config: Record<string, unknown>) => {
        const varOps = [
          'project_envvar_create', 'project_envvar_delete',
          'context_envvar_create', 'context_envvar_delete'
        ];
        return varOps.includes(config.operation as string);
      },
      validation: (value: unknown) => {
        if (value && typeof value === 'string' && !/^[A-Z_][A-Z0-9_]*$/.test(value)) {
          return 'Variable name must be uppercase letters, numbers, and underscores only';
        }
        return null;
      }
    },
    {
      label: 'Variable Value',
      field: 'varValue',
      type: 'password',
      required: (config: Record<string, unknown>) => {
        return ['project_envvar_create', 'context_envvar_create'].includes(config.operation as string);
      }
    },

    // Context Operations Fields
    {
      label: 'Context ID',
      field: 'contextId',
      type: 'text',
      placeholder: '5034460f-c7c4-4c43-9457-de07e2029e7b',
      required: (config: Record<string, unknown>) => {
        const contextOps = [
          'context_get', 'context_delete', 'context_envvars',
          'context_envvar_create', 'context_envvar_delete'
        ];
        return contextOps.includes(config.operation as string);
      }
    },
    {
      label: 'Context Name',
      field: 'contextName',
      type: 'text',
      placeholder: 'production-secrets',
      required: (config: Record<string, unknown>) => {
        return config.operation === 'context_create';
      }
    },

    // Checkout Key Fields
    {
      label: 'Key Type',
      field: 'keyType',
      type: 'select',
      options: [
        { value: 'deploy-key', label: 'Deploy Key (Read/Write)' },
        { value: 'github-user-key', label: 'GitHub User Key' }
      ],
      defaultValue: 'deploy-key',
      showWhen: (config: Record<string, unknown>) => {
        return config.operation === 'project_checkout_key_create';
      }
    },
    {
      label: 'Fingerprint',
      field: 'fingerprint',
      type: 'text',
      placeholder: 'ab:cd:ef:12:34:56:78:90',
      required: (config: Record<string, unknown>) => {
        return config.operation === 'project_checkout_key_delete';
      }
    },

    // Insights Fields
    {
      label: 'Workflow Name',
      field: 'workflowName',
      type: 'text',
      placeholder: 'build-and-test',
      required: (config: Record<string, unknown>) => {
        const insightsOps = [
          'insights_workflows', 'insights_workflow_jobs',
          'insights_workflow_summary'
        ];
        return insightsOps.includes(config.operation as string);
      }
    },
    {
      label: 'Reporting Window',
      field: 'reportingWindow',
      type: 'select',
      options: [
        { value: 'last-7-days', label: 'Last 7 Days' },
        { value: 'last-30-days', label: 'Last 30 Days' },
        { value: 'last-60-days', label: 'Last 60 Days' },
        { value: 'last-90-days', label: 'Last 90 Days' }
      ],
      defaultValue: 'last-30-days',
      showWhen: (config: Record<string, unknown>) => {
        const insightsOps = [
          'insights_workflows', 'insights_workflow_jobs',
          'insights_workflow_summary', 'insights_project_summary',
          'insights_flaky_tests'
        ];
        return insightsOps.includes(config.operation as string);
      }
    },
    {
      label: 'All Branches',
      field: 'allBranches',
      type: 'boolean',
      defaultValue: false,
      showWhen: (config: Record<string, unknown>) => {
        const insightsOps = [
          'insights_workflows', 'insights_workflow_jobs',
          'insights_workflow_summary'
        ];
        return insightsOps.includes(config.operation as string);
      }
    },
    {
      label: 'Granularity',
      field: 'granularity',
      type: 'select',
      options: [
        { value: 'daily', label: 'Daily' },
        { value: 'hourly', label: 'Hourly' }
      ],
      defaultValue: 'daily',
      showWhen: (config: Record<string, unknown>) => {
        return ['insights_workflows', 'insights_workflow_jobs'].includes(config.operation as string);
      }
    },

    // Filtering and Pagination
    {
      label: 'Page Token',
      field: 'pageToken',
      type: 'text',
      placeholder: 'next-page-token',
      required: false,
      showWhen: (config: Record<string, unknown>) => {
        const pageOps = [
          'pipeline_list', 'workflow_jobs', 'job_artifacts',
          'project_envvars', 'context_list', 'context_envvars',
          'org_projects'
        ];
        return pageOps.includes(config.operation as string);
      }
    },
    {
      label: 'Items Per Page',
      field: 'itemsPerPage',
      type: 'number',
      placeholder: '20',
      defaultValue: 20,
      showWhen: (config: Record<string, unknown>) => {
        const pageOps = [
          'pipeline_list', 'workflow_jobs', 'job_artifacts',
          'project_envvars', 'context_list', 'context_envvars',
          'org_projects'
        ];
        return pageOps.includes(config.operation as string);
      }
    },
    {
      label: 'Status Filter',
      field: 'status',
      type: 'select',
      options: [
        { value: 'all', label: 'All' },
        { value: 'completed', label: 'Completed' },
        { value: 'running', label: 'Running' },
        { value: 'failing', label: 'Failing' },
        { value: 'failed', label: 'Failed' },
        { value: 'success', label: 'Success' },
        { value: 'canceled', label: 'Canceled' },
        { value: 'unauthorized', label: 'Unauthorized' }
      ],
      defaultValue: 'all',
      showWhen: (config: Record<string, unknown>) => {
        return ['pipeline_list', 'workflow_jobs'].includes(config.operation as string);
      }
    },

    // Build Number (for v1.1 API)
    {
      label: 'Build Number',
      field: 'buildNum',
      type: 'number',
      placeholder: '123',
      required: false,
      showWhen: (config: Record<string, unknown>) => {
        return config.apiVersion === 'v1.1';
      },
      tooltip: 'For v1.1 API operations'
    },

    // Output Options
    {
      label: 'Include Stopped Jobs',
      field: 'includeStoppedJobs',
      type: 'boolean',
      defaultValue: false,
      showWhen: (config: Record<string, unknown>) => {
        return config.operation === 'workflow_jobs';
      }
    },
    {
      label: 'Expand',
      field: 'expand',
      type: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'workflow', label: 'Workflow' },
        { value: 'workflow.job', label: 'Workflow & Jobs' }
      ],
      defaultValue: 'none',
      showWhen: (config: Record<string, unknown>) => {
        return config.operation === 'pipeline_get';
      }
    }
  ],

  examples: [
    {
      name: 'Trigger Deployment Pipeline',
      description: 'Trigger a pipeline with deployment parameters',
      config: {
        apiToken: '${CIRCLECI_TOKEN}',
        apiVersion: 'v2',
        operation: 'pipeline_trigger',
        projectSlug: 'gh/my-company/backend-api',
        branch: 'main',
        parameters: {
          'deploy_environment': 'production',
          'run_integration_tests': true,
          'notify_slack': true,
          'version_tag': 'v2.1.0'
        }
      }
    },
    {
      name: 'Monitor Workflow Status',
      description: 'Get detailed workflow information with jobs',
      config: {
        apiToken: '${CIRCLECI_TOKEN}',
        apiVersion: 'v2',
        operation: 'workflow_get',
        workflowId: 'e411e5e9-c264-4c43-8bd9-7f5d06898d72',
        includeStoppedJobs: true
      }
    },
    {
      name: 'Rerun Failed Jobs',
      description: 'Rerun workflow from failed jobs with SSH enabled',
      config: {
        apiToken: '${CIRCLECI_TOKEN}',
        apiVersion: 'v2',
        operation: 'workflow_rerun',
        workflowId: 'e411e5e9-c264-4c43-8bd9-7f5d06898d72',
        fromFailed: true,
        enableSsh: true,
        sparseTree: true
      }
    },
    {
      name: 'Set Production Secrets',
      description: 'Create context variables for production environment',
      config: {
        apiToken: '${CIRCLECI_TOKEN}',
        apiVersion: 'v2',
        operation: 'context_envvar_create',
        contextId: '5034460f-c7c4-4c43-9457-de07e2029e7b',
        varName: 'DATABASE_URL',
        varValue: '${PROD_DATABASE_URL}'
      }
    },
    {
      name: 'Analyze Workflow Performance',
      description: 'Get workflow insights for optimization',
      config: {
        apiToken: '${CIRCLECI_TOKEN}',
        apiVersion: 'v2',
        operation: 'insights_workflow_summary',
        projectSlug: 'gh/my-company/frontend-app',
        workflowName: 'build-test-deploy',
        reportingWindow: 'last-30-days',
        allBranches: false
      }
    },
    {
      name: 'Download Build Artifacts',
      description: 'Get all artifacts from a specific job',
      config: {
        apiToken: '${CIRCLECI_TOKEN}',
        apiVersion: 'v2',
        operation: 'job_artifacts',
        projectSlug: 'gh/my-company/mobile-app',
        jobNumber: '12345',
        itemsPerPage: 50
      }
    }
  ]
};
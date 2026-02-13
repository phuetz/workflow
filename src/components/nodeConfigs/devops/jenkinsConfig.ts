import { NodeConfigDefinition } from '../../../types/nodeConfig';

export const jenkinsConfig: NodeConfigDefinition = {
  fields: [
    // Authentication
    {
      label: 'Jenkins URL',
      field: 'jenkinsUrl',
      type: 'text',
      placeholder: 'https://jenkins.company.com',
      required: true,
      tooltip: 'Your Jenkins server URL'
    },
    {
      label: 'Authentication Type',
      field: 'authType',
      type: 'select',
      options: [
        { value: 'userpass', label: 'Username & Password' },
        { value: 'apitoken', label: 'Username & API Token' },
        { value: 'oauth', label: 'OAuth Token' },
        { value: 'crumb', label: 'Crumb Authentication' }
      ],
      required: true,
      defaultValue: 'apitoken',
      tooltip: 'Jenkins authentication method'
    },
    {
      label: 'Username',
      field: 'username',
      type: 'text',
      placeholder: 'jenkins-user',
      required: function() {
        return ['userpass', 'apitoken'].includes(this.authType);
      }
    },
    {
      label: 'Password',
      field: 'password',
      type: 'password',
      required: function() {
        return this.authType === 'userpass';
      }
    },
    {
      label: 'API Token',
      field: 'apiToken',
      type: 'password',
      required: function() {
        return this.authType === 'apitoken';
      },
      tooltip: 'Generate from Jenkins user profile'
    },
    {
      label: 'OAuth Token',
      field: 'oauthToken',
      type: 'password',
      required: function() {
        return this.authType === 'oauth';
      }
    },
    {
      label: 'Enable Crumb',
      field: 'enableCrumb',
      type: 'boolean',
      defaultValue: true,
      tooltip: 'Use CSRF protection (recommended)'
    },

    // Operation
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // Job Operations
        { value: 'job_build', label: 'Build Job' },
        { value: 'job_build_parameters', label: 'Build Job with Parameters' },
        { value: 'job_create', label: 'Create Job' },
        { value: 'job_copy', label: 'Copy Job' },
        { value: 'job_delete', label: 'Delete Job' },
        { value: 'job_enable', label: 'Enable Job' },
        { value: 'job_disable', label: 'Disable Job' },
        { value: 'job_get_config', label: 'Get Job Configuration' },
        { value: 'job_update_config', label: 'Update Job Configuration' },
        { value: 'job_get_info', label: 'Get Job Info' },
        { value: 'job_list', label: 'List Jobs' },
        { value: 'job_exists', label: 'Check Job Exists' },
        { value: 'job_get_builds', label: 'Get Job Builds' },
        
        // Build Operations
        { value: 'build_get_info', label: 'Get Build Info' },
        { value: 'build_get_log', label: 'Get Build Log' },
        { value: 'build_stop', label: 'Stop Build' },
        { value: 'build_get_artifact', label: 'Get Build Artifact' },
        { value: 'build_get_test_results', label: 'Get Build Test Results' },
        { value: 'build_get_console', label: 'Get Build Console Output' },
        { value: 'build_wait_complete', label: 'Wait for Build Completion' },
        
        // Pipeline Operations
        { value: 'pipeline_run', label: 'Run Pipeline' },
        { value: 'pipeline_replay', label: 'Replay Pipeline' },
        { value: 'pipeline_get_log', label: 'Get Pipeline Log' },
        { value: 'pipeline_abort', label: 'Abort Pipeline' },
        { value: 'pipeline_get_status', label: 'Get Pipeline Status' },
        
        // Queue Operations
        { value: 'queue_get_info', label: 'Get Queue Info' },
        { value: 'queue_cancel', label: 'Cancel Queue Item' },
        { value: 'queue_list', label: 'List Queue Items' },
        
        // View Operations
        { value: 'view_create', label: 'Create View' },
        { value: 'view_delete', label: 'Delete View' },
        { value: 'view_get_jobs', label: 'Get View Jobs' },
        { value: 'view_add_job', label: 'Add Job to View' },
        { value: 'view_remove_job', label: 'Remove Job from View' },
        { value: 'view_list', label: 'List Views' },
        
        // Node Operations
        { value: 'node_get_info', label: 'Get Node Info' },
        { value: 'node_enable', label: 'Enable Node' },
        { value: 'node_disable', label: 'Disable Node' },
        { value: 'node_list', label: 'List Nodes' },
        { value: 'node_get_config', label: 'Get Node Configuration' },
        
        // Folder Operations
        { value: 'folder_create', label: 'Create Folder' },
        { value: 'folder_delete', label: 'Delete Folder' },
        { value: 'folder_get_jobs', label: 'Get Folder Jobs' },
        
        // System Operations
        { value: 'system_info', label: 'Get System Info' },
        { value: 'system_restart', label: 'Restart Jenkins' },
        { value: 'system_safeRestart', label: 'Safe Restart Jenkins' },
        { value: 'system_quietDown', label: 'Enter Quiet Down Mode' },
        { value: 'system_cancelQuietDown', label: 'Cancel Quiet Down Mode' },
        
        // Plugin Operations
        { value: 'plugin_list', label: 'List Plugins' },
        { value: 'plugin_info', label: 'Get Plugin Info' }
      ],
      required: true,
      tooltip: 'Jenkins operation to perform'
    },

    // Job Operations Fields
    {
      label: 'Job Name',
      field: 'jobName',
      type: 'text',
      placeholder: 'my-build-job',
      required: function() {
        const jobOps = [
          'job_build', 'job_build_parameters', 'job_delete', 'job_enable',
          'job_disable', 'job_get_config', 'job_update_config', 'job_get_info',
          'job_exists', 'job_get_builds', 'view_add_job', 'view_remove_job'
        ];
        return jobOps.includes(this.operation);
      },
      tooltip: 'Jenkins job name (folder/job for nested)'
    },
    {
      label: 'Job Parameters',
      field: 'jobParameters',
      type: 'json',
      placeholder: '{\n  "BRANCH": "main",\n  "ENVIRONMENT": "production",\n  "DEPLOY": true\n}',
      required: function() {
        return this.operation === 'job_build_parameters';
      },
      tooltip: 'Build parameters as JSON object'
    },
    {
      label: 'Wait for Completion',
      field: 'waitForCompletion',
      type: 'boolean',
      defaultValue: false,
      showWhen: function() {
        return ['job_build', 'job_build_parameters', 'pipeline_run'].includes(this.operation);
      }
    },
    {
      label: 'Timeout (seconds)',
      field: 'timeout',
      type: 'number',
      placeholder: '600',
      defaultValue: 600,
      showWhen: function() {
        return this.waitForCompletion === true;
      }
    },
    {
      label: 'Job Configuration (XML)',
      field: 'jobConfig',
      type: 'textarea',
      placeholder: '<?xml version="1.0" encoding="UTF-8"?>\n<project>...</project>',
      required: function() {
        return ['job_create', 'job_update_config'].includes(this.operation);
      },
      tooltip: 'Jenkins job configuration in XML format'
    },
    {
      label: 'Source Job',
      field: 'sourceJob',
      type: 'text',
      placeholder: 'existing-job',
      required: function() {
        return this.operation === 'job_copy';
      }
    },
    {
      label: 'New Job Name',
      field: 'newJobName',
      type: 'text',
      placeholder: 'new-job-name',
      required: function() {
        return ['job_create', 'job_copy'].includes(this.operation);
      }
    },
    {
      label: 'Folder Path',
      field: 'folderPath',
      type: 'text',
      placeholder: 'folder/subfolder',
      required: false,
      showWhen: function() {
        const folderOps = [
          'job_create', 'job_copy', 'folder_create', 'folder_delete',
          'folder_get_jobs', 'job_list'
        ];
        return folderOps.includes(this.operation);
      },
      tooltip: 'Path to folder (leave empty for root)'
    },

    // Build Operations Fields
    {
      label: 'Build Number',
      field: 'buildNumber',
      type: 'number',
      placeholder: '42',
      required: function() {
        const buildOps = [
          'build_get_info', 'build_get_log', 'build_stop',
          'build_get_artifact', 'build_get_test_results',
          'build_get_console', 'build_wait_complete'
        ];
        return buildOps.includes(this.operation);
      }
    },
    {
      label: 'Get Latest Build',
      field: 'latestBuild',
      type: 'boolean',
      defaultValue: false,
      showWhen: function() {
        const buildOps = [
          'build_get_info', 'build_get_log', 'build_get_artifact',
          'build_get_test_results', 'build_get_console'
        ];
        return buildOps.includes(this.operation);
      },
      tooltip: 'Use latest build instead of build number'
    },
    {
      label: 'Artifact Path',
      field: 'artifactPath',
      type: 'text',
      placeholder: 'target/app.jar',
      required: function() {
        return this.operation === 'build_get_artifact';
      }
    },
    {
      label: 'Console Start Offset',
      field: 'consoleStart',
      type: 'number',
      placeholder: '0',
      defaultValue: 0,
      showWhen: function() {
        return this.operation === 'build_get_console';
      }
    },
    {
      label: 'Build Depth',
      field: 'depth',
      type: 'number',
      placeholder: '10',
      defaultValue: 10,
      showWhen: function() {
        return this.operation === 'job_get_builds';
      },
      tooltip: 'Number of builds to retrieve'
    },

    // Pipeline Operations Fields
    {
      label: 'Pipeline Script',
      field: 'pipelineScript',
      type: 'textarea',
      placeholder: 'pipeline {\n  agent any\n  stages {\n    stage("Build") {\n      steps {\n        sh "echo Hello"\n      }\n    }\n  }\n}',
      required: function() {
        return this.operation === 'pipeline_run';
      }
    },
    {
      label: 'Pipeline Run ID',
      field: 'runId',
      type: 'text',
      placeholder: '42',
      required: function() {
        return ['pipeline_replay', 'pipeline_get_log', 'pipeline_abort', 'pipeline_get_status'].includes(this.operation);
      }
    },
    {
      label: 'Pipeline Parameters',
      field: 'pipelineParams',
      type: 'json',
      placeholder: '{\n  "param1": "value1",\n  "param2": true\n}',
      required: false,
      showWhen: function() {
        return ['pipeline_run', 'pipeline_replay'].includes(this.operation);
      }
    },

    // Queue Operations Fields
    {
      label: 'Queue Item ID',
      field: 'queueId',
      type: 'number',
      placeholder: '123',
      required: function() {
        return ['queue_get_info', 'queue_cancel'].includes(this.operation);
      }
    },

    // View Operations Fields
    {
      label: 'View Name',
      field: 'viewName',
      type: 'text',
      placeholder: 'my-view',
      required: function() {
        const viewOps = [
          'view_create', 'view_delete', 'view_get_jobs',
          'view_add_job', 'view_remove_job'
        ];
        return viewOps.includes(this.operation);
      }
    },
    {
      label: 'View Type',
      field: 'viewType',
      type: 'select',
      options: [
        { value: 'listview', label: 'List View' },
        { value: 'myview', label: 'My View' },
        { value: 'dashboard', label: 'Dashboard View' },
        { value: 'nested', label: 'Nested View' }
      ],
      defaultValue: 'listview',
      showWhen: function() {
        return this.operation === 'view_create';
      }
    },
    {
      label: 'View Configuration (XML)',
      field: 'viewConfig',
      type: 'textarea',
      placeholder: '<?xml version="1.0" encoding="UTF-8"?>\n<hudson.model.ListView>...</hudson.model.ListView>',
      required: false,
      showWhen: function() {
        return this.operation === 'view_create';
      }
    },

    // Node Operations Fields
    {
      label: 'Node Name',
      field: 'nodeName',
      type: 'text',
      placeholder: 'slave-01',
      required: function() {
        const nodeOps = [
          'node_get_info', 'node_enable', 'node_disable', 'node_get_config'
        ];
        return nodeOps.includes(this.operation);
      }
    },
    {
      label: 'Offline Message',
      field: 'offlineMessage',
      type: 'text',
      placeholder: 'Maintenance in progress',
      required: false,
      showWhen: function() {
        return this.operation === 'node_disable';
      }
    },

    // Folder Operations Fields
    {
      label: 'Folder Name',
      field: 'folderName',
      type: 'text',
      placeholder: 'my-folder',
      required: function() {
        return ['folder_create', 'folder_delete', 'folder_get_jobs'].includes(this.operation);
      }
    },
    {
      label: 'Folder Description',
      field: 'folderDescription',
      type: 'text',
      placeholder: 'Folder for project X',
      required: false,
      showWhen: function() {
        return this.operation === 'folder_create';
      }
    },

    // System Operations Fields
    {
      label: 'Safe Restart',
      field: 'safe',
      type: 'boolean',
      defaultValue: true,
      showWhen: function() {
        return ['system_restart', 'system_safeRestart'].includes(this.operation);
      },
      tooltip: 'Wait for running jobs to complete'
    },
    {
      label: 'Reason',
      field: 'reason',
      type: 'text',
      placeholder: 'System maintenance',
      required: false,
      showWhen: function() {
        return ['system_quietDown', 'system_restart', 'system_safeRestart'].includes(this.operation);
      }
    },

    // Plugin Operations Fields
    {
      label: 'Plugin Name',
      field: 'pluginName',
      type: 'text',
      placeholder: 'git',
      required: function() {
        return this.operation === 'plugin_info';
      }
    },
    {
      label: 'Plugin Depth',
      field: 'pluginDepth',
      type: 'number',
      placeholder: '1',
      defaultValue: 1,
      showWhen: function() {
        return ['plugin_list', 'plugin_info'].includes(this.operation);
      },
      tooltip: 'Level of detail (1-3)'
    },

    // Output Options
    {
      label: 'Include Details',
      field: 'includeDetails',
      type: 'boolean',
      defaultValue: true,
      showWhen: function() {
        const infoOps = [
          'job_get_info', 'build_get_info', 'node_get_info',
          'system_info', 'plugin_info', 'job_list', 'node_list'
        ];
        return infoOps.includes(this.operation);
      }
    },
    {
      label: 'Output Format',
      field: 'format',
      type: 'select',
      options: [
        { value: 'json', label: 'JSON' },
        { value: 'xml', label: 'XML' },
        { value: 'text', label: 'Plain Text' }
      ],
      defaultValue: 'json',
      showWhen: function() {
        const formatOps = [
          'job_get_config', 'job_get_info', 'build_get_info',
          'build_get_log', 'build_get_console', 'node_get_config',
          'system_info'
        ];
        return formatOps.includes(this.operation);
      }
    },
    {
      label: 'Filter Pattern',
      field: 'filterPattern',
      type: 'text',
      placeholder: '.*test.*',
      required: false,
      showWhen: function() {
        return ['job_list', 'view_get_jobs', 'node_list', 'plugin_list'].includes(this.operation);
      },
      tooltip: 'Regex pattern to filter results'
    },

    // Advanced Options
    {
      label: 'Follow Redirects',
      field: 'followRedirects',
      type: 'boolean',
      defaultValue: true,
      tooltip: 'Follow HTTP redirects'
    },
    {
      label: 'Verify SSL',
      field: 'verifySSL',
      type: 'boolean',
      defaultValue: true,
      tooltip: 'Verify SSL certificates'
    },
    {
      label: 'Request Timeout',
      field: 'requestTimeout',
      type: 'number',
      placeholder: '30',
      defaultValue: 30,
      tooltip: 'HTTP request timeout in seconds'
    },
    {
      label: 'Retry Count',
      field: 'retryCount',
      type: 'number',
      placeholder: '3',
      defaultValue: 3,
      tooltip: 'Number of retries on failure'
    }
  ],

  examples: [
    {
      name: 'Trigger Build with Parameters',
      description: 'Build a job with custom parameters and wait for completion',
      config: {
        jenkinsUrl: 'https://jenkins.company.com',
        authType: 'apitoken',
        username: 'build-user',
        apiToken: '${JENKINS_TOKEN}',
        enableCrumb: true,
        operation: 'job_build_parameters',
        jobName: 'deployment/production-deploy',
        jobParameters: {
          'BRANCH': 'release/v2.0',
          'ENVIRONMENT': 'production',
          'DEPLOY_TYPE': 'blue-green',
          'NOTIFY_SLACK': true
        },
        waitForCompletion: true,
        timeout: 1200
      }
    },
    {
      name: 'Run Declarative Pipeline',
      description: 'Execute a Jenkins pipeline script',
      config: {
        jenkinsUrl: 'https://jenkins.company.com',
        authType: 'apitoken',
        username: 'pipeline-user',
        apiToken: '${JENKINS_TOKEN}',
        operation: 'pipeline_run',
        jobName: 'ci/test-pipeline',
        pipelineScript: `pipeline {
  agent any
  parameters {
    string(name: 'VERSION', defaultValue: '1.0.0')
    booleanParam(name: 'RUN_TESTS', defaultValue: true)
  }
  stages {
    stage('Build') {
      steps {
        sh 'mvn clean package'
      }
    }
    stage('Test') {
      when {
        expression { params.RUN_TESTS }
      }
      steps {
        sh 'mvn test'
        junit '**/target/surefire-reports/*.xml'
      }
    }
  }
}`,
        pipelineParams: {
          'VERSION': '2.0.0',
          'RUN_TESTS': true
        }
      }
    },
    {
      name: 'Get Build Artifacts',
      description: 'Download build artifacts from latest successful build',
      config: {
        jenkinsUrl: 'https://jenkins.company.com',
        authType: 'apitoken',
        username: 'artifact-user',
        apiToken: '${JENKINS_TOKEN}',
        operation: 'build_get_artifact',
        jobName: 'builds/app-build',
        latestBuild: true,
        artifactPath: 'target/app-release.jar'
      }
    },
    {
      name: 'Monitor Build Queue',
      description: 'List all items in Jenkins build queue',
      config: {
        jenkinsUrl: 'https://jenkins.company.com',
        authType: 'apitoken',
        username: 'monitor-user',
        apiToken: '${JENKINS_TOKEN}',
        operation: 'queue_list',
        includeDetails: true,
        format: 'json'
      }
    },
    {
      name: 'Create Job from Template',
      description: 'Copy existing job to create new one',
      config: {
        jenkinsUrl: 'https://jenkins.company.com',
        authType: 'apitoken',
        username: 'admin-user',
        apiToken: '${JENKINS_TOKEN}',
        operation: 'job_copy',
        sourceJob: 'templates/maven-build-template',
        newJobName: 'projects/new-maven-project',
        folderPath: 'projects'
      }
    },
    {
      name: 'Safe System Restart',
      description: 'Restart Jenkins after current builds complete',
      config: {
        jenkinsUrl: 'https://jenkins.company.com',
        authType: 'apitoken',
        username: 'admin-user',
        apiToken: '${JENKINS_TOKEN}',
        operation: 'system_safeRestart',
        reason: 'Plugin updates - scheduled maintenance',
        safe: true
      }
    }
  ]
};
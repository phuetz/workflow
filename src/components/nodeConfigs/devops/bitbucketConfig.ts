import { NodeConfigDefinition } from '../../../types/nodeConfig';

export const bitbucketConfig: NodeConfigDefinition = {
  fields: [
    // Authentication
    {
      label: 'Bitbucket Type',
      field: 'bitbucketType',
      type: 'select',
      options: [
        { value: 'cloud', label: 'Bitbucket Cloud' },
        { value: 'server', label: 'Bitbucket Server/Data Center' }
      ],
      required: true,
      defaultValue: 'cloud',
      description: 'Choose between Bitbucket Cloud or Server'
    },
    {
      label: 'Server URL',
      field: 'serverUrl',
      type: 'text',
      placeholder: 'https://bitbucket.company.com',
      required: false,
      description: 'Your Bitbucket Server instance URL (required for Server type)'
    },
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      options: [
        { value: 'app_password', label: 'App Password' },
        { value: 'oauth2', label: 'OAuth 2.0' },
        { value: 'personal_token', label: 'Personal Access Token' },
        { value: 'basic', label: 'Basic Auth (deprecated)' }
      ],
      required: true,
      defaultValue: 'app_password'
    },
    {
      label: 'Username',
      field: 'username',
      type: 'text',
      placeholder: 'your-username',
      required: false,
      description: 'Required for App Password and Basic auth methods'
    },
    {
      label: 'App Password',
      field: 'appPassword',
      type: 'password',
      required: false,
      description: 'Generate from Bitbucket settings (required for App Password auth)'
    },
    {
      label: 'Personal Access Token',
      field: 'personalToken',
      type: 'password',
      required: false,
      description: 'Required for Personal Access Token auth method'
    },
    {
      label: 'OAuth Client ID',
      field: 'oauthClientId',
      type: 'text',
      required: false,
      description: 'Required for OAuth 2.0 authentication'
    },
    {
      label: 'OAuth Client Secret',
      field: 'oauthClientSecret',
      type: 'password',
      required: false,
      description: 'Required for OAuth 2.0 authentication'
    },
    {
      label: 'OAuth Access Token',
      field: 'oauthAccessToken',
      type: 'password',
      required: false,
      description: 'Required for OAuth 2.0 authentication'
    },

    // Operation
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // Repository Operations
        { value: 'repo_create', label: 'Create Repository' },
        { value: 'repo_get', label: 'Get Repository' },
        { value: 'repo_update', label: 'Update Repository' },
        { value: 'repo_delete', label: 'Delete Repository' },
        { value: 'repo_list', label: 'List Repositories' },
        { value: 'repo_fork', label: 'Fork Repository' },
        { value: 'repo_watchers', label: 'Get Repository Watchers' },
        { value: 'repo_forks', label: 'List Repository Forks' },
        
        // Pull Request Operations
        { value: 'pr_create', label: 'Create Pull Request' },
        { value: 'pr_get', label: 'Get Pull Request' },
        { value: 'pr_update', label: 'Update Pull Request' },
        { value: 'pr_list', label: 'List Pull Requests' },
        { value: 'pr_merge', label: 'Merge Pull Request' },
        { value: 'pr_decline', label: 'Decline Pull Request' },
        { value: 'pr_approve', label: 'Approve Pull Request' },
        { value: 'pr_unapprove', label: 'Unapprove Pull Request' },
        { value: 'pr_comments', label: 'Get PR Comments' },
        { value: 'pr_add_comment', label: 'Add PR Comment' },
        { value: 'pr_activity', label: 'Get PR Activity' },
        { value: 'pr_diff', label: 'Get PR Diff' },
        { value: 'pr_commits', label: 'Get PR Commits' },
        
        // Branch Operations
        { value: 'branch_create', label: 'Create Branch' },
        { value: 'branch_get', label: 'Get Branch' },
        { value: 'branch_delete', label: 'Delete Branch' },
        { value: 'branch_list', label: 'List Branches' },
        { value: 'branch_restrictions', label: 'Get Branch Restrictions' },
        { value: 'branch_set_restrictions', label: 'Set Branch Restrictions' },
        
        // Commit Operations
        { value: 'commit_get', label: 'Get Commit' },
        { value: 'commit_list', label: 'List Commits' },
        { value: 'commit_comments', label: 'Get Commit Comments' },
        { value: 'commit_add_comment', label: 'Add Commit Comment' },
        { value: 'commit_status', label: 'Get Commit Status' },
        { value: 'commit_build_status', label: 'Create Build Status' },
        
        // File Operations
        { value: 'file_get', label: 'Get File Content' },
        { value: 'file_create', label: 'Create File' },
        { value: 'file_update', label: 'Update File' },
        { value: 'file_delete', label: 'Delete File' },
        { value: 'file_list', label: 'List Files' },
        
        // Issue Operations
        { value: 'issue_create', label: 'Create Issue' },
        { value: 'issue_get', label: 'Get Issue' },
        { value: 'issue_update', label: 'Update Issue' },
        { value: 'issue_list', label: 'List Issues' },
        { value: 'issue_comments', label: 'Get Issue Comments' },
        { value: 'issue_add_comment', label: 'Add Issue Comment' },
        
        // Pipeline Operations
        { value: 'pipeline_trigger', label: 'Trigger Pipeline' },
        { value: 'pipeline_get', label: 'Get Pipeline' },
        { value: 'pipeline_stop', label: 'Stop Pipeline' },
        { value: 'pipeline_list', label: 'List Pipelines' },
        { value: 'pipeline_config', label: 'Get Pipeline Config' },
        
        // Webhook Operations
        { value: 'webhook_create', label: 'Create Webhook' },
        { value: 'webhook_get', label: 'Get Webhook' },
        { value: 'webhook_update', label: 'Update Webhook' },
        { value: 'webhook_delete', label: 'Delete Webhook' },
        { value: 'webhook_list', label: 'List Webhooks' },
        
        // Team/User Operations
        { value: 'user_get', label: 'Get User' },
        { value: 'team_list', label: 'List Teams' },
        { value: 'team_members', label: 'Get Team Members' },
        { value: 'team_repos', label: 'Get Team Repositories' }
      ],
      required: true,
      description: 'Bitbucket operation to perform'
    },

    // Common Fields
    {
      label: 'Workspace',
      field: 'workspace',
      type: 'text',
      placeholder: 'my-workspace',
      required: false,
      description: 'Bitbucket workspace (Cloud) or project key (Server), required for Cloud type'
    },
    {
      label: 'Repository Slug',
      field: 'repoSlug',
      type: 'text',
      placeholder: 'my-repo',
      required: false,
      description: 'Required for most repository operations'
    },

    // Repository Operations Fields
    {
      label: 'Repository Name',
      field: 'repoName',
      type: 'text',
      placeholder: 'My New Repository',
      required: false,
      description: 'Required when creating a repository'
    },
    {
      label: 'Repository Key',
      field: 'repoKey',
      type: 'text',
      placeholder: 'MYNEWREPO',
      required: false,
      description: 'Required for creating repositories on Server (uppercase letters, numbers, underscores)',
      validation: (value) => {
        if (value && !/^[A-Z0-9_]+$/.test(value as string)) {
          return 'Repository key must be uppercase letters, numbers, and underscores only';
        }
        return null;
      }
    },
    {
      label: 'Description',
      field: 'description',
      type: 'text',
      placeholder: 'Repository description',
      required: false,
      description: 'Optional for repo create/update operations'
    },
    {
      label: 'Is Private',
      field: 'isPrivate',
      type: 'checkbox',
      defaultValue: true,
      description: 'For repo create/update operations'
    },
    {
      label: 'Fork Policy',
      field: 'forkPolicy',
      type: 'select',
      options: [
        { value: 'allow_forks', label: 'Allow Forks' },
        { value: 'no_public_forks', label: 'No Public Forks' },
        { value: 'no_forks', label: 'No Forks' }
      ],
      defaultValue: 'allow_forks',
      description: 'For repo create/update operations'
    },
    {
      label: 'Has Wiki',
      field: 'hasWiki',
      type: 'checkbox',
      defaultValue: false,
      description: 'For repo create/update operations'
    },
    {
      label: 'Has Issues',
      field: 'hasIssues',
      type: 'checkbox',
      defaultValue: true,
      description: 'For repo create/update operations'
    },
    {
      label: 'Language',
      field: 'language',
      type: 'text',
      placeholder: 'javascript',
      required: false,
      description: 'For repo create/update operations'
    },
    {
      label: 'Main Branch',
      field: 'mainBranch',
      type: 'text',
      placeholder: 'main',
      defaultValue: 'main',
      description: 'For repo create/update operations'
    },

    // Pull Request Fields
    {
      label: 'Pull Request ID',
      field: 'prId',
      type: 'number',
      placeholder: '123',
      required: false,
      description: 'Required for PR operations (get, update, merge, etc.)'
    },
    {
      label: 'Title',
      field: 'title',
      type: 'text',
      placeholder: 'Add new feature',
      required: false,
      description: 'Required for creating PRs or issues'
    },
    {
      label: 'Source Branch',
      field: 'sourceBranch',
      type: 'text',
      placeholder: 'feature/new-feature',
      required: false,
      description: 'Required for creating PRs'
    },
    {
      label: 'Destination Branch',
      field: 'destinationBranch',
      type: 'text',
      placeholder: 'main',
      required: false,
      description: 'Required for creating PRs'
    },
    {
      label: 'PR Description',
      field: 'prDescription',
      type: 'text',
      placeholder: 'Detailed description of changes...',
      required: false,
      description: 'For PR create/update operations'
    },
    {
      label: 'Close Source Branch',
      field: 'closeSourceBranch',
      type: 'checkbox',
      defaultValue: true,
      description: 'For PR create/merge operations'
    },
    {
      label: 'Reviewers',
      field: 'reviewers',
      type: 'json',
      placeholder: '["username1", "username2"]',
      required: false,
      description: 'For PR create operation'
    },
    {
      label: 'Merge Strategy',
      field: 'mergeStrategy',
      type: 'select',
      options: [
        { value: 'merge_commit', label: 'Merge Commit' },
        { value: 'squash', label: 'Squash' },
        { value: 'fast_forward', label: 'Fast Forward' }
      ],
      defaultValue: 'merge_commit',
      description: 'For PR merge operation'
    },
    {
      label: 'Merge Message',
      field: 'mergeMessage',
      type: 'text',
      placeholder: 'Merge pull request #123',
      required: false,
      description: 'For PR merge operation'
    },
    {
      label: 'PR State',
      field: 'prState',
      type: 'select',
      options: [
        { value: 'OPEN', label: 'Open' },
        { value: 'MERGED', label: 'Merged' },
        { value: 'DECLINED', label: 'Declined' },
        { value: 'SUPERSEDED', label: 'Superseded' }
      ],
      required: false,
      description: 'For PR list operation filter'
    },

    // Branch Operations Fields
    {
      label: 'Branch Name',
      field: 'branchName',
      type: 'text',
      placeholder: 'feature/new-feature',
      required: false,
      description: 'Required for branch operations (create, get, delete, restrictions)'
    },
    {
      label: 'Start Point',
      field: 'startPoint',
      type: 'text',
      placeholder: 'main or commit-sha',
      required: false,
      description: 'Branch or commit to branch from (required for branch create)'
    },
    {
      label: 'Branch Restrictions',
      field: 'restrictions',
      type: 'json',
      placeholder: '{\n  "kind": "push",\n  "users": ["user1"],\n  "groups": ["group1"]\n}',
      required: false,
      description: 'Required for setting branch restrictions'
    },

    // Commit Operations Fields
    {
      label: 'Commit SHA',
      field: 'commitSha',
      type: 'text',
      placeholder: 'abc123def456',
      required: false,
      description: 'Required for commit operations (get, comments, status, build status)'
    },
    {
      label: 'Build Status State',
      field: 'buildState',
      type: 'select',
      options: [
        { value: 'SUCCESSFUL', label: 'Successful' },
        { value: 'FAILED', label: 'Failed' },
        { value: 'INPROGRESS', label: 'In Progress' },
        { value: 'STOPPED', label: 'Stopped' }
      ],
      required: false,
      description: 'Required for commit build status operation'
    },
    {
      label: 'Build Key',
      field: 'buildKey',
      type: 'text',
      placeholder: 'my-build-system',
      required: false,
      description: 'Required for commit build status operation'
    },
    {
      label: 'Build Name',
      field: 'buildName',
      type: 'text',
      placeholder: 'Build #123',
      required: false,
      description: 'Required for commit build status operation'
    },
    {
      label: 'Build URL',
      field: 'buildUrl',
      type: 'text',
      placeholder: 'https://ci.example.com/build/123',
      required: false,
      description: 'For commit build status operation'
    },
    {
      label: 'Build Description',
      field: 'buildDescription',
      type: 'text',
      placeholder: 'Tests passed',
      required: false,
      description: 'For commit build status operation'
    },

    // File Operations Fields
    {
      label: 'File Path',
      field: 'filePath',
      type: 'text',
      placeholder: 'src/index.js',
      required: false,
      description: 'Required for file operations (get, create, update, delete)'
    },
    {
      label: 'File Content',
      field: 'fileContent',
      type: 'text',
      placeholder: 'File content here...',
      required: false,
      description: 'Required for file create/update operations'
    },
    {
      label: 'Commit Message',
      field: 'commitMessage',
      type: 'text',
      placeholder: 'Update file',
      required: false,
      description: 'Required for file create/update/delete operations'
    },
    {
      label: 'Branch',
      field: 'branch',
      type: 'text',
      placeholder: 'main',
      defaultValue: 'main',
      description: 'For file and commit operations'
    },
    {
      label: 'File Path Pattern',
      field: 'pathPattern',
      type: 'text',
      placeholder: 'src/',
      required: false,
      description: 'Filter files by path prefix (for file list operation)'
    },

    // Issue Operations Fields
    {
      label: 'Issue ID',
      field: 'issueId',
      type: 'number',
      placeholder: '42',
      required: false,
      description: 'Required for issue operations (get, update, comments)'
    },
    {
      label: 'Issue Type',
      field: 'issueType',
      type: 'select',
      options: [
        { value: 'bug', label: 'Bug' },
        { value: 'enhancement', label: 'Enhancement' },
        { value: 'proposal', label: 'Proposal' },
        { value: 'task', label: 'Task' }
      ],
      defaultValue: 'bug',
      description: 'For issue create/update operations'
    },
    {
      label: 'Priority',
      field: 'priority',
      type: 'select',
      options: [
        { value: 'trivial', label: 'Trivial' },
        { value: 'minor', label: 'Minor' },
        { value: 'major', label: 'Major' },
        { value: 'critical', label: 'Critical' },
        { value: 'blocker', label: 'Blocker' }
      ],
      defaultValue: 'major',
      description: 'For issue create/update operations'
    },
    {
      label: 'Issue Status',
      field: 'issueStatus',
      type: 'select',
      options: [
        { value: 'new', label: 'New' },
        { value: 'open', label: 'Open' },
        { value: 'resolved', label: 'Resolved' },
        { value: 'on hold', label: 'On Hold' },
        { value: 'invalid', label: 'Invalid' },
        { value: 'duplicate', label: 'Duplicate' },
        { value: 'wontfix', label: "Won't Fix" }
      ],
      required: false,
      description: 'For issue update/list operations'
    },
    {
      label: 'Assignee',
      field: 'assignee',
      type: 'text',
      placeholder: 'username',
      required: false,
      description: 'For issue create/update operations'
    },

    // Comment Fields
    {
      label: 'Comment',
      field: 'comment',
      type: 'text',
      placeholder: 'Your comment here...',
      required: false,
      description: 'Required for adding comments to PRs, commits, or issues'
    },
    {
      label: 'Comment ID',
      field: 'commentId',
      type: 'number',
      placeholder: '123',
      required: false,
      description: 'Optional: Reply to specific comment'
    },

    // Pipeline Operations Fields
    {
      label: 'Pipeline UUID',
      field: 'pipelineUuid',
      type: 'text',
      placeholder: '{uuid}',
      required: false,
      description: 'Required for pipeline get/stop operations'
    },
    {
      label: 'Pipeline Target',
      field: 'pipelineTarget',
      type: 'json',
      placeholder: '{\n  "ref_type": "branch",\n  "ref_name": "main",\n  "selector": {\n    "type": "custom",\n    "pattern": "deploy-to-production"\n  }\n}',
      required: false,
      description: 'Required for pipeline trigger operation'
    },
    {
      label: 'Pipeline Variables',
      field: 'pipelineVariables',
      type: 'json',
      placeholder: '[\n  {\n    "key": "ENVIRONMENT",\n    "value": "production"\n  }\n]',
      required: false,
      description: 'For pipeline trigger operation'
    },

    // Webhook Operations Fields
    {
      label: 'Webhook UUID',
      field: 'webhookUuid',
      type: 'text',
      placeholder: '{uuid}',
      required: false,
      description: 'Required for webhook get/update/delete operations'
    },
    {
      label: 'Webhook URL',
      field: 'webhookUrl',
      type: 'text',
      placeholder: 'https://example.com/webhook',
      required: false,
      description: 'Required for webhook create/update operations'
    },
    {
      label: 'Webhook Events',
      field: 'webhookEvents',
      type: 'json',
      placeholder: '[\n  "repo:push",\n  "pullrequest:created",\n  "pullrequest:updated",\n  "issue:created"\n]',
      required: false,
      description: 'Required for webhook create operation'
    },
    {
      label: 'Webhook Active',
      field: 'webhookActive',
      type: 'checkbox',
      defaultValue: true,
      description: 'For webhook create/update operations'
    },

    // Filtering and Pagination
    {
      label: 'Page',
      field: 'page',
      type: 'number',
      placeholder: '1',
      defaultValue: 1,
      description: 'For list operations (repos, PRs, branches, commits, etc.)'
    },
    {
      label: 'Page Size',
      field: 'pageSize',
      type: 'number',
      placeholder: '50',
      defaultValue: 50,
      description: 'For list operations (repos, PRs, branches, commits, etc.)'
    },
    {
      label: 'Sort By',
      field: 'sort',
      type: 'text',
      placeholder: '-updated_on',
      required: false,
      description: 'For list operations - use minus prefix for descending order'
    },
    {
      label: 'Query Filter',
      field: 'q',
      type: 'text',
      placeholder: 'name ~ "project"',
      required: false,
      description: 'Bitbucket query language for filtering lists'
    }
  ],

  examples: [
    {
      label: 'Create Pull Request - Create a pull request with reviewers',
      config: {
        bitbucketType: 'cloud',
        authMethod: 'app_password',
        username: 'developer',
        appPassword: '${BITBUCKET_APP_PASSWORD}',
        operation: 'pr_create',
        workspace: 'my-company',
        repoSlug: 'web-app',
        title: 'Feature: Add user authentication',
        sourceBranch: 'feature/user-auth',
        destinationBranch: 'develop',
        prDescription: '## Summary\n- Implemented JWT authentication\n- Added login/logout endpoints\n- Updated user model\n\n## Testing\n- Unit tests added\n- Manual testing completed',
        reviewers: ['john.doe', 'jane.smith'],
        closeSourceBranch: true
      }
    },
    {
      label: 'Trigger Deployment Pipeline - Trigger a custom pipeline for production deployment',
      config: {
        bitbucketType: 'cloud',
        authMethod: 'app_password',
        username: 'devops',
        appPassword: '${BITBUCKET_APP_PASSWORD}',
        operation: 'pipeline_trigger',
        workspace: 'my-company',
        repoSlug: 'backend-api',
        pipelineTarget: {
          'ref_type': 'branch',
          'ref_name': 'main',
          'selector': {
            'type': 'custom',
            'pattern': 'deploy-production'
          }
        },
        pipelineVariables: [
          {
            'key': 'ENVIRONMENT',
            'value': 'production'
          },
          {
            'key': 'VERSION',
            'value': 'v2.0.0'
          }
        ]
      }
    },
    {
      label: 'Update Build Status - Report CI/CD build status to Bitbucket',
      config: {
        bitbucketType: 'cloud',
        authMethod: 'app_password',
        username: 'ci-bot',
        appPassword: '${BITBUCKET_APP_PASSWORD}',
        operation: 'commit_build_status',
        workspace: 'my-company',
        repoSlug: 'mobile-app',
        commitSha: 'abc123def456',
        buildState: 'SUCCESSFUL',
        buildKey: 'jenkins-android',
        buildName: 'Android Build #245',
        buildUrl: 'https://jenkins.company.com/job/android/245',
        buildDescription: 'All tests passed (98% coverage)'
      }
    },
    {
      label: 'Create Repository Webhook - Set up webhook for PR and push events',
      config: {
        bitbucketType: 'cloud',
        authMethod: 'app_password',
        username: 'admin',
        appPassword: '${BITBUCKET_APP_PASSWORD}',
        operation: 'webhook_create',
        workspace: 'my-company',
        repoSlug: 'microservice',
        webhookUrl: 'https://ci.company.com/bitbucket/webhook',
        webhookEvents: [
          'repo:push',
          'pullrequest:created',
          'pullrequest:updated',
          'pullrequest:approved',
          'pullrequest:merged'
        ],
        webhookActive: true
      }
    },
    {
      label: 'Search and List PRs - Find open pull requests assigned to team',
      config: {
        bitbucketType: 'cloud',
        authMethod: 'app_password',
        username: 'team-lead',
        appPassword: '${BITBUCKET_APP_PASSWORD}',
        operation: 'pr_list',
        workspace: 'my-company',
        repoSlug: 'platform',
        prState: 'OPEN',
        q: 'reviewers.username = "frontend-team"',
        sort: '-updated_on',
        pageSize: 25
      }
    },
    {
      label: 'Branch Protection - Set branch restrictions on main branch',
      config: {
        bitbucketType: 'server',
        serverUrl: 'https://bitbucket.company.com',
        authMethod: 'personal_token',
        personalToken: '${BITBUCKET_TOKEN}',
        operation: 'branch_set_restrictions',
        workspace: 'PROJECT',
        repoSlug: 'core-api',
        branchName: 'main',
        restrictions: {
          'kind': 'push',
          'users': [],
          'groups': ['senior-developers'],
          'pattern': 'main',
          'type': 'branch_restriction'
        }
      }
    }
  ]
};
import { NodeType } from '../../types/workflow';

export const DEVOPS_NODES: Record<string, NodeType> = {
  github: {
      type: 'github',
      label: 'GitHub',
      icon: 'Github',
      color: 'bg-gray-800',
      category: 'development',
      inputs: 1,
      outputs: 1,
      description: 'GitHub API integration'
    },
  gitlab: {
      type: 'gitlab',
      label: 'GitLab',
      icon: 'GitBranch',
      color: 'bg-orange-800',
      category: 'development',
      inputs: 1,
      outputs: 1,
      description: 'GitLab integration'
    },
  jira: {
      type: 'jira',
      label: 'Jira',
      icon: 'Bug',
      color: 'bg-blue-700',
      category: 'development',
      inputs: 1,
      outputs: 1,
      description: 'Jira issue tracking'
    },
  confluence: {
      type: 'confluence',
      label: 'Confluence',
      icon: 'BookOpen',
      color: 'bg-blue-600',
      category: 'development',
      inputs: 1,
      outputs: 1,
      description: 'Confluence documentation platform',
    },
  linear: {
      type: 'linear',
      label: 'Linear',
      icon: 'Kanban',
      color: 'bg-gray-600',
      category: 'development',
      inputs: 1,
      outputs: 1,
      description: 'Linear issue tracking',
    },
  errorGenerator: {
      type: 'errorGenerator',
      label: 'Error Generator',
      icon: 'AlertTriangle',
      color: 'bg-red-500',
      category: 'dev',
      inputs: 1,
      outputs: 1,
      description: 'Generate an error for testing',
    },
  jenkins: {
      type: 'jenkins',
      label: 'Jenkins',
      icon: 'Settings',
      color: 'bg-red-700',
      category: 'devops',
      inputs: 1,
      outputs: 1,
      description: 'Jenkins CI/CD automation'
    },
  bitbucket: {
      type: 'bitbucket',
      label: 'Bitbucket',
      icon: 'GitBranch',
      color: 'bg-blue-700',
      category: 'devops',
      inputs: 1,
      outputs: 1,
      description: 'Bitbucket repository management'
    },
  circleci: {
      type: 'circleci',
      label: 'CircleCI',
      icon: 'Circle',
      color: 'bg-gray-800',
      category: 'devops',
      inputs: 1,
      outputs: 1,
      description: 'CircleCI continuous integration'
    },
  dockerhub: {
      type: 'dockerhub',
      label: 'Docker Hub',
      icon: 'Package',
      color: 'bg-blue-600',
      category: 'devops',
      inputs: 1,
      outputs: 1,
      description: 'Docker Hub registry'
    },
  kubernetes: {
      type: 'kubernetes',
      label: 'Kubernetes',
      icon: 'Anchor',
      color: 'bg-blue-700',
      category: 'devops',
      inputs: 1,
      outputs: 1,
      description: 'Kubernetes orchestration'
    },
  terraform: {
      type: 'terraform',
      label: 'Terraform',
      icon: 'Layers',
      color: 'bg-purple-600',
      category: 'devops',
      inputs: 1,
      outputs: 1,
      description: 'Terraform infrastructure as code'
    },
  ansible: {
      type: 'ansible',
      label: 'Ansible',
      icon: 'Terminal',
      color: 'bg-red-600',
      category: 'devops',
      inputs: 1,
      outputs: 1,
      description: 'Ansible automation'
    },
  pythonCode: {
      type: 'pythonCode',
      label: 'Python Code',
      icon: 'Code',
      color: 'bg-blue-600',
      category: 'development',
      inputs: 1,
      outputs: 1,
      description: 'Execute Python code'
    },
  javaCode: {
      type: 'javaCode',
      label: 'Java Code',
      icon: 'Coffee',
      color: 'bg-orange-600',
      category: 'development',
      inputs: 1,
      outputs: 1,
      description: 'Execute Java code'
    },
  githubAdvanced: {
      type: 'githubAdvanced',
      label: 'GitHub Advanced',
      icon: 'Github',
      color: 'bg-gray-900',
      category: 'devops',
      inputs: 1,
      outputs: 1,
      description: 'GitHub (releases, deployments)'
    },
  gitlabAdvanced: {
      type: 'gitlabAdvanced',
      label: 'GitLab Advanced',
      icon: 'GitBranch',
      color: 'bg-orange-700',
      category: 'devops',
      inputs: 1,
      outputs: 1,
      description: 'GitLab (pipelines, merge requests)'
    },
  bitbucketRepo: {
      type: 'bitbucketRepo',
      label: 'Bitbucket',
      icon: 'GitBranch',
      color: 'bg-blue-700',
      category: 'devops',
      inputs: 1,
      outputs: 1,
      description: 'Bitbucket (repos, pull requests)'
    },
  jenkinsCI: {
      type: 'jenkinsCI',
      label: 'Jenkins CI',
      icon: 'Settings',
      color: 'bg-red-700',
      category: 'devops',
      inputs: 1,
      outputs: 1,
      description: 'Jenkins (jobs, builds)'
    },
  circleCIBuild: {
      type: 'circleCIBuild',
      label: 'CircleCI',
      icon: 'Circle',
      color: 'bg-gray-800',
      category: 'devops',
      inputs: 1,
      outputs: 1,
      description: 'CircleCI (pipelines, workflows)'
    },
  travisCI: {
      type: 'travisCI',
      label: 'Travis CI',
      icon: 'Box',
      color: 'bg-yellow-700',
      category: 'devops',
      inputs: 1,
      outputs: 1,
      description: 'Travis CI builds'
    },
  azureDevOpsCI: {
      type: 'azureDevOpsCI',
      label: 'Azure DevOps',
      icon: 'Cloud',
      color: 'bg-blue-800',
      category: 'devops',
      inputs: 1,
      outputs: 1,
      description: 'Azure DevOps (repos, pipelines)'
    },
  jiraAdvanced: {
      type: 'jiraAdvanced',
      label: 'Jira Advanced',
      icon: 'Bug',
      color: 'bg-blue-700',
      category: 'devops',
      inputs: 1,
      outputs: 1,
      description: 'Jira (sprints, epics)'
    },
  linearAdvanced: {
      type: 'linearAdvanced',
      label: 'Linear Advanced',
      icon: 'Kanban',
      color: 'bg-purple-700',
      category: 'devops',
      inputs: 1,
      outputs: 1,
      description: 'Linear (projects, cycles)'
    },
  sentryMonitoring: {
      type: 'sentryMonitoring',
      label: 'Sentry',
      icon: 'AlertTriangle',
      color: 'bg-purple-800',
      category: 'devops',
      inputs: 1,
      outputs: 1,
      description: 'Sentry (error tracking, releases)'
    }
};

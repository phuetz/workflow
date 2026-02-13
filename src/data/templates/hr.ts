/**
 * Workflow Templates - hr
 */

import type { WorkflowTemplate } from '../../types/templates';

export const HR_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'employee-onboarding-workflow',
    name: 'Employee Onboarding Workflow',
    description: 'Streamline new employee onboarding across HR systems, IT provisioning, and team introductions.',
    category: 'hr',
    subcategory: 'onboarding',
    author: 'System',
    authorType: 'official',
    tags: ['hr', 'onboarding', 'employees', 'automation'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'New Employee Trigger',
            properties: {
              path: '/new-employee',
              methods: ['POST']
            }
          }
        },
        {
          id: 'bamboohr-1',
          type: 'bamboohr',
          position: { x: 300, y: 150 },
          data: {
            label: 'Create HR Profile',
            properties: {
              operation: 'createEmployee',
              firstName: '={{$input.firstName}}',
              lastName: '={{$input.lastName}}',
              email: '={{$input.email}}',
              startDate: '={{$input.startDate}}'
            },
            credentials: ['bamboohrApi']
          }
        },
        {
          id: 'gsuite-1',
          type: 'gsuite',
          position: { x: 300, y: 250 },
          data: {
            label: 'Create Email Account',
            properties: {
              operation: 'createUser',
              email: '={{$input.email}}',
              password: 'ChangeMe123!',
              sendWelcomeEmail: true
            },
            credentials: ['gsuiteApi']
          }
        },
        {
          id: 'slack-1',
          type: 'slack',
          position: { x: 500, y: 200 },
          data: {
            label: 'Welcome to Slack',
            properties: {
              operation: 'sendMessage',
              channel: '#general',
              text: 'Welcome {{$input.firstName}} to the team! :wave:'
            },
            credentials: ['slackApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'bamboohr-1' },
        { id: 'e2', source: 'trigger-1', target: 'gsuite-1' },
        { id: 'e3', source: 'bamboohr-1', target: 'slack-1' },
        { id: 'e4', source: 'gsuite-1', target: 'slack-1' }
      ]
    },
    version: '1.1.0',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date(),
    downloads: 1156,
    rating: 4.8,
    reviewCount: 132,
    featured: true,
    requiredIntegrations: ['webhook_trigger', 'bamboohr', 'gsuite', 'slack'],
    requiredCredentials: ['bamboohrApi', 'gsuiteApi', 'slackApi'],
    estimatedSetupTime: 20,
    documentation: {
      overview: 'Automate the entire employee onboarding process across multiple systems.',
      setup: [],
      usage: 'Trigger via webhook when a new employee is added to your system.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'job-application-workflow',
    name: 'Job Application Workflow',
    description: 'Process job applications from forms, screen candidates, and sync to your ATS.',
    category: 'hr',
    subcategory: 'recruiting',
    author: 'System',
    authorType: 'official',
    tags: ['forms', 'hr', 'recruiting', 'applications', 'ats'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'form-1',
          type: 'formTrigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Application Form',
            properties: {
              title: 'Job Application',
              fields: ['name', 'email', 'phone', 'resume', 'coverLetter', 'linkedin']
            }
          }
        },
        {
          id: 'greenhouse-1',
          type: 'greenhouse',
          position: { x: 300, y: 200 },
          data: {
            label: 'Create Candidate',
            properties: {
              operation: 'createCandidate',
              firstName: '={{$input.name.split(" ")[0]}}',
              lastName: '={{$input.name.split(" ")[1]}}',
              email: '={{$input.email}}'
            },
            credentials: ['greenhouseApi']
          }
        },
        {
          id: 'ai-1',
          type: 'openai',
          position: { x: 500, y: 200 },
          data: {
            label: 'Screen Resume',
            properties: {
              model: 'gpt-4',
              prompt: 'Rate this candidate resume for the role. Resume: {{$input.resume}}'
            },
            credentials: ['openaiApi']
          }
        },
        {
          id: 'slack-1',
          type: 'slack',
          position: { x: 700, y: 200 },
          data: {
            label: 'Notify Recruiting',
            properties: {
              channel: '#recruiting',
              text: 'New application: {{$input.name}} - AI Score: {{$node["ai-1"].json.score}}'
            },
            credentials: ['slackApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'form-1', target: 'greenhouse-1' },
        { id: 'e2', source: 'greenhouse-1', target: 'ai-1' },
        { id: 'e3', source: 'ai-1', target: 'slack-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-04'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.6,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['formTrigger', 'greenhouse', 'openai', 'slack'],
    requiredCredentials: ['greenhouseApi', 'openaiApi', 'slackApi'],
    estimatedSetupTime: 25,
    documentation: {
      overview: 'Automated job application processing.',
      setup: [],
      usage: 'Link form to job postings.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'employee-onboarding',
    name: 'Employee Onboarding Automation',
    description: 'Automate new hire onboarding with account creation, notifications, and task assignments.',
    category: 'hr',
    subcategory: 'onboarding',
    author: 'System',
    authorType: 'official',
    tags: ['hr', 'onboarding', 'employees', 'automation'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'bamboohr_trigger', position: { x: 100, y: 200 }, data: { label: 'New Hire', properties: { event: 'employee.created' }, credentials: ['bamboohrApi'] } },
        { id: 'google-1', type: 'googleWorkspace', position: { x: 300, y: 100 }, data: { label: 'Create Account', properties: { operation: 'createUser' }, credentials: ['googleWorkspaceApi'] } },
        { id: 'slack-1', type: 'slack', position: { x: 300, y: 200 }, data: { label: 'Invite to Slack', properties: { operation: 'inviteUser' }, credentials: ['slackApi'] } },
        { id: 'asana-1', type: 'asana', position: { x: 300, y: 300 }, data: { label: 'Create Tasks', properties: { operation: 'createTask', project: 'Onboarding' }, credentials: ['asanaApi'] } },
        { id: 'email-1', type: 'sendgrid', position: { x: 500, y: 200 }, data: { label: 'Welcome Email', properties: { templateId: 'welcome-employee' }, credentials: ['sendgridApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'google-1' },
        { id: 'e2', source: 'trigger-1', target: 'slack-1' },
        { id: 'e3', source: 'trigger-1', target: 'asana-1' },
        { id: 'e4', source: 'google-1', target: 'email-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-10'), updatedAt: new Date(), downloads: 0, rating: 4.9, reviewCount: 0, featured: true,
    requiredIntegrations: ['bamboohr_trigger', 'googleWorkspace', 'slack', 'asana', 'sendgrid'], requiredCredentials: ['bamboohrApi', 'googleWorkspaceApi', 'slackApi', 'asanaApi', 'sendgridApi'], estimatedSetupTime: 45,
    documentation: { overview: 'Complete onboarding automation.', setup: [], usage: 'Triggers on new hire.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'interview-scheduling',
    name: 'Interview Scheduling Automation',
    description: 'Automate interview scheduling with calendar integration and reminders.',
    category: 'hr',
    subcategory: 'recruiting',
    author: 'System',
    authorType: 'official',
    tags: ['interview', 'scheduling', 'calendar', 'recruiting'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'greenhouse_trigger', position: { x: 100, y: 200 }, data: { label: 'Interview Scheduled', properties: { event: 'interview.scheduled' }, credentials: ['greenhouseApi'] } },
        { id: 'calendar-1', type: 'googleCalendar', position: { x: 300, y: 200 }, data: { label: 'Create Event', properties: { operation: 'createEvent' }, credentials: ['googleCalendarApi'] } },
        { id: 'email-1', type: 'sendgrid', position: { x: 500, y: 150 }, data: { label: 'Notify Candidate', properties: { templateId: 'interview-confirmation' }, credentials: ['sendgridApi'] } },
        { id: 'slack-1', type: 'slack', position: { x: 500, y: 250 }, data: { label: 'Notify Interviewer', properties: { channel: '#recruiting' }, credentials: ['slackApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'calendar-1' },
        { id: 'e2', source: 'calendar-1', target: 'email-1' },
        { id: 'e3', source: 'calendar-1', target: 'slack-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-11'), updatedAt: new Date(), downloads: 0, rating: 4.7, reviewCount: 0, featured: false,
    requiredIntegrations: ['greenhouse_trigger', 'googleCalendar', 'sendgrid', 'slack'], requiredCredentials: ['greenhouseApi', 'googleCalendarApi', 'sendgridApi', 'slackApi'], estimatedSetupTime: 25,
    documentation: { overview: 'Streamline interview scheduling.', setup: [], usage: 'Automates scheduling process.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'pto-request-workflow',
    name: 'PTO Request Workflow',
    description: 'Handle PTO requests with manager approval and calendar blocking.',
    category: 'hr',
    subcategory: 'time_off',
    author: 'System',
    authorType: 'official',
    tags: ['pto', 'time_off', 'approval', 'hr'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'form-1', type: 'formTrigger', position: { x: 100, y: 200 }, data: { label: 'PTO Request', properties: { title: 'PTO Request', fields: ['startDate', 'endDate', 'reason'] } } },
        { id: 'approval-1', type: 'approval', position: { x: 300, y: 200 }, data: { label: 'Manager Approval', properties: { approvers: ['manager'] } } },
        { id: 'calendar-1', type: 'googleCalendar', position: { x: 500, y: 150 }, data: { label: 'Block Calendar', properties: { operation: 'createEvent', title: 'PTO' }, credentials: ['googleCalendarApi'] } },
        { id: 'bamboo-1', type: 'bamboohr', position: { x: 500, y: 250 }, data: { label: 'Record PTO', properties: { operation: 'createTimeOff' }, credentials: ['bamboohrApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'form-1', target: 'approval-1' },
        { id: 'e2', source: 'approval-1', target: 'calendar-1', sourceHandle: 'approved' },
        { id: 'e3', source: 'approval-1', target: 'bamboo-1', sourceHandle: 'approved' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-12'), updatedAt: new Date(), downloads: 0, rating: 4.8, reviewCount: 0, featured: true,
    requiredIntegrations: ['formTrigger', 'approval', 'googleCalendar', 'bamboohr'], requiredCredentials: ['googleCalendarApi', 'bamboohrApi'], estimatedSetupTime: 30,
    documentation: { overview: 'Streamlined PTO management.', setup: [], usage: 'Submit PTO via form.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'employee-offboarding',
    name: 'Employee Offboarding',
    description: 'Automate employee departure with account deactivation and asset recovery.',
    category: 'hr',
    subcategory: 'offboarding',
    author: 'System',
    authorType: 'official',
    tags: ['offboarding', 'hr', 'security', 'accounts'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'bamboohr_trigger', position: { x: 100, y: 200 }, data: { label: 'Employee Leaving', properties: { event: 'employee.terminated' }, credentials: ['bamboohrApi'] } },
        { id: 'google-1', type: 'googleWorkspace', position: { x: 300, y: 100 }, data: { label: 'Disable Account', properties: { operation: 'suspendUser' }, credentials: ['googleWorkspaceApi'] } },
        { id: 'slack-1', type: 'slack', position: { x: 300, y: 200 }, data: { label: 'Deactivate Slack', properties: { operation: 'deactivateUser' }, credentials: ['slackApi'] } },
        { id: 'asana-1', type: 'asana', position: { x: 300, y: 300 }, data: { label: 'Reassign Tasks', properties: { operation: 'reassignTasks' }, credentials: ['asanaApi'] } },
        { id: 'email-1', type: 'sendgrid', position: { x: 500, y: 200 }, data: { label: 'Notify IT', properties: { to: 'it@company.com', subject: 'Offboarding Checklist' }, credentials: ['sendgridApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'google-1' },
        { id: 'e2', source: 'trigger-1', target: 'slack-1' },
        { id: 'e3', source: 'trigger-1', target: 'asana-1' },
        { id: 'e4', source: 'google-1', target: 'email-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-13'), updatedAt: new Date(), downloads: 0, rating: 4.8, reviewCount: 0, featured: false,
    requiredIntegrations: ['bamboohr_trigger', 'googleWorkspace', 'slack', 'asana', 'sendgrid'], requiredCredentials: ['bamboohrApi', 'googleWorkspaceApi', 'slackApi', 'asanaApi', 'sendgridApi'], estimatedSetupTime: 40,
    documentation: { overview: 'Secure employee offboarding.', setup: [], usage: 'Triggered on termination.' }, screenshots: [], customizableFields: [], pricing: 'free'
  }
];

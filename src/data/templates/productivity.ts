/**
 * Workflow Templates - productivity
 */

import type { WorkflowTemplate } from '../../types/templates';

export const PRODUCTIVITY_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'meeting-scheduler',
    name: 'Meeting Scheduler',
    description: 'Automatically schedule meetings based on participant availability and send calendar invites.',
    category: 'productivity',
    subcategory: 'scheduling',
    author: 'System',
    authorType: 'official',
    tags: ['meetings', 'calendar', 'scheduling', 'productivity'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Meeting Request',
            properties: {
              path: '/schedule-meeting',
              methods: ['POST']
            }
          }
        },
        {
          id: 'calendar-1',
          type: 'google_calendar',
          position: { x: 300, y: 200 },
          data: {
            label: 'Check Availability',
            properties: {
              operation: 'freebusy',
              attendees: '={{$input.attendees}}'
            },
            credentials: ['googleCalendarApi']
          }
        },
        {
          id: 'find-slot',
          type: 'code_javascript',
          position: { x: 500, y: 200 },
          data: {
            label: 'Find Time Slot',
            properties: {
              code: `// Find next available slot for all attendees
const slots = availability.filter(slot =>
  slot.attendees.every(a => a.available)
);

return [{
  suggestedTime: slots[0]?.start,
  duration: input.duration || 30
}];`
            }
          }
        },
        {
          id: 'calendar-2',
          type: 'google_calendar',
          position: { x: 700, y: 200 },
          data: {
            label: 'Create Event',
            properties: {
              operation: 'createEvent',
              summary: '={{$input.subject}}',
              start: '={{$node["find-slot"].json.suggestedTime}}',
              duration: '={{$node["find-slot"].json.duration}}',
              attendees: '={{$input.attendees}}'
            },
            credentials: ['googleCalendarApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'calendar-1' },
        { id: 'e2', source: 'calendar-1', target: 'find-slot' },
        { id: 'e3', source: 'find-slot', target: 'calendar-2' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date(),
    downloads: 532,
    rating: 4.4,
    reviewCount: 58,
    featured: false,
    requiredIntegrations: ['webhook_trigger', 'google_calendar', 'code_javascript'],
    requiredCredentials: ['googleCalendarApi'],
    estimatedSetupTime: 20,
    documentation: {
      overview: 'Intelligent meeting scheduling based on availability.',
      setup: [],
      usage: 'Send meeting request via webhook with attendees and subject.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'task-assignment-automation',
    name: 'Task Assignment Automation',
    description: 'Automatically assign tasks to team members based on workload, skills, and availability.',
    category: 'productivity',
    subcategory: 'task_management',
    author: 'System',
    authorType: 'official',
    tags: ['tasks', 'assignment', 'workload', 'team', 'productivity'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'asana_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'New Task',
            properties: {
              event: 'task_created',
              project: 'unassigned'
            },
            credentials: ['asanaApi']
          }
        },
        {
          id: 'analyze-1',
          type: 'code_javascript',
          position: { x: 300, y: 200 },
          data: {
            label: 'Analyze Task',
            properties: {
              code: `// Extract task requirements
const skills = [];
const taskName = task.name.toLowerCase();

if (taskName.includes('design')) skills.push('design');
if (taskName.includes('code') || taskName.includes('development')) skills.push('development');
if (taskName.includes('write') || taskName.includes('content')) skills.push('writing');

return [{...task, requiredSkills: skills}];`
            }
          }
        },
        {
          id: 'get-team',
          type: 'asana',
          position: { x: 500, y: 200 },
          data: {
            label: 'Get Team Members',
            properties: {
              operation: 'getTeamMembers',
              teamId: '={{$input.teamId}}'
            },
            credentials: ['asanaApi']
          }
        },
        {
          id: 'assign-1',
          type: 'code_javascript',
          position: { x: 700, y: 200 },
          data: {
            label: 'Select Assignee',
            properties: {
              code: `// Find best assignee based on skills and workload
const suitable = members.filter(m =>
  task.requiredSkills.every(skill => m.skills.includes(skill))
);

// Sort by current workload
suitable.sort((a, b) => a.currentTasks - b.currentTasks);

return [{assignee: suitable[0]?.id}];`
            }
          }
        },
        {
          id: 'asana-1',
          type: 'asana',
          position: { x: 900, y: 200 },
          data: {
            label: 'Assign Task',
            properties: {
              operation: 'updateTask',
              taskId: '={{$input.id}}',
              assignee: '={{$node["assign-1"].json.assignee}}'
            },
            credentials: ['asanaApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'analyze-1' },
        { id: 'e2', source: 'analyze-1', target: 'get-team' },
        { id: 'e3', source: 'get-team', target: 'assign-1' },
        { id: 'e4', source: 'assign-1', target: 'asana-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date(),
    downloads: 421,
    rating: 4.3,
    reviewCount: 45,
    featured: false,
    requiredIntegrations: ['asana_trigger', 'code_javascript', 'asana'],
    requiredCredentials: ['asanaApi'],
    estimatedSetupTime: 25,
    documentation: {
      overview: 'Intelligent task assignment based on skills and workload.',
      setup: [],
      usage: 'Automatically assigns new tasks in Asana.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'internal-knowledge-base-chat',
    name: 'Internal Knowledge Base Chat',
    description: 'AI-powered internal chatbot that answers employee questions from your knowledge base.',
    category: 'productivity',
    subcategory: 'knowledge',
    author: 'System',
    authorType: 'official',
    tags: ['chat', 'ai', 'knowledge', 'internal', 'hr'],
    difficulty: 'advanced',
    workflow: {
      nodes: [
        {
          id: 'chat-1',
          type: 'chatTrigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Knowledge Chat',
            properties: {
              title: 'Ask HR',
              streaming: true,
              memory: true,
              memoryType: 'vector'
            }
          }
        },
        {
          id: 'vector-1',
          type: 'vectorstore',
          position: { x: 300, y: 200 },
          data: {
            label: 'Search Knowledge',
            properties: {
              operation: 'search',
              query: '={{$input.message}}',
              topK: 5
            },
            credentials: ['pineconeApi']
          }
        },
        {
          id: 'ai-1',
          type: 'openai',
          position: { x: 500, y: 200 },
          data: {
            label: 'Generate Answer',
            properties: {
              model: 'gpt-4',
              systemPrompt: 'Answer based on context: {{$node["vector-1"].json.results}}',
              userMessage: '={{$input.message}}'
            },
            credentials: ['openaiApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'chat-1', target: 'vector-1' },
        { id: 'e2', source: 'vector-1', target: 'ai-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-07'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.7,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['chatTrigger', 'vectorstore', 'openai'],
    requiredCredentials: ['pineconeApi', 'openaiApi'],
    estimatedSetupTime: 30,
    documentation: {
      overview: 'RAG-powered internal knowledge chatbot.',
      setup: [],
      usage: 'Deploy on internal portal.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'ai-document-summarizer',
    name: 'AI Document Summarizer',
    description: 'Automatically summarize documents, extract key points, and create action items.',
    category: 'productivity',
    subcategory: 'documents',
    author: 'System',
    authorType: 'official',
    tags: ['ai', 'documents', 'summary', 'extraction', 'pdf'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'email_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Document Email',
            properties: {
              folder: 'Documents',
              hasAttachments: true
            }
          }
        },
        {
          id: 'pdf-1',
          type: 'pdfreader',
          position: { x: 300, y: 200 },
          data: {
            label: 'Extract Text',
            properties: {
              operation: 'extractText'
            }
          }
        },
        {
          id: 'ai-1',
          type: 'anthropic',
          position: { x: 500, y: 200 },
          data: {
            label: 'Summarize',
            properties: {
              model: 'claude-3-opus',
              prompt: 'Summarize this document and extract action items: {{$node["pdf-1"].json.text}}'
            },
            credentials: ['anthropicApi']
          }
        },
        {
          id: 'notion-1',
          type: 'notion',
          position: { x: 700, y: 200 },
          data: {
            label: 'Create Summary',
            properties: {
              operation: 'createPage',
              parent: 'summaries-db',
              content: '={{$node["ai-1"].json.summary}}'
            },
            credentials: ['notionApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'pdf-1' },
        { id: 'e2', source: 'pdf-1', target: 'ai-1' },
        { id: 'e3', source: 'ai-1', target: 'notion-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-10'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.7,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['email_trigger', 'pdfreader', 'anthropic', 'notion'],
    requiredCredentials: ['anthropicApi', 'notionApi'],
    estimatedSetupTime: 15,
    documentation: {
      overview: 'AI-powered document summarization.',
      setup: [],
      usage: 'Forward documents via email.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'sprint-standup-automation',
    name: 'Sprint Standup Automation',
    description: 'Automate daily standup collection and summarization for agile teams.',
    category: 'productivity',
    subcategory: 'agile',
    author: 'System',
    authorType: 'official',
    tags: ['agile', 'standup', 'scrum', 'team', 'productivity'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'schedule_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Daily 9AM',
            properties: {
              cron: '0 9 * * 1-5'
            }
          }
        },
        {
          id: 'slack-1',
          type: 'slack',
          position: { x: 300, y: 200 },
          data: {
            label: 'Post Standup Prompt',
            properties: {
              channel: '#team-standup',
              text: 'Good morning! Please share your standup:\n1. What did you do yesterday?\n2. What will you do today?\n3. Any blockers?'
            },
            credentials: ['slackApi']
          }
        },
        {
          id: 'delay-1',
          type: 'delay',
          position: { x: 500, y: 200 },
          data: {
            label: 'Wait 2 Hours',
            properties: {
              delayType: 'fixed',
              duration: 7200
            }
          }
        },
        {
          id: 'slack-2',
          type: 'slack',
          position: { x: 700, y: 200 },
          data: {
            label: 'Collect Responses',
            properties: {
              operation: 'getMessages',
              channel: '#team-standup',
              since: '={{$now.minus({hours: 2})}}'
            },
            credentials: ['slackApi']
          }
        },
        {
          id: 'ai-1',
          type: 'openai',
          position: { x: 900, y: 200 },
          data: {
            label: 'Summarize',
            properties: {
              model: 'gpt-4',
              prompt: 'Summarize these standup updates: {{$node["slack-2"].json.messages}}'
            },
            credentials: ['openaiApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'slack-1' },
        { id: 'e2', source: 'slack-1', target: 'delay-1' },
        { id: 'e3', source: 'delay-1', target: 'slack-2' },
        { id: 'e4', source: 'slack-2', target: 'ai-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-23'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.7,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'slack', 'delay', 'openai'],
    requiredCredentials: ['slackApi', 'openaiApi'],
    estimatedSetupTime: 15,
    documentation: {
      overview: 'Automated standup collection.',
      setup: [],
      usage: 'Runs automatically on weekdays.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'file-sync-workflow',
    name: 'File Sync Workflow',
    description: 'Synchronize files between multiple cloud storage providers.',
    category: 'productivity',
    subcategory: 'files',
    author: 'System',
    authorType: 'official',
    tags: ['sync', 'files', 'storage', 'cloud', 'backup'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'googleDrive_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'New File',
            properties: {
              folder: 'Sync',
              event: 'file_created'
            },
            credentials: ['googleDriveApi']
          }
        },
        {
          id: 'download-1',
          type: 'googleDrive',
          position: { x: 300, y: 200 },
          data: {
            label: 'Download File',
            properties: {
              operation: 'download',
              fileId: '={{$input.fileId}}'
            },
            credentials: ['googleDriveApi']
          }
        },
        {
          id: 'dropbox-1',
          type: 'dropbox',
          position: { x: 500, y: 150 },
          data: {
            label: 'Upload to Dropbox',
            properties: {
              operation: 'upload',
              path: '/Sync/{{$input.fileName}}'
            },
            credentials: ['dropboxApi']
          }
        },
        {
          id: 's3-1',
          type: 'awsS3',
          position: { x: 500, y: 250 },
          data: {
            label: 'Upload to S3',
            properties: {
              operation: 'upload',
              bucket: 'sync-backup',
              key: '={{$input.fileName}}'
            },
            credentials: ['awsApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'download-1' },
        { id: 'e2', source: 'download-1', target: 'dropbox-1' },
        { id: 'e3', source: 'download-1', target: 's3-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-28'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.5,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['googleDrive_trigger', 'googleDrive', 'dropbox', 'awsS3'],
    requiredCredentials: ['googleDriveApi', 'dropboxApi', 'awsApi'],
    estimatedSetupTime: 15,
    documentation: {
      overview: 'Multi-cloud file synchronization.',
      setup: [],
      usage: 'Add files to Google Drive Sync folder.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'meeting-scheduler',
    name: 'Smart Meeting Scheduler',
    description: 'Find optimal meeting times based on attendee availability.',
    category: 'productivity',
    subcategory: 'scheduling',
    author: 'System',
    authorType: 'official',
    tags: ['meetings', 'calendar', 'scheduling', 'automation'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'formTrigger', position: { x: 100, y: 200 }, data: { label: 'Meeting Request', properties: { fields: ['title', 'attendees', 'duration', 'preferredTimes'] } } },
        { id: 'calendar-1', type: 'googleCalendar', position: { x: 300, y: 200 }, data: { label: 'Check Availability', properties: { operation: 'freeBusy' }, credentials: ['googleCalendarApi'] } },
        { id: 'code-1', type: 'code', position: { x: 500, y: 200 }, data: { label: 'Find Best Time', properties: { code: '// Find optimal slot' } } },
        { id: 'calendar-2', type: 'googleCalendar', position: { x: 700, y: 200 }, data: { label: 'Create Meeting', properties: { operation: 'createEvent' }, credentials: ['googleCalendarApi'] } },
        { id: 'email-1', type: 'sendgrid', position: { x: 900, y: 200 }, data: { label: 'Send Invites', properties: { templateId: 'meeting-invite' }, credentials: ['sendgridApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'calendar-1' },
        { id: 'e2', source: 'calendar-1', target: 'code-1' },
        { id: 'e3', source: 'code-1', target: 'calendar-2' },
        { id: 'e4', source: 'calendar-2', target: 'email-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-08-08'), updatedAt: new Date(), downloads: 0, rating: 4.7, reviewCount: 0, featured: true,
    requiredIntegrations: ['formTrigger', 'googleCalendar', 'code', 'sendgrid'], requiredCredentials: ['googleCalendarApi', 'sendgridApi'], estimatedSetupTime: 30,
    documentation: { overview: 'Smart meeting scheduling.', setup: [], usage: 'Submit meeting requests.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'task-delegation',
    name: 'Task Delegation Workflow',
    description: 'Automatically delegate and track tasks across team members.',
    category: 'productivity',
    subcategory: 'tasks',
    author: 'System',
    authorType: 'official',
    tags: ['tasks', 'delegation', 'automation', 'asana'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'asana_trigger', position: { x: 100, y: 200 }, data: { label: 'New Task', properties: { event: 'task.created' }, credentials: ['asanaApi'] } },
        { id: 'code-1', type: 'code', position: { x: 300, y: 200 }, data: { label: 'Assign Owner', properties: { code: '// Round-robin assignment' } } },
        { id: 'asana-1', type: 'asana', position: { x: 500, y: 200 }, data: { label: 'Update Task', properties: { operation: 'updateTask' }, credentials: ['asanaApi'] } },
        { id: 'slack-1', type: 'slack', position: { x: 700, y: 200 }, data: { label: 'Notify Assignee', properties: { channel: '@assignee' }, credentials: ['slackApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'code-1' },
        { id: 'e2', source: 'code-1', target: 'asana-1' },
        { id: 'e3', source: 'asana-1', target: 'slack-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-08-09'), updatedAt: new Date(), downloads: 0, rating: 4.6, reviewCount: 0, featured: false,
    requiredIntegrations: ['asana_trigger', 'code', 'asana', 'slack'], requiredCredentials: ['asanaApi', 'slackApi'], estimatedSetupTime: 20,
    documentation: { overview: 'Automated task assignment.', setup: [], usage: 'Assigns tasks automatically.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'document-approval',
    name: 'Document Approval Workflow',
    description: 'Route documents for approval with notifications and tracking.',
    category: 'productivity',
    subcategory: 'approval',
    author: 'System',
    authorType: 'official',
    tags: ['documents', 'approval', 'workflow', 'automation'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'googleDrive_trigger', position: { x: 100, y: 200 }, data: { label: 'New Document', properties: { folder: 'Pending Approval' }, credentials: ['googleDriveApi'] } },
        { id: 'approval-1', type: 'approval', position: { x: 300, y: 200 }, data: { label: 'Manager Review', properties: { approvers: ['manager'] } } },
        { id: 'drive-approved', type: 'googleDrive', position: { x: 500, y: 100 }, data: { label: 'Move to Approved', properties: { operation: 'move', folder: 'Approved' }, credentials: ['googleDriveApi'] } },
        { id: 'drive-rejected', type: 'googleDrive', position: { x: 500, y: 300 }, data: { label: 'Move to Rejected', properties: { operation: 'move', folder: 'Rejected' }, credentials: ['googleDriveApi'] } },
        { id: 'email-1', type: 'sendgrid', position: { x: 700, y: 200 }, data: { label: 'Notify Author', properties: { templateId: 'approval-result' }, credentials: ['sendgridApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'approval-1' },
        { id: 'e2', source: 'approval-1', target: 'drive-approved', sourceHandle: 'approved' },
        { id: 'e3', source: 'approval-1', target: 'drive-rejected', sourceHandle: 'rejected' },
        { id: 'e4', source: 'drive-approved', target: 'email-1' },
        { id: 'e5', source: 'drive-rejected', target: 'email-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-08-10'), updatedAt: new Date(), downloads: 0, rating: 4.8, reviewCount: 0, featured: true,
    requiredIntegrations: ['googleDrive_trigger', 'approval', 'googleDrive', 'sendgrid'], requiredCredentials: ['googleDriveApi', 'sendgridApi'], estimatedSetupTime: 25,
    documentation: { overview: 'Document approval automation.', setup: [], usage: 'Upload to Pending Approval folder.' }, screenshots: [], customizableFields: [], pricing: 'free'
  }
];

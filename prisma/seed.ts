import { PrismaClient, Role, WorkflowStatus, ExecutionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@workflow-platform.com' },
    update: {},
    create: {
      email: 'admin@workflow-platform.com',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      emailVerified: true,
      preferences: {
        theme: 'dark',
        notifications: {
          email: true,
          browser: true,
          slack: false
        },
        workflow: {
          autoSave: true,
          gridSnap: true,
          minimap: true
        }
      }
    }
  });

  // Create demo user
  const demoPasswordHash = await bcrypt.hash('demo123', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@workflow-platform.com' },
    update: {},
    create: {
      email: 'demo@workflow-platform.com',
      firstName: 'Demo',
      lastName: 'User',
      passwordHash: demoPasswordHash,
      role: Role.USER,
      emailVerified: true,
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          browser: true,
          slack: false
        }
      }
    }
  });

  // Create demo team
  const demoTeam = await prisma.team.create({
    data: {
      name: 'Demo Team',
      description: 'A demo team for testing collaboration features',
      ownerId: adminUser.id,
      settings: {
        defaultPermissions: 'READ',
        allowGuestAccess: false
      }
    }
  });

  // Add demo user to team
  await prisma.teamMember.create({
    data: {
      teamId: demoTeam.id,
      userId: demoUser.id,
      role: 'MEMBER'
    }
  });

  // Create sample workflows
  const sampleWorkflows = [
    {
      name: 'Email Notification Workflow',
      description: 'Sends email notifications when specific conditions are met',
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Webhook Trigger',
            type: 'webhook',
            config: { method: 'POST', path: '/webhook/email-notification' }
          }
        },
        {
          id: '2',
          type: 'condition',
          position: { x: 300, y: 100 },
          data: {
            label: 'Check Priority',
            condition: 'data.priority === "high"'
          }
        },
        {
          id: '3',
          type: 'action',
          position: { x: 500, y: 100 },
          data: {
            label: 'Send Email',
            type: 'email',
            config: {
              to: '{{ data.email }}',
              subject: 'High Priority Alert',
              template: 'alert-template'
            }
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' }
      ],
      status: WorkflowStatus.ACTIVE,
      userId: adminUser.id,
      teamId: demoTeam.id
    },
    {
      name: 'Data Processing Pipeline',
      description: 'Processes CSV data and stores results in database',
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'File Upload Trigger',
            type: 'file-upload',
            config: { acceptedTypes: ['.csv'] }
          }
        },
        {
          id: '2',
          type: 'transform',
          position: { x: 300, y: 200 },
          data: {
            label: 'Parse CSV',
            type: 'csv-parser',
            config: { delimiter: ',', headers: true }
          }
        },
        {
          id: '3',
          type: 'transform',
          position: { x: 500, y: 200 },
          data: {
            label: 'Validate Data',
            type: 'data-validator',
            config: { schema: 'user-schema' }
          }
        },
        {
          id: '4',
          type: 'action',
          position: { x: 700, y: 200 },
          data: {
            label: 'Save to Database',
            type: 'database-insert',
            config: { table: 'users', batchSize: 100 }
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' }
      ],
      status: WorkflowStatus.DRAFT,
      userId: demoUser.id
    },
    {
      name: 'Social Media Automation',
      description: 'Automatically posts to multiple social media platforms',
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 300 },
          data: {
            label: 'Schedule Trigger',
            type: 'schedule',
            config: { cron: '0 9 * * 1-5' } // 9 AM on weekdays
          }
        },
        {
          id: '2',
          type: 'action',
          position: { x: 300, y: 250 },
          data: {
            label: 'Post to Twitter',
            type: 'twitter-post',
            config: { template: 'daily-update' }
          }
        },
        {
          id: '3',
          type: 'action',
          position: { x: 300, y: 350 },
          data: {
            label: 'Post to LinkedIn',
            type: 'linkedin-post',
            config: { template: 'professional-update' }
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e1-3', source: '1', target: '3' }
      ],
      status: WorkflowStatus.ACTIVE,
      userId: adminUser.id,
      schedule: {
        enabled: true,
        cron: '0 9 * * 1-5',
        timezone: 'UTC'
      }
    }
  ];

  for (const workflowData of sampleWorkflows) {
    await prisma.workflow.create({
      data: {
        ...workflowData,
        variables: {
          environment: 'development',
          retryCount: 3,
          timeout: 30000
        },
        settings: {
          notifications: {
            onSuccess: true,
            onFailure: true,
            onStart: false
          },
          execution: {
            parallel: false,
            maxConcurrency: 1
          }
        }
      }
    });
  }

  // Create sample executions
  const workflows = await prisma.workflow.findMany();
  const emailWorkflow = workflows.find(w => w.name === 'Email Notification Workflow');
  
  if (emailWorkflow) {
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: emailWorkflow.id,
        userId: adminUser.id,
        status: ExecutionStatus.SUCCESS,
        startedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        finishedAt: new Date(Date.now() - 4 * 60 * 1000), // 4 minutes ago
        duration: 60000, // 1 minute
        trigger: {
          type: 'webhook',
          data: {
            priority: 'high',
            email: 'user@example.com',
            message: 'System alert detected'
          }
        },
        input: {
          priority: 'high',
          email: 'user@example.com'
        },
        output: {
          emailSent: true,
          messageId: 'msg_123456789'
        }
      }
    });

    // Create node executions
    await prisma.nodeExecution.createMany({
      data: [
        {
          executionId: execution.id,
          nodeId: '1',
          nodeName: 'Webhook Trigger',
          nodeType: 'webhook',
          status: ExecutionStatus.SUCCESS,
          startedAt: execution.startedAt,
          finishedAt: new Date(execution.startedAt.getTime() + 1000),
          duration: 1000,
          output: {
            triggered: true,
            data: { priority: 'high', email: 'user@example.com' }
          }
        },
        {
          executionId: execution.id,
          nodeId: '2',
          nodeName: 'Check Priority',
          nodeType: 'condition',
          status: ExecutionStatus.SUCCESS,
          startedAt: new Date(execution.startedAt.getTime() + 1000),
          finishedAt: new Date(execution.startedAt.getTime() + 2000),
          duration: 1000,
          input: { priority: 'high' },
          output: { conditionMet: true }
        },
        {
          executionId: execution.id,
          nodeId: '3',
          nodeName: 'Send Email',
          nodeType: 'email',
          status: ExecutionStatus.SUCCESS,
          startedAt: new Date(execution.startedAt.getTime() + 2000),
          finishedAt: execution.finishedAt,
          duration: 58000,
          input: {
            to: 'user@example.com',
            subject: 'High Priority Alert'
          },
          output: {
            messageId: 'msg_123456789',
            sent: true
          }
        }
      ]
    });
  }

  // Create sample credentials (encrypted)
  await prisma.credential.createMany({
    data: [
      {
        userId: adminUser.id,
        name: 'Gmail SMTP',
        type: 'BASIC_AUTH',
        data: 'encrypted_gmail_credentials_here',
        description: 'Gmail SMTP credentials for email notifications'
      },
      {
        userId: adminUser.id,
        name: 'Twitter API',
        type: 'API_KEY',
        data: 'encrypted_twitter_credentials_here',
        description: 'Twitter API credentials for social media automation'
      },
      {
        userId: demoUser.id,
        name: 'Database Connection',
        type: 'DATABASE',
        data: 'encrypted_database_credentials_here',
        description: 'Production database connection'
      }
    ]
  });

  // Create sample analytics data
  const analyticsData = [];
  const now = new Date();
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    for (const workflow of workflows) {
      const executions = Math.floor(Math.random() * 20) + 5;
      const successfulRuns = Math.floor(executions * (0.8 + Math.random() * 0.15));
      const failedRuns = executions - successfulRuns;
      
      analyticsData.push({
        workflowId: workflow.id,
        date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        executions,
        successfulRuns,
        failedRuns,
        avgDuration: 30000 + Math.random() * 60000,
        totalDuration: executions * (30000 + Math.random() * 60000),
        metrics: {
          cpuUsage: Math.random() * 100,
          memoryUsage: Math.random() * 100,
          networkIO: Math.random() * 1000
        }
      });
    }
  }

  await prisma.workflowAnalytics.createMany({
    data: analyticsData
  });

  // Create sample notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: adminUser.id,
        type: 'WORKFLOW_COMPLETED',
        title: 'Workflow Completed Successfully',
        message: 'Your email notification workflow has completed successfully.',
        data: { workflowId: emailWorkflow?.id, executionId: 'exec_123' },
        priority: 'NORMAL'
      },
      {
        userId: demoUser.id,
        type: 'SYSTEM_ALERT',
        title: 'System Maintenance Scheduled',
        message: 'System maintenance is scheduled for tonight at 2 AM UTC.',
        priority: 'HIGH',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    ]
  });

  console.log('✅ Database seeding completed successfully!');
  console.log(`👤 Admin user: admin@workflow-platform.com / admin123`);
  console.log(`👤 Demo user: demo@workflow-platform.com / demo123`);
  console.log(`🔧 Created ${workflows.length} sample workflows`);
  console.log(`📊 Created analytics data for the last 30 days`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
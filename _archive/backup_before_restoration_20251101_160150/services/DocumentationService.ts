/**
 * Documentation Service
 * Manages comprehensive documentation system
 */

import { logger } from './LoggingService';
import { BaseService } from './BaseService';
import type {
  DocumentationSection,
  DocumentationType,
  DocumentationCategory,
  DocumentationSearchResult,
  DocumentationNavigation,
  DocumentationFeedback,
  DocumentationAnalytics,
  DocumentationSearchFilters,
  DocumentationService as IDocumentationService,
  DOCUMENTATION_STRUCTURE
} from '../types/documentation';

export class DocumentationService extends BaseService implements IDocumentationService {
  private sections: Map<string, DocumentationSection> = new Map();
  private searchIndex: Map<string, string[]> = new Map();
  private feedback: DocumentationFeedback[] = [];
  private analytics: DocumentationAnalytics = {
    pageViews: {},
    searchQueries: [],
    popularSections: [],
    feedbackSummary: {
      totalFeedback: 0,
      averageRating: 0,
      helpfulPercentage: 0,
      commonSuggestions: []
    },
    userEngagement: {
      averageTimeOnPage: {},
      bounceRate: {},
      scrollDepth: {}
    }
  };

  constructor() {
    super('DocumentationService', {
      enableCaching: true,
      cacheTimeoutMs: 3600000 // 1 hour
    });

    this.initializeDocumentation();
  }

  private async initializeDocumentation(): Promise<void> {
    await this.createEssentialDocumentation();
    this.buildSearchIndex();
    
    logger.info('Documentation service initialized', {
      totalSections: this.sections.size,
      searchIndexSize: this.searchIndex.size
    });
  }

  private async createEssentialDocumentation(): Promise<void> {
    // Welcome Guide
    this.registerSection({
      id: 'welcome',
      title: 'Welcome to Workflow Automation',
      description: 'Get started with the most powerful workflow automation platform',
      type: 'guide',
      category: 'getting_started',
      content: {
        markdown: `# Welcome to Workflow Automation

Welcome to the most comprehensive workflow automation platform available today! Whether you're looking to automate simple tasks or build complex business processes, our platform provides the tools and flexibility you need.

## What You Can Achieve

- **Business Process Automation**: Streamline repetitive tasks and complex workflows
- **Data Integration**: Connect and synchronize data across multiple systems
- **API Orchestration**: Chain together multiple API calls with intelligent error handling
- **Real-time Monitoring**: Track workflow performance with detailed analytics
- **Scalable Infrastructure**: Handle everything from small automations to enterprise-scale processes

## Why Choose Our Platform?

### 🚀 **Faster Setup**
- Pre-built templates for common workflows
- Drag-and-drop interface with no coding required
- One-click integrations with 400+ popular services

### 🔧 **More Powerful**
- Advanced debugging and testing tools
- Visual data mapping between services
- Conditional logic and complex branching
- Built-in error handling and retry mechanisms

### 🛡️ **Enterprise Ready**
- End-to-end encryption for sensitive data
- Role-based access control (RBAC)
- Audit logs and compliance features
- High availability and disaster recovery

## Getting Started

1. **Take the Interactive Tour**: Learn the basics with our guided onboarding
2. **Explore Templates**: Browse our library of pre-built workflows
3. **Build Your First Workflow**: Follow our step-by-step tutorial
4. **Join the Community**: Connect with other automation experts

Ready to begin? Let's start with the [Quick Start Guide](/docs/quick-start)!`,
        sections: [
          {
            id: 'what-you-can-achieve',
            title: 'What You Can Achieve',
            level: 2,
            content: 'Overview of platform capabilities',
            anchor: 'what-you-can-achieve'
          },
          {
            id: 'why-choose',
            title: 'Why Choose Our Platform?',
            level: 2,
            content: 'Key differentiators and benefits',
            anchor: 'why-choose'
          },
          {
            id: 'getting-started-steps',
            title: 'Getting Started',
            level: 2,
            content: 'First steps to take',
            anchor: 'getting-started-steps'
          }
        ],
        screenshots: ['/docs/images/welcome-dashboard.png', '/docs/images/workflow-builder.png'],
        videos: [
          {
            id: 'platform-overview',
            title: 'Platform Overview',
            description: 'A comprehensive walkthrough of the platform features',
            url: '/docs/videos/platform-overview.mp4',
            duration: 240,
            thumbnail: '/docs/images/platform-overview-thumb.jpg',
            chapters: [
              { title: 'Introduction', startTime: 0 },
              { title: 'Workflow Builder', startTime: 60 },
              { title: 'Templates', startTime: 120 },
              { title: 'Integrations', startTime: 180 }
            ]
          }
        ]
      },
      metadata: {
        author: 'Platform Team',
        difficulty: 'beginner',
        estimatedReadTime: 5,
        tags: ['welcome', 'getting-started', 'overview'],
        targetAudience: ['business_user', 'developer', 'admin'],
        featured: true,
        popular: true
      },
      searchTerms: ['welcome', 'getting started', 'introduction', 'overview', 'automation', 'workflow'],
      relatedSections: ['quick-start', 'first-workflow', 'concepts'],
      lastUpdated: new Date(),
      version: '1.0.0'
    });

    // Quick Start Guide
    this.registerSection({
      id: 'quick-start',
      title: 'Quick Start Guide',
      description: 'Get up and running in 5 minutes',
      type: 'tutorial',
      category: 'getting_started',
      content: {
        markdown: `# Quick Start Guide

Get your first workflow running in just 5 minutes! This guide will walk you through creating a simple email notification workflow.

## Prerequisites

- Active account on the platform
- Basic understanding of workflows (see [Core Concepts](/docs/concepts))
- Email service credentials (Gmail, SendGrid, etc.)

## Step 1: Create a New Workflow

1. Click the **"+ New Workflow"** button in the dashboard
2. Choose **"Start from Scratch"** or select the **"Email Notification"** template
3. Give your workflow a name: "My First Notification"

## Step 2: Add a Trigger

Every workflow needs a trigger - an event that starts the automation.

1. Drag the **"Webhook"** node from the Triggers panel
2. Configure the webhook:
   - Set path to \`/my-first-webhook\`
   - Allow POST method
   - Copy the generated webhook URL for later use

## Step 3: Add an Email Action

1. Drag the **"Email"** node from the Actions panel
2. Connect it to the webhook trigger
3. Configure the email:
   - **To**: Your email address
   - **Subject**: "Workflow Test - {{$json.subject}}"
   - **Body**: "Hello! This is a test from my workflow. Data: {{$json.message}}"

## Step 4: Test Your Workflow

1. Click the **"Test"** button
2. Use the test panel to send sample data:
   \`\`\`json
   {
     "subject": "Test Subject",
     "message": "Hello from workflow!"
   }
   \`\`\`
3. Check your email inbox for the message

## Step 5: Activate and Use

1. Click **"Activate"** to make your workflow live
2. Test the webhook URL with a tool like Postman or curl:
   \`\`\`bash
   curl -X POST https://your-webhook-url.com/my-first-webhook \\
     -H "Content-Type: application/json" \\
     -d '{"subject": "Production Test", "message": "Workflow is live!"}'
   \`\`\`

## What's Next?

🎉 **Congratulations!** You've created your first workflow. Here are some next steps:

- **Explore Templates**: Browse our [template library](/docs/templates) for ready-made workflows
- **Learn Advanced Features**: Check out [conditional logic](/docs/conditional-logic) and [data transformation](/docs/data-flow)
- **Add More Integrations**: Connect to popular services like Slack, Google Sheets, or Salesforce
- **Monitor Performance**: Use the [analytics dashboard](/docs/analytics) to track your workflows

## Troubleshooting

**Webhook not triggering?**
- Check that the URL is correct and accessible
- Verify the HTTP method matches your configuration
- Look at the execution logs for error messages

**Email not sending?**
- Verify your email service credentials
- Check spam folder
- Review email service logs for delivery status

Need more help? Check our [troubleshooting guide](/docs/troubleshooting) or [contact support](/support).`,
        sections: [
          {
            id: 'prerequisites',
            title: 'Prerequisites',
            level: 2,
            content: 'What you need before starting',
            anchor: 'prerequisites'
          },
          {
            id: 'create-workflow',
            title: 'Step 1: Create a New Workflow',
            level: 2,
            content: 'Setting up your first workflow',
            anchor: 'create-workflow'
          }
        ],
        codeExamples: [
          {
            id: 'webhook-test',
            title: 'Test Webhook with cURL',
            description: 'Example of how to test your webhook endpoint',
            language: 'bash',
            code: `curl -X POST https://your-webhook-url.com/my-first-webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "subject": "Production Test",
    "message": "Workflow is live!"
  }'`,
            context: 'workflow'
          },
          {
            id: 'test-data',
            title: 'Sample Test Data',
            description: 'JSON data to use when testing your workflow',
            language: 'json',
            code: `{
  "subject": "Test Subject",
  "message": "Hello from workflow!",
  "user": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "timestamp": "2024-03-15T10:30:00Z"
}`,
            context: 'workflow'
          }
        ],
        screenshots: [
          '/docs/images/new-workflow-button.png',
          '/docs/images/webhook-config.png',
          '/docs/images/email-config.png',
          '/docs/images/test-workflow.png'
        ]
      },
      metadata: {
        author: 'Platform Team',
        difficulty: 'beginner',
        estimatedReadTime: 8,
        tags: ['quick-start', 'tutorial', 'webhook', 'email', 'first-workflow'],
        prerequisites: ['welcome'],
        targetAudience: ['business_user', 'developer'],
        featured: true,
        popular: true
      },
      searchTerms: ['quick start', 'tutorial', 'first workflow', 'webhook', 'email', 'beginner'],
      relatedSections: ['first-workflow', 'webhook-integrations', 'testing'],
      lastUpdated: new Date(),
      version: '1.2.0'
    });

    // Core Concepts
    this.registerSection({
      id: 'concepts',
      title: 'Core Concepts',
      description: 'Understand the fundamental concepts of workflow automation',
      type: 'guide',
      category: 'getting_started',
      content: {
        markdown: `# Core Concepts

Understanding these fundamental concepts will help you build more effective and reliable workflows.

## Workflows

A **workflow** is a series of connected steps (nodes) that automate a business process. Workflows are triggered by events and execute a sequence of actions to achieve a desired outcome.

### Workflow Components

- **Trigger Nodes**: Start the workflow when specific events occur
- **Action Nodes**: Perform operations like sending emails, updating databases, or calling APIs
- **Logic Nodes**: Add conditional logic, loops, and data transformation
- **Utility Nodes**: Provide helper functions like delays, error handling, and data formatting

## Nodes

**Nodes** are the building blocks of workflows. Each node represents a single operation or action.

### Node Types

1. **Trigger Nodes** 🟢
   - Start workflows automatically
   - Examples: Webhook, Schedule, File Watcher, Email Received

2. **Action Nodes** 🔵
   - Perform specific operations
   - Examples: Send Email, Update Database, Call API, Create File

3. **Logic Nodes** 🟡
   - Control workflow flow
   - Examples: If/Else, Switch, Loop, Merge

4. **Utility Nodes** 🟣
   - Helper functions
   - Examples: Delay, Transform Data, Generate ID, Format Date

### Node Configuration

Each node has:
- **Input/Output Connections**: Define data flow between nodes
- **Properties**: Configurable settings specific to the node
- **Credentials**: Authentication information for external services
- **Error Handling**: How the node responds to failures

## Data Flow

Data flows through workflows from node to node. Understanding data flow is crucial for building effective workflows.

### Data Structure

Data in workflows is typically structured as JSON objects:

\`\`\`json
{
  "id": "12345",
  "name": "John Doe",
  "email": "john@example.com",
  "metadata": {
    "source": "website",
    "timestamp": "2024-03-15T10:30:00Z"
  }
}
\`\`\`

### Data Transformation

Use expressions to transform data between nodes:

- **Simple Reference**: \`{{$json.name}}\` gets the name field
- **Complex Expression**: \`{{$json.name.toUpperCase()}}\` converts name to uppercase
- **Conditional**: \`{{$json.age >= 18 ? 'Adult' : 'Minor'}}\` conditional logic

## Executions

An **execution** is a single run of a workflow. Each execution has:

- **Unique ID**: For tracking and debugging
- **Status**: Success, Error, or Running
- **Input Data**: Data that triggered the workflow
- **Output Data**: Results from each node
- **Execution Time**: When it started and ended
- **Logs**: Detailed information about each step

### Execution Context

Each execution maintains context including:
- Variables set during the workflow
- Results from previous nodes
- Error information
- Metadata about the execution environment

## Error Handling

Robust workflows include comprehensive error handling:

### Error Types

1. **Node Errors**: Issues with specific node execution
2. **Connection Errors**: Problems connecting to external services
3. **Data Errors**: Invalid or missing data
4. **Timeout Errors**: Operations that take too long

### Error Handling Strategies

- **Retry Logic**: Automatically retry failed operations
- **Alternative Paths**: Route to different nodes on error
- **Error Notifications**: Alert administrators of failures
- **Graceful Degradation**: Continue with reduced functionality

## Best Practices

### Workflow Design

1. **Start Simple**: Begin with basic workflows and add complexity gradually
2. **Use Templates**: Leverage pre-built templates when possible
3. **Plan Data Flow**: Map out how data moves through your workflow
4. **Handle Errors**: Always include error handling for external dependencies

### Performance

1. **Minimize API Calls**: Batch operations when possible
2. **Use Caching**: Store frequently accessed data
3. **Optimize Loops**: Avoid infinite loops and large iterations
4. **Monitor Resource Usage**: Track execution time and memory

### Security

1. **Secure Credentials**: Never hardcode sensitive information
2. **Validate Input**: Always validate data from external sources
3. **Use HTTPS**: Ensure secure communication
4. **Regular Updates**: Keep integrations and credentials current

### Testing

1. **Test Frequently**: Test workflows during development
2. **Use Test Data**: Create realistic test scenarios
3. **Monitor Production**: Watch for issues in live workflows
4. **Version Control**: Track changes to workflows over time

## Next Steps

Now that you understand the core concepts, you're ready to:

- [Build your first workflow](/docs/first-workflow)
- [Explore the workflow editor](/docs/workflow-editor)
- [Learn about expressions](/docs/expressions)
- [Browse integration options](/docs/integrations)`,
        sections: [
          {
            id: 'workflows',
            title: 'Workflows',
            level: 2,
            content: 'Understanding workflow fundamentals',
            anchor: 'workflows'
          },
          {
            id: 'nodes',
            title: 'Nodes',
            level: 2,
            content: 'Building blocks of workflows',
            anchor: 'nodes'
          },
          {
            id: 'data-flow',
            title: 'Data Flow',
            level: 2,
            content: 'How data moves through workflows',
            anchor: 'data-flow'
          },
          {
            id: 'executions',
            title: 'Executions',
            level: 2,
            content: 'Understanding workflow runs',
            anchor: 'executions'
          },
          {
            id: 'error-handling',
            title: 'Error Handling',
            level: 2,
            content: 'Managing failures and errors',
            anchor: 'error-handling'
          },
          {
            id: 'best-practices',
            title: 'Best Practices',
            level: 2,
            content: 'Guidelines for effective workflows',
            anchor: 'best-practices'
          }
        ],
        codeExamples: [
          {
            id: 'data-structure',
            title: 'Typical Data Structure',
            description: 'Example of data structure in workflows',
            language: 'json',
            code: `{
  "id": "12345",
  "name": "John Doe",
  "email": "john@example.com",
  "metadata": {
    "source": "website",
    "timestamp": "2024-03-15T10:30:00Z"
  }
}`,
            context: 'workflow'
          },
          {
            id: 'expressions',
            title: 'Data Transformation Examples',
            description: 'Common expression patterns',
            language: 'javascript',
            code: `// Simple reference
{{$json.name}}

// Transform data
{{$json.name.toUpperCase()}}

// Conditional logic
{{$json.age >= 18 ? 'Adult' : 'Minor'}}

// Date formatting
{{$json.createdAt.toDate().format('YYYY-MM-DD')}}

// Array operations
{{$json.items.map(item => item.name)}}`,
            context: 'workflow'
          }
        ]
      },
      metadata: {
        author: 'Platform Team',
        difficulty: 'beginner',
        estimatedReadTime: 12,
        tags: ['concepts', 'fundamentals', 'workflows', 'nodes', 'data-flow'],
        targetAudience: ['business_user', 'developer', 'admin'],
        featured: true,
        popular: true
      },
      searchTerms: ['concepts', 'fundamentals', 'workflows', 'nodes', 'data flow', 'executions', 'error handling'],
      relatedSections: ['quick-start', 'workflow-editor', 'expressions', 'error-handling'],
      lastUpdated: new Date(),
      version: '1.1.0'
    });

    // Node Reference
    this.registerSection({
      id: 'core-nodes',
      title: 'Core Nodes Reference',
      description: 'Complete reference for all built-in nodes',
      type: 'reference',
      category: 'node_reference',
      content: {
        markdown: `# Core Nodes Reference

This reference covers all built-in nodes available in the platform. Nodes are organized by category for easy browsing.

## Trigger Nodes

Trigger nodes start workflows when specific events occur.

### Webhook Trigger

Triggers workflow when HTTP request is received.

**Configuration:**
- **Path**: URL path for the webhook (e.g., \`/my-webhook\`)
- **Methods**: Allowed HTTP methods (GET, POST, PUT, DELETE)
- **Authentication**: Optional authentication requirements

**Output Data:**
\`\`\`json
{
  "headers": { "content-type": "application/json" },
  "body": { "user": "john", "action": "signup" },
  "query": { "source": "website" },
  "method": "POST"
}
\`\`\`

### Schedule Trigger

Triggers workflow on a schedule using cron expressions.

**Configuration:**
- **Cron Expression**: Schedule definition (e.g., \`0 9 * * *\` for daily at 9 AM)
- **Timezone**: Timezone for schedule execution

**Common Cron Patterns:**
- \`*/5 * * * *\` - Every 5 minutes
- \`0 */2 * * *\` - Every 2 hours
- \`0 9 * * 1-5\` - Weekdays at 9 AM
- \`0 0 1 * *\` - First day of each month

### File Watcher Trigger

Triggers when files are created, modified, or deleted.

**Configuration:**
- **Watch Path**: Directory to monitor
- **File Pattern**: Filter files (e.g., \`*.csv\`, \`data-*\`)
- **Events**: Which events to watch (created, modified, deleted)

## Action Nodes

Action nodes perform operations like sending emails, updating databases, or calling APIs.

### HTTP Request

Makes HTTP requests to external APIs.

**Configuration:**
- **Method**: HTTP method (GET, POST, PUT, DELETE, PATCH)
- **URL**: Target endpoint
- **Headers**: HTTP headers as JSON object
- **Body**: Request body (for POST/PUT requests)
- **Authentication**: Various auth types supported

**Example Configuration:**
\`\`\`json
{
  "method": "POST",
  "url": "https://api.example.com/users",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer {{$credentials.apiToken}}"
  },
  "body": {
    "name": "{{$json.name}}",
    "email": "{{$json.email}}"
  }
}
\`\`\`

### Email Send

Sends emails using various email services.

**Configuration:**
- **Service**: Email provider (Gmail, SendGrid, SMTP)
- **To**: Recipient email address(es)
- **Subject**: Email subject line
- **Body**: Email content (HTML or text)
- **Attachments**: Optional file attachments

**Templates:**
Use handlebars-style templates for dynamic content:
\`\`\`html
<h1>Welcome {{$json.firstName}}!</h1>
<p>Thank you for signing up on {{$json.signupDate.format('MMMM Do, YYYY')}}.</p>
\`\`\`

### Database Operations

Performs database operations (SELECT, INSERT, UPDATE, DELETE).

**Supported Databases:**
- PostgreSQL
- MySQL
- MongoDB
- SQLite
- Microsoft SQL Server

**Configuration:**
- **Operation**: Type of database operation
- **Query**: SQL query or MongoDB operation
- **Parameters**: Query parameters for safety

**Example Queries:**
\`\`\`sql
-- Insert new user
INSERT INTO users (name, email, created_at) 
VALUES ($1, $2, NOW())

-- Update user status
UPDATE users 
SET status = $1, updated_at = NOW() 
WHERE id = $2

-- Select with conditions
SELECT * FROM orders 
WHERE user_id = $1 AND status = 'pending'
\`\`\`

## Logic Nodes

Logic nodes control workflow flow with conditions, loops, and branching.

### If/Switch

Routes workflow based on conditions.

**If Node:**
- **Condition**: Boolean expression
- **True Path**: Nodes to execute if condition is true
- **False Path**: Nodes to execute if condition is false

**Switch Node:**
- **Switch Expression**: Value to evaluate
- **Cases**: Multiple conditions with corresponding paths
- **Default**: Path for unmatched cases

**Example Conditions:**
\`\`\`javascript
// Simple comparison
{{$json.age >= 18}}

// String comparison
{{$json.status === 'active'}}

// Complex condition
{{$json.orderTotal > 100 && $json.customerType === 'premium'}}
\`\`\`

### Loop

Iterates over arrays or repeats operations.

**For Each Loop:**
- **Input Array**: Array to iterate over
- **Item Variable**: Variable name for current item
- **Index Variable**: Variable name for current index

**Repeat Loop:**
- **Count**: Number of times to repeat
- **Condition**: Optional exit condition

### Merge

Combines data from multiple paths.

**Merge Types:**
- **Wait for All**: Wait for all branches to complete
- **First Result**: Use result from first completed branch
- **Append Arrays**: Combine arrays from all branches

## Utility Nodes

Utility nodes provide helper functions and data transformation.

### Code (JavaScript)

Executes custom JavaScript code.

**Available Variables:**
- \`$input\`: Input data from previous nodes
- \`$json\`: Parsed JSON data
- \`$binary\`: Binary data
- \`$env\`: Environment variables
- \`$workflow\`: Workflow information

**Security:**
- Sandboxed execution environment
- Limited access to system resources
- Timeout protection

**Example Code:**
\`\`\`javascript
// Transform user data
return users.map(user => ({
  id: user.json.id,
  fullName: \`\${user.json.firstName} \${user.json.lastName}\`,
  isActive: user.json.status === 'active',
  processedAt: new Date().toISOString()
}));
\`\`\`

### Date & Time

Date and time operations and formatting.

**Operations:**
- **Current Time**: Get current timestamp
- **Format Date**: Convert dates to specific formats
- **Date Math**: Add/subtract time periods
- **Parse Date**: Convert strings to dates
- **Timezone Conversion**: Convert between timezones

**Format Examples:**
- \`YYYY-MM-DD\` → 2024-03-15
- \`MMM Do, YYYY\` → Mar 15th, 2024
- \`HH:mm:ss\` → 14:30:45
- \`X\` → Unix timestamp

### Transform Data

Transform and manipulate data structures.

**Operations:**
- **Rename Fields**: Change field names
- **Remove Fields**: Delete unwanted fields
- **Add Fields**: Add calculated fields
- **Flatten Objects**: Convert nested objects to flat structure
- **Group Data**: Group array items by field

## Error Handling Nodes

### Try/Catch

Handles errors gracefully in workflows.

**Configuration:**
- **Try Block**: Nodes to execute
- **Catch Block**: Nodes to execute on error
- **Finally Block**: Nodes to always execute
- **Error Variable**: Variable name for error data

### Retry

Automatically retries failed operations.

**Configuration:**
- **Max Attempts**: Maximum retry attempts
- **Delay**: Time between retries
- **Backoff Strategy**: Linear, exponential, or custom
- **Retry Conditions**: When to retry vs. fail immediately

## Best Practices

### Node Selection
1. **Use Specific Nodes**: Prefer specialized nodes over generic HTTP requests
2. **Minimize Complexity**: Keep individual nodes simple and focused
3. **Plan Data Flow**: Consider data transformation needs between nodes

### Configuration
1. **Use Variables**: Store reusable values in workflow variables
2. **Secure Credentials**: Never hardcode sensitive information
3. **Validate Input**: Check data format and required fields
4. **Set Timeouts**: Prevent hanging operations

### Error Handling
1. **Expect Failures**: Plan for external service failures
2. **Provide Fallbacks**: Include alternative paths for critical workflows
3. **Log Errors**: Capture error details for debugging
4. **Monitor Performance**: Track node execution times and success rates

## Need Help?

- **Node Examples**: Check our [examples library](/docs/examples)
- **Community**: Ask questions in our [forum](/community)
- **Support**: Contact our [support team](/support)
- **Custom Nodes**: Learn to [create custom nodes](/docs/custom-nodes)`,
        sections: [
          {
            id: 'trigger-nodes',
            title: 'Trigger Nodes',
            level: 2,
            content: 'Nodes that start workflows',
            anchor: 'trigger-nodes'
          },
          {
            id: 'action-nodes',
            title: 'Action Nodes',
            level: 2,
            content: 'Nodes that perform operations',
            anchor: 'action-nodes'
          },
          {
            id: 'logic-nodes',
            title: 'Logic Nodes',
            level: 2,
            content: 'Nodes for workflow control',
            anchor: 'logic-nodes'
          },
          {
            id: 'utility-nodes',
            title: 'Utility Nodes',
            level: 2,
            content: 'Helper and transformation nodes',
            anchor: 'utility-nodes'
          }
        ],
        codeExamples: [
          {
            id: 'webhook-output',
            title: 'Webhook Output Data',
            description: 'Example of data from webhook trigger',
            language: 'json',
            code: `{
  "headers": { "content-type": "application/json" },
  "body": { "user": "john", "action": "signup" },
  "query": { "source": "website" },
  "method": "POST"
}`,
            context: 'node'
          },
          {
            id: 'javascript-transform',
            title: 'JavaScript Data Transformation',
            description: 'Example of transforming user data with code node',
            language: 'javascript',
            code: `// Transform user data
return users.map(user => ({
  id: user.json.id,
  fullName: \`\${user.json.firstName} \${user.json.lastName}\`,
  isActive: user.json.status === 'active',
  processedAt: new Date().toISOString()
}));`,
            context: 'node'
          }
        ]
      },
      metadata: {
        author: 'Platform Team',
        difficulty: 'intermediate',
        estimatedReadTime: 20,
        tags: ['nodes', 'reference', 'triggers', 'actions', 'logic', 'utilities'],
        targetAudience: ['developer', 'business_user'],
        featured: false,
        popular: true
      },
      searchTerms: ['nodes', 'reference', 'triggers', 'actions', 'webhook', 'email', 'database', 'javascript'],
      relatedSections: ['quick-start', 'expressions', 'integrations'],
      lastUpdated: new Date(),
      version: '2.1.0'
    });
  }

  private registerSection(section: DocumentationSection): void {
    this.sections.set(section.id, section);
    logger.info('Documentation section registered', { sectionId: section.id });
  }

  private buildSearchIndex(): void {
    this.sections.forEach((section, id) => {
        ...section.searchTerms,
        section.title.toLowerCase(),
        section.description.toLowerCase(),
        ...section.metadata.tags,
        section.content.markdown.toLowerCase()
      ];
      
      this.searchIndex.set(id, searchTerms);
    });
  }

  public getSection(id: string): DocumentationSection | undefined {
    return this.sections.get(id);
  }

  public getSectionsByCategory(category: DocumentationCategory): DocumentationSection[] {
    return Array.from(this.sections.values()).filter(
      section => section.category === category
    );
  }

  public search(query: string, filters?: DocumentationSearchFilters): DocumentationSearchResult[] {
    const results: DocumentationSearchResult[] = [];

    this.sections.forEach((section, id) => {
      // Apply filters
      if (filters) {
        if (filters.category && section.category !== filters.category) return;
        if (filters.type && section.type !== filters.type) return;
        if (filters.difficulty && section.metadata.difficulty !== filters.difficulty) return;
        if (filters.tags?.length && !filters.tags.some(tag => section.metadata.tags.includes(tag))) return;
      }

      const matchedTerms: string[] = [];
      const matchedContent: string[] = [];

      // Search in terms
      searchTerms.forEach(term => {
        if (term.includes(lowerQuery)) {
          matchedTerms.push(term);
          // Exact match gets higher score
          relevanceScore += term === lowerQuery ? 10 : 5;
        }
      });

      // Search in title (higher weight)
      if (section.title.toLowerCase().includes(lowerQuery)) {
        relevanceScore += 15;
        matchedContent.push(section.title);
      }

      // Search in description
      if (section.description.toLowerCase().includes(lowerQuery)) {
        relevanceScore += 8;
        matchedContent.push(section.description);
      }

      // Search in content
      if (section.content.markdown.toLowerCase().includes(lowerQuery)) {
        relevanceScore += 3;
        matchedContent.push('content');
      }

      if (relevanceScore > 0) {
        results.push({
          section,
          relevanceScore,
          matchedTerms,
          matchedContent,
          highlights: this.generateHighlights(section, lowerQuery)
        });
      }
    });

    // Sort by relevance score
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private generateHighlights(section: DocumentationSection, query: string): unknown[] {
    // Simple highlight generation - in production would be more sophisticated
    return [];
  }

  public getNavigation(): DocumentationNavigation {
    return {
      sections: DOCUMENTATION_STRUCTURE,
      quickLinks: [
        {
          title: 'Quick Start Guide',
          description: 'Get started in 5 minutes',
          path: '/docs/quick-start',
          icon: 'zap',
          category: 'essential'
        },
        {
          title: 'Template Library',
          description: 'Browse pre-built workflows',
          path: '/docs/templates',
          icon: 'template',
          category: 'popular'
        },
        {
          title: 'API Reference',
          description: 'Complete API documentation',
          path: '/docs/rest-api',
          icon: 'code',
          category: 'popular'
        },
        {
          title: 'Troubleshooting',
          description: 'Common issues and solutions',
          path: '/docs/troubleshooting',
          icon: 'help-circle',
          category: 'essential'
        }
      ],
      searchSuggestions: [
        'webhook', 'email', 'database', 'javascript', 'expressions',
        'templates', 'authentication', 'error handling', 'debugging'
      ]
    };
  }

  public async submitFeedback(feedback: DocumentationFeedback): Promise<void> {
    return this.executeOperation('submitFeedback', async () => {
      this.feedback.push(feedback);
      
      // Update analytics
      this.analytics.feedbackSummary.totalFeedback++;
      if (feedback.rating) {
        this.analytics.feedbackSummary.averageRating = 
          ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      }

      this.analytics.feedbackSummary.helpfulPercentage = 
        (helpfulFeedback / this.feedback.length) * 100;

      logger.info('Documentation feedback submitted', {
        sectionId: feedback.sectionId,
        type: feedback.type,
        rating: feedback.rating
      });
    });
  }

  public getAnalytics(): DocumentationAnalytics {
    return this.analytics;
  }

  public async generatePDF(sectionId: string): Promise<Blob> {
    return this.executeOperation('generatePDF', async () => {
      if (!section) {
        throw new Error(`Section ${sectionId} not found`);
      }

      // Mock PDF generation - in production would use proper PDF library
      return new Blob([pdfContent], { type: 'application/pdf' });
    });
  }

  public async getOfflineContent(): Promise<DocumentationSection[]> {
    return this.executeOperation('getOfflineContent', async () => {
      // Return essential sections for offline use
      return essentialSections
        .map(id => this.sections.get(id))
        .filter(Boolean) as DocumentationSection[];
    });
  }
}

// Export singleton instance
export const documentationService = new DocumentationService();
# n8n Core Features

## Node Types and Integrations

### Integration Count
- **400+ built-in integrations** (pre-configured nodes)
- **1,500+ community node packages** containing **4,000+ additional nodes**
- **900+ ready-to-use workflow templates**
- Over 500 apps that can be integrated

### Popular Built-in Integrations
- **Productivity**: Google Sheets, Notion, Gmail, Google Drive, Dropbox, OneDrive
- **Communication**: Slack, Microsoft Teams, Discord, Telegram, WhatsApp, Twilio
- **CRM/Sales**: HubSpot, Salesforce, Pipedrive
- **Databases**: MySQL, PostgreSQL, MongoDB, Redis, Elasticsearch
- **Cloud Services**: AWS, Azure, Google Cloud Platform
- **AI/ML**: OpenAI (GPT-4), Hugging Face, Cohere, Anthropic

### Node Categories
1. **Trigger Nodes** - Start workflows based on events
2. **Action Nodes** - Perform operations in external services
3. **Core Nodes** - Data transformation and flow control
4. **AI Nodes** - LLM and machine learning operations

## Workflow Execution Modes

### Regular Mode (Default)
- Single instance processes all executions
- Each workflow runs in a separate process for stability
- Suitable for small to medium workloads

### Queue Mode
- Separates workflow dispatching from execution
- Uses Redis as job queue backend
- Three components:
  - **Editor Process**: Handles UI, API, scheduling; writes jobs to Redis
  - **Redis**: Stores jobs temporarily as queue
  - **Workers**: Pull jobs from Redis and execute them
- Handles up to **220 workflow executions per second** on a single instance
- Enables horizontal scaling by adding/removing workers

### Execution Types
- **Manual Execution**: Triggered by clicking "Test Workflow" in editor
- **Production Execution**: Triggered automatically by schedules, webhooks, or events
- **Partial Execution**: Re-run specific nodes with cached data

## Trigger Types

### 1. Manual Trigger
- Start workflow by clicking button in UI
- Primarily for testing and development
- Useful for debugging without waiting for external events

### 2. Webhook Trigger
- Receive HTTP requests from external services
- Supports test and production URLs separately
- Can integrate with virtually any service via HTTP
- Used by forms, web apps, and third-party tools

### 3. Schedule Trigger (Cron)
- Run workflows at fixed intervals or specific times
- Uses cron expression syntax
- Intervals: seconds, minutes, hours, days
- Custom cron expressions for precise scheduling
- Example: `0 9 * * 1` = "at 9:00 AM every Monday"

### 4. Polling Trigger
- Periodically checks for new data
- Useful for services without webhook support
- Configurable polling intervals
- Minimum check interval: every minute (for RSS)

### 5. App-Specific Triggers
- Native triggers for specific applications
- Examples: Slack messages, Shopify orders, Trello cards
- Authenticate once, select specific events
- Available for MS Outlook, Salesforce, Slack, WhatsApp, Twilio, and more

### 6. n8n Trigger (Workflow Trigger)
- Start workflow in response to another workflow
- Enables nested workflow setups
- Parent-child workflow relationships

### Trigger Limitations
- Each workflow supports **one trigger node**
- Multiple entry points require separate workflows
- Can chain workflows using Execute Workflow node

## Data Transformation Capabilities

### Core Transformation Nodes

#### Aggregate Node
- Combines multiple items into single item
- Aggregate types: Individual Fields or All Item Data
- Use cases:
  - Combine rows into single record
  - API expects array of objects
  - Summarize/report data

#### Merge Node (Join)
- Combine data from two different sources
- Multiple merging options
- "Combine > Merge by Fields" for matching data
- Similar to SQL joins

#### Split Out Node
- Separate single item containing list into multiple items
- Break arrays into individual items

#### Split in Batches / Loop Over Items
- Break array into smaller groups
- Process step by step (simulates loops)
- Use cases:
  - API rate limits (e.g., max 100 records/request)
  - Process items one by one
  - Handle large datasets in chunks

#### Summarize Node
- Aggregate items similar to Excel pivot tables
- Statistical operations on data sets

### Additional Transformation Nodes
- **Filter**: Remove items based on conditions
- **Limit**: Remove items beyond defined maximum
- **Remove Duplicates**: Delete identical items
- **Sort**: Organize lists, generate random selection
- **Set**: Transform data within each item
- **Code**: Execute custom Python or JavaScript

## Expression System

### Basic Syntax
```
{{ your JavaScript expression here }}
```
- Available in most input fields across all nodes
- Uses Tournament templating language (n8n's custom language)
- Extended with custom methods, variables, and data transformation functions

### Key Variables

| Variable | Description |
|----------|-------------|
| `$json` | Access incoming JSON-formatted data |
| `$node` | Reference other nodes in workflow |
| `$workflow` | Workflow metadata and settings |
| `$execution` | Current execution information |
| `$now` | Current date/time |
| `$today` | Today's date |
| `$items` | All items in current node |

### Syntax Examples
```javascript
// Access nested JSON property
{{ $json['body']['city'] }}

// Reference another node's output
{{ $node["Previous Node"].json.fieldName }}
// OR (newer syntax)
{{ $('Previous Node').item.json.fieldName }}

// Date formatting with Luxon
{{ $now.format('YYYY-MM-DD') }}
```

### Built-in Libraries
- **Luxon**: Working with dates and time
- **JMESPath**: Querying JSON data

### Code Node Capabilities
- Two execution modes:
  - **Run Once for All Items**: Code executes once regardless of input items (default)
  - **Run Once for Each Item**: Code runs for every input item
- Execute Python or JavaScript code
- Complex logic and integrations
- Variable assignments using IIFE syntax
- Use npm/Python libraries (with configuration)

### Expression Features
- JavaScript execution within expressions
- IIFE (Immediately Invoked Function Expression) support
- Access to previous node outputs
- Conditional logic
- String manipulation
- Array operations
- Object property access

## AI/LLM Features (2024-2025)

### AI Integration Statistics
- **75% of workflows** now incorporate AI or LLM integrations (2024 data)

### Built-in AI Nodes
- OpenAI (GPT-4 and variants)
- Hugging Face
- Cohere
- Anthropic (Claude)
- Custom LLM endpoints via HTTP Request

### AI Capabilities
- Document summarization
- Question answering
- Multi-step agents for complex queries
- LangChain integration for modular apps
- Local LLM deployment support
- Vector database connections

### AI Workflow Features
- Choose from various models
- Control model and data flow
- Run LLMs locally for complete control
- Straightforward staging/production deployment

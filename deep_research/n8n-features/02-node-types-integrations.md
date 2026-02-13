# Node Types and Integrations

## Node Type Categories

### 1. Trigger Nodes

- Start workflows and supply initial data
- A workflow can contain multiple triggers, but only one executes per run
- Examples: Webhook, Schedule, Email triggers

### 2. Action Nodes

- Perform operations as part of workflows
- Manipulate data and trigger events in other systems
- Examples: HTTP Request, Send Email, Update Database

### 3. Core Nodes

- Provide functionality like logic, scheduling, or generic API calls
- Can be actions or triggers
- Key core nodes:
  - **Set**: Define and modify fields
  - **Function**: Run custom JavaScript/Python code
  - **IF**: Conditional branching
  - **Switch**: Multi-path routing
  - **Merge**: Combine data streams
  - **SplitInBatches**: Divide data for processing
  - **HTTP Request**: Generic API calls

### 4. Cluster Nodes

- Node groups that work together
- Root node with one or more sub-nodes
- Extends functionality of parent node

## Integration Numbers

- **1,200+ integrations** available across all categories
- **400+ pre-built integrations** with popular services
- Organized into categories: AI, Communication, Data & Storage, Developer Tools, Marketing, etc.

## Popular Built-in Integrations

### Productivity & Communication
- Google Sheets - Web-based spreadsheet
- Gmail - World's most used email service
- Slack - Team collaboration platform
- Telegram - Secure messaging (supports 200k member groups)
- Microsoft Teams

### AI & Machine Learning
- OpenAI (GPT-3, GPT-4, DALL-E, Whisper)
- Anthropic (Claude models)
- Google AI / Gemini
- Hugging Face
- Cohere
- Custom LLM endpoints via HTTP Request

### Business Applications
- Salesforce - CRM
- HubSpot - Marketing & CRM
- Shopify - E-commerce
- QuickBooks - Accounting
- Zendesk - Customer support

### Developer Tools
- GitHub
- GitLab
- Jira
- Linear
- Docker

### Databases
- PostgreSQL
- MySQL
- MongoDB
- Redis
- Elasticsearch

## Community Nodes

n8n supports custom nodes built by the community:

- **WhatsApp (WAHA)** - WhatsApp integration
- **DeepSeek AI** - Similar to OpenAI node
- **Perplexity AI** - AI search integration
- **ScrapeNinja** - Web scraping API
- **Chatdata** - Chatbot management
- Various specialized industry integrations

## AI and Code Capabilities

### Code Node Features

- Write custom transformations in JavaScript or Python
- Self-hosted instances can add npm packages
- Full programmatic control when needed

### AI Integration

- Built-in AI nodes for seamless data interaction
- Multi-step agents for content summarization
- Complex query answering
- Integration with any LLM via HTTP Request node

## Creating Custom Nodes

- Developers can build custom nodes using n8n's node API
- Publish nodes to the community for others to use
- Full documentation available for node development

## Sources

- [n8n Node Types Documentation](https://docs.n8n.io/integrations/builtin/node-types/)
- [n8n Integrations](https://n8n.io/integrations/)
- [Best n8n Nodes 2025](https://n8nnode.com/best-n8n-nodes-2025/)
- [Choose a Node Type](https://docs.n8n.io/integrations/creating-nodes/plan/node-types/)
- [Awesome n8n GitHub](https://github.com/restyler/awesome-n8n)

# Quick Start Guide
## Workflow Automation Platform - Get Started in 5 Minutes

Welcome to the Workflow Automation Platform! This guide will help you create your first workflow in just 5 minutes.

---

## 📋 Prerequisites

- **Node.js** 18+ installed
- **npm** or **yarn** package manager
- **PostgreSQL** database (for production)
- **Redis** (optional, for queue management)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourcompany/workflow-automation-platform.git
cd workflow-automation-platform
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/workflow_db"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Server
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET="your-secret-key-change-this"
SESSION_SECRET="your-session-secret"

# Optional: External Services
# SLACK_BOT_TOKEN="xoxb-your-token"
# STRIPE_SECRET_KEY="sk_test_your-key"
```

### 4. Database Setup

```bash
# Run Prisma migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

---

## 🎯 Start the Application

### Development Mode

```bash
# Start both frontend and backend
npm run dev

# Or start them separately:
npm run dev:frontend  # Port 3000
npm run dev:backend   # Port 3001
```

The application will be available at **http://localhost:3000**

---

## 📝 Create Your First Workflow

### Step 1: Open the Workflow Editor

1. Navigate to http://localhost:3000
2. Click **"New Workflow"** button
3. Enter a name (e.g., "My First Workflow")

### Step 2: Add a Trigger Node

1. Click **"Add Node"** or press `Space`
2. Select **"Schedule"** from the trigger category
3. Configure: Run every **5 minutes**
4. Click **"Save"**

### Step 3: Add an HTTP Request Node

1. Click the **"+"** button on the Schedule node
2. Select **"HTTP Request"** from actions
3. Configure:
   - **Method:** GET
   - **URL:** https://api.github.com/users/octocat
4. Click **"Save"**

### Step 4: Add a Slack Notification

1. Click the **"+"** button on the HTTP Request node
2. Select **"Slack"** from communication
3. Configure:
   - **Channel:** #general
   - **Message:** `New data: {{$json.login}}`
4. Click **"Save"**

### Step 5: Test Your Workflow

1. Click **"Execute"** button (play icon)
2. Watch the execution in real-time
3. Check results in the **"Executions"** panel

### Step 6: Activate Your Workflow

1. Toggle the **"Active"** switch
2. Your workflow now runs automatically every 5 minutes!

---

## 🔧 Core Concepts

### Nodes

**Nodes** are the building blocks of workflows. There are several types:

- **Trigger Nodes:** Start the workflow (Schedule, Webhook, etc.)
- **Action Nodes:** Perform operations (HTTP Request, Database Query, etc.)
- **Logic Nodes:** Control flow (If, Switch, etc.)
- **Data Nodes:** Transform data (Set, Filter, etc.)

### Connections

**Connections** link nodes together to define the workflow's execution path:

- **Green connections:** Success path
- **Red connections:** Error path (optional)

### Expressions

Use **expressions** to access data from previous nodes:

```javascript
// Access data from previous node
{{$json.fieldName}}

// Access node by name
{{$node["HTTP Request"].json.data}}

// JavaScript expressions
{{$json.items.length > 0 ? "Has items" : "Empty"}}
```

### Credentials

Store sensitive information securely:

1. Go to **Settings** → **Credentials**
2. Click **"Add Credential"**
3. Select the service (Slack, Stripe, etc.)
4. Enter your API keys
5. Click **"Save"**

---

## 📚 Common Workflow Patterns

### 1. API to Database

```
Schedule → HTTP Request → Database Insert → Slack Notification
```

### 2. Webhook to Email

```
Webhook → Data Processing → Email Send → Log to Database
```

### 3. Database Poll

```
Schedule → Database Query → Loop → HTTP Request → Update Database
```

### 4. Error Handling

```
HTTP Request → (Success) → Process Data
              ↓ (Error) → Log Error → Notify Team
```

---

## 🔌 Available Integrations

### Communication
- Slack, Discord, Teams, Twilio

### CRM
- Salesforce, HubSpot, Pipedrive, Airtable

### E-commerce
- Shopify, Stripe, PayPal, WooCommerce

### Project Management
- Asana, Linear, Monday.com, ClickUp, Jira

### Documentation
- Notion, Confluence

### And 45+ more...

See [Integration Guide](./INTEGRATIONS.md) for full list and setup instructions.

---

## ⚙️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Add new node |
| `Delete` | Delete selected node |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + S` | Save workflow |
| `Ctrl/Cmd + E` | Execute workflow |
| `Ctrl/Cmd + F` | Search nodes |
| `Escape` | Deselect all |

---

## 🐛 Troubleshooting

### Workflow won't start

**Problem:** Workflow shows "Inactive" status

**Solution:**
1. Check if all required credentials are configured
2. Verify trigger node configuration
3. Check error logs in **Executions** panel

### Node execution fails

**Problem:** Node shows red status

**Solution:**
1. Click the node to see error details
2. Verify credentials are valid
3. Check API rate limits
4. Review node configuration

### Database connection error

**Problem:** "Database connection failed"

**Solution:**
1. Verify `DATABASE_URL` in `.env`
2. Check PostgreSQL is running
3. Run migrations: `npm run migrate`

---

## 📖 Next Steps

### Learn More

- [Integration Setup Guide](./INTEGRATION_SETUP.md) - Detailed integration configuration
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment instructions
- [API Reference](./API_REFERENCE.md) - REST API documentation
- [Contributing Guide](../CONTRIBUTING.md) - Contribute to the project

### Example Workflows

Explore pre-built workflows in the `examples/` directory:

- **Lead Generation:** Sync leads from website to CRM
- **Customer Onboarding:** Automated welcome emails and setup
- **Data Sync:** Keep databases synchronized
- **Monitoring:** Alert on API failures

### Join the Community

- **Discord:** [Join our Discord](https://discord.gg/yourserver)
- **GitHub:** [Report issues](https://github.com/yourcompany/workflow-automation-platform/issues)
- **Docs:** [Full documentation](https://docs.yourcompany.com)

---

## 💡 Pro Tips

1. **Use Sub-workflows:** Break complex workflows into reusable sub-workflows
2. **Error Handling:** Always add error branches for critical operations
3. **Testing:** Test workflows in development before activating in production
4. **Monitoring:** Set up alerts for workflow failures
5. **Documentation:** Add descriptions to nodes for team collaboration
6. **Version Control:** Export workflows to JSON for version control

---

## 🆘 Get Help

- **Documentation:** Check our [full documentation](https://docs.yourcompany.com)
- **Community Forum:** Ask questions in our [community forum](https://community.yourcompany.com)
- **GitHub Issues:** Report bugs on [GitHub](https://github.com/yourcompany/workflow-automation-platform/issues)
- **Email Support:** support@yourcompany.com (Enterprise customers)

---

**Status:** Ready to build workflows! 🚀

**Version:** 2.0.0

**License:** MIT

---

*Made with ❤️ by the Workflow Automation Team*

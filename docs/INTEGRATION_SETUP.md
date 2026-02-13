# Integration Setup Guide
## Workflow Automation Platform - Complete Integration Configuration

This guide provides step-by-step instructions for configuring each major integration in the Workflow Automation Platform.

---

## 📋 Table of Contents

- [Communication](#communication)
  - [Slack](#slack)
  - [Discord](#discord)
  - [Microsoft Teams](#microsoft-teams)
  - [Twilio](#twilio)
- [Project Management](#project-management)
  - [Notion](#notion)
  - [Asana](#asana)
  - [Linear](#linear)
  - [Monday.com](#mondaycom)
  - [ClickUp](#clickup)
  - [Jira](#jira)
- [Payment & E-commerce](#payment--e-commerce)
  - [Stripe](#stripe)
  - [PayPal](#paypal)
  - [Shopify](#shopify)
- [CRM & Database](#crm--database)
  - [Airtable](#airtable)
  - [HubSpot](#hubspot)
  - [Salesforce](#salesforce)
- [Storage](#storage)
  - [Google Drive](#google-drive)
  - [Dropbox](#dropbox)
  - [AWS S3](#aws-s3)
- [Developer Tools](#developer-tools)
  - [GitHub](#github)
  - [Confluence](#confluence)
  - [Figma](#figma)
- [Accounting](#accounting)
  - [QuickBooks](#quickbooks)
  - [Xero](#xero)

---

## Communication

### Slack

**Use Cases:** Send messages, create channels, manage users, post to webhooks

#### Setup Steps:

1. **Create Slack App:**
   - Go to https://api.slack.com/apps
   - Click **"Create New App"** → **"From scratch"**
   - Enter app name (e.g., "Workflow Automation")
   - Select your workspace

2. **Configure Bot Permissions:**
   - Navigate to **OAuth & Permissions**
   - Add Bot Token Scopes:
     - `chat:write` - Send messages
     - `chat:write.public` - Send to public channels
     - `channels:read` - List channels
     - `users:read` - List users
     - `files:write` - Upload files
     - `reactions:write` - Add reactions

3. **Install App to Workspace:**
   - Click **"Install to Workspace"** button
   - Authorize the app
   - Copy the **Bot User OAuth Token** (starts with `xoxb-`)

4. **Optional: Incoming Webhook:**
   - Activate **Incoming Webhooks** in app settings
   - Click **"Add New Webhook to Workspace"**
   - Select channel and copy webhook URL

5. **Add to Workflow Platform:**
   - Go to **Settings** → **Credentials**
   - Select **Slack**
   - Enter:
     - **Bot Token:** `xoxb-your-token`
     - **Webhook URL:** (optional) Your webhook URL

#### Common Issues:
- **"not_in_channel" error:** Invite bot to channel: `/invite @your-bot-name`
- **"missing_scope" error:** Add required scope in OAuth & Permissions

---

### Discord

**Use Cases:** Send messages to channels, manage webhooks, bot interactions

#### Setup Steps:

1. **Create Discord Application:**
   - Go to https://discord.com/developers/applications
   - Click **"New Application"**
   - Name your application

2. **Create Bot:**
   - Navigate to **Bot** section
   - Click **"Add Bot"**
   - Copy **Bot Token** (click "Reset Token" if needed)

3. **Enable Permissions:**
   - Go to **OAuth2** → **URL Generator**
   - Select scopes: `bot`
   - Select permissions:
     - Send Messages
     - Read Message History
     - Manage Webhooks
   - Copy generated URL

4. **Invite Bot to Server:**
   - Open the generated URL in browser
   - Select your Discord server
   - Authorize

5. **Optional: Create Webhook:**
   - In Discord, go to **Server Settings** → **Integrations** → **Webhooks**
   - Click **"New Webhook"**
   - Select channel and copy webhook URL

6. **Add to Workflow Platform:**
   - Go to **Settings** → **Credentials**
   - Select **Discord**
   - Enter:
     - **Bot Token:** Your bot token
     - **Webhook URL:** (optional) Your webhook URL

---

### Twilio

**Use Cases:** Send SMS, make calls, WhatsApp messaging

#### Setup Steps:

1. **Create Twilio Account:**
   - Sign up at https://www.twilio.com/try-twilio
   - Verify your email and phone number

2. **Get Credentials:**
   - Go to Twilio Console Dashboard
   - Find **Account SID** and **Auth Token**
   - Copy both values

3. **Get Phone Number:**
   - In console, go to **Phone Numbers** → **Manage** → **Buy a Number**
   - Select country and capabilities (SMS, Voice)
   - Purchase number
   - Copy phone number (format: `+15551234567`)

4. **Optional: WhatsApp Sandbox:**
   - Go to **Messaging** → **Try it Out** → **Send a WhatsApp Message**
   - Follow instructions to join sandbox
   - Copy sandbox number

5. **Add to Workflow Platform:**
   - Go to **Settings** → **Credentials**
   - Select **Twilio**
   - Enter:
     - **Account SID:** Your account SID
     - **Auth Token:** Your auth token
     - **From Number:** Your Twilio phone number

#### Testing:
```bash
# Test SMS
curl -X POST https://api.twilio.com/2010-04-01/Accounts/YOUR_SID/Messages.json \
  --data-urlencode "To=+15555555555" \
  --data-urlencode "From=+15551234567" \
  --data-urlencode "Body=Test message" \
  -u YOUR_SID:YOUR_AUTH_TOKEN
```

---

## Project Management

### Notion

**Use Cases:** Create pages, update databases, search content

#### Setup Steps:

1. **Create Internal Integration:**
   - Go to https://www.notion.so/my-integrations
   - Click **"+ New integration"**
   - Name your integration
   - Select workspace
   - Submit

2. **Copy Integration Token:**
   - Find **Internal Integration Token**
   - Copy token (starts with `secret_`)

3. **Share Pages/Databases:**
   - Open Notion page or database
   - Click **Share** button
   - Invite your integration
   - Select appropriate permissions

4. **Get Page/Database IDs:**
   - Open page/database in browser
   - Copy ID from URL:
     - URL: `https://notion.so/My-Page-abc123def456?v=...`
     - Page ID: `abc123def456`

5. **Add to Workflow Platform:**
   - Go to **Settings** → **Credentials**
   - Select **Notion**
   - Enter:
     - **Integration Token:** Your secret token
     - **Workspace ID:** (optional) Your workspace ID

#### Common Issues:
- **"object not found" error:** Share the page/database with your integration
- **"unauthorized" error:** Token is invalid or expired

---

### Asana

**Use Cases:** Create tasks, update projects, manage teams

#### Setup Steps:

1. **Create Personal Access Token:**
   - Go to https://app.asana.com/0/my-apps
   - Click **"+ Create new token"**
   - Name your token
   - Copy token immediately (shown only once)

2. **Get Workspace GID:**
   - In Asana, open workspace settings
   - URL contains workspace GID: `https://app.asana.com/0/workspace_gid/...`
   - Or use API:
   ```bash
   curl https://app.asana.com/api/1.0/workspaces \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Add to Workflow Platform:**
   - Go to **Settings** → **Credentials**
   - Select **Asana**
   - Enter:
     - **Access Token:** Your personal access token
     - **Workspace GID:** Your workspace GID

---

### Linear

**Use Cases:** Create issues, update status, manage projects

#### Setup Steps:

1. **Create API Key:**
   - Go to https://linear.app/settings/api
   - Click **"Create new key"**
   - Name your key
   - Copy key (starts with `lin_api_`)

2. **Get Team ID:**
   - In Linear, go to team settings
   - URL contains team ID: `https://linear.app/team/team-id/...`
   - Or query via GraphQL:
   ```graphql
   query {
     teams {
       nodes {
         id
         name
       }
     }
   }
   ```

3. **Add to Workflow Platform:**
   - Go to **Settings** → **Credentials**
   - Select **Linear**
   - Enter:
     - **API Key:** Your API key
     - **Team ID:** Your team ID

---

### Airtable

**Use Cases:** Create records, update tables, query databases

#### Setup Steps:

1. **Create Personal Access Token:**
   - Go to https://airtable.com/create/tokens
   - Click **"Create new token"**
   - Name your token
   - Add scopes:
     - `data.records:read`
     - `data.records:write`
     - `schema.bases:read`
   - Add bases (or select all)
   - Create token and copy

2. **Get Base ID:**
   - Open your base in Airtable
   - URL contains base ID: `https://airtable.com/appXXXXXXXXXXXXXX/...`
   - Base ID starts with `app`

3. **Get Table Names:**
   - Table names are visible in Airtable interface
   - Use exact names (case-sensitive)

4. **Add to Workflow Platform:**
   - Go to **Settings** → **Credentials**
   - Select **Airtable**
   - Enter:
     - **Access Token:** Your personal access token (starts with `pat`)
     - **Base ID:** Your base ID (starts with `app`)

---

## Payment & E-commerce

### Stripe

**Use Cases:** Process payments, manage subscriptions, create refunds

#### Setup Steps:

1. **Get API Keys:**
   - Go to https://dashboard.stripe.com/apikeys
   - Copy **Secret key** (starts with `sk_test_` or `sk_live_`)
   - Copy **Publishable key** (starts with `pk_test_` or `pk_live_`)

2. **Setup Webhooks (Optional):**
   - Go to **Developers** → **Webhooks**
   - Click **"Add endpoint"**
   - Enter your endpoint URL: `https://your-domain.com/webhooks/stripe`
   - Select events to listen for
   - Copy **Signing secret** (starts with `whsec_`)

3. **Add to Workflow Platform:**
   - Go to **Settings** → **Credentials**
   - Select **Stripe**
   - Enter:
     - **Secret Key:** Your secret key
     - **Publishable Key:** Your publishable key
     - **Webhook Secret:** (optional) Your webhook signing secret

#### Testing with Test Mode:
- Use test card: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC
- Any postal code

---

## CRM & Database

### HubSpot

**Use Cases:** Manage contacts, deals, companies, marketing automation

#### Setup Steps:

1. **Create Private App:**
   - Go to **Settings** → **Integrations** → **Private Apps**
   - Click **"Create a private app"**
   - Name your app
   - Go to **Scopes** tab

2. **Select Scopes:**
   - Select required scopes:
     - `crm.objects.contacts.read`
     - `crm.objects.contacts.write`
     - `crm.objects.deals.read`
     - `crm.objects.deals.write`
     - `crm.objects.companies.read`
     - `crm.objects.companies.write`

3. **Generate Token:**
   - Click **"Create app"**
   - Copy **Access Token**

4. **Add to Workflow Platform:**
   - Go to **Settings** → **Credentials**
   - Select **HubSpot**
   - Enter:
     - **Access Token:** Your private app token

---

## Storage

### Google Drive

**Use Cases:** Upload files, create folders, share documents

#### Setup Steps:

1. **Create Google Cloud Project:**
   - Go to https://console.cloud.google.com
   - Create new project

2. **Enable Google Drive API:**
   - Navigate to **APIs & Services** → **Library**
   - Search for "Google Drive API"
   - Click **Enable**

3. **Create Service Account:**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **Service Account**
   - Fill in details and create
   - Click on service account
   - Go to **Keys** tab
   - Add Key → Create New Key → JSON
   - Download JSON file

4. **Share Drive with Service Account:**
   - Open Google Drive
   - Right-click folder → Share
   - Add service account email (from JSON file)
   - Grant appropriate permissions

5. **Add to Workflow Platform:**
   - Go to **Settings** → **Credentials**
   - Select **Google Drive**
   - Upload JSON key file or paste contents

---

## Developer Tools

### GitHub

**Use Cases:** Create issues, manage pull requests, access repositories

#### Setup Steps:

1. **Create Personal Access Token:**
   - Go to https://github.com/settings/tokens
   - Click **"Generate new token"** → **"Generate new token (classic)"**
   - Name your token
   - Select scopes:
     - `repo` - Full repository access
     - `admin:org` - Organization access (if needed)
     - `workflow` - GitHub Actions access (if needed)
   - Generate and copy token

2. **Add to Workflow Platform:**
   - Go to **Settings** → **Credentials**
   - Select **GitHub**
   - Enter:
     - **Personal Access Token:** Your token

---

### Jira

**Use Cases:** Create issues, update status, manage sprints

#### Setup Steps:

1. **Create API Token:**
   - Go to https://id.atlassian.com/manage/api-tokens
   - Click **"Create API token"**
   - Name your token
   - Copy token

2. **Get Jira Details:**
   - Jira domain: `your-company.atlassian.net`
   - Email: Your Atlassian account email
   - Project key: Found in project URL or settings

3. **Add to Workflow Platform:**
   - Go to **Settings** → **Credentials**
   - Select **Jira**
   - Enter:
     - **Domain:** `your-company.atlassian.net`
     - **Email:** Your email
     - **API Token:** Your token
     - **Project Key:** (optional) Default project

---

## Testing Your Integrations

### Test Workflow Template

1. **Create Test Workflow:**
   - New Workflow → Name: "Integration Test"
   - Add **Manual Trigger** node
   - Add integration node
   - Add **Set** node to capture response

2. **Execute Test:**
   - Click **Execute** button
   - Check **Executions** panel
   - Verify success/error
   - Review output data

3. **Common Test Operations:**
   - Slack: Send message to #test channel
   - Stripe: Create test payment intent ($1.00)
   - Notion: Create page in test database
   - Airtable: Create record in test table

---

## Security Best Practices

### Credential Management

1. **Never hardcode credentials** in workflows
2. **Use environment variables** for sensitive data
3. **Rotate tokens regularly** (every 90 days)
4. **Limit token scopes** to minimum required
5. **Use separate tokens** for development/production
6. **Enable 2FA** on all service accounts

### Token Storage

The platform encrypts all credentials at rest using AES-256 encryption. Credentials are:
- Encrypted before storage in database
- Decrypted only during workflow execution
- Never exposed in logs or error messages
- Accessible only to authorized users (RBAC)

---

## Troubleshooting

### Common Issues

#### Authentication Errors

**Error:** `401 Unauthorized`
- **Cause:** Invalid or expired token
- **Solution:** Regenerate token and update credentials

**Error:** `403 Forbidden`
- **Cause:** Insufficient permissions
- **Solution:** Add required scopes/permissions to token

#### API Rate Limiting

**Error:** `429 Too Many Requests`
- **Cause:** Exceeded API rate limits
- **Solution:**
  - Add delay nodes between requests
  - Implement exponential backoff
  - Use batch operations where available

#### Connection Errors

**Error:** `ECONNREFUSED` or `Network timeout`
- **Cause:** Network connectivity issues
- **Solution:**
  - Check firewall settings
  - Verify API endpoint URLs
  - Check service status pages

---

## Additional Resources

### Official Documentation

- **Slack API:** https://api.slack.com/docs
- **Stripe API:** https://stripe.com/docs/api
- **Notion API:** https://developers.notion.com
- **Asana API:** https://developers.asana.com/docs
- **Airtable API:** https://airtable.com/developers/web/api
- **Twilio API:** https://www.twilio.com/docs/usage/api

### Support

- **Community Forum:** https://community.yourcompany.com
- **GitHub Issues:** https://github.com/yourcompany/workflow-automation-platform/issues
- **Email Support:** support@yourcompany.com (Enterprise)

---

**Last Updated:** January 2025
**Platform Version:** 2.0.0

*This guide covers the most popular integrations. For additional integrations, see individual configuration panels or contact support.*

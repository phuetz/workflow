# Zapier Triggers and Actions

## Overview

A Zap is an automated workflow that connects apps and services. Each Zap consists of a trigger and one or more actions. When the Zap is turned on, it runs the action steps every time the trigger event occurs.

## Trigger Types

### 1. Polling Triggers
- Zapier periodically asks your app for new data at regular intervals
- Update intervals depend on plan:
  - Free plan: 15-minute intervals
  - Paid plans: Configurable polling frequency (1-15 minutes)
- Suitable for apps that don't support webhooks

### 2. Instant Triggers (Webhooks)
- Apps automatically send new data as events occur using webhooks
- Data is sent immediately when created in the app
- Indicated by a lightning bolt icon in the Zap editor
- Preferred for real-time automation needs

## Actions

### What Are Actions?
- An action is an event your Zap performs after the trigger event occurs
- Every action in the workflow runs whenever the Zap triggers
- Multiple actions can be added after a single trigger

### Action Types
- **Create**: Create new records (e.g., create a contact, send email)
- **Update**: Modify existing records
- **Search**: Find existing records in connected apps
- **Search or Create**: Find a record, or create one if not found

## Single-Step vs Multi-Step Zaps

### Single-Step Zaps
- One trigger + one action
- Available on all plans including Free

### Multi-Step Zaps
- One trigger + multiple actions
- Can include filters, searches, and paths
- Only available on paid plans (Professional and above)

## Built-in Zapier Tools

These tools extend Zap functionality:

1. **Filter by Zapier**: Add conditional logic to continue or stop
2. **Formatter by Zapier**: Transform data (text, dates, numbers)
3. **Delay by Zapier**: Pause workflow execution
4. **Paths by Zapier**: Create branching conditional workflows
5. **Looping by Zapier**: Iterate over arrays and line items
6. **Code by Zapier**: Run custom JavaScript or Python
7. **Webhooks by Zapier**: Send/receive HTTP requests
8. **Sub-Zap by Zapier**: Create reusable workflow components
9. **Schedule by Zapier**: Trigger workflows on a schedule
10. **Storage by Zapier**: Store and retrieve simple data

## Human-in-the-Loop Integration

- Zapier supports "Human in the Loop" triggers
- Allows workflows to pause for human approval/input
- Can trigger other Zaps when human steps complete

## Key Competitive Features

1. **8,000+ app integrations** with instant and polling triggers
2. **Instant trigger support** via webhooks for real-time automation
3. **Multi-step workflows** with unlimited actions on paid plans
4. **Built-in utility tools** for common automation needs
5. **AI Agent integration** - agents can trigger and be triggered by Zaps

## Sources

- [How Zap triggers work - Zapier](https://help.zapier.com/hc/en-us/articles/8496244568589-How-Zap-triggers-work)
- [Set up your Zap trigger - Zapier](https://help.zapier.com/hc/en-us/articles/8496288188429-Set-up-your-Zap-trigger)
- [Set up your Zap action - Zapier](https://help.zapier.com/hc/en-us/articles/8496257774221-Set-up-your-Zap-action)
- [Learn key concepts in Zaps - Zapier](https://help.zapier.com/hc/en-us/articles/8496181725453-Learn-key-concepts-in-Zaps)

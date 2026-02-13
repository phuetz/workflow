# Core Workflow Features

## Overview

n8n is an open-source, fair-code workflow automation platform that combines visual node-based workflow building with code capabilities. It is designed to connect applications and services while enabling complex automations with minimal coding through its visual interface.

## Triggers

### Trigger Types

n8n supports 6 primary trigger types:

1. **Manual Triggers** - Workflows started manually by users
2. **Time-Based (Cron) Triggers** - Scheduled execution at specific times/intervals
3. **Webhook Triggers** - Event-driven triggers from external HTTP requests
4. **App-Specific Triggers** - Native triggers from integrated applications (e.g., new email in Gmail)
5. **Polling Triggers** - Periodic checks for changes in services without webhook support
6. **Custom Event Triggers** - User-defined event-based triggers

### Key Trigger Capabilities

- Event-driven architecture supporting both real-time triggers and scheduled tasks
- Workflows can contain multiple trigger nodes, but only one executes per run
- Error triggers and fallback logic for failure handling
- Webhook triggers can receive data from any service with HTTP capability

## Actions

### Action Node Functionality

- Nodes perform tasks like pulling data from CRMs, posting to Slack, or updating Google Sheets
- Visual connection of nodes defines data flow
- Support for branching logic and multi-input handling
- Each node represents an app, service, or logical function

### Code Capabilities

- **Code Node**: Write custom transformations in JavaScript or Python
- **npm Packages**: Self-hosted instances can add npm packages for extended functionality
- **Expressions**: Dynamic parameters using JavaScript and Tournament templating language
- Support for IIFE (Immediately Invoked Function Expression) syntax for complex logic

## Flow Control

### Branching and Logic

- **IF Node**: Conditional branching based on data values
- **Switch Node**: Multi-path routing based on conditions
- **Merge Node**: Combine data from multiple branches
- **Split in Batches**: Divide data into smaller chunks for processing

### Data Flow Features

- Route data with switches and if nodes
- Create loops and merge data back together
- Remove duplicates from data streams
- Split lists into separate items
- Aggregate many items into one
- Dynamic adaptation to AI outputs

## Visual Interface

### Editor Features

- Drag-and-drop interface for intuitive workflow building
- Visual flow of data at every step for easy debugging
- Branch logic visually with IF nodes
- Merge data streams visually
- Error handling displayed in the flow

### Node-Based Architecture

- Workflows built by connecting individual nodes (like a flowchart)
- The name "n8n" is a numeronym for "nodemation"
- Each node has configurable inputs and outputs
- Visual representation of data transformation

## Deployment Options

### Self-Hosted

- Docker deployment
- Kubernetes deployment
- Direct Node.js deployment
- Full data privacy and cost control

### Cloud (n8n Cloud)

- Fully managed experience
- No infrastructure management required
- Automatic updates and maintenance

## Sources

- [n8n Features](https://n8n.io/features/)
- [What is n8n - The Ninja Studio](https://www.theninjastudio.com/blog/what-is-n8n)
- [n8n Complete Platform Overview - Latenode](https://latenode.com/blog/what-is-n8n-workflow-automation-complete-platform-overview-honest-analysis-2025)
- [Mastering n8n Guide - Medium](https://medium.com/aimonks/mastering-n8n-the-ultimate-guide-to-open-source-workflow-automation-in-2025-4d870df766a7)

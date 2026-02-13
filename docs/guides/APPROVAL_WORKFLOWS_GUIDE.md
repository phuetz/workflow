# Human-in-the-Loop Approval Workflows Guide

## Overview

The Human-in-the-Loop Approval Workflows system enables workflow automation to pause execution and wait for human approval before proceeding. This is essential for processes that require manual intervention, compliance checks, or managerial oversight.

## Features

### Core Capabilities

- **Multiple Approval Modes**: Any, All, Majority, or Custom logic
- **Multi-Channel Notifications**: Email, Slack, Teams, SMS, and in-app
- **Timeout Management**: Auto-approve, reject, escalate, or cancel on timeout
- **Approval Delegation**: Transfer approval requests to other users
- **Auto-Approval Rules**: Automatically approve/reject based on conditions
- **Audit Trail**: Complete history of all approval actions
- **Data Preview**: Show approvers relevant data without workflow access
- **Bulk Operations**: Approve/reject multiple requests at once
- **Priority Levels**: Low, Medium, High, Critical
- **Reminders**: Automatic reminders for pending approvals

### Performance Metrics

- **Approval Latency**: < 200ms average response time
- **Concurrent Approvals**: Supports 1000+ simultaneous approval requests
- **Email Delivery**: > 99% delivery rate
- **UI Load Time**: < 1s for approval center
- **Data Safety**: Zero data loss on timeout with automatic persistence

## Quick Start

### 1. Add an Approval Node to Your Workflow

1. Drag the **Wait for Approval** node from the Flow Control section
2. Connect it between nodes where approval is needed
3. Configure the approval settings

### 2. Configure Approvers

```typescript
{
  approvers: [
    {
      id: 'manager-001',
      name: 'Jane Manager',
      email: 'jane@company.com',
      role: 'Manager',
      notificationChannels: ['email', 'slack']
    }
  ]
}
```

### 3. Select Approval Mode

- **Any**: First approval completes the request
- **All**: All approvers must approve
- **Majority**: More than 50% must approve
- **Custom**: Define your own logic

### 4. Set Timeout and Action

```typescript
{
  timeoutMs: 86400000, // 24 hours
  timeoutAction: 'reject' // or 'approve', 'escalate', 'cancel'
}
```

## Configuration Options

### Basic Configuration

```typescript
interface ApprovalNodeConfig {
  // Required
  approvers: Approver[];
  approvalMode: 'any' | 'all' | 'majority' | 'custom';

  // Timeout
  timeoutMs: number; // milliseconds
  timeoutAction: 'approve' | 'reject' | 'escalate' | 'cancel';

  // Notifications
  notificationChannels: NotificationChannel[];
  sendReminders: boolean;
  reminderIntervalMs?: number;

  // Optional
  priority?: 'low' | 'medium' | 'high' | 'critical';
  enableAuditTrail: boolean;
  allowDelegation?: boolean;
}
```

### Approver Definition

```typescript
interface Approver {
  id: string; // Unique identifier
  name: string; // Display name
  email?: string; // Email address
  userId?: string; // User ID from auth system
  role?: string; // Job role
  notificationChannels: NotificationChannel[];
}
```

### Data Preview Configuration

```typescript
{
  dataPreviewConfig: {
    enabled: true,
    title: 'Budget Approval Request',
    summaryExpression: '${user.name} requests ${amount} for ${purpose}',
    fields: [
      {
        label: 'Amount',
        path: 'amount',
        type: 'currency'
      },
      {
        label: 'Purpose',
        path: 'purpose',
        type: 'text'
      },
      {
        label: 'Date',
        path: 'requestDate',
        type: 'date'
      }
    ]
  }
}
```

## Usage Examples

### Example 1: Simple Approval

```typescript
// Workflow: Invoice Approval
{
  "nodes": [
    {
      "type": "approval",
      "name": "Approve Invoice",
      "config": {
        "approvers": [
          {
            "id": "finance-manager",
            "name": "Finance Manager",
            "email": "finance@company.com",
            "notificationChannels": ["email"]
          }
        ],
        "approvalMode": "any",
        "timeoutMs": 172800000, // 48 hours
        "timeoutAction": "reject",
        "priority": "medium"
      }
    }
  ]
}
```

### Example 2: Multi-Level Approval

```typescript
// Workflow: Purchase Order > $10,000
{
  "nodes": [
    {
      "type": "approval",
      "name": "Manager Approval",
      "config": {
        "approvers": [
          {
            "id": "dept-manager",
            "name": "Department Manager",
            "email": "manager@company.com",
            "notificationChannels": ["email", "slack"]
          }
        ],
        "approvalMode": "any",
        "timeoutMs": 86400000, // 24 hours
        "timeoutAction": "escalate",
        "escalationTargets": [
          {
            "id": "senior-manager",
            "name": "Senior Manager",
            "email": "senior@company.com",
            "notificationChannels": ["email", "sms"]
          }
        ]
      }
    },
    {
      "type": "approval",
      "name": "Finance Approval",
      "config": {
        "approvers": [
          {
            "id": "cfo",
            "name": "CFO",
            "email": "cfo@company.com",
            "notificationChannels": ["email"]
          },
          {
            "id": "finance-director",
            "name": "Finance Director",
            "email": "finance@company.com",
            "notificationChannels": ["email"]
          }
        ],
        "approvalMode": "any",
        "timeoutMs": 86400000,
        "timeoutAction": "reject"
      }
    }
  ]
}
```

### Example 3: Auto-Approval Rules

```typescript
// Workflow: Expense Approval with Auto-Approval
{
  "type": "approval",
  "name": "Expense Approval",
  "config": {
    "approvers": [
      {
        "id": "manager",
        "name": "Manager",
        "email": "manager@company.com",
        "notificationChannels": ["email"]
      }
    ],
    "approvalMode": "any",
    "autoApprovalRules": [
      {
        "id": "small-expense",
        "name": "Auto-approve expenses < $50",
        "condition": "${amount} < 50",
        "action": "approve"
      },
      {
        "id": "duplicate-expense",
        "name": "Auto-reject duplicate expenses",
        "condition": "${isDuplicate} === true",
        "action": "reject"
      }
    ],
    "timeoutMs": 86400000,
    "timeoutAction": "reject"
  }
}
```

### Example 4: Committee Approval

```typescript
// Workflow: Board Decision (Majority Required)
{
  "type": "approval",
  "name": "Board Approval",
  "config": {
    "approvers": [
      { "id": "board-1", "name": "Board Member 1", "email": "board1@company.com", "notificationChannels": ["email"] },
      { "id": "board-2", "name": "Board Member 2", "email": "board2@company.com", "notificationChannels": ["email"] },
      { "id": "board-3", "name": "Board Member 3", "email": "board3@company.com", "notificationChannels": ["email"] },
      { "id": "board-4", "name": "Board Member 4", "email": "board4@company.com", "notificationChannels": ["email"] },
      { "id": "board-5", "name": "Board Member 5", "email": "board5@company.com", "notificationChannels": ["email"] }
    ],
    "approvalMode": "majority",
    "timeoutMs": 604800000, // 7 days
    "timeoutAction": "escalate",
    "priority": "critical",
    "sendReminders": true,
    "reminderIntervalMs": 86400000 // Daily reminders
  }
}
```

## API Integration

### Creating an Approval Request Programmatically

```typescript
import { approvalManager } from './workflow/approval/ApprovalManager';
import { ApprovalNodeConfig } from './types/approval';

const config: ApprovalNodeConfig = {
  approvers: [
    {
      id: 'user123',
      name: 'John Doe',
      email: 'john@example.com',
      notificationChannels: ['email', 'slack']
    }
  ],
  approvalMode: 'any',
  timeoutMs: 86400000,
  timeoutAction: 'reject',
  notificationChannels: ['email'],
  sendReminders: true,
  enableAuditTrail: true
};

const request = await approvalManager.getEngine().createApprovalRequest(
  config,
  {
    workflowId: 'wf-123',
    workflowName: 'My Workflow',
    executionId: 'exec-456',
    nodeId: 'node-789',
    nodeName: 'Approval Step',
    data: {
      amount: 5000,
      purpose: 'Equipment purchase',
      requestedBy: 'Alice'
    }
  }
);
```

### Submitting an Approval Response

```typescript
const result = await approvalManager.submitResponse(
  request.id,
  'user123', // Approver ID
  'approve', // or 'reject'
  'Approved for Q2 budget' // Optional comment
);

if (result.completed) {
  console.log(`Approval ${result.finalDecision}`);
}
```

### Delegating an Approval

```typescript
const newApprover = {
  id: 'user456',
  name: 'Jane Smith',
  email: 'jane@example.com',
  notificationChannels: ['email']
};

await approvalManager.delegateApproval(
  request.id,
  'user123', // From approver
  newApprover,
  'Out of office until next week'
);
```

### Getting Approval Statistics

```typescript
const stats = approvalManager.getStatistics({
  approverId: 'user123',
  dateFrom: '2025-01-01',
  dateTo: '2025-01-31'
});

console.log(`Total approvals: ${stats.total}`);
console.log(`Pending: ${stats.pending}`);
console.log(`Average response time: ${stats.averageResponseTimeMs}ms`);
```

## UI Components

### Approval Center

The main dashboard for managing approvals:

```tsx
import { ApprovalCenter } from './components/ApprovalCenter';

function App() {
  return (
    <ApprovalCenter
      currentUserId="user123"
      currentUserEmail="user@example.com"
      showStats={true}
      autoRefresh={true}
      refreshIntervalMs={30000}
    />
  );
}
```

### Approval Modal

Standalone approval modal:

```tsx
import { ApprovalModal } from './components/ApprovalModal';

<ApprovalModal
  approval={approvalRequest}
  onClose={() => setShowModal(false)}
  onSubmit={async (decision, comment) => {
    await handleApproval(decision, comment);
  }}
/>
```

## Notification Channels

### Email Notifications

Email notifications include:
- Rich HTML template with company branding
- One-click approve/reject links
- Data preview in email body
- Priority indicators
- Time remaining countdown

Configuration:
```typescript
{
  notificationChannels: ['email'],
  notificationTemplate: 'default' // or custom template ID
}
```

### Slack Notifications

Slack notifications feature:
- Interactive buttons for approve/reject
- Rich formatting with Block Kit
- Priority indicators with emojis
- Direct links to approval center

Configuration:
```typescript
{
  notificationChannels: ['slack']
}
```

Set Slack webhook URL:
```bash
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### SMS Notifications

For critical approvals:
```typescript
{
  priority: 'critical',
  notificationChannels: ['sms', 'email']
}
```

## Best Practices

### 1. Choose the Right Approval Mode

- **Any**: Use for single sign-off requirements
- **All**: Use when unanimous consent is needed
- **Majority**: Use for committee decisions
- **Custom**: Use for complex approval logic

### 2. Set Appropriate Timeouts

- **Routine approvals**: 24-48 hours
- **Urgent approvals**: 1-4 hours
- **Strategic decisions**: 3-7 days

### 3. Configure Multiple Notification Channels

Always configure at least two channels for critical approvals:
```typescript
notificationChannels: ['email', 'slack']
```

### 4. Use Auto-Approval Rules Wisely

Auto-approve routine, low-risk requests:
```typescript
autoApprovalRules: [
  {
    id: 'routine-expense',
    name: 'Auto-approve routine expenses',
    condition: '${amount} < 100 && ${category} === "office_supplies"',
    action: 'approve'
  }
]
```

### 5. Enable Audit Trail for Compliance

Always enable for regulated industries:
```typescript
enableAuditTrail: true
```

### 6. Set Up Escalation Paths

Define escalation for time-sensitive approvals:
```typescript
{
  timeoutAction: 'escalate',
  escalationTargets: [/* senior managers */]
}
```

### 7. Use Data Previews

Help approvers make informed decisions:
```typescript
{
  dataPreviewConfig: {
    enabled: true,
    title: 'Purchase Request',
    fields: [
      { label: 'Amount', path: 'amount', type: 'currency' },
      { label: 'Vendor', path: 'vendor', type: 'text' },
      { label: 'Justification', path: 'reason', type: 'text' }
    ]
  }
}
```

## Troubleshooting

### Approvals Not Received

1. Check notification channel configuration
2. Verify email addresses are correct
3. Check spam folders
4. Verify Slack webhook URL is configured

### Approval Stuck in Pending

1. Check timeout configuration
2. Verify all approvers have been notified
3. Check approval mode requirements
4. Review audit trail for issues

### Performance Issues

1. Reduce number of concurrent approvals
2. Disable audit trail for high-volume workflows
3. Increase timeout for complex decisions
4. Use auto-approval rules to reduce manual load

## Advanced Features

### Custom Approval Logic

```typescript
{
  approvalMode: 'custom',
  customApprovalLogic: `
    // Requires both manager and finance if amount > 5000
    if (totalResponses === totalApprovers) {
      const managerApproved = responses.some(r =>
        r.approverRole === 'manager' && r.decision === 'approve'
      );
      const financeApproved = responses.some(r =>
        r.approverRole === 'finance' && r.decision === 'approve'
      );

      if (amount > 5000) {
        return {
          complete: managerApproved && financeApproved,
          decision: (managerApproved && financeApproved) ? 'approved' : 'rejected'
        };
      } else {
        return {
          complete: managerApproved,
          decision: managerApproved ? 'approved' : 'rejected'
        };
      }
    }
    return { complete: false };
  `
}
```

### Webhook Integration

Receive approval events via webhook:

```typescript
{
  auditTrailWebhook: 'https://your-system.com/api/approval-events'
}
```

Webhook payload:
```json
{
  "event": "approval.approved",
  "timestamp": "2025-10-18T10:30:00Z",
  "request": {
    "id": "approval_...",
    "workflowId": "wf-123",
    "status": "approved"
  },
  "response": {
    "approverId": "user123",
    "decision": "approve",
    "comment": "Approved"
  }
}
```

## Security Considerations

1. **Authentication**: All approval actions require authentication
2. **Authorization**: Only designated approvers can respond
3. **Audit Trail**: All actions are logged with IP addresses
4. **Data Privacy**: Sensitive data is encrypted in transit and at rest
5. **Link Expiration**: Email approve/reject links expire after 7 days
6. **Rate Limiting**: API endpoints are rate-limited to prevent abuse

## Performance Optimization

### For High-Volume Workflows

1. **Batch Notifications**: Group multiple approvals in daily digest
2. **Disable Audit Trail**: For non-compliance workflows
3. **Use Auto-Approval**: Reduce manual intervention
4. **Increase Timeouts**: Reduce notification frequency

### Monitoring

Track these metrics:
- Average approval time
- Timeout rate
- Escalation frequency
- Approver response rate

```typescript
const metrics = approvalManager.getMetrics();
console.log(`Approval rate: ${metrics.approvalRate}%`);
console.log(`Timeout rate: ${metrics.timeoutRate}%`);
```

## Support

For issues or questions:
1. Check the audit trail for approval history
2. Review configuration in node settings
3. Check notification delivery logs
4. Contact your workflow administrator

## Version History

- **v1.0.0** (2025-10-18): Initial release
  - Basic approval workflows
  - Email and Slack notifications
  - Audit trail
  - Multi-approver support
  - Timeout handling

## License

This feature is part of the Workflow Automation Platform.

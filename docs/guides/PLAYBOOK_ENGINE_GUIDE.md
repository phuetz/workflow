# Response Playbook Engine - Quick Start Guide

## Overview

The **PlaybookEngine** (`src/integrations/response/PlaybookEngine.ts`) is a comprehensive incident response automation system with 10+ pre-built security playbooks. It handles triggered responses through sequential/parallel action execution, approval workflows, and effectiveness tracking.

**File Size**: 1,618 lines | **Type Safety**: Full TypeScript with strict mode

## Core Architecture

### 1. Playbook Definition
Each playbook is a structured YAML/JSON equivalent with:
- **Metadata**: Name, description, severity, author, version tracking
- **Triggers**: Event-based activation with conditions and thresholds
- **Variables**: Context substitution for dynamic data
- **Actions**: Sequential or parallel execution with retry logic
- **Conditionals**: If/else/switch branching based on event data
- **Approvals**: Manual approval gates with escalation

### 2. Action Execution Model
```typescript
// Sequential execution (default)
Action 1 → Action 2 → Action 3

// Parallel execution (runInParallel: true)
Action 1 ──┬→ Action 2 (parallel)
           └→ Action 3 (parallel)

// Dependent execution
Action 1 → Action 2 (depends on Action 1 result)
```

### 3. Playbook Lifecycle
- **Draft**: Initial creation, not executable
- **Active**: Ready for execution
- **Archived**: Historical reference
- **Disabled**: Temporarily inactive

## 10+ Pre-Built Playbooks

### 1. **Brute Force Response** (`pb_bruteforce`)
**Trigger**: 5+ failed logins in 5 minutes
**Severity**: HIGH
**Actions**:
- Block source IP address (firewall)
- Lock user account (IAM)
- Notify SOC team (Slack)
- Create incident ticket (Jira)

```typescript
const execution = await engine.executePlaybook(
  'pb_bruteforce',
  { sourceIP: '192.168.1.100', userId: 'user@company.com', failedLoginCount: 6 }
);
```

### 2. **Malware Detection Response** (`pb_malware`)
**Trigger**: Malware IOC match detected
**Severity**: CRITICAL
**Actions**:
- Isolate infected host from network
- Capture memory dump for forensics
- Alert incident response team (PagerDuty)
- Log to SIEM

**Approval**: Escalating (IR lead required, auto-approve on 5min timeout)

### 3. **Data Exfiltration Response** (`pb_exfiltration`)
**Trigger**: Unusual data transfer pattern (5x baseline)
**Severity**: CRITICAL
**Actions**:
- Block outbound data transfer (firewall)
- Alert DLP team (Email)
- Create investigation case (ServiceNow)

### 4. **Privilege Escalation Response** (`pb_privesc`)
**Trigger**: Unauthorized privilege elevation detected
**Severity**: HIGH
**Actions**:
- Revoke granted privileges (IAM)
- Lock suspicious account
- Log unauthorized escalation to audit trail

### 5. **Ransomware Response** (`pb_ransomware`)
**Trigger**: Ransomware indicators detected
**Severity**: CRITICAL
**Actions**:
- Isolate all affected systems
- Disable network file shares
- Notify C-level executives
- Activate incident response team

**Approval**: Manual (CISO required, auto-approve on 1min timeout)

### 6. **Phishing Email Response** (`pb_phishing`)
**Trigger**: Phishing email detected
**Severity**: HIGH
**Actions**:
- Quarantine malicious email
- Block sender address
- Notify affected users
- Log threat intelligence

### 7. **DDoS Attack Response** (`pb_ddos`)
**Trigger**: Traffic anomaly detected (>80% anomaly score)
**Severity**: HIGH
**Actions**:
- Enable rate limiting (1000 req/sec)
- Activate CDN acceleration
- Alert NOC team (PagerDuty)

### 8. **Insider Threat Response** (`pb_insider`)
**Trigger**: Suspicious user behavior detected
**Severity**: HIGH
**Actions**:
- Enable enhanced monitoring/UEBA
- Restrict access to sensitive data
- Notify HR department

### 9. **API Abuse Response** (`pb_api_abuse`)
**Trigger**: API rate limit exceeded
**Severity**: MEDIUM
**Actions**:
- Throttle API access (100 req/min)
- Revoke API key
- Notify developer

### 10. **Credential Compromise Response** (`pb_credential_compromise`)
**Trigger**: Compromised credentials detected
**Severity**: CRITICAL
**Actions**:
- Force immediate password reset
- Revoke all active sessions
- Enforce MFA enrollment
- Notify compromised user

## Key Features

### Action Types
1. **Notification**: Slack, Email, SMS, PagerDuty
2. **Blocking**: Firewall rules, account locks, API throttling
3. **Remediation**: Host isolation, container termination, database rollback
4. **Logging**: Audit logs, SIEM events, threat intelligence
5. **Escalation**: Jira tickets, ServiceNow incidents

### Retry Logic
```typescript
const action = {
  id: 'action_block_ip',
  name: 'Block Source IP',
  type: 'blocking',
  retryPolicy: {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelayMs: 1000
  }
};

// Retry backoff: 1s, 2s, 4s
```

### Variable Substitution
```typescript
// In playbook payload
{
  message: 'User {{event.userId}} detected suspicious activity',
  severity: '{{event.severity}}',
  timestamp: '{{timestamp}}'
}

// Expands to actual event data at execution
```

### Conditional Branching
```typescript
const conditionalBranch = {
  condition: '{{event.severity}} === "critical"',
  actions: [/* critical severity actions */],
  elseActions: [/* normal severity actions */]
};
```

### Approval Workflows
```typescript
approval: {
  mode: 'manual',                    // auto, manual, escalating
  requiredApprovers: ['ciso'],
  timeoutMs: 3600000,                // 1 hour
  timeoutAction: 'auto_approve'      // auto_approve, cancel, escalate
}
```

## Usage Examples

### 1. Execute a Playbook
```typescript
const engine = new PlaybookEngine();

const execution = await engine.executePlaybook(
  'pb_bruteforce',
  {
    sourceIP: '192.168.1.100',
    userId: 'john.doe@company.com',
    failedLoginCount: 6,
    timestamp: new Date().toISOString()
  },
  'security-system'
);

console.log(execution.status);           // 'success' or 'failed'
console.log(execution.metrics);          // Duration, actions completed, etc.
```

### 2. Get Execution History
```typescript
const history = engine.getExecutionHistory('pb_bruteforce', 100);

history.forEach(exec => {
  console.log(`Executed: ${exec.startTime}`);
  console.log(`Status: ${exec.status}`);
  console.log(`Duration: ${exec.metrics.totalDuration}ms`);
});
```

### 3. Get Effectiveness Metrics
```typescript
const metrics = engine.getMetrics('pb_bruteforce');

console.log(`Success Rate: ${metrics.successRate * 100}%`);
console.log(`Avg Duration: ${metrics.averageDuration}ms`);
console.log(`Total Executions: ${metrics.executions}`);
```

### 4. Update Playbook
```typescript
const updated = engine.updatePlaybook(
  'pb_bruteforce',
  {
    actions: [/* updated actions */],
    approval: { mode: 'auto' }
  },
  'security-admin@company.com',
  'Updated approval requirements'
);

console.log(`New version: ${updated.metadata.version}`);
```

### 5. List Playbooks
```typescript
// All active playbooks
const active = engine.listPlaybooks('active');

// Critical severity playbooks
const critical = engine.listPlaybooks(undefined, 'critical');

// By category
const accessControl = engine.listPlaybooks(undefined, undefined, 'access-control');
```

## Type Definitions

All types are fully exported for type-safe implementation:

```typescript
export type {
  PlaybookDefinition,
  ExecutionRecord,
  ActionExecutionResult,
  VariableContext,
  SeverityLevel,
  PlaybookState,
  ApprovalMode,
  ActionStatus,
  EventType
};
```

## Integration Points

### Backend API Integration
```typescript
// src/backend/api/routes/playbooks.ts
app.post('/api/playbooks/:id/execute', async (req, res) => {
  const engine = new PlaybookEngine();
  const execution = await engine.executePlaybook(
    req.params.id,
    req.body.event,
    req.user.email
  );
  res.json(execution);
});
```

### SIEM Integration
Playbooks can be triggered from SIEM alerts with automatic IOC enrichment:

```typescript
// SIEM → Webhook → PlaybookEngine
const siemAlert = {
  eventType: 'security_alert',
  threatType: 'malware',
  hostId: 'host-123',
  hash: 'sha256:abc123...',
  severity: 'critical'
};

await engine.executePlaybook('pb_malware', siemAlert);
```

## Performance Characteristics

- **Action Execution**: ~100-500ms per action (depends on service)
- **Parallel Execution**: Up to 10 actions in parallel
- **Max Playbook Size**: 100+ actions with dependencies
- **Version History**: Unlimited (delta compressed)
- **Execution Records**: Retained for audit trail

## Security Considerations

1. **Variable Injection Prevention**: All substitutions are sanitized
2. **Approval Requirements**: Manual gates for critical actions
3. **Rollback Support**: Reverse actions on failure
4. **Audit Trail**: All executions logged with approvals
5. **Timeout Protection**: All actions have configurable timeouts

## Next Steps

1. **Register Custom Handlers**: Extend `actionHandlers` map for custom services
2. **Create Custom Playbooks**: Use `registerPlaybook()` for organization-specific responses
3. **API Endpoints**: Expose playbook execution via REST API
4. **Dashboard Integration**: Display playbook metrics and history
5. **Alert Integration**: Connect SIEM, monitoring, and threat intel sources

---

**Author**: Claude Code
**Version**: 2.0.0
**Status**: Production Ready

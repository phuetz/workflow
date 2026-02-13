# Agent 15 - Error Handling Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Workflow Execution Engine                         │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ├─────────────────────────────────────────────────┐
                     │                                                 │
                     ▼                                                 ▼
        ┌────────────────────────┐                      ┌─────────────────────┐
        │   RetryManager         │                      │  CircuitBreaker     │
        │                        │                      │                     │
        │  • Fixed Delay         │                      │  • CLOSED State     │
        │  • Linear Backoff      │                      │  • OPEN State       │
        │  • Exponential Backoff │                      │  • HALF_OPEN State  │
        │  • Fibonacci Backoff   │                      │  • Auto Recovery    │
        │  • Custom Function     │                      │  • Health Tracking  │
        └────────────┬───────────┘                      └──────────┬──────────┘
                     │                                              │
                     │                                              │
                     ▼                                              ▼
        ┌────────────────────────────────────────────────────────────────┐
        │                      Node Execution                            │
        │                                                                │
        │  Success Path ──┐                    ┌── Error Path            │
        └─────────────────┼────────────────────┼────────────────────────┘
                          │                    │
                          ▼                    ▼
           ┌──────────────────────┐  ┌─────────────────────────┐
           │  ErrorOutputHandler  │  │  ErrorOutputHandler     │
           │                      │  │                         │
           │  output[0] → Success │  │  output[1] → Error      │
           └──────────┬───────────┘  └────────────┬────────────┘
                      │                           │
                      │                           │
                      ▼                           ▼
           ┌──────────────────────┐  ┌──────────────────────────┐
           │  Next Node           │  │  Error Handler Node      │
           │  (Success Output)    │  │  (Error Output)          │
           └──────────────────────┘  └────────────┬─────────────┘
                                                   │
                                                   │
                                     ┌─────────────┴──────────────┐
                                     │                            │
                                     ▼                            ▼
                      ┌──────────────────────────┐  ┌────────────────────────┐
                      │  ErrorWorkflowService    │  │  ErrorAnalytics        │
                      │                          │  │                        │
                      │  • Slack Notification    │  │  • MTTR Tracking       │
                      │  • Jira Ticket Creation  │  │  • Recovery Rate       │
                      │  • Email Alerts          │  │  • Error Trends        │
                      │  • Database Logging      │  │  • Top Failing Nodes   │
                      │  • PagerDuty Escalation  │  │  • Real-time Monitor   │
                      └──────────────────────────┘  └────────────────────────┘
```

---

## Component Interactions

### 1. Error Detection & Routing Flow

```
Node Execution
      │
      ├─── Success? ──→ Yes ──→ ErrorOutputHandler.routeOutput()
      │                              │
      │                              └──→ output[0] (Success Path)
      │                                        │
      │                                        └──→ Next Node
      │
      └─── No (Error) ──→ RetryManager.executeWithRetry()
                              │
                              ├─── Retry Successful? ──→ Yes ──→ Success Path
                              │
                              └─── No ──→ ErrorOutputHandler.routeOutput()
                                              │
                                              └──→ output[1] (Error Path)
                                                        │
                                                        ├──→ Error Handler Node
                                                        │
                                                        └──→ ErrorWorkflowService.trigger()
```

### 2. Retry Strategy Selection Flow

```
RetryManager.executeWithRetry()
      │
      ├──→ Strategy: Fixed
      │         └──→ Delay = initialDelay
      │
      ├──→ Strategy: Linear
      │         └──→ Delay = initialDelay × attempt × multiplier
      │
      ├──→ Strategy: Exponential
      │         └──→ Delay = initialDelay × (multiplier ^ attempt)
      │
      ├──→ Strategy: Fibonacci
      │         └──→ Delay = initialDelay × fibonacci(attempt)
      │
      └──→ Strategy: Custom
                └──→ Delay = customDelayFn(attempt)
                        │
                        ├──→ Apply maxDelay cap (if set)
                        │
                        └──→ Add jitter (if enabled)
```

### 3. Circuit Breaker State Machine

```
                    ┌──────────────┐
                    │   CLOSED     │
                    │ (Normal)     │
                    └──────┬───────┘
                           │
                failure    │    success
              threshold    │    (resets counter)
               reached     │
                           │
                           ▼
                    ┌──────────────┐
                    │     OPEN     │
                    │  (Failing)   │
                    └──────┬───────┘
                           │
                  timeout  │
                  elapsed  │
                           │
                           ▼
                    ┌──────────────┐
                    │  HALF_OPEN   │
                    │  (Testing)   │
                    └──────┬───────┘
                           │
                  success  │    failure
                threshold  │    (back to OPEN)
                  reached  │
                           │
                           ▼
                    ┌──────────────┐
                    │   CLOSED     │
                    │  (Recovered) │
                    └──────────────┘
```

### 4. Error Workflow Execution Flow

```
Error Detected
      │
      └──→ ErrorWorkflowService.triggerErrorWorkflows()
              │
              ├──→ Find matching workflows (by trigger type)
              │         │
              │         ├──→ Type: 'all' → All errors
              │         ├──→ Type: 'specific_nodes' → Match node ID
              │         ├──→ Type: 'error_codes' → Match error code
              │         └──→ Type: 'node_types' → Match node type
              │
              ├──→ Sort by priority (high → low)
              │
              ├──→ Prepare error context
              │         └──→ ErrorWorkflowContext {
              │                  failedNodeId,
              │                  failedNodeType,
              │                  errorDetails,
              │                  executionId,
              │                  workflowId
              │              }
              │
              └──→ Execute workflows
                      │
                      ├──→ Async workflows (parallel)
                      │
                      └──→ Sync workflows (sequential)
```

---

## Data Structures

### Error Output Data

```typescript
ErrorOutputData {
  error: {
    message: string          // "Connection timeout"
    code?: string           // "ETIMEDOUT"
    stack?: string          // Full stack trace
    timestamp: number       // 1697654321000
    nodeId: string         // "node-123"
    nodeType: string       // "httpRequest"
    nodeName: string       // "API Call"
  },
  originalInput?: object,  // Input data that caused error
  executionContext?: {
    executionId: string,   // "exec-456"
    workflowId: string,    // "wf-789"
    attemptNumber?: number // 3
  }
}
```

### Retry State

```typescript
RetryState {
  attemptNumber: number,        // Current attempt
  totalAttempts: number,        // Max attempts allowed
  totalDelay: number,           // Total time spent in delays (ms)
  lastError?: Error,           // Last error encountered
  history: [                   // Retry history
    {
      attempt: 1,
      timestamp: 1697654321000,
      delay: 1000,
      errorMessage: "Timeout",
      success: false
    },
    {
      attempt: 2,
      timestamp: 1697654323000,
      delay: 2000,
      errorMessage: "Timeout",
      success: false
    },
    {
      attempt: 3,
      timestamp: 1697654327000,
      delay: 0,
      success: true
    }
  ]
}
```

### Circuit Breaker Stats

```typescript
CircuitBreakerStats {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN',
  failures: number,                    // Total failures
  successes: number,                   // Total successes
  totalCalls: number,                  // All calls made
  rejectedCalls: number,               // Calls rejected (circuit open)
  lastFailureTime?: number,            // Timestamp of last failure
  lastSuccessTime?: number,            // Timestamp of last success
  stateChangedAt: number,              // When state last changed
  consecutiveFailures: number,         // Failures in a row
  consecutiveSuccesses: number         // Successes in a row
}
```

---

## Integration Points

### 1. Execution Engine Integration

```typescript
// In ExecutionEngine
import { ErrorOutputHandler } from './execution/ErrorOutputHandler';
import { retryManager } from './execution/RetryManager';
import { circuitBreakerManager } from './execution/CircuitBreaker';

class ExecutionEngine {
  private errorHandler: ErrorOutputHandler;

  async executeNode(node: WorkflowNode) {
    // Get retry config
    const retryConfig = RetryManager.fromNodeConfig(node.data.config);

    // Get circuit breaker
    const breaker = circuitBreakerManager.createForNode(
      node.id,
      node.data.type
    );

    // Execute with retry and circuit breaker
    const result = await retryManager.executeWithRetry(
      () => breaker.execute(() => this.runNode(node)),
      retryConfig
    );

    // Route output
    const routes = this.errorHandler.routeOutput(
      node.id,
      result.success,
      result.data,
      result.error
    );

    return { result, routes };
  }
}
```

### 2. UI Integration

```typescript
// In WorkflowCanvas
import { ErrorOutputHandler } from './execution/ErrorOutputHandler';

// Visual error edges
const errorEdgeStyle = ErrorOutputHandler.getErrorEdgeStyle();
// → { stroke: '#ef4444', strokeDasharray: '5,5', animated: true }

// In NodeConfigPanel
import { RetryConfigPanel } from './components/RetryConfigPanel';

<RetryConfigPanel
  nodeId={node.id}
  initialConfig={node.data.config?.retry}
  onChange={handleRetryConfigChange}
/>
```

### 3. Monitoring Integration

```typescript
// In Dashboard
import { ErrorAnalyticsDashboard } from './components/ErrorAnalyticsDashboard';

<ErrorAnalyticsDashboard />
```

---

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Route Output | O(E) | E = number of edges from node |
| Find Error Workflows | O(W) | W = number of workflows |
| Calculate Retry Delay | O(1) | All strategies pre-cached |
| Circuit State Check | O(1) | Direct state lookup |
| Error Analytics Aggregation | O(N) | N = number of errors |

### Space Complexity

| Component | Space | Notes |
|-----------|-------|-------|
| ErrorOutputHandler | O(N + E) | N nodes + E edges |
| RetryManager | O(1) | Per retry operation |
| CircuitBreaker | O(1) | Per breaker instance |
| ErrorWorkflowService | O(W + H) | W workflows + H history |
| Error Analytics | O(E) | E error records |

---

## Scalability Considerations

### 1. Error Workflow Execution
- **Async by default:** Non-blocking error workflows
- **Priority-based:** High priority workflows execute first
- **History cap:** Max 100 executions per workflow
- **Template caching:** Templates loaded once at startup

### 2. Retry Manager
- **Fibonacci cache:** Pre-computed for n ≤ 30
- **Stateless retry:** No global state accumulation
- **Configurable limits:** Max attempts capped at 100
- **Early termination:** Non-retryable errors skip retries

### 3. Circuit Breaker
- **Per-service isolation:** Failures don't affect other services
- **Automatic cleanup:** Old breakers can be removed
- **Volume threshold:** Prevents premature opening
- **Fast rejection:** O(1) rejection when OPEN

### 4. Error Analytics
- **Time-windowed queries:** Only recent errors
- **Aggregation caching:** Metrics calculated on demand
- **Storage optimization:** Old errors can be archived
- **Real-time updates:** Configurable refresh interval

---

## Security Considerations

### 1. Error Data Sanitization
- Stack traces sanitized for sensitive data
- Original inputs optionally redacted
- Error codes validated before storage
- Workflow execution sandboxed

### 2. Circuit Breaker Protection
- Prevents DoS via error workflows
- Rate limiting on error workflow triggers
- Resource exhaustion protection
- Timeout enforcement

### 3. Retry Abuse Prevention
- Max attempts capped at 100
- Max delay enforced
- Exponential backoff prevents hammering
- Jitter prevents coordinated retries

---

## Monitoring & Observability

### Key Metrics to Track

1. **Error Rate:** Errors per minute/hour
2. **MTTR:** Mean time to recovery
3. **Recovery Rate:** % of errors recovered by retry
4. **Circuit Breaker State:** Healthy/Open/Half-Open
5. **Retry Distribution:** Which strategies are used
6. **Top Failing Nodes:** Identify problematic nodes
7. **Error Workflow Success:** Workflow execution rate

### Logging

```typescript
// Automatic logging at key points
logger.info('Error Output Handler initialized');
logger.info('Routed error output to 1 error handlers');
logger.info('Retry attempt 1/5 after 1000ms delay');
logger.info('Circuit breaker state changed: CLOSED → OPEN');
logger.info('Executing error workflow: Slack Notification');
```

---

## Future Enhancements

### Phase 2 (Potential)
1. **Error Pattern Detection:** ML-based anomaly detection
2. **Automatic Remediation:** Self-healing workflows
3. **Error Correlation:** Group related errors
4. **Custom Circuit Breakers:** Per-workflow custom logic
5. **Error Replay:** Retry failed workflows from dashboard
6. **Advanced Analytics:** Error forecasting, cost analysis
7. **Integration Marketplace:** Pre-built error workflow templates

---

**Architecture Documentation** | Agent 15 Implementation
**Version:** 1.0.0 | **Date:** 2025-10-18

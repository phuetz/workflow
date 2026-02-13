# Agent 15 - Quick Start Guide
## Error Workflows & Advanced Retry Logic

This guide helps you quickly get started with the new error handling features.

---

## 🚀 Quick Start (5 minutes)

### 1. Enable Error Output on a Node

```typescript
// In your node configuration
const node = {
  id: 'my-api-call',
  type: 'httpRequest',
  data: {
    // ... other config
    config: {
      enableErrorHandle: true  // ← Enable error output
    }
  }
};
```

### 2. Add Error Handler Node

```typescript
// Create error handler node
const errorHandler = {
  id: 'error-handler',
  type: 'function',
  data: {
    label: 'Handle Error',
    config: {
      code: `
        console.log('Error occurred:', input.error);
        // Send to Slack, log to database, etc.
        return { handled: true };
      `
    }
  }
};

// Connect error output to handler
const errorEdge = {
  id: 'error-edge',
  source: 'my-api-call',
  target: 'error-handler',
  sourceHandle: 'error',  // ← Error output
  targetHandle: 'input'
};
```

### 3. Configure Retry Logic

```typescript
// Add retry config to your node
node.data.config.retry = {
  enabled: true,
  maxAttempts: 3,
  strategy: 'exponential',
  initialDelay: 1000,
  maxDelay: 30000,
  jitter: true
};
```

**Done!** Your node now has error handling and retry logic.

---

## 📋 Common Scenarios

### Scenario 1: Slack Error Notifications

```typescript
import { errorWorkflowService } from './services/ErrorWorkflowService';

// Use the Slack template
const workflow = errorWorkflowService.createFromTemplate('slack-notification', {
  name: 'Production Error Alerts',
  workflowId: 'your-slack-workflow-id',
  trigger: {
    type: 'all'  // Alert on all errors
  },
  priority: 100,
  async: true
});

errorWorkflowService.registerErrorWorkflow(workflow);
```

### Scenario 2: API Call with Retry

```typescript
// Configure exponential backoff for API calls
const apiConfig = {
  retry: {
    enabled: true,
    maxAttempts: 5,
    strategy: 'exponential',
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitter: true,
    retryOnErrors: ['TIMEOUT', 'ECONNREFUSED', '429', '502', '503'],
    skipOnErrors: ['401', '403', '404']
  }
};
```

### Scenario 3: Circuit Breaker for External Service

```typescript
import { circuitBreakerManager } from './execution/CircuitBreaker';

// Create circuit breaker for external API
const apiBreaker = circuitBreakerManager.createForService('stripe-api', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000
});

// Use in your code
try {
  const result = await apiBreaker.execute(async () => {
    return await callStripeAPI();
  });
} catch (error) {
  // Handle circuit breaker open error
}
```

---

## 🎨 UI Components

### Error Workflow Configuration

```tsx
import { ErrorWorkflowConfig } from './components/ErrorWorkflowConfig';

// In your settings page
<ErrorWorkflowConfig
  workflowId="current-workflow-id"
  onSave={(config) => console.log('Workflow saved:', config)}
/>
```

### Retry Configuration Panel

```tsx
import { RetryConfigPanel } from './components/RetryConfigPanel';

// In your node config panel
<RetryConfigPanel
  nodeId={selectedNode.id}
  initialConfig={selectedNode.data.config?.retry}
  onChange={(config) => updateNodeRetryConfig(config)}
/>
```

### Error Analytics Dashboard

```tsx
import { ErrorAnalyticsDashboard } from './components/ErrorAnalyticsDashboard';

// In your monitoring page
<ErrorAnalyticsDashboard />
```

---

## 📊 Monitor Your Errors

### View Error Statistics

```typescript
import { ErrorOutputHandler } from './execution/ErrorOutputHandler';

const handler = new ErrorOutputHandler(nodes, edges);
const stats = handler.getStatistics();

console.log({
  totalNodes: stats.totalNodes,
  nodesWithErrorHandles: stats.nodesWithErrorHandles,
  errorEdges: stats.errorEdges,
  successEdges: stats.successEdges
});
```

### Check Circuit Breaker Health

```typescript
import { circuitBreakerManager } from './execution/CircuitBreaker';

const health = circuitBreakerManager.getHealthSummary();
console.log({
  total: health.total,
  healthy: health.healthy,
  open: health.open,
  unhealthy: health.unhealthy
});
```

### View Error Workflow Stats

```typescript
import { errorWorkflowService } from './services/ErrorWorkflowService';

const stats = errorWorkflowService.getStatistics();
console.log({
  totalWorkflows: stats.totalWorkflows,
  enabledWorkflows: stats.enabledWorkflows,
  totalExecutions: stats.totalExecutions,
  successRate: stats.successRate
});
```

---

## 🔧 Advanced Usage

### Custom Retry Strategy

```typescript
import { retryManager } from './execution/RetryManager';

const customConfig = {
  enabled: true,
  maxAttempts: 5,
  strategy: 'custom',
  initialDelay: 1000,
  customDelayFn: (attempt) => {
    // Custom logic: delay doubles every 2 attempts
    const doubleEveryN = 2;
    const multiplier = Math.floor(attempt / doubleEveryN);
    return 1000 * Math.pow(2, multiplier);
  }
};

const result = await retryManager.executeWithRetry(
  () => yourFunction(),
  customConfig
);
```

### Conditional Error Workflows

```typescript
// Only trigger for specific node types
errorWorkflowService.registerErrorWorkflow({
  id: 'api-errors-only',
  name: 'API Error Handler',
  description: 'Handle only API errors',
  enabled: true,
  workflowId: 'error-workflow-id',
  trigger: {
    type: 'node_types',
    nodeTypes: ['httpRequest', 'graphql', 'rest']
  },
  priority: 75,
  async: true
});

// Only trigger for specific error codes
errorWorkflowService.registerErrorWorkflow({
  id: 'critical-errors',
  name: 'Critical Error Escalation',
  description: 'Escalate 500 errors',
  enabled: true,
  workflowId: 'pagerduty-workflow-id',
  trigger: {
    type: 'error_codes',
    errorCodes: ['500', '503', 'CRITICAL']
  },
  priority: 100,
  async: false  // Block until escalation complete
});
```

### Error Output Handler Integration

```typescript
import { ErrorOutputHandler } from './execution/ErrorOutputHandler';
import { errorWorkflowService } from './services/ErrorWorkflowService';

// Create handler
const handler = new ErrorOutputHandler(nodes, edges);

// During workflow execution
const routes = handler.routeOutput(
  nodeId,
  executionResult.success,
  executionResult.data,
  executionResult.error,
  { executionId, workflowId }
);

// Trigger error workflows
if (!executionResult.success) {
  await errorWorkflowService.triggerErrorWorkflows({
    failedNodeId: nodeId,
    failedNodeType: nodeType,
    failedNodeName: nodeName,
    errorDetails: {
      message: executionResult.error.message,
      code: executionResult.error.code,
      stack: executionResult.error.stack,
      timestamp: Date.now()
    },
    executionId,
    workflowId
  });
}

// Process routes
for (const route of routes) {
  await executeNextNode(route.targetNodeId, route.data);
}
```

---

## 🧪 Testing

### Test Error Handling

```typescript
import { describe, it, expect } from 'vitest';
import { ErrorOutputHandler } from './execution/ErrorOutputHandler';

describe('My Error Handling', () => {
  it('should route errors correctly', () => {
    const handler = new ErrorOutputHandler(nodes, edges);
    const routes = handler.routeOutput(
      'node1',
      false,
      {},
      new Error('Test error')
    );

    expect(routes).toHaveLength(1);
    expect(routes[0].outputIndex).toBe(1); // Error output
  });
});
```

### Test Retry Logic

```typescript
import { retryManager } from './execution/RetryManager';

describe('Retry Logic', () => {
  it('should retry on failure', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) throw new Error('Fail');
      return 'success';
    };

    const result = await retryManager.executeWithRetry(fn, {
      enabled: true,
      maxAttempts: 5,
      strategy: 'fixed',
      initialDelay: 10
    });

    expect(result.success).toBe(true);
    expect(attempts).toBe(3);
  });
});
```

---

## 📚 Best Practices

### 1. Error Output Configuration
- ✅ Enable error handles on all external API calls
- ✅ Always provide error handlers for critical paths
- ✅ Use visual error edges for clarity

### 2. Retry Strategy Selection
- **External APIs:** Exponential backoff with jitter
- **Email/SMS:** Fixed delay (3-5 seconds)
- **Database:** Linear backoff (short delays)
- **File Operations:** Fibonacci backoff

### 3. Circuit Breaker Thresholds
- **High Traffic:** Threshold 10+, short timeout
- **Low Traffic:** Threshold 3-5, longer timeout
- **Critical Services:** Lower threshold, PagerDuty on open

### 4. Error Workflows
- **All Errors:** Database logging (low priority)
- **API Errors:** Slack notification (medium priority)
- **Critical Errors:** PagerDuty (high priority)

### 5. Error Analytics
- Review error trends weekly
- Monitor MTTR to identify slow recoveries
- Track recovery rate to optimize retry configs
- Identify top failing nodes for targeted fixes

---

## 🆘 Troubleshooting

### Problem: Retries not working

**Check:**
1. `retry.enabled` is `true`
2. Error is retryable (not 401/403/404)
3. Max attempts not exceeded
4. Review `retryOnErrors` and `skipOnErrors` filters

### Problem: Circuit breaker always open

**Check:**
1. Failure threshold too low
2. Underlying service actually failing
3. Timeout too short
4. Reset circuit: `breaker.reset()`

### Problem: Error workflows not triggering

**Check:**
1. Workflow is enabled
2. Trigger type matches error
3. Workflow ID is valid
4. Check execution history: `errorWorkflowService.getExecutionHistory()`

---

## 📖 Learn More

- **Full Documentation:** See `AGENT15_ERROR_WORKFLOWS_IMPLEMENTATION_REPORT.md`
- **Test Examples:** See `src/__tests__/errorHandling.comprehensive.test.ts`
- **Templates:** See `ErrorWorkflowService.getTemplates()`

---

## 🎯 Next Steps

1. ✅ Enable error outputs on critical nodes
2. ✅ Configure retry logic for external APIs
3. ✅ Set up error workflows (start with Slack)
4. ✅ Add circuit breakers to external services
5. ✅ Monitor error analytics dashboard
6. ✅ Adjust configurations based on metrics

**Need help?** Check the comprehensive test file for examples of every feature!

---

**Quick Start Guide** | Agent 15 Implementation
**Version:** 1.0.0 | **Date:** 2025-10-18

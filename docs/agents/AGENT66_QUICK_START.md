# Agent Observability Platform - Quick Start Guide

## 5-Minute Integration

### Step 1: Import the Platform

```typescript
import { AgentTraceCollector } from './src/observability/AgentTraceCollector';
import { ToolSpanTracker } from './src/observability/ToolSpanTracker';
import { CostAttributionEngine } from './src/observability/CostAttributionEngine';
import { AgentSLAMonitor } from './src/observability/AgentSLAMonitor';
import { PolicyViolationTracker } from './src/observability/PolicyViolationTracker';
import { AgentPerformanceProfiler } from './src/observability/AgentPerformanceProfiler';
```

### Step 2: Initialize Components

```typescript
// Initialize observability platform
const observability = {
  tracing: new AgentTraceCollector({
    samplingStrategy: 'percentage',
    samplingRate: 0.1, // 10% in production
  }),
  tools: new ToolSpanTracker(),
  costs: new CostAttributionEngine(),
  sla: new AgentSLAMonitor(),
  policies: new PolicyViolationTracker(),
  profiler: new AgentPerformanceProfiler(),
};

// Export for use across your application
export default observability;
```

### Step 3: Instrument Your Agent

```typescript
import observability from './observability';

async function executeAgent(agentId: string, input: any) {
  // Start trace
  const traceId = observability.tracing.startTrace(
    agentId,
    'MyAgent',
    'execute'
  );

  try {
    // Your agent logic here
    const result = await yourAgentLogic(input);

    // End trace successfully
    observability.tracing.endTrace(traceId, 'success');

    return result;
  } catch (error) {
    // End trace with error
    observability.tracing.endTrace(traceId, 'error', {
      type: error.name,
      message: error.message,
    });
    throw error;
  }
}
```

### Step 4: Track Tool Usage

```typescript
// When calling an LLM
const spanId = observability.tools.startToolCall(
  'gpt-4',
  'generate',
  { prompt: 'Hello' },
  { traceId, userId: 'user-123' }
);

const response = await openai.chat.completions.create({...});

observability.tools.recordLLMMetrics(
  spanId,
  'openai',
  'gpt-4',
  {
    promptTokens: response.usage.prompt_tokens,
    completionTokens: response.usage.completion_tokens,
    totalTokens: response.usage.total_tokens,
  },
  0.003 // Cost
);

observability.tools.endToolCall(spanId, response, 'success');
```

### Step 5: Track Costs

```typescript
// Record cost
observability.costs.recordCost(0.003, 'llm', {
  agentId: 'agent-1',
  workflowId: 'workflow-123',
  userId: 'user-456',
});

// Create budget
const budgetId = observability.costs.createBudget({
  name: 'Monthly Budget',
  limit: 1000,
  period: 'monthly',
  scope: { global: true },
  alertThresholds: [80, 90, 100],
  enabled: true,
});
```

### Step 6: Set Up SLA Monitoring

```typescript
// Define SLA
const slaId = observability.sla.createSLA({
  name: 'Response Time',
  description: 'P95 < 2s',
  metric: 'latency',
  target: 1000,
  threshold: 2000,
  unit: 'ms',
  enabled: true,
  scope: { global: true },
  monitoringInterval: 60000,
  alertChannels: ['email', 'slack'],
});

// Record metrics
observability.sla.recordMetric(slaId, latency);
```

### Step 7: Add Dashboard to Your UI

```typescript
import { AgentObservabilityDashboard } from './src/components/AgentObservabilityDashboard';

function App() {
  return (
    <AgentObservabilityDashboard
      traceCollector={observability.tracing}
      toolTracker={observability.tools}
      costEngine={observability.costs}
      slaMonitor={observability.sla}
      violationTracker={observability.policies}
      performanceProfiler={observability.profiler}
      refreshInterval={5000}
    />
  );
}
```

## Common Patterns

### Pattern 1: Complete Agent Execution Monitoring

```typescript
async function monitoredAgentExecution(agentId: string, request: any) {
  const traceId = observability.tracing.startTrace(agentId, 'Agent', 'execute');
  const profileId = observability.profiler.startProfiling(agentId);

  try {
    // Your logic with tool tracking
    const result = await executeWithToolTracking(request, traceId);

    // Record success metrics
    observability.tracing.endTrace(traceId, 'success');

    return result;
  } catch (error) {
    observability.tracing.endTrace(traceId, 'error', {
      type: error.name,
      message: error.message,
    });
    throw error;
  } finally {
    await observability.profiler.stopProfiling(profileId);
  }
}
```

### Pattern 2: Real-Time Alerts

```typescript
// Listen for SLA violations
observability.sla.on('violation:created', async (violation) => {
  await sendSlackAlert({
    channel: '#alerts',
    message: `SLA Violation: ${violation.slaName}`,
    severity: violation.severity,
  });
});

// Listen for budget alerts
observability.costs.on('budget:alert', async (alert) => {
  if (alert.threshold >= 100) {
    // Budget exceeded - take action
    await pauseExpensiveAgents();
  }
});

// Listen for policy violations
observability.policies.on('violation:detected', async (violation) => {
  if (violation.severity === 'critical') {
    await emergencyShutdown(violation.agentId);
  }
});
```

### Pattern 3: Daily Cost Report

```typescript
async function generateDailyCostReport() {
  const now = Date.now();
  const yesterday = now - 24 * 60 * 60 * 1000;

  const costs = await observability.costs.getAttribution(yesterday, now);

  const report = {
    total: costs.total,
    topAgents: Object.entries(costs.byAgent)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10),
    byCategory: costs.byCategory,
    forecast: costs.trends.forecast30Days,
  };

  await sendEmail({
    to: 'team@company.com',
    subject: 'Daily AI Cost Report',
    body: formatReport(report),
  });
}

// Run daily at 9 AM
schedule.scheduleJob('0 9 * * *', generateDailyCostReport);
```

### Pattern 4: Performance Comparison

```typescript
async function comparePerformance(agentId: string, before: string, after: string) {
  const comparison = observability.profiler.compareSessions(before, after);

  console.log('Performance Changes:');
  console.log('CPU:', comparison.cpuChange, '%');
  console.log('Memory:', comparison.memoryChange, '%');
  console.log('Network:', comparison.networkChange, '%');
  console.log('Improvements:', comparison.improvements);
  console.log('Regressions:', comparison.regressions);
}
```

## Configuration Examples

### Development Environment

```typescript
const devConfig = {
  tracing: new AgentTraceCollector({
    samplingStrategy: 'always', // Sample everything
    samplingRate: 1.0,
  }),
  // ... other components with verbose logging
};
```

### Production Environment

```typescript
const prodConfig = {
  tracing: new AgentTraceCollector({
    samplingStrategy: 'adaptive', // Auto-adjust based on load
    samplingRate: 0.1, // Fallback to 10%
    exporters: [
      {
        type: 'otlp',
        endpoint: 'https://telemetry.company.com',
        batchSize: 100,
        batchTimeout: 5000,
      },
    ],
  }),
  // ... other components with production settings
};
```

## Best Practices

### 1. Always Use Try-Catch with Traces

```typescript
const traceId = tracing.startTrace(...);
try {
  // Your code
} catch (error) {
  tracing.endTrace(traceId, 'error', { ... });
  throw error;
} finally {
  // Cleanup if needed
}
```

### 2. Record Costs Immediately

```typescript
// Record cost right after the expensive operation
const response = await callLLM(...);
costs.recordCost(calculateCost(response), 'llm', { ... });
```

### 3. Set Realistic SLA Targets

```typescript
// Start conservative, tighten over time
const slaId = sla.createSLA({
  target: 2000, // 2s target
  threshold: 5000, // 5s violation threshold
  // ... after monitoring, adjust down
});
```

### 4. Use Hierarchical Spans

```typescript
const rootSpan = tracing.startSpan(traceId, 'agent-execution', 'agent');
const llmSpan = tracing.startSpan(traceId, 'llm-call', 'llm', rootSpan);
// ...
tracing.endSpan(llmSpan);
tracing.endSpan(rootSpan);
```

### 5. Monitor the Monitors

```typescript
// Check observability platform health
setInterval(() => {
  const metrics = observability.tracing.getMetrics();
  if (metrics.collectionLatencyP95 > 50) {
    console.warn('Trace collection is slow');
  }
}, 60000);
```

## Troubleshooting

### Issue: Traces not appearing

```typescript
// Check if sampling is enabled
const trace = observability.tracing.getTrace(traceId);
if (!trace) {
  console.log('Trace was not sampled');
  // Adjust sampling rate or strategy
}
```

### Issue: High memory usage

```typescript
// Clear old data manually
observability.tracing.clear();
observability.tools.clear();
// Or adjust retention settings
```

### Issue: Slow queries

```typescript
// Use more specific filters
const result = await observability.tracing.queryTraces({
  agentIds: ['specific-agent'], // Don't query all agents
  startTime: recentTime, // Limit time range
  limit: 50, // Limit results
});
```

## Next Steps

1. **Customize dashboards** - Modify `AgentObservabilityDashboard.tsx` for your needs
2. **Add exporters** - Integrate with Jaeger, Zipkin, Datadog, etc.
3. **Create alerts** - Set up Slack, email, PagerDuty integrations
4. **Build reports** - Use cost and performance data for regular reports
5. **Optimize** - Use profiling data to improve agent performance

## Support

- **Documentation**: See `AGENT66_OBSERVABILITY_PLATFORM_REPORT.md`
- **Examples**: Check `src/observability/__tests__/observability.test.ts`
- **Types**: Reference `src/observability/types/observability.ts`

Happy Observing! 🔍

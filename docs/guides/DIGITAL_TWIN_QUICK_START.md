# Digital Twin & Simulation System - Quick Start Guide

This guide will help you get started with the Digital Twin & Simulation System for workflow quality assurance.

## Table of Contents
1. [Installation](#installation)
2. [Basic Usage](#basic-usage)
3. [Fault Injection](#fault-injection)
4. [Commissioning](#commissioning)
5. [Regression Testing](#regression-testing)
6. [Scenario Testing](#scenario-testing)
7. [UI Components](#ui-components)

---

## Installation

The Digital Twin system is already integrated into the platform. No additional installation required.

```typescript
import {
  getDigitalTwinManager,
  getFaultInjectionEngine,
  getVirtualCommissioning,
  getRegressionTesting,
  getScenarioManager,
} from './digitaltwin';
```

---

## Basic Usage

### 1. Create a Digital Twin

```typescript
import { getDigitalTwinManager } from './digitaltwin';

const manager = getDigitalTwinManager();
const twin = await manager.createTwin(workflow);

console.log(`Created digital twin: ${twin.id}`);
```

### 2. Run a Simulation

```typescript
const result = await manager.simulate(twin.id, input, {
  mode: 'isolated',           // 'isolated', 'connected', or 'hybrid'
  timeCompression: 10,        // 10x faster than real-time
  deterministic: true,        // Same input = same output
  recordMetrics: true,
  timeout: 300000,           // 5 minutes
});

console.log(`Simulation completed: ${result.status}`);
console.log(`Duration: ${result.duration}ms`);
console.log(`Nodes executed: ${result.nodeResults.length}`);
```

### 3. Get Statistics

```typescript
const stats = manager.getStatistics(twin.id);

console.log(`Total simulations: ${stats.totalSimulations}`);
console.log(`Success rate: ${(stats.successfulSimulations / stats.totalSimulations * 100).toFixed(1)}%`);
console.log(`Average accuracy: ${(stats.avgAccuracy * 100).toFixed(1)}%`);
```

---

## Fault Injection

### 1. Create Fault from Template

```typescript
import { getFaultInjectionEngine } from './digitaltwin';

const faultEngine = getFaultInjectionEngine();

const fault = faultEngine.createFromTemplate(
  'Network Timeout',    // Template name
  'http-request-node',  // Target node ID
  {
    probability: 0.8,   // 80% chance
    timing: 'during',   // 'before', 'during', or 'after'
    duration: 30000,    // 30 seconds
  }
);
```

### 2. List Available Templates

```typescript
const templates = faultEngine.listTemplates();

templates.forEach(template => {
  console.log(`${template.name}: ${template.description}`);
});
```

Available templates:
- Network Timeout
- Invalid JSON
- API 500 Error
- Rate Limited
- Auth Expired
- Invalid Credentials
- Out of Memory
- CPU Throttled
- Data Corruption
- Cascading Failure
- Intermittent Failure
- Slow Response
- Partial Data

### 3. Create Custom Fault

```typescript
const customFault = faultEngine.createScenario({
  name: 'Custom API Failure',
  description: 'Simulates API returning 503',
  nodeId: 'api-node',
  faultType: 'api_failure',
  probability: 0.5,
  timing: 'during',
  parameters: { statusCode: 503 },
  enabled: true,
});
```

### 4. Enable Chaos Mode

```typescript
// Enable chaos with 30% probability multiplier
faultEngine.enableChaos(0.3);

// Run simulations with random faults
const result = await manager.simulate(twin.id, input);

// Disable chaos
faultEngine.disableChaos();
```

### 5. Simulate with Faults

```typescript
const result = await manager.simulate(twin.id, input, {
  faults: [fault1, fault2, fault3],
});

// Check which faults were injected
result.nodeResults.forEach(node => {
  if (node.faultsInjected.length > 0) {
    console.log(`Node ${node.nodeName} had faults: ${node.error?.message}`);
  }
});
```

---

## Commissioning

### 1. Run Commissioning Checks

```typescript
import { getVirtualCommissioning } from './digitaltwin';

const commissioning = getVirtualCommissioning();
const report = await commissioning.commission(workflow);

console.log(`Status: ${report.status}`);
console.log(`Checks: ${report.summary.passed}/${report.summary.total} passed`);
```

### 2. Review Issues

```typescript
report.checks.forEach(check => {
  console.log(`${check.name}: ${check.status}`);

  if (check.issues.length > 0) {
    check.issues.forEach(issue => {
      console.log(`  [${issue.severity}] ${issue.message}`);
      if (issue.recommendation) {
        console.log(`  → ${issue.recommendation}`);
      }
    });
  }
});
```

### 3. Follow Recommendations

```typescript
if (report.status === 'failed') {
  console.log('Workflow is NOT ready for production!');
  console.log('Recommendations:');
  report.recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec}`);
  });
} else if (report.status === 'warnings') {
  console.log('Workflow has warnings but can be deployed');
} else {
  console.log('Workflow is ready for production! ✓');
}
```

---

## Regression Testing

### 1. Generate Tests from Execution

```typescript
import { getRegressionTesting } from './digitaltwin';

const testing = getRegressionTesting();

const tests = await testing.generateFromExecution(
  workflow,
  {
    input: { userId: '123', action: 'create' },
    output: { success: true, id: '456' }
  },
  {
    includeEdgeCases: true,
    includeErrorCases: true,
  }
);

console.log(`Generated ${tests.length} tests`);
```

### 2. Create Custom Test

```typescript
const test = testing.createTest({
  name: 'User Creation - Happy Path',
  description: 'Tests successful user creation',
  workflow,
  input: { userId: '123', action: 'create' },
  expectedOutput: { success: true },
  timeout: 30000,
  assertions: [
    {
      type: 'equals',
      path: '$.success',
      expected: true,
      message: 'Should return success: true',
    },
    {
      type: 'contains',
      path: '$.id',
      expected: undefined,
      operator: '!==',
      message: 'Should return an ID',
    },
  ],
  tags: ['user', 'creation', 'happy-path'],
  enabled: true,
});
```

### 3. Run Tests

```typescript
// Run single test
const result = await testing.runTest(test.id);
console.log(`Test ${result.testName}: ${result.status}`);

// Run multiple tests
const testIds = tests.map(t => t.id);
const results = await testing.runTests(testIds);

const passed = results.filter(r => r.status === 'passed').length;
console.log(`${passed}/${results.length} tests passed`);
```

### 4. Create and Run Test Suite

```typescript
const suite = testing.createSuite('User Workflows', 'Tests for user-related workflows');

// Add tests to suite
tests.forEach(test => {
  testing.addTestToSuite(suite.id, test);
});

// Run entire suite
const summary = await testing.runSuite(suite.id);

console.log(`Suite: ${summary.passed}/${summary.totalTests} passed`);
console.log(`Coverage: ${summary.coverage.nodes.percentage.toFixed(1)}%`);
```

---

## Scenario Testing

### 1. Golden Path Scenario

```typescript
import { getScenarioManager } from './digitaltwin';

const scenarios = getScenarioManager();

const goldenPath = scenarios.createGoldenPathScenario(
  workflow,
  [
    { userId: '1', action: 'create' },
    { userId: '2', action: 'update' },
    { userId: '3', action: 'delete' },
  ]
);

const result = await scenarios.executeScenario(goldenPath.id);
console.log(`Success rate: ${(result.metrics.successfulExecutions / result.metrics.totalExecutions * 100).toFixed(1)}%`);
```

### 2. Load Testing

```typescript
const loadTest = scenarios.createLoadTestScenario(
  workflow,
  { userId: '123', action: 'create' },
  {
    concurrentExecutions: 50,      // 50 simultaneous executions
    executionsPerSecond: 10,       // 10 executions per second
    duration: 30000,               // Run for 30 seconds
    rampUpTime: 5000,             // 5 second ramp-up
  }
);

const result = await scenarios.executeScenario(loadTest.id);
console.log(`Throughput: ${result.metrics.throughput.toFixed(2)} ops/sec`);
console.log(`P95 latency: ${result.metrics.p95Duration.toFixed(0)}ms`);
```

### 3. Stress Testing

```typescript
const stressTest = scenarios.createStressTestScenario(
  workflow,
  { userId: '123', action: 'create' },
  {
    maxConcurrent: 100,           // Push to 100 concurrent
    memoryLimit: 512 * 1024 * 1024, // 512 MB limit
    cpuLimit: 80,                  // 80% CPU limit
    duration: 60000,               // 1 minute
  }
);

const result = await scenarios.executeScenario(stressTest.id);
console.log(`Error rate: ${(result.metrics.errorRate * 100).toFixed(1)}%`);
```

### 4. Chaos Testing

```typescript
const chaosTest = scenarios.createChaosTestScenario(
  workflow,
  { userId: '123', action: 'create' },
  {
    faultProbability: 0.3,        // 30% fault probability
    iterations: 50,                // 50 test runs
    faultTypes: [                  // Specific faults to test
      'Network Timeout',
      'API 500 Error',
      'Data Corruption',
    ],
    recoveryTime: 5000,           // 5 second recovery window
  }
);

const result = await scenarios.executeScenario(chaosTest.id);
console.log(`Fault recovery rate: ${(result.metrics.faultRecoveryRate * 100).toFixed(1)}%`);
```

### 5. Performance Testing

```typescript
const perfTest = scenarios.createPerformanceTestScenario(
  workflow,
  { userId: '123', action: 'create' },
  {
    targetLatency: 1000,          // 1 second target
    targetThroughput: 10,         // 10 ops/sec target
    duration: 60000,              // 1 minute test
    percentiles: [50, 95, 99],    // Track these percentiles
  }
);

const result = await scenarios.executeScenario(perfTest.id);

if (result.status === 'passed') {
  console.log('Performance targets met! ✓');
} else {
  console.log('Performance targets NOT met:');
  result.insights.forEach(insight => {
    console.log(`- ${insight.message}`);
  });
}
```

---

## UI Components

### 1. Digital Twin Viewer

```tsx
import { DigitalTwinViewer } from './digitaltwin';

function MyComponent() {
  return (
    <DigitalTwinViewer
      twinId="twin-123"
      simulationId="sim-456"
      realExecutionId="exec-789"
      autoPlay={false}
    />
  );
}
```

Features:
- Side-by-side virtual vs real comparison
- Diff highlighting with severity colors
- Playback controls (play, pause, step, scrub)
- 3 view tabs: Overview, Comparison, Metrics
- Real-time statistics

### 2. Fault Injection Panel

```tsx
import { FaultInjectionPanel } from './digitaltwin';

function MyComponent() {
  return (
    <FaultInjectionPanel
      workflowId="workflow-123"
      nodeId="http-node"
      onFaultCreated={(fault) => {
        console.log(`Created fault: ${fault.name}`);
      }}
    />
  );
}
```

Features:
- Template-based quick creation (13 templates)
- Custom fault configuration
- Probability slider
- Timing configuration
- Chaos mode toggle
- Active scenarios list with enable/disable

---

## Best Practices

### 1. Before Production Deployment

```typescript
// 1. Run commissioning
const commissioningReport = await commissioning.commission(workflow);
if (commissioningReport.status === 'failed') {
  throw new Error('Commissioning failed - not ready for production');
}

// 2. Run regression tests
const testSummary = await testing.runSuite(regressionSuiteId);
if (testSummary.failed > 0) {
  throw new Error('Regression tests failed');
}

// 3. Run performance test
const perfResult = await scenarios.executeScenario(performanceTestId);
if (perfResult.status !== 'passed') {
  throw new Error('Performance targets not met');
}

// 4. Run chaos test
const chaosResult = await scenarios.executeScenario(chaosTestId);
if (chaosResult.metrics.faultRecoveryRate < 0.8) {
  console.warn('Low fault recovery rate - consider improving resilience');
}

console.log('All pre-production checks passed! ✓');
```

### 2. Continuous Testing

```typescript
// Run weekly chaos tests
setInterval(async () => {
  const chaosResult = await scenarios.executeScenario(chaosTestId);

  if (chaosResult.status !== 'passed') {
    // Alert team
    sendAlert('Chaos test failed - workflow resilience degraded');
  }
}, 7 * 24 * 60 * 60 * 1000); // Weekly
```

### 3. Accuracy Monitoring

```typescript
// Track simulation accuracy over time
const stats = manager.getStatistics(twin.id);

if (stats.avgAccuracy < 0.90) {
  console.warn('Simulation accuracy dropping - review twin configuration');
}

if (stats.divergence > 0.2) {
  console.warn('Twin diverging from real workflow - sync required');
  await manager.sync(twin.id, latestExecution);
}
```

---

## Troubleshooting

### Low Simulation Accuracy

```typescript
// 1. Sync twin with latest execution
await manager.sync(twin.id, execution);

// 2. Use connected mode for more accuracy
const result = await manager.simulate(twin.id, input, {
  mode: 'connected',  // Make real API calls
});

// 3. Check comparison differences
const comparison = await twinComparison.compare(
  twin.id,
  virtualExecutionId,
  realExecution
);

comparison.differences.forEach(diff => {
  console.log(`${diff.type} at ${diff.location}: ${diff.description}`);
});
```

### Tests Failing

```typescript
// 1. Check test assertions
const result = await testing.runTest(testId);
result.assertions.forEach(assertion => {
  if (!assertion.passed) {
    console.log(`Failed: ${assertion.message}`);
    console.log(`Expected: ${JSON.stringify(assertion.expected)}`);
    console.log(`Actual: ${JSON.stringify(assertion.actual)}`);
  }
});

// 2. Update expected outputs
testing.updateTest(testId, {
  expectedOutput: newExpectedOutput,
});
```

### Faults Not Injecting

```typescript
// 1. Check fault is enabled
const fault = faultEngine.getScenario(faultId);
if (!fault.enabled) {
  faultEngine.updateScenario(faultId, { enabled: true });
}

// 2. Check probability
if (fault.probability < 1.0) {
  console.log('Fault may not inject every time due to probability');
}

// 3. Use deterministic mode with probability 1.0
const result = await manager.simulate(twin.id, input, {
  deterministic: true,
  faults: [
    faultEngine.updateScenario(faultId, { probability: 1.0 })
  ],
});
```

---

## Next Steps

1. **Try the Examples**: Copy the code examples above and run them
2. **Create Your First Twin**: Start with a simple workflow
3. **Run Commissioning**: Validate an existing workflow
4. **Build Regression Suite**: Generate tests from successful executions
5. **Test Resilience**: Run chaos scenarios weekly

For more information, see:
- [Full Documentation](./AGENT68_DIGITAL_TWIN_COMPLETION_REPORT.md)
- [Type Definitions](./src/digitaltwin/types/digitaltwin.ts)
- [Test Examples](./src/digitaltwin/__tests__/digitaltwin.test.ts)

---

**Happy Testing! 🚀**

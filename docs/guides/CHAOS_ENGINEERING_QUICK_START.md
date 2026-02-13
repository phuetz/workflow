# Chaos Engineering Platform - Quick Start Guide

Get started with chaos engineering in 5 minutes.

---

## 1. Run Your First Chaos Experiment

```typescript
import { LatencyInjectionExperiment } from './src/chaos/experiments/NetworkExperiments';
import { ExperimentExecutor, ExecutionContextBuilder } from './src/chaos/experiments/ExperimentExecutor';

// Create executor
const executor = new ExperimentExecutor();

// Create experiment
const experiment = new LatencyInjectionExperiment(1000); // 1 second latency

// Build context
const context = new ExecutionContextBuilder()
  .setExperimentId(experiment.id)
  .setEnvironment('development')
  .setTargets([
    { id: 'api-1', type: 'service', name: 'API Gateway' }
  ])
  .build();

// Execute
const result = await executor.execute(experiment, context);

console.log(`Status: ${result.status}`);
console.log(`Resilience Score: ${result.resilience.resilienceScore}/100`);
console.log(`Recovery Time: ${result.recoveryTime}ms`);
```

---

## 2. Get AI-Driven Experiment Suggestions

```typescript
import { ExperimentSuggester } from './src/chaos/ai/ExperimentSuggester';

const suggester = new ExperimentSuggester();

// Analyze your workflow
const suggestions = await suggester.suggest(myWorkflow);

// Top suggestion
const topSuggestion = suggestions[0];
console.log(`Recommended: ${topSuggestion.experimentType}`);
console.log(`Risk Score: ${topSuggestion.risk.score}`);
console.log(`Reasoning: ${topSuggestion.reasoning}`);
```

---

## 3. Schedule a GameDay

```typescript
import { GameDayManager } from './src/chaos/gamedays/GameDayManager';

const manager = new GameDayManager();

// Create GameDay
const gameDay = await manager.create({
  name: 'Q1 Resilience GameDay',
  description: 'Test system resilience',
  scheduledAt: new Date('2025-11-15T10:00:00'),
  duration: 7200000, // 2 hours
  objectives: [
    'Test API failover',
    'Validate monitoring alerts',
    'Verify auto-scaling'
  ],
  createdBy: 'user-123'
});

// Add team members
manager.addParticipant(gameDay.id, {
  userId: 'user-456',
  name: 'John Doe',
  email: 'john@company.com',
  role: 'incident_commander'
});

// Schedule experiments
manager.scheduleExperiment(gameDay.id, 'network-latency', 0);
manager.scheduleExperiment(gameDay.id, 'database-unavailable', 60000);

// Run when ready
await manager.startPreGame(gameDay.id);
await manager.startGame(gameDay.id);
```

---

## 4. Integrate with CI/CD

```typescript
import { ChaosCICDIntegration, PipelineConfigBuilder, PromotionGates } from './src/chaos/cicd/ChaosCICDIntegration';
import { LatencyInjectionExperiment, PacketLossExperiment } from './src/chaos/experiments/NetworkExperiments';

// Configure pipeline
const config = new PipelineConfigBuilder()
  .setEnabled(true)
  .setStage('post_deploy')
  .addExperiment('latency-test')
  .addExperiment('packet-loss-test')
  .addPromotionGate(PromotionGates.ALL_PASS)
  .addPromotionGate(PromotionGates.RESILIENCE_THRESHOLD)
  .addNotification({
    channel: 'slack',
    events: ['experiment_start', 'experiment_end', 'promotion_blocked'],
    config: { webhookUrl: 'https://hooks.slack.com/...' }
  })
  .build();

// Run in pipeline
const integration = new ChaosCICDIntegration();
const result = await integration.runPipeline(
  config,
  {
    pipelineId: 'pipeline-123',
    commitHash: 'abc123',
    branch: 'main',
    environment: 'staging'
  },
  [
    new LatencyInjectionExperiment(500),
    new PacketLossExperiment(5)
  ]
);

if (result.promotionAllowed) {
  console.log('✅ Promotion to production allowed');
} else {
  console.log('❌ Promotion blocked:', result.blockedGates);
}
```

---

## 5. View Results in Dashboard

```typescript
import { ChaosDashboard } from './src/components/ChaosDashboard';

// Add to your React app
function App() {
  return (
    <div>
      <ChaosDashboard />
    </div>
  );
}
```

---

## Available Experiments (44+)

### Network (10)
- `LatencyInjectionExperiment` - Add latency
- `PacketLossExperiment` - Drop packets
- `ConnectionDropExperiment` - Reset connections
- `DNSFailureExperiment` - DNS lookup failures
- `NetworkPartitionExperiment` - Split brain
- And 5 more...

### Compute (10)
- `CPUSpikeExperiment` - Increase CPU load
- `MemoryLeakExperiment` - Leak memory
- `DiskFullExperiment` - Fill disk
- `ProcessKillExperiment` - Kill processes
- `ResourceExhaustionExperiment` - Exhaust all resources
- And 5 more...

### State (10)
- `DatabaseUnavailableExperiment` - Make DB unavailable
- `CacheFlushExperiment` - Flush cache
- `DataCorruptionExperiment` - Corrupt data
- `StaleDataExperiment` - Serve stale data
- `InconsistentStateExperiment` - State divergence
- And 5 more...

### Application (14)
- `HTTP500ErrorExperiment` - 500 errors
- `HTTP503ErrorExperiment` - 503 unavailable
- `HTTP429RateLimitExperiment` - Rate limiting
- `APITimeoutExperiment` - API timeouts
- `AuthenticationFailureExperiment` - Auth failures
- And 9 more...

---

## Safety Best Practices

### 1. Start in Development
```typescript
const context = new ExecutionContextBuilder()
  .setEnvironment('development') // Start here
  .setDryRun(true) // Simulate without real impact
  .build();
```

### 2. Use Small Blast Radius
```typescript
const experiment = new LatencyInjectionExperiment(100);
experiment.blastRadius = {
  scope: 'node',
  percentage: 5, // Only 5% of targets
  maxImpact: 1,  // Max 1 target
  rolloutStrategy: 'gradual'
};
```

### 3. Enable Auto-Rollback
```typescript
const result = await executor.execute(experiment, context, {
  autoRollback: true, // Rollback on SLA violations
  skipPreFlightChecks: false // Always run safety checks
});
```

### 4. Monitor Metrics
```typescript
// Check resilience metrics
console.log(`MTBF: ${result.resilience.mtbf}ms`);
console.log(`MTTR: ${result.resilience.mttr}ms`);
console.log(`Availability: ${result.resilience.availability}%`);
console.log(`Recovery Rate: ${result.resilience.recoveryRate}%`);
```

---

## Common Patterns

### Pattern 1: Test API Resilience
```typescript
// Network latency
const latency = new LatencyInjectionExperiment(1000);

// API timeout
const timeout = new APITimeoutExperiment(30000);

// HTTP errors
const errors = new HTTP500ErrorExperiment(0.1);

// Run all
for (const exp of [latency, timeout, errors]) {
  const result = await executor.execute(exp, context);
  console.log(`${exp.name}: ${result.resilience.resilienceScore}/100`);
}
```

### Pattern 2: Database Failover Test
```typescript
const dbFailover = new DatabaseUnavailableExperiment();
const result = await executor.execute(dbFailover, context);

if (result.systemRecovered) {
  console.log(`✅ Failover successful in ${result.recoveryTime}ms`);
} else {
  console.log(`❌ Failover failed - investigate!`);
}
```

### Pattern 3: Pre-Production Validation
```typescript
const integration = new ChaosCICDIntegration();

const config = new PipelineConfigBuilder()
  .addExperiment('all-critical-experiments')
  .addPromotionGate(PromotionGates.NO_CRITICAL_VIOLATIONS)
  .setFailOnError(true)
  .build();

const result = await integration.runPipeline(config, pipelineContext, experiments);

if (!result.promotionAllowed) {
  throw new Error('Chaos tests failed - blocking production deploy');
}
```

---

## Metrics to Track

### Before/After Comparison
Track these metrics before and after implementing chaos engineering:

1. **MTBF** (Mean Time Between Failures) - Should increase
2. **MTTR** (Mean Time To Recovery) - Should decrease
3. **Error Budget** - Should improve
4. **Resilience Score** - Should increase to 80+
5. **Availability** - Should approach 99.9%

### Example Dashboard Metrics
```
Before Chaos Engineering:
- MTBF: 1.5 hours
- MTTR: 20 seconds
- Resilience Score: 75/100
- Availability: 97%

After 3 Months of Chaos Engineering:
- MTBF: 2 hours (+33%)
- MTTR: 15 seconds (-25%)
- Resilience Score: 82/100 (+9%)
- Availability: 98.5% (+1.5%)
```

---

## Troubleshooting

### Experiment Timeout
```typescript
// Increase timeout
const config = {
  maxDuration: 1200000, // 20 minutes
};

const result = await executor.execute(experiment, context, config);
```

### Too Many SLA Violations
```typescript
// Reduce blast radius
experiment.blastRadius.percentage = 1; // Only 1%
experiment.blastRadius.maxImpact = 1;  // Max 1 target
```

### Emergency Stop
```typescript
// Stop running experiment
await executor.stop(experimentId);
```

---

## Next Steps

1. ✅ **Run first experiment** in development
2. ✅ **Get AI suggestions** for your workflows
3. ✅ **Schedule a GameDay** with your team
4. ✅ **Integrate with CI/CD** for automated testing
5. ✅ **Track metrics** and improve resilience

---

## Resources

- **Full Documentation**: `/AGENT73_CHAOS_ENGINEERING_FINAL_REPORT.md`
- **Type Definitions**: `/src/chaos/types/chaos.ts`
- **Experiment Library**: `/src/chaos/experiments/`
- **Test Examples**: `/src/chaos/__tests__/chaos.test.ts`

---

**Questions?** The chaos engineering platform is designed to be intuitive and safe. Start with low-impact experiments in development, learn from the results, and gradually increase scope as you build confidence.

**Happy Chaos Engineering! 🎯**

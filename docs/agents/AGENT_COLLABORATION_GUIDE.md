# Agent Collaboration Guide

## Overview

This guide explains the enhanced multi-agent AI system with agent-as-tool capability, enabling autonomous delegation and sophisticated collaboration patterns.

## Table of Contents

- [Agent-as-Tool Capability](#agent-as-tool-capability)
- [Tool Discovery](#tool-discovery)
- [Task Delegation](#task-delegation)
- [Collaboration Patterns](#collaboration-patterns)
- [Consensus Building](#consensus-building)
- [Task Decomposition](#task-decomposition)
- [Performance Optimization](#performance-optimization)
- [Best Practices](#best-practices)

---

## Agent-as-Tool Capability

### Overview

The agent-as-tool capability allows any agent to be wrapped as an executable tool that other agents can discover and use autonomously.

### Wrapping an Agent as a Tool

```typescript
import { AgentBase } from './ai/agents/AgentBase';
import { AgentToolWrapper, AgentToolFactory } from './ai/agents/AgentTool';

// Create an agent
const emailAgent = new EmailAgent({
  id: 'email-agent-1',
  name: 'Email Processor',
  capabilities: ['text-generation', 'api-integration'],
});

// Wrap it as a tool
const factory = AgentToolFactory.getInstance();
const emailTool = factory.createTool(emailAgent, {
  name: 'email-processor',
  description: 'Process and send emails using AI',
  cost: 0.01, // $0.01 per execution
});

// Now other agents can use this tool
const result = await emailTool.execute({
  task: 'Send welcome email',
  data: { recipientEmail: 'user@example.com', userName: 'John' },
});
```

### Tool Definition for LLMs

```typescript
// Get a tool definition suitable for LLM tool use
const toolDefinition = emailTool.toToolDefinition();

// Returns:
{
  name: 'email-processor',
  description: 'Process and send emails using AI',
  parameters: {
    type: 'object',
    properties: {
      task: { type: 'string', description: 'The task description' },
      data: { type: 'object', description: 'Input data' },
      priority: { type: 'string', enum: ['low', 'medium', 'high'] }
    },
    required: ['task']
  }
}
```

### Tool Metrics

```typescript
// Track tool performance
const metrics = emailTool.getMetrics();

console.log(metrics);
// {
//   toolId: 'agent-tool-email-agent-1',
//   executionCount: 150,
//   successCount: 145,
//   failureCount: 5,
//   successRate: 0.967,
//   averageExecutionTime: 1200, // ms
//   totalCost: 1.50
// }
```

---

## Tool Discovery

### Dynamic Agent Tool Discovery

The ToolDiscovery service automatically finds the best agent tools for specific tasks.

```typescript
import { ToolDiscovery } from './ai/agents/ToolDiscovery';
import { AgentRegistry } from './ai/agents/AgentRegistry';

const registry = new AgentRegistry();
const discovery = new ToolDiscovery(registry);

// Discover by description (semantic search)
const tools = await discovery.discoverByDescription(
  'Send email notifications to users',
  { maxTools: 3, minConfidence: 0.7 }
);

// Discover by capability
const dataTools = await discovery.discoverByCapability(
  ['data-processing', 'api-integration'],
  { maxTools: 5 }
);

// Get the single best tool for a task
const bestTool = await discovery.getBestTool(
  'Process customer feedback and extract sentiment',
  ['text-generation', 'reasoning']
);
```

### Discovery Performance

- **Discovery latency**: < 50ms (with caching)
- **Cache hit rate**: > 60% typical
- **Index update**: Every 60 seconds (automatic)

```typescript
// Get discovery statistics
const stats = discovery.getStats();

console.log(stats);
// {
//   totalTools: 25,
//   cacheSize: 150,
//   cacheHitRate: 0.65,
//   indexedCapabilities: 12,
//   indexedTerms: 342,
//   averageDiscoveryTime: 35 // ms
// }
```

---

## Task Delegation

### Autonomous Delegation

The DelegationManager enables agents to autonomously delegate tasks to other agents.

```typescript
import { DelegationManager } from './ai/agents/DelegationManager';

const delegationManager = new DelegationManager(registry, {
  maxDelegationDepth: 5,
  maxConcurrentDelegations: 50,
  enableAutoDelegation: true,
  minConfidenceThreshold: 0.7,
});

// Delegate a task
const result = await delegationManager.delegate(coordinatorAgent, {
  description: 'Process customer order and send confirmation',
  input: { data: { orderId: '12345', customerId: 'C789' } },
  requiredCapabilities: ['data-processing', 'api-integration'],
  priority: 'high',
});

console.log(result);
// {
//   delegationId: 'delegation_1234567890_abc',
//   fromAgent: 'Coordinator',
//   toAgent: 'OrderProcessor',
//   output: { result: { orderId: '12345', status: 'confirmed' } },
//   executionTime: 850,
//   depth: 1,
//   success: true
// }
```

### Delegation to Specific Agent

```typescript
// Delegate to a specific agent
const result = await delegationManager.delegateTo(
  coordinatorAgent,
  'email-agent-1', // target agent ID
  {
    description: 'Send order confirmation',
    input: { data: { orderId: '12345' } },
  }
);
```

### Parallel Delegation

```typescript
// Delegate to multiple agents in parallel
const results = await delegationManager.delegateParallel(
  coordinatorAgent,
  {
    description: 'Analyze customer feedback from multiple sources',
    input: { data: { feedbackSources: ['email', 'survey', 'social'] } },
  },
  3 // number of agents to use
);

// Returns array of results from all agents
results.forEach(r => console.log(r.output));
```

### Delegation Statistics

```typescript
const stats = delegationManager.getStats();

console.log(stats);
// {
//   totalDelegations: 1250,
//   activeDelegations: 12,
//   completedDelegations: 1200,
//   failedDelegations: 38,
//   successRate: 0.969,
//   averageExecutionTime: 1850,
//   averageDepth: 1.8,
//   maxDepth: 4,
//   delegationsByAgent: { 'agent-1': 450, 'agent-2': 800 }
// }
```

---

## Collaboration Patterns

### Sequential Collaboration

Agents process tasks in sequence, where each agent's output becomes the next agent's input.

```typescript
import { CollaborationPatterns } from './ai/collaboration/CollaborationPatterns';

const collaboration = new CollaborationPatterns(registry, delegationManager);

const result = await collaboration.sequential(
  [dataExtractorAgent, analyzerAgent, reportGeneratorAgent],
  { data: { document: 'customer-feedback.pdf' } }
);

// Execution flow: Extractor → Analyzer → Reporter
console.log(result);
// {
//   pattern: 'sequential',
//   steps: [
//     { agentName: 'DataExtractor', output: {...}, executionTime: 500 },
//     { agentName: 'Analyzer', output: {...}, executionTime: 1200 },
//     { agentName: 'ReportGenerator', output: {...}, executionTime: 800 }
//   ],
//   finalOutput: { result: 'generated-report.pdf' },
//   totalExecutionTime: 2500,
//   success: true
// }
```

### Parallel Collaboration

Multiple agents work simultaneously on the same task, with results aggregated at the end.

```typescript
const result = await collaboration.parallel(
  [agent1, agent2, agent3],
  { data: { text: 'Analyze this content' } },
  'merge' // aggregation strategy: merge | vote | average | best
);

// All agents run in parallel
console.log(result);
// {
//   pattern: 'parallel',
//   results: [...], // results from all agents
//   aggregatedOutput: { result: [...] }, // merged results
//   successCount: 3,
//   failureCount: 0
// }
```

### Hierarchical Collaboration

Coordinator agent + worker agents. Coordinator delegates to workers and aggregates results.

```typescript
const result = await collaboration.hierarchical(
  coordinatorAgent,
  [worker1, worker2, worker3],
  { data: { task: 'Process large dataset' } }
);

// Workers execute in parallel, coordinator aggregates
console.log(result);
// {
//   pattern: 'hierarchical',
//   coordinator: { agentName: 'Coordinator', output: {...} },
//   workers: [...], // worker results
//   finalOutput: { result: 'aggregated-analysis' },
//   success: true
// }
```

### Pipeline Collaboration

Data flows through a series of transformation stages.

```typescript
const result = await collaboration.pipeline(
  [
    {
      name: 'Extract',
      agentId: 'extractor-agent',
      transform: (data) => extractFields(data),
    },
    {
      name: 'Validate',
      agentId: 'validator-agent',
      transform: (data) => validateData(data),
    },
    {
      name: 'Enrich',
      agentId: 'enricher-agent',
      transform: (data) => enrichWithExternalData(data),
    },
  ],
  { rawData: '...' }
);
```

### Debate Collaboration

Agents discuss and refine a solution through multiple rounds.

```typescript
const result = await collaboration.debate(
  [agent1, agent2, agent3],
  'What is the best architecture for this system?',
  { data: { requirements: {...} } },
  3 // number of rounds
);

// Agents iterate on each other's responses
console.log(result);
// {
//   pattern: 'debate',
//   topic: 'What is the best architecture...',
//   rounds: [
//     { roundNumber: 1, responses: [...] },
//     { roundNumber: 2, responses: [...] },
//     { roundNumber: 3, responses: [...] }
//   ],
//   finalResponses: [...] // refined consensus
// }
```

---

## Consensus Building

### Majority Vote

```typescript
import { ConsensusManager } from './ai/collaboration/ConsensusManager';

const consensus = new ConsensusManager();

const outputs = [
  { result: 'Option A', confidence: 0.9, metadata: {} },
  { result: 'Option A', confidence: 0.85, metadata: {} },
  { result: 'Option B', confidence: 0.7, metadata: {} },
];

const result = await consensus.buildConsensus(outputs, 'majority-vote');

console.log(result);
// {
//   strategy: 'majority-vote',
//   consensusOutput: { result: 'Option A', confidence: 0.875 },
//   agreement: 0.667, // 66.7% agreed
//   participantCount: 3
// }
```

### Weighted Vote

Weight votes by confidence scores.

```typescript
const result = await consensus.buildConsensus(outputs, 'weighted-vote');
// Higher confidence votes carry more weight
```

### Consensus Strategies

- **majority-vote**: Most common result wins
- **weighted-vote**: Weighted by confidence scores
- **average**: Average numeric results
- **median**: Median of numeric results
- **unanimous**: Requires 100% agreement
- **highest-confidence**: Use result with highest confidence
- **consensus-threshold**: Require X% agreement

### Disagreement Analysis

```typescript
const analysis = consensus.analyzeDisagreement(outputs);

console.log(analysis);
// {
//   totalGroups: 3,
//   diversity: 0.75, // high diversity = more disagreement
//   distribution: [
//     { result: 'A', count: 5, percentage: 0.5, averageConfidence: 0.85 },
//     { result: 'B', count: 3, percentage: 0.3, averageConfidence: 0.75 },
//     { result: 'C', count: 2, percentage: 0.2, averageConfidence: 0.80 }
//   ],
//   hasStrongDisagreement: true
// }
```

---

## Task Decomposition

### Automatic Decomposition

Break complex tasks into manageable subtasks.

```typescript
import { TaskDecomposition } from './ai/collaboration/TaskDecomposition';

const decomposition = new TaskDecomposition(registry);

const result = await decomposition.decompose(
  {
    description: 'Process 10,000 customer records',
    input: { data: largeDataset },
    allowParallel: true,
  },
  'auto' // auto | sequential | parallel | capability-based
);

console.log(result);
// {
//   originalTask: {...},
//   subtasks: [
//     { id: 'subtask-1', description: '...', dependencies: [] },
//     { id: 'subtask-2', description: '...', dependencies: ['subtask-1'] },
//     ...
//   ],
//   strategy: 'parallel',
//   executionPlan: [
//     { stepNumber: 1, subtaskIds: ['subtask-1', 'subtask-2'], parallel: true },
//     { stepNumber: 2, subtaskIds: ['subtask-3'], parallel: false }
//   ],
//   totalSubtasks: 4,
//   estimatedTime: 5000
// }
```

### Execute Decomposed Task

```typescript
const executionResult = await decomposition.executeDecomposed(result);

console.log(executionResult);
// {
//   subtaskResults: [...],
//   aggregatedOutput: { result: 'processed 10,000 records' },
//   totalExecutionTime: 4800,
//   successRate: 1.0,
//   success: true
// }
```

### Decomposition Strategies

- **auto**: Automatically choose best strategy
- **sequential**: Break into sequential steps
- **parallel**: Break into independent parallel tasks
- **capability-based**: Decompose by required capabilities

---

## Performance Optimization

### Caching

Reduce LLM calls with intelligent caching (60%+ hit rate typical).

```typescript
import { GlobalAgentCache } from './ai/optimization/AgentCache';

const cache = GlobalAgentCache.getInstance({
  maxSize: 1000,
  defaultTTL: 3600000, // 1 hour
});

// Cache is used automatically by orchestrator
// Check cache manually
const cached = await cache.get(agentId, input);
if (!cached) {
  const output = await agent.execute(input);
  await cache.set(agentId, input, output);
}

// Get cache statistics
const stats = cache.getStats();
console.log(stats);
// {
//   size: 450,
//   hitRate: 0.68, // 68% hit rate
//   totalSize: 15728640, // bytes
//   hitCount: 680,
//   missCount: 320
// }
```

### Load Balancing

Distribute tasks across agents optimally.

```typescript
import { LoadBalancer } from './ai/optimization/LoadBalancer';

const loadBalancer = new LoadBalancer(registry, {
  strategy: 'least-loaded', // round-robin | least-loaded | weighted | random
  maxLoadPerAgent: 10,
});

// Select best agent for task
const agent = loadBalancer.selectAgent(task);

// Mark task as completed
await agent.executeTask(task);
loadBalancer.taskCompleted(agent.id);

// Get load statistics
const stats = loadBalancer.getStats();
console.log(stats);
// {
//   totalAgents: 10,
//   totalLoad: 45,
//   averageLoad: 4.5,
//   maxLoad: 8,
//   minLoad: 2,
//   utilizationPercent: 45%
// }
```

### Performance Monitoring

Track latency, success rate, and costs.

```typescript
import { PerformanceMonitor } from './ai/optimization/PerformanceMonitor';

const monitor = new PerformanceMonitor({
  alertThresholds: {
    latency: 5000, // 5s
    errorRate: 0.2, // 20%
    costPerTask: 1.0, // $1
  },
});

// Monitor automatically records executions
const report = monitor.getReport();

console.log(report);
// {
//   totalTasks: 1500,
//   totalErrors: 30,
//   averageLatency: 850, // ms
//   errorRate: 0.02,
//   totalCost: 45.50,
//   bottlenecks: [
//     { type: 'latency', agentId: 'slow-agent', severity: 'high' }
//   ],
//   topPerformers: [
//     { agentName: 'FastAgent', successRate: 0.99, averageLatency: 200 }
//   ]
// }
```

---

## Best Practices

### 1. Tool Registration

Register agents as tools early in the lifecycle.

```typescript
// At startup
const orchestrator = new AgentOrchestrator();
await orchestrator.start();

// Register all agents as tools
const agents = [emailAgent, dataAgent, reportAgent];
agents.forEach(agent => {
  orchestrator.registerAgentAsTool(agent);
});
```

### 2. Capability-Based Selection

Always specify capabilities for better tool discovery.

```typescript
// Good: Specific capabilities
const tool = await discovery.getBestTool(
  'Extract data from PDF',
  ['data-processing', 'file-operations']
);

// Less optimal: No capabilities specified
const tool = await discovery.getBestTool('Extract data from PDF');
```

### 3. Caching Strategy

Cache expensive operations, but consider freshness requirements.

```typescript
// Long TTL for static data
await cache.set(agentId, input, output, 86400000); // 24 hours

// Short TTL for dynamic data
await cache.set(agentId, input, output, 300000); // 5 minutes

// Invalidate when data changes
cache.invalidate(agentId, input);
```

### 4. Error Handling

Always handle delegation errors gracefully.

```typescript
try {
  const result = await delegationManager.delegate(agent, task);
} catch (error) {
  // Log error
  logger.error('Delegation failed', error);

  // Fallback strategy
  const fallbackAgent = registry.get(task.fallbackAgentId);
  if (fallbackAgent) {
    const result = await fallbackAgent.executeTask(task);
  }
}
```

### 5. Monitor Performance

Regularly check performance metrics and address bottlenecks.

```typescript
// Schedule periodic checks
setInterval(() => {
  const report = monitor.getReport();

  if (report.bottlenecks.length > 0) {
    report.bottlenecks.forEach(bottleneck => {
      logger.warn('Performance bottleneck detected', bottleneck);
      // Take corrective action
    });
  }
}, 300000); // Every 5 minutes
```

### 6. Delegation Depth

Limit delegation depth to prevent infinite loops.

```typescript
const delegationManager = new DelegationManager(registry, {
  maxDelegationDepth: 5, // Prevent deep recursion
});
```

### 7. Cost Optimization

Monitor and optimize LLM costs.

```typescript
// Use cheaper models for simple tasks
const simpleAgent = new Agent({
  config: {
    llmModel: 'gpt-3.5-turbo', // Cheaper
  },
});

// Reserve expensive models for complex tasks
const complexAgent = new Agent({
  config: {
    llmModel: 'gpt-4', // More expensive but more capable
  },
});

// Track costs
const stats = monitor.getReport();
console.log(`Total cost: $${stats.totalCost}`);
```

---

## Example: Complete Workflow

```typescript
import { AgentOrchestrator } from './ai/agents/AgentOrchestrator';

// 1. Initialize system
const orchestrator = new AgentOrchestrator();
await orchestrator.start();

// 2. Register agents
await orchestrator.registerAgent(emailAgent);
await orchestrator.registerAgent(dataAgent);
await orchestrator.registerAgent(reportAgent);

// 3. Register as tools
orchestrator.registerAgentAsTool(emailAgent);
orchestrator.registerAgentAsTool(dataAgent);
orchestrator.registerAgentAsTool(reportAgent);

// 4. Execute task with automatic delegation
const task = {
  id: 'task-1',
  description: 'Process customer feedback and send report',
  input: { data: { feedbackFile: 'feedback.csv' } },
};

const result = await orchestrator.executeTask(task);

// 5. Check performance
const perfReport = orchestrator.getPerformanceReport();
const cacheStats = orchestrator.getCacheStats();
const delegationStats = orchestrator.getDelegationStats();

console.log('Performance:', perfReport);
console.log('Cache hit rate:', cacheStats.hitRate);
console.log('Delegations:', delegationStats.totalDelegations);

// 6. Shutdown
await orchestrator.shutdown();
```

---

## Performance Metrics

### Expected Performance

- **Agent-as-tool latency**: < 100ms
- **Tool discovery**: < 50ms (with cache)
- **Cache hit rate**: > 60%
- **Cost reduction**: ~30% through caching
- **Supported tools**: 20+ concurrent agent tools
- **Max delegation depth**: 5 levels
- **Concurrent delegations**: 50+

### Benchmarks

| Operation | Latency (ms) | Throughput |
|-----------|--------------|------------|
| Tool discovery (cached) | 15-35 | 1000+/sec |
| Tool discovery (uncached) | 80-120 | 100+/sec |
| Agent delegation | 200-500 | 50+/sec |
| Sequential collaboration (3 agents) | 800-1500 | - |
| Parallel collaboration (3 agents) | 400-700 | - |
| Cache lookup | 1-5 | 10000+/sec |
| Consensus building | 5-20 | 500+/sec |

---

## Troubleshooting

### High Latency

```typescript
const report = monitor.getReport();

// Check for bottlenecks
report.bottlenecks.forEach(bottleneck => {
  console.log(`Bottleneck: ${bottleneck.agentName}`);
  console.log(`Severity: ${bottleneck.severity}`);
  console.log(`Description: ${bottleneck.description}`);
});

// Solution: Scale out or optimize slow agents
```

### Low Cache Hit Rate

```typescript
const cacheStats = cache.getStats();

if (cacheStats.hitRate < 0.4) {
  // Increase cache size
  cache = new AgentCache({ maxSize: 2000, defaultTTL: 7200000 });

  // Or increase TTL for stable data
}
```

### Delegation Failures

```typescript
const delegationStats = delegationManager.getStats();

if (delegationStats.successRate < 0.9) {
  // Check failed delegations
  const history = delegationManager.getDelegationHistory();
  const failures = history.filter(d => d.status === 'failed');

  failures.forEach(f => {
    console.log(`Failed delegation: ${f.id}`);
    console.log(`Error: ${f.error?.message}`);
  });
}
```

---

## Support

For issues, questions, or contributions, please refer to the main project documentation.

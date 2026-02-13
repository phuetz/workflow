import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentBase } from '../ai/agents/AgentBase';
import { AgentRegistry } from '../ai/agents/AgentRegistry';
import { AgentToolWrapper, AgentToolFactory } from '../ai/agents/AgentTool';
import { ToolDiscovery } from '../ai/agents/AgentTool Discovery';
import { DelegationManager } from '../ai/agents/DelegationManager';
import { AgentCache } from '../ai/optimization/AgentCache';
import { LoadBalancer } from '../ai/optimization/LoadBalancer';
import { PerformanceMonitor } from '../ai/optimization/PerformanceMonitor';
import { CollaborationPatterns } from '../ai/collaboration/CollaborationPatterns';
import { ConsensusManager } from '../ai/collaboration/ConsensusManager';
import { TaskDecomposition } from '../ai/collaboration/TaskDecomposition';
import { AgentInput, AgentOutput, AgentTask, AgentCapability } from '../types/agents';

// Mock agent for testing
class TestAgent extends AgentBase {
  constructor(id: string, name: string, capabilities: AgentCapability[] = []) {
    super({
      id,
      name,
      description: `Test agent: ${name}`,
      type: 'custom',
      capabilities,
    });
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    return {
      result: `Processed by ${this.name}: ${JSON.stringify(input.data)}`,
      confidence: 0.9,
      metadata: {},
    };
  }
}

describe('Agent-as-Tool System', () => {
  describe('AgentToolWrapper', () => {
    it('should wrap an agent as a tool', async () => {
      const agent = new TestAgent('test-1', 'TestAgent1', ['text-generation']);
      const tool = new AgentToolWrapper(agent);

      expect(tool.id).toContain('agent-tool-');
      expect(tool.name).toBe('TestAgent1-tool');
      expect(tool.type).toBe('custom');
      expect(tool.category).toBe('ai-ml');
    });

    it('should execute agent through tool interface', async () => {
      const agent = new TestAgent('test-1', 'TestAgent1');
      const tool = new AgentToolWrapper(agent);

      await agent.start();

      const result = await tool.execute({
        task: 'Test task',
        data: { test: 'data' },
      });

      expect(result.toolId).toBe(tool.id);
      expect(result.result).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should track tool metrics', async () => {
      const agent = new TestAgent('test-1', 'TestAgent1');
      const tool = new AgentToolWrapper(agent);

      await agent.start();
      await tool.execute({ task: 'Test 1' });
      await tool.execute({ task: 'Test 2' });

      const metrics = tool.getMetrics();
      expect(metrics.executionCount).toBe(2);
      expect(metrics.successCount).toBe(2);
      expect(metrics.successRate).toBe(1);
    });

    it('should generate LLM tool definition', () => {
      const agent = new TestAgent('test-1', 'TestAgent1');
      const tool = new AgentToolWrapper(agent);

      const definition = tool.toToolDefinition();

      expect(definition.name).toBe('TestAgent1-tool');
      expect(definition.description).toContain('TestAgent1');
      expect(definition.parameters.type).toBe('object');
      expect(definition.parameters.required).toContain('task');
    });
  });

  describe('AgentToolFactory', () => {
    it('should create tools from agents', () => {
      const factory = AgentToolFactory.getInstance();
      factory.clear();

      const agent1 = new TestAgent('test-1', 'Agent1');
      const agent2 = new TestAgent('test-2', 'Agent2');

      const tool1 = factory.createTool(agent1);
      const tool2 = factory.createTool(agent2);

      expect(factory.getAllTools()).toHaveLength(2);
      expect(tool1.getAgent().id).toBe('test-1');
      expect(tool2.getAgent().id).toBe('test-2');
    });

    it('should get tools by capability', () => {
      const factory = AgentToolFactory.getInstance();
      factory.clear();

      const agent1 = new TestAgent('test-1', 'Agent1', ['text-generation']);
      const agent2 = new TestAgent('test-2', 'Agent2', ['data-processing']);
      const agent3 = new TestAgent('test-3', 'Agent3', ['text-generation']);

      factory.createTool(agent1);
      factory.createTool(agent2);
      factory.createTool(agent3);

      const textGenTools = factory.getToolsByCapability('text-generation');
      expect(textGenTools).toHaveLength(2);
    });

    it('should provide factory statistics', async () => {
      const factory = AgentToolFactory.getInstance();
      factory.clear();

      const agent = new TestAgent('test-1', 'Agent1', ['text-generation']);
      await agent.start();

      const tool = factory.createTool(agent);
      await tool.execute({ task: 'Test' });

      const stats = factory.getStats();
      expect(stats.totalTools).toBe(1);
      expect(stats.totalExecutions).toBe(1);
      expect(stats.totalSuccesses).toBe(1);
    });
  });

  describe('ToolDiscovery', () => {
    let registry: AgentRegistry;
    let discovery: ToolDiscovery;

    beforeEach(() => {
      registry = new AgentRegistry();
      discovery = new ToolDiscovery(registry);
    });

    it('should discover tools by capability', async () => {
      const agent1 = new TestAgent('test-1', 'Agent1', ['text-generation']);
      const agent2 = new TestAgent('test-2', 'Agent2', ['data-processing']);

      await registry.register(agent1);
      await registry.register(agent2);

      const tools = await discovery.discoverByCapability(['text-generation']);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools[0].getAgent().capabilities).toContain('text-generation');
    });

    it('should discover tools by description', async () => {
      const agent = new TestAgent('test-1', 'EmailAgent', ['text-generation']);
      await registry.register(agent);

      const tools = await discovery.discoverByDescription('send email');
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should provide discovery statistics', () => {
      const stats = discovery.getStats();
      expect(stats).toHaveProperty('totalTools');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('indexedCapabilities');
    });
  });

  describe('DelegationManager', () => {
    let registry: AgentRegistry;
    let delegationManager: DelegationManager;

    beforeEach(() => {
      registry = new AgentRegistry();
      delegationManager = new DelegationManager(registry);
    });

    it('should delegate task to best agent', async () => {
      const agent1 = new TestAgent('test-1', 'Agent1', ['text-generation']);
      const agent2 = new TestAgent('test-2', 'Agent2', ['data-processing']);

      await registry.register(agent1);
      await registry.register(agent2);

      const result = await delegationManager.delegate(agent1, {
        description: 'Process data',
        input: { data: { test: 'data' } },
        requiredCapabilities: ['data-processing'],
      });

      expect(result.success).toBe(true);
      expect(result.toAgent).toBe('Agent2');
    });

    it('should track delegation statistics', async () => {
      const agent1 = new TestAgent('test-1', 'Agent1');
      const agent2 = new TestAgent('test-2', 'Agent2');

      await registry.register(agent1);
      await registry.register(agent2);

      await delegationManager.delegate(agent1, {
        description: 'Test task',
        input: { data: {} },
      });

      const stats = delegationManager.getStats();
      expect(stats.totalDelegations).toBe(1);
      expect(stats.completedDelegations).toBe(1);
      expect(stats.successRate).toBe(1);
    });
  });

  describe('AgentCache', () => {
    let cache: AgentCache;

    beforeEach(() => {
      cache = new AgentCache({ maxSize: 100, defaultTTL: 60000 });
    });

    it('should cache agent results', async () => {
      const input: AgentInput = { data: { test: 'data' } };
      const output: AgentOutput = { result: 'test result', metadata: {} };

      await cache.set('agent-1', input, output);

      const cached = await cache.get('agent-1', input);
      expect(cached).toEqual(output);
    });

    it('should return null for cache miss', async () => {
      const input: AgentInput = { data: { test: 'data' } };
      const cached = await cache.get('agent-1', input);

      expect(cached).toBeNull();
    });

    it('should track cache hit rate', async () => {
      const input: AgentInput = { data: { test: 'data' } };
      const output: AgentOutput = { result: 'test result', metadata: {} };

      await cache.set('agent-1', input, output);

      await cache.get('agent-1', input); // Hit
      await cache.get('agent-2', input); // Miss

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(1);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should expire cached entries', async () => {
      cache = new AgentCache({ maxSize: 100, defaultTTL: 100 }); // 100ms TTL

      const input: AgentInput = { data: { test: 'data' } };
      const output: AgentOutput = { result: 'test result', metadata: {} };

      await cache.set('agent-1', input, output);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      const cached = await cache.get('agent-1', input);
      expect(cached).toBeNull();
    });
  });

  describe('LoadBalancer', () => {
    let registry: AgentRegistry;
    let loadBalancer: LoadBalancer;

    beforeEach(() => {
      registry = new AgentRegistry();
      loadBalancer = new LoadBalancer(registry, { strategy: 'least-loaded' });
    });

    it('should select agent using round-robin', async () => {
      loadBalancer = new LoadBalancer(registry, { strategy: 'round-robin' });

      const agent1 = new TestAgent('test-1', 'Agent1');
      const agent2 = new TestAgent('test-2', 'Agent2');

      await registry.register(agent1);
      await registry.register(agent2);

      const task: AgentTask = {
        id: 'task-1',
        agentId: '',
        type: 'custom',
        input: { data: {} },
        status: 'pending',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        metadata: {},
        retryCount: 0,
        maxRetries: 3,
      };

      const selected1 = loadBalancer.selectAgent(task);
      const selected2 = loadBalancer.selectAgent(task);

      expect(selected1?.id).not.toBe(selected2?.id);
    });

    it('should track agent load', () => {
      const stats = loadBalancer.getStats();
      expect(stats).toHaveProperty('totalLoad');
      expect(stats).toHaveProperty('averageLoad');
      expect(stats).toHaveProperty('loadByAgent');
    });
  });

  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor();
    });

    it('should record task execution', async () => {
      const agent = new TestAgent('test-1', 'Agent1');
      await agent.start();

      const task: AgentTask = {
        id: 'task-1',
        agentId: agent.id,
        type: 'custom',
        input: { data: {} },
        status: 'pending',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        metadata: {},
        retryCount: 0,
        maxRetries: 3,
      };

      const output: AgentOutput = { result: 'test', metadata: {} };

      monitor.recordExecution(agent, task, output, 100);

      const metrics = monitor.getMetrics(agent.id);
      expect(metrics?.totalTasks).toBe(1);
      expect(metrics?.successfulTasks).toBe(1);
      expect(metrics?.averageLatency).toBe(100);
    });

    it('should generate performance report', async () => {
      const agent = new TestAgent('test-1', 'Agent1');
      await agent.start();

      const task: AgentTask = {
        id: 'task-1',
        agentId: agent.id,
        type: 'custom',
        input: { data: {} },
        status: 'pending',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        metadata: {},
        retryCount: 0,
        maxRetries: 3,
      };

      const output: AgentOutput = { result: 'test', metadata: {} };

      monitor.recordExecution(agent, task, output, 100);

      const report = monitor.getReport();
      expect(report.totalTasks).toBe(1);
      expect(report.totalAgents).toBe(1);
      expect(report.averageLatency).toBe(100);
    });
  });

  describe('CollaborationPatterns', () => {
    let registry: AgentRegistry;
    let delegationManager: DelegationManager;
    let collaboration: CollaborationPatterns;

    beforeEach(() => {
      registry = new AgentRegistry();
      delegationManager = new DelegationManager(registry);
      collaboration = new CollaborationPatterns(registry, delegationManager);
    });

    it('should execute sequential collaboration', async () => {
      const agent1 = new TestAgent('test-1', 'Agent1');
      const agent2 = new TestAgent('test-2', 'Agent2');

      await agent1.start();
      await agent2.start();

      const result = await collaboration.sequential(
        [agent1, agent2],
        { data: { initial: 'data' } }
      );

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(2);
      expect(result.finalOutput).toBeDefined();
    });

    it('should execute parallel collaboration', async () => {
      const agent1 = new TestAgent('test-1', 'Agent1');
      const agent2 = new TestAgent('test-2', 'Agent2');

      await agent1.start();
      await agent2.start();

      const result = await collaboration.parallel(
        [agent1, agent2],
        { data: { test: 'data' } }
      );

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.aggregatedOutput).toBeDefined();
    });
  });

  describe('ConsensusManager', () => {
    let consensus: ConsensusManager;

    beforeEach(() => {
      consensus = new ConsensusManager();
    });

    it('should build consensus using majority vote', async () => {
      const outputs: AgentOutput[] = [
        { result: 'A', confidence: 0.9, metadata: {} },
        { result: 'A', confidence: 0.8, metadata: {} },
        { result: 'B', confidence: 0.7, metadata: {} },
      ];

      const result = await consensus.buildConsensus(outputs, 'majority-vote');

      expect(result.consensusOutput.result).toBe('A');
      expect(result.agreement).toBeGreaterThan(0.5);
    });

    it('should use weighted vote strategy', async () => {
      const outputs: AgentOutput[] = [
        { result: 'A', confidence: 0.9, metadata: {} },
        { result: 'B', confidence: 0.5, metadata: {} },
        { result: 'B', confidence: 0.4, metadata: {} },
      ];

      const result = await consensus.buildConsensus(outputs, 'weighted-vote');
      expect(result.consensusOutput.result).toBe('A');
    });

    it('should analyze disagreement', () => {
      const outputs: AgentOutput[] = [
        { result: 'A', confidence: 0.9, metadata: {} },
        { result: 'B', confidence: 0.8, metadata: {} },
        { result: 'C', confidence: 0.7, metadata: {} },
      ];

      const analysis = consensus.analyzeDisagreement(outputs);

      expect(analysis.totalGroups).toBe(3);
      expect(analysis.diversity).toBeGreaterThan(0.5);
      expect(analysis.hasStrongDisagreement).toBe(true);
    });
  });

  describe('TaskDecomposition', () => {
    let registry: AgentRegistry;
    let decomposition: TaskDecomposition;

    beforeEach(() => {
      registry = new AgentRegistry();
      decomposition = new TaskDecomposition(registry);
    });

    it('should decompose complex task', async () => {
      const task = {
        description: 'Process large dataset',
        input: { data: [1, 2, 3, 4, 5, 6, 7, 8] },
        allowParallel: true,
      };

      const result = await decomposition.decompose(task, 'parallel');

      expect(result.subtasks.length).toBeGreaterThan(1);
      expect(result.strategy).toBe('parallel');
      expect(result.executionPlan).toBeDefined();
    });

    it('should create execution plan', async () => {
      const task = {
        description: 'Multi-step process',
        input: { data: {} },
        steps: [
          { description: 'Step 1', input: { data: {} } },
          { description: 'Step 2', input: { data: {} } },
        ],
      };

      const result = await decomposition.decompose(task, 'sequential');

      expect(result.executionPlan.length).toBeGreaterThan(0);
      expect(result.subtasks).toHaveLength(2);
    });
  });
});

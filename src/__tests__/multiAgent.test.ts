import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentOrchestrator } from '../ai/agents/AgentOrchestrator';
import { AgentRegistry } from '../ai/agents/AgentRegistry';
import { AgentCommunicator } from '../ai/agents/AgentCommunicator';
import { AgentBase } from '../ai/agents/AgentBase';
import { ClassifierAgent } from '../ai/routing/ClassifierAgent';
import { RouterAgent } from '../ai/routing/RouterAgent';
import { RoutingRules } from '../ai/routing/RoutingRules';
import { ShortTermMemory } from '../ai/memory/ShortTermMemory';
import { LongTermMemory } from '../ai/memory/LongTermMemory';
import { MemoryManager } from '../ai/memory/MemoryManager';
import { AgentToolRegistry } from '../ai/tools/AgentToolRegistry';
import { WorkflowTool } from '../ai/tools/WorkflowTool';
import { NodeTool } from '../ai/tools/NodeTool';
import { AgentInput, AgentOutput, AgentTask } from '../types/agents';

// Mock LLMService
vi.mock('../services/LoggingService', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Test Agent Implementation
class TestAgent extends AgentBase {
  async execute(input: AgentInput): Promise<AgentOutput> {
    return {
      result: { message: 'Test execution successful', input: input.data },
      confidence: 0.9,
      metadata: {},
    };
  }
}

describe('Multi-Agent AI System', () => {
  describe('AgentBase', () => {
    let agent: TestAgent;

    beforeEach(() => {
      agent = new TestAgent({
        name: 'Test Agent',
        description: 'A test agent',
        type: 'custom',
        capabilities: ['text-generation'],
      });
    });

    afterEach(async () => {
      await agent.destroy();
    });

    it('should initialize with correct properties', () => {
      expect(agent.name).toBe('Test Agent');
      expect(agent.description).toBe('A test agent');
      expect(agent.type).toBe('custom');
      expect(agent.status).toBe('idle');
    });

    it('should start and stop correctly', async () => {
      await agent.start();
      expect(agent.status).toBe('idle');

      await agent.stop();
      expect(agent.status).toBe('stopped');
    });

    it('should execute tasks successfully', async () => {
      await agent.start();

      const task: AgentTask = {
        id: 'test-task-1',
        agentId: agent.id,
        type: 'execute',
        input: { data: { test: 'value' } },
        status: 'pending',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
        metadata: {},
      };

      const output = await agent.executeTask(task);

      expect(output).toBeDefined();
      expect(output.result).toBeDefined();
      expect(task.status).toBe('completed');
    });

    it('should track analytics', async () => {
      await agent.start();

      const task: AgentTask = {
        id: 'test-task-2',
        agentId: agent.id,
        type: 'execute',
        input: { data: 'test' },
        status: 'pending',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
        metadata: {},
      };

      await agent.executeTask(task);

      const analytics = agent.getAnalytics();
      expect(analytics.totalTasks).toBe(1);
      expect(analytics.completedTasks).toBe(1);
      expect(analytics.failedTasks).toBe(0);
    });

    it('should perform health checks', async () => {
      await agent.start();

      const health = await agent.healthCheck();

      expect(health).toBeDefined();
      expect(health.status).toBe('idle');
      expect(health.taskCount).toBeGreaterThanOrEqual(0);
      expect(health.successRate).toBeGreaterThanOrEqual(0);
      expect(health.successRate).toBeLessThanOrEqual(1);
    });
  });

  describe('AgentRegistry', () => {
    let registry: AgentRegistry;
    let agent1: TestAgent;
    let agent2: TestAgent;

    beforeEach(() => {
      registry = new AgentRegistry();
      agent1 = new TestAgent({
        id: 'agent-1',
        name: 'Agent 1',
        type: 'executor',
        capabilities: ['text-generation'],
      });
      agent2 = new TestAgent({
        id: 'agent-2',
        name: 'Agent 2',
        type: 'specialist',
        capabilities: ['data-processing'],
      });
    });

    afterEach(async () => {
      await registry.shutdown();
    });

    it('should register agents', async () => {
      await registry.register(agent1);
      await registry.register(agent2);

      expect(registry.size()).toBe(2);
      expect(registry.get('agent-1')).toBe(agent1);
      expect(registry.get('agent-2')).toBe(agent2);
    });

    it('should find agents by type', async () => {
      await registry.register(agent1);
      await registry.register(agent2);

      const executors = registry.findByType('executor');
      expect(executors).toHaveLength(1);
      expect(executors[0].id).toBe('agent-1');
    });

    it('should find agents by capability', async () => {
      await registry.register(agent1);
      await registry.register(agent2);

      const textAgents = registry.findByCapability('text-generation');
      expect(textAgents).toHaveLength(1);
      expect(textAgents[0].id).toBe('agent-1');
    });

    it('should unregister agents', async () => {
      await registry.register(agent1);
      const result = await registry.unregister('agent-1');

      expect(result).toBe(true);
      expect(registry.size()).toBe(0);
    });

    it('should get registry stats', async () => {
      await registry.register(agent1);
      await registry.register(agent2);

      const stats = registry.getStats();

      expect(stats.totalAgents).toBe(2);
      expect(stats.agentsByType).toBeDefined();
      expect(stats.agentsByCapability).toBeDefined();
    });
  });

  describe('AgentCommunicator', () => {
    let communicator: AgentCommunicator;

    beforeEach(() => {
      communicator = new AgentCommunicator();
    });

    afterEach(async () => {
      await communicator.shutdown();
    });

    it('should allow agents to subscribe', () => {
      const callback = vi.fn();
      communicator.subscribe('agent-1', callback);

      const stats = communicator.getStats();
      expect(stats.subscriberCount).toBe(1);
    });

    it('should publish messages', async () => {
      const messages: unknown[] = [];
      communicator.subscribe('agent-2', (msg) => {
        messages.push(msg);
      });

      await communicator.publish({
        id: 'msg-1',
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        type: 'request',
        content: 'test message',
        priority: 'medium',
        timestamp: new Date().toISOString(),
        requiresResponse: false,
        metadata: {},
      });

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(messages).toHaveLength(1);
    });

    it('should support broadcast', async () => {
      const messages1: unknown[] = [];
      const messages2: unknown[] = [];

      communicator.subscribe('agent-1', (msg) => messages1.push(msg));
      communicator.subscribe('agent-2', (msg) => messages2.push(msg));

      await communicator.broadcast({
        id: 'broadcast-1',
        fromAgentId: 'system',
        type: 'broadcast',
        content: 'broadcast message',
        priority: 'high',
        timestamp: new Date().toISOString(),
        requiresResponse: false,
        metadata: {},
      });

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(messages1.length + messages2.length).toBeGreaterThan(0);
    });
  });

  describe('ShortTermMemory', () => {
    let memory: ShortTermMemory;

    beforeEach(() => {
      memory = new ShortTermMemory({ maxItems: 10 });
    });

    afterEach(async () => {
      await memory.clear();
    });

    it('should store and retrieve items', async () => {
      const item = await memory.store({
        content: 'Test memory',
        importance: 0.8,
        metadata: { test: true },
      });

      const retrieved = await memory.retrieve(item.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe('Test memory');
      expect(retrieved?.importance).toBe(0.8);
    });

    it('should query items', async () => {
      await memory.store({ content: 'First item', importance: 0.5, metadata: {} });
      await memory.store({ content: 'Second item', importance: 0.7, metadata: {} });

      const results = await memory.query({
        text: 'item',
        topK: 10,
      });

      expect(results).toHaveLength(2);
    });

    it('should evict LRU items when full', async () => {
      // Fill memory
      for (let i = 0; i < 10; i++) {
        await memory.store({ content: `Item ${i}`, importance: 0.5, metadata: {} });
      }

      expect(memory.size()).toBe(10);

      // Add one more
      const newItem = await memory.store({ content: 'New item', importance: 0.5, metadata: {} });

      expect(memory.size()).toBe(10);
      const retrieved = await memory.retrieve(newItem.id);
      expect(retrieved).toBeDefined();
    });

    it('should cleanup expired items', async () => {
      const expiredItem = await memory.store({
        content: 'Expired',
        importance: 0.5,
        metadata: {},
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });

      await memory.cleanup();

      const retrieved = await memory.retrieve(expiredItem.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('LongTermMemory', () => {
    let memory: LongTermMemory;

    beforeEach(() => {
      memory = new LongTermMemory({ maxItems: 100 });
    });

    afterEach(async () => {
      await memory.clear();
    });

    it('should store and retrieve items', async () => {
      const item = await memory.store({
        content: 'Long-term memory',
        importance: 0.9,
        metadata: {},
        tags: ['important'],
      });

      const retrieved = await memory.retrieve(item.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe('Long-term memory');
    });

    it('should find items by tag', async () => {
      await memory.store({ content: 'Item 1', importance: 0.5, metadata: {}, tags: ['test'] });
      await memory.store({ content: 'Item 2', importance: 0.5, metadata: {}, tags: ['test'] });

      const results = await memory.getByTag('test');

      expect(results).toHaveLength(2);
    });

    it('should get most important items', async () => {
      await memory.store({ content: 'Low importance', importance: 0.3, metadata: {} });
      await memory.store({ content: 'High importance', importance: 0.9, metadata: {} });

      const important = await memory.getImportant(1);

      expect(important).toHaveLength(1);
      expect(important[0].importance).toBe(0.9);
    });
  });

  describe('MemoryManager', () => {
    let memoryManager: MemoryManager;

    beforeEach(() => {
      memoryManager = new MemoryManager({
        enableShortTerm: true,
        enableLongTerm: true,
        enableVector: false,
      });
    });

    afterEach(async () => {
      await memoryManager.shutdown();
    });

    it('should store memories in appropriate stores', async () => {
      const shortTerm = await memoryManager.store(
        { content: 'Short memory', importance: 0.5, metadata: {} },
        { memoryType: 'short-term' }
      );

      expect(shortTerm.type).toBe('short-term');

      const longTerm = await memoryManager.store(
        { content: 'Long memory', importance: 0.8, metadata: {} },
        { memoryType: 'long-term' }
      );

      expect(longTerm.type).toBe('long-term');
    });

    it('should query across all memory types', async () => {
      await memoryManager.store({ content: 'Test 1', importance: 0.5, metadata: {} });
      await memoryManager.store({ content: 'Test 2', importance: 0.8, metadata: {} });

      const results = await memoryManager.query({ text: 'Test', topK: 10 });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should auto-promote important memories', async () => {
      const item = await memoryManager.store(
        { content: 'Important', importance: 0.9, metadata: {} },
        { memoryType: 'short-term', autoPromote: true }
      );

      // Promotion happens asynchronously
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = await memoryManager.getStats();
      expect(stats.byType['long-term']).toBeGreaterThan(0);
    });
  });

  describe('AgentToolRegistry', () => {
    let registry: AgentToolRegistry;

    beforeEach(() => {
      registry = new AgentToolRegistry();
    });

    it('should register and execute tools', async () => {
      const tool = {
        id: 'test-tool',
        name: 'Test Tool',
        description: 'A test tool',
        type: 'function' as const,
        category: 'utilities' as const,
        parameters: [],
        returns: { type: 'string', description: 'Test result' },
        metadata: {},
      };

      const executor = async () => 'test result';

      registry.register(tool, executor);

      const result = await registry.execute({
        toolId: 'test-tool',
        toolName: 'Test Tool',
        parameters: {},
      });

      expect(result.result).toBe('test result');
      expect(result.error).toBeUndefined();
    });

    it('should validate tool parameters', async () => {
      const tool = {
        id: 'param-tool',
        name: 'Param Tool',
        description: 'Tool with parameters',
        type: 'function' as const,
        category: 'utilities' as const,
        parameters: [
          {
            name: 'required param',
            type: 'string',
            description: 'Required parameter',
            required: true,
          },
        ],
        returns: { type: 'string', description: 'Result' },
        metadata: {},
      };

      const executor = async (params: Record<string, unknown>) => params;

      registry.register(tool, executor);

      const result = await registry.execute({
        toolId: 'param-tool',
        toolName: 'Param Tool',
        parameters: {}, // Missing required parameter
      });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('TOOL_EXECUTION_ERROR');
    });
  });

  describe('WorkflowTool', () => {
    it('should create tool from workflow definition', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'A test workflow',
        nodes: [],
        variables: {
          input: { default: '', required: true },
        },
      };

      const tool = WorkflowTool.createFromWorkflow(workflow);

      expect(tool.id).toBe('workflow_test-workflow');
      expect(tool.name).toBe('Test Workflow');
      expect(tool.type).toBe('workflow');
    });
  });

  describe('Integration Tests', () => {
    it('should orchestrate multiple agents', async () => {
      const orchestrator = new AgentOrchestrator();
      await orchestrator.start();

      const agent1 = new TestAgent({ id: 'test-1', name: 'Test 1' });
      const agent2 = new TestAgent({ id: 'test-2', name: 'Test 2' });

      await orchestrator.registerAgent(agent1);
      await orchestrator.registerAgent(agent2);

      const task: AgentTask = {
        id: 'integration-task',
        agentId: 'test-1',
        type: 'execute',
        input: { data: 'test' },
        status: 'pending',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
        metadata: {},
      };

      const result = await orchestrator.executeTask(task);

      expect(result).toBeDefined();
      expect(result.result).toBeDefined();

      await orchestrator.shutdown();
    });
  });
});

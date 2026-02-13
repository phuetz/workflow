/**
 * Comprehensive tests for Agentic Workflow Engine
 *
 * Tests all 9 patterns, communication, conflict resolution, and team management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgenticWorkflowEngine, PatternConfig } from '../agentic/AgenticWorkflowEngine';
import { AgentTeamManager } from '../agentic/AgentTeamManager';
import { InterAgentCommunication } from '../agentic/InterAgentCommunication';
import { ConflictResolver } from '../agentic/ConflictResolver';
import { Agent, AgentInput, AgentOutput } from '../types/agents';

// Mock agents
const createMockAgent = (id: string, name: string): Agent => ({
  id,
  name,
  description: `Mock agent ${name}`,
  type: 'executor',
  status: 'idle',
  capabilities: ['text-generation', 'tool-usage'],
  config: {
    llmModel: 'gpt-4',
    temperature: 0.7,
  },
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: '1.0.0',
  executeTask: vi.fn(async (task) => ({
    result: { processed: task.input.data, agentId: id },
    confidence: 0.9,
    metadata: {},
  })),
  healthCheck: vi.fn(async () => ({
    status: 'idle' as const,
    uptime: 1000,
    taskCount: 0,
    successRate: 1.0,
  })),
  getAnalytics: vi.fn(() => ({
    agentId: id,
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageExecutionTime: 0,
    averageConfidence: 0,
    toolUsage: {},
    errorDistribution: {},
    costTotal: 0,
    periodStart: new Date().toISOString(),
    periodEnd: new Date().toISOString(),
  })),
});

describe('AgenticWorkflowEngine', () => {
  let engine: AgenticWorkflowEngine;
  let agents: Agent[];
  let input: AgentInput;

  beforeEach(async () => {
    engine = new AgenticWorkflowEngine();
    agents = [
      createMockAgent('agent1', 'Agent 1'),
      createMockAgent('agent2', 'Agent 2'),
      createMockAgent('agent3', 'Agent 3'),
      createMockAgent('agent4', 'Agent 4'),
    ];
    input = {
      data: { task: 'process this' },
      context: {},
    };

    await engine.initialize(agents);
  });

  describe('Pattern Execution', () => {
    it('should execute sequential pattern', async () => {
      const config: PatternConfig = {
        pattern: 'sequential',
        agents: agents.slice(0, 3),
      };

      const result = await engine.executePattern(config, input);

      expect(result.pattern).toBe('sequential');
      expect(result.agentsUsed).toHaveLength(3);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.efficiencyGain).toBeGreaterThanOrEqual(0);
    });

    it('should execute parallel pattern', async () => {
      const config: PatternConfig = {
        pattern: 'parallel',
        agents: agents.slice(0, 3),
      };

      const result = await engine.executePattern(config, input);

      expect(result.pattern).toBe('parallel');
      expect(result.agentsUsed).toHaveLength(3);
      expect(result.metadata.parallelization).toBe(3);
    });

    it('should execute orchestrator-workers pattern', async () => {
      const config: PatternConfig = {
        pattern: 'orchestrator-workers',
        agents: agents,
      };

      const result = await engine.executePattern(config, input);

      expect(result.pattern).toBe('orchestrator-workers');
      expect(result.agentsUsed).toHaveLength(4);
    });

    it('should execute routing pattern', async () => {
      const config: PatternConfig = {
        pattern: 'routing',
        agents: agents.slice(0, 3),
      };

      const result = await engine.executePattern(config, input);

      expect(result.pattern).toBe('routing');
      expect(result.output.metadata?.classification).toBeDefined();
    });

    it('should execute hierarchical pattern', async () => {
      const config: PatternConfig = {
        pattern: 'hierarchical',
        agents: agents,
      };

      const result = await engine.executePattern(config, input);

      expect(result.pattern).toBe('hierarchical');
      expect(result.agentsUsed).toHaveLength(4);
    });

    it('should execute feedback-loop pattern', async () => {
      const config: PatternConfig = {
        pattern: 'feedback-loop',
        agents: agents.slice(0, 2),
        maxIterations: 3,
      };

      const result = await engine.executePattern(config, input);

      expect(result.pattern).toBe('feedback-loop');
      expect(result.iterations).toBeLessThanOrEqual(3);
    });

    it('should execute consensus pattern', async () => {
      const config: PatternConfig = {
        pattern: 'consensus',
        agents: agents.slice(0, 3),
      };

      const result = await engine.executePattern(config, input);

      expect(result.pattern).toBe('consensus');
      expect(result.agentsUsed).toHaveLength(3);
    });

    it('should execute competitive pattern', async () => {
      const config: PatternConfig = {
        pattern: 'competitive',
        agents: agents.slice(0, 3),
      };

      const result = await engine.executePattern(config, input);

      expect(result.pattern).toBe('competitive');
      expect(result.metadata.totalCompetitors).toBe(3);
    });

    it('should execute collaborative-refinement pattern', async () => {
      const config: PatternConfig = {
        pattern: 'collaborative-refinement',
        agents: agents.slice(0, 2),
        maxIterations: 2,
      };

      const result = await engine.executePattern(config, input);

      expect(result.pattern).toBe('collaborative-refinement');
      expect(result.iterations).toBeLessThanOrEqual(2);
    });
  });

  describe('Pattern Selection', () => {
    it('should auto-select optimal pattern', async () => {
      const task = {
        id: 'task1',
        agentId: 'agent1',
        type: 'execute' as const,
        input,
        status: 'pending' as const,
        priority: 'medium' as const,
        createdAt: new Date().toISOString(),
        metadata: { canParallelize: true },
        retryCount: 0,
        maxRetries: 0,
      };

      const pattern = await engine.selectOptimalPattern(task, agents);

      expect(pattern).toBeTruthy();
      expect(['sequential', 'parallel', 'orchestrator-workers', 'routing', 'hierarchical']).toContain(pattern);
    });

    it('should select consensus for consensus tasks', async () => {
      const task = {
        id: 'task1',
        agentId: 'agent1',
        type: 'execute' as const,
        input,
        status: 'pending' as const,
        priority: 'medium' as const,
        createdAt: new Date().toISOString(),
        metadata: { requiresConsensus: true },
        retryCount: 0,
        maxRetries: 0,
      };

      const pattern = await engine.selectOptimalPattern(task, agents);

      expect(pattern).toBe('consensus');
    });
  });

  describe('Pattern Composition', () => {
    it('should compose multiple patterns', async () => {
      const compositions = [
        { pattern: 'sequential' as const, agents: agents.slice(0, 2) },
        { pattern: 'parallel' as const, agents: agents.slice(2, 4) },
      ];

      const result = await engine.composePatterns(compositions, input);

      expect(result.agentsUsed.length).toBeGreaterThan(0);
      expect(result.executionTime).toBeGreaterThan(0);
    });
  });

  describe('Metrics and Performance', () => {
    it('should track pattern metrics', async () => {
      const config: PatternConfig = {
        pattern: 'parallel',
        agents: agents.slice(0, 2),
      };

      await engine.executePattern(config, input);

      const metrics = engine.getPatternMetrics('parallel');

      expect(metrics).toBeDefined();
      expect(metrics?.totalExecutions).toBeGreaterThan(0);
      expect(metrics?.successRate).toBeGreaterThan(0);
    });

    it('should calculate ROI', async () => {
      const config: PatternConfig = {
        pattern: 'parallel',
        agents: agents.slice(0, 2),
      };

      await engine.executePattern(config, input);

      const roi = engine.calculateROI('parallel');

      expect(roi).toBeGreaterThan(0);
    });

    it('should generate performance report', async () => {
      const config: PatternConfig = {
        pattern: 'parallel',
        agents: agents.slice(0, 2),
      };

      await engine.executePattern(config, input);

      const report = engine.getPerformanceReport();

      expect(report.overallEfficiencyGain).toBeGreaterThanOrEqual(0);
      expect(report.overallROI).toBeGreaterThan(0);
      expect(report.bestPattern).toBeDefined();
      expect(report.patternMetrics.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization error', async () => {
      const uninitializedEngine = new AgenticWorkflowEngine();
      const config: PatternConfig = {
        pattern: 'sequential',
        agents: agents.slice(0, 2),
      };

      await expect(uninitializedEngine.executePattern(config, input)).rejects.toThrow();
    });

    it('should handle unknown pattern', async () => {
      const config: PatternConfig = {
        pattern: 'unknown' as never,
        agents: agents.slice(0, 2),
      };

      await expect(engine.executePattern(config, input)).rejects.toThrow();
    });
  });
});

describe('AgentTeamManager', () => {
  let teamManager: AgentTeamManager;
  let agents: Agent[];

  beforeEach(async () => {
    teamManager = new AgentTeamManager();
    agents = [
      createMockAgent('agent1', 'Processing Agent'),
      createMockAgent('agent2', 'Communication Agent'),
      createMockAgent('agent3', 'Analysis Agent'),
    ];

    for (const agent of agents) {
      await teamManager.registerAgent(agent);
    }
  });

  it('should register agents with specialization', async () => {
    const stats = teamManager.getStats();

    expect(stats.totalAgents).toBe(3);
    expect(Object.keys(stats.bySpecialization).length).toBeGreaterThan(0);
  });

  it('should create team with optimal composition', async () => {
    const team = await teamManager.createTeam('Test Team', {
      minSize: 2,
      maxSize: 3,
    });

    expect(team).toBeDefined();
    expect(team.agents.length).toBeGreaterThanOrEqual(2);
    expect(team.agents.length).toBeLessThanOrEqual(3);
  });

  it('should get agents by specialization', () => {
    const processingAgents = teamManager.getAgentsBySpecialization('processing');

    expect(Array.isArray(processingAgents)).toBe(true);
  });

  it('should update agent load', () => {
    teamManager.updateAgentLoad('agent1', 5);
    teamManager.updateAgentLoad('agent1', -2);

    // Load should be updated correctly
    const stats = teamManager.getStats();
    expect(stats).toBeDefined();
  });

  it('should get optimal agent for task', async () => {
    const task = {
      id: 'task1',
      agentId: 'agent1',
      type: 'execute' as const,
      input: { data: {} },
      status: 'pending' as const,
      priority: 'medium' as const,
      createdAt: new Date().toISOString(),
      metadata: {},
      retryCount: 0,
      maxRetries: 0,
    };

    const agent = await teamManager.getOptimalAgent(task);

    expect(agent).toBeDefined();
  });
});

describe('InterAgentCommunication', () => {
  let communication: InterAgentCommunication;

  beforeEach(async () => {
    communication = new InterAgentCommunication();
    await communication.initialize();
  });

  afterEach(async () => {
    await communication.shutdown();
  });

  it('should initialize successfully', () => {
    expect(communication).toBeDefined();
  });

  it('should subscribe and publish messages', async () => {
    const messages: any[] = [];
    communication.subscribe('agent1', async (msg) => {
      messages.push(msg);
    });

    await communication.publish({
      id: 'msg1',
      fromAgentId: 'agent2',
      toAgentId: 'agent1',
      type: 'request',
      content: { test: true },
      priority: 'medium',
      timestamp: new Date().toISOString(),
      requiresResponse: false,
      metadata: {},
    });

    // Wait for message processing
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(messages.length).toBeGreaterThan(0);
  });

  it('should broadcast messages', async () => {
    const agent1Messages: any[] = [];
    const agent2Messages: any[] = [];

    communication.subscribe('agent1', async (msg) => agent1Messages.push(msg));
    communication.subscribe('agent2', async (msg) => agent2Messages.push(msg));

    await communication.broadcast({
      id: 'broadcast1',
      fromAgentId: 'system',
      type: 'notification',
      content: { announcement: 'test' },
      priority: 'low',
      timestamp: new Date().toISOString(),
      requiresResponse: false,
      metadata: {},
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(agent1Messages.length).toBeGreaterThan(0);
    expect(agent2Messages.length).toBeGreaterThan(0);
  });

  it('should manage shared memory', () => {
    communication.setSharedMemory('key1', { value: 'test' });
    const value = communication.getSharedMemory('key1');

    expect(value).toEqual({ value: 'test' });
  });

  it('should delete shared memory', () => {
    communication.setSharedMemory('key1', { value: 'test' });
    communication.deleteSharedMemory('key1');
    const value = communication.getSharedMemory('key1');

    expect(value).toBeUndefined();
  });

  it('should emit and listen to events', async () => {
    const eventPromise = new Promise<void>((resolve) => {
      communication.on('test-event', (data) => {
        expect(data).toEqual({ test: true });
        resolve();
      });
    });

    communication.emit('test-event', { test: true });
    await eventPromise;
  });

  it('should track statistics', () => {
    const stats = communication.getStats();

    expect(stats).toBeDefined();
    expect(stats.totalMessages).toBeGreaterThanOrEqual(0);
  });
});

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;
  let communication: InterAgentCommunication;

  beforeEach(async () => {
    communication = new InterAgentCommunication();
    await communication.initialize();
    resolver = new ConflictResolver(communication);
  });

  afterEach(async () => {
    await communication.shutdown();
  });

  it('should create conflict', () => {
    const outputs = [
      { agentId: 'agent1', output: { result: 'A', metadata: {} }, confidence: 0.8 },
      { agentId: 'agent2', output: { result: 'B', metadata: {} }, confidence: 0.9 },
    ];

    const conflict = resolver.createConflict(outputs);

    expect(conflict).toBeDefined();
    expect(conflict.agentOutputs.length).toBe(2);
  });

  it('should resolve by voting', async () => {
    const outputs = [
      { agentId: 'agent1', output: { result: 'A', metadata: {} }, confidence: 0.8 },
      { agentId: 'agent2', output: { result: 'A', metadata: {} }, confidence: 0.9 },
      { agentId: 'agent3', output: { result: 'B', metadata: {} }, confidence: 0.7 },
    ];

    const conflict = resolver.createConflict(outputs);
    const resolution = await resolver.resolve(conflict, 'voting');

    expect(resolution).toBeDefined();
    expect(resolution.strategy).toBe('voting');
    expect(resolution.confidence).toBeGreaterThan(0);
  });

  it('should resolve by weighted voting', async () => {
    const outputs = [
      { agentId: 'agent1', output: { result: 'A', metadata: {} }, confidence: 0.8, weight: 2 },
      { agentId: 'agent2', output: { result: 'B', metadata: {} }, confidence: 0.9, weight: 1 },
    ];

    const conflict = resolver.createConflict(outputs);
    const resolution = await resolver.resolve(conflict, 'weighted-voting');

    expect(resolution).toBeDefined();
    expect(resolution.strategy).toBe('weighted-voting');
  });

  it('should resolve by best confidence', async () => {
    const outputs = [
      { agentId: 'agent1', output: { result: 'A', metadata: {} }, confidence: 0.8 },
      { agentId: 'agent2', output: { result: 'B', metadata: {} }, confidence: 0.95 },
    ];

    const conflict = resolver.createConflict(outputs);
    const resolution = await resolver.resolve(conflict, 'best-confidence');

    expect(resolution).toBeDefined();
    expect(resolution.strategy).toBe('best-confidence');
    expect(resolution.resolution.result).toBe('B');
  });

  it('should track resolution statistics', async () => {
    const outputs = [
      { agentId: 'agent1', output: { result: 'A', metadata: {} }, confidence: 0.8 },
      { agentId: 'agent2', output: { result: 'A', metadata: {} }, confidence: 0.9 },
    ];

    const conflict = resolver.createConflict(outputs);
    await resolver.resolve(conflict);

    const stats = resolver.getStats();

    expect(stats.totalConflicts).toBeGreaterThan(0);
    expect(stats.resolvedConflicts).toBeGreaterThan(0);
  });
});

describe('Integration Tests', () => {
  it('should execute end-to-end agentic workflow', async () => {
    const engine = new AgenticWorkflowEngine();
    const agents = [
      createMockAgent('agent1', 'Agent 1'),
      createMockAgent('agent2', 'Agent 2'),
      createMockAgent('agent3', 'Agent 3'),
    ];

    await engine.initialize(agents);

    const config: PatternConfig = {
      pattern: 'parallel',
      agents: agents,
      maxIterations: 3,
      timeoutMs: 10000,
      failurePolicy: 'retry',
      optimizationLevel: 'basic',
    };

    const input: AgentInput = {
      data: { task: 'complex processing' },
      context: { userId: 'user1' },
    };

    const result = await engine.executePattern(config, input);

    expect(result).toBeDefined();
    expect(result.pattern).toBe('parallel');
    expect(result.efficiencyGain).toBeGreaterThanOrEqual(0);
    expect(result.metadata.messagesSent).toBeGreaterThanOrEqual(0);

    const report = engine.getPerformanceReport();
    expect(report.overallROI).toBeGreaterThan(0);

    await engine.shutdown();
  });
});

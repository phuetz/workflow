/**
 * Digital Twin & Simulation System Tests
 *
 * Comprehensive test suite covering all digital twin functionality
 * including simulation, fault injection, commissioning, regression testing,
 * scenarios, and comparison.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkflowDigitalTwin } from '../WorkflowDigitalTwin';
import { FaultInjectionEngine } from '../FaultInjectionEngine';
import { SimulationEngine } from '../SimulationEngine';
import { VirtualCommissioning } from '../VirtualCommissioning';
import { RegressionTesting } from '../RegressionTesting';
import { ScenarioManager } from '../ScenarioManager';
import { TwinComparison } from '../TwinComparison';
import type { Workflow } from '../../types/workflow';

// Mock workflow for testing
const createMockWorkflow = (): Workflow => ({
  id: 'test-workflow-1',
  name: 'Test Workflow',
  description: 'Test workflow for digital twin',
  nodes: [
    {
      id: 'node-1',
      type: 'trigger',
      position: { x: 0, y: 0 },
      data: { label: 'Start', config: {} },
    },
    {
      id: 'node-2',
      type: 'httpRequest',
      position: { x: 200, y: 0 },
      data: { label: 'HTTP Request', config: { url: 'https://api.example.com', method: 'GET' } },
    },
    {
      id: 'node-3',
      type: 'transform',
      position: { x: 400, y: 0 },
      data: { label: 'Transform', config: {} },
    },
  ],
  edges: [
    { id: 'edge-1', source: 'node-1', target: 'node-2' },
    { id: 'edge-2', source: 'node-2', target: 'node-3' },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'test-user',
  version: 1,
});

describe('WorkflowDigitalTwin', () => {
  let digitalTwin: WorkflowDigitalTwin;
  let mockWorkflow: Workflow;

  beforeEach(() => {
    digitalTwin = new WorkflowDigitalTwin();
    mockWorkflow = createMockWorkflow();
  });

  describe('Twin Creation', () => {
    it('should create a digital twin for a workflow', async () => {
      const twin = await digitalTwin.createTwin(mockWorkflow);

      expect(twin).toBeDefined();
      expect(twin.id).toBeDefined();
      expect(twin.realWorkflowId).toBe(mockWorkflow.id);
      expect(twin.workflow).toEqual(mockWorkflow);
      expect(twin.executionCount).toBe(0);
      expect(twin.divergence).toBe(0);
    });

    it('should get twin by ID', async () => {
      const twin = await digitalTwin.createTwin(mockWorkflow);
      const retrieved = digitalTwin.getTwin(twin.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(twin.id);
    });

    it('should get twin by workflow ID', async () => {
      const twin = await digitalTwin.createTwin(mockWorkflow);
      const retrieved = digitalTwin.getTwinByWorkflowId(mockWorkflow.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.realWorkflowId).toBe(mockWorkflow.id);
    });

    it('should list all twins', async () => {
      await digitalTwin.createTwin(mockWorkflow);
      await digitalTwin.createTwin({ ...mockWorkflow, id: 'test-workflow-2' });

      const twins = digitalTwin.listTwins();
      expect(twins.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Simulation', () => {
    it('should simulate workflow execution', async () => {
      const twin = await digitalTwin.createTwin(mockWorkflow);
      const input = { test: 'data' };

      const result = await digitalTwin.simulate(twin.id, input);

      expect(result).toBeDefined();
      expect(result.twinId).toBe(twin.id);
      expect(result.input).toEqual(input);
      expect(result.status).toBe('success');
      expect(result.nodeResults.length).toBeGreaterThan(0);
    });

    it('should handle simulation with deterministic mode', async () => {
      const twin = await digitalTwin.createTwin(mockWorkflow);
      const input = { test: 'data' };

      const result1 = await digitalTwin.simulate(twin.id, input, { deterministic: true });
      const result2 = await digitalTwin.simulate(twin.id, input, { deterministic: true });

      expect(result1.output).toEqual(result2.output);
    });

    it('should support different simulation modes', async () => {
      const twin = await digitalTwin.createTwin(mockWorkflow);
      const input = { test: 'data' };

      const isolated = await digitalTwin.simulate(twin.id, input, { mode: 'isolated' });
      expect(isolated.config.mode).toBe('isolated');

      const connected = await digitalTwin.simulate(twin.id, input, { mode: 'connected' });
      expect(connected.config.mode).toBe('connected');

      const hybrid = await digitalTwin.simulate(twin.id, input, { mode: 'hybrid' });
      expect(hybrid.config.mode).toBe('hybrid');
    });

    it('should support time compression', async () => {
      const twin = await digitalTwin.createTwin(mockWorkflow);
      const input = { test: 'data' };

      const result = await digitalTwin.simulate(twin.id, input, { timeCompression: 10 });

      expect(result.config.timeCompression).toBe(10);
    });

    it('should track simulation metrics', async () => {
      const twin = await digitalTwin.createTwin(mockWorkflow);
      const result = await digitalTwin.simulate(twin.id, { test: 'data' });

      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalNodes).toBeGreaterThan(0);
      expect(result.metrics.nodesExecuted).toBeGreaterThan(0);
      expect(result.metrics.totalDuration).toBeGreaterThan(0);
    });
  });

  describe('Twin Statistics', () => {
    it('should calculate twin statistics', async () => {
      const twin = await digitalTwin.createTwin(mockWorkflow);
      await digitalTwin.simulate(twin.id, { test: 'data' });
      await digitalTwin.simulate(twin.id, { test: 'data' });

      const stats = digitalTwin.getStatistics(twin.id);

      expect(stats).toBeDefined();
      expect(stats?.totalSimulations).toBe(2);
      expect(stats?.successfulSimulations).toBeGreaterThan(0);
    });

    it('should track average accuracy', async () => {
      const twin = await digitalTwin.createTwin(mockWorkflow);
      await digitalTwin.simulate(twin.id, { test: 'data' });

      const stats = digitalTwin.getStatistics(twin.id);
      expect(stats?.avgAccuracy).toBeGreaterThanOrEqual(0);
      expect(stats?.avgAccuracy).toBeLessThanOrEqual(1);
    });
  });

  describe('Twin Deletion', () => {
    it('should delete a twin', async () => {
      const twin = await digitalTwin.createTwin(mockWorkflow);
      const deleted = digitalTwin.deleteTwin(twin.id);

      expect(deleted).toBe(true);
      expect(digitalTwin.getTwin(twin.id)).toBeUndefined();
    });
  });
});

describe('FaultInjectionEngine', () => {
  let faultEngine: FaultInjectionEngine;

  beforeEach(() => {
    faultEngine = new FaultInjectionEngine();
  });

  describe('Template-based Fault Creation', () => {
    it('should create fault from template', () => {
      const fault = faultEngine.createFromTemplate('Network Timeout', 'test-node');

      expect(fault).toBeDefined();
      expect(fault.id).toBeDefined();
      expect(fault.nodeId).toBe('test-node');
      expect(fault.faultType).toBe('network_timeout');
    });

    it('should list available templates', () => {
      const templates = faultEngine.listTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('name');
      expect(templates[0]).toHaveProperty('faultType');
    });

    it('should override template defaults', () => {
      const fault = faultEngine.createFromTemplate('Network Timeout', 'test-node', {
        probability: 0.8,
        timing: 'before',
      });

      expect(fault.probability).toBe(0.8);
      expect(fault.timing).toBe('before');
    });
  });

  describe('Custom Fault Creation', () => {
    it('should create custom fault scenario', () => {
      const fault = faultEngine.createScenario({
        name: 'Custom Fault',
        description: 'Test fault',
        nodeId: 'test-node',
        faultType: 'api_failure',
        probability: 0.5,
        timing: 'during',
        enabled: true,
      });

      expect(fault).toBeDefined();
      expect(fault.name).toBe('Custom Fault');
      expect(fault.faultType).toBe('api_failure');
    });

    it('should update fault scenario', () => {
      const fault = faultEngine.createScenario({
        name: 'Test Fault',
        nodeId: 'test-node',
        faultType: 'network_timeout',
        probability: 0.5,
        timing: 'during',
        enabled: true,
      });

      const updated = faultEngine.updateScenario(fault.id, {
        probability: 0.9,
        enabled: false,
      });

      expect(updated.probability).toBe(0.9);
      expect(updated.enabled).toBe(false);
    });

    it('should delete fault scenario', () => {
      const fault = faultEngine.createScenario({
        name: 'Test Fault',
        nodeId: 'test-node',
        faultType: 'network_timeout',
        probability: 0.5,
        timing: 'during',
        enabled: true,
      });

      const deleted = faultEngine.deleteScenario(fault.id);
      expect(deleted).toBe(true);
      expect(faultEngine.getScenario(fault.id)).toBeUndefined();
    });
  });

  describe('Fault Injection', () => {
    it('should inject fault based on probability', async () => {
      const fault = faultEngine.createScenario({
        name: 'Always Fail',
        nodeId: 'test-node',
        faultType: 'network_timeout',
        probability: 1.0,
        timing: 'during',
        enabled: true,
      });

      const result = await faultEngine.injectFault(fault, {
        nodeId: 'test-node',
        timing: 'during',
      });

      expect(result.injected).toBe(true);
      expect(result.error).toBeDefined();
    });

    it('should not inject disabled fault', async () => {
      const fault = faultEngine.createScenario({
        name: 'Disabled Fault',
        nodeId: 'test-node',
        faultType: 'network_timeout',
        probability: 1.0,
        timing: 'during',
        enabled: false,
      });

      const result = await faultEngine.injectFault(fault, {
        nodeId: 'test-node',
        timing: 'during',
      });

      expect(result.injected).toBe(false);
    });

    it('should respect fault timing', async () => {
      const fault = faultEngine.createScenario({
        name: 'Before Fault',
        nodeId: 'test-node',
        faultType: 'network_timeout',
        probability: 1.0,
        timing: 'before',
        enabled: true,
      });

      const duringResult = await faultEngine.injectFault(fault, {
        nodeId: 'test-node',
        timing: 'during',
      });

      expect(duringResult.injected).toBe(false);

      const beforeResult = await faultEngine.injectFault(fault, {
        nodeId: 'test-node',
        timing: 'before',
      });

      expect(beforeResult.injected).toBe(true);
    });
  });

  describe('Chaos Mode', () => {
    it('should enable chaos mode', () => {
      faultEngine.enableChaos(0.5);
      // Chaos mode enabled, faults should be more likely
    });

    it('should disable chaos mode', () => {
      faultEngine.enableChaos(0.5);
      faultEngine.disableChaos();
      // Chaos mode disabled
    });
  });

  describe('Fault Statistics', () => {
    it('should track fault injection statistics', async () => {
      const fault = faultEngine.createScenario({
        name: 'Stats Fault',
        nodeId: 'test-node',
        faultType: 'network_timeout',
        probability: 1.0,
        timing: 'during',
        enabled: true,
      });

      await faultEngine.injectFault(fault, {
        nodeId: 'test-node',
        timing: 'during',
      });

      const stats = faultEngine.getStatistics(fault.id);

      expect(stats.totalInjections).toBeGreaterThan(0);
    });
  });
});

describe('SimulationEngine', () => {
  let simulationEngine: SimulationEngine;
  let digitalTwin: WorkflowDigitalTwin;
  let mockWorkflow: Workflow;

  beforeEach(async () => {
    digitalTwin = new WorkflowDigitalTwin();
    simulationEngine = new SimulationEngine(digitalTwin);
    mockWorkflow = createMockWorkflow();
  });

  describe('Single Simulation', () => {
    it('should run single simulation', async () => {
      const twin = await digitalTwin.createTwin(mockWorkflow);
      const result = await simulationEngine.runSimulation(twin.id, { test: 'data' });

      expect(result).toBeDefined();
      expect(result.status).toBe('success');
    });
  });

  describe('Parallel Simulations', () => {
    it('should run parallel simulations', async () => {
      const twin = await digitalTwin.createTwin(mockWorkflow);
      const requests = Array(5).fill(null).map((_, i) => ({
        id: `req-${i}`,
        twinId: twin.id,
        input: { test: `data-${i}` },
      }));

      const results = await simulationEngine.runParallelSimulations(requests, 3);

      expect(results.length).toBe(5);
    });
  });

  describe('Load Testing', () => {
    it('should run load test', async () => {
      const twin = await digitalTwin.createTwin(mockWorkflow);
      const result = await simulationEngine.runLoadTest(twin.id, { test: 'data' }, {
        concurrentExecutions: 5,
        executionsPerSecond: 10,
        duration: 1000,
      });

      expect(result).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.successRate).toBeGreaterThanOrEqual(0);
      expect(result.successRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Stress Testing', () => {
    it('should run stress test', async () => {
      const twin = await digitalTwin.createTwin(mockWorkflow);
      const result = await simulationEngine.runStressTest(twin.id, { test: 'data' }, {
        maxConcurrent: 10,
        targetFailureRate: 0.3,
        duration: 1000,
      });

      expect(result).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
    });
  });

  describe('Chaos Testing', () => {
    it('should run chaos test', async () => {
      const twin = await digitalTwin.createTwin(mockWorkflow);
      const result = await simulationEngine.runChaosTest(twin.id, { test: 'data' }, {
        chaosLevel: 0.5,
        iterations: 10,
      });

      expect(result).toBeDefined();
      expect(result.results.length).toBe(10);
    });
  });

  describe('Performance Testing', () => {
    it('should run performance test', async () => {
      const twin = await digitalTwin.createTwin(mockWorkflow);
      const result = await simulationEngine.runPerformanceTest(twin.id, { test: 'data' }, {
        targetLatency: 1000,
        targetThroughput: 10,
        duration: 2000,
      });

      expect(result).toBeDefined();
      expect(result.performanceMetrics).toBeDefined();
      expect(result.performanceMetrics.latency).toBeDefined();
      expect(result.performanceMetrics.throughput).toBeGreaterThan(0);
    });
  });
});

describe('VirtualCommissioning', () => {
  let commissioning: VirtualCommissioning;
  let mockWorkflow: Workflow;

  beforeEach(() => {
    commissioning = new VirtualCommissioning();
    mockWorkflow = createMockWorkflow();
  });

  it('should run commissioning checks', async () => {
    const report = await commissioning.commission(mockWorkflow);

    expect(report).toBeDefined();
    expect(report.checks.length).toBeGreaterThan(0);
    expect(report.summary).toBeDefined();
    expect(report.status).toMatch(/passed|failed|warnings/);
  });

  it('should detect configuration issues', async () => {
    const invalidWorkflow = {
      ...mockWorkflow,
      nodes: [
        {
          id: 'invalid-node',
          type: 'httpRequest',
          position: { x: 0, y: 0 },
          data: { label: 'Invalid', config: {} }, // Missing required fields
        },
      ],
    };

    const report = await commissioning.commission(invalidWorkflow);
    const configCheck = report.checks.find(c => c.name === 'Missing Configurations');

    expect(configCheck).toBeDefined();
  });

  it('should generate recommendations', async () => {
    const report = await commissioning.commission(mockWorkflow);

    expect(report.recommendations).toBeDefined();
    expect(Array.isArray(report.recommendations)).toBe(true);
  });
});

describe('RegressionTesting', () => {
  let regressionTesting: RegressionTesting;
  let mockWorkflow: Workflow;

  beforeEach(() => {
    regressionTesting = new RegressionTesting();
    mockWorkflow = createMockWorkflow();
  });

  describe('Test Creation', () => {
    it('should create regression test', () => {
      const test = regressionTesting.createTest({
        name: 'Test 1',
        workflow: mockWorkflow,
        input: { test: 'data' },
        expectedOutput: { result: 'success' },
        timeout: 30000,
        assertions: [],
        tags: ['test'],
        enabled: true,
      });

      expect(test).toBeDefined();
      expect(test.id).toBeDefined();
      expect(test.name).toBe('Test 1');
    });

    it('should generate tests from execution', async () => {
      const tests = await regressionTesting.generateFromExecution(
        mockWorkflow,
        { input: { test: 'data' }, output: { result: 'success' } }
      );

      expect(tests.length).toBeGreaterThan(0);
      expect(tests[0].name).toContain('Main Flow');
    });
  });

  describe('Test Execution', () => {
    it('should run single test', async () => {
      const test = regressionTesting.createTest({
        name: 'Test 1',
        workflow: mockWorkflow,
        input: { test: 'data' },
        expectedOutput: { result: 'success' },
        timeout: 30000,
        assertions: [
          {
            type: 'equals',
            path: '$',
            expected: { result: 'success' },
          },
        ],
        tags: ['test'],
        enabled: true,
      });

      const result = await regressionTesting.runTest(test.id);

      expect(result).toBeDefined();
      expect(result.testId).toBe(test.id);
      expect(result.status).toMatch(/passed|failed|skipped|timeout/);
    });
  });

  describe('Test Suite', () => {
    it('should create test suite', () => {
      const suite = regressionTesting.createSuite('Test Suite 1', 'Test suite description');

      expect(suite).toBeDefined();
      expect(suite.name).toBe('Test Suite 1');
      expect(suite.tests.length).toBe(0);
    });

    it('should add test to suite', () => {
      const suite = regressionTesting.createSuite('Test Suite 1');
      const test = regressionTesting.createTest({
        name: 'Test 1',
        workflow: mockWorkflow,
        input: { test: 'data' },
        expectedOutput: { result: 'success' },
        timeout: 30000,
        assertions: [],
        tags: ['test'],
        enabled: true,
      });

      regressionTesting.addTestToSuite(suite.id, test);

      const updatedSuite = regressionTesting.getSuite(suite.id);
      expect(updatedSuite?.tests.length).toBe(1);
    });
  });
});

describe('ScenarioManager', () => {
  let scenarioManager: ScenarioManager;
  let mockWorkflow: Workflow;

  beforeEach(() => {
    scenarioManager = new ScenarioManager();
    mockWorkflow = createMockWorkflow();
  });

  it('should create golden path scenario', () => {
    const scenario = scenarioManager.createGoldenPathScenario(
      mockWorkflow,
      [{ test: 'data' }]
    );

    expect(scenario).toBeDefined();
    expect(scenario.type).toBe('golden_path');
    expect(scenario.inputs.length).toBe(1);
  });

  it('should create load test scenario', () => {
    const scenario = scenarioManager.createLoadTestScenario(
      mockWorkflow,
      { test: 'data' },
      {
        concurrentExecutions: 10,
        executionsPerSecond: 5,
        duration: 5000,
      }
    );

    expect(scenario).toBeDefined();
    expect(scenario.type).toBe('load_testing');
  });

  it('should execute scenario', async () => {
    const scenario = scenarioManager.createGoldenPathScenario(
      mockWorkflow,
      [{ test: 'data' }]
    );

    const result = await scenarioManager.executeScenario(scenario.id);

    expect(result).toBeDefined();
    expect(result.scenarioId).toBe(scenario.id);
    expect(result.metrics).toBeDefined();
  });
});

describe('TwinComparison', () => {
  let twinComparison: TwinComparison;

  beforeEach(() => {
    twinComparison = new TwinComparison();
  });

  it('should calculate accuracy statistics', () => {
    const stats = twinComparison.getAccuracyStatistics();

    expect(stats).toBeDefined();
    expect(stats.totalComparisons).toBeGreaterThanOrEqual(0);
  });
});

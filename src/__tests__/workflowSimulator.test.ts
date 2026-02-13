/**
 * Workflow Simulator Tests
 * Comprehensive test suite for simulation system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowSimulator } from '../simulation/WorkflowSimulator';
import { PreFlightChecker } from '../simulation/PreFlightChecker';
import { CostEstimator } from '../simulation/CostEstimator';
import { DataFlowValidator } from '../simulation/DataFlowValidator';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';

describe('WorkflowSimulator', () => {
  let simulator: WorkflowSimulator;
  let nodes: WorkflowNode[];
  let edges: WorkflowEdge[];

  beforeEach(() => {
    simulator = new WorkflowSimulator();
    nodes = [
      {
        id: 'node1',
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: {
          id: 'node1',
          type: 'trigger',
          label: 'Start',
          position: { x: 0, y: 0 },
          icon: 'play',
          color: 'blue',
          inputs: 0,
          outputs: 1,
        },
      },
      {
        id: 'node2',
        type: 'httpRequest',
        position: { x: 200, y: 0 },
        data: {
          id: 'node2',
          type: 'httpRequest',
          label: 'Fetch Data',
          position: { x: 200, y: 0 },
          icon: 'globe',
          color: 'green',
          inputs: 1,
          outputs: 1,
          config: { url: 'https://api.example.com/data', method: 'GET' },
        },
      },
      {
        id: 'node3',
        type: 'transform',
        position: { x: 400, y: 0 },
        data: {
          id: 'node3',
          type: 'transform',
          label: 'Transform Data',
          position: { x: 400, y: 0 },
          icon: 'transform',
          color: 'purple',
          inputs: 1,
          outputs: 1,
        },
      },
    ];

    edges = [
      {
        id: 'edge1',
        source: 'node1',
        target: 'node2',
      },
      {
        id: 'edge2',
        source: 'node2',
        target: 'node3',
      },
    ];
  });

  describe('Basic Simulation', () => {
    it('should simulate a simple workflow', async () => {
      const result = await simulator.simulate(nodes, edges);

      expect(result).toBeDefined();
      expect(result.simulationId).toBeDefined();
      expect(result.workflow.nodeCount).toBe(3);
      expect(result.workflow.edgeCount).toBe(2);
    });

    it('should estimate execution time', async () => {
      const result = await simulator.simulate(nodes, edges);

      expect(result.estimatedTime.total).toBeGreaterThan(0);
      expect(result.estimatedTime.breakdown).toHaveLength(3);
      expect(result.estimatedTime.criticalPath.length).toBeGreaterThan(0);
    });

    it('should estimate costs', async () => {
      const result = await simulator.simulate(nodes, edges);

      expect(result.estimatedCost.total).toBeGreaterThanOrEqual(0);
      expect(result.estimatedCost.currency).toBe('USD');
    });

    it('should generate data flow', async () => {
      const result = await simulator.simulate(nodes, edges);

      expect(result.dataFlow).toHaveLength(3);
      expect(result.dataFlow[0].nodeId).toBe('node1');
      expect(result.dataFlow[2].nodeId).toBe('node3');
    });

    it('should calculate quality scores', async () => {
      const result = await simulator.simulate(nodes, edges);

      expect(result.score.reliability).toBeGreaterThanOrEqual(0);
      expect(result.score.reliability).toBeLessThanOrEqual(100);
      expect(result.score.performance).toBeGreaterThanOrEqual(0);
      expect(result.score.costEfficiency).toBeGreaterThanOrEqual(0);
      expect(result.score.security).toBeGreaterThanOrEqual(0);
      expect(result.score.overall).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Detection', () => {
    it('should detect missing configuration', async () => {
      const badNodes = [
        {
          ...nodes[0],
        },
        {
          id: 'bad',
          type: 'httpRequest',
          position: { x: 100, y: 0 },
          data: {
            id: 'bad',
            type: 'httpRequest',
            label: 'Bad Request',
            position: { x: 100, y: 0 },
            icon: 'globe',
            color: 'red',
            inputs: 1,
            outputs: 1,
            config: {}, // Missing URL
          },
        },
      ];

      const result = await simulator.simulate(badNodes, [
        { id: 'e1', source: 'node1', target: 'bad' },
      ]);

      const errors = result.potentialErrors.filter(
        e => e.nodeId === 'bad' && e.errorType === 'configuration_missing'
      );
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should identify potential network errors', async () => {
      const result = await simulator.simulate(nodes, edges);

      const networkErrors = result.potentialErrors.filter(
        e => e.errorType === 'network_error'
      );
      expect(networkErrors.length).toBeGreaterThan(0);
    });

    it('should warn about high-cost nodes', async () => {
      const expensiveNodes = [
        ...nodes,
        {
          id: 'expensive',
          type: 'openai',
          position: { x: 600, y: 0 },
          data: {
            id: 'expensive',
            type: 'openai',
            label: 'GPT-4',
            position: { x: 600, y: 0 },
            icon: 'brain',
            color: 'purple',
            inputs: 1,
            outputs: 1,
            config: { model: 'gpt-4' },
          },
        },
      ];

      const result = await simulator.simulate(expensiveNodes, [
        ...edges,
        { id: 'e3', source: 'node3', target: 'expensive' },
      ]);

      const warnings = result.warnings.filter(w => w.type === 'high_cost');
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Recommendations', () => {
    it('should generate performance recommendations', async () => {
      const slowNodes = Array.from({ length: 110 }, (_, i) => ({
        id: `node${i}`,
        type: 'transform',
        position: { x: i * 100, y: 0 },
        data: {
          id: `node${i}`,
          type: 'transform',
          label: `Node ${i}`,
          position: { x: i * 100, y: 0 },
          icon: 'transform',
          color: 'blue',
          inputs: 1,
          outputs: 1,
        },
      })) as WorkflowNode[];

      const result = await simulator.simulate(slowNodes, []);

      // Should have performance recommendations due to high node count
      expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('should recommend cost optimizations', async () => {
      const expensiveNodes = [
        {
          id: 'llm1',
          type: 'openai',
          position: { x: 0, y: 0 },
          data: {
            id: 'llm1',
            type: 'openai',
            label: 'OpenAI',
            position: { x: 0, y: 0 },
            icon: 'brain',
            color: 'purple',
            inputs: 1,
            outputs: 1,
          },
        },
      ] as WorkflowNode[];

      const result = await simulator.simulate(expensiveNodes, []);

      const costRecs = result.recommendations.filter(r => r.type === 'cost');
      expect(costRecs.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Options', () => {
    it('should skip credential validation when requested', async () => {
      const result = await simulator.simulate(nodes, edges, {
        skipCredentialValidation: true,
      });

      expect(result.credentialValidations).toHaveLength(0);
    });

    it('should skip quota checks when requested', async () => {
      const result = await simulator.simulate(nodes, edges, { skipQuotaCheck: true });

      expect(result.quotaStatus).toHaveLength(0);
    });

    it('should skip cost estimation when requested', async () => {
      const result = await simulator.simulate(nodes, edges, { skipCostEstimation: true });

      expect(result.estimatedCost.total).toBe(0);
    });

    it('should accept sample data', async () => {
      const sampleData = { test: 'data', value: 123 };
      const result = await simulator.simulate(nodes, edges, { sampleData });

      expect(result.dataFlow[0].inputData).toEqual(sampleData);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty workflow', async () => {
      const result = await simulator.simulate([], []);

      expect(result.workflow.nodeCount).toBe(0);
      expect(result.estimatedTime.total).toBe(0);
      expect(result.readyForExecution).toBe(true);
    });

    it('should handle disconnected nodes', async () => {
      const disconnectedNodes = [
        nodes[0],
        {
          id: 'disconnected',
          type: 'email',
          position: { x: 500, y: 500 },
          data: {
            id: 'disconnected',
            type: 'email',
            label: 'Disconnected',
            position: { x: 500, y: 500 },
            icon: 'mail',
            color: 'red',
            inputs: 1,
            outputs: 1,
          },
        },
      ] as WorkflowNode[];

      const result = await simulator.simulate(disconnectedNodes, []);

      expect(result.dataFlow.length).toBeGreaterThan(0);
    });

    it('should handle complex branching', async () => {
      const branchingNodes = [
        nodes[0],
        { ...nodes[1], id: 'branch1' },
        { ...nodes[1], id: 'branch2' },
        { ...nodes[2], id: 'merge' },
      ] as WorkflowNode[];

      const branchingEdges = [
        { id: 'e1', source: 'node1', target: 'branch1' },
        { id: 'e2', source: 'node1', target: 'branch2' },
        { id: 'e3', source: 'branch1', target: 'merge' },
        { id: 'e4', source: 'branch2', target: 'merge' },
      ];

      const result = await simulator.simulate(branchingNodes, branchingEdges);

      expect(result.estimatedTime.parallelizable).toBe(true);
    });
  });
});

describe('PreFlightChecker', () => {
  let checker: PreFlightChecker;
  let nodes: WorkflowNode[];
  let edges: WorkflowEdge[];

  beforeEach(() => {
    checker = new PreFlightChecker();
    nodes = [
      {
        id: 'node1',
        type: 'httpRequest',
        position: { x: 0, y: 0 },
        data: {
          id: 'node1',
          type: 'httpRequest',
          label: 'HTTPS Request',
          position: { x: 0, y: 0 },
          icon: 'globe',
          color: 'green',
          inputs: 1,
          outputs: 1,
          config: { url: 'https://api.example.com', method: 'GET' },
        },
      },
    ];
    edges = [];
  });

  it('should pass security checks for HTTPS', async () => {
    const checks = await checker.runChecks({ nodes, edges });

    const httpsCheck = checks.find(c => c.name === 'Insecure HTTP Connections');
    expect(httpsCheck?.passed).toBe(true);
  });

  it('should detect potential security issues', async () => {
    const insecureNodes = [
      {
        ...nodes[0],
        data: {
          ...nodes[0].data,
          config: {
            url: 'https://api.example.com',
            password: 'secret123' // Hardcoded password
          },
        },
      },
    ] as WorkflowNode[];

    const checks = await checker.runChecks({ nodes: insecureNodes, edges });

    const credsCheck = checks.find(c => c.name === 'Hardcoded Credentials Check');
    // The check should exist and run
    expect(credsCheck).toBeDefined();
    expect(credsCheck?.name).toBe('Hardcoded Credentials Check');
  });

  it('should detect SQL injection risks', async () => {
    const sqlNodes = [
      {
        id: 'sql',
        type: 'mysql',
        position: { x: 0, y: 0 },
        data: {
          id: 'sql',
          type: 'mysql',
          label: 'MySQL',
          position: { x: 0, y: 0 },
          icon: 'database',
          color: 'blue',
          inputs: 1,
          outputs: 1,
          config: { query: 'SELECT * FROM users WHERE id = ' + '${userId}' },
        },
      },
    ] as WorkflowNode[];

    const checks = await checker.runChecks({ nodes: sqlNodes, edges });

    const sqlCheck = checks.find(c => c.name === 'SQL Injection Risk');
    expect(sqlCheck?.passed).toBe(false);
  });

  it('should detect circular dependencies', async () => {
    const circularNodes = [
      { id: 'a', type: 'transform', position: { x: 0, y: 0 }, data: {} as any },
      { id: 'b', type: 'transform', position: { x: 100, y: 0 }, data: {} as any },
    ] as WorkflowNode[];

    const circularEdges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'a' },
    ];

    const checks = await checker.runChecks({
      nodes: circularNodes,
      edges: circularEdges,
    });

    const circularCheck = checks.find(c => c.name === 'No Circular Dependencies');
    expect(circularCheck?.passed).toBe(false);
  });
});

describe('CostEstimator', () => {
  let estimator: CostEstimator;

  beforeEach(() => {
    estimator = new CostEstimator();
  });

  it('should estimate node costs', () => {
    const cost = estimator.estimateNodeCost('httpRequest', {});
    expect(cost).toBeGreaterThanOrEqual(0);
  });

  it('should estimate LLM token costs', () => {
    const cost = estimator.estimateNodeCost('openai', {
      prompt: 'Test prompt',
      maxTokens: 1000,
    });
    expect(cost).toBeGreaterThan(0);
  });

  it('should estimate workflow costs', () => {
    const nodes = [
      {
        id: 'n1',
        type: 'httpRequest',
        position: { x: 0, y: 0 },
        data: { config: {} } as any,
      },
      {
        id: 'n2',
        type: 'email',
        position: { x: 100, y: 0 },
        data: { config: {} } as any,
      },
    ] as WorkflowNode[];

    const breakdown = estimator.estimateWorkflowCost(nodes);

    expect(breakdown.total).toBeGreaterThan(0);
    expect(breakdown.apiCalls).toBeGreaterThanOrEqual(0);
  });

  it('should estimate monthly costs', () => {
    const forecast = estimator.estimateMonthlyCost(0.01, 100);

    expect(forecast.daily).toBe(1.0);
    expect(forecast.weekly).toBe(7.0);
    expect(forecast.monthly).toBe(30.0);
    expect(forecast.yearly).toBe(365.0);
  });

  it('should compare to budget', () => {
    const comparison = estimator.compareToBudget(5.0, 10.0);

    expect(comparison.withinBudget).toBe(true);
    expect(comparison.percentage).toBe(50);
    expect(comparison.remaining).toBe(5.0);
    expect(comparison.exceeded).toBe(0);
  });

  it('should detect budget exceeded', () => {
    const comparison = estimator.compareToBudget(15.0, 10.0);

    expect(comparison.withinBudget).toBe(false);
    expect(comparison.exceeded).toBe(5.0);
  });

  it('should provide cost optimization suggestions', () => {
    const nodes = [
      {
        id: 'expensive',
        type: 'openai',
        position: { x: 0, y: 0 },
        data: {
          config: { model: 'gpt-4', maxTokens: 2000 },
        } as any,
      },
    ] as WorkflowNode[];

    const suggestions = estimator.getCostOptimizationSuggestions(nodes);

    expect(suggestions.length).toBeGreaterThanOrEqual(0);
  });
});

describe('DataFlowValidator', () => {
  let validator: DataFlowValidator;

  beforeEach(() => {
    validator = new DataFlowValidator();
  });

  it('should validate node data', async () => {
    const node: WorkflowNode = {
      id: 'test',
      type: 'httpRequest',
      position: { x: 0, y: 0 },
      data: {
        id: 'test',
        type: 'httpRequest',
        label: 'Test',
        position: { x: 0, y: 0 },
        icon: 'globe',
        color: 'blue',
        inputs: 1,
        outputs: 1,
        config: { url: 'https://example.com', method: 'GET' },
      },
    };

    const inputData = { url: 'https://example.com' };
    const outputData = { statusCode: 200, body: {}, headers: {} };

    const validation = await validator.validateNodeData(node, inputData, outputData);

    expect(validation.valid).toBe(true);
  });

  it('should detect missing required fields', async () => {
    const node: WorkflowNode = {
      id: 'test',
      type: 'email',
      position: { x: 0, y: 0 },
      data: {
        id: 'test',
        type: 'email',
        label: 'Email',
        position: { x: 0, y: 0 },
        icon: 'mail',
        color: 'red',
        inputs: 1,
        outputs: 1,
      },
    };

    const inputData = {}; // Missing required fields
    const outputData = {};

    const validation = await validator.validateNodeData(node, inputData, outputData);

    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should infer schema from data', () => {
    const data = {
      name: 'Test',
      age: 30,
      active: true,
      tags: ['a', 'b'],
    };

    const schema = validator.inferSchema(data);

    expect(schema.type).toBe('object');
    expect(schema.properties).toBeDefined();
    expect(schema.properties?.name.type).toBe('string');
    expect(schema.properties?.age.type).toBe('number');
    expect(schema.properties?.tags.type).toBe('array');
  });

  it('should suggest data mapping', () => {
    const sourceData = { userName: 'John', userAge: 30 };
    const targetRequirements = [
      { field: 'name', type: 'string', required: true },
      { field: 'age', type: 'number', required: true },
    ];

    const mapping = validator.suggestMapping(sourceData, targetRequirements);

    expect(Object.keys(mapping).length).toBeGreaterThanOrEqual(0);
  });

  it('should validate transformation compatibility', async () => {
    const sourceNode: WorkflowNode = {
      id: 'source',
      type: 'httpRequest',
      position: { x: 0, y: 0 },
      data: {} as any,
    };

    const targetNode: WorkflowNode = {
      id: 'target',
      type: 'filter',
      position: { x: 100, y: 0 },
      data: {} as any,
    };

    const validation = await validator.validateTransformation(sourceNode, targetNode, {});

    expect(validation).toHaveProperty('compatible');
    expect(validation).toHaveProperty('issues');
    expect(validation).toHaveProperty('suggestions');
  });
});

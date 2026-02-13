/**
 * Cost Calculator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CostCalculator } from '../../analytics/cost/CostCalculator';
import type { ExecutionMetrics, NodeExecutionMetric } from '../../types/advanced-analytics';

describe('CostCalculator', () => {
  let calculator: CostCalculator;

  beforeEach(() => {
    calculator = new CostCalculator();
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = calculator.getConfig();

      expect(config.apiCall).toBe(0.001);
      expect(config.compute).toBe(0.0001);
      expect(config.storage).toBe(0.00001);
    });

    it('should allow configuration updates', () => {
      calculator.updateConfig({ apiCall: 0.002 });

      const config = calculator.getConfig();
      expect(config.apiCall).toBe(0.002);
    });
  });

  describe('Execution Cost Calculation', () => {
    it('should calculate execution cost', () => {
      const metrics: ExecutionMetrics = {
        workflowId: 'workflow-1',
        executionId: 'exec-1',
        startTime: new Date(),
        endTime: new Date(Date.now() + 30000),
        duration: 30000,
        status: 'success',
        nodeExecutions: [],
        resourceUsage: {
          cpuTime: 30000,
          memoryPeak: 100 * 1024 * 1024,
          networkIn: 1024 * 1024,
          networkOut: 2 * 1024 * 1024,
          storageUsed: 10 * 1024 * 1024,
        },
        cost: {
          apiCalls: 0,
          llmTokens: 0,
          compute: 0,
          storage: 0,
          total: 0,
          breakdown: [],
        },
      };

      const cost = calculator.calculateExecutionCost(metrics);

      expect(cost).toBeDefined();
      expect(cost.total).toBeGreaterThan(0);
      expect(cost.compute).toBeGreaterThan(0);
      expect(cost.breakdown).toBeDefined();
      expect(cost.breakdown.length).toBeGreaterThan(0);
    });

    it('should include node execution costs', () => {
      const nodeExecution: NodeExecutionMetric = {
        nodeId: 'node-1',
        nodeType: 'http',
        startTime: new Date(),
        endTime: new Date(Date.now() + 5000),
        duration: 5000,
        status: 'success',
        apiCalls: 5,
      };

      const metrics: ExecutionMetrics = {
        workflowId: 'workflow-1',
        executionId: 'exec-1',
        startTime: new Date(),
        endTime: new Date(Date.now() + 30000),
        duration: 30000,
        status: 'success',
        nodeExecutions: [nodeExecution],
        resourceUsage: {
          cpuTime: 30000,
          memoryPeak: 0,
          networkIn: 0,
          networkOut: 0,
          storageUsed: 0,
        },
        cost: {
          apiCalls: 0,
          llmTokens: 0,
          compute: 0,
          storage: 0,
          total: 0,
          breakdown: [],
        },
      };

      const cost = calculator.calculateExecutionCost(metrics);

      expect(cost.apiCalls).toBeGreaterThan(0);
    });
  });

  describe('Node Cost Calculation', () => {
    it('should calculate node cost', () => {
      const node: NodeExecutionMetric = {
        nodeId: 'node-1',
        nodeType: 'http',
        startTime: new Date(),
        endTime: new Date(Date.now() + 5000),
        duration: 5000,
        status: 'success',
        apiCalls: 3,
      };

      const cost = calculator.calculateNodeCost(node);

      expect(cost).toBeDefined();
      expect(cost.total).toBeGreaterThan(0);
      expect(cost.apiCalls).toBeGreaterThan(0);
    });

    it('should handle nodes without API calls', () => {
      const node: NodeExecutionMetric = {
        nodeId: 'node-1',
        nodeType: 'delay',
        startTime: new Date(),
        endTime: new Date(Date.now() + 2000),
        duration: 2000,
        status: 'success',
      };

      const cost = calculator.calculateNodeCost(node);

      expect(cost).toBeDefined();
      expect(cost.total).toBeGreaterThan(0);
      expect(cost.compute).toBeGreaterThan(0);
    });
  });

  describe('Node Type Cost Calculation', () => {
    it('should calculate LLM node cost', () => {
      const cost = calculator.calculateNodeTypeCost('llm', {
        llmTokensInput: 1000,
        llmTokensOutput: 500,
        computeTime: 5,
      });

      expect(cost).toBeDefined();
      expect(cost.total).toBeGreaterThan(0);
      expect(cost.llmTokens).toBeGreaterThan(0);
    });

    it('should calculate HTTP node cost', () => {
      const cost = calculator.calculateNodeTypeCost('http', {
        apiCalls: 5,
        networkIn: 1,
        networkOut: 2,
        computeTime: 3,
      });

      expect(cost).toBeDefined();
      expect(cost.total).toBeGreaterThan(0);
      expect(cost.apiCalls).toBeGreaterThan(0);
    });

    it('should calculate database node cost', () => {
      const cost = calculator.calculateNodeTypeCost('database', {
        apiCalls: 2,
        computeTime: 10,
        networkIn: 5,
        networkOut: 1,
      });

      expect(cost).toBeDefined();
      expect(cost.total).toBeGreaterThan(0);
    });
  });

  describe('LLM Model Costs', () => {
    it('should get GPT-4 model costs', () => {
      const costs = calculator.getLLMModelCost('gpt-4');

      expect(costs.inputTokenCost).toBe(0.03);
      expect(costs.outputTokenCost).toBe(0.06);
    });

    it('should get GPT-3.5-turbo model costs', () => {
      const costs = calculator.getLLMModelCost('gpt-3.5-turbo');

      expect(costs.inputTokenCost).toBe(0.0005);
      expect(costs.outputTokenCost).toBe(0.0015);
    });

    it('should use default costs for unknown models', () => {
      const costs = calculator.getLLMModelCost('unknown-model');

      expect(costs.inputTokenCost).toBeDefined();
      expect(costs.outputTokenCost).toBeDefined();
    });
  });

  describe('Model Savings Calculation', () => {
    it('should calculate savings from switching models', () => {
      const savings = calculator.calculateModelSavings(
        'gpt-4',
        'gpt-3.5-turbo',
        10000,
        5000
      );

      expect(savings).toBeDefined();
      expect(savings.currentCost).toBeGreaterThan(savings.proposedCost);
      expect(savings.savings).toBeGreaterThan(0);
      expect(savings.savingsPercentage).toBeGreaterThan(0);
    });

    it('should return zero savings for same model', () => {
      const savings = calculator.calculateModelSavings(
        'gpt-4',
        'gpt-4',
        10000,
        5000
      );

      expect(savings.savings).toBe(0);
      expect(savings.savingsPercentage).toBe(0);
    });

    it('should handle zero tokens', () => {
      const savings = calculator.calculateModelSavings(
        'gpt-4',
        'gpt-3.5-turbo',
        0,
        0
      );

      expect(savings.currentCost).toBe(0);
      expect(savings.proposedCost).toBe(0);
      expect(savings.savings).toBe(0);
    });
  });

  describe('Cost Breakdown', () => {
    it('should provide detailed cost breakdown', () => {
      const metrics: ExecutionMetrics = {
        workflowId: 'workflow-1',
        executionId: 'exec-1',
        startTime: new Date(),
        endTime: new Date(Date.now() + 30000),
        duration: 30000,
        status: 'success',
        nodeExecutions: [
          {
            nodeId: 'node-1',
            nodeType: 'http',
            startTime: new Date(),
            endTime: new Date(Date.now() + 5000),
            duration: 5000,
            status: 'success',
            apiCalls: 3,
          },
        ],
        resourceUsage: {
          cpuTime: 30000,
          memoryPeak: 0,
          networkIn: 1024 * 1024,
          networkOut: 2 * 1024 * 1024,
          storageUsed: 10 * 1024 * 1024,
        },
        cost: {
          apiCalls: 0,
          llmTokens: 0,
          compute: 0,
          storage: 0,
          total: 0,
          breakdown: [],
        },
      };

      const cost = calculator.calculateExecutionCost(metrics);

      expect(cost.breakdown).toBeDefined();
      expect(cost.breakdown.length).toBeGreaterThan(0);

      cost.breakdown.forEach((item) => {
        expect(item.category).toBeDefined();
        expect(item.amount).toBeGreaterThanOrEqual(0);
        expect(item.unit).toBeDefined();
        expect(item.unitCost).toBeGreaterThanOrEqual(0);
        expect(item.totalCost).toBeGreaterThanOrEqual(0);
      });
    });
  });
});

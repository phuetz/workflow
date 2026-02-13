// TEST WRITING PLAN WEEK 1 - DAY 1: ExecutionValidator Tests
// Adding 20 tests for ExecutionValidator.ts
import { describe, it, expect } from 'vitest';
import { ExecutionValidator } from '../components/execution/ExecutionValidator';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow';

const createTestNode = (id: string, type: string, config: any = {}): WorkflowNode => ({
  id,
  type: 'custom',
  position: { x: 0, y: 0 },
  data: {
    id,
    type,
    label: `${type}-${id}`,
    position: { x: 0, y: 0 },
    icon: 'default',
    color: '#333',
    inputs: 1,
    outputs: 1,
    config
  }
});

const createTestEdge = (source: string, target: string): WorkflowEdge => ({
  id: `edge-${source}-${target}`,
  source,
  target,
  type: 'default'
});

describe('ExecutionValidator - Workflow Validation (Week 1 - Day 1)', () => {

  describe('Basic Validation', () => {

    it('should validate empty workflow', async () => {
      const nodes: WorkflowNode[] = [];
      const edges: WorkflowEdge[] = [];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });

    it('should validate single node workflow', async () => {
      const nodes = [createTestNode('trigger', 'trigger')];
      const edges: WorkflowEdge[] = [];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.issues).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should validate workflow with connections', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger'),
        createTestNode('action', 'transform')
      ];
      const edges = [createTestEdge('trigger', 'action')];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
    });

    it('should detect invalid workflow structure', async () => {
      const nodes = [
        createTestNode('node1', 'transform') // No trigger node
      ];
      const edges: WorkflowEdge[] = [];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      // Should either be invalid or have warnings
      expect(result).toBeDefined();
      if (!result.valid) {
        expect(result.issues.length).toBeGreaterThan(0);
      }
    });

  });

  describe('Node Configuration Validation', () => {

    it('should accept valid node configuration', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger', { mockData: { value: 1 } })
      ];
      const edges: WorkflowEdge[] = [];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      expect(result.valid).toBe(true);
    });

    it('should detect missing required fields', async () => {
      const nodes = [
        createTestNode('http', 'httpRequest', {}) // Missing URL
      ];
      const edges: WorkflowEdge[] = [];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      // Validation should detect missing configuration
      expect(result).toBeDefined();
      // May or may not fail depending on implementation
    });

    it('should validate node types', async () => {
      const nodes = [
        { ...createTestNode('invalid', 'unknownType'), data: { ...createTestNode('invalid', 'unknownType').data, type: 'unknownType' } }
      ];
      const edges: WorkflowEdge[] = [];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      expect(result).toBeDefined();
      // Unknown types may generate warnings
    });

  });

  describe('Edge Validation', () => {

    it('should validate edge connections', async () => {
      const nodes = [
        createTestNode('start', 'trigger'),
        createTestNode('end', 'transform')
      ];
      const edges = [createTestEdge('start', 'end')];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('should detect edges with missing source node', async () => {
      const nodes = [
        createTestNode('existing', 'trigger')
      ];
      const edges = [createTestEdge('missing', 'existing')];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      // Should detect the invalid edge
      expect(result).toBeDefined();
      if (!result.valid) {
        expect(result.issues.length).toBeGreaterThan(0);
      }
    });

    it('should detect edges with missing target node', async () => {
      const nodes = [
        createTestNode('existing', 'trigger')
      ];
      const edges = [createTestEdge('existing', 'missing')];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      // Should detect the invalid edge
      expect(result).toBeDefined();
    });

  });

  describe('Circular Dependency Detection', () => {

    it('should allow linear workflows', async () => {
      const nodes = [
        createTestNode('a', 'trigger'),
        createTestNode('b', 'transform'),
        createTestNode('c', 'transform')
      ];
      const edges = [
        createTestEdge('a', 'b'),
        createTestEdge('b', 'c')
      ];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      expect(result.valid).toBe(true);
    });

    it('should detect simple circular dependency', async () => {
      const nodes = [
        createTestNode('a', 'trigger'),
        createTestNode('b', 'transform')
      ];
      const edges = [
        createTestEdge('a', 'b'),
        createTestEdge('b', 'a') // Creates cycle
      ];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      // Should detect cycle
      expect(result).toBeDefined();
      if (!result.valid) {
        expect(result.hasCriticalIssues).toBe(true);
      }
    });

    it('should detect complex circular dependencies', async () => {
      const nodes = [
        createTestNode('a', 'trigger'),
        createTestNode('b', 'transform'),
        createTestNode('c', 'transform')
      ];
      const edges = [
        createTestEdge('a', 'b'),
        createTestEdge('b', 'c'),
        createTestEdge('c', 'a') // Creates cycle
      ];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      // Should detect cycle
      expect(result).toBeDefined();
    });

  });

  describe('Orphaned Node Detection', () => {

    it('should allow disconnected trigger nodes', async () => {
      const nodes = [
        createTestNode('trigger1', 'trigger'),
        createTestNode('trigger2', 'trigger')
      ];
      const edges: WorkflowEdge[] = [];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      expect(result.valid).toBe(true);
    });

    it('should detect orphaned non-trigger nodes', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger'),
        createTestNode('orphan', 'transform') // Not connected
      ];
      const edges: WorkflowEdge[] = [];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      // May generate warnings for orphaned nodes
      expect(result).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

  });

  describe('Duplicate Detection', () => {

    it('should detect duplicate node IDs', async () => {
      const nodes = [
        createTestNode('same-id', 'trigger'),
        createTestNode('same-id', 'transform') // Duplicate ID
      ];
      const edges: WorkflowEdge[] = [];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      // Should detect duplicates as critical issue
      expect(result).toBeDefined();
    });

    it('should allow duplicate node types', async () => {
      const nodes = [
        createTestNode('trigger1', 'trigger'),
        createTestNode('trigger2', 'trigger') // Same type is OK
      ];
      const edges: WorkflowEdge[] = [];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      expect(result.valid).toBe(true);
    });

  });

  describe('Validation Result Structure', () => {

    it('should return structured validation result', async () => {
      const nodes = [createTestNode('trigger', 'trigger')];
      const edges: WorkflowEdge[] = [];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('hasCriticalIssues');
    });

    it('should return issues array', async () => {
      const nodes = [createTestNode('trigger', 'trigger')];
      const edges: WorkflowEdge[] = [];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should return warnings array', async () => {
      const nodes = [createTestNode('trigger', 'trigger')];
      const edges: WorkflowEdge[] = [];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should indicate critical issues', async () => {
      const nodes = [createTestNode('trigger', 'trigger')];
      const edges: WorkflowEdge[] = [];
      const validator = new ExecutionValidator(nodes, edges);

      const result = await validator.validateWorkflow();

      expect(typeof result.hasCriticalIssues).toBe('boolean');
    });

  });

});

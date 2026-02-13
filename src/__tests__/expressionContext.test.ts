// TEST WRITING PLAN WEEK 1 - DAY 2: ExpressionContext Tests
// Adding 15 tests for ExpressionContext.ts
import { describe, it, expect } from 'vitest';
import { ExpressionContext } from '../expressions/ExpressionContext';
import type { WorkflowItem, WorkflowMetadata, ExecutionMetadata } from '../expressions/ExpressionContext';

describe('ExpressionContext - Context Building (Week 1 - Day 2)', () => {

  describe('Context Initialization', () => {

    it('should create context with default values', () => {
      const context = new ExpressionContext();
      const built = context.buildContext();

      expect(built).toBeDefined();
      expect(built.$json).toBeDefined();
      expect(built.$items).toBeDefined();
      expect(built.$runIndex).toBe(0);
    });

    it('should create context with provided values', () => {
      const item: WorkflowItem = { json: { name: 'Test' } };
      const context = new ExpressionContext({ currentItem: item });
      const built = context.buildContext();

      expect(built.$json).toEqual({ name: 'Test' });
    });

    it('should handle workflow metadata', () => {
      const workflow: WorkflowMetadata = {
        id: 'wf-123',
        name: 'Test Workflow',
        active: true
      };
      const context = new ExpressionContext({ workflow });
      const built = context.buildContext();

      expect(built.$workflow.id).toBe('wf-123');
      expect(built.$workflow.name).toBe('Test Workflow');
      expect(built.$workflow.active).toBe(true);
    });

    it('should handle execution metadata', () => {
      const execution: ExecutionMetadata = {
        id: 'exec-456',
        mode: 'manual',
        startedAt: new Date('2025-01-01')
      };
      const context = new ExpressionContext({ execution });
      const built = context.buildContext();

      expect(built.$execution.id).toBe('exec-456');
      expect(built.$execution.mode).toBe('manual');
    });

  });

  describe('Context Variables', () => {

    it('should provide $json from current item', () => {
      const item: WorkflowItem = { json: { value: 42 } };
      const context = new ExpressionContext({ currentItem: item });
      const built = context.buildContext();

      expect(built.$json.value).toBe(42);
    });

    it('should provide $binary from current item', () => {
      const item: WorkflowItem = {
        json: {},
        binary: { file: { data: 'base64data' } }
      };
      const context = new ExpressionContext({ currentItem: item });
      const built = context.buildContext();

      expect(built.$binary.file).toBeDefined();
      expect(built.$binary.file.data).toBe('base64data');
    });

    it('should provide $items array', () => {
      const items: WorkflowItem[] = [
        { json: { id: 1 } },
        { json: { id: 2 } },
        { json: { id: 3 } }
      ];
      const context = new ExpressionContext({ allItems: items });
      const built = context.buildContext();

      expect(built.$items).toHaveLength(3);
      expect(built.$items[0].json.id).toBe(1);
    });

    it('should provide $item() function for index access', () => {
      const items: WorkflowItem[] = [
        { json: { id: 1 } },
        { json: { id: 2 } },
        { json: { id: 3 } }
      ];
      const context = new ExpressionContext({ allItems: items });
      const built = context.buildContext();

      expect(built.$item(0).json.id).toBe(1);
      expect(built.$item(1).json.id).toBe(2);
      expect(built.$item(-1).json.id).toBe(3); // Negative index
    });

    it('should provide $node() function for node data access', () => {
      const nodeData = new Map([
        ['HTTP Request', { json: [{ status: 200 }] }]
      ]);
      const context = new ExpressionContext({ nodeData });
      const built = context.buildContext();

      const nodeResult = built.$node('HTTP Request');
      expect(nodeResult.json).toHaveLength(1);
      expect(nodeResult.json[0].status).toBe(200);
    });

    it('should provide position variables ($first, $last, $position)', () => {
      const items: WorkflowItem[] = [
        { json: { id: 1 } },
        { json: { id: 2 } },
        { json: { id: 3 } }
      ];
      const context = new ExpressionContext({
        allItems: items,
        currentItemIndex: 0
      });
      const built = context.buildContext();

      expect(built.$first).toBe(true);
      expect(built.$last).toBe(false);
      expect(built.$position).toBe(0);
    });

    it('should provide utility variables ($now, $today, $uuid)', () => {
      const context = new ExpressionContext();
      const built = context.buildContext();

      expect(built.$now).toBeInstanceOf(Date);
      expect(built.$today).toBeInstanceOf(Date);
      expect(typeof built.$uuid).toBe('function');

      const uuid = built.$uuid();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should provide environment variables', () => {
      const env = {
        API_KEY: 'secret-key',
        BASE_URL: 'https://api.example.com'
      };
      const context = new ExpressionContext({ environment: env });
      const built = context.buildContext();

      expect(built.$env.API_KEY).toBe('secret-key');
      expect(built.$env.BASE_URL).toBe('https://api.example.com');
    });

  });

  describe('Context Updates', () => {

    it('should update current item', () => {
      const context = new ExpressionContext();
      const newItem: WorkflowItem = { json: { updated: true } };

      context.setCurrentItem(newItem, 5);
      const built = context.buildContext();

      expect(built.$json.updated).toBe(true);
      expect(built.$itemIndex).toBe(5);
    });

    it('should update all items', () => {
      const context = new ExpressionContext();
      const newItems: WorkflowItem[] = [
        { json: { id: 10 } },
        { json: { id: 20 } }
      ];

      context.setAllItems(newItems);
      const built = context.buildContext();

      expect(built.$items).toHaveLength(2);
      expect(built.$items[0].json.id).toBe(10);
    });

    it('should clone context with modifications', () => {
      const original = new ExpressionContext({ runIndex: 1 });
      const cloned = original.clone({ runIndex: 2 });

      const originalBuilt = original.buildContext();
      const clonedBuilt = cloned.buildContext();

      expect(originalBuilt.$runIndex).toBe(1);
      expect(clonedBuilt.$runIndex).toBe(2);
    });

  });

  describe('Context Summary', () => {

    it('should provide context summary for debugging', () => {
      const items: WorkflowItem[] = [{ json: {} }, { json: {} }];
      const workflow: WorkflowMetadata = {
        id: 'wf-123',
        name: 'Test',
        active: true
      };
      const context = new ExpressionContext({
        allItems: items,
        workflow,
        currentItemIndex: 1,
        runIndex: 3
      });

      const summary = context.getSummary();

      expect(summary.currentItemIndex).toBe(1);
      expect(summary.totalItems).toBe(2);
      expect(summary.runIndex).toBe(3);
      expect(summary.workflowId).toBe('wf-123');
      expect(Array.isArray(summary.availableNodes)).toBe(true);
    });

  });

  describe('Node Data Access', () => {

    it('should provide first() and last() shortcuts', () => {
      const nodeData = new Map([
        ['Test Node', {
          json: [{ id: 1 }, { id: 2 }, { id: 3 }]
        }]
      ]);
      const context = new ExpressionContext({ nodeData });
      const built = context.buildContext();

      const node = built.$node('Test Node');
      expect(node.first().json.id).toBe(1);
      expect(node.last().json.id).toBe(3);
    });

    it('should handle missing nodes gracefully', () => {
      const context = new ExpressionContext();
      const built = context.buildContext();

      const node = built.$node('Nonexistent Node');
      expect(node.json).toEqual([]);
      expect(node.binary).toEqual([]);
    });

  });

});

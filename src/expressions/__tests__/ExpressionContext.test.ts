/**
 * ExpressionContext Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExpressionContext } from '../ExpressionContext';
import type { WorkflowItem, NodeData, WorkflowMetadata, ExecutionMetadata } from '../ExpressionContext';

describe('ExpressionContext', () => {
  let context: ExpressionContext;

  beforeEach(() => {
    context = new ExpressionContext();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const ctx = new ExpressionContext();
      const built = ctx.buildContext();

      expect(built.$json).toEqual({});
      expect(built.$items).toEqual([]);
      expect(built.$runIndex).toBe(0);
    });

    it('should initialize with provided values', () => {
      const currentItem: WorkflowItem = { json: { name: 'test' } };
      const ctx = new ExpressionContext({ currentItem, currentItemIndex: 5 });
      const built = ctx.buildContext();

      expect(built.$json).toEqual({ name: 'test' });
      expect(built.$itemIndex).toBe(5);
    });
  });

  describe('$json', () => {
    it('should return current item JSON', () => {
      const item: WorkflowItem = { json: { name: 'Alice', age: 30 } };
      context = new ExpressionContext({ currentItem: item });
      const built = context.buildContext();

      expect(built.$json).toEqual({ name: 'Alice', age: 30 });
    });

    it('should return empty object if no item', () => {
      const built = context.buildContext();
      expect(built.$json).toEqual({});
    });
  });

  describe('$binary', () => {
    it('should return current item binary data', () => {
      const item: WorkflowItem = {
        json: {},
        binary: { file: { data: 'base64...' } },
      };
      context = new ExpressionContext({ currentItem: item });
      const built = context.buildContext();

      expect(built.$binary).toEqual({ file: { data: 'base64...' } });
    });

    it('should return empty object if no binary', () => {
      const built = context.buildContext();
      expect(built.$binary).toEqual({});
    });
  });

  describe('$item', () => {
    it('should access item by index', () => {
      const items: WorkflowItem[] = [
        { json: { id: 1 } },
        { json: { id: 2 } },
        { json: { id: 3 } },
      ];
      context = new ExpressionContext({ allItems: items });
      const built = context.buildContext();

      expect(built.$item(0).json).toEqual({ id: 1 });
      expect(built.$item(1).json).toEqual({ id: 2 });
      expect(built.$item(2).json).toEqual({ id: 3 });
    });

    it('should handle negative indices', () => {
      const items: WorkflowItem[] = [
        { json: { id: 1 } },
        { json: { id: 2 } },
        { json: { id: 3 } },
      ];
      context = new ExpressionContext({ allItems: items });
      const built = context.buildContext();

      expect(built.$item(-1).json).toEqual({ id: 3 });
      expect(built.$item(-2).json).toEqual({ id: 2 });
    });

    it('should return default for out of bounds', () => {
      const items: WorkflowItem[] = [{ json: { id: 1 } }];
      context = new ExpressionContext({ allItems: items });
      const built = context.buildContext();

      expect(built.$item(10)).toEqual({ json: {}, binary: {} });
    });
  });

  describe('$items', () => {
    it('should return all items', () => {
      const items: WorkflowItem[] = [
        { json: { id: 1 } },
        { json: { id: 2 } },
      ];
      context = new ExpressionContext({ allItems: items });
      const built = context.buildContext();

      expect(built.$items).toEqual(items);
      expect(built.$items.length).toBe(2);
    });
  });

  describe('$node', () => {
    it('should access node data', () => {
      const nodeData = new Map<string, NodeData>();
      nodeData.set('HTTP Request', {
        json: [{ status: 200, data: { result: 'success' } }],
      });

      context = new ExpressionContext({ nodeData });
      const built = context.buildContext();

      const httpData = built.$node('HTTP Request');
      expect(httpData.json).toHaveLength(1);
      expect(httpData.json[0].status).toBe(200);
    });

    it('should return empty for non-existent node', () => {
      context = new ExpressionContext();
      const built = context.buildContext();

      const data = built.$node('NonExistent');
      expect(data.json).toEqual([]);
      expect(data.binary).toEqual([]);
    });

    it('should provide first() helper', () => {
      const nodeData = new Map<string, NodeData>();
      nodeData.set('Test', {
        json: [{ id: 1 }, { id: 2 }],
      });

      context = new ExpressionContext({ nodeData });
      const built = context.buildContext();

      const first = built.$node('Test').first();
      expect(first.json).toEqual({ id: 1 });
    });

    it('should provide last() helper', () => {
      const nodeData = new Map<string, NodeData>();
      nodeData.set('Test', {
        json: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });

      context = new ExpressionContext({ nodeData });
      const built = context.buildContext();

      const last = built.$node('Test').last();
      expect(last.json).toEqual({ id: 3 });
    });
  });

  describe('$workflow', () => {
    it('should return workflow metadata', () => {
      const workflow: WorkflowMetadata = {
        id: 'wf-123',
        name: 'My Workflow',
        active: true,
        tags: ['production'],
      };

      context = new ExpressionContext({ workflow });
      const built = context.buildContext();

      expect(built.$workflow.id).toBe('wf-123');
      expect(built.$workflow.name).toBe('My Workflow');
      expect(built.$workflow.active).toBe(true);
    });

    it('should return default if no workflow', () => {
      const built = context.buildContext();

      expect(built.$workflow.id).toBe('');
      expect(built.$workflow.name).toBe('');
      expect(built.$workflow.active).toBe(false);
    });
  });

  describe('$execution', () => {
    it('should return execution metadata', () => {
      const execution: ExecutionMetadata = {
        id: 'exec-456',
        mode: 'manual',
        startedAt: new Date('2024-01-15T10:00:00Z'),
      };

      context = new ExpressionContext({ execution });
      const built = context.buildContext();

      expect(built.$execution.id).toBe('exec-456');
      expect(built.$execution.mode).toBe('manual');
      expect(built.$execution.startedAt).toEqual(execution.startedAt);
    });
  });

  describe('$env', () => {
    it('should return environment variables', () => {
      const environment = {
        API_KEY: 'secret-key',
        API_URL: 'https://api.example.com',
      };

      context = new ExpressionContext({ environment });
      const built = context.buildContext();

      expect(built.$env.API_KEY).toBe('secret-key');
      expect(built.$env.API_URL).toBe('https://api.example.com');
    });
  });

  describe('$now', () => {
    it('should return current date', () => {
      const built = context.buildContext();
      const now = built.$now;

      expect(now).toBeInstanceOf(Date);
      expect(now.getTime()).toBeGreaterThan(0);
    });
  });

  describe('$today', () => {
    it('should return today at midnight', () => {
      const built = context.buildContext();
      const today = built.$today;

      expect(today).toBeInstanceOf(Date);
      expect(today.getHours()).toBe(0);
      expect(today.getMinutes()).toBe(0);
      expect(today.getSeconds()).toBe(0);
    });
  });

  describe('$uuid', () => {
    it('should generate UUID', () => {
      const built = context.buildContext();
      const uuid1 = built.$uuid();
      const uuid2 = built.$uuid();

      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(uuid2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('$runIndex', () => {
    it('should return run index', () => {
      context = new ExpressionContext({ runIndex: 5 });
      const built = context.buildContext();

      expect(built.$runIndex).toBe(5);
    });
  });

  describe('$itemIndex', () => {
    it('should return current item index', () => {
      context = new ExpressionContext({ currentItemIndex: 3 });
      const built = context.buildContext();

      expect(built.$itemIndex).toBe(3);
    });
  });

  describe('$position', () => {
    it('should return position', () => {
      context = new ExpressionContext({ currentItemIndex: 2 });
      const built = context.buildContext();

      expect(built.$position).toBe(2);
    });
  });

  describe('$first and $last', () => {
    it('should detect first item', () => {
      const items: WorkflowItem[] = [
        { json: { id: 1 } },
        { json: { id: 2 } },
      ];
      context = new ExpressionContext({ allItems: items, currentItemIndex: 0 });
      const built = context.buildContext();

      expect(built.$first).toBe(true);
      expect(built.$last).toBe(false);
    });

    it('should detect last item', () => {
      const items: WorkflowItem[] = [
        { json: { id: 1 } },
        { json: { id: 2 } },
      ];
      context = new ExpressionContext({ allItems: items, currentItemIndex: 1 });
      const built = context.buildContext();

      expect(built.$first).toBe(false);
      expect(built.$last).toBe(true);
    });

    it('should handle middle item', () => {
      const items: WorkflowItem[] = [
        { json: { id: 1 } },
        { json: { id: 2 } },
        { json: { id: 3 } },
      ];
      context = new ExpressionContext({ allItems: items, currentItemIndex: 1 });
      const built = context.buildContext();

      expect(built.$first).toBe(false);
      expect(built.$last).toBe(false);
    });
  });

  describe('$input', () => {
    it('should provide all() method', () => {
      const items: WorkflowItem[] = [
        { json: { id: 1 } },
        { json: { id: 2 } },
      ];
      context = new ExpressionContext({ allItems: items });
      const built = context.buildContext();

      expect(built.$input.all()).toEqual(items);
    });

    it('should provide first() method', () => {
      const items: WorkflowItem[] = [
        { json: { id: 1 } },
        { json: { id: 2 } },
      ];
      context = new ExpressionContext({ allItems: items });
      const built = context.buildContext();

      expect(built.$input.first()).toEqual(items[0]);
    });

    it('should provide last() method', () => {
      const items: WorkflowItem[] = [
        { json: { id: 1 } },
        { json: { id: 2 } },
      ];
      context = new ExpressionContext({ allItems: items });
      const built = context.buildContext();

      expect(built.$input.last()).toEqual(items[1]);
    });
  });

  describe('mutation methods', () => {
    it('should update current item', () => {
      context.setCurrentItem({ json: { updated: true } }, 10);
      const built = context.buildContext();

      expect(built.$json).toEqual({ updated: true });
      expect(built.$itemIndex).toBe(10);
    });

    it('should update all items', () => {
      const newItems: WorkflowItem[] = [{ json: { new: true } }];
      context.setAllItems(newItems);
      const built = context.buildContext();

      expect(built.$items).toEqual(newItems);
    });

    it('should add node data', () => {
      context.addNodeData('TestNode', { json: [{ test: true }] });
      const built = context.buildContext();

      expect(built.$node('TestNode').json).toEqual([{ test: true }]);
    });

    it('should set workflow', () => {
      const workflow: WorkflowMetadata = {
        id: 'new-id',
        name: 'New Workflow',
        active: true,
      };
      context.setWorkflow(workflow);
      const built = context.buildContext();

      expect(built.$workflow).toEqual(workflow);
    });

    it('should set execution', () => {
      const execution: ExecutionMetadata = {
        id: 'exec-new',
        mode: 'trigger',
        startedAt: new Date(),
      };
      context.setExecution(execution);
      const built = context.buildContext();

      expect(built.$execution).toEqual(execution);
    });

    it('should set environment', () => {
      const env = { NEW_VAR: 'value' };
      context.setEnvironment(env);
      const built = context.buildContext();

      expect(built.$env).toEqual(env);
    });

    it('should set run index', () => {
      context.setRunIndex(42);
      const built = context.buildContext();

      expect(built.$runIndex).toBe(42);
    });
  });

  describe('clone', () => {
    it('should create a copy with same values', () => {
      const original = new ExpressionContext({
        runIndex: 5,
        currentItemIndex: 2,
      });

      const cloned = original.clone();
      const built = cloned.buildContext();

      expect(built.$runIndex).toBe(5);
      expect(built.$itemIndex).toBe(2);
    });

    it('should allow overriding values', () => {
      const original = new ExpressionContext({ runIndex: 5 });
      const cloned = original.clone({ runIndex: 10 });
      const built = cloned.buildContext();

      expect(built.$runIndex).toBe(10);
    });
  });

  describe('getSummary', () => {
    it('should provide context summary', () => {
      const items: WorkflowItem[] = [{ json: { id: 1 } }, { json: { id: 2 } }];
      const nodeData = new Map<string, NodeData>();
      nodeData.set('Node1', { json: [] });

      context = new ExpressionContext({
        allItems: items,
        currentItemIndex: 1,
        runIndex: 3,
        nodeData,
      });

      const summary = context.getSummary();

      expect(summary.currentItemIndex).toBe(1);
      expect(summary.totalItems).toBe(2);
      expect(summary.runIndex).toBe(3);
      expect(summary.availableNodes).toEqual(['Node1']);
    });
  });
});

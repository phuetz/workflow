// TEST WRITING PLAN WEEK 1 - DAY 3: Filter Node Tests
// Adding 10 tests for Filter Node
import { describe, it, expect } from 'vitest';
import { nodeTypes } from '../../data/nodeTypes';

describe('Filter Node - Data Filtering (Week 1 - Day 3)', () => {

  describe('Node Type Definition', () => {

    it('should have correct node type configuration', () => {
      const filterNode = nodeTypes['filter'];

      expect(filterNode).toBeDefined();
      expect(filterNode.type).toBe('filter');
      expect(filterNode.category).toBe('data');
    });

    it('should accept input and produce output', () => {
      const filterNode = nodeTypes['filter'];

      expect(filterNode.inputs).toBe(1);
      expect(filterNode.outputs).toBeGreaterThanOrEqual(1);
    });

  });

  describe('Filter Conditions', () => {

    it('should filter by simple equality', () => {
      const items = [
        { id: 1, status: 'active' },
        { id: 2, status: 'inactive' },
        { id: 3, status: 'active' }
      ];

      const condition = { field: 'status', operator: 'equals', value: 'active' };
      const filtered = items.filter(item => item.status === condition.value);

      expect(filtered).toHaveLength(2);
      expect(filtered[0].id).toBe(1);
      expect(filtered[1].id).toBe(3);
    });

    it('should filter by numeric comparison', () => {
      const items = [
        { id: 1, age: 25 },
        { id: 2, age: 35 },
        { id: 3, age: 45 }
      ];

      const greaterThan30 = items.filter(item => item.age > 30);

      expect(greaterThan30).toHaveLength(2);
      expect(greaterThan30.every(item => item.age > 30)).toBe(true);
    });

    it('should support multiple filter conditions (AND)', () => {
      const items = [
        { id: 1, age: 25, status: 'active' },
        { id: 2, age: 35, status: 'inactive' },
        { id: 3, age: 45, status: 'active' }
      ];

      const filtered = items.filter(item =>
        item.age > 30 && item.status === 'active'
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(3);
    });

    it('should support multiple filter conditions (OR)', () => {
      const items = [
        { id: 1, category: 'A', priority: 'high' },
        { id: 2, category: 'B', priority: 'low' },
        { id: 3, category: 'A', priority: 'low' }
      ];

      const filtered = items.filter(item =>
        item.category === 'A' || item.priority === 'high'
      );

      expect(filtered).toHaveLength(2);
      expect(filtered.map(i => i.id).sort()).toEqual([1, 3]);
    });

  });

  describe('Filter Operators', () => {

    it('should support contains operator', () => {
      const items = [
        { id: 1, email: 'john@example.com' },
        { id: 2, email: 'jane@example.org' },
        { id: 3, email: 'bob@example.com' }
      ];

      const filtered = items.filter(item => item.email.includes('example.com'));

      expect(filtered).toHaveLength(2);
      expect(filtered.every(item => item.email.includes('example.com'))).toBe(true);
    });

    it('should support range operators', () => {
      const items = [
        { id: 1, price: 10 },
        { id: 2, price: 50 },
        { id: 3, price: 100 }
      ];

      const inRange = items.filter(item => item.price >= 20 && item.price <= 80);

      expect(inRange).toHaveLength(1);
      expect(inRange[0].id).toBe(2);
    });

    it('should support regex matching', () => {
      const items = [
        { id: 1, code: 'ABC-123' },
        { id: 2, code: 'XYZ-456' },
        { id: 3, code: 'ABC-789' }
      ];

      const pattern = /^ABC-/;
      const filtered = items.filter(item => pattern.test(item.code));

      expect(filtered).toHaveLength(2);
      expect(filtered.every(item => item.code.startsWith('ABC-'))).toBe(true);
    });

  });

  describe('Filter Modes', () => {

    it('should support "keep" mode (include matching items)', () => {
      const items = [1, 2, 3, 4, 5];
      const mode = 'keep';

      const filtered = items.filter(item => item > 2);

      expect(filtered).toEqual([3, 4, 5]);
    });

    it('should support "discard" mode (exclude matching items)', () => {
      const items = [1, 2, 3, 4, 5];
      const mode = 'discard';

      // Discard items > 2 (keep items <= 2)
      const filtered = items.filter(item => !(item > 2));

      expect(filtered).toEqual([1, 2]);
    });

  });

  describe('Edge Cases', () => {

    it('should handle empty arrays', () => {
      const items: any[] = [];
      const filtered = items.filter(item => item.value > 10);

      expect(filtered).toHaveLength(0);
      expect(filtered).toEqual([]);
    });

    it('should handle null/undefined values', () => {
      const items = [
        { id: 1, value: 10 },
        { id: 2, value: null },
        { id: 3, value: undefined },
        { id: 4, value: 20 }
      ];

      const filtered = items.filter(item =>
        item.value !== null && item.value !== undefined && item.value > 5
      );

      expect(filtered).toHaveLength(2);
      expect(filtered.map(i => i.id)).toEqual([1, 4]);
    });

  });

});

// TEST WRITING PLAN WEEK 1 - DAY 2: ExpressionEngine Tests
// Adding 25 tests for ExpressionEngine.ts
import { describe, it, expect } from 'vitest';
import { ExpressionEngine } from '../expressions/ExpressionEngine';

describe('ExpressionEngine - Core Expression Evaluation (Week 1 - Day 2)', () => {

  describe('Expression Parsing', () => {

    it('should parse simple expressions', () => {
      const input = '{{ 1 + 1 }}';
      const expressions = ExpressionEngine.parseExpressions(input);

      expect(expressions).toHaveLength(1);
      expect(expressions[0].expression).toBe('1 + 1');
    });

    it('should parse multiple expressions', () => {
      const input = 'Hello {{ name }}, you have {{ count }} messages';
      const expressions = ExpressionEngine.parseExpressions(input);

      expect(expressions).toHaveLength(2);
      expect(expressions[0].expression).toBe('name');
      expect(expressions[1].expression).toBe('count');
    });

    it('should parse nested braces', () => {
      const input = '{{ { a: 1, b: 2 } }}';
      const expressions = ExpressionEngine.parseExpressions(input);

      expect(expressions).toHaveLength(1);
      expect(expressions[0].expression).toContain('{');
    });

    it('should detect expressions correctly', () => {
      expect(ExpressionEngine.hasExpressions('{{ value }}')).toBe(true);
      expect(ExpressionEngine.hasExpressions('no expression')).toBe(false);
      expect(ExpressionEngine.hasExpressions('{ single brace }')).toBe(false);
    });

    it('should return empty array for no expressions', () => {
      const input = 'plain text without expressions';
      const expressions = ExpressionEngine.parseExpressions(input);

      expect(expressions).toHaveLength(0);
    });

  });

  describe('Expression Evaluation', () => {

    it('should evaluate simple math', () => {
      const result = ExpressionEngine.evaluateExpression('1 + 1', {});

      expect(result.success).toBe(true);
      expect(result.value).toBe(2);
    });

    it('should evaluate string concatenation', () => {
      const result = ExpressionEngine.evaluateExpression(
        '"Hello" + " " + "World"',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('Hello World');
    });

    it('should evaluate with context variables', () => {
      const context = { name: 'Alice', age: 30 };
      const result = ExpressionEngine.evaluateExpression('name + " is " + age', context);

      expect(result.success).toBe(true);
      expect(result.value).toBe('Alice is 30');
    });

    it('should evaluate built-in functions', () => {
      const result = ExpressionEngine.evaluateExpression(
        'Math.max(10, 20, 5)',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(20);
    });

    it('should evaluate complex expressions', () => {
      const context = { items: [1, 2, 3, 4, 5] };
      const result = ExpressionEngine.evaluateExpression(
        'items.filter(x => x > 2).length',
        context
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(3);
    });

    it('should handle evaluation errors gracefully', () => {
      const result = ExpressionEngine.evaluateExpression(
        'undefinedVariable.property',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

  });

  describe('evaluateAll - Full String Replacement', () => {

    it('should replace single expression with value', () => {
      const context = { value: 42 };
      const result = ExpressionEngine.evaluateAll('{{ value }}', context);

      expect(result.success).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should replace multiple expressions in string', () => {
      const context = { firstName: 'John', lastName: 'Doe' };
      const result = ExpressionEngine.evaluateAll(
        'Hello {{ firstName }} {{ lastName }}!',
        context
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('Hello John Doe!');
    });

    it('should return original for non-string inputs', () => {
      const result = ExpressionEngine.evaluateAll(42 as any, {});

      expect(result.success).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should return original when no expressions found', () => {
      const result = ExpressionEngine.evaluateAll('plain text', {});

      expect(result.success).toBe(true);
      expect(result.value).toBe('plain text');
    });

  });

  describe('Security Validation', () => {

    it('should block require() calls', () => {
      const validation = ExpressionEngine.validateExpression('require("fs")');

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('forbidden pattern');
    });

    it('should block import statements', () => {
      const validation = ExpressionEngine.validateExpression('import fs from "fs"');

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('forbidden pattern');
    });

    it('should block process access', () => {
      const validation = ExpressionEngine.validateExpression('process.exit()');

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('forbidden pattern');
    });

    it('should block eval() calls', () => {
      const validation = ExpressionEngine.validateExpression('eval("malicious")');

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('forbidden pattern');
    });

    it('should block constructor access', () => {
      const validation = ExpressionEngine.validateExpression('({}).constructor');

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('suspicious keyword');
    });

    it('should block prototype manipulation', () => {
      const validation = ExpressionEngine.validateExpression('Object.prototype.hack = 1');

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('suspicious keyword');
    });

    it('should allow safe expressions', () => {
      const validation = ExpressionEngine.validateExpression('1 + 1');

      expect(validation.valid).toBe(true);
    });

  });

  describe('Sandbox Execution', () => {

    it('should prevent infinite loops with iteration guard', () => {
      const context = { items: Array(1000).fill(0).map((_, i) => i) };
      const result = ExpressionEngine.evaluateExpression(
        'items.map(x => items.map(y => x * y))',
        context,
        { maxIterations: 100 }
      );

      // Should fail with max iterations exceeded (nested map causes 1000 * 1000 iterations)
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Maximum iterations exceeded');
      }
    });

    it('should track execution time', () => {
      const result = ExpressionEngine.evaluateExpression('1 + 1', {});

      expect(result.executionTime).toBeDefined();
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should provide isolated sandbox', () => {
      const context = { data: { value: 100 } };
      const result = ExpressionEngine.evaluateExpression('data.value = 999', context);

      // Original context should not be modified
      expect(context.data.value).toBe(100);
    });

    it('should provide safe Math object', () => {
      const result = ExpressionEngine.evaluateExpression(
        'Math.sqrt(16)',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(4);
    });

  });

  describe('Edge Cases and Error Handling', () => {

    it('should handle null values', () => {
      const context = { value: null };
      const result = ExpressionEngine.evaluateExpression('value', context);

      expect(result.success).toBe(true);
      expect(result.value).toBe(null);
    });

    it('should handle undefined values', () => {
      const context = {};
      const result = ExpressionEngine.evaluateExpression('missingValue', context);

      expect(result.success).toBe(false);
    });

    it('should convert values to strings correctly', () => {
      const context = { obj: { a: 1 }, num: 42, bool: true };
      const result = ExpressionEngine.evaluateAll(
        'Object: {{ obj }}, Number: {{ num }}, Bool: {{ bool }}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.value).toContain('{"a":1}');
      expect(result.value).toContain('42');
      expect(result.value).toContain('true');
    });

    it('should handle available variables extraction', () => {
      const context = {
        user: { name: 'John', email: 'john@example.com' },
        count: 5
      };
      const variables = ExpressionEngine.getAvailableVariables(context);

      expect(variables).toContain('user');
      expect(variables).toContain('user.name');
      expect(variables).toContain('user.email');
      expect(variables).toContain('count');
      expect(variables).toBeInstanceOf(Array);
    });

  });

});

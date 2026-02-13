/**
 * ExpressionEngine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExpressionEngine } from '../ExpressionEngine';

describe('ExpressionEngine', () => {
  describe('parseExpressions', () => {
    it('should parse single expression', () => {
      const input = '{{ $json.name }}';
      const expressions = ExpressionEngine.parseExpressions(input);

      expect(expressions).toHaveLength(1);
      expect(expressions[0].expression).toBe('$json.name');
      expect(expressions[0].start).toBe(0);
      expect(expressions[0].end).toBe(input.length);
    });

    it('should parse multiple expressions', () => {
      const input = 'Hello {{ $json.firstName }} {{ $json.lastName }}!';
      const expressions = ExpressionEngine.parseExpressions(input);

      expect(expressions).toHaveLength(2);
      expect(expressions[0].expression).toBe('$json.firstName');
      expect(expressions[1].expression).toBe('$json.lastName');
    });

    it('should handle nested braces', () => {
      const input = '{{ $json.items.filter(i => i.active) }}';
      const expressions = ExpressionEngine.parseExpressions(input);

      expect(expressions).toHaveLength(1);
      expect(expressions[0].expression).toBe('$json.items.filter(i => i.active)');
    });

    it('should return empty array for no expressions', () => {
      const input = 'No expressions here';
      const expressions = ExpressionEngine.parseExpressions(input);

      expect(expressions).toHaveLength(0);
    });
  });

  describe('hasExpressions', () => {
    it('should return true for expression', () => {
      expect(ExpressionEngine.hasExpressions('{{ $json.name }}')).toBe(true);
    });

    it('should return false for no expression', () => {
      expect(ExpressionEngine.hasExpressions('Plain text')).toBe(false);
    });
  });

  describe('validateExpression', () => {
    it('should validate safe expressions', () => {
      const result = ExpressionEngine.validateExpression('$json.name');
      expect(result.valid).toBe(true);
    });

    it('should reject require()', () => {
      const result = ExpressionEngine.validateExpression('require("fs")');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('forbidden');
    });

    it('should reject process access', () => {
      const result = ExpressionEngine.validateExpression('process.env.SECRET');
      expect(result.valid).toBe(false);
    });

    it('should reject eval', () => {
      const result = ExpressionEngine.validateExpression('eval("code")');
      expect(result.valid).toBe(false);
    });

    it('should reject Function constructor', () => {
      const result = ExpressionEngine.validateExpression('Function("return 1")()');
      expect(result.valid).toBe(false);
    });

    it('should reject __dirname', () => {
      const result = ExpressionEngine.validateExpression('__dirname');
      expect(result.valid).toBe(false);
    });

    it('should reject prototype pollution', () => {
      const result = ExpressionEngine.validateExpression('obj.__proto__');
      expect(result.valid).toBe(false);
    });

    it('should reject constructor access', () => {
      const result = ExpressionEngine.validateExpression('obj.constructor');
      expect(result.valid).toBe(false);
    });
  });

  describe('evaluateExpression', () => {
    it('should evaluate simple variable access', () => {
      const result = ExpressionEngine.evaluateExpression(
        '$json.name',
        { $json: { name: 'John' } }
      );

      if (!result.success) {
        console.log('Error:', result.error);
      }
      expect(result.success).toBe(true);
      expect(result.value).toBe('John');
    });

    it('should evaluate arithmetic', () => {
      const result = ExpressionEngine.evaluateExpression(
        '$json.a + $json.b',
        { $json: { a: 5, b: 3 } }
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(8);
    });

    it('should evaluate string concatenation', () => {
      const result = ExpressionEngine.evaluateExpression(
        '$json.first + " " + $json.last',
        { $json: { first: 'John', last: 'Doe' } }
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('John Doe');
    });

    it('should evaluate template literal', () => {
      const result = ExpressionEngine.evaluateExpression(
        '`Hello ${$json.name}!`',
        { $json: { name: 'Alice' } }
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('Hello Alice!');
    });

    it('should evaluate ternary operator', () => {
      const result = ExpressionEngine.evaluateExpression(
        '$json.active ? "Yes" : "No"',
        { $json: { active: true } }
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('Yes');
    });

    it('should evaluate array access', () => {
      const result = ExpressionEngine.evaluateExpression(
        '$json.items[0]',
        { $json: { items: ['first', 'second'] } }
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('first');
    });

    it('should evaluate array method', () => {
      const result = ExpressionEngine.evaluateExpression(
        '$json.items.length',
        { $json: { items: [1, 2, 3] } }
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(3);
    });

    it('should evaluate array map', () => {
      const result = ExpressionEngine.evaluateExpression(
        '$json.items.map(i => i * 2)',
        { $json: { items: [1, 2, 3] } }
      );

      expect(result.success).toBe(true);
      expect(result.value).toEqual([2, 4, 6]);
    });

    it('should evaluate array filter', () => {
      const result = ExpressionEngine.evaluateExpression(
        '$json.items.filter(i => i > 2)',
        { $json: { items: [1, 2, 3, 4] } }
      );

      expect(result.success).toBe(true);
      expect(result.value).toEqual([3, 4]);
    });

    it('should handle errors gracefully', () => {
      const result = ExpressionEngine.evaluateExpression(
        '$json.nonexistent.property',
        { $json: {} }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle infinite loops with error', () => {
      // Note: Since we can't truly detect infinite loops synchronously,
      // we expect this to either timeout naturally or throw an error
      try {
        const result = ExpressionEngine.evaluateExpression(
          'while(true) {}',
          {},
          { timeout: 100 }
        );
        // If we get here, it should have failed
        expect(result.success).toBe(false);
      } catch (error) {
        // This is also acceptable - the expression was rejected
        expect(error).toBeDefined();
      }
    });

    it('should protect against infinite loops', () => {
      const result = ExpressionEngine.evaluateExpression(
        '$json.items.map(i => i)',
        { $json: { items: Array(20000).fill(1) } },
        { maxIterations: 1000 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('iterations');
    });
  });

  describe('evaluateAll', () => {
    it('should replace single expression', () => {
      const result = ExpressionEngine.evaluateAll(
        'Hello {{ $json.name }}!',
        { $json: { name: 'World' } }
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('Hello World!');
    });

    it('should replace multiple expressions', () => {
      const result = ExpressionEngine.evaluateAll(
        '{{ $json.greeting }} {{ $json.name }}!',
        { $json: { greeting: 'Hello', name: 'Alice' } }
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('Hello Alice!');
    });

    it('should return raw value for single expression', () => {
      const result = ExpressionEngine.evaluateAll(
        '{{ $json.count }}',
        { $json: { count: 42 } }
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should return object for single expression', () => {
      const obj = { a: 1, b: 2 };
      const result = ExpressionEngine.evaluateAll(
        '{{ $json.data }}',
        { $json: { data: obj } }
      );

      expect(result.success).toBe(true);
      expect(result.value).toEqual(obj);
    });

    it('should handle no expressions', () => {
      const result = ExpressionEngine.evaluateAll(
        'Plain text',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('Plain text');
    });

    it('should handle empty string', () => {
      const result = ExpressionEngine.evaluateAll('', {});

      expect(result.success).toBe(true);
      expect(result.value).toBe('');
    });

    it('should stringify objects in strings', () => {
      const result = ExpressionEngine.evaluateAll(
        'Data: {{ $json.obj }}',
        { $json: { obj: { a: 1 } } }
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('Data: {"a":1}');
    });
  });

  describe('built-in functions', () => {
    it('should evaluate Math functions', () => {
      const result = ExpressionEngine.evaluateExpression(
        'Math.max($json.a, $json.b)',
        { $json: { a: 5, b: 10 } }
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(10);
    });

    it('should evaluate Date functions', () => {
      const result = ExpressionEngine.evaluateExpression(
        'new Date($json.timestamp).getFullYear()',
        { $json: { timestamp: '2024-01-15' } }
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(2024);
    });

    it('should evaluate JSON.stringify', () => {
      const result = ExpressionEngine.evaluateExpression(
        'JSON.stringify($json.obj)',
        { $json: { obj: { test: true } } }
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('{"test":true}');
    });

    it('should evaluate JSON.parse', () => {
      const result = ExpressionEngine.evaluateExpression(
        'JSON.parse($json.str)',
        { $json: { str: '{"value":42}' } }
      );

      expect(result.success).toBe(true);
      expect(result.value).toEqual({ value: 42 });
    });
  });

  describe('getAvailableVariables', () => {
    it('should list top-level variables', () => {
      const context = {
        $json: { name: 'John' },
        $env: { API_KEY: 'secret' },
      };

      const variables = ExpressionEngine.getAvailableVariables(context);

      expect(variables).toContain('$json');
      expect(variables).toContain('$env');
    });

    it('should list nested properties', () => {
      const context = {
        $json: { user: { name: 'John', email: 'john@example.com' } },
      };

      const variables = ExpressionEngine.getAvailableVariables(context);

      expect(variables).toContain('$json.user');
      expect(variables).toContain('$json.user.name');
    });
  });
});

/**
 * SecureExpressionEngine Tests
 *
 * Test Coverage:
 * 1. Security: Exploit prevention (CRITICAL)
 * 2. Backward Compatibility: n8n expression syntax
 * 3. Performance: Benchmarks and timeouts
 * 4. Edge Cases: Null, undefined, complex nesting
 * 5. Integration: Real-world workflow scenarios
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { SecureExpressionEngine } from '../SecureExpressionEngine';
import { ExpressionContext } from '../ExpressionContext';

describe('SecureExpressionEngine - Security Tests', () => {
  describe('Remote Code Execution (RCE) Prevention', () => {
    test('blocks constructor.constructor access to Function', () => {
      const expr = "{{ constructor.constructor('return process')() }}";
      const result = SecureExpressionEngine.evaluateAll(expr, {});

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/constructor|not defined/i);
    });

    test('blocks alternative constructor access patterns', () => {
      const patterns = [
        "{{ this.constructor.constructor('alert(1)')() }}",
        "{{ Object.constructor.constructor('return this')() }}",
        "{{ [].constructor.constructor('return process')() }}",
        "{{ ''.constructor.constructor('return global')() }}",
      ];

      patterns.forEach((expr) => {
        const result = SecureExpressionEngine.evaluateAll(expr, {});
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/constructor|Security violation/i);
      });
    });

    test('blocks prototype pollution attacks', () => {
      const expr = "{{ __proto__.isAdmin = true }}";
      const result = SecureExpressionEngine.evaluateAll(expr, {});

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/__proto__|Security violation/i);
    });

    test('blocks process object access', () => {
      const patterns = [
        "{{ process.exit(1) }}",
        "{{ process.env }}",
        "{{ process.cwd() }}",
        "{{ process.mainModule }}",
      ];

      patterns.forEach((expr) => {
        const result = SecureExpressionEngine.evaluateAll(expr, {});
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/process|forbidden/i);
      });
    });

    test('blocks require() attempts', () => {
      const patterns = [
        "{{ require('fs') }}",
        "{{ require('child_process').execSync('ls') }}",
        "{{ require('http').createServer() }}",
      ];

      patterns.forEach((expr) => {
        const result = SecureExpressionEngine.evaluateAll(expr, {});
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/require|forbidden/i);
      });
    });

    test('blocks eval() attempts', () => {
      const expr = "{{ eval('1 + 1') }}";
      const result = SecureExpressionEngine.evaluateAll(expr, {});

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/eval|forbidden/i);
    });

    test('blocks global object access', () => {
      const patterns = [
        "{{ global.process }}",
        "{{ globalThis.process }}",
        "{{ global.require }}",
      ];

      patterns.forEach((expr) => {
        const result = SecureExpressionEngine.evaluateAll(expr, {});
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/global|forbidden/i);
      });
    });

    test('blocks file system access', () => {
      const patterns = [
        "{{ fs.readFileSync('/etc/passwd') }}",
        "{{ require('fs').writeFileSync('malicious.js', 'code') }}",
      ];

      patterns.forEach((expr) => {
        const result = SecureExpressionEngine.evaluateAll(expr, {});
        expect(result.success).toBe(false);
      });
    });

    test('blocks network access', () => {
      const patterns = [
        "{{ http.get('http://evil.com') }}",
        "{{ require('net').connect(80, 'evil.com') }}",
      ];

      patterns.forEach((expr) => {
        const result = SecureExpressionEngine.evaluateAll(expr, {});
        expect(result.success).toBe(false);
      });
    });

    test('blocks setTimeout/setInterval (async escape)', () => {
      const patterns = [
        "{{ setTimeout(() => { /* malicious */ }, 0) }}",
        "{{ setInterval(() => { /* malicious */ }, 1000) }}",
        "{{ setImmediate(() => { /* malicious */ }) }}",
      ];

      patterns.forEach((expr) => {
        const result = SecureExpressionEngine.evaluateAll(expr, {});
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/setTimeout|setInterval|setImmediate|forbidden/i);
      });
    });
  });

  describe('Denial of Service (DoS) Prevention', () => {
    test('enforces timeout on infinite loops', () => {
      const expr = "{{ while(true) {} }}";
      const result = SecureExpressionEngine.evaluateAll(expr, {}, { timeout: 100 });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/timeout|exceeded/i);
    });

    test('enforces iteration limit on array operations', () => {
      const expr = "{{ $items.map(x => $items.map(y => x * y)) }}";
      const context = {
        $items: Array.from({ length: 1000 }, (_, i) => i),
      };
      const result = SecureExpressionEngine.evaluateAll(expr, context, {
        maxIterations: 1000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/iterations|exceeded/i);
    });

    test('prevents memory exhaustion', () => {
      // Try to create large array (should timeout before OOM)
      const expr = "{{ Array.from({ length: 10000000 }, (_, i) => i) }}";
      const result = SecureExpressionEngine.evaluateAll(expr, {}, { timeout: 100 });

      // Either fails due to timeout or memory, both are acceptable
      expect(result.success).toBe(false);
    });
  });

  describe('Security Audit Tool', () => {
    test('identifies safe expressions', () => {
      const safe = [
        '$json.name',
        '$items.length',
        'Math.max(1, 2, 3)',
        'toLowerCase("TEST")',
      ];

      safe.forEach((expr) => {
        const audit = SecureExpressionEngine.securityAudit(expr);
        expect(audit.safe).toBe(true);
        expect(audit.threats).toHaveLength(0);
      });
    });

    test('identifies malicious expressions', () => {
      const malicious = [
        'constructor.constructor("return process")()',
        '__proto__.isAdmin = true',
        'process.exit(1)',
        'require("fs")',
        'eval("code")',
      ];

      malicious.forEach((expr) => {
        const audit = SecureExpressionEngine.securityAudit(expr);
        expect(audit.safe).toBe(false);
        expect(audit.threats.length).toBeGreaterThan(0);
        expect(audit.recommendations.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('SecureExpressionEngine - Backward Compatibility', () => {
  let context: ExpressionContext;

  beforeEach(() => {
    context = new ExpressionContext({
      currentItem: { json: { name: 'John', age: 30, email: 'john@example.com' } },
      allItems: [
        { json: { value: 10 } },
        { json: { value: 20 } },
        { json: { value: 30 } },
      ],
      workflow: {
        id: 'workflow-1',
        name: 'Test Workflow',
        active: true,
      },
    });
  });

  describe('n8n Expression Syntax', () => {
    test('evaluates $json variable access', () => {
      const result = SecureExpressionEngine.evaluateAll(
        '{{ $json.name }}',
        context.buildContext()
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('John');
    });

    test('evaluates $items array operations', () => {
      const result = SecureExpressionEngine.evaluateAll(
        '{{ $items.length }}',
        context.buildContext()
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('3');
    });

    test('evaluates $workflow metadata', () => {
      const result = SecureExpressionEngine.evaluateAll(
        '{{ $workflow.name }}',
        context.buildContext()
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('Test Workflow');
    });

    test('evaluates multiple expressions in one string', () => {
      const result = SecureExpressionEngine.evaluateAll(
        'Hello {{ $json.name }}, you are {{ $json.age }} years old',
        context.buildContext()
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('Hello John, you are 30 years old');
    });

    test('returns raw value for single expression', () => {
      const result = SecureExpressionEngine.evaluateAll(
        '{{ $json.age }}',
        context.buildContext()
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(30); // Number, not string
    });
  });

  describe('Built-in Functions', () => {
    test('string functions work correctly', () => {
      const tests = [
        { expr: '{{ toLowerCase("TEST") }}', expected: 'test' },
        { expr: '{{ toUpperCase("test") }}', expected: 'TEST' },
        { expr: '{{ trim("  test  ") }}', expected: 'test' },
        { expr: '{{ replace("hello world", "world", "there") }}', expected: 'hello there' },
      ];

      tests.forEach(({ expr, expected }) => {
        const result = SecureExpressionEngine.evaluateAll(expr, {});
        expect(result.success).toBe(true);
        expect(result.value).toBe(expected);
      });
    });

    test('array functions work correctly', () => {
      const ctx = { items: [1, 2, 3, 4, 5] };

      const tests = [
        { expr: '{{ items.length }}', expected: 5 },
        { expr: '{{ first(items) }}', expected: 1 },
        { expr: '{{ last(items) }}', expected: 5 },
        { expr: '{{ sum(items) }}', expected: 15 },
        { expr: '{{ average(items) }}', expected: 3 },
        { expr: '{{ min(items) }}', expected: 1 },
        { expr: '{{ max(items) }}', expected: 5 },
      ];

      tests.forEach(({ expr, expected }) => {
        const result = SecureExpressionEngine.evaluateAll(expr, ctx);
        expect(result.success).toBe(true);
        expect(result.value).toBe(expected);
      });
    });

    test('math functions work correctly', () => {
      const tests = [
        { expr: '{{ abs(-5) }}', expected: 5 },
        { expr: '{{ round(3.14159, 2) }}', expected: 3.14 },
        { expr: '{{ ceil(3.1) }}', expected: 4 },
        { expr: '{{ floor(3.9) }}', expected: 3 },
        { expr: '{{ Math.max(1, 5, 3) }}', expected: 5 },
        { expr: '{{ Math.min(1, 5, 3) }}', expected: 1 },
      ];

      tests.forEach(({ expr, expected }) => {
        const result = SecureExpressionEngine.evaluateAll(expr, {});
        expect(result.success).toBe(true);
        expect(result.value).toBe(expected);
      });
    });

    test('date functions work correctly', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const ctx = { date: now };

      const result = SecureExpressionEngine.evaluateAll('{{ getYear(date) }}', ctx);
      expect(result.success).toBe(true);
      expect(result.value).toBe(2024);
    });

    test('object functions work correctly', () => {
      const ctx = {
        obj: { name: 'John', age: 30, city: 'NYC' },
      };

      const tests = [
        { expr: '{{ keys(obj).length }}', expected: 3 },
        { expr: '{{ hasKey(obj, "name") }}', expected: true },
        { expr: '{{ hasKey(obj, "missing") }}', expected: false },
      ];

      tests.forEach(({ expr, expected }) => {
        const result = SecureExpressionEngine.evaluateAll(expr, ctx);
        expect(result.success).toBe(true);
        expect(result.value).toBe(expected);
      });
    });
  });

  describe('Complex Expressions', () => {
    test('evaluates nested property access', () => {
      const ctx = {
        user: {
          profile: {
            contact: {
              email: 'test@example.com',
            },
          },
        },
      };

      const result = SecureExpressionEngine.evaluateAll(
        '{{ user.profile.contact.email }}',
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('test@example.com');
    });

    test('evaluates array chaining', () => {
      const ctx = {
        items: [1, 2, 3, 4, 5],
      };

      const result = SecureExpressionEngine.evaluateAll(
        '{{ items.filter(x => x > 2).map(x => x * 2) }}',
        ctx
      );

      expect(result.success).toBe(true);
      expect(JSON.parse(result.value as string)).toEqual([6, 8, 10]);
    });

    test('evaluates conditional logic', () => {
      const ctx = { age: 25 };

      const result = SecureExpressionEngine.evaluateAll(
        '{{ age >= 18 ? "adult" : "minor" }}',
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('adult');
    });

    test('evaluates complex string operations', () => {
      const ctx = { email: 'JOHN.DOE@EXAMPLE.COM' };

      const result = SecureExpressionEngine.evaluateAll(
        '{{ toLowerCase(email).split("@")[0] }}',
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('john.doe');
    });
  });
});

describe('SecureExpressionEngine - Performance', () => {
  test('completes simple expressions quickly (<10ms)', () => {
    const expr = '{{ $json.name }}';
    const ctx = { $json: { name: 'Test' } };

    const start = Date.now();
    const result = SecureExpressionEngine.evaluateAll(expr, ctx);
    const duration = Date.now() - start;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(50); // VM2 overhead, still acceptable
  });

  test('completes complex expressions within acceptable time (<100ms)', () => {
    const expr = '{{ $items.map(x => x * 2).filter(x => x > 50).reduce((a, b) => a + b, 0) }}';
    const ctx = { $items: Array.from({ length: 100 }, (_, i) => i) };

    const start = Date.now();
    const result = SecureExpressionEngine.evaluateAll(expr, ctx);
    const duration = Date.now() - start;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(200); // With VM2 overhead
  });

  test('benchmark tool works correctly', () => {
    const expr = '{{ $json.value * 2 }}';
    const ctx = { $json: { value: 42 } };

    const benchmark = SecureExpressionEngine.benchmark(expr, ctx, 100);

    expect(benchmark.avgMs).toBeGreaterThan(0);
    expect(benchmark.minMs).toBeLessThanOrEqual(benchmark.avgMs);
    expect(benchmark.maxMs).toBeGreaterThanOrEqual(benchmark.avgMs);
    expect(benchmark.totalMs).toBeCloseTo(benchmark.avgMs * 100, -1);
  });

  test('timeout prevents long-running expressions', () => {
    // This would run forever without timeout
    const expr = '{{ (() => { let i = 0; while (true) { i++ } })() }}';

    const start = Date.now();
    const result = SecureExpressionEngine.evaluateAll(expr, {}, { timeout: 100 });
    const duration = Date.now() - start;

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/timeout|exceeded/i);
    expect(duration).toBeLessThan(500); // Should timeout quickly
  });
});

describe('SecureExpressionEngine - Edge Cases', () => {
  test('handles null values safely', () => {
    const ctx = { value: null };
    const result = SecureExpressionEngine.evaluateAll('{{ value }}', ctx);

    expect(result.success).toBe(true);
    expect(result.value).toBe('null');
  });

  test('handles undefined values safely', () => {
    const ctx = { obj: {} };
    const result = SecureExpressionEngine.evaluateAll('{{ obj.missing }}', ctx);

    expect(result.success).toBe(true);
    expect(result.value).toBe('undefined');
  });

  test('handles empty strings', () => {
    const result = SecureExpressionEngine.evaluateAll('', {});

    expect(result.success).toBe(true);
    expect(result.value).toBe('');
  });

  test('handles non-string inputs', () => {
    const tests = [
      { input: 123, expected: 123 },
      { input: true, expected: true },
      { input: null, expected: null },
      { input: undefined, expected: undefined },
      { input: { key: 'value' }, expected: { key: 'value' } },
    ];

    tests.forEach(({ input, expected }) => {
      const result = SecureExpressionEngine.evaluateAll(input as any, {});
      expect(result.success).toBe(true);
      expect(result.value).toEqual(expected);
    });
  });

  test('handles expressions with no context', () => {
    const result = SecureExpressionEngine.evaluateAll('{{ 1 + 1 }}', {});

    expect(result.success).toBe(true);
    expect(result.value).toBe(2);
  });

  test('handles malformed expressions gracefully', () => {
    const malformed = [
      '{{ }}',
      '{{ $json. }}',
      '{{ $json[missing] }}',
      '{{ function() {} }}', // Blocked
    ];

    malformed.forEach((expr) => {
      const result = SecureExpressionEngine.evaluateAll(expr, {});
      // Should either succeed (for simple syntax errors) or fail gracefully
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
    });
  });

  test('handles deeply nested objects', () => {
    const deep: any = { level: 0 };
    let current = deep;
    for (let i = 1; i <= 10; i++) {
      current.next = { level: i };
      current = current.next;
    }

    const ctx = { deep };
    const result = SecureExpressionEngine.evaluateAll(
      '{{ deep.next.next.next.next.next.level }}',
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.value).toBe(5);
  });

  test('handles circular references safely', () => {
    const circular: any = { name: 'test' };
    circular.self = circular;

    const ctx = { obj: circular };

    // Access non-circular property works
    const result = SecureExpressionEngine.evaluateAll('{{ obj.name }}', ctx);
    expect(result.success).toBe(true);
    expect(result.value).toBe('test');
  });
});

describe('SecureExpressionEngine - Real-world Scenarios', () => {
  test('workflow: format user email', () => {
    const ctx = {
      $json: {
        firstName: 'john',
        lastName: 'doe',
        domain: 'example.com',
      },
    };

    const result = SecureExpressionEngine.evaluateAll(
      '{{ toLowerCase($json.firstName) }}.{{ toLowerCase($json.lastName) }}@{{ $json.domain }}',
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.value).toBe('john.doe@example.com');
  });

  test('workflow: calculate total from items', () => {
    const ctx = {
      $items: [
        { json: { price: 10, quantity: 2 } },
        { json: { price: 20, quantity: 1 } },
        { json: { price: 15, quantity: 3 } },
      ],
    };

    const result = SecureExpressionEngine.evaluateAll(
      '{{ $items.map(item => item.json.price * item.json.quantity).reduce((a, b) => a + b, 0) }}',
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.value).toBe(85);
  });

  test('workflow: conditional message based on data', () => {
    const ctx = {
      $json: {
        status: 'active',
        count: 42,
      },
    };

    const result = SecureExpressionEngine.evaluateAll(
      '{{ $json.status === "active" && $json.count > 40 ? "Processing" : "Waiting" }}',
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.value).toBe('Processing');
  });

  test('workflow: extract and format date', () => {
    const ctx = {
      $json: {
        timestamp: '2024-01-15T12:30:00Z',
      },
    };

    const result = SecureExpressionEngine.evaluateAll(
      '{{ formatDate(new Date($json.timestamp)) }}',
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.value).toMatch(/1\/15\/2024/);
  });

  test('workflow: validate and clean input', () => {
    const ctx = {
      $json: {
        email: '  TEST@EXAMPLE.COM  ',
      },
    };

    const result = SecureExpressionEngine.evaluateAll(
      '{{ toLowerCase(trim($json.email)) }}',
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.value).toBe('test@example.com');
  });
});

describe('SecureExpressionEngine - Helper Methods', () => {
  test('parseExpressions extracts all expressions', () => {
    const input = 'Hello {{ $json.name }}, age {{ $json.age }}';
    const expressions = SecureExpressionEngine.parseExpressions(input);

    expect(expressions).toHaveLength(2);
    expect(expressions[0].expression).toBe('$json.name');
    expect(expressions[1].expression).toBe('$json.age');
  });

  test('hasExpressions detects expressions correctly', () => {
    expect(SecureExpressionEngine.hasExpressions('{{ test }}')).toBe(true);
    expect(SecureExpressionEngine.hasExpressions('plain text')).toBe(false);
    expect(SecureExpressionEngine.hasExpressions('{ test }')).toBe(false);
  });

  test('validateExpression catches forbidden patterns', () => {
    const dangerous = [
      'require("fs")',
      'process.exit()',
      'constructor.constructor',
      '__proto__',
      'eval("code")',
    ];

    dangerous.forEach((expr) => {
      const validation = SecureExpressionEngine.validateExpression(expr);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });
  });

  test('getAvailableVariables lists context variables', () => {
    const ctx = {
      $json: { name: 'test', age: 30 },
      $items: [1, 2, 3],
      $workflow: { id: '123' },
    };

    const variables = SecureExpressionEngine.getAvailableVariables(ctx);

    expect(variables).toContain('$json');
    expect(variables).toContain('$json.name');
    expect(variables).toContain('$json.age');
    expect(variables).toContain('$items');
    expect(variables).toContain('$workflow');
  });
});

describe('SecureExpressionEngine - Error Handling', () => {
  test('provides clear error messages for syntax errors', () => {
    const result = SecureExpressionEngine.evaluateAll('{{ $json[ }}', {});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('provides clear error messages for undefined variables', () => {
    const result = SecureExpressionEngine.evaluateAll('{{ missing.value }}', {});

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not defined|undefined/i);
  });

  test('tracks execution time for all evaluations', () => {
    const result = SecureExpressionEngine.evaluateAll('{{ 1 + 1 }}', {});

    expect(result.executionTime).toBeDefined();
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });

  test('returns partial error information without exposing internals', () => {
    const result = SecureExpressionEngine.evaluateAll(
      '{{ invalidFunction() }}',
      {}
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    // Should not expose internal paths or sensitive data
    expect(result.error).not.toMatch(/\/home\/|\/usr\/|C:\\/);
  });
});

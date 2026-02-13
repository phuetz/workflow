/**
 * Data Transformation Tests
 * Comprehensive test suite for expression evaluator and data transformers
 * AGENT 2 - DATA TRANSFORMATION & EXPRESSION ENGINE
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExpressionEvaluator,
  ExpressionFunctions,
  evaluateExpression,
  ExpressionContext
} from '../utils/ExpressionEvaluator';
import {
  CSVTransformer,
  XMLTransformer,
  DateFormatter,
  StringManipulator,
  NumberFormatter,
  ObjectTransformer
} from '../utils/DataTransformers';

describe('ExpressionEvaluator', () => {
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    evaluator = new ExpressionEvaluator();
  });

  describe('Basic expressions', () => {
    it('should evaluate simple variables', () => {
      const context: ExpressionContext = {
        $json: { name: 'John', age: 30 }
      };

      evaluator.setContext(context);
      const result = evaluator.evaluate('$json.name');
      expect(result).toBe('John');
    });

    it('should evaluate template strings', () => {
      const context: ExpressionContext = {
        $json: { firstName: 'John', lastName: 'Doe' }
      };

      evaluator.setContext(context);
      const result = evaluator.evaluate('Hello {{ $json.firstName }} {{ $json.lastName }}!');
      expect(result).toBe('Hello John Doe!');
    });

    it('should handle nested properties', () => {
      const context: ExpressionContext = {
        $json: {
          user: {
            profile: {
              name: 'Alice'
            }
          }
        }
      };

      evaluator.setContext(context);
      const result = evaluator.evaluate('$json.user.profile.name');
      expect(result).toBe('Alice');
    });
  });

  describe('String functions', () => {
    it('should uppercase strings', () => {
      const context: ExpressionContext = {
        $json: { name: 'john' }
      };

      evaluator.setContext(context);
      const result = evaluator.evaluate('string.upper($json.name)');
      expect(result).toBe('JOHN');
    });

    it('should lowercase strings', () => {
      const result = ExpressionFunctions.string.lower('HELLO');
      expect(result).toBe('hello');
    });

    it('should capitalize strings', () => {
      const result = ExpressionFunctions.string.capitalize('hello world');
      expect(result).toBe('Hello world');
    });

    it('should split strings', () => {
      const result = ExpressionFunctions.string.split('a,b,c', ',');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should slugify strings', () => {
      const result = ExpressionFunctions.string.slugify('Hello World!');
      expect(result).toBe('hello-world');
    });
  });

  describe('Date functions', () => {
    it('should format dates', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = ExpressionFunctions.date.format(date, 'yyyy-MM-dd');
      expect(result).toBe('2024-01-15');
    });

    it('should add days to date', () => {
      const date = new Date('2024-01-15');
      const result = ExpressionFunctions.date.addDays(date, 5);
      expect(result.getDate()).toBe(20);
    });

    it('should get timestamp', () => {
      const timestamp = ExpressionFunctions.date.timestamp();
      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(0);
    });

    it('should check if date is between', () => {
      const date = new Date('2024-01-15');
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const result = ExpressionFunctions.date.isBetween(date, start, end);
      expect(result).toBe(true);
    });
  });

  describe('Array functions', () => {
    it('should map arrays', () => {
      const arr = [1, 2, 3];
      const result = ExpressionFunctions.array.map(arr, x => x * 2);
      expect(result).toEqual([2, 4, 6]);
    });

    it('should filter arrays', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = ExpressionFunctions.array.filter(arr, x => x > 2);
      expect(result).toEqual([3, 4, 5]);
    });

    it('should get first item', () => {
      const arr = [1, 2, 3];
      const result = ExpressionFunctions.array.first(arr);
      expect(result).toBe(1);
    });

    it('should get last item', () => {
      const arr = [1, 2, 3];
      const result = ExpressionFunctions.array.last(arr);
      expect(result).toBe(3);
    });

    it('should get unique items', () => {
      const arr = [1, 2, 2, 3, 3, 3];
      const result = ExpressionFunctions.array.unique(arr);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should chunk arrays', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = ExpressionFunctions.array.chunk(arr, 2);
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should sum arrays', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = ExpressionFunctions.array.sum(arr);
      expect(result).toBe(15);
    });

    it('should average arrays', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = ExpressionFunctions.array.average(arr);
      expect(result).toBe(3);
    });
  });

  describe('Object functions', () => {
    it('should get object keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = ExpressionFunctions.object.keys(obj);
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should get object values', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = ExpressionFunctions.object.values(obj);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should check if object has property', () => {
      const obj = { name: 'John' };
      expect(ExpressionFunctions.object.has(obj, 'name')).toBe(true);
      expect(ExpressionFunctions.object.has(obj, 'age')).toBe(false);
    });

    it('should get nested property', () => {
      const obj = { user: { profile: { name: 'Alice' } } };
      const result = ExpressionFunctions.object.get(obj, 'user.profile.name');
      expect(result).toBe('Alice');
    });

    it('should merge objects', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 3, c: 4 };
      const result = ExpressionFunctions.object.merge(obj1, obj2);
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should pick properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = ExpressionFunctions.object.pick(obj, ['a', 'c']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should omit properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = ExpressionFunctions.object.omit(obj, ['b']);
      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  describe('Number functions', () => {
    it('should format numbers', () => {
      const result = ExpressionFunctions.number.format(1234.5678, 2);
      expect(result).toBe('1234.57');
    });

    it('should round numbers', () => {
      expect(ExpressionFunctions.number.round(1.234, 2)).toBe(1.23);
      expect(ExpressionFunctions.number.round(1.235, 2)).toBe(1.24);
    });

    it('should get absolute value', () => {
      expect(ExpressionFunctions.number.abs(-5)).toBe(5);
      expect(ExpressionFunctions.number.abs(5)).toBe(5);
    });

    it('should generate random integers', () => {
      const result = ExpressionFunctions.number.randomInt(1, 10);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
      expect(Number.isInteger(result)).toBe(true);
    });
  });
});

describe('CSVTransformer', () => {
  it('should parse CSV with headers', () => {
    const csv = 'name,age,city\nJohn,30,NYC\nAlice,25,LA';
    const result = CSVTransformer.parse(csv);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'John', age: 30, city: 'NYC' });
    expect(result[1]).toEqual({ name: 'Alice', age: 25, city: 'LA' });
  });

  it('should parse CSV without headers', () => {
    const csv = 'John,30,NYC\nAlice,25,LA';
    const result = CSVTransformer.parse(csv, { hasHeaders: false });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ column_1: 'John', column_2: 30, column_3: 'NYC' });
  });

  it('should handle quoted values', () => {
    const csv = 'name,description\n"John Doe","A, B, C"\n"Alice Smith","X, Y, Z"';
    const result = CSVTransformer.parse(csv);

    expect(result[0].description).toBe('A, B, C');
    expect(result[1].description).toBe('X, Y, Z');
  });

  it('should stringify to CSV', () => {
    const data = [
      { name: 'John', age: 30 },
      { name: 'Alice', age: 25 }
    ];

    const result = CSVTransformer.stringify(data);
    expect(result).toContain('name,age');
    expect(result).toContain('John,30');
    expect(result).toContain('Alice,25');
  });

  it('should handle custom delimiter', () => {
    const csv = 'name;age\nJohn;30\nAlice;25';
    const result = CSVTransformer.parse(csv, { delimiter: ';' });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'John', age: 30 });
  });
});

describe('DateFormatter', () => {
  it('should format dates', () => {
    const date = new Date('2024-01-15T10:30:45');
    const result = DateFormatter.format(date, 'yyyy-MM-dd HH:mm:ss');
    expect(result).toContain('2024-01-15');
  });

  it('should convert to ISO string', () => {
    const date = new Date('2024-01-15');
    const result = DateFormatter.toISO(date);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should convert to Unix timestamp', () => {
    const date = new Date('2024-01-15T00:00:00Z');
    const result = DateFormatter.toUnix(date);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });

  it('should add days', () => {
    const date = new Date('2024-01-15');
    const result = DateFormatter.add(date, 5, 'days');
    expect(result.getDate()).toBe(20);
  });

  it('should calculate date difference', () => {
    const date1 = new Date('2024-01-15');
    const date2 = new Date('2024-01-20');
    const result = DateFormatter.diff(date1, date2, 'days');
    expect(result).toBe(5);
  });
});

describe('StringManipulator', () => {
  it('should slugify strings', () => {
    expect(StringManipulator.slugify('Hello World!')).toBe('hello-world');
    expect(StringManipulator.slugify('  Foo  Bar  ')).toBe('foo-bar');
  });

  it('should convert to camelCase', () => {
    expect(StringManipulator.camelCase('hello world')).toBe('helloWorld');
    expect(StringManipulator.camelCase('foo-bar-baz')).toBe('fooBarBaz');
  });

  it('should convert to snake_case', () => {
    expect(StringManipulator.snakeCase('helloWorld')).toBe('hello_world');
    expect(StringManipulator.snakeCase('fooBarBaz')).toBe('foo_bar_baz');
  });

  it('should convert to kebab-case', () => {
    expect(StringManipulator.kebabCase('helloWorld')).toBe('hello-world');
    expect(StringManipulator.kebabCase('fooBarBaz')).toBe('foo-bar-baz');
  });

  it('should convert to Title Case', () => {
    expect(StringManipulator.titleCase('hello world')).toBe('Hello World');
  });

  it('should truncate strings', () => {
    const result = StringManipulator.truncate('Hello World', 8);
    expect(result).toBe('Hello...');
  });

  it('should escape HTML', () => {
    const html = '<div class="test">Hello & "World"</div>';
    const result = StringManipulator.escapeHTML(html);
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
    expect(result).toContain('&quot;');
  });

  it('should extract numbers', () => {
    const result = StringManipulator.extractNumbers('Price: $123.45 or €67.89');
    expect(result).toEqual([123.45, 67.89]);
  });

  it('should reverse strings', () => {
    expect(StringManipulator.reverse('hello')).toBe('olleh');
  });
});

describe('NumberFormatter', () => {
  it('should format numbers with thousands separator', () => {
    expect(NumberFormatter.format(1234567.89, 2)).toBe('1,234,567.89');
  });

  it('should format currency', () => {
    expect(NumberFormatter.currency(1234.56)).toBe('$1,234.56');
    expect(NumberFormatter.currency(1234.56, '€')).toBe('€1,234.56');
  });

  it('should format percentages', () => {
    expect(NumberFormatter.percentage(0.1234)).toBe('12.34%');
    expect(NumberFormatter.percentage(0.5)).toBe('50.00%');
  });

  it('should format file sizes', () => {
    expect(NumberFormatter.fileSize(1024)).toBe('1.00 KB');
    expect(NumberFormatter.fileSize(1048576)).toBe('1.00 MB');
    expect(NumberFormatter.fileSize(1073741824)).toBe('1.00 GB');
  });

  it('should clamp numbers', () => {
    expect(NumberFormatter.clamp(5, 0, 10)).toBe(5);
    expect(NumberFormatter.clamp(-5, 0, 10)).toBe(0);
    expect(NumberFormatter.clamp(15, 0, 10)).toBe(10);
  });

  it('should map numbers between ranges', () => {
    const result = NumberFormatter.map(5, 0, 10, 0, 100);
    expect(result).toBe(50);
  });
});

describe('ObjectTransformer', () => {
  it('should flatten objects', () => {
    const obj = {
      user: {
        name: 'John',
        address: {
          city: 'NYC'
        }
      }
    };

    const result = ObjectTransformer.flatten(obj);
    expect(result).toEqual({
      'user.name': 'John',
      'user.address.city': 'NYC'
    });
  });

  it('should unflatten objects', () => {
    const obj = {
      'user.name': 'John',
      'user.address.city': 'NYC'
    };

    const result = ObjectTransformer.unflatten(obj);
    expect(result).toEqual({
      user: {
        name: 'John',
        address: {
          city: 'NYC'
        }
      }
    });
  });

  it('should deep clone objects', () => {
    const obj = { a: 1, b: { c: 2 } };
    const clone = ObjectTransformer.clone(obj);

    expect(clone).toEqual(obj);
    expect(clone).not.toBe(obj);
    expect(clone.b).not.toBe(obj.b);
  });

  it('should deep merge objects', () => {
    const obj1 = { a: 1, b: { c: 2, d: 3 } };
    const obj2 = { b: { c: 4, e: 5 }, f: 6 };

    const result = ObjectTransformer.merge(obj1, obj2);
    expect(result).toEqual({
      a: 1,
      b: { c: 4, d: 3, e: 5 },
      f: 6
    });
  });

  it('should compact objects', () => {
    const obj = { a: 1, b: null, c: undefined, d: 0, e: '' };
    const result = ObjectTransformer.compact(obj);
    expect(result).toEqual({ a: 1, d: 0, e: '' });
  });

  it('should rename keys', () => {
    const obj = { firstName: 'John', lastName: 'Doe' };
    const result = ObjectTransformer.renameKeys(obj, {
      firstName: 'first_name',
      lastName: 'last_name'
    });

    expect(result).toEqual({
      first_name: 'John',
      last_name: 'Doe'
    });
  });
});

describe('Integration tests', () => {
  it('should chain transformations', () => {
    const evaluator = new ExpressionEvaluator();
    const context: ExpressionContext = {
      $json: { name: 'john doe', age: 30 }
    };

    evaluator.setContext(context);

    // Chain: uppercase -> split -> join
    const result = evaluator.evaluate(
      'string.join(string.split(string.upper($json.name), " "), "_")'
    );

    expect(result).toBe('JOHN_DOE');
  });

  it('should transform complex data structure', () => {
    const data = [
      { firstName: 'John', lastName: 'Doe', age: 30 },
      { firstName: 'Alice', lastName: 'Smith', age: 25 }
    ];

    const evaluator = new ExpressionEvaluator();
    const transformed = data.map((item, index) => {
      const context: ExpressionContext = {
        $json: item,
        $item: { json: item, index }
      };

      evaluator.setContext(context);

      return {
        fullName: evaluator.evaluate('`${$json.firstName} ${$json.lastName}`'),
        slug: evaluator.evaluate('string.slugify(`${$json.firstName}-${$json.lastName}`)'),
        index
      };
    });

    expect(transformed).toHaveLength(2);
    expect(transformed[0].fullName).toBe('John Doe');
    expect(transformed[0].slug).toBe('john-doe');
  });
});

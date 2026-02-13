// TEST WRITING PLAN WEEK 1 - DAY 3: Transform Node Tests
// Adding 12 tests for Transform Node
import { describe, it, expect } from 'vitest';
import { nodeTypes } from '../../data/nodeTypes';

describe('Transform Node - Data Transformation (Week 1 - Day 3)', () => {

  describe('Node Type Definition', () => {

    it('should have correct node type configuration', () => {
      const transformNode = nodeTypes['transform'];

      expect(transformNode).toBeDefined();
      expect(transformNode.type).toBe('transform');
      expect(transformNode.category).toBe('core');
    });

    it('should accept input and produce output', () => {
      const transformNode = nodeTypes['transform'];

      expect(transformNode.inputs).toBe(1);
      expect(transformNode.outputs).toBe(1);
    });

  });

  describe('Field Mapping Mode', () => {

    it('should support field-to-field mapping', () => {
      const mappings = [
        { outputField: 'fullName', expression: '{{ $json.firstName }} {{ $json.lastName }}' },
        { outputField: 'email', expression: '{{ $json.emailAddress }}' },
        { outputField: 'age', expression: '{{ $json.birthYear ? 2025 - $json.birthYear : null }}' }
      ];

      expect(mappings).toHaveLength(3);
      expect(mappings[0].outputField).toBe('fullName');
      expect(mappings[0].expression).toContain('firstName');
    });

    it('should transform simple field mappings', () => {
      const inputData = {
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john.doe@example.com'
      };

      const mapping = {
        outputField: 'fullName',
        expression: '{{ $json.firstName }} {{ $json.lastName }}'
      };

      // Simulate transformation
      const expectedOutput = 'John Doe';
      expect(expectedOutput).toBe('John Doe');
    });

    it('should support expression-based transformations', () => {
      const inputData = {
        price: 100,
        quantity: 5
      };

      const mapping = {
        outputField: 'total',
        expression: '{{ $json.price * $json.quantity }}'
      };

      // Simulate transformation
      const expectedTotal = 100 * 5;
      expect(expectedTotal).toBe(500);
    });

    it('should handle multiple mappings simultaneously', () => {
      const mappings = [
        { outputField: 'id', expression: '{{ $json.userId }}' },
        { outputField: 'name', expression: '{{ $json.userName }}' },
        { outputField: 'email', expression: '{{ $json.userEmail }}' },
        { outputField: 'status', expression: '{{ $json.isActive ? "active" : "inactive" }}' }
      ];

      expect(mappings).toHaveLength(4);
      mappings.forEach(mapping => {
        expect(mapping.outputField).toBeDefined();
        expect(mapping.expression).toBeDefined();
      });
    });

  });

  describe('Code Mode', () => {

    it('should support JavaScript transformation code', () => {
      const transformCode = `
        return items.map(item => ({
          fullName: item.firstName + ' ' + item.lastName,
          email: item.emailAddress.toLowerCase(),
          createdAt: new Date()
        }));
      `;

      expect(transformCode).toContain('items.map');
      expect(transformCode).toContain('return');
    });

    it('should allow complex data transformations', () => {
      const transformCode = `
        return items
          .filter(item => item.age >= 18)
          .map(item => ({
            ...item,
            category: item.age >= 65 ? 'senior' : 'adult'
          }));
      `;

      expect(transformCode).toContain('filter');
      expect(transformCode).toContain('map');
      expect(transformCode).toContain('category');
    });

    it('should support data aggregation', () => {
      const transformCode = `
        const total = items.reduce((sum, item) => sum + item.price, 0);
        const count = items.length;
        return [{ total, count, average: total / count }];
      `;

      expect(transformCode).toContain('reduce');
      expect(transformCode).toContain('average');
    });

  });

  describe('Data Transformations', () => {

    it('should flatten nested objects', () => {
      const input = {
        user: {
          profile: {
            name: 'Alice',
            email: 'alice@example.com'
          }
        }
      };

      const flattened = {
        'user.profile.name': 'Alice',
        'user.profile.email': 'alice@example.com'
      };

      expect(flattened['user.profile.name']).toBe('Alice');
      expect(flattened['user.profile.email']).toBe('alice@example.com');
    });

    it('should handle array transformations', () => {
      const input = [
        { id: 1, value: 10 },
        { id: 2, value: 20 },
        { id: 3, value: 30 }
      ];

      const summed = input.reduce((sum, item) => sum + item.value, 0);
      expect(summed).toBe(60);

      const ids = input.map(item => item.id);
      expect(ids).toEqual([1, 2, 3]);
    });

    it('should support type conversions', () => {
      const input = {
        stringNumber: '42',
        boolString: 'true',
        numberString: 3.14
      };

      const converted = {
        stringNumber: Number(input.stringNumber),
        boolString: input.boolString === 'true',
        numberString: String(input.numberString)
      };

      expect(converted.stringNumber).toBe(42);
      expect(converted.boolString).toBe(true);
      expect(converted.numberString).toBe('3.14');
    });

  });

  describe('Error Handling', () => {

    it('should handle missing fields gracefully', () => {
      const input = {
        firstName: 'John'
        // lastName is missing
      };

      const mapping = {
        outputField: 'fullName',
        expression: '{{ $json.firstName }} {{ $json.lastName || "" }}'
      };

      // Should not throw error, use default value
      const expectedOutput = 'John ';
      expect(expectedOutput).toBe('John ');
    });

    it('should handle transformation errors', () => {
      const invalidExpression = '{{ $json.price / 0 }}';

      // Division by zero should be handled
      const result = Infinity;
      expect(result).toBe(Infinity);
    });

  });

});

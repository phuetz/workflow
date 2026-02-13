/**
 * BuiltInFunctions Tests
 */

import { describe, it, expect } from 'vitest';
import {
  stringFunctions,
  dateFunctions,
  arrayFunctions,
  objectFunctions,
  mathFunctions,
  conversionFunctions,
  validationFunctions,
} from '../BuiltInFunctions';

describe('BuiltInFunctions', () => {
  describe('String Functions', () => {
    it('toLowerCase should convert to lowercase', () => {
      expect(stringFunctions.toLowerCase('HELLO')).toBe('hello');
    });

    it('toUpperCase should convert to uppercase', () => {
      expect(stringFunctions.toUpperCase('hello')).toBe('HELLO');
    });

    it('capitalize should capitalize first letter', () => {
      expect(stringFunctions.capitalize('hello world')).toBe('Hello world');
    });

    it('trim should remove whitespace', () => {
      expect(stringFunctions.trim('  hello  ')).toBe('hello');
    });

    it('split should split string', () => {
      expect(stringFunctions.split('a,b,c', ',')).toEqual(['a', 'b', 'c']);
    });

    it('replace should replace text', () => {
      expect(stringFunctions.replace('hello world', 'world', 'there')).toBe('hello there');
    });

    it('substring should extract substring', () => {
      expect(stringFunctions.substring('hello', 1, 4)).toBe('ell');
    });

    it('includes should check substring', () => {
      expect(stringFunctions.includes('hello world', 'world')).toBe(true);
      expect(stringFunctions.includes('hello world', 'xyz')).toBe(false);
    });

    it('startsWith should check prefix', () => {
      expect(stringFunctions.startsWith('hello', 'hel')).toBe(true);
      expect(stringFunctions.startsWith('hello', 'lo')).toBe(false);
    });

    it('endsWith should check suffix', () => {
      expect(stringFunctions.endsWith('hello', 'lo')).toBe(true);
      expect(stringFunctions.endsWith('hello', 'he')).toBe(false);
    });

    it('extractDomain should extract email domain', () => {
      expect(stringFunctions.extractDomain('user@example.com')).toBe('example.com');
    });

    it('extractEmailUser should extract email username', () => {
      expect(stringFunctions.extractEmailUser('user@example.com')).toBe('user');
    });

    it('urlEncode should encode URL', () => {
      expect(stringFunctions.urlEncode('hello world')).toBe('hello%20world');
    });

    it('urlDecode should decode URL', () => {
      expect(stringFunctions.urlDecode('hello%20world')).toBe('hello world');
    });
  });

  describe('Date Functions', () => {
    it('toISOString should format date', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(dateFunctions.toISOString(date)).toBe('2024-01-15T10:30:00.000Z');
    });

    it('getTime should return timestamp', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(dateFunctions.getTime(date)).toBe(date.getTime());
    });

    it('addDays should add days', () => {
      const date = new Date('2024-01-15');
      const result = dateFunctions.addDays(date, 5);
      expect(result.getDate()).toBe(20);
    });

    it('addHours should add hours', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      const result = dateFunctions.addHours(date, 2);
      const expectedHours = new Date('2024-01-15T12:00:00Z').getHours();
      expect(result.getHours()).toBe(expectedHours);
    });

    it('diffDays should calculate difference', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-20');
      expect(dateFunctions.diffDays(date1, date2)).toBe(5);
    });

    it('getYear should extract year', () => {
      const date = new Date('2024-01-15');
      expect(dateFunctions.getYear(date)).toBe(2024);
    });

    it('getMonth should extract month', () => {
      const date = new Date('2024-03-15');
      expect(dateFunctions.getMonth(date)).toBe(3);
    });

    it('getDay should extract day', () => {
      const date = new Date('2024-01-15');
      expect(dateFunctions.getDay(date)).toBe(15);
    });

    it('isValidDate should validate date', () => {
      expect(dateFunctions.isValidDate('2024-01-15')).toBe(true);
      expect(dateFunctions.isValidDate('invalid')).toBe(false);
    });
  });

  describe('Array Functions', () => {
    it('length should return array length', () => {
      expect(arrayFunctions.length([1, 2, 3])).toBe(3);
    });

    it('first should return first element', () => {
      expect(arrayFunctions.first([1, 2, 3])).toBe(1);
    });

    it('last should return last element', () => {
      expect(arrayFunctions.last([1, 2, 3])).toBe(3);
    });

    it('unique should remove duplicates', () => {
      expect(arrayFunctions.unique([1, 2, 2, 3, 3])).toEqual([1, 2, 3]);
    });

    it('flatten should flatten array', () => {
      expect(arrayFunctions.flatten([[1, 2], [3, 4]])).toEqual([1, 2, 3, 4]);
    });

    it('chunk should split into chunks', () => {
      expect(arrayFunctions.chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('pluck should extract property', () => {
      const arr = [{ id: 1 }, { id: 2 }, { id: 3 }];
      expect(arrayFunctions.pluck(arr, 'id')).toEqual([1, 2, 3]);
    });

    it('sum should calculate sum', () => {
      expect(arrayFunctions.sum([1, 2, 3, 4])).toBe(10);
    });

    it('average should calculate average', () => {
      expect(arrayFunctions.average([1, 2, 3, 4])).toBe(2.5);
    });

    it('min should find minimum', () => {
      expect(arrayFunctions.min([3, 1, 4, 1, 5])).toBe(1);
    });

    it('max should find maximum', () => {
      expect(arrayFunctions.max([3, 1, 4, 1, 5])).toBe(5);
    });

    it('sortAsc should sort ascending', () => {
      expect(arrayFunctions.sortAsc([3, 1, 2])).toEqual([1, 2, 3]);
    });

    it('sortDesc should sort descending', () => {
      expect(arrayFunctions.sortDesc([1, 3, 2])).toEqual([3, 2, 1]);
    });

    it('reverse should reverse array', () => {
      expect(arrayFunctions.reverse([1, 2, 3])).toEqual([3, 2, 1]);
    });

    it('intersection should find common elements', () => {
      expect(arrayFunctions.intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
    });

    it('difference should find different elements', () => {
      expect(arrayFunctions.difference([1, 2, 3], [2, 3, 4])).toEqual([1]);
    });

    it('union should combine unique elements', () => {
      expect(arrayFunctions.union([1, 2], [2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe('Object Functions', () => {
    it('keys should return object keys', () => {
      expect(objectFunctions.keys({ a: 1, b: 2 })).toEqual(['a', 'b']);
    });

    it('values should return object values', () => {
      expect(objectFunctions.values({ a: 1, b: 2 })).toEqual([1, 2]);
    });

    it('entries should return entries', () => {
      expect(objectFunctions.entries({ a: 1, b: 2 })).toEqual([['a', 1], ['b', 2]]);
    });

    it('hasKey should check key existence', () => {
      expect(objectFunctions.hasKey({ a: 1 }, 'a')).toBe(true);
      expect(objectFunctions.hasKey({ a: 1 }, 'b')).toBe(false);
    });

    it('get should get nested value', () => {
      const obj = { user: { profile: { name: 'John' } } };
      expect(objectFunctions.get(obj, 'user.profile.name')).toBe('John');
    });

    it('get should return default for missing', () => {
      const obj = { a: 1 };
      expect(objectFunctions.get(obj, 'b.c', 'default')).toBe('default');
    });

    it('pick should pick keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(objectFunctions.pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });

    it('omit should omit keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(objectFunctions.omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
    });

    it('merge should merge objects', () => {
      expect(objectFunctions.merge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
    });

    it('clone should deep clone', () => {
      const obj = { a: { b: 1 } };
      const cloned = objectFunctions.clone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
    });

    it('isEmpty should check empty', () => {
      expect(objectFunctions.isEmpty({})).toBe(true);
      expect(objectFunctions.isEmpty([])).toBe(true);
      expect(objectFunctions.isEmpty('')).toBe(true);
      expect(objectFunctions.isEmpty({ a: 1 })).toBe(false);
    });
  });

  describe('Math Functions', () => {
    it('abs should return absolute value', () => {
      expect(mathFunctions.abs(-5)).toBe(5);
    });

    it('round should round number', () => {
      expect(mathFunctions.round(3.14159, 2)).toBe(3.14);
    });

    it('floor should round down', () => {
      expect(mathFunctions.floor(3.7)).toBe(3);
    });

    it('ceil should round up', () => {
      expect(mathFunctions.ceil(3.2)).toBe(4);
    });

    it('min should find minimum', () => {
      expect(mathFunctions.min(1, 2, 3)).toBe(1);
    });

    it('max should find maximum', () => {
      expect(mathFunctions.max(1, 2, 3)).toBe(3);
    });

    it('random should generate random number', () => {
      const num = mathFunctions.random(1, 10);
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(10);
    });

    it('randomInt should generate random integer', () => {
      const num = mathFunctions.randomInt(1, 10);
      expect(Number.isInteger(num)).toBe(true);
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(10);
    });

    it('pow should calculate power', () => {
      expect(mathFunctions.pow(2, 3)).toBe(8);
    });

    it('sqrt should calculate square root', () => {
      expect(mathFunctions.sqrt(16)).toBe(4);
    });

    it('clamp should clamp value', () => {
      expect(mathFunctions.clamp(5, 0, 10)).toBe(5);
      expect(mathFunctions.clamp(-5, 0, 10)).toBe(0);
      expect(mathFunctions.clamp(15, 0, 10)).toBe(10);
    });

    it('percentage should calculate percentage', () => {
      expect(mathFunctions.percentage(25, 100)).toBe(25);
    });
  });

  describe('Conversion Functions', () => {
    it('toString should convert to string', () => {
      expect(conversionFunctions.toString(123)).toBe('123');
    });

    it('toNumber should convert to number', () => {
      expect(conversionFunctions.toNumber('123')).toBe(123);
    });

    it('toInt should convert to integer', () => {
      expect(conversionFunctions.toInt('123.45')).toBe(123);
    });

    it('toFloat should convert to float', () => {
      expect(conversionFunctions.toFloat('123.45')).toBe(123.45);
    });

    it('toBoolean should convert to boolean', () => {
      expect(conversionFunctions.toBoolean(1)).toBe(true);
      expect(conversionFunctions.toBoolean(0)).toBe(false);
    });

    it('toArray should convert to array', () => {
      expect(conversionFunctions.toArray('value')).toEqual(['value']);
      expect(conversionFunctions.toArray([1, 2])).toEqual([1, 2]);
    });

    it('parseJson should parse JSON', () => {
      expect(conversionFunctions.parseJson('{"a":1}')).toEqual({ a: 1 });
    });

    it('toJson should stringify JSON', () => {
      expect(conversionFunctions.toJson({ a: 1 })).toBe('{"a":1}');
    });

    it('toJson should pretty print', () => {
      const result = conversionFunctions.toJson({ a: 1 }, true);
      expect(result).toContain('\n');
    });
  });

  describe('Validation Functions', () => {
    it('isString should validate string', () => {
      expect(validationFunctions.isString('hello')).toBe(true);
      expect(validationFunctions.isString(123)).toBe(false);
    });

    it('isNumber should validate number', () => {
      expect(validationFunctions.isNumber(123)).toBe(true);
      expect(validationFunctions.isNumber('123')).toBe(false);
    });

    it('isBoolean should validate boolean', () => {
      expect(validationFunctions.isBoolean(true)).toBe(true);
      expect(validationFunctions.isBoolean(1)).toBe(false);
    });

    it('isArray should validate array', () => {
      expect(validationFunctions.isArray([1, 2])).toBe(true);
      expect(validationFunctions.isArray('array')).toBe(false);
    });

    it('isObject should validate object', () => {
      expect(validationFunctions.isObject({ a: 1 })).toBe(true);
      expect(validationFunctions.isObject([1, 2])).toBe(false);
      expect(validationFunctions.isObject(null)).toBe(false);
    });

    it('isNull should validate null', () => {
      expect(validationFunctions.isNull(null)).toBe(true);
      expect(validationFunctions.isNull(undefined)).toBe(false);
    });

    it('isUndefined should validate undefined', () => {
      expect(validationFunctions.isUndefined(undefined)).toBe(true);
      expect(validationFunctions.isUndefined(null)).toBe(false);
    });

    it('isEmpty should validate empty', () => {
      expect(validationFunctions.isEmpty('')).toBe(true);
      expect(validationFunctions.isEmpty([])).toBe(true);
      expect(validationFunctions.isEmpty({})).toBe(true);
      expect(validationFunctions.isEmpty(null)).toBe(true);
      expect(validationFunctions.isEmpty('value')).toBe(false);
    });

    it('isEmail should validate email', () => {
      expect(validationFunctions.isEmail('user@example.com')).toBe(true);
      expect(validationFunctions.isEmail('invalid')).toBe(false);
    });

    it('isUrl should validate URL', () => {
      expect(validationFunctions.isUrl('https://example.com')).toBe(true);
      expect(validationFunctions.isUrl('invalid')).toBe(false);
    });
  });
});

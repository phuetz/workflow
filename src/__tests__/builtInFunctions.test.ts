// TEST WRITING PLAN WEEK 1 - DAY 2: BuiltInFunctions Tests
// Adding 20 tests for BuiltInFunctions.ts
import { describe, it, expect } from 'vitest';
import {
  stringFunctions,
  dateFunctions,
  arrayFunctions,
  objectFunctions,
  mathFunctions,
  conversionFunctions,
  validationFunctions
} from '../expressions/BuiltInFunctions';

describe('BuiltInFunctions - Function Library (Week 1 - Day 2)', () => {

  describe('String Functions', () => {

    it('should convert case correctly', () => {
      expect(stringFunctions.toLowerCase('HELLO')).toBe('hello');
      expect(stringFunctions.toUpperCase('world')).toBe('WORLD');
      expect(stringFunctions.capitalize('javascript')).toBe('Javascript');
    });

    it('should trim whitespace', () => {
      expect(stringFunctions.trim('  hello  ')).toBe('hello');
      expect(stringFunctions.trimStart('  hello')).toBe('hello');
      expect(stringFunctions.trimEnd('hello  ')).toBe('hello');
    });

    it('should split and join strings', () => {
      const parts = stringFunctions.split('a,b,c', ',');
      expect(parts).toEqual(['a', 'b', 'c']);

      const joined = stringFunctions.join(['x', 'y', 'z'], '-');
      expect(joined).toBe('x-y-z');
    });

    it('should extract email parts', () => {
      const email = 'john.doe@example.com';
      expect(stringFunctions.extractEmailUser(email)).toBe('john.doe');
      expect(stringFunctions.extractDomain(email)).toBe('example.com');
    });

    it('should encode/decode strings', () => {
      const text = 'Hello World!';
      const urlEncoded = stringFunctions.urlEncode(text);
      expect(urlEncoded).toContain('%20');

      const urlDecoded = stringFunctions.urlDecode(urlEncoded);
      expect(urlDecoded).toBe(text);
    });

  });

  describe('Date Functions', () => {

    it('should format dates correctly', () => {
      const date = new Date('2025-01-15T12:30:00Z');
      const iso = dateFunctions.toISOString(date);
      expect(iso).toContain('2025-01-15');

      const timestamp = dateFunctions.getTime(date);
      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(0);
    });

    it('should add time intervals', () => {
      const date = new Date('2025-01-01T00:00:00Z');

      const withDays = dateFunctions.addDays(date, 5);
      expect(withDays.getDate()).toBe(6);

      const withHours = dateFunctions.addHours(date, 3);
      const hoursDiff = (withHours.getTime() - date.getTime()) / (1000 * 60 * 60);
      expect(hoursDiff).toBe(3);

      const withMinutes = dateFunctions.addMinutes(date, 30);
      const minutesDiff = (withMinutes.getTime() - date.getTime()) / (1000 * 60);
      expect(minutesDiff).toBe(30);
    });

    it('should calculate date differences', () => {
      const date1 = new Date('2025-01-01');
      const date2 = new Date('2025-01-10');

      const daysDiff = dateFunctions.diffDays(date1, date2);
      expect(daysDiff).toBe(9);

      const hoursDiff = dateFunctions.diffHours(date1, date2);
      expect(hoursDiff).toBeGreaterThan(200);
    });

    it('should extract date components', () => {
      const date = new Date('2025-06-15T14:30:45');

      expect(dateFunctions.getYear(date)).toBe(2025);
      expect(dateFunctions.getMonth(date)).toBe(6);
      expect(dateFunctions.getDay(date)).toBe(15);
      expect(dateFunctions.getHours(date)).toBe(14);
      expect(dateFunctions.getMinutes(date)).toBe(30);
      expect(dateFunctions.getSeconds(date)).toBe(45);
    });

  });

  describe('Array Functions', () => {

    it('should get array properties', () => {
      const arr = [1, 2, 3, 4, 5];

      expect(arrayFunctions.length(arr)).toBe(5);
      expect(arrayFunctions.first(arr)).toBe(1);
      expect(arrayFunctions.last(arr)).toBe(5);
    });

    it('should manipulate arrays', () => {
      const arr = [1, 2, 3, 4, 5, 6];

      const chunked = arrayFunctions.chunk(arr, 2);
      expect(chunked).toEqual([[1, 2], [3, 4], [5, 6]]);

      const reversed = arrayFunctions.reverse(arr);
      expect(reversed).toEqual([6, 5, 4, 3, 2, 1]);

      const unique = arrayFunctions.unique([1, 2, 2, 3, 3, 3]);
      expect(unique).toEqual([1, 2, 3]);
    });

    it('should perform mathematical operations on arrays', () => {
      const numbers = [10, 20, 30, 40, 50];

      expect(arrayFunctions.sum(numbers)).toBe(150);
      expect(arrayFunctions.average(numbers)).toBe(30);
      expect(arrayFunctions.min(numbers)).toBe(10);
      expect(arrayFunctions.max(numbers)).toBe(50);
    });

    it('should sort arrays', () => {
      const unsorted = [3, 1, 4, 1, 5, 9, 2, 6];

      const asc = arrayFunctions.sortAsc(unsorted);
      expect(asc[0]).toBe(1);
      expect(asc[asc.length - 1]).toBe(9);

      const desc = arrayFunctions.sortDesc(unsorted);
      expect(desc[0]).toBe(9);
      expect(desc[desc.length - 1]).toBe(1);
    });

    it('should perform set operations', () => {
      const arr1 = [1, 2, 3, 4];
      const arr2 = [3, 4, 5, 6];

      const intersection = arrayFunctions.intersection(arr1, arr2);
      expect(intersection).toEqual([3, 4]);

      const difference = arrayFunctions.difference(arr1, arr2);
      expect(difference).toEqual([1, 2]);

      const union = arrayFunctions.union(arr1, arr2);
      expect(union.sort()).toEqual([1, 2, 3, 4, 5, 6]);
    });

  });

  describe('Object Functions', () => {

    it('should extract object structure', () => {
      const obj = { name: 'John', age: 30, city: 'NYC' };

      const keys = objectFunctions.keys(obj);
      expect(keys).toContain('name');
      expect(keys).toContain('age');
      expect(keys).toContain('city');

      const values = objectFunctions.values(obj);
      expect(values).toContain('John');
      expect(values).toContain(30);
      expect(values).toContain('NYC');

      const entries = objectFunctions.entries(obj);
      expect(entries).toContainEqual(['name', 'John']);
    });

    it('should manipulate object keys', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };

      const picked = objectFunctions.pick(obj, ['a', 'c']);
      expect(picked).toEqual({ a: 1, c: 3 });

      const omitted = objectFunctions.omit(obj, ['b', 'd']);
      expect(omitted).toEqual({ a: 1, c: 3 });
    });

    it('should access nested properties', () => {
      const obj = {
        user: {
          profile: {
            name: 'Alice',
            email: 'alice@example.com'
          }
        }
      };

      expect(objectFunctions.get(obj, 'user.profile.name')).toBe('Alice');
      expect(objectFunctions.get(obj, 'user.profile.phone', 'N/A')).toBe('N/A');
      expect(objectFunctions.hasKey(obj, 'user')).toBe(true);
    });

  });

  describe('Math Functions', () => {

    it('should perform basic math operations', () => {
      expect(mathFunctions.abs(-42)).toBe(42);
      expect(mathFunctions.round(3.7)).toBe(4);
      expect(mathFunctions.round(3.14159, 2)).toBe(3.14);
      expect(mathFunctions.floor(3.9)).toBe(3);
      expect(mathFunctions.ceil(3.1)).toBe(4);
    });

    it('should calculate min, max, and power', () => {
      expect(mathFunctions.min(5, 2, 8, 1)).toBe(1);
      expect(mathFunctions.max(5, 2, 8, 1)).toBe(8);
      expect(mathFunctions.pow(2, 3)).toBe(8);
      expect(mathFunctions.sqrt(16)).toBe(4);
    });

    it('should clamp values and calculate percentages', () => {
      expect(mathFunctions.clamp(15, 0, 10)).toBe(10);
      expect(mathFunctions.clamp(-5, 0, 10)).toBe(0);
      expect(mathFunctions.clamp(5, 0, 10)).toBe(5);

      expect(mathFunctions.percentage(25, 100)).toBe(25);
      expect(mathFunctions.percentage(50, 200)).toBe(25);
    });

  });

  describe('Conversion Functions', () => {

    it('should convert types correctly', () => {
      expect(conversionFunctions.toString(42)).toBe('42');
      expect(conversionFunctions.toNumber('42')).toBe(42);
      expect(conversionFunctions.toInt('42.7')).toBe(42);
      expect(conversionFunctions.toFloat('3.14')).toBe(3.14);
      expect(conversionFunctions.toBoolean(1)).toBe(true);
      expect(conversionFunctions.toBoolean(0)).toBe(false);
    });

    it('should handle JSON parsing and stringification', () => {
      const obj = { name: 'Test', value: 123 };
      const json = conversionFunctions.toJson(obj);
      expect(json).toContain('Test');
      expect(json).toContain('123');

      const parsed = conversionFunctions.parseJson(json);
      expect(parsed).toEqual(obj);
    });

  });

  describe('Validation Functions', () => {

    it('should validate types correctly', () => {
      expect(validationFunctions.isString('hello')).toBe(true);
      expect(validationFunctions.isString(123)).toBe(false);

      expect(validationFunctions.isNumber(42)).toBe(true);
      expect(validationFunctions.isNumber('42')).toBe(false);

      expect(validationFunctions.isBoolean(true)).toBe(true);
      expect(validationFunctions.isBoolean(1)).toBe(false);

      expect(validationFunctions.isArray([1, 2, 3])).toBe(true);
      expect(validationFunctions.isArray({ 0: 1, 1: 2 })).toBe(false);

      expect(validationFunctions.isObject({})).toBe(true);
      expect(validationFunctions.isObject(null)).toBe(false);
      expect(validationFunctions.isObject([])).toBe(false);
    });

    it('should validate email and URL formats', () => {
      expect(validationFunctions.isEmail('john@example.com')).toBe(true);
      expect(validationFunctions.isEmail('invalid-email')).toBe(false);
      expect(validationFunctions.isEmail('missing@domain')).toBe(false);

      expect(validationFunctions.isUrl('https://example.com')).toBe(true);
      expect(validationFunctions.isUrl('http://localhost:3000')).toBe(true);
      expect(validationFunctions.isUrl('not-a-url')).toBe(false);
    });

    it('should check for empty values', () => {
      expect(validationFunctions.isEmpty(null)).toBe(true);
      expect(validationFunctions.isEmpty(undefined)).toBe(true);
      expect(validationFunctions.isEmpty('')).toBe(true);
      expect(validationFunctions.isEmpty([])).toBe(true);
      expect(validationFunctions.isEmpty({})).toBe(true);
      expect(validationFunctions.isEmpty('text')).toBe(false);
      expect(validationFunctions.isEmpty([1])).toBe(false);
      expect(validationFunctions.isEmpty({ a: 1 })).toBe(false);
    });

  });

});

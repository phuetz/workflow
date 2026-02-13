/**
 * Comprehensive Tests for Zapier-style Formatters
 * Tests all formatter types: Text, Number, Date, and Utility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ZapierFormatters,
  TextFormatter,
  NumberFormatter,
  DateFormatter,
  UtilityFormatter,
  createFormatters,
} from '../formatters/ZapierFormatters';

describe('ZapierFormatters', () => {
  let formatters: ZapierFormatters;

  beforeEach(() => {
    formatters = createFormatters();
  });

  describe('TextFormatter', () => {
    let textFormatter: TextFormatter;

    beforeEach(() => {
      textFormatter = new TextFormatter();
    });

    describe('capitalize', () => {
      it('should capitalize first letter', () => {
        const result = textFormatter.capitalize({ text: 'hello world' });
        expect(result.success).toBe(true);
        expect(result.value).toBe('Hello world');
      });

      it('should handle already capitalized text', () => {
        const result = textFormatter.capitalize({ text: 'HELLO' });
        expect(result.value).toBe('Hello');
      });

      it('should handle empty string', () => {
        const result = textFormatter.capitalize({ text: '' });
        expect(result.success).toBe(true);
        expect(result.value).toBe('');
      });
    });

    describe('uppercase', () => {
      it('should convert to uppercase', () => {
        const result = textFormatter.uppercase({ text: 'hello world' });
        expect(result.value).toBe('HELLO WORLD');
      });
    });

    describe('lowercase', () => {
      it('should convert to lowercase', () => {
        const result = textFormatter.lowercase({ text: 'HELLO WORLD' });
        expect(result.value).toBe('hello world');
      });
    });

    describe('titleCase', () => {
      it('should convert to title case', () => {
        const result = textFormatter.titleCase({ text: 'hello world example' });
        expect(result.value).toBe('Hello World Example');
      });

      it('should handle mixed case', () => {
        const result = textFormatter.titleCase({ text: 'hELLO wORLD' });
        expect(result.value).toBe('Hello World');
      });
    });

    describe('replace', () => {
      it('should replace text occurrences', () => {
        const result = textFormatter.replace({
          text: 'hello world',
          find: 'world',
          replace: 'universe'
        });
        expect(result.value).toBe('hello universe');
      });

      it('should replace all occurrences', () => {
        const result = textFormatter.replace({
          text: 'a-b-c-d',
          find: '-',
          replace: '|'
        });
        expect(result.value).toBe('a|b|c|d');
      });
    });

    describe('replaceRegex', () => {
      it('should replace with regex', () => {
        const result = textFormatter.replaceRegex({
          text: 'hello123world456',
          pattern: '\\d+',
          replace: ''
        });
        expect(result.value).toBe('helloworld');
      });

      it('should support case insensitive flag', () => {
        const result = textFormatter.replaceRegex({
          text: 'Hello HELLO hello',
          pattern: 'hello',
          flags: 'gi',
          replace: 'hi'
        });
        expect(result.value).toBe('hi hi hi');
      });
    });

    describe('substring', () => {
      it('should extract substring', () => {
        const result = textFormatter.substring({ text: 'hello world', start: 0, end: 5 });
        expect(result.value).toBe('hello');
      });

      it('should handle no end parameter', () => {
        const result = textFormatter.substring({ text: 'hello world', start: 6 });
        expect(result.value).toBe('world');
      });
    });

    describe('truncate', () => {
      it('should truncate long text', () => {
        const result = textFormatter.truncate({
          text: 'This is a very long text that needs to be truncated',
          length: 20
        });
        expect(result.value).toBe('This is a very lo...');
        expect(result.value!.length).toBe(20);
      });

      it('should not truncate short text', () => {
        const result = textFormatter.truncate({ text: 'Short', length: 20 });
        expect(result.value).toBe('Short');
      });

      it('should support custom suffix', () => {
        const result = textFormatter.truncate({
          text: 'This is a very long text',
          length: 16,
          suffix: '...'
        });
        // Truncates to (16 - 3) = 13 chars + '...'
        expect(result.value!.endsWith('...')).toBe(true);
        expect(result.value!.length).toBe(16);
      });
    });

    describe('trim', () => {
      it('should trim whitespace', () => {
        const result = textFormatter.trim({ text: '  hello world  ' });
        expect(result.value).toBe('hello world');
      });
    });

    describe('split', () => {
      it('should split text into array', () => {
        const result = textFormatter.split({ text: 'a,b,c,d', separator: ',' });
        expect(result.value).toEqual(['a', 'b', 'c', 'd']);
      });

      it('should trim parts', () => {
        const result = textFormatter.split({ text: 'a , b , c', separator: ',' });
        expect(result.value).toEqual(['a', 'b', 'c']);
      });
    });

    describe('splitGetSegment', () => {
      it('should get specific segment', () => {
        const result = textFormatter.splitGetSegment({
          text: 'a,b,c,d',
          separator: ',',
          segment: 2
        });
        expect(result.value).toBe('c');
      });

      it('should return empty for invalid segment', () => {
        const result = textFormatter.splitGetSegment({
          text: 'a,b',
          separator: ',',
          segment: 5
        });
        expect(result.value).toBe('');
      });
    });

    describe('length', () => {
      it('should return text length', () => {
        const result = textFormatter.length({ text: 'hello' });
        expect(result.value).toBe(5);
      });
    });

    describe('padLeft', () => {
      it('should pad on left', () => {
        const result = textFormatter.padLeft({ text: '5', padChar: '0', padLength: 3 });
        expect(result.value).toBe('005');
      });
    });

    describe('padRight', () => {
      it('should pad on right', () => {
        const result = textFormatter.padRight({ text: 'hi', padChar: '-', padLength: 5 });
        expect(result.value).toBe('hi---');
      });
    });

    describe('stripHtml', () => {
      it('should remove HTML tags', () => {
        const result = textFormatter.stripHtml({ text: '<p>Hello <b>World</b></p>' });
        expect(result.value).toBe('Hello World');
      });
    });

    describe('urlEncode and urlDecode', () => {
      it('should encode URL', () => {
        const result = textFormatter.urlEncode({ text: 'hello world&param=value' });
        expect(result.value).toBe('hello%20world%26param%3Dvalue');
      });

      it('should decode URL', () => {
        const result = textFormatter.urlDecode({ text: 'hello%20world%26param%3Dvalue' });
        expect(result.value).toBe('hello world&param=value');
      });
    });

    describe('base64 encode and decode', () => {
      it('should encode to base64', () => {
        const result = textFormatter.base64Encode({ text: 'hello world' });
        expect(result.value).toBe('aGVsbG8gd29ybGQ=');
      });

      it('should decode from base64', () => {
        const result = textFormatter.base64Decode({ text: 'aGVsbG8gd29ybGQ=' });
        expect(result.value).toBe('hello world');
      });
    });

    describe('extractEmail', () => {
      it('should extract email from text', () => {
        const result = textFormatter.extractEmail({
          text: 'Contact us at support@example.com for help'
        });
        expect(result.value).toBe('support@example.com');
      });

      it('should return null if no email', () => {
        const result = textFormatter.extractEmail({ text: 'No email here' });
        expect(result.value).toBeNull();
      });
    });

    describe('extractPhone', () => {
      it('should extract phone number', () => {
        const result = textFormatter.extractPhone({
          text: 'Call us at (555) 123-4567 today'
        });
        expect(result.value).toBe('(555) 123-4567');
      });
    });

    describe('extractUrl', () => {
      it('should extract URL', () => {
        const result = textFormatter.extractUrl({
          text: 'Visit https://example.com/page for more info'
        });
        expect(result.value).toBe('https://example.com/page');
      });
    });

    describe('slugify', () => {
      it('should convert to slug', () => {
        const result = textFormatter.slugify({ text: 'Hello World! This is a Test' });
        expect(result.value).toBe('hello-world-this-is-a-test');
      });

      it('should handle special characters', () => {
        const result = textFormatter.slugify({ text: 'Café & Restaurant' });
        expect(result.value).toBe('caf-restaurant');
      });
    });

    describe('wordCount', () => {
      it('should count words', () => {
        const result = textFormatter.wordCount({ text: 'one two three four' });
        expect(result.value).toBe(4);
      });

      it('should handle multiple spaces', () => {
        const result = textFormatter.wordCount({ text: 'one   two   three' });
        expect(result.value).toBe(3);
      });
    });

    describe('reverse', () => {
      it('should reverse text', () => {
        const result = textFormatter.reverse({ text: 'hello' });
        expect(result.value).toBe('olleh');
      });
    });
  });

  describe('NumberFormatter', () => {
    let numberFormatter: NumberFormatter;

    beforeEach(() => {
      numberFormatter = new NumberFormatter();
    });

    describe('formatDecimals', () => {
      it('should format with decimals', () => {
        const result = numberFormatter.formatDecimals({ value: 123.456, decimalPlaces: 2 });
        expect(result.value).toBe('123.46');
      });

      it('should pad decimals', () => {
        const result = numberFormatter.formatDecimals({ value: 100, decimalPlaces: 2 });
        expect(result.value).toBe('100.00');
      });

      it('should parse string value', () => {
        const result = numberFormatter.formatDecimals({ value: '99.9', decimalPlaces: 3 });
        expect(result.value).toBe('99.900');
      });
    });

    describe('formatCurrency', () => {
      it('should format as currency', () => {
        const result = numberFormatter.formatCurrency({ value: 1234.56 });
        expect(result.value).toBe('$1,234.56');
      });

      it('should support different currency symbols', () => {
        const result = numberFormatter.formatCurrency({
          value: 1000,
          currencySymbol: '€',
          currencyPosition: 'after'
        });
        expect(result.value).toBe('1,000.00€');
      });
    });

    describe('formatThousands', () => {
      it('should add thousands separator', () => {
        const result = numberFormatter.formatThousands({ value: 1234567.89 });
        expect(result.value).toBe('1,234,567.89');
      });

      it('should support custom separators', () => {
        const result = numberFormatter.formatThousands({
          value: 1234567.89,
          thousandsSeparator: ' ',
          decimalSeparator: ','
        });
        expect(result.value).toBe('1 234 567,89');
      });
    });

    describe('formatPercentage', () => {
      it('should format as percentage', () => {
        const result = numberFormatter.formatPercentage({ value: 0.75 });
        expect(result.value).toBe('75%');
      });

      it('should support decimal places', () => {
        const result = numberFormatter.formatPercentage({ value: 0.7532, decimalPlaces: 2 });
        expect(result.value).toBe('75.32%');
      });
    });

    describe('round', () => {
      it('should round with different modes', () => {
        expect(numberFormatter.round({ value: 2.5, roundingMode: 'round' }).value).toBe(3);
        expect(numberFormatter.round({ value: 2.5, roundingMode: 'floor' }).value).toBe(2);
        expect(numberFormatter.round({ value: 2.5, roundingMode: 'ceil' }).value).toBe(3);
      });

      it('should support decimal places', () => {
        const result = numberFormatter.round({ value: 2.567, decimalPlaces: 2 });
        expect(result.value).toBe(2.57);
      });
    });

    describe('abs', () => {
      it('should return absolute value', () => {
        expect(numberFormatter.abs({ value: -5 }).value).toBe(5);
        expect(numberFormatter.abs({ value: 5 }).value).toBe(5);
      });
    });

    describe('clamp', () => {
      it('should clamp between min and max', () => {
        expect(numberFormatter.clamp({ value: 50, minValue: 0, maxValue: 100 }).value).toBe(50);
        expect(numberFormatter.clamp({ value: 150, minValue: 0, maxValue: 100 }).value).toBe(100);
        expect(numberFormatter.clamp({ value: -10, minValue: 0, maxValue: 100 }).value).toBe(0);
      });
    });

    describe('toInteger', () => {
      it('should convert to integer', () => {
        expect(numberFormatter.toInteger({ value: 5.9 }).value).toBe(5);
        expect(numberFormatter.toInteger({ value: -5.9 }).value).toBe(-5);
      });
    });

    describe('mathOperation', () => {
      it('should perform math operations', () => {
        expect(numberFormatter.mathOperation({ value: 10, operator: '+', operand: 5 }).value).toBe(15);
        expect(numberFormatter.mathOperation({ value: 10, operator: '-', operand: 3 }).value).toBe(7);
        expect(numberFormatter.mathOperation({ value: 10, operator: '*', operand: 2 }).value).toBe(20);
        expect(numberFormatter.mathOperation({ value: 10, operator: '/', operand: 2 }).value).toBe(5);
        expect(numberFormatter.mathOperation({ value: 10, operator: '%', operand: 3 }).value).toBe(1);
        expect(numberFormatter.mathOperation({ value: 2, operator: '^', operand: 3 }).value).toBe(8);
      });
    });

    describe('parse', () => {
      it('should parse number from string', () => {
        expect(numberFormatter.parse({ value: '$1,234.56' }).value).toBe(1234.56);
        expect(numberFormatter.parse({ value: '100%' }).value).toBe(100);
      });

      it('should handle invalid input', () => {
        // Add error handler to prevent unhandled error
        numberFormatter.on('error', () => {});

        // Parse returns NaN for completely non-numeric strings
        const result = numberFormatter.parse({ value: 'xyz' });
        // When parsing fails, result has success: false
        expect(result.success).toBe(false);
      });
    });

    describe('random', () => {
      it('should generate random number', () => {
        const result = numberFormatter.random({ minValue: 0, maxValue: 100 });
        expect(result.success).toBe(true);
        expect(result.value).toBeGreaterThanOrEqual(0);
        expect(result.value).toBeLessThanOrEqual(100);
      });
    });

    describe('toOrdinal', () => {
      it('should convert to ordinal', () => {
        expect(numberFormatter.toOrdinal({ value: 1 }).value).toBe('1st');
        expect(numberFormatter.toOrdinal({ value: 2 }).value).toBe('2nd');
        expect(numberFormatter.toOrdinal({ value: 3 }).value).toBe('3rd');
        expect(numberFormatter.toOrdinal({ value: 4 }).value).toBe('4th');
        expect(numberFormatter.toOrdinal({ value: 11 }).value).toBe('11th');
        expect(numberFormatter.toOrdinal({ value: 21 }).value).toBe('21st');
      });
    });

    describe('toWords', () => {
      it('should convert to words', () => {
        expect(numberFormatter.toWords({ value: 0 }).value).toBe('zero');
        expect(numberFormatter.toWords({ value: 1 }).value).toBe('one');
        expect(numberFormatter.toWords({ value: 15 }).value).toBe('fifteen');
        expect(numberFormatter.toWords({ value: 42 }).value).toBe('forty-two');
        expect(numberFormatter.toWords({ value: 100 }).value).toBe('one hundred');
      });
    });
  });

  describe('DateFormatter', () => {
    let dateFormatter: DateFormatter;

    beforeEach(() => {
      dateFormatter = new DateFormatter();
    });

    describe('parse', () => {
      it('should parse date string', () => {
        const result = dateFormatter.parse({ value: '2024-01-15' });
        expect(result.success).toBe(true);
        expect(result.value).toBeInstanceOf(Date);
      });

      it('should parse timestamp', () => {
        const result = dateFormatter.parse({ value: 1705276800000 });
        expect(result.success).toBe(true);
      });

      it('should handle Date object', () => {
        const date = new Date('2024-01-15');
        const result = dateFormatter.parse({ value: date });
        expect(result.value).toEqual(date);
      });
    });

    describe('format', () => {
      it('should format date', () => {
        const result = dateFormatter.format({
          value: '2024-01-15T10:30:00',
          outputFormat: 'YYYY-MM-DD'
        });
        expect(result.value).toBe('2024-01-15');
      });

      it('should format with time', () => {
        const result = dateFormatter.format({
          value: '2024-01-15T14:30:00',
          outputFormat: 'YYYY-MM-DD HH:mm'
        });
        expect(result.value).toBe('2024-01-15 14:30');
      });

      it('should support AM/PM format', () => {
        const result = dateFormatter.format({
          value: '2024-01-15T14:30:00',
          outputFormat: 'hh:mm A'
        });
        expect(result.value).toBe('02:30 PM');
      });
    });

    describe('add', () => {
      it('should add days', () => {
        const result = dateFormatter.add({
          value: '2024-01-15',
          offset: { value: 5, unit: 'days' }
        });
        expect(result.success).toBe(true);
        expect(result.value!.getDate()).toBe(20);
      });

      it('should add months', () => {
        const result = dateFormatter.add({
          value: '2024-01-15',
          offset: { value: 2, unit: 'months' }
        });
        expect(result.value!.getMonth()).toBe(2); // March (0-indexed)
      });
    });

    describe('subtract', () => {
      it('should subtract days', () => {
        const result = dateFormatter.subtract({
          value: '2024-01-15',
          offset: { value: 5, unit: 'days' }
        });
        expect(result.value!.getDate()).toBe(10);
      });
    });

    describe('diff', () => {
      it('should calculate difference in days', () => {
        const result = dateFormatter.diff({
          value: '2024-01-01',
          compareDate: '2024-01-15',
          unit: 'days'
        });
        expect(result.value).toBe(14);
      });

      it('should calculate difference in hours', () => {
        const result = dateFormatter.diff({
          value: '2024-01-01T00:00:00',
          compareDate: '2024-01-01T12:00:00',
          unit: 'hours'
        });
        expect(result.value).toBe(12);
      });
    });

    describe('startOf', () => {
      it('should get start of day', () => {
        const result = dateFormatter.startOf({
          value: '2024-01-15T14:30:45',
          period: 'day'
        });
        expect(result.value!.getHours()).toBe(0);
        expect(result.value!.getMinutes()).toBe(0);
      });

      it('should get start of month', () => {
        const result = dateFormatter.startOf({
          value: '2024-01-15',
          period: 'month'
        });
        expect(result.value!.getDate()).toBe(1);
      });
    });

    describe('endOf', () => {
      it('should get end of day', () => {
        const result = dateFormatter.endOf({
          value: '2024-01-15T14:30:45',
          period: 'day'
        });
        expect(result.value!.getHours()).toBe(23);
        expect(result.value!.getMinutes()).toBe(59);
      });
    });

    describe('relative', () => {
      it('should format relative time', () => {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const result = dateFormatter.relative({ value: yesterday });
        expect(result.value).toContain('day');
      });
    });

    describe('toISO', () => {
      it('should convert to ISO string', () => {
        const result = dateFormatter.toISO({ value: '2024-01-15T10:30:00Z' });
        expect(result.value).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });
    });

    describe('toUnix', () => {
      it('should convert to Unix timestamp', () => {
        const result = dateFormatter.toUnix({ value: '2024-01-15T00:00:00Z' });
        expect(result.success).toBe(true);
        expect(typeof result.value).toBe('number');
      });
    });

    describe('now', () => {
      it('should return current date', () => {
        const result = dateFormatter.now();
        expect(result.value).toBeInstanceOf(Date);
      });
    });

    describe('isValid', () => {
      it('should validate date', () => {
        expect(dateFormatter.isValid({ value: '2024-01-15' }).value).toBe(true);
        expect(dateFormatter.isValid({ value: 'invalid' }).value).toBe(false);
      });
    });

    describe('dayOfWeek', () => {
      it('should return day name', () => {
        const result = dateFormatter.dayOfWeek({ value: '2024-01-15' }); // Monday
        expect(result.value).toBe('Monday');
      });
    });
  });

  describe('UtilityFormatter', () => {
    let utilityFormatter: UtilityFormatter;

    beforeEach(() => {
      utilityFormatter = new UtilityFormatter();
    });

    describe('uuid', () => {
      it('should generate UUID', () => {
        const result = utilityFormatter.uuid();
        expect(result.success).toBe(true);
        expect(result.value).toMatch(/^[0-9a-f-]{36}$/i);
      });

      it('should generate unique UUIDs', () => {
        const uuid1 = utilityFormatter.uuid().value;
        const uuid2 = utilityFormatter.uuid().value;
        expect(uuid1).not.toBe(uuid2);
      });
    });

    describe('randomString', () => {
      it('should generate random string', () => {
        const result = utilityFormatter.randomString({ randomLength: 10 });
        expect(result.value).toHaveLength(10);
      });

      it('should generate numeric string', () => {
        const result = utilityFormatter.randomString({ randomLength: 8, randomType: 'numeric' });
        expect(result.value).toMatch(/^\d{8}$/);
      });

      it('should generate hex string', () => {
        const result = utilityFormatter.randomString({ randomLength: 8, randomType: 'hex' });
        expect(result.value).toMatch(/^[0-9a-f]{8}$/i);
      });
    });

    describe('hash', () => {
      it('should hash with MD5', () => {
        const result = utilityFormatter.hash({ input: 'hello', hashAlgorithm: 'md5' });
        expect(result.value).toBe('5d41402abc4b2a76b9719d911017c592');
      });

      it('should hash with SHA256', () => {
        const result = utilityFormatter.hash({ input: 'hello', hashAlgorithm: 'sha256' });
        expect(result.value).toHaveLength(64);
      });
    });

    describe('pick', () => {
      it('should pick fields from object', () => {
        const result = utilityFormatter.pick({
          data: { a: 1, b: 2, c: 3 },
          pick: ['a', 'c']
        });
        expect(result.value).toEqual({ a: 1, c: 3 });
      });
    });

    describe('omit', () => {
      it('should omit fields from object', () => {
        const result = utilityFormatter.omit({
          data: { a: 1, b: 2, c: 3 },
          omit: ['b']
        });
        expect(result.value).toEqual({ a: 1, c: 3 });
      });
    });

    describe('join', () => {
      it('should join array to string', () => {
        const result = utilityFormatter.join({ values: ['a', 'b', 'c'], separator: '-' });
        expect(result.value).toBe('a-b-c');
      });
    });

    describe('getAtIndex', () => {
      it('should get item at index', () => {
        const result = utilityFormatter.getAtIndex({ values: ['a', 'b', 'c'], index: 1 });
        expect(result.value).toBe('b');
      });
    });

    describe('first and last', () => {
      it('should get first item', () => {
        const result = utilityFormatter.first({ values: ['a', 'b', 'c'] });
        expect(result.value).toBe('a');
      });

      it('should get last item', () => {
        const result = utilityFormatter.last({ values: ['a', 'b', 'c'] });
        expect(result.value).toBe('c');
      });
    });

    describe('isEmpty', () => {
      it('should check if empty', () => {
        expect(utilityFormatter.isEmpty({ data: '' }).value).toBe(true);
        expect(utilityFormatter.isEmpty({ data: null }).value).toBe(true);
        expect(utilityFormatter.isEmpty({ data: [] }).value).toBe(true);
        expect(utilityFormatter.isEmpty({ data: {} }).value).toBe(true);
        expect(utilityFormatter.isEmpty({ data: 'hello' }).value).toBe(false);
        expect(utilityFormatter.isEmpty({ data: [1] }).value).toBe(false);
      });
    });

    describe('coalesce', () => {
      it('should return first non-null value', () => {
        const result = utilityFormatter.coalesce({ values: [null, undefined, 'first', 'second'] });
        expect(result.value).toBe('first');
      });
    });

    describe('defaultValue', () => {
      it('should return default if empty', () => {
        expect(utilityFormatter.defaultValue({ data: null, defaultVal: 'default' }).value).toBe('default');
        expect(utilityFormatter.defaultValue({ data: 'value', defaultVal: 'default' }).value).toBe('value');
      });
    });

    describe('template', () => {
      it('should render template', () => {
        const result = utilityFormatter.template({
          template: 'Hello {{ name }}, you are {{ age }} years old',
          data: { name: 'John', age: 30 }
        });
        expect(result.value).toBe('Hello John, you are 30 years old');
      });
    });

    describe('toJson and parseJson', () => {
      it('should convert to JSON', () => {
        const result = utilityFormatter.toJson({ data: { a: 1, b: 2 } });
        expect(result.value).toContain('"a": 1');
      });

      it('should parse JSON', () => {
        const result = utilityFormatter.parseJson({ input: '{"a": 1, "b": 2}' });
        expect(result.value).toEqual({ a: 1, b: 2 });
      });
    });

    describe('convertType', () => {
      it('should convert types', () => {
        expect(utilityFormatter.convertType({ data: 123, targetType: 'string' }).value).toBe('123');
        expect(utilityFormatter.convertType({ data: '123', targetType: 'number' }).value).toBe(123);
        expect(utilityFormatter.convertType({ data: 1, targetType: 'boolean' }).value).toBe(true);
        expect(utilityFormatter.convertType({ data: 'a', targetType: 'array' }).value).toEqual(['a']);
      });
    });
  });

  describe('ZapierFormatters unified execute', () => {
    it('should execute text formatter', async () => {
      const result = await formatters.execute('text', 'uppercase', { text: 'hello' });
      expect(result.success).toBe(true);
      expect(result.value).toBe('HELLO');
    });

    it('should execute number formatter', async () => {
      const result = await formatters.execute('number', 'formatCurrency', { value: 100 });
      expect(result.success).toBe(true);
    });

    it('should execute date formatter', async () => {
      const result = await formatters.execute('date', 'now', {});
      expect(result.success).toBe(true);
    });

    it('should execute utility formatter', async () => {
      const result = await formatters.execute('utility', 'uuid', {});
      expect(result.success).toBe(true);
    });

    it('should handle unknown operation', async () => {
      const result = await formatters.execute('text', 'unknownOperation', {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown operation');
    });
  });

  describe('Event emission', () => {
    it('should emit format events', () => {
      let eventReceived = false;
      formatters.on('format', () => {
        eventReceived = true;
      });

      formatters.text.uppercase({ text: 'hello' });
      expect(eventReceived).toBe(true);
    });

    it('should emit error events', () => {
      let errorReceived = false;
      formatters.on('error', () => {
        errorReceived = true;
      });

      // Cause an error by invalid regex
      formatters.text.replaceRegex({ text: 'test', pattern: '[invalid', flags: '' });
      expect(errorReceived).toBe(true);
    });
  });
});

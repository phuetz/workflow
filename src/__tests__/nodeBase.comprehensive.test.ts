/**
 * Comprehensive Unit Tests for NodeBase and Node Utilities
 * Tests WITHOUT mocks - using real implementations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  NodeBase,
  NodeHelpers,
  ExecutionContext,
  NodeUtils,
} from '../sdk/NodeBase';

describe('ExecutionContext', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = new ExecutionContext({
      inputData: [[{ json: { name: 'John', age: 30 } }]],
      nodeParameters: {
        testParam: 'value',
        numberParam: 42,
        continueOnFail: true,
      },
      credentials: {
        testApi: { apiKey: 'secret123' },
      },
      workflowMetadata: {
        id: 'wf_123',
        name: 'Test Workflow',
        active: true,
      },
      executionId: 'exec_123',
      mode: 'manual',
    });
  });

  describe('getInputData', () => {
    it('should return input data for default index', () => {
      const data = context.getInputData();
      expect(data).toHaveLength(1);
      expect(data[0].json.name).toBe('John');
    });

    it('should return input data for specific index', () => {
      const data = context.getInputData(0);
      expect(data).toHaveLength(1);
    });

    it('should return empty array for non-existent index', () => {
      const data = context.getInputData(5);
      expect(data).toEqual([]);
    });
  });

  describe('getNodeParameter', () => {
    it('should return parameter value', () => {
      const value = context.getNodeParameter('testParam', 0);
      expect(value).toBe('value');
    });

    it('should return number parameter', () => {
      const value = context.getNodeParameter('numberParam', 0);
      expect(value).toBe(42);
    });

    it('should return fallback for undefined parameter', () => {
      const value = context.getNodeParameter('nonExistent', 0, 'fallback');
      expect(value).toBe('fallback');
    });

    it('should throw error for missing required parameter', () => {
      expect(() => context.getNodeParameter('nonExistent', 0)).toThrow();
    });
  });

  describe('getCredentials', () => {
    it('should return credentials', async () => {
      const creds = await context.getCredentials('testApi');
      expect(creds.apiKey).toBe('secret123');
    });

    it('should throw error for missing credentials', async () => {
      await expect(context.getCredentials('missingApi')).rejects.toThrow();
    });
  });

  describe('getWorkflow', () => {
    it('should return workflow metadata', () => {
      const workflow = context.getWorkflow();
      expect(workflow.id).toBe('wf_123');
      expect(workflow.name).toBe('Test Workflow');
      expect(workflow.active).toBe(true);
    });
  });

  describe('getExecutionId', () => {
    it('should return execution ID', () => {
      const id = context.getExecutionId();
      expect(id).toBe('exec_123');
    });
  });

  describe('getMode', () => {
    it('should return execution mode', () => {
      const mode = context.getMode();
      expect(mode).toBe('manual');
    });
  });

  describe('getTimezone', () => {
    it('should return timezone', () => {
      const timezone = context.getTimezone();
      expect(typeof timezone).toBe('string');
    });
  });

  describe('getRestApiUrl', () => {
    it('should return API URL', () => {
      const url = context.getRestApiUrl();
      expect(typeof url).toBe('string');
      expect(url).toContain('http');
    });
  });

  describe('continueOnFail', () => {
    it('should return true when configured', () => {
      expect(context.continueOnFail()).toBe(true);
    });

    it('should return false by default', () => {
      const ctx = new ExecutionContext({
        inputData: [],
        nodeParameters: {},
      });
      expect(ctx.continueOnFail()).toBe(false);
    });
  });

  describe('getWorkflowStaticData', () => {
    it('should return static data object', () => {
      const staticData = context.getWorkflowStaticData('global');
      expect(typeof staticData).toBe('object');
    });
  });

  describe('helpers', () => {
    it('should have helpers property', () => {
      expect(context.helpers).toBeDefined();
    });
  });

  describe('auto-generated execution ID', () => {
    it('should generate execution ID if not provided', () => {
      const ctx = new ExecutionContext({
        inputData: [],
        nodeParameters: {},
      });
      const id = ctx.getExecutionId();
      expect(id).toMatch(/^exec_/);
    });
  });
});

describe('NodeHelpers', () => {
  let context: ExecutionContext;
  let helpers: NodeHelpers;

  beforeEach(() => {
    context = new ExecutionContext({
      inputData: [
        [
          {
            json: { name: 'Test', value: 100 },
            binary: {
              file: {
                data: Buffer.from('test data').toString('base64'),
                mimeType: 'text/plain',
                fileName: 'test.txt',
                fileSize: 9,
              },
            },
          },
        ],
      ],
      nodeParameters: {},
    });
    helpers = new NodeHelpers(context);
  });

  describe('returnJsonArray', () => {
    it('should convert object to execution data array', () => {
      const result = helpers.returnJsonArray({ name: 'Test' });
      expect(result).toHaveLength(1);
      expect(result[0].json.name).toBe('Test');
    });

    it('should convert array of objects', () => {
      const result = helpers.returnJsonArray([{ a: 1 }, { b: 2 }]);
      expect(result).toHaveLength(2);
      expect(result[0].json.a).toBe(1);
      expect(result[1].json.b).toBe(2);
    });
  });

  describe('normalizeItems', () => {
    it('should normalize items with json property', () => {
      const items = [
        { json: { name: 'Test' } },
        { json: { name: 'Test2' } },
      ];
      const normalized = helpers.normalizeItems(items);

      expect(normalized).toHaveLength(2);
      expect(normalized[0].json.name).toBe('Test');
    });

    it('should handle items without json property', () => {
      const items = [{ json: undefined as any }];
      const normalized = helpers.normalizeItems(items);

      expect(normalized[0].json).toEqual({});
    });
  });

  describe('constructExecutionMetaData', () => {
    it('should add paired item data', () => {
      const items = [{ json: { test: true } }];
      const result = helpers.constructExecutionMetaData(items);

      expect(result[0].pairedItem).toEqual({ item: 0 });
    });

    it('should use provided item data', () => {
      const items = [{ json: { test: true } }];
      const result = helpers.constructExecutionMetaData(items, {
        itemData: { item: 5 },
      });

      expect(result[0].pairedItem).toEqual({ item: 5 });
    });
  });

  describe('generateRandomString', () => {
    it('should generate string of specified length', () => {
      const result = helpers.generateRandomString(10);
      expect(result).toHaveLength(10);
    });

    it('should generate alphanumeric characters', () => {
      const result = helpers.generateRandomString(100);
      expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate unique strings', () => {
      const str1 = helpers.generateRandomString(20);
      const str2 = helpers.generateRandomString(20);
      expect(str1).not.toBe(str2);
    });
  });

  describe('hashValue', () => {
    it('should hash with default sha256', () => {
      const hash = helpers.hashValue('test');
      expect(hash).toHaveLength(64); // SHA256 produces 64 hex characters
    });

    it('should hash with md5', () => {
      const hash = helpers.hashValue('test', 'md5');
      expect(hash).toHaveLength(32); // MD5 produces 32 hex characters
    });

    it('should hash with sha1', () => {
      const hash = helpers.hashValue('test', 'sha1');
      expect(hash).toHaveLength(40); // SHA1 produces 40 hex characters
    });

    it('should hash with sha512', () => {
      const hash = helpers.hashValue('test', 'sha512');
      expect(hash).toHaveLength(128); // SHA512 produces 128 hex characters
    });

    it('should produce consistent hashes', () => {
      const hash1 = helpers.hashValue('test');
      const hash2 = helpers.hashValue('test');
      expect(hash1).toBe(hash2);
    });
  });

  describe('getBinaryDataBuffer', () => {
    it('should return buffer from binary data', async () => {
      const buffer = await helpers.getBinaryDataBuffer(0, 'file');
      expect(buffer.toString()).toBe('test data');
    });

    it('should throw error for missing binary property', async () => {
      await expect(helpers.getBinaryDataBuffer(0, 'missing')).rejects.toThrow();
    });
  });

  describe('prepareBinaryData', () => {
    it('should prepare binary data from buffer', async () => {
      const buffer = Buffer.from('test content');
      const result = await helpers.prepareBinaryData(buffer, 'test.txt', 'text/plain');

      expect(result.data).toBe(buffer.toString('base64'));
      expect(result.mimeType).toBe('text/plain');
      expect(result.fileName).toBe('test.txt');
      expect(result.fileSize).toBe(12);
    });

    it('should use default mime type', async () => {
      const buffer = Buffer.from('test');
      const result = await helpers.prepareBinaryData(buffer);

      expect(result.mimeType).toBe('application/octet-stream');
    });
  });

  describe('request methods', () => {
    it('should have request method', () => {
      expect(typeof helpers.request).toBe('function');
    });

    it('should have httpRequest method', () => {
      expect(typeof helpers.httpRequest).toBe('function');
    });

    it('should have httpRequestWithAuthentication method', () => {
      expect(typeof helpers.httpRequestWithAuthentication).toBe('function');
    });
  });
});

describe('NodeUtils', () => {
  describe('validateParameters', () => {
    it('should not throw for valid parameters', () => {
      const params = { name: 'John', age: 30 };
      expect(() =>
        NodeUtils.validateParameters(params, ['name', 'age'])
      ).not.toThrow();
    });

    it('should throw for missing required parameter', () => {
      const params = { name: 'John' };
      expect(() =>
        NodeUtils.validateParameters(params, ['name', 'age'])
      ).toThrow('Required parameter "age" is missing');
    });

    it('should throw for null parameter', () => {
      const params = { name: null };
      expect(() =>
        NodeUtils.validateParameters(params, ['name'])
      ).toThrow();
    });

    it('should throw for empty string parameter', () => {
      const params = { name: '' };
      expect(() =>
        NodeUtils.validateParameters(params, ['name'])
      ).toThrow();
    });
  });

  describe('getNestedValue', () => {
    it('should get top-level value', () => {
      const obj = { name: 'John' };
      expect(NodeUtils.getNestedValue(obj, 'name')).toBe('John');
    });

    it('should get nested value', () => {
      const obj = { user: { profile: { name: 'John' } } };
      expect(NodeUtils.getNestedValue(obj, 'user.profile.name')).toBe('John');
    });

    it('should return undefined for non-existent path', () => {
      const obj = { user: {} };
      expect(NodeUtils.getNestedValue(obj, 'user.profile.name')).toBeUndefined();
    });

    it('should handle arrays in path', () => {
      const obj = { users: [{ name: 'John' }] };
      expect(NodeUtils.getNestedValue(obj, 'users.0.name')).toBe('John');
    });
  });

  describe('setNestedValue', () => {
    it('should set top-level value', () => {
      const obj: any = {};
      NodeUtils.setNestedValue(obj, 'name', 'John');
      expect(obj.name).toBe('John');
    });

    it('should set nested value', () => {
      const obj: any = {};
      NodeUtils.setNestedValue(obj, 'user.profile.name', 'John');
      expect(obj.user.profile.name).toBe('John');
    });

    it('should create intermediate objects', () => {
      const obj: any = {};
      NodeUtils.setNestedValue(obj, 'a.b.c.d', 'value');
      expect(obj.a.b.c.d).toBe('value');
    });
  });

  describe('mergeData', () => {
    it('should merge two objects', () => {
      const result = NodeUtils.mergeData({ a: 1 }, { b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should merge multiple objects', () => {
      const result = NodeUtils.mergeData({ a: 1 }, { b: 2 }, { c: 3 });
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should override earlier values', () => {
      const result = NodeUtils.mergeData({ a: 1 }, { a: 2 });
      expect(result.a).toBe(2);
    });
  });

  describe('deepClone', () => {
    it('should clone object', () => {
      const original = { name: 'John', nested: { value: 42 } };
      const clone = NodeUtils.deepClone(original);

      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
    });

    it('should not affect original when modifying clone', () => {
      const original = { name: 'John', nested: { value: 42 } };
      const clone = NodeUtils.deepClone(original);

      clone.name = 'Jane';
      clone.nested.value = 100;

      expect(original.name).toBe('John');
      expect(original.nested.value).toBe(42);
    });

    it('should clone arrays', () => {
      const original = [1, 2, [3, 4]];
      const clone = NodeUtils.deepClone(original);

      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
    });
  });

  describe('formatError', () => {
    it('should format Error objects', () => {
      const error = new Error('Test error');
      expect(NodeUtils.formatError(error)).toBe('Test error');
    });

    it('should format string errors', () => {
      expect(NodeUtils.formatError('String error')).toBe('String error');
    });

    it('should format number errors', () => {
      expect(NodeUtils.formatError(404)).toBe('404');
    });

    it('should format object errors', () => {
      const result = NodeUtils.formatError({ code: 'ERR' });
      expect(typeof result).toBe('string');
    });
  });

  describe('isValidUrl', () => {
    it('should validate HTTP URLs', () => {
      expect(NodeUtils.isValidUrl('http://example.com')).toBe(true);
    });

    it('should validate HTTPS URLs', () => {
      expect(NodeUtils.isValidUrl('https://example.com')).toBe(true);
    });

    it('should validate URLs with paths', () => {
      expect(NodeUtils.isValidUrl('https://example.com/path/to/resource')).toBe(true);
    });

    it('should validate URLs with query strings', () => {
      expect(NodeUtils.isValidUrl('https://example.com?foo=bar')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(NodeUtils.isValidUrl('not a url')).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(NodeUtils.isValidUrl('')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should validate standard emails', () => {
      expect(NodeUtils.isValidEmail('test@example.com')).toBe(true);
    });

    it('should validate emails with dots', () => {
      expect(NodeUtils.isValidEmail('test.name@example.com')).toBe(true);
    });

    it('should validate emails with plus', () => {
      expect(NodeUtils.isValidEmail('test+tag@example.com')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(NodeUtils.isValidEmail('invalid')).toBe(false);
      expect(NodeUtils.isValidEmail('invalid@')).toBe(false);
      expect(NodeUtils.isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const result = NodeUtils.safeJsonParse('{"name":"John"}');
      expect(result).toEqual({ name: 'John' });
    });

    it('should return fallback for invalid JSON', () => {
      const result = NodeUtils.safeJsonParse('invalid json', { default: true });
      expect(result).toEqual({ default: true });
    });

    it('should return null by default for invalid JSON', () => {
      const result = NodeUtils.safeJsonParse('invalid json');
      expect(result).toBeNull();
    });
  });

  describe('safeJsonStringify', () => {
    it('should stringify objects', () => {
      const result = NodeUtils.safeJsonStringify({ name: 'John' });
      expect(result).toBe('{"name":"John"}');
    });

    it('should stringify with pretty format', () => {
      const result = NodeUtils.safeJsonStringify({ name: 'John' }, true);
      expect(result).toContain('\n');
    });

    it('should return empty object for circular references', () => {
      const obj: any = {};
      obj.self = obj;
      const result = NodeUtils.safeJsonStringify(obj);
      expect(result).toBe('{}');
    });
  });
});

describe('NodeBase abstract class', () => {
  it('should be defined', () => {
    expect(NodeBase).toBeDefined();
  });

  it('should have abstract methods', () => {
    // NodeBase is abstract, so we can't instantiate it directly
    // But we can verify it exists as a class
    expect(typeof NodeBase).toBe('function');
  });
});

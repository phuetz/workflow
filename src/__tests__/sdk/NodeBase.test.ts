/**
 * NodeBase and SDK Tests
 */

import { describe, it, expect } from 'vitest';
import { NodeBase, ExecutionContext, NodeUtils } from '../../sdk/NodeBase';
import { TestingUtils, test } from '../../sdk/TestingUtils';
import { ValidationUtils } from '../../sdk/ValidationUtils';
import { CredentialUtils } from '../../sdk/CredentialUtils';

describe('ExecutionContext', () => {
  it('should provide input data', () => {
    const context = new ExecutionContext({
      inputData: [[{ json: { test: 'value' } }]],
      nodeParameters: {},
    });

    const data = context.getInputData();

    expect(data).toHaveLength(1);
    expect(data[0].json.test).toBe('value');
  });

  it('should get node parameters', () => {
    const context = new ExecutionContext({
      inputData: [[]],
      nodeParameters: { operation: 'test' },
    });

    const param = context.getNodeParameter('operation', 0);

    expect(param).toBe('test');
  });

  it('should use fallback value for missing parameter', () => {
    const context = new ExecutionContext({
      inputData: [[]],
      nodeParameters: {},
    });

    const param = context.getNodeParameter('missing', 0, 'default');

    expect(param).toBe('default');
  });

  it('should throw for required missing parameter', () => {
    const context = new ExecutionContext({
      inputData: [[]],
      nodeParameters: {},
    });

    expect(() => context.getNodeParameter('missing', 0)).toThrow();
  });

  it('should evaluate simple expressions', () => {
    const context = new ExecutionContext({
      inputData: [[{ json: { name: 'John' } }]],
      nodeParameters: { text: '{{ $json.name }}' },
    });

    const result = context.getNodeParameter('text', 0);

    expect(result).toBe('John');
  });
});

describe('NodeUtils', () => {
  describe('Validation', () => {
    it('should validate required parameters', () => {
      const params = { name: 'test', value: 123 };
      const required = ['name', 'value'];

      expect(() => NodeUtils.validateParameters(params, required)).not.toThrow();
    });

    it('should throw for missing required parameters', () => {
      const params = { name: 'test' };
      const required = ['name', 'value'];

      expect(() => NodeUtils.validateParameters(params, required)).toThrow(/value/);
    });
  });

  describe('Nested Values', () => {
    it('should get nested value', () => {
      const obj = { user: { profile: { name: 'John' } } };
      const value = NodeUtils.getNestedValue(obj, 'user.profile.name');

      expect(value).toBe('John');
    });

    it('should set nested value', () => {
      const obj: any = {};
      NodeUtils.setNestedValue(obj, 'user.profile.name', 'John');

      expect(obj.user.profile.name).toBe('John');
    });
  });

  describe('Utilities', () => {
    it('should deep clone object', () => {
      const original = { a: 1, b: { c: 2 } };
      const clone = NodeUtils.deepClone(original);

      clone.b.c = 3;

      expect(original.b.c).toBe(2);
      expect(clone.b.c).toBe(3);
    });

    it('should validate URL', () => {
      expect(NodeUtils.isValidUrl('https://example.com')).toBe(true);
      expect(NodeUtils.isValidUrl('not-a-url')).toBe(false);
    });

    it('should validate email', () => {
      expect(NodeUtils.isValidEmail('test@example.com')).toBe(true);
      expect(NodeUtils.isValidEmail('invalid')).toBe(false);
    });

    it('should parse JSON safely', () => {
      expect(NodeUtils.safeJsonParse('{"test": 1}')).toEqual({ test: 1 });
      expect(NodeUtils.safeJsonParse('invalid', { default: true })).toEqual({ default: true });
    });
  });
});

describe('ValidationUtils', () => {
  describe('String Validation', () => {
    it('should validate required string', () => {
      const result = ValidationUtils.validateString('test', { required: true });
      expect(result.valid).toBe(true);
    });

    it('should fail for empty required string', () => {
      const result = ValidationUtils.validateString('', { required: true });
      expect(result.valid).toBe(false);
    });

    it('should validate string length', () => {
      const result = ValidationUtils.validateString('test', {
        minLength: 2,
        maxLength: 10,
      });
      expect(result.valid).toBe(true);
    });

    it('should fail for too short string', () => {
      const result = ValidationUtils.validateString('a', { minLength: 2 });
      expect(result.valid).toBe(false);
    });

    it('should validate pattern', () => {
      const result = ValidationUtils.validateString('test123', {
        pattern: /^[a-z0-9]+$/,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('Number Validation', () => {
    it('should validate number range', () => {
      const result = ValidationUtils.validateNumber(5, { min: 1, max: 10 });
      expect(result.valid).toBe(true);
    });

    it('should fail for out of range number', () => {
      const result = ValidationUtils.validateNumber(15, { min: 1, max: 10 });
      expect(result.valid).toBe(false);
    });

    it('should validate integer', () => {
      const result1 = ValidationUtils.validateNumber(5, { integer: true });
      const result2 = ValidationUtils.validateNumber(5.5, { integer: true });

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(false);
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email', () => {
      const result = ValidationUtils.validateEmail('test@example.com');
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid email', () => {
      const result = ValidationUtils.validateEmail('invalid-email');
      expect(result.valid).toBe(false);
    });
  });

  describe('URL Validation', () => {
    it('should validate HTTPS URL', () => {
      const result = ValidationUtils.validateURL('https://example.com');
      expect(result.valid).toBe(true);
    });

    it('should validate protocol', () => {
      const result = ValidationUtils.validateURL('https://example.com', {
        protocols: ['https'],
      });
      expect(result.valid).toBe(true);
    });

    it('should fail for wrong protocol', () => {
      const result = ValidationUtils.validateURL('http://example.com', {
        protocols: ['https'],
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('JSON Validation', () => {
    it('should validate valid JSON', () => {
      const result = ValidationUtils.validateJSON('{"test": 1}');
      expect(result.valid).toBe(true);
      expect(result.parsed).toEqual({ test: 1 });
    });

    it('should fail for invalid JSON', () => {
      const result = ValidationUtils.validateJSON('invalid');
      expect(result.valid).toBe(false);
    });

    it('should accept object', () => {
      const result = ValidationUtils.validateJSON({ test: 1 });
      expect(result.valid).toBe(true);
      expect(result.parsed).toEqual({ test: 1 });
    });
  });
});

describe('CredentialUtils', () => {
  describe('Authentication Headers', () => {
    it('should create basic auth header', () => {
      const header = CredentialUtils.createBasicAuthHeader('user', 'pass');
      expect(header).toMatch(/^Basic /);
    });

    it('should create bearer token header', () => {
      const header = CredentialUtils.createBearerAuthHeader('token123');
      expect(header).toBe('Bearer token123');
    });
  });

  describe('Credential Application', () => {
    it('should apply basic auth to request', () => {
      const credentials = { username: 'user', password: 'pass' };
      const request = { url: 'https://api.example.com', headers: {} };

      const result = CredentialUtils.applyCredentials(credentials, request, 'basic');

      expect(result.headers?.Authorization).toMatch(/^Basic /);
    });

    it('should apply bearer token to request', () => {
      const credentials = { token: 'token123' };
      const request = { url: 'https://api.example.com', headers: {} };

      const result = CredentialUtils.applyCredentials(credentials, request, 'bearer');

      expect(result.headers?.Authorization).toBe('Bearer token123');
    });

    it('should apply API key to request', () => {
      const credentials = { apiKey: 'key123', headerName: 'X-API-Key' };
      const request = { url: 'https://api.example.com', headers: {} };

      const result = CredentialUtils.applyCredentials(credentials, request, 'apiKey');

      expect(result.headers?.['X-API-Key']).toBe('key123');
    });
  });

  describe('Credential Validation', () => {
    it('should validate complete credentials', () => {
      const credentials = { apiKey: 'test', url: 'https://api.example.com' };
      const result = CredentialUtils.validateCredentials(credentials, ['apiKey', 'url']);

      expect(result.valid).toBe(true);
      expect(result.missingProperties).toHaveLength(0);
    });

    it('should detect missing credentials', () => {
      const credentials = { apiKey: 'test' };
      const result = CredentialUtils.validateCredentials(credentials, ['apiKey', 'url']);

      expect(result.valid).toBe(false);
      expect(result.missingProperties).toContain('url');
    });
  });

  describe('Credential Types', () => {
    it('should create OAuth2 credential', () => {
      const credential = CredentialUtils.createOAuth2Credential({
        name: 'testOAuth',
        displayName: 'Test OAuth',
        authUrl: 'https://auth.example.com',
        tokenUrl: 'https://token.example.com',
      });

      expect(credential.name).toBe('testOAuth');
      expect(credential.properties).toBeDefined();
    });

    it('should create API Key credential', () => {
      const credential = CredentialUtils.createApiKeyCredential({
        name: 'testApi',
        displayName: 'Test API',
      });

      expect(credential.name).toBe('testApi');
      expect(credential.properties).toBeDefined();
    });

    it('should create Basic Auth credential', () => {
      const credential = CredentialUtils.createBasicAuthCredential({
        name: 'testBasic',
        displayName: 'Test Basic',
      });

      expect(credential.name).toBe('testBasic');
      expect(credential.properties).toBeDefined();
    });
  });
});

describe('TestingUtils', () => {
  class TestNode extends NodeBase {
    description: any = {
      displayName: 'Test',
      name: 'test',
      group: ['transform'],
      version: 1,
      description: 'Test node',
      defaults: { name: 'Test' },
      inputs: ['main'],
      outputs: ['main'],
      properties: [],
    };

    async execute(this: any): Promise<any> {
      const items = this.getInputData();
      return [items.map((item: any) => ({
        json: {
          ...item.json,
          processed: true,
        },
      }))];
    }
  }

  it('should execute node with test data', async () => {
    const node = new TestNode();
    const testData = {
      description: 'Test execution',
      input: {
        main: [[{ json: { test: 'value' } }]],
      },
      output: {
        main: [[{ json: { test: 'value', processed: true } }]],
      },
    };

    const result = await TestingUtils.executeNode(node, testData);

    expect(result.success).toBe(true);
  });

  it('should use test builder', () => {
    const testCase = test('Test case')
      .withInput([{ test: 'value' }])
      .withOutput([{ result: 'value' }])
      .withParameters({ operation: 'test' })
      .build();

    expect(testCase.description).toBe('Test case');
    expect(testCase.input.main[0][0].json.test).toBe('value');
    expect(testCase.parameters?.operation).toBe('test');
  });

  it('should compare outputs', () => {
    const output1 = [[{ json: { test: 1 } }]];
    const output2 = [[{ json: { test: 1 } }]];
    const output3 = [[{ json: { test: 2 } }]];

    expect(TestingUtils.compareOutputs(output1, output2)).toBe(true);
    expect(TestingUtils.compareOutputs(output1, output3)).toBe(false);
  });
});

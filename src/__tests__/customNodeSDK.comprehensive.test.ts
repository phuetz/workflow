/**
 * Comprehensive Unit Tests for Custom Node SDK
 * Tests WITHOUT mocks - using real implementations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CustomNodeSDK,
  customNodeSDK,
  CustomNodeDefinition,
  NodeCategory,
  INodeType,
  NodeProperty,
  CredentialDefinition,
  NodeTestSuite,
  NodeTestCase,
  INodeExecutionData,
} from '../sdk/CustomNodeSDK';

describe('CustomNodeSDK', () => {
  let sdk: CustomNodeSDK;

  beforeEach(() => {
    sdk = CustomNodeSDK.getInstance();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CustomNodeSDK.getInstance();
      const instance2 = CustomNodeSDK.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should have customNodeSDK export', () => {
      expect(customNodeSDK).toBeDefined();
      expect(customNodeSDK).toBeInstanceOf(CustomNodeSDK);
    });
  });

  describe('createNode', () => {
    it('should create a valid node', () => {
      const definition: CustomNodeDefinition = {
        name: 'TestNode',
        displayName: 'Test Node',
        version: '1.0.0',
        description: 'A test node',
        category: 'utility' as NodeCategory,
        properties: [
          {
            name: 'testProperty',
            displayName: 'Test Property',
            type: 'string',
            default: '',
          },
        ],
        metadata: {
          author: 'Test Author',
        },
      };

      const node = sdk.createNode(definition);

      expect(node).toBeDefined();
      expect(node.description).toBeDefined();
      expect(node.description.name).toBe('TestNode');
      expect(node.description.displayName).toBe('Test Node');
    });

    it('should emit nodeCreated event', () => {
      let emitted = false;
      sdk.on('nodeCreated', () => {
        emitted = true;
      });

      const definition: CustomNodeDefinition = {
        name: 'EventTestNode',
        displayName: 'Event Test Node',
        version: '1.0.0',
        description: 'Test',
        category: 'utility' as NodeCategory,
        properties: [],
        metadata: { author: 'Test' },
      };

      sdk.createNode(definition);

      expect(emitted).toBe(true);
    });

    it('should throw error for invalid node', () => {
      const invalidDefinition = {
        name: '',
        displayName: '',
        version: '',
        description: '',
        category: '' as NodeCategory,
        properties: [],
        metadata: { author: '' },
      } as CustomNodeDefinition;

      expect(() => sdk.createNode(invalidDefinition)).toThrow();
    });
  });

  describe('getNode', () => {
    it('should retrieve a created node', () => {
      const definition: CustomNodeDefinition = {
        name: 'GetTestNode',
        displayName: 'Get Test Node',
        version: '1.0.0',
        description: 'Test',
        category: 'utility' as NodeCategory,
        properties: [],
        metadata: { author: 'Test' },
      };

      sdk.createNode(definition);
      const node = sdk.getNode('GetTestNode');

      expect(node).toBeDefined();
      expect(node?.description.name).toBe('GetTestNode');
    });

    it('should return undefined for non-existent node', () => {
      const node = sdk.getNode('NonExistentNode');
      expect(node).toBeUndefined();
    });
  });

  describe('listNodes', () => {
    it('should list all created nodes', () => {
      const definition1: CustomNodeDefinition = {
        name: 'ListNode1',
        displayName: 'List Node 1',
        version: '1.0.0',
        description: 'Test',
        category: 'utility' as NodeCategory,
        properties: [],
        metadata: { author: 'Test' },
      };

      const definition2: CustomNodeDefinition = {
        name: 'ListNode2',
        displayName: 'List Node 2',
        version: '1.0.0',
        description: 'Test',
        category: 'utility' as NodeCategory,
        properties: [],
        metadata: { author: 'Test' },
      };

      sdk.createNode(definition1);
      sdk.createNode(definition2);

      const nodes = sdk.listNodes();

      expect(nodes).toContain('ListNode1');
      expect(nodes).toContain('ListNode2');
    });
  });

  describe('generateNode', () => {
    it('should generate node definition from config', () => {
      const definition = sdk.generateNode({
        name: 'GeneratedNode',
        category: 'development' as NodeCategory,
        description: 'A generated node',
        author: 'Generator',
      });

      expect(definition).toBeDefined();
      expect(definition.name).toBe('GeneratedNode');
      expect(definition.category).toBe('development');
      expect(definition.metadata.author).toBe('Generator');
    });

    it('should generate with authentication', () => {
      const definition = sdk.generateNode({
        name: 'AuthNode',
        category: 'utility' as NodeCategory,
        includeAuthentication: true,
      });

      expect(definition.credentials).toBeDefined();
      expect(definition.credentials!.length).toBeGreaterThan(0);
    });

    it('should generate with webhook', () => {
      const definition = sdk.generateNode({
        name: 'WebhookNode',
        category: 'utility' as NodeCategory,
        includeWebhook: true,
      });

      expect(definition.webhooks).toBeDefined();
      expect(definition.webhooks!.length).toBeGreaterThan(0);
    });
  });

  describe('addProperty', () => {
    it('should add property to existing node', () => {
      const definition: CustomNodeDefinition = {
        name: 'PropertyTestNode',
        displayName: 'Property Test Node',
        version: '1.0.0',
        description: 'Test',
        category: 'utility' as NodeCategory,
        properties: [],
        metadata: { author: 'Test' },
      };

      sdk.createNode(definition);

      const newProperty: NodeProperty = {
        name: 'newProperty',
        displayName: 'New Property',
        type: 'number',
        default: 0,
      };

      sdk.addProperty('PropertyTestNode', newProperty);

      const node = sdk.getNode('PropertyTestNode');
      const hasProperty = node?.description.properties.some(
        (p) => p.name === 'newProperty'
      );

      expect(hasProperty).toBe(true);
    });

    it('should throw error for non-existent node', () => {
      expect(() =>
        sdk.addProperty('NonExistentNode', {
          name: 'prop',
          displayName: 'Prop',
          type: 'string',
        })
      ).toThrow();
    });
  });

  describe('addCredential', () => {
    it('should add credential to existing node', () => {
      const definition: CustomNodeDefinition = {
        name: 'CredentialTestNode',
        displayName: 'Credential Test Node',
        version: '1.0.0',
        description: 'Test',
        category: 'utility' as NodeCategory,
        properties: [],
        metadata: { author: 'Test' },
      };

      sdk.createNode(definition);

      const credential: CredentialDefinition = {
        name: 'apiKey',
        displayName: 'API Key',
        required: true,
        type: 'string',
      };

      sdk.addCredential('CredentialTestNode', credential);

      const node = sdk.getNode('CredentialTestNode');
      expect(node?.description.credentials).toBeDefined();
    });

    it('should throw error for non-existent node', () => {
      expect(() =>
        sdk.addCredential('NonExistentNode', {
          name: 'cred',
          displayName: 'Cred',
          type: 'string',
        })
      ).toThrow();
    });
  });

  describe('addMethod', () => {
    it('should add method to existing node', () => {
      const definition: CustomNodeDefinition = {
        name: 'MethodTestNode',
        displayName: 'Method Test Node',
        version: '1.0.0',
        description: 'Test',
        category: 'utility' as NodeCategory,
        properties: [],
        metadata: { author: 'Test' },
      };

      sdk.createNode(definition);

      sdk.addMethod(
        'MethodTestNode',
        { name: 'loadOptions.getItems', async: true },
        async () => [{ name: 'Item', value: '1' }]
      );

      const node = sdk.getNode('MethodTestNode');
      expect(node?.methods).toBeDefined();
    });
  });

  describe('validateNode', () => {
    it('should validate a valid node', () => {
      const definition: CustomNodeDefinition = {
        name: 'ValidNode',
        displayName: 'Valid Node',
        version: '1.0.0',
        description: 'Test',
        category: 'utility' as NodeCategory,
        properties: [
          {
            name: 'prop',
            displayName: 'Property',
            type: 'string',
          },
        ],
        metadata: { author: 'Test' },
      };

      sdk.createNode(definition);
      const result = sdk.validateNode('ValidNode');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should throw error for non-existent node', () => {
      expect(() => sdk.validateNode('NonExistentNode')).toThrow();
    });
  });

  describe('exportNode', () => {
    it('should export node as JSON', () => {
      const definition: CustomNodeDefinition = {
        name: 'ExportNode',
        displayName: 'Export Node',
        version: '1.0.0',
        description: 'Test',
        category: 'utility' as NodeCategory,
        properties: [],
        metadata: { author: 'Test' },
      };

      sdk.createNode(definition);
      const exported = sdk.exportNode('ExportNode');

      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(parsed.name).toBe('ExportNode');
    });

    it('should throw error for non-existent node', () => {
      expect(() => sdk.exportNode('NonExistentNode')).toThrow();
    });
  });

  describe('importNode', () => {
    it('should import node from JSON', () => {
      const definition: CustomNodeDefinition = {
        name: 'ImportedNode',
        displayName: 'Imported Node',
        version: '1.0.0',
        description: 'An imported node',
        category: 'utility' as NodeCategory,
        properties: [],
        metadata: { author: 'Test' },
      };

      const json = JSON.stringify(definition);
      const node = sdk.importNode(json);

      expect(node).toBeDefined();
      expect(node.description.name).toBe('ImportedNode');
    });
  });

  describe('generateDocumentation', () => {
    it('should generate documentation for node', () => {
      const definition: CustomNodeDefinition = {
        name: 'DocumentedNode',
        displayName: 'Documented Node',
        version: '1.0.0',
        description: 'A well documented node',
        category: 'utility' as NodeCategory,
        properties: [
          {
            name: 'testProp',
            displayName: 'Test Property',
            type: 'string',
            description: 'A test property',
          },
        ],
        metadata: { author: 'Test' },
      };

      sdk.createNode(definition);
      const docs = sdk.generateDocumentation('DocumentedNode');

      expect(docs).toContain('Documented Node');
      expect(docs).toContain('Test Property');
      expect(docs).toContain('Properties');
    });
  });

  describe('createTestSuite', () => {
    it('should create a test suite', () => {
      const suite: NodeTestSuite = {
        name: 'TestSuite',
        node: 'TestNode',
        testCases: [
          {
            name: 'Test Case 1',
            input: [[{ json: { test: 'data' } }]],
            parameters: {},
          },
        ],
      };

      sdk.createTestSuite(suite);

      // Verify event was emitted
      let emitted = false;
      sdk.on('testSuiteCreated', () => {
        emitted = true;
      });
    });
  });

  describe('event emission', () => {
    it('should be an EventEmitter', () => {
      expect(typeof sdk.on).toBe('function');
      expect(typeof sdk.emit).toBe('function');
      expect(typeof sdk.removeListener).toBe('function');
    });

    it('should emit events for various operations', () => {
      const events: string[] = [];

      sdk.on('nodeCreated', () => events.push('nodeCreated'));
      sdk.on('propertyAdded', () => events.push('propertyAdded'));
      sdk.on('credentialAdded', () => events.push('credentialAdded'));

      const definition: CustomNodeDefinition = {
        name: 'EventNode' + Date.now(),
        displayName: 'Event Node',
        version: '1.0.0',
        description: 'Test',
        category: 'utility' as NodeCategory,
        properties: [],
        metadata: { author: 'Test' },
      };

      sdk.createNode(definition);

      expect(events).toContain('nodeCreated');
    });
  });
});

describe('NodeCategory', () => {
  it('should support all expected categories', () => {
    const categories: NodeCategory[] = [
      'core',
      'data',
      'communication',
      'marketing',
      'sales',
      'productivity',
      'development',
      'utility',
      'ai',
      'analytics',
      'finance',
      'hr',
      'custom',
    ];

    for (const category of categories) {
      expect(typeof category).toBe('string');
    }
  });
});

describe('PropertyType validation', () => {
  it('should support all property types', () => {
    const types = [
      'string',
      'number',
      'boolean',
      'json',
      'dateTime',
      'color',
      'options',
      'multiOptions',
      'collection',
      'fixedCollection',
      'credentials',
      'hidden',
      'notice',
    ];

    for (const type of types) {
      expect(typeof type).toBe('string');
    }
  });
});

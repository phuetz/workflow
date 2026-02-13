/**
 * Tests for sdk/node-sdk modules
 * Tests NodeBuilder, NodeValidator, NodeRegistry, and NodeLifecycle
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NodeBuilder, NodeGenerator } from '../../sdk/node-sdk/NodeBuilder';
import { NodeValidator, PackageValidator } from '../../sdk/node-sdk/NodeValidator';
import { NodeRegistry } from '../../sdk/node-sdk/NodeRegistry';
import {
  TestRunner,
  NodeDebugger,
  NodePackager,
  NodePublisher,
  MarketplaceClient,
  DocumentationGenerator,
} from '../../sdk/node-sdk/NodeLifecycle';
import type {
  CustomNodeDefinition,
  INodeType,
  NodeProperty,
  NodeMethod,
  CredentialDefinition,
  NodePackage,
  NodeTestSuite,
  NodeTestCase,
  INodeExecutionData,
} from '../../sdk/node-sdk/types';

// =============================================================================
// NodeBuilder Tests
// =============================================================================

describe('NodeBuilder', () => {
  const createBasicDefinition = (): CustomNodeDefinition => ({
    name: 'TestNode',
    displayName: 'Test Node',
    version: '1.0.0',
    description: 'A test node',
    category: 'utility',
    properties: [],
    metadata: { author: 'Test Author' },
  });

  describe('NodeBuilder class', () => {
    it('should create a builder with definition', () => {
      const definition = createBasicDefinition();
      const builder = new NodeBuilder(definition);
      expect(builder.getDefinition()).toEqual(definition);
    });

    it('should add property to definition', () => {
      const definition = createBasicDefinition();
      const builder = new NodeBuilder(definition);
      const property: NodeProperty = {
        name: 'apiKey',
        displayName: 'API Key',
        type: 'string',
        required: true,
      };
      builder.addProperty(property);
      expect(builder.getDefinition().properties).toHaveLength(1);
      expect(builder.getDefinition().properties[0].name).toBe('apiKey');
    });

    it('should add method to definition', () => {
      const definition = createBasicDefinition();
      const builder = new NodeBuilder(definition);
      const method: NodeMethod = {
        name: 'loadOptions.getUsers',
        async: true,
        description: 'Load users for selection',
      };
      builder.addMethod(method, async () => []);
      expect(builder.getDefinition().methods).toHaveLength(1);
    });

    it('should add credential to definition', () => {
      const definition = createBasicDefinition();
      const builder = new NodeBuilder(definition);
      const credential: CredentialDefinition = {
        name: 'apiCredentials',
        displayName: 'API Credentials',
        required: true,
        type: 'testNodeApi',
      };
      builder.addCredential(credential);
      expect(builder.getDefinition().credentials).toHaveLength(1);
    });

    it('should build INodeType from definition', () => {
      const definition = createBasicDefinition();
      const builder = new NodeBuilder(definition);
      const node = builder.build();
      expect(node).toHaveProperty('description');
      expect(node).toHaveProperty('execute');
      expect(node.description.name).toBe('TestNode');
    });

    it('should build node with loadOptions methods', () => {
      const definition = createBasicDefinition();
      const builder = new NodeBuilder(definition);
      const method: NodeMethod = { name: 'loadOptions.getItems', async: true };
      builder.addMethod(method, async () => [{ name: 'Item 1', value: '1' }]);
      const node = builder.build();
      expect(node.methods?.loadOptions).toBeDefined();
    });

    it('should build node with credentialTest methods', () => {
      const definition = createBasicDefinition();
      const builder = new NodeBuilder(definition);
      const method: NodeMethod = { name: 'credentialTest.testApi', async: true };
      builder.addMethod(method, async () => ({ status: 'OK', message: 'Valid' }));
      const node = builder.build();
      expect(node.methods?.credentialTest).toBeDefined();
    });
  });

  describe('NodeGenerator class', () => {
    let generator: NodeGenerator;

    beforeEach(() => {
      generator = new NodeGenerator();
    });

    it('should generate basic node definition', () => {
      const definition = generator.generate({
        name: 'MyNode',
        category: 'utility',
      });
      expect(definition.name).toBe('MyNode');
      expect(definition.category).toBe('utility');
      expect(definition.version).toBe('1.0.0');
    });

    it('should generate node with authentication', () => {
      const definition = generator.generate({
        name: 'MyNode',
        category: 'utility',
        includeAuthentication: true,
      });
      expect(definition.credentials).toBeDefined();
      expect(definition.credentials).toHaveLength(1);
    });

    it('should generate node with webhook', () => {
      const definition = generator.generate({
        name: 'MyNode',
        category: 'utility',
        includeWebhook: true,
      });
      expect(definition.webhooks).toBeDefined();
      expect(definition.webhooks).toHaveLength(1);
    });

    it('should scaffold node definition', () => {
      const definition = generator.scaffold('SimpleNode', 'data');
      expect(definition.name).toBe('SimpleNode');
      expect(definition.category).toBe('data');
      expect(definition.credentials).toBeDefined();
    });

    it('should generate all package files', () => {
      const definition = createBasicDefinition();
      const files = generator.generateFiles(definition);
      expect(files).toHaveProperty('src/TestNode.node.ts');
      expect(files).toHaveProperty('test/TestNode.test.ts');
      expect(files).toHaveProperty('package.json');
      expect(files).toHaveProperty('README.md');
    });

    it('should generate valid package.json content', () => {
      const definition = createBasicDefinition();
      const files = generator.generateFiles(definition);
      const packageJson = JSON.parse(files['package.json']);
      expect(packageJson.name).toBe('n8n-nodes-testnode');
      expect(packageJson.n8n.nodes).toContain('dist/TestNode.node.js');
    });

    it('should generate proper node file content', () => {
      const definition = createBasicDefinition();
      const files = generator.generateFiles(definition);
      const nodeFile = files['src/TestNode.node.ts'];
      expect(nodeFile).toContain('export class TestNode');
      expect(nodeFile).toContain('INodeType');
    });
  });
});

// =============================================================================
// NodeValidator Tests
// =============================================================================

describe('NodeValidator', () => {
  describe('NodeValidator class', () => {
    let validator: NodeValidator;

    beforeEach(() => {
      validator = new NodeValidator();
    });

    it('should validate valid node', () => {
      const node: INodeType = {
        description: {
          name: 'ValidNode',
          displayName: 'Valid Node',
          version: '1.0.0',
          description: 'A valid node',
          category: 'utility',
          properties: [],
          metadata: { author: 'Test' },
        },
      };
      const result = validator.validate(node);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing name', () => {
      const node: INodeType = {
        description: {
          name: '',
          displayName: 'Valid Node',
          version: '1.0.0',
          description: '',
          category: 'utility',
          properties: [],
          metadata: { author: 'Test' },
        },
      };
      const result = validator.validate(node);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Node name is required');
    });

    it('should fail validation for missing display name', () => {
      const node: INodeType = {
        description: {
          name: 'ValidNode',
          displayName: '',
          version: '1.0.0',
          description: '',
          category: 'utility',
          properties: [],
          metadata: { author: 'Test' },
        },
      };
      const result = validator.validate(node);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Node display name is required');
    });

    it('should fail validation for missing version', () => {
      const node: INodeType = {
        description: {
          name: 'ValidNode',
          displayName: 'Valid Node',
          version: '',
          description: '',
          category: 'utility',
          properties: [],
          metadata: { author: 'Test' },
        },
      };
      const result = validator.validate(node);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Node version is required');
    });

    it('should fail validation for invalid property', () => {
      const node: INodeType = {
        description: {
          name: 'ValidNode',
          displayName: 'Valid Node',
          version: '1.0.0',
          description: '',
          category: 'utility',
          properties: [{ name: '', displayName: 'Field', type: 'string' }],
          metadata: { author: 'Test' },
        },
      };
      const result = validator.validate(node);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Property name is required');
    });

    it('should fail validation for property without type', () => {
      const node: INodeType = {
        description: {
          name: 'ValidNode',
          displayName: 'Valid Node',
          version: '1.0.0',
          description: '',
          category: 'utility',
          properties: [{ name: 'field', displayName: 'Field', type: '' as any }],
          metadata: { author: 'Test' },
        },
      };
      const result = validator.validate(node);
      expect(result.valid).toBe(false);
    });

    it('should warn for missing description', () => {
      const node: INodeType = {
        description: {
          name: 'ValidNode',
          displayName: 'Valid Node',
          version: '1.0.0',
          description: '',
          category: 'utility',
          properties: [],
          metadata: { author: 'Test' },
        },
      };
      const result = validator.validate(node);
      expect(result.warnings).toContain('Node description is recommended');
    });

    it('should validate credentials', () => {
      const node: INodeType = {
        description: {
          name: 'ValidNode',
          displayName: 'Valid Node',
          version: '1.0.0',
          description: '',
          category: 'utility',
          properties: [],
          credentials: [{ name: '', displayName: 'API Key', type: 'apiKey', required: true }],
          metadata: { author: 'Test' },
        },
      };
      const result = validator.validate(node);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Credential name is required');
    });
  });

  describe('PackageValidator class', () => {
    let validator: PackageValidator;

    beforeEach(() => {
      validator = new PackageValidator();
    });

    it('should validate valid package', () => {
      const pkg: NodePackage = {
        name: 'n8n-nodes-test',
        version: '1.0.0',
        main: 'dist/index.js',
        n8n: { nodes: ['dist/TestNode.node.js'] },
      };
      const result = validator.validate(pkg);
      expect(result.valid).toBe(true);
    });

    it('should fail for missing package name', () => {
      const pkg: NodePackage = {
        name: '',
        version: '1.0.0',
        main: 'dist/index.js',
        n8n: { nodes: ['dist/TestNode.node.js'] },
      };
      const result = validator.validate(pkg);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Package name is required');
    });

    it('should fail for missing n8n nodes', () => {
      const pkg: NodePackage = {
        name: 'n8n-nodes-test',
        version: '1.0.0',
        main: 'dist/index.js',
        n8n: { nodes: [] },
      };
      const result = validator.validate(pkg);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Package must define n8n nodes');
    });

    it('should warn for missing description', () => {
      const pkg: NodePackage = {
        name: 'n8n-nodes-test',
        version: '1.0.0',
        main: 'dist/index.js',
        n8n: { nodes: ['dist/TestNode.node.js'] },
      };
      const result = validator.validate(pkg);
      expect(result.warnings).toContain('Package description is recommended');
    });
  });
});

// =============================================================================
// NodeRegistry Tests
// =============================================================================

describe('NodeRegistry', () => {
  let registry: NodeRegistry;

  const createTestNode = (name: string): INodeType => ({
    description: {
      name,
      displayName: name,
      version: '1.0.0',
      description: '',
      category: 'utility',
      properties: [],
      metadata: { author: 'Test' },
    },
  });

  beforeEach(() => {
    registry = new NodeRegistry();
  });

  afterEach(() => {
    registry.clear();
  });

  it('should register and retrieve node', () => {
    const node = createTestNode('TestNode');
    registry.registerNode('TestNode', node);
    const retrieved = registry.getNode('TestNode');
    expect(retrieved).toBe(node);
  });

  it('should list all registered nodes', () => {
    registry.registerNode('Node1', createTestNode('Node1'));
    registry.registerNode('Node2', createTestNode('Node2'));
    const names = registry.listNodes();
    expect(names).toContain('Node1');
    expect(names).toContain('Node2');
  });

  it('should check if node exists', () => {
    registry.registerNode('TestNode', createTestNode('TestNode'));
    expect(registry.hasNode('TestNode')).toBe(true);
    expect(registry.hasNode('NonExistent')).toBe(false);
  });

  it('should remove node', () => {
    registry.registerNode('TestNode', createTestNode('TestNode'));
    const removed = registry.removeNode('TestNode');
    expect(removed).toBe(true);
    expect(registry.hasNode('TestNode')).toBe(false);
  });

  it('should emit event on node registration', () => {
    const callback = vi.fn();
    registry.on('nodeRegistered', callback);
    registry.registerNode('TestNode', createTestNode('TestNode'));
    expect(callback).toHaveBeenCalledWith({ name: 'TestNode' });
  });

  it('should emit event on node removal', () => {
    const callback = vi.fn();
    registry.registerNode('TestNode', createTestNode('TestNode'));
    registry.on('nodeRemoved', callback);
    registry.removeNode('TestNode');
    expect(callback).toHaveBeenCalledWith({ name: 'TestNode' });
  });

  it('should register package', () => {
    const pkg: NodePackage = {
      name: 'n8n-nodes-test',
      version: '1.0.0',
      main: 'dist/index.js',
      n8n: { nodes: [] },
    };
    registry.registerPackage('test-pkg', pkg);
    const retrieved = registry.getPackage('test-pkg');
    expect(retrieved).toBe(pkg);
  });

  it('should register and retrieve test suites', () => {
    const suite: NodeTestSuite = {
      name: 'TestSuite',
      node: 'TestNode',
      testCases: [],
    };
    registry.registerTestSuite(suite);
    const retrieved = registry.getTestSuite('TestSuite');
    expect(retrieved).toBe(suite);
  });

  it('should get test suites for a node', () => {
    const suite1: NodeTestSuite = { name: 'Suite1', node: 'Node1', testCases: [] };
    const suite2: NodeTestSuite = { name: 'Suite2', node: 'Node1', testCases: [] };
    const suite3: NodeTestSuite = { name: 'Suite3', node: 'Node2', testCases: [] };
    registry.registerTestSuite(suite1);
    registry.registerTestSuite(suite2);
    registry.registerTestSuite(suite3);
    const suites = registry.getTestSuites('Node1');
    expect(suites).toHaveLength(2);
  });

  it('should export node as JSON', () => {
    const node = createTestNode('TestNode');
    registry.registerNode('TestNode', node);
    const json = registry.exportNode('TestNode');
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe('TestNode');
  });

  it('should throw when exporting non-existent node', () => {
    expect(() => registry.exportNode('NonExistent')).toThrow('Node NonExistent not found');
  });

  it('should import node from JSON', () => {
    const definition: CustomNodeDefinition = {
      name: 'ImportedNode',
      displayName: 'Imported Node',
      version: '1.0.0',
      description: 'An imported node',
      category: 'utility',
      properties: [],
      metadata: { author: 'Test' },
    };
    const node = registry.importNode(definition);
    expect(node.description.name).toBe('ImportedNode');
    expect(registry.hasNode('ImportedNode')).toBe(true);
  });

  it('should import node from JSON string', () => {
    const json = JSON.stringify({
      name: 'ImportedNode',
      displayName: 'Imported Node',
      version: '1.0.0',
      description: 'An imported node',
      category: 'utility',
      properties: [],
      metadata: { author: 'Test' },
    });
    const node = registry.importNode(json);
    expect(node.description.name).toBe('ImportedNode');
  });

  it('should clear all registered data', () => {
    registry.registerNode('Node1', createTestNode('Node1'));
    registry.registerPackage('pkg1', { name: 'pkg1', version: '1.0.0', main: 'index.js' });
    registry.clear();
    expect(registry.listNodes()).toHaveLength(0);
    expect(registry.getPackage('pkg1')).toBeUndefined();
  });
});

// =============================================================================
// NodeLifecycle Tests
// =============================================================================

describe('NodeLifecycle', () => {
  const createTestNode = (): INodeType => ({
    description: {
      name: 'TestNode',
      displayName: 'Test Node',
      version: '1.0.0',
      description: 'A test node',
      category: 'utility',
      properties: [],
      metadata: { author: 'Test' },
    },
    async execute() {
      const items = this.getInputData();
      return [items];
    },
  });

  describe('TestRunner', () => {
    it('should run test suite', async () => {
      const node = createTestNode();
      const runner = new TestRunner(node);
      const suite: NodeTestSuite = {
        name: 'BasicTests',
        node: 'TestNode',
        testCases: [
          {
            name: 'Basic execution',
            input: [[{ json: { id: 1 } }]],
            parameters: {},
          },
        ],
      };
      const results = await runner.runSuites([suite]);
      expect(results.total).toBe(1);
      expect(results.passed).toBe(1);
    });

    it('should handle skipped tests', async () => {
      const node = createTestNode();
      const runner = new TestRunner(node);
      const suite: NodeTestSuite = {
        name: 'SkippedTests',
        node: 'TestNode',
        testCases: [
          {
            name: 'Skipped test',
            input: [],
            parameters: {},
            skip: true,
          },
        ],
      };
      const results = await runner.runSuites([suite]);
      expect(results.skipped).toBe(1);
    });

    it('should handle test with expected output', async () => {
      const node = createTestNode();
      const runner = new TestRunner(node);
      const suite: NodeTestSuite = {
        name: 'OutputTests',
        node: 'TestNode',
        testCases: [
          {
            name: 'Output match',
            input: [[{ json: { id: 1 } }]],
            parameters: {},
            expectedOutput: [[{ json: { id: 1 } }]],
          },
        ],
      };
      const results = await runner.runSuites([suite]);
      expect(results.passed).toBe(1);
    });

    it('should fail test with mismatched output', async () => {
      const node = createTestNode();
      const runner = new TestRunner(node);
      const suite: NodeTestSuite = {
        name: 'FailTests',
        node: 'TestNode',
        testCases: [
          {
            name: 'Output mismatch',
            input: [[{ json: { id: 1 } }]],
            parameters: {},
            expectedOutput: [[{ json: { id: 2 } }]],
          },
        ],
      };
      const results = await runner.runSuites([suite]);
      expect(results.failed).toBe(1);
    });
  });

  describe('NodeDebugger', () => {
    it('should debug node execution', async () => {
      const node = createTestNode();
      const debugger_ = new NodeDebugger();
      const input: INodeExecutionData[][] = [[{ json: { id: 1 } }]];
      const info = await debugger_.debug(node, input, {});
      expect(info).toHaveProperty('executionTime');
      expect(info).toHaveProperty('memoryUsage');
      expect(info).toHaveProperty('inputSize');
      expect(info).toHaveProperty('outputSize');
    });

    it('should capture errors during debugging', async () => {
      const failingNode: INodeType = {
        description: {
          name: 'FailNode',
          displayName: 'Fail Node',
          version: '1.0.0',
          description: '',
          category: 'utility',
          properties: [],
          metadata: { author: 'Test' },
        },
        async execute() {
          throw new Error('Execution failed');
        },
      };
      const debugger_ = new NodeDebugger();
      const info = await debugger_.debug(failingNode, [[]], {});
      expect(info.errors).toHaveLength(1);
    });
  });

  describe('DocumentationGenerator', () => {
    it('should generate documentation', () => {
      const node: INodeType = {
        description: {
          name: 'DocNode',
          displayName: 'Documentation Node',
          version: '1.0.0',
          description: 'A node for documentation',
          category: 'utility',
          properties: [
            { name: 'apiKey', displayName: 'API Key', type: 'string', description: 'Your API key' },
          ],
          metadata: { author: 'Test' },
        },
      };
      const generator = new DocumentationGenerator();
      const doc = generator.generate(node);
      expect(doc).toContain('# Documentation Node');
      expect(doc).toContain('## Properties');
      expect(doc).toContain('### API Key');
    });

    it('should include credentials in documentation', () => {
      const node: INodeType = {
        description: {
          name: 'CredNode',
          displayName: 'Credential Node',
          version: '1.0.0',
          description: 'A node with credentials',
          category: 'utility',
          properties: [],
          credentials: [
            { name: 'apiCred', displayName: 'API Credentials', type: 'apiKey', required: true },
          ],
          metadata: { author: 'Test' },
        },
      };
      const generator = new DocumentationGenerator();
      const doc = generator.generate(node);
      expect(doc).toContain('## Credentials');
      expect(doc).toContain('API Credentials');
    });
  });

  describe('NodePublisher', () => {
    it('should handle dry run publish', async () => {
      const node = createTestNode();
      const publisher = new NodePublisher();
      await expect(
        publisher.publish(node, { dryRun: true })
      ).resolves.not.toThrow();
    });
  });

  describe('MarketplaceClient', () => {
    it('should publish to marketplace', async () => {
      const node = createTestNode();
      const client = new MarketplaceClient();
      await expect(
        client.publish(node, { featured: false })
      ).resolves.not.toThrow();
    });
  });
});

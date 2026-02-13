/**
 * Node Builder Test Suite
 * Comprehensive tests for the Custom Node Builder system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NodeBuilder, NodeBuilderFactory } from '../nodebuilder/NodeBuilder';
import { NodeGenerator } from '../nodebuilder/NodeGenerator';
import { OpenAPIImporter } from '../nodebuilder/importers/OpenAPIImporter';
import { PostmanImporter } from '../nodebuilder/importers/PostmanImporter';
import { GraphQLImporter } from '../nodebuilder/importers/GraphQLImporter';
import { NodeWizard } from '../nodebuilder/NodeWizard';
import { MarketplacePublisher } from '../nodebuilder/MarketplacePublisher';
import { NodeTester } from '../nodebuilder/NodeTester';
import { DocumentationGenerator } from '../nodebuilder/DocumentationGenerator';
import {
  NodeCategory,
  AuthType,
  FieldType,
  HttpMethod,
  BodyType,
} from '../types/nodebuilder';

describe('NodeBuilder', () => {
  let builder: NodeBuilder;

  beforeEach(() => {
    builder = new NodeBuilder();
  });

  it('should create a new node builder with default config', () => {
    const summary = builder.getSummary();
    expect(summary.name).toBe('Untitled Node');
    expect(summary.category).toBe(NodeCategory.CUSTOM);
  });

  it('should set basic node information', () => {
    builder.setBasicInfo({
      name: 'test_node',
      displayName: 'Test Node',
      description: 'A test node',
      category: NodeCategory.ACTION,
    });

    const summary = builder.getSummary();
    expect(summary.name).toBe('Test Node');
    expect(summary.category).toBe(NodeCategory.ACTION);
  });

  it('should create API key authentication', () => {
    const auth = builder.createApiKeyAuth({
      name: 'Test API',
      description: 'Test API Key',
      headerName: 'X-API-Key',
    });

    expect(auth.type).toBe(AuthType.API_KEY);
    expect(auth.fields).toHaveLength(1);
    expect(auth.fields[0].headerName).toBe('X-API-Key');
  });

  it('should create OAuth2 authentication', () => {
    const auth = builder.createOAuth2Auth({
      name: 'Test OAuth',
      description: 'Test OAuth2',
      authUrl: 'https://auth.example.com',
      tokenUrl: 'https://token.example.com',
      scopes: ['read', 'write'],
    });

    expect(auth.type).toBe(AuthType.OAUTH2);
    expect(auth.fields.length).toBeGreaterThanOrEqual(2);
  });

  it('should add and manage parameters', () => {
    const param = builder.createParameter({
      name: 'testParam',
      displayName: 'Test Parameter',
      type: FieldType.STRING,
      required: true,
    });

    builder.addParameter(param);
    const summary = builder.getSummary();
    expect(summary.parameterCount).toBe(1);

    builder.removeParameter(param.id);
    const updatedSummary = builder.getSummary();
    expect(updatedSummary.parameterCount).toBe(0);
  });

  it('should add and manage operations', () => {
    const operation = builder.createHttpOperation({
      name: 'getUsers',
      displayName: 'Get Users',
      description: 'Retrieve users',
      method: HttpMethod.GET,
      endpoint: '/users',
    });

    builder.addOperation(operation);
    const summary = builder.getSummary();
    expect(summary.operationCount).toBe(1);

    builder.removeOperation(operation.id);
    const updatedSummary = builder.getSummary();
    expect(updatedSummary.operationCount).toBe(0);
  });

  it('should validate node configuration', () => {
    builder.setBasicInfo({
      name: 'test',
      displayName: 'Test',
      description: 'Test node',
      category: NodeCategory.ACTION,
    });

    const operation = builder.createHttpOperation({
      name: 'test',
      displayName: 'Test Op',
      description: 'Test',
      method: HttpMethod.GET,
      endpoint: '/test',
    });

    builder.addOperation(operation);

    const validation = builder.validate();
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should estimate complexity correctly', () => {
    builder.setBasicInfo({
      name: 'complex_node',
      displayName: 'Complex Node',
      description: 'A complex node',
      category: NodeCategory.ACTION,
    });

    // Add multiple operations
    for (let i = 0; i < 5; i++) {
      const op = builder.createHttpOperation({
        name: `op${i}`,
        displayName: `Operation ${i}`,
        description: `Op ${i}`,
        method: HttpMethod.GET,
        endpoint: `/test${i}`,
      });
      builder.addOperation(op);
    }

    // Add multiple parameters
    for (let i = 0; i < 3; i++) {
      const param = builder.createParameter({
        name: `param${i}`,
        displayName: `Param ${i}`,
        type: FieldType.STRING,
      });
      builder.addParameter(param);
    }

    const complexity = builder.estimateComplexity();
    expect(complexity).toBeGreaterThan(30);
  });

  it('should export and import configuration', () => {
    builder.setBasicInfo({
      name: 'export_test',
      displayName: 'Export Test',
      description: 'Test export',
      category: NodeCategory.ACTION,
    });

    const operation = builder.createHttpOperation({
      name: 'test',
      displayName: 'Test',
      description: 'Test',
      method: HttpMethod.GET,
      endpoint: '/test',
    });
    builder.addOperation(operation);

    const exported = builder.exportToJSON();
    expect(exported).toContain('export_test');

    const newBuilder = new NodeBuilder();
    newBuilder.importFromJSON(exported);

    const summary = newBuilder.getSummary();
    expect(summary.name).toBe('Export Test');
    expect(summary.operationCount).toBe(1);
  });
});

describe('NodeBuilderFactory', () => {
  it('should create REST API node', () => {
    const builder = NodeBuilderFactory.createRestApiNode({
      name: 'my_api',
      displayName: 'My API',
      description: 'My REST API',
      baseUrl: 'https://api.example.com',
      authType: 'apiKey',
    });

    const summary = builder.getSummary();
    expect(summary.name).toBe('My API');
    expect(summary.hasAuth).toBe(true);
  });

  it('should create webhook node', () => {
    const builder = NodeBuilderFactory.createWebhookNode({
      name: 'my_webhook',
      displayName: 'My Webhook',
      description: 'My webhook',
    });

    const summary = builder.getSummary();
    expect(summary.category).toBe(NodeCategory.TRIGGER);
  });

  it('should create database node', () => {
    const builder = NodeBuilderFactory.createDatabaseNode({
      name: 'my_db',
      displayName: 'My Database',
      description: 'My DB',
      databaseType: 'sql',
    });

    const summary = builder.getSummary();
    expect(summary.category).toBe(NodeCategory.DATABASE);
  });
});

describe('NodeGenerator', () => {
  it('should generate node files', async () => {
    const builder = new NodeBuilder();
    builder.setBasicInfo({
      name: 'test_node',
      displayName: 'Test Node',
      description: 'Test',
      category: NodeCategory.ACTION,
    });

    const operation = builder.createHttpOperation({
      name: 'test',
      displayName: 'Test',
      description: 'Test',
      method: HttpMethod.GET,
      endpoint: '/test',
    });
    builder.addOperation(operation);

    const config = builder.getConfig();
    const generator = new NodeGenerator(config);
    const result = await generator.generate();

    expect(result.success).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files.some((f) => f.type === 'config')).toBe(true);
    expect(result.files.some((f) => f.type === 'executor')).toBe(true);
  });

  it('should calculate quality score', async () => {
    const builder = new NodeBuilder();
    builder.setBasicInfo({
      name: 'quality_test',
      displayName: 'Quality Test',
      description: 'A node with good quality',
      category: NodeCategory.ACTION,
    });

    const operation = builder.createHttpOperation({
      name: 'test',
      displayName: 'Test Operation',
      description: 'A well-documented test operation',
      method: HttpMethod.GET,
      endpoint: '/test',
    });
    builder.addOperation(operation);

    const config = builder.getConfig();
    const generator = new NodeGenerator(config);
    const result = await generator.generate();

    expect(result.metadata.qualityScore).toBeGreaterThan(70);
  });
});

describe('OpenAPIImporter', () => {
  it('should import OpenAPI 3.0 spec', async () => {
    const spec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test API',
      },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            summary: 'Get users',
            responses: {
              '200': { description: 'Success' },
            },
          },
        },
      },
    };

    const importer = new OpenAPIImporter(spec);
    const builder = await importer.import();

    const summary = builder.getSummary();
    expect(summary.name).toBe('Test API');
    expect(summary.operationCount).toBeGreaterThan(0);
  });

  it('should extract authentication from OpenAPI spec', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Auth API', version: '1.0.0' },
      paths: {
        '/test': {
          get: {
            responses: { '200': { description: 'OK' } },
          },
        },
      },
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey' as const,
            in: 'header' as const,
            name: 'X-API-Key',
          },
        },
      },
    };

    const importer = new OpenAPIImporter(spec);
    const builder = await importer.import();

    const summary = builder.getSummary();
    expect(summary.hasAuth).toBe(true);
    expect(summary.authType).toBe(AuthType.API_KEY);
  });

  it('should get import statistics', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/test1': { get: { responses: {} } },
        '/test2': { post: { responses: {} } },
      },
    };

    const importer = new OpenAPIImporter(spec);
    const stats = importer.getStatistics();

    expect(stats.totalOperations).toBe(2);
    expect(stats.apiVersion).toBe('3.0.0');
  });
});

describe('PostmanImporter', () => {
  it('should import Postman collection', async () => {
    const collection = {
      info: {
        name: 'Test Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [
        {
          name: 'Get Users',
          request: {
            method: 'GET',
            url: 'https://api.example.com/users',
          },
        },
      ],
    };

    const importer = new PostmanImporter(collection);
    const builder = await importer.import();

    const summary = builder.getSummary();
    expect(summary.name).toBe('Test Collection');
    expect(summary.operationCount).toBeGreaterThan(0);
  });

  it('should get import statistics', () => {
    const collection = {
      info: {
        name: 'Stats Test',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [
        {
          name: 'Request 1',
          request: { method: 'GET', url: 'https://api.example.com/test1' },
        },
        {
          name: 'Folder',
          item: [
            {
              name: 'Request 2',
              request: { method: 'POST', url: 'https://api.example.com/test2' },
            },
          ],
        },
      ],
    };

    const importer = new PostmanImporter(collection);
    const stats = importer.getStatistics();

    expect(stats.totalRequests).toBe(2);
    expect(stats.totalFolders).toBe(1);
  });
});

describe('GraphQLImporter', () => {
  it('should import GraphQL schema', async () => {
    const schema = {
      schema: 'type Query { users: [User] }',
      queries: [
        {
          name: 'users',
          description: 'Get all users',
          arguments: [],
          returnType: '[User]',
        },
      ],
      mutations: [],
      subscriptions: [],
      types: [],
    };

    const importer = new GraphQLImporter(schema);
    const builder = await importer.import({
      name: 'GraphQL API',
      endpoint: 'https://api.example.com/graphql',
      authType: 'bearer',
    });

    const summary = builder.getSummary();
    expect(summary.name).toBe('GraphQL API');
    expect(summary.hasAuth).toBe(true);
  });

  it('should get import statistics', () => {
    const schema = {
      schema: '',
      queries: [{ name: 'test', arguments: [], returnType: 'String' }],
      mutations: [{ name: 'create', arguments: [], returnType: 'Boolean' }],
      subscriptions: [],
      types: [],
    };

    const importer = new GraphQLImporter(schema);
    const stats = importer.getStatistics();

    expect(stats.totalQueries).toBe(1);
    expect(stats.totalMutations).toBe(1);
  });
});

describe('NodeWizard', () => {
  let wizard: NodeWizard;

  beforeEach(() => {
    wizard = new NodeWizard();
  });

  it('should initialize with 7 steps', () => {
    expect(wizard.getTotalSteps()).toBe(7);
  });

  it('should navigate through steps', () => {
    expect(wizard.getCurrentStepIndex()).toBe(0);

    // Set basic info to make step valid
    wizard.updateData({
      basicInfo: {
        name: 'test',
        displayName: 'Test',
        description: 'Test node',
        category: NodeCategory.ACTION,
        icon: 'Box',
        color: 'bg-gray-500',
      },
    });

    const moved = wizard.nextStep();
    expect(moved).toBe(true);
    expect(wizard.getCurrentStepIndex()).toBe(1);

    wizard.previousStep();
    expect(wizard.getCurrentStepIndex()).toBe(0);
  });

  it('should validate steps', () => {
    wizard.updateData({
      basicInfo: {
        name: 'test',
        displayName: 'Test',
        description: 'Test node',
        category: NodeCategory.ACTION,
        icon: 'Box',
        color: 'bg-gray-500',
      },
    });

    expect(wizard.validateCurrentStep()).toBe(true);
  });

  it('should generate node from wizard data', async () => {
    wizard.updateData({
      basicInfo: {
        name: 'wizard_test',
        displayName: 'Wizard Test',
        description: 'Test',
        category: NodeCategory.ACTION,
        icon: 'Box',
        color: 'bg-blue-500',
      },
      operations: [
        {
          id: 'op1',
          name: 'test',
          displayName: 'Test',
          description: 'Test',
          httpConfig: {
            method: HttpMethod.GET,
            endpoint: '/test',
          },
          parameters: [],
          responseHandling: {
            successCondition: {
              type: 'status_code',
              statusCodes: [200],
            },
          },
        },
      ],
    });

    const builder = await wizard.generateNode();
    const summary = builder.getSummary();

    expect(summary.name).toBe('Wizard Test');
    expect(summary.operationCount).toBe(1);
  });

  it('should load quick start template', () => {
    wizard.loadTemplate('REST API');
    const data = wizard.getData();

    expect(data.basicInfo?.name).toBe('my_api');
    expect(data.authentication?.type).toBe(AuthType.API_KEY);
  });

  it('should calculate progress', () => {
    expect(wizard.getProgress()).toBe(0);

    wizard.updateData({
      basicInfo: {
        name: 'test',
        displayName: 'Test',
        description: 'Test',
        category: NodeCategory.ACTION,
        icon: 'Box',
        color: 'bg-gray-500',
      },
    });

    wizard.nextStep();
    const progress = wizard.getProgress();
    expect(progress).toBeGreaterThan(0);
  });
});

describe('MarketplacePublisher', () => {
  it('should validate node before publishing', async () => {
    const builder = new NodeBuilder();
    builder.setBasicInfo({
      name: 'publish_test',
      displayName: 'Publish Test',
      description: 'A comprehensive test node for publishing',
      category: NodeCategory.ACTION,
    });

    const operation = builder.createHttpOperation({
      name: 'test',
      displayName: 'Test Operation',
      description: 'A well-documented operation',
      method: HttpMethod.GET,
      endpoint: '/test',
    });
    builder.addOperation(operation);

    const config = builder.getConfig();
    const publisher = new MarketplacePublisher(config);

    const summary = await publisher.getValidationSummary();
    expect(summary.overallScore).toBeGreaterThan(0);
  });
});

describe('NodeTester', () => {
  it('should generate test cases from operations', () => {
    const builder = new NodeBuilder();
    builder.setBasicInfo({
      name: 'test',
      displayName: 'Test',
      description: 'Test',
      category: NodeCategory.ACTION,
    });

    const operation = builder.createHttpOperation({
      name: 'getUser',
      displayName: 'Get User',
      description: 'Get user by ID',
      method: HttpMethod.GET,
      endpoint: '/users/:id',
      parameters: [
        {
          id: 'param1',
          name: 'id',
          displayName: 'User ID',
          type: FieldType.STRING,
          required: true,
          description: 'User ID',
        },
      ],
    });
    builder.addOperation(operation);

    const config = builder.getConfig();
    const tester = new NodeTester(config);
    const testCases = tester.generateTestCasesFromOperations();

    expect(testCases.length).toBeGreaterThan(0);
    expect(testCases[0].operation).toBe('getUser');
  });

  it('should calculate test coverage', () => {
    const builder = new NodeBuilder();
    builder.setBasicInfo({
      name: 'test',
      displayName: 'Test',
      description: 'Test',
      category: NodeCategory.ACTION,
    });

    for (let i = 0; i < 3; i++) {
      const op = builder.createHttpOperation({
        name: `op${i}`,
        displayName: `Op ${i}`,
        description: `Op ${i}`,
        method: HttpMethod.GET,
        endpoint: `/test${i}`,
      });
      builder.addOperation(op);
    }

    const config = builder.getConfig();
    const tester = new NodeTester(config);
    tester.addTestCase({
      id: 'test1',
      name: 'Test 1',
      description: 'Test',
      operation: 'op0',
      input: {},
      assertions: [],
    });

    const coverage = tester.getTestCoverage();
    expect(coverage.totalOperations).toBe(3);
    expect(coverage.operationsCovered).toBe(1);
    expect(coverage.percentage).toBeCloseTo(33.33, 1);
  });
});

describe('DocumentationGenerator', () => {
  it('should generate comprehensive documentation', () => {
    const builder = new NodeBuilder();
    builder.setBasicInfo({
      name: 'doc_test',
      displayName: 'Documentation Test',
      description: 'A node for testing documentation generation',
      category: NodeCategory.ACTION,
    });

    builder.setAuthentication(
      builder.createApiKeyAuth({
        name: 'API Auth',
        description: 'API Key Authentication',
        headerName: 'X-API-Key',
      })
    );

    const operation = builder.createHttpOperation({
      name: 'getUsers',
      displayName: 'Get Users',
      description: 'Retrieve all users',
      method: HttpMethod.GET,
      endpoint: '/users',
    });
    builder.addOperation(operation);

    const config = builder.getConfig();
    const generator = new DocumentationGenerator(config);
    const docs = generator.generate();

    expect(docs).toContain('Documentation Test');
    expect(docs).toContain('API Key Authentication');
    expect(docs).toContain('Get Users');
    expect(docs).toContain('Installation');
  });

  it('should generate API documentation', () => {
    const builder = new NodeBuilder();
    builder.setBasicInfo({
      name: 'api_doc',
      displayName: 'API Doc',
      description: 'Test',
      category: NodeCategory.ACTION,
    });

    const operation = builder.createHttpOperation({
      name: 'test',
      displayName: 'Test',
      description: 'Test',
      method: HttpMethod.POST,
      endpoint: '/test',
    });
    builder.addOperation(operation);

    const config = builder.getConfig();
    const generator = new DocumentationGenerator(config);
    const apiDocs = generator.generateApiDocs();

    expect(apiDocs).toContain('API Documentation');
    expect(apiDocs).toContain('POST');
  });

  it('should generate changelog', () => {
    const builder = new NodeBuilder();
    builder.setBasicInfo({
      name: 'changelog_test',
      displayName: 'Changelog Test',
      description: 'Test',
      category: NodeCategory.ACTION,
    });

    // Add an operation to make config valid
    const operation = builder.createHttpOperation({
      name: 'test',
      displayName: 'Test',
      description: 'Test',
      method: HttpMethod.GET,
      endpoint: '/test',
    });
    builder.addOperation(operation);

    const config = builder.getConfig();
    const generator = new DocumentationGenerator(config);
    const changelog = generator.generateChangelog();

    expect(changelog).toContain('Changelog');
    expect(changelog).toContain(config.version);
  });
});

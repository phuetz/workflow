# Custom Node Builder Guide

Complete guide to building custom nodes without writing code using the Visual Node Builder.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Visual Node Builder](#visual-node-builder)
- [API Importers](#api-importers)
- [Node Wizard](#node-wizard)
- [Testing](#testing)
- [Publishing](#publishing)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The Custom Node Builder is a no-code solution for creating custom workflow nodes. Build professional integrations in under 10 minutes without writing a single line of code.

### Features

- **Visual Builder**: Drag & drop interface for node creation
- **API Importers**: Import from OpenAPI, Postman, GraphQL
- **7-Step Wizard**: Guided node creation process
- **Auto-Generation**: TypeScript code generation
- **Testing Suite**: Interactive testing tools
- **One-Click Publish**: Marketplace publishing
- **Documentation**: Auto-generated docs

### Success Metrics

- **Node Creation Time**: <10 minutes
- **Import Success Rate**: >95%
- **Code Quality Score**: >85
- **Zero Coding Required**: ✓

## Getting Started

### Installation

The Node Builder is included in the main application. No additional installation required.

### Quick Start

1. Open the workflow editor
2. Navigate to **Tools** > **Node Builder**
3. Choose a method:
   - Start from scratch
   - Import API specification
   - Use quick start template

### Your First Node (5 Minutes)

Let's create a simple weather API node:

```typescript
import { NodeBuilder, NodeBuilderFactory } from './nodebuilder/NodeBuilder';
import { HttpMethod, FieldType, NodeCategory } from './types/nodebuilder';

// Create a REST API node
const builder = NodeBuilderFactory.createRestApiNode({
  name: 'weather_api',
  displayName: 'Weather API',
  description: 'Get weather data',
  baseUrl: 'https://api.weather.com',
  authType: 'apiKey'
});

// Add an operation
builder.addOperation(builder.createHttpOperation({
  name: 'getCurrentWeather',
  displayName: 'Get Current Weather',
  description: 'Get current weather for a city',
  method: HttpMethod.GET,
  endpoint: '/current',
  parameters: [{
    id: 'city_param',
    name: 'city',
    displayName: 'City',
    type: FieldType.STRING,
    required: true,
    description: 'City name'
  }]
}));

// Generate the node
import { NodeGenerator } from './nodebuilder/NodeGenerator';

const config = builder.getConfig();
const generator = new NodeGenerator(config);
const result = await generator.generate();

console.log(`Generated ${result.files.length} files`);
console.log(`Quality score: ${result.metadata.qualityScore}`);
```

## Visual Node Builder

### NodeBuilder API

The `NodeBuilder` class is the core engine for creating nodes programmatically.

#### Basic Setup

```typescript
import { NodeBuilder } from './nodebuilder/NodeBuilder';
import { NodeCategory } from './types/nodebuilder';

const builder = new NodeBuilder();

// Set basic information
builder.setBasicInfo({
  name: 'my_custom_node',
  displayName: 'My Custom Node',
  description: 'A custom integration for my service',
  category: NodeCategory.ACTION,
  icon: 'Globe',
  color: 'bg-blue-500'
});
```

#### Authentication Templates

**API Key Authentication:**

```typescript
const apiKeyAuth = builder.createApiKeyAuth({
  name: 'My API',
  description: 'API Key for authentication',
  headerName: 'X-API-Key'
});

builder.setAuthentication(apiKeyAuth);
```

**Bearer Token:**

```typescript
const bearerAuth = builder.createBearerAuth({
  name: 'My API',
  description: 'Bearer token authentication'
});

builder.setAuthentication(bearerAuth);
```

**OAuth2:**

```typescript
const oauth2Auth = builder.createOAuth2Auth({
  name: 'My API',
  description: 'OAuth2 authentication',
  authUrl: 'https://auth.example.com/oauth/authorize',
  tokenUrl: 'https://auth.example.com/oauth/token',
  scopes: ['read', 'write']
});

builder.setAuthentication(oauth2Auth);
```

#### Parameters

```typescript
import { FieldType } from './types/nodebuilder';

// String parameter
const stringParam = builder.createParameter({
  name: 'message',
  displayName: 'Message',
  type: FieldType.STRING,
  required: true,
  description: 'Message to send',
  placeholder: 'Enter message...'
});

builder.addParameter(stringParam);

// Number parameter
const numberParam = builder.createParameter({
  name: 'count',
  displayName: 'Count',
  type: FieldType.NUMBER,
  required: false,
  description: 'Number of items',
  default: 10
});

builder.addParameter(numberParam);

// Select parameter
const selectParam = builder.createParameter({
  name: 'priority',
  displayName: 'Priority',
  type: FieldType.SELECT,
  required: true,
  description: 'Priority level',
  options: [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' }
  ]
});

builder.addParameter(selectParam);
```

#### Operations

```typescript
import { HttpMethod, BodyType } from './types/nodebuilder';

// GET operation
const getOperation = builder.createHttpOperation({
  name: 'getItem',
  displayName: 'Get Item',
  description: 'Retrieve an item by ID',
  method: HttpMethod.GET,
  endpoint: '/items/{id}',
  parameters: [
    {
      id: 'id_param',
      name: 'id',
      displayName: 'Item ID',
      type: FieldType.STRING,
      required: true,
      description: 'The item ID to retrieve'
    }
  ]
});

builder.addOperation(getOperation);

// POST operation with body
const postOperation = builder.createHttpOperation({
  name: 'createItem',
  displayName: 'Create Item',
  description: 'Create a new item',
  method: HttpMethod.POST,
  endpoint: '/items',
  bodyType: BodyType.JSON,
  parameters: [
    {
      id: 'name_param',
      name: 'name',
      displayName: 'Item Name',
      type: FieldType.STRING,
      required: true,
      description: 'Name of the item'
    },
    {
      id: 'data_param',
      name: 'data',
      displayName: 'Item Data',
      type: FieldType.JSON,
      required: false,
      description: 'Additional item data'
    }
  ]
});

builder.addOperation(postOperation);
```

## API Importers

### OpenAPI Importer

Import nodes from OpenAPI 3.0/3.1 specifications:

```typescript
import { OpenAPIImporter } from './nodebuilder/importers/OpenAPIImporter';

// From JSON
const openAPISpec = {
  openapi: '3.0.0',
  info: {
    title: 'My API',
    version: '1.0.0',
    description: 'My awesome API'
  },
  servers: [
    { url: 'https://api.example.com' }
  ],
  paths: {
    '/users': {
      get: {
        operationId: 'getUsers',
        summary: 'Get all users',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': {
            description: 'Success'
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key'
      }
    }
  }
};

const importer = new OpenAPIImporter(openAPISpec);
const builder = await importer.import();

// Get statistics
const stats = importer.getStatistics();
console.log(`Imported ${stats.totalOperations} operations`);
console.log(`Found ${stats.totalParameters} parameters`);
console.log(`Authentication: ${stats.authType}`);
```

**Import from URL:**

```typescript
// Fetch OpenAPI spec from URL
const response = await fetch('https://api.example.com/openapi.json');
const spec = await response.json();

const importer = new OpenAPIImporter(spec);
const builder = await importer.import();
```

### Postman Importer

Import from Postman Collection v2.1:

```typescript
import { PostmanImporter } from './nodebuilder/importers/PostmanImporter';

const postmanCollection = {
  info: {
    name: 'My API Collection',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: [
    {
      name: 'Get Users',
      request: {
        method: 'GET',
        url: 'https://api.example.com/users',
        header: [
          {
            key: 'X-API-Key',
            value: '{{apiKey}}'
          }
        ]
      }
    }
  ],
  auth: {
    type: 'apikey',
    apikey: [
      { key: 'key', value: 'X-API-Key' },
      { key: 'value', value: '{{apiKey}}' }
    ]
  }
};

const importer = new PostmanImporter(postmanCollection);
const builder = await importer.import();

const stats = importer.getStatistics();
console.log(`Imported ${stats.totalRequests} requests`);
console.log(`Found ${stats.totalFolders} folders`);
```

### GraphQL Importer

Import from GraphQL schema:

```typescript
import { GraphQLImporter } from './nodebuilder/importers/GraphQLImporter';

const graphqlSchema = {
  schema: `
    type Query {
      user(id: ID!): User
      users(limit: Int): [User]
    }

    type Mutation {
      createUser(name: String!, email: String!): User
    }

    type User {
      id: ID!
      name: String!
      email: String!
    }
  `,
  queries: [
    {
      name: 'user',
      arguments: [
        { name: 'id', type: 'ID!', required: true }
      ],
      returnType: 'User'
    },
    {
      name: 'users',
      arguments: [
        { name: 'limit', type: 'Int', required: false }
      ],
      returnType: '[User]'
    }
  ],
  mutations: [
    {
      name: 'createUser',
      arguments: [
        { name: 'name', type: 'String!', required: true },
        { name: 'email', type: 'String!', required: true }
      ],
      returnType: 'User'
    }
  ]
};

const importer = new GraphQLImporter(graphqlSchema);
const builder = await importer.import({
  name: 'My GraphQL API',
  endpoint: 'https://api.example.com/graphql',
  authType: 'bearer'
});

const stats = importer.getStatistics();
console.log(`Imported ${stats.totalQueries} queries`);
console.log(`Imported ${stats.totalMutations} mutations`);
```

## Node Wizard

The 7-step wizard guides you through node creation:

```typescript
import { NodeWizard } from './nodebuilder/NodeWizard';
import { NodeCategory, AuthType, HttpMethod, FieldType } from './types/nodebuilder';

const wizard = new NodeWizard();

// Step 1: Basic Information
wizard.updateData({
  basicInfo: {
    name: 'my_node',
    displayName: 'My Node',
    description: 'My custom node',
    category: NodeCategory.ACTION,
    icon: 'Globe',
    color: 'bg-blue-500'
  }
});

wizard.nextStep();

// Step 2: Authentication (optional)
wizard.updateData({
  authentication: {
    type: AuthType.API_KEY,
    name: 'API Key',
    description: 'API Key authentication',
    fields: [{
      name: 'apiKey',
      displayName: 'API Key',
      type: FieldType.PASSWORD,
      required: true,
      description: 'Your API key',
      headerName: 'X-API-Key'
    }]
  }
});

wizard.nextStep();

// Step 3: Operations
wizard.updateData({
  operations: [{
    id: 'op1',
    name: 'getData',
    displayName: 'Get Data',
    description: 'Retrieve data',
    httpConfig: {
      method: HttpMethod.GET,
      endpoint: '/data'
    },
    parameters: [],
    responseHandling: {
      successCondition: {
        type: 'status_code',
        statusCodes: [200]
      }
    }
  }]
});

// Continue through remaining steps...
wizard.nextStep();

// Generate the node
if (wizard.isComplete()) {
  const builder = await wizard.generateNode();
  console.log('Node generated successfully!');
}

// Check progress
console.log(`Progress: ${wizard.getProgress()}%`);
```

### Quick Start Templates

```typescript
// Load a template
wizard.loadTemplate('REST API');

// Available templates:
// - 'REST API': REST API integration
// - 'Webhook': Webhook trigger
// - 'Database': Database integration
```

## Testing

### Node Tester

Test your nodes before publishing:

```typescript
import { NodeTester } from './nodebuilder/NodeTester';

const config = builder.getConfig();
const tester = new NodeTester(config);

// Auto-generate test cases
const testCases = tester.generateTestCasesFromOperations();
testCases.forEach(tc => tester.addTestCase(tc));

// Or add custom test cases
tester.addTestCase({
  id: 'test1',
  name: 'Test Get User',
  description: 'Test retrieving a user',
  operation: 'getUser',
  input: {
    userId: '123'
  },
  assertions: [
    {
      type: 'exists',
      path: 'data.user',
      message: 'User should exist in response'
    },
    {
      type: 'equals',
      path: 'data.user.id',
      expected: '123',
      message: 'User ID should match'
    }
  ]
});

// Run tests
const results = await tester.runTests();
console.log(`Passed: ${results.passed}/${results.totalTests}`);
console.log(`Success rate: ${(results.passed / results.totalTests * 100).toFixed(2)}%`);

// Generate test report
const report = await tester.generateTestReport(results);
console.log(report);

// Check coverage
const coverage = tester.getTestCoverage();
console.log(`Coverage: ${coverage.percentage.toFixed(2)}%`);
```

## Publishing

### Marketplace Publisher

Publish your node to the marketplace:

```typescript
import { MarketplacePublisher } from './nodebuilder/MarketplacePublisher';

const config = builder.getConfig();
const publisher = new MarketplacePublisher(config);

// Validate before publishing
const summary = await publisher.getValidationSummary();
console.log(`Overall score: ${summary.overallScore}/100`);
console.log(`Ready to publish: ${summary.readyToPublish}`);

if (summary.readyToPublish) {
  // Publish to marketplace
  const result = await publisher.publish({
    nodeId: config.id,
    version: '1.0.0',
    changelog: 'Initial release',
    tags: ['api', 'integration'],
    category: 'action',
    pricing: {
      type: 'free'
    },
    visibility: 'public',
    license: 'MIT'
  });

  if (result.success) {
    console.log(`Published! URL: ${result.url}`);
  } else {
    console.error('Errors:', result.errors);
  }
} else {
  console.log('Validation issues:');
  console.log(`- Critical issues: ${summary.criticalIssues}`);
  console.log(`- Total issues: ${summary.totalIssues}`);
}
```

## Examples

### Example 1: Slack Integration

```typescript
const slackBuilder = NodeBuilderFactory.createRestApiNode({
  name: 'custom_slack',
  displayName: 'Custom Slack',
  description: 'Send messages to Slack',
  baseUrl: 'https://slack.com/api',
  authType: 'bearer'
});

slackBuilder.addOperation(slackBuilder.createHttpOperation({
  name: 'postMessage',
  displayName: 'Post Message',
  description: 'Send a message to a Slack channel',
  method: HttpMethod.POST,
  endpoint: '/chat.postMessage',
  bodyType: BodyType.JSON,
  parameters: [
    {
      id: 'channel',
      name: 'channel',
      displayName: 'Channel',
      type: FieldType.STRING,
      required: true,
      description: 'Channel ID or name'
    },
    {
      id: 'text',
      name: 'text',
      displayName: 'Message Text',
      type: FieldType.TEXT_AREA,
      required: true,
      description: 'Message content'
    }
  ]
}));
```

### Example 2: Database Integration

```typescript
const dbBuilder = NodeBuilderFactory.createDatabaseNode({
  name: 'custom_db',
  displayName: 'Custom Database',
  description: 'Custom database integration',
  databaseType: 'sql'
});

dbBuilder.addOperation(dbBuilder.createHttpOperation({
  name: 'executeQuery',
  displayName: 'Execute Query',
  description: 'Run a SQL query',
  method: HttpMethod.POST,
  endpoint: '/query',
  parameters: [
    {
      id: 'query',
      name: 'query',
      displayName: 'SQL Query',
      type: FieldType.TEXT_AREA,
      required: true,
      description: 'SQL query to execute'
    }
  ]
}));
```

## Best Practices

### 1. Clear Naming

- Use descriptive names for nodes and operations
- Follow naming conventions: `snake_case` for IDs, `Title Case` for display names

### 2. Comprehensive Descriptions

- Provide detailed descriptions for all parameters
- Include usage examples in documentation
- Explain authentication requirements clearly

### 3. Error Handling

- Define expected error responses
- Add validation to parameters
- Handle edge cases

### 4. Testing

- Test all operations before publishing
- Achieve >80% test coverage
- Include edge case tests

### 5. Documentation

- Enable documentation generation
- Include examples for common use cases
- Keep changelog updated

### 6. Security

- Never hardcode credentials
- Use secure authentication methods
- Validate all user inputs

## Troubleshooting

### Common Issues

**Issue: Import fails with OpenAPI spec**

```
Solution: Ensure your spec is valid OpenAPI 3.0/3.1 format
- Validate at https://editor.swagger.io
- Check all required fields are present
```

**Issue: Generated code doesn't compile**

```
Solution: Verify parameter types and naming
- Avoid reserved keywords
- Use valid TypeScript identifiers
```

**Issue: Tests failing**

```
Solution: Check test assertions
- Verify expected output format
- Ensure mock data is correct
- Check operation endpoints
```

**Issue: Low quality score**

```
Solution: Improve documentation
- Add parameter descriptions
- Include usage examples
- Complete all metadata fields
```

## API Reference

### NodeBuilder

- `setBasicInfo(info)`: Set node basic information
- `setAuthentication(auth)`: Configure authentication
- `addParameter(param)`: Add a parameter
- `addOperation(operation)`: Add an operation
- `validate()`: Validate configuration
- `getConfig()`: Get node configuration
- `exportToJSON()`: Export as JSON

### NodeGenerator

- `generate()`: Generate all files
- Methods generate config, executor, types, tests, and docs

### Importers

- `OpenAPIImporter.import()`: Import from OpenAPI
- `PostmanImporter.import()`: Import from Postman
- `GraphQLImporter.import()`: Import from GraphQL

### NodeWizard

- `nextStep()`: Move to next step
- `previousStep()`: Move to previous step
- `updateData(data)`: Update wizard data
- `generateNode()`: Generate node from wizard

### MarketplacePublisher

- `publish(config)`: Publish to marketplace
- `getValidationSummary()`: Get validation summary
- `update(id, config)`: Update published node

## Resources

- **Documentation**: Full API documentation
- **Examples**: /examples directory
- **Community**: Community forum
- **Support**: support@workflow.com

---

*Version 1.0.0 - Generated ${new Date().toISOString().split('T')[0]}*

# Workflow Automation Platform - SDK Guide

Complete guide for creating custom workflow nodes using the Workflow SDK.

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Creating Your First Node](#creating-your-first-node)
6. [Node Properties](#node-properties)
7. [Credentials](#credentials)
8. [Testing](#testing)
9. [Advanced Features](#advanced-features)
10. [Best Practices](#best-practices)
11. [API Reference](#api-reference)

## Introduction

The Workflow SDK allows you to create custom nodes that integrate seamlessly with the workflow automation platform. Custom nodes can:

- Connect to any API or service
- Transform and process data
- Trigger workflows based on events
- Implement custom business logic

## Installation

### Prerequisites

- Node.js 18+ and npm
- TypeScript 5.0+
- Basic understanding of TypeScript/JavaScript

### Create a New Plugin

Use the CLI tool to scaffold a new plugin:

```bash
npx create-workflow-node my-awesome-plugin
```

Follow the interactive prompts to configure your plugin.

### Manual Installation

1. Install the SDK:

```bash
npm install @workflow/sdk
```

2. Create your plugin structure:

```
my-plugin/
├── src/
│   ├── nodes/
│   │   └── MyNode.ts
│   ├── credentials/
│   │   └── MyCredential.ts
│   └── index.ts
├── package.json
├── workflow.json
└── tsconfig.json
```

## Quick Start

### 1. Create a Simple Node

```typescript
import {
  INodeType,
  INodeTypeDescription,
  INodeExecutionData,
  IExecuteFunctions,
} from '@workflow/sdk';

export class MySimpleNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Simple Node',
    name: 'mySimpleNode',
    group: ['transform'],
    version: 1,
    description: 'A simple example node',
    defaults: {
      name: 'My Simple Node',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Text',
        name: 'text',
        type: 'string',
        default: '',
        required: true,
        description: 'The text to process',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const text = this.getNodeParameter('text', i) as string;

      returnData.push({
        json: {
          processedText: text.toUpperCase(),
          originalText: text,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return [returnData];
  }
}
```

### 2. Build and Test

```bash
npm run build
npm test
```

### 3. Install in Workflow Platform

```bash
npx workflow-cli plugin install ./my-plugin
```

## Core Concepts

### Node Types

Nodes are classified by their function:

- **Trigger Nodes**: Start workflow execution (inputs: 0, outputs: 1+)
- **Action Nodes**: Perform operations (inputs: 1+, outputs: 1+)
- **Transform Nodes**: Modify data (inputs: 1, outputs: 1)

### Execution Context

The `IExecuteFunctions` interface provides methods to:

- Access input data
- Read node parameters
- Make HTTP requests
- Handle credentials
- Work with binary data

### Data Flow

Data flows through nodes as `INodeExecutionData` arrays:

```typescript
interface INodeExecutionData {
  json: Record<string, any>;      // JSON data
  binary?: Record<string, IBinaryData>; // Binary data
  pairedItem?: IPairedItemData;   // Item tracking
  error?: Error;                  // Error information
}
```

## Creating Your First Node

### Step 1: Define Node Description

```typescript
description: INodeTypeDescription = {
  displayName: 'My API Client',
  name: 'myApiClient',
  group: ['communication'],
  version: 1,
  description: 'Interact with My API',
  defaults: {
    name: 'My API Client',
    color: '#00FF00',
  },
  inputs: ['main'],
  outputs: ['main'],
  credentials: [
    {
      name: 'myApiCredential',
      required: true,
    },
  ],
  properties: [
    // ... node parameters
  ],
};
```

### Step 2: Implement Execute Method

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const returnData: INodeExecutionData[] = [];

  // Get credentials
  const credentials = await this.getCredentials('myApiCredential');

  for (let i = 0; i < items.length; i++) {
    try {
      // Get parameters
      const operation = this.getNodeParameter('operation', i) as string;
      const resourceId = this.getNodeParameter('resourceId', i) as string;

      // Make API request
      const response = await this.helpers.requestWithAuthentication(
        'myApiCredential',
        {
          method: 'GET',
          url: `https://api.example.com/resources/${resourceId}`,
          json: true,
        }
      );

      returnData.push({
        json: response,
      });
    } catch (error) {
      if (this.continueOnFail()) {
        returnData.push({
          json: { error: error.message },
          error,
        });
        continue;
      }
      throw error;
    }
  }

  return [returnData];
}
```

## Node Properties

### Property Types

#### String

```typescript
{
  displayName: 'API Endpoint',
  name: 'endpoint',
  type: 'string',
  default: '',
  required: true,
  placeholder: '/api/v1/users',
  description: 'The API endpoint to call',
}
```

#### Number

```typescript
{
  displayName: 'Limit',
  name: 'limit',
  type: 'number',
  default: 100,
  typeOptions: {
    minValue: 1,
    maxValue: 1000,
  },
  description: 'Maximum number of items to return',
}
```

#### Boolean

```typescript
{
  displayName: 'Include Metadata',
  name: 'includeMetadata',
  type: 'boolean',
  default: false,
  description: 'Whether to include metadata in response',
}
```

#### Options (Dropdown)

```typescript
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  options: [
    { name: 'Get', value: 'get' },
    { name: 'Create', value: 'create' },
    { name: 'Update', value: 'update' },
    { name: 'Delete', value: 'delete' },
  ],
  default: 'get',
  description: 'The operation to perform',
}
```

#### JSON

```typescript
{
  displayName: 'Request Body',
  name: 'body',
  type: 'json',
  default: '{}',
  description: 'The request body as JSON',
}
```

### Display Options

Show/hide properties based on other values:

```typescript
{
  displayName: 'User ID',
  name: 'userId',
  type: 'string',
  default: '',
  displayOptions: {
    show: {
      operation: ['get', 'update', 'delete'],
    },
  },
  description: 'The ID of the user',
}
```

### Type Options

Additional options for property types:

```typescript
{
  displayName: 'Password',
  name: 'password',
  type: 'string',
  typeOptions: {
    password: true,  // Hide input
  },
  default: '',
}
```

```typescript
{
  displayName: 'Tags',
  name: 'tags',
  type: 'string',
  typeOptions: {
    multipleValues: true,
    multipleValueButtonText: 'Add Tag',
  },
  default: [],
}
```

## Credentials

### Creating Credentials

```typescript
import {
  ICredentialType,
  INodeProperties,
} from '@workflow/sdk';

export class MyApiCredential implements ICredentialType {
  name = 'myApiCredential';
  displayName = 'My API Credentials';
  documentationUrl = 'https://docs.myapi.com/authentication';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
    },
    {
      displayName: 'Environment',
      name: 'environment',
      type: 'options',
      options: [
        { name: 'Production', value: 'production' },
        { name: 'Sandbox', value: 'sandbox' },
      ],
      default: 'production',
    },
  ];

  async test(
    this: ICredentialTestFunctions,
    credential: ICredentialDataDecryptedObject
  ): Promise<INodeCredentialTestResult> {
    try {
      const response = await this.helpers.request({
        method: 'GET',
        url: 'https://api.example.com/auth/test',
        headers: {
          'Authorization': `Bearer ${credential.apiKey}`,
        },
      });

      return {
        status: 'OK',
        message: 'Authentication successful',
      };
    } catch (error) {
      return {
        status: 'Error',
        message: `Authentication failed: ${error.message}`,
      };
    }
  }
}
```

### Using Credentials in Nodes

```typescript
// Get credentials
const credentials = await this.getCredentials('myApiCredential');

// Use with helper
const response = await this.helpers.requestWithAuthentication(
  'myApiCredential',
  {
    method: 'GET',
    url: 'https://api.example.com/data',
  }
);

// Manual usage
const response = await this.helpers.request({
  method: 'GET',
  url: 'https://api.example.com/data',
  headers: {
    'Authorization': `Bearer ${credentials.apiKey}`,
  },
});
```

## Testing

### Unit Testing

```typescript
import { TestingUtils, test } from '@workflow/sdk';
import { MyNode } from './MyNode';

async function runTests() {
  const node = new MyNode();

  // Test 1: Basic operation
  const test1 = test('Should process text correctly')
    .withInput([{ text: 'hello' }])
    .withParameters({ operation: 'uppercase' })
    .withOutput([{ result: 'HELLO' }])
    .build();

  const result1 = await TestingUtils.executeNode(node, test1);
  console.log(result1.success ? '✓' : '✗', result1.description);

  // Test 2: With credentials
  const test2 = test('Should authenticate and fetch data')
    .withInput([{}])
    .withCredentials('myApi', { apiKey: 'test-key' })
    .withParameters({ resourceId: '123' })
    .withOutput([{ id: '123', name: 'Test' }])
    .build();

  const result2 = await TestingUtils.executeNode(node, test2);
  console.log(result2.success ? '✓' : '✗', result2.description);

  // Generate report
  const report = TestingUtils.generateTestReport([result1, result2]);
  console.log(report);
}

runTests();
```

### Benchmarking

```typescript
const benchmark = await TestingUtils.benchmarkNode(
  node,
  [[{ json: {} }]],
  { operation: 'get' },
  100  // iterations
);

console.log(`Average: ${benchmark.averageTime}ms`);
console.log(`Min: ${benchmark.minTime}ms`);
console.log(`Max: ${benchmark.maxTime}ms`);
```

## Advanced Features

### Multiple Outputs

```typescript
description: INodeTypeDescription = {
  // ...
  outputs: ['main', 'success', 'error'],
};

async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const mainOutput: INodeExecutionData[] = [];
  const successOutput: INodeExecutionData[] = [];
  const errorOutput: INodeExecutionData[] = [];

  // ... processing logic

  return [mainOutput, successOutput, errorOutput];
}
```

### Binary Data

```typescript
// Prepare binary data
const buffer = Buffer.from('Hello, World!');
const binaryData = await this.helpers.prepareBinaryData(
  buffer,
  'output.txt',
  'text/plain'
);

returnData.push({
  json: { filename: 'output.txt' },
  binary: {
    data: binaryData,
  },
});

// Read binary data
const buffer = await this.helpers.getBinaryDataBuffer(0, 'data');
const text = buffer.toString('utf-8');
```

### Pagination

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const returnData: INodeExecutionData[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await this.helpers.request({
      method: 'GET',
      url: `https://api.example.com/items?page=${page}`,
      json: true,
    });

    returnData.push(...response.items.map((item: any) => ({ json: item })));

    hasMore = response.hasMore;
    page++;
  }

  return [returnData];
}
```

### Batch Processing

```typescript
import { batchProcess } from '@workflow/sdk';

const items = this.getInputData();

const results = await batchProcess(
  items,
  async (item, index) => {
    const result = await this.processItem(item);
    return { json: result };
  },
  10  // batch size
);

return [results];
```

### Retry Logic

```typescript
import { retry } from '@workflow/sdk';

const result = await retry(
  async () => {
    return await this.helpers.request({
      method: 'GET',
      url: 'https://api.example.com/data',
    });
  },
  {
    maxAttempts: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
  }
);
```

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```typescript
try {
  // API call or operation
} catch (error) {
  if (this.continueOnFail()) {
    returnData.push({
      json: { error: error.message },
      error,
    });
    continue;
  }
  throw error;
}
```

### 2. Input Validation

Validate parameters before use:

```typescript
import { ValidationUtils } from '@workflow/sdk';

const email = this.getNodeParameter('email', i) as string;
const validation = ValidationUtils.validateEmail(email, true);

if (!validation.valid) {
  throw new Error(validation.error);
}
```

### 3. Resource Cleanup

Clean up resources in finally blocks:

```typescript
let connection;
try {
  connection = await this.createConnection();
  // ... use connection
} finally {
  if (connection) {
    await connection.close();
  }
}
```

### 4. Performance

- Use batch processing for multiple items
- Implement caching for repeated requests
- Avoid loading large data into memory
- Use streaming for large files

### 5. Security

- Never log sensitive data
- Validate all user inputs
- Use credential system for secrets
- Sanitize data before output

### 6. Documentation

- Provide clear descriptions
- Include usage examples
- Document required credentials
- Add helpful placeholder text

## API Reference

### IExecuteFunctions

```typescript
interface IExecuteFunctions {
  // Data access
  getInputData(inputIndex?: number): INodeExecutionData[];
  getNodeParameter(parameterName: string, itemIndex: number): any;
  getWorkflowStaticData(type: string): IDataObject;

  // Credentials
  getCredentials(type: string, itemIndex?: number): Promise<ICredentialDataDecryptedObject>;

  // Workflow info
  getWorkflow(): IWorkflowMetadata;
  getExecutionId(): string;
  getMode(): WorkflowExecuteMode;
  getTimezone(): string;
  getRestApiUrl(): string;

  // Execution control
  continueOnFail(): boolean;

  // Helpers
  helpers: INodeHelpers;
}
```

### INodeHelpers

```typescript
interface INodeHelpers {
  // HTTP requests
  request(options: IHttpRequestOptions): Promise<any>;
  requestWithAuthentication(
    credentialType: string,
    options: IHttpRequestOptions
  ): Promise<any>;

  // Binary data
  prepareBinaryData(
    buffer: Buffer,
    fileName?: string,
    mimeType?: string
  ): Promise<IBinaryData>;
  getBinaryDataBuffer(
    itemIndex: number,
    propertyName: string
  ): Promise<Buffer>;

  // Utilities
  returnJsonArray(data: IDataObject | IDataObject[]): INodeExecutionData[];
  normalizeItems(items: INodeExecutionData[]): INodeExecutionData[];
}
```

## Examples

See the `examples/plugins/` directory for complete examples:

1. **custom-http** - Advanced HTTP client with retry and caching
2. **data-transformer** - Complex data transformations
3. **ai-integration** - AI/ML integration example
4. **database-connector** - Database operations
5. **notification-service** - Multi-channel notifications

## Resources

- [Plugin Development Guide](./PLUGIN_DEVELOPMENT.md)
- [API Documentation](./API.md)
- [Example Workflows](../examples/workflows/)
- [Community Plugins](https://marketplace.workflow-automation.io)

## Support

- GitHub Issues: https://github.com/workflow/sdk/issues
- Discord: https://discord.gg/workflow
- Documentation: https://docs.workflow-automation.io

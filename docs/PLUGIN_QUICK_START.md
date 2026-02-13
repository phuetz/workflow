# Plugin System - Quick Start Guide

Get started with custom workflow nodes in 5 minutes!

## Installation

```bash
npm install -g @workflow/cli
```

## Create Your First Plugin

### Step 1: Generate Plugin

```bash
npx create-workflow-node my-first-plugin
```

Answer the prompts:
- Display name: **My First Plugin**
- Description: **My first custom workflow node**
- Author: **Your Name**
- License: **MIT**
- Category: **transform**
- Node type: **action**
- Requires credentials: **No**

### Step 2: Install Dependencies

```bash
cd my-first-plugin
npm install
```

### Step 3: Build Plugin

```bash
npm run build
```

### Step 4: Test Plugin

```bash
npm test
```

Expected output:
```
✓ Test 1: Should get data by ID
✓ Test 2: Should create new item

2/2 tests passed
```

### Step 5: Install Locally

```bash
workflow-cli plugin install .
```

## Your First Node

The generated node looks like this:

```typescript
import {
  INodeType,
  INodeTypeDescription,
  INodeExecutionData,
  IExecuteFunctions,
} from '@workflow/sdk';

export class MyFirstPlugin implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My First Plugin',
    name: 'myFirstPlugin',
    group: ['transform'],
    version: 1,
    description: 'My first custom workflow node',
    defaults: {
      name: 'My First Plugin',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'Get', value: 'get' },
          { name: 'Create', value: 'create' },
        ],
        default: 'get',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const operation = this.getNodeParameter('operation', i);

      // Your custom logic here
      const result = { operation, timestamp: new Date() };

      returnData.push({ json: result });
    }

    return [returnData];
  }
}
```

## Customize Your Node

### Add Parameters

```typescript
properties: [
  {
    displayName: 'API Endpoint',
    name: 'endpoint',
    type: 'string',
    default: '',
    required: true,
    placeholder: '/api/v1/users',
    description: 'The API endpoint to call',
  },
  {
    displayName: 'Method',
    name: 'method',
    type: 'options',
    options: [
      { name: 'GET', value: 'GET' },
      { name: 'POST', value: 'POST' },
    ],
    default: 'GET',
  },
]
```

### Make HTTP Requests

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const endpoint = this.getNodeParameter('endpoint', 0) as string;
  const method = this.getNodeParameter('method', 0) as string;

  const response = await this.helpers.request({
    method,
    url: `https://api.example.com${endpoint}`,
    json: true,
  });

  return [[{ json: response }]];
}
```

### Add Error Handling

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const returnData: INodeExecutionData[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      // Your logic here
      const result = await this.processItem(items[i]);
      returnData.push({ json: result });
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

## Add Credentials

### Step 1: Create Credential File

Create `src/credentials/MyApiCredential.ts`:

```typescript
import { ICredentialType, INodeProperties } from '@workflow/sdk';

export class MyApiCredential implements ICredentialType {
  name = 'myApiCredential';
  displayName = 'My API Credentials';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
    },
  ];

  async test(this: any, credential: any): Promise<any> {
    try {
      const response = await this.helpers.request({
        method: 'GET',
        url: 'https://api.example.com/auth/test',
        headers: {
          'Authorization': `Bearer ${credential.apiKey}`,
        },
      });

      return { status: 'OK', message: 'Authentication successful' };
    } catch (error) {
      return { status: 'Error', message: error.message };
    }
  }
}
```

### Step 2: Update Manifest

In `workflow.json`, add:

```json
{
  "credentials": ["MyApiCredential"]
}
```

### Step 3: Use in Node

```typescript
description: INodeTypeDescription = {
  // ...
  credentials: [
    {
      name: 'myApiCredential',
      required: true,
    },
  ],
  // ...
};

async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const credentials = await this.getCredentials('myApiCredential');

  const response = await this.helpers.request({
    method: 'GET',
    url: 'https://api.example.com/data',
    headers: {
      'Authorization': `Bearer ${credentials.apiKey}`,
    },
  });

  return [[{ json: response }]];
}
```

## Testing

### Write Tests

Create `test/MyNode.test.ts`:

```typescript
import { TestingUtils, test } from '@workflow/sdk';
import { MyFirstPlugin } from '../src/nodes/MyFirstPlugin';

describe('MyFirstPlugin', () => {
  it('should process data correctly', async () => {
    const node = new MyFirstPlugin();

    const testCase = test('Process operation')
      .withInput([{ id: 1 }])
      .withParameters({ operation: 'get' })
      .withOutput([{ operation: 'get' }])
      .build();

    const result = await TestingUtils.executeNode(node, testCase);
    expect(result.success).toBe(true);
  });
});
```

### Run Tests

```bash
npm test
```

## Publishing

### Step 1: Update Version

```bash
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

### Step 2: Build

```bash
npm run build
```

### Step 3: Publish to Registry

```bash
workflow-cli plugin publish
```

Or publish to npm:

```bash
npm publish
```

## Common Patterns

### Pagination

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const returnData: INodeExecutionData[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await this.helpers.request({
      url: `https://api.example.com/items?page=${page}`,
      json: true,
    });

    returnData.push(...response.items.map(item => ({ json: item })));
    hasMore = response.hasMore;
    page++;
  }

  return [returnData];
}
```

### Batch Processing

```typescript
import { batchProcess } from '@workflow/sdk';

async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();

  const results = await batchProcess(
    items,
    async (item) => {
      const result = await this.processItem(item);
      return { json: result };
    },
    10  // Process 10 at a time
  );

  return [results];
}
```

### Retry Logic

```typescript
import { retry } from '@workflow/sdk';

const result = await retry(
  async () => {
    return await this.helpers.request({
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

## Resources

- **Full Documentation**: [SDK Guide](./SDK_GUIDE.md)
- **Plugin Development**: [Plugin Development Guide](./PLUGIN_DEVELOPMENT.md)
- **Examples**: [Example Plugins](../examples/plugins/)
- **API Reference**: [API Documentation](./API.md)

## Getting Help

- **Discord**: https://discord.gg/workflow
- **GitHub Issues**: https://github.com/workflow/sdk/issues
- **Documentation**: https://docs.workflow-automation.io
- **Email**: support@workflow-automation.io

## Next Steps

1. ✅ Create your first plugin
2. ⏭️ Add custom parameters
3. ⏭️ Implement credentials
4. ⏭️ Write tests
5. ⏭️ Publish to marketplace

Happy coding! 🚀

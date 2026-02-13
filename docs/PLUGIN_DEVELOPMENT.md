# Plugin Development Guide

Complete guide for developing, testing, and publishing workflow automation plugins.

## Table of Contents

1. [Plugin Architecture](#plugin-architecture)
2. [Development Workflow](#development-workflow)
3. [Plugin Manifest](#plugin-manifest)
4. [Permissions System](#permissions-system)
5. [Security Guidelines](#security-guidelines)
6. [Testing Strategies](#testing-strategies)
7. [Publishing](#publishing)
8. [Marketplace Integration](#marketplace-integration)

## Plugin Architecture

### Plugin Structure

```
my-plugin/
├── src/
│   ├── nodes/
│   │   ├── MyNode.ts
│   │   └── AnotherNode.ts
│   ├── credentials/
│   │   └── MyCredential.ts
│   ├── utils/
│   │   └── helpers.ts
│   └── index.ts
├── test/
│   ├── MyNode.test.ts
│   └── integration.test.ts
├── examples/
│   └── example-workflow.json
├── docs/
│   └── README.md
├── package.json
├── workflow.json
├── tsconfig.json
└── .gitignore
```

### Plugin Lifecycle

1. **Installation** - Plugin downloaded and extracted
2. **Validation** - Manifest and permissions validated
3. **Loading** - Nodes and credentials loaded
4. **Initialization** - Plugin registered with engine
5. **Execution** - Nodes execute in sandboxed environment
6. **Cleanup** - Resources released on uninstall

## Development Workflow

### 1. Initialize Plugin

```bash
npx create-workflow-node my-plugin
cd my-plugin
npm install
```

### 2. Develop Locally

Enable hot reload for development:

```typescript
// In your plugin manager setup
const pluginManager = new PluginManager();
await pluginManager.loadPlugin('./my-plugin', {
  hotReload: true,
  enableSandbox: false,  // Faster development
});
```

### 3. Build and Test

```bash
npm run build
npm run test
```

### 4. Local Testing

Install plugin locally:

```bash
npx workflow-cli plugin install ./my-plugin
```

Test in workflow editor:

```bash
npx workflow-cli dev
```

### 5. Package for Distribution

```bash
npm run build
npm pack
```

## Plugin Manifest

### workflow.json

Complete manifest specification:

```json
{
  "name": "my-awesome-plugin",
  "version": "1.0.0",
  "description": "An awesome workflow plugin",
  "author": "Your Name <email@example.com>",
  "license": "MIT",
  "homepage": "https://github.com/username/my-plugin",
  "repository": "https://github.com/username/my-plugin",
  "keywords": ["workflow", "automation", "api"],

  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "icon": "icon.svg",

  "nodes": ["MyNode", "AnotherNode"],
  "credentials": ["MyCredential"],

  "permissions": {
    "network": [
      {
        "host": "api.example.com",
        "port": 443,
        "protocol": "https"
      }
    ],
    "filesystem": {
      "read": ["/tmp"],
      "write": ["/tmp/output"]
    },
    "environment": false,
    "subprocess": false,
    "database": false
  },

  "dependencies": {
    "axios": "^1.4.0"
  },

  "minEngineVersion": "1.0.0",
  "maxEngineVersion": "2.0.0",

  "n8n": {
    "nodes": ["dist/nodes/MyNode.js"],
    "credentials": ["dist/credentials/MyCredential.js"]
  }
}
```

### Version Management

Follow semantic versioning (semver):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

Example:
- `1.0.0` → `1.0.1` (bug fix)
- `1.0.1` → `1.1.0` (new feature)
- `1.1.0` → `2.0.0` (breaking change)

## Permissions System

### Network Permissions

Control which hosts your plugin can access:

```json
{
  "permissions": {
    "network": [
      {
        "host": "api.example.com",
        "protocol": "https"
      },
      {
        "host": "*.example.com",
        "protocol": "https"
      },
      {
        "host": "*",
        "protocol": "https",
        "port": 443
      }
    ]
  }
}
```

⚠️ Avoid using wildcard `*` unless absolutely necessary.

### Filesystem Permissions

Control file system access:

```json
{
  "permissions": {
    "filesystem": {
      "read": ["/tmp", "/data/input"],
      "write": ["/tmp/output"],
      "readWrite": ["/data/cache"]
    }
  }
}
```

### Environment Variables

Request access to environment variables:

```json
{
  "permissions": {
    "environment": true
  }
}
```

⚠️ Requires user approval due to security implications.

### Database Access

Request database permissions:

```json
{
  "permissions": {
    "database": true
  }
}
```

### Subprocess Execution

Request ability to spawn processes:

```json
{
  "permissions": {
    "subprocess": true
  }
}
```

⚠️ **HIGH RISK** - Requires explicit user approval.

## Security Guidelines

### 1. Input Validation

Always validate user inputs:

```typescript
import { ValidationUtils } from '@workflow/sdk';

// Validate URL
const url = this.getNodeParameter('url', i) as string;
const validation = ValidationUtils.validateURL(url, {
  required: true,
  protocols: ['https'],
});

if (!validation.valid) {
  throw new Error(validation.error);
}

// Validate email
const email = ValidationUtils.validateEmail(emailAddress, true);

// Validate JSON
const jsonValidation = ValidationUtils.validateJSON(jsonString, true);
if (!jsonValidation.valid) {
  throw new Error(jsonValidation.error);
}
```

### 2. Sanitize Output

Prevent XSS and injection attacks:

```typescript
import { ValidationUtils } from '@workflow/sdk';

const userInput = this.getNodeParameter('input', i) as string;
const sanitized = ValidationUtils.sanitizeString(userInput, {
  maxLength: 1000,
  allowHtml: false,
});
```

### 3. Secure Credential Storage

Never log or expose credentials:

```typescript
// ❌ NEVER DO THIS
console.log('Credentials:', credentials);

// ✅ DO THIS
console.log('Using credentials for:', credentials.username);

// ❌ NEVER DO THIS
returnData.push({
  json: {
    apiKey: credentials.apiKey,  // Exposed!
  },
});

// ✅ DO THIS
returnData.push({
  json: {
    authenticated: true,
    user: credentials.username,
  },
});
```

### 4. Rate Limiting

Implement rate limiting for API calls:

```typescript
class RateLimiter {
  private requests: number[] = [];
  private limit: number;
  private window: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.window = windowMs;
  }

  async checkLimit(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.window);

    if (this.requests.length >= this.limit) {
      const oldestRequest = this.requests[0];
      const waitTime = this.window - (now - oldestRequest);
      await this.sleep(waitTime);
    }

    this.requests.push(now);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const rateLimiter = new RateLimiter(100, 60000); // 100 req/min
await rateLimiter.checkLimit();
```

### 5. Error Handling

Avoid exposing sensitive error details:

```typescript
try {
  await this.makeApiCall();
} catch (error) {
  // ❌ Don't expose internal details
  // throw error;

  // ✅ Sanitize error message
  throw new Error(`API request failed: ${this.sanitizeErrorMessage(error)}`);
}

private sanitizeErrorMessage(error: any): string {
  // Remove sensitive information
  const message = error.message || 'Unknown error';
  return message.replace(/api[_-]?key[s]?[=:]\s*[\w-]+/gi, 'apiKey=***');
}
```

## Testing Strategies

### Unit Tests

Test individual node operations:

```typescript
import { TestingUtils, test } from '@workflow/sdk';
import { MyNode } from '../src/nodes/MyNode';

describe('MyNode', () => {
  let node: MyNode;

  beforeEach(() => {
    node = new MyNode();
  });

  it('should process data correctly', async () => {
    const testCase = test('Process data')
      .withInput([{ name: 'John', age: 30 }])
      .withParameters({ operation: 'transform' })
      .withOutput([{ name: 'JOHN', age: 30 }])
      .build();

    const result = await TestingUtils.executeNode(node, testCase);
    expect(result.success).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    const result = await TestingUtils.testErrorHandling(
      node,
      {
        description: 'Invalid input',
        input: { main: [[{ json: {} }]] },
        parameters: { operation: 'invalid' },
        output: { main: [[]] },
      },
      'Invalid operation'
    );

    expect(result.success).toBe(true);
  });
});
```

### Integration Tests

Test complete workflows:

```typescript
describe('MyNode Integration', () => {
  it('should work with other nodes', async () => {
    const workflow = {
      nodes: [
        { type: 'manualTrigger', id: '1' },
        { type: 'myNode', id: '2', parameters: { operation: 'get' } },
        { type: 'http', id: '3', parameters: { method: 'POST' } },
      ],
      connections: [
        { from: '1', to: '2' },
        { from: '2', to: '3' },
      ],
    };

    const result = await executeWorkflow(workflow);
    expect(result.success).toBe(true);
  });
});
```

### Performance Tests

Benchmark your node:

```typescript
describe('MyNode Performance', () => {
  it('should process 1000 items in < 1s', async () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({
      json: { id: i },
    }));

    const benchmark = await TestingUtils.benchmarkNode(
      node,
      [items],
      { operation: 'process' },
      10  // iterations
    );

    expect(benchmark.averageTime).toBeLessThan(1000);
  });
});
```

### Credential Tests

Test credential validation:

```typescript
describe('MyCredential', () => {
  it('should validate credentials successfully', async () => {
    const credential = new MyCredential();
    const mockCredential = {
      apiKey: 'valid-key',
      apiUrl: 'https://api.example.com',
    };

    const result = await credential.test(mockCredential);
    expect(result.status).toBe('OK');
  });

  it('should fail with invalid credentials', async () => {
    const credential = new MyCredential();
    const mockCredential = {
      apiKey: 'invalid-key',
      apiUrl: 'https://api.example.com',
    };

    const result = await credential.test(mockCredential);
    expect(result.status).toBe('Error');
  });
});
```

## Publishing

### 1. Prepare for Publishing

- Update version in `package.json` and `workflow.json`
- Update `CHANGELOG.md`
- Ensure all tests pass
- Build production version
- Update documentation

### 2. Publish to npm

```bash
npm login
npm publish
```

### 3. Publish to Workflow Registry

```bash
npx workflow-cli plugin publish
```

Follow prompts to:
- Select category
- Add tags
- Set pricing (free/paid)
- Upload screenshots
- Provide demo workflow

### 4. Submit for Verification

Verified plugins get a badge and higher visibility:

```bash
npx workflow-cli plugin verify-request
```

Requirements:
- Complete documentation
- Test coverage > 80%
- Security audit passed
- Example workflows provided
- Active maintenance commitment

## Marketplace Integration

### Plugin Categories

- Communication
- Data & Storage
- Productivity
- Development
- Marketing & Sales
- Analytics
- AI & Machine Learning
- Finance
- Custom Integrations

### Plugin Metadata

Enhance discoverability:

```json
{
  "keywords": [
    "api",
    "rest",
    "http",
    "integration",
    "automation"
  ],
  "screenshots": [
    "screenshots/1.png",
    "screenshots/2.png"
  ],
  "documentation": "https://docs.example.com/plugin",
  "support": "https://support.example.com",
  "pricing": {
    "model": "free|one-time|subscription",
    "amount": 0,
    "currency": "USD"
  }
}
```

### Analytics

Track plugin usage:

```typescript
import { PluginAnalytics } from '@workflow/sdk';

export class MyNode implements INodeType {
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // Track execution
    PluginAnalytics.track('node_executed', {
      operation: this.getNodeParameter('operation', 0),
      itemCount: this.getInputData().length,
    });

    // ... node logic
  }
}
```

### Revenue Sharing

For paid plugins:

- Platform fee: 20%
- Developer share: 80%
- Monthly payouts
- Minimum: $100

## Best Practices Summary

✅ **DO:**
- Validate all inputs
- Handle errors gracefully
- Write comprehensive tests
- Document all features
- Follow semantic versioning
- Keep dependencies minimal
- Implement rate limiting
- Use TypeScript strictly

❌ **DON'T:**
- Log sensitive data
- Use wildcard permissions
- Skip input validation
- Hardcode credentials
- Ignore errors
- Break backward compatibility
- Include unnecessary dependencies
- Use `eval()` or similar

## Resources

- [SDK Guide](./SDK_GUIDE.md)
- [API Reference](./API.md)
- [Example Plugins](../examples/plugins/)
- [Plugin Registry](https://registry.workflow-automation.io)
- [Community Forum](https://forum.workflow-automation.io)

## Support

Need help? Reach out:

- Discord: https://discord.gg/workflow
- GitHub Discussions: https://github.com/workflow/sdk/discussions
- Email: support@workflow-automation.io

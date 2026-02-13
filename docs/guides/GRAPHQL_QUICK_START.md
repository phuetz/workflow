# GraphQL Federation & API Management - Quick Start Guide

## Table of Contents

1. [Setup](#setup)
2. [GraphQL Queries](#graphql-queries)
3. [Authentication](#authentication)
4. [Rate Limiting](#rate-limiting)
5. [Caching](#caching)
6. [Analytics](#analytics)
7. [Federation](#federation)

---

## Setup

### Install Dependencies

```bash
npm install @apollo/server @apollo/gateway @apollo/subgraph @apollo/composition
npm install graphql graphql-subscriptions dataloader
npm install express jsonwebtoken
npm install @opentelemetry/api
```

### Initialize Federation Gateway

```typescript
import { FederationManager } from './src/graphql/federation/FederationManager';

const federation = new FederationManager({
  mode: 'unmanaged',
  serviceList: [
    {
      name: 'workflow',
      url: 'http://localhost:4001/graphql',
      active: true
    },
    {
      name: 'execution',
      url: 'http://localhost:4002/graphql',
      active: true
    }
  ],
  introspection: true
});

await federation.initialize();
const server = federation.createServer();
```

### Start API Gateway

```typescript
import { APIGateway } from './src/api/management/APIGateway';
import express from 'express';

const app = express();
const gateway = new APIGateway({
  authentication: {
    methods: ['apiKey', 'jwt'],
    apiKeyHeader: 'x-api-key',
    jwtSecret: process.env.JWT_SECRET
  },
  analytics: {
    enabled: true,
    sampleRate: 1.0
  }
});

app.use('/graphql', gateway.middleware());
```

---

## GraphQL Queries

### Basic Workflow Query

```graphql
query GetWorkflows {
  workflows(limit: 10) {
    id
    name
    status
    nodes {
      id
      type
      name
    }
    statistics {
      totalExecutions
      successfulExecutions
    }
  }
}
```

### Execute Workflow

```graphql
mutation ExecuteWorkflow {
  executeWorkflow(
    workflowId: "wf_123"
    input: {
      mode: MANUAL
      inputData: { userId: "user1" }
    }
  ) {
    id
    status
    startedAt
  }
}
```

### Real-time Execution Updates

```graphql
subscription WatchExecution {
  executionUpdated(executionId: "exec_123") {
    id
    status
    nodeExecutions {
      nodeId
      status
      duration
    }
  }
}
```

### Get Node Types

```graphql
query GetNodeTypes {
  nodeTypes(filter: { category: AI }) {
    type
    name
    description
    inputs {
      name
      required
      type
    }
  }
}
```

### User Profile

```graphql
query MyProfile {
  currentUser {
    id
    username
    email
    role
    statistics {
      totalWorkflows
      totalExecutions
    }
    preferences {
      theme
      language
    }
  }
}
```

---

## Authentication

### API Key Authentication

**Create API Key**:
```typescript
import { APIGateway } from './src/api/management/APIGateway';

const gateway = new APIGateway(config);
const apiKey = gateway.createAPIKey('user123', ['read', 'write']);
console.log('API Key:', apiKey); // sk_abc123...
```

**Use API Key**:
```bash
curl -H "x-api-key: sk_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"query": "{ workflows { id } }"}' \
  http://localhost:4000/graphql
```

### JWT Authentication

**Generate JWT**:
```typescript
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  {
    sub: 'user123',
    scopes: ['read', 'write'],
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  },
  process.env.JWT_SECRET
);
```

**Use JWT**:
```bash
curl -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"query": "{ workflows { id } }"}' \
  http://localhost:4000/graphql
```

### OAuth2 Authentication

```bash
# 1. Get access token from OAuth2 provider
curl -X POST https://oauth-provider.com/token \
  -d "grant_type=client_credentials" \
  -d "client_id=your_client_id" \
  -d "client_secret=your_secret"

# 2. Use token
curl -H "Authorization: Bearer <access_token>" \
  -d '{"query": "{ workflows { id } }"}' \
  http://localhost:4000/graphql
```

---

## Rate Limiting

### Setup Rate Limiter

```typescript
import { RateLimiter } from './src/api/management/RateLimiter';

const limiter = new RateLimiter({
  strategy: 'sliding-window',
  defaultLimit: 1000,
  window: 60, // seconds
  perUser: {
    'premium-user': 5000,
    'basic-user': 100
  },
  perOperation: {
    'GetWorkflows': 100,
    'ExecuteWorkflow': 10
  }
});

app.use('/graphql', limiter.middleware());
```

### Available Strategies

1. **Fixed Window**: Simple, fast, but allows bursts
   ```typescript
   { strategy: 'fixed-window', defaultLimit: 1000, window: 60 }
   ```

2. **Sliding Window**: Precise, no bursts, higher memory
   ```typescript
   { strategy: 'sliding-window', defaultLimit: 1000, window: 60 }
   ```

3. **Token Bucket**: Allows bursts, smooth distribution
   ```typescript
   { strategy: 'token-bucket', defaultLimit: 1000, window: 60 }
   ```

4. **Leaky Bucket**: Constant rate, queue smoothing
   ```typescript
   { strategy: 'leaky-bucket', defaultLimit: 1000, window: 60 }
   ```

### Check Rate Limit

```typescript
const result = await limiter.check('user123', 1000, 60000);

if (result.allowed) {
  console.log(`Request allowed. Remaining: ${result.remaining}`);
} else {
  console.log(`Rate limited. Retry after ${result.retryAfter}s`);
}
```

---

## Caching

### Setup Cache Manager

```typescript
import { CacheManager } from './src/api/management/CacheManager';

const cache = new CacheManager({
  strategy: 'hybrid',
  defaultTTL: 60, // seconds
  maxSize: 100, // MB
  perFieldTTL: {
    'Workflow.statistics': 300, // 5 minutes
    'User.preferences': 3600 // 1 hour
  },
  perTypeTTL: {
    'Workflow': 120,
    'Execution': 30
  },
  invalidationRules: [
    {
      event: 'workflow:updated',
      types: ['Workflow']
    },
    {
      event: 'execution:completed',
      pattern: 'execution:*'
    }
  ]
});
```

### Cache Query Results

```typescript
// Cache query result
await cache.cacheQuery(
  query,
  variables,
  result,
  { ttl: 300, tags: ['workflow', 'public'] }
);

// Get cached result
const cached = await cache.getCachedQuery(query, variables);
if (cached) {
  return cached;
}
```

### Cache Field Results

```typescript
// Cache individual field
await cache.cacheField(
  'Workflow',
  'statistics',
  'wf_123',
  { totalExecutions: 42 }
);

// Get cached field
const stats = await cache.getCachedField('Workflow', 'statistics', 'wf_123');
```

### Invalidation Strategies

**Pattern-based**:
```typescript
// Invalidate all workflow caches
await cache.invalidatePattern('workflow:*');
```

**Tag-based**:
```typescript
// Invalidate by tags
await cache.invalidateTags(['workflow', 'public']);
```

**Type-based**:
```typescript
// Invalidate all Workflow type caches
await cache.invalidateType('Workflow');
```

---

## Analytics

### Setup API Analytics

```typescript
import { APIAnalytics } from './src/api/management/APIAnalytics';

const analytics = new APIAnalytics();

// Record events (automatic with API Gateway)
analytics.recordEvent({
  timestamp: new Date(),
  requestId: 'req_123',
  userId: 'user1',
  operation: 'GetWorkflows',
  method: 'POST',
  path: '/graphql',
  statusCode: 200,
  duration: 145
});
```

### Get Usage Metrics

```typescript
const metrics = analytics.getUsageMetrics({
  startTime: new Date('2025-10-01'),
  endTime: new Date()
});

console.log(`
  Total Requests: ${metrics.totalRequests}
  Success Rate: ${(1 - metrics.errorRate) * 100}%
  P95 Latency: ${metrics.p95Latency}ms
  RPS: ${metrics.requestsPerSecond}
`);
```

### Get Top Consumers

```typescript
const topConsumers = analytics.getTopConsumers(10);

topConsumers.forEach(consumer => {
  console.log(`
    ${consumer.type}: ${consumer.identifier}
    Requests: ${consumer.requestCount}
    Avg Latency: ${consumer.averageLatency}ms
    Errors: ${consumer.errorCount}
  `);
});
```

### Get Operation Metrics

```typescript
const operations = analytics.getOperationMetrics();

operations.forEach(op => {
  console.log(`
    Operation: ${op.operation}
    Count: ${op.count}
    Avg Latency: ${op.averageLatency}ms
    Error Rate: ${(op.errorCount / op.count) * 100}%
  `);
});
```

### Generate Time Series

```typescript
const timeSeries = analytics.getTimeSeries('hour');

timeSeries.forEach(point => {
  console.log(`
    ${point.timestamp}: ${point.requestCount} requests
    Avg Latency: ${point.averageLatency}ms
    Errors: ${point.errorCount}
  `);
});
```

---

## Federation

### Register Subgraph

```typescript
import { FederationManager } from './src/graphql/federation/FederationManager';

const federation = new FederationManager(config);

await federation.registerSubgraph({
  name: 'workflow',
  url: 'http://localhost:4001/graphql',
  schema: workflowSchema,
  active: true
});
```

### Schema Registry

```typescript
import { SchemaRegistry } from './src/graphql/registry/SchemaRegistry';

const registry = new SchemaRegistry();

// Register schema version
const version = await registry.registerSchema('workflow', {
  schema: schemaString,
  version: '1.0.0',
  createdBy: 'user1',
  description: 'Initial release',
  tags: ['production', 'stable']
});

// Check backward compatibility
const compat = await registry.checkBackwardCompatibility(
  'workflow',
  newSchema
);

if (!compat.compatible) {
  console.log('Breaking changes detected:', compat.breakingChanges);
}
```

### Compose Supergraph

```typescript
import { SupergraphComposer } from './src/graphql/federation/SupergraphComposer';

const composer = new SupergraphComposer();

const result = await composer.composeWithDetails([
  {
    name: 'workflow',
    url: 'http://localhost:4001/graphql',
    schema: workflowSchema
  },
  {
    name: 'execution',
    url: 'http://localhost:4002/graphql',
    schema: executionSchema
  }
]);

if (result.errors.length > 0) {
  console.log('Composition errors:', result.errors);
}

console.log('Warnings:', result.warnings);
console.log('Optimization hints:', result.hints);
```

---

## Complete Example

### Express Server with All Features

```typescript
import express from 'express';
import { FederationManager } from './src/graphql/federation/FederationManager';
import { APIGateway } from './src/api/management/APIGateway';
import { RateLimiter } from './src/api/management/RateLimiter';
import { CacheManager } from './src/api/management/CacheManager';
import { APIAnalytics } from './src/api/management/APIAnalytics';

const app = express();

// Initialize components
const analytics = new APIAnalytics();
const cache = new CacheManager({
  strategy: 'hybrid',
  defaultTTL: 60,
  maxSize: 100
});
const limiter = new RateLimiter({
  strategy: 'token-bucket',
  defaultLimit: 1000,
  window: 60
});
const gateway = new APIGateway({
  authentication: {
    methods: ['apiKey', 'jwt'],
    jwtSecret: process.env.JWT_SECRET
  },
  analytics: { enabled: true }
});

// Setup federation
const federation = new FederationManager({
  mode: 'unmanaged',
  serviceList: [
    { name: 'workflow', url: 'http://localhost:4001/graphql', active: true },
    { name: 'execution', url: 'http://localhost:4002/graphql', active: true },
    { name: 'node', url: 'http://localhost:4003/graphql', active: true },
    { name: 'user', url: 'http://localhost:4004/graphql', active: true }
  ]
});

await federation.initialize();
const server = federation.createServer();

// Apply middleware
app.use(express.json());
app.use('/graphql', gateway.middleware());
app.use('/graphql', limiter.middleware());

// Start server
await server.start();
app.use('/graphql', expressMiddleware(server));

app.listen(4000, () => {
  console.log('🚀 GraphQL Federation server running on http://localhost:4000/graphql');
  console.log('📊 Analytics: enabled');
  console.log('⚡ Rate limiting: enabled');
  console.log('💾 Caching: enabled');
});
```

---

## Environment Variables

```bash
# JWT
JWT_SECRET=your-secret-key-here
JWT_ISSUER=https://your-domain.com

# OAuth2
OAUTH2_CLIENT_ID=your-client-id
OAUTH2_CLIENT_SECRET=your-client-secret
OAUTH2_AUTHORIZATION_URL=https://oauth-provider.com/authorize
OAUTH2_TOKEN_URL=https://oauth-provider.com/token

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Apollo Studio (optional)
APOLLO_KEY=service:your-graph:your-key
APOLLO_GRAPH_VARIANT=production
```

---

## Next Steps

1. **Read the Full Documentation**: See `AGENT72_GRAPHQL_FEDERATION_REPORT.md`
2. **Run Tests**: `npm run test -- src/graphql/__tests__/graphql.test.ts`
3. **Explore Examples**: Check example queries in `src/graphql/schema/`
4. **Monitor Performance**: Use analytics dashboard
5. **Optimize Caching**: Tune TTL and invalidation rules

---

**Need Help?**
- Documentation: `/docs/graphql/`
- Examples: `/examples/graphql/`
- Issues: GitHub Issues
- Community: Discord #graphql-api

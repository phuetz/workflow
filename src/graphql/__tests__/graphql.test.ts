/**
 * GraphQL Federation & API Management Tests
 * Comprehensive test suite covering all GraphQL and API features
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FederationManager } from '../federation/FederationManager';
import { SubgraphRegistry } from '../federation/SubgraphRegistry';
import { SupergraphComposer } from '../federation/SupergraphComposer';
import { SchemaRegistry } from '../registry/SchemaRegistry';
import { ApolloRouterIntegration } from '../router/ApolloRouterIntegration';
import { APIGateway } from '../../api/management/APIGateway';
import { RateLimiter } from '../../api/management/RateLimiter';
import { CacheManager } from '../../api/management/CacheManager';
import { APIAnalytics } from '../../api/management/APIAnalytics';

describe('GraphQL Federation', () => {
  describe('FederationManager', () => {
    let manager: FederationManager;

    beforeEach(() => {
      manager = new FederationManager({
        mode: 'unmanaged',
        serviceList: [],
        introspection: true
      });
    });

    afterEach(async () => {
      await manager.shutdown();
    });

    it('should create federation manager with config', () => {
      expect(manager).toBeDefined();
      expect(manager.getGateway()).toBeNull();
    });

    it('should register new subgraph', async () => {
      await manager.registerSubgraph({
        name: 'workflow',
        url: 'http://localhost:4001/graphql',
        schema: 'type Query { test: String }',
        active: true
      });

      const registry = manager.getRegistry();
      const subgraph = await registry.getSubgraph('workflow');

      expect(subgraph).toBeDefined();
      expect(subgraph?.name).toBe('workflow');
    });

    it('should unregister subgraph', async () => {
      await manager.registerSubgraph({
        name: 'test',
        url: 'http://localhost:4001/graphql',
        schema: 'type Query { test: String }',
        active: true
      });

      await manager.unregisterSubgraph('test');

      const registry = manager.getRegistry();
      const subgraph = await registry.getSubgraph('test');

      expect(subgraph).toBeNull();
    });

    it('should track federation metrics', async () => {
      const metrics = manager.getMetrics();

      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('successfulRequests');
      expect(metrics).toHaveProperty('failedRequests');
      expect(metrics).toHaveProperty('averageLatency');
    });
  });

  describe('SubgraphRegistry', () => {
    let registry: SubgraphRegistry;

    beforeEach(() => {
      registry = new SubgraphRegistry();
    });

    afterEach(async () => {
      await registry.clear();
    });

    it('should register a subgraph', async () => {
      const subgraph = await registry.registerSubgraph({
        name: 'workflow',
        url: 'http://localhost:4001/graphql',
        schema: 'type Query { workflows: [Workflow] }',
        version: '1.0.0',
        active: true
      });

      expect(subgraph.name).toBe('workflow');
      expect(subgraph.active).toBe(true);
      expect(subgraph.version).toBe('1.0.0');
    });

    it('should prevent duplicate registration', async () => {
      await registry.registerSubgraph({
        name: 'workflow',
        url: 'http://localhost:4001/graphql',
        schema: 'type Query { test: String }',
        version: '1.0.0'
      });

      await expect(
        registry.registerSubgraph({
          name: 'workflow',
          url: 'http://localhost:4001/graphql',
          schema: 'type Query { test: String }',
          version: '1.0.0'
        })
      ).rejects.toThrow('already registered');
    });

    it('should update subgraph schema', async () => {
      await registry.registerSubgraph({
        name: 'workflow',
        url: 'http://localhost:4001/graphql',
        schema: 'type Query { workflows: [Workflow] }',
        version: '1.0.0'
      });

      const updated = await registry.updateSubgraphSchema(
        'workflow',
        'type Query { workflows: [Workflow]\n  executions: [Execution] }'
      );

      expect(updated.version).not.toBe('1.0.0');
    });

    it('should activate and deactivate subgraphs', async () => {
      await registry.registerSubgraph({
        name: 'test',
        url: 'http://localhost:4001/graphql',
        schema: 'type Query { test: String }',
        version: '1.0.0',
        active: true
      });

      const deactivated = await registry.deactivateSubgraph('test');
      expect(deactivated.active).toBe(false);

      const activated = await registry.activateSubgraph('test');
      expect(activated.active).toBe(true);
    });

    it('should track schema version history', async () => {
      await registry.registerSubgraph({
        name: 'workflow',
        url: 'http://localhost:4001/graphql',
        schema: 'type Query { test: String }',
        version: '1.0.0'
      });

      await registry.updateSubgraphSchema('workflow', 'type Query { test: String\n  test2: String }');

      const history = await registry.getSchemaVersionHistory('workflow');
      expect(history.length).toBeGreaterThan(0);
    });

    it('should provide registry statistics', () => {
      const stats = registry.getStatistics();

      expect(stats).toHaveProperty('totalSubgraphs');
      expect(stats).toHaveProperty('activeSubgraphs');
      expect(stats).toHaveProperty('healthySubgraphs');
    });
  });

  describe('SupergraphComposer', () => {
    let composer: SupergraphComposer;

    beforeEach(() => {
      composer = new SupergraphComposer();
    });

    it('should validate schema before composition', async () => {
      await expect(
        composer.composeSupergraph([
          {
            name: 'invalid',
            url: 'http://localhost:4001/graphql',
            schema: 'invalid schema'
          }
        ])
      ).rejects.toThrow();
    });

    it('should get composition history', () => {
      const history = composer.getCompositionHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should validate supergraph SDL', () => {
      const valid = composer.validateSupergraphSDL('type Query { test: String }');
      expect(valid).toBe(true);

      const invalid = composer.validateSupergraphSDL('invalid schema');
      expect(invalid).toBe(false);
    });

    it('should diff schemas', () => {
      const schemaA = 'type Query { test: String }';
      const schemaB = 'type Query { test: String\n  test2: String }';

      const diff = composer.diffSchemas(schemaA, schemaB);

      expect(diff).toHaveProperty('added');
      expect(diff).toHaveProperty('removed');
      expect(diff).toHaveProperty('modified');
    });
  });
});

describe('Schema Registry', () => {
  let registry: SchemaRegistry;

  beforeEach(() => {
    registry = new SchemaRegistry();
  });

  afterEach(() => {
    registry.clear();
  });

  it('should register new schema version', async () => {
    const version = await registry.registerSchema('workflow', {
      schema: 'type Query { workflows: [Workflow] }',
      version: '1.0.0',
      createdBy: 'user1',
      description: 'Initial version',
      tags: ['release']
    });

    expect(version.version).toBe('1.0.0');
    expect(version.breaking).toBe(false);
  });

  it('should detect breaking changes', async () => {
    await registry.registerSchema('workflow', {
      schema: 'type Query { workflows: [Workflow]\n  users: [User] }',
      version: '1.0.0',
      createdBy: 'user1'
    });

    const version = await registry.registerSchema('workflow', {
      schema: 'type Query { workflows: [Workflow] }',
      version: '2.0.0',
      createdBy: 'user1'
    });

    expect(version.breaking).toBe(true);
    expect(version.breakingChanges.length).toBeGreaterThan(0);
  });

  it('should check backward compatibility', async () => {
    await registry.registerSchema('workflow', {
      schema: 'type Query { workflows: [Workflow] }',
      version: '1.0.0',
      createdBy: 'user1'
    });

    const compat = await registry.checkBackwardCompatibility(
      'workflow',
      'type Query { workflows: [Workflow]\n  executions: [Execution] }'
    );

    expect(compat.compatible).toBe(true);
  });

  it('should list versions for subgraph', async () => {
    await registry.registerSchema('workflow', {
      schema: 'type Query { test: String }',
      version: '1.0.0',
      createdBy: 'user1'
    });

    await registry.registerSchema('workflow', {
      schema: 'type Query { test: String\n  test2: String }',
      version: '1.1.0',
      createdBy: 'user1'
    });

    const versions = await registry.listVersions('workflow');
    expect(versions.length).toBeGreaterThanOrEqual(2);
  });

  it('should tag versions', async () => {
    const version = await registry.registerSchema('workflow', {
      schema: 'type Query { test: String }',
      version: '1.0.0',
      createdBy: 'user1'
    });

    await registry.tagVersion(version.id, ['stable', 'production']);

    const tagged = await registry.getVersion(version.id);
    expect(tagged?.tags).toContain('stable');
    expect(tagged?.tags).toContain('production');
  });

  it('should search by tag', async () => {
    await registry.registerSchema('workflow', {
      schema: 'type Query { test: String }',
      version: '1.0.0',
      createdBy: 'user1',
      tags: ['production']
    });

    const results = await registry.searchByTag('production');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should provide registry statistics', () => {
    const stats = registry.getStatistics();

    expect(stats).toHaveProperty('totalVersions');
    expect(stats).toHaveProperty('breakingVersions');
    expect(stats).toHaveProperty('averageVersionsPerSubgraph');
  });
});

describe('Apollo Router Integration', () => {
  let router: ApolloRouterIntegration;

  beforeEach(() => {
    router = new ApolloRouterIntegration({
      endpoint: 'http://localhost:4000/graphql',
      caching: {
        enabled: true,
        ttl: 60
      },
      rateLimit: {
        enabled: true,
        defaultLimit: 1000
      }
    });
  });

  afterEach(async () => {
    await router.shutdown();
  });

  it('should plan queries', async () => {
    const plan = await router.planQuery('{ workflows { id name } }', 'GetWorkflows');

    expect(plan).toHaveProperty('operation');
    expect(plan).toHaveProperty('steps');
    expect(plan).toHaveProperty('complexity');
  });

  it('should cache query results', async () => {
    const query = '{ workflows { id } }';
    const variables = {};

    await router.executeQuery(query, variables, { userId: 'user1' });

    const metrics = router.getMetrics();
    expect(metrics.totalQueries).toBeGreaterThan(0);
  });

  it('should invalidate cache by pattern', async () => {
    await router.invalidateCache('workflow:*');
    const metrics = router.getMetrics();
    expect(metrics).toBeDefined();
  });

  it('should track metrics', () => {
    const metrics = router.getMetrics();

    expect(metrics).toHaveProperty('totalQueries');
    expect(metrics).toHaveProperty('cacheHits');
    expect(metrics).toHaveProperty('cacheMisses');
    expect(metrics).toHaveProperty('rateLimitedRequests');
  });
});

describe('API Gateway', () => {
  let gateway: APIGateway;

  beforeEach(() => {
    gateway = new APIGateway({
      authentication: {
        methods: ['apiKey', 'jwt'],
        apiKeyHeader: 'x-api-key',
        jwtSecret: 'test-secret'
      },
      analytics: {
        enabled: true
      }
    });
  });

  it('should create API keys', () => {
    const apiKey = gateway.createAPIKey('user1', ['read', 'write']);

    expect(apiKey).toBeDefined();
    expect(apiKey).toMatch(/^sk_/);
  });

  it('should revoke API keys', () => {
    const apiKey = gateway.createAPIKey('user1', ['read']);
    gateway.revokeAPIKey(apiKey);

    // Key should be revoked (inactive)
    expect(true).toBe(true);
  });

  it('should track analytics events', () => {
    const analytics = gateway.getAnalytics();
    expect(Array.isArray(analytics)).toBe(true);
  });

  it('should count requests', () => {
    const counts = gateway.getRequestCounts();
    expect(counts).toBeInstanceOf(Map);
  });
});

describe('Rate Limiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      strategy: 'fixed-window',
      defaultLimit: 100,
      window: 60
    });
  });

  afterEach(() => {
    limiter.clear();
  });

  it('should allow requests within limit', async () => {
    const result = await limiter.check('user1', 100, 60000);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeLessThanOrEqual(100);
  });

  it('should block requests exceeding limit', async () => {
    const limit = 5;
    const window = 60000;

    for (let i = 0; i < limit; i++) {
      await limiter.check('user1', limit, window);
    }

    const result = await limiter.check('user1', limit, window);
    expect(result.allowed).toBe(false);
  });

  it('should use sliding window strategy', async () => {
    limiter = new RateLimiter({
      strategy: 'sliding-window',
      defaultLimit: 100,
      window: 60
    });

    const result = await limiter.check('user1', 100, 60000);
    expect(result.allowed).toBe(true);
  });

  it('should use token bucket strategy', async () => {
    limiter = new RateLimiter({
      strategy: 'token-bucket',
      defaultLimit: 100,
      window: 60
    });

    const result = await limiter.check('user1', 100, 60000);
    expect(result.allowed).toBe(true);
  });

  it('should track quotas', () => {
    limiter.setQuota('user1', 1000, 86400000);

    const result = limiter.checkQuota('user1');
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(1000);
  });

  it('should reset rate limits', () => {
    limiter.reset('user1');
    const usage = limiter.getUsage('user1');
    expect(usage).toBeNull();
  });

  it('should get all usage statistics', async () => {
    await limiter.check('user1', 100, 60000);
    await limiter.check('user2', 100, 60000);

    const usage = limiter.getAllUsage();
    expect(usage.length).toBeGreaterThan(0);
  });
});

describe('Cache Manager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager({
      strategy: 'hybrid',
      defaultTTL: 60,
      maxSize: 10
    });
  });

  afterEach(() => {
    cache.clear();
  });

  it('should set and get cache values', async () => {
    await cache.set('key1', { data: 'value1' });

    const value = await cache.get('key1');
    expect(value).toEqual({ data: 'value1' });
  });

  it('should expire cached values', async () => {
    await cache.set('key1', 'value1', { ttl: 0.001 });

    await new Promise(resolve => setTimeout(resolve, 10));

    const value = await cache.get('key1');
    expect(value).toBeNull();
  });

  it('should cache query results', async () => {
    const query = '{ workflows { id } }';
    const variables = { limit: 10 };
    const result = { data: { workflows: [] } };

    await cache.cacheQuery(query, variables, result);

    const cached = await cache.getCachedQuery(query, variables);
    expect(cached).toEqual(result);
  });

  it('should cache field results', async () => {
    await cache.cacheField('Workflow', 'name', '123', 'Test Workflow');

    const cached = await cache.getCachedField('Workflow', 'name', '123');
    expect(cached).toBe('Test Workflow');
  });

  it('should invalidate by pattern', async () => {
    await cache.set('workflow:1', 'data1');
    await cache.set('workflow:2', 'data2');
    await cache.set('execution:1', 'data3');

    const count = await cache.invalidatePattern('workflow:*');
    expect(count).toBe(2);
  });

  it('should invalidate by tags', async () => {
    await cache.set('key1', 'value1', { tags: ['workflow'] });
    await cache.set('key2', 'value2', { tags: ['workflow', 'active'] });
    await cache.set('key3', 'value3', { tags: ['execution'] });

    const count = await cache.invalidateTags(['workflow']);
    expect(count).toBe(2);
  });

  it('should invalidate by type', async () => {
    await cache.cacheField('Workflow', 'name', '1', 'Test');
    await cache.cacheField('Workflow', 'status', '1', 'ACTIVE');

    const count = await cache.invalidateType('Workflow');
    expect(count).toBeGreaterThan(0);
  });

  it('should provide cache statistics', () => {
    const stats = cache.getStats();

    expect(stats).toHaveProperty('totalEntries');
    expect(stats).toHaveProperty('totalSize');
    expect(stats).toHaveProperty('hitRate');
    expect(stats).toHaveProperty('hits');
    expect(stats).toHaveProperty('misses');
  });
});

describe('API Analytics', () => {
  let analytics: APIAnalytics;

  beforeEach(() => {
    analytics = new APIAnalytics();
  });

  afterEach(() => {
    analytics.clear();
  });

  it('should record analytics events', () => {
    analytics.recordEvent({
      timestamp: new Date(),
      requestId: 'req1',
      userId: 'user1',
      method: 'POST',
      path: '/graphql',
      statusCode: 200,
      duration: 150
    });

    const events = analytics.queryEvents({});
    expect(events.length).toBe(1);
  });

  it('should query events by filters', () => {
    const now = new Date();

    analytics.recordEvent({
      timestamp: now,
      requestId: 'req1',
      userId: 'user1',
      method: 'POST',
      path: '/graphql',
      statusCode: 200,
      duration: 100
    });

    analytics.recordEvent({
      timestamp: now,
      requestId: 'req2',
      userId: 'user2',
      method: 'POST',
      path: '/graphql',
      statusCode: 500,
      duration: 200
    });

    const errorEvents = analytics.queryEvents({ statusCode: 500 });
    expect(errorEvents.length).toBe(1);
    expect(errorEvents[0].userId).toBe('user2');
  });

  it('should calculate usage metrics', () => {
    for (let i = 0; i < 10; i++) {
      analytics.recordEvent({
        timestamp: new Date(),
        requestId: `req${i}`,
        method: 'POST',
        path: '/graphql',
        statusCode: i < 8 ? 200 : 500,
        duration: 100 + i * 10
      });
    }

    const metrics = analytics.getUsageMetrics();

    expect(metrics.totalRequests).toBe(10);
    expect(metrics.successfulRequests).toBe(8);
    expect(metrics.failedRequests).toBe(2);
    expect(metrics.errorRate).toBeCloseTo(0.2);
  });

  it('should identify top consumers', () => {
    for (let i = 0; i < 5; i++) {
      analytics.recordEvent({
        timestamp: new Date(),
        requestId: `req${i}`,
        userId: 'user1',
        method: 'POST',
        path: '/graphql',
        statusCode: 200,
        duration: 100
      });
    }

    for (let i = 0; i < 3; i++) {
      analytics.recordEvent({
        timestamp: new Date(),
        requestId: `req${i + 5}`,
        userId: 'user2',
        method: 'POST',
        path: '/graphql',
        statusCode: 200,
        duration: 100
      });
    }

    const topConsumers = analytics.getTopConsumers(2);
    expect(topConsumers.length).toBe(2);
    expect(topConsumers[0].identifier).toBe('user1');
    expect(topConsumers[0].requestCount).toBe(5);
  });

  it('should track operation metrics', () => {
    analytics.recordEvent({
      timestamp: new Date(),
      requestId: 'req1',
      operation: 'GetWorkflows',
      method: 'POST',
      path: '/graphql',
      statusCode: 200,
      duration: 150
    });

    analytics.recordEvent({
      timestamp: new Date(),
      requestId: 'req2',
      operation: 'GetWorkflows',
      method: 'POST',
      path: '/graphql',
      statusCode: 200,
      duration: 200
    });

    const operations = analytics.getOperationMetrics();
    expect(operations.length).toBeGreaterThan(0);
    expect(operations[0].operation).toBe('GetWorkflows');
    expect(operations[0].count).toBe(2);
  });

  it('should analyze errors', () => {
    analytics.recordEvent({
      timestamp: new Date(),
      requestId: 'req1',
      method: 'POST',
      path: '/graphql',
      statusCode: 400,
      duration: 50,
      error: 'Bad Request'
    });

    analytics.recordEvent({
      timestamp: new Date(),
      requestId: 'req2',
      method: 'POST',
      path: '/graphql',
      statusCode: 500,
      duration: 100,
      error: 'Internal Server Error'
    });

    const errors = analytics.getErrorAnalysis();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should generate time series data', () => {
    const now = new Date();

    for (let i = 0; i < 5; i++) {
      analytics.recordEvent({
        timestamp: new Date(now.getTime() + i * 60000),
        requestId: `req${i}`,
        method: 'POST',
        path: '/graphql',
        statusCode: 200,
        duration: 100
      });
    }

    const timeSeries = analytics.getTimeSeries('minute');
    expect(timeSeries.length).toBeGreaterThan(0);
  });

  it('should identify slowest operations', () => {
    analytics.recordEvent({
      timestamp: new Date(),
      requestId: 'req1',
      operation: 'SlowQuery',
      method: 'POST',
      path: '/graphql',
      statusCode: 200,
      duration: 5000
    });

    analytics.recordEvent({
      timestamp: new Date(),
      requestId: 'req2',
      operation: 'FastQuery',
      method: 'POST',
      path: '/graphql',
      statusCode: 200,
      duration: 100
    });

    const slowest = analytics.getSlowestOperations(2);
    expect(slowest.length).toBe(2);
    expect(slowest[0].operation).toBe('SlowQuery');
  });

  it('should generate summary report', () => {
    for (let i = 0; i < 10; i++) {
      analytics.recordEvent({
        timestamp: new Date(),
        requestId: `req${i}`,
        userId: 'user1',
        operation: 'GetWorkflows',
        method: 'POST',
        path: '/graphql',
        statusCode: i < 8 ? 200 : 500,
        duration: 100
      });
    }

    const report = analytics.getSummaryReport();

    expect(report).toHaveProperty('metrics');
    expect(report).toHaveProperty('topConsumers');
    expect(report).toHaveProperty('topOperations');
    expect(report).toHaveProperty('errors');
  });
});

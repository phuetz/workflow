/**
 * AgentOps Comprehensive Tests
 *
 * Test suite covering:
 * - Deployment pipeline (8 tests)
 * - Version control (6 tests)
 * - A/B testing (8 tests)
 * - Monitoring (6 tests)
 * - Rollback manager (6 tests)
 * - Testing framework (8 tests)
 *
 * Total: 42+ tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  deploymentPipeline,
  versionControl,
  abTesting,
  monitoring,
  rollbackManager,
  testingFramework,
} from '../index';
import type {
  Agent,
  DeploymentConfig,
  User,
  Metric,
} from '../types/agentops';

// Test fixtures
const testUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin',
};

const testAgent: Agent = {
  id: 'agent-1',
  name: 'Test Agent',
  description: 'Test agent for AgentOps',
  type: 'executor',
  version: '1.0.0',
  code: 'function execute() { return "test"; }',
  dependencies: {
    'lodash': '^4.17.21',
  },
  configuration: {
    timeout: 5000,
    retries: 3,
  },
  metadata: {
    created: Date.now(),
    updated: Date.now(),
    author: testUser,
    tags: ['test'],
  },
};

describe('AgentOps - Deployment Pipeline', () => {
  beforeEach(() => {
    // Clean up before each test
    vi.clearAllMocks();
  });

  it('should deploy agent successfully', async () => {
    const config: DeploymentConfig = {
      agent: testAgent,
      environment: 'dev',
      strategy: 'blue-green',
    };

    const result = await deploymentPipeline.deploy(config);

    expect(result).toBeDefined();
    expect(result.status).toBe('success');
    expect(result.stages).toHaveLength(5);
    expect(result.stages.every(s => s.status === 'success')).toBe(true);
    expect(result.duration).toBeGreaterThan(0);
    expect(result.duration).toBeLessThan(5000); // Should be under 5s
  });

  it('should execute all pipeline stages in order', async () => {
    const config: DeploymentConfig = {
      agent: testAgent,
      environment: 'dev',
      strategy: 'blue-green',
    };

    const result = await deploymentPipeline.deploy(config);

    const stageNames = result.stages.map(s => s.name);
    expect(stageNames).toEqual(['build', 'test', 'validate', 'deploy', 'verify']);
  });

  it('should support canary deployment strategy', async () => {
    const config: DeploymentConfig = {
      agent: testAgent,
      environment: 'prod',
      strategy: 'canary',
      canaryConfig: {
        steps: [10, 50, 100],
        stepDuration: 1000,
        successCriteria: {
          errorRate: 0.01,
          latency: 100,
        },
      },
    };

    const result = await deploymentPipeline.deploy(config);

    expect(result.status).toBe('success');
    const deployStage = result.stages.find(s => s.name === 'deploy');
    expect(deployStage?.artifacts?.strategy).toBe('canary');
  });

  it('should support rolling deployment strategy', async () => {
    const config: DeploymentConfig = {
      agent: testAgent,
      environment: 'staging',
      strategy: 'rolling',
      rollingConfig: {
        batchSize: 2,
        batchDelay: 1000,
      },
    };

    const result = await deploymentPipeline.deploy(config);

    expect(result.status).toBe('success');
    const deployStage = result.stages.find(s => s.name === 'deploy');
    expect(deployStage?.artifacts?.strategy).toBe('rolling');
  });

  it('should skip test stage if testing disabled', async () => {
    const config: DeploymentConfig = {
      agent: testAgent,
      environment: 'dev',
      strategy: 'blue-green',
      testConfig: undefined,
    };

    const result = await deploymentPipeline.deploy(config);

    const testStage = result.stages.find(s => s.name === 'test');
    expect(testStage?.status).toBe('skipped');
  });

  it('should perform health checks', async () => {
    const config: DeploymentConfig = {
      agent: testAgent,
      environment: 'dev',
      strategy: 'blue-green',
    };

    const result = await deploymentPipeline.deploy(config);

    expect(result.healthCheck).toBeDefined();
    expect(result.healthCheck?.status).toBe('healthy');
    expect(result.healthCheck?.checks.length).toBeGreaterThan(0);
  });

  it('should emit pipeline events', async () => {
    const events: string[] = [];

    deploymentPipeline.on('stage-started', () => events.push('stage-started'));
    deploymentPipeline.on('stage-completed', () => events.push('stage-completed'));
    deploymentPipeline.on('deployment-completed', () => events.push('deployment-completed'));

    const config: DeploymentConfig = {
      agent: testAgent,
      environment: 'dev',
      strategy: 'blue-green',
    };

    await deploymentPipeline.deploy(config);

    expect(events).toContain('stage-started');
    expect(events).toContain('stage-completed');
    expect(events).toContain('deployment-completed');
  });

  it('should get deployment by ID', async () => {
    const config: DeploymentConfig = {
      agent: testAgent,
      environment: 'dev',
      strategy: 'blue-green',
    };

    const result = await deploymentPipeline.deploy(config);
    const retrieved = deploymentPipeline.getDeployment(result.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(result.id);
  });
});

describe('AgentOps - Version Control', () => {
  beforeEach(async () => {
    // Initialize with a commit
    await versionControl.commit(testAgent, 'Initial commit', testUser);
  });

  it('should commit agent changes', async () => {
    const modifiedAgent = {
      ...testAgent,
      code: 'function execute() { return "modified"; }',
    };

    const version = await versionControl.commit(modifiedAgent, 'Update code', testUser);

    expect(version).toBeDefined();
    expect(version.agentId).toBe(testAgent.id);
    expect(version.message).toBe('Update code');
    expect(version.changes.length).toBeGreaterThan(0);
  });

  it('should create branches', async () => {
    const branch = await versionControl.createBranch(
      testAgent.id,
      'feature-branch',
      'main',
      testUser
    );

    expect(branch).toBeDefined();
    expect(branch.name).toBe('feature-branch');
    expect(branch.agentId).toBe(testAgent.id);
  });

  it('should get version history', async () => {
    await versionControl.commit(testAgent, 'Commit 1', testUser);
    await versionControl.commit(testAgent, 'Commit 2', testUser);
    await versionControl.commit(testAgent, 'Commit 3', testUser);

    const history = versionControl.getHistory(testAgent.id);

    expect(history.length).toBeGreaterThanOrEqual(3);
    expect(history[0].message).toBe('Commit 3'); // Most recent first
  });

  it('should tag versions', async () => {
    const version = await versionControl.commit(testAgent, 'Release commit', testUser);

    await versionControl.tagVersion(version.id, 'v1.0.0', testUser);

    const tagged = versionControl.getVersion(version.id);
    expect(tagged?.tags).toContain('v1.0.0');
  });

  it('should get versions by tag', async () => {
    const version = await versionControl.commit(testAgent, 'Tagged commit', testUser);
    await versionControl.tagVersion(version.id, 'stable', testUser);

    const tagged = versionControl.getVersionsByTag('stable');

    expect(tagged.length).toBeGreaterThan(0);
    expect(tagged[0].tags).toContain('stable');
  });

  it('should detect changes between versions', async () => {
    const v1 = await versionControl.commit(testAgent, 'Version 1', testUser);

    const modifiedAgent = {
      ...testAgent,
      code: 'function execute() { return "v2"; }',
    };
    const v2 = await versionControl.commit(modifiedAgent, 'Version 2', testUser);

    const diff = versionControl.diff(v1.id, v2.id);

    expect(diff.length).toBeGreaterThan(0);
    expect(diff.some(c => c.type === 'code')).toBe(true);
  });
});

describe('AgentOps - A/B Testing', () => {
  let versionA: any;
  let versionB: any;

  beforeEach(async () => {
    versionA = await versionControl.commit(testAgent, 'Version A', testUser);

    const modifiedAgent = {
      ...testAgent,
      code: 'function execute() { return "optimized"; }',
    };
    versionB = await versionControl.commit(modifiedAgent, 'Version B', testUser);
  });

  it('should create A/B test', async () => {
    const metrics: Metric[] = [
      { name: 'latency', type: 'histogram', unit: 'ms', higherIsBetter: false },
      { name: 'success_rate', type: 'rate', unit: 'percent', higherIsBetter: true },
    ];

    const test = await abTesting.createTest(
      'Performance Test',
      'Testing optimized version',
      testAgent.id,
      versionA,
      versionB,
      metrics,
      { trafficSplit: 0.5, duration: 60000, minSampleSize: 100 },
      testUser
    );

    expect(test).toBeDefined();
    expect(test.name).toBe('Performance Test');
    expect(test.variantA.version.id).toBe(versionA.id);
    expect(test.variantB.version.id).toBe(versionB.id);
  });

  it('should start and stop tests', async () => {
    const metrics: Metric[] = [
      { name: 'latency', type: 'histogram', unit: 'ms', higherIsBetter: false },
    ];

    const test = await abTesting.createTest(
      'Test',
      'Description',
      testAgent.id,
      versionA,
      versionB,
      metrics,
      {},
      testUser
    );

    await abTesting.startTest(test.id);
    let activeTest = abTesting.getTest(test.id);
    expect(activeTest?.status).toBe('running');

    await abTesting.stopTest(test.id);
    activeTest = abTesting.getTest(test.id);
    expect(activeTest?.status).toBe('stopped');
  });

  it('should route traffic between variants', async () => {
    const metrics: Metric[] = [
      { name: 'latency', type: 'histogram', unit: 'ms', higherIsBetter: false },
    ];

    const test = await abTesting.createTest(
      'Test',
      'Description',
      testAgent.id,
      versionA,
      versionB,
      metrics,
      { trafficSplit: 0.5 },
      testUser
    );

    await abTesting.startTest(test.id);

    const routes: string[] = [];
    for (let i = 0; i < 100; i++) {
      routes.push(abTesting.routeToVariant(test.id));
    }

    const aCount = routes.filter(r => r === 'A').length;
    const bCount = routes.filter(r => r === 'B').length;

    // Should be roughly 50/50 split
    expect(aCount).toBeGreaterThan(30);
    expect(aCount).toBeLessThan(70);
    expect(bCount).toBeGreaterThan(30);
    expect(bCount).toBeLessThan(70);
  });

  it('should record metrics', async () => {
    const metrics: Metric[] = [
      { name: 'latency', type: 'histogram', unit: 'ms', higherIsBetter: false },
    ];

    const test = await abTesting.createTest(
      'Test',
      'Description',
      testAgent.id,
      versionA,
      versionB,
      metrics,
      {},
      testUser
    );

    await abTesting.startTest(test.id);

    abTesting.recordMetric(test.id, 'A', 'latency', 50);
    abTesting.recordMetric(test.id, 'A', 'latency', 60);
    abTesting.recordMetric(test.id, 'B', 'latency', 30);
    abTesting.recordMetric(test.id, 'B', 'latency', 40);

    const updated = abTesting.getTest(test.id);
    expect(updated?.variantA.metrics.latency.length).toBe(2);
    expect(updated?.variantB.metrics.latency.length).toBe(2);
  });

  it('should calculate sample size', () => {
    const sampleSize = abTesting.calculateSampleSize(
      0.1,   // baseline conversion rate
      0.1,   // minimum detectable effect (10% relative)
      0.05,  // alpha (95% confidence)
      0.8    // power (80%)
    );

    expect(sampleSize).toBeGreaterThan(0);
    expect(sampleSize).toBeGreaterThanOrEqual(100); // Minimum
  });

  it('should complete test and analyze results', async () => {
    const metrics: Metric[] = [
      { name: 'latency', type: 'histogram', unit: 'ms', higherIsBetter: false },
    ];

    const test = await abTesting.createTest(
      'Test',
      'Description',
      testAgent.id,
      versionA,
      versionB,
      metrics,
      { minSampleSize: 10 },
      testUser
    );

    await abTesting.startTest(test.id);

    // Record enough samples
    for (let i = 0; i < 20; i++) {
      abTesting.recordMetric(test.id, 'A', 'latency', 50 + Math.random() * 10);
      abTesting.recordMetric(test.id, 'B', 'latency', 30 + Math.random() * 10);
    }

    const completed = await abTesting.completeTest(test.id);

    expect(completed.status).toBe('completed');
    expect(completed.results).toBeDefined();
    expect(completed.results?.winner).toBeDefined();
  });

  it('should get active test for agent', async () => {
    const metrics: Metric[] = [
      { name: 'latency', type: 'histogram', unit: 'ms', higherIsBetter: false },
    ];

    const test = await abTesting.createTest(
      'Test',
      'Description',
      testAgent.id,
      versionA,
      versionB,
      metrics,
      {},
      testUser
    );

    await abTesting.startTest(test.id);

    const active = abTesting.getActiveTest(testAgent.id);
    expect(active).toBeDefined();
    expect(active?.id).toBe(test.id);
  });

  it('should prevent multiple active tests for same agent', async () => {
    const metrics: Metric[] = [
      { name: 'latency', type: 'histogram', unit: 'ms', higherIsBetter: false },
    ];

    const test1 = await abTesting.createTest(
      'Test 1',
      'Description',
      testAgent.id,
      versionA,
      versionB,
      metrics,
      {},
      testUser
    );

    await abTesting.startTest(test1.id);

    await expect(
      abTesting.createTest(
        'Test 2',
        'Description',
        testAgent.id,
        versionA,
        versionB,
        metrics,
        {},
        testUser
      )
    ).rejects.toThrow();
  });
});

describe('AgentOps - Monitoring', () => {
  beforeEach(() => {
    // Clean up monitoring state
  });

  it('should record metrics', () => {
    monitoring.recordMetrics(testAgent.id, {
      uptime: 0.99,
      latency: { p50: 50, p95: 100, p99: 150, max: 200, min: 20, mean: 60 },
      successRate: 0.95,
      errorRate: 0.05,
      totalRequests: 1000,
    });

    const metrics = monitoring.getCurrentMetrics(testAgent.id);

    expect(metrics).toBeDefined();
    expect(metrics.uptime).toBe(0.99);
    expect(metrics.latency.p95).toBe(100);
  });

  it('should record individual executions', () => {
    monitoring.recordExecution(testAgent.id, true, 50, undefined, 0.01);
    monitoring.recordExecution(testAgent.id, true, 60, undefined, 0.01);
    monitoring.recordExecution(testAgent.id, false, 100, 'timeout', 0);

    const metrics = monitoring.getCurrentMetrics(testAgent.id);

    expect(metrics.totalRequests).toBe(3);
    expect(metrics.successfulRequests).toBe(2);
    expect(metrics.failedRequests).toBe(1);
    expect(metrics.successRate).toBeCloseTo(0.67, 1);
  });

  it('should get historical metrics', () => {
    const now = Date.now();

    monitoring.recordMetrics(testAgent.id, {
      uptime: 0.99,
      latency: { p50: 50, p95: 100, p99: 150, max: 200, min: 20, mean: 60 },
      successRate: 0.95,
      errorRate: 0.05,
      totalRequests: 100,
    });

    const history = monitoring.getHistoricalMetrics(testAgent.id, now - 60000, now + 60000);

    expect(history.length).toBeGreaterThan(0);
  });

  it('should create alerts', () => {
    const alert = monitoring.createAlert({
      name: 'High Error Rate',
      agentId: testAgent.id,
      conditions: [
        {
          metric: 'errorRate',
          operator: '>',
          threshold: 0.1,
          duration: 60000,
        },
      ],
      channels: [
        {
          type: 'email',
          config: { to: 'admin@example.com' },
        },
      ],
      status: 'active',
      creator: testUser,
    });

    expect(alert).toBeDefined();
    expect(alert.id).toBeDefined();
    expect(alert.name).toBe('High Error Rate');
  });

  it('should get alerts for agent', () => {
    monitoring.createAlert({
      name: 'Alert 1',
      agentId: testAgent.id,
      conditions: [],
      channels: [],
      status: 'active',
      creator: testUser,
    });

    monitoring.createAlert({
      name: 'Alert 2',
      agentId: testAgent.id,
      conditions: [],
      channels: [],
      status: 'active',
      creator: testUser,
    });

    const alerts = monitoring.getAlerts(testAgent.id);

    expect(alerts.length).toBeGreaterThanOrEqual(2);
  });

  it('should get metrics summary', () => {
    monitoring.recordExecution(testAgent.id, true, 50);
    monitoring.recordExecution(testAgent.id, true, 60);
    monitoring.recordExecution(testAgent.id, true, 70);

    const summary = monitoring.getMetricsSummary(testAgent.id, 3600000);

    expect(summary).toBeDefined();
    expect(summary.totalRequests).toBeGreaterThan(0);
  });
});

describe('AgentOps - Rollback Manager', () => {
  let version1: any;
  let version2: any;

  beforeEach(async () => {
    version1 = await versionControl.commit(testAgent, 'Version 1', testUser);

    const modifiedAgent = {
      ...testAgent,
      code: 'function execute() { return "v2"; }',
    };
    version2 = await versionControl.commit(modifiedAgent, 'Version 2', testUser);
  });

  it('should perform rollback', async () => {
    const rollback = await rollbackManager.rollback(
      testAgent.id,
      'Testing rollback',
      testUser
    );

    expect(rollback).toBeDefined();
    expect(rollback.status).toBe('success');
    expect(rollback.agentId).toBe(testAgent.id);
    expect(rollback.trigger).toBe('manual');
  });

  it('should rollback within 30 seconds', async () => {
    const start = Date.now();

    await rollbackManager.rollback(
      testAgent.id,
      'Performance test',
      testUser
    );

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(30000);
  });

  it('should get rollback history', async () => {
    await rollbackManager.rollback(testAgent.id, 'Rollback 1', testUser);
    await rollbackManager.rollback(testAgent.id, 'Rollback 2', testUser);

    const history = rollbackManager.getHistory(testAgent.id);

    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].reason).toBe('Rollback 2'); // Most recent first
  });

  it('should enable auto-rollback', () => {
    rollbackManager.enableAutoRollback(testAgent.id, {
      errorRate: 0.1,
      latency: 1000,
      timeWindow: 60000,
      minRequests: 10,
    });

    const config = rollbackManager.getAutoRollbackConfig(testAgent.id);

    expect(config).toBeDefined();
    expect(config?.errorRate).toBe(0.1);
  });

  it('should disable auto-rollback', () => {
    rollbackManager.enableAutoRollback(testAgent.id, {
      errorRate: 0.1,
      latency: 1000,
      timeWindow: 60000,
      minRequests: 10,
    });

    rollbackManager.disableAutoRollback(testAgent.id);

    // Config should still exist but be disabled
    const config = rollbackManager.getAutoRollbackConfig(testAgent.id);
    expect(config).toBeDefined();
  });

  it('should check if rollback is in progress', async () => {
    const rollbackPromise = rollbackManager.rollback(
      testAgent.id,
      'Testing',
      testUser
    );

    expect(rollbackManager.isRollbackInProgress(testAgent.id)).toBe(true);

    await rollbackPromise;

    expect(rollbackManager.isRollbackInProgress(testAgent.id)).toBe(false);
  });
});

describe('AgentOps - Testing Framework', () => {
  let suite: any;

  beforeEach(() => {
    suite = testingFramework.createTestSuite(
      'Test Suite',
      testAgent.id,
      testUser
    );
  });

  it('should create test suite', () => {
    expect(suite).toBeDefined();
    expect(suite.id).toBeDefined();
    expect(suite.agentId).toBe(testAgent.id);
  });

  it('should add unit tests', () => {
    const test = testingFramework.addUnitTest(suite.id, {
      name: 'Test 1',
      description: 'Unit test',
      input: { value: 1 },
      expectedOutput: { result: 1 },
      assertions: [
        {
          type: 'equals',
          path: 'result',
          expected: 1,
        },
      ],
      timeout: 5000,
      tags: ['unit'],
    });

    expect(test).toBeDefined();
    expect(test.id).toBeDefined();
  });

  it('should add integration tests', () => {
    const test = testingFramework.addIntegrationTest(suite.id, {
      name: 'Integration Test',
      description: 'Test workflow',
      workflow: {},
      expectedBehavior: {
        description: 'Should complete',
        preconditions: {},
        postconditions: {},
        sideEffects: [],
      },
      timeout: 10000,
      tags: ['integration'],
    });

    expect(test).toBeDefined();
  });

  it('should add performance tests', () => {
    const test = testingFramework.addPerformanceTest(suite.id, {
      name: 'Performance Test',
      description: 'Load test',
      load: 10,
      duration: 5000,
      rampUpTime: 1000,
      targets: {
        latency: 100,
        throughput: 10,
        errorRate: 0.01,
      },
      tags: ['performance'],
    });

    expect(test).toBeDefined();
  });

  it('should add load tests', () => {
    const test = testingFramework.addLoadTest(suite.id, {
      name: 'Load Test',
      description: 'High load test',
      rampUp: 5,
      peak: 50,
      duration: 10000,
      holdTime: 5000,
      targets: {
        latency: 200,
        throughput: 50,
        errorRate: 0.05,
      },
      tags: ['load'],
    });

    expect(test).toBeDefined();
  });

  it('should execute test suite', async () => {
    testingFramework.addUnitTest(suite.id, {
      name: 'Test 1',
      description: 'Unit test',
      input: { value: 1 },
      expectedOutput: { result: 1 },
      assertions: [
        {
          type: 'exists',
          path: 'success',
          expected: true,
        },
      ],
      timeout: 5000,
      tags: ['unit'],
    });

    const result = await testingFramework.executeTestSuite(
      suite.id,
      testAgent,
      testUser
    );

    expect(result).toBeDefined();
    expect(result.summary.total).toBeGreaterThan(0);
    expect(result.summary.coverage).toBeGreaterThan(0);
  }, 15000); // Longer timeout for test execution

  it('should get test suite', () => {
    const retrieved = testingFramework.getTestSuite(suite.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(suite.id);
  });

  it('should get all test suites', () => {
    const suites = testingFramework.getAllTestSuites();

    expect(suites.length).toBeGreaterThan(0);
    expect(suites.some(s => s.id === suite.id)).toBe(true);
  });
});

describe('AgentOps - Integration Tests', () => {
  it('should integrate deployment with version control', async () => {
    const version = await versionControl.commit(testAgent, 'Deploy version', testUser);

    const config: DeploymentConfig = {
      agent: version.snapshot,
      environment: 'dev',
      strategy: 'blue-green',
    };

    const deployment = await deploymentPipeline.deploy(config);

    expect(deployment.status).toBe('success');
    expect(deployment.config.agent.version).toBe(version.snapshot.version);
  });

  it('should integrate monitoring with rollback', async () => {
    // Simulate high error rate
    monitoring.recordExecution(testAgent.id, false, 100, 'error');
    monitoring.recordExecution(testAgent.id, false, 100, 'error');
    monitoring.recordExecution(testAgent.id, false, 100, 'error');

    const metrics = monitoring.getCurrentMetrics(testAgent.id);
    expect(metrics.errorRate).toBeGreaterThan(0);

    // Enable auto-rollback
    rollbackManager.enableAutoRollback(testAgent.id, {
      errorRate: 0.5,
      latency: 1000,
      timeWindow: 60000,
      minRequests: 3,
    });

    // Auto-rollback should be configured
    const config = rollbackManager.getAutoRollbackConfig(testAgent.id);
    expect(config).toBeDefined();
  });

  it('should integrate A/B testing with deployment', async () => {
    const versionA = await versionControl.commit(testAgent, 'Version A', testUser);

    const modifiedAgent = {
      ...testAgent,
      code: 'function execute() { return "optimized"; }',
    };
    const versionB = await versionControl.commit(modifiedAgent, 'Version B', testUser);

    // Create A/B test
    const test = await abTesting.createTest(
      'Deployment Test',
      'Testing new version',
      testAgent.id,
      versionA,
      versionB,
      [{ name: 'latency', type: 'histogram', unit: 'ms', higherIsBetter: false }],
      {},
      testUser
    );

    // Deploy both versions
    const deployA = await deploymentPipeline.deploy({
      agent: versionA.snapshot,
      environment: 'dev',
      strategy: 'blue-green',
    });

    const deployB = await deploymentPipeline.deploy({
      agent: versionB.snapshot,
      environment: 'dev',
      strategy: 'blue-green',
    });

    expect(deployA.status).toBe('success');
    expect(deployB.status).toBe('success');
    expect(test.status).toBe('pending');
  });

  it('should integrate testing with deployment', async () => {
    // Create test suite
    const suite = testingFramework.createTestSuite(
      'Pre-deployment Tests',
      testAgent.id,
      testUser
    );

    testingFramework.addUnitTest(suite.id, {
      name: 'Validation Test',
      description: 'Validate agent',
      input: {},
      expectedOutput: {},
      assertions: [
        {
          type: 'exists',
          path: 'success',
          expected: true,
        },
      ],
      timeout: 5000,
      tags: ['validation'],
    });

    // Run tests
    const testResult = await testingFramework.executeTestSuite(
      suite.id,
      testAgent,
      testUser
    );

    expect(testResult.summary.passed).toBeGreaterThan(0);

    // Deploy if tests pass
    if (testResult.summary.failed === 0) {
      const deployment = await deploymentPipeline.deploy({
        agent: testAgent,
        environment: 'dev',
        strategy: 'blue-green',
      });

      expect(deployment.status).toBe('success');
    }
  }, 15000);
});

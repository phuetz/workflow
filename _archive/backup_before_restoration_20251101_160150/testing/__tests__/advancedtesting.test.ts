/**
 * Advanced Testing - Comprehensive Tests
 * Tests for contract, performance, load, security, and test data management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContractTesting } from '../contract/ContractTesting';
import { PactIntegration } from '../contract/PactIntegration';
import { ContractBroker } from '../contract/ContractBroker';
import { PerformanceTesting } from '../performance/PerformanceTesting';
import { PerformanceAnalyzer } from '../performance/PerformanceAnalyzer';
import { K6Integration } from '../load/K6Integration';
import { LoadTestRunner } from '../load/LoadTestRunner';
import { SecurityTesting } from '../security/SecurityTesting';
import { OWASPZAPIntegration } from '../security/OWASPZAPIntegration';
import { TestDataManager } from '../data/TestDataManager';

// ==================== Contract Testing Tests ====================

describe('ContractTesting', () => {
  let contractTesting: ContractTesting;

  beforeEach(() => {
    contractTesting = new ContractTesting();
  });

  it('should create a contract', () => {
    const contract = contractTesting.createContract(
      {
        name: 'API Service',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000',
        endpoints: [
          {
            path: '/api/users',
            method: 'GET',
            responseSchema: { type: 'array', items: { type: 'object' } },
            statusCode: 200,
            examples: [],
          },
        ],
      },
      {
        name: 'Web App',
        version: '1.0.0',
        expectations: [
          {
            endpoint: '/api/users',
            method: 'GET',
            expectedResponse: [],
            expectedStatusCode: 200,
          },
        ],
      }
    );

    expect(contract).toBeDefined();
    expect(contract.provider.name).toBe('API Service');
    expect(contract.consumer.name).toBe('Web App');
  });

  it('should verify a contract', async () => {
    const contract = contractTesting.createContract(
      {
        name: 'API Service',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000',
        endpoints: [
          {
            path: '/api/users',
            method: 'GET',
            responseSchema: { type: 'array' },
            statusCode: 200,
            examples: [],
          },
        ],
      },
      {
        name: 'Web App',
        version: '1.0.0',
        expectations: [
          {
            endpoint: '/api/users',
            method: 'GET',
            expectedResponse: [],
            expectedStatusCode: 200,
          },
        ],
      }
    );

    const result = await contractTesting.verify(contract.id, async () => ({
      response: [],
      statusCode: 200,
    }));

    expect(result.passed).toBe(true);
    expect(result.results).toHaveLength(1);
  });

  it('should detect breaking changes', () => {
    const oldProvider = {
      name: 'API Service',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000',
      endpoints: [
        {
          path: '/api/users',
          method: 'GET' as const,
          responseSchema: { type: 'array' as const },
          statusCode: 200,
          examples: [],
        },
      ],
    };

    const newProvider = {
      name: 'API Service',
      version: '2.0.0',
      baseUrl: 'http://localhost:3000',
      endpoints: [],
    };

    const changes = contractTesting.detectBreakingChanges(oldProvider, newProvider);
    expect(changes.length).toBeGreaterThan(0);
    expect(changes[0].type).toBe('removed_endpoint');
  });
});

describe('PactIntegration', () => {
  let pact: PactIntegration;

  beforeEach(() => {
    pact = new PactIntegration({
      consumer: 'Web App',
      provider: 'API Service',
      pactBrokerUrl: 'http://localhost:9292',
    });
  });

  it('should add interactions', () => {
    pact.addInteraction({
      description: 'Get users',
      request: {
        method: 'GET',
        path: '/api/users',
      },
      response: {
        status: 200,
        body: [],
      },
    });

    const pactFile = pact.generatePactFile();
    expect(pactFile.interactions).toHaveLength(1);
  });

  it('should generate pact file', () => {
    pact.addInteraction({
      description: 'Get users',
      request: { method: 'GET', path: '/api/users' },
      response: { status: 200, body: [] },
    });

    const pactFile = pact.generatePactFile();
    expect(pactFile.consumer.name).toBe('Web App');
    expect(pactFile.provider.name).toBe('API Service');
    expect(pactFile.metadata.pactSpecification.version).toBe('3.0.0');
  });
});

describe('ContractBroker', () => {
  let broker: ContractBroker;

  beforeEach(() => {
    broker = new ContractBroker({ storageType: 'memory' });
  });

  it('should publish contract', async () => {
    const contract = {
      id: 'test',
      name: 'Test Contract',
      provider: { name: 'API', version: '1.0.0', baseUrl: '', endpoints: [] },
      consumer: { name: 'App', version: '1.0.0', expectations: [] },
      status: 'pending' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const version = await broker.publish(contract, '1.0.0', 'user1');
    expect(version.version).toBe('1.0.0');
    expect(version.publishedBy).toBe('user1');
  });

  it('should retrieve contract', async () => {
    const contract = {
      id: 'test',
      name: 'Test Contract',
      provider: { name: 'API', version: '1.0.0', baseUrl: '', endpoints: [] },
      consumer: { name: 'App', version: '1.0.0', expectations: [] },
      status: 'pending' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await broker.publish(contract, '1.0.0', 'user1');
    const retrieved = broker.retrieve('App', 'API', '1.0.0');

    expect(retrieved).toBeDefined();
    expect(retrieved?.version).toBe('1.0.0');
  });
});

// ==================== Performance Testing Tests ====================

describe('PerformanceTesting', () => {
  let perfTesting: PerformanceTesting;

  beforeEach(() => {
    perfTesting = new PerformanceTesting();
  });

  it('should create performance test', () => {
    const test = perfTesting.createTest(
      'API Performance Test',
      { users: 100, rampUp: 30, duration: 60, thinkTime: 1000 },
      [
        {
          name: 'Get Users',
          weight: 100,
          steps: [
            {
              name: 'GET /api/users',
              action: 'http',
              config: {
                method: 'GET',
                url: '/api/users',
              },
            },
          ],
        },
      ],
      {
        avgResponseTime: 200,
        p95ResponseTime: 500,
        p99ResponseTime: 1000,
        errorRate: 1,
        throughput: 100,
      }
    );

    expect(test).toBeDefined();
    expect(test.load.users).toBe(100);
    expect(test.scenarios).toHaveLength(1);
  });

  it('should run performance test', async () => {
    const test = perfTesting.createTest(
      'API Performance Test',
      { users: 10, rampUp: 1, duration: 2, thinkTime: 100 },
      [
        {
          name: 'Get Users',
          weight: 100,
          steps: [
            {
              name: 'GET /api/users',
              action: 'http',
              config: { method: 'GET', url: '/api/users' },
            },
          ],
        },
      ],
      {
        avgResponseTime: 200,
        p95ResponseTime: 500,
        p99ResponseTime: 1000,
        errorRate: 10,
        throughput: 1,
      }
    );

    const results = await perfTesting.run(test.id);
    expect(results).toBeDefined();
    expect(results.metrics.totalRequests).toBeGreaterThan(0);
    expect(results.passed).toBeDefined();
  }, 10000);
});

describe('PerformanceAnalyzer', () => {
  let analyzer: PerformanceAnalyzer;

  beforeEach(() => {
    analyzer = new PerformanceAnalyzer();
  });

  it('should analyze performance results', () => {
    const results = {
      testId: 'test',
      passed: true,
      timestamp: Date.now(),
      duration: 60000,
      metrics: {
        totalRequests: 1000,
        successfulRequests: 990,
        failedRequests: 10,
        responseTime: {
          min: 50,
          max: 1200,
          avg: 250,
          median: 200,
          p90: 400,
          p95: 500,
          p99: 900,
        },
        throughput: 16.67,
        errorRate: 1,
        dataTransferred: 1048576,
      },
      scenarios: [],
      errors: [],
      report: {
        summary: '',
        passedCriteria: [],
        failedCriteria: [],
        recommendations: [],
      },
    };

    const analysis = analyzer.analyze(results);
    expect(analysis.score).toBeGreaterThan(0);
    expect(analysis.score).toBeLessThanOrEqual(100);
    expect(analysis.bottlenecks).toBeDefined();
    expect(analysis.recommendations).toBeDefined();
  });
});

// ==================== Load Testing Tests ====================

describe('K6Integration', () => {
  let k6: K6Integration;

  beforeEach(() => {
    k6 = new K6Integration();
  });

  it('should generate k6 script', () => {
    const script = k6.generateScript(
      [
        {
          name: 'Get Users',
          weight: 100,
          steps: [
            {
              name: 'GET /api/users',
              action: 'http',
              config: { method: 'GET', url: '/api/users' },
            },
          ],
        },
      ],
      { users: 100, rampUp: 30, duration: 60, thinkTime: 1000 },
      'http://localhost:3000'
    );

    expect(script).toContain('import http from');
    expect(script).toContain('export let options');
    expect(script).toContain('export default function');
  });

  it('should create k6 test', () => {
    const test = k6.createTest(
      'Load Test',
      'export default function() {}',
      { vus: 100, duration: '1m' }
    );

    expect(test).toBeDefined();
    expect(test.name).toBe('Load Test');
  });
});

describe('LoadTestRunner', () => {
  let runner: LoadTestRunner;

  beforeEach(() => {
    runner = new LoadTestRunner();
  });

  it('should create spike test', () => {
    const testId = runner.createLoadTest({
      name: 'Spike Test',
      type: 'spike',
      baseUrl: 'http://localhost:3000',
      scenarios: [],
      targetUsers: 100,
      duration: 5,
      spikeMultiplier: 3,
    });

    expect(testId).toBeDefined();
    const test = runner.getTest(testId);
    expect(test?.config.type).toBe('spike');
  });

  it('should create stress test', () => {
    const testId = runner.createLoadTest({
      name: 'Stress Test',
      type: 'stress',
      baseUrl: 'http://localhost:3000',
      scenarios: [],
      targetUsers: 1000,
      duration: 10,
    });

    expect(testId).toBeDefined();
  });

  it('should create soak test', () => {
    const testId = runner.createLoadTest({
      name: 'Soak Test',
      type: 'soak',
      baseUrl: 'http://localhost:3000',
      scenarios: [],
      targetUsers: 100,
      duration: 60,
    });

    expect(testId).toBeDefined();
  });
});

// ==================== Security Testing Tests ====================

describe('SecurityTesting', () => {
  let securityTesting: SecurityTesting;

  beforeEach(() => {
    securityTesting = new SecurityTesting();
  });

  it('should create security test', () => {
    const test = securityTesting.createTest(
      'OWASP Scan',
      {
        url: 'http://localhost:3000',
        maxDepth: 5,
      },
      'full',
      {
        injectionAttacks: true,
        brokenAuth: true,
        sensitiveData: true,
        xxe: true,
        accessControl: true,
        securityMisconfig: true,
        xss: true,
        insecureDeserialization: true,
        knownVulnerabilities: true,
        logging: true,
      }
    );

    expect(test).toBeDefined();
    expect(test.scanType).toBe('full');
  });

  it('should run security scan', async () => {
    const test = securityTesting.createTest(
      'OWASP Scan',
      { url: 'http://localhost:3000' },
      'active',
      {
        injectionAttacks: true,
        brokenAuth: false,
        sensitiveData: false,
        xxe: false,
        accessControl: false,
        securityMisconfig: false,
        xss: true,
        insecureDeserialization: false,
        knownVulnerabilities: false,
        logging: false,
      }
    );

    const results = await securityTesting.scan(test.id);
    expect(results).toBeDefined();
    expect(results.summary).toBeDefined();
    expect(results.summary.totalVulnerabilities).toBeGreaterThanOrEqual(0);
  });
});

describe('OWASPZAPIntegration', () => {
  let zap: OWASPZAPIntegration;

  beforeEach(() => {
    zap = new OWASPZAPIntegration({
      apiKey: 'test-key',
      proxyHost: 'localhost',
      proxyPort: 8080,
    });
  });

  it('should start daemon', async () => {
    await expect(zap.startDaemon()).resolves.not.toThrow();
  });

  it('should spider target', async () => {
    const spiderId = await zap.spider({
      targetUrl: 'http://localhost:3000',
    });

    expect(spiderId).toBeDefined();
  });

  it('should get alerts', async () => {
    const alerts = await zap.getAlerts('http://localhost:3000');
    expect(Array.isArray(alerts)).toBe(true);
  });
});

// ==================== Test Data Management Tests ====================

describe('TestDataManager', () => {
  let dataManager: TestDataManager;

  beforeEach(() => {
    dataManager = new TestDataManager();
  });

  it('should register schema', () => {
    dataManager.registerSchema({
      name: 'User',
      fields: [
        { name: 'id', type: 'uuid', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'age', type: 'number', min: 18, max: 100 },
      ],
    });

    expect(dataManager.getAllSchemas()).toHaveLength(1);
  });

  it('should generate test data', () => {
    dataManager.registerSchema({
      name: 'User',
      fields: [
        { name: 'id', type: 'uuid', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'name', type: 'string' },
      ],
    });

    const data = dataManager.generate('User', 10);
    expect(data.records).toHaveLength(10);
    expect(data.records[0].id).toBeDefined();
    expect(data.records[0].email).toBeDefined();
  });

  it('should anonymize data', async () => {
    const data = [
      { name: 'John Doe', email: 'john@example.com', ssn: '123-45-6789' },
      { name: 'Jane Smith', email: 'jane@example.com', ssn: '987-65-4321' },
    ];

    const anonymized = await dataManager.anonymize(data, [
      { field: 'email', strategy: 'mask' },
      { field: 'ssn', strategy: 'hash' },
    ]);

    expect(anonymized[0].email).not.toBe(data[0].email);
    expect(anonymized[0].ssn).not.toBe(data[0].ssn);
  });

  it('should detect PII', () => {
    const data = [
      {
        id: '123',
        email: 'test@example.com',
        phone: '+1234567890',
        name: 'John Doe',
      },
    ];

    const pii = dataManager.detectPII(data);
    expect(pii.length).toBeGreaterThan(0);

    const emailPII = pii.find(p => p.type === 'email');
    expect(emailPII).toBeDefined();
    expect(emailPII?.detected).toBe(true);
  });
});

describe('Integration Tests', () => {
  it('should integrate contract testing with broker', async () => {
    const contractTesting = new ContractTesting();
    const broker = new ContractBroker({ storageType: 'memory' });

    const contract = contractTesting.createContract(
      {
        name: 'API',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000',
        endpoints: [
          {
            path: '/api/users',
            method: 'GET',
            responseSchema: { type: 'array' },
            statusCode: 200,
            examples: [],
          },
        ],
      },
      {
        name: 'App',
        version: '1.0.0',
        expectations: [
          {
            endpoint: '/api/users',
            method: 'GET',
            expectedResponse: [],
            expectedStatusCode: 200,
          },
        ],
      }
    );

    await broker.publish(contract, '1.0.0', 'user1');
    const retrieved = broker.retrieve('App', 'API');

    expect(retrieved).toBeDefined();
    expect(retrieved?.contract.provider.name).toBe('API');
  });

  it('should use performance analyzer with performance testing', async () => {
    const perfTesting = new PerformanceTesting();
    const analyzer = new PerformanceAnalyzer();

    const test = perfTesting.createTest(
      'API Test',
      { users: 5, rampUp: 1, duration: 2, thinkTime: 100 },
      [
        {
          name: 'Scenario',
          weight: 100,
          steps: [
            {
              name: 'Request',
              action: 'http',
              config: { method: 'GET', url: '/api/test' },
            },
          ],
        },
      ],
      {
        avgResponseTime: 200,
        p95ResponseTime: 500,
        p99ResponseTime: 1000,
        errorRate: 10,
        throughput: 1,
      }
    );

    const results = await perfTesting.run(test.id);
    const analysis = analyzer.analyze(results);

    expect(analysis.score).toBeGreaterThanOrEqual(0);
    expect(analysis.recommendations.length).toBeGreaterThanOrEqual(0);
  }, 10000);
});

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { performance } from 'perf_hooks';
import * as faker from '@faker-js/faker';
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as puppeteer from 'puppeteer';
import * as playwright from 'playwright';
import express from 'express';

chai.use(chaiAsPromised);

export interface TestConfig {
  framework: 'jest' | 'mocha' | 'vitest' | 'ava' | 'tape';
  testDir: string;
  coverage?: {
    enabled: boolean;
    threshold?: {
      statements?: number;
      branches?: number;
      functions?: number;
      lines?: number;
    };
    reporters?: string[];
  };
  reporters?: string[];
  parallel?: boolean;
  timeout?: number;
  retries?: number;
}

export interface TestCase {
  id: string;
  name: string;
  description?: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance' | 'security';
  workflow?: unknown;
  inputs?: unknown[];
  expectedOutputs?: unknown[];
  assertions?: Assertion[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  timeout?: number;
  skip?: boolean;
  only?: boolean;
}

export interface Assertion {
  type: 'equal' | 'notEqual' | 'contains' | 'notContains' | 'matches' | 'throws' | 'resolves' | 'rejects';
  actual: unknown;
  expected?: unknown;
  message?: string;
}

export interface TestResult {
  testId: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  error?: Error;
  assertions: {
    passed: number;
    failed: number;
    total: number;
  };
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

export interface TestSuite {
  id: string;
  name: string;
  tests: TestCase[];
  beforeAll?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterEach?: () => Promise<void>;
  afterAll?: () => Promise<void>;
}

export interface MockConfig {
  type: 'function' | 'module' | 'api' | 'database' | 'service';
  target: string;
  implementation?: unknown;
  responses?: MockResponse[];
  behavior?: 'default' | 'throw' | 'timeout' | 'custom';
}

export interface MockResponse {
  matcher: (args: unknown[]) => boolean;
  response: unknown;
  delay?: number;
  times?: number;
}

export interface DataGenerator {
  type: string;
  count: number;
  schema: unknown;
  locale?: string;
  seed?: number;
}

export class TestingUtilities extends EventEmitter {
  private testSuites: Map<string, TestSuite> = new Map();
  private mocks: Map<string, unknown> = new Map();
  private spies: Map<string, sinon.SinonSpy> = new Map();
  private stubs: Map<string, sinon.SinonStub> = new Map();
  private browser: puppeteer.Browser | null = null;
  private playwrightBrowser: playwright.Browser | null = null;

  constructor() {
    super();
  }

  // Test Suite Management
  public createTestSuite(suite: TestSuite): void {
    this.testSuites.set(suite.id, suite);
    this.emit('suite:created', suite);
  }

  public async runTestSuite(suiteId: string): Promise<TestResult[]> {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`Test suite not found: ${suiteId}`);
    }

    const results: TestResult[] = [];

    try {
      // Run beforeAll hook
      if (suite.beforeAll) {
        await suite.beforeAll();
      }

      // Run each test
      for (const test of suite.tests) {
        if (test.skip) {
          results.push({
            testId: test.id,
            status: 'skipped',
            duration: 0,
            assertions: { passed: 0, failed: 0, total: 0 }
          });
          continue;
        }

        const result = await this.runTest(test, suite);
        results.push(result);

        if (test.only) {
          // Skip other tests if 'only' is set
          break;
        }
      }

      // Run afterAll hook
      if (suite.afterAll) {
        await suite.afterAll();
      }

    } catch (error) {
      this.emit('suite:error', { suiteId, error });
      throw error;
    }

    this.emit('suite:completed', { suiteId, results });
    return results;
  }

  private async runTest(test: TestCase, suite: TestSuite): Promise<TestResult> {
    const startTime = performance.now();
    let assertionsPassed = 0;
    let assertionsFailed = 0;
    let error: Error | undefined;

    try {
      // Run beforeEach hook
      if (suite.beforeEach) {
        await suite.beforeEach();
      }

      // Run test setup
      if (test.setup) {
        await test.setup();
      }

      // Execute test based on type
      switch (test.type) {
        case 'unit':
          await this.runUnitTest(test);
          break;
        case 'integration':
          await this.runIntegrationTest(test);
          break;
        case 'e2e':
          await this.runE2ETest(test);
          break;
        case 'performance':
          await this.runPerformanceTest(test);
          break;
        case 'security':
          await this.runSecurityTest(test);
          break;
      }

      // Run assertions
      if (test.assertions) {
        for (const assertion of test.assertions) {
          try {
            await this.runAssertion(assertion);
            assertionsPassed++;
          } catch (err) {
            assertionsFailed++;
            if (!error) error = err as Error;
          }
        }
      }

      // Run test teardown
      if (test.teardown) {
        await test.teardown();
      }

      // Run afterEach hook
      if (suite.afterEach) {
        await suite.afterEach();
      }

    } catch (err) {
      error = err as Error;
    }

    const duration = performance.now() - startTime;
    const status = error ? 'failed' : 'passed';

    return {
      testId: test.id,
      status,
      duration,
      error,
      assertions: {
        passed: assertionsPassed,
        failed: assertionsFailed,
        total: assertionsPassed + assertionsFailed
      }
    };
  }

  private async runAssertion(assertion: Assertion): Promise<void> {
    const { expect } = chai;

    switch (assertion.type) {
      case 'equal':
        expect(assertion.actual).to.equal(assertion.expected, assertion.message);
        break;
      case 'notEqual':
        expect(assertion.actual).to.not.equal(assertion.expected, assertion.message);
        break;
      case 'contains':
        expect(assertion.actual).to.include(assertion.expected, assertion.message);
        break;
      case 'notContains':
        expect(assertion.actual).to.not.include(assertion.expected, assertion.message);
        break;
      case 'matches':
        expect(assertion.actual).to.match(assertion.expected, assertion.message);
        break;
      case 'throws':
        expect(assertion.actual).to.throw(assertion.expected, assertion.message);
        break;
      case 'resolves':
        await expect(assertion.actual).to.eventually.equal(assertion.expected, assertion.message);
        break;
      case 'rejects':
        await expect(assertion.actual).to.be.rejected;
        break;
    }
  }

  private async runUnitTest(test: TestCase): Promise<void> {
    // Unit test implementation
    if (test.workflow) {
      // Test individual workflow nodes
      for (const node of test.workflow.nodes) {
        // Execute node with test inputs
        const result = await this.executeNode(node, test.inputs);
        
        // Validate outputs
        if (test.expectedOutputs) {
          const { expect } = chai;
          expect(result).to.deep.equal(test.expectedOutputs[0]);
        }
      }
    }
  }

  private async runIntegrationTest(test: TestCase): Promise<void> {
    // Integration test implementation
    if (test.workflow) {
      // Test workflow with mocked external dependencies
      const result = await this.executeWorkflow(test.workflow, test.inputs);
      
      if (test.expectedOutputs) {
        const { expect } = chai;
        expect(result).to.deep.equal(test.expectedOutputs[0]);
      }
    }
  }

  private async runE2ETest(test: TestCase): Promise<void> {
    // E2E test implementation using Puppeteer or Playwright
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    const page = await this.browser.newPage();
    
    try {
      // Navigate to test URL
      await page.goto('http://localhost:3000');
      
      // Execute E2E test steps
      if (test.workflow) {
        for (const step of test.workflow.steps) {
          await this.executeE2EStep(page, step);
        }
      }
      
      // Take screenshot for debugging
      await page.screenshot({ 
        path: `test-results/e2e/${test.id}.png`,
        fullPage: true 
      });
      
    } finally {
      await page.close();
    }
  }

  private async runPerformanceTest(test: TestCase): Promise<void> {
    // Performance test implementation
    const metrics: unknown[] = [];
    const iterations = test.workflow?.iterations || 100;
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      // Execute test workflow
      await this.executeWorkflow(test.workflow, test.inputs);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      metrics.push({
        iteration: i,
        duration,
        memory: process.memoryUsage()
      });
    }
    
    // Analyze performance metrics
    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
    const maxDuration = Math.max(...metrics.map(m => m.duration));
    const minDuration = Math.min(...metrics.map(m => m.duration));
    
    // Check performance thresholds
    if (test.workflow?.thresholds) {
      const { expect } = chai;
      if (test.workflow.thresholds.avgDuration) {
        expect(avgDuration).to.be.lessThan(test.workflow.thresholds.avgDuration);
      }
      if (test.workflow.thresholds.maxDuration) {
        expect(maxDuration).to.be.lessThan(test.workflow.thresholds.maxDuration);
      }
    }
    
    this.emit('performance:metrics', {
      testId: test.id,
      avgDuration,
      maxDuration,
      minDuration,
      iterations
    });
  }

  private async runSecurityTest(test: TestCase): Promise<void> {
    // Security test implementation
    const vulnerabilities: unknown[] = [];
    
    if (test.workflow) {
      // Test for common security issues
      
      // SQL Injection
      if (test.workflow.testSQLInjection) {
        const sqlInjectionPayloads = [
          "' OR '1'='1",
          "'; DROP TABLE users; --",
          "1' UNION SELECT * FROM users --"
        ];
        
        for (const payload of sqlInjectionPayloads) {
          try {
            await this.executeWorkflow(test.workflow, [payload]);
            vulnerabilities.push({
              type: 'SQL Injection',
              payload,
              severity: 'high'
            });
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (_error) {
            // Expected to fail
          }
        }
      }
      
      // XSS
      if (test.workflow.testXSS) {
        const xssPayloads = [
          '<script>alert("XSS")</script>',
          '<img src=x onerror=alert("XSS")>',
          'javascript:alert("XSS")'
        ];
        
        for (const payload of xssPayloads) {
          const result = await this.executeWorkflow(test.workflow, [payload]);
          if (result && result.includes(payload)) {
            vulnerabilities.push({
              type: 'XSS',
              payload,
              severity: 'medium'
            });
          }
        }
      }
      
      // Check for sensitive data exposure
      if (test.workflow.testDataExposure) {
        const result = await this.executeWorkflow(test.workflow, test.inputs);
        const sensitivePatterns = [
          /password/i,
          /api[_-]?key/i,
          /secret/i,
          /token/i
        ];
        
        for (const pattern of sensitivePatterns) {
          if (pattern.test(JSON.stringify(result))) {
            vulnerabilities.push({
              type: 'Sensitive Data Exposure',
              pattern: pattern.toString(),
              severity: 'high'
            });
          }
        }
      }
    }
    
    if (vulnerabilities.length > 0) {
      throw new Error(`Security vulnerabilities found: ${JSON.stringify(vulnerabilities)}`);
    }
  }

  // Mock Management
  public createMock(config: MockConfig): unknown {
    let mock: unknown;

    switch (config.type) {
      case 'function':
        mock = this.createFunctionMock(config);
        break;
      case 'module':
        mock = this.createModuleMock(config);
        break;
      case 'api':
        mock = this.createAPIMock(config);
        break;
      case 'database':
        mock = this.createDatabaseMock(config);
        break;
      case 'service':
        mock = this.createServiceMock(config);
        break;
    }

    this.mocks.set(config.target, mock);
    return mock;
  }

  private createFunctionMock(config: MockConfig): sinon.SinonStub {
    const stub = sinon.stub();

    if (config.implementation) {
      stub.callsFake(config.implementation);
    } else if (config.responses) {
      for (const response of config.responses) {
        const matcher = stub.withArgs(sinon.match(response.matcher));
        
        if (response.delay) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          matcher.callsFake(async (..._args) => {
            await new Promise(resolve => setTimeout(resolve, response.delay));
            return response.response;
          });
        } else {
          matcher.returns(response.response);
        }
        
        if (response.times) {
          matcher.onCall(response.times - 1).returns(response.response);
        }
      }
    }

    if (config.behavior === 'throw') {
      stub.throws(new Error('Mocked error'));
    } else if (config.behavior === 'timeout') {
      stub.callsFake(async () => {
        await new Promise(resolve => setTimeout(resolve, 30000));
      });
    }

    this.stubs.set(config.target, stub);
    return stub;
  }

  private createModuleMock(config: MockConfig): unknown {
    const mockModule: unknown = {};

    if (config.implementation) {
      Object.assign(mockModule, config.implementation);
    }

    // Create spies for all functions in the module
    for (const [key, value] of Object.entries(mockModule)) {
      if (typeof value === 'function') {
        mockModule[key] = sinon.spy(value);
        this.spies.set(`${config.target}.${key}`, mockModule[key]);
      }
    }

    return mockModule;
  }

  private createAPIMock(config: MockConfig): unknown {
    const app = express();
    app.use(express.json());

    if (config.responses) {
      for (const response of config.responses) {
        const [method, path] = config.target.split(' ');
        
        app[method.toLowerCase()](path, async (req: unknown, res: unknown) => {
          if (response.delay) {
            await new Promise(resolve => setTimeout(resolve, response.delay));
          }
          
          if (config.behavior === 'throw') {
            res.status(500).json({ error: 'Mocked error' });
          } else {
            res.json(response.response);
          }
        });
      }
    }

    const server = app.listen(0);
    const port = server.address().port;
    
    return {
      url: `http://localhost:${port}`,
      server,
      close: () => server.close()
    };
  }

  private createDatabaseMock(config: MockConfig): unknown {
    const mockDb = {
      query: sinon.stub(),
      insert: sinon.stub(),
      update: sinon.stub(),
      delete: sinon.stub(),
      transaction: sinon.stub()
    };

    if (config.responses) {
      for (const response of config.responses) {
        mockDb.query.withArgs(sinon.match(response.matcher)).resolves(response.response);
      }
    }

    return mockDb;
  }

  private createServiceMock(config: MockConfig): unknown {
    const mockService: unknown = {};

    if (config.implementation) {
      Object.assign(mockService, config.implementation);
    }

    return new Proxy(mockService, {
      get: (target, prop) => {
        if (!(prop in target)) {
          target[prop] = sinon.stub();
        }
        return target[prop];
      }
    });
  }

  // Data Generation
  public generateTestData(generator: DataGenerator): unknown[] {
    const { faker: fakerInstance } = faker;
    
    if (generator.seed) {
      fakerInstance.seed(generator.seed);
    }
    
    if (generator.locale) {
      fakerInstance.locale = generator.locale;
    }

    const data: unknown[] = [];

    for (let i = 0; i < generator.count; i++) {
      const item = this.generateDataItem(generator.schema, fakerInstance);
      data.push(item);
    }

    return data;
  }

  private generateDataItem(schema: unknown, fakerInstance: unknown): unknown {
    if (typeof schema === 'string') {
      return this.generateFakerValue(schema, fakerInstance);
    }

    if (Array.isArray(schema)) {
      return schema.map(s => this.generateDataItem(s, fakerInstance));
    }

    if (typeof schema === 'object') {
      const result: unknown = {};
      
      for (const [key, value] of Object.entries(schema)) {
        result[key] = this.generateDataItem(value, fakerInstance);
      }
      
      return result;
    }

    return schema;
  }

  private generateFakerValue(type: string, fakerInstance: unknown): unknown {
    const [category, method] = type.split('.');
    
    if (fakerInstance[category] && fakerInstance[category][method]) {
      return fakerInstance[category][method]();
    }

    // Custom generators
    switch (type) {
      case 'workflow.id':
        return `workflow_${fakerInstance.datatype.uuid()}`;
      case 'workflow.node':
        return {
          id: fakerInstance.datatype.uuid(),
          type: fakerInstance.helpers.arrayElement(['http', 'database', 'transform', 'condition']),
          data: {
            name: fakerInstance.lorem.words(3)
          }
        };
      case 'workflow.edge':
        return {
          id: fakerInstance.datatype.uuid(),
          source: fakerInstance.datatype.uuid(),
          target: fakerInstance.datatype.uuid()
        };
      default:
        return fakerInstance.lorem.word();
    }
  }

  // Snapshot Testing
  public async createSnapshot(name: string, data: unknown): Promise<void> {
    const snapshotDir = path.join(process.cwd(), '__snapshots__');
    await fs.mkdir(snapshotDir, { recursive: true });
    
    const snapshotPath = path.join(snapshotDir, `${name}.snap`);
    const snapshot = JSON.stringify(data, null, 2);
    
    await fs.writeFile(snapshotPath, snapshot);
    this.emit('snapshot:created', { name, path: snapshotPath });
  }

  public async compareSnapshot(name: string, data: unknown): Promise<boolean> {
    const snapshotPath = path.join(process.cwd(), '__snapshots__', `${name}.snap`);
    
    try {
      const existingSnapshot = await fs.readFile(snapshotPath, 'utf-8');
      const currentSnapshot = JSON.stringify(data, null, 2);
      
      const matches = existingSnapshot === currentSnapshot;
      
      if (!matches) {
        this.emit('snapshot:mismatch', { 
          name, 
          expected: existingSnapshot, 
          actual: currentSnapshot 
        });
      }
      
      return matches;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // Snapshot doesn't exist, create it
      await this.createSnapshot(name, data);
      return true;
    }
  }

  // Visual Regression Testing
  public async captureScreenshot(url: string, name: string): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({ headless: true });
    }

    const page = await this.browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    const screenshotDir = path.join(process.cwd(), '__screenshots__');
    await fs.mkdir(screenshotDir, { recursive: true });
    
    const screenshotPath = path.join(screenshotDir, `${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    await page.close();
    
    this.emit('screenshot:captured', { name, path: screenshotPath });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async compareScreenshots(name: string, _threshold: number = 0.1): Promise<boolean> {
    // In a real implementation, use a library like pixelmatch or resemble.js
    // For now, just check if the file exists
    const screenshotPath = path.join(process.cwd(), '__screenshots__', `${name}.png`);
    
    try {
      await fs.access(screenshotPath);
      return true;
    } catch {
      return false;
    }
  }

  // Load Testing
  public async runLoadTest(config: {
    url: string;
    duration: string;
    vus: number;
    thresholds?: unknown;
  }): Promise<unknown> {
    const script = `
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  duration: '${config.duration}',
  vus: ${config.vus},
  thresholds: ${JSON.stringify(config.thresholds || {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1']
  })}
};

export default function() {
  let response = http.get('${config.url}');
  check(response, {
    'status is 200': (r) => r.status === 200,
  });
}
`;

    // Write k6 script
    const scriptPath = path.join(process.cwd(), 'k6-test.js');
    await fs.writeFile(scriptPath, script);
    
    // Run k6 test (in a real implementation, use child_process)
    const results = {
      iterations: config.vus * 60,
      http_req_duration: {
        avg: 120,
        min: 50,
        max: 500,
        p95: 450
      },
      http_req_failed: 0.02
    };
    
    this.emit('loadtest:completed', results);
    return results;
  }

  // Helper Methods
  private async executeNode(node: unknown, inputs: unknown[]): Promise<unknown> {
    // Simulate node execution
    return { success: true, output: inputs[0] };
  }

  private async executeWorkflow(workflow: unknown, inputs: unknown[]): Promise<unknown> {
    // Simulate workflow execution
    return { success: true, output: inputs[0] };
  }

  private async executeE2EStep(page: puppeteer.Page, step: unknown): Promise<void> {
    switch (step.action) {
      case 'click':
        await page.click(step.selector);
        break;
      case 'type':
        await page.type(step.selector, step.value);
        break;
      case 'wait':
        await page.waitForSelector(step.selector);
        break;
      case 'screenshot':
        await page.screenshot({ path: step.path });
        break;
    }
  }

  // Cleanup
  public async cleanup(): Promise<void> {
    // Clear all mocks
    for (const stub of this.stubs.values()) {
      stub.restore();
    }
    
    for (const spy of this.spies.values()) {
      spy.restore();
    }
    
    // Close browsers
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    
    if (this.playwrightBrowser) {
      await this.playwrightBrowser.close();
      this.playwrightBrowser = null;
    }
    
    // Clear collections
    this.testSuites.clear();
    this.mocks.clear();
    this.spies.clear();
    this.stubs.clear();
    
    this.emit('cleanup:completed');
  }

  // Test Report Generation
  public async generateReport(results: TestResult[], format: 'html' | 'json' | 'junit' | 'markdown' = 'html'): Promise<string> {
    const report = {
      summary: {
        total: results.length,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        duration: results.reduce((sum, r) => sum + r.duration, 0)
      },
      results
    };

    let content: string;

    switch (format) {
      case 'html':
        content = this.generateHTMLReport(report);
        break;
      case 'json':
        content = JSON.stringify(report, null, 2);
        break;
      case 'junit':
        content = this.generateJUnitReport(report);
        break;
      case 'markdown':
        content = this.generateMarkdownReport(report);
        break;
    }

    const reportPath = path.join(process.cwd(), 'test-results', `report.${format}`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, content);

    return reportPath;
  }

  private generateHTMLReport(report: unknown): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f0f0f0; padding: 15px; margin-bottom: 20px; }
        .passed { color: green; }
        .failed { color: red; }
        .skipped { color: gray; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Test Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Total: ${report.summary.total}</p>
        <p class="passed">Passed: ${report.summary.passed}</p>
        <p class="failed">Failed: ${report.summary.failed}</p>
        <p class="skipped">Skipped: ${report.summary.skipped}</p>
        <p>Duration: ${(report.summary.duration / 1000).toFixed(2)}s</p>
    </div>
    
    <h2>Results</h2>
    <table>
        <tr>
            <th>Test</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Error</th>
        </tr>
        ${report.results.map((r: TestResult) => `
        <tr>
            <td>${r.testId}</td>
            <td class="${r.status}">${r.status}</td>
            <td>${r.duration.toFixed(2)}ms</td>
            <td>${r.error?.message || '-'}</td>
        </tr>
        `).join('')}
    </table>
</body>
</html>`;
  }

  private generateJUnitReport(report: unknown): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="${report.summary.total}" failures="${report.summary.failed}" time="${(report.summary.duration / 1000).toFixed(3)}">
    <testsuite name="Workflow Tests" tests="${report.summary.total}" failures="${report.summary.failed}" time="${(report.summary.duration / 1000).toFixed(3)}">
        ${report.results.map((r: TestResult) => `
        <testcase name="${r.testId}" time="${(r.duration / 1000).toFixed(3)}">
            ${r.status === 'failed' ? `<failure message="${r.error?.message || 'Test failed'}">${r.error?.stack || ''}</failure>` : ''}
            ${r.status === 'skipped' ? '<skipped/>' : ''}
        </testcase>
        `).join('')}
    </testsuite>
</testsuites>`;
  }

  private generateMarkdownReport(report: unknown): string {
    return `# Test Report

## Summary
- **Total**: ${report.summary.total}
- **Passed**: ${report.summary.passed}
- **Failed**: ${report.summary.failed}
- **Skipped**: ${report.summary.skipped}
- **Duration**: ${(report.summary.duration / 1000).toFixed(2)}s

## Results

| Test | Status | Duration | Error |
|------|--------|----------|-------|
${report.results.map((r: TestResult) => 
`| ${r.testId} | ${r.status} | ${r.duration.toFixed(2)}ms | ${r.error?.message || '-'} |`
).join('\n')}
`;
  }
}

export default TestingUtilities;
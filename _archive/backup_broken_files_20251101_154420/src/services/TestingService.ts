/* eslint-disable @typescript-eslint/no-unused-vars */
import { TestingRepository } from '../backend/database/testingRepository';
import { eventNotificationService } from './EventNotificationService';
import { logger } from './LoggingService';

export interface TestCase {
  id: string;
  name: string;
  description: string;
  workflowId: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance' | 'load';
  enabled: boolean;
  tags: string[];
  setup: TestSetup;
  steps: TestStep[];
  assertions: TestAssertion[];
  cleanup: TestCleanup;
  timeout: number; // in milliseconds
  retryCount: number;
  retryDelay: number;
  schedule?: TestSchedule;
  environment: string;
  variables: { [key: string]: unknown };
  dependencies: string[]; // Other test case IDs that must pass first
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface TestSetup {
  mockData: { [key: string]: unknown };
  fixtures: TestFixture[];
  environment: { [key: string]: unknown };
  prerequisites: string[];
}

export interface TestFixture {
  id: string;
  name: string;
  type: 'database' | 'api' | 'file' | 'service';
  config: unknown;
  data: unknown;
}

export interface TestStep {
  id: string;
  name: string;
  type: 'action' | 'verification' | 'wait' | 'loop' | 'condition';
  action: TestAction;
  expectedResult?: unknown;
  continueOnFailure: boolean;
  timeout: number;
}

export interface TestAction {
  type: 'trigger_workflow' | 'send_request' | 'validate_response' | 'wait' | 'set_variable' | 'custom';
  config: unknown;
  input?: unknown;
  output?: string; // Variable name to store output
}

export interface TestAssertion {
  id: string;
  name: string;
  type: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists' | 'matches_regex' | 'custom';
  field: string;
  expected: unknown;
  actual?: unknown;
  operator?: string;
  message?: string;
}

export interface TestCleanup {
  actions: TestAction[];
  alwaysRun: boolean;
}

export interface TestSchedule {
  enabled: boolean;
  cron: string;
  timezone: string;
  notifications: TestNotification[];
}

export interface TestNotification {
  type: 'email' | 'slack' | 'webhook';
  config: unknown;
  triggers: ('success' | 'failure' | 'always')[];
}

export interface TestExecution {
  id: string;
  testCaseId: string;
  testSuiteId?: string;
  status: 'running' | 'passed' | 'failed' | 'skipped' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration: number;
  results: TestStepResult[];
  assertions: TestAssertionResult[];
  logs: TestLog[];
  error?: string;
  environment: string;
  triggeredBy: 'manual' | 'scheduled' | 'api' | 'webhook';
  metadata: unknown;
}

export interface TestStepResult {
  stepId: string;
  status: 'passed' | 'failed' | 'skipped';
  startTime: Date;
  endTime: Date;
  duration: number;
  input?: unknown;
  output?: unknown;
  error?: string;
  logs: string[];
}

export interface TestAssertionResult {
  assertionId: string;
  status: 'passed' | 'failed';
  expected: unknown;
  actual: unknown;
  message: string;
  error?: string;
}

export interface TestLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
  stepId?: string;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  testCases: string[]; // Test case IDs
  parallel: boolean;
  maxParallel: number;
  continueOnFailure: boolean;
  setup: TestSetup;
  cleanup: TestCleanup;
  environment: string;
  schedule?: TestSchedule;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface TestReport {
  id: string;
  name: string;
  type: 'execution' | 'suite' | 'trend' | 'coverage';
  period: {
    start: Date;
    end: Date;
  };
  summary: TestSummary;
  details: unknown;
  charts: TestChart[];
  insights: TestInsight[];
  recommendations: TestRecommendation[];
  createdAt: Date;
}

export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  passRate: number;
  averageDuration: number;
  totalDuration: number;
  coverage: TestCoverage;
}

export interface TestCoverage {
  workflows: number;
  nodes: number;
  paths: number;
  percentage: number;
}

export interface TestChart {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: unknown;
  config: unknown;
}

export interface TestInsight {
  type: 'trend' | 'performance' | 'reliability' | 'coverage';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data: unknown;
}

export interface TestRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'performance' | 'reliability' | 'coverage' | 'maintenance';
  priority: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  impact: string;
  implementation: string;
}

export interface TestEnvironment {
  id: string;
  name: string;
  description: string;
  type: 'development' | 'staging' | 'production' | 'test';
  config: {
    baseUrl: string;
    database: unknown;
    services: { [key: string]: unknown };
    credentials: { [key: string]: unknown };
    timeouts: { [key: string]: number };
  };
  isolation: boolean;
  cleanup: boolean;
  active: boolean;
}

export class TestingService {
  private repository: TestingRepository | null = null;
  private mockData: Map<string, unknown> = new Map();
  private isRunning: boolean = false;
  private fallbackTestCases: Map<string, TestCase> = new Map();
  private fallbackTestSuites: Map<string, TestSuite> = new Map();
  private fallbackTestExecutions: TestExecution[] = [];
  private fallbackTestEnvironments: Map<string, TestEnvironment> = new Map();

  constructor(repository?: TestingRepository) {
    this.repository = repository || null;
    this.initializeDefaultEnvironments();
    this.initializeSampleTests();
  }

  // Test Case Management
  async createTestCase(testCase: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestCase> {
    if (this.repository) {
      try {
        return await this.repository.createTestCase(testCase);
      } catch (error) {
        logger.warn('Database operation failed, falling back to in-memory storage:', error);
      }
    }

    // Fallback to in-memory storage
    const newTestCase: TestCase = {
      ...testCase,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.fallbackTestCases.set(newTestCase.id, newTestCase);
    return newTestCase;
  }

  async getTestCases(filters?: {
    workflowId?: string;
    type?: string;
    enabled?: boolean;
    tags?: string[];
  }): Promise<TestCase[]> {
    if (this.repository) {
      try {
        return await this.repository.getTestCases({
          workflowId: filters?.workflowId,
          type: filters?.type,
          enabled: filters?.enabled,
          tags: filters?.tags
        });
      } catch (error) {
        logger.warn('Database operation failed, falling back to in-memory storage:', error);
      }
    }

    // Fallback to in-memory storage

    if (filters) {
      testCases = testCases.filter(testCase => {
        if (filters.workflowId && testCase.workflowId !== filters.workflowId) return false;
        if (filters.type && testCase.type !== filters.type) return false;
        if (filters.enabled !== undefined && testCase.enabled !== filters.enabled) return false;
        if (filters.tags && !filters.tags.some(tag => testCase.tags.includes(tag))) return false;
        return true;
      });
    }

    return testCases;
  }

  async getTestCase(id: string): Promise<TestCase | undefined> {
    if (this.repository) {
      try {
        return await this.repository.getTestCase(id);
      } catch (error) {
        logger.warn('Database operation failed, falling back to in-memory storage:', error);
      }
    }
    
    return this.fallbackTestCases.get(id);
  }

  async updateTestCase(id: string, updates: Partial<TestCase>): Promise<TestCase | undefined> {
    if (this.repository) {
      try {
        return await this.repository.updateTestCase(id, updates);
      } catch (error) {
        logger.warn('Database operation failed, falling back to in-memory storage:', error);
      }
    }
    
    if (testCase) {
      this.fallbackTestCases.set(id, updatedTestCase);
      return updatedTestCase;
    }
    return undefined;
  }

  async deleteTestCase(id: string): Promise<boolean> {
    if (this.repository) {
      try {
        return await this.repository.deleteTestCase(id);
      } catch (error) {
        logger.warn('Database operation failed, falling back to in-memory storage:', error);
      }
    }

    // Fallback to in-memory storage
    return this.fallbackTestCases.delete(id);
  }

  // Test Suite Management
  async createTestSuite(testSuite: Omit<TestSuite, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestSuite> {
    if (this.repository) {
      try {
        return await this.repository.createTestSuite(testSuite);
      } catch (error) {
        logger.warn('Database operation failed, falling back to in-memory storage:', error);
      }
    }

    // Fallback to in-memory storage
    const newTestSuite: TestSuite = {
      ...testSuite,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.fallbackTestSuites.set(newTestSuite.id, newTestSuite);
    return newTestSuite;
  }

  async getTestSuites(): Promise<TestSuite[]> {
    if (this.repository) {
      try {
        return await this.repository.getTestSuites();
      } catch (error) {
        logger.warn('Database operation failed, falling back to in-memory storage:', error);
      }
    }

    // Fallback to in-memory storage
    return Array.from(this.fallbackTestSuites.values());
  }

  // Test Execution
  async executeTestCase(testCaseId: string, options?: {
    environment?: string;
    variables?: { [key: string]: unknown };
    dryRun?: boolean;
  }): Promise<TestExecution> {
    if (!testCase) {
      throw new Error(`Test case ${testCaseId} not found`);
    }

    if (!testCase.enabled) {
      throw new Error(`Test case ${testCase.name} is disabled`);
    }

    // Use the new TestExecutionEngine for real execution
    try {
      const { _testExecutionEngine } = await import('./TestExecutionEngine');
      
      // Convert RealTestExecution to TestExecution format
      const execution: TestExecution = {
        id: realExecution.id,
        testCaseId: realExecution.testCaseId,
        status: realExecution.status,
        startTime: realExecution.startTime,
        endTime: realExecution.endTime,
        duration: realExecution.duration,
        results: realExecution.results.map(r => ({
          stepId: r.stepId,
          status: r.status,
          startTime: r.startTime,
          endTime: r.endTime,
          duration: r.duration,
          input: r.input,
          output: r.output,
          error: r.error,
          logs: r.logs
        })),
        assertions: realExecution.assertions.map(a => ({
          assertionId: a.assertionId,
          status: a.status,
          expected: a.expected,
          actual: a.actual,
          message: a.message,
          error: a.error
        })),
        logs: realExecution.logs.map(l => ({
          timestamp: l.timestamp,
          level: l.level,
          message: l.message,
          data: l.data,
          stepId: l.stepId
        })),
        error: realExecution.error,
        environment: realExecution.environment,
        triggeredBy: realExecution.triggeredBy,
        metadata: realExecution.metadata
      };

      // Store execution in history
      this.fallbackTestExecutions.unshift(execution);
      
      // Keep only last 1000 executions
      if (this.fallbackTestExecutions.length > 1000) {
        this.fallbackTestExecutions = this.fallbackTestExecutions.slice(0, 1000);
      }

      // Emit test execution event for notifications
      eventNotificationService.emitEvent('test_execution_completed', {
        testName: testCase.name,
        testId: testCase.id,
        status: execution.status,
        duration: execution.duration,
        error: execution.error,
        environment: execution.environment,
        assertions: execution.assertions.length,
        passedAssertions: execution.assertions.filter(a => a.status === 'passed').length
      }, 'testing_service');

      return execution;
    } catch (importError) {
      logger.warn('Failed to use TestExecutionEngine, falling back to simulation:', importError);
      
      // Fallback to old simulation logic
      const execution: TestExecution = {
        id: this.generateId(),
        testCaseId,
        status: 'running',
        startTime: new Date(),
        duration: 0,
        results: [],
        assertions: [],
        logs: [],
        environment: options?.environment || testCase.environment,
        triggeredBy: 'manual',
        metadata: options || {}
      };

      this.fallbackTestExecutions.push(execution);

      try {
        await this.runTestCaseExecution(testCase, execution, options);
      } catch (error) {
        execution.status = 'failed';
        execution.error = error instanceof Error ? error.message : String(error);
        this.addLog(execution, 'error', `Test execution failed: ${execution.error}`);
      } finally {
        execution.endTime = new Date();
        execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      }

      return execution;
    }
  }

  async executeTestSuite(testSuiteId: string, options?: {
    environment?: string;
    variables?: { [key: string]: unknown };
    parallel?: boolean;
  }): Promise<TestExecution[]> {
    if (!testSuite) {
      throw new Error(`Test suite ${testSuiteId} not found`);
    }

    const executions: TestExecution[] = [];

    if (options?.parallel || testSuite.parallel) {
      // Parallel execution
        this.executeTestCase(testCase.id, {
          ...options,
          environment: options?.environment || testSuite.environment
        })
      );
      
      results.forEach((result, _index) => {
        if (result.status === 'fulfilled') {
          result.value.testSuiteId = testSuiteId;
          executions.push(result.value);
        }
      });
    } else {
      // Sequential execution
      for (const testCase of testCases) {
        try {
            ...options,
            environment: options?.environment || testSuite.environment
          });
          execution.testSuiteId = testSuiteId;
          executions.push(execution);

          if (execution.status === 'failed' && !testSuite.continueOnFailure) {
            break;
          }
        } catch (error) {
          if (!testSuite.continueOnFailure) {
            break;
          }
        }
      }
    }

    return executions;
  }

  // Test Execution History
  async getTestExecutions(filters?: {
    testCaseId?: string;
    testSuiteId?: string;
    status?: string;
    environment?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<TestExecution[]> {
    let executions: TestExecution[] = [];
    
    if (this.repository) {
      try {
        executions = await this.repository.getTestExecutions({
          testCaseId: filters?.testCaseId,
          status: filters?.status,
          environment: filters?.environment,
          dateFrom: filters?.dateFrom,
          dateTo: filters?.dateTo
        });
      } catch (error) {
        logger.warn('Database operation failed, falling back to in-memory storage:', error);
        executions = this.fallbackTestExecutions;
      }
    } else {
      executions = this.fallbackTestExecutions;
    }

    if (filters) {
      executions = executions.filter(execution => {
        if (filters.testCaseId && execution.testCaseId !== filters.testCaseId) return false;
        if (filters.testSuiteId && execution.testSuiteId !== filters.testSuiteId) return false;
        if (filters.status && execution.status !== filters.status) return false;
        if (filters.environment && execution.environment !== filters.environment) return false;
        if (filters.startDate && execution.startTime < filters.startDate) return false;
        if (filters.endDate && execution.startTime > filters.endDate) return false;
        return true;
      });
    }

    executions = executions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    
    if (filters?.limit) {
      executions = executions.slice(0, filters.limit);
    }

    return executions;
  }

  // Test Reports
  async generateTestReport(type: TestReport['type'], period: { start: Date; end: Date }): Promise<TestReport> {
      startDate: period.start,
      endDate: period.end
    });


    const report: TestReport = {
      id: this.generateId(),
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Test Report`,
      type,
      period,
      summary,
      details: { executions },
      charts,
      insights,
      recommendations,
      createdAt: new Date()
    };

    return report;
  }

  // Mock Data Management
  async createMockData(key: string, data: unknown): Promise<void> {
    this.mockData.set(key, data);
  }

  async getMockData(key: string): Promise<unknown> {
    return this.mockData.get(key);
  }

  async deleteMockData(key: string): Promise<boolean> {
    return this.mockData.delete(key);
  }

  // Environment Management
  async getTestEnvironments(): Promise<TestEnvironment[]> {
    if (this.repository) {
      try {
        return await this.repository.getTestEnvironments();
      } catch (error) {
        logger.warn('Database operation failed, falling back to in-memory storage:', error);
      }
    }

    // Fallback to in-memory storage
    return Array.from(this.fallbackTestEnvironments.values());
  }

  async createTestEnvironment(environment: Omit<TestEnvironment, 'id'>): Promise<TestEnvironment> {
    const newEnvironment: TestEnvironment = {
      ...environment,
      id: this.generateId()
    };

    if (this.repository) {
      try {
        return await this.repository.createTestEnvironment(newEnvironment);
      } catch (error) {
        logger.warn('Database operation failed, falling back to in-memory storage:', error);
      }
    }

    // Fallback to in-memory storage
    this.fallbackTestEnvironments.set(newEnvironment.id, newEnvironment);
    return newEnvironment;
  }

  // Test Data Generation
  generateTestData(schema: unknown): unknown {
    // Generate test data based on schema
    switch (schema.type) {
      case 'string':
        return schema.format === 'email' ? 'test@example.com' : 'test_string';
      case 'number':
        return Math.floor(Math.random() * 100);
      case 'boolean':
        return Math.random() > 0.5;
      case 'array':
        return [this.generateTestData(schema.items)];
      case 'object': {
        const obj: unknown = {};
        Object.entries(schema.properties || {}).forEach(([key, propSchema]) => {
          obj[key] = this.generateTestData(propSchema);
        });
        return obj;
      }
      default:
        return null;
    }
  }

  // Load Testing
  async runLoadTest(testCaseId: string, config: {
    concurrency: number;
    duration: number; // in seconds
    rampUp: number; // in seconds
  }): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    requestsPerSecond: number;
    errors: unknown[];
  }> {
    if (!testCase) {
      throw new Error(`Test case ${testCaseId} not found`);
    }

      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      requestsPerSecond: 0,
      errors: [] as unknown[]
    };

    // Simulate load test execution
    const responseTimes: number[] = [];

    while (Date.now() < endTime) {
      for (let __i = 0; i < config.concurrency; i++) {
        try {
          // Simulate test execution
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
          
          responseTimes.push(responseTime);
          results.totalRequests++;
          results.successfulRequests++;
        } catch (error) {
          results.totalRequests++;
          results.failedRequests++;
          results.errors.push(error);
        }
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Calculate statistics
    if (responseTimes.length > 0) {
      results.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      responseTimes.sort((a, b) => a - b);
      results.p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
    }

    // PRECISION FIX: Use more precise time calculation
    // const _totalDuration = Math.round(totalDurationMs * 1000) / 1000000; // Convert to seconds with precision - unused
    results.requestsPerSecond = totalDurationMs > 0 ? Math.round((results.totalRequests * 1000 * 1000) / totalDurationMs) / 1000 : 0;

    return results;
  }

  // Private Methods
  private async runTestCaseExecution(testCase: TestCase, execution: TestExecution, _options?: unknown): Promise<void> {
    this.addLog(execution, 'info', `Starting test case: ${testCase.name}`);

    // Setup
    await this.runTestSetup(testCase.setup, execution);

    // Execute steps
    for (const step of testCase.steps) {
      execution.results.push(stepResult);

      if (stepResult.status === 'failed' && !step.continueOnFailure) {
        execution.status = 'failed';
        break;
      }
    }

    // Run assertions
    for (const assertion of testCase.assertions) {
      execution.assertions.push(assertionResult);

      if (assertionResult.status === 'failed') {
        execution.status = 'failed';
      }
    }

    // Cleanup
    await this.runTestCleanup(testCase.cleanup, execution);

    if (execution.status === 'running') {
      execution.status = 'passed';
    }

    this.addLog(execution, 'info', `Test case completed with status: ${execution.status}`);
  }

  private async runTestSetup(setup: TestSetup, execution: TestExecution): Promise<void> {
    this.addLog(execution, 'info', 'Running test setup');
    
    // Load fixtures
    for (const fixture of setup.fixtures) {
      await this.loadFixture(fixture, execution);
    }

    // Set mock data
    Object.entries(setup.mockData).forEach(([key, value]) => {
      this.mockData.set(key, value);
    });
  }

  private async loadFixture(fixture: TestFixture, execution: TestExecution): Promise<void> {
    this.addLog(execution, 'info', `Loading fixture: ${fixture.name}`);
    
    switch (fixture.type) {
      case 'database':
        // Mock database fixture loading
        break;
      case 'api':
        // Mock API fixture setup
        break;
      case 'file':
        // Mock file fixture loading
        break;
      default:
        this.addLog(execution, 'warn', `Unknown fixture type: ${fixture.type}`);
    }
  }

  private async executeTestStep(step: TestStep, execution: TestExecution, variables: unknown): Promise<TestStepResult> {
    this.addLog(execution, 'info', `Executing step: ${step.name}`, step.id);

    const result: TestStepResult = {
      stepId: step.id,
      status: 'passed',
      startTime,
      endTime: new Date(),
      duration: 0,
      logs: []
    };

    try {
      switch (step.action.type) {
        case 'trigger_workflow':
          result.output = await this.triggerWorkflow(step.action.config, variables);
          break;
        case 'send_request':
          result.output = await this.sendHttpRequest(step.action.config);
          break;
        case 'validate_response':
          await this.validateResponse(step.action.config, result.output);
          break;
        case 'wait':
          await new Promise(resolve => setTimeout(resolve, step.action.config.duration));
          break;
        case 'set_variable':
          variables[step.action.config.name] = step.action.config.value;
          break;
        default:
          throw new Error(`Unknown action type: ${step.action.type}`);
      }

      if (step.expectedResult && JSON.stringify(result.output) !== JSON.stringify(step.expectedResult)) {
        result.status = 'failed';
        result.error = 'Output does not match expected result';
      }
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);
      this.addLog(execution, 'error', `Step failed: ${result.error}`, step.id);
    }

    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();

    return result;
  }

  private async executeAssertion(assertion: TestAssertion, execution: TestExecution): Promise<TestAssertionResult> {
    const result: TestAssertionResult = {
      assertionId: assertion.id,
      status: 'passed',
      expected: assertion.expected,
      actual: assertion.actual,
      message: assertion.message || `${assertion.field} ${assertion.type} ${assertion.expected}`
    };

    try {
      // Get actual value from execution context
      result.actual = actualValue;

      switch (assertion.type) {
        case 'equals':
          if (actualValue !== assertion.expected) {
            result.status = 'failed';
            result.message = `Expected ${assertion.expected}, got ${actualValue}`;
          }
          break;
        case 'contains':
          if (!String(actualValue).includes(String(assertion.expected))) {
            result.status = 'failed';
            result.message = `Expected ${actualValue} to contain ${assertion.expected}`;
          }
          break;
        case 'greater_than':
          if (Number(actualValue) <= Number(assertion.expected)) {
            result.status = 'failed';
            result.message = `Expected ${actualValue} to be greater than ${assertion.expected}`;
          }
          break;
        default:
          result.status = 'failed';
          result.error = `Unknown assertion type: ${assertion.type}`;
      }
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);
    }

    return result;
  }

  private async runTestCleanup(cleanup: TestCleanup, execution: TestExecution): Promise<void> {
    this.addLog(execution, 'info', 'Running test cleanup');
    
    for (const action of cleanup.actions) {
      try {
        await this.executeTestAction(action);
      } catch (error) {
        this.addLog(execution, 'warn', `Cleanup action failed: ${error}`);
      }
    }
  }

  private async executeTestAction(action: TestAction): Promise<unknown> {
    switch (action.type) {
      case 'trigger_workflow':
        return await this.triggerWorkflow(action.config, action.input);
      case 'send_request':
        return await this.sendHttpRequest(action.config);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async triggerWorkflow(config: unknown, variables: unknown): Promise<unknown> {
    // Mock workflow trigger
    return { success: true, data: config, variables };
  }

  private async sendHttpRequest(config: unknown): Promise<unknown> {
    // Mock HTTP request
    return {
      status: 200,
      data: { message: 'Success', config },
      headers: { 'content-type': 'application/json' }
    };
  }

  private async validateResponse(config: unknown, response: unknown): Promise<void> {
    // Mock response validation
    if (!response || response.status !== config.expectedStatus) {
      throw new Error('Response validation failed');
    }
  }

  private getValueFromPath(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private addLog(execution: TestExecution, level: TestLog['level'], message: string, stepId?: string): void {
    execution.logs.push({
      timestamp: new Date(),
      level,
      message,
      stepId
    });
  }

  private calculateTestSummary(executions: TestExecution[]): TestSummary {
    
      ? executions.reduce((sum, e) => sum + e.duration, 0) / total 
      : 0;

    return {
      totalTests: total,
      passedTests: passed,
      failedTests: failed,
      skippedTests: skipped,
      passRate: total > 0 ? (passed / total) * 100 : 0,
      averageDuration: avgDuration,
      totalDuration: executions.reduce((sum, e) => sum + e.duration, 0),
      coverage: {
        workflows: 0, // Would be calculated based on actual workflow coverage
        nodes: 0,
        paths: 0,
        percentage: 0
      }
    };
  }

  private generateTestCharts(executions: TestExecution[]): TestChart[] {
    return [
      {
        type: 'line',
        title: 'Test Execution Trend',
        data: executions.map(e => ({
          timestamp: e.startTime,
          passed: e.status === 'passed' ? 1 : 0,
          failed: e.status === 'failed' ? 1 : 0
        })),
        config: {}
      }
    ];
  }

  private generateTestInsights(executions: TestExecution[]): TestInsight[] {
    const insights: TestInsight[] = [];
    
      ? (executions.filter(e => e.status === 'failed').length / executions.length) * 100 
      : 0;

    if (failureRate > 10) {
      insights.push({
        type: 'reliability',
        title: 'High Failure Rate Detected',
        description: `${failureRate.toFixed(1)}% of tests are failing`,
        severity: 'high',
        data: { failureRate }
      });
    }

    return insights;
  }

  private generateTestRecommendations(executions: TestExecution[]): TestRecommendation[] {
    const recommendations: TestRecommendation[] = [];
    
    if (slowTests.length > 0) {
      recommendations.push({
        id: this.generateId(),
        title: 'Optimize Slow Tests',
        description: `${slowTests.length} tests are taking longer than 30 seconds`,
        category: 'performance',
        priority: 'medium',
        effort: 'medium',
        impact: 'Faster feedback and reduced CI/CD time',
        implementation: 'Review test steps and optimize database queries or API calls'
      });
    }

    return recommendations;
  }

  private initializeDefaultEnvironments(): void {
    const environments: TestEnvironment[] = [
      {
        id: 'dev',
        name: 'Development',
        description: 'Development environment for testing',
        type: 'development',
        config: {
          baseUrl: 'http://localhost:3000',
          database: { host: 'localhost', port: 5432 },
          services: {},
          credentials: {},
          timeouts: { default: 30000 }
        },
        isolation: true,
        cleanup: true,
        active: true
      },
      {
        id: 'staging',
        name: 'Staging',
        description: 'Staging environment for integration testing',
        type: 'staging',
        config: {
          baseUrl: 'https://staging.example.com',
          database: { host: 'staging-db', port: 5432 },
          services: {},
          credentials: {},
          timeouts: { default: 60000 }
        },
        isolation: false,
        cleanup: false,
        active: true
      }
    ];

    environments.forEach(env => this.fallbackTestEnvironments.set(env.id, env));
  }

  private initializeSampleTests(): void {
    const sampleTestCase: TestCase = {
      id: 'test-001',
      name: 'User Registration Flow',
      description: 'Test the complete user registration workflow',
      workflowId: 'workflow-001',
      type: 'integration',
      enabled: true,
      tags: ['user', 'registration', 'integration'],
      setup: {
        mockData: { user: { email: 'test@example.com' } },
        fixtures: [],
        environment: {},
        prerequisites: []
      },
      steps: [
        {
          id: 'step-1',
          name: 'Trigger Registration',
          type: 'action',
          action: {
            type: 'trigger_workflow',
            config: { workflowId: 'workflow-001' },
            input: { email: 'test@example.com', name: 'Test User' }
          },
          continueOnFailure: false,
          timeout: 30000
        }
      ],
      assertions: [
        {
          id: 'assert-1',
          name: 'User Created',
          type: 'equals',
          field: 'results.0.output.success',
          expected: true
        }
      ],
      cleanup: {
        actions: [],
        alwaysRun: true
      },
      timeout: 120000,
      retryCount: 3,
      retryDelay: 1000,
      environment: 'dev',
      variables: {},
      dependencies: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };

    this.fallbackTestCases.set(sampleTestCase.id, sampleTestCase);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

// Singleton instance
export const testingService = new TestingService();
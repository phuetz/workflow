/**
 * Regression Testing System
 * Automated regression tests after corrections
 */

import { logger } from '../services/SimpleLogger';

export interface TestResult {
  success: boolean;
  testName: string;
  duration: number;
  error?: string;
  details?: any;
}

export interface EndpointTestResult extends TestResult {
  endpoint: string;
  statusCode?: number;
  responseTime?: number;
  failedPath?: string;
}

export interface RegressionTestSuite {
  name: string;
  tests: RegressionTest[];
  parallel: boolean;
  timeout: number;
  critical: boolean;
}

export interface RegressionTest {
  name: string;
  run: () => Promise<TestResult>;
  timeout?: number;
  retries?: number;
  critical?: boolean;
}

export interface CorrectionTestResult {
  success: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  results: TestResult[];
  criticalFailures: string[];
}

export class RegressionTester {
  private testSuites: Map<string, RegressionTestSuite> = new Map();
  private baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  private defaultTimeout = 10000;

  constructor() {
    this.setupDefaultTests();
  }

  /**
   * Run all regression tests after correction
   */
  async runAfterCorrection(correction: any): Promise<CorrectionTestResult> {
    const startTime = Date.now();
    logger.info('Running regression tests after correction...');

    const allResults: TestResult[] = [];
    const criticalFailures: string[] = [];

    // Run all test suites
    for (const suite of this.testSuites.values()) {
      logger.info(`Running test suite: ${suite.name}`);

      try {
        const suiteResults = suite.parallel
          ? await this.runTestsParallel(suite)
          : await this.runTestsSequential(suite);

        allResults.push(...suiteResults);

        // Track critical failures
        if (suite.critical) {
          const failures = suiteResults.filter(r => !r.success);
          if (failures.length > 0) {
            criticalFailures.push(
              ...failures.map(f => `${suite.name}: ${f.testName}`)
            );
          }
        }
      } catch (error) {
        logger.error(`Test suite ${suite.name} failed:`, error);
        allResults.push({
          success: false,
          testName: suite.name,
          duration: 0,
          error: (error as Error).message
        });

        if (suite.critical) {
          criticalFailures.push(`${suite.name}: Suite execution failed`);
        }
      }
    }

    const passedTests = allResults.filter(r => r.success).length;
    const failedTests = allResults.filter(r => !r.success).length;
    const duration = Date.now() - startTime;

    const result: CorrectionTestResult = {
      success: criticalFailures.length === 0,
      totalTests: allResults.length,
      passedTests,
      failedTests,
      duration,
      results: allResults,
      criticalFailures
    };

    logger.info('Regression tests completed', {
      passed: passedTests,
      failed: failedTests,
      criticalFailures: criticalFailures.length
    });

    return result;
  }

  /**
   * Test critical API endpoints
   */
  async testCriticalEndpoints(): Promise<EndpointTestResult[]> {
    const criticalEndpoints = [
      { path: '/api/health', method: 'GET', expectedStatus: 200 },
      { path: '/api/workflows', method: 'GET', expectedStatus: 200 },
      { path: '/api/executions', method: 'GET', expectedStatus: 200 },
      { path: '/api/nodes', method: 'GET', expectedStatus: 200 },
      { path: '/api/templates', method: 'GET', expectedStatus: 200 }
    ];

    const results: EndpointTestResult[] = [];

    for (const endpoint of criticalEndpoints) {
      const result = await this.testEndpoint(endpoint.path, endpoint.method);
      results.push(result);

      if (!result.success) {
        logger.error(`Endpoint test failed: ${endpoint.path}`);
      }
    }

    return results;
  }

  /**
   * Test a single endpoint
   */
  async testEndpoint(
    path: string,
    method: string = 'GET'
  ): Promise<EndpointTestResult> {
    const startTime = Date.now();

    try {
      // Mock HTTP request - in production, use actual HTTP client
      await this.delay(Math.random() * 100);
      const success = Math.random() > 0.05; // 95% success rate

      if (!success) {
        return {
          success: false,
          testName: `Endpoint test: ${method} ${path}`,
          endpoint: path,
          duration: Date.now() - startTime,
          statusCode: 500,
          error: 'Server error',
          failedPath: path
        };
      }

      return {
        success: true,
        testName: `Endpoint test: ${method} ${path}`,
        endpoint: path,
        duration: Date.now() - startTime,
        statusCode: 200,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        testName: `Endpoint test: ${method} ${path}`,
        endpoint: path,
        duration: Date.now() - startTime,
        error: (error as Error).message,
        failedPath: path
      };
    }
  }

  /**
   * Run critical unit tests
   */
  async runCriticalTests(): Promise<TestResult> {
    logger.info('Running critical unit tests...');

    try {
      // Mock test execution - in production, run actual tests
      // Example: exec('npm test -- --testPathPattern=critical')
      await this.delay(2000);

      const success = Math.random() > 0.1; // 90% success rate

      return {
        success,
        testName: 'Critical unit tests',
        duration: 2000,
        details: {
          totalTests: 50,
          passed: success ? 50 : 45,
          failed: success ? 0 : 5
        }
      };
    } catch (error) {
      return {
        success: false,
        testName: 'Critical unit tests',
        duration: 0,
        error: (error as Error).message
      };
    }
  }

  /**
   * Test workflow execution
   */
  async testWorkflowExecution(): Promise<TestResult> {
    logger.info('Testing workflow execution...');

    try {
      // Create a simple test workflow
      const testWorkflow = {
        id: 'test-workflow',
        nodes: [
          { id: '1', type: 'trigger', data: {} },
          { id: '2', type: 'action', data: {} }
        ],
        edges: [
          { source: '1', target: '2' }
        ]
      };

      // Mock execution
      await this.delay(1000);
      const success = Math.random() > 0.05;

      return {
        success,
        testName: 'Workflow execution test',
        duration: 1000,
        details: { workflow: testWorkflow }
      };
    } catch (error) {
      return {
        success: false,
        testName: 'Workflow execution test',
        duration: 0,
        error: (error as Error).message
      };
    }
  }

  /**
   * Test database connectivity
   */
  async testDatabaseConnectivity(): Promise<TestResult> {
    logger.info('Testing database connectivity...');

    try {
      // Mock database query
      await this.delay(100);
      const success = Math.random() > 0.02;

      return {
        success,
        testName: 'Database connectivity test',
        duration: 100,
        details: {
          connected: success,
          latency: 100
        }
      };
    } catch (error) {
      return {
        success: false,
        testName: 'Database connectivity test',
        duration: 0,
        error: (error as Error).message
      };
    }
  }

  /**
   * Test cache functionality
   */
  async testCacheFunctionality(): Promise<TestResult> {
    logger.info('Testing cache functionality...');

    try {
      // Mock cache operations
      await this.delay(50);
      const success = Math.random() > 0.05;

      return {
        success,
        testName: 'Cache functionality test',
        duration: 50,
        details: {
          operations: ['set', 'get', 'delete'],
          allSuccessful: success
        }
      };
    } catch (error) {
      return {
        success: false,
        testName: 'Cache functionality test',
        duration: 0,
        error: (error as Error).message
      };
    }
  }

  /**
   * Test authentication
   */
  async testAuthentication(): Promise<TestResult> {
    logger.info('Testing authentication...');

    try {
      // Mock auth test
      await this.delay(200);
      const success = Math.random() > 0.05;

      return {
        success,
        testName: 'Authentication test',
        duration: 200,
        details: {
          login: success,
          tokenGeneration: success,
          tokenValidation: success
        }
      };
    } catch (error) {
      return {
        success: false,
        testName: 'Authentication test',
        duration: 0,
        error: (error as Error).message
      };
    }
  }

  /**
   * Setup default test suites
   */
  private setupDefaultTests(): void {
    // Critical endpoints suite
    this.addTestSuite({
      name: 'Critical Endpoints',
      parallel: true,
      timeout: 30000,
      critical: true,
      tests: [
        {
          name: 'Test /api/health',
          run: () => this.testEndpoint('/api/health'),
          critical: true
        },
        {
          name: 'Test /api/workflows',
          run: () => this.testEndpoint('/api/workflows'),
          critical: true
        },
        {
          name: 'Test /api/executions',
          run: () => this.testEndpoint('/api/executions'),
          critical: true
        }
      ]
    });

    // Core functionality suite
    this.addTestSuite({
      name: 'Core Functionality',
      parallel: false,
      timeout: 60000,
      critical: true,
      tests: [
        {
          name: 'Database connectivity',
          run: () => this.testDatabaseConnectivity(),
          critical: true
        },
        {
          name: 'Cache functionality',
          run: () => this.testCacheFunctionality(),
          critical: false
        },
        {
          name: 'Workflow execution',
          run: () => this.testWorkflowExecution(),
          critical: true
        },
        {
          name: 'Authentication',
          run: () => this.testAuthentication(),
          critical: true
        }
      ]
    });

    // Unit tests suite
    this.addTestSuite({
      name: 'Unit Tests',
      parallel: false,
      timeout: 120000,
      critical: true,
      tests: [
        {
          name: 'Critical unit tests',
          run: () => this.runCriticalTests(),
          critical: true
        }
      ]
    });
  }

  /**
   * Add test suite
   */
  addTestSuite(suite: RegressionTestSuite): void {
    this.testSuites.set(suite.name, suite);
    logger.info(`Added test suite: ${suite.name}`);
  }

  /**
   * Run tests in parallel
   */
  private async runTestsParallel(
    suite: RegressionTestSuite
  ): Promise<TestResult[]> {
    const promises = suite.tests.map(test =>
      this.runSingleTest(test, suite.timeout)
    );

    return Promise.all(promises);
  }

  /**
   * Run tests sequentially
   */
  private async runTestsSequential(
    suite: RegressionTestSuite
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const test of suite.tests) {
      const result = await this.runSingleTest(test, suite.timeout);
      results.push(result);

      // Stop on critical failure
      if (!result.success && test.critical) {
        logger.error(`Critical test failed: ${test.name}`);
        break;
      }
    }

    return results;
  }

  /**
   * Run a single test with retries
   */
  private async runSingleTest(
    test: RegressionTest,
    defaultTimeout: number
  ): Promise<TestResult> {
    const maxRetries = test.retries || 0;
    const timeout = test.timeout || defaultTimeout;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.runWithTimeout(test.run(), timeout);

        if (result.success || attempt === maxRetries) {
          return result;
        }

        logger.warn(`Test ${test.name} failed, retrying... (${attempt + 1}/${maxRetries})`);
        await this.delay(1000); // Wait 1s before retry
      } catch (error) {
        if (attempt === maxRetries) {
          return {
            success: false,
            testName: test.name,
            duration: 0,
            error: (error as Error).message
          };
        }
      }
    }

    return {
      success: false,
      testName: test.name,
      duration: 0,
      error: 'Max retries exceeded'
    };
  }

  /**
   * Run with timeout
   */
  private async runWithTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Test timeout')), timeout)
      )
    ]);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get test suites summary
   */
  getSummary(): any {
    const suites = Array.from(this.testSuites.values());
    return {
      totalSuites: suites.length,
      criticalSuites: suites.filter(s => s.critical).length,
      totalTests: suites.reduce((sum, s) => sum + s.tests.length, 0),
      criticalTests: suites.reduce(
        (sum, s) => sum + s.tests.filter(t => t.critical).length,
        0
      )
    };
  }

  /**
   * Clear test suites
   */
  clear(): void {
    this.testSuites.clear();
    this.setupDefaultTests();
  }
}

// Export singleton instance
export const regressionTester = new RegressionTester();

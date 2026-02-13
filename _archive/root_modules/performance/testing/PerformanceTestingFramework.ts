/**
 * Performance Testing Framework
 * Comprehensive performance testing, benchmarking, and load testing for applications
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { performance } from 'perf_hooks';
import * as os from 'os';

export interface PerformanceTestConfig {
  testing: {
    types: Array<'unit' | 'integration' | 'load' | 'stress' | 'endurance' | 'spike'>;
    timeout: number; // milliseconds
    iterations: number;
    warmupIterations: number;
    concurrency: number;
    rampUpDuration: number; // milliseconds
  };
  metrics: {
    responseTime: boolean;
    throughput: boolean;
    errorRate: boolean;
    resourceUsage: boolean;
    memoryLeaks: boolean;
    cpuUtilization: boolean;
  };
  thresholds: {
    responseTime: {
      p50: number;
      p95: number;
      p99: number;
      max: number;
    };
    throughput: {
      min: number; // requests per second
    };
    errorRate: {
      max: number; // percentage
    };
    resources: {
      maxMemory: number; // MB
      maxCpu: number; // percentage
    };
  };
  reports: {
    enabled: boolean;
    outputDir: string;
    formats: Array<'json' | 'html' | 'csv' | 'junit'>;
    realTime: boolean;
  };
  browser: {
    enabled: boolean;
    headless: boolean;
    viewport: { width: number; height: number };
    userAgent?: string;
    networkThrottling?: {
      downloadThroughput: number;
      uploadThroughput: number;
      latency: number;
    };
  };
}

export interface PerformanceTest {
  id: string;
  name: string;
  description: string;
  type: 'unit' | 'integration' | 'load' | 'stress' | 'endurance' | 'spike';
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterEach?: () => Promise<void>;
  testFunction: (context: TestContext) => Promise<unknown>;
  config?: Partial<PerformanceTestConfig>;
  tags?: string[];
  skip?: boolean;
  only?: boolean;
}

export interface TestContext {
  iteration: number;
  userId?: string;
  sessionId: string;
  startTime: number;
  data?: unknown;
  browser?: unknown;
  page?: unknown;
  metrics: PerformanceMetrics;
  logger: TestLogger;
}

export interface TestLogger {
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  debug(message: string, data?: unknown): void;
  metric(name: string, value: number, unit?: string): void;
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  customMetrics: Map<string, number>;
}

export interface TestResult {
  testId: string;
  testName: string;
  type: string;
  status: 'passed' | 'failed' | 'skipped' | 'timeout';
  startTime: Date;
  endTime: Date;
  duration: number;
  iterations: number;
  successfulIterations: number;
  failedIterations: number;
  metrics: AggregatedMetrics;
  errors: TestError[];
  warnings: TestWarning[];
  artifacts: TestArtifact[];
}

export interface AggregatedMetrics {
  responseTime: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p90: number;
    p95: number;
    p99: number;
    stdDev: number;
  };
  throughput: {
    mean: number;
    max: number;
    min: number;
  };
  errorRate: number;
  resourceUsage: {
    cpu: {
      min: number;
      max: number;
      mean: number;
    };
    memory: {
      min: number;
      max: number;
      mean: number;
      peak: number;
    };
  };
  customMetrics: Record<string, {
    min: number;
    max: number;
    mean: number;
    count: number;
  }>;
}

export interface TestError {
  message: string;
  stack?: string;
  iteration: number;
  timestamp: Date;
  type: 'assertion' | 'timeout' | 'network' | 'system' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TestWarning {
  message: string;
  iteration: number;
  timestamp: Date;
  type: 'performance' | 'memory' | 'network' | 'deprecation';
  threshold?: number;
  actualValue?: number;
}

export interface TestArtifact {
  type: 'screenshot' | 'video' | 'trace' | 'profile' | 'log' | 'report';
  name: string;
  path: string;
  size: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: PerformanceTest[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  config?: Partial<PerformanceTestConfig>;
  tags?: string[];
}

export interface TestRun {
  id: string;
  suiteId?: string;
  testIds: string[];
  config: PerformanceTestConfig;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  results: TestResult[];
  summary: TestRunSummary;
  environment: TestEnvironment;
}

export interface TestRunSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalIterations: number;
  successfulIterations: number;
  failedIterations: number;
  averageResponseTime: number;
  averageThroughput: number;
  overallErrorRate: number;
  thresholdViolations: ThresholdViolation[];
}

export interface ThresholdViolation {
  metric: string;
  threshold: number;
  actualValue: number;
  severity: 'warning' | 'error';
  testId: string;
}

export interface TestEnvironment {
  os: string;
  nodejs: string;
  memory: number;
  cpu: string;
  timestamp: Date;
  userAgent?: string;
  browser?: {
    name: string;
    version: string;
  };
}

export interface LoadTestScenario {
  name: string;
  description: string;
  rampUp: {
    duration: number; // seconds
    users: number;
    strategy: 'linear' | 'exponential' | 'stepped';
  };
  sustained: {
    duration: number; // seconds
    users: number;
  };
  rampDown: {
    duration: number; // seconds
    strategy: 'linear' | 'exponential' | 'immediate';
  };
  think_time: {
    min: number; // milliseconds
    max: number;
  };
}

export interface BenchmarkResult {
  name: string;
  operations: number;
  duration: number;
  opsPerSecond: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    peak: number;
  };
}

export class PerformanceTestingFramework extends EventEmitter {
  private config: PerformanceTestConfig;
  private tests: Map<string, PerformanceTest> = new Map();
  private suites: Map<string, TestSuite> = new Map();
  private runs: Map<string, TestRun> = new Map();
  private activeRun?: TestRun;
  private browser?: unknown;
  
  constructor(config: PerformanceTestConfig) {
    super();
    this.config = config;
    this.initialize();
  }
  
  private initialize(): void {
    // Create output directories
    if (this.config.reports.enabled && !fs.existsSync(this.config.reports.outputDir)) {
      fs.mkdirSync(this.config.reports.outputDir, { recursive: true });
    }
    
    this.emit('initialized', {
      outputDir: this.config.reports.outputDir,
      types: this.config.testing.types,
      metrics: Object.keys(this.config.metrics).filter(k => this.config.metrics[k as keyof typeof this.config.metrics])
    });
  }
  
  // Test Management
  
  public addTest(test: PerformanceTest): void {
    this.tests.set(test.id, test);
    
    this.emit('testAdded', {
      testId: test.id,
      name: test.name,
      type: test.type
    });
  }
  
  public addSuite(suite: TestSuite): void {
    this.suites.set(suite.id, suite);
    
    // Add all tests from the suite
    for (const test of suite.tests) {
      this.tests.set(test.id, test);
    }
    
    this.emit('suiteAdded', {
      suiteId: suite.id,
      name: suite.name,
      testCount: suite.tests.length
    });
  }
  
  public getTest(testId: string): PerformanceTest | undefined {
    return this.tests.get(testId);
  }
  
  public getAllTests(): PerformanceTest[] {
    return Array.from(this.tests.values());
  }
  
  public getTestsByType(type: string): PerformanceTest[] {
    return Array.from(this.tests.values()).filter(test => test.type === type);
  }
  
  public getTestsByTag(tag: string): PerformanceTest[] {
    return Array.from(this.tests.values()).filter(test => test.tags?.includes(tag));
  }
  
  // Test Execution
  
  public async runTest(testId: string, config?: Partial<PerformanceTestConfig>): Promise<TestResult> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }
    
    if (test.skip) {
      return this.createSkippedResult(test);
    }
    
    const testConfig = this.mergeConfig(config);
    const startTime = new Date();
    
    this.emit('testStarted', { testId, name: test.name, type: test.type });
    
    try {
      // Setup
      if (test.setup) {
        await test.setup();
      }
      
      const result = await this.executeTest(test, testConfig);
      
      // Teardown
      if (test.teardown) {
        await test.teardown();
      }
      
      this.emit('testCompleted', {
        testId,
        status: result.status,
        duration: result.duration,
        iterations: result.iterations
      });
      
      return result;
    } catch (error) {
      const result = this.createFailedResult(test, error as Error, startTime);
      
      this.emit('testFailed', {
        testId,
        error: (error as Error).message,
        duration: result.duration
      });
      
      return result;
    }
  }
  
  public async runSuite(suiteId: string, config?: Partial<PerformanceTestConfig>): Promise<TestRun> {
    const suite = this.suites.get(suiteId);
    if (!suite) {
      throw new Error(`Test suite not found: ${suiteId}`);
    }
    
    const runId = crypto.randomUUID();
    const testConfig = this.mergeConfig(config || suite.config);
    
    const run: TestRun = {
      id: runId,
      suiteId,
      testIds: suite.tests.map(t => t.id),
      config: testConfig,
      startTime: new Date(),
      status: 'running',
      results: [],
      summary: this.createEmptySummary(),
      environment: this.captureEnvironment()
    };
    
    this.runs.set(runId, run);
    this.activeRun = run;
    
    this.emit('suiteStarted', {
      runId,
      suiteId,
      testCount: suite.tests.length
    });
    
    try {
      // Suite setup
      if (suite.setup) {
        await suite.setup();
      }
      
      // Run tests
      for (const test of suite.tests) {
        if (test.only || (!test.skip && !suite.tests.some(t => t.only))) {
          const result = await this.runTest(test.id, testConfig);
          run.results.push(result);
        }
      }
      
      // Suite teardown
      if (suite.teardown) {
        await suite.teardown();
      }
      
      run.endTime = new Date();
      run.duration = run.endTime.getTime() - run.startTime.getTime();
      run.status = 'completed';
      run.summary = this.calculateSummary(run.results);
      
      this.activeRun = undefined;
      
      this.emit('suiteCompleted', {
        runId,
        suiteId,
        duration: run.duration,
        passed: run.summary.passedTests,
        failed: run.summary.failedTests
      });
      
      // Generate reports
      if (this.config.reports.enabled) {
        await this.generateReports(run);
      }
      
      return run;
    } catch (error) {
      run.endTime = new Date();
      run.duration = run.endTime.getTime() - run.startTime.getTime();
      run.status = 'failed';
      
      this.activeRun = undefined;
      
      this.emit('suiteFailed', {
        runId,
        suiteId,
        error: (error as Error).message
      });
      
      throw error;
    }
  }
  
  public async runTests(testIds: string[], config?: Partial<PerformanceTestConfig>): Promise<TestRun> {
    const runId = crypto.randomUUID();
    const testConfig = this.mergeConfig(config);
    
    const run: TestRun = {
      id: runId,
      testIds,
      config: testConfig,
      startTime: new Date(),
      status: 'running',
      results: [],
      summary: this.createEmptySummary(),
      environment: this.captureEnvironment()
    };
    
    this.runs.set(runId, run);
    this.activeRun = run;
    
    this.emit('runStarted', {
      runId,
      testCount: testIds.length
    });
    
    try {
      for (const testId of testIds) {
        const result = await this.runTest(testId, testConfig);
        run.results.push(result);
      }
      
      run.endTime = new Date();
      run.duration = run.endTime.getTime() - run.startTime.getTime();
      run.status = 'completed';
      run.summary = this.calculateSummary(run.results);
      
      this.activeRun = undefined;
      
      this.emit('runCompleted', {
        runId,
        duration: run.duration,
        passed: run.summary.passedTests,
        failed: run.summary.failedTests
      });
      
      if (this.config.reports.enabled) {
        await this.generateReports(run);
      }
      
      return run;
    } catch (error) {
      run.endTime = new Date();
      run.duration = run.endTime.getTime() - run.startTime.getTime();
      run.status = 'failed';
      
      this.activeRun = undefined;
      
      this.emit('runFailed', {
        runId,
        error: (error as Error).message
      });
      
      throw error;
    }
  }
  
  private async executeTest(test: PerformanceTest, config: PerformanceTestConfig): Promise<TestResult> {
    const startTime = new Date();
    const responseTimes: number[] = [];
    const errors: TestError[] = [];
    const warnings: TestWarning[] = [];
    const artifacts: TestArtifact[] = [];
    const customMetrics = new Map<string, number[]>();
    
    let successfulIterations = 0;
    let failedIterations = 0;
    
    // Initialize browser if needed
    if (config.browser.enabled && (test.type === 'integration' || test.type === 'load')) {
      await this.initializeBrowser();
    }
    
    // Warmup iterations
    for (let i = 0; i < config.testing.warmupIterations; i++) {
      try {
        const context = await this.createTestContext(i, config, true);
        await test.testFunction(context);
      } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
        // Ignore warmup errors
      }
    }
    
    // Actual test iterations
    const startExecutionTime = performance.now();
    
    for (let i = 0; i < config.testing.iterations; i++) {
      try {
        if (test.beforeEach) {
          await test.beforeEach();
        }
        
        const iterationStart = performance.now();
        const context = await this.createTestContext(i, config);
        
        const _result = await Promise.race([ // eslint-disable-line @typescript-eslint/no-unused-vars
          test.testFunction(context),
          this.createTimeoutPromise(config.testing.timeout)
        ]);
        
        const iterationEnd = performance.now();
        const responseTime = iterationEnd - iterationStart;
        
        responseTimes.push(responseTime);
        successfulIterations++;
        
        // Collect custom metrics
        for (const [metricName, value] of context.metrics.customMetrics.entries()) {
          if (!customMetrics.has(metricName)) {
            customMetrics.set(metricName, []);
          }
          customMetrics.get(metricName)!.push(value);
        }
        
        // Check thresholds and generate warnings
        this.checkThresholds(context.metrics, config, warnings, i);
        
        if (test.afterEach) {
          await test.afterEach();
        }
        
        this.emit('iteration', {
          testId: test.id,
          iteration: i + 1,
          responseTime,
          success: true
        });
        
      } catch (error) {
        failedIterations++;
        
        const testError: TestError = {
          message: (error as Error).message,
          stack: (error as Error).stack,
          iteration: i,
          timestamp: new Date(),
          type: this.categorizeError(error as Error),
          severity: 'high'
        };
        
        errors.push(testError);
        
        this.emit('iteration', {
          testId: test.id,
          iteration: i + 1,
          success: false,
          error: testError.message
        });
      }
      
      // Add delay between iterations for load tests
      if (test.type === 'load' || test.type === 'stress') {
        await this.sleep(Math.random() * 100 + 50);
      }
    }
    
    const endExecutionTime = performance.now();
    const totalDuration = endExecutionTime - startExecutionTime;
    
    // Calculate aggregated metrics
    const metrics = this.calculateAggregatedMetrics(
      responseTimes,
      totalDuration,
      customMetrics,
      successfulIterations,
      failedIterations
    );
    
    const result: TestResult = {
      testId: test.id,
      testName: test.name,
      type: test.type,
      status: failedIterations === 0 ? 'passed' : 'failed',
      startTime,
      endTime: new Date(),
      duration: totalDuration,
      iterations: config.testing.iterations,
      successfulIterations,
      failedIterations,
      metrics,
      errors,
      warnings,
      artifacts
    };
    
    return result;
  }
  
  private async createTestContext(iteration: number, config: PerformanceTestConfig, isWarmup: boolean = false): Promise<TestContext> {
    const sessionId = crypto.randomUUID();
    const startTime = performance.now();
    
    const metrics: PerformanceMetrics = {
      responseTime: 0,
      throughput: 0,
      errorRate: 0,
      cpuUsage: 0,
      memoryUsage: process.memoryUsage().heapUsed,
      networkLatency: 0,
      customMetrics: new Map()
    };
    
    const logger: TestLogger = {
      info: (message: string, data?: unknown) => {
        if (!isWarmup) {
          this.emit('log', { level: 'info', message, data, iteration, sessionId });
        }
      },
      warn: (message: string, data?: unknown) => {
        if (!isWarmup) {
          this.emit('log', { level: 'warn', message, data, iteration, sessionId });
        }
      },
      error: (message: string, data?: unknown) => {
        if (!isWarmup) {
          this.emit('log', { level: 'error', message, data, iteration, sessionId });
        }
      },
      debug: (message: string, data?: unknown) => {
        if (!isWarmup) {
          this.emit('log', { level: 'debug', message, data, iteration, sessionId });
        }
      },
      metric: (name: string, value: number, unit?: string) => {
        if (!isWarmup) {
          metrics.customMetrics.set(name, value);
          this.emit('metric', { name, value, unit, iteration, sessionId });
        }
      }
    };
    
    const context: TestContext = {
      iteration,
      userId: `user-${iteration}`,
      sessionId,
      startTime,
      metrics,
      logger,
      browser: this.browser,
      page: config.browser.enabled ? await this.createPage() : undefined
    };
    
    return context;
  }
  
  private async initializeBrowser(): Promise<void> {
    if (this.browser) return;
    
    try {
      // In a real implementation, would use puppeteer or playwright
      this.browser = {
        newPage: async () => ({
          goto: async (_url: string) => ({ status: () => 200 }), // eslint-disable-line @typescript-eslint/no-unused-vars
          evaluate: async (fn: () => unknown) => fn(),
          screenshot: async () => Buffer.from(''),
          close: async () => {}
        }),
        close: async () => {}
      };
      
      this.emit('browserInitialized');
    } catch (error) {
      this.emit('browserError', { error: (error as Error).message });
      throw error;
    }
  }
  
  private async createPage(): Promise<unknown> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }
    
    const page = await this.browser.newPage();
    
    // Configure viewport and other settings
    if (this.config.browser.viewport) {
      // Would set viewport in real implementation
    }
    
    if (this.config.browser.networkThrottling) {
      // Would set network throttling in real implementation
    }
    
    return page;
  }
  
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Test timeout after ${timeout}ms`));
      }, timeout);
    });
  }
  
  private checkThresholds(
    metrics: PerformanceMetrics,
    config: PerformanceTestConfig,
    warnings: TestWarning[],
    iteration: number
  ): void {
    // Check response time thresholds
    if (metrics.responseTime > config.thresholds.responseTime.p99) {
      warnings.push({
        message: `Response time ${metrics.responseTime}ms exceeds p99 threshold`,
        iteration,
        timestamp: new Date(),
        type: 'performance',
        threshold: config.thresholds.responseTime.p99,
        actualValue: metrics.responseTime
      });
    }
    
    // Check memory threshold
    const memoryMB = metrics.memoryUsage / (1024 * 1024);
    if (memoryMB > config.thresholds.resources.maxMemory) {
      warnings.push({
        message: `Memory usage ${memoryMB.toFixed(1)}MB exceeds threshold`,
        iteration,
        timestamp: new Date(),
        type: 'memory',
        threshold: config.thresholds.resources.maxMemory,
        actualValue: memoryMB
      });
    }
    
    // Check CPU threshold
    if (metrics.cpuUsage > config.thresholds.resources.maxCpu) {
      warnings.push({
        message: `CPU usage ${metrics.cpuUsage}% exceeds threshold`,
        iteration,
        timestamp: new Date(),
        type: 'performance',
        threshold: config.thresholds.resources.maxCpu,
        actualValue: metrics.cpuUsage
      });
    }
  }
  
  private categorizeError(error: Error): 'assertion' | 'timeout' | 'network' | 'system' | 'unknown' {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('network') || message.includes('fetch') || message.includes('request')) return 'network';
    if (message.includes('assert') || message.includes('expect')) return 'assertion';
    if (message.includes('system') || message.includes('memory') || message.includes('cpu')) return 'system';
    
    return 'unknown';
  }
  
  private calculateAggregatedMetrics(
    responseTimes: number[],
    totalDuration: number,
    customMetrics: Map<string, number[]>,
    successfulIterations: number,
    failedIterations: number
  ): AggregatedMetrics {
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const totalIterations = successfulIterations + failedIterations;
    
    const responseTimeMetrics = {
      min: sortedTimes.length > 0 ? sortedTimes[0] : 0,
      max: sortedTimes.length > 0 ? sortedTimes[sortedTimes.length - 1] : 0,
      mean: sortedTimes.length > 0 ? sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length : 0,
      median: sortedTimes.length > 0 ? this.percentile(sortedTimes, 50) : 0,
      p90: sortedTimes.length > 0 ? this.percentile(sortedTimes, 90) : 0,
      p95: sortedTimes.length > 0 ? this.percentile(sortedTimes, 95) : 0,
      p99: sortedTimes.length > 0 ? this.percentile(sortedTimes, 99) : 0,
      stdDev: this.calculateStandardDeviation(sortedTimes)
    };
    
    const throughputMetrics = {
      mean: totalDuration > 0 ? (successfulIterations / totalDuration) * 1000 : 0,
      max: 0, // Would calculate based on time windows
      min: 0
    };
    
    const errorRate = totalIterations > 0 ? (failedIterations / totalIterations) * 100 : 0;
    
    const processedCustomMetrics: Record<string, unknown> = {};
    for (const [name, values] of customMetrics.entries()) {
      const sortedValues = values.sort((a, b) => a - b);
      processedCustomMetrics[name] = {
        min: sortedValues.length > 0 ? sortedValues[0] : 0,
        max: sortedValues.length > 0 ? sortedValues[sortedValues.length - 1] : 0,
        mean: sortedValues.length > 0 ? sortedValues.reduce((sum, val) => sum + val, 0) / sortedValues.length : 0,
        count: sortedValues.length
      };
    }
    
    return {
      responseTime: responseTimeMetrics,
      throughput: throughputMetrics,
      errorRate,
      resourceUsage: {
        cpu: { min: 0, max: 0, mean: 0 }, // Would track actual CPU usage
        memory: { min: 0, max: 0, mean: 0, peak: 0 } // Would track actual memory usage
      },
      customMetrics: processedCustomMetrics
    };
  }
  
  private percentile(sortedArray: number[], p: number): number {
    const index = (p / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
    
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }
  
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
    
    return Math.sqrt(avgSquaredDiff);
  }
  
  private createSkippedResult(test: PerformanceTest): TestResult {
    return {
      testId: test.id,
      testName: test.name,
      type: test.type,
      status: 'skipped',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      iterations: 0,
      successfulIterations: 0,
      failedIterations: 0,
      metrics: this.createEmptyMetrics(),
      errors: [],
      warnings: [],
      artifacts: []
    };
  }
  
  private createFailedResult(test: PerformanceTest, error: Error, startTime: Date): TestResult {
    const endTime = new Date();
    
    return {
      testId: test.id,
      testName: test.name,
      type: test.type,
      status: 'failed',
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      iterations: 0,
      successfulIterations: 0,
      failedIterations: 1,
      metrics: this.createEmptyMetrics(),
      errors: [{
        message: error.message,
        stack: error.stack,
        iteration: 0,
        timestamp: new Date(),
        type: 'system',
        severity: 'critical'
      }],
      warnings: [],
      artifacts: []
    };
  }
  
  private createEmptyMetrics(): AggregatedMetrics {
    return {
      responseTime: {
        min: 0, max: 0, mean: 0, median: 0,
        p90: 0, p95: 0, p99: 0, stdDev: 0
      },
      throughput: { mean: 0, max: 0, min: 0 },
      errorRate: 0,
      resourceUsage: {
        cpu: { min: 0, max: 0, mean: 0 },
        memory: { min: 0, max: 0, mean: 0, peak: 0 }
      },
      customMetrics: {}
    };
  }
  
  private createEmptySummary(): TestRunSummary {
    return {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalIterations: 0,
      successfulIterations: 0,
      failedIterations: 0,
      averageResponseTime: 0,
      averageThroughput: 0,
      overallErrorRate: 0,
      thresholdViolations: []
    };
  }
  
  private calculateSummary(results: TestResult[]): TestRunSummary {
    const summary: TestRunSummary = {
      totalTests: results.length,
      passedTests: results.filter(r => r.status === 'passed').length,
      failedTests: results.filter(r => r.status === 'failed').length,
      skippedTests: results.filter(r => r.status === 'skipped').length,
      totalIterations: results.reduce((sum, r) => sum + r.iterations, 0),
      successfulIterations: results.reduce((sum, r) => sum + r.successfulIterations, 0),
      failedIterations: results.reduce((sum, r) => sum + r.failedIterations, 0),
      averageResponseTime: 0,
      averageThroughput: 0,
      overallErrorRate: 0,
      thresholdViolations: []
    };
    
    const validResults = results.filter(r => r.status === 'passed' || r.status === 'failed');
    
    if (validResults.length > 0) {
      summary.averageResponseTime = validResults.reduce((sum, r) => sum + r.metrics.responseTime.mean, 0) / validResults.length;
      summary.averageThroughput = validResults.reduce((sum, r) => sum + r.metrics.throughput.mean, 0) / validResults.length;
      summary.overallErrorRate = summary.totalIterations > 0 ? (summary.failedIterations / summary.totalIterations) * 100 : 0;
    }
    
    // Check threshold violations
    for (const result of validResults) {
      if (result.metrics.responseTime.p99 > this.config.thresholds.responseTime.p99) {
        summary.thresholdViolations.push({
          metric: 'responseTime.p99',
          threshold: this.config.thresholds.responseTime.p99,
          actualValue: result.metrics.responseTime.p99,
          severity: 'error',
          testId: result.testId
        });
      }
      
      if (result.metrics.errorRate > this.config.thresholds.errorRate.max) {
        summary.thresholdViolations.push({
          metric: 'errorRate',
          threshold: this.config.thresholds.errorRate.max,
          actualValue: result.metrics.errorRate,
          severity: 'error',
          testId: result.testId
        });
      }
    }
    
    return summary;
  }
  
  private captureEnvironment(): TestEnvironment {
    return {
      os: process.platform,
      nodejs: process.version,
      memory: Math.round(os.totalmem() / (1024 * 1024)),
      cpu: os.cpus()[0]?.model || 'unknown',
      timestamp: new Date(),
      userAgent: this.config.browser.userAgent
    };
  }
  
  private mergeConfig(override?: Partial<PerformanceTestConfig>): PerformanceTestConfig {
    return {
      ...this.config,
      ...override,
      testing: { ...this.config.testing, ...override?.testing },
      metrics: { ...this.config.metrics, ...override?.metrics },
      thresholds: {
        ...this.config.thresholds,
        ...override?.thresholds,
        responseTime: { ...this.config.thresholds.responseTime, ...override?.thresholds?.responseTime },
        throughput: { ...this.config.thresholds.throughput, ...override?.thresholds?.throughput },
        errorRate: { ...this.config.thresholds.errorRate, ...override?.thresholds?.errorRate },
        resources: { ...this.config.thresholds.resources, ...override?.thresholds?.resources }
      },
      reports: { ...this.config.reports, ...override?.reports },
      browser: { ...this.config.browser, ...override?.browser }
    };
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Load Testing
  
  public async runLoadTest(scenario: LoadTestScenario, test: PerformanceTest): Promise<TestResult> {
    const results: TestResult[] = [];
    const startTime = new Date();
    
    this.emit('loadTestStarted', {
      scenario: scenario.name,
      testId: test.id
    });
    
    // Ramp up phase
    await this.executeLoadPhase('rampup', scenario.rampUp, test);
    
    // Sustained phase
    await this.executeLoadPhase('sustained', scenario.sustained, test);
    
    // Ramp down phase
    await this.executeLoadPhase('rampdown', scenario.rampDown, test);
    
    this.emit('loadTestCompleted', {
      scenario: scenario.name,
      testId: test.id,
      duration: Date.now() - startTime.getTime()
    });
    
    // Aggregate results
    return this.aggregateLoadTestResults(results, startTime, test);
  }
  
  private async executeLoadPhase(phase: string, config: unknown, test: PerformanceTest): Promise<void> {
    this.emit('loadPhaseStarted', { phase, config });
    
    // Simplified load phase execution
    // In a real implementation, would manage multiple concurrent users
    const iterations = config.users || config.duration / 100;
    
    for (let i = 0; i < iterations; i++) {
      try {
        const context = await this.createTestContext(i, this.config);
        await test.testFunction(context);
        
        // Think time
        if (phase === 'sustained') {
          const thinkTime = Math.random() * 1000 + 500;
          await this.sleep(thinkTime);
        }
      } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
        // Handle load test errors
      }
    }
    
    this.emit('loadPhaseCompleted', { phase });
  }
  
  private aggregateLoadTestResults(results: TestResult[], startTime: Date, test: PerformanceTest): TestResult {
    // Simplified aggregation
    return {
      testId: test.id,
      testName: test.name,
      type: 'load',
      status: 'passed',
      startTime,
      endTime: new Date(),
      duration: Date.now() - startTime.getTime(),
      iterations: results.reduce((sum, r) => sum + r.iterations, 0),
      successfulIterations: results.reduce((sum, r) => sum + r.successfulIterations, 0),
      failedIterations: results.reduce((sum, r) => sum + r.failedIterations, 0),
      metrics: this.createEmptyMetrics(), // Would aggregate actual metrics
      errors: results.flatMap(r => r.errors),
      warnings: results.flatMap(r => r.warnings),
      artifacts: results.flatMap(r => r.artifacts)
    };
  }
  
  // Benchmarking
  
  public async benchmark(name: string, fn: () => Promise<unknown> | unknown, iterations: number = 1000): Promise<BenchmarkResult> {
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    let peakMemory = memoryBefore.heapUsed;
    
    // Warmup
    for (let i = 0; i < Math.min(iterations / 10, 100); i++) {
      await fn();
    }
    
    // Actual benchmark
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();
      await fn();
      const iterationEnd = performance.now();
      
      times.push(iterationEnd - iterationStart);
      
      // Track peak memory usage
      const currentMemory = process.memoryUsage().heapUsed;
      if (currentMemory > peakMemory) {
        peakMemory = currentMemory;
      }
    }
    
    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    const memoryAfter = process.memoryUsage();
    
    const sortedTimes = times.sort((a, b) => a - b);
    
    return {
      name,
      operations: iterations,
      duration: totalDuration,
      opsPerSecond: (iterations / totalDuration) * 1000,
      avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: sortedTimes[0],
      maxTime: sortedTimes[sortedTimes.length - 1],
      percentiles: {
        p50: this.percentile(sortedTimes, 50),
        p90: this.percentile(sortedTimes, 90),
        p95: this.percentile(sortedTimes, 95),
        p99: this.percentile(sortedTimes, 99)
      },
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: peakMemory
      }
    };
  }
  
  // Report Generation
  
  private async generateReports(run: TestRun): Promise<void> {
    for (const format of this.config.reports.formats) {
      switch (format) {
        case 'json':
          await this.generateJSONReport(run);
          break;
        case 'html':
          await this.generateHTMLReport(run);
          break;
        case 'csv':
          await this.generateCSVReport(run);
          break;
        case 'junit':
          await this.generateJUnitReport(run);
          break;
      }
    }
  }
  
  private async generateJSONReport(run: TestRun): Promise<void> {
    const reportPath = path.join(this.config.reports.outputDir, `performance-report-${run.id}.json`);
    
    const report = {
      run,
      generated: new Date().toISOString(),
      framework: 'PerformanceTestingFramework',
      version: '1.0.0'
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }
  
  private async generateHTMLReport(run: TestRun): Promise<void> {
    const reportPath = path.join(this.config.reports.outputDir, `performance-report-${run.id}.html`);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f0f8ff; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .test-result { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .passed { border-color: #28a745; }
        .failed { border-color: #dc3545; }
        .skipped { border-color: #ffc107; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .metric { background: white; border: 1px solid #eee; padding: 10px; border-radius: 3px; }
        .chart { height: 300px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>Performance Test Report</h1>
    
    <div class="summary">
        <h2>Test Run Summary</h2>
        <div class="metrics">
            <div class="metric">
                <h3>Total Tests</h3>
                <p>${run.summary.totalTests}</p>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <p style="color: #28a745;">${run.summary.passedTests}</p>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <p style="color: #dc3545;">${run.summary.failedTests}</p>
            </div>
            <div class="metric">
                <h3>Average Response Time</h3>
                <p>${run.summary.averageResponseTime.toFixed(2)}ms</p>
            </div>
            <div class="metric">
                <h3>Error Rate</h3>
                <p>${run.summary.overallErrorRate.toFixed(2)}%</p>
            </div>
            <div class="metric">
                <h3>Duration</h3>
                <p>${((run.duration || 0) / 1000).toFixed(1)}s</p>
            </div>
        </div>
    </div>
    
    <h2>Test Results</h2>
    ${run.results.map(result => `
        <div class="test-result ${result.status}">
            <h3>${result.testName} (${result.type})</h3>
            <p><strong>Status:</strong> ${result.status}</p>
            <p><strong>Duration:</strong> ${(result.duration / 1000).toFixed(2)}s</p>
            <p><strong>Iterations:</strong> ${result.iterations} (${result.successfulIterations} successful, ${result.failedIterations} failed)</p>
            <p><strong>Average Response Time:</strong> ${result.metrics.responseTime.mean.toFixed(2)}ms</p>
            <p><strong>P95 Response Time:</strong> ${result.metrics.responseTime.p95.toFixed(2)}ms</p>
            <p><strong>Error Rate:</strong> ${result.metrics.errorRate.toFixed(2)}%</p>
            
            ${result.errors.length > 0 ? `
                <h4>Errors (${result.errors.length})</h4>
                <ul>
                    ${result.errors.slice(0, 5).map(error => `
                        <li><strong>${error.type}:</strong> ${error.message}</li>
                    `).join('')}
                </ul>
            ` : ''}
            
            ${result.warnings.length > 0 ? `
                <h4>Warnings (${result.warnings.length})</h4>
                <ul>
                    ${result.warnings.slice(0, 5).map(warning => `
                        <li><strong>${warning.type}:</strong> ${warning.message}</li>
                    `).join('')}
                </ul>
            ` : ''}
        </div>
    `).join('')}
    
    <script>
        // Add interactive charts here
        console.log('Test run data:', ${JSON.stringify(run, null, 2)});
    </script>
</body>
</html>`;
    
    fs.writeFileSync(reportPath, html);
  }
  
  private async generateCSVReport(run: TestRun): Promise<void> {
    const reportPath = path.join(this.config.reports.outputDir, `performance-report-${run.id}.csv`);
    
    const headers = [
      'Test ID', 'Test Name', 'Type', 'Status', 'Duration (ms)', 'Iterations',
      'Successful Iterations', 'Failed Iterations', 'Avg Response Time (ms)',
      'P95 Response Time (ms)', 'P99 Response Time (ms)', 'Error Rate (%)',
      'Throughput (ops/sec)', 'Errors', 'Warnings'
    ];
    
    const rows = run.results.map(result => [
      result.testId,
      result.testName,
      result.type,
      result.status,
      result.duration,
      result.iterations,
      result.successfulIterations,
      result.failedIterations,
      result.metrics.responseTime.mean.toFixed(2),
      result.metrics.responseTime.p95.toFixed(2),
      result.metrics.responseTime.p99.toFixed(2),
      result.metrics.errorRate.toFixed(2),
      result.metrics.throughput.mean.toFixed(2),
      result.errors.length,
      result.warnings.length
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    fs.writeFileSync(reportPath, csv);
  }
  
  private async generateJUnitReport(run: TestRun): Promise<void> {
    const reportPath = path.join(this.config.reports.outputDir, `performance-junit-${run.id}.xml`);
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite 
  name="Performance Tests" 
  tests="${run.summary.totalTests}" 
  failures="${run.summary.failedTests}" 
  skipped="${run.summary.skippedTests}" 
  time="${((run.duration || 0) / 1000).toFixed(3)}"
  timestamp="${run.startTime.toISOString()}">
  ${run.results.map(result => `
    <testcase 
      name="${result.testName}" 
      classname="${result.type}" 
      time="${(result.duration / 1000).toFixed(3)}">
      ${result.status === 'failed' ? `
        <failure message="${result.errors[0]?.message || 'Test failed'}" type="${result.errors[0]?.type || 'unknown'}">
          ${result.errors[0]?.stack || result.errors[0]?.message || 'No details available'}
        </failure>
      ` : ''}
      ${result.status === 'skipped' ? '<skipped/>' : ''}
      <system-out>
        Iterations: ${result.iterations}
        Successful: ${result.successfulIterations}
        Failed: ${result.failedIterations}
        Avg Response Time: ${result.metrics.responseTime.mean.toFixed(2)}ms
        P95 Response Time: ${result.metrics.responseTime.p95.toFixed(2)}ms
        Error Rate: ${result.metrics.errorRate.toFixed(2)}%
      </system-out>
    </testcase>
  `).join('')}
</testsuite>`;
    
    fs.writeFileSync(reportPath, xml);
  }
  
  // Public API
  
  public getRun(runId: string): TestRun | undefined {
    return this.runs.get(runId);
  }
  
  public getAllRuns(): TestRun[] {
    return Array.from(this.runs.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }
  
  public getActiveRun(): TestRun | undefined {
    return this.activeRun;
  }
  
  public async cancelRun(runId: string): Promise<boolean> {
    const run = this.runs.get(runId);
    if (!run || run.status !== 'running') {
      return false;
    }
    
    run.status = 'cancelled';
    run.endTime = new Date();
    run.duration = run.endTime.getTime() - run.startTime.getTime();
    
    if (this.activeRun?.id === runId) {
      this.activeRun = undefined;
    }
    
    this.emit('runCancelled', { runId });
    
    return true;
  }
  
  public getStats(): {
    totalTests: number;
    totalRuns: number;
    averageResponseTime: number;
    averageThroughput: number;
    overallSuccessRate: number;
    commonErrors: Array<{ type: string; count: number }>;
  } {
    const runs = Array.from(this.runs.values());
    const completedRuns = runs.filter(r => r.status === 'completed');
    
    const totalIterations = completedRuns.reduce((sum, run) => sum + run.summary.totalIterations, 0);
    const successfulIterations = completedRuns.reduce((sum, run) => sum + run.summary.successfulIterations, 0);
    
    const allErrors = completedRuns.flatMap(run => run.results.flatMap(result => result.errors));
    const errorTypes = allErrors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalTests: this.tests.size,
      totalRuns: runs.length,
      averageResponseTime: completedRuns.length > 0 ? 
        completedRuns.reduce((sum, run) => sum + run.summary.averageResponseTime, 0) / completedRuns.length : 0,
      averageThroughput: completedRuns.length > 0 ? 
        completedRuns.reduce((sum, run) => sum + run.summary.averageThroughput, 0) / completedRuns.length : 0,
      overallSuccessRate: totalIterations > 0 ? (successfulIterations / totalIterations) * 100 : 0,
      commonErrors: Object.entries(errorTypes)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    };
  }
  
  public destroy(): void {
    // Close browser if open
    if (this.browser) {
      this.browser.close?.();
    }
    
    // Cancel active run
    if (this.activeRun) {
      this.cancelRun(this.activeRun.id);
    }
    
    // Clear all data
    this.tests.clear();
    this.suites.clear();
    this.runs.clear();
    
    this.emit('destroyed');
  }
}
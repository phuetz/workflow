/**
 * Testing Type Definitions
 * Types for workflow testing framework
 */


export interface WorkflowTestCase {
  id: string;
  name: string;
  description?: string;
  workflowId: string;
  input: Record<string, unknown>;
  expectedOutput?: unknown;
  assertions: TestAssertion[];
  timeout?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  priority?: 'low' | 'medium' | 'high';
  enabled?: boolean;
}

export interface TestAssertion {
  id?: string;
  type: 'output' | 'node' | 'variable' | 'duration' | 'status' | 'custom';
  description: string;
  operator: AssertionOperator;
  expected?: unknown;
  path?: string; // JSON path for nested values
  nodeId?: string; // For node-specific assertions
  variableName?: string; // For variable assertions
  customFunction?: (actual: unknown, expected: unknown) => boolean;
  actual?: unknown; // Populated during execution
  passed?: boolean; // Populated during execution
  error?: string; // Populated if assertion fails
  executedAt?: Date; // Populated during execution
}

export type AssertionOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'matches' // Regex
  | 'exists'
  | 'not_exists'
  | 'type'
  | 'length'
  | 'deep_equals'
  | 'custom';

export interface WorkflowTestResult {
  id: string;
  testCaseId: string;
  workflowId: string;
  executionId: string;
  status: TestStatus;
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  input: Record<string, unknown>;
  output?: unknown;
  assertions: TestAssertion[];
  coverage?: TestCoverage;
  error?: Error;
  logs: TestLog[];
  screenshots?: string[]; // URLs or base64
  metrics: TestMetrics;
  environment?: TestEnvironment;
}

export type TestStatus = 
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'error'
  | 'skipped'
  | 'timeout';

export interface TestCoverage {
  nodes: {
    total: number;
    covered: number;
    percentage: number;
  };
  paths: {
    total: number;
    covered: number;
    percentage: number;
  };
  conditions?: {
    total: number;
    covered: number;
    percentage: number;
  };
  overall: number;
  uncoveredNodes: string[];
  uncoveredPaths: string[];
  executionPaths: string[];
}

export interface TestLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
  nodeId?: string;
  source?: string;
}

export interface TestMetrics {
  nodesExecuted: number;
  assertionsPassed: number;
  assertionsFailed: number;
  averageNodeDuration?: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface TestEnvironment {
  browser?: string;
  os?: string;
  node?: string;
  variables?: Record<string, string>;
  features?: Record<string, boolean>;
}

export interface TestExecutionContext {
  testId: string;
  mockData: Record<string, unknown>;
  logs: TestLog[];
  variables: Record<string, unknown>;
  startTime: number;
  timeout: number;
  debug: boolean;
  breakpoints?: Set<string>;
  currentNode?: string;
  callStack?: string[];
}

export interface TestReport {
  id: string;
  createdAt: Date;
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    skipped?: number;
    passRate: number;
  };
  results: WorkflowTestResult[];
  coverage?: TestCoverage;
  insights: string[];
  recommendations?: string[];
  trends?: TestTrend[];
}

export interface TestTrend {
  date: Date;
  passRate: number;
  avgDuration: number;
  testCount: number;
  coverage?: number;
}

export interface TestSuite {
  id: string;
  name: string;
  description?: string;
  workflowIds: string[];
  testCases: WorkflowTestCase[];
  schedule?: TestSchedule;
  notifications?: TestNotification[];
  config?: TestSuiteConfig;
  lastRun?: Date;
  nextRun?: Date;
}

export interface TestSchedule {
  enabled: boolean;
  cron: string; // Cron expression
  timezone?: string;
  maxDuration?: number;
}

export interface TestNotification {
  type: 'email' | 'slack' | 'webhook';
  config: Record<string, unknown>;
  events: Array<'start' | 'complete' | 'failure' | 'success'>;
  recipients?: string[];
}

export interface TestSuiteConfig {
  parallel?: boolean;
  maxParallel?: number;
  stopOnFailure?: boolean;
  retryFailedTests?: boolean;
  maxRetries?: number;
  timeout?: number;
  coverage?: boolean;
  screenshots?: boolean;
  videoRecording?: boolean;
}

// Mock and Stub types
export interface TestMock {
  id: string;
  type: 'api' | 'database' | 'service' | 'node';
  target: string; // API endpoint, service name, etc.
  response?: unknown;
  error?: Error;
  delay?: number;
  conditional?: {
    condition: string; // Expression
    responses: Record<string, unknown>;
  };
}

export interface TestStub {
  nodeId: string;
  output?: unknown;
  error?: Error;
  duration?: number;
  skip?: boolean;
}

// Debugging types
export interface TestBreakpoint {
  nodeId: string;
  condition?: string; // Optional conditional breakpoint
  hitCount?: number;
  enabled: boolean;
}

export interface TestDebugSession {
  id: string;
  testId: string;
  breakpoints: TestBreakpoint[];
  currentNode?: string;
  callStack: string[];
  variables: Record<string, unknown>;
  watchExpressions: WatchExpression[];
  stepMode: 'into' | 'over' | 'out' | 'continue';
}

export interface WatchExpression {
  id: string;
  expression: string;
  value?: unknown;
  error?: string;
}

// Data generation types
export interface TestDataGenerator {
  type: 'faker' | 'random' | 'sequence' | 'custom';
  config: Record<string, unknown>;
  generate: () => unknown;
}

export interface TestDataSet {
  id: string;
  name: string;
  description?: string;
  schema: Record<string, TestDataField>;
  records: number;
  generated?: Record<string, unknown>[];
}

export interface TestDataField {
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  generator?: TestDataGenerator;
  constraints?: {
    min?: number;
    max?: number;
    length?: number;
    pattern?: string;
    enum?: unknown[];
    unique?: boolean;
  };
}

// Performance testing types
export interface PerformanceTest extends WorkflowTestCase {
  type: 'load' | 'stress' | 'spike' | 'endurance';
  config: PerformanceTestConfig;
}

export interface PerformanceTestConfig {
  users: number;
  rampUp: number; // seconds
  duration: number; // seconds
  iterations?: number;
  thresholds?: PerformanceThresholds;
}

export interface PerformanceThresholds {
  avgResponseTime?: number;
  p95ResponseTime?: number;
  p99ResponseTime?: number;
  errorRate?: number;
  throughput?: number;
}

export interface PerformanceTestResult extends WorkflowTestResult {
  performance: {
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number;
    errorRate: number;
    virtualUsers: number;
  };
  timeline: PerformanceTimeline[];
}

export interface PerformanceTimeline {
  timestamp: Date;
  activeUsers: number;
  responseTime: number;
  throughput: number;
  errors: number;
}

// Visual testing types
export interface VisualTest {
  id: string;
  name: string;
  workflowId: string;
  nodeId?: string;
  baseline?: string; // Image URL or base64
  threshold?: number; // Difference threshold
  ignoreRegions?: Rectangle[];
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisualTestResult {
  testId: string;
  passed: boolean;
  difference?: number;
  baseline: string;
  actual: string;
  diff?: string; // Diff image
  regions?: DifferenceRegion[];
}

export interface DifferenceRegion extends Rectangle {
  difference: number;
  type: 'added' | 'removed' | 'changed';
}
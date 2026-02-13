/**
 * AgentOps Type Definitions
 *
 * Complete type system for AI agent lifecycle management including:
 * - Deployment pipelines
 * - Version control
 * - A/B testing
 * - Monitoring and rollback
 */

/**
 * User information for audit trails
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Agent definition
 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  type: 'classifier' | 'router' | 'executor' | 'orchestrator' | 'custom';
  version: string;
  code: string;
  dependencies: Record<string, string>;
  configuration: Record<string, any>;
  metadata: {
    created: number;
    updated: number;
    author: User;
    tags: string[];
  };
}

/**
 * Deployment environments
 */
export type Environment = 'dev' | 'staging' | 'prod';

/**
 * Deployment strategies
 */
export type DeploymentStrategy = 'blue-green' | 'canary' | 'rolling';

/**
 * Deployment stage status
 */
export type StageStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

/**
 * Individual deployment stage
 */
export interface DeploymentStage {
  name: 'build' | 'test' | 'validate' | 'deploy' | 'verify';
  status: StageStatus;
  startTime?: number;
  endTime?: number;
  duration?: number;
  logs: string[];
  error?: string;
  artifacts?: Record<string, any>;
}

/**
 * Deployment configuration
 */
export interface DeploymentConfig {
  agent: Agent;
  environment: Environment;
  strategy: DeploymentStrategy;

  // Strategy-specific settings
  canaryConfig?: {
    steps: number[];  // e.g., [5, 25, 50, 100] for gradual rollout
    stepDuration: number;  // Duration of each step (ms)
    successCriteria: {
      errorRate: number;    // Max error rate (0-1)
      latency: number;      // Max P95 latency (ms)
    };
  };

  rollingConfig?: {
    batchSize: number;      // Instances to update at once
    batchDelay: number;     // Delay between batches (ms)
  };

  // Testing requirements
  testConfig?: {
    unitTests: boolean;
    integrationTests: boolean;
    performanceTests: boolean;
    minCoverage: number;    // Min test coverage (0-1)
  };

  // Validation rules
  validationRules?: {
    requireApproval: boolean;
    approvers?: User[];
    policyChecks: string[];
    securityScan: boolean;
  };

  // Rollback settings
  autoRollback?: {
    enabled: boolean;
    errorThreshold: number;   // Error rate threshold (0-1)
    latencyThreshold: number; // Latency threshold (ms)
    timeWindow: number;       // Monitoring window (ms)
  };
}

/**
 * Deployment result
 */
export interface DeploymentResult {
  id: string;
  config: DeploymentConfig;
  status: 'success' | 'failed' | 'rolled-back';
  stages: DeploymentStage[];
  startTime: number;
  endTime: number;
  duration: number;
  deployer: User;

  // Deployment artifacts
  artifacts: {
    buildId: string;
    packageUrl: string;
    manifestUrl: string;
    logsUrl: string;
  };

  // Health check results
  healthCheck?: {
    status: 'healthy' | 'unhealthy';
    checks: Array<{
      name: string;
      status: boolean;
      message: string;
    }>;
  };

  error?: string;
}

/**
 * Agent change for version tracking
 */
export interface AgentChange {
  type: 'code' | 'config' | 'dependencies' | 'metadata';
  path: string;
  oldValue?: any;
  newValue?: any;
  diff?: string;
}

/**
 * Agent version
 */
export interface AgentVersion {
  id: string;
  agentId: string;
  version: string;          // Semantic versioning (1.2.3)
  commit: string;           // Git commit hash
  author: User;
  timestamp: number;
  message: string;          // Commit message
  changes: AgentChange[];
  tags: string[];           // e.g., 'stable', 'beta', 'deprecated'
  parent?: string;          // Parent version ID
  branch: string;           // Branch name

  // Snapshot of agent at this version
  snapshot: Agent;
}

/**
 * Agent branch
 */
export interface AgentBranch {
  name: string;
  agentId: string;
  head: string;             // Current version ID
  created: number;
  creator: User;
  description: string;
  protected: boolean;       // Protected branches require approval to merge
}

/**
 * Merge result
 */
export interface MergeResult {
  success: boolean;
  conflicts: Array<{
    path: string;
    base: any;
    source: any;
    target: any;
  }>;
  mergedVersion?: AgentVersion;
}

/**
 * A/B test metric
 */
export interface Metric {
  name: string;
  type: 'gauge' | 'counter' | 'histogram' | 'rate';
  unit: string;
  higherIsBetter: boolean;  // For winner determination
}

/**
 * A/B test variant data
 */
export interface VariantData {
  version: AgentVersion;
  sampleSize: number;
  metrics: Record<string, number[]>;  // Metric name -> values

  // Computed statistics
  stats: Record<string, {
    mean: number;
    median: number;
    stdDev: number;
    p50: number;
    p95: number;
    p99: number;
  }>;
}

/**
 * Statistical test result
 */
export interface StatisticalTestResult {
  testType: 't-test' | 'chi-square' | 'mann-whitney';
  pValue: number;
  confidence: number;
  significant: boolean;
  effectSize: number;
}

/**
 * A/B test configuration
 */
export interface ABTest {
  id: string;
  name: string;
  description: string;
  agentId: string;

  // Variants
  variantA: VariantData;  // Control
  variantB: VariantData;  // Treatment

  // Test configuration
  trafficSplit: number;   // 0-1 (e.g., 0.5 = 50/50)
  metrics: Metric[];
  duration: number;       // Test duration (ms)
  minSampleSize: number;  // Minimum sample size per variant

  // Status
  status: 'pending' | 'running' | 'completed' | 'stopped';
  startTime?: number;
  endTime?: number;

  // Results
  results?: {
    sampleSize: number;
    testResults: Record<string, StatisticalTestResult>;
    winner?: 'A' | 'B' | 'tie';
    recommendation: string;
    confidence: number;
  };

  creator: User;
  created: number;
}

/**
 * Agent health metrics
 */
export interface AgentHealthMetrics {
  agentId: string;
  timestamp: number;

  // Availability
  uptime: number;           // Percentage (0-1)
  uptimeSeconds: number;    // Total uptime (seconds)
  downtimeSeconds: number;  // Total downtime (seconds)

  // Performance
  latency: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
    min: number;
    mean: number;
  };

  // Reliability
  successRate: number;      // Percentage (0-1)
  errorRate: number;        // Percentage (0-1)
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;

  // Resource usage
  cpu: number;              // Percentage (0-1)
  memory: number;           // Bytes
  memoryPercent: number;    // Percentage (0-1)

  // Throughput
  requestsPerSecond: number;
  bytesPerSecond: number;

  // Cost
  totalCost: number;        // USD
  costPerRequest: number;   // USD

  // Errors
  errorBreakdown: Record<string, number>;  // Error type -> count
}

/**
 * Alert configuration
 */
export interface Alert {
  id: string;
  name: string;
  agentId: string;

  // Alert conditions
  conditions: Array<{
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold: number;
    duration: number;  // Metric must exceed threshold for this duration (ms)
  }>;

  // Notification channels
  channels: Array<{
    type: 'email' | 'slack' | 'teams' | 'pagerduty' | 'webhook';
    config: Record<string, any>;
  }>;

  // Auto-remediation
  remediation?: {
    enabled: boolean;
    actions: Array<'restart' | 'rollback' | 'scale-up' | 'scale-down'>;
  };

  status: 'active' | 'disabled';
  created: number;
  creator: User;
}

/**
 * Rollback history entry
 */
export interface RollbackHistory {
  id: string;
  agentId: string;
  fromVersion: string;
  toVersion: string;
  reason: string;
  trigger: 'manual' | 'automatic';
  triggeredBy?: User;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'success' | 'failed';
  error?: string;
}

/**
 * Error threshold for auto-rollback
 */
export interface ErrorThreshold {
  errorRate: number;        // Max error rate (0-1)
  latency: number;          // Max P95 latency (ms)
  timeWindow: number;       // Monitoring window (ms)
  minRequests: number;      // Min requests before triggering
}

/**
 * Agent test assertion
 */
export interface Assertion {
  type: 'equals' | 'contains' | 'matches' | 'greater-than' | 'less-than' | 'exists';
  path: string;             // JSON path to value
  expected: any;
  actual?: any;
  passed?: boolean;
  message?: string;
}

/**
 * Agent behavior specification
 */
export interface Behavior {
  description: string;
  preconditions: Record<string, any>;
  postconditions: Record<string, any>;
  sideEffects: string[];
}

/**
 * Unit test
 */
export interface UnitTest {
  id: string;
  name: string;
  description: string;
  input: any;
  expectedOutput: any;
  assertions: Assertion[];
  timeout: number;
  tags: string[];
}

/**
 * Integration test
 */
export interface IntegrationTest {
  id: string;
  name: string;
  description: string;
  workflow: any;            // Workflow definition
  expectedBehavior: Behavior;
  timeout: number;
  tags: string[];
}

/**
 * Performance test
 */
export interface PerformanceTest {
  id: string;
  name: string;
  description: string;
  load: number;             // Concurrent requests
  duration: number;         // Test duration (ms)
  rampUpTime: number;       // Ramp-up period (ms)
  targets: {
    latency: number;        // Max P95 latency (ms)
    throughput: number;     // Min requests/sec
    errorRate: number;      // Max error rate (0-1)
  };
  tags: string[];
}

/**
 * Load test
 */
export interface LoadTest {
  id: string;
  name: string;
  description: string;
  rampUp: number;           // Users added per second
  peak: number;             // Max concurrent users
  duration: number;         // Test duration (ms)
  holdTime: number;         // Time to hold at peak (ms)
  targets: {
    latency: number;
    throughput: number;
    errorRate: number;
  };
  tags: string[];
}

/**
 * Test result
 */
export interface TestResult {
  testId: string;
  testType: 'unit' | 'integration' | 'performance' | 'load';
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration: number;
  startTime: number;
  endTime: number;
  error?: string;

  // Assertion results (for unit/integration tests)
  assertions?: Array<Assertion & { passed: boolean }>;

  // Performance metrics (for performance/load tests)
  metrics?: {
    latency: {
      p50: number;
      p95: number;
      p99: number;
      max: number;
      min: number;
    };
    throughput: number;
    errorRate: number;
    totalRequests: number;
  };
}

/**
 * Test suite
 */
export interface TestSuite {
  id: string;
  name: string;
  agentId: string;
  unitTests: UnitTest[];
  integrationTests: IntegrationTest[];
  performanceTests: PerformanceTest[];
  loadTests: LoadTest[];
  created: number;
  creator: User;
}

/**
 * Test execution result
 */
export interface TestExecutionResult {
  suiteId: string;
  agentId: string;
  results: TestResult[];

  // Summary
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    coverage: number;      // Code coverage (0-1)
  };

  startTime: number;
  endTime: number;
  executor: User;
}

/**
 * Deployment pipeline event
 */
export interface PipelineEvent {
  type: 'stage-started' | 'stage-completed' | 'stage-failed' | 'deployment-completed' | 'deployment-failed';
  deploymentId: string;
  stage?: string;
  timestamp: number;
  data: Record<string, any>;
}

/**
 * Version control operation
 */
export interface VersionOperation {
  type: 'commit' | 'branch' | 'merge' | 'tag' | 'rollback';
  agentId: string;
  timestamp: number;
  user: User;
  data: Record<string, any>;
}

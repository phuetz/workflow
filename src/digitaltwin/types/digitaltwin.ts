/**
 * Digital Twin & Simulation System Type Definitions
 *
 * Provides comprehensive type safety for workflow digital twins,
 * simulation, fault injection, and regression testing.
 */

import type { Workflow, WorkflowExecution, WorkflowNode } from '../../types/workflowTypes';

/**
 * Simulation mode determines external interaction
 */
export type SimulationMode = 'isolated' | 'connected' | 'hybrid';

/**
 * Fault types for resilience testing
 */
export type FaultType =
  | 'network_timeout'
  | 'invalid_data'
  | 'api_failure'
  | 'auth_failure'
  | 'resource_exhaustion'
  | 'data_corruption'
  | 'cascading_failure'
  | 'intermittent_failure'
  | 'slow_response'
  | 'partial_failure';

/**
 * Fault injection timing
 */
export type FaultTiming = 'before' | 'during' | 'after';

/**
 * Test scenario types
 */
export type ScenarioType =
  | 'golden_path'
  | 'edge_cases'
  | 'load_testing'
  | 'stress_testing'
  | 'chaos_testing'
  | 'performance_testing';

/**
 * Comparison status between virtual and real execution
 */
export type ComparisonStatus = 'identical' | 'similar' | 'different' | 'failed';

/**
 * Commissioning check status
 */
export type CheckStatus = 'passed' | 'failed' | 'warning' | 'skipped';

/**
 * Fault scenario configuration
 */
export interface FaultScenario {
  id: string;
  name: string;
  description?: string;
  nodeId: string;
  faultType: FaultType;
  probability: number; // 0-1 (1 = always fail)
  timing: FaultTiming;
  duration?: number; // ms
  parameters?: Record<string, any>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Virtual workflow representation
 */
export interface VirtualWorkflow {
  id: string;
  realWorkflowId: string;
  workflow: Workflow;
  state: Record<string, any>;
  executionCount: number;
  lastSyncAt?: Date;
  divergence: number; // 0-1 (0 = perfectly synced)
  metadata: {
    created: Date;
    updated: Date;
    version: string;
  };
}

/**
 * Simulation configuration
 */
export interface SimulationConfig {
  mode: SimulationMode;
  timeCompression: number; // 1x, 10x, 100x
  deterministic: boolean;
  faults: FaultScenario[];
  recordMetrics: boolean;
  validateOutput: boolean;
  timeout: number; // ms
  maxIterations?: number;
}

/**
 * Node execution result in simulation
 */
export interface SimulatedNodeResult {
  nodeId: string;
  nodeName: string;
  input: any;
  output: any;
  error?: Error;
  duration: number; // ms
  retries: number;
  faultsInjected: FaultScenario[];
  timestamp: Date;
}

/**
 * Complete simulation result
 */
export interface SimulationResult {
  id: string;
  twinId: string;
  workflowId: string;
  input: any;
  output: any;
  error?: Error;
  status: 'success' | 'failed' | 'timeout';
  duration: number; // ms
  nodeResults: SimulatedNodeResult[];
  faultsInjected: FaultScenario[];
  metrics: SimulationMetrics;
  timestamp: Date;
  config: SimulationConfig;
}

/**
 * Simulation performance metrics
 */
export interface SimulationMetrics {
  totalNodes: number;
  nodesExecuted: number;
  nodesFailed: number;
  totalDuration: number; // ms
  avgNodeDuration: number; // ms
  memoryUsed: number; // bytes
  cpuTime: number; // ms
  networkCalls: number;
  dataProcessed: number; // bytes
  accuracy?: number; // 0-1 vs real execution
}

/**
 * Comparison between virtual and real execution
 */
export interface ComparisonResult {
  id: string;
  twinId: string;
  virtualExecutionId: string;
  realExecutionId: string;
  status: ComparisonStatus;
  accuracy: number; // 0-1
  differences: ExecutionDifference[];
  metrics: ComparisonMetrics;
  timestamp: Date;
}

/**
 * Individual difference in execution
 */
export interface ExecutionDifference {
  type: 'output' | 'duration' | 'error' | 'state' | 'metadata';
  location: string; // node ID or path
  virtualValue: any;
  realValue: any;
  severity: 'critical' | 'major' | 'minor' | 'info';
  description: string;
}

/**
 * Comparison metrics
 */
export interface ComparisonMetrics {
  outputMatch: number; // 0-1
  durationMatch: number; // 0-1
  errorMatch: number; // 0-1
  stateMatch: number; // 0-1
  overallAccuracy: number; // 0-1
  totalDifferences: number;
  criticalDifferences: number;
}

/**
 * Virtual commissioning check
 */
export interface CommissioningCheck {
  id: string;
  name: string;
  description: string;
  category: 'configuration' | 'data_flow' | 'error_handling' | 'security' | 'performance';
  status: CheckStatus;
  issues: CommissioningIssue[];
  duration: number; // ms
  timestamp: Date;
}

/**
 * Commissioning issue
 */
export interface CommissioningIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;
  recommendation?: string;
  details?: Record<string, any>;
}

/**
 * Complete commissioning report
 */
export interface CommissioningReport {
  id: string;
  workflowId: string;
  status: 'passed' | 'failed' | 'warnings';
  checks: CommissioningCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
  };
  recommendations: string[];
  duration: number; // ms
  timestamp: Date;
}

/**
 * Regression test assertion
 */
export interface Assertion {
  type: 'equals' | 'contains' | 'matches' | 'range' | 'custom';
  path: string; // JSON path to value
  expected: any;
  operator?: string;
  message?: string;
}

/**
 * Regression test case
 */
export interface RegressionTest {
  id: string;
  name: string;
  description?: string;
  workflow: Workflow;
  input: any;
  expectedOutput: any;
  faults?: FaultScenario[];
  timeout: number; // ms
  assertions: Assertion[];
  tags: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Test execution result
 */
export interface TestResult {
  testId: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped' | 'timeout';
  duration: number; // ms
  assertions: AssertionResult[];
  error?: Error;
  output?: any;
  timestamp: Date;
}

/**
 * Assertion result
 */
export interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  actual: any;
  expected: any;
  message: string;
}

/**
 * Test suite
 */
export interface TestSuite {
  id: string;
  name: string;
  description?: string;
  tests: RegressionTest[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Test execution summary
 */
export interface TestExecutionSummary {
  id: string;
  suiteId?: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  timeout: number;
  duration: number; // ms
  results: TestResult[];
  coverage: TestCoverage;
  timestamp: Date;
}

/**
 * Test coverage metrics
 */
export interface TestCoverage {
  nodes: {
    total: number;
    covered: number;
    percentage: number;
  };
  branches: {
    total: number;
    covered: number;
    percentage: number;
  };
  paths: {
    total: number;
    covered: number;
    percentage: number;
  };
}

/**
 * Test scenario configuration
 */
export interface TestScenario {
  id: string;
  name: string;
  type: ScenarioType;
  description?: string;
  workflow: Workflow;
  inputs: any[];
  expectedOutputs?: any[];
  faults: FaultScenario[];
  parameters: ScenarioParameters;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Scenario-specific parameters
 */
export interface ScenarioParameters {
  // Load testing
  concurrentExecutions?: number;
  executionsPerSecond?: number;
  rampUpTime?: number; // ms

  // Stress testing
  maxConcurrent?: number;
  memoryLimit?: number; // bytes
  cpuLimit?: number; // percentage

  // Chaos testing
  faultProbability?: number; // 0-1
  faultTypes?: FaultType[];
  recoveryTime?: number; // ms

  // Performance testing
  targetLatency?: number; // ms
  targetThroughput?: number; // ops/sec
  percentiles?: number[]; // e.g., [50, 95, 99]

  // Common
  duration?: number; // ms
  iterations?: number;
  timeout?: number; // ms
}

/**
 * Scenario execution result
 */
export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  type: ScenarioType;
  status: 'passed' | 'failed' | 'partial';
  executions: SimulationResult[];
  metrics: ScenarioMetrics;
  insights: ScenarioInsight[];
  timestamp: Date;
  duration: number; // ms
}

/**
 * Scenario-specific metrics
 */
export interface ScenarioMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgDuration: number; // ms
  minDuration: number; // ms
  maxDuration: number; // ms
  p50Duration: number; // ms
  p95Duration: number; // ms
  p99Duration: number; // ms
  throughput: number; // ops/sec
  errorRate: number; // 0-1
  faultRecoveryRate: number; // 0-1
}

/**
 * Scenario insight
 */
export interface ScenarioInsight {
  type: 'success' | 'warning' | 'error' | 'performance' | 'reliability';
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  details?: Record<string, any>;
  recommendations?: string[];
}

/**
 * Digital twin configuration
 */
export interface DigitalTwinConfig {
  realTimeSync: boolean;
  syncInterval?: number; // ms
  autoSimulate: boolean;
  defaultSimulationMode: SimulationMode;
  retentionDays: number;
  maxSimulations: number;
  enableMetrics: boolean;
  enableComparison: boolean;
}

/**
 * Twin sync event
 */
export interface TwinSyncEvent {
  twinId: string;
  realExecutionId: string;
  syncedAt: Date;
  changes: string[];
  divergence: number; // 0-1
}

/**
 * Fault injection result
 */
export interface FaultInjectionResult {
  faultId: string;
  nodeId: string;
  faultType: FaultType;
  injected: boolean;
  timing: FaultTiming;
  impact: 'none' | 'minor' | 'major' | 'critical';
  recovered: boolean;
  recoveryTime?: number; // ms
  error?: Error;
}

/**
 * Digital twin statistics
 */
export interface TwinStatistics {
  twinId: string;
  totalSimulations: number;
  successfulSimulations: number;
  failedSimulations: number;
  avgAccuracy: number; // 0-1
  avgDuration: number; // ms
  totalFaultsInjected: number;
  faultRecoveryRate: number; // 0-1
  lastSyncAt?: Date;
  divergence: number; // 0-1
}

/**
 * Sub-workflows and Workflow Nesting Types
 * System for creating reusable workflow components and nested execution
 */

import type { WorkflowNode, WorkflowEdge /*, WorkflowExecution */ } from './workflow';
import type { Variable } from './variables';

export interface SubWorkflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  parentWorkflowId?: string; // If this is embedded in another workflow
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  inputs: SubWorkflowInput[];
  outputs: SubWorkflowOutput[];
  errorHandling: SubWorkflowErrorHandling;
  settings: SubWorkflowSettings;
  metadata: SubWorkflowMetadata;
  isPublished: boolean;
  isTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SubWorkflowInput {
  name: string;
  type: DataType;
  required: boolean;
  defaultValue?: unknown;
  description?: string;
  validation?: InputValidation;
}

export interface SubWorkflowOutput {
  name: string;
  type: DataType;
  description?: string;
  mapping: OutputMapping;
}

export type DataType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'binary' | 'any';

export interface InputValidation {
  type: 'regex' | 'range' | 'enum' | 'schema' | 'custom';
  rule: unknown;
  errorMessage?: string;
}

export interface OutputMapping {
  sourceNode: string;
  sourceField: string;
  transform?: DataTransform;
}

export interface DataTransform {
  type: 'map' | 'filter' | 'reduce' | 'custom';
  expression: string;
}

export interface SubWorkflowErrorHandling {
  strategy: ErrorStrategy;
  retryPolicy?: RetryPolicy;
  fallbackOutput?: unknown;
  notifyOnError: boolean;
  continueOnError: boolean;
}

export type ErrorStrategy = 'fail' | 'retry' | 'fallback' | 'ignore' | 'custom';

export interface RetryPolicy {
  maxAttempts: number;
  delay: number;
  backoffMultiplier: number;
  maxDelay: number;
}

export interface SubWorkflowSettings {
  timeout?: number;
  maxExecutionTime?: number;
  concurrency?: number;
  priority?: number;
  isolationLevel: IsolationLevel;
  resourceLimits?: ResourceLimits;
}

export type IsolationLevel = 'shared' | 'isolated' | 'sandboxed';

export interface ResourceLimits {
  maxMemory?: number;
  maxCpu?: number;
  maxNetworkRequests?: number;
  maxFileSize?: number;
}

export interface SubWorkflowMetadata {
  tags: string[];
  category: string;
  icon?: string;
  color?: string;
  documentation?: string;
  examples?: SubWorkflowExample[];
  changelog?: ChangelogEntry[];
  dependencies?: string[]; // Other sub-workflow IDs
}

export interface SubWorkflowExample {
  name: string;
  description: string;
  inputs: Record<string, unknown>;
  expectedOutputs: Record<string, unknown>;
}

export interface ChangelogEntry {
  version: string;
  date: Date;
  changes: string[];
  breakingChanges?: string[];
}

export interface SubWorkflowNode extends WorkflowNode {
  type: 'subworkflow';
  data: SubWorkflowNodeData;
}

export interface SubWorkflowNodeData {
  // Required NodeData properties
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  icon: string;
  color: string;
  inputs: number;
  outputs: number;
  config?: Record<string, unknown>;
  pinnedData?: {
    data: Record<string, unknown>;
    timestamp: string;
    source: 'manual' | 'execution' | 'import';
    description?: string;
  };

  // SubWorkflow-specific properties
  subWorkflowId: string;
  subWorkflowVersion?: string;
  inputMapping: Record<string, unknown>; // Renamed from 'inputs' to avoid conflict
  outputMapping?: Record<string, string>; // output name -> node field mapping
  executeInline: boolean; // Execute inline vs separate execution
  waitForCompletion: boolean;
  inheritVariables: boolean;
  variableMapping?: Record<string, string>;
}

export interface SubWorkflowExecution {
  id: string;
  parentExecutionId: string;
  subWorkflowId: string;
  subWorkflowVersion: string;
  nodeId: string; // Node in parent workflow
  status: ExecutionStatus;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  resourceUsage?: ResourceUsage;
  logs: ExecutionLog[];
}

export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'timeout';

export interface ResourceUsage {
  peakMemory: number;
  cpuTime: number;
  networkRequests: number;
  dataProcessed: number;
}

export interface ExecutionLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  nodeId?: string;
  metadata?: Record<string, unknown>;
}

export interface SubWorkflowLibrary {
  id: string;
  name: string;
  description: string;
  subWorkflows: string[]; // sub-workflow IDs
  isPublic: boolean;
  organization?: string;
  permissions: LibraryPermissions;
  stats: LibraryStats;
}

export interface LibraryPermissions {
  viewers: string[]; // user/team IDs
  contributors: string[]; // can add/modify
  admins: string[]; // full control
}

export interface LibraryStats {
  totalUses: number;
  avgRating: number;
  totalRatings: number;
  lastUsed?: Date;
  popularInputs: Array<{ name: string; count: number }>;
}

export interface SubWorkflowReference {
  id: string;
  workflowId: string; // Parent workflow
  nodeId: string; // Node using the sub-workflow
  subWorkflowId: string;
  version: string;
  lastSync?: Date;
  syncStatus: 'synced' | 'outdated' | 'broken';
}

export interface SubWorkflowVersion {
  id: string;
  subWorkflowId: string;
  version: string;
  changelog: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  inputs: SubWorkflowInput[];
  outputs: SubWorkflowOutput[];
  isStable: boolean;
  isDeprecated: boolean;
  createdAt: Date;
  createdBy: string;
}

export interface SubWorkflowTest {
  id: string;
  subWorkflowId: string;
  name: string;
  description: string;
  testCases: TestCase[];
  lastRun?: Date;
  lastResult?: TestResult;
}

export interface TestCase {
  id: string;
  name: string;
  inputs: Record<string, unknown>;
  expectedOutputs: Record<string, unknown>;
  timeout?: number;
  skipCondition?: string;
}

export interface TestResult {
  testId: string;
  runId: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  results: Array<{
    caseId: string;
    status: 'passed' | 'failed' | 'skipped';
    actualOutputs?: Record<string, unknown>;
    error?: string;
    duration: number;
  }>;
  coverage?: {
    nodes: number;
    edges: number;
    branches: number;
  };
}

export interface SubWorkflowDebugSession {
  id: string;
  subWorkflowId: string;
  executionId: string;
  breakpoints: Set<string>; // node IDs
  currentNodeId?: string;
  variables: Record<string, unknown>;
  callStack: Array<{
    nodeId: string;
    nodeName: string;
    inputs: Record<string, unknown>;
  }>;
  stepMode: 'none' | 'over' | 'into' | 'out';
}

export interface SubWorkflowPerformance {
  subWorkflowId: string;
  metrics: {
    avgExecutionTime: number;
    p95ExecutionTime: number;
    p99ExecutionTime: number;
    successRate: number;
    errorRate: number;
    throughput: number; // executions per minute
  };
  bottlenecks: Array<{
    nodeId: string;
    avgTime: number;
    impact: number; // percentage of total time
  }>;
  recommendations: string[];
}

export interface SubWorkflowService {
  // CRUD Operations
  createSubWorkflow(data: Omit<SubWorkflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubWorkflow>;
  updateSubWorkflow(id: string, updates: Partial<SubWorkflow>): Promise<void>;
  deleteSubWorkflow(id: string): Promise<void>;
  getSubWorkflow(id: string, version?: string): Promise<SubWorkflow | null>;
  listSubWorkflows(filters?: SubWorkflowFilters): Promise<SubWorkflow[]>;
  
  // Execution
  executeSubWorkflow(id: string, inputs: Record<string, unknown>, context: ExecutionContext): Promise<SubWorkflowExecution>;
  getExecution(executionId: string): Promise<SubWorkflowExecution | null>;
  cancelExecution(executionId: string): Promise<void>;
  
  // Version Management
  createVersion(subWorkflowId: string, changelog: string): Promise<SubWorkflowVersion>;
  listVersions(subWorkflowId: string): Promise<SubWorkflowVersion[]>;
  promoteVersion(subWorkflowId: string, version: string): Promise<void>;
  
  // Testing
  createTest(test: Omit<SubWorkflowTest, 'id'>): Promise<SubWorkflowTest>;
  runTest(testId: string): Promise<TestResult>;
  getTestResults(testId: string): Promise<TestResult[]>;
  
  // Library Management
  publishToLibrary(subWorkflowId: string, libraryId: string): Promise<void>;
  searchLibrary(query: string, filters?: LibraryFilters): Promise<SubWorkflow[]>;
  importFromLibrary(subWorkflowId: string): Promise<SubWorkflow>;
  
  // References and Dependencies
  findReferences(subWorkflowId: string): Promise<SubWorkflowReference[]>;
  updateReferences(subWorkflowId: string, version: string): Promise<void>;
  checkDependencies(subWorkflowId: string): Promise<DependencyCheck>;
  
  // Performance and Debugging
  getPerformanceMetrics(subWorkflowId: string): Promise<SubWorkflowPerformance>;
  startDebugSession(executionId: string): Promise<SubWorkflowDebugSession>;
  stepDebugger(sessionId: string, action: 'over' | 'into' | 'out' | 'continue'): Promise<void>;
  
  // Validation
  validateSubWorkflow(subWorkflow: SubWorkflow): Promise<ValidationResult>;
  validateInputs(subWorkflowId: string, inputs: Record<string, unknown>): Promise<ValidationResult>;
}

export interface SubWorkflowFilters {
  search?: string;
  category?: string;
  tags?: string[];
  isPublished?: boolean;
  isTemplate?: boolean;
  createdBy?: string;
  parentWorkflowId?: string;
}

export interface ExecutionContext {
  parentExecutionId?: string;
  variables: Variable[];
  environment: string;
  user: string;
  priority?: number;
  timeout?: number;
}

export interface LibraryFilters {
  organization?: string;
  isPublic?: boolean;
  minRating?: number;
  category?: string;
  tags?: string[];
}

export interface DependencyCheck {
  isValid: boolean;
  missingDependencies: string[];
  circularDependencies: string[][];
  deprecatedDependencies: Array<{
    id: string;
    name: string;
    version: string;
    suggestion: string;
  }>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    type: string;
    message: string;
    nodeId?: string;
    field?: string;
  }>;
  warnings: Array<{
    type: string;
    message: string;
    suggestion?: string;
  }>;
}
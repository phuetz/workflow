/**
 * Workflow Simulation & Pre-flight Testing Types
 * Comprehensive type definitions for simulation system
 */

import { WorkflowNode, WorkflowEdge } from './workflow';

/**
 * Severity levels for checks and warnings
 */
export type Severity = 'error' | 'warning' | 'info';

/**
 * Check categories for pre-flight validation
 */
export type CheckCategory =
  | 'security'
  | 'performance'
  | 'cost'
  | 'data'
  | 'integration'
  | 'credentials'
  | 'quota'
  | 'compatibility';

/**
 * Pre-flight check result
 */
export interface PreFlightCheck {
  id: string;
  name: string;
  category: CheckCategory;
  severity: Severity;
  passed: boolean;
  message: string;
  fix?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Potential error that might occur during execution
 */
export interface PotentialError {
  nodeId: string;
  nodeType: string;
  errorType: string;
  probability: number; // 0-1
  message: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation?: string;
}

/**
 * Warning about potential issues
 */
export interface Warning {
  nodeId: string;
  type: string;
  message: string;
  severity: Severity;
  suggestion?: string;
}

/**
 * Recommendation for optimization
 */
export interface Recommendation {
  type: 'performance' | 'cost' | 'reliability' | 'security';
  priority: 'low' | 'medium' | 'high';
  message: string;
  impact: string;
  implementation?: string;
}

/**
 * Data transformation during simulation
 */
export interface DataTransformation {
  type: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  requiredFields?: string[];
  optionalFields?: string[];
}

/**
 * Data flow step in simulation
 */
export interface DataFlowStep {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  inputData: unknown;
  outputData: unknown;
  transformations: DataTransformation[];
  estimatedTime: number;
  estimatedCost: number;
  dataSize: {
    input: number; // bytes
    output: number; // bytes
  };
}

/**
 * Cost breakdown by category
 */
export interface CostBreakdown {
  apiCalls: number;
  computeTime: number;
  storage: number;
  network: number;
  llmTokens: number;
  total: number;
  currency: string;
}

/**
 * Cost details for a node
 */
export interface NodeCostDetails {
  nodeId: string;
  nodeType: string;
  breakdown: CostBreakdown;
  unitCosts: {
    perRequest?: number;
    perToken?: number;
    perKB?: number;
    perGB?: number;
    perSecond?: number;
    perRecord?: number;
  };
}

/**
 * Time estimation details
 */
export interface TimeEstimation {
  total: number; // milliseconds
  breakdown: {
    nodeId: string;
    nodeType: string;
    estimatedTime: number;
    confidence: number; // 0-1
  }[];
  criticalPath: string[]; // Node IDs in critical path
  parallelizable: boolean;
}

/**
 * Resource usage estimation
 */
export interface ResourceEstimation {
  memory: {
    peak: number; // bytes
    average: number;
  };
  cpu: {
    average: number; // percentage
    peak: number;
  };
  network: {
    download: number; // bytes
    upload: number;
  };
  storage: {
    temporary: number; // bytes
    persistent: number;
  };
}

/**
 * Quota information for API services
 */
export interface QuotaInfo {
  service: string;
  current: number;
  limit: number;
  resetTime?: Date;
  percentage: number;
}

/**
 * Credential validation result
 */
export interface CredentialValidation {
  credentialId: string;
  credentialType: string;
  valid: boolean;
  expiresAt?: Date;
  scopes?: string[];
  issues?: string[];
}

/**
 * Data validation result
 */
export interface DataValidation {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: Severity;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
  schema?: Record<string, unknown>;
}

/**
 * Node simulation result
 */
export interface NodeSimulationResult {
  nodeId: string;
  success: boolean;
  outputData: unknown;
  estimatedTime: number;
  estimatedCost: number;
  transformations: DataTransformation[];
  potentialErrors: PotentialError[];
  warnings: Warning[];
  dataValidation?: DataValidation;
  resourceUsage?: {
    memory: number;
    cpu: number;
  };
}

/**
 * Complete simulation result
 */
export interface SimulationResult {
  simulationId: string;
  timestamp: Date;
  workflow: {
    id?: string;
    name?: string;
    nodeCount: number;
    edgeCount: number;
  };
  estimatedTime: TimeEstimation;
  estimatedCost: CostBreakdown;
  dataFlow: DataFlowStep[];
  potentialErrors: PotentialError[];
  warnings: Warning[];
  recommendations: Recommendation[];
  preFlightChecks: PreFlightCheck[];
  resourceEstimation: ResourceEstimation;
  quotaStatus: QuotaInfo[];
  credentialValidations: CredentialValidation[];
  score: {
    reliability: number; // 0-100
    performance: number; // 0-100
    costEfficiency: number; // 0-100
    security: number; // 0-100
    overall: number; // 0-100
  };
  readyForExecution: boolean;
  blockers: PreFlightCheck[];
}

/**
 * Simulation options
 */
export interface SimulationOptions {
  sampleData?: unknown;
  skipCredentialValidation?: boolean;
  skipQuotaCheck?: boolean;
  skipCostEstimation?: boolean;
  maxSimulationTime?: number;
  historicalDataSource?: 'average' | 'percentile90' | 'percentile95' | 'max';
  costModel?: 'conservative' | 'realistic' | 'optimistic';
  includeDetailedLogs?: boolean;
}

/**
 * Historical execution data for better estimation
 */
export interface HistoricalExecutionData {
  nodeType: string;
  averageTime: number;
  percentile90Time: number;
  percentile95Time: number;
  maxTime: number;
  averageCost: number;
  executionCount: number;
  lastUpdated: Date;
}

/**
 * Cost model for different node types
 */
export interface NodeCostModel {
  nodeType: string;
  fixedCost: number;
  variableCosts: {
    perRequest?: number;
    perToken?: number;
    perKB?: number;
    perGB?: number;
    perSecond?: number;
    perRecord?: number;
  };
  minimumCost?: number;
  maximumCost?: number;
}

/**
 * What-if analysis scenario
 */
export interface WhatIfScenario {
  name: string;
  description: string;
  changes: {
    nodeId: string;
    configChanges: Record<string, unknown>;
  }[];
  inputDataVariation?: unknown;
}

/**
 * What-if analysis result
 */
export interface WhatIfResult {
  scenario: WhatIfScenario;
  baselineResult: SimulationResult;
  modifiedResult: SimulationResult;
  comparison: {
    timeDifference: number; // percentage
    costDifference: number; // percentage
    reliabilityDifference: number;
    recommendations: string[];
  };
}

/**
 * Simulation cache entry
 */
export interface SimulationCache {
  workflowHash: string;
  result: SimulationResult;
  timestamp: Date;
  ttl: number; // milliseconds
}

/**
 * Pre-flight check configuration
 */
export interface PreFlightCheckConfig {
  id: string;
  name: string;
  category: CheckCategory;
  enabled: boolean;
  severity: Severity;
  checkFunction: (workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => Promise<PreFlightCheck>;
  dependencies?: string[]; // Other check IDs that must pass first
}
